# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS build
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/

RUN pnpm --filter shared build && pnpm --filter server build

# Stage 3: Production runtime
FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/packages/server/dist/ packages/server/dist/
COPY --from=build /app/packages/shared/dist/ packages/shared/dist/
# drizzle-kit push needs these TS sources at runtime (parsed via tsx, both in prod deps)
COPY packages/server/drizzle.config.ts packages/server/
COPY packages/server/src/db/schema.ts packages/server/src/db/
COPY --chmod=755 packages/server/docker-entrypoint.sh packages/server/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /data && chown appuser:appgroup /data && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=15s \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./packages/server/docker-entrypoint.sh"]
