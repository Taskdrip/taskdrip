---
name: Admin Dashboard TDZ Fix
description: Root cause and fix for "Cannot access 'X' before initialization" on admin dashboard in Railway production builds.
---

## The Rule
Every page in App.tsx must use `React.lazy()`. Never use static imports for page components.

**Why:** The main bundle had ~85 static page imports all bundled into one 3.19MB chunk. Rollup had to order ALL module initializers in a single sequence. When any page had an ordering conflict (even inside a node_module dependency), Rollup produced TDZ errors with the failing `const`/`let` variable name changing each build (minification assigns new names each time). Making every page lazy creates 239 isolated chunks — each page loads asynchronously, there's no cross-page initialization order to conflict.

**Result:** Main bundle dropped from 3.19MB → 430KB. Each page is its own chunk. Admin-master is its own 396KB async chunk.

**How to apply:** In `client/src/App.tsx`:
- `const PageName = lazy(() => import("@/pages/page-name"))` for every page
- For named exports: `lazy(() => import("@/pages/foo").then(m => ({ default: m.NamedExport })))`
- Wrap `<Router>` with `<Suspense fallback={<PageFallback />}>` at the top level
- `AdminErrorBoundary` wraps admin routes and includes its own Suspense fallback

## Related fixes
- TipTap removed from `RichTextEditor.tsx` (replaced with native contenteditable).
- `vite.config.ts` has NO manualChunks.
- `nixpacks.toml` start cmd: `npm run db:push --force && node dist/index.js` (syncs DB schema on every Railway deploy).
