CREATE TABLE IF NOT EXISTS "adsterra_settings" (
  "id" varchar PRIMARY KEY DEFAULT 'singleton',
  "settings" jsonb NOT NULL DEFAULT '{"enabled":false,"placements":[]}'::jsonb,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "adsterra_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "placement_id" varchar NOT NULL,
  "event_type" varchar NOT NULL DEFAULT 'impression',
  "page_path" varchar(512) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adsterra_events_placement_created_idx"
  ON "adsterra_events" ("placement_id", "created_at");
CREATE INDEX IF NOT EXISTS "adsterra_events_created_idx"
  ON "adsterra_events" ("created_at");
