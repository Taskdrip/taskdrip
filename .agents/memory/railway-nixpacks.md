---
name: Railway Deployment — Definitive Working Config
description: What actually works for Railway deployment — Dockerfile with explicit NPM_CONFIG overrides + direct binary paths for build tools.
---

## FINAL WORKING APPROACH (v2): NPM_CONFIG overrides + direct binary paths

Railway injects `NPM_CONFIG_PRODUCTION=true` at the Docker build level, which causes
npm to skip all devDependencies even when `ENV NODE_ENV=development` is set in the
Dockerfile. The fix requires BOTH:
1. Explicitly setting `NPM_CONFIG_PRODUCTION=false` and `NPM_CONFIG_OMIT=""` in the
   Dockerfile builder stage to override Railway's injected values.
2. Calling vite and esbuild via `node_modules/.bin/vite` and `node_modules/.bin/esbuild`
   directly (not via `npm run build`) to bypass shell PATH resolution issues in Railway's
   Docker environment.

## Root Causes Encountered (in order, all confirmed)
1. `nodejs_20` in nixpkgs → invalid Nix package name → instant crash
2. `import.meta.dirname` in vite.config.ts → needs Node ≥ 20.11.0 → fixed with fileURLToPath
3. `npm ci` without devDeps → Railway sets NODE_ENV=production → vite not found
4. `[variables]` section in nixpacks.toml → not supported in Railway's Nixpacks version
5. `.npmrc production=false` → deprecated in npm 8+ → npm warns and ignores it
6. `npm ci --include=dev` → not a valid flag for npm ci → silently ignored
7. `ENV NODE_ENV=development` alone → Railway also injects `NPM_CONFIG_PRODUCTION=true`
   which overrides NODE_ENV behaviour → vite still not found
8. **FIXED**: `ENV NPM_CONFIG_PRODUCTION=false` + `ENV NPM_CONFIG_OMIT=""` + direct binary
   paths (`node_modules/.bin/vite`, `node_modules/.bin/esbuild`) in the RUN step.

## Working Dockerfile (multi-stage) — THE DEFINITIVE VERSION
```dockerfile
# Stage 1: Build
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

# Stage 2: Production runtime
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
```

## Working railway.toml (NO builder = "NIXPACKS" — let Railway auto-detect Dockerfile)
```toml
[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

## Working vite.config.ts pattern
```ts
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## What NOT to Do
- Never rely on .npmrc production=false — deprecated in npm 8+, ignored
- Never use npm ci --include=dev — not a valid npm ci flag, silently ignored
- Never use [variables] section in nixpacks.toml — unsupported in Railway's Nixpacks
- Never add nodejs_20 to nixpkgs
- Never use import.meta.dirname in vite.config.ts
- Never set builder = "NIXPACKS" in railway.toml — Nixpacks has too many edge cases
- Never rely on ENV NODE_ENV=development alone — Railway ALSO injects NPM_CONFIG_PRODUCTION=true
- Never use `npm run build` in Dockerfile — use direct node_modules/.bin paths instead
