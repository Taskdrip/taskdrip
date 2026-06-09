---
name: Admin Dashboard TDZ Fix
description: Root cause and fix for "Cannot access 'X' before initialization" on admin dashboard in Railway production builds.
---

## The Rule
`admin-master.tsx` must be lazy-loaded in `App.tsx` using `React.lazy()`. Never use a static import.

**Why:** admin-master.tsx is 9000+ lines and pulls in recharts, zod, many UI components, and custom hooks. When statically imported, it joins the main synchronous bundle. Rollup/esbuild then encounters circular module references inside this massive import tree and produces TDZ errors in production (minified) builds. The variable name changes each build (Wu, po, Co, Hm) because Rollup assigns new minified names — but the underlying cause is always the same circular dep.

**How to apply:** In `client/src/App.tsx`:
- Use `const AdminDashboard = lazy(() => import("@/pages/admin-master"))` — never `import AdminDashboard from ...`
- `AdminErrorBoundary` wraps the Suspense fallback internally (already done) so no call-site changes needed.
- This creates `admin-master-HASH.js` as a separate async chunk, completely isolated from main bundle init.

## Related fixes made
- TipTap removed from `RichTextEditor.tsx` entirely (replaced with native contenteditable). No @tiptap packages in codebase.
- `vite.config.ts` has NO manualChunks — manual chunking caused circular chunk→chunk dependencies that also produced TDZ errors.
- `nixpacks.toml` start cmd runs `npm run db:push --force && node dist/index.js` so Railway syncs missing DB tables on every deploy.
- Railway DB was missing `breedskool_course_pricing` table and `ai_provider` column — the db:push hook fixes this automatically.
