---
title: 'Tree View UX Enhancements and Error Boundary'
slug: 'tree-view-ux-enhancements-and-error-boundary'
created: '2026-03-12'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React', 'TypeScript', 'Zustand', 'TanStack Query', 'TanStack Router', 'Tailwind CSS', 'Radix UI', 'Shadcn/ui']
files_to_modify: ['packages/client/src/components/features/tree-view/tree-view.tsx', 'packages/client/src/components/features/tree-view/tree-row.tsx', 'packages/client/src/components/features/detail-panel/detail-content.tsx', 'packages/client/src/routes/__root.tsx', 'packages/client/src/components/error-boundary.tsx']
code_patterns: ['optimistic-mutations', 'zustand-stores', 'tanstack-query-keys', 'feature-based-folders', 'forwardRef-components', 'kebab-case-files']
test_patterns: ['co-located-tests', 'vitest', 'testing-library']
---

# Tech-Spec: Tree View UX Enhancements and Error Boundary

**Created:** 2026-03-12

## Overview

### Problem Statement

The tree view lacks keyboard-driven move/reorder shortcuts, has no visual differentiation between node types (effort/task/subtask), and the detail panel doesn't show children of the selected node. Additionally, the app has no error boundary — unhandled errors crash the UI with raw error output instead of a user-friendly screen.

### Solution

Four small enhancements: (1) Cmd+Arrow keyboard shortcuts for move/reorder in tree view, (2) App-level error boundary with friendly contact screen and reload button, (3) Font size/weight differentiation for effort/task/subtask in tree rows, (4) Condensed clickable children list in the detail panel for efforts and tasks.

### Scope

**In Scope:**
- Cmd+Up/Down for sibling reorder within same parent
- Cmd+Left/Right for indent/outdent (same as Tab/Shift+Tab)
- Error boundary at layout level with "reach out to Willie Hernandez" message + reload button
- Visual hierarchy in tree rows: effort (H3-sized), task (H4-sized), subtask (H5-sized) text
- Condensed children list section in detail panel for efforts and tasks, clickable to open child tab

**Out of Scope:**
- New API endpoints (reorder/move already exist)
- Mobile/responsive considerations
- Changes to drag-and-drop behavior
- Children list for projects or subtasks (only efforts and tasks)

## Context for Development

### Codebase Patterns

- **Keyboard handling**: `tree-view.tsx` has a `handleKeyDown` function (line ~502) on the container div. Already handles Tab/Shift+Tab for indent/outdent, Ctrl+Enter for sibling creation, Enter for rename, Delete for removal. Arrow keys delegated to `useTreeNavigation` hook.
- **Reorder mutation**: `useReorderNode()` from `node-queries.ts` (line ~226) accepts `{ id, parentId, sortOrder }`. Has full optimistic update: removes item from array, inserts at sortOrder, remaps all sortOrders.
- **Move mutation**: `useMoveNode()` from `node-queries.ts` (line ~255) accepts `{ id, oldParentId, data: { newParentId, sortOrder, newType } }`. Full optimistic update with invalidation of both parent caches.
- **Indent/Outdent**: `use-tree-operations.ts` exports `indentNode(nodeId, visibleNodes)` and `outdentNode(nodeId, visibleNodes)`. Indent finds previous sibling and moves node under it. Outdent finds grandparent and moves node up a level. Both handle type conversion via `DEPTH_TO_TYPE` map.
- **Tree row rendering**: `tree-row.tsx` is a `forwardRef` component. Renders: drag handle → checkbox → expand/collapse → title (or input when editing) → progress indicator → delete button. Indentation via `paddingLeft: depth * 16px`. Currently no font size variation by node type.
- **Detail content**: `detail-content.tsx` renders `BreadcrumbNav` + completion indicator + `MarkdownEditor`. No children list exists. Node data fetched via `useNode(nodeId)`.
- **Detail panel store**: Zustand store with `openTab(nodeId)` action that adds to `openTabIds` and sets `activeTabId`.
- **Node children query**: `useNodeChildren(parentId)` from `node-queries.ts` returns `NodeResponse[]` with query key `['nodes', parentId, 'children']`.
- **Root layout**: `__root.tsx` has `QueryClientProvider` wrapping a `ResizablePanelGroup` with Sidebar + ContentPanel. No error boundary exists.
- **Visible nodes**: Tree view maintains `visibleNodes: FlatTreeNode[]` — a flat array with `{ node, depth }` objects. Used by keyboard nav and operations.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/client/src/components/features/tree-view/tree-view.tsx` | Main tree component — keyboard handling, DnD, rendering |
| `packages/client/src/components/features/tree-view/tree-row.tsx` | Individual row — styling, editing, expand/collapse |
| `packages/client/src/hooks/use-tree-operations.ts` | indent/outdent/createChild/createSibling logic |
| `packages/client/src/queries/node-queries.ts` | All query/mutation hooks including reorder and move |
| `packages/client/src/components/features/detail-panel/detail-content.tsx` | Tab content — breadcrumb, editor, where children list goes |
| `packages/client/src/stores/detail-panel-store.ts` | Zustand store for tab management with `openTab()` |
| `packages/client/src/routes/__root.tsx` | Root layout — where error boundary wraps |

### Technical Decisions

- **Cmd+Left/Right** reuses existing `indentNode`/`outdentNode` from `use-tree-operations.ts` — no new logic needed, just a new keyboard binding.
- **Cmd+Up/Down** will find the adjacent sibling in `visibleNodes` (same depth, same parent) and call `useReorderNode` with swapped sortOrder. This matches DnD reorder behavior exactly.
- **Error boundary** must be a React class component (React requirement for `componentDidCatch`/`getDerivedStateFromError`). Placed inside `QueryClientProvider` but wrapping the layout panels in `__root.tsx`.
- **Visual differentiation** uses Tailwind text size/weight classes on the title span in `tree-row.tsx`, keyed by `node.type`. No structural changes — purely CSS.
- **Children list** in `detail-content.tsx` uses `useNodeChildren(nodeId)` to fetch children, rendered as a compact horizontal row of clickable chips/links between breadcrumb and editor. Calls `openTab(childId)` on click.
- **Children list only for effort and task types** — subtasks have no children, projects are in sidebar. Conditional render based on `node.type`.

## Implementation Plan

### Tasks

- [x] Task 1: Add error boundary component
  - File: `packages/client/src/components/error-boundary.tsx` (new)
  - Action: Create a React class component with `getDerivedStateFromError` and `componentDidCatch`. Render a centered full-screen error page with: an error icon, heading "Something went wrong", body text "Please reach out to Willie Hernandez for assistance.", and a "Reload" button that calls `window.location.reload()`. Style with Tailwind — clean, centered layout using existing app color tokens (`text-app-text`, `bg-app-bg`, etc.).
  - Notes: Must be a class component (React requirement). Accept `children` prop. Log error to console in `componentDidCatch`.

- [x] Task 2: Wrap root layout with error boundary
  - File: `packages/client/src/routes/__root.tsx`
  - Action: Import `ErrorBoundary` from `../components/error-boundary`. Wrap the content inside `QueryClientProvider` (the `ResizablePanelGroup` and surrounding elements) with `<ErrorBoundary>`. The boundary should be inside `QueryClientProvider` so TanStack Query errors are caught.
  - Notes: Keep `QueryClientProvider` outside the boundary so error recovery can still use query client.

- [x] Task 3: Add visual type differentiation to tree rows
  - File: `packages/client/src/components/features/tree-view/tree-row.tsx`
  - Action: Add a type-to-style mapping for the title span element. Map `node.type` to Tailwind classes:
    - `effort`: `text-base font-semibold` (H3-like)
    - `task`: `text-sm font-medium` (H4-like)
    - `subtask`: `text-xs font-normal` (H5-like)
  - Notes: Apply to both the display span and the edit input so sizes are consistent during rename. The existing strikethrough styling for completed nodes should be preserved and combined with the new classes.

- [x] Task 4: Add Cmd+Up/Down keyboard reorder in tree view
  - File: `packages/client/src/components/features/tree-view/tree-view.tsx`
  - Action: In the `handleKeyDown` function, add cases for `ArrowUp` and `ArrowDown` when `e.metaKey` is true (before the existing arrow key delegation to useTreeNavigation). For each:
    1. Find the focused node in `visibleNodes`
    2. Find the adjacent sibling in the desired direction — must have the same `depth` and same `parentId` (scan up/down through `visibleNodes` skipping nodes at different depths or different parents)
    3. If no sibling found in that direction, return early (already at top/bottom)
    4. Calculate the new `sortOrder`: for Cmd+Up, use sibling's sortOrder; for Cmd+Down, use sibling's sortOrder
    5. Call `reorderNodeMutation.mutate({ id: focusedNode.id, parentId: focusedNode.parentId, sortOrder: targetSortOrder })`
    6. Update `focusedIndex` to track the moved node's new position
    7. Call `e.preventDefault()` to suppress default browser behavior
  - Notes: The `useReorderNode` mutation already handles optimistic updates (removes from current position, inserts at new sortOrder, remaps all). The focused index needs updating because `visibleNodes` will change after the optimistic update.

- [x] Task 5: Add Cmd+Left/Right keyboard indent/outdent in tree view
  - File: `packages/client/src/components/features/tree-view/tree-view.tsx`
  - Action: In the `handleKeyDown` function, add cases for `ArrowLeft` and `ArrowRight` when `e.metaKey` is true (before the existing arrow key delegation). For each:
    - `Cmd+Right` (indent): Call `treeOps.indentNode(focusedNode.id, visibleNodes)` — same as existing Tab handler
    - `Cmd+Left` (outdent): Call `treeOps.outdentNode(focusedNode.id, visibleNodes)` — same as existing Shift+Tab handler
    - Call `e.preventDefault()` to suppress default browser behavior
  - Notes: This is a direct reuse of the existing indent/outdent logic. The Tab/Shift+Tab handlers remain as alternate bindings.

- [x] Task 6: Add children list to detail panel content
  - File: `packages/client/src/components/features/detail-panel/detail-content.tsx`
  - Action: Add a condensed children list between the breadcrumb/completion section and the MarkdownEditor. Implementation:
    1. Import `useNodeChildren` from queries and `useDetailPanelStore` for `openTab`
    2. Only render for `effort` and `task` node types (check `node.type`)
    3. Call `useNodeChildren(nodeId)` to fetch first-level children
    4. Render as a compact horizontal flex-wrap row of small clickable text links/chips
    5. Each chip shows the child's `title`, truncated if long
    6. On click, call `openTab(child.id)` to open a detail tab for that child
    7. Show completion status via subtle strikethrough on completed children
    8. Style: small text (`text-xs`), muted color, horizontal layout with small gaps, minimal vertical padding to stay condensed
  - Notes: `useNodeChildren` is already used by the tree view so the data will likely be cached. The list should be visually lightweight — think inline tags/chips, not a full list component. If there are no children, don't render the section at all.

### Acceptance Criteria

- [ ] AC 1: Given the app encounters an unhandled React error, when the error boundary catches it, then a centered error screen displays with the message "Something went wrong", contact text "Please reach out to Willie Hernandez for assistance.", and a "Reload" button.
- [ ] AC 2: Given the error screen is displayed, when the user clicks the "Reload" button, then the page reloads fully.
- [ ] AC 3: Given a node is focused in the tree view, when the user presses Cmd+Up, then the node swaps position with the sibling above it (same parent) and the node remains focused.
- [ ] AC 4: Given a node is focused in the tree view, when the user presses Cmd+Down, then the node swaps position with the sibling below it (same parent) and the node remains focused.
- [ ] AC 5: Given a node is the first child of its parent, when the user presses Cmd+Up, then nothing happens (no error, no movement).
- [ ] AC 6: Given a node is the last child of its parent, when the user presses Cmd+Down, then nothing happens (no error, no movement).
- [ ] AC 7: Given a node is focused in the tree view, when the user presses Cmd+Right, then the node is indented (moved under previous sibling), same as pressing Tab.
- [ ] AC 8: Given a node is focused in the tree view, when the user presses Cmd+Left, then the node is outdented (moved to grandparent), same as pressing Shift+Tab.
- [ ] AC 9: Given the tree view displays efforts, tasks, and subtasks, when rendered, then efforts display with larger/bolder text (H3-like), tasks with medium text (H4-like), and subtasks with smaller text (H5-like).
- [ ] AC 10: Given the detail panel is open for an effort node that has task children, when the detail content renders, then a condensed list of clickable child task names appears between the breadcrumb and the editor.
- [ ] AC 11: Given the detail panel is open for a task node that has subtask children, when the detail content renders, then a condensed list of clickable child subtask names appears between the breadcrumb and the editor.
- [ ] AC 12: Given the children list is displayed in the detail panel, when the user clicks a child name, then a new detail tab opens for that child node.
- [ ] AC 13: Given the detail panel is open for a subtask node, when the detail content renders, then no children list section appears.
- [ ] AC 14: Given the detail panel is open for a node with no children, when the detail content renders, then no children list section appears.

## Additional Context

### Dependencies

No new dependencies required. All features use existing libraries and APIs:
- `useReorderNode` / `useMoveNode` mutations (existing)
- `useNodeChildren` query (existing)
- `indentNode` / `outdentNode` operations (existing)
- `openTab` from detail panel store (existing)

### Testing Strategy

**Unit Tests:**
- `error-boundary.test.tsx`: Test that error boundary catches errors and renders the error screen. Test that reload button triggers `window.location.reload`.
- `tree-row.test.tsx`: Test that node type maps to correct CSS classes (effort → text-base font-semibold, task → text-sm font-medium, subtask → text-xs font-normal).

**Manual Testing:**
- Keyboard reorder: Create a project with multiple efforts/tasks, use Cmd+Up/Down to reorder, verify position changes and persistence after refresh.
- Keyboard indent/outdent: Use Cmd+Left/Right, verify same behavior as Tab/Shift+Tab.
- Error boundary: Temporarily throw an error in a component to verify the error screen renders correctly.
- Visual differentiation: Create efforts, tasks, and subtasks in a tree — verify visible size differences.
- Children list: Open detail panel for an effort with tasks, verify clickable list appears and opens tabs correctly.

**Playwright E2E (verification at end):**
- Navigate to localhost:5173, create a tree structure, verify visual differentiation is visible.
- Use keyboard shortcuts to reorder and indent/outdent.
- Open detail panel and verify children list and tab opening.

### Notes

- These are four independent features that can be implemented in any order, but Task 1 → Task 2 must be sequential (create boundary before wrapping root).
- Cmd+Arrow shortcuts on macOS: Cmd+Left/Right are used by macOS for text cursor home/end — but the tree view is not a text input, so no conflict. The tree container div captures keyboard events and calls `preventDefault`.
- The `visibleNodes` array in tree-view.tsx is the key data structure for finding siblings for Cmd+Up/Down reorder. Sibling = same depth AND same `parentId`.
- Reorder optimistic updates are already production-tested via DnD — keyboard reorder uses the same mutation so optimistic behavior is inherited.
- Children list fetches via `useNodeChildren` which will likely hit TanStack Query cache since the tree already fetches children for expanded nodes.

## Review Notes
- Adversarial review completed
- Findings: 10 total, 3 fixed, 7 skipped (pre-existing patterns, acceptable for localhost, or out of scope)
- Resolution approach: auto-fix
- Fixed: F1 (cross-platform Ctrl/Cmd support), F5 (cn() utility for child chips), F6 (aria-label accessibility)
