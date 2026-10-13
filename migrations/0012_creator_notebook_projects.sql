CREATE TABLE IF NOT EXISTS "creator_notebook_projects" (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_notebook_projects_owner_updated_idx"
  ON "creator_notebook_projects" ("owner_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_notebook_projects_status_idx"
  ON "creator_notebook_projects" ("status");
