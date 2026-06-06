---
name: Railway Nixpacks Deployment
description: Dockerfile build fails on Railway; Nixpacks is the correct approach for this project.
---

## The Rule
Never use a Dockerfile for Railway deployments on this project. Always use Nixpacks.
Force Nixpacks explicitly with `builder = "NIXPACKS"` in `railway.toml` — this overrides any Dockerfile that exists.

## Why
1. The Docker multi-stage build (`node:20-slim`) fails during the Railway "Build image" step with `ERR_MODULE_NOT_FOUND`. Root cause: `node:20-slim` floating tag may resolve to older Node 20.x builds lacking `import.meta.dirname` support (requires Node >= 20.11.0), and may lack Python/make/g++ for optional native packages.
2. `vite.config.ts` originally used `import.meta.dirname` which is Node 20.11.0+ only — replaced with `fileURLToPath(import.meta.url)` pattern which works on all Node 20+.
3. When both Dockerfile and nixpacks.toml exist, Railway picks Dockerfile unless `builder = "NIXPACKS"` is set in `railway.toml`.

## How to Apply

`railway.toml` — force Nixpacks, no `buildCommand` (nixpacks handles it):
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

`nixpacks.toml` — add memory headroom and build tools:
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "python3", "gcc"]

[phases.install]
cmds = ["npm ci --no-audit --no-fund"]

[phases.build]
cmds = ["NODE_OPTIONS='--max-old-space-size=4096' npm run build"]

[start]
cmd = "node dist/index.js"
```

`vite.config.ts` — never use `import.meta.dirname`, use this instead:
```ts
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

## What NOT to Do
- Do not add `buildCommand` to `railway.toml` (nixpacks.toml handles the build phases)
- Do not use `node:20-slim` in a Dockerfile for this project
- Do not use `import.meta.dirname` anywhere in the build pipeline
