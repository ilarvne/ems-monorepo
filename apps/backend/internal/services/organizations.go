package services

import (
	"context"
	"log/slog"

	"connectrpc.com/connect"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/db"
)

type OrganizationsService struct {
	eventsv1connect.UnimplementedOrganizationsServiceHandler
	queries *db.Queries
}

func NewOrganizationsService(queries *db.Queries) *OrganizationsService {
	return &OrganizationsService{queries: queries}
}

func (s *OrganizationsService) CreateOrganization(ctx context.Context, req *connect.Request[eventsv1.CreateOrganizationRequest]) (*connect.Response[eventsv1.CreateOrganizationResponse], error) {
	slog.Info("CreateOrganization", "title", req.Msg.Title)

	org := &db.Organization{
		Title:              req.Msg.Title,
		OrganizationTypeID: req.Msg.OrganizationTypeId,
		Status:             protoStatusToString(req.Msg.Status),
	}
	if req.Msg.ImageUrl != nil {
		org.ImageURL.String = *req.Msg.ImageUrl
		org.ImageURL.Valid = true
	}
	if req.Msg.Description != nil {
		org.Description.String = *req.Msg.Description
		org.Description.Valid = true
	}
	if req.Msg.Instagram != nil {
		org.Instagram.String = *req.Msg.Instagram
		org.Instagram.Valid = true
	}
	if req.Msg.TelegramChannel != nil {
		org.TelegramChannel.String = *req.Msg.TelegramChannel
		org.TelegramChannel.Valid = true
	}
	if req.Msg.TelegramChat != nil {
		org.TelegramChat.String = *req.Msg.TelegramChat
		org.TelegramChat.Valid = true
	}
	if req.Msg.Website != nil {
		org.Website.String = *req.Msg.Website
		org.Website.Valid = true
	}
	if req.Msg.Youtube != nil {
		org.YouTube.String = *req.Msg.Youtube
		org.YouTube.Valid = true
	}
	if req.Msg.Tiktok != nil {
		org.TikTok.String = *req.Msg.Tiktok
		org.TikTok.Valid = true
	}
	if req.Msg.Linkedin != nil {
		org.LinkedIn.String = *req.Msg.Linkedin
		org.LinkedIn.Valid = true
	}

	created, err := s.queries.CreateOrganization(ctx, org)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CreateOrganizationResponse{
		Organization: dbOrganizationToProto(created),
	}), nil
}

func (s *OrganizationsService) GetOrganization(ctx context.Context, req *connect.Request[eventsv1.GetOrganizationRequest]) (*connect.Response[eventsv1.GetOrganizationResponse], error) {
	slog.Info("GetOrganization", "id", req.Msg.Id)

	org, err := s.queries.GetOrganization(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if org == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&eventsv1.GetOrganizationResponse{
		Organization: dbOrganizationToProto(org),
	}), nil
}

func (s *OrganizationsService) ListOrganizations(ctx context.Context, req *connect.Request[eventsv1.ListOrganizationsRequest]) (*connect.Response[eventsv1.ListOrganizationsResponse], error) {
	slog.Info("ListOrganizations", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	orgs, total, err := s.queries.ListOrganizations(ctx, limit, (page-1)*limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoOrgs := make([]*eventsv1.Organization, len(orgs))
	for i, o := range orgs {
		protoOrgs[i] = dbOrganizationToProto(&o)
	}

	return connect.NewResponse(&eventsv1.ListOrganizationsResponse{
		Organizations: protoOrgs,
		Total:         total,
	}), nil
}

func (s *OrganizationsService) UpdateOrganization(ctx context.Context, req *connect.Request[eventsv1.UpdateOrganizationRequest]) (*connect.Response[eventsv1.UpdateOrganizationResponse], error) {
	slog.Info("UpdateOrganization", "id", req.Msg.Id)

	updates := make(map[string]interface{})
	if req.Msg.Title != nil {
		updates["title"] = *req.Msg.Title
	}
	if req.Msg.ImageUrl != nil {
		updates["image_url"] = *req.Msg.ImageUrl
	}
	if req.Msg.Description != nil {
		updates["description"] = *req.Msg.Description
	}
	if req.Msg.OrganizationTypeId != nil {
		updates["organization_type_id"] = *req.Msg.OrganizationTypeId
	}
	if req.Msg.Instagram != nil {
		updates["instagram"] = *req.Msg.Instagram
	}
	if req.Msg.TelegramChannel != nil {
		updates["telegram_channel"] = *req.Msg.TelegramChannel
	}
	if req.Msg.TelegramChat != nil {
		updates["telegram_chat"] = *req.Msg.TelegramChat
	}
	if req.Msg.Website != nil {
		updates["website"] = *req.Msg.Website
	}
	if req.Msg.Youtube != nil {
		updates["youtube"] = *req.Msg.Youtube
	}
	if req.Msg.Tiktok != nil {
		updates["tiktok"] = *req.Msg.Tiktok
	}
	if req.Msg.Linkedin != nil {
		updates["linkedin"] = *req.Msg.Linkedin
	}
	if req.Msg.Status != nil {
		updates["status"] = protoStatusToString(*req.Msg.Status)
	}

	org, err := s.queries.UpdateOrganization(ctx, req.Msg.Id, updates)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if org == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&eventsv1.UpdateOrganizationResponse{
		Organization: dbOrganizationToProto(org),
	}), nil
}

func (s *OrganizationsService) DeleteOrganization(ctx context.Context, req *connect.Request[eventsv1.DeleteOrganizationRequest]) (*connect.Response[eventsv1.DeleteOrganizationResponse], error) {
	slog.Info("DeleteOrganization", "id", req.Msg.Id)

	success, err := s.queries.DeleteOrganization(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.DeleteOrganizationResponse{
		Success: success,
	}), nil
}

func (s *OrganizationsService) GetPublishableOrganizations(ctx context.Context, req *connect.Request[eventsv1.GetPublishableOrganizationsRequest]) (*connect.Response[eventsv1.GetPublishableOrganizationsResponse], error) {
	slog.Info("GetPublishableOrganizations", "userId", req.Msg.UserId)

	roles := []string{"President", "Staff"}
	orgs, err := s.queries.GetOrganizationsByUserRoles(ctx, req.Msg.UserId, roles)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoOrgs := make([]*eventsv1.Organization, len(orgs))
	for i, o := range orgs {
		protoOrgs[i] = dbOrganizationToProto(&o)
	}

	return connect.NewResponse(&eventsv1.GetPublishableOrganizationsResponse{
		Organizations: protoOrgs,
	}), nil
}

func (s *OrganizationsService) GetUserOrganizations(ctx context.Context, req *connect.Request[eventsv1.GetUserOrganizationsRequest]) (*connect.Response[eventsv1.GetUserOrganizationsResponse], error) {
	slog.Info("GetUserOrganizations", "userId", req.Msg.UserId)

	roles := []string{"President", "Staff", "Member"}
	orgs, err := s.queries.GetOrganizationsByUserRoles(ctx, req.Msg.UserId, roles)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoOrgs := make([]*eventsv1.Organization, len(orgs))
	for i, o := range orgs {
		protoOrgs[i] = dbOrganizationToProto(&o)
	}

	return connect.NewResponse(&eventsv1.GetUserOrganizationsResponse{
		Organizations: protoOrgs,
	}), nil
}

func protoStatusToString(status eventsv1.OrganizationStatus) string {
	switch status {
	case eventsv1.OrganizationStatus_ORGANIZATION_STATUS_ARCHIVED:
		return "archived"
	case eventsv1.OrganizationStatus_ORGANIZATION_STATUS_FROZEN:
		return "frozen"
	default:
		return "active"
	}
}
