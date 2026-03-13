# Story 3.2: Progress Indicators

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see completion progress on parent nodes,
so that I can quickly assess how much work is done at every level of the hierarchy.

## Acceptance Criteria

1. **Given** a parent node has children (effort with tasks, task with subtasks, project with efforts)
   **When** the tree renders
   **Then** the parent node displays a progress indicator showing completed count vs total (e.g., "2/4")
   **And** a small progress bar visually represents the completion ratio

2. **Given** a child node's completion status changes (via completion toggle or cascade)
   **When** the tree updates
   **Then** all ancestor progress indicators update immediately to reflect the new counts
   **And** progress updates are derived from cached data — no additional API call needed

3. **Given** a parent node has zero children
   **When** the tree renders
   **Then** no progress indicator is displayed on that node

4. **And** progress indicators do not add visual clutter — they are subtle and secondary to the node title
   **And** progress counts are accurate at all times — they never show stale data after cascade operations

## Tasks / Subtasks

- [x] Task 1: Extend `FlatTreeNode` with progress data (AC: #1, #2)
  - [x] 1.1 Add `childProgress: { completed: number; total: number } | null` to `FlatTreeNode` interface in `use-tree-data.ts`
  - [x] 1.2 Compute progress counts from `childrenMap` during tree flattening — for each node where children data exists in cache, count completed vs total
  - [x] 1.3 Write unit tests in `use-tree-data.test.ts` for progress computation (parent with mixed children, all complete, none complete, no children data)

- [x] Task 2: Create ProgressIndicator component (AC: #1, #3, #4)
  - [x] 2.1 Create `packages/client/src/components/features/tree-view/progress-indicator.tsx` — takes `completed` and `total` props
  - [x] 2.2 Render text count "2/4" in `text-xs` (11px) with `text-app-text-secondary`
  - [x] 2.3 Render 40px-wide, 3px-height progress bar with `rounded-sm` (2px border-radius)
  - [x] 2.4 Bar fill: `bg-app-accent` (blue-500) proportional to completion ratio; when 100% complete, use `bg-green-500`
  - [x] 2.5 Add `role="progressbar"` with `aria-valuenow={completed}`, `aria-valuemin={0}`, `aria-valuemax={total}`, `aria-label="{completed} of {total} complete"`
  - [x] 2.6 Return `null` when `total === 0`
  - [x] 2.7 Write component tests in `progress-indicator.test.tsx` — rendering, partial fill, complete state (green), zero children (null), accessibility attributes

- [x] Task 3: Integrate ProgressIndicator into TreeRow (AC: #1, #3, #4)
  - [x] 3.1 Add `childProgress` prop to `TreeRowProps` in `tree-row.tsx`
  - [x] 3.2 Render `<ProgressIndicator>` after the title span, before the delete button — only when `childProgress` is non-null and `childProgress.total > 0`
  - [x] 3.3 Ensure indicator is `shrink-0` and does not compress the title
  - [x] 3.4 Update `tree-row.test.tsx` with tests for progress indicator presence/absence

- [x] Task 4: Wire progress data through TreeView (AC: #1, #2)
  - [x] 4.1 In `tree-view.tsx`, pass `flatNode.childProgress` to `<TreeRow>` as `childProgress` prop
  - [x] 4.2 Verify progress updates immediately on completion toggle via existing cache invalidation (no new invalidation needed — `useToggleNodeCompletion` already invalidates affected parent caches)

- [x] Task 5: Verify all existing tests pass (AC: all)
  - [x] 5.1 Run `pnpm test` — baseline is 374 passing tests, all must continue to pass
  - [x] 5.2 Expect ~385+ after story (new progress indicator tests + tree-row updates + use-tree-data progress tests)

## Dev Notes

### Implementation Strategy

**This is a client-only story.** No server or API changes needed. Progress counts are derived entirely from the children data already fetched and cached by TanStack Query.

**Data Flow:**
1. `use-tree-data.ts` already fetches children for expanded nodes via `useQueries` → stored in `childrenMap`
2. During tree flattening (`flatten()` function), for each node where `childrenMap[node.id]` exists, compute `{ completed, total }` from the children array
3. Pass `childProgress` through `FlatTreeNode` → `TreeView` → `TreeRow` → `ProgressIndicator`

**When progress data is available:**
- Children of the selected project (root efforts) are ALWAYS fetched via `useNodeChildren(projectId)` — progress for the project level is always available
- Children of expanded nodes are fetched via `useQueries` — progress shows when a node is or has been expanded
- TanStack Query keeps stale data in cache — after expanding a node once, progress persists even when collapsed
- After completion toggle, `useToggleNodeCompletion` invalidates affected parent caches → children re-fetch → progress updates automatically

**Key insight — use `rootChildren` for effort-level progress:**
The `rootChildren` array (direct children of the project) is always loaded. So projects always have accurate progress counts (completed efforts / total efforts). For deeper levels, progress appears once the parent has been expanded at least once.

### Progress Computation (in `use-tree-data.ts` flatten function)

```
For each node being flattened:
  const children = childrenMap[node.id]  // or rootChildren if node is the project
  if (children && children.length > 0) {
    const completed = children.filter(c => c.isCompleted).length
    childProgress = { completed, total: children.length }
  } else if (node is root level AND rootChildren exists) {
    // Root efforts are the project's children — but rootChildren IS the efforts array
    // Progress at this level comes from siblings, not from this individual node
    childProgress = null  // efforts don't automatically know about their own children
  } else {
    childProgress = null
  }
```

**Note:** `rootChildren` gives us efforts under the project. Each effort's children (tasks) are only in `childrenMap` when expanded. To show progress on efforts that have never been expanded, we'd need to fetch their children. The AC says "no additional API call" — so progress on collapsed, never-expanded parents appears as soon as the user expands them once. This is acceptable behavior and matches the "derived from cached data" requirement.

### Architecture Patterns & Constraints

- **No new API endpoints** — this is purely a UI feature using existing cached data
- **No server changes** — progress counts are computed client-side
- **No schema changes** — no new Zod schemas needed in shared package
- **Service layer untouched** — `node.service.ts` already provides all needed data
- **Existing cache invalidation is sufficient** — `useToggleNodeCompletion` invalidates parent children caches, which triggers re-computation of progress counts

### UX Design Requirements (from UX Specification)

**ProgressIndicator Component Spec:**
- **Text count:** "2/4" in `text-xs` (11px), muted color (`text-app-text-secondary`)
- **Progress bar:** 40px wide, 3px height, border-radius 2px (`rounded-sm`)
- **Bar fill:** Accent blue (`#3B82F6` / `bg-app-accent`) proportional to completion ratio
- **Complete state:** Green (`#22C55E` / `bg-green-500`) when 100% complete
- **Empty state:** No fill, count shows "0/N"
- **No progress indicator:** When parent has zero children
- **Updates immediately** on any child completion/reopening
- **Subtle and secondary** — must not compete with node title for attention

**Placement in TreeRow:**
- After the title text, before the delete button
- `shrink-0` to prevent compression
- Spacing: small gap (`gap-1.5` or `ml-1.5`) from title

**Accessibility (from UX Spec):**
- `role="progressbar"`
- `aria-valuenow={completed}` (current count)
- `aria-valuemin={0}`
- `aria-valuemax={total}` (total children count)
- `aria-label="{completed} of {total} complete"`

### Architecture Compliance

- **Co-located tests** — `progress-indicator.test.tsx` next to `progress-indicator.tsx`
- **File naming:** kebab-case for files, PascalCase for component exports
- **Design tokens:** Use `text-app-text-secondary` for muted text, `bg-app-accent` for blue fill — NOT hardcoded hex values
- **Query key convention:** No new query keys needed — reuses existing `['nodes', parentId, 'children']`
- **No new stores** — progress is derived state from TanStack Query cache, not Zustand

### Library & Framework Requirements

**Already installed — DO NOT add:**
- React, TanStack Query, Zustand, Tailwind CSS, Vitest, Testing Library
- All current dependencies are sufficient for this story

**NOT needed — DO NOT install:**
- No charting library — the progress bar is a simple `div` with dynamic width
- No animation library — CSS transitions are sufficient
- No progress/meter library — native HTML + Tailwind is simpler and smaller

### File Structure Requirements

**New file to create:**

| File | Purpose |
|------|---------|
| `packages/client/src/components/features/tree-view/progress-indicator.tsx` | ProgressIndicator component |
| `packages/client/src/components/features/tree-view/progress-indicator.test.tsx` | Component tests |

**Existing files to modify:**

| File | Change |
|------|--------|
| `packages/client/src/hooks/use-tree-data.ts` | Add `childProgress` to `FlatTreeNode`, compute during flatten |
| `packages/client/src/hooks/use-tree-data.test.ts` | Add progress computation tests |
| `packages/client/src/components/features/tree-view/tree-row.tsx` | Add `childProgress` prop, render `ProgressIndicator` |
| `packages/client/src/components/features/tree-view/tree-row.test.tsx` | Add progress indicator tests |
| `packages/client/src/components/features/tree-view/tree-view.tsx` | Pass `childProgress` to TreeRow |

**Files NOT to modify:**
- `packages/server/**` — no server changes
- `packages/shared/**` — no schema changes
- `packages/client/src/api/nodes.api.ts` — no new API calls
- `packages/client/src/queries/node-queries.ts` — no new hooks or mutations
- `packages/client/src/stores/**` — no store changes
- `packages/client/src/components/features/detail-panel/**` — no detail panel changes

### Testing Requirements

**Progress computation tests (`use-tree-data.test.ts`):**

1. **Parent with mixed children:** 2 of 4 children completed → `childProgress: { completed: 2, total: 4 }`
2. **Parent with all children complete:** 3 of 3 complete → `childProgress: { completed: 3, total: 3 }`
3. **Parent with no children complete:** 0 of 3 → `childProgress: { completed: 0, total: 3 }`
4. **Parent with no children data in cache:** → `childProgress: null`
5. **Leaf node (subtask):** → `childProgress: null` (subtasks can't have children)

**ProgressIndicator component tests (`progress-indicator.test.tsx`):**

1. **Renders count text:** "2/4" visible
2. **Renders progress bar:** bar element present with correct width percentage (50%)
3. **Complete state:** 4/4 → bar uses green color class
4. **Partial state:** 2/4 → bar uses blue/accent color class
5. **Zero total:** returns null (no render)
6. **Zero completed:** shows "0/3" with empty bar
7. **Accessibility:** `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-label` all correct

**TreeRow integration tests (`tree-row.test.tsx`):**

1. **Shows progress when childProgress provided:** renders ProgressIndicator
2. **Hides progress when childProgress is null:** no ProgressIndicator in DOM
3. **Hides progress when total is 0:** no ProgressIndicator in DOM

**Test baseline: 374 passing → expect ~390+ after story**

### Previous Story Intelligence (Story 3.1)

**Patterns to follow from 3.1:**
- Co-located test files next to source
- `e.stopPropagation()` pattern for interactive elements inside tree rows
- Tailwind utility classes with design tokens (`text-app-text-secondary`, `bg-app-accent`)
- `motion-safe:transition-*` pattern for respecting `prefers-reduced-motion`
- `data-testid` attributes for test selectors
- `tabIndex={-1}` for elements that shouldn't be in keyboard tab order

**Code review fixes from 3.1 to avoid repeating:**
- Use targeted query invalidation (predicate-based) rather than broad invalidation
- Invalidate ALL related caches (ancestors, children, detail) in mutation `onSettled`
- Extract magic numbers into named constants
- Don't pass unused props

**Test mocking pattern from 3.1:**
- Multiple test files needed `useToggleNodeCompletion` mock added — if adding new hooks, ensure all consuming test files mock them
- Mock pattern: `vi.mock('#/queries/node-queries', () => ({ useToggleNodeCompletion: () => ({ mutate: vi.fn() }) }))`

### Git Intelligence

- **Branch to create from:** `main` (after merging 3-1)
- **Branch name:** `story/3-2-progress-indicators`
- **Recent commit pattern:** Single feature commits with descriptive messages (e.g., "Add node completion toggle with bidirectional cascade logic for Story 3.1")
- **Files touched by 3.1 that this story also touches:** `tree-row.tsx`, `tree-row.test.tsx`, `tree-view.tsx`, `tree-view.test.tsx`, `use-tree-data.ts`, `use-tree-data.test.ts`

### Project Structure Notes

- All new files go in `packages/client/src/components/features/tree-view/` — aligns with existing tree component grouping
- No new directories needed
- Component follows existing naming: kebab-case file, PascalCase export

### What This Story Does NOT Include (Scope Boundaries)

- **No server-side progress API** — progress is computed client-side from cached children
- **No progress in detail panel** — progress indicators are tree-view only
- **No progress percentage text** — only "X/Y" count format per UX spec
- **No animation on progress change** — instant update per UX spec ("Instant" feedback)
- **No progress for nodes never expanded** — data must be in cache first (matches "no additional API call" AC)
- **No recursive/deep progress** — counts only direct children, not all descendants
- **No progress filtering** (hide completed, show only incomplete) — not in scope

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.2 (Lines 480-503)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Service layer pattern, TanStack Query cache strategy]
- [Source: _bmad-output/planning-artifacts/prd.md — FR13 progress indicators, Journey 4 Complete & Progress]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ProgressIndicator component spec, color system, accessibility table]
- [Source: _bmad-output/project-context.md — WCAG 2.1 AA, performance targets, cascade testing mandate]
- [Source: _bmad-output/implementation-artifacts/3-1-node-completion-and-cascade-logic.md — Previous story patterns, 374 test baseline, cascade cache invalidation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Added `ChildProgress` interface and `childProgress` field to `FlatTreeNode` in `use-tree-data.ts`
- Computed progress counts from `childrenMap` during tree flattening — counts completed vs total children for nodes where cache data exists
- Created `ProgressIndicator` component with text count ("X/Y"), 40px progress bar, blue accent fill, green complete state, and full ARIA accessibility
- Integrated `ProgressIndicator` into `TreeRow` after title, before delete button — renders only when `childProgress` is non-null with `total > 0`
- Wired `flatNode.childProgress` through `TreeView` to `TreeRow`
- All 388 tests pass (374 baseline + 14 new) — zero regressions
- MCP Playwright verification confirmed: progress indicators render correctly, cascade updates propagate immediately, green state at 100%, no indicators on leaf nodes, ARIA attributes correct
- Code review fixes applied: removed unused `isRoot` param from flatten(), added 3 missing progress computation tests (mixed 2/4, all-complete 3/3, none-complete 0/3), 391 tests passing

### Change Log

- 2026-03-12: Implemented progress indicators for Story 3.2 — all 5 tasks complete, 388 tests passing
- 2026-03-12: Code review fixes — removed dead code, added missing test coverage, 391 tests passing

### File List

**New files:**
- `packages/client/src/components/features/tree-view/progress-indicator.tsx`
- `packages/client/src/components/features/tree-view/progress-indicator.test.tsx`

**Modified files:**
- `packages/client/src/hooks/use-tree-data.ts` — Added `ChildProgress` interface, `childProgress` to `FlatTreeNode`, progress computation in flatten
- `packages/client/src/hooks/use-tree-data.test.ts` — Added 7 progress computation tests (4 original + 3 review fixes)
- `packages/client/src/components/features/tree-view/tree-row.tsx` — Added `childProgress` prop, imported and rendered `ProgressIndicator`
- `packages/client/src/components/features/tree-view/tree-row.test.tsx` — Added 3 progress indicator presence/absence tests
- `packages/client/src/components/features/tree-view/tree-view.tsx` — Passed `flatNode.childProgress` to `TreeRow`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status
- `_bmad-output/implementation-artifacts/3-2-progress-indicators.md` — Updated tasks, dev record, status
