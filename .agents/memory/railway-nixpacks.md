---
name: Railway Nixpacks Deployment
description: Definitive Railway deployment config for this project — Nixpacks only, no Dockerfile.
---

## The Rule
Use Nixpacks on Railway. Force it via `builder = "NIXPACKS"` in `railway.toml`.
Never put `nodejs_20` (or any `nodejs_*`) in `nixpacks.toml` nixPkgs — it is an invalid Nix package name in Railway's Nixpacks version and causes an **immediate crash** in seconds.
Node.js version is controlled via `.nvmrc` (already set to `20`).

## Root Causes Encountered (in order)
1. Dockerfile present → Railway used Docker instead of Nixpacks → build fails due to memory/tools
2. `nodejs_20` in nixpkgs → invalid Nix package name → setup phase crashes in seconds
3. `import.meta.dirname` in vite.config.ts → only works on Node ≥ 20.11.0 → fixed with `fileURLToPath`
4. No `buildCommand` in railway.toml → Railway guesses build, may skip NODE_OPTIONS memory flag

## Working Configuration

`.nvmrc` (already exists):
```
20
```

`railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci --no-audit --no-fund && NODE_OPTIONS='--max-old-space-size=4096' npm run build"

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
cmds = ["npm ci --no-audit --no-fund"]

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
- Never add `nodejs_20`, `nodejs_18`, or any `nodejs_*` to nixpkgs
- Never use a Dockerfile (kept in repo but overridden by `builder = "NIXPACKS"`)
- Never use `import.meta.dirname` in any build-time file (vite.config, etc.)
- Never omit `buildCommand` from railway.toml — always set it explicitly with NODE_OPTIONS
