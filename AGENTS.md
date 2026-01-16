# AGENTS.md - EMS Monorepo

# AGENTS.md - EMS Monorepo

Guidelines for agentic coding tools working in this repository.

## Existing Agent Rules
- Cursor rules: none found (`.cursorrules` and `.cursor/rules/` absent)
- Copilot rules: none found (`.github/copilot-instructions.md` absent)

## Repo Overview
**Nx + Bun monorepo** with a Go Connect-RPC backend, a React/Vite admin frontend, and shared packages.

```
apps/
├── backend/          # Go backend with Connect-RPC (gRPC-compatible)
├── events-admin/     # React 19 + Vite + TanStack Router admin dashboard
packages/
├── db/               # Drizzle ORM schema (@repo/db)
├── proto/            # Protobuf definitions + generated TS + Go clients (@repo/proto)
├── env/              # Zod environment schemas (@repo/env)
├── ui/               # Shared UI components (shadcn/ui) (@repo/ui)
├── prettier/         # Shared Prettier configs + import sorting
infra/                # Docker configs for Kratos, Hydra, SpiceDB
```

## Tooling Baseline
- Package manager/runtime: Bun
- Orchestration: Nx (`bunx nx ...` is always available)
- TS: strict, composite builds in some packages (`tsconfig.base.json`)
- Backend: Go modules under `apps/backend/`

## Build / Lint / Test
### Workspace (root)
```bash
bun install
bun run dev              # nx run-many -t dev
bun run build            # nx run-many -t build
bun run lint             # nx run-many -t lint
bun run test             # nx run-many -t test (not all projects define this)

bunx nx graph
bunx nx affected
```

### Backend (apps/backend)
Nx targets (preferred):
```bash
bunx nx dev backend
bunx nx build backend
bunx nx lint backend
bunx nx test backend
bunx nx fmt backend
bunx nx tidy backend
bunx nx generate backend  # regenerates proto + copies Go gen into backend
```

Go direct (run from `apps/backend/`):
```bash
go test ./...

go test -v -run TestName ./...                 # single test by name
go test -v -run "TestCreate.*" ./...           # name pattern
go test -v ./internal/services/...             # package scope
go test -v ./internal/services -run TestFoo    # package + one test

golangci-lint run
```

### Frontend (apps/events-admin)
Nx targets (these are `package.json` scripts):
```bash
bunx nx dev events-admin
bunx nx build events-admin
bunx nx lint events-admin
bunx nx typecheck events-admin
```

Direct scripts (run from repo root):
```bash
bun run --filter events-admin dev
bun run --filter events-admin build
bun run --filter events-admin lint
```

Single test note:
- `apps/events-admin` currently depends on `vitest`, but there are no `*.test/*spec*` files and no Nx `test` target detected for `events-admin`.
- If tests are added later, the typical patterns are:
  - `bunx vitest -t "name"` (name pattern)
  - `bunx vitest path/to/file.test.tsx` (single file)

### Proto / DB packages
```bash
bun run --filter @repo/proto generate   # buf generate
bun run --filter @repo/proto build      # tsc (also runs generate via prebuild)

bun run schema:sync                     # db push + build + seed
bun run --filter @repo/db db:push
bun run --filter @repo/db db:generate
bun run --filter @repo/db db:studio
```

### Infrastructure (local dev)
```bash
docker compose up -d
```

## Code Style (TypeScript/React)
### Formatting
- Prettier config is provided by `@repo/prettier`.
- Frontend uses `@repo/prettier/frontend` (see `packages/prettier/frontend.js`).
- Defaults:
  - `printWidth: 120`
  - `tabWidth: 2`, `useTabs: false`
  - `semi: false`
  - `singleQuote: true`, `jsxSingleQuote: true`
  - `trailingComma: 'none'`
  - `arrowParens: 'always'`

### Imports
- Imports are auto-sorted via `@trivago/prettier-plugin-sort-imports`.
- Frontend import order (high level):
  1) third-party
  2) `@/components`, `@/layout`, `@/ui`, `@/providers`, `@/lib`, `@/constants`, `@/types`, ...
  3) parent (`../`) then sibling (`./`)
  4) styles last

### TypeScript conventions
- Prefer `import type { Foo } from '...'` for type-only imports.
- Keep types narrow and explicit; avoid `any`.
- Prefer `unknown` + narrowing when needed.
- Avoid unstable implicit `any` in callbacks; type parameters when it helps.

### React conventions
- Functional components + hooks.
- Prefer named exports for components/hooks.
- Feature organization: `apps/events-admin/src/features/<domain>/...`
- Routing: file-based TanStack Router under `apps/events-admin/src/routes/`.

### Naming
- Components/files: `PascalCase.tsx` (e.g. `EventCard.tsx`)
- Hooks: `useXxx` camelCase file + identifier
- Utilities: camelCase file (`formatDate.ts`)
- Constants: `SCREAMING_SNAKE_CASE` for module-level constants
- Types/interfaces: `PascalCase`

### Frontend error handling
- Wrap async UI actions in `try/catch`.
- Return early on errors; show a toast/message where appropriate.
- Avoid swallowing errors silently; at least log in dev.

## Code Style (Go backend)
### General
- Always check errors; wrap with context: `fmt.Errorf("...: %w", err)`.
- Logging uses `log/slog` with structured fields.

### Connect-RPC error handling
- Use `connect.NewError(code, err)` with the closest Connect code:
  - `connect.CodeInvalidArgument`
  - `connect.CodeUnauthenticated`
  - `connect.CodePermissionDenied`
  - `connect.CodeNotFound`
  - `connect.CodeFailedPrecondition`
  - `connect.CodeInternal`

### File / symbol naming
- Files: `snake_case.go`.
- Exported identifiers: `PascalCase`.

### DB patterns
- Queries via sqlc in `apps/backend/internal/db/`.
- Use transactions for multi-step mutations.

## Internal Packages / Imports
- Use workspace packages via `@repo/*`:
  - `@repo/db`, `@repo/proto`, `@repo/env`, `@repo/ui`
- Frontend alias: `@/` resolves to `apps/events-admin/src/`.

## Before you open a PR / handoff checklist
- Run the narrowest tests first (package/test-file/test-name).
- Run `bunx nx lint <project>` for touched TS projects.
- For backend Go changes, run `go test ./...` in `apps/backend/`.
