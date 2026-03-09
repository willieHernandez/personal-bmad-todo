# Story 1.2: Node Data Model & CRUD API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my project hierarchy data to be stored reliably in a local database with a complete API,
so that all hierarchy operations persist immediately and survive app restarts.

## Acceptance Criteria

1. A `nodes` table exists with columns: `id` (UUID), `title`, `type` (project|effort|task|subtask), `parent_id` (self-referencing, NULL for projects), `sort_order` (integer), `is_completed` (boolean), `markdown_body` (text), `created_at`, `updated_at`
2. A `tree_view_state` table exists with columns: `node_id`, `is_expanded` (boolean)
3. SQLite WAL mode is enabled for crash resilience
4. The database is created at `~/.todo-bmad-style/data.db` (configurable via `DB_PATH` env var)
5. Drizzle schema maps `snake_case` DB columns to `camelCase` in TypeScript
6. Zod schemas in the shared package define `createNodeSchema`, `updateNodeSchema`, and `moveNodeSchema`
7. `GET /api/nodes` returns all root nodes (projects)
8. `POST /api/nodes` creates a new node with validated input
9. `GET /api/nodes/:id` returns a single node
10. `PATCH /api/nodes/:id` updates a node's title or markdown body
11. `DELETE /api/nodes/:id` deletes a node and all its descendants
12. `GET /api/nodes/:id/children` returns children of a node sorted by `sort_order`
13. `PATCH /api/nodes/:id/reorder` updates a node's `sort_order` within its parent
14. `PATCH /api/nodes/:id/move` moves a node to a new parent at a specified position
15. All write operations are atomic (no partial saves)
16. Hierarchy validation enforces: projects have no parent, efforts have project parent, tasks have effort parent, subtasks have task parent

## Tasks / Subtasks

- [x] Task 1: Define Drizzle schema for `nodes` table (AC: #1, #3, #4, #5)
  - [x] 1.1 Define `nodes` table in `packages/server/src/db/schema.ts` with all columns: `id` (text, UUID primary key), `title` (text, not null), `type` (text, enum: project|effort|task|subtask), `parent_id` (text, self-referencing foreign key, nullable), `sort_order` (integer, not null, default 0), `is_completed` (integer, boolean 0/1, default 0), `markdown_body` (text, default ''), `created_at` (text, ISO 8601), `updated_at` (text, ISO 8601)
  - [x] 1.2 Add indexes: `idx_nodes_parent_id` on `parent_id`, `idx_nodes_type` on `type`
  - [x] 1.3 Verify WAL mode is already enabled in `packages/server/src/db/index.ts` (done in Story 1.1)
  - [x] 1.4 Verify DB path uses `DB_PATH` env var with fallback to `~/.todo-bmad-style/data.db` (done in Story 1.1)

- [x] Task 2: Define Drizzle schema for `tree_view_state` table (AC: #2)
  - [x] 2.1 Define `tree_view_state` table in `packages/server/src/db/schema.ts` with columns: `node_id` (text, primary key, references nodes.id with `onDelete: 'cascade'`), `is_expanded` (integer, boolean 0/1, default 1)

- [x] Task 3: Database setup and schema sync (AC: #1, #2, #4)
  - [x] 3.1 Add `db:push` and `db:generate` scripts to `packages/server/package.json` (`drizzle-kit push` for dev, `drizzle-kit generate` for future production migrations)
  - [x] 3.2 Ensure DB directory exists before opening connection: add `mkdirSync(dirname(dbPath), { recursive: true })` to `packages/server/src/db/index.ts` before `new Database(dbPath)`
  - [x] 3.3 Add `sqlite.pragma('foreign_keys = ON')` to `db/index.ts` after WAL mode pragma
  - [x] 3.4 Use `drizzle-kit push` to sync schema to SQLite during development (no migration files needed for greenfield)
  - [x] 3.5 Verify tables are created correctly in SQLite with correct columns, indexes, and foreign keys

- [x] Task 4: Define Zod schemas in shared package (AC: #6)
  - [x] 4.1 Define `createNodeSchema` in `packages/shared/src/schemas/node.schema.ts` — validates: `title` (string, min 1), `type` (enum: project|effort|task|subtask), `parentId` (string UUID, nullable/optional for projects)
  - [x] 4.2 Define `updateNodeSchema` — validates: `title` (string, optional), `markdownBody` (string, optional) — at least one field required
  - [x] 4.3 Define `moveNodeSchema` — validates: `newParentId` (string UUID), `sortOrder` (integer, min 0)
  - [x] 4.4 Define `reorderNodeSchema` — validates: `sortOrder` (integer, min 0)
  - [x] 4.5 Define `nodeResponseSchema` — full node shape for API responses (camelCase fields)
  - [x] 4.6 Export inferred TypeScript types: `CreateNode`, `UpdateNode`, `MoveNode`, `NodeResponse`
  - [x] 4.7 Update `packages/shared/src/types/node.types.ts` with type exports using `z.infer`
  - [x] 4.8 Update `packages/shared/src/index.ts` barrel export to include all new schemas and types

- [x] Task 5: Implement node service layer (AC: #11, #15, #16)
  - [x] 5.1 Create `packages/server/src/services/node.service.ts`
  - [x] 5.2 Implement `getProjects()` — query all nodes where `parent_id IS NULL` and `type = 'project'`
  - [x] 5.3 Implement `getNodeById(id)` — query single node by UUID, throw 404 if not found
  - [x] 5.4 Implement `getChildren(parentId)` — query children of a node sorted by `sort_order` ASC
  - [x] 5.5 Implement `createNode(data)` — generate UUID via `crypto.randomUUID()`, validate hierarchy rules, compute `sort_order` (append to end of sibling list), insert node, return created node
  - [x] 5.6 Implement `updateNode(id, data)` — update title and/or markdown_body, update `updated_at`, return updated node
  - [x] 5.7 Implement `deleteNode(id)` — issue a single `DELETE FROM nodes WHERE id = ?`; SQLite `ON DELETE CASCADE` (with `PRAGMA foreign_keys = ON`) automatically removes all descendants and their `tree_view_state` entries. Verify the node exists first (404 if not). No manual recursive deletion needed.
  - [x] 5.8 Implement `reorderNode(id, newSortOrder)` — update sort_order using contiguous re-index strategy: fetch all siblings sorted by current sort_order, remove the target node, insert it at newSortOrder position, then re-assign 0-based contiguous indexes to all siblings. Wrap in transaction.
  - [x] 5.9 Implement `moveNode(id, newParentId, sortOrder)` — validate hierarchy rules for new parent, update parent_id and sort_order, fix sort_order gaps in old and new parent, wrap in transaction
  - [x] 5.10 Implement hierarchy validation helper: `validateHierarchy(nodeType, parentType)` — projects have no parent, efforts require project parent, tasks require effort parent, subtasks require task parent

- [x] Task 6: Implement API routes (AC: #7, #8, #9, #10, #11, #12, #13, #14)
  - [x] 6.1 Create `packages/server/src/routes/nodes.route.ts` as a Fastify plugin
  - [x] 6.2 Configure `fastify-type-provider-zod` for request validation
  - [x] 6.3 Implement `GET /api/nodes` — calls `getProjects()`, returns array of node objects
  - [x] 6.4 Implement `POST /api/nodes` — validates body with `createNodeSchema`, calls `createNode()`, returns 201 with created node
  - [x] 6.5 Implement `GET /api/nodes/:id` — calls `getNodeById()`, returns node or 404
  - [x] 6.6 Implement `PATCH /api/nodes/:id` — validates body with `updateNodeSchema`, calls `updateNode()`, returns updated node
  - [x] 6.7 Implement `DELETE /api/nodes/:id` — calls `deleteNode()`, returns 204
  - [x] 6.8 Implement `GET /api/nodes/:id/children` — calls `getChildren()`, returns sorted array
  - [x] 6.9 Implement `PATCH /api/nodes/:id/reorder` — validates body with `reorderNodeSchema`, calls `reorderNode()`, returns updated node
  - [x] 6.10 Implement `PATCH /api/nodes/:id/move` — validates body with `moveNodeSchema`, calls `moveNode()`, returns updated node
  - [x] 6.11 Register routes plugin in `packages/server/src/server.ts`

- [x] Task 7: Write unit tests for service layer (AC: #15, #16)
  - [x] 7.1 Create `packages/server/src/services/node.service.test.ts` — use an isolated test DB (in-memory `:memory:` or temp file via `DB_PATH` override) so tests never touch the user's real database. Create a test helper (e.g., `packages/server/src/db/test-db.ts`) that provides a fresh Drizzle instance with schema pushed per test suite.
  - [x] 7.2 Test `createNode` — valid project creation (no parent), valid effort under project, valid task under effort, valid subtask under task
  - [x] 7.3 Test `createNode` — hierarchy violation: effort without project parent, task without effort parent, subtask without task parent, nesting beyond subtask level
  - [x] 7.4 Test `deleteNode` — verify cascading deletion of all descendants
  - [x] 7.5 Test `reorderNode` — verify sibling sort_order remains contiguous after reorder
  - [x] 7.6 Test `moveNode` — valid move respecting hierarchy rules, invalid move violating hierarchy
  - [x] 7.7 Test `moveNode` — verify sort_order gaps are fixed in both old and new parent

- [x] Task 8: Write route integration tests (AC: #7-#14)
  - [x] 8.1 Create `packages/server/src/routes/nodes.route.test.ts`
  - [x] 8.2 Test `GET /api/nodes` returns 200 with array
  - [x] 8.3 Test `POST /api/nodes` returns 201 with valid body, 400 with invalid body
  - [x] 8.4 Test `GET /api/nodes/:id` returns 200 for existing, 404 for missing
  - [x] 8.5 Test `PATCH /api/nodes/:id` returns 200 with valid update, 400 with empty body
  - [x] 8.6 Test `DELETE /api/nodes/:id` returns 204, verify descendants also deleted
  - [x] 8.7 Test `GET /api/nodes/:id/children` returns sorted children
  - [x] 8.8 Test `PATCH /api/nodes/:id/reorder` updates sort_order correctly
  - [x] 8.9 Test `PATCH /api/nodes/:id/move` moves node to valid parent, rejects invalid hierarchy

- [x] Task 9: Verify end-to-end data flow
  - [x] 9.1 Start server with `pnpm dev`, verify database file is created at expected path
  - [x] 9.2 Create a project via `POST /api/nodes`, verify it appears in `GET /api/nodes`
  - [x] 9.3 Create effort → task → subtask chain, verify hierarchy with `GET /api/nodes/:id/children`
  - [x] 9.4 Attempt to create invalid hierarchy (e.g., task under project), verify 400 error
  - [x] 9.5 Delete a parent node, verify all descendants are removed
  - [x] 9.6 Run `pnpm test:unit` — all existing + new tests pass
  - [x] 9.7 Verify TypeScript compilation has zero errors across all packages

## Dev Notes

### Critical Technology Details

| Technology | Version | Story 1.2 Usage |
|---|---|---|
| Drizzle ORM | v0.45+ | Schema definition for `nodes` and `tree_view_state` tables, query builder for all CRUD ops |
| better-sqlite3 | v12.6+ | Already configured in `db/index.ts` with WAL mode — no changes needed |
| Fastify | v5.8+ | Route plugins with Zod type provider for validated endpoints |
| fastify-type-provider-zod | v6.1.0 | Bridges Zod v4 schemas to Fastify request/response validation |
| Zod | v4.3+ | Shared schemas: `createNodeSchema`, `updateNodeSchema`, `moveNodeSchema`, `reorderNodeSchema` |
| crypto (Node.js built-in) | Node 20+ | `crypto.randomUUID()` for UUID v4 generation — NO external uuid package |
| drizzle-kit | v0.30+ | Schema sync: `drizzle-kit push` for dev, `drizzle-kit generate` for future production migrations |

### Architecture Compliance

**Server Layer Pattern (MUST follow exactly):**
```
routes/nodes.route.ts  → HTTP concerns only (parse request, format response, status codes)
services/node.service.ts → Business logic only (hierarchy validation, cascade, reorder math)
db/schema.ts + db/index.ts → Data access only (Drizzle schema, queries, transactions)
```

**Drizzle Schema Pattern:**
```typescript
// packages/server/src/db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const nodes = sqliteTable('nodes', {
  id: text('id').primaryKey(),           // UUID v4
  title: text('title').notNull(),
  type: text('type').notNull(),           // 'project' | 'effort' | 'task' | 'subtask'
  parentId: text('parent_id').references(() => nodes.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  markdownBody: text('markdown_body').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_nodes_parent_id').on(table.parentId),
  index('idx_nodes_type').on(table.type),
]);
```

**Important Drizzle Notes:**
- Use `integer('is_completed', { mode: 'boolean' })` for automatic 0/1 ↔ true/false mapping
- Use `text` for dates (SQLite has no native date type) — store ISO 8601 strings
- Use `.references(() => nodes.id, { onDelete: 'cascade' })` for self-referencing FK — BUT NOTE: SQLite foreign keys require `PRAGMA foreign_keys = ON` at connection time
- Add `sqlite.pragma('foreign_keys = ON')` in `db/index.ts` after WAL mode pragma

**Fastify Route Plugin Pattern:**
```typescript
// packages/server/src/routes/nodes.route.ts
import type { FastifyInstance } from 'fastify';

export default async function nodesRoutes(fastify: FastifyInstance) {
  // Register routes here using fastify.get(), fastify.post(), etc.
}
```

**Zod v4 Schema Pattern:**
```typescript
// packages/shared/src/schemas/node.schema.ts
import { z } from 'zod';
import { NodeType } from '../constants/hierarchy.js';

export const createNodeSchema = z.object({
  title: z.string().min(1),
  type: z.enum([NodeType.PROJECT, NodeType.EFFORT, NodeType.TASK, NodeType.SUBTASK]),
  parentId: z.string().uuid().nullable().optional(),
});

export type CreateNode = z.infer<typeof createNodeSchema>;
```

**Hierarchy Validation Rules (enforce in service layer):**
```
project  → parentId MUST be null
effort   → parent MUST be type 'project'
task     → parent MUST be type 'effort'
subtask  → parent MUST be type 'task'
```

**Sort Order Management (contiguous re-index strategy):**
- On create: `sort_order = MAX(sort_order) + 1` among siblings (or 0 if first child)
- On reorder: fetch all siblings sorted by current sort_order, remove target, splice at new position, re-assign 0-based contiguous indexes to all siblings
- On delete: DB cascade handles the delete; then re-index remaining siblings under the deleted node's former parent to close gaps
- On move: re-index old parent's remaining children (close gap), then splice into new parent's children at target position and re-index

**Atomic Operations:**
- Use Drizzle transactions (`db.transaction()`) for multi-step writes: reorder (re-index siblings), move (update parent + re-index both old and new parents)
- Single-row operations (create, update, delete) are inherently atomic in SQLite — delete cascades are handled by the DB engine within a single statement

**UUID Generation:**
```typescript
import { randomUUID } from 'node:crypto';
const id = randomUUID(); // Built-in, no external package
```

**API Response Format (camelCase, flat):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Project",
  "type": "project",
  "parentId": null,
  "sortOrder": 0,
  "isCompleted": false,
  "markdownBody": "",
  "createdAt": "2026-03-09T14:30:00.000Z",
  "updatedAt": "2026-03-09T14:30:00.000Z"
}
```

**DB Connection Setup (MUST update `db/index.ts`):**
The existing `db/index.ts` needs two critical additions:
```typescript
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DB_PATH || `${process.env.HOME}/.todo-bmad-style/data.db`;

// Ensure DB directory exists (critical for first launch)
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');  // Required for ON DELETE CASCADE to work
```
Without `mkdirSync`, better-sqlite3 throws if `~/.todo-bmad-style/` doesn't exist.
Without `foreign_keys = ON`, cascade deletes on `parent_id` and `tree_view_state.node_id` silently do nothing.

**Delete Strategy: DB Cascade (not manual recursion):**
With `PRAGMA foreign_keys = ON` and `onDelete: 'cascade'` on both `nodes.parent_id` and `tree_view_state.node_id`, a single `DELETE FROM nodes WHERE id = ?` automatically removes all descendants and their tree view state. Do NOT implement recursive deletion in the service layer — rely on the DB cascade.

**Test Database Isolation:**
Tests MUST NOT use the user's real `~/.todo-bmad-style/data.db`. Create a test helper (`packages/server/src/db/test-db.ts`) that:
- Creates an in-memory SQLite database (`:memory:`) or temp file
- Applies the schema via `drizzle-kit push` or manual table creation
- Exports a fresh Drizzle instance for each test suite
- Enables WAL mode and `foreign_keys = ON` just like production

**Schema Sync Strategy (Drizzle Kit):**
For this greenfield project, use `drizzle-kit push` to directly sync the TypeScript schema to SQLite — no migration files needed during development. Add `db:push` script to server `package.json`. Reserve `drizzle-kit generate` + `drizzle-kit migrate` for production deployments later.

### Anti-Patterns to Avoid

- Do NOT use `uuid` npm package — use `crypto.randomUUID()` (Node.js built-in)
- Do NOT create separate tables for each node type — single `nodes` table with `type` column
- Do NOT put business logic in route handlers — all logic goes in `node.service.ts`
- Do NOT manually convert snake_case ↔ camelCase — Drizzle schema handles the mapping
- Do NOT create `__tests__/` directories — co-locate tests next to source files
- Do NOT add `cors` or auth middleware — single-user localhost app
- Do NOT use `autoincrement` IDs — use UUID v4 strings
- Do NOT forget to enable `PRAGMA foreign_keys = ON` — without it, cascade deletes won't work

### Previous Story Intelligence (from Story 1.1)

**Key learnings from Story 1.1:**
- TanStack CLI `--router-only` mode ignores `--add-ons` flag — Shadcn/ui and TanStack Query were installed manually
- `fastify-type-provider-zod@4.x` requires Zod v3 — project uses v6.1.0 for Zod v4 compatibility
- Server uses `buildServer()` pattern in `server.ts` for testability — routes must be registered inside this function
- `esbuild` was added to `pnpm.onlyBuiltDependencies` alongside `better-sqlite3`
- Client dev port is 5173 (Vite default, not TanStack default 3000)
- Vitest uses `projects` config (v3.2+ feature)

**Files from Story 1.1 that this story MODIFIES:**
- `packages/server/src/db/schema.ts` — replace placeholder with actual Drizzle schema
- `packages/server/src/db/index.ts` — add `foreign_keys = ON` pragma
- `packages/server/src/server.ts` — register nodes route plugin
- `packages/shared/src/schemas/node.schema.ts` — replace placeholder with actual Zod schemas
- `packages/shared/src/types/node.types.ts` — replace placeholder with Zod-inferred types
- `packages/shared/src/index.ts` — add new schema and type exports to barrel

**Files from Story 1.1 that this story must NOT break:**
- `packages/server/src/index.ts` — entry point, imports `buildServer()`
- `packages/server/src/index.test.ts` — health check test must still pass
- `packages/client/src/app.test.tsx` — client smoke test must still pass
- All existing `pnpm` scripts must continue to work

### Project Structure Notes

**New files this story creates:**
```
packages/server/src/
├── db/
│   ├── schema.ts              # MODIFY: Add nodes + tree_view_state tables
│   ├── index.ts               # MODIFY: Add mkdirSync + foreign_keys pragma
│   └── test-db.ts             # NEW: Isolated test DB helper (in-memory SQLite)
├── routes/
│   └── nodes.route.ts         # NEW: All node API endpoints
│   └── nodes.route.test.ts    # NEW: Route integration tests
├── services/
│   └── node.service.ts        # NEW: Node business logic
│   └── node.service.test.ts   # NEW: Service unit tests
└── server.ts                  # MODIFY: Register nodes route plugin

packages/shared/src/
├── schemas/
│   └── node.schema.ts         # MODIFY: Add Zod schemas
├── types/
│   └── node.types.ts          # MODIFY: Add inferred types
└── index.ts                   # MODIFY: Add exports
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Data Persistence]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/1-1-project-scaffolding-and-monorepo-foundation.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed TypeScript circular reference error in self-referencing `nodes.parentId` by using `AnySQLiteColumn` type annotation
- Fixed Vitest `vi.mock` hoisting issue — moved test DB creation into async mock factory using `vi.mock('../db/index.js', async () => ...)` pattern with singleton `getTestDb()`

### Completion Notes List

- Implemented complete Drizzle schema for `nodes` and `tree_view_state` tables with all columns, indexes, and foreign keys
- Updated `db/index.ts` with `mkdirSync` for directory creation and `PRAGMA foreign_keys = ON` for cascade support
- Created 5 Zod schemas (`createNodeSchema`, `updateNodeSchema`, `moveNodeSchema`, `reorderNodeSchema`, `nodeResponseSchema`) with inferred TypeScript types
- Implemented full service layer with all CRUD operations, hierarchy validation, contiguous sort_order management, and cascade delete via DB engine
- Implemented 8 Fastify route endpoints covering all CRUD, reorder, and move operations with Zod validation
- Created isolated in-memory test DB helper (`test-db.ts`) using singleton pattern
- 23 service unit tests covering all operations, hierarchy rules, and edge cases
- 18 route integration tests using Fastify `inject()` covering all endpoints and error cases
- All 43 tests pass (42 server + 1 client), zero TypeScript errors, zero regressions (existing health check and client tests still pass)

### Change Log

- 2026-03-09: Implemented Story 1.2 — Node Data Model & CRUD API. Created Drizzle schemas, Zod validation schemas, service layer with hierarchy validation, API routes, and comprehensive test suite.
- 2026-03-09: Code review fixes — Wrapped reorderNode/moveNode/deleteNode in SQLite transactions (AC #15). Configured fastify-type-provider-zod with Zod schema validation on all routes (Task 6.2). Fixed reorderNode not persisting updatedAt to DB. Refactored routes to use shared API_ROUTES constants and UUID param validation. Fixed per-package test script. Suppressed logger noise in route tests.

### File List

- packages/server/src/db/schema.ts (MODIFIED — replaced placeholder with nodes + tree_view_state Drizzle schema)
- packages/server/src/db/index.ts (MODIFIED — added mkdirSync, dirname imports, foreign_keys pragma)
- packages/server/src/db/test-db.ts (NEW — in-memory SQLite test DB helper)
- packages/server/src/services/node.service.ts (NEW — node CRUD business logic with hierarchy validation, atomic transactions)
- packages/server/src/services/node.service.test.ts (NEW — 23 service unit tests)
- packages/server/src/routes/nodes.route.ts (NEW — 8 Fastify API endpoints with Zod type provider and UUID param validation)
- packages/server/src/routes/nodes.route.test.ts (NEW — 18 route integration tests)
- packages/server/src/server.ts (MODIFIED — registered nodesRoutes plugin, configured fastify-type-provider-zod compilers)
- packages/server/src/routes/nodes.route.ts (MODIFIED — refactored to use type provider, API_ROUTES constants, UUID param schema)
- packages/server/package.json (MODIFIED — added db:push, db:generate scripts, added zod dependency)
- packages/server/vitest.config.ts (NEW — local vitest config for per-package test execution)
- packages/shared/src/schemas/node.schema.ts (MODIFIED — replaced placeholder with 5 Zod schemas)
- packages/shared/src/types/node.types.ts (MODIFIED — replaced placeholder with inferred types)
- packages/shared/src/index.ts (MODIFIED — added schema and type exports to barrel)
