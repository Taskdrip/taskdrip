---
name: Declared dependencies may be absent
description: Workspace setup can have package.json entries without matching installed modules.
---

The workspace may contain valid dependency declarations while `node_modules` is incomplete after a restore or migration. Check `npm ls <package>` before treating missing-module startup or build errors as application regressions. When restoring, use the exact versions recorded in the lockfile; installing broad ranges can trigger peer conflicts or resolve a different dependency tree. Verify package manifests afterward because the installer may rewrite them.

**Why:** The app’s existing server and certificate page failed to start/build only because declared packages such as `helmet`, `jspdf`, and `bcryptjs` were absent from the installed dependency tree. A range-based recovery also hit a TipTap peer conflict and changed manifests, while exact lockfile versions restored a buildable tree.

**How to apply:** Restore dependency versions from the lockfile through the project package manager, then confirm the manifest/lockfile are unchanged, restart the workflow, and rerun the relevant build/check before changing application code.