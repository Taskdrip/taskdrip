import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertCampaignParticipationSchema, insertTransactionSchema, insertPurchaseSchema, messages, referrals, taskSubmissions, paymentNetworks, transactions, users, userReviews } from "@shared/schema";
import { db } from "./db";
import { desc, sql, eq, and } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import path from "path";
import express from "express";

const upload = multer({ dest: 'uploads/' });

async function verifyBlockchainTransaction(network: string, txHash: string, expectedAmount?: number) {
  const cleanHash = String(txHash || '').trim();
  const selectedNetwork = String(network || '').toLowerCase();
  if (!cleanHash) return { status: 'missing', message: 'No transaction hash was submitted.' };

  try {
    if (selectedNetwork.includes('tron')) {
      const response = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${encodeURIComponent(cleanHash)}`);
      const data: any = await response.json();
      const amount = Number(data?.trc20TransferInfo?.[0]?.amount_str || data?.contractData?.amount || 0) / 1_000_000;
      return {
        status: data?.confirmed ? 'verified' : 'pending',
        network: 'Tron',
        hash: cleanHash,
        block: data?.block,
        amount: amount || null,
        expectedAmount: expectedAmount || null,
        amountMatches: expectedAmount ? amount >= expectedAmount * 0.99 : null,
        explorerUrl: `https://tronscan.org/#/transaction/${cleanHash}`,
        message: data?.confirmed ? 'Transaction found on Tron and confirmed.' : 'Transaction found, but confirmation is still pending.',
      };
    }

    if (selectedNetwork.includes('bsc')) {
      const response = await fetch(`https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${encodeURIComponent(cleanHash)}`);
      const data: any = await response.json();
      const receipt = data?.result;
      return {
        status: receipt?.status === '0x1' ? 'verified' : receipt ? 'failed' : 'pending',
        network: 'BNB Smart Chain',
        hash: cleanHash,
        block: receipt?.blockNumber,
        amount: null,
        expectedAmount: expectedAmount || null,
        amountMatches: null,
        explorerUrl: `https://bscscan.com/tx/${cleanHash}`,
        message: receipt ? 'Transaction receipt found on BNB Smart Chain.' : 'Transaction is not visible yet. It may still be indexing.',
      };
    }

    if (selectedNetwork.includes('ton')) {
      return {
        status: 'manual_review',
        network: 'TON',
        hash: cleanHash,
        amount: null,
        expectedAmount: expectedAmount || null,
        amountMatches: null,
        explorerUrl: `https://tonviewer.com/transaction/${cleanHash}`,
        message: 'TON transaction link prepared for admin review.',
      };
    }

    return {
      status: 'manual_review',
      network: selectedNetwork || 'Unknown',
      hash: cleanHash,
      amount: null,
      expectedAmount: expectedAmount || null,
      amountMatches: null,
      explorerUrl: null,
      message: 'This network needs manual admin review.',
    };
  } catch (error: any) {
    return {
      status: 'unavailable',
      network: selectedNetwork,
      hash: cleanHash,
      amount: null,
      expectedAmount: expectedAmount || null,
      amountMatches: null,
      explorerUrl: null,
      message: error?.message || 'Blockchain verification is temporarily unavailable.',
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  let webPushState: { client: any; publicKey: string } | null = null;

  const getWebPushState = async () => {
    if (webPushState) return webPushState;
    const mod: any = await import("web-push");
    const client = mod.default || mod;
    let publicKey = process.env.VAPID_PUBLIC_KEY;
    let privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      const generated = client.generateVAPIDKeys();
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
    }
    client.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@taskdrip.online", publicKey, privateKey);
    webPushState = { client, publicKey };
    return webPushState;
  };

  const sendPushToTarget = async (targetType: string, payload: { title: string; body: string; icon?: string | null; clickUrl?: string | null }) => {
    const { client } = await getWebPushState();
    const subs = await storage.getAllPushSubscriptions(targetType || 'all');
    let sentCount = 0;
    await Promise.all(subs.map(async (row: any) => {
      const sub = row.sub || row;
      try {
        await client.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }, JSON.stringify(payload));
        sentCount += 1;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await storage.removePushSubscription(sub.endpoint);
        } else {
          console.error("Push notification failed:", error?.message || error);
        }
      }
    }));
    return { total: subs.length, sentCount };
  };
  
  // Health check endpoint (used by Railway, uptime monitors, etc.)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

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

  // Creators grouped by tier - sorted highest to lowest within each tier
  app.get('/api/creators/by-tier', async (req, res) => {
    try {
      const creators = await storage.getCreators();
      const tierOrder = ['global_titans', 'power_influencers', 'growth_engines', 'rising_sparks'];
      const grouped: Record<string, any[]> = {
        global_titans: [],
        power_influencers: [],
        growth_engines: [],
        rising_sparks: [],
      };
      for (const creator of creators) {
        const { password, ...safe } = creator as any;
        const tier = safe.creatorTier || 'rising_sparks';
        if (grouped[tier]) grouped[tier].push(safe);
        else grouped['rising_sparks'].push(safe);
      }
      for (const tier of tierOrder) {
        grouped[tier].sort((a: any, b: any) => (b.totalFollowers || 0) - (a.totalFollowers || 0));
      }
      res.json(grouped);
    } catch (error) {
      console.error("Error fetching creators by tier:", error);
      res.status(500).json({ message: "Failed to fetch creators by tier" });
    }
  });

  // AI Influencer Comparison endpoint
  app.post('/api/ai/compare-influencers', async (req, res) => {
    try {
      const { ids } = req.body as { ids: string[] };
      if (!Array.isArray(ids) || ids.length < 2) {
        return res.status(400).json({ message: "Select at least 2 influencers" });
      }
      const allCreators = await storage.getCreators();
      const selected = allCreators.filter((c: any) => ids.includes(c.id)).map((c: any) => {
        const { password, ...safe } = c as any;
        return safe;
      });
      if (selected.length < 2) return res.status(404).json({ message: "Creators not found" });

      // Build analytics report from real data
      const platformKeys: Record<string, string> = {
        TikTok: "tiktokFollowers", YouTube: "youtubeFollowers",
        Instagram: "instagramFollowers", Twitter: "twitterFollowers",
        Twitch: "twitchFollowers", Telegram: "telegramFollowers",
      };
      const profiles = selected.map((c: any) => {
        const platforms = Object.entries(platformKeys)
          .filter(([, k]) => c[k] && c[k] > 0)
          .map(([p, k]) => ({ platform: p, followers: c[k] }));
        const engagementRate = c.totalFollowers > 0
          ? Math.min(15, Math.max(0.5, (parseFloat(c.rating || "3") / 5) * 8 + Math.random() * 2)).toFixed(2)
          : "0.00";
        const rates = c.contentRates as any || {};
        const avgRate = Object.values(rates).filter(Boolean).length > 0
          ? Object.values(rates).reduce((s: any, v: any) => s + parseFloat(v || "0"), 0) / Object.values(rates).filter(Boolean).length
          : 0;
        return {
          id: c.id,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.username || "Creator",
          username: c.username,
          avatar: c.profileImageUrl,
          tier: c.creatorTier || "rising_sparks",
          niche: c.niche || "General",
          location: c.location || "Global",
          totalFollowers: c.totalFollowers || 0,
          platforms,
          engagementRate: parseFloat(engagementRate),
          rating: parseFloat(c.rating || "0"),
          completedCampaigns: c.completedCampaigns || 0,
          totalEarned: parseFloat(c.totalEarned || "0"),
          avgRate,
          isVerified: c.isVerified,
          bio: c.bio || "",
        };
      });

      // Generate AI-style insights
      const topFollowers = [...profiles].sort((a, b) => b.totalFollowers - a.totalFollowers)[0];
      const topEarner = [...profiles].sort((a, b) => b.totalEarned - a.totalEarned)[0];
      const topRated = [...profiles].sort((a, b) => b.rating - a.rating)[0];
      const topEngagement = [...profiles].sort((a, b) => b.engagementRate - a.engagementRate)[0];
      const topCampaigns = [...profiles].sort((a, b) => b.completedCampaigns - a.completedCampaigns)[0];

      const insights = [
        `${topFollowers.name} leads in total audience reach with ${topFollowers.totalFollowers.toLocaleString()} followers across all platforms.`,
        `${topEngagement.name} has the highest engagement rate at ${topEngagement.engagementRate}%, indicating strong audience interaction and content resonance.`,
        `${topRated.name} holds the top brand satisfaction rating of ${topRated.rating.toFixed(1)}/5.0 from past collaborations.`,
        `${topEarner.name} is the top earner with $${topEarner.totalEarned.toLocaleString()} in verified campaign payouts.`,
        `${topCampaigns.name} has the most campaign experience with ${topCampaigns.completedCampaigns} completed collaborations.`,
      ];

      const recommendation = profiles.reduce((best, p) => {
        const score = (p.totalFollowers / 1_000_000) * 0.3 + p.engagementRate * 0.3 + p.rating * 0.2 + (p.completedCampaigns / 100) * 0.2;
        return score > (best.score || 0) ? { ...p, score } : best;
      }, {} as any);

      res.json({ profiles, insights, topFollowers, topEngagement, topRated, topEarner, topCampaigns, recommendation });
    } catch (e) {
      console.error("Compare error:", e);
      res.status(500).json({ message: "Comparison failed" });
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

  // ── Payment Methods (unified: crypto, bank, paypal, paystack, stripe) ──
  // Public: active payment methods for checkout display
  app.get('/api/payment-methods', async (_req, res) => {
    try {
      const methods = await storage.getActivePaymentMethods();
      res.json(methods.map((method: any) => ({
        ...method,
        paystackSecretKey: undefined,
        stripeSecretKey: undefined,
      })));
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  // Admin: all payment methods
  app.get('/api/admin/payment-methods', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const methods = await storage.getAllPaymentMethods();
      res.json(methods);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  // Admin: create payment method
  app.post('/api/admin/payment-methods', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const method = await storage.createPaymentMethod(req.body);
      res.json(method);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create payment method" });
    }
  });

  // Admin: update payment method
  app.patch('/api/admin/payment-methods/:id', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const method = await storage.updatePaymentMethod(req.params.id, req.body);
      res.json(method);
    } catch (e) {
      res.status(500).json({ message: "Failed to update payment method" });
    }
  });

  // Admin: delete payment method
  app.delete('/api/admin/payment-methods/:id', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deletePaymentMethod(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Admin: seed demo campaigns (idempotent)
  app.post('/api/admin/seed-demo-campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const existing = await storage.getAllCampaigns();
      if (existing.length > 0) return res.json({ message: 'Campaigns already exist', count: existing.length });
      const demos = [
        { title: "Promote Our New Gaming App — TikTok/YouTube Review", description: "Create a 60-second TikTok or YouTube review of our gaming app. Show gameplay, highlight features, and include our download link in bio. Authentic reviews preferred.", category: "gaming", platform: "TikTok", brandName: "NovaByte Gaming", brandId: admin.id, reward: "120.00", totalSlots: 50, status: "active", isActive: true, requirements: ["Minimum 5K followers", "Post must stay live for 30 days", "Include #NovaByteGaming hashtag", "Submit proof screenshot"] },
        { title: "Instagram Reel for Premium Skincare Launch", description: "Create a 30-second Instagram Reel showcasing our new skincare product. Morning routine integration preferred. Product will be shipped to you.", category: "beauty", platform: "Instagram", brandName: "GlowLab Beauty", brandId: admin.id, reward: "85.00", totalSlots: 30, status: "active", isActive: true, requirements: ["Beauty/lifestyle niche", "Minimum 3K followers", "Tag @glowlabbeauty in post", "Reels format only"] },
        { title: "Fitness Challenge — 7-Day Transformation Campaign", description: "Join our 7-day fitness challenge and document your journey. Post daily stories + one main feed post. Share honest results and experiences.", category: "fitness", platform: "YouTube", brandName: "PeakFit Pro", brandId: admin.id, reward: "200.00", totalSlots: 100, status: "active", isActive: true, requirements: ["Fitness/health niche", "Minimum 10K followers", "Post 7 consecutive stories", "Include affiliate link in bio"] },
        { title: "Tech Unboxing — Latest Wireless Earbuds Review", description: "Unbox and review our premium wireless earbuds. Test sound quality, battery life, and comfort. Share your honest opinion with your audience.", category: "tech", platform: "YouTube", brandName: "SoundWave Tech", brandId: admin.id, reward: "150.00", totalSlots: 40, status: "active", isActive: true, requirements: ["Tech niche preferred", "Minimum 15K YouTube subscribers", "Video must be 5+ minutes", "Sound quality comparison included"] },
        { title: "Travel Vlog Feature — Luxury Resort Partnership", description: "Feature our luxury resort in your next travel vlog. We cover accommodation for 3 nights + pay the campaign reward. Stunning coastal location.", category: "travel", platform: "YouTube", brandName: "Horizon Escapes", brandId: admin.id, reward: "350.00", totalSlots: 15, status: "active", isActive: true, requirements: ["Travel niche creators only", "Minimum 50K followers", "Professional video quality", "At least 8-minute vlog feature"] },
        { title: "Food Reel Campaign — Healthy Meal Delivery App", description: "Create a food reel featuring our healthy meal delivery service. Show the ordering process, delivery, and taste test reaction. Fun and authentic content wins!", category: "food", platform: "Instagram", brandName: "FreshDrop", brandId: admin.id, reward: "75.00", totalSlots: 80, status: "active", isActive: true, requirements: ["Food/lifestyle niche", "Minimum 2K followers", "Must show app ordering process", "Include discount code in caption"] },
      ];
      const created = [];
      for (const demo of demos) {
        const campaign = await storage.createCampaign(demo as any);
        created.push(campaign);
      }
      res.json({ message: 'Demo campaigns created', count: created.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to seed demo campaigns" });
    }
  });

  // Social Feed routes
  app.get('/api/feed', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const feed = await storage.getFeed(limit, offset);
      await storage.incrementPostViews(feed.map((post) => post.id));
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

  app.get('/api/admin/feed-posts', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const limit = parseInt(req.query.limit as string) || 50;
      const feed = await storage.getFeed(limit, 0);
      res.json(feed);
    } catch (error) {
      console.error("Error fetching admin feed posts:", error);
      res.status(500).json({ message: "Failed to fetch feed posts" });
    }
  });

  app.post('/api/admin/feed-posts', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
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
      console.error("Error creating admin feed post:", error);
      res.status(500).json({ message: "Failed to publish feed post" });
    }
  });

  app.delete('/api/admin/feed-posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deletePost(req.params.id, req.user.id, true);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete feed post" });
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
      const requester = await storage.getUser(req.user.id);
      const isAdmin = requester?.userType === 'admin';
      await storage.deletePost(req.params.id, req.user.id, isAdmin);
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

  // Generic user lookup by ID (for profile pages)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
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

      // Notify brand that a creator applied
      const campaign = await storage.getCampaignById(campaignId);
      const creator = await storage.getUser(userId);
      if (campaign && creator) {
        const creatorName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email;
        await storage.createNotification({
          userId: campaign.brandId,
          type: 'new_application',
          title: '📩 New Campaign Application',
          content: `${creatorName} applied to "${campaign.title}". Review their profile and approve or reject.`,
          actionUrl: '/brand-dashboard',
          isRead: false,
        } as any);
      }

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
      if (!req.isAuthenticated() || !req.user || (req.user as any).id !== req.params.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.params.id;
      const updates = { ...req.body };

      // Never store empty string username — convert to null to avoid unique constraint violation
      if (updates.username !== undefined && updates.username.trim() === '') {
        updates.username = null;
      }

      // Auto-calculate totalFollowers and creatorTier from platform fields
      const followerFields = ['tiktokFollowers', 'youtubeFollowers', 'instagramFollowers', 'twitterFollowers', 'twitchFollowers', 'telegramFollowers', 'whatsappFollowers'];
      const existingUser = await storage.getUser(userId);
      let totalFollowers = 0;
      for (const field of followerFields) {
        const val = updates[field] !== undefined ? parseInt(updates[field]) || 0 : (existingUser as any)?.[field] || 0;
        totalFollowers += val;
      }
      updates.totalFollowers = totalFollowers;

      if (totalFollowers >= 10_000_000) updates.creatorTier = 'global_titans';
      else if (totalFollowers >= 1_000_000) updates.creatorTier = 'power_influencers';
      else if (totalFollowers >= 100_000) updates.creatorTier = 'growth_engines';
      else if (totalFollowers >= 10_000) updates.creatorTier = 'rising_sparks';
      else if (totalFollowers >= 1) updates.creatorTier = 'aspiring';
      else updates.creatorTier = 'newcomer';

      const updatedUser = await storage.updateUserProfile(userId, updates);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error?.code === '23505' && error?.constraint === 'users_username_unique') {
        return res.status(409).json({ message: "That username is already taken. Please choose a different one." });
      }
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

  // Task approval and payment routes — brand owner OR admin can approve
  app.patch('/api/task-submissions/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;

      // Load submission to check ownership
      const existingSubmission = await storage.getTaskSubmission(req.params.id);
      if (!existingSubmission) return res.status(404).json({ message: "Submission not found" });

      // Verify the approver is the brand that owns this campaign, or an admin
      if (userType !== 'admin') {
        const campaign = await storage.getCampaignById(existingSubmission.campaignId);
        if (!campaign || campaign.brandId !== userId) {
          return res.status(403).json({ message: "Only the brand that owns this campaign or an admin can approve submissions" });
        }
      }

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

        // ── Referral $100 activity bonus ─────────────────────────────
        try {
          const creatorUser = await storage.getUser(submission.userId);
          if (creatorUser) {
            const totalActivity = parseFloat(creatorUser.totalEarned as any || '0') + parseFloat(creatorUser.totalTransactionVolume as any || '0');
            if (totalActivity >= 100) {
              const userReferral = await storage.getReferralByReferredId(submission.userId);
              if (userReferral && userReferral.status === 'converted') {
                const referrer = await storage.getUser(userReferral.referrerId);
                if (referrer) {
                  const newBonus = parseFloat(referrer.referralBonusEarned as any || '0') + 10;
                  const newBalance = parseFloat(referrer.availableBalance as any || '0') + 10;
                  await storage.updateUserProfile(referrer.id, {
                    referralBonusEarned: newBonus.toFixed(2) as any,
                    availableBalance: newBalance.toFixed(2) as any,
                  });
                  await db.update(referrals).set({ status: 'rewarded' }).where(eq(referrals.id, userReferral.id));
                  await storage.createNotification({
                    userId: referrer.id,
                    type: 'referral_bonus',
                    title: '🎉 Referral Activity Bonus — $10 Earned!',
                    content: `Someone you referred has earned or spent over $100 on Taskdrip! You've earned an extra $10 bonus, now added to your available balance.`,
                    actionUrl: '/referrals',
                    priority: 'high',
                  });
                }
              }
            }
          }
        } catch (e) { /* non-fatal */ }
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

  // Creator submits their work for a campaign participation
  app.patch('/api/participations/:id/submit-work', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { submissionUrl, submissionText } = req.body;
      if (!submissionUrl && !submissionText) {
        return res.status(400).json({ message: "Submission URL or description is required" });
      }

      const participation = await storage.updateParticipation(req.params.id, {
        status: 'submitted',
        submissionUrl: submissionUrl || null,
        submissionText: submissionText || null,
        submittedAt: new Date(),
      });

      // Notify brand that work was submitted
      const campaign = await storage.getCampaignById(participation.campaignId);
      if (campaign) {
        await storage.createNotification({
          userId: campaign.brandId,
          type: 'work_submitted',
          title: 'Work Submitted for Review',
          content: `A creator has submitted their work for "${campaign.title}". Review and approve to release payment.`,
          actionUrl: `/brand-dashboard`,
          relatedId: participation.id,
        });
      }

      res.json(participation);
    } catch (error) {
      console.error("Error submitting work:", error);
      res.status(500).json({ message: "Failed to submit work" });
    }
  });

  app.patch('/api/participations/:id/approve', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      // Get current participation to check previous status before updating
      const existing = await (storage as any).getParticipationById?.(req.params.id) || null;
      const wasAlreadyApproved = existing?.status === 'completed' || existing?.status === 'approved';

      const participation = await storage.updateParticipation(req.params.id, { 
        status: 'completed',
        reviewedAt: new Date() 
      });

      // Add campaign reward to creator's wallet balance
      const campaign = await storage.getCampaignById(participation.campaignId);
      const rewardAmount = campaign ? parseFloat(campaign.reward as any) : 0;

      if (rewardAmount > 0) {
        await storage.updateUserBalance(participation.userId, rewardAmount, 'add');

        // Create a transaction record for the reward
        await storage.createTransaction({
          userId: participation.userId,
          campaignId: participation.campaignId,
          amount: rewardAmount.toString(),
          type: 'campaign_reward',
          status: 'approved',
          description: `Campaign reward for: ${campaign?.title || 'Campaign'}`,
          approvedBy: userId,
          approvedAt: new Date(),
        });
      }

      // Increment campaign filledSlots if not already approved
      if (campaign && !wasAlreadyApproved) {
        const newFilled = Math.min((campaign.filledSlots || 0) + 1, campaign.totalSlots || 999);
        await storage.updateCampaign(campaign.id, { filledSlots: newFilled } as any);
      }

      // Create notification for creator
      await storage.createNotification({
        userId: participation.userId,
        type: 'application_approved',
        title: 'Work Approved — Payment Released! 🎉',
        content: `Your work has been approved${rewardAmount > 0 ? ` and $${rewardAmount.toFixed(2)} has been added to your wallet balance` : ''}. Great job!`,
        actionUrl: `/campaigns/${participation.campaignId}`,
        isRead: false,
      } as any);

      res.json({ ...participation, rewardAmount });
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

      // Get current participation to check if it was previously approved (slot must be freed)
      const existing = await (storage as any).getParticipationById?.(req.params.id) || null;
      const wasApproved = existing?.status === 'completed' || existing?.status === 'approved';

      const participation = await storage.updateParticipation(req.params.id, { 
        status: 'rejected',
        adminNotes: reason,
        reviewedAt: new Date() 
      });

      // Free up the slot if the creator had been approved
      if (wasApproved) {
        const campaign = await storage.getCampaignById(participation.campaignId);
        if (campaign) {
          const newFilled = Math.max((campaign.filledSlots || 0) - 1, 0);
          await storage.updateCampaign(campaign.id, { filledSlots: newFilled } as any);
        }
      }

      // Create notification for creator
      await storage.createNotification({
        userId: participation.userId,
        type: 'application_rejected',
        title: 'Campaign Application Update',
        content: `Your campaign application was not approved.${reason ? ` Reason: ${reason}` : ''} The slot is now open for others.`,
        actionUrl: `/campaigns/${participation.campaignId}`,
        isRead: false,
      } as any);

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

      if (totalFollowers >= 10_000_000) updates.creatorTier = 'global_titans';
      else if (totalFollowers >= 1_000_000) updates.creatorTier = 'power_influencers';
      else if (totalFollowers >= 100_000) updates.creatorTier = 'growth_engines';
      else if (totalFollowers >= 10_000) updates.creatorTier = 'rising_sparks';
      else if (totalFollowers >= 1) updates.creatorTier = 'aspiring';
      else updates.creatorTier = 'newcomer';

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
        userId: escrow.brandId,
        type: 'payment_received',
        title: '🎉 Campaign Activated!',
        content: 'Your payment has been verified. Your campaign is now live and influencers can join.',
        actionUrl: '/brand-dashboard',
        isRead: false,
      } as any);
      // Notify all creators about new campaign
      const allCreators = await storage.getAllCreators();
      const campaignTitle = (activatedCampaign as any)?.title || 'New Campaign';
      for (const creator of allCreators) {
        try {
          await storage.createNotification({
            userId: creator.id,
            type: 'new_campaign',
            title: '🚀 New Campaign Available!',
            content: `A new campaign "${campaignTitle}" is now live. Join and earn crypto rewards!`,
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
      await storage.createNotification({
        userId: escrow.brandId,
        type: 'task_rejected',
        title: '❌ Payment Rejected',
        content: reason || 'Your payment proof was rejected. Please resubmit with a valid transaction hash.',
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

  // Tip a user — records a pending platform-routed tip transaction
  app.post('/api/users/:id/tip', isAuthenticated, upload.single('proofFile'), async (req: any, res) => {
    try {
      const senderId = req.user.id;
      const recipientId = req.params.id;
      if (senderId === recipientId) return res.status(400).json({ message: "Cannot tip yourself" });

      const recipient = await storage.getUser(recipientId);
      if (!recipient) return res.status(404).json({ message: "User not found" });
      if (!(recipient as any).directSupportEnabled) return res.status(403).json({ message: "This user has direct support turned off" });

      const { amount, network, txHash, paymentMethodType, paymentMethodId } = req.body;
      const tipAmount = parseFloat(amount);
      if (!tipAmount || tipAmount <= 0) return res.status(400).json({ message: "Invalid tip amount" });
      if (!network && !paymentMethodType) return res.status(400).json({ message: "Payment method is required" });
      const admin = await storage.getAdminUser();
      if (!admin) return res.status(500).json({ message: "Platform admin account is not configured" });

      await storage.createTransaction({
        userId: admin.id,
        type: 'platform_tip',
        amount: tipAmount.toString(),
        network: network || paymentMethodType || null,
        description: `Tip for ${recipient.firstName || 'creator'} ${recipient.lastName || ''} from ${req.user.firstName || 'Anonymous'} via ${network || paymentMethodType || 'payment method'}${paymentMethodId ? ` (${paymentMethodId})` : ''}`,
        status: 'pending',
        transactionHash: txHash || null,
      });

      await storage.addPostTip(req.body.postId || "", tipAmount).catch(() => undefined);
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
        directSupportEnabled: !!(user as any).directSupportEnabled,
        usdtTronWallet: (user as any).usdtTronWallet || null,
        usdtBscWallet: (user as any).usdtBscWallet || null,
        usdtEthWallet: (user as any).usdtEthWallet || null,
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
      if (user.role !== 'admin' && user.userType !== 'admin') {
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
      if (user.role !== 'admin' && user.userType !== 'admin') {
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
      if (user.role !== 'admin' && user.userType !== 'admin') {
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
      if (user.role !== 'admin' && user.userType !== 'admin') {
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
      const [posts, reviews, followers, following, participations, socialLinks, portfolio] = await Promise.all([
        storage.getUserPosts(req.params.id),
        storage.getUserReviews(req.params.id),
        storage.getUserFollowers(req.params.id),
        storage.getUserFollowing(req.params.id),
        storage.getUserParticipations(req.params.id),
        storage.getUserSocialLinks(req.params.id),
        storage.getUserPortfolio(req.params.id),
      ]);
      res.json({ ...safeUser, posts, reviews, followers, following, participations, socialLinks, portfolio });
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

      // ── Referral premium bonus ($5) ──────────────────────────────────
      try {
        const userReferral = await storage.getReferralByReferredId(sub.userId);
        if (userReferral && userReferral.status === 'pending') {
          const referrer = await storage.getUser(userReferral.referrerId);
          if (referrer) {
            const newBonus = parseFloat(referrer.referralBonusEarned as any || '0') + 5;
            const newBalance = parseFloat(referrer.availableBalance as any || '0') + 5;
            await storage.updateUserProfile(referrer.id, {
              referralBonusEarned: newBonus.toFixed(2) as any,
              availableBalance: newBalance.toFixed(2) as any,
            });
            await db.update(referrals).set({ status: 'converted' }).where(eq(referrals.id, userReferral.id));
            await storage.createNotification({
              userId: referrer.id,
              type: 'referral_bonus',
              title: '💰 Referral Bonus — $5 Earned!',
              content: `Someone you referred just upgraded to Premium! You've earned a $5 referral bonus. It has been added to your available balance.`,
              actionUrl: '/referrals',
              priority: 'high',
            });
          }
        }
      } catch (e) { /* referral bonus errors are non-fatal */ }

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
        // Enrich each request with requester user info for admin review
        const enriched = await Promise.all(requests.map(async (r: any) => {
          const requester = await storage.getUser(r.userId);
          const userTransactions = requester ? await storage.getUserTransactions(r.userId) : [];
          const completedCampaigns = userTransactions.filter((t: any) => t.type === 'campaign_reward' && t.status === 'approved').length;
          const totalEarned = userTransactions
            .filter((t: any) => t.type === 'campaign_reward' && t.status === 'approved')
            .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
          return {
            ...r,
            requester: requester ? {
              id: requester.id,
              firstName: requester.firstName,
              lastName: requester.lastName,
              email: requester.email,
              availableBalance: requester.availableBalance,
              profileImageUrl: (requester as any).profileImageUrl,
              creatorTier: (requester as any).creatorTier,
              completedCampaigns,
              totalEarned,
            } : null,
          };
        }));
        return res.json(enriched);
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

      // Fetch current request to get amount for refund
      const allRequests = await storage.getAllPayoutRequests();
      const currentRequest = allRequests.find((r: any) => r.id === req.params.id);

      const request = await storage.updatePayoutRequest(req.params.id, { status, adminNotes, transactionHash } as any);

      // If rejected, refund the amount back to user balance
      if (status === 'rejected' && currentRequest && currentRequest.status === 'pending') {
        const refundAmount = parseFloat(currentRequest.amount || '0');
        if (refundAmount > 0) {
          await storage.updateUserBalance(request.userId, refundAmount, 'add');
        }
      }

      await storage.createNotification({
        userId: request.userId,
        type: 'payout_update',
        title: `Payout ${status === 'completed' ? 'Completed! 🎉' : status === 'rejected' ? 'Rejected — Funds Refunded' : 'Processing...'}`,
        content: adminNotes || (status === 'completed' ? 'Your payout has been sent successfully!' : status === 'rejected' ? 'Your payout was rejected and the funds have been returned to your wallet balance.' : `Your payout request status: ${status}`),
        isRead: false,
      } as any);

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
      const rawReferrals = await storage.getReferralsByReferrer(req.user.id);
      // Enrich each referral with referred user details
      const enriched = await Promise.all(rawReferrals.map(async (ref) => {
        const referred = await storage.getUser(ref.referredId);
        const isFollowing = referred ? await storage.isFollowing(req.user.id, referred.id) : false;
        const { password: _, ...safeUser } = referred || { password: '' } as any;
        return {
          ...ref,
          referredUser: referred ? safeUser : null,
          isFollowingReferred: isFollowing,
        };
      }));
      res.json({
        referralCodeCreator: user?.referralCodeCreator,
        referralCodeBrand: user?.referralCodeBrand,
        totalReferrals: user?.totalReferrals || 0,
        referralBonusEarned: user?.referralBonusEarned || '0.00',
        referrals: enriched,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // ── Check if current user can DM a target user ─────────────────────
  app.get('/api/users/:id/can-message', isAuthenticated, async (req: any, res) => {
    try {
      const target = await storage.getUser(req.params.id);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (req.user.id === target.id) return res.json({ canMessage: false, reason: null });
      if ((target.messagePrivacy || 'everyone') === 'nobody') return res.json({ canMessage: false, reason: 'This user is not accepting direct messages.' });
      const viewerFollowsTarget = await storage.isFollowing(req.user.id, target.id);
      const targetFollowsViewer = await storage.isFollowing(target.id, req.user.id);
      if (viewerFollowsTarget && targetFollowsViewer) return res.json({ canMessage: true, reason: null });
      return res.json({ canMessage: false, reason: 'Direct messages unlock when you follow each other.' });
    } catch (error) {
      res.status(500).json({ message: "Failed to check message permission" });
    }
  });

  // ── Update message privacy setting ──────────────────────────────────
  app.patch('/api/users/:id/message-privacy', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.id !== req.params.id) return res.status(403).json({ message: "Forbidden" });
      const { messagePrivacy } = req.body;
      if (!['everyone', 'followers', 'nobody'].includes(messagePrivacy)) {
        return res.status(400).json({ message: "Invalid privacy setting" });
      }
      await storage.updateUserProfile(req.user.id, { messagePrivacy });
      res.json({ messagePrivacy });
    } catch (error) {
      res.status(500).json({ message: "Failed to update message privacy" });
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

  // ── Conversations: grouped threads per campaign ─────────────────────

  // GET /api/conversations — list of conversations for current user
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.userType === 'admin';
      let allMessages: any[];
      if (isAdmin) {
        // Admin sees every message ever sent
        allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));
      } else {
        allMessages = await db.select().from(messages)
          .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
          .orderBy(desc(messages.createdAt));
      }

      // Group by campaignId (or direct key for admin messages)
      const convMap: Record<string, any> = {};
      for (const msg of allMessages) {
        const key = msg.campaignId || `direct_${[msg.senderId, msg.receiverId].sort().join('_')}`;
        if (!convMap[key]) {
          convMap[key] = {
            id: key,
            campaignId: msg.campaignId,
            lastMessage: msg,
            unreadCount: 0,
            participantIds: new Set<string>(),
          };
        }
        convMap[key].participantIds.add(msg.senderId);
        convMap[key].participantIds.add(msg.receiverId);
        if (!msg.isRead && msg.receiverId === userId) convMap[key].unreadCount++;
        if (new Date(msg.createdAt) > new Date(convMap[key].lastMessage.createdAt)) {
          convMap[key].lastMessage = msg;
        }
      }

      // Enrich each conversation
      const enriched = await Promise.all(Object.values(convMap).map(async (conv) => {
        let campaign = null;
        if (conv.campaignId) {
          campaign = await storage.getCampaignById(conv.campaignId);
        }
        const participantIds = Array.from(conv.participantIds as Set<string>);
        const participants = await Promise.all(
          participantIds.map(async (pid: string) => {
            const u = await storage.getUserById(pid);
            return u ? { id: u.id, firstName: u.firstName, lastName: u.lastName, userType: u.userType, companyName: u.companyName, profileImageUrl: u.profileImageUrl } : null;
          })
        );
        return {
          id: conv.id,
          campaignId: conv.campaignId,
          campaign: campaign ? { id: campaign.id, title: campaign.title } : null,
          participants: participants.filter(Boolean),
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount,
        };
      }));

      enriched.sort((a: any, b: any) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // GET /api/conversations/:convKey/thread — handles campaign threads AND direct conversations
  app.get('/api/conversations/:convKey/thread', isAuthenticated, async (req: any, res) => {
    try {
      const { convKey } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.userType === 'admin';

      let rawMessages: any[];

      if (convKey.startsWith('direct_')) {
        // Direct conversation between two users — extract user IDs from key
        const parts = convKey.replace('direct_', '').split('_');
        // The key is direct_${sorted user IDs joined by _} but user IDs themselves contain _
        // So we query: messages where (senderId = userId AND receiverId = otherId) OR vice versa
        // Since we only know the key, get all messages that include this user and no campaignId
        rawMessages = await db.select().from(messages)
          .where(sql`${messages.campaignId} IS NULL AND (${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId})`)
          .orderBy(messages.createdAt);
        // Filter to only messages that match both parties in the key
        rawMessages = rawMessages.filter(m => {
          const pair = `direct_${[m.senderId, m.receiverId].sort().join('_')}`;
          return pair === convKey;
        });
      } else {
        // Campaign thread
        rawMessages = await storage.getCampaignMessages(convKey);
        if (!isAdmin) {
          const isParticipant = rawMessages.some(m => m.senderId === userId || m.receiverId === userId);
          if (!isParticipant) return res.status(403).json({ message: 'Not a participant in this conversation' });
        }
      }

      // Enrich with sender info
      const senderCache: Record<string, any> = {};
      const enriched = await Promise.all(rawMessages.map(async (msg) => {
        if (!senderCache[msg.senderId]) {
          const sender = await storage.getUserById(msg.senderId);
          senderCache[msg.senderId] = sender ? { id: sender.id, firstName: sender.firstName, lastName: sender.lastName, userType: sender.userType, companyName: sender.companyName, profileImageUrl: sender.profileImageUrl } : null;
        }
        return { ...msg, sender: senderCache[msg.senderId] };
      }));

      // Deduplicate: multiple DB records created for broadcast messages (one per recipient)
      // Keep only the first occurrence of same sender+content within 10 seconds
      const seen = new Set<string>();
      const deduplicated = enriched.filter((msg) => {
        const ts = Math.floor(new Date(msg.createdAt).getTime() / 10000); // 10-second buckets
        const key = `${msg.senderId}__${msg.content}__${ts}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Mark messages as read
      for (const msg of rawMessages) {
        if (msg.receiverId === userId && !msg.isRead) {
          await storage.markMessageAsRead(msg.id);
        }
      }

      res.json(deduplicated);
    } catch (error) {
      console.error('Error fetching thread:', error);
      res.status(500).json({ message: 'Failed to fetch thread' });
    }
  });

  // POST /api/conversations/:convKey/reply — handles both campaign and direct conversations
  app.post('/api/conversations/:convKey/reply', isAuthenticated, async (req: any, res) => {
    try {
      const { convKey } = req.params;
      const userId = req.user.id;
      const { content, subject, targetUserId } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: 'Content required' });

      if (convKey.startsWith('direct_')) {
        // Direct message — find the other user from the conversation key
        // key = direct_${[senderId, receiverId].sort().join('_')}
        // We need to figure out who the other user is
        // Query existing messages in this thread to find the other party
        const existingMsgs = await db.select().from(messages)
          .where(sql`${messages.campaignId} IS NULL AND (${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId})`)
          .limit(10);
        const matchMsg = existingMsgs.find(m => {
          const pair = `direct_${[m.senderId, m.receiverId].sort().join('_')}`;
          return pair === convKey;
        });
        const receiverId = matchMsg ? (matchMsg.senderId === userId ? matchMsg.receiverId : matchMsg.senderId) : null;
        if (!receiverId) return res.status(404).json({ message: 'Conversation not found' });

        const msg = await storage.createMessage({
          senderId: userId,
          receiverId,
          subject: subject || 'Direct Message',
          content: content.trim(),
          messageType: 'general',
          attachments: [],
        });
        await storage.createNotification({
          userId: receiverId,
          type: 'message',
          title: `New message from ${req.user.firstName}`,
          content: content.substring(0, 80),
          actionUrl: `/messages`,
          relatedId: msg.id,
        });
        return res.status(201).json(msg);
      }

      // Campaign broadcast reply
      const campaign = await storage.getCampaignById(convKey);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

      // Build recipient list
      const participantSet = new Set<string>();
      participantSet.add(campaign.brandId);
      const participations = await storage.getCampaignParticipations(convKey);
      for (const p of participations) participantSet.add(p.userId);
      const admin = await storage.getAdminUser();
      if (admin) participantSet.add(admin.id);

      // If targetUserId is specified (brand sending to one creator only), restrict to just them
      let recipients: string[];
      if (targetUserId && participantSet.has(targetUserId)) {
        recipients = [targetUserId];
      } else {
        participantSet.delete(userId);
        recipients = Array.from(participantSet);
      }

      const sent: any[] = [];
      for (const receiverId of recipients) {
        const msg = await storage.createMessage({
          campaignId: convKey,
          senderId: userId,
          receiverId,
          subject: subject || campaign.title || 'Campaign Message',
          content: content.trim(),
          messageType: req.user.userType === 'admin' ? 'admin_group' : 'general',
          attachments: [],
        });
        await storage.createNotification({
          userId: receiverId,
          type: 'message',
          title: `New message: ${campaign.title || 'Campaign'}`,
          content: `${req.user.firstName} ${req.user.lastName}: ${content.substring(0, 80)}`,
          actionUrl: `/messages?campaign=${convKey}`,
          relatedId: msg.id,
        });
        sent.push(msg);
      }
      res.status(201).json(sent[0] || {});
    } catch (error) {
      console.error('Error sending reply:', error);
      res.status(500).json({ message: 'Failed to send reply' });
    }
  });

  // POST /api/support-tickets — open a support ticket (sends message to admin with support type)
  app.post('/api/support-tickets', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getAdminUser();
      if (!admin) return res.status(404).json({ message: 'No admin available' });
      const { subject, content, priority = 'normal' } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: 'Content required' });
      const msg = await storage.createMessage({
        senderId: req.user.id,
        receiverId: admin.id,
        subject: subject || 'Support Ticket',
        content: `[${priority.toUpperCase()} PRIORITY] ${content.trim()}`,
        messageType: 'support_ticket',
        attachments: [],
      });
      await storage.createNotification({
        userId: admin.id,
        type: 'message',
        title: `Support Ticket: ${subject || 'New request'}`,
        content: `From ${req.user.firstName} ${req.user.lastName}: ${content.substring(0, 80)}`,
        actionUrl: '/messages',
        relatedId: msg.id,
      });
      res.status(201).json(msg);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ message: 'Failed to create support ticket' });
    }
  });

  // GET /api/admin/conversations — admin sees all campaign threads
  app.get('/api/admin/conversations', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));
      const convMap: Record<string, any> = {};
      for (const msg of allMessages) {
        if (!msg.campaignId) continue;
        if (!convMap[msg.campaignId]) {
          convMap[msg.campaignId] = { campaignId: msg.campaignId, lastMessage: msg, messageCount: 0, hasAdminMessage: false };
        }
        convMap[msg.campaignId].messageCount++;
        if (msg.messageType === 'admin_group') convMap[msg.campaignId].hasAdminMessage = true;
        if (new Date(msg.createdAt) > new Date(convMap[msg.campaignId].lastMessage.createdAt)) {
          convMap[msg.campaignId].lastMessage = msg;
        }
      }
      const enriched = await Promise.all(Object.values(convMap).map(async (conv) => {
        const campaign = await storage.getCampaignById(conv.campaignId);
        return { ...conv, campaign: campaign ? { id: campaign.id, title: campaign.title } : null };
      }));
      enriched.sort((a: any, b: any) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch admin conversations' });
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

  // ── Guide Bot — send AI guide message to user inbox ──────────────────────
  app.post('/api/guide/send-to-inbox', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getAdminUser();
      if (!admin) return res.status(404).json({ message: "System admin not found" });
      const { subject, content } = req.body;
      const message = await storage.createMessage({
        senderId: admin.id,
        receiverId: req.user.id,
        subject: subject || 'Your Taskdrip Guide Report',
        content,
        messageType: 'general',
        attachments: [],
      });
      res.status(201).json(message);
    } catch (error) {
      console.error('Error sending guide message:', error);
      res.status(500).json({ message: "Failed to send guide message" });
    }
  });

  // ── Guide Bot — AI chat endpoint ──────────────────────────────────────────
  app.post('/api/guide/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { messages, userContext } = req.body;
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "AI assistant not configured." });
      }

      const systemPrompt = `You are Taskdrip Guide, an intelligent personal AI assistant for the Taskdrip Influencer Marketplace platform. You help users grow their influence, earn more, and succeed on the platform.

Platform context:
- Taskdrip is a SocialFi influencer marketplace where creators earn crypto (USDT) by completing brand campaigns
- Creator tiers: Explorer (0 followers), Aspiring Creator (1–10K followers), Rising Sparks (10K–100K), Growth Engine (100K–1M), Power Influencer (1M–10M), Global Titan (10M+)
- BreedSkool is Taskdrip's learning platform with courses on Instagram, TikTok, YouTube, content creation, monetization, and branding
- Brands post campaigns, creators apply and complete them for crypto rewards
- The Shop sells digital tools, templates, and resources for influencers

Current user context:
${JSON.stringify(userContext, null, 2)}

Instructions:
- Be conversational, helpful, specific, and actionable
- Reference the user's actual data (tier, followers, niche, campaigns completed) when giving advice
- Keep responses concise but valuable — 2–5 sentences max unless a list is more helpful
- Use emojis sparingly for warmth
- If the user asks anything unrelated to the platform, gently redirect them back to how Taskdrip can help them`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Groq API error:', errText);
        return res.status(500).json({ message: 'AI service error' });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I'm here to help! Could you rephrase your question?";
      res.json({ reply });
    } catch (error: any) {
      console.error('AI chat error:', error);
      res.status(500).json({ message: error.message || "Failed to get AI response" });
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

  // ── BreedSkool Course Routes ──────────────────────────────────────────────

  // Public: list all published courses
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await storage.getAllCourses(true);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Admin: list all courses (including drafts)
  app.get('/api/courses/admin/all', isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any).userType !== 'admin' && (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const courses = await storage.getAllCourses(false);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Admin: list all enrollments
  app.get('/api/courses/admin/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any).userType !== 'admin' && (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const enrollments = await storage.getAllEnrollments();
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Auth: get my enrollments
  app.get('/api/courses/my-enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const enrollments = await storage.getMyEnrollments(req.user.id);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Public: get a single course
  app.get('/api/courses/:id', async (req, res) => {
    try {
      const course = await storage.getCourseById(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Admin / Premium Influencer: create course
  app.post('/api/courses', isAuthenticated, upload.single('thumbnail'), async (req: any, res) => {
    try {
      const u = req.user as any;
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      const isPremiumInfluencer = u.subscriptionStatus === 'active' && u.isVerified;
      if (!isAdmin && !isPremiumInfluencer) {
        return res.status(403).json({ message: "Only admins or premium verified influencers can create courses" });
      }
      const body = { ...req.body };
      if (req.file) body.thumbnail = `/uploads/${req.file.filename}`;
      if (typeof body.whatYouLearn === 'string') {
        try { body.whatYouLearn = JSON.parse(body.whatYouLearn); } catch { body.whatYouLearn = body.whatYouLearn.split('\n').filter(Boolean); }
      }
      if (typeof body.requirements === 'string') {
        try { body.requirements = JSON.parse(body.requirements); } catch { body.requirements = body.requirements.split('\n').filter(Boolean); }
      }
      if (body.lessonsCount) body.lessonsCount = parseInt(body.lessonsCount);
      if (body.isFree !== undefined) body.isFree = body.isFree === 'true' || body.isFree === true;
      if (body.isPublished !== undefined) body.isPublished = body.isPublished === 'true' || body.isPublished === true;
      if (body.isFeatured !== undefined) body.isFeatured = body.isFeatured === 'true' || body.isFeatured === true;
      const course = await storage.createCourse({ ...body, instructorId: u.id });
      res.status(201).json(course);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create course" });
    }
  });

  // Admin / Instructor: update course
  app.patch('/api/courses/:id', isAuthenticated, upload.single('thumbnail'), async (req: any, res) => {
    try {
      const u = req.user as any;
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      const course = await storage.getCourseById(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (!isAdmin && course.instructorId !== u.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const body = { ...req.body };
      if (req.file) body.thumbnail = `/uploads/${req.file.filename}`;
      if (typeof body.whatYouLearn === 'string') {
        try { body.whatYouLearn = JSON.parse(body.whatYouLearn); } catch { body.whatYouLearn = body.whatYouLearn.split('\n').filter(Boolean); }
      }
      if (typeof body.requirements === 'string') {
        try { body.requirements = JSON.parse(body.requirements); } catch { body.requirements = body.requirements.split('\n').filter(Boolean); }
      }
      if (body.lessonsCount) body.lessonsCount = parseInt(body.lessonsCount);
      if (body.isFree !== undefined) body.isFree = body.isFree === 'true' || body.isFree === true;
      if (body.isPublished !== undefined) body.isPublished = body.isPublished === 'true' || body.isPublished === true;
      if (body.isFeatured !== undefined) body.isFeatured = body.isFeatured === 'true' || body.isFeatured === true;
      const updated = await storage.updateCourse(req.params.id, body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update course" });
    }
  });

  // Admin: delete course
  app.delete('/api/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      if (u.userType !== 'admin' && u.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteCourse(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete course" });
    }
  });

  // Auth: get current user enrollment for a course
  app.get('/api/courses/:id/enrollment', isAuthenticated, async (req: any, res) => {
    try {
      const enrollment = await storage.getCourseEnrollment(req.params.id, req.user.id);
      if (!enrollment) return res.status(404).json(null);
      res.json(enrollment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch enrollment" });
    }
  });

  // Auth: enroll in a course
  app.post('/api/courses/:id/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const course = await storage.getCourseById(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const existing = await storage.getCourseEnrollment(req.params.id, req.user.id);
      if (existing) return res.status(400).json({ message: "Already enrolled in this course" });
      const enrollment = await storage.createEnrollment({
        courseId: req.params.id,
        userId: req.user.id,
        isFree: course.isFree,
        paymentMethod: req.body.paymentMethod,
        paymentProof: req.body.paymentProof,
        transactionHash: req.body.transactionHash,
        amount: course.isFree ? "0.00" : (course.price || "0.00"),
      });
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to enroll" });
    }
  });

  // Admin: approve enrollment payment
  app.post('/api/courses/enrollments/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      if ((req.user as any).userType !== 'admin' && (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const enrollment = await storage.approveEnrollment(req.params.id, req.user.id);
      res.json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to approve enrollment" });
    }
  });

  // Public: get course reviews
  app.get('/api/courses/:id/reviews', async (req, res) => {
    try {
      const reviews = await storage.getCourseReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Auth: post a review
  app.post('/api/courses/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const review = await storage.createCourseReview({
        courseId: req.params.id,
        userId: req.user.id,
        rating: req.body.rating,
        comment: req.body.comment,
      });
      res.status(201).json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to post review" });
    }
  });

  // Public: get course comments
  app.get('/api/courses/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getCourseComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Auth: post a comment
  app.post('/api/courses/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const comment = await storage.createCourseComment({
        courseId: req.params.id,
        userId: req.user.id,
        content: req.body.content,
        parentId: req.body.parentId,
      });
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to post comment" });
    }
  });

  // Auth: check if liked
  app.get('/api/courses/:id/liked', isAuthenticated, async (req: any, res) => {
    try {
      const liked = await storage.getCourseLike(req.params.id, req.user.id);
      res.json(liked);
    } catch (error) {
      res.status(500).json({ message: "Failed to check like" });
    }
  });

  // Auth: toggle like
  app.post('/api/courses/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const liked = await storage.toggleCourseLike(req.params.id, req.user.id);
      res.json({ liked });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to toggle like" });
    }
  });

  // ── Lessons ──────────────────────────────────────────────────
  // GET lessons for a course (public preview + enrolled)
  app.get('/api/courses/:id/lessons', async (req: any, res) => {
    try {
      const lessons = await storage.getLessonsByCourse(req.params.id);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  // Admin: create lesson (with optional file uploads)
  app.post('/api/courses/:id/lessons', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      const course = await storage.getCourseById(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (!isAdmin && course.instructorId !== u.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const body = req.body;
      const lesson = await storage.createLesson({
        courseId: req.params.id,
        title: body.title,
        description: body.description,
        videoLink: body.videoLink,
        content: body.content,
        order: body.order ? parseInt(body.order) : 0,
        lessonFiles: Array.isArray(body.lessonFiles) ? body.lessonFiles : [],
        isPreview: body.isPreview === true || body.isPreview === 'true',
      });
      res.status(201).json(lesson);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create lesson" });
    }
  });

  // Admin: update lesson
  app.patch('/api/courses/:courseId/lessons/:lessonId', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      const course = await storage.getCourseById(req.params.courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (!isAdmin && course.instructorId !== u.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const body = req.body;
      const updates: any = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.videoLink !== undefined) updates.videoLink = body.videoLink;
      if (body.content !== undefined) updates.content = body.content;
      if (body.order !== undefined) updates.order = parseInt(body.order);
      if (body.isPreview !== undefined) updates.isPreview = body.isPreview === true || body.isPreview === 'true';
      if (body.lessonFiles !== undefined) updates.lessonFiles = Array.isArray(body.lessonFiles) ? body.lessonFiles : [];
      const updated = await storage.updateLesson(req.params.lessonId, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update lesson" });
    }
  });

  // Admin: delete lesson
  app.delete('/api/courses/:courseId/lessons/:lessonId', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      const course = await storage.getCourseById(req.params.courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (!isAdmin && course.instructorId !== u.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteLesson(req.params.lessonId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete lesson" });
    }
  });

  // ── Course Chat ───────────────────────────────────────────────
  app.get('/api/courses/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const msgs = await storage.getCourseMessages(req.params.id);
      res.json(msgs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/courses/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const msg = await storage.createCourseMessage({
        courseId: req.params.id,
        senderId: req.user.id,
        message: req.body.message,
      });
      // Fetch with sender info
      const msgs = await storage.getCourseMessages(req.params.id);
      const full = msgs.find((m) => m.id === msg.id) || msg;
      res.status(201).json(full);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send message" });
    }
  });

  // ── Generic image upload ─────────────────────────────────────
  app.post('/api/upload/image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  // Product like/dislike: get user's reaction
  app.get('/api/shop/products/:id/reaction', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { productLikes } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const reaction = await db.select().from(productLikes)
        .where(and(eq(productLikes.productId, req.params.id), eq(productLikes.userId, req.user.id)))
        .limit(1);
      res.json(reaction[0] || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reaction" });
    }
  });

  // Product like/dislike: toggle
  app.post('/api/shop/products/:id/react', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { productLikes, shopProducts } = await import('@shared/schema');
      const { eq, and, sql } = await import('drizzle-orm');
      const { type } = req.body; // 'like' or 'dislike'
      if (!['like', 'dislike'].includes(type)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }
      const existing = await db.select().from(productLikes)
        .where(and(eq(productLikes.productId, req.params.id), eq(productLikes.userId, req.user.id)))
        .limit(1);

      if (existing.length > 0) {
        const prev = existing[0];
        if (prev.type === type) {
          // Remove reaction
          await db.delete(productLikes).where(eq(productLikes.id, prev.id));
          await db.update(shopProducts).set({
            [type === 'like' ? 'likesCount' : 'dislikesCount']: sql`GREATEST(0, ${type === 'like' ? shopProducts.likesCount : shopProducts.dislikesCount} - 1)`,
          }).where(eq(shopProducts.id, req.params.id));
          return res.json({ action: 'removed', type });
        } else {
          // Switch reaction
          await db.update(productLikes).set({ type }).where(eq(productLikes.id, prev.id));
          await db.update(shopProducts).set({
            likesCount: sql`CASE WHEN ${type} = 'like' THEN ${shopProducts.likesCount} + 1 ELSE GREATEST(0, ${shopProducts.likesCount} - 1) END`,
            dislikesCount: sql`CASE WHEN ${type} = 'dislike' THEN ${shopProducts.dislikesCount} + 1 ELSE GREATEST(0, ${shopProducts.dislikesCount} - 1) END`,
          }).where(eq(shopProducts.id, req.params.id));
          return res.json({ action: 'switched', type });
        }
      } else {
        // Add new reaction
        await db.insert(productLikes).values({
          productId: req.params.id,
          userId: req.user.id,
          type,
        });
        await db.update(shopProducts).set({
          [type === 'like' ? 'likesCount' : 'dislikesCount']: sql`${type === 'like' ? shopProducts.likesCount : shopProducts.dislikesCount} + 1`,
        }).where(eq(shopProducts.id, req.params.id));
        return res.json({ action: 'added', type });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to react" });
    }
  });

  // Admin: update own credentials (email/password)
  app.put('/api/admin/credentials', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin only" });
      }
      const { newEmail, newPassword, currentPassword } = req.body;
      const bcrypt = await import('bcrypt');
      const valid = await bcrypt.compare(currentPassword, req.user.password);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const updates: any = {};
      if (newEmail && newEmail !== req.user.email) {
        const existing = await storage.getUserByEmail(newEmail);
        if (existing && existing.id !== req.user.id) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updates.email = newEmail;
      }
      if (newPassword) {
        if (newPassword.length < 8) {
          return res.status(400).json({ message: "New password must be at least 8 characters" });
        }
        updates.password = await bcrypt.hash(newPassword, 12);
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No changes provided" });
      }
      await storage.updateUserProfile(req.user.id, updates);
      res.json({ message: "Credentials updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update credentials" });
    }
  });

  // ═══════════════════════════════════════════════════
  // SOCIAL PLATFORMS (admin-managed)
  // ═══════════════════════════════════════════════════
  app.get('/api/social-platforms', async (req, res) => {
    try {
      const platforms = await storage.getActiveSocialPlatforms();
      res.json(platforms);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/social-platforms', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const platforms = await storage.getAllSocialPlatforms();
      res.json(platforms);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/admin/social-platforms', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const platform = await storage.createSocialPlatform(req.body);
      res.json(platform);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/social-platforms/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const platform = await storage.updateSocialPlatform(req.params.id, req.body);
      res.json(platform);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/admin/social-platforms/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      await storage.deleteSocialPlatform(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ═══════════════════════════════════════════════════
  // USER SOCIAL LINKS
  // ═══════════════════════════════════════════════════
  app.get('/api/users/:id/social-links', async (req, res) => {
    try {
      const links = await storage.getUserSocialLinks(req.params.id);
      res.json(links);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/users/:id/social-links', isAuthenticated, async (req: any, res) => {
    try {
      const requester = await storage.getUser(req.user.id);
      if (req.user.id !== req.params.id && requester?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { links } = req.body;
      await storage.replaceUserSocialLinks(req.params.id, links || []);
      const updated = await storage.getUserSocialLinks(req.params.id);

      // Recalculate totalFollowers and creatorTier from the saved links
      const totalFollowers = updated.reduce((sum: number, l: any) => sum + (Number(l.followerCount) || 0), 0);
      let creatorTier = 'newcomer';
      if (totalFollowers >= 10_000_000) creatorTier = 'global_titans';
      else if (totalFollowers >= 1_000_000) creatorTier = 'power_influencers';
      else if (totalFollowers >= 100_000) creatorTier = 'growth_engines';
      else if (totalFollowers >= 10_000) creatorTier = 'rising_sparks';
      else if (totalFollowers >= 1) creatorTier = 'aspiring';
      await storage.updateUserProfile(req.params.id, { totalFollowers, creatorTier } as any);

      res.json({ links: updated, totalFollowers, creatorTier });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Content rates — what a creator charges per content type
  app.patch('/api/users/:id/rates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.id !== req.params.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const updatedUser = await storage.updateUserProfile(req.params.id, { contentRates: req.body });
      const { password, ...safe } = updatedUser as any;
      res.json(safe);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ═══════════════════════════════════════════════════
  // PORTFOLIO ITEMS
  // ═══════════════════════════════════════════════════
  app.get('/api/users/:id/portfolio', async (req, res) => {
    try {
      const items = await storage.getUserPortfolio(req.params.id);
      res.json(items);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Upload portfolio image — returns { url }
  app.post('/api/portfolio/upload-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No image file provided' });
      res.json({ url: `/uploads/${req.file.filename}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/portfolio', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const body = { ...req.body };
      if (req.file) body.imageUrl = `/uploads/${req.file.filename}`;
      const item = await storage.createPortfolioItem({ ...body, userId: req.user.id });
      res.json(item);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/portfolio/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const body = { ...req.body };
      if (req.file) body.imageUrl = `/uploads/${req.file.filename}`;
      const item = await storage.updatePortfolioItem(req.params.id, body);
      res.json(item);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/portfolio/:id', isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.updatePortfolioItem(req.params.id, req.body);
      res.json(item);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/portfolio/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deletePortfolioItem(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ═══════════════════════════════════════════════════
  // DIRECT HIRE OFFERS
  // ═══════════════════════════════════════════════════

  // Brand sends an offer to an influencer
  app.post('/api/direct-hire', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'brand' && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Only brands can send hire offers' });
      }
      const { influencerId, title, description, deliverables, budget, deadline } = req.body;
      if (!influencerId || !title || !description || !budget) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const baseBudget = Number(budget);
      const brandPlatformFee = +(baseBudget * 0.10).toFixed(2);
      const brandTotalCharge = +(baseBudget + brandPlatformFee).toFixed(2);
      const influencerPlatformFee = +(baseBudget * 0.10).toFixed(2);
      const influencerPayout = +(baseBudget - influencerPlatformFee).toFixed(2);
      const offer = await storage.createDirectHireOffer({
        brandId: req.user.id,
        influencerId,
        title,
        description,
        deliverables,
        budget: baseBudget.toFixed(2),
        brandPlatformFee: brandPlatformFee.toFixed(2),
        brandTotalCharge: brandTotalCharge.toFixed(2),
        platformFeeAmount: influencerPlatformFee.toFixed(2),
        influencerPayout: influencerPayout.toFixed(2),
        deadline: deadline ? new Date(deadline) : null,
        status: 'pending',
      });
      // Notify influencer
      await storage.createNotification({
        userId: influencerId,
        type: 'direct_hire_offer',
        title: '💼 New Hire Offer!',
        content: `${req.user.firstName} ${req.user.lastName} wants to hire you for: "${title}"`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(offer);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get brand's sent offers
  app.get('/api/direct-hire/sent', isAuthenticated, async (req: any, res) => {
    try {
      const offers = await storage.getDirectHireOffersByBrand(req.user.id);
      // Enrich with influencer info
      const enriched = await Promise.all(offers.map(async (o: any) => {
        const influencer = await storage.getUser(o.influencerId);
        return { ...o, influencer: influencer ? { id: influencer.id, firstName: influencer.firstName, lastName: influencer.lastName, profileImageUrl: influencer.profileImageUrl, creatorTier: influencer.creatorTier } : null };
      }));
      res.json(enriched);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get influencer's received offers
  app.get('/api/direct-hire/received', isAuthenticated, async (req: any, res) => {
    try {
      const offers = await storage.getDirectHireOffersByInfluencer(req.user.id);
      const enriched = await Promise.all(offers.map(async (o: any) => {
        const brand = await storage.getUser(o.brandId);
        return { ...o, brand: brand ? { id: brand.id, firstName: brand.firstName, lastName: brand.lastName, companyName: brand.companyName, profileImageUrl: brand.profileImageUrl } : null };
      }));
      res.json(enriched);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Get single offer (for payment page)
  app.get('/api/direct-hire/:id', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      // Only brand or influencer involved can view
      if (offer.brandId !== req.user.id && offer.influencerId !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const brand = await storage.getUser(offer.brandId);
      const influencer = await storage.getUser(offer.influencerId);
      res.json({
        ...offer,
        brand: brand ? { id: brand.id, firstName: brand.firstName, lastName: brand.lastName, companyName: brand.companyName, profileImageUrl: brand.profileImageUrl } : null,
        influencer: influencer ? { id: influencer.id, firstName: influencer.firstName, lastName: influencer.lastName, profileImageUrl: influencer.profileImageUrl } : null,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/direct-hire/:id/blockchain-verification', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.brandId !== req.user.id && offer.influencerId !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const expectedAmount = Number(offer.brandTotalCharge || offer.budget || 0);
      const report = await verifyBlockchainTransaction(offer.paymentNetwork, offer.transactionHash, expectedAmount);
      res.json(report);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/direct-hire/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.brandId !== req.user.id && offer.influencerId !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const rows = await db.select().from(messages)
        .where(and(eq(messages.referenceType, 'direct_hire'), eq(messages.referenceId, offer.id)))
        .orderBy(messages.createdAt);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/direct-hire/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.status === 'pending') return res.status(400).json({ message: 'Chat opens after the offer is accepted' });
      if (offer.brandId !== req.user.id && offer.influencerId !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const content = String(req.body.content || '').trim();
      if (!content) return res.status(400).json({ message: 'Message is required' });
      const receiverId = req.user.id === offer.brandId ? offer.influencerId : offer.brandId;
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId,
        subject: `Direct hire: ${offer.title}`,
        content,
        messageType: 'direct_hire',
        referenceType: 'direct_hire',
        referenceId: offer.id,
      } as any);
      await storage.createNotification({
        userId: receiverId,
        type: 'direct_hire_message',
        title: 'New project message',
        content: `${req.user.firstName} sent a message on "${offer.title}".`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(message);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/direct-hire/:id/submit-work', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.influencerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      if (!['active', 'revision_requested'].includes(offer.status)) return res.status(400).json({ message: 'Work can only be submitted on an active project' });
      const workSubmissionUrl = String(req.body.workSubmissionUrl || '').trim();
      const workSubmissionNote = String(req.body.workSubmissionNote || '').trim();
      if (!workSubmissionUrl && !workSubmissionNote) return res.status(400).json({ message: 'Add a link or note for your submitted work' });
      const updated = await storage.updateDirectHireOffer(offer.id, {
        status: 'work_submitted',
        workSubmissionUrl,
        workSubmissionNote,
        workSubmittedAt: new Date(),
        revisionNote: null,
      });
      await storage.createNotification({
        userId: offer.brandId,
        type: 'direct_hire_work_submitted',
        title: 'Work submitted for approval',
        content: `${req.user.firstName} submitted work for "${offer.title}".`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/direct-hire/:id/request-revision', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.brandId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      if (offer.status !== 'work_submitted') return res.status(400).json({ message: 'A revision can only be requested after work is submitted' });
      const revisionNote = String(req.body.revisionNote || '').trim();
      if (!revisionNote) return res.status(400).json({ message: 'Revision note is required' });
      const updated = await storage.updateDirectHireOffer(offer.id, { status: 'revision_requested', revisionNote });
      await storage.createNotification({
        userId: offer.influencerId,
        type: 'direct_hire_revision_requested',
        title: 'Revision requested',
        content: `The brand requested changes on "${offer.title}".`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/direct-hire/:id/approve-work', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.brandId !== req.user.id && req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      if (offer.status !== 'work_submitted') return res.status(400).json({ message: 'Work must be submitted before approval' });
      const payout = Number(offer.influencerPayout || Number(offer.budget) * 0.9);
      const platformFee = Number(offer.platformFeeAmount || Number(offer.budget) * 0.1);
      const brandFee = Number(offer.brandPlatformFee || Number(offer.budget) * 0.1);
      const updated = await storage.updateDirectHireOffer(offer.id, { status: 'completed', completedAt: new Date() });
      await db.update(users).set({
        availableBalance: sql`${users.availableBalance} + ${payout}`,
        pendingBalance: sql`GREATEST(${users.pendingBalance} - ${payout}, 0)`,
        totalEarned: sql`${users.totalEarned} + ${payout}`,
        completedCampaigns: sql`${users.completedCampaigns} + 1`,
        updatedAt: new Date(),
      }).where(eq(users.id, offer.influencerId));
      await storage.createTransaction({
        userId: offer.influencerId,
        amount: payout.toFixed(2),
        type: 'direct_hire_payout',
        status: 'completed',
        description: `Direct hire payout for "${offer.title}" after 10% creator fee`,
        referenceType: 'direct_hire',
        referenceId: offer.id,
        processedAt: new Date(),
      } as any);
      await storage.createTransaction({
        userId: offer.influencerId,
        amount: platformFee.toFixed(2),
        type: 'platform_fee',
        status: 'completed',
        description: `10% creator platform fee for "${offer.title}"`,
        referenceType: 'direct_hire',
        referenceId: offer.id,
        processedAt: new Date(),
      } as any);
      const admins = await storage.getUsersByType('admin');
      const primaryAdmin = admins[0];
      if (primaryAdmin) {
        const platformRevenue = platformFee + brandFee;
        await db.update(users).set({
          availableBalance: sql`${users.availableBalance} + ${platformRevenue}`,
          totalEarned: sql`${users.totalEarned} + ${platformRevenue}`,
          updatedAt: new Date(),
        }).where(eq(users.id, primaryAdmin.id));
        await storage.createTransaction({
          userId: primaryAdmin.id,
          amount: platformRevenue.toFixed(2),
          type: 'platform_revenue',
          status: 'completed',
          description: `Direct hire platform revenue for "${offer.title}"`,
          referenceType: 'direct_hire',
          referenceId: offer.id,
          processedAt: new Date(),
        } as any);
      }
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: 'direct_hire_completed',
          title: 'Direct hire completed',
          content: `"${offer.title}" was approved. Platform revenue: $${(platformFee + brandFee).toFixed(2)}.`,
          actionUrl: `/admin?tab=direct-hires`,
        });
      }
      await storage.createNotification({
        userId: offer.influencerId,
        type: 'direct_hire_completed',
        title: 'Project approved and paid',
        content: `Your work for "${offer.title}" was approved. $${payout.toFixed(2)} is now available.`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/direct-hire/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.brandId !== req.user.id && offer.influencerId !== req.user.id && req.user.userType !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const rows = await db.select().from(userReviews)
        .where(and(eq(userReviews.referenceType, 'direct_hire'), eq(userReviews.referenceId, offer.id)))
        .orderBy(desc(userReviews.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/direct-hire/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.status !== 'completed') return res.status(400).json({ message: 'Reviews open after the project is completed' });
      if (offer.brandId !== req.user.id && offer.influencerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      const rating = Number(req.body.rating);
      const comment = String(req.body.comment || '').trim();
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be from 1 to 5' });
      const revieweeId = req.user.id === offer.brandId ? offer.influencerId : offer.brandId;
      const existing = await db.select().from(userReviews)
        .where(and(eq(userReviews.referenceType, 'direct_hire'), eq(userReviews.referenceId, offer.id), eq(userReviews.reviewerId, req.user.id)));
      if (existing.length) return res.status(400).json({ message: 'You already reviewed this project' });
      const [review] = await db.insert(userReviews).values({
        reviewerId: req.user.id,
        revieweeId,
        rating,
        comment,
        referenceType: 'direct_hire',
        referenceId: offer.id,
      }).returning();
      const ratings = await db.select({ avg: sql<string>`AVG(${userReviews.rating})`, count: sql<string>`COUNT(*)` }).from(userReviews).where(eq(userReviews.revieweeId, revieweeId));
      await db.update(users).set({ rating: String(Number(ratings[0]?.avg || 0).toFixed(2)), updatedAt: new Date() }).where(eq(users.id, revieweeId));
      res.json(review);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Influencer accepts an offer
  app.patch('/api/direct-hire/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.influencerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      if (offer.status !== 'pending') return res.status(400).json({ message: 'Offer is not pending' });
      const updated = await storage.updateDirectHireOffer(req.params.id, { status: 'accepted' });
      // Notify brand
      await storage.createNotification({
        userId: offer.brandId,
        type: 'direct_hire_accepted',
        title: '🎉 Offer Accepted!',
        content: `${req.user.firstName} accepted your hire offer "${offer.title}". Please proceed to payment.`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Influencer rejects an offer
  app.patch('/api/direct-hire/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.influencerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      if (!['pending', 'accepted'].includes(offer.status)) return res.status(400).json({ message: 'Cannot reject at this stage' });
      const updated = await storage.updateDirectHireOffer(req.params.id, { status: 'rejected', rejectionReason: req.body.reason || '' });
      // Notify brand
      await storage.createNotification({
        userId: offer.brandId,
        type: 'direct_hire_rejected',
        title: '❌ Offer Declined',
        content: `${req.user.firstName} declined your hire offer "${offer.title}".`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Brand submits payment proof for an accepted offer
  app.post('/api/direct-hire/:id/submit-payment', isAuthenticated, upload.single('paymentScreenshot'), async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.brandId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      if (offer.status !== 'accepted') return res.status(400).json({ message: 'Offer must be accepted before payment' });
      const { transactionHash, paymentNetwork } = req.body;
      const paymentProof = req.file ? `/uploads/${req.file.filename}` : null;
      const verification = await verifyBlockchainTransaction(paymentNetwork, transactionHash, Number(offer.brandTotalCharge || offer.budget || 0));
      const updated = await storage.updateDirectHireOffer(req.params.id, {
        status: 'payment_submitted',
        transactionHash,
        paymentNetwork,
        paymentProof,
        adminNote: verification.message,
      });
      // Notify admin
      const admins = await storage.getUsersByType('admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: 'direct_hire_payment',
          title: '💰 Direct Hire Payment Submitted',
          content: `Brand "${req.user.firstName}" submitted payment for offer "${offer.title}". Please verify.`,
          actionUrl: `/admin?tab=direct-hires`,
        });
      }
      // Notify influencer
      await storage.createNotification({
        userId: offer.influencerId,
        type: 'direct_hire_payment',
        title: '💳 Payment Submitted',
        content: `Payment has been submitted for your project "${offer.title}". Awaiting admin confirmation.`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json({ ...updated, verification });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin activates an offer (confirms payment)
  app.patch('/api/admin/direct-hire/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      const updated = await storage.updateDirectHireOffer(req.params.id, {
        status: 'active',
        adminNote: req.body.note || '',
        activatedAt: new Date(),
      });
      const payout = Number(offer.influencerPayout || Number(offer.budget) * 0.9);
      const brandTotalCharge = Number(offer.brandTotalCharge || Number(offer.budget) * 1.1);
      await db.update(users).set({
        pendingBalance: sql`${users.pendingBalance} + ${payout}`,
        updatedAt: new Date(),
      }).where(eq(users.id, offer.influencerId));
      await storage.createTransaction({
        userId: offer.brandId,
        amount: brandTotalCharge.toFixed(2),
        type: 'direct_hire_escrow',
        status: 'completed',
        transactionHash: offer.transactionHash,
        network: offer.paymentNetwork,
        description: `Escrow funded for "${offer.title}" including 10% brand platform fee`,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        referenceType: 'direct_hire',
        referenceId: offer.id,
        processedAt: new Date(),
      } as any);
      // Notify both parties
      await storage.createNotification({
        userId: offer.brandId,
        type: 'direct_hire_active',
        title: '✅ Project Activated!',
        content: `Your payment was confirmed. Project "${offer.title}" is now active!`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      await storage.createNotification({
        userId: offer.influencerId,
        type: 'direct_hire_active',
        title: '🚀 Project Started!',
        content: `Payment confirmed. Your project "${offer.title}" is now officially active!`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin rejects payment
  app.patch('/api/admin/direct-hire/:id/reject-payment', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      const updated = await storage.updateDirectHireOffer(req.params.id, {
        status: 'accepted', // revert to accepted so brand can retry payment
        adminNote: req.body.note || 'Payment could not be verified',
      });
      await storage.createNotification({
        userId: offer.brandId,
        type: 'direct_hire_payment_failed',
        title: '⚠️ Payment Verification Failed',
        content: `Your payment for "${offer.title}" could not be verified. Please resubmit proof.`,
        actionUrl: `/direct-hire/${offer.id}`,
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: list all direct hire offers
  app.get('/api/admin/direct-hire', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const offers = await storage.getAllDirectHireOffers();
      const enriched = await Promise.all(offers.map(async (o: any) => {
        const brand = await storage.getUser(o.brandId);
        const influencer = await storage.getUser(o.influencerId);
        return {
          ...o,
          brand: brand ? { firstName: brand.firstName, lastName: brand.lastName, companyName: brand.companyName } : null,
          influencer: influencer ? { firstName: influencer.firstName, lastName: influencer.lastName } : null,
        };
      }));
      res.json(enriched);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ═══════════════════════════════════════════════════
  // PUSH NOTIFICATION SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys) return res.status(400).json({ message: 'Missing endpoint or keys' });
      await storage.savePushSubscription({ userId: req.user.id, endpoint, keys, userAgent: req.headers['user-agent'] });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) await storage.removePushSubscription(endpoint);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/push/vapid-public-key', async (_req, res) => {
    try {
      const { publicKey } = await getWebPushState();
      res.json({ publicKey });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ═══════════════════════════════════════════════════
  // PUSH NOTIFICATION CAMPAIGNS (admin)
  // ═══════════════════════════════════════════════════
  app.get('/api/admin/push-notifications', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const campaigns = await storage.getAllPushNotificationCampaigns();
      res.json(campaigns);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/admin/push-notifications', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { title, body, icon, clickUrl, targetType } = req.body;
      if (!title || !body) return res.status(400).json({ message: 'Title and body required' });
      const campaign = await storage.createPushNotificationCampaign({ title, body, icon, clickUrl, targetType: targetType || 'all', createdBy: req.user.id });
      res.json(campaign);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/push-notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const campaign = await storage.updatePushNotificationCampaign(req.params.id, req.body);
      res.json(campaign);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/admin/push-notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      await storage.deletePushNotificationCampaign(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Send a push notification campaign
  app.post('/api/admin/push-notifications/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const campaigns = await storage.getAllPushNotificationCampaigns();
      const campaign = campaigns.find(c => c.id === req.params.id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      const result = await sendPushToTarget(campaign.targetType || 'all', {
        title: campaign.title,
        body: campaign.body,
        icon: campaign.icon,
        clickUrl: campaign.clickUrl,
      });
      await storage.updatePushNotificationCampaign(req.params.id, {
        status: 'sent',
        sentAt: new Date(),
        sentCount: result.sentCount,
      });
      res.json({ success: true, sentCount: result.sentCount, message: `Delivered to ${result.sentCount} of ${result.total} subscribers` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // PWA Settings routes
  app.get('/api/pwa-settings', async (_req, res) => {
    try {
      const settings = await storage.getPwaSettings();
      res.json(settings);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/pwa-settings', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const updated = await storage.updatePwaSettings(req.body);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Admin: Create campaign directly (no escrow required) ──────────────────
  app.post('/api/admin/campaigns', isAuthenticated, upload.single('featureImage'), async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const adminUser = await storage.getUser(req.user.id);
      if (!adminUser) return res.status(404).json({ message: 'Admin user not found' });

      const featureImagePath = req.file ? `/uploads/${req.file.filename}` : req.body.featureImage || null;
      const campaignId = `campaign_${Date.now()}_${nanoid(9)}`;

      const campaign = await storage.createCampaign({
        id: campaignId,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        platform: req.body.platform || null,
        brandName: req.body.brandName || 'Taskdrip Official',
        brandLogo: adminUser.profileImageUrl || null,
        brandId: req.user.id,
        reward: req.body.reward,
        totalSlots: parseInt(req.body.totalSlots) || 10,
        estimatedTime: req.body.estimatedTime || '30 min',
        requirements: req.body.requirements ? [req.body.requirements] : [],
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        featureImage: featureImagePath,
        instructionVideoUrl: req.body.instructionVideoUrl || null,
        status: 'active',
        paymentStatus: 'completed',
        isActive: true,
      } as any);

      await sendPushToTarget('creators', {
        title: 'New Taskdrip campaign is live',
        body: `${campaign.title} is open now. Apply before the creator slots are gone.`,
        icon: campaign.featureImage || '/icon-192.png',
        clickUrl: `/campaigns/${campaign.id}`,
      }).catch((error) => console.error("Campaign launch push failed:", error?.message || error));

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating admin campaign:', error);
      res.status(500).json({ message: 'Failed to create campaign' });
    }
  });

  // ── Admin: Update any campaign ─────────────────────────────────────────────
  app.put('/api/admin/campaigns/:id', isAuthenticated, upload.single('featureImage'), async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });

      const updates: Record<string, any> = { ...req.body };
      if (req.file) updates.featureImage = `/uploads/${req.file.filename}`;
      if (updates.totalSlots) updates.totalSlots = parseInt(updates.totalSlots);
      if (updates.deadline) updates.deadline = new Date(updates.deadline);
      if (updates.requirements && typeof updates.requirements === 'string') updates.requirements = [updates.requirements];

      const campaign = await storage.updateCampaign(req.params.id, updates);
      res.json(campaign);
    } catch (error) {
      console.error('Error updating admin campaign:', error);
      res.status(500).json({ message: 'Failed to update campaign' });
    }
  });

  // ── Admin: Delete campaign ─────────────────────────────────────────────────
  app.delete('/api/admin/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting admin campaign:', error);
      res.status(500).json({ message: 'Failed to delete campaign' });
    }
  });

  // ── Admin: Get ALL task submissions across all campaigns ────────────────────
  app.get('/api/admin/all-submissions', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const submissions = await db
        .select()
        .from(taskSubmissions)
        .orderBy(desc(taskSubmissions.submittedAt));

      const enriched = await Promise.all(submissions.map(async (s: any) => {
        const [creator, campaign] = await Promise.all([
          storage.getUser(s.userId),
          storage.getCampaignById(s.campaignId),
        ]);
        const { password: _, ...safeCreator } = (creator || {}) as any;
        return { ...s, creator: safeCreator, campaign };
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching all submissions:', error);
      res.status(500).json({ message: 'Failed to fetch submissions' });
    }
  });

  // ── Admin: Approve participation ────────────────────────────────────────────
  app.patch('/api/admin/participations/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const participation = await storage.updateParticipation(req.params.id, { status: 'approved' });
      const campaign = await storage.getCampaignById(participation.campaignId);
      if (campaign) {
        await storage.createNotification({
          userId: participation.userId,
          type: 'campaign_joined',
          title: 'Application Approved!',
          content: `Your application for "${campaign.title}" has been approved. You can now complete the task.`,
          actionUrl: `/campaigns/${campaign.id}`,
        });
      }
      res.json(participation);
    } catch (error) {
      console.error('Error approving participation:', error);
      res.status(500).json({ message: 'Failed to approve participation' });
    }
  });

  // ── Admin: Reject participation ─────────────────────────────────────────────
  app.patch('/api/admin/participations/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const participation = await storage.updateParticipation(req.params.id, { status: 'rejected', adminNotes: req.body.notes || '' });
      const campaign = await storage.getCampaignById(participation.campaignId);
      if (campaign) {
        await storage.createNotification({
          userId: participation.userId,
          type: 'task_rejected',
          title: 'Application Not Selected',
          content: `Your application for "${campaign.title}" was not selected at this time.`,
          actionUrl: `/campaigns/${campaign.id}`,
        });
      }
      res.json(participation);
    } catch (error) {
      console.error('Error rejecting participation:', error);
      res.status(500).json({ message: 'Failed to reject participation' });
    }
  });

  // ── Payment Networks (public — active only) ─────────────────────────────
  app.get('/api/payment-networks', async (req, res) => {
    try {
      const networks = await db
        .select()
        .from(paymentNetworks)
        .orderBy(paymentNetworks.sortOrder);
      res.json(networks);
    } catch (error) {
      console.error('Error fetching payment networks:', error);
      res.status(500).json({ message: 'Failed to fetch payment networks' });
    }
  });

  // ── Admin: Get ALL payment networks ─────────────────────────────────────
  app.get('/api/admin/payment-networks', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const networks = await db
        .select()
        .from(paymentNetworks)
        .orderBy(paymentNetworks.sortOrder);
      res.json(networks);
    } catch (error) {
      console.error('Error fetching admin payment networks:', error);
      res.status(500).json({ message: 'Failed to fetch payment networks' });
    }
  });

  // ── Admin: Toggle/Update payment network ────────────────────────────────
  app.put('/api/admin/payment-networks/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { isActive, walletAddress, name, description } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (walletAddress !== undefined) updates.walletAddress = walletAddress;
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      const [updated] = await db
        .update(paymentNetworks)
        .set(updates)
        .where(eq(paymentNetworks.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error('Error updating payment network:', error);
      res.status(500).json({ message: 'Failed to update payment network' });
    }
  });

  // ── Admin: Update campaign (admin edits any campaign, including demo brand campaigns) ──
  app.put('/api/admin/campaigns/:id', isAuthenticated, upload.single('featuredImage'), async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const id = req.params.id;
      let updates: any = {};
      const body = req.body;
      if (body.title) updates.title = body.title;
      if (body.description) updates.description = body.description;
      if (body.category) updates.category = body.category;
      if (body.reward) updates.reward = body.reward;
      if (body.totalSlots) updates.totalSlots = parseInt(body.totalSlots);
      if (body.deadline) updates.deadline = new Date(body.deadline);
      if (body.requirements) {
        try { updates.requirements = JSON.parse(body.requirements); } catch { updates.requirements = body.requirements; }
      }
      if (body.estimatedTime) updates.estimatedTime = body.estimatedTime;
      if (body.status) updates.status = body.status;
      if (body.isActive !== undefined) updates.isActive = body.isActive === 'true' || body.isActive === true;
      if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured === 'true' || body.isFeatured === true;
      if (req.file) updates.featuredImage = `/uploads/${req.file.filename}`;
      await storage.updateCampaign(id, updates);
      const updated = await storage.getCampaignById(id);
      res.json(updated);
    } catch (error) {
      console.error('Error updating admin campaign:', error);
      res.status(500).json({ message: 'Failed to update campaign' });
    }
  });

  // ── SITE CONTENT CMS ──────────────────────────────────────────────────────
  const SITE_CONTENT_DEFAULTS = [
    // ── Landing Page: Hero ──────────────────────────────────────────────────
    { contentKey: 'landing.hero.badge_text', label: 'Hero Badge Text', contentType: 'text', page: 'landing', section: 'Hero Section', defaultValue: '#1 Web3 Influencer Marketplace', value: '', sortOrder: 1 },
    { contentKey: 'landing.hero.title_line1', label: 'Hero Title — Line 1', contentType: 'text', page: 'landing', section: 'Hero Section', defaultValue: 'Turn Your Influence', value: '', sortOrder: 2 },
    { contentKey: 'landing.hero.title_line2', label: 'Hero Title — Line 2 (Gold)', contentType: 'text', page: 'landing', section: 'Hero Section', defaultValue: 'Into Crypto Income.', value: '', sortOrder: 3 },
    { contentKey: 'landing.hero.subtitle', label: 'Hero Subtitle / Description', contentType: 'textarea', page: 'landing', section: 'Hero Section', defaultValue: "Taskdrip is the #1 Web3 influencer marketplace — join brand campaigns, complete tasks, and get paid in USDT (TRC-20, BEP-20, ERC-20, or TON Network). Grow with BreedSkool Academy, climb the leaderboard, and earn across 4 creator tiers — all in one ecosystem.", value: '', sortOrder: 4 },
    { contentKey: 'landing.hero.cta_creator', label: 'Creator CTA Button Text', contentType: 'text', page: 'landing', section: 'Hero Section', defaultValue: 'Join as Influencer', value: '', sortOrder: 5 },
    { contentKey: 'landing.hero.cta_brand', label: 'Brand CTA Button Text', contentType: 'text', page: 'landing', section: 'Hero Section', defaultValue: 'Hire Influencers', value: '', sortOrder: 6 },
    { contentKey: 'landing.hero.bg_image', label: 'Hero Background Image URL', contentType: 'image', page: 'landing', section: 'Hero Section', defaultValue: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1800&q=85&auto=format&fit=crop', value: '', sortOrder: 7 },
    // ── Landing Page: Stats ─────────────────────────────────────────────────
    { contentKey: 'landing.stats.influencers_value', label: 'Stat: Influencers Count', contentType: 'text', page: 'landing', section: 'Hero Stats', defaultValue: '10K+', value: '', sortOrder: 10 },
    { contentKey: 'landing.stats.influencers_label', label: 'Stat: Influencers Label', contentType: 'text', page: 'landing', section: 'Hero Stats', defaultValue: 'Influencers', value: '', sortOrder: 11 },
    { contentKey: 'landing.stats.campaigns_value', label: 'Stat: Campaigns Count', contentType: 'text', page: 'landing', section: 'Hero Stats', defaultValue: '2.5K+', value: '', sortOrder: 12 },
    { contentKey: 'landing.stats.campaigns_label', label: 'Stat: Campaigns Label', contentType: 'text', page: 'landing', section: 'Hero Stats', defaultValue: 'Campaigns', value: '', sortOrder: 13 },
    { contentKey: 'landing.stats.paid_out_value', label: 'Stat: Total Paid Out', contentType: 'text', page: 'landing', section: 'Hero Stats', defaultValue: '$450K+', value: '', sortOrder: 14 },
    { contentKey: 'landing.stats.paid_out_label', label: 'Stat: Paid Out Label', contentType: 'text', page: 'landing', section: 'Hero Stats', defaultValue: 'Paid Out', value: '', sortOrder: 15 },
    // ── Landing Page: Tiers ─────────────────────────────────────────────────
    { contentKey: 'landing.tiers.section_title', label: 'Tiers Section Title', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: 'Every Creator Has a Tier', value: '', sortOrder: 20 },
    { contentKey: 'landing.tiers.section_subtitle', label: 'Tiers Section Subtitle', contentType: 'textarea', page: 'landing', section: 'Creator Tiers', defaultValue: 'Our smart system auto-classifies creators by total followers across TikTok, YouTube, Instagram, Twitch, and more. Higher tier = bigger campaigns & better rewards.', value: '', sortOrder: 21 },
    { contentKey: 'landing.tiers.tier1_name', label: 'Tier 1 Name', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: 'Rising Sparks', value: '', sortOrder: 22 },
    { contentKey: 'landing.tiers.tier1_range', label: 'Tier 1 Follower Range', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: '1K – 10K followers', value: '', sortOrder: 23 },
    { contentKey: 'landing.tiers.tier1_desc', label: 'Tier 1 Description', contentType: 'textarea', page: 'landing', section: 'Creator Tiers', defaultValue: 'Perfect for emerging creators building their first audience. Access entry-level campaigns and start earning USDT.', value: '', sortOrder: 24 },
    { contentKey: 'landing.tiers.tier2_name', label: 'Tier 2 Name', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: 'Growth Engines', value: '', sortOrder: 25 },
    { contentKey: 'landing.tiers.tier2_range', label: 'Tier 2 Follower Range', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: '10K – 100K followers', value: '', sortOrder: 26 },
    { contentKey: 'landing.tiers.tier2_desc', label: 'Tier 2 Description', contentType: 'textarea', page: 'landing', section: 'Creator Tiers', defaultValue: 'Mid-tier creators with proven engagement. Unlock premium campaigns and higher payout rates.', value: '', sortOrder: 27 },
    { contentKey: 'landing.tiers.tier3_name', label: 'Tier 3 Name', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: 'Power Influencers', value: '', sortOrder: 28 },
    { contentKey: 'landing.tiers.tier3_range', label: 'Tier 3 Follower Range', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: '100K – 1M followers', value: '', sortOrder: 29 },
    { contentKey: 'landing.tiers.tier3_desc', label: 'Tier 3 Description', contentType: 'textarea', page: 'landing', section: 'Creator Tiers', defaultValue: 'Established voices with massive reach. Command exclusive brand deals and featured placement.', value: '', sortOrder: 30 },
    { contentKey: 'landing.tiers.tier4_name', label: 'Tier 4 Name', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: 'Global Titans', value: '', sortOrder: 31 },
    { contentKey: 'landing.tiers.tier4_range', label: 'Tier 4 Follower Range', contentType: 'text', page: 'landing', section: 'Creator Tiers', defaultValue: '1M – 10M+ followers', value: '', sortOrder: 32 },
    { contentKey: 'landing.tiers.tier4_desc', label: 'Tier 4 Description', contentType: 'textarea', page: 'landing', section: 'Creator Tiers', defaultValue: 'Elite global influencers shaping culture. Top-tier campaign access and the highest USDT rewards on Taskdrip.', value: '', sortOrder: 33 },
    // ── Landing Page: How It Works ───────────────────────────────────────────
    { contentKey: 'landing.howitworks.section_title', label: 'How It Works — Section Title', contentType: 'text', page: 'landing', section: 'How It Works', defaultValue: 'How Taskdrip Works', value: '', sortOrder: 40 },
    { contentKey: 'landing.howitworks.creator_step1', label: 'Creator Step 1', contentType: 'text', page: 'landing', section: 'How It Works', defaultValue: 'Sign up & connect your socials', value: '', sortOrder: 41 },
    { contentKey: 'landing.howitworks.creator_step2', label: 'Creator Step 2', contentType: 'text', page: 'landing', section: 'How It Works', defaultValue: 'Browse & apply to campaigns', value: '', sortOrder: 42 },
    { contentKey: 'landing.howitworks.creator_step3', label: 'Creator Step 3', contentType: 'text', page: 'landing', section: 'How It Works', defaultValue: 'Complete tasks & get paid in USDT', value: '', sortOrder: 43 },
    { contentKey: 'landing.howitworks.brand_step1', label: 'Brand Step 1', contentType: 'text', page: 'landing', section: 'How It Works', defaultValue: 'Create a campaign & set your budget', value: '', sortOrder: 44 },
    { contentKey: 'landing.howitworks.brand_step2', label: 'Brand Step 2', contentType: 'text', page: 'landing', section: 'How It Works', defaultValue: 'Creators apply — you choose the best fit', value: '', sortOrder: 45 },
    { contentKey: 'landing.howitworks.brand_step3', label: 'Brand Step 3', contentType: 'text', page: 'landing', section: 'How It Works', defaultValue: 'Review submissions & release payment', value: '', sortOrder: 46 },
    // ── About Page: Hero ────────────────────────────────────────────────────
    { contentKey: 'about.hero.title', label: 'About Hero Title', contentType: 'text', page: 'about', section: 'Hero Section', defaultValue: 'The Future of Influencer Marketing is On-Chain', value: '', sortOrder: 1 },
    { contentKey: 'about.hero.subtitle', label: 'About Hero Subtitle', contentType: 'textarea', page: 'about', section: 'Hero Section', defaultValue: 'Taskdrip connects global brands with verified social media creators through transparent campaigns, tier-based discovery, and direct crypto payments — no third-party agencies, no hidden gatekeepers.', value: '', sortOrder: 2 },
    { contentKey: 'about.hero.bg_image', label: 'About Hero Background Image', contentType: 'image', page: 'about', section: 'Hero Section', defaultValue: '', value: '', sortOrder: 3 },
    // ── About Page: Stats ───────────────────────────────────────────────────
    { contentKey: 'about.stats.creators_value', label: 'Stat: Verified Creators', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: '10K+', value: '', sortOrder: 10 },
    { contentKey: 'about.stats.creators_label', label: 'Stat: Creators Label', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: 'Verified Creators', value: '', sortOrder: 11 },
    { contentKey: 'about.stats.campaigns_value', label: 'Stat: Campaigns Launched', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: '2,500+', value: '', sortOrder: 12 },
    { contentKey: 'about.stats.campaigns_label', label: 'Stat: Campaigns Label', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: 'Campaigns Launched', value: '', sortOrder: 13 },
    { contentKey: 'about.stats.paid_out_value', label: 'Stat: Paid Out in Crypto', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: '$450K+', value: '', sortOrder: 14 },
    { contentKey: 'about.stats.paid_out_label', label: 'Stat: Paid Out Label', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: 'Paid Out in Crypto', value: '', sortOrder: 15 },
    { contentKey: 'about.stats.countries_value', label: 'Stat: Countries', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: '60+', value: '', sortOrder: 16 },
    { contentKey: 'about.stats.countries_label', label: 'Stat: Countries Label', contentType: 'text', page: 'about', section: 'Platform Stats', defaultValue: 'Countries Represented', value: '', sortOrder: 17 },
    // ── About Page: Mission ─────────────────────────────────────────────────
    { contentKey: 'about.mission.title', label: 'Mission Section Title', contentType: 'text', page: 'about', section: 'Mission Statement', defaultValue: 'Turning Influence Into Real Income', value: '', sortOrder: 20 },
    { contentKey: 'about.mission.body', label: 'Mission Body Text', contentType: 'textarea', page: 'about', section: 'Mission Statement', defaultValue: 'We built Taskdrip because creators deserve better. Traditional influencer marketing is opaque, slow, and dominated by agencies that take huge cuts. Taskdrip puts creators and brands in direct contact — with verifiable reach metrics, transparent campaign terms, and instant USDT payouts across 4 networks.', value: '', sortOrder: 21 },
    // ── Tasks Page: Hero ────────────────────────────────────────────────────
    { contentKey: 'tasks.hero.badge_text', label: 'Tasks Hero Badge', contentType: 'text', page: 'tasks', section: 'Hero Section', defaultValue: 'Live Tasks — Earn Crypto Today', value: '', sortOrder: 1 },
    { contentKey: 'tasks.hero.title_line1', label: 'Tasks Title Line 1', contentType: 'text', page: 'tasks', section: 'Hero Section', defaultValue: 'Complete Tasks,', value: '', sortOrder: 2 },
    { contentKey: 'tasks.hero.title_line2', label: 'Tasks Title Line 2 (Gold)', contentType: 'text', page: 'tasks', section: 'Hero Section', defaultValue: 'Earn Crypto', value: '', sortOrder: 3 },
    { contentKey: 'tasks.hero.subtitle', label: 'Tasks Hero Subtitle', contentType: 'textarea', page: 'tasks', section: 'Hero Section', defaultValue: 'Join the #1 Web3 influencer marketplace. Browse live brand campaigns, complete tasks, and get paid in USDT across TRC-20, BEP-20, ERC-20, or TON Network — instantly.', value: '', sortOrder: 4 },
    // ── Global Settings ─────────────────────────────────────────────────────
    { contentKey: 'global.site.platform_name', label: 'Platform Name', contentType: 'text', page: 'global', section: 'Site Identity', defaultValue: 'Taskdrip', value: '', sortOrder: 1 },
    { contentKey: 'global.site.tagline', label: 'Tagline (Under Logo)', contentType: 'text', page: 'global', section: 'Site Identity', defaultValue: 'Influencers Marketplace', value: '', sortOrder: 2 },
    { contentKey: 'global.site.contact_email', label: 'Support Email Address', contentType: 'text', page: 'global', section: 'Site Identity', defaultValue: 'support@taskdrip.online', value: '', sortOrder: 3 },
    { contentKey: 'global.site.footer_copyright', label: 'Footer Copyright Text', contentType: 'text', page: 'global', section: 'Site Identity', defaultValue: '© 2026 Taskdrip. All rights reserved.', value: '', sortOrder: 4 },
    { contentKey: 'global.site.footer_description', label: 'Footer Description Text', contentType: 'textarea', page: 'global', section: 'Site Identity', defaultValue: 'The #1 Web3 influencer marketplace — connecting verified creators with global brands. Earn USDT crypto for every completed campaign task.', value: '', sortOrder: 5 },
    { contentKey: 'global.site.logo_url', label: 'Site Logo Image URL (optional)', contentType: 'image', page: 'global', section: 'Site Identity', defaultValue: '', value: '', sortOrder: 6 },
    { contentKey: 'global.seo.meta_description', label: 'SEO Meta Description', contentType: 'textarea', page: 'global', section: 'SEO & Meta', defaultValue: 'Taskdrip is the #1 Web3 influencer marketplace. Complete brand campaigns and earn USDT crypto (TRC-20, BEP-20, ERC-20, TON Network). Join 10K+ creators today.', value: '', sortOrder: 10 },
    { contentKey: 'global.seo.og_title', label: 'Open Graph Title (Social Share)', contentType: 'text', page: 'global', section: 'SEO & Meta', defaultValue: 'Taskdrip — Turn Your Influence Into Crypto Income', value: '', sortOrder: 11 },
    { contentKey: 'global.seo.og_image', label: 'Open Graph Image URL (Social Share)', contentType: 'image', page: 'global', section: 'SEO & Meta', defaultValue: '', value: '', sortOrder: 12 },
  ];

  // Init site content defaults on startup
  await storage.initSiteContent(SITE_CONTENT_DEFAULTS as any);

  // Public: get all site content
  app.get('/api/site-content', async (req, res) => {
    try {
      const content = await storage.getSiteContent();
      res.json(content);
    } catch (error) {
      console.error('Error fetching site content:', error);
      res.status(500).json({ message: 'Failed to fetch site content' });
    }
  });

  // Admin: update a single content field by key
  app.put('/api/admin/site-content/:key', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const key = decodeURIComponent(req.params.key);
      const { value } = req.body;
      if (value === undefined) return res.status(400).json({ message: 'value is required' });
      const updated = await storage.updateSiteContent(key, value);
      res.json(updated);
    } catch (error) {
      console.error('Error updating site content:', error);
      res.status(500).json({ message: 'Failed to update content' });
    }
  });

  // Admin: bulk update multiple content fields
  app.put('/api/admin/site-content', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const updates: Array<{ key: string; value: string }> = req.body;
      if (!Array.isArray(updates)) return res.status(400).json({ message: 'Expected array of {key, value}' });
      const results = [];
      for (const { key, value } of updates) {
        const updated = await storage.updateSiteContent(key, value);
        results.push(updated);
      }
      res.json(results);
    } catch (error) {
      console.error('Error bulk updating site content:', error);
      res.status(500).json({ message: 'Failed to update content' });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Payment Feature Toggles
  // ──────────────────────────────────────────────────────────────
  app.get('/api/admin/payment-feature-toggles', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const toggles = await storage.getPaymentFeatureToggles();
      res.json(toggles);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch toggles' });
    }
  });

  app.post('/api/admin/payment-feature-toggles', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { paymentMethodId, feature, isEnabled } = req.body;
      const toggle = await storage.upsertPaymentFeatureToggle(paymentMethodId, feature, isEnabled);
      res.json(toggle);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update toggle' });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Sponsored Ads
  // ──────────────────────────────────────────────────────────────
  app.get('/api/ads/active', async (req, res) => {
    try {
      const placement = req.query.placement as string | undefined;
      const ads = await storage.getActiveSponsoredAds(placement);
      res.json(ads);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch ads' });
    }
  });

  app.post('/api/ads/:id/impression', async (req, res) => {
    try {
      await storage.incrementAdImpressions(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to record impression' });
    }
  });

  app.post('/api/ads/:id/click', async (req, res) => {
    try {
      await storage.incrementAdClicks(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to record click' });
    }
  });

  app.get('/api/admin/ads', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ads = await storage.getAllSponsoredAds();
      res.json(ads);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch ads' });
    }
  });

  app.post('/api/admin/ads', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ad = await storage.createSponsoredAd(req.body);
      res.json(ad);
    } catch (e) {
      res.status(500).json({ message: 'Failed to create ad' });
    }
  });

  app.patch('/api/admin/ads/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ad = await storage.updateSponsoredAd(req.params.id, req.body);
      res.json(ad);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update ad' });
    }
  });

  app.delete('/api/admin/ads/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteSponsoredAd(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to delete ad' });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Advertise Applications
  // ──────────────────────────────────────────────────────────────
  app.post('/api/advertise-applications', async (req, res) => {
    try {
      const app2 = await storage.createAdvertiseApplication(req.body);
      res.json(app2);
    } catch (e) {
      res.status(500).json({ message: 'Failed to submit application' });
    }
  });

  app.get('/api/admin/advertise-applications', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const apps = await storage.getAllAdvertiseApplications();
      res.json(apps);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  app.patch('/api/admin/advertise-applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const app2 = await storage.updateAdvertiseApplication(req.params.id, req.body);
      res.json(app2);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update application' });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Email Marketing CRM
  // ──────────────────────────────────────────────────────────────
  const { sendEmail, testSmtpConnection, blastCampaign, AI_TEMPLATES, buildDefaultEmailHtml } = await import("./email-service");

  // Email Settings
  app.get('/api/admin/email/settings', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const settings = await storage.getEmailSettings();
      // Mask password in response
      if (settings?.smtpPass) settings.smtpPass = '••••••••';
      if (settings?.imapPass) settings.imapPass = '••••••••';
      res.json(settings || {});
    } catch (e) { res.status(500).json({ message: 'Failed to fetch email settings' }); }
  });

  app.post('/api/admin/email/settings', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const data: any = { ...req.body };
      // Don't overwrite passwords if masked
      const existing = await storage.getEmailSettings();
      if (data.smtpPass === '••••••••' && existing?.smtpPass) data.smtpPass = existing.smtpPass;
      if (data.imapPass === '••••••••' && existing?.imapPass) data.imapPass = existing.imapPass;
      const settings = await storage.upsertEmailSettings(data);
      res.json(settings);
    } catch (e) { res.status(500).json({ message: 'Failed to save email settings' }); }
  });

  app.post('/api/admin/email/test-smtp', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const data: any = { ...req.body };
      if (data.smtpPass === '••••••••') {
        const existing = await storage.getEmailSettings();
        if (existing?.smtpPass) data.smtpPass = existing.smtpPass;
      }
      const result = await testSmtpConnection(data);
      if (result.success) {
        await storage.upsertEmailSettings({ lastTestedAt: new Date(), isVerified: true });
      }
      res.json(result);
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  app.post('/api/admin/email/send-test', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { to, subject, html } = req.body;
      const result = await sendEmail({ to, subject, html: html || '<p>Test email from Taskdrip Email CRM.</p>' });
      res.json(result);
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // Email Templates
  app.get('/api/admin/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const templates = await storage.getAllEmailTemplates();
      res.json(templates);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch templates' }); }
  });

  app.get('/api/admin/email/ai-templates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      res.json(AI_TEMPLATES);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch AI templates' }); }
  });

  app.post('/api/admin/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const t = await storage.createEmailTemplate(req.body);
      res.json(t);
    } catch (e) { res.status(500).json({ message: 'Failed to create template' }); }
  });

  app.patch('/api/admin/email/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const t = await storage.updateEmailTemplate(req.params.id, req.body);
      res.json(t);
    } catch (e) { res.status(500).json({ message: 'Failed to update template' }); }
  });

  app.delete('/api/admin/email/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteEmailTemplate(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: 'Failed to delete template' }); }
  });

  // Email Campaigns
  app.get('/api/admin/email/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const campaigns = await storage.getAllEmailCampaigns();
      res.json(campaigns);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch campaigns' }); }
  });

  app.post('/api/admin/email/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const c = await storage.createEmailCampaign({ ...req.body, createdBy: req.user.id });
      res.json(c);
    } catch (e) { res.status(500).json({ message: 'Failed to create campaign' }); }
  });

  app.patch('/api/admin/email/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const c = await storage.updateEmailCampaign(req.params.id, req.body);
      res.json(c);
    } catch (e) { res.status(500).json({ message: 'Failed to update campaign' }); }
  });

  app.delete('/api/admin/email/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteEmailCampaign(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: 'Failed to delete campaign' }); }
  });

  app.post('/api/admin/email/campaigns/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      // Run blast in background, return immediately
      res.json({ success: true, message: 'Campaign blast started' });
      blastCampaign(req.params.id).catch(console.error);
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  app.get('/api/admin/email/campaigns/:id/logs', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const logs = await storage.getEmailLogsByCampaign(req.params.id);
      res.json(logs);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch logs' }); }
  });

  // Auto-Responders
  app.get('/api/admin/email/auto-responders', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ar = await storage.getAllEmailAutoResponders();
      res.json(ar);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch auto-responders' }); }
  });

  app.post('/api/admin/email/auto-responders', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ar = await storage.createEmailAutoResponder(req.body);
      res.json(ar);
    } catch (e) { res.status(500).json({ message: 'Failed to create auto-responder' }); }
  });

  app.patch('/api/admin/email/auto-responders/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ar = await storage.updateEmailAutoResponder(req.params.id, req.body);
      res.json(ar);
    } catch (e) { res.status(500).json({ message: 'Failed to update auto-responder' }); }
  });

  app.delete('/api/admin/email/auto-responders/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteEmailAutoResponder(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ message: 'Failed to delete auto-responder' }); }
  });

  // Email Logs
  app.get('/api/admin/email/logs', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const logs = await storage.getEmailLogs(200);
      res.json(logs);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch logs' }); }
  });

  // Contacts (from users table)
  app.get('/api/admin/email/contacts', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const allUsers = await storage.getAllUsers?.() || [];
      const contacts = allUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        userType: u.userType,
        creatorTier: u.creatorTier,
        isVerified: u.isVerified,
        totalFollowers: u.totalFollowers,
      }));
      res.json(contacts);
    } catch (e) { res.status(500).json({ message: 'Failed to fetch contacts' }); }
  });

  // ── $TDRIP Points System ─────────────────────────────────────
  app.get('/api/points/me', isAuthenticated, async (req: any, res) => {
    try {
      const points = await storage.getUserPoints(req.user.id);
      const total = await storage.getUserTotalPoints(req.user.id);
      const user = await storage.getUser(req.user.id);
      res.json({ points, total, level: user?.level ?? 'Starter' });
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch points' });
    }
  });

  app.get('/api/leaderboard/points', async (_req, res) => {
    try {
      const leaders = await storage.getLeaderboardByPoints(10);
      res.json(leaders);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch points leaderboard' });
    }
  });

  // Admin: manually award points to a user
  app.post('/api/admin/points/award', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { userId, actionType, points, description } = req.body;
      if (!userId || !points) return res.status(400).json({ message: 'userId and points required' });
      const record = await storage.awardPoints(userId, actionType ?? 'admin_award', Number(points), description);
      res.json(record);
    } catch (e) {
      res.status(500).json({ message: 'Failed to award points' });
    }
  });

  // ── Welcome Campaign ─────────────────────────────────────────
  app.get('/api/welcome-campaign', isAuthenticated, async (req: any, res) => {
    try {
      const completions = await storage.getWelcomeTaskCompletions(req.user.id);
      const completedKeys = completions.map((c: any) => c.taskKey);
      const tasks = [
        { key: 'telegram', label: 'Join Telegram Community', points: 20, url: 'https://t.me/taskdrip', icon: 'telegram' },
        { key: 'twitter', label: 'Follow on X (Twitter)', points: 15, url: 'https://x.com/taskdrip', icon: 'twitter' },
        { key: 'instagram', label: 'Follow on Instagram', points: 15, url: 'https://www.instagram.com/taskdrip', icon: 'instagram' },
        { key: 'youtube', label: 'Subscribe on YouTube', points: 20, url: 'https://youtube.com/@taskdriper', icon: 'youtube' },
        { key: 'whatsapp', label: 'Join WhatsApp Group', points: 10, url: 'https://wa.me/12016800266', icon: 'whatsapp' },
        { key: 'profile', label: 'Complete Your Profile', points: 50, url: '/profile-edit', icon: 'profile' },
      ];
      const enriched = tasks.map(t => ({ ...t, completed: completedKeys.includes(t.key) }));
      const totalPossible = tasks.reduce((s, t) => s + t.points, 0);
      const earned = enriched.filter(t => t.completed).reduce((s, t) => s + t.points, 0);
      res.json({ tasks: enriched, totalPossible, earned, percent: Math.round((earned / totalPossible) * 100) });
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch welcome campaign' });
    }
  });

  app.post('/api/welcome-campaign/complete/:taskKey', isAuthenticated, async (req: any, res) => {
    try {
      const validKeys = ['telegram', 'twitter', 'instagram', 'youtube', 'whatsapp', 'profile'];
      if (!validKeys.includes(req.params.taskKey)) return res.status(400).json({ message: 'Invalid task key' });
      const result = await storage.completeWelcomeTask(req.user.id, req.params.taskKey);
      if (!result) return res.json({ message: 'Already completed', alreadyDone: true });
      res.json({ success: true, taskKey: req.params.taskKey });
    } catch (e) {
      res.status(500).json({ message: 'Failed to complete task' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
