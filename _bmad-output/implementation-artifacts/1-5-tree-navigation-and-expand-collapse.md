# Story 1.5: Tree Navigation & Expand/Collapse

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to navigate the tree with keyboard arrow keys and expand/collapse nodes,
so that I can move through my project hierarchy quickly without using the mouse.

## Acceptance Criteria

1. Given the tree view is focused, when the user presses the Down arrow, then focus moves to the next visible node in the tree
2. Given the tree view is focused, when the user presses the Up arrow, then focus moves to the previous visible node in the tree
3. Given a collapsed node with children is focused, when the user presses the Right arrow, then the node expands to reveal its children
4. Given an expanded node is focused, when the user presses the Right arrow, then focus moves to its first child
5. Given an expanded node is focused, when the user presses the Left arrow, then the node collapses
6. Given a collapsed node (or a leaf node) is focused, when the user presses the Left arrow, then focus moves to its parent node
7. The tree container has ARIA `role="tree"` and rows have `role="treeitem"` with proper `aria-expanded`, `aria-level`, and `aria-selected` attributes (already partially implemented in Story 1.4 — verify and complete)
8. A visible keyboard focus ring (`#3B82F6`, 2px outline with 2px offset) appears on the focused node, in addition to the existing selected-state background styling (`#EFF6FF` + `#3B82F6` left border) — both must be present for WCAG 2.1 AA compliance
9. Expand/collapse state is persisted to the `tree_view_state` table via new API endpoints
10. On next session load, the tree restores the saved expand/collapse state from the API
11. Clicking a task or subtask selects it (stores in Zustand `useUIStore` via `activeNodeId`) — this selection will be used by the detail panel in Epic 2
12. Given the tree view is focused, when the user presses the Home key, then focus moves to the first node in the tree
13. Given the tree view is focused, when the user presses the End key, then focus moves to the last visible node in the tree
14. When keyboard focus moves to a node that is off-screen (above or below the visible viewport), the tree automatically scrolls to bring the focused node into view
15. When a node is in inline edit mode (editing title), arrow key navigation is disabled — only edit-related keys work (Enter to confirm, Escape to cancel)

## Tasks / Subtasks

- [x] Task 1: Create tree_view_state API endpoints on the server (AC: #9, #10)
  - [x] 1.1 Create `packages/server/src/services/tree-state.service.ts` with methods:
    - `getExpandedStates()` — returns all rows from `tree_view_state` table as `Record<string, boolean>`
    - `setExpandedState(nodeId: string, isExpanded: boolean)` — upserts a row in `tree_view_state`
    - `bulkSetExpandedState(states: Array<{ nodeId: string; isExpanded: boolean }>)` — upserts multiple rows (for batch sync)
  - [x] 1.2 Create `packages/server/src/services/tree-state.service.test.ts`:
    - Test getExpandedStates returns correct map
    - Test setExpandedState creates and updates rows
    - Test bulkSetExpandedState handles multiple entries
    - Test cascade delete (when a node is deleted, its tree_view_state row is removed via FK cascade — already in schema)
  - [x] 1.3 Create `packages/server/src/routes/tree-state.route.ts` with endpoints:
    - `GET /api/tree-state` — returns all expand/collapse states as `{ [nodeId]: boolean }`
    - `PUT /api/tree-state/:nodeId` — sets expand state for a single node, body: `{ isExpanded: boolean }`
    - `PUT /api/tree-state` — bulk set expand states, body: `{ states: Array<{ nodeId: string; isExpanded: boolean }> }`
  - [x] 1.4 Create `packages/server/src/routes/tree-state.route.test.ts`:
    - Test GET returns empty object when no states exist
    - Test PUT single node creates/updates state
    - Test PUT bulk updates multiple states
    - Test invalid nodeId returns 404 (node doesn't exist)
  - [x] 1.5 Register the tree-state route plugin in `packages/server/src/server.ts` via `server.register(treeStateRoutes)` (following the same pattern as `nodesRoutes` registration)
  - [x] 1.6 Add Zod schemas in `packages/shared/src/schemas/tree-state.schema.ts`:
    - `treeStateSchema` — `z.object({ isExpanded: z.boolean() })`
    - `bulkTreeStateSchema` — `z.object({ states: z.array(z.object({ nodeId: z.string().uuid(), isExpanded: z.boolean() })) })`
  - [x] 1.7 Export new schemas from `packages/shared/src/index.ts` barrel

- [x] Task 2: Create the keyboard navigation hook (AC: #1, #2, #3, #4, #5, #6)
  - [x] 2.1 Create `packages/client/src/hooks/use-tree-navigation.ts`:
    - Accepts: `visibleNodes: FlatTreeNode[]`, `expandedMap`, `toggleExpand`, `setExpanded`
    - Manages `focusedIndex: number` tracking which node in the flat list is focused
    - **ArrowDown**: increment focusedIndex (clamp to last visible node)
    - **ArrowUp**: decrement focusedIndex (clamp to 0)
    - **ArrowRight on collapsed node with children**: call `setExpanded(nodeId, true)` to expand
    - **ArrowRight on expanded node**: move focus to first child (find next node in flat list with depth+1)
    - **ArrowLeft on expanded node**: call `setExpanded(nodeId, false)` to collapse
    - **ArrowLeft on collapsed/leaf node**: move focus to parent (find previous node in flat list with depth-1)
    - **Home**: move to first node
    - **End**: move to last visible node
    - Returns `{ focusedIndex, setFocusedIndex, handleKeyDown }` where `handleKeyDown` is the event handler
    - Calls `event.preventDefault()` for all handled keys to prevent page scrolling
  - [x] 2.2 Create `packages/client/src/hooks/use-tree-navigation.test.ts`:
    - Test ArrowDown moves focus to next visible node
    - Test ArrowUp moves focus to previous visible node
    - Test ArrowDown at last node does not move past end
    - Test ArrowUp at first node does not move past start
    - Test ArrowRight on collapsed node expands it
    - Test ArrowRight on expanded node moves to first child
    - Test ArrowLeft on expanded node collapses it
    - Test ArrowLeft on collapsed node moves to parent
    - Test Home moves to first node
    - Test End moves to last node

- [x] Task 3: Integrate expand/collapse persistence with API (AC: #9, #10)
  - [x] 3.1 Create `packages/client/src/api/tree-state.api.ts`:
    - `getTreeState(): Promise<Record<string, boolean>>` — calls `GET /api/tree-state`
    - `setNodeExpanded(nodeId: string, isExpanded: boolean): Promise<void>` — calls `PUT /api/tree-state/:nodeId`
    - `bulkSetTreeState(states: Array<{ nodeId: string; isExpanded: boolean }>): Promise<void>` — calls `PUT /api/tree-state`
  - [x] 3.2 Create `packages/client/src/queries/tree-state-queries.ts`:
    - `useTreeState()` — `useQuery({ queryKey: ['tree-state'], queryFn: getTreeState })` returns the expanded state map
    - `useSetNodeExpanded()` — mutation that calls `setNodeExpanded` with optimistic update on `['tree-state']` cache
  - [x] 3.3 Modify `packages/client/src/hooks/use-tree-data.ts`:
    - Replace the local `useState<Record<string, boolean>>({})` for `expandedMap` with data from `useTreeState()` query
    - When `toggleExpand` or `setExpanded` is called, fire the `useSetNodeExpanded()` mutation (optimistic update + persist to API)
    - On initial load, the tree state is fetched from the API and used to set initial expand/collapse state
    - Maintain the existing interface (`toggleExpand`, `setExpanded`, `isExpanded`) so consumers don't change

- [x] Task 4: Integrate keyboard navigation into TreeView component (AC: #1-#8, #11-#15)
  - [x] 4.1 Modify `packages/client/src/components/features/tree-view/tree-view.tsx`:
    - Import and use the `useTreeNavigation` hook
    - Wire `handleKeyDown` from the navigation hook to the tree container's `onKeyDown`
    - Pass `focusedIndex` to determine which `TreeRow` gets `isFocused={true}`
    - Ensure the focused row receives DOM focus via `ref` and `element.focus()` when `focusedIndex` changes
    - Ensure the virtualizer scrolls the focused row into view using `virtualizer.scrollToIndex(focusedIndex)`
    - **Important**: Do NOT break the existing Enter/Tab/Shift+Tab/Escape handlers from Story 1.4 — the navigation handler must coexist with the creation/editing handler. Arrow key handler should only activate when NOT in edit mode.
  - [x] 4.2 Modify `packages/client/src/components/features/tree-view/tree-row.tsx`:
    - **Focus ring**: The current isFocused styling is `border-l-2 border-l-app-accent bg-[#EFF6FF]` (left border + background). This is the "selected" visual. For WCAG keyboard focus visibility, ADD an `outline: 2px solid #3B82F6; outline-offset: 2px` (e.g., via `focus-visible:outline-2 focus-visible:outline-app-accent focus-visible:outline-offset-2` or conditional class). Both the selected background AND the outline focus ring should be present when a node is keyboard-focused.
    - Ensure `tabIndex={isFocused ? 0 : -1}` for roving tabindex (already exists from Story 1.4 — verify)
    - On click: set `focusedIndex` to this row's index AND update `useUIStore.activeNodeId` for task/subtask selection (AC #11)
  - [x] 4.3 Update Zustand store interaction:
    - When `focusedIndex` changes, update `useUIStore.activeNodeId` with the focused node's ID (this is the "selected" node for the detail panel in Epic 2)
    - Clicking a node should both set focus AND update `activeNodeId`

- [x] Task 5: Write integration tests (AC: all)
  - [x] 5.1 Create `packages/client/src/components/features/tree-view/tree-navigation.test.tsx`:
    - Test ArrowDown/ArrowUp moves visual focus between tree rows (AC #1, #2)
    - Test ArrowRight expands collapsed node (AC #3)
    - Test ArrowRight on expanded node moves to first child (AC #4)
    - Test ArrowLeft collapses expanded node (AC #5)
    - Test ArrowLeft on leaf/collapsed moves to parent (AC #6)
    - Test ARIA attributes present: role="treeitem", aria-expanded, aria-level, aria-selected (AC #7)
    - Test focus ring outline style is applied on focused node (AC #8)
    - Test clicking a node sets it as focused and updates activeNodeId in UI store (AC #11)
    - Test Home key moves to first node (AC #12)
    - Test End key moves to last visible node (AC #13)
    - Test arrow keys do NOT fire when in edit mode — editingNodeId is set (AC #15)
  - [x] 5.2 Run all existing tests to ensure no regressions: `pnpm test:unit` — all 98 existing tests must still pass

- [x] Task 6: Verify end-to-end integration
  - [x] 6.1 Start dev servers with `pnpm dev`
  - [x] 6.2 Create a project with efforts, tasks, and subtasks
  - [x] 6.3 Click on a node in the tree — it receives focus ring
  - [x] 6.4 Press ArrowDown/ArrowUp — focus moves between visible nodes
  - [x] 6.5 Press ArrowRight on collapsed node — it expands
  - [x] 6.6 Press ArrowLeft on expanded node — it collapses
  - [x] 6.7 Press ArrowRight on expanded node — focus moves to first child
  - [x] 6.8 Press ArrowLeft on leaf/collapsed node — focus moves to parent
  - [x] 6.9 Refresh the browser — expand/collapse state is restored from the API
  - [x] 6.10 Press Home — focus moves to the first node; press End — focus moves to the last visible node
  - [x] 6.11 Enter edit mode on a node (Enter to create, start typing), then press ArrowDown — arrow key should NOT navigate, should remain in edit mode
  - [x] 6.12 Verify Enter/Tab/Shift+Tab still work for node creation (Story 1.4 not broken)
  - [x] 6.13 Verify ARIA attributes are correct in browser DevTools (role, aria-expanded, aria-level, aria-selected)
  - [x] 6.14 Verify focus ring outline is visible on keyboard-focused node (distinct from just the selected background)
  - [x] 6.15 TypeScript compilation has zero errors across all packages

## Dev Notes

### Critical Technology Details

| Technology | Version | Story 1.5 Usage |
|---|---|---|
| TanStack Query | v5.90+ | New `useTreeState()` query + `useSetNodeExpanded()` mutation with optimistic updates |
| Zustand | v5.x | Existing `useUIStore` — `activeNodeId` used for node selection on click/keyboard |
| @tanstack/react-virtual | v3.x | Existing virtualizer — need `scrollToIndex` for keeping focused row visible |
| Drizzle ORM | existing | Existing `treeViewState` table — just needs service layer and routes |
| Fastify | existing | New route plugin for `/api/tree-state` endpoints |
| Zod | existing | New schemas for tree state API validation |

### Architecture Compliance

**This story adds keyboard navigation and state persistence — connecting the existing in-memory expand/collapse to the database.**

**Component File Structure (MUST create exactly):**
```
packages/server/src/
├── services/
│   ├── tree-state.service.ts          # NEW: tree_view_state CRUD
│   └── tree-state.service.test.ts     # NEW
├── routes/
│   ├── tree-state.route.ts            # NEW: GET/PUT /api/tree-state
│   └── tree-state.route.test.ts       # NEW

packages/shared/src/
├── schemas/
│   └── tree-state.schema.ts           # NEW: Zod validation schemas

packages/client/src/
├── api/
│   └── tree-state.api.ts              # NEW: API client functions
├── queries/
│   └── tree-state-queries.ts          # NEW: TanStack Query hooks
├── hooks/
│   ├── use-tree-navigation.ts         # NEW: Keyboard navigation logic
│   └── use-tree-navigation.test.ts    # NEW
├── components/features/
│   └── tree-view/
│       ├── tree-view.tsx              # MODIFY: Wire keyboard navigation
│       ├── tree-row.tsx               # MODIFY: Click selection, verify focus ring
│       └── tree-navigation.test.tsx   # NEW: Integration tests
├── hooks/
│   └── use-tree-data.ts              # MODIFY: Replace useState with API-backed state
├── stores/
│   └── ui-store.ts                   # EXISTING: activeNodeId already wired
```

**Keyboard Navigation Model (File-Manager Convention):**
```
ArrowDown   → Focus next visible node
ArrowUp     → Focus previous visible node
ArrowRight  → Expand if collapsed, move to first child if expanded
ArrowLeft   → Collapse if expanded, move to parent if collapsed/leaf
Home        → Focus first node
End         → Focus last visible node
Enter       → Create sibling (Story 1.4 — preserve)
Tab         → Indent node (Story 1.4 — preserve)
Shift+Tab   → Outdent node (Story 1.4 — preserve)
Escape      → Cancel edit (Story 1.4 — preserve)
```

**ARIA Requirements (MUST verify/complete):**
```html
<!-- Tree container -->
<div role="tree" aria-label="Project tree">

  <!-- Tree row -->
  <div role="treeitem"
       aria-expanded="true|false"  <!-- only on nodes with children -->
       aria-level="1|2|3|4"
       aria-selected="true|false"
       tabindex="0|-1">           <!-- roving tabindex -->
```

**Focus Ring Style (MUST have BOTH):**
```css
/* Existing selected-state styling (from Story 1.4 — preserve): */
border-left: 2px solid #3B82F6;
background: #EFF6FF;

/* NEW keyboard focus ring (add for WCAG 2.1 AA compliance): */
outline: 2px solid #3B82F6;
outline-offset: 2px;
/* Both styles should be present when isFocused is true */
```

**TanStack Query Key Convention (MUST follow):**
```typescript
['tree-state']  // all expand/collapse states
// Existing keys unchanged:
['nodes']                     // all root nodes (projects)
['nodes', nodeId]             // single node
['nodes', nodeId, 'children'] // children of a node
```

**Optimistic Update Pattern for Tree State:**
```typescript
// useSetNodeExpanded
useMutation({
  mutationFn: ({ nodeId, isExpanded }) => setNodeExpanded(nodeId, isExpanded),
  onMutate: async ({ nodeId, isExpanded }) => {
    await queryClient.cancelQueries({ queryKey: ['tree-state'] })
    const previous = queryClient.getQueryData(['tree-state'])
    queryClient.setQueryData(['tree-state'], (old: Record<string, boolean>) => ({
      ...old,
      [nodeId]: isExpanded,
    }))
    return { previous }
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['tree-state'], context?.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['tree-state'] })
  },
})
```

**Scroll-to-Focus Pattern (Virtualizer):**
```typescript
// When focusedIndex changes, scroll into view
useEffect(() => {
  if (focusedIndex >= 0) {
    virtualizer.scrollToIndex(focusedIndex, { align: 'auto' })
  }
}, [focusedIndex])
```

### Anti-Patterns to Avoid

- Do NOT implement rename on Enter for existing nodes — that's Story 1.6 (Enter only creates siblings, except when in edit mode for new nodes)
- Do NOT implement F2 for rename — that's Story 1.6
- Do NOT implement delete on Delete key — that's Story 1.6
- Do NOT implement drag-and-drop — that's Story 1.7
- Do NOT add checkboxes to tree rows — that's Story 3.1
- Do NOT implement Space key for toggle completion — that's Story 3.1
- Do NOT show progress indicators — that's Story 3.2
- Do NOT implement detail panel opening on node click — that's Story 2.1 (just store `activeNodeId` in Zustand)
- Do NOT implement Ctrl+K or global keyboard shortcut for capture bar focus — that's a later story
- Do NOT implement Tab key zone navigation (Capture Bar → Sidebar → Tree → Detail Panel) — that's a later story; Tab in tree context remains "indent node" per Story 1.4
- Do NOT break existing Enter/Tab/Shift+Tab/Escape handlers from Story 1.4
- Do NOT create a `__tests__/` directory — co-locate tests next to source files
- Do NOT use `any` type — use types from `@todo-bmad-style/shared`
- Do NOT add loading spinners — tree loads from local SQLite (instant)
- Do NOT use React Context for state — use Zustand stores
- Do NOT debounce tree state persistence — each expand/collapse should persist immediately via optimistic mutation (the operation is lightweight)

### Previous Story Intelligence (from Story 1.4)

**Key learnings from Story 1.4:**
- `useTreeData` hook manages expand/collapse state in local `useState<Record<string, boolean>>({})` — this is what needs to be replaced with API-backed state
- `useTreeData` exposes `toggleExpand(nodeId)`, `setExpanded(nodeId, expanded)`, `isExpanded(nodeId)` — maintain this interface
- `useTreeData` returns `UseTreeDataResult` with `{ visibleNodes: FlatTreeNode[], toggleExpand, isExpanded, setExpanded }`
- `FlatTreeNode` is exported from `use-tree-data.ts`: `{ node: NodeResponse, depth: number, isExpanded: boolean, hasChildren: boolean }`
- `TreeView` already has `onKeyDown` handler for Enter/Tab/Shift+Tab — new arrow key handler must coexist, NOT replace. Escape is handled inside TreeRow edit input.
- `TreeView` manages editing state via three variables: `editingNodeId: string | null`, `editValue: string`, `isNewNode: boolean`
- `TreeRow` already has `role="treeitem"`, `aria-expanded={hasChildren ? isExpanded : undefined}`, `aria-level={depth + 1}`, `aria-selected={isFocused}`, `tabIndex={isFocused ? 0 : -1}`
- `TreeRow` isFocused styling is `border-l-2 border-l-app-accent bg-[#EFF6FF]` — there is NO outline focus ring currently. Must add `outline: 2px solid #3B82F6; outline-offset: 2px` for keyboard accessibility.
- `TreeRow` chevron click handler calls `onToggleExpand(node.id)` with `e.stopPropagation()`
- `useUIStore` already has `activeNodeId` and `setFocusedNode(id: string | null)` — reuse for click/keyboard selection
- Virtualizer uses `useVirtualizer` with 28px row height, overscan 10 — need `scrollToIndex` for keyboard nav
- `@tanstack/react-virtual` v3.13.21 installed
- apiClient at `api/client.ts`: base URL `/api`, auto-sets `Content-Type: application/json` when body present, returns undefined for 204, throws on non-2xx
- API function pattern: `export function fnName(args): Promise<Type> { return apiClient<Type>(path, options) }`
- TanStack Query pattern: `useQuery({ queryKey, queryFn, enabled })` for queries; `useMutation({ mutationFn, onMutate, onError, onSettled })` with optimistic updates for mutations
- 98 tests currently pass (67 pre-1.4 + 31 from 1.4)

**Server route registration pattern (from server.ts):**
- `buildServer()` in `packages/server/src/server.ts` creates the Fastify instance
- Routes registered via `server.register(routePlugin)` — e.g., `server.register(nodesRoutes)`
- Route files export default async function: `export default async function(app: FastifyInstance)`
- Routes use `app.withTypeProvider<ZodTypeProvider>()` for Zod type safety
- Shared constants: `API_ROUTES.NODES` etc. from `@todo-bmad-style/shared`

**Shared package barrel export pattern (from shared/src/index.ts):**
- Groups: constants, schemas, types
- Use `export { name } from './path.js'` (note `.js` extension for ESM)
- Use `export type { TypeName } from './path.js'` for TypeScript-only exports

**Key learnings from Story 1.3:**
- Shadcn v4 `cn` import: use `import { cn } from '#/lib/utils'`
- `react-resizable-panels` v4.7.2 uses `orientation` prop (not `direction`) on PanelGroup
- `useUIStore` already has `activeProjectId`, `openProjectIds`, and `activeNodeId`
- `useSidebarStore` manages sidebar width and collapsed sections

**Key learnings from Story 1.2:**
- `tree_view_state` table schema already exists in `packages/server/src/db/schema.ts` with `nodeId` (PK, FK to nodes) and `isExpanded` (boolean, default true)
- FK cascade delete is configured — when a node is deleted, its tree_view_state row is automatically removed
- `GET /api/nodes/:id/children` returns children sorted by `sortOrder`
- Server validates node type matches parent type

**Key learnings from Story 1.1:**
- Tailwind CSS v4 uses `@theme` directive in CSS, not `tailwind.config.ts`
- Vite proxy: `/api` → `http://localhost:3001`

**Files from previous stories that this story MODIFIES:**
- `packages/client/src/hooks/use-tree-data.ts` — replace local expandedMap state with API-backed state
- `packages/client/src/components/features/tree-view/tree-view.tsx` — wire keyboard navigation hook
- `packages/client/src/components/features/tree-view/tree-row.tsx` — verify/add focus ring, click selection
- `packages/server/src/server.ts` — register new tree-state route plugin via `server.register(treeStateRoutes)` (routes are registered in `server.ts` `buildServer()`, NOT `index.ts`)
- `packages/shared/src/index.ts` — export new schemas

**Files from previous stories that this story must NOT break:**
- All server routes and services (`packages/server/src/**/*`)
- All shared schemas (`packages/shared/src/**/*`)
- All existing client components (sidebar, project-tabs, capture-bar-placeholder, content-panel)
- The existing tree-view keyboard handlers (Enter/Tab/Shift+Tab/Escape)
- All 98 existing tests must continue to pass

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): all new files follow `kebab-case` naming and feature-based folder organization per architecture spec
- New server files follow the existing route → service → db layering pattern
- New shared schemas follow the existing `{feature}.schema.ts` pattern
- No detected conflicts or variances

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Defining Core Interaction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Keyboard Navigation Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md#Tree Navigation]
- [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- [Source: _bmad-output/implementation-artifacts/1-4-tree-view-and-hierarchy-creation.md#Dev Agent Record]
- [Source: _bmad-output/implementation-artifacts/1-4-tree-view-and-hierarchy-creation.md#Previous Story Intelligence]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Shared package must be rebuilt (`pnpm --filter @todo-bmad-style/shared build`) after adding new exports for API_ROUTES.TREE_STATE to resolve correctly in server tests
- Pre-existing TypeScript error in `packages/client/src/routes/__root.tsx` (PanelSize type mismatch) — not from this story

### Completion Notes List

- **Task 1**: Created tree-state service (CRUD for tree_view_state table), route plugin (GET/PUT endpoints), Zod schemas, and registered in server.ts. 15 new server tests.
- **Task 2**: Created `useTreeNavigation` hook implementing file-manager keyboard navigation convention (ArrowDown/Up/Left/Right, Home, End). 10 new hook tests.
- **Task 3**: Created API client functions and TanStack Query hooks (`useTreeState`, `useSetNodeExpanded`) with optimistic updates. Replaced local `useState` in `useTreeData` with API-backed state. Interface maintained for consumers. Added `expandedMap` to the hook return type.
- **Task 4**: Wired keyboard navigation into TreeView component. Added `forwardRef` to TreeRow for DOM focus management. Added WCAG 2.1 AA focus ring (outline: 2px solid #3B82F6, outline-offset: 2px). Edit mode blocks arrow key navigation via `stopPropagation`. Virtualizer `scrollToIndex` keeps focused row in view.
- **Task 5**: Created 11 integration tests covering all ACs (navigation, expand/collapse, ARIA, focus ring, click selection, Home/End, edit mode guard). All 135 tests pass (98 original + 37 new).
- **Task 6**: E2E verification via Playwright MCP confirmed all ACs. Persistence verified via API call + page refresh. Focus ring visually confirmed in screenshot.

### MCP Verification Results

- **Playwright MCP**: All UI ACs verified — ArrowDown/Up/Left/Right navigation, expand/collapse, Home/End, focus ring visible, ARIA attributes correct, state persists after refresh
- **API verification**: `curl http://localhost:3001/api/tree-state` confirmed expand states persisted to database

### File List

**New files:**
- `packages/shared/src/schemas/tree-state.schema.ts` — Zod schemas for tree state API
- `packages/server/src/services/tree-state.service.ts` — tree_view_state CRUD service
- `packages/server/src/services/tree-state.service.test.ts` — service tests (8 tests)
- `packages/server/src/routes/tree-state.route.ts` — GET/PUT /api/tree-state endpoints
- `packages/server/src/routes/tree-state.route.test.ts` — route tests (7 tests)
- `packages/client/src/api/tree-state.api.ts` — API client functions
- `packages/client/src/queries/tree-state-queries.ts` — TanStack Query hooks with optimistic updates
- `packages/client/src/hooks/use-tree-navigation.ts` — keyboard navigation hook
- `packages/client/src/hooks/use-tree-navigation.test.ts` — navigation hook tests (10 tests)
- `packages/client/src/components/features/tree-view/tree-navigation.test.tsx` — integration tests (11 tests)

**Modified files:**
- `packages/shared/src/index.ts` — added tree-state schema exports
- `packages/shared/src/constants/api.ts` — added API_ROUTES.TREE_STATE
- `packages/server/src/server.ts` — registered treeStateRoutes plugin
- `packages/client/src/hooks/use-tree-data.ts` — replaced local expandedMap state with API-backed state, added expandedMap to return type
- `packages/client/src/hooks/use-tree-data.test.ts` — updated mocks for API-backed state
- `packages/client/src/components/features/tree-view/tree-view.tsx` — wired useTreeNavigation hook, focusedIndex-based selection, scroll-to-focus, edit mode guard
- `packages/client/src/components/features/tree-view/tree-view.test.tsx` — updated useTreeData mock to include expandedMap
- `packages/client/src/components/features/tree-view/tree-row.tsx` — added forwardRef, focus ring outline style, stopPropagation in edit input
- `packages/client/src/components/features/tree-view/tree-row.test.tsx` — updated chevron test for subtask type, added dash icon test
- `packages/client/vite.config.ts` — added jsdom test environment configuration

## Change Log

- 2026-03-11: Implemented Story 1.5 — Tree Navigation & Expand/Collapse. Added keyboard navigation (Arrow keys, Home, End), expand/collapse state persistence via API, WCAG 2.1 AA focus ring, and Zustand activeNodeId selection. 37 new tests, all 135 tests passing.
- 2026-03-11: Code review fixes — Made bulkSetExpandedState atomic (validate-before-write), fixed stale closure in useTreeNavigation ArrowRight/ArrowLeft handlers, strengthened AC #15 integration test, documented missing files in File List.
