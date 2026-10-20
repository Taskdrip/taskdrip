---
name: Free-download detail and access flow
description: Public resource details and per-account Adsterra unlock behavior.
---

Public resource detail pages must remain readable and SEO-visible even when user-specific unlock state or view tracking is unavailable. Unknown access state must remain locked; only a confirmed Smartlink redirect unlocks the item's official resource link.

**Why:** Resource discovery should not depend on a logged-in account's optional status or analytics queries, while the download gate must never infer that an unverified user completed the redirect.

**How to apply:** Use the public full-detail response as a content fallback for signed-in pages, log but do not let non-critical access/analytics failures hide resource information, and preserve the first-click Smartlink then return-and-click official-link flow.
