import { db } from "./db";
import { sql } from "drizzle-orm";

type ColumnFix = {
  table: string;
  column: string;
  definition: string;
};

const REQUIRED_COLUMNS: ColumnFix[] = [
  { table: "plugin_studio_projects", column: "source_prompt", definition: "text" },
  { table: "plugin_studio_projects", column: "core_short_description", definition: "varchar" },
  { table: "plugin_studio_projects", column: "core_description", definition: "text" },
  { table: "plugin_studio_projects", column: "core_files", definition: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
  { table: "plugin_studio_projects", column: "premium_files", definition: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
  { table: "plugin_studio_projects", column: "license_api_base_url", definition: "varchar" },
  { table: "plugin_studio_projects", column: "max_activations", definition: "integer NOT NULL DEFAULT 3" },
  { table: "plugin_studio_projects", column: "release_notes", definition: "text" },
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
  // Course sale fields are used by the current course seed and admin editor.
  // Keep this additive for imported databases that predate sale pricing.
  { table: "courses", column: "sale_price", definition: "decimal(10,2)" },
  { table: "courses", column: "sale_deadline", definition: "timestamp" },
  { table: "campaigns", column: "intro_video_url", definition: "varchar" },
  { table: "campaigns", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "campaigns", column: "min_followers", definition: "integer DEFAULT 0" },
  { table: "campaigns", column: "feature_image", definition: "varchar(500)" },
  { table: "p2p_listings", column: "intro_video_url", definition: "varchar" },
  { table: "p2p_listings", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  // Legacy BreedSkool pricing fields retained for imported databases
  { table: "breedskool_course_pricing", column: "course_title", definition: "varchar" },
  { table: "breedskool_course_pricing", column: "price_ngn", definition: "integer" },
  // Referral attribution captured when a product purchase is submitted
  { table: "purchases", column: "referral_code", definition: "varchar" },
  { table: "purchases", column: "selected_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "purchases", column: "addons_total", definition: "decimal(10,2) DEFAULT '0.00'" },
  // Email provider preference (Resend / SMTP / SendGrid selector)
  { table: "email_settings", column: "preferred_provider", definition: "varchar" },
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
  // Course community post topic/category field
  { table: "course_community_posts", column: "topic", definition: "varchar(100) DEFAULT 'General'" },
  // BreedSkool registrations extended fields
  { table: "breedskool_registrations", column: "delivery_mode", definition: "varchar DEFAULT 'online'" },
  { table: "breedskool_registrations", column: "child_name", definition: "varchar" },
  { table: "breedskool_registrations", column: "child_age", definition: "varchar" },
  { table: "breedskool_registrations", column: "parent_name", definition: "varchar" },
  { table: "breedskool_registrations", column: "home_address", definition: "text" },
  { table: "breedskool_registrations", column: "linked_course_id", definition: "varchar" },
  { table: "breedskool_registrations", column: "currency_used", definition: "varchar DEFAULT 'NGN'" },
  { table: "breedskool_registrations", column: "amount_usd", definition: "decimal(10,2)" },
  { table: "breedskool_registrations", column: "pay_later_deadline", definition: "timestamp" },
  { table: "breedskool_course_pricing", column: "title", definition: "varchar NOT NULL DEFAULT ''" },
  { table: "breedskool_course_pricing", column: "short_description", definition: "text" },
  { table: "breedskool_course_pricing", column: "regular_price", definition: "integer NOT NULL DEFAULT 0" },
  { table: "breedskool_course_pricing", column: "discount_price", definition: "integer NOT NULL DEFAULT 0" },
  { table: "breedskool_course_pricing", column: "duration", definition: "varchar" },
  { table: "breedskool_course_pricing", column: "accepted_payments", definition: "text[] DEFAULT ARRAY['bank_transfer','usdt_tron','usdt_ton','usdt_bnb']" },
  // Legal pages — last_updated_by added after initial schema
  { table: "legal_pages", column: "last_updated_by", definition: "varchar" },
  // direct_hire_offers — columns added after initial deploy (schema drift fix)
  { table: "direct_hire_offers", column: "brand_platform_fee", definition: "decimal(10,2) DEFAULT '0.00'" },
  { table: "direct_hire_offers", column: "brand_total_charge", definition: "decimal(10,2) DEFAULT '0.00'" },
  { table: "direct_hire_offers", column: "platform_fee_amount", definition: "decimal(10,2) DEFAULT '0.00'" },
  { table: "direct_hire_offers", column: "influencer_payout", definition: "decimal(10,2) DEFAULT '0.00'" },
  { table: "direct_hire_offers", column: "rejection_reason", definition: "text" },
  { table: "direct_hire_offers", column: "payment_proof", definition: "varchar" },
  // PWA analytics and search verification fields
  { table: "pwa_settings", column: "ga_tracking_id", definition: "varchar" },
  { table: "pwa_settings", column: "gtm_id", definition: "varchar" },
  { table: "pwa_settings", column: "google_site_verification", definition: "varchar" },
  { table: "pwa_settings", column: "bing_verification", definition: "varchar" },
  { table: "pwa_settings", column: "default_og_image", definition: "varchar" },
  { table: "direct_hire_offers", column: "payment_network", definition: "varchar" },
  { table: "direct_hire_offers", column: "transaction_hash", definition: "varchar" },
  { table: "direct_hire_offers", column: "admin_note", definition: "text" },
  { table: "direct_hire_offers", column: "work_submission_url", definition: "varchar(500)" },
  { table: "direct_hire_offers", column: "work_submission_note", definition: "text" },
  { table: "direct_hire_offers", column: "work_submitted_at", definition: "timestamp" },
  { table: "direct_hire_offers", column: "revision_note", definition: "text" },
  { table: "direct_hire_offers", column: "activated_at", definition: "timestamp" },
  { table: "direct_hire_offers", column: "completed_at", definition: "timestamp" },
  { table: "direct_hire_offers", column: "invoice_number", definition: "varchar" },
  { table: "direct_hire_offers", column: "invoice_generated_at", definition: "timestamp" },
  { table: "direct_hire_offers", column: "invoice_due_date", definition: "timestamp" },
  { table: "direct_hire_offers", column: "invoice_note", definition: "text" },
  { table: "direct_hire_offers", column: "agreed_budget", definition: "decimal(10,2)" },
  { table: "direct_hire_offers", column: "deadline", definition: "timestamp" },
  // course_enrollments — extra tracking columns that may be missing on older DBs
  { table: "course_enrollments", column: "amount", definition: "decimal(10,2) DEFAULT '0.00'" },
  { table: "course_enrollments", column: "is_paid", definition: "boolean DEFAULT false" },
  { table: "course_enrollments", column: "transaction_hash", definition: "varchar" },
  { table: "course_enrollments", column: "progress", definition: "integer DEFAULT 0" },
  { table: "course_enrollments", column: "updated_at", definition: "timestamp DEFAULT now()" },
  { table: "creator_books", column: "book_type", definition: "varchar(40) NOT NULL DEFAULT 'nonfiction'" },
  { table: "creator_books", column: "genre", definition: "varchar(100) NOT NULL DEFAULT 'General nonfiction'" },
  { table: "creator_books", column: "trim_size", definition: "varchar(20) NOT NULL DEFAULT '6x9'" },
  { table: "creator_books", column: "access_url", definition: "text" },
  { table: "creator_publishing_products", column: "access_url", definition: "text" },
  // The legacy shortener table used short_code/clicks. Keep it readable by the
  // current slug/click_count routes when an imported database hasn't migrated yet.
  { table: "short_links", column: "slug", definition: "varchar" },
  { table: "short_links", column: "is_referral", definition: "boolean DEFAULT false" },
  { table: "short_links", column: "click_count", definition: "integer DEFAULT 0" },
  { table: "short_links", column: "is_active", definition: "boolean DEFAULT true" },
  { table: "short_links", column: "created_at", definition: "timestamp DEFAULT now()" },
  { table: "short_link_clicks", column: "clicked_at", definition: "timestamp DEFAULT now()" },
  { table: "short_link_clicks", column: "country_code", definition: "varchar" },
  { table: "short_link_clicks", column: "region", definition: "varchar" },
  { table: "short_link_clicks", column: "city", definition: "varchar" },
  { table: "short_link_clicks", column: "browser", definition: "varchar" },
  { table: "short_link_clicks", column: "os", definition: "varchar" },
  { table: "short_link_clicks", column: "device", definition: "varchar" },
  // The resource listing query uses this field even when no search filter is active.
  { table: "free_download_items", column: "download_code", definition: "varchar(32)" },
];

// Tables that may not exist yet — created with IF NOT EXISTS so they're safe to run every boot
const REQUIRED_TABLES: string[] = [
  // Core courses table — must exist before course_lessons and any seeding
  `CREATE TABLE IF NOT EXISTS "courses" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" varchar NOT NULL,
    "description" text NOT NULL,
    "short_description" varchar,
    "category" varchar NOT NULL,
    "thumbnail" varchar,
    "preview_video_url" varchar,
    "intro_video_url" varchar,
    "service_addons" jsonb DEFAULT '[]'::jsonb,
    "instructor_id" varchar NOT NULL REFERENCES "users"("id"),
    "price" decimal(10,2) DEFAULT '0.00',
    "is_free" boolean DEFAULT false,
    "level" varchar DEFAULT 'beginner',
    "duration" varchar,
    "lessons_count" integer DEFAULT 0,
    "students_count" integer DEFAULT 0,
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "reviews_count" integer DEFAULT 0,
    "average_rating" decimal(3,2) DEFAULT '0.00',
    "syllabus" jsonb DEFAULT '[]'::jsonb,
    "requirements" text[],
    "what_you_learn" text[],
    "tags" text[],
    "status" varchar DEFAULT 'draft',
    "is_published" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "sale_price" decimal(10,2),
    "sale_deadline" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,

  // Course lessons — must exist before course_lesson_progress and assignments
  `CREATE TABLE IF NOT EXISTS "course_lessons" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "title" varchar NOT NULL,
    "description" text,
    "video_url" varchar,
    "video_link" varchar,
    "content" text,
    "order" integer DEFAULT 0,
    "lesson_files" jsonb DEFAULT '[]'::jsonb,
    "is_preview" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now()
  )`,

  // Course enrollments
  `CREATE TABLE IF NOT EXISTS "course_enrollments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "user_id" varchar NOT NULL REFERENCES "users"("id"),
    "status" varchar DEFAULT 'active',
    "payment_proof" varchar,
    "payment_amount" decimal(10,2),
    "payment_method" varchar,
    "payment_status" varchar DEFAULT 'pending',
    "enrolled_at" timestamp DEFAULT now(),
    "completed_at" timestamp
  )`,

  // Course messages (group chat + private DMs)
  `CREATE TABLE IF NOT EXISTS "course_messages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "sender_id" varchar NOT NULL REFERENCES "users"("id"),
    "recipient_id" varchar REFERENCES "users"("id"),
    "message" text NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now()
  )`,

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
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "slug" varchar NOT NULL UNIQUE,
    "original_url" text NOT NULL,
    "title" varchar,
    "is_referral" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "click_count" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now()
  )`,

  // Short link clicks
  `CREATE TABLE IF NOT EXISTS "short_link_clicks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "link_id" varchar NOT NULL REFERENCES "short_links"("id") ON DELETE CASCADE,
    "clicked_at" timestamp DEFAULT now(),
    "ip_address" varchar,
    "user_agent" text,
    "browser" varchar,
    "os" varchar,
    "device" varchar,
    "referer" text,
    "country" varchar,
    "country_code" varchar,
    "region" varchar,
    "city" varchar
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "short_links_slug_unique_idx" ON "short_links" ("slug") WHERE "slug" IS NOT NULL`,

  // Adsterra settings and viewable placement impressions
  `CREATE TABLE IF NOT EXISTS "adsterra_settings" (
    "id" varchar PRIMARY KEY DEFAULT 'singleton',
    "settings" jsonb NOT NULL DEFAULT '{"enabled":false,"placements":[]}'::jsonb,
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "adsterra_events" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "placement_id" varchar NOT NULL,
    "event_type" varchar NOT NULL DEFAULT 'impression',
    "page_path" varchar(512) NOT NULL,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "adsterra_events_placement_created_idx" ON "adsterra_events" ("placement_id", "created_at")`,
  `CREATE INDEX IF NOT EXISTS "adsterra_events_created_idx" ON "adsterra_events" ("created_at")`,

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

  // WordPress plugin studio projects; the saleable product remains in shop_products.
  `CREATE TABLE IF NOT EXISTS "plugin_studio_projects" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "slug" varchar NOT NULL UNIQUE,
    "template_key" varchar NOT NULL DEFAULT 'learnpress-woocommerce',
    "source_prompt" text,
    "name" varchar NOT NULL,
    "version" varchar NOT NULL DEFAULT '1.0.0',
    "author" varchar NOT NULL DEFAULT 'Taskdrip',
    "short_description" varchar,
    "description" text NOT NULL,
    "core_short_description" varchar,
    "core_description" text,
    "core_files" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "premium_files" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "seo_title" varchar,
    "seo_description" varchar,
    "seo_keywords" text,
    "shop_product_id" varchar,
    "status" varchar NOT NULL DEFAULT 'draft',
    "created_by" varchar,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "plugin_studio_projects_shop_product_idx" ON "plugin_studio_projects" ("shop_product_id")`,
  `CREATE TABLE IF NOT EXISTS "plugin_licenses" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "project_id" varchar NOT NULL REFERENCES "plugin_studio_projects"("id") ON DELETE CASCADE,
    "product_id" varchar NOT NULL REFERENCES "shop_products"("id") ON DELETE CASCADE,
    "purchase_id" varchar NOT NULL UNIQUE REFERENCES "purchases"("id") ON DELETE CASCADE,
    "key_hash" varchar NOT NULL UNIQUE,
    "key_encrypted" text NOT NULL,
    "key_prefix" varchar NOT NULL,
    "cadence" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "starts_at" timestamp NOT NULL,
    "expires_at" timestamp NOT NULL,
    "reminder_stage" varchar NOT NULL DEFAULT '',
    "max_activations" integer NOT NULL DEFAULT 3,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `ALTER TABLE IF EXISTS "plugin_licenses" ALTER COLUMN "purchase_id" DROP NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "plugin_licenses_user_status_idx" ON "plugin_licenses" ("user_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "plugin_licenses_project_status_idx" ON "plugin_licenses" ("project_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "plugin_licenses_expiry_idx" ON "plugin_licenses" ("status", "expires_at")`,
  `CREATE TABLE IF NOT EXISTS "plugin_license_sites" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "license_id" varchar NOT NULL REFERENCES "plugin_licenses"("id") ON DELETE CASCADE,
    "installation_id" varchar NOT NULL,
    "site_url" text NOT NULL,
    "plugin_version" varchar,
    "wordpress_version" varchar,
    "status" varchar NOT NULL DEFAULT 'active',
    "activated_at" timestamp DEFAULT now(),
    "last_seen_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "plugin_license_sites_license_installation_unique" ON "plugin_license_sites" ("license_id", "installation_id")`,
  `CREATE INDEX IF NOT EXISTS "plugin_license_sites_license_status_idx" ON "plugin_license_sites" ("license_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "plugin_license_sites_installation_idx" ON "plugin_license_sites" ("installation_id")`,
  `CREATE TABLE IF NOT EXISTS "plugin_license_events" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "license_id" varchar REFERENCES "plugin_licenses"("id") ON DELETE SET NULL,
    "project_id" varchar NOT NULL REFERENCES "plugin_studio_projects"("id") ON DELETE CASCADE,
    "installation_id" varchar,
    "event_type" varchar NOT NULL,
    "details" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "plugin_license_events_project_date_idx" ON "plugin_license_events" ("project_id", "created_at")`,
  `CREATE INDEX IF NOT EXISTS "plugin_license_events_license_date_idx" ON "plugin_license_events" ("license_id", "created_at")`,
  `CREATE TABLE IF NOT EXISTS "plugin_support_threads" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "license_id" varchar NOT NULL REFERENCES "plugin_licenses"("id") ON DELETE CASCADE,
    "project_id" varchar NOT NULL REFERENCES "plugin_studio_projects"("id") ON DELETE CASCADE,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "developer_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "request_type" varchar NOT NULL DEFAULT 'support',
    "subject" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'open',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "plugin_support_messages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "thread_id" varchar NOT NULL REFERENCES "plugin_support_threads"("id") ON DELETE CASCADE,
    "sender_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "read_at" timestamp
  )`,
  `CREATE INDEX IF NOT EXISTS "plugin_support_messages_thread_date_idx" ON "plugin_support_messages" ("thread_id", "created_at")`,

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

  // BreedSkool course pricing / linked course config
  `CREATE TABLE IF NOT EXISTS "breedskool_course_pricing" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_key" varchar NOT NULL UNIQUE,
    "course_title" varchar NOT NULL,
    "price_ngn" integer NOT NULL DEFAULT 0,
    "price_usd" decimal(10,2) DEFAULT '0.00',
    "linked_course_id" varchar,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
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

  // Course assignment submissions (students submit work per lesson)
  `CREATE TABLE IF NOT EXISTS "course_assignments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "lesson_id" varchar REFERENCES "course_lessons"("id") ON DELETE SET NULL,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" varchar NOT NULL,
    "description" text,
    "file_url" varchar,
    "file_name" varchar,
    "file_type" varchar,
    "status" varchar DEFAULT 'submitted',
    "tutor_feedback" text,
    "submitted_at" timestamp DEFAULT now()
  )`,

  // Course community discussion posts (threaded forum per course)
  `CREATE TABLE IF NOT EXISTS "course_community_posts" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "message" text NOT NULL,
    "reply_to_id" varchar,
    "topic" varchar(100) DEFAULT 'General',
    "like_count" integer DEFAULT 0,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now()
  )`,

  // Likes on community posts (one per user per post)
  `CREATE TABLE IF NOT EXISTS "course_community_likes" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "post_id" varchar NOT NULL REFERENCES "course_community_posts"("id") ON DELETE CASCADE,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now()
  )`,

  // Referral click tracking
  `CREATE TABLE IF NOT EXISTS "referral_clicks" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "referrer_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "referral_code" varchar NOT NULL,
    "item_type" varchar NOT NULL DEFAULT 'user',
    "item_id" varchar,
    "ip" varchar,
    "user_agent" varchar,
    "created_at" timestamp DEFAULT now()
  )`,

  // AI Marketing Robot — social leads from Reddit / Hacker News
  `CREATE TABLE IF NOT EXISTS "social_leads" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "platform" varchar NOT NULL,
    "source_id" varchar NOT NULL,
    "title" varchar(500) NOT NULL,
    "body" text,
    "url" text NOT NULL,
    "author" varchar,
    "subreddit" varchar,
    "platform_score" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "relevance_score" integer DEFAULT 0,
    "ai_summary" text,
    "suggested_reply" text,
    "category" varchar DEFAULT 'web_development',
    "urgency" varchar DEFAULT 'medium',
    "status" varchar DEFAULT 'new',
    "keywords_matched" text[],
    "posted_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "social_leads_platform_source_unique" UNIQUE ("platform", "source_id")
  )`,

  // Referral commissions — earnings from product, course, and invite referrals
  `CREATE TABLE IF NOT EXISTS "referral_commissions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "referrer_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "referred_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "item_type" varchar NOT NULL,
    "item_id" varchar,
    "item_title" varchar,
    "sale_amount" decimal(10,2) NOT NULL DEFAULT '0.00',
    "commission_rate" decimal(5,4) NOT NULL DEFAULT '0.0500',
    "commission_amount" decimal(10,2) NOT NULL DEFAULT '0.00',
    "status" varchar NOT NULL DEFAULT 'pending',
    "reference_id" varchar,
    "referral_code" varchar,
    "created_at" timestamp DEFAULT now(),
    "approved_at" timestamp,
    "paid_at" timestamp
  )`,

  // Admin activity history — captures major writes and their sanitized details
  `CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "actor_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "actor_name" varchar,
    "actor_email" varchar,
    "event_type" varchar(60) NOT NULL,
    "action" varchar(200) NOT NULL,
    "description" text NOT NULL,
    "route" varchar(300),
    "method" varchar(10),
    "status" varchar(20) NOT NULL DEFAULT 'success',
    "entity_type" varchar(60),
    "entity_id" varchar,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "ip_address" varchar(100),
    "user_agent" text,
    "created_at" timestamp DEFAULT now()
  )`,

  // Creator Studio books — kept here as well as in SQL migrations so imported
  // databases can open the studio without a separate manual schema push.
  `CREATE TABLE IF NOT EXISTS "creator_books" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "creator_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" varchar(240) NOT NULL,
    "subtitle" varchar(300),
    "book_type" varchar(40) NOT NULL DEFAULT 'nonfiction',
    "genre" varchar(100) NOT NULL DEFAULT 'General nonfiction',
    "trim_size" varchar(20) NOT NULL DEFAULT '6x9',
    "idea" text,
    "description" text,
    "outline" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "chapters" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "designer_document" jsonb,
    "generation_job_id" varchar(80),
    "generation_status" varchar(24) NOT NULL DEFAULT 'idle',
    "generation_progress" integer NOT NULL DEFAULT 0,
    "generation_message" text,
    "generation_error" text,
    "cover_image" text,
    "amazon_url" text,
    "access_url" text,
    "status" varchar(32) NOT NULL DEFAULT 'draft',
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "creator_books_creator_id_idx" ON "creator_books" ("creator_id")`,
  `CREATE INDEX IF NOT EXISTS "creator_books_status_idx" ON "creator_books" ("status")`,
  `ALTER TABLE "creator_books" ADD COLUMN IF NOT EXISTS "kdp_keywords" jsonb NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE "creator_books" ADD COLUMN IF NOT EXISTS "designer_document" jsonb`,
  `ALTER TABLE "creator_books" ADD COLUMN IF NOT EXISTS "generation_job_id" varchar(80)`,
  `ALTER TABLE "creator_books" ADD COLUMN IF NOT EXISTS "generation_status" varchar(24) NOT NULL DEFAULT 'idle'`,
  `ALTER TABLE "creator_books" ADD COLUMN IF NOT EXISTS "generation_progress" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "creator_books" ADD COLUMN IF NOT EXISTS "generation_message" text`,
  `ALTER TABLE "creator_books" ADD COLUMN IF NOT EXISTS "generation_error" text`,
  `CREATE TABLE IF NOT EXISTS "creator_notebook_projects" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "owner_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" varchar(240) NOT NULL DEFAULT 'Untitled notebook',
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "cover_design" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "status" varchar(32) NOT NULL DEFAULT 'draft',
    "generation_status" varchar(24) NOT NULL DEFAULT 'idle',
    "interior_file_key" text,
    "cover_file_key" text,
    "preview_file_key" text,
    "validation" jsonb,
    "last_generated_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "creator_notebook_projects_owner_updated_idx" ON "creator_notebook_projects" ("owner_id", "updated_at")`,
  `CREATE INDEX IF NOT EXISTS "creator_notebook_projects_status_idx" ON "creator_notebook_projects" ("status")`,
  `CREATE TABLE IF NOT EXISTS "creator_publishing_products" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "creator_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "book_id" varchar REFERENCES "creator_books"("id") ON DELETE SET NULL,
    "shop_product_id" varchar REFERENCES "shop_products"("id") ON DELETE SET NULL,
    "title" varchar(240) NOT NULL,
    "description" text NOT NULL,
    "product_type" varchar(60) NOT NULL,
    "category" varchar(100) NOT NULL,
    "price" numeric(10,2) NOT NULL DEFAULT '0.00',
    "currency" varchar(8) NOT NULL DEFAULT 'USD',
    "cover_image" text,
    "tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
    "version" varchar(40) DEFAULT '1.0',
    "license" text,
    "amazon_url" text,
    "access_url" text,
    "file_key" text,
    "original_file_name" varchar(255),
    "mime_type" varchar(120),
    "file_size" integer,
    "status" varchar(32) NOT NULL DEFAULT 'draft',
    "review_note" text,
    "submitted_at" timestamp,
    "reviewed_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "creator_publishing_products_creator_id_idx" ON "creator_publishing_products" ("creator_id")`,
  `CREATE INDEX IF NOT EXISTS "creator_publishing_products_status_idx" ON "creator_publishing_products" ("status")`,
  `CREATE INDEX IF NOT EXISTS "creator_publishing_products_shop_product_id_idx" ON "creator_publishing_products" ("shop_product_id")`,
  `CREATE TABLE IF NOT EXISTS "creator_product_earnings" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "purchase_id" varchar NOT NULL UNIQUE REFERENCES "purchases"("id"),
    "product_id" varchar NOT NULL REFERENCES "shop_products"("id"),
    "creator_id" varchar NOT NULL REFERENCES "users"("id"),
    "currency" varchar(8) NOT NULL DEFAULT 'USD',
    "gross_amount" numeric(10,2) NOT NULL,
    "platform_fee" numeric(10,2) NOT NULL DEFAULT '0.00',
    "referral_fee" numeric(10,2) NOT NULL DEFAULT '0.00',
    "processing_fee" numeric(10,2) NOT NULL DEFAULT '0.00',
    "net_amount" numeric(10,2) NOT NULL,
    "status" varchar(24) NOT NULL DEFAULT 'available',
    "created_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "creator_product_earnings_creator_id_idx" ON "creator_product_earnings" ("creator_id")`,
  `CREATE TABLE IF NOT EXISTS "creator_product_downloads" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "publishing_product_id" varchar NOT NULL REFERENCES "creator_publishing_products"("id") ON DELETE CASCADE,
    "purchase_id" varchar NOT NULL REFERENCES "purchases"("id") ON DELETE CASCADE,
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "downloaded_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "creator_product_downloads_purchase_id_idx" ON "creator_product_downloads" ("purchase_id")`,
  `CREATE TABLE IF NOT EXISTS "creator_studio_subscriptions" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "status" varchar(24) NOT NULL DEFAULT 'pending',
    "amount" numeric(10,2) NOT NULL,
    "currency" varchar(8) NOT NULL DEFAULT 'USD',
    "network" varchar(40) DEFAULT 'manual',
    "transaction_hash" varchar(255),
    "payment_proof_key" text,
    "payment_method_label" varchar(160),
    "period_days" integer NOT NULL DEFAULT 30,
    "start_date" timestamp,
    "end_date" timestamp,
    "review_note" text,
    "reviewed_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "reviewed_at" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "creator_studio_subscriptions_user_status_idx" ON "creator_studio_subscriptions" ("user_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "creator_studio_subscriptions_status_created_idx" ON "creator_studio_subscriptions" ("status", "created_at")`,

  // Free Downloads schema — kept additive/idempotent for Railway's external PostgreSQL.
  `CREATE SEQUENCE IF NOT EXISTS "free_download_code_seq"`,
  `CREATE TABLE IF NOT EXISTS "free_download_categories" (
    "id" text PRIMARY KEY,
    "name" varchar(120) NOT NULL,
    "slug" varchar(140) NOT NULL UNIQUE,
    "description" text NOT NULL DEFAULT '',
    "image_url" text,
    "sort_order" integer NOT NULL DEFAULT 0,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_subcategories" (
    "id" text PRIMARY KEY,
    "category_id" text NOT NULL REFERENCES "free_download_categories"("id") ON DELETE CASCADE,
    "name" varchar(120) NOT NULL,
    "slug" varchar(140) NOT NULL,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("category_id", "slug")
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_preachers" (
    "id" text PRIMARY KEY,
    "full_name" varchar(180) NOT NULL,
    "slug" varchar(200) NOT NULL UNIQUE,
    "photograph_url" text,
    "biography" text NOT NULL DEFAULT '',
    "ministry_name" varchar(180) NOT NULL DEFAULT '',
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_items" (
    "id" text PRIMARY KEY,
    "title" varchar(220) NOT NULL,
    "slug" varchar(240) NOT NULL UNIQUE,
    "short_description" varchar(600) NOT NULL DEFAULT '',
    "description_html" text NOT NULL DEFAULT '',
    "category_id" text NOT NULL REFERENCES "free_download_categories"("id") ON DELETE RESTRICT,
    "subcategory_id" text REFERENCES "free_download_subcategories"("id") ON DELETE SET NULL,
    "tags" text[] NOT NULL DEFAULT '{}',
    "thumbnail_url" text,
    "gallery_urls" text[] NOT NULL DEFAULT '{}',
    "preview_video_url" text,
    "external_demo_url" text,
    "format" varchar(40) NOT NULL DEFAULT '',
    "version" varchar(80) NOT NULL DEFAULT '',
    "creator" varchar(180) NOT NULL DEFAULT '',
    "release_date" date,
    "system_requirements" text NOT NULL DEFAULT '',
    "installation_instructions" text NOT NULL DEFAULT '',
    "features" text[] NOT NULL DEFAULT '{}',
    "preacher_id" text REFERENCES "free_download_preachers"("id") ON DELETE SET NULL,
    "source_file_key" text,
    "source_file_name" varchar(255),
    "source_mime_type" varchar(160),
    "source_size_bytes" bigint,
    "external_download_url" text,
    "download_code" varchar(32) NOT NULL DEFAULT ('TFD' || LPAD(nextval('free_download_code_seq')::text, 2, '0')),
    "seo_title" varchar(220) NOT NULL DEFAULT '',
    "seo_description" varchar(320) NOT NULL DEFAULT '',
    "focus_keyword" varchar(160) NOT NULL DEFAULT '',
    "canonical_url" text,
    "og_title" varchar(220) NOT NULL DEFAULT '',
    "og_description" varchar(320) NOT NULL DEFAULT '',
    "og_image" text,
    "publication_status" varchar(16) NOT NULL DEFAULT 'draft'
      CHECK ("publication_status" IN ('draft', 'preview', 'published')),
    "is_featured" boolean NOT NULL DEFAULT false,
    "download_count" integer NOT NULL DEFAULT 0,
    "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    "published_at" timestamptz
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_unlocks" (
    "id" text PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "download_id" text NOT NULL REFERENCES "free_download_items"("id") ON DELETE CASCADE,
    "ad_redirected_at" timestamptz,
    "unlocked_at" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("user_id", "download_id")
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_events" (
    "id" text PRIMARY KEY,
    "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
    "download_id" text REFERENCES "free_download_items"("id") ON DELETE CASCADE,
    "event_type" varchar(32) NOT NULL
      CHECK ("event_type" IN ('detail_view', 'ad_redirect', 'unlock', 'download_click')),
    "completed_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_requests" (
    "id" text PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "resource_title" varchar(220) NOT NULL,
    "category_name" varchar(120) NOT NULL,
    "description" text NOT NULL,
    "preferred_format" varchar(80) NOT NULL DEFAULT '',
    "reference_url" text,
    "email" varchar(254) NOT NULL,
    "additional_comments" text NOT NULL DEFAULT '',
    "status" varchar(20) NOT NULL DEFAULT 'pending'
      CHECK ("status" IN ('pending', 'processing', 'available', 'rejected')),
    "internal_notes" text NOT NULL DEFAULT '',
    "response" text NOT NULL DEFAULT '',
    "linked_download_id" text REFERENCES "free_download_items"("id") ON DELETE SET NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_slides" (
    "id" text PRIMARY KEY,
    "title" varchar(220) NOT NULL,
    "description" varchar(600) NOT NULL DEFAULT '',
    "image_url" text NOT NULL,
    "cta_label" varchar(80) NOT NULL DEFAULT 'Explore downloads',
    "cta_url" varchar(500) NOT NULL DEFAULT '/downloads',
    "sort_order" integer NOT NULL DEFAULT 0,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "free_download_settings" (
    "id" text PRIMARY KEY DEFAULT 'default',
    "smartlink_url" text NOT NULL DEFAULT '',
    "ad_requirement_enabled" boolean NOT NULL DEFAULT false,
    "telegram_url" text NOT NULL DEFAULT 'https://t.me/taskdrip',
    "updated_at" timestamptz NOT NULL DEFAULT now()
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

  const freeDownloadRepairs = [
    `UPDATE free_download_items
     SET download_code = 'TFD' || LPAD(nextval('free_download_code_seq')::text, 2, '0')
     WHERE download_code IS NULL OR btrim(download_code) = ''`,
    `ALTER TABLE IF EXISTS free_download_items
     ALTER COLUMN download_code SET DEFAULT ('TFD' || LPAD(nextval('free_download_code_seq')::text, 2, '0'))`,
    `ALTER TABLE IF EXISTS free_download_items ALTER COLUMN download_code SET NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS free_download_items_download_code_unique
     ON free_download_items(download_code)`,
    `CREATE INDEX IF NOT EXISTS free_download_items_public_idx
     ON free_download_items(publication_status, category_id, published_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_items_featured_idx
     ON free_download_items(is_featured, publication_status, published_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_items_preacher_idx
     ON free_download_items(preacher_id, publication_status)`,
    `CREATE INDEX IF NOT EXISTS free_download_unlocks_user_idx
     ON free_download_unlocks(user_id, unlocked_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_events_type_date_idx
     ON free_download_events(event_type, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_events_download_date_idx
     ON free_download_events(download_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_events_user_download_type_idx
     ON free_download_events(user_id, download_id, event_type, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_requests_user_idx
     ON free_download_requests(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_requests_status_idx
     ON free_download_requests(status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS free_download_requests_category_status_idx
     ON free_download_requests(category_name, status, created_at DESC)`,
    `INSERT INTO free_download_settings (id)
     VALUES ('default') ON CONFLICT (id) DO NOTHING`,
    `INSERT INTO free_download_categories (id, name, slug, description, sort_order)
     VALUES
       ('fd-cat-files', 'Files & Documents', 'files-documents', 'Useful documents, templates, guides and learning resources.', 1),
       ('fd-cat-ai', 'AI Tools', 'ai-tools', 'AI applications and tools for work and creativity.', 2),
       ('fd-cat-software', 'Software', 'software', 'Software and applications shared with permission.', 3),
       ('fd-cat-movies', 'Movies', 'movies', 'Legally distributable films and public-domain cinema.', 4),
       ('fd-cat-videos', 'Videos', 'videos', 'Video resources, tutorials and creator-authorized media.', 5),
       ('fd-cat-podcasts', 'Podcasts', 'podcasts', 'Podcast episodes and audio series.', 6),
       ('fd-cat-music', 'Music', 'music', 'Licensed, public-domain and creator-authorized music.', 7),
       ('fd-cat-sermons', 'Sermons', 'sermons', 'Sermons and ministry resources shared with permission.', 8)
     ON CONFLICT (slug) DO NOTHING`,
  ];
  for (const query of freeDownloadRepairs) {
    try {
      await db.execute(sql.raw(query));
    } catch (err: any) {
      console.error(`[startup-migration] Free Downloads repair error: ${err?.message}`);
    }
  }

  // Preserve old short-link identifiers when upgrading a legacy imported table.
  try {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'short_links'
            AND column_name = 'short_code'
        ) THEN
          EXECUTE 'UPDATE short_links SET slug = short_code WHERE slug IS NULL';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'short_links'
            AND column_name = 'clicks'
        ) THEN
          EXECUTE 'UPDATE short_links SET click_count = clicks WHERE click_count = 0';
        END IF;
      END $$;
    `));
  } catch (err: any) {
    console.error(`[startup-migration] Failed to backfill legacy short links: ${err?.message}`);
  }

  try {
    await db.execute(sql.raw(
      `CREATE UNIQUE INDEX IF NOT EXISTS "short_links_slug_unique_idx" ON "short_links" ("slug") WHERE "slug" IS NOT NULL;`
    ));
  } catch (err: any) {
    console.error(`[startup-migration] Failed to ensure short_links.slug index: ${err?.message}`);
  }
}
