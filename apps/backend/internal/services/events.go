package services

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/auth"
	"github.com/studyverse/ems-backend/internal/db"
	"github.com/studyverse/ems-backend/internal/perms"
	"github.com/studyverse/ems-backend/internal/search"
)

type EventsService struct {
	eventsv1connect.UnimplementedEventsServiceHandler
	queries *db.Queries
	pool    *pgxpool.Pool
	perms   *perms.Client
	search  *search.Client
}

func NewEventsService(queries *db.Queries, pool *pgxpool.Pool, permsClient *perms.Client, searchClient *search.Client) *EventsService {
	return &EventsService{queries: queries, pool: pool, perms: permsClient, search: searchClient}
}

func (s *EventsService) CreateEvent(ctx context.Context, req *connect.Request[eventsv1.CreateEventRequest]) (*connect.Response[eventsv1.CreateEventResponse], error) {
	slog.Debug("CreateEvent", "title", req.Msg.Title)

	// Authorization: Check if user can create events for this organization
	kratosUserID := auth.GetUserID(ctx)

	var localUserID int32

	if kratosUserID == "" {
		// No authenticated user - use system user for batch imports (dev mode)
		// In production, this should require authentication
		slog.Warn("CreateEvent called without authentication - using system user")

		// Get or create a system user for imports
		systemUser, err := s.queries.CreateUserFromKratos(ctx, db.CreateUserFromKratosParams{
			KratosID: pgtype.Text{String: "system-import", Valid: true},
			Email:    "system@import.local",
			Username: "system",
		})
		if err != nil {
			slog.Error("Failed to get/create system user", "error", err)
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to create system user: %w", err))
		}
		localUserID = systemUser.ID
		kratosUserID = "system-import" // For SpiceDB
	} else {
		// Get or create local user from Kratos identity
		email := auth.GetUserEmail(ctx)
		if email == "" {
			email = kratosUserID + "@placeholder.local" // Fallback if email not in traits
		}
		// Use email prefix as username
		username := email
		if atIdx := len(email); atIdx > 0 {
			for i, c := range email {
				if c == '@' {
					username = email[:i]
					break
				}
			}
		}

		localUser, err := s.queries.CreateUserFromKratos(ctx, db.CreateUserFromKratosParams{
			KratosID: pgtype.Text{String: kratosUserID, Valid: true},
			Email:    email,
			Username: username,
		})
		if err != nil {
			slog.Error("Failed to get/create local user", "error", err, "kratosId", kratosUserID)
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to sync user: %w", err))
		}
		localUserID = localUser.ID
	}

	// Check permission: user must have create_event on the club
	if s.perms != nil && kratosUserID != "system-import" {
		clubID := fmt.Sprintf("%d", req.Msg.OrganizationId)
		allowed, err := s.perms.CheckPermission(ctx, kratosUserID, "club", clubID, "create_event")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to create events for this organization"))
		}
	}

	format := db.NullFormat{Format: db.FormatOffline, Valid: true}
	if req.Msg.Format == eventsv1.EventFormat_EVENT_FORMAT_ONLINE {
		format = db.NullFormat{Format: db.FormatOnline, Valid: true}
	}

	startTime, _ := time.Parse(time.RFC3339, req.Msg.StartTime)
	endTime, _ := time.Parse(time.RFC3339, req.Msg.EndTime)

	// Use transaction for event creation + tags
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to begin transaction: %w", err))
	}
	defer func() { _ = tx.Rollback(ctx) }()

	qtx := s.queries.WithTx(tx)

	createParams := db.CreateEventParams{
		Title:          req.Msg.Title,
		Description:    req.Msg.Description,
		UserID:         localUserID,
		OrganizationID: req.Msg.OrganizationId,
		Location:       req.Msg.Location,
		StartTime:      pgtype.Timestamptz{Time: startTime, Valid: true},
		EndTime:        pgtype.Timestamptz{Time: endTime, Valid: true},
		Format:         format,
	}

	if req.Msg.ImageUrl != nil {
		createParams.ImageUrl = pgtype.Text{String: *req.Msg.ImageUrl, Valid: true}
	}

	event, err := qtx.CreateEvent(ctx, createParams)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Add tags
	for _, tagID := range req.Msg.TagIds {
		if err := qtx.AddEventTag(ctx, db.AddEventTagParams{
			EventID: event.ID,
			TagID:   tagID,
		}); err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to add tag: %w", err))
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to commit transaction: %w", err))
	}

	// Write SpiceDB relationship for this event
	if s.perms != nil {
		eventID := fmt.Sprintf("%d", event.ID)
		clubID := fmt.Sprintf("%d", req.Msg.OrganizationId)
		if err := s.perms.SetupEventRelationship(ctx, eventID, clubID, kratosUserID); err != nil {
			slog.Warn("Failed to setup event relationship in SpiceDB", "error", err, "eventId", eventID)
			// Don't fail the request, just log the warning
		}
	}

	// Index event in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			// Fetch organization title for search document
			org, err := s.queries.GetOrganization(context.Background(), event.OrganizationID)
			orgTitle := ""
			if err == nil {
				orgTitle = org.Title
			}

			// Fetch tag names
			tags, _ := s.queries.GetEventTags(context.Background(), event.ID)
			tagNames := make([]string, len(tags))
			for i, t := range tags {
				tagNames[i] = t.Name
			}

			doc := &search.EventDocument{
				ID:                event.ID,
				Title:             event.Title,
				Description:       event.Description,
				Location:          event.Location,
				OrganizationID:    event.OrganizationID,
				OrganizationTitle: orgTitle,
				Format:            string(event.Format.Format),
				StartTime:         event.StartTime.Time.Format(time.RFC3339),
				EndTime:           event.EndTime.Time.Format(time.RFC3339),
				TagIds:            req.Msg.TagIds,
				Tags:              tagNames,
				CreatedAt:         event.CreatedAt.Time.Format(time.RFC3339),
			}
			if event.ImageUrl.Valid {
				doc.ImageURL = event.ImageUrl.String
			}
			if err := s.search.IndexEvent(context.Background(), doc); err != nil {
				slog.Warn("Failed to index event in search", "error", err, "eventId", event.ID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.CreateEventResponse{
		Event: dbEventToProto(event, nil, req.Msg.TagIds),
	}), nil
}

func (s *EventsService) GetEvent(ctx context.Context, req *connect.Request[eventsv1.GetEventRequest]) (*connect.Response[eventsv1.GetEventResponse], error) {
	slog.Debug("GetEvent", "id", req.Msg.Id)

	event, err := s.queries.GetEvent(ctx, req.Msg.Id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	org, err := s.queries.GetOrganization(ctx, event.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get organization: %w", err))
	}

	tags, err := s.queries.GetEventTags(ctx, event.ID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get tags: %w", err))
	}

	return connect.NewResponse(&eventsv1.GetEventResponse{
		Event: dbEventWithRelationsToProto(event, org, tags),
	}), nil
}

func (s *EventsService) ListEvents(ctx context.Context, req *connect.Request[eventsv1.ListEventsRequest]) (*connect.Response[eventsv1.ListEventsResponse], error) {
	slog.Debug("ListEvents", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	params := db.ListEventsParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
	if req.Msg.UserId != nil {
		params.UserID = pgtype.Int4{Int32: *req.Msg.UserId, Valid: true}
	}
	if req.Msg.OrganizationId != nil {
		params.OrganizationID = pgtype.Int4{Int32: *req.Msg.OrganizationId, Valid: true}
	}
	if len(req.Msg.TagIds) > 0 {
		params.TagIds = req.Msg.TagIds
	}

	events, err := s.queries.ListEvents(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Count total
	countParams := db.CountEventsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		TagIds:         params.TagIds,
	}
	total, err := s.queries.CountEvents(ctx, countParams)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoEvents := make([]*eventsv1.Event, len(events))
	for i, e := range events {
		org, _ := s.queries.GetOrganization(ctx, e.OrganizationID)
		tags, _ := s.queries.GetEventTags(ctx, e.ID)
		protoEvents[i] = dbEventWithRelationsToProto(e, org, tags)
	}

	return connect.NewResponse(&eventsv1.ListEventsResponse{
		Events: protoEvents,
		Total:  int32(total),
	}), nil
}

func (s *EventsService) ListEventsForAdmin(ctx context.Context, req *connect.Request[eventsv1.ListEventsForAdminRequest]) (*connect.Response[eventsv1.ListEventsForAdminResponse], error) {
	slog.Debug("ListEventsForAdmin", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	params := db.ListEventsParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
	if req.Msg.UserId != nil {
		params.UserID = pgtype.Int4{Int32: *req.Msg.UserId, Valid: true}
	}
	if req.Msg.OrganizationId != nil {
		params.OrganizationID = pgtype.Int4{Int32: *req.Msg.OrganizationId, Valid: true}
	}

	events, err := s.queries.ListEvents(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoEvents := make([]*eventsv1.Event, len(events))
	for i, e := range events {
		org, _ := s.queries.GetOrganization(ctx, e.OrganizationID)
		tags, _ := s.queries.GetEventTags(ctx, e.ID)
		protoEvents[i] = dbEventWithRelationsToProto(e, org, tags)
	}

	// Count total
	countParams := db.CountEventsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	}
	total, err := s.queries.CountEvents(ctx, countParams)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.ListEventsForAdminResponse{
		Events: protoEvents,
		Total:  int32(total),
	}), nil
}

func (s *EventsService) UpdateEvent(ctx context.Context, req *connect.Request[eventsv1.UpdateEventRequest]) (*connect.Response[eventsv1.UpdateEventResponse], error) {
	slog.Debug("UpdateEvent", "id", req.Msg.Id)

	// Authorization: Check if user can edit this event
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		eventID := fmt.Sprintf("%d", req.Msg.Id)
		allowed, err := s.perms.CheckPermission(ctx, userID, "event", eventID, "edit")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to edit this event"))
		}
	}

	// Use transaction for event update + tags
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to begin transaction: %w", err))
	}
	defer func() { _ = tx.Rollback(ctx) }()

	qtx := s.queries.WithTx(tx)

	params := db.UpdateEventParams{
		ID: req.Msg.Id,
	}

	if req.Msg.Title != nil {
		params.Title = pgtype.Text{String: *req.Msg.Title, Valid: true}
	}
	if req.Msg.Description != nil {
		params.Description = pgtype.Text{String: *req.Msg.Description, Valid: true}
	}
	if req.Msg.ImageUrl != nil {
		params.ImageUrl = pgtype.Text{String: *req.Msg.ImageUrl, Valid: true}
	}
	if req.Msg.UserId != nil {
		params.UserID = pgtype.Int4{Int32: *req.Msg.UserId, Valid: true}
	}
	if req.Msg.OrganizationId != nil {
		params.OrganizationID = pgtype.Int4{Int32: *req.Msg.OrganizationId, Valid: true}
	}
	if req.Msg.Location != nil {
		params.Location = pgtype.Text{String: *req.Msg.Location, Valid: true}
	}
	if req.Msg.StartTime != nil {
		t, _ := time.Parse(time.RFC3339, *req.Msg.StartTime)
		params.StartTime = pgtype.Timestamptz{Time: t, Valid: true}
	}
	if req.Msg.EndTime != nil {
		t, _ := time.Parse(time.RFC3339, *req.Msg.EndTime)
		params.EndTime = pgtype.Timestamptz{Time: t, Valid: true}
	}
	if req.Msg.Format != nil {
		if *req.Msg.Format == eventsv1.EventFormat_EVENT_FORMAT_ONLINE {
			params.Format = db.NullFormat{Format: db.FormatOnline, Valid: true}
		} else {
			params.Format = db.NullFormat{Format: db.FormatOffline, Valid: true}
		}
	}

	event, err := qtx.UpdateEvent(ctx, params)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Update tags if provided
	if len(req.Msg.TagIds) > 0 {
		if err := qtx.RemoveEventTags(ctx, req.Msg.Id); err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to remove old tags: %w", err))
		}
		for _, tagID := range req.Msg.TagIds {
			if err := qtx.AddEventTag(ctx, db.AddEventTagParams{
				EventID: event.ID,
				TagID:   tagID,
			}); err != nil {
				return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to add tag: %w", err))
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to commit transaction: %w", err))
	}

	// Fetch fresh relations for response
	org, _ := s.queries.GetOrganization(ctx, event.OrganizationID)
	tags, _ := s.queries.GetEventTags(ctx, event.ID)

	// Re-index event in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			tagNames := make([]string, len(tags))
			tagIds := make([]int32, len(tags))
			for i, t := range tags {
				tagNames[i] = t.Name
				tagIds[i] = t.ID
			}

			doc := &search.EventDocument{
				ID:                event.ID,
				Title:             event.Title,
				Description:       event.Description,
				Location:          event.Location,
				OrganizationID:    event.OrganizationID,
				OrganizationTitle: org.Title,
				Format:            string(event.Format.Format),
				StartTime:         event.StartTime.Time.Format(time.RFC3339),
				EndTime:           event.EndTime.Time.Format(time.RFC3339),
				TagIds:            tagIds,
				Tags:              tagNames,
				CreatedAt:         event.CreatedAt.Time.Format(time.RFC3339),
			}
			if event.ImageUrl.Valid {
				doc.ImageURL = event.ImageUrl.String
			}
			if err := s.search.IndexEvent(context.Background(), doc); err != nil {
				slog.Warn("Failed to re-index event in search", "error", err, "eventId", event.ID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.UpdateEventResponse{
		Event: dbEventWithRelationsToProto(event, org, tags),
	}), nil
}

func (s *EventsService) DeleteEvent(ctx context.Context, req *connect.Request[eventsv1.DeleteEventRequest]) (*connect.Response[eventsv1.DeleteEventResponse], error) {
	slog.Debug("DeleteEvent", "id", req.Msg.Id)

	// Authorization: Check if user can delete this event
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		eventID := fmt.Sprintf("%d", req.Msg.Id)
		allowed, err := s.perms.CheckPermission(ctx, userID, "event", eventID, "delete")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to delete this event"))
		}
	}

	err := s.queries.DeleteEvent(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Remove event from Meilisearch (async, don't block response)
	if s.search != nil {
		eventID := req.Msg.Id
		go func() {
			if err := s.search.DeleteDocument(context.Background(), search.IndexEvents, eventID); err != nil {
				slog.Warn("Failed to delete event from search", "error", err, "eventId", eventID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.DeleteEventResponse{
		Success: true,
	}), nil
}

func (s *EventsService) GetEventsByTagId(ctx context.Context, req *connect.Request[eventsv1.GetEventsByTagIdRequest]) (*connect.Response[eventsv1.GetEventsByTagIdResponse], error) {
	slog.Debug("GetEventsByTagId", "tagId", req.Msg.TagId)

	events, err := s.queries.GetEventsByTagID(ctx, req.Msg.TagId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoEvents := make([]*eventsv1.Event, len(events))
	for i, e := range events {
		org, _ := s.queries.GetOrganization(ctx, e.OrganizationID)
		tags, _ := s.queries.GetEventTags(ctx, e.ID)
		protoEvents[i] = dbEventWithRelationsToProto(e, org, tags)
	}

	return connect.NewResponse(&eventsv1.GetEventsByTagIdResponse{
		Events: protoEvents,
	}), nil
}

func (s *EventsService) GetUserSubscribedEvents(ctx context.Context, req *connect.Request[eventsv1.GetUserSubscribedEventsRequest]) (*connect.Response[eventsv1.GetUserSubscribedEventsResponse], error) {
	slog.Debug("GetUserSubscribedEvents", "userId", req.Msg.UserId)

	regs, err := s.queries.GetUserRegistrations(ctx, req.Msg.UserId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var protoEvents []*eventsv1.Event
	for _, reg := range regs {
		event, err := s.queries.GetEvent(ctx, reg.EventID)
		if err != nil {
			continue
		}
		org, _ := s.queries.GetOrganization(ctx, event.OrganizationID)
		tags, _ := s.queries.GetEventTags(ctx, event.ID)
		protoEvents = append(protoEvents, dbEventWithRelationsToProto(event, org, tags))
	}

	return connect.NewResponse(&eventsv1.GetUserSubscribedEventsResponse{
		Events: protoEvents,
	}), nil
}

// Helper functions

func dbEventToProto(e db.Event, org *db.Organization, tagIDs []int32) *eventsv1.Event {
	format := eventsv1.EventFormat_EVENT_FORMAT_OFFLINE
	if e.Format.Valid && e.Format.Format == db.FormatOnline {
		format = eventsv1.EventFormat_EVENT_FORMAT_ONLINE
	}

	event := &eventsv1.Event{
		Id:             e.ID,
		Title:          e.Title,
		Description:    e.Description,
		UserId:         e.UserID,
		OrganizationId: e.OrganizationID,
		Location:       e.Location,
		StartTime:      e.StartTime.Time.Format(time.RFC3339),
		EndTime:        e.EndTime.Time.Format(time.RFC3339),
		Format:         format,
		TagIds:         tagIDs,
		CreatedAt:      e.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:      e.UpdatedAt.Time.Format(time.RFC3339),
	}
	if e.ImageUrl.Valid {
		event.ImageUrl = &e.ImageUrl.String
	}
	if org != nil {
		event.Organization = dbOrganizationToProto(*org)
	}

	return event
}

func dbEventWithRelationsToProto(e db.Event, org db.Organization, tags []db.Tag) *eventsv1.Event {
	tagIDs := make([]int32, len(tags))
	for i, t := range tags {
		tagIDs[i] = t.ID
	}
	proto := dbEventToProto(e, &org, tagIDs)
	if len(tags) > 0 {
		proto.Tags = make([]*eventsv1.Tag, len(tags))
		for i, t := range tags {
			proto.Tags[i] = dbTagToProto(&t)
		}
	}
	return proto
}

func dbOrganizationToProto(o db.Organization) *eventsv1.Organization {
	status := eventsv1.OrganizationStatus_ORGANIZATION_STATUS_ACTIVE
	if o.Status.Valid {
		switch o.Status.OrganizationStatus {
		case db.OrganizationStatusArchived:
			status = eventsv1.OrganizationStatus_ORGANIZATION_STATUS_ARCHIVED
		case db.OrganizationStatusFrozen:
			status = eventsv1.OrganizationStatus_ORGANIZATION_STATUS_FROZEN
		}
	}

	org := &eventsv1.Organization{
		Id:                 o.ID,
		Title:              o.Title,
		OrganizationTypeId: o.OrganizationTypeID,
		Status:             status,
		CreatedAt:          o.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:          o.UpdatedAt.Time.Format(time.RFC3339),
	}
	if o.ImageUrl.Valid {
		org.ImageUrl = &o.ImageUrl.String
	}
	if o.Description.Valid {
		org.Description = &o.Description.String
	}
	if o.Instagram.Valid {
		org.Instagram = &o.Instagram.String
	}
	if o.TelegramChannel.Valid {
		org.TelegramChannel = &o.TelegramChannel.String
	}
	if o.TelegramChat.Valid {
		org.TelegramChat = &o.TelegramChat.String
	}
	if o.Website.Valid {
		org.Website = &o.Website.String
	}
	if o.Youtube.Valid {
		org.Youtube = &o.Youtube.String
	}
	if o.Tiktok.Valid {
		org.Tiktok = &o.Tiktok.String
	}
	if o.Linkedin.Valid {
		org.Linkedin = &o.Linkedin.String
	}

	return org
}

func dbTagToProto(t *db.Tag) *eventsv1.Tag {
	return &eventsv1.Tag{
		Id:        t.ID,
		Name:      t.Name,
		CreatedAt: t.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt: t.UpdatedAt.Time.Format(time.RFC3339),
	}
}
