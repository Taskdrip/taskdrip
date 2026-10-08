ALTER TABLE IF EXISTS "creator_books"
  ADD COLUMN IF NOT EXISTS "book_type" varchar(40) NOT NULL DEFAULT 'nonfiction';
--> statement-breakpoint
ALTER TABLE IF EXISTS "creator_books"
  ADD COLUMN IF NOT EXISTS "genre" varchar(100) NOT NULL DEFAULT 'General nonfiction';
--> statement-breakpoint
ALTER TABLE IF EXISTS "creator_books"
  ADD COLUMN IF NOT EXISTS "trim_size" varchar(20) NOT NULL DEFAULT '6x9';
--> statement-breakpoint
ALTER TABLE IF EXISTS "creator_books"
  ADD COLUMN IF NOT EXISTS "access_url" text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "creator_publishing_products"
  ADD COLUMN IF NOT EXISTS "access_url" text;
