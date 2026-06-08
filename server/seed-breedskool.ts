import { db } from "./db";
import { breedskoolCoursePricing, appSettings } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// GTBank payment details — seeded on every startup (only inserts if missing)
const BREEDSKOOL_PAYMENT_DEFAULTS: Array<{ key: string; value: string }> = [
  { key: "breedskool_bank_name",           value: "GTBank" },
  { key: "breedskool_bank_account_number", value: "0273575556" },
  { key: "breedskool_bank_account_name",   value: "BREEDSKOOL GALAXY LTD" },
  { key: "breedskool_bank_country",        value: "Nigeria (Naira Account)" },
  { key: "breedskool_payment_instructions",value: "After transfer, enter your transaction reference number below and optionally upload your payment screenshot as proof." },
];

export async function seedBreedskoolPaymentSettings(): Promise<void> {
  for (const { key, value } of BREEDSKOOL_PAYMENT_DEFAULTS) {
    try {
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
      if (existing.length === 0) {
        await db.insert(appSettings).values({ key, value, updatedAt: new Date() });
      }
    } catch (e: any) {
      console.error(`[seedBreedskoolPaymentSettings] Error for ${key}:`, e?.message);
    }
  }
}

const BREEDSKOOL_COURSES = [
  {
    courseKey: "webdev",
    title: "Web Development & Vibe Coding",
    shortDescription:
      "Build modern websites, web apps, and vibe-coded digital products from scratch. Master HTML, CSS, JavaScript, React, Node.js, and deployment.",
    regularPrice: 220000,
    discountPrice: 150000,
    duration: "8 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    courseKey: "ai_content",
    title: "AI Content Creation & Video Editing",
    shortDescription:
      "Leverage ChatGPT, Midjourney & AI video tools to create viral content, professional videos, and earn from multiple platforms.",
    regularPrice: 270000,
    discountPrice: 179000,
    duration: "6 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    courseKey: "social_monetize",
    title: "Social Media & Web Assets Monetization",
    shortDescription:
      "Build and monetize Instagram, TikTok & YouTube channels, websites, and digital assets to unlock multiple income streams.",
    regularPrice: 400000,
    discountPrice: 320000,
    duration: "6 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    courseKey: "trading",
    title: "Pocket Option Trading",
    shortDescription:
      "Master Pocket Option binary trading, chart analysis, risk management, and consistent income strategies for financial freedom.",
    regularPrice: 320000,
    discountPrice: 279000,
    duration: "8 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    courseKey: "home_lesson",
    title: "Tech Home Lessons for Kids",
    shortDescription:
      "One-on-one tech lessons delivered at your home by a certified tutor. Book flexible sessions for your child (ages 6–17) covering coding, AI tools, digital skills, and more.",
    regularPrice: 120000,
    discountPrice: 85000,
    duration: "Per Session",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    courseKey: "onsite_training",
    title: "Onsite Group Training",
    shortDescription:
      "Join our hands-on classroom sessions at TootoOba Estate, Ikorodu Lagos. Work alongside fellow students in a structured environment with daily tutor support.",
    regularPrice: 180000,
    discountPrice: 130000,
    duration: "6–8 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
];

export async function seedBreedskoolPricing(): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;

  for (const course of BREEDSKOOL_COURSES) {
    try {
      const existing = await db
        .select()
        .from(breedskoolCoursePricing)
        .where(eq(breedskoolCoursePricing.courseKey, course.courseKey))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(breedskoolCoursePricing).values({
          ...course,
          updatedAt: new Date(),
        });
        upserted++;
      } else {
        await db
          .update(breedskoolCoursePricing)
          .set({
            title: course.title,
            shortDescription: course.shortDescription,
            regularPrice: course.regularPrice,
            discountPrice: course.discountPrice,
            duration: course.duration,
            isActive: course.isActive,
            acceptedPayments: course.acceptedPayments,
            updatedAt: new Date(),
          })
          .where(eq(breedskoolCoursePricing.courseKey, course.courseKey));
        skipped++;
      }
    } catch (e: any) {
      console.error(`[seedBreedskoolPricing] Error for ${course.courseKey}:`, e?.message);
    }
  }

  return { upserted, skipped };
}
