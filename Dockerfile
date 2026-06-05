# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Native build deps for bcrypt (and any other node-gyp packages)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install ALL deps including devDependencies (vite, esbuild, drizzle-kit).
# npm ci is faster and more reliable than npm install in CI environments.
# NODE_ENV=development ensures devDependencies are NOT skipped.
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci --no-audit --no-fund

# Put node_modules/.bin on PATH so vite/esbuild/tsx are found by RUN commands
# (Docker RUN shells do NOT get npm's automatic .bin PATH injection).
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy source and build
COPY . .
RUN vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist


# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Only copy what's needed at runtime
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/attached_assets ./attached_assets

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
