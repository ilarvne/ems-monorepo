package perms

import (
	"context"
	"log/slog"

	pb "github.com/authzed/authzed-go/proto/authzed/api/v1"
	"github.com/authzed/authzed-go/v1"
	"github.com/authzed/grpcutil"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// Client wraps the SpiceDB client with convenience methods
type Client struct {
	client *authzed.Client
}

// Relationship represents a SpiceDB relationship to write
type Relationship struct {
	Resource    string // e.g., "club"
	ResourceID  string // e.g., "club-123"
	Relation    string // e.g., "president"
	SubjectType string // e.g., "user"
	SubjectID   string // e.g., "user-456"
}

// NewClient creates a new SpiceDB permissions client
func NewClient(endpoint, presharedKey string, insecureMode bool, skipVerifyCA bool) (*Client, error) {
	var opts []grpc.DialOption

	if insecureMode {
		opts = append(opts,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpcutil.WithInsecureBearerToken(presharedKey),
		)
	} else {
		// Use TLS with system certs
		var verification = grpcutil.VerifyCA
		if skipVerifyCA {
			verification = grpcutil.SkipVerifyCA
		}
		systemCerts, err := grpcutil.WithSystemCerts(verification)
		if err != nil {
			return nil, err
		}
		opts = append(opts,
			systemCerts,
			grpcutil.WithBearerToken(presharedKey),
		)
	}

	client, err := authzed.NewClient(endpoint, opts...)
	if err != nil {
		return nil, err
	}

	return &Client{client: client}, nil
}

// CheckPermission checks if a user has a specific permission on a resource
// Example: CheckPermission(ctx, "user-123", "club", "club-456", "create_event")
func (c *Client) CheckPermission(ctx context.Context, userID, resourceType, resourceID, permission string) (bool, error) {
	subject := &pb.SubjectReference{
		Object: &pb.ObjectReference{
			ObjectType: "user",
			ObjectId:   userID,
		},
	}

	resource := &pb.ObjectReference{
		ObjectType: resourceType,
		ObjectId:   resourceID,
	}

	resp, err := c.client.CheckPermission(ctx, &pb.CheckPermissionRequest{
		Resource:   resource,
		Permission: permission,
		Subject:    subject,
	})
	if err != nil {
		slog.Error("SpiceDB CheckPermission failed",
			"user_id", userID,
			"resource_type", resourceType,
			"resource_id", resourceID,
			"permission", permission,
			"error", err,
		)
		return false, err
	}

	allowed := resp.Permissionship == pb.CheckPermissionResponse_PERMISSIONSHIP_HAS_PERMISSION

	slog.Debug("Permission check",
		"user_id", userID,
		"resource", resourceType+":"+resourceID,
		"permission", permission,
		"allowed", allowed,
	)

	return allowed, nil
}

// WriteRelationships writes multiple relationships to SpiceDB
func (c *Client) WriteRelationships(ctx context.Context, relationships []Relationship) error {
	updates := make([]*pb.RelationshipUpdate, len(relationships))

	for i, rel := range relationships {
		updates[i] = &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_TOUCH,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: rel.Resource,
					ObjectId:   rel.ResourceID,
				},
				Relation: rel.Relation,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: rel.SubjectType,
						ObjectId:   rel.SubjectID,
					},
				},
			},
		}
	}

	_, err := c.client.WriteRelationships(ctx, &pb.WriteRelationshipsRequest{
		Updates: updates,
	})
	if err != nil {
		slog.Error("SpiceDB WriteRelationships failed", "error", err)
		return err
	}

	slog.Debug("Wrote relationships", "count", len(relationships))
	return nil
}

// DeleteRelationships removes relationships from SpiceDB
func (c *Client) DeleteRelationships(ctx context.Context, relationships []Relationship) error {
	updates := make([]*pb.RelationshipUpdate, len(relationships))

	for i, rel := range relationships {
		updates[i] = &pb.RelationshipUpdate{
			Operation: pb.RelationshipUpdate_OPERATION_DELETE,
			Relationship: &pb.Relationship{
				Resource: &pb.ObjectReference{
					ObjectType: rel.Resource,
					ObjectId:   rel.ResourceID,
				},
				Relation: rel.Relation,
				Subject: &pb.SubjectReference{
					Object: &pb.ObjectReference{
						ObjectType: rel.SubjectType,
						ObjectId:   rel.SubjectID,
					},
				},
			},
		}
	}

	_, err := c.client.WriteRelationships(ctx, &pb.WriteRelationshipsRequest{
		Updates: updates,
	})
	if err != nil {
		slog.Error("SpiceDB DeleteRelationships failed", "error", err)
		return err
	}

	return nil
}

// LookupResources finds all resources of a type that a user has a permission on
// Example: LookupResources(ctx, "user-123", "club", "create_event") returns all club IDs
func (c *Client) LookupResources(ctx context.Context, userID, resourceType, permission string) ([]string, error) {
	subject := &pb.SubjectReference{
		Object: &pb.ObjectReference{
			ObjectType: "user",
			ObjectId:   userID,
		},
	}

	stream, err := c.client.LookupResources(ctx, &pb.LookupResourcesRequest{
		ResourceObjectType: resourceType,
		Permission:         permission,
		Subject:            subject,
	})
	if err != nil {
		return nil, err
	}

	var resourceIDs []string
	for {
		resp, err := stream.Recv()
		if err != nil {
			break // End of stream or error
		}
		resourceIDs = append(resourceIDs, resp.ResourceObjectId)
	}

	return resourceIDs, nil
}

// LookupSubjects finds all users that have a permission on a resource
// Example: LookupSubjects(ctx, "club", "club-123", "create_event") returns all user IDs
func (c *Client) LookupSubjects(ctx context.Context, resourceType, resourceID, permission string) ([]string, error) {
	resource := &pb.ObjectReference{
		ObjectType: resourceType,
		ObjectId:   resourceID,
	}

	stream, err := c.client.LookupSubjects(ctx, &pb.LookupSubjectsRequest{
		Resource:          resource,
		Permission:        permission,
		SubjectObjectType: "user",
	})
	if err != nil {
		return nil, err
	}

	var subjectIDs []string
	for {
		resp, err := stream.Recv()
		if err != nil {
			break
		}
		subjectIDs = append(subjectIDs, resp.Subject.SubjectObjectId)
	}

	return subjectIDs, nil
}

// Platform ID constant - use this for platform-level permissions
const PlatformID = "astanait"

// SetupPlatformRelationship sets up a user's relationship to the platform
func (c *Client) SetupPlatformRelationship(ctx context.Context, userID string, role string) error {
	return c.WriteRelationships(ctx, []Relationship{
		{
			Resource:    "platform",
			ResourceID:  PlatformID,
			Relation:    role, // "admin" or "staff"
			SubjectType: "user",
			SubjectID:   userID,
		},
	})
}

// SetupClubRelationship sets up a user's relationship to a club
func (c *Client) SetupClubRelationship(ctx context.Context, clubID, userID, role string) error {
	return c.WriteRelationships(ctx, []Relationship{
		{
			Resource:    "club",
			ResourceID:  clubID,
			Relation:    role, // "president" or "member"
			SubjectType: "user",
			SubjectID:   userID,
		},
	})
}

// LinkClubToPlatform ensures a club is linked to the platform for permission inheritance
func (c *Client) LinkClubToPlatform(ctx context.Context, clubID string) error {
	return c.WriteRelationships(ctx, []Relationship{
		{
			Resource:    "club",
			ResourceID:  clubID,
			Relation:    "parent_platform",
			SubjectType: "platform",
			SubjectID:   PlatformID,
		},
	})
}

// SetupEventRelationship sets up an event's relationships
func (c *Client) SetupEventRelationship(ctx context.Context, eventID, clubID, creatorID string) error {
	return c.WriteRelationships(ctx, []Relationship{
		{
			Resource:    "event",
			ResourceID:  eventID,
			Relation:    "host_club",
			SubjectType: "club",
			SubjectID:   clubID,
		},
		{
			Resource:    "event",
			ResourceID:  eventID,
			Relation:    "creator",
			SubjectType: "user",
			SubjectID:   creatorID,
		},
	})
}

// IsGlobalStaff checks if user is platform staff or admin
func (c *Client) IsGlobalStaff(ctx context.Context, userID string) (bool, error) {
	// Check if user has manage_clubs permission on platform
	return c.CheckPermission(ctx, userID, "platform", PlatformID, "manage_clubs")
}

// GetManagedClubs returns all club IDs where the user can manage (president or staff)
func (c *Client) GetManagedClubs(ctx context.Context, userID string) ([]string, error) {
	return c.LookupResources(ctx, userID, "club", "manage_settings")
}

// GetUserPermissions returns a summary of user permissions for the frontend
func (c *Client) GetUserPermissions(ctx context.Context, userID string) (*UserPermissions, error) {
	isAdmin, _ := c.CheckPermission(ctx, userID, "platform", PlatformID, "manage_system")
	isStaff, _ := c.CheckPermission(ctx, userID, "platform", PlatformID, "manage_clubs")
	managedClubs, _ := c.GetManagedClubs(ctx, userID)

	return &UserPermissions{
		UserID:        userID,
		IsAdmin:       isAdmin,
		IsGlobalStaff: isStaff,
		ManagedClubs:  managedClubs,
	}, nil
}

// UserPermissions represents computed permissions for a user
type UserPermissions struct {
	UserID        string   `json:"user_id"`
	IsAdmin       bool     `json:"is_admin"`
	IsGlobalStaff bool     `json:"is_global_staff"`
	ManagedClubs  []string `json:"managed_clubs"`
}
