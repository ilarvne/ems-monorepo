package auth

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	ory "github.com/ory/kratos-client-go"
)

// ContextKey is the type for context keys
type ContextKey string

const (
	// UserIDKey is the context key for the authenticated user ID
	UserIDKey ContextKey = "user_id"
	// UserEmailKey is the context key for the authenticated user email
	UserEmailKey ContextKey = "user_email"
	// SessionKey is the context key for the full session
	SessionKey ContextKey = "session"
)

// NewMiddleware creates an HTTP middleware that validates Kratos sessions
// and injects the user ID into the request context.
//
// Expected auth mechanisms:
// - Browser: Kratos session cookie forwarded automatically by the browser.
// - Native/CLI: X-Session-Token: <token> or Authorization: Bearer <token>.
//
// If the user is not authenticated, the request proceeds without user context
// (public endpoints still work; protected endpoints should call RequireAuth).
func NewMiddleware(kratosClient *ory.APIClient) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			cookie := r.Header.Get("Cookie")
			sessionToken := r.Header.Get("X-Session-Token")
			if sessionToken == "" {
				sessionToken = extractBearerToken(r.Header.Get("Authorization"))
			}

			// Fast path: no credentials present.
			if cookie == "" && sessionToken == "" {
				next.ServeHTTP(w, r)
				return
			}

			slog.Debug("Auth middleware", "hasCookie", cookie != "", "hasToken", sessionToken != "", "path", r.URL.Path)

			toSession := kratosClient.FrontendAPI.ToSession(ctx)
			if cookie != "" {
				toSession = toSession.Cookie(cookie)
			}
			if sessionToken != "" {
				toSession = toSession.XSessionToken(sessionToken)
			}

			session, _, err := toSession.Execute()
			if err != nil {
				// Treat validation failures as anonymous (not hard-fail middleware).
				// Caller can decide whether endpoint requires auth.
				slog.Debug("No valid session", "error", err)
				next.ServeHTTP(w, r)
				return
			}

			if session.Identity == nil {
				next.ServeHTTP(w, r)
				return
			}

			ctx = context.WithValue(ctx, UserIDKey, session.Identity.Id)

			if traits, ok := session.Identity.Traits.(map[string]interface{}); ok {
				if email, ok := traits["email"].(string); ok {
					ctx = context.WithValue(ctx, UserEmailKey, email)
				}
			}

			ctx = context.WithValue(ctx, SessionKey, session)

			slog.Debug("Authenticated request", "user_id", session.Identity.Id)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// extractBearerToken extracts the token from "Bearer <token>" format
func extractBearerToken(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}
	return parts[1]
}

// GetUserID extracts the user ID from the context
// Returns empty string if not authenticated
func GetUserID(ctx context.Context) string {
	if userID, ok := ctx.Value(UserIDKey).(string); ok {
		return userID
	}
	return ""
}

// GetUserEmail extracts the user email from the context
// Returns empty string if not available
func GetUserEmail(ctx context.Context) string {
	if email, ok := ctx.Value(UserEmailKey).(string); ok {
		return email
	}
	return ""
}

// IsAuthenticated checks if the request has a valid authenticated user
func IsAuthenticated(ctx context.Context) bool {
	return GetUserID(ctx) != ""
}

// GetSession returns the full Ory session from context
func GetSession(ctx context.Context) *ory.Session {
	if session, ok := ctx.Value(SessionKey).(*ory.Session); ok {
		return session
	}
	return nil
}

// RequireAuth is a helper that returns an error if the user is not authenticated
// Use this in service methods that require authentication
func RequireAuth(ctx context.Context) (string, error) {
	userID := GetUserID(ctx)
	if userID == "" {
		return "", ErrUnauthenticated
	}
	return userID, nil
}

// NewKratosClient creates a new Ory Kratos API client
func NewKratosClient(kratosPublicURL string) *ory.APIClient {
	config := ory.NewConfiguration()
	config.Servers = ory.ServerConfigurations{
		{URL: kratosPublicURL},
	}
	return ory.NewAPIClient(config)
}
