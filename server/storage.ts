import {
  users,
  campaigns,
  campaignParticipations,
  transactions,
  blogPosts,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

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
  createPost(id: string, userId: string, content: string, imageUrl?: string): Promise<Post>;
  deletePost(id: string, userId: string): Promise<void>;
  likePost(postId: string, userId: string): Promise<void>;
  unlikePost(postId: string, userId: string): Promise<void>;
  getPostLike(postId: string, userId: string): Promise<boolean>;
  getPostComments(postId: string): Promise<(PostComment & { user: Partial<User> })[]>;
  addPostComment(id: string, postId: string, userId: string, content: string): Promise<PostComment>;
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

    const totalSpent = await db
      .select({ sum: sql<number>`coalesce(sum(${sql.raw('cast(reward as decimal)')}), 0)` })
      .from(campaigns)
      .where(eq(campaigns.brandId, brandId));

    const pendingSubmissions = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskSubmissions)
      .innerJoin(campaigns, eq(taskSubmissions.campaignId, campaigns.id))
      .where(and(eq(campaigns.brandId, brandId), eq(taskSubmissions.status, 'submitted')));

    return {
      totalCampaigns: totalCampaigns[0]?.count || 0,
      activeCampaigns: activeCampaigns[0]?.count || 0,
      totalCreators: totalCreators[0]?.count || 0,
      totalSpent: totalSpent[0]?.sum || 0,
      pendingSubmissions: pendingSubmissions[0]?.count || 0,
      averageRating: 4.8, // Mock for now
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

  async createPost(id: string, userId: string, content: string, imageUrl?: string): Promise<Post> {
    const [post] = await db.insert(posts).values({
      id, userId, content, imageUrl: imageUrl || null,
    }).returning();
    return post;
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

  async getPostComments(postId: string): Promise<(PostComment & { user: Partial<User> })[]> {
    const comments = await db.select().from(postComments).where(eq(postComments.postId, postId)).orderBy(desc(postComments.createdAt));
    const result: (PostComment & { user: Partial<User> })[] = [];
    for (const comment of comments) {
      const [u] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, comment.userId));
      result.push({ ...comment, user: u || {} });
    }
    return result;
  }

  async addPostComment(id: string, postId: string, userId: string, content: string): Promise<PostComment> {
    const [comment] = await db.insert(postComments).values({ id, postId, userId, content }).returning();
    await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, postId));
    return comment;
  }
}

export const storage = new DatabaseStorage();
