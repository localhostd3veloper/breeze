# Next.js frontend.
#
# Built with Bun (the project's package manager) and *run* on Node, because
# `output: 'standalone'` emits a Node server. Bun does the install and build;
# node:22-alpine runs the result, which keeps the final image to the traced
# subset of node_modules rather than the whole 1 GB tree.

# --- deps -------------------------------------------------------------------
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build ------------------------------------------------------------------
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# No secrets are passed here on purpose: lib/env.ts validates lazily, so the
# build never touches a runtime value. If you ever see a zod error during
# `docker compose build`, something started reading env at module scope again.
RUN bun run build

# --- run --------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
