-- name: CreateOrganization :one
INSERT INTO organizations (title, image_url, description, organization_type_id, instagram, telegram_channel, telegram_chat, website, youtube, tiktok, linkedin, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE(sqlc.narg('status')::organization_status, 'active'::organization_status))
RETURNING *;

-- name: GetOrganization :one
SELECT * FROM organizations WHERE id = $1;

-- name: ListOrganizations :many
SELECT * FROM organizations
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CountOrganizations :one
SELECT COUNT(*) FROM organizations;

-- name: UpdateOrganization :one
UPDATE organizations
SET title = COALESCE(sqlc.narg('title'), title),
    image_url = COALESCE(sqlc.narg('image_url'), image_url),
    description = COALESCE(sqlc.narg('description'), description),
    organization_type_id = COALESCE(sqlc.narg('organization_type_id'), organization_type_id),
    instagram = COALESCE(sqlc.narg('instagram'), instagram),
    telegram_channel = COALESCE(sqlc.narg('telegram_channel'), telegram_channel),
    telegram_chat = COALESCE(sqlc.narg('telegram_chat'), telegram_chat),
    website = COALESCE(sqlc.narg('website'), website),
    youtube = COALESCE(sqlc.narg('youtube'), youtube),
    tiktok = COALESCE(sqlc.narg('tiktok'), tiktok),
    linkedin = COALESCE(sqlc.narg('linkedin'), linkedin),
    status = COALESCE(sqlc.narg('status')::organization_status, status),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: DeleteOrganization :exec
DELETE FROM organizations WHERE id = $1;

-- name: GetOrganizationsByUserRoles :many
SELECT DISTINCT o.*
FROM organizations o
INNER JOIN user_roles ur ON ur.organization_id = o.id
INNER JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = $1 AND r.name = ANY(sqlc.arg('roles')::text[]);

-- name: CreateOrganizationType :one
INSERT INTO organization_types (title)
VALUES ($1)
RETURNING *;

-- name: GetOrganizationType :one
SELECT * FROM organization_types WHERE id = $1;

-- name: ListOrganizationTypes :many
SELECT * FROM organization_types
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CountOrganizationTypes :one
SELECT COUNT(*) FROM organization_types;

-- name: UpdateOrganizationType :one
UPDATE organization_types
SET title = COALESCE(sqlc.narg('title'), title),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: DeleteOrganizationType :exec
DELETE FROM organization_types WHERE id = $1;
