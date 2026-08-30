CREATE TABLE IF NOT EXISTS "activity_logs" (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_event_type_idx" ON "activity_logs" ("event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_actor_id_idx" ON "activity_logs" ("actor_id");
--> statement-breakpoint
ALTER TABLE IF EXISTS "pwa_settings" ADD COLUMN IF NOT EXISTS "ga_tracking_id" varchar;
--> statement-breakpoint
ALTER TABLE IF EXISTS "pwa_settings" ADD COLUMN IF NOT EXISTS "gtm_id" varchar;
--> statement-breakpoint
ALTER TABLE IF EXISTS "pwa_settings" ADD COLUMN IF NOT EXISTS "google_site_verification" varchar;
--> statement-breakpoint
ALTER TABLE IF EXISTS "pwa_settings" ADD COLUMN IF NOT EXISTS "bing_verification" varchar;
--> statement-breakpoint
ALTER TABLE IF EXISTS "pwa_settings" ADD COLUMN IF NOT EXISTS "default_og_image" varchar;