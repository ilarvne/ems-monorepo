-- name: CreateUser :one
INSERT INTO users (username, email, password)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUser :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1;

-- name: GetUserByKratosID :one
SELECT * FROM users WHERE kratos_id = $1;

-- name: CreateUserFromKratos :one
INSERT INTO users (kratos_id, username, email, password)
VALUES ($1, $2, $3, 'kratos-managed')
ON CONFLICT (email) DO UPDATE SET kratos_id = $1, updated_at = NOW()
RETURNING *;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY id
LIMIT $1 OFFSET $2;

-- name: CountUsers :one
SELECT COUNT(*) FROM users;

-- name: UpdateUser :one
UPDATE users
SET username = COALESCE(sqlc.narg('username'), username),
    email = COALESCE(sqlc.narg('email'), email),
    updated_at = NOW()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- Pre-registered users queries

-- name: CreatePreRegisteredUser :one
INSERT INTO pre_registered_users (email, platform_role, created_by)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPreRegisteredUserByEmail :one
SELECT * FROM pre_registered_users WHERE email = $1 AND used_at IS NULL;

-- name: ListPreRegisteredUsers :many
SELECT * FROM pre_registered_users
WHERE (sqlc.arg('include_used')::boolean = true OR used_at IS NULL)
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountPreRegisteredUsers :one
SELECT COUNT(*) FROM pre_registered_users
WHERE (sqlc.arg('include_used')::boolean = true OR used_at IS NULL);

-- name: MarkPreRegisteredUserUsed :one
UPDATE pre_registered_users
SET used_at = NOW(), used_by_user_id = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeletePreRegisteredUser :exec
DELETE FROM pre_registered_users WHERE id = $1;
