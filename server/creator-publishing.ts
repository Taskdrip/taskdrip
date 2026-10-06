import type { Express } from "express";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
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
  notifications,
  purchases,
  shopProducts,
  users,
} from "@shared/schema";
import { db } from "./db";
import { isAuthenticated } from "./auth";

const PRIVATE_PRODUCT_DIR = path.resolve(process.cwd(), ".private-product-files");
mkdirSync(PRIVATE_PRODUCT_DIR, { recursive: true });

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

const ADMIN_ROLES = new Set(["admin", "store_manager", "moderator", "content_editor"]);
const DOWNLOADABLE_PURCHASE_STATES = ["paid", "approved", "delivered"];
const BOOK_EXPORT_EXTENSIONS = new Set([".pdf", ".epub"]);

function isPublishingAdmin(user: any) {
  return user?.userType === "admin" || ADMIN_ROLES.has(user?.role);
}

function canPublish(user: any) {
  return user?.userType === "creator" || user?.userType === "influencer";
}

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
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
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
  app.get("/api/creator-studio/books", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/creator-studio/books", isAuthenticated, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    try {
      const [book] = await db.insert(creatorBooks).values({
        creatorId: req.user.id,
        title: "Untitled book",
        status: "draft",
      }).returning();
      res.status(201).json(book);
    } catch (error) {
      console.error("Failed to create book:", error);
      res.status(500).json({ message: "Could not create a book draft." });
    }
  });

  app.patch("/api/creator-studio/books/:id", isAuthenticated, async (req: any, res) => {
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
      if (req.body.idea !== undefined) changes.idea = String(req.body.idea).slice(0, 12000);
      if (req.body.description !== undefined) changes.description = String(req.body.description).slice(0, 20000);
      if (req.body.outline !== undefined) changes.outline = parseList(req.body.outline);
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

  app.post("/api/creator-studio/books/:id/submit", isAuthenticated, privateProductUpload.single("productFile"), async (req: any, res) => {
    if (!canPublish(req.user)) {
      removeUpload(req.file);
      return res.status(403).json({ message: "Creator accounts only." });
    }
    const ext = path.extname(req.file?.originalname || "").toLowerCase();
    if (!req.file || !BOOK_EXPORT_EXTENSIONS.has(ext)) {
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
      if (book.amazonUrl && !amazonUrl) {
        removeUpload(req.file);
        return res.status(400).json({ message: "The Amazon link is not valid." });
      }

      const originalFileName = safeFileName(req.file.originalname);
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
          fileKey: path.basename(req.file.filename),
          originalFileName,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
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

  app.get("/api/creator-studio/products", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/creator-studio/products", isAuthenticated, privateProductUpload.single("productFile"), async (req: any, res) => {
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

  app.patch("/api/creator-studio/products/:id", isAuthenticated, privateProductUpload.single("productFile"), async (req: any, res) => {
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

  app.post("/api/creator-studio/products/:id/submit", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/creator-studio/products/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/creator-studio/ai/outline", isAuthenticated, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message: "AI outline generation is unavailable until an OpenAI API key is configured as OPENAI_API_KEY.",
      });
    }
    const idea = String(req.body.idea || "").trim().slice(0, 6000);
    if (idea.length < 8) return res.status(400).json({ message: "Describe the book idea in at least 8 characters." });
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const result = await client.chat.completions.create({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Create a practical non-fiction or fiction book outline from the creator's idea. Return JSON only: {\"chapters\":[{\"title\":\"...\",\"summary\":\"...\"}]}. Use 6 to 12 chapters. Do not invent credentials, citations, or claims." },
          { role: "user", content: idea },
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

  app.post("/api/creator-studio/ai/chapter", isAuthenticated, async (req: any, res) => {
    if (!canPublish(req.user)) return res.status(403).json({ message: "Creator accounts only." });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message: "AI chapter generation is unavailable until an OpenAI API key is configured as OPENAI_API_KEY.",
      });
    }
    const bookId = String(req.body.bookId || "");
    const chapterTitle = String(req.body.chapterTitle || "").trim().slice(0, 240);
    const idea = String(req.body.idea || "").trim().slice(0, 4000);
    const [book] = await db.select({ id: creatorBooks.id })
      .from(creatorBooks)
      .where(and(eq(creatorBooks.id, bookId), eq(creatorBooks.creatorId, req.user.id)))
      .limit(1);
    if (!book) return res.status(404).json({ message: "Book not found." });
    if (!chapterTitle) return res.status(400).json({ message: "Enter a chapter title." });
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const result = await client.chat.completions.create({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "Draft an original book chapter for the creator to review and edit. Do not claim to provide legal, medical, financial, or safety advice. Avoid fabricated sources and quotations. Use clear headings and readable paragraphs." },
          { role: "user", content: `Book idea: ${idea || "Not provided"}\nChapter: ${chapterTitle}` },
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
      res.json({ platformFeePercent: await getPublishingFeePercent() });
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
    try {
      await db.insert(appSettings).values({
        key: "creator_publishing_fee_percent",
        value: String(feePercent),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: appSettings.key,
        set: { value: String(feePercent), updatedAt: new Date() },
      });
      res.json({ platformFeePercent: feePercent });
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

  app.get("/api/creator-studio/earnings", isAuthenticated, async (req: any, res) => {
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
