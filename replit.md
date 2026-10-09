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
npm run db:migrate  # apply all SQL migrations non-interactively (use this on fresh DBs)
npm run db:push   # interactive schema push via drizzle-kit (requires a TTY)
```

The dev server runs on port 5000.

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ (auto-injected by Replit) |
| `SESSION_SECRET` | Session signing key | ✅ |
| `SENDGRID_API_KEY` | Transactional email | For email features |
| `GROQ_API_KEY` | Groq-hosted Creator Studio models | For Groq-backed AI features |
| `BOOK_AI_BASE_URL` / `BOOK_AI_MODEL` | OpenAI-compatible or Ollama-compatible Creator Studio model | Optional |
| `BOOK_AI_API_KEY` | Credential for an OpenAI-compatible model endpoint | Optional; set only in Replit Secrets or deployment Variables |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push notifications | For push features |
| `GEMINI_API_KEY` | Auto-blogger AI rewriting | For auto-blogger |
| `GOOGLE_PLACES_API_KEY` | Lead gen — business discovery | For lead gen |
| `YOUTUBE_API_KEY` | Lead gen + Influencer CRM robot | For influencer crawl |
| `OPENAI_API_KEY` | Additional AI features | Optional |

## Ebook design studio

- `/creator-studio` includes an editable prompt-to-book designer, full-book generation, and PDF/EPUB/DOCX/HTML/cover exports. Publishing admins select Groq, any OpenAI-compatible endpoint, or Ollama in Creator Publishing settings.
- Store API keys only in Replit Secrets or the deployment provider's secret-variable manager. Railway: open the service's **Variables**, set `GROQ_API_KEY` or `BOOK_AI_API_KEY` and `BOOK_AI_BASE_URL`, then redeploy. Never put keys in the AI settings form or database.
- The built-in God’s Big Story draft has 20 illustrated Bible stories and 167 designed interior pages, including a read-aloud, scripture reference, family questions, an assignment, a colored example, and a matching black-line coloring page with a mini color reference. Its layered storybook illustrations include gentle motion in digital previews; print exports remain static. Choose a color print interior and inspect every export in the target store's current previewer.
- Exports: trim-sized print-interior PDF, front-cover PNG, reflowable EPUB 3, DOCX, and standalone HTML. A KDP paperback still needs a separate full-wrap cover. Review output in the target store's previewer; the studio does not guarantee store acceptance.

## Key pages

- `/admin/influencer-crm` — **Influencer CRM** — AI robot crawler, tier-based segments, outreach hub (NEW)
- `/` — Landing page
- `/campaigns` — Browse campaigns
- `/influencers` — Creator marketplace
- `/breedskool` — Course platform
- `/admin` — Admin dashboard (admin credentials set at first run)
- `/dashboard` — User dashboard (influencers/regular users)
- `/brand-dashboard` — Brand dashboard with "Direct Hires" tab for tracking hire requests
- `/hire-developer` — Submit a developer hire request
- `/direct-hire/:id` — Track a specific hire project + project chat
- `/admin/plugin-studio` — Build WordPress plugin ZIPs, manage SEO/shop listings, and download releases

## Hire Developer Process Flow

1. Client fills `/hire-developer` form — creates a hire request (`direct_hire_offers` table)
2. Admin sees it under "Hires" tab in Order Delivery & Access Grants panel
3. Admin chats with client via "Chat with Client" → links to `/direct-hire/{id}` project chat
4. Admin generates invoice via "Generate Invoice" button — stores `invoiceNumber`, `invoiceDueDate`, `agreedBudget`, `invoiceNote` + notifies client
5. Client sees invoice on `/direct-hire/{id}` and can print/download it
6. Client submits payment → admin activates project
7. Both parties track progress through the project page

## Replit setup notes

- Dependencies: run `npm install` after cloning (node_modules are not committed)
- Database: Replit provisions PostgreSQL automatically; `DATABASE_URL` is injected at runtime
- Schema: run `npm run db:push` once after cloning (or after schema changes) to apply the Drizzle schema
- `SESSION_SECRET` is stored as a Replit secret ✅
- Default admin seeded on first run: `demo@taskdrip.online` / `Admin@2024` — **change before going live**
- Dev server: port 5000, workflow "Start application" (`npm run dev`)
- Production build outputs to `dist/index.js` (ESM)

## WordPress Plugin Studio

- Admins can open **Admin → Products → Plugin Studio** or `/admin/plugin-studio`. The first package is CourseBridge Pro for LearnPress and WooCommerce; new packages currently use this same course-bridge generator template.
- Published plugin packages become normal Taskdrip Shop digital products and use the existing shop checkout/payment review flow. A buyer can download the ZIP after the existing purchase record reaches a verified paid/approved state.
- The generated WordPress ZIP includes the plugin code, install readme, SEO/shop metadata, and a WordPress.org release checklist. It does not upload to the WordPress.org SVN repository or bypass WordPress.org review. The current premium package has no separate free directory edition.
- Each WordPress installation configures its own Resend sender and API key in the plugin settings (or `wp-config.php`). Taskdrip/Replit does not receive or embed the buyer's Resend key.

## User preferences

<!-- Add user preferences here -->
