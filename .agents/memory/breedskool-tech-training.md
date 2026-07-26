---
name: BreedSkool Tech Training Registration
description: New student registration feature for ₦-priced tech courses; schema, routes, import pattern, and all known bugs/fixes.
---

## Tables
- `breedskool_course_pricing` — courses with NGN prices (webdev, ai_content, social_monetize, trading, onsite_training, home_lesson)
- `breedskool_registrations` — student sign-up records (includes `linked_course_id` nullable varchar)
- `course_assignments` — courseId, userId, lessonId, title, description, fileUrl, fileName, fileType, status, tutorFeedback, submittedAt

## Routes
All in `server/routes.ts` inside `registerRoutes()`:
- `GET /api/breedskool/pricing` — public
- `POST /api/breedskool/register` — public, multipart/form-data (upload.single('paymentProof'))
- `GET /api/my/breedskool-registrations` — student's own registrations
- `GET/POST /api/courses/:id/assignments` — student assignment CRUD
- `GET/PATCH /api/admin/breedskool/pricing/:id` — admin
- `GET/PATCH /api/admin/breedskool/registrations/:id` — admin

## Critical import pattern
`server/routes.ts` imports **named exports** from `@shared/schema`, not the namespace. Always add new table names to the destructured import on line 11. Using `schema.tableName` causes "schema is not defined" runtime error.

**Why:** The existing routes file predates any namespace import; it uses individual named imports throughout.

## Critical Bug 1: linkedCourseId in INSERT (500 error on enrollment)
Adding `linkedCourseId: null` to the `db.insert(breedskoolRegistrations).values({...})` call causes a 500 error on any environment where `linked_course_id` column hasn't been migrated yet. Fix: omit `linkedCourseId` from the initial INSERT, then do a separate UPDATE inside the already-wrapped try/catch after auto-enrollment succeeds.

**Why:** The INSERT is outside the try/catch that wraps auto-enrollment logic, so a column-missing error kills the entire registration and returns 500.

## Critical Bug 2: Course Filter Bug (no courses shown in step 3)
`onlineCourseKeys = new Set(["webdev", "ai_content", "social_monetize", "trading"])` in `breedskool.tsx` caused NO courses to show when admin configures courses with different keys. Fix: show all `isActive` courses except `onsite_training` and `home_lesson` for online mode.

## Content Scanner
- `/api/breedskool` must be in `SCAN_SKIP_PATHS` in `server/routes.ts`
- `transactionRef` must be in `SCAN_SKIP_FIELDS` (user-provided payment hash — must not be scanned)

## Frontend (breedskool.tsx)
- Client-side validation before registerMutation.mutate(): checks fullName, email, phone, selectedCourseKey, and for pay_now requires transactionRef OR proofFile
- Loading spinner shown inside "Complete Enrollment" button while isPending
- `RegistrationModal` accepts `initialDeliveryMode` prop; `useEffect` resets form on open
- Step flow: 1→2→3→4 for online; 1→2→4 for onsite/home_lesson

## Critical Bug 3: bsPaySettings ReferenceError (blank page on step 4)
`bsPaySettings` was defined in the parent `BreedSkool` component but referenced inside `RegistrationModal`. Fix: add `useQuery` for `/api/breedskool/payment-settings` directly inside `RegistrationModal`.

**Why:** Top-level sibling React components do NOT share closure scope.

## Dashboard (simple-dashboard.tsx)
Training tab includes:
- Per-registration quick-link grid: Lessons / Community / Tutor Chat
- Onsite venue info (MapPin) for physical mode students
- Student Resources panel (4 cards: Course Library, Community Chat, Assignments, Certificates)
- Influencer Earnings Bridge: campaigns/brands/wallet/referrals + platform stats

## Home lesson validation
Step 1 next() requires `childName` and `homeAddress` when `deliveryMode === "home_lesson"`.

## Imported database compatibility
When an imported database predates the current Drizzle schema, preserve its required legacy pricing columns in the shared schema and seed values rather than relying on a destructive schema push.

**Why:** The development database can contain older non-null columns that cause ORM inserts to fail even though the current migration snapshot no longer declares them.

**How to apply:** Inspect `information_schema.columns` before changing BreedSkool pricing seed logic; add nullable compatibility columns/migrations and populate both legacy and current fields when needed.
