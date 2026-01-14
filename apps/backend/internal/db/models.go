package db

import (
	"database/sql"
	"time"
)

// Database models matching the Drizzle schema

type User struct {
	ID        int32
	Username  string
	Email     string
	Password  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Organization struct {
	ID                 int32
	Title              string
	ImageURL           sql.NullString
	Description        sql.NullString
	OrganizationTypeID int32
	Instagram          sql.NullString
	TelegramChannel    sql.NullString
	TelegramChat       sql.NullString
	Website            sql.NullString
	YouTube            sql.NullString
	TikTok             sql.NullString
	LinkedIn           sql.NullString
	Status             string // 'active', 'archived', 'frozen'
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type OrganizationType struct {
	ID        int32
	Title     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Event struct {
	ID             int32
	Title          string
	Description    string
	ImageURL       sql.NullString
	UserID         int32
	OrganizationID int32
	Location       string
	StartTime      time.Time
	EndTime        time.Time
	Format         string // 'online', 'offline'
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Tag struct {
	ID        int32
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type EventTag struct {
	EventID int32
	TagID   int32
}

type Role struct {
	ID        int32
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UserRole struct {
	ID             int32
	UserID         int32
	OrganizationID int32
	RoleID         int32
}

type EventRegistration struct {
	ID           int32
	EventID      int32
	UserID       int32
	Status       string // 'registered', 'cancelled', 'waitlist'
	RegisteredAt time.Time
	CancelledAt  sql.NullTime
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type EventAttendance struct {
	ID             int32
	RegistrationID int32
	Status         string // 'attended', 'no_show', 'checked_in'
	CheckedInAt    sql.NullTime
	CheckedInBy    sql.NullInt32
	Notes          sql.NullString
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Extended models with relations

type EventWithRelations struct {
	Event
	Organization *Organization
	Tags         []Tag
}
