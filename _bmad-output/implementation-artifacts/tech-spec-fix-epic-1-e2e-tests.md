---
title: 'Fix Epic 1 E2E Tests and Detail Panel State Sync'
slug: 'fix-epic-1-e2e-tests'
created: '2026-03-11'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'React', 'Playwright', 'Zustand', 'TanStack Query', '@dnd-kit/core']
files_to_modify:
  - 'packages/client/src/components/features/detail-panel/detail-panel.tsx'
  - 'packages/client/src/queries/node-queries.ts'
  - 'packages/client/src/components/features/sidebar/sidebar.tsx'
  - 'packages/client/src/components/features/tree-view/tree-row.tsx'
  - 'tests/e2e/helpers.ts'
  - 'tests/e2e/epic-1-layout-sidebar.spec.ts'
  - 'tests/e2e/epic-1-drag-and-drop.spec.ts'
code_patterns:
  - 'Zustand stores for UI state'
  - 'TanStack Query for server state with optimistic updates'
  - 'Feature-based component folders'
  - 'Playwright E2E tests with page object helpers'
test_patterns:
  - 'Co-located unit tests ({file}.test.ts)'
  - 'E2E in tests/e2e/ with shared helpers.ts'
  - 'API seeding via page.evaluate + fetch'
  - 'Playwright getByRole/getByTestId selectors'
---

# Tech-Spec: Fix Epic 1 E2E Tests and Detail Panel State Sync

**Created:** 2026-03-11

## Overview

### Problem Statement

24 E2E tests across 5 spec files are failing. Additionally, renaming a node in the tree view does not update the detail panel tab title until page refresh — a UI state sync bug.

### Solution

Fix the root causes in app code (focus stealing, query invalidation, sidebar text duplication) and test helpers (strict mode selector violations, drag mechanics). The primary fix is removing the focus-stealing `useEffect` in `detail-panel.tsx` which breaks all keyboard interactions.

### Scope

**In Scope:**
- Fix all 24 failing E2E tests across 5 spec files
- Fix detail panel tab title not updating on node rename
- App code fixes where the app behavior is wrong
- Test code fixes where test selectors are imprecise

**Out of Scope:**
- New tests or new features
- Refactoring beyond what's required for fixes
- Changes to passing tests

## Context for Development

### Codebase Patterns

- **State management**: Zustand for UI state (`useUIStore`, `useDetailPanelStore`, `useSidebarStore`), TanStack Query for server state
- **Optimistic updates**: All mutations use `onMutate`/`onError`/`onSettled` pattern
- **Query keys**: `['nodes']`, `['nodes', id, 'children']`, `['nodes', id, 'detail']`
- **Tree virtualization**: `@tanstack/react-virtual` with absolute-positioned rows
- **Keyboard handling**: `onKeyDown` on tree container div, delegates to `useTreeNavigation` hook for arrow keys
- **DnD**: `@dnd-kit/core` with `useDraggable` on drag handle button, `useDroppable` on TreeRow div
- **Sidebar sections**: `Collapsible` from shadcn/Radix, state tracked by section title in `useSidebarStore`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/client/src/components/features/detail-panel/detail-panel.tsx` | Detail panel with focus-stealing useEffect (ROOT CAUSE #1) |
| `packages/client/src/components/features/detail-panel/detail-tabs.tsx` | Tab items using `useNode(nodeId)` for title |
| `packages/client/src/queries/node-queries.ts` | Mutations with optimistic updates, query invalidation |
| `packages/client/src/components/features/tree-view/tree-view.tsx` | Tree container with keyboard handler, node click opens detail panel tab |
| `packages/client/src/components/features/tree-view/tree-row.tsx` | TreeRow with aria attributes, inline editing, delete button |
| `packages/client/src/hooks/use-tree-navigation.ts` | Arrow key navigation, expand/collapse via keyboard |
| `packages/client/src/components/features/sidebar/sidebar.tsx` | Sidebar with 4 collapsible sections |
| `packages/client/src/components/features/sidebar/sidebar-section.tsx` | Collapsible section component |
| `packages/client/src/stores/detail-panel-store.ts` | Detail panel Zustand store (openTab, closeTab, etc.) |
| `tests/e2e/helpers.ts` | Shared E2E helpers (createProjectViaUI, selectProjectInSidebar, etc.) |

### Technical Decisions

1. **Remove focus-stealing useEffect** — The detail panel should NOT auto-focus when opening. The tree should retain focus for keyboard interaction. If the user explicitly clicks into the detail panel, focus moves naturally.
2. **Fix query cache for rename** — `useUpdateNode` must optimistically update AND invalidate `['nodes', id, 'detail']` so the detail tab title updates instantly when a node is renamed.
3. **Fix sidebar text duplication** — The "Inbox" section content says "Inbox" which conflicts with the section header. Change content text to be distinct (e.g., "No inbox items").
4. **Fix test helper strict mode** — `createProjectViaUI` helper should scope the button selector to the sidebar to avoid matching tab and close buttons.

## Implementation Plan

### Root Cause Analysis

| Root Cause | Impact | Tests Affected |
| ---------- | ------ | -------------- |
| **RC1: Detail panel focus steal** (`detail-panel.tsx:33-37`) | Clicking a node opens detail panel, which auto-focuses itself via `useEffect` on `isOpen` transition (false→true). Since each test resets via `page.reload()`, the panel starts closed. The first tree node click opens the panel and steals focus, breaking all subsequent keyboard events in that test. | 21 tests enumerated: **Navigation (7):** ArrowDown, ArrowUp, ArrowRight expand, ArrowRight→child, ArrowLeft collapse, ArrowLeft→parent, keyboard through hierarchy. **Rename (5):** Enter activates, type+Enter confirms, Escape cancels, rename persists, double-click activates (Note: double-click doesn't use keyboard but does click which steals focus for follow-up assertions). **Delete (6):** Delete key, Backspace key, delete→focus next, delete subtree, delete persists, no dialog. **Ctrl+Enter (1):** `epic-1-tree-crud.spec.ts` line 86. **DnD edit mode (1):** `epic-1-drag-and-drop.spec.ts` line 229. **Note:** double-click rename test may not be affected since dblclick triggers rename directly without needing keyboard; verify after Task 1. |
| **RC2: Missing query invalidation** (`node-queries.ts`) | `useUpdateNode` doesn't invalidate `['nodes', id, 'detail']`, so detail tab title doesn't update on rename. | Tab title sync bug (user-reported) |
| **RC3: Sidebar text duplication** (`sidebar.tsx`) | Section content text duplicates section header text (e.g., "Inbox" header + "Inbox" content). `getByText('Inbox')` matches multiple elements. | 1 test: sidebar sections |
| **RC4: Test helper strict mode** (`helpers.ts:130`) | `createProjectViaUI` uses `getByRole('button', { name: title })` without scoping, matches 2 elements: (a) the inner tab button with the project title text and (b) the sidebar `ProjectListItem` button. The close button has `aria-label="Close {title} tab"` so it does NOT match. | 2 tests: create project via UI, clicking project opens content |
| **RC5: Drag reorder assertions** | DnD reorder may need timing/mechanics adjustments in tests. Drag handle has class `opacity-0 transition-opacity focus-visible:opacity-100` (NO `group-hover` — handle is invisible until focused). `PointerSensor` has `activationConstraint: { distance: 5 }`. | 3 tests: reorder (line 19), persist (line 178), edit mode (line 229 — also RC1) |

### Tasks

- [x] Task 1: Remove detail panel auto-focus on open
  - File: `packages/client/src/components/features/detail-panel/detail-panel.tsx`
  - Action: Remove the `useEffect` at lines 33-37 that calls `panelRef.current.focus()` when `isOpen` changes. This steals focus from the tree after every node click (on first open per page load), breaking all keyboard interactions.
  - Change: Delete the entire `useEffect(() => { if (isOpen && panelRef.current) { panelRef.current.focus() } }, [isOpen])` block. Also remove the `useEffect` import if it becomes unused (it won't — `useRef` and `useCallback` remain).
  - Notes: The detail panel still has `tabIndex={-1}` so users can click into it. Escape handling still works because `onKeyDown` is on the panel div and fires when the panel has focus from a user click.
  - Regression risk: Keyboard-only users who expected to interact with the detail panel immediately after it opens will now need to click or Tab into it. This is acceptable because: (a) the panel opens as a side effect of tree node clicks — the primary interaction remains in the tree, (b) users can click the panel to focus it, (c) the current behavior actively breaks tree keyboard nav which is more critical.

- [x] Task 2: Add optimistic update AND invalidation for node detail on rename
  - File: `packages/client/src/queries/node-queries.ts`
  - Action (onMutate, line 45): After the existing children cache update, add an optimistic update for the detail query:
    ```ts
    // Optimistically update the detail query so the tab title updates instantly
    const detailKey = ['nodes', id, 'detail'] as const
    const previousDetail = queryClient.getQueryData<NodeResponse>(detailKey)
    if (previousDetail) {
      queryClient.setQueryData<NodeResponse>(detailKey, { ...previousDetail, ...data })
    }
    ```
    Update the return to include: `return { previous, queryKey, previousDetail, detailKey }`
  - Action (onError, line 54): Add rollback for detail query:
    ```ts
    if (context?.previousDetail) {
      queryClient.setQueryData(context.detailKey, context.previousDetail)
    }
    ```
  - Action (onSettled, line 59): The third parameter is `_vars` (not `variables`). Add invalidation using `_vars`:
    ```ts
    queryClient.invalidateQueries({ queryKey: ['nodes', _vars.id, 'detail'] })
    ```
  - Notes: The detail tab title is powered by `useNode(nodeId)` which uses query key `['nodes', nodeId, 'detail']`. The optimistic `setQueryData` ensures the tab title updates instantly (no server round-trip delay). The `onSettled` invalidation ensures eventual consistency.

- [x] Task 3: Fix sidebar "Inbox" section content text
  - File: `packages/client/src/components/features/sidebar/sidebar.tsx`
  - Action: Change line 17 from `<div className="...">Inbox</div>` to `<div className="...">No inbox items</div>`.
  - Notes: The section header already displays "Inbox" via `SidebarSection title="Inbox"`. The content text saying "Inbox" again causes Playwright's `getByText('Inbox')` to match 2 elements. **Substring matching risk for other sections:** Playwright's `getByText` uses substring matching by default. `getByText('Pinned')` would match both the "Pinned" header and "No pinned projects" content. However, the E2E test at line 41 uses `page.getByText('Pinned')` which will match the header. If the content "No pinned projects" also matches, this could cause a strict mode violation. Verify after this fix that the sidebar sections test passes; if `getByText('Pinned')` still fails, the test needs `{ exact: true }` or the content text needs to avoid containing the header word. Same potential issue for "Recent" (content: "No projects yet" — does NOT contain "Recent", so safe) and "On Hold" (content: "No on-hold projects" — contains "on-hold" not "On Hold", check case sensitivity).

- [x] Task 4: Fix `createProjectViaUI` helper to scope assertion to sidebar
  - File: `tests/e2e/helpers.ts`
  - Action: In `createProjectViaUI()` (line 130 only), change `await expect(page.getByRole('button', { name: title })).toBeVisible()` to `await expect(page.locator('nav').first().getByRole('button', { name: title })).toBeVisible()`.
  - Notes: After project creation, `getByRole('button', { name: title })` matches 2 elements: (a) the inner project tab button and (b) the sidebar `ProjectListItem` button — causing Playwright strict mode violation. The close button does NOT match because its `aria-label` is `"Close {title} tab"`. Do NOT change `selectProjectInSidebar()` (line 86) — that helper is called after reset+reload when no tabs exist, so there's only one matching button and no strict mode issue.

- [x] Task 5: Fix sidebar E2E test selectors
  - File: `tests/e2e/epic-1-layout-sidebar.spec.ts`
  - Action: In "clicking a project opens content panel" test (test declaration at line 88, click at line 96), scope the project button click to the sidebar: `await page.locator('nav').first().getByRole('button', { name: 'My Project' }).click()`. In "create project via tab bar" test (test declaration at line 109, assertion at line 113-115), scope the sidebar assertion: `await expect(page.locator('nav').first().getByRole('button', { name: 'Brand New Project' })).toBeVisible()`.
  - Notes: The "create project via tab bar" test calls `createProjectViaUI` from helpers.ts, so it depends on Task 4 being done first. After Task 4 fixes the helper, the "create project" test may pass without additional changes here — verify by running the test after Task 4. The "clicking a project" test does not use `createProjectViaUI` so it needs its own selector fix.

- [x] Task 6: Fix drag-and-drop E2E test reliability
  - File: `tests/e2e/epic-1-drag-and-drop.spec.ts` and `packages/client/src/components/features/tree-view/tree-row.tsx`
  - **Sub-issue A: Drag handle is invisible (CSS `opacity-0`)**
    - The drag handle in `tree-row.tsx` line 137 has class `opacity-0 transition-opacity focus-visible:opacity-100` — it has NO `group-hover` class, meaning it only becomes visible on focus, not hover. This is likely a bug in the app code (user can't see the handle to drag it).
    - Fix in `tree-row.tsx` line 137: Add `group-hover:opacity-100` to the drag handle's className so it appears on row hover: `"tree-row-drag-handle flex h-4 w-4 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing focus-visible:opacity-100"`
  - **Sub-issue B: "reorder efforts" test (line 19) — drag mechanics**
    - The test uses `page.mouse.move` → `page.mouse.down` → `page.mouse.move` → `page.mouse.up`. The `PointerSensor` requires 5px minimum distance to activate. Current test moves to `firstBox.y + 2` which positions above the first item but the drag distance from Third to First may be enough. If the test still fails after the CSS fix, add an explicit hover on the treeitem before getting the drag handle bounding box to ensure correct coordinates.
  - **Sub-issue C: "reorder persists after reload" test (line 178)**
    - Same drag mechanics as Sub-issue B. If reorder works, persistence should follow.
  - **Sub-issue D: "dragging disabled during edit mode" test (line 229)**
    - This test clicks a node and presses Enter to activate rename. The Enter key failure is caused by RC1 (focus steal). After Task 1 removes the auto-focus, this test's Enter key should work. No additional changes needed for this sub-test beyond Task 1.
  - Notes: Run the drag tests after Tasks 1 and the tree-row CSS fix. If reorder tests still fail, debug by taking a screenshot mid-drag to verify the drag overlay appears and drop indicators show correct positions.

### Acceptance Criteria

- [x] AC 1: Given all Epic 1 E2E tests are run, when executing `npx playwright test tests/e2e/epic-1-*.spec.ts`, then all 43 tests pass with 0 failures.
- [x] AC2: Given a node "Task Alpha" is selected and its detail tab is open showing "Task Alpha", when the user renames it to "Task 1" via inline tree editing (Enter → type → Enter), then the detail panel tab title updates to "Task 1" immediately without page refresh.
- [x] AC3: Given a user clicks a tree node to select it, when the user presses ArrowDown/ArrowUp, then the adjacent node becomes `aria-selected="true"` (focus is not stolen by the detail panel).
- [x] AC4: Given a user clicks a tree node, when the user presses Enter, then an inline rename input appears with `data-testid="tree-row-input"`.
- [x] AC5: Given a user clicks a tree node, when the user presses Delete or Backspace, then the node is removed from the tree and the server.
- [x] AC6: Given the sidebar renders with all sections, when checking for section headers, then "Inbox", "Pinned", "Recent", "On Hold" are each uniquely identifiable (no duplicate text between header and content).
- [x] AC7: Given a project is created via the "+" tab bar button, when checking the sidebar, then the project button is visible in the sidebar without Playwright strict mode violations.
- [x] AC8: Given two efforts exist in a project, when dragging one above the other via the drag handle, then `getTreeItems(page).allTextContents()` returns the items in the new order (dragged item first).
- [x] AC9: Given a user is in inline rename mode (input visible), when attempting to drag, then the drag does not activate (draggable is disabled during edit mode).

## Additional Context

### Dependencies

- No new dependencies needed
- All fixes are within existing code

### Testing Strategy

- Fix app code first (Tasks 1-3), then test code (Tasks 4-6)
- After Task 1, re-run navigation tests (`epic-1-tree-navigation.spec.ts`) — expect 7 fixes
- After Task 1, re-run inline edit/delete tests (`epic-1-inline-edit-delete.spec.ts`) — expect 10 fixes
- After Tasks 3-5, re-run sidebar tests (`epic-1-layout-sidebar.spec.ts`) — expect 3 fixes
- After Task 6, re-run drag-and-drop tests (`epic-1-drag-and-drop.spec.ts`) — expect 3 fixes
- Final run: `npx playwright test tests/e2e/epic-1-*.spec.ts` — all 43 must pass

### Notes

- **High-impact fix**: Task 1 (remove focus steal) resolves 21 of 24 test failures with a single `useEffect` deletion
- **App code fixes**: Tasks 1, 2, 3, and 6 (sub-issue A) all fix real app bugs, not just test issues. Task 6A adds missing `group-hover:opacity-100` to make the drag handle visible on row hover.
- **Task dependencies**: Task 4 MUST be done before Task 5 (the sidebar spec calls `createProjectViaUI`). Task 1 MUST be done before Task 6 sub-issue D (edit mode test needs Enter key working).
- **Regression risk (Task 1)**: Removing auto-focus means the detail panel won't be keyboard-accessible immediately on open. Acceptable trade-off: tree keyboard nav is the primary interaction, and users can click the panel to focus it.
- **Tab title sync bug**: Task 2 fixes the user-reported bug with both optimistic update (instant UI) and server invalidation (eventual consistency). The `onSettled` callback's third parameter is `_vars` (not `variables`) — use `_vars.id` to access the node ID.

## Review Notes
- Adversarial review completed
- Findings: 13 total, 2 fixed, 11 skipped (noise)
- Resolution approach: auto-fix
- F2 (fixed): Removed unnecessary 300ms `waitForTimeout` in `performDrag` helper; kept minimal 100ms pre-mouseup pause for @dnd-kit frame processing
- F5 (fixed): Added `retry: false` to `useNode` query to prevent 404 retry spam for deleted nodes
