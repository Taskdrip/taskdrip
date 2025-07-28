# Overview

This is a Web3 SocialFi platform called "Breedskool" that connects creators/influencers with brands for campaign-based collaboration. The platform enables creators to earn cryptocurrency rewards by completing social media tasks and campaigns, while providing brands with a way to reach targeted audiences through influencer marketing.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- Replit-based OAuth authentication using OpenID Connect
- Session-based authentication with JWT tokens
- User profile management with KYC approval workflow
- Rate limiting and security measures

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

1. **User Onboarding**: Users sign up via Replit Auth → Profile creation → Optional KYC submission
2. **Campaign Discovery**: Users browse available campaigns → Filter by criteria → Join eligible campaigns
3. **Task Completion**: Users complete social media tasks → Submit proof → Admin verification
4. **Payment Processing**: Approved tasks credit virtual wallet → Users request payouts → Admin processes manual payments
5. **Shop Integration**: Users can purchase products/services → Payment proof submission → Admin verification

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