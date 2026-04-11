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

  // Social feed operations
  getFeed(limit?: number, offset?: number): Promise<(Post & { user: Partial<User> })[]>;
  getUserPosts(userId: string): Promise<Post[]>;
  createPost(id: string, userId: string, content: string, imageUrl?: string, videoUrl?: string): Promise<Post>;
  updatePost(id: string, userId: string, updates: { content?: string; imageUrl?: string; videoUrl?: string }): Promise<Post>;
  deletePost(id: string, userId: string): Promise<void>;
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

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    return await db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.createdAt));
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

  async addPostTip(postId: string, amount: number): Promise<void> {
    await db.update(posts).set({
      totalTipsReceived: sql`COALESCE(${posts.totalTipsReceived}, 0) + ${amount}`,
    }).where(eq(posts.id, postId));
  }

  async deletePost(id: string, userId: string): Promise<void> {
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, userId)));
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
}

export const storage = new DatabaseStorage();
