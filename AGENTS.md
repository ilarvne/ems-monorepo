# AGENTS.md - EMS Monorepo

Guidelines for agentic coding tools working in this repository.

## Repo Overview

**Nx + Bun monorepo** with Go Connect-RPC backend, React/Vite frontend, and shared packages.

```
apps/
├── backend/          # Go Connect-RPC server (gRPC-compatible)
├── events-admin/     # React 19 + Vite + TanStack Router
packages/
├── db/               # Drizzle ORM schema (@repo/db)
├── proto/            # Protobuf definitions + generated clients (@repo/proto)
├── env/              # Zod environment schemas (@repo/env)
├── ui/               # Shared UI components - shadcn/ui (@repo/ui)
├── prettier/         # Shared Prettier configs
infra/                # Docker configs (Kratos, SpiceDB)
```

## Build / Lint / Test Commands

### Workspace (root)
```bash
bun install                    # Install all dependencies
bun run dev                    # Start all dev servers
bun run build                  # Build all projects
bun run lint                   # Lint all projects
bunx nx affected -t build      # Build only affected projects
```

### Backend (Go) - from `apps/backend/`
```bash
# Via Nx (preferred)
bunx nx build backend          # Compile binary
bunx nx dev backend            # Run dev server
bunx nx test backend           # Run all tests
bunx nx lint backend           # golangci-lint

# Direct Go commands
go test ./...                              # All tests
go test -v -run TestName ./...             # Single test by name
go test -v -run "TestCreate.*" ./...       # Pattern match
go test -v ./internal/services/...         # Package scope
go test -v ./internal/services -run TestX  # Package + single test
go test -race -cover ./...                 # With race detection + coverage
```

### Frontend (React) - from repo root
```bash
bunx nx dev events-admin       # Dev server (Vite)
bunx nx build events-admin     # Production build
bunx nx lint events-admin      # ESLint
bunx nx typecheck events-admin # tsc --noEmit

# If tests exist (vitest)
bunx vitest -t "test name"     # Single test by name
bunx vitest path/to/file.test.tsx  # Single file
```

### Proto / DB packages
```bash
bun run --filter @repo/proto generate  # buf generate
bun run --filter @repo/db db:push      # Push schema to DB
bun run --filter @repo/db db:studio    # Open Drizzle Studio
```

## Code Style - TypeScript/React

### Formatting (Prettier)
Config: `@repo/prettier/frontend` - enforced via prettier plugin
- `printWidth: 120`, `tabWidth: 2`, `useTabs: false`
- `semi: false` (no semicolons)
- `singleQuote: true`, `jsxSingleQuote: true`
- `trailingComma: 'none'`

### Import Order (auto-sorted by prettier)
```typescript
// 1. Third-party modules
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal aliases (@/...)
import { Button } from '@/ui/button'
import { useAuth } from '@/lib/auth'

// 3. Relative imports (parent then sibling)
import { helper } from '../utils'
import { local } from './local'
```

### TypeScript Conventions
- Use `import type { Foo }` for type-only imports
- Avoid `any` - use `unknown` with type narrowing
- Prefer explicit return types on exported functions
- Use strict null checks (`strictNullChecks: true`)

### React Conventions
- Functional components only, with hooks
- Named exports for components: `export function EventCard() {}`
- Feature organization: `src/features/<domain>/`
- File-based routing: `src/routes/` (TanStack Router)
- Component files: `PascalCase.tsx`
- Hook files: `useXxx.ts`

### Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EventCard.tsx` |
| Hooks | camelCase with `use` prefix | `useEventData.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE | `const MAX_ITEMS = 100` |
| Types/Interfaces | PascalCase | `interface EventData` |

### Error Handling
```typescript
// Wrap async actions in try/catch
async function handleSubmit() {
  try {
    await createEvent(data)
    toast.success('Event created')
  } catch (error) {
    console.error('Failed to create event:', error)
    toast.error('Failed to create event')
  }
}
```

## Code Style - Go Backend

### File Naming
- Files: `snake_case.go`
- Exported identifiers: `PascalCase`

### Error Handling
```go
// Always check and wrap errors with context
result, err := s.queries.GetEvent(ctx, id)
if err != nil {
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("event not found"))
    }
    return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get event: %w", err))
}
```

### Connect-RPC Error Codes
| Code | Use Case |
|------|----------|
| `CodeInvalidArgument` | Bad request data |
| `CodeNotFound` | Resource doesn't exist |
| `CodeUnauthenticated` | No valid session |
| `CodePermissionDenied` | Lacks permission |
| `CodeFailedPrecondition` | State conflict |
| `CodeInternal` | Server errors |

### Logging
```go
// Use structured logging with slog
slog.Info("creating event", "title", req.Msg.Title, "org_id", req.Msg.OrganizationId)
slog.Error("failed to create event", "error", err)
```

### DB Patterns
- Queries via sqlc: `apps/backend/internal/db/`
- Use transactions for multi-step mutations
- Use `pgxpool` for connection pooling

## Project Structure

### Frontend Routes (`apps/events-admin/src/routes/`)
- `__root.tsx` - Root layout
- `_authenticated.tsx` - Auth-required layout
- `_authenticated/events/` - Events pages
- `auth/login.tsx` - Login page

### Frontend Features (`apps/events-admin/src/features/`)
- `events/`, `organizations/`, `users/`, `calendar/`, `statistics/`

### Backend Services (`apps/backend/internal/`)
- `services/` - Connect-RPC handlers
- `db/` - sqlc queries
- `auth/` - Kratos integration
- `perms/` - SpiceDB authorization

## Internal Packages
- `@repo/db` - Drizzle schema
- `@repo/proto` - Protobuf + generated clients
- `@repo/ui` - shadcn/ui components
- `@repo/env` - Zod env validation
- Frontend alias: `@/` -> `apps/events-admin/src/`

## Before Committing
1. Run tests for changed code: `go test ./...` or `bunx vitest`
2. Run linting: `bunx nx lint <project>`
3. For Go: `golangci-lint run` in `apps/backend/`
4. Ensure no `any` types or unhandled errors
