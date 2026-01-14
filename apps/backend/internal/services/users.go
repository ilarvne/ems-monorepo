package services

import (
	"context"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	usersv1 "github.com/studyverse/ems-backend/gen/usersv1"
	"github.com/studyverse/ems-backend/gen/usersv1/usersv1connect"
	"github.com/studyverse/ems-backend/internal/db"
)

type UsersService struct {
	usersv1connect.UnimplementedUsersServiceHandler
	queries *db.Queries
}

func NewUsersService(queries *db.Queries) *UsersService {
	return &UsersService{queries: queries}
}

func (s *UsersService) CreateUser(ctx context.Context, req *connect.Request[usersv1.CreateUserRequest]) (*connect.Response[usersv1.CreateUserResponse], error) {
	slog.Info("CreateUser", "username", req.Msg.Username, "email", req.Msg.Email)

	// TODO: Hash password before storing
	user, err := s.queries.CreateUser(ctx, req.Msg.Username, req.Msg.Email, req.Msg.Password)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&usersv1.CreateUserResponse{
		User: dbUserToProto(user),
	}), nil
}

func (s *UsersService) GetUser(ctx context.Context, req *connect.Request[usersv1.GetUserRequest]) (*connect.Response[usersv1.GetUserResponse], error) {
	slog.Info("GetUser", "id", req.Msg.Id)

	user, err := s.queries.GetUser(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if user == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&usersv1.GetUserResponse{
		User: dbUserToProto(user),
	}), nil
}

func (s *UsersService) GetUserByEmail(ctx context.Context, req *connect.Request[usersv1.GetUserByEmailRequest]) (*connect.Response[usersv1.GetUserByEmailResponse], error) {
	slog.Info("GetUserByEmail", "email", req.Msg.Email)

	user, err := s.queries.GetUserByEmail(ctx, req.Msg.Email)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if user == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&usersv1.GetUserByEmailResponse{
		User: dbUserToProto(user),
	}), nil
}

func (s *UsersService) GetUserByUsername(ctx context.Context, req *connect.Request[usersv1.GetUserByUsernameRequest]) (*connect.Response[usersv1.GetUserByUsernameResponse], error) {
	slog.Info("GetUserByUsername", "username", req.Msg.Username)

	user, err := s.queries.GetUserByUsername(ctx, req.Msg.Username)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if user == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&usersv1.GetUserByUsernameResponse{
		User: dbUserToProto(user),
	}), nil
}

func (s *UsersService) ListUsers(ctx context.Context, req *connect.Request[usersv1.ListUsersRequest]) (*connect.Response[usersv1.ListUsersResponse], error) {
	slog.Info("ListUsers", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 50
	}

	users, total, err := s.queries.ListUsers(ctx, limit, (page-1)*limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoUsers := make([]*usersv1.User, len(users))
	for i, u := range users {
		protoUsers[i] = dbUserToProto(&u)
	}

	return connect.NewResponse(&usersv1.ListUsersResponse{
		Users: protoUsers,
		Total: total,
	}), nil
}

func (s *UsersService) UpdateUser(ctx context.Context, req *connect.Request[usersv1.UpdateUserRequest]) (*connect.Response[usersv1.UpdateUserResponse], error) {
	slog.Info("UpdateUser", "id", req.Msg.Id)

	user, err := s.queries.UpdateUser(ctx, req.Msg.Id, req.Msg.Username, req.Msg.Email)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if user == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&usersv1.UpdateUserResponse{
		User: dbUserToProto(user),
	}), nil
}

func (s *UsersService) DeleteUser(ctx context.Context, req *connect.Request[usersv1.DeleteUserRequest]) (*connect.Response[usersv1.DeleteUserResponse], error) {
	slog.Info("DeleteUser", "id", req.Msg.Id)

	success, err := s.queries.DeleteUser(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&usersv1.DeleteUserResponse{
		Success: success,
	}), nil
}

func (s *UsersService) UpdatePassword(ctx context.Context, req *connect.Request[usersv1.UpdatePasswordRequest]) (*connect.Response[usersv1.UpdatePasswordResponse], error) {
	slog.Info("UpdatePassword", "id", req.Msg.Id)

	// TODO: Verify old password and hash new password
	user, err := s.queries.GetUser(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if user == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&usersv1.UpdatePasswordResponse{
		Success: true,
	}), nil
}

func dbUserToProto(u *db.User) *usersv1.User {
	return &usersv1.User{
		Id:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
		UpdatedAt: u.UpdatedAt.Format(time.RFC3339),
	}
}
