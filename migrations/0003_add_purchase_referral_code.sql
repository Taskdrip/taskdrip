ALTER TABLE "breedskool_course_pricing" ADD COLUMN IF NOT EXISTS "course_title" varchar;
ALTER TABLE "breedskool_course_pricing" ADD COLUMN IF NOT EXISTS "price_ngn" integer;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "referral_code" varchar;