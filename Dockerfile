# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Native build deps for bcrypt (and any other node-gyp packages)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install all deps including devDependencies (vite, esbuild, drizzle-kit).
# We explicitly unset NODE_ENV so Railway's injected NODE_ENV=production
# cannot cause npm to skip devDependencies during the build stage.
COPY package.json package-lock.json* ./
RUN NODE_ENV=development npm install --no-audit --no-fund

# Copy the rest of the source and build
COPY . .
RUN npm run build


# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# NODE_ENV only — do NOT hardcode PORT; Railway injects its own PORT at runtime
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/attached_assets ./attached_assets
COPY --from=builder /app/server ./server

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
