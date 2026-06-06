---
name: Railway Deployment — Definitive Working Config
description: What actually works for Railway deployment — use Dockerfile, not Nixpacks.
---

## FINAL WORKING APPROACH: Use Dockerfile (not Nixpacks)

Railway has too many Nixpacks quirks (version mismatches, [variables] section not supported,
auto-install overriding custom phases). The reliable approach is the explicit Dockerfile.

Remove `builder = "NIXPACKS"` from railway.toml — Railway auto-detects and uses the Dockerfile.

## Root Causes Encountered (in order)
1. `nodejs_20` in nixpkgs → invalid Nix package name → instant crash
2. `import.meta.dirname` in vite.config.ts → needs Node ≥ 20.11.0 → fixed with fileURLToPath
3. `npm ci` without devDeps → Railway sets NODE_ENV=production → vite not found
4. `[variables]` section in nixpacks.toml → may be invalid in Railway's nixpkgs version → file ignored
5. `.npmrc` not copied into Docker builder stage → npm never saw production=false
6. `builder = "NIXPACKS"` in railway.toml → Nixpacks had too many edge cases → removed

## Working Dockerfile (multi-stage)
```dockerfile
# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# CRITICAL: copy .npmrc FIRST so npm reads production=false
COPY .npmrc package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

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

## Working railway.toml (NO builder override)
```toml
[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

## Working .npmrc
```
production=false
```

## Working vite.config.ts pattern
```ts
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## What NOT to Do
- Never omit `.npmrc` copy from Dockerfile builder stage
- Never use `builder = "NIXPACKS"` — Nixpacks is unreliable for this project
- Never use `[variables]` section in nixpacks.toml — may not be supported
- Never add `nodejs_20` to nixpkgs
- Never use `import.meta.dirname` in vite.config.ts
