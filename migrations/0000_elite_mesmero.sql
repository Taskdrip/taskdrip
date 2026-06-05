CREATE TABLE "ad_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_id" varchar,
	"event_type" varchar NOT NULL,
	"session_id" varchar,
	"user_id" varchar,
	"device_type" varchar,
	"browser" varchar,
	"os" varchar,
	"country" varchar,
	"city" varchar,
	"ip_address" varchar,
	"page_url" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ad_network_placements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"network" varchar NOT NULL,
	"ad_code" text NOT NULL,
	"placement_type" varchar DEFAULT 'inline' NOT NULL,
	"target_pages" text DEFAULT 'all' NOT NULL,
	"popup_delay" integer DEFAULT 5,
	"popup_frequency" varchar DEFAULT 'session',
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_name" varchar(100) NOT NULL,
	"wallet_address" varchar(100) NOT NULL,
	"network" varchar(20) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"qr_code_path" varchar(500),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "advertise_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"status" varchar DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" varchar PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auto_blog_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar,
	"source_title" text,
	"source_url" text,
	"source_content" text,
	"category" varchar,
	"status" varchar DEFAULT 'pending',
	"blog_post_id" varchar,
	"error_message" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auto_blog_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"url" text,
	"category" varchar,
	"is_active" boolean DEFAULT true,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auto_blogger_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'singleton' NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "blocked_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" varchar NOT NULL,
	"blocked_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_category_follows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"parent_id" varchar,
	"is_approved" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"featured_image" varchar,
	"category" varchar,
	"tags" text[],
	"author_id" varchar,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"view_count" integer DEFAULT 0,
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"meta_description" text,
	"seo_keywords" text,
	"reading_time" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_tips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar,
	"display_name" varchar(100),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USDT',
	"network" varchar(20) NOT NULL,
	"tx_hash" varchar(200),
	"wallet_address" varchar(200),
	"status" varchar DEFAULT 'pending',
	"message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brand_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar,
	"total_deposited" numeric(10, 2) DEFAULT '0.00',
	"total_spent" numeric(10, 2) DEFAULT '0.00',
	"available_balance" numeric(10, 2) DEFAULT '0.00',
	"pending_deposits" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "brand_wallets_brand_id_unique" UNIQUE("brand_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_micro_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"brand_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"tdrip_reward" integer NOT NULL,
	"participant_limit" integer DEFAULT 0,
	"escrowed_points" integer NOT NULL,
	"action_url" varchar(500),
	"proof_required" boolean DEFAULT true,
	"auto_approve" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_participations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"submission_text" text,
	"submission_files" text[],
	"submission_url" varchar,
	"admin_notes" text,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"category" varchar NOT NULL,
	"platform" varchar,
	"brand_name" varchar NOT NULL,
	"brand_logo" varchar,
	"brand_id" varchar NOT NULL,
	"reward" numeric(10, 2) NOT NULL,
	"total_budget" numeric(10, 2),
	"budget_per_creator" numeric(10, 2),
	"feature_image" varchar(500),
	"instruction_video_url" varchar(500),
	"total_slots" integer NOT NULL,
	"filled_slots" integer DEFAULT 0,
	"estimated_time" varchar,
	"requirements" text[],
	"pre_qualification_tasks" jsonb,
	"intro_video_url" varchar,
	"service_addons" jsonb DEFAULT '[]'::jsonb,
	"qualification_rules" text,
	"min_followers" integer DEFAULT 0,
	"tdrip_points_per_participant" integer DEFAULT 0,
	"tdrip_participant_limit" integer DEFAULT 0,
	"tdrip_escrow_value" numeric(10, 2) DEFAULT '0.00',
	"auto_approve_micro_tasks" boolean DEFAULT false,
	"status" varchar DEFAULT 'pending_payment',
	"payment_status" varchar DEFAULT 'pending',
	"deposit_required" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"deadline" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" varchar,
	"content_type" varchar(30) NOT NULL,
	"content_id" varchar NOT NULL,
	"reason" varchar(60) NOT NULL,
	"details" text,
	"status" varchar(20) DEFAULT 'open',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_certificate_template" (
	"id" varchar PRIMARY KEY DEFAULT 'default' NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "course_certificates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cert_code" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"student_name" varchar NOT NULL,
	"course_title" varchar NOT NULL,
	"instructor_name" varchar,
	"issued_at" timestamp DEFAULT now(),
	CONSTRAINT "course_certificates_cert_code_unique" UNIQUE("cert_code")
);
--> statement-breakpoint
CREATE TABLE "course_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"parent_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar DEFAULT 'active',
	"progress" integer DEFAULT 0,
	"payment_method" varchar,
	"payment_proof" varchar,
	"transaction_hash" varchar,
	"amount" numeric(10, 2) DEFAULT '0.00',
	"is_paid" boolean DEFAULT false,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_lesson_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"lesson_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_lessons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"video_url" varchar,
	"video_link" varchar,
	"content" text,
	"order" integer DEFAULT 0,
	"lesson_files" jsonb DEFAULT '[]'::jsonb,
	"is_preview" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"recipient_id" varchar,
	"message" text NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"short_description" varchar,
	"category" varchar NOT NULL,
	"thumbnail" varchar,
	"preview_video_url" varchar,
	"intro_video_url" varchar,
	"service_addons" jsonb DEFAULT '[]'::jsonb,
	"instructor_id" varchar NOT NULL,
	"price" numeric(10, 2) DEFAULT '0.00',
	"is_free" boolean DEFAULT false,
	"level" varchar DEFAULT 'beginner',
	"duration" varchar,
	"lessons_count" integer DEFAULT 0,
	"students_count" integer DEFAULT 0,
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"reviews_count" integer DEFAULT 0,
	"average_rating" numeric(3, 2) DEFAULT '0.00',
	"syllabus" jsonb DEFAULT '[]'::jsonb,
	"requirements" text[],
	"what_you_learn" text[],
	"tags" text[],
	"status" varchar DEFAULT 'draft',
	"is_published" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "direct_hire_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"influencer_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"deliverables" text,
	"budget" numeric(10, 2) NOT NULL,
	"brand_platform_fee" numeric(10, 2) DEFAULT '0.00',
	"brand_total_charge" numeric(10, 2) DEFAULT '0.00',
	"platform_fee_amount" numeric(10, 2) DEFAULT '0.00',
	"influencer_payout" numeric(10, 2) DEFAULT '0.00',
	"deadline" timestamp,
	"status" varchar DEFAULT 'pending',
	"rejection_reason" text,
	"payment_proof" varchar,
	"payment_network" varchar,
	"transaction_hash" varchar,
	"admin_note" text,
	"work_submission_url" varchar(500),
	"work_submission_note" text,
	"work_submitted_at" timestamp,
	"revision_note" text,
	"activated_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_auto_responders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"trigger" varchar NOT NULL,
	"trigger_delay" integer DEFAULT 0,
	"subject" varchar NOT NULL,
	"html_body" text NOT NULL,
	"text_body" text,
	"target_user_type" varchar DEFAULT 'all',
	"is_active" boolean DEFAULT true,
	"ai_generated" boolean DEFAULT false,
	"ai_prompt" text,
	"sent_count" integer DEFAULT 0,
	"open_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"html_body" text NOT NULL,
	"text_body" text,
	"template_id" varchar,
	"target_segment" varchar DEFAULT 'all' NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"total_recipients" integer DEFAULT 0,
	"sent" integer DEFAULT 0,
	"delivered" integer DEFAULT 0,
	"opened" integer DEFAULT 0,
	"clicked" integer DEFAULT 0,
	"bounced" integer DEFAULT 0,
	"unsubscribed" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"auto_responder_id" varchar,
	"recipient_email" varchar NOT NULL,
	"recipient_name" varchar,
	"subject" varchar NOT NULL,
	"status" varchar DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"smtp_host" varchar,
	"smtp_port" integer DEFAULT 587,
	"smtp_user" varchar,
	"smtp_pass" varchar,
	"smtp_ssl" boolean DEFAULT false,
	"smtp_tls" boolean DEFAULT true,
	"smtp_from_email" varchar,
	"smtp_from_name" varchar,
	"imap_host" varchar,
	"imap_port" integer DEFAULT 993,
	"imap_user" varchar,
	"imap_pass" varchar,
	"imap_ssl" boolean DEFAULT true,
	"site_url" varchar,
	"domain" varchar,
	"unsubscribe_url" varchar,
	"logo_url" varchar,
	"spf_record" text,
	"dkim_public_key" text,
	"dmarc_record" text,
	"is_verified" boolean DEFAULT false,
	"last_tested_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"category" varchar DEFAULT 'general' NOT NULL,
	"subject" varchar NOT NULL,
	"html_body" text NOT NULL,
	"text_body" text,
	"variables" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "escrow_payments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"campaign_id" varchar NOT NULL,
	"brand_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"transaction_hash" varchar,
	"network" varchar(20),
	"payment_screenshot" varchar,
	"payment_window_start" timestamp,
	"payment_window_end" timestamp,
	"submitted_at" timestamp,
	"verified_at" timestamp,
	"verified_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "footer_columns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "hero_sliders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order" integer DEFAULT 0,
	"badge" varchar,
	"headline" text NOT NULL,
	"subheadline" text,
	"cta_primary_label" varchar,
	"cta_primary_link" varchar,
	"cta_secondary_label" varchar,
	"cta_secondary_link" varchar,
	"background_image" text,
	"overlay_color" varchar DEFAULT 'from-black/90 via-black/70 to-black/40',
	"accent_color" varchar DEFAULT 'from-purple-400 via-pink-400 to-orange-400',
	"is_active" boolean DEFAULT true,
	"target_pages" text DEFAULT 'landing',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "keyword_trackers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"keyword" varchar NOT NULL,
	"platforms" text[] DEFAULT ARRAY[]::text[],
	"region" varchar DEFAULT 'US',
	"is_active" boolean DEFAULT true,
	"last_refreshed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"direction" varchar DEFAULT 'outbound',
	"body" text,
	"status" varchar DEFAULT 'sent',
	"provider" varchar,
	"provider_id" varchar,
	"error" text,
	"sent_by" varchar,
	"campaign_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leaderboard_giveaways" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"prize" varchar(500) NOT NULL,
	"prize_value" numeric(12, 2) DEFAULT '0.00',
	"total_prize_pool" numeric(12, 2) DEFAULT '0.00',
	"prize_image_url" varchar(500),
	"sponsor_name" varchar(200),
	"sponsor_brand_id" varchar,
	"sponsor_url" varchar(500),
	"sponsor_logo_url" varchar(500),
	"requirements" text,
	"eligible_leaderboards" text[] DEFAULT ARRAY[]::text[],
	"winner_count" integer DEFAULT 1,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leaderboard_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"position_from" integer NOT NULL,
	"position_to" integer NOT NULL,
	"prize_value" numeric(12, 2) DEFAULT '0.00',
	"currency" varchar(20) DEFAULT 'USDT',
	"prize_description" varchar(500),
	"prize_image_url" varchar(500),
	"leaderboard_type" varchar(30) DEFAULT 'all',
	"sponsor_name" varchar(200),
	"sponsor_brand_id" varchar,
	"sponsor_url" varchar(500),
	"sponsor_logo_url" varchar(500),
	"season" varchar(50),
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar NOT NULL,
	"source" varchar,
	"external_id" varchar,
	"name" varchar NOT NULL,
	"niche" varchar,
	"business_type" varchar,
	"country" varchar,
	"city" varchar,
	"address" text,
	"latitude" varchar,
	"longitude" varchar,
	"phone" varchar,
	"whatsapp" varchar,
	"email" varchar,
	"website" varchar,
	"social_links" jsonb DEFAULT '{}'::jsonb,
	"followers" integer,
	"years_in_business" integer,
	"rating" varchar,
	"review_count" integer,
	"description" text,
	"ai_summary" text,
	"ai_report" text,
	"tags" text[] DEFAULT '{}',
	"status" varchar DEFAULT 'new',
	"last_contacted_at" timestamp,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"last_updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "legal_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"participation_id" varchar,
	"sender_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"subject" varchar(200),
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'general',
	"reference_type" varchar(50),
	"reference_id" varchar,
	"is_read" boolean DEFAULT false,
	"attachments" jsonb,
	"parent_message_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "micro_task_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"micro_task_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"proof_text" text,
	"proof_url" varchar(500),
	"proof_file" varchar(500),
	"status" varchar DEFAULT 'pending',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"submitted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"name" varchar,
	"status" varchar DEFAULT 'active',
	"source" varchar DEFAULT 'footer',
	"ip_address" varchar,
	"subscribed_at" timestamp DEFAULT now(),
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"action_url" varchar,
	"related_id" uuid,
	"is_read" boolean DEFAULT false,
	"priority" varchar(20) DEFAULT 'normal',
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "p2p_action_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" varchar,
	"listing_id" varchar,
	"actor_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "p2p_fee_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_type" varchar NOT NULL,
	"fee_type" varchar DEFAULT 'percentage' NOT NULL,
	"fee_value" numeric(10, 2) DEFAULT '2.00' NOT NULL,
	"min_fee" numeric(10, 2) DEFAULT '0.00',
	"max_fee" numeric(10, 2),
	"buyer_fee_type" varchar DEFAULT 'percentage',
	"buyer_fee_value" numeric(10, 2) DEFAULT '2.00',
	"buyer_min_fee" numeric(10, 2) DEFAULT '0.00',
	"buyer_max_fee" numeric(10, 2),
	"seller_fee_type" varchar DEFAULT 'percentage',
	"seller_fee_value" numeric(10, 2) DEFAULT '0.00',
	"seller_min_fee" numeric(10, 2) DEFAULT '0.00',
	"seller_max_fee" numeric(10, 2),
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "p2p_fee_config_transaction_type_unique" UNIQUE("transaction_type")
);
--> statement-breakpoint
CREATE TABLE "p2p_listings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"listing_type" varchar NOT NULL,
	"product_subtype" varchar,
	"description" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'USD',
	"min_order" numeric(10, 2),
	"max_order" numeric(10, 2),
	"crypto_asset" varchar,
	"payment_method" varchar NOT NULL,
	"country" varchar,
	"shipping_info" text,
	"task_addons" jsonb,
	"service_addons" jsonb DEFAULT '[]'::jsonb,
	"intro_video_url" varchar,
	"tdrip_points_per_participant" integer DEFAULT 0,
	"tdrip_participant_limit" integer DEFAULT 0,
	"tdrip_escrow_value" numeric(10, 2) DEFAULT '0.00',
	"featured_image" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"is_featured" boolean DEFAULT false,
	"admin_note" text,
	"approved_by" varchar,
	"approved_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "p2p_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"attachment_url" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "p2p_task_addon_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"task_index" integer DEFAULT 0 NOT NULL,
	"task_description" text,
	"proof_type" varchar DEFAULT 'link' NOT NULL,
	"proof_url" varchar(1000),
	"proof_screenshot" varchar(500),
	"proof_note" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "p2p_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar NOT NULL,
	"buyer_id" varchar NOT NULL,
	"seller_id" varchar NOT NULL,
	"admin_id" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"fee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"buyer_fee" numeric(10, 2) DEFAULT '0.00',
	"seller_fee" numeric(10, 2) DEFAULT '0.00',
	"net_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'USD',
	"transaction_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"buyer_crypto_wallet" varchar,
	"seller_crypto_wallet" varchar,
	"shipping_address" text,
	"payment_marked_at" timestamp,
	"payment_proof" varchar,
	"payment_note" text,
	"funded_at" timestamp,
	"delivered_at" timestamp,
	"delivery_note" text,
	"buyer_confirmed_at" timestamp,
	"dispute_reason" text,
	"dispute_winner_id" varchar,
	"released_at" timestamp,
	"refunded_at" timestamp,
	"cancelled_at" timestamp,
	"admin_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page" varchar NOT NULL,
	"section" varchar NOT NULL,
	"key" varchar NOT NULL,
	"value" text,
	"default_value" text,
	"type" varchar DEFAULT 'text',
	"label" varchar NOT NULL,
	"description" text,
	"order" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_hero_backgrounds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page" varchar NOT NULL,
	"image_url" varchar NOT NULL,
	"overlay_opacity" integer DEFAULT 60,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "page_hero_backgrounds_page_unique" UNIQUE("page")
);
--> statement-breakpoint
CREATE TABLE "page_seo_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_slug" varchar NOT NULL,
	"page_title" varchar NOT NULL,
	"meta_title" varchar,
	"meta_description" text,
	"og_title" varchar,
	"og_description" text,
	"og_image" varchar,
	"twitter_card" varchar DEFAULT 'summary_large_image',
	"twitter_title" varchar,
	"twitter_description" text,
	"twitter_image" varchar,
	"keywords" text,
	"canonical_url" varchar,
	"no_index" boolean DEFAULT false,
	"no_follow" boolean DEFAULT false,
	"structured_data" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "page_seo_settings_page_slug_unique" UNIQUE("page_slug")
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" varchar NOT NULL,
	"referrer" varchar,
	"user_id" varchar,
	"session_id" varchar,
	"user_agent" varchar,
	"country" varchar,
	"device" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar,
	"brand_id" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"network" varchar(20) NOT NULL,
	"wallet_address" varchar(100),
	"transaction_hash" varchar(100),
	"payment_proof" varchar(500),
	"status" varchar(20) DEFAULT 'pending',
	"timer_expires_at" timestamp,
	"admin_notes" text,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_feature_toggles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_method_id" varchar NOT NULL,
	"feature" varchar NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar NOT NULL,
	"label" varchar NOT NULL,
	"network" varchar,
	"currency" varchar,
	"address" varchar(500),
	"bank_name" varchar,
	"account_name" varchar,
	"account_number" varchar,
	"routing_number" varchar,
	"swift_code" varchar,
	"bank_country" varchar,
	"bank_currency" varchar,
	"paypal_email" varchar,
	"paypal_client_id" varchar,
	"paystack_public_key" varchar,
	"paystack_secret_key" varchar,
	"stripe_public_key" varchar,
	"stripe_secret_key" varchar,
	"instructions" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_networks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"short_name" varchar(30) NOT NULL,
	"network" varchar(20) NOT NULL,
	"currency" varchar(10) DEFAULT 'USDT' NOT NULL,
	"wallet_address" varchar(200),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_networks_network_key_unique" UNIQUE("network_key")
);
--> statement-breakpoint
CREATE TABLE "payout_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_request_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"network" varchar(20) NOT NULL,
	"wallet_address" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"transaction_hash" varchar,
	"processed_by" varchar,
	"processed_at" timestamp,
	"campaign_id" varchar,
	"direct_hire_id" varchar,
	"source_type" varchar(30) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_fees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"fee_type" varchar DEFAULT 'percentage' NOT NULL,
	"value" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_fees_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"image_url" varchar,
	"video_url" varchar(500),
	"url" varchar(500),
	"category" varchar,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"parent_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" varchar PRIMARY KEY NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"image_url" varchar,
	"video_url" varchar,
	"like_count" integer DEFAULT 0,
	"comment_count" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"total_tips_received" numeric(10, 2) DEFAULT '0.00',
	"is_spotlight" boolean DEFAULT false,
	"is_sponsored" boolean DEFAULT false,
	"niche" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"purchase_id" varchar,
	"rating" integer NOT NULL,
	"title" varchar,
	"comment" text,
	"is_verified" boolean DEFAULT false,
	"helpful_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" integer DEFAULT 1,
	"amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar,
	"payment_proof" varchar,
	"transaction_hash" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"delivery_details" jsonb,
	"admin_notes" text,
	"paid_at" timestamp,
	"delivered_at" timestamp,
	"selected_addons" jsonb DEFAULT '[]'::jsonb,
	"addons_total" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_notification_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"body" text NOT NULL,
	"icon" varchar,
	"click_url" varchar,
	"target_type" varchar DEFAULT 'all',
	"status" varchar DEFAULT 'draft',
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"sent_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"user_agent" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "pwa_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_name" varchar DEFAULT 'Taskdrip' NOT NULL,
	"short_name" varchar DEFAULT 'Taskdrip' NOT NULL,
	"description" text DEFAULT 'The leading Web3 influencer marketplace connecting global brands with verified creators.' NOT NULL,
	"theme_color" varchar DEFAULT '#7c3aed' NOT NULL,
	"background_color" varchar DEFAULT '#0f0f1a' NOT NULL,
	"display_mode" varchar DEFAULT 'standalone' NOT NULL,
	"prompt_title" varchar DEFAULT 'Never Miss a Crypto Drop' NOT NULL,
	"prompt_message" text DEFAULT 'Turn on Taskdrip alerts and be first in line when high-paying Web3 campaigns go live. New tasks move fast — claim your spot before the rewards are gone.' NOT NULL,
	"prompt_image_url" varchar,
	"prompt_enabled" boolean DEFAULT true NOT NULL,
	"prompt_delay" integer DEFAULT 30 NOT NULL,
	"prompt_scroll_percent" integer DEFAULT 25 NOT NULL,
	"ga_tracking_id" varchar,
	"gtm_id" varchar,
	"google_site_verification" varchar,
	"bing_verification" varchar,
	"default_og_image" varchar,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_id" varchar NOT NULL,
	"referral_type" varchar NOT NULL,
	"referral_code" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"short_description" varchar,
	"price" numeric(10, 2) NOT NULL,
	"original_price" numeric(10, 2),
	"category" varchar NOT NULL,
	"type" varchar NOT NULL,
	"featured_image" varchar,
	"promo_video_url" varchar,
	"gallery_images" text[] DEFAULT ARRAY[]::text[],
	"download_url" varchar,
	"demo_url" varchar,
	"documentation_url" varchar,
	"features" text[] DEFAULT ARRAY[]::text[],
	"requirements" text[] DEFAULT ARRAY[]::text[],
	"rating" numeric(3, 2) DEFAULT '0.00',
	"review_count" integer DEFAULT 0,
	"sales_count" integer DEFAULT 0,
	"likes_count" integer DEFAULT 0,
	"dislikes_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"is_free" boolean DEFAULT false,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"intro_video_url" varchar,
	"service_addons" jsonb DEFAULT '[]'::jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "short_link_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" varchar NOT NULL,
	"clicked_at" timestamp DEFAULT now(),
	"ip_address" varchar,
	"country" varchar,
	"country_code" varchar,
	"region" varchar,
	"city" varchar,
	"user_agent" text,
	"browser" varchar,
	"os" varchar,
	"device" varchar,
	"referer" text
);
--> statement-breakpoint
CREATE TABLE "short_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"original_url" text NOT NULL,
	"title" varchar,
	"is_referral" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"click_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "short_links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shortener_settings" (
	"id" varchar PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"enabled" boolean DEFAULT true,
	"allow_free_users" boolean DEFAULT true,
	"allow_verified_users" boolean DEFAULT true,
	"allow_premium_users" boolean DEFAULT true,
	"allow_brands" boolean DEFAULT true,
	"allow_influencers" boolean DEFAULT true,
	"free_user_limit" integer DEFAULT 5,
	"premium_user_limit" integer DEFAULT 500,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_key" varchar(200) NOT NULL,
	"label" varchar(200) NOT NULL,
	"content_type" varchar(20) DEFAULT 'text' NOT NULL,
	"page" varchar(50) NOT NULL,
	"section" varchar(100) NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"default_value" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_content_content_key_unique" UNIQUE("content_key")
);
--> statement-breakpoint
CREATE TABLE "site_social_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"icon_emoji" varchar(10) DEFAULT '🔗',
	"placement" varchar(30) DEFAULT 'footer',
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "social_platforms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"emoji" varchar DEFAULT '🌐',
	"icon_class" varchar,
	"color" varchar DEFAULT '#000000',
	"bg_color" varchar DEFAULT '#6366f1',
	"url_prefix" varchar,
	"description" varchar,
	"is_active" boolean DEFAULT true,
	"is_built_in" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "social_platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "social_quick_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"label" varchar(200) NOT NULL,
	"action_url" varchar(500) NOT NULL,
	"points_reward" integer DEFAULT 50,
	"icon_emoji" varchar(10) DEFAULT '🔗',
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sponsored_ads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"image_url" varchar,
	"link_url" varchar NOT NULL,
	"advertiser_name" varchar NOT NULL,
	"advertiser_logo" varchar,
	"placement" varchar NOT NULL,
	"ad_type" varchar DEFAULT 'display' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"budget" numeric(10, 2),
	"cpm" numeric(6, 2),
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "spotlight_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"item_type" varchar NOT NULL,
	"item_id" varchar,
	"custom_title" varchar,
	"custom_description" text,
	"custom_image" text,
	"custom_link" varchar,
	"badge_label" varchar,
	"target_pages" text DEFAULT 'landing' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"network" varchar(20),
	"transaction_hash" varchar,
	"payment_proof" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"period_days" integer,
	"auto_renew" boolean DEFAULT true,
	"renewal_reminder_sent" boolean DEFAULT false,
	"expiry_reminder_sent" boolean DEFAULT false,
	"payment_method_label" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"participation_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"proof_urls" jsonb,
	"screenshots" jsonb,
	"additional_files" jsonb,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"review_notes" text,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"approved_for_payment" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracked_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracker_id" varchar NOT NULL,
	"platform" varchar NOT NULL,
	"external_id" varchar,
	"title" text,
	"url" text,
	"thumbnail" text,
	"author" varchar,
	"snippet" text,
	"metric" integer DEFAULT 0,
	"published_at" timestamp,
	"raw_data" text,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"campaign_id" varchar,
	"task_submission_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"transaction_hash" varchar,
	"network" varchar(20),
	"wallet_address" varchar,
	"description" text,
	"reference_type" varchar(50),
	"reference_id" varchar,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trending_topics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" varchar NOT NULL,
	"platform" varchar NOT NULL,
	"region" varchar DEFAULT 'US',
	"rank" integer DEFAULT 0,
	"volume" integer DEFAULT 0,
	"category" varchar,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" varchar NOT NULL,
	"following_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_points" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action_type" varchar NOT NULL,
	"points" integer NOT NULL,
	"reference_id" varchar,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewee_id" varchar NOT NULL,
	"reviewer_id" varchar NOT NULL,
	"reference_type" varchar(50),
	"reference_id" varchar,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_social_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"platform_slug" varchar NOT NULL,
	"url" varchar(500) NOT NULL,
	"follower_count" integer DEFAULT 0,
	"platform_name" varchar,
	"platform_color" varchar DEFAULT '#6366f1',
	"platform_emoji" varchar DEFAULT '🌐',
	"is_user_defined" boolean DEFAULT false,
	"display_on_profile" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_social_task_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"total_points" integer DEFAULT 0,
	"level" varchar DEFAULT 'Starter',
	"user_type" varchar NOT NULL,
	"profile_image_url" varchar,
	"bio" text,
	"location" varchar,
	"phone_number" varchar,
	"skills" text[],
	"twitter_handle" varchar,
	"instagram_handle" varchar,
	"youtube_handle" varchar,
	"linkedin_handle" varchar,
	"tiktok_handle" varchar,
	"twitch_handle" varchar,
	"telegram_channel" varchar,
	"whatsapp_channel" varchar,
	"tiktok_followers" integer DEFAULT 0,
	"youtube_followers" integer DEFAULT 0,
	"instagram_followers" integer DEFAULT 0,
	"twitter_followers" integer DEFAULT 0,
	"twitch_followers" integer DEFAULT 0,
	"telegram_followers" integer DEFAULT 0,
	"whatsapp_followers" integer DEFAULT 0,
	"total_followers" integer DEFAULT 0,
	"creator_tier" varchar DEFAULT 'newcomer',
	"niche" varchar,
	"username" varchar,
	"banner_image_url" varchar,
	"company_name" varchar,
	"website" varchar,
	"industry" varchar,
	"usdt_tron_wallet" varchar,
	"usdt_bsc_wallet" varchar,
	"usdt_eth_wallet" varchar,
	"ton_wallet" varchar,
	"direct_support_enabled" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"is_kyc_approved" boolean DEFAULT false,
	"rating" numeric(3, 2) DEFAULT '0.00',
	"followers" integer DEFAULT 0,
	"following" integer DEFAULT 0,
	"completed_campaigns" integer DEFAULT 0,
	"total_earned" numeric(10, 2) DEFAULT '0.00',
	"available_balance" numeric(10, 2) DEFAULT '0.00',
	"pending_balance" numeric(10, 2) DEFAULT '0.00',
	"role" varchar DEFAULT 'user',
	"content_rates" jsonb,
	"tips_earned" numeric(10, 2) DEFAULT '0.00',
	"subscription_status" varchar DEFAULT 'free',
	"subscription_plan" varchar,
	"subscription_end_date" timestamp,
	"referral_code_creator" varchar,
	"referral_code_brand" varchar,
	"total_referrals" integer DEFAULT 0,
	"referral_bonus_earned" numeric(10, 2) DEFAULT '0.00',
	"two_factor_secret" varchar,
	"two_factor_enabled" boolean DEFAULT false,
	"message_privacy" varchar DEFAULT 'everyone',
	"brand_rank" varchar DEFAULT 'bronze',
	"brand_tier" varchar DEFAULT 'startup',
	"total_transaction_volume" numeric(12, 2) DEFAULT '0.00',
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"state" varchar,
	"city" varchar,
	"seo_title" varchar,
	"seo_description" text,
	"seo_keywords" varchar,
	"seo_og_image" varchar,
	"country" varchar,
	"preferred_currency" varchar DEFAULT 'USD',
	"btc_wallet" varchar,
	"pi_wallet" varchar,
	"p2p_wallets" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_referral_code_creator_unique" UNIQUE("referral_code_creator"),
	CONSTRAINT "users_referral_code_brand_unique" UNIQUE("referral_code_brand")
);
--> statement-breakpoint
CREATE TABLE "welcome_task_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"task_key" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ad_analytics" ADD CONSTRAINT "ad_analytics_ad_id_sponsored_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."sponsored_ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_analytics" ADD CONSTRAINT "ad_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_blog_jobs" ADD CONSTRAINT "auto_blog_jobs_source_id_auto_blog_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."auto_blog_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_category_follows" ADD CONSTRAINT "blog_category_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_likes" ADD CONSTRAINT "blog_likes_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_likes" ADD CONSTRAINT "blog_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_tips" ADD CONSTRAINT "blog_tips_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_tips" ADD CONSTRAINT "blog_tips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_wallets" ADD CONSTRAINT "brand_wallets_brand_id_users_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_micro_tasks" ADD CONSTRAINT "campaign_micro_tasks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_micro_tasks" ADD CONSTRAINT "campaign_micro_tasks_brand_id_users_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_micro_tasks" ADD CONSTRAINT "campaign_micro_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participations" ADD CONSTRAINT "campaign_participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participations" ADD CONSTRAINT "campaign_participations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_id_users_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_comments" ADD CONSTRAINT "course_comments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_comments" ADD CONSTRAINT "course_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_lesson_id_course_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_likes" ADD CONSTRAINT "course_likes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_likes" ADD CONSTRAINT "course_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_messages" ADD CONSTRAINT "course_messages_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_messages" ADD CONSTRAINT "course_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_messages" ADD CONSTRAINT "course_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_hire_offers" ADD CONSTRAINT "direct_hire_offers_brand_id_users_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_hire_offers" ADD CONSTRAINT "direct_hire_offers_influencer_id_users_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_brand_id_users_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_giveaways" ADD CONSTRAINT "leaderboard_giveaways_sponsor_brand_id_users_id_fk" FOREIGN KEY ("sponsor_brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_rewards" ADD CONSTRAINT "leaderboard_rewards_sponsor_brand_id_users_id_fk" FOREIGN KEY ("sponsor_brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_participation_id_campaign_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."campaign_participations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_task_submissions" ADD CONSTRAINT "micro_task_submissions_micro_task_id_campaign_micro_tasks_id_fk" FOREIGN KEY ("micro_task_id") REFERENCES "public"."campaign_micro_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_task_submissions" ADD CONSTRAINT "micro_task_submissions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_task_submissions" ADD CONSTRAINT "micro_task_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_task_submissions" ADD CONSTRAINT "micro_task_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_action_logs" ADD CONSTRAINT "p2p_action_logs_transaction_id_p2p_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."p2p_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_action_logs" ADD CONSTRAINT "p2p_action_logs_listing_id_p2p_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."p2p_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_action_logs" ADD CONSTRAINT "p2p_action_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_fee_config" ADD CONSTRAINT "p2p_fee_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_listings" ADD CONSTRAINT "p2p_listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_listings" ADD CONSTRAINT "p2p_listings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_messages" ADD CONSTRAINT "p2p_messages_transaction_id_p2p_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."p2p_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_messages" ADD CONSTRAINT "p2p_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_task_addon_submissions" ADD CONSTRAINT "p2p_task_addon_submissions_listing_id_p2p_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."p2p_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_task_addon_submissions" ADD CONSTRAINT "p2p_task_addon_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_task_addon_submissions" ADD CONSTRAINT "p2p_task_addon_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_transactions" ADD CONSTRAINT "p2p_transactions_listing_id_p2p_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."p2p_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_transactions" ADD CONSTRAINT "p2p_transactions_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_transactions" ADD CONSTRAINT "p2p_transactions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_transactions" ADD CONSTRAINT "p2p_transactions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_transactions" ADD CONSTRAINT "p2p_transactions_dispute_winner_id_users_id_fk" FOREIGN KEY ("dispute_winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_deposits" ADD CONSTRAINT "payment_deposits_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_deposits" ADD CONSTRAINT "payment_deposits_brand_id_users_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_deposits" ADD CONSTRAINT "payment_deposits_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_feature_toggles" ADD CONSTRAINT "payment_feature_toggles_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_messages" ADD CONSTRAINT "payout_messages_payout_request_id_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."payout_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_messages" ADD CONSTRAINT "payout_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_direct_hire_id_direct_hire_offers_id_fk" FOREIGN KEY ("direct_hire_id") REFERENCES "public"."direct_hire_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_likes" ADD CONSTRAINT "product_likes_product_id_shop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_likes" ADD CONSTRAINT "product_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_shop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_shop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification_campaigns" ADD CONSTRAINT "push_notification_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_link_clicks" ADD CONSTRAINT "short_link_clicks_link_id_short_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."short_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_participation_id_campaign_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."campaign_participations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_content" ADD CONSTRAINT "tracked_content_tracker_id_keyword_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."keyword_trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reviews" ADD CONSTRAINT "user_reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reviews" ADD CONSTRAINT "user_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_social_links" ADD CONSTRAINT "user_social_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_social_task_completions" ADD CONSTRAINT "user_social_task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_social_task_completions" ADD CONSTRAINT "user_social_task_completions_task_id_social_quick_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."social_quick_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welcome_task_completions" ADD CONSTRAINT "welcome_task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_page_content_page_section" ON "page_content" USING btree ("page","section");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");