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

type EventRegistrationsService struct {
	eventsv1connect.UnimplementedEventRegistrationsServiceHandler
	queries *db.Queries
}

func NewEventRegistrationsService(queries *db.Queries) *EventRegistrationsService {
	return &EventRegistrationsService{queries: queries}
}

func (s *EventRegistrationsService) RegisterForEvent(ctx context.Context, req *connect.Request[eventsv1.RegisterForEventRequest]) (*connect.Response[eventsv1.RegisterForEventResponse], error) {
	slog.Info("RegisterForEvent", "eventId", req.Msg.EventId, "userId", req.Msg.UserId)

	// Check if event exists
	event, err := s.queries.GetEvent(ctx, req.Msg.EventId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if event == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	// Check if already registered
	existing, err := s.queries.GetEventRegistrationByEventAndUser(ctx, req.Msg.EventId, req.Msg.UserId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if existing != nil {
		return nil, connect.NewError(connect.CodeAlreadyExists, nil)
	}

	reg, err := s.queries.CreateEventRegistration(ctx, req.Msg.EventId, req.Msg.UserId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.RegisterForEventResponse{
		Registration: dbEventRegistrationToProto(reg),
	}), nil
}

func (s *EventRegistrationsService) CancelRegistration(ctx context.Context, req *connect.Request[eventsv1.CancelRegistrationRequest]) (*connect.Response[eventsv1.CancelRegistrationResponse], error) {
	slog.Info("CancelRegistration", "registrationId", req.Msg.RegistrationId)

	reg, err := s.queries.GetEventRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if reg == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	err = s.queries.CancelEventRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CancelRegistrationResponse{
		Success: true,
	}), nil
}

func (s *EventRegistrationsService) GetEventRegistrations(ctx context.Context, req *connect.Request[eventsv1.GetEventRegistrationsRequest]) (*connect.Response[eventsv1.GetEventRegistrationsResponse], error) {
	slog.Info("GetEventRegistrations", "eventId", req.Msg.EventId)

	page := int32(1)
	if req.Msg.Page != nil {
		page = *req.Msg.Page
	}
	limit := int32(50)
	if req.Msg.Limit != nil {
		limit = *req.Msg.Limit
	}

	regs, total, err := s.queries.GetEventRegistrations(ctx, req.Msg.EventId, limit, (page-1)*limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRegs := make([]*eventsv1.EventRegistration, len(regs))
	for i, r := range regs {
		protoRegs[i] = dbEventRegistrationToProto(&r)
	}

	return connect.NewResponse(&eventsv1.GetEventRegistrationsResponse{
		Registrations: protoRegs,
		Total:         total,
	}), nil
}

func (s *EventRegistrationsService) GetUserRegistrations(ctx context.Context, req *connect.Request[eventsv1.GetUserRegistrationsRequest]) (*connect.Response[eventsv1.GetUserRegistrationsResponse], error) {
	slog.Info("GetUserRegistrations", "userId", req.Msg.UserId)

	regs, err := s.queries.GetUserRegistrations(ctx, req.Msg.UserId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRegs := make([]*eventsv1.EventRegistration, len(regs))
	for i, r := range regs {
		protoRegs[i] = dbEventRegistrationToProto(&r)
	}

	return connect.NewResponse(&eventsv1.GetUserRegistrationsResponse{
		Registrations: protoRegs,
	}), nil
}

func dbEventRegistrationToProto(r *db.EventRegistration) *eventsv1.EventRegistration {
	reg := &eventsv1.EventRegistration{
		Id:           r.ID,
		EventId:      r.EventID,
		UserId:       r.UserID,
		Status:       dbRegistrationStatusToProto(r.Status),
		RegisteredAt: r.RegisteredAt.Format(time.RFC3339),
		CreatedAt:    r.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    r.UpdatedAt.Format(time.RFC3339),
	}
	if r.CancelledAt.Valid {
		cancelledAt := r.CancelledAt.Time.Format(time.RFC3339)
		reg.CancelledAt = &cancelledAt
	}
	return reg
}

func dbRegistrationStatusToProto(status string) eventsv1.RegistrationStatus {
	switch status {
	case "registered":
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_REGISTERED
	case "cancelled":
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_CANCELLED
	case "waitlist":
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_WAITLIST
	default:
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_UNSPECIFIED
	}
}
