CREATE TABLE IF NOT EXISTS "creator_studio_subscriptions" (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_studio_subscriptions_user_status_idx"
  ON "creator_studio_subscriptions" ("user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_studio_subscriptions_status_created_idx"
  ON "creator_studio_subscriptions" ("status", "created_at");
