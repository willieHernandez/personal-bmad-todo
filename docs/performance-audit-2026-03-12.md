# Performance & Quality Audit Report

**Date:** 2026-03-12
**URL:** http://localhost:5173
**Tool:** Chrome DevTools MCP (Lighthouse, Performance Trace, Network, Memory)
**Device:** Desktop

---

## Initial Results

### Core Web Vitals

| Metric | Value | Rating |
|--------|-------|--------|
| LCP | 178 ms | Excellent (threshold: < 2500 ms) |
| CLS | 0.00 | Excellent (no layout shifts) |
| TTFB | 3 ms | Excellent |

LCP element was a text paragraph. 98.5% of LCP time was render delay (176 ms), with TTFB accounting for only 1.5% (3 ms).

### Lighthouse Scores (Before)

| Category | Score |
|----------|-------|
| Accessibility | 87 |
| Best Practices | 100 |
| SEO | 91 |

### Network

- **1 API call** on initial load: `GET /api/nodes` (200, 451 bytes)
- **Critical path latency:** 158 ms through the module dependency chain
- **Third-party:** Google Fonts only (41.4 kB transfer, no main thread impact)

### Console

- Zero errors or warnings

### Memory

- Heap snapshot: 24 MB (reasonable for a React SPA with TipTap, dnd-kit, and virtual scrolling)

---

## Issues Identified

### 1. ARIA Role Hierarchy (Accessibility)

**Severity:** High
**Audit:** "Elements with an ARIA role that require children to contain a specific role are missing some or all of those required children."

**Root cause:** The `role="tablist"` container in `project-tabs.tsx` had two problems:
- `role="tab"` was placed on a wrapper `<div>` instead of the interactive `<button>` element
- The "Create new project" button (not a tab) was nested inside the `tablist`, making it an invalid child

### 2. Insufficient Color Contrast (Accessibility)

**Severity:** High
**Audit:** "Background and foreground colors do not have a sufficient contrast ratio."

**Root cause:** The `--app-text-muted` CSS variable was set to `#A3A3A3`, which produced a contrast ratio of only 3.5:1 against the `#FAFAFA` background. WCAG AA requires a minimum of 4.5:1 for normal-sized text. This color was used for sidebar section labels, empty state messages, and the capture bar placeholder.

### 3. Missing Main Landmark (Accessibility)

**Severity:** Medium
**Audit:** "Document does not have a main landmark."

**Root cause:** The root layout in `__root.tsx` used only generic `<div>` elements. Screen reader users had no `<main>` landmark to navigate to the primary content area.

### 4. Missing Meta Description (SEO)

**Severity:** Medium
**Audit:** "Document does not have a meta description."

**Root cause:** `index.html` had a minimal `<head>` with only charset and viewport meta tags. The page title was also set to the generic placeholder "client".

---

## Fixes Applied

### Fix 1: ARIA Tab Structure (`project-tabs.tsx`)

- Moved `role="tab"` and `aria-selected` from the wrapper `<div>` onto the `<button>` element
- Wrapped only the tab buttons in the `role="tablist"` container
- Moved the "Create new project" button outside the tablist
- Added `aria-label="Open projects"` to the tablist

### Fix 2: Color Contrast (`styles.css`)

- Changed `--app-text-muted` from `#A3A3A3` to `#6B6B6B`
- New contrast ratio: 4.7:1 against `#FAFAFA` (passes WCAG AA)

### Fix 3: Main Landmark (`__root.tsx`)

- Wrapped the content panel and outlet with a `<main>` element

### Fix 4: Meta Description & Title (`index.html`)

- Added `<meta name="description" content="A hierarchical todo app for managing projects, efforts, tasks, and subtasks.">`
- Updated `<title>` from "client" to "Todo - BMAD Style"

### Additional: Sidebar Nav Label (`sidebar.tsx`)

- Added `aria-label="Project sidebar"` to the `<nav>` element for screen reader clarity

---

## Final Results

### Lighthouse Scores (After)

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Accessibility | 87 | 100 | +13 |
| Best Practices | 100 | 100 | -- |
| SEO | 91 | 100 | +9 |

### Audit Summary

- **Passed:** 45
- **Failed:** 0

### Performance (Unchanged)

| Metric | Value |
|--------|-------|
| LCP | 178 ms |
| CLS | 0.00 |
| TTFB | 3 ms |
| Heap Size | 24 MB |
| API Calls (initial load) | 1 (451 bytes) |
| Console Errors | 0 |

---

## Files Modified

| File | Change |
|------|--------|
| `packages/client/index.html` | Added meta description, updated title |
| `packages/client/src/routes/__root.tsx` | Added `<main>` landmark |
| `packages/client/src/styles.css` | Darkened muted text color for contrast compliance |
| `packages/client/src/components/features/project-tabs/project-tabs.tsx` | Fixed ARIA tablist/tab structure |
| `packages/client/src/components/features/sidebar/sidebar.tsx` | Added nav aria-label |
