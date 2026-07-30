---
name: Railway preDeployCommand wipes seeded data
description: railway.json preDeployCommand with db:push --force destroys all seeded DB data on every Railway deploy — the true source of disappearing courses.
---

## Rule
Never put `db:push --force` (or any destructive Drizzle command) in `railway.json` `preDeployCommand`. It runs before every deploy and wipes all seeded rows.

**Why:** Railway's `preDeployCommand` in `railway.json` overrides and runs independently of `nixpacks.toml`. Even with a safe `nixpacks.toml` start command, the pre-deploy step destroys data before the app boots. This caused all BreedSkool courses to vanish after every deployment.

**How to apply:** If schema migrations are needed on Railway, use the startup-migrations pattern (`ALTER TABLE IF EXISTS … ADD COLUMN IF NOT EXISTS`) instead of `db:push --force`. The `railway.json` `preDeployCommand` field should be absent or set to a safe read-only check.

## Safe alternative
Schema evolution is handled by `server/startup-migrations.ts` which uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` — safe to run on every boot without data loss.
