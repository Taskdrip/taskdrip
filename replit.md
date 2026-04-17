# Overview

Taskdrip™ is a production-ready Web3 SocialFi SaaS platform that connects brands with creators/influencers globally. Creators earn cryptocurrency by completing brand campaigns. Brands discover vetted creators through an advanced tier-based discovery system. The platform features non-custodial crypto payments, automatic creator tier classification, and a comprehensive campaign management system.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preferences: Clean, professional web app design with white background and black or gradient fonts.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Design System**: Clean, modern interface with white background, black fonts, and smooth transitions

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **File Uploads**: Multer for handling multipart/form-data

### Key Components

#### Authentication System
- Custom email/password authentication system (fully replaced Replit Auth)
- Secure password hashing using bcrypt with salt
- Session-based authentication with PostgreSQL session store
- Comprehensive password recovery system with token generation
- User profile management with creator/brand user types
- Professional signup and login pages with form validation
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA via speakeasy + QR code setup at `/security`
- **Password Change**: Users can change their password from the Security Settings page
- **Email Change**: Users can update their email (requires password confirmation)
- **Admin User Controls**: Admins can reset passwords, update emails, and disable 2FA for any user
- **Login 2FA Flow**: Login page handles 2FA step with code input screen
- **Fixed brand login 404**: Login now immediately sets auth state via `queryClient.setQueryData` before redirecting
- Demo accounts: admin `demo@taskdrip.online / Admin@2024`, brand `demobrand@taskdrip.online / Brand@2024`, creator `democreator@taskdrip.online / Creator@2024`

#### Campaign & Tasks Engine
- **Public Tasks Page** (`/tasks`): Visually stunning page with hero, live stats, auto-rotating spotlight carousel, category filters, and task cards
- **Spotlight Carousel**: Auto-rotates every 5.5s across all pages (Tasks, BreedSkool, Shop, P2P Hub). Features prev/next arrows, dot navigation, fade transitions. Prioritizes `isFeatured=true` items, falls back to items with feature images.
- `campaigns` schema now has `isFeatured: boolean` field. Admin can toggle spotlight per task with "Spotlight/Unspotlight" button in the Tasks admin tab.
- **Apply button real-time state**: Spotlight carousel's Apply button shows "Applied Already" (green, with checkmark) when the current user has already applied to that campaign.
- Campaign creation by brands (with escrow payment flow) and direct admin task creation
- Full admin task management: create/edit/delete/activate/deactivate/spotlight tasks
- Task-based completion system for creators
- Participation tracking and approval workflow (admin approve/reject applicants)
- **Brand is primary reviewer** of task submissions — approve/reject with notes triggers USDT payment
- **Admin as mediator** — can oversee all submissions and intervene in disputes
- Category-based campaign organization (Social Media, Gaming, Technology, Crypto & Web3, etc.)
- Interaction chain: Brand posts → escrow → admin verifies → active → creator applies → admin approves → creator submits → brand reviews → brand releases payment (admin can mediate)
- Demo brand account: `demobrand@taskdrip.online` / `Brand@2024` with 6 active demo campaigns
- Admin can edit all campaigns (including demo brand campaigns) from the "Tasks Mgmt" admin tab

#### Direct Hire Feature
- **Direct Hire flow**: Brands can hire influencers directly without a campaign
- Brand views a creator profile → clicks "Hire Me" button (only visible to brand users) → fills offer form (title, description, deliverables, budget, deadline)
- Influencer accepts or declines from `/direct-hire/:id` page or their dashboard "Hire Offers" section
- After acceptance, brand pays USDT to admin escrow wallet and submits payment proof (TX hash + screenshot)
- Payment proof remains visible on the project page with full-screen zoom controls, transaction hash copy action, and an AI-style blockchain verification report.
- Admin verifies payment and activates the project
- Active projects include attached brand/creator messaging, influencer work submission, brand revision request or approval, mutual reviews, and wallet ledger allocation.
- **Status flow**: `pending` → `accepted` → `payment_submitted` → `active` → `work_submitted` → `revision_requested` or `completed` (or `rejected`/`cancelled`)
- Schema: `directHireOffers` table in `shared/schema.ts`
- API routes: `POST /api/direct-hire`, `GET /api/direct-hire/sent`, `GET /api/direct-hire/received`, `GET /api/direct-hire/:id`, `PATCH /api/direct-hire/:id/accept`, `PATCH /api/direct-hire/:id/reject`, `POST /api/direct-hire/:id/submit-payment`
- Admin routes: `PATCH /api/admin/direct-hire/:id/activate`, `PATCH /api/admin/direct-hire/:id/reject-payment`, `GET /api/admin/direct-hire`
- Frontend pages: `direct-hire-payment.tsx` (brand payment + influencer accept/decline), hire dialog on `creator-profile.tsx`, "Direct Hires" tab in `brand-dashboard.tsx`, "Hire Offers" section in `simple-dashboard.tsx`

#### P2P Marketplace
- **P2P Hub** (`/p2p-hub`): Public marketplace with a full-screen 3D blockchain hero image, listing grid (cards with thumbnails, price badges, seller avatar, type badges), 3-tab filter (Crypto/Product/Service), create-listing dialog, and accept-offer flow.
- **P2P Listing Detail** (`/p2p/:id`): Public listing detail page showing full description, seller profile, price, payment method, and "Accept & Enter Deal Room" CTA (login required to accept).
- **Deal Rooms** (`/p2p-deals`, `/p2p-deals/:id`): Redesigned with dark `bg-gray-950` private aesthetic, violet accents, hidden Room ID with eye-toggle reveal, and a 4-stage progress tracker (Pending → Funded → Delivered → Completed). Buyer/seller escrow workspace with payment proof upload, delivery confirmation, buyer receipt confirmation, dispute creation, file-enabled chat, and WhatsApp admin alert links.
- **Featured P2P Deals** (Homepage section): Homepage shows up to 6 featured listings from `GET /api/p2p/listings/featured`. Admins toggle featured status per listing from the admin panel.
- **Admin Escrow Control** (`/admin/p2p-transactions`): Full admin management — listing thumbnails, edit dialog (title/description/price/method/image/type/status/adminNote via PUT /api/admin/p2p-listings/:id), approve/reject/note quick actions, Feature/Expire/Reactivate buttons, transaction confirm/release/refund with deal room links.
- **Seed Demo Data**: Button in admin panel and `POST /api/admin/p2p-seed` endpoint seeds 9 approved demo listings (3 crypto, 3 product, 3 service) using the admin account as seller. Initial seed done directly via DB.
- **P2P Listing Removal**: Admin P2P removal is a permanent DELETE action (`DELETE /api/admin/p2p-listings/:id`), public listing details only return approved listings, and demo seeding only restores missing demo titles instead of duplicating existing listings.
- **P2P Fee Settings** (`/admin/p2p-fees`): Admin-configurable per-party fees — set separate buyer fee (added to buyer's total) and seller fee (deducted from payout) per transaction type (`crypto`, `product`, `service`). Both support fixed or percentage modes with min/max caps.
- **Crypto-only Payments**: All P2P listings use crypto payment methods only — USDT TRC20, USDT BEP20, TON, Pi Network, BTC, TRX, XRP, DOGE, BNB (BEP20), LTC. No fiat/bank options.
- **Pi Network Wallet**: Users can set their Pi Network wallet in Trading Profile; supported as a payment method.
- **Currency-aware Deal Rooms**: All amounts show the correct currency symbol (₦ for NGN, € for EUR, etc.) — never hardcoded $.
- **Smart Accept Modal**: When accepting an offer, buyers can use their saved wallet for the matching network or enter a custom one-time wallet address for refunds.
- **Platform Fee Settings** (`/admin/platform-fees`): Admin-editable campaign, withdrawal, and listing fee records backed by `platformFees`.
- Backend schema: `p2pListings`, `p2pTransactions`, `p2pMessages`, `p2pFeeConfigs`, `platformFees`, and `p2pActionLogs`.
- Schema additions: `p2pListings` now has `isFeatured` (boolean) and `expiresAt` (timestamp). Status enum extended to include `'expired'`.
- Status flow: listing `pending` → `approved` (optionally `featured`/`expired`); transaction `pending` → `funded` → `delivered` → buyer confirmed → admin `completed`, with `disputed` and `refunded` paths.

#### Payment Networks
- Admin-controlled payment networks management via "Networks" admin tab
- Active by default: USDT-Tron (TRC-20), USDT-TON, USDT-BSC (BEP-20), USDT-ETH (ERC-20)
- Admin can toggle any network active/inactive — only active networks shown to users
- Admin can set deposit wallet addresses per network
- Escrow payment page dynamically shows only active networks

#### Crypto Payment System (Non-Custodial)
- Cold wallet addresses managed by admin
- No direct crypto storage - all payments go to designated wallets
- Manual payment verification by administrators
- Virtual wallet tracking for earnings history
- Payout request system with $10 minimum threshold

#### User Management
- Comprehensive user profiles with social media handles
- Verification and KYC approval system
- Rating and reputation tracking
- Follower/following relationships
- Earnings and transaction history
- Admin-granted role privileges: Content Editor manages Blog/Feed content, Moderator/Mediator handles moderation and P2P mediation, Store Manager manages Shop/P2P marketplace, and Admin keeps full platform access.

## Data Flow

1. **User Onboarding**: Users sign up with email/password → Profile creation with user type (creator/brand) → Optional social media handles
2. **Campaign Discovery**: Users browse available campaigns → Filter by criteria → Join eligible campaigns  
3. **Task Completion**: Users complete social media tasks → Submit proof → Admin verification
4. **Payment Processing**: Approved tasks credit virtual wallet → Users request payouts → Admin processes manual payments
5. **Shop Integration**: Users can purchase products/services → Payment proof submission → Admin verification

## Cost Optimization Priority
- User is concerned about $50 Replit credit usage during MVP development
- Need to focus on essential features only and optimize resource usage
- Minimize unnecessary database queries and real-time polling
- Complete core chat functionality first before adding additional features

## Recent Changes (July 29-30, 2025)

## Replit Migration (April 2026)

✓ Installed Node.js dependencies for the imported project.
✓ Confirmed the app uses a single Express server on `0.0.0.0` and `PORT=5000` for Replit preview compatibility.
✓ Updated Vite dev-server host handling so Replit's proxied preview can load the app safely.
✓ Aligned the production run target with the existing build output at `dist/index.js`.
✓ Added a sitewide route-change scroll reset so button/link navigation opens new pages from the top instead of preserving footer scroll position.

✓ **Authentication System Overhaul**: Completely replaced Replit Auth with custom email/password system
✓ **Password Security**: Implemented bcrypt hashing with secure salt generation
✓ **Session Management**: Configured PostgreSQL session store for reliable authentication state
✓ **Password Recovery**: Added two-step password reset flow with secure token generation
✓ **User Experience**: Professional signup/login pages with comprehensive form validation
✓ **Database Schema**: Updated users table with proper fields for custom authentication
✓ **API Endpoints**: Created secure authentication endpoints (/register, /login, /logout, /forgot-password, /reset-password)
✓ **Admin Access Control**: Fixed role-based access - creators can no longer see admin panel
✓ **Profile Management**: Added comprehensive profile editing with image uploads at /profile-edit
✓ **Crypto Wallet Integration**: Built payment management system for USDT (Tron/BSC) and TON networks
✓ **Content Pages**: Created professional About Us and Contact Us pages with working contact forms
✓ **Visual Enhancements**: Added gradient images to blog posts and improved overall design
✓ **Logout Fix**: Resolved 404 error on logout by properly clearing sessions and cookies
✓ **Brand Dashboard**: Created distinct dashboard for brands with campaign creation, creator management, and analytics
✓ **Role-Based Navigation**: Implemented different navigation and interfaces for brands vs creators
✓ **Campaign Management**: Added brandId field to campaigns table and comprehensive brand functionality
✓ **Database Updates**: Added missing columns (brand_id, status, task_submission_id) to support brand features
✓ **User Management Enhancements**: Complete admin user management with delete, edit, password reset functionality
✓ **Dialog Optimization**: Fixed edit user dialog with proper scrolling, larger viewport, and always-visible footer
✓ **Mobile Responsiveness**: Enhanced campaigns and payments sections with scrollable content areas
✓ **Database Schema Fixes**: Added missing approved_by and approved_at columns to transactions table

✓ **Shop System Integration**: Added complete shop management tab to admin dashboard with product management access
✓ **Product Management Navigation**: Created seamless navigation from admin dashboard to product management interface  
✓ **Chat System Overhaul**: Replaced scattered messaging with Telegram-style chat interface
✓ **Conversation Threading**: Implemented proper conversation threads with contact list and message bubbles
✓ **File Attachment Support**: Added paperclip functionality for file uploads in chat
✓ **Database Optimization**: Fixed foreign key constraints for chat messages without campaign requirements
✓ **Campaign Creation Bug Fix**: Resolved deadline date format and requirements array mismatch issues
✓ **Homepage Navigation**: Added Home button in navigation for both influencers and brands

## Messaging System Complete Overhaul (April 2026)

✓ **Fixed double messages bug**: Backend now deduplicates thread messages — same sender+content within 10-second window → one message shown (was creating one DB record per recipient, showing N copies)
✓ **Fixed admin/direct chat broken**: Thread query was `enabled: !!campaignId` so direct conversations never loaded; now thread works for both campaign threads AND direct conversations (admin support, DMs)
✓ **Fixed reply for direct conversations**: Reply endpoint now handles `direct_xxx` conv keys (not just campaign IDs) — sends to the other party without broadcasting
✓ **Fixed double-send prevention**: `sendingRef` guard prevents concurrent send mutations even if Enter is pressed while click is in flight
✓ **Support ticket system**: New `POST /api/support-tickets` backend endpoint + "Support" dialog in messages UI with Normal/Urgent priority selector; tickets shown with amber styling in thread
✓ **Brand broadcast control**: Brand users see a "send to all / send to one" dropdown in campaign threads; default is all participants, can narrow to a specific creator
✓ **Clean UI rebuild**: Rebuilt messages.tsx from scratch — search bar, avatar stacks, conversation type badges (Campaign/Support/Direct), mobile-responsive back button, grouped send hint
✓ **New Conversation dialog**: Recipient selector (from allowed contacts list), optional campaign attachment, subject + message fields

## Profile System & Sitewide Username Links (April 2026)

✓ **Brand Profile Redesign**: Completely rebuilt brand-profile.tsx with dark emerald/teal corporate design — hero banner, company logo, stats (campaigns/active/rating/followers), active campaigns grid, reviews sidebar, about section
✓ **Unified Profile Router**: Created `/profile/:id` page that auto-detects user type and redirects creators → `/creators/:id`, brands → `/brand/:id`, admins → inline admin profile page
✓ **Admin Profile Page**: Elegant dark slate design for admin profiles (shield badge, platform overview, authority styling)
✓ **Public Profile Routes**: Moved `/brand/:id` and `/profile/:id` to public routes (accessible without login) for shareable profile links
✓ **Backend `/api/users/:id` route**: Fixed "Brand Not Found" bug by adding generic user lookup endpoint alongside `/api/users/:id/profile`
✓ **Sitewide Username Links**: Campaign-detail.tsx brand name links to `/brand/:id`; brand-dashboard.tsx applicant names link to `/profile/:id`; leaderboard already had profile links
✓ **UserLink Component**: Reusable `UserLink` component in `client/src/components/ui/user-link.tsx` with `getUserProfileUrl()` helper
✓ **$TDrip Profile Points**: Creator, brand, admin, and signed-in profile pages now display `totalPoints` as $TDrip points.
✓ **Profile Wallpaper Coverage**: Public creator, brand, admin, and own profile views use banner wallpapers or polished gradient fallbacks.
✓ **Mutual-Follow DM Rule**: Direct message buttons only show when both users follow each other; backend `/api/users/:id/can-message` enforces the mutual-follow requirement.
✓ **Campaign-Linked Auto-DM** (`POST /api/messages/campaign-dm`): The "Message Brand" button in campaign-detail.tsx now auto-sends a DM with a clickable campaign title link as the first message. Respects `messagePrivacy` settings ('everyone', 'followers', 'nobody'). Followers or accepted campaign participants bypass the followers restriction. On success, navigates to the messages thread. Errors surface as a toast with the specific reason.
✓ **Profile Posts**: Brand, admin, creator, and signed-in profile views surface user posts on the profile page.
✓ **Direct Wallet Support Toggle**: Added `directSupportEnabled` to users, synced the database, and exposed On/Off controls in profile edit and wallet settings.

## Major Platform Upgrade (March 2026)

✓ **New Landing Page**: Complete SaaS landing page redesign with hero, creator tiers display, how-it-works, live campaigns, stats, and dual CTA for brands/creators
✓ **Creator Tier System**: 4-tier classification (Rising Sparks 1K-10K, Growth Engines 10K-100K, Power Influencers 100K-1M, Global Titans 1M+) auto-assigned from total followers
✓ **Extended Social Platforms**: Added Twitch, Telegram Channel, WhatsApp Channel to user profiles + follower counts per platform
✓ **Follower Count Tracking**: Per-platform follower counts (TikTok, YouTube, Instagram, Twitter, Twitch, Telegram, WhatsApp) with totalFollowers auto-calculated
✓ **Auto Tier Calculation**: Profile save auto-computes totalFollowers sum and assigns creatorTier based on range
✓ **Creator Discovery Page**: Full /creators page with search, filter by tier/niche/platform, sort by followers/rating, creator cards with tier badges
✓ **Profile Edit Redesign**: New profile-edit page with live tier preview, all social platforms + follower count inputs, niche selector, username field
✓ **User Profile Upgrade**: Shows tier badge, verified badge, niche, username, social platform follower breakdown, improved stats grid
✓ **Navigation Enhancement**: "Find Creators" link for brands, "Creators" link visible to all users (public + authenticated)
✓ **API Endpoint**: /api/creators endpoint returns all creator users ordered by total followers
✓ **Footer Added**: Footer component added to all major pages
✓ **Database Schema**: Added username, bannerImageUrl, social platform handles + follower columns, totalFollowers, creatorTier, niche columns

## Blog & Content System (April 2026)

✓ **Blog Schema Extended**: Added `viewCount`, `likesCount`, `commentsCount`, `metaDescription`, `seoKeywords`, `readingTime` to `blogPosts` table; created `blogLikes`, `blogComments`, `blogCategoryFollows` tables
✓ **Blog Post Reader**: Full `/blog/:slug` reader with likes, comments, share buttons (Twitter/Facebook/copy), category follow, reading time, SEO prose display, and view counter
✓ **Blog Listing Redesign**: Complete rewrite with hero section, category filter tabs, featured post, trending sidebar, category follow, real view/like/comment counts
✓ **Tiptap Rich Text Editor**: Installed Tiptap (v2) with full WYSIWYG toolbar — headings, bold/italic/underline/highlight, align, lists, blockquote, code blocks, links, undo/redo; word count display
✓ **Admin Blog SEO Fields**: Added Excerpt, Meta Description, SEO Keywords, Reading Time fields to admin blog editor with blue SEO section
✓ **Blog API Updated**: POST /api/admin/blog now saves metaDescription, seoKeywords, readingTime; GET /api/blog/:slug increments view count; category filter on GET /api/blog
✓ **Blog Comments with User Data**: Comment thread shows user avatar, name and date; post comment form with authentication gate
✓ **App Routing**: Added /blog/:slug route to App.tsx for individual blog post pages

## Feed, Checkout, and Landing Updates (April 2026)

✓ **Feed Redesign**: `/feed` now has a polished hero summary, official admin-featured posts section, separate recent community posts section, and visible post view counts.
✓ **Post Analytics**: Added `viewCount` to feed posts and increment views when the feed is loaded.
✓ **Tip Checkout Flow**: Reworked tipping into a multi-step checkout-style flow: amount → payment method → payment details → confirmation, using admin-managed payment methods plus creator wallets.
✓ **Demo Content Seeding**: Demo feed posts and published blog posts are now seeded alongside courses and shop products when the demo database is empty.

## Blog Enhancements (April 2026)
✓ **SpotlightCarousel on Blog**: Added `BlogSpotlightCarousel` component to blog listing page — auto-cycling full-width slides for featured/image posts, with prev/next arrows and dot navigation (mirrors tasks.tsx pattern)
✓ **Hero Background Image**: Blog hero section redesigned with multi-layer background (gradient + crosshatch SVG pattern + radial glow), gradient text, and stats row (article count, categories, community-driven)
✓ **Advanced Filter System**: New `AdvancedFilters` panel with Sort By (newest/oldest/most viewed/most liked/most discussed), Reading Time (quick/medium/long), and Date Range (week/month/year) filters with active filter chips and count badge
✓ **Blog Tip Feature**: Added `blogTips` table in schema; `GET /api/blog/tip-wallet` returns active admin wallets; `POST /api/blog/:slug/tip` records a tip submission; `GET /api/blog/:slug/tips` returns post tips
✓ **TipModal on Blog Post**: 3-step modal (select network & amount → send crypto & paste tx hash → confirmation), preset tip amounts ($1–$50), copy-to-clipboard wallet address, optional message, supporters strip showing total tipped
✓ **Landing Page Refresh**: Redesigned the "How It Works" section with a premium white-background workflow, creator path, brand path, and gradient typography.

## Web3 SocialFi Improvements (April 2026 — Session 2)

✓ **Social Media Link URLs**: Social media inputs on profile-edit now accept full URLs (https://...) instead of just handles; dynamic section for admin-managed custom platforms; normalizeUrl helper handles legacy handles gracefully for backwards compatibility
✓ **New DB Tables**: Added `social_platforms`, `user_social_links`, `portfolio_items`, `push_subscriptions`, `push_notification_campaigns` tables via schema update + db:push
✓ **Backend Routes Added**: API routes for social platforms CRUD (admin), user social links PUT, portfolio CRUD, push subscription subscribe/unsubscribe, push notification campaign CRUD + send endpoint
✓ **Engaging Creator Profile**: Completely redesigned creator-profile.tsx with dark blockchain/SocialFi gradient hero, animated follow button, social channel cards with platform logos + follower counts + clickable URLs, stats grid, Portfolio tab (shows portfolio items with card grid), Social Analytics tab (bar charts per platform), Reviews with star histogram, Share button, Followers/Following expandable panel
✓ **Portfolio Tab on Dashboard**: Added Portfolio and Reviews tabs to dashboard.tsx; Portfolio tab has full CRUD (add/edit/delete portfolio items in a card grid with dialog form); Reviews tab shows aggregate star rating, histogram, and individual review cards
✓ **Admin Social Channels Panel**: New "Channels" tab in admin-master.tsx with full CRUD for custom social platforms (name, slug, URL prefix, background color, icon class); integrated into profile-edit.tsx dynamic section
✓ **Admin Push Notifications Panel**: New "Push Notify" tab in admin-master.tsx to create notification campaigns with title/body/target/URL fields, live preview, send to subscribers, delete; stats cards for sent/delivered count
✓ **PWA Support**: Added manifest.json, service worker (sw.js with push notification handler + offline cache), updated index.html with manifest link + service worker registration, theme color, Apple touch icon meta tags
✓ **Chat Redesign**: Completely rebuilt chat.tsx with modern messenger UI — green online dot, real-time 3-second polling, gradient message bubbles with sender avatars, read receipt checkmarks, date separators, search bar for conversations, smooth send button animation, handle URL param `?to=userId` for deep linking from profile pages

## Campaign Cards, Portfolio, and Push Notifications (April 2026)

✓ **Campaign Card Visuals**: Landing and task campaign cards now use featured campaign imagery, stronger typography, hover image scaling, and responsive multi-column layouts.
✓ **Admin Campaign Images**: Admin task management supports previewing, changing, and removing featured images from campaign edit forms.
✓ **Guide Bot on Tasks**: Tasks page includes a floating Guide Bot with quick help prompts for creators exploring campaigns.
✓ **Creator Portfolio Fix**: Own public creator profile now opens an inline Add Portfolio Item dialog instead of redirecting to `/dashboard`.
✓ **Push Delivery Upgrade**: Push notification sends now use browser Web Push subscriptions with VAPID keys and mark invalid subscriptions inactive.
✓ **Push Targeting**: Admin push campaigns can target all users, creators, brands, or a specific user from the full admin user list.
✓ **Campaign Launch Alerts**: Admin-created campaigns trigger push alerts to subscribed creators with a direct link to the campaign.
✓ **Prompt Customization**: PWA/push opt-in prompt supports admin-controlled title, message, background image, delay timing, and scroll trigger percentage; default prompt is set to a 30-second high-conversion Web3 campaign alert.

## Escrow Ledger System (April 2026)

✓ **Unified Ledger Page**: `/ledger` now gives admins, brands, and creators one place to review balances, pending escrow, completed earnings, platform fees, payout requests, direct-hire escrow, and campaign escrow.
✓ **Ledger API**: Added authenticated `/api/ledger` endpoint that returns role-scoped transactions, payout requests, direct-hire offers, and campaign escrow payments using existing tables.
✓ **Campaign Escrow Visibility**: Ledger activity includes campaign escrow funding records with campaign/brand context for admins and brand-specific escrow rows for brands.
✓ **Navigation Access**: Ledger is available from the main navigation, account dropdown, wallet settings, and creator dashboard wallet card.
✓ **Admin Payouts Operations Center**: New `AdminPayoutsCenter.tsx` component — stats (total, pending, approved, rejected), filter by status, approve with TX hash, reject with refund, mark-processing; full audit trail; source linkage (campaign / direct-hire); conversation thread preview button per payout row.
✓ **Admin Conversation Viewer**: New `AdminConversationDrawer.tsx` — slide-in drawer showing full role-color-coded message thread for any campaign or direct-hire conversation; accessible from campaign rows (Thread button), direct-hire rows (View Conversation button), and payout rows.
✓ **Payout Source Linkage**: `payout_requests` table extended with `campaign_id`, `direct_hire_id`, `source_type` columns; `/api/admin/campaigns/:id/thread` and `/api/admin/direct-hire/:id/thread` routes return full message threads; `/api/admin/payouts` and `/api/admin/payouts/:id` handle all payout operations.
✓ **CMS Smart Sync**: `storage.syncDefaultPageContent()` runs on every startup — inserts missing blocks, updates metadata, never overwrites user edits; 69 blocks confirmed synced.
✓ **Admin-Managed Landing Sliders**: Five default landing hero slides are seeded into `hero_sliders` on startup and editable from the admin Hero Sliders tab; the public landing page reads active slides from `/api/hero-sliders`.
✓ **Landing Page Cleanup**: Simplified the public landing page to a focused slider-first layout with platform bar, concise how-it-works cards, transparent fee model, live campaign preview, and final CTA.
✓ **2FA Package Restore**: Added missing `speakeasy` and `qrcode` runtime dependencies so the authentication server starts correctly.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **wouter**: Lightweight routing library

### Authentication & Security
- **openid-client**: OpenID Connect implementation
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **vite**: Build tool and dev server
- **typescript**: Type safety
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database migrations and management

## Deployment Strategy

### Development Environment
- Vite dev server with HMR (Hot Module Replacement)
- Automatic middleware setup for development
- Replit-specific plugins for enhanced development experience
- Replit migration verified: dependencies installed, database schema synced with Drizzle, and the `Start application` workflow runs on port 5000.
- Replit import migration completed April 15, 2026: workflow configured as a web preview on port 5000, deployment build/run configured for `dist/index.js`, and runtime verified through `/api/health` plus the HTTPS preview URL.

### Production Build
- Vite builds client-side assets to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Express serves both API routes and static assets
- Environment-based configuration for database and auth

### Database Management
- Drizzle migrations stored in `./migrations`
- PostgreSQL schema defined in `./shared/schema.ts`
- Database push command for schema updates

### Security Considerations
- HTTPS-only cookies in production
- Rate limiting on API endpoints
- Input validation using Zod schemas
- Secure session storage with PostgreSQL
- Environment variable validation
- Production session startup requires `SESSION_SECRET`; development uses a local-only fallback so the preview can run safely without exposing production behavior.

### Scaling Architecture
- Stateless server design for horizontal scaling
- Database connection pooling with Neon
- CDN-ready static asset serving
- Session store supports multiple server instances
### My Orders & Transactions System (Added April 2026)
- **Page**: `/my-orders` — unified orders/transactions dashboard for all users
- **Backend API**: `GET /api/my-orders` — aggregates all transaction types for authenticated user
- **Covered transaction types**: Shop orders, Course enrollments, P2P trades, Campaign escrow payments, Direct hire offers
- **Features**:
  - Filter by transaction type (shop, course, p2p, campaign, direct_hire) and time period
  - In-app order preview dialog with full details (no external redirects)
  - Complete charge breakdown: base amount + 10% platform fee + total
  - Shipping/delivery details for shop orders
  - Course progress bars for enrolled courses
  - Download as professional PDF (jspdf + jspdf-autotable) or Excel (xlsx/SheetJS)
  - Summary stats (total orders, total charged, pending, completed)
- **Libraries added**: jspdf, jspdf-autotable, xlsx
- **Enhanced proof-submitted page** (`/escrow-payment`): Shows order summary, before/after charge breakdown with platform fees, payment details, and "View My Orders" button
- **Navigation**: "My Orders" link added to user dropdown menu in navigation
- **Dashboard links**: Quick-access buttons added in user dashboard and brand dashboard
