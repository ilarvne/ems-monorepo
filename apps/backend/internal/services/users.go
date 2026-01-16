package services

import (
	"context"
	"errors"
	"log/slog"
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
		User: dbUserToProto(user),
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
		User: dbUserToProto(user),
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
		User: dbUserToProto(user),
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
		User: dbUserToProto(user),
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
		protoUsers[i] = dbUserToProto(u)
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
		User: dbUserToProto(user),
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

func dbUserToProto(u db.User) *usersv1.User {
	return &usersv1.User{
		Id:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt: u.UpdatedAt.Time.Format(time.RFC3339),
	}
}
