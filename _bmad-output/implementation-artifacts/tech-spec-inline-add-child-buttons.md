---
title: 'Inline Add-Child Buttons in Tree View'
slug: 'inline-add-child-buttons'
created: '2026-03-13'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React', 'TypeScript', '@tanstack/react-virtual', '@tanstack/react-query', 'TailwindCSS', 'lucide-react']
files_to_modify: ['packages/shared/src/constants/hierarchy.ts', 'packages/client/src/hooks/use-tree-data.ts', 'packages/client/src/components/features/tree-view/add-child-button.tsx', 'packages/client/src/components/features/tree-view/tree-view.tsx', 'packages/client/src/hooks/use-tree-navigation.ts']
code_patterns: ['Flat virtualized list with @tanstack/react-virtual', 'Discriminated union types for row variants', 'VALID_CHILD_TYPES map extracted to shared/constants/hierarchy.ts', 'nodeRows filtered array for node-only operations']
test_patterns: ['Co-located tests: {file}.test.{ts|tsx}', 'Component tests mock TanStack Query', 'E2E tests in packages/client/e2e/ by user journey', 'Unit tests for flatten logic in use-tree-data']
---

# Tech-Spec: Inline Add-Child Buttons in Tree View

**Created:** 2026-03-13

## Overview

### Problem Statement

Users currently can only create new nodes via keyboard shortcuts (Ctrl+Enter) or the empty-state button. There's no discoverable, visual way to add a child node at a specific level in the tree.

### Solution

Add subtle `+ Add {childType}` buttons at the bottom of each expanded node's children list, rendered as virtual rows in the flat tree. Clicking creates a new child node as the last child and auto-focuses the inline title editor.

### Scope

**In Scope:**
- Extract `VALID_CHILD_TYPES` to shared constants for reuse
- Add virtual "add button" rows to the flattened tree data after the last child of each expanded node
- Render a subtle `+ Add {type}` button component for these rows
- Button creates a child of the parent node (appended as last child) and enters edit mode
- Respect hierarchy rules (no button under subtasks, correct child type labels)
- Hidden when parent is collapsed
- Keyboard accessible (focusable, activatable via Enter/Space)

**Out of Scope:**
- Changing existing keyboard shortcuts or creation flows
- Adding buttons for the project level (root)
- Mobile/touch considerations
- Drag-drop interaction with add buttons

## Context for Development

### Codebase Patterns

- **Flat virtualized list**: `use-tree-data.ts` recursively flattens the tree into `FlatTreeNode[]`. The virtualizer in `tree-view.tsx` renders only visible rows using `@tanstack/react-virtual` with `measureElement` for dynamic row heights.
- **Discriminated union approach**: The `visibleNodes` array currently contains only `FlatTreeNode` items. To support add-button rows, introduce a union type: `type TreeRow = FlatTreeNode | AddButtonRow`. The flatten function injects `AddButtonRow` items after the last child of each expanded parent.
- **Hierarchy rules**: `VALID_CHILD_TYPES` is currently defined locally in `tree-view.tsx` (line 56) as `{ project: 'effort', effort: 'task', task: 'subtask' }`. This must be extracted to `packages/shared/src/constants/hierarchy.ts` so both `use-tree-data.ts` and `tree-view.tsx` can import it without duplication.
- **Node creation flow**: `createChild(parentId, type)` in `use-tree-operations.ts` → `useCreateNode()` mutation → `POST /api/nodes` → optimistic update with temp ID → server replaces with real ID. **Important**: `createChild` currently hardcodes `sortOrder: 0`, placing new nodes at the **top**. The add-button click handler must compute the correct sortOrder (children count) to append at the **bottom**.
- **Edit mode after creation**: The existing `handleCreateFirstEffort` pattern (tree-view.tsx lines 716-724) sets `setEditValue('')` and `setIsNewNode(true)` after creation. When `isNewNode` is true, cancelling edit (Escape or blur with empty text) **deletes** the node. The add-button flow must follow this exact pattern.
- **Keyboard navigation**: `useTreeNavigation` handles arrow keys, Home/End. It types its input as `FlatTreeNode[]` and accesses `.node.id`, `.hasChildren`, `.depth` throughout. It must continue to receive node-only rows, not the full `TreeRow[]` array.
- **Depth terminology**: In this spec, "depth" refers to visual tree depth: efforts=0, tasks=1, subtasks=2. This is distinct from the `MAX_DEPTH=4` constant in hierarchy.ts which counts from the project level.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/shared/src/constants/hierarchy.ts` | Extract `VALID_CHILD_TYPES` here alongside existing `NodeType` and `MAX_DEPTH` |
| `packages/client/src/hooks/use-tree-data.ts` | Flattens tree into `FlatTreeNode[]` — add types and inject add-button rows here |
| `packages/client/src/components/features/tree-view/tree-view.tsx` | Main tree renderer — render add-button rows, handle click-to-create, derive `nodeRows` |
| `packages/client/src/components/features/tree-view/tree-row.tsx` | Existing node row component — reference for styling/depth indentation |
| `packages/client/src/components/features/tree-view/add-child-button.tsx` | New component for the add-child button row |
| `packages/client/src/hooks/use-tree-operations.ts` | `createChild()` — reference only; add-button uses `useCreateNode` directly for correct sortOrder |
| `packages/client/src/hooks/use-tree-navigation.ts` | Arrow key navigation — receives `nodeRows` (filtered), not full `visibleNodes` |
| `packages/client/src/queries/node-queries.ts` | `useCreateNode()` mutation with optimistic updates |

### Technical Decisions

1. **Extract `VALID_CHILD_TYPES` to shared**: Move the parent→child type map from `tree-view.tsx` to `packages/shared/src/constants/hierarchy.ts`. Both `use-tree-data.ts` (for injection) and `tree-view.tsx` (for DnD validation) import from the same source. No duplication.

2. **Union type in visibleNodes**: Introduce `AddButtonRow` type with `kind: 'add-button'` discriminator alongside `FlatTreeNode` extended with `kind: 'node'`. This keeps the data layer clean and lets the renderer branch on `kind`.

3. **`nodeRows` filtered array**: Derive a memoized `nodeRows = visibleNodes.filter(r => r.kind === 'node')` in `tree-view.tsx`. Pass `nodeRows` to `useTreeNavigation`, `getDeleteFocusTarget`, `isDescendant`, `isValidDropTarget`, DnD handlers, `activeFlatNode`, and all useEffects that access `.node`. This isolates the union type complexity to the virtualizer rendering loop.

4. **Injection point — two code paths**: (a) After `flatten(children, depth + 1)` for expanded nodes with children, push an `AddButtonRow`. (b) For expanded nodes confirmed empty via `emptyParents.has(node.id)`, push an `AddButtonRow` directly (no children loop entered). Both paths inject at `depth + 1` with the correct `childType` from `VALID_CHILD_TYPES`.

5. **Sort order for new nodes**: The add-button click handler does NOT use `createChild()` (which hardcodes `sortOrder: 0`). Instead, it calls `useCreateNode().mutateAsync()` directly with `sortOrder` set to the parent's current children count (read from the TanStack Query cache via `queryClient.getQueryData(['nodes', parentId, 'children'])?.length ?? 0`). This appends the new node as the last child.

6. **No new API needed**: Existing `POST /api/nodes` handles everything. The server reorders siblings correctly when sortOrder is specified.

7. **Keyboard accessibility**: The add button is a native `<button>` element with default `role="button"` semantics. It is focusable via Tab and activated via Enter/Space natively. Arrow key tree navigation skips add-button rows because `useTreeNavigation` receives only `nodeRows`.

8. **Virtualizer keys**: Node rows use `key={flatNode.node.id}`. Add-button rows use `key={`add-${row.parentId}`}` — stable because there is exactly one add-button per expanded parent.

9. **DnD exclusion**: Add-button rows do NOT register as droppable containers. Only the `kind: 'node'` branch renders `TreeRow` (which uses `useDroppable`). The `kind: 'add-button'` branch renders `AddChildButton` with no DnD hooks.

10. **No `forwardRef` on AddChildButton**: The virtualizer's `measureElement` ref attaches to the outer wrapper `<div>` in the virtualizer loop, not to the row component. `AddChildButton` is a plain function component.

## Implementation Plan

### Tasks

- [x] Task 1: Extract `VALID_CHILD_TYPES` to shared constants
  - File: `packages/shared/src/constants/hierarchy.ts`
  - Action: Add and export `VALID_CHILD_TYPES: Record<string, NodeType>` mapping `{ project: 'effort', effort: 'task', task: 'subtask' }`. Re-export from `packages/shared/src/index.ts` barrel.
  - File: `packages/client/src/components/features/tree-view/tree-view.tsx`
  - Action: Remove the local `VALID_CHILD_TYPES` constant (line 56-60). Replace with `import { VALID_CHILD_TYPES } from '@todo-bmad-style/shared'`.

- [x] Task 2: Define discriminated union types for tree rows
  - File: `packages/client/src/hooks/use-tree-data.ts`
  - Action: Add `kind: 'node'` to `FlatTreeNode` interface. Create new exported `AddButtonRow` interface with `kind: 'add-button'`, `parentId: string`, `childType: NodeType`, `depth: number`. Export union type `TreeRow = FlatTreeNode | AddButtonRow`. Update `UseTreeDataResult.visibleNodes` return type to `TreeRow[]`.
  - Notes: Import `NodeType` from `@todo-bmad-style/shared`. Import `VALID_CHILD_TYPES` from `@todo-bmad-style/shared`.

- [x] Task 3: Inject add-button rows into the flattened tree
  - File: `packages/client/src/hooks/use-tree-data.ts`
  - Action: In the `flatten()` function inside the `visibleNodes` useMemo, inject `AddButtonRow` entries in two code paths:
    - **Path A — expanded node with children**: After the `flatten(children, depth + 1)` recursive call (line ~122), if the node's type has an entry in `VALID_CHILD_TYPES`, push `{ kind: 'add-button', parentId: node.id, childType: VALID_CHILD_TYPES[node.type], depth: depth + 1 }`.
    - **Path B — expanded node with no children (empty parent)**: After the existing `if (expanded && children && children.length > 0)` block, add `else if (expanded && canHaveChildren && emptyParents.has(node.id))` and push the same `AddButtonRow` at `depth + 1`.
    - **Root level**: After the top-level `flatten(rootChildren, 0)` call, if `projectId` is provided, push `{ kind: 'add-button', parentId: projectId, childType: 'effort' as NodeType, depth: 0 }`.
  - Notes: Ensure all pushed `FlatTreeNode` entries in the `result` array also include `kind: 'node'` (update the `result.push(...)` call on line ~113).

- [x] Task 4: Create the AddChildButton component
  - File: `packages/client/src/components/features/tree-view/add-child-button.tsx` (new file)
  - Action: Create a plain function component (no `forwardRef` needed). Props: `childType: NodeType`, `depth: number`, `onClick: () => void`. Renders a `<button>` with:
    - `Plus` icon from lucide-react (h-3 w-3)
    - Text: `Add {childType}`
    - Style: `text-app-text-secondary text-xs`, padding-left `depth * 16px`, `h-6` height, hover: `text-app-text-primary`, `transition-colors`
    - `data-testid="add-child-button"`
    - `type="button"`
    - Default `role="button"` (do NOT add `role="none"`)
  - Notes: The button is natively keyboard accessible — Enter/Space activate it without any extra handling. No DnD hooks registered.

- [x] Task 5: Derive `nodeRows` and update all node-dependent logic
  - File: `packages/client/src/components/features/tree-view/tree-view.tsx`
  - Action: After the `useTreeData` call, create a memoized filtered array:
    ```ts
    const nodeRows = useMemo(() =>
      visibleNodes.filter((r): r is FlatTreeNode => r.kind === 'node'),
      [visibleNodes]
    )
    ```
    Replace `visibleNodes` with `nodeRows` in ALL of the following locations:
    - `getDeleteFocusTarget()` calls (pass `nodeRows`)
    - `isDescendant()` calls
    - `isValidDropTarget()` calls
    - `activeFlatNode` useMemo (search `nodeRows`)
    - `handleEditCommit` (search `nodeRows`)
    - `handleNodeClick`, `handleNodeDoubleClick`, `handleNodeDelete`, `handleToggleComplete` (search `nodeRows`)
    - `handleKeyDown` — all `visibleNodes.find(...)` and `visibleNodes.findIndex(...)` calls use `nodeRows`
    - `computeDropIndicator` (search `nodeRows`)
    - `handleDragEnd` (search `nodeRows`, filter siblings from `nodeRows`)
    - `focusedIndex → activeNodeId` useEffect (line 239-244): index into `nodeRows`, not `visibleNodes`
    - `pendingFocusNodeId` resolution useEffect (line 222-236): search `nodeRows`

    Also update `useTreeNavigation` call to pass `nodeRows` instead of `visibleNodes`.
  - Notes: The virtualizer loop still uses `visibleNodes` (it needs both node and add-button rows). Only the virtualizer count and rendering logic use the full `visibleNodes` array. Everything else uses `nodeRows`. The `focusedIndex` from `useTreeNavigation` maps into `nodeRows`, and must be translated to a `visibleNodes` index for the virtualizer scroll-to-index.

- [x] Task 6: Update `useTreeNavigation` type signature
  - File: `packages/client/src/hooks/use-tree-navigation.ts`
  - Action: The hook already types its parameter as `FlatTreeNode[]`. Since we now pass `nodeRows` (which is `FlatTreeNode[]` after the type guard filter), the hook's type signature remains correct and no internal changes are needed. Verify the hook works correctly with `nodeRows`.
  - Notes: The hook's `focusedIndex` operates on `nodeRows` indices. Tree-view.tsx must map between `nodeRows` index and `visibleNodes` index for virtualizer scrolling. Create a helper: `const visibleIndexOfNode = (nodeIndex: number) => visibleNodes.findIndex(r => r.kind === 'node' && r === nodeRows[nodeIndex])`.

- [x] Task 7: Update virtualizer rendering to handle both row types
  - File: `packages/client/src/components/features/tree-view/tree-view.tsx`
  - Action: In the virtualizer loop (`virtualizer.getVirtualItems().map(...)`):
    - Read the row: `const row = visibleNodes[virtualRow.index]`
    - Branch on `row.kind`:
      - `'node'`: Render the existing `TreeRow` component (no changes to TreeRow props or behavior). Use `key={row.node.id}`. DnD indicators, click handlers, and all existing logic apply here.
      - `'add-button'`: Render `AddChildButton` inside the position wrapper div. Use `key={`add-${row.parentId}`}`. The `onClick` handler:
        1. Read children count from cache: `const children = queryClient.getQueryData<NodeResponse[]>(['nodes', row.parentId, 'children'])`
        2. Call `createNodeMutation.mutateAsync({ title: 'Untitled', type: row.childType, parentId: row.parentId, sortOrder: children?.length ?? 0 })`
        3. On success: `setFocusedNode(result.id)`, `setEditingNodeId(result.id)`, `setEditValue('')`, `setIsNewNode(true)`
        4. Expand the parent: `setExpanded(row.parentId, true)`
    - The outer wrapper div for add-button rows should NOT have the `onClick` handler for `handleNodeClick`.
    - The `ref={virtualizer.measureElement}` stays on the outer wrapper div for both row types.
  - Notes: Import `useQueryClient` from `@tanstack/react-query` and `useCreateNode` from queries (or reuse the existing `createNodeMutation` if already available — check if tree-view.tsx already imports it). The `isNewNode: true` flag ensures that cancelling edit (Escape/blur with empty text) will delete the node via the existing cancel handler.

- [x] Task 8: Handle `focusedIndex` mapping between `nodeRows` and `visibleNodes`
  - File: `packages/client/src/components/features/tree-view/tree-view.tsx`
  - Action: Since `focusedIndex` from `useTreeNavigation` indexes into `nodeRows`, but the virtualizer needs a `visibleNodes` index for scrolling:
    - Create a mapping helper or memo that converts `nodeRows[focusedIndex]` to the corresponding `visibleNodes` index.
    - Update the `virtualizer.scrollToIndex` useEffect to use the mapped visible index.
    - Update the `isFocused` prop on `TreeRow`: compare against `focusedIndex` from `nodeRows`, not the virtualizer index.
    - Update the `rowRefs` map to key by node ID rather than virtualizer index, since indices shift with add-button rows.
  - Notes: Consider building a `nodeIndexToVisibleIndex` map in a useMemo for O(1) lookups instead of repeated `findIndex` calls.

### Acceptance Criteria

- [ ] AC 1: Given an expanded effort with tasks, when the user views the tree, then a `+ Add task` button appears below the last task at the same indentation depth as the tasks.
- [ ] AC 2: Given an expanded task with subtasks, when the user views the tree, then a `+ Add subtask` button appears below the last subtask at the same indentation depth as the subtasks.
- [ ] AC 3: Given a project with efforts, when the user views the tree, then a `+ Add effort` button appears below the last effort at depth 0.
- [ ] AC 4: Given the user clicks an add-child button, when the click completes, then a new node of the correct type is created as the **last child** of the parent (not the first) and the inline title editor is focused with empty text. Cancelling edit deletes the node.
- [ ] AC 5: Given a collapsed parent node, when the user views the tree, then no add-child button is visible for that parent's children.
- [ ] AC 6: Given a subtask node (max depth), when the user views the tree, then no add-child button appears below it (subtasks cannot have children).
- [ ] AC 7: Given the user focuses an add-child button via Tab, when they press Enter or Space, then the button activates and creates a new node (keyboard accessibility).
- [ ] AC 8: Given the user navigates with arrow keys, when passing through the tree, then add-button rows are skipped and focus moves between node rows only.
- [ ] AC 9: Given an expanded parent with no children yet (empty), when the user views the tree, then an add-child button still appears at the correct depth below the parent.
- [ ] AC 10: Given the user drags a node, when dragging over an add-child button row, then no drop indicator appears (add buttons are not valid drop targets and do not register as droppable).

## Additional Context

### Dependencies

- No new dependencies required. Uses existing `lucide-react` (Plus icon), Tailwind CSS classes, and `@tanstack/react-virtual`.
- Depends on existing `useCreateNode()` mutation from `node-queries.ts`.
- Depends on `VALID_CHILD_TYPES` extracted to shared constants (Task 1).

### Testing Strategy

- **Unit test** (`use-tree-data.test.ts`): Test the flatten logic — verify add-button rows are injected at correct positions for: expanded parents with children, expanded empty parents, collapsed parents (no button), subtask parents (no button), root level (effort button). This is the highest-risk logic.
- **Component test** (`add-child-button.test.tsx`): Verify renders correct label for each child type (`effort`, `task`, `subtask`), calls onClick on click, applies correct depth indentation via padding-left.
- **Integration test** (in `tree-view.tsx` test): Verify clicking an add-child button creates a node as the last child and enters edit mode. Verify cancelling edit on a new node deletes it.
- **E2E test**: Navigate to app, expand a tree, verify add buttons visible, click one, verify new node created in edit mode at the bottom of the children list.
- **Manual testing**: Verify arrow key navigation skips add buttons, Tab reaches them, drag-drop ignores them, virtualizer scrolling works correctly with mixed row types.

### Notes

- Tree uses virtualized flat list (`@tanstack/react-virtual`), not recursive components
- "Add" buttons are injected as virtual rows in the flattened node array with `kind: 'add-button'` discriminator
- Visual tree depths: efforts=0, tasks=1, subtasks=2 (distinct from `MAX_DEPTH=4` which counts from project level)
- `createChild()` in `use-tree-operations.ts` hardcodes `sortOrder: 0` — the add-button handler bypasses it and calls `useCreateNode` directly with correct sortOrder
- Always visible when parent is expanded; hidden when collapsed
- Subtle styling (muted text link, not prominent button)
- The empty-state "Add effort" button at project level already exists and is unaffected by this change
- Risk: The discriminated union change touches the core data type. Mitigated by the `nodeRows` filtered array pattern — all node-dependent logic uses `nodeRows`, isolating the union complexity to the virtualizer rendering loop only.
- The `focusedIndex` ↔ `visibleNodes` index mapping (Task 8) is the most subtle part of the implementation — ensure thorough testing of scroll-to-index and focus restoration after node creation/deletion.
- Future consideration: Could add hover-to-reveal behavior later if the always-visible buttons create too much visual noise in large trees.

## Review Notes
- Adversarial review completed
- Findings: 14 total, 10 fixed, 4 skipped (by design)
- Resolution approach: auto-fix
- Key fixes: empty-state check, sortOrder reliability, O(1) index lookups, drag guard, memoized callback, type safety, accessibility labels
