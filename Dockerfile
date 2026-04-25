# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Native build deps for bcrypt (and any other node-gyp packages)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install all deps (vite + esbuild + drizzle-kit are devDependencies, all needed)
COPY package.json package-lock.json* ./
RUN npm install --include=dev --no-audit --no-fund

# Copy the rest of the source and build
COPY . .
RUN npm run build


# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000

# tini for proper signal handling
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy what runtime + pre-deploy migrations need.
# We intentionally keep the full node_modules (incl. drizzle-kit) so the
# Railway pre-deploy `npm run db:push --force` works without re-installing.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/attached_assets ./attached_assets
COPY --from=builder /app/server ./server

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
