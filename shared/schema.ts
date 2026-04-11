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
  creatorTier: varchar("creator_tier").default("rising_sparks"), // rising_sparks, growth_engines, power_influencers, global_titans
  niche: varchar("niche"), // Gaming, Fitness, Fashion, Tech, etc.
  username: varchar("username").unique(),
  bannerImageUrl: varchar("banner_image_url"),
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
  // Subscription fields
  subscriptionStatus: varchar("subscription_status").default("free"), // 'free', 'active', 'expired'
  subscriptionPlan: varchar("subscription_plan"), // 'creator_monthly', 'creator_yearly', 'brand_monthly', 'brand_yearly'
  subscriptionEndDate: timestamp("subscription_end_date"),
  // Referral system
  referralCodeCreator: varchar("referral_code_creator").unique(), // Code for inviting creators
  referralCodeBrand: varchar("referral_code_brand").unique(), // Code for inviting brands
  totalReferrals: integer("total_referrals").default(0),
  // Brand ranking (for brands): 'bronze', 'silver', 'gold'
  brandRank: varchar("brand_rank").default("bronze"),
  totalTransactionVolume: decimal("total_transaction_volume", { precision: 12, scale: 2 }).default("0.00"),
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
  totalSlots: integer("total_slots").notNull(),
  filledSlots: integer("filled_slots").default(0),
  estimatedTime: varchar("estimated_time"), // "5 min", "30 min", etc.
  requirements: text("requirements").array(),
  status: varchar("status").default("pending_payment"), // 'pending_payment', 'active', 'draft', 'completed', 'cancelled'
  paymentStatus: varchar("payment_status").default("pending"), // 'pending', 'deposited', 'approved'
  depositRequired: boolean("deposit_required").default(true),
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
  createdBy: varchar("created_by").references(() => users.id),
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
  status: varchar("status").notNull().default("pending"), // pending, paid, delivered, cancelled, refunded
  deliveryDetails: jsonb("delivery_details"), // Download links, access keys, etc.
  adminNotes: text("admin_notes"),
  paidAt: timestamp("paid_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  isRead: boolean("is_read").default(false),
  attachments: jsonb("attachments"),
  parentMessageId: uuid("parent_message_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  deadline: z.string().min(1, "Deadline is required"),
  estimatedTime: z.string().min(1, "Estimated time is required"),
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
  totalTipsReceived: decimal("total_tips_received", { precision: 10, scale: 2 }).default("0.00"),
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
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  plan: varchar("plan").notNull(), // 'creator_monthly', 'creator_yearly', 'brand_monthly', 'brand_yearly'
  status: varchar("status").notNull().default("pending"), // 'pending', 'active', 'expired', 'cancelled'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  network: varchar("network", { length: 20 }), // 'tron', 'bsc', 'ton'
  transactionHash: varchar("transaction_hash"),
  paymentProof: varchar("payment_proof"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true),
  renewalReminderSent: boolean("renewal_reminder_sent").default(false),
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

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true, likeCount: true, commentCount: true });
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
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
