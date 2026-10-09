# syntax=docker/dockerfile:1.28

FROM node:24-alpine AS build
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY drizzle ./drizzle

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile
RUN pnpm build

FROM build AS migration
RUN addgroup -S -g 10001 awai && adduser -S -D -H -u 10001 -G awai awai
WORKDIR /workspace/apps/server
USER 10001:10001
CMD ["node", "node_modules/drizzle-kit/bin.cjs", "migrate", "--config", "drizzle.config.ts"]

FROM node:24-alpine AS application
RUN addgroup -S -g 10001 awai && adduser -S -D -H -u 10001 -G awai awai
WORKDIR /app

COPY --from=build --chown=10001:10001 /workspace/apps/server/dist/index.cjs ./server/index.cjs
COPY --from=build --chown=10001:10001 /workspace/apps/web/dist ./public

ENV NODE_ENV=production \
  PORT=3000 \
  STATIC_ROOT=/app/public

USER 10001:10001
EXPOSE 3000
CMD ["node", "/app/server/index.cjs"]
