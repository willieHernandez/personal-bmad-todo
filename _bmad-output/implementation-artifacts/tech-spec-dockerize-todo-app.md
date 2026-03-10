---
title: 'Dockerize Todo App'
slug: 'dockerize-todo-app'
created: '2026-03-10'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [docker, docker-compose, nginx, node-22-alpine, fastify, pnpm, vite, tsc, better-sqlite3, drizzle-kit, pino-pretty]
files_to_modify: [packages/server/src/index.ts, packages/server/src/server.ts, packages/shared/package.json]
files_to_create: [packages/client/Dockerfile, packages/client/nginx.conf, packages/server/Dockerfile, packages/shared/tsconfig.json, .dockerignore, docker-compose.yaml, .env.example, packages/server/docker-entrypoint.sh]
code_patterns: [monorepo-workspace-deps, env-var-config, drizzle-push-not-migrate, native-module-platform-build, pino-pretty-dev-dependency]
test_patterns: [docker-compose-up-verification, health-check-endpoint, container-network-isolation]
---

# Tech-Spec: Dockerize Todo App

**Created:** 2026-03-10

## Overview

### Problem Statement

There is no containerized way to run the todo-bmad-style app. It requires local Node.js, pnpm, and manual setup. A one-command `docker compose up` experience is needed with proper production practices including health checks, networking, and environment configuration.

### Solution

Create multi-stage Dockerfiles for the client (nginx) and server (Node.js), a docker-compose.yaml that orchestrates both with proper networking and volume persistence, health check endpoints, and environment-based configuration for dev/test profiles.

### Scope

**In Scope:**

- Multi-stage Dockerfiles for client and server with non-root users
- `.dockerignore` files for lean images
- `docker-compose.yaml` with networking, volumes, health checks, and dependency ordering
- `/api/health` endpoint on Fastify server
- Docker HEALTHCHECK instructions in both Dockerfiles
- Custom bridge network (`todo-network`) — server not exposed to host
- nginx config serving static files and reverse proxying `/api` to backend
- Named volume for SQLite data persistence
- Environment variable configuration (`HOST`, `PORT`, `DB_PATH`) with `.env.example`
- Verification via `docker compose up`

**Out of Scope:**

- SSL/TLS, domain configuration
- CI/CD pipeline integration
- Docker Swarm / Kubernetes orchestration
- Separate database container (SQLite is file-based)
- Production deployment infrastructure
- Compose profiles for dev vs test environments (future enhancement)

## Context for Development

### Codebase Patterns

- **Monorepo structure:** pnpm workspaces with `packages/client`, `packages/server`, `packages/shared`
- **Shared package:** `@todo-bmad-style/shared` is a workspace dependency used by both client and server — must be available at build time in both Dockerfiles
- **Client build:** Vite builds static files; dev mode proxies `/api` to `localhost:3001` via `vite.config.ts`
- **Server runtime:** Fastify on port 3001, currently hardcoded to `127.0.0.1` — both host and port must become configurable via `HOST` and `PORT` env vars
- **Database:** SQLite via better-sqlite3 (native module — needs matching platform build), path controlled by `DB_PATH` env var, defaults to `~/.todo-bmad-style/data.db`
- **Drizzle schema push (no migration files):** Project uses `drizzle-kit push` directly — no `drizzle/` migration folder exists. Docker entrypoint must run `pnpm db:push` before server start.
- **Dev command:** `pnpm dev` at root runs both client and server via `concurrently`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/server/src/index.ts` | Server entry — host hardcoded to `127.0.0.1` and port to `3001` on line 7, must read `HOST` and `PORT` env vars |
| `packages/server/src/server.ts` | Fastify setup — existing `/api/health` endpoint (line 20) returns `{ status: 'ok' }` without DB check. Enhance to verify DB connectivity. |
| `packages/server/src/db/index.ts` | DB connection — already reads `DB_PATH` env var, creates dir with `mkdirSync` |
| `packages/server/drizzle.config.ts` | Drizzle config — reads `DB_PATH`, used by `drizzle-kit push` |
| `packages/server/tsconfig.json` | Compiles to `dist/` with `NodeNext` module resolution |
| `packages/server/package.json` | `pino-pretty` is a devDependency — production image needs it or logger config must handle absence |
| `packages/client/vite.config.ts` | Vite config with `/api` proxy (dev only) — nginx replaces this in Docker |
| `packages/shared/package.json` | No build step — raw TS source (`"main": "src/index.ts"`), consumed directly by both client and server |
| `package.json` (root) | Build scripts: `pnpm build` builds client then server |
| `pnpm-workspace.yaml` | Workspace config — needed in Docker build context |
| `pnpm-lock.yaml` | Lock file — needed for reproducible installs |

### Technical Decisions

- **nginx for client container:** Use `nginx:alpine-unprivileged` base image (listens on port 8080 by default, runs as non-root out of the box). Serves built static files and reverse-proxies `/api/*` to the server container over the Docker bridge network. This replaces the Vite dev proxy in production.
- **Server binds to `0.0.0.0` in Docker:** Controlled via `HOST` env var. Default remains `127.0.0.1` for local dev safety; Docker compose sets `HOST=0.0.0.0`.
- **Server port configurable:** Controlled via `PORT` env var. Default remains `3001` for backward compatibility.
- **Single bridge network:** Client and server on `todo-network`. Only client exposes a port to the host (8080). Server is internal-only, reachable via Docker DNS as `server:3001`.
- **Named volume for SQLite:** Mounted at `/data` inside the server container. `DB_PATH=/data/data.db` ensures persistence across restarts. Directory pre-created and `chown`-ed to `appuser` before switching to non-root user.
- **Multi-stage builds:** Build stage includes full pnpm + dev deps. Runtime stage uses a separate init stage for `drizzle-kit push`, then the final runtime stage has only production deps + `pino-pretty` (moved to production deps).
- **Non-root users:** Server container creates `appuser` and pre-creates `/data` with correct ownership before `USER appuser`. Client uses `nginx:alpine-unprivileged` which runs as non-root natively.
- **better-sqlite3 native build:** Must be compiled for the target container platform (linux). Install happens in the Docker build stage to ensure correct native bindings.
- **Drizzle schema push — guarded on first boot:** Entrypoint checks if the DB file exists. If it's a fresh volume (no DB file), runs `drizzle-kit push`. For existing DBs, only runs if `RUN_MIGRATIONS=true` env var is set. This prevents accidental destructive schema changes on every restart.
- **pino-pretty as production dependency:** Move from devDependencies to dependencies in server `package.json`. This is a small local app and readable logs in Docker are valuable. This also allows the runtime stage to use `pnpm install --prod`.
- **Shared package needs a build step:** The compiled server JS still imports `from '@todo-bmad-style/shared'`, and the shared package's `"main"` points to raw TypeScript (`src/index.ts`). Node.js cannot execute `.ts` files at runtime. Fix: add `tsconfig.json` and `"build": "tsc"` to the shared package, update `"main"` to `"dist/index.js"`, and ensure `pnpm build` builds shared before server.
- **Build context is monorepo root:** Both Dockerfiles use the project root as build context so workspace resolution works. Single `.dockerignore` at root.
- **Host platform:** Dev machine is `arm64 darwin`. Docker will build `linux` images. `better-sqlite3` must compile inside the container — never copy `node_modules` from host.
- **Existing health endpoint:** `/api/health` exists at `server.ts:20` but only returns `{ status: 'ok' }`. Enhance to verify DB is reachable (simple query like `SELECT 1`).
- **Health checks use `wget` not `curl`:** `nginx:alpine-unprivileged` does not ship `curl`. Alpine ships `wget` by default. All health checks (Dockerfile HEALTHCHECK and docker-compose healthcheck) use `wget -qO- ... || exit 1`.

## Implementation Plan

### Tasks

- [x] Task 1: Add build step to shared package
  - Files: `packages/shared/package.json`, `packages/shared/tsconfig.json`
  - Action: The compiled server JS still imports `from '@todo-bmad-style/shared'` at runtime, but the shared package's `"main"` points to raw TypeScript (`src/index.ts`), which Node.js cannot execute. Fix this by:
    1. Create `packages/shared/tsconfig.json` extending `../../tsconfig.base.json` with `"outDir": "dist"`, `"rootDir": "src"`, `"declaration": true`
    2. Update `packages/shared/package.json`: add `"build": "tsc"` script, change `"main"` to `"dist/index.js"`, update `"exports"` to `{ ".": "./dist/index.js" }`, add `"types": "dist/index.d.ts"`
    3. Update root `package.json` build script to build shared first: `"build": "pnpm --filter shared build && pnpm --filter client build && pnpm --filter server build"`
  - Notes: This change is needed for Docker AND improves the project generally. Verify local dev still works after this change (`pnpm dev` uses `tsx` which handles TS resolution regardless, but `pnpm build && node packages/server/dist/index.js` should now work).

- [x] Task 2: Enhance health check endpoint to verify DB connectivity
  - File: `packages/server/src/server.ts`
  - Action: Update the existing `/api/health` handler (line 20) to execute a simple DB query (`SELECT 1`) via the `db` import. Return `{ status: 'ok', db: 'connected' }` on success or `{ status: 'error', db: 'disconnected' }` with HTTP 503 on failure.
  - Notes: Import `db` from `./db/index.js`. Wrap the DB call in try/catch. Keep the endpoint synchronous-feeling — `better-sqlite3` is sync so this is straightforward.

- [x] Task 3: Make server host and port configurable via env vars
  - File: `packages/server/src/index.ts`
  - Action: Change line 7 from `host: '127.0.0.1', port: 3001` to `host: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT) || 3001`. This preserves local dev behavior while allowing Docker to override both.
  - Notes: Two values on the same line. No other files affected. Both default to current hardcoded values for backward compatibility.

- [x] Task 4: Move `pino-pretty` to production dependencies
  - File: `packages/server/package.json`
  - Action: Move `pino-pretty` from `devDependencies` to `dependencies`. This allows the Docker runtime stage to use `pnpm install --prod` while still having readable logs.
  - Notes: Small package, valuable for Docker log readability. Eliminates the need to install all devDeps in the runtime stage.

- [x] Task 5: Create `.dockerignore` at project root
  - File: `.dockerignore`
  - Action: Create file excluding `node_modules`, `**/dist`, `.git`, `_bmad`, `_bmad-output`, `docs`, `*.md` (but NOT `package.json`), `*.png`, `*.jpg`, and any local DB files (`**/*.db`, `**/*.db-wal`, `**/*.db-shm`).
  - Notes: Single `.dockerignore` at root since both Dockerfiles use root as build context.

- [x] Task 6: Create server Dockerfile (multi-stage)
  - File: `packages/server/Dockerfile`
  - Action: Create multi-stage Dockerfile with:
    - **Stage 1 (deps):** `node:22-alpine` base. Install pnpm globally via `corepack enable`. Copy root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and all three package `package.json` files. Run `pnpm install --frozen-lockfile` (full install including devDeps — needed for `tsc`, `drizzle-kit`).
    - **Stage 2 (build):** Copy full source. Run `pnpm --filter shared build && pnpm --filter server build`.
    - **Stage 3 (runtime):** Fresh `node:22-alpine`. Enable corepack/pnpm. Copy root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and all three package `package.json` files. Run `pnpm install --prod --frozen-lockfile` (production only — `pino-pretty` is now a prod dep). Copy compiled `packages/server/dist/` and `packages/shared/dist/` from build stage. Copy `packages/server/drizzle.config.ts`. Copy `docker-entrypoint.sh` with `COPY --chmod=755`. Create non-root user `appuser`. Create `/data` directory and `chown` to `appuser`. `USER appuser`. Set `WORKDIR /app`. Expose port 3001.
    - **HEALTHCHECK:** `wget -qO- http://localhost:3001/api/health || exit 1`
    - **ENTRYPOINT:** `["./packages/server/docker-entrypoint.sh"]`
  - Notes: Build context is monorepo root. File layout inside container must mirror monorepo-root structure at `/app` (i.e., `/app/packages/server/dist/`, `/app/packages/shared/dist/`, `/app/node_modules/`, etc.). `better-sqlite3` compiles natively during `pnpm install` inside the container. `drizzle-kit` is needed at runtime for schema push — keep it as a prod dep OR copy it from the build stage. Simplest: add `drizzle-kit` and `drizzle-orm` to prod deps (they already are), and add `tsx` to prod deps since `drizzle-kit` needs it to read `drizzle.config.ts`.

- [x] Task 7: Create server Docker entrypoint script
  - File: `packages/server/docker-entrypoint.sh`
  - Action: Create shell script that:
    1. Checks if DB file exists at `$DB_PATH`. If NOT (fresh volume), runs `pnpm --filter server db:push` to initialize schema.
    2. If `RUN_MIGRATIONS=true` env var is set, runs `pnpm --filter server db:push` regardless (for explicit schema updates).
    3. Starts the server with `exec node packages/server/dist/index.js` (exec for PID 1 signal handling).
  - Notes: Must be copied with `COPY --chmod=755` in Dockerfile. Uses `#!/bin/sh` (Alpine). Working directory is `/app` (monorepo root layout).

- [x] Task 8: Create nginx configuration
  - File: `packages/client/nginx.conf`
  - Action: Create nginx config that:
    - Listens on port 8080 (matches `nginx:alpine-unprivileged` default)
    - Serves static files from `/usr/share/nginx/html` (Vite build output)
    - Proxies `/api/*` requests to `http://server:3001` (Docker DNS resolves `server` to the backend container)
    - Handles SPA routing: `try_files $uri $uri/ /index.html` for all non-API, non-static routes
    - Sets appropriate cache headers (long cache for hashed assets, no-cache for `index.html`)
  - Notes: `server` hostname comes from the Docker Compose service name.

- [x] Task 9: Create client Dockerfile (multi-stage)
  - File: `packages/client/Dockerfile`
  - Action: Create multi-stage Dockerfile with:
    - **Stage 1 (deps):** `node:22-alpine` base. Enable corepack/pnpm. Copy root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and all three package `package.json` files. Run `pnpm install --frozen-lockfile`.
    - **Stage 2 (build):** Copy full source. Run `pnpm --filter shared build && pnpm --filter client build` (Vite build — outputs to `packages/client/dist/`).
    - **Stage 3 (runtime):** `nginxinc/nginx-unprivileged:alpine` base (runs as non-root, listens on 8080). Copy `packages/client/nginx.conf` to `/etc/nginx/conf.d/default.conf`. Copy built static files from stage 2 (`packages/client/dist/`) to `/usr/share/nginx/html`.
    - **HEALTHCHECK:** `wget -qO- http://localhost:8080/ || exit 1`
  - Notes: Build context is monorepo root. No need to create non-root user — `nginx-unprivileged` handles this. Expose port 8080.

- [x] Task 10: Create `.env.example`
  - File: `.env.example`
  - Action: Create environment variable documentation file with:
    ```
    # Server configuration
    HOST=0.0.0.0          # Bind address (default: 127.0.0.1 for local dev)
    PORT=3001              # Server port (default: 3001)
    DB_PATH=/data/data.db  # SQLite database path (default: ~/.todo-bmad-style/data.db)

    # Client configuration
    CLIENT_PORT=8080       # Host port mapped to client container

    # Database initialization
    RUN_MIGRATIONS=false   # Set to 'true' to force schema push on existing DB
    ```
  - Notes: Documented defaults match what docker-compose.yaml uses. No compose profiles.

- [x] Task 11: Create `docker-compose.yaml`
  - File: `docker-compose.yaml`
  - Action: Create compose file with:
    - **`server` service:**
      - Build context: `.` (monorepo root), dockerfile: `packages/server/Dockerfile`
      - Environment: `HOST=0.0.0.0`, `PORT=3001`, `DB_PATH=/data/data.db`
      - Volume: `todo-data:/data` (named volume for SQLite persistence)
      - Network: `todo-network`
      - NOT exposed to host (no `ports` mapping)
      - Restart: `unless-stopped`
      - Healthcheck: `wget -qO- http://localhost:3001/api/health || exit 1`, interval 10s, timeout 5s, retries 3, start_period 15s
    - **`client` service:**
      - Build context: `.` (monorepo root), dockerfile: `packages/client/Dockerfile`
      - Ports: `${CLIENT_PORT:-8080}:8080`
      - Network: `todo-network`
      - Depends on: `server` (condition: `service_healthy`)
      - Restart: `unless-stopped`
      - Healthcheck: `wget -qO- http://localhost:8080/ || exit 1`, interval 10s, timeout 5s, retries 3, start_period 10s
    - **Networks:** `todo-network` (bridge driver)
    - **Volumes:** `todo-data` (local driver)
  - Notes: Client waits for server to be healthy before starting. Server is internal-only — no host port exposure. Both services have `restart: unless-stopped`. Client healthcheck has `start_period: 10s`.

- [x] Task 12: Verify with `docker compose up --build`
  - Action: Build and start all containers. Verify:
    1. Both images build successfully
    2. Server starts, schema push runs on fresh volume, health check passes
    3. Client starts and serves the app
    4. App is accessible at `http://localhost:8080`
    5. API calls work through nginx proxy (`http://localhost:8080/api/nodes`)
    6. `docker compose ps` shows both services as "healthy"
    7. `http://localhost:3001` is NOT accessible from host (server is internal-only)
  - Notes: This is the verification step, not a code task.

### Acceptance Criteria

- [x] AC 1: Given Docker and Docker Compose are installed, when running `docker compose up --build` from the project root, then both `client` and `server` containers start without errors.
- [x] AC 2: Given the server container is running, when `docker compose ps` is checked, then the server shows status "healthy".
- [x] AC 3: Given the client container is running, when `docker compose ps` is checked, then the client shows status "healthy".
- [x] AC 4: Given both containers are running and healthy, when navigating to `http://localhost:8080` in a browser, then the todo app UI loads correctly.
- [x] AC 5: Given both containers are running, when making a GET request to `http://localhost:8080/api/health`, then the response is `{ "status": "ok", "db": "connected" }` with HTTP 200.
- [x] AC 6: Given both containers are running, when making a GET request to `http://localhost:8080/api/nodes`, then the response is a valid JSON array (empty `[]` or with existing projects).
- [x] AC 7: Given the server container is running, when attempting to access `http://localhost:3001` from the host, then the connection is refused (server is not exposed to host).
- [x] AC 8: Given data was created in the app, when running `docker compose down` followed by `docker compose up`, then the previously created data is still present (volume persistence).
- [x] AC 9: Given no `.env` file exists, when running `docker compose up`, then default values are used (client on port 8080, server on 3001 internally, DB at `/data/data.db`).
- [x] AC 10: Given the server is run locally (not in Docker) without `HOST` or `PORT` env vars, when it starts, then it still binds to `127.0.0.1:3001` (backward compatible).
- [x] AC 11: Given a fresh volume (no existing DB), when the server container starts, then `drizzle-kit push` runs automatically and creates the schema.
- [x] AC 12: Given an existing DB, when the server container restarts without `RUN_MIGRATIONS=true`, then `drizzle-kit push` does NOT run (safe restart).

## Additional Context

### Dependencies

- Docker Engine 20.10+ and Docker Compose v2 installed on the host machine
- No new npm packages required — all Docker tooling is external to the Node project
- `wget` is used for all health checks — ships with Alpine by default (both `node:22-alpine` and `nginx:alpine-unprivileged`)
- `pino-pretty` moved from devDependencies to dependencies (server)
- `tsx` may need to be added as a production dependency if `drizzle-kit` requires it to read `drizzle.config.ts` at runtime

### Testing Strategy

- **Primary verification:** `docker compose up --build` — both containers start, health checks pass, app accessible at `http://localhost:8080`
- **Health check validation:** `docker compose ps` shows both services as "healthy"
- **API proxy verification:** `curl http://localhost:8080/api/health` returns `{ "status": "ok", "db": "connected" }`
- **Data persistence:** Create a project via the UI, run `docker compose down && docker compose up`, verify the project still exists
- **Network isolation:** `curl http://localhost:3001/api/health` should fail (connection refused) — server is only reachable via the internal Docker network through nginx
- **Local dev backward compatibility:** Run `pnpm dev` locally — server should still bind to `127.0.0.1:3001` (no `HOST` or `PORT` env vars set)
- **Shared package build:** After Task 1, verify `pnpm build && node packages/server/dist/index.js` works locally (not just `pnpm dev`)
- **Fresh volume schema push:** On first `docker compose up`, server entrypoint should run `drizzle-kit push` and create the DB schema
- **Existing DB safe restart:** On subsequent `docker compose up` (without `RUN_MIGRATIONS=true`), entrypoint should NOT run `drizzle-kit push`
- **No unit tests added** — this is infrastructure configuration, not application logic. The enhanced health endpoint is trivial (one DB query) and verified via the Docker health check itself.

### Notes

- The project-context.md rule "No auth, no CORS, no deployment" refers to the app itself — Docker is local dev/test infrastructure, not production deployment
- Source files modified: `server/src/index.ts` (host+port env vars), `server/src/server.ts` (health check), `shared/package.json` (build step), `server/package.json` (pino-pretty to prod deps). Everything else is new Docker infrastructure files.
- `better-sqlite3` native compilation happens inside the Docker build, so the resulting image works on any platform Docker runs on (linux/amd64 or linux/arm64)
- `pino-pretty` is a production dependency in Docker — readable logs are valuable for a local dev tool
- If `drizzle-kit push` fails on first boot (e.g., corrupt DB), the entrypoint exits non-zero and Docker restarts the container per `restart: unless-stopped`
- The `nginxinc/nginx-unprivileged:alpine` image is ~40MB and `node:22-alpine` is ~180MB — total image footprint is reasonable
- Compose profiles for dev/test environments are deferred as a future enhancement
