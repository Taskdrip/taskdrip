# Overview

This is a Web3 task-based platform called "Taskdrip" that connects task performers with brands for diverse campaign opportunities. The platform enables users to earn cryptocurrency rewards by completing various tasks including app testing, trading, content creation, event hosting, local errands, and more, while providing brands with access to a skilled workforce across multiple industries and locations.

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
→ **Cost Optimization**: Focus on essential MVP features only to minimize Replit credit usage

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