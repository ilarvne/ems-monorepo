-- name: CreateTag :one
INSERT INTO tags (name)
VALUES ($1)
RETURNING *;

-- name: GetTag :one
SELECT * FROM tags WHERE id = $1;

-- name: ListTags :many
SELECT * FROM tags
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CountTags :one
SELECT COUNT(*) FROM tags;

-- name: UpdateTag :one
UPDATE tags
SET name = COALESCE(sqlc.narg('name'), name),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: DeleteTag :exec
DELETE FROM tags WHERE id = $1;

-- name: CreateEvent :one
INSERT INTO events (title, description, image_url, user_id, organization_id, location, start_time, end_time, format)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE(sqlc.narg('format')::format, 'offline'::format))
RETURNING *;

-- name: GetEvent :one
SELECT * FROM events WHERE id = $1;

-- name: UpdateEvent :one
UPDATE events
SET title = COALESCE(sqlc.narg('title'), title),
    description = COALESCE(sqlc.narg('description'), description),
    image_url = COALESCE(sqlc.narg('image_url'), image_url),
    user_id = COALESCE(sqlc.narg('user_id'), user_id),
    organization_id = COALESCE(sqlc.narg('organization_id'), organization_id),
    location = COALESCE(sqlc.narg('location'), location),
    start_time = COALESCE(sqlc.narg('start_time'), start_time),
    end_time = COALESCE(sqlc.narg('end_time'), end_time),
    format = COALESCE(sqlc.narg('format')::format, format),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: DeleteEvent :exec
DELETE FROM events WHERE id = $1;

-- name: AddEventTag :exec
INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2);

-- name: RemoveEventTags :exec
DELETE FROM event_tags WHERE event_id = $1;

-- name: GetEventTags :many
SELECT t.*
FROM tags t
INNER JOIN event_tags et ON et.tag_id = t.id
WHERE et.event_id = $1;

-- name: GetEventTagIDs :many
SELECT tag_id FROM event_tags WHERE event_id = $1;

-- name: GetEventsByTagID :many
SELECT e.*
FROM events e
INNER JOIN event_tags et ON et.event_id = e.id
WHERE et.tag_id = $1;

-- name: ListEvents :many
SELECT DISTINCT e.*
FROM events e
LEFT JOIN event_tags et ON et.event_id = e.id
WHERE 
    (sqlc.narg('user_id')::int IS NULL OR e.user_id = sqlc.narg('user_id')) AND
    (sqlc.narg('organization_id')::int IS NULL OR e.organization_id = sqlc.narg('organization_id')) AND
    (sqlc.narg('tag_ids')::int[] IS NULL OR et.tag_id = ANY(sqlc.narg('tag_ids')::int[]))
ORDER BY e.id
LIMIT $1 OFFSET $2;

-- name: CountEvents :one
SELECT COUNT(DISTINCT e.id)
FROM events e
LEFT JOIN event_tags et ON et.event_id = e.id
WHERE 
    (sqlc.narg('user_id')::int IS NULL OR e.user_id = sqlc.narg('user_id')) AND
    (sqlc.narg('organization_id')::int IS NULL OR e.organization_id = sqlc.narg('organization_id')) AND
    (sqlc.narg('tag_ids')::int[] IS NULL OR et.tag_id = ANY(sqlc.narg('tag_ids')::int[]));
