ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "sale_price" DECIMAL(10,2);--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "sale_deadline" TIMESTAMP;
