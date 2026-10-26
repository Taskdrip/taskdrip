ALTER TABLE "shop_products"
  ADD COLUMN IF NOT EXISTS "affiliate_offers" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "shop_products"
  ADD COLUMN IF NOT EXISTS "enable_platform_checkout" boolean NOT NULL DEFAULT true;
