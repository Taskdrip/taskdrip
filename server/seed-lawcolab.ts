/**
 * Seed LAWCOLAB product into the shop.
 * Idempotent — checks by title before inserting.
 */
import { db } from "./db";
import { shopProducts } from "@shared/schema";
import { eq } from "drizzle-orm";

const LAWCOLAB_TITLE = "LAWCOLAB — Legal Practice Management Platform";

export async function seedLawcolab(): Promise<{ inserted: boolean; skipped: boolean }> {
  try {
    const existing = await db
      .select({ id: shopProducts.id })
      .from(shopProducts)
      .where(eq(shopProducts.title, LAWCOLAB_TITLE))
      .limit(1);

    if (existing.length > 0) {
      return { inserted: false, skipped: true };
    }

    await db.insert(shopProducts).values({
      title: LAWCOLAB_TITLE,
      shortDescription:
        "Full-featured, multi-tenant Legal Practice Management SaaS. Run your law firm like a world-class business — manage cases, clients, invoices, calendars, payments, and team members from one unified workspace.",
      description: `LAWCOLAB is a production-ready, multi-tenant Legal Practice Management SaaS platform built with Python/Flask and PostgreSQL.

Designed for solo practitioners, growing firms, and multi-office enterprises, LAWCOLAB ships with four subscription tiers plus a white-label licensing option — everything you need to run a law firm (or launch your own legal-tech SaaS business) out of the box.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛 WHO IS LAWCOLAB FOR?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Law firm admins managing cases, clients, and workflows
• Attorneys and paralegals tracking deadlines and documents
• Clients who need a secure portal to view their case progress and invoices
• Entrepreneurs looking to resell a white-label legal SaaS platform
• Developers wanting a production-ready Flask/PostgreSQL codebase to extend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 FULL FEATURE LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MULTI-TENANT LAW FIRM MANAGEMENT
Each law firm is fully isolated — admins see only their own firm's data. Super Admin manages the entire platform. Firm branding, profiles, and banking details are configurable per tenant. Trial period management with subscription gating on premium routes.

CASE & PROJECT MANAGEMENT
Create cases with title, description, status, priority, and deadline. Status workflow: Active → In Progress → Completed → On Hold. Priority levels: High / Medium / Low with colour-coded badges. Assign multiple team members and clients to a single case. Per-project file uploads with download management. Project-level group chat thread for team collaboration.

CLIENT MANAGEMENT
Full profiles: contact info, company, industry, website, headquarters. Searchable, filterable client directory. Client notes with timestamps (attorney work product). Link clients to multiple cases simultaneously. Client portal: clients view their own cases, invoices, and team contacts.

TEAM MANAGEMENT
Add attorneys, paralegals, and support staff as Team Members. Professional profiles: specialization, years of experience, education, certifications. Team directory with role-based access control. Assign team members to cases with automatic data scoping.

INVOICING & BILLING
Create professional invoices with line items, quantities, rates, and descriptions. Auto-calculated totals with configurable tax and discount. One-click PDF invoice generation (WeasyPrint/ReportLab). Invoice status workflow: Draft → Sent → Paid → Overdue. Payment record tracking with method and reference number. Revenue analytics dashboard: trends, outstanding balances, payment rates. Invoice-specific chat for client billing queries. Overdue invoice alert notifications.

CALENDAR & SCHEDULING
Create events: Court Date, Meeting, Appointment, Deadline, Reminder. Month view and upcoming events with colour coding. Attendee management — invite team members and clients. Notification badges for upcoming deadlines.

REAL-TIME CHAT & SUPPORT
Team direct messaging and project group chat threads. Client support chat with law firm team. Super Admin monitors all firm support conversations. Unread count badges in the navigation bar. Invoice-specific billing chat channel.

ESCROW & PAYMENT PROCESSING
Full escrow lifecycle: create, approve, and release milestones. Multi-gateway: Bank Transfer, USDT, BTC crypto payments. Bank transfer instructions and crypto wallet display for client payments. Payment evidence upload (screenshot / receipt) with admin review. Escrow transaction logs and audit trail.

ANALYTICS DASHBOARD
Total billed, collected, and outstanding revenue at a glance. Project status distribution and pipeline metrics. Invoice payment rate and overdue rate percentages. Per-admin scoped to their law firm only.

PUBLIC FIRM SHOWCASE
Each law firm gets a public-facing profile page. Display: firm name, logo, description, practice areas, contact info. Client reviews and star ratings shown publicly. Public contact/inquiry form delivered to admin dashboard.

SUPER ADMIN CONTROL PANEL
Manage all registered law firms: view, verify, suspend. Sales dashboard: leads, conversions, revenue by plan. Monitor all support conversations across every firm. Configure platform-wide pricing and popup settings. Broadcast announcements to all firms.

SALES & SUBSCRIPTION SYSTEM
Built-in pricing popup with configurable plans. Lead capture and management: name, email, firm, plan chosen. Checkout flow with payment method selection. Payment evidence submission and admin approval workflow. Subscription expiry enforcement with grace period. Configurable trial duration (default 3-day free trial).

DASHBOARD FEATURE SLIDERS
Admin-editable banner ads at the top of every user dashboard. Upload custom background images or choose a solid colour. Configurable: title, subtitle, CTA button text & link, icon. Auto-advancing carousel with arrows and dot indicators.

DOCUMENT MANAGEMENT
Per-project file upload with original filename preservation. File listing with uploader name and upload timestamp. Download any project file from the case detail page. 16 MB per-file limit (configurable).

AUDIT LOGGING
Full audit trail for critical actions. Timestamp, actor, action type, and target entity recorded. Accessible from the Super Admin panel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷 PRICING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 3-Day Free Trial — FREE, no credit card required
• Starter — $39/month (up to 5 team members, solo lawyers & small practices)
• Growth — $90/3 months (up to 20 team members, advanced analytics, priority support)
• Enterprise — $350/year (unlimited users, white-label client portal, dedicated account manager)
• White-Label License — $1,745 one-time (own the platform, resell as your own SaaS, 6-month setup & support included)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Python 3.11 · Flask 3.x · PostgreSQL · SQLAlchemy ORM · Bootstrap 5 · Jinja2 · Gunicorn · WeasyPrint · ReportLab

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 WHAT'S INCLUDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Full Python/Flask source code (all blueprints, models, routes, utilities)
• 60+ Jinja2 HTML templates with responsive Bootstrap 5 layout
• Complete SQLAlchemy schema — tables auto-created on startup
• Seeding scripts for super admin, sales data, and payment configuration
• Railway/Heroku/Replit deployment configs (Procfile, requirements.txt, .replit)
• Comprehensive developer documentation (this PDF)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 SUPPORT & UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: info@lawcolab.com | YouTube: @Taskdriper | Response: within 24 hours (business days).
White-Label License holders receive all future updates at no cost.`,

      price: "39.00",
      originalPrice: "5000.00",
      category: "software",
      type: "saas_tool",
      featuredImage:
        "https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=800&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=800&q=80",
        "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
      ],
      demoUrl: "https://lawcolab.com",
      documentationUrl: "https://lawcolab.com",
      features: [
        "Multi-tenant law firm management — full data isolation per firm",
        "Case & project management with status workflows and priority badges",
        "Client portal — clients view cases, invoices, and team contacts",
        "Team management with role-based access control",
        "Professional invoicing with one-click PDF generation",
        "Real-time chat: team DMs, project threads, client support",
        "Escrow & payments — Bank Transfer, USDT, BTC multi-gateway",
        "Calendar with Court Dates, Meetings, Appointments, Deadlines",
        "Revenue analytics dashboard (billed vs collected vs outstanding)",
        "Public law firm showcase profile with client reviews",
        "Super Admin control panel — manage all firms platform-wide",
        "Built-in sales & subscription system with checkout flow",
        "Dashboard feature sliders (admin-editable banner ads)",
        "Document management with per-project file uploads",
        "Full audit logging — actor, action, timestamp",
        "3-day free trial — no credit card required",
        "White-label license available — resell as your own SaaS",
        "Deploys on Replit, Railway, or Heroku out of the box",
      ],
      requirements: [
        "Python 3.11+",
        "PostgreSQL 13+ (auto-provisioned on Replit/Railway)",
        "512 MB RAM minimum (1 GB recommended)",
        "1 GB disk space + file storage",
        "SESSION_SECRET environment variable",
        "DATABASE_URL / PG* environment variables",
      ],
      tags: [
        "law-firm",
        "legal",
        "practice-management",
        "saas",
        "multi-tenant",
        "python",
        "flask",
        "postgresql",
        "white-label",
        "invoicing",
        "case-management",
        "lawtech",
        "lawcolab",
      ],
      serviceAddons: [
        {
          id: "plan-trial",
          title: "3-Day Free Trial",
          description: "Full platform access, no credit card required. Evaluation & testing.",
          price: 0,
        },
        {
          id: "plan-starter",
          title: "Starter — $39/mo",
          description:
            "Perfect for solo lawyers & small practices. Up to 5 team members. Full client management, case & project tracking, secure client portal, invoicing & billing, email support.",
          price: 39,
        },
        {
          id: "plan-growth",
          title: "Growth — $90/3 months",
          description:
            "Ideal for growing law firms up to 20 team members. Everything in Starter plus advanced analytics & reports, calendar & scheduling, public firm showcase profile, priority support & training.",
          price: 90,
        },
        {
          id: "plan-enterprise",
          title: "Enterprise — $350/year",
          description:
            "For large firms & multi-office practices. Unlimited team members. Everything in Growth plus white-label client portal, custom API integrations, dedicated account manager, 24/7 premium support.",
          price: 350,
        },
        {
          id: "plan-whitelabel",
          title: "White-Label License — $1,745 one-time",
          description:
            "Own LAWCOLAB as your own SaaS business forever. Full source code, self-hosting rights, resell 100% revenue, 6 months white-glove setup & support, all future updates included.",
          price: 1745,
        },
      ],
      rating: "4.90",
      reviewCount: 12,
      salesCount: 8,
      isActive: true,
      isFeatured: true,
    });

    return { inserted: true, skipped: false };
  } catch (error) {
    console.error("[seedLawcolab] Error:", error);
    throw error;
  }
}
