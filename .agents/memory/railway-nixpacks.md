---
name: Railway Nixpacks Deployment
description: Dockerfile build fails on Railway; Nixpacks is the correct approach for this project.
---

## The Rule
Never use `builder = "DOCKERFILE"` in `railway.toml` for this project. Always use Nixpacks (the default).

## Why
The Docker multi-stage build (`node:20-slim`) fails during the Railway "Build image" step. Root cause: the ~4MB Vite bundle requires significant memory during minification, and Railway's Docker builder has tighter memory constraints than Nixpacks. Also `node:20-slim` may lack Python/make/g++ for optional native packages.

## How to Apply
`railway.toml` — use buildCommand, no `builder` key:
```toml
[build]
buildCommand = "npm ci && npm run build"

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
cmds = ["NODE_OPTIONS='--max-old-space-size=2048' npm run build"]

[start]
cmd = "node dist/index.js"
```
