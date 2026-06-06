---
name: Railway Deployment — Definitive Working Config
description: What actually works for Railway deployment — use Dockerfile with ENV NODE_ENV=development in builder stage.
---

## FINAL WORKING APPROACH: Dockerfile with ENV NODE_ENV=development

Railway injects NODE_ENV=production into the build environment. This causes npm to skip
devDependencies (vite, esbuild) during `npm ci`. The ONLY reliable override is a Dockerfile
`ENV` instruction — it takes precedence over any externally-injected environment variable.

## Root Causes Encountered (in order)
1. `nodejs_20` in nixpkgs → invalid Nix package name → instant crash
2. `import.meta.dirname` in vite.config.ts → needs Node ≥ 20.11.0 → fixed with fileURLToPath
3. `npm ci` without devDeps → Railway sets NODE_ENV=production → vite not found
4. `[variables]` section in nixpacks.toml → not supported in Railway's Nixpacks version
5. `.npmrc production=false` → deprecated in npm 8+ → npm warns and ignores it
6. `npm ci --include=dev` → not a valid flag for npm ci → silently ignored
7. **FIXED**: `ENV NODE_ENV=development` in Dockerfile builder stage overrides Railway's injection

## Working Dockerfile (multi-stage) — THE DEFINITIVE VERSION
```dockerfile
# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# ENV in Dockerfile overrides any external NODE_ENV Railway injects
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN NODE_OPTIONS='--max-old-space-size=4096' npm run build

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
- Never use npm ci --include=dev — not a valid npm ci flag
- Never use [variables] section in nixpacks.toml — unsupported in Railway's Nixpacks
- Never add nodejs_20 to nixpkgs
- Never use import.meta.dirname in vite.config.ts
- Never set builder = "NIXPACKS" in railway.toml — Nixpacks has too many edge cases for this project
