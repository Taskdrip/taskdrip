---
name: Railway Deployment — Definitive Working Config
description: Dockerfile for Railway — the TRUE root cause was Replit's internal npm registry URLs baked into package-lock.json.
---

## TRUE ROOT CAUSE (confirmed by Railway diagnosis)

package-lock.json generated inside Replit contains "resolved" URLs pointing to
`package-firewall.replit.local` — Replit's internal npm proxy — which is unreachable
from outside Replit (Railway, CI, any external environment). npm times out fetching
packages and crashes with "Exit handler never called!" before any packages install.

## Complete Fix (three parts)

### 1. .npmrc — pin to public registry permanently
```
registry=https://registry.npmjs.org/
```

### 2. package-lock.json — regenerate clean (no Replit internal URLs)
```bash
npm cache clean --force
rm package-lock.json
npm install --registry https://registry.npmjs.org/ --no-audit --no-fund
```
The new lock file will have NO "resolved" fields (lockfileVersion 3 behaviour when
installing from local node_modules). This is fine — npm uses the --registry flag
at build time to fetch anything not cached.

### 3. Dockerfile — pass --registry explicitly to both npm steps
```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_OMIT=""
ENV CI=false
COPY package.json package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund \
      --registry https://registry.npmjs.org/
RUN test -f node_modules/.bin/vite || \
      (echo "ERROR: vite binary not found after npm install" && exit 1)
COPY . .
RUN NODE_OPTIONS='--max-old-space-size=4096' \
    node_modules/.bin/vite build && \
    node_modules/.bin/esbuild server/index.ts \
      --platform=node --packages=external --bundle --format=esm --outdir=dist

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
      --registry https://registry.npmjs.org/
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

## All Root Causes (in order)
1. `nodejs_20` in nixpkgs → invalid Nix package name
2. `import.meta.dirname` in vite.config.ts → needs Node ≥ 20.11.0, fix: fileURLToPath
3. `npm ci` without devDeps → Railway sets NODE_ENV=production → vite not found
4. `[variables]` in nixpacks.toml → not supported in Railway's Nixpacks version
5. `.npmrc production=false` → deprecated npm 8+, ignored
6. `npm ci --include=dev` → not a valid flag, silently ignored
7. `ENV NODE_ENV=development` alone → Railway also injects NPM_CONFIG_PRODUCTION=true
8. `ENV NPM_CONFIG_PRODUCTION=false` + `npm ci` → npm ci still respects Railway's signals
9. **TRUE ROOT CAUSE**: package-lock.json had `resolved: https://package-firewall.replit.local/...`
   on 782 packages → unreachable from Railway → npm timeout/crash
   **FIX**: .npmrc with public registry + clean lock file + --registry flag in Dockerfile

## What NOT to Do
- Never commit a package-lock.json generated inside Replit without regenerating it
  with `--registry https://registry.npmjs.org/` first
- Never use `npm ci --include=dev` — not valid for npm ci
- Never rely on `ENV NODE_ENV=development` alone in Dockerfile
- Never use `npm run build` in Dockerfile — use node_modules/.bin/ direct paths
- Never add `nodejs_20` to nixpkgs
- Never use `import.meta.dirname` in vite.config.ts
