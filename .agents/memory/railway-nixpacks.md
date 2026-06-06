---
name: Railway Nixpacks Deployment
description: Definitive Railway deployment config for this project — Nixpacks only, no Dockerfile.
---

## The Rule
Use Nixpacks on Railway. Force it via `builder = "NIXPACKS"` in `railway.toml`.

## Root Causes Encountered (in order)
1. Dockerfile present → Railway used Docker instead of Nixpacks → OOM build failure
2. `nodejs_20` in nixPkgs → invalid Nix package name → setup phase crashes in seconds
3. `import.meta.dirname` in vite.config.ts → only works on Node ≥ 20.11.0 → fixed with `fileURLToPath`
4. `buildCommand` in railway.toml conflicts with nixpacks.toml install phase → removed buildCommand
5. **Railway sets `NODE_ENV=production` at build time** → npm silently skips devDependencies → `vite: not found`

## THE GOLDEN RULE — vite not found
Railway always sets `NODE_ENV=production` during builds. This makes npm skip devDependencies (including
`vite`, `esbuild`). Fix with THREE layers of redundancy (all must be present):

### Layer 1 — `.npmrc` (MOST IMPORTANT, cannot be bypassed)
```
production=false
```

### Layer 2 — nixpacks.toml `[variables]`
```toml
NPM_CONFIG_PRODUCTION = "false"
NODE_ENV = "development"
```

### Layer 3 — nixpacks.toml install uses `npm install` (not `npm ci`)
```toml
cmds = ["npm install --no-audit --no-fund"]
```

Note: Build phase explicitly resets `NODE_ENV=production` so the running app is in production mode:
```toml
cmds = ["NODE_ENV=production NODE_OPTIONS='--max-old-space-size=4096' npm run build"]
```

## Working Configuration (all 4 files)

`.nvmrc`:
```
20
```

`.npmrc` (NEW — the critical fix):
```
production=false
```

`railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```
**No `buildCommand` in railway.toml** — this conflicts with nixpacks.toml install phase.

`nixpacks.toml`:
```toml
[variables]
NPM_CONFIG_PRODUCTION = "false"
NODE_ENV = "development"

[phases.setup]
nixPkgs = ["python3", "gcc"]

[phases.install]
cmds = ["npm install --no-audit --no-fund"]

[phases.build]
cmds = ["NODE_ENV=production NODE_OPTIONS='--max-old-space-size=4096' npm run build"]

[start]
cmd = "node dist/index.js"
```

`vite.config.ts` — use fileURLToPath, NOT import.meta.dirname:
```ts
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## What NOT to Do
- Never use plain `npm ci` without `--include=dev` AND without `NPM_CONFIG_PRODUCTION=false`
- Never add `nodejs_20` or any `nodejs_*` to nixpkgs — Railway auto-detects from .nvmrc
- Never use a Dockerfile (kept in repo but overridden by `builder = "NIXPACKS"`)
- Never put `buildCommand` in railway.toml — it conflicts with the nixpacks install phase
- Never omit the `.npmrc` file — it is the most reliable layer of the devDep fix

## Railway Dashboard Backup (if still failing)
Go to Railway → Service → Variables and add:
```
NPM_CONFIG_PRODUCTION = false
```
