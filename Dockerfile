# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Force development mode so ALL deps (vite, esbuild) are installed
# ENV in Dockerfile overrides any external NODE_ENV Railway injects
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN NODE_OPTIONS='--max-old-space-size=4096' npm run build

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
