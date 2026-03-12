# Story 2.1: Detail Panel & Tabbed Views

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to click a task or subtask and see its details in a slide-over panel with tabbed views,
So that I can focus on individual items while keeping the tree visible.

## Acceptance Criteria

1. **Detail panel opens on node click:**
   Given the tree view is displayed with nodes
   When the user clicks a task or subtask
   Then a detail panel slides over from the right side of the tree view
   And the panel displays the selected node's title and content area
   And the tree remains partially visible behind/beside the panel

2. **Multi-tab support:**
   Given the detail panel is open with one task
   When the user clicks a different task or subtask in the tree
   Then a new tab opens in the detail panel for the selected item
   And the tab bar shows all open items
   And the user can switch between tabs by clicking them
   And switching tabs preserves the state of each tab (scroll position, cursor position)

3. **Close behavior (back button / Escape):**
   Given the detail panel is open
   When the user clicks the back button or presses Escape
   Then the detail panel closes and focus returns to the tree
   And focus is restored to the previously selected node in the tree

4. **Tab close behavior:**
   Given multiple tabs are open in the detail panel
   When the user closes a tab
   Then the tab is removed and the adjacent tab becomes active
   And if the last tab is closed, the detail panel closes entirely

5. **Accessibility:**
   And the detail panel uses ARIA roles for `tablist`, `tab`, and `tabpanel`
   And focus management moves between tree and detail panel predictably (NFR10)

## Tasks / Subtasks

- [x] Task 1: Create detail panel Zustand store (AC: #1, #2, #3, #4)
  - [x] 1.1 Add `detailPanel` state to a new `detail-panel-store.ts` or extend `ui-store.ts`: `openTabIds: string[]`, `activeTabId: string | null`, `isDetailPanelOpen: boolean`
  - [x] 1.2 Add actions: `openTab(nodeId)`, `closeTab(nodeId)`, `setActiveTab(nodeId)`, `closeAllTabs()`
  - [x] 1.3 Implement tab close logic: when closing active tab, activate adjacent tab; when last tab closed, set `isDetailPanelOpen = false`
  - [x] 1.4 Write unit tests for store actions

- [x] Task 2: Create `DetailPanel` container component (AC: #1, #3, #5)
  - [x] 2.1 Create `packages/client/src/components/features/detail-panel/detail-panel.tsx`
  - [x] 2.2 Slide-over container: 50% of content area width, slides from right edge
  - [x] 2.3 Add `role="complementary"` and `aria-label="Task detail panel"` to panel container
  - [x] 2.4 Handle Escape key: close panel, return focus to tree
  - [x] 2.5 Add back button to panel header that closes panel
  - [x] 2.6 Animate slide-in/slide-out with CSS transition (respect `prefers-reduced-motion`)
  - [x] 2.7 Write component tests

- [x] Task 3: Create `DetailTabs` tab bar component (AC: #2, #4, #5)
  - [x] 3.1 Create `packages/client/src/components/features/detail-panel/detail-tabs.tsx`
  - [x] 3.2 Horizontal tab bar with `role="tablist"`, each tab with `role="tab"`
  - [x] 3.3 Each tab shows node title and close button (x)
  - [x] 3.4 Middle-click on tab closes it
  - [x] 3.5 Active tab styling (accent bottom border)
  - [x] 3.6 Tab switching preserves scroll/cursor state per tab
  - [x] 3.7 Write component tests

- [x] Task 4: Create `DetailContent` tab panel component (AC: #1, #2, #5)
  - [x] 4.1 Create `packages/client/src/components/features/detail-panel/detail-content.tsx`
  - [x] 4.2 Content area with `role="tabpanel"` displaying selected node's title and placeholder content area (markdown editor comes in Story 2.2)
  - [x] 4.3 Display node title, type badge, and completion status
  - [x] 4.4 Render `markdownBody` as read-only text for now (Tiptap editor in Story 2.2)
  - [x] 4.5 Write component tests

- [x] Task 5: Integrate detail panel into ContentPanel layout (AC: #1)
  - [x] 5.1 Modify `content-panel.tsx` to render `DetailPanel` alongside `TreeView`
  - [x] 5.2 Layout: TreeView takes remaining space, DetailPanel takes 50% when open (flex layout)
  - [x] 5.3 When panel closed, TreeView takes full width
  - [x] 5.4 Update existing content-panel tests

- [x] Task 6: Wire tree node clicks to open detail panel (AC: #1, #2)
  - [x] 6.1 Modify `tree-row.tsx` or `tree-view.tsx`: on task/subtask click, call `openTab(nodeId)` from detail panel store
  - [x] 6.2 Clicking effort or project nodes also opens in detail panel (per AC and Story 2.2 which says all hierarchy levels support markdown)
  - [x] 6.3 Ensure double-click for rename still works (don't conflict with single-click open)
  - [x] 6.4 Update tree-view tests for new click behavior

- [x] Task 7: Focus management between tree and detail panel (AC: #3, #5)
  - [x] 7.1 When detail panel opens, move focus to the panel content area
  - [x] 7.2 When panel closes (Escape/back), restore focus to the previously selected tree node
  - [x] 7.3 Tab key cycles between tree zone and detail panel zone
  - [x] 7.4 Test focus management transitions

- [x] Task 8: Add `useNode(nodeId)` query hook (AC: #1)
  - [x] 8.1 Add `getNode(id)` to `nodes.api.ts` — `GET /api/nodes/:id`
  - [x] 8.2 Add `useNode(nodeId)` query hook to `node-queries.ts` with query key `['nodes', nodeId]`
  - [x] 8.3 Detail panel content fetches individual node data via this hook
  - [x] 8.4 Write query hook tests

## Dev Notes

### Architecture Patterns & Constraints

- **State management boundary**: TanStack Query for node data (server state), Zustand for detail panel UI state (open tabs, active tab, panel visibility). NO React Context.
- **Optimistic updates**: The `useUpdateNode` mutation already supports optimistic updates with `onMutate/onError/onSettled` pattern. Reuse this for any node updates from the detail panel.
- **Component location**: All detail panel components go in `packages/client/src/components/features/detail-panel/` — feature-based folders, not type-based.
- **File naming**: kebab-case files (`detail-panel.tsx`), PascalCase components (`DetailPanel`).
- **Testing**: Co-located tests (`detail-panel.test.tsx` next to `detail-panel.tsx`). No `__tests__/` directories.
- **Styling**: Tailwind CSS v4 + CSS custom properties. Use existing design tokens (`bg-app-bg`, `text-app-text-primary`, `border-app-border`, `ring-app-accent`, etc.).
- **Accessibility**: WCAG 2.1 AA. Use Radix UI / Shadcn/ui primitives where available (Tabs component). Visible focus indicators using `focus-visible:ring-2 focus-visible:ring-app-accent`.
- **No loading spinners**: SQLite reads are sub-ms. Show content instantly. Only show skeleton on initial app load.

### Key Existing Code to Understand

- **`ui-store.ts`**: Current Zustand store has `activeProjectId`, `openProjectIds`, `activeNodeId`, `setFocusedNode()`. The detail panel store should follow same patterns.
- **`node-queries.ts`**: Has `useProjects()`, `useNodeChildren()`, `useCreateNode()`, `useUpdateNode()`, `useDeleteNode()`, `useReorderNode()`, `useMoveNode()`. Need to ADD `useNode(nodeId)` for single-node fetch.
- **`nodes.api.ts`**: Has all CRUD + move/reorder. Need to ADD `getNode(id)` — `GET /api/nodes/:id`.
- **`content-panel.tsx`**: Currently renders `TreeView` full-width. Must be modified to flex layout with optional `DetailPanel` beside it.
- **`tree-row.tsx`**: Currently handles click for node selection (`setFocusedNode`). Need to also trigger `openTab` on click.
- **`updateNodeSchema`**: Already supports `{ title?, markdownBody? }` — detail panel can use existing `PATCH /api/nodes/:id` for updates.

### API Endpoint Status

- `GET /api/nodes/:id` — **Already exists** (see `packages/server/src/routes/nodes.route.ts:61`). No server changes needed.
- `PATCH /api/nodes/:id` — Already exists, accepts `{ title?, markdownBody? }` via `updateNodeSchema`.
- All other node endpoints already exist from Epic 1.

### UX Specifications

- **Panel width**: 50% of content area when open
- **Slide animation**: From right edge, CSS transition, respect `prefers-reduced-motion`
- **Tab bar**: Horizontal tabs with close buttons, accent bottom border on active tab
- **Close mechanisms**: Back button in header + Escape key
- **Focus flow**: Tree → Detail Panel (on open), Detail Panel → Tree (on close/Escape)
- **No toolbar** in content area (toolbar comes with Tiptap in Story 2.2)
- **Placeholder content**: For this story, display node title and raw `markdownBody` text. Full WYSIWYG editor is Story 2.2.
- **Font**: JetBrains Mono throughout
- **Dark mode ready**: Use CSS custom properties, not hardcoded colors

### Previous Story Intelligence (Story 1.7)

- **CSS hover pattern**: Story 1.7 used plain CSS `[role="treeitem"]:hover .tree-row-drag-handle` due to Tailwind v4 group-hover limitation. Reuse this pattern if needed.
- **`pendingFocusNodeId.current`**: Ref pattern for deferred focus restoration. Reuse for detail panel close → tree focus.
- **Edit mode guard**: `editingNodeId` check prevents processing other interactions during rename. Ensure detail panel click doesn't interfere with rename mode.
- **`cn` utility**: Import from `'#/lib/utils'` for conditional classnames.
- **188 tests passing**: All existing tests must continue to pass. Run full test suite after implementation.

### Git Intelligence

- Recent commits follow pattern: feature implementation in single commits, bug fixes as follow-ups
- Story branches: `story/{story-key}` from main (e.g., `story/2-1-detail-panel-and-tabbed-views`)
- All commits on feature branch, PR when done

### Project Structure Notes

- Alignment with unified project structure: detail panel is a new feature folder under `packages/client/src/components/features/detail-panel/`
- No conflicts with existing tree-view, sidebar, capture-bar, or project-tabs features
- The `content-panel.tsx` is the integration point — it currently only renders `TreeView` and needs to flex-layout with `DetailPanel`

### What This Story Does NOT Include (Scope Boundaries)

- **No Tiptap/WYSIWYG editor** — That's Story 2.2. This story shows raw markdown text as read-only.
- **No breadcrumb navigation** — That's Story 2.3.
- **No auto-save** — That's Story 2.2.
- **No inline effort markdown in tree** — That's Story 2.3.
- **No session persistence** — Open tabs are NOT persisted across page reloads in this story. Session state persistence is Epic 6.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.1 (Lines 355-387)]
- [Source: _bmad-output/planning-artifacts/architecture.md - Detail Panel component structure, state management, API patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Detail panel anatomy, tab behavior, keyboard navigation, layout zones]
- [Source: _bmad-output/project-context.md - Implementation rules, testing standards, code conventions]
- [Source: _bmad-output/implementation-artifacts/1-7-drag-and-drop-reorder-and-move.md - Previous story learnings]
- [Source: packages/shared/src/schemas/node.schema.ts - updateNodeSchema supports {title?, markdownBody?}]
- [Source: packages/client/src/stores/ui-store.ts - Existing Zustand store patterns]
- [Source: packages/client/src/queries/node-queries.ts - Existing query hooks and optimistic update patterns]
- [Source: packages/client/src/components/features/content-panel/content-panel.tsx - Integration point for detail panel]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed React hooks ordering error in content-panel.tsx (useCallback must be called before conditional return)
- Fixed CSS.escape not available in jsdom test environment — replaced with document.getElementById
- Fixed scrollIntoView not available in jsdom — used optional chaining

### Completion Notes List

- Created new Zustand store `detail-panel-store.ts` following existing patterns from ui-store.ts
- Built 3 new components: DetailPanel (container with slide-over), DetailTabs (tab bar), DetailContent (tab panel)
- Added `getNode` API function and `useNode` query hook for single-node fetching
- Integrated detail panel into ContentPanel with flex layout (tree + panel side-by-side)
- Wired tree node clicks to open detail panel tabs (with editingNodeId guard to prevent conflicts with rename)
- Implemented focus management: panel receives focus on open, tree receives focus on close (Escape/back button)
- All ARIA roles implemented: complementary, tablist, tab (with aria-selected), tabpanel (with aria-labelledby)
- CSS transitions with prefers-reduced-motion support
- Middle-click tab close supported
- 218 total tests passing (157 client + 61 server), including 30 new tests for this story

### MCP Verification Results

- AC #1 ✅ Detail panel opens on node click, shows title/content, tree visible beside panel
- AC #2 ✅ Multi-tab support: new tabs open on different node clicks, tab bar shows all, switching works
- AC #3 ✅ Escape key and back button close panel, focus returns to previously selected tree node
- AC #4 ✅ Tab close removes tab and activates adjacent; last tab close closes panel entirely
- AC #5 ✅ ARIA roles: complementary, tablist, tab, tabpanel all present and correct

### File List

- packages/client/src/stores/detail-panel-store.ts (new)
- packages/client/src/stores/detail-panel-store.test.ts (new)
- packages/client/src/components/features/detail-panel/detail-panel.tsx (new)
- packages/client/src/components/features/detail-panel/detail-panel.test.tsx (new)
- packages/client/src/components/features/detail-panel/detail-tabs.tsx (new)
- packages/client/src/components/features/detail-panel/detail-tabs.test.tsx (new)
- packages/client/src/components/features/detail-panel/detail-content.tsx (new)
- packages/client/src/components/features/detail-panel/detail-content.test.tsx (new)
- packages/client/src/api/nodes.api.ts (modified — added getNode)
- packages/client/src/queries/node-queries.ts (modified — added useNode hook)
- packages/client/src/queries/node-queries.test.ts (modified — added getNode mock)
- packages/client/src/components/features/content-panel/content-panel.tsx (modified — flex layout with DetailPanel)
- packages/client/src/components/features/tree-view/tree-view.tsx (modified — openTab on click)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — status update)
- _bmad-output/implementation-artifacts/2-1-detail-panel-and-tabbed-views.md (modified — task completion)

## Change Log

- 2026-03-11: Implemented detail panel with tabbed views (Story 2.1). Added Zustand store for panel state, 3 new components (DetailPanel, DetailTabs, DetailContent), useNode query hook, integrated into ContentPanel layout, wired tree clicks, and implemented focus management with full ARIA accessibility.
- 2026-03-11: Code review fixes — Added WAI-ARIA tab keyboard navigation (Arrow/Home/End + roving tabindex), guarded setActiveTab against invalid IDs, differentiated useNode query key to prevent invalidation collisions, implemented scroll position save/restore per tab, guarded Escape handler when panel closed, replaced hardcoded color with design token, added useNode direct test and expanded store/tab test coverage. 169 tests passing.
