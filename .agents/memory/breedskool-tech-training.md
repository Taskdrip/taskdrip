---
name: BreedSkool Tech Training Registration
description: New student registration feature for 4 Nigerian-priced tech courses; schema, routes, and import pattern.
---

## Tables
- `breedskool_course_pricing` — 4 courses seeded (webdev, ai_content, social_monetize, trading) with NGN prices
- `breedskool_registrations` — student sign-up records (no auth required)

## Routes
All in `server/routes.ts` inside `registerRoutes()`:
- `GET /api/breedskool/pricing` — public
- `POST /api/breedskool/register` — public, multipart/form-data
- `GET/PATCH /api/admin/breedskool/pricing/:id` — admin
- `GET/PATCH /api/admin/breedskool/registrations/:id` — admin

## Critical import pattern
`server/routes.ts` imports **named exports** from `@shared/schema`, not the namespace. Always add new table names to the destructured import on line 14. Using `schema.tableName` causes runtime "schema is not defined" error.

**Why:** The existing routes file predates any namespace import; it uses individual named imports throughout.

## Frontend
- `client/src/pages/breedskool.tsx` — overhauled with tech training hero, 4 course cards (₦ pricing), 3-step registration modal (info → course → payment), currency converter (₦1650/$1 black market rate), welcome modal with WhatsApp (+12016800266) and Telegram (t.me/taskdrip) CTAs
- `client/src/pages/final-landing.tsx` — BreedSkool section added between TierShowcase and Direct Hire CTA
- `client/src/pages/admin-courses.tsx` — `BreedSkoolManagementPanel` component added for pricing/discount editing and registration review
