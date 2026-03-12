# Story 2.3: Breadcrumb Navigation & Inline Effort Markdown

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see where I am in the hierarchy via breadcrumbs and see effort notes inline in the tree,
So that I maintain orientation and can read effort-level context without opening a detail panel.

## Acceptance Criteria

1. **Breadcrumb trail in detail panel:**
   Given a task or subtask is open in the detail panel
   When the detail panel renders
   Then a breadcrumb trail is displayed at the top showing the full hierarchy path (e.g., Project > Effort > Task > Subtask)
   And each breadcrumb segment except the current node is clickable
   And clicking a breadcrumb navigates to that node in the tree and selects it
   And breadcrumbs have proper ARIA `role="navigation"` and `aria-label="Breadcrumb"`

2. **Breadcrumb visual design:**
   Given the breadcrumb trail is displayed
   Then the current node (last segment) is not clickable and displayed in primary text color
   And parent segments are displayed in secondary text color with underline on hover
   And breadcrumb text uses `text-sm` (13px) per the UX type scale
   And the breadcrumb format is `Project Name / Effort Name / Task Name / Subtask Name`

3. **Breadcrumb interaction with tree:**
   Given the user clicks a breadcrumb segment
   When the segment represents a parent node
   Then the tree navigates to that node and selects it
   And if the node is a project or effort, the tree scrolls to and focuses that node
   And if the node is a task or subtask, it opens in the detail panel (replacing or switching tab)

4. **Inline effort markdown in tree view:**
   Given an effort node is displayed in the tree view
   When the effort has a non-empty markdown body
   Then a read-only rendered markdown preview is displayed inline below the effort row in the tree
   And the inline markdown is collapsed by default and can be toggled via clicking
   And the inline markdown block has a subtle background tint
   And the block is left-padded to align with the effort's children (indented past chevron)

5. **Inline effort markdown states:**
   Given an effort node exists in the tree
   When the effort has no markdown body (empty string)
   Then no inline markdown block is rendered
   And when the effort node is collapsed in the tree, the inline markdown is hidden
   And the inline markdown block is NOT focusable in tree keyboard navigation (skipped by arrow keys)

6. **Task/subtask markdown NOT inline:**
   Given a task or subtask node exists in the tree
   When viewing the tree
   Then the task/subtask markdown body is NOT shown inline in the tree — it is only visible in the detail panel

## Tasks / Subtasks

- [x] Task 1: Install Shadcn Breadcrumb component (AC: #1, #2)
  - [x] 1.1 Run `npx shadcn@latest add breadcrumb` to install the Shadcn breadcrumb primitive into `packages/client/src/components/ui/`
  - [x] 1.2 Verify the breadcrumb component files are generated and `pnpm dev` still starts

- [x] Task 2: Create `useNodeAncestors` query hook (AC: #1, #3)
  - [x] 2.1 Create `useNodeAncestors(nodeId)` hook in `packages/client/src/queries/node-queries.ts`
  - [x] 2.2 Implement by walking up the hierarchy: use existing `useNode` data or add a new API endpoint `GET /api/nodes/:id/ancestors` that returns the full ancestor chain
  - [x] 2.3 Decision: If adding a server endpoint is simpler, add `GET /api/nodes/:id/ancestors` to `packages/server/src/routes/nodes.route.ts` and `getNodeAncestors(id)` to `packages/server/src/services/node.service.ts`
  - [x] 2.4 The hook should return an ordered array from root (project) to the current node: `[project, effort, task, subtask]`
  - [x] 2.5 Query key: `['nodes', nodeId, 'ancestors']`
  - [x] 2.6 Write unit tests for the hook and/or server endpoint

- [x] Task 3: Create `BreadcrumbNav` component (AC: #1, #2, #3)
  - [x] 3.1 Create `packages/client/src/components/features/detail-panel/breadcrumb-nav.tsx`
  - [x] 3.2 Use Shadcn `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`, `BreadcrumbPage` components
  - [x] 3.3 Accept `nodeId` prop, use `useNodeAncestors(nodeId)` to get the hierarchy chain
  - [x] 3.4 Render each ancestor as a clickable `BreadcrumbLink` — parent segments in secondary text color (`text-app-text-secondary`), `text-sm`, underline on hover
  - [x] 3.5 Render the current node (last) as `BreadcrumbPage` — primary text color (`text-app-text-primary`), `text-sm`, not clickable
  - [x] 3.6 Separator: use `/` character between segments (per UX spec format)
  - [x] 3.7 Add `role="navigation"` and `aria-label="Breadcrumb"` (Shadcn Breadcrumb provides this by default)
  - [x] 3.8 On click of a parent breadcrumb: call `setActiveNodeId` from `useUIStore`, and if it's a task/subtask, also open it in the detail panel via `useDetailPanelStore.openTab`
  - [x] 3.9 Write component tests in `breadcrumb-nav.test.tsx`

- [x] Task 4: Integrate `BreadcrumbNav` into `DetailContent` (AC: #1)
  - [x] 4.1 Import and render `<BreadcrumbNav nodeId={activeTabId} />` at the top of `detail-content.tsx`, above the title header
  - [x] 4.2 Ensure breadcrumbs update when switching between detail panel tabs
  - [x] 4.3 Update `detail-content.test.tsx` tests

- [x] Task 5: Create `InlineEffortMarkdown` component (AC: #4, #5, #6)
  - [x] 5.1 Create `packages/client/src/components/features/tree-view/inline-effort-markdown.tsx`
  - [x] 5.2 Accept props: `nodeId`, `markdownBody`, `depth` (for indentation alignment)
  - [x] 5.3 Render markdown as read-only HTML — use a lightweight approach (e.g., Tiptap in readonly mode with `editable: false`, or a simple markdown-to-HTML renderer). Prefer reusing Tiptap's renderer since it's already installed, but use `editable: false` to keep it lightweight and read-only
  - [x] 5.4 Style: subtle background tint (use app theme token, not hardcoded `#F5F5F5`), left-padded to align with effort's children (indent past chevron column)
  - [x] 5.5 Collapsed by default — add a toggle button/clickable area to expand/collapse the preview
  - [x] 5.6 When effort node is collapsed in tree, the inline markdown block is hidden (controlled by parent)
  - [x] 5.7 Do NOT render if `markdownBody` is empty or whitespace-only
  - [x] 5.8 Add `aria-label="Effort notes for {effort title}"` on the container
  - [x] 5.9 Ensure the component is NOT focusable via tree keyboard navigation — set `tabIndex={-1}` or exclude from the tree item list
  - [x] 5.10 Write component tests in `inline-effort-markdown.test.tsx`

- [x] Task 6: Integrate `InlineEffortMarkdown` into tree view (AC: #4, #5, #6)
  - [x] 6.1 In `tree-row.tsx` or `tree-view.tsx`, render `<InlineEffortMarkdown>` below effort-type tree rows
  - [x] 6.2 Only render for nodes where `type === 'effort'` AND `markdownBody` is non-empty AND the effort node is expanded
  - [x] 6.3 Ensure the inline markdown block does NOT interfere with tree keyboard navigation — arrow key focus must skip it
  - [x] 6.4 Ensure drag-and-drop still works correctly with inline markdown blocks present
  - [x] 6.5 Update tree-view tests to cover inline effort markdown rendering and hiding

- [x] Task 7: Verify all existing tests pass (AC: all)
  - [x] 7.1 Run `pnpm test` and verify no regressions from the 331 test baseline
  - [x] 7.2 Run E2E tests and verify no failures
  - [x] 7.3 Manual verification via Playwright MCP: breadcrumb navigation, inline effort markdown toggle

## Dev Notes

### Architecture Patterns & Constraints

- **Breadcrumbs are server-state derived**: The ancestor chain comes from node data (each node has `parentId`). Use TanStack Query to fetch/cache ancestors. Query key: `['nodes', nodeId, 'ancestors']`.
- **InlineEffortMarkdown is read-only**: It renders existing `markdownBody` from the node data already fetched by `useNodeChildren`. No additional API calls needed — the `markdownBody` field is already included in the children response.
- **State management boundary**: Breadcrumb click → Zustand `useUIStore.setActiveNodeId` for tree selection + `useDetailPanelStore.openTab` for detail panel navigation. Both are existing store actions.
- **Tree keyboard navigation exclusion**: The `InlineEffortMarkdown` component must be excluded from the tree's keyboard navigation sequence. The tree navigation logic in `use-tree-navigation.ts` iterates over visible `treeitem` role elements — the inline markdown should NOT have `role="treeitem"`.
- **No new Zustand stores needed**: Both features integrate with existing `useUIStore` and `useDetailPanelStore`.

### Technical Requirements

- **API for ancestors**: Two approaches:
  1. **Client-side traversal**: Walk up the hierarchy using cached node data from TanStack Query. Each node has `parentId`, so recursively fetch parents until `parentId === null`. Pros: no server changes. Cons: multiple sequential queries if not cached.
  2. **Server endpoint** (recommended): `GET /api/nodes/:id/ancestors` returns the full chain `[project, effort, task?, subtask?]` in a single request. Pros: one request, simple. Add to `node.service.ts` using a recursive CTE or iterative walk in SQLite.
- **Markdown rendering for inline**: Reuse Tiptap in non-editable mode (`editable: false`). This avoids adding another markdown rendering library. The `@tiptap/markdown` extension is already installed and can parse markdown into Tiptap's internal format for read-only rendering.
- **Performance**: Inline effort markdown renders below each expanded effort. For projects with many efforts, ensure rendering is efficient. Tiptap in readonly mode with small markdown content should be well within NFR2 (sub-300ms).

### Architecture Compliance

- **Component locations**:
  - `packages/client/src/components/features/detail-panel/breadcrumb-nav.tsx` — inside the existing `detail-panel` feature folder per architecture spec
  - `packages/client/src/components/features/tree-view/inline-effort-markdown.tsx` — inside the existing `tree-view` feature folder per architecture spec
- **File naming**: kebab-case files (`breadcrumb-nav.tsx`, `inline-effort-markdown.tsx`), PascalCase components (`BreadcrumbNav`, `InlineEffortMarkdown`)
- **State boundaries enforced**:
  - TanStack Query: ancestor data (server state), node `markdownBody` (already fetched)
  - Zustand: `useUIStore` for tree selection, `useDetailPanelStore` for tab management
  - No React Context, no new stores
- **Query key convention**: `['nodes', nodeId, 'ancestors']` for ancestor chain
- **Anti-patterns to avoid**:
  - Do NOT create a custom breadcrumb component from scratch — use Shadcn Breadcrumb primitive
  - Do NOT make inline effort markdown editable in the tree — editing happens only in the detail panel
  - Do NOT add the inline markdown block to tree keyboard navigation focus order
  - Do NOT fetch markdown body separately for inline effort display — it's already in the node data from `useNodeChildren`
  - Do NOT render inline markdown for task or subtask nodes — only effort nodes (FR16 vs FR17)

### Library & Framework Requirements

**New Shadcn component to install:**

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| `breadcrumb` | `npx shadcn@latest add breadcrumb` | Breadcrumb primitive with BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage |

**Install command:**
```bash
cd packages/client && npx shadcn@latest add breadcrumb
```

**Already installed — DO NOT add again:**
- `@tiptap/react`, `@tiptap/markdown`, `@tiptap/starter-kit` — reuse for read-only inline rendering
- `@tailwindcss/typography` — `prose` classes for rendered markdown styling
- All Shadcn UI components already in `components/ui/`

**NOT needed — do NOT install:**
- `react-markdown`, `marked`, `markdown-it` — use Tiptap readonly instead
- Any breadcrumb library other than Shadcn — Shadcn provides the Radix-based accessible primitive

**Key API usage:**

```typescript
// Shadcn Breadcrumb usage
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '#/components/ui/breadcrumb'

// Tiptap readonly for inline markdown
const editor = useEditor({
  extensions: [StarterKit, Markdown],
  content: markdownBody,
  editable: false,
})
```

### File Structure Requirements

**New files to create:**

```
packages/client/src/
├── components/features/detail-panel/
│   ├── breadcrumb-nav.tsx              # Breadcrumb navigation component (NEW)
│   └── breadcrumb-nav.test.tsx         # Co-located tests (NEW)
├── components/features/tree-view/
│   ├── inline-effort-markdown.tsx      # Read-only effort markdown in tree (NEW)
│   └── inline-effort-markdown.test.tsx # Co-located tests (NEW)
└── components/ui/
    └── breadcrumb.tsx                  # Shadcn breadcrumb primitive (NEW - via CLI)
```

**Existing files to modify:**

| File | Change |
|------|--------|
| `packages/client/src/components/features/detail-panel/detail-content.tsx` | Add `<BreadcrumbNav>` above title header |
| `packages/client/src/components/features/detail-panel/detail-content.test.tsx` | Update tests for breadcrumb integration |
| `packages/client/src/components/features/tree-view/tree-view.tsx` or `tree-row.tsx` | Add `<InlineEffortMarkdown>` below effort rows |
| `packages/client/src/components/features/tree-view/tree-view.test.tsx` | Add tests for inline effort markdown |
| `packages/client/src/queries/node-queries.ts` | Add `useNodeAncestors` hook |

**Server files to potentially modify (if adding ancestors endpoint):**

| File | Change |
|------|--------|
| `packages/server/src/routes/nodes.route.ts` | Add `GET /api/nodes/:id/ancestors` route |
| `packages/server/src/services/node.service.ts` | Add `getNodeAncestors(id)` service method |
| `packages/client/src/api/nodes.api.ts` | Add `getNodeAncestors(id)` API client function |

**Files NOT to modify:**

| File | Reason |
|------|--------|
| `packages/client/src/components/features/detail-panel/markdown-editor.tsx` | The WYSIWYG editor is separate from breadcrumbs and inline display |
| `packages/client/src/hooks/use-auto-save.ts` | Auto-save is unrelated to this story |
| `packages/client/src/stores/detail-panel-store.ts` | Use existing `openTab`/`setActiveTab` — no store changes needed |
| `packages/client/src/stores/ui-store.ts` | Use existing `setActiveNodeId` — no store changes needed |
| `packages/shared/src/schemas/node.schema.ts` | Node response schema already includes `markdownBody` and all needed fields |

### Testing Requirements

**Unit tests (Vitest + Testing Library):**

- **`breadcrumb-nav.test.tsx`** — Component tests:
  - Renders breadcrumb trail with correct ancestor chain
  - Current node (last segment) is not clickable (rendered as `BreadcrumbPage`)
  - Parent segments are clickable links
  - Clicking a parent breadcrumb calls `setActiveNodeId` with correct node ID
  - Breadcrumb has `role="navigation"` and `aria-label="Breadcrumb"`
  - Updates when `nodeId` prop changes (tab switching)
  - Handles nodes at different hierarchy levels (project, effort, task, subtask)

- **`inline-effort-markdown.test.tsx`** — Component tests:
  - Renders markdown content for effort nodes with non-empty `markdownBody`
  - Does NOT render when `markdownBody` is empty or whitespace
  - Has `aria-label="Effort notes for {title}"`
  - Is NOT focusable (no `treeitem` role, `tabIndex=-1` or excluded)
  - Toggle expand/collapse works
  - Collapsed by default

- **`node-queries.ts` additions** — If adding `useNodeAncestors`:
  - Returns correct ancestor chain from root to node
  - Handles project-level nodes (single ancestor: itself)
  - Uses correct query key `['nodes', nodeId, 'ancestors']`

- **`node.service.ts` additions** — If adding server endpoint:
  - Returns ancestors in correct order (root first)
  - Returns 404 for non-existent node
  - Handles project nodes (returns single-item array)

**E2E tests (Playwright):**
- Existing E2E tests must still pass
- Manual verification via Playwright MCP recommended for breadcrumb clicking and inline markdown display

**Test environment notes:**
- Tiptap readonly instance for inline markdown tests requires jsdom (already configured)
- Shadcn Breadcrumb uses Radix UI primitives — may need mocking for portal-based rendering
- **Current test count: 331 passing.** All must continue to pass.

### Previous Story Intelligence (Story 2.2)

**What was built:** Tiptap WYSIWYG markdown editor with auto-save, integrated into the detail panel for all node types.

**Key learnings to apply:**

- **`detail-content.tsx` is the integration point for breadcrumbs**: Currently renders node title, type badge, completion status, and `<MarkdownEditor>`. Insert `<BreadcrumbNav>` above the title.
- **`markdownBody` is already available**: The `useNode(nodeId)` hook returns `markdownBody`. For tree children, `useNodeChildren(parentId)` also returns `markdownBody` on each child — no extra fetch needed for inline effort markdown.
- **Tiptap reuse for readonly rendering**: The editor packages are already installed. Creating a Tiptap instance with `editable: false` reuses the same rendering pipeline. Consider whether a full Tiptap instance per effort is heavyweight — for a handful of efforts it's fine, but watch for performance with many expanded efforts.
- **CSS pattern**: Story 2.2 used `@tailwindcss/typography` `prose` classes for editor styling. Reuse the same `prose` classes for inline effort markdown rendering.
- **`cn` utility**: Import from `'#/lib/utils'` for conditional classnames.
- **331 tests passing** at end of Story 2.2. This is the baseline — do not regress.
- **Code review fixes from 2.2**: Use design tokens for colors (not hardcoded), destructure mutations for stable references, don't add unnecessary deps to useEffect.

### Git Intelligence

- Feature work in single commits on story branches (`story/{story-key}`)
- Branch for this story: `story/2-3-breadcrumb-navigation-and-inline-effort-markdown`
- Last commit on main: `1a0b760` — "Add Tiptap WYSIWYG markdown editor with auto-save for all node types"
- Files from previous stories that this story touches again: `detail-content.tsx`, `tree-view.tsx` or `tree-row.tsx`, `node-queries.ts`
- Recent patterns: single-commit story branches, PR after code review

### Project Structure Notes

- Alignment with unified project structure: `breadcrumb-nav.tsx` in `detail-panel/` folder, `inline-effort-markdown.tsx` in `tree-view/` folder — both specified in the architecture doc
- No conflicts with existing features
- Shadcn breadcrumb component adds a new file to `components/ui/` — standard Shadcn pattern

### What This Story Does NOT Include (Scope Boundaries)

- **No completion checkboxes on nodes** — That's Epic 3
- **No progress indicators** — That's Story 3.2
- **No editable inline markdown in tree** — Inline effort markdown is read-only; editing is in the detail panel
- **No session persistence of breadcrumb state** — That's Epic 6
- **No breadcrumbs for project-level nodes** — A project has no ancestors; breadcrumbs only show when viewing descendants
- **No quick capture bar** — That's Epic 4
- **No search** — That's Epic 5

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.3 (Lines 417-439)]
- [Source: _bmad-output/planning-artifacts/architecture.md — detail-panel structure (breadcrumb-nav.tsx), tree-view structure (inline-effort-markdown.tsx), component architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Breadcrumb navigation (lines 1097-1101), InlineEffortMarkdown anatomy (lines 803-823), design directions (lines 476-532)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR33 (breadcrumb trail), FR16 (effort markdown inline), FR17 (task/subtask markdown NOT inline)]
- [Source: _bmad-output/implementation-artifacts/2-2-markdown-editor-and-auto-save.md — Previous story patterns, Tiptap setup, test baseline, file list]
- [Source: _bmad-output/project-context.md — Implementation rules, testing standards, code conventions, MCP tools]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered during implementation.

### Completion Notes List

- Implemented server-side `GET /api/nodes/:id/ancestors` endpoint using iterative parent walk (not recursive CTE, as SQLite iterative walk is sufficient for max depth 4)
- Created `BreadcrumbNav` component using Shadcn Breadcrumb primitives with `render={<button>}` for parent links (no `<a>` tags since navigation is client-side via Zustand)
- Created `InlineEffortMarkdown` component reusing Tiptap in readonly mode (`editable: false`) — no new markdown rendering library needed
- Integrated inline markdown into virtualized tree by switching from fixed-height rows to dynamic measurement via `virtualizer.measureElement`
- All 356 unit tests pass (25 new tests added, up from 331 baseline)
- MCP verification confirmed all 6 acceptance criteria met visually and functionally

### Change Log

- 2026-03-12: Implemented breadcrumb navigation and inline effort markdown (Story 2.3)
- 2026-03-12: Code review fixes — fixed nested `<li>` in breadcrumb HTML, added ancestor query cache invalidation, deferred Tiptap editor creation until expanded, removed unused `nodeId` prop, extracted tree row height constant

### File List

**New files:**
- packages/client/src/components/ui/breadcrumb.tsx (Shadcn breadcrumb primitive)
- packages/client/src/components/features/detail-panel/breadcrumb-nav.tsx
- packages/client/src/components/features/detail-panel/breadcrumb-nav.test.tsx
- packages/client/src/components/features/tree-view/inline-effort-markdown.tsx
- packages/client/src/components/features/tree-view/inline-effort-markdown.test.tsx

**Modified files:**
- packages/server/src/services/node.service.ts (added getNodeAncestors)
- packages/server/src/services/node.service.test.ts (added ancestor tests)
- packages/server/src/routes/nodes.route.ts (added GET /api/nodes/:id/ancestors)
- packages/server/src/routes/nodes.route.test.ts (added ancestor route tests)
- packages/client/src/api/nodes.api.ts (added getNodeAncestors API client)
- packages/client/src/queries/node-queries.ts (added useNodeAncestors hook)
- packages/client/src/components/features/detail-panel/detail-content.tsx (added BreadcrumbNav)
- packages/client/src/components/features/detail-panel/detail-content.test.tsx (added useNodeAncestors mock)
- packages/client/src/components/features/detail-panel/detail-panel.test.tsx (added useNodeAncestors mock)
- packages/client/src/components/features/tree-view/tree-view.tsx (added InlineEffortMarkdown + dynamic virtualizer measurement)
- packages/client/src/components/features/tree-view/tree-view.test.tsx (updated virtualizer mock)
- packages/client/src/components/features/tree-view/tree-rename-delete.test.tsx (updated virtualizer mock)
- packages/client/src/components/features/tree-view/tree-dnd.test.tsx (updated virtualizer mock)
- packages/client/src/components/features/tree-view/tree-navigation.test.tsx (updated virtualizer mock)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: in-progress → review)
