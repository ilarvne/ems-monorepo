package services

import (
	"context"
	"log/slog"

	"connectrpc.com/connect"
	eventsv1 "github.com/studyverse/ems-backend/gen/eventsv1"
	"github.com/studyverse/ems-backend/gen/eventsv1/eventsv1connect"
	"github.com/studyverse/ems-backend/internal/db"
)

type TagsService struct {
	eventsv1connect.UnimplementedTagsServiceHandler
	queries *db.Queries
}

func NewTagsService(queries *db.Queries) *TagsService {
	return &TagsService{queries: queries}
}

func (s *TagsService) CreateTag(ctx context.Context, req *connect.Request[eventsv1.CreateTagRequest]) (*connect.Response[eventsv1.CreateTagResponse], error) {
	slog.Info("CreateTag", "name", req.Msg.Name)

	tag, err := s.queries.CreateTag(ctx, req.Msg.Name)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.CreateTagResponse{
		Tag: dbTagToProto(tag),
	}), nil
}

func (s *TagsService) GetTag(ctx context.Context, req *connect.Request[eventsv1.GetTagRequest]) (*connect.Response[eventsv1.GetTagResponse], error) {
	slog.Info("GetTag", "id", req.Msg.Id)

	tag, err := s.queries.GetTag(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if tag == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&eventsv1.GetTagResponse{
		Tag: dbTagToProto(tag),
	}), nil
}

func (s *TagsService) ListTags(ctx context.Context, req *connect.Request[eventsv1.ListTagsRequest]) (*connect.Response[eventsv1.ListTagsResponse], error) {
	slog.Info("ListTags", "page", req.Msg.Page, "limit", req.Msg.Limit)

	page := req.Msg.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	tags, total, err := s.queries.ListTags(ctx, limit, (page-1)*limit)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	protoTags := make([]*eventsv1.Tag, len(tags))
	for i, t := range tags {
		protoTags[i] = dbTagToProto(&t)
	}

	return connect.NewResponse(&eventsv1.ListTagsResponse{
		Tags:  protoTags,
		Total: total,
	}), nil
}

func (s *TagsService) UpdateTag(ctx context.Context, req *connect.Request[eventsv1.UpdateTagRequest]) (*connect.Response[eventsv1.UpdateTagResponse], error) {
	slog.Info("UpdateTag", "id", req.Msg.Id)

	tag, err := s.queries.UpdateTag(ctx, req.Msg.Id, req.Msg.Name)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	if tag == nil {
		return nil, connect.NewError(connect.CodeNotFound, nil)
	}

	return connect.NewResponse(&eventsv1.UpdateTagResponse{
		Tag: dbTagToProto(tag),
	}), nil
}

func (s *TagsService) DeleteTag(ctx context.Context, req *connect.Request[eventsv1.DeleteTagRequest]) (*connect.Response[eventsv1.DeleteTagResponse], error) {
	slog.Info("DeleteTag", "id", req.Msg.Id)

	success, err := s.queries.DeleteTag(ctx, req.Msg.Id)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&eventsv1.DeleteTagResponse{
		Success: success,
	}), nil
}
