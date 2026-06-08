# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Force public npm registry for ALL operations in this container.
# This overrides any resolved URLs baked into package-lock.json.
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_OMIT=""
ENV NODE_ENV=development
ENV CI=false

# Copy only package.json — intentionally omit package-lock.json so npm
# generates a fresh lockfile using the public registry, bypassing any
# Replit-internal registry URLs (package-firewall.replit.local) that may
# have been embedded in the lockfile by Replit's npm proxy.
COPY package.json ./

RUN npm install --include=dev --no-audit --no-fund

# Fail fast if vite binary is missing after install.
RUN test -f node_modules/.bin/vite || \
      (echo "ERROR: vite binary not found after npm install" && exit 1)

COPY . .

# Build frontend + backend.
RUN NODE_OPTIONS='--max-old-space-size=4096' \
    node_modules/.bin/vite build && \
    node_modules/.bin/esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=esm \
      --outdir=dist

# ── Stage 2: Production runtime ────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy the already-resolved node_modules from the builder stage,
# then prune devDependencies in-place. This avoids a fresh npm install
# (which would trigger new dependency resolution and esbuild version conflicts).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN npm prune --omit=dev --no-audit

COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads

EXPOSE 5000
CMD ["node", "dist/index.js"]
