import {
  users,
  campaigns,
  campaignParticipations,
  transactions,
  blogPosts,
  blogLikes,
  blogComments,
  blogCategoryFollows,
  shopProducts,
  purchases,
  productReviews,
  messages,
  taskSubmissions,
  notifications,
  paymentDeposits,
  adminWallets,
  brandWallets,
  escrowPayments,
  posts,
  postLikes,
  postComments,
  userFollows,
  userReviews,
  subscriptions,
  payoutRequests,
  payoutMessages,
  referrals,
  courses,
  courseEnrollments,
  courseReviews,
  courseComments,
  courseLikes,
  courseLessons,
  courseMessages,
  socialPlatforms,
  userSocialLinks,
  portfolioItems,
  directHireOffers,
  pushSubscriptions,
  pushNotificationCampaigns,
  pwaSettings,
  userPoints,
  welcomeTaskCompletions,
  heroSliders,
  pageContent,
  type HeroSlider,
  type InsertHeroSlider,
  type PageContent,
  type InsertPageContent,
  type PwaSettings,
  type InsertPwaSettings,
  type SocialPlatform,
  type InsertSocialPlatform,
  type UserSocialLink,
  type InsertUserSocialLink,
  type PortfolioItem,
  type InsertPortfolioItem,
  type PushNotificationCampaign,
  type User,
  type InsertUser,
  type Campaign,
  type InsertCampaign,
  type CampaignParticipation,
  type InsertCampaignParticipation,
  type Transaction,
  type InsertTransaction,
  type BlogPost,
  type InsertBlogPost,
  type BlogComment,
  type InsertBlogComment,
  type ShopProduct,
  type InsertShopProduct,
  type Purchase,
  type InsertPurchase,
  type ProductReview,
  type InsertProductReview,
  type Message,
  type InsertMessage,
  type TaskSubmission,
  type InsertTaskSubmission,
  type Notification,
  type InsertNotification,
  type PaymentDeposit,
  type InsertPaymentDeposit,
  type AdminWallet,
  type InsertAdminWallet,
  type BrandWallet,
  type InsertBrandWallet,
  type Post,
  type PostComment,
  type UserReview,
  type Subscription,
  type PayoutRequest,
  type PayoutMessage,
  type Referral,
  type Course,
  type InsertCourse,
  type CourseEnrollment,
  type CourseReview,
  type CourseComment,
  paymentMethods,
  platformSettings,
  type PaymentMethod,
  type InsertPaymentMethod,
  siteContent,
  type SiteContent,
  type InsertSiteContent,
  paymentFeatureToggles,
  sponsoredAds,
  advertiseApplications,
  emailSettings,
  emailTemplates,
  emailCampaigns,
  emailAutoResponders,
  emailLogs,
  blogTips,
  type BlogTip,
  type InsertBlogTip,
  leaderboardRewards,
  leaderboardGiveaways,
  type LeaderboardReward,
  type InsertLeaderboardReward,
  type LeaderboardGiveaway,
  type InsertLeaderboardGiveaway,
  socialQuickTasks,
  siteSocialLinks,
  userSocialTaskCompletions,
  type SocialQuickTask,
  type InsertSocialQuickTask,
  type SiteSocialLink,
  type InsertSiteSocialLink,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ne, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations for custom authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  resetUserPassword(id: string, newPassword: string): Promise<void>;
  getCreators(): Promise<User[]>;
  
  // Campaign operations
  getAllCampaigns(): Promise<Campaign[]>;
  getCampaignById(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: string): Promise<void>;
  
  // Campaign participation operations
  getCampaignParticipations(campaignId: string): Promise<CampaignParticipation[]>;
  getUserParticipations(userId: string): Promise<CampaignParticipation[]>;
  createParticipation(participation: InsertCampaignParticipation): Promise<CampaignParticipation>;
  updateParticipation(id: string, updates: Partial<InsertCampaignParticipation>): Promise<CampaignParticipation>;
  
  // Transaction operations
  getUserTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getAllUsers(): Promise<User[]>;
  getAllCampaigns(): Promise<Campaign[]>;
  getAllTransactions(): Promise<Transaction[]>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction>;
  updateTransactionStatus(transactionId: string, status: string): Promise<void>;
  updateUserVerification(userId: string, verified: boolean): Promise<void>;
  
  // Blog operations
  getAllBlogPosts(): Promise<BlogPost[]>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;
  
  // Shop operations
  getAllShopProducts(): Promise<ShopProduct[]>;
  getFeaturedProducts(): Promise<ShopProduct[]>;
  getProductsByCategory(category: string): Promise<ShopProduct[]>;
  getShopProductById(id: string): Promise<ShopProduct | undefined>;
  createShopProduct(product: InsertShopProduct): Promise<ShopProduct>;
  updateShopProduct(id: string, updates: Partial<InsertShopProduct>): Promise<ShopProduct>;
  deleteShopProduct(id: string): Promise<void>;
  
  // Purchase operations
  getAllPurchases(): Promise<Purchase[]>;
  getUserPurchases(userId: string): Promise<Purchase[]>;
  getPurchaseById(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, updates: Partial<InsertPurchase>): Promise<Purchase>;
  
  // Product review operations
  getProductReviews(productId: string): Promise<ProductReview[]>;
  createProductReview(review: InsertProductReview): Promise<ProductReview>;
  updateProductReview(id: string, updates: Partial<InsertProductReview>): Promise<ProductReview>;
  
  // Message operations
  getUserMessages(userId: string): Promise<Message[]>;
  getCampaignMessages(campaignId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string): Promise<void>;
  
  // Task submission operations
  getUserTaskSubmissions(userId: string): Promise<TaskSubmission[]>;
  getCampaignTaskSubmissions(campaignId: string): Promise<TaskSubmission[]>;
  createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission>;
  updateTaskSubmission(id: string, updates: Partial<InsertTaskSubmission>): Promise<TaskSubmission>;
  getTaskSubmission(id: string): Promise<TaskSubmission | undefined>;
  approveTaskSubmission(id: string, reviewedBy: string, notes?: string): Promise<TaskSubmission>;
  rejectTaskSubmission(id: string, reviewedBy: string, notes: string): Promise<TaskSubmission>;
  
  // Notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  
  // Wallet and payment operations
  updateUserBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<User>;
  approvePayment(transactionId: string, approvedBy: string): Promise<Transaction>;

  // Admin wallet operations
  getActiveAdminWallets(): Promise<AdminWallet[]>;

  // Payment methods (unified: crypto, bank, paypal, paystack, stripe)
  getAllPaymentMethods(): Promise<PaymentMethod[]>;
  getActivePaymentMethods(feature?: string): Promise<PaymentMethod[]>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: string): Promise<void>;
  getPlatformSetting(key: string): Promise<string | null>;
  setPlatformSetting(key: string, value: string): Promise<void>;

  // Social feed operations
  getFeed(limit?: number, offset?: number): Promise<(Post & { user: Partial<User> })[]>;
  getSpotlightPosts(): Promise<(Post & { user: Partial<User> })[]>;
  setPostSpotlight(id: string, isSpotlight: boolean, isSponsored: boolean): Promise<Post>;
  getUserPosts(userId: string): Promise<Post[]>;
  createPost(id: string, userId: string, content: string, imageUrl?: string, videoUrl?: string): Promise<Post>;
  updatePost(id: string, userId: string, updates: { content?: string; imageUrl?: string; videoUrl?: string }): Promise<Post>;
  incrementPostViews(ids: string[]): Promise<void>;
  deletePost(id: string, userId: string, isAdmin?: boolean): Promise<void>;
  likePost(postId: string, userId: string): Promise<void>;
  unlikePost(postId: string, userId: string): Promise<void>;
  getPostLike(postId: string, userId: string): Promise<boolean>;
  getPostComments(postId: string): Promise<(PostComment & { user: Partial<User> })[]>;
  addPostComment(id: string, postId: string, userId: string, content: string, parentId?: string): Promise<PostComment>;
  addPostTip(postId: string, amount: number): Promise<void>;

  // User reviews
  getUserReviews(userId: string): Promise<(UserReview & { reviewer: Partial<User> })[]>;
  createUserReview(review: { revieweeId: string; reviewerId: string; rating: number; comment?: string }): Promise<UserReview>;

  // Subscriptions
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(sub: { userId: string; plan: string; amount: number; network: string; transactionHash?: string; paymentProof?: string }): Promise<Subscription>;
  updateSubscriptionStatus(id: string, status: string, startDate?: Date, endDate?: Date): Promise<Subscription>;
  getExpiredSubscriptions(): Promise<Subscription[]>;

  // Payout requests
  getUserPayoutRequests(userId: string): Promise<PayoutRequest[]>;
  getAllPayoutRequests(): Promise<(PayoutRequest & { user: Partial<User> })[]>;
  createPayoutRequest(req: { userId: string; amount: number; network: string; walletAddress: string }): Promise<PayoutRequest>;
  updatePayoutRequest(id: string, updates: Partial<PayoutRequest>): Promise<PayoutRequest>;
  getPayoutMessages(payoutRequestId: string): Promise<(PayoutMessage & { sender: Partial<User> })[]>;
  createPayoutMessage(payoutRequestId: string, senderId: string, content: string): Promise<PayoutMessage>;

  // Referrals
  getReferralsByReferrer(referrerId: string): Promise<Referral[]>;
  getReferralByReferredId(referredId: string): Promise<Referral | undefined>;
  createReferral(ref: { referrerId: string; referredId: string; referralType: string; referralCode: string }): Promise<Referral>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  getTopCreatorsByReferrals(limit?: number): Promise<any[]>;
  getTopCreatorsByActivity(limit?: number): Promise<any[]>;
  getAdminUser(): Promise<User | undefined>;
  getReferralStats(): Promise<any>;

  // Followers
  getUserFollowers(userId: string): Promise<User[]>;
  getUserFollowing(userId: string): Promise<User[]>;
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Blog interaction operations
  getBlogPostById(id: string): Promise<BlogPost | undefined>;
  incrementBlogViews(postId: string): Promise<void>;
  getBlogLike(postId: string, userId: string): Promise<boolean>;
  likeBlogPost(postId: string, userId: string): Promise<void>;
  unlikeBlogPost(postId: string, userId: string): Promise<void>;
  getBlogComments(postId: string): Promise<(BlogComment & { user: Partial<User> })[]>;
  addBlogComment(postId: string, userId: string, content: string, parentId?: string): Promise<BlogComment>;
  getBlogCategoryFollow(userId: string, category: string): Promise<boolean>;
  followBlogCategory(userId: string, category: string): Promise<void>;
  unfollowBlogCategory(userId: string, category: string): Promise<void>;
  getBlogPostsByCategory(category: string): Promise<BlogPost[]>;
  createBlogTip(tip: InsertBlogTip): Promise<BlogTip>;
  getBlogTipsByPostId(postId: string): Promise<BlogTip[]>;

  // Leaderboard rewards & giveaways
  getActiveLeaderboardRewards(leaderboardType?: string): Promise<LeaderboardReward[]>;
  createLeaderboardReward(data: InsertLeaderboardReward): Promise<LeaderboardReward>;
  updateLeaderboardReward(id: string, data: Partial<InsertLeaderboardReward>): Promise<LeaderboardReward>;
  deleteLeaderboardReward(id: string): Promise<void>;
  getActiveLeaderboardGiveaways(): Promise<LeaderboardGiveaway[]>;
  createLeaderboardGiveaway(data: InsertLeaderboardGiveaway): Promise<LeaderboardGiveaway>;
  updateLeaderboardGiveaway(id: string, data: Partial<InsertLeaderboardGiveaway>): Promise<LeaderboardGiveaway>;
  deleteLeaderboardGiveaway(id: string): Promise<void>;

  // Social Quick Tasks
  getSocialQuickTasks(activeOnly?: boolean): Promise<SocialQuickTask[]>;
  createSocialQuickTask(data: InsertSocialQuickTask): Promise<SocialQuickTask>;
  updateSocialQuickTask(id: string, data: Partial<InsertSocialQuickTask>): Promise<SocialQuickTask>;
  deleteSocialQuickTask(id: string): Promise<void>;
  getUserSocialTaskCompletions(userId: string): Promise<string[]>;
  completeSocialQuickTask(userId: string, taskId: string): Promise<void>;

  // Site Social Links
  getSiteSocialLinks(activeOnly?: boolean): Promise<SiteSocialLink[]>;
  createSiteSocialLink(data: InsertSiteSocialLink): Promise<SiteSocialLink>;
  updateSiteSocialLink(id: string, data: Partial<InsertSiteSocialLink>): Promise<SiteSocialLink>;
  deleteSiteSocialLink(id: string): Promise<void>;

  // Admin all transactions
  getAllTransactionsPaginated(limit?: number, offset?: number): Promise<(Transaction & { user?: Partial<User> })[]>;

  getAllCreators(): Promise<User[]>;

  // BreedSkool course operations
  getAllCourses(publishedOnly?: boolean): Promise<(Course & { instructor: Partial<User> })[]>;
  getCourseById(id: string): Promise<(Course & { instructor: Partial<User> }) | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getCourseEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined>;
  getMyEnrollments(userId: string): Promise<(CourseEnrollment & { course: Course })[]>;
  getAllEnrollments(): Promise<(CourseEnrollment & { course: Partial<Course>; user: Partial<User> })[]>;
  createEnrollment(data: { courseId: string; userId: string; isFree: boolean; paymentMethod?: string; paymentProof?: string; transactionHash?: string; amount?: string }): Promise<CourseEnrollment>;
  approveEnrollment(id: string, approvedBy: string): Promise<CourseEnrollment>;
  getCourseReviews(courseId: string): Promise<(CourseReview & { user: Partial<User> })[]>;
  createCourseReview(data: { courseId: string; userId: string; rating: number; comment?: string }): Promise<CourseReview>;
  getCourseComments(courseId: string): Promise<(CourseComment & { user: Partial<User> })[]>;
  createCourseComment(data: { courseId: string; userId: string; content: string; parentId?: string }): Promise<CourseComment>;
  getCourseLike(courseId: string, userId: string): Promise<boolean>;
  toggleCourseLike(courseId: string, userId: string): Promise<boolean>;
  // Lessons
  getLessonsByCourse(courseId: string): Promise<any[]>;
  createLesson(data: { courseId: string; title: string; description?: string; videoUrl?: string; videoLink?: string; content?: string; order?: number; lessonFiles?: any[]; isPreview?: boolean }): Promise<any>;
  updateLesson(lessonId: string, updates: any): Promise<any>;
  deleteLesson(lessonId: string): Promise<void>;
  // Course chat
  getCourseMessages(courseId: string): Promise<any[]>;
  createCourseMessage(data: { courseId: string; senderId: string; message: string }): Promise<any>;

  // Social platforms
  getAllSocialPlatforms(): Promise<SocialPlatform[]>;
  getActiveSocialPlatforms(): Promise<SocialPlatform[]>;
  createSocialPlatform(data: InsertSocialPlatform): Promise<SocialPlatform>;
  updateSocialPlatform(id: string, data: Partial<InsertSocialPlatform>): Promise<SocialPlatform>;
  deleteSocialPlatform(id: string): Promise<void>;

  // User social links
  getUserSocialLinks(userId: string): Promise<UserSocialLink[]>;
  upsertUserSocialLink(data: { userId: string; platformSlug: string; url: string; followerCount: number }): Promise<UserSocialLink>;
  deleteUserSocialLink(id: string): Promise<void>;
  replaceUserSocialLinks(userId: string, links: any[]): Promise<void>;

  // Portfolio items
  getUserPortfolio(userId: string): Promise<PortfolioItem[]>;
  createPortfolioItem(data: InsertPortfolioItem): Promise<PortfolioItem>;
  updatePortfolioItem(id: string, data: Partial<InsertPortfolioItem>): Promise<PortfolioItem>;
  deletePortfolioItem(id: string): Promise<void>;

  // Push notifications
  savePushSubscription(data: { userId: string; endpoint: string; keys: any; userAgent?: string }): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  getUserPushSubscriptions(userId: string): Promise<any[]>;
  getAllPushSubscriptions(targetType?: string): Promise<any[]>;
  getAllPushNotificationCampaigns(): Promise<PushNotificationCampaign[]>;
  createPushNotificationCampaign(data: { title: string; body: string; icon?: string; clickUrl?: string; targetType: string; createdBy: string }): Promise<PushNotificationCampaign>;
  updatePushNotificationCampaign(id: string, data: Partial<PushNotificationCampaign>): Promise<PushNotificationCampaign>;
  deletePushNotificationCampaign(id: string): Promise<void>;

  // Payment feature toggles
  getPaymentFeatureToggles(): Promise<any[]>;
  upsertPaymentFeatureToggle(paymentMethodId: string, feature: string, isEnabled: boolean): Promise<any>;

  // Sponsored ads
  getAllSponsoredAds(): Promise<any[]>;
  getActiveSponsoredAds(placement?: string): Promise<any[]>;
  createSponsoredAd(data: any): Promise<any>;
  updateSponsoredAd(id: string, data: any): Promise<any>;
  deleteSponsoredAd(id: string): Promise<void>;
  incrementAdImpressions(id: string): Promise<void>;
  incrementAdClicks(id: string): Promise<void>;

  // Advertise applications
  getAllAdvertiseApplications(): Promise<any[]>;
  createAdvertiseApplication(data: any): Promise<any>;
  updateAdvertiseApplication(id: string, data: any): Promise<any>;

  // $TDRIP Points system
  getUserPoints(userId: string): Promise<any[]>;
  awardPoints(userId: string, actionType: string, points: number, description?: string, referenceId?: string): Promise<any>;
  getUserTotalPoints(userId: string): Promise<number>;
  getTopUsersByPoints(limit?: number): Promise<any[]>;
  computeAndUpdateLevel(userId: string): Promise<string>;
  getLeaderboardByPoints(limit?: number): Promise<any[]>;

  // Welcome campaign
  getWelcomeTaskCompletions(userId: string): Promise<any[]>;
  completeWelcomeTask(userId: string, taskKey: string): Promise<any>;
  hasCompletedWelcomeTask(userId: string, taskKey: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  async getAllParticipations(): Promise<CampaignParticipation[]> {
    return await db.select().from(campaignParticipations).orderBy(desc(campaignParticipations.createdAt));
  }

  // Campaign operations
  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.isActive, true)).orderBy(desc(campaigns.createdAt));
  }

  async getCampaignById(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<InsertCampaign>): Promise<Campaign> {
    // Convert reward to string if it's a number
    const safeUpdates = {
      ...updates,
      reward: typeof updates.reward === 'number' ? updates.reward.toString() : updates.reward,
      updatedAt: new Date()
    };
    
    const [updatedCampaign] = await db
      .update(campaigns)
      .set(safeUpdates)
      .where(eq(campaigns.id, id))
      .returning();
    
    if (!updatedCampaign) {
      throw new Error("Campaign not found");
    }
    
    return updatedCampaign;
  }

  async deleteCampaign(id: string): Promise<void> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    if (result.rowCount === 0) {
      throw new Error("Campaign not found");
    }
  }

  // Campaign participation operations
  async getCampaignParticipations(campaignId: string): Promise<CampaignParticipation[]> {
    return await db.select().from(campaignParticipations).where(eq(campaignParticipations.campaignId, campaignId));
  }

  async getUserParticipations(userId: string): Promise<CampaignParticipation[]> {
    return await db.select().from(campaignParticipations).where(eq(campaignParticipations.userId, userId)).orderBy(desc(campaignParticipations.createdAt));
  }

  async createParticipation(participation: InsertCampaignParticipation): Promise<CampaignParticipation> {
    const [newParticipation] = await db.insert(campaignParticipations).values(participation).returning();
    return newParticipation;
  }

  async updateParticipation(id: string, updates: Partial<InsertCampaignParticipation>): Promise<CampaignParticipation> {
    const [updatedParticipation] = await db
      .update(campaignParticipations)
      .set(updates)
      .where(eq(campaignParticipations.id, id))
      .returning();
    return updatedParticipation;
  }

  async getParticipationById(id: string): Promise<CampaignParticipation | null> {
    const [participation] = await db.select().from(campaignParticipations).where(eq(campaignParticipations.id, id));
    return participation || null;
  }

  // Transaction operations
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Return empty array if there's a database issue
      return [];
    }
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async updateTransactionStatus(transactionId: string, status: string): Promise<void> {
    await db.update(transactions)
      .set({ status })
      .where(eq(transactions.id, transactionId));
  }

  async updateUserVerification(userId: string, verified: boolean): Promise<void> {
    await db.update(users)
      .set({ isVerified: verified })
      .where(eq(users.id, userId));
  }

  // Escrow payment operations
  async createEscrowPayment(payment: any): Promise<any> {
    const [newPayment] = await db.insert(escrowPayments).values(payment).returning();
    return newPayment;
  }

  async getEscrowPaymentByCampaignId(campaignId: string): Promise<any> {
    const [payment] = await db.select().from(escrowPayments).where(eq(escrowPayments.campaignId, campaignId));
    return payment;
  }

  async getAllEscrowPayments(): Promise<any[]> {
    return await db.select().from(escrowPayments).orderBy(desc(escrowPayments.createdAt));
  }

  async getEscrowPaymentById(id: string): Promise<any> {
    const [payment] = await db.select().from(escrowPayments).where(eq(escrowPayments.id, id));
    return payment;
  }

  async getAllCampaignsAdmin(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async updateEscrowPayment(id: string, updates: any): Promise<any> {
    const [updatedPayment] = await db
      .update(escrowPayments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(escrowPayments.id, id))
      .returning();
    return updatedPayment;
  }

  // Blog operations
  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).where(eq(blogPosts.isPublished, true)).orderBy(desc(blogPosts.publishedAt));
  }

  async getAllBlogPostsAdmin(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [newPost] = await db.insert(blogPosts).values(post).returning();
    return newPost;
  }

  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updatedPost] = await db
      .update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updatedPost;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    // Delete in dependency order to avoid FK violations
    await db.delete(postComments).where(eq(postComments.userId, id));
    await db.delete(postLikes).where(eq(postLikes.userId, id));
    await db.delete(posts).where(eq(posts.userId, id));
    await db.delete(productReviews).where(eq(productReviews.userId, id));
    await db.delete(purchases).where(eq(purchases.userId, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(taskSubmissions).where(eq(taskSubmissions.userId, id));
    await db.delete(campaignParticipations).where(eq(campaignParticipations.userId, id));
    await db.delete(transactions).where(eq(transactions.userId, id));
    // Messages: delete where sender or receiver
    await db.execute(sql`DELETE FROM messages WHERE sender_id = ${id} OR receiver_id = ${id}`);
    await db.delete(escrowPayments).where(eq(escrowPayments.brandId, id));
    await db.delete(paymentDeposits).where(eq(paymentDeposits.brandId, id));
    await db.delete(brandWallets).where(eq(brandWallets.brandId, id));
    // Delete user's campaigns (and their participations first)
    const userCampaigns = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.brandId, id));
    for (const c of userCampaigns) {
      await db.delete(campaignParticipations).where(eq(campaignParticipations.campaignId, c.id));
    }
    await db.delete(campaigns).where(eq(campaigns.brandId, id));
    await db.delete(blogPosts).where(eq(blogPosts.authorId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getCreators(): Promise<User[]> {
    return await db.select().from(users)
      .where(eq(users.userType, 'creator'))
      .orderBy(desc(users.totalFollowers));
  }

  // Shop operations
  async getAllShopProducts(): Promise<ShopProduct[]> {
    return await db.select().from(shopProducts).where(eq(shopProducts.isActive, true)).orderBy(desc(shopProducts.createdAt));
  }

  async getShopProductById(id: string): Promise<ShopProduct | undefined> {
    const [product] = await db.select().from(shopProducts).where(eq(shopProducts.id, id));
    return product;
  }

  async getFeaturedProducts(): Promise<ShopProduct[]> {
    return await db.select().from(shopProducts)
      .where(and(eq(shopProducts.isActive, true), eq(shopProducts.isFeatured, true)))
      .orderBy(desc(shopProducts.createdAt));
  }

  async getProductsByCategory(category: string): Promise<ShopProduct[]> {
    return await db.select().from(shopProducts)
      .where(and(eq(shopProducts.isActive, true), eq(shopProducts.category, category)))
      .orderBy(desc(shopProducts.createdAt));
  }

  async createShopProduct(product: InsertShopProduct): Promise<ShopProduct> {
    const [newProduct] = await db.insert(shopProducts).values(product).returning();
    return newProduct;
  }

  async updateShopProduct(id: string, updates: Partial<InsertShopProduct>): Promise<ShopProduct> {
    const [updatedProduct] = await db
      .update(shopProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shopProducts.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteShopProduct(id: string): Promise<void> {
    await db.delete(shopProducts).where(eq(shopProducts.id, id));
  }

  // Purchase operations
  async getAllPurchases(): Promise<Purchase[]> {
    return await db.select().from(purchases).orderBy(desc(purchases.createdAt));
  }

  async getUserPurchases(userId: string): Promise<any[]> {
    const rows = await db
      .select({
        purchase: purchases,
        product: { id: shopProducts.id, title: shopProducts.title, imageUrl: shopProducts.imageUrl, category: shopProducts.category }
      })
      .from(purchases)
      .leftJoin(shopProducts, eq(purchases.productId, shopProducts.id))
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
    return rows.map(r => ({ ...r.purchase, product: r.product }));
  }

  async getPurchaseById(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async updatePurchase(id: string, updates: Partial<InsertPurchase>): Promise<Purchase> {
    const [updatedPurchase] = await db
      .update(purchases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning();
    return updatedPurchase;
  }

  // Product review operations
  async getProductReviews(productId: string): Promise<ProductReview[]> {
    return await db.select().from(productReviews)
      .where(eq(productReviews.productId, productId))
      .orderBy(desc(productReviews.createdAt));
  }

  async createProductReview(review: InsertProductReview): Promise<ProductReview> {
    const [newReview] = await db.insert(productReviews).values(review).returning();
    return newReview;
  }

  async updateProductReview(id: string, updates: Partial<InsertProductReview>): Promise<ProductReview> {
    const [updatedReview] = await db
      .update(productReviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productReviews.id, id))
      .returning();
    return updatedReview;
  }

  // Message operations
  async getUserMessages(userId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
      .orderBy(desc(messages.createdAt));
  }

  async getCampaignMessages(campaignId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.campaignId, campaignId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesByReference(referenceType: string, referenceId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.referenceType, referenceType), eq(messages.referenceId, referenceId)))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  // Task submission operations
  async getUserTaskSubmissions(userId: string): Promise<TaskSubmission[]> {
    return await db
      .select()
      .from(taskSubmissions)
      .where(eq(taskSubmissions.userId, userId))
      .orderBy(desc(taskSubmissions.createdAt));
  }

  async getCampaignTaskSubmissions(campaignId: string): Promise<TaskSubmission[]> {
    return await db
      .select()
      .from(taskSubmissions)
      .where(eq(taskSubmissions.campaignId, campaignId))
      .orderBy(desc(taskSubmissions.createdAt));
  }

  async createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission> {
    const [newSubmission] = await db
      .insert(taskSubmissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async updateTaskSubmission(id: string, updates: Partial<InsertTaskSubmission>): Promise<TaskSubmission> {
    const [updated] = await db
      .update(taskSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(taskSubmissions.id, id))
      .returning();
    return updated;
  }

  async getTaskSubmission(id: string): Promise<TaskSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(taskSubmissions)
      .where(eq(taskSubmissions.id, id))
      .limit(1);
    return submission;
  }

  async approveTaskSubmission(id: string, reviewedBy: string, notes?: string): Promise<TaskSubmission> {
    const [approved] = await db
      .update(taskSubmissions)
      .set({
        status: 'approved',
        approvedForPayment: true,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(taskSubmissions.id, id))
      .returning();
    return approved;
  }

  async rejectTaskSubmission(id: string, reviewedBy: string, notes: string): Promise<TaskSubmission> {
    const [rejected] = await db
      .update(taskSubmissions)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(taskSubmissions.id, id))
      .returning();
    return rejected;
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));
  }

  // Wallet and payment operations
  async updateUserBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const currentBalance = parseFloat(user.availableBalance || '0');
    const newBalance = type === 'add' 
      ? currentBalance + amount 
      : Math.max(0, currentBalance - amount);

    const [updated] = await db
      .update(users)
      .set({ 
        availableBalance: newBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async approvePayment(transactionId: string, approvedBy: string): Promise<Transaction> {
    const [approved] = await db
      .update(transactions)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
      .returning();

    // Update user balance if it's a campaign reward
    if (approved.type === 'campaign_reward' && approved.userId) {
      await this.updateUserBalance(approved.userId, parseFloat(approved.amount), 'add');
    }

    return approved;
  }

  // Brand-specific methods
  async getCampaignsByBrand(brandId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.brandId, brandId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getBrandTaskSubmissions(brandId: string): Promise<any[]> {
    return await db
      .select({
        id: taskSubmissions.id,
        campaignId: taskSubmissions.campaignId,
        userId: taskSubmissions.userId,
        title: taskSubmissions.title,
        description: taskSubmissions.description,
        status: taskSubmissions.status,
        submittedAt: taskSubmissions.submittedAt,
        reviewedAt: taskSubmissions.reviewedAt,
        reviewNotes: taskSubmissions.reviewNotes,
        campaign: {
          id: campaigns.id,
          title: campaigns.title,
        },
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(taskSubmissions)
      .innerJoin(campaigns, eq(taskSubmissions.campaignId, campaigns.id))
      .innerJoin(users, eq(taskSubmissions.userId, users.id))
      .where(eq(campaigns.brandId, brandId))
      .orderBy(desc(taskSubmissions.submittedAt));
  }

  async getBrandStats(brandId: string): Promise<any> {
    const totalCampaigns = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.brandId, brandId));

    const activeCampaigns = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(and(eq(campaigns.brandId, brandId), eq(campaigns.status, 'active')));

    const totalCreators = await db
      .select({ count: sql<number>`count(distinct ${campaignParticipations.userId})` })
      .from(campaignParticipations)
      .innerJoin(campaigns, eq(campaignParticipations.campaignId, campaigns.id))
      .where(eq(campaigns.brandId, brandId));

    // Total spent = sum of approved campaign_reward transactions for this brand's campaigns
    const brandCampaignIds = await db
      .select({ id: campaigns.id, reward: campaigns.reward, filledSlots: campaigns.filledSlots, totalSlots: campaigns.totalSlots })
      .from(campaigns)
      .where(eq(campaigns.brandId, brandId));

    const totalAllocated = brandCampaignIds.reduce((sum, c) => sum + (parseFloat(String(c.reward)) * (c.totalSlots || 0)), 0);

    // Accurate spent: sum of all approved campaign_reward transactions for this brand's campaigns
    let totalSpent = 0;
    if (brandCampaignIds.length > 0) {
      const campaignIdList = brandCampaignIds.map(c => c.id);
      const rewardTxns = await db
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'campaign_reward'),
            eq(transactions.status, 'approved'),
            inArray(transactions.campaignId, campaignIdList),
          )
        );
      totalSpent = rewardTxns.reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
    }

    const pendingSubmissions = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskSubmissions)
      .innerJoin(campaigns, eq(taskSubmissions.campaignId, campaigns.id))
      .where(and(eq(campaigns.brandId, brandId), eq(taskSubmissions.status, 'submitted')));

    return {
      totalCampaigns: totalCampaigns[0]?.count || 0,
      activeCampaigns: activeCampaigns[0]?.count || 0,
      totalCreators: totalCreators[0]?.count || 0,
      totalSpent,
      totalAllocated,
      pendingSubmissions: pendingSubmissions[0]?.count || 0,
      averageRating: 4.8,
    };
  }

  async getBrandCampaignApplications(brandId: string): Promise<any[]> {
    try {
      // First, get all campaigns for this brand
      const brandCampaigns = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.brandId, brandId));

      if (brandCampaigns.length === 0) {
        return [];
      }

      const results = [];
      for (const campaign of brandCampaigns) {
        // Get all participations for this campaign
        const participations = await db
          .select()
          .from(campaignParticipations)
          .where(eq(campaignParticipations.campaignId, campaign.id))
          .orderBy(desc(campaignParticipations.createdAt));

        for (const participation of participations) {
          // Get user details
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, participation.userId))
            .limit(1);

          if (user[0]) {
            results.push({
              id: participation.id,
              userId: participation.userId,
              campaignId: participation.campaignId,
              status: participation.status,
              submissionText: participation.submissionText,
              submissionUrl: participation.submissionUrl,
              submittedAt: participation.submittedAt,
              reviewedAt: participation.reviewedAt,
              adminNotes: participation.adminNotes,
              createdAt: participation.createdAt,
              campaign: {
                id: campaign.id,
                title: campaign.title,
                reward: campaign.reward,
              },
              user: {
                id: user[0].id,
                firstName: user[0].firstName,
                lastName: user[0].lastName,
                email: user[0].email,
                profileImage: user[0].profileImageUrl,
                location: user[0].location,
              }
            });
          }
        }
      }

      return results.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching brand campaign applications:', error);
      return [];
    }
  }

  async getBrandCampaigns(brandId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.brandId, brandId))
      .orderBy(desc(campaigns.createdAt));
  }

  // Payment deposit operations
  async createPaymentDeposit(deposit: any): Promise<PaymentDeposit> {
    const [newDeposit] = await db
      .insert(paymentDeposits)
      .values(deposit)
      .returning();
    return newDeposit;
  }

  async getPaymentDepositById(id: string): Promise<PaymentDeposit | undefined> {
    const [deposit] = await db
      .select()
      .from(paymentDeposits)
      .where(eq(paymentDeposits.id, id));
    return deposit;
  }

  async getPaymentDepositsByCampaign(campaignId: string): Promise<PaymentDeposit[]> {
    return await db
      .select()
      .from(paymentDeposits)
      .where(eq(paymentDeposits.campaignId, campaignId));
  }

  async updatePaymentDepositStatus(id: string, status: string, adminNotes?: string): Promise<PaymentDeposit> {
    const [updated] = await db
      .update(paymentDeposits)
      .set({ 
        status, 
        adminNotes,
        approvedAt: status === 'approved' ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(paymentDeposits.id, id))
      .returning();
    return updated;
  }

  // Admin wallet operations
  async getAllAdminWallets(): Promise<AdminWallet[]> {
    return await db
      .select()
      .from(adminWallets)
      .where(eq(adminWallets.isActive, true));
  }

  async getAdminWalletsByPurpose(purpose: string): Promise<AdminWallet[]> {
    return await db
      .select()
      .from(adminWallets)
      .where(and(
        eq(adminWallets.purpose, purpose),
        eq(adminWallets.isActive, true)
      ));
  }

  async createAdminWallet(wallet: InsertAdminWallet): Promise<AdminWallet> {
    const [newWallet] = await db
      .insert(adminWallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  // Brand wallet operations
  async getBrandWallet(brandId: string): Promise<BrandWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(brandWallets)
      .where(eq(brandWallets.brandId, brandId));
    return wallet;
  }

  async createBrandWallet(wallet: InsertBrandWallet): Promise<BrandWallet> {
    const [newWallet] = await db
      .insert(brandWallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async updateBrandWalletBalance(brandId: string, updates: any): Promise<BrandWallet> {
    const [updated] = await db
      .update(brandWallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandWallets.brandId, brandId))
      .returning();
    return updated;
  }

  // Admin user management operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getActiveAdminWallets(): Promise<AdminWallet[]> {
    return await db.select().from(adminWallets).where(eq(adminWallets.isActive, true));
  }

  async getFeed(limit = 20, offset = 0): Promise<(Post & { user: Partial<User> })[]> {
    const feedPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const result: (Post & { user: Partial<User> })[] = [];
    for (const post of feedPosts) {
      const [u] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
        creatorTier: users.creatorTier,
        niche: users.niche,
        isVerified: users.isVerified,
        totalFollowers: users.totalFollowers,
        userType: users.userType,
        role: users.role,
        totalPoints: users.totalPoints,
        level: users.level,
      }).from(users).where(eq(users.id, post.userId));
      result.push({ ...post, user: u || {} });
    }
    return result;
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return await db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
  }

  async createPost(id: string, userId: string, content: string, imageUrl?: string, videoUrl?: string): Promise<Post> {
    const [post] = await db.insert(posts).values({
      id, userId, content, imageUrl: imageUrl || null, videoUrl: videoUrl || null,
    }).returning();
    return post;
  }

  async updatePost(id: string, userId: string, updates: { content?: string; imageUrl?: string; videoUrl?: string }): Promise<Post> {
    const [post] = await db.update(posts).set({ ...updates, updatedAt: new Date() })
      .where(and(eq(posts.id, id), eq(posts.userId, userId))).returning();
    return post;
  }

  async setPostSpotlight(id: string, isSpotlight: boolean, isSponsored: boolean): Promise<Post> {
    const [post] = await db.update(posts).set({ isSpotlight, isSponsored, updatedAt: new Date() } as any)
      .where(eq(posts.id, id)).returning();
    return post;
  }

  async getSpotlightPosts(): Promise<(Post & { user: Partial<User> })[]> {
    const spotlightPosts = await db.select().from(posts)
      .where(eq(posts.isSpotlight as any, true))
      .orderBy(desc(posts.createdAt))
      .limit(10);
    const result: (Post & { user: Partial<User> })[] = [];
    for (const post of spotlightPosts) {
      const [u] = await db.select({
        id: users.id, firstName: users.firstName, lastName: users.lastName,
        username: users.username, profileImageUrl: users.profileImageUrl,
        creatorTier: users.creatorTier, niche: users.niche,
        isVerified: users.isVerified, totalFollowers: users.totalFollowers,
        userType: users.userType, role: users.role,
        totalPoints: users.totalPoints, level: users.level,
      }).from(users).where(eq(users.id, post.userId));
      result.push({ ...post, user: u || {} });
    }
    return result;
  }

  async incrementPostViews(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(posts).set({
      viewCount: sql`COALESCE(${posts.viewCount}, 0) + 1`,
    }).where(inArray(posts.id, ids));
  }

  async addPostTip(postId: string, amount: number): Promise<void> {
    await db.update(posts).set({
      totalTipsReceived: sql`COALESCE(${posts.totalTipsReceived}, 0) + ${amount}`,
    }).where(eq(posts.id, postId));
  }

  async deletePost(id: string, userId: string, isAdmin = false): Promise<void> {
    if (isAdmin) {
      await db.delete(posts).where(eq(posts.id, id));
    } else {
      await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, userId)));
    }
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const { nanoid } = await import('nanoid');
    const id = nanoid();
    await db.insert(postLikes).values({ id, postId, userId });
    await db.update(posts).set({ likeCount: sql`${posts.likeCount} + 1` }).where(eq(posts.id, postId));
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    await db.update(posts).set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` }).where(eq(posts.id, postId));
  }

  async getPostLike(postId: string, userId: string): Promise<boolean> {
    const [like] = await db.select().from(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    return !!like;
  }

  async getPostComments(postId: string): Promise<(PostComment & { user: Partial<User>; replies?: any[] })[]> {
    const allComments = await db.select().from(postComments).where(eq(postComments.postId, postId)).orderBy(postComments.createdAt);
    const enriched: (PostComment & { user: Partial<User>; replies: any[] })[] = [];
    for (const comment of allComments) {
      const [u] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
        userType: users.userType,
        isVerified: users.isVerified,
      }).from(users).where(eq(users.id, comment.userId));
      enriched.push({ ...comment, user: u || {}, replies: [] });
    }
    // Build tree: attach replies to parent comments
    const topLevel = enriched.filter(c => !c.parentId);
    const replies = enriched.filter(c => !!c.parentId);
    replies.forEach(reply => {
      const parent = topLevel.find(c => c.id === reply.parentId);
      if (parent) parent.replies.push(reply);
    });
    return topLevel;
  }

  async addPostComment(id: string, postId: string, userId: string, content: string, parentId?: string): Promise<PostComment> {
    const [comment] = await db.insert(postComments).values({ id, postId, userId, content, parentId: parentId || null } as any).returning();
    if (!parentId) {
      await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, postId));
    }
    return comment;
  }

  // User follow/unfollow methods
  async followUser(followerId: string, followingId: string): Promise<void> {
    try {
      await db.insert(userFollows).values({ followerId, followingId } as any);
      await db.update(users).set({ following: sql`${users.following} + 1` }).where(eq(users.id, followerId));
      await db.update(users).set({ followers: sql`${users.followers} + 1` }).where(eq(users.id, followingId));
    } catch (e) { /* already following */ }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.delete(userFollows).where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    await db.update(users).set({ following: sql`GREATEST(${users.following} - 1, 0)` }).where(eq(users.id, followerId));
    await db.update(users).set({ followers: sql`GREATEST(${users.followers} - 1, 0)` }).where(eq(users.id, followingId));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [row] = await db.select().from(userFollows).where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    return !!row;
  }

  async getUserFollowers(userId: string): Promise<User[]> {
    const follows = await db.select().from(userFollows).where(eq(userFollows.followingId, userId));
    const result: User[] = [];
    for (const f of follows) {
      const [u] = await db.select().from(users).where(eq(users.id, f.followerId));
      if (u) result.push(u);
    }
    return result;
  }

  async getUserFollowing(userId: string): Promise<User[]> {
    const follows = await db.select().from(userFollows).where(eq(userFollows.followerId, userId));
    const result: User[] = [];
    for (const f of follows) {
      const [u] = await db.select().from(users).where(eq(users.id, f.followingId));
      if (u) result.push(u);
    }
    return result;
  }

  // Blog interaction implementations
  async getBlogPostById(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async incrementBlogViews(postId: string): Promise<void> {
    await db.update(blogPosts).set({ viewCount: sql`${blogPosts.viewCount} + 1` }).where(eq(blogPosts.id, postId));
  }

  async getBlogLike(postId: string, userId: string): Promise<boolean> {
    const [like] = await db.select().from(blogLikes).where(and(eq(blogLikes.postId, postId), eq(blogLikes.userId, userId)));
    return !!like;
  }

  async likeBlogPost(postId: string, userId: string): Promise<void> {
    try {
      await db.insert(blogLikes).values({ postId, userId });
      await db.update(blogPosts).set({ likesCount: sql`${blogPosts.likesCount} + 1` }).where(eq(blogPosts.id, postId));
    } catch (e) { /* already liked */ }
  }

  async unlikeBlogPost(postId: string, userId: string): Promise<void> {
    await db.delete(blogLikes).where(and(eq(blogLikes.postId, postId), eq(blogLikes.userId, userId)));
    await db.update(blogPosts).set({ likesCount: sql`GREATEST(${blogPosts.likesCount} - 1, 0)` }).where(eq(blogPosts.id, postId));
  }

  async getBlogComments(postId: string): Promise<(BlogComment & { user: Partial<User> })[]> {
    const comments = await db.select().from(blogComments)
      .where(and(eq(blogComments.postId, postId), eq(blogComments.isApproved, true)))
      .orderBy(desc(blogComments.createdAt));
    const result: (BlogComment & { user: Partial<User> })[] = [];
    for (const comment of comments) {
      const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, profileImageUrl: users.profileImageUrl }).from(users).where(eq(users.id, comment.userId));
      result.push({ ...comment, user: u || {} });
    }
    return result;
  }

  async addBlogComment(postId: string, userId: string, content: string, parentId?: string): Promise<BlogComment> {
    const [comment] = await db.insert(blogComments).values({ postId, userId, content, parentId: parentId || null }).returning();
    await db.update(blogPosts).set({ commentsCount: sql`${blogPosts.commentsCount} + 1` }).where(eq(blogPosts.id, postId));
    return comment;
  }

  async getBlogCategoryFollow(userId: string, category: string): Promise<boolean> {
    const [follow] = await db.select().from(blogCategoryFollows).where(and(eq(blogCategoryFollows.userId, userId), eq(blogCategoryFollows.category, category)));
    return !!follow;
  }

  async followBlogCategory(userId: string, category: string): Promise<void> {
    try {
      await db.insert(blogCategoryFollows).values({ userId, category });
    } catch (e) { /* already following */ }
  }

  async unfollowBlogCategory(userId: string, category: string): Promise<void> {
    await db.delete(blogCategoryFollows).where(and(eq(blogCategoryFollows.userId, userId), eq(blogCategoryFollows.category, category)));
  }

  async getBlogPostsByCategory(category: string): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).where(and(eq(blogPosts.category, category), eq(blogPosts.isPublished, true))).orderBy(desc(blogPosts.publishedAt));
  }

  async createBlogTip(tip: InsertBlogTip): Promise<BlogTip> {
    const [newTip] = await db.insert(blogTips).values(tip as any).returning();
    return newTip;
  }

  async getBlogTipsByPostId(postId: string): Promise<BlogTip[]> {
    return await db.select().from(blogTips).where(eq(blogTips.postId, postId)).orderBy(desc(blogTips.createdAt));
  }

  async getActiveLeaderboardRewards(leaderboardType?: string): Promise<LeaderboardReward[]> {
    const conditions = [eq(leaderboardRewards.isActive, true)];
    if (leaderboardType && leaderboardType !== 'all') {
      conditions.push(
        sql`(${leaderboardRewards.leaderboardType} = 'all' OR ${leaderboardRewards.leaderboardType} = ${leaderboardType})`
      );
    }
    return await db.select().from(leaderboardRewards)
      .where(and(...conditions))
      .orderBy(leaderboardRewards.positionFrom);
  }

  async createLeaderboardReward(data: InsertLeaderboardReward): Promise<LeaderboardReward> {
    const [row] = await db.insert(leaderboardRewards).values(data as any).returning();
    return row;
  }

  async updateLeaderboardReward(id: string, data: Partial<InsertLeaderboardReward>): Promise<LeaderboardReward> {
    const [row] = await db.update(leaderboardRewards).set({ ...data, updatedAt: new Date() } as any).where(eq(leaderboardRewards.id, id)).returning();
    return row;
  }

  async deleteLeaderboardReward(id: string): Promise<void> {
    await db.delete(leaderboardRewards).where(eq(leaderboardRewards.id, id));
  }

  async getActiveLeaderboardGiveaways(): Promise<LeaderboardGiveaway[]> {
    return await db.select().from(leaderboardGiveaways)
      .where(ne(leaderboardGiveaways.status, 'deleted'))
      .orderBy(desc(leaderboardGiveaways.createdAt));
  }

  async createLeaderboardGiveaway(data: InsertLeaderboardGiveaway): Promise<LeaderboardGiveaway> {
    const [row] = await db.insert(leaderboardGiveaways).values(data as any).returning();
    return row;
  }

  async updateLeaderboardGiveaway(id: string, data: Partial<InsertLeaderboardGiveaway>): Promise<LeaderboardGiveaway> {
    const [row] = await db.update(leaderboardGiveaways).set({ ...data, updatedAt: new Date() } as any).where(eq(leaderboardGiveaways.id, id)).returning();
    return row;
  }

  async deleteLeaderboardGiveaway(id: string): Promise<void> {
    await db.update(leaderboardGiveaways).set({ status: 'deleted' } as any).where(eq(leaderboardGiveaways.id, id));
  }

  async getAllCreators(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.userType, 'creator'));
  }

  // User Reviews
  async getUserReviews(userId: string): Promise<(UserReview & { reviewer: Partial<User> })[]> {
    const reviews = await db.select().from(userReviews).where(eq(userReviews.revieweeId, userId)).orderBy(desc(userReviews.createdAt));
    const result: (UserReview & { reviewer: Partial<User> })[] = [];
    for (const review of reviews) {
      const [reviewer] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, profileImageUrl: users.profileImageUrl, userType: users.userType }).from(users).where(eq(users.id, review.reviewerId));
      result.push({ ...review, reviewer: reviewer || {} });
    }
    return result;
  }

  async createUserReview(review: { revieweeId: string; reviewerId: string; rating: number; comment?: string }): Promise<UserReview> {
    const [newReview] = await db.insert(userReviews).values(review as any).returning();
    return newReview;
  }

  // Subscriptions
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt)).limit(1);
    return sub;
  }

  async createSubscription(sub: { userId: string; plan: string; amount: number; network: string; transactionHash?: string; paymentProof?: string }): Promise<Subscription> {
    const [newSub] = await db.insert(subscriptions).values({ ...sub, amount: sub.amount.toString() } as any).returning();
    return newSub;
  }

  async updateSubscriptionStatus(id: string, status: string, startDate?: Date, endDate?: Date): Promise<Subscription> {
    const updates: any = { status, updatedAt: new Date() };
    if (startDate) updates.startDate = startDate;
    if (endDate) updates.endDate = endDate;
    const [sub] = await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id)).returning();
    return sub;
  }

  async getExpiredSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions).where(eq(subscriptions.status, 'active'));
  }

  // Payout Requests
  async getUserPayoutRequests(userId: string): Promise<PayoutRequest[]> {
    return await db.select().from(payoutRequests).where(eq(payoutRequests.userId, userId)).orderBy(desc(payoutRequests.createdAt));
  }

  async getAllPayoutRequests(): Promise<(PayoutRequest & { user: Partial<User> })[]> {
    const requests = await db.select().from(payoutRequests).orderBy(desc(payoutRequests.createdAt));
    const result: (PayoutRequest & { user: Partial<User> })[] = [];
    for (const req of requests) {
      const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, profileImageUrl: users.profileImageUrl, userType: users.userType }).from(users).where(eq(users.id, req.userId));
      result.push({ ...req, user: u || {} });
    }
    return result;
  }

  async createPayoutRequest(req: { userId: string; amount: number; network: string; walletAddress: string }): Promise<PayoutRequest> {
    const [newReq] = await db.insert(payoutRequests).values({ ...req, amount: req.amount.toString() } as any).returning();
    return newReq;
  }

  async updatePayoutRequest(id: string, updates: Partial<PayoutRequest>): Promise<PayoutRequest> {
    const [req] = await db.update(payoutRequests).set({ ...updates, updatedAt: new Date() } as any).where(eq(payoutRequests.id, id)).returning();
    return req;
  }

  async getPayoutMessages(payoutRequestId: string): Promise<(PayoutMessage & { sender: Partial<User> })[]> {
    const msgs = await db.select().from(payoutMessages).where(eq(payoutMessages.payoutRequestId, payoutRequestId)).orderBy(payoutMessages.createdAt);
    const result: (PayoutMessage & { sender: Partial<User> })[] = [];
    for (const msg of msgs) {
      const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, username: users.username, profileImageUrl: users.profileImageUrl, userType: users.userType }).from(users).where(eq(users.id, msg.senderId));
      result.push({ ...msg, sender: u || {} });
    }
    return result;
  }

  async createPayoutMessage(payoutRequestId: string, senderId: string, content: string): Promise<PayoutMessage> {
    const [msg] = await db.insert(payoutMessages).values({ payoutRequestId, senderId, content } as any).returning();
    return msg;
  }

  // Referrals
  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, referrerId)).orderBy(desc(referrals.createdAt));
  }

  async getReferralByReferredId(referredId: string): Promise<Referral | undefined> {
    const [ref] = await db.select().from(referrals).where(eq(referrals.referredId, referredId));
    return ref;
  }

  async createReferral(ref: { referrerId: string; referredId: string; referralType: string; referralCode: string }): Promise<Referral> {
    const [newRef] = await db.insert(referrals).values(ref as any).returning();
    return newRef;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCodeCreator, code));
    if (user) return user;
    const [brandUser] = await db.select().from(users).where(eq(users.referralCodeBrand, code));
    return brandUser;
  }

  async getTopCreatorsByReferrals(limit: number = 10): Promise<any[]> {
    const creators = await db.select().from(users)
      .where(eq(users.userType, 'creator'))
      .orderBy(desc(users.totalReferrals))
      .limit(limit);
    return creators.map(u => ({ ...u, password: undefined }));
  }

  async getTopCreatorsByActivity(limit: number = 10): Promise<any[]> {
    const creators = await db.select().from(users)
      .where(eq(users.userType, 'creator'))
      .orderBy(desc(users.totalEarned))
      .limit(limit);
    return creators.map(u => ({ ...u, password: undefined }));
  }

  async getAdminUser(): Promise<User | undefined> {
    const [admin] = await db.select().from(users)
      .where(eq(users.userType, 'admin'))
      .limit(1);
    return admin;
  }

  // ── BreedSkool ────────────────────────────────────────────────
  async getAllCourses(publishedOnly = false): Promise<(Course & { instructor: Partial<User> })[]> {
    const rows = await db.select().from(courses).orderBy(desc(courses.createdAt));
    const filtered = publishedOnly ? rows.filter(c => c.isPublished) : rows;
    const result = await Promise.all(filtered.map(async (c) => {
      const [instructor] = await db.select({
        id: users.id, firstName: users.firstName, lastName: users.lastName,
        profileImageUrl: users.profileImageUrl, isVerified: users.isVerified, niche: users.niche,
      }).from(users).where(eq(users.id, c.instructorId));
      return { ...c, instructor: instructor || {} };
    }));
    return result;
  }

  async getCourseById(id: string): Promise<(Course & { instructor: Partial<User> }) | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) return undefined;
    const [instructor] = await db.select({
      id: users.id, firstName: users.firstName, lastName: users.lastName,
      profileImageUrl: users.profileImageUrl, isVerified: users.isVerified, niche: users.niche,
    }).from(users).where(eq(users.id, course.instructorId));
    return { ...course, instructor: instructor || {} };
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [created] = await db.insert(courses).values(course).returning();
    return created;
  }

  async updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course> {
    const [updated] = await db.update(courses).set({ ...updates, updatedAt: new Date() }).where(eq(courses.id, id)).returning();
    return updated;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  async getCourseEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined> {
    const [enrollment] = await db.select().from(courseEnrollments)
      .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)));
    return enrollment;
  }

  async getMyEnrollments(userId: string): Promise<(CourseEnrollment & { course: Course })[]> {
    const enrollments = await db.select().from(courseEnrollments).where(eq(courseEnrollments.userId, userId));
    return Promise.all(enrollments.map(async (e) => {
      const [course] = await db.select().from(courses).where(eq(courses.id, e.courseId));
      return { ...e, course: course! };
    }));
  }

  async getAllEnrollments(): Promise<(CourseEnrollment & { course: Partial<Course>; user: Partial<User> })[]> {
    const enrollments = await db.select().from(courseEnrollments).orderBy(desc(courseEnrollments.createdAt));
    return Promise.all(enrollments.map(async (e) => {
      const [course] = await db.select({ id: courses.id, title: courses.title }).from(courses).where(eq(courses.id, e.courseId));
      const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users).where(eq(users.id, e.userId));
      return { ...e, course: course || {}, user: user || {} };
    }));
  }

  async createEnrollment(data: { courseId: string; userId: string; isFree: boolean; paymentMethod?: string; paymentProof?: string; transactionHash?: string; amount?: string }): Promise<CourseEnrollment> {
    const status = data.isFree ? "active" : "pending_payment";
    const isPaid = data.isFree;
    const [enrollment] = await db.insert(courseEnrollments).values({
      courseId: data.courseId, userId: data.userId, status, isPaid,
      paymentMethod: data.paymentMethod || (data.isFree ? "free" : undefined),
      paymentProof: data.paymentProof, transactionHash: data.transactionHash,
      amount: data.amount || "0.00",
    }).returning();
    if (data.isFree) {
      await db.update(courses).set({ studentsCount: sql`${courses.studentsCount} + 1` }).where(eq(courses.id, data.courseId));
    }
    return enrollment;
  }

  async approveEnrollment(id: string, approvedBy: string): Promise<CourseEnrollment> {
    const [existing] = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, id));
    const [updated] = await db.update(courseEnrollments).set({
      status: "active", isPaid: true, approvedBy, approvedAt: new Date(), updatedAt: new Date(),
    }).where(eq(courseEnrollments.id, id)).returning();
    if (existing && existing.status !== "active") {
      await db.update(courses).set({ studentsCount: sql`${courses.studentsCount} + 1` }).where(eq(courses.id, existing.courseId));
    }
    return updated;
  }

  async getCourseReviews(courseId: string): Promise<(CourseReview & { user: Partial<User> })[]> {
    const reviews = await db.select().from(courseReviews).where(eq(courseReviews.courseId, courseId)).orderBy(desc(courseReviews.createdAt));
    return Promise.all(reviews.map(async (r) => {
      const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl })
        .from(users).where(eq(users.id, r.userId));
      return { ...r, user: user || {} };
    }));
  }

  async createCourseReview(data: { courseId: string; userId: string; rating: number; comment?: string }): Promise<CourseReview> {
    const [review] = await db.insert(courseReviews).values(data).returning();
    const allReviews = await db.select().from(courseReviews).where(eq(courseReviews.courseId, data.courseId));
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await db.update(courses).set({ reviewsCount: allReviews.length, averageRating: avg.toFixed(2) }).where(eq(courses.id, data.courseId));
    return review;
  }

  async getCourseComments(courseId: string): Promise<(CourseComment & { user: Partial<User> })[]> {
    const comments = await db.select().from(courseComments).where(eq(courseComments.courseId, courseId)).orderBy(desc(courseComments.createdAt));
    return Promise.all(comments.map(async (c) => {
      const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl })
        .from(users).where(eq(users.id, c.userId));
      return { ...c, user: user || {} };
    }));
  }

  async createCourseComment(data: { courseId: string; userId: string; content: string; parentId?: string }): Promise<CourseComment> {
    const [comment] = await db.insert(courseComments).values(data).returning();
    await db.update(courses).set({ commentsCount: sql`${courses.commentsCount} + 1` }).where(eq(courses.id, data.courseId));
    return comment;
  }

  async getCourseLike(courseId: string, userId: string): Promise<boolean> {
    const [like] = await db.select().from(courseLikes).where(and(eq(courseLikes.courseId, courseId), eq(courseLikes.userId, userId)));
    return !!like;
  }

  async toggleCourseLike(courseId: string, userId: string): Promise<boolean> {
    const existing = await this.getCourseLike(courseId, userId);
    if (existing) {
      await db.delete(courseLikes).where(and(eq(courseLikes.courseId, courseId), eq(courseLikes.userId, userId)));
      await db.update(courses).set({ likesCount: sql`GREATEST(${courses.likesCount} - 1, 0)` }).where(eq(courses.id, courseId));
      return false;
    } else {
      await db.insert(courseLikes).values({ courseId, userId });
      await db.update(courses).set({ likesCount: sql`${courses.likesCount} + 1` }).where(eq(courses.id, courseId));
      return true;
    }
  }

  async getLessonsByCourse(courseId: string): Promise<any[]> {
    return db.select().from(courseLessons).where(eq(courseLessons.courseId, courseId)).orderBy(courseLessons.order);
  }

  async createLesson(data: { courseId: string; title: string; description?: string; videoUrl?: string; videoLink?: string; content?: string; order?: number; lessonFiles?: any[]; isPreview?: boolean }): Promise<any> {
    const [lesson] = await db.insert(courseLessons).values({
      courseId: data.courseId,
      title: data.title,
      description: data.description,
      videoUrl: data.videoUrl,
      videoLink: data.videoLink,
      content: data.content,
      order: data.order ?? 0,
      lessonFiles: data.lessonFiles ?? [],
      isPreview: data.isPreview ?? false,
    }).returning();
    await db.update(courses).set({ lessonsCount: sql`${courses.lessonsCount} + 1` }).where(eq(courses.id, data.courseId));
    return lesson;
  }

  async updateLesson(lessonId: string, updates: any): Promise<any> {
    const [updated] = await db.update(courseLessons).set(updates).where(eq(courseLessons.id, lessonId)).returning();
    return updated;
  }

  async deleteLesson(lessonId: string): Promise<void> {
    const [lesson] = await db.select().from(courseLessons).where(eq(courseLessons.id, lessonId));
    if (lesson) {
      await db.delete(courseLessons).where(eq(courseLessons.id, lessonId));
      await db.update(courses).set({ lessonsCount: sql`GREATEST(${courses.lessonsCount} - 1, 0)` }).where(eq(courses.id, lesson.courseId));
    }
  }

  async getCourseMessages(courseId: string): Promise<any[]> {
    const msgs = await db.select().from(courseMessages).where(eq(courseMessages.courseId, courseId)).orderBy(courseMessages.createdAt);
    return Promise.all(msgs.map(async (m) => {
      const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl, userType: users.userType })
        .from(users).where(eq(users.id, m.senderId));
      return { ...m, sender: user || {} };
    }));
  }

  async createCourseMessage(data: { courseId: string; senderId: string; message: string }): Promise<any> {
    const [msg] = await db.insert(courseMessages).values(data).returning();
    return msg;
  }

  async getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).orderBy(paymentMethods.sortOrder, paymentMethods.createdAt);
  }

  async getActivePaymentMethods(feature?: string): Promise<PaymentMethod[]> {
    const all = await db.select().from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.sortOrder, paymentMethods.createdAt);
    if (!feature) return all;
    const toggles = await db.select().from(paymentFeatureToggles)
      .where(eq(paymentFeatureToggles.feature, feature));
    return all.filter(method => {
      const toggle = toggles.find((t: any) => t.paymentMethodId === method.id);
      if (!toggle) return true;
      return toggle.isEnabled;
    });
  }

  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const [method] = await db.insert(paymentMethods).values({ ...data, id: crypto.randomUUID() }).returning();
    return method;
  }

  async updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    const [method] = await db.update(paymentMethods).set({ ...data, updatedAt: new Date() }).where(eq(paymentMethods.id, id)).returning();
    return method;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  async getPlatformSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return row?.value ?? null;
  }

  async setPlatformSetting(key: string, value: string): Promise<void> {
    await db.insert(platformSettings)
      .values({ id: crypto.randomUUID(), key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
  }

  // ── Social Platforms ──────────────────────────────────────
  async getAllSocialPlatforms(): Promise<SocialPlatform[]> {
    return db.select().from(socialPlatforms).orderBy(socialPlatforms.sortOrder, socialPlatforms.name);
  }

  async getActiveSocialPlatforms(): Promise<SocialPlatform[]> {
    return db.select().from(socialPlatforms).where(eq(socialPlatforms.isActive, true)).orderBy(socialPlatforms.sortOrder, socialPlatforms.name);
  }

  async createSocialPlatform(data: InsertSocialPlatform): Promise<SocialPlatform> {
    const [p] = await db.insert(socialPlatforms).values({ ...data, id: crypto.randomUUID() }).returning();
    return p;
  }

  async updateSocialPlatform(id: string, data: Partial<InsertSocialPlatform>): Promise<SocialPlatform> {
    const [p] = await db.update(socialPlatforms).set(data).where(eq(socialPlatforms.id, id)).returning();
    return p;
  }

  async deleteSocialPlatform(id: string): Promise<void> {
    await db.delete(socialPlatforms).where(eq(socialPlatforms.id, id));
  }

  // ── User Social Links ──────────────────────────────────────
  async getUserSocialLinks(userId: string): Promise<UserSocialLink[]> {
    return db.select().from(userSocialLinks).where(eq(userSocialLinks.userId, userId)).orderBy(userSocialLinks.createdAt);
  }

  async upsertUserSocialLink(data: { userId: string; platformSlug: string; url: string; followerCount: number }): Promise<UserSocialLink> {
    const existing = await db.select().from(userSocialLinks)
      .where(and(eq(userSocialLinks.userId, data.userId), eq(userSocialLinks.platformSlug, data.platformSlug)));
    if (existing.length > 0) {
      const [r] = await db.update(userSocialLinks).set({ url: data.url, followerCount: data.followerCount, updatedAt: new Date() }).where(eq(userSocialLinks.id, existing[0].id)).returning();
      return r;
    }
    const [r] = await db.insert(userSocialLinks).values({ id: crypto.randomUUID(), ...data }).returning();
    return r;
  }

  async deleteUserSocialLink(id: string): Promise<void> {
    await db.delete(userSocialLinks).where(eq(userSocialLinks.id, id));
  }

  async replaceUserSocialLinks(userId: string, links: any[]): Promise<void> {
    await db.delete(userSocialLinks).where(eq(userSocialLinks.userId, userId));
    if (links.length > 0) {
      await db.insert(userSocialLinks).values(links.map(l => ({ id: crypto.randomUUID(), userId, ...l })));
    }
    const totalFollowers = links.reduce((sum, l) => sum + (Number(l.followerCount) || 0), 0);
    let creatorTier = 'newcomer';
    if (totalFollowers >= 10_000_000) creatorTier = 'global_titans';
    else if (totalFollowers >= 1_000_000) creatorTier = 'power_influencers';
    else if (totalFollowers >= 100_000) creatorTier = 'growth_engines';
    else if (totalFollowers >= 10_000) creatorTier = 'rising_sparks';
    else if (totalFollowers >= 1) creatorTier = 'aspiring';
    await db.update(users).set({ totalFollowers, creatorTier, updatedAt: new Date() } as any).where(eq(users.id, userId));
  }

  // ── Portfolio Items ──────────────────────────────────────
  async getUserPortfolio(userId: string): Promise<PortfolioItem[]> {
    return db.select().from(portfolioItems).where(eq(portfolioItems.userId, userId)).orderBy(portfolioItems.sortOrder, portfolioItems.createdAt);
  }

  async createPortfolioItem(data: InsertPortfolioItem): Promise<PortfolioItem> {
    const [item] = await db.insert(portfolioItems).values({ ...data, id: crypto.randomUUID() }).returning();
    return item;
  }

  async updatePortfolioItem(id: string, data: Partial<InsertPortfolioItem>): Promise<PortfolioItem> {
    const [item] = await db.update(portfolioItems).set({ ...data, updatedAt: new Date() }).where(eq(portfolioItems.id, id)).returning();
    return item;
  }

  async deletePortfolioItem(id: string): Promise<void> {
    await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
  }

  // ── Push Notifications ──────────────────────────────────────
  async savePushSubscription(data: { userId: string; endpoint: string; keys: any; userAgent?: string }): Promise<void> {
    await db.insert(pushSubscriptions)
      .values({ id: crypto.randomUUID(), ...data })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { isActive: true, userId: data.userId } });
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    await db.update(pushSubscriptions).set({ isActive: false }).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async getUserPushSubscriptions(userId: string): Promise<any[]> {
    return db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));
  }

  async getAllPushSubscriptions(targetType?: string): Promise<any[]> {
    if (!targetType || targetType === 'all') {
      return db.select({ sub: pushSubscriptions, user: { userType: users.userType } })
        .from(pushSubscriptions)
        .leftJoin(users, eq(pushSubscriptions.userId, users.id))
        .where(eq(pushSubscriptions.isActive, true));
    }
    if (targetType.startsWith('user:')) {
      const userId = targetType.slice(5);
      return db.select({ sub: pushSubscriptions, user: { userType: users.userType } })
        .from(pushSubscriptions)
        .leftJoin(users, eq(pushSubscriptions.userId, users.id))
        .where(and(eq(pushSubscriptions.isActive, true), eq(pushSubscriptions.userId, userId)));
    }
    return db.select({ sub: pushSubscriptions, user: { userType: users.userType } })
      .from(pushSubscriptions)
      .leftJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(and(eq(pushSubscriptions.isActive, true), eq(users.userType, targetType === 'creators' ? 'creator' : 'brand')));
  }

  async getAllPushNotificationCampaigns(): Promise<PushNotificationCampaign[]> {
    return db.select().from(pushNotificationCampaigns).orderBy(desc(pushNotificationCampaigns.createdAt));
  }

  async createPushNotificationCampaign(data: { title: string; body: string; icon?: string; clickUrl?: string; targetType: string; createdBy: string }): Promise<PushNotificationCampaign> {
    const [campaign] = await db.insert(pushNotificationCampaigns).values({ id: crypto.randomUUID(), ...data }).returning();
    return campaign;
  }

  async updatePushNotificationCampaign(id: string, data: Partial<PushNotificationCampaign>): Promise<PushNotificationCampaign> {
    const [campaign] = await db.update(pushNotificationCampaigns).set(data).where(eq(pushNotificationCampaigns.id, id)).returning();
    return campaign;
  }

  async deletePushNotificationCampaign(id: string): Promise<void> {
    await db.delete(pushNotificationCampaigns).where(eq(pushNotificationCampaigns.id, id));
  }

  async getReferralStats(): Promise<any> {
    const totalReferrals = await db.select({ count: sql<number>`COUNT(*)` }).from(referrals);
    const byType = await db.select({
      referralType: referrals.referralType,
      count: sql<number>`COUNT(*)`,
    }).from(referrals).groupBy(referrals.referralType);

    const topReferrers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      userType: users.userType,
      totalReferrals: users.totalReferrals,
    }).from(users)
      .orderBy(desc(users.totalReferrals))
      .limit(10);

    const recentReferrals = await db.select().from(referrals)
      .orderBy(desc(referrals.createdAt))
      .limit(20);

    return {
      total: Number(totalReferrals[0]?.count || 0),
      byType,
      topReferrers,
      recentReferrals,
    };
  }

  async getPwaSettings(): Promise<PwaSettings | null> {
    const rows = await db.select().from(pwaSettings).limit(1);
    if (rows.length === 0) {
      const inserted = await db.insert(pwaSettings).values({}).returning();
      return inserted[0] || null;
    }
    return rows[0];
  }

  async updatePwaSettings(data: Partial<InsertPwaSettings>): Promise<PwaSettings> {
    const existing = await this.getPwaSettings();
    if (!existing) {
      const inserted = await db.insert(pwaSettings).values(data as InsertPwaSettings).returning();
      return inserted[0];
    }
    const updated = await db.update(pwaSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pwaSettings.id, existing.id))
      .returning();
    return updated[0];
  }
  async getSiteContent(): Promise<SiteContent[]> {
    return await db.select().from(siteContent).orderBy(siteContent.page, siteContent.sortOrder);
  }

  async updateSiteContent(key: string, value: string): Promise<SiteContent> {
    const [updated] = await db.update(siteContent)
      .set({ value, updatedAt: new Date() })
      .where(eq(siteContent.contentKey, key))
      .returning();
    return updated;
  }

  async upsertSiteContent(data: InsertSiteContent): Promise<SiteContent> {
    const [result] = await db.insert(siteContent)
      .values(data)
      .onConflictDoUpdate({
        target: siteContent.contentKey,
        set: { label: data.label, defaultValue: data.defaultValue, page: data.page, section: data.section, contentType: data.contentType, sortOrder: data.sortOrder, updatedAt: new Date() }
      })
      .returning();
    return result;
  }

  async initSiteContent(defaults: InsertSiteContent[]): Promise<void> {
    for (const item of defaults) {
      await db.insert(siteContent).values(item).onConflictDoNothing();
    }
  }

  // Payment feature toggles
  async getPaymentFeatureToggles(): Promise<any[]> {
    return await db.select().from(paymentFeatureToggles);
  }

  async upsertPaymentFeatureToggle(paymentMethodId: string, feature: string, isEnabled: boolean): Promise<any> {
    const existing = await db.select().from(paymentFeatureToggles)
      .where(and(eq(paymentFeatureToggles.paymentMethodId, paymentMethodId), eq(paymentFeatureToggles.feature, feature)))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(paymentFeatureToggles)
        .set({ isEnabled, updatedAt: new Date() })
        .where(and(eq(paymentFeatureToggles.paymentMethodId, paymentMethodId), eq(paymentFeatureToggles.feature, feature)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(paymentFeatureToggles)
      .values({ paymentMethodId, feature, isEnabled })
      .returning();
    return created;
  }

  // Sponsored ads
  async getAllSponsoredAds(): Promise<any[]> {
    return await db.select().from(sponsoredAds).orderBy(sponsoredAds.sortOrder, desc(sponsoredAds.createdAt));
  }

  async getActiveSponsoredAds(placement?: string): Promise<any[]> {
    const now = new Date();
    const conditions = [eq(sponsoredAds.isActive, true)];
    if (placement) conditions.push(eq(sponsoredAds.placement, placement));
    return await db.select().from(sponsoredAds)
      .where(and(...conditions))
      .orderBy(sponsoredAds.sortOrder);
  }

  async createSponsoredAd(data: any): Promise<any> {
    const [ad] = await db.insert(sponsoredAds).values({ ...data, id: crypto.randomUUID() }).returning();
    return ad;
  }

  async updateSponsoredAd(id: string, data: any): Promise<any> {
    const [ad] = await db.update(sponsoredAds).set({ ...data, updatedAt: new Date() }).where(eq(sponsoredAds.id, id)).returning();
    return ad;
  }

  async deleteSponsoredAd(id: string): Promise<void> {
    await db.delete(sponsoredAds).where(eq(sponsoredAds.id, id));
  }

  async incrementAdImpressions(id: string): Promise<void> {
    await db.update(sponsoredAds).set({ impressions: sql`${sponsoredAds.impressions} + 1` }).where(eq(sponsoredAds.id, id));
  }

  async incrementAdClicks(id: string): Promise<void> {
    await db.update(sponsoredAds).set({ clicks: sql`${sponsoredAds.clicks} + 1` }).where(eq(sponsoredAds.id, id));
  }

  // Advertise applications
  async getAllAdvertiseApplications(): Promise<any[]> {
    return await db.select().from(advertiseApplications).orderBy(desc(advertiseApplications.createdAt));
  }

  async createAdvertiseApplication(data: any): Promise<any> {
    const [app] = await db.insert(advertiseApplications).values({ ...data, id: crypto.randomUUID() }).returning();
    return app;
  }

  async updateAdvertiseApplication(id: string, data: any): Promise<any> {
    const [app] = await db.update(advertiseApplications).set({ ...data, updatedAt: new Date() }).where(eq(advertiseApplications.id, id)).returning();
    return app;
  }

  // ── Email Settings ──────────────────────────────────────────
  async getEmailSettings(): Promise<any> {
    const rows = await db.select().from(emailSettings).limit(1);
    return rows[0] || null;
  }

  async upsertEmailSettings(data: any): Promise<any> {
    const existing = await this.getEmailSettings();
    if (existing) {
      const [row] = await db.update(emailSettings).set({ ...data, updatedAt: new Date() }).where(eq(emailSettings.id, existing.id)).returning();
      return row;
    }
    const [row] = await db.insert(emailSettings).values({ ...data, id: crypto.randomUUID() }).returning();
    return row;
  }

  // ── Email Templates ─────────────────────────────────────────
  async getAllEmailTemplates(): Promise<any[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async createEmailTemplate(data: any): Promise<any> {
    const [row] = await db.insert(emailTemplates).values({ ...data, id: crypto.randomUUID() }).returning();
    return row;
  }

  async updateEmailTemplate(id: string, data: any): Promise<any> {
    const [row] = await db.update(emailTemplates).set({ ...data, updatedAt: new Date() }).where(eq(emailTemplates.id, id)).returning();
    return row;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // ── Email Campaigns ─────────────────────────────────────────
  async getAllEmailCampaigns(): Promise<any[]> {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(id: string): Promise<any> {
    const [row] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return row;
  }

  async createEmailCampaign(data: any): Promise<any> {
    const [row] = await db.insert(emailCampaigns).values({ ...data, id: crypto.randomUUID() }).returning();
    return row;
  }

  async updateEmailCampaign(id: string, data: any): Promise<any> {
    const [row] = await db.update(emailCampaigns).set({ ...data, updatedAt: new Date() }).where(eq(emailCampaigns.id, id)).returning();
    return row;
  }

  async deleteEmailCampaign(id: string): Promise<void> {
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
  }

  // ── Email Auto-Responders ───────────────────────────────────
  async getAllEmailAutoResponders(): Promise<any[]> {
    return await db.select().from(emailAutoResponders).orderBy(desc(emailAutoResponders.createdAt));
  }

  async createEmailAutoResponder(data: any): Promise<any> {
    const [row] = await db.insert(emailAutoResponders).values({ ...data, id: crypto.randomUUID() }).returning();
    return row;
  }

  async updateEmailAutoResponder(id: string, data: any): Promise<any> {
    const [row] = await db.update(emailAutoResponders).set({ ...data, updatedAt: new Date() }).where(eq(emailAutoResponders.id, id)).returning();
    return row;
  }

  async deleteEmailAutoResponder(id: string): Promise<void> {
    await db.delete(emailAutoResponders).where(eq(emailAutoResponders.id, id));
  }

  // ── Email Logs ──────────────────────────────────────────────
  async getEmailLogs(limit = 100): Promise<any[]> {
    return await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt)).limit(limit);
  }

  async getEmailLogsByCampaign(campaignId: string): Promise<any[]> {
    return await db.select().from(emailLogs).where(eq(emailLogs.campaignId, campaignId)).orderBy(desc(emailLogs.sentAt));
  }

  // ── $TDRIP Points System ─────────────────────────────────────
  private computeLevel(points: number): string {
    if (points >= 50000) return "Elite";
    if (points >= 10000) return "Authority";
    if (points >= 2000) return "Influencer";
    if (points >= 500) return "Hustler";
    return "Starter";
  }

  async getUserPoints(userId: string): Promise<any[]> {
    return await db.select().from(userPoints).where(eq(userPoints.userId, userId)).orderBy(desc(userPoints.createdAt));
  }

  async awardPoints(userId: string, actionType: string, points: number, description?: string, referenceId?: string): Promise<any> {
    const [record] = await db.insert(userPoints).values({
      userId,
      actionType,
      points,
      description: description ?? null,
      referenceId: referenceId ?? null,
    }).returning();

    // Update total points on user
    const totalRows = await db.select({ total: sql<number>`COALESCE(SUM(${userPoints.points}), 0)` })
      .from(userPoints).where(eq(userPoints.userId, userId));
    const total = Number(totalRows[0]?.total ?? 0);
    const newLevel = this.computeLevel(total);
    await db.update(users).set({ totalPoints: total, level: newLevel }).where(eq(users.id, userId));

    return record;
  }

  async getUserTotalPoints(userId: string): Promise<number> {
    const [row] = await db.select({ total: sql<number>`COALESCE(SUM(${userPoints.points}), 0)` })
      .from(userPoints).where(eq(userPoints.userId, userId));
    return Number(row?.total ?? 0);
  }

  async computeAndUpdateLevel(userId: string): Promise<string> {
    const total = await this.getUserTotalPoints(userId);
    const level = this.computeLevel(total);
    await db.update(users).set({ totalPoints: total, level }).where(eq(users.id, userId));
    return level;
  }

  async getTopUsersByPoints(limit = 10): Promise<any[]> {
    const rows = await db.select().from(users)
      .where(sql`${users.userType} != 'admin'`)
      .orderBy(desc(users.totalPoints))
      .limit(limit);
    return rows.map(({ password, ...u }) => u);
  }

  async getLeaderboardByPoints(limit = 10): Promise<any[]> {
    return this.getTopUsersByPoints(limit);
  }

  async getUsersByType(userType: string): Promise<any[]> {
    return await db.select().from(users).where(eq(users.userType, userType));
  }

  // ── Direct Hire Offers ───────────────────────────────────────
  async createDirectHireOffer(data: any): Promise<any> {
    const [offer] = await db.insert(directHireOffers).values(data).returning();
    return offer;
  }

  async getDirectHireOffer(id: string): Promise<any> {
    const [offer] = await db.select().from(directHireOffers).where(eq(directHireOffers.id, id));
    return offer;
  }

  async getDirectHireOffersByBrand(brandId: string): Promise<any[]> {
    return await db.select().from(directHireOffers)
      .where(eq(directHireOffers.brandId, brandId))
      .orderBy(desc(directHireOffers.createdAt));
  }

  async getDirectHireOffersByInfluencer(influencerId: string): Promise<any[]> {
    return await db.select().from(directHireOffers)
      .where(eq(directHireOffers.influencerId, influencerId))
      .orderBy(desc(directHireOffers.createdAt));
  }

  async getAllDirectHireOffers(): Promise<any[]> {
    return await db.select().from(directHireOffers)
      .orderBy(desc(directHireOffers.createdAt));
  }

  async updateDirectHireOffer(id: string, data: Partial<any>): Promise<any> {
    const [updated] = await db.update(directHireOffers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(directHireOffers.id, id))
      .returning();
    return updated;
  }

  // ── Welcome Campaign ─────────────────────────────────────────
  async getWelcomeTaskCompletions(userId: string): Promise<any[]> {
    return await db.select().from(welcomeTaskCompletions).where(eq(welcomeTaskCompletions.userId, userId));
  }

  async hasCompletedWelcomeTask(userId: string, taskKey: string): Promise<boolean> {
    const [row] = await db.select().from(welcomeTaskCompletions)
      .where(and(eq(welcomeTaskCompletions.userId, userId), eq(welcomeTaskCompletions.taskKey, taskKey)));
    return !!row;
  }

  async completeWelcomeTask(userId: string, taskKey: string): Promise<any> {
    const alreadyDone = await this.hasCompletedWelcomeTask(userId, taskKey);
    if (alreadyDone) return null;

    const [record] = await db.insert(welcomeTaskCompletions).values({ userId, taskKey }).returning();

    const pointsMap: Record<string, number> = {
      telegram: 20,
      twitter: 15,
      instagram: 15,
      youtube: 20,
      whatsapp: 10,
      profile: 50,
    };
    const pts = pointsMap[taskKey] ?? 10;
    await this.awardPoints(userId, 'social_task', pts, `Welcome task: ${taskKey}`, taskKey);

    return record;
  }

  // ── Hero Sliders ──────────────────────────────────────────────
  async getHeroSliders(): Promise<HeroSlider[]> {
    return await db.select().from(heroSliders).orderBy(heroSliders.order);
  }

  async getActiveHeroSliders(): Promise<HeroSlider[]> {
    return await db.select().from(heroSliders)
      .where(eq(heroSliders.isActive, true))
      .orderBy(heroSliders.order);
  }

  async createHeroSlider(data: InsertHeroSlider): Promise<HeroSlider> {
    const [slider] = await db.insert(heroSliders).values(data).returning();
    return slider;
  }

  async updateHeroSlider(id: string, data: Partial<InsertHeroSlider>): Promise<HeroSlider | null> {
    const [slider] = await db.update(heroSliders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(heroSliders.id, id))
      .returning();
    return slider || null;
  }

  async deleteHeroSlider(id: string): Promise<void> {
    await db.delete(heroSliders).where(eq(heroSliders.id, id));
  }

  async countHeroSliders(): Promise<number> {
    const rows = await db.select().from(heroSliders);
    return rows.length;
  }

  // ── Page Content CMS ──────────────────────────────────────────
  async getAllPageContent(): Promise<PageContent[]> {
    return await db.select().from(pageContent).orderBy(pageContent.page, pageContent.section, pageContent.order);
  }

  async getPageContent(page: string): Promise<PageContent[]> {
    return await db.select().from(pageContent)
      .where(eq(pageContent.page, page))
      .orderBy(pageContent.section, pageContent.order);
  }

  async getPageContentByKey(page: string, section: string, key: string): Promise<PageContent | null> {
    const [row] = await db.select().from(pageContent)
      .where(and(eq(pageContent.page, page), eq(pageContent.section, section), eq(pageContent.key, key)));
    return row || null;
  }

  async upsertPageContent(data: InsertPageContent): Promise<PageContent> {
    const existing = await this.getPageContentByKey(data.page, data.section, data.key);
    if (existing) {
      const [updated] = await db.update(pageContent)
        .set({ value: data.value, updatedAt: new Date() })
        .where(eq(pageContent.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(pageContent).values(data).returning();
      return created;
    }
  }

  async updatePageContentValue(id: string, value: string): Promise<PageContent | null> {
    const [row] = await db.update(pageContent)
      .set({ value, updatedAt: new Date() })
      .where(eq(pageContent.id, id))
      .returning();
    return row || null;
  }

  async resetPageContentToDefault(id: string): Promise<PageContent | null> {
    const [row] = await db.update(pageContent)
      .set({ value: null, updatedAt: new Date() })
      .where(eq(pageContent.id, id))
      .returning();
    return row || null;
  }

  async countPageContent(): Promise<number> {
    const rows = await db.select().from(pageContent);
    return rows.length;
  }

  async bulkInsertPageContent(rows: InsertPageContent[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(pageContent).values(rows);
  }

  async syncDefaultPageContent(defaults: InsertPageContent[]): Promise<{ inserted: number; updated: number }> {
    if (defaults.length === 0) return { inserted: 0, updated: 0 };

    const existing = await db.select().from(pageContent);
    const existingMap = new Map(existing.map((r) => [`${r.page}::${r.section}::${r.key}`, r]));

    let inserted = 0;
    let updated = 0;

    for (const def of defaults) {
      const mapKey = `${def.page}::${def.section}::${def.key}`;
      const found = existingMap.get(mapKey);

      if (!found) {
        await db.insert(pageContent).values({ ...def, value: null });
        inserted++;
      } else {
        const needsMetaUpdate =
          found.label !== def.label ||
          found.type !== def.type ||
          found.defaultValue !== def.defaultValue ||
          found.order !== def.order;

        if (needsMetaUpdate) {
          await db.update(pageContent)
            .set({
              label: def.label,
              type: def.type,
              defaultValue: def.defaultValue,
              order: def.order,
              updatedAt: new Date(),
            })
            .where(eq(pageContent.id, found.id));
          updated++;
        }
      }
    }

    return { inserted, updated };
  }

  // ── Social Quick Tasks ─────────────────────────────────────────────────────
  async getSocialQuickTasks(activeOnly = false): Promise<SocialQuickTask[]> {
    const rows = activeOnly
      ? await db.select().from(socialQuickTasks).where(eq(socialQuickTasks.isActive, true)).orderBy(socialQuickTasks.sortOrder)
      : await db.select().from(socialQuickTasks).orderBy(socialQuickTasks.sortOrder);
    return rows;
  }

  async createSocialQuickTask(data: InsertSocialQuickTask): Promise<SocialQuickTask> {
    const [row] = await db.insert(socialQuickTasks).values(data as any).returning();
    return row;
  }

  async updateSocialQuickTask(id: string, data: Partial<InsertSocialQuickTask>): Promise<SocialQuickTask> {
    const [row] = await db.update(socialQuickTasks).set({ ...data, updatedAt: new Date() } as any).where(eq(socialQuickTasks.id, id)).returning();
    return row;
  }

  async deleteSocialQuickTask(id: string): Promise<void> {
    await db.delete(socialQuickTasks).where(eq(socialQuickTasks.id, id));
  }

  async getUserSocialTaskCompletions(userId: string): Promise<string[]> {
    const rows = await db.select().from(userSocialTaskCompletions).where(eq(userSocialTaskCompletions.userId, userId));
    return rows.map(r => r.taskId);
  }

  async completeSocialQuickTask(userId: string, taskId: string): Promise<void> {
    const existing = await db.select().from(userSocialTaskCompletions)
      .where(and(eq(userSocialTaskCompletions.userId, userId), eq(userSocialTaskCompletions.taskId, taskId)));
    if (existing.length === 0) {
      await db.insert(userSocialTaskCompletions).values({ userId, taskId } as any);
    }
  }

  // ── Site Social Links ──────────────────────────────────────────────────────
  async getSiteSocialLinks(activeOnly = false): Promise<SiteSocialLink[]> {
    const rows = activeOnly
      ? await db.select().from(siteSocialLinks).where(eq(siteSocialLinks.isActive, true)).orderBy(siteSocialLinks.sortOrder)
      : await db.select().from(siteSocialLinks).orderBy(siteSocialLinks.sortOrder);
    return rows;
  }

  async createSiteSocialLink(data: InsertSiteSocialLink): Promise<SiteSocialLink> {
    const [row] = await db.insert(siteSocialLinks).values(data as any).returning();
    return row;
  }

  async updateSiteSocialLink(id: string, data: Partial<InsertSiteSocialLink>): Promise<SiteSocialLink> {
    const [row] = await db.update(siteSocialLinks).set({ ...data, updatedAt: new Date() } as any).where(eq(siteSocialLinks.id, id)).returning();
    return row;
  }

  async deleteSiteSocialLink(id: string): Promise<void> {
    await db.delete(siteSocialLinks).where(eq(siteSocialLinks.id, id));
  }

  // ── Admin all transactions paginated ──────────────────────────────────────
  async getAllTransactionsPaginated(limit = 100, offset = 0): Promise<(Transaction & { user?: Partial<User> })[]> {
    const rows = await db
      .select({
        tx: transactions,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          userType: users.userType,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(r => ({ ...r.tx, user: r.user || undefined }));
  }
}

export const storage = new DatabaseStorage();
