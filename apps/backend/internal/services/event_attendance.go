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

type EventAttendanceService struct {
	eventsv1connect.UnimplementedEventAttendanceServiceHandler
	queries *db.Queries
}

func NewEventAttendanceService(queries *db.Queries) *EventAttendanceService {
	return &EventAttendanceService{queries: queries}
}

func (s *EventAttendanceService) CheckInAttendee(ctx context.Context, req *connect.Request[eventsv1.CheckInAttendeeRequest]) (*connect.Response[eventsv1.CheckInAttendeeResponse], error) {
	slog.Debug("CheckInAttendee", "registrationId", req.Msg.RegistrationId)

	// Check if registration exists
	_, err := s.queries.GetEventRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Check if already has attendance record
	_, err = s.queries.GetEventAttendanceByRegistration(ctx, req.Msg.RegistrationId)
	if err != nil && err != pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var att db.EventAttendance
	var notes pgtype.Text
	if req.Msg.Notes != nil {
		notes = pgtype.Text{String: *req.Msg.Notes, Valid: true}
	}

	if err == nil {
		// Existing record - update
		att, err = s.queries.UpdateEventAttendance(ctx, db.UpdateEventAttendanceParams{
			RegistrationID: req.Msg.RegistrationId,
			Status:         db.AttendanceStatusCheckedIn,
			Notes:          notes,
		})
	} else {
		// New record - create
		att, err = s.queries.CreateEventAttendance(ctx, db.CreateEventAttendanceParams{
			RegistrationID: req.Msg.RegistrationId,
			Status:         db.AttendanceStatusCheckedIn,
			MarkCheckedIn:  true,
			CheckedInBy:    pgtype.Int4{Int32: req.Msg.CheckedInBy, Valid: true},
			Notes:          notes,
		})
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CheckInAttendeeResponse{
		Attendance: dbEventAttendanceToProto(att),
	}), nil
}

func (s *EventAttendanceService) MarkAttendance(ctx context.Context, req *connect.Request[eventsv1.MarkAttendanceRequest]) (*connect.Response[eventsv1.MarkAttendanceResponse], error) {
	slog.Debug("MarkAttendance", "registrationId", req.Msg.RegistrationId, "status", req.Msg.Status)

	// Check if registration exists
	_, err := s.queries.GetEventRegistration(ctx, req.Msg.RegistrationId)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	status := protoAttendanceStatusToDB(req.Msg.Status)

	// Check if already has attendance record
	_, err = s.queries.GetEventAttendanceByRegistration(ctx, req.Msg.RegistrationId)
	if err != nil && err != pgx.ErrNoRows {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var att db.EventAttendance
	var notes pgtype.Text
	if req.Msg.Notes != nil {
		notes = pgtype.Text{String: *req.Msg.Notes, Valid: true}
	}

	if err == nil {
		// Update
		att, err = s.queries.UpdateEventAttendance(ctx, db.UpdateEventAttendanceParams{
			RegistrationID: req.Msg.RegistrationId,
			Status:         status,
			Notes:          notes,
		})
	} else {
		// Create
		markCheckedIn := status == db.AttendanceStatusCheckedIn || status == db.AttendanceStatusAttended
		att, err = s.queries.CreateEventAttendance(ctx, db.CreateEventAttendanceParams{
			RegistrationID: req.Msg.RegistrationId,
			Status:         status,
			MarkCheckedIn:  markCheckedIn,
			Notes:          notes,
		})
	}
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.MarkAttendanceResponse{
		Attendance: dbEventAttendanceToProto(att),
	}), nil
}

func (s *EventAttendanceService) GetEventAttendance(ctx context.Context, req *connect.Request[eventsv1.GetEventAttendanceRequest]) (*connect.Response[eventsv1.GetEventAttendanceResponse], error) {
	slog.Debug("GetEventAttendance", "eventId", req.Msg.EventId)

	attendanceList, err := s.queries.GetEventAttendanceForEvent(ctx, req.Msg.EventId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	stats, err := s.queries.CountEventAttendanceStats(ctx, req.Msg.EventId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoAtt := make([]*eventsv1.EventAttendance, len(attendanceList))
	for i, a := range attendanceList {
		protoAtt[i] = dbEventAttendanceToProto(a)
	}

	return connect.NewResponse(&eventsv1.GetEventAttendanceResponse{
		Attendance:      protoAtt,
		TotalRegistered: int32(stats.TotalRegistered),
		TotalAttended:   int32(stats.TotalAttended),
		TotalNoShow:     int32(stats.TotalNoShow),
	}), nil
}

func dbEventAttendanceToProto(a db.EventAttendance) *eventsv1.EventAttendance {
	att := &eventsv1.EventAttendance{
		Id:             a.ID,
		RegistrationId: a.RegistrationID,
		Status:         dbAttendanceStatusToProto(a.Status),
		CreatedAt:      a.CreatedAt.Time.Format(time.RFC3339),
		UpdatedAt:      a.UpdatedAt.Time.Format(time.RFC3339),
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

func dbAttendanceStatusToProto(status db.AttendanceStatus) eventsv1.AttendanceStatus {
	switch status {
	case db.AttendanceStatusAttended:
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_ATTENDED
	case db.AttendanceStatusNoShow:
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_NO_SHOW
	case db.AttendanceStatusCheckedIn:
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_CHECKED_IN
	default:
		return eventsv1.AttendanceStatus_ATTENDANCE_STATUS_UNSPECIFIED
	}
}

func protoAttendanceStatusToDB(status eventsv1.AttendanceStatus) db.AttendanceStatus {
	switch status {
	case eventsv1.AttendanceStatus_ATTENDANCE_STATUS_ATTENDED:
		return db.AttendanceStatusAttended
	case eventsv1.AttendanceStatus_ATTENDANCE_STATUS_NO_SHOW:
		return db.AttendanceStatusNoShow
	case eventsv1.AttendanceStatus_ATTENDANCE_STATUS_CHECKED_IN:
		return db.AttendanceStatusCheckedIn
	default:
		return db.AttendanceStatusAttended
	}
}
