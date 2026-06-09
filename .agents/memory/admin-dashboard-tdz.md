---
name: Admin Dashboard TDZ Fix
description: Root cause and fix for "Cannot access 'X' before initialization" on admin dashboard in Railway production builds.
---

## The Rule
Every page in App.tsx must use `React.lazy()`. AND all top-level `const`/`let` declarations inside any page file must be defined BEFORE any `function` or `export default function` that could reference them.

**Why:** Two separate issues can cause TDZ in production builds:
1. Static page imports → Rollup bundles everything into one 3.19MB chunk and can produce ordering conflicts.
2. `const` declarations placed AFTER the `export default function` (or deep in the file after all function defs) → Rollup may access the const before the module has executed that line, especially when the chunk has circular import edges.

**Specific fix applied (June 2026):** `PLATFORM_OPTIONS` and `PLATFORM_QUICK_PRESETS` were defined at lines 7933 and 8565 — AFTER `export default function AdminMaster()` at line 1919. Moved both to lines 184/197 (top-level const section, before all function declarations). Production build confirmed clean at 396KB.

**Result:** Main bundle dropped from 3.19MB → 430KB. Each page is its own chunk. Admin-master is its own 396KB async chunk. No TDZ errors.

**How to apply:** In `client/src/App.tsx`:
- `const PageName = lazy(() => import("@/pages/page-name"))` for every page
- For named exports: `lazy(() => import("@/pages/foo").then(m => ({ default: m.NamedExport })))`
- Wrap `<Router>` with `<Suspense fallback={<PageFallback />}>` at the top level
- `AdminErrorBoundary` wraps admin routes and includes its own Suspense fallback

**The golden rule for admin-master.tsx:** ALL top-level `const`/`let` must be declared BEFORE the first `function` declaration (line ~212). Never add new constants after the `export default function AdminMaster()` line.

## Second TDZ fixed (June 2026) — inside AdminMaster function body

`const bsEffectiveSettings = { ...bsPaymentSettings, ...bsSettings }` was at line ~2005, but `bsPaymentSettings` was declared at line ~2161 via `useQuery`. Production Rollup/Terser minified `bsPaymentSettings` → `Wa`, throwing "Cannot access 'Wa' before initialization".

**Fix:** Move `bsEffectiveSettings` to immediately after the `bsPaymentSettings` useQuery call.

**Prevention:** In large React components with many `useQuery` hooks, NEVER spread/read a query result's `data` value in a `const` that appears BEFORE the `useQuery` call in the function body. Closures (onSuccess, useEffect callbacks) are safe because they execute after all declarations have run.

## Related fixes
- TipTap removed from `RichTextEditor.tsx` (replaced with native contenteditable).
- `vite.config.ts` has NO manualChunks.
- `nixpacks.toml` start cmd: `npm run db:push --force && node dist/index.js` (syncs DB schema on every Railway deploy).
