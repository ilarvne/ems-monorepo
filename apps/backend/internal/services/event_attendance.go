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

type EventAttendanceService struct {
	eventsv1connect.UnimplementedEventAttendanceServiceHandler
	queries *db.Queries
}

func NewEventAttendanceService(queries *db.Queries) *EventAttendanceService {
	return &EventAttendanceService{queries: queries}
}

func (s *EventAttendanceService) CheckInAttendee(ctx context.Context, req *connect.Request[eventsv1.CheckInAttendeeRequest]) (*connect.Response[eventsv1.CheckInAttendeeResponse], error) {
	slog.Info("CheckInAttendee", "registrationId", req.Msg.RegistrationId)

	// Check if registration exists
	reg, err := s.queries.GetEventRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if reg == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	// Check if already has attendance record
	existing, err := s.queries.GetEventAttendanceByRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var att *db.EventAttendance
	checkedInBy := &req.Msg.CheckedInBy
	if existing != nil {
		att, err = s.queries.UpdateEventAttendance(ctx, req.Msg.RegistrationId, "checked_in", req.Msg.Notes)
	} else {
		att, err = s.queries.CreateEventAttendance(ctx, req.Msg.RegistrationId, "checked_in", checkedInBy, req.Msg.Notes)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CheckInAttendeeResponse{
		Attendance: dbEventAttendanceToProto(att),
	}), nil
}

func (s *EventAttendanceService) MarkAttendance(ctx context.Context, req *connect.Request[eventsv1.MarkAttendanceRequest]) (*connect.Response[eventsv1.MarkAttendanceResponse], error) {
	slog.Info("MarkAttendance", "registrationId", req.Msg.RegistrationId, "status", req.Msg.Status)

	// Check if registration exists
	reg, err := s.queries.GetEventRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if reg == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	status := protoAttendanceStatusToString(req.Msg.Status)

	// Check if already has attendance record
	existing, err := s.queries.GetEventAttendanceByRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var att *db.EventAttendance
	if existing != nil {
		att, err = s.queries.UpdateEventAttendance(ctx, req.Msg.RegistrationId, status, req.Msg.Notes)
	} else {
		att, err = s.queries.CreateEventAttendance(ctx, req.Msg.RegistrationId, status, nil, req.Msg.Notes)
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.MarkAttendanceResponse{
		Attendance: dbEventAttendanceToProto(att),
	}), nil
}

func (s *EventAttendanceService) GetEventAttendance(ctx context.Context, req *connect.Request[eventsv1.GetEventAttendanceRequest]) (*connect.Response[eventsv1.GetEventAttendanceResponse], error) {
	slog.Info("GetEventAttendance", "eventId", req.Msg.EventId)

	stats, err := s.queries.GetEventAttendance(ctx, req.Msg.EventId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoAtt := make([]*eventsv1.EventAttendance, len(stats.Attendance))
	for i, a := range stats.Attendance {
		protoAtt[i] = dbEventAttendanceToProto(&a)
	}

	return connect.NewResponse(&eventsv1.GetEventAttendanceResponse{
		Attendance:      protoAtt,
		TotalRegistered: stats.TotalRegistered,
		TotalAttended:   stats.TotalAttended,
		TotalNoShow:     stats.TotalNoShow,
	}), nil
}

func dbEventAttendanceToProto(a *db.EventAttendance) *eventsv1.EventAttendance {
	att := &eventsv1.EventAttendance{
		Id:             a.ID,
		RegistrationId: a.RegistrationID,
		Status:         dbAttendanceStatusToProto(a.Status),
		CreatedAt:      a.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      a.UpdatedAt.Format(time.RFC3339),
	}
	if a.CheckedInAt.Valid {
		checkedInAt := a.CheckedInAt.Time.Format(time.RFC3339)
		att.CheckedInAt = &checkedInAt
	}
	if a.CheckedInBy.Valid {
		att.CheckedInBy = &a.CheckedInBy.Int32
	}
	if a.Notes.Valid {
		att.Notes = &a.Notes.String
	}
	return att
}

func dbAttendanceStatusToProto(status string) eventsv1.AttendanceStatus {
	switch status {
	case "attended":
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_ATTENDED
	case "no_show":
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_NO_SHOW
	case "checked_in":
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_CHECKED_IN
	default:
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_UNSPECIFIED
	}
}

func protoAttendanceStatusToString(status eventsv1.AttendanceStatus) string {
	switch status {
	case eventsv1.AttendanceStatus_ATTENDANCE_STATUS_ATTENDED:
		return "attended"
	case eventsv1.AttendanceStatus_ATTENDANCE_STATUS_NO_SHOW:
		return "no_show"
	case eventsv1.AttendanceStatus_ATTENDANCE_STATUS_CHECKED_IN:
		return "checked_in"
	default:
		return "attended"
	}
}
