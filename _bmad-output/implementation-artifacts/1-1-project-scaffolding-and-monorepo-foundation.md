# Story 1.1: Project Scaffolding & Monorepo Foundation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a fully configured monorepo with frontend, backend, and shared packages running locally,
so that I have the foundation to build all product features.

## Acceptance Criteria

1. A pnpm workspace monorepo exists with `packages/client`, `packages/server`, and `packages/shared` directories
2. The client is scaffolded via TanStack CLI (`--router-only`) with Shadcn/ui and TanStack Query add-ons
3. The server has Fastify, Drizzle ORM, and better-sqlite3 installed with TypeScript configured
4. The shared package has a Zod dependency and barrel export (`src/index.ts`)
5. `pnpm dev` at the root starts both Vite dev server and Fastify server via `concurrently`
6. Vite proxies `/api/*` requests to the Fastify server
7. The Fastify server listens on `127.0.0.1` only (not exposed to network)
8. A root `tsconfig.base.json` with strict mode is shared across all packages
9. Vitest is configured for unit testing across client and server packages

## Tasks / Subtasks

- [x] Task 1: Initialize monorepo structure (AC: #1, #8)
  - [x] 1.1 Create root `package.json` with pnpm workspace config
  - [x] 1.2 Create `pnpm-workspace.yaml` pointing to `packages/*`
  - [x] 1.3 Create root `tsconfig.base.json` with strict mode, target ES2022, module NodeNext
  - [x] 1.4 Add `better-sqlite3` to `pnpm.onlyBuiltDependencies` in root package.json (required for pnpm v10+ native builds)
  - [x] 1.5 Create `.gitignore` (node_modules, dist, *.db, .env)
  - [x] 1.6 Create `.env.example` with `DB_PATH` and `PORT` defaults

- [x] Task 2: Scaffold client package (AC: #2)
  - [x] 2.1 Run `npx @tanstack/cli create packages/client --router-only --add-ons shadcn,tanstack-query --package-manager pnpm`
  - [x] 2.2 Verify TanStack Router file-based routing is working under `src/routes/`
  - [x] 2.3 Verify Shadcn/ui components directory exists at `src/components/ui/`
  - [x] 2.4 Verify Tailwind CSS v4 is configured (CSS-based `@theme` directive, `@import "tailwindcss"`)
  - [x] 2.5 Add JetBrains Mono font import to `src/styles/globals.css`
  - [x] 2.6 Set up CSS custom properties for the muted, restrained color palette per UX spec

- [x] Task 3: Set up server package (AC: #3, #7)
  - [x] 3.1 Create `packages/server/` with `package.json` and `tsconfig.json` extending root base
  - [x] 3.2 Install dependencies: `fastify`, `drizzle-orm`, `better-sqlite3`, `fastify-type-provider-zod`
  - [x] 3.3 Install dev dependencies: `typescript`, `@types/better-sqlite3`, `drizzle-kit`, `tsx`
  - [x] 3.4 Create `src/index.ts` — Fastify entry point listening on `127.0.0.1:3001`
  - [x] 3.5 Use Fastify v5 `.listen()` object syntax: `{ host: '127.0.0.1', port: 3001 }`
  - [x] 3.6 Create `src/db/index.ts` — DB connection placeholder (better-sqlite3 + Drizzle)
  - [x] 3.7 Create `src/db/schema.ts` — Empty Drizzle schema placeholder
  - [x] 3.8 Configure Pino logging (pretty-print in dev)

- [x] Task 4: Create shared package (AC: #4)
  - [x] 4.1 Create `packages/shared/` with `package.json` and `tsconfig.json` extending root base
  - [x] 4.2 Install Zod v4 (`zod@^4.0.0`)
  - [x] 4.3 Create `src/index.ts` barrel export
  - [x] 4.4 Create placeholder schema files: `src/schemas/node.schema.ts`, `src/schemas/inbox.schema.ts`, `src/schemas/session.schema.ts`, `src/schemas/search.schema.ts`
  - [x] 4.5 Create placeholder type files: `src/types/node.types.ts`, `src/types/inbox.types.ts`, `src/types/session.types.ts`, `src/types/search.types.ts`
  - [x] 4.6 Create `src/constants/hierarchy.ts` with `MAX_DEPTH = 4` and `NodeType` enum
  - [x] 4.7 Create `src/constants/api.ts` with `API_PREFIX = '/api'` and route paths

- [x] Task 5: Configure dev workflow (AC: #5, #6)
  - [x] 5.1 Install `concurrently` as root dev dependency
  - [x] 5.2 Add root `package.json` scripts: `dev`, `build`, `test`, `test:unit`, `test:e2e`
  - [x] 5.3 Root `dev` script: `concurrently "pnpm --filter client dev" "pnpm --filter server dev"`
  - [x] 5.4 Server `dev` script: `tsx watch src/index.ts`
  - [x] 5.5 Configure Vite proxy in `packages/client/vite.config.ts`: `server.proxy['/api'] = 'http://localhost:3001'`
  - [x] 5.6 Verify `pnpm dev` starts both servers and proxy works (hit `/api/health` from browser)

- [x] Task 6: Configure testing (AC: #9)
  - [x] 6.1 Install Vitest as root dev dependency (v3.2.x — `projects` config supported)
  - [x] 6.2 Create `vitest.config.ts` at root or per-package configs
  - [x] 6.3 Configure Vitest projects for both client and server packages
  - [x] 6.4 Add a smoke test in server: `src/index.test.ts` that verifies Fastify starts
  - [x] 6.5 Add a smoke test in client: `src/app.test.tsx` that verifies app renders
  - [x] 6.6 Verify `pnpm test:unit` runs both test suites

- [x] Task 7: Verify end-to-end scaffolding
  - [x] 7.1 Run `pnpm install` from root — all packages resolve
  - [x] 7.2 Run `pnpm dev` — both servers start without errors
  - [x] 7.3 Visit `http://localhost:5173` — client renders TanStack Router default page
  - [x] 7.4 Visit `http://localhost:5173/api/health` — proxy forwards to Fastify, returns OK
  - [x] 7.5 Run `pnpm test:unit` — all smoke tests pass
  - [x] 7.6 Verify TypeScript compilation has zero errors across all packages

## Dev Notes

### Critical Technology Versions (as of 2026-03-09)

| Technology | Version | Critical Notes |
|---|---|---|
| pnpm | v10.31+ | **Lifecycle scripts disabled by default** — must add `better-sqlite3` to `pnpm.onlyBuiltDependencies` |
| TanStack CLI | v0.62+ | Use `--router-only --add-ons shadcn,tanstack-query --package-manager pnpm` |
| TanStack Router | v1.166+ | File-based routing, `--router-only` = no SSR/Start |
| TanStack Query | v5.90+ | v5 API: no `onSuccess`/`onError` on useQuery, use `gcTime` not `cacheTime` |
| Fastify | v5.8+ | **v5 breaking**: `.listen({ port, host })` object syntax required, Node 20+ required |
| Drizzle ORM | v0.45+ | Pre-1.0, stable API. Use `drizzle-orm/better-sqlite3` adapter |
| better-sqlite3 | v12.6+ | Requires native compilation (node-gyp). Needs pnpm onlyBuiltDependencies config |
| Zod | v4.3+ | **v4 breaking**: unified `error` param, `z.email()` top-level, `"zod/mini"` subpath available |
| Tailwind CSS | v4.2+ | **CSS-based config** via `@theme` directive, `@import "tailwindcss"` replaces `@tailwind` directives |
| Shadcn/ui | CLI v4+ | Package is `shadcn` (not `shadcn-ui`). TanStack add-on handles setup automatically |
| Vitest | v3.2+ | `projects` config supported (backported from v4 design). `workspace` also still works |
| concurrently | v9.2+ | No breaking changes |

### Architecture Compliance

**Monorepo Structure (MUST match exactly):**
```
todo-bmad-style/
├── package.json                    # Root scripts, pnpm config
├── pnpm-workspace.yaml             # packages/*
├── tsconfig.base.json              # Strict mode, shared config
├── .gitignore
├── .env.example
├── packages/
│   ├── client/                     # TanStack CLI output
│   │   ├── vite.config.ts          # Includes /api proxy to localhost:3001
│   │   └── src/
│   │       ├── routes/             # File-based routing
│   │       ├── components/ui/      # Shadcn primitives
│   │       └── styles/globals.css  # Tailwind v4 + JetBrains Mono
│   ├── server/                     # Fastify API
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts            # Fastify entry, 127.0.0.1:3001
│   │       ├── db/
│   │       │   ├── index.ts        # DB connection placeholder
│   │       │   └── schema.ts       # Empty Drizzle schema
│   │       ├── routes/             # Empty, ready for Story 1.2
│   │       └── services/           # Empty, ready for Story 1.2
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── index.ts            # Barrel export
│           ├── schemas/            # Zod schemas (placeholders)
│           ├── types/              # TypeScript types (placeholders)
│           └── constants/          # hierarchy.ts, api.ts
```

**Naming Conventions (enforce from day one):**
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase` (e.g., `TreeView`)
- Functions/hooks: `camelCase` (e.g., `useTreeNavigation`)
- Zod schemas: `camelCase` + `Schema` suffix (e.g., `createNodeSchema`)
- DB columns: `snake_case` (e.g., `parent_id`, `sort_order`)
- API JSON fields: `camelCase` (e.g., `parentId`, `sortOrder`)

**Anti-Patterns to Avoid:**
- Do NOT create `utils.ts` or `helpers.ts` catch-all files
- Do NOT use `any` type — use proper types, Zod inference where possible
- Do NOT create `__tests__` directories — co-locate tests with source files
- Do NOT add loading spinners — local operations should be instant
- Do NOT create wrapper abstractions around Fastify, Drizzle, or TanStack Query

### Fastify v5 Specific Setup

```typescript
// CORRECT v5 syntax
const server = fastify({ logger: true });

// Health check route for proxy verification
server.get('/api/health', async () => ({ status: 'ok' }));

// CORRECT v5 listen syntax (object required, NOT positional args)
await server.listen({ host: '127.0.0.1', port: 3001 });
```

### pnpm v10 Native Build Config

```json
// Root package.json — REQUIRED for better-sqlite3
{
  "pnpm": {
    "onlyBuiltDependencies": ["better-sqlite3"]
  }
}
```

### Vite Proxy Configuration

```typescript
// packages/client/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

### Tailwind CSS v4 Setup Notes

Tailwind v4 uses CSS-based configuration instead of `tailwind.config.js`:
```css
/* globals.css */
@import "tailwindcss";

@theme {
  --font-mono: "JetBrains Mono", monospace;
  /* Color palette defined here, not in JS config */
}
```

### Zod v4 Import Pattern

```typescript
// Use standard import — API is mostly compatible
import { z } from "zod";

// v4 new: top-level format validators
const email = z.email(); // instead of z.string().email()

// v4 new: unified error param
const schema = z.string({ error: "Must be a string" });
```

### Project Structure Notes

- This story creates the skeleton — empty directories and placeholder files for routes/, services/, schemas/, types/
- Story 1.2 (Node Data Model & CRUD API) will fill in the actual DB schema, Zod schemas, API routes, and services
- The shared package barrel export should re-export all schemas, types, and constants
- Cross-package imports use pnpm workspace protocol: `"@todo-bmad-style/shared": "workspace:*"`

### Testing Setup Notes

- Vitest v3.2+ uses `projects` configuration (v4-style API backported)
- Co-located tests: `tree-view.tsx` → `tree-view.test.tsx` in same directory
- Server tests can use Fastify's `.inject()` for route testing without starting the server
- Client tests use `@testing-library/react` (install in Story 1.3+ when components are built)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Development Workflow]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Data Persistence]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design System]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- TanStack CLI `--router-only` mode ignores `--add-ons` flag; Shadcn/ui and TanStack Query installed manually
- `fastify-type-provider-zod@4.x` requires Zod v3; upgraded to v6.1.0 for Zod v4 compatibility
- Client dev port changed from TanStack CLI default (3000) to 5173 per project-context.md spec
- Added `esbuild` to `pnpm.onlyBuiltDependencies` to avoid build warnings

### Completion Notes List

- All 7 tasks and 42 subtasks completed successfully
- Monorepo structure matches architecture spec exactly
- Both dev servers start and communicate via Vite proxy
- Health check endpoint verified via direct and proxy access
- TypeScript compilation: zero errors across all 3 packages
- Vitest v3.2 configured with `projects` for client (jsdom) and server
- 2 smoke tests pass: Fastify inject health check + React render test

### Change Log

- 2026-03-09: Initial monorepo scaffolding complete (Story 1.1)
- 2026-03-09: Code review fixes — cleaned TanStack Start boilerplate, fixed file naming conventions (kebab-case), moved cn() from lib/utils.ts to components/ui/cn.ts, extracted buildServer() for testable server, improved smoke tests, removed landing page CSS

### File List

- package.json (new)
- pnpm-workspace.yaml (new)
- tsconfig.base.json (new)
- vitest.config.ts (new)
- .gitignore (new)
- .env.example (new)
- packages/client/.cta.json (new, via TanStack CLI)
- packages/client/.gitignore (new, via TanStack CLI)
- packages/client/.vscode/settings.json (new, via TanStack CLI)
- packages/client/components.json (new, via Shadcn init)
- packages/client/README.md (new, via TanStack CLI)
- packages/client/package.json (new, via TanStack CLI + manual edits)
- packages/client/tsconfig.json (new, via TanStack CLI)
- packages/client/vite.config.ts (modified — added /api proxy)
- packages/client/index.html (new, via TanStack CLI)
- packages/client/public/favicon.ico (new, via TanStack CLI)
- packages/client/public/logo192.png (new, via TanStack CLI)
- packages/client/public/logo512.png (new, via TanStack CLI)
- packages/client/public/manifest.json (new, via TanStack CLI)
- packages/client/public/robots.txt (new, via TanStack CLI)
- packages/client/src/main.tsx (new, via TanStack CLI)
- packages/client/src/router.tsx (new, via TanStack CLI)
- packages/client/src/routeTree.gen.ts (auto-generated by TanStack Router)
- packages/client/src/styles.css (modified — JetBrains Mono, color palette, Shadcn theme)
- packages/client/src/routes/__root.tsx (new, via TanStack CLI)
- packages/client/src/routes/index.tsx (modified — replaced boilerplate with app placeholder)
- packages/client/src/components/ui/button.tsx (new, via Shadcn init)
- packages/client/src/components/ui/cn.ts (new — moved from lib/utils.ts)
- packages/client/src/components/footer.tsx (modified — replaced TanStack Start branding)
- packages/client/src/components/header.tsx (modified — replaced TanStack Start branding)
- packages/client/src/components/theme-toggle.tsx (renamed from ThemeToggle.tsx)
- packages/client/src/app.test.tsx (new — smoke test)
- packages/server/package.json (new)
- packages/server/tsconfig.json (new)
- packages/server/drizzle.config.ts (new)
- packages/server/src/server.ts (new — buildServer() for testability)
- packages/server/src/index.ts (modified — imports buildServer from server.ts)
- packages/server/src/index.test.ts (modified — uses buildServer() from actual source)
- packages/server/src/db/index.ts (new)
- packages/server/src/db/schema.ts (new)
- packages/shared/package.json (new)
- packages/shared/tsconfig.json (new)
- packages/shared/src/index.ts (new)
- packages/shared/src/schemas/node.schema.ts (new)
- packages/shared/src/schemas/inbox.schema.ts (new)
- packages/shared/src/schemas/session.schema.ts (new)
- packages/shared/src/schemas/search.schema.ts (new)
- packages/shared/src/types/node.types.ts (new)
- packages/shared/src/types/inbox.types.ts (new)
- packages/shared/src/types/session.types.ts (new)
- packages/shared/src/types/search.types.ts (new)
- packages/shared/src/constants/hierarchy.ts (new)
- packages/shared/src/constants/api.ts (new)
