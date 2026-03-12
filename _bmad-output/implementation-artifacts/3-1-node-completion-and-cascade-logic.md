# Story 3.1: Node Completion & Cascade Logic

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to mark nodes complete and have completion status cascade automatically through the hierarchy,
So that the tree honestly reflects what is done and what needs attention.

## Acceptance Criteria

1. **Given** any node (project, effort, task, or subtask) exists in the tree
   **When** the user clicks the checkbox on the node
   **Then** the node is marked as complete
   **And** the completion persists via `POST /api/nodes/:id/complete` with optimistic update
   **And** the node visually indicates completion (strikethrough title + muted styling)

2. **Given** a parent node has multiple children
   **When** the user completes the last incomplete child
   **Then** the parent node automatically completes (cascade up)
   **And** the cascade continues up the hierarchy — if all efforts in a project are complete, the project completes

3. **Given** a parent node is marked complete (all children complete)
   **When** the user reopens any completed child
   **Then** the parent node automatically reopens (cascade reopen)
   **And** the cascade continues up — all ancestors that were auto-completed reopen

4. **Given** a completed node exists
   **When** the user clicks the checkbox again
   **Then** the node is reopened
   **And** if the node has children, only the node itself reopens — children remain in their current state

5. **And** cascade completion logic is implemented in the server service layer (`node.service.ts`), not in the database
   **And** the API response from completion toggle includes all affected node IDs so the client can update the cache
   **And** TanStack Query cache is invalidated/updated for all affected nodes after cascade
   **And** completion toggle responds in under 200ms including cascade processing (NFR1)
   **And** `prefers-reduced-motion` disables any cascade visual transition; otherwise a subtle 200ms opacity transition is used

## Tasks / Subtasks

- [x] Task 1: Create completion toggle API endpoint (AC: #1, #5)
  - [x] 1.1 Add `toggleCompletionResponseSchema` to `packages/shared/src/schemas/node.schema.ts` — response shape: `{ affectedNodes: Array<{ id: string, isCompleted: boolean }> }`
  - [x] 1.2 Add `toggleNodeCompletion(id)` to `packages/server/src/services/node.service.ts` — implements bidirectional cascade logic (see Algorithm section)
  - [x] 1.3 Add `POST /api/nodes/:id/complete` route to `packages/server/src/routes/nodes.route.ts` — calls `toggleNodeCompletion`, returns affected nodes
  - [x] 1.4 Write service-level unit tests in `node.service.test.ts` covering all 7+ cascade edge cases (see Testing Requirements)
  - [x] 1.5 Write route tests in `nodes.route.test.ts` — 200 success, 404 not found, response shape validation

- [x] Task 2: Add client API and mutation hook (AC: #1, #5)
  - [x] 2.1 Add `toggleNodeCompletion(id)` to `packages/client/src/api/nodes.api.ts`
  - [x] 2.2 Add `useToggleNodeCompletion()` hook to `packages/client/src/queries/node-queries.ts` with optimistic update pattern (onMutate/onError/onSettled)
  - [x] 2.3 In `onMutate`: cancel in-flight queries, optimistically flip `isCompleted` on the toggled node in `['nodes', parentId, 'children']` cache
  - [x] 2.4 In `onSettled`: invalidate `['nodes', parentId, 'children']` for ALL affected ancestors (use response `affectedNodes` to identify which parent caches to invalidate)

- [x] Task 3: Add completion checkbox to tree rows (AC: #1, #4)
  - [x] 3.1 In `packages/client/src/components/features/tree-view/tree-view.tsx`, add a checkbox before the chevron in each tree row
  - [x] 3.2 Checkbox `checked` bound to `node.isCompleted`, `onChange` calls `useToggleNodeCompletion` mutation
  - [x] 3.3 Checkbox click must NOT trigger node selection or expand/collapse — use `e.stopPropagation()`
  - [x] 3.4 Add `aria-label="Mark {title} as complete"` / `"Mark {title} as incomplete"` based on current state

- [x] Task 4: Add completion visual states (AC: #1, #5)
  - [x] 4.1 When `node.isCompleted === true`: apply `line-through` to title text and `text-app-text-secondary` (muted)
  - [x] 4.2 Add `transition-opacity duration-200` CSS class for cascade visual feedback (gated by `prefers-reduced-motion`)
  - [x] 4.3 In detail panel `detail-content.tsx`: reflect completion state in the node title area (strikethrough + muted)

- [x] Task 5: Write component tests (AC: all)
  - [x] 5.1 Add checkbox rendering and interaction tests to `tree-view.test.tsx`
  - [x] 5.2 Test visual state classes (strikethrough when completed)
  - [x] 5.3 Test that checkbox click does NOT trigger node selection

- [x] Task 6: Verify all existing tests pass (AC: all)
  - [x] 6.1 Run `pnpm test` — baseline is 356 passing tests, all must continue to pass (374 passing)
  - [x] 6.2 Manual verification via Chrome DevTools MCP: toggle completion, observe cascade, verify visual states

## Dev Notes

### Cascade Algorithm (Server-Side)

**`toggleNodeCompletion(id)` in `node.service.ts`:**

```
1. Get node by ID (throw NotFoundError if missing)
2. Flip: newState = !node.isCompleted
3. Update node in DB: SET isCompleted = newState, updatedAt = now
4. Track affectedNodes = [{ id, isCompleted: newState }]

5. CASCADE UP (when completing — newState === true):
   a. Get parent (if no parent, return)
   b. Get all children of parent
   c. If ALL children.isCompleted === true:
      - Update parent: isCompleted = true
      - Add parent to affectedNodes
      - Recurse: repeat step 5 with parent as the new node

6. CASCADE UP (when reopening — newState === false):
   a. Get parent (if no parent, return)
   b. If parent.isCompleted === true:
      - Parent must have been auto-completed → reopen it
      - Update parent: isCompleted = false
      - Add parent to affectedNodes
      - Recurse: repeat step 6 with parent as the new node
   c. If parent.isCompleted === false: stop (already open)

7. Return { affectedNodes }
```

**Key decision:** No `isAutoCompleted` column needed. When reopening a child, if the parent is completed and now has an incomplete child, the parent must reopen. Walk up the chain checking each ancestor.

**Wrap the entire operation in a transaction** (`BEGIN IMMEDIATE` / `COMMIT`) to ensure atomicity.

### Architecture Patterns & Constraints

- **Service layer owns cascade logic** — routes handle HTTP, services handle business rules, neither touches the other's concerns
- **Single `nodes` table** with `is_completed` (integer/boolean in SQLite via Drizzle `{ mode: 'boolean' }`) — no schema changes needed, field already exists
- **Max cascade depth is 4** (project → effort → task → subtask) — bounded, no risk of stack overflow
- **Optimistic updates are mandatory** — user must see instant checkbox feedback; server confirms asynchronously via `onSettled` invalidation

### API Contract

**Endpoint:** `POST /api/nodes/:id/complete`
- **Params:** `id` (UUID) — validated by existing `idParamSchema`
- **Body:** none (toggle — server reads current state and flips)
- **Response 200:**
  ```json
  {
    "affectedNodes": [
      { "id": "node-uuid-1", "isCompleted": true },
      { "id": "parent-uuid", "isCompleted": true }
    ]
  }
  ```
- **Response 404:** `{ statusCode: 404, error: "Not Found", message: "Node not found" }`

### Technical Requirements

- **Performance:** Sub-200ms for toggle + full cascade. With max depth 4 and indexed `parent_id`, this is easily achievable.
- **Transaction safety:** Use `db.run(sql\`BEGIN IMMEDIATE\`)` / `COMMIT` / `ROLLBACK` pattern already used in move/reorder operations
- **No loading spinners:** Optimistic update makes toggle feel instant

### Architecture Compliance

- **Zod schemas in shared package** — `toggleCompletionResponseSchema` goes in `packages/shared/src/schemas/node.schema.ts`
- **Co-located tests** — service tests next to service, component tests next to component
- **Query key convention:** Invalidate `['nodes', parentId, 'children']` for each affected parent
- **File naming:** kebab-case files, PascalCase components
- **Design tokens:** Use `text-app-text-secondary` for muted state, not hardcoded colors

### Library & Framework Requirements

**Already installed — DO NOT add:**
- All UI libraries (React, TanStack Query, Zustand, Tiptap, Shadcn components)
- All server libraries (Fastify, Drizzle, better-sqlite3)
- All test libraries (Vitest, Testing Library, Playwright)

**NOT needed — DO NOT install:**
- No checkbox UI library — use a native HTML `<input type="checkbox">` or inline SVG styled with Tailwind
- No animation library — CSS `transition-opacity` is sufficient
- No state machine library — cascade logic is simple conditional branching

### File Structure Requirements

**No new files to create** (all changes go in existing files):

| File | Change |
|------|--------|
| `packages/shared/src/schemas/node.schema.ts` | Add `toggleCompletionResponseSchema` |
| `packages/server/src/services/node.service.ts` | Add `toggleNodeCompletion(id)` with cascade |
| `packages/server/src/services/node.service.test.ts` | Add 7+ cascade unit tests |
| `packages/server/src/routes/nodes.route.ts` | Add `POST /api/nodes/:id/complete` route |
| `packages/server/src/routes/nodes.route.test.ts` | Add route tests |
| `packages/client/src/api/nodes.api.ts` | Add `toggleNodeCompletion(id)` API client |
| `packages/client/src/queries/node-queries.ts` | Add `useToggleNodeCompletion()` hook |
| `packages/client/src/components/features/tree-view/tree-view.tsx` | Add checkbox to tree rows + completion styles |
| `packages/client/src/components/features/tree-view/tree-view.test.tsx` | Add checkbox + visual state tests |
| `packages/client/src/components/features/detail-panel/detail-content.tsx` | Reflect completion state in title |

**Files NOT to modify:**
- `db/schema.ts` — `isCompleted` field already exists
- `stores/*.ts` — no new stores; completion is server state via TanStack Query
- `markdown-editor.tsx` — unrelated to completion
- `breadcrumb-nav.tsx` — uses existing node data, no changes
- `inline-effort-markdown.tsx` — unrelated

### Testing Requirements

**Cascade service tests (node.service.test.ts) — MANDATORY per project-context.md:**

1. **Single node toggle:** Node with no children → completes, no cascade
2. **Cascade up — all children complete:** Effort with 3 tasks (2 done, 1 remaining) → complete last → effort auto-completes
3. **Cascade up multi-level:** Project > effort > task > 2 subtasks → complete last subtask → all ancestors cascade complete
4. **Cascade reopen — child reopened:** Auto-completed effort → reopen one child → effort reopens
5. **Cascade reopen multi-level:** Auto-completed project > effort > task → reopen subtask → task, effort, project all reopen
6. **Children retain state on direct parent reopen:** Parent completed → reopen parent → children stay completed
7. **No cascade when siblings still incomplete:** Effort with 3 tasks (1 done, 2 todo) → complete one more → effort does NOT complete (1 still todo)
8. **Delete last incomplete child → parent completes:** (This is handled by existing delete mutation + cascade check, verify integration)

**Route tests (nodes.route.test.ts):**
- POST returns 200 with `affectedNodes` array
- POST returns 404 for non-existent node
- Response matches `toggleCompletionResponseSchema`

**Component tests (tree-view.test.tsx):**
- Checkbox renders for each tree item
- Checkbox reflects `isCompleted` state
- Clicking checkbox calls mutation (mock)
- Clicking checkbox does NOT select the node
- Completed nodes show strikethrough class

**Test baseline: 356 passing → expect ~380+ after story**

### Previous Story Intelligence (Story 2.3)

**Patterns to follow:**
- Service methods: simple iterative approach (walk up parents in a loop, not recursive CTE)
- Route handlers: try/catch with `NotFoundError` → 404 pattern
- Mutation hooks: `onMutate` (optimistic) → `onError` (rollback) → `onSettled` (invalidate)
- Query invalidation: use predicate `query.queryKey[0] === 'nodes'` for broad invalidation when multiple caches affected
- Virtual tree: already uses dynamic measurement (`measureElement`) — checkbox addition won't need virtualizer changes

**Code review fixes from 2.3 to avoid repeating:**
- Use `Fragment` wrapper for sibling list items in JSX
- Invalidate ALL related query caches (ancestors, children, detail) in mutation `onSettled`
- Defer expensive component creation until needed (lazy mount pattern)
- Don't pass unused props
- Extract magic numbers into named constants

### Git Intelligence

- Branch: `story/3-1-node-completion-and-cascade-logic` (create from `main`)
- Recent commit pattern: single feature commits with descriptive messages
- Files touched in previous stories that this story modifies again: `node.service.ts`, `nodes.route.ts`, `node-queries.ts`, `tree-view.tsx`, `detail-content.tsx`, `nodes.api.ts`
- Test file convention: `*.test.tsx` / `*.test.ts` co-located with source

### Project Structure Notes

- All changes align with architecture spec file locations
- No new directories needed
- No Shadcn components to install
- Shared schema addition follows existing pattern in `node.schema.ts`

### What This Story Does NOT Include (Scope Boundaries)

- **No progress indicators** (e.g., "2/4") — that's Story 3.2
- **No progress bars** — Story 3.2
- **No bulk completion** (select multiple → complete all) — not in scope
- **No completion filters** (hide/show completed) — not in any current epic
- **No undo/redo for completion** — not specified
- **No cascade DOWN on complete** (completing parent does NOT complete children) — only cascade UP

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1 (Lines 445-478)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Cascade completion (Lines 45-46), Data architecture (Lines 130-140), API design (Line 177), Service pattern (Line 476)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR9-FR13 (Lines 208-214), NFR1 sub-200ms (Lines 276-284)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Completion checkbox patterns, visual states]
- [Source: _bmad-output/project-context.md — "Test the cascade" mandate (Line 78), "Cascade completion is bidirectional" rule (Lines 124-128)]
- [Source: _bmad-output/implementation-artifacts/2-3-breadcrumb-navigation-and-inline-effort-markdown.md — Previous story patterns, 356 test baseline]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Implemented bidirectional cascade completion logic in `node.service.ts` using iterative parent-walking approach (no recursive CTE)
- Cascade completes all ancestors when last child is completed; cascade reopens all completed ancestors when any child is reopened
- Entire toggle + cascade wrapped in `BEGIN IMMEDIATE` / `COMMIT` transaction for atomicity
- Added `toggleCompletionResponseSchema` to shared package with `affectedNodes` array for cache invalidation
- Client uses optimistic update on the toggled node, then broad `['nodes']` cache invalidation on settle to pick up cascade changes
- Checkbox uses native `<input type="checkbox">` with Tailwind styling, `e.stopPropagation()` to prevent node selection
- Visual states: `line-through` + `text-app-text-secondary` for completed nodes, `motion-safe:transition-opacity motion-safe:duration-200` respects `prefers-reduced-motion`
- Detail panel shows "Title — Completed" indicator with strikethrough when node is completed
- 8 new service tests covering all cascade edge cases (single toggle, cascade up, multi-level cascade, reopen, retain children state, no cascade when siblings incomplete, not found error)
- 3 new route tests (200 with affectedNodes, 404, response shape validation)
- 7 new component tests (checkbox rendering, isCompleted binding, onToggleComplete callback, stopPropagation, strikethrough class, aria-label)
- All 374 tests pass (18 new, up from 356 baseline)
- MCP verification confirmed: cascade complete, cascade reopen, visual states all working in browser

### Change Log

- 2026-03-12: Implemented node completion toggle with bidirectional cascade logic (Story 3.1)
- 2026-03-12: Code review fixes — targeted query invalidation using affectedNodes, optimistic detail panel update, Zod schema validation in route test, clarified cascade tracking variable, added motion-safe transition to detail indicator

### File List

- `packages/shared/src/schemas/node.schema.ts` — Added `toggleCompletionResponseSchema`
- `packages/shared/src/types/node.types.ts` — Added `ToggleCompletionResponse` type
- `packages/shared/src/index.ts` — Exported new schema and type
- `packages/server/src/services/node.service.ts` — Added `toggleNodeCompletion()` with cascade logic
- `packages/server/src/services/node.service.test.ts` — Added 8 cascade unit tests
- `packages/server/src/routes/nodes.route.ts` — Added `POST /api/nodes/:id/complete` route
- `packages/server/src/routes/nodes.route.test.ts` — Added 3 route tests
- `packages/client/src/api/nodes.api.ts` — Added `toggleNodeCompletion()` API client
- `packages/client/src/queries/node-queries.ts` — Added `useToggleNodeCompletion()` hook with optimistic updates
- `packages/client/src/components/features/tree-view/tree-row.tsx` — Added checkbox, `onToggleComplete` prop, completion visual states
- `packages/client/src/components/features/tree-view/tree-row.test.tsx` — Added 7 completion checkbox/visual tests, updated defaultProps
- `packages/client/src/components/features/tree-view/tree-view.tsx` — Wired `useToggleNodeCompletion`, added `handleToggleComplete`
- `packages/client/src/components/features/tree-view/tree-view.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/detail-panel/detail-content.tsx` — Added completion indicator
- `packages/client/src/components/features/tree-view/tree-rename-delete.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/tree-view/tree-dnd.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/detail-panel/detail-panel.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/detail-panel/detail-content.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/detail-panel/breadcrumb-nav.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/hooks/use-auto-save.test.ts` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/detail-panel/markdown-editor.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/detail-panel/detail-tabs.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/content-panel/content-panel.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/hooks/use-tree-data.test.ts` — Added `useToggleNodeCompletion` mock
- `packages/client/src/hooks/use-tree-operations.test.ts` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/project-tabs/project-tabs.test.tsx` — Added `useToggleNodeCompletion` mock
- `packages/client/src/components/features/sidebar/sidebar.test.tsx` — Added `useToggleNodeCompletion` mock
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story and epic status
- `_bmad-output/implementation-artifacts/3-1-node-completion-and-cascade-logic.md` — Story tracking updates

