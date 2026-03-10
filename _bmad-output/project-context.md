---
project_name: 'todo-bmad-style'
user_name: 'Willie'
date: '2026-03-09'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 52
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Language:** TypeScript (strict mode) — all packages
- **Frontend:** React SPA (no SSR) via TanStack CLI (`--router-only`)
- **Routing:** TanStack Router (file-based, SPA mode)
- **Server State:** TanStack Query (caching, optimistic updates, stale-while-revalidate)
- **UI State:** Zustand (small focused stores, no React Context for shared state)
- **Backend:** Fastify on `127.0.0.1:3001`
- **Database:** SQLite via better-sqlite3 (WAL mode), path: `~/.todo-bmad-style/data.db` (configurable via `DB_PATH`)
- **ORM:** Drizzle ORM + Drizzle Kit (migrations)
- **Validation:** Zod (shared schemas in `packages/shared/`)
- **UI Components:** Shadcn/ui + Radix UI primitives
- **Styling:** Tailwind CSS v4 + CSS custom properties
- **Editor:** Tiptap (WYSIWYG markdown)
- **Virtualization:** @tanstack/react-virtual
- **Build:** Vite + pnpm workspaces monorepo (`client`, `server`, `shared`)
- **Testing:** Vitest (unit), Testing Library (component), Playwright (E2E)
- **Font:** JetBrains Mono

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- **Strict mode enforced** — no `any` types anywhere. Use `z.infer<typeof schema>` for API types.
- **Shared package is the type authority** — all API request/response types come from `@todo-bmad-style/shared`. Never define inline types for API contracts.
- **snake_case ↔ camelCase boundary** — DB columns are `snake_case`, everything else is `camelCase`. Drizzle schema handles mapping. Never manually convert.
- **Barrel exports** — `packages/shared/src/index.ts` re-exports all schemas, types, and constants. Import from the package, not deep paths.
- **Zod schemas define the contract** — Zod schemas are the single source of truth. TypeScript types are inferred from them, not the other way around.
- **IDs are UUIDs (v4) as strings** — generated server-side. Never use sequential/numeric IDs.
- **Dates are ISO 8601 strings** — in JSON and SQLite. No Date objects in API contracts.
- **Nulls, not undefined** — use explicit `null` for absent optional fields in JSON. Never `undefined`.

### Framework-Specific Rules

#### React / Frontend

- **Optimistic updates for ALL tree mutations** — create, complete, rename, move, reorder use TanStack Query `onMutate`/`onError`/`onSettled`. Never wait for server response before updating UI.
- **TanStack Query key convention** — `['nodes']`, `['nodes', id]`, `['nodes', id, 'children']`, `['inbox']`, `['session']`, `['search', query]`. Never invent new key structures.
- **State boundary is absolute** — TanStack Query = server state. Zustand = UI-only state. No overlap. Never use React Context or shared `useState` for cross-component state.
- **Zustand stores are small and focused** — `useUIStore`, `useSidebarStore`, `useUndoStore`. No global mega-store.
- **Feature-based component folders** — `src/components/features/{feature-name}/`. Never organize by type (no `buttons/`, `forms/` directories).
- **No loading spinners for local operations** — SQLite reads are sub-millisecond. Only show skeleton/placeholder on initial app load (session restore).
- **Vite proxy** — Client proxies `/api/*` to `http://localhost:3001` in `vite.config.ts`.

#### Fastify / Backend

- **Route → Service → DB layering** — routes handle HTTP concerns only, services handle business logic only, db handles data access only. Never mix layers.
- **Zod validation at API boundary** — use `fastify-type-provider-zod`. Schemas from shared package only.
- **Flat API responses** — return data directly, no wrapper objects. Empty lists = `[]`, missing items = `404`.
- **Fastify error format** — `{ statusCode, error, message }`. Zod errors auto-formatted by the type provider.
- **Single retry, no backoff** — TanStack Query retries once for local operations. No exponential backoff needed.

### Testing Rules

- **Co-located tests** — `{file}.test.{ts|tsx}` next to source file. Never create `__tests__/` directories.
- **E2E by user journey** — `packages/client/e2e/` organized by journey, not by feature. Four journeys: resume-and-work, capture-and-organize, plan-new-project, complete-and-progress.
- **Unit test targets** — cascade completion logic, tree operations (reorder, move, hierarchy validation), Zod schema validation, service layer business logic.
- **Route tests use Fastify `inject()`** — no running server needed. Test HTTP concerns (status codes, validation errors, response shape).
- **Service tests mock the DB layer** — test business logic in isolation from Drizzle/SQLite.
- **Component tests mock TanStack Query** — test UI behavior and interactions, not data fetching.
- **E2E tests use real servers** — no mocks. Both Vite and Fastify must be running.
- **Test the cascade** — cascade completion is the most critical business logic. Unit test every edge case: complete all children → parent completes, reopen one child → parent reopens, delete last incomplete child → parent completes.

### Code Quality & Style Rules

- **File naming: `kebab-case`** — `tree-view.tsx`, `use-cascade-completion.ts`, `node.service.ts`, `node.schema.ts`.
- **Component naming: `PascalCase`** — `TreeView`, `DetailPanel`, `CaptureBar`.
- **Zod schema naming: `camelCase` + `Schema`** — `createNodeSchema`, `updateNodeSchema`, `promoteInboxItemSchema`.
- **DB naming: `snake_case`, plural tables** — `nodes`, `inbox_items`. Indexes: `idx_{table}_{column}`.
- **API endpoints: plural lowercase** — `/api/nodes`, `/api/inbox`. JSON fields: `camelCase`.
- **No catch-all utility files** — no `utils.ts`, `helpers.ts`, or `common.ts`. Put logic in the feature that uses it.
- **No wrapper abstractions** — use Fastify, Drizzle, and TanStack Query directly. No custom wrappers.
- **Hierarchy depth is fixed at 4** — project → effort → task → subtask. `MAX_DEPTH = 4`. Never allow dynamic nesting.
- **Single `nodes` table for all levels** — `type` enum column (`project | effort | task | subtask`) distinguishes levels. No separate tables per level.
- **React Error Boundary at layout level** — one boundary, not per-component. Never swallow errors silently.

### Development Workflow Rules

- **pnpm workspaces** — always use `pnpm` (not npm/yarn). Three packages: `client`, `server`, `shared`.
- **Single dev command** — `pnpm dev` at root starts both Vite and Fastify via `concurrently`.
- **Ports** — client: `5173`, API: `3001`. Client proxies `/api/*` to Fastify.
- **DB outside source tree** — `~/.todo-bmad-style/data.db`. Never store the database in the repo.
- **Drizzle migrations** — schema changes go through Drizzle Kit. Run `pnpm db:migrate` after schema updates.
- **No auth, no CORS, no deployment** — single-user localhost app. Don't add security middleware, CORS headers, or CI/CD config.
- **Offline-only** — no external API calls, no network fetches, no cloud sync. Everything runs locally.
- **Desktop-only** — minimum 1280x720 viewport. No responsive/mobile layouts. No touch event handling.
- **Fastify binds to `127.0.0.1`** — never `0.0.0.0`. Not network-accessible.

### Git Workflow

- **Feature branches per story** — when starting a new story, create a branch named `story/{story-key}` from `main` (e.g., `story/1-4-tree-view-and-hierarchy-creation`).
- **Branch from main** — always branch from the latest `main`. Pull `main` before creating the feature branch.
- **Commit on the feature branch** — all story implementation commits go on the feature branch, not `main`.
- **Pull request when done** — after code review passes, submit a pull request from the feature branch back to `main`.
- **PR title convention** — use the story title as the PR title (e.g., "Tree View and Hierarchy Creation").
- **PR description** — include the story key, a summary of changes, and a link to the story file.
- **Do NOT merge PRs** — the agent must only create the PR. The user will review and merge it manually.
- **Clean up** — the user will delete the feature branch after merging.

### Critical Don't-Miss Rules

- **Cascade completion is bidirectional** — completing all children auto-completes the parent. Reopening any child auto-reopens the parent. Deleting the last incomplete child auto-completes the parent. This spans DB → API → Query invalidation → UI.
- **Auto-save is silent** — 500ms debounce, no UI feedback on success. Silent retry on failure. Subtle inline error only on repeated failure. Never lose more than 500ms of content.
- **sort_order integrity** — every tree mutation (create, delete, move, reorder) must maintain contiguous `sort_order` values within a parent. Gaps cause rendering issues.
- **Session restore handles stale references** — if a saved `active_node_id` or `active_project_id` no longer exists, fall back gracefully. Never crash on missing references.
- **Undo stack is app-level, not editor-level** — Ctrl+Z undoes tree operations (create, delete, move, rename, complete). Tiptap has its own undo for text editing. Undo stack clears on project switch.
- **WCAG 2.1 AA required** — full keyboard navigation, ARIA roles on all custom widgets, visible focus indicators, `prefers-reduced-motion` support. Use Radix UI primitives for accessibility.
- **Keyboard navigation spans zones** — capture bar, sidebar, tree, detail panel, tabs. Focus must be tracked and restored across zone transitions.
- **Booleans in SQLite are 0/1** — Drizzle maps to `true`/`false` automatically. Never manually convert.
- **No SSR, no hydration** — pure SPA. Never use server components, `getServerSideProps`, or similar patterns.
- **Performance targets** — sub-200ms tree operations, sub-300ms markdown rendering, sub-100ms capture, sub-2s app launch with session restore. Virtualize trees at 200+ visible nodes.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review periodically for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-03-09
