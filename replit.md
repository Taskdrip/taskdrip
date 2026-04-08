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

#### Campaign Engine
- Campaign creation and management for brands
- Task-based completion system for creators
- Participation tracking and approval workflow
- Category-based campaign organization (Social Media, Gaming, Health & Fitness, etc.)

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

### Scaling Architecture
- Stateless server design for horizontal scaling
- Database connection pooling with Neon
- CDN-ready static asset serving
- Session store supports multiple server instances