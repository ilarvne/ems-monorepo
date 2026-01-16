package services

import (
	"context"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5/pgxpool"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/db"
)

type StatisticsService struct {
	eventsv1connect.UnimplementedStatisticsServiceHandler
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewStatisticsService(queries *db.Queries, pool *pgxpool.Pool) *StatisticsService {
	return &StatisticsService{queries: queries, pool: pool}
}

func (s *StatisticsService) GetDashboardStatistics(ctx context.Context, req *connect.Request[eventsv1.GetDashboardStatisticsRequest]) (*connect.Response[eventsv1.GetDashboardStatisticsResponse], error) {
	slog.Debug("GetDashboardStatistics")

	// Get total counts
	var totalEvents, totalRegs, totalAttendees int32
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events`).Scan(&totalEvents)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM event_registrations WHERE status = 'registered'`).Scan(&totalRegs)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM event_attendance WHERE status = 'attended'`).Scan(&totalAttendees)

	now := time.Now()
	var upcomingEvents, pastEvents int32
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events WHERE start_time >= $1`, now).Scan(&upcomingEvents)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events WHERE start_time < $1`, now).Scan(&pastEvents)

	// Get recent events with stats
	rows, err := s.pool.Query(ctx, `
		SELECT id, title, start_time
		FROM events
		ORDER BY start_time DESC
		LIMIT 5
	`)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var recentEvents []*eventsv1.EventStats
	for rows.Next() {
		var id int32
		var title string
		var startTime time.Time
		if err := rows.Scan(&id, &title, &startTime); err != nil {
			continue
		}

		// Get stats for this event
		var regs, attended int32
		_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'registered'`, id).Scan(&regs)
		_ = s.pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM event_attendance ea
			INNER JOIN event_registrations er ON er.id = ea.registration_id
			WHERE er.event_id = $1 AND ea.status = 'attended'
		`, id).Scan(&attended)

		var attendanceRate float64
		if regs > 0 {
			attendanceRate = float64(attended) / float64(regs) * 100
		}

		recentEvents = append(recentEvents, &eventsv1.EventStats{
			EventId:        id,
			EventTitle:     title,
			Registrations:  regs,
			Attendees:      attended,
			AttendanceRate: attendanceRate,
			StartTime:      startTime.Format(time.RFC3339),
		})
	}

	return connect.NewResponse(&eventsv1.GetDashboardStatisticsResponse{
		Statistics: &eventsv1.EventStatistics{
			TotalEvents:        totalEvents,
			TotalRegistrations: totalRegs,
			TotalAttendees:     totalAttendees,
			UpcomingEvents:     upcomingEvents,
			PastEvents:         pastEvents,
			RecentEvents:       recentEvents,
		},
	}), nil
}

func (s *StatisticsService) GetEventStatistics(ctx context.Context, req *connect.Request[eventsv1.GetEventStatisticsRequest]) (*connect.Response[eventsv1.GetEventStatisticsResponse], error) {
	slog.Debug("GetEventStatistics", "eventId", req.Msg.EventId)

	var totalRegs, totalAttended, checkedIn, noShow int32
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'registered'`, req.Msg.EventId).Scan(&totalRegs)
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM event_attendance ea
		INNER JOIN event_registrations er ON er.id = ea.registration_id
		WHERE er.event_id = $1 AND ea.status = 'attended'
	`, req.Msg.EventId).Scan(&totalAttended)
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM event_attendance ea
		INNER JOIN event_registrations er ON er.id = ea.registration_id
		WHERE er.event_id = $1 AND ea.status = 'checked_in'
	`, req.Msg.EventId).Scan(&checkedIn)
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM event_attendance ea
		INNER JOIN event_registrations er ON er.id = ea.registration_id
		WHERE er.event_id = $1 AND ea.status = 'no_show'
	`, req.Msg.EventId).Scan(&noShow)

	var attendanceRate float64
	if totalRegs > 0 {
		attendanceRate = float64(totalAttended) / float64(totalRegs) * 100
	}

	return connect.NewResponse(&eventsv1.GetEventStatisticsResponse{
		TotalRegistrations: totalRegs,
		TotalAttendees:     totalAttended,
		CheckedIn:          checkedIn,
		NoShow:             noShow,
		AttendanceRate:     attendanceRate,
	}), nil
}

func (s *StatisticsService) GetEventTagsDistributionByMonth(ctx context.Context, req *connect.Request[eventsv1.GetEventTagsDistributionByMonthRequest]) (*connect.Response[eventsv1.GetEventTagsDistributionByMonthResponse], error) {
	slog.Debug("GetEventTagsDistributionByMonth", "year", req.Msg.Year, "month", req.Msg.Month)

	startDate := time.Date(int(req.Msg.Year), time.Month(req.Msg.Month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0)

	rows, err := s.pool.Query(ctx, `
		SELECT t.id, t.name, COUNT(DISTINCT e.id) as event_count
		FROM tags t
		INNER JOIN event_tags et ON et.tag_id = t.id
		INNER JOIN events e ON e.id = et.event_id
		WHERE e.start_time >= $1 AND e.start_time < $2
		GROUP BY t.id, t.name
		ORDER BY event_count DESC
	`, startDate, endDate)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var tags []*eventsv1.TagDistribution
	var totalEvents int32
	for rows.Next() {
		var id int32
		var name string
		var count int32
		if err := rows.Scan(&id, &name, &count); err != nil {
			continue
		}
		tags = append(tags, &eventsv1.TagDistribution{
			TagId:      id,
			TagName:    name,
			EventCount: count,
		})
		totalEvents += count
	}

	return connect.NewResponse(&eventsv1.GetEventTagsDistributionByMonthResponse{
		Tags:        tags,
		TotalEvents: totalEvents,
	}), nil
}

func (s *StatisticsService) GetEventActivityByYear(ctx context.Context, req *connect.Request[eventsv1.GetEventActivityByYearRequest]) (*connect.Response[eventsv1.GetEventActivityByYearResponse], error) {
	slog.Debug("GetEventActivityByYear", "year", req.Msg.Year)

	startDate := time.Date(int(req.Msg.Year), 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(1, 0, 0)

	rows, err := s.pool.Query(ctx, `
		SELECT DATE(start_time) as date, COUNT(*) as count
		FROM events
		WHERE start_time >= $1 AND start_time < $2
		GROUP BY DATE(start_time)
		ORDER BY date
	`, startDate, endDate)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var activities []*eventsv1.EventActivity
	var totalEvents int32
	for rows.Next() {
		var date time.Time
		var count int32
		if err := rows.Scan(&date, &count); err != nil {
			continue
		}
		level := int32(1)
		if count > 5 {
			level = 4
		} else if count > 3 {
			level = 3
		} else if count > 1 {
			level = 2
		}
		activities = append(activities, &eventsv1.EventActivity{
			Date:  date.Format("2006-01-02"),
			Count: count,
			Level: level,
		})
		totalEvents += count
	}

	return connect.NewResponse(&eventsv1.GetEventActivityByYearResponse{
		Activities:  activities,
		TotalEvents: totalEvents,
	}), nil
}

func (s *StatisticsService) GetOverallStatistics(ctx context.Context, req *connect.Request[eventsv1.GetOverallStatisticsRequest]) (*connect.Response[eventsv1.GetOverallStatisticsResponse], error) {
	slog.Debug("GetOverallStatistics")

	var totalEvents, totalUsers, totalOrgs, totalRegs, upcomingEvents int32
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events`).Scan(&totalEvents)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&totalUsers)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM organizations`).Scan(&totalOrgs)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM event_registrations WHERE status = 'registered'`).Scan(&totalRegs)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events WHERE start_time >= NOW()`).Scan(&upcomingEvents)

	// Calculate average attendance rate
	var avgRate float64
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(
			CASE WHEN reg_count > 0 THEN att_count::float / reg_count::float * 100 ELSE 0 END
		), 0)
		FROM (
			SELECT e.id,
				COUNT(DISTINCT CASE WHEN er.status = 'registered' THEN er.id END) as reg_count,
				COUNT(DISTINCT CASE WHEN ea.status = 'attended' THEN ea.id END) as att_count
			FROM events e
			LEFT JOIN event_registrations er ON er.event_id = e.id
			LEFT JOIN event_attendance ea ON ea.registration_id = er.id
			GROUP BY e.id
		) stats
	`).Scan(&avgRate)

	// Events this month
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := monthStart.AddDate(0, 1, 0)

	var eventsThisMonth, regsThisMonth int32
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events WHERE start_time >= $1 AND start_time < $2`, monthStart, monthEnd).Scan(&eventsThisMonth)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM event_registrations WHERE registered_at >= $1 AND registered_at < $2`, monthStart, monthEnd).Scan(&regsThisMonth)

	return connect.NewResponse(&eventsv1.GetOverallStatisticsResponse{
		TotalEvents:            totalEvents,
		TotalUsers:             totalUsers,
		TotalOrganizations:     totalOrgs,
		TotalRegistrations:     totalRegs,
		UpcomingEvents:         upcomingEvents,
		AverageAttendanceRate:  avgRate,
		EventsThisMonth:        eventsThisMonth,
		RegistrationsThisMonth: regsThisMonth,
	}), nil
}

func (s *StatisticsService) GetEventTrends(ctx context.Context, req *connect.Request[eventsv1.GetEventTrendsRequest]) (*connect.Response[eventsv1.GetEventTrendsResponse], error) {
	slog.Debug("GetEventTrends", "days", req.Msg.Days)

	days := int(req.Msg.Days)
	if days <= 0 {
		days = 90
	}

	startDate := time.Now().AddDate(0, 0, -days)

	rows, err := s.pool.Query(ctx, `
		SELECT DATE(e.start_time) as date,
			COUNT(DISTINCT e.id) as event_count,
			COUNT(DISTINCT er.id) as reg_count
		FROM events e
		LEFT JOIN event_registrations er ON er.event_id = e.id AND er.status = 'registered'
		WHERE e.start_time >= $1
		GROUP BY DATE(e.start_time)
		ORDER BY date
	`, startDate)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var trends []*eventsv1.EventTrend
	for rows.Next() {
		var date time.Time
		var eventCount, regCount int32
		if err := rows.Scan(&date, &eventCount, &regCount); err != nil {
			continue
		}
		trends = append(trends, &eventsv1.EventTrend{
			Date:              date.Format("2006-01-02"),
			EventCount:        eventCount,
			RegistrationCount: regCount,
		})
	}

	return connect.NewResponse(&eventsv1.GetEventTrendsResponse{
		Trends: trends,
	}), nil
}

func (s *StatisticsService) GetTopPerformingClubs(ctx context.Context, req *connect.Request[eventsv1.GetTopPerformingClubsRequest]) (*connect.Response[eventsv1.GetTopPerformingClubsResponse], error) {
	slog.Debug("GetTopPerformingClubs", "limit", req.Msg.Limit, "days", req.Msg.Days)

	limit := int(req.Msg.Limit)
	if limit <= 0 {
		limit = 10
	}
	days := int(req.Msg.Days)
	if days <= 0 {
		days = 90
	}

	startDate := time.Now().AddDate(0, 0, -days)

	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.title, o.image_url,
			COUNT(DISTINCT e.id) as total_events,
			COUNT(DISTINCT CASE WHEN er.status = 'registered' THEN er.id END) as total_regs,
			COUNT(DISTINCT CASE WHEN ea.status = 'attended' THEN ea.id END) as total_attended
		FROM organizations o
		INNER JOIN events e ON e.organization_id = o.id AND e.start_time >= $1
		LEFT JOIN event_registrations er ON er.event_id = e.id
		LEFT JOIN event_attendance ea ON ea.registration_id = er.id
		GROUP BY o.id, o.title, o.image_url
		ORDER BY total_events DESC, total_regs DESC
		LIMIT $2
	`, startDate, limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var clubs []*eventsv1.ClubLeaderboard
	for rows.Next() {
		var id int32
		var title string
		var imageURL *string
		var totalEvents, totalRegs, totalAttended int32
		if err := rows.Scan(&id, &title, &imageURL, &totalEvents, &totalRegs, &totalAttended); err != nil {
			continue
		}
		var avgRate float64
		if totalRegs > 0 {
			avgRate = float64(totalAttended) / float64(totalRegs) * 100
		}
		clubs = append(clubs, &eventsv1.ClubLeaderboard{
			OrganizationId:        id,
			OrganizationTitle:     title,
			OrganizationImage:     imageURL,
			TotalEvents:           totalEvents,
			TotalRegistrations:    totalRegs,
			TotalAttendees:        totalAttended,
			AverageAttendanceRate: avgRate,
		})
	}

	return connect.NewResponse(&eventsv1.GetTopPerformingClubsResponse{
		Clubs: clubs,
	}), nil
}

func (s *StatisticsService) GetUserEngagementLevels(ctx context.Context, req *connect.Request[eventsv1.GetUserEngagementLevelsRequest]) (*connect.Response[eventsv1.GetUserEngagementLevelsResponse], error) {
	slog.Debug("GetUserEngagementLevels")

	var totalUsers int32
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&totalUsers)

	var registeredUsers int32
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(DISTINCT user_id) FROM event_registrations WHERE status = 'registered'`).Scan(&registeredUsers)

	var attendedUsers int32
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT er.user_id) FROM event_registrations er
		INNER JOIN event_attendance ea ON ea.registration_id = er.id
		WHERE ea.status = 'attended'
	`).Scan(&attendedUsers)

	var repeatAttendees int32
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM (
			SELECT er.user_id FROM event_registrations er
			INNER JOIN event_attendance ea ON ea.registration_id = er.id
			WHERE ea.status = 'attended'
			GROUP BY er.user_id
			HAVING COUNT(*) > 1
		) repeat_users
	`).Scan(&repeatAttendees)

	levels := []*eventsv1.UserEngagementLevel{
		{Level: "active_users", Count: totalUsers, Percentage: 100},
		{Level: "registered_for_events", Count: registeredUsers, Percentage: float64(registeredUsers) / float64(totalUsers) * 100},
		{Level: "attended_events", Count: attendedUsers, Percentage: float64(attendedUsers) / float64(totalUsers) * 100},
		{Level: "repeat_attendees", Count: repeatAttendees, Percentage: float64(repeatAttendees) / float64(totalUsers) * 100},
	}

	return connect.NewResponse(&eventsv1.GetUserEngagementLevelsResponse{
		Levels:          levels,
		TotalUsers:      totalUsers,
		TrendMessage:    "Showing engagement metrics",
		Description:     "User engagement breakdown",
		IsPositiveTrend: true,
	}), nil
}

func (s *StatisticsService) GetTopPerformingEvents(ctx context.Context, req *connect.Request[eventsv1.GetTopPerformingEventsRequest]) (*connect.Response[eventsv1.GetTopPerformingEventsResponse], error) {
	slog.Debug("GetTopPerformingEvents", "limit", req.Msg.Limit)

	limit := int(req.Msg.Limit)
	if limit <= 0 {
		limit = 10
	}
	days := int(req.Msg.Days)
	if days <= 0 {
		days = 90
	}

	startDate := time.Now().AddDate(0, 0, -days)

	rows, err := s.pool.Query(ctx, `
		SELECT e.id, e.title, e.image_url, e.start_time, e.organization_id,
			COUNT(DISTINCT CASE WHEN er.status = 'registered' THEN er.id END) as total_regs,
			COUNT(DISTINCT CASE WHEN ea.status = 'attended' THEN ea.id END) as total_attended
		FROM events e
		LEFT JOIN event_registrations er ON er.event_id = e.id
		LEFT JOIN event_attendance ea ON ea.registration_id = er.id
		WHERE e.start_time >= $1
		GROUP BY e.id, e.title, e.image_url, e.start_time, e.organization_id
		ORDER BY total_regs DESC, total_attended DESC
		LIMIT $2
	`, startDate, limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var events []*eventsv1.TopPerformingEvent
	for rows.Next() {
		var id int32
		var title string
		var imageURL *string
		var startTime time.Time
		var orgID int32
		var totalRegs, totalAttended int32
		if err := rows.Scan(&id, &title, &imageURL, &startTime, &orgID, &totalRegs, &totalAttended); err != nil {
			continue
		}

		org, _ := s.queries.GetOrganization(ctx, orgID)

		var avgRate float64
		if totalRegs > 0 {
			avgRate = float64(totalAttended) / float64(totalRegs) * 100
		}

		event := &eventsv1.TopPerformingEvent{
			Id:                 id,
			Title:              title,
			ImageUrl:           imageURL,
			StartTime:          startTime.Format(time.RFC3339),
			TotalRegistrations: totalRegs,
			TotalAttendees:     totalAttended,
			AttendanceRate:     avgRate,
		}
		if org.ID != 0 {
			event.Organization = dbOrganizationToProto(org)
		}
		events = append(events, event)
	}

	return connect.NewResponse(&eventsv1.GetTopPerformingEventsResponse{
		Events: events,
	}), nil
}

func (s *StatisticsService) GetLowRegistrationEvents(ctx context.Context, req *connect.Request[eventsv1.GetLowRegistrationEventsRequest]) (*connect.Response[eventsv1.GetLowRegistrationEventsResponse], error) {
	slog.Debug("GetLowRegistrationEvents", "threshold", req.Msg.Threshold)

	daysAhead := int(req.Msg.DaysAhead)
	if daysAhead <= 0 {
		daysAhead = 30
	}

	endDate := time.Now().AddDate(0, 0, daysAhead)

	rows, err := s.pool.Query(ctx, `
		SELECT e.id, e.title, e.image_url, e.start_time, e.organization_id,
			COUNT(DISTINCT er.id) as total_regs
		FROM events e
		LEFT JOIN event_registrations er ON er.event_id = e.id AND er.status = 'registered'
		WHERE e.start_time >= NOW() AND e.start_time <= $1
		GROUP BY e.id, e.title, e.image_url, e.start_time, e.organization_id
		HAVING COUNT(DISTINCT er.id) < 10
		ORDER BY e.start_time
	`, endDate)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var events []*eventsv1.LowRegistrationEvent
	for rows.Next() {
		var id int32
		var title string
		var imageURL *string
		var startTime time.Time
		var orgID int32
		var totalRegs int32
		if err := rows.Scan(&id, &title, &imageURL, &startTime, &orgID, &totalRegs); err != nil {
			continue
		}

		org, _ := s.queries.GetOrganization(ctx, orgID)
		daysUntil := int32(time.Until(startTime).Hours() / 24)

		event := &eventsv1.LowRegistrationEvent{
			Id:                  id,
			Title:               title,
			ImageUrl:            imageURL,
			StartTime:           startTime.Format(time.RFC3339),
			Capacity:            100, // TODO: Add capacity field to events
			TotalRegistrations:  totalRegs,
			CapacityUtilization: float64(totalRegs) / 100 * 100,
			DaysUntilEvent:      daysUntil,
		}
		if org.ID != 0 {
			event.Organization = dbOrganizationToProto(org)
		}
		events = append(events, event)
	}

	return connect.NewResponse(&eventsv1.GetLowRegistrationEventsResponse{
		Events: events,
	}), nil
}

func (s *StatisticsService) GetOrganizationActivity(ctx context.Context, req *connect.Request[eventsv1.GetOrganizationActivityRequest]) (*connect.Response[eventsv1.GetOrganizationActivityResponse], error) {
	slog.Debug("GetOrganizationActivity", "limit", req.Msg.Limit)

	limit := int(req.Msg.Limit)
	if limit <= 0 {
		limit = 20
	}

	now := time.Now()
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastMonthStart := thisMonthStart.AddDate(0, -1, 0)

	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.title, o.image_url,
			COUNT(DISTINCT CASE WHEN e.start_time >= $1 THEN e.id END) as events_this_month,
			COUNT(DISTINCT CASE WHEN e.start_time >= $2 AND e.start_time < $1 THEN e.id END) as events_last_month,
			COUNT(DISTINCT e.id) as total_events
		FROM organizations o
		LEFT JOIN events e ON e.organization_id = o.id
		GROUP BY o.id, o.title, o.image_url
		ORDER BY events_this_month DESC, total_events DESC
		LIMIT $3
	`, thisMonthStart, lastMonthStart, limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	defer rows.Close()

	var orgs []*eventsv1.OrganizationActivity
	for rows.Next() {
		var id int32
		var title string
		var imageURL *string
		var eventsThisMonth, eventsLastMonth, totalEvents int32
		if err := rows.Scan(&id, &title, &imageURL, &eventsThisMonth, &eventsLastMonth, &totalEvents); err != nil {
			continue
		}

		var growthRate float64
		if eventsLastMonth > 0 {
			growthRate = (float64(eventsThisMonth) - float64(eventsLastMonth)) / float64(eventsLastMonth) * 100
		} else if eventsThisMonth > 0 {
			growthRate = 100
		}

		orgs = append(orgs, &eventsv1.OrganizationActivity{
			Id:                id,
			Title:             title,
			ImageUrl:          imageURL,
			EventsThisMonth:   eventsThisMonth,
			EventsLastMonth:   eventsLastMonth,
			TotalEvents:       totalEvents,
			AverageAttendance: 0, // TODO: Calculate
			GrowthRate:        growthRate,
		})
	}

	return connect.NewResponse(&eventsv1.GetOrganizationActivityResponse{
		Organizations: orgs,
	}), nil
}
