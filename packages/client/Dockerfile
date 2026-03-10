# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS build
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/client/ packages/client/

RUN pnpm --filter shared build && pnpm --filter client build

# Stage 3: Serve with nginx
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/client/dist/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -q -O /dev/null http://localhost:8080/ || exit 1
