# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./

# --include=dev ensures build tools (vite, esbuild, tailwind, etc.) are always
# installed regardless of any NODE_ENV value Railway injects at build time.
RUN npm ci --include=dev --no-audit --no-fund

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
