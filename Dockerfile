# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Override ALL possible npm production-mode triggers Railway may inject.
# NPM_CONFIG_PRODUCTION=false and NPM_CONFIG_OMIT="" take precedence over
# any externally-set NODE_ENV or NPM_CONFIG_* variables at build time.
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_OMIT=""

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Call vite and esbuild via their direct binary paths to bypass any shell
# PATH resolution issues that can occur in Railway's Docker environment.
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
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads

EXPOSE 5000
CMD ["node", "dist/index.js"]
