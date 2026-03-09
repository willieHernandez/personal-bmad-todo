---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments: [prd.md, architecture.md, ux-design-specification.md]
---

# todo-bmad-style - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for todo-bmad-style, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can create a new project with a title
FR2: User can create efforts within a project
FR3: User can create tasks within an effort
FR4: User can create subtasks within a task (one level of nesting only)
FR5: User can rename any node (project, effort, task, subtask) inline in the tree
FR6: User can delete any node and its descendants from the hierarchy
FR7: User can reorder nodes within their parent via drag-and-drop
FR8: User can move nodes between parents via drag-and-drop
FR9: User can mark any node as complete
FR10: System automatically completes a parent node when all its children are complete
FR11: System automatically reopens a parent node when any completed child is reopened
FR12: User can reopen a completed node
FR13: System displays progress indicators on parent nodes showing completion count (e.g., "2/4")
FR14: User can view and edit a markdown body on any node (project, effort, task, subtask)
FR15: System renders markdown content with standard formatting (headings, lists, code blocks, links, emphasis)
FR16: Effort markdown is visible inline in the tree view
FR17: Task and subtask markdown is visible only in the detail panel
FR18: User can expand and collapse any node in the tree
FR19: System remembers expand/collapse state per project across sessions
FR20: User can navigate the tree using keyboard arrow keys
FR21: User can rename a node by pressing Enter while focused in the tree
FR22: User can delete a node by pressing Delete while focused in the tree
FR23: User can select a task or subtask to open it in the detail panel
FR24: System displays a three-zone layout: quick capture bar (top), project sidebar (left), content panel (right)
FR25: Sidebar lists projects sorted by most recently opened
FR26: Sidebar organizes items into sections: Inbox, Pinned, Recent, On Hold
FR27: User can select a project in the sidebar to display its tree in the content panel
FR28: Sidebar sections are collapsible
FR29: User can open a task or subtask in a detail panel (slide-over from tree view)
FR30: User can have multiple tasks open as tabs in the detail panel
FR31: User can switch between open tabs without losing state
FR32: User can close the detail panel using a back button or Escape key
FR33: System displays a clickable breadcrumb trail showing the node's position in the hierarchy
FR34: User can type a thought into a persistent quick capture bar and save it
FR35: Captured items always go to the inbox regardless of current view context
FR36: User can view all inbox items in a dedicated inbox view
FR37: User can move an inbox item to a specific location in the hierarchy using a "Move To" action
FR38: User can move inbox items to the hierarchy via drag-and-drop into the tree
FR39: Inbox items become real nodes (task or subtask) at the destination
FR40: User can search across all projects, nodes, and markdown content
FR41: System returns matching results with enough context to identify the right item
FR42: User can navigate directly to a search result in its tree context
FR43: System persists the user's last active project, task, and scroll position
FR44: On app launch, system restores the user's last session state — opening directly to the last active task with its content visible
FR45: System stores all data in a local SQLite database
FR46: System operates fully offline with no external network dependencies
FR47: All CRUD operations persist immediately to the local database

### NonFunctional Requirements

NFR1: All tree operations (expand, collapse, select, reorder, complete) respond in under 200ms
NFR2: Markdown rendering completes in under 300ms for typical note sizes
NFR3: Quick capture save-to-inbox completes in under 100ms — no perceptible delay
NFR4: Search returns results within 500ms across all projects and content
NFR5: Drag-and-drop provides real-time visual feedback with no frame drops
NFR6: App launch to resumed session state in under 2 seconds
NFR7: Tree remains responsive with projects containing 200+ nodes
NFR8: Full keyboard navigation for all tree operations matching file-manager conventions
NFR9: ARIA roles applied to tree view, detail panel, tabs, breadcrumbs, and inbox
NFR10: Focus management maintained during panel transitions (tree ↔ detail)
NFR11: Visible focus indicators on all interactive elements
NFR12: All write operations are atomic — no partial saves on crash or unexpected shutdown
NFR13: SQLite database uses WAL mode for crash resilience
NFR14: No data loss on app restart, browser refresh, or process termination
NFR15: Database file remains portable — a single file that can be copied for manual backup

### Additional Requirements

**From Architecture:**
- Starter template: TanStack CLI (`--router-only`) with Shadcn and TanStack Query add-ons for frontend; manual Fastify + Drizzle + better-sqlite3 setup for backend
- Monorepo structure using pnpm workspaces with three packages: `client`, `server`, `shared`
- Shared Zod schemas in `shared` package define the API contract between client and server
- Single `nodes` table with self-referencing `parent_id` for the four-level hierarchy
- Additional tables: `inbox_items`, `session_state`, `tree_view_state`
- UUIDs (v4) for all entity IDs
- Resource-based REST API design (`/api/nodes`, `/api/inbox`, `/api/session`, `/api/search`)
- TanStack Query for server state with optimistic updates on all tree mutations
- Zustand for UI-only state (focused node, active panel, keyboard mode, undo stack)
- Vite proxy configuration for `/api/*` forwarding to Fastify in development
- `concurrently` for single `npm run dev` starting both client and server
- Database location: `~/.todo-bmad-style/data.db` (configurable via `DB_PATH` env var)
- Testing: Vitest for unit tests, Playwright for E2E, Testing Library for component tests
- Co-located test files (e.g., `tree-view.tsx` → `tree-view.test.tsx` in same directory)
- Cascade completion logic handled at the application layer (service), not database
- Auto-save markdown bodies with 500ms debounce via TanStack Query mutation
- App-level undo stack (Zustand) for tree operations, clears on project switch

**From UX Design:**
- Desktop-only: minimum 1280x720 viewport, no mobile/tablet support
- WCAG 2.1 AA compliance target for keyboard UX quality
- Keyboard-first interaction model with file-manager conventions (arrow keys, Enter to rename, Delete to remove)
- Outliner-style rapid creation: Enter to create sibling, Tab to nest, Shift+Tab to outdent
- WYSIWYG markdown editing via Tiptap — no mode toggle, no save button
- Three-zone layout: capture bar (top full-width), sidebar (left), content panel (right) with project tabs between capture bar and content
- Browser-style project tabs for fast context switching between active projects
- Sidebar resizable via drag handle (240px default, 180px min, 400px max)
- Detail panel as slide-over from tree view with tabbed task views
- `prefers-reduced-motion` media query respected — disable cascade completion transition
- Focus ring: `#3B82F6` with 2px offset on all interactive elements
- No modals for routine actions (create, rename, complete, move)
- No loading spinners for local operations — app should feel instant
- No success toasts or confirmation dialogs — silence is confidence
- Muted, restrained color palette with neutral grays and subtle accent colors

### FR Coverage Map

FR1: Epic 1 - Create new project with title
FR2: Epic 1 - Create efforts within a project
FR3: Epic 1 - Create tasks within an effort
FR4: Epic 1 - Create subtasks within a task
FR5: Epic 1 - Rename any node inline in the tree
FR6: Epic 1 - Delete any node and its descendants
FR7: Epic 1 - Reorder nodes within parent via drag-and-drop
FR8: Epic 1 - Move nodes between parents via drag-and-drop
FR9: Epic 3 - Mark any node as complete
FR10: Epic 3 - Auto-complete parent when all children complete
FR11: Epic 3 - Auto-reopen parent when completed child reopened
FR12: Epic 3 - Reopen a completed node
FR13: Epic 3 - Progress indicators on parent nodes
FR14: Epic 2 - View and edit markdown body on any node
FR15: Epic 2 - Render markdown with standard formatting
FR16: Epic 2 - Effort markdown visible inline in tree view
FR17: Epic 2 - Task/subtask markdown visible only in detail panel
FR18: Epic 1 - Expand and collapse any node in the tree
FR19: Epic 1 - Remember expand/collapse state across sessions
FR20: Epic 1 - Navigate tree using keyboard arrow keys
FR21: Epic 1 - Rename node by pressing Enter in tree
FR22: Epic 1 - Delete node by pressing Delete in tree
FR23: Epic 1 - Select task/subtask to open in detail panel
FR24: Epic 1 - Three-zone layout with capture bar, sidebar, content panel
FR25: Epic 1 - Sidebar lists projects sorted by recency
FR26: Epic 1 - Sidebar sections: Inbox, Pinned, Recent, On Hold
FR27: Epic 1 - Select project in sidebar to display tree
FR28: Epic 1 - Collapsible sidebar sections
FR29: Epic 2 - Open task/subtask in detail panel slide-over
FR30: Epic 2 - Multiple tasks open as tabs in detail panel
FR31: Epic 2 - Switch between open tabs without losing state
FR32: Epic 2 - Close detail panel with back button or Escape
FR33: Epic 2 - Clickable breadcrumb trail showing hierarchy position
FR34: Epic 4 - Type thought into persistent quick capture bar
FR35: Epic 4 - Captured items go to inbox regardless of context
FR36: Epic 4 - View all inbox items in dedicated inbox view
FR37: Epic 4 - Move inbox item to hierarchy via Move To action
FR38: Epic 4 - Move inbox items to hierarchy via drag-and-drop
FR39: Epic 4 - Inbox items become real nodes at destination
FR40: Epic 5 - Search across all projects, nodes, and markdown
FR41: Epic 5 - Search results with enough context to identify item
FR42: Epic 5 - Navigate directly to search result in tree context
FR43: Epic 6 - Persist last active project, task, and scroll position
FR44: Epic 6 - Restore last session state on app launch

## Epic List

### Epic 1: Build & Navigate Project Hierarchy
User can create projects with efforts, tasks, and subtasks, navigate the tree with keyboard and mouse, and manage the workspace layout. Includes project scaffolding (monorepo, database, API) as the foundation story per Architecture spec.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR45, FR46, FR47

### Epic 2: Task Content & Markdown Notes
User can view task details in a slide-over panel with tabs and write rich markdown notes on any node using a WYSIWYG Tiptap editor with auto-save.
**FRs covered:** FR14, FR15, FR16, FR17, FR29, FR30, FR31, FR32, FR33

### Epic 3: Complete & Track Progress
User can mark nodes complete with automatic bidirectional cascade behavior and see honest progress indicators on parent nodes.
**FRs covered:** FR9, FR10, FR11, FR12, FR13

### Epic 4: Quick Capture & Inbox
User can capture thoughts without leaving current context via the capture bar, and later organize inbox items into the hierarchy using move-to or drag-and-drop.
**FRs covered:** FR34, FR35, FR36, FR37, FR38, FR39

### Epic 5: Search & Discovery
User can search across all projects, nodes, and markdown content, view contextual results, and navigate directly to any item in its tree context.
**FRs covered:** FR40, FR41, FR42

### Epic 6: Session Resume & Continuity
App remembers and restores the user's exact place across sessions — last active project, task, scroll position, and open tabs visible immediately on launch.
**FRs covered:** FR43, FR44

## Epic 1: Build & Navigate Project Hierarchy

User can create projects with efforts, tasks, and subtasks, navigate the tree with keyboard and mouse, and manage the workspace layout. Includes project scaffolding (monorepo, database, API) as the foundation story per Architecture spec.

### Story 1.1: Project Scaffolding & Monorepo Foundation

As a developer,
I want a fully configured monorepo with frontend, backend, and shared packages running locally,
So that I have the foundation to build all product features.

**Acceptance Criteria:**

**Given** the project repository is empty
**When** the scaffolding is complete
**Then** a pnpm workspace monorepo exists with `packages/client`, `packages/server`, and `packages/shared` directories
**And** the client is scaffolded via TanStack CLI (`--router-only`) with Shadcn/ui and TanStack Query add-ons
**And** the server has Fastify, Drizzle ORM, and better-sqlite3 installed with TypeScript configured
**And** the shared package has a Zod dependency and barrel export (`src/index.ts`)
**And** `pnpm dev` at the root starts both Vite dev server and Fastify server via `concurrently`
**And** Vite proxies `/api/*` requests to the Fastify server
**And** the Fastify server listens on `127.0.0.1` only (not exposed to network)
**And** a root `tsconfig.base.json` with strict mode is shared across all packages
**And** Vitest is configured for unit testing across client and server packages

### Story 1.2: Node Data Model & CRUD API

As a user,
I want my project hierarchy data to be stored reliably in a local database with a complete API,
So that all hierarchy operations persist immediately and survive app restarts.

**Acceptance Criteria:**

**Given** the monorepo is scaffolded (Story 1.1)
**When** the database and API are set up
**Then** a `nodes` table exists with columns: `id` (UUID), `title`, `type` (project|effort|task|subtask), `parent_id` (self-referencing, NULL for projects), `sort_order` (integer), `is_completed` (boolean), `markdown_body` (text), `created_at`, `updated_at`
**And** a `tree_view_state` table exists with columns: `node_id`, `is_expanded` (boolean)
**And** SQLite WAL mode is enabled for crash resilience
**And** the database is created at `~/.todo-bmad-style/data.db` (configurable via `DB_PATH` env var)
**And** Drizzle schema maps `snake_case` DB columns to `camelCase` in TypeScript
**And** Zod schemas in the shared package define `createNodeSchema`, `updateNodeSchema`, and `moveNodeSchema`
**And** `GET /api/nodes` returns all root nodes (projects)
**And** `POST /api/nodes` creates a new node with validated input
**And** `GET /api/nodes/:id` returns a single node
**And** `PATCH /api/nodes/:id` updates a node's title or markdown body
**And** `DELETE /api/nodes/:id` deletes a node and all its descendants
**And** `GET /api/nodes/:id/children` returns children of a node sorted by `sort_order`
**And** `PATCH /api/nodes/:id/reorder` updates a node's `sort_order` within its parent
**And** `PATCH /api/nodes/:id/move` moves a node to a new parent at a specified position
**And** all write operations are atomic (no partial saves)
**And** hierarchy validation enforces: projects have no parent, efforts have project parent, tasks have effort parent, subtasks have task parent

### Story 1.3: App Layout & Project Sidebar

As a user,
I want to see a clean workspace layout with my projects listed in the sidebar,
So that I can select a project and start working immediately.

**Acceptance Criteria:**

**Given** the app loads in the browser
**When** the main layout renders
**Then** a three-zone layout is displayed: capture bar placeholder (top full-width), project sidebar (left), content panel (right)
**And** browser-style project tabs appear between the capture bar and content area
**And** the sidebar displays sections: Inbox, Pinned, Recent, On Hold
**And** each sidebar section is collapsible
**And** projects in the Recent section are sorted by most recently opened
**And** the sidebar is resizable via drag handle (240px default, 180px min, 400px max)
**And** clicking a project in the sidebar opens it as a tab and displays its tree in the content panel
**And** clicking a project tab switches to that project's tree view
**And** the sidebar uses Zustand for UI state (collapsed state, width)
**And** TanStack Query fetches and caches the project list from `GET /api/nodes`
**And** the layout uses Shadcn/ui primitives and Tailwind CSS with a muted, restrained color palette

### Story 1.4: Tree View & Hierarchy Creation

As a user,
I want to create projects, efforts, tasks, and subtasks displayed in an interactive tree,
So that I can build a complete project plan with a structured hierarchy.

**Acceptance Criteria:**

**Given** a project is selected in the sidebar
**When** the tree view renders in the content panel
**Then** the project's hierarchy is displayed as an expandable tree with indentation per level
**And** the user can create a new project via a "+" button in the sidebar
**And** the user can create efforts within a project, tasks within an effort, and subtasks within a task
**And** pressing Enter while focused on a node creates a new sibling node below it (outliner-style)
**And** pressing Tab on a newly created node nests it as a child of the node above (indent)
**And** pressing Shift+Tab outdents a node one level (where hierarchy rules allow)
**And** new nodes are created with an inline editable title — the user types a name and it's saved
**And** the tree enforces exactly four levels: Project > Effort > Task > Subtask (no deeper nesting)
**And** all node creation persists immediately via `POST /api/nodes` with optimistic updates via TanStack Query
**And** tree rows display: expand/collapse chevron + node title
**And** the tree uses `@tanstack/react-virtual` for virtualized rendering when nodes exceed 200

### Story 1.5: Tree Navigation & Expand/Collapse

As a user,
I want to navigate the tree with keyboard arrow keys and expand/collapse nodes,
So that I can move through my project hierarchy quickly without using the mouse.

**Acceptance Criteria:**

**Given** the tree view is focused
**When** the user presses arrow keys
**Then** Up/Down arrows move focus to the previous/next visible node
**And** Right arrow expands a collapsed node, or moves to its first child if already expanded
**And** Left arrow collapses an expanded node, or moves to its parent if already collapsed
**And** the tree has ARIA `role="tree"` and rows have `role="treeitem"` with proper `aria-expanded` and `aria-level` attributes
**And** a visible focus ring (`#3B82F6`, 2px offset) appears on the focused node
**And** expand/collapse state is persisted to `tree_view_state` table via the API
**And** on next session load, the tree restores the saved expand/collapse state
**And** clicking a task or subtask selects it (stores in Zustand `useUIStore`) — this selection will be used by the detail panel in Epic 2

### Story 1.6: Inline Rename & Delete

As a user,
I want to rename nodes by pressing Enter and delete nodes by pressing Delete,
So that I can quickly edit my hierarchy using familiar file-manager keyboard conventions.

**Acceptance Criteria:**

**Given** a node is focused in the tree
**When** the user presses Enter
**Then** the node title becomes an inline editable text field
**And** the user can type a new name and press Enter to confirm or Escape to cancel
**And** the rename persists immediately via `PATCH /api/nodes/:id` with optimistic update
**And** no modal or dialog is shown for rename — it's purely inline

**Given** a node is focused in the tree
**When** the user presses Delete
**Then** the node and all its descendants are removed from the tree
**And** the deletion persists immediately via `DELETE /api/nodes/:id` with optimistic update
**And** focus moves to the next sibling, previous sibling, or parent after deletion
**And** no confirmation dialog is shown (per UX spec: silence is confidence)

### Story 1.7: Drag-and-Drop Reorder & Move

As a user,
I want to reorder nodes within their parent and move nodes between parents via drag-and-drop,
So that I can reorganize my project hierarchy visually.

**Acceptance Criteria:**

**Given** the tree view is displayed
**When** the user drags a node within its parent group
**Then** the node is reordered and a drop indicator shows the target position in real-time
**And** the new sort order persists via `PATCH /api/nodes/:id/reorder` with optimistic update

**Given** the tree view is displayed
**When** the user drags a node to a different parent
**Then** the node moves to the new parent at the indicated position
**And** the move persists via `PATCH /api/nodes/:id/move` with optimistic update
**And** hierarchy rules are enforced: efforts can only be under projects, tasks under efforts, subtasks under tasks
**And** invalid drop targets are visually indicated (no drop cursor)
**And** drag-and-drop provides real-time visual feedback with no frame drops (NFR5)
**And** the tree remains responsive during drag operations with 200+ nodes

## Epic 2: Task Content & Markdown Notes

User can view task details in a slide-over panel with tabs and write rich markdown notes on any node using a WYSIWYG Tiptap editor with auto-save.

### Story 2.1: Detail Panel & Tabbed Views

As a user,
I want to click a task or subtask and see its details in a slide-over panel with tabbed views,
So that I can focus on individual items while keeping the tree visible.

**Acceptance Criteria:**

**Given** the tree view is displayed with nodes
**When** the user clicks a task or subtask
**Then** a detail panel slides over from the right side of the tree view
**And** the panel displays the selected node's title and content area
**And** the tree remains partially visible behind/beside the panel

**Given** the detail panel is open with one task
**When** the user clicks a different task or subtask in the tree
**Then** a new tab opens in the detail panel for the selected item
**And** the tab bar shows all open items
**And** the user can switch between tabs by clicking them
**And** switching tabs preserves the state of each tab (scroll position, cursor position)

**Given** the detail panel is open
**When** the user clicks the back button or presses Escape
**Then** the detail panel closes and focus returns to the tree
**And** focus is restored to the previously selected node in the tree

**Given** multiple tabs are open in the detail panel
**When** the user closes a tab
**Then** the tab is removed and the adjacent tab becomes active
**And** if the last tab is closed, the detail panel closes entirely

**And** the detail panel uses ARIA roles for `tablist`, `tab`, and `tabpanel`
**And** focus management moves between tree and detail panel predictably (NFR10)

### Story 2.2: Markdown Editor & Auto-Save

As a user,
I want to write and view rich markdown notes on any node with automatic saving,
So that I can capture context and planning notes without worrying about saving.

**Acceptance Criteria:**

**Given** a task or subtask is open in the detail panel
**When** the user clicks in the content area
**Then** a Tiptap WYSIWYG editor is active with the node's existing markdown body loaded
**And** the editor supports headings, bullet lists, ordered lists, code blocks, inline code, links, bold, and italic
**And** formatting renders live as the user types (WYSIWYG — no mode toggle, no preview split)
**And** there is no explicit save button — content auto-saves

**Given** the user is typing in the markdown editor
**When** the user pauses for 500ms
**Then** the content is saved via `PATCH /api/nodes/:id` with the updated `markdownBody`
**And** saving is silent — no toast, no "saved" indicator, no UI feedback
**And** if the save fails, it retries silently; if retry fails, a subtle inline error appears on the editor

**Given** a project or effort node is selected
**When** the user views the node
**Then** the markdown editor is also available for project and effort nodes (all hierarchy levels support markdown)

**And** markdown rendering completes in under 300ms for typical note sizes (NFR2)
**And** the editor uses JetBrains Mono font as specified in the UX design

### Story 2.3: Breadcrumb Navigation & Inline Effort Markdown

As a user,
I want to see where I am in the hierarchy via breadcrumbs and see effort notes inline in the tree,
So that I maintain orientation and can read effort-level context without opening a detail panel.

**Acceptance Criteria:**

**Given** a task or subtask is open in the detail panel
**When** the detail panel renders
**Then** a breadcrumb trail is displayed at the top showing the full hierarchy path (e.g., Project > Effort > Task > Subtask)
**And** each breadcrumb segment is clickable
**And** clicking a breadcrumb navigates to that node in the tree and selects it
**And** breadcrumbs have proper ARIA `role="navigation"` and `aria-label="Breadcrumb"`

**Given** an effort node is displayed in the tree view
**When** the effort has a non-empty markdown body
**Then** a read-only rendered markdown preview is displayed inline below the effort row in the tree
**And** the inline markdown is collapsed by default and can be toggled

**Given** a task or subtask node exists
**When** viewing the tree
**Then** the task/subtask markdown body is NOT shown inline in the tree — it is only visible in the detail panel

## Epic 3: Complete & Track Progress

User can mark nodes complete with automatic bidirectional cascade behavior and see honest progress indicators on parent nodes.

### Story 3.1: Node Completion & Cascade Logic

As a user,
I want to mark nodes complete and have completion status cascade automatically through the hierarchy,
So that the tree honestly reflects what is done and what needs attention.

**Acceptance Criteria:**

**Given** any node (project, effort, task, or subtask) exists in the tree
**When** the user clicks the checkbox on the node
**Then** the node is marked as complete
**And** the completion persists via `POST /api/nodes/:id/complete` with optimistic update
**And** the node visually indicates completion (e.g., strikethrough or muted styling)

**Given** a parent node has multiple children
**When** the user completes the last incomplete child
**Then** the parent node automatically completes (cascade up)
**And** the cascade continues up the hierarchy — if all efforts in a project are complete, the project completes

**Given** a parent node is marked complete (all children complete)
**When** the user reopens any completed child
**Then** the parent node automatically reopens (cascade reopen)
**And** the cascade continues up — all ancestors that were auto-completed reopen

**Given** a completed node exists
**When** the user clicks the checkbox again
**Then** the node is reopened
**And** if the node has children, only the node itself reopens — children remain in their current state

**And** cascade completion logic is implemented in the server service layer (`node.service.ts`), not in the database
**And** the API response from completion toggle includes all affected node IDs so the client can update the cache
**And** TanStack Query cache is invalidated/updated for all affected nodes after cascade
**And** completion toggle responds in under 200ms including cascade processing (NFR1)
**And** `prefers-reduced-motion` disables any cascade visual transition; otherwise a subtle 200ms opacity transition is used

### Story 3.2: Progress Indicators

As a user,
I want to see completion progress on parent nodes,
So that I can quickly assess how much work is done at every level of the hierarchy.

**Acceptance Criteria:**

**Given** a parent node has children (effort with tasks, task with subtasks, project with efforts)
**When** the tree renders
**Then** the parent node displays a progress indicator showing completed count vs total (e.g., "2/4")
**And** a small progress bar visually represents the completion ratio

**Given** a child node's completion status changes
**When** the tree updates
**Then** all ancestor progress indicators update immediately to reflect the new counts
**And** progress updates are derived from the cached data — no additional API call needed

**Given** a parent node has zero children
**When** the tree renders
**Then** no progress indicator is displayed on that node

**And** progress indicators do not add visual clutter — they are subtle and secondary to the node title
**And** progress counts are accurate at all times — they never show stale data after cascade operations

## Epic 4: Quick Capture & Inbox

User can capture thoughts without leaving current context via the capture bar, and later organize inbox items into the hierarchy using move-to or drag-and-drop.

### Story 4.1: Quick Capture Bar

As a user,
I want to type a thought into a persistent capture bar and save it to the inbox instantly,
So that I can capture ideas without breaking my current workflow.

**Acceptance Criteria:**

**Given** the app is open on any view (tree, inbox, or any project)
**When** the user clicks the capture bar at the top of the screen
**Then** the capture bar receives focus and is ready for text input

**Given** the capture bar has text entered
**When** the user presses Enter
**Then** the text is saved as a new inbox item via `POST /api/inbox`
**And** the capture bar clears immediately
**And** the item appears in the inbox (if inbox view is open, it updates in real-time)
**And** the user remains on their current view — no navigation occurs

**Given** the capture bar is empty
**When** the user presses Enter
**Then** nothing happens — no empty items are created

**And** the `inbox_items` table is created with columns: `id` (UUID), `text` (string), `created_at` (timestamp)
**And** Zod schemas `createInboxItemSchema` and `promoteInboxItemSchema` are defined in the shared package
**And** `POST /api/inbox` creates a new inbox item with validated input
**And** `GET /api/inbox` returns all inbox items sorted by `created_at` descending
**And** `DELETE /api/inbox/:id` deletes an inbox item
**And** capture save-to-inbox completes in under 100ms (NFR3)
**And** the capture bar has `aria-label="Quick capture"` and is keyboard accessible
**And** the capture bar is always visible regardless of scroll position

### Story 4.2: Inbox View & Organization

As a user,
I want to view my captured thoughts and organize them into my project hierarchy,
So that I can process captured ideas on my own schedule and keep my inbox at zero.

**Acceptance Criteria:**

**Given** the user clicks "Inbox" in the sidebar
**When** the inbox view loads
**Then** all inbox items are displayed in a list sorted by most recent first
**And** each item shows its text and creation timestamp

**Given** an inbox item is displayed
**When** the user clicks "Move To" on the item
**Then** a tree-based destination picker appears showing the full project hierarchy
**And** the user can navigate the tree to select a target parent (effort or task)
**And** the inbox item is promoted to a real node at the destination via `POST /api/inbox/:id/promote`
**And** the item is removed from the inbox after successful promotion
**And** the new node appears in the tree at the selected location

**Given** the inbox view is open alongside the tree
**When** the user drags an inbox item into the tree
**Then** the item is promoted to a node at the drop location
**And** hierarchy rules are enforced (items can become tasks under efforts, or subtasks under tasks)
**And** invalid drop targets are visually indicated

**Given** an inbox item exists
**When** the user deletes it
**Then** the item is removed from the inbox via `DELETE /api/inbox/:id`

**And** the inbox view uses TanStack Query to fetch and cache inbox items
**And** optimistic updates are used for promote and delete operations
**And** the inbox section in the sidebar shows the count of pending inbox items
**And** ARIA roles are applied to the inbox list (NFR9)

## Epic 5: Search & Discovery

User can search across all projects, nodes, and markdown content, view contextual results, and navigate directly to any item in its tree context.

### Story 5.1: Global Search

As a user,
I want to search across all my projects, nodes, and markdown content,
So that I can quickly find any item regardless of where it lives in the hierarchy.

**Acceptance Criteria:**

**Given** the user is on any view in the app
**When** the user triggers the search (e.g., Ctrl+K or clicking a search icon)
**Then** a command palette dialog opens (Shadcn Command component) with a text input focused

**Given** the search dialog is open
**When** the user types a query
**Then** matching results are returned from `GET /api/search?q={query}`
**And** results include matches from node titles and markdown body content across all projects
**And** each result displays: the node title, its hierarchy path (e.g., "Project > Effort > Task"), and a snippet of matching content with the search term highlighted
**And** results are ranked by relevance

**Given** search results are displayed
**When** the user selects a result (click or Enter)
**Then** the search dialog closes
**And** the corresponding project opens in the sidebar/tabs if not already open
**And** the tree navigates to the result node — expanding parent nodes as needed
**And** the node is selected and focused in the tree
**And** if the result is a task or subtask, it opens in the detail panel

**Given** the search dialog is open
**When** the user presses Escape
**Then** the search dialog closes and focus returns to the previous location

**And** the server implements search via `GET /api/search?q=` using SQLite LIKE or FTS (implementation detail deferred to dev)
**And** Zod schema `searchQuerySchema` is defined in the shared package
**And** search returns results within 500ms across all projects and content (NFR4)
**And** the search dialog has proper ARIA roles (`role="dialog"`, `role="combobox"`)
**And** keyboard navigation works within results (arrow keys to select, Enter to confirm)
**And** keyboard shortcuts for search do not conflict with browser defaults

## Epic 6: Session Resume & Continuity

App remembers and restores the user's exact place across sessions — last active project, task, scroll position, and open tabs visible immediately on launch.

### Story 6.1: Session State Persistence & Restore

As a user,
I want the app to remember exactly where I left off and restore my session on launch,
So that I can resume work immediately without navigating or remembering my last context.

**Acceptance Criteria:**

**Given** the user is working in the app
**When** any of the following state changes occur: active project changes, active node changes, detail panel tabs open/close, scroll position changes, sidebar collapsed state changes
**Then** the session state is persisted via `PUT /api/session` with debounced updates
**And** the `session_state` table stores: `active_project_id`, `active_node_id`, `scroll_position`, `open_tab_ids` (JSON array), `sidebar_collapsed`, `sidebar_width`
**And** Zod schema `sessionStateSchema` is defined in the shared package

**Given** the app is closed and reopened (browser tab closed and revisited, or browser restart)
**When** the app launches
**Then** the session state is fetched via `GET /api/session`
**And** the last active project is opened in the sidebar and tab bar
**And** the tree is expanded to reveal the last active node
**And** the last active task/subtask is selected and opened in the detail panel (if one was open)
**And** all previously open tabs are restored in the detail panel
**And** the tree scroll position is restored to the saved position
**And** the sidebar width and collapsed state are restored

**Given** this is the first time the app is launched (no session state exists)
**When** the app loads
**Then** the app displays the default layout with an empty content panel and sidebar showing any existing projects
**And** no errors occur from missing session state

**And** app launch to fully restored session state completes in under 2 seconds (NFR6)
**And** the `useSessionRestore` hook coordinates data fetching (TanStack Query) and UI restoration (Zustand stores)
**And** session state updates are debounced to avoid excessive API calls during rapid navigation
**And** no data loss occurs on browser refresh or unexpected termination (NFR14)
