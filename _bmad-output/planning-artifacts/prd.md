---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: [brainstorming-session-2026-03-06-180000.md]
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
  projectContext: 0
classification:
  projectType: web_app_spa
  domain: general_personal_productivity
  complexity: low
  projectContext: greenfield
  techStackNotes: "Node.js, React, TanStack, Fastify"
---

# Product Requirements Document - todo-bmad-style

**Author:** Willie
**Date:** 2026-03-06

## Executive Summary

A personal task management web application built to solve a single problem: existing project management tools are too complex for individual use. Most productivity tools accumulate features for teams, enterprises, and edge cases — creating cognitive overhead for solo users who need to track and complete work across multiple projects. This app provides a fixed four-level hierarchy (Project > Effort > Task > Subtask) with markdown note bodies at every level, tree-first navigation modeled on file manager conventions, and an inbox-based capture workflow. The target user is a single person managing multiple personal projects who values clarity and speed over configurability.

### What Makes This Special

The product is defined by what it excludes. No team permissions, no Gantt charts, no integrations marketplace, no labels, no priorities, no custom fields. Every UI element must serve tasks, notes, or subtasks — nothing else earns screen space. The core insight is that complexity in productivity tools isn't a feature, it's a tax. Three concepts set this apart: task-as-document (every node is both an action item and a writing surface), bidirectional cascade completion (status flows up and down the hierarchy automatically), and a file-manager interaction model (arrow keys, Enter to rename, familiar conventions instead of invented ones). The feature set is intentionally closed — built to stay minimal, not waiting to expand.

## Project Classification

- **Type:** Single-page web application (React + TanStack frontend, Fastify backend, Node.js runtime)
- **Domain:** Personal productivity / task management
- **Complexity:** Low — single user, no regulatory concerns, no multi-tenant requirements
- **Context:** Greenfield — new product built from scratch

## Success Criteria

### User Success

- Open the app and resume exactly where you left off — the last task you were working on, with its context immediately visible. Zero navigation required to re-enter flow.
- Capture a new thought via the inbox in under 3 seconds — click, type, done. No decisions about where it goes yet.
- Navigate from one project's task to another project's task within 2-3 clicks using the recency-sorted sidebar and tree.
- Plan work naturally: select a task, break it into subtasks, write markdown notes for context — all in one place without switching views or tools.
- Never feel like the tool is in the way. The interface should disappear — no feature discovery, no configuration decisions, no "how do I do this?" moments.

### Business Success

- This is a personal tool, not a commercial product. Business success = the builder (Willie) uses it daily as the primary project management tool, replacing the current mix of Notion, Super Productivity, Todoist, and notepads.
- Consolidation: one tool replaces many. If multiple tools are still needed alongside this app, it hasn't succeeded.

### Technical Success

- Offline-first data storage — the app works without a network connection. Data lives locally in SQLite.
- Sub-second response for all tree operations: expand, collapse, navigate, complete, reorder.
- Markdown rendering is instant and accurate at every hierarchy level.
- Resume state persists reliably across app restarts — last active project, task, and scroll position.

### Measurable Outcomes

- Daily personal use within one week of MVP completion.
- All existing project tracking migrated from current tools within two weeks.
- No return to previous tools for task management or project note-taking.

## User Journeys

### Journey 1: Resume & Work

Willie opens the app on a Monday morning. He was deep in a side project on Friday — building out a REST API for a personal finance tracker. The app loads and drops him right back where he left off: the "Implement transaction endpoints" task under the API Effort. The markdown body is visible immediately — his notes from Friday listing the remaining edge cases for the POST route and a curl example he'd saved. No clicking, no searching, no remembering. He reads the notes, opens his editor, and starts coding. Ten minutes later the task is done. He clicks the checkbox. The subtasks above it are already complete, so the parent task auto-completes. The Effort's progress ticks forward. He clicks the next task in the tree — "Add input validation" — reads the notes he wrote when he planned it, and keeps moving.

**Emotional arc:** Relief (didn't lose context over the weekend) → Flow (zero friction between tasks) → Satisfaction (visible progress without effort)

**Capabilities revealed:** Resume state persistence, markdown rendering in detail panel, cascade completion, progress indication, tree navigation

### Journey 2: Capture & Organize

Willie is working on his finance tracker when he suddenly remembers he needs to update the README for a completely different project — his portfolio site. He doesn't want to leave his current context. He clicks the quick capture bar at the top, types "Update portfolio README with new project screenshots," and hits Enter. Done — it's in the inbox. He doesn't think about it again. Two hours later, he finishes his current work session and clicks Inbox in the sidebar. Three items are sitting there. He clicks the portfolio README item, hits "Move To," navigates the tree to his Portfolio project > Maintenance effort, and drops it in as a new task. The other two items get sorted the same way. Inbox is empty. He closes the app.

**Emotional arc:** No interruption (thought captured without breaking flow) → Control (inbox processed on his own schedule) → Clean slate (inbox zero)

**Capabilities revealed:** Quick capture bar, context-independent capture, inbox as first-class sidebar item, move-to action, inbox-to-task promotion, tree-based destination selection

### Journey 3: Plan a New Project

Willie has a new idea — he wants to build a CLI tool that generates boilerplate for his common project structures. He clicks the "+" in the sidebar to create a new project: "Scaffold CLI." It appears at the top of the Recent section. He clicks into it and starts building the hierarchy. First Effort: "Core CLI Framework." Under that, he creates tasks: "Parse command-line arguments," "Define template schema," "Build file generator." He clicks into "Define template schema" and opens the markdown body. He writes out his thinking — what a template file should look like, what variables to support, some example YAML structures. Then he creates two subtasks under it: "Design schema format" and "Write schema validator." Each gets a short markdown note about the approach. He collapses the first Effort and creates a second: "Templates." More tasks, more notes. In twenty minutes he has a complete project plan — structured, annotated, and ready to execute.

**Emotional arc:** Excitement (new idea gets immediate structure) → Clarity (thinking becomes organized as he writes) → Confidence (complete plan ready to execute)

**Capabilities revealed:** Project creation, effort/task/subtask creation, inline tree editing, markdown body editing, tree collapse/expand, hierarchy building top-down

### Journey 4: Complete & Progress

Willie has been working on the Scaffold CLI for a week. The "Core CLI Framework" Effort has four tasks, each with subtasks. He completes the last subtask under "Write schema validator" — checkbox clicked. The parent task "Define template schema" auto-completes because all its subtasks are done. The Effort progress shows "3/4" now. He knocks out the last task. All four done — the Effort auto-completes. He sees it visually: the entire branch is complete. He moves to the "Templates" Effort and starts working. Later, while testing, he realizes the schema validator needs a fix. He navigates back to the completed task, opens it, and reopens one subtask. The parent task immediately reopens. The Effort reopens. The tree is honest — nothing claims to be done when it isn't. He fixes the issue, re-completes the subtask, and everything cascades back to complete.

**Emotional arc:** Momentum (watching completion cascade up) → Trust (the tree never lies about status) → Satisfaction (real progress is visible and earned)

**Capabilities revealed:** Bidirectional cascade completion, cascade reopening, progress indicators, tree navigation to completed items, status honesty

### Journey Requirements Summary

| Capability | J1: Resume | J2: Capture | J3: Plan | J4: Complete |
|---|---|---|---|---|
| Resume state persistence | X | | | |
| Quick capture bar | | X | | |
| Context-independent inbox | | X | | |
| Move-to / inbox promotion | | X | | |
| Project/effort/task/subtask CRUD | | | X | |
| Markdown body editing | X | | X | |
| Tree navigation & collapse | X | | X | X |
| Cascade completion (up) | X | | | X |
| Cascade reopening (down) | | | | X |
| Progress indicators | X | | | X |
| Recency-sorted sidebar | X | | X | |
| Detail panel with tabs | X | | | |
| File-manager keyboard nav | X | | X | X |
| Breadcrumb navigation | X | | | X |

## Web App Specific Requirements

### Project-Type Overview

Single-page application running entirely on the user's local machine. The React + TanStack frontend communicates with a local Fastify API server. No cloud infrastructure, no remote deployment, no CDN. The app is a personal development tool accessed via localhost.

### Technical Architecture Considerations

- **Frontend:** React SPA with TanStack (Router, Query) — client-side rendering only
- **Backend:** Fastify API server running locally on the user's machine
- **Database:** SQLite — file-based, zero-configuration, single-user optimized
- **Browser Support:** Modern evergreen browsers only (Chrome, Firefox, Safari, Edge)
- **SEO:** Not applicable — personal tool, not publicly accessible
- **Real-time:** Not needed — single user, no sync requirements
- **Network:** Offline-first by design. No external API calls, no cloud dependencies. All data stays local.

### Implementation Considerations

- Application runs as two processes: Fastify server + browser client
- SQLite database file lives in a known local directory
- TanStack Query manages server state between frontend and local API
- No authentication required — single user on localhost
- No CORS complexity — same-machine communication
- Resume state (last active project/task) persisted in SQLite

## Product Scope & Phased Development

### MVP Strategy

**Approach:** Problem-solving MVP — deliver the complete core loop (find → read → work → plan → break down → write → work) with zero friction. The MVP must fully replace Willie's current toolset (Notion, Super Productivity, Todoist, notepads) from day one.

**Resource Requirements:** Solo developer (Willie), full-stack JavaScript. Single codebase, single machine, no deployment complexity.

**Core User Journeys Supported:** All four (Resume & Work, Capture & Organize, Plan a New Project, Complete & Progress)

### MVP Feature Set (Phase 1)

- Four-level hierarchy: Project > Effort > Task > Subtask
- Tree-first navigation with expand/collapse and state memory
- Markdown body at every node level
- Bidirectional cascade completion (complete up, reopen down)
- Quick capture bar sending to universal inbox
- Inbox organization view with move-to functionality
- Three-zone layout: capture bar (top), project sidebar (left), content panel (right)
- Recency-sorted sidebar with collapsible sections (Inbox, Pinned, Recent, On Hold)
- Resume feature: app opens to last active task with context visible
- Detail panel with tabbed view for multiple open tasks
- File-manager keyboard interactions (arrow keys, Enter to rename, Delete to remove)
- Offline-first local SQLite storage
- Breadcrumb navigation
- Global search across all projects and content
- Drag-and-drop reordering in tree and inbox
- Progress indicators on parent items (e.g., "2/4" with progress bar)

### Phase 2: Growth (Post-MVP)

- Cut/paste (Ctrl+X/V) for moving nodes in the tree
- Pinning/unpinning projects
- On Hold project status with collapsible section

### Phase 3: Vision (Future)

- Data export/import for backup and portability
- Optional sync across devices (while maintaining offline-first)
- Keyboard shortcut customization
- Theme support (light/dark)

### Risk Mitigation

**Technical Risks:** Tree rendering performance with large hierarchies and drag-and-drop. Mitigation: virtualize the tree for projects with 100+ nodes; test drag-and-drop with realistic data volumes early.

**Market Risks:** Not applicable — personal tool, audience of one. The only risk is building something Willie doesn't actually use daily. Mitigation: build the resume + capture loop first, use it immediately, iterate.

**Resource Risks:** Solo developer scope. If velocity stalls, deprioritize progress indicators first — they're visual polish, not core workflow.

## Functional Requirements

### Hierarchy Management

- FR1: User can create a new project with a title
- FR2: User can create efforts within a project
- FR3: User can create tasks within an effort
- FR4: User can create subtasks within a task (one level of nesting only)
- FR5: User can rename any node (project, effort, task, subtask) inline in the tree
- FR6: User can delete any node and its descendants from the hierarchy
- FR7: User can reorder nodes within their parent via drag-and-drop
- FR8: User can move nodes between parents via drag-and-drop

### Completion & Status

- FR9: User can mark any node as complete
- FR10: System automatically completes a parent node when all its children are complete
- FR11: System automatically reopens a parent node when any completed child is reopened
- FR12: User can reopen a completed node
- FR13: System displays progress indicators on parent nodes showing completion count (e.g., "2/4")

### Markdown & Notes

- FR14: User can view and edit a markdown body on any node (project, effort, task, subtask)
- FR15: System renders markdown content with standard formatting (headings, lists, code blocks, links, emphasis)
- FR16: Effort markdown is visible inline in the tree view
- FR17: Task and subtask markdown is visible only in the detail panel

### Tree Navigation

- FR18: User can expand and collapse any node in the tree
- FR19: System remembers expand/collapse state per project across sessions
- FR20: User can navigate the tree using keyboard arrow keys
- FR21: User can rename a node by pressing Enter while focused in the tree
- FR22: User can delete a node by pressing Delete while focused in the tree
- FR23: User can select a task or subtask to open it in the detail panel

### Layout & Sidebar

- FR24: System displays a three-zone layout: quick capture bar (top), project sidebar (left), content panel (right)
- FR25: Sidebar lists projects sorted by most recently opened
- FR26: Sidebar organizes items into sections: Inbox, Pinned, Recent, On Hold
- FR27: User can select a project in the sidebar to display its tree in the content panel
- FR28: Sidebar sections are collapsible

### Detail Panel

- FR29: User can open a task or subtask in a detail panel (slide-over from tree view)
- FR30: User can have multiple tasks open as tabs in the detail panel
- FR31: User can switch between open tabs without losing state
- FR32: User can close the detail panel using a back button or Escape key
- FR33: System displays a clickable breadcrumb trail showing the node's position in the hierarchy

### Quick Capture & Inbox

- FR34: User can type a thought into a persistent quick capture bar and save it
- FR35: Captured items always go to the inbox regardless of current view context
- FR36: User can view all inbox items in a dedicated inbox view
- FR37: User can move an inbox item to a specific location in the hierarchy using a "Move To" action
- FR38: User can move inbox items to the hierarchy via drag-and-drop into the tree
- FR39: Inbox items become real nodes (task or subtask) at the destination

### Search

- FR40: User can search across all projects, nodes, and markdown content
- FR41: System returns matching results with enough context to identify the right item
- FR42: User can navigate directly to a search result in its tree context

### Session & Resume

- FR43: System persists the user's last active project, task, and scroll position
- FR44: On app launch, system restores the user's last session state — opening directly to the last active task with its content visible

### Data Persistence

- FR45: System stores all data in a local SQLite database
- FR46: System operates fully offline with no external network dependencies
- FR47: All CRUD operations persist immediately to the local database

## Non-Functional Requirements

### Performance

- All tree operations (expand, collapse, select, reorder, complete) respond in under 200ms
- Markdown rendering completes in under 300ms for typical note sizes
- Quick capture save-to-inbox completes in under 100ms — no perceptible delay
- Search returns results within 500ms across all projects and content
- Drag-and-drop provides real-time visual feedback with no frame drops
- App launch to resumed session state in under 2 seconds
- Tree remains responsive with projects containing 200+ nodes

### Accessibility

- Full keyboard navigation for all tree operations matching file-manager conventions
- ARIA roles applied to tree view, detail panel, tabs, breadcrumbs, and inbox
- Focus management maintained during panel transitions (tree ↔ detail)
- Visible focus indicators on all interactive elements

### Data Integrity & Reliability

- All write operations are atomic — no partial saves on crash or unexpected shutdown
- SQLite database uses WAL mode for crash resilience
- No data loss on app restart, browser refresh, or process termination
- Database file remains portable — a single file that can be copied for manual backup
