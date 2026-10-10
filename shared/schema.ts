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
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { EbookDesignDocument } from "./ebook-design";

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
  totalPoints: integer("total_points").default(0),
  level: varchar("level").default("Starter"),
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
  twitchHandle: varchar("twitch_handle"),
  telegramChannel: varchar("telegram_channel"),
  whatsappChannel: varchar("whatsapp_channel"),
  // Follower counts per platform
  tiktokFollowers: integer("tiktok_followers").default(0),
  youtubeFollowers: integer("youtube_followers").default(0),
  instagramFollowers: integer("instagram_followers").default(0),
  twitterFollowers: integer("twitter_followers").default(0),
  twitchFollowers: integer("twitch_followers").default(0),
  telegramFollowers: integer("telegram_followers").default(0),
  whatsappFollowers: integer("whatsapp_followers").default(0),
  totalFollowers: integer("total_followers").default(0),
  // Creator classification
  creatorTier: varchar("creator_tier").default("newcomer"), // newcomer, aspiring, rising_sparks, growth_engines, power_influencers, global_titans
  niche: varchar("niche"), // Gaming, Fitness, Fashion, Tech, etc.
  username: varchar("username").unique(),
  bannerImageUrl: varchar("banner_image_url"),
  companyName: varchar("company_name"), // For brands
  website: varchar("website"), // For brands
  industry: varchar("industry"), // For brands
  // Crypto wallet addresses for payments
  usdtTronWallet: varchar("usdt_tron_wallet"),
  usdtBscWallet: varchar("usdt_bsc_wallet"),
  usdtEthWallet: varchar("usdt_eth_wallet"),
  tonWallet: varchar("ton_wallet"),
  directSupportEnabled: boolean("direct_support_enabled").default(false),
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
  // Content rates (what the creator charges brands per content type)
  contentRates: jsonb("content_rates"), // { instagramPost, instagramStory, instagramReel, tiktokVideo, youtubeVideo, tweet, podcastMention, other }
  tipsEarned: decimal("tips_earned", { precision: 10, scale: 2 }).default("0.00"),
  // Subscription fields
  subscriptionStatus: varchar("subscription_status").default("free"), // 'free', 'active', 'expired'
  subscriptionPlan: varchar("subscription_plan"), // 'creator_monthly', 'creator_yearly', 'brand_monthly', 'brand_yearly'
  subscriptionEndDate: timestamp("subscription_end_date"),
  // Referral system
  referralCodeCreator: varchar("referral_code_creator").unique(), // Code for inviting creators
  referralCodeBrand: varchar("referral_code_brand").unique(), // Code for inviting brands
  totalReferrals: integer("total_referrals").default(0),
  referralBonusEarned: decimal("referral_bonus_earned", { precision: 10, scale: 2 }).default("0.00"),
  // Two-Factor Authentication
  twoFactorSecret: varchar("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  // Privacy settings
  messagePrivacy: varchar("message_privacy").default("everyone"), // 'everyone', 'followers', 'nobody'
  // Brand ranking (for brands): 'bronze', 'silver', 'gold'
  brandRank: varchar("brand_rank").default("bronze"),
  // Brand tier system: 'startup', 'growing', 'established', 'enterprise', 'global_brand'
  brandTier: varchar("brand_tier").default("startup"),
  totalTransactionVolume: decimal("total_transaction_volume", { precision: 12, scale: 2 }).default("0.00"),
  // Location coordinates for proximity search (Uber-style)
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  state: varchar("state"),
  city: varchar("city"),
  // Profile SEO fields — indexable by search engines
  seoTitle: varchar("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: varchar("seo_keywords"),
  seoOgImage: varchar("seo_og_image"),
  // P2P trading profile
  country: varchar("country"),
  preferredCurrency: varchar("preferred_currency").default("USD"),
  btcWallet: varchar("btc_wallet"),
  piWallet: varchar("pi_wallet"),
  p2pWallets: jsonb("p2p_wallets").$type<Array<{
    id: string;
    crypto: string;
    network: string;
    address: string;
    isActive: boolean;
    isDefault: boolean;
  }>>(),
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
  brandId: varchar("brand_id").notNull().references(() => users.id),
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  totalBudget: decimal("total_budget", { precision: 10, scale: 2 }),
  budgetPerCreator: decimal("budget_per_creator", { precision: 10, scale: 2 }),
  featureImage: varchar("feature_image", { length: 500 }),
  instructionVideoUrl: varchar("instruction_video_url", { length: 500 }),
  totalSlots: integer("total_slots").notNull(),
  filledSlots: integer("filled_slots").default(0),
  estimatedTime: varchar("estimated_time"), // "5 min", "30 min", etc.
  requirements: text("requirements").array(),
  preQualificationTasks: jsonb("pre_qualification_tasks").$type<{
    task: string;
    platform?: string;
    requiredProof?: string;
    actionUrl?: string;
    autoApprove?: boolean;
    proofRequired?: boolean;
  }[]>(),
  introVideoUrl: varchar("intro_video_url"),
  serviceAddons: jsonb("service_addons").$type<{ id: string; title: string; description: string; price: number }[]>().default(sql`'[]'::jsonb`),
  qualificationRules: text("qualification_rules"),
  minFollowers: integer("min_followers").default(0),
  tdripPointsPerParticipant: integer("tdrip_points_per_participant").default(0),
  tdripParticipantLimit: integer("tdrip_participant_limit").default(0),
  tdripEscrowValue: decimal("tdrip_escrow_value", { precision: 10, scale: 2 }).default("0.00"),
  autoApproveMicroTasks: boolean("auto_approve_micro_tasks").default(false),
  status: varchar("status").default("pending_payment"), // 'pending_payment', 'active', 'draft', 'completed', 'cancelled'
  paymentStatus: varchar("payment_status").default("pending"), // 'pending', 'deposited', 'approved'
  depositRequired: boolean("deposit_required").default(true),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
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

export const campaignMicroTasks = pgTable("campaign_micro_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  brandId: varchar("brand_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  tdripReward: integer("tdrip_reward").notNull(),
  participantLimit: integer("participant_limit").default(0),
  escrowedPoints: integer("escrowed_points").notNull(),
  actionUrl: varchar("action_url", { length: 500 }),
  proofRequired: boolean("proof_required").default(true),
  autoApprove: boolean("auto_approve").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const microTaskSubmissions = pgTable("micro_task_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  microTaskId: varchar("micro_task_id").notNull().references(() => campaignMicroTasks.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  proofText: text("proof_text"),
  proofUrl: varchar("proof_url", { length: 500 }),
  proofFile: varchar("proof_file", { length: 500 }),
  status: varchar("status").default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Transactions table for tracking crypto payments with approval workflow
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  taskSubmissionId: uuid("task_submission_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'campaign_reward', 'payout', 'bonus', etc.
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'approved', 'completed', 'failed'
  transactionHash: varchar("transaction_hash"),
  network: varchar("network", { length: 20 }), // 'tron', 'bsc', 'ton'
  walletAddress: varchar("wallet_address"),
  description: text("description"),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: varchar("reference_id"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
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
  viewCount: integer("view_count").default(0),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  metaDescription: text("meta_description"),
  seoKeywords: text("seo_keywords"),
  readingTime: integer("reading_time").default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blog likes - track who liked which post
export const blogLikes = pgTable("blog_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blog comments
export const blogComments = pgTable("blog_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: varchar("parent_id"), // For nested replies
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blog category follows
export const blogCategoryFollows = pgTable("blog_category_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: varchar("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shopProducts = pgTable("shop_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  shortDescription: varchar("short_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  category: varchar("category").notNull(),
  type: varchar("type").notNull(), // course, software, template, etc.
  featuredImage: varchar("featured_image"),
  promoVideoUrl: varchar("promo_video_url"),
  galleryImages: text("gallery_images").array().default(sql`ARRAY[]::text[]`),
  downloadUrl: varchar("download_url"),
  demoUrl: varchar("demo_url"),
  documentationUrl: varchar("documentation_url"),
  features: text("features").array().default(sql`ARRAY[]::text[]`),
  requirements: text("requirements").array().default(sql`ARRAY[]::text[]`),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
  salesCount: integer("sales_count").default(0),
  likesCount: integer("likes_count").default(0),
  dislikesCount: integer("dislikes_count").default(0),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  isFree: boolean("is_free").default(false),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  introVideoUrl: varchar("intro_video_url"),
  serviceAddons: jsonb("service_addons").$type<{ id: string; title: string; description: string; price: number }[]>().default(sql`'[]'::jsonb`),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Metadata and SEO for WordPress plugins built in the admin plugin studio.
// The saleable product itself remains a normal shop_products row so checkout,
// bank transfer, crypto verification, and purchase history stay on the existing path.
export const pluginStudioProjects = pgTable("plugin_studio_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  templateKey: varchar("template_key").notNull().default("learnpress-woocommerce"),
  sourcePrompt: text("source_prompt"),
  name: varchar("name").notNull(),
  version: varchar("version").notNull().default("1.0.0"),
  author: varchar("author").notNull().default("Taskdrip"),
  shortDescription: varchar("short_description"),
  description: text("description").notNull(),
  coreShortDescription: varchar("core_short_description"),
  coreDescription: text("core_description"),
  coreFiles: jsonb("core_files").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
  premiumFiles: jsonb("premium_files").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
  seoTitle: varchar("seo_title"),
  seoDescription: varchar("seo_description"),
  seoKeywords: text("seo_keywords"),
  licenseApiBaseUrl: varchar("license_api_base_url"),
  maxActivations: integer("max_activations").notNull().default(3),
  releaseNotes: text("release_notes"),
  shopProductId: varchar("shop_product_id").references(() => shopProducts.id, { onDelete: "set null" }),
  status: varchar("status").notNull().default("draft"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => shopProducts.id),
  quantity: integer("quantity").default(1),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method"), // usdt_tron, usdt_bsc, ton
  paymentProof: varchar("payment_proof"),
  transactionHash: varchar("transaction_hash"),
  referralCode: varchar("referral_code"), // ref code used when buyer visited from a referral link
  status: varchar("status").notNull().default("pending"), // pending, paid, delivered, cancelled, refunded
  deliveryDetails: jsonb("delivery_details"), // Download links, access keys, etc.
  adminNotes: text("admin_notes"),
  paidAt: timestamp("paid_at"),
  deliveredAt: timestamp("delivered_at"),
  selectedAddons: jsonb("selected_addons").$type<{ id: string; title: string; price: number }[]>().default(sql`'[]'::jsonb`),
  addonsTotal: decimal("addons_total", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pluginLicenses = pgTable("plugin_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => pluginStudioProjects.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => shopProducts.id, { onDelete: "cascade" }),
  purchaseId: varchar("purchase_id").notNull().unique().references(() => purchases.id, { onDelete: "cascade" }),
  keyHash: varchar("key_hash").notNull().unique(),
  keyEncrypted: text("key_encrypted").notNull(),
  keyPrefix: varchar("key_prefix").notNull(),
  cadence: varchar("cadence").notNull(), // monthly, yearly
  status: varchar("status").notNull().default("active"), // active, expired, revoked, superseded
  startsAt: timestamp("starts_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  reminderStage: varchar("reminder_stage").notNull().default(""),
  maxActivations: integer("max_activations").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("plugin_licenses_user_status_idx").on(table.userId, table.status),
  index("plugin_licenses_project_status_idx").on(table.projectId, table.status),
  index("plugin_licenses_expiry_idx").on(table.status, table.expiresAt),
]);

export const pluginLicenseSites = pgTable("plugin_license_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull().references(() => pluginLicenses.id, { onDelete: "cascade" }),
  installationId: varchar("installation_id").notNull(),
  siteUrl: text("site_url").notNull(),
  pluginVersion: varchar("plugin_version"),
  wordpressVersion: varchar("wordpress_version"),
  status: varchar("status").notNull().default("active"),
  activatedAt: timestamp("activated_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("plugin_license_sites_license_installation_unique").on(table.licenseId, table.installationId),
  index("plugin_license_sites_license_status_idx").on(table.licenseId, table.status),
  index("plugin_license_sites_installation_idx").on(table.installationId),
]);

export const pluginLicenseEvents = pgTable("plugin_license_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").references(() => pluginLicenses.id, { onDelete: "set null" }),
  projectId: varchar("project_id").notNull().references(() => pluginStudioProjects.id, { onDelete: "cascade" }),
  installationId: varchar("installation_id"),
  eventType: varchar("event_type").notNull(), // activated, heartbeat, update_check, update_download, shop_download
  details: jsonb("details").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("plugin_license_events_project_date_idx").on(table.projectId, table.createdAt),
  index("plugin_license_events_license_date_idx").on(table.licenseId, table.createdAt),
]);

export const pluginSupportThreads = pgTable("plugin_support_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull().references(() => pluginLicenses.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => pluginStudioProjects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  developerId: varchar("developer_id").references(() => users.id, { onDelete: "set null" }),
  requestType: varchar("request_type").notNull().default("support"), // support, update_request
  subject: varchar("subject").notNull(),
  status: varchar("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pluginSupportMessages = pgTable("plugin_support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => pluginSupportThreads.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
}, (table) => [index("plugin_support_messages_thread_date_idx").on(table.threadId, table.createdAt)]);

// Product reviews for better customer feedback
export const productReviews = pgTable("product_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => shopProducts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  purchaseId: varchar("purchase_id").references(() => purchases.id), // Link to verified purchase
  rating: integer("rating").notNull(), // 1-5 stars
  title: varchar("title"),
  comment: text("comment"),
  isVerified: boolean("is_verified").default(false), // True if user purchased the product
  helpfulCount: integer("helpful_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Publishing content remains separate from its commercial shop listing.
export const creatorBooks = pgTable("creator_books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  bookType: varchar("book_type", { length: 40 }).notNull().default("nonfiction"),
  genre: varchar("genre", { length: 100 }).notNull().default("General nonfiction"),
  trimSize: varchar("trim_size", { length: 20 }).notNull().default("6x9"),
  idea: text("idea"),
  description: text("description"),
  outline: jsonb("outline").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  chapters: jsonb("chapters").$type<Array<{ id: string; title: string; content: string }>>().notNull().default(sql`'[]'::jsonb`),
  kdpKeywords: jsonb("kdp_keywords").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  designerDocument: jsonb("designer_document").$type<EbookDesignDocument | null>().default(sql`null`),
  generationJobId: varchar("generation_job_id", { length: 80 }),
  generationStatus: varchar("generation_status", { length: 24 }).notNull().default("idle"),
  generationProgress: integer("generation_progress").notNull().default(0),
  generationMessage: text("generation_message"),
  generationError: text("generation_error"),
  coverImage: text("cover_image"),
  amazonUrl: text("amazon_url"),
  accessUrl: text("access_url"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("creator_books_creator_id_idx").on(table.creatorId),
  index("creator_books_status_idx").on(table.status),
]);

export const creatorPublishingProducts = pgTable("creator_publishing_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: varchar("book_id").references(() => creatorBooks.id, { onDelete: "set null" }),
  shopProductId: varchar("shop_product_id").references(() => shopProducts.id, { onDelete: "set null" }),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description").notNull(),
  productType: varchar("product_type", { length: 60 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  coverImage: text("cover_image"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  version: varchar("version", { length: 40 }).default("1.0"),
  license: text("license"),
  amazonUrl: text("amazon_url"),
  accessUrl: text("access_url"),
  fileKey: text("file_key"),
  originalFileName: varchar("original_file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 120 }),
  fileSize: integer("file_size"),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  reviewNote: text("review_note"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("creator_publishing_products_creator_id_idx").on(table.creatorId),
  index("creator_publishing_products_status_idx").on(table.status),
  index("creator_publishing_products_shop_product_id_idx").on(table.shopProductId),
]);

export const creatorProductEarnings = pgTable("creator_product_earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").notNull().unique().references(() => purchases.id),
  productId: varchar("product_id").notNull().references(() => shopProducts.id),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  referralFee: decimal("referral_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("available"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("creator_product_earnings_creator_id_idx").on(table.creatorId),
]);

export const creatorProductDownloads = pgTable("creator_product_downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publishingProductId: varchar("publishing_product_id").notNull().references(() => creatorPublishingProducts.id, { onDelete: "cascade" }),
  purchaseId: varchar("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
}, (table) => [
  index("creator_product_downloads_purchase_id_idx").on(table.purchaseId),
]);

export const creatorStudioSubscriptions = pgTable("creator_studio_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  network: varchar("network", { length: 40 }).default("manual"),
  transactionHash: varchar("transaction_hash", { length: 255 }),
  paymentProofKey: text("payment_proof_key"),
  paymentMethodLabel: varchar("payment_method_label", { length: 160 }),
  periodDays: integer("period_days").notNull().default(30),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("creator_studio_subscriptions_user_status_idx").on(table.userId, table.status),
  index("creator_studio_subscriptions_status_created_idx").on(table.status, table.createdAt),
]);

// Product likes/dislikes tracking table
export const productLikes = pgTable("product_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => shopProducts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'like' or 'dislike'
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced Messages table for brand-creator communication
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  participationId: varchar("participation_id").references(() => campaignParticipations.id),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id).notNull(),
  subject: varchar("subject", { length: 200 }),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 50 }).default('general'),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: varchar("reference_id"),
  isRead: boolean("is_read").default(false),
  attachments: jsonb("attachments"),
  parentMessageId: uuid("parent_message_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blocked users table — lets any user block incoming messages from another
export const blockedUsers = pgTable("blocked_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockerId: varchar("blocker_id").references(() => users.id).notNull(),
  blockedId: varchar("blocked_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task submissions table for tracking proof of work
export const taskSubmissions = pgTable("task_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: varchar("campaign_id").references(() => campaigns.id).notNull(),
  participationId: varchar("participation_id").references(() => campaignParticipations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  proofUrls: jsonb("proof_urls"), // Array of URLs (social media posts, etc.)
  screenshots: jsonb("screenshots"), // Array of screenshot file paths
  additionalFiles: jsonb("additional_files"), // Array of additional file paths
  status: varchar("status", { length: 20 }).notNull().default('submitted'), // 'submitted', 'under_review', 'approved', 'rejected', 'revision_requested'
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  approvedForPayment: boolean("approved_for_payment").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table for sitewide notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'message', 'task_approved', 'payment_received', 'campaign_joined', etc.
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  actionUrl: varchar("action_url"), // URL to navigate when notification is clicked
  relatedId: uuid("related_id"), // ID of related entity (campaign, message, etc.)
  isRead: boolean("is_read").default(false),
  priority: varchar("priority", { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Admin activity history — durable audit trail for important user and system actions
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: varchar("actor_name"),
  actorEmail: varchar("actor_email"),
  eventType: varchar("event_type", { length: 60 }).notNull(),
  action: varchar("action", { length: 200 }).notNull(),
  description: text("description").notNull(),
  route: varchar("route", { length: 300 }),
  method: varchar("method", { length: 10 }),
  status: varchar("status", { length: 20 }).notNull().default("success"),
  entityType: varchar("entity_type", { length: 60 }),
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata").default({}),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("activity_logs_created_at_idx").on(table.createdAt),
  index("activity_logs_event_type_idx").on(table.eventType),
  index("activity_logs_actor_id_idx").on(table.actorId),
]);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Escrow payments table for campaign funding
export const escrowPayments = pgTable("escrow_payments", {
  id: varchar("id").primaryKey(),
  campaignId: varchar("campaign_id").references(() => campaigns.id).notNull(),
  brandId: varchar("brand_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'payment_window', 'verifying', 'completed', 'expired'
  transactionHash: varchar("transaction_hash"),
  network: varchar("network", { length: 20 }), // 'tron', 'bsc', 'ton'
  paymentScreenshot: varchar("payment_screenshot"),
  paymentWindowStart: timestamp("payment_window_start"),
  paymentWindowEnd: timestamp("payment_window_end"),
  submittedAt: timestamp("submitted_at"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social platforms (admin-managed)
export const socialPlatforms = pgTable("social_platforms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  emoji: varchar("emoji").default("🌐"),
  iconClass: varchar("icon_class"), // e.g. "SiTwitter", "SiFacebook"
  color: varchar("color").default("#000000"),
  bgColor: varchar("bg_color").default("#6366f1"),
  urlPrefix: varchar("url_prefix"), // e.g. "https://twitter.com/"
  description: varchar("description"),
  isActive: boolean("is_active").default(true),
  isBuiltIn: boolean("is_built_in").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User social links (platform URL + follower count)
export const userSocialLinks = pgTable("user_social_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  platformSlug: varchar("platform_slug").notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  followerCount: integer("follower_count").default(0),
  // User-defined custom channels
  platformName: varchar("platform_name"),
  platformColor: varchar("platform_color").default("#6366f1"),
  platformEmoji: varchar("platform_emoji").default("🌐"),
  isUserDefined: boolean("is_user_defined").default(false),
  displayOnProfile: boolean("display_on_profile").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ──────────────────────────────────────────────────────────────
// Direct Hire Offers — Brand directly hires an influencer
// ──────────────────────────────────────────────────────────────
export const directHireOffers = pgTable("direct_hire_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").notNull().references(() => users.id),
  influencerId: varchar("influencer_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  deliverables: text("deliverables"),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  brandPlatformFee: decimal("brand_platform_fee", { precision: 10, scale: 2 }).default("0.00"),
  brandTotalCharge: decimal("brand_total_charge", { precision: 10, scale: 2 }).default("0.00"),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).default("0.00"),
  influencerPayout: decimal("influencer_payout", { precision: 10, scale: 2 }).default("0.00"),
  deadline: timestamp("deadline"),
  // Workflow status
  status: varchar("status").default("pending"),
  // pending → accepted → payment_pending → payment_submitted → active → completed
  // OR pending → rejected / cancelled
  rejectionReason: text("rejection_reason"),
  // Payment proof
  paymentProof: varchar("payment_proof"),
  paymentNetwork: varchar("payment_network"),
  transactionHash: varchar("transaction_hash"),
  adminNote: text("admin_note"),
  workSubmissionUrl: varchar("work_submission_url", { length: 500 }),
  workSubmissionNote: text("work_submission_note"),
  workSubmittedAt: timestamp("work_submitted_at"),
  revisionNote: text("revision_note"),
  activatedAt: timestamp("activated_at"),
  completedAt: timestamp("completed_at"),
  // Invoice fields
  invoiceNumber: varchar("invoice_number"),
  invoiceGeneratedAt: timestamp("invoice_generated_at"),
  invoiceDueDate: timestamp("invoice_due_date"),
  invoiceNote: text("invoice_note"),
  agreedBudget: decimal("agreed_budget", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("dho_brand_idx").on(t.brandId),
  index("dho_influencer_idx").on(t.influencerId),
  index("dho_status_idx").on(t.status),
  index("dho_created_idx").on(t.createdAt),
]);

export const insertDirectHireOfferSchema = createInsertSchema(directHireOffers).omit({ id: true, createdAt: true, updatedAt: true, activatedAt: true });
export type DirectHireOffer = typeof directHireOffers.$inferSelect;
export type InsertDirectHireOffer = z.infer<typeof insertDirectHireOfferSchema>;

export const p2pListings = pgTable("p2p_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  listingType: varchar("listing_type").notNull(), // crypto | product | service
  productSubtype: varchar("product_subtype"), // physical | digital (for product listings)
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  minOrder: decimal("min_order", { precision: 10, scale: 2 }),
  maxOrder: decimal("max_order", { precision: 10, scale: 2 }),
  cryptoAsset: varchar("crypto_asset"), // BTC, ETH, USDT, etc (for crypto listings)
  paymentMethod: varchar("payment_method").notNull(),
  country: varchar("country"), // seller's country / where deal happens
  shippingInfo: text("shipping_info"), // for physical products
  taskAddons: jsonb("task_addons").$type<{
    task: string;
    platform?: string;
    requiredProof?: string;
    actionLink?: string;
  }[]>(),
  serviceAddons: jsonb("service_addons").$type<{ id: string; title: string; description: string; price: number }[]>().default(sql`'[]'::jsonb`),
  introVideoUrl: varchar("intro_video_url"),
  tdripPointsPerParticipant: integer("tdrip_points_per_participant").default(0),
  tdripParticipantLimit: integer("tdrip_participant_limit").default(0),
  tdripEscrowValue: decimal("tdrip_escrow_value", { precision: 10, scale: 2 }).default("0.00"),
  featuredImage: varchar("featured_image"),
  status: varchar("status").notNull().default("pending"),
  isFeatured: boolean("is_featured").default(false),
  adminNote: text("admin_note"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const p2pTaskAddonSubmissions = pgTable("p2p_task_addon_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => p2pListings.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskIndex: integer("task_index").notNull().default(0),
  taskDescription: text("task_description"),
  proofType: varchar("proof_type").notNull().default("link"),
  proofUrl: varchar("proof_url", { length: 1000 }),
  proofScreenshot: varchar("proof_screenshot", { length: 500 }),
  proofNote: text("proof_note"),
  status: varchar("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertP2pTaskAddonSubmissionSchema = createInsertSchema(p2pTaskAddonSubmissions).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});
export type P2pTaskAddonSubmission = typeof p2pTaskAddonSubmissions.$inferSelect;

export const p2pFeeConfigs = pgTable("p2p_fee_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionType: varchar("transaction_type").notNull().unique(),
  // Combined fee (legacy / total fallback)
  feeType: varchar("fee_type").notNull().default("percentage"),
  feeValue: decimal("fee_value", { precision: 10, scale: 2 }).notNull().default("2.00"),
  minFee: decimal("min_fee", { precision: 10, scale: 2 }).default("0.00"),
  maxFee: decimal("max_fee", { precision: 10, scale: 2 }),
  // Buyer-specific fee (paid on top of amount)
  buyerFeeType: varchar("buyer_fee_type").default("percentage"),
  buyerFeeValue: decimal("buyer_fee_value", { precision: 10, scale: 2 }).default("2.00"),
  buyerMinFee: decimal("buyer_min_fee", { precision: 10, scale: 2 }).default("0.00"),
  buyerMaxFee: decimal("buyer_max_fee", { precision: 10, scale: 2 }),
  // Seller-specific fee (deducted from payout)
  sellerFeeType: varchar("seller_fee_type").default("percentage"),
  sellerFeeValue: decimal("seller_fee_value", { precision: 10, scale: 2 }).default("0.00"),
  sellerMinFee: decimal("seller_min_fee", { precision: 10, scale: 2 }).default("0.00"),
  sellerMaxFee: decimal("seller_max_fee", { precision: 10, scale: 2 }),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformFees = pgTable("platform_fees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  feeType: varchar("fee_type").notNull().default("percentage"),
  value: decimal("value", { precision: 10, scale: 2 }).notNull().default("0.00"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const p2pTransactions = pgTable("p2p_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => p2pListings.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  adminId: varchar("admin_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  buyerFee: decimal("buyer_fee", { precision: 10, scale: 2 }).default("0.00"),
  sellerFee: decimal("seller_fee", { precision: 10, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  transactionType: varchar("transaction_type").notNull(),
  status: varchar("status").notNull().default("pending"),
  // Crypto wallet info
  buyerCryptoWallet: varchar("buyer_crypto_wallet"), // buyer's wallet for refund
  sellerCryptoWallet: varchar("seller_crypto_wallet"), // seller's wallet for receiving
  // Physical product info
  shippingAddress: text("shipping_address"),
  paymentMarkedAt: timestamp("payment_marked_at"),
  paymentProof: varchar("payment_proof"),
  paymentNote: text("payment_note"),
  fundedAt: timestamp("funded_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryNote: text("delivery_note"),
  buyerConfirmedAt: timestamp("buyer_confirmed_at"),
  disputeReason: text("dispute_reason"),
  disputeWinnerId: varchar("dispute_winner_id").references(() => users.id),
  releasedAt: timestamp("released_at"),
  refundedAt: timestamp("refunded_at"),
  cancelledAt: timestamp("cancelled_at"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const p2pMessages = pgTable("p2p_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => p2pTransactions.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const p2pActionLogs = pgTable("p2p_action_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").references(() => p2pTransactions.id),
  listingId: varchar("listing_id").references(() => p2pListings.id),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertP2PListingSchema = createInsertSchema(p2pListings).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertP2PTransactionSchema = createInsertSchema(p2pTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertP2PMessageSchema = createInsertSchema(p2pMessages).omit({ id: true, createdAt: true });
export const insertP2PFeeConfigSchema = createInsertSchema(p2pFeeConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformFeeSchema = createInsertSchema(platformFees).omit({ id: true, createdAt: true, updatedAt: true });
export type P2PListing = typeof p2pListings.$inferSelect;
export type InsertP2PListing = z.infer<typeof insertP2PListingSchema>;
export type P2PTransaction = typeof p2pTransactions.$inferSelect;
export type InsertP2PTransaction = z.infer<typeof insertP2PTransactionSchema>;
export type P2PMessage = typeof p2pMessages.$inferSelect;
export type P2PFeeConfig = typeof p2pFeeConfigs.$inferSelect;
export type PlatformFee = typeof platformFees.$inferSelect;

// Portfolio items
export const portfolioItems = pgTable("portfolio_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url", { length: 500 }),
  url: varchar("url", { length: 500 }),
  category: varchar("category"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Push subscriptions (browser Web Push API)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text("endpoint").notNull().unique(),
  keys: jsonb("keys").notNull(),
  userAgent: varchar("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push notification campaigns (admin-controlled broadcasts)
export const pushNotificationCampaigns = pgTable("push_notification_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  icon: varchar("icon"),
  clickUrl: varchar("click_url"),
  targetType: varchar("target_type").default("all"), // 'all', 'creators', 'brands'
  status: varchar("status").default("draft"), // 'draft', 'sent', 'scheduled'
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  sentCount: integer("sent_count").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// $TDRIP Points table — tracks every point-earning action
export const userPoints = pgTable("user_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  actionType: varchar("action_type").notNull(), // 'signup', 'profile_completion', 'join_campaign', 'complete_task', 'referral', 'daily_login', 'social_task'
  points: integer("points").notNull(),
  referenceId: varchar("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserPointSchema = createInsertSchema(userPoints).omit({ id: true, createdAt: true });
export type UserPoint = typeof userPoints.$inferSelect;
export type InsertUserPoint = z.infer<typeof insertUserPointSchema>;

// Welcome campaign task completions
export const welcomeTaskCompletions = pgTable("welcome_task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskKey: varchar("task_key").notNull(), // 'telegram', 'twitter', 'instagram', 'youtube', 'whatsapp', 'profile'
  completedAt: timestamp("completed_at").defaultNow(),
});

export const insertWelcomeTaskCompletionSchema = createInsertSchema(welcomeTaskCompletions).omit({ id: true, completedAt: true });
export type WelcomeTaskCompletion = typeof welcomeTaskCompletions.$inferSelect;
export type InsertWelcomeTaskCompletion = z.infer<typeof insertWelcomeTaskCompletionSchema>;

export const insertSocialPlatformSchema = createInsertSchema(socialPlatforms).omit({ id: true, createdAt: true });
export const insertUserSocialLinkSchema = createInsertSchema(userSocialLinks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPortfolioItemSchema = createInsertSchema(portfolioItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPushNotificationCampaignSchema = createInsertSchema(pushNotificationCampaigns).omit({ id: true, createdAt: true });

export type SocialPlatform = typeof socialPlatforms.$inferSelect;
export type InsertSocialPlatform = z.infer<typeof insertSocialPlatformSchema>;
export type UserSocialLink = typeof userSocialLinks.$inferSelect;
export type InsertUserSocialLink = z.infer<typeof insertUserSocialLinkSchema>;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = z.infer<typeof insertPortfolioItemSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type PushNotificationCampaign = typeof pushNotificationCampaigns.$inferSelect;

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
}).extend({
  reward: z.number().min(1, "Reward must be at least $1"),
  totalSlots: z.number().min(1, "Must have at least 1 slot"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  requirements: z.string().min(1, "Requirements are required"),
  preQualificationTasks: z.any().optional(),
  qualificationRules: z.string().optional(),
  tdripPointsPerParticipant: z.number().min(0).optional(),
  tdripParticipantLimit: z.number().min(0).optional(),
  tdripEscrowValue: z.string().optional(),
  autoApproveMicroTasks: z.boolean().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  estimatedTime: z.string().min(1, "Estimated time is required"),
});

export const contentReports = pgTable("content_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").references(() => users.id),
  contentType: varchar("content_type", { length: 30 }).notNull(),
  contentId: varchar("content_id").notNull(),
  reason: varchar("reason", { length: 60 }).notNull(),
  details: text("details"),
  status: varchar("status", { length: 20 }).default("open"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ContentReport = typeof contentReports.$inferSelect;

export const insertCampaignMicroTaskSchema = createInsertSchema(campaignMicroTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMicroTaskSubmissionSchema = createInsertSchema(microTaskSubmissions).omit({
  id: true,
  submittedAt: true,
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
  updatedAt: true,
});

export const insertTaskSubmissionSchema = createInsertSchema(taskSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
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
export type CampaignMicroTask = typeof campaignMicroTasks.$inferSelect;
export type InsertCampaignMicroTask = z.infer<typeof insertCampaignMicroTaskSchema>;
export type MicroTaskSubmission = typeof microTaskSubmissions.$inferSelect;
export type InsertMicroTaskSubmission = z.infer<typeof insertMicroTaskSubmissionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogLike = typeof blogLikes.$inferSelect;
export type BlogComment = typeof blogComments.$inferSelect;
export type BlogCategoryFollow = typeof blogCategoryFollows.$inferSelect;

export const insertBlogCommentSchema = createInsertSchema(blogComments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlogComment = z.infer<typeof insertBlogCommentSchema>;
export type ShopProduct = typeof shopProducts.$inferSelect;
export type InsertShopProduct = z.infer<typeof insertShopProductSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = typeof productReviews.$inferInsert;
export type ProductLike = typeof productLikes.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type TaskSubmission = typeof taskSubmissions.$inferSelect;
export type InsertTaskSubmission = z.infer<typeof insertTaskSubmissionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Payment deposits for campaign funding
export const paymentDeposits = pgTable("payment_deposits", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  brandId: varchar("brand_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  network: varchar("network", { length: 20 }).notNull(), // 'tron', 'bsc', 'ton'
  walletAddress: varchar("wallet_address", { length: 100 }),
  transactionHash: varchar("transaction_hash", { length: 100 }),
  paymentProof: varchar("payment_proof", { length: 500 }),
  status: varchar("status", { length: 20 }).default('pending'), // 'pending', 'submitted', 'verified', 'approved', 'rejected'
  timerExpiresAt: timestamp("timer_expires_at"),
  adminNotes: text("admin_notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin wallets for platform payments
export const adminWallets = pgTable("admin_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletName: varchar("wallet_name", { length: 100 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 100 }).notNull(),
  network: varchar("network", { length: 20 }).notNull(), // 'tron', 'bsc', 'ton'
  currency: varchar("currency", { length: 10 }).notNull(), // 'USDT', 'TON', 'BNB'
  purpose: varchar("purpose", { length: 50 }).notNull(), // 'subscriptions', 'task_uploads', 'ads_campaigns', 'escrow'
  isActive: boolean("is_active").default(true),
  qrCodePath: varchar("qr_code_path", { length: 500 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brand wallet balances
export const brandWallets = pgTable("brand_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: varchar("brand_id").references(() => users.id).unique(),
  totalDeposited: decimal("total_deposited", { precision: 10, scale: 2 }).default("0.00"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0.00"),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0.00"),
  pendingDeposits: decimal("pending_deposits", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social Feed - Posts by influencers
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url"),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  viewCount: integer("view_count").default(0),
  totalTipsReceived: decimal("total_tips_received", { precision: 10, scale: 2 }).default("0.00"),
  isSpotlight: boolean("is_spotlight").default(false),
  isSponsored: boolean("is_sponsored").default(false),
  niche: varchar("niche"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey(),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey(),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: varchar("parent_id"), // For nested replies
  createdAt: timestamp("created_at").defaultNow(),
});

// User follows table
export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Reviews - star ratings and comments on any user profile
export const userReviews = pgTable("user_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id), // Who is being reviewed
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id), // Who wrote the review
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: varchar("reference_id"),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  plan: varchar("plan").notNull(), // 'creator_monthly', 'creator_yearly', 'brand_monthly', 'brand_yearly', 'creator_3day', 'creator_5day', 'brand_3day', 'brand_5day'
  status: varchar("status").notNull().default("pending"), // 'pending', 'active', 'expired', 'cancelled'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  network: varchar("network", { length: 20 }), // 'tron', 'bsc', 'ton'
  transactionHash: varchar("transaction_hash"),
  paymentProof: varchar("payment_proof"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  periodDays: integer("period_days"), // custom period in days (3, 5, 30, 365)
  autoRenew: boolean("auto_renew").default(true),
  renewalReminderSent: boolean("renewal_reminder_sent").default(false),
  expiryReminderSent: boolean("expiry_reminder_sent").default(false), // 1-day before expiry notification
  paymentMethodLabel: varchar("payment_method_label"), // label of selected payment method
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payout requests - influencer requesting payout to admin
export const payoutRequests = pgTable("payout_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  network: varchar("network", { length: 20 }).notNull(), // 'tron', 'bsc', 'ton'
  walletAddress: varchar("wallet_address").notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'rejected'
  adminNotes: text("admin_notes"),
  transactionHash: varchar("transaction_hash"),
  processedBy: varchar("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  // Source linkage — tracks exactly which campaign or direct hire generated this payout
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  directHireId: varchar("direct_hire_id").references(() => directHireOffers.id),
  sourceType: varchar("source_type", { length: 30 }).default("manual"), // 'campaign', 'direct_hire', 'manual'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payout request messages for communication
export const payoutMessages = pgTable("payout_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payoutRequestId: varchar("payout_request_id").notNull().references(() => payoutRequests.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Referrals system
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id), // Who sent the referral
  referredId: varchar("referred_id").notNull().references(() => users.id), // Who joined via referral
  referralType: varchar("referral_type").notNull(), // 'creator' or 'brand'
  referralCode: varchar("referral_code").notNull(), // The code used
  status: varchar("status").notNull().default("pending"), // 'pending', 'converted', 'rewarded'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true, likeCount: true, commentCount: true, viewCount: true });
export const insertPostCommentSchema = createInsertSchema(postComments).omit({ id: true, createdAt: true });
export const insertUserReviewSchema = createInsertSchema(userReviews).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
export type UserFollow = typeof userFollows.$inferSelect;
export type UserReview = typeof userReviews.$inferSelect;
export type InsertUserReview = z.infer<typeof insertUserReviewSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutMessage = typeof payoutMessages.$inferSelect;
export type Referral = typeof referrals.$inferSelect;

// ── Payment Methods (Admin-managed wallets, bank accounts, gateways) ──
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // 'crypto', 'bank', 'paypal', 'paystack', 'stripe'
  label: varchar("label").notNull(), // e.g. "USDT TRC-20", "GTBank NGN", "PayPal Business"
  // Crypto fields
  network: varchar("network"), // e.g. "TRC-20", "BEP-20", "TON", "ERC-20", "BTC"
  currency: varchar("currency"), // e.g. "USDT", "TON", "BTC", "ETH"
  address: varchar("address", { length: 500 }),
  // Bank fields
  bankName: varchar("bank_name"),
  accountName: varchar("account_name"),
  accountNumber: varchar("account_number"),
  routingNumber: varchar("routing_number"),
  swiftCode: varchar("swift_code"),
  bankCountry: varchar("bank_country"),
  bankCurrency: varchar("bank_currency"),
  // PayPal fields
  paypalEmail: varchar("paypal_email"),
  paypalClientId: varchar("paypal_client_id"),
  // Paystack fields
  paystackPublicKey: varchar("paystack_public_key"),
  paystackSecretKey: varchar("paystack_secret_key"),
  // Stripe fields
  stripePublicKey: varchar("stripe_public_key"),
  stripeSecretKey: varchar("stripe_secret_key"),
  // Common
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

// ── Platform Settings (site-wide config) ──
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").unique().notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

// Insert schemas for new payment tables
export const insertPaymentDepositSchema = createInsertSchema(paymentDeposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminWalletSchema = createInsertSchema(adminWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrandWalletSchema = createInsertSchema(brandWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new payment tables
export type PaymentDeposit = typeof paymentDeposits.$inferSelect;
export type InsertPaymentDeposit = z.infer<typeof insertPaymentDepositSchema>;

export type AdminWallet = typeof adminWallets.$inferSelect;
export type InsertAdminWallet = z.infer<typeof insertAdminWalletSchema>;

export type BrandWallet = typeof brandWallets.$inferSelect;
export type InsertBrandWallet = z.infer<typeof insertBrandWalletSchema>;

// ──────────────────────────────────────────────────────────────
// BreedSkool – Learning Platform
// ──────────────────────────────────────────────────────────────

export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  shortDescription: varchar("short_description"),
  category: varchar("category").notNull(),
  thumbnail: varchar("thumbnail"),
  previewVideoUrl: varchar("preview_video_url"),
  introVideoUrl: varchar("intro_video_url"),
  serviceAddons: jsonb("service_addons").$type<{ id: string; title: string; description: string; price: number }[]>().default(sql`'[]'::jsonb`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00"),
  isFree: boolean("is_free").default(false),
  level: varchar("level").default("beginner"),
  duration: varchar("duration"),
  lessonsCount: integer("lessons_count").default(0),
  studentsCount: integer("students_count").default(0),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  reviewsCount: integer("reviews_count").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0.00"),
  syllabus: jsonb("syllabus").default(sql`'[]'::jsonb`),
  requirements: text("requirements").array(),
  whatYouLearn: text("what_you_learn").array(),
  tags: text("tags").array(),
  status: varchar("status").default("draft"),
  isPublished: boolean("is_published").default(false),
  isFeatured: boolean("is_featured").default(false),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  saleDeadline: timestamp("sale_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courseEnrollments = pgTable("course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default("active"),
  progress: integer("progress").default(0),
  paymentMethod: varchar("payment_method"),
  paymentProof: varchar("payment_proof"),
  transactionHash: varchar("transaction_hash"),
  amount: decimal("amount", { precision: 10, scale: 2 }).default("0.00"),
  isPaid: boolean("is_paid").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courseReviews = pgTable("course_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courseComments = pgTable("course_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courseLikes = pgTable("course_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courseLessons = pgTable("course_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  description: text("description"),
  videoUrl: varchar("video_url"),
  videoLink: varchar("video_link"),
  content: text("content"),
  order: integer("order").default(0),
  lessonFiles: jsonb("lesson_files").default(sql`'[]'::jsonb`),
  isPreview: boolean("is_preview").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courseMessages = pgTable("course_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id), // null = group chat, set = private DM
  message: text("message").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Per-student per-lesson completion tracking
export const courseLessonProgress = pgTable("course_lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").notNull().references(() => courseLessons.id, { onDelete: 'cascade' }),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Editable certificate template (singleton; admin-managed)
export const courseCertificateTemplate = pgTable("course_certificate_template", {
  id: varchar("id").primaryKey().default("default"),
  institutionName: varchar("institution_name").default("BreedSkool Academy"),
  institutionLogoUrl: varchar("institution_logo_url"),
  signatoryName: varchar("signatory_name").default("Director of Education"),
  signatoryTitle: varchar("signatory_title").default("BreedSkool Director"),
  signatureImageUrl: varchar("signature_image_url"),
  sealImageUrl: varchar("seal_image_url"),
  bodyTemplate: text("body_template").default("This is to certify that {{studentName}} has successfully completed the course \"{{courseTitle}}\" on {{date}}, taught by {{instructorName}}."),
  headlineText: varchar("headline_text").default("Certificate of Completion"),
  accentColor: varchar("accent_color").default("#7c3aed"),
  bgColor: varchar("bg_color").default("#fdfaf6"),
  borderStyle: varchar("border_style").default("classic"), // classic | modern | ornate
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student assignment submissions per lesson
export const courseAssignments = pgTable("course_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").references(() => courseLessons.id, { onDelete: 'set null' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  fileUrl: varchar("file_url"),
  fileName: varchar("file_name"),
  fileType: varchar("file_type"),
  status: varchar("status").default("submitted"), // submitted | reviewed | approved | rejected
  tutorFeedback: text("tutor_feedback"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});
export type CourseAssignment = typeof courseAssignments.$inferSelect;
export const insertCourseAssignmentSchema = createInsertSchema(courseAssignments).omit({ id: true, submittedAt: true });
export type InsertCourseAssignment = z.infer<typeof insertCourseAssignmentSchema>;

// Issued certificates
export const courseCertificates = pgTable("course_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  certCode: varchar("cert_code").notNull().unique(), // e.g. BS-X9K2-A4M7
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentName: varchar("student_name").notNull(),
  courseTitle: varchar("course_title").notNull(),
  instructorName: varchar("instructor_name"),
  issuedAt: timestamp("issued_at").defaultNow(),
});

// Community board posts (per-course threaded discussion board, separate from chat)
export const courseCommunityPosts = pgTable("course_community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  replyToId: varchar("reply_to_id"), // nullable — set for replies, references another post id
  topic: varchar("topic", { length: 100 }).default("General"), // Forum topic/category
  likeCount: integer("like_count").default(0),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tracks who liked which community post (for toggle/unique enforcement)
export const courseCommunityLikes = pgTable("course_community_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => courseCommunityPosts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CourseCommunityPost = typeof courseCommunityPosts.$inferSelect;
export type CourseCommunityLike = typeof courseCommunityLikes.$inferSelect;
export const insertCourseCommunityPostSchema = createInsertSchema(courseCommunityPosts).omit({ id: true, createdAt: true, likeCount: true });

// Payment Networks — admin toggles which crypto deposit/withdrawal networks are active
export const paymentNetworks = pgTable("payment_networks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  networkKey: varchar("network_key", { length: 50 }).notNull().unique(), // 'usdt_tron', 'usdt_ton', 'usdt_bsc', 'usdt_eth'
  name: varchar("name", { length: 100 }).notNull(),           // 'USDT - Tron Network'
  shortName: varchar("short_name", { length: 30 }).notNull(), // 'TRC-20'
  network: varchar("network", { length: 20 }).notNull(),       // 'tron', 'ton', 'bsc', 'eth'
  currency: varchar("currency", { length: 10 }).notNull().default("USDT"),
  walletAddress: varchar("wallet_address", { length: 200 }),   // admin deposit address for this network
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentNetworkSchema = createInsertSchema(paymentNetworks).omit({ id: true, createdAt: true, updatedAt: true });
export type PaymentNetwork = typeof paymentNetworks.$inferSelect;
export type InsertPaymentNetwork = z.infer<typeof insertPaymentNetworkSchema>;

export const siteContent = pgTable("site_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentKey: varchar("content_key", { length: 200 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  contentType: varchar("content_type", { length: 20 }).notNull().default("text"),
  page: varchar("page", { length: 50 }).notNull(),
  section: varchar("section", { length: 100 }).notNull(),
  value: text("value").notNull().default(""),
  defaultValue: text("default_value").notNull().default(""),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertSiteContentSchema = createInsertSchema(siteContent).omit({ id: true, updatedAt: true });
export type SiteContent = typeof siteContent.$inferSelect;
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;

export const pwaSettings = pgTable("pwa_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appName: varchar("app_name").notNull().default("Taskdrip"),
  shortName: varchar("short_name").notNull().default("Taskdrip"),
  description: text("description").notNull().default("The leading Web3 influencer marketplace connecting global brands with verified creators."),
  themeColor: varchar("theme_color").notNull().default("#7c3aed"),
  backgroundColor: varchar("background_color").notNull().default("#0f0f1a"),
  displayMode: varchar("display_mode").notNull().default("standalone"),
  promptTitle: varchar("prompt_title").notNull().default("Never Miss a Crypto Drop"),
  promptMessage: text("prompt_message").notNull().default("Turn on Taskdrip alerts and be first in line when high-paying Web3 campaigns go live. New tasks move fast — claim your spot before the rewards are gone."),
  promptImageUrl: varchar("prompt_image_url"),
  promptEnabled: boolean("prompt_enabled").notNull().default(true),
  promptDelay: integer("prompt_delay").notNull().default(30),
  promptScrollPercent: integer("prompt_scroll_percent").notNull().default(25),
  gaTrackingId: varchar("ga_tracking_id"),
  gtmId: varchar("gtm_id"),
  googleSiteVerification: varchar("google_site_verification"),
  bingVerification: varchar("bing_verification"),
  defaultOgImage: varchar("default_og_image"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPwaSettingsSchema = createInsertSchema(pwaSettings).omit({ id: true, updatedAt: true });
export type PwaSettings = typeof pwaSettings.$inferSelect;
export type InsertPwaSettings = z.infer<typeof insertPwaSettingsSchema>;

// ──────────────────────────────────────────────────────────────
// Page SEO Settings — per-page meta, OG, Twitter card, structured data
// ──────────────────────────────────────────────────────────────
export const pageSeoSettings = pgTable("page_seo_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageSlug: varchar("page_slug").notNull().unique(),
  pageTitle: varchar("page_title").notNull(),
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  ogTitle: varchar("og_title"),
  ogDescription: text("og_description"),
  ogImage: varchar("og_image"),
  twitterCard: varchar("twitter_card").default("summary_large_image"),
  twitterTitle: varchar("twitter_title"),
  twitterDescription: text("twitter_description"),
  twitterImage: varchar("twitter_image"),
  keywords: text("keywords"),
  canonicalUrl: varchar("canonical_url"),
  noIndex: boolean("no_index").default(false),
  noFollow: boolean("no_follow").default(false),
  structuredData: text("structured_data"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPageSeoSettingsSchema = createInsertSchema(pageSeoSettings).omit({ id: true, updatedAt: true });
export type PageSeoSettings = typeof pageSeoSettings.$inferSelect;
export type InsertPageSeoSettings = z.infer<typeof insertPageSeoSettingsSchema>;

// ──────────────────────────────────────────────────────────────
// Leads — global business + influencer discovery / outreach CRM
// ──────────────────────────────────────────────────────────────
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: varchar("kind").notNull(), // 'business' | 'influencer'
  source: varchar("source"),        // 'google_places' | 'youtube' | 'manual' | 'internal' | 'csv'
  externalId: varchar("external_id"),
  name: varchar("name").notNull(),
  niche: varchar("niche"),
  businessType: varchar("business_type"),
  country: varchar("country"),
  city: varchar("city"),
  address: text("address"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  phone: varchar("phone"),
  whatsapp: varchar("whatsapp"),
  email: varchar("email"),
  website: varchar("website"),
  socialLinks: jsonb("social_links").default({}),  // { instagram, tiktok, youtube, x, facebook, telegram, linkedin }
  followers: integer("followers"),
  yearsInBusiness: integer("years_in_business"),
  rating: varchar("rating"),
  reviewCount: integer("review_count"),
  description: text("description"),
  aiSummary: text("ai_summary"),
  aiReport: text("ai_report"),
  tags: text("tags").array().default([]),
  status: varchar("status").default("new"), // new, contacted, replied, converted, archived
  lastContactedAt: timestamp("last_contacted_at"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export const leadMessages = pgTable("lead_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  channel: varchar("channel").notNull(), // 'sms' | 'whatsapp' | 'call' | 'email' | 'note'
  direction: varchar("direction").default("outbound"),
  body: text("body"),
  status: varchar("status").default("sent"), // sent, delivered, failed, queued, logged
  provider: varchar("provider"),  // 'twilio' | 'manual' | 'wa_link' | 'tel_link'
  providerId: varchar("provider_id"),
  error: text("error"),
  sentBy: varchar("sent_by"), // admin user id
  campaignId: varchar("campaign_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type LeadMessage = typeof leadMessages.$inferSelect;
export const insertLeadMessageSchema = createInsertSchema(leadMessages).omit({ id: true, createdAt: true });
export type InsertLeadMessage = z.infer<typeof insertLeadMessageSchema>;

// ──────────────────────────────────────────────────────────────
// Page Views — built-in lightweight analytics
// ──────────────────────────────────────────────────────────────
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  path: varchar("path").notNull(),
  referrer: varchar("referrer"),
  userId: varchar("user_id"),
  sessionId: varchar("session_id"),
  userAgent: varchar("user_agent"),
  country: varchar("country"),
  device: varchar("device"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ──────────────────────────────────────────────────────────────
// Footer Columns — admin-managed footer link columns
// ──────────────────────────────────────────────────────────────
export const footerColumns = pgTable("footer_columns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  links: jsonb("links").notNull().default([]),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const insertFooterColumnSchema = createInsertSchema(footerColumns).omit({ id: true });
export type FooterColumn = typeof footerColumns.$inferSelect;
export type InsertFooterColumn = z.infer<typeof insertFooterColumnSchema>;

export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCourseEnrollmentSchema = createInsertSchema(courseEnrollments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCourseReviewSchema = createInsertSchema(courseReviews).omit({ id: true, createdAt: true });
export const insertCourseCommentSchema = createInsertSchema(courseComments).omit({ id: true, createdAt: true });
export const insertCourseLessonSchema = createInsertSchema(courseLessons).omit({ id: true, createdAt: true });
export const insertCourseMessageSchema = createInsertSchema(courseMessages).omit({ id: true, createdAt: true });

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;
export type CourseReview = typeof courseReviews.$inferSelect;
export type InsertCourseReview = z.infer<typeof insertCourseReviewSchema>;
export type CourseComment = typeof courseComments.$inferSelect;
export type InsertCourseComment = z.infer<typeof insertCourseCommentSchema>;
export type CourseLike = typeof courseLikes.$inferSelect;
export type CourseLesson = typeof courseLessons.$inferSelect;
export type InsertCourseLesson = z.infer<typeof insertCourseLessonSchema>;
export type CourseMessage = typeof courseMessages.$inferSelect;

// ──────────────────────────────────────────────────────────────
// Payment Feature Toggles — which payment methods are enabled for which features
// ──────────────────────────────────────────────────────────────
export const paymentFeatureToggles = pgTable("payment_feature_toggles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentMethodId: varchar("payment_method_id").notNull().references(() => paymentMethods.id, { onDelete: 'cascade' }),
  feature: varchar("feature").notNull(), // 'shop', 'campaigns', 'subscriptions', 'courses', 'tips', 'payouts'
  isEnabled: boolean("is_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentFeatureToggleSchema = createInsertSchema(paymentFeatureToggles).omit({ id: true, updatedAt: true });
export type PaymentFeatureToggle = typeof paymentFeatureToggles.$inferSelect;
export type InsertPaymentFeatureToggle = z.infer<typeof insertPaymentFeatureToggleSchema>;

// ──────────────────────────────────────────────────────────────
// Sponsored Ads — admin-managed manual ads
// ──────────────────────────────────────────────────────────────
export const sponsoredAds = pgTable("sponsored_ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  linkUrl: varchar("link_url").notNull(),
  advertiserName: varchar("advertiser_name").notNull(),
  advertiserLogo: varchar("advertiser_logo"),
  placement: varchar("placement").notNull(), // 'banner_top', 'sidebar', 'feed', 'shop', 'blog', 'breedskool', 'campaigns', 'between_content'
  adType: varchar("ad_type").notNull().default("display"), // 'display', 'native', 'video'
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  cpm: decimal("cpm", { precision: 6, scale: 2 }), // cost per thousand impressions
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSponsoredAdSchema = createInsertSchema(sponsoredAds).omit({ id: true, impressions: true, clicks: true, createdAt: true, updatedAt: true });
export type SponsoredAd = typeof sponsoredAds.$inferSelect;
export type InsertSponsoredAd = z.infer<typeof insertSponsoredAdSchema>;

// ──────────────────────────────────────────────────────────────
// Ad Analytics — detailed event tracking per ad
// ──────────────────────────────────────────────────────────────
export const adAnalytics = pgTable("ad_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adId: varchar("ad_id").references(() => sponsoredAds.id, { onDelete: "cascade" }),
  eventType: varchar("event_type").notNull(), // 'impression', 'click'
  sessionId: varchar("session_id"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  deviceType: varchar("device_type"), // 'mobile', 'tablet', 'desktop'
  browser: varchar("browser"),
  os: varchar("os"),
  country: varchar("country"),
  city: varchar("city"),
  ipAddress: varchar("ip_address"),
  pageUrl: varchar("page_url"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdAnalytic = typeof adAnalytics.$inferSelect;

// ──────────────────────────────────────────────────────────────
// Advertise Applications — from "Advertise With Us" public form
// ──────────────────────────────────────────────────────────────
export const advertiseApplications = pgTable("advertise_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name").notNull(),
  contactName: varchar("contact_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  website: varchar("website"),
  industry: varchar("industry"),
  adType: varchar("ad_type").notNull(), // 'platform_ads', 'social_media', 'influencer_network', 'sponsored_content', 'all'
  budget: varchar("budget"), // 'under_500', '500_2000', '2000_10000', 'over_10000'
  platforms: varchar("platforms"),
  giveawayType: text("giveaway_type"),
  tdripBudget: text("tdrip_budget"),
  goals: text("goals"),
  message: text("message"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'contacted', 'approved', 'rejected'
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdvertiseApplicationSchema = createInsertSchema(advertiseApplications).omit({ id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true });
export type AdvertiseApplication = typeof advertiseApplications.$inferSelect;
export type InsertAdvertiseApplication = z.infer<typeof insertAdvertiseApplicationSchema>;

// ──────────────────────────────────────────────────────────────
// Email Settings — SMTP / IMAP / Domain / SSL config (singleton)
// ──────────────────────────────────────────────────────────────
export const emailSettings = pgTable("email_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // SMTP
  smtpHost: varchar("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: varchar("smtp_user"),
  smtpPass: varchar("smtp_pass"),
  smtpSsl: boolean("smtp_ssl").default(false),
  smtpTls: boolean("smtp_tls").default(true),
  smtpFromEmail: varchar("smtp_from_email"),
  smtpFromName: varchar("smtp_from_name"),
  // IMAP
  imapHost: varchar("imap_host"),
  imapPort: integer("imap_port").default(993),
  imapUser: varchar("imap_user"),
  imapPass: varchar("imap_pass"),
  imapSsl: boolean("imap_ssl").default(true),
  // Domain & Site
  siteUrl: varchar("site_url"),
  domain: varchar("domain"),
  unsubscribeUrl: varchar("unsubscribe_url"),
  logoUrl: varchar("logo_url"),
  // DNS records (stored for reference)
  spfRecord: text("spf_record"),
  dkimPublicKey: text("dkim_public_key"),
  dmarcRecord: text("dmarc_record"),
  // Provider preference (resend | smtp | sendgrid — empty = auto)
  preferredProvider: varchar("preferred_provider"),
  // Status
  isVerified: boolean("is_verified").default(false),
  lastTestedAt: timestamp("last_tested_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EmailSettings = typeof emailSettings.$inferSelect;

// ──────────────────────────────────────────────────────────────
// Email Templates — reusable HTML/text templates
// ──────────────────────────────────────────────────────────────
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: varchar("category").notNull().default("general"), // 'welcome', 'campaign', 'newsletter', 'promo', 'auto_responder', 'general'
  subject: varchar("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  variables: text("variables").array(), // ['{{first_name}}', '{{campaign_name}}']
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// ──────────────────────────────────────────────────────────────
// Email Campaigns — blast campaigns to user segments
// ──────────────────────────────────────────────────────────────
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  templateId: varchar("template_id"),
  // Targeting
  targetSegment: varchar("target_segment").notNull().default("all"), // 'all', 'creators', 'brands', 'tier_rising_sparks', 'tier_growth_engines', 'tier_power_influencers', 'tier_global_titans', 'verified', 'unverified'
  // Status & scheduling
  status: varchar("status").notNull().default("draft"), // 'draft', 'scheduled', 'sending', 'sent', 'failed'
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  // Stats
  totalRecipients: integer("total_recipients").default(0),
  sent: integer("sent").default(0),
  delivered: integer("delivered").default(0),
  opened: integer("opened").default(0),
  clicked: integer("clicked").default(0),
  bounced: integer("bounced").default(0),
  unsubscribed: integer("unsubscribed").default(0),
  // Meta
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({ id: true, sent: true, delivered: true, opened: true, clicked: true, bounced: true, unsubscribed: true, sentAt: true, createdAt: true, updatedAt: true });
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;

// ──────────────────────────────────────────────────────────────
// Email Auto-Responders — AI-assisted automated sequences
// ──────────────────────────────────────────────────────────────
export const emailAutoResponders = pgTable("email_auto_responders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  trigger: varchar("trigger").notNull(), // 'signup', 'campaign_join', 'campaign_complete', 'purchase', 'kyc_approved', 'payout_sent', 'custom'
  triggerDelay: integer("trigger_delay").default(0), // minutes after trigger
  subject: varchar("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  targetUserType: varchar("target_user_type").default("all"), // 'all', 'creator', 'brand'
  isActive: boolean("is_active").default(true),
  aiGenerated: boolean("ai_generated").default(false),
  aiPrompt: text("ai_prompt"),
  sentCount: integer("sent_count").default(0),
  openCount: integer("open_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailAutoResponderSchema = createInsertSchema(emailAutoResponders).omit({ id: true, sentCount: true, openCount: true, createdAt: true, updatedAt: true });
export type EmailAutoResponder = typeof emailAutoResponders.$inferSelect;
export type InsertEmailAutoResponder = z.infer<typeof insertEmailAutoResponderSchema>;

// ──────────────────────────────────────────────────────────────
// Email Logs — per-recipient send tracking
// ──────────────────────────────────────────────────────────────
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id"),
  autoResponderId: varchar("auto_responder_id"),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name"),
  subject: varchar("subject").notNull(),
  status: varchar("status").notNull().default("sent"), // 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  errorMessage: text("error_message"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export type EmailLog = typeof emailLogs.$inferSelect;

// ──────────────────────────────────────────────────────────────
// Hero Sliders — admin-managed landing page hero carousel
// ──────────────────────────────────────────────────────────────
export const heroSliders = pgTable("hero_sliders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  order: integer("order").default(0),
  badge: varchar("badge"),
  headline: text("headline").notNull(),
  subheadline: text("subheadline"),
  ctaPrimaryLabel: varchar("cta_primary_label"),
  ctaPrimaryLink: varchar("cta_primary_link"),
  ctaSecondaryLabel: varchar("cta_secondary_label"),
  ctaSecondaryLink: varchar("cta_secondary_link"),
  backgroundImage: text("background_image"),
  overlayColor: varchar("overlay_color").default("from-black/90 via-black/70 to-black/40"),
  accentColor: varchar("accent_color").default("from-purple-400 via-pink-400 to-orange-400"),
  isActive: boolean("is_active").default(true),
  targetPages: text("target_pages").default("landing"), // comma-separated: "landing,campaigns,shop"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHeroSliderSchema = createInsertSchema(heroSliders).omit({ id: true, createdAt: true, updatedAt: true });
export type HeroSlider = typeof heroSliders.$inferSelect;
export type InsertHeroSlider = z.infer<typeof insertHeroSliderSchema>;

// ──────────────────────────────────────────────────────────────
// Page Content CMS — admin-editable content blocks for all pages
// ──────────────────────────────────────────────────────────────
export const pageContent = pgTable("page_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  page: varchar("page").notNull(),        // 'landing', 'breedskool', 'shop', 'campaigns', 'global'
  section: varchar("section").notNull(), // 'how_it_works', 'features', 'cta', etc.
  key: varchar("key").notNull(),          // 'title', 'subtitle', 'body', 'image', 'link'
  value: text("value"),                   // the actual editable content
  defaultValue: text("default_value"),    // fallback if value is null/empty
  type: varchar("type").default("text"), // 'text' | 'html' | 'image' | 'url' | 'textarea'
  label: varchar("label").notNull(),      // human-readable label shown in admin
  description: text("description"),       // helper text for the admin
  order: integer("order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
},
(table) => [
  index("IDX_page_content_page_section").on(table.page, table.section),
]);

export const insertPageContentSchema = createInsertSchema(pageContent).omit({ id: true, updatedAt: true });
export type PageContent = typeof pageContent.$inferSelect;
export type InsertPageContent = z.infer<typeof insertPageContentSchema>;

// Blog Tips - readers can tip blog posts using admin wallet
export const blogTips = pgTable("blog_tips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => blogPosts.id),
  userId: varchar("user_id").references(() => users.id),
  displayName: varchar("display_name", { length: 100 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USDT"),
  network: varchar("network", { length: 20 }).notNull(),
  txHash: varchar("tx_hash", { length: 200 }),
  walletAddress: varchar("wallet_address", { length: 200 }),
  status: varchar("status").default("pending"), // 'pending', 'confirmed', 'rejected'
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBlogTipSchema = createInsertSchema(blogTips).omit({ id: true, createdAt: true });
export type BlogTip = typeof blogTips.$inferSelect;
export type InsertBlogTip = z.infer<typeof insertBlogTipSchema>;

// Leaderboard Reward Tiers — admin-managed prizes per position range
export const leaderboardRewards = pgTable("leaderboard_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  positionFrom: integer("position_from").notNull(), // e.g. 1
  positionTo: integer("position_to").notNull(),     // e.g. 3
  prizeValue: decimal("prize_value", { precision: 12, scale: 2 }).default("0.00"), // $ value
  currency: varchar("currency", { length: 20 }).default("USDT"),
  prizeDescription: varchar("prize_description", { length: 500 }), // e.g. "Gold Rolex Watch"
  prizeImageUrl: varchar("prize_image_url", { length: 500 }),
  leaderboardType: varchar("leaderboard_type", { length: 30 }).default("all"), // 'points'|'referrals'|'earnings'|'all'
  sponsorName: varchar("sponsor_name", { length: 200 }),
  sponsorBrandId: varchar("sponsor_brand_id").references(() => users.id),
  sponsorUrl: varchar("sponsor_url", { length: 500 }),
  sponsorLogoUrl: varchar("sponsor_logo_url", { length: 500 }),
  season: varchar("season", { length: 50 }), // e.g. "May 2026"
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeaderboardRewardSchema = createInsertSchema(leaderboardRewards).omit({ id: true, createdAt: true, updatedAt: true });
export type LeaderboardReward = typeof leaderboardRewards.$inferSelect;
export type InsertLeaderboardReward = z.infer<typeof insertLeaderboardRewardSchema>;

// Leaderboard Giveaways — separate sponsored giveaway events
export const leaderboardGiveaways = pgTable("leaderboard_giveaways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  prize: varchar("prize", { length: 500 }).notNull(), // e.g. "iPhone 15 Pro"
  prizeValue: decimal("prize_value", { precision: 12, scale: 2 }).default("0.00"),
  totalPrizePool: decimal("total_prize_pool", { precision: 12, scale: 2 }).default("0.00"),
  prizeImageUrl: varchar("prize_image_url", { length: 500 }),
  sponsorName: varchar("sponsor_name", { length: 200 }),
  sponsorBrandId: varchar("sponsor_brand_id").references(() => users.id),
  sponsorUrl: varchar("sponsor_url", { length: 500 }),
  sponsorLogoUrl: varchar("sponsor_logo_url", { length: 500 }),
  requirements: text("requirements"), // e.g. "Be in Top 10 on any leaderboard"
  eligibleLeaderboards: text("eligible_leaderboards").array().default(sql`ARRAY[]::text[]`), // ['points','referrals','earnings']
  winnerCount: integer("winner_count").default(1),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status").default("active"), // 'active'|'ended'|'upcoming'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeaderboardGiveawaySchema = createInsertSchema(leaderboardGiveaways).omit({ id: true, createdAt: true, updatedAt: true });
export type LeaderboardGiveaway = typeof leaderboardGiveaways.$inferSelect;
export type InsertLeaderboardGiveaway = z.infer<typeof insertLeaderboardGiveawaySchema>;

// ── Social Quick Tasks (admin-managed, shown after registration) ───────────────
export const socialQuickTasks = pgTable("social_quick_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 50 }).notNull(), // 'twitter','instagram','telegram','youtube','tiktok','discord', etc.
  label: varchar("label", { length: 200 }).notNull(), // e.g. "Follow us on Twitter"
  actionUrl: varchar("action_url", { length: 500 }).notNull(), // the social link to open
  pointsReward: integer("points_reward").default(50), // $TDRIP points given on completion
  iconEmoji: varchar("icon_emoji", { length: 10 }).default("🔗"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocialQuickTaskSchema = createInsertSchema(socialQuickTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type SocialQuickTask = typeof socialQuickTasks.$inferSelect;
export type InsertSocialQuickTask = z.infer<typeof insertSocialQuickTaskSchema>;

// ── Track which users completed which social quick tasks ──────────────────────
export const userSocialTaskCompletions = pgTable("user_social_task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").notNull().references(() => socialQuickTasks.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow(),
});

// ── Site-wide Social Media Links (admin-managed, shown in footer/nav) ─────────
export const siteSocialLinks = pgTable("site_social_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 50 }).notNull(), // 'twitter','instagram','telegram', etc.
  label: varchar("label", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  iconEmoji: varchar("icon_emoji", { length: 10 }).default("🔗"),
  placement: varchar("placement", { length: 30 }).default("footer"), // 'footer','header','both'
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteSocialLinkSchema = createInsertSchema(siteSocialLinks).omit({ id: true, createdAt: true, updatedAt: true });
export type SiteSocialLink = typeof siteSocialLinks.$inferSelect;
export type InsertSiteSocialLink = z.infer<typeof insertSiteSocialLinkSchema>;

// ──────────────────────────────────────────────────────────────
// Spotlight Items — admin-curated featured content per page
// ──────────────────────────────────────────────────────────────
export const spotlightItems = pgTable("spotlight_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  itemType: varchar("item_type").notNull(), // 'campaign', 'product', 'course', 'p2p', 'service', 'custom'
  itemId: varchar("item_id"),               // optional ref to real entity id
  customTitle: varchar("custom_title"),
  customDescription: text("custom_description"),
  customImage: text("custom_image"),
  customLink: varchar("custom_link"),
  badgeLabel: varchar("badge_label"),       // e.g. "Hot", "New", "Trending"
  targetPages: text("target_pages").notNull().default("landing"), // comma-separated: "landing,campaigns"
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSpotlightItemSchema = createInsertSchema(spotlightItems).omit({ id: true, createdAt: true, updatedAt: true });
export type SpotlightItem = typeof spotlightItems.$inferSelect;
export type InsertSpotlightItem = z.infer<typeof insertSpotlightItemSchema>;

// ──────────────────────────────────────────────────────────────
// Ad Network Placements — third-party ad network code injection
// ──────────────────────────────────────────────────────────────
export const adNetworkPlacements = pgTable("ad_network_placements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),                              // "Google AdSense – Sidebar"
  network: varchar("network").notNull(),                        // 'adsense','admob','medianet','propeller','taboola','mgid','custom'
  adCode: text("ad_code").notNull(),                            // raw HTML/JS snippet
  placementType: varchar("placement_type").notNull().default("inline"), // 'inline','sidebar','popup','banner_top','banner_bottom'
  targetPages: text("target_pages").notNull().default("all"),   // comma-separated or "all"
  popupDelay: integer("popup_delay").default(5),                // seconds before popup shows
  popupFrequency: varchar("popup_frequency").default("session"), // 'once','session','daily','always'
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdNetworkPlacementSchema = createInsertSchema(adNetworkPlacements).omit({ id: true, createdAt: true, updatedAt: true });
export type AdNetworkPlacement = typeof adNetworkPlacements.$inferSelect;
export type InsertAdNetworkPlacement = z.infer<typeof insertAdNetworkPlacementSchema>;

// ──────────────────────────────────────────────────────────────
// Legal Pages — CMS-editable terms/privacy/cookies/disclaimer
// ──────────────────────────────────────────────────────────────
export const legalPages = pgTable("legal_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").unique().notNull(), // terms | privacy | cookies | disclaimer
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  lastUpdatedBy: varchar("last_updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLegalPageSchema = createInsertSchema(legalPages).omit({ id: true, updatedAt: true });
export type LegalPage = typeof legalPages.$inferSelect;
export type InsertLegalPage = z.infer<typeof insertLegalPageSchema>;

// ──────────────────────────────────────────────────────────────
// Newsletter Subscribers — footer opt-in mailing list
// ──────────────────────────────────────────────────────────────
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  name: varchar("name"),
  status: varchar("status").default("active"), // active | unsubscribed
  source: varchar("source").default("footer"), // footer | popup | campaign
  ipAddress: varchar("ip_address"),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({ id: true, subscribedAt: true });
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

// ──────────────────────────────────────────────────────────────
// URL Shortener — short links + per-click analytics
// ──────────────────────────────────────────────────────────────
export const shortLinks = pgTable("short_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: varchar("slug").unique().notNull(),
  originalUrl: text("original_url").notNull(),
  title: varchar("title"),
  isReferral: boolean("is_referral").default(false),
  isActive: boolean("is_active").default(true),
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shortLinkClicks = pgTable("short_link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").notNull().references(() => shortLinks.id, { onDelete: "cascade" }),
  clickedAt: timestamp("clicked_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  country: varchar("country"),
  countryCode: varchar("country_code"),
  region: varchar("region"),
  city: varchar("city"),
  userAgent: text("user_agent"),
  browser: varchar("browser"),
  os: varchar("os"),
  device: varchar("device"), // 'desktop' | 'mobile' | 'tablet'
  referer: text("referer"),
});

export const shortenerSettings = pgTable("shortener_settings", {
  id: varchar("id").primaryKey().default("singleton"),
  enabled: boolean("enabled").default(true),
  allowFreeUsers: boolean("allow_free_users").default(true),
  allowVerifiedUsers: boolean("allow_verified_users").default(true),
  allowPremiumUsers: boolean("allow_premium_users").default(true),
  allowBrands: boolean("allow_brands").default(true),
  allowInfluencers: boolean("allow_influencers").default(true),
  freeUserLimit: integer("free_user_limit").default(5),
  premiumUserLimit: integer("premium_user_limit").default(500),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShortLinkSchema = createInsertSchema(shortLinks).omit({ id: true, createdAt: true, clickCount: true });
export type ShortLink = typeof shortLinks.$inferSelect;
export type InsertShortLink = z.infer<typeof insertShortLinkSchema>;
export type ShortLinkClick = typeof shortLinkClicks.$inferSelect;
export type ShortenerSettings = typeof shortenerSettings.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Analytics + Auto-Blogger
// ─────────────────────────────────────────────────────────────────────────────

export const keywordTrackers = pgTable("keyword_trackers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  keyword: varchar("keyword").notNull(),
  platforms: text("platforms").array().default(sql`ARRAY[]::text[]`), // google,youtube,tiktok,instagram,x,reddit,news
  region: varchar("region").default("US"),
  isActive: boolean("is_active").default(true),
  lastRefreshedAt: timestamp("last_refreshed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackedContent = pgTable("tracked_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackerId: varchar("tracker_id").notNull().references(() => keywordTrackers.id, { onDelete: "cascade" }),
  platform: varchar("platform").notNull(), // youtube, reddit, news, hackernews, googletrends, tiktok, instagram, x
  externalId: varchar("external_id"),
  title: text("title"),
  url: text("url"),
  thumbnail: text("thumbnail"),
  author: varchar("author"),
  snippet: text("snippet"),
  metric: integer("metric").default(0), // views, score, etc
  publishedAt: timestamp("published_at"),
  rawData: text("raw_data"), // JSON
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export const trendingTopics = pgTable("trending_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topic: varchar("topic").notNull(),
  platform: varchar("platform").notNull(),
  region: varchar("region").default("US"),
  rank: integer("rank").default(0),
  volume: integer("volume").default(0),
  category: varchar("category"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export const autoBlogSources = pgTable("auto_blog_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // rss, reddit, hackernews, youtube, googletrends
  url: text("url"), // RSS URL or subreddit name like "technology"
  category: varchar("category"), // Tech, Crypto, AI, Marketing
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoBlogJobs = pgTable("auto_blog_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").references(() => autoBlogSources.id, { onDelete: "set null" }),
  sourceTitle: text("source_title"),
  sourceUrl: text("source_url"),
  sourceContent: text("source_content"),
  category: varchar("category"),
  status: varchar("status").default("pending"), // pending, processing, completed, failed, published
  blogPostId: varchar("blog_post_id"),
  errorMessage: text("error_message"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const autoBloggerSettings = pgTable("auto_blogger_settings", {
  id: varchar("id").primaryKey().default("singleton"),
  enabled: boolean("enabled").default(false),
  autoPublish: boolean("auto_publish").default(false),
  aiProvider: varchar("ai_provider").default("gemini"), // gemini | openai
  model: varchar("model").default("gemini-2.5-flash"),
  toneStyle: varchar("tone_style").default("informative"),
  minWords: integer("min_words").default(700),
  maxWords: integer("max_words").default(1400),
  defaultAuthorId: varchar("default_author_id"),
  imageProvider: varchar("image_provider").default("pollinations"), // pollinations | gemini | unsplash | none
  includeTranscripts: boolean("include_transcripts").default(true),
  embedYoutube: boolean("embed_youtube").default(true),
  autopilotEnabled: boolean("autopilot_enabled").default(false),
  autopilotIntervalMinutes: integer("autopilot_interval_minutes").default(180),
  autopilotPerSource: integer("autopilot_per_source").default(1),
  lastAutopilotRunAt: timestamp("last_autopilot_run_at"),
  scheduleCron: varchar("schedule_cron"),
  humanizationPasses: integer("humanization_passes").default(0), // 0 = off, 1 = single pass, 2 = full multi-pass (humanize + polish)
  humanizationStrength: varchar("humanization_strength").default("medium"), // light | medium | heavy
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type KeywordTracker = typeof keywordTrackers.$inferSelect;
export type TrackedContent = typeof trackedContent.$inferSelect;
export type TrendingTopic = typeof trendingTopics.$inferSelect;
export type AutoBlogSource = typeof autoBlogSources.$inferSelect;
export type AutoBlogJob = typeof autoBlogJobs.$inferSelect;
export type AutoBloggerSettings = typeof autoBloggerSettings.$inferSelect;
export const insertKeywordTrackerSchema = createInsertSchema(keywordTrackers).omit({ id: true, createdAt: true, lastRefreshedAt: true });
export const insertAutoBlogSourceSchema = createInsertSchema(autoBlogSources).omit({ id: true, createdAt: true, lastRunAt: true });

// ── Page Hero Backgrounds (admin-controlled hero bg images per page) ───────
export const pageHeroBackgrounds = pgTable("page_hero_backgrounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  page: varchar("page").notNull().unique(), // 'feed' | 'shop' | 'campaigns' | etc.
  imageUrl: varchar("image_url").notNull(),
  overlayOpacity: integer("overlay_opacity").default(60), // 0-100
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPageHeroBackgroundSchema = createInsertSchema(pageHeroBackgrounds).omit({ id: true, updatedAt: true });
export type InsertPageHeroBackground = z.infer<typeof insertPageHeroBackgroundSchema>;
export type PageHeroBackground = typeof pageHeroBackgrounds.$inferSelect;

export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type AppSetting = typeof appSettings.$inferSelect;

// ── BreedSkool Tech Training ──────────────────────────────────────────────────
export const breedskoolCoursePricing = pgTable("breedskool_course_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseKey: varchar("course_key").unique().notNull(), // e.g. 'webdev', 'ai_content', 'social_monetize', 'trading'
  // Legacy imported-database fields retained for compatibility with older pricing rows.
  courseTitle: varchar("course_title"),
  priceNgn: integer("price_ngn"),
  title: varchar("title").notNull(),
  shortDescription: text("short_description"),
  regularPrice: integer("regular_price").notNull(), // NGN in kobo / whole NGN integer
  discountPrice: integer("discount_price").notNull(),
  duration: varchar("duration"),
  isActive: boolean("is_active").default(true),
  acceptedPayments: text("accepted_payments").array().default(sql`ARRAY['bank_transfer','usdt_tron','usdt_ton','usdt_bnb']`),
  linkedCourseId: varchar("linked_course_id").references(() => courses.id), // linked platform course for enrollment
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type BreedskoolCoursePricing = typeof breedskoolCoursePricing.$inferSelect;
export const insertBreedskoolCoursePricingSchema = createInsertSchema(breedskoolCoursePricing).omit({ id: true, updatedAt: true });
export type InsertBreedskoolCoursePricing = z.infer<typeof insertBreedskoolCoursePricingSchema>;

export const breedskoolRegistrations = pgTable("breedskool_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),   // linked platform account
  fullName: varchar("full_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
  location: varchar("location"),
  selectedCourseKey: varchar("selected_course_key").notNull(),
  selectedCourseTitle: varchar("selected_course_title").notNull(),
  amountNgn: integer("amount_ngn").notNull(),
  paymentOption: varchar("payment_option").notNull().default("pay_later"), // 'pay_now' | 'pay_later'
  paymentMethod: varchar("payment_method"), // 'bank_transfer' | 'usdt_tron' | 'usdt_ton' | 'usdt_bnb'
  paymentStatus: varchar("payment_status").default("pending"), // 'pending' | 'paid' | 'confirmed' | 'rejected'
  transactionRef: varchar("transaction_ref"),
  paymentProof: varchar("payment_proof"),
  currencyUsed: varchar("currency_used").default("NGN"), // 'NGN' | 'USD' | 'USDT'
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }),
  payLaterDeadline: timestamp("pay_later_deadline"),       // 48-hr payment window
  notes: text("notes"),
  deliveryMode: varchar("delivery_mode").default("online"), // 'online' | 'onsite' | 'home_lesson'
  childName: varchar("child_name"),
  childAge: varchar("child_age"),
  parentName: varchar("parent_name"),
  homeAddress: text("home_address"),
  linkedCourseId: varchar("linked_course_id"), // platform course ID auto-enrolled into
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type BreedskoolRegistration = typeof breedskoolRegistrations.$inferSelect;
export const insertBreedskoolRegistrationSchema = createInsertSchema(breedskoolRegistrations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBreedskoolRegistration = z.infer<typeof insertBreedskoolRegistrationSchema>;

// ── Referral click tracking ────────────────────────────────────────────────
export const referralClicks = pgTable("referral_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referralCode: varchar("referral_code").notNull(),
  itemType: varchar("item_type").notNull().default("user"), // 'user' | 'product' | 'course'
  itemId: varchar("item_id"),
  ip: varchar("ip"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Referral commissions — earnings from product, course, and invite referrals ──
export const referralCommissions = pgTable("referral_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").references(() => users.id),
  itemType: varchar("item_type").notNull(), // 'product' | 'course' | 'invite'
  itemId: varchar("item_id"),
  itemTitle: varchar("item_title"),
  saleAmount: decimal("sale_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending' | 'approved' | 'paid'
  referenceId: varchar("reference_id"), // purchase id, enrollment id, etc.
  referralCode: varchar("referral_code"),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
});

export type ReferralClick = typeof referralClicks.$inferSelect;
export type ReferralCommission = typeof referralCommissions.$inferSelect;

// ── Social Leads — AI Marketing Robot ────────────────────────────────────────
export const socialLeads = pgTable("social_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform").notNull(), // 'reddit' | 'hackernews'
  sourceId: varchar("source_id").notNull(), // external post/comment ID
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body"),
  url: text("url").notNull(),
  author: varchar("author"),
  subreddit: varchar("subreddit"),
  platformScore: integer("platform_score").default(0),
  commentsCount: integer("comments_count").default(0),
  relevanceScore: integer("relevance_score").default(0), // 0–100 AI score
  aiSummary: text("ai_summary"),
  suggestedReply: text("suggested_reply"),
  category: varchar("category").default("web_development"),
  urgency: varchar("urgency").default("medium"), // 'high' | 'medium' | 'low'
  status: varchar("status").default("new"), // 'new' | 'viewed' | 'replied' | 'dismissed'
  keywordsMatched: text("keywords_matched").array(),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SocialLead = typeof socialLeads.$inferSelect;
export type InsertSocialLead = typeof socialLeads.$inferInsert;
