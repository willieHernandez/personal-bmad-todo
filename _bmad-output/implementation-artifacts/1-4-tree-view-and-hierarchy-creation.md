# Story 1.4: Tree View & Hierarchy Creation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to create projects, efforts, tasks, and subtasks displayed in an interactive tree,
so that I can build a complete project plan with a structured hierarchy.

## Acceptance Criteria

1. Given a project is selected in the sidebar, the project's hierarchy is displayed as an expandable tree with indentation per level (16px per level)
2. The user can create a new project via a "+" button in the sidebar (already exists from Story 1.3)
3. The user can create efforts within a project, tasks within an effort, and subtasks within a task
4. Pressing Enter while focused on a node creates a new sibling node below it (outliner-style)
5. Pressing Tab on a newly created node nests it as a child of the node above (indent)
6. Pressing Shift+Tab outdents a node one level (where hierarchy rules allow)
7. New nodes are created with an inline editable title — the user types a name and it's saved
8. The tree enforces exactly four levels: Project > Effort > Task > Subtask (no deeper nesting)
9. All node creation persists immediately via `POST /api/nodes` with optimistic updates via TanStack Query
10. Tree rows display: expand/collapse chevron + node title
11. The tree uses `@tanstack/react-virtual` for virtualized rendering when nodes exceed 200

## Tasks / Subtasks

- [x] Task 1: Install dependencies (AC: #11)
  - [x] 1.1 Install `@tanstack/react-virtual` in `packages/client/`: `pnpm add @tanstack/react-virtual --filter client`
  - [x] 1.2 Verify the dependency is added to `packages/client/package.json`

- [x] Task 2: Create the tree data hooks and utilities (AC: #1, #8, #9)
  - [x] 2.1 Create `packages/client/src/hooks/use-tree-data.ts` — flattens hierarchical node data into a flat list for rendering:
    - Accepts root `parentId` (the active project ID)
    - Recursively fetches children using `useNodeChildren(parentId)` for each expanded node
    - Returns a flat array of `{ node, depth, isExpanded, hasChildren }` for the virtualizer
    - Reads expand/collapse state from a local map (persisting to `tree_view_state` API is Story 1.5)
    - Exposes `toggleExpand(nodeId)` to flip expand state
    - Exposes `getVisibleNodes()` that returns the flattened list of currently visible nodes
  - [x] 2.2 Extend `packages/client/src/queries/node-queries.ts` — add mutations:
    - `useCreateNode()` — mutation calling `createNode()`, with optimistic update: add new node to parent's `['nodes', parentId, 'children']` cache immediately, invalidate on settle
    - Ensure `createNode` in `nodes.api.ts` sends `{ title, type, parentId, sortOrder }` matching `createNodeSchema`
  - [x] 2.3 Create `packages/client/src/hooks/use-tree-operations.ts` — handles outliner-style keyboard creation:
    - `createSibling(currentNode)` — creates a new node of the same type under the same parent, with `sortOrder` = current + 1
    - `indentNode(nodeId)` — moves node to become last child of its previous sibling (changes `parentId` and `type` to one level deeper), enforces max depth (subtask cannot indent further)
    - `outdentNode(nodeId)` — moves node to become next sibling of its current parent (changes `parentId` and `type` to one level shallower), enforces min depth (effort cannot outdent past project)
    - Uses `PATCH /api/nodes/:id/move` for indent/outdent operations
    - Returns `{ createSibling, indentNode, outdentNode }`
  - [x] 2.4 Extend `packages/client/src/api/nodes.api.ts` — add `moveNode(id, data)` calling `PATCH /api/nodes/:id/move` with `{ newParentId, sortOrder }` if not already present

- [x] Task 3: Build the TreeView component (AC: #1, #10, #11)
  - [x] 3.1 Create `packages/client/src/components/features/tree-view/tree-view.tsx`:
    - Accepts `projectId: string` prop
    - Uses `useTreeData(projectId)` to get the flat list of visible nodes
    - Uses `@tanstack/react-virtual` `useVirtualizer` with the flat node list:
      - `count`: visible nodes length
      - `getScrollElement`: ref to scroll container
      - `estimateSize`: () => 28 (28px row height)
      - `overscan`: 10
    - Renders a scrollable container with `role="tree"` and `aria-label="Project tree"`
    - Maps `virtualizer.getVirtualItems()` to `<TreeRow />` components, positioned absolutely via virtualizer offsets
    - Container fills the content panel area
  - [x] 3.2 Create `packages/client/src/components/features/tree-view/tree-row.tsx`:
    - Receives: `node`, `depth`, `isExpanded`, `hasChildren`, `isFocused`
    - Row height: 28px, padding-left: `depth * 16px` (indent per level)
    - Layout: `[chevron 16px] [title text]`
    - Chevron: 16px Lucide `ChevronRight` icon, rotated 90deg when expanded, hidden when no children, `onClick` toggles expand
    - Title: `text-base` (14px), `text-primary` (#171717), truncated with ellipsis
    - Hover: background `#F5F5F5`
    - Selected/focused: background `#EFF6FF` with left border `#3B82F6` 2px
    - `role="treeitem"`, `aria-expanded={isExpanded}`, `aria-level={depth + 1}`, `aria-selected={isFocused}`
    - `tabIndex={isFocused ? 0 : -1}` for roving tabindex
    - When in edit mode (newly created): renders an `<input>` instead of static title text

- [x] Task 4: Implement inline node creation and editing (AC: #3, #4, #5, #6, #7, #8, #9)
  - [x] 4.1 Add keyboard event handler to `tree-view.tsx`:
    - **Enter** on a focused node: calls `createSibling(focusedNode)`, puts the new node into edit mode (inline input), auto-focuses the input
    - **Tab** on a node in edit mode (or just created): calls `indentNode(nodeId)` if hierarchy allows. If node is already at max depth (subtask), do nothing. Prevent default tab behavior.
    - **Shift+Tab** on a node: calls `outdentNode(nodeId)` if hierarchy allows. If node is at effort level under a project, do nothing. Prevent default tab behavior.
    - **Enter** in edit mode input: saves the title via `PATCH /api/nodes/:id` (optimistic update), exits edit mode
    - **Escape** in edit mode input: cancels — if the node was just created and title is empty, delete it. Otherwise revert to previous title.
  - [x] 4.2 Create inline editing state management in `tree-view.tsx` or a dedicated hook:
    - `editingNodeId: string | null` — which node is currently being edited
    - `setEditingNodeId(id)` — enter edit mode for a node
    - `clearEditing()` — exit edit mode
  - [x] 4.3 Node type is determined automatically by depth:
    - Depth 0 (root children) = `effort`
    - Depth 1 = `task`
    - Depth 2 = `subtask`
    - Project nodes are only created via the sidebar "+" button (Story 1.3)
    - When indenting/outdenting, the node `type` must be updated to match new depth
  - [x] 4.4 Handle sort order on creation:
    - New sibling: `sortOrder` = position after current node among its siblings
    - Use existing `POST /api/nodes` which accepts `sortOrder` in the create payload (from `createNodeSchema`)
    - Server-side already handles sort order assignment (verified from Story 1.2)

- [x] Task 5: Integrate TreeView into ContentPanel (AC: #1)
  - [x] 5.1 Update `packages/client/src/components/features/content-panel/content-panel.tsx`:
    - Replace the placeholder text "Tree view for [project] (coming in Story 1.4)" with `<TreeView projectId={activeProjectId} />`
    - Keep the empty state (no project selected) as-is
  - [x] 5.2 Ensure the tree view fills the available content panel space (flex-grow, overflow-y auto for scrolling)

- [x] Task 6: Extend the Zustand UI store for tree focus (AC: #1, #10)
  - [x] 6.1 Update `packages/client/src/stores/ui-store.ts` — add tree focus tracking:
    - `focusedNodeId: string | null` — currently focused node in the tree (alias for existing `activeNodeId` or use it directly)
    - `setFocusedNode(id: string | null)` — updates the focused node
    - Ensure `activeNodeId` from Story 1.3 is reused for this purpose (it was a placeholder)

- [x] Task 7: Write tests (AC: all)
  - [x] 7.1 Create `packages/client/src/hooks/use-tree-data.test.ts`:
    - Test flattening of nested node data
    - Test expand/collapse toggling changes visible node list
    - Test depth calculation
  - [x] 7.2 Create `packages/client/src/hooks/use-tree-operations.test.ts`:
    - Test `createSibling` creates correct type based on current node's type
    - Test `indentNode` prevents nesting beyond subtask level
    - Test `outdentNode` prevents outdenting beyond effort level
    - Test type auto-update on indent/outdent
  - [x] 7.3 Create `packages/client/src/components/features/tree-view/tree-view.test.tsx`:
    - Test tree renders nodes with correct indentation
    - Test chevron toggles expand/collapse
    - Test Enter key creates new sibling node
    - Test inline editing flow: new node → type name → Enter to save
    - Test Escape in edit mode cancels creation
  - [x] 7.4 Create `packages/client/src/components/features/tree-view/tree-row.test.tsx`:
    - Test row renders with correct depth indentation
    - Test chevron visibility (hidden when no children)
    - Test ARIA attributes (role, aria-expanded, aria-level)
    - Test edit mode renders input instead of static text
  - [x] 7.5 Run all existing tests to ensure no regressions: `pnpm test:unit` — all 67 existing tests still pass (98 total with new tests)

- [x] Task 8: Verify end-to-end integration
  - [x] 8.1 Start dev servers with `pnpm dev`
  - [x] 8.2 Select a project in the sidebar — tree view renders its children
  - [x] 8.3 Press Enter on a node — new sibling appears in edit mode
  - [x] 8.4 Type a name and press Enter — node is saved, edit mode exits
  - [x] 8.5 Press Tab on a newly created node — it indents (becomes child of previous sibling)
  - [x] 8.6 Press Shift+Tab — it outdents
  - [x] 8.7 Verify four-level limit: subtask cannot indent further
  - [x] 8.8 Verify chevrons appear only on nodes with children
  - [x] 8.9 Verify expand/collapse works on chevron click
  - [x] 8.10 TypeScript compilation has zero errors across all packages (excluding pre-existing __root.tsx PanelGroup type issue)

## Dev Notes

### Critical Technology Details

| Technology | Version | Story 1.4 Usage |
|---|---|---|
| @tanstack/react-virtual | latest (v3.x) | Virtualizer for tree rows — `useVirtualizer` hook with estimated 28px row size |
| TanStack Query | v5.90+ | Existing `useNodeChildren` + new `useCreateNode` mutation with optimistic updates |
| Zustand | v5.x | Existing `useUIStore` — reuse `activeNodeId` for tree focus tracking |
| Lucide React | installed | `ChevronRight` icon for expand/collapse chevron |
| React | 19.2.0 | Standard hooks, event handlers, refs for scroll container |

### Architecture Compliance

**This story creates the tree interaction engine — the most critical UI component in the app.**

**Component File Structure (MUST create exactly):**
```
packages/client/src/
├── hooks/
│   ├── use-tree-data.ts              # NEW: Flatten hierarchy for virtualizer
│   ├── use-tree-data.test.ts         # NEW
│   ├── use-tree-operations.ts        # NEW: Outliner-style create/indent/outdent
│   └── use-tree-operations.test.ts   # NEW
├── components/features/
│   └── tree-view/
│       ├── tree-view.tsx             # NEW: Main tree container with virtualization
│       ├── tree-view.test.tsx        # NEW
│       ├── tree-row.tsx              # NEW: Single tree row
│       └── tree-row.test.tsx         # NEW
├── queries/
│   └── node-queries.ts              # MODIFY: Add useCreateNode mutation
├── api/
│   └── nodes.api.ts                 # MODIFY: Add moveNode if not present
├── stores/
│   └── ui-store.ts                  # MODIFY: Wire up activeNodeId for tree focus
└── components/features/
    └── content-panel/
        └── content-panel.tsx         # MODIFY: Replace placeholder with TreeView
```

**Tree Row Layout (28px height):**
```
├── padding-left: depth * 16px
├── [Chevron 16px] (ChevronRight, rotated when expanded, hidden if leaf)
└── [Title text-base 14px] or [<input> in edit mode]
```

**Hierarchy Rules (MUST enforce):**
```
Project (depth 0, created via sidebar only)
  └── Effort (depth 1, child of project)
       └── Task (depth 2, child of effort)
            └── Subtask (depth 3, child of task — MAX, cannot indent further)
```

**Node type auto-determination from depth:**
```typescript
const DEPTH_TO_TYPE: Record<number, NodeType> = {
  0: 'effort',   // children of project
  1: 'task',     // children of effort
  2: 'subtask',  // children of task
}
// depth 3+ is invalid — prevent indent
```

**Outliner Keyboard Model:**
```
Enter     → Create sibling (same type, same parent, sortOrder after current)
Tab       → Indent: move node under previous sibling (type = one level deeper)
Shift+Tab → Outdent: move node under grandparent (type = one level shallower)
Enter (in input) → Save title, exit edit mode
Escape (in input) → Cancel edit, delete if new+empty
```

**Optimistic Update Pattern (MUST follow):**
```typescript
// useCreateNode example
useMutation({
  mutationFn: (data) => createNode(data),
  onMutate: async (newNode) => {
    await queryClient.cancelQueries({ queryKey: ['nodes', newNode.parentId, 'children'] })
    const previous = queryClient.getQueryData(['nodes', newNode.parentId, 'children'])
    queryClient.setQueryData(['nodes', newNode.parentId, 'children'], (old) => [...(old || []), optimisticNode])
    return { previous }
  },
  onError: (err, newNode, context) => {
    queryClient.setQueryData(['nodes', newNode.parentId, 'children'], context?.previous)
  },
  onSettled: (data, err, newNode) => {
    queryClient.invalidateQueries({ queryKey: ['nodes', newNode.parentId, 'children'] })
  },
})
```

**TanStack Query Key Convention (MUST follow):**
```typescript
['nodes']                     // all root nodes (projects)
['nodes', nodeId]             // single node
['nodes', nodeId, 'children'] // children of a node
```

**@tanstack/react-virtual Pattern:**
```typescript
const parentRef = useRef<HTMLDivElement>(null)
const virtualizer = useVirtualizer({
  count: visibleNodes.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 28,
  overscan: 10,
})
// Render:
<div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
    {virtualizer.getVirtualItems().map((virtualRow) => (
      <TreeRow
        key={visibleNodes[virtualRow.index].node.id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translateY(${virtualRow.start}px)`,
          height: `${virtualRow.size}px`,
          width: '100%',
        }}
        {...visibleNodes[virtualRow.index]}
      />
    ))}
  </div>
</div>
```

**Color Palette (from UX spec — apply consistently):**
```
Background:      #FAFAFA
Hover BG:        #F5F5F5
Selected BG:     #EFF6FF + #3B82F6 left border (2px)
Text Primary:    #171717
Text Muted:      #A3A3A3
Focus Ring:      #3B82F6 with 2px offset
```

### Anti-Patterns to Avoid

- Do NOT implement keyboard navigation (arrow keys) — that's Story 1.5
- Do NOT implement rename on Enter for existing nodes — that's Story 1.6 (Enter only creates siblings in this story, except when in edit mode for new nodes)
- Do NOT implement delete on Delete key — that's Story 1.6
- Do NOT implement drag-and-drop — that's Story 1.7
- Do NOT implement expand/collapse state persistence to API — that's Story 1.5
- Do NOT add checkboxes to tree rows — that's Story 3.1
- Do NOT show progress indicators — that's Story 3.2
- Do NOT implement inline effort markdown — that's Story 2.3
- Do NOT implement detail panel opening on node click — that's Story 2.1
- Do NOT create a `__tests__/` directory — co-locate tests next to source files
- Do NOT use `any` type — use types from `@todo-bmad-style/shared`
- Do NOT add loading spinners — tree loads from local SQLite (instant)
- Do NOT use React Context for state — use Zustand stores

### Previous Story Intelligence (from Story 1.3)

**Key learnings from Story 1.3:**
- Shadcn v4 `cn` import: new components import from `#/lib/utils` but project has `cn` at `src/components/ui/cn.ts`. A re-export exists at `src/lib/utils.ts` — use `import { cn } from '#/lib/utils'`
- `react-resizable-panels` v4.7.2 uses `orientation` prop (not `direction`) on PanelGroup
- 67 tests pass (42 server + 25 client)
- `useUIStore` already has `activeProjectId`, `openProjectIds`, and `activeNodeId` (placeholder)
- `useSidebarStore` manages sidebar width and collapsed sections
- ContentPanel reads `activeProjectId` from `useUIStore` and shows placeholder — replace with TreeView
- `useProjects()` and `useNodeChildren(parentId)` already exist in `node-queries.ts`
- API client at `api/client.ts` uses `/api` base URL prefix
- Cross-package imports: `"@todo-bmad-style/shared": "workspace:*"`
- Import alias: `#/*` → `./src/*`

**Key learnings from Story 1.2:**
- `GET /api/nodes/:id/children` returns children sorted by `sortOrder`
- `POST /api/nodes` accepts `{ title, type, parentId }` — `sortOrder` defaults to 0 on server if not provided, but sort order among siblings matters
- `PATCH /api/nodes/:id/move` accepts `{ newParentId, sortOrder }` — use for indent/outdent
- Hierarchy validation on server enforces: efforts under projects, tasks under efforts, subtasks under tasks
- Server validates node type matches parent type (e.g., rejects task under project directly)
- All responses use camelCase: `{ id, title, type, parentId, sortOrder, isCompleted, markdownBody, createdAt, updatedAt }`

**Key learnings from Story 1.1:**
- Tailwind CSS v4 uses `@theme` directive in CSS, not `tailwind.config.ts`
- Shadcn components live in `src/components/ui/`
- `cn()` utility at `src/lib/utils.ts`
- Vite proxy: `/api` → `http://localhost:3001`

**Files from previous stories that this story MODIFIES:**
- `packages/client/src/components/features/content-panel/content-panel.tsx` — replace placeholder with TreeView
- `packages/client/src/queries/node-queries.ts` — add `useCreateNode` mutation
- `packages/client/src/api/nodes.api.ts` — add `moveNode` function
- `packages/client/src/stores/ui-store.ts` — wire up `activeNodeId` / `focusedNodeId`

**Files from previous stories that this story must NOT break:**
- All server code (`packages/server/src/**/*`)
- All shared schemas (`packages/shared/src/**/*`)
- All existing client components (sidebar, project-tabs, capture-bar-placeholder)
- All 67 existing tests must continue to pass

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): all new files follow `kebab-case` naming and feature-based folder organization per architecture spec
- The `hooks/` directory under `packages/client/src/` does not exist yet — create it with this story
- No detected conflicts or variances

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Spacing & Layout Foundation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Defining Core Interaction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision]
- [Source: _bmad-output/planning-artifacts/prd.md#Tree Navigation]
- [Source: _bmad-output/planning-artifacts/prd.md#Hierarchy Management]
- [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- [Source: _bmad-output/implementation-artifacts/1-3-app-layout-and-project-sidebar.md#Dev Agent Record]
- [Source: _bmad-output/implementation-artifacts/1-2-node-data-model-and-crud-api.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing TS error in `__root.tsx` (PanelGroup `onResize` type mismatch from react-resizable-panels) — not introduced by this story
- Virtualizer tests required mocking `@tanstack/react-virtual` since jsdom has no layout engine
- Component tests needed explicit `cleanup()` calls to prevent DOM leaking between tests

### Completion Notes List

- Installed `@tanstack/react-virtual` v3.13.21
- Created `use-tree-data` hook: flattens hierarchical node data using `useQueries` for expanded nodes' children, manages expand/collapse state in local map
- Created `use-tree-operations` hook: `createSibling`, `indentNode`, `outdentNode` with hierarchy depth enforcement (max depth 2 = subtask, min depth 0 = effort)
- Created `useCreateNode` mutation with full optimistic update pattern (onMutate/onError/onSettled)
- Added `moveNode`, `updateNode`, `deleteNode` API functions
- Built `TreeView` component with `@tanstack/react-virtual` virtualizer (28px rows, overscan 10), keyboard handlers (Enter/Tab/Shift+Tab/Escape), inline editing state
- Built `TreeRow` component with depth-based indentation (16px/level), chevron expand/collapse, ARIA attributes, roving tabindex, edit mode input
- Integrated `TreeView` into `ContentPanel` replacing the placeholder
- Extended `useUIStore` with `setFocusedNode` action (reuses `activeNodeId`)
- 31 new tests added (5 use-tree-data, 7 use-tree-operations, 11 tree-row, 6 tree-view, 2 ui-store)
- All 98 tests pass (67 existing + 31 new), zero regressions

### Change Log

- 2026-03-11: Implemented Story 1.4 — Tree View & Hierarchy Creation. Added virtualized tree view with outliner-style keyboard interactions (Enter to create sibling, Tab/Shift+Tab to indent/outdent), inline node editing, and expand/collapse functionality.
- 2026-03-11: Code Review Fixes — [H2] Added newType to moveNodeSchema and server moveNode to fix indent/outdent (type wasn't updated, causing server rejection). [H1] Removed edit-mode-only guard on Tab indent to match Shift+Tab behavior. [H3] Track empty parents so chevrons don't show on childless nodes. [M3] Properly await deleteNode on edit cancel with fallback invalidation. [L1] Deduplicated FlatTreeNode interface.
- 2026-03-11: E2E Validation Fixes — Fixed createSibling sending empty title (server Zod rejected min(1)), added 'Untitled' placeholder. Added createChild + "Add effort" empty state button so users can bootstrap hierarchy. Fixed apiClient: return undefined for 204 responses, don't set Content-Type header on bodyless requests (DELETE). Fixed onBlur/onKeyDown race on Escape via cancelledRef. Auto-expand parent after Tab indent so indented node stays visible.

### File List

**New files:**
- packages/client/src/hooks/use-tree-data.ts
- packages/client/src/hooks/use-tree-data.test.ts
- packages/client/src/hooks/use-tree-operations.ts
- packages/client/src/hooks/use-tree-operations.test.ts
- packages/client/src/components/features/tree-view/tree-view.tsx
- packages/client/src/components/features/tree-view/tree-view.test.tsx
- packages/client/src/components/features/tree-view/tree-row.tsx
- packages/client/src/components/features/tree-view/tree-row.test.tsx

**Modified files:**
- packages/client/src/api/nodes.api.ts (added moveNode, updateNode, deleteNode)
- packages/client/src/queries/node-queries.ts (added useCreateNode with optimistic updates)
- packages/client/src/stores/ui-store.ts (added setFocusedNode action)
- packages/client/src/stores/ui-store.test.ts (added setFocusedNode tests)
- packages/client/src/components/features/content-panel/content-panel.tsx (replaced placeholder with TreeView)
- packages/client/package.json (added @tanstack/react-virtual dependency)
- packages/shared/src/schemas/node.schema.ts (added optional newType to moveNodeSchema)
- packages/server/src/services/node.service.ts (moveNode now accepts and applies newType)
- packages/server/src/routes/nodes.route.ts (passes newType to moveNode service)
- packages/client/src/api/client.ts (fixed 204 handling, conditional Content-Type header)
- pnpm-lock.yaml (updated from @tanstack/react-virtual install)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: in-progress → review)
