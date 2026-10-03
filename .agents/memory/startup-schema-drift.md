---
name: Startup schema drift
description: Existing database schema can lag behind startup seeds and current ORM queries.
---

The development server can start and serve requests while startup seeds log PostgreSQL missing-column errors when an imported database lags behind the current schema. Course seeding can be blocked by missing sale pricing columns even though the courses table otherwise exists. In a workspace with no initialized schema, route registration and database-backed endpoints can fail even though standalone frontend routes still render.

**Why:** Imported databases may have older table shapes or no initialized tables; additive compatibility migrations let current features seed without a forced schema push that could be destructive in deployment environments. Public contact mail can also depend on database-backed settings/logging even when it only needs a mail provider.

**How to apply:** Keep feature verification separate from seed warnings. Prefer `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` compatibility entries for non-destructive missing columns; avoid forced schema pushes. For a standalone public contact form, use the configured email connector directly if database settings/logging are unavailable. If admin authentication or user loading fails, reconcile that schema/query in a dedicated database task rather than changing unrelated feature code.