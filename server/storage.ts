import {
  users,
  campaigns,
  campaignParticipations,
  transactions,
  blogPosts,
  shopProducts,
  purchases,
  messages,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations for custom authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Campaign operations
  getAllCampaigns(): Promise<Campaign[]>;
  getCampaignById(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<InsertCampaign>): Promise<Campaign>;
  
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
  createMessage(message: InsertMessage): Promise<Message>;
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

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
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
      .set({ ...updates, updatedAt: new Date() })
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

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }
}

export const storage = new DatabaseStorage();
