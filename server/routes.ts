import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertCampaignParticipationSchema, insertTransactionSchema, insertPurchaseSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import path from "path";
import express from "express";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - this now includes all auth routes
  setupAuth(app);
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Creator/Influencer discovery route - public, returns all creators with tier info
  app.get('/api/creators', async (req, res) => {
    try {
      const creators = await storage.getCreators();
      res.json(creators);
    } catch (error) {
      console.error("Error fetching creators:", error);
      res.status(500).json({ message: "Failed to fetch creators" });
    }
  });

  // Admin wallets - public read for payment purposes
  app.get('/api/payment-wallets', async (req, res) => {
    try {
      const wallets = await storage.getActiveAdminWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  // Social Feed routes
  app.get('/api/feed', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const feed = await storage.getFeed(limit, offset);
      res.json(feed);
    } catch (error) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.get('/api/users/:userId/posts', async (req, res) => {
    try {
      const posts = await storage.getUserPosts(req.params.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post('/api/posts', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const { content, imageUrl, videoUrl } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      const { nanoid } = await import('nanoid');
      const id = `post_${nanoid()}`;
      const finalImageUrl = req.file ? `/uploads/${req.file.filename}` : imageUrl || null;
      const post = await storage.createPost(id, req.user.id, content.trim(), finalImageUrl, videoUrl || null);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.patch('/api/posts/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const { content, imageUrl, videoUrl } = req.body;
      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;
      else if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (videoUrl !== undefined) updates.videoUrl = videoUrl;
      const post = await storage.updatePost(req.params.id, req.user.id, updates);
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deletePost(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  app.post('/api/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const isLiked = await storage.getPostLike(req.params.id, req.user.id);
      if (isLiked) {
        await storage.unlikePost(req.params.id, req.user.id);
        res.json({ liked: false });
      } else {
        await storage.likePost(req.params.id, req.user.id);
        res.json({ liked: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  app.get('/api/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const liked = await storage.getPostLike(req.params.id, req.user.id);
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check like" });
    }
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const { content, parentId } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      const { nanoid } = await import('nanoid');
      const id = `cmt_${nanoid()}`;
      const comment = await storage.addPostComment(id, req.params.id, req.user.id, content.trim(), parentId);
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // User follow/unfollow routes
  app.get('/api/users/:id/follow', isAuthenticated, async (req: any, res) => {
    try {
      if (req.params.id === req.user.id) return res.json({ following: false });
      const following = await storage.isFollowing(req.user.id, req.params.id);
      res.json({ following });
    } catch (error) {
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });

  app.post('/api/users/:id/follow', isAuthenticated, async (req: any, res) => {
    try {
      if (req.params.id === req.user.id) return res.status(400).json({ message: "Cannot follow yourself" });
      const following = await storage.isFollowing(req.user.id, req.params.id);
      if (following) {
        await storage.unfollowUser(req.user.id, req.params.id);
        res.json({ following: false });
      } else {
        await storage.followUser(req.user.id, req.params.id);
        res.json({ following: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle follow" });
    }
  });

  app.get('/api/users/:id/profile', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Campaign routes
  app.get('/api/campaigns', async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get('/api/campaigns/:id', async (req, res) => {
    try {
      const campaign = await storage.getCampaignById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  // Create new campaign with escrow payment (with optional image upload)
  app.post('/api/campaigns', upload.single('featureImage'), async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = req.user as any;

      // Check if user is a brand
      if (user.userType !== 'brand') {
        return res.status(403).json({ message: "Only brands can create campaigns" });
      }

      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const campaignData = {
        id: campaignId,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        reward: req.body.reward,
        totalSlots: parseInt(req.body.totalSlots),
        deadline: new Date(req.body.deadline),
        requirements: req.body.requirements ? [req.body.requirements] : [], // Convert string to array
        estimatedTime: req.body.estimatedTime,
        brandId: user.id,
        brandName: req.body.brandName || user.companyName || `${user.firstName} ${user.lastName}`,
        featureImage: req.file ? `/uploads/${req.file.filename}` : null,
        status: 'pending_payment',
        paymentStatus: 'pending',
        isActive: false,
        filledSlots: 0,
      };
      
      console.log("Creating campaign with data:", campaignData);
      const campaign = await storage.createCampaign(campaignData);
      console.log("Campaign created:", campaign);
      
      // Create escrow payment session with 30-minute window
      // Add 5% platform fee to total campaign budget
      const totalReward = parseFloat(req.body.reward) * parseInt(req.body.totalSlots);
      const platformFee = totalReward * 0.05;
      const totalAmount = totalReward + platformFee;
      const escrowPaymentData = {
        id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id,
        brandId: user.id,
        amount: totalAmount, // Total campaign budget + 5% platform fee
        status: 'payment_window',
        paymentWindowStart: new Date(),
        paymentWindowEnd: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };
      
      console.log("Creating escrow payment with data:", escrowPaymentData);
      const escrowPayment = await storage.createEscrowPayment(escrowPaymentData);
      console.log("Escrow payment created:", escrowPayment);

      res.status(201).json({ 
        success: true,
        campaign, 
        campaignId: campaign.id,
        escrowPaymentId: escrowPayment.id 
      });
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign", error: (error as Error).message });
    }
  });

  // Update campaign
  app.patch('/api/campaigns/:id', isAuthenticated, upload.single('featureImage'), async (req: any, res) => {
    try {
      const requesterId = req.user.id;
      const requester = await storage.getUser(requesterId);
      const campaignId = req.params.id;

      const campaign = await storage.getCampaignById(campaignId);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });

      const isAdmin = requester?.userType === 'admin';
      const isBrandOwner = campaign.brandId === requesterId;

      if (!isAdmin && !isBrandOwner) {
        return res.status(403).json({ message: "You can only edit your own campaigns" });
      }

      const updates = { ...req.body };
      // Brands cannot change the reward/amount — only admins can
      if (!isAdmin) {
        delete updates.reward;
        delete updates.totalSlots;
      } else {
        if (updates.reward) updates.reward = parseFloat(updates.reward);
        if (updates.totalSlots) updates.totalSlots = parseInt(updates.totalSlots);
      }
      if (req.file) updates.featureImage = `/uploads/${req.file.filename}`;

      const updatedCampaign = await storage.updateCampaign(campaignId, updates);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // Delete campaign
  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const campaignId = req.params.id;
      
      const campaign = await storage.getCampaignById(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      await storage.deleteCampaign(campaignId);
      res.json({ success: true, message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Escrow Payment System
  app.get('/api/escrow-payment/:campaignId', async (req, res) => {
    try {
      const campaignId = req.params.campaignId;
      const escrowPayment = await storage.getEscrowPaymentByCampaignId(campaignId);
      
      if (!escrowPayment) {
        return res.status(404).json({ message: "Escrow payment not found" });
      }

      // Calculate remaining time
      const now = new Date();
      const endTime = new Date(escrowPayment.paymentWindowEnd);
      const remainingMinutes = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60)));

      // Check if payment window expired
      if (remainingMinutes === 0 && escrowPayment.status === 'payment_window') {
        await storage.updateEscrowPayment(escrowPayment.id, { status: 'expired' });
        escrowPayment.status = 'expired';
      }

      // Company wallet addresses (these should be environment variables in production)
      const walletAddresses = {
        usdtTron: "TYDz8p6QHrEYBMBnUMEUXojFSCShbxfPDN", // Example Tron USDT address
        usdtBsc: "0x742d35Cc6531C0532925a3b8F6D09f8888E8ec12", // Example BSC USDT address  
        ton: "EQCs2dE-1Qn1kzZGNE8Q8n3Q8FJHbA9HqH5YZrO8kF5-J8gU" // Example TON address
      };

      res.json({
        ...escrowPayment,
        paymentWindow: {
          startTime: escrowPayment.paymentWindowStart,
          endTime: escrowPayment.paymentWindowEnd,
          remainingMinutes
        },
        walletAddresses
      });
    } catch (error) {
      console.error("Error fetching escrow payment:", error);
      res.status(500).json({ message: "Failed to fetch escrow payment" });
    }
  });

  app.post('/api/escrow-payment/submit-proof', upload.single('paymentScreenshot'), async (req, res) => {
    try {
      const { transactionHash, network, campaignId } = req.body;
      const paymentScreenshot = req.file?.path;

      if (!transactionHash || !network || !campaignId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get escrow payment
      const escrowPayment = await storage.getEscrowPaymentByCampaignId(campaignId);
      if (!escrowPayment) {
        return res.status(404).json({ message: "Escrow payment not found" });
      }

      // Check if still within payment window
      const now = new Date();
      const endTime = new Date(escrowPayment.paymentWindowEnd);
      if (now > endTime) {
        return res.status(400).json({ message: "Payment window has expired" });
      }

      // Update escrow payment with proof
      await storage.updateEscrowPayment(escrowPayment.id, {
        status: 'verifying',
        transactionHash,
        network,
        paymentScreenshot,
        submittedAt: new Date()
      });

      // Create transaction record for admin verification
      await storage.createTransaction({
        userId: escrowPayment.brandId,
        campaignId: campaignId,
        amount: escrowPayment.amount,
        type: 'campaign_deposit',
        status: 'pending',
        transactionHash,
        network,
        description: `Campaign escrow deposit for campaign ${campaignId}`,
      });

      res.json({ 
        success: true, 
        message: "Payment proof submitted successfully. Your payment is being verified." 
      });
    } catch (error) {
      console.error("Error submitting payment proof:", error);
      res.status(500).json({ message: "Failed to submit payment proof" });
    }
  });

  // Campaign participation routes
  app.post('/api/campaigns/:id/join', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.id;
      const campaignId = req.params.id;
      
      // Check if user already joined
      const existingParticipations = await storage.getUserParticipations(userId);
      const alreadyJoined = existingParticipations.some(p => p.campaignId === campaignId);
      
      if (alreadyJoined) {
        return res.status(400).json({ message: "Already joined this campaign" });
      }

      const participation = await storage.createParticipation({
        userId,
        campaignId,
        status: "pending"
      });

      res.json(participation);
    } catch (error) {
      console.error("Error joining campaign:", error);
      res.status(500).json({ message: "Failed to join campaign" });
    }
  });

  app.post('/api/campaigns/:id/submit', upload.array('files'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = req.params.id;
      
      const validatedData = insertCampaignParticipationSchema.parse({
        userId,
        campaignId,
        submissionText: req.body.description,
        submissionUrl: req.body.url,
        submittedAt: new Date(),
        status: "pending"
      });

      // Handle file uploads
      if (req.files && req.files.length > 0) {
        validatedData.submissionFiles = req.files.map((file: any) => file.path);
      }

      const participation = await storage.createParticipation(validatedData);
      res.json(participation);
    } catch (error) {
      console.error("Error submitting task:", error);
      res.status(500).json({ message: "Failed to submit task" });
    }
  });

  // User profile routes
  app.get('/api/users/:id/participations', async (req, res) => {
    try {
      const participations = await storage.getUserParticipations(req.params.id);
      res.json(participations);
    } catch (error) {
      console.error("Error fetching participations:", error);
      res.status(500).json({ message: "Failed to fetch participations" });
    }
  });

  // Get current user's participations
  app.get('/api/participations', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const participations = await storage.getUserParticipations(req.user.id);
      res.json(participations);
    } catch (error) {
      console.error("Error fetching participations:", error);
      res.status(500).json({ message: "Failed to fetch participations" });
    }
  });

  // Get user campaigns for messaging
  app.get('/api/user/campaigns', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const user = req.user;
      
      if (user.userType === 'brand') {
        // Get campaigns created by the brand
        const campaigns = await storage.getBrandCampaigns(userId);
        res.json(campaigns);
      } else {
        // Get campaigns the creator has participated in (approved ones for messaging)
        const participations = await storage.getUserParticipations(userId);
        const approvedParticipations = participations.filter(p => p.status === 'approved');
        
        // Get campaign details for each participation
        const campaignPromises = approvedParticipations.map(async (p) => {
          const campaign = await storage.getCampaignById(p.campaignId);
          return campaign;
        });
        
        const campaigns = await Promise.all(campaignPromises);
        res.json(campaigns.filter(Boolean));
      }
    } catch (error) {
      console.error("Error fetching user campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Get potential message recipients based on user role
  app.get('/api/message-recipients', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const user = req.user;
      
      if (user.userType === 'brand') {
        // Brands can message creators who have participated in their campaigns
        const campaigns = await storage.getBrandCampaigns(userId);
        const recipientSet = new Set();
        const recipients = [];
        
        for (const campaign of campaigns) {
          const participations = await storage.getCampaignParticipations(campaign.id);
          for (const participation of participations) {
            if (!recipientSet.has(participation.userId)) {
              recipientSet.add(participation.userId);
              const creator = await storage.getUserById(participation.userId);
              if (creator) {
                recipients.push({
                  id: creator.id,
                  firstName: creator.firstName,
                  lastName: creator.lastName,
                  email: creator.email,
                  userType: creator.userType
                });
              }
            }
          }
        }
        res.json(recipients);
      } else {
        // Creators can message brands of campaigns they've participated in
        const participations = await storage.getUserParticipations(userId);
        const recipientSet = new Set();
        const recipients = [];
        
        for (const participation of participations) {
          const campaign = await storage.getCampaignById(participation.campaignId);
          if (campaign && !recipientSet.has(campaign.brandId)) {
            recipientSet.add(campaign.brandId);
            const brand = await storage.getUserById(campaign.brandId);
            if (brand) {
              recipients.push({
                id: brand.id,
                firstName: brand.firstName,
                lastName: brand.lastName,
                companyName: brand.companyName,
                email: brand.email,
                userType: brand.userType
              });
            }
          }
        }
        res.json(recipients);
      }
    } catch (error) {
      console.error("Error fetching message recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  app.get('/api/users/:id/transactions', async (req, res) => {
    try {
      const transactions = await storage.getUserTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Profile management routes
  app.patch('/api/users/:id/profile', async (req, res) => {
    try {
      const userId = req.params.id;
      const updates = req.body;
      
      const updatedUser = await storage.updateUserProfile(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin routes
  app.get('/api/admin/participations', async (req, res) => {
    try {
      const participations = await storage.getAllParticipations();
      res.json(participations);
    } catch (error) {
      console.error("Error fetching all participations:", error);
      res.status(500).json({ message: "Failed to fetch participations" });
    }
  });

  app.patch('/api/admin/profile', async (req, res) => {
    try {
      const updates = req.body;
      // For demo purposes, we'll use a mock admin update
      res.json({ success: true, message: "Admin profile updated" });
    } catch (error) {
      console.error("Error updating admin profile:", error);
      res.status(500).json({ message: "Failed to update admin profile" });
    }
  });

  app.post('/api/admin/change-password', async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      // For demo purposes, we'll mock password change
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Transaction routes
  app.post('/api/transactions', async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        userId
      });

      const transaction = await storage.createTransaction(validatedData);
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Blog routes
  app.get('/api/blog', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const posts = category
        ? await storage.getBlogPostsByCategory(category)
        : await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get('/api/blog/:slug', async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Blog post not found" });
      // Increment view count
      await storage.incrementBlogViews(post.id);
      // Get comments count and likes count from DB
      res.json({ ...post, viewCount: (post.viewCount || 0) + 1 });
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // Blog likes
  app.get('/api/blog/:slug/like', isAuthenticated, async (req: any, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const liked = await storage.getBlogLike(post.id, req.user.id);
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check like" });
    }
  });

  app.post('/api/blog/:slug/like', isAuthenticated, async (req: any, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const liked = await storage.getBlogLike(post.id, req.user.id);
      if (liked) {
        await storage.unlikeBlogPost(post.id, req.user.id);
        res.json({ liked: false });
      } else {
        await storage.likeBlogPost(post.id, req.user.id);
        res.json({ liked: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Blog comments
  app.get('/api/blog/:slug/comments', async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const comments = await storage.getBlogComments(post.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/blog/:slug/comments', isAuthenticated, async (req: any, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const { content, parentId } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content required" });
      const comment = await storage.addBlogComment(post.id, req.user.id, content.trim(), parentId);
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Blog category follow
  app.get('/api/blog/category/:category/follow', isAuthenticated, async (req: any, res) => {
    try {
      const following = await storage.getBlogCategoryFollow(req.user.id, req.params.category);
      res.json({ following });
    } catch (error) {
      res.status(500).json({ message: "Failed to check follow" });
    }
  });

  app.post('/api/blog/category/:category/follow', isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.params;
      const following = await storage.getBlogCategoryFollow(req.user.id, category);
      if (following) {
        await storage.unfollowBlogCategory(req.user.id, category);
        res.json({ following: false });
      } else {
        await storage.followBlogCategory(req.user.id, category);
        res.json({ following: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle follow" });
    }
  });

  // Note: Shop routes moved to dedicated section below for better organization

  // Purchase routes
  app.post('/api/purchases', upload.single('paymentProof'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPurchaseSchema.parse({
        ...req.body,
        userId,
        paymentProof: req.file?.path
      });

      const purchase = await storage.createPurchase(validatedData);
      res.json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  app.get('/api/users/:id/purchases', async (req, res) => {
    try {
      const purchases = await storage.getUserPurchases(req.params.id);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Get brand campaigns for messaging dropdown
  app.get('/api/user/campaigns', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const campaigns = await storage.getBrandCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching user campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Enhanced messaging routes for brand-creator communication
  app.get('/api/messages', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const messages = await storage.getUserMessages(userId);
      
      // Enrich messages with sender and receiver information
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUserById(message.senderId);
          const receiver = await storage.getUserById(message.receiverId);
          return {
            ...message,
            sender: sender ? {
              id: sender.id,
              firstName: sender.firstName,
              lastName: sender.lastName,
              companyName: sender.companyName,
              userType: sender.userType,
              username: sender.username,
              profileImageUrl: sender.profileImageUrl,
            } : null,
            receiver: receiver ? {
              id: receiver.id,
              firstName: receiver.firstName,
              lastName: receiver.lastName,
              companyName: receiver.companyName,
              userType: receiver.userType,
              username: receiver.username,
              profileImageUrl: receiver.profileImageUrl,
            } : null,
          };
        })
      );
      
      res.json(enrichedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get('/api/campaigns/:campaignId/messages', async (req, res) => {
    try {
      const messages = await storage.getCampaignMessages(req.params.campaignId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching campaign messages:", error);
      res.status(500).json({ message: "Failed to fetch campaign messages" });
    }
  });

  app.post('/api/messages', upload.array('attachments'), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const { campaignId, participationId, receiverId, subject, content, messageType } = req.body;
      const files = req.files as Express.Multer.File[];
      
      const attachments = files ? files.map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
      })) : [];

      const message = await storage.createMessage({
        campaignId: campaignId || null,
        participationId: participationId || null,
        senderId: userId,
        receiverId,
        subject,
        content,
        messageType: messageType || 'general',
        attachments
      });

      // Create notification for receiver
      await storage.createNotification({
        userId: receiverId,
        type: 'message',
        title: subject || 'New Message',
        content: `You have a new message from ${(req as any).user?.firstName}`,
        actionUrl: `/messages`,
        relatedId: message.id,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Task submission routes
  app.get('/api/task-submissions', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const submissions = await storage.getUserTaskSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching task submissions:", error);
      res.status(500).json({ message: "Failed to fetch task submissions" });
    }
  });

  app.get('/api/campaigns/:campaignId/submissions', async (req, res) => {
    try {
      const submissions = await storage.getCampaignTaskSubmissions(req.params.campaignId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching campaign submissions:", error);
      res.status(500).json({ message: "Failed to fetch campaign submissions" });
    }
  });

  app.post('/api/task-submissions', upload.array('files'), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const { campaignId, participationId, title, description, proofUrls } = req.body;
      const files = req.files as Express.Multer.File[];
      
      const screenshots = files?.filter(f => f.mimetype.startsWith('image/')).map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype
      })) || [];

      const additionalFiles = files?.filter(f => !f.mimetype.startsWith('image/')).map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype
      })) || [];

      const submission = await storage.createTaskSubmission({
        campaignId,
        participationId,
        userId,
        title,
        description,
        proofUrls: JSON.parse(proofUrls || '[]'),
        screenshots,
        additionalFiles,
      });

      res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating task submission:", error);
      res.status(500).json({ message: "Failed to submit task" });
    }
  });

  // Task approval and payment routes
  app.patch('/api/task-submissions/:id/approve', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const { notes } = req.body;
      const submission = await storage.approveTaskSubmission(req.params.id, userId, notes);

      // Create transaction for payment
      const campaign = await storage.getCampaignById(submission.campaignId);
      if (campaign) {
        const transaction = await storage.createTransaction({
          userId: submission.userId,
          campaignId: submission.campaignId,
          participationId: submission.participationId,
          amount: campaign.reward.toString(),
          type: 'campaign_reward',
          description: `Reward for completing "${campaign.title}"`,
        });

        // Approve payment and update user balance
        await storage.approvePayment(transaction.id, userId);

        // Notify creator of approval and payment
        await storage.createNotification({
          userId: submission.userId,
          type: 'task_approved',
          title: 'Task Approved & Payment Sent',
          content: `Your submission for "${campaign.title}" has been approved. $${campaign.reward} has been added to your wallet.`,
          actionUrl: `/wallet`,
          relatedId: submission.id,
        });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error approving task submission:", error);
      res.status(500).json({ message: "Failed to approve task submission" });
    }
  });

  app.patch('/api/task-submissions/:id/reject', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const { notes } = req.body;
      if (!notes) return res.status(400).json({ message: "Rejection notes are required" });

      const submission = await storage.rejectTaskSubmission(req.params.id, userId, notes);

      // Notify creator of rejection
      const campaign = await storage.getCampaignById(submission.campaignId);
      if (campaign) {
        await storage.createNotification({
          userId: submission.userId,
          type: 'task_rejected',
          title: 'Task Submission Rejected',
          content: `Your submission for "${campaign.title}" needs revision. Check the feedback and resubmit.`,
          actionUrl: `/campaigns/${submission.campaignId}`,
          relatedId: submission.id,
        });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error rejecting task submission:", error);
      res.status(500).json({ message: "Failed to reject task submission" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Brand-specific routes
  app.get('/api/campaigns/brand/:brandId', async (req, res) => {
    try {
      const campaigns = await storage.getCampaignsByBrand(req.params.brandId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching brand campaigns:", error);
      res.status(500).json({ message: "Failed to fetch brand campaigns" });
    }
  });

  // Campaign editing route with image upload
  app.patch('/api/campaigns/:id', upload.single('featuredImage'), async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const campaignId = req.params.id;
      const updates = req.body;

      // Check if user owns this campaign
      const campaign = await storage.getCampaignById(campaignId);
      if (!campaign || campaign.brandId !== userId) {
        return res.status(403).json({ message: "You can only edit your own campaigns" });
      }

      // Add uploaded image to updates if present
      if (req.file) {
        updates.featuredImage = `/uploads/${req.file.filename}`;
      }

      // Convert string numbers back to numbers
      if (updates.reward) updates.reward = parseFloat(updates.reward);
      if (updates.totalSlots) updates.totalSlots = parseInt(updates.totalSlots);

      const updatedCampaign = await storage.updateCampaign(campaignId, updates);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // Delete campaign route
  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const campaignId = req.params.id;

      // Check if user owns this campaign
      const campaign = await storage.getCampaignById(campaignId);
      if (!campaign || campaign.brandId !== userId) {
        return res.status(403).json({ message: "You can only delete your own campaigns" });
      }

      await storage.deleteCampaign(campaignId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  app.get('/api/brand/submissions', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const submissions = await storage.getBrandTaskSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching brand submissions:", error);
      res.status(500).json({ message: "Failed to fetch brand submissions" });
    }
  });

  app.get('/api/brand/applications', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const applications = await storage.getBrandCampaignApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching brand applications:", error);
      res.status(500).json({ message: "Failed to fetch brand applications" });
    }
  });

  app.patch('/api/participations/:id/approve', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const participation = await storage.updateParticipation(req.params.id, { 
        status: 'approved',
        reviewedAt: new Date() 
      });

      // Create notification for creator
      await storage.createNotification({
        userId: participation.userId,
        type: 'application_approved',
        title: 'Campaign Application Approved!',
        content: 'Your campaign application has been approved. You can now start working on the tasks.',
        actionUrl: `/campaigns/${participation.campaignId}`,
        relatedId: participation.id,
      });

      res.json(participation);
    } catch (error) {
      console.error("Error approving application:", error);
      res.status(500).json({ message: "Failed to approve application" });
    }
  });

  app.patch('/api/participations/:id/reject', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const { reason } = req.body;
      const participation = await storage.updateParticipation(req.params.id, { 
        status: 'rejected',
        adminNotes: reason,
        reviewedAt: new Date() 
      });

      // Create notification for creator
      await storage.createNotification({
        userId: participation.userId,
        type: 'application_rejected',
        title: 'Campaign Application Update',
        content: `Your campaign application was not approved. ${reason ? `Reason: ${reason}` : ''}`,
        actionUrl: `/campaigns/${participation.campaignId}`,
        relatedId: participation.id,
      });

      res.json(participation);
    } catch (error) {
      console.error("Error rejecting application:", error);
      res.status(500).json({ message: "Failed to reject application" });
    }
  });

  app.get('/api/brand/stats', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const stats = await storage.getBrandStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching brand stats:", error);
      res.status(500).json({ message: "Failed to fetch brand stats" });
    }
  });

  // User profile update endpoint for wallet addresses
  app.patch("/api/users/:userId/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.id !== req.params.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const updates = { ...req.body };

      // Auto-calculate totalFollowers and creatorTier
      const followerFields = ['tiktokFollowers', 'youtubeFollowers', 'instagramFollowers', 'twitterFollowers', 'twitchFollowers', 'telegramFollowers', 'whatsappFollowers'];
      const existingUser = await storage.getUser(req.params.userId);
      
      let totalFollowers = 0;
      for (const field of followerFields) {
        const val = updates[field] !== undefined ? parseInt(updates[field]) || 0 : (existingUser as any)?.[field] || 0;
        totalFollowers += val;
      }
      
      updates.totalFollowers = totalFollowers;

      if (totalFollowers >= 1_000_000) updates.creatorTier = 'global_titans';
      else if (totalFollowers >= 100_000) updates.creatorTier = 'power_influencers';
      else if (totalFollowers >= 10_000) updates.creatorTier = 'growth_engines';
      else updates.creatorTier = 'rising_sparks';

      const updatedUser = await storage.updateUserProfile(req.params.userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Payment deposit routes
  app.post('/api/payment-deposits', upload.single('paymentProof'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const depositData = {
        campaignId: req.body.campaignId,
        brandId: userId,
        amount: req.body.amount,
        network: req.body.network,
        walletAddress: req.body.walletAddress,
        transactionHash: req.body.transactionHash,
        paymentProof: req.file?.path,
        notes: req.body.notes,
        timerExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        status: 'submitted'
      };

      const deposit = await storage.createPaymentDeposit(depositData);
      res.status(201).json(deposit);
    } catch (error) {
      console.error("Error creating payment deposit:", error);
      res.status(500).json({ message: "Failed to create payment deposit" });
    }
  });



  // Admin user management routes
  app.get('/api/admin/users', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, password, firstName, lastName, userType, isVerified } = req.body;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await storage.createUser({
        id: nanoid(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        userType,
        isVerified,
      });

      // Remove password from response
      const { password: _, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/admin/users/:id', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updatedUser = await storage.updateUser(req.params.id, req.body);
      const { password: _, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const admin = await storage.getUser(userId);
      if (!admin || admin.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const targetId = req.params.id;
      if (targetId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(targetId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch('/api/admin/users/:id/reset-password', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await storage.updateUser(req.params.id, { password: hashedPassword });
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.patch('/api/admin/users/:id/verification', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { isVerified } = req.body;
      const updatedUser = await storage.updateUser(req.params.id, { isVerified });
      const { password: _, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Error updating verification:", error);
      res.status(500).json({ message: "Failed to update verification" });
    }
  });

  // Admin wallet routes
  app.get('/api/admin/wallets/escrow', async (req, res) => {
    try {
      const wallets = await storage.getAdminWalletsByPurpose('escrow');
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching admin wallets:", error);
      res.status(500).json({ message: "Failed to fetch admin wallets" });
    }
  });

  app.put('/api/admin/wallets/:type', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { type } = req.params;
      const { address } = req.body;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ message: 'Valid wallet address is required' });
      }

      // For now, we'll just simulate success since wallet management is stored in memory
      // In a real implementation, this would update the database
      res.json({ 
        success: true, 
        message: `${type.toUpperCase()} wallet address updated successfully`,
        type,
        address 
      });
    } catch (error) {
      console.error('Error updating wallet address:', error);
      res.status(500).json({ message: 'Failed to update wallet address' });
    }
  });

  // Admin routes (protected)
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Admin: get ALL blog posts including drafts
  app.get('/api/admin/blog', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Access denied' });
      const allPosts = await storage.getAllBlogPostsAdmin ? (storage as any).getAllBlogPostsAdmin() : storage.getAllBlogPosts();
      res.json(await allPosts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  app.post('/api/admin/blog', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      const { title, content, isPublished, status, category, featuredImage, slug, excerpt, tags, metaDescription, seoKeywords, readingTime } = req.body;
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });
      const shouldPublish = isPublished === true || isPublished === 'true' || status === 'published';
      const autoSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      const blogPost = await storage.createBlogPost({
        title,
        content,
        isPublished: shouldPublish,
        authorId: userId,
        slug: autoSlug,
        excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        category: category || 'general',
        featuredImage: featuredImage || null,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        publishedAt: shouldPublish ? new Date() : null,
        metaDescription: metaDescription || null,
        seoKeywords: seoKeywords || null,
        readingTime: readingTime || 5,
      });
      res.status(201).json(blogPost);
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ message: 'Failed to create blog post' });
    }
  });

  // Update blog post
  app.put('/api/admin/blog/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Access denied' });
      const { title, content, isPublished, category, featuredImage, excerpt, tags } = req.body;
      const updated = await storage.updateBlogPost(req.params.id, {
        title, content, category, featuredImage, excerpt,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        isPublished: isPublished === true || isPublished === 'true',
        publishedAt: (isPublished === true || isPublished === 'true') ? new Date() : null,
      } as any);
      res.json(updated);
    } catch (error) {
      console.error('Error updating blog post:', error);
      res.status(500).json({ message: 'Failed to update blog post' });
    }
  });

  app.put('/api/admin/users/:id/verification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { id } = req.params;
      const { verified } = req.body;
      
      await storage.updateUserVerification(id, verified);
      res.json({ message: 'User verification updated successfully' });
    } catch (error) {
      console.error('Error updating user verification:', error);
      res.status(500).json({ message: 'Failed to update user verification' });
    }
  });

  app.put('/api/admin/payments/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { id } = req.params;
      const { status } = req.body;
      
      await storage.updateTransactionStatus(id, status);

      // If approved, also activate the associated campaign
      if (status === 'completed' || status === 'approved') {
        const [txn] = await (async () => {
          try {
            const { db } = await import('./db');
            const { transactions } = await import('../shared/schema');
            const { eq } = await import('drizzle-orm');
            return await db.select().from(transactions).where(eq(transactions.id, id));
          } catch { return [null]; }
        })();
        if (txn && (txn as any)?.campaignId) {
          await storage.updateCampaign((txn as any).campaignId, { isActive: true, status: 'active' } as any);
        }
      }

      res.json({ message: 'Payment status updated successfully' });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  });

  // Admin: platform stats (real-time)
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Access denied' });
      const allUsers = await storage.getAllUsers ? (await (storage as any).getAllUsers()) : [];
      const allCampaigns = await (storage as any).getAllCampaignsAdmin();
      const allTransactions = await storage.getAllTransactions();
      const allEscrow = await (storage as any).getAllEscrowPayments();
      const activeCampaigns = allCampaigns.filter((c: any) => c.isActive && c.status === 'active');
      const totalRevenue = allEscrow
        .filter((e: any) => e.status === 'verified')
        .reduce((sum: number, e: any) => sum + parseFloat(e.amount || '0'), 0);
      const pendingEscrow = allEscrow.filter((e: any) => e.status === 'verifying' || e.status === 'submitted');
      const creators = allUsers.filter((u: any) => u.userType === 'creator');
      const brands = allUsers.filter((u: any) => u.userType === 'brand');
      const totalRewardsDistributed = allTransactions
        .filter((t: any) => t.type === 'reward' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
      res.json({
        totalUsers: allUsers.length,
        totalCreators: creators.length,
        totalBrands: brands.length,
        totalCampaigns: allCampaigns.length,
        activeCampaigns: activeCampaigns.length,
        pendingCampaigns: allCampaigns.filter((c: any) => c.status === 'pending_payment').length,
        totalRevenue: totalRevenue.toFixed(2),
        totalRewardsDistributed: totalRewardsDistributed.toFixed(2),
        pendingPayments: pendingEscrow.length,
        verifiedPayments: allEscrow.filter((e: any) => e.status === 'verified').length,
        totalTransactions: allTransactions.length,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      const campaigns = await (storage as any).getAllCampaignsAdmin();
      // Enrich with escrow payment info
      const enriched = await Promise.all(campaigns.map(async (c: any) => {
        const escrow = await storage.getEscrowPaymentByCampaignId(c.id);
        return { ...c, escrowPayment: escrow || null };
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching admin campaigns:', error);
      res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
  });

  // Admin: get all escrow payments
  app.get('/api/admin/escrow-payments', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Access denied' });
      const payments = await (storage as any).getAllEscrowPayments();
      // Enrich with campaign and brand info
      const enriched = await Promise.all(payments.map(async (p: any) => {
        const campaign = await storage.getCampaignById(p.campaignId);
        const brand = p.brandId ? await storage.getUser(p.brandId) : null;
        return { ...p, campaign, brandEmail: brand?.email, brandName: brand?.firstName };
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching escrow payments:', error);
      res.status(500).json({ message: 'Failed to fetch escrow payments' });
    }
  });

  // Admin: approve escrow payment → activate campaign
  app.put('/api/admin/escrow-payments/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Access denied' });
      const escrow = await (storage as any).getEscrowPaymentById(req.params.id);
      if (!escrow) return res.status(404).json({ message: 'Escrow payment not found' });
      // Mark escrow as verified
      await storage.updateEscrowPayment(escrow.id, { status: 'verified', verifiedAt: new Date(), verifiedBy: req.user.id });
      // Activate campaign
      const activatedCampaign = await storage.updateCampaign(escrow.campaignId, { isActive: true, status: 'active', paymentStatus: 'completed' } as any);
      const { nanoid } = await import('nanoid');
      // Notify brand
      await storage.createNotification({
        id: `notif_${nanoid()}`,
        userId: escrow.brandId,
        type: 'payment_received',
        title: '🎉 Campaign Activated!',
        message: 'Your payment has been verified. Your campaign is now live and influencers can join.',
        actionUrl: '/brand-dashboard',
        isRead: false,
      } as any);
      // Notify all creators about new campaign
      const allCreators = await storage.getAllCreators();
      const campaignTitle = (activatedCampaign as any)?.title || 'New Campaign';
      for (const creator of allCreators) {
        try {
          await storage.createNotification({
            id: `notif_${nanoid()}`,
            userId: creator.id,
            type: 'new_campaign',
            title: '🚀 New Campaign Available!',
            message: `A new campaign "${campaignTitle}" is now live. Join and earn crypto rewards!`,
            actionUrl: '/campaigns',
            isRead: false,
          } as any);
        } catch (e) { /* continue */ }
      }
      res.json({ success: true, message: 'Campaign activated and creators notified' });
    } catch (error) {
      console.error('Error approving escrow payment:', error);
      res.status(500).json({ message: 'Failed to approve payment' });
    }
  });

  // Admin: reject escrow payment
  app.put('/api/admin/escrow-payments/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Access denied' });
      const { reason } = req.body;
      const escrow = await (storage as any).getEscrowPaymentById(req.params.id);
      if (!escrow) return res.status(404).json({ message: 'Escrow payment not found' });
      await storage.updateEscrowPayment(escrow.id, { status: 'rejected' });
      const { nanoid } = await import('nanoid');
      await storage.createNotification({
        id: `notif_${nanoid()}`,
        userId: escrow.brandId,
        type: 'task_rejected',
        title: '❌ Payment Rejected',
        message: reason || 'Your payment proof was rejected. Please resubmit with a valid transaction hash.',
        actionUrl: `/escrow-payment?campaignId=${escrow.campaignId}`,
        isRead: false,
      } as any);
      res.json({ success: true, message: 'Payment rejected' });
    } catch (error) {
      console.error('Error rejecting escrow payment:', error);
      res.status(500).json({ message: 'Failed to reject payment' });
    }
  });

  app.get('/api/admin/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching admin transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // Brand profile routes

  app.post('/api/users/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const brandId = req.params.id;
      
      // In a real implementation, this would add/remove the like relationship
      // For now, we'll just return success
      res.json({ success: true, message: 'Like status updated' });
    } catch (error) {
      console.error('Error updating like status:', error);
      res.status(500).json({ message: 'Failed to update like status' });
    }
  });

  // Tip a user — creates a pending crypto tip transaction
  app.post('/api/users/:id/tip', isAuthenticated, upload.single('proofFile'), async (req: any, res) => {
    try {
      const senderId = req.user.id;
      const recipientId = req.params.id;
      if (senderId === recipientId) return res.status(400).json({ message: "Cannot tip yourself" });

      const recipient = await storage.getUser(recipientId);
      if (!recipient) return res.status(404).json({ message: "User not found" });

      const { amount, network, txHash } = req.body;
      const tipAmount = parseFloat(amount);
      if (!tipAmount || tipAmount <= 0) return res.status(400).json({ message: "Invalid tip amount" });

      // Record as a transaction (pending review)
      await storage.createTransaction({
        userId: recipientId,
        type: 'tip_received',
        amount: tipAmount.toString(),
        network: network || null,
        description: `Tip from ${req.user.firstName || 'Anonymous'} via ${network || 'crypto'}`,
        status: 'pending',
        transactionHash: txHash || null,
      });

      res.json({ success: true, message: "Tip submitted for review" });
    } catch (error) {
      console.error("Error processing tip:", error);
      res.status(500).json({ message: "Failed to process tip" });
    }
  });

  // Get user's wallet address for tipping
  app.get('/api/users/:id/wallet', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({
        usdtTronWallet: (user as any).usdtTronWallet || null,
        usdtBscWallet: (user as any).usdtBscWallet || null,
        tonWallet: (user as any).tonWallet || null,
        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  app.get('/api/brand/reviews/:brandId', async (req, res) => {
    try {
      const reviews = await storage.getUserReviews(req.params.brandId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching brand reviews:', error);
      res.status(500).json({ message: 'Failed to fetch brand reviews' });
    }
  });

  app.post('/api/brand/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const { brandId, rating, comment } = req.body;
      const review = await storage.createUserReview({
        revieweeId: brandId,
        reviewerId: req.user.id,
        rating: parseInt(rating),
        comment,
      });
      res.json(review);
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  // Delete blog post
  app.delete('/api/admin/blog/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBlogPost(req.params.id);
      res.status(200).json({ message: 'Blog post deleted successfully' });
    } catch (error) {
      console.error('Error deleting blog post:', error);
      res.status(500).json({ message: 'Failed to delete blog post' });
    }
  });

  // (duplicate delete user route removed — see /api/admin/users/:id above)

  app.put('/api/admin/users/:id/reset-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { id } = req.params;
      const { newPassword } = req.body;
      await storage.resetUserPassword(id, newPassword);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { id } = req.params;
      const updates = req.body;
      const updatedUser = await storage.updateUserProfile(id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Shop API Routes - Specific routes must come before parameterized routes
  
  // Static routes first (most specific)
  app.get('/api/shop/products/featured', async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching featured products:", error);
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get('/api/shop/products/category/:category', async (req, res) => {
    try {
      const products = await storage.getProductsByCategory(req.params.category);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Base products route (no parameters) - second most specific
  app.get('/api/shop/products', async (req, res) => {
    try {
      const products = await storage.getAllShopProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching shop products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Parameterized routes last (least specific)
  app.get('/api/shop/products/:id', async (req, res) => {
    try {
      const product = await storage.getShopProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.get('/api/shop/products/:id/reviews', async (req, res) => {
    try {
      const reviews = await storage.getProductReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/shop/products/:id/reviews', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { rating, comment, title } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const review = await storage.createProductReview({
        productId: req.params.id,
        userId: user.id,
        rating,
        title,
        comment,
        isVerified: false, // TODO: Check if user actually purchased the product
      });

      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Shop purchase route
  app.post('/api/shop/purchase', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { productId, amount, currency, network, paymentProof, transactionHash } = req.body;

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const product = await storage.getShopProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Validate payment for non-free products
      if (!product.isFree) {
        if (!paymentProof || !paymentProof.trim()) {
          return res.status(400).json({ message: "Payment proof is required for paid products" });
        }
        
        if (parseFloat(amount) !== parseFloat(product.price)) {
          return res.status(400).json({ message: "Payment amount doesn't match product price" });
        }
      }

      const purchase = await storage.createPurchase({
        userId: user.id,
        productId,
        amount: amount || "0",
        totalAmount: amount || "0",

        paymentProof: paymentProof || "FREE_PRODUCT",
        transactionHash: transactionHash || "",
        status: product.isFree ? "approved" : "pending",
      });

      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  app.get('/api/shop/purchase/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const purchase = await storage.getPurchaseById(req.params.id);
      
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      // Only allow user to view their own purchases or admin to view all
      if (purchase.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(purchase);
    } catch (error) {
      console.error("Error fetching purchase:", error);
      res.status(500).json({ message: "Failed to fetch purchase" });
    }
  });

  // Admin shop routes
  app.get('/api/admin/shop/products', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all products including inactive ones for admin
      const products = await storage.getAllShopProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching admin products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/admin/shop/products', isAuthenticated, upload.single('featuredImage'), async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productData = {
        ...req.body,
        price: req.body.price.toString(),
        originalPrice: req.body.originalPrice ? req.body.originalPrice.toString() : undefined,
        featuredImage: req.file ? `/uploads/${req.file.filename}` : req.body.featuredImage,
        createdBy: user.id,
        galleryImages: Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [],
        features: Array.isArray(req.body.features) ? req.body.features : [],
        requirements: Array.isArray(req.body.requirements) ? req.body.requirements : [],
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      };

      const product = await storage.createShopProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/admin/shop/products/:id', isAuthenticated, upload.single('featuredImage'), async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updateData = {
        ...req.body,
        price: req.body.price ? req.body.price.toString() : undefined,
        originalPrice: req.body.originalPrice ? req.body.originalPrice.toString() : undefined,
        featuredImage: req.file ? `/uploads/${req.file.filename}` : req.body.featuredImage,
        galleryImages: Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [],
        features: Array.isArray(req.body.features) ? req.body.features : [],
        requirements: Array.isArray(req.body.requirements) ? req.body.requirements : [],
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      };

      const product = await storage.updateShopProduct(req.params.id, updateData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/admin/shop/products/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteShopProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Purchase management routes
  app.get('/api/admin/purchases', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchases = await storage.getAllPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.put('/api/admin/purchases/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchase = await storage.updatePurchase(req.params.id, req.body);
      res.json(purchase);
    } catch (error) {
      console.error("Error updating purchase:", error);
      res.status(500).json({ message: "Failed to update purchase" });
    }
  });

  // ── Creator Public Profile ───────────────────────────────────────
  app.get('/api/creators/:id/profile', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "Creator not found" });
      const { password, ...safeUser } = user;
      const posts = await storage.getUserPosts(req.params.id);
      const reviews = await storage.getUserReviews(req.params.id);
      const followers = await storage.getUserFollowers(req.params.id);
      const following = await storage.getUserFollowing(req.params.id);
      const participations = await storage.getUserParticipations(req.params.id);
      res.json({ ...safeUser, posts, reviews, followers, following, participations });
    } catch (error) {
      console.error("Error fetching creator profile:", error);
      res.status(500).json({ message: "Failed to fetch creator profile" });
    }
  });

  // ── User Followers/Following ─────────────────────────────────────
  app.get('/api/users/:id/followers', async (req, res) => {
    try {
      const followers = await storage.getUserFollowers(req.params.id);
      res.json(followers.map(u => { const { password, ...safe } = u; return safe; }));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  app.get('/api/users/:id/following', async (req, res) => {
    try {
      const following = await storage.getUserFollowing(req.params.id);
      res.json(following.map(u => { const { password, ...safe } = u; return safe; }));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch following" });
    }
  });

  // ── User Reviews ─────────────────────────────────────────────────
  app.get('/api/users/:id/reviews', async (req, res) => {
    try {
      const reviews = await storage.getUserReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/users/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1-5" });
      if (req.params.id === req.user.id) return res.status(400).json({ message: "Cannot review yourself" });
      const review = await storage.createUserReview({
        revieweeId: req.params.id,
        reviewerId: req.user.id,
        rating: parseInt(rating),
        comment,
      });
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // ── Subscriptions ─────────────────────────────────────────────────
  const PLANS = {
    creator_monthly: 7,
    creator_yearly: Math.round(7 * 12 * 0.85 * 100) / 100, // 15% discount
    brand_monthly: 24,
    brand_yearly: Math.round(24 * 12 * 0.85 * 100) / 100,
  };

  app.get('/api/subscriptions/my', isAuthenticated, async (req: any, res) => {
    try {
      const sub = await storage.getUserSubscription(req.user.id);
      res.json(sub || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post('/api/subscriptions', isAuthenticated, upload.single('paymentProof'), async (req: any, res) => {
    try {
      const { plan, network, transactionHash } = req.body;
      const amount = PLANS[plan as keyof typeof PLANS];
      if (!amount) return res.status(400).json({ message: "Invalid plan" });

      const sub = await storage.createSubscription({
        userId: req.user.id,
        plan,
        amount,
        network,
        transactionHash,
        paymentProof: req.file ? `/uploads/${req.file.filename}` : undefined,
      });

      // Create a notification
      await storage.createNotification({
        userId: req.user.id,
        type: 'subscription',
        title: 'Subscription Submitted',
        content: `Your ${plan.replace(/_/g, ' ')} subscription payment is being verified. You'll be notified when it's approved.`,
        priority: 'normal',
      });

      res.status(201).json(sub);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.patch('/api/admin/subscriptions/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: "Admin only" });

      const { plan } = req.body;
      const now = new Date();
      const isYearly = plan?.includes('yearly');
      const endDate = new Date(now);
      if (isYearly) endDate.setFullYear(endDate.getFullYear() + 1);
      else endDate.setMonth(endDate.getMonth() + 1);

      const sub = await storage.updateSubscriptionStatus(req.params.id, 'active', now, endDate);

      // Update user subscription status
      await storage.updateUserProfile(sub.userId, {
        subscriptionStatus: 'active',
        subscriptionPlan: sub.plan,
        subscriptionEndDate: endDate,
        isVerified: true,
      });

      await storage.createNotification({
        userId: sub.userId,
        type: 'subscription_approved',
        title: 'Subscription Activated! ✅',
        content: `Your subscription has been approved and is now active until ${endDate.toLocaleDateString()}.`,
        priority: 'high',
      });

      res.json(sub);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve subscription" });
    }
  });

  // ── Payout Requests ───────────────────────────────────────────────
  app.get('/api/payout-requests', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.userType === 'admin') {
        const requests = await storage.getAllPayoutRequests();
        return res.json(requests);
      }
      const requests = await storage.getUserPayoutRequests(req.user.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payout requests" });
    }
  });

  app.post('/api/payout-requests', isAuthenticated, async (req: any, res) => {
    try {
      const { amount, network, walletAddress } = req.body;
      const user = await storage.getUser(req.user.id);
      
      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || parsedAmount <= 0) return res.status(400).json({ message: "Invalid amount" });
      if (parseFloat(user?.availableBalance || '0') < parsedAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const request = await storage.createPayoutRequest({
        userId: req.user.id,
        amount: parsedAmount,
        network,
        walletAddress,
      });

      // Deduct from available balance
      await storage.updateUserBalance(req.user.id, parsedAmount, 'subtract');

      // Notify admins
      const allUsers = await storage.getAllUsers();
      const admins = allUsers.filter(u => u.userType === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: 'payout_request',
          title: 'New Payout Request',
          content: `${user?.firstName} ${user?.lastName} requested a payout of $${parsedAmount} via ${network}`,
          priority: 'high',
        });
      }

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating payout request:", error);
      res.status(500).json({ message: "Failed to create payout request" });
    }
  });

  app.patch('/api/payout-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: "Admin only" });

      const { status, adminNotes, transactionHash } = req.body;
      const request = await storage.updatePayoutRequest(req.params.id, { status, adminNotes, transactionHash } as any);

      await storage.createNotification({
        userId: request.userId,
        type: 'payout_update',
        title: `Payout ${status === 'completed' ? 'Completed! 🎉' : status === 'rejected' ? 'Rejected' : 'Processing'}`,
        content: adminNotes || `Your payout request has been updated to: ${status}`,
        priority: status === 'completed' ? 'high' : 'normal',
      });

      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to update payout request" });
    }
  });

  app.get('/api/payout-requests/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const msgs = await storage.getPayoutMessages(req.params.id);
      res.json(msgs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/payout-requests/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { content } = req.body;
      const msg = await storage.createPayoutMessage(req.params.id, req.user.id, content);
      // Get the payout request to notify the other party
      const requests = await storage.getUserPayoutRequests(req.user.id);
      res.status(201).json(msg);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ── Referrals ─────────────────────────────────────────────────────
  app.get('/api/referrals/my', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const referrals = await storage.getReferralsByReferrer(req.user.id);
      res.json({
        referralCodeCreator: user?.referralCodeCreator,
        referralCodeBrand: user?.referralCodeBrand,
        totalReferrals: user?.totalReferrals || 0,
        referrals,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // ── Leaderboard ───────────────────────────────────────────────────
  app.get('/api/leaderboard/referrals', async (req, res) => {
    try {
      const top = await storage.getTopCreatorsByReferrals(10);
      res.json(top);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get('/api/leaderboard/activity', async (req, res) => {
    try {
      const top = await storage.getTopCreatorsByActivity(10);
      res.json(top);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // ── Admin user lookup (for chat routing) ──────────────────────────
  app.get('/api/admin-user', async (req, res) => {
    try {
      const admin = await storage.getAdminUser();
      if (!admin) return res.status(404).json({ message: "No admin found" });
      const { password, ...safe } = admin;
      res.json(safe);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin" });
    }
  });

  // ── Referral click tracking ────────────────────────────────────────
  app.post('/api/referrals/click/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const referrer = await storage.getUserByReferralCode(code);
      if (!referrer) return res.status(404).json({ message: "Invalid referral code" });
      res.json({ valid: true, referrerName: `${referrer.firstName} ${referrer.lastName}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // ── Admin referral analytics ───────────────────────────────────────
  app.get('/api/admin/referral-stats', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: "Forbidden" });
      const stats = await storage.getReferralStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // ── Send message to admin (from escrow payment page) ───────────────
  app.post('/api/messages/to-admin', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getAdminUser();
      if (!admin) return res.status(404).json({ message: "No admin available" });
      const { subject, content } = req.body;
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId: admin.id,
        subject: subject || 'Payment Verification Request',
        content,
        messageType: 'general',
        attachments: [],
      });
      await storage.createNotification({
        userId: admin.id,
        type: 'message',
        title: `New message: ${subject || 'Payment Verification Request'}`,
        content: `From ${req.user.firstName} ${req.user.lastName}: ${content.substring(0, 80)}...`,
        actionUrl: '/chat',
        relatedId: message.id,
      });
      res.status(201).json(message);
    } catch (error) {
      console.error('Error sending admin message:', error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ── Ensure existing users have referral codes ──────────────────────
  app.post('/api/referrals/ensure-codes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const updates: any = {};
      if (!user.referralCodeCreator) {
        updates.referralCodeCreator = `CR_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      }
      if (!user.referralCodeBrand) {
        updates.referralCodeBrand = `BR_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      }
      if (Object.keys(updates).length > 0) {
        await storage.updateUserProfile(user.id, updates);
      }
      const updated = await storage.getUser(req.user.id);
      res.json({
        referralCodeCreator: updated?.referralCodeCreator,
        referralCodeBrand: updated?.referralCodeBrand,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to ensure referral codes" });
    }
  });

  // ── Creator's Active Campaigns ────────────────────────────────────
  app.get('/api/my-campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const participations = await storage.getUserParticipations(req.user.id);
      const approvedParticipations = participations.filter(p => p.status === 'approved' || p.status === 'completed');
      const result = [];
      for (const p of approvedParticipations) {
        const campaign = await storage.getCampaignById(p.campaignId);
        if (campaign) result.push({ ...p, campaign });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
