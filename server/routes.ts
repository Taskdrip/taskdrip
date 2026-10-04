import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { registerShortenerRoutes } from "./url-shortener";
import { registerKeywordAnalyticsRoutes } from "./keyword-analytics";
import { registerAutoBloggerRoutes, startAutoBloggerAutopilot } from "./auto-blogger";
import { registerAdminDemoRoutes } from "./admin-demo-routes";
import { registerSeoIntelligenceRoutes } from "./seo-intelligence-routes";
import { sendOrderConfirmationEmail, sendAdminActivityEmail, sendAdsApplicationEmail, sendNewsletterWelcomeEmail, activateResendIfAvailable, TASKDRIP_EMAILS } from "./email-service";
import { activityAuditMiddleware, recordActivity } from "./activity-service";
import { scanRequestBody, scanUrl, scanText as scanTextContent } from "./content-scanner";
import { insertCampaignParticipationSchema, insertTransactionSchema, insertPurchaseSchema, messages, referrals, taskSubmissions, paymentNetworks, transactions, users, userReviews, campaignParticipations, campaigns, campaignMicroTasks, microTaskSubmissions, p2pListings, p2pTransactions, p2pMessages, p2pFeeConfigs, platformFees, p2pActionLogs, shopProducts, socialQuickTasks, userSocialTaskCompletions, adAnalytics, advertiseApplications, paymentDeposits, subscriptions, posts, p2pTaskAddonSubmissions, siteContent, pageSeoSettings, footerColumns, legalPages, newsletterSubscribers, courseEnrollments, courses, purchases, productReviews, escrowPayments, contentReports, pageViews, leads, leadMessages, blockedUsers, breedskoolCoursePricing, breedskoolRegistrations, appSettings, courseAssignments, courseCommunityPosts, courseCommunityLikes, referralClicks, referralCommissions, payoutRequests, directHireOffers, activityLogs } from "@shared/schema";
import { searchBusinessesGoogle, searchInfluencersYouTube, persistLeads, generateAiReport, sendSmsTwilio, bulkSms, providerStatus } from "./lead-service";
import { db } from "./db";
import { desc, sql, eq, and, count, gte, inArray, ilike, or } from "drizzle-orm";

// ── Subscription tier helper ──────────────────────────────────────────────────
function getSubscriptionTier(user: any): 'free' | 'monthly' | 'yearly' {
  if (!user || user.subscriptionStatus !== 'active') return 'free';
  const plan = (user.subscriptionPlan || '').toLowerCase();
  if (plan.includes('yearly')) return 'yearly';
  return 'monthly'; // 3day, 5day, monthly all get monthly tier
}

// Post limits per subscription tier
const POST_LIMITS: Record<string, number> = { free: 3, monthly: 12, yearly: Infinity };
// Campaign limits per subscription tier for brands
const CAMPAIGN_LIMITS: Record<string, number> = { free: 3, monthly: Infinity, yearly: Infinity };
import { z } from "zod";
import multer from "multer";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import path from "path";
import express from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import {
  DEFAULT_PORTFOLIO_PROFILE,
  DEFAULT_PORTFOLIO_PROJECTS,
  PORTFOLIO_CONTENT_KEYS,
} from "./portfolio-content";
function makeTtlCache<T>(fn: () => Promise<T>, maxAge: number) {
  let cached: T | null = null;
  let expiry = 0;
  return async () => {
    const now = Date.now();
    if (cached !== null && now < expiry) return cached;
    cached = await fn();
    expiry = now + maxAge;
    return cached;
  };
}

// Preserve original file extensions so static file middleware can serve them
// with the correct Content-Type and so the extension allowlist in server/index.ts
// doesn't block them. Also enforce a 25MB per-file limit and block dangerous types.
const DANGEROUS_EXTS = new Set(['.exe', '.bat', '.cmd', '.sh', '.ps1', '.scr', '.vbs', '.jar', '.msi', '.com', '.dll', '.app']);
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => {
      const raw = path.extname(file.originalname || '').toLowerCase();
      const ext = /^\.[a-z0-9]{1,6}$/.test(raw) ? raw : '';
      if (DANGEROUS_EXTS.has(ext)) return cb(new Error('File type not allowed'), '');
      cb(null, `${nanoid()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const raw = path.extname(file.originalname || '').toLowerCase();
    if (DANGEROUS_EXTS.has(raw)) return cb(new Error('File type not allowed') as any, false);
    cb(null, true);
  },
});

const TDRIP_POINTS_PER_USD = 100;

function parseTdripAddon(body: any) {
  const points = Math.max(0, Number(body.tdripPointsPerParticipant || 0));
  const participantLimit = Math.max(0, Number(body.tdripParticipantLimit || 0));
  const escrowValue = points && participantLimit ? (points * participantLimit) / TDRIP_POINTS_PER_USD : 0;
  return {
    tdripPointsPerParticipant: Math.floor(points),
    tdripParticipantLimit: Math.floor(participantLimit),
    tdripEscrowValue: escrowValue.toFixed(2),
  };
}

function parseJsonArrayField(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function canManageCampaign(userId: string, campaignId: string) {
  const campaign = await storage.getCampaignById(campaignId);
  if (!campaign) return { ok: false, campaign: null as any, message: "Campaign not found" };
  const user = await storage.getUser(userId);
  const ok = campaign.brandId === userId || user?.role === "admin" || user?.userType === "admin";
  return { ok, campaign, message: ok ? "" : "You can only manage add-on tasks for your own campaigns" };
}

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

const p2pTypes = ['crypto', 'product', 'service'];

function isAdminUser(user: any) {
  return user?.userType === 'admin' || user?.role === 'admin';
}

function hasAdminRole(user: any, roles: string[]) {
  return isAdminUser(user) || roles.includes(user?.role);
}

function canManageContent(user: any) {
  return hasAdminRole(user, ['content_editor']);
}

function canModerate(user: any) {
  return hasAdminRole(user, ['moderator']);
}

function canManageStore(user: any) {
  return hasAdminRole(user, ['store_manager']);
}

function canManageP2P(user: any) {
  return hasAdminRole(user, ['store_manager', 'moderator']);
}

async function logP2PAction(actorId: string, action: string, data: { transactionId?: string; listingId?: string; details?: string }) {
  await db.insert(p2pActionLogs).values({
    actorId,
    action,
    transactionId: data.transactionId,
    listingId: data.listingId,
    details: data.details || '',
  });
}

async function getP2PFeeConfig(type: string) {
  const safeType = p2pTypes.includes(type) ? type : 'service';
  const [existing] = await db.select().from(p2pFeeConfigs).where(eq(p2pFeeConfigs.transactionType, safeType));
  if (existing) return existing;
  const [created] = await db.insert(p2pFeeConfigs).values({
    transactionType: safeType,
    feeType: 'percentage',
    feeValue: '2.00',
    minFee: '0.00',
    maxFee: null,
    buyerFeeType: 'percentage',
    buyerFeeValue: '2.00',
    buyerMinFee: '0.00',
    buyerMaxFee: null,
    sellerFeeType: 'percentage',
    sellerFeeValue: '0.00',
    sellerMinFee: '0.00',
    sellerMaxFee: null,
  }).returning();
  return created;
}

function calcFeeForParty(amount: number, feeType: string, feeValue: string | null, minFee: string | null, maxFee: string | null) {
  const raw = feeType === 'fixed' ? Number(feeValue || 0) : amount * (Number(feeValue || 0) / 100);
  const min = Number(minFee || 0);
  const max = maxFee === null || maxFee === undefined ? null : Number(maxFee);
  let fee = Math.max(raw, min);
  if (max !== null && fee > max) fee = max;
  return Number(fee.toFixed(2));
}

function calculateP2PFee(amount: number, config: any) {
  // Use buyer fee if defined, otherwise fall back to combined fee
  const useBuyerSeller = Number(config.buyerFeeValue || 0) > 0 || Number(config.sellerFeeValue || 0) > 0;
  if (useBuyerSeller) {
    return calcFeeForParty(amount, config.buyerFeeType || 'percentage', config.buyerFeeValue, config.buyerMinFee, config.buyerMaxFee);
  }
  let fee = config.feeType === 'fixed' ? Number(config.feeValue || 0) : amount * (Number(config.feeValue || 0) / 100);
  const minFee = Number(config.minFee || 0);
  const maxFee = config.maxFee === null || config.maxFee === undefined ? null : Number(config.maxFee);
  if (fee < minFee) fee = minFee;
  if (maxFee !== null && fee > maxFee) fee = maxFee;
  return Number(fee.toFixed(2));
}

function calculateSellerFee(amount: number, config: any) {
  return calcFeeForParty(amount, config.sellerFeeType || 'percentage', config.sellerFeeValue, config.sellerMinFee, config.sellerMaxFee);
}

async function enrichP2PListing(listing: any) {
  const seller = await storage.getUser(listing.sellerId);
  return {
    ...listing,
    seller: seller ? {
      id: seller.id,
      username: seller.username,
      firstName: seller.firstName,
      lastName: seller.lastName,
      profileImageUrl: seller.profileImageUrl,
      rating: seller.rating,
      userType: seller.userType,
      country: (seller as any).country,
      preferredCurrency: (seller as any).preferredCurrency,
      completedCampaigns: seller.completedCampaigns,
    } : null,
  };
}

async function enrichP2PTransaction(tx: any) {
  const [listing, buyer, seller, admin] = await Promise.all([
    db.select().from(p2pListings).where(eq(p2pListings.id, tx.listingId)).then(rows => rows[0]),
    storage.getUser(tx.buyerId),
    storage.getUser(tx.sellerId),
    tx.adminId ? storage.getUser(tx.adminId) : Promise.resolve(null),
  ]);
  return {
    ...tx,
    listing,
    buyer: buyer ? { id: buyer.id, firstName: buyer.firstName, lastName: buyer.lastName, username: buyer.username, profileImageUrl: buyer.profileImageUrl } : null,
    seller: seller ? { id: seller.id, firstName: seller.firstName, lastName: seller.lastName, username: seller.username, profileImageUrl: seller.profileImageUrl } : null,
    admin: admin ? { id: admin.id, firstName: admin.firstName, lastName: admin.lastName, username: admin.username } : null,
  };
}

// ── Subscription Expiry Auto-Checker ──────────────────────────────────────
export async function runSubscriptionExpiryCheck() {
  let expired = 0;
  let reminded = 0;
  try {
    // 1. Mark expired subscriptions
    const expiredSubs = await storage.getExpiredSubscriptions();
    for (const sub of expiredSubs) {
      await storage.updateSubscriptionStatus(sub.id, 'expired');
      const subUser = await storage.getUser(sub.userId);
      if (subUser?.userType === 'admin') { expired++; continue; }
      await storage.updateUserProfile(sub.userId, {
        subscriptionStatus: 'expired',
        isVerified: false,
      });
      const planLabel = (sub.plan || '').includes('brand') ? 'Brand Pro' : 'Premium';
      const userType = (sub.plan || '').includes('brand') ? 'brand' : 'creator';
      await storage.createNotification({
        userId: sub.userId,
        type: 'subscription_expired',
        title: `Your ${planLabel} subscription has expired`,
        content: `Your ${planLabel} subscription ended on ${new Date(sub.endDate!).toLocaleDateString()}. Renew now to restore access to all premium features.`,
        priority: 'urgent',
        actionUrl: '/subscription',
      });
      expired++;
    }

    // 2. Send 1-day expiry reminders
    const expiringSubs = await storage.getExpiringSubscriptions(1);
    for (const sub of expiringSubs) {
      const subUser = await storage.getUser(sub.userId);
      if (subUser?.userType === 'admin') { reminded++; continue; }
      const planLabel = (sub.plan || '').includes('brand') ? 'Brand Pro' : 'Premium';
      await storage.createNotification({
        userId: sub.userId,
        type: 'subscription_expiry_reminder',
        title: `⚠️ Your ${planLabel} subscription expires tomorrow`,
        content: `Your ${planLabel} subscription expires on ${new Date(sub.endDate!).toLocaleDateString()} at ${new Date(sub.endDate!).toLocaleTimeString()}. Renew now to keep all your premium features uninterrupted.`,
        priority: 'high',
        actionUrl: '/subscription',
      });
      await storage.markExpiryReminderSent(sub.id);
      reminded++;
    }
  } catch (err) {
    console.error('[Expiry Checker] Error:', err);
  }
  return { expired, reminded };
}

export async function registerRoutes(app: Express, existingServer?: Server): Promise<Server> {
  app.use(activityAuditMiddleware);
  setupAuth(app);

  const SCAN_SKIP_PATHS = ['/api/health', '/api/login', '/api/register', '/api/uploads', '/api/breedskool'];
  const SCAN_SKIP_FIELDS = ['password', 'confirmPassword', 'transactionHash', 'transactionRef', 'paymentProof', 'proofNote'];

  app.use((req: any, res: any, next: any) => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
    if (SCAN_SKIP_PATHS.some(p => req.path.startsWith(p))) return next();
    if (!req.body || typeof req.body !== 'object') return next();

    const bodyToScan: Record<string, any> = {};
    for (const [key, val] of Object.entries(req.body)) {
      if (!SCAN_SKIP_FIELDS.includes(key)) bodyToScan[key] = val;
    }

    const result = scanRequestBody(bodyToScan);
    if (!result.isSafe) {
      return res.status(400).json({
        message: `Security violation: ${result.threats.join('; ')}. Adding malicious content may result in your account being permanently banned.`,
        threats: result.threats,
        securityViolation: true,
      });
    }
    next();
  });

  app.post("/api/portfolio/olajumoke-owoeye/contact", async (req, res) => {
    const inquirySchema = z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(254),
      service: z.enum([
        "Content creation",
        "Social media management",
        "Marketing strategy",
        "Website & web content",
        "Other",
      ]),
      budget: z.string().trim().min(2).max(80),
      projectBrief: z.string().trim().min(20).max(2500),
      website: z.string().max(0).optional(),
    });

    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Please check the form and complete all required fields." });
    }

    // Quietly accept automated submissions caught by the hidden honeypot.
    if (parsed.data.website) return res.json({ ok: true });

    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!);
    const name = escapeHtml(parsed.data.name);
    const email = escapeHtml(parsed.data.email);
    const service = escapeHtml(parsed.data.service);
    const budget = escapeHtml(parsed.data.budget);
    const projectBrief = escapeHtml(parsed.data.projectBrief).replace(/\r?\n/g, "<br />");

    try {
      const subject = `New ${parsed.data.service.toLowerCase()} enquiry from ${parsed.data.name}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#20251c">
          <h2 style="color:#33451f">New portfolio enquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Requested service:</strong> ${service}</p>
          <p><strong>Budget:</strong> ${budget}</p>
          <p><strong>Project brief:</strong><br />${projectBrief}</p>
          <p><strong>Portfolio:</strong> <a href="https://taskdrip.online/olajumoke-owoeye">taskdrip.online/olajumoke-owoeye</a></p>
          <p style="color:#68715d;font-size:13px">Reply directly to this message to contact the enquirer.</p>
        </div>
      `;
      const text = [
        "New portfolio enquiry",
        `Name: ${parsed.data.name}`,
        `Email: ${parsed.data.email}`,
        `Requested service: ${parsed.data.service}`,
        `Budget: ${parsed.data.budget}`,
        `Project brief: ${parsed.data.projectBrief}`,
        "Portfolio: https://taskdrip.online/olajumoke-owoeye",
      ].join("\n");
      const connectors = new ReplitConnectors();
      const send = (sender: string) => connectors.proxy("resend", "/emails", {
        method: "POST",
        body: {
          from: `Olajumoke Owoeye | Portfolio <${sender}>`,
          to: ["owoeyeolajumokeoluwatosin@gmail.com", TASKDRIP_EMAILS.info],
          reply_to: parsed.data.email,
          subject,
          html,
          text,
        },
      });

      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      let response = await send(fromEmail);
      let responseError = response.ok ? "" : await response.text().catch(() => "");
      if (!response.ok && fromEmail !== "onboarding@resend.dev" &&
          /domain|sender|from address|verified|invalid/i.test(responseError)) {
        response = await send("onboarding@resend.dev");
        responseError = response.ok ? "" : await response.text().catch(() => "");
      }
      if (!response.ok) {
        console.error("[portfolio contact] Resend delivery failed:", response.status, responseError);
        return res.status(503).json({
          message: "Your enquiry could not be emailed just now. Your details are still here—please try again or send them on WhatsApp.",
        });
      }
      return res.json({ ok: true });
    } catch (error: any) {
      console.error("[portfolio contact] Could not send enquiry:", error?.message || error);
      return res.status(503).json({
        message: "Your enquiry could not be emailed just now. Your details are still here—please try again or send them on WhatsApp.",
      });
    }
  });

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

  // Creators grouped by tier - sorted highest to lowest within each tier.
  // Tier is ALWAYS recomputed from the sum of social-media followers, never trusted from the stored field.
  // Memoized for 60s since this is an O(N) computation over all creators and is polled by landing + influencers pages.
  const buildCreatorsByTier = makeTtlCache(async () => {
    const creators = await storage.getCreators();
    const tierOrder = ['global_titans', 'power_influencers', 'growth_engines', 'rising_sparks', 'aspiring', 'newcomer'];
    const grouped: Record<string, any[]> = {
      global_titans: [], power_influencers: [], growth_engines: [],
      rising_sparks: [], aspiring: [], newcomer: [],
    };
    const platformKeys = [
      'tiktokFollowers', 'youtubeFollowers', 'instagramFollowers',
      'twitterFollowers', 'twitchFollowers', 'telegramFollowers', 'whatsappFollowers',
    ];
    const computeTier = (n: number) => {
      if (n >= 10_000_000) return 'global_titans';
      if (n >= 1_000_000) return 'power_influencers';
      if (n >= 100_000) return 'growth_engines';
      if (n >= 10_000) return 'rising_sparks';
      if (n >= 1) return 'aspiring';
      return 'newcomer';
    };
    for (const creator of creators) {
      const { password, ...safe } = creator as any;
      const reach = platformKeys.reduce((s, k) => s + (Number(safe[k]) || 0), 0);
      safe.totalFollowers = reach;
      safe.creatorTier = computeTier(reach);
      grouped[safe.creatorTier].push(safe);
    }
    for (const tier of tierOrder) {
      grouped[tier].sort((a: any, b: any) => (b.totalFollowers || 0) - (a.totalFollowers || 0));
    }
    return grouped;
  }, 60_000);

  app.get('/api/creators/by-tier', async (_req, res) => {
    try {
      const grouped = await buildCreatorsByTier();
      res.json(grouped);
    } catch (error) {
      console.error("Error fetching creators by tier:", error);
      res.status(500).json({ message: "Failed to fetch creators by tier" });
    }
  });

  // ── Typing indicator (in-memory, short-lived) ────────────────────────────
  // Lets the messages/chat pages show "… is typing" in near-real time via polling
  // without pulling in a websocket dependency. Entries auto-expire after 4s.
  const typingMap = new Map<string, number>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, ts] of typingMap) if (now - ts > 8000) typingMap.delete(k);
  }, 10_000).unref?.();

  app.post('/api/typing', isAuthenticated, (req: any, res) => {
    const receiverId = req.body?.receiverId;
    if (!receiverId) return res.status(400).json({ message: 'receiverId required' });
    typingMap.set(`${req.user.id}:${receiverId}`, Date.now());
    res.json({ ok: true });
  });
  app.get('/api/typing/:senderId', isAuthenticated, (req: any, res) => {
    const ts = typingMap.get(`${req.params.senderId}:${req.user.id}`) || 0;
    res.json({ typing: Date.now() - ts < 4000 });
  });

  // ── Online presence (in-memory, heartbeat-based) ─────────────────────────
  // Clients ping /api/online/ping every 30s; /api/online/:userId returns whether
  // that user was active in the last 90 seconds.
  const onlineMap = new Map<string, number>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, ts] of onlineMap) if (now - ts > 120_000) onlineMap.delete(k);
  }, 30_000).unref?.();

  app.post('/api/online/ping', isAuthenticated, (req: any, res) => {
    onlineMap.set(req.user.id, Date.now());
    res.json({ ok: true });
  });
  app.get('/api/online/:userId', isAuthenticated, (req: any, res) => {
    const ts = onlineMap.get(req.params.userId) || 0;
    const online = Date.now() - ts < 90_000;
    res.json({ online, lastSeen: ts ? new Date(ts).toISOString() : null });
  });

  // Brands discovery — grouped by brand tier
  app.get('/api/brands/by-tier', async (req, res) => {
    try {
      const allUsers = await storage.getUsersByType('brand');
      const tierOrder = ['global_brand', 'enterprise', 'established', 'growing', 'startup'];
      const grouped: Record<string, any[]> = {
        global_brand: [], enterprise: [], established: [], growing: [], startup: [],
      };
      const computeTier = (completed: number) => {
        if (completed >= 201) return 'global_brand';
        if (completed >= 51) return 'enterprise';
        if (completed >= 21) return 'established';
        if (completed >= 6) return 'growing';
        return 'startup';
      };
      for (const brand of allUsers) {
        const { password, ...safe } = brand as any;
        const completed = safe.completedCampaigns || 0;
        safe.brandTierComputed = computeTier(completed);
        grouped[safe.brandTierComputed].push(safe);
      }
      for (const tier of tierOrder) {
        grouped[tier].sort((a: any, b: any) => (b.completedCampaigns || 0) - (a.completedCampaigns || 0));
      }
      res.json(grouped);
    } catch (error) {
      console.error('Error fetching brands by tier:', error);
      res.status(500).json({ message: 'Failed to fetch brands' });
    }
  });

  // Update user location (latitude/longitude/city/state)
  app.post('/api/user/location', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const { latitude, longitude, city, state, country } = req.body;
      await storage.updateUser((req.user as any).id, {
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
      } as any);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  // Update user profile SEO settings
  app.patch('/api/user/seo', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const { seoTitle, seoDescription, seoKeywords, seoOgImage } = req.body;
      await storage.updateUser((req.user as any).id, {
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null,
        seoOgImage: seoOgImage || null,
      } as any);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update SEO settings' });
    }
  });

  // ── Become Creator (student upgrade path) ─────────────────────────────────
  app.patch('/api/user/become-creator', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const u = await storage.getUser(userId);
      if (!u) return res.status(404).json({ message: 'User not found' });
      if (u.userType === 'creator' || u.userType === 'admin') {
        return res.json({ message: 'Already a creator', user: u });
      }
      // Server-side eligibility: must have at least one enrollment with >= 50% progress
      // Fail closed: any error propagates rather than silently granting upgrade
      const enrollments = await storage.getMyEnrollments(userId);
      const enrolledCourse = enrollments.find((e: any) =>
        (e.status === 'active' || e.status === 'completed') && (e.progress || 0) >= 50
      );
      if (!enrolledCourse) {
        return res.status(403).json({ message: 'You must complete at least 50% of a BreedSkool course to upgrade to Creator.' });
      }
      // Prefill niche and bio from enrolled course metadata
      let niche: string | null = null;
      let bio: string | null = null;
      const enrolledCourseData = enrolledCourse?.courseId
        ? await storage.getCourseById(enrolledCourse.courseId)
        : null;
      if (enrolledCourseData?.category) niche = enrolledCourseData.category;
      if (enrolledCourseData?.title) bio = `BreedSkool graduate — ${enrolledCourseData.title}. Passionate about creating impactful content and building an online income.`;
      const updatePayload: any = { userType: 'creator' };
      if (niche && !u.niche) updatePayload.niche = niche;
      if (bio && !u.bio) updatePayload.bio = bio;
      const updated = await storage.updateUserProfile(userId, updatePayload);
      // Award upgrade bonus points
      storage.awardPoints(userId, 'become_creator', 100, 'Upgraded to Creator account!').catch(() => {});
      storage.createNotification({
        userId,
        type: 'account_upgrade',
        title: '🎉 Creator Account Activated!',
        content: 'Your account has been upgraded to Creator. You can now apply for brand campaigns and earn crypto rewards!',
        actionUrl: '/dashboard?tab=campaigns',
        isRead: false,
      } as any).catch(() => {});
      // Strip password from response
      const { password: _p, twoFactorSecret: _t, ...safeUser } = updated as any;
      res.json({ success: true, user: safeUser });
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to upgrade account' });
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
  // Optional ?feature=shop|courses|campaigns|p2p|subscriptions|tips|payouts
  app.get('/api/payment-methods', async (req, res) => {
    try {
      const feature = req.query.feature as string | undefined;
      const methods = await storage.getActivePaymentMethods(feature);
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
      // Strip auto-managed fields that must not be passed to Drizzle's .set()
      const { id: _id, createdAt: _c, updatedAt: _u, ...safeData } = req.body;
      const method = await storage.updatePaymentMethod(req.params.id, safeData);
      res.json(method);
    } catch (e) {
      console.error("Error updating payment method:", e);
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
      const force = req.body?.force === true || req.query?.force === 'true';
      if (existing.length > 0 && !force) return res.json({ message: 'Campaigns already exist', count: existing.length });
      const futureDate = (days: number) => new Date(Date.now() + days * 86400000);
      const demos = [
        { title: "Promote Our New Gaming App — TikTok/YouTube Review", description: "Create a 60-second TikTok or YouTube review of our gaming app. Show gameplay, highlight features, and include our download link in bio. Authentic reviews preferred. Brand will repost top creators on official channels.", category: "gaming", platform: "TikTok", brandName: "NovaByte Gaming", brandId: admin.id, reward: "120.00", totalSlots: 50, deadline: futureDate(30), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80", requirements: ["Minimum 5K followers", "Post must stay live for 30 days", "Include #NovaByteGaming hashtag", "Submit proof screenshot"], estimatedTime: "2-3 hours" },
        { title: "Instagram Reel for Premium Skincare Launch", description: "Create a 30-second Instagram Reel showcasing our new skincare product. Morning routine integration preferred. Product will be shipped to you free of charge before recording.", category: "beauty", platform: "Instagram", brandName: "GlowLab Beauty", brandId: admin.id, reward: "85.00", totalSlots: 30, deadline: futureDate(21), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80", requirements: ["Beauty/lifestyle niche", "Minimum 3K followers", "Tag @glowlabbeauty in post", "Reels format only"], estimatedTime: "1-2 hours" },
        { title: "Fitness Challenge — 7-Day Transformation Campaign", description: "Join our 7-day fitness challenge and document your journey. Post daily stories + one main feed post. Share honest results and experiences. Top 10 creators earn a 2x bonus payout.", category: "fitness", platform: "YouTube", brandName: "PeakFit Pro", brandId: admin.id, reward: "200.00", totalSlots: 100, deadline: futureDate(45), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80", requirements: ["Fitness/health niche", "Minimum 10K followers", "Post 7 consecutive stories", "Include affiliate link in bio"], estimatedTime: "7 days" },
        { title: "Tech Unboxing — Latest Wireless Earbuds Review", description: "Unbox and review our premium wireless earbuds. Test sound quality, battery life, and comfort. Share your honest opinion with your audience. Earbuds are yours to keep.", category: "tech", platform: "YouTube", brandName: "SoundWave Tech", brandId: admin.id, reward: "150.00", totalSlots: 40, deadline: futureDate(30), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80", requirements: ["Tech niche preferred", "Minimum 15K YouTube subscribers", "Video must be 5+ minutes", "Sound quality comparison included"], estimatedTime: "3-5 hours" },
        { title: "Travel Vlog Feature — Luxury Resort Partnership", description: "Feature our luxury resort in your next travel vlog. We cover accommodation for 3 nights + pay the campaign reward. Stunning coastal location with helicopter tour included.", category: "travel", platform: "YouTube", brandName: "Horizon Escapes", brandId: admin.id, reward: "750.00", totalSlots: 15, deadline: futureDate(60), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80", requirements: ["Travel niche creators only", "Minimum 50K followers", "Professional video quality", "At least 8-minute vlog feature"], estimatedTime: "3-5 days" },
        { title: "Food Reel Campaign — Healthy Meal Delivery App", description: "Create a food reel featuring our healthy meal delivery service. Show the ordering process, delivery, and taste test reaction. Fun and authentic content wins!", category: "food", platform: "Instagram", brandName: "FreshDrop", brandId: admin.id, reward: "75.00", totalSlots: 80, deadline: futureDate(21), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80", requirements: ["Food/lifestyle niche", "Minimum 2K followers", "Must show app ordering process", "Include discount code in caption"], estimatedTime: "1-2 hours" },
        { title: "Crypto Education Series — Explain DeFi to Beginners", description: "Create educational content explaining DeFi concepts for newcomers. Series of 3 short videos required. Position our protocol as a beginner-friendly entry point. High-tier creators earn up to $2,500.", category: "Crypto & Web3", platform: "YouTube", brandName: "BlockNova Protocol", brandId: admin.id, reward: "500.00", totalSlots: 25, deadline: futureDate(45), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80", requirements: ["Crypto/finance niche", "Minimum 25K followers", "Educational content style", "Disclose paid promotion"], estimatedTime: "5-8 hours" },
        { title: "Fashion Haul — Sustainable Streetwear Drop", description: "Showcase 3-5 pieces from our new sustainable streetwear collection. Style them, share what you love, and tag our brand. Free clothing worth $400 plus payout.", category: "Fashion & Beauty", platform: "TikTok", brandName: "EcoThread Co.", brandId: admin.id, reward: "180.00", totalSlots: 60, deadline: futureDate(30), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80", requirements: ["Fashion/lifestyle niche", "Minimum 8K followers", "TikTok or Reels format", "Show all 3-5 pieces"], estimatedTime: "2-4 hours" },
        { title: "AI Tool Showcase — Productivity Power Users Wanted", description: "Show how you use our AI productivity tool in your daily workflow. Long-form YouTube tutorial preferred. Top global creators (Power Influencer + Global Titan tiers) eligible for $5,000 bonus.", category: "Technology", platform: "YouTube", brandName: "FlowAI Labs", brandId: admin.id, reward: "1200.00", totalSlots: 10, deadline: futureDate(45), status: "active", isActive: true, featureImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80", requirements: ["Tech/productivity niche", "Minimum 100K followers", "Long-form YouTube only (10+ min)", "Real workflow integration"], estimatedTime: "8-12 hours" },
      ];
      const created = [];
      for (const demo of demos) {
        const id = `campaign_seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const campaign = await storage.createCampaign({ id, ...demo, paymentStatus: 'paid', filledSlots: 0 } as any);
        created.push(campaign);
      }
      res.json({ message: 'Demo campaigns created', count: created.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to seed demo campaigns", error: (e as Error).message });
    }
  });

  // Social Feed routes
  app.get('/api/feed', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const feed = await storage.getFeed(limit, offset);
      await storage.incrementPostViews(feed.map((post) => post.id));
      res.json(feed);
    } catch (error) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.get('/api/feed/spotlight', async (_req, res) => {
    try {
      const posts = await storage.getSpotlightPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spotlight posts" });
    }
  });

  app.patch('/api/admin/posts/:id/spotlight', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (!canManageContent(admin)) return res.status(403).json({ message: 'Forbidden' });
      const { isSpotlight, isSponsored } = req.body;
      const post = await storage.setPostSpotlight(req.params.id, !!isSpotlight, !!isSponsored);
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to update post spotlight" });
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

  // GET /api/posts/my-usage — returns user's monthly post count + limit
  app.get('/api/posts/my-usage', isAuthenticated, async (req: any, res) => {
    try {
      const usageUser = await storage.getUser(req.user.id);
      const tier = getSubscriptionTier(usageUser);
      const limit = POST_LIMITS[tier];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const [{ value: postCount }] = await db
        .select({ value: count() })
        .from(posts)
        .where(and(eq(posts.userId, req.user.id), gte(posts.createdAt, startOfMonth)));
      res.json({ count: Number(postCount), limit: limit === Infinity ? null : limit, tier });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/posts', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const { content, imageUrl, videoUrl } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }

      // ── Subscription-based monthly post limit ────────────────────────────────
      const postUser = await storage.getUser(req.user.id);
      const tier = getSubscriptionTier(postUser);
      const postLimit = POST_LIMITS[tier];
      if (postLimit !== Infinity) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [{ value: postCount }] = await db
          .select({ value: count() })
          .from(posts)
          .where(and(eq(posts.userId, req.user.id), gte(posts.createdAt, startOfMonth)));
        if (Number(postCount) >= postLimit) {
          return res.status(429).json({
            message: `You've reached your ${postLimit}-post monthly limit on the ${tier === 'free' ? 'Free' : 'Monthly'} plan.`,
            limit: postLimit,
            tier,
            upgradeRequired: true,
          });
        }
      }
      const { nanoid } = await import('nanoid');
      const id = `post_${nanoid()}`;
      const finalImageUrl = req.file ? `/uploads/${req.file.filename}` : imageUrl || null;
      const post = await storage.createPost(id, req.user.id, content.trim(), finalImageUrl, videoUrl || null);

      // Award points for first post
      try {
        const existingPoints = await storage.getUserPoints(req.user.id);
        const alreadyAwarded = existingPoints.some((p: any) => p.actionType === 'first_post');
        if (!alreadyAwarded) {
          await storage.awardPoints(req.user.id, 'first_post', 25, 'Posted your first update in the Feed!', id);
          await storage.createNotification({
            userId: req.user.id,
            type: 'points_earned',
            title: '🎉 +25 $TDRIP Earned!',
            content: 'You earned 25 $TDRIP points for posting your first Feed update! Keep sharing to grow your reputation.',
            actionUrl: '/wallet',
            isRead: false,
          } as any);
        } else {
          // Still award 5 pts per post (smaller reward)
          await storage.awardPoints(req.user.id, 'feed_post', 5, 'Shared an update in the Feed', id);
        }
      } catch (pointsErr) {
        console.error('Failed to award post points:', pointsErr);
      }

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get('/api/admin/feed-posts', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getUser(req.user.id);
      if (!canManageContent(admin) && !canModerate(admin)) return res.status(403).json({ message: 'Forbidden' });
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
      if (!canManageContent(admin)) return res.status(403).json({ message: 'Forbidden' });
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
      if (!canManageContent(admin) && !canModerate(admin)) return res.status(403).json({ message: 'Forbidden' });
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
        // Award 5 pts for following a user (once per unique follow)
        try {
          await storage.awardPoints(req.user.id, 'follow_user', 5, 'Followed a creator on Taskdrip', req.params.id);
        } catch (pointsErr) {
          console.error('Failed to award follow points:', pointsErr);
        }
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

  // Username availability check (used by profile-edit forms for live feedback)
  app.get('/api/users/check-username', async (req: any, res) => {
    try {
      const raw = String(req.query.username || '').trim();
      if (!raw) return res.json({ available: false, reason: "empty" });
      const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (normalized.length < 3 || normalized.length > 30) {
        return res.json({ available: false, reason: "length", normalized });
      }
      const RESERVED = new Set(['admin','administrator','root','support','help','api','www','login','signup','about','contact','terms','privacy','brand','brands','influencer','influencers','user','users','profile','dashboard','settings','wallet','tasks','campaigns','feed','messages','blog','shop','docs','documentation','roadmap']);
      if (RESERVED.has(normalized)) return res.json({ available: false, reason: "reserved", normalized });
      const existing = await storage.getUserByUsername(normalized);
      const myId = req.isAuthenticated() && req.user ? (req.user as any).id : null;
      if (existing && existing.id !== myId) return res.json({ available: false, reason: "taken", normalized });
      return res.json({ available: true, normalized });
    } catch (e) {
      res.status(500).json({ available: false, reason: "error" });
    }
  });

  // Resolve a username to a public profile (powers the /p/:username clean URL)
  app.get('/api/users/by-username/:username', async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, twoFactorSecret, ...safeUser } = user as any;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
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

  // ===== Bounty Escrow =====
  app.get('/api/campaigns/:id/escrow-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      if (campaign.brandId !== userId && req.user?.userType !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      const status = await storage.getCampaignEscrowStatus(req.params.id);
      res.json(status);
    } catch (e: any) {
      console.error('Error fetching escrow status:', e);
      res.status(500).json({ message: e.message || 'Failed to fetch escrow status' });
    }
  });

  app.post('/api/campaigns/:id/refund-escrow', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const result = await storage.refundCampaignEscrow(req.params.id, userId);
      res.json({ success: true, ...result });
    } catch (e: any) {
      console.error('Error refunding escrow:', e);
      res.status(400).json({ message: e.message || 'Failed to refund escrow' });
    }
  });

  app.get('/api/brand/escrow-overview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (req.user?.userType !== 'brand' && req.user?.userType !== 'admin') {
        return res.status(403).json({ message: 'Brands only' });
      }
      const overview = await storage.getBrandEscrowOverview(userId);
      res.json(overview);
    } catch (e: any) {
      console.error('Error fetching brand escrow overview:', e);
      res.status(500).json({ message: e.message || 'Failed to fetch overview' });
    }
  });

  // Create new campaign with escrow payment (with optional image upload)
  app.post('/api/campaigns', upload.single('featureImage'), async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Please log in as a brand to create a campaign." });
      }
      
      const user = req.user as any;

      // Check if user is a brand
      if (user.userType !== 'brand') {
        return res.status(403).json({ message: "Only brand accounts can create campaigns. Switch your account type from Profile → Edit." });
      }

      // ── Free brand campaign limit ─────────────────────────────────────────────
      const campaignUser = await storage.getUser(user.id);
      const campaignTier = getSubscriptionTier(campaignUser);
      const campaignLimit = CAMPAIGN_LIMITS[campaignTier];
      if (campaignLimit !== Infinity) {
        const [{ value: campCount }] = await db
          .select({ value: count() })
          .from(campaigns)
          .where(eq(campaigns.brandId, user.id));
        if (Number(campCount) >= campaignLimit) {
          return res.status(429).json({
            message: `Free brands can post up to ${campaignLimit} campaigns. Upgrade to Premium to post unlimited campaigns.`,
            limit: campaignLimit,
            upgradeRequired: true,
          });
        }
      }

      // ── Defensive validation with clear, plain-English errors ───────────────
      const title = String(req.body.title || "").trim();
      const description = String(req.body.description || "").trim();
      const category = String(req.body.category || "").trim();
      const estimatedTime = String(req.body.estimatedTime || "").trim() || "1-2 days";
      const requirementsRaw = req.body.requirements;
      const requirements = Array.isArray(requirementsRaw)
        ? requirementsRaw.filter(Boolean)
        : (requirementsRaw && String(requirementsRaw).trim() ? [String(requirementsRaw).trim()] : []);
      const rewardNum = Number(req.body.reward);
      const totalSlotsNum = parseInt(String(req.body.totalSlots || ""), 10);
      const deadlineRaw = req.body.deadline;
      const deadlineDate = deadlineRaw ? new Date(deadlineRaw) : null;

      const missing: string[] = [];
      if (!title) missing.push("Title");
      if (!description) missing.push("Description");
      if (!category) missing.push("Category");
      if (requirements.length === 0) missing.push("Requirements");
      if (!Number.isFinite(rewardNum) || rewardNum < 1) missing.push("Reward (at least $1)");
      if (!Number.isFinite(totalSlotsNum) || totalSlotsNum < 1) missing.push("Total slots (at least 1)");
      if (!deadlineDate || isNaN(deadlineDate.getTime())) missing.push("Deadline");
      if (missing.length > 0) {
        return res.status(400).json({
          message: `Please complete: ${missing.join(", ")}.`,
          missingFields: missing,
        });
      }

      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tdripAddon = parseTdripAddon(req.body);
      const preQualificationTasks = parseJsonArrayField(req.body.preQualificationTasks);

      const campaignData = {
        id: campaignId,
        title,
        description,
        category,
        reward: rewardNum.toFixed(2), // decimal column accepts string
        totalSlots: totalSlotsNum,
        deadline: deadlineDate,
        requirements,
        preQualificationTasks,
        qualificationRules: req.body.qualificationRules ? String(req.body.qualificationRules) : null,
        ...tdripAddon,
        estimatedTime,
        brandId: user.id,
        brandName: req.body.brandName || user.companyName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unnamed Brand",
        featureImage: req.file ? `/uploads/${req.file.filename}` : null,
        status: 'pending_payment',
        paymentStatus: 'pending',
        isActive: false,
        filledSlots: 0,
      };

      console.log("[campaign-create:brand]", { id: campaignData.id, title: campaignData.title, brandId: user.id });
      const campaign = await storage.createCampaign(campaignData as any);
      console.log("Campaign created:", campaign);

      // Auto-create add-on micro tasks for EVERY pre-qualification task the brand
      // entered so they always sync with the campaign and show up on the
      // campaign detail page. $TDRIP rewards are optional — if the brand set a
      // per-participant point reward AND has enough balance, we escrow it and
      // create the task with that reward; otherwise we still create the task
      // with a 0 reward so creators can complete it for tracking/eligibility.
      try {
        const tdripPerTask = Math.floor(Number(tdripAddon.tdripPointsPerParticipant || 0));
        const tdripLimit = Math.floor(Number(tdripAddon.tdripParticipantLimit || 0));
        const allTasks = (Array.isArray(preQualificationTasks) ? preQualificationTasks : [])
          .filter((t: any) => t && (String(t.task || "").trim() || t.actionUrl));

        if (allTasks.length > 0) {
          let escrowPerTask = 0;
          let useTdrip = false;

          if (tdripPerTask > 0 && tdripLimit > 0) {
            escrowPerTask = tdripPerTask * tdripLimit;
            const totalNeeded = escrowPerTask * allTasks.length;
            const brandBalance = await storage.getUserTotalPoints(user.id);
            if (brandBalance >= totalNeeded) {
              useTdrip = true;
            } else {
              console.log(
                `[campaign ${campaign.id}] Brand has ${brandBalance} $TDRIP, needs ${totalNeeded}. Creating add-on tasks with 0 reward.`
              );
              escrowPerTask = 0;
            }
          }

          const fallbackLimit = Math.max(1, Math.floor(Number(campaign.totalSlots) || 1));

          for (const t of allTasks) {
            const taskTitle = String(t.task || "Pre-qualification task").slice(0, 200);
            const platform = t.platform ? `${t.platform}: ` : "";
            const description = `${platform}${taskTitle}`;
            const proofRequired = !!t.proofRequired && !t.autoApprove;
            const autoApprove = !!t.autoApprove;
            const actionUrl = t.actionUrl ? String(t.actionUrl).trim() : null;

            if (useTdrip && escrowPerTask > 0) {
              await storage.awardPoints(
                user.id,
                "micro_task_escrow",
                -escrowPerTask,
                `$TDRIP escrow for pre-qualification task: ${taskTitle}`,
                campaign.id,
              );
            }

            await db.insert(campaignMicroTasks).values({
              campaignId: campaign.id,
              brandId: user.id,
              title: taskTitle,
              description,
              tdripReward: useTdrip ? tdripPerTask : 0,
              participantLimit: useTdrip ? tdripLimit : fallbackLimit,
              escrowedPoints: useTdrip ? escrowPerTask : 0,
              actionUrl,
              proofRequired,
              autoApprove,
              createdBy: user.id,
            });
          }
        }
      } catch (microErr) {
        console.error("Failed to auto-create per-task micro tasks:", microErr);
      }

      // Create escrow payment session with 30-minute window
      // Brands pay the exact total campaign budget — no platform fee added to brands
      const totalReward = parseFloat(req.body.reward) * parseInt(req.body.totalSlots);
      const totalAmount = totalReward + Number(tdripAddon.tdripEscrowValue); // Campaign budget plus optional $TDRIP task add-on escrow
      const escrowPaymentData = {
        id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id,
        brandId: user.id,
        amount: totalAmount,
        status: 'payment_window',
        paymentWindowStart: new Date(),
        paymentWindowEnd: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };
      
      const escrowPayment = await storage.createEscrowPayment(escrowPaymentData);
      sendAdminActivityEmail({
        event: "transaction",
        subject: `New campaign awaiting payment: ${title}`,
        recipient: TASKDRIP_EMAILS.info,
        fromEmail: TASKDRIP_EMAILS.info,
        customer: {
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email,
          phone: user.phoneNumber,
        },
        details: [
          { label: "Campaign ID", value: campaign.id },
          { label: "Campaign title", value: title },
          { label: "Budget", value: totalAmount },
          { label: "Reward per creator", value: rewardNum },
          { label: "Creator slots", value: totalSlotsNum },
          { label: "Escrow payment ID", value: escrowPayment.id },
          { label: "Status", value: campaign.status },
        ],
      }).catch(() => {});

      res.status(201).json({
        success: true,
        campaign,
        campaignId: campaign.id,
        escrowPaymentId: escrowPayment.id,
      });
    } catch (error: any) {
      console.error("Error creating brand campaign:", error);
      const detail = error?.message || error?.detail || "Unknown error";
      res.status(500).json({ message: `Could not create campaign: ${detail}` });
    }
  });

  // Update campaign — accepts both `featureImage` and `featuredImage` for the hero image upload
  app.patch('/api/campaigns/:id', isAuthenticated, upload.any(), async (req: any, res) => {
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

      const updates: Record<string, any> = { ...req.body };

      // Coerce numeric fields when sent as strings via multipart form
      if (!isAdmin) {
        delete updates.reward;
        delete updates.totalSlots;
      } else {
        if (updates.reward !== undefined && updates.reward !== "") updates.reward = parseFloat(updates.reward);
        if (updates.totalSlots !== undefined && updates.totalSlots !== "") updates.totalSlots = parseInt(updates.totalSlots);
      }
      if (updates.deadline) {
        try { updates.deadline = new Date(updates.deadline); } catch {}
      }
      if (typeof updates.requirements === 'string' && updates.requirements.trim()) {
        updates.requirements = [updates.requirements];
      }

      // Pull image from any common field name (featureImage / featuredImage / image)
      const files = (req.files as Express.Multer.File[] | undefined) || [];
      const imageFile = files.find((f) =>
        ["featureImage", "featuredImage", "image", "file"].includes(f.fieldname)
      );
      if (imageFile) {
        updates.featureImage = `/uploads/${imageFile.filename}`;
      } else if (typeof updates.featuredImage === 'string' && updates.featuredImage) {
        // Allow setting via plain URL field too
        updates.featureImage = updates.featuredImage;
      }
      delete updates.featuredImage;

      const updatedCampaign = await storage.updateCampaign(campaignId, updates);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // Delete campaign — owner or admin only
  app.delete('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const requesterId = req.user.id;
      const requester = await storage.getUser(requesterId);
      const campaignId = req.params.id;

      const campaign = await storage.getCampaignById(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const isAdmin = requester?.userType === 'admin';
      const isBrandOwner = campaign.brandId === requesterId;
      if (!isAdmin && !isBrandOwner) {
        return res.status(403).json({ message: "You can only delete your own campaigns" });
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

      const payer = await storage.getUser(escrowPayment.brandId).catch(() => null);
      sendAdminActivityEmail({
        event: "payment",
        subject: `Campaign escrow payment submitted: ${campaignId}`,
        recipient: TASKDRIP_EMAILS.payments,
        fromEmail: TASKDRIP_EMAILS.payments,
        customer: {
          name: `${payer?.firstName || ""} ${payer?.lastName || ""}`.trim(),
          email: payer?.email,
          phone: payer?.phoneNumber || undefined,
        },
        details: [
          { label: "Campaign ID", value: campaignId },
          { label: "Payment ID", value: escrowPayment.id },
          { label: "Amount", value: escrowPayment.amount },
          { label: "Network", value: network },
          { label: "Transaction reference", value: transactionHash },
          { label: "Status", value: "verifying" },
        ],
      }).catch(() => {});

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
  // Helper: compute eligibility for a user against a campaign.
  // Returns { eligible, minFollowers, userFollowers, reason }.
  const computeCampaignEligibility = (campaign: any, user: any) => {
    const minFollowers = Number((campaign as any)?.minFollowers || 0);
    const userFollowers = Number((user as any)?.totalFollowers || 0);
    if (minFollowers > 0 && userFollowers < minFollowers) {
      const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);
      return {
        eligible: false,
        minFollowers,
        userFollowers,
        reason: `This campaign requires at least ${fmt(minFollowers)} total followers. Your profile shows ${fmt(userFollowers)}. Update your social handles in Profile so your follower count syncs, then try again.`,
      };
    }
    return { eligible: true, minFollowers, userFollowers, reason: '' };
  };

  // Pre-flight eligibility for the current user on a campaign.
  app.get('/api/campaigns/:id/eligibility', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const campaign = await storage.getCampaignById(req.params.id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      const user = await storage.getUser(req.user.id);
      res.json(computeCampaignEligibility(campaign, user));
    } catch (error) {
      console.error('Error computing eligibility:', error);
      res.status(500).json({ message: 'Failed to compute eligibility' });
    }
  });

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

      // Eligibility filter — block applicants who don't meet brand's follower requirement.
      const campaignForEligibility = await storage.getCampaignById(campaignId);
      if (!campaignForEligibility) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const userRecord = await storage.getUser(userId);
      const eligibility = computeCampaignEligibility(campaignForEligibility, userRecord);
      if (!eligibility.eligible) {
        return res.status(400).json({ message: eligibility.reason, ...eligibility });
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

      // Award points for applying to a campaign
      try {
        await storage.awardPoints(userId, 'campaign_apply', 10, `Applied to campaign: ${campaign?.title || campaignId}`, campaignId);
        await storage.createNotification({
          userId,
          type: 'points_earned',
          title: '🎉 +10 $TDRIP Earned!',
          content: `You earned 10 $TDRIP points for applying to "${campaign?.title || 'a campaign'}"! Keep engaging to level up.`,
          actionUrl: '/wallet',
          isRead: false,
        } as any);
      } catch (pointsErr) {
        console.error('Failed to award campaign apply points:', pointsErr);
      }

      res.json(participation);
    } catch (error) {
      console.error("Error joining campaign:", error);
      res.status(500).json({ message: "Failed to join campaign" });
    }
  });

  app.post('/api/campaigns/:id/submit', upload.array('files'), async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
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
    } catch (error: any) {
      console.error("Error submitting task:", error);
      res.status(500).json({ message: error?.message || "Failed to submit task" });
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

      // Username normalization & validation
      if (updates.username !== undefined) {
        const raw = String(updates.username || '').trim();
        if (raw === '') {
          updates.username = null;
        } else {
          const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
          if (normalized.length < 3 || normalized.length > 30) {
            return res.status(400).json({ message: "Username must be 3-30 characters (letters, numbers, underscore)." });
          }
          const RESERVED = new Set(['admin','administrator','root','support','help','api','www','login','signup','about','contact','terms','privacy','brand','brands','influencer','influencers','user','users','profile','dashboard','settings','wallet','tasks','campaigns','feed','messages','blog','shop','docs','documentation','roadmap']);
          if (RESERVED.has(normalized)) {
            return res.status(409).json({ message: "That username is reserved. Please choose a different one." });
          }
          // Pre-flight uniqueness check (case-insensitive via normalized lowercase)
          const existing = await storage.getUserByUsername(normalized);
          if (existing && existing.id !== userId) {
            return res.status(409).json({ message: "That username is already taken. Please choose a different one." });
          }
          updates.username = normalized;
        }
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

      // Check if profile is now "complete" — award 100 pts if not already awarded
      try {
        const u = updatedUser as any;
        const isComplete = !!(u.firstName && u.bio && u.profileImageUrl && u.country);
        if (isComplete) {
          const existingPoints = await storage.getUserPoints(userId);
          const alreadyAwarded = existingPoints.some((p: any) => p.actionType === 'profile_completion');
          if (!alreadyAwarded) {
            await storage.awardPoints(userId, 'profile_completion', 100, 'Completed your Taskdrip profile — looking great!', userId);
            await storage.createNotification({
              userId,
              type: 'points_earned',
              title: '🎉 +100 $TDRIP Earned!',
              content: 'Your profile is complete! You\'ve earned 100 $TDRIP points. A complete profile attracts more brands and opportunities.',
              actionUrl: '/wallet',
              isRead: false,
            } as any);
          }
        }
      } catch (pointsErr) {
        console.error('Failed to check/award profile completion points:', pointsErr);
      }

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
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        userId
      });

      const transaction = await storage.createTransaction(validatedData);
      sendAdminActivityEmail({
        event: "transaction",
        subject: `New transaction: ${transaction.type || "platform transaction"}`,
        recipient: TASKDRIP_EMAILS.info,
        fromEmail: TASKDRIP_EMAILS.info,
        customer: {
          name: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
          email: req.user.email,
          phone: req.user.phoneNumber,
        },
        details: [
          { label: "Transaction ID", value: transaction.id },
          { label: "Type", value: transaction.type },
          { label: "Amount", value: transaction.amount },
          { label: "Status", value: transaction.status },
          { label: "Network", value: transaction.network },
          { label: "Reference", value: transaction.transactionHash },
          { label: "Description", value: transaction.description },
        ],
      }).catch(() => {});
      res.json(transaction);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: error?.message || "Failed to create transaction" });
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

  // Blog tip wallet — returns active admin wallets for tip payments
  app.get('/api/blog/tip-wallet', async (_req, res) => {
    try {
      const wallets = await storage.getActiveAdminWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tip wallets" });
    }
  });

  // Submit a blog tip
  app.post('/api/blog/:slug/tip', async (req: any, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const { amount, network, txHash, walletAddress, message, displayName } = req.body;
      if (!amount || !network) return res.status(400).json({ message: "Amount and network are required" });
      const tip = await storage.createBlogTip({
        postId: post.id,
        userId: req.user?.id || null,
        displayName: displayName || (req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : "Anonymous"),
        amount: String(amount),
        currency: "USDT",
        network,
        txHash: txHash || null,
        walletAddress: walletAddress || null,
        status: "pending",
        message: message || null,
      });
      res.status(201).json(tip);
    } catch (error) {
      console.error("Blog tip error:", error);
      res.status(500).json({ message: "Failed to submit tip" });
    }
  });

  // Get tips for a blog post
  app.get('/api/blog/:slug/tips', async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      const tips = await storage.getBlogTipsByPostId(post.id);
      res.json(tips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tips" });
    }
  });

  // Note: Shop routes moved to dedicated section below for better organization

  // Purchase routes
  app.post('/api/purchases', upload.single('paymentProof'), async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;

      // Parse selectedAddons (may come as JSON string from multipart)
      let selectedAddons: { id: string; title: string; price: number }[] = [];
      try {
        const raw = req.body.selectedAddons;
        if (Array.isArray(raw)) selectedAddons = raw;
        else if (typeof raw === 'string' && raw.trim()) selectedAddons = JSON.parse(raw);
      } catch { selectedAddons = []; }

      // Server-side recompute: validate addons against product, compute totals
      let addonsTotal = 0;
      let trustedAddons: { id: string; title: string; price: number }[] = [];
      if (req.body.productId && selectedAddons.length > 0) {
        const prod = await storage.getShopProductById(req.body.productId);
        const available = (prod?.serviceAddons as any[]) || [];
        for (const sel of selectedAddons) {
          const match = available.find((a: any) => a.id === sel.id);
          if (match) {
            const price = Number(match.price) || 0;
            trustedAddons.push({ id: match.id, title: match.title, price });
            addonsTotal += price;
          }
        }
      }

      const basePrice = Number(req.body.totalAmount) || 0;
      const finalTotal = (basePrice + addonsTotal).toFixed(2);

      const validatedData = insertPurchaseSchema.parse({
        ...req.body,
        userId,
        paymentProof: req.file?.path,
        totalAmount: finalTotal,
        selectedAddons: trustedAddons,
        addonsTotal: addonsTotal.toFixed(2),
      });

      const purchase = await storage.createPurchase(validatedData);

      // Notify admin of new shop order
      try {
        const adminForPurchase = await storage.getAdminUser();
        if (adminForPurchase) {
          const buyer = await storage.getUser(userId);
          const productTitle = purchase.productId
            ? (await storage.getShopProductById(purchase.productId))?.title || 'item'
            : 'item';
          await storage.createNotification({
            userId: adminForPurchase.id,
            type: 'order',
            title: `🛒 New Shop Order — ${productTitle}`,
            content: `${buyer?.firstName || 'A user'} ${buyer?.lastName || ''} placed an order for "${productTitle}" (${finalTotal} USD). Review & approve in Admin → Payments.`,
            priority: 'high',
            actionUrl: '/admin/payments',
          } as any);
        }
      } catch (_e) { /* non-fatal */ }

      const legacyBuyer = await storage.getUser(userId).catch(() => null);
      sendAdminActivityEmail({
        event: "shop_order",
        subject: `New shop order: ${purchase.id}`,
        recipient: TASKDRIP_EMAILS.payments,
        fromEmail: TASKDRIP_EMAILS.payments,
        customer: {
          name: `${legacyBuyer?.firstName || ""} ${legacyBuyer?.lastName || ""}`.trim(),
          email: legacyBuyer?.email,
          phone: legacyBuyer?.phoneNumber || undefined,
        },
        details: [
          { label: "Order ID", value: purchase.id },
          { label: "Product ID", value: purchase.productId },
          { label: "Amount", value: purchase.totalAmount },
          { label: "Payment method", value: purchase.paymentMethod },
          { label: "Transaction reference", value: purchase.transactionHash || purchase.paymentProof },
          { label: "Status", value: purchase.status },
        ],
      }).catch(() => {});

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

      const msgs = await storage.getUserMessages(userId);

      // Batch-load all unique user IDs in ONE query instead of N*2 individual lookups
      const uniqueIds = [...new Set(msgs.flatMap(m => [m.senderId, m.receiverId]))];
      const userRows = uniqueIds.length
        ? await db.select({
            id: users.id, firstName: users.firstName, lastName: users.lastName,
            companyName: users.companyName, userType: users.userType,
            username: users.username, profileImageUrl: users.profileImageUrl,
          }).from(users).where(inArray(users.id, uniqueIds))
        : [];
      const userMap: Record<string, any> = {};
      for (const u of userRows) userMap[u.id] = u;

      const enrichedMessages = msgs.map(msg => ({
        ...msg,
        sender: userMap[msg.senderId] || null,
        receiver: userMap[msg.receiverId] || null,
      }));

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
        url: `/uploads/${path.basename(file.path)}`,
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

        // Mark the participation as completed now that the work has been verified and paid
        if (submission.participationId) {
          try {
            await storage.updateParticipation(submission.participationId, {
              status: 'completed',
              reviewedAt: new Date(),
            } as any);
          } catch (e) { /* non-fatal */ }
        }

        // Award $TDRIP add-on points if configured (only paid out after verified completion)
        const tdripPoints = Number((campaign as any).tdripPointsPerParticipant || 0);
        const tdripLimit = Number((campaign as any).tdripParticipantLimit || 0);
        if (tdripPoints > 0 && (!tdripLimit || (campaign.filledSlots || 0) <= tdripLimit)) {
          try {
            await storage.awardPoints(
              submission.userId,
              'campaign_task_addon',
              tdripPoints,
              `$TDRIP add-on reward for: ${campaign.title || 'Campaign'}`,
              campaign.id,
            );
          } catch (e) { /* non-fatal */ }
        }

        // Notify creator of approval and payment
        await storage.createNotification({
          userId: submission.userId,
          type: 'task_approved',
          title: 'Task Approved & Payment Sent',
          content: `Your submission for "${campaign.title}" has been approved. $${campaign.reward} has been added to your wallet${tdripPoints > 0 ? `, plus ${tdripPoints} $TDRIP points` : ''}.`,
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

  app.get('/api/campaigns/:id/micro-tasks', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const tasks = await db.select().from(campaignMicroTasks)
        .where(and(eq(campaignMicroTasks.campaignId, req.params.id), eq(campaignMicroTasks.isActive, true)))
        .orderBy(desc(campaignMicroTasks.createdAt));
      let submissions: any[] = [];
      if (userId) {
        submissions = await db.select().from(microTaskSubmissions)
          .where(and(eq(microTaskSubmissions.campaignId, req.params.id), eq(microTaskSubmissions.userId, userId)));
      }
      res.json(tasks.map((task) => ({
        ...task,
        mySubmission: submissions.find((submission) => submission.microTaskId === task.id) || null,
      })));
    } catch (error) {
      console.error("Error fetching micro tasks:", error);
      res.status(500).json({ message: "Failed to fetch micro tasks" });
    }
  });

  app.get('/api/brand/micro-tasks', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const rows = await db.select({
        task: campaignMicroTasks,
        campaign: campaigns,
      }).from(campaignMicroTasks)
        .leftJoin(campaigns, eq(campaignMicroTasks.campaignId, campaigns.id))
        .where(eq(campaignMicroTasks.brandId, userId))
        .orderBy(desc(campaignMicroTasks.createdAt));
      res.json(rows.map(({ task, campaign }) => ({ ...task, campaign })));
    } catch (error) {
      console.error("Error fetching brand micro tasks:", error);
      res.status(500).json({ message: "Failed to fetch brand micro tasks" });
    }
  });

  app.post('/api/campaigns/:id/micro-tasks', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const access = await canManageCampaign(userId, req.params.id);
      if (!access.campaign) return res.status(404).json({ message: access.message });
      if (!access.ok) return res.status(403).json({ message: access.message });

      const title = String(req.body.title || "").trim();
      const description = String(req.body.description || "").trim();
      const tdripReward = Math.floor(Number(req.body.tdripReward || 0));
      const participantLimit = Math.max(1, Math.floor(Number(req.body.participantLimit || access.campaign.totalSlots || 1)));
      const proofRequired = req.body.proofRequired !== false && req.body.proofRequired !== "false";
      const autoApprove = req.body.autoApprove === true || req.body.autoApprove === "true" || !!access.campaign.autoApproveMicroTasks;
      const actionUrl = String(req.body.actionUrl || "").trim() || null;
      if (!title || !description || tdripReward <= 0) {
        return res.status(400).json({ message: "Title, description, and reward points are required" });
      }
      const escrowedPoints = tdripReward * participantLimit;
      const currentPoints = await storage.getUserTotalPoints(access.campaign.brandId);
      if (currentPoints < escrowedPoints) {
        return res.status(400).json({
          message: `Not enough $TDRIP points. This add-on needs ${escrowedPoints.toLocaleString()} $TDRIP. Please buy more points first.`,
          requiredPoints: escrowedPoints,
          currentPoints,
        });
      }
      await storage.awardPoints(access.campaign.brandId, "micro_task_escrow", -escrowedPoints, `$TDRIP escrow for micro task: ${title}`, req.params.id);
      const [task] = await db.insert(campaignMicroTasks).values({
        campaignId: req.params.id,
        brandId: access.campaign.brandId,
        title,
        description,
        tdripReward,
        participantLimit,
        escrowedPoints,
        actionUrl,
        proofRequired,
        autoApprove,
        createdBy: userId,
      }).returning();
      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating micro task:", error);
      const detail = error?.message || error?.detail || "Unknown error";
      res.status(500).json({ message: `Could not create micro-task: ${detail}` });
    }
  });

  app.patch('/api/micro-tasks/:id', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const [task] = await db.select().from(campaignMicroTasks).where(eq(campaignMicroTasks.id, req.params.id));
      if (!task) return res.status(404).json({ message: "Micro task not found" });
      const access = await canManageCampaign(userId, task.campaignId);
      if (!access.ok) return res.status(403).json({ message: access.message });
      const updates: any = { updatedAt: new Date() };

      // Toggle / boolean fields
      if (typeof req.body.autoApprove !== "undefined") updates.autoApprove = !!req.body.autoApprove;
      if (typeof req.body.isActive !== "undefined") updates.isActive = !!req.body.isActive;
      if (typeof req.body.proofRequired !== "undefined") updates.proofRequired = !!req.body.proofRequired;

      // Editable text fields
      if (typeof req.body.title === "string") {
        const v = req.body.title.trim();
        if (!v) return res.status(400).json({ message: "Title cannot be empty" });
        updates.title = v;
      }
      if (typeof req.body.description === "string") {
        const v = req.body.description.trim();
        if (!v) return res.status(400).json({ message: "Description cannot be empty" });
        updates.description = v;
      }
      if (typeof req.body.actionUrl !== "undefined") {
        updates.actionUrl = String(req.body.actionUrl || "").trim() || null;
      }

      // Reward / participant limit may need extra escrow or refund
      const newReward = req.body.tdripReward !== undefined ? Math.max(1, Math.floor(Number(req.body.tdripReward))) : task.tdripReward;
      const newLimit = req.body.participantLimit !== undefined ? Math.max(1, Math.floor(Number(req.body.participantLimit))) : task.participantLimit;
      const rewardChanged = req.body.tdripReward !== undefined && newReward !== task.tdripReward;
      const limitChanged = req.body.participantLimit !== undefined && newLimit !== task.participantLimit;
      if (rewardChanged || limitChanged) {
        // Check approved submissions cannot be undercut
        const [{ count: approvedCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(microTaskSubmissions)
          .where(and(eq(microTaskSubmissions.microTaskId, task.id), eq(microTaskSubmissions.status, "approved")));
        if (newLimit < Number(approvedCount || 0)) {
          return res.status(400).json({ message: `Cannot reduce participant limit below approved submissions (${approvedCount}).` });
        }
        const newEscrow = newReward * newLimit;
        const oldEscrow = task.escrowedPoints || (task.tdripReward * task.participantLimit);
        const delta = newEscrow - oldEscrow;
        if (delta > 0) {
          const currentPoints = await storage.getUserTotalPoints(task.brandId);
          if (currentPoints < delta) {
            return res.status(400).json({
              message: `Not enough $TDRIP. Updating this add-on needs ${delta.toLocaleString()} more $TDRIP. Top up your wallet first.`,
              requiredPoints: delta,
              currentPoints,
            });
          }
          await storage.awardPoints(task.brandId, "micro_task_escrow", -delta, `Additional $TDRIP escrow for micro task: ${task.title}`, task.campaignId);
        } else if (delta < 0) {
          await storage.awardPoints(task.brandId, "micro_task_escrow_refund", -delta, `Refund of unused $TDRIP escrow for micro task: ${task.title}`, task.campaignId);
        }
        updates.tdripReward = newReward;
        updates.participantLimit = newLimit;
        updates.escrowedPoints = newEscrow;
      }

      const [updated] = await db.update(campaignMicroTasks).set(updates).where(eq(campaignMicroTasks.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating micro task:", error);
      res.status(500).json({ message: "Failed to update micro task" });
    }
  });

  app.post('/api/micro-tasks/:id/submit', upload.single('proofFile'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const [task] = await db.select().from(campaignMicroTasks).where(eq(campaignMicroTasks.id, req.params.id));
      if (!task || !task.isActive) return res.status(404).json({ message: "Micro task not found" });
      const proofText = String(req.body.proofText || "").trim();
      const proofUrl = String(req.body.proofUrl || "").trim();
      const proofFile = req.file ? `/uploads/${req.file.filename}` : "";
      if (task.proofRequired && !proofText && !proofUrl && !proofFile) {
        return res.status(400).json({ message: "Please add proof text, a proof link, or upload a file" });
      }
      // Auto-confirm flow when no proof is required: brief confirmation text recorded
      const confirmText = !task.proofRequired && !proofText ? "User confirmed action completed" : proofText;
      const existing = await db.select().from(microTaskSubmissions)
        .where(and(eq(microTaskSubmissions.microTaskId, task.id), eq(microTaskSubmissions.userId, userId)));
      if (existing.some((submission) => submission.status !== "rejected")) {
        return res.status(400).json({ message: "You already submitted this micro task" });
      }
      const approvedRows = await db.select({ count: sql<number>`count(*)` }).from(microTaskSubmissions)
        .where(and(eq(microTaskSubmissions.microTaskId, task.id), eq(microTaskSubmissions.status, "approved")));
      const approvedCount = Number(approvedRows[0]?.count || 0);
      if (task.participantLimit && approvedCount >= task.participantLimit) {
        return res.status(400).json({ message: "This micro task has reached its participant limit" });
      }
      const status = task.autoApprove ? "approved" : "pending";
      const [submission] = await db.insert(microTaskSubmissions).values({
        microTaskId: task.id,
        campaignId: task.campaignId,
        userId,
        proofText: confirmText,
        proofUrl,
        proofFile,
        status,
        reviewedBy: status === "approved" ? task.brandId : null,
        reviewedAt: status === "approved" ? new Date() : null,
        reviewNotes: status === "approved" ? "Auto-approved" : null,
      }).returning();
      if (status === "approved") {
        await storage.awardPoints(userId, "micro_task_reward", task.tdripReward, `$TDRIP micro task reward: ${task.title}`, submission.id);
      }
      res.status(201).json({ ...submission, autoApproved: status === "approved" });
    } catch (error) {
      console.error("Error submitting micro task:", error);
      res.status(500).json({ message: "Failed to submit micro task" });
    }
  });

  app.get('/api/brand/micro-task-submissions', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const rows = await db.select({
        submission: microTaskSubmissions,
        task: campaignMicroTasks,
        campaign: campaigns,
        user: users,
      }).from(microTaskSubmissions)
        .leftJoin(campaignMicroTasks, eq(microTaskSubmissions.microTaskId, campaignMicroTasks.id))
        .leftJoin(campaigns, eq(microTaskSubmissions.campaignId, campaigns.id))
        .leftJoin(users, eq(microTaskSubmissions.userId, users.id))
        .where(eq(campaignMicroTasks.brandId, userId))
        .orderBy(desc(microTaskSubmissions.submittedAt));
      res.json(rows.map(({ submission, task, campaign, user }) => ({
        ...submission,
        task,
        campaign,
        user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, profileImage: user.profileImageUrl } : null,
      })));
    } catch (error) {
      console.error("Error fetching micro task submissions:", error);
      res.status(500).json({ message: "Failed to fetch micro task submissions" });
    }
  });

  app.get('/api/admin/micro-task-submissions', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const [admin] = await db.select().from(users).where(eq(users.id, userId));
      if (admin?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const rows = await db.select({
        submission: microTaskSubmissions,
        task: campaignMicroTasks,
        campaign: campaigns,
        user: users,
      }).from(microTaskSubmissions)
        .leftJoin(campaignMicroTasks, eq(microTaskSubmissions.microTaskId, campaignMicroTasks.id))
        .leftJoin(campaigns, eq(microTaskSubmissions.campaignId, campaigns.id))
        .leftJoin(users, eq(microTaskSubmissions.userId, users.id))
        .orderBy(desc(microTaskSubmissions.submittedAt));
      res.json(rows.map(({ submission, task, campaign, user }) => ({
        ...submission,
        task,
        campaign: campaign ? { id: campaign.id, title: campaign.title, brandId: campaign.brandId } : null,
        user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, profileImageUrl: user.profileImageUrl } : null,
      })));
    } catch (error) {
      console.error("Error fetching admin micro task submissions:", error);
      res.status(500).json({ message: "Failed to fetch micro task submissions" });
    }
  });

  app.patch('/api/micro-task-submissions/:id/review', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const [submission] = await db.select().from(microTaskSubmissions).where(eq(microTaskSubmissions.id, req.params.id));
      if (!submission) return res.status(404).json({ message: "Submission not found" });
      const [task] = await db.select().from(campaignMicroTasks).where(eq(campaignMicroTasks.id, submission.microTaskId));
      if (!task) return res.status(404).json({ message: "Micro task not found" });
      const access = await canManageCampaign(userId, task.campaignId);
      if (!access.ok) return res.status(403).json({ message: access.message });
      const action = String(req.body.action || "").toLowerCase();
      if (!["approved", "rejected"].includes(action)) {
        return res.status(400).json({ message: "Review action must be approved or rejected" });
      }
      if (submission.status === "approved") return res.json(submission);
      const [updated] = await db.update(microTaskSubmissions).set({
        status: action,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: req.body.notes || null,
        updatedAt: new Date(),
      }).where(eq(microTaskSubmissions.id, req.params.id)).returning();
      if (action === "approved") {
        await storage.awardPoints(submission.userId, "micro_task_reward", task.tdripReward, `$TDRIP micro task reward: ${task.title}`, submission.id);
      }
      res.json(updated);
    } catch (error) {
      console.error("Error reviewing micro task submission:", error);
      res.status(500).json({ message: "Failed to review micro task submission" });
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

  // Brand approves an application/participation — this ONLY accepts the influencer
  // into the campaign. It does NOT release funds. Payment is released only after the
  // influencer submits proof and the brand approves the submission via
  // PATCH /api/task-submissions/:id/approve.
  app.patch('/api/participations/:id/approve', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const existing = await (storage as any).getParticipationById?.(req.params.id) || null;
      if (!existing) return res.status(404).json({ message: "Application not found" });

      // Authorization: only the campaign's brand or an admin can accept
      const campaign = await storage.getCampaignById(existing.campaignId);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      const userType = (req as any).user?.userType;
      if (userType !== 'admin' && campaign.brandId !== userId) {
        return res.status(403).json({ message: "Only the brand that owns this campaign can accept applications" });
      }

      const wasAlreadyAccepted = existing.status === 'approved' || existing.status === 'submitted' || existing.status === 'completed';

      const participation = await storage.updateParticipation(req.params.id, {
        status: 'approved',
        reviewedAt: new Date(),
      });

      // Reserve a slot for the accepted influencer (do NOT pay yet)
      if (!wasAlreadyAccepted) {
        const newFilled = Math.min((campaign.filledSlots || 0) + 1, campaign.totalSlots || 999);
        await storage.updateCampaign(campaign.id, { filledSlots: newFilled } as any);
      }

      await storage.createNotification({
        userId: participation.userId,
        type: 'application_approved',
        title: 'You have been accepted! 🎉',
        content: `You've been accepted into "${campaign.title}". Submit proof of completion to receive your $${parseFloat(campaign.reward as any).toFixed(2)} payment.`,
        actionUrl: `/campaigns/${participation.campaignId}`,
        isRead: false,
      } as any);

      res.json({ ...participation, accepted: true, paymentReleased: false });
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

  // Campaign participation reviews — GET
  app.get('/api/participations/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const participation = await storage.getParticipationById(req.params.id);
      if (!participation) return res.status(404).json({ message: 'Participation not found' });
      const campaign = await storage.getCampaignById(participation.campaignId);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      const isParty = participation.userId === req.user.id || (campaign as any).brandId === req.user.id || req.user.userType === 'admin';
      if (!isParty) return res.status(403).json({ message: 'Forbidden' });
      const rows = await db.select().from(userReviews)
        .where(and(eq(userReviews.referenceType, 'campaign_participation'), eq(userReviews.referenceId, participation.id)))
        .orderBy(desc(userReviews.createdAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Campaign participation reviews — POST
  app.post('/api/participations/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const participation = await storage.getParticipationById(req.params.id);
      if (!participation) return res.status(404).json({ message: 'Participation not found' });
      if (participation.status !== 'completed') return res.status(400).json({ message: 'Reviews open after the participation is completed' });
      const campaign = await storage.getCampaignById(participation.campaignId);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      const brandId = (campaign as any).brandId;
      const creatorId = participation.userId;
      const isParty = req.user.id === brandId || req.user.id === creatorId;
      if (!isParty) return res.status(403).json({ message: 'Forbidden' });
      const rating = Number(req.body.rating);
      const comment = String(req.body.comment || '').trim();
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be from 1 to 5' });
      const existing = await db.select().from(userReviews)
        .where(and(eq(userReviews.referenceType, 'campaign_participation'), eq(userReviews.referenceId, participation.id), eq(userReviews.reviewerId, req.user.id)));
      if (existing.length) return res.status(400).json({ message: 'You already reviewed this' });
      const revieweeId = req.user.id === brandId ? creatorId : brandId;
      const [review] = await db.insert(userReviews).values({
        reviewerId: req.user.id,
        revieweeId,
        rating,
        comment,
        referenceType: 'campaign_participation',
        referenceId: participation.id,
      }).returning();
      const ratings = await db.select({ avg: sql<string>`AVG(${userReviews.rating})` }).from(userReviews).where(eq(userReviews.revieweeId, revieweeId));
      await db.update(users).set({ rating: String(Number(ratings[0]?.avg || 0).toFixed(2)), updatedAt: new Date() }).where(eq(users.id, revieweeId));
      res.json(review);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Campaign participation mediation request
  app.post('/api/participations/:id/request-mediation', isAuthenticated, async (req: any, res) => {
    try {
      const participation = await storage.getParticipationById(req.params.id);
      if (!participation) return res.status(404).json({ message: 'Participation not found' });
      const campaign = await storage.getCampaignById(participation.campaignId);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      const brandId = (campaign as any).brandId;
      const creatorId = participation.userId;
      const isParty = req.user.id === brandId || req.user.id === creatorId;
      if (!isParty) return res.status(403).json({ message: 'Forbidden' });
      const reason = String(req.body.reason || '').trim();
      const admin = await storage.getAdminUser();
      if (admin) {
        await storage.createNotification({
          userId: admin.id,
          type: 'mediation_request',
          title: '⚖️ Mediation Requested',
          content: `${req.user.firstName} requested mediation for campaign "${(campaign as any).title}". ${reason ? `Reason: ${reason}` : ''}`,
          actionUrl: `/admin/participations`,
          isRead: false,
        } as any);
      }
      await storage.createNotification({
        userId: req.user.id === brandId ? creatorId : brandId,
        type: 'mediation_request',
        title: '⚖️ Mediation Requested',
        content: `${req.user.firstName} has requested admin mediation for campaign "${(campaign as any).title}".`,
        actionUrl: `/campaigns/${participation.campaignId}`,
        isRead: false,
      } as any);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
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

  // Brand: aggregated influencer network with analytics
  app.get('/api/brand/influencer-network', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const network = await (storage as any).getBrandInfluencerNetwork(userId);
      res.json(network);
    } catch (error) {
      console.error("Error fetching brand influencer network:", error);
      res.status(500).json({ message: "Failed to fetch influencer network" });
    }
  });

  // User profile update endpoint for wallet addresses
  // (Duplicate PATCH /api/users/:userId/profile route removed —
  // see PATCH /api/users/:id/profile above which is the canonical handler.)

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
        paymentProof: req.file?.path || req.body.paymentProof,
        adminNotes: req.body.notes || req.body.adminNotes,
        timerExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        status: 'submitted'
      };

      const deposit = await storage.createPaymentDeposit(depositData);
      sendAdminActivityEmail({
        event: "payment",
        subject: `New wallet payment deposit: ${deposit.id}`,
        recipient: TASKDRIP_EMAILS.payments,
        fromEmail: TASKDRIP_EMAILS.payments,
        customer: {
          name: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
          email: req.user.email,
          phone: req.user.phoneNumber,
        },
        details: [
          { label: "Deposit ID", value: deposit.id },
          { label: "Campaign ID", value: deposit.campaignId },
          { label: "Amount", value: deposit.amount },
          { label: "Network", value: deposit.network },
          { label: "Transaction reference", value: deposit.transactionHash },
          { label: "Status", value: deposit.status },
        ],
      }).catch(() => {});
      res.status(201).json(deposit);
    } catch (error) {
      console.error("Error creating payment deposit:", error);
      res.status(500).json({ message: "Failed to create payment deposit" });
    }
  });



  // Admin user management routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users.map(({ password: _pw, twoFactorSecret: _tfs, ...u }: any) => u));
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
    } catch (error: any) {
      console.error("Error deleting user:", error);
      // Surface the actual DB constraint detail to aid diagnosis
      const detail = error?.detail || error?.message || "Failed to delete user";
      res.status(500).json({ message: "Failed to delete user", detail });
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

  // Admin grant role route
  app.patch('/api/admin/users/:id/role', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const admin = await storage.getUser(userId);
      if (!admin || admin.userType !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const validRoles = ['user', 'content_editor', 'moderator', 'store_manager', 'admin'];
      const { role } = req.body;
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updatedUser = await storage.updateUser(req.params.id, { role });
      const { password: _, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Error granting role:", error);
      res.status(500).json({ message: "Failed to grant role" });
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

  // Admin: get ALL blog posts including drafts
  app.get('/api/admin/blog', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (!canManageContent(adminUser)) return res.status(403).json({ message: 'Access denied' });
      const allPosts = typeof (storage as any).getAllBlogPostsAdmin === 'function'
        ? await (storage as any).getAllBlogPostsAdmin()
        : await storage.getAllBlogPosts();
      res.json(allPosts);
    } catch (error) {
      console.error('Error fetching admin blog posts:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  app.post('/api/admin/blog', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      if (!canManageContent(adminUser)) {
        return res.status(403).json({ message: 'Access denied. Content editor privileges required.' });
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
      if (!canManageContent(adminUser)) return res.status(403).json({ message: 'Access denied' });
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
      const allPurchases = await storage.getAllPurchases();
      const activeCampaigns = allCampaigns.filter((c: any) => c.isActive && c.status === 'active');
      // Escrow (campaign) revenue — verified payments only
      const escrowRevenue = allEscrow
        .filter((e: any) => e.status === 'verified')
        .reduce((sum: number, e: any) => sum + parseFloat(e.amount || '0'), 0);
      // Shop revenue — paid or delivered orders
      const shopRevenue = (allPurchases as any[])
        .filter((p: any) => p.status === 'paid' || p.status === 'delivered')
        .reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || p.amount || '0'), 0);
      // Course enrollment revenue — active enrollments
      const allEnrollmentRows = await db
        .select({ id: courseEnrollments.id, status: courseEnrollments.status, paymentStatus: courseEnrollments.paymentStatus, courseId: courseEnrollments.courseId })
        .from(courseEnrollments);
      let courseRevenue = 0;
      for (const e of (allEnrollmentRows as any[])) {
        if (e.status === 'active' || e.paymentStatus === 'approved') {
          const course = await db.select({ price: courses.price }).from(courses).where(eq(courses.id, e.courseId)).limit(1);
          courseRevenue += parseFloat((course[0] as any)?.price || '0');
        }
      }
      const totalRevenue = escrowRevenue + shopRevenue + courseRevenue;
      const pendingEscrow = allEscrow.filter((e: any) => e.status === 'verifying' || e.status === 'submitted');
      const pendingShop = (allPurchases as any[]).filter((p: any) => p.status === 'pending');
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
        escrowRevenue: escrowRevenue.toFixed(2),
        shopRevenue: shopRevenue.toFixed(2),
        courseRevenue: courseRevenue.toFixed(2),
        totalRewardsDistributed: totalRewardsDistributed.toFixed(2),
        pendingPayments: pendingEscrow.length + pendingShop.length,
        verifiedPayments: allEscrow.filter((e: any) => e.status === 'verified').length,
        totalTransactions: allTransactions.length,
        totalShopOrders: (allPurchases as any[]).length,
        paidShopOrders: (allPurchases as any[]).filter((p: any) => p.status === 'paid' || p.status === 'delivered').length,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // ── Admin: aggregate platform funds received from all payment types ──
  app.get('/api/admin/platform-funds', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Access denied' });

      // Escrow (campaign) funds — verified
      const allEscrow = await (storage as any).getAllEscrowPayments();
      const escrowTotal = allEscrow
        .filter((e: any) => e.status === 'verified')
        .reduce((s: number, e: any) => s + parseFloat(e.amount || '0'), 0);

      // Shop order funds — paid or delivered
      const allPurchases = await storage.getAllPurchases();
      const shopTotal = (allPurchases as any[])
        .filter((p: any) => p.status === 'paid' || p.status === 'delivered')
        .reduce((s: number, p: any) => s + parseFloat(p.totalAmount || '0'), 0);

      // Course enrollment funds — active enrollments joined with course price
      const allEnrollments = await db
        .select({ id: courseEnrollments.id, status: courseEnrollments.status, paymentStatus: courseEnrollments.paymentStatus, courseId: courseEnrollments.courseId })
        .from(courseEnrollments);
      const approvedEnrollmentIds = (allEnrollments as any[])
        .filter((e: any) => e.status === 'active' || e.paymentStatus === 'approved');
      let courseTotal = 0;
      for (const e of approvedEnrollmentIds) {
        const course = await db.select({ price: courses.price }).from(courses).where(eq(courses.id, e.courseId)).limit(1);
        courseTotal += parseFloat((course[0] as any)?.price || '0');
      }

      // Subscription funds — active subscriptions with an amount
      const allSubs = await db.select({ amount: subscriptions.amount, status: subscriptions.status }).from(subscriptions);
      const subTotal = (allSubs as any[])
        .filter((s: any) => s.status === 'active')
        .reduce((sum: number, s: any) => sum + parseFloat(s.amount || '0'), 0);

      const grandTotal = escrowTotal + shopTotal + courseTotal + subTotal;

      res.json({
        total: grandTotal.toFixed(2),
        escrow: escrowTotal.toFixed(2),
        shop: shopTotal.toFixed(2),
        courses: courseTotal.toFixed(2),
        subscriptions: subTotal.toFixed(2),
      });
    } catch (error) {
      console.error('Error fetching platform funds:', error);
      res.status(500).json({ message: 'Failed to fetch platform funds' });
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

  // Unified payments feed — every payment-bearing event in one stream, with users linked.
  // Sources: generic transactions, P2P transactions, shop purchases, escrow payments,
  // payment deposits, and subscriptions.
  app.get('/api/admin/payments-unified', isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });

      const [txs, p2ps, purchaseRows, escrows, depositRows, subRows, hireRows, allUsers] = await Promise.all([
        db.select().from(transactions).orderBy(desc(transactions.createdAt)),
        db.select().from(p2pTransactions).orderBy(desc(p2pTransactions.createdAt)),
        db.select().from(purchases).orderBy(desc(purchases.createdAt)),
        db.select().from(escrowPayments).orderBy(desc(escrowPayments.createdAt)),
        db.select().from(paymentDeposits).orderBy(desc(paymentDeposits.createdAt)),
        db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)),
        db.select().from(directHireOffers).orderBy(desc(directHireOffers.createdAt)),
        db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, profileImageUrl: users.profileImageUrl, userType: users.userType, companyName: users.companyName }).from(users),
      ]);

      const userMap = new Map(allUsers.map((u: any) => [u.id, u]));
      const u = (id: string | null | undefined) => (id ? userMap.get(id) || null : null);

      const unified: any[] = [];

      for (const t of txs as any[]) {
        unified.push({
          id: `tx_${t.id}`, source: 'transaction', kind: t.type || 'transaction',
          amount: Number(t.amount || 0), currency: 'USD', status: t.status,
          createdAt: t.createdAt, reference: t.transactionHash || t.referenceId || null,
          method: t.network || t.referenceType || null,
          fromUser: u(t.userId), toUser: null, approvedBy: u(t.approvedBy),
          description: t.description || null,
        });
      }
      for (const t of p2ps as any[]) {
        unified.push({
          id: `p2p_${t.id}`, source: 'p2p', kind: t.transactionType || 'p2p_trade',
          amount: Number(t.totalAmount || t.amount || 0), currency: t.currency || 'USD',
          status: t.status, createdAt: t.createdAt,
          reference: t.id, method: t.sellerCryptoWallet ? 'crypto' : 'p2p',
          fee: Number(t.fee || 0),
          fromUser: u(t.buyerId), toUser: u(t.sellerId), approvedBy: u(t.adminId),
          description: `P2P ${t.transactionType || ''} • listing ${t.listingId}`,
        });
      }
      for (const t of purchaseRows as any[]) {
        const isPendingPurchase = ['pending', 'pending_payment'].includes(String(t.status));
        unified.push({
          id: `pur_${t.id}`, rawId: t.id, source: 'purchase', kind: 'shop_purchase',
          amount: Number(t.totalAmount || t.amount || 0), currency: 'USD', status: t.status,
          createdAt: t.createdAt, reference: t.transactionHash || t.id,
          method: t.paymentMethod || null,
          fromUser: u(t.userId), toUser: null, approvedBy: null,
          description: `Shop purchase`,
          proofImageUrl: t.paymentProof || null,
          adminNotes: t.adminNotes || null,
          reviewable: isPendingPurchase,
          productId: t.productId,
        });
      }
      for (const t of escrows as any[]) {
        unified.push({
          id: `esc_${t.id}`, rawId: t.id, source: 'escrow', kind: 'campaign_escrow',
          amount: Number(t.amount || 0), currency: 'USD', status: t.status,
          createdAt: t.createdAt, reference: t.transactionHash || t.id,
          method: t.network || null,
          fromUser: u(t.brandId), toUser: null, approvedBy: u(t.verifiedBy),
          description: `Campaign escrow • campaign ${t.campaignId || ''}`,
          proofImageUrl: t.paymentScreenshot || t.proofImageUrl || null,
          adminNotes: t.adminNotes || null,
          reviewable: true,
        });
      }
      for (const t of depositRows as any[]) {
        unified.push({
          id: `dep_${t.id}`, rawId: t.id, source: 'deposit', kind: 'wallet_deposit',
          amount: Number(t.amount || 0), currency: 'USD', status: t.status,
          createdAt: t.createdAt, reference: t.transactionHash || t.id,
          method: t.network || null,
          fromUser: u(t.brandId), toUser: null, approvedBy: u(t.approvedBy),
          description: t.adminNotes || 'Wallet deposit',
          proofImageUrl: t.proofImageUrl || t.paymentScreenshot || null,
          adminNotes: t.adminNotes || null,
          reviewable: true,
        });
      }
      for (const t of subRows as any[]) {
        unified.push({
          id: `sub_${t.id}`, rawId: t.id, source: 'subscription', kind: t.plan || 'subscription',
          amount: Number(t.amount || 0), currency: 'USD', status: t.status,
          createdAt: t.createdAt, reference: t.transactionHash || t.id,
          method: t.paymentMethodLabel || t.network || null,
          fromUser: u(t.userId), toUser: null, approvedBy: null,
          description: `Subscription ${t.plan || ''}`,
          proofImageUrl: t.proofImageUrl || t.paymentScreenshot || null,
          adminNotes: t.adminNotes || null,
          reviewable: true,
        });
      }

      // Direct hire / hire-developer requests
      for (const t of hireRows as any[]) {
        const hireStatus = t.status === 'pending_payment' ? 'pending'
          : t.status === 'active' ? 'active'
          : t.status === 'completed' ? 'completed'
          : t.status === 'accepted' ? 'submitted'
          : t.status || 'pending';
        const isPendingHire = t.status === 'pending_payment';
        unified.push({
          id: `hire_${t.id}`, rawId: t.id, source: 'direct_hire', kind: t.isDevHire ? 'hire_developer' : 'direct_hire',
          amount: Number(t.agreedBudget || t.budget || 0), currency: 'USD', status: hireStatus,
          createdAt: t.createdAt, reference: t.transactionHash || t.invoiceNumber || t.id,
          method: t.paymentNetwork || null,
          fromUser: u(t.brandId), toUser: u(t.influencerId), approvedBy: null,
          description: t.title || 'Hire Developer Request',
          proofImageUrl: t.paymentProof || null,
          adminNotes: t.adminNote || null,
          reviewable: isPendingHire,
          hireTitle: t.title,
          invoiceNumber: t.invoiceNumber,
          invoiceDueDate: t.invoiceDueDate,
        });
      }

      // Course enrollments — appear in the Courses tab
      const enrollmentRows = await db
        .select({
          id: courseEnrollments.id,
          courseId: courseEnrollments.courseId,
          userId: courseEnrollments.userId,
          status: courseEnrollments.status,
          amount: courseEnrollments.amount,
          paymentMethod: courseEnrollments.paymentMethod,
          paymentProof: courseEnrollments.paymentProof,
          transactionHash: courseEnrollments.transactionHash,
          isPaid: courseEnrollments.isPaid,
          approvedBy: courseEnrollments.approvedBy,
          approvedAt: courseEnrollments.approvedAt,
          createdAt: courseEnrollments.createdAt,
          courseTitle: courses.title,
        })
        .from(courseEnrollments)
        .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
        .orderBy(desc(courseEnrollments.createdAt));

      for (const t of enrollmentRows as any[]) {
        const enrollStatus = t.isPaid && t.status === 'active' ? 'paid'
          : t.status === 'pending_payment' ? 'pending'
          : t.status === 'active' ? 'active'
          : t.status || 'pending';
        unified.push({
          id: `enr_${t.id}`, rawId: t.id, source: 'course_enrollment', kind: 'course_purchase',
          amount: Number(t.amount || 0), currency: 'USD', status: enrollStatus,
          createdAt: t.createdAt, reference: t.transactionHash || t.id,
          method: t.paymentMethod || null,
          fromUser: u(t.userId), toUser: null, approvedBy: u(t.approvedBy),
          description: `Course enrollment — ${t.courseTitle || t.courseId}`,
          proofImageUrl: t.paymentProof || null,
          adminNotes: null,
          reviewable: enrollStatus === 'pending',
          courseId: t.courseId,
          courseTitle: t.courseTitle,
        });
      }

      unified.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const totals = unified.reduce((acc, t) => {
        acc.count++;
        acc.gross += Number(t.amount) || 0;
        if (['completed', 'released', 'paid', 'approved', 'active'].includes(String(t.status))) acc.settled += Number(t.amount) || 0;
        if (['pending', 'funded', 'delivered', 'submitted'].includes(String(t.status))) acc.pending += Number(t.amount) || 0;
        acc.bySource[t.source] = (acc.bySource[t.source] || 0) + (Number(t.amount) || 0);
        return acc;
      }, { count: 0, gross: 0, settled: 0, pending: 0, bySource: {} as Record<string, number> });

      res.json({ items: unified, totals });
    } catch (error) {
      console.error('Error fetching unified payments:', error);
      res.status(500).json({ message: 'Failed to fetch unified payments' });
    }
  });

  // ── Payment Analytics Dashboard — per-category totals + drilldown records ──
  app.get('/api/admin/payments-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });

      const admin = await storage.getAdminUser();

      // Fetch all sources in parallel — each query catches individually so one
      // missing table/column never kills the whole analytics response.
      const safeSelect = async (q: Promise<any[]>) => q.catch((e) => { console.error('[analytics safeSelect]', e?.message || e); return [] as any[]; });
      const [
        subRows, purchaseRows, enrollRows, hireRows,
        escrowRows, p2pRows, payoutRows, allUsers, allCourses, allProducts,
      ] = await Promise.all([
        safeSelect(db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt))),
        safeSelect(db.select().from(purchases).orderBy(desc(purchases.createdAt))),
        safeSelect(db.select().from(courseEnrollments).orderBy(desc(courseEnrollments.createdAt))),
        safeSelect(db.select().from(directHireOffers).orderBy(desc(directHireOffers.createdAt))),
        safeSelect(db.select().from(escrowPayments).orderBy(desc(escrowPayments.createdAt))),
        safeSelect(db.select().from(p2pTransactions).orderBy(desc(p2pTransactions.createdAt))),
        safeSelect(db.select().from(payoutRequests).orderBy(desc(payoutRequests.createdAt))),
        safeSelect(db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, username: users.username, profileImageUrl: users.profileImageUrl, userType: users.userType, companyName: users.companyName }).from(users)),
        safeSelect(db.select({ id: courses.id, title: courses.title }).from(courses)),
        safeSelect(db.select({ id: shopProducts.id, title: shopProducts.title, price: shopProducts.price, featuredImage: shopProducts.featuredImage }).from(shopProducts)),
      ]);

      const userMap = new Map(allUsers.map((u: any) => [u.id, u]));
      const courseMap = new Map(allCourses.map((c: any) => [c.id, c]));
      const productMap = new Map(allProducts.map((p: any) => [p.id, p]));
      const u = (id: string | null | undefined) => (id ? userMap.get(id) || null : null);

      const summarise = (rows: any[], amountFn: (r: any) => number, statusFn: (r: any) => string) => {
        let total = 0, pending = 0, completed = 0, count = 0;
        for (const r of rows) {
          const amt = amountFn(r);
          const st = statusFn(r);
          total += amt;
          count++;
          if (['active', 'approved', 'completed', 'paid', 'released', 'verified', 'delivered'].includes(st)) completed += amt;
          else pending += amt;
        }
        return { total: +total.toFixed(2), pending: +pending.toFixed(2), completed: +completed.toFixed(2), count };
      };

      // ── 1. Subscriptions ───────────────────────────────────────────────────
      const subscriptionRecords = (subRows as any[]).map(r => ({
        id: r.id, amount: +r.amount, status: r.status, createdAt: r.createdAt,
        plan: r.plan, network: r.network || r.paymentMethodLabel,
        transactionHash: r.transactionHash,
        user: u(r.userId),
      }));

      // ── 2. Shop Orders ─────────────────────────────────────────────────────
      const shopRecords = (purchaseRows as any[]).map(r => ({
        id: r.id, amount: +r.totalAmount || +r.amount, status: r.status, createdAt: r.createdAt,
        paymentMethod: r.paymentMethod, transactionHash: r.transactionHash,
        product: productMap.get(r.productId) || { title: 'Unknown Product' },
        user: u(r.userId),
      }));

      // ── 3. Course Enrollments ──────────────────────────────────────────────
      const courseRecords = (enrollRows as any[]).map(r => {
        const st = r.isPaid && r.status === 'active' ? 'paid' : r.status === 'pending_payment' ? 'pending' : r.status || 'pending';
        return {
          id: r.id, amount: +r.amount || 0, status: st, createdAt: r.createdAt,
          paymentMethod: r.paymentMethod, transactionHash: r.transactionHash,
          course: courseMap.get(r.courseId) || { title: 'Unknown Course' },
          user: u(r.userId),
        };
      });

      // Determine admin IDs reliably from allUsers (avoids null adminId)
      const adminIdSet = new Set(
        (allUsers as any[]).filter((u: any) => u.userType === 'admin').map((u: any) => u.id)
      );
      if (admin?.id) adminIdSet.add(admin.id);

      // ── 4. Hire Developer (user→admin) ─────────────────────────────────────
      const hireDevRecords = (hireRows as any[])
        .filter((r: any) => adminIdSet.has(r.influencerId))
        .map(r => ({
          id: r.id, amount: +(r.agreedBudget || r.budget || 0), status: r.status, createdAt: r.createdAt,
          title: r.title, transactionHash: r.transactionHash,
          agreedBudget: r.agreedBudget, invoiceNumber: r.invoiceNumber,
          user: u(r.brandId),
        }));

      // ── 5. Direct Hires (brand→influencer) ────────────────────────────────
      const directHireRecords = (hireRows as any[])
        .filter((r: any) => !adminIdSet.has(r.influencerId))
        .map(r => ({
          id: r.id, amount: +r.budget, status: r.status, createdAt: r.createdAt,
          title: r.title, transactionHash: r.transactionHash,
          brand: u(r.brandId), influencer: u(r.influencerId),
        }));

      // ── 6. Campaign Escrow ─────────────────────────────────────────────────
      const escrowRecords = (escrowRows as any[]).map(r => ({
        id: r.id, amount: +r.amount, status: r.status, createdAt: r.createdAt,
        network: r.network, transactionHash: r.transactionHash,
        campaignId: r.campaignId, user: u(r.brandId),
      }));

      // ── 7. Payout Requests ────────────────────────────────────────────────
      const payoutRecords = (payoutRows as any[]).map(r => ({
        id: r.id, amount: +r.amount, status: r.status, createdAt: r.createdAt,
        network: r.network, walletAddress: r.walletAddress, transactionHash: r.transactionHash,
        user: u(r.userId),
      }));

      const categories = {
        subscriptions: { ...summarise(subscriptionRecords, r => r.amount, r => r.status), records: subscriptionRecords },
        shopOrders: { ...summarise(shopRecords, r => r.amount, r => r.status), records: shopRecords },
        courseEnrollments: { ...summarise(courseRecords, r => r.amount, r => r.status), records: courseRecords },
        hireDeveloper: { ...summarise(hireDevRecords, r => r.amount, r => r.status), records: hireDevRecords },
        directHires: { ...summarise(directHireRecords, r => r.amount, r => r.status), records: directHireRecords },
        campaignEscrow: { ...summarise(escrowRecords, r => r.amount, r => r.status), records: escrowRecords },
        payouts: { ...summarise(payoutRecords, r => r.amount, r => r.status), records: payoutRecords },
      };

      const grandTotal = Object.values(categories).reduce((s, c) => s + c.total, 0);

      res.json({ categories, grandTotal: +grandTotal.toFixed(2) });
    } catch (error) {
      console.error('Error fetching payments analytics:', error);
      res.status(500).json({ message: 'Failed to fetch payments analytics' });
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

  // Instant wallet-to-wallet tip (deducts sender funds balance, credits recipient)
  app.post('/api/users/:id/tip/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.id;
      const recipientId = req.params.id;
      if (senderId === recipientId) return res.status(400).json({ message: "Cannot tip yourself" });

      const recipient = await storage.getUser(recipientId);
      if (!recipient) return res.status(404).json({ message: "User not found" });

      const { amount, postId } = req.body;
      const tipAmount = parseFloat(amount);
      if (!tipAmount || tipAmount <= 0) return res.status(400).json({ message: "Invalid tip amount" });

      const sender = await storage.getUser(senderId);
      if (!sender) return res.status(404).json({ message: "Sender not found" });
      const senderBalance = parseFloat((sender as any).availableBalance || "0");
      if (senderBalance < tipAmount) {
        return res.status(400).json({ message: "Insufficient funds balance", balance: senderBalance });
      }

      await storage.updateUserBalance(senderId, tipAmount, 'subtract');
      await storage.updateUserBalance(recipientId, tipAmount, 'add');

      await storage.createTransaction({
        userId: senderId,
        type: 'platform_tip',
        amount: tipAmount.toString(),
        description: `Tip sent to ${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
        status: 'completed',
        processedAt: new Date(),
        referenceType: 'funds_tip',
        referenceId: recipientId,
      } as any);

      await storage.createTransaction({
        userId: recipientId,
        type: 'platform_tip',
        amount: tipAmount.toString(),
        description: `Tip received from ${sender.firstName || ''} ${sender.lastName || ''}`.trim(),
        status: 'completed',
        processedAt: new Date(),
        referenceType: 'funds_tip',
        referenceId: senderId,
      } as any);

      await storage.addPostTip(postId || "", tipAmount).catch(() => undefined);

      await storage.createNotification({
        userId: recipientId,
        type: 'platform_tip',
        title: 'You received a tip!',
        content: `${sender.firstName || 'Someone'} sent you a $${tipAmount.toFixed(2)} tip.`,
        actionUrl: '/wallet',
      } as any);

      const updatedSender = await storage.getUser(senderId);
      res.json({
        success: true,
        message: `$${tipAmount.toFixed(2)} tip sent instantly`,
        newSenderBalance: (updatedSender as any)?.availableBalance || "0",
      });
    } catch (error) {
      console.error("Error processing wallet tip:", error);
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
      const adminUser = await storage.getUser((req.user as any).id);
      if (!canManageContent(adminUser)) return res.status(403).json({ message: 'Access denied' });
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
      const {
        productId,
        amount,
        currency,
        network,
        paymentProof,
        transactionHash,
        referralCode,
        selectedAddons: rawAddons,
        planId,
      } = req.body;

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const product = await storage.getShopProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const available = ((product as any).serviceAddons as any[]) || [];

      // Plan mode: a single tier (e.g. ?plan=plan-whitelabel) was selected.
      // The plan price IS the total — it is not stacked on top of the base price.
      if (planId) {
        const plan = available.find((a: any) => a.id === planId);
        if (!plan) {
          return res.status(400).json({ message: "Selected plan not found" });
        }
        const planPrice = Number(plan.price) || 0;
        const submittedTotal = parseFloat(amount);
        if (!product.isFree || planPrice > 0) {
          if (!paymentProof || !paymentProof.trim()) {
            return res.status(400).json({ message: "Payment proof is required for paid products" });
          }
          if (Math.abs(submittedTotal - planPrice) > 0.01) {
            return res.status(400).json({ message: `Payment amount doesn't match expected total of ${planPrice.toFixed(2)}` });
          }
        }
        const purchase = await storage.createPurchase({
          userId: user.id,
          productId,
          amount: planPrice.toFixed(2),
          totalAmount: planPrice.toFixed(2),
          paymentMethod: (req.body.paymentMethod || network || "manual").slice(0, 100),
          selectedAddons: [{ id: plan.id, title: plan.title, price: planPrice }],
          addonsTotal: "0.00",
          paymentProof: paymentProof || "FREE_PRODUCT",
          transactionHash: transactionHash || "",
          referralCode: typeof referralCode === "string" ? referralCode.trim().slice(0, 100) || null : null,
          status: "pending",
        });
        if (!purchase) throw new Error("Purchase insert returned no result");
        const buyer = await storage.getUser(user.id).catch(() => null);
        if (buyer) {
          sendOrderConfirmationEmail({
            email: buyer.email,
            firstName: buyer.firstName || '',
            productName: `${product.title} — ${plan.title}`,
            amount: `${planPrice.toFixed(2)} ${currency || ""}`.trim(),
            isFree: false,
          }).catch(() => {});
          storage.createNotification({
            userId: buyer.id,
            type: 'order',
            title: `Order received: ${product.title}`,
            content: "Your payment is under review. Click to track your order status.",
            actionUrl: `/orders/${purchase.id}`,
            isRead: false,
            priority: 'high',
          }).catch(() => {});
          // Notify admin of new shop order
          storage.getAdminUser().then(adminUser => {
            if (adminUser) {
              storage.createNotification({
                userId: adminUser.id,
                type: 'order',
                title: `🛒 New Shop Order: ${product.title}`,
                content: `${buyer.firstName || 'A customer'} ${buyer.lastName || ''} placed an order. Review and approve in Admin → Shop tab.`,
                priority: 'high',
                actionUrl: '/admin-dashboard',
              }).catch(() => {});
            }
          }).catch(() => {});
          sendAdminActivityEmail({
            event: "shop_order",
            subject: `New shop order: ${product.title}`,
            recipient: TASKDRIP_EMAILS.payments,
            fromEmail: TASKDRIP_EMAILS.payments,
            customer: {
              name: `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim(),
              email: buyer.email,
              phone: buyer.phoneNumber || undefined,
            },
            details: [
              { label: "Product", value: `${product.title} — ${plan.title}` },
              { label: "Order ID", value: purchase.id },
              { label: "Amount", value: `${planPrice.toFixed(2)} ${currency || ""}`.trim() },
              { label: "Payment method", value: purchase.paymentMethod },
              { label: "Transaction reference", value: purchase.transactionHash || purchase.paymentProof },
              { label: "Status", value: purchase.status },
            ],
          }).catch(() => {});
        }
        return res.status(201).json(purchase);
      }

      // Validate & price addons server-side (trust the product, not the client)
      const incoming: any[] = Array.isArray(rawAddons) ? rawAddons : [];
      const trustedAddons: { id: string; title: string; price: number }[] = [];
      let addonsTotal = 0;
      for (const sel of incoming) {
        const match = available.find((a: any) => a.id === sel.id);
        if (match) {
          const price = Number(match.price) || 0;
          trustedAddons.push({ id: match.id, title: match.title, price });
          addonsTotal += price;
        }
      }

      const expectedTotal = parseFloat(product.price) + addonsTotal;
      const submittedTotal = parseFloat(amount);

      // Accept txHash as proof when no screenshot/text was provided
      const effectiveProof = (paymentProof || "").trim() || (transactionHash || "").trim();

      // Validate payment for non-free products (or when addons add cost)
      if (!product.isFree || addonsTotal > 0) {
        if (!effectiveProof) {
          return res.status(400).json({ message: "Please enter your transaction reference or upload a payment screenshot." });
        }
        if (Math.abs(submittedTotal - expectedTotal) > 0.01) {
          return res.status(400).json({ message: `Amount mismatch — expected $${expectedTotal.toFixed(2)}, got $${submittedTotal.toFixed(2)}. Please refresh and try again.` });
        }
      }

      const purchase = await storage.createPurchase({
        userId: user.id,
        productId,
        amount: expectedTotal.toFixed(2),
        totalAmount: expectedTotal.toFixed(2),
        paymentMethod: (req.body.paymentMethod || network || "manual").slice(0, 100),
        selectedAddons: trustedAddons,
        addonsTotal: addonsTotal.toFixed(2),
        paymentProof: paymentProof || "FREE_PRODUCT",
        transactionHash: transactionHash || "",
        referralCode: typeof referralCode === "string" ? referralCode.trim().slice(0, 100) || null : null,
        status: product.isFree && addonsTotal === 0 ? "approved" : "pending",
      });
      if (!purchase) throw new Error("Purchase insert returned no result");

      // Send order confirmation email + in-app notification (non-blocking)
      const buyer = await storage.getUser(user.id).catch(() => null);
      if (buyer) {
        sendOrderConfirmationEmail({
          email: buyer.email,
          firstName: buyer.firstName || '',
          productName: product.title,
          amount: `${amount || "0"} ${currency || ""}`.trim(),
          isFree: !!product.isFree,
        }).catch(() => {});
        storage.createNotification({
          userId: buyer.id,
          type: 'order',
          title: product.isFree ? `${product.title} is ready! 🎉` : `Order received: ${product.title}`,
          content: product.isFree
            ? 'Your free product is approved — click to access it now.'
            : "Your payment is under review. Click to track your order status.",
          actionUrl: `/orders/${purchase.id}`,
          isRead: false,
          priority: 'high',
        }).catch(() => {});
        // Notify admin of new paid shop order
        if (!product.isFree) {
          storage.getAdminUser().then(adminUser => {
            if (adminUser) {
              storage.createNotification({
                userId: adminUser.id,
                type: 'order',
                title: `🛒 New Shop Order: ${product.title}`,
                content: `${buyer.firstName || 'A customer'} ${buyer.lastName || ''} placed an order for $${purchase.amount}. Review and approve in Admin → Shop tab.`,
                priority: 'high',
                actionUrl: '/admin-dashboard',
              }).catch(() => {});
            }
          }).catch(() => {});
        }
        sendAdminActivityEmail({
          event: "shop_order",
          subject: `New shop order: ${product.title}`,
          recipient: TASKDRIP_EMAILS.payments,
          fromEmail: TASKDRIP_EMAILS.payments,
          customer: {
            name: `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim(),
            email: buyer.email,
            phone: buyer.phoneNumber || undefined,
          },
          details: [
            { label: "Product", value: product.title },
            { label: "Order ID", value: purchase.id },
            { label: "Amount", value: `${purchase.totalAmount} ${currency || ""}`.trim() },
            { label: "Payment method", value: purchase.paymentMethod },
            { label: "Transaction reference", value: purchase.transactionHash || purchase.paymentProof },
            { label: "Status", value: purchase.status },
          ],
        }).catch(() => {});
      }

      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: `Failed to create purchase: ${errMsg}` });
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
      if (!canManageStore(user)) {
        return res.status(403).json({ message: "Store manager access required" });
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
      if (!canManageStore(user)) {
        return res.status(403).json({ message: "Store manager access required" });
      }

      let serviceAddons: any[] = [];
      try {
        const raw = req.body.serviceAddons;
        if (Array.isArray(raw)) serviceAddons = raw;
        else if (typeof raw === 'string' && raw.trim()) serviceAddons = JSON.parse(raw);
      } catch { serviceAddons = []; }

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
        introVideoUrl: req.body.introVideoUrl || null,
        serviceAddons,
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
      if (!canManageStore(user)) {
        return res.status(403).json({ message: "Store manager access required" });
      }

      let serviceAddons: any[] = [];
      try {
        const raw = req.body.serviceAddons;
        if (Array.isArray(raw)) serviceAddons = raw;
        else if (typeof raw === 'string' && raw.trim()) serviceAddons = JSON.parse(raw);
      } catch { serviceAddons = []; }

      const updateData = {
        ...req.body,
        price: req.body.price ? req.body.price.toString() : undefined,
        originalPrice: req.body.originalPrice ? req.body.originalPrice.toString() : undefined,
        featuredImage: req.file ? `/uploads/${req.file.filename}` : req.body.featuredImage,
        galleryImages: Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [],
        features: Array.isArray(req.body.features) ? req.body.features : [],
        requirements: Array.isArray(req.body.requirements) ? req.body.requirements : [],
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        introVideoUrl: req.body.introVideoUrl || null,
        serviceAddons,
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
      if (!canManageStore(user)) {
        return res.status(403).json({ message: "Store manager access required" });
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
      if (user.userType !== 'admin' && user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchases = await storage.getAllPurchases();
      res.json(purchases);
    } catch (error: any) {
      console.error("Error fetching purchases:", error);
      // Return empty array for schema errors (missing table/column) so the
      // admin panel shows "No orders yet" instead of an error banner.
      if (error?.code === '42P01' || error?.code === '42703') return res.json([]);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // ── Public: get admin contact ID so anyone can message admin ─────────
  app.get('/api/admin/contact', async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, username, profile_image_url AS "profileImage" FROM users WHERE role = 'admin' LIMIT 1`
      );
      if (!result.rows[0]) return res.status(404).json({ message: 'Admin not found' });
      res.json(result.rows[0]);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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
      // Each storage call is wrapped with a 6s timeout + safe default so a single slow query
      // can't make the whole profile page hang forever.
      const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
        Promise.race<T>([
          p.catch(() => fallback),
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 6000)),
        ]);
      const [posts, reviews, followers, following, participations, socialLinks, portfolio] = await Promise.all([
        safe(storage.getUserPosts(req.params.id), [] as any[]),
        safe(storage.getUserReviews(req.params.id), [] as any[]),
        safe(storage.getUserFollowers(req.params.id), [] as any[]),
        safe(storage.getUserFollowing(req.params.id), [] as any[]),
        safe(storage.getUserParticipations(req.params.id), [] as any[]),
        safe(storage.getUserSocialLinks(req.params.id), [] as any[]),
        safe(storage.getUserPortfolio(req.params.id), [] as any[]),
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

  app.patch('/api/reviews/:reviewId', isAuthenticated, async (req: any, res) => {
    try {
      const { rating, comment } = req.body;
      if (rating !== undefined && (rating < 1 || rating > 5)) return res.status(400).json({ message: "Rating must be 1-5" });
      const updated = await storage.updateUserReview(req.params.reviewId, req.user.id, {
        rating: rating !== undefined ? parseInt(rating) : undefined,
        comment,
      });
      if (!updated) return res.status(404).json({ message: "Review not found or not yours" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.delete('/api/reviews/:reviewId', isAuthenticated, async (req: any, res) => {
    try {
      const ok = await storage.deleteUserReview(req.params.reviewId, req.user.id);
      if (!ok) return res.status(404).json({ message: "Review not found or not yours" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // ── Subscriptions ─────────────────────────────────────────────────
  const PLANS: Record<string, number> = {
    creator_monthly: 7,
    creator_yearly: Math.round(7 * 12 * 0.85 * 100) / 100, // 15% discount
    brand_monthly: 24,
    brand_yearly: Math.round(24 * 12 * 0.85 * 100) / 100,
    creator_3day: 2,
    creator_5day: 3,
    brand_3day: 6,
    brand_5day: 9,
  };

  const PLAN_DAYS: Record<string, number> = {
    creator_monthly: 30,
    creator_yearly: 365,
    brand_monthly: 30,
    brand_yearly: 365,
    creator_3day: 3,
    creator_5day: 5,
    brand_3day: 3,
    brand_5day: 5,
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
      const { plan, network, transactionHash, paymentMethodLabel } = req.body;
      const amount = PLANS[plan as keyof typeof PLANS];
      if (amount === undefined) return res.status(400).json({ message: "Invalid plan" });
      const periodDays = PLAN_DAYS[plan] || 30;

      const sub = await storage.createSubscription({
        userId: req.user.id,
        plan,
        amount,
        network: network || 'manual',
        transactionHash,
        paymentProof: req.file ? `/uploads/${req.file.filename}` : undefined,
        periodDays,
        paymentMethodLabel: paymentMethodLabel || undefined,
      });

      sendAdminActivityEmail({
        event: "payment",
        subject: `New subscription payment: ${plan}`,
        recipient: TASKDRIP_EMAILS.payments,
        fromEmail: TASKDRIP_EMAILS.payments,
        customer: {
          name: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
          email: req.user.email,
          phone: req.user.phoneNumber,
        },
        details: [
          { label: "Subscription ID", value: sub.id },
          { label: "Plan", value: plan },
          { label: "Amount", value: amount },
          { label: "Network", value: network || "manual" },
          { label: "Payment method", value: paymentMethodLabel },
          { label: "Transaction reference", value: transactionHash },
          { label: "Status", value: "pending verification" },
        ],
      }).catch(() => {});

      const periodLabel = periodDays === 3 ? '3-day' : periodDays === 5 ? '5-day' : periodDays === 365 ? 'yearly' : 'monthly';
      await storage.createNotification({
        userId: req.user.id,
        type: 'subscription',
        title: 'Subscription Submitted',
        content: `Your ${periodLabel} ${plan.includes('brand') ? 'Brand Pro' : 'Premium'} subscription payment is being verified. You'll be notified when it's approved.`,
        priority: 'normal',
        actionUrl: '/subscription',
      });

      // Notify admin of new subscription payment
      try {
        const adminForSub = await storage.getAdminUser();
        if (adminForSub) {
          const u = await storage.getUser(req.user.id);
          const label = plan.includes('brand') ? 'Brand Pro' : 'Premium';
          await storage.createNotification({
            userId: adminForSub.id,
            type: 'subscription',
            title: `💳 New Subscription Payment — ${label}`,
            content: `${u?.firstName || 'A user'} ${u?.lastName || ''} submitted a ${periodLabel} ${label} payment proof (${plan}). Review and approve in Admin → Subscriptions.`,
            priority: 'high',
            actionUrl: '/admin-dashboard',
          });
        }
      } catch (_e) { /* non-fatal */ }

      res.status(201).json(sub);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Admin: list all subscriptions with user enrichment (for review/approval)
  app.get('/api/admin/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const status = (req.query.status as string) || undefined;
      const list = await storage.getAllSubscriptions(status);
      const enriched = await Promise.all(list.map(async (s: any) => {
        const u = await storage.getUser(s.userId);
        return {
          ...s,
          user: u ? {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            userType: u.userType,
            profileImageUrl: (u as any).profileImageUrl,
          } : null,
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error listing subscriptions:', error);
      res.status(500).json({ message: 'Failed to list subscriptions' });
    }
  });

  // Admin: reject a subscription payment with optional reason + notify user
  app.patch('/api/admin/subscriptions/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { reason } = req.body || {};
      const sub = await storage.updateSubscriptionStatus(req.params.id, 'rejected');
      await storage.createNotification({
        userId: sub.userId,
        type: 'subscription_rejected',
        title: 'Subscription Payment Rejected',
        content: reason
          ? `Your subscription payment was rejected. Reason: ${reason}. Please re-submit a valid payment proof or contact support.`
          : `Your subscription payment was rejected. Please re-submit a valid payment proof or contact support.`,
        priority: 'high',
        actionUrl: '/subscription',
      });
      res.json(sub);
    } catch (error) {
      console.error('Error rejecting subscription:', error);
      res.status(500).json({ message: 'Failed to reject subscription' });
    }
  });

  // ── Content Reports ────────────────────────────────────────────────────────
  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contentType = String(req.body.contentType || "").trim();
      const contentId = String(req.body.contentId || "").trim();
      const reason = String(req.body.reason || "").trim();
      const details = String(req.body.details || "").trim() || null;
      if (!contentType || !contentId || !reason) {
        return res.status(400).json({ message: "contentType, contentId and reason are required" });
      }
      const [report] = await db.insert(contentReports).values({ reporterId: userId, contentType, contentId, reason, details }).returning();
      const reporter = await storage.getUser(userId).catch(() => null);
      sendAdminActivityEmail({
        event: "contact",
        subject: `New customer complaint/report: ${reason}`,
        recipient: TASKDRIP_EMAILS.support,
        fromEmail: TASKDRIP_EMAILS.support,
        customer: {
          name: `${reporter?.firstName || ""} ${reporter?.lastName || ""}`.trim(),
          email: reporter?.email,
          phone: reporter?.phoneNumber || undefined,
        },
        details: [
          { label: "Report ID", value: report.id },
          { label: "Content type", value: contentType },
          { label: "Content ID", value: contentId },
          { label: "Reason", value: reason },
          { label: "Details", value: details },
        ],
      }).catch(() => {});
      // Notify all admins
      try {
        const admins = await db.select().from(users).where(eq(users.userType, 'admin'));
        for (const a of admins) {
          await storage.createNotification({
            userId: a.id, type: 'content_report', title: 'New content report',
            content: `${contentType} ${contentId} reported for ${reason}`,
            actionUrl: '/admin', isRead: false, priority: 'high',
          } as any);
        }
      } catch {}
      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ message: 'Failed to submit report' });
    }
  });

  app.get('/api/admin/reports', isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const list = await db.select().from(contentReports).orderBy(desc(contentReports.createdAt));
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: 'Failed to list reports' });
    }
  });

  // ── Admin: Wallet Deposit approve/reject ───────────────────────────────────
  app.patch('/api/admin/payment-deposits/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const [dep] = await db.select().from(paymentDeposits).where(eq(paymentDeposits.id as any, req.params.id));
      if (!dep) return res.status(404).json({ message: 'Deposit not found' });
      const [updated] = await db.update(paymentDeposits).set({
        status: 'approved', approvedBy: req.user.id, approvedAt: new Date(), updatedAt: new Date(),
      }).where(eq(paymentDeposits.id as any, req.params.id)).returning();
      if (dep.brandId) {
        await storage.createNotification({
          userId: dep.brandId, type: 'deposit_approved', title: '✅ Deposit approved',
          content: `Your wallet deposit of $${dep.amount} has been approved.`,
          actionUrl: '/wallet', isRead: false,
        } as any);
      }
      res.json(updated);
    } catch (error) {
      console.error('Error approving deposit:', error);
      res.status(500).json({ message: 'Failed to approve deposit' });
    }
  });

  app.patch('/api/admin/payment-deposits/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const reason = String(req.body?.reason || "").trim();
      const [dep] = await db.select().from(paymentDeposits).where(eq(paymentDeposits.id as any, req.params.id));
      if (!dep) return res.status(404).json({ message: 'Deposit not found' });
      const [updated] = await db.update(paymentDeposits).set({
        status: 'rejected', adminNotes: reason || dep.adminNotes, updatedAt: new Date(),
      }).where(eq(paymentDeposits.id as any, req.params.id)).returning();
      if (dep.brandId) {
        await storage.createNotification({
          userId: dep.brandId, type: 'deposit_rejected', title: 'Deposit rejected',
          content: reason ? `Your deposit was rejected: ${reason}` : 'Your deposit was rejected.',
          actionUrl: '/wallet', isRead: false, priority: 'high',
        } as any);
      }
      res.json(updated);
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      res.status(500).json({ message: 'Failed to reject deposit' });
    }
  });

  // Admin: simple message-to-user helper for payment review
  app.post('/api/admin/users/:userId/message', isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { subject, content } = req.body || {};
      if (!content) return res.status(400).json({ message: 'Message content required' });
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId: req.params.userId,
        subject: subject || 'Message from Taskdrip team',
        content: String(content),
        messageType: 'admin',
      } as any);
      await storage.createNotification({
        userId: req.params.userId, type: 'message',
        title: subject || 'New message from Taskdrip',
        content: String(content).slice(0, 140),
        actionUrl: '/chat', relatedId: message.id, isRead: false,
      } as any);
      res.json({ ok: true, messageId: message.id });
    } catch (error) {
      console.error('Error sending admin message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Auto-expiry checker — called periodically or on demand
  app.post('/api/admin/subscriptions/check-expiry', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: "Admin only" });
      const stats = await runSubscriptionExpiryCheck();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to run expiry check" });
    }
  });

  app.patch('/api/admin/subscriptions/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: "Admin only" });

      // Load the actual subscription to get periodDays
      const existingSub = await storage.getUserSubscription(req.user.id);
      const subRecord = await db.select().from(subscriptions as any).where(eq(subscriptions.id as any, req.params.id)).limit(1);
      const subData = subRecord[0] as any;

      const { plan } = req.body;
      const now = new Date();
      const periodDays = subData?.periodDays || PLAN_DAYS[plan] || (plan?.includes('yearly') ? 365 : 30);
      const endDate = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

      const sub = await storage.updateSubscriptionStatus(req.params.id, 'active', now, endDate);

      // Update user subscription status
      await storage.updateUserProfile(sub.userId, {
        subscriptionStatus: 'active',
        subscriptionPlan: sub.plan,
        subscriptionEndDate: endDate,
        isVerified: true,
      });

      const planLabel = (sub.plan || '').includes('brand') ? 'Brand Pro' : 'Premium';
      const periodLabel = periodDays === 3 ? '3-day' : periodDays === 5 ? '5-day' : periodDays === 365 ? 'yearly' : 'monthly';
      await storage.createNotification({
        userId: sub.userId,
        type: 'subscription_approved',
        title: `${planLabel} Subscription Activated! ✅`,
        content: `Your ${periodLabel} ${planLabel} subscription is now active. Access expires on ${endDate.toLocaleString()}. Enjoy all premium features!`,
        priority: 'high',
        actionUrl: '/subscription',
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

  // ── Admin: Hire Developer Requests ────────────────────────────────
  app.get('/api/admin/hire-requests', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const offers = await storage.getAllDirectHireOffers();
      const enriched = await Promise.all(offers.map(async (o: any) => {
        const client = o.brandId ? await storage.getUser(o.brandId) : null;
        return {
          ...o,
          client: client ? {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            profileImageUrl: (client as any).profileImageUrl,
          } : null,
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error listing hire requests:', error);
      res.status(500).json({ message: 'Failed to list hire requests' });
    }
  });

  app.patch('/api/admin/hire-requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser?.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { status, adminNote } = req.body || {};
      const validStatuses = ['pending', 'accepted', 'in_progress', 'payment_window', 'completed', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
      const [updated] = await db.update(directHireOffers as any)
        .set({ status, updatedAt: new Date() } as any)
        .where(eq((directHireOffers as any).id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ message: 'Hire request not found' });
      // Notify client of status change
      if ((updated as any).brandId) {
        const statusLabels: Record<string, string> = {
          accepted: 'Accepted ✅', in_progress: 'In Progress 🔨', payment_window: 'Payment Required 💳',
          completed: 'Completed 🎉', rejected: 'Rejected ❌', cancelled: 'Cancelled',
        };
        const label = statusLabels[status];
        if (label) {
          storage.createNotification({
            userId: (updated as any).brandId,
            type: 'direct_hire',
            title: `Dev Project ${label}`,
            content: adminNote || `Your project "${(updated as any).title}" status has been updated to ${label}.`,
            priority: status === 'rejected' || status === 'completed' ? 'high' : 'normal',
            actionUrl: `/direct-hire/${req.params.id}`,
          }).catch(() => {});
        }
      }
      res.json(updated);
    } catch (error) {
      console.error('Error updating hire request status:', error);
      res.status(500).json({ message: 'Failed to update hire request status' });
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

  app.get('/api/ledger', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isAdmin = user.userType === 'admin';
      const transactionsList = isAdmin ? await storage.getAllTransactions() : await storage.getUserTransactions(req.user.id);
      const payoutRequestsList = isAdmin ? await storage.getAllPayoutRequests() : await storage.getUserPayoutRequests(req.user.id);
      const directHireOffersList = isAdmin
        ? await storage.getAllDirectHireOffers()
        : user.userType === 'brand'
          ? await storage.getDirectHireOffersByBrand(req.user.id)
          : await storage.getDirectHireOffersByInfluencer(req.user.id);

      const allEscrowPayments = await (storage as any).getAllEscrowPayments();
      const escrowPaymentsList = isAdmin
        ? allEscrowPayments
        : user.userType === 'brand'
          ? allEscrowPayments.filter((payment: any) => payment.brandId === req.user.id)
          : [];

      const enrichedEscrowPayments = await Promise.all(escrowPaymentsList.map(async (payment: any) => {
        const campaign = payment.campaignId ? await storage.getCampaignById(payment.campaignId) : null;
        const brand = isAdmin && payment.brandId ? await storage.getUser(payment.brandId) : null;
        return {
          ...payment,
          campaign: campaign ? {
            id: campaign.id,
            title: campaign.title,
            reward: campaign.reward,
            totalSlots: campaign.totalSlots,
            status: campaign.status,
          } : null,
          brand: brand ? {
            id: brand.id,
            firstName: brand.firstName,
            lastName: brand.lastName,
            companyName: brand.companyName,
            email: brand.email,
          } : null,
        };
      }));

      const { password, ...safeUser } = user as any;
      res.json({
        user: safeUser,
        transactions: transactionsList,
        payoutRequests: payoutRequestsList,
        directHireOffers: directHireOffersList,
        escrowPayments: enrichedEscrowPayments,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching ledger:", error);
      res.status(500).json({ message: "Failed to fetch ledger" });
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
      const privacy = (target as any).messagePrivacy || 'everyone';
      // Nobody: block all
      if (privacy === 'nobody') return res.json({ canMessage: false, reason: 'This user is not accepting direct messages.' });
      // Everyone: always allow
      if (privacy === 'everyone') return res.json({ canMessage: true, reason: null });
      // Followers: viewer must follow the target
      const viewerFollowsTarget = await storage.isFollowing(req.user.id, target.id);
      if (viewerFollowsTarget) return res.json({ canMessage: true, reason: null });
      // Accepted: check if viewer has any accepted participation in target's campaigns
      const viewerParticipations = await storage.getUserParticipations(req.user.id);
      const hasAccepted = viewerParticipations.some((p: any) => p.status === 'approved' || p.status === 'completed');
      if (hasAccepted) {
        // Check if any accepted participation is for a campaign owned by target
        const targetCampaigns = await storage.getCampaignsByBrand(target.id);
        const targetCampaignIds = new Set(targetCampaigns.map((c: any) => c.id));
        const acceptedInTargetCampaign = viewerParticipations.some(
          (p: any) => targetCampaignIds.has(p.campaignId) && (p.status === 'approved' || p.status === 'completed' || p.status === 'pending')
        );
        if (acceptedInTargetCampaign) return res.json({ canMessage: true, reason: null });
      }
      return res.json({ canMessage: false, reason: 'Follow this brand to send them a direct message.' });
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

  // ── Referral click tracking (logs clicks into referral_clicks table) ──
  app.post('/api/referrals/click/:code', async (req: any, res) => {
    try {
      const { code } = req.params;
      const { itemType = 'user', itemId } = req.body;
      const referrer = await storage.getUserByReferralCode(code);
      if (!referrer) return res.status(404).json({ message: "Invalid referral code" });
      // Log the click
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
      const userAgent = (req.headers['user-agent'] as string || '').slice(0, 200);
      await db.insert(referralClicks).values({
        referrerId: referrer.id,
        referralCode: code,
        itemType: itemType || 'user',
        itemId: itemId || null,
        ip: ip.slice(0, 64),
        userAgent,
      });
      res.json({ valid: true, referrerName: `${referrer.firstName} ${referrer.lastName}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // ── Referral analytics (clicks + commissions summary) ─────────────
  app.get('/api/referrals/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      // Clicks from referral_clicks
      const clickRows = await db.select().from(referralClicks).where(eq(referralClicks.referrerId, userId));
      const totalClicks = clickRows.length;
      const productClicks = clickRows.filter(c => c.itemType === 'product').length;
      const courseClicks = clickRows.filter(c => c.itemType === 'course').length;
      const userClicks = clickRows.filter(c => c.itemType === 'user').length;

      // Commissions from referral_commissions
      const commRows = await db.select().from(referralCommissions).where(eq(referralCommissions.referrerId, userId));
      const totalCommissions = commRows.reduce((s, r) => s + parseFloat(r.commissionAmount as string || '0'), 0);
      const pendingCommissions = commRows.filter(r => r.status === 'pending').reduce((s, r) => s + parseFloat(r.commissionAmount as string || '0'), 0);
      const paidCommissions = commRows.filter(r => r.status === 'paid').reduce((s, r) => s + parseFloat(r.commissionAmount as string || '0'), 0);

      const productEarnings = commRows.filter(r => r.itemType === 'product').reduce((s, r) => s + parseFloat(r.commissionAmount as string || '0'), 0);
      const courseEarnings = commRows.filter(r => r.itemType === 'course').reduce((s, r) => s + parseFloat(r.commissionAmount as string || '0'), 0);
      const inviteEarnings = commRows.filter(r => r.itemType === 'invite').reduce((s, r) => s + parseFloat(r.commissionAmount as string || '0'), 0);

      // Signups (referrals table)
      const signups = await storage.getReferralsByReferrer(userId);
      const conversions = signups.filter(r => r.status === 'converted' || r.status === 'rewarded').length;

      // Primary referral code — prefer username
      const primaryCode = user?.username || user?.referralCodeCreator || '';
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      res.json({
        totalClicks,
        productClicks,
        courseClicks,
        userClicks,
        totalSignups: signups.length,
        conversions,
        totalCommissions: totalCommissions.toFixed(2),
        pendingCommissions: pendingCommissions.toFixed(2),
        paidCommissions: paidCommissions.toFixed(2),
        productEarnings: productEarnings.toFixed(2),
        courseEarnings: courseEarnings.toFixed(2),
        inviteEarnings: inviteEarnings.toFixed(2),
        legacyBonusEarned: user?.referralBonusEarned || '0.00',
        primaryCode,
        baseUrl,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral analytics" });
    }
  });

  // ── Referral network / clan (referred users with profiles) ───────────
  app.get('/api/referrals/network', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const rawReferrals = await storage.getReferralsByReferrer(userId);

      // All commissions for this referrer
      const commRows = await db.select().from(referralCommissions)
        .where(eq(referralCommissions.referrerId, userId));

      // All clicks for this referrer
      const clickRows = await db.select().from(referralClicks)
        .where(eq(referralClicks.referrerId, userId));

      // Build click timeline: last 30 days
      const timeline: { date: string; clicks: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayClicks = clickRows.filter(c => {
          const cDate = new Date(c.createdAt as any).toISOString().split('T')[0];
          return cDate === key;
        }).length;
        timeline.push({ date: key, clicks: dayClicks });
      }

      // Enrich each referred user
      const members = (await Promise.all(rawReferrals.map(async (ref: any) => {
        const referred = await storage.getUser(ref.referredId);
        if (!referred) return null;
        const { password: _, ...safeUser } = referred as any;
        const isFollowing = await storage.isFollowing(userId, referred.id);
        const userComms = commRows.filter((c: any) => c.referredUserId === referred.id);
        const totalEarned = userComms.reduce((s, c) => s + parseFloat(c.commissionAmount as string || '0'), 0);
        const pendingEarned = userComms.filter((c: any) => c.status === 'pending')
          .reduce((s, c) => s + parseFloat(c.commissionAmount as string || '0'), 0);
        return {
          referralId: ref.id,
          joinedAt: ref.createdAt,
          status: ref.status,
          user: safeUser,
          isFollowing,
          stats: {
            totalEarned: totalEarned.toFixed(2),
            pendingEarned: pendingEarned.toFixed(2),
            commissionsCount: userComms.length,
            isActive: userComms.length > 0,
          }
        };
      }))).filter(Boolean);

      const totalClanEarnings = members.reduce((s, m) => s + parseFloat(m!.stats.totalEarned), 0);

      res.json({
        members,
        clanStats: {
          totalMembers: members.length,
          activeMembers: members.filter(m => m!.stats.isActive).length,
          totalClanEarnings: totalClanEarnings.toFixed(2),
        },
        timeline,
        totalClicks: clickRows.length,
      });
    } catch (error) {
      console.error('[referrals/network]', error);
      res.status(500).json({ message: "Failed to fetch referral network" });
    }
  });

  // ── Referral commissions list ──────────────────────────────────────
  app.get('/api/referrals/commissions', isAuthenticated, async (req: any, res) => {
    try {
      const rows = await db.select().from(referralCommissions)
        .where(eq(referralCommissions.referrerId, req.user.id))
        .orderBy(desc(referralCommissions.createdAt));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch commissions" });
    }
  });

  // ── Products for referral links (public catalog) ───────────────────
  app.get('/api/referrals/products', isAuthenticated, async (req: any, res) => {
    try {
      const products = await storage.getAllShopProducts();
      res.json(products.filter((p: any) => p.isActive !== false).map((p: any) => ({
        id: p.id, title: p.title, price: p.price, featuredImage: p.featuredImage, category: p.category,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // ── Courses for referral links ─────────────────────────────────────
  app.get('/api/referrals/courses', isAuthenticated, async (req: any, res) => {
    try {
      const allCourses = await storage.getAllCourses();
      res.json((allCourses || []).map((c: any) => ({
        id: c.id, title: c.title, price: c.price, thumbnail: c.thumbnail, category: c.category,
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // ── Referral payout request ───────────────────────────────────────
  app.post('/api/referrals/payout-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount, note } = req.body;
      const amountNum = parseFloat(amount);
      if (!amount || isNaN(amountNum) || amountNum < 10) {
        return res.status(400).json({ message: "Minimum payout amount is $10" });
      }
      // Check pending commissions balance
      const commRows = await db.select().from(referralCommissions)
        .where(eq(referralCommissions.referrerId, userId));
      const pendingTotal = commRows.filter(r => r.status === 'pending')
        .reduce((s, r) => s + parseFloat(r.commissionAmount as string || '0'), 0);
      const legacyBonus = parseFloat((await storage.getUser(userId))?.referralBonusEarned as string || '0');
      const available = pendingTotal + legacyBonus;
      if (amountNum > available) {
        return res.status(400).json({ message: `Insufficient balance. Available: $${available.toFixed(2)}` });
      }
      // Create a payout request in the payout_requests table
      const [payoutReq] = await db.insert(payoutRequests).values({
        userId,
        amount: amountNum.toFixed(2) as any,
        currency: 'USD',
        method: 'referral_payout',
        status: 'pending',
        notes: note ? `[Referral Payout] ${note}` : '[Referral Payout] Commission withdrawal',
      } as any).returning();
      // Notify admin
      const adminUsers = await db.select().from(users).where(eq(users.userType, 'admin')).limit(3);
      for (const admin of adminUsers) {
        await storage.createNotification({
          userId: admin.id,
          type: 'referral_payout',
          title: 'Referral Payout Request',
          content: `A user has requested a referral commission payout of $${amountNum.toFixed(2)}.`,
          actionUrl: '/admin#payout-requests',
        });
      }
      res.json({ success: true, payoutRequestId: payoutReq?.id, message: "Payout request submitted successfully" });
    } catch (error: any) {
      console.error('Referral payout request error:', error);
      res.status(500).json({ message: error?.message || "Failed to submit payout request" });
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

  // ── Admin referral commissions + payout requests ────────────────────
  app.get('/api/admin/referral-commissions', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: "Forbidden" });

      // All commission records with referrer name
      const referrerAlias = users;
      const commissions = await db.select({
        id: referralCommissions.id,
        referrerId: referralCommissions.referrerId,
        referrerFirstName: referrerAlias.firstName,
        referrerLastName: referrerAlias.lastName,
        referrerUsername: referrerAlias.username,
        referrerEmail: referrerAlias.email,
        itemType: referralCommissions.itemType,
        itemTitle: referralCommissions.itemTitle,
        saleAmount: referralCommissions.saleAmount,
        commissionRate: referralCommissions.commissionRate,
        commissionAmount: referralCommissions.commissionAmount,
        status: referralCommissions.status,
        createdAt: referralCommissions.createdAt,
      }).from(referralCommissions)
        .leftJoin(referrerAlias, eq(referralCommissions.referrerId, referrerAlias.id))
        .orderBy(desc(referralCommissions.createdAt))
        .limit(200);

      // Referral payout requests (identified by notes prefix)
      const referralPayouts = await db.select({
        id: payoutRequests.id,
        userId: payoutRequests.userId,
        amount: payoutRequests.amount,
        status: payoutRequests.status,
        adminNotes: payoutRequests.adminNotes,
        transactionHash: payoutRequests.transactionHash,
        createdAt: payoutRequests.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email,
      }).from(payoutRequests)
        .leftJoin(users, eq(payoutRequests.userId, users.id))
        .where(sql`${payoutRequests.status} IN ('pending', 'processing', 'completed', 'rejected') AND (${payoutRequests.adminNotes} LIKE '%Referral Payout%' OR (${payoutRequests.sourceType} = 'manual' AND ${payoutRequests.adminNotes} IS NULL))`)
        .orderBy(desc(payoutRequests.createdAt))
        .limit(100);

      // Filter to only those with the referral payout marker
      const filteredPayouts = referralPayouts.filter((p: any) =>
        !p.adminNotes || (p.adminNotes as string).includes('Referral Payout')
      );

      // Platform-wide totals
      const [totalComm] = await db.select({
        totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'pending' THEN ${referralCommissions.commissionAmount}::numeric ELSE 0 END), 0)`,
        totalApproved: sql<number>`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'approved' THEN ${referralCommissions.commissionAmount}::numeric ELSE 0 END), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'paid' THEN ${referralCommissions.commissionAmount}::numeric ELSE 0 END), 0)`,
        totalAll: sql<number>`COALESCE(SUM(${referralCommissions.commissionAmount}::numeric), 0)`,
      }).from(referralCommissions);

      res.json({ commissions, referralPayouts: filteredPayouts, totals: totalComm });
    } catch (error) {
      console.error('Admin referral commissions error:', error);
      res.status(500).json({ message: "Failed to fetch referral commissions" });
    }
  });

  // PATCH /api/admin/referral-commissions/:id — approve or mark paid
  app.patch('/api/admin/referral-commissions/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: "Forbidden" });
      const { id } = req.params;
      const { status } = req.body; // 'approved' | 'paid'
      if (!['approved', 'paid', 'pending'].includes(status)) return res.status(400).json({ message: "Invalid status" });
      const updateData: any = { status };
      if (status === 'approved') updateData.approvedAt = new Date();
      if (status === 'paid') updateData.paidAt = new Date();
      const [updated] = await db.update(referralCommissions).set(updateData).where(eq(referralCommissions.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Commission not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update commission" });
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

      // Batch-load all unique participant IDs in ONE query
      const allParticipantIds = [...new Set(
        Object.values(convMap).flatMap((conv: any) => Array.from(conv.participantIds as Set<string>))
      )];
      const allCampaignIds = [...new Set(
        Object.values(convMap).map((conv: any) => conv.campaignId).filter(Boolean)
      )];
      const [participantRows, campaignRows] = await Promise.all([
        allParticipantIds.length
          ? db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, userType: users.userType, companyName: users.companyName, profileImageUrl: users.profileImageUrl })
              .from(users).where(inArray(users.id, allParticipantIds))
          : [],
        allCampaignIds.length
          ? db.select({ id: campaigns.id, title: campaigns.title })
              .from(campaigns).where(inArray(campaigns.id, allCampaignIds))
          : [],
      ]);
      const participantMap: Record<string, any> = {};
      for (const u of participantRows) participantMap[u.id] = u;
      const campaignMap: Record<string, any> = {};
      for (const c of campaignRows) campaignMap[c.id] = c;

      const enriched = Object.values(convMap).map((conv: any) => ({
        id: conv.id,
        campaignId: conv.campaignId,
        campaign: conv.campaignId && campaignMap[conv.campaignId] ? { id: conv.campaignId, title: campaignMap[conv.campaignId].title } : null,
        participants: Array.from(conv.participantIds as Set<string>).map(pid => participantMap[pid]).filter(Boolean),
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
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

      // Batch-load all unique sender IDs in ONE query
      const senderIds = [...new Set(rawMessages.map(m => m.senderId))];
      const senderRows = senderIds.length
        ? await db.select({
            id: users.id, firstName: users.firstName, lastName: users.lastName,
            userType: users.userType, companyName: users.companyName, profileImageUrl: users.profileImageUrl,
          }).from(users).where(inArray(users.id, senderIds))
        : [];
      const senderMap: Record<string, any> = {};
      for (const s of senderRows) senderMap[s.id] = s;
      const enriched = rawMessages.map(msg => ({ ...msg, sender: senderMap[msg.senderId] || null }));

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

      // Batch mark-as-read in a single UPDATE instead of N sequential queries
      const unreadIds = rawMessages.filter(m => m.receiverId === userId && !m.isRead).map(m => m.id);
      if (unreadIds.length > 0) {
        await db.update(messages).set({ isRead: true }).where(inArray(messages.id, unreadIds));
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

  // ── Block / Unblock user ──────────────────────────────────────────
  // POST /api/users/:id/block  — block a user (current user becomes blocker)
  app.post('/api/users/:id/block', isAuthenticated, async (req: any, res) => {
    try {
      const blockerId = req.user.id;
      const blockedId = req.params.id;
      if (blockerId === blockedId) return res.status(400).json({ message: "Cannot block yourself" });
      const existing = await db.select().from(blockedUsers)
        .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)))
        .limit(1);
      if (existing.length > 0) return res.json({ blocked: true }); // already blocked
      await db.insert(blockedUsers).values({ blockerId, blockedId });
      res.json({ blocked: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to block user' });
    }
  });

  // DELETE /api/users/:id/block  — unblock a user
  app.delete('/api/users/:id/block', isAuthenticated, async (req: any, res) => {
    try {
      const blockerId = req.user.id;
      const blockedId = req.params.id;
      await db.delete(blockedUsers)
        .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)));
      res.json({ blocked: false });
    } catch (error) {
      res.status(500).json({ message: 'Failed to unblock user' });
    }
  });

  // GET /api/users/:id/block-status  — check if current user has blocked or is blocked by this user
  app.get('/api/users/:id/block-status', isAuthenticated, async (req: any, res) => {
    try {
      const myId = req.user.id;
      const otherId = req.params.id;
      const [iBlockedThem] = await db.select().from(blockedUsers)
        .where(and(eq(blockedUsers.blockerId, myId), eq(blockedUsers.blockedId, otherId)))
        .limit(1);
      const [theyBlockedMe] = await db.select().from(blockedUsers)
        .where(and(eq(blockedUsers.blockerId, otherId), eq(blockedUsers.blockedId, myId)))
        .limit(1);
      res.json({ iBlockedThem: !!iBlockedThem, theyBlockedMe: !!theyBlockedMe });
    } catch (error) {
      res.status(500).json({ message: 'Failed to check block status' });
    }
  });

  // ── Hire Developer: submit project request (with optional account creation) ──
  app.post('/api/hire-developer', async (req: any, res) => {
    try {
      const {
        title, description, projectType, budget, timeline, features,
        // contact details
        phone, whatsapp, telegram, preferredContact, contactEmail,
        // account creation (only when unauthenticated)
        firstName, lastName, email, password,
      } = req.body || {};

      if (!title || !description || !projectType || !budget) {
        return res.status(400).json({ message: "title, description, projectType, and budget are required" });
      }

      let userId: string | null = req.user?.id || null;

      // ── Create account if the user is not logged in ──
      if (!userId) {
        if (!firstName || !lastName || !email || !password) {
          return res.status(400).json({ message: "firstName, lastName, email, and password are required when not logged in" });
        }
        if (password.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        const existing = await storage.getUserByEmail(email);
        if (existing) {
          // Use existing account; authenticate below by returning its id
          userId = existing.id;
        } else {
          const hashed = await hashPassword(password);
          const newUser = await storage.createUser({
            id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            email: email.toLowerCase().trim(),
            password: hashed,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: email.toLowerCase().split("@")[0].replace(/[^a-z0-9_]/g, "_"),
            userType: "creator",
          } as any);
          userId = newUser.id;

          // Auto-login the newly created user
          await new Promise<void>((resolve, reject) => {
            req.login(newUser, (err: any) => (err ? reject(err) : resolve()));
          });
        }
      }

      const admin = await storage.getAdminUser();
      if (!admin) return res.status(404).json({ message: "No developer available" });

      const budgetLabels: Record<string, string> = {
        under_500: "Under $500", "500_2000": "$500 – $2,000", "2000_5000": "$2,000 – $5,000",
        "5000_10000": "$5,000 – $10,000", over_10000: "$10,000+", discuss: "Let's discuss",
      };
      const timelineLabels: Record<string, string> = {
        asap: "ASAP / Urgent", "1_2_weeks": "1 – 2 weeks", "1_month": "About 1 month",
        "2_3_months": "2 – 3 months", flexible: "Flexible",
      };
      const typeLabels: Record<string, string> = {
        web_app: "Web Application", ecommerce: "E-commerce Store", landing_page: "Landing Page / Website",
        dashboard: "Dashboard / Admin Panel", mobile_app: "Mobile App", api_backend: "API / Backend System",
        automation: "Automation / Bot", ai_integration: "AI / ChatGPT Integration",
        marketplace: "Marketplace Platform", other: "Other / Custom",
      };

      const contactLines: string[] = [];
      if (phone) contactLines.push(`📞 Phone/WhatsApp: ${phone}`);
      if (telegram) contactLines.push(`✈️ Telegram: @${telegram.replace(/^@/, '')}`);
      if (contactEmail) contactLines.push(`📧 Email: ${contactEmail}`);
      if (preferredContact) {
        const contactLabels: Record<string, string> = {
          in_app_chat: 'In-app Chat', whatsapp: 'WhatsApp', telegram: 'Telegram',
          email: 'Email', phone: 'Phone / Voice Call',
        };
        contactLines.push(`⭐ Preferred contact: ${contactLabels[preferredContact] || preferredContact}`);
      }

      const messageContent = `🚀 NEW PROJECT REQUEST\n\n` +
        `📌 Title: ${title}\n` +
        `🛠️ Type: ${typeLabels[projectType] || projectType}\n` +
        `💰 Budget: ${budgetLabels[budget] || budget}\n` +
        `⏱️ Timeline: ${timelineLabels[timeline] || timeline || "Not specified"}\n\n` +
        `📝 Description:\n${description}\n\n` +
        (features ? `✅ Key Features:\n${features}\n\n` : "") +
        (contactLines.length ? `📬 Contact Details:\n${contactLines.join('\n')}\n\n` : "") +
        `---\nSubmitted via Hire Developer form. Reply in this chat to continue the conversation.`;

      const message = await storage.createMessage({
        senderId: userId,
        receiverId: admin.id,
        subject: `Project Request: ${title}`,
        content: messageContent,
        messageType: 'general',
        attachments: [],
      });

      // Map budget range label to a representative number for the DB
      const budgetNumberMap: Record<string, string> = {
        under_500: "499", "500_2000": "1250", "2000_5000": "3500",
        "5000_10000": "7500", over_10000: "15000", discuss: "0",
      };
      const budgetNumber = budgetNumberMap[budget] ?? "0";

      // Create a direct_hire_offers record so the request appears in admin panel
      let devOffer: any = null;
      try {
        devOffer = await storage.createDirectHireOffer({
          brandId: userId,
          influencerId: admin.id,
          title,
          description: description + (features ? `\n\nKey Features:\n${features}` : "") +
            (contactLines.length ? `\n\nContact:\n${contactLines.join('\n')}` : ""),
          deliverables: features || null,
          budget: budgetNumber,
          status: "pending",
        } as any);
      } catch (e: any) {
        console.error("hire-offer insert failed:", e.message, e.code);
        // Surface the error so the caller knows something went wrong with record creation
        // but still continue — the message was already sent to admin above.
        // Do NOT return an error here; the message was delivered.
      }

      // Link the initial request as the first chat message on the offer,
      // so the user can see it (and reply) from their Dev Projects tab.
      if (devOffer?.id) {
        try {
          await storage.createMessage({
            senderId: userId,
            receiverId: admin.id,
            subject: `Project Request: ${title}`,
            content: messageContent,
            messageType: 'direct_hire',
            referenceType: 'direct_hire',
            referenceId: devOffer.id,
            attachments: [],
          } as any);
        } catch (e: any) {
          console.error("hire-offer initial chat message failed:", e);
        }
      }

      // Notify admin
      await storage.createNotification({
        userId: admin.id,
        type: 'message',
        title: `New dev project request: ${title}`,
        content: `${typeLabels[projectType] || projectType} · ${budgetLabels[budget] || budget}`,
        actionUrl: '/admin-dashboard',
        relatedId: message.id,
      });

      // Notify the user that their request was sent
      await storage.createNotification({
        userId: userId,
        type: 'message',
        title: 'Project request sent! 🚀',
        content: `Your request for "${title}" was submitted. The developer will reply shortly.`,
        actionUrl: '/messages',
        relatedId: message.id,
        isRead: false,
        priority: 'high',
      });

      sendAdminActivityEmail({
        event: "hire_request",
        subject: `New developer hire request: ${title}`,
        recipient: TASKDRIP_EMAILS.developer,
        fromEmail: TASKDRIP_EMAILS.developer,
        customer: {
          name: `${(await storage.getUser(userId))?.firstName || ""} ${(await storage.getUser(userId))?.lastName || ""}`.trim(),
          email: contactEmail || (await storage.getUser(userId))?.email || email,
          phone: phone || whatsapp,
        },
        details: [
          { label: "Request ID", value: devOffer?.id || message.id },
          { label: "Project", value: title },
          { label: "Type", value: typeLabels[projectType] || projectType },
          { label: "Budget", value: budgetLabels[budget] || budget },
          { label: "Timeline", value: timelineLabels[timeline] || timeline },
          { label: "Features", value: features },
          { label: "Preferred contact", value: preferredContact },
          { label: "Description", value: description },
          { label: "Status", value: devOffer?.status || "pending" },
        ],
      }).catch(() => {});

      res.status(201).json({ messageId: message.id, adminId: admin.id, offerId: devOffer?.id || null });
    } catch (error: any) {
      console.error('hire-developer error:', error);
      res.status(500).json({ message: error.message || "Failed to submit request" });
    }
  });

  // ── Hire Developer: get current user's dev project requests ──
  app.get('/api/hire-developer/my-requests', isAuthenticated, async (req: any, res) => {
    try {
      const admin = await storage.getAdminUser();
      if (!admin) return res.json([]);
      // Dev project requests are stored as direct_hire_offers where brandId=user and influencerId=admin
      const allSent = await storage.getDirectHireOffersByBrand(req.user.id);
      const devRequests = allSent.filter((o: any) => o.influencerId === admin.id);
      res.json(devRequests);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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

  // ── BreedSkool Tech Training Registration Routes ───────────────────────────

  // Public: get course pricing
  app.get('/api/breedskool/pricing', async (req, res) => {
    try {
      const { mode } = req.query as { mode?: string };
      let rows = await db.select().from(breedskoolCoursePricing).where(eq(breedskoolCoursePricing.isActive, true));
      if (mode) {
        rows = rows.filter((r: any) => (r.deliveryMode || '').toLowerCase() === mode.toLowerCase()
          || (r.courseKey || '').toLowerCase().includes(mode.toLowerCase())
          || (r.label || '').toLowerCase().includes(mode.toLowerCase()));
      }
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Public: register for a course — creates a platform account + auto-logs the student in
  app.post('/api/breedskool/register', upload.single('paymentProof'), async (req: any, res, next) => {
    try {
      const {
        fullName, email, password, phone, location,
        selectedCourseKey, selectedCourseTitle,
        amountNgn, paymentOption, paymentMethod,
        transactionRef, currencyUsed, amountUsd, notes,
        deliveryMode, childName, childAge, parentName, homeAddress,
      } = req.body;

      // For onsite registrations, only name/email/phone are required (no account creation needed)
      const isOnsiteContactOnly = (deliveryMode === 'onsite') && !password;
      if (!fullName || !email || !phone) {
        return res.status(400).json({ message: 'Full name, email, and phone are required.' });
      }
      if (!selectedCourseKey && !isOnsiteContactOnly) {
        return res.status(400).json({ message: 'Course selection is required.' });
      }
      if (!isOnsiteContactOnly && (!password || password.length < 6)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }

      // Create platform account if email not already taken (skip for onsite contact-only registrations)
      let userId: string | null = null;
      let newUser: any = null;
      let loginUser: any = null; // user to auto-login (new or existing with correct password)
      const bcrypt = await import('bcryptjs');
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        userId = existing.id;
        // Try to auto-login existing user if they provided the correct password
        if (password && existing.password) {
          const passwordOk = await bcrypt.compare(password, existing.password);
          if (passwordOk) {
            loginUser = existing;
          }
        }
      } else if (!isOnsiteContactOnly) {
        const hashed = await bcrypt.hash(password, 10);
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        const genCode = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).substr(2,5)}`.toUpperCase();
        newUser = await storage.createUser({
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
          firstName,
          lastName,
          email,
          password: hashed,
          userType: 'creator',
          bio: '',
          location: location || '',
          skills: [],
          referralCodeCreator: genCode('CR'),
          referralCodeBrand: genCode('BR'),
        } as any);
        userId = newUser.id;
        loginUser = newUser;
        // Welcome points
        storage.awardPoints(userId, 'signup', 50, 'Welcome to BreedSkool!').catch(() => {});
      }

      const proofPath = req.file ? `/uploads/${req.file.filename}` : null;
      const isPayLater = (paymentOption || 'pay_later') === 'pay_later';
      const deadline = null; // No deadline — pay later means free courses only

      const insertValues: Record<string, any> = {
        userId,
        fullName,
        email,
        phone,
        location: location || null,
        selectedCourseKey,
        selectedCourseTitle,
        amountNgn: parseInt(amountNgn) || 0,
        paymentOption: paymentOption || 'pay_later',
        paymentMethod: paymentMethod || null,
        paymentStatus: isPayLater ? 'registered' : 'pending',
        transactionRef: transactionRef || null,
        paymentProof: proofPath,
        currencyUsed: currencyUsed || 'NGN',
        amountUsd: amountUsd ? amountUsd.toString() : null,
        payLaterDeadline: deadline,
        notes: notes || null,
        deliveryMode: deliveryMode || 'online',
        childName: childName || null,
        childAge: childAge || null,
        parentName: parentName || null,
        homeAddress: homeAddress || null,
      };

      const [reg] = await db.insert(breedskoolRegistrations).values(insertValues as any).returning();
      sendAdminActivityEmail({
        event: "course_registration",
        subject: `New course registration: ${selectedCourseTitle || selectedCourseKey || "Course"}`,
        recipient: TASKDRIP_EMAILS.payments,
        fromEmail: TASKDRIP_EMAILS.payments,
        customer: { name: fullName, email, phone },
        details: [
          { label: "Registration ID", value: reg.id },
          { label: "Course", value: selectedCourseTitle || selectedCourseKey },
          { label: "Amount", value: `${amountNgn || 0} NGN${amountUsd ? ` / $${amountUsd}` : ""}` },
          { label: "Payment option", value: paymentOption },
          { label: "Payment method", value: paymentMethod },
          { label: "Transaction reference", value: transactionRef },
          { label: "Delivery mode", value: deliveryMode },
          { label: "Status", value: isPayLater ? "registered" : "pending" },
        ],
      }).catch(() => {});

      // Auto-enroll student in the linked platform course
      let linkedCourseId: string | null = null;
      try {
        const pricingRows = await db.select().from(breedskoolCoursePricing)
          .where(eq(breedskoolCoursePricing.courseKey, selectedCourseKey))
          .limit(1);
        const pricing = pricingRows[0];
        // The free course must remain enrollable even if its admin pricing row
        // has not been linked yet. The course seed uses this stable tag.
        let resolvedLinkedCourseId = pricing?.linkedCourseId || null;
        if (!resolvedLinkedCourseId && selectedCourseKey === 'free_foundations') {
          const freeCourseRows = await db.select({ id: courses.id })
            .from(courses)
            .where(sql`${courses.tags} @> ARRAY['breedskool_free_foundations']::text[]`)
            .limit(1);
          resolvedLinkedCourseId = freeCourseRows[0]?.id || null;
        }
        if (resolvedLinkedCourseId) {
          linkedCourseId = resolvedLinkedCourseId;
          // Check not already enrolled
          const alreadyEnrolled = await db.select({ id: courseEnrollments.id })
            .from(courseEnrollments)
            .where(and(
              eq(courseEnrollments.courseId, resolvedLinkedCourseId),
              eq(courseEnrollments.userId, userId!)
            ))
            .limit(1);
          if (!alreadyEnrolled.length) {
            await db.insert(courseEnrollments).values({
              courseId: resolvedLinkedCourseId,
              userId: userId!,
              // Pay later = free online access immediately; Pay now = pending admin approval
              status: isPayLater ? 'active' : 'pending_payment',
              isPaid: false,
              paymentMethod: paymentMethod || null,
              amount: String(parseInt(amountNgn) || 0),
            } as any);
            // Award points for enrollment
            storage.awardPoints(userId!, 'course_enroll', 30, `Enrolled in ${selectedCourseTitle}`).catch(() => {});
          }
          // Save linkedCourseId back to the registration row
          await db.update(breedskoolRegistrations)
            .set({ linkedCourseId: resolvedLinkedCourseId })
            .where(eq(breedskoolRegistrations.id, reg.id));
        }
      } catch (enrollErr: any) {
        console.error('[breedskool-register] enrollment error (non-fatal):', enrollErr?.message);
      }

      // Auto-login the student (new users OR existing users with correct password)
      if (loginUser) {
        await new Promise<void>((resolve, reject) => {
          req.login(loginUser, (err: any) => err ? reject(err) : resolve());
        });
      }

      const isExistingAccount = !!existing;
      const wrongPassword = isExistingAccount && !loginUser;

      // Strip sensitive fields before sending user to client
      const safeUser = loginUser
        ? (({ password: _p, twoFactorSecret: _t, ...rest }) => rest)(loginUser as any)
        : null;

      res.status(201).json({
        registration: reg,
        userId,
        loggedIn: !!loginUser,
        existingAccount: isExistingAccount,
        wrongPassword,
        user: safeUser,
        linkedCourseId,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: force-reseed all BreedSkool platform courses (idempotent — safe to run multiple times)
  app.post('/api/admin/reseed-courses', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    try {
      const { seedBreedskoolCourses } = await import('./seed-breedskool-courses');
      const { seedBreedskoolPricing } = await import('./seed-breedskool');
      await seedBreedskoolPricing();
      const result = await seedBreedskoolCourses(req.user.id);
      res.json({ ok: true, created: result.created, linked: result.linked, message: `Reseeded: ${result.created} course(s) created, ${result.linked} linked to pricing` });
    } catch (e: any) {
      console.error('[reseed-courses]', e);
      res.status(500).json({ ok: false, message: e?.message || 'Reseed failed' });
    }
  });

  // Admin: get all pricing
  app.get('/api/admin/breedskool/pricing', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const rows = await db.select().from(breedskoolCoursePricing);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: create a new course pricing row
  app.post('/api/admin/breedskool/pricing', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const { courseKey, title, shortDescription, regularPrice, discountPrice, duration, isActive, acceptedPayments } = req.body;
      if (!courseKey || !title) return res.status(400).json({ message: 'courseKey and title are required.' });
      const [row] = await db.insert(breedskoolCoursePricing).values({
        courseKey, title, shortDescription: shortDescription || '',
        regularPrice: parseInt(regularPrice) || 0,
        discountPrice: parseInt(discountPrice) || 0,
        duration: duration || '',
        isActive: isActive !== false,
        acceptedPayments: acceptedPayments || ['bank_transfer', 'usdt_tron', 'usdt_ton', 'usdt_bnb'],
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: update a course pricing row
  app.patch('/api/admin/breedskool/pricing/:id', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const updates: Record<string, any> = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.shortDescription !== undefined) updates.shortDescription = req.body.shortDescription;
      if (req.body.regularPrice !== undefined) updates.regularPrice = parseInt(req.body.regularPrice);
      if (req.body.discountPrice !== undefined) updates.discountPrice = parseInt(req.body.discountPrice);
      if (req.body.duration !== undefined) updates.duration = req.body.duration;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.acceptedPayments !== undefined) updates.acceptedPayments = req.body.acceptedPayments;
      updates.updatedAt = new Date();
      const [row] = await db.update(breedskoolCoursePricing).set(updates).where(eq(breedskoolCoursePricing.id, req.params.id)).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: get all registrations
  app.get('/api/admin/breedskool/registrations', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const rows = await db.select().from(breedskoolRegistrations).orderBy(desc(breedskoolRegistrations.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: update registration details/status (and activate linked course enrollment on verification)
  app.patch('/api/admin/breedskool/registrations/:id', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const body = req.body || {};
      const updateData: Record<string, any> = { updatedAt: new Date() };
      const requiredTextFields = ['fullName', 'email', 'phone', 'selectedCourseKey', 'selectedCourseTitle'];
      const optionalTextFields = ['location', 'paymentMethod', 'transactionRef', 'childName', 'childAge', 'parentName', 'homeAddress', 'notes'];
      const textLimits: Record<string, number> = {
        fullName: 160, email: 254, phone: 40, selectedCourseKey: 80, selectedCourseTitle: 200,
        location: 160, paymentMethod: 60, transactionRef: 160, childName: 160, childAge: 20,
        parentName: 160, homeAddress: 500, notes: 2000,
      };
      for (const field of requiredTextFields) {
        if (body[field] !== undefined) {
          const value = String(body[field] || '').trim();
          if (!value) return res.status(400).json({ message: `${field} is required.` });
          updateData[field] = value.slice(0, textLimits[field]);
        }
      }
      for (const field of optionalTextFields) {
        if (body[field] !== undefined) {
          const value = body[field] == null ? '' : String(body[field]).trim();
          updateData[field] = value ? value.slice(0, textLimits[field]) : null;
        }
      }
      if (body.email !== undefined) updateData.email = updateData.email.toLowerCase();
      if (body.amountNgn !== undefined) {
        const amountNgn = Number(body.amountNgn);
        if (!Number.isFinite(amountNgn) || amountNgn < 0) return res.status(400).json({ message: 'Amount must be a non-negative number.' });
        updateData.amountNgn = Math.round(amountNgn);
      }
      const allowedPaymentOptions = ['pay_now', 'pay_later'];
      if (body.paymentOption !== undefined) {
        if (!allowedPaymentOptions.includes(String(body.paymentOption))) return res.status(400).json({ message: 'Invalid payment option.' });
        updateData.paymentOption = String(body.paymentOption);
      }
      const allowedDeliveryModes = ['online', 'onsite', 'home_lesson'];
      if (body.deliveryMode !== undefined) {
        if (!allowedDeliveryModes.includes(String(body.deliveryMode))) return res.status(400).json({ message: 'Invalid delivery mode.' });
        updateData.deliveryMode = String(body.deliveryMode);
      }
      const allowedPaymentStatuses = ['pending', 'paid', 'confirmed', 'verified', 'approved', 'rejected'];
      const paymentStatus = body.paymentStatus;
      if (paymentStatus !== undefined) {
        if (!allowedPaymentStatuses.includes(String(paymentStatus))) return res.status(400).json({ message: 'Invalid payment status.' });
        updateData.paymentStatus = String(paymentStatus);
      }
      const [row] = await db.update(breedskoolRegistrations).set(updateData).where(eq(breedskoolRegistrations.id, req.params.id)).returning();
      if (!row) return res.status(404).json({ message: 'Registration not found' });

      // When payment is verified OR confirmed → activate the linked platform course enrollment
      if (paymentStatus === 'verified' || paymentStatus === 'confirmed' || paymentStatus === 'paid' || paymentStatus === 'approved') {
        // Resolve userId — may be null if student registered without being logged in
        let resolvedUserId = row?.userId;
        if (!resolvedUserId && row?.email) {
          const [matchedUser] = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.email, row.email.toLowerCase().trim()))
            .limit(1);
          if (matchedUser) {
            resolvedUserId = matchedUser.id;
            await db.update(breedskoolRegistrations)
              .set({ userId: resolvedUserId } as any)
              .where(eq(breedskoolRegistrations.id, row.id));
          }
        }

        if (resolvedUserId) {
          let courseIdToActivate = row.linkedCourseId;

          // If no linkedCourseId on the reg row, look it up from pricing
          if (!courseIdToActivate && row.selectedCourseKey) {
            const [pricing] = await db.select().from(breedskoolCoursePricing)
              .where(eq(breedskoolCoursePricing.courseKey, row.selectedCourseKey))
              .limit(1);
            courseIdToActivate = pricing?.linkedCourseId || null;
          }

          if (courseIdToActivate) {
            const [existing] = await db.select({ id: courseEnrollments.id })
              .from(courseEnrollments)
              .where(and(
                eq(courseEnrollments.courseId, courseIdToActivate),
                eq(courseEnrollments.userId, resolvedUserId)
              )).limit(1);

            if (existing) {
              await db.update(courseEnrollments)
                .set({ status: 'active', isPaid: true })
                .where(eq(courseEnrollments.id, existing.id));
            } else {
              await db.insert(courseEnrollments).values({
                courseId: courseIdToActivate,
                userId: resolvedUserId,
                status: 'active',
                isPaid: true,
                paymentMethod: row.paymentMethod || null,
                amount: String(row.amountNgn || 0),
              } as any);
            }

            if (!row.linkedCourseId) {
              await db.update(breedskoolRegistrations)
                .set({ linkedCourseId: courseIdToActivate })
                .where(eq(breedskoolRegistrations.id, row.id));
            }
          }
        }
      }

      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: manually re-activate course enrollment for a verified breedskool registration
  app.post('/api/admin/breedskool/registrations/:id/activate-enrollment', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const regId = req.params.id;

      // Use raw SQL to avoid any ORM query-building issues
      const regResult = await db.execute(sql`SELECT * FROM breedskool_registrations WHERE id = ${regId} LIMIT 1`);
      const row: any = regResult.rows[0];
      if (!row) return res.status(404).json({ message: 'Registration not found' });

      // Resolve userId — may be null if student registered without logging in
      let resolvedUserId: string | null = row.user_id || null;
      if (!resolvedUserId && row.email) {
        const userResult = await db.execute(sql`SELECT id FROM users WHERE LOWER(email) = ${row.email.toLowerCase().trim()} LIMIT 1`);
        const matchedUser: any = userResult.rows[0];
        if (matchedUser) {
          resolvedUserId = matchedUser.id;
          await db.execute(sql`UPDATE breedskool_registrations SET user_id = ${resolvedUserId} WHERE id = ${regId}`);
        }
      }
      if (!resolvedUserId) {
        return res.status(400).json({
          message: `No platform account found for ${row.email}. The student must sign up on Taskdrip first.`
        });
      }

      // Look up linked course — try multiple fallbacks in order
      let courseId: string | null = row.linked_course_id || null;

      // Fallback 1: pricing table linked_course_id
      if (!courseId && row.selected_course_key) {
        const pricingResult = await db.execute(sql`SELECT linked_course_id FROM breedskool_course_pricing WHERE course_key = ${row.selected_course_key} LIMIT 1`);
        const pricing: any = pricingResult.rows[0];
        courseId = pricing?.linked_course_id || null;
      }

      // Fallback 2: find course by breedskool tag matching the course key
      if (!courseId && row.selected_course_key) {
        const tag = `breedskool_${row.selected_course_key}`;
        const tagResult = await db.execute(sql`SELECT id FROM courses WHERE tags @> ARRAY[${tag}]::text[] LIMIT 1`);
        const tagCourse: any = tagResult.rows[0];
        courseId = tagCourse?.id || null;
      }

      // Fallback 3: find course by matching selected_course_title (case-insensitive partial)
      if (!courseId && row.selected_course_title) {
        const titleResult = await db.execute(sql`SELECT id FROM courses WHERE title ILIKE ${'%' + row.selected_course_title + '%'} LIMIT 1`);
        const titleCourse: any = titleResult.rows[0];
        courseId = titleCourse?.id || null;
      }

      if (!courseId) {
        return res.status(400).json({
          message: `No linked platform course found for course key "${row.selected_course_key}". Please check Admin → BreedSkool → Courses are seeded, then try again.`
        });
      }

      // Auto-repair: update pricing table so this won't fail again
      if (row.selected_course_key && courseId) {
        await db.execute(sql`UPDATE breedskool_course_pricing SET linked_course_id = ${courseId} WHERE course_key = ${row.selected_course_key} AND (linked_course_id IS NULL OR linked_course_id = '')`).catch(() => {});
      }

      // Check for existing enrollment
      const existingResult = await db.execute(sql`SELECT id FROM course_enrollments WHERE course_id = ${courseId} AND user_id = ${resolvedUserId} LIMIT 1`);
      const existing: any = existingResult.rows[0];

      if (existing) {
        await db.execute(sql`UPDATE course_enrollments SET status = 'active', is_paid = true WHERE id = ${existing.id}`);
      } else {
        const amount = String(row.amount_ngn || 0);
        const payMethod = row.payment_method || null;
        await db.execute(sql`INSERT INTO course_enrollments (course_id, user_id, status, is_paid, payment_method, amount) VALUES (${courseId}, ${resolvedUserId}, 'active', true, ${payMethod}, ${amount})`);
      }

      // Backfill linkedCourseId on registration row if missing
      if (!row.linked_course_id) {
        await db.execute(sql`UPDATE breedskool_registrations SET linked_course_id = ${courseId} WHERE id = ${regId}`);
      }

      res.json({ success: true, courseId, message: 'Enrollment activated successfully' });
    } catch (e: any) {
      console.error('[activate-enrollment error]', e);
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: delete a BreedSkool registration
  app.delete('/api/admin/breedskool/registrations/:id', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const regId = req.params.id;
      const result = await db.execute(sql`DELETE FROM breedskool_registrations WHERE id = ${regId} RETURNING id`);
      if (!result.rows.length) return res.status(404).json({ message: 'Registration not found' });
      res.json({ success: true, message: 'Registration deleted' });
    } catch (e: any) {
      console.error('[delete-registration error]', e);
      res.status(500).json({ message: e.message });
    }
  });

  // Public: get BreedSkool payment settings (bank + crypto info for registration form)
  // Public campaign settings are kept in app_settings so the campaign can be
  // edited without introducing a second donation-specific schema.
  const DEFAULT_BREEDSKOOL_CAMPAIGN = {
    // Kept as goalUsd for backwards compatibility with saved app settings;
    // campaign copy and admin labels present this target in GBP.
    goalUsd: 100000,
    raisedUsd: 0,
    supporters: 0,
    registeredUsers: 0,
    studentsTarget: 100,
    studentsTrained: 0,
    studentsEmployed: 0,
    studentsWithoutEquipment: 100,
    heroImage: "/breedskool-campaign-header.png",
    justGivingUrl: "https://www.justgiving.com/crowdfunding/breedskool",
    telegramUrl: "https://t.me/taskdrip",
    studentWhatsAppUrl: "https://wa.me/2348036622568",
    sponsorWhatsAppUrl: "https://wa.me/12016800266",
    developerUrl: "https://taskdrip.online/hire-developer",
  };

  const DEFAULT_BREEDSKOOL_DONATION_WALLETS = [
    { id: "usdt-trc20", label: "USDT · TRC-20", currency: "USDT", network: "tron", address: "", isActive: true },
    { id: "usdt-bep20", label: "USDT · BEP-20", currency: "USDT", network: "bsc", address: "", isActive: true },
    { id: "usdt-ton", label: "USDT · TON", currency: "USDT", network: "ton", address: "", isActive: true },
    { id: "usdt-erc20", label: "USDT · ERC-20", currency: "USDT", network: "ethereum", address: "", isActive: true },
    { id: "bitcoin", label: "Bitcoin", currency: "BTC", network: "bitcoin", address: "", isActive: true },
    { id: "ethereum", label: "Ethereum", currency: "ETH", network: "ethereum", address: "", isActive: true },
    { id: "bnb", label: "BNB Smart Chain", currency: "BNB", network: "bsc", address: "", isActive: true },
    { id: "solana", label: "Solana", currency: "SOL", network: "solana", address: "", isActive: true },
    { id: "ton", label: "Toncoin", currency: "TON", network: "ton", address: "", isActive: true },
  ];

  const readBreedSkoolDonationWallets = async () => {
    const [walletRow] = await db.select().from(appSettings).where(eq(appSettings.key, 'breedskool_donation_wallets'));
    if (walletRow?.value) {
      try {
        const stored = JSON.parse(walletRow.value);
        if (Array.isArray(stored)) {
          return stored
            .filter((wallet: any) => wallet && typeof wallet === 'object')
            .map((wallet: any) => ({
              id: String(wallet.id || '').trim().slice(0, 50),
              label: String(wallet.label || wallet.currency || 'Crypto wallet').trim().slice(0, 100),
              currency: String(wallet.currency || 'USDT').trim().slice(0, 12).toUpperCase(),
              network: String(wallet.network || 'other').trim().slice(0, 20).toLowerCase(),
              address: String(wallet.address || '').trim().slice(0, 200),
              isActive: wallet.isActive !== false,
            }))
            .filter((wallet: any) => wallet.id);
        }
      } catch {}
    }

    // Keep existing three BreedSkool payment fields compatible with the new
    // catalog until an admin saves the new wallet manager.
    const legacyRows = await db.select().from(appSettings).where(inArray(appSettings.key, [
      'breedskool_usdt_tron_address', 'breedskool_usdt_ton_address', 'breedskool_usdt_bnb_address',
    ]));
    const legacy: Record<string, string> = {};
    for (const row of legacyRows) legacy[row.key] = row.value || '';
    return DEFAULT_BREEDSKOOL_DONATION_WALLETS.map((wallet) => ({
      ...wallet,
      address: wallet.id === 'usdt-trc20'
        ? legacy.breedskool_usdt_tron_address || ''
        : wallet.id === 'usdt-ton'
          ? legacy.breedskool_usdt_ton_address || ''
          : wallet.id === 'usdt-bep20'
            ? legacy.breedskool_usdt_bnb_address || ''
            : '',
    }));
  };

  app.get('/api/breedskool/campaign', async (_req, res) => {
    try {
      const [row] = await db.select().from(appSettings).where(eq(appSettings.key, 'breedskool_campaign_config'));
      let config = DEFAULT_BREEDSKOOL_CAMPAIGN;
      let storedConfig: Record<string, any> | null = null;
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            storedConfig = parsed;
            config = { ...config, ...parsed };
          }
        } catch {}
      }
      const [registrationStats] = await db.select({
        total: count(),
        confirmed: sql<number>`count(*) filter (where ${breedskoolRegistrations.paymentStatus} in ('paid', 'confirmed'))`,
      }).from(breedskoolRegistrations);
      const storedRegisteredUsers = storedConfig && Object.prototype.hasOwnProperty.call(storedConfig, 'registeredUsers')
        ? Number(storedConfig.registeredUsers)
        : Number(registrationStats?.total || 0);
      const registeredUsers = Number.isFinite(storedRegisteredUsers) && storedRegisteredUsers >= 0
        ? storedRegisteredUsers
        : Number(registrationStats?.total || 0);
      res.json({ ...config, registeredUsers, registrations: registeredUsers, confirmedRegistrations: Number(registrationStats?.confirmed || 0) });
    } catch (e: any) {
      res.json({ ...DEFAULT_BREEDSKOOL_CAMPAIGN, registeredUsers: 0, registrations: 0, confirmedRegistrations: 0 });
    }
  });

  app.get('/api/admin/breedskool/campaign', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const [row] = await db.select().from(appSettings).where(eq(appSettings.key, 'breedskool_campaign_config'));
      let config = DEFAULT_BREEDSKOOL_CAMPAIGN;
      if (row?.value) {
        try { config = { ...config, ...JSON.parse(row.value) }; } catch {}
      }
      if (!Object.prototype.hasOwnProperty.call(config, 'registeredUsers')) {
        const [registrationStats] = await db.select({ total: count() }).from(breedskoolRegistrations);
        config.registeredUsers = Number(registrationStats?.total || 0);
      }
      res.json(config);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/breedskool/campaign', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const allowed = Object.keys(DEFAULT_BREEDSKOOL_CAMPAIGN);
      const clean: Record<string, string | number> = {};
      for (const key of allowed) {
        if (req.body?.[key] === undefined) continue;
        const value = req.body[key];
        if (['goalUsd', 'raisedUsd', 'supporters', 'registeredUsers', 'studentsTarget', 'studentsTrained', 'studentsEmployed', 'studentsWithoutEquipment'].includes(key)) {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed < 0) return res.status(400).json({ message: `${key} must be a non-negative number` });
          clean[key] = parsed;
        } else if (typeof value === 'string' && value.length <= 1000) {
          clean[key] = value.trim();
        }
      }
      const merged = { ...DEFAULT_BREEDSKOOL_CAMPAIGN, ...clean };
      await db.insert(appSettings)
        .values({ key: 'breedskool_campaign_config', value: JSON.stringify(merged), updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(merged), updatedAt: new Date() } });
      res.json(merged);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Public manual campaign donation submission. Donations are reviewed by an
  // admin; no account is required for a supporter to submit a transaction hash.
  app.post('/api/breedskool/campaign/donations', upload.single('paymentProof'), async (req: any, res) => {
    try {
      const amount = Number(req.body?.amount);
      const walletId = String(req.body?.walletId || req.body?.network || '').trim().toLowerCase();
      const txHash = String(req.body?.transactionHash || '').trim();
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return res.status(400).json({ message: 'Enter a valid donation amount.' });
      if (txHash.length < 6 || txHash.length > 100) return res.status(400).json({ message: 'Enter the transaction hash after sending your donation.' });
      const wallets = await readBreedSkoolDonationWallets();
      const wallet = wallets.find((item: any) => item.id === walletId && item.isActive && item.address);
      if (!wallet) return res.status(400).json({ message: 'That donation wallet is not configured yet.' });
      const donorName = String(req.body?.donorName || '').trim().slice(0, 120);
      const donorEmail = String(req.body?.donorEmail || '').trim().slice(0, 160);
      const message = String(req.body?.message || '').trim().slice(0, 500);
      const deposit = await storage.createPaymentDeposit({
        amount: amount.toFixed(2),
        network: wallet.network,
        walletAddress: wallet.address,
        transactionHash: txHash,
        paymentProof: req.file?.path || null,
        adminNotes: JSON.stringify({ source: 'breedskool_campaign', walletId: wallet.id, walletLabel: wallet.label, donorName, donorEmail, message }),
        status: 'submitted',
      });
      res.status(201).json({ success: true, id: deposit.id, message: 'Thank you. Your donation is pending verification.' });
    } catch (e: any) {
      console.error('[breedskool-campaign-donation]', e?.message || e);
      res.status(500).json({ message: 'We could not record the donation right now. Please try again.' });
    }
  });

  app.get('/api/breedskool/payment-settings', async (_req, res) => {
    try {
      const keys = [
        'breedskool_bank_name', 'breedskool_bank_account_number', 'breedskool_bank_account_name',
        'breedskool_bank_country', 'breedskool_usdt_tron_address', 'breedskool_usdt_ton_address',
        'breedskool_usdt_bnb_address', 'breedskool_payment_instructions',
      ];
      const rows = await db.select().from(appSettings).where(inArray(appSettings.key, keys));
      const settings: Record<string, string> = {};
      for (const r of rows) settings[r.key] = r.value || '';
      res.json({ ...settings, wallets: await readBreedSkoolDonationWallets() });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: get BreedSkool payment settings (bank + crypto wallets)
  app.get('/api/admin/breedskool/payment-settings', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const keys = [
        'breedskool_bank_name', 'breedskool_bank_account_number', 'breedskool_bank_account_name',
        'breedskool_bank_country', 'breedskool_usdt_tron_address', 'breedskool_usdt_ton_address',
        'breedskool_usdt_bnb_address', 'breedskool_payment_instructions',
      ];
      const rows = await db.select().from(appSettings).where(inArray(appSettings.key, keys));
      const settings: Record<string, string> = {};
      for (const r of rows) settings[r.key] = r.value || '';
      res.json({ ...settings, wallets: await readBreedSkoolDonationWallets() });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: update BreedSkool payment settings
  app.put('/api/admin/breedskool/payment-settings', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const allowed = [
        'breedskool_bank_name', 'breedskool_bank_account_number', 'breedskool_bank_account_name',
        'breedskool_bank_country', 'breedskool_usdt_tron_address', 'breedskool_usdt_ton_address',
        'breedskool_usdt_bnb_address', 'breedskool_payment_instructions',
      ];
      for (const [key, value] of Object.entries(req.body)) {
        if (key === 'wallets') {
          if (!Array.isArray(value) || value.length > 30) return res.status(400).json({ message: 'Add up to 30 donation wallets.' });
          const wallets = value.map((wallet: any) => ({
            id: String(wallet?.id || '').trim().slice(0, 50),
            label: String(wallet?.label || '').trim().slice(0, 100),
            currency: String(wallet?.currency || '').trim().slice(0, 12).toUpperCase(),
            network: String(wallet?.network || '').trim().slice(0, 20).toLowerCase(),
            address: String(wallet?.address || '').trim().slice(0, 200),
            isActive: wallet?.isActive !== false,
          }));
          if (wallets.some((wallet: any) => !wallet.id || !wallet.label || !wallet.currency || !wallet.network)) {
            return res.status(400).json({ message: 'Each wallet needs a name, currency and network.' });
          }
          await db.insert(appSettings)
            .values({ key: 'breedskool_donation_wallets', value: JSON.stringify(wallets), updatedAt: new Date() })
            .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(wallets), updatedAt: new Date() } });
          continue;
        }
        if (!allowed.includes(key)) continue;
        await db.insert(appSettings)
          .values({ key, value: String(value), updatedAt: new Date() })
          .onConflictDoUpdate({ target: appSettings.key, set: { value: String(value), updatedAt: new Date() } });
      }
      res.json({ message: 'Payment settings updated' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: review manual crypto donations submitted on the public BreedSkool page.
  app.get('/api/admin/breedskool/campaign/donations', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const deposits = await db.select().from(paymentDeposits)
        .where(ilike(paymentDeposits.adminNotes, '%breedskool_campaign%'))
        .orderBy(desc(paymentDeposits.createdAt));
      res.json(deposits.map((deposit: any) => {
        let details: any = {};
        try { details = deposit.adminNotes ? JSON.parse(deposit.adminNotes) : {}; } catch {}
        return {
          ...deposit,
          donorName: details.donorName || 'Anonymous supporter',
          donorEmail: details.donorEmail || '',
          donorMessage: details.message || '',
          walletLabel: details.walletLabel || deposit.network,
          proofUrl: deposit.paymentProof
            ? (String(deposit.paymentProof).startsWith('/') ? deposit.paymentProof : `/${deposit.paymentProof}`)
            : null,
        };
      }));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/breedskool/campaign/donations/:id', isAuthenticated, async (req: any, res) => {
    if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    try {
      const status = String(req.body?.status || '').toLowerCase();
      if (!['submitted', 'verified', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Choose a valid donation status.' });
      }
      const [existing] = await db.select().from(paymentDeposits).where(eq(paymentDeposits.id, req.params.id));
      if (!existing || !String(existing.adminNotes || '').includes('breedskool_campaign')) {
        return res.status(404).json({ message: 'Donation not found.' });
      }
      const existingNotes = (() => { try { return JSON.parse(existing.adminNotes || '{}'); } catch { return {}; } })();
      const adminNote = String(req.body?.adminNotes || '').trim().slice(0, 500);
      const [updated] = await db.update(paymentDeposits).set({
        status,
        adminNotes: JSON.stringify({ ...existingNotes, adminNote }),
        approvedBy: status === 'approved' || status === 'verified' ? req.user.id : null,
        approvedAt: status === 'approved' || status === 'verified' ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(paymentDeposits.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // User: get all assignment submissions across all their courses
  app.get('/api/my/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const rows = await db.select().from(courseAssignments)
        .where(eq(courseAssignments.userId, req.user.id))
        .orderBy(desc(courseAssignments.submittedAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // User: get own BreedSkool registrations
  app.get('/api/my/breedskool-registrations', isAuthenticated, async (req: any, res) => {
    try {
      const rows = await db.select().from(breedskoolRegistrations)
        .where(eq(breedskoolRegistrations.userId, req.user.id))
        .orderBy(desc(breedskoolRegistrations.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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
      if (body.saleDeadline && body.saleDeadline !== '') { body.saleDeadline = new Date(body.saleDeadline); } else { body.saleDeadline = null; }
      if (!body.salePrice || body.salePrice === '') body.salePrice = null;
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
      if (body.saleDeadline && body.saleDeadline !== '') { body.saleDeadline = new Date(body.saleDeadline); } else { body.saleDeadline = null; }
      if (!body.salePrice || body.salePrice === '') body.salePrice = null;
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

  // Auth: get enrolled classmates for a course (Community tab)
  // Requires: requester must be enrolled in the course, be the instructor, or be admin
  app.get('/api/courses/:id/community', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const courseId = req.params.id;
      // Authorization: must be admin, instructor of this course, or active enrollee
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      if (!isAdmin) {
        const course = await storage.getCourseById(courseId);
        const isInstructor = course && (course as any).instructorId === u.id;
        if (!isInstructor) {
          const enrollment = await storage.getCourseEnrollment(courseId, u.id);
          if (!enrollment || enrollment.status !== 'active') {
            return res.status(403).json({ message: 'You must be enrolled in this course to view the community.' });
          }
        }
      }
      const rows = await db.select({
        userId: courseEnrollments.userId,
        status: courseEnrollments.status,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        userType: users.userType,
        username: users.username,
      })
        .from(courseEnrollments)
        .leftJoin(users, eq(courseEnrollments.userId, users.id))
        .where(and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.status, 'active')
        ))
        .limit(100);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to fetch community' });
    }
  });

  // ── Community Posts (threaded discussion board, separate from chat) ──────────────
  // GET: list top-level posts + replies, with current user's like status
  app.get('/api/courses/:id/community/posts', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const courseId = req.params.id;
      // Authorization: must be enrolled, instructor, or admin
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      if (!isAdmin) {
        const course = await storage.getCourseById(courseId);
        const isInstructor = course && (course as any).instructorId === u.id;
        if (!isInstructor) {
          const enrollment = await storage.getCourseEnrollment(courseId, u.id);
          if (!enrollment || enrollment.status !== 'active') {
            return res.status(403).json({ message: 'You must be enrolled to view the community.' });
          }
        }
      }
      const posts = await db.select({
        id: courseCommunityPosts.id,
        courseId: courseCommunityPosts.courseId,
        userId: courseCommunityPosts.userId,
        message: courseCommunityPosts.message,
        replyToId: courseCommunityPosts.replyToId,
        likeCount: courseCommunityPosts.likeCount,
        isDeleted: courseCommunityPosts.isDeleted,
        createdAt: courseCommunityPosts.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        username: users.username,
        userType: users.userType,
      })
        .from(courseCommunityPosts)
        .leftJoin(users, eq(courseCommunityPosts.userId, users.id))
        .where(and(
          eq(courseCommunityPosts.courseId, courseId),
          eq(courseCommunityPosts.isDeleted, false)
        ))
        .orderBy(courseCommunityPosts.createdAt)
        .limit(200);
      // Get current user's likes
      const likes = await db.select().from(courseCommunityLikes)
        .where(eq(courseCommunityLikes.userId, u.id));
      const likedSet = new Set(likes.map((l: any) => l.postId));
      const result = posts.map((p: any) => ({ ...p, likedByMe: likedSet.has(p.id) }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to fetch posts' });
    }
  });

  // POST: create a new community post (or reply)
  app.post('/api/courses/:id/community/posts', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const courseId = req.params.id;
      const { message, replyToId, topic } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: 'Message is required.' });
      // Auth: must be enrolled, instructor, or admin
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      if (!isAdmin) {
        const course = await storage.getCourseById(courseId);
        const isInstructor = course && (course as any).instructorId === u.id;
        if (!isInstructor) {
          const enrollment = await storage.getCourseEnrollment(courseId, u.id);
          if (!enrollment || enrollment.status !== 'active') {
            return res.status(403).json({ message: 'You must be enrolled to post in the community.' });
          }
        }
      }
      const postRows = await db.execute(sql`
        INSERT INTO course_community_posts (course_id, user_id, message, reply_to_id, topic)
        VALUES (${courseId}, ${u.id}, ${message.trim()}, ${replyToId || null}, ${topic || 'General'})
        RETURNING *
      `);
      const post = (postRows as any).rows?.[0] ?? (Array.isArray(postRows) ? postRows[0] : postRows);
      res.json(post);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to create post' });
    }
  });

  // POST: toggle like on a community post
  app.post('/api/courses/:id/community/posts/:postId/like', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const courseId = req.params.id;
      const postId = req.params.postId;
      // Authorization: caller must be enrolled, instructor, or admin
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      if (!isAdmin) {
        const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
        if (!course) return res.status(404).json({ message: 'Course not found.' });
        const isInstructor = course.instructorId === u.id;
        if (!isInstructor) {
          const [enrollment] = await db.select().from(courseEnrollments)
            .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, u.id)))
            .limit(1);
          if (!enrollment || (enrollment.status !== 'active' && enrollment.status !== 'completed')) {
            return res.status(403).json({ message: 'You must be enrolled to like posts.' });
          }
        }
      }
      // Integrity: verify postId belongs to this course and is not deleted
      const [post] = await db.select().from(courseCommunityPosts)
        .where(and(eq(courseCommunityPosts.id, postId), eq(courseCommunityPosts.courseId, courseId), eq(courseCommunityPosts.isDeleted, false)))
        .limit(1);
      if (!post) return res.status(404).json({ message: 'Post not found in this course.' });
      // Toggle like
      const existing = await db.select().from(courseCommunityLikes)
        .where(and(eq(courseCommunityLikes.postId, postId), eq(courseCommunityLikes.userId, u.id)))
        .limit(1);
      if (existing.length > 0) {
        await db.delete(courseCommunityLikes).where(and(
          eq(courseCommunityLikes.postId, postId), eq(courseCommunityLikes.userId, u.id)
        ));
        await db.update(courseCommunityPosts).set({ likeCount: sql`GREATEST(like_count - 1, 0)` })
          .where(eq(courseCommunityPosts.id, postId));
        res.json({ liked: false });
      } else {
        await db.execute(sql`INSERT INTO course_community_likes (post_id, user_id) VALUES (${postId}, ${u.id})`);
        await db.execute(sql`UPDATE course_community_posts SET like_count = like_count + 1 WHERE id = ${postId}`);
        res.json({ liked: true });
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to toggle like' });
    }
  });

  // DELETE: soft-delete a community post (own posts, instructor, or admin)
  app.delete('/api/courses/:id/community/posts/:postId', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const courseId = req.params.id;
      const postId = req.params.postId;
      // Integrity: verify postId belongs to this course
      const [post] = await db.select().from(courseCommunityPosts)
        .where(and(eq(courseCommunityPosts.id, postId), eq(courseCommunityPosts.courseId, courseId)))
        .limit(1);
      if (!post) return res.status(404).json({ message: 'Post not found in this course.' });
      const isAdmin = u.userType === 'admin' || u.role === 'admin';
      if (!isAdmin && post.userId !== u.id) {
        const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
        const isInstructor = course?.instructorId === u.id;
        if (!isInstructor) return res.status(403).json({ message: 'Not your post.' });
      }
      await db.update(courseCommunityPosts).set({ isDeleted: true })
        .where(eq(courseCommunityPosts.id, postId));
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to delete post' });
    }
  });

  // Global training community feed — posts from all courses the user is enrolled in
  app.get('/api/my/training/community', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const myEnrollments = await db.select({ courseId: courseEnrollments.courseId })
        .from(courseEnrollments)
        .where(eq(courseEnrollments.userId, u.id));
      if (!myEnrollments.length) return res.json([]);
      const courseIds = myEnrollments.map((e: any) => e.courseId);
      const rows = await db.select({
        id: courseCommunityPosts.id,
        courseId: courseCommunityPosts.courseId,
        userId: courseCommunityPosts.userId,
        message: courseCommunityPosts.message,
        replyToId: courseCommunityPosts.replyToId,
        topic: courseCommunityPosts.topic,
        likeCount: courseCommunityPosts.likeCount,
        createdAt: courseCommunityPosts.createdAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorAvatar: users.profileImageUrl,
        authorType: users.userType,
      })
      .from(courseCommunityPosts)
      .leftJoin(users, eq(courseCommunityPosts.userId, users.id))
      .where(and(inArray(courseCommunityPosts.courseId, courseIds), eq(courseCommunityPosts.isDeleted, false)))
      .orderBy(desc(courseCommunityPosts.createdAt))
      .limit(150);
      const likes = await db.select().from(courseCommunityLikes).where(eq(courseCommunityLikes.userId, u.id));
      const likedSet = new Set(likes.map((l: any) => l.postId));
      res.json(rows.map((r: any) => ({ ...r, liked: likedSet.has(r.id) })));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Get classmates across all enrolled courses (merged, deduplicated)
  app.get('/api/my/training/classmates', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      const myEnrollments = await db.select({ courseId: courseEnrollments.courseId })
        .from(courseEnrollments).where(eq(courseEnrollments.userId, u.id));
      if (!myEnrollments.length) return res.json([]);
      const courseIds = myEnrollments.map((e: any) => e.courseId);
      const rows = await db.select({
        userId: courseEnrollments.userId,
        courseId: courseEnrollments.courseId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        userType: users.userType,
        creatorTier: users.creatorTier,
      })
      .from(courseEnrollments)
      .leftJoin(users, eq(courseEnrollments.userId, users.id))
      .where(and(inArray(courseEnrollments.courseId, courseIds), sql`${courseEnrollments.userId} != ${u.id}`))
      .limit(60);
      // Deduplicate by userId
      const seen = new Set<string>();
      const unique = rows.filter((r: any) => { if (seen.has(r.userId)) return false; seen.add(r.userId); return true; });
      res.json(unique);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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
  app.post('/api/courses/:id/enroll', isAuthenticated, upload.single('paymentProof'), async (req: any, res) => {
    try {
      const course = await storage.getCourseById(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const existing = await storage.getCourseEnrollment(req.params.id, req.user.id);
      if (existing) return res.status(400).json({ message: "Already enrolled in this course" });
      const proofPath = req.file
        ? `/uploads/${req.file.filename}`
        : (req.body.paymentProofUrl || req.body.paymentProof || null);
      // Pay-later students get active access immediately so they can start learning
      const isPayLater = req.body.payLater === 'true' || req.body.payLater === true;
      // Determine effective price: use sale price if active (deadline not expired)
      let effectivePrice = course.isFree ? "0.00" : (course.price || "0.00");
      if (!course.isFree && (course as any).salePrice && (course as any).saleDeadline) {
        const deadline = new Date((course as any).saleDeadline);
        if (deadline > new Date()) {
          effectivePrice = String((course as any).salePrice);
        }
      }
      const enrollment = await storage.createEnrollment({
        courseId: req.params.id,
        userId: req.user.id,
        isFree: course.isFree || isPayLater,
        paymentMethod: req.body.paymentMethod,
        paymentProof: proofPath,
        transactionHash: req.body.transactionHash,
        amount: effectivePrice,
      });

      // Award points for enrolling in a course
      try {
        const pts = course.isFree ? 20 : 50;
        await storage.awardPoints(req.user.id, 'course_enroll', pts, `Enrolled in: ${course.title || 'a BreedSkool course'}`, req.params.id);
        await storage.createNotification({
          userId: req.user.id,
          type: 'points_earned',
          title: `🎉 +${pts} $TDRIP Earned!`,
          content: `You earned ${pts} $TDRIP points for enrolling in "${course.title || 'a course'}"! Learning pays in Taskdrip.`,
          actionUrl: '/wallet',
          isRead: false,
        } as any);
      } catch (pointsErr) {
        console.error('Failed to award course enroll points:', pointsErr);
      }

      // Notify admin of new paid course enrollment
      if (!course.isFree && !isPayLater) {
        try {
          const adminForEnroll = await storage.getAdminUser();
          if (adminForEnroll) {
            const student = await storage.getUser(req.user.id);
            await storage.createNotification({
              userId: adminForEnroll.id,
              type: 'course_enrollment',
              title: `📚 New Course Enrollment — ${course.title || 'Course'}`,
              content: `${student?.firstName || 'A user'} ${student?.lastName || ''} enrolled in "${course.title || 'a course'}" (${effectivePrice} USD). Review & approve in Admin → Payments.`,
              priority: 'high',
              actionUrl: '/admin/payments',
            } as any);
          }
        } catch (_e) { /* non-fatal */ }
      }

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

  // ── Course Chat (group + private DM) ──────────────────────────
  // GET /api/courses/:id/chat?scope=group  (default)
  // GET /api/courses/:id/chat?scope=private&with=USER_ID
  app.get('/api/courses/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const scope = (req.query.scope === 'private') ? 'private' : 'group';
      const otherUserId = req.query.with as string | undefined;
      const msgs = await storage.getCourseMessages(req.params.id, {
        scope: scope as 'group' | 'private',
        userId: req.user.id,
        otherUserId,
      });
      res.json(msgs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/courses/:id/chat', isAuthenticated, async (req: any, res) => {
    try {
      const recipientId = req.body.recipientId || null;
      const msg = await storage.createCourseMessage({
        courseId: req.params.id,
        senderId: req.user.id,
        message: req.body.message,
        recipientId,
      });
      // Fetch with sender info — preserve scope when echoing
      const scope = recipientId ? 'private' : 'group';
      const msgs = await storage.getCourseMessages(req.params.id, {
        scope, userId: req.user.id, otherUserId: recipientId || undefined,
      });
      const full = msgs.find((m) => m.id === msg.id) || msg;
      res.status(201).json(full);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send message" });
    }
  });

  // ── Course progress + completion ─────────────────────────────
  // GET /api/courses/:id/progress  → { completedLessonIds, percent, totalLessons, certificate? }
  app.get('/api/courses/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      const completedLessonIds = await storage.getLessonProgress(req.user.id, courseId);
      const lessons = await storage.getLessonsByCourse(courseId);
      const total = lessons.length;
      const percent = total > 0 ? Math.round((completedLessonIds.length / total) * 100) : 0;
      const certificate = await storage.getCertificateByUserCourse(req.user.id, courseId);
      res.json({ completedLessonIds, percent, totalLessons: total, completedCount: completedLessonIds.length, certificate: certificate || null });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch progress" });
    }
  });

  // Mark lesson complete
  app.post('/api/courses/:id/lessons/:lessonId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const result = await storage.markLessonComplete(req.user.id, req.params.id, req.params.lessonId);
      let certificate: any = null;
      if (result.allDone) {
        certificate = await storage.issueCertificate({ userId: req.user.id, courseId: req.params.id });
      }
      res.json({ ...result, certificate });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to mark complete" });
    }
  });

  // Unmark lesson complete
  app.delete('/api/courses/:id/lessons/:lessonId/complete', isAuthenticated, async (req: any, res) => {
    try {
      await storage.unmarkLessonComplete(req.user.id, req.params.id, req.params.lessonId);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to unmark" });
    }
  });

  // ── Course Assignments ────────────────────────────────────────
  // GET: fetch my assignments for a course
  app.get('/api/courses/:id/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const rows = await db.select().from(courseAssignments)
        .where(and(
          eq(courseAssignments.courseId, req.params.id),
          eq(courseAssignments.userId, req.user.id)
        ))
        .orderBy(desc(courseAssignments.submittedAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch assignments" });
    }
  });

  // POST: submit an assignment (with optional multi-file upload — up to 5 files)
  app.post('/api/courses/:id/assignments', isAuthenticated, upload.array('files', 5), async (req: any, res) => {
    try {
      const { title, description, lessonId } = req.body;
      if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
      const files: Express.Multer.File[] = (req.files as Express.Multer.File[]) || [];
      const primaryFile = files[0] || null;
      // Store primary file in the main columns; store all paths as JSON in fileUrl when multiple
      const allFilePaths = files.map(f => `/uploads/${f.filename}`);
      const fileUrlValue = allFilePaths.length > 1
        ? JSON.stringify(allFilePaths)
        : (primaryFile ? `/uploads/${primaryFile.filename}` : null);
      const assignRows = await db.execute(sql`
        INSERT INTO course_assignments (course_id, user_id, lesson_id, title, description, file_url, file_name, file_type, status)
        VALUES (
          ${req.params.id},
          ${req.user.id},
          ${lessonId || null},
          ${title.trim()},
          ${description?.trim() || null},
          ${fileUrlValue},
          ${primaryFile ? (primaryFile.originalname || primaryFile.filename) : (files.length > 1 ? `${files.length} files` : null)},
          ${primaryFile ? primaryFile.mimetype : null},
          'submitted'
        )
        RETURNING *
      `);
      const assignment = (assignRows as any).rows?.[0] ?? (Array.isArray(assignRows) ? assignRows[0] : assignRows);
      res.status(201).json(assignment);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to submit assignment" });
    }
  });

  // Admin: list all assignment submissions across courses
  app.get('/api/admin/courses/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      if (u.userType !== 'admin' && u.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
      const rows = await db.select({
        id: courseAssignments.id,
        courseId: courseAssignments.courseId,
        lessonId: courseAssignments.lessonId,
        userId: courseAssignments.userId,
        title: courseAssignments.title,
        description: courseAssignments.description,
        fileUrl: courseAssignments.fileUrl,
        fileName: courseAssignments.fileName,
        fileType: courseAssignments.fileType,
        status: courseAssignments.status,
        tutorFeedback: courseAssignments.tutorFeedback,
        submittedAt: courseAssignments.submittedAt,
        studentFirstName: users.firstName,
        studentLastName: users.lastName,
        studentEmail: users.email,
      })
        .from(courseAssignments)
        .leftJoin(users, eq(courseAssignments.userId, users.id))
        .orderBy(desc(courseAssignments.submittedAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to fetch assignments' });
    }
  });

  // Admin: review (approve/reject) an assignment submission
  app.patch('/api/admin/assignments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      if (u.userType !== 'admin' && u.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
      const { status, tutorFeedback } = req.body;
      if (!['approved', 'rejected', 'reviewed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
      const [updated] = await db.update(courseAssignments)
        .set({ status, tutorFeedback: tutorFeedback || null })
        .where(eq(courseAssignments.id, req.params.id))
        .returning();
      if (!updated) return res.status(404).json({ message: 'Assignment not found' });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to review assignment' });
    }
  });

  // ── Certificates ──────────────────────────────────────────────
  // Public: fetch issued certificate by code (for verification or download page)
  app.get('/api/certificates/:code', async (req, res) => {
    try {
      const cert = await storage.getCertificateByCode(req.params.code);
      if (!cert) return res.status(404).json({ message: "Certificate not found" });
      res.json(cert);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // List my certificates
  app.get('/api/my-certificates', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getMyCertificates(req.user.id);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Public: get certificate template (used to render the cert SVG on the client)
  app.get('/api/certificate-template', async (_req, res) => {
    try {
      const tpl = await storage.getCertificateTemplate();
      res.json(tpl);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: update certificate template
  app.patch('/api/admin/certificate-template', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      if (u.userType !== 'admin' && u.role !== 'admin') return res.status(403).json({ message: "Admin only" });
      const updated = await storage.updateCertificateTemplate(req.body || {});
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: list every chat message in a course (group + DMs) for moderation
  app.get('/api/admin/courses/:id/all-messages', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      if (u.userType !== 'admin' && u.role !== 'admin') return res.status(403).json({ message: "Admin only" });
      const { db } = await import('./db');
      const { courseMessages, users } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      const msgs = await db.select().from(courseMessages).where(eq(courseMessages.courseId, req.params.id)).orderBy(desc(courseMessages.createdAt));
      const enriched = await Promise.all(msgs.map(async (m: any) => {
        const [sender] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, userType: users.userType }).from(users).where(eq(users.id, m.senderId));
        let recipient: any = null;
        if (m.recipientId) {
          const [r] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, userType: users.userType }).from(users).where(eq(users.id, m.recipientId));
          recipient = r || null;
        }
        return { ...m, sender, recipient };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: soft-delete a course chat message
  app.delete('/api/admin/courses/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const u = req.user as any;
      if (u.userType !== 'admin' && u.role !== 'admin') return res.status(403).json({ message: "Admin only" });
      await storage.deleteCourseMessage(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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
      const bcrypt = await import('bcryptjs');
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

  // P2P trading profile settings (country, currency, crypto wallets)
  app.patch('/api/user/p2p-settings', isAuthenticated, async (req: any, res) => {
    try {
      const allowed = ['country', 'preferredCurrency', 'usdtTronWallet', 'usdtBscWallet', 'tonWallet', 'btcWallet', 'piWallet'];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = String(req.body[key] || '').trim() || null;
      }
      // Handle p2pWallets array (new flexible wallet storage)
      if (req.body.p2pWallets !== undefined) {
        const wallets = req.body.p2pWallets;
        if (Array.isArray(wallets)) {
          updates.p2pWallets = wallets;
          // Sync legacy fields from active wallets for backward compatibility
          const active = wallets.filter((w: any) => w.isActive && w.address);
          const findAddr = (crypto: string, nets: string[]) => {
            const w = active.find((w: any) =>
              w.crypto?.toUpperCase() === crypto &&
              nets.some((n: string) => w.network?.toUpperCase().includes(n))
            );
            return w?.address || null;
          };
          updates.usdtTronWallet = findAddr('USDT', ['TRON','TRC20']) || updates.usdtTronWallet;
          updates.usdtBscWallet  = findAddr('USDT', ['BSC','BEP20'])  || updates.usdtBscWallet;
          updates.tonWallet      = findAddr('USDT', ['TON']) || active.find((w: any) => w.crypto?.toUpperCase() === 'TON')?.address || updates.tonWallet;
          updates.piWallet       = findAddr('PI', ['PI']) || active.find((w: any) => w.crypto?.toUpperCase().includes('PI'))?.address || updates.piWallet;
          updates.btcWallet      = findAddr('BTC', ['BTC','BITCOIN']) || updates.btcWallet;
        }
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No valid fields to update' });
      const updatedUser = await storage.updateUserProfile(req.user.id, updates);
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

  app.get('/api/creator-portfolios/:identity', async (req, res) => {
    try {
      const identity = String(req.params.identity || '').trim();
      const user = await storage.getUserById(identity) || await storage.getUserByUsername(identity);
      if (!user || user.userType === 'brand') {
        return res.status(404).json({ message: 'Creator portfolio not found' });
      }

      const items = await storage.getUserPortfolio(user.id);
      return res.json({
        profile: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          bannerImageUrl: user.bannerImageUrl,
          bio: user.bio,
          location: user.location,
          website: user.website,
          skills: user.skills,
          niche: user.niche,
          instagramHandle: user.instagramHandle,
          tiktokHandle: user.tiktokHandle,
          youtubeHandle: user.youtubeHandle,
          twitterHandle: user.twitterHandle,
        },
        items: items.map(({ id, title, description, imageUrl, videoUrl, url, category }) => ({
          id, title, description, imageUrl, videoUrl, url, category,
        })),
      });
    } catch (error) {
      console.error('[creator portfolio] Failed to load public portfolio:', error);
      return res.status(500).json({ message: 'Could not load this creator portfolio' });
    }
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
      // ── Free brand hire gate ─────────────────────────────────────────────────
      const hireUser = await storage.getUser(req.user.id);
      if (getSubscriptionTier(hireUser) === 'free' && req.user.userType !== 'admin') {
        return res.status(403).json({
          message: 'Direct hiring requires a Premium Brand subscription. Upgrade to Monthly or Yearly to hire influencers directly.',
          upgradeRequired: true,
        });
      }
      const { influencerId, title, description, deliverables, budget, deadline } = req.body;
      if (!influencerId || !title || !description || !budget) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const baseBudget = Number(budget);
      const brandPlatformFee = 0; // Brands pay no platform fee
      const brandTotalCharge = baseBudget; // Brand pays exact budget amount
      const influencerPlatformFee = +(baseBudget * 0.10).toFixed(2); // 10% deducted from influencer only
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
      sendAdminActivityEmail({
        event: "hire_request",
        subject: `New developer hire request: ${title}`,
        recipient: TASKDRIP_EMAILS.developer,
        fromEmail: TASKDRIP_EMAILS.developer,
        customer: {
          name: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
          email: req.user.email,
          phone: req.user.phoneNumber,
        },
        details: [
          { label: "Request ID", value: offer.id },
          { label: "Project", value: title },
          { label: "Description", value: description },
          { label: "Deliverables", value: deliverables },
          { label: "Budget", value: baseBudget.toFixed(2) },
          { label: "Deadline", value: deadline },
          { label: "Status", value: offer.status },
        ],
      }).catch(() => {});
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
      const invoicePaymentMethods = await storage.getActivePaymentMethods("direct_hire");
      res.json({
        ...offer,
        invoicePaymentMethods: invoicePaymentMethods.map((method: any) => ({
          ...method,
          paystackSecretKey: undefined,
          stripeSecretKey: undefined,
        })),
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
      const expectedAmount = Number(offer.budget || 0); // Brand pays exact budget (no brand fee)
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
      if (offer.status === 'pending') {
        // Allow chat on pending offers only when the "influencer" is actually the admin developer
        const devRecipient = await storage.getUser(offer.influencerId);
        if (!devRecipient || devRecipient.userType !== 'admin') {
          return res.status(400).json({ message: 'Chat opens after the offer is accepted' });
        }
      }
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
      const brandFee = 0; // Brands pay no platform fee
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

  // Request mediation for a direct hire offer
  app.post('/api/direct-hire/:id/request-mediation', isAuthenticated, async (req: any, res) => {
    try {
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      if (offer.brandId !== req.user.id && offer.influencerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      if (!['active', 'work_submitted', 'revision_requested'].includes(offer.status)) {
        return res.status(400).json({ message: 'Mediation can only be requested on active projects' });
      }
      const reason = String(req.body.reason || '').trim();
      const admin = await storage.getAdminUser();
      const systemContent = `⚖️ Mediation requested by ${req.user.firstName}${reason ? `: "${reason}"` : ''}. An admin has been notified and will join shortly.`;
      await storage.createMessage({
        senderId: req.user.id,
        receiverId: req.user.id === offer.brandId ? offer.influencerId : offer.brandId,
        subject: `Direct hire: ${offer.title}`,
        content: systemContent,
        messageType: 'direct_hire',
        referenceType: 'direct_hire',
        referenceId: offer.id,
      } as any);
      if (admin) {
        await storage.createNotification({
          userId: admin.id,
          type: 'mediation_request',
          title: '⚖️ Mediation Requested',
          content: `${req.user.firstName} requested mediation on direct hire "${offer.title}". ${reason ? `Reason: ${reason}` : ''}`,
          actionUrl: `/direct-hire/${offer.id}`,
          isRead: false,
        } as any);
      }
      await storage.createNotification({
        userId: req.user.id === offer.brandId ? offer.influencerId : offer.brandId,
        type: 'mediation_request',
        title: '⚖️ Mediation Requested',
        content: `${req.user.firstName} has requested admin mediation for "${offer.title}".`,
        actionUrl: `/direct-hire/${offer.id}`,
        isRead: false,
      } as any);
      res.json({ success: true });
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
      // Use agreed budget (from invoice) when set, otherwise fall back to original budget
      const payableAmount = Number(offer.agreedBudget || offer.brandTotalCharge || offer.budget || 0);
      const verification = await verifyBlockchainTransaction(paymentNetwork, transactionHash, payableAmount);
      const updated = await storage.updateDirectHireOffer(req.params.id, {
        status: 'payment_submitted',
        transactionHash,
        paymentNetwork,
        paymentProof,
        adminNote: verification.message,
      });
      sendAdminActivityEmail({
        event: "payment",
        subject: `Developer hire payment submitted: ${offer.title}`,
        recipient: TASKDRIP_EMAILS.payments,
        fromEmail: TASKDRIP_EMAILS.payments,
        customer: {
          name: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
          email: req.user.email,
          phone: req.user.phoneNumber,
        },
        details: [
          { label: "Hire request ID", value: offer.id },
          { label: "Project", value: offer.title },
          { label: "Amount", value: payableAmount },
          { label: "Network", value: paymentNetwork },
          { label: "Transaction reference", value: transactionHash },
          { label: "Verification", value: verification.message },
          { label: "Status", value: updated.status },
        ],
      }).catch(() => {});
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
      // Use agreedBudget (from invoice) when set; fall back to original budget
      const authoritative = Number(offer.agreedBudget || offer.budget || 0);
      const platformFeeRate = 0.10;
      const platformFee = +(authoritative * platformFeeRate).toFixed(2);
      const payout = +(authoritative - platformFee).toFixed(2);
      const brandTotalCharge = authoritative; // Brand pays exact agreed/budgeted amount
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
        description: `Escrow funded for "${offer.title}"`,
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

  // ── ADMIN: Grant access / set delivery for paid orders ─────────────────
  // Shop purchases — set deliveryDetails (downloadUrl, accessUrl, licenseKey, accessNotes) and mark delivered
  app.patch('/api/admin/purchases/:id/deliver', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { downloadUrl, accessUrl, licenseKey, accessNotes, status, adminNotes } = req.body;
      const existing = await storage.getPurchaseById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Purchase not found' });
      const prev = (existing.deliveryDetails as any) || {};
      const deliveryDetails = {
        ...prev,
        ...(downloadUrl !== undefined ? { downloadUrl } : {}),
        ...(accessUrl !== undefined ? { accessUrl } : {}),
        ...(licenseKey !== undefined ? { licenseKey } : {}),
        ...(accessNotes !== undefined ? { accessNotes } : {}),
        grantedBy: req.user.id,
        grantedAt: new Date().toISOString(),
      };
      const updates: any = { deliveryDetails };
      if (status) updates.status = status;
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;
      if (status === 'delivered' || downloadUrl || accessUrl || licenseKey) {
        updates.deliveredAt = new Date();
      }
      const updated = await storage.updatePurchase(req.params.id, updates);
      const product = await storage.getShopProductById(existing.productId);
      await storage.createNotification({
        userId: existing.userId,
        type: 'order_delivered',
        title: '🎉 Your order is ready',
        content: `Your purchase of "${product?.title || 'product'}" has been fulfilled. View access details in My Orders.`,
        actionUrl: `/my-orders?order=${existing.id}`,
        relatedId: existing.id,
      });
      res.json(updated);
    } catch (e: any) {
      console.error('Error granting purchase access:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // ── Admin: approve purchase (pending → paid) ───────────────────────────
  app.patch('/api/admin/purchases/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const updated = await storage.updatePurchase(req.params.id, {
        status: 'paid',
        paidAt: new Date(),
      });
      const existing = await storage.getPurchaseById(req.params.id);
      if (existing) {
        const product = await storage.getShopProductById(existing.productId);
        await storage.createNotification({
          userId: existing.userId,
          type: 'order_approved',
          title: '✅ Payment Approved',
          content: `Your payment for "${product?.title || 'your order'}" has been approved. Delivery details will follow shortly.`,
          actionUrl: `/my-orders?order=${existing.id}`,
          relatedId: existing.id,
        });

        // ── 15% product referral commission ─────────────────────────────
        try {
          const PRODUCT_COMMISSION_RATE = 0.15;
          let referrerId: string | null = null;
          let refCode: string | null = (existing as any).referralCode || null;

          // 1. Check if purchase has an embedded referral code
          if (refCode) {
            const codeOwner = await storage.getUserByReferralCode(refCode);
            if (codeOwner && codeOwner.id !== existing.userId) referrerId = codeOwner.id;
          }
          // 2. Fall back: check if the buyer was referred by someone
          if (!referrerId) {
            const userReferral = await storage.getReferralByReferredId(existing.userId);
            if (userReferral) referrerId = userReferral.referrerId;
          }

          if (referrerId) {
            const saleAmount = parseFloat(existing.totalAmount as string || '0');
            const commissionAmount = (saleAmount * PRODUCT_COMMISSION_RATE).toFixed(2);
            await db.insert(referralCommissions).values({
              referrerId,
              referredUserId: existing.userId,
              itemType: 'product',
              itemId: existing.productId,
              itemTitle: product?.title || 'Product',
              saleAmount: saleAmount.toFixed(2),
              commissionRate: PRODUCT_COMMISSION_RATE.toFixed(4),
              commissionAmount,
              status: 'approved',
              referenceId: existing.id,
              referralCode: refCode || undefined,
              approvedAt: new Date(),
            });
            // Credit referrer's balance
            await storage.updateUserProfile(referrerId, {
              availableBalance: sql`${users.availableBalance} + ${parseFloat(commissionAmount)}` as any,
              referralBonusEarned: sql`${users.referralBonusEarned} + ${parseFloat(commissionAmount)}` as any,
            });
            await storage.createNotification({
              userId: referrerId,
              type: 'referral_bonus',
              title: `💰 Product Referral Commission — $${commissionAmount}!`,
              content: `Someone you referred just bought "${product?.title || 'a product'}". You earned a ${(PRODUCT_COMMISSION_RATE * 100).toFixed(0)}% commission of $${commissionAmount}.`,
              actionUrl: '/referrals',
              priority: 'high',
            });
          }
        } catch (commErr) { /* non-fatal */ }
      }
      res.json(updated);
    } catch (e: any) {
      console.error('Error approving purchase:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // ── Admin: disapprove / cancel purchase ────────────────────────────────
  app.patch('/api/admin/purchases/:id/disapprove', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const updated = await storage.updatePurchase(req.params.id, { status: 'cancelled' });
      const existing = await storage.getPurchaseById(req.params.id);
      if (existing) {
        const product = await storage.getShopProductById(existing.productId);
        await storage.createNotification({
          userId: existing.userId,
          type: 'order_cancelled',
          title: '❌ Order Cancelled',
          content: `Your order for "${product?.title || 'your order'}" was cancelled. Please contact support if you believe this is an error.`,
          actionUrl: `/my-orders?order=${existing.id}`,
          relatedId: existing.id,
        });
      }
      res.json(updated);
    } catch (e: any) {
      console.error('Error cancelling purchase:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // ── Admin: delete purchase record ──────────────────────────────────────
  app.delete('/api/admin/purchases/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      // Delete any product reviews linked to this purchase first
      await db.delete(productReviews).where(eq(productReviews.purchaseId, req.params.id));
      await db.delete(purchases).where(eq(purchases.id, req.params.id));
      res.json({ message: 'Purchase deleted' });
    } catch (e: any) {
      console.error('Error deleting purchase:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // Course enrollments — admin grants/activates and sets access link (e.g. private group)
  app.patch('/api/admin/enrollments/:id/grant', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { accessUrl, accessNotes, status } = req.body;
      const [existing] = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, req.params.id));
      if (!existing) return res.status(404).json({ message: 'Enrollment not found' });
      const updates: any = {
        approvedBy: req.user.id,
        approvedAt: new Date(),
        isPaid: true,
        status: status || 'active',
        updatedAt: new Date(),
      };
      const [updated] = await db.update(courseEnrollments).set(updates).where(eq(courseEnrollments.id, req.params.id)).returning();
      // Store accessUrl/notes in a notification so user can see it
      await storage.createNotification({
        userId: existing.userId,
        type: 'course_access_granted',
        title: '🎓 Course access granted',
        content: accessUrl
          ? `Your enrollment is active. Access link: ${accessUrl}${accessNotes ? `\n${accessNotes}` : ''}`
          : `Your enrollment is now active.${accessNotes ? `\n${accessNotes}` : ''}`,
        actionUrl: accessUrl || '/my-orders',
        relatedId: existing.id,
      });
      res.json(updated);
    } catch (e: any) {
      console.error('Error granting course access:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // Direct hire — admin attaches a deliverable link / access note
  app.patch('/api/admin/direct-hire/:id/grant', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { adminNote, workSubmissionUrl, status } = req.body;
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      const updated = await storage.updateDirectHireOffer(req.params.id, {
        ...(adminNote !== undefined ? { adminNote } : {}),
        ...(workSubmissionUrl !== undefined ? { workSubmissionUrl } : {}),
        ...(status ? { status } : {}),
      } as any);
      await storage.createNotification({
        userId: offer.brandId,
        type: 'direct_hire_update',
        title: '📦 Hire offer updated by admin',
        content: adminNote || 'Admin attached additional access details to your hire.',
        actionUrl: `/direct-hire/${offer.id}`,
        relatedId: offer.id,
      });
      res.json(updated);
    } catch (e: any) {
      console.error('Error granting hire access:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: generate invoice for a direct hire offer
  app.post('/api/admin/direct-hire/:id/generate-invoice', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });
      const { invoiceNote, invoiceDueDate, agreedBudget } = req.body;
      // Generate unique invoice number: INV-YYYYMM-XXXX
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${now.getFullYear()}${pad(now.getMonth() + 1)}-${suffix}`;
      // Move to 'accepted' so the payment flow gates open for the client
      const nextStatus = ['pending', 'accepted'].includes(offer.status) ? 'accepted' : offer.status;
      const updated = await storage.updateDirectHireOffer(req.params.id, {
        invoiceNumber,
        invoiceGeneratedAt: now,
        invoiceDueDate: invoiceDueDate ? new Date(invoiceDueDate) : null,
        invoiceNote: invoiceNote || null,
        agreedBudget: agreedBudget ? String(Number(agreedBudget).toFixed(2)) : offer.budget,
        status: nextStatus,
      } as any);
      const invoiceMethods = await storage.getActivePaymentMethods("direct_hire");
      // Notify client
      await storage.createNotification({
        userId: offer.brandId,
        type: 'direct_hire_invoice',
        title: '🧾 Invoice Ready — ' + invoiceNumber,
        content: `Your invoice for "${offer.title}" has been generated. Amount: $${agreedBudget || offer.budget}. View and download it from your project page.`,
        actionUrl: `/direct-hire/${offer.id}`,
        relatedId: offer.id,
      });
      // Also post a project chat message so the client sees it in the project thread
      await storage.createMessage({
        senderId: req.user.id,
        receiverId: offer.brandId,
        subject: `Direct hire: ${offer.title}`,
        content: `📄 Invoice ${invoiceNumber} has been generated for this project.\n💰 Amount: $${agreedBudget || offer.budget}\n${invoiceDueDate ? `📅 Due: ${new Date(invoiceDueDate).toLocaleDateString()}` : ''}\n${invoiceNote ? `📝 Note: ${invoiceNote}` : ''}\n\nPlease proceed to the payment section when ready.`,
        messageType: 'direct_hire',
        referenceType: 'direct_hire',
        referenceId: offer.id,
      } as any);
      sendAdminActivityEmail({
        event: "hire_request",
        subject: `Invoice generated: ${offer.title}`,
        recipient: TASKDRIP_EMAILS.payments,
        fromEmail: TASKDRIP_EMAILS.payments,
        customer: {
          name: `${(await storage.getUser(offer.brandId))?.firstName || ""} ${(await storage.getUser(offer.brandId))?.lastName || ""}`.trim(),
          email: (await storage.getUser(offer.brandId))?.email,
        },
        details: [
          { label: "Project", value: offer.title },
          { label: "Invoice number", value: invoiceNumber },
          { label: "Amount", value: `$${agreedBudget || offer.budget}` },
          { label: "Due date", value: invoiceDueDate || "Not specified" },
          { label: "Payment methods", value: invoiceMethods.map((m: any) => m.label).join(", ") || "None configured" },
        ],
      }).catch(() => {});
      res.json(updated);
    } catch (e: any) {
      console.error('Error generating invoice:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: send email to dev-hire client via Resend / configured provider
  app.post('/api/admin/direct-hire/:id/send-email', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Offer not found' });

      const { subject, body, alsoPostInChat } = req.body || {};
      if (!subject || !body) return res.status(400).json({ message: 'subject and body are required' });

      const client = await storage.getUser(offer.brandId);
      if (!client?.email) return res.status(400).json({ message: 'Client has no email address' });

      const { sendEmail, buildDefaultEmailHtml } = await import('./email-service');

      const bodyHtml = body.replace(/\n/g, "<br>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      const html = buildDefaultEmailHtml
        ? buildDefaultEmailHtml(`<h2 style="color:#1f2937;margin:0 0 16px">${subject}</h2><div style="line-height:1.7">${bodyHtml}</div>`, "Taskdrip Dev Team")
        : `<div style="font-family:sans-serif;max-width:600px;margin:auto"><h2>${subject}</h2><div>${bodyHtml}</div><hr><p style="font-size:12px;color:#888">Sent via Taskdrip Dev Team</p></div>`;

      const result = await sendEmail({
        to: client.email,
        toName: [client.firstName, client.lastName].filter(Boolean).join(' ') || undefined,
        subject,
        html,
      });

      if (!result.success) return res.status(500).json({ message: result.error || 'Email failed to send' });

      // Optionally also post in project chat
      if (alsoPostInChat) {
        await storage.createMessage({
          senderId: req.user.id,
          receiverId: offer.brandId,
          subject: `Direct hire: ${offer.title}`,
          content: `📧 Email sent to client:\n\n**${subject}**\n\n${body}`,
          messageType: 'direct_hire',
          referenceType: 'direct_hire',
          referenceId: offer.id,
        } as any);
      }

      res.json({ success: true, provider: result.provider, to: client.email });
    } catch (e: any) {
      console.error('Error sending hire email:', e);
      res.status(500).json({ message: e.message });
    }
  });

  // Admin: list all direct hire offers
  app.get('/api/admin/direct-hire', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const [admin, offers] = await Promise.all([
        storage.getAdminUser(),
        storage.getAllDirectHireOffers(),
      ]);
      const adminId = admin?.id;
      // Batch user lookups — collect unique IDs then fetch all in parallel
      const uniqueIds = [...new Set(offers.flatMap((o: any) => [o.brandId, o.influencerId]).filter(Boolean))];
      const userArr = await Promise.all(uniqueIds.map((id: string) => storage.getUser(id)));
      const userMap: Record<string, any> = {};
      userArr.forEach((u: any) => { if (u) userMap[u.id] = u; });

      const enriched = offers.map((o: any) => {
        const brand = userMap[o.brandId];
        const influencer = userMap[o.influencerId];
        return {
          ...o,
          // Flag dev-hire requests (user→admin) vs brand→influencer direct hires
          isDevHire: adminId ? o.influencerId === adminId : false,
          brand: brand ? {
            id: brand.id,
            firstName: brand.firstName,
            lastName: brand.lastName,
            companyName: brand.companyName,
            email: brand.email,
            username: brand.username,
          } : null,
          influencer: influencer ? {
            id: influencer.id,
            firstName: influencer.firstName,
            lastName: influencer.lastName,
            email: influencer.email,
            username: influencer.username,
          } : null,
        };
      });
      res.json(enriched);
    } catch (e: any) {
      console.error('/api/admin/direct-hire error:', e.message);
      // Return empty array for schema errors so the panel shows "No hires yet"
      // rather than "Failed to load hires" (table/column missing before migration)
      if (e.code === '42P01' || e.code === '42703' || e.code === '42P07') return res.json([]);
      res.status(500).json({ message: e.message });
    }
  });

  // ── Admin: Full payout center (enriched with campaign/direct-hire linkage) ──
  app.get('/api/admin/payouts', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const all = await storage.getAllPayoutRequests();
      const enriched = await Promise.all(all.map(async (r: any) => {
        const user = await storage.getUser(r.userId);
        const processedByUser = r.processedBy ? await storage.getUser(r.processedBy) : null;
        // Fetch linked source
        let campaignData = null;
        let directHireData = null;
        if (r.campaignId) {
          campaignData = await storage.getCampaign(r.campaignId);
        }
        if (r.directHireId) {
          const offer = await storage.getDirectHireOffer(r.directHireId);
          if (offer) {
            const brand = await storage.getUser(offer.brandId);
            directHireData = { ...offer, brand: brand ? { firstName: brand.firstName, lastName: brand.lastName, companyName: brand.companyName } : null };
          }
        }
        // Fetch payout messages
        const msgs = await storage.getPayoutMessages(r.id);
        return {
          ...r,
          user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, profileImageUrl: (user as any).profileImageUrl, creatorTier: (user as any).creatorTier, walletAddress: (user as any).walletAddress } : null,
          processedByUser: processedByUser ? { firstName: processedByUser.firstName, lastName: processedByUser.lastName } : null,
          campaign: campaignData,
          directHire: directHireData,
          messageCount: msgs.length,
          messages: msgs,
        };
      }));
      // Sort: pending first, then by newest
      enriched.sort((a, b) => {
        const order = ['pending', 'processing', 'completed', 'rejected'];
        const ai = order.indexOf(a.status);
        const bi = order.indexOf(b.status);
        if (ai !== bi) return ai - bi;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      res.json(enriched);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: process a payout (approve with tx hash / reject with notes) — bank-level audit
  app.patch('/api/admin/payouts/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { status, adminNotes, transactionHash } = req.body;
      if (!['processing', 'completed', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

      const all = await storage.getAllPayoutRequests();
      const current = all.find((r: any) => r.id === req.params.id);
      if (!current) return res.status(404).json({ message: 'Payout request not found' });

      // Prevent re-processing a completed or rejected request
      if (['completed', 'rejected'].includes(current.status)) {
        return res.status(409).json({ message: `Cannot change a ${current.status} payout request` });
      }
      if (status === 'completed' && !transactionHash) {
        return res.status(400).json({ message: 'Transaction hash is required to mark payout as completed' });
      }

      const updated = await storage.updatePayoutRequest(req.params.id, {
        status,
        adminNotes,
        transactionHash,
        processedBy: req.user.id,
        processedAt: new Date(),
      } as any);

      // Refund on rejection
      if (status === 'rejected' && current.status !== 'rejected') {
        const refundAmount = parseFloat(current.amount || '0');
        if (refundAmount > 0) await storage.updateUserBalance(current.userId, refundAmount, 'add');
      }

      // Notify influencer
      await storage.createNotification({
        userId: current.userId,
        type: 'payout_update',
        title: status === 'completed' ? 'Payout Sent! 🎉' : status === 'rejected' ? 'Payout Rejected — Funds Returned' : 'Payout Being Processed...',
        content: adminNotes || (status === 'completed' ? `Your payout of $${current.amount} USDT has been sent. TX: ${transactionHash}` : status === 'rejected' ? 'Your payout was rejected. Funds have been returned to your wallet balance.' : 'Admin is processing your payout request.'),
        isRead: false,
      } as any);

      // Post a system message on the payout thread
      await storage.createPayoutMessage(req.params.id, req.user.id,
        status === 'completed'
          ? `✅ Payout completed. Transaction hash: ${transactionHash}${adminNotes ? `\n\nNotes: ${adminNotes}` : ''}`
          : status === 'rejected'
            ? `❌ Payout rejected and funds refunded.${adminNotes ? `\n\nReason: ${adminNotes}` : ''}`
            : `⏳ Payout marked as processing.${adminNotes ? `\n\nNotes: ${adminNotes}` : ''}`
      );

      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: get full conversation thread for a campaign (all participants + messages)
  app.get('/api/admin/campaigns/:id/thread', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      const participations = await storage.getCampaignParticipations(req.params.id);
      const allMessages = await storage.getCampaignMessages(req.params.id);
      // Enrich participations with user info
      const enrichedParticipations = await Promise.all(participations.map(async (p: any) => {
        const user = await storage.getUser(p.userId);
        return { ...p, user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, profileImageUrl: (user as any).profileImageUrl, creatorTier: (user as any).creatorTier } : null };
      }));
      // Enrich messages with sender info
      const enrichedMessages = await Promise.all(allMessages.map(async (m: any) => {
        const sender = await storage.getUser(m.senderId);
        const receiver = await storage.getUser(m.receiverId);
        return { ...m, sender: sender ? { id: sender.id, firstName: sender.firstName, lastName: sender.lastName, userType: sender.userType } : null, receiver: receiver ? { id: receiver.id, firstName: receiver.firstName, lastName: receiver.lastName, userType: receiver.userType } : null };
      }));
      res.json({ campaign, participations: enrichedParticipations, messages: enrichedMessages });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: get full conversation thread for a direct hire offer
  app.get('/api/admin/direct-hire/:id/thread', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const offer = await storage.getDirectHireOffer(req.params.id);
      if (!offer) return res.status(404).json({ message: 'Direct hire offer not found' });
      const brand = await storage.getUser(offer.brandId);
      const influencer = await storage.getUser(offer.influencerId);
      // Get messages linked to this direct hire via referenceType/referenceId
      const allMessages = await storage.getMessagesByReference('direct_hire', req.params.id);
      const enrichedMessages = await Promise.all(allMessages.map(async (m: any) => {
        const sender = await storage.getUser(m.senderId);
        const receiver = await storage.getUser(m.receiverId);
        return { ...m, sender: sender ? { id: sender.id, firstName: sender.firstName, lastName: sender.lastName, userType: sender.userType } : null, receiver: receiver ? { id: receiver.id, firstName: receiver.firstName, lastName: receiver.lastName, userType: receiver.userType } : null };
      }));
      // Parse phone/whatsapp from description (stored by hire-developer form)
      const descPhone = (() => {
        const m = (offer.description || '').match(/📞 Phone\/WhatsApp:\s*([^\n]+)/);
        return m ? m[1].trim() : null;
      })();
      const descTelegram = (() => {
        const m = (offer.description || '').match(/✈️ Telegram:\s*@?([^\n]+)/);
        return m ? m[1].trim() : null;
      })();
      const descEmail = (() => {
        const m = (offer.description || '').match(/📧 Email:\s*([^\n]+)/);
        return m ? m[1].trim() : null;
      })();
      const preferredContact = (() => {
        const m = (offer.description || '').match(/⭐ Preferred contact:\s*([^\n]+)/);
        return m ? m[1].trim() : null;
      })();

      res.json({
        offer: {
          ...offer,
          brand: brand ? {
            firstName: brand.firstName,
            lastName: brand.lastName,
            companyName: brand.companyName,
            email: brand.email,
            phone: (brand as any).phoneNumber || descPhone || null,
            whatsapp: descPhone || (brand as any).phoneNumber || null,
            telegram: descTelegram,
            contactEmail: descEmail || brand.email,
            preferredContact,
          } : null,
          influencer: influencer ? { firstName: influencer.firstName, lastName: influencer.lastName, email: influencer.email } : null,
        },
        messages: enrichedMessages,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/p2p/listings/featured', async (req: any, res) => {
    try {
      const rows = await db.select().from(p2pListings)
        .where(and(eq(p2pListings.status, 'approved'), eq(p2pListings.isFeatured, true)))
        .orderBy(desc(p2pListings.createdAt))
        .limit(6);
      res.json(await Promise.all(rows.map(enrichP2PListing)));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/p2p/listings/:id', async (req: any, res) => {
    try {
      const [listing] = await db.select().from(p2pListings).where(eq(p2pListings.id, req.params.id));
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      if (listing.status !== 'approved') return res.status(404).json({ message: 'Listing not found' });
      res.json(await enrichP2PListing(listing));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/p2p/listings', async (req: any, res) => {
    try {
      const type = String(req.query.type || 'all');
      const subtype = String(req.query.subtype || '');
      const country = String(req.query.country || '');
      const currency = String(req.query.currency || '');
      const search = String(req.query.search || '');
      const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
      const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

      let conditions: any[] = [eq(p2pListings.status, 'approved')];
      if (type !== 'all' && p2pTypes.includes(type)) conditions.push(eq(p2pListings.listingType, type));
      if (subtype) conditions.push(eq(p2pListings.productSubtype as any, subtype));
      if (country) conditions.push(eq(p2pListings.country as any, country));
      if (currency) conditions.push(eq(p2pListings.currency as any, currency));

      let rows = await db.select().from(p2pListings)
        .where(and(...conditions))
        .orderBy(desc(p2pListings.createdAt));

      // In-memory filters for search and price range
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
      }
      if (minPrice !== null) rows = rows.filter(r => Number(r.price) >= minPrice!);
      if (maxPrice !== null) rows = rows.filter(r => Number(r.price) <= maxPrice!);

      res.json(await Promise.all(rows.map(enrichP2PListing)));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/p2p/listings', isAuthenticated, upload.single('featuredImage'), async (req: any, res) => {
    try {
      // ── Free user gate (admins bypass) ────────────────────────────────────────
      const p2pUser = await storage.getUser(req.user.id);
      const isAdminUser = req.user.userType === 'admin' || (p2pUser as any)?.role === 'admin';
      if (!isAdminUser && getSubscriptionTier(p2pUser) === 'free') {
        return res.status(403).json({
          message: 'P2P listing requires a Premium subscription. Upgrade to Monthly or Yearly to start selling.',
          upgradeRequired: true,
        });
      }

      const listingType = String(req.body.listingType || '').toLowerCase();
      if (!p2pTypes.includes(listingType)) return res.status(400).json({ message: 'Invalid listing type' });
      const title = String(req.body.title || '').trim();
      const description = String(req.body.description || '').trim();
      const price = Number(req.body.price);
      const paymentMethod = String(req.body.paymentMethod || '').trim();
      if (!title || !description || !paymentMethod || !Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ message: 'Title, description, price, and payment method are required' });
      }
      const currency = String(req.body.currency || 'USD').trim().toUpperCase();
      const country = String(req.body.country || '').trim();
      const productSubtype = String(req.body.productSubtype || '').trim();
      const cryptoAsset = String(req.body.cryptoAsset || '').trim();
      const shippingInfo = String(req.body.shippingInfo || '').trim();
      const minOrder = req.body.minOrder ? Number(req.body.minOrder) : null;
      const maxOrder = req.body.maxOrder ? Number(req.body.maxOrder) : null;
      const tdripAddon = parseTdripAddon(req.body);
      const taskAddons = parseJsonArrayField(req.body.taskAddons);

      const [listing] = await db.insert(p2pListings).values({
        sellerId: req.user.id,
        title,
        listingType,
        productSubtype: productSubtype || null,
        description,
        price: price.toFixed(2),
        currency,
        minOrder: minOrder ? minOrder.toFixed(2) : null,
        maxOrder: maxOrder ? maxOrder.toFixed(2) : null,
        cryptoAsset: cryptoAsset || null,
        paymentMethod,
        country: country || (req.user as any).country || null,
        shippingInfo: shippingInfo || null,
        taskAddons,
        ...tdripAddon,
        featuredImage: req.file ? `/uploads/${req.file.filename}` : null,
        status: 'pending',
      }).returning();
      await logP2PAction(req.user.id, 'listing_created', { listingId: listing.id });
      const admins = await storage.getUsersByType('admin');
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: 'p2p_listing_pending',
          title: 'New P2P listing pending',
          content: `${req.user.firstName} submitted "${title}" for approval.`,
          actionUrl: '/admin/p2p-transactions',
        });
      }
      res.json(listing);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/p2p/listings/:id/task-addon-submissions', isAuthenticated, upload.single('proofScreenshot'), async (req: any, res) => {
    try {
      const [listing] = await db.select().from(p2pListings).where(eq(p2pListings.id, req.params.id));
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      if (listing.status !== 'approved') return res.status(400).json({ message: 'Listing is not active' });
      if (listing.sellerId === req.user.id) return res.status(400).json({ message: 'You cannot submit tasks on your own listing' });

      const taskIndex = parseInt(String(req.body.taskIndex || '0'), 10);
      const proofType = String(req.body.proofType || 'link');
      const proofUrl = String(req.body.proofUrl || '').trim();
      const proofNote = String(req.body.proofNote || '').trim();
      const taskDescription = String(req.body.taskDescription || '').trim();

      if (proofUrl) {
        const urlScan = scanUrl(proofUrl);
        if (!urlScan.isSafe) {
          return res.status(400).json({ message: `Unsafe URL detected: ${urlScan.threats.join(', ')}. Submitting malicious links may result in account ban.`, securityViolation: true });
        }
      }

      const existing = await db.select().from(p2pTaskAddonSubmissions).where(
        and(eq(p2pTaskAddonSubmissions.listingId, req.params.id), eq(p2pTaskAddonSubmissions.userId, req.user.id), eq(p2pTaskAddonSubmissions.taskIndex, taskIndex))
      );
      if (existing.length > 0 && existing[0].status === 'approved') {
        return res.status(400).json({ message: 'You have already completed this task' });
      }

      const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;
      const [submission] = await db.insert(p2pTaskAddonSubmissions).values({
        listingId: req.params.id,
        userId: req.user.id,
        taskIndex,
        taskDescription,
        proofType,
        proofUrl: proofUrl || null,
        proofScreenshot: screenshotPath,
        proofNote: proofNote || null,
        status: 'pending',
      }).returning();

      const seller = await storage.getUser(listing.sellerId);
      if (seller) {
        await storage.createNotification({
          userId: seller.id,
          type: 'task_addon_submitted',
          title: 'Task addon submitted',
          content: `${req.user.firstName} submitted proof for a task in your listing "${listing.title}".`,
          actionUrl: `/p2p-hub`,
        });
      }
      res.json(submission);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/p2p/listings/:id/task-addon-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const [listing] = await db.select().from(p2pListings).where(eq(p2pListings.id, req.params.id));
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      if (listing.sellerId !== req.user.id && !isAdminUser(req.user)) {
        return res.status(403).json({ message: 'Only the listing owner can view submissions' });
      }
      const submissions = await db.select().from(p2pTaskAddonSubmissions).where(eq(p2pTaskAddonSubmissions.listingId, req.params.id)).orderBy(desc(p2pTaskAddonSubmissions.createdAt));
      res.json(submissions);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/my/task-addon-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const submissions = await db.select().from(p2pTaskAddonSubmissions).where(eq(p2pTaskAddonSubmissions.userId, req.user.id)).orderBy(desc(p2pTaskAddonSubmissions.createdAt));
      res.json(submissions);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/task-addon-submissions/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const [sub] = await db.select().from(p2pTaskAddonSubmissions).where(eq(p2pTaskAddonSubmissions.id, req.params.id));
      if (!sub) return res.status(404).json({ message: 'Submission not found' });
      const [listing] = await db.select().from(p2pListings).where(eq(p2pListings.id, sub.listingId));
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      if (listing.sellerId !== req.user.id && !isAdminUser(req.user)) {
        return res.status(403).json({ message: 'Only the listing owner can review submissions' });
      }
      const action = String(req.body.action || '');
      const reviewNote = String(req.body.reviewNote || '').trim();
      if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Action must be approve or reject' });

      const [updated] = await db.update(p2pTaskAddonSubmissions).set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewNote: reviewNote || null,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      }).where(eq(p2pTaskAddonSubmissions.id, req.params.id)).returning();

      if (action === 'approve' && listing.tdripPointsPerParticipant) {
        try {
          await storage.awardPoints(sub.userId, 'task_addon_reward', listing.tdripPointsPerParticipant, `Task addon reward from listing "${listing.title}"`, listing.id);
        } catch {}
      }

      await storage.createNotification({
        userId: sub.userId,
        type: action === 'approve' ? 'task_addon_approved' : 'task_addon_rejected',
        title: action === 'approve' ? 'Task addon approved!' : 'Task addon rejected',
        content: action === 'approve'
          ? `Your task submission for "${listing.title}" was approved!${listing.tdripPointsPerParticipant ? ` You earned ${listing.tdripPointsPerParticipant} $TDRIP.` : ''}`
          : `Your task submission for "${listing.title}" was rejected.${reviewNote ? ` Reason: ${reviewNote}` : ''}`,
        actionUrl: `/p2p-hub`,
      });

      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/seller/task-addon-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const sellerListings = await db.select({ id: p2pListings.id, title: p2pListings.title }).from(p2pListings).where(eq(p2pListings.sellerId, req.user.id));
      if (sellerListings.length === 0) return res.json([]);
      const listingIds = sellerListings.map(l => l.id);
      const listingTitleMap = Object.fromEntries(sellerListings.map(l => [l.id, l.title]));
      const submissions = await db.select().from(p2pTaskAddonSubmissions).where(
        inArray(p2pTaskAddonSubmissions.listingId, listingIds)
      ).orderBy(desc(p2pTaskAddonSubmissions.createdAt));
      const submissionsWithTitle = submissions.map(s => ({ ...s, listingTitle: listingTitleMap[s.listingId] || '' }));
      res.json(submissionsWithTitle);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/content/scan', isAuthenticated, async (req: any, res) => {
    try {
      const { text, url } = req.body;
      if (url) {
        const result = scanUrl(String(url));
        return res.json(result);
      }
      if (text) {
        const result = scanTextContent(String(text));
        return res.json(result);
      }
      res.json({ isSafe: true, threats: [] });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/p2p/listings/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const [listing] = await db.select().from(p2pListings).where(eq(p2pListings.id, req.params.id));
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      if (listing.status !== 'approved') return res.status(400).json({ message: 'Listing is not live yet' });
      if (listing.sellerId === req.user.id) return res.status(400).json({ message: 'You cannot accept your own listing' });
      const active = await db.select().from(p2pTransactions).where(sql`${p2pTransactions.listingId} = ${listing.id} AND ${p2pTransactions.buyerId} = ${req.user.id} AND ${p2pTransactions.status} IN ('pending','funded','delivered','disputed')`);
      if (active.length) return res.status(400).json({ message: 'You already have an active deal for this listing' });
      const admins = await storage.getUsersByType('admin');
      const seller = await storage.getUser(listing.sellerId);
      const config = await getP2PFeeConfig(listing.listingType);
      const amount = Number(listing.price);
      const buyerFee = calculateP2PFee(amount, config);
      const sellerFee = calculateSellerFee(amount, config);
      const fee = buyerFee; // buyer's fee = total escrow obligation
      const totalAmount = amount + buyerFee;
      const netAmount = amount - sellerFee; // seller receives amount minus their fee

      // Determine seller's receiving wallet based on payment method
      const payMethod = (listing.paymentMethod || '').toLowerCase();
      let sellerWallet = '';
      if (payMethod.includes('tron') || payMethod.includes('trc20')) sellerWallet = (seller as any)?.usdtTronWallet || '';
      else if (payMethod.includes('bsc') || payMethod.includes('bep20')) sellerWallet = (seller as any)?.usdtBscWallet || '';
      else if (payMethod.includes('ton')) sellerWallet = (seller as any)?.tonWallet || '';
      else if (payMethod.includes('pi network') || payMethod.includes('pi coin')) sellerWallet = (seller as any)?.piWallet || '';
      else if (payMethod.includes('btc') || payMethod.includes('bitcoin')) sellerWallet = (seller as any)?.btcWallet || '';
      else if (payMethod.includes('trx') || payMethod.includes('tron')) sellerWallet = (seller as any)?.usdtTronWallet || '';
      else if (payMethod.includes('xrp') || payMethod.includes('ripple')) sellerWallet = (seller as any)?.btcWallet || '';
      else if (payMethod.includes('doge')) sellerWallet = (seller as any)?.btcWallet || '';

      // Buyer's crypto wallet for refund (from body or profile)
      const buyerCryptoWallet = String(req.body.buyerCryptoWallet || (req.user as any).usdtTronWallet || '');
      // Shipping address for physical products
      const shippingAddress = listing.productSubtype === 'physical' ? String(req.body.shippingAddress || '') : null;

      const [tx] = await db.insert(p2pTransactions).values({
        listingId: listing.id,
        buyerId: req.user.id,
        sellerId: listing.sellerId,
        adminId: admins[0]?.id || null,
        amount: amount.toFixed(2),
        fee: fee.toFixed(2),
        buyerFee: buyerFee.toFixed(2),
        sellerFee: sellerFee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        currency: listing.currency || 'USD',
        transactionType: listing.listingType,
        status: 'pending',
        sellerCryptoWallet: sellerWallet || null,
        buyerCryptoWallet: buyerCryptoWallet || null,
        shippingAddress,
      }).returning();
      await db.insert(p2pMessages).values({
        transactionId: tx.id,
        senderId: req.user.id,
        content: `I accepted this ${listing.listingType} offer. Total due: $${totalAmount.toFixed(2)}.`,
      });
      await logP2PAction(req.user.id, 'transaction_created', { transactionId: tx.id, listingId: listing.id });
      await storage.createNotification({
        userId: listing.sellerId,
        type: 'p2p_transaction_created',
        title: 'New P2P deal started',
        content: `${req.user.firstName} accepted "${listing.title}".`,
        actionUrl: `/p2p-deals/${tx.id}`,
      });
      for (const admin of admins) {
        await storage.createNotification({
          userId: admin.id,
          type: 'p2p_transaction_created',
          title: 'P2P transaction alert',
          content: `New P2P deal: "${listing.title}" for $${totalAmount.toFixed(2)}.`,
          actionUrl: `/admin/p2p-transactions`,
        });
      }
      res.json(await enrichP2PTransaction(tx));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/p2p/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const rows = isAdminUser(req.user)
        ? await db.select().from(p2pTransactions).orderBy(desc(p2pTransactions.createdAt))
        : await db.select().from(p2pTransactions).where(sql`${p2pTransactions.buyerId} = ${req.user.id} OR ${p2pTransactions.sellerId} = ${req.user.id}`).orderBy(desc(p2pTransactions.createdAt));
      res.json(await Promise.all(rows.map(enrichP2PTransaction)));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/p2p/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (!isAdminUser(req.user) && tx.buyerId !== req.user.id && tx.sellerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      res.json(await enrichP2PTransaction(tx));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/p2p/transactions/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (!isAdminUser(req.user) && tx.buyerId !== req.user.id && tx.sellerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      const rows = await db.select().from(p2pMessages).where(eq(p2pMessages.transactionId, tx.id)).orderBy(p2pMessages.createdAt);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/p2p/transactions/:id/messages', isAuthenticated, upload.single('attachment'), async (req: any, res) => {
    try {
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (!isAdminUser(req.user) && tx.buyerId !== req.user.id && tx.sellerId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      const content = String(req.body.content || '').trim();
      if (!content && !req.file) return res.status(400).json({ message: 'Message or file is required' });
      const [message] = await db.insert(p2pMessages).values({
        transactionId: tx.id,
        senderId: req.user.id,
        content: content || 'Uploaded a file',
        attachmentUrl: req.file ? `/uploads/${req.file.filename}` : null,
      }).returning();
      res.json(message);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/p2p/transactions/:id/mark-paid', isAuthenticated, upload.single('paymentProof'), async (req: any, res) => {
    try {
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (tx.buyerId !== req.user.id) return res.status(403).json({ message: 'Only buyer can mark paid' });
      if (tx.status !== 'pending') return res.status(400).json({ message: 'Payment can only be marked while pending' });
      const [updated] = await db.update(p2pTransactions).set({
        paymentMarkedAt: new Date(),
        paymentProof: req.file ? `/uploads/${req.file.filename}` : tx.paymentProof,
        paymentNote: String(req.body.paymentNote || ''),
        updatedAt: new Date(),
      }).where(eq(p2pTransactions.id, tx.id)).returning();
      await logP2PAction(req.user.id, 'payment_marked', { transactionId: tx.id });
      const admins = await storage.getUsersByType('admin');
      for (const admin of admins) {
        await storage.createNotification({ userId: admin.id, type: 'p2p_payment_marked', title: 'P2P payment marked', content: `Buyer marked transaction ${tx.id} as paid.`, actionUrl: '/admin/p2p-transactions' });
      }
      res.json(await enrichP2PTransaction(updated));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/p2p-transactions/:id/confirm-payment', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (tx.status !== 'pending') return res.status(400).json({ message: 'Only pending deals can be funded' });
      const [updated] = await db.update(p2pTransactions).set({ status: 'funded', fundedAt: new Date(), adminId: req.user.id, adminNote: req.body.note || tx.adminNote, updatedAt: new Date() }).where(eq(p2pTransactions.id, tx.id)).returning();
      await logP2PAction(req.user.id, 'payment_confirmed', { transactionId: tx.id, details: req.body.note || '' });
      await storage.createNotification({ userId: tx.sellerId, type: 'p2p_funded', title: 'P2P escrow funded', content: 'Admin confirmed payment. You can deliver now.', actionUrl: `/p2p-deals/${tx.id}` });
      res.json(await enrichP2PTransaction(updated));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/p2p/transactions/:id/deliver', isAuthenticated, async (req: any, res) => {
    try {
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (tx.sellerId !== req.user.id) return res.status(403).json({ message: 'Only seller can deliver' });
      if (tx.status !== 'funded') return res.status(400).json({ message: 'Deal must be funded before delivery' });
      const [updated] = await db.update(p2pTransactions).set({ status: 'delivered', deliveredAt: new Date(), deliveryNote: String(req.body.deliveryNote || ''), updatedAt: new Date() }).where(eq(p2pTransactions.id, tx.id)).returning();
      await logP2PAction(req.user.id, 'delivered', { transactionId: tx.id });
      await storage.createNotification({ userId: tx.buyerId, type: 'p2p_delivered', title: 'P2P delivery submitted', content: 'Seller delivered. Please confirm when received.', actionUrl: `/p2p-deals/${tx.id}` });
      res.json(await enrichP2PTransaction(updated));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/p2p/transactions/:id/confirm-received', isAuthenticated, async (req: any, res) => {
    try {
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (tx.buyerId !== req.user.id) return res.status(403).json({ message: 'Only buyer can confirm received' });
      if (tx.status !== 'delivered') return res.status(400).json({ message: 'Deal must be delivered first' });
      const [updated] = await db.update(p2pTransactions).set({ buyerConfirmedAt: new Date(), updatedAt: new Date() }).where(eq(p2pTransactions.id, tx.id)).returning();
      await logP2PAction(req.user.id, 'buyer_confirmed', { transactionId: tx.id });
      const admins = await storage.getUsersByType('admin');
      for (const admin of admins) {
        await storage.createNotification({ userId: admin.id, type: 'p2p_ready_release', title: 'P2P ready for release', content: `Buyer confirmed receipt for ${tx.id}.`, actionUrl: '/admin/p2p-transactions' });
      }
      res.json(await enrichP2PTransaction(updated));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/p2p/transactions/:id/dispute', isAuthenticated, async (req: any, res) => {
    try {
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (tx.buyerId !== req.user.id && tx.sellerId !== req.user.id) return res.status(403).json({ message: 'Only buyer or seller can dispute' });
      if (!['pending', 'funded', 'delivered'].includes(tx.status)) return res.status(400).json({ message: 'This deal cannot be disputed now' });
      const [updated] = await db.update(p2pTransactions).set({ status: 'disputed', disputeReason: String(req.body.reason || ''), updatedAt: new Date() }).where(eq(p2pTransactions.id, tx.id)).returning();
      await logP2PAction(req.user.id, 'dispute_opened', { transactionId: tx.id, details: req.body.reason || '' });
      const admins = await storage.getUsersByType('admin');
      for (const admin of admins) {
        await storage.createNotification({ userId: admin.id, type: 'p2p_dispute', title: 'P2P dispute opened', content: `A dispute was opened for ${tx.id}.`, actionUrl: '/admin/p2p-transactions' });
      }
      res.json(await enrichP2PTransaction(updated));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/p2p-transactions/:id/release', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (!['delivered', 'disputed'].includes(tx.status)) return res.status(400).json({ message: 'Deal must be delivered or disputed before release' });
      await db.update(users).set({ availableBalance: sql`${users.availableBalance} + ${Number(tx.netAmount)}`, totalEarned: sql`${users.totalEarned} + ${Number(tx.netAmount)}`, updatedAt: new Date() }).where(eq(users.id, tx.sellerId));
      const [updated] = await db.update(p2pTransactions).set({ status: 'completed', releasedAt: new Date(), adminId: req.user.id, disputeWinnerId: tx.sellerId, adminNote: req.body.note || tx.adminNote, updatedAt: new Date() }).where(eq(p2pTransactions.id, tx.id)).returning();
      await storage.createTransaction({ userId: tx.sellerId, amount: tx.netAmount, type: 'p2p_payout', status: 'completed', description: `P2P escrow release for transaction ${tx.id}`, referenceType: 'p2p', referenceId: tx.id, processedAt: new Date() } as any);
      await storage.createTransaction({ userId: req.user.id, amount: tx.fee, type: 'p2p_fee_revenue', status: 'completed', description: `P2P fee revenue for transaction ${tx.id}`, referenceType: 'p2p', referenceId: tx.id, processedAt: new Date() } as any);
      await logP2PAction(req.user.id, 'funds_released', { transactionId: tx.id, details: req.body.note || '' });
      await storage.createNotification({ userId: tx.sellerId, type: 'p2p_released', title: 'P2P funds released', content: `$${Number(tx.netAmount).toFixed(2)} has been added to your balance.`, actionUrl: `/p2p-deals/${tx.id}` });
      res.json(await enrichP2PTransaction(updated));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/p2p-transactions/:id/refund', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const [tx] = await db.select().from(p2pTransactions).where(eq(p2pTransactions.id, req.params.id));
      if (!tx) return res.status(404).json({ message: 'Transaction not found' });
      if (['completed', 'refunded', 'cancelled'].includes(tx.status)) return res.status(400).json({ message: 'Deal is already closed' });
      const [updated] = await db.update(p2pTransactions).set({ status: 'refunded', refundedAt: new Date(), adminId: req.user.id, disputeWinnerId: tx.buyerId, adminNote: req.body.note || tx.adminNote, updatedAt: new Date() }).where(eq(p2pTransactions.id, tx.id)).returning();
      await logP2PAction(req.user.id, 'refunded', { transactionId: tx.id, details: req.body.note || '' });
      await storage.createNotification({ userId: tx.buyerId, type: 'p2p_refunded', title: 'P2P refund approved', content: `Admin marked transaction ${tx.id} as refunded.`, actionUrl: `/p2p-deals/${tx.id}` });
      res.json(await enrichP2PTransaction(updated));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/p2p-listings/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const updates: any = { updatedAt: new Date() };
      if (req.body.status !== undefined) {
        const status = String(req.body.status);
        if (!['approved', 'rejected', 'pending', 'removed', 'expired'].includes(status)) return res.status(400).json({ message: 'Invalid listing status' });
        updates.status = status;
        updates.approvedBy = status === 'approved' ? req.user.id : null;
        updates.approvedAt = status === 'approved' ? new Date() : null;
      }
      if (req.body.adminNote !== undefined) updates.adminNote = req.body.adminNote;
      if (req.body.isFeatured !== undefined) updates.isFeatured = req.body.isFeatured === true || req.body.isFeatured === 'true';
      const [listing] = await db.update(p2pListings).set(updates).where(eq(p2pListings.id, req.params.id)).returning();
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      await logP2PAction(req.user.id, `listing_updated`, { listingId: listing.id, details: JSON.stringify(updates) });
      res.json(await enrichP2PListing(listing));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: seed demo P2P listings
  app.post('/api/admin/p2p-seed', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageStore(req.user)) return res.status(403).json({ message: 'Store manager only' });
      const sellerId = req.user.id;
      const demoListings = [
        // Crypto trades
        { title: 'Buy 1,000 USDT (TRC-20) — Fast Settlement', listingType: 'crypto', description: 'Looking to buy 1,000 USDT on the Tron (TRC-20) network. Payment via bank transfer or PayPal. Fast settlement within 30 minutes. Reputable seller with 50+ completed trades. Admin-escrow protected for safety.', price: '1000.00', paymentMethod: 'Bank Transfer / USDT', featuredImage: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=600&q=80' },
        { title: 'Sell 0.05 BTC for USDT — Market Rate', listingType: 'crypto', description: 'Selling 0.05 BTC (Bitcoin) for USDT at current market rate. Trade fully protected by Taskdrip escrow. Funds confirmed before BTC release. Deal room chat included for smooth communication.', price: '3200.00', paymentMethod: 'USDT (BSC / TRC-20)', featuredImage: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80' },
        { title: 'ETH → USDT Swap, No Delays', listingType: 'crypto', description: 'Swap your Ethereum (ETH) for USDT instantly via the Taskdrip P2P Deal Room. No unnecessary KYC, admin-escrow protected. Minimum 0.2 ETH per trade. Verified account, 100% trade completion rate.', price: '490.00', paymentMethod: 'ETH / USDT', featuredImage: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=600&q=80' },
        // Products
        { title: 'NFT Creator Pro Toolkit (200+ Templates)', listingType: 'product', description: 'Complete NFT art creation toolkit with 200+ layered PSD & Canva templates, rarity tier configuration guide, metadata JSON generator script, and a step-by-step launch checklist. Perfect for Web3 creators launching their first collection.', price: '49.00', paymentMethod: 'USDT', featuredImage: 'https://images.unsplash.com/photo-1646753522408-077ef9839300?w=600&q=80' },
        { title: 'Crypto Trading Signals Bot (Python)', listingType: 'product', description: 'Automated Python bot that connects to Binance API, sends Telegram alerts on RSI/MACD crossovers, and manages stop-loss automatically. Includes full source code, setup guide, and 30 days of email support. Works on any Linux/Mac server.', price: '129.00', paymentMethod: 'USDT', featuredImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80' },
        { title: 'Web3 Brand Identity Pack (Logo + Docs)', listingType: 'product', description: 'Full brand identity kit for crypto startups: vector logo (SVG + PNG), whitepaper template (20-page), investor pitch deck, social media banner kit, tokenomics diagram, and community guidelines template. Delivered as a zipped folder within 24 hours.', price: '299.00', paymentMethod: 'USDT', featuredImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80' },
        // Services
        { title: 'Crypto Twitter Promotion — 25K Impressions', listingType: 'service', description: 'Promote your token, NFT project, or DeFi protocol to my 25,000+ crypto-native Twitter audience. Package includes 3 promotional posts, 1 detailed thread, and a 24-hour mention in my Twitter Space. Results delivered within 5 business days.', price: '150.00', paymentMethod: 'USDT', featuredImage: 'https://images.unsplash.com/photo-1611605698335-8441a18e5dc2?w=600&q=80' },
        { title: 'Smart Contract Basic Security Audit', listingType: 'service', description: 'Manual security review of up to 500 lines of Solidity smart contract code. I check for reentrancy, integer overflow, access control issues, gas optimisation, and common attack vectors. Delivered as a structured PDF report within 5 business days.', price: '500.00', paymentMethod: 'USDT', featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80' },
        { title: 'Crypto Content Writing — 10-Article Pack', listingType: 'service', description: 'Professional Web3 and crypto blog articles (800-1,200 words each). Topics tailored to your project: DeFi explainers, NFT guides, tokenomics breakdowns, protocol reviews, or trend analysis. SEO-optimised, unique, and plagiarism-free. Delivered in Google Docs.', price: '200.00', paymentMethod: 'USDT', featuredImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80' },
      ];
      const existing = await db.select().from(p2pListings).where(eq(p2pListings.sellerId, sellerId));
      const existingTitles = new Set(existing.map((listing: any) => listing.title));
      const missingDemos = demoListings.filter((demo) => !existingTitles.has(demo.title));
      if (!missingDemos.length) return res.json({ message: 'Demo listings already seeded', count: existing.length });
      const inserted = [];
      for (const demo of missingDemos) {
        const [row] = await db.insert(p2pListings).values({ sellerId, ...demo, status: 'approved', approvedBy: sellerId, approvedAt: new Date() }).returning();
        inserted.push(row);
      }
      res.json({ message: `Seeded ${inserted.length} demo listings`, listings: inserted });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/admin/p2p-listings/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const [listing] = await db.select().from(p2pListings).where(eq(p2pListings.id, req.params.id));
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      const relatedTransactions = await db.select().from(p2pTransactions).where(eq(p2pTransactions.listingId, listing.id));
      await logP2PAction(req.user.id, 'listing_removed', { listingId: listing.id, details: listing.title });
      if (relatedTransactions.length) {
        await db.update(p2pListings).set({ status: 'removed', isFeatured: false, updatedAt: new Date() }).where(eq(p2pListings.id, req.params.id));
      } else {
        await db.delete(p2pListings).where(eq(p2pListings.id, req.params.id));
      }
      res.json({ success: true, message: 'Listing removed permanently' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: full edit of a listing (title, description, price, paymentMethod, featuredImage, type, status)
  app.put('/api/admin/p2p-listings/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const { title, description, price, paymentMethod, featuredImage, listingType, status, adminNote } = req.body;
      const validStatuses = ['pending', 'approved', 'rejected', 'expired'];
      const validTypes = ['crypto', 'product', 'service'];
      const updates: any = { updatedAt: new Date() };
      if (title) updates.title = String(title).trim();
      if (description) updates.description = String(description).trim();
      if (price) updates.price = String(Number(price).toFixed(2));
      if (paymentMethod) updates.paymentMethod = String(paymentMethod).trim();
      if (featuredImage !== undefined) updates.featuredImage = featuredImage || null;
      if (listingType && validTypes.includes(listingType)) updates.listingType = listingType;
      if (status && validStatuses.includes(status)) {
        updates.status = status;
        updates.approvedBy = status === 'approved' ? req.user.id : null;
        updates.approvedAt = status === 'approved' ? new Date() : null;
      }
      if (adminNote !== undefined) updates.adminNote = adminNote;
      if (req.body.isFeatured !== undefined) updates.isFeatured = req.body.isFeatured === true || req.body.isFeatured === 'true';
      const [listing] = await db.update(p2pListings).set(updates).where(eq(p2pListings.id, req.params.id)).returning();
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      await logP2PAction(req.user.id, 'listing_edited', { listingId: listing.id, details: `Admin edited listing` });
      res.json(await enrichP2PListing(listing));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin: get all P2P listings (all statuses)
  app.get('/api/admin/p2p-listings', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const rows = (await db.select().from(p2pListings).orderBy(desc(p2pListings.createdAt))).filter((listing: any) => listing.status !== 'removed');
      const enriched = await Promise.all(rows.map(enrichP2PListing));
      res.json(enriched);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/p2p-transactions', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const rows = await db.select().from(p2pTransactions).orderBy(desc(p2pTransactions.createdAt));
      const allListings = (await db.select().from(p2pListings).orderBy(desc(p2pListings.createdAt))).filter((listing: any) => listing.status !== 'removed');
      const revenue = rows.filter((r: any) => r.status === 'completed').reduce((sum: number, r: any) => sum + Number(r.fee || 0), 0);
      res.json({
        stats: {
          totalTransactions: rows.length,
          activeTrades: rows.filter((r: any) => ['pending', 'funded', 'delivered'].includes(r.status)).length,
          disputes: rows.filter((r: any) => r.status === 'disputed').length,
          revenue,
        },
        transactions: await Promise.all(rows.map(enrichP2PTransaction)),
        listings: await Promise.all(allListings.map(enrichP2PListing)),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/p2p-fees', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const configs = await Promise.all(p2pTypes.map(getP2PFeeConfig));
      res.json(configs);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/p2p-fees/:type', isAuthenticated, async (req: any, res) => {
    try {
      if (!canManageP2P(req.user)) return res.status(403).json({ message: 'P2P manager only' });
      const type = String(req.params.type);
      if (!p2pTypes.includes(type)) return res.status(400).json({ message: 'Invalid transaction type' });
      const current = await getP2PFeeConfig(type);
      const toNum = (v: any) => String(Number(v || 0).toFixed(2));
      const toNullable = (v: any) => (v === '' || v === null || v === undefined) ? null : String(Number(v).toFixed(2));
      const payload = {
        feeType: req.body.feeType === 'fixed' ? 'fixed' : 'percentage',
        feeValue: toNum(req.body.feeValue),
        minFee: toNum(req.body.minFee),
        maxFee: toNullable(req.body.maxFee),
        buyerFeeType: req.body.buyerFeeType === 'fixed' ? 'fixed' : 'percentage',
        buyerFeeValue: toNum(req.body.buyerFeeValue),
        buyerMinFee: toNum(req.body.buyerMinFee),
        buyerMaxFee: toNullable(req.body.buyerMaxFee),
        sellerFeeType: req.body.sellerFeeType === 'fixed' ? 'fixed' : 'percentage',
        sellerFeeValue: toNum(req.body.sellerFeeValue),
        sellerMinFee: toNum(req.body.sellerMinFee),
        sellerMaxFee: toNullable(req.body.sellerMaxFee),
        updatedBy: req.user.id,
        updatedAt: new Date(),
      };
      const [updated] = await db.update(p2pFeeConfigs).set(payload).where(eq(p2pFeeConfigs.id, current.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/platform-fees', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      for (const name of ['campaign_fee', 'withdrawal_fee', 'listing_fee']) {
        const [existing] = await db.select().from(platformFees).where(eq(platformFees.name, name));
        if (!existing) await db.insert(platformFees).values({ name, feeType: 'percentage', value: '0.00' });
      }
      res.json(await db.select().from(platformFees).orderBy(platformFees.name));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/platform-fees/:name', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const name = String(req.params.name);
      const [current] = await db.select().from(platformFees).where(eq(platformFees.name, name));
      const payload = { feeType: req.body.feeType === 'fixed' ? 'fixed' : 'percentage', value: String(Number(req.body.value || 0).toFixed(2)), updatedBy: req.user.id, updatedAt: new Date() };
      const [row] = current
        ? await db.update(platformFees).set(payload).where(eq(platformFees.name, name)).returning()
        : await db.insert(platformFees).values({ name, ...payload }).returning();
      res.json(row);
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
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Only admin accounts can post Taskdrip-official campaigns.' });
      const adminUser = await storage.getUser(req.user.id);
      if (!adminUser) return res.status(404).json({ message: 'Admin user not found' });

      const title = String(req.body.title || "").trim();
      const description = String(req.body.description || "").trim();
      const category = String(req.body.category || "").trim();
      const requirementsRaw = req.body.requirements;
      const requirements = Array.isArray(requirementsRaw)
        ? requirementsRaw.filter(Boolean)
        : (requirementsRaw && String(requirementsRaw).trim() ? [String(requirementsRaw).trim()] : []);
      const rewardNum = Number(req.body.reward);
      const totalSlotsNum = parseInt(String(req.body.totalSlots || ""), 10) || 10;
      const deadlineRaw = req.body.deadline;
      const deadlineDate = deadlineRaw ? new Date(deadlineRaw) : new Date(Date.now() + 30 * 86400000);

      const missing: string[] = [];
      if (!title) missing.push("Title");
      if (!description) missing.push("Description");
      if (!category) missing.push("Category");
      if (!Number.isFinite(rewardNum) || rewardNum < 1) missing.push("Reward (at least $1)");
      if (missing.length) {
        return res.status(400).json({ message: `Please complete: ${missing.join(", ")}.`, missingFields: missing });
      }

      const featureImagePath = req.file ? `/uploads/${req.file.filename}` : req.body.featureImage || null;
      const campaignId = `campaign_${Date.now()}_${nanoid(9)}`;

      const campaign = await storage.createCampaign({
        id: campaignId,
        title,
        description,
        category,
        platform: req.body.platform || null,
        brandName: req.body.brandName || 'Taskdrip Official',
        brandLogo: adminUser.profileImageUrl || null,
        brandId: req.user.id,
        reward: rewardNum.toFixed(2),
        totalSlots: totalSlotsNum,
        estimatedTime: req.body.estimatedTime || '30 min',
        requirements,
        deadline: isNaN(deadlineDate.getTime()) ? new Date(Date.now() + 30 * 86400000) : deadlineDate,
        featureImage: featureImagePath,
        instructionVideoUrl: req.body.instructionVideoUrl || null,
        status: 'active',
        paymentStatus: 'completed',
        isActive: true,
      } as any);

      sendPushToTarget('creators', {
        title: 'New Taskdrip campaign is live',
        body: `${campaign.title} is open now. Apply before the creator slots are gone.`,
        icon: campaign.featureImage || '/icon-192.png',
        clickUrl: `/campaigns/${campaign.id}`,
      }).catch((error) => console.error("Campaign launch push failed:", error?.message || error));

      res.status(201).json(campaign);
    } catch (error: any) {
      console.error('Error creating admin campaign:', error);
      const detail = error?.message || error?.detail || "Unknown error";
      res.status(500).json({ message: `Could not create campaign: ${detail}` });
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

  // ── Admin: Toggle campaign spotlight (isFeatured) ──────────────────────────
  app.patch('/api/admin/campaigns/:id/spotlight', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      const updated = await storage.updateCampaign(req.params.id, { isFeatured: !(campaign as any).isFeatured });
      res.json(updated);
    } catch (error) {
      console.error('Error toggling campaign spotlight:', error);
      res.status(500).json({ message: 'Failed to update spotlight' });
    }
  });

  // ── Send campaign-linked DM (influencer → brand) ───────────────────────────
  // Checks messagePrivacy, sends auto message with campaign title link if first contact
  app.post('/api/messages/campaign-dm', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.id;
      const { receiverId, campaignId } = req.body;
      if (!receiverId) return res.status(400).json({ message: 'receiverId required' });

      const target = await storage.getUser(receiverId);
      if (!target) return res.status(404).json({ message: 'Recipient not found' });

      const privacy = (target as any).messagePrivacy || 'everyone';

      // Check if sender has any participation in this brand's campaigns.
      // Applicants (any status except rejected) get a frictionless DM channel
      // regardless of the brand's general messagePrivacy setting — by posting
      // a campaign, the brand consented to receive messages from applicants.
      let hasCampaignRelation = false;
      try {
        const participations = await storage.getUserParticipations(senderId);
        if (campaignId) {
          hasCampaignRelation = participations.some(
            (p: any) => p.campaignId === campaignId && p.status !== 'rejected'
          );
        }
        if (!hasCampaignRelation) {
          const brandCampaigns = await storage.getCampaignsByBrand(receiverId);
          const brandCampaignIds = new Set(brandCampaigns.map((c: any) => c.id));
          hasCampaignRelation = participations.some(
            (p: any) => brandCampaignIds.has(p.campaignId) && p.status !== 'rejected'
          );
        }
      } catch (relErr) {
        console.warn('campaign-dm: failed to check participation relation', relErr);
      }

      // Privacy gate — bypassed for campaign applicants.
      if (!hasCampaignRelation) {
        if (privacy === 'nobody') {
          return res.status(403).json({ message: 'This brand is not accepting direct messages right now. Apply to one of their campaigns to start a conversation.' });
        }
        if (privacy === 'followers') {
          const viewerFollows = await storage.isFollowing(senderId, receiverId);
          if (!viewerFollows) {
            return res.status(403).json({ message: 'Follow this brand or apply to one of their campaigns to send a direct message.' });
          }
        }
      }

      // Build auto-intro message content
      let content = '';
      let subject = 'Hello from a creator';
      if (campaignId) {
        const campaign = await storage.getCampaign(campaignId);
        if (campaign) {
          subject = `Re: ${(campaign as any).title}`;
          content = `Hi! I'm interested in your campaign **[${(campaign as any).title}](/campaigns/${campaignId})**.\n\nLooking forward to collaborating with you!`;
        }
      }
      if (!content) {
        content = `Hi! I'd love to connect and explore collaboration opportunities.`;
      }

      const message = await storage.createMessage({
        campaignId: campaignId || null,
        participationId: null,
        senderId,
        receiverId,
        subject,
        content,
        messageType: 'campaign_intro',
        attachments: [],
      });

      await storage.createNotification({
        userId: receiverId,
        type: 'message',
        title: subject,
        content: `You have a new message from ${req.user.firstName}`,
        actionUrl: '/messages',
        relatedId: message.id,
      });

      res.status(201).json({ message, success: true });
    } catch (error) {
      console.error('Error sending campaign DM:', error);
      res.status(500).json({ message: 'Failed to send message' });
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
  // (Duplicate admin PUT /api/admin/campaigns/:id removed — using earlier handler at line ~7647 with correct featureImage field.)

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
    // ── BreedSkool fundraising landing page ─────────────────────────────────
    { contentKey: 'breedskool.hero.eyebrow', label: 'BreedSkool Eyebrow', contentType: 'text', page: 'breedskool', section: 'Hero Section', defaultValue: 'BreedSkool Tech Training Academy', value: '', sortOrder: 1 },
    { contentKey: 'breedskool.hero.title_line1', label: 'BreedSkool Hero Title — Line 1', contentType: 'text', page: 'breedskool', section: 'Hero Section', defaultValue: 'Where Skills', value: '', sortOrder: 2 },
    { contentKey: 'breedskool.hero.title_line2', label: 'BreedSkool Hero Title — Line 2', contentType: 'text', page: 'breedskool', section: 'Hero Section', defaultValue: 'Become', value: '', sortOrder: 3 },
    { contentKey: 'breedskool.hero.title_accent', label: 'BreedSkool Hero Title Accent', contentType: 'text', page: 'breedskool', section: 'Hero Section', defaultValue: 'Income', value: '', sortOrder: 4 },
    { contentKey: 'breedskool.hero.subtitle', label: 'BreedSkool Hero Description', contentType: 'textarea', page: 'breedskool', section: 'Hero Section', defaultValue: 'Equipping tech enthusiasts with Web3-era digital skills to build profitable online businesses and become valuable global assets.', value: '', sortOrder: 5 },
    { contentKey: 'breedskool.hero.cta', label: 'BreedSkool Hero CTA', contentType: 'text', page: 'breedskool', section: 'Hero Section', defaultValue: 'Join Free & Start Learning', value: '', sortOrder: 6 },
    { contentKey: 'breedskool.hero.bg_image', label: 'BreedSkool Header / Featured Image URL', contentType: 'image', page: 'breedskool', section: 'Hero Section', defaultValue: '/breedskool-training-project.png', value: '', sortOrder: 7 },
    { contentKey: 'breedskool.fundraising.badge', label: 'Fundraising Badge', contentType: 'text', page: 'breedskool', section: 'Fundraising', defaultValue: 'Help us open more doors', value: '', sortOrder: 10 },
    { contentKey: 'breedskool.fundraising.title', label: 'Fundraising Title', contentType: 'text', page: 'breedskool', section: 'Fundraising', defaultValue: 'Give more African learners a seat at the table.', value: '', sortOrder: 11 },
    { contentKey: 'breedskool.fundraising.description', label: 'Fundraising Description', contentType: 'textarea', page: 'breedskool', section: 'Fundraising', defaultValue: 'We are raising funds to provide devices, connectivity, mentors, and practical training to people ready to build a better future. Every contribution helps a learner move from potential to opportunity.', value: '', sortOrder: 12 },
    { contentKey: 'breedskool.fundraising.target', label: 'Fundraising Target (£)', contentType: 'text', page: 'breedskool', section: 'Fundraising', defaultValue: '100000', value: '', sortOrder: 13 },
    { contentKey: 'breedskool.fundraising.raised', label: 'Funds Raised So Far (£)', contentType: 'text', page: 'breedskool', section: 'Fundraising', defaultValue: '0', value: '', sortOrder: 14 },
    { contentKey: 'breedskool.guide.title', label: 'Getting Started Guide Title', contentType: 'text', page: 'breedskool', section: 'Getting Started Guide', defaultValue: 'Everything you need to start learning today.', value: '', sortOrder: 20 },
    { contentKey: 'breedskool.guide.description', label: 'Getting Started Guide Description', contentType: 'textarea', page: 'breedskool', section: 'Getting Started Guide', defaultValue: 'Create your account right here, follow your dashboard prompts, and meet your learning community. No confusing hand-offs and no need to leave this page to get started.', value: '', sortOrder: 21 },
    { contentKey: 'breedskool.reviews.title', label: 'Learner Voices Title', contentType: 'text', page: 'breedskool', section: 'Learner Voices', defaultValue: 'A community that keeps you moving.', value: '', sortOrder: 30 },
    { contentKey: 'breedskool.reviews.subtitle', label: 'Learner Voices Subtitle', contentType: 'textarea', page: 'breedskool', section: 'Learner Voices', defaultValue: 'Learning is easier when you can see yourself in the room. Meet learners building skills across Africa.', value: '', sortOrder: 31 },
    { contentKey: 'breedskool.community.telegram_url', label: 'Telegram Community URL', contentType: 'url', page: 'breedskool', section: 'Community', defaultValue: 'https://t.me/taskdrip', value: '', sortOrder: 40 },
    { contentKey: 'breedskool.share.title', label: 'Social Share Title', contentType: 'text', page: 'breedskool', section: 'Social Sharing', defaultValue: 'BreedSkool — free tech training for Africa', value: '', sortOrder: 50 },
    { contentKey: 'breedskool.share.description', label: 'Social Share Description', contentType: 'textarea', page: 'breedskool', section: 'Social Sharing', defaultValue: 'Learn practical digital skills, join a supportive community, and start building your future with BreedSkool.', value: '', sortOrder: 51 },
    { contentKey: 'breedskool.seo.title', label: 'BreedSkool SEO Title', contentType: 'text', page: 'breedskool', section: 'Social Sharing', defaultValue: 'BreedSkool — Free Tech Training & Digital Skills for Africa', value: '', sortOrder: 52 },
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

  // ── Ad Analytics helpers ──────────────────────────────────────
  function parseDevice(ua: string): { deviceType: string; browser: string; os: string } {
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua);
    const isTablet = /tablet|ipad/i.test(ua);
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
    let browser = 'Other';
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
    else if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\//.test(ua)) browser = 'Opera';
    let os = 'Other';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iOS|iPhone|iPad/.test(ua)) os = 'iOS';
    return { deviceType, browser, os };
  }

  async function recordAdAnalytic(adId: string, eventType: 'impression' | 'click', req: any) {
    try {
      const ua = req.headers['user-agent'] || '';
      const ip = (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || '').split(',')[0].trim();
      const { deviceType, browser, os } = parseDevice(ua);
      await db.insert(adAnalytics).values({
        adId,
        eventType,
        sessionId: req.body?.sessionId || null,
        userId: req.user?.id || null,
        deviceType,
        browser,
        os,
        ipAddress: ip,
        pageUrl: req.body?.pageUrl || req.headers['referer'] || null,
        userAgent: ua.substring(0, 500),
      });
    } catch (_) {}
  }

  app.post('/api/ads/:id/impression', async (req: any, res) => {
    try {
      await storage.incrementAdImpressions(req.params.id);
      await recordAdAnalytic(req.params.id, 'impression', req);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to record impression' });
    }
  });

  app.post('/api/ads/:id/click', async (req: any, res) => {
    try {
      await storage.incrementAdClicks(req.params.id);
      await recordAdAnalytic(req.params.id, 'click', req);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to record click' });
    }
  });

  app.get('/api/admin/ads/analytics/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const rows = await db.select().from(adAnalytics).where(eq(adAnalytics.adId, req.params.id)).orderBy(desc(adAnalytics.createdAt)).limit(500);
      // Aggregate
      const byDevice = rows.reduce((acc: any, r) => { acc[r.deviceType || 'unknown'] = (acc[r.deviceType || 'unknown'] || 0) + 1; return acc; }, {});
      const byBrowser = rows.reduce((acc: any, r) => { acc[r.browser || 'Other'] = (acc[r.browser || 'Other'] || 0) + 1; return acc; }, {});
      const byOs = rows.reduce((acc: any, r) => { acc[r.os || 'Other'] = (acc[r.os || 'Other'] || 0) + 1; return acc; }, {});
      const impressions = rows.filter(r => r.eventType === 'impression');
      const clicks = rows.filter(r => r.eventType === 'click');
      res.json({ byDevice, byBrowser, byOs, recentImpressions: impressions.slice(0, 50), recentClicks: clicks.slice(0, 50), totalImpressions: impressions.length, totalClicks: clicks.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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

  app.post('/api/admin/ads', isAuthenticated, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const body = { ...req.body };
      if (req.files?.image?.[0]) body.imageUrl = `/uploads/${req.files.image[0].filename}`;
      if (req.files?.logo?.[0]) body.advertiserLogo = `/uploads/${req.files.logo[0].filename}`;
      const ad = await storage.createSponsoredAd(body);
      res.json(ad);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to create ad' });
    }
  });

  app.patch('/api/admin/ads/:id', isAuthenticated, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const body = { ...req.body };
      if (req.files?.image?.[0]) body.imageUrl = `/uploads/${req.files.image[0].filename}`;
      if (req.files?.logo?.[0]) body.advertiserLogo = `/uploads/${req.files.logo[0].filename}`;
      const ad = await storage.updateSponsoredAd(req.params.id, body);
      res.json(ad);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to update ad' });
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
      // Notify admin about new application
      try {
        const adminUser = await storage.getAdminUser();
        if (adminUser) {
          await storage.createNotification({
            userId: adminUser.id,
            type: 'ads_application',
            title: `New Ads Application: ${req.body.companyName || 'Unknown'}`,
            content: `${req.body.contactName || 'Someone'} applied for a ${(req.body.adType || 'advertising').replace(/_/g, ' ')} campaign. Click to review and respond.`,
            actionUrl: '/admin/ads?tab=applications',
            isRead: false,
            priority: 'high',
          });
        }
      } catch (_notifErr) { /* non-blocking */ }
      sendAdminActivityEmail({
        event: "advertising",
        subject: `New advertising enquiry: ${req.body.companyName || "Unknown company"}`,
        recipient: TASKDRIP_EMAILS.info,
        fromEmail: TASKDRIP_EMAILS.info,
        customer: {
          name: req.body.contactName,
          email: req.body.contactEmail,
          phone: req.body.phone || req.body.phoneNumber,
        },
        details: [
          { label: "Application ID", value: app2.id },
          { label: "Company", value: req.body.companyName },
          { label: "Ad type", value: (req.body.adType || "advertising").replace(/_/g, " ") },
          { label: "Budget", value: req.body.budget },
          { label: "Message", value: req.body.message || req.body.description },
          { label: "Status", value: app2.status },
        ],
      }).catch(() => {});
      // Send confirmation email to the applicant (non-blocking)
      if (req.body.contactEmail) {
        const contactName = req.body.contactName || '';
        const firstName = contactName.split(' ')[0] || contactName;
        sendAdsApplicationEmail({
          email: req.body.contactEmail,
          firstName: firstName || 'there',
          companyName: req.body.companyName || '',
          adType: req.body.adType || 'advertising',
          contactName: contactName || req.body.contactEmail,
        }).catch(() => {});
      }
      res.json(app2);
    } catch (e) {
      console.error("Error submitting ads application:", e);
      res.status(500).json({ message: 'Failed to submit application' });
    }
  });

  app.post('/api/admin/advertise-applications/:id/email', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { subject, body, applicantEmail, applicantName } = req.body;
      if (!subject || !body || !applicantEmail) return res.status(400).json({ message: 'subject, body, and applicantEmail required' });

      let emailSent = false;
      try {
        const { buildDefaultEmailHtml, sendEmail } = await import("./email-service");
        const result = await sendEmail({
          to: applicantEmail,
          toName: applicantName || applicantEmail,
          subject,
          html: buildDefaultEmailHtml(`<h2 style="color:#1f2937;margin:0 0 16px">${subject}</h2><div style="line-height:1.7">${body.replace(/\n/g, '<br/>')}</div>`, "Taskdrip Advertising Team"),
          text: body,
          fromEmail: TASKDRIP_EMAILS.info,
        });
        emailSent = result.success;
      } catch (mailErr: any) {
        console.error('[ads-email]', mailErr?.message);
      }

      // Store note on application regardless
      await storage.updateAdvertiseApplication(req.params.id, {
        adminNotes: `[Email sent ${new Date().toLocaleDateString()}] Subject: ${subject}\n\n${body}`,
        status: 'contacted',
      });

      res.json({ success: true, emailSent });
    } catch (e: any) {
      res.status(500).json({ message: 'Failed to send email', error: e?.message });
    }
  });

  app.get('/api/admin/advertise-applications', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const apps = await storage.getAllAdvertiseApplications();
      const payments = await db
        .select()
        .from(paymentDeposits)
        .where(sql`${paymentDeposits.adminNotes} LIKE ${'%ads_application:%'}`)
        .orderBy(desc(paymentDeposits.createdAt));
      res.json(apps.map((app2: any) => ({
        ...app2,
        payment: payments.find((payment: any) => String(payment.adminNotes || '').includes(`ads_application:${app2.id}`)) || null,
      })));
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
  const { sendEmail, testSmtpConnection, blastCampaign, AI_TEMPLATES, buildDefaultEmailHtml, getEmailStatus, sendWelcomeEmail } = await import("./email-service");

  // Auto-activate Resend on startup if key is present
  activateResendIfAvailable().catch(() => {});

  // Activate Resend as preferred provider (called from admin UI)
  app.post('/api/admin/email/activate-resend', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { emailSettings: emailSettingsTable } = await import('@shared/schema');
      const { db: dbInst } = await import('./db');
      await dbInst.insert(emailSettingsTable).values({ id: 'singleton', preferredProvider: 'resend' } as any)
        .onConflictDoUpdate({ target: (emailSettingsTable as any).id, set: { preferredProvider: 'resend', smtpHost: null, smtpUser: null, smtpPass: null } });
      res.json({ success: true, message: 'Resend activated as default provider' });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // Admin activity history — searchable, paginated audit trail of important writes
  app.get('/api/admin/activity', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const requestedLimit = Number.parseInt(String(req.query.limit || '50'), 10);
      const requestedOffset = Number.parseInt(String(req.query.offset || '0'), 10);
      const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 50, 1), 200);
      const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0);
      const eventType = String(req.query.eventType || '').trim();
      const status = String(req.query.status || '').trim();
      const search = String(req.query.search || '').trim();
      const conditions: any[] = [];
      if (eventType && eventType !== 'all') conditions.push(eq(activityLogs.eventType, eventType));
      if (status && status !== 'all') conditions.push(eq(activityLogs.status, status));
      if (search) {
        const pattern = `%${search.slice(0, 100)}%`;
        conditions.push(or(
          ilike(activityLogs.action, pattern),
          ilike(activityLogs.description, pattern),
          ilike(activityLogs.actorName, pattern),
          ilike(activityLogs.actorEmail, pattern),
          ilike(activityLogs.entityId, pattern),
        ));
      }
      const where = conditions.length ? and(...conditions) : undefined;
      const [items, totalRows] = await Promise.all([
        db.select().from(activityLogs)
          .where(where)
          .orderBy(desc(activityLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(activityLogs).where(where),
      ]);
      res.json({
        items,
        total: Number(totalRows[0]?.count || 0),
        limit,
        offset,
      });
    } catch (error: any) {
      console.error('Error fetching admin activity history:', error);
      res.status(500).json({ message: 'Failed to fetch activity history' });
    }
  });

  // Email Status
  app.get('/api/admin/email/status', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const status = await getEmailStatus();
      res.json(status);
    } catch (e) { res.status(500).json({ message: 'Failed to get email status' }); }
  });

  // Send test welcome email for a given user type
  app.post('/api/admin/email/test-welcome', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { email, firstName, userType } = req.body;
      if (!email || !firstName) return res.status(400).json({ message: 'email and firstName required' });
      const result = await sendEmail({
        to: email,
        toName: firstName,
        subject: userType === 'brand' ? `Welcome to Taskdrip, ${firstName}! Let's launch your first campaign 🚀` : `Welcome to Taskdrip, ${firstName}! 🚀`,
        html: AI_TEMPLATES[userType === 'brand' ? 'welcome_brand' : 'welcome_creator']?.body?.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => ({ first_name: firstName, site_url: 'https://taskdrip.online' }[k] || '')) || '<p>Welcome to Taskdrip!</p>',
      });
      res.json(result);
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

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

  // Upload an image for use inside an email template / campaign body
  app.post('/api/admin/email/upload-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (e: any) { res.status(500).json({ message: e.message || 'Upload failed' }); }
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

  // Send email to individual contact (admin)
  app.post('/api/admin/email/contacts/:userId/send', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { userId } = req.params;
      const { subject, html, fromName } = req.body;
      if (!subject || !html) return res.status(400).json({ message: 'subject and html required' });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const result = await sendEmail({
        to: user.email,
        toName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        subject,
        html,
        ...(fromName ? { fromName } : {}),
      } as any);
      res.json(result);
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // User segments for email marketing
  app.get('/api/admin/email/segments', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const allUsers = await storage.getAllUsers?.() || [];
      const { courseEnrollments, purchases: shopPurchases, newsletterSubscribers: nsSubs, breedskoolRegistrations } = await import('@shared/schema');
      const { db: dbInst } = await import('./db');
      const { eq, sql: sqlFn } = await import('drizzle-orm');

      // Count course students (from both courseEnrollments and breedskoolRegistrations)
      const enrollmentRows = await dbInst.selectDistinct({ userId: courseEnrollments.userId }).from(courseEnrollments);
      const breedskoolRows = await dbInst.selectDistinct({ userId: breedskoolRegistrations.userId }).from(breedskoolRegistrations);
      const studentUserIds = new Set([
        ...enrollmentRows.map((r: any) => r.userId),
        ...breedskoolRows.map((r: any) => r.userId).filter(Boolean),
      ]);

      // Count shop customers
      const purchaseRows = await dbInst.selectDistinct({ userId: shopPurchases.userId }).from(shopPurchases);
      const shopCustomerIds = new Set(purchaseRows.map((r: any) => r.userId));

      // Newsletter subscribers
      const nsRows = await dbInst.select().from(nsSubs);
      const activeNsSubs = nsRows.filter((s: any) => s.status === 'active');

      const creators = allUsers.filter((u: any) => u.userType === 'creator');
      const brands = allUsers.filter((u: any) => u.userType === 'brand');
      const students = allUsers.filter((u: any) => studentUserIds.has(u.id));
      const shopCustomers = allUsers.filter((u: any) => shopCustomerIds.has(u.id));

      res.json({
        segments: [
          {
            key: 'creators',
            label: 'Influencers & Creators',
            description: 'Registered influencer/creator accounts',
            count: creators.length,
            color: 'blue',
            icon: 'users',
            members: creators.map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, creatorTier: u.creatorTier, isVerified: u.isVerified })),
          },
          {
            key: 'brands',
            label: 'Brands',
            description: 'Registered brand accounts running campaigns',
            count: brands.length,
            color: 'purple',
            icon: 'building',
            members: brands.map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, companyName: u.companyName, isVerified: u.isVerified })),
          },
          {
            key: 'students',
            label: 'Course Students',
            description: 'Users enrolled in BreedSkool courses',
            count: students.length,
            color: 'green',
            icon: 'book',
            members: students.map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, userType: u.userType })),
          },
          {
            key: 'shop_customers',
            label: 'Shop Customers',
            description: 'Users who have purchased shop products',
            count: shopCustomers.length,
            color: 'orange',
            icon: 'package',
            members: shopCustomers.map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, userType: u.userType })),
          },
          {
            key: 'newsletter',
            label: 'Newsletter Subscribers',
            description: 'Footer opt-in newsletter subscribers',
            count: activeNsSubs.length,
            color: 'pink',
            icon: 'bell',
            members: activeNsSubs.map((s: any) => ({ id: s.id, email: s.email, firstName: s.name || '', lastName: '', userType: 'newsletter' })),
          },
          {
            key: 'all',
            label: 'All Users',
            description: 'Every registered account on the platform',
            count: allUsers.length,
            color: 'gray',
            icon: 'globe',
            members: allUsers.map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, userType: u.userType })),
          },
        ],
      });
    } catch (e: any) { res.status(500).json({ message: 'Failed to fetch segments', error: e.message }); }
  });

  // Brand sends a personalised email to an individual user
  app.post('/api/brand/send-email', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const { userId, subject, message, fromCompanyName } = req.body;
      if (!userId || !subject || !message) return res.status(400).json({ message: 'userId, subject, and message are required' });

      const [sender, recipient] = await Promise.all([
        storage.getUser(req.user.id),
        storage.getUser(userId),
      ]);
      if (!sender) return res.status(403).json({ message: 'Sender not found' });
      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

      const companyName = fromCompanyName || (sender as any).companyName || `${sender.firstName} ${sender.lastName}`.trim() || 'A Brand on Taskdrip';
      const fromDisplay = `${companyName} via Taskdrip`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
          <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px; border-radius: 12px 12px 0 0; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">${companyName}</h1>
            <p style="margin: 6px 0 0; opacity: 0.85; font-size: 13px;">Sent via Taskdrip</p>
          </div>
          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
            <p style="font-size: 15px; margin: 0 0 16px;">Hi ${recipient.firstName || 'there'},</p>
            <div style="font-size: 15px; line-height: 1.7; color: #374151; white-space: pre-line;">${message}</div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              This email was sent by <strong>${companyName}</strong> through the Taskdrip platform. 
              If you believe this was sent in error, please contact support@taskdrip.online.
            </p>
          </div>
        </div>`;

      const result = await sendEmail({
        to: recipient.email,
        toName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || undefined,
        subject: `${subject} — ${companyName}`,
        html: htmlBody,
        fromName: fromDisplay,
      } as any);
      res.json(result);
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
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

  // Daily login points — call once per session from frontend
  app.post('/api/points/daily-login', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const existingPoints = await storage.getUserPoints(userId);
      const alreadyToday = existingPoints.some((p: any) => p.actionType === 'daily_login' && p.createdAt && new Date(p.createdAt).toISOString().slice(0, 10) === today);
      if (alreadyToday) {
        return res.json({ awarded: false, message: 'Daily login points already claimed today' });
      }
      await storage.awardPoints(userId, 'daily_login', 5, 'Daily login bonus — keep the streak going!', today);
      await storage.createNotification({
        userId,
        type: 'points_earned',
        title: '🌅 +5 $TDRIP Daily Bonus!',
        content: 'Welcome back! You earned 5 $TDRIP for logging in today. Come back tomorrow for more!',
        actionUrl: '/wallet',
        isRead: false,
      } as any);
      res.json({ awarded: true, points: 5 });
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to award daily login points' });
    }
  });

  app.post('/api/tdrip/topups', isAuthenticated, async (req: any, res) => {
    try {
      const points = Math.floor(Number(req.body.points || 0));
      const paymentMethodId = String(req.body.paymentMethodId || '');
      if (!points || points < 100) return res.status(400).json({ message: 'Minimum top-up is 100 $TDRIP' });

      const amount = points / TDRIP_POINTS_PER_USD;
      const methods = await storage.getActivePaymentMethods('tdrip');
      const paymentMethod = methods.find((method: any) => method.id === paymentMethodId) || methods.find((method: any) => method.type === 'crypto');
      if (!paymentMethod) return res.status(400).json({ message: 'No active crypto checkout wallet is available' });

      const transaction = await storage.createTransaction({
        userId: req.user.id,
        amount: amount.toFixed(2),
        type: 'tdrip_topup',
        status: 'pending',
        network: paymentMethod.network || paymentMethod.label,
        walletAddress: paymentMethod.address,
        description: `Buy ${points} $TDRIP points (${amount.toFixed(2)} USDT)`,
        referenceType: 'tdrip_topup',
        referenceId: String(points),
      } as any);

      res.status(201).json({
        transaction,
        checkout: {
          points,
          amount: amount.toFixed(2),
          rate: TDRIP_POINTS_PER_USD,
          paymentMethod,
        },
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to start $TDRIP checkout' });
    }
  });

  app.post('/api/tdrip/topups/:id/submit-proof', isAuthenticated, upload.single('paymentProof'), async (req: any, res) => {
    try {
      const [transaction] = await db.select().from(transactions).where(eq(transactions.id, req.params.id));
      if (!transaction || transaction.userId !== req.user.id || transaction.type !== 'tdrip_topup') {
        return res.status(404).json({ message: 'Top-up not found' });
      }
      if (transaction.status === 'completed') {
        return res.json({ transaction, message: 'This top-up has already been credited.' });
      }

      const txHash = String(req.body.transactionHash || '').trim();
      const network = String(req.body.network || transaction.network || '').trim();
      if (!txHash) return res.status(400).json({ message: 'Transaction hash is required' });

      const verification = await verifyBlockchainTransaction(network, txHash, Number(transaction.amount));
      const isVerified = verification.status === 'verified' && verification.amountMatches !== false;
      const updated = await storage.updateTransaction(transaction.id as any, {
        status: isVerified ? 'completed' : 'pending',
        transactionHash: txHash,
        network,
        description: `${transaction.description || 'TDRIP top-up'} | Verification: ${verification.message}`,
        processedAt: isVerified ? new Date() : undefined,
      } as any);

      const points = Number(transaction.referenceId || 0);
      if (isVerified && points > 0) {
        await storage.awardPoints(req.user.id, 'tdrip_purchase', points, `Purchased ${points} $TDRIP via crypto checkout`, transaction.id);
      } else {
        const admins = await storage.getUsersByType('admin');
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: 'tdrip_topup_pending',
            title: '$TDRIP top-up needs review',
            content: `${req.user.firstName} submitted proof for ${points} $TDRIP (${transaction.amount} USDT).`,
            actionUrl: '/admin/payments',
          } as any);
        }
      }

      res.json({ transaction: updated, verification, credited: isVerified, points: isVerified ? points : 0 });
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to submit top-up proof' });
    }
  });

  app.post('/api/tdrip/transfer', isAuthenticated, async (req: any, res) => {
    try {
      const recipientText = String(req.body.recipient || '').trim();
      const points = Math.floor(Number(req.body.points || 0));
      const note = String(req.body.note || '').trim();
      const type = req.body.type === 'tip' ? 'tdrip_tip' : 'tdrip_transfer';
      if (!recipientText || !points || points <= 0) return res.status(400).json({ message: 'Recipient and points are required' });

      const currentTotal = await storage.getUserTotalPoints(req.user.id);
      if (currentTotal < points) return res.status(400).json({ message: 'Insufficient $TDRIP balance' });

      const recipient = recipientText.includes('@')
        ? await storage.getUserByEmail(recipientText)
        : await storage.getUser(recipientText);
      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });
      if (recipient.id === req.user.id) return res.status(400).json({ message: 'You cannot send $TDRIP to yourself' });

      await storage.awardPoints(req.user.id, type, -points, `${type === 'tdrip_tip' ? 'Tip' : 'Transfer'} sent to ${recipient.email}${note ? `: ${note}` : ''}`, recipient.id);
      await storage.awardPoints(recipient.id, type, points, `${type === 'tdrip_tip' ? 'Tip' : 'Transfer'} received from ${req.user.email}${note ? `: ${note}` : ''}`, req.user.id);
      await storage.createTransaction({
        userId: req.user.id,
        amount: (points / TDRIP_POINTS_PER_USD).toFixed(2),
        type,
        status: 'completed',
        description: `${points} $TDRIP sent to ${recipient.email}`,
        referenceType: 'tdrip_wallet',
        referenceId: recipient.id,
        processedAt: new Date(),
      } as any);
      await storage.createNotification({
        userId: recipient.id,
        type,
        title: type === 'tdrip_tip' ? 'You received a $TDRIP tip' : 'You received $TDRIP',
        content: `${req.user.firstName} sent you ${points} $TDRIP points.`,
        actionUrl: '/wallet',
      } as any);

      res.json({ success: true, points, recipient: { id: recipient.id, email: recipient.email, firstName: recipient.firstName } });
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Failed to send $TDRIP' });
    }
  });

  app.get('/api/leaderboard/points', async (_req, res) => {
    try {
      const leaders = await storage.getLeaderboardByPoints(100);
      res.json(leaders);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch points leaderboard' });
    }
  });

  // Leaderboard rewards (public)
  app.get('/api/leaderboard/rewards', async (req, res) => {
    try {
      const type = (req.query.type as string) || 'all';
      const rewards = await storage.getActiveLeaderboardRewards(type);
      res.json(rewards);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch rewards' });
    }
  });

  // Leaderboard giveaways (public)
  app.get('/api/leaderboard/giveaways', async (_req, res) => {
    try {
      const giveaways = await storage.getActiveLeaderboardGiveaways();
      res.json(giveaways);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch giveaways' });
    }
  });

  // Admin: create/update/delete leaderboard rewards
  app.post('/api/admin/leaderboard/rewards', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const reward = await storage.createLeaderboardReward(req.body);
      res.status(201).json(reward);
    } catch (e) {
      res.status(500).json({ message: 'Failed to create reward' });
    }
  });

  app.patch('/api/admin/leaderboard/rewards/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const reward = await storage.updateLeaderboardReward(req.params.id, req.body);
      res.json(reward);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update reward' });
    }
  });

  app.delete('/api/admin/leaderboard/rewards/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteLeaderboardReward(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to delete reward' });
    }
  });

  // Admin: create/update/delete leaderboard giveaways
  app.post('/api/admin/leaderboard/giveaways', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const giveaway = await storage.createLeaderboardGiveaway(req.body);
      res.status(201).json(giveaway);
    } catch (e) {
      res.status(500).json({ message: 'Failed to create giveaway' });
    }
  });

  app.patch('/api/admin/leaderboard/giveaways/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const giveaway = await storage.updateLeaderboardGiveaway(req.params.id, req.body);
      res.json(giveaway);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update giveaway' });
    }
  });

  app.delete('/api/admin/leaderboard/giveaways/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteLeaderboardGiveaway(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to delete giveaway' });
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

  // ── Page Content CMS ──────────────────────────────────────────
  app.get('/api/page-content/:page', async (req, res) => {
    try {
      const items = await storage.getPageContent(req.params.page);
      res.json(items);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch page content' });
    }
  });

  app.get('/api/admin/page-content', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const items = await storage.getAllPageContent();
      res.json(items);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch page content' });
    }
  });

  app.put('/api/admin/page-content/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { value } = req.body;
      const item = await storage.updatePageContentValue(req.params.id, value ?? '');
      if (!item) return res.status(404).json({ message: 'Content block not found' });
      res.json(item);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update content' });
    }
  });

  app.post('/api/admin/page-content/:id/reset', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const item = await storage.resetPageContentToDefault(req.params.id);
      if (!item) return res.status(404).json({ message: 'Content block not found' });
      res.json(item);
    } catch (e) {
      res.status(500).json({ message: 'Failed to reset content' });
    }
  });

  // ── Hero Sliders ──────────────────────────────────────────────
  app.get('/api/hero-sliders', async (req: any, res) => {
    try {
      const page = req.query.page as string | undefined;
      let sliders = await storage.getActiveHeroSliders();
      if (page) {
        sliders = sliders.filter(s => {
          const pages = ((s as any).targetPages || "landing").split(",").map((p: string) => p.trim());
          return pages.includes("all") || pages.includes(page);
        });
      }
      res.json(sliders);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch sliders' });
    }
  });

  app.get('/api/admin/hero-sliders', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const sliders = await storage.getHeroSliders();
      res.json(sliders);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch sliders' });
    }
  });

  app.post('/api/admin/hero-sliders', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const slider = await storage.createHeroSlider(req.body);
      res.json(slider);
    } catch (e) {
      res.status(500).json({ message: 'Failed to create slider' });
    }
  });

  app.put('/api/admin/hero-sliders/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const slider = await storage.updateHeroSlider(req.params.id, req.body);
      if (!slider) return res.status(404).json({ message: 'Slider not found' });
      res.json(slider);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update slider' });
    }
  });

  app.delete('/api/admin/hero-sliders/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteHeroSlider(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to delete slider' });
    }
  });

  // ── Page Hero Backgrounds (public read + admin CRUD) ───────────────────────
  app.get('/api/page-hero/:page', async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { pageHeroBackgrounds } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const [row] = await db.select().from(pageHeroBackgrounds)
        .where(and(eq(pageHeroBackgrounds.page, req.params.page), eq(pageHeroBackgrounds.isActive, true)));
      res.json(row || {});
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/admin/page-heroes', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { db } = await import('./db');
      const { pageHeroBackgrounds } = await import('@shared/schema');
      const rows = await db.select().from(pageHeroBackgrounds);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put('/api/admin/page-hero/:page', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { db } = await import('./db');
      const { pageHeroBackgrounds } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const page = req.params.page;
      const data = { ...req.body, page, updatedAt: new Date() };
      const [existing] = await db.select().from(pageHeroBackgrounds).where(eq(pageHeroBackgrounds.page, page));
      if (existing) {
        const [updated] = await db.update(pageHeroBackgrounds).set(data).where(eq(pageHeroBackgrounds.page, page)).returning();
        return res.json(updated);
      }
      const [created] = await db.insert(pageHeroBackgrounds).values(data).returning();
      res.json(created);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/admin/page-hero/:page', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { db } = await import('./db');
      const { pageHeroBackgrounds } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      await db.delete(pageHeroBackgrounds).where(eq(pageHeroBackgrounds.page, req.params.page));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Spotlight Items (public read + admin CRUD) ──────────────────────────────
  app.get('/api/spotlight', async (req: any, res) => {
    try {
      const page = req.query.page as string | undefined;
      const items = await storage.getSpotlightItems(page);
      res.json(items);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch spotlight items' });
    }
  });

  app.get('/api/admin/spotlight', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const items = await storage.getAllSpotlightItems();
      res.json(items);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch spotlight items' });
    }
  });

  app.post('/api/admin/spotlight', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const item = await storage.createSpotlightItem(req.body);
      res.json(item);
    } catch (e) {
      res.status(500).json({ message: 'Failed to create spotlight item' });
    }
  });

  app.put('/api/admin/spotlight/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const item = await storage.updateSpotlightItem(req.params.id, req.body);
      if (!item) return res.status(404).json({ message: 'Not found' });
      res.json(item);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update spotlight item' });
    }
  });

  app.delete('/api/admin/spotlight/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteSpotlightItem(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to delete spotlight item' });
    }
  });

  // ── Ad Network Placements (public read + admin CRUD) ───────────────────────
  app.get('/api/ad-networks', async (req: any, res) => {
    try {
      const page = req.query.page as string | undefined;
      const type = req.query.type as string | undefined;
      const ads = await storage.getAdNetworkPlacements(page, type);
      res.json(ads);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch ad placements' });
    }
  });

  app.get('/api/admin/ad-networks', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ads = await storage.getAllAdNetworkPlacements();
      res.json(ads);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch ad network placements' });
    }
  });

  app.post('/api/admin/ad-networks', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ad = await storage.createAdNetworkPlacement(req.body);
      res.json(ad);
    } catch (e) {
      res.status(500).json({ message: 'Failed to create ad network placement' });
    }
  });

  app.put('/api/admin/ad-networks/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const ad = await storage.updateAdNetworkPlacement(req.params.id, req.body);
      if (!ad) return res.status(404).json({ message: 'Not found' });
      res.json(ad);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update ad network placement' });
    }
  });

  app.delete('/api/admin/ad-networks/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      await storage.deleteAdNetworkPlacement(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Failed to delete ad network placement' });
    }
  });

  // ── My Orders: unified view of all user orders/transactions ──────────────────
  app.get('/api/my-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Shop purchases
      const shopOrders = await storage.getUserPurchases(userId);

      // Course enrollments
      const courseOrders = await storage.getMyEnrollments(userId);

      // P2P transactions (buyer or seller)
      const p2pRows = await db
        .select()
        .from(p2pTransactions)
        .where(sql`${p2pTransactions.buyerId} = ${userId} OR ${p2pTransactions.sellerId} = ${userId}`)
        .orderBy(desc(p2pTransactions.createdAt));
      const enrichedP2P = await Promise.all(p2pRows.map(enrichP2PTransaction));

      // Campaign escrow (only for brands or admins)
      let escrowOrders: any[] = [];
      if (user.userType === 'brand' || user.userType === 'admin') {
        const allEscrow = await (storage as any).getAllEscrowPayments();
        const userEscrow = user.userType === 'admin' ? allEscrow : allEscrow.filter((p: any) => p.brandId === userId);
        escrowOrders = await Promise.all(userEscrow.map(async (payment: any) => {
          const campaign = payment.campaignId ? await storage.getCampaignById(payment.campaignId) : null;
          return {
            ...payment,
            campaign: campaign ? { id: campaign.id, title: campaign.title, budget: campaign.budget, reward: campaign.reward, totalSlots: campaign.totalSlots } : null,
          };
        }));
      }

      // Direct hire offers — always fetch brand-side (covers hire-developer requests
      // submitted by any user type, since they're stored with brandId = userId)
      const brandHireOrders = await storage.getDirectHireOffersByBrand(userId);
      let influencerHireOrders: any[] = [];
      if (user.userType === 'influencer' || user.userType === 'admin') {
        influencerHireOrders = await storage.getDirectHireOffersByInfluencer(userId);
      }
      // Merge, deduplicate by id
      const hireMap = new Map<string, any>();
      for (const o of [...brandHireOrders, ...influencerHireOrders]) hireMap.set(o.id, o);
      const directHireOrders = Array.from(hireMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      const adApplications = user.email
        ? await db
            .select()
            .from(advertiseApplications)
            .where(sql`lower(${advertiseApplications.email}) = lower(${user.email})`)
            .orderBy(desc(advertiseApplications.createdAt))
        : [];
      const adPaymentDeposits = await db
        .select()
        .from(paymentDeposits)
        .where(and(
          eq(paymentDeposits.brandId, userId),
          sql`${paymentDeposits.adminNotes} LIKE ${'%ads_application:%'}`
        ))
        .orderBy(desc(paymentDeposits.createdAt));

      // Subscription receipts (premium / brand pro)
      const subscriptionOrders = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt));

      res.json({
        shopOrders,
        courseOrders,
        p2pTransactions: enrichedP2P,
        escrowOrders,
        directHireOrders,
        adApplications,
        adPaymentDeposits,
        subscriptionOrders,
        userType: user.userType,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching my orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // ── My Orders detail by type/id ───────────────────────────────────────────
  app.get('/api/my-orders/shop/:id', isAuthenticated, async (req: any, res) => {
    try {
      const purchase = await storage.getPurchaseById(req.params.id);
      if (!purchase) return res.status(404).json({ message: 'Order not found' });
      const [product] = await db.select().from(shopProducts).where(eq(shopProducts.id, purchase.productId));
      const sellerId = product?.createdBy || null;
      const isBuyer = purchase.userId === req.user.id;
      const isSeller = sellerId && sellerId === req.user.id;
      if (!isBuyer && !isSeller && req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      let seller: any = null;
      if (sellerId) {
        const [s] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl, userType: users.userType }).from(users).where(eq(users.id, sellerId));
        seller = s || null;
      }
      res.json({ ...purchase, product: product || null, seller, sellerId, role: isSeller ? 'seller' : 'buyer' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Append a shipping/tracking update (seller or admin only). Buyers fetch via GET /api/my-orders/shop/:id
  app.post('/api/my-orders/shop/:id/tracking', isAuthenticated, async (req: any, res) => {
    try {
      const purchase = await storage.getPurchaseById(req.params.id);
      if (!purchase) return res.status(404).json({ message: 'Order not found' });
      const [product] = await db.select().from(shopProducts).where(eq(shopProducts.id, purchase.productId));
      const sellerId = product?.createdBy || null;
      const isSeller = sellerId && sellerId === req.user.id;
      const isBuyer = purchase.userId === req.user.id;
      if (!isSeller && !isBuyer && req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const { status, note, location, trackingNumber, carrier, address, estimatedDelivery } = req.body || {};
      const dd: any = { ...(purchase.deliveryDetails as any || {}) };
      if (trackingNumber !== undefined) dd.trackingNumber = trackingNumber;
      if (carrier !== undefined) dd.carrier = carrier;
      if (address !== undefined) dd.address = address;
      if (estimatedDelivery !== undefined) dd.estimatedDelivery = estimatedDelivery;
      const updates = Array.isArray(dd.shippingUpdates) ? dd.shippingUpdates : [];
      if (status || note || location) {
        updates.push({
          status: status || 'update',
          note: note || '',
          location: location || '',
          ts: new Date().toISOString(),
          byUserId: req.user.id,
          byRole: isSeller ? 'seller' : (isBuyer ? 'buyer' : 'admin'),
        });
      }
      dd.shippingUpdates = updates;
      const updated = await storage.updatePurchase(req.params.id, { deliveryDetails: dd, ...(status && isSeller ? { status } : {}) } as any);
      res.json(updated);
    } catch (e: any) { console.error('tracking update err', e); res.status(500).json({ message: e.message }); }
  });

  // Buyer confirms delivery — closes out a shop order and lets buyer review.
  app.post('/api/my-orders/shop/:id/confirm-delivery', isAuthenticated, async (req: any, res) => {
    try {
      const purchase = await storage.getPurchaseById(req.params.id);
      if (!purchase) return res.status(404).json({ message: 'Order not found' });
      if (purchase.userId !== req.user.id) return res.status(403).json({ message: 'Only the buyer can confirm delivery' });
      if (purchase.status === 'delivered' || purchase.status === 'completed') {
        return res.status(409).json({ message: 'Order already confirmed' });
      }
      const dd: any = { ...(purchase.deliveryDetails as any || {}) };
      const updates = Array.isArray(dd.shippingUpdates) ? dd.shippingUpdates : [];
      updates.push({
        status: 'delivered',
        note: req.body?.note || 'Buyer confirmed receipt',
        location: '',
        ts: new Date().toISOString(),
        byUserId: req.user.id,
        byRole: 'buyer',
      });
      dd.shippingUpdates = updates;
      const updated = await storage.updatePurchase(req.params.id, {
        status: 'delivered',
        deliveryDetails: dd,
        deliveredAt: new Date(),
      } as any);
      res.json(updated);
    } catch (e: any) { console.error('confirm delivery err', e); res.status(500).json({ message: e.message }); }
  });

  // Submit a review for a purchased product directly from the orders page
  app.post('/api/my-orders/shop/:id/review', isAuthenticated, async (req: any, res) => {
    try {
      const purchase = await storage.getPurchaseById(req.params.id);
      if (!purchase) return res.status(404).json({ message: 'Order not found' });
      if (purchase.userId !== req.user.id) return res.status(403).json({ message: 'Only the buyer can leave a review' });
      const { rating, comment, title } = req.body || {};
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
      const review = await storage.createProductReview({
        productId: purchase.productId,
        userId: req.user.id,
        rating,
        title: title || null,
        comment: comment || null,
        isVerified: true,
      } as any);
      res.status(201).json(review);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Social Quick Tasks (public + admin) ────────────────────────────────────
  app.get('/api/social-quick-tasks', async (req: any, res) => {
    try {
      const tasks = await storage.getSocialQuickTasks(true);
      if (req.user) {
        const completedIds = await storage.getUserSocialTaskCompletions(req.user.id);
        return res.json(tasks.map(t => ({ ...t, completed: completedIds.includes(t.id) })));
      }
      res.json(tasks.map(t => ({ ...t, completed: false })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/social-quick-tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const [task] = await db.select().from(socialQuickTasks).where(eq(socialQuickTasks.id, taskId));
      if (!task || !task.isActive) return res.status(404).json({ message: 'Task not found' });
      const completedIds = await storage.getUserSocialTaskCompletions(req.user.id);
      if (completedIds.includes(taskId)) return res.status(409).json({ message: 'Already completed' });
      await storage.completeSocialQuickTask(req.user.id, taskId);
      const reward = task.pointsReward || 0;
      if (reward > 0) {
        await storage.awardPoints(req.user.id, 'social_task', reward, `Completed social task: ${task.label}`, taskId);
      }
      res.json({ success: true, pointsEarned: reward });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Admin CRUD social quick tasks
  app.get('/api/admin/social-quick-tasks', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    res.json(await storage.getSocialQuickTasks(false));
  });

  app.post('/api/admin/social-quick-tasks', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const task = await storage.createSocialQuickTask(req.body);
    res.status(201).json(task);
  });

  app.patch('/api/admin/social-quick-tasks/:id', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const task = await storage.updateSocialQuickTask(req.params.id, req.body);
    res.json(task);
  });

  app.delete('/api/admin/social-quick-tasks/:id', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await storage.deleteSocialQuickTask(req.params.id);
    res.json({ success: true });
  });

  // ── Site Social Links (public + admin) ─────────────────────────────────────
  app.get('/api/site-social-links', async (req: any, res) => {
    res.json(await storage.getSiteSocialLinks(true));
  });

  app.get('/api/admin/site-social-links', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    res.json(await storage.getSiteSocialLinks(false));
  });

  app.post('/api/admin/site-social-links', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const link = await storage.createSiteSocialLink(req.body);
    res.status(201).json(link);
  });

  app.patch('/api/admin/site-social-links/:id', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const link = await storage.updateSiteSocialLink(req.params.id, req.body);
    res.json(link);
  });

  app.delete('/api/admin/site-social-links/:id', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await storage.deleteSiteSocialLink(req.params.id);
    res.json({ success: true });
  });

  // ── Admin All Transactions ────────────────────────────────────────────────
  app.get('/api/admin/all-transactions', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const limit = Math.min(200, Number(req.query.limit) || 100);
    const offset = Number(req.query.offset) || 0;
    const txs = await storage.getAllTransactionsPaginated(limit, offset);
    res.json(txs);
  });

  app.patch('/api/admin/transactions/:id', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
      const { status, adminNotes } = req.body;
      const updated = await storage.updateTransaction(req.params.id as any, { status, description: adminNotes } as any);
      if (status === 'completed' && updated.type === 'tdrip_topup') {
        const points = Number(updated.referenceId || 0);
        if (points > 0 && updated.userId) {
          await storage.awardPoints(updated.userId, 'tdrip_purchase', points, `Admin approved: ${points} $TDRIP top-up`, updated.id as any);
          await storage.createNotification({ userId: updated.userId, type: 'tdrip_credited', title: '$TDRIP Points Credited', content: `Your top-up of ${points} $TDRIP points has been approved and credited to your wallet.`, actionUrl: '/wallet' } as any);
        }
      }
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ──────────────────────────────────────────────────────────────
  // CMS: Nav Config, Theme Config, Announcement Banner
  // ──────────────────────────────────────────────────────────────

  // Abraham Tahbat portfolio assets are kept in attached_assets so the
  // supplied portrait and CV remain part of the imported project.
  app.get('/api/portfolio-assets/:asset', (req, res) => {
    const assets: Record<string, { filename: string; contentType: string }> = {
      portrait: {
        filename: 'IMG-20260825-WA0006_1787859432337.jpg',
        contentType: 'image/jpeg',
      },
      cv: {
        filename: 'Abraham_Tahbat_Executive_CV_2026_(1)_1787851203671.pdf',
        contentType: 'application/pdf',
      },
    };
    const asset = assets[req.params.asset];
    if (!asset) return res.status(404).json({ message: 'Portfolio asset not found' });
    res.set({
      'Content-Type': asset.contentType,
      'Content-Disposition': asset.contentType === 'application/pdf' ? 'inline' : 'inline',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    }).sendFile(path.resolve(process.cwd(), 'attached_assets', asset.filename), (error) => {
      if (error && !res.headersSent) res.status(error.statusCode || 404).json({ message: 'Portfolio asset not found' });
    });
  });

  const readPortfolioContent = async () => {
    const rows = await db.select().from(siteContent).where(
      inArray(siteContent.contentKey, [PORTFOLIO_CONTENT_KEYS.profile, PORTFOLIO_CONTENT_KEYS.projects])
    );
    const profileRow = rows.find((row) => row.contentKey === PORTFOLIO_CONTENT_KEYS.profile);
    const projectsRow = rows.find((row) => row.contentKey === PORTFOLIO_CONTENT_KEYS.projects);
    let profile = DEFAULT_PORTFOLIO_PROFILE;
    let projects = DEFAULT_PORTFOLIO_PROJECTS;
    try {
      if (profileRow?.value) {
        const storedProfile = JSON.parse(profileRow.value);
        if (storedProfile && typeof storedProfile === "object") {
           profile = { ...DEFAULT_PORTFOLIO_PROFILE, ...storedProfile };
           const existingSocialLinks = Array.isArray(profile.socialLinks) ? profile.socialLinks : [];
           profile.socialLinks = [
             ...existingSocialLinks,
             ...DEFAULT_PORTFOLIO_PROFILE.socialLinks.filter((required) => (
               !existingSocialLinks.some((link) => link.label.toLowerCase() === required.label.toLowerCase())
             )),
           ];
          // Migrate the original seeded contact and API-only asset paths while
          // preserving any custom profile content an admin has entered.
          if (!profile.email || profile.email === "tremendouslymax@gmail.com") {
            profile.email = DEFAULT_PORTFOLIO_PROFILE.email;
          }
          if (!profile.portraitUrl || profile.portraitUrl === "/api/portfolio-assets/portrait") {
            profile.portraitUrl = DEFAULT_PORTFOLIO_PROFILE.portraitUrl;
          }
          if (!profile.cvUrl || profile.cvUrl === "/api/portfolio-assets/cv") {
            profile.cvUrl = DEFAULT_PORTFOLIO_PROFILE.cvUrl;
          }
        }
      }
    } catch {
      console.error('[Portfolio] Invalid profile JSON, using defaults');
    }
    try {
      if (projectsRow?.value) {
        const storedProjects = JSON.parse(projectsRow.value);
        if (Array.isArray(storedProjects)) projects = storedProjects;
      }
    } catch {
      console.error('[Portfolio] Invalid projects JSON, using defaults');
    }
    return { profile, projects };
  };

  app.get('/api/abraham-portfolio', async (_req, res) => {
    try {
      const { profile, projects } = await readPortfolioContent();
      res.json({
        profile,
        projects: (Array.isArray(projects) ? projects : []).filter((project: any) => project?.visible !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/abraham-portfolio/:slug', async (req, res) => {
    try {
      const { profile, projects } = await readPortfolioContent();
      const project = (Array.isArray(projects) ? projects : []).find(
        (item: any) => item?.slug === req.params.slug && item?.visible !== false
      );
      if (!project) return res.status(404).json({ message: 'Portfolio project not found' });
      res.json({ profile, project });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/admin/abraham-portfolio', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      res.json(await readPortfolioContent());
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put('/api/admin/abraham-portfolio', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const { profile, projects } = req.body || {};
      if (!profile || typeof profile !== 'object' || !Array.isArray(projects)) {
        return res.status(400).json({ message: 'Profile object and projects array are required' });
      }
      if (projects.some((project: any) => !project?.slug || !project?.title)) {
        return res.status(400).json({ message: 'Every project needs a slug and title' });
      }

      const existing = await db.select({ contentKey: siteContent.contentKey })
        .from(siteContent)
        .where(inArray(siteContent.contentKey, [PORTFOLIO_CONTENT_KEYS.profile, PORTFOLIO_CONTENT_KEYS.projects]));
      const existingKeys = new Set(existing.map((row) => row.contentKey));
      const save = async (key: string, label: string, section: string, value: unknown, sortOrder: number) => {
        const serialized = JSON.stringify(value);
        if (existingKeys.has(key)) {
          return storage.updateSiteContent(key, serialized);
        }
        return storage.upsertSiteContent({
          contentKey: key,
          label,
          contentType: 'json',
          page: 'portfolio',
          section,
          value: serialized,
          defaultValue: serialized,
          sortOrder,
        } as any);
      };
      await save(PORTFOLIO_CONTENT_KEYS.profile, 'Abraham Tahbat Portfolio Profile', 'profile', profile, 0);
      await save(PORTFOLIO_CONTENT_KEYS.projects, 'Abraham Tahbat Portfolio Projects', 'projects', projects, 1);
      res.json({ profile, projects });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/nav-config', async (_req, res) => {
    try {
      const [config] = await db.select().from(siteContent).where(eq(siteContent.contentKey, 'cms_nav_config'));
      res.json({ items: config?.value ? JSON.parse(config.value) : null });
    } catch (e) { res.status(500).json({ message: 'Failed to fetch nav config' }); }
  });

  app.put('/api/admin/nav-config', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const result = await storage.upsertSiteContent({ contentKey: 'cms_nav_config', label: 'Navigation Items', contentType: 'json', page: 'global', section: 'nav', value: JSON.stringify(req.body.items), defaultValue: '[]' });
      res.json({ items: JSON.parse(result.value) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/theme-config', async (_req, res) => {
    try {
      const [config] = await db.select().from(siteContent).where(eq(siteContent.contentKey, 'cms_theme_config'));
      res.json(config?.value ? JSON.parse(config.value) : {});
    } catch (e) { res.status(500).json({ message: 'Failed to fetch theme config' }); }
  });

  app.put('/api/admin/theme-config', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const result = await storage.upsertSiteContent({ contentKey: 'cms_theme_config', label: 'Theme Colors', contentType: 'json', page: 'global', section: 'theme', value: JSON.stringify(req.body), defaultValue: '{}' });
      res.json(JSON.parse(result.value));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/announcement', async (_req, res) => {
    try {
      const [config] = await db.select().from(siteContent).where(eq(siteContent.contentKey, 'cms_announcement'));
      res.json(config?.value ? JSON.parse(config.value) : { enabled: false, message: '', color: 'purple', link: '' });
    } catch (e) { res.status(500).json({ message: 'Failed to fetch announcement' }); }
  });

  app.put('/api/admin/announcement', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const result = await storage.upsertSiteContent({ contentKey: 'cms_announcement', label: 'Site Announcement', contentType: 'json', page: 'global', section: 'announcement', value: JSON.stringify(req.body), defaultValue: '{"enabled":false,"message":"","color":"purple","link":""}' });
      res.json(JSON.parse(result.value));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Admin Social Tasks Completions stats ─────────────────────────────────
  app.get('/api/admin/social-task-stats', isAuthenticated, async (req: any, res) => {
    if (req.user.userType !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const stats = await db.select({ taskId: userSocialTaskCompletions.taskId, count: sql<number>`count(*)` })
      .from(userSocialTaskCompletions)
      .groupBy(userSocialTaskCompletions.taskId);
    res.json(stats);
  });

  // ── Page SEO Settings ──────────────────────────────────────────────────────
  app.get('/api/seo/pages', async (_req, res) => {
    try {
      const pages = await db.select().from(pageSeoSettings).orderBy(pageSeoSettings.pageTitle);
      res.json(pages);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/seo/page/:slug', async (req, res) => {
    try {
      const [page] = await db.select().from(pageSeoSettings).where(eq(pageSeoSettings.pageSlug, req.params.slug));
      res.json(page || null);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/seo/page/:slug', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const { pageSlug, ...body } = req.body;
      const slug = req.params.slug;
      const existing = await db.select().from(pageSeoSettings).where(eq(pageSeoSettings.pageSlug, slug));
      if (existing.length > 0) {
        const [updated] = await db.update(pageSeoSettings).set({ ...body, updatedAt: new Date() }).where(eq(pageSeoSettings.pageSlug, slug)).returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(pageSeoSettings).values({ pageSlug: slug, pageTitle: body.pageTitle || slug, ...body }).returning();
        res.json(created);
      }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/admin/seo/seed-defaults', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const OG = 'https://taskdrip.online/taskdrip-logo.jpg';
      const defaultPages = [
        { pageSlug: 'home', pageTitle: 'Home Page', metaTitle: 'Taskdrip — Earn Crypto Completing Brand Tasks | Web3 Influencer Platform', metaDescription: 'Taskdrip is the #1 Web3 influencer marketplace. Complete social media tasks, promote brands, and earn USDT crypto rewards. Join 10,000+ verified creators earning daily.', keywords: 'earn crypto online, web3 influencer platform, brand campaigns, earn USDT, crypto rewards, social media tasks, influencer marketing Nigeria', ogTitle: 'Taskdrip — Earn Crypto Completing Brand Tasks', ogImage: OG, canonicalUrl: 'https://taskdrip.online', noIndex: false },
        { pageSlug: 'tasks', pageTitle: 'Tasks / Campaigns', metaTitle: 'Browse Brand Campaigns & Earn Crypto | Taskdrip Tasks', metaDescription: 'Browse hundreds of paid brand campaigns on Taskdrip. Follow, like, share, and create content for top brands. Earn USDT and crypto rewards instantly upon approval.', keywords: 'paid social media tasks, brand campaigns, earn USDT tasks, crypto campaign rewards, influencer tasks', ogImage: OG, canonicalUrl: 'https://taskdrip.online/tasks', noIndex: false },
        { pageSlug: 'p2p-hub', pageTitle: 'P2P Marketplace', metaTitle: 'P2P Crypto Marketplace — Buy & Sell with Escrow Protection | Taskdrip', metaDescription: 'Trade crypto, digital services, and products peer-to-peer with escrow protection on Taskdrip. Safe, fast P2P transactions with verified sellers and buyer protection.', keywords: 'P2P crypto marketplace, buy sell crypto, peer to peer trading, escrow crypto, P2P Nigeria', ogImage: OG, canonicalUrl: 'https://taskdrip.online/p2p-hub', noIndex: false },
        { pageSlug: 'shop', pageTitle: 'Shop', metaTitle: 'Digital Products & Creator Tools | Taskdrip Shop', metaDescription: 'Shop premium digital products, creator tools, e-books, and resources on Taskdrip. Curated selection of high-quality digital downloads for creators, marketers, and entrepreneurs.', keywords: 'digital products shop, creator tools, e-books, digital downloads, online store', ogImage: OG, canonicalUrl: 'https://taskdrip.online/shop', noIndex: false },
        { pageSlug: 'influencers', pageTitle: 'Influencers Directory', metaTitle: 'Find Verified Influencers & Content Creators | Taskdrip Directory', metaDescription: 'Discover thousands of verified influencers and content creators on Taskdrip. Filter by niche, following, engagement rate, and country. Find the perfect creator for your brand.', keywords: 'influencer directory, find influencers, content creators, verified influencers, brand collaboration', ogImage: OG, canonicalUrl: 'https://taskdrip.online/influencers', noIndex: false },
        { pageSlug: 'brands', pageTitle: 'Brands Discovery', metaTitle: 'Discover Brands & Sponsor Opportunities | Taskdrip', metaDescription: 'Browse top brands on Taskdrip looking for content creators and influencers. Find sponsorship opportunities, brand deals, and paid collaborations with verified companies.', keywords: 'brand deals, sponsor opportunities, brand collaborations, influencer sponsorship', ogImage: OG, canonicalUrl: 'https://taskdrip.online/brands', noIndex: false },
        { pageSlug: 'about', pageTitle: 'About Us', metaTitle: 'About Taskdrip — Our Mission to Empower Creators with Crypto', metaDescription: 'Taskdrip is a Web3 influencer marketing platform built to help content creators earn crypto from brand campaigns. Learn about our story, mission, team, and values.', keywords: 'about taskdrip, web3 influencer platform, crypto creator economy, taskdrip mission', ogImage: OG, canonicalUrl: 'https://taskdrip.online/about', noIndex: false },
        { pageSlug: 'blog', pageTitle: 'Blog', metaTitle: 'Taskdrip Blog — Crypto, Influencer Marketing & Web3 Insights', metaDescription: 'Read the latest articles on crypto earnings, influencer marketing strategies, Web3 trends, and creator economy tips on the Taskdrip blog. Updated weekly with actionable guides.', keywords: 'crypto blog, influencer marketing blog, web3 tips, creator economy, earn crypto guide', ogImage: OG, canonicalUrl: 'https://taskdrip.online/blog', noIndex: false },
        { pageSlug: 'breedskool', pageTitle: 'BreedSkool', metaTitle: 'BreedSkool — Learn Tech Skills & Earn | Taskdrip Training', metaDescription: 'BreedSkool offers tech training in Web Development, AI Content Creation, Social Media Monetization, Trading, and more. Learn skills, get certified, and earn crypto rewards.', keywords: 'tech training Nigeria, web development course, AI content creation, social media monetization, breedskool', ogImage: OG, canonicalUrl: 'https://taskdrip.online/breedskool', noIndex: false },
        { pageSlug: 'leaderboard', pageTitle: 'Leaderboard', metaTitle: 'Top Earners Leaderboard — Who\'s Earning the Most on Taskdrip?', metaDescription: 'See the top-earning creators and influencers on Taskdrip\'s leaderboard. Compete to reach the top and earn bigger crypto rewards. Updated in real-time.', keywords: 'top earners, leaderboard, taskdrip top creators, earn most crypto, influencer rankings', ogImage: OG, canonicalUrl: 'https://taskdrip.online/leaderboard', noIndex: false },
        { pageSlug: 'advertise', pageTitle: 'Advertise With Us', metaTitle: 'Advertise on Taskdrip — Reach 10,000+ Verified Influencers', metaDescription: 'Launch your influencer marketing campaign on Taskdrip. Reach 10,000+ verified creators across Africa and globally. Affordable rates, guaranteed deliverables, real engagement.', keywords: 'advertise with influencers, influencer marketing campaign, brand promotion, social media advertising', ogImage: OG, canonicalUrl: 'https://taskdrip.online/advertise', noIndex: false },
        { pageSlug: 'contact', pageTitle: 'Contact', metaTitle: 'Contact Taskdrip — Support, Partnerships & General Inquiries', metaDescription: 'Get in touch with Taskdrip for support, brand partnerships, or general inquiries. Our team responds within 24 hours. Also reach us on WhatsApp and Telegram.', keywords: 'contact taskdrip, taskdrip support, brand partnership inquiry', ogImage: OG, canonicalUrl: 'https://taskdrip.online/contact', noIndex: false },
        { pageSlug: 'login', pageTitle: 'Login', metaTitle: 'Login to Taskdrip — Access Your Creator Dashboard', metaDescription: 'Log in to your Taskdrip account to manage campaigns, check your crypto earnings, and access your creator dashboard.', keywords: 'taskdrip login, creator dashboard', ogImage: OG, canonicalUrl: 'https://taskdrip.online/login', noIndex: false },
        { pageSlug: 'signup', pageTitle: 'Sign Up', metaTitle: 'Sign Up Free — Join Taskdrip & Start Earning Crypto Today', metaDescription: 'Create your free Taskdrip account in 60 seconds. Start completing brand tasks, earning USDT crypto, and building your creator income today. No experience needed.', keywords: 'join taskdrip, sign up crypto, create account, start earning crypto, influencer signup', ogImage: OG, canonicalUrl: 'https://taskdrip.online/signup', noIndex: false },
        { pageSlug: 'tdrip', pageTitle: '$TDRIP Token', metaTitle: '$TDRIP Token — Taskdrip\'s Reward Points & Future Crypto Token', metaDescription: 'Learn about $TDRIP, Taskdrip\'s points and future crypto token. Earn $TDRIP completing tasks, climbing the leaderboard, and referring friends. Redeem for crypto rewards.', keywords: 'TDRIP token, taskdrip crypto token, earn TDRIP, web3 reward token', ogImage: OG, canonicalUrl: 'https://taskdrip.online/tdrip', noIndex: false },
        { pageSlug: 'feed', pageTitle: 'Creator Feed', metaTitle: 'Creator Feed — Latest Posts from Taskdrip Influencers', metaDescription: 'Browse the latest posts, updates, and content from Taskdrip\'s creator community. Follow top influencers, discover trending content, and engage with the Web3 creator economy.', keywords: 'creator feed, influencer posts, web3 creators, taskdrip community', ogImage: OG, canonicalUrl: 'https://taskdrip.online/feed', noIndex: false },
      ];
      let upserted = 0;
      for (const page of defaultPages) {
        await db.insert(pageSeoSettings)
          .values({ ...page, updatedAt: new Date() } as any)
          .onConflictDoUpdate({
            target: pageSeoSettings.pageSlug,
            set: { ...page, updatedAt: new Date() } as any,
          });
        upserted++;
      }
      res.json({ message: `Upserted ${upserted} SEO pages`, total: defaultPages.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Footer Columns ───────────────────────────────────────────────────────
  app.get('/api/footer-columns', async (_req, res) => {
    try {
      const cols = await db.select().from(footerColumns).orderBy(footerColumns.sortOrder);
      res.json(cols);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/admin/footer-columns', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const [col] = await db.insert(footerColumns).values({ title: req.body.title, links: req.body.links || [], sortOrder: req.body.sortOrder || 0, isActive: req.body.isActive !== false }).returning();
      res.json(col);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/footer-columns/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const [col] = await db.update(footerColumns).set({ title: req.body.title, links: req.body.links, sortOrder: req.body.sortOrder, isActive: req.body.isActive }).where(eq(footerColumns.id, req.params.id)).returning();
      res.json(col);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/admin/footer-columns/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      await db.delete(footerColumns).where(eq(footerColumns.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Robots.txt & Sitemap ────────────────────────────────────────────────
  app.get('/robots.txt', async (_req, res) => {
    try {
      const domain = 'https://taskdrip.online';
      res.type('text/plain');
      res.send([
        '# Taskdrip robots.txt',
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /admin/',
        'Disallow: /api/',
        'Disallow: /dashboard',
        'Disallow: /dashboard/',
        'Disallow: /profile/',
        'Disallow: /user-profile/',
        'Disallow: /brand-dashboard',
        '',
        '# Crawl delay for respectful crawling',
        'Crawl-delay: 1',
        '',
        `Sitemap: ${domain}/sitemap.xml`,
        '',
      ].join('\n'));
    } catch { res.type('text/plain'); res.send('User-agent: *\nAllow: /\n'); }
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
      const domain = host
        ? `${proto}://${host}`
        : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://taskdrip.online');
      const today = new Date().toISOString().split('T')[0];
      const staticPages: { path: string; priority: string; changefreq: string }[] = [
        { path: '', priority: '1.0', changefreq: 'daily' },
        { path: '/tasks', priority: '0.9', changefreq: 'daily' },
        { path: '/p2p-hub', priority: '0.9', changefreq: 'daily' },
        { path: '/shop', priority: '0.9', changefreq: 'daily' },
        { path: '/influencers', priority: '0.9', changefreq: 'daily' },
        { path: '/brands', priority: '0.9', changefreq: 'daily' },
        { path: '/feed', priority: '0.8', changefreq: 'hourly' },
        { path: '/blog', priority: '0.8', changefreq: 'daily' },
        { path: '/breedskool', priority: '0.8', changefreq: 'weekly' },
        { path: '/leaderboard', priority: '0.7', changefreq: 'daily' },
        { path: '/advertise', priority: '0.7', changefreq: 'monthly' },
        { path: '/about', priority: '0.6', changefreq: 'monthly' },
        { path: '/contact', priority: '0.6', changefreq: 'monthly' },
        { path: '/tdrip', priority: '0.7', changefreq: 'weekly' },
        { path: '/signup', priority: '0.7', changefreq: 'monthly' },
        { path: '/login', priority: '0.5', changefreq: 'monthly' },
        { path: '/terms', priority: '0.3', changefreq: 'yearly' },
        { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
        { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
        { path: '/disclaimer', priority: '0.3', changefreq: 'yearly' },
      ];
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      for (const p of staticPages) {
        xml += `  <url><loc>${domain}${p.path}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>\n`;
      }
      try {
        const blogPostsList = await db.select({ slug: posts.slug, updatedAt: posts.updatedAt }).from(posts).where(eq(posts.status, 'published')).limit(500);
        for (const post of blogPostsList) {
          if (post.slug) {
            const lm = post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : today;
            xml += `  <url><loc>${domain}/blog/${post.slug}</loc><lastmod>${lm}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
          }
        }
      } catch {}
      try {
        const productList = await db.select({ id: shopProducts.id }).from(shopProducts).limit(500);
        for (const p of productList) {
          xml += `  <url><loc>${domain}/shop/product/${p.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
        }
      } catch {}
      try {
        const creatorList = await db.select({ id: users.id }).from(users).where(eq(users.userType, 'influencer')).limit(500);
        for (const c of creatorList) {
          xml += `  <url><loc>${domain}/influencers/${c.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
        }
      } catch {}
      try {
        const brandList = await db.select({ id: users.id }).from(users).where(eq(users.userType, 'brand')).limit(500);
        for (const b of brandList) {
          xml += `  <url><loc>${domain}/brand/${b.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
        }
      } catch {}
      xml += `</urlset>`;
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.type('application/xml');
      res.send(xml);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Internal Page View Analytics ──────────────────────────────────────────
  app.post('/api/analytics/track', async (req: any, res) => {
    try {
      const { path, referrer, sessionId } = req.body || {};
      if (!path || typeof path !== 'string') return res.status(400).json({ message: 'path required' });
      if (path.startsWith('/api') || path.startsWith('/admin')) return res.json({ ok: true, skipped: true });
      const ua = (req.headers['user-agent'] || '').toString().slice(0, 255);
      const device = /mobile|iphone|ipad|android/i.test(ua) ? 'mobile' : 'desktop';
      await db.insert(pageViews).values({
        path: path.slice(0, 255),
        referrer: referrer ? String(referrer).slice(0, 255) : null,
        userId: req.user?.id || null,
        sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
        userAgent: ua,
        device,
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(200).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/admin/analytics/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.userType !== 'admin' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const days = Math.min(90, Math.max(1, parseInt(String(req.query.days || '30'), 10)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const totalRows = await db.select({ c: count() }).from(pageViews).where(gte(pageViews.createdAt, since));
      const total = Number(totalRows[0]?.c || 0);

      const uniqueVisitorRows = await db.execute(sql`
        SELECT COUNT(DISTINCT COALESCE(session_id, user_id, user_agent)) AS c
        FROM page_views WHERE created_at >= ${since}
      `);
      const uniqueVisitors = Number((uniqueVisitorRows.rows?.[0] as any)?.c || 0);

      const topPagesRows = await db.execute(sql`
        SELECT path, COUNT(*)::int AS views
        FROM page_views WHERE created_at >= ${since}
        GROUP BY path ORDER BY views DESC LIMIT 15
      `);
      const topPages = (topPagesRows.rows || []) as { path: string; views: number }[];

      const topReferrersRows = await db.execute(sql`
        SELECT COALESCE(NULLIF(referrer, ''), 'direct') AS referrer, COUNT(*)::int AS views
        FROM page_views WHERE created_at >= ${since}
        GROUP BY referrer ORDER BY views DESC LIMIT 10
      `);
      const topReferrers = (topReferrersRows.rows || []) as { referrer: string; views: number }[];

      const dailyRows = await db.execute(sql`
        SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*)::int AS views
        FROM page_views WHERE created_at >= ${since}
        GROUP BY day ORDER BY day ASC
      `);
      const daily = (dailyRows.rows || []).map((r: any) => ({
        day: new Date(r.day).toISOString().split('T')[0],
        views: Number(r.views),
      }));

      const deviceRows = await db.execute(sql`
        SELECT COALESCE(device, 'unknown') AS device, COUNT(*)::int AS views
        FROM page_views WHERE created_at >= ${since}
        GROUP BY device ORDER BY views DESC
      `);
      const devices = (deviceRows.rows || []) as { device: string; views: number }[];

      res.json({ days, total, uniqueVisitors, topPages, topReferrers, daily, devices });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Lead Discovery & Outreach (admin) ─────────────────────────────────────
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.userType !== "admin" && req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    next();
  };

  app.get('/api/admin/leads/providers', isAuthenticated, requireAdmin, (_req, res) => {
    res.json(providerStatus());
  });

  app.get('/api/admin/leads', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const {
        kind, niche, businessType, country, city, status,
        search, minFollowers, hasPhone, hasWebsite, hasEmail,
        limit = "100", offset = "0",
      } = req.query;
      const conds: any[] = [];
      if (kind) conds.push(eq(leads.kind, String(kind)));
      if (niche) conds.push(sql`lower(${leads.niche}) LIKE ${"%" + String(niche).toLowerCase() + "%"}`);
      if (businessType) conds.push(sql`lower(${leads.businessType}) LIKE ${"%" + String(businessType).toLowerCase() + "%"}`);
      if (country) conds.push(eq(leads.country, String(country)));
      if (city) conds.push(sql`lower(${leads.city}) LIKE ${"%" + String(city).toLowerCase() + "%"}`);
      if (status) conds.push(eq(leads.status, String(status)));
      if (search) {
        const s = `%${String(search).toLowerCase()}%`;
        conds.push(sql`(lower(${leads.name}) LIKE ${s} OR lower(${leads.address}) LIKE ${s} OR lower(${leads.phone}) LIKE ${s} OR lower(${leads.website}) LIKE ${s} OR lower(${leads.email}) LIKE ${s})`);
      }
      if (minFollowers) conds.push(sql`${leads.followers} >= ${parseInt(String(minFollowers), 10) || 0}`);
      if (hasPhone === "true") conds.push(sql`${leads.phone} IS NOT NULL AND ${leads.phone} <> ''`);
      if (hasWebsite === "true") conds.push(sql`${leads.website} IS NOT NULL AND ${leads.website} <> ''`);
      if (hasEmail === "true") conds.push(sql`${leads.email} IS NOT NULL AND ${leads.email} <> ''`);

      const where = conds.length ? and(...conds) : undefined;
      const rows = await db.select().from(leads).where(where as any).orderBy(desc(leads.createdAt))
        .limit(Math.min(500, parseInt(String(limit), 10) || 100))
        .offset(parseInt(String(offset), 10) || 0);
      const totalRow = await db.select({ c: count() }).from(leads).where(where as any);
      res.json({ items: rows, total: Number(totalRow[0]?.c || 0) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/leads/stats', isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const [byKind, byStatus, byCountry, byNiche, totalRow] = await Promise.all([
        db.execute(sql`SELECT kind, COUNT(*)::int AS c FROM leads GROUP BY kind`),
        db.execute(sql`SELECT COALESCE(status,'new') AS status, COUNT(*)::int AS c FROM leads GROUP BY status`),
        db.execute(sql`SELECT COALESCE(country,'Unknown') AS country, COUNT(*)::int AS c FROM leads GROUP BY country ORDER BY c DESC LIMIT 10`),
        db.execute(sql`SELECT COALESCE(NULLIF(niche,''),'Uncategorized') AS niche, COUNT(*)::int AS c FROM leads GROUP BY niche ORDER BY c DESC LIMIT 10`),
        db.select({ c: count() }).from(leads),
      ]);
      res.json({
        total: Number(totalRow[0]?.c || 0),
        byKind: byKind.rows || [],
        byStatus: byStatus.rows || [],
        byCountry: byCountry.rows || [],
        byNiche: byNiche.rows || [],
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/leads/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
      if (!lead) return res.status(404).json({ message: "Not found" });
      const msgs = await db.select().from(leadMessages).where(eq(leadMessages.leadId, lead.id)).orderBy(desc(leadMessages.createdAt));
      res.json({ lead, messages: msgs });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/leads/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allowed: any = {};
      const fields = ["name","niche","businessType","country","city","address","phone","whatsapp","email","website","socialLinks","followers","yearsInBusiness","description","tags","status","aiSummary","aiReport"];
      for (const f of fields) if (f in req.body) allowed[f] = (req.body as any)[f];
      allowed.updatedAt = new Date();
      const [updated] = await db.update(leads).set(allowed).where(eq(leads.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete('/api/admin/leads/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await db.delete(leadMessages).where(eq(leadMessages.leadId, req.params.id));
      await db.delete(leads).where(eq(leads.id, req.params.id));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/admin/leads/manual', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.name || !body.kind) return res.status(400).json({ message: "name and kind required" });
      const [row] = await db.insert(leads).values({ ...body, source: body.source || "manual" }).returning();
      res.json(row);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post('/api/admin/leads/discover/businesses', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { query, location, country, maxResults } = req.body || {};
      if (!query) return res.status(400).json({ message: "query required" });
      const found = await searchBusinessesGoogle({ query, location, country, maxResults });
      const saved = await persistLeads(found);
      res.json({ found: found.length, saved: saved.length, items: saved });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post('/api/admin/leads/discover/influencers', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { query, country, maxResults, includeInternal } = req.body || {};
      const items: any[] = [];
      if (query) {
        try {
          const yt = await searchInfluencersYouTube({ query, country, maxResults });
          items.push(...yt);
        } catch (e: any) {
          if (!includeInternal) throw e;
        }
      }
      if (includeInternal) {
        const internal = await db.select().from(users).where(eq(users.userType, "influencer")).limit(50);
        for (const u of internal) {
          items.push({
            kind: "influencer",
            source: "internal",
            externalId: `internal_${u.id}`,
            name: (u as any).displayName || u.username || (u as any).firstName || "Creator",
            niche: (u as any).primaryNiche || query || null,
            country: (u as any).country || country || null,
            email: (u as any).email || null,
            followers: (u as any).totalFollowers || null,
            socialLinks: {
              instagram: (u as any).instagramHandle ? `https://instagram.com/${(u as any).instagramHandle}` : null,
              tiktok: (u as any).tiktokHandle ? `https://tiktok.com/@${(u as any).tiktokHandle}` : null,
              youtube: (u as any).youtubeHandle ? `https://youtube.com/@${(u as any).youtubeHandle}` : null,
              x: (u as any).twitterHandle ? `https://x.com/${(u as any).twitterHandle}` : null,
              telegram: (u as any).telegramHandle ? `https://t.me/${(u as any).telegramHandle}` : null,
            },
          });
        }
      }
      const saved = await persistLeads(items);
      res.json({ found: items.length, saved: saved.length, items: saved });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post('/api/admin/leads/:id/ai-report', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
      if (!lead) return res.status(404).json({ message: "Not found" });
      const out = await generateAiReport(lead);
      const [updated] = await db.update(leads).set({ aiSummary: out.summary, aiReport: out.report, updatedAt: new Date() }).where(eq(leads.id, lead.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post('/api/admin/leads/:id/messages', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { channel, body, provider } = req.body || {};
      if (!channel) return res.status(400).json({ message: "channel required" });
      const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
      if (!lead) return res.status(404).json({ message: "Not found" });

      let result: any = { status: "logged", provider: provider || "manual" };
      if (channel === "sms" && provider === "twilio") {
        const phone = lead.phone || lead.whatsapp;
        if (!phone) return res.status(400).json({ message: "Lead has no phone" });
        const out = await sendSmsTwilio(phone, body || "");
        result = { status: out.error ? "failed" : "sent", provider: "twilio", providerId: out.sid, error: out.error };
      } else if (channel === "whatsapp") {
        result.provider = "wa_link";
      } else if (channel === "call") {
        result.provider = "tel_link";
      }

      const [msg] = await db.insert(leadMessages).values({
        leadId: lead.id,
        channel,
        direction: "outbound",
        body: body || null,
        status: result.status,
        provider: result.provider,
        providerId: result.providerId || null,
        error: result.error || null,
        sentBy: req.user?.id || null,
      }).returning();

      if (result.status === "sent" || result.status === "logged") {
        await db.update(leads).set({ status: "contacted", lastContactedAt: new Date() }).where(eq(leads.id, lead.id));
      }
      res.json({ message: msg, ...result });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.post('/api/admin/leads/bulk-sms', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { leadIds, body, niche, country, kind } = req.body || {};
      if (!body) return res.status(400).json({ message: "body required" });
      let ids: string[] = Array.isArray(leadIds) ? leadIds : [];
      if (!ids.length && (niche || country || kind)) {
        const conds: any[] = [];
        if (niche) conds.push(sql`lower(${leads.niche}) LIKE ${"%" + String(niche).toLowerCase() + "%"}`);
        if (country) conds.push(eq(leads.country, String(country)));
        if (kind) conds.push(eq(leads.kind, String(kind)));
        const rows = await db.select({ id: leads.id }).from(leads).where(and(...conds) as any).limit(2000);
        ids = rows.map(r => r.id);
      }
      if (!ids.length) return res.status(400).json({ message: "No matching leads" });
      const campaignId = `bulk_${Date.now()}`;
      const results = await bulkSms({ leadIds: ids, body, sentBy: req.user?.id, campaignId });
      const sent = results.filter(r => !r.error).length;
      const failed = results.length - sent;
      res.json({ campaignId, attempted: results.length, sent, failed, results });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Legal Pages (public read, admin write) ────────────────────────────────
  app.get('/api/legal/:slug', async (req: any, res) => {
    try {
      const { slug } = req.params;
      const rows = await db.select().from(legalPages).where(eq(legalPages.slug, slug)).limit(1);
      if (!rows.length) return res.status(404).json({ message: 'Page not found' });
      res.json(rows[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/legal/:slug', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const { slug } = req.params;
      const { title, content } = req.body;
      if (!content) return res.status(400).json({ message: 'content is required' });
      const existing = await db.select().from(legalPages).where(eq(legalPages.slug, slug)).limit(1);
      if (existing.length) {
        await db.update(legalPages).set({ title: title || existing[0].title, content, lastUpdatedBy: req.user.id, updatedAt: new Date() }).where(eq(legalPages.slug, slug));
      } else {
        await db.insert(legalPages).values({ slug, title: title || slug, content, lastUpdatedBy: req.user.id });
      }
      const updated = await db.select().from(legalPages).where(eq(legalPages.slug, slug)).limit(1);
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/legal', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const rows = await db.select().from(legalPages).orderBy(legalPages.slug);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Newsletter Subscribers ────────────────────────────────────────────────
  app.post('/api/contact', async (req: any, res) => {
    try {
      const { name, email, subject, message, type } = req.body || {};
      const validTypes = new Set(["general", "support", "partnership", "bug"]);
      if (!name || !email || !subject || !message || !validTypes.has(type)) {
        return res.status(400).json({ message: "Name, email, subject, message, and enquiry type are required." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      if (String(message).trim().length < 10) {
        return res.status(400).json({ message: "Message must be at least 10 characters." });
      }

      const recipient = type === "support" || type === "bug"
        ? TASKDRIP_EMAILS.support
        : TASKDRIP_EMAILS.info;
      const typeLabel = { general: "General enquiry", support: "Support request", partnership: "Partnership enquiry", bug: "Bug report" }[type as string] || "Contact enquiry";
      sendAdminActivityEmail({
        event: "contact",
        subject: `[${typeLabel}] ${String(subject).trim().slice(0, 180)}`,
        recipient,
        fromEmail: recipient,
        customer: { name: String(name).trim(), email: String(email).trim() },
        details: [
          { label: "Enquiry type", value: typeLabel },
          { label: "Subject", value: String(subject).trim() },
          { label: "Message", value: String(message).trim() },
        ],
      }).catch(() => {});
      res.status(201).json({ message: "Thanks for reaching out. We'll get back to you within 24 hours." });
    } catch (error) {
      console.error("Error submitting contact form:", error);
      res.status(500).json({ message: "Failed to submit your message." });
    }
  });

  app.post('/api/subscribe', async (req: any, res) => {
    try {
      const { email, name, source } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'A valid email address is required.' });
      }
      const existing = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.toLowerCase().trim())).limit(1);
      if (existing.length) {
        if (existing[0].status === 'unsubscribed') {
          await db.update(newsletterSubscribers).set({ status: 'active', subscribedAt: new Date() }).where(eq(newsletterSubscribers.email, email.toLowerCase().trim()));
          sendNewsletterWelcomeEmail(email, name).catch(() => {});
          sendAdminActivityEmail({
            event: "newsletter",
            subject: "Newsletter subscriber re-subscribed",
            recipient: TASKDRIP_EMAILS.info,
            fromEmail: TASKDRIP_EMAILS.info,
            customer: { name, email },
            details: [{ label: "Source", value: source || "footer" }, { label: "Status", value: "active" }],
          }).catch(() => {});
          return res.json({ message: 'Welcome back! You have been re-subscribed.' });
        }
        return res.json({ message: 'You are already subscribed. Thank you!' });
      }
      const ip = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
      await db.insert(newsletterSubscribers).values({ email: email.toLowerCase().trim(), name: name || null, source: source || 'footer', ipAddress: ip });
      sendNewsletterWelcomeEmail(email, name).catch(() => {});
      sendAdminActivityEmail({
        event: "newsletter",
        subject: "New newsletter subscriber",
        recipient: TASKDRIP_EMAILS.info,
        fromEmail: TASKDRIP_EMAILS.info,
        customer: { name, email },
        details: [{ label: "Source", value: source || "footer" }, { label: "Status", value: "active" }],
      }).catch(() => {});
      res.json({ message: 'You have been subscribed! Check your inbox for a welcome email.' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/admin/newsletter-subscribers', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/admin/newsletter-subscribers/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const { status } = req.body;
      if (!['active', 'unsubscribed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
      await db.update(newsletterSubscribers).set({ status }).where(eq(newsletterSubscribers.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Health Check (Railway / uptime monitors) ─────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Platform Settings (key/value store for admin-controlled flags) ────────
  app.get('/api/admin/platform-settings', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const keys = (req.query.keys as string || '').split(',').filter(Boolean);
      const result: Record<string, string | null> = {};
      for (const key of keys) {
        result[key] = await storage.getPlatformSetting(key);
      }
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/admin/platform-settings/:key', isAuthenticated, async (req: any, res) => {
    try {
      if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin only' });
      const key = decodeURIComponent(req.params.key);
      const { value } = req.body;
      if (value === undefined) return res.status(400).json({ message: 'value is required' });
      await storage.setPlatformSetting(key, String(value));
      res.json({ key, value: String(value) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Public endpoint for client to read specific platform flags
  app.get('/api/platform-settings', async (req: any, res) => {
    try {
      const keys = (req.query.keys as string || '').split(',').filter(Boolean);
      const publicKeys = ['show_platform_badge', 'platform_badge_text', 'maintenance_mode'];
      const result: Record<string, string | null> = {};
      for (const key of keys) {
        if (publicKeys.includes(key)) {
          result[key] = await storage.getPlatformSetting(key);
        }
      }
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // URL Shortener routes
  registerShortenerRoutes(app);
  registerKeywordAnalyticsRoutes(app);
  registerAutoBloggerRoutes(app);
  registerAdminDemoRoutes(app, isAuthenticated);
  registerSeoIntelligenceRoutes(app);
  startAutoBloggerAutopilot();

  // ── AI Marketing Robot — Social Leads ──────────────────────────────────────
  app.get('/api/social-leads', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (user?.userType !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin only' });
      }
      const { platform, urgency, status } = req.query as Record<string, string>;
      let query = `SELECT * FROM social_leads WHERE 1=1`;
      const params: any[] = [];
      let p = 1;
      if (platform && platform !== 'all') { query += ` AND platform = $${p++}`; params.push(platform); }
      if (urgency && urgency !== 'all') { query += ` AND urgency = $${p++}`; params.push(urgency); }
      if (status && status !== 'all') { query += ` AND status = $${p++}`; params.push(status); }
      query += ` ORDER BY relevance_score DESC, created_at DESC LIMIT 200`;
      const { pool } = await import('./db');
      const result = await pool.query(query, params);
      // camelCase transform
      const rows = result.rows.map((r: any) => ({
        id: r.id, platform: r.platform, sourceId: r.source_id,
        title: r.title, body: r.body, url: r.url, author: r.author,
        subreddit: r.subreddit, platformScore: r.platform_score,
        commentsCount: r.comments_count, relevanceScore: r.relevance_score,
        aiSummary: r.ai_summary, suggestedReply: r.suggested_reply,
        category: r.category, urgency: r.urgency, status: r.status,
        keywordsMatched: r.keywords_matched, postedAt: r.posted_at,
        createdAt: r.created_at, updatedAt: r.updated_at,
      }));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/social-leads/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (user?.userType !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin only' });
      }
      const { pool } = await import('./db');
      const [total, newToday, highPriority, byPlatform] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM social_leads`),
        pool.query(`SELECT COUNT(*)::int AS n FROM social_leads WHERE created_at >= NOW() - INTERVAL '24 hours'`),
        pool.query(`SELECT COUNT(*)::int AS n FROM social_leads WHERE urgency = 'high' AND status != 'dismissed'`),
        pool.query(`SELECT platform, COUNT(*)::int AS n FROM social_leads GROUP BY platform`),
      ]);
      const platforms: Record<string, number> = {};
      byPlatform.rows.forEach((r: any) => { platforms[r.platform] = r.n; });
      res.json({
        total: total.rows[0].n,
        newToday: newToday.rows[0].n,
        highPriority: highPriority.rows[0].n,
        platforms: { reddit: platforms.reddit ?? 0, hackernews: platforms.hackernews ?? 0 },
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/social-leads/crawl', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (user?.userType !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin only' });
      }
      // Run async — don't wait for it to finish (can take 30-90s)
      import('./social-crawler').then(({ runSocialCrawler }) => {
        runSocialCrawler().catch(console.error);
      });
      res.json({ message: 'Crawl started — check back in a minute for new leads.' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/social-leads/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      if (user?.userType !== 'admin' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin only' });
      }
      const { id } = req.params;
      const { status } = req.body;
      const validStatuses = ['new', 'viewed', 'replied', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      const { pool } = await import('./db');
      await pool.query(
        `UPDATE social_leads SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, id]
      );
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Influencer CRM — AI-powered robot + outreach dashboard
  // ─────────────────────────────────────────────────────────────────────────
  {
    const {
      crawlInfluencersAI,
      getInfluencerTierStats,
      sendInfluencerOutreach,
      bulkInfluencerOutreach,
      TIERS,
      classifyTier,
    } = await import("./influencer-crm-service");

    // Tier stats
    app.get('/api/admin/influencer-crm/tier-stats', isAuthenticated, requireAdmin, async (_req, res) => {
      try {
        const stats = await getInfluencerTierStats();
        res.json(stats);
      } catch (e: any) { res.status(500).json({ message: e.message }); }
    });

    // Tier definitions (for UI)
    app.get('/api/admin/influencer-crm/tiers', isAuthenticated, requireAdmin, (_req, res) => {
      res.json(TIERS);
    });

    // List influencers with tier filter
    app.get('/api/admin/influencer-crm', isAuthenticated, requireAdmin, async (req: any, res) => {
      try {
        const { tier, niche, country, status, search, limit = "200", offset = "0" } = req.query;
        const conds: any[] = [eq(leads.kind, "influencer")];
        if (niche) conds.push(sql`lower(${leads.niche}) LIKE ${"%" + String(niche).toLowerCase() + "%"}`);
        if (country) conds.push(eq(leads.country, String(country)));
        if (status) conds.push(eq(leads.status, String(status)));
        if (search) {
          const s = `%${String(search).toLowerCase()}%`;
          conds.push(sql`(lower(${leads.name}) LIKE ${s} OR lower(${leads.niche}) LIKE ${s} OR lower(${leads.email}) LIKE ${s})`);
        }

        // Tier filter via follower count ranges
        if (tier && tier !== "all") {
          const tierDef = TIERS.find((t: any) => t.id === String(tier));
          if (tierDef && tierDef.id !== "unknown") {
            if (tierDef.max === Infinity) {
              conds.push(sql`${leads.followers} >= ${tierDef.min}`);
            } else {
              conds.push(sql`${leads.followers} >= ${tierDef.min} AND ${leads.followers} <= ${tierDef.max}`);
            }
          } else if (tierDef?.id === "unknown") {
            conds.push(sql`${leads.followers} IS NULL OR ${leads.followers} = 0`);
          }
        }

        const rows = await db.select().from(leads)
          .where(and(...conds) as any)
          .orderBy(desc(leads.followers))
          .limit(Math.min(500, parseInt(String(limit), 10) || 200))
          .offset(parseInt(String(offset), 10) || 0);

        const totalRow = await db.select({ c: count() }).from(leads).where(and(...conds) as any);

        // Add computed tier to each row
        const items = rows.map((r: any) => ({ ...r, computedTier: classifyTier(r.followers) }));
        res.json({ items, total: Number(totalRow[0]?.c || 0) });
      } catch (e: any) { res.status(500).json({ message: e.message }); }
    });

    // AI Robot Crawl
    app.post('/api/admin/influencer-crm/crawl', isAuthenticated, requireAdmin, async (req: any, res) => {
      try {
        const { niche, platforms, targetTiers, country, maxPerQuery, includeInternal } = req.body || {};
        if (!niche) return res.status(400).json({ message: "niche required" });
        const supportedPlatforms = ['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin'];
        const selectedPlatforms = Array.isArray(platforms)
          ? platforms.filter((platform: unknown): platform is string => typeof platform === "string" && supportedPlatforms.includes(platform))
          : ["youtube"];
        if (!selectedPlatforms.length) return res.status(400).json({ message: "Select at least one social platform" });
        const result = await crawlInfluencersAI({
          niche,
          platforms: selectedPlatforms,
          targetTiers: Array.isArray(targetTiers) ? targetTiers : undefined,
          country,
          maxPerQuery: parseInt(String(maxPerQuery || "15"), 10) || 15,
          includeInternal: !!includeInternal,
        });
        res.json(result);
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });

    // Manual add influencer
    app.post('/api/admin/influencer-crm/manual', isAuthenticated, requireAdmin, async (req, res) => {
      try {
        const body = req.body || {};
        if (!body.name) return res.status(400).json({ message: "name required" });
        const [row] = await db.insert(leads).values({ ...body, kind: "influencer", source: body.source || "manual" }).returning();
        res.json(row);
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });

    // Update influencer
    app.patch('/api/admin/influencer-crm/:id', isAuthenticated, requireAdmin, async (req, res) => {
      try {
        const allowed: any = {};
        const fields = ["name","niche","country","city","email","website","phone","whatsapp","socialLinks","followers","description","tags","status","aiSummary","aiReport"];
        for (const f of fields) if (f in req.body) allowed[f] = (req.body as any)[f];
        allowed.updatedAt = new Date();
        const [updated] = await db.update(leads).set(allowed).where(and(eq(leads.id, req.params.id), eq(leads.kind, "influencer")) as any).returning();
        res.json(updated);
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });

    // Delete influencer
    app.delete('/api/admin/influencer-crm/:id', isAuthenticated, requireAdmin, async (req, res) => {
      try {
        await db.delete(leadMessages).where(eq(leadMessages.leadId, req.params.id));
        await db.delete(leads).where(eq(leads.id, req.params.id));
        res.json({ ok: true });
      } catch (e: any) { res.status(500).json({ message: e.message }); }
    });

    // Single outreach
    app.post('/api/admin/influencer-crm/:id/outreach', isAuthenticated, requireAdmin, async (req: any, res) => {
      try {
        const { subject, body, channel } = req.body || {};
        if (!body) return res.status(400).json({ message: "body required" });
        const [lead] = await db.select().from(leads).where(and(eq(leads.id, req.params.id), eq(leads.kind, "influencer")) as any).limit(1);
        if (!lead) return res.status(404).json({ message: "Influencer not found" });

        if (channel === "email" || !channel) {
          const result = await sendInfluencerOutreach({ lead, subject: subject || "You're invited to Taskdrip", body, sentBy: req.user?.id });
          return res.json(result);
        }

        // Other channels (whatsapp/note/sms) — log only
        const [msg] = await db.insert(leadMessages).values({
          leadId: lead.id, channel: channel || "note", direction: "outbound", body,
          status: "logged", provider: "manual", sentBy: req.user?.id || null,
        }).returning();
        await db.update(leads).set({ status: "contacted", lastContactedAt: new Date() }).where(eq(leads.id, lead.id));
        res.json({ success: true, channel, message: msg });
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });

    // Get messages for an influencer
    app.get('/api/admin/influencer-crm/:id/messages', isAuthenticated, requireAdmin, async (req, res) => {
      try {
        const msgs = await db.select().from(leadMessages).where(eq(leadMessages.leadId, req.params.id)).orderBy(desc(leadMessages.createdAt));
        res.json(msgs);
      } catch (e: any) { res.status(500).json({ message: e.message }); }
    });

    // Add an internal CRM note to an influencer's conversation timeline
    app.post('/api/admin/influencer-crm/:id/messages', isAuthenticated, requireAdmin, async (req: any, res) => {
      try {
        const body = String(req.body?.body || '').trim();
        if (!body) return res.status(400).json({ message: "Note body required" });

        const [lead] = await db.select({ id: leads.id }).from(leads)
          .where(and(eq(leads.id, req.params.id), eq(leads.kind, "influencer")) as any)
          .limit(1);
        if (!lead) return res.status(404).json({ message: "Influencer not found" });

        const [message] = await db.insert(leadMessages).values({
          leadId: lead.id,
          channel: "note",
          direction: "outbound",
          body,
          status: "logged",
          provider: "manual",
          sentBy: req.user?.id || null,
        }).returning();

        res.status(201).json(message);
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });

    // Bulk outreach
    app.post('/api/admin/influencer-crm/bulk-outreach', isAuthenticated, requireAdmin, async (req: any, res) => {
      try {
        const { leadIds, subject, body, tier, niche } = req.body || {};
        if (!body) return res.status(400).json({ message: "body required" });
        let ids: string[] = Array.isArray(leadIds) ? leadIds : [];
        if (!ids.length) {
          const conds: any[] = [eq(leads.kind, "influencer")];
          if (niche) conds.push(sql`lower(${leads.niche}) LIKE ${"%" + String(niche).toLowerCase() + "%"}`);
          if (tier && tier !== "all") {
            const tierDef = TIERS.find((t: any) => t.id === String(tier));
            if (tierDef && tierDef.id !== "unknown" && tierDef.max !== Infinity) {
              conds.push(sql`${leads.followers} >= ${tierDef.min} AND ${leads.followers} <= ${(tierDef as any).max}`);
            } else if (tierDef && tierDef.max === Infinity) {
              conds.push(sql`${leads.followers} >= ${tierDef.min}`);
            }
          }
          const rows = await db.select({ id: leads.id }).from(leads).where(and(...conds) as any).limit(500);
          ids = rows.map(r => r.id);
        }
        if (!ids.length) return res.status(400).json({ message: "No matching influencers" });
        const result = await bulkInfluencerOutreach({ leadIds: ids, subject: subject || "Invitation to Taskdrip", body, sentBy: req.user?.id });
        res.json(result);
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });
  }

  const httpServer = existingServer ?? createServer(app);
  return httpServer;
}
