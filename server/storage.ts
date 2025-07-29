import {
  users,
  campaigns,
  campaignParticipations,
  transactions,
  blogPosts,
  shopProducts,
  purchases,
  messages,
  taskSubmissions,
  notifications,
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
  type Message,
  type InsertMessage,
  type TaskSubmission,
  type InsertTaskSubmission,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations for custom authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<User>): Promise<User>;
  
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
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction>;
  
  // Blog operations
  getAllBlogPosts(): Promise<BlogPost[]>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  
  // Shop operations
  getAllShopProducts(): Promise<ShopProduct[]>;
  getShopProductById(id: string): Promise<ShopProduct | undefined>;
  createShopProduct(product: InsertShopProduct): Promise<ShopProduct>;
  
  // Purchase operations
  getUserPurchases(userId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, updates: Partial<InsertPurchase>): Promise<Purchase>;
  
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

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
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
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
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

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
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

  // Shop operations
  async getAllShopProducts(): Promise<ShopProduct[]> {
    return await db.select().from(shopProducts).where(eq(shopProducts.isActive, true)).orderBy(desc(shopProducts.createdAt));
  }

  async getShopProductById(id: string): Promise<ShopProduct | undefined> {
    const [product] = await db.select().from(shopProducts).where(eq(shopProducts.id, id));
    return product;
  }

  async createShopProduct(product: InsertShopProduct): Promise<ShopProduct> {
    const [newProduct] = await db.insert(shopProducts).values(product).returning();
    return newProduct;
  }

  // Purchase operations
  async getUserPurchases(userId: string): Promise<Purchase[]> {
    return await db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.createdAt));
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
      .where(and(eq(campaigns.brandId, brandId), eq(taskSubmissions.status, 'pending')));

    return {
      totalCampaigns: totalCampaigns[0]?.count || 0,
      activeCampaigns: activeCampaigns[0]?.count || 0,
      totalCreators: totalCreators[0]?.count || 0,
      totalSpent: totalSpent[0]?.sum || 0,
      pendingSubmissions: pendingSubmissions[0]?.count || 0,
      averageRating: 4.8, // Mock for now
    };
  }
}

export const storage = new DatabaseStorage();
