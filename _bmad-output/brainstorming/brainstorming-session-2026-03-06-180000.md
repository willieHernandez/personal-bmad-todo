---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Personal multi-project planning and organization app with hierarchical structure (Projects > Efforts > Tasks with 2-level nesting)'
session_goals: 'Broad exploration of features, UX patterns, data models, workflows, and anything that makes managing multiple projects intuitive and effective'
selected_approach: 'ai-recommended'
techniques_used: ['Mind Mapping', 'SCAMPER Method']
ideas_generated: 35
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Willie
**Date:** 2026-03-06

## Session Overview

**Topic:** Personal multi-project planning and organization app with hierarchical structure: Projects > Efforts > Tasks (2-level nesting)
**Goals:** Broad exploration — features, UX, data model, workflows, tech choices, and anything that makes multi-project management intuitive and effective

### Context Guidance

_No external context file provided — fresh ideation session._

### Session Setup

_Willie wants to build a personal project management tool with a clear hierarchy: Projects contain Efforts, and Efforts contain Tasks that can nest two levels deep. The brainstorming will cover all dimensions broadly — UI/UX, features, architecture, workflows, and more — before narrowing down._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Personal multi-project planning app with focus on broad exploration

**Recommended Techniques:**

- **Mind Mapping:** Rapidly branch out every dimension from the core hierarchy — features, views, interactions, data concerns
- **SCAMPER Method:** Stress-test assumptions through 7 lenses — Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse
- **Cross-Pollination:** (Not used — session concluded after SCAMPER with strong results)

**AI Rationale:** Mind Mapping was chosen to go broad first given Willie's clear hierarchical mental model. SCAMPER was selected to pressure-test the ideas generated. Cross-Pollination was planned for wild-card expansion but wasn't needed.

## Technique Execution Results

**Mind Mapping:**

- **Interactive Focus:** Personal Productivity (11 ideas) and Views & Navigation (14 ideas)
- **Key Breakthroughs:** Task-as-Document concept, anti-noise design philosophy, inbox-based capture workflow
- **Energy Level:** High — Willie had clear instincts and strong opinions, making facilitation fast and productive

**SCAMPER Method:**

- **Building on Previous:** Applied all 7 lenses to Mind Mapping output
- **New Insights:** File manager interaction model, tabbed detail panel, progress bars with counts, context-independent capture
- **Validated Decisions:** Tree view, dedicated inbox, markdown, top-down hierarchy, separate capture/search all survived stress-testing

**Overall Creative Journey:** The session revealed that Willie's instincts were already lean and well-considered. SCAMPER mostly validated existing ideas rather than generating new ones, which is a strong signal that the design is coherent. The biggest additions came from the Adapt lens (file manager conventions, tabbed panels).

## Idea Organization and Prioritization

### Theme 1: Design Philosophy
_The core principles that define what this app IS and ISN'T_

- **The Anti-Feature App** — Value comes from absence of features. No Gantt charts, no team permissions, no integrations marketplace.
- **Signal-to-Noise Ratio as Design Principle** — Every UI element must serve tasks, notes, or subtasks. Nothing else earns screen space.
- **Pure Task Hierarchy** — Everything in the tree is completable. Notes live inside markdown bodies, not alongside tasks.
- **Scope Stays Task Management** — Not a wiki, not a knowledge base. Built and optimized for tracking and completing work.
- **Feature Set Validated as Minimal** — Every feature survived elimination review. Nothing is redundant.

### Theme 2: Core Data Model
_The structure and behavior of the hierarchy_

- **Fixed 4-Level Hierarchy** — Project > Effort > Task > Subtask. No more, no less. Constraints create clarity.
- **Markdown at Every Level** — Every node has an expandable markdown body. The hierarchy is a nested knowledge structure organized by action.
- **Cascade Completion** — All subtasks done = parent auto-completes. Completion bubbles up.
- **Cascade Reopening** — Reopen a subtask, parent reopens. Status flows both directions. The tree is always honest.
- **Progress Indicators** — Parent items show progress bars with counts (e.g., "2/4"). Information, not decoration.

### Theme 3: Layout & Navigation
_How you see and move through the app_

- **Three-Zone Layout** — Quick Capture bar (top center), Project sidebar (left), Content panel (right).
- **Recency-Sorted Project Sidebar** — Last-opened project at top, auto-opens in right panel.
- **Sidebar Structure** — Inbox (top) > Pinned > Recent > On Hold (collapsible bottom section).
- **No Visual Clutter** — Projects show names only. No icons, colors, or badges.
- **Tree-First Navigation** — The tree is the default, primary view. Detail panel is secondary.
- **Collapsed State Memory** — The tree remembers your expand/collapse state per project.

### Theme 4: Tree Interaction
_How you work within the tree view_

- **Project Detail as Collapsible Tree** — Full Effort > Task > Subtask hierarchy visible and collapsible.
- **Selective Markdown Visibility** — Effort markdown visible inline in tree. Task/Subtask markdown only in detail panel.
- **Full Inline Tree Interactions** — Rename, complete, reorder, create, delete — all directly in the tree.
- **File Manager Interaction Model** — Arrow keys, Enter to rename, Delete to remove, Ctrl+X/V to cut/paste.

### Theme 5: Detail Panel
_The focused workspace for deep work_

- **Task Detail Panel (Slide-Over)** — Click a task, detail panel opens. Two modes: browse (tree) and focus (detail).
- **Tabbed Detail Panel** — Multiple tasks open as tabs. Switch between them without losing place.
- **Dual Exit** — Back button and Escape key both return to tree.
- **Breadcrumb Trail** — Clickable path showing hierarchy position. Jump to any ancestor.

### Theme 6: Capture & Organization
_Getting thoughts in and sorted_

- **Quick Capture Bar (Always Present)** — Persistent input at top center. Click, type, save.
- **Context-Independent Capture** — Always sends to inbox regardless of current view.
- **Universal Inbox** — Flat list of unsorted items. Process on your own schedule.
- **Inbox as Sidebar First-Class Item** — Inbox at top of sidebar, same click pattern as opening a project.
- **Inbox Organization View** — Right panel shows inbox items + tree for drag-and-drop sorting with search bar.
- **"Move To" Action** — Alternative to drag-and-drop for organizing inbox items.
- **Inbox-to-Task Promotion** — Inbox items become real tasks/subtasks at the destination.
- **Separate Capture and Search** — Quick capture and search are distinct UI elements.

### Theme 7: Validated Decisions (from SCAMPER)
_Assumptions that were stress-tested and confirmed_

- Tree view over outliners/document views
- Dedicated inbox over inline capture/floating pads
- Markdown over plain text/block editors/rich text
- Top-down hierarchy creation (no bottom-up assembly)
- Global search across all content
- Context-independent capture (always to inbox)
- Fixed 4-level hierarchy (no deeper, no shallower)

### Breakthrough Concepts

- **Task-as-Document** — Every task is both an action item AND a writing surface. Eliminates the need for a separate notes tool.
- **File Manager as Interaction Blueprint** — Borrow from the most universal UI humans already know instead of inventing new patterns.
- **Bidirectional Cascade** — Completion AND reopening flow through the hierarchy. Most tools only handle one direction.

## Session Summary and Insights

**Key Achievements:**

- 35 ideas generated across 7 organized themes
- Clear design philosophy established (anti-noise, minimal, task-focused)
- Complete layout and navigation model defined
- Interaction model grounded in familiar file manager conventions
- Data hierarchy with bidirectional cascade behaviors specified
- Capture-to-organization workflow (inbox pattern) fully designed

**Key Decisions Still Open:**

- Tech stack (web app, desktop app, framework)
- Data fields beyond title and markdown body (tags, priority, due dates)
- Workflow states beyond complete/incomplete
- Time and scheduling features
- Search UX (where global search lives, how results display)

**Recommended Next Steps:**

1. Create a Product Brief or PRD using BMAD workflows to formalize these ideas
2. Resolve open decisions during PRD creation
3. Explore the untouched mind map branches (Data & Structure, Workflow & Status, Time & Scheduling, Cross-Project Concerns) during product definition
