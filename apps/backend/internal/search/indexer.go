package search

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/studyverse/ems-backend/internal/db"
)

// Indexer handles the indexing of database entities into Meilisearch
type Indexer struct {
	client  *Client
	queries *db.Queries
}

// NewIndexer creates a new search indexer
func NewIndexer(client *Client, queries *db.Queries) *Indexer {
	return &Indexer{
		client:  client,
		queries: queries,
	}
}

// ReindexResult contains the results of a reindex operation
type ReindexResult struct {
	EventsIndexed        int
	OrganizationsIndexed int
	UsersIndexed         int
	TagsIndexed          int
	Errors               []error
}

// ReindexAll reindexes all entities from the database
func (i *Indexer) ReindexAll(ctx context.Context) (*ReindexResult, error) {
	result := &ReindexResult{}

	// Reindex events
	eventsCount, err := i.ReindexEvents(ctx)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("events: %w", err))
	}
	result.EventsIndexed = eventsCount

	// Reindex organizations
	orgsCount, err := i.ReindexOrganizations(ctx)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("organizations: %w", err))
	}
	result.OrganizationsIndexed = orgsCount

	// Reindex users
	usersCount, err := i.ReindexUsers(ctx)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("users: %w", err))
	}
	result.UsersIndexed = usersCount

	// Reindex tags
	tagsCount, err := i.ReindexTags(ctx)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("tags: %w", err))
	}
	result.TagsIndexed = tagsCount

	slog.Info("Reindex completed",
		"events", result.EventsIndexed,
		"organizations", result.OrganizationsIndexed,
		"users", result.UsersIndexed,
		"tags", result.TagsIndexed,
		"errors", len(result.Errors),
	)

	return result, nil
}

// ReindexEvents reindexes all events
func (i *Indexer) ReindexEvents(ctx context.Context) (int, error) {
	// Get all events with pagination to avoid memory issues
	const batchSize = 100
	var allDocs []EventDocument
	offset := int32(0)

	for {
		events, err := i.queries.ListEvents(ctx, db.ListEventsParams{
			Limit:  batchSize,
			Offset: offset,
		})
		if err != nil {
			return 0, fmt.Errorf("failed to list events: %w", err)
		}

		if len(events) == 0 {
			break
		}

		for _, event := range events {
			// Get organization title
			org, _ := i.queries.GetOrganization(ctx, event.OrganizationID)
			orgTitle := ""
			if org.ID != 0 {
				orgTitle = org.Title
			}

			// Get tags
			tags, _ := i.queries.GetEventTags(ctx, event.ID)
			tagNames := make([]string, len(tags))
			tagIds := make([]int32, len(tags))
			for j, t := range tags {
				tagNames[j] = t.Name
				tagIds[j] = t.ID
			}

			format := "offline"
			if event.Format.Valid && event.Format.Format == db.FormatOnline {
				format = "online"
			}

			imageURL := ""
			if event.ImageUrl.Valid {
				imageURL = event.ImageUrl.String
			}

			doc := EventDocument{
				ID:                event.ID,
				Title:             event.Title,
				Description:       event.Description,
				Location:          event.Location,
				ImageURL:          imageURL,
				OrganizationID:    event.OrganizationID,
				OrganizationTitle: orgTitle,
				Format:            format,
				StartTime:         event.StartTime.Time.Format("2006-01-02T15:04:05Z07:00"),
				EndTime:           event.EndTime.Time.Format("2006-01-02T15:04:05Z07:00"),
				TagIds:            tagIds,
				Tags:              tagNames,
				CreatedAt:         event.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			allDocs = append(allDocs, doc)
		}

		offset += int32(len(events))
		if len(events) < batchSize {
			break
		}
	}

	if len(allDocs) > 0 {
		if err := i.client.IndexEvents(ctx, allDocs); err != nil {
			return 0, fmt.Errorf("failed to index events: %w", err)
		}
	}

	slog.Info("Reindexed events", "count", len(allDocs))
	return len(allDocs), nil
}

// ReindexOrganizations reindexes all organizations
func (i *Indexer) ReindexOrganizations(ctx context.Context) (int, error) {
	const batchSize = 100
	var allDocs []OrganizationDocument
	offset := int32(0)

	for {
		orgs, err := i.queries.ListOrganizations(ctx, db.ListOrganizationsParams{
			Limit:  batchSize,
			Offset: offset,
		})
		if err != nil {
			return 0, fmt.Errorf("failed to list organizations: %w", err)
		}

		if len(orgs) == 0 {
			break
		}

		for _, org := range orgs {
			status := "active"
			if org.Status.Valid {
				status = string(org.Status.OrganizationStatus)
			}

			description := ""
			if org.Description.Valid {
				description = org.Description.String
			}

			imageURL := ""
			if org.ImageUrl.Valid {
				imageURL = org.ImageUrl.String
			}

			doc := OrganizationDocument{
				ID:                 org.ID,
				Title:              org.Title,
				Description:        description,
				ImageURL:           imageURL,
				OrganizationTypeID: org.OrganizationTypeID,
				Status:             status,
				CreatedAt:          org.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			allDocs = append(allDocs, doc)
		}

		offset += int32(len(orgs))
		if len(orgs) < batchSize {
			break
		}
	}

	if len(allDocs) > 0 {
		if err := i.client.IndexOrganizations(ctx, allDocs); err != nil {
			return 0, fmt.Errorf("failed to index organizations: %w", err)
		}
	}

	slog.Info("Reindexed organizations", "count", len(allDocs))
	return len(allDocs), nil
}

// ReindexUsers reindexes all users
func (i *Indexer) ReindexUsers(ctx context.Context) (int, error) {
	const batchSize = 100
	var allDocs []UserDocument
	offset := int32(0)

	for {
		users, err := i.queries.ListUsers(ctx, db.ListUsersParams{
			Limit:  batchSize,
			Offset: offset,
		})
		if err != nil {
			return 0, fmt.Errorf("failed to list users: %w", err)
		}

		if len(users) == 0 {
			break
		}

		for _, user := range users {
			doc := UserDocument{
				ID:        user.ID,
				Username:  user.Username,
				Email:     user.Email,
				CreatedAt: user.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			allDocs = append(allDocs, doc)
		}

		offset += int32(len(users))
		if len(users) < batchSize {
			break
		}
	}

	if len(allDocs) > 0 {
		if err := i.client.IndexUsers(ctx, allDocs); err != nil {
			return 0, fmt.Errorf("failed to index users: %w", err)
		}
	}

	slog.Info("Reindexed users", "count", len(allDocs))
	return len(allDocs), nil
}

// ReindexTags reindexes all tags
func (i *Indexer) ReindexTags(ctx context.Context) (int, error) {
	const batchSize = 100
	var allDocs []TagDocument
	offset := int32(0)

	for {
		tags, err := i.queries.ListTags(ctx, db.ListTagsParams{
			Limit:  batchSize,
			Offset: offset,
		})
		if err != nil {
			return 0, fmt.Errorf("failed to list tags: %w", err)
		}

		if len(tags) == 0 {
			break
		}

		for _, tag := range tags {
			doc := TagDocument{
				ID:        tag.ID,
				Name:      tag.Name,
				CreatedAt: tag.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			allDocs = append(allDocs, doc)
		}

		offset += int32(len(tags))
		if len(tags) < batchSize {
			break
		}
	}

	if len(allDocs) > 0 {
		if err := i.client.IndexTags(ctx, allDocs); err != nil {
			return 0, fmt.Errorf("failed to index tags: %w", err)
		}
	}

	slog.Info("Reindexed tags", "count", len(allDocs))
	return len(allDocs), nil
}
