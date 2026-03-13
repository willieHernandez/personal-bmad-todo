# Application Performance Report

**Date:** 2026-03-12
**URL:** http://localhost:5173
**Tool:** Chrome DevTools MCP (Performance Trace, Network Analysis, Script Evaluation)
**Environment:** Vite dev server (unbundled ESM modules)

---

## Executive Summary

The application performs excellently under normal conditions with sub-200ms LCP and zero layout shifts. However, the deeply chained module dependency tree (9 levels deep) and 81 unbundled network requests in dev mode reveal a structural vulnerability: on constrained networks (Fast 3G), LCP degrades to 7+ seconds. While the production build (with bundling) will mitigate most of this, several issues warrant attention.

---

## Core Web Vitals

### Normal Conditions (No Throttling)

| Metric | Value | Threshold | Rating |
|--------|-------|-----------|--------|
| LCP | 179 ms | < 2,500 ms | Excellent |
| CLS | 0.00 | < 0.1 | Excellent |
| TTFB | 3 ms | < 800 ms | Excellent |

### 4x CPU Throttle

| Metric | Value | Rating |
|--------|-------|--------|
| LCP | 190 ms | Excellent |
| CLS | 0.00 | Excellent |
| TTFB | 7 ms | Excellent |

### Fast 3G Network Throttle

| Metric | Value | Rating |
|--------|-------|--------|
| LCP | 7,062 ms | Poor |
| CLS | 0.00 | Excellent |
| TTFB | 4 ms | Excellent |

---

## Navigation Timing

| Event | Time |
|-------|------|
| Response End | 3 ms |
| DOM Interactive | 12 ms |
| DOM Content Loaded | 92 ms |
| Load Event | 108 ms |

---

## Network Analysis

### Overview

| Metric | Value |
|--------|-------|
| Total Requests | 81 |
| Total Transfer Size | ~13 KB (dev mode, most cached/304) |
| API Calls | 1 (`GET /api/nodes`, 451 bytes) |
| Third-Party Requests | 2 (Google Fonts CSS + woff2) |

### Request Breakdown

| Type | Count | Notes |
|------|-------|-------|
| Application modules (.tsx/.ts) | 39 | Unbundled ESM in dev mode |
| Vendor chunks (.js) | 33 | Vite pre-bundled deps |
| CSS | 1 | Styles |
| Font (Google) | 2 | CSS + woff2 file |
| API | 1 | `/api/nodes` |
| Dev tooling | 5 | Vite client, HMR, react-refresh, SSE |

### Slowest Resources (Normal Conditions)

All resources loaded in under 5ms individually — no single resource is a bottleneck. The issue is chain depth, not individual request size.

---

## Issues Identified

### Issue 1: Deep Module Dependency Chain (9 Levels)

**Severity:** Medium (dev) / Low (production)
**Impact:** Primary cause of degraded LCP on slow networks

The critical request chain is 9 levels deep:

```
index.html
 └─ main.tsx
     └─ routeTree.gen.ts
         └─ __root.tsx
             └─ sidebar.tsx
                 └─ sidebar-section.tsx
                     └─ collapsible.tsx
                         └─ @base-ui/collapsible
                             └─ /api/nodes (165ms on normal, 7,601ms on 3G)
```

Each level must complete before the next can begin. On Fast 3G, each hop adds ~575ms of latency, turning a 165ms chain into a 7.6 second waterfall.

**Production impact:** Vite's build step bundles modules, collapsing the chain. However, code-split chunks and the API call will still form a chain. The route-level split (`index.tsx?tsr-split=component`) loaded at 112ms on normal conditions — this is a secondary chain worth monitoring.

**Recommendations:**
- Prefetch the `/api/nodes` call earlier (e.g., in the route loader) rather than waiting for the component tree to mount
- Consider `<link rel="preload">` for critical route chunks in production
- Evaluate whether the route-level code split for `index.tsx` is beneficial given the small app size

---

### Issue 2: Eager Loading of Non-Visible Components

**Severity:** Low
**Impact:** Unnecessary bytes loaded on initial render

The following heavy dependencies are loaded on every page load regardless of whether they're used:

| Dependency | Purpose | Loaded From |
|------------|---------|-------------|
| `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/markdown` | Rich text editor | `inline-effort-markdown.tsx` |
| `@tiptap/extension-task-list` + `task-item` + `placeholder` | Task list editor | `markdown-editor.tsx` |
| `@dnd-kit/core` | Drag and drop | `tree-view.tsx` |
| `@base-ui/react/scroll-area` (3 chunks) | Scroll area | `scroll-area.tsx` |

The TipTap editor suite is the heaviest dependency group and is loaded even when no node is selected for editing.

**Recommendations:**
- Lazy-load TipTap editor components (both `InlineEffortMarkdown` and `MarkdownEditor`) with `React.lazy()` — they're only needed when content is being viewed/edited
- Consider lazy-loading `@dnd-kit/core` since drag-and-drop is a secondary interaction

---

### Issue 3: Google Fonts as External Dependency

**Severity:** Low
**Impact:** 41.4 KB transfer, 2 extra requests to external origin, potential FOUT

The JetBrains Mono font is loaded from Google Fonts via a CSS import in `styles.css`:
```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap");
```

This creates a 2-hop chain to an external origin:
1. Fetch CSS from `fonts.googleapis.com` (adds DNS + TLS handshake)
2. Fetch woff2 from `fonts.gstatic.com` (another origin, another handshake)

On Fast 3G, the font didn't complete loading until 6,430ms into the page load.

**Recommendations:**
- Self-host the font to eliminate external network dependency and reduce latency
- Add `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` to `index.html` if keeping Google Fonts
- Consider subsetting the font (only wght 400+600 may be needed vs all four weights)

---

### Issue 4: No Preconnect Hints

**Severity:** Low
**Impact:** Extra DNS/TLS time on first connection to external origins

The trace flagged that no origins were preconnected. When loading from Google Fonts (or any future external API), the browser must perform DNS lookup and TLS handshake on first contact.

**Recommendation:** Add preconnect hints for known external origins in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

### Issue 5: Layout Shift (Negligible)

**Severity:** Informational
**Impact:** CLS score 0.0015 (well within "Good" threshold of 0.1)

A single tiny layout shift (score: 0.0015) was detected at ~224ms. No root cause was identified — likely a sub-pixel rendering adjustment during hydration. No action needed.

---

## Memory

| Metric | Value |
|--------|-------|
| Heap Snapshot | 24 MB |
| Console Errors | 0 |
| Console Warnings | 0 |

The heap size is reasonable for the loaded dependencies (React, TanStack Router/Query, TipTap, dnd-kit, Zustand, virtual scrolling).

---

## Summary Table

| Issue | Severity | Environment | Recommendation |
|-------|----------|-------------|----------------|
| Deep dependency chain (9 levels) | Medium | Dev + Prod | Prefetch API in route loader; preload chunks |
| Eager-loaded TipTap/dnd-kit | Low | Dev + Prod | Lazy-load heavy editor and DnD components |
| External Google Fonts | Low | Dev + Prod | Self-host or add preconnect hints |
| No preconnect hints | Low | Dev + Prod | Add preconnect for Google Fonts origins |
| Tiny layout shift | Info | -- | No action needed |

---

## Production Considerations

This analysis was run against the **Vite dev server**, which serves unbundled ES modules. In production:

- The 81 individual module requests will be bundled into a few optimized chunks
- The 9-level dependency chain will collapse to 2-3 levels (HTML → JS bundle → API)
- Transfer sizes will be larger per-request but far fewer round trips
- The key issues that **will persist in production** are:
  - API call blocked behind JS execution (Issue 1)
  - Eager loading of TipTap editor bytes (Issue 2)
  - Google Fonts external dependency (Issue 3)

A production build trace is recommended for a complete picture.
