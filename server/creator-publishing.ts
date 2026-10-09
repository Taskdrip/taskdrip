import type { Express } from "express";
import { and, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import multer from "multer";
import OpenAI from "openai";
import { nanoid } from "nanoid";
import {
  appSettings,
  creatorBooks,
  creatorProductDownloads,
  creatorProductEarnings,
  creatorPublishingProducts,
  creatorStudioSubscriptions,
  notifications,
  purchases,
  shopProducts,
  users,
} from "@shared/schema";
import { db } from "./db";
import { isAuthenticated } from "./auth";
import { storage } from "./storage";
import {
  generateCompleteBook,
  isBookDesignAIAvailable,
} from "./ebook-design-generator";
import {
  DEFAULT_EBOOK_THEME,
  type EbookArtMotif,
  type EbookDesignBlock,
  type EbookDesignDocument,
  type EbookDesignPage,
} from "@shared/ebook-design";
import { createChildrenBibleColoringBook } from "./children-bible-coloring-book";

const PRIVATE_PRODUCT_DIR = path.resolve(process.cwd(), ".private-product-files");
mkdirSync(PRIVATE_PRODUCT_DIR, { recursive: true });
const PRIVATE_STUDIO_PAYMENT_DIR = path.resolve(process.cwd(), ".private-studio-payment-proofs");
mkdirSync(PRIVATE_STUDIO_PAYMENT_DIR, { recursive: true });

const GROQ_API_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
const BOOK_AI_BASE_URL = process.env.BOOK_AI_BASE_URL?.trim().replace(/\/+$/, "");
const DEFAULT_STUDIO_TOOL_PROMPTS = {
  "complete-book": "",
  outline: "",
  chapter: "",
  metadata: "",
  "writing-assistant": "",
  "title-ideas": "",
  blurb: "",
  proofread: "",
  expand: "",
  keywords: "",
};
const DEFAULT_STUDIO_TOOL_SETTINGS = {
  "complete-book": { temperature: 0.55, maxTokens: 3600 },
  outline: { temperature: 0.6, maxTokens: 2400 },
  chapter: { temperature: 0.7, maxTokens: 2400 },
  metadata: { temperature: 0.65, maxTokens: 2400 },
  "writing-assistant": { temperature: 0.7, maxTokens: 2400 },
  "title-ideas": { temperature: 0.7, maxTokens: 1400 },
  blurb: { temperature: 0.65, maxTokens: 1800 },
  proofread: { temperature: 0.2, maxTokens: 4000 },
  expand: { temperature: 0.65, maxTokens: 4000 },
  keywords: { temperature: 0.5, maxTokens: 1200 },
};
type CreatorStudioToolName = keyof typeof DEFAULT_STUDIO_TOOL_PROMPTS;
type CreatorStudioToolSettings = Record<CreatorStudioToolName, { temperature: number; maxTokens: number }>;
type CreatorStudioAIControls = {
  defaultChapterCount: 4 | 6 | 8 | 10 | 12 | 16 | 20;
  childAgeBand: string;
  includeParentNotes: boolean;
  illustrationStyle: string;
  generationPrompt: string;
  resourceNotes: string;
  toolPrompts: Record<keyof typeof DEFAULT_STUDIO_TOOL_PROMPTS, string>;
  toolSettings: CreatorStudioToolSettings;
};
type CreatorStudioAIProvider = "groq" | "openai-compatible" | "ollama";
const DEFAULT_CREATOR_STUDIO_AI_CONTROLS: CreatorStudioAIControls = {
  defaultChapterCount: 6,
  childAgeBand: "6–8",
  includeParentNotes: true,
  illustrationStyle: "Original, print-friendly vector illustrations; black-line artwork on coloring pages.",
  generationPrompt: "Keep all writing original, accurate to cited source material, clear for the chosen reader, and ready for human review before publication.",
  resourceNotes: "",
  toolPrompts: DEFAULT_STUDIO_TOOL_PROMPTS,
  toolSettings: DEFAULT_STUDIO_TOOL_SETTINGS,
};

function normalizeCreatorStudioAIControls(input: any): CreatorStudioAIControls {
  const chapterCount = Number(input?.defaultChapterCount);
  const allowedChapters = [4, 6, 8, 10, 12, 16, 20] as const;
  const clean = (value: unknown, fallback: string, limit: number) => String(value ?? fallback).trim().slice(0, limit);
  const inputPrompts = input?.toolPrompts && typeof input.toolPrompts === "object" ? input.toolPrompts : {};
  const inputToolSettings = input?.toolSettings && typeof input.toolSettings === "object" ? input.toolSettings : {};
  const normalizeToolSettings = (key: CreatorStudioToolName) => {
    const raw = inputToolSettings[key] && typeof inputToolSettings[key] === "object" ? inputToolSettings[key] : {};
    const defaults = DEFAULT_STUDIO_TOOL_SETTINGS[key];
    const temperature = Number(raw.temperature);
    const maxTokens = Number(raw.maxTokens);
    return {
      temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : defaults.temperature,
      maxTokens: Number.isFinite(maxTokens) ? Math.min(8000, Math.max(512, Math.round(maxTokens))) : defaults.maxTokens,
    };
  };
  return {
    defaultChapterCount: (allowedChapters.includes(chapterCount as any) ? chapterCount : DEFAULT_CREATOR_STUDIO_AI_CONTROLS.defaultChapterCount) as CreatorStudioAIControls["defaultChapterCount"],
    childAgeBand: ["3–5", "6–8", "9–12"].includes(String(input?.childAgeBand))
      ? String(input.childAgeBand) : DEFAULT_CREATOR_STUDIO_AI_CONTROLS.childAgeBand,
    includeParentNotes: input?.includeParentNotes !== false,
    illustrationStyle: clean(input?.illustrationStyle, DEFAULT_CREATOR_STUDIO_AI_CONTROLS.illustrationStyle, 300),
    generationPrompt: clean(input?.generationPrompt, DEFAULT_CREATOR_STUDIO_AI_CONTROLS.generationPrompt, 2000),
    resourceNotes: clean(input?.resourceNotes, DEFAULT_CREATOR_STUDIO_AI_CONTROLS.resourceNotes, 5000),
    toolPrompts: {
      "complete-book": clean(inputPrompts["complete-book"], "", 2000),
      outline: clean(inputPrompts.outline, "", 2000),
      chapter: clean(inputPrompts.chapter, "", 2000),
      metadata: clean(inputPrompts.metadata, "", 2000),
      "writing-assistant": clean(inputPrompts["writing-assistant"], "", 2000),
      "title-ideas": clean(inputPrompts["title-ideas"], "", 2000),
      blurb: clean(inputPrompts.blurb, "", 2000),
      proofread: clean(inputPrompts.proofread, "", 2000),
      expand: clean(inputPrompts.expand, "", 2000),
      keywords: clean(inputPrompts.keywords, "", 2000),
    },
    toolSettings: {
      "complete-book": normalizeToolSettings("complete-book"),
      outline: normalizeToolSettings("outline"),
      chapter: normalizeToolSettings("chapter"),
      metadata: normalizeToolSettings("metadata"),
      "writing-assistant": normalizeToolSettings("writing-assistant"),
      "title-ideas": normalizeToolSettings("title-ideas"),
      blurb: normalizeToolSettings("blurb"),
      proofread: normalizeToolSettings("proofread"),
      expand: normalizeToolSettings("expand"),
      keywords: normalizeToolSettings("keywords"),
    },
  };
}

export async function getCreatorStudioAIConfig() {
  const [row] = await db.select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, "creator_studio_ai_settings"))
    .limit(1);
  let saved: any = {};
  try { saved = JSON.parse(row?.value || "{}"); } catch { /* Ignore an invalid older settings row. */ }
  const provider: CreatorStudioAIProvider = ["groq", "openai-compatible", "ollama"].includes(saved.provider)
    ? saved.provider
    : (BOOK_AI_BASE_URL ? "openai-compatible" : "groq");
  const endpointUrl = String(saved.endpointUrl || BOOK_AI_BASE_URL || "").trim().replace(/\/+$/, "").slice(0, 500);
  const model = String(saved.model || process.env.BOOK_AI_MODEL || GROQ_TEXT_MODEL).trim().slice(0, 120);
  return {
    provider,
    endpointUrl,
    model,
    aiAvailable: provider === "groq"
      ? Boolean(process.env.GROQ_API_KEY)
      : provider === "ollama"
        ? Boolean(endpointUrl)
        : Boolean(endpointUrl && process.env.BOOK_AI_API_KEY),
    settings: normalizeCreatorStudioAIControls(saved.settings),
  };
}

export function createStudioAIClient(model = GROQ_TEXT_MODEL, provider: CreatorStudioAIProvider = BOOK_AI_BASE_URL ? "openai-compatible" : "groq", endpointUrl = "") {
  const baseURL = provider === "groq" ? GROQ_API_BASE_URL : (endpointUrl || BOOK_AI_BASE_URL);
  const apiKey = provider === "groq"
    ? process.env.GROQ_API_KEY
    : provider === "ollama"
      ? (process.env.BOOK_AI_API_KEY || "ollama")
      : process.env.BOOK_AI_API_KEY;
  return apiKey && baseURL ? { client: new OpenAI({ apiKey, baseURL }), model } : null;
}

function groqUnavailableResponse(action: string) {
  return {
    code: "AI_PROVIDER_NOT_CONFIGURED",
    message: `AI ${action} is unavailable. Configure the provider's endpoint and add its API key as a deployment variable; Ollama can use a reachable compatible endpoint without a key.`,
  };
}

const ALLOWED_FILE_EXTENSIONS = new Set([
  ".pdf", ".epub", ".zip", ".docx", ".xlsx", ".pptx", ".csv", ".txt", ".md",
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".mp4", ".mov",
]);
const privateProductUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRIVATE_PRODUCT_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `${nanoid()}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
      return cb(new Error("Unsupported file type. Upload a PDF, EPUB, ZIP, document, image, audio, or video file."));
    }
    cb(null, true);
  },
});
const studioPaymentProofUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRIVATE_STUDIO_PAYMENT_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `${nanoid()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(ext)) {
      return cb(new Error("Payment proof must be a PNG, JPG, WEBP, or PDF file."));
    }
    cb(null, true);
  },
});

const ADMIN_ROLES = new Set(["admin", "store_manager", "moderator", "content_editor"]);
const DOWNLOADABLE_PURCHASE_STATES = ["paid", "approved", "delivered"];
const BOOK_EXPORT_EXTENSIONS = new Set([".pdf", ".epub"]);

function isPublishingAdmin(user: any) {
  return user?.userType === "admin" || ADMIN_ROLES.has(user?.role);
}

function canPublish(user: any) {
  return Boolean(user?.id);
}

async function getCreatorStudioMonthlyPrice() {
  const [setting] = await db.select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, "creator_studio_monthly_price"))
    .limit(1);
  const price = Number(setting?.value);
  return Number.isFinite(price) && price >= 0 && price <= 999999
    ? Number(price.toFixed(2))
    : 7;
}

type CreatorStudioPaymentOptions = {
  cryptoWallets: Array<{
    id: string; name: string; asset: string; network: string; address: string; instructions: string; enabled: boolean;
  }>;
  bankAccounts: Array<{
    id: string; bankName: string; accountName: string; accountNumber: string; currency: string; instructions: string; enabled: boolean;
  }>;
};

const EMPTY_STUDIO_PAYMENT_OPTIONS: CreatorStudioPaymentOptions = { cryptoWallets: [], bankAccounts: [] };

async function getCreatorStudioPaymentOptions(): Promise<CreatorStudioPaymentOptions> {
  const [setting] = await db.select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, "creator_studio_payment_options"))
    .limit(1);
  try {
    const parsed = JSON.parse(setting?.value || "{}");
    return {
      cryptoWallets: Array.isArray(parsed.cryptoWallets) ? parsed.cryptoWallets : [],
      bankAccounts: Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts : [],
    };
  } catch {
    return EMPTY_STUDIO_PAYMENT_OPTIONS;
  }
}

function validateStudioPaymentOptions(input: any): CreatorStudioPaymentOptions {
  const clean = (value: any, max = 200) => String(value ?? "").trim().slice(0, max);
  return {
    cryptoWallets: (Array.isArray(input?.cryptoWallets) ? input.cryptoWallets : []).slice(0, 20).map((wallet: any, index: number) => ({
      id: clean(wallet.id, 80) || `wallet-${index + 1}`,
      name: clean(wallet.name, 100),
      asset: clean(wallet.asset, 20).toUpperCase(),
      network: clean(wallet.network, 80),
      address: clean(wallet.address, 240),
      instructions: clean(wallet.instructions, 1000),
      enabled: wallet.enabled !== false,
    })).filter((wallet: any) => wallet.name && wallet.asset && wallet.network && wallet.address),
    bankAccounts: (Array.isArray(input?.bankAccounts) ? input.bankAccounts : []).slice(0, 20).map((account: any, index: number) => ({
      id: clean(account.id, 80) || `bank-${index + 1}`,
      bankName: clean(account.bankName, 100),
      accountName: clean(account.accountName, 160),
      accountNumber: clean(account.accountNumber, 80),
      currency: clean(account.currency || "USD", 12).toUpperCase(),
      instructions: clean(account.instructions, 1000),
      enabled: account.enabled !== false,
    })).filter((account: any) => account.bankName && account.accountName && account.accountNumber),
  };
}

async function sendCreatorStudioExpiryReminders() {
  const now = new Date();
  const activeRows = await db.select().from(creatorStudioSubscriptions)
    .where(eq(creatorStudioSubscriptions.status, "active"));
  if (!activeRows.length) return;

  const emailService = await import("./email-service").catch(() => null);
  for (const subscription of activeRows) {
    if (!subscription.endDate) continue;
    const remainingMs = subscription.endDate.getTime() - now.getTime();
    const daysLeft = remainingMs / (24 * 60 * 60 * 1000);
    const reminderType = daysLeft <= 0 ? "creator_studio_expired" : daysLeft <= 3 ? "creator_studio_expiry_reminder" : null;
    if (!reminderType) continue;
    const reminderLink = `/creator-studio?renewal=${subscription.id}&expires=${subscription.endDate.getTime()}`;
    const [existing] = await db.select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.relatedId, subscription.id),
        eq(notifications.type, reminderType),
        eq(notifications.actionUrl, reminderLink),
      )).limit(1);
    if (existing) continue;

    const expired = daysLeft <= 0;
    const message = expired
      ? "Your Creator Studio access has expired. Submit a new monthly payment to restore access."
      : `Your Creator Studio access expires in ${Math.max(1, Math.ceil(daysLeft))} day${Math.ceil(daysLeft) === 1 ? "" : "s"}. Submit your renewal payment before it ends.`;
    await db.insert(notifications).values({
      userId: subscription.userId,
      type: reminderType,
      title: expired ? "Creator Studio access expired" : "Creator Studio renewal reminder",
      content: message,
      actionUrl: reminderLink,
      relatedId: subscription.id,
      isRead: false,
      priority: "high",
    }).catch((error) => console.warn("[creator-studio] Could not save expiry notification:", error));

    const [user] = await db.select({ email: users.email, firstName: users.firstName })
      .from(users).where(eq(users.id, subscription.userId)).limit(1);
    if (user?.email && emailService?.sendEmail) {
      await emailService.sendEmail({
        to: user.email,
        toName: user.firstName,
        subject: expired ? "Your Creator Studio access has expired" : "Your Creator Studio subscription is almost due",
        html: `<p>Hello ${String(user.firstName || "there").replace(/[<>&"]/g, "")},</p><p>${message}</p><p><a href="https://taskdrip.online/creator-studio">Open Creator Studio to renew</a></p>`,
      }).catch((error: any) => console.warn("[creator-studio] Renewal email failed:", error?.message || error));
    }

    if (expired) {
      await db.update(creatorStudioSubscriptions).set({ status: "expired", updatedAt: now })
        .where(and(
          eq(creatorStudioSubscriptions.id, subscription.id),
          eq(creatorStudioSubscriptions.status, "active"),
        ));
    }
  }
}

async function getCreatorStudioAccess(userId: string) {
  const now = new Date();
  const [active] = await db.select().from(creatorStudioSubscriptions)
    .where(and(
      eq(creatorStudioSubscriptions.userId, userId),
      eq(creatorStudioSubscriptions.status, "active"),
      gt(creatorStudioSubscriptions.endDate, now),
    ))
    .orderBy(desc(creatorStudioSubscriptions.endDate))
    .limit(1);
  const [pending] = await db.select().from(creatorStudioSubscriptions)
    .where(and(
      eq(creatorStudioSubscriptions.userId, userId),
      eq(creatorStudioSubscriptions.status, "pending"),
    ))
    .orderBy(desc(creatorStudioSubscriptions.createdAt))
    .limit(1);
  const monthlyPrice = await getCreatorStudioMonthlyPrice();
  return {
    hasAccess: monthlyPrice === 0 || !!active,
    monthlyPrice,
    currency: "USD",
    subscriptionStatus: monthlyPrice === 0 ? "active" : active ? "active" : pending ? "pending" : "inactive",
    subscription: active || pending || null,
  };
}

const requireCreatorStudioAccess = async (req: any, res: any, next: any) => {
  if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
  if (isPublishingAdmin(req.user)) {
    req.creatorStudioAccess = { hasAccess: true, subscriptionStatus: "active" };
    return next();
  }
  try {
    const access = await getCreatorStudioAccess(req.user.id);
    if (!access.hasAccess) {
      return res.status(402).json({
        code: "CREATOR_STUDIO_SUBSCRIPTION_REQUIRED",
        message: access.subscriptionStatus === "pending"
          ? "Your Creator Studio payment is awaiting admin verification."
          : "A Creator Studio monthly subscription is required.",
      });
    }
    req.creatorStudioAccess = access;
    next();
  } catch (error) {
    console.error("Could not check Creator Studio access:", error);
    res.status(500).json({ message: "Could not verify Creator Studio access." });
  }
};

function safeProduct(product: any) {
  if (!product) return product;
  const { fileKey, ...safe } = product;
  return safe;
}

function safeFileName(name: string) {
  return path.basename(name || "download").replace(/[\r\n"]/g, "_").slice(0, 240) || "download";
}

function parseList(value: any): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  } catch {
    // Plain comma-separated tags are also accepted.
  }
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

function normalizeDesignerDocument(value: any): EbookDesignDocument | null {
  if (!value || typeof value !== "object" || value.schemaVersion !== 1) return null;
  if (!Array.isArray(value.pages) || value.pages.length < 1 || value.pages.length > 250) return null;
  const color = (candidate: any, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(candidate || "")) ? String(candidate) : fallback;
  const pageKinds = new Set<EbookDesignPage["kind"]>(["cover", "title", "copyright", "contents", "chapter-opening", "chapter-body", "parent-guide", "coloring", "backmatter"]);
  const blockKinds = new Set(["text", "list", "art", "chapter", "contents"]);
  const bibleScenes = new Set(["storybook-cover", "creation", "noah", "moses", "david", "daniel", "jonah", "ruth", "esther", "nativity", "feeding", "samaritan", "resurrection", "abraham", "joseph", "samuel", "zacchaeus", "calming-storm", "welcoming-children", "lost-sheep", "bartimaeus"]);
  const pages: EbookDesignPage[] = [];

  for (const rawPage of value.pages) {
    if (!rawPage || !pageKinds.has(rawPage.kind) || !Array.isArray(rawPage.blocks) || rawPage.blocks.length > 50) return null;
    const blocks: EbookDesignBlock[] = [];
    for (const rawBlock of rawPage.blocks) {
      if (!rawBlock || !blockKinds.has(rawBlock.kind)) return null;
      const id = String(rawBlock.id || nanoid()).slice(0, 80);
      if (rawBlock.kind === "text") {
        const role = String(rawBlock.role || "");
        if (!["eyebrow", "title", "subtitle", "heading", "body", "quote", "caption"].includes(role)) return null;
        blocks.push({ id, kind: "text", role: role as Extract<EbookDesignBlock, { kind: "text" }>["role"], text: String(rawBlock.text || "").slice(0, 20000) });
      } else if (rawBlock.kind === "list") {
        if (!Array.isArray(rawBlock.items)) return null;
        blocks.push({ id, kind: "list", items: rawBlock.items.slice(0, 80).map((item: any) => String(item).slice(0, 1000)) });
      } else if (rawBlock.kind === "art") {
        const motif = String(rawBlock.motif || "");
        if (!["botanical", "geometry", "orbit", "waves", "bible-scene"].includes(motif)) return null;
        const scene = String(rawBlock.scene || "");
        if (motif === "bible-scene" && !bibleScenes.has(scene)) return null;
        blocks.push({
          id,
          kind: "art",
          motif: motif as EbookArtMotif,
          altText: String(rawBlock.altText || "Decorative illustration").slice(0, 180),
          brief: String(rawBlock.brief || "").slice(0, 600),
          ...(motif === "bible-scene" ? { scene, artMode: rawBlock.artMode === "color" ? "color" as const : "line" as const } : {}),
        });
      } else if (rawBlock.kind === "chapter") {
        blocks.push({ id, kind: "chapter", chapterId: String(rawBlock.chapterId || "").slice(0, 80) });
      } else {
        blocks.push({ id, kind: "contents" });
      }
    }
    pages.push({
      id: String(rawPage.id || nanoid()).slice(0, 80),
      kind: rawPage.kind,
      title: String(rawPage.title || "Untitled page").slice(0, 240),
      ...(rawPage.chapterId ? { chapterId: String(rawPage.chapterId).slice(0, 80) } : {}),
      blocks,
    });
  }

  const theme = value.theme || {};
  return {
    schemaVersion: 1,
    prompt: String(value.prompt || "").slice(0, 5000),
    theme: {
      name: String(theme.name || DEFAULT_EBOOK_THEME.name).slice(0, 60),
      primary: color(theme.primary, DEFAULT_EBOOK_THEME.primary),
      accent: color(theme.accent, DEFAULT_EBOOK_THEME.accent),
      paper: color(theme.paper, DEFAULT_EBOOK_THEME.paper),
      text: color(theme.text, DEFAULT_EBOOK_THEME.text),
      headingFont: theme.headingFont === "sans" ? "sans" : "serif",
      bodyFont: theme.bodyFont === "sans" ? "sans" : "serif",
    },
    pages,
  };
}

function validPublicImage(value: any): string | null {
  const image = String(value || "").trim();
  if (!image) return null;
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(image)) return image;
  try {
    const url = new URL(image);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function validAmazonUrl(value: any): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const allowed = [
      "amazon.com", "amazon.co.uk", "amazon.ca", "amazon.de", "amazon.fr", "amazon.it",
      "amazon.es", "amazon.in", "amazon.co.jp", "amazon.com.au", "amazon.com.br",
      "amazon.com.mx", "amazon.nl", "amazon.sg", "amazon.ae", "amzn.to",
    ];
    if (url.protocol !== "https:" || !allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function validAccessUrl(value: any): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function removeUpload(file?: Express.Multer.File) {
  if (!file) return;
  try { unlinkSync(file.path); } catch { /* Ignore cleanup failures. */ }
}

function validateDraft(body: any) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "").trim();
  const productType = String(body.productType || "digital-download").trim().toLowerCase();
  const price = Number(body.price);
  const coverImage = validPublicImage(body.coverImage);
  const amazonUrl = body.amazonUrl ? validAmazonUrl(body.amazonUrl) : null;

  if (title.length < 2 || title.length > 240) return { error: "Enter a product title between 2 and 240 characters." };
  if (!description || description.length > 20000) return { error: "Enter a description up to 20,000 characters." };
  if (!category || category.length > 100) return { error: "Enter a product category." };
  if (!Number.isFinite(price) || price < 0 || price > 99999999) return { error: "Enter a valid product price." };
  if (body.coverImage && !coverImage) return { error: "Cover images must use HTTPS or an uploaded Taskdrip image." };
  if (body.amazonUrl && !amazonUrl) return { error: "Enter a valid HTTPS Amazon product link." };

  return {
    value: {
      title,
      description,
      category,
      productType,
      price: price.toFixed(2),
      currency: "USD",
      coverImage,
      tags: parseList(body.tags),
      version: String(body.version || "1.0").slice(0, 40),
      license: String(body.license || "").slice(0, 10000) || null,
      amazonUrl,
    },
  };
}

async function getPublishingFeePercent() {
  const [setting] = await db.select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, "creator_publishing_fee_percent"))
    .limit(1);
  const value = Number(setting?.value);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 10;
}

export async function recordCreatorProductSale(purchaseId: string, referralAmount = 0) {
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
  if (!purchase || !DOWNLOADABLE_PURCHASE_STATES.includes(purchase.status)) return;

  const [listing] = await db.select().from(creatorPublishingProducts)
    .where(and(
      eq(creatorPublishingProducts.shopProductId, purchase.productId),
      eq(creatorPublishingProducts.status, "published"),
    ))
    .limit(1);
  if (!listing || listing.creatorId === purchase.userId) return;

  const gross = Number(purchase.totalAmount || purchase.amount);
  if (!Number.isFinite(gross) || gross <= 0) return;
  const feePercent = await getPublishingFeePercent();
  const platformFee = Math.min(gross, Number((gross * feePercent / 100).toFixed(2)));
  const processingFee = 0;
  const referralFee = Math.min(
    Math.max(0, gross - platformFee),
    Number.isFinite(referralAmount) ? Number(Math.max(0, referralAmount).toFixed(2)) : 0,
  );
  const net = Number((gross - platformFee - referralFee - processingFee).toFixed(2));

  await db.transaction(async (tx) => {
    const [created] = await tx.insert(creatorProductEarnings).values({
      purchaseId: purchase.id,
      productId: purchase.productId,
      creatorId: listing.creatorId,
      currency: "USD",
      grossAmount: gross.toFixed(2),
      platformFee: platformFee.toFixed(2),
      referralFee: referralFee.toFixed(2),
      processingFee: processingFee.toFixed(2),
      netAmount: net.toFixed(2),
      status: "available",
    }).onConflictDoNothing({ target: creatorProductEarnings.purchaseId }).returning();
    if (!created || net <= 0) return;

    await tx.update(users).set({
      availableBalance: sql`${users.availableBalance} + ${net}`,
      totalEarned: sql`${users.totalEarned} + ${net}`,
      updatedAt: new Date(),
    }).where(eq(users.id, listing.creatorId));
  });
}

export function registerCreatorPublishingRoutes(app: Express) {
  const reminderTimer = setInterval(() => {
    sendCreatorStudioExpiryReminders().catch((error) => {
      console.error("[creator-studio] Subscription reminder scan failed:", error);
    });
  }, 12 * 60 * 60 * 1000);
  reminderTimer.unref?.();
  sendCreatorStudioExpiryReminders().catch((error) => {
    console.error("[creator-studio] Initial subscription reminder scan failed:", error);
  });

  app.get("/api/creator-studio/plan", async (_req, res) => {
    try {
      res.json({ monthlyPrice: await getCreatorStudioMonthlyPrice(), currency: "USD", periodDays: 30 });
    } catch (error) {
      console.error("Could not load Creator Studio plan:", error);
      res.status(500).json({ message: "Could not load Creator Studio pricing." });
    }
  });

  app.get("/api/creator-studio/payment-options", async (_req, res) => {
    try {
      const options = await getCreatorStudioPaymentOptions();
      res.json({
        cryptoWallets: options.cryptoWallets.filter((item) => item.enabled),
        bankAccounts: options.bankAccounts.filter((item) => item.enabled),
      });
    } catch (error) {
      console.error("Could not load Creator Studio payment options:", error);
      res.status(500).json({ message: "Could not load Creator Studio payment options." });
    }
  });

  app.get("/api/creator-studio/access", isAuthenticated, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      if (isPublishingAdmin(req.user)) {
        return res.json({
          hasAccess: true,
          monthlyPrice: 0,
          currency: "USD",
          subscriptionStatus: "active",
          subscription: null,
        });
      }
      const access = await getCreatorStudioAccess(req.user.id);
      const subscription = access.subscription
        ? (({ paymentProofKey: _privateKey, ...safeSubscription }) => safeSubscription)(access.subscription)
        : null;
      res.json({ ...access, subscription });
    } catch (error) {
      console.error("Could not load Creator Studio access:", error);
      res.status(500).json({ message: "Could not load Creator Studio access." });
    }
  });

  app.get("/api/creator-studio/ai-config", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const config = await getCreatorStudioAIConfig();
      res.json({ aiAvailable: config.aiAvailable, model: config.model, defaultChapterCount: config.settings.defaultChapterCount });
    } catch (error) {
      console.error("Could not load Creator Studio model settings:", error);
      res.status(500).json({ message: "Could not load Creator Studio model settings." });
    }
  });

  app.post("/api/creator-studio/subscribe", isAuthenticated, studioPaymentProofUpload.single("paymentProof"), async (req: any, res) => {
    if (!canPublish(req.user)) {
      removeUpload(req.file);
      return res.status(403).json({ message: "Creator accounts only." });
    }
    const transactionHash = String(req.body.transactionHash || "").trim().slice(0, 255);
    if (!transactionHash && !req.file) {
      removeUpload(req.file);
      return res.status(400).json({ message: "Add a transaction reference or upload payment proof." });
    }
    try {
      const access = await getCreatorStudioAccess(req.user.id);
      if (access.hasAccess) {
        removeUpload(req.file);
        return res.status(409).json({ message: "You already have active Creator Studio access." });
      }
      if (access.subscriptionStatus === "pending") {
        removeUpload(req.file);
        return res.status(409).json({ message: "A Creator Studio payment is already awaiting verification." });
      }
      const [subscription] = await db.insert(creatorStudioSubscriptions).values({
        userId: req.user.id,
        status: "pending",
        amount: access.monthlyPrice.toFixed(2),
        currency: access.currency,
        network: String(req.body.network || "manual").trim().slice(0, 40),
        transactionHash: transactionHash || null,
        paymentProofKey: req.file ? path.basename(req.file.filename) : null,
        paymentMethodLabel: String(req.body.paymentMethodLabel || "").trim().slice(0, 160) || null,
        periodDays: 30,
      }).returning();

      await db.insert(notifications).values({
        userId: req.user.id,
        type: "creator_studio_subscription",
        title: "Creator Studio payment submitted",
        content: "Your monthly Creator Studio payment is awaiting verification. We’ll notify you when access is approved.",
        actionUrl: "/creator-studio",
        priority: "normal",
      }).catch(() => {});
      const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.userType, "admin")).limit(1);
      if (admin) {
        await db.insert(notifications).values({
          userId: admin.id,
          type: "creator_studio_subscription",
          title: "Creator Studio subscription payment to review",
          content: `${req.user.firstName || "A creator"} submitted a $${access.monthlyPrice.toFixed(2)} monthly Creator Studio payment.`,
          actionUrl: "/admin/publishing",
          priority: "high",
        }).catch(() => {});
      }
      const { paymentProofKey: _privateKey, ...safeSubscription } = subscription;
      res.status(201).json(safeSubscription);
    } catch (error) {
      if (req.file) {
        try { unlinkSync(req.file.path); } catch { /* Keep the original DB error. */ }
      }
      console.error("Could not submit Creator Studio payment:", error);
      res.status(500).json({ message: "Could not submit Creator Studio payment." });
    }
  });

  app.get("/api/admin/creator-studio/subscriptions", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      const requestedStatus = String(req.query.status || "").trim();
      const rows = requestedStatus
        ? await db.select().from(creatorStudioSubscriptions)
          .where(eq(creatorStudioSubscriptions.status, requestedStatus))
          .orderBy(desc(creatorStudioSubscriptions.createdAt)).limit(200)
        : await db.select().from(creatorStudioSubscriptions)
          .orderBy(desc(creatorStudioSubscriptions.createdAt)).limit(200);
      const enriched = await Promise.all(rows.map(async (row) => {
        const [user] = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          userType: users.userType,
        }).from(users).where(eq(users.id, row.userId)).limit(1);
        const { paymentProofKey, ...safeRow } = row;
        return {
          ...safeRow,
          user,
          proofUrl: paymentProofKey ? `/api/admin/creator-studio/subscriptions/${row.id}/proof` : null,
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Could not list Creator Studio subscriptions:", error);
      res.status(500).json({ message: "Could not load Creator Studio subscriptions." });
    }
  });

  app.get("/api/admin/creator-studio/subscriptions/:id/proof", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      const [subscription] = await db.select({
        paymentProofKey: creatorStudioSubscriptions.paymentProofKey,
      }).from(creatorStudioSubscriptions).where(eq(creatorStudioSubscriptions.id, req.params.id)).limit(1);
      if (!subscription?.paymentProofKey) return res.status(404).json({ message: "Payment proof not found." });
      const filePath = path.join(PRIVATE_STUDIO_PAYMENT_DIR, path.basename(subscription.paymentProofKey));
      if (!existsSync(filePath)) return res.status(404).json({ message: "Payment proof file is no longer available." });
      res.sendFile(filePath);
    } catch (error) {
      console.error("Could not load Creator Studio payment proof:", error);
      res.status(500).json({ message: "Could not load payment proof." });
    }
  });

  app.patch("/api/admin/creator-studio/subscriptions/:id", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    const action = String(req.body.action || "");
    const reviewNote = String(req.body.reviewNote || "").trim().slice(0, 4000);
    if (!["approve", "reject", "revoke", "extend"].includes(action)) {
      return res.status(400).json({ message: "Choose approve, reject, revoke, or extend." });
    }
    if (action === "reject" && !reviewNote) return res.status(400).json({ message: "Add a reason when rejecting a payment." });
    try {
      const [subscription] = await db.select().from(creatorStudioSubscriptions)
        .where(eq(creatorStudioSubscriptions.id, req.params.id)).limit(1);
      if (!subscription) return res.status(404).json({ message: "Creator Studio subscription not found." });
      if (action === "approve" && subscription.status !== "pending") {
        return res.status(409).json({ message: "Only pending payments can be approved." });
      }
      if (action === "reject" && subscription.status !== "pending") {
        return res.status(409).json({ message: "Only pending payments can be rejected." });
      }
      if ((action === "revoke" || action === "extend") && subscription.status !== "active") {
        return res.status(409).json({ message: "Only active subscriptions can be extended or revoked." });
      }
      const now = new Date();
      const extensionStart = subscription.endDate && subscription.endDate > now ? subscription.endDate : now;
      const endDate = new Date(extensionStart.getTime() + subscription.periodDays * 24 * 60 * 60 * 1000);
      const nextStatus = action === "approve" || action === "extend" ? "active" : action === "reject" ? "rejected" : "cancelled";
      const [updated] = await db.update(creatorStudioSubscriptions).set({
        status: nextStatus,
        startDate: action === "approve" ? now : subscription.startDate,
        endDate: action === "approve" || action === "extend" ? endDate : action === "revoke" ? now : subscription.endDate,
        reviewNote: reviewNote || null,
        reviewedBy: req.user.id,
        reviewedAt: now,
        updatedAt: now,
      }).where(eq(creatorStudioSubscriptions.id, subscription.id)).returning();

      const title = action === "approve"
        ? "Creator Studio access approved"
        : action === "extend" ? "Creator Studio access extended"
          : action === "reject" ? "Creator Studio payment needs attention" : "Creator Studio access ended";
      const content = action === "approve"
        ? `Your Creator Studio subscription is active until ${endDate.toLocaleDateString()}.`
        : action === "extend"
          ? `Your Creator Studio subscription has been extended until ${endDate.toLocaleDateString()}.`
          : action === "reject"
          ? `Your Creator Studio payment was not approved. ${reviewNote}`
          : "An admin ended your Creator Studio access.";
      await db.insert(notifications).values({
        userId: subscription.userId,
        type: "creator_studio_subscription",
        title,
        content,
        actionUrl: "/creator-studio",
        priority: "high",
      }).catch(() => {});
      const { paymentProofKey: _privateKey, ...safeSubscription } = updated;
      res.json(safeSubscription);
    } catch (error) {
      console.error("Could not update Creator Studio subscription:", error);
      res.status(500).json({ message: "Could not update Creator Studio subscription." });
    }
  });

  app.get("/api/admin/creator-studio/payment-options", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      res.json(await getCreatorStudioPaymentOptions());
    } catch (error) {
      console.error("Could not load Creator Studio payment options:", error);
      res.status(500).json({ message: "Could not load Creator Studio payment options." });
    }
  });

  app.put("/api/admin/creator-studio/payment-options", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      const options = validateStudioPaymentOptions(req.body);
      await db.insert(appSettings).values({
        key: "creator_studio_payment_options",
        value: JSON.stringify(options),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(options), updatedAt: new Date() },
      });
      res.json(options);
    } catch (error) {
      console.error("Could not save Creator Studio payment options:", error);
      res.status(500).json({ message: "Could not save Creator Studio payment options." });
    }
  });

  app.get("/api/admin/creator-studio/ai-settings", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      const config = await getCreatorStudioAIConfig();
      res.json(config);
    } catch (error) {
      console.error("Could not load Creator Studio AI settings:", error);
      res.status(500).json({ message: "Could not load AI publishing settings." });
    }
  });

  app.put("/api/admin/creator-studio/ai-settings", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    const model = String(req.body.model || "").trim().slice(0, 120);
    if (!model || !/^[\w./:-]+$/.test(model)) {
      return res.status(400).json({ message: "Enter a valid model name. Do not enter an API key here." });
    }
    const provider = String(req.body.provider || "") as CreatorStudioAIProvider;
    if (!["groq", "openai-compatible", "ollama"].includes(provider)) {
      return res.status(400).json({ message: "Choose Groq, an OpenAI-compatible provider, or Ollama." });
    }
    const endpointUrl = String(req.body.endpointUrl || "").trim().replace(/\/+$/, "").slice(0, 500);
    if (provider !== "groq") {
      let endpoint: URL;
      try { endpoint = new URL(endpointUrl); } catch {
        return res.status(400).json({ message: "Enter a valid provider endpoint URL." });
      }
      if (!["http:", "https:"].includes(endpoint.protocol)) {
        return res.status(400).json({ message: "Provider endpoints must use HTTP or HTTPS." });
      }
      if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
        return res.status(400).json({ message: "Keep credentials and query parameters out of endpoint URLs; configure credentials as deployment variables." });
      }
      const isLoopbackOllama = provider === "ollama"
        && ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
      if (endpoint.protocol === "http:" && !isLoopbackOllama) {
        return res.status(400).json({ message: "Use HTTPS for remote AI endpoints. Plain HTTP is allowed only for local Ollama." });
      }
    }
    try {
      const settings = normalizeCreatorStudioAIControls(req.body.settings);
      await db.insert(appSettings).values({
        key: "creator_studio_ai_settings",
        value: JSON.stringify({ provider, endpointUrl, model, settings }),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify({ provider, endpointUrl, model, settings }), updatedAt: new Date() },
      });
      const config = await getCreatorStudioAIConfig();
      res.json(config);
    } catch (error) {
      console.error("Could not save Creator Studio AI settings:", error);
      res.status(500).json({ message: "Could not save AI publishing settings." });
    }
  });

  app.post("/api/admin/creator-studio/books/children-bible-coloring", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      const [existing] = await db.select({
        id: creatorBooks.id,
        title: creatorBooks.title,
        designerDocument: creatorBooks.designerDocument,
        status: creatorBooks.status,
      }).from(creatorBooks).where(and(
        eq(creatorBooks.creatorId, req.user.id),
        eq(creatorBooks.title, "God’s Big Story: A Read-Aloud Bible Coloring Adventure"),
        eq(creatorBooks.genre, "Bible stories and coloring books"),
      )).limit(1);
      if (existing) {
        if (req.body?.replaceExisting !== true) {
          return res.status(409).json({
            message: "A God’s Big Story draft already exists. Confirm the upgrade to replace its manuscript and page designs.",
          });
        }
        if (existing.status === "published" || existing.status === "submitted") {
          return res.status(409).json({
            message: "This book is submitted or published and cannot be replaced from the draft generator.",
          });
        }
        const draft = createChildrenBibleColoringBook();
        const [book] = await db.update(creatorBooks).set({
          ...draft,
          updatedAt: new Date(),
        }).where(and(
          eq(creatorBooks.id, existing.id),
          eq(creatorBooks.creatorId, req.user.id),
        )).returning({ id: creatorBooks.id, title: creatorBooks.title });
        if (!book) return res.status(404).json({ message: "The existing book could not be found for upgrade." });
        return res.json({
          book,
          pageCount: Math.max(0, (draft.designerDocument?.pages?.length || 0) - 1),
          upgraded: true,
        });
      }

      const draft = createChildrenBibleColoringBook();
      const [book] = await db.insert(creatorBooks).values({
        creatorId: req.user.id,
        ...draft,
      }).returning({ id: creatorBooks.id, title: creatorBooks.title });
      res.status(201).json({
        book,
        pageCount: Math.max(0, (draft.designerDocument?.pages?.length || 0) - 1),
      });
    } catch (error) {
      console.error("Could not create the sample children’s Bible coloring book:", error);
      res.status(500).json({ message: "Could not create the coloring-book draft." });
    }
  });

  app.post("/api/admin/creator-studio/subscriptions/grant", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    const email = String(req.body.email || "").trim().toLowerCase();
    const periodDays = Number(req.body.periodDays ?? 30);
    if (!email || !Number.isInteger(periodDays) || periodDays < 1 || periodDays > 365) {
      return res.status(400).json({ message: "Enter a creator email and an access period from 1 to 365 days." });
    }
    try {
      const [user] = await db.select({ id: users.id, userType: users.userType })
        .from(users).where(eq(users.email, email)).limit(1);
      if (!user || user.userType !== "creator") return res.status(404).json({ message: "No creator account found for that email." });
      const access = await getCreatorStudioAccess(user.id);
      if (access.hasAccess) return res.status(409).json({ message: "This creator already has active access." });
      if (access.subscriptionStatus === "pending") return res.status(409).json({ message: "This creator already has a payment awaiting review." });

      const now = new Date();
      const endDate = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
      const [subscription] = await db.insert(creatorStudioSubscriptions).values({
        userId: user.id,
        status: "active",
        amount: "0.00",
        currency: "USD",
        network: "admin_grant",
        paymentMethodLabel: "Admin-granted access",
        periodDays,
        startDate: now,
        endDate,
        reviewedBy: req.user.id,
        reviewedAt: now,
      }).returning();
      await db.insert(notifications).values({
        userId: user.id,
        type: "creator_studio_subscription",
        title: "Creator Studio access granted",
        content: `Your Creator Studio access is active until ${endDate.toLocaleDateString()}.`,
        actionUrl: "/creator-studio",
        priority: "high",
      });
      res.status(201).json(subscription);
    } catch (error) {
      console.error("Could not grant Creator Studio access:", error);
      res.status(500).json({ message: "Could not grant Creator Studio access." });
    }
  });

  app.post("/api/admin/creator-studio/subscribers/:userId/reset-password", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    const password = String(req.body.password || "");
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({ message: "Use a temporary password between 12 and 128 characters." });
    }
    try {
      const [subscriber] = await db.select({ id: users.id, userType: users.userType })
        .from(users).where(eq(users.id, req.params.userId)).limit(1);
      if (!subscriber || subscriber.userType !== "creator") return res.status(404).json({ message: "Creator account not found." });
      await storage.resetUserPassword(subscriber.id, password);
      res.json({ success: true });
    } catch (error) {
      console.error("Could not reset Creator Studio subscriber password:", error);
      res.status(500).json({ message: "Could not reset the password." });
    }
  });

  app.get("/api/creator-studio/books", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const books = await db.select().from(creatorBooks)
        .where(eq(creatorBooks.creatorId, req.user.id))
        .orderBy(desc(creatorBooks.updatedAt));
      res.json(books);
    } catch (error) {
      console.error("Failed to load creator books:", error);
      res.status(500).json({ message: "Could not load your books." });
    }
  });

  app.post("/api/creator-studio/books", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const [book] = await db.insert(creatorBooks).values({
        creatorId: req.user.id,
        title: "Untitled book",
        bookType: "nonfiction",
        genre: "General nonfiction",
        trimSize: "6x9",
        kdpKeywords: [],
        status: "draft",
      }).returning();
      res.status(201).json(book);
    } catch (error) {
      console.error("Failed to create book:", error);
      res.status(500).json({ message: "Could not create a book draft." });
    }
  });

  app.patch("/api/creator-studio/books/:id", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const [book] = await db.select().from(creatorBooks)
        .where(and(eq(creatorBooks.id, req.params.id), eq(creatorBooks.creatorId, req.user.id)))
        .limit(1);
      if (!book) return res.status(404).json({ message: "Book not found." });
      if (book.status === "published" || book.status === "submitted") {
        return res.status(409).json({ message: "This book is under review or already published and cannot be edited here." });
      }

      const changes: any = { updatedAt: new Date(), status: "editing" };
      if (req.body.title !== undefined) changes.title = String(req.body.title).trim().slice(0, 240);
      if (req.body.subtitle !== undefined) changes.subtitle = String(req.body.subtitle).trim().slice(0, 300) || null;
      if (req.body.bookType !== undefined) {
        const bookType = String(req.body.bookType).trim().toLowerCase();
        if (!["nonfiction", "fiction", "workbook", "children", "poetry", "memoir"].includes(bookType)) {
          return res.status(400).json({ message: "Choose a supported book format." });
        }
        changes.bookType = bookType;
      }
      if (req.body.genre !== undefined) {
        const genre = String(req.body.genre).trim().slice(0, 100);
        if (!genre) return res.status(400).json({ message: "Choose or enter a book niche." });
        changes.genre = genre;
      }
      if (req.body.trimSize !== undefined) {
        const trimSize = String(req.body.trimSize).trim();
        if (!["6x9", "5.5x8.5", "5x8", "8.2677x11.6929", "8.5x11", "8x10", "8x8"].includes(trimSize)) {
          return res.status(400).json({ message: "Choose a supported KDP trim size." });
        }
        changes.trimSize = trimSize;
      }
      if (req.body.idea !== undefined) changes.idea = String(req.body.idea).slice(0, 12000);
      if (req.body.description !== undefined) changes.description = String(req.body.description).slice(0, 20000);
      if (req.body.outline !== undefined) changes.outline = parseList(req.body.outline);
      if (req.body.kdpKeywords !== undefined) changes.kdpKeywords = parseList(req.body.kdpKeywords);
      if (req.body.chapters !== undefined) {
        if (!Array.isArray(req.body.chapters) || req.body.chapters.length > 80) {
          return res.status(400).json({ message: "A book can contain up to 80 chapters." });
        }
        changes.chapters = req.body.chapters.slice(0, 80).map((chapter: any, index: number) => ({
          id: String(chapter.id || `chapter-${index + 1}`).slice(0, 80),
          title: String(chapter.title || `Chapter ${index + 1}`).slice(0, 240),
          content: String(chapter.content || "").slice(0, 100000),
        }));
      }
      if (req.body.designerDocument !== undefined) {
        if (req.body.designerDocument === null) {
          changes.designerDocument = null;
        } else {
          const document = normalizeDesignerDocument(req.body.designerDocument);
          if (!document) return res.status(400).json({ message: "The book design document is invalid." });
          changes.designerDocument = document;
        }
      }
      if (req.body.coverImage !== undefined) {
        const cover = validPublicImage(req.body.coverImage);
        if (req.body.coverImage && !cover) return res.status(400).json({ message: "Use an HTTPS cover image or upload one to Taskdrip." });
        changes.coverImage = cover;
      }
      if (req.body.amazonUrl !== undefined) {
        const amazon = req.body.amazonUrl ? validAmazonUrl(req.body.amazonUrl) : null;
        if (req.body.amazonUrl && !amazon) return res.status(400).json({ message: "Enter a valid HTTPS Amazon product link." });
        changes.amazonUrl = amazon;
      }
      if (req.body.accessUrl !== undefined) {
        const accessUrl = req.body.accessUrl ? validAccessUrl(req.body.accessUrl) : null;
        if (req.body.accessUrl && !accessUrl) return res.status(400).json({ message: "Enter a valid HTTPS reader or purchase link." });
        changes.accessUrl = accessUrl;
      }
      if (changes.title !== undefined && changes.title.length < 2) {
        return res.status(400).json({ message: "Book title must contain at least 2 characters." });
      }
      const [updated] = await db.update(creatorBooks).set(changes)
        .where(and(eq(creatorBooks.id, book.id), eq(creatorBooks.creatorId, req.user.id)))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Failed to save book:", error);
      res.status(500).json({ message: "Could not save your book." });
    }
  });

  app.get("/api/creator-studio/books/:id/generation", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const [book] = await db.select({
        id: creatorBooks.id,
        generationJobId: creatorBooks.generationJobId,
        generationStatus: creatorBooks.generationStatus,
        generationProgress: creatorBooks.generationProgress,
        generationMessage: creatorBooks.generationMessage,
        generationError: creatorBooks.generationError,
        updatedAt: creatorBooks.updatedAt,
      }).from(creatorBooks)
        .where(and(eq(creatorBooks.id, req.params.id), eq(creatorBooks.creatorId, req.user.id)))
        .limit(1);
      if (!book) return res.status(404).json({ message: "Book not found." });

      if (["queued", "generating"].includes(book.generationStatus) && book.updatedAt
        && Date.now() - new Date(book.updatedAt).getTime() > 30 * 60 * 1000) {
        const message = "This generation was interrupted. Your previous draft is unchanged; you can try again.";
        await db.update(creatorBooks).set({
          generationStatus: "failed",
          generationProgress: 0,
          generationMessage: null,
          generationError: message,
          updatedAt: new Date(),
        }).where(and(eq(creatorBooks.id, book.id), eq(creatorBooks.generationJobId, book.generationJobId || "")));
        return res.json({ ...book, generationStatus: "failed", generationProgress: 0, generationError: message });
      }
      res.json(book);
    } catch (error) {
      console.error("Could not check ebook generation status:", error);
      res.status(500).json({ message: "Could not check book generation status." });
    }
  });

  app.post("/api/creator-studio/books/:id/ai/full-book", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    const prompt = String(req.body.prompt || "").trim().slice(0, 8000);
    const config = await getCreatorStudioAIConfig();
    if (!isBookDesignAIAvailable(config)) return res.status(503).json(groqUnavailableResponse("complete-book generation"));
    const chapterCount = Number(req.body.chapterCount || config.settings.defaultChapterCount);
    if (prompt.length < 20) return res.status(400).json({ message: "Describe the reader, topic, and outcome in at least 20 characters." });
    if (![4, 6, 8, 10, 12, 16, 20].includes(chapterCount)) return res.status(400).json({ message: "Choose between 4 and 20 chapters." });

    try {
      const [book] = await db.select().from(creatorBooks)
        .where(and(eq(creatorBooks.id, req.params.id), eq(creatorBooks.creatorId, req.user.id)))
        .limit(1);
      if (!book) return res.status(404).json({ message: "Book not found." });
      if (["published", "submitted"].includes(book.status)) {
        return res.status(409).json({ message: "Books submitted for review or already published cannot be regenerated." });
      }
      if (["queued", "generating"].includes(book.generationStatus)) {
        return res.status(409).json({ message: "This book is already being generated." });
      }
      if ((book.chapters?.length || book.designerDocument?.pages?.length) && req.body.replaceExisting !== true) {
        return res.status(409).json({
          code: "BOOK_CONTENT_REPLACEMENT_CONFIRMATION_REQUIRED",
          message: "Generating again replaces this draft's manuscript and page design. Confirm before continuing.",
          requiresConfirmation: true,
        });
      }

      const jobId = nanoid();
      const startedAt = new Date();
      await db.update(creatorBooks).set({
        generationJobId: jobId,
        generationStatus: "queued",
        generationProgress: 1,
        generationMessage: "Preparing the book generator",
        generationError: null,
        updatedAt: startedAt,
      }).where(and(eq(creatorBooks.id, book.id), eq(creatorBooks.creatorId, req.user.id)));

      const authorName = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim().slice(0, 160);
      const onProgress = async (progress: number, message: string) => {
        await db.update(creatorBooks).set({
          generationStatus: "generating",
          generationProgress: Math.max(1, Math.min(99, Math.round(progress))),
          generationMessage: String(message).slice(0, 240),
          generationError: null,
          updatedAt: new Date(),
        }).where(and(eq(creatorBooks.id, book.id), eq(creatorBooks.generationJobId, jobId)));
      };

      void (async () => {
        try {
          const generated = await generateCompleteBook({
            prompt,
            title: book.title === "Untitled book" ? "" : book.title,
            bookType: book.bookType,
            genre: book.genre,
            trimSize: book.trimSize,
            authorName,
            chapterCount,
            aiModel: config.model,
            aiSettings: {
              ...config.settings,
              provider: config.provider,
              endpointUrl: config.endpointUrl,
            },
            onProgress,
          });
          await db.update(creatorBooks).set({
            title: generated.title,
            subtitle: generated.subtitle || null,
            idea: prompt,
            description: generated.description,
            outline: generated.outline,
            chapters: generated.chapters,
            designerDocument: generated.designerDocument,
            status: "editing",
            generationStatus: "completed",
            generationProgress: 100,
            generationMessage: "Complete draft and page designs are ready to edit.",
            generationError: null,
            updatedAt: new Date(),
          }).where(and(eq(creatorBooks.id, book.id), eq(creatorBooks.creatorId, req.user.id), eq(creatorBooks.generationJobId, jobId)));
        } catch (error: any) {
          const message = String(error?.message || "Book generation failed. Please try again.").slice(0, 500);
          console.error("[ebook-studio] Full book generation failed:", message);
          await db.update(creatorBooks).set({
            generationStatus: "failed",
            generationProgress: 0,
            generationMessage: null,
            generationError: message,
            updatedAt: new Date(),
          }).where(and(eq(creatorBooks.id, book.id), eq(creatorBooks.generationJobId, jobId)));
        }
      })();

      res.status(202).json({
        jobId,
        status: "queued",
        message: "Book generation started. Your draft will remain available while the model writes.",
      });
    } catch (error) {
      console.error("Could not start ebook generation:", error);
      res.status(500).json({ message: "Could not start book generation." });
    }
  });

  app.post("/api/creator-studio/books/:id/submit", isAuthenticated, requireCreatorStudioAccess, privateProductUpload.single("productFile"), async (req: any, res) => {
    if (!canPublish(req.user)) {
      removeUpload(req.file);
      return res.status(403).json({ message: "Creator accounts only." });
    }
    const ext = path.extname(req.file?.originalname || "").toLowerCase();
    if (req.file && !BOOK_EXPORT_EXTENSIONS.has(ext)) {
      removeUpload(req.file);
      return res.status(400).json({ message: "Upload the finished PDF or EPUB file for sale." });
    }
    try {
      const [book] = await db.select().from(creatorBooks)
        .where(and(eq(creatorBooks.id, req.params.id), eq(creatorBooks.creatorId, req.user.id)))
        .limit(1);
      if (!book) {
        removeUpload(req.file);
        return res.status(404).json({ message: "Book not found." });
      }
      if (book.status === "published" || book.status === "submitted") {
        removeUpload(req.file);
        return res.status(409).json({ message: "This book has already been submitted or published." });
      }
      const chapters = Array.isArray(book.chapters) ? book.chapters : [];
      if (book.title.trim().length < 2 || chapters.length === 0 || !chapters.some((chapter) => chapter.content?.trim())) {
        removeUpload(req.file);
        return res.status(400).json({ message: "Add a title and at least one chapter with content before submitting." });
      }
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0 || price > 99999999) {
        removeUpload(req.file);
        return res.status(400).json({ message: "Enter a valid USD price." });
      }
      const coverImage = validPublicImage(book.coverImage);
      const amazonUrl = book.amazonUrl ? validAmazonUrl(book.amazonUrl) : null;
      const accessUrl = book.accessUrl ? validAccessUrl(book.accessUrl) : null;
      if (book.amazonUrl && !amazonUrl) {
        removeUpload(req.file);
        return res.status(400).json({ message: "The Amazon link is not valid." });
      }
      if (book.accessUrl && !accessUrl) {
        removeUpload(req.file);
        return res.status(400).json({ message: "The reader or purchase link is not valid." });
      }
      if (!req.file && !amazonUrl && !accessUrl) {
        return res.status(400).json({ message: "Upload a PDF or EPUB, or add an Amazon or reader link before submitting." });
      }

      const originalFileName = req.file ? safeFileName(req.file.originalname) : null;
      const submitted = await db.transaction(async (tx) => {
        const [product] = await tx.insert(creatorPublishingProducts).values({
          creatorId: req.user.id,
          bookId: book.id,
          title: book.title,
          description: book.description || book.idea || `A book by ${req.user.firstName || "a Taskdrip creator"}.`,
          productType: "ebook",
          category: "Books",
          price: price.toFixed(2),
          currency: "USD",
          coverImage,
          tags: ["ebook", "book"],
          amazonUrl,
          accessUrl,
          fileKey: req.file ? path.basename(req.file.filename) : null,
          originalFileName,
          mimeType: req.file?.mimetype || null,
          fileSize: req.file?.size || null,
          status: "pending_review",
          submittedAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        await tx.update(creatorBooks)
          .set({ status: "submitted", updatedAt: new Date() })
          .where(eq(creatorBooks.id, book.id))
          .returning();
        return product;
      });
      res.status(201).json({ ...safeProduct(submitted), bookStatus: "submitted" });
    } catch (error) {
      removeUpload(req.file);
      console.error("Failed to submit book:", error);
      res.status(500).json({ message: "Could not submit the book for review." });
    }
  });

  app.get("/api/creator-studio/products", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const products = await db.select().from(creatorPublishingProducts)
        .where(eq(creatorPublishingProducts.creatorId, req.user.id))
        .orderBy(desc(creatorPublishingProducts.updatedAt));
      res.json(products.map(safeProduct));
    } catch (error) {
      console.error("Failed to load creator products:", error);
      res.status(500).json({ message: "Could not load your digital products." });
    }
  });

  app.post("/api/creator-studio/products", isAuthenticated, requireCreatorStudioAccess, privateProductUpload.single("productFile"), async (req: any, res) => {
    if (!canPublish(req.user)) {
      removeUpload(req.file);
      return res.status(403).json({ message: "Creator accounts only." });
    }
    const validation = validateDraft(req.body);
    if ("error" in validation) {
      removeUpload(req.file);
      return res.status(400).json({ message: validation.error });
    }
    try {
      const [product] = await db.insert(creatorPublishingProducts).values({
        creatorId: req.user.id,
        ...validation.value,
        fileKey: req.file ? path.basename(req.file.filename) : null,
        originalFileName: req.file ? safeFileName(req.file.originalname) : null,
        mimeType: req.file?.mimetype || null,
        fileSize: req.file?.size || null,
        status: "draft",
      }).returning();
      res.status(201).json(safeProduct(product));
    } catch (error) {
      removeUpload(req.file);
      console.error("Failed to create digital product:", error);
      res.status(500).json({ message: "Could not save your digital product." });
    }
  });

  app.patch("/api/creator-studio/products/:id", isAuthenticated, requireCreatorStudioAccess, privateProductUpload.single("productFile"), async (req: any, res) => {
    if (!canPublish(req.user)) {
      removeUpload(req.file);
      return res.status(403).json({ message: "Creator accounts only." });
    }
    const validation = validateDraft(req.body);
    if ("error" in validation) {
      removeUpload(req.file);
      return res.status(400).json({ message: validation.error });
    }
    try {
      const [existing] = await db.select().from(creatorPublishingProducts)
        .where(and(
          eq(creatorPublishingProducts.id, req.params.id),
          eq(creatorPublishingProducts.creatorId, req.user.id),
        )).limit(1);
      if (!existing) {
        removeUpload(req.file);
        return res.status(404).json({ message: "Digital product not found." });
      }
      if (!["draft", "rejected"].includes(existing.status)) {
        removeUpload(req.file);
        return res.status(409).json({ message: "Only drafts and rejected products can be edited." });
      }
      const [updated] = await db.update(creatorPublishingProducts).set({
        ...validation.value,
        fileKey: req.file ? path.basename(req.file.filename) : existing.fileKey,
        originalFileName: req.file ? safeFileName(req.file.originalname) : existing.originalFileName,
        mimeType: req.file?.mimetype || existing.mimeType,
        fileSize: req.file?.size || existing.fileSize,
        status: "draft",
        reviewNote: null,
        updatedAt: new Date(),
      }).where(eq(creatorPublishingProducts.id, existing.id)).returning();
      if (req.file && existing.fileKey && existing.fileKey !== updated.fileKey) {
        removeUpload({ path: path.join(PRIVATE_PRODUCT_DIR, path.basename(existing.fileKey)) } as Express.Multer.File);
      }
      res.json(safeProduct(updated));
    } catch (error) {
      removeUpload(req.file);
      console.error("Failed to update digital product:", error);
      res.status(500).json({ message: "Could not save your digital product." });
    }
  });

  app.post("/api/creator-studio/products/:id/submit", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const [product] = await db.select().from(creatorPublishingProducts)
        .where(and(
          eq(creatorPublishingProducts.id, req.params.id),
          eq(creatorPublishingProducts.creatorId, req.user.id),
        )).limit(1);
      if (!product) return res.status(404).json({ message: "Digital product not found." });
      if (!["draft", "rejected"].includes(product.status)) {
        return res.status(409).json({ message: "This product is already submitted or published." });
      }
      if (!product.fileKey || !existsSync(path.join(PRIVATE_PRODUCT_DIR, path.basename(product.fileKey)))) {
        return res.status(400).json({ message: "Upload the product file before submitting it for review." });
      }
      const [updated] = await db.update(creatorPublishingProducts).set({
        status: "pending_review",
        reviewNote: null,
        submittedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(creatorPublishingProducts.id, product.id)).returning();
      res.json(safeProduct(updated));
    } catch (error) {
      console.error("Failed to submit digital product:", error);
      res.status(500).json({ message: "Could not submit the product for review." });
    }
  });

  app.delete("/api/creator-studio/products/:id", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const [product] = await db.select().from(creatorPublishingProducts)
        .where(and(
          eq(creatorPublishingProducts.id, req.params.id),
          eq(creatorPublishingProducts.creatorId, req.user.id),
        )).limit(1);
      if (!product) return res.status(404).json({ message: "Digital product not found." });
      if (!["draft", "rejected"].includes(product.status)) {
        return res.status(409).json({ message: "Only drafts and rejected products can be deleted." });
      }
      await db.delete(creatorPublishingProducts).where(eq(creatorPublishingProducts.id, product.id));
      if (product.fileKey) removeUpload({ path: path.join(PRIVATE_PRODUCT_DIR, path.basename(product.fileKey)) } as Express.Multer.File);
      res.json({ deleted: true });
    } catch (error) {
      console.error("Failed to delete digital product:", error);
      res.status(500).json({ message: "Could not delete the digital product." });
    }
  });

  app.post("/api/creator-studio/ai/outline", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    const config = await getCreatorStudioAIConfig();
    const ai = createStudioAIClient(config.model, config.provider, config.endpointUrl);
    if (!ai) return res.status(503).json(groqUnavailableResponse("outline generation"));
    const { client, model } = ai;
    const idea = String(req.body.idea || "").trim().slice(0, 6000);
    const bookType = String(req.body.bookType || "nonfiction").trim().slice(0, 40);
    const genre = String(req.body.genre || "General nonfiction").trim().slice(0, 100);
    if (idea.length < 8) return res.status(400).json({ message: "Describe the book idea in at least 8 characters." });
    try {
      const result = await client.chat.completions.create({
        model,
        temperature: config.settings.toolSettings.outline.temperature,
        max_tokens: config.settings.toolSettings.outline.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `Create an original, reader-focused book outline using clear progression, useful chapter outcomes, and a strong opening and conclusion. Never promise bestseller status or invent credentials, citations, research, or claims. Return JSON only: {"chapters":[{"title":"...","summary":"..."}]}. Return exactly ${config.settings.defaultChapterCount} chapters and respect the requested book type and niche.\n${config.settings.resourceNotes ? `Author-provided source and reference resources:\n${config.settings.resourceNotes}\n` : ""}${config.settings.toolPrompts.outline}` },
          { role: "user", content: `Book type: ${bookType}\nNiche: ${genre}\nBook concept: ${idea}` },
        ],
      });
      const content = result.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      const outline = Array.isArray(parsed.chapters)
        ? parsed.chapters.slice(0, 12).map((chapter: any) => `${String(chapter.title || "Chapter").slice(0, 180)}${chapter.summary ? ` — ${String(chapter.summary).slice(0, 300)}` : ""}`)
        : [];
      if (!outline.length) return res.status(502).json({ message: "The AI provider returned no chapter outline. Try again." });
      res.json({ outline });
    } catch (error) {
      console.error("Publishing outline generation failed:", error);
      res.status(502).json({ message: "AI outline generation failed. Try again later." });
    }
  });

  app.post("/api/creator-studio/ai/chapter", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    const config = await getCreatorStudioAIConfig();
    const ai = createStudioAIClient(config.model, config.provider, config.endpointUrl);
    if (!ai) return res.status(503).json(groqUnavailableResponse("chapter generation"));
    const { client, model } = ai;
    const bookId = String(req.body.bookId || "");
    const chapterTitle = String(req.body.chapterTitle || "").trim().slice(0, 240);
    const idea = String(req.body.idea || "").trim().slice(0, 4000);
    const [book] = await db.select({
      id: creatorBooks.id,
      bookType: creatorBooks.bookType,
      genre: creatorBooks.genre,
      idea: creatorBooks.idea,
    })
      .from(creatorBooks)
      .where(and(eq(creatorBooks.id, bookId), eq(creatorBooks.creatorId, req.user.id)))
      .limit(1);
    if (!book) return res.status(404).json({ message: "Book not found." });
    if (!chapterTitle) return res.status(400).json({ message: "Enter a chapter title." });
    try {
      const result = await client.chat.completions.create({
        model,
        temperature: config.settings.toolSettings.chapter.temperature,
        max_tokens: config.settings.toolSettings.chapter.maxTokens,
        messages: [
          { role: "system", content: `Draft an original, reader-focused book chapter for the creator to review and edit. Never promise bestseller status or invent credentials, citations, research, or quotations. Do not present legal, medical, financial, or safety advice as professional advice. Respect the stated book type and niche. Use clear headings and readable paragraphs.\n${config.settings.resourceNotes ? `Author-provided source and reference resources:\n${config.settings.resourceNotes}\n` : ""}${config.settings.toolPrompts.chapter}` },
          { role: "user", content: `Book type: ${book.bookType || "nonfiction"}\nNiche: ${book.genre || "General nonfiction"}\nBook idea: ${idea || book.idea || "Not provided"}\nChapter: ${chapterTitle}` },
        ],
      });
      const content = result.choices[0]?.message?.content?.trim();
      if (!content) return res.status(502).json({ message: "The AI provider returned an empty chapter. Try again." });
      res.json({ content });
    } catch (error) {
      console.error("Publishing chapter generation failed:", error);
      res.status(502).json({ message: "AI chapter generation failed. Try again later." });
    }
  });

  app.post("/api/creator-studio/ai/metadata", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    const config = await getCreatorStudioAIConfig();
    const ai = createStudioAIClient(config.model, config.provider, config.endpointUrl);
    if (!ai) return res.status(503).json(groqUnavailableResponse("book metadata generation"));
    const { client, model } = ai;
    const bookId = String(req.body.bookId || "");
    const [book] = await db.select().from(creatorBooks)
      .where(and(eq(creatorBooks.id, bookId), eq(creatorBooks.creatorId, req.user.id)))
      .limit(1);
    if (!book) return res.status(404).json({ message: "Book not found." });
    if (book.status === "published" || book.status === "submitted") {
      return res.status(409).json({ message: "Metadata for submitted books is locked." });
    }
    try {
      const result = await client.chat.completions.create({
        model,
        temperature: config.settings.toolSettings.metadata.temperature,
        max_tokens: config.settings.toolSettings.metadata.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Create clear, compelling Amazon KDP book metadata. Never promise bestseller status, fabricate credentials, reviews, citations, or research, or use misleading claims. Return JSON only: {"title":"...","subtitle":"...","description":"...","keywords":["..."],"categories":["..."]}. Use 7 distinct buyer-search keyword phrases. Keep the description reader-focused and under 3500 characters. Categories should be suggestions only.\n${config.settings.resourceNotes ? `Author-provided source and reference resources:\n${config.settings.resourceNotes}\n` : ""}${config.settings.toolPrompts.metadata}`,
          },
          {
            role: "user",
            content: `Book type: ${book.bookType}\nNiche: ${book.genre}\nTrim size: ${book.trimSize}\nConcept: ${book.idea || ""}\nCurrent title: ${book.title}\nCurrent subtitle: ${book.subtitle || ""}\nCurrent description: ${book.description || ""}`,
          },
        ],
      });
      const parsed = JSON.parse(result.choices[0]?.message?.content || "{}");
      res.json({
        title: String(parsed.title || "").slice(0, 240),
        subtitle: String(parsed.subtitle || "").slice(0, 300),
        description: String(parsed.description || "").slice(0, 3500),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 7).map((item: any) => String(item).slice(0, 100)) : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 5).map((item: any) => String(item).slice(0, 120)) : [],
      });
    } catch (error) {
      console.error("Publishing metadata generation failed:", error);
      res.status(502).json({ message: "AI metadata generation failed. Try again later." });
    }
  });

  app.post("/api/creator-studio/ai/tool", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    const config = await getCreatorStudioAIConfig();
    const ai = createStudioAIClient(config.model, config.provider, config.endpointUrl);
    if (!ai) return res.status(503).json(groqUnavailableResponse("writing tools"));
    const { client, model } = ai;
    const tool = String(req.body.tool || "");
    const bookId = String(req.body.bookId || "");
    const chapterId = String(req.body.chapterId || "");
    const [book] = await db.select().from(creatorBooks)
      .where(and(eq(creatorBooks.id, bookId), eq(creatorBooks.creatorId, req.user.id)))
      .limit(1);
    if (!book) return res.status(404).json({ message: "Book not found." });
    if (book.status === "published" || book.status === "submitted") {
      return res.status(409).json({ message: "Writing tools are disabled for submitted or published books." });
    }
    const chapter = (Array.isArray(book.chapters) ? book.chapters : []).find((item) => item.id === chapterId);
    if (["proofread", "expand"].includes(tool) && !chapter) {
      return res.status(404).json({ message: "Choose a saved chapter first." });
    }
    const input = String(req.body.input || "").trim().slice(0, 12000);
    if (!["title-ideas", "blurb", "proofread", "expand", "keywords"].includes(tool)) {
      return res.status(400).json({ message: "Choose a supported writing tool." });
    }
    if (["proofread", "expand"].includes(tool) && !(chapter?.content || "").trim()) {
      return res.status(400).json({ message: "Add chapter content before using this tool." });
    }
    try {
      const instructions: Record<string, string> = {
        "title-ideas": "Suggest 10 original, memorable book title and subtitle pairs for the concept. Include no false claims. Return numbered plain text.",
        blurb: "Write a compelling back-cover / Amazon description for this book. Include a strong hook, reader outcomes, and a clear audience fit. No fabricated credentials, reviews, research, or guaranteed results. Return polished plain text under 3000 characters.",
        proofread: "Proofread and improve grammar, clarity, flow, and consistency while preserving the author's meaning and voice. Do not add fabricated facts or sources. Return only the revised chapter text.",
        expand: "Expand the chapter into a detailed, useful draft that fits the book's outline and niche. Preserve the author's existing ideas, add clear headings and helpful examples, but do not invent research or make professional medical, legal, or financial claims. Return only the revised chapter text.",
        keywords: "Suggest 7 relevant Amazon KDP search keyword phrases, each short enough to fit a keyword field. Avoid misleading, trademark-stuffed, or bestseller-guarantee phrases. Return one phrase per line.",
      };
      const context = `Book title: ${book.title}\nBook type: ${book.bookType}\nNiche: ${book.genre}\nConcept: ${book.idea || ""}\nDescription: ${book.description || ""}`;
      const prompt = tool === "proofread" || tool === "expand"
        ? `${context}\nChapter title: ${chapter?.title}\nCurrent chapter text:\n${chapter?.content}`
        : `${context}\n${input ? `Creator's focus: ${input}` : ""}`;
      const toolSettings = config.settings.toolSettings[tool as CreatorStudioToolName];
      const result = await client.chat.completions.create({
        model,
        temperature: tool === "proofread" ? Math.min(0.6, toolSettings.temperature) : toolSettings.temperature,
        max_tokens: toolSettings.maxTokens,
        messages: [
          { role: "system", content: `${instructions[tool]} This is writing assistance; the creator reviews and edits all output before publication. Never promise bestseller rankings.\n${config.settings.resourceNotes ? `Author-provided source and reference resources:\n${config.settings.resourceNotes}\n` : ""}${config.settings.toolPrompts["writing-assistant"]}\n${config.settings.toolPrompts[tool as CreatorStudioToolName]}` },
          { role: "user", content: prompt },
        ],
      });
      const content = result.choices[0]?.message?.content?.trim();
      if (!content) return res.status(502).json({ message: "The AI provider returned an empty result. Try again." });
      res.json({ content });
    } catch (error) {
      console.error(`Publishing ${tool} tool failed:`, error);
      res.status(502).json({ message: "The AI writing tool failed. Try again later." });
    }
  });

  app.get("/api/admin/publishing-products", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      const rows = await db.select().from(creatorPublishingProducts)
        .where(eq(creatorPublishingProducts.status, "pending_review"))
        .orderBy(desc(creatorPublishingProducts.submittedAt));
      const results = await Promise.all(rows.map(async (product) => {
        const [creator] = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
        }).from(users).where(eq(users.id, product.creatorId)).limit(1);
        const [book] = product.bookId
          ? await db.select().from(creatorBooks).where(eq(creatorBooks.id, product.bookId)).limit(1)
          : [undefined];
        return { ...safeProduct(product), creator, book: book ? { ...book, chapters: book.chapters } : null };
      }));
      res.json(results);
    } catch (error) {
      console.error("Failed to load publishing review queue:", error);
      res.status(500).json({ message: "Could not load the publishing review queue." });
    }
  });

  app.get("/api/admin/publishing-settings", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    try {
      res.json({
        platformFeePercent: await getPublishingFeePercent(),
        studioMonthlyPrice: await getCreatorStudioMonthlyPrice(),
      });
    } catch (error) {
      res.status(500).json({ message: "Could not load publishing settings." });
    }
  });

  app.put("/api/admin/publishing-settings", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    const feePercent = Number(req.body.platformFeePercent);
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
      return res.status(400).json({ message: "Platform fee must be between 0 and 100 percent." });
    }
    const studioMonthlyPrice = req.body.studioMonthlyPrice === undefined
      ? undefined
      : Number(req.body.studioMonthlyPrice);
    if (studioMonthlyPrice !== undefined
      && (!Number.isFinite(studioMonthlyPrice) || studioMonthlyPrice < 0 || studioMonthlyPrice > 999999)) {
      return res.status(400).json({ message: "Creator Studio monthly price must be between $0 and $999,999." });
    }
    try {
      await db.insert(appSettings).values({
        key: "creator_publishing_fee_percent",
        value: String(feePercent),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value: String(feePercent), updatedAt: new Date() },
      });
      if (studioMonthlyPrice !== undefined) {
        await db.insert(appSettings).values({
          key: "creator_studio_monthly_price",
          value: studioMonthlyPrice.toFixed(2),
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: appSettings.key,
          set: { value: studioMonthlyPrice.toFixed(2), updatedAt: new Date() },
        });
      }
      res.json({
        platformFeePercent: feePercent,
        studioMonthlyPrice: studioMonthlyPrice ?? await getCreatorStudioMonthlyPrice(),
      });
    } catch (error) {
      console.error("Failed to save publishing settings:", error);
      res.status(500).json({ message: "Could not save publishing settings." });
    }
  });

  app.patch("/api/admin/publishing-products/:id", isAuthenticated, async (req: any, res) => {
    if (!isPublishingAdmin(req.user)) return res.status(403).json({ message: "Publishing admin access required." });
    const action = String(req.body.action || "");
    const reviewNote = String(req.body.reviewNote || "").trim().slice(0, 4000);
    if (!["approve", "reject"].includes(action)) return res.status(400).json({ message: "Choose approve or reject." });
    if (action === "reject" && !reviewNote) return res.status(400).json({ message: "Add a reason so the creator can revise the submission." });
    try {
      const [product] = await db.select().from(creatorPublishingProducts)
        .where(eq(creatorPublishingProducts.id, req.params.id)).limit(1);
      if (!product) return res.status(404).json({ message: "Publishing submission not found." });
      if (product.status !== "pending_review") return res.status(409).json({ message: "This submission has already been reviewed." });

      const updated = await db.transaction(async (tx) => {
        const [claim] = await tx.update(creatorPublishingProducts).set({
          status: "reviewing",
          updatedAt: new Date(),
        }).where(and(
          eq(creatorPublishingProducts.id, product.id),
          eq(creatorPublishingProducts.status, "pending_review"),
        )).returning({ id: creatorPublishingProducts.id });
        if (!claim) throw Object.assign(new Error("This submission has already been reviewed."), { statusCode: 409 });

        let shopProductId = product.shopProductId;
        if (action === "approve" && !shopProductId) {
          const [shopProduct] = await tx.insert(shopProducts).values({
            title: product.title,
            description: product.description,
            shortDescription: product.description.slice(0, 240),
            price: product.price,
            category: product.category,
            type: product.productType,
            featuredImage: product.coverImage,
            tags: product.tags,
            isActive: true,
            isFeatured: false,
            isFree: Number(product.price) === 0,
            createdBy: product.creatorId,
          }).returning({ id: shopProducts.id });
          shopProductId = shopProduct.id;
        } else if (action === "approve" && shopProductId) {
          await tx.update(shopProducts).set({ isActive: true, updatedAt: new Date() })
            .where(eq(shopProducts.id, shopProductId));
        }

        const [reviewed] = await tx.update(creatorPublishingProducts).set({
          shopProductId,
          status: action === "approve" ? "published" : "rejected",
          reviewNote: action === "reject" ? reviewNote : null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(creatorPublishingProducts.id, product.id)).returning();
        if (product.bookId) {
          await tx.update(creatorBooks).set({
            status: action === "approve" ? "published" : "rejected",
            updatedAt: new Date(),
          }).where(eq(creatorBooks.id, product.bookId));
        }
        return reviewed;
      });

      await db.insert(appSettings).values({
        key: `creator_publishing_review_${product.id}`,
        value: JSON.stringify({ action, adminId: req.user.id, note: reviewNote, at: new Date().toISOString() }),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify({ action, adminId: req.user.id, note: reviewNote, at: new Date().toISOString() }), updatedAt: new Date() },
      }).catch(() => {});
      await db.insert(notifications).values({
        userId: product.creatorId,
        type: "publishing_review",
        title: action === "approve" ? "Your product is published" : "Your product needs changes",
        content: action === "approve"
          ? `"${product.title}" is approved and now listed in the Taskdrip Shop.`
          : `"${product.title}" was not approved. ${reviewNote}`,
        actionUrl: "/creator-studio",
        isRead: false,
        priority: "high",
      }).catch(() => {});
      res.json(safeProduct(updated));
    } catch (error) {
      if ((error as any)?.statusCode === 409) {
        return res.status(409).json({ message: "This submission has already been reviewed." });
      }
      console.error("Failed to review publishing product:", error);
      res.status(500).json({ message: "Could not save the review decision." });
    }
  });

  app.get("/api/creators/:id/digital-products", async (req, res) => {
    try {
      const rows = await db.select({
        publishingProductId: creatorPublishingProducts.id,
        title: creatorPublishingProducts.title,
        description: creatorPublishingProducts.description,
        productType: creatorPublishingProducts.productType,
        category: creatorPublishingProducts.category,
        price: creatorPublishingProducts.price,
        currency: creatorPublishingProducts.currency,
        coverImage: creatorPublishingProducts.coverImage,
        tags: creatorPublishingProducts.tags,
        version: creatorPublishingProducts.version,
        license: creatorPublishingProducts.license,
        amazonUrl: creatorPublishingProducts.amazonUrl,
        accessUrl: creatorPublishingProducts.accessUrl,
        shopProductId: creatorPublishingProducts.shopProductId,
        rating: shopProducts.rating,
        reviewCount: shopProducts.reviewCount,
        salesCount: shopProducts.salesCount,
        isFeatured: shopProducts.isFeatured,
      }).from(creatorPublishingProducts)
        .innerJoin(shopProducts, eq(creatorPublishingProducts.shopProductId, shopProducts.id))
        .where(and(
          eq(creatorPublishingProducts.creatorId, req.params.id),
          eq(creatorPublishingProducts.status, "published"),
          eq(shopProducts.isActive, true),
        ))
        .orderBy(desc(creatorPublishingProducts.createdAt));
      res.json(rows);
    } catch (error) {
      console.error("Failed to load public creator products:", error);
      res.status(500).json({ message: "Could not load creator products." });
    }
  });

  app.get("/api/publishing/products/:shopProductId", async (req, res) => {
    try {
      const [product] = await db.select({
        publishingProductId: creatorPublishingProducts.id,
        title: creatorPublishingProducts.title,
        description: creatorPublishingProducts.description,
        productType: creatorPublishingProducts.productType,
        category: creatorPublishingProducts.category,
        version: creatorPublishingProducts.version,
        license: creatorPublishingProducts.license,
        amazonUrl: creatorPublishingProducts.amazonUrl,
        accessUrl: creatorPublishingProducts.accessUrl,
        creatorId: creatorPublishingProducts.creatorId,
      }).from(creatorPublishingProducts)
        .where(and(
          eq(creatorPublishingProducts.shopProductId, req.params.shopProductId),
          eq(creatorPublishingProducts.status, "published"),
        )).limit(1);
      if (!product) return res.status(404).json({ message: "Publishing product not found." });
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Could not load publishing product details." });
    }
  });

  app.get("/api/my/digital-library", isAuthenticated, async (req: any, res) => {
    try {
      const rows = await db.select({
        purchaseId: purchases.id,
        purchaseStatus: purchases.status,
        purchasedAt: purchases.paidAt,
        publishingProductId: creatorPublishingProducts.id,
        title: creatorPublishingProducts.title,
        productType: creatorPublishingProducts.productType,
        coverImage: creatorPublishingProducts.coverImage,
        originalFileName: creatorPublishingProducts.originalFileName,
        hasDownload: sql<boolean>`${creatorPublishingProducts.fileKey} IS NOT NULL`,
        amazonUrl: creatorPublishingProducts.amazonUrl,
        accessUrl: creatorPublishingProducts.accessUrl,
        shopProductId: creatorPublishingProducts.shopProductId,
      }).from(purchases)
        .innerJoin(shopProducts, eq(purchases.productId, shopProducts.id))
        .innerJoin(creatorPublishingProducts, eq(creatorPublishingProducts.shopProductId, shopProducts.id))
        .where(and(
          eq(purchases.userId, req.user.id),
          inArray(purchases.status, DOWNLOADABLE_PURCHASE_STATES),
          eq(creatorPublishingProducts.status, "published"),
        ))
        .orderBy(desc(purchases.paidAt));
      const withCounts = await Promise.all(rows.map(async (row) => {
        const [downloads] = await db.select({ total: count() }).from(creatorProductDownloads)
          .where(eq(creatorProductDownloads.purchaseId, row.purchaseId));
        return { ...row, downloadsRemaining: Math.max(0, 10 - Number(downloads?.total || 0)) };
      }));
      res.json(withCounts);
    } catch (error) {
      console.error("Failed to load digital library:", error);
      res.status(500).json({ message: "Could not load your digital library." });
    }
  });

  app.get("/api/publishing/download/:publishingProductId", isAuthenticated, async (req: any, res) => {
    try {
      const [product] = await db.select().from(creatorPublishingProducts)
        .where(and(
          eq(creatorPublishingProducts.id, req.params.publishingProductId),
          eq(creatorPublishingProducts.status, "published"),
        )).limit(1);
      if (!product?.shopProductId || !product.fileKey) return res.status(404).json({ message: "Download not found." });
      const [purchase] = await db.select().from(purchases)
        .where(and(
          eq(purchases.productId, product.shopProductId),
          eq(purchases.userId, req.user.id),
          inArray(purchases.status, DOWNLOADABLE_PURCHASE_STATES),
        )).orderBy(desc(purchases.paidAt)).limit(1);
      if (!purchase) return res.status(403).json({ message: "A verified purchase is required to download this file." });
      const [downloadCount] = await db.select({ total: count() }).from(creatorProductDownloads)
        .where(eq(creatorProductDownloads.purchaseId, purchase.id));
      if (Number(downloadCount?.total || 0) >= 10) {
        return res.status(429).json({ message: "This purchase has reached its 10-download limit. Contact support if you need access restored." });
      }
      const fileKey = path.basename(product.fileKey);
      const filePath = path.resolve(PRIVATE_PRODUCT_DIR, fileKey);
      if (!filePath.startsWith(`${PRIVATE_PRODUCT_DIR}${path.sep}`) || !existsSync(filePath)) {
        return res.status(410).json({ message: "The digital file is temporarily unavailable. Contact support." });
      }
      await db.insert(creatorProductDownloads).values({
        publishingProductId: product.id,
        purchaseId: purchase.id,
        userId: req.user.id,
      });
      res.download(filePath, safeFileName(product.originalFileName || product.title), (error) => {
        if (error && !res.headersSent) res.status(500).json({ message: "Could not download the product file." });
      });
    } catch (error) {
      console.error("Secure product download failed:", error);
      res.status(500).json({ message: "Could not download the product file." });
    }
  });

  app.get("/api/creator-studio/projects", isAuthenticated, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const [books, products] = await Promise.all([
        db.select({
          id: creatorBooks.id,
          title: creatorBooks.title,
          status: creatorBooks.status,
          updatedAt: creatorBooks.updatedAt,
        }).from(creatorBooks)
          .where(eq(creatorBooks.creatorId, req.user.id))
          .orderBy(desc(creatorBooks.updatedAt)),
        db.select({
          id: creatorPublishingProducts.id,
          title: creatorPublishingProducts.title,
          productType: creatorPublishingProducts.productType,
          status: creatorPublishingProducts.status,
          reviewNote: creatorPublishingProducts.reviewNote,
          updatedAt: creatorPublishingProducts.updatedAt,
          bookId: creatorPublishingProducts.bookId,
          shopProductId: creatorPublishingProducts.shopProductId,
        }).from(creatorPublishingProducts)
          .where(eq(creatorPublishingProducts.creatorId, req.user.id))
          .orderBy(desc(creatorPublishingProducts.updatedAt)),
      ]);

      const newestProductByBook = new Map<string, typeof products[number]>();
      for (const product of products) {
        if (product.bookId && !newestProductByBook.has(product.bookId)) {
          newestProductByBook.set(product.bookId, product);
        }
      }

      const summarize = (status: string, projectType: "book" | "product") => {
        if (status === "published") {
          return { statusLabel: "Published", progress: 100, nextAction: "Your product is live in the Taskdrip Shop." };
        }
        if (status === "pending_review" || status === "reviewing" || status === "submitted") {
          return { statusLabel: "In review", progress: 75, nextAction: "Your submission is with the publishing team. Check back for updates." };
        }
        if (status === "rejected") {
          return { statusLabel: "Changes requested", progress: 55, nextAction: "Review the admin note, make changes, and submit again." };
        }
        if (projectType === "book") {
          return { statusLabel: "In progress", progress: status === "editing" ? 40 : 20, nextAction: "Continue your manuscript, then submit a finished PDF or EPUB for review." };
        }
        return { statusLabel: "Draft", progress: 25, nextAction: "Finish your product details and upload its customer-ready file." };
      };

      const projects: Array<{
        id: string;
        projectType: "book" | "product";
        typeLabel: string;
        title: string;
        status: string;
        statusLabel: string;
        progress: number;
        nextAction: string;
        reviewNote: string | null;
        updatedAt: Date | null;
        shopProductId: string | null;
      }> = books.map((book) => {
        const product = newestProductByBook.get(book.id);
        const bookIsNewer = Boolean(
          product
          && ["draft", "editing"].includes(book.status)
          && new Date(book.updatedAt || 0).getTime() > new Date(product.updatedAt || 0).getTime(),
        );
        const status = bookIsNewer ? book.status : product?.status || book.status;
        const summary = summarize(status, "book");
        return {
          id: book.id,
          projectType: "book" as const,
          typeLabel: "Book",
          title: product?.title || book.title,
          status,
          ...summary,
          reviewNote: bookIsNewer ? null : product?.reviewNote || null,
          updatedAt: bookIsNewer ? book.updatedAt : product?.updatedAt || book.updatedAt,
          shopProductId: product?.shopProductId || null,
        };
      });

      for (const product of products) {
        if (product.bookId) continue;
        const summary = summarize(product.status, "product");
        projects.push({
          id: product.id,
          projectType: "product",
          typeLabel: product.productType.replace(/[-_]/g, " "),
          title: product.title,
          status: product.status,
          ...summary,
          reviewNote: product.reviewNote || null,
          updatedAt: product.updatedAt,
          shopProductId: product.shopProductId || null,
        });
      }

      projects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      res.json(projects);
    } catch (error) {
      console.error("Failed to load creator publishing projects:", error);
      res.status(500).json({ message: "Could not load your publishing projects." });
    }
  });

  app.get("/api/creator-studio/earnings", isAuthenticated, requireCreatorStudioAccess, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const rows = await db.select().from(creatorProductEarnings)
        .where(eq(creatorProductEarnings.creatorId, req.user.id))
        .orderBy(desc(creatorProductEarnings.createdAt));
      const sum = (key: "grossAmount" | "platformFee" | "referralFee" | "processingFee" | "netAmount") =>
        rows.reduce((total, row) => total + Number(row[key] || 0), 0);
      res.json({
        totalSales: rows.length,
        gross: sum("grossAmount").toFixed(2),
        platformFees: sum("platformFee").toFixed(2),
        referralFees: sum("referralFee").toFixed(2),
        processingFees: sum("processingFee").toFixed(2),
        netEarnings: sum("netAmount").toFixed(2),
        availableBalance: String((await db.select({ balance: users.availableBalance }).from(users).where(eq(users.id, req.user.id)).limit(1))[0]?.balance || "0.00"),
        feePercent: await getPublishingFeePercent(),
        sales: rows,
      });
    } catch (error) {
      console.error("Failed to load creator earnings:", error);
      res.status(500).json({ message: "Could not load creator earnings." });
    }
  });
}
