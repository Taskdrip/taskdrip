---
name: Startup schema drift
description: Existing database schema can lag behind the users query used by startup seeding.
---

The development server can start and serve requests while the startup admin seed logs a PostgreSQL missing-column error when the database schema lacks a legacy users column.

**Why:** The current database reported that `users.pi_wallet` was missing while the query still referenced it; this was unrelated to the Influencer CRM changes.

**How to apply:** Keep feature verification separate from this seed warning. If admin authentication or user loading fails, reconcile the users schema/query in a dedicated database task rather than changing unrelated feature code.