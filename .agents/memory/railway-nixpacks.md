---
name: Railway Nixpacks Deployment
description: Definitive Railway deployment config for this project — Nixpacks only, no Dockerfile.
---

## The Rule
Use Nixpacks on Railway. Force it via `builder = "NIXPACKS"` in `railway.toml`.

## Root Causes Encountered (in order)
1. Dockerfile present → Railway used Docker instead of Nixpacks → build fails due to memory/tools
2. `nodejs_20` in nixpkgs → invalid Nix package name → setup phase crashes in seconds
3. `import.meta.dirname` in vite.config.ts → only works on Node ≥ 20.11.0 → fixed with `fileURLToPath`
4. No `buildCommand` in railway.toml → Railway skips NODE_OPTIONS memory flag → OOM
5. **`npm ci` without `--include=dev`** → Railway sets `NODE_ENV=production` which causes npm to omit all devDependencies → `vite: not found` during build

## The Golden Rule for Railway npm installs
**ALWAYS use `npm ci --include=dev`** — never plain `npm ci`.
Railway sets `NODE_ENV=production` at build time. This causes npm to silently skip devDependencies,
so build tools like `vite` and `esbuild` are missing when the build command runs.
`--include=dev` forces all deps to install regardless of NODE_ENV.

**Why:** `vite` is a devDependency. Railway's production NODE_ENV skips it. Build fails with `sh: 1: vite: not found`.

## Working Configuration

`.nvmrc` (already exists):
```
20
```

`railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci --include=dev --no-audit --no-fund && NODE_OPTIONS='--max-old-space-size=4096' npm run build"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

`nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["python3", "gcc"]

[phases.install]
cmds = ["npm ci --include=dev --no-audit --no-fund"]

[phases.build]
cmds = ["NODE_OPTIONS='--max-old-space-size=4096' npm run build"]

[start]
cmd = "node dist/index.js"
```

`vite.config.ts` — use this pattern, NOT `import.meta.dirname`:
```ts
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## What NOT to Do
- Never use plain `npm ci` — always `npm ci --include=dev`
- Never add `nodejs_20`, `nodejs_18`, or any `nodejs_*` to nixpkgs
- Never use a Dockerfile (kept in repo but overridden by `builder = "NIXPACKS"`)
- Never use `import.meta.dirname` in any build-time file (vite.config, etc.)
- Never omit `buildCommand` from railway.toml — always set it explicitly with NODE_OPTIONS
