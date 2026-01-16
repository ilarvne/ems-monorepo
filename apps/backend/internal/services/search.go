package services

import (
	"context"
	"fmt"
	"log/slog"

	"connectrpc.com/connect"
	searchv1 "github.com/studyverse/ems-backend/gen/searchv1"
	"github.com/studyverse/ems-backend/gen/searchv1/searchv1connect"
	"github.com/studyverse/ems-backend/internal/db"
	"github.com/studyverse/ems-backend/internal/search"
)

type SearchService struct {
	searchv1connect.UnimplementedSearchServiceHandler
	searchClient  *search.Client
	searchIndexer *search.Indexer
	queries       *db.Queries
}

func NewSearchService(searchClient *search.Client, queries *db.Queries) *SearchService {
	var indexer *search.Indexer
	if searchClient != nil {
		indexer = search.NewIndexer(searchClient, queries)
	}
	return &SearchService{
		searchClient:  searchClient,
		searchIndexer: indexer,
		queries:       queries,
	}
}

func (s *SearchService) GlobalSearch(ctx context.Context, req *connect.Request[searchv1.GlobalSearchRequest]) (*connect.Response[searchv1.GlobalSearchResponse], error) {
	slog.Debug("GlobalSearch", "query", req.Msg.Query, "limit", req.Msg.Limit)

	if s.searchClient == nil {
		return nil, connect.NewError(connect.CodeUnavailable, fmt.Errorf("search service not available"))
	}

	if req.Msg.Query == "" {
		return connect.NewResponse(&searchv1.GlobalSearchResponse{
			Results: []*searchv1.SearchResult{},
			Query:   req.Msg.Query,
		}), nil
	}

	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	result, err := s.searchClient.GlobalSearch(ctx, req.Msg.Query, limit)
	if err != nil {
		slog.Error("GlobalSearch failed", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("search failed: %w", err))
	}

	// Convert internal results to proto
	protoResults := make([]*searchv1.SearchResult, len(result.Results))
	for i, r := range result.Results {
		resultType := searchv1.SearchResultType_SEARCH_RESULT_TYPE_UNSPECIFIED
		switch r.Type {
		case search.IndexEvents:
			resultType = searchv1.SearchResultType_SEARCH_RESULT_TYPE_EVENT
		case search.IndexOrganizations:
			resultType = searchv1.SearchResultType_SEARCH_RESULT_TYPE_ORGANIZATION
		case search.IndexUsers:
			resultType = searchv1.SearchResultType_SEARCH_RESULT_TYPE_USER
		case search.IndexTags:
			resultType = searchv1.SearchResultType_SEARCH_RESULT_TYPE_TAG
		}

		protoResult := &searchv1.SearchResult{
			Type:  resultType,
			Id:    r.ID,
			Title: r.Title,
		}
		if r.Description != "" {
			protoResult.Description = &r.Description
		}
		if r.ImageURL != "" {
			protoResult.ImageUrl = &r.ImageURL
		}
		protoResults[i] = protoResult
	}

	return connect.NewResponse(&searchv1.GlobalSearchResponse{
		Results:          protoResults,
		TotalHits:        result.TotalHits,
		ProcessingTimeMs: result.TimeMs,
		Query:            result.Query,
	}), nil
}

func (s *SearchService) SearchEvents(ctx context.Context, req *connect.Request[searchv1.SearchEventsRequest]) (*connect.Response[searchv1.SearchEventsResponse], error) {
	slog.Debug("SearchEvents", "query", req.Msg.Query, "limit", req.Msg.Limit)

	if s.searchClient == nil {
		return nil, connect.NewError(connect.CodeUnavailable, fmt.Errorf("search service not available"))
	}

	if req.Msg.Query == "" {
		return connect.NewResponse(&searchv1.SearchEventsResponse{
			Results: []*searchv1.SearchResult{},
		}), nil
	}

	limit := req.Msg.Limit
	if limit <= 0 {
		limit = 10
	}

	// Build filters
	filters := ""
	if req.Msg.OrganizationId != nil {
		filters = fmt.Sprintf("organizationId = %d", *req.Msg.OrganizationId)
	}

	result, err := s.searchClient.SearchEvents(ctx, req.Msg.Query, limit, filters)
	if err != nil {
		slog.Error("SearchEvents failed", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("search failed: %w", err))
	}

	// Convert hits to proto results
	protoResults := make([]*searchv1.SearchResult, 0, len(result.Hits))
	for _, hit := range result.Hits {
		var hitMap map[string]interface{}
		if err := hit.DecodeInto(&hitMap); err != nil {
			continue
		}

		sr := &searchv1.SearchResult{
			Type: searchv1.SearchResultType_SEARCH_RESULT_TYPE_EVENT,
		}

		if id, ok := hitMap["id"].(float64); ok {
			sr.Id = int32(id)
		}
		if title, ok := hitMap["title"].(string); ok {
			sr.Title = title
		}
		if desc, ok := hitMap["description"].(string); ok {
			sr.Description = &desc
		}
		if imageURL, ok := hitMap["imageUrl"].(string); ok {
			sr.ImageUrl = &imageURL
		}

		protoResults = append(protoResults, sr)
	}

	return connect.NewResponse(&searchv1.SearchEventsResponse{
		Results:   protoResults,
		TotalHits: result.EstimatedTotalHits,
	}), nil
}

func (s *SearchService) Reindex(ctx context.Context, req *connect.Request[searchv1.ReindexRequest]) (*connect.Response[searchv1.ReindexResponse], error) {
	slog.Info("Reindex requested", "indexes", req.Msg.Indexes)

	if s.searchIndexer == nil {
		return nil, connect.NewError(connect.CodeUnavailable, fmt.Errorf("search indexer not available"))
	}

	result, err := s.searchIndexer.ReindexAll(ctx)
	if err != nil {
		slog.Error("Reindex failed", "error", err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("reindex failed: %w", err))
	}

	message := "Reindex completed successfully"
	if len(result.Errors) > 0 {
		message = fmt.Sprintf("Reindex completed with %d errors", len(result.Errors))
	}

	return connect.NewResponse(&searchv1.ReindexResponse{
		Success:              len(result.Errors) == 0,
		Message:              message,
		EventsIndexed:        int32(result.EventsIndexed),
		OrganizationsIndexed: int32(result.OrganizationsIndexed),
		UsersIndexed:         int32(result.UsersIndexed),
		TagsIndexed:          int32(result.TagsIndexed),
	}), nil
}
