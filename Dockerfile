# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Neutralise every production-mode signal Railway can inject at build time.
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_OMIT=""
ENV CI=false

COPY package.json package-lock.json ./

# Force public npm registry — package-lock.json may contain Replit-internal
# registry URLs (package-firewall.replit.local) which are unreachable externally.
RUN npm install --include=dev --no-audit --no-fund \
      --registry https://registry.npmjs.org/

# Fail fast with a clear message if vite is somehow still missing.
RUN test -f node_modules/.bin/vite || \
      (echo "ERROR: vite binary not found after npm install" && exit 1)

COPY . .

# Invoke binaries directly — avoids npm script runner PATH resolution
# issues that occur in Railway's sh/dash Docker shell.
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

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
      --registry https://registry.npmjs.org/

COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads

EXPOSE 5000
CMD ["node", "dist/index.js"]
