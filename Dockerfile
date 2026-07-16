# syntax=docker/dockerfile:1.7
FROM node:24.16.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.13.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/data/scilab.db
ENV UPLOAD_DIR=/data/uploads
ENV BACKUP_DIR=/backups

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --create-home nextjs \
  && mkdir -p /data/uploads /backups \
  && chown -R nextjs:nodejs /data /backups

COPY --chown=nextjs:nodejs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --chown=nextjs:nodejs --from=builder /app/tsconfig.json ./
COPY --chown=nextjs:nodejs --from=builder /app/drizzle ./drizzle
COPY --chown=nextjs:nodejs --from=builder \
  /app/scripts/admin.ts \
  /app/scripts/backup.ts \
  /app/scripts/migrate.ts \
  /app/scripts/seed.ts \
  /app/scripts/start.mjs \
  ./scripts/
COPY --chown=nextjs:nodejs --from=builder /app/src/server ./src/server
COPY --chown=nextjs:nodejs --from=builder /app/src/lib ./src/lib
COPY docker/entrypoint.sh /usr/local/bin/scilab-entrypoint
RUN chmod +x /usr/local/bin/scilab-entrypoint

USER nextjs
EXPOSE 3000
VOLUME ["/data", "/backups"]
ENTRYPOINT ["scilab-entrypoint"]
CMD ["node", "server.js"]
