---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-09'
inputDocuments: [prd.md, ux-design-specification.md]
workflowType: 'architecture'
project_name: 'todo-bmad-style'
user_name: 'Willie'
date: '2026-03-09'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
47 FRs across 10 domains. The architectural core is the hierarchy CRUD system (FR1-FR8), cascade completion engine (FR9-FR13), and markdown body management (FR14-FR17). These three groups account for the primary data model and business logic. The remaining FRs (tree navigation, layout, detail panel, inbox, search, session resume, data persistence) define the frontend interaction layer and storage concerns.

**Non-Functional Requirements:**
- **Performance:** Sub-200ms tree operations, sub-300ms markdown rendering, sub-100ms capture, sub-2s app launch with session restore, responsive at 200+ nodes
- **Accessibility:** WCAG 2.1 AA — full keyboard navigation, ARIA roles on all custom widgets, visible focus indicators, reduced motion support
- **Data Integrity:** Atomic writes, WAL mode SQLite, zero data loss on crash/refresh/termination, portable single-file database
- **Reliability:** Offline-first, no external dependencies, immediate persistence of all CRUD operations

**Scale & Complexity:**
- Primary domain: Full-stack local web application (React SPA + Fastify API + SQLite)
- Complexity level: Low infrastructure / Medium frontend interaction
- Estimated architectural components: ~12-15 (API routes, database layer, tree engine, cascade engine, session manager, markdown editor integration, inbox system, search index, state management, UI component library)

### Technical Constraints & Dependencies

- **Stack is fixed:** React + TanStack Router/Query, Fastify, SQLite, Shadcn/ui + Tailwind, Tiptap, JetBrains Mono
- **Single-user, single-machine:** No auth, no CORS, no multi-tenancy, no deployment pipeline
- **Offline-only:** No network calls, no cloud sync, no external APIs
- **Desktop-only:** Minimum 1280x720 viewport, no mobile/tablet support
- **Fixed hierarchy depth:** Exactly 4 levels — no dynamic nesting

### Cross-Cutting Concerns Identified

1. **Cascade completion logic** — Affects every node CRUD operation. Must propagate up (complete parent when all children done) and down (reopen parent when any child reopened). Touches data layer, API, and UI state.
2. **Session state persistence** — Last active project, task, scroll position, open tabs, tree expand/collapse state. Spans database, API, and frontend state management.
3. **Tree node consistency** — Every tree operation (create, rename, delete, move, reorder, indent/outdent) must maintain hierarchy integrity, update ordering, and trigger cascade checks.
4. **Auto-save** — Markdown bodies auto-save with 500ms debounce. Must be silent, reliable, and never lose more than 500ms of content on crash.
5. **Keyboard/focus management** — Keyboard interactions span all UI zones (capture bar, sidebar, tree, detail panel, tabs). Focus must be tracked and restored across zone transitions.
6. **Undo stack** — App-level undo for tree operations (Ctrl+Z). Clears on project switch. Separate from Tiptap's built-in undo.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack local web application — React SPA (client-only, no SSR) communicating with a local Fastify API server over localhost. Two distinct technology domains: frontend (React ecosystem) and backend (Node.js API + SQLite).

### Starter Options Considered

| Option | Pros | Cons |
|---|---|---|
| TanStack CLI (`--router-only`) | Official, current versions, add-on support for shadcn + query | Doesn't cover backend |
| Community starter (mattiaz9) | Everything in one repo | Maintenance risk, may lag behind versions |
| Manual Vite scaffold | Full control | More setup, no preconfigured integration |

### Selected Starter: TanStack CLI (Router-Only SPA)

**Rationale for Selection:**
Official TanStack tooling ensures compatibility between Router and Query. The `--router-only` flag creates a pure SPA without SSR — matching the localhost-only architecture. Add-ons for shadcn/ui and TanStack Query eliminate manual integration. The Fastify backend is simple enough to scaffold manually.

**Initialization Commands:**

```bash
# Frontend (React SPA)
npx @tanstack/cli create todo-app --router-only --add-ons shadcn,tanstack-query

# Backend (Fastify API) — manual setup within monorepo
mkdir packages/server && cd packages/server
npm init -y
npm install fastify better-sqlite3 drizzle-orm
npm install -D typescript @types/better-sqlite3 drizzle-kit tsx
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript throughout (strict mode). Node.js runtime for both frontend dev server and backend API.

**Styling Solution:**
Tailwind CSS v4 configured via Shadcn/ui add-on. CSS custom properties for theming (dark mode ready). Component primitives from Radix UI via Shadcn.

**Build Tooling:**
Vite for frontend bundling with HMR. TanStack Router Vite plugin for file-based route generation. tsx for backend TypeScript execution in development.

**Testing Framework:**
Not included by starter — to be decided in architectural decisions (likely Vitest for unit tests, Playwright for E2E).

**Code Organization:**
File-based routing under `src/routes/`. Shadcn components in `src/components/ui/`. Monorepo structure with pnpm workspaces separating frontend and backend packages.

**Development Experience:**
Vite HMR for instant frontend updates. Type-safe route generation at build time. Separate backend dev server with tsx watch mode.

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data model: Single `nodes` table with self-referencing `parent_id`
- ORM: Drizzle ORM + better-sqlite3
- API: Resource-based REST routes (`/api/nodes`, `/api/inbox`, `/api/session`, `/api/search`)
- State management: TanStack Query (server state) + Zustand (UI state)
- Validation: Zod schemas shared between client and server

**Important Decisions (Shape Architecture):**
- Monorepo: pnpm workspaces with `client`, `server`, `shared` packages
- Tree virtualization: @tanstack/react-virtual for 200+ node performance
- Testing: Vitest + Playwright + Testing Library
- Process management: `concurrently` for single `npm run dev`
- Database location: `~/.todo-bmad-style/data.db`

**Deferred Decisions (Post-MVP):**
- Dark mode theming (CSS custom properties foundation built in from day one)
- Data export/import format
- Optional device sync strategy
- Keyboard shortcut customization storage

### Data Architecture

**Data Model: Single `nodes` table with self-referencing parent_id**
- One table for all hierarchy levels (project, effort, task, subtask)
- `type` enum column distinguishes the level (project | effort | task | subtask)
- `parent_id` references the same table (NULL for projects)
- `sort_order` integer for drag-and-drop reordering within a parent
- `is_completed` boolean with cascade logic handled at the application layer
- `markdown_body` text column for node notes
- `created_at`, `updated_at` timestamps
- Rationale: All node types share identical fields. Single table simplifies queries, enables recursive CTEs for tree traversal, and keeps cascade completion logic straightforward.

**ORM & Driver: Drizzle ORM + better-sqlite3**
- Drizzle provides type-safe schema definitions and query builder
- better-sqlite3 provides synchronous, high-performance SQLite access
- Drizzle Kit manages schema migrations from TypeScript definitions
- SQLite WAL mode enabled for crash resilience and atomic writes

**Validation: Zod**
- Shared Zod schemas in the `shared` package define API contracts
- Used for Fastify request validation (via fastify-type-provider-zod)
- Used for frontend form/input validation
- Single source of truth for data shapes across client and server

**Caching: TanStack Query**
- Client-side caching handled entirely by TanStack Query
- No server-side cache needed — single user, local database, sub-millisecond SQLite reads
- Stale-while-revalidate pattern for tree data
- Optimistic updates for tree operations (create, complete, reorder) to maintain sub-200ms perceived response

**Additional tables:**
- `inbox_items` — captured thoughts before promotion to nodes (id, text, created_at)
- `session_state` — single-row table for resume state (active_project_id, active_node_id, scroll_position, open_tab_ids, sidebar_collapsed, sidebar_width)
- `tree_view_state` — expand/collapse state per node (node_id, is_expanded)

### Authentication & Security

**Not applicable.** Single-user application running on localhost. No authentication, authorization, encryption, or API security required. Fastify listens on `127.0.0.1` only — not exposed to the network.

### API & Communication Patterns

**API Design: Resource-based REST**
- `GET/POST /api/nodes` — list roots (projects) / create node
- `GET/PATCH/DELETE /api/nodes/:id` — read / update / delete node
- `GET /api/nodes/:id/children` — get children of a node
- `PATCH /api/nodes/:id/move` — move node to new parent/position
- `PATCH /api/nodes/:id/reorder` — change sort order within parent
- `POST /api/nodes/:id/complete` — toggle completion (triggers cascade)
- `GET/POST /api/inbox` — list / create inbox items
- `POST /api/inbox/:id/promote` — promote inbox item to node at target location
- `DELETE /api/inbox/:id` — delete inbox item
- `GET/PUT /api/session` — get / update session state
- `GET /api/search?q=` — full-text search across nodes and markdown

**Error Handling: Fastify built-in**
- Fastify's default error handler with consistent JSON responses: `{ error: string, statusCode: number }`
- Zod validation errors automatically formatted by fastify-type-provider-zod
- No custom error middleware needed

**API Documentation: Not required**
- Shared TypeScript types and Zod schemas in the `shared` package serve as the API contract
- Personal tool — no external consumers

### Frontend Architecture

**State Management: TanStack Query + Zustand**
- TanStack Query: all server state (nodes, inbox items, session, search results). Handles caching, background refetching, optimistic updates.
- Zustand: UI-only state (focused node, active panel, sidebar state, keyboard navigation mode, undo stack). Lightweight, no boilerplate, performant.
- Clear boundary: if it comes from the API, it's in Query. If it's UI-only, it's in Zustand.

**Component Architecture:**
- `src/components/ui/` — Shadcn/ui primitives (owned, customizable)
- `src/components/features/` — Feature components (TreeView, DetailPanel, CaptureBar, InboxList, ProjectTabs, Sidebar)
- `src/hooks/` — Shared logic hooks (useTreeNavigation, useCascadeCompletion, useKeyboardShortcuts, useAutoSave, useSessionRestore)
- `src/routes/` — File-based routes via TanStack Router (minimal — likely just a root route and inbox route)

**Tree Virtualization: @tanstack/react-virtual**
- Virtualized rendering for trees with 200+ visible nodes
- Stays in TanStack ecosystem, consistent API
- Simple rendering for small trees, virtualization activates for large ones

**Performance Optimization:**
- Optimistic updates via TanStack Query for all tree mutations
- Debounced markdown auto-save (500ms)
- Virtualized tree for large projects
- Vite code splitting per route (minimal benefit here but free via file-based routing)

### Infrastructure & Development

**Monorepo Structure: pnpm workspaces**
```
todo-bmad-style/
├── packages/
│   ├── client/          # React SPA (TanStack CLI output)
│   ├── server/          # Fastify API + SQLite + Drizzle
│   └── shared/          # Zod schemas, TypeScript types, constants
├── pnpm-workspace.yaml
├── package.json         # Root scripts (dev, build, test)
└── tsconfig.base.json   # Shared TypeScript config
```

**Process Management: concurrently**
- Single `npm run dev` starts both Vite dev server and Fastify backend
- Root `package.json` script: `concurrently "pnpm --filter client dev" "pnpm --filter server dev"`

**Testing Strategy:**
- Vitest — unit tests for cascade logic, tree operations, API route handlers, Zod schemas
- Playwright — E2E tests for user journeys (keyboard navigation, capture flow, cascade completion)
- Testing Library — React component tests for interactive components

**Logging: Fastify Pino (built-in)**
- Structured JSON logging via Pino
- Pretty-print in development
- No production logging infrastructure

**Database Location:**
- Default: `~/.todo-bmad-style/data.db`
- Configurable via `DB_PATH` environment variable
- Separate from source code for clean git history

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo setup with pnpm workspaces and shared package
2. Drizzle schema definition + SQLite database initialization
3. Fastify API routes with Zod validation
4. React app with TanStack Query hooks connecting to API
5. Zustand stores for UI state
6. Feature components (TreeView first, then DetailPanel, CaptureBar, Inbox)
7. Keyboard navigation and focus management
8. Cascade completion logic (spans API + Query + UI)
9. Session state persistence and restore
10. Search implementation

**Cross-Component Dependencies:**
- Shared Zod schemas are the API contract — changes propagate to both client and server
- Cascade completion spans three layers: Drizzle query → Fastify route → TanStack Query invalidation → UI update
- Session state touches database, API, Zustand (UI restore), and TanStack Query (data restore)
- Undo stack (Zustand) must coordinate with TanStack Query mutations for rollback

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 major categories where AI agents could make incompatible choices — naming, structure, formats, state management, and process handling.

### Naming Patterns

**Database Naming Conventions (Drizzle schema):**
- Tables: `snake_case`, plural — `nodes`, `inbox_items`, `session_state`, `tree_view_state`
- Columns: `snake_case` — `parent_id`, `sort_order`, `is_completed`, `markdown_body`, `created_at`
- Indexes: `idx_{table}_{column}` — `idx_nodes_parent_id`

**API Naming Conventions:**
- Endpoints: `/api/{resource}` plural, lowercase — `/api/nodes`, `/api/inbox`
- Route params: `:id` format (Fastify default)
- Query params: lowercase — `?q=search`
- JSON fields in request/response: `camelCase` — `parentId`, `sortOrder`, `isCompleted`, `markdownBody`

**Code Naming Conventions:**
- Files: `kebab-case.ts` / `kebab-case.tsx` — `tree-view.tsx`, `use-cascade-completion.ts`
- Components: `PascalCase` — `TreeView`, `DetailPanel`, `CaptureBar`
- Functions/hooks: `camelCase` — `useTreeNavigation`, `getNodeChildren`
- Variables/constants: `camelCase` / `UPPER_SNAKE_CASE` for true constants — `activeNodeId`, `MAX_DEPTH`
- Types/interfaces: `PascalCase` — `Node`, `InboxItem`, `SessionState`
- Zod schemas: `camelCase` with `Schema` suffix — `createNodeSchema`, `updateNodeSchema`

**Conversion Rule:** Database uses `snake_case`, API/frontend uses `camelCase`. Drizzle handles the mapping in the schema definition.

### Structure Patterns

**Project Organization:**
- Tests: co-located with source files — `tree-view.tsx` → `tree-view.test.tsx` in same directory
- E2E tests: `packages/client/e2e/` organized by user journey
- Components: organized by feature, not by type

**Client Component Structure:**
```
src/components/features/
├── tree-view/
│   ├── tree-view.tsx
│   ├── tree-view.test.tsx
│   ├── tree-row.tsx
│   └── tree-row.test.tsx
├── detail-panel/
│   ├── detail-panel.tsx
│   ├── detail-tabs.tsx
│   └── markdown-editor.tsx
├── capture-bar/
│   └── capture-bar.tsx
├── inbox/
│   └── inbox-list.tsx
├── sidebar/
│   └── sidebar.tsx
└── project-tabs/
    └── project-tabs.tsx
```

**Server Organization:**
```
packages/server/src/
├── routes/
│   ├── nodes.route.ts
│   ├── inbox.route.ts
│   ├── session.route.ts
│   └── search.route.ts
├── services/
│   ├── node.service.ts        # Business logic (cascade, reorder)
│   ├── inbox.service.ts
│   ├── session.service.ts
│   └── search.service.ts
├── db/
│   ├── schema.ts              # Drizzle schema definitions
│   ├── migrations/            # Drizzle Kit migrations
│   └── index.ts               # DB connection setup
└── index.ts                   # Fastify server entry
```

### Format Patterns

**API Response Formats:**
- Success: return data directly — `{ id, title, parentId, ... }` or `[{ ... }, { ... }]`
- No wrapper objects — unnecessary for single-user local app
- Empty results: `[]` for lists, `404` for missing single items

**Error Response Format (Fastify default):**
```json
{ "statusCode": 404, "error": "Not Found", "message": "Node not found" }
```

**Data Exchange Formats:**
- Dates: ISO 8601 strings in JSON — `"2026-03-09T14:30:00.000Z"`. Stored as ISO strings in SQLite.
- IDs: UUIDs (v4) as strings — generated server-side. Avoids sequential ID guessing and simplifies optimistic creation on the frontend.
- Booleans: `true`/`false` in JSON, `0`/`1` in SQLite (standard SQLite behavior, Drizzle maps automatically)
- Nulls: explicit `null` in JSON for absent optional fields, never `undefined`

### State Management Patterns

**TanStack Query Key Convention:**
```typescript
['nodes']                     // all root nodes (projects)
['nodes', nodeId]             // single node
['nodes', nodeId, 'children'] // children of a node
['inbox']                     // all inbox items
['session']                   // session state
['search', query]             // search results
```

**Zustand Store Organization — one store per concern:**
- `useUIStore` — focused node, active panel, keyboard mode
- `useSidebarStore` — collapsed state, width
- `useUndoStore` — undo/redo stack for tree operations
- No global mega-store — small, focused stores

**Mutation Pattern — optimistic updates:**
All tree mutations (create, complete, rename, move, reorder) use TanStack Query's `onMutate` for instant UI feedback, `onError` for rollback, `onSettled` for re-fetch.

### Process Patterns

**Error Handling:**
- API errors → TanStack Query handles retry (1 retry, no exponential backoff for local)
- UI errors → React Error Boundary at the layout level, not per-component
- Validation errors → Zod parse at API boundary, surface to user inline
- Never show raw error objects to the user

**Loading State Patterns:**
- No loading spinners for local operations (should be instant)
- Skeleton/placeholder only for initial app load (session restore)
- TanStack Query's `isLoading` vs `isFetching` — use `isFetching` only for background refreshes (no UI indicator)

**Auto-Save Pattern:**
- Markdown editor `onUpdate` → debounce 500ms → TanStack Query mutation → no UI feedback
- If mutation fails, retry silently. If retry fails, show subtle inline error on the editor.

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow the naming conventions exactly — no ad-hoc naming for "temporary" code
- Co-locate tests with source files — never create a separate `__tests__` directory
- Use the established TanStack Query key convention — never invent new key structures
- Use Zod schemas from the `shared` package for all API request/response validation — never define inline types for API contracts
- Use optimistic updates for all tree mutations — never rely on server response before updating UI
- Use Zustand stores for UI state — never use React Context or useState for state shared across components

**Anti-Patterns to Avoid:**
- Creating `utils.ts` or `helpers.ts` catch-all files — put utilities in the feature that uses them
- Using `any` type — always define proper types, leverage Zod inference where possible
- Mixing `snake_case` and `camelCase` in the same layer — respect the conversion boundary (DB = snake, everything else = camel)
- Adding loading spinners for local database operations — the app should feel instant
- Creating wrapper abstractions around Fastify, Drizzle, or TanStack Query — use them directly

## Project Structure & Boundaries

### Complete Project Directory Structure

```
todo-bmad-style/
├── package.json                          # Root scripts (dev, build, test, lint)
├── pnpm-workspace.yaml                   # Workspace: packages/*
├── tsconfig.base.json                    # Shared TypeScript config (strict, paths)
├── .gitignore
├── .env.example                          # DB_PATH, PORT defaults
├── .prettierrc                           # Prettier config
├── .eslintrc.cjs                         # ESLint config (root)
│
├── packages/
│   ├── shared/                           # Shared types, schemas, constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Barrel export
│   │       ├── schemas/
│   │       │   ├── node.schema.ts        # createNodeSchema, updateNodeSchema, moveNodeSchema
│   │       │   ├── inbox.schema.ts       # createInboxItemSchema, promoteInboxItemSchema
│   │       │   ├── session.schema.ts     # sessionStateSchema
│   │       │   └── search.schema.ts      # searchQuerySchema
│   │       ├── types/
│   │       │   ├── node.types.ts         # Node, NodeType, CreateNode, UpdateNode
│   │       │   ├── inbox.types.ts        # InboxItem, CreateInboxItem
│   │       │   ├── session.types.ts      # SessionState
│   │       │   └── search.types.ts       # SearchResult, SearchQuery
│   │       └── constants/
│   │           ├── hierarchy.ts          # MAX_DEPTH = 4, NodeType enum
│   │           └── api.ts               # API_PREFIX = '/api', route paths
│   │
│   ├── server/                           # Fastify API + SQLite + Drizzle
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts             # Drizzle Kit config
│   │   └── src/
│   │       ├── index.ts                  # Fastify server entry, plugin registration
│   │       ├── db/
│   │       │   ├── index.ts              # DB connection (better-sqlite3 + Drizzle), WAL mode
│   │       │   ├── schema.ts             # Drizzle table definitions (nodes, inbox_items, session_state, tree_view_state)
│   │       │   ├── seed.ts               # Optional dev seed data
│   │       │   └── migrations/           # Drizzle Kit generated migrations
│   │       ├── routes/
│   │       │   ├── nodes.route.ts        # CRUD, children, move, reorder, complete
│   │       │   ├── nodes.route.test.ts
│   │       │   ├── inbox.route.ts        # CRUD, promote
│   │       │   ├── inbox.route.test.ts
│   │       │   ├── session.route.ts      # GET/PUT session state
│   │       │   ├── session.route.test.ts
│   │       │   ├── search.route.ts       # Full-text search
│   │       │   └── search.route.test.ts
│   │       └── services/
│   │           ├── node.service.ts       # Cascade completion, reorder, move, hierarchy validation
│   │           ├── node.service.test.ts
│   │           ├── inbox.service.ts      # Inbox CRUD, promote to node
│   │           ├── inbox.service.test.ts
│   │           ├── session.service.ts    # Session state persistence
│   │           ├── session.service.test.ts
│   │           ├── search.service.ts     # SQLite FTS or LIKE-based search
│   │           └── search.service.test.ts
│   │
│   └── client/                           # React SPA (TanStack CLI output)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── e2e/                          # Playwright E2E tests
│       │   ├── playwright.config.ts
│       │   ├── resume-and-work.spec.ts   # Journey 1
│       │   ├── capture-and-organize.spec.ts # Journey 2
│       │   ├── plan-new-project.spec.ts  # Journey 3
│       │   └── complete-and-progress.spec.ts # Journey 4
│       └── src/
│           ├── main.tsx                  # App entry, QueryClientProvider, RouterProvider
│           ├── styles/
│           │   └── globals.css           # Tailwind directives, JetBrains Mono import, CSS custom properties
│           ├── routes/
│           │   ├── __root.tsx            # Root layout: CaptureBar + ProjectTabs + main content
│           │   ├── index.tsx             # Main view: Sidebar + TreeView + DetailPanel
│           │   └── inbox.tsx             # Inbox view (replaces tree with inbox list)
│           ├── components/
│           │   ├── ui/                   # Shadcn/ui primitives (tabs, checkbox, command, breadcrumb, etc.)
│           │   └── features/
│           │       ├── tree-view/
│           │       │   ├── tree-view.tsx          # Main tree container with virtualization
│           │       │   ├── tree-view.test.tsx
│           │       │   ├── tree-row.tsx            # Single tree row (chevron + checkbox + name + progress)
│           │       │   ├── tree-row.test.tsx
│           │       │   └── inline-effort-markdown.tsx  # Read-only effort markdown below effort rows
│           │       ├── detail-panel/
│           │       │   ├── detail-panel.tsx        # Slide-over panel container
│           │       │   ├── detail-panel.test.tsx
│           │       │   ├── detail-tabs.tsx         # Tabbed task views
│           │       │   ├── markdown-editor.tsx     # Tiptap WYSIWYG editor
│           │       │   ├── markdown-editor.test.tsx
│           │       │   └── breadcrumb-nav.tsx      # Clickable hierarchy breadcrumb
│           │       ├── capture-bar/
│           │       │   ├── capture-bar.tsx         # Quick capture input
│           │       │   └── capture-bar.test.tsx
│           │       ├── inbox/
│           │       │   ├── inbox-list.tsx          # Inbox items with move-to actions
│           │       │   └── inbox-list.test.tsx
│           │       ├── sidebar/
│           │       │   ├── sidebar.tsx             # Collapsible sidebar (Inbox, Pinned, Recent, On Hold)
│           │       │   └── sidebar.test.tsx
│           │       ├── project-tabs/
│           │       │   ├── project-tabs.tsx        # Browser-style project tab bar
│           │       │   └── project-tabs.test.tsx
│           │       └── search/
│           │           ├── search-dialog.tsx       # Command palette search (Shadcn Command)
│           │           └── search-dialog.test.tsx
│           ├── hooks/
│           │   ├── use-tree-navigation.ts          # Arrow key navigation, expand/collapse
│           │   ├── use-tree-navigation.test.ts
│           │   ├── use-cascade-completion.ts       # Optimistic cascade UI updates
│           │   ├── use-keyboard-shortcuts.ts       # Global keyboard shortcut registration
│           │   ├── use-keyboard-shortcuts.test.ts
│           │   ├── use-auto-save.ts                # Debounced markdown save (500ms)
│           │   ├── use-session-restore.ts          # App launch session state restore
│           │   └── use-focus-management.ts         # Zone focus tracking and restoration
│           ├── stores/
│           │   ├── ui-store.ts                     # Focused node, active panel, keyboard mode
│           │   ├── sidebar-store.ts                # Sidebar collapsed state, width
│           │   └── undo-store.ts                   # Tree operation undo/redo stack
│           ├── api/
│           │   ├── client.ts                       # Fetch wrapper (base URL, JSON headers)
│           │   ├── nodes.api.ts                    # Node CRUD, move, reorder, complete
│           │   ├── inbox.api.ts                    # Inbox CRUD, promote
│           │   ├── session.api.ts                  # Session GET/PUT
│           │   └── search.api.ts                   # Search query
│           └── queries/
│               ├── node-queries.ts                 # TanStack Query hooks (useNodes, useNode, useNodeChildren)
│               ├── inbox-queries.ts                # useInboxItems, useCreateInboxItem, usePromoteInboxItem
│               ├── session-queries.ts              # useSession, useUpdateSession
│               └── search-queries.ts               # useSearch
```

### Architectural Boundaries

**API Boundary:**
- All data flows through the REST API — the client never accesses SQLite directly
- `packages/shared/` defines the contract (Zod schemas + TypeScript types)
- Client `api/` layer is the single point of HTTP communication
- Server `routes/` layer is the single entry point — routes delegate to services

**Service Boundary:**
- `routes/` handle HTTP concerns (request parsing, response formatting, status codes)
- `services/` handle business logic (cascade completion, hierarchy validation, reordering)
- `db/` handles data access (Drizzle queries, schema, migrations)
- Services never know about HTTP. Routes never know about SQL.

**State Boundary:**
- TanStack Query = server state (anything persisted in SQLite)
- Zustand stores = UI state (anything that lives only in the browser session)
- No overlap — a piece of state lives in one place only

**Data Flow:**
```
User Action → React Component → TanStack Query Mutation (optimistic) → API Client → Fastify Route → Service → Drizzle → SQLite
                                                                                                                    ↓
User sees update ← React Component ← TanStack Query Cache Update ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Response ← ─ ┘
```

### Requirements to Structure Mapping

**FR Category → Architecture Mapping:**

| FR Category | Primary Location |
|---|---|
| Hierarchy Management (FR1-FR8) | `server/services/node.service.ts` + `client/features/tree-view/` |
| Completion & Status (FR9-FR13) | `server/services/node.service.ts` + `client/hooks/use-cascade-completion.ts` |
| Markdown & Notes (FR14-FR17) | `client/features/detail-panel/markdown-editor.tsx` + node API |
| Tree Navigation (FR18-FR23) | `client/features/tree-view/` + `client/hooks/use-tree-navigation.ts` |
| Layout & Sidebar (FR24-FR28) | `client/features/sidebar/` + `client/routes/` |
| Detail Panel (FR29-FR33) | `client/features/detail-panel/` |
| Quick Capture & Inbox (FR34-FR39) | `client/features/capture-bar/` + `client/features/inbox/` + `server/routes/inbox.route.ts` |
| Search (FR40-FR42) | `server/routes/search.route.ts` + `client/features/search/` |
| Session & Resume (FR43-FR44) | `server/routes/session.route.ts` + `client/hooks/use-session-restore.ts` |
| Data Persistence (FR45-FR47) | `server/db/` (Drizzle + SQLite) |

**Cross-Cutting Concerns Mapping:**

| Concern | Files Involved |
|---|---|
| Cascade completion | `server/services/node.service.ts` → `shared/schemas/node.schema.ts` → `client/hooks/use-cascade-completion.ts` → `client/queries/node-queries.ts` |
| Session persistence | `server/services/session.service.ts` → `client/hooks/use-session-restore.ts` → `client/stores/ui-store.ts` |
| Auto-save | `client/hooks/use-auto-save.ts` → `client/queries/node-queries.ts` → `server/routes/nodes.route.ts` |
| Keyboard navigation | `client/hooks/use-keyboard-shortcuts.ts` → `client/hooks/use-tree-navigation.ts` → `client/hooks/use-focus-management.ts` |
| Undo stack | `client/stores/undo-store.ts` → `client/queries/node-queries.ts` (mutation rollback) |

### Development Workflow

**`pnpm dev` (root):** Starts both processes via `concurrently`
- Vite dev server → `http://localhost:5173` (client)
- Fastify server → `http://localhost:3001` (API)
- Client proxies `/api/*` requests to Fastify in Vite config

**`pnpm build` (root):** Builds both packages
- Client: Vite builds static assets to `packages/client/dist/`
- Server: TypeScript compiles to `packages/server/dist/`

**`pnpm test` (root):** Runs all tests
- `pnpm test:unit` → Vitest (co-located tests in client + server)
- `pnpm test:e2e` → Playwright (requires both servers running)

**`pnpm db:migrate` (server):** Runs Drizzle Kit migrations
**`pnpm db:studio` (server):** Opens Drizzle Studio for database inspection

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices are compatible. React + TanStack + Vite (frontend), Fastify + Drizzle + better-sqlite3 (backend), Shadcn/ui + Tailwind + Radix (design system), Tiptap (editor), Zustand (UI state) — no version conflicts or integration issues. Official tooling (TanStack CLI, Shadcn CLI) ensures correct setup.

**Pattern Consistency:** Naming conventions are consistent across layers with a clear conversion boundary (DB `snake_case` → API/frontend `camelCase`). File organization patterns match Shadcn/ui conventions. Co-located tests align with feature-based structure. Query key patterns mirror API route structure.

**Structure Alignment:** Monorepo structure supports the shared-schema contract pattern. Route → Service → DB layering respects defined boundaries. Feature-based component folders map cleanly to FR categories.

### Requirements Coverage Validation

**Functional Requirements:** All 47 FRs across 10 categories are fully covered by architectural decisions, project structure, and component mapping. Each FR category maps to specific files and directories with clear ownership.

**Non-Functional Requirements:** All performance targets (sub-200ms tree ops, sub-300ms markdown, sub-100ms capture, sub-2s launch) are addressed through optimistic updates, local SQLite, virtualized rendering, and session restore. Accessibility (WCAG 2.1 AA) is addressed through Radix UI primitives and dedicated focus management hooks. Data integrity is addressed through SQLite WAL mode and Drizzle transactions.

### Implementation Readiness Validation

**Decision Completeness:** All critical and important decisions are documented with rationale. Technology stack is fully specified. Integration patterns are defined.

**Structure Completeness:** Complete file-level directory structure defined for all three packages. All feature components, hooks, stores, API clients, and query hooks are specified.

**Pattern Completeness:** Naming, structure, format, state management, and process patterns are all defined with concrete examples and anti-patterns.

### Gap Analysis Results

**No critical gaps.** One minor gap identified:

- Vite proxy configuration for `/api/*` forwarding to Fastify should be documented as part of the first implementation story. Standard config: `server.proxy['/api'] = 'http://localhost:3001'` in `vite.config.ts`.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with rationale
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Format patterns specified
- [x] State management patterns documented
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Simple, well-defined architecture with clear boundaries
- Single-user local app eliminates entire categories of complexity (auth, CORS, deployment, scaling)
- Proven technology stack with strong TypeScript integration throughout
- Shared Zod schemas prevent API contract drift between client and server
- Optimistic update pattern ensures the app feels instant despite being a client-server architecture

**Areas for Future Enhancement:**
- Full-text search implementation (SQLite FTS5 vs LIKE — can be decided during implementation)
- Undo stack implementation details (what operations are undoable, stack size limits)
- Drag-and-drop library choice (Phase 2 — dnd-kit or react-beautiful-dnd successor)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries — files go where the structure says
- Use Zod schemas from `shared` for all API contracts — never define inline types
- Refer to this document for all architectural questions

**First Implementation Priority:**
1. Initialize monorepo with pnpm workspaces
2. Scaffold frontend with `npx @tanstack/cli create todo-app --router-only --add-ons shadcn,tanstack-query`
3. Set up server package with Fastify + Drizzle + better-sqlite3
4. Create shared package with initial Zod schemas and types
5. Configure Vite proxy and `concurrently` dev script
6. Define Drizzle schema and run initial migration
