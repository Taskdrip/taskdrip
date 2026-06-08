import { db } from "./db";
import { sql } from "drizzle-orm";

type ColumnFix = {
  table: string;
  column: string;
  definition: string;
};

const REQUIRED_COLUMNS: ColumnFix[] = [
  { table: "users", column: "brand_tier", definition: "varchar DEFAULT 'startup'" },
  { table: "users", column: "brand_rank", definition: "varchar DEFAULT 'bronze'" },
  { table: "users", column: "total_transaction_volume", definition: "decimal(12,2) DEFAULT '0.00'" },
  { table: "users", column: "two_factor_secret", definition: "varchar" },
  { table: "users", column: "two_factor_enabled", definition: "boolean DEFAULT false" },
  { table: "users", column: "message_privacy", definition: "varchar DEFAULT 'everyone'" },
  { table: "users", column: "referral_code_creator", definition: "varchar" },
  { table: "users", column: "referral_code_brand", definition: "varchar" },
  { table: "users", column: "total_referrals", definition: "integer DEFAULT 0" },
  { table: "users", column: "referral_bonus_earned", definition: "decimal(10,2) DEFAULT '0.00'" },
  { table: "users", column: "latitude", definition: "decimal(10,7)" },
  { table: "users", column: "longitude", definition: "decimal(10,7)" },
  { table: "users", column: "state", definition: "varchar" },
  { table: "users", column: "city", definition: "varchar" },
  { table: "users", column: "country", definition: "varchar" },
  { table: "users", column: "preferred_currency", definition: "varchar DEFAULT 'USD'" },
  { table: "users", column: "btc_wallet", definition: "varchar" },
  { table: "users", column: "seo_title", definition: "varchar" },
  { table: "users", column: "seo_description", definition: "text" },
  { table: "users", column: "seo_keywords", definition: "varchar" },
  { table: "users", column: "seo_og_image", definition: "varchar" },
  { table: "users", column: "subscription_end_date", definition: "timestamp" },
  // Service add-ons (upsells) on saleable items
  { table: "shop_products", column: "intro_video_url", definition: "varchar" },
  { table: "shop_products", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "courses", column: "intro_video_url", definition: "varchar" },
  { table: "courses", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "campaigns", column: "intro_video_url", definition: "varchar" },
  { table: "campaigns", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "campaigns", column: "min_followers", definition: "integer DEFAULT 0" },
  { table: "campaigns", column: "feature_image", definition: "varchar(500)" },
  { table: "p2p_listings", column: "intro_video_url", definition: "varchar" },
  { table: "p2p_listings", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "purchases", column: "selected_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "purchases", column: "addons_total", definition: "decimal(10,2) DEFAULT '0.00'" },
  // Subscription period / expiry tracking
  { table: "subscriptions", column: "period_days", definition: "integer" },
  { table: "subscriptions", column: "expiry_reminder_sent", definition: "boolean DEFAULT false" },
  { table: "subscriptions", column: "payment_method_label", definition: "varchar" },
  // Course messages privacy
  { table: "course_messages", column: "recipient_id", definition: "varchar REFERENCES users(id) ON DELETE CASCADE" },
  { table: "course_messages", column: "is_deleted", definition: "boolean DEFAULT false" },
  // Advertise applications extras
  { table: "advertise_applications", column: "platforms", definition: "varchar" },
  { table: "advertise_applications", column: "giveaway_type", definition: "text" },
  { table: "advertise_applications", column: "tdrip_budget", definition: "text" },
  // Auto-blogger settings — columns added in later schema revisions
  { table: "auto_blogger_settings", column: "ai_provider", definition: "varchar DEFAULT 'gemini'" },
  { table: "auto_blogger_settings", column: "image_provider", definition: "varchar DEFAULT 'pollinations'" },
  { table: "auto_blogger_settings", column: "include_transcripts", definition: "boolean DEFAULT true" },
  { table: "auto_blogger_settings", column: "embed_youtube", definition: "boolean DEFAULT true" },
  { table: "auto_blogger_settings", column: "autopilot_enabled", definition: "boolean DEFAULT false" },
  { table: "auto_blogger_settings", column: "autopilot_interval_minutes", definition: "integer DEFAULT 180" },
  { table: "auto_blogger_settings", column: "autopilot_per_source", definition: "integer DEFAULT 1" },
  { table: "auto_blogger_settings", column: "last_autopilot_run_at", definition: "timestamp" },
  { table: "auto_blogger_settings", column: "schedule_cron", definition: "varchar" },
  { table: "auto_blogger_settings", column: "humanization_passes", definition: "integer DEFAULT 0" },
  { table: "auto_blogger_settings", column: "humanization_strength", definition: "varchar DEFAULT 'medium'" },
  // BreedSkool course pricing — columns added in later schema revisions
  { table: "breedskool_course_pricing", column: "linked_course_id", definition: "varchar" },
];

// Tables that may not exist yet — created with IF NOT EXISTS so they're safe to run every boot
const REQUIRED_TABLES: string[] = [
  // P2P task addon proof submissions
  `CREATE TABLE IF NOT EXISTS "p2p_task_addon_submissions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "listing_id" varchar NOT NULL REFERENCES "p2p_listings"("id") ON DELETE CASCADE,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "task_index" integer NOT NULL DEFAULT 0,
    "task_description" text,
    "proof_type" varchar NOT NULL DEFAULT 'link',
    "proof_url" varchar(1000),
    "proof_screenshot" varchar(500),
    "proof_note" text,
    "status" varchar NOT NULL DEFAULT 'pending',
    "review_note" text,
    "reviewed_by" varchar REFERENCES "users"("id"),
    "reviewed_at" timestamp,
    "created_at" timestamp DEFAULT now()
  )`,

  // Course lesson completion tracking
  `CREATE TABLE IF NOT EXISTS "course_lesson_progress" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "lesson_id" varchar NOT NULL REFERENCES "course_lessons"("id") ON DELETE CASCADE,
    "completed_at" timestamp DEFAULT now()
  )`,

  // Certificate template (singleton admin config)
  `CREATE TABLE IF NOT EXISTS "course_certificate_template" (
    "id" varchar PRIMARY KEY DEFAULT 'default',
    "institution_name" varchar DEFAULT 'BreedSkool Academy',
    "institution_logo_url" varchar,
    "signatory_name" varchar DEFAULT 'Director of Education',
    "signatory_title" varchar DEFAULT 'BreedSkool Director',
    "signature_image_url" varchar,
    "seal_image_url" varchar,
    "body_template" text DEFAULT 'This is to certify that {{studentName}} has successfully completed the course "{{courseTitle}}" on {{date}}, taught by {{instructorName}}.',
    "headline_text" varchar DEFAULT 'Certificate of Completion',
    "accent_color" varchar DEFAULT '#7c3aed',
    "bg_color" varchar DEFAULT '#fdfaf6',
    "border_style" varchar DEFAULT 'classic',
    "updated_at" timestamp DEFAULT now()
  )`,

  // Issued certificates
  `CREATE TABLE IF NOT EXISTS "course_certificates" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "cert_code" varchar NOT NULL UNIQUE,
    "user_id" varchar NOT NULL REFERENCES "users"("id"),
    "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "student_name" varchar NOT NULL,
    "course_title" varchar NOT NULL,
    "instructor_name" varchar,
    "issued_at" timestamp DEFAULT now()
  )`,

  // Ad impression / click analytics
  `CREATE TABLE IF NOT EXISTS "ad_analytics" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "ad_id" varchar REFERENCES "sponsored_ads"("id") ON DELETE CASCADE,
    "event_type" varchar NOT NULL,
    "session_id" varchar,
    "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "device_type" varchar,
    "browser" varchar,
    "os" varchar,
    "country" varchar,
    "city" varchar,
    "ip_address" varchar,
    "page_url" varchar,
    "user_agent" text,
    "created_at" timestamp DEFAULT now()
  )`,

  // App-level key/value settings (demo mode, feature flags, etc.)
  `CREATE TABLE IF NOT EXISTS "app_settings" (
    "key" varchar PRIMARY KEY,
    "value" text,
    "updated_at" timestamp DEFAULT now()
  )`,

  // Advertise applications
  `CREATE TABLE IF NOT EXISTS "advertise_applications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_name" varchar NOT NULL,
    "contact_name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "phone" varchar,
    "website" varchar,
    "industry" varchar,
    "ad_type" varchar NOT NULL,
    "budget" varchar,
    "platforms" varchar,
    "giveaway_type" text,
    "tdrip_budget" text,
    "goals" text,
    "message" text,
    "status" varchar NOT NULL DEFAULT 'pending',
    "admin_notes" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Newsletter subscribers
  `CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" varchar NOT NULL UNIQUE,
    "name" varchar,
    "source" varchar DEFAULT 'footer',
    "status" varchar DEFAULT 'active',
    "ip_address" varchar,
    "subscribed_at" timestamp DEFAULT now()
  )`,

  // Legal pages (terms, privacy, cookies, disclaimer)
  `CREATE TABLE IF NOT EXISTS "legal_pages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "slug" varchar NOT NULL UNIQUE,
    "title" varchar NOT NULL,
    "content" text NOT NULL,
    "updated_at" timestamp DEFAULT now()
  )`,

  // Short links
  `CREATE TABLE IF NOT EXISTS "short_links" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "short_code" varchar NOT NULL UNIQUE,
    "original_url" text NOT NULL,
    "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "title" varchar,
    "clicks" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp,
    "created_at" timestamp DEFAULT now()
  )`,

  // Short link clicks
  `CREATE TABLE IF NOT EXISTS "short_link_clicks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "link_id" varchar NOT NULL REFERENCES "short_links"("id") ON DELETE CASCADE,
    "ip_address" varchar,
    "user_agent" text,
    "referer" varchar,
    "country" varchar,
    "created_at" timestamp DEFAULT now()
  )`,

  // Page hero backgrounds
  `CREATE TABLE IF NOT EXISTS "page_hero_backgrounds" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "page" varchar NOT NULL UNIQUE,
    "image_url" varchar,
    "overlay_color" varchar DEFAULT 'rgba(0,0,0,0.5)',
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp DEFAULT now()
  )`,

  // Auto-blogger sources
  `CREATE TABLE IF NOT EXISTS "auto_blog_sources" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar NOT NULL,
    "type" varchar NOT NULL DEFAULT 'rss',
    "url" text NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_fetched_at" timestamp,
    "created_at" timestamp DEFAULT now()
  )`,

  // Auto-blogger jobs
  `CREATE TABLE IF NOT EXISTS "auto_blog_jobs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "source_id" varchar REFERENCES "auto_blog_sources"("id") ON DELETE SET NULL,
    "title" varchar,
    "status" varchar NOT NULL DEFAULT 'pending',
    "error" text,
    "post_id" varchar REFERENCES "blog_posts"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now(),
    "completed_at" timestamp
  )`,

  // BreedSkool course registrations
  `CREATE TABLE IF NOT EXISTS "breedskool_registrations" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "full_name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "phone" varchar NOT NULL,
    "location" varchar,
    "selected_course_key" varchar NOT NULL DEFAULT '',
    "selected_course_title" varchar NOT NULL DEFAULT '',
    "amount_ngn" integer NOT NULL DEFAULT 0,
    "payment_option" varchar NOT NULL DEFAULT 'pay_later',
    "payment_method" varchar,
    "payment_status" varchar DEFAULT 'pending',
    "transaction_ref" varchar,
    "payment_proof" varchar,
    "currency_used" varchar DEFAULT 'NGN',
    "amount_usd" decimal(10,2),
    "pay_later_deadline" timestamp,
    "notes" text,
    "delivery_mode" varchar DEFAULT 'online',
    "child_name" varchar,
    "child_age" varchar,
    "parent_name" varchar,
    "home_address" text,
    "linked_course_id" varchar,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Payment networks (crypto deposit networks)
  `CREATE TABLE IF NOT EXISTS "payment_networks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "network_key" varchar(50) NOT NULL UNIQUE,
    "name" varchar(100) NOT NULL,
    "short_name" varchar(30) NOT NULL,
    "network" varchar(20) NOT NULL,
    "currency" varchar(10) NOT NULL DEFAULT 'USDT',
    "wallet_address" varchar(200),
    "description" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // BreedSkool course pricing (admin-managed pricing cards for the /breedskool page)
  `CREATE TABLE IF NOT EXISTS "breedskool_course_pricing" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_key" varchar NOT NULL UNIQUE,
    "title" varchar NOT NULL,
    "short_description" text,
    "regular_price" integer NOT NULL DEFAULT 0,
    "discount_price" integer NOT NULL DEFAULT 0,
    "duration" varchar,
    "is_active" boolean DEFAULT true,
    "accepted_payments" text[] DEFAULT ARRAY['bank_transfer','usdt_tron','usdt_ton','usdt_bnb'],
    "linked_course_id" varchar,
    "updated_at" timestamp DEFAULT now()
  )`,

  // Auto-blogger settings singleton row (holds ai_provider, model, tone, etc.)
  `CREATE TABLE IF NOT EXISTS "auto_blogger_settings" (
    "id" varchar PRIMARY KEY DEFAULT 'singleton',
    "enabled" boolean DEFAULT false,
    "auto_publish" boolean DEFAULT false,
    "ai_provider" varchar DEFAULT 'gemini',
    "model" varchar DEFAULT 'gemini-2.5-flash',
    "tone_style" varchar DEFAULT 'informative',
    "min_words" integer DEFAULT 700,
    "max_words" integer DEFAULT 1400,
    "default_author_id" varchar,
    "image_provider" varchar DEFAULT 'pollinations',
    "include_transcripts" boolean DEFAULT true,
    "embed_youtube" boolean DEFAULT true,
    "autopilot_enabled" boolean DEFAULT false,
    "autopilot_interval_minutes" integer DEFAULT 180,
    "autopilot_per_source" integer DEFAULT 1,
    "last_autopilot_run_at" timestamp,
    "schedule_cron" varchar,
    "humanization_passes" integer DEFAULT 0,
    "humanization_strength" varchar DEFAULT 'medium',
    "updated_at" timestamp DEFAULT now()
  )`,
];

export async function runStartupMigrations(): Promise<void> {
  // 1. Create any missing tables first (safe — uses IF NOT EXISTS)
  for (const ddl of REQUIRED_TABLES) {
    try {
      await db.execute(sql.raw(ddl));
    } catch (err: any) {
      // Log but never crash — some tables may have FK deps that don't exist yet
      console.error(`[startup-migration] Table creation error: ${err?.message}`);
    }
  }

  // 2. Add any missing columns to existing tables (safe — uses IF NOT EXISTS)
  for (const fix of REQUIRED_COLUMNS) {
    try {
      await db.execute(
        sql.raw(
          `ALTER TABLE IF EXISTS "${fix.table}" ADD COLUMN IF NOT EXISTS "${fix.column}" ${fix.definition};`
        )
      );
    } catch (err: any) {
      console.error(
        `[startup-migration] Failed to ensure ${fix.table}.${fix.column}: ${err?.message}`
      );
    }
  }
}
