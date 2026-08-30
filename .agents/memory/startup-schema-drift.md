---
name: Startup schema drift
description: Existing database schema can lag behind startup seeds and current ORM queries.
---

The development server can start and serve requests while startup seeds log PostgreSQL missing-column errors when an imported database lags behind the current schema. Course seeding can be blocked by missing sale pricing columns even though the courses table otherwise exists.

**Why:** Imported databases may have older table shapes; additive compatibility migrations let current features seed without a forced schema push that could be destructive in deployment environments.

**How to apply:** Keep feature verification separate from seed warnings. Prefer `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` compatibility entries for non-destructive missing columns; avoid forced schema pushes. If admin authentication or user loading fails, reconcile that schema/query in a dedicated database task rather than changing unrelated feature code.