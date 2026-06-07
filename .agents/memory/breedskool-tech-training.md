---
name: BreedSkool Tech Training Registration
description: New student registration feature for 4 Nigerian-priced tech courses; schema, routes, import pattern, and blank-page bug fix.
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

## Critical bug: bsPaySettings ReferenceError (blank page on step 4)

**What:** `bsPaySettings` was defined only inside the `BreedSkool` default export but referenced inside `RegistrationModal`, a separate top-level function that has no closure access to `BreedSkool`'s scope. This crashed the component silently when step 4 rendered, showing a blank `/breedskool` page.

**Fix:** Added `useQuery` for `/api/breedskool/payment-settings` directly inside `RegistrationModal`. TanStack Query caches the result — no extra network round-trip.

**Why:** Top-level sibling React components do NOT share closure scope. Any query data a component needs must be fetched inside it or passed as a prop — never assumed to be inherited from a sibling or parent defined elsewhere in the same file.

## Delivery-mode pre-selection (online / onsite / home_lesson)
- `RegistrationModal` accepts `initialDeliveryMode` prop (defaults to "online").
- A `useEffect` resets `form.deliveryMode` and jumps back to step 1 whenever the modal opens with a new mode.
- `BreedSkool` tracks `regModalMode` state and calls `openRegModal(mode)` helper before `setShowRegModal(true)`.
- "Book Onsite Spot" → `openRegModal("onsite")`, "Book Home Lesson" → `openRegModal("home_lesson")`, all others → `openRegModal("online")`.

## Home lesson validation
Step 1 `next()` now requires `childName` and `homeAddress` when `deliveryMode === "home_lesson"`.
