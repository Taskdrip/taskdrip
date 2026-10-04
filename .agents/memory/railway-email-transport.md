---
name: Railway email transport
description: Why email that works through a Replit integration may fail after deployment to Railway.
---

Replit-managed connector credentials are injected in the Replit runtime and are not available to an app running on Railway. Production email paths must use a native `RESEND_API_KEY` and a verified sender address; keep the Replit connector as the workspace fallback. A successful development submission does not confirm Railway delivery.

**Why:** The public Taskdrip domain is served by a Railway-configured deployment, while Replit's connected Resend integration was only available in the workspace; production submissions returned delivery failures.

**How to apply:** For email handlers that do not use the database-backed mail settings, use the Resend SDK when `RESEND_API_KEY` is configured, use the connector only when Replit's connector host is present, and fail clearly if neither transport exists. Verify delivery after a Railway redeploy.