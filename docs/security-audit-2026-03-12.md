# Security Vulnerability Audit Report

**Date:** 2026-03-12
**Scope:** Full codebase (client, server, shared packages)
**Focus:** OWASP Top 10 vulnerabilities (XSS, SQL Injection, etc.)

---

## Executive Summary

The codebase demonstrates strong security fundamentals: parameterized queries via Drizzle ORM prevent SQL injection, React's default escaping prevents XSS, and no dangerous APIs (`eval`, `exec`, `dangerouslySetInnerHTML`) are used. However, several input validation gaps and missing server hardening were identified and remediated.

---

## Findings

### SECURE - No Action Required

| Category | Status | Details |
|----------|--------|---------|
| SQL Injection | SECURE | All queries use Drizzle ORM parameterized builders. No raw SQL string concatenation. |
| XSS | SECURE | React escapes all rendered content. No `dangerouslySetInnerHTML`. Tiptap editor handles markdown safely. |
| Command Injection | SECURE | No `exec`, `eval`, `spawn`, or `Function()` usage anywhere in codebase. |
| Path Traversal | SECURE | No user-controlled file paths. DB path from env vars with safe fallback. |
| Sensitive Data Exposure | SECURE | No secrets in client code. `.env` in `.gitignore`. No API keys hardcoded. |
| Insecure Storage | SECURE | Only theme preference (`light`/`dark`) stored in `localStorage`. |
| Open Redirects | SECURE | All navigation via TanStack Router with predefined routes. No user-controlled redirects. |
| Database Config | SECURE | WAL mode, foreign keys ON, proper transaction management with rollback. |

### REMEDIATED

| # | Finding | Severity | File | Remediation |
|---|---------|----------|------|-------------|
| 1 | No max length on `title` field | HIGH | `packages/shared/src/schemas/node.schema.ts` | Added `.max(500)` to all title fields |
| 2 | No max length on `markdownBody` field | HIGH | `packages/shared/src/schemas/node.schema.ts` | Added `.max(100_000)` |
| 3 | No max value on `sortOrder` field | LOW | `packages/shared/src/schemas/node.schema.ts` | Added `.max(1_000_000)` to all sortOrder fields |
| 4 | Unbounded `states` array | MEDIUM | `packages/shared/src/schemas/tree-state.schema.ts` | Added `.max(10_000)` to array |
| 5 | No Fastify body size limit | MEDIUM | `packages/server/src/server.ts` | Added `bodyLimit: 1_048_576` (1MB) |
| 6 | No security headers | MEDIUM | `packages/server/src/server.ts` | Added `@fastify/helmet` (X-Frame-Options, X-Content-Type-Options, etc.) |
| 7 | No rate limiting | MEDIUM | `packages/server/src/server.ts` | Added `@fastify/rate-limit` (100 req/min per IP) |
| 8 | No CORS configuration | LOW | `packages/server/src/server.ts` | Added `@fastify/cors` with `origin: false` (same-origin only) |
| 9 | Devtools included in production | LOW | `packages/client/vite.config.ts` | Made TanStack devtools conditional on `NODE_ENV !== 'production'` |

### ACKNOWLEDGED - Architectural Decisions

| # | Finding | Severity | Notes |
|---|---------|----------|-------|
| 10 | No authentication/authorization | INFO | Expected for a local-first todo app. All endpoints are open. If the app is ever exposed publicly, auth middleware must be added. |
| 11 | No CSRF protection | INFO | Not a risk while the app is same-origin only. Would need CSRF tokens if cross-origin access is enabled. |

---

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `@fastify/helmet` | latest | Security response headers |
| `@fastify/rate-limit` | latest | Request rate limiting |
| `@fastify/cors` | latest | Cross-Origin Resource Sharing policy |

---

## Files Modified

- `packages/shared/src/schemas/node.schema.ts` - Added max length/value constraints
- `packages/shared/src/schemas/tree-state.schema.ts` - Added max array size
- `packages/server/src/server.ts` - Added bodyLimit, helmet, rate-limit, CORS
- `packages/server/package.json` - New security dependencies
- `packages/client/vite.config.ts` - Conditional devtools

---

## Recommendations for Future

1. **If deploying publicly:** Add authentication middleware (JWT/session-based) and CSRF tokens
2. **Dependency monitoring:** Run `pnpm audit` in CI pipeline to catch new CVEs
3. **Content Security Policy:** Enable CSP headers via helmet when ready to configure allowed sources
4. **Database encryption:** Consider SQLCipher if storing sensitive data
