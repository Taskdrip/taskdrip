# Taskdrip Creator Publishing

Creator Publishing is an integrated Taskdrip feature for creators and influencers to draft books, submit ebooks and digital products for review, list approved products in the Taskdrip Shop, and track their publishing projects and sales.

## Architecture

- Frontend: React 18, Vite, React Query, and the existing Taskdrip UI components.
- Backend: Express and TypeScript. Publishing endpoints are registered by `server/creator-publishing.ts`.
- Authentication: Existing Passport local authentication and Express sessions.
- Database: PostgreSQL through Drizzle ORM and the shared schema.
- Commerce: Approved products become existing `shop_products`; purchases use the existing `purchases` records and verified sales are credited to the creator's existing Taskdrip wallet.

## Database

Publishing content is separate from its commercial listing:

- `creator_books`: book concept, outline, manuscript chapters, cover, and workflow status.
- `creator_publishing_products`: submitted digital-product listing, private file metadata, review status, and link to its Shop listing.
- `creator_product_earnings`: per-purchase gross amount, platform/referral fees, and creator net earnings.
- `creator_product_downloads`: secure download audit records.
- `creator_studio_subscriptions`: Creator Studio access payment and approval history. This is intentionally separate from Taskdrip's general `subscriptions` table so Studio approval does not change a user's other plan, verification, or platform-wide entitlements.
- `app_settings`: publishing sales-fee percentage and configurable monthly Creator Studio price.

Apply additive SQL migrations with:

```bash
npm run db:migrate
```

Do not use a destructive schema push on production data.

## Creator workflow

1. Sign in to an existing creator/influencer account or create one.
2. Open Creator Studio from the site menu or dashboard. A monthly Studio subscription is required for editing and publishing tools.
3. Choose a configured Taskdrip payment method, provide a transaction reference or payment-proof file, and submit the payment for admin review.
4. After approval, create a book draft, write chapters, optionally generate an outline or chapter draft, and save edits.
5. Upload the finished customer-ready PDF or EPUB and submit it for review.
6. Track drafts and review outcomes from Creator Studio or the dashboard. Project status tracking remains available while a subscription payment is awaiting review.
7. Approved ebooks and products appear in the existing Taskdrip Shop and on the creator's digital-products profile tab. Shop orders, earnings, and eligible downloads use existing purchase and wallet flows.

## Admin workflow

- Open **Creator Publishing** from the Admin dashboard or navigation.
- Set the product-sale platform fee and monthly Creator Studio access price. Setting the monthly price to $0 makes Studio access free.
- Review subscription payment references and private proof files; approve 30 days, reject with a reason, or revoke active Studio access.
- Review pending product submissions; approve them into the Taskdrip Shop or request creator changes.

All admin APIs check the publishing-admin permission on the server.

## API

Creator-facing routes require an authenticated creator/influencer account. Manuscript, product-editing, AI, and earnings routes also require active Studio access.

- `GET /api/creator-studio/plan` — public monthly price.
- `GET /api/creator-studio/access` — signed-in creator's access and payment status.
- `POST /api/creator-studio/subscribe` — submit a monthly payment reference/proof for admin review.
- `GET/POST/PATCH /api/creator-studio/books` and `POST /api/creator-studio/books/:id/submit` — book drafts and ebook review submissions.
- `GET/POST/PATCH/DELETE /api/creator-studio/products` and `POST /api/creator-studio/products/:id/submit` — digital-product drafts and review submissions.
- `POST /api/creator-studio/ai/outline` and `/api/creator-studio/ai/chapter` — optional AI drafting.
- `GET /api/creator-studio/projects` — authenticated creator project status for dashboard tracking.
- `GET /api/creator-studio/earnings` — creator sales and earnings.
- `GET /api/admin/creator-studio/subscriptions` and `PATCH /api/admin/creator-studio/subscriptions/:id` — admin access-payment review.
- `GET/PUT /api/admin/publishing-settings` and `GET/PATCH /api/admin/publishing-products` — admin pricing, sales fee, and product review.
- `GET /api/admin/creator-studio/subscriptions/:id/proof` — authenticated admin-only payment-proof access.

## Payment and access

The current Taskdrip subscription checkout collects a payment method, transaction reference and/or proof, then waits for an admin to verify it. Creator Studio uses the configured methods for the `subscriptions` feature and the same review pattern. It does not report access as active before admin approval.

This is not automatic card/Paystack/Stripe settlement. If an automatic gateway is needed, it requires a separate provider integration and verified webhook flow.

## AI

Creator Studio supports complete-book generation, outlines, chapters, metadata, and writing tools through:

- Groq-hosted models through `GROQ_API_KEY`.
- Any reachable OpenAI chat-completions-compatible endpoint through `BOOK_AI_BASE_URL` and, when required, `BOOK_AI_API_KEY`.
- Ollama-compatible endpoints. The model server must be reachable from the Taskdrip server; `localhost` only works when Ollama runs in the same network/container.

The admin **Creator Publishing → Ebook generation settings** panel lets publishing admins select the provider, endpoint, model identifier, chapter defaults, child age band, illustration direction, shared and per-tool prompts, temperature, and output-token limits. API keys are never entered into this form or stored in the settings database.

### Configure on Railway

1. Open the Railway project and select the Taskdrip service.
2. Open **Variables** and add the provider's variable names and secret values:
   - Groq: `GROQ_API_KEY`
   - Other authenticated OpenAI-compatible service: `BOOK_AI_API_KEY` and `BOOK_AI_BASE_URL`
   - Ollama: configure a reachable endpoint URL in the admin panel; use `BOOK_AI_API_KEY` only if the endpoint requires it.
3. In Creator Publishing, select the matching provider and enter the model identifier. For an OpenAI-compatible or Ollama endpoint, enter its `/v1` base URL.
4. Save the settings and redeploy the service after changing Railway variables.

In Replit, add the same variable names through Secrets. Open-weight model families and hosted model catalogs change; verify each selected model's license, inference availability, cost, context length, and commercial-use terms. The application does not claim one model is universally “best” or license-free.

AI output is a draft for the creator to review, edit, and fact-check. It is not presented as verified research.

## Files and security

- Manuscript and digital-product source files are kept in private server directories and are not returned as public URLs.
- Product delivery checks the authenticated buyer's Taskdrip purchase before serving a download.
- Payment proof is only served through an authenticated admin route.
- Uploads have file-extension allowlists and size limits. Do not store credentials or payment secrets in manuscript or proof fields.
- Local-disk uploads require persistent storage in production and are not shared across multiple server instances. Move to durable private object storage before relying on ephemeral or horizontally scaled deployments.

## Publishing and exports

Creator Studio saves structured, editable page designs and exports print-interior PDF, EPUB 3, DOCX, standalone HTML, front-cover PNG, and paperback full-wrap cover PDF. The admin can create a 16-story Bible coloring-book draft with 135 designed interior pages, read-aloud retellings, scripture references, parent guides, questions, activities, colored examples, and black-line coloring pages.

Exports are publication drafts, not guaranteed KDP or Google Play Books approvals. This sample has editable author/copyright placeholders and includes color-example pages. For print, select a suitable color-interior option, verify trim, margins, bleed, paper, page count, metadata, and cover dimensions in the current KDP setup, and inspect the exported PDF in KDP Print Previewer. A black-and-white interior requires removing or converting the color-example pages and rechecking the output. The studio does not automatically submit books to Amazon or Google.

## Deployment and testing

1. Configure PostgreSQL and the existing `SESSION_SECRET`.
2. Run `npm run db:migrate`.
3. Configure a supported AI provider only if model-backed generation is required.
4. Start the app with `npm run dev`; build production assets with `npm run build`.
5. Verify admin provider settings and book creation, then review PDF/EPUB exports in their intended publishing previewers.

Automated tests for the new subscription lifecycle and browser checkout flow should be added before production launch.

## Future extensions

- Automatic payment settlement and renewal webhooks.
- Durable private object storage for product files and payment evidence.
- AI-generated original raster illustrations and matching line-art assets.
- Automated preflight for content quality, font embedding, page margins, image resolution, and store-specific packaging.
