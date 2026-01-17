package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	usersv1 "github.com/studyverse/ems-backend/gen/usersv1"
	"github.com/studyverse/ems-backend/gen/usersv1/usersv1connect"
	"github.com/studyverse/ems-backend/internal/db"
	"github.com/studyverse/ems-backend/internal/perms"
	"github.com/studyverse/ems-backend/internal/search"
)

type UsersService struct {
	usersv1connect.UnimplementedUsersServiceHandler
	queries *db.Queries
	perms   *perms.Client
	search  *search.Client
}

func NewUsersService(queries *db.Queries, permsClient *perms.Client, searchClient *search.Client) *UsersService {
	return &UsersService{queries: queries, perms: permsClient, search: searchClient}
}

func (s *UsersService) CreateUser(ctx context.Context, req *connect.Request[usersv1.CreateUserRequest]) (*connect.Response[usersv1.CreateUserResponse], error) {
	slog.Debug("CreateUser", "username", req.Msg.Username, "email", req.Msg.Email)

	// Note: Password hashing is handled by Ory Kratos for authenticated users.
	// This endpoint is for local user creation only (dev/admin purposes).
	// In production, users should be created via Kratos identity flows.
	user, err := s.queries.CreateUser(ctx, db.CreateUserParams{
		Username: req.Msg.Username,
		Email:    req.Msg.Email,
		Password: req.Msg.Password,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Index user in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			doc := &search.UserDocument{
				ID:        user.ID,
				Username:  user.Username,
				Email:     user.Email,
				CreatedAt: user.CreatedAt.Time.Format(time.RFC3339),
			}
			if err := s.search.IndexUser(context.Background(), doc); err != nil {
				slog.Warn("Failed to index user in search", "error", err, "userId", user.ID)
			}
		}()
	}

	return connect.NewResponse(&usersv1.CreateUserResponse{
		User: s.dbUserToProto(ctx, user),
	}), nil
}

func (s *UsersService) GetUser(ctx context.Context, req *connect.Request[usersv1.GetUserRequest]) (*connect.Response[usersv1.GetUserResponse], error) {
	slog.Debug("GetUser", "id", req.Msg.Id)

	user, err := s.queries.GetUser(ctx, req.Msg.Id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&usersv1.GetUserResponse{
		User: s.dbUserToProto(ctx, user),
	}), nil
}

func (s *UsersService) GetUserByEmail(ctx context.Context, req *connect.Request[usersv1.GetUserByEmailRequest]) (*connect.Response[usersv1.GetUserByEmailResponse], error) {
	slog.Debug("GetUserByEmail", "email", req.Msg.Email)

	user, err := s.queries.GetUserByEmail(ctx, req.Msg.Email)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&usersv1.GetUserByEmailResponse{
		User: s.dbUserToProto(ctx, user),
	}), nil
}

func (s *UsersService) GetUserByUsername(ctx context.Context, req *connect.Request[usersv1.GetUserByUsernameRequest]) (*connect.Response[usersv1.GetUserByUsernameResponse], error) {
	slog.Debug("GetUserByUsername", "username", req.Msg.Username)

	user, err := s.queries.GetUserByUsername(ctx, req.Msg.Username)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&usersv1.GetUserByUsernameResponse{
		User: s.dbUserToProto(ctx, user),
	}), nil
}

func (s *UsersService) ListUsers(ctx context.Context, req *connect.Request[usersv1.ListUsersRequest]) (*connect.Response[usersv1.ListUsersResponse], error) {
	slog.Debug("ListUsers", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 50
	}

	users, err := s.queries.ListUsers(ctx, db.ListUsersParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Count total
	total, err := s.queries.CountUsers(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoUsers := make([]*usersv1.User, len(users))
	for i, u := range users {
		protoUsers[i] = s.dbUserToProto(ctx, u)
	}

	return connect.NewResponse(&usersv1.ListUsersResponse{
		Users: protoUsers,
		Total: int32(total),
	}), nil
}

func (s *UsersService) UpdateUser(ctx context.Context, req *connect.Request[usersv1.UpdateUserRequest]) (*connect.Response[usersv1.UpdateUserResponse], error) {
	slog.Debug("UpdateUser", "id", req.Msg.Id)

	params := db.UpdateUserParams{
		ID: req.Msg.Id,
	}
	if req.Msg.Username != nil {
		params.Username = pgtype.Text{String: *req.Msg.Username, Valid: true}
	}
	if req.Msg.Email != nil {
		params.Email = pgtype.Text{String: *req.Msg.Email, Valid: true}
	}

	user, err := s.queries.UpdateUser(ctx, params)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Re-index user in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			doc := &search.UserDocument{
				ID:        user.ID,
				Username:  user.Username,
				Email:     user.Email,
				CreatedAt: user.CreatedAt.Time.Format(time.RFC3339),
			}
			if err := s.search.IndexUser(context.Background(), doc); err != nil {
				slog.Warn("Failed to re-index user in search", "error", err, "userId", user.ID)
			}
		}()
	}

	return connect.NewResponse(&usersv1.UpdateUserResponse{
		User: s.dbUserToProto(ctx, user),
	}), nil
}

func (s *UsersService) DeleteUser(ctx context.Context, req *connect.Request[usersv1.DeleteUserRequest]) (*connect.Response[usersv1.DeleteUserResponse], error) {
	slog.Debug("DeleteUser", "id", req.Msg.Id)

	err := s.queries.DeleteUser(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Remove user from Meilisearch (async, don't block response)
	if s.search != nil {
		userID := req.Msg.Id
		go func() {
			if err := s.search.DeleteDocument(context.Background(), search.IndexUsers, userID); err != nil {
				slog.Warn("Failed to delete user from search", "error", err, "userId", userID)
			}
		}()
	}

	return connect.NewResponse(&usersv1.DeleteUserResponse{
		Success: true,
	}), nil
}

func (s *UsersService) UpdatePassword(ctx context.Context, req *connect.Request[usersv1.UpdatePasswordRequest]) (*connect.Response[usersv1.UpdatePasswordResponse], error) {
	slog.Debug("UpdatePassword", "id", req.Msg.Id)

	// Password updates should be handled via Ory Kratos self-service flows.
	// This endpoint is deprecated - return an error directing users to use Kratos.
	return nil, connect.NewError(connect.CodeUnimplemented, errors.New("password updates are handled via authentication provider - use the forgot password flow"))
}

// AssignPlatformRole assigns or updates a user's platform-level role
func (s *UsersService) AssignPlatformRole(ctx context.Context, req *connect.Request[usersv1.AssignPlatformRoleRequest]) (*connect.Response[usersv1.AssignPlatformRoleResponse], error) {
	slog.Debug("AssignPlatformRole", "userId", req.Msg.UserId, "role", req.Msg.Role)

	// Validate role
	if req.Msg.Role == usersv1.PlatformRole_PLATFORM_ROLE_UNSPECIFIED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("role must be specified"))
	}

	// Get user to validate they exist
	user, err := s.queries.GetUser(ctx, req.Msg.UserId)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("user not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update SpiceDB relationships based on role
	userIDStr := fmt.Sprintf("%d", user.ID)

	if s.perms != nil {
		// First, remove any existing platform roles
		// (we remove both admin and staff, then add the new one)
		_ = s.perms.DeleteRelationships(ctx, []perms.Relationship{
			{Resource: "platform", ResourceID: perms.PlatformID, Relation: "admin", SubjectType: "user", SubjectID: userIDStr},
			{Resource: "platform", ResourceID: perms.PlatformID, Relation: "staff", SubjectType: "user", SubjectID: userIDStr},
		})

		// Now add the new role (only if not USER role)
		if req.Msg.Role == usersv1.PlatformRole_PLATFORM_ROLE_ADMIN {
			if err := s.perms.SetupPlatformRelationship(ctx, userIDStr, "admin"); err != nil {
				slog.Error("Failed to set admin role in SpiceDB", "error", err, "userId", user.ID)
				return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to assign role: %w", err))
			}
		} else if req.Msg.Role == usersv1.PlatformRole_PLATFORM_ROLE_STAFF {
			if err := s.perms.SetupPlatformRelationship(ctx, userIDStr, "staff"); err != nil {
				slog.Error("Failed to set staff role in SpiceDB", "error", err, "userId", user.ID)
				return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to assign role: %w", err))
			}
		}
		// USER role means removing all platform roles (already done above)
	}

	slog.Info("Assigned platform role", "userId", user.ID, "role", req.Msg.Role)

	return connect.NewResponse(&usersv1.AssignPlatformRoleResponse{
		User: s.dbUserToProto(ctx, user),
	}), nil
}

// PreRegisterUser creates a pre-registration entry for an email
func (s *UsersService) PreRegisterUser(ctx context.Context, req *connect.Request[usersv1.PreRegisterUserRequest]) (*connect.Response[usersv1.PreRegisterUserResponse], error) {
	slog.Debug("PreRegisterUser", "email", req.Msg.Email, "role", req.Msg.PlatformRole)

	// Validate email
	email := strings.ToLower(strings.TrimSpace(req.Msg.Email))
	if email == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("email is required"))
	}
	if !strings.HasSuffix(email, "@astanait.edu.kz") {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("email must be an @astanait.edu.kz address"))
	}

	// Validate role
	if req.Msg.PlatformRole == usersv1.PlatformRole_PLATFORM_ROLE_UNSPECIFIED ||
		req.Msg.PlatformRole == usersv1.PlatformRole_PLATFORM_ROLE_USER {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("platform_role must be STAFF or ADMIN"))
	}

	// Convert proto role to DB role
	var dbRole db.PlatformRole
	switch req.Msg.PlatformRole {
	case usersv1.PlatformRole_PLATFORM_ROLE_ADMIN:
		dbRole = db.PlatformRoleAdmin
	case usersv1.PlatformRole_PLATFORM_ROLE_STAFF:
		dbRole = db.PlatformRoleStaff
	default:
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid role"))
	}

	// Create pre-registration entry
	preReg, err := s.queries.CreatePreRegisteredUser(ctx, db.CreatePreRegisteredUserParams{
		Email:        email,
		PlatformRole: dbRole,
		CreatedBy:    pgtype.Int4{}, // TODO: get from auth context
	})
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return nil, connect.NewError(connect.CodeAlreadyExists, errors.New("email is already pre-registered"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	slog.Info("Created pre-registration", "email", email, "role", dbRole)

	return connect.NewResponse(&usersv1.PreRegisterUserResponse{
		PreRegisteredUser: dbPreRegToProto(preReg),
	}), nil
}

// ListPreRegisteredUsers lists all pre-registration entries
func (s *UsersService) ListPreRegisteredUsers(ctx context.Context, req *connect.Request[usersv1.ListPreRegisteredUsersRequest]) (*connect.Response[usersv1.ListPreRegisteredUsersResponse], error) {
	slog.Debug("ListPreRegisteredUsers", "page", req.Msg.Page, "limit", req.Msg.Limit, "includeUsed", req.Msg.IncludeUsed)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 50
	}

	preRegs, err := s.queries.ListPreRegisteredUsers(ctx, db.ListPreRegisteredUsersParams{
		Limit:       limit,
		Offset:      (page - 1) * limit,
		IncludeUsed: req.Msg.IncludeUsed,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Count total
	total, err := s.queries.CountPreRegisteredUsers(ctx, req.Msg.IncludeUsed)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoPreRegs := make([]*usersv1.PreRegisteredUser, len(preRegs))
	for i, p := range preRegs {
		protoPreRegs[i] = dbPreRegToProto(p)
	}

	return connect.NewResponse(&usersv1.ListPreRegisteredUsersResponse{
		PreRegisteredUsers: protoPreRegs,
		Total:              int32(total),
	}), nil
}

// DeletePreRegisteredUser deletes a pre-registration entry
func (s *UsersService) DeletePreRegisteredUser(ctx context.Context, req *connect.Request[usersv1.DeletePreRegisteredUserRequest]) (*connect.Response[usersv1.DeletePreRegisteredUserResponse], error) {
	slog.Debug("DeletePreRegisteredUser", "id", req.Msg.Id)

	err := s.queries.DeletePreRegisteredUser(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&usersv1.DeletePreRegisteredUserResponse{
		Success: true,
	}), nil
}

// dbUserToProto converts a database user to a proto user, including platform role lookup
func (s *UsersService) dbUserToProto(ctx context.Context, u db.User) *usersv1.User {
	protoUser := &usersv1.User{
		Id:           u.ID,
		Username:     u.Username,
		Email:        u.Email,
		CreatedAt:    u.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:    u.UpdatedAt.Time.Format(time.RFC3339),
		PlatformRole: usersv1.PlatformRole_PLATFORM_ROLE_USER, // Default
	}

	// Lookup platform role from SpiceDB
	if s.perms != nil {
		userIDStr := fmt.Sprintf("%d", u.ID)

		// Check if admin first (higher privilege)
		isAdmin, err := s.perms.CheckPermission(ctx, userIDStr, "platform", perms.PlatformID, "manage_system")
		if err == nil && isAdmin {
			protoUser.PlatformRole = usersv1.PlatformRole_PLATFORM_ROLE_ADMIN
			return protoUser
		}

		// Check if staff
		isStaff, err := s.perms.CheckPermission(ctx, userIDStr, "platform", perms.PlatformID, "manage_clubs")
		if err == nil && isStaff {
			protoUser.PlatformRole = usersv1.PlatformRole_PLATFORM_ROLE_STAFF
			return protoUser
		}
	}

	return protoUser
}

// dbPreRegToProto converts a database pre-registered user to proto
func dbPreRegToProto(p db.PreRegisteredUser) *usersv1.PreRegisteredUser {
	proto := &usersv1.PreRegisteredUser{
		Id:        p.ID,
		Email:     p.Email,
		CreatedAt: p.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt: p.UpdatedAt.Time.Format(time.RFC3339),
	}

	// Convert platform role
	switch p.PlatformRole {
	case db.PlatformRoleAdmin:
		proto.PlatformRole = usersv1.PlatformRole_PLATFORM_ROLE_ADMIN
	case db.PlatformRoleStaff:
		proto.PlatformRole = usersv1.PlatformRole_PLATFORM_ROLE_STAFF
	}

	// Optional fields
	if p.CreatedBy.Valid {
		createdBy := p.CreatedBy.Int32
		proto.CreatedBy = &createdBy
	}
	if p.UsedAt.Valid {
		usedAt := p.UsedAt.Time.Format(time.RFC3339)
		proto.UsedAt = &usedAt
	}
	if p.UsedByUserID.Valid {
		usedByUserID := p.UsedByUserID.Int32
		proto.UsedByUserId = &usedByUserID
	}

	return proto
}
