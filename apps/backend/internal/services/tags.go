package services

import (
	"context"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/auth"
	"github.com/studyverse/ems-backend/internal/db"
	"github.com/studyverse/ems-backend/internal/perms"
	"github.com/studyverse/ems-backend/internal/search"
)

type TagsService struct {
	eventsv1connect.UnimplementedTagsServiceHandler
	queries *db.Queries
	perms   *perms.Client
	search  *search.Client
}

func NewTagsService(queries *db.Queries, permsClient *perms.Client, searchClient *search.Client) *TagsService {
	return &TagsService{queries: queries, perms: permsClient, search: searchClient}
}

func (s *TagsService) CreateTag(ctx context.Context, req *connect.Request[eventsv1.CreateTagRequest]) (*connect.Response[eventsv1.CreateTagResponse], error) {
	slog.Debug("CreateTag", "name", req.Msg.Name)

	// Authorization: Only platform staff can create tags
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		allowed, err := s.perms.CheckPermission(ctx, userID, "platform", "astanait", "manage_clubs")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to create tags"))
		}
	}

	tag, err := s.queries.CreateTag(ctx, req.Msg.Name)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Index tag in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			doc := &search.TagDocument{
				ID:        tag.ID,
				Name:      tag.Name,
				CreatedAt: tag.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			if err := s.search.IndexTag(context.Background(), doc); err != nil {
				slog.Warn("Failed to index tag in search", "error", err, "tagId", tag.ID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.CreateTagResponse{
		Tag: dbTagToProto(&tag),
	}), nil
}

func (s *TagsService) GetTag(ctx context.Context, req *connect.Request[eventsv1.GetTagRequest]) (*connect.Response[eventsv1.GetTagResponse], error) {
	slog.Debug("GetTag", "id", req.Msg.Id)

	tag, err := s.queries.GetTag(ctx, req.Msg.Id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.GetTagResponse{
		Tag: dbTagToProto(&tag),
	}), nil
}

func (s *TagsService) ListTags(ctx context.Context, req *connect.Request[eventsv1.ListTagsRequest]) (*connect.Response[eventsv1.ListTagsResponse], error) {
	slog.Debug("ListTags", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	tags, err := s.queries.ListTags(ctx, db.ListTagsParams{
		Limit:  limit,
		Offset: (page - 1) * limit,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	total, err := s.queries.CountTags(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoTags := make([]*eventsv1.Tag, len(tags))
	for i, t := range tags {
		protoTags[i] = dbTagToProto(&t)
	}

	return connect.NewResponse(&eventsv1.ListTagsResponse{
		Tags:  protoTags,
		Total: int32(total),
	}), nil
}

func (s *TagsService) UpdateTag(ctx context.Context, req *connect.Request[eventsv1.UpdateTagRequest]) (*connect.Response[eventsv1.UpdateTagResponse], error) {
	slog.Debug("UpdateTag", "id", req.Msg.Id)

	// Authorization: Only platform staff can update tags
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		allowed, err := s.perms.CheckPermission(ctx, userID, "platform", "astanait", "manage_clubs")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to update tags"))
		}
	}

	params := db.UpdateTagParams{
		ID: req.Msg.Id,
	}
	if req.Msg.Name != nil {
		params.Name = pgtype.Text{String: *req.Msg.Name, Valid: true}
	}

	tag, err := s.queries.UpdateTag(ctx, params)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, connect.NewError(connect.CodeNotFound, nil)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Re-index tag in Meilisearch (async, don't block response)
	if s.search != nil {
		go func() {
			doc := &search.TagDocument{
				ID:        tag.ID,
				Name:      tag.Name,
				CreatedAt: tag.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			}
			if err := s.search.IndexTag(context.Background(), doc); err != nil {
				slog.Warn("Failed to re-index tag in search", "error", err, "tagId", tag.ID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.UpdateTagResponse{
		Tag: dbTagToProto(&tag),
	}), nil
}

func (s *TagsService) DeleteTag(ctx context.Context, req *connect.Request[eventsv1.DeleteTagRequest]) (*connect.Response[eventsv1.DeleteTagResponse], error) {
	slog.Debug("DeleteTag", "id", req.Msg.Id)

	// Authorization: Only platform staff can delete tags
	userID := auth.GetUserID(ctx)
	if userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}

	if s.perms != nil {
		allowed, err := s.perms.CheckPermission(ctx, userID, "platform", "astanait", "manage_clubs")
		if err != nil {
			slog.Warn("Permission check failed", "error", err)
		}
		if !allowed {
			return nil, connect.NewError(connect.CodePermissionDenied, fmt.Errorf("you don't have permission to delete tags"))
		}
	}

	err := s.queries.DeleteTag(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Remove tag from Meilisearch (async, don't block response)
	if s.search != nil {
		tagID := req.Msg.Id
		go func() {
			if err := s.search.DeleteDocument(context.Background(), search.IndexTags, tagID); err != nil {
				slog.Warn("Failed to delete tag from search", "error", err, "tagId", tagID)
			}
		}()
	}

	return connect.NewResponse(&eventsv1.DeleteTagResponse{
		Success: true,
	}), nil
}
