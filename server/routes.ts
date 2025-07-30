import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertCampaignParticipationSchema, insertTransactionSchema, insertPurchaseSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import bcrypt from "bcrypt";
import path from "path";
import express from "express";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - this now includes all auth routes
  setupAuth(app);
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
        reward: req.body.reward.toString(),
        totalSlots: parseInt(req.body.totalSlots),
        deadline: new Date(req.body.deadline),
        requirements: [req.body.requirements], // Convert string to array
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
      const escrowPaymentData = {
        id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id,
        brandId: user.id,
        amount: parseFloat(req.body.reward) * parseInt(req.body.totalSlots), // Total campaign budget
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
      res.status(500).json({ message: "Failed to create campaign", error: error.message });
    }
  });

  // Update campaign
  app.patch('/api/campaigns/:id', async (req, res) => {
    try {
      const campaignId = req.params.id;
      const updates = req.body;
      
      const campaign = await storage.getCampaignById(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

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
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get('/api/blog/:slug', async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // Shop routes
  app.get('/api/shop', async (req, res) => {
    try {
      const products = await storage.getAllShopProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching shop products:", error);
      res.status(500).json({ message: "Failed to fetch shop products" });
    }
  });

  app.get('/api/shop/:id', async (req, res) => {
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
      res.json(messages);
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
        campaignId,
        participationId,
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

  // Campaign editing route
  app.patch('/api/campaigns/:id', async (req, res) => {
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

      // Don't allow budget changes if there are already payments
      if (updates.reward && updates.reward !== campaign.reward) {
        const payments = await storage.getPaymentDepositsByCampaign(campaignId);
        if (payments.length > 0) {
          return res.status(400).json({ message: "Cannot change reward amount after payments have been made" });
        }
      }

      const updatedCampaign = await storage.updateCampaign(campaignId, updates);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
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

      const updatedUser = await storage.updateUserProfile(req.params.userId, req.body);
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

  app.delete('/api/admin/users/:id', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Prevent deletion of master admin
      if (req.params.id === 'admin_master_001') {
        return res.status(403).json({ message: "Cannot delete master admin account" });
      }

      await storage.deleteUser(req.params.id);
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

  app.post('/api/admin/blog', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { title, content, status } = req.body;
      const blogPost = await storage.createBlogPost({
        title,
        content,
        status,
        authorId: userId,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        excerpt: content.substring(0, 200) + '...',
        publishedAt: status === 'published' ? new Date() : null
      });
      res.json(blogPost);
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ message: 'Failed to create blog post' });
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
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { id } = req.params;
      const { status } = req.body;
      
      await storage.updateTransactionStatus(id, status);
      res.json({ message: 'Payment status updated successfully' });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  });

  app.get('/api/admin/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching admin campaigns:', error);
      res.status(500).json({ message: 'Failed to fetch campaigns' });
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

  // Blog management routes
  app.get('/api/blog', async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  // Create blog post
  app.post('/api/admin/blog', isAuthenticated, async (req, res) => {
    try {
      const { title, content, status, category, featuredImage, slug, isPublished, publishedAt, excerpt, authorId } = req.body;
      
      const blogPost = await storage.createBlogPost({
        title,
        content,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        excerpt: excerpt || content.substring(0, 160) + '...',
        category: category || 'general',
        featuredImage: featuredImage || null,
        isPublished: isPublished || false,
        publishedAt: publishedAt || null,
        authorId: authorId || (req.user as any).id,
      });
      
      res.status(201).json(blogPost);
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ message: 'Failed to create blog post' });
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

  // User management routes
  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (adminUser?.userType !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
