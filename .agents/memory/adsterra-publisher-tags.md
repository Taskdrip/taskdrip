---
name: Adsterra publisher tags
description: Rules for configuring Adsterra script sources in Taskdrip.
---

Do not infer a Native or Social Bar script hostname from its 32-character zone ID. Use the complete HTTPS `src` URL supplied for that specific Ad Unit. Static iframe banners may use Adsterra's standard `invoke.js` URL when the publisher code matches it; allow an exact URL override.

**Why:** Adsterra's generated script hosts can vary by unit and format, so a plausible-looking guessed hostname can leave a slot blank.

**How to apply:** When adding or changing Adsterra placements, keep exact publisher URLs configurable in the admin UI, validate HTTPS, and avoid enabling formats that have no required tag URL.
