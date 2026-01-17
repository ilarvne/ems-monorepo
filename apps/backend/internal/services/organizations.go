package services

import (
	"context"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/auth"
	"github.com/studyverse/ems-backend/internal/db"
	"github.com/studyverse/ems-backend/internal/perms"
	"github.com/studyverse/ems-backend/internal/search"
)

type OrganizationsService struct {
	eventsv1connect.UnimplementedOrganizationsServiceHandler
	queries *db.Queries
	perms   *perms.Client
	search  *search.Client
}

func NewOrganizationsService(queries *db.Queries, permsClient *perms.Client, searchClient *search.Client) *OrganizationsService {
	return &OrganizationsService{queries: queries, perms: permsClient, search: searchClient}
}

func (s *OrganizationsService) CreateOrganization(ctx context.Context, req *connect.Request[eventsv1.CreateOrganizationRequest]) (*connect.Response[eventsv1.CreateOrganizationResponse], error) {
	slog.Debug("CreateOrganization", "title", req.Msg.Title)

	// Authorization: Check if user can create organizations (platform admin/staff)
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		allowed, err := s.perms.CheckPermission(ctx, userID, "platform", "astanait", "manage_clubs")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to create organizations"))
		}
	}

	params := db.CreateOrganizationParams{
		Title:              req.Msg.Title,
		OrganizationTypeID: req.Msg.OrganizationTypeId,
		Status:             db.NullOrganizationStatus{OrganizationStatus: protoStatusToDB(req.Msg.Status), Valid: true},
	}

	if req.Msg.ImageUrl != nil {
		params.ImageUrl = pgtype.Text{String: *req.Msg.ImageUrl, Valid: true}
	}
	if req.Msg.Description != nil {
		params.Description = pgtype.Text{String: *req.Msg.Description, Valid: true}
	}
	if req.Msg.Instagram != nil {
		params.Instagram = pgtype.Text{String: *req.Msg.Instagram, Valid: true}
	}
	if req.Msg.TelegramChannel != nil {
		params.TelegramChannel = pgtype.Text{String: *req.Msg.TelegramChannel, Valid: true}
	}
	if req.Msg.TelegramChat != nil {
		params.TelegramChat = pgtype.Text{String: *req.Msg.TelegramChat, Valid: true}
	}
	if req.Msg.Website != nil {
		params.Website = pgtype.Text{String: *req.Msg.Website, Valid: true}
	}
	if req.Msg.Youtube != nil {
		params.Youtube = pgtype.Text{String: *req.Msg.Youtube, Valid: true}
	}
	if req.Msg.Tiktok != nil {
		params.Tiktok = pgtype.Text{String: *req.Msg.Tiktok, Valid: true}
	}
	if req.Msg.Linkedin != nil {
		params.Linkedin = pgtype.Text{String: *req.Msg.Linkedin, Valid: true}
	}

	created, err := s.queries.CreateOrganization(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Write SpiceDB relationship for this club
	if s.perms != nil {
		clubID := fmt.Sprintf("%d", created.ID)
		if err := s.perms.LinkClubToPlatform(ctx, clubID); err != nil {
			slog.Warn("Failed to link club to platform in SpiceDB", "error", err, "clubId", clubID)
		}
		// Make the creator an admin of this club
		if err := s.perms.SetupClubRelationship(ctx, clubID, userID, "president"); err != nil {
			slog.Warn("Failed to setup club admin relationship in SpiceDB", "error", err, "clubId", clubID)
		}
	}

	// Index organization in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			doc := &search.OrganizationDocument{
				ID:                 created.ID,
				Title:              created.Title,
				OrganizationTypeID: created.OrganizationTypeID,
				Status:             string(created.Status.OrganizationStatus),
				CreatedAt:          created.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			if created.Description.Valid {
				doc.Description = created.Description.String
			}
			if created.ImageUrl.Valid {
				doc.ImageURL = created.ImageUrl.String
			}
			if err := s.search.IndexOrganization(context.Background(), doc); err != nil {
				slog.Warn("Failed to index organization in search", "error", err, "orgId", created.ID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.CreateOrganizationResponse{
		Organization: dbOrganizationToProto(created),
	}), nil
}

func (s *OrganizationsService) GetOrganization(ctx context.Context, req *connect.Request[eventsv1.GetOrganizationRequest]) (*connect.Response[eventsv1.GetOrganizationResponse], error) {
	slog.Debug("GetOrganization", "id", req.Msg.Id)

	org, err := s.queries.GetOrganization(ctx, req.Msg.Id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.GetOrganizationResponse{
		Organization: dbOrganizationToProto(org),
	}), nil
}

func (s *OrganizationsService) ListOrganizations(ctx context.Context, req *connect.Request[eventsv1.ListOrganizationsRequest]) (*connect.Response[eventsv1.ListOrganizationsResponse], error) {
	slog.Debug("ListOrganizations", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	orgs, err := s.queries.ListOrganizations(ctx, db.ListOrganizationsParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	total, err := s.queries.CountOrganizations(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoOrgs := make([]*eventsv1.Organization, len(orgs))
	for i, o := range orgs {
		protoOrgs[i] = dbOrganizationToProto(o)
	}

	return connect.NewResponse(&eventsv1.ListOrganizationsResponse{
		Organizations: protoOrgs,
		Total:         int32(total),
	}), nil
}

func (s *OrganizationsService) UpdateOrganization(ctx context.Context, req *connect.Request[eventsv1.UpdateOrganizationRequest]) (*connect.Response[eventsv1.UpdateOrganizationResponse], error) {
	slog.Debug("UpdateOrganization", "id", req.Msg.Id)

	// Authorization: Check if user can edit this club
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		clubID := fmt.Sprintf("%d", req.Msg.Id)
		allowed, err := s.perms.CheckPermission(ctx, userID, "club", clubID, "edit")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to edit this organization"))
		}
	}

	params := db.UpdateOrganizationParams{
		ID: req.Msg.Id,
	}

	if req.Msg.Title != nil {
		params.Title = pgtype.Text{String: *req.Msg.Title, Valid: true}
	}
	if req.Msg.ImageUrl != nil {
		params.ImageUrl = pgtype.Text{String: *req.Msg.ImageUrl, Valid: true}
	}
	if req.Msg.Description != nil {
		params.Description = pgtype.Text{String: *req.Msg.Description, Valid: true}
	}
	if req.Msg.OrganizationTypeId != nil {
		params.OrganizationTypeID = pgtype.Int4{Int32: *req.Msg.OrganizationTypeId, Valid: true}
	}
	if req.Msg.Instagram != nil {
		params.Instagram = pgtype.Text{String: *req.Msg.Instagram, Valid: true}
	}
	if req.Msg.TelegramChannel != nil {
		params.TelegramChannel = pgtype.Text{String: *req.Msg.TelegramChannel, Valid: true}
	}
	if req.Msg.TelegramChat != nil {
		params.TelegramChat = pgtype.Text{String: *req.Msg.TelegramChat, Valid: true}
	}
	if req.Msg.Website != nil {
		params.Website = pgtype.Text{String: *req.Msg.Website, Valid: true}
	}
	if req.Msg.Youtube != nil {
		params.Youtube = pgtype.Text{String: *req.Msg.Youtube, Valid: true}
	}
	if req.Msg.Tiktok != nil {
		params.Tiktok = pgtype.Text{String: *req.Msg.Tiktok, Valid: true}
	}
	if req.Msg.Linkedin != nil {
		params.Linkedin = pgtype.Text{String: *req.Msg.Linkedin, Valid: true}
	}
	if req.Msg.Status != nil {
		params.Status = db.NullOrganizationStatus{OrganizationStatus: protoStatusToDB(*req.Msg.Status), Valid: true}
	}

	org, err := s.queries.UpdateOrganization(ctx, params)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Re-index organization in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			doc := &search.OrganizationDocument{
				ID:                 org.ID,
				Title:              org.Title,
				OrganizationTypeID: org.OrganizationTypeID,
				Status:             string(org.Status.OrganizationStatus),
				CreatedAt:          org.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			if org.Description.Valid {
				doc.Description = org.Description.String
			}
			if org.ImageUrl.Valid {
				doc.ImageURL = org.ImageUrl.String
			}
			if err := s.search.IndexOrganization(context.Background(), doc); err != nil {
				slog.Warn("Failed to re-index organization in search", "error", err, "orgId", org.ID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.UpdateOrganizationResponse{
		Organization: dbOrganizationToProto(org),
	}), nil
}

func (s *OrganizationsService) DeleteOrganization(ctx context.Context, req *connect.Request[eventsv1.DeleteOrganizationRequest]) (*connect.Response[eventsv1.DeleteOrganizationResponse], error) {
	slog.Debug("DeleteOrganization", "id", req.Msg.Id)

	// Authorization: Only platform admins can delete organizations
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		allowed, err := s.perms.CheckPermission(ctx, userID, "platform", "astanait", "manage_clubs")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to delete organizations"))
		}
	}

	err := s.queries.DeleteOrganization(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Remove organization from Meilisearch (async, don't block response)
	if s.search != nil {
		orgID := req.Msg.Id
		go func() {
			if err := s.search.DeleteDocument(context.Background(), search.IndexOrganizations, orgID); err != nil {
				slog.Warn("Failed to delete organization from search", "error", err, "orgId", orgID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.DeleteOrganizationResponse{
		Success: true,
	}), nil
}

func (s *OrganizationsService) GetPublishableOrganizations(ctx context.Context, req *connect.Request[eventsv1.GetPublishableOrganizationsRequest]) (*connect.Response[eventsv1.GetPublishableOrganizationsResponse], error) {
	slog.Debug("GetPublishableOrganizations", "userId", req.Msg.UserId)

	roles := []string{"President", "Staff"}
	orgs, err := s.queries.GetOrganizationsByUserRoles(ctx, db.GetOrganizationsByUserRolesParams{
		UserID: req.Msg.UserId,
		Roles:  roles,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoOrgs := make([]*eventsv1.Organization, len(orgs))
	for i, o := range orgs {
		protoOrgs[i] = dbOrganizationToProto(o)
	}

	return connect.NewResponse(&eventsv1.GetPublishableOrganizationsResponse{
		Organizations: protoOrgs,
	}), nil
}

func (s *OrganizationsService) GetUserOrganizations(ctx context.Context, req *connect.Request[eventsv1.GetUserOrganizationsRequest]) (*connect.Response[eventsv1.GetUserOrganizationsResponse], error) {
	slog.Debug("GetUserOrganizations", "userId", req.Msg.UserId)

	roles := []string{"President", "Staff", "Member"}
	orgs, err := s.queries.GetOrganizationsByUserRoles(ctx, db.GetOrganizationsByUserRolesParams{
		UserID: req.Msg.UserId,
		Roles:  roles,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoOrgs := make([]*eventsv1.Organization, len(orgs))
	for i, o := range orgs {
		protoOrgs[i] = dbOrganizationToProto(o)
	}

	return connect.NewResponse(&eventsv1.GetUserOrganizationsResponse{
		Organizations: protoOrgs,
	}), nil
}

func protoStatusToDB(status eventsv1.OrganizationStatus) db.OrganizationStatus {
	switch status {
	case eventsv1.OrganizationStatus_ORGANIZATION_STATUS_ARCHIVED:
		return db.OrganizationStatusArchived
	case eventsv1.OrganizationStatus_ORGANIZATION_STATUS_FROZEN:
		return db.OrganizationStatusFrozen
	default:
		return db.OrganizationStatusActive
	}
}

// protoStatusToString converts a proto organization status to a string
// nolint:unused
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
