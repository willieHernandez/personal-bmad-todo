# Story 2.2: Markdown Editor & Auto-Save

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to write and view rich markdown notes on any node with automatic saving,
So that I can capture context and planning notes without worrying about saving.

## Acceptance Criteria

1. **Tiptap WYSIWYG editor active in detail panel:**
   Given a task or subtask is open in the detail panel
   When the user clicks in the content area
   Then a Tiptap WYSIWYG editor is active with the node's existing markdown body loaded
   And the editor supports headings, bullet lists, ordered lists, task lists (checkboxes), code blocks, inline code, links, bold, and italic
   And formatting renders live as the user types (WYSIWYG — no mode toggle, no preview split)
   And there is no explicit save button — content auto-saves

2. **Auto-save with 500ms debounce:**
   Given the user is typing in the markdown editor
   When the user pauses for 500ms
   Then the content is saved via `PATCH /api/nodes/:id` with the updated `markdownBody`
   And saving is silent — no toast, no "saved" indicator, no UI feedback
   And if the save fails, it retries silently; if retry fails, a subtle inline error appears on the editor

3. **All node types support markdown:**
   Given a project or effort node is selected
   When the user views the node in the detail panel
   Then the markdown editor is also available for project and effort nodes (all hierarchy levels support markdown)

4. **Performance:**
   And markdown rendering completes in under 300ms for typical note sizes (NFR2)

5. **Editor styling:**
   And the editor uses JetBrains Mono font as specified in the UX design
   And no toolbar is shown — formatting is via markdown shortcuts only (keyboard-first)
   And placeholder text "Write notes..." is displayed when the editor is empty

## Tasks / Subtasks

- [x] Task 1: Install Tiptap dependencies (AC: #1, #5)
  - [x] 1.1 Install core packages: `pnpm --filter client add @tiptap/react @tiptap/pm @tiptap/starter-kit`
  - [x] 1.2 Install markdown extension: `pnpm --filter client add @tiptap/markdown`
  - [x] 1.3 Install additional extensions: `@tiptap/extension-placeholder @tiptap/extension-task-list @tiptap/extension-task-item`
  - [x] 1.4 Verify all packages resolve correctly and `pnpm dev` still starts

- [x] Task 2: Create `MarkdownEditor` component (AC: #1, #3, #5)
  - [x] 2.1 Create `packages/client/src/components/features/detail-panel/markdown-editor.tsx`
  - [x] 2.2 Initialize Tiptap `useEditor` with StarterKit extensions (headings, bold, italic, strike, lists, code blocks, blockquote, horizontal rule, history)
  - [x] 2.3 Register additional extensions: `Markdown`, `Placeholder`, `TaskList`, `TaskItem`
  - [x] 2.4 Configure `@tiptap/markdown` for bidirectional markdown: load `markdownBody` string from node via `setContent(content, { contentType: 'markdown' })`, serialize back via `editor.getMarkdown()`
  - [x] 2.5 Add placeholder text "Write notes..." via `Placeholder.configure({ placeholder: 'Write notes...' })`
  - [x] 2.6 Style editor: JetBrains Mono font, use `@tailwindcss/typography` prose classes for rendered content
  - [x] 2.7 No toolbar — formatting via markdown keyboard shortcuts only (`#` headings, `-` lists, ``` code, `**` bold, `*` italic, `- [ ]` task lists)
  - [x] 2.8 Add `role="textbox"`, `aria-multiline="true"`, `aria-label="Markdown notes for {node title}"`
  - [x] 2.9 Write component tests

- [x] Task 3: Implement auto-save with 500ms debounce (AC: #2)
  - [x] 3.1 Create a `useAutoSave` hook in `packages/client/src/hooks/use-auto-save.ts`
  - [x] 3.2 On Tiptap `onUpdate` callback, start/reset a 500ms debounce timer
  - [x] 3.3 After debounce, serialize editor content via `editor.getMarkdown()` and call `useUpdateNode` mutation with `{ markdownBody }`
  - [x] 3.4 Silent on success — no UI feedback whatsoever
  - [x] 3.5 On failure: retry once silently. On second failure: show subtle inline error (e.g., small red text below editor "Save failed")
  - [x] 3.6 Cleanup: cancel pending debounce timer on unmount and on tab switch
  - [x] 3.7 Write hook tests

- [x] Task 4: Expand `useUpdateNode` mutation to support `markdownBody` (AC: #2)
  - [x] 4.1 Modify `useUpdateNode` in `node-queries.ts`: change `data` type from `{ title: string }` to `UpdateNode` (from shared schema) to accept `{ title?, markdownBody? }`
  - [x] 4.2 Update optimistic update in `onMutate` to also update `['nodes', id, 'detail']` cache with new `markdownBody`
  - [x] 4.3 Ensure existing callers (tree rename) still work — they pass `{ title }` which is valid under `UpdateNode`
  - [x] 4.4 Update existing tests for expanded type

- [x] Task 5: Integrate `MarkdownEditor` into `DetailContent` (AC: #1, #3)
  - [x] 5.1 Replace the read-only `<div className="whitespace-pre-wrap">` in `detail-content.tsx` with `<MarkdownEditor>` component
  - [x] 5.2 Pass `nodeId`, `markdownBody`, and `nodeTitle` as props
  - [x] 5.3 Editor should re-initialize content when active tab changes (different nodeId)
  - [x] 5.4 Handle edge case: switching tabs must save pending changes (flush debounce) before loading new content
  - [x] 5.5 Update detail-content tests

- [x] Task 6: Handle editor content synchronization (AC: #1, #2, #3)
  - [x] 6.1 When tab switches, flush any pending auto-save for the previous tab
  - [x] 6.2 When new tab activates, load that node's `markdownBody` into editor via `setContent`
  - [x] 6.3 Avoid unnecessary re-renders: only call `setContent` when nodeId actually changes, not on every render
  - [x] 6.4 When node data refetches from server (after optimistic update settles), do NOT overwrite user's in-progress typing — the editor is the source of truth while focused

## Dev Notes

### Architecture Patterns & Constraints

- **State management boundary**: Markdown content is server state (TanStack Query). Editor instance is ephemeral UI state (managed by Tiptap's `useEditor` hook, NOT Zustand). The debounce timer and save logic live in a custom `useAutoSave` hook.
- **Optimistic updates**: Reuse the existing `onMutate/onError/onSettled` pattern from `useUpdateNode`. The mutation already updates both `['nodes', parentId, 'children']` (tree) and `['nodes', id, 'detail']` (detail panel) caches.
- **No Zustand for editor state**: Tiptap manages its own state internally. The undo/redo stack is Tiptap's built-in (Ctrl+Z/Ctrl+Shift+Z). Do NOT add editor state to any Zustand store.
- **Content format**: Store as raw markdown string in `markdownBody` column. Tiptap loads via `setContent(md, { contentType: 'markdown' })` and serializes via `editor.getMarkdown()`. Never store Tiptap JSON — always markdown.
- **No loading spinners**: SQLite reads are sub-ms. Editor should appear instantly with content.

### Technical Requirements

- **API**: `PATCH /api/nodes/:id` already accepts `{ markdownBody: string }` via `updateNodeSchema`. No server changes needed.
- **Schema**: `updateNodeSchema` in `packages/shared/src/schemas/node.schema.ts` already has `markdownBody: z.string().optional()` with refinement requiring at least one field. No schema changes needed.
- **Database**: `markdown_body TEXT NOT NULL DEFAULT ''` column exists on `nodes` table. Drizzle maps to camelCase `markdownBody`. No migration needed.
- **Auto-save debounce**: 500ms after last keystroke. Use `setTimeout`/`clearTimeout` pattern — no external debounce library needed.
- **Error handling**: Silent retry on first failure. Subtle inline error on second failure. Never show toasts, modals, or confirmation dialogs.
- **Performance**: Markdown rendering must complete in under 300ms (NFR2). Tiptap with StarterKit on small documents (<10KB) is well within this budget.

### Architecture Compliance

- **Component location**: `packages/client/src/components/features/detail-panel/markdown-editor.tsx` — inside the existing `detail-panel` feature folder per architecture spec.
- **Hook location**: `packages/client/src/hooks/use-auto-save.ts` — in the shared hooks directory per architecture spec (`use-auto-save.ts` is explicitly listed in the architecture document).
- **File naming**: kebab-case files (`markdown-editor.tsx`, `use-auto-save.ts`), PascalCase components (`MarkdownEditor`), camelCase hooks (`useAutoSave`).
- **State boundaries enforced**:
  - TanStack Query: `markdownBody` data (server state) — fetched via `useNode`, saved via `useUpdateNode`
  - Tiptap `useEditor`: editor instance state (ephemeral, internal to component)
  - Zustand: NOT used for any editor state
  - No React Context
- **Query key convention**: `['nodes', nodeId, 'detail']` for individual node data (already established in Story 2.1). Children list uses `['nodes', parentId, 'children']`.
- **Optimistic update pattern**: `onMutate` → cancel queries, cache previous, update optimistically → `onError` → rollback → `onSettled` → invalidate. Already implemented in `useUpdateNode`.
- **No wrapper abstractions**: Use Tiptap's `useEditor` and `EditorContent` directly. Do NOT create a generic "RichTextEditor" wrapper.
- **Anti-patterns to avoid**:
  - Do NOT store Tiptap JSON in the database — always serialize to/from markdown strings
  - Do NOT add a toolbar — the UX spec mandates keyboard-first, no toolbar
  - Do NOT add save button, "saved" indicator, or success toast
  - Do NOT create a separate `utils/debounce.ts` utility — keep debounce logic inside `useAutoSave` hook
  - Do NOT use `React.memo` on the editor component — Tiptap manages its own rendering

### Library & Framework Requirements

**New packages to install (client only):**

| Package | Version | Purpose |
|---------|---------|---------|
| `@tiptap/react` | ^3.20.x | React bindings, `useEditor` hook, `EditorContent` component |
| `@tiptap/pm` | ^3.20.x | ProseMirror peer dependencies (required) |
| `@tiptap/starter-kit` | ^3.20.x | Bundle: paragraph, heading, bold, italic, strike, code, codeBlock, blockquote, bulletList, orderedList, horizontalRule, history (undo/redo) |
| `@tiptap/markdown` | ^3.20.x | Bidirectional markdown: `setContent(md, { contentType: 'markdown' })` and `editor.getMarkdown()` |
| `@tiptap/extension-placeholder` | ^3.20.x | "Write notes..." placeholder text when editor is empty |
| `@tiptap/extension-task-list` | ^3.20.x | Container for interactive checkbox lists |
| `@tiptap/extension-task-item` | ^3.20.x | Individual checkbox items (`- [ ]` / `- [x]`) |

**Install command:**
```bash
pnpm --filter client add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/markdown @tiptap/extension-placeholder @tiptap/extension-task-list @tiptap/extension-task-item
```

**Already installed — DO NOT add again:**
- `@tailwindcss/typography` v0.5.16 — already in client, provides `prose` classes for rendered markdown styling
- React 19.2.0, TanStack Query 5.90.x, Zustand 5.0.x — all existing

**NOT needed — do NOT install:**
- `tiptap-markdown` (community package) — use official `@tiptap/markdown` instead
- `@tiptap/extension-link` — not in AC scope
- Any debounce library (`lodash.debounce`, `use-debounce`) — use native `setTimeout`

**Key API usage:**

```typescript
// Initialize editor
const editor = useEditor({
  extensions: [
    StarterKit,
    Markdown,
    Placeholder.configure({ placeholder: 'Write notes...' }),
    TaskList,
    TaskItem.configure({ nested: true }),
  ],
})

// Load markdown content
editor.commands.setContent(markdownBody, { contentType: 'markdown' })

// Serialize to markdown string for saving
const md = editor.getMarkdown()
```

### File Structure Requirements

**New files to create:**

```
packages/client/src/
├── components/features/detail-panel/
│   ├── markdown-editor.tsx          # Tiptap editor component (NEW)
│   └── markdown-editor.test.tsx     # Co-located tests (NEW)
├── hooks/
│   ├── use-auto-save.ts             # Debounced auto-save hook (NEW)
│   └── use-auto-save.test.ts        # Co-located tests (NEW)
```

**Existing files to modify:**

| File | Change |
|------|--------|
| `packages/client/package.json` | Add 7 Tiptap dependencies |
| `packages/client/src/queries/node-queries.ts` | Expand `useUpdateNode` data type to accept `{ markdownBody? }` |
| `packages/client/src/components/features/detail-panel/detail-content.tsx` | Replace read-only `<div>` with `<MarkdownEditor>` component |

**Files NOT to modify:**

| File | Reason |
|------|--------|
| `packages/server/src/routes/nodes.route.ts` | `PATCH /api/nodes/:id` already handles `markdownBody` |
| `packages/server/src/services/node.service.ts` | `updateNode()` already persists `markdownBody` |
| `packages/shared/src/schemas/node.schema.ts` | `updateNodeSchema` already includes `markdownBody` |
| `packages/client/src/api/nodes.api.ts` | `updateNode(id, data)` already sends arbitrary body fields |
| `packages/client/src/stores/detail-panel-store.ts` | No editor state in Zustand |
| `packages/client/src/stores/ui-store.ts` | No editor state in Zustand |

**Placement rules:**
- `markdown-editor.tsx` goes in `detail-panel/` folder — it is a detail panel subcomponent, not a standalone feature folder. The architecture doc shows `markdown-editor.tsx` inside `detail-panel/`.
- `use-auto-save.ts` goes in `hooks/` — it is a shared-logic hook listed explicitly in the architecture doc's hooks directory.
- Tests are co-located: `markdown-editor.test.tsx` next to `markdown-editor.tsx`, `use-auto-save.test.ts` next to `use-auto-save.ts`. No `__tests__/` directories.

### Testing Requirements

**Unit tests (Vitest + Testing Library):**

- **`markdown-editor.test.tsx`** — Component tests:
  - Renders Tiptap editor with existing `markdownBody` content loaded
  - Renders placeholder "Write notes..." when `markdownBody` is empty
  - Has `role="textbox"` with `aria-multiline="true"` and correct `aria-label`
  - Applies JetBrains Mono font and prose styling
  - No toolbar rendered in the DOM
  - Content updates trigger `onUpdate` callback

- **`use-auto-save.test.ts`** — Hook tests:
  - Calls mutation after 500ms debounce following content change
  - Resets debounce timer on rapid successive updates (only last one fires)
  - Does NOT call mutation if content hasn't changed from last saved value
  - Cancels pending timer on unmount (no state update after unmount)
  - Flushes pending save on explicit flush call (for tab switching)
  - Retries silently on first failure
  - Sets error state on second consecutive failure
  - Clears error state on next successful save

- **`node-queries.ts` updates** — Verify existing tests still pass:
  - `useUpdateNode` with `{ title }` still works (rename from tree)
  - `useUpdateNode` with `{ markdownBody }` works (auto-save from editor)
  - Optimistic update applies to both `['nodes', parentId, 'children']` and `['nodes', id, 'detail']` caches

- **`detail-content.test.tsx` updates** — Integration:
  - `MarkdownEditor` renders instead of plain text `<div>`
  - Correct props passed (`nodeId`, `markdownBody`, `nodeTitle`)

**E2E tests (Playwright):**
- Existing E2E tests in `packages/client/e2e/` must still pass
- New E2E coverage for markdown editing is optional but recommended

**Test environment notes:**
- Tiptap requires a DOM environment. Vitest with `jsdom` (already configured) works for basic rendering tests.
- Tiptap's `useEditor` may return `null` on first render in test environment — handle with optional chaining or `waitFor`.
- For auto-save tests, use `vi.useFakeTimers()` to control the 500ms debounce without real delays.
- **Current test count: 218 passing (157 client + 61 server).** All must continue to pass.

### Previous Story Intelligence (Story 2.1)

**What was built:** Detail panel with slide-over, tabbed views, focus management, and `useNode` query hook.

**Key learnings to apply:**

- **`detail-content.tsx` is the integration point**: Currently renders node title, type badge, completion status, and raw `markdownBody` in a `<div className="whitespace-pre-wrap">`. Replace that div with `<MarkdownEditor>`. Do NOT restructure the rest of the component.
- **Scroll position save/restore per tab**: `useDetailPanelStore` has `saveScrollPosition(nodeId, scrollTop)` and `scrollPositions` map. The editor's scroll container should integrate with this existing mechanism.
- **`useNode(nodeId)` hook**: Returns individual node data with query key `['nodes', nodeId, 'detail']`. Already used by `DetailContent` to fetch `markdownBody`. The editor reads from this data.
- **Edit mode guard**: `editingNodeId` in tree-view prevents click conflicts with rename mode. The markdown editor in the detail panel is a separate focus zone — no conflict, but be aware that Escape in the editor should NOT close the detail panel while the editor is focused and has an active selection.
- **CSS pattern**: Story 2.1 used plain CSS for hover states due to Tailwind v4 group-hover limitation. Apply same approach if needed for editor focus styling.
- **`cn` utility**: Import from `'#/lib/utils'` for conditional classnames.
- **218 tests passing** at end of Story 2.1. This is the baseline — do not regress.

**Code review fixes from 2.1 to be aware of:**
- `useNode` query key is `['nodes', nodeId, 'detail']` (differentiated to prevent invalidation collisions)
- `setActiveTab` is guarded against invalid IDs
- Escape handler is guarded when panel is already closed

### Git Intelligence

- Feature work in single commits on story branches (`story/{story-key}`)
- Branch: `story/2-2-markdown-editor-and-auto-save`
- Last commit: `ea5f1c4` — "Add detail panel with tabbed views and fix 24 failing E2E tests"
- Files modified in Story 2.1 that this story touches again: `detail-content.tsx`, `node-queries.ts`

### Latest Tech Information

**Tiptap v3.20.x (March 2026):**
- `@tiptap/react` v3.20.1, `@tiptap/markdown` v3.20.0 — latest stable
- All `@tiptap/*` packages should use matching major.minor versions for compatibility
- Key APIs:
  - `editor.commands.setContent(markdown, { contentType: 'markdown' })` — parse markdown into editor
  - `editor.getMarkdown()` — serialize editor content to markdown string
  - `editor.on('update', callback)` — fires on every content change (debounce trigger)
  - `editor.isDestroyed` — check before operations to avoid errors on unmounted editors
- StarterKit includes `History` extension (undo/redo) — do NOT add separately
- `@tiptap/markdown` is marked "early release" — test thoroughly with all formatting types

### Project Structure Notes

- Alignment with unified project structure: markdown editor is a subcomponent within `detail-panel/` feature folder
- No conflicts with existing tree-view, sidebar, capture-bar, or project-tabs features
- `detail-content.tsx` is the integration point — currently renders placeholder, will render `MarkdownEditor`

### What This Story Does NOT Include (Scope Boundaries)

- **No breadcrumb navigation** — That's Story 2.3
- **No inline effort markdown in tree view** — That's Story 2.3
- **No completion checkboxes on nodes** — That's Epic 3
- **No session persistence of open tabs** — That's Epic 6
- **No toolbar/formatting bar** — By design (UX spec: keyboard-first, no toolbar)
- **No markdown preview mode** — WYSIWYG only, no split view, no mode toggle

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.2 (Lines 389-416)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Detail panel structure, state management, API patterns, hooks directory]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — WYSIWYG editor anatomy (lines 853-900), auto-save behavior, keyboard interactions]
- [Source: _bmad-output/planning-artifacts/prd.md — FR14-FR17, NFR2]
- [Source: _bmad-output/implementation-artifacts/2-1-detail-panel-and-tabbed-views.md — Previous story patterns, file list, dev notes]
- [Source: _bmad-output/project-context.md — Implementation rules, testing standards, code conventions]
- [Source: packages/shared/src/schemas/node.schema.ts — updateNodeSchema supports {title?, markdownBody?}]
- [Source: packages/client/src/queries/node-queries.ts — useUpdateNode mutation pattern, optimistic updates]
- [Source: packages/client/src/components/features/detail-panel/detail-content.tsx — Integration point for editor]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed prose-invert styling to use app theme colors (text-app-text-primary) instead of dark mode invert
- Added useAutoSave and useUpdateNode mocks to detail-panel.test.tsx to prevent test failures from new MarkdownEditor dependency chain

### Completion Notes List

- Installed 7 Tiptap packages (@tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/markdown, @tiptap/extension-placeholder, @tiptap/extension-task-list, @tiptap/extension-task-item)
- Created MarkdownEditor component with Tiptap WYSIWYG, markdown shortcuts, no toolbar, aria attributes, prose styling
- Created useAutoSave hook with 500ms debounce, silent retry on first failure, inline error on second failure, flush on tab switch, cleanup on unmount
- Expanded useUpdateNode mutation type from `{ title: string }` to `UpdateNode` to accept `{ title?, markdownBody? }`
- Integrated MarkdownEditor into DetailContent, replacing the old read-only plaintext div
- Verified all ACs via Playwright MCP: WYSIWYG rendering, auto-save persistence, all node types, no toolbar, placeholder text
- MCP verification: Typed `# My Heading` which rendered live as heading. Reloaded page and content persisted via auto-save.
- 331 tests passing (0 regressions, 13 new tests added: 5 markdown-editor + 8 use-auto-save)

### File List

**New files:**
- `packages/client/src/components/features/detail-panel/markdown-editor.tsx` — Tiptap WYSIWYG editor component
- `packages/client/src/components/features/detail-panel/markdown-editor.test.tsx` — Component tests (5 tests)
- `packages/client/src/hooks/use-auto-save.ts` — Debounced auto-save hook
- `packages/client/src/hooks/use-auto-save.test.ts` — Hook tests (8 tests)

**Modified files:**
- `packages/client/package.json` — Added 7 Tiptap dependencies
- `packages/client/src/queries/node-queries.ts` — Changed useUpdateNode data type to UpdateNode
- `packages/client/src/components/features/detail-panel/detail-content.tsx` — Replaced plaintext div with MarkdownEditor
- `packages/client/src/components/features/detail-panel/detail-content.test.tsx` — Updated tests for MarkdownEditor integration
- `packages/client/src/components/features/detail-panel/detail-panel.test.tsx` — Added useAutoSave and useUpdateNode mocks
- `packages/client/src/styles.css` — Added Tiptap task list CSS rules for checkbox layout
- `playwright.config.ts` — Added globalSetup and test DB path for E2E isolation
- `.gitignore` — Added test-data/ exclusion
- `pnpm-lock.yaml` — Updated lockfile for Tiptap dependencies
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Sprint tracking update
- `_bmad-output/implementation-artifacts/2-2-markdown-editor-and-auto-save.md` — Story file (this file)

**New infrastructure files:**
- `tests/e2e/global-setup.ts` — E2E test database setup script

## Change Log

- 2026-03-12: Implemented Tiptap WYSIWYG markdown editor with auto-save, integrated into detail panel for all node types
- 2026-03-12: Code review fixes — passed correct parentId to auto-save (was null, causing unnecessary project list refetch); removed silent HTML fallback from getMarkdown (now throws if Markdown extension missing); destructured mutate for stable reference; used design token for error color; removed unnecessary markdownBody from useEffect deps; updated File List with 6 previously undocumented files
