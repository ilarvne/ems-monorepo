package services

import (
	"context"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/db"
)

type EventsService struct {
	eventsv1connect.UnimplementedEventsServiceHandler
	queries *db.Queries
}

func NewEventsService(queries *db.Queries) *EventsService {
	return &EventsService{queries: queries}
}

func (s *EventsService) CreateEvent(ctx context.Context, req *connect.Request[eventsv1.CreateEventRequest]) (*connect.Response[eventsv1.CreateEventResponse], error) {
	slog.Info("CreateEvent", "title", req.Msg.Title)

	format := "offline"
	if req.Msg.Format == eventsv1.EventFormat_EVENT_FORMAT_ONLINE {
		format = "online"
	}

	startTime, _ := time.Parse(time.RFC3339, req.Msg.StartTime)
	endTime, _ := time.Parse(time.RFC3339, req.Msg.EndTime)

	event := &db.Event{
		Title:          req.Msg.Title,
		Description:    req.Msg.Description,
		UserID:         req.Msg.UserId,
		OrganizationID: req.Msg.OrganizationId,
		Location:       req.Msg.Location,
		StartTime:      startTime,
		EndTime:        endTime,
		Format:         format,
	}
	if req.Msg.ImageUrl != nil {
		event.ImageURL.String = *req.Msg.ImageUrl
		event.ImageURL.Valid = true
	}

	created, err := s.queries.CreateEvent(ctx, event, req.Msg.TagIds)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CreateEventResponse{
		Event: dbEventToProto(created, nil, nil),
	}), nil
}

func (s *EventsService) GetEvent(ctx context.Context, req *connect.Request[eventsv1.GetEventRequest]) (*connect.Response[eventsv1.GetEventResponse], error) {
	slog.Info("GetEvent", "id", req.Msg.Id)

	event, err := s.queries.GetEventWithRelations(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if event == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	tagIDs, _ := s.queries.GetEventTagIDs(ctx, event.ID)

	return connect.NewResponse(&eventsv1.GetEventResponse{
		Event: dbEventWithRelationsToProto(event, tagIDs),
	}), nil
}

func (s *EventsService) ListEvents(ctx context.Context, req *connect.Request[eventsv1.ListEventsRequest]) (*connect.Response[eventsv1.ListEventsResponse], error) {
	slog.Info("ListEvents", "page", req.Msg.Page, "limit", req.Msg.Limit)

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
		params.UserID = req.Msg.UserId
	}
	if req.Msg.OrganizationId != nil {
		params.OrganizationID = req.Msg.OrganizationId
	}
	if len(req.Msg.TagIds) > 0 {
		params.TagIDs = req.Msg.TagIds
	}

	events, total, err := s.queries.ListEvents(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoEvents := make([]*eventsv1.Event, len(events))
	for i, e := range events {
		tagIDs, _ := s.queries.GetEventTagIDs(ctx, e.ID)
		protoEvents[i] = dbEventWithRelationsToProto(&e, tagIDs)
	}

	return connect.NewResponse(&eventsv1.ListEventsResponse{
		Events: protoEvents,
		Total:  total,
	}), nil
}

func (s *EventsService) ListEventsForAdmin(ctx context.Context, req *connect.Request[eventsv1.ListEventsForAdminRequest]) (*connect.Response[eventsv1.ListEventsForAdminResponse], error) {
	slog.Info("ListEventsForAdmin", "page", req.Msg.Page, "limit", req.Msg.Limit)

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
		params.UserID = req.Msg.UserId
	}
	if req.Msg.OrganizationId != nil {
		params.OrganizationID = req.Msg.OrganizationId
	}

	events, _, err := s.queries.ListEvents(ctx, params)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoEvents := make([]*eventsv1.Event, len(events))
	for i, e := range events {
		tagIDs, _ := s.queries.GetEventTagIDs(ctx, e.ID)
		protoEvents[i] = dbEventWithRelationsToProto(&e, tagIDs)
	}

	return connect.NewResponse(&eventsv1.ListEventsForAdminResponse{
		Events: protoEvents,
	}), nil
}

func (s *EventsService) UpdateEvent(ctx context.Context, req *connect.Request[eventsv1.UpdateEventRequest]) (*connect.Response[eventsv1.UpdateEventResponse], error) {
	slog.Info("UpdateEvent", "id", req.Msg.Id)

	updates := make(map[string]interface{})
	if req.Msg.Title != nil {
		updates["title"] = *req.Msg.Title
	}
	if req.Msg.Description != nil {
		updates["description"] = *req.Msg.Description
	}
	if req.Msg.ImageUrl != nil {
		updates["image_url"] = *req.Msg.ImageUrl
	}
	if req.Msg.UserId != nil {
		updates["user_id"] = *req.Msg.UserId
	}
	if req.Msg.OrganizationId != nil {
		updates["organization_id"] = *req.Msg.OrganizationId
	}
	if req.Msg.Location != nil {
		updates["location"] = *req.Msg.Location
	}
	if req.Msg.StartTime != nil {
		t, _ := time.Parse(time.RFC3339, *req.Msg.StartTime)
		updates["start_time"] = t
	}
	if req.Msg.EndTime != nil {
		t, _ := time.Parse(time.RFC3339, *req.Msg.EndTime)
		updates["end_time"] = t
	}
	if req.Msg.Format != nil {
		format := "offline"
		if *req.Msg.Format == eventsv1.EventFormat_EVENT_FORMAT_ONLINE {
			format = "online"
		}
		updates["format"] = format
	}

	var tagIDs []int32
	if len(req.Msg.TagIds) > 0 {
		tagIDs = req.Msg.TagIds
	}

	event, err := s.queries.UpdateEvent(ctx, req.Msg.Id, updates, tagIDs)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if event == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&eventsv1.UpdateEventResponse{
		Event: dbEventToProto(event, nil, req.Msg.TagIds),
	}), nil
}

func (s *EventsService) DeleteEvent(ctx context.Context, req *connect.Request[eventsv1.DeleteEventRequest]) (*connect.Response[eventsv1.DeleteEventResponse], error) {
	slog.Info("DeleteEvent", "id", req.Msg.Id)

	success, err := s.queries.DeleteEvent(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.DeleteEventResponse{
		Success: success,
	}), nil
}

func (s *EventsService) GetEventsByTagId(ctx context.Context, req *connect.Request[eventsv1.GetEventsByTagIdRequest]) (*connect.Response[eventsv1.GetEventsByTagIdResponse], error) {
	slog.Info("GetEventsByTagId", "tagId", req.Msg.TagId)

	events, err := s.queries.GetEventsByTagID(ctx, req.Msg.TagId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoEvents := make([]*eventsv1.Event, len(events))
	for i, e := range events {
		tagIDs, _ := s.queries.GetEventTagIDs(ctx, e.ID)
		protoEvents[i] = dbEventWithRelationsToProto(&e, tagIDs)
	}

	return connect.NewResponse(&eventsv1.GetEventsByTagIdResponse{
		Events: protoEvents,
	}), nil
}

func (s *EventsService) GetUserSubscribedEvents(ctx context.Context, req *connect.Request[eventsv1.GetUserSubscribedEventsRequest]) (*connect.Response[eventsv1.GetUserSubscribedEventsResponse], error) {
	slog.Info("GetUserSubscribedEvents", "userId", req.Msg.UserId)

	regs, err := s.queries.GetUserRegistrations(ctx, req.Msg.UserId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var protoEvents []*eventsv1.Event
	for _, reg := range regs {
		event, err := s.queries.GetEventWithRelations(ctx, reg.EventID)
		if err != nil || event == nil {
			continue
		}
		tagIDs, _ := s.queries.GetEventTagIDs(ctx, event.ID)
		protoEvents = append(protoEvents, dbEventWithRelationsToProto(event, tagIDs))
	}

	return connect.NewResponse(&eventsv1.GetUserSubscribedEventsResponse{
		Events: protoEvents,
	}), nil
}

// Helper functions

func dbEventToProto(e *db.Event, org *db.Organization, tagIDs []int32) *eventsv1.Event {
	format := eventsv1.EventFormat_EVENT_FORMAT_OFFLINE
	if e.Format == "online" {
		format = eventsv1.EventFormat_EVENT_FORMAT_ONLINE
	}

	event := &eventsv1.Event{
		Id:             e.ID,
		Title:          e.Title,
		Description:    e.Description,
		UserId:         e.UserID,
		OrganizationId: e.OrganizationID,
		Location:       e.Location,
		StartTime:      e.StartTime.Format(time.RFC3339),
		EndTime:        e.EndTime.Format(time.RFC3339),
		Format:         format,
		TagIds:         tagIDs,
		CreatedAt:      e.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      e.UpdatedAt.Format(time.RFC3339),
	}
	if e.ImageURL.Valid {
		event.ImageUrl = &e.ImageURL.String
	}
	if org != nil {
		event.Organization = dbOrganizationToProto(org)
	}

	return event
}

func dbEventWithRelationsToProto(e *db.EventWithRelations, tagIDs []int32) *eventsv1.Event {
	proto := dbEventToProto(&e.Event, e.Organization, tagIDs)
	if len(e.Tags) > 0 {
		proto.Tags = make([]*eventsv1.Tag, len(e.Tags))
		for i, t := range e.Tags {
			proto.Tags[i] = dbTagToProto(&t)
		}
	}
	return proto
}

func dbOrganizationToProto(o *db.Organization) *eventsv1.Organization {
	status := eventsv1.OrganizationStatus_ORGANIZATION_STATUS_ACTIVE
	switch o.Status {
	case "archived":
		status = eventsv1.OrganizationStatus_ORGANIZATION_STATUS_ARCHIVED
	case "frozen":
		status = eventsv1.OrganizationStatus_ORGANIZATION_STATUS_FROZEN
	}

	org := &eventsv1.Organization{
		Id:                 o.ID,
		Title:              o.Title,
		OrganizationTypeId: o.OrganizationTypeID,
		Status:             status,
		CreatedAt:          o.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          o.UpdatedAt.Format(time.RFC3339),
	}
	if o.ImageURL.Valid {
		org.ImageUrl = &o.ImageURL.String
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
	if o.YouTube.Valid {
		org.Youtube = &o.YouTube.String
	}
	if o.TikTok.Valid {
		org.Tiktok = &o.TikTok.String
	}
	if o.LinkedIn.Valid {
		org.Linkedin = &o.LinkedIn.String
	}

	return org
}

func dbTagToProto(t *db.Tag) *eventsv1.Tag {
	return &eventsv1.Tag{
		Id:        t.ID,
		Name:      t.Name,
		CreatedAt: t.CreatedAt.Format(time.RFC3339),
		UpdatedAt: t.UpdatedAt.Format(time.RFC3339),
	}
}
