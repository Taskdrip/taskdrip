---
name: Hire Developer Panel - Admin & User Flow
description: Architecture of hire-developer flow, where data lives, key bugs fixed, and what must be done on Railway to fully apply fixes.
---

## Architecture

- Users submit via `POST /api/hire-developer` → creates a `direct_hire_offers` row where `influencerId = admin.id` AND sends a message to admin inbox.
- Admin sees these in **Order Delivery & Access Grants → Hires tab** (`OrderDeliveryAccessPanel`) which fetches `GET /api/admin/direct-hire`.
- The **admin-master.tsx Direct Hires tab** also shows all `direct_hire_offers` (both dev-hire and brand→influencer hires).
- Users see their requests in **Dashboard → Dev Projects tab** (`DevProjectsTab`) and **Brand Dashboard → Dev Projects tab**.
- `DevProjectsTab` fetches `GET /api/hire-developer/my-requests` which filters by `influencerId === admin.id`.

## isDevHire Flag

`GET /api/admin/direct-hire` now returns an `isDevHire: boolean` field on each offer:
- `true` = hire-developer request (user→admin)
- `false` = regular direct hire (brand→influencer)
`OrderDeliveryAccessPanel` shows 🛠 Dev Hire / 🤝 Direct Hire badge.

## Key Bugs Fixed

1. **N+1 queries** in `GET /api/admin/direct-hire` — was doing `getUser()` per offer × 2 (brand + influencer). Fixed by batching: collect all unique userIds, fetch in parallel, map.
2. **Admin tab label** now shows count: `"Hires (${adminDirectHires.length})"`.
3. **Refetch intervals** reduced from 30s to 8s for near-real-time admin panel.
4. **DB indexes** added to `direct_hire_offers` (brandId, influencerId, status, createdAt) via migration `0002_milky_brood.sql`.

## What Must Be Done on Railway

After deploying this code to Railway, run in Railway console:
```
npx drizzle-kit migrate
```
OR apply migration file `migrations/0002_milky_brood.sql` manually to add the 4 new indexes.

## Possible Cause of "0 Hires" on Railway

If `direct_hire_offers` rows are not appearing: the `createDirectHireOffer` call in `POST /api/hire-developer` (server/routes.ts) is wrapped in a try/catch that silently swallows errors. If Railway DB is missing a column referenced in the insert (schema drift), the insert fails with no user-visible error. Check Railway logs for "hire-offer insert failed" messages.

**Why:** `index` from drizzle-orm/pg-core was already imported in shared/schema.ts, so the index additions are safe.
