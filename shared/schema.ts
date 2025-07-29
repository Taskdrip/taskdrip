import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for custom authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  userType: varchar("user_type").notNull(), // 'creator' or 'brand'
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  location: varchar("location"),
  phoneNumber: varchar("phone_number"),
  skills: text("skills").array(),
  twitterHandle: varchar("twitter_handle"),
  instagramHandle: varchar("instagram_handle"),
  youtubeHandle: varchar("youtube_handle"),
  linkedinHandle: varchar("linkedin_handle"),
  tiktokHandle: varchar("tiktok_handle"),
  companyName: varchar("company_name"), // For brands
  website: varchar("website"), // For brands
  industry: varchar("industry"), // For brands
  // Crypto wallet addresses for payments
  usdtTronWallet: varchar("usdt_tron_wallet"),
  usdtBscWallet: varchar("usdt_bsc_wallet"),
  tonWallet: varchar("ton_wallet"),
  isVerified: boolean("is_verified").default(false),
  isKycApproved: boolean("is_kyc_approved").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  followers: integer("followers").default(0),
  following: integer("following").default(0),
  completedCampaigns: integer("completed_campaigns").default(0),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00"),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0.00"),
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).default("0.00"),
  role: varchar("role").default("user"), // 'user' or 'admin'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // Social Media, Content Creation, Gaming, etc.
  platform: varchar("platform"), // Twitter, Instagram, TikTok, etc.
  brandName: varchar("brand_name").notNull(),
  brandLogo: varchar("brand_logo"),
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  totalSlots: integer("total_slots").notNull(),
  filledSlots: integer("filled_slots").default(0),
  estimatedTime: varchar("estimated_time"), // "5 min", "30 min", etc.
  requirements: text("requirements").array(),
  isActive: boolean("is_active").default(true),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaignParticipations = pgTable("campaign_participations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, completed
  submissionText: text("submission_text"),
  submissionFiles: text("submission_files").array(),
  submissionUrl: varchar("submission_url"),
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // campaign_reward, payout, purchase
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, approved, completed, failed
  description: text("description").notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  transactionHash: varchar("transaction_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  featuredImage: varchar("featured_image"),
  category: varchar("category"),
  tags: text("tags").array(),
  authorId: varchar("author_id").references(() => users.id),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shopProducts = pgTable("shop_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  category: varchar("category").notNull(),
  type: varchar("type").notNull(), // course, software, template, etc.
  featuredImage: varchar("featured_image"),
  downloadUrl: varchar("download_url"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  isFree: boolean("is_free").default(false),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => shopProducts.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method"), // BTC, BNB, SOL, USDT, etc.
  paymentProof: varchar("payment_proof"),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignParticipationSchema = createInsertSchema(campaignParticipations).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShopProductSchema = createInsertSchema(shopProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignParticipation = typeof campaignParticipations.$inferSelect;
export type InsertCampaignParticipation = z.infer<typeof insertCampaignParticipationSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type ShopProduct = typeof shopProducts.$inferSelect;
export type InsertShopProduct = z.infer<typeof insertShopProductSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
