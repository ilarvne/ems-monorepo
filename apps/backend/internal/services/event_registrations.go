package services

import (
	"context"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5"
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
	slog.Debug("RegisterForEvent", "eventId", req.Msg.EventId, "userId", req.Msg.UserId)

	// Check if event exists
	_, err := s.queries.GetEvent(ctx, req.Msg.EventId)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Check if already registered
	existing, err := s.queries.GetEventRegistrationByEventAndUser(ctx, db.GetEventRegistrationByEventAndUserParams{
		EventID: req.Msg.EventId,
		UserID:  req.Msg.UserId,
	})
	if err != nil && err != pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if err == nil {
		// Found existing registration
		if existing.Status == db.RegistrationStatusCancelled {
			// Allow re-registration logic if needed, but for now duplicate
			// In a real app we might update the existing one
		}
		return nil, connect.NewError(connect.CodeAlreadyExists, nil)
	}

	reg, err := s.queries.CreateEventRegistration(ctx, db.CreateEventRegistrationParams{
		EventID: req.Msg.EventId,
		UserID:  req.Msg.UserId,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.RegisterForEventResponse{
		Registration: dbEventRegistrationToProto(reg),
	}), nil
}

func (s *EventRegistrationsService) CancelRegistration(ctx context.Context, req *connect.Request[eventsv1.CancelRegistrationRequest]) (*connect.Response[eventsv1.CancelRegistrationResponse], error) {
	slog.Debug("CancelRegistration", "registrationId", req.Msg.RegistrationId)

	_, err := s.queries.GetEventRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
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
	slog.Debug("GetEventRegistrations", "eventId", req.Msg.EventId)

	page := int32(1)
	if req.Msg.Page != nil {
		page = *req.Msg.Page
	}
	limit := int32(50)
	if req.Msg.Limit != nil {
		limit = *req.Msg.Limit
	}

	regs, err := s.queries.GetEventRegistrations(ctx, db.GetEventRegistrationsParams{
		EventID: req.Msg.EventId,
		Limit:   limit,
		Offset:  (page - 1) * limit,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	total, err := s.queries.CountEventRegistrations(ctx, req.Msg.EventId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRegs := make([]*eventsv1.EventRegistration, len(regs))
	for i, r := range regs {
		protoRegs[i] = dbEventRegistrationToProto(r)
	}

	return connect.NewResponse(&eventsv1.GetEventRegistrationsResponse{
		Registrations: protoRegs,
		Total:         int32(total),
	}), nil
}

func (s *EventRegistrationsService) GetUserRegistrations(ctx context.Context, req *connect.Request[eventsv1.GetUserRegistrationsRequest]) (*connect.Response[eventsv1.GetUserRegistrationsResponse], error) {
	slog.Debug("GetUserRegistrations", "userId", req.Msg.UserId)

	regs, err := s.queries.GetUserRegistrations(ctx, req.Msg.UserId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoRegs := make([]*eventsv1.EventRegistration, len(regs))
	for i, r := range regs {
		protoRegs[i] = dbEventRegistrationToProto(r)
	}

	return connect.NewResponse(&eventsv1.GetUserRegistrationsResponse{
		Registrations: protoRegs,
	}), nil
}

func dbEventRegistrationToProto(r db.EventRegistration) *eventsv1.EventRegistration {
	reg := &eventsv1.EventRegistration{
		Id:           r.ID,
		EventId:      r.EventID,
		UserId:       r.UserID,
		Status:       dbRegistrationStatusToProto(r.Status),
		RegisteredAt: r.RegisteredAt.Time.Format(time.RFC3339),
		CreatedAt:    r.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:    r.UpdatedAt.Time.Format(time.RFC3339),
	}
	if r.CancelledAt.Valid {
		cancelledAt := r.CancelledAt.Time.Format(time.RFC3339)
		reg.CancelledAt = &cancelledAt
	}
	return reg
}

func dbRegistrationStatusToProto(status db.RegistrationStatus) eventsv1.RegistrationStatus {
	switch status {
	case db.RegistrationStatusRegistered:
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_REGISTERED
	case db.RegistrationStatusCancelled:
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_CANCELLED
	case db.RegistrationStatusWaitlist:
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_WAITLIST
	default:
		return eventsv1.RegistrationStatus_REGISTRATION_STATUS_UNSPECIFIED
	}
}
