---
name: Declared dependencies may be absent
description: Workspace setup can have package.json entries without matching installed modules.
---

The workspace may contain valid dependency declarations while `node_modules` is incomplete after a restore or migration. Check `npm ls <package>` before treating missing-module startup or build errors as application regressions.

**Why:** The app’s existing server and certificate page failed to start/build only because declared `helmet` and `jspdf` packages were absent from the installed dependency tree.

**How to apply:** Restore the already-declared package versions through the project package manager, then restart the workflow and rerun the relevant build/check before changing application code.