package auth

import "errors"

// Common auth errors
var (
	ErrUnauthenticated    = errors.New("authentication required")
	ErrPermissionDenied   = errors.New("permission denied")
	ErrInvalidCredentials = errors.New("invalid credentials")
)
