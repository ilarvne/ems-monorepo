package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Queries struct {
	pool *pgxpool.Pool
}

func NewQueries(pool *pgxpool.Pool) *Queries {
	return &Queries{pool: pool}
}

// ==================== Users ====================

func (q *Queries) CreateUser(ctx context.Context, username, email, password string) (*User, error) {
	var user User
	err := q.pool.QueryRow(ctx, `
		INSERT INTO users (username, email, password)
		VALUES ($1, $2, $3)
		RETURNING id, username, email, password, created_at, updated_at
	`, username, email, password).Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return &user, nil
}

func (q *Queries) GetUser(ctx context.Context, id int32) (*User, error) {
	var user User
	err := q.pool.QueryRow(ctx, `
		SELECT id, username, email, password, created_at, updated_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &user, nil
}

func (q *Queries) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := q.pool.QueryRow(ctx, `
		SELECT id, username, email, password, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &user, nil
}

func (q *Queries) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	var user User
	err := q.pool.QueryRow(ctx, `
		SELECT id, username, email, password, created_at, updated_at
		FROM users WHERE username = $1
	`, username).Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user by username: %w", err)
	}
	return &user, nil
}

func (q *Queries) ListUsers(ctx context.Context, limit, offset int32) ([]User, int32, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, username, email, password, created_at, updated_at
		FROM users
		ORDER BY id
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, user)
	}

	var total int32
	err = q.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	return users, total, nil
}

func (q *Queries) UpdateUser(ctx context.Context, id int32, username, email *string) (*User, error) {
	var user User
	err := q.pool.QueryRow(ctx, `
		UPDATE users
		SET username = COALESCE($2, username),
		    email = COALESCE($3, email),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, username, email, password, created_at, updated_at
	`, id, username, email).Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update user: %w", err)
	}
	return &user, nil
}

func (q *Queries) DeleteUser(ctx context.Context, id int32) (bool, error) {
	result, err := q.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete user: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

// ==================== Organizations ====================

func (q *Queries) CreateOrganization(ctx context.Context, org *Organization) (*Organization, error) {
	err := q.pool.QueryRow(ctx, `
		INSERT INTO organizations (title, image_url, description, organization_type_id, instagram, telegram_channel, telegram_chat, website, youtube, tiktok, linkedin, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, 'active'))
		RETURNING id, title, image_url, description, organization_type_id, instagram, telegram_channel, telegram_chat, website, youtube, tiktok, linkedin, status, created_at, updated_at
	`, org.Title, org.ImageURL, org.Description, org.OrganizationTypeID, org.Instagram, org.TelegramChannel, org.TelegramChat, org.Website, org.YouTube, org.TikTok, org.LinkedIn, org.Status).
		Scan(&org.ID, &org.Title, &org.ImageURL, &org.Description, &org.OrganizationTypeID, &org.Instagram, &org.TelegramChannel, &org.TelegramChat, &org.Website, &org.YouTube, &org.TikTok, &org.LinkedIn, &org.Status, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create organization: %w", err)
	}
	return org, nil
}

func (q *Queries) GetOrganization(ctx context.Context, id int32) (*Organization, error) {
	var org Organization
	err := q.pool.QueryRow(ctx, `
		SELECT id, title, image_url, description, organization_type_id, instagram, telegram_channel, telegram_chat, website, youtube, tiktok, linkedin, status, created_at, updated_at
		FROM organizations WHERE id = $1
	`, id).Scan(&org.ID, &org.Title, &org.ImageURL, &org.Description, &org.OrganizationTypeID, &org.Instagram, &org.TelegramChannel, &org.TelegramChat, &org.Website, &org.YouTube, &org.TikTok, &org.LinkedIn, &org.Status, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization: %w", err)
	}
	return &org, nil
}

func (q *Queries) ListOrganizations(ctx context.Context, limit, offset int32) ([]Organization, int32, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, title, image_url, description, organization_type_id, instagram, telegram_channel, telegram_chat, website, youtube, tiktok, linkedin, status, created_at, updated_at
		FROM organizations
		ORDER BY id
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list organizations: %w", err)
	}
	defer rows.Close()

	var orgs []Organization
	for rows.Next() {
		var org Organization
		if err := rows.Scan(&org.ID, &org.Title, &org.ImageURL, &org.Description, &org.OrganizationTypeID, &org.Instagram, &org.TelegramChannel, &org.TelegramChat, &org.Website, &org.YouTube, &org.TikTok, &org.LinkedIn, &org.Status, &org.CreatedAt, &org.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan organization: %w", err)
		}
		orgs = append(orgs, org)
	}

	var total int32
	err = q.pool.QueryRow(ctx, `SELECT COUNT(*) FROM organizations`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count organizations: %w", err)
	}

	return orgs, total, nil
}

func (q *Queries) UpdateOrganization(ctx context.Context, id int32, updates map[string]interface{}) (*Organization, error) {
	// Build dynamic update query
	var org Organization
	err := q.pool.QueryRow(ctx, `
		UPDATE organizations
		SET title = COALESCE($2, title),
		    image_url = COALESCE($3, image_url),
		    description = COALESCE($4, description),
		    organization_type_id = COALESCE($5, organization_type_id),
		    instagram = COALESCE($6, instagram),
		    telegram_channel = COALESCE($7, telegram_channel),
		    telegram_chat = COALESCE($8, telegram_chat),
		    website = COALESCE($9, website),
		    youtube = COALESCE($10, youtube),
		    tiktok = COALESCE($11, tiktok),
		    linkedin = COALESCE($12, linkedin),
		    status = COALESCE($13, status),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, image_url, description, organization_type_id, instagram, telegram_channel, telegram_chat, website, youtube, tiktok, linkedin, status, created_at, updated_at
	`, id, updates["title"], updates["image_url"], updates["description"], updates["organization_type_id"], updates["instagram"], updates["telegram_channel"], updates["telegram_chat"], updates["website"], updates["youtube"], updates["tiktok"], updates["linkedin"], updates["status"]).
		Scan(&org.ID, &org.Title, &org.ImageURL, &org.Description, &org.OrganizationTypeID, &org.Instagram, &org.TelegramChannel, &org.TelegramChat, &org.Website, &org.YouTube, &org.TikTok, &org.LinkedIn, &org.Status, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update organization: %w", err)
	}
	return &org, nil
}

func (q *Queries) DeleteOrganization(ctx context.Context, id int32) (bool, error) {
	result, err := q.pool.Exec(ctx, `DELETE FROM organizations WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete organization: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

func (q *Queries) GetOrganizationsByUserRoles(ctx context.Context, userID int32, roles []string) ([]Organization, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT DISTINCT o.id, o.title, o.image_url, o.description, o.organization_type_id, o.instagram, o.telegram_channel, o.telegram_chat, o.website, o.youtube, o.tiktok, o.linkedin, o.status, o.created_at, o.updated_at
		FROM organizations o
		INNER JOIN user_roles ur ON ur.organization_id = o.id
		INNER JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1 AND r.name = ANY($2)
	`, userID, roles)
	if err != nil {
		return nil, fmt.Errorf("get organizations by user roles: %w", err)
	}
	defer rows.Close()

	var orgs []Organization
	for rows.Next() {
		var org Organization
		if err := rows.Scan(&org.ID, &org.Title, &org.ImageURL, &org.Description, &org.OrganizationTypeID, &org.Instagram, &org.TelegramChannel, &org.TelegramChat, &org.Website, &org.YouTube, &org.TikTok, &org.LinkedIn, &org.Status, &org.CreatedAt, &org.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan organization: %w", err)
		}
		orgs = append(orgs, org)
	}

	return orgs, nil
}

// ==================== Organization Types ====================

func (q *Queries) CreateOrganizationType(ctx context.Context, title string) (*OrganizationType, error) {
	var ot OrganizationType
	err := q.pool.QueryRow(ctx, `
		INSERT INTO organization_types (title)
		VALUES ($1)
		RETURNING id, title, created_at, updated_at
	`, title).Scan(&ot.ID, &ot.Title, &ot.CreatedAt, &ot.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create organization type: %w", err)
	}
	return &ot, nil
}

func (q *Queries) GetOrganizationType(ctx context.Context, id int32) (*OrganizationType, error) {
	var ot OrganizationType
	err := q.pool.QueryRow(ctx, `
		SELECT id, title, created_at, updated_at
		FROM organization_types WHERE id = $1
	`, id).Scan(&ot.ID, &ot.Title, &ot.CreatedAt, &ot.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization type: %w", err)
	}
	return &ot, nil
}

func (q *Queries) ListOrganizationTypes(ctx context.Context, limit, offset int32) ([]OrganizationType, int32, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, title, created_at, updated_at
		FROM organization_types
		ORDER BY id
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list organization types: %w", err)
	}
	defer rows.Close()

	var types []OrganizationType
	for rows.Next() {
		var ot OrganizationType
		if err := rows.Scan(&ot.ID, &ot.Title, &ot.CreatedAt, &ot.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan organization type: %w", err)
		}
		types = append(types, ot)
	}

	var total int32
	err = q.pool.QueryRow(ctx, `SELECT COUNT(*) FROM organization_types`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count organization types: %w", err)
	}

	return types, total, nil
}

func (q *Queries) UpdateOrganizationType(ctx context.Context, id int32, title *string) (*OrganizationType, error) {
	var ot OrganizationType
	err := q.pool.QueryRow(ctx, `
		UPDATE organization_types
		SET title = COALESCE($2, title),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, created_at, updated_at
	`, id, title).Scan(&ot.ID, &ot.Title, &ot.CreatedAt, &ot.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update organization type: %w", err)
	}
	return &ot, nil
}

func (q *Queries) DeleteOrganizationType(ctx context.Context, id int32) (bool, error) {
	result, err := q.pool.Exec(ctx, `DELETE FROM organization_types WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete organization type: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

// ==================== Tags ====================

func (q *Queries) CreateTag(ctx context.Context, name string) (*Tag, error) {
	var tag Tag
	err := q.pool.QueryRow(ctx, `
		INSERT INTO tags (name)
		VALUES ($1)
		RETURNING id, name, created_at, updated_at
	`, name).Scan(&tag.ID, &tag.Name, &tag.CreatedAt, &tag.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create tag: %w", err)
	}
	return &tag, nil
}

func (q *Queries) GetTag(ctx context.Context, id int32) (*Tag, error) {
	var tag Tag
	err := q.pool.QueryRow(ctx, `
		SELECT id, name, created_at, updated_at
		FROM tags WHERE id = $1
	`, id).Scan(&tag.ID, &tag.Name, &tag.CreatedAt, &tag.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get tag: %w", err)
	}
	return &tag, nil
}

func (q *Queries) ListTags(ctx context.Context, limit, offset int32) ([]Tag, int32, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, name, created_at, updated_at
		FROM tags
		ORDER BY id
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list tags: %w", err)
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.CreatedAt, &tag.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	var total int32
	err = q.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tags`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count tags: %w", err)
	}

	return tags, total, nil
}

func (q *Queries) UpdateTag(ctx context.Context, id int32, name *string) (*Tag, error) {
	var tag Tag
	err := q.pool.QueryRow(ctx, `
		UPDATE tags
		SET name = COALESCE($2, name),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, created_at, updated_at
	`, id, name).Scan(&tag.ID, &tag.Name, &tag.CreatedAt, &tag.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update tag: %w", err)
	}
	return &tag, nil
}

func (q *Queries) DeleteTag(ctx context.Context, id int32) (bool, error) {
	result, err := q.pool.Exec(ctx, `DELETE FROM tags WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete tag: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

// ==================== Events ====================

func (q *Queries) CreateEvent(ctx context.Context, event *Event, tagIDs []int32) (*Event, error) {
	tx, err := q.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `
		INSERT INTO events (title, description, image_url, user_id, organization_id, location, start_time, end_time, format)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'offline'))
		RETURNING id, title, description, image_url, user_id, organization_id, location, start_time, end_time, format, created_at, updated_at
	`, event.Title, event.Description, event.ImageURL, event.UserID, event.OrganizationID, event.Location, event.StartTime, event.EndTime, event.Format).
		Scan(&event.ID, &event.Title, &event.Description, &event.ImageURL, &event.UserID, &event.OrganizationID, &event.Location, &event.StartTime, &event.EndTime, &event.Format, &event.CreatedAt, &event.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert event: %w", err)
	}

	// Insert event tags
	for _, tagID := range tagIDs {
		_, err = tx.Exec(ctx, `INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2)`, event.ID, tagID)
		if err != nil {
			return nil, fmt.Errorf("insert event tag: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	return event, nil
}

func (q *Queries) GetEvent(ctx context.Context, id int32) (*Event, error) {
	var event Event
	err := q.pool.QueryRow(ctx, `
		SELECT id, title, description, image_url, user_id, organization_id, location, start_time, end_time, format, created_at, updated_at
		FROM events WHERE id = $1
	`, id).Scan(&event.ID, &event.Title, &event.Description, &event.ImageURL, &event.UserID, &event.OrganizationID, &event.Location, &event.StartTime, &event.EndTime, &event.Format, &event.CreatedAt, &event.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get event: %w", err)
	}
	return &event, nil
}

func (q *Queries) GetEventWithRelations(ctx context.Context, id int32) (*EventWithRelations, error) {
	event, err := q.GetEvent(ctx, id)
	if err != nil || event == nil {
		return nil, err
	}

	org, err := q.GetOrganization(ctx, event.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("get event organization: %w", err)
	}

	tags, err := q.GetEventTags(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get event tags: %w", err)
	}

	return &EventWithRelations{
		Event:        *event,
		Organization: org,
		Tags:         tags,
	}, nil
}

func (q *Queries) GetEventTags(ctx context.Context, eventID int32) ([]Tag, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT t.id, t.name, t.created_at, t.updated_at
		FROM tags t
		INNER JOIN event_tags et ON et.tag_id = t.id
		WHERE et.event_id = $1
	`, eventID)
	if err != nil {
		return nil, fmt.Errorf("get event tags: %w", err)
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.CreatedAt, &tag.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (q *Queries) GetEventTagIDs(ctx context.Context, eventID int32) ([]int32, error) {
	rows, err := q.pool.Query(ctx, `SELECT tag_id FROM event_tags WHERE event_id = $1`, eventID)
	if err != nil {
		return nil, fmt.Errorf("get event tag ids: %w", err)
	}
	defer rows.Close()

	var tagIDs []int32
	for rows.Next() {
		var tagID int32
		if err := rows.Scan(&tagID); err != nil {
			return nil, fmt.Errorf("scan tag id: %w", err)
		}
		tagIDs = append(tagIDs, tagID)
	}

	return tagIDs, nil
}

type ListEventsParams struct {
	UserID         *int32
	OrganizationID *int32
	TagIDs         []int32
	Limit          int32
	Offset         int32
}

func (q *Queries) ListEvents(ctx context.Context, params ListEventsParams) ([]EventWithRelations, int32, error) {
	// Build dynamic query
	query := `
		SELECT DISTINCT e.id, e.title, e.description, e.image_url, e.user_id, e.organization_id, e.location, e.start_time, e.end_time, e.format, e.created_at, e.updated_at
		FROM events e
		LEFT JOIN event_tags et ON et.event_id = e.id
		WHERE 1=1
	`
	countQuery := `
		SELECT COUNT(DISTINCT e.id)
		FROM events e
		LEFT JOIN event_tags et ON et.event_id = e.id
		WHERE 1=1
	`

	var args []interface{}
	argNum := 1

	if params.UserID != nil {
		query += fmt.Sprintf(" AND e.user_id = $%d", argNum)
		countQuery += fmt.Sprintf(" AND e.user_id = $%d", argNum)
		args = append(args, *params.UserID)
		argNum++
	}

	if params.OrganizationID != nil {
		query += fmt.Sprintf(" AND e.organization_id = $%d", argNum)
		countQuery += fmt.Sprintf(" AND e.organization_id = $%d", argNum)
		args = append(args, *params.OrganizationID)
		argNum++
	}

	if len(params.TagIDs) > 0 {
		query += fmt.Sprintf(" AND et.tag_id = ANY($%d)", argNum)
		countQuery += fmt.Sprintf(" AND et.tag_id = ANY($%d)", argNum)
		args = append(args, params.TagIDs)
		argNum++
	}

	query += fmt.Sprintf(" ORDER BY e.id LIMIT $%d OFFSET $%d", argNum, argNum+1)
	args = append(args, params.Limit, params.Offset)

	rows, err := q.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()

	var events []EventWithRelations
	for rows.Next() {
		var e EventWithRelations
		if err := rows.Scan(&e.ID, &e.Title, &e.Description, &e.ImageURL, &e.UserID, &e.OrganizationID, &e.Location, &e.StartTime, &e.EndTime, &e.Format, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan event: %w", err)
		}
		events = append(events, e)
	}

	// Load relations for each event
	for i := range events {
		org, err := q.GetOrganization(ctx, events[i].OrganizationID)
		if err != nil {
			return nil, 0, fmt.Errorf("get event organization: %w", err)
		}
		events[i].Organization = org

		tags, err := q.GetEventTags(ctx, events[i].ID)
		if err != nil {
			return nil, 0, fmt.Errorf("get event tags: %w", err)
		}
		events[i].Tags = tags
	}

	// Get total count
	countArgs := args[:len(args)-2] // Remove limit and offset
	var total int32
	err = q.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count events: %w", err)
	}

	return events, total, nil
}

func (q *Queries) UpdateEvent(ctx context.Context, id int32, updates map[string]interface{}, tagIDs []int32) (*Event, error) {
	tx, err := q.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var event Event
	err = tx.QueryRow(ctx, `
		UPDATE events
		SET title = COALESCE($2, title),
		    description = COALESCE($3, description),
		    image_url = COALESCE($4, image_url),
		    user_id = COALESCE($5, user_id),
		    organization_id = COALESCE($6, organization_id),
		    location = COALESCE($7, location),
		    start_time = COALESCE($8, start_time),
		    end_time = COALESCE($9, end_time),
		    format = COALESCE($10, format),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, description, image_url, user_id, organization_id, location, start_time, end_time, format, created_at, updated_at
	`, id, updates["title"], updates["description"], updates["image_url"], updates["user_id"], updates["organization_id"], updates["location"], updates["start_time"], updates["end_time"], updates["format"]).
		Scan(&event.ID, &event.Title, &event.Description, &event.ImageURL, &event.UserID, &event.OrganizationID, &event.Location, &event.StartTime, &event.EndTime, &event.Format, &event.CreatedAt, &event.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update event: %w", err)
	}

	// Update tags if provided
	if tagIDs != nil {
		_, err = tx.Exec(ctx, `DELETE FROM event_tags WHERE event_id = $1`, id)
		if err != nil {
			return nil, fmt.Errorf("delete event tags: %w", err)
		}

		for _, tagID := range tagIDs {
			_, err = tx.Exec(ctx, `INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2)`, id, tagID)
			if err != nil {
				return nil, fmt.Errorf("insert event tag: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	return &event, nil
}

func (q *Queries) DeleteEvent(ctx context.Context, id int32) (bool, error) {
	result, err := q.pool.Exec(ctx, `DELETE FROM events WHERE id = $1`, id)
	if err != nil {
		return false, fmt.Errorf("delete event: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

func (q *Queries) GetEventsByTagID(ctx context.Context, tagID int32) ([]EventWithRelations, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT e.id, e.title, e.description, e.image_url, e.user_id, e.organization_id, e.location, e.start_time, e.end_time, e.format, e.created_at, e.updated_at
		FROM events e
		INNER JOIN event_tags et ON et.event_id = e.id
		WHERE et.tag_id = $1
	`, tagID)
	if err != nil {
		return nil, fmt.Errorf("get events by tag: %w", err)
	}
	defer rows.Close()

	var events []EventWithRelations
	for rows.Next() {
		var e EventWithRelations
		if err := rows.Scan(&e.ID, &e.Title, &e.Description, &e.ImageURL, &e.UserID, &e.OrganizationID, &e.Location, &e.StartTime, &e.EndTime, &e.Format, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		events = append(events, e)
	}

	// Load relations
	for i := range events {
		org, _ := q.GetOrganization(ctx, events[i].OrganizationID)
		events[i].Organization = org
		tags, _ := q.GetEventTags(ctx, events[i].ID)
		events[i].Tags = tags
	}

	return events, nil
}

// ==================== Event Registrations ====================

func (q *Queries) CreateEventRegistration(ctx context.Context, eventID, userID int32) (*EventRegistration, error) {
	var reg EventRegistration
	err := q.pool.QueryRow(ctx, `
		INSERT INTO event_registrations (event_id, user_id, status, registered_at)
		VALUES ($1, $2, 'registered', NOW())
		RETURNING id, event_id, user_id, status, registered_at, cancelled_at, created_at, updated_at
	`, eventID, userID).Scan(&reg.ID, &reg.EventID, &reg.UserID, &reg.Status, &reg.RegisteredAt, &reg.CancelledAt, &reg.CreatedAt, &reg.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create event registration: %w", err)
	}
	return &reg, nil
}

func (q *Queries) GetEventRegistration(ctx context.Context, id int32) (*EventRegistration, error) {
	var reg EventRegistration
	err := q.pool.QueryRow(ctx, `
		SELECT id, event_id, user_id, status, registered_at, cancelled_at, created_at, updated_at
		FROM event_registrations WHERE id = $1
	`, id).Scan(&reg.ID, &reg.EventID, &reg.UserID, &reg.Status, &reg.RegisteredAt, &reg.CancelledAt, &reg.CreatedAt, &reg.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get event registration: %w", err)
	}
	return &reg, nil
}

func (q *Queries) GetEventRegistrationByEventAndUser(ctx context.Context, eventID, userID int32) (*EventRegistration, error) {
	var reg EventRegistration
	err := q.pool.QueryRow(ctx, `
		SELECT id, event_id, user_id, status, registered_at, cancelled_at, created_at, updated_at
		FROM event_registrations WHERE event_id = $1 AND user_id = $2
	`, eventID, userID).Scan(&reg.ID, &reg.EventID, &reg.UserID, &reg.Status, &reg.RegisteredAt, &reg.CancelledAt, &reg.CreatedAt, &reg.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get event registration: %w", err)
	}
	return &reg, nil
}

func (q *Queries) CancelEventRegistration(ctx context.Context, id int32) error {
	_, err := q.pool.Exec(ctx, `
		UPDATE event_registrations
		SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		return fmt.Errorf("cancel event registration: %w", err)
	}
	return nil
}

func (q *Queries) GetEventRegistrations(ctx context.Context, eventID int32, limit, offset int32) ([]EventRegistration, int32, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, event_id, user_id, status, registered_at, cancelled_at, created_at, updated_at
		FROM event_registrations
		WHERE event_id = $1
		ORDER BY registered_at DESC
		LIMIT $2 OFFSET $3
	`, eventID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("get event registrations: %w", err)
	}
	defer rows.Close()

	var regs []EventRegistration
	for rows.Next() {
		var reg EventRegistration
		if err := rows.Scan(&reg.ID, &reg.EventID, &reg.UserID, &reg.Status, &reg.RegisteredAt, &reg.CancelledAt, &reg.CreatedAt, &reg.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan registration: %w", err)
		}
		regs = append(regs, reg)
	}

	var total int32
	err = q.pool.QueryRow(ctx, `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1`, eventID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count registrations: %w", err)
	}

	return regs, total, nil
}

func (q *Queries) GetUserRegistrations(ctx context.Context, userID int32) ([]EventRegistration, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT id, event_id, user_id, status, registered_at, cancelled_at, created_at, updated_at
		FROM event_registrations
		WHERE user_id = $1
		ORDER BY registered_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get user registrations: %w", err)
	}
	defer rows.Close()

	var regs []EventRegistration
	for rows.Next() {
		var reg EventRegistration
		if err := rows.Scan(&reg.ID, &reg.EventID, &reg.UserID, &reg.Status, &reg.RegisteredAt, &reg.CancelledAt, &reg.CreatedAt, &reg.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan registration: %w", err)
		}
		regs = append(regs, reg)
	}

	return regs, nil
}

// ==================== Event Attendance ====================

func (q *Queries) CreateEventAttendance(ctx context.Context, registrationID int32, status string, checkedInBy *int32, notes *string) (*EventAttendance, error) {
	var att EventAttendance
	var checkedInAt interface{}
	if status == "checked_in" || status == "attended" {
		checkedInAt = "NOW()"
	}

	err := q.pool.QueryRow(ctx, `
		INSERT INTO event_attendance (registration_id, status, checked_in_at, checked_in_by, notes)
		VALUES ($1, $2, CASE WHEN $3 THEN NOW() ELSE NULL END, $4, $5)
		RETURNING id, registration_id, status, checked_in_at, checked_in_by, notes, created_at, updated_at
	`, registrationID, status, checkedInAt != nil, checkedInBy, notes).
		Scan(&att.ID, &att.RegistrationID, &att.Status, &att.CheckedInAt, &att.CheckedInBy, &att.Notes, &att.CreatedAt, &att.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create event attendance: %w", err)
	}
	return &att, nil
}

func (q *Queries) UpdateEventAttendance(ctx context.Context, registrationID int32, status string, notes *string) (*EventAttendance, error) {
	var att EventAttendance
	err := q.pool.QueryRow(ctx, `
		UPDATE event_attendance
		SET status = $2, notes = COALESCE($3, notes), updated_at = NOW()
		WHERE registration_id = $1
		RETURNING id, registration_id, status, checked_in_at, checked_in_by, notes, created_at, updated_at
	`, registrationID, status, notes).Scan(&att.ID, &att.RegistrationID, &att.Status, &att.CheckedInAt, &att.CheckedInBy, &att.Notes, &att.CreatedAt, &att.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update event attendance: %w", err)
	}
	return &att, nil
}

func (q *Queries) GetEventAttendanceByRegistration(ctx context.Context, registrationID int32) (*EventAttendance, error) {
	var att EventAttendance
	err := q.pool.QueryRow(ctx, `
		SELECT id, registration_id, status, checked_in_at, checked_in_by, notes, created_at, updated_at
		FROM event_attendance WHERE registration_id = $1
	`, registrationID).Scan(&att.ID, &att.RegistrationID, &att.Status, &att.CheckedInAt, &att.CheckedInBy, &att.Notes, &att.CreatedAt, &att.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get event attendance: %w", err)
	}
	return &att, nil
}

type EventAttendanceStats struct {
	TotalRegistered int32
	TotalAttended   int32
	TotalNoShow     int32
	Attendance      []EventAttendance
}

func (q *Queries) GetEventAttendance(ctx context.Context, eventID int32) (*EventAttendanceStats, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT ea.id, ea.registration_id, ea.status, ea.checked_in_at, ea.checked_in_by, ea.notes, ea.created_at, ea.updated_at
		FROM event_attendance ea
		INNER JOIN event_registrations er ON er.id = ea.registration_id
		WHERE er.event_id = $1
	`, eventID)
	if err != nil {
		return nil, fmt.Errorf("get event attendance: %w", err)
	}
	defer rows.Close()

	var attendance []EventAttendance
	for rows.Next() {
		var att EventAttendance
		if err := rows.Scan(&att.ID, &att.RegistrationID, &att.Status, &att.CheckedInAt, &att.CheckedInBy, &att.Notes, &att.CreatedAt, &att.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan attendance: %w", err)
		}
		attendance = append(attendance, att)
	}

	var totalRegistered, totalAttended, totalNoShow int32
	err = q.pool.QueryRow(ctx, `
		SELECT 
			COUNT(*) FILTER (WHERE er.status = 'registered'),
			COUNT(*) FILTER (WHERE ea.status = 'attended'),
			COUNT(*) FILTER (WHERE ea.status = 'no_show')
		FROM event_registrations er
		LEFT JOIN event_attendance ea ON ea.registration_id = er.id
		WHERE er.event_id = $1
	`, eventID).Scan(&totalRegistered, &totalAttended, &totalNoShow)
	if err != nil {
		return nil, fmt.Errorf("get attendance stats: %w", err)
	}

	return &EventAttendanceStats{
		TotalRegistered: totalRegistered,
		TotalAttended:   totalAttended,
		TotalNoShow:     totalNoShow,
		Attendance:      attendance,
	}, nil
}
