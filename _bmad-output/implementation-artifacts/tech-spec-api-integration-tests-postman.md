---
title: 'API Integration Tests & Postman Collection'
slug: 'api-integration-tests-postman'
created: '2026-03-11'
status: 'done'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vitest', 'Fastify', 'Postman MCP', 'Zod', 'TypeScript', 'SQLite', 'Drizzle ORM']
files_to_modify: ['packages/server/src/integration/ (new directory)', 'packages/server/vitest.integration.config.ts (new)', 'packages/server/package.json']
code_patterns: ['Route→Service→DB layering', 'Zod type provider for validation', 'Flat API responses', 'Fastify error format: { statusCode, error, message }', 'UUID v4 IDs', 'ISO 8601 dates', 'Hierarchy: project→effort→task→subtask', 'sort_order reindexing on mutations', 'buildServer() factory in server.ts']
test_patterns: ['Co-located tests: {file}.test.ts', 'Helper functions for creating test entities', 'beforeEach cleanup for isolation', 'Vitest as test runner', 'Existing route tests use Fastify inject() with test-db.ts in-memory DB', 'nodeResponseSchema available for response validation']
---

# Tech-Spec: API Integration Tests & Postman Collection

**Created:** 2026-03-11

## Overview

### Problem Statement

The backend has unit-level tests (route tests via Fastify `inject()` and service tests with mocked DB) but no true end-to-end API integration tests that hit a running server with real HTTP calls and a real database. There is also no Postman collection for manual testing or API documentation.

### Solution

Create a Postman collection covering all 9 API endpoints with test scripts validating response schemas against Zod contracts, plus a corresponding local integration test suite that makes real HTTP calls against a live Fastify server with a real SQLite database.

### Scope

**In Scope:**
- Postman collection with all 9 endpoints (1 health in `server.ts` + 8 node routes in `nodes.route.ts`)
- Request bodies, path params, and test scripts per endpoint
- Response validation against Zod schema contracts
- Collection targets localhost:3001
- Local integration test file(s) that make real HTTP calls to a running server
- Happy path + key error cases (404, validation errors, hierarchy violations)

**Out of Scope:**
- Modifying existing unit/route tests
- CI/CD pipeline integration
- Inbox, session, or search endpoints (schemas exist but no routes yet)
- Auth/CORS (not applicable per project context)

## Context for Development

### Codebase Patterns

- **Layering:** Route → Service → DB — routes handle HTTP, services handle logic, DB handles data
- **Validation:** Zod type provider (`fastify-type-provider-zod`) validates at API boundary using shared schemas
- **Schemas:** `createNodeSchema`, `updateNodeSchema`, `moveNodeSchema`, `reorderNodeSchema`, `nodeResponseSchema` in `packages/shared/`
- **Error handling:** Custom `NotFoundError` → 404, `HierarchyError` → 400, Zod validation errors → 400 (auto-formatted)
- **Error format:** `{ statusCode: number, error: string, message: string }`
- **Response format:** Flat objects, no wrappers. Arrays for collections, 404 for missing items
- **IDs:** UUID v4 strings, generated server-side via `randomUUID()`
- **Dates:** ISO 8601 strings for `createdAt`/`updatedAt`
- **Hierarchy:** project (root, no parent) → effort → task → subtask. Max depth 4. Enforced via `VALID_PARENT_TYPES` map
- **sort_order:** Auto-assigned on create (max + 1). Reindexed to contiguous values on delete/reorder/move
- **Server factory:** `buildServer({ logger?: false })` returns configured Fastify instance
- **Health check:** Inline in `server.ts`, tests DB with `SELECT 1`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/server/src/routes/nodes.route.ts` | 8 node endpoints: GET list, POST create, GET by id, PATCH update, DELETE, GET children, PATCH reorder, PATCH move |
| `packages/server/src/routes/nodes.route.test.ts` | 35+ existing route tests — reference for expected behaviors, helpers, test structure |
| `packages/server/src/services/node.service.ts` | Business logic: CRUD, hierarchy validation, sort_order management, cascade delete |
| `packages/server/src/server.ts` | `buildServer()` factory — registers Zod compiler, health route, nodes plugin |
| `packages/server/src/index.ts` | Entry point — binds to `127.0.0.1:3001` |
| `packages/shared/src/schemas/node.schema.ts` | All Zod schemas including `nodeResponseSchema` for response validation |
| `packages/shared/src/constants/api.ts` | `API_ROUTES` — `HEALTH`, `NODES`, `INBOX`, `SESSION`, `SEARCH` |
| `packages/shared/src/constants/hierarchy.ts` | `NodeType` enum, `MAX_DEPTH = 4` |
| `packages/server/src/db/test-db.ts` | In-memory test DB setup (used by existing unit tests) |

### Technical Decisions

- **Programmatic test server:** Integration tests use `buildServer({ logger: false })` in `beforeAll` to start a Fastify instance on a dedicated port (3002). `afterAll` closes it. No manual server startup required.
- **In-memory test DB for isolation:** Mock `../db/index.js` with `test-db.ts` (same pattern as existing route tests) so the programmatic server uses an isolated in-memory SQLite DB. Use `beforeEach(clearTestDb)` for clean state between tests.
- **Real HTTP over the wire:** Tests use native `fetch` (Node 18+) against `http://localhost:3002` — real HTTP requests to a real Fastify server with real DB logic, just isolated from the production database.
- **Postman collection** mirrors the same test scenarios for manual/automated use via Postman MCP. Postman targets the production server on `localhost:3001` (requires server running).
- **Sequential test flows:** Create → Read → Update → Delete within each describe block, using dynamic IDs from responses
- **Response validation:** Use `nodeResponseSchema.parse()` in local tests; Postman tests validate shape via JS test scripts
- **New files location:** `packages/server/src/integration/` directory for integration test files
- **Separate Vitest config:** `vitest.integration.config.ts` with `include: ['src/integration/**/*.integration.ts']` to prevent integration tests from running with unit tests. Integration file uses `.integration.ts` extension (not `.test.ts`).
- **No new dependencies needed:** Native `fetch` for HTTP calls, Vitest already configured

## Implementation Plan

### Tasks

- [x] Task 1: Create Postman workspace and collection via Postman MCP
  - Action: Use `mcp__postman__createWorkspace` to create a "todo-bmad-style" workspace (if not exists), then `mcp__postman__createCollection` to create an "API Integration Tests" collection
  - Notes: Collection will be the container for all endpoint requests and test scripts

- [x] Task 2: Add Health Check request to Postman collection
  - Action: Use `mcp__postman__createCollectionRequest` to add `GET http://localhost:3001/api/health`
  - Test script (post-response):
    ```js
    pm.test("Status 200", () => pm.response.to.have.status(200));
    pm.test("DB connected", () => {
      const json = pm.response.json();
      pm.expect(json.status).to.eql("ok");
      pm.expect(json.db).to.eql("connected");
    });
    ```

- [x] Task 3: Add Nodes CRUD requests to Postman collection
  - Action: Use `mcp__postman__createCollectionRequest` for each. All URLs use `http://localhost:3001` as base.
  - Requests:
    - `GET /api/nodes` — List projects (expect 200, array response)
      - Test: `pm.test("Status 200", () => pm.response.to.have.status(200)); pm.test("Array response", () => pm.expect(pm.response.json()).to.be.an("array"));`
    - `POST /api/nodes` — Create project (body: `{ "title": "Test Project", "type": "project" }`)
      - Test: `pm.test("Status 201", () => pm.response.to.have.status(201));`
      - Post-response: `pm.collectionVariables.set("projectId", pm.response.json().id);`
      - Validate response has: `id` (UUID), `title`, `type: "project"`, `parentId: null`, `sortOrder: 0`, `isCompleted: false`, `createdAt`, `updatedAt`
    - `GET /api/nodes/{{projectId}}` — Get node by ID (expect 200, node object)
      - Test: `pm.test("Status 200", () => pm.response.to.have.status(200)); pm.test("Correct ID", () => pm.expect(pm.response.json().id).to.eql(pm.collectionVariables.get("projectId")));`
    - `PATCH /api/nodes/{{projectId}}` — Update node (body: `{ "title": "Updated Project" }`)
      - Test: `pm.test("Status 200", () => pm.response.to.have.status(200)); pm.test("Title updated", () => pm.expect(pm.response.json().title).to.eql("Updated Project"));`
    - `DELETE /api/nodes/{{projectId}}` — Delete node (expect 204)
      - Test: `pm.test("Status 204", () => pm.response.to.have.status(204));`

- [x] Task 4: Add Hierarchy & Children requests to Postman collection
  - Action: Use `mcp__postman__createCollectionRequest` for each:
    - `POST /api/nodes` — Create new project for hierarchy tests (body: `{ "title": "Hierarchy Project", "type": "project" }`)
      - Post-response: `pm.collectionVariables.set("hierProjectId", pm.response.json().id);`
    - `POST /api/nodes` — Create effort (body: `{ "title": "Test Effort", "type": "effort", "parentId": "{{hierProjectId}}" }`)
      - Post-response: `pm.collectionVariables.set("effortId", pm.response.json().id);`
      - Test: `pm.test("Status 201", () => pm.response.to.have.status(201)); pm.test("Parent correct", () => pm.expect(pm.response.json().parentId).to.eql(pm.collectionVariables.get("hierProjectId")));`
    - `POST /api/nodes` — Create task (body: `{ "title": "Test Task", "type": "task", "parentId": "{{effortId}}" }`)
      - Post-response: `pm.collectionVariables.set("taskId", pm.response.json().id);`
    - `POST /api/nodes` — Create subtask (body: `{ "title": "Test Subtask", "type": "subtask", "parentId": "{{taskId}}" }`)
      - Post-response: `pm.collectionVariables.set("subtaskId", pm.response.json().id);`
    - `GET /api/nodes/{{hierProjectId}}/children` — Get children (expect 200, sorted array)
      - Test: `pm.test("Status 200", () => pm.response.to.have.status(200)); pm.test("Has children", () => pm.expect(pm.response.json()).to.be.an("array").with.lengthOf(1)); pm.test("Sorted", () => pm.expect(pm.response.json()[0].sortOrder).to.eql(0));`
    - `GET /api/nodes/00000000-0000-0000-0000-000000000000/children` — 404 for non-existent parent
      - Test: `pm.test("Status 404", () => pm.response.to.have.status(404));`

- [x] Task 5: Add Error Case requests to Postman collection
  - Action: Use `mcp__postman__createCollectionRequest` for each:
    - `GET /api/nodes/00000000-0000-0000-0000-000000000000` — 404 missing node
      - Test: `pm.test("Status 404", () => pm.response.to.have.status(404)); pm.test("Error format", () => { const json = pm.response.json(); pm.expect(json.statusCode).to.eql(404); pm.expect(json.error).to.be.a("string"); pm.expect(json.message).to.be.a("string"); });`
    - `POST /api/nodes` with `{ "title": "", "type": "project" }` — 400 Zod validation error (empty title)
      - Test: `pm.test("Status 400", () => pm.response.to.have.status(400));`
      - Note: This is a Zod validation error — response shape is `{ statusCode, error, message }` auto-formatted by `fastify-type-provider-zod`
    - `POST /api/nodes` with `{ "title": "Effort", "type": "effort" }` — 400 hierarchy error (no parent)
      - Test: `pm.test("Status 400", () => pm.response.to.have.status(400));`
      - Note: This is a service-level `HierarchyError`, not Zod — same `{ statusCode, error, message }` shape but generated by the route handler
    - `POST /api/nodes` with `{ "title": "Bad", "type": "task", "parentId": "{{hierProjectId}}" }` — 400 wrong parent type
      - Test: `pm.test("Status 400", () => pm.response.to.have.status(400)); pm.test("Error message mentions parent type", () => pm.expect(pm.response.json().message).to.include("requires"));`
    - `PATCH /api/nodes/{{hierProjectId}}` with `{}` — 400 empty update body
      - Test: `pm.test("Status 400", () => pm.response.to.have.status(400));`
      - Note: This is a Zod `.refine()` error — "At least one of title or markdownBody must be provided"
    - `DELETE /api/nodes/00000000-0000-0000-0000-000000000000` — 404 missing node
      - Test: `pm.test("Status 404", () => pm.response.to.have.status(404));`
    - `GET /api/nodes/not-a-uuid` — 400 invalid UUID format
      - Test: `pm.test("Status 400", () => pm.response.to.have.status(400));`
      - Note: Zod UUID validation error from `idParamSchema`

- [x] Task 6: Add Reorder & Move requests to Postman collection
  - Action: First create setup data, then test reorder/move:
    - `POST /api/nodes` — Create second project (body: `{ "title": "Move Target Project", "type": "project" }`)
      - Post-response: `pm.collectionVariables.set("project2Id", pm.response.json().id);`
    - `POST /api/nodes` — Create effort2 under hierProject (body: `{ "title": "Effort2", "type": "effort", "parentId": "{{hierProjectId}}" }`)
      - Post-response: `pm.collectionVariables.set("effort2Id", pm.response.json().id);`
    - `POST /api/nodes` — Create effort3 under hierProject (body: `{ "title": "Effort3", "type": "effort", "parentId": "{{hierProjectId}}" }`)
      - Post-response: `pm.collectionVariables.set("effort3Id", pm.response.json().id);`
    - `PATCH /api/nodes/{{effort3Id}}/reorder` — Reorder to position 0 (body: `{ "sortOrder": 0 }`)
      - Test: `pm.test("Status 200", () => pm.response.to.have.status(200)); pm.test("Sort order updated", () => pm.expect(pm.response.json().sortOrder).to.eql(0));`
    - `GET /api/nodes/{{hierProjectId}}/children` — Verify sibling order after reorder
      - Test: `pm.test("Reordered correctly", () => { const children = pm.response.json(); pm.expect(children[0].id).to.eql(pm.collectionVariables.get("effort3Id")); });`
    - `PATCH /api/nodes/{{effort2Id}}/move` — Move effort to project2 (body: `{ "newParentId": "{{project2Id}}", "sortOrder": 0 }`)
      - Test: `pm.test("Status 200", () => pm.response.to.have.status(200)); pm.test("Parent changed", () => pm.expect(pm.response.json().parentId).to.eql(pm.collectionVariables.get("project2Id")));`
    - `PATCH /api/nodes/{{taskId}}/move` — Invalid hierarchy move: task under project (body: `{ "newParentId": "{{hierProjectId}}", "sortOrder": 0 }`)
      - Test: `pm.test("Status 400", () => pm.response.to.have.status(400));`
      - Note: This is a `HierarchyError` — task requires effort parent, not project

- [x] Task 7: Add Cascade Delete verification requests to Postman collection
  - Action: Create a dedicated hierarchy for cascade testing, then delete and verify:
    - `POST /api/nodes` — Create cascade test project (body: `{ "title": "Cascade Project", "type": "project" }`)
      - Post-response: `pm.collectionVariables.set("cascadeProjectId", pm.response.json().id);`
    - `POST /api/nodes` — Create effort under cascade project (body: `{ "title": "Cascade Effort", "type": "effort", "parentId": "{{cascadeProjectId}}" }`)
      - Post-response: `pm.collectionVariables.set("cascadeEffortId", pm.response.json().id);`
    - `POST /api/nodes` — Create task under cascade effort (body: `{ "title": "Cascade Task", "type": "task", "parentId": "{{cascadeEffortId}}" }`)
      - Post-response: `pm.collectionVariables.set("cascadeTaskId", pm.response.json().id);`
    - `DELETE /api/nodes/{{cascadeProjectId}}` — Delete project with descendants
      - Test: `pm.test("Status 204", () => pm.response.to.have.status(204));`
    - `GET /api/nodes/{{cascadeEffortId}}` — Verify effort returns 404
      - Test: `pm.test("Cascade: effort deleted", () => pm.response.to.have.status(404));`
    - `GET /api/nodes/{{cascadeTaskId}}` — Verify task returns 404
      - Test: `pm.test("Cascade: task deleted", () => pm.response.to.have.status(404));`

- [x] Task 8: Create integration test file with server lifecycle & helpers
  - File: `packages/server/src/integration/nodes-api.integration.ts`
  - Action: Create Vitest integration test file with the following structure:
    - **DB mock** (top of file, before imports): `vi.mock('../db/index.js', async () => { const { getTestDb } = await import('../db/test-db.js'); return { db: getTestDb() }; });`
    - **Imports:** `buildServer` from `../server.js`, `clearTestDb` from `../db/test-db.js`, `nodeResponseSchema` from `@todo-bmad-style/shared`, `describe, it, expect, beforeAll, afterAll, beforeEach, vi` from `vitest`
    - **Server lifecycle:**
      ```ts
      const PORT = 3002;
      const BASE = `http://localhost:${PORT}`;
      let server: ReturnType<typeof buildServer>;

      beforeAll(async () => {
        server = buildServer({ logger: false });
        await server.listen({ host: '127.0.0.1', port: PORT });
      });

      afterAll(async () => {
        await server.close();
      });

      beforeEach(() => {
        clearTestDb();
      });
      ```
    - **Helper function:**
      ```ts
      async function api(method: string, path: string, body?: unknown) {
        const res = await fetch(`${BASE}${path}`, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        return res;
      }
      ```
    - **Test blocks — Health & CRUD:**
      ```
      describe('API Integration: Health')
        - GET /api/health → 200, { status: 'ok', db: 'connected' }

      describe('API Integration: Nodes CRUD')
        - GET /api/nodes → 200, empty array (guaranteed clean via beforeEach)
        - POST /api/nodes (project) → 201, validate with nodeResponseSchema.parse()
        - GET /api/nodes/:id → 200, matches created node
        - GET /api/nodes after creating project + effort → returns only the project (verifies root-only filter)
        - PATCH /api/nodes/:id { title } → 200, title updated
        - PATCH /api/nodes/:id { markdownBody } → 200, body updated
        - DELETE /api/nodes/:id → 204
        - GET /api/nodes/:id after delete → 404, validate error shape { statusCode, error, message }
      ```
  - Notes: File extension is `.integration.ts` (not `.test.ts`) to avoid being picked up by the default Vitest config.

- [x] Task 9: Add hierarchy, children & cascade delete test blocks
  - File: `packages/server/src/integration/nodes-api.integration.ts` (same file, additional describe blocks)
  - Action: Add test blocks:
    ```
    describe('API Integration: Hierarchy & Children')
      - POST project → POST effort under project → POST task under effort → POST subtask under task
      - Validate each with nodeResponseSchema.parse()
      - GET /api/nodes/:projectId/children → array with effort, sortOrder 0
      - GET /api/nodes/:effortId/children → array with task
      - GET /api/nodes/nonexistent-uuid/children → 404
      - POST effort with no parent → 400 (HierarchyError from service layer)
      - POST task under project (wrong parent) → 400 (HierarchyError)
      - POST project with { title: "", type: "project" } → 400 (Zod validation)
      - PATCH node with {} → 400 (Zod refine error)
      - GET /api/nodes/not-a-uuid → 400 (Zod UUID validation)
      - Validate error responses have { statusCode, error, message } shape

    describe('API Integration: Cascade Delete')
      - Create full hierarchy (project→effort→task→subtask)
      - DELETE project → 204
      - GET effort → 404, GET task → 404, GET subtask → 404
    ```

- [x] Task 10: Add reorder & move test blocks
  - File: `packages/server/src/integration/nodes-api.integration.ts` (same file, additional describe blocks)
  - Action: Add test blocks:
    ```
    describe('API Integration: Reorder')
      - Create project with 3 efforts (E1, E2, E3)
      - PATCH /api/nodes/:e3Id/reorder { sortOrder: 0 } → 200
      - GET children → order is [E3, E1, E2] with contiguous sortOrder [0, 1, 2]

    describe('API Integration: Move')
      - Create P1, P2, effort under P1
      - PATCH /api/nodes/:effortId/move { newParentId: P2.id, sortOrder: 0 } → 200
      - Verify response parentId === P2.id
      - GET P1 children → empty array
      - GET P2 children → has the effort
      - Create task under effort, then move task under project (invalid hierarchy) → 400
    ```

- [x] Task 11: Create Vitest integration config and add test:integration script
  - File: `packages/server/vitest.integration.config.ts` (new)
  - Action: Create a dedicated Vitest config for integration tests:
    ```ts
    import { defineConfig } from 'vitest/config';

    export default defineConfig({
      test: {
        include: ['src/integration/**/*.integration.ts'],
      },
    });
    ```
  - File: `packages/server/package.json`
  - Action: Add `"test:integration": "vitest run --config vitest.integration.config.ts"` to scripts
  - Notes: This ensures `pnpm test` runs only unit tests (default config) and `pnpm test:integration` runs only integration tests (dedicated config). No collision between the two.

### Acceptance Criteria

**Server Lifecycle:**
- [x] AC 1: Given the integration test file, when the test suite starts, then `buildServer()` starts a Fastify instance on port 3002 with in-memory test DB, and closes it after all tests complete

**Health Check:**
- [x] AC 2: Given the test server is running, when GET /api/health is called, then response is 200 with `{ status: 'ok', db: 'connected' }`

**Node CRUD:**
- [x] AC 3: Given a clean DB (via `beforeEach(clearTestDb)`), when GET /api/nodes is called, then response is 200 with `[]`
- [x] AC 4: Given a valid project payload, when POST /api/nodes is called, then response is 201 with a node object that passes `nodeResponseSchema.parse()` (UUID id, type 'project', parentId null, sortOrder 0, isCompleted false, ISO dates)
- [x] AC 5: Given a node exists, when GET /api/nodes/:id is called, then response is 200 with the node object
- [x] AC 6: Given a project and an effort under it exist, when GET /api/nodes is called, then response is 200 with only the project (not the effort) — verifies root-only filter
- [x] AC 7: Given a node exists, when PATCH /api/nodes/:id with `{ title: "Updated" }` is called, then response is 200 with updated title and new updatedAt
- [x] AC 8: Given a node exists, when DELETE /api/nodes/:id is called, then response is 204 with no body
- [x] AC 9: Given a node was deleted, when GET /api/nodes/:id is called, then response is 404 with `{ statusCode: 404, error: 'Not Found', message: '...' }`

**Hierarchy Validation:**
- [x] AC 10: Given a project exists, when POST /api/nodes with `{ type: 'effort', parentId: projectId }` is called, then response is 201 with effort node
- [x] AC 11: Given no parent, when POST /api/nodes with `{ type: 'effort' }` is called, then response is 400 with `HierarchyError` message (service-level error)
- [x] AC 12: Given a project exists, when POST /api/nodes with `{ type: 'task', parentId: projectId }` is called, then response is 400 with `HierarchyError` message (task requires effort parent, not project)

**Children:**
- [x] AC 13: Given a project with 3 efforts, when GET /api/nodes/:projectId/children is called, then response is 200 with 3 items sorted by sortOrder [0, 1, 2]
- [x] AC 14: Given a non-existent UUID, when GET /api/nodes/:id/children is called, then response is 404

**Cascade Delete:**
- [x] AC 15: Given a project with effort, task, and subtask descendants, when DELETE /api/nodes/:projectId is called, then all descendants return 404 on subsequent GET

**Reorder:**
- [x] AC 16: Given a project with efforts [E1(0), E2(1), E3(2)], when PATCH /api/nodes/:e3Id/reorder with `{ sortOrder: 0 }` is called, then children order becomes [E3(0), E1(1), E2(2)]

**Move:**
- [x] AC 17: Given P1 with effort and P2 exists, when PATCH /api/nodes/:effortId/move with `{ newParentId: P2.id, sortOrder: 0 }` is called, then effort's parentId is P2.id and P1 children is empty
- [x] AC 18: Given a task exists, when PATCH /api/nodes/:taskId/move with project as newParentId is called, then response is 400 (`HierarchyError`: task requires effort parent)

**Validation Errors (Zod):**
- [x] AC 19: Given any endpoint with `:id` param, when `not-a-uuid` is passed as :id, then response is 400 (Zod UUID validation from `idParamSchema`)
- [x] AC 20: Given POST /api/nodes, when body has empty title `{ title: "", type: "project" }`, then response is 400 (Zod `.min(1)` validation)
- [x] AC 21: Given PATCH /api/nodes/:id, when body is empty `{}`, then response is 400 (Zod `.refine()` error: "At least one of title or markdownBody must be provided")

**Postman Collection:**
- [x] AC 22: Given the Postman collection exists with all requests and test scripts, when all requests are run sequentially in order against a running server on localhost:3001, then all test scripts pass with correct status codes and response shapes

## Additional Context

### Dependencies

- **Postman MCP:** Required for collection creation tasks (Tasks 1-7). Postman collection targets the production server on `localhost:3001` (must be running manually).
- **Node.js 18+:** Required for native `fetch` API in integration tests
- **Vitest:** Already configured in workspace (used by existing tests)
- **Shared package:** `@todo-bmad-style/shared` for `nodeResponseSchema`, `API_ROUTES`, `NodeType`
- **test-db.ts:** Existing in-memory test DB used by route tests — reused for integration test isolation

### Testing Strategy

- **Integration tests** (`packages/server/src/integration/`) use native `fetch` against a programmatic Fastify server on port 3002
- **Server lifecycle:** `beforeAll` starts the server via `buildServer()`, `afterAll` closes it. No manual server startup needed.
- **DB isolation:** `vi.mock('../db/index.js')` replaces the real DB with `test-db.ts` in-memory DB. `beforeEach(clearTestDb)` ensures clean state. Same proven pattern as existing route tests.
- **Response validation:** Every successful response is parsed through `nodeResponseSchema.parse()` to ensure contract compliance
- **Error validation:** Error responses checked for `{ statusCode, error, message }` shape. Spec distinguishes between Zod validation errors and service-level `HierarchyError`/`NotFoundError` — both produce the same shape but originate from different layers.
- **Postman collection:** Mirrors the same scenarios against `localhost:3001` (production server) — can be run manually via Postman UI or programmatically via `runCollection`
- **Separation from unit tests:** Dedicated `vitest.integration.config.ts` with `include: ['src/integration/**/*.integration.ts']`. Default Vitest config only matches `*.test.ts`. No collision.

### Notes

- **Integration test file uses `.integration.ts` extension** (not `.test.ts`) — this is a deliberate deviation from the project's co-located `{file}.test.ts` convention. Integration tests live in a dedicated `integration/` directory because they test cross-cutting behavior, not a single module. This is acknowledged as an exception to the co-located test rule in `project-context.md`.
- **Postman collection requires running server:** Unlike local integration tests (which are self-contained), the Postman collection targets `localhost:3001` and requires the server to be started manually via `pnpm dev`.
- **Postman collection ordering:** Requests must be arranged in dependency order (create before read/update/delete) for collection runner to work correctly. Each section (CRUD, hierarchy, errors, reorder/move, cascade) creates its own setup data via dedicated POST requests.
- **No new npm dependencies:** Native `fetch` and existing Vitest handle everything needed.
- **Two types of 400 errors:** Zod validation errors (empty title, invalid UUID, empty update body) and service-level `HierarchyError` (wrong parent type, missing parent for non-project). Both return `{ statusCode: 400, error: '...', message: '...' }` but the `message` content differs. Tests should assert status code and presence of message, not exact message text (except where noted).
