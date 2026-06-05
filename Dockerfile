# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Native build deps for bcrypt
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Accept Railway's injected NODE_ENV build arg (if any), then forcibly
# override it to development so npm installs ALL dependencies including
# build tools (vite, esbuild, tsx, tailwindcss, etc.).
# These tools are also in regular "dependencies" now as a second safety net.
ARG NODE_ENV
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Verify the critical build tools are present before attempting build
RUN test -f node_modules/.bin/vite || (echo "ERROR: vite not found in node_modules/.bin" && exit 1)
RUN test -f node_modules/.bin/esbuild || (echo "ERROR: esbuild not found in node_modules/.bin" && exit 1)

# Add node_modules/.bin to PATH for all subsequent RUN commands
ENV PATH="/app/node_modules/.bin:$PATH"

COPY . .
RUN vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist


# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/attached_assets ./attached_assets

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
