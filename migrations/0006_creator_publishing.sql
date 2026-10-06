CREATE TABLE IF NOT EXISTS "creator_books" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "creator_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(240) NOT NULL,
  "subtitle" varchar(300),
  "idea" text,
  "description" text,
  "outline" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "chapters" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "cover_image" text,
  "amazon_url" text,
  "status" varchar(32) NOT NULL DEFAULT 'draft',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_books_creator_id_idx" ON "creator_books" ("creator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_books_status_idx" ON "creator_books" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_publishing_products" (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_publishing_products_creator_id_idx" ON "creator_publishing_products" ("creator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_publishing_products_status_idx" ON "creator_publishing_products" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_publishing_products_shop_product_id_idx" ON "creator_publishing_products" ("shop_product_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_product_earnings" (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_product_earnings_creator_id_idx" ON "creator_product_earnings" ("creator_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_product_downloads" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "publishing_product_id" varchar NOT NULL REFERENCES "creator_publishing_products"("id") ON DELETE CASCADE,
  "purchase_id" varchar NOT NULL REFERENCES "purchases"("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "downloaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_product_downloads_purchase_id_idx" ON "creator_product_downloads" ("purchase_id");
