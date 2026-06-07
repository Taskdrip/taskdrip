---
name: Railway Deployment — Definitive Working Config
description: Dockerfile for Railway — use npm install --include=dev + direct binary paths. npm ci is unreliable in Railway's build environment.
---

## FINAL WORKING APPROACH (v3): npm install --include=dev + direct binary paths

Railway injects multiple production-mode signals during Docker builds:
- `NODE_ENV=production`
- `NPM_CONFIG_PRODUCTION=true`
- Possibly `NPM_CONFIG_OMIT=dev`

`npm ci` silently honours these even when Dockerfile `ENV` overrides are present.
`npm install --include=dev` explicitly overrides the omit list and installs
devDependencies regardless of any injected environment variables.

## Root Causes Encountered (in order, all confirmed)
1. `nodejs_20` in nixpkgs → invalid Nix package name → instant crash
2. `import.meta.dirname` in vite.config.ts → needs Node ≥ 20.11.0 → fixed with fileURLToPath
3. `npm ci` without devDeps → Railway sets NODE_ENV=production → vite not found
4. `[variables]` section in nixpacks.toml → not supported in Railway's Nixpacks version
5. `.npmrc production=false` → deprecated in npm 8+ → npm warns and ignores it
6. `npm ci --include=dev` → not a valid flag for npm ci → silently ignored
7. `ENV NODE_ENV=development` alone → Railway also injects NPM_CONFIG_PRODUCTION=true
8. `ENV NPM_CONFIG_PRODUCTION=false` + `ENV NPM_CONFIG_OMIT=""` + `npm ci` → npm ci
   still silently honours production mode from Railway's injected values
9. **FIXED**: Switch from `npm ci` to `npm install --include=dev` — this flag explicitly
   forces devDependencies to be installed regardless of all env vars.
   Also: direct binary paths (`node_modules/.bin/vite`, `node_modules/.bin/esbuild`)
   instead of `npm run build` to bypass sh/dash PATH resolution issues.

## Working Dockerfile (multi-stage) — THE DEFINITIVE VERSION
```dockerfile
FROM node:20-slim AS builder
WORKDIR /app

ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_OMIT=""
ENV CI=false

COPY package.json package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund

RUN test -f node_modules/.bin/vite || (echo "ERROR: vite binary not found after npm install" && exit 1)

COPY . .
RUN NODE_OPTIONS='--max-old-space-size=4096' \
    node_modules/.bin/vite build && \
    node_modules/.bin/esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=esm \
      --outdir=dist

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

## Working railway.toml
```toml
[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

## What NOT to Do
- Never use `.npmrc production=false` — deprecated in npm 8+, ignored
- Never use `npm ci --include=dev` — not a valid npm ci flag, silently ignored
- Never use `npm ci` in the builder stage on Railway — it silently honours
  Railway's injected production env vars regardless of Dockerfile ENV overrides
- Never use `npm run build` in Dockerfile — use direct node_modules/.bin paths
- Never rely on `ENV NODE_ENV=development` alone
- Never add `nodejs_20` to nixpkgs
- Never use `import.meta.dirname` in vite.config.ts
