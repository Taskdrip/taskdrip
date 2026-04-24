import { db } from "./db";
import { sql } from "drizzle-orm";

type ColumnFix = {
  table: string;
  column: string;
  definition: string;
};

const REQUIRED_COLUMNS: ColumnFix[] = [
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
  { table: "campaigns", column: "intro_video_url", definition: "varchar" },
  { table: "campaigns", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "p2p_listings", column: "intro_video_url", definition: "varchar" },
  { table: "p2p_listings", column: "service_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "purchases", column: "selected_addons", definition: "jsonb DEFAULT '[]'::jsonb" },
  { table: "purchases", column: "addons_total", definition: "decimal(10,2) DEFAULT '0.00'" },
];

export async function runStartupMigrations(): Promise<void> {
  for (const fix of REQUIRED_COLUMNS) {
    try {
      await db.execute(
        sql.raw(
          `ALTER TABLE IF EXISTS "${fix.table}" ADD COLUMN IF NOT EXISTS "${fix.column}" ${fix.definition};`
        )
      );
    } catch (err) {
      console.error(
        `[startup-migration] Failed to ensure ${fix.table}.${fix.column}:`,
        err
      );
    }
  }
}
