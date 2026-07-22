# Taskdrip

**Taskdrip™** is a production-ready SocialFi SaaS platform that connects brands with creators and influencers globally.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express + TypeScript (tsx)
- **Database**: PostgreSQL via Drizzle ORM (`@neondatabase/serverless` / `pg`)
- **Auth**: Passport.js (local strategy) + express-session
- **Other**: TipTap rich-text editor, Recharts, React Query, Framer Motion

## How to run

```bash
npm run dev       # starts both frontend (Vite) and backend (tsx server/index.ts)
npm run build     # production build
npm run db:push   # apply schema changes to database
```

The dev server runs on port 5000.

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ (auto-injected by Replit) |
| `SESSION_SECRET` | Session signing key | ✅ |
| `SENDGRID_API_KEY` | Transactional email | For email features |
| `GROQ_API_KEY` | AI-powered features | For AI features |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push notifications | For push features |
| `GEMINI_API_KEY` | Auto-blogger AI rewriting | For auto-blogger |
| `GOOGLE_PLACES_API_KEY` | Lead gen — business discovery | For lead gen |
| `YOUTUBE_API_KEY` | Lead gen — influencer discovery | For lead gen |
| `OPENAI_API_KEY` | Additional AI features | Optional |

## Key pages

- `/` — Landing page
- `/campaigns` — Browse campaigns
- `/influencers` — Creator marketplace
- `/breedskool` — Course platform
- `/admin` — Admin dashboard (admin credentials set at first run)
- `/dashboard` — User dashboard

## User preferences

<!-- Add user preferences here -->
