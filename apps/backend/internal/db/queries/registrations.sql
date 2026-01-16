-- name: CreateEventRegistration :one
INSERT INTO event_registrations (event_id, user_id, status, registered_at)
VALUES ($1, $2, 'registered', NOW())
RETURNING *;

-- name: GetEventRegistration :one
SELECT * FROM event_registrations WHERE id = $1;

-- name: GetEventRegistrationByEventAndUser :one
SELECT * FROM event_registrations WHERE event_id = $1 AND user_id = $2;

-- name: CancelEventRegistration :exec
UPDATE event_registrations
SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: GetEventRegistrations :many
SELECT * FROM event_registrations
WHERE event_id = $1
ORDER BY registered_at DESC
LIMIT $2 OFFSET $3;

-- name: CountEventRegistrations :one
SELECT COUNT(*) FROM event_registrations WHERE event_id = $1;

-- name: GetUserRegistrations :many
SELECT * FROM event_registrations
WHERE user_id = $1
ORDER BY registered_at DESC;

-- name: CreateEventAttendance :one
INSERT INTO event_attendance (registration_id, status, checked_in_at, checked_in_by, notes)
VALUES ($1, $2, CASE WHEN sqlc.arg('mark_checked_in')::boolean THEN NOW() ELSE NULL END, $3, $4)
RETURNING *;

-- name: UpdateEventAttendance :one
UPDATE event_attendance
SET status = $2, notes = COALESCE(sqlc.narg('notes'), notes), updated_at = NOW()
WHERE registration_id = $1
RETURNING *;

-- name: GetEventAttendanceByRegistration :one
SELECT * FROM event_attendance WHERE registration_id = $1;

-- name: GetEventAttendanceForEvent :many
SELECT ea.*
FROM event_attendance ea
INNER JOIN event_registrations er ON er.id = ea.registration_id
WHERE er.event_id = $1;

-- name: CountEventAttendanceStats :one
SELECT 
    COUNT(*) FILTER (WHERE er.status = 'registered') as total_registered,
    COUNT(*) FILTER (WHERE ea.status = 'attended') as total_attended,
    COUNT(*) FILTER (WHERE ea.status = 'no_show') as total_no_show
FROM event_registrations er
LEFT JOIN event_attendance ea ON ea.registration_id = er.id
WHERE er.event_id = $1;
