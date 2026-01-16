package services

import (
	"context"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/db"
)

type OrganizationTypesService struct {
	eventsv1connect.UnimplementedOrganizationTypesServiceHandler
	queries *db.Queries
}

func NewOrganizationTypesService(queries *db.Queries) *OrganizationTypesService {
	return &OrganizationTypesService{queries: queries}
}

func (s *OrganizationTypesService) CreateOrganizationType(ctx context.Context, req *connect.Request[eventsv1.CreateOrganizationTypeRequest]) (*connect.Response[eventsv1.CreateOrganizationTypeResponse], error) {
	slog.Debug("CreateOrganizationType", "title", req.Msg.Title)

	ot, err := s.queries.CreateOrganizationType(ctx, req.Msg.Title)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CreateOrganizationTypeResponse{
		OrganizationType: dbOrganizationTypeToProto(ot),
	}), nil
}

func (s *OrganizationTypesService) GetOrganizationType(ctx context.Context, req *connect.Request[eventsv1.GetOrganizationTypeRequest]) (*connect.Response[eventsv1.GetOrganizationTypeResponse], error) {
	slog.Debug("GetOrganizationType", "id", req.Msg.Id)

	ot, err := s.queries.GetOrganizationType(ctx, req.Msg.Id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.GetOrganizationTypeResponse{
		OrganizationType: dbOrganizationTypeToProto(ot),
	}), nil
}

func (s *OrganizationTypesService) ListOrganizationTypes(ctx context.Context, req *connect.Request[eventsv1.ListOrganizationTypesRequest]) (*connect.Response[eventsv1.ListOrganizationTypesResponse], error) {
	slog.Debug("ListOrganizationTypes", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	types, err := s.queries.ListOrganizationTypes(ctx, db.ListOrganizationTypesParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	total, err := s.queries.CountOrganizationTypes(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoTypes := make([]*eventsv1.OrganizationType, len(types))
	for i, t := range types {
		protoTypes[i] = dbOrganizationTypeToProto(t)
	}

	return connect.NewResponse(&eventsv1.ListOrganizationTypesResponse{
		OrganizationTypes: protoTypes,
		Total:             int32(total),
	}), nil
}

func (s *OrganizationTypesService) UpdateOrganizationType(ctx context.Context, req *connect.Request[eventsv1.UpdateOrganizationTypeRequest]) (*connect.Response[eventsv1.UpdateOrganizationTypeResponse], error) {
	slog.Debug("UpdateOrganizationType", "id", req.Msg.Id)

	params := db.UpdateOrganizationTypeParams{
		ID: req.Msg.Id,
	}
	if req.Msg.Title != nil {
		params.Title = pgtype.Text{String: *req.Msg.Title, Valid: true}
	}

	ot, err := s.queries.UpdateOrganizationType(ctx, params)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.UpdateOrganizationTypeResponse{
		OrganizationType: dbOrganizationTypeToProto(ot),
	}), nil
}

func (s *OrganizationTypesService) DeleteOrganizationType(ctx context.Context, req *connect.Request[eventsv1.DeleteOrganizationTypeRequest]) (*connect.Response[eventsv1.DeleteOrganizationTypeResponse], error) {
	slog.Debug("DeleteOrganizationType", "id", req.Msg.Id)

	err := s.queries.DeleteOrganizationType(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.DeleteOrganizationTypeResponse{
		Success: true,
	}), nil
}

func dbOrganizationTypeToProto(ot db.OrganizationType) *eventsv1.OrganizationType {
	return &eventsv1.OrganizationType{
		Id:        ot.ID,
		Title:     ot.Title,
		CreatedAt: ot.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt: ot.UpdatedAt.Time.Format(time.RFC3339),
	}
}
