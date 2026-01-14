package services

import (
	"context"
	"log/slog"

	"connectrpc.com/connect"
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
	slog.Info("CreateOrganizationType", "title", req.Msg.Title)

	ot, err := s.queries.CreateOrganizationType(ctx, req.Msg.Title)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CreateOrganizationTypeResponse{
		OrganizationType: dbOrganizationTypeToProto(ot),
	}), nil
}

func (s *OrganizationTypesService) GetOrganizationType(ctx context.Context, req *connect.Request[eventsv1.GetOrganizationTypeRequest]) (*connect.Response[eventsv1.GetOrganizationTypeResponse], error) {
	slog.Info("GetOrganizationType", "id", req.Msg.Id)

	ot, err := s.queries.GetOrganizationType(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if ot == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&eventsv1.GetOrganizationTypeResponse{
		OrganizationType: dbOrganizationTypeToProto(ot),
	}), nil
}

func (s *OrganizationTypesService) ListOrganizationTypes(ctx context.Context, req *connect.Request[eventsv1.ListOrganizationTypesRequest]) (*connect.Response[eventsv1.ListOrganizationTypesResponse], error) {
	slog.Info("ListOrganizationTypes", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	types, total, err := s.queries.ListOrganizationTypes(ctx, limit, (page-1)*limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoTypes := make([]*eventsv1.OrganizationType, len(types))
	for i, t := range types {
		protoTypes[i] = dbOrganizationTypeToProto(&t)
	}

	return connect.NewResponse(&eventsv1.ListOrganizationTypesResponse{
		OrganizationTypes: protoTypes,
		Total:             total,
	}), nil
}

func (s *OrganizationTypesService) UpdateOrganizationType(ctx context.Context, req *connect.Request[eventsv1.UpdateOrganizationTypeRequest]) (*connect.Response[eventsv1.UpdateOrganizationTypeResponse], error) {
	slog.Info("UpdateOrganizationType", "id", req.Msg.Id)

	ot, err := s.queries.UpdateOrganizationType(ctx, req.Msg.Id, req.Msg.Title)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if ot == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&eventsv1.UpdateOrganizationTypeResponse{
		OrganizationType: dbOrganizationTypeToProto(ot),
	}), nil
}

func (s *OrganizationTypesService) DeleteOrganizationType(ctx context.Context, req *connect.Request[eventsv1.DeleteOrganizationTypeRequest]) (*connect.Response[eventsv1.DeleteOrganizationTypeResponse], error) {
	slog.Info("DeleteOrganizationType", "id", req.Msg.Id)

	success, err := s.queries.DeleteOrganizationType(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.DeleteOrganizationTypeResponse{
		Success: success,
	}), nil
}

func dbOrganizationTypeToProto(ot *db.OrganizationType) *eventsv1.OrganizationType {
	return &eventsv1.OrganizationType{
		Id:        ot.ID,
		Title:     ot.Title,
		CreatedAt: ot.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: ot.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
