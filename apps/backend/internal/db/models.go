package db

import (
	"database/sql"
	"time"
)

// Database models - maintaining int32 IDs for protobuf compatibility
// Will migrate to UUID strings when proto definitions are updated

// User - synced from Ory Kratos identity
// Note: ID is int32 now, will add kratos_id column for UUID later
type User struct {
	ID        int32          `db:"id" json:"id"`
	Username  string         `db:"username" json:"username"`
	Email     string         `db:"email" json:"email"`
	Password  string         `db:"password" json:"password"`
	KratosID  sql.NullString `db:"kratos_id" json:"kratos_id,omitempty"` // UUID from Kratos for auth
	CreatedAt time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt time.Time      `db:"updated_at" json:"updated_at"`
}

// Organization (Club) - the main organizational unit
type Organization struct {
	ID                 int32          `db:"id" json:"id"`
	Title              string         `db:"title" json:"title"`
	Description        sql.NullString `db:"description" json:"description,omitempty"`
	ImageURL           sql.NullString `db:"image_url" json:"image_url,omitempty"`
	OrganizationTypeID int32          `db:"organization_type_id" json:"organization_type_id"`
	Instagram          sql.NullString `db:"instagram" json:"instagram,omitempty"`
	TelegramChannel    sql.NullString `db:"telegram_channel" json:"telegram_channel,omitempty"`
	TelegramChat       sql.NullString `db:"telegram_chat" json:"telegram_chat,omitempty"`
	Website            sql.NullString `db:"website" json:"website,omitempty"`
	YouTube            sql.NullString `db:"youtube" json:"youtube,omitempty"`
	TikTok             sql.NullString `db:"tiktok" json:"tiktok,omitempty"`
	LinkedIn           sql.NullString `db:"linkedin" json:"linkedin,omitempty"`
	Status             string         `db:"status" json:"status"` // 'active', 'archived', 'frozen'
	CreatedAt          time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time      `db:"updated_at" json:"updated_at"`
}

// OrganizationType - classification of organizations
type OrganizationType struct {
	ID        int32     `db:"id" json:"id"`
	Title     string    `db:"title" json:"title"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Event - an event hosted by an organization
type Event struct {
	ID             int32          `db:"id" json:"id"`
	Title          string         `db:"title" json:"title"`
	Description    string         `db:"description" json:"description"`
	ImageURL       sql.NullString `db:"image_url" json:"image_url,omitempty"`
	UserID         int32          `db:"user_id" json:"user_id"` // Creator of the event
	OrganizationID int32          `db:"organization_id" json:"organization_id"`
	Location       string         `db:"location" json:"location"`
	StartTime      time.Time      `db:"start_time" json:"start_time"`
	EndTime        time.Time      `db:"end_time" json:"end_time"`
	Format         string         `db:"format" json:"format"` // 'online', 'offline'
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

// EventWithRelations includes organization and tags
type EventWithRelations struct {
	Event
	Organization *Organization `json:"organization,omitempty"`
	Tags         []Tag         `json:"tags,omitempty"`
}

// Tag - event categorization
type Tag struct {
	ID        int32     `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// EventTag - many-to-many relationship between events and tags
type EventTag struct {
	EventID int32 `db:"event_id" json:"event_id"`
	TagID   int32 `db:"tag_id" json:"tag_id"`
}

// Role - role definitions for organizations
type Role struct {
	ID        int32     `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"` // 'president', 'member', 'moderator'
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// UserRole - user's role within an organization
type UserRole struct {
	ID             int32 `db:"id" json:"id"`
	UserID         int32 `db:"user_id" json:"user_id"`
	OrganizationID int32 `db:"organization_id" json:"organization_id"`
	RoleID         int32 `db:"role_id" json:"role_id"`
}

// EventRegistration - user registration for an event
type EventRegistration struct {
	ID           int32        `db:"id" json:"id"`
	EventID      int32        `db:"event_id" json:"event_id"`
	UserID       int32        `db:"user_id" json:"user_id"`
	Status       string       `db:"status" json:"status"` // 'registered', 'cancelled', 'waitlist'
	RegisteredAt time.Time    `db:"registered_at" json:"registered_at"`
	CancelledAt  sql.NullTime `db:"cancelled_at" json:"cancelled_at,omitempty"`
	CreatedAt    time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time    `db:"updated_at" json:"updated_at"`
}

// EventAttendance - tracks actual attendance for registrations
type EventAttendance struct {
	ID             int32          `db:"id" json:"id"`
	RegistrationID int32          `db:"registration_id" json:"registration_id"`
	Status         string         `db:"status" json:"status"` // 'attended', 'no_show', 'checked_in'
	CheckedInAt    sql.NullTime   `db:"checked_in_at" json:"checked_in_at,omitempty"`
	CheckedInBy    sql.NullInt32  `db:"checked_in_by" json:"checked_in_by,omitempty"`
	Notes          sql.NullString `db:"notes" json:"notes,omitempty"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

// ========== Helper Types for Auth/Perms ==========

// UserPermissions represents computed permissions for a user (from SpiceDB)
type UserPermissions struct {
	UserID        string   `json:"user_id"`         // Kratos UUID
	IsAdmin       bool     `json:"is_admin"`        // Platform admin
	IsGlobalStaff bool     `json:"is_global_staff"` // Platform staff
	ManagedClubs  []string `json:"managed_clubs"`   // Club IDs where user is president
}

// OrganizationWithRelations includes type info
type OrganizationWithRelations struct {
	Organization
	OrganizationType *OrganizationType `json:"organization_type,omitempty"`
}

// RegistrationWithDetails includes event and user info
type RegistrationWithDetails struct {
	EventRegistration
	Event *Event `json:"event,omitempty"`
	User  *User  `json:"user,omitempty"`
}
