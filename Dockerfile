# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Native build deps for bcrypt (and any other node-gyp packages)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install all deps (including devDependencies — needed for vite + esbuild build)
COPY package.json package-lock.json* ./
RUN npm install --include=dev --no-audit --no-fund

# Copy the rest of the source and build
COPY . .
RUN npm run build

# Trim node_modules down to production-only for the runtime image
RUN npm prune --omit=dev


# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000

# Tini for proper signal handling
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only what we need at runtime
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/attached_assets ./attached_assets
COPY --from=builder /app/server/seed-legal.ts ./server/seed-legal.ts

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
