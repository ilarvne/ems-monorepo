package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/gen/searchv1/searchv1connect"
	"github.com/studyverse/ems-backend/gen/usersv1/usersv1connect"
	"github.com/studyverse/ems-backend/internal/auth"
	"github.com/studyverse/ems-backend/internal/config"
	"github.com/studyverse/ems-backend/internal/db"
	"github.com/studyverse/ems-backend/internal/perms"
	"github.com/studyverse/ems-backend/internal/search"
	"github.com/studyverse/ems-backend/internal/services"
)

func main() {
	// Setup structured logging
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Load configuration
	cfg := config.Load()

	slog.Info("Starting EMS Backend",
		"host", cfg.Host,
		"port", cfg.Port,
	)

	// Initialize Kratos client for authentication
	kratosClient := auth.NewKratosClient(cfg.KratosPublicURL)
	slog.Info("Kratos client initialized", "url", cfg.KratosPublicURL)

	// Initialize SpiceDB client for authorization
	permsClient, err := perms.NewClient(cfg.SpiceDBEndpoint, cfg.SpiceDBPresharedKey, cfg.SpiceDBInsecure, cfg.SpiceDBSkipVerifyCA)
	if err != nil {
		slog.Warn("Failed to initialize SpiceDB client - authorization checks will fail",
			"endpoint", cfg.SpiceDBEndpoint,
			"error", err,
		)
		// Create a nil-safe client that logs warnings
		permsClient = nil
	} else {
		slog.Info("SpiceDB client initialized", "endpoint", cfg.SpiceDBEndpoint)
	}

	// Initialize Meilisearch client for search
	var searchClient *search.Client
	searchClient, err = search.NewClient(cfg.MeilisearchURL, cfg.MeilisearchMasterKey)
	if err != nil {
		slog.Warn("Failed to initialize Meilisearch client - search will be unavailable",
			"url", cfg.MeilisearchURL,
			"error", err,
		)
		searchClient = nil
	} else {
		slog.Info("Meilisearch client initialized", "url", cfg.MeilisearchURL)
	}

	// Connect to database
	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	slog.Info("Connected to database")

	// Initialize queries
	queries := db.New(pool)

	// Initialize services with permsClient for authorization
	eventsService := services.NewEventsService(queries, pool, permsClient, searchClient)
	organizationsService := services.NewOrganizationsService(queries, permsClient, searchClient)
	organizationTypesService := services.NewOrganizationTypesService(queries)
	tagsService := services.NewTagsService(queries, permsClient, searchClient)
	eventRegistrationsService := services.NewEventRegistrationsService(queries)
	eventAttendanceService := services.NewEventAttendanceService(queries)
	statisticsService := services.NewStatisticsService(queries, pool)
	usersService := services.NewUsersService(queries, permsClient, searchClient)
	searchService := services.NewSearchService(searchClient, queries)

	// Setup HTTP mux
	mux := http.NewServeMux()

	// Register Connect-RPC handlers
	interceptors := connect.WithInterceptors(loggingInterceptor())

	// Events services
	mux.Handle(eventsv1connect.NewEventsServiceHandler(eventsService, interceptors))
	mux.Handle(eventsv1connect.NewOrganizationsServiceHandler(organizationsService, interceptors))
	mux.Handle(eventsv1connect.NewOrganizationTypesServiceHandler(organizationTypesService, interceptors))
	mux.Handle(eventsv1connect.NewTagsServiceHandler(tagsService, interceptors))
	mux.Handle(eventsv1connect.NewEventRegistrationsServiceHandler(eventRegistrationsService, interceptors))
	mux.Handle(eventsv1connect.NewEventAttendanceServiceHandler(eventAttendanceService, interceptors))
	mux.Handle(eventsv1connect.NewStatisticsServiceHandler(statisticsService, interceptors))

	// Users service
	mux.Handle(usersv1connect.NewUsersServiceHandler(usersService, interceptors))

	// Search service
	mux.Handle(searchv1connect.NewSearchServiceHandler(searchService, interceptors))

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// Admin endpoint to promote users to platform admin/staff
	// Protected by ADMIN_SECRET environment variable
	adminSecret := os.Getenv("ADMIN_SECRET")
	if adminSecret != "" && permsClient != nil {
		mux.HandleFunc("/admin/promote", func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
				return
			}

			// Check admin secret
			secret := r.Header.Get("X-Admin-Secret")
			if secret != adminSecret {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Get user ID and role from query params
			userID := r.URL.Query().Get("user_id")
			role := r.URL.Query().Get("role")
			if userID == "" {
				http.Error(w, "user_id is required", http.StatusBadRequest)
				return
			}
			if role == "" {
				role = "admin" // default to admin
			}
			if role != "admin" && role != "staff" {
				http.Error(w, "role must be 'admin' or 'staff'", http.StatusBadRequest)
				return
			}

			// Write the relationship to SpiceDB
			err := permsClient.SetupPlatformRelationship(r.Context(), userID, role)
			if err != nil {
				slog.Error("Failed to promote user", "userID", userID, "role", role, "error", err)
				http.Error(w, "Failed to promote user: "+err.Error(), http.StatusInternalServerError)
				return
			}

			slog.Info("User promoted", "userID", userID, "role", role)
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("User " + userID + " promoted to " + role))
		})
		slog.Info("Admin promotion endpoint enabled at /admin/promote")
	}

	// Build middleware chain: CORS -> Auth -> Mux
	// Auth middleware extracts Kratos session and injects user ID into context
	authMiddleware := auth.NewMiddleware(kratosClient)
	handler := corsMiddleware(cfg.CORSOrigins, authMiddleware(mux))

	// Create server with h2c (HTTP/2 cleartext) support for Connect-RPC
	server := &http.Server{
		Addr:         cfg.Host + ":" + cfg.Port,
		Handler:      h2c.NewHandler(handler, &http2.Server{}),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("Server listening", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server error", "error", err)
			os.Exit(1)
		}
	}()

	<-shutdown
	slog.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		slog.Error("Server shutdown error", "error", err)
	}

	slog.Info("Server stopped")
}

func corsMiddleware(origins []string, next http.Handler) http.Handler {
	allowedOrigins := make(map[string]bool)
	for _, origin := range origins {
		allowedOrigins[origin] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Check if origin is allowed
		if allowedOrigins[origin] || len(origins) == 0 || (len(origins) == 1 && origins[0] == "*") {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Accept-Language, Content-Type, Content-Language, Authorization, Connect-Protocol-Version, Connect-Timeout-Ms, X-Grpc-Timeout, X-User-Agent, X-Session-Token")
		w.Header().Set("Access-Control-Expose-Headers", "Connect-Content-Encoding, Connect-Timeout-Ms, Grpc-Status, Grpc-Message, Grpc-Status-Details-Bin")
		w.Header().Set("Access-Control-Max-Age", "86400")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func loggingInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			start := time.Now()
			procedure := req.Spec().Procedure

			resp, err := next(ctx, req)

			duration := time.Since(start)
			if err != nil {
				slog.Error("RPC failed",
					"procedure", procedure,
					"duration", duration,
					"error", err,
				)
			} else {
				slog.Info("RPC completed",
					"procedure", procedure,
					"duration", duration,
				)
			}

			return resp, err
		}
	}
}
