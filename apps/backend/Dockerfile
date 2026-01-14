# ==============================================================================
# EMS Backend Dockerfile - Multi-Stage Build for Go + Connect-RPC
# ==============================================================================

# Stage 1: Builder
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files first for better caching
COPY apps/backend/go.mod apps/backend/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY apps/backend/ ./

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/server \
    ./cmd/server

# Stage 2: Runtime
FROM alpine:3.20 AS runtime
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /app/server /app/server

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5555

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:5555/health || exit 1

# Run the binary
ENTRYPOINT ["/app/server"]
