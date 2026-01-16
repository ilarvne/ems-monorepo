# Clubs Table Feature

## Overview

This feature implements a comprehensive data table for managing clubs/organizations with advanced filtering, sorting, pagination, and URL state persistence.

## Architecture

### The Pagination Problem

#### Initial Issue
When implementing the table, we encountered a critical UX problem:
- **Server-side pagination** was fetching only 10/25/50 items per page
- **Client-side filtering** was applied to those limited results
- **Problem**: When filters were applied, the pagination controls showed incorrect counts
  - Example: Fetching 10 items, filtering to 3 results, but pagination still showed "1-10 of 16"
  - Users couldn't see filtered results on other pages because they weren't fetched
  - Total count remained at 16 even though only 3 matched the filter

#### Alternative Solutions Considered

**Option 1: Full Server-Side Filtering** ❌
```typescript
// Send filters to backend
const { data } = useSuspenseQuery(listOrganizations, {
  limit: tableState.pageSize,
  page: tableState.page,
  search: tableState.search,        // Backend filtering
  status: tableState.status,        // Backend filtering
})
```
**Pros**: 
- Most scalable for large datasets
- Minimal data transfer
- Backend controls all logic

**Cons**:
- Requires backend API changes (add filter parameters)
- More complex implementation
- Network request on every filter change
- Slower user experience

**Option 2: Full Client-Side** ❌
```typescript
// Always fetch everything
const { data } = useSuspenseQuery(listOrganizations, {
  limit: 10000,
  page: 1,
})
```
**Pros**:
- Simple implementation
- Fast filtering (no network requests)
- Accurate counts always

**Cons**:
- Poor performance with large datasets
- Excessive memory usage
- Slow initial page load
- Not scalable

**Option 3: Hybrid Approach** ✅ **(Selected)**

The best balance between performance and UX:

### Hybrid Pagination Approach

The table uses a **hybrid pagination strategy** that automatically switches between server-side and client-side pagination based on filter state:

#### Server-Side Pagination (Default)
- **When**: No filters are active (search or status filters)
- **Behavior**: Fetches only the requested page of data from the backend
- **Benefits**: 
  - Efficient network usage (only fetches 10/25/50 items at a time)
  - Fast initial page loads
  - Scalable to large datasets

#### Client-Side Pagination (When Filtering)
- **When**: Search query or status filters are active
- **Behavior**: Fetches all data (up to 1000 items) and filters/paginates on the client
- **Benefits**:
  - Accurate page counts for filtered results
  - Fast filter application without additional network requests
  - Correct total count display
  - Users can see all matching results across pages

### Why This Works

The hybrid approach solves the original problem by:

1. **Detection**: `const hasActiveFilters = tableState.search || tableState.status.length > 0`
2. **Conditional fetching**: When filters are active, fetch more data
3. **Conditional pagination**: Switch `manualPagination` flag based on filter state
4. **Dynamic counts**: Show filtered counts when filtering, server counts when not

**Trade-offs**:
- ✅ Excellent UX for typical use cases (browsing + occasional filtering)
- ✅ No backend changes required
- ✅ Works well up to ~1000 organizations
- ⚠️ May need optimization if dataset grows beyond 1000 items (switch to Option 1)

### Real-World Behavior

```
User Action                    → Fetch Strategy      → Pagination Type
─────────────────────────────────────────────────────────────────────
Browse page 1                  → Fetch 10 items      → Server-side
Browse page 2                  → Fetch 10 items      → Server-side
Apply search "Tech"            → Fetch 1000 items    → Client-side
  └─ Shows "1-5 of 8"          → (8 filtered locally)
Clear search                   → Fetch 10 items      → Server-side
Apply status filter "Active"   → Fetch 1000 items    → Client-side
  └─ Shows "1-10 of 13"        → (13 filtered locally)
```

### Implementation Details

```typescript
const hasActiveFilters = tableState.search || tableState.status.length > 0

// Fetch strategy
const { data } = useSuspenseQuery(listOrganizations, {
  limit: hasActiveFilters ? 1000 : tableState.pageSize,
  page: hasActiveFilters ? 1 : tableState.page,
})

// Table configuration
const table = useReactTable({
  manualPagination: !hasActiveFilters, // Server-side when no filters
  manualFiltering: false,              // Always client-side filtering
  pageCount: hasActiveFilters 
    ? -1  // Calculate from data
    : Math.ceil((data.total || 0) / pagination.pageSize),
  // ...
})
```

## Features

### URL State Persistence
All table state is persisted in the URL using `nuqs`:
- **Pagination**: `?page=2&pageSize=25`
- **Search**: `?search=tech`
- **Status filters**: `?status=1,2` (Active, Archived)
- **Sorting**: `?sortBy=title&sortDesc=0`
- **Column visibility**: `?hiddenColumns=imageUrl,socials`

**Benefits**:
- Shareable URLs with exact table state
- Browser back/forward navigation support
- Page refresh preserves filters
- Deep linking to specific views

### Filtering
- **Text search**: Searches across title and description
- **Status filter**: Multi-select checkbox filter (Active, Archived, Frozen)
- **Column visibility**: Toggle columns on/off
- Auto-resets to page 1 when filters change

### Sorting
- Click column headers to sort
- Visual indicators (↑↓) for sort direction
- Supports ascending/descending

### Pagination
- Configurable page size (5, 10, 25, 50)
- First/Previous/Next/Last navigation
- Current page and total count display
- Disabled states for unavailable actions

### Row Selection
- Checkbox selection with "Select All" support
- Indeterminate state for partial selection
- Selected state persisted during pagination

## Files Structure

```
/features/organizations/
├── README.md                      # This file
├── organizations.columns.tsx      # Column definitions with custom renderers
└── social-icon.tsx                # Reusable social media icon component
```

## Column Definitions

See `organizations.columns.tsx` for:
- Custom cell renderers (images, badges, social links)
- Filter functions (multi-column search, status filter)
- Column sizing and visibility settings

## Usage in Routes

The main implementation is in `/routes/organizations.tsx` which:
1. Sets up URL state management with `useQueryStates`
2. Configures TanStack Table with hybrid pagination
3. Renders filters, table, and pagination controls
4. Handles all user interactions

## Performance Considerations

- **Small datasets (<100 items)**: Always client-side filtering is fine
- **Medium datasets (100-1000 items)**: Hybrid approach works well
- **Large datasets (>1000 items)**: Consider implementing server-side filtering

Current limit when filtering is set to 1000 items. Adjust based on your needs:

```typescript
limit: hasActiveFilters ? 1000 : tableState.pageSize
```

## Future Enhancements

- Server-side filtering for better scalability
- Debounced search input to reduce re-renders
- Virtual scrolling for very large datasets
- Export functionality (CSV, PDF)
- Bulk actions on selected rows
