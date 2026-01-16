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
