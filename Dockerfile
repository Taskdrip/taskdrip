# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20 AS builder
WORKDIR /app

# Expose installed bin scripts on PATH so vite/esbuild are found after npm install
ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .

RUN vite build && \
    esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=esm \
      --outdir=dist

# ── Stage 2: Production runner ────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "dist/index.js"]
