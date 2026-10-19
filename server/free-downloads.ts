import type { Express, Request, RequestHandler, Response } from "express";
import multer from "multer";
import { load } from "cheerio";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { stat, unlink as unlinkAsync } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { isAdmin, isAuthenticated } from "./auth";
import { pool } from "./db";
import { storage } from "./storage";

const privateFilesDir = path.resolve(
  process.env.FREE_DOWNLOADS_STORAGE_DIR || path.join(process.cwd(), "private-downloads"),
);
const publicMediaDir = path.resolve(process.cwd(), "uploads", "free-downloads");
mkdirSync(privateFilesDir, { recursive: true });
mkdirSync(publicMediaDir, { recursive: true });

const allowedFiles: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
  ".zip": ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
  ".rar": ["application/vnd.rar", "application/x-rar-compressed", "application/octet-stream"],
  ".mp3": ["audio/mpeg", "audio/mp3", "application/octet-stream"],
  ".mp4": ["video/mp4", "application/octet-stream"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".txt": ["text/plain"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip", "application/octet-stream"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"],
  ".apk": ["application/vnd.android.package-archive", "application/octet-stream"],
  ".exe": ["application/vnd.microsoft.portable-executable", "application/x-msdownload", "application/octet-stream"],
};
const allowedImageTypes: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
};

const privateFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, privateFilesDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const accepted = allowedFiles[extension];
    if (!accepted || !accepted.includes(file.mimetype.toLowerCase())) {
      return callback(new Error("Unsupported file type or MIME type."));
    }
    callback(null, true);
  },
});

const publicImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, publicMediaDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const accepted = allowedImageTypes[extension];
    if (!accepted || !accepted.includes(file.mimetype.toLowerCase())) {
      return callback(new Error("Only JPG, PNG, and WebP images are allowed."));
    }
    callback(null, true);
  },
});

const handleUpload =
  (middleware: any): RequestHandler =>
  (req, res, next) => {
    (middleware as any)(req, res, (error: any) => {
      if (error) return res.status(400).json({ message: error.message || "Upload failed." });
      next();
    });
  };

const uploadDownload = handleUpload(privateFileUpload.single("downloadFile"));
const uploadImage = handleUpload(publicImageUpload.single("image"));

const toSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 220) || `download-${Date.now()}`;

const allowedTags = new Set([
  "a", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "img", "li", "ol", "p", "pre", "strong", "table", "tbody", "td", "th", "thead",
  "tr", "u", "ul", "iframe",
]);
const voidTags = new Set(["br", "hr", "img"]);

function safeHref(value: string | undefined): boolean {
  if (!value) return false;
  if (/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(value)) return true;
  return false;
}

function sanitizeRichHtml(html: string): string {
  const $ = load(`<main data-download-content>${html}</main>`);
  const root = $("main[data-download-content]");
  root.find("script,style,object,embed,form,button,input,textarea,meta,link,svg,math").remove();
  root.find("*").each((_index, element) => {
    const node = $(element);
    const name = element.tagName.toLowerCase();
    if (name === "iframe") {
      const src = node.attr("src") || "";
      let parsed: URL | null = null;
      try { parsed = new URL(src); } catch { parsed = null; }
      const allowedEmbed = parsed && parsed.protocol === "https:" &&
        ((parsed.hostname === "www.youtube-nocookie.com" && parsed.pathname.startsWith("/embed/")) ||
          (parsed.hostname === "www.youtube.com" && parsed.pathname.startsWith("/embed/")) ||
          (parsed.hostname === "player.vimeo.com" && parsed.pathname.startsWith("/video/")));
      if (!allowedEmbed) {
        node.remove();
        return;
      }
      const attributes = (element as any).attribs ? Object.keys((element as any).attribs) : [];
      for (const attribute of attributes) {
        if (!["src", "title", "allow", "allowfullscreen", "referrerpolicy", "loading"].includes(attribute.toLowerCase())) {
          node.removeAttr(attribute);
        }
      }
      node.attr("loading", "lazy");
      node.attr("referrerpolicy", "strict-origin-when-cross-origin");
      return;
    }
    if (!allowedTags.has(name)) {
      if (!voidTags.has(name)) node.replaceWith(node.contents());
      else node.remove();
      return;
    }
    const attributes = (element as any).attribs ? Object.keys((element as any).attribs) : [];
    for (const attribute of attributes) {
      const key = attribute.toLowerCase();
      const allowed =
        (name === "a" && ["href", "target", "rel", "title"].includes(key)) ||
        (name === "img" && ["src", "alt", "title", "width", "height"].includes(key));
      if (!allowed) node.removeAttr(attribute);
    }
    if (name === "a") {
      const href = node.attr("href");
      if (!safeHref(href)) node.removeAttr("href");
      if (node.attr("target") === "_blank") node.attr("rel", "noopener noreferrer");
    }
    if (name === "img") {
      const src = node.attr("src") || "";
      let safeImage = src.startsWith("/uploads/free-downloads/");
      try { safeImage = safeImage || new URL(src).protocol === "https:"; } catch { /* relative paths are handled above */ }
      if (!safeImage) node.remove();
      node.attr("loading", "lazy");
      node.attr("decoding", "async");
    }
  });
  return root.html() || "";
}

const downloadPayloadSchema = z.object({
  title: z.string().trim().min(3).max(220),
  slug: z.string().trim().max(240).optional().default(""),
  shortDescription: z.string().trim().max(600).optional().default(""),
  descriptionHtml: z.string().max(100_000).optional().default(""),
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(48)).max(20).optional().default([]),
  thumbnailUrl: z.string().max(1000).optional().nullable().default(null),
  galleryUrls: z.array(z.string().max(1000)).max(12).optional().default([]),
  previewVideoUrl: z.string().max(1000).optional().nullable().default(null),
  externalDemoUrl: z.string().max(1000).optional().nullable().default(null),
  format: z.string().trim().max(40).optional().default(""),
  fileSizeBytes: z.number().int().min(0).max(5_000_000_000).nullable().optional().default(null),
  version: z.string().trim().max(80).optional().default(""),
  creator: z.string().trim().max(180).optional().default(""),
  releaseDate: z.string().trim().max(10).optional().nullable().default(null),
  systemRequirements: z.string().max(5000).optional().default(""),
  installationInstructions: z.string().max(10000).optional().default(""),
  features: z.array(z.string().trim().min(1).max(300)).max(30).optional().default([]),
  preacherId: z.string().optional().nullable().default(null),
  externalDownloadUrl: z.string().max(1500).optional().nullable().default(null),
  seoTitle: z.string().trim().max(220).optional().default(""),
  seoDescription: z.string().trim().max(320).optional().default(""),
  focusKeyword: z.string().trim().max(160).optional().default(""),
  canonicalUrl: z.string().max(1000).optional().nullable().default(null),
  ogTitle: z.string().trim().max(220).optional().default(""),
  ogDescription: z.string().trim().max(320).optional().default(""),
  ogImage: z.string().max(1000).optional().nullable().default(null),
  publicationStatus: z.enum(["draft", "preview", "published"]).optional().default("draft"),
  isFeatured: z.boolean().optional().default(false),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(140).optional().default(""),
  description: z.string().max(1000).optional().default(""),
  imageUrl: z.string().max(1000).optional().nullable().default(null),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const preacherSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(200).optional().default(""),
  photographUrl: z.string().max(1000).optional().nullable().default(null),
  biography: z.string().max(10000).optional().default(""),
  ministryName: z.string().trim().max(180).optional().default(""),
});

const requestSchema = z.object({
  resourceTitle: z.string().trim().min(3).max(220),
  categoryName: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(3000),
  preferredFormat: z.string().trim().max(80).optional().default(""),
  referenceUrl: z.string().trim().max(1000).optional().nullable().default(null),
  additionalComments: z.string().trim().max(2000).optional().default(""),
  website: z.string().max(0).optional(),
});

function getPayload(req: Request): any {
  if (typeof req.body?.payload === "string") {
    try { return JSON.parse(req.body.payload); } catch { return null; }
  }
  return req.body?.payload || req.body || {};
}

function safeExternalUrl(value: unknown, allowRelative = false): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  if (allowRelative && input.startsWith("/") && !input.startsWith("//")) return input;
  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function publicDownload(row: any, unlocked = false) {
  return {
    id: row.id,
    downloadCode: row.download_code || "",
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description || "",
    categoryId: row.category_id,
    categoryName: row.category_name || row.categoryName || "",
    categorySlug: row.category_slug || row.categorySlug || "",
    subcategoryId: row.subcategory_id || null,
    subcategoryName: row.subcategory_name || row.subcategoryName || null,
    tags: row.tags || [],
    thumbnailUrl: row.thumbnail_url || null,
    previewVideoUrl: row.preview_video_url || null,
    format: row.format || "",
    fileSizeBytes: row.source_size_bytes ? Number(row.source_size_bytes) : null,
    version: row.version || "",
    creator: row.creator || "",
    releaseDate: row.release_date || null,
    preacherId: row.preacher_id || null,
    preacherName: row.preacher_name || row.preacherName || null,
    preacherSlug: row.preacher_slug || row.preacherSlug || null,
    isFeatured: Boolean(row.is_featured),
    downloadCount: Number(row.download_count || 0),
    publishedAt: row.published_at || row.created_at,
    isUnlocked: unlocked,
  };
}

function adminDownload(row: any) {
  return {
    ...publicDownload(row),
    shortDescription: row.short_description || "",
    descriptionHtml: row.description_html || "",
    galleryUrls: row.gallery_urls || [],
    previewVideoUrl: row.preview_video_url || "",
    externalDemoUrl: row.external_demo_url || "",
    systemRequirements: row.system_requirements || "",
    installationInstructions: row.installation_instructions || "",
    features: row.features || [],
    sourceFileName: row.source_file_name || "",
    sourceMimeType: row.source_mime_type || "",
    hasPrivateFile: Boolean(row.source_file_key),
    externalDownloadUrl: row.external_download_url || "",
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    focusKeyword: row.focus_keyword || "",
    canonicalUrl: row.canonical_url || "",
    ogTitle: row.og_title || "",
    ogDescription: row.og_description || "",
    ogImage: row.og_image || "",
    publicationStatus: row.publication_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const detailSelect = `
  d.*,
  c.name AS category_name, c.slug AS category_slug,
  s.name AS subcategory_name,
  p.full_name AS preacher_name, p.slug AS preacher_slug,
  p.photograph_url AS preacher_photograph_url,
  p.biography AS preacher_biography, p.ministry_name AS preacher_ministry_name
`;
const detailJoins = `
  FROM free_download_items d
  JOIN free_download_categories c ON c.id = d.category_id
  LEFT JOIN free_download_subcategories s ON s.id = d.subcategory_id
  LEFT JOIN free_download_preachers p ON p.id = d.preacher_id
`;

async function addEvent(type: string, downloadId: string, userId: string | null, dedupe = false) {
  const id = randomUUID();
  const sql = dedupe
    ? `INSERT INTO free_download_events (id, user_id, download_id, event_type)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM free_download_events
         WHERE user_id = $2 AND download_id = $3 AND event_type = $4
           AND created_at > NOW() - INTERVAL '30 minutes'
       )
       RETURNING id`
    : `INSERT INTO free_download_events (id, user_id, download_id, event_type)
       VALUES ($1, $2, $3, $4) RETURNING id`;
  const result = await pool.query(sql, [id, userId, downloadId, type]);
  return result.rows[0]?.id as string | undefined;
}

async function getPublishedBySlug(slug: string) {
  const result = await pool.query(
    `SELECT ${detailSelect} ${detailJoins}
     WHERE d.slug = $1 AND d.publication_status = 'published' AND c.is_active = TRUE LIMIT 1`,
    [slug],
  );
  return result.rows[0];
}

async function getAnyBySlug(slug: string) {
  const result = await pool.query(
    `SELECT ${detailSelect} ${detailJoins}
     WHERE d.slug = $1 AND c.is_active = TRUE LIMIT 1`,
    [slug],
  );
  return result.rows[0];
}

async function getAdSettings() {
  const [downloadSettings, siteSettings] = await Promise.all([
    pool.query(
      `SELECT smartlink_url, ad_requirement_enabled, telegram_url
       FROM free_download_settings WHERE id = 'default' LIMIT 1`,
    ),
    pool.query(`SELECT settings FROM adsterra_settings WHERE id = 'singleton' LIMIT 1`),
  ]);
  const saved = downloadSettings.rows[0] || {
    smartlink_url: "",
    ad_requirement_enabled: false,
    telegram_url: "https://t.me/taskdrip",
  };
  const configuredUrl = safeExternalUrl(saved.smartlink_url);
  const adSettings = siteSettings.rows[0]?.settings;
  const activeSmartlink = adSettings?.enabled
    ? adSettings.placements?.find((placement: any) =>
      placement.enabled && placement.format === "smartlink" && typeof placement.shortSlug === "string" && placement.shortSlug,
    )
    : null;
  let siteSmartlinkUrl: string | null = null;
  if (!configuredUrl && activeSmartlink?.shortSlug) {
    const baseUrl = safeExternalUrl(process.env.PUBLIC_APP_URL || "https://taskdrip.online");
    if (baseUrl) {
      siteSmartlinkUrl = safeExternalUrl(
        new URL(`/s/${encodeURIComponent(activeSmartlink.shortSlug)}`, baseUrl).toString(),
      );
    }
  }
  const usesSiteSmartlink = Boolean(siteSmartlinkUrl);
  return {
    ...saved,
    smartlink_url: configuredUrl || siteSmartlinkUrl || "",
    ad_requirement_enabled: Boolean(saved.ad_requirement_enabled || usesSiteSmartlink),
  };
}

async function fullDownloadDetail(row: any, settings: any, unlocked: boolean, adminPreview = false) {
  const related = await pool.query(
    `SELECT ${detailSelect} ${detailJoins}
     WHERE d.publication_status='published' AND d.category_id=$1 AND d.id<>$2 AND c.is_active=TRUE
     ORDER BY d.is_featured DESC, d.download_count DESC LIMIT 4`,
    [row.category_id, row.id],
  );
  return {
    ...publicDownload(row, unlocked),
    descriptionHtml: row.description_html || "",
    galleryUrls: row.gallery_urls || [],
    previewVideoUrl: row.preview_video_url || "",
    externalDemoUrl: row.external_demo_url || "",
    systemRequirements: row.system_requirements || "",
    installationInstructions: row.installation_instructions || "",
    features: row.features || [],
    preacher: row.preacher_id ? {
      id: row.preacher_id,
      fullName: row.preacher_name,
      slug: row.preacher_slug,
      photographUrl: row.preacher_photograph_url,
      biography: row.preacher_biography,
      ministryName: row.preacher_ministry_name,
    } : null,
    isUnlocked: unlocked,
    adRequired: adminPreview ? false : Boolean(settings.ad_requirement_enabled),
    smartlinkConfigured: Boolean(safeExternalUrl(settings.smartlink_url)),
    telegramUrl: settings.telegram_url,
    publicationStatus: row.publication_status,
    adminPreview,
    seo: {
      title: row.seo_title || row.title,
      description: row.seo_description || row.short_description,
      focusKeyword: row.focus_keyword,
      canonicalUrl: row.canonical_url,
      ogTitle: row.og_title || row.seo_title || row.title,
      ogDescription: row.og_description || row.seo_description || row.short_description,
      ogImage: row.og_image || row.thumbnail_url,
    },
    related: related.rows.map((item) => publicDownload(item)),
  };
}

async function saveDownload(req: Request, res: Response, id?: string) {
  const uploaded = (req as any).file as Express.Multer.File | undefined;
  try {
    const result = await saveDownloadRecord(req, res, id);
    if (res.statusCode >= 400 && uploaded) {
      await unlinkAsync(path.join(privateFilesDir, uploaded.filename)).catch(() => {});
    }
    return result;
  } catch (error) {
    if (uploaded) await unlinkAsync(path.join(privateFilesDir, uploaded.filename)).catch(() => {});
    throw error;
  }
}

async function saveDownloadRecord(req: Request, res: Response, id?: string) {
  const rawPayload = getPayload(req);
  const parsed = downloadPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid download details." });
  }
  const data = parsed.data;
  const slug = toSlug(data.slug || data.title);
  const externalDownloadUrl = safeExternalUrl(data.externalDownloadUrl);
  const thumbnailUrl = safeExternalUrl(data.thumbnailUrl, true);
  const ogImage = safeExternalUrl(data.ogImage, true);
  const canonicalUrl = safeExternalUrl(data.canonicalUrl);
  const previewVideoUrl = safeExternalUrl(data.previewVideoUrl);
  const externalDemoUrl = safeExternalUrl(data.externalDemoUrl);
  const galleryUrls = data.galleryUrls.map((url) => safeExternalUrl(url, true));
  if (data.externalDownloadUrl && !externalDownloadUrl) return res.status(400).json({ message: "The external download link must use HTTPS." });
  if (data.thumbnailUrl && !thumbnailUrl) return res.status(400).json({ message: "The cover image must use HTTPS or a local upload URL." });
  if (data.ogImage && !ogImage) return res.status(400).json({ message: "The Open Graph image URL is invalid." });
  if (data.canonicalUrl && !canonicalUrl) return res.status(400).json({ message: "The canonical URL must use HTTPS." });
  if (data.previewVideoUrl && !previewVideoUrl) return res.status(400).json({ message: "The preview video URL must use HTTPS." });
  if (data.externalDemoUrl && !externalDemoUrl) return res.status(400).json({ message: "The demo URL must use HTTPS." });
  if (galleryUrls.some((url) => !url)) return res.status(400).json({ message: "Gallery images must use HTTPS or local upload URLs." });

  const category = await pool.query(
    "SELECT id FROM free_download_categories WHERE id = $1 AND is_active = TRUE LIMIT 1",
    [data.categoryId],
  );
  if (!category.rowCount) return res.status(400).json({ message: "Choose an active category." });

  if (data.subcategoryId) {
    const subcategory = await pool.query(
      "SELECT id FROM free_download_subcategories WHERE id = $1 AND category_id = $2 LIMIT 1",
      [data.subcategoryId, data.categoryId],
    );
    if (!subcategory.rowCount) return res.status(400).json({ message: "The selected subcategory does not belong to this category." });
  }
  if (data.preacherId) {
    const preacher = await pool.query("SELECT id FROM free_download_preachers WHERE id = $1 LIMIT 1", [data.preacherId]);
    if (!preacher.rowCount) return res.status(400).json({ message: "Choose a valid preacher profile." });
  }

  const previous = id
    ? (await pool.query("SELECT * FROM free_download_items WHERE id = $1 LIMIT 1", [id])).rows[0]
    : null;
  if (id && !previous) return res.status(404).json({ message: "Download not found." });
  const effectiveExternalUrl =
    externalDownloadUrl ||
    (id && !Object.prototype.hasOwnProperty.call(rawPayload, "externalDownloadUrl")
      ? previous?.external_download_url || null
      : null);
  const uploaded = (req as any).file as Express.Multer.File | undefined;
  const fileKey = uploaded?.filename || previous?.source_file_key || null;
  const fileName = uploaded
    ? path.basename(uploaded.originalname).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255)
    : previous?.source_file_name || null;
  const mimeType = uploaded?.mimetype || previous?.source_mime_type || null;
  const sizeBytes = uploaded?.size ?? data.fileSizeBytes ?? previous?.source_size_bytes ?? null;

  if (data.publicationStatus === "published" && !fileKey && !effectiveExternalUrl) {
    return res.status(400).json({ message: "Add a downloadable file or HTTPS download URL before publishing." });
  }
  const descriptionHtml = sanitizeRichHtml(data.descriptionHtml);
  const values = [
    data.title,
    slug,
    data.shortDescription,
    descriptionHtml,
    data.categoryId,
    data.subcategoryId || null,
    data.tags.map((tag) => tag.trim()).filter(Boolean),
    thumbnailUrl,
    galleryUrls.filter(Boolean),
    previewVideoUrl,
    data.format || (uploaded ? path.extname(uploaded.originalname).slice(1).toUpperCase() : ""),
    data.version,
    data.creator,
    data.releaseDate || null,
    data.systemRequirements,
    data.installationInstructions,
    data.features,
    data.preacherId || null,
    fileKey,
    fileName,
    mimeType,
    sizeBytes,
    effectiveExternalUrl,
    data.seoTitle || data.title,
    data.seoDescription || data.shortDescription,
    data.focusKeyword,
    canonicalUrl,
    data.ogTitle || data.seoTitle || data.title,
    data.ogDescription || data.seoDescription || data.shortDescription,
    ogImage || thumbnailUrl,
    data.publicationStatus,
    data.isFeatured,
    externalDemoUrl,
  ];

  try {
    let result;
    if (id) {
      result = await pool.query(
        `UPDATE free_download_items SET
          title=$1, slug=$2, short_description=$3, description_html=$4, category_id=$5,
          subcategory_id=$6, tags=$7, thumbnail_url=$8, gallery_urls=$9, preview_video_url=$10,
          format=$11, version=$12, creator=$13, release_date=$14, system_requirements=$15,
          installation_instructions=$16, features=$17, preacher_id=$18, source_file_key=$19,
          source_file_name=$20, source_mime_type=$21, source_size_bytes=$22, external_download_url=$23,
          seo_title=$24, seo_description=$25, focus_keyword=$26, canonical_url=$27, og_title=$28,
          og_description=$29, og_image=$30, publication_status=$31, is_featured=$32,
          external_demo_url=$33,
          published_at=CASE WHEN $31 = 'published' THEN COALESCE(published_at, NOW()) ELSE NULL END,
          updated_at=NOW()
        WHERE id=$34 RETURNING *`,
        [...values, id],
      );
    } else {
      result = await pool.query(
        `INSERT INTO free_download_items (
          id, title, slug, short_description, description_html, category_id, subcategory_id, tags,
          thumbnail_url, gallery_urls, preview_video_url, format, version, creator, release_date,
          system_requirements, installation_instructions, features, preacher_id, source_file_key,
          source_file_name, source_mime_type, source_size_bytes, external_download_url, seo_title,
          seo_description, focus_keyword, canonical_url, og_title, og_description, og_image,
          publication_status, is_featured, external_demo_url, created_by, published_at
        ) VALUES (
          $33, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $34, $35, CASE WHEN $31 = 'published' THEN NOW() ELSE NULL END
        ) RETURNING *`,
        [...values.slice(0, 32), randomUUID(), externalDemoUrl, (req.user as any)?.id || null],
      );
    }
    if (uploaded && previous?.source_file_key && previous.source_file_key !== uploaded.filename) {
      await deletePrivateFileIfUnused(previous.source_file_key, id);
    }
    return res.status(id ? 200 : 201).json(adminDownload(result.rows[0]));
  } catch (error: any) {
    if (uploaded) await unlinkAsync(path.join(privateFilesDir, uploaded.filename)).catch(() => {});
    if (error?.code === "23505") return res.status(409).json({ message: "That download URL is already in use. Choose a different title or slug." });
    console.error("[free-downloads] Save failed:", error);
    return res.status(500).json({ message: "Could not save this download." });
  }
}

async function deletePrivateFileIfUnused(key: string, exceptId?: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{1,8}$/i.test(key)) return;
  const result = await pool.query(
    `SELECT 1 FROM free_download_items WHERE source_file_key = $1 ${exceptId ? "AND id <> $2" : ""} LIMIT 1`,
    exceptId ? [key, exceptId] : [key],
  );
  if (!result.rowCount) await unlinkAsync(path.join(privateFilesDir, key)).catch(() => {});
}

function parseLimit(value: unknown, fallback: number, maximum: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, maximum) : fallback;
}

export function registerFreeDownloadsRoutes(app: Express) {
  app.get("/api/free-downloads/categories", async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT c.id, c.name, c.slug, c.description, c.image_url AS "imageUrl",
                c.sort_order AS "sortOrder", COUNT(d.id)::int AS "downloadCount",
                COALESCE((
                  SELECT json_agg(json_build_object('id',s.id,'name',s.name,'slug',s.slug,'sortOrder',s.sort_order)
                    ORDER BY s.sort_order,s.name)
                  FROM free_download_subcategories s WHERE s.category_id=c.id
                ), '[]'::json) AS subcategories
         FROM free_download_categories c
         LEFT JOIN free_download_items d
           ON d.category_id = c.id AND d.publication_status = 'published'
         WHERE c.is_active = TRUE
         GROUP BY c.id
         ORDER BY c.sort_order, c.name`,
      );
      res.json(result.rows);
    } catch (error) {
      console.error("[free-downloads] Category listing failed:", error);
      res.status(503).json({ message: "Download categories are temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/home", async (_req, res) => {
    try {
      const [categories, slides, featured, trending, recent, popular] = await Promise.all([
        pool.query(
          `SELECT c.id, c.name, c.slug, c.description, c.image_url AS "imageUrl",
                  c.sort_order AS "sortOrder", COUNT(d.id)::int AS "downloadCount"
           FROM free_download_categories c
           LEFT JOIN free_download_items d ON d.category_id=c.id AND d.publication_status='published'
           WHERE c.is_active=TRUE GROUP BY c.id ORDER BY c.sort_order, c.name`,
        ),
        pool.query(
          `SELECT id, title, description, image_url AS "imageUrl", cta_label AS "ctaLabel", cta_url AS "ctaUrl"
           FROM free_download_slides WHERE is_active=TRUE ORDER BY sort_order, created_at DESC LIMIT 8`,
        ),
        pool.query(
          `SELECT ${detailSelect} ${detailJoins}
           WHERE d.publication_status='published' AND d.is_featured=TRUE AND c.is_active=TRUE
           ORDER BY d.published_at DESC NULLS LAST LIMIT 8`,
        ),
        pool.query(
          `SELECT ${detailSelect} ${detailJoins}
           WHERE d.publication_status='published' AND c.is_active=TRUE
           ORDER BY d.download_count DESC, d.published_at DESC NULLS LAST LIMIT 8`,
        ),
        pool.query(
          `SELECT ${detailSelect} ${detailJoins}
           WHERE d.publication_status='published' AND c.is_active=TRUE
           ORDER BY d.published_at DESC NULLS LAST LIMIT 8`,
        ),
        pool.query(
          `SELECT ${detailSelect} ${detailJoins}
           WHERE d.publication_status='published' AND c.is_active=TRUE
           ORDER BY d.download_count DESC, d.published_at DESC NULLS LAST LIMIT 8`,
        ),
      ]);
      const slidesOut = slides.rows.length ? slides.rows : [{
        id: "free-downloads-default-slide",
        title: "Everything You Need, All in One Place.",
        description: "Discover free software, AI tools, entertainment, educational resources and digital downloads.",
        imageUrl: "",
        ctaLabel: "Explore downloads",
        ctaUrl: "/downloads",
      }];
      res.json({
        categories: categories.rows,
        slides: slidesOut,
        featured: featured.rows.map((row) => publicDownload(row)),
        trending: trending.rows.map((row) => publicDownload(row)),
        recent: recent.rows.map((row) => publicDownload(row)),
        popular: popular.rows.map((row) => publicDownload(row)),
      });
    } catch (error) {
      console.error("[free-downloads] Homepage data failed:", error);
      res.status(503).json({ message: "Free Downloads is temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/suggestions", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim().slice(0, 100);
      if (q.length < 2) return res.json({ suggestions: [] });
      const result = await pool.query(
        `SELECT d.title, d.slug, d.download_code AS "downloadCode", c.name AS "categoryName"
         FROM free_download_items d JOIN free_download_categories c ON c.id=d.category_id
         WHERE d.publication_status='published' AND c.is_active=TRUE
           AND (d.download_code ILIKE $1 OR d.title ILIKE $1 OR d.short_description ILIKE $1 OR array_to_string(d.tags, ' ') ILIKE $1)
         ORDER BY CASE WHEN UPPER(d.download_code)=UPPER($2) THEN 0 ELSE 1 END,
           d.is_featured DESC, d.download_count DESC LIMIT 8`,
        [`%${q}%`, q],
      );
      res.json({ suggestions: result.rows });
    } catch (error) {
      console.error("[free-downloads] Suggestions failed:", error);
      res.status(503).json({ message: "Search suggestions are temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/by-code/:code", async (req, res) => {
    const code = String(req.params.code || "").trim().toUpperCase();
    if (!/^TFD\d{2,}$/.test(code)) return res.status(404).json({ message: "Download code not found." });
    try {
      const result = await pool.query(
        `SELECT d.slug,d.download_code AS "downloadCode",d.title
         FROM free_download_items d
         JOIN free_download_categories c ON c.id=d.category_id
         WHERE UPPER(d.download_code)=$1 AND d.publication_status='published' AND c.is_active=TRUE
         LIMIT 1`,
        [code],
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Download code not found." });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("[free-downloads] Code lookup failed:", error);
      res.status(503).json({ message: "Download code lookup is temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/preachers/suggestions", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim().slice(0, 100);
      if (q.length < 2) return res.json({ suggestions: [] });
      const result = await pool.query(
        `SELECT id, full_name AS "fullName", slug, photograph_url AS "photographUrl",
                ministry_name AS "ministryName"
         FROM free_download_preachers WHERE full_name ILIKE $1 ORDER BY full_name LIMIT 8`,
        [`%${q}%`],
      );
      res.json({ suggestions: result.rows });
    } catch (error) {
      console.error("[free-downloads] Preacher suggestions failed:", error);
      res.status(503).json({ message: "Preacher suggestions are temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/preachers/:slug", async (req, res) => {
    try {
      const preacherResult = await pool.query(
        `SELECT id,full_name AS "fullName",slug,photograph_url AS "photographUrl",
                biography,ministry_name AS "ministryName"
         FROM free_download_preachers WHERE slug=$1 LIMIT 1`,
        [req.params.slug],
      );
      const preacher = preacherResult.rows[0];
      if (!preacher) return res.status(404).json({ message: "Preacher profile not found." });
      const sermons = await pool.query(
        `SELECT ${detailSelect} ${detailJoins}
         WHERE d.publication_status='published' AND d.preacher_id=$1
         ORDER BY d.published_at DESC NULLS LAST LIMIT 48`,
        [preacher.id],
      );
      res.json({ preacher, sermons: sermons.rows.map((row) => publicDownload(row)) });
    } catch (error) {
      console.error("[free-downloads] Preacher profile failed:", error);
      res.status(503).json({ message: "Preacher profile is temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads", async (req, res) => {
    try {
      const page = parseLimit(req.query.page, 1, 100000);
      const limit = parseLimit(req.query.limit, 12, 48);
      const values: any[] = [];
      const conditions = ["d.publication_status='published'", "c.is_active=TRUE"];
      const add = (value: any) => {
        values.push(value);
        return `$${values.length}`;
      };
      const q = String(req.query.q || "").trim().slice(0, 120);
      if (q) {
        const p = add(`%${q}%`);
        conditions.push(`(d.title ILIKE ${p} OR d.short_description ILIKE ${p}
          OR d.download_code ILIKE ${p} OR d.description_html ILIKE ${p} OR array_to_string(d.tags, ' ') ILIKE ${p}
          OR COALESCE(p.full_name, '') ILIKE ${p} OR d.format ILIKE ${p})`);
      }
      if (req.query.category) conditions.push(`c.slug = ${add(String(req.query.category).slice(0, 140))}`);
      if (req.query.subcategory) conditions.push(`s.slug = ${add(String(req.query.subcategory).slice(0, 140))}`);
      const fileTypeConditions: Record<string, string> = {
        document: `(d.source_mime_type IN ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          OR UPPER(d.format) = ANY(ARRAY['PDF','DOC','DOCX','TXT','PPT','PPTX','XLS','XLSX']::text[]))`,
        archive: `(d.source_mime_type IN ('application/zip','application/x-zip-compressed','application/vnd.rar','application/x-rar-compressed')
          OR UPPER(d.format) = ANY(ARRAY['ZIP','RAR']::text[]))`,
        audio: `(d.source_mime_type LIKE 'audio/%' OR UPPER(d.format) = ANY(ARRAY['MP3','M4A','WAV']::text[]))`,
        video: `(d.source_mime_type LIKE 'video/%' OR UPPER(d.format) = ANY(ARRAY['MP4','MOV','WEBM']::text[]))`,
        image: `(d.source_mime_type LIKE 'image/%' OR UPPER(d.format) = ANY(ARRAY['PNG','JPG','JPEG','WEBP']::text[]))`,
        software: `(d.source_mime_type IN ('application/vnd.android.package-archive','application/vnd.microsoft.portable-executable','application/x-msdownload')
          OR UPPER(d.format) = ANY(ARRAY['APP','APK','EXE','SOFTWARE','AI']::text[]))`,
      };
      const fileType = String(req.query.fileType || "");
      if (fileTypeConditions[fileType]) conditions.push(fileTypeConditions[fileType]);
      if (req.query.format) conditions.push(`d.format ILIKE ${add(String(req.query.format).slice(0, 40))}`);
      if (req.query.preacher) conditions.push(`p.slug = ${add(String(req.query.preacher).slice(0, 200))}`);
      if (req.query.minSize) conditions.push(`COALESCE(d.source_size_bytes, 0) >= ${add(Math.max(0, Number(req.query.minSize) || 0))}`);
      if (req.query.maxSize) conditions.push(`COALESCE(d.source_size_bytes, 0) <= ${add(Math.max(0, Number(req.query.maxSize) || 0))}`);
      if (req.query.from) conditions.push(`d.published_at >= ${add(String(req.query.from).slice(0, 32))}::timestamptz`);
      if (req.query.to) conditions.push(`d.published_at < (${add(String(req.query.to).slice(0, 32))}::date + INTERVAL '1 day')`);
      if (String(req.query.featured) === "true") conditions.push("d.is_featured=TRUE");

      const where = conditions.join(" AND ");
      const orderBy: Record<string, string> = {
        latest: "d.published_at DESC NULLS LAST, d.title ASC",
        popular: "d.download_count DESC, d.published_at DESC NULLS LAST",
        alphabetical: "d.title ASC",
        trending: "d.download_count DESC, d.created_at DESC",
        oldest: "d.published_at ASC NULLS LAST",
      };
      const sort = String(req.query.sort || "latest");
      const offset = (page - 1) * limit;
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM free_download_items d
         JOIN free_download_categories c ON c.id=d.category_id
         LEFT JOIN free_download_subcategories s ON s.id=d.subcategory_id
         LEFT JOIN free_download_preachers p ON p.id=d.preacher_id
         ${`WHERE ${where}`}`,
        values,
      );
      const listValues = [...values, q, limit, offset];
      const results = await pool.query(
         `SELECT ${detailSelect} ${detailJoins}
         WHERE ${where}
         ORDER BY CASE WHEN $${values.length + 1} ~* '^TFD[0-9]+$' AND UPPER(d.download_code)=UPPER($${values.length + 1}) THEN 0 ELSE 1 END,
           ${orderBy[sort] || orderBy.latest}
         LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
        listValues,
      );
      res.json({
        items: results.rows.map((row) => publicDownload(row)),
        total: Number(countResult.rows[0]?.total || 0),
        page,
        limit,
        pageCount: Math.ceil(Number(countResult.rows[0]?.total || 0) / limit),
      });
    } catch (error) {
      console.error("[free-downloads] Search failed:", error);
      res.status(503).json({ message: "Downloads are temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/preview/:slug", async (req, res) => {
    try {
      const row = await getPublishedBySlug(req.params.slug);
      if (!row) return res.status(404).json({ message: "Download not found." });
      const settings = await getAdSettings();
      res.json({
        ...publicDownload(row),
        descriptionHtml: sanitizeRichHtml(row.description_html || ""),
        features: row.features || [],
        systemRequirements: row.system_requirements || "",
        installationInstructions: row.installation_instructions || "",
        adRequired: Boolean(settings.ad_requirement_enabled),
        smartlinkConfigured: Boolean(safeExternalUrl(settings.smartlink_url)),
        seo: {
          title: row.seo_title || row.title,
          description: row.seo_description || row.short_description,
          focusKeyword: row.focus_keyword,
          canonicalUrl: row.canonical_url,
          ogTitle: row.og_title || row.seo_title || row.title,
          ogDescription: row.og_description || row.seo_description || row.short_description,
          ogImage: row.og_image || row.thumbnail_url,
        },
      });
    } catch (error) {
      console.error("[free-downloads] Public preview failed:", error);
      res.status(503).json({ message: "Download preview is temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/:slug/unlock-status", isAuthenticated, async (req: any, res) => {
    try {
      const row = await getPublishedBySlug(req.params.slug);
      if (!row) return res.status(404).json({ message: "Download not found." });
      const settings = await getAdSettings();
      const unlock = await pool.query(
        "SELECT unlocked_at FROM free_download_unlocks WHERE user_id=$1 AND download_id=$2 LIMIT 1",
        [req.user.id, row.id],
      );
      res.json({
        unlocked: Boolean(unlock.rowCount) || !settings.ad_requirement_enabled,
        adRequired: Boolean(settings.ad_requirement_enabled),
        smartlinkConfigured: Boolean(safeExternalUrl(settings.smartlink_url)),
      });
    } catch (error) {
      console.error("[free-downloads] Unlock status failed:", error);
      res.status(503).json({ message: "Download access is temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/:slug", isAuthenticated, async (req: any, res) => {
    try {
      const row = await getPublishedBySlug(req.params.slug);
      if (!row) return res.status(404).json({ message: "Download not found." });
      const unlock = await pool.query(
        "SELECT unlocked_at FROM free_download_unlocks WHERE user_id=$1 AND download_id=$2 LIMIT 1",
        [req.user.id, row.id],
      );
      await addEvent("detail_view", row.id, req.user.id, true);
      const settings = await getAdSettings();
      res.json(await fullDownloadDetail(
        row,
        settings,
        Boolean(unlock.rowCount) || !settings.ad_requirement_enabled,
      ));
    } catch (error) {
      console.error("[free-downloads] Detail failed:", error);
      res.status(503).json({ message: "Download details are temporarily unavailable." });
    }
  });

  app.post("/api/free-downloads/:slug/ad-start", isAuthenticated, async (req: any, res) => {
    try {
      if (req.body?.popupOpened !== true) return res.status(400).json({ message: "Open the partner page in a new tab before continuing." });
      const row = await getPublishedBySlug(req.params.slug);
      if (!row) return res.status(404).json({ message: "Download not found." });
      const [settings, unlock] = await Promise.all([
        getAdSettings(),
        pool.query("SELECT 1 FROM free_download_unlocks WHERE user_id=$1 AND download_id=$2", [req.user.id, row.id]),
      ]);
      if (unlock.rowCount || !settings.ad_requirement_enabled) {
        return res.json({ alreadyUnlocked: true, smartlinkUrl: null });
      }
      if (!safeExternalUrl(settings.smartlink_url)) return res.status(503).json({ message: "The advertising partner is not configured yet." });
      const redirectId = randomUUID();
      await pool.query(
        `INSERT INTO free_download_events (id, user_id, download_id, event_type)
         VALUES ($1, $2, $3, 'ad_redirect')`,
        [redirectId, req.user.id, row.id],
      );
      return res.json({
        alreadyUnlocked: false,
        redirectId,
        redirectUrl: `/api/free-downloads/${encodeURIComponent(row.slug)}/ad-redirect/${encodeURIComponent(redirectId)}`,
      });
    } catch (error) {
      console.error("[free-downloads] Ad redirect start failed:", error);
      return res.status(503).json({ message: "Could not start the advertising partner redirect." });
    }
  });

  app.get("/api/free-downloads/:slug/ad-redirect/:redirectId", isAuthenticated, async (req: any, res) => {
    let client: any;
    try {
      const row = await getPublishedBySlug(req.params.slug);
      if (!row) return res.status(404).json({ message: "Download not found." });
      const settings = await getAdSettings();
      const smartlinkUrl = safeExternalUrl(settings.smartlink_url);
      if (!settings.ad_requirement_enabled || !smartlinkUrl) {
        return res.status(409).send("The advertising redirect is not available.");
      }
      client = await pool.connect();
      await client.query("BEGIN");
      const completion = await client.query(
        `UPDATE free_download_events SET completed_at=NOW()
         WHERE id=$1 AND user_id=$2 AND download_id=$3 AND event_type='ad_redirect'
           AND completed_at IS NULL AND created_at > NOW() - INTERVAL '15 minutes'
         RETURNING id`,
        [req.params.redirectId, req.user.id, row.id],
      );
      if (completion.rowCount) {
        await client.query(
          `INSERT INTO free_download_unlocks (id, user_id, download_id, ad_redirected_at)
           VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, download_id) DO NOTHING`,
          [randomUUID(), req.user.id, row.id],
        );
        await client.query(
          `INSERT INTO free_download_events (id, user_id, download_id, event_type)
           VALUES ($1, $2, $3, 'unlock')`,
          [randomUUID(), req.user.id, row.id],
        );
      } else {
        const existing = await client.query(
          "SELECT 1 FROM free_download_unlocks WHERE user_id=$1 AND download_id=$2",
          [req.user.id, row.id],
        );
        if (!existing.rowCount) {
          await client.query("ROLLBACK");
          client.release();
          client = null;
          return res.status(410).send("This partner redirect has expired. Return to Taskdrip and retry.");
        }
        await client.query("COMMIT");
        client.release();
        client = null;
        return res.status(409).send("This download is already unlocked. Return to its Taskdrip page.");
      }
      await client.query("COMMIT");
      res.setHeader("Cache-Control", "no-store");
      return res.redirect(302, smartlinkUrl);
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("[free-downloads] Ad redirect completion failed:", error);
      return res.status(503).send("The partner redirect could not be completed. Return to Taskdrip and retry.");
    } finally {
      if (client) client.release();
    }
  });

  app.get("/api/free-downloads/admin/preview/:slug", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const row = await getAnyBySlug(req.params.slug);
      if (!row) return res.status(404).json({ message: "Download preview not found." });
      const settings = await getAdSettings();
      res.json(await fullDownloadDetail(row, settings, false, true));
    } catch (error) {
      console.error("[free-downloads] Admin preview failed:", error);
      res.status(503).json({ message: "The private preview is temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/:slug/file", isAuthenticated, async (req: any, res) => {
    try {
      const row = await getPublishedBySlug(req.params.slug);
      if (!row) return res.status(404).json({ message: "Download not found." });
      const settings = await getAdSettings();
      if (settings.ad_requirement_enabled) {
        const unlock = await pool.query(
          "SELECT 1 FROM free_download_unlocks WHERE user_id=$1 AND download_id=$2 LIMIT 1",
          [req.user.id, row.id],
        );
        if (!unlock.rowCount) return res.status(403).json({ message: "Complete the partner redirect to unlock this download." });
      }
      const countedEvent = await addEvent("download_click", row.id, req.user.id, true);
      if (countedEvent) {
        await pool.query("UPDATE free_download_items SET download_count=download_count+1 WHERE id=$1", [row.id]);
      }
      if (row.external_download_url) {
        const target = safeExternalUrl(row.external_download_url);
        if (!target) return res.status(410).json({ message: "This download link is no longer valid." });
        return res.redirect(302, target);
      }
      if (!row.source_file_key || !/^[a-f0-9-]{36}\.[a-z0-9]{1,8}$/i.test(row.source_file_key)) {
        return res.status(404).json({ message: "The file is not available." });
      }
      const filePath = path.resolve(privateFilesDir, row.source_file_key);
      if (!filePath.startsWith(`${privateFilesDir}${path.sep}`)) return res.status(404).json({ message: "The file is not available." });
      await stat(filePath);
      res.setHeader("Content-Type", row.source_mime_type || "application/octet-stream");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.download(filePath, path.basename(row.source_file_name || "download"));
    } catch (error: any) {
      if (error?.code === "ENOENT") return res.status(404).json({ message: "The file is not available." });
      console.error("[free-downloads] Secure file delivery failed:", error);
      return res.status(503).json({ message: "The file could not be downloaded right now." });
    }
  });

  app.post("/api/free-downloads/requests", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Check the request form." });
      if (parsed.data.website) return res.status(201).json({ ok: true });
      if (parsed.data.referenceUrl && !safeExternalUrl(parsed.data.referenceUrl)) {
        return res.status(400).json({ message: "The reference URL must use HTTPS." });
      }
      const recent = await pool.query(
        "SELECT 1 FROM free_download_requests WHERE user_id=$1 AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1",
        [req.user.id],
      );
      if (recent.rowCount) return res.status(429).json({ message: "Please wait a minute before sending another request." });
      const result = await pool.query(
        `INSERT INTO free_download_requests
          (id, user_id, resource_title, category_name, description, preferred_format, reference_url, email, additional_comments)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, resource_title AS "resourceTitle", category_name AS "categoryName",
           description, preferred_format AS "preferredFormat", reference_url AS "referenceUrl", email,
           additional_comments AS "additionalComments", status, created_at AS "createdAt"`,
        [
          randomUUID(), req.user.id, parsed.data.resourceTitle, parsed.data.categoryName, parsed.data.description,
          parsed.data.preferredFormat, parsed.data.referenceUrl || null, req.user.email, parsed.data.additionalComments,
        ],
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("[free-downloads] Request submission failed:", error);
      res.status(503).json({ message: "Your request could not be submitted right now." });
    }
  });

  app.get("/api/free-downloads/my-requests", isAuthenticated, async (req: any, res) => {
    try {
      const result = await pool.query(
        `SELECT r.id, r.resource_title AS "resourceTitle", r.category_name AS "categoryName",
                r.description, r.preferred_format AS "preferredFormat", r.reference_url AS "referenceUrl",
                r.status, r.response, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
                d.title AS "linkedDownloadTitle", d.slug AS "linkedDownloadSlug"
         FROM free_download_requests r
         LEFT JOIN free_download_items d ON d.id=r.linked_download_id
         WHERE r.user_id=$1 ORDER BY r.created_at DESC`,
        [req.user.id],
      );
      res.json(result.rows);
    } catch (error) {
      console.error("[free-downloads] User requests failed:", error);
      res.status(503).json({ message: "Your requests are temporarily unavailable." });
    }
  });

  app.get("/api/free-downloads/admin/downloads", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT ${detailSelect} ${detailJoins}
         ORDER BY d.updated_at DESC LIMIT 500`,
      );
      res.json(result.rows.map((row) => adminDownload(row)));
    } catch (error) {
      console.error("[free-downloads] Admin list failed:", error);
      res.status(503).json({ message: "Downloads could not be loaded." });
    }
  });

  app.post("/api/free-downloads/admin/downloads", isAuthenticated, isAdmin, uploadDownload, async (req: any, res) =>
    saveDownload(req, res));

  app.put("/api/free-downloads/admin/downloads/:id", isAuthenticated, isAdmin, uploadDownload, async (req: any, res) =>
    saveDownload(req, res, req.params.id));

  app.post("/api/free-downloads/admin/downloads/:id/duplicate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { rows } = await pool.query(
        `INSERT INTO free_download_items (
          id,title,slug,short_description,description_html,category_id,subcategory_id,tags,thumbnail_url,
          gallery_urls,preview_video_url,format,version,creator,release_date,system_requirements,
          installation_instructions,features,preacher_id,source_file_key,source_file_name,source_mime_type,
          source_size_bytes,external_download_url,seo_title,seo_description,focus_keyword,canonical_url,
          og_title,og_description,og_image,publication_status,is_featured,external_demo_url,created_by
        )
        SELECT $2, title || ' (copy)', $3, short_description, description_html, category_id, subcategory_id,
          tags, thumbnail_url, gallery_urls, preview_video_url, format, version, creator, release_date,
          system_requirements, installation_instructions, features, preacher_id, source_file_key,
          source_file_name, source_mime_type, source_size_bytes, external_download_url, seo_title,
          seo_description, focus_keyword, canonical_url, og_title, og_description, og_image, 'draft',
          FALSE, external_demo_url, $4
        FROM free_download_items WHERE id=$1 RETURNING *`,
        [req.params.id, randomUUID(), `${toSlug("copy-" + randomUUID())}`, req.user.id],
      );
      if (!rows[0]) return res.status(404).json({ message: "Download not found." });
      res.status(201).json(adminDownload(rows[0]));
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ message: "Could not create a unique copy of this download." });
      console.error("[free-downloads] Duplicate failed:", error);
      res.status(503).json({ message: "Could not duplicate this download." });
    }
  });

  app.delete("/api/free-downloads/admin/downloads/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const deleted = await pool.query("DELETE FROM free_download_items WHERE id=$1 RETURNING source_file_key", [req.params.id]);
      if (!deleted.rows[0]) return res.status(404).json({ message: "Download not found." });
      if (deleted.rows[0].source_file_key) await deletePrivateFileIfUnused(deleted.rows[0].source_file_key);
      res.json({ ok: true });
    } catch (error) {
      console.error("[free-downloads] Delete failed:", error);
      res.status(409).json({ message: "This download could not be deleted." });
    }
  });

  app.post("/api/free-downloads/admin/media", isAuthenticated, isAdmin, uploadImage, async (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "Select a JPG, PNG, or WebP image." });
    res.status(201).json({ url: `/uploads/free-downloads/${req.file.filename}` });
  });

  app.get("/api/free-downloads/admin/categories", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT c.id, c.name, c.slug, c.description, c.image_url AS "imageUrl",
                c.sort_order AS "sortOrder", c.is_active AS "isActive",
                COALESCE(json_agg(json_build_object(
                  'id', s.id, 'name', s.name, 'slug', s.slug, 'sortOrder', s.sort_order
                )) FILTER (WHERE s.id IS NOT NULL), '[]') AS subcategories
         FROM free_download_categories c LEFT JOIN free_download_subcategories s ON s.category_id=c.id
         GROUP BY c.id ORDER BY c.sort_order, c.name`,
      );
      res.json(result.rows);
    } catch (error) {
      console.error("[free-downloads] Admin categories failed:", error);
      res.status(503).json({ message: "Categories could not be loaded." });
    }
  });

  app.post("/api/free-downloads/admin/categories", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a category name." });
    const data = parsed.data;
    try {
      const result = await pool.query(
        `INSERT INTO free_download_categories (id,name,slug,description,image_url,sort_order,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,slug,description,image_url AS "imageUrl",
           sort_order AS "sortOrder",is_active AS "isActive"`,
        [randomUUID(), data.name, toSlug(data.slug || data.name), data.description, safeExternalUrl(data.imageUrl, true), data.sortOrder, data.isActive],
      );
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ message: "A category with that slug already exists." });
      res.status(503).json({ message: "Category could not be saved." });
    }
  });

  app.put("/api/free-downloads/admin/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter a category name." });
    const data = parsed.data;
    try {
      const result = await pool.query(
        `UPDATE free_download_categories SET name=$2,slug=$3,description=$4,image_url=$5,
          sort_order=$6,is_active=$7,updated_at=NOW()
         WHERE id=$1 RETURNING id,name,slug,description,image_url AS "imageUrl",
           sort_order AS "sortOrder",is_active AS "isActive"`,
        [req.params.id, data.name, toSlug(data.slug || data.name), data.description, safeExternalUrl(data.imageUrl, true), data.sortOrder, data.isActive],
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Category not found." });
      res.json(result.rows[0]);
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ message: "A category with that slug already exists." });
      res.status(503).json({ message: "Category could not be updated." });
    }
  });

  app.delete("/api/free-downloads/admin/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM free_download_categories WHERE id=$1 RETURNING id", [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ message: "Category not found." });
      res.json({ ok: true });
    } catch (error: any) {
      if (error?.code === "23503") return res.status(409).json({ message: "Move or remove this category's downloads before deleting it." });
      res.status(503).json({ message: "Category could not be deleted." });
    }
  });

  app.post("/api/free-downloads/admin/subcategories", isAuthenticated, isAdmin, async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const categoryId = String(req.body?.categoryId || "");
    if (name.length < 2 || name.length > 120 || !categoryId) return res.status(400).json({ message: "Choose a category and enter a subcategory name." });
    try {
      const result = await pool.query(
        `INSERT INTO free_download_subcategories (id,category_id,name,slug,sort_order)
         VALUES ($1,$2,$3,$4,$5) RETURNING id,category_id AS "categoryId",name,slug,sort_order AS "sortOrder"`,
        [randomUUID(), categoryId, name, toSlug(req.body?.slug || name), Math.max(0, Number(req.body?.sortOrder) || 0)],
      );
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error?.code === "23503") return res.status(400).json({ message: "Choose a valid category." });
      if (error?.code === "23505") return res.status(409).json({ message: "That subcategory already exists in this category." });
      res.status(503).json({ message: "Subcategory could not be saved." });
    }
  });

  app.put("/api/free-downloads/admin/subcategories/:id", isAuthenticated, isAdmin, async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const categoryId = String(req.body?.categoryId || "");
    if (name.length < 2 || name.length > 120 || !categoryId) return res.status(400).json({ message: "Choose a category and enter a subcategory name." });
    try {
      const result = await pool.query(
        `UPDATE free_download_subcategories SET category_id=$2,name=$3,slug=$4,sort_order=$5
         WHERE id=$1 RETURNING id,category_id AS "categoryId",name,slug,sort_order AS "sortOrder"`,
        [req.params.id, categoryId, name, toSlug(req.body?.slug || name), Math.max(0, Number(req.body?.sortOrder) || 0)],
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Subcategory not found." });
      res.json(result.rows[0]);
    } catch (error: any) {
      if (error?.code === "23503") return res.status(400).json({ message: "Choose a valid category." });
      if (error?.code === "23505") return res.status(409).json({ message: "That subcategory already exists in this category." });
      res.status(503).json({ message: "Subcategory could not be updated." });
    }
  });

  app.delete("/api/free-downloads/admin/subcategories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM free_download_subcategories WHERE id=$1 RETURNING id", [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ message: "Subcategory not found." });
      res.json({ ok: true });
    } catch (error) {
      res.status(503).json({ message: "Subcategory could not be deleted." });
    }
  });

  app.get("/api/free-downloads/admin/preachers", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT p.id,p.full_name AS "fullName",p.slug,p.photograph_url AS "photographUrl",
                p.biography,p.ministry_name AS "ministryName",COUNT(d.id)::int AS "sermonCount"
         FROM free_download_preachers p LEFT JOIN free_download_items d ON d.preacher_id=p.id
         GROUP BY p.id ORDER BY p.full_name`,
      );
      res.json(result.rows);
    } catch (error) {
      res.status(503).json({ message: "Preacher profiles could not be loaded." });
    }
  });

  app.post("/api/free-downloads/admin/preachers", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = preacherSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter the preacher's name." });
    const data = parsed.data;
    try {
      const result = await pool.query(
        `INSERT INTO free_download_preachers (id,full_name,slug,photograph_url,biography,ministry_name)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id,full_name AS "fullName",slug,photograph_url AS "photographUrl",biography,ministry_name AS "ministryName"`,
        [randomUUID(), data.fullName, toSlug(data.slug || data.fullName), safeExternalUrl(data.photographUrl, true), data.biography, data.ministryName],
      );
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ message: "A preacher with that slug already exists." });
      res.status(503).json({ message: "Preacher profile could not be saved." });
    }
  });

  app.put("/api/free-downloads/admin/preachers/:id", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = preacherSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter the preacher's name." });
    const data = parsed.data;
    try {
      const result = await pool.query(
        `UPDATE free_download_preachers SET full_name=$2,slug=$3,photograph_url=$4,
          biography=$5,ministry_name=$6,updated_at=NOW() WHERE id=$1
         RETURNING id,full_name AS "fullName",slug,photograph_url AS "photographUrl",biography,ministry_name AS "ministryName"`,
        [req.params.id, data.fullName, toSlug(data.slug || data.fullName), safeExternalUrl(data.photographUrl, true), data.biography, data.ministryName],
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Preacher not found." });
      res.json(result.rows[0]);
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ message: "A preacher with that slug already exists." });
      res.status(503).json({ message: "Preacher profile could not be updated." });
    }
  });

  app.delete("/api/free-downloads/admin/preachers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM free_download_preachers WHERE id=$1 RETURNING id", [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ message: "Preacher not found." });
      res.json({ ok: true });
    } catch (error) {
      res.status(503).json({ message: "Preacher could not be deleted." });
    }
  });

  app.get("/api/free-downloads/admin/settings", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const settings = await getAdSettings();
      res.json({
        smartlinkUrl: settings.smartlink_url,
        adRequirementEnabled: settings.ad_requirement_enabled,
        telegramUrl: settings.telegram_url,
      });
    } catch (error) {
      res.status(503).json({ message: "Download settings could not be loaded." });
    }
  });

  app.put("/api/free-downloads/admin/settings", isAuthenticated, isAdmin, async (req, res) => {
    const smartlinkUrl = String(req.body?.smartlinkUrl || "").trim();
    const telegramUrl = String(req.body?.telegramUrl || "https://t.me/taskdrip").trim();
    const adRequirementEnabled = req.body?.adRequirementEnabled === true;
    const safeSmartlink = safeExternalUrl(smartlinkUrl);
    const safeTelegram = safeExternalUrl(telegramUrl);
    if (smartlinkUrl && !safeSmartlink) return res.status(400).json({ message: "Adsterra Smartlink must be a valid HTTPS URL." });
    if (!safeTelegram) return res.status(400).json({ message: "Telegram URL must use HTTPS." });
    if (adRequirementEnabled && !safeSmartlink) return res.status(400).json({ message: "Add a valid Smartlink before enabling the advertising requirement." });
    try {
      await pool.query(
        `INSERT INTO free_download_settings (id,smartlink_url,ad_requirement_enabled,telegram_url,updated_at)
         VALUES ('default',$1,$2,$3,NOW())
         ON CONFLICT (id) DO UPDATE SET smartlink_url=EXCLUDED.smartlink_url,
           ad_requirement_enabled=EXCLUDED.ad_requirement_enabled,telegram_url=EXCLUDED.telegram_url,updated_at=NOW()`,
        [safeSmartlink || "", adRequirementEnabled, safeTelegram],
      );
      res.json({ smartlinkUrl: safeSmartlink || "", adRequirementEnabled, telegramUrl: safeTelegram });
    } catch (error) {
      res.status(503).json({ message: "Download settings could not be saved." });
    }
  });

  app.get("/api/free-downloads/admin/slides", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT id,title,description,image_url AS "imageUrl",cta_label AS "ctaLabel",
                cta_url AS "ctaUrl",sort_order AS "sortOrder",is_active AS "isActive"
         FROM free_download_slides ORDER BY sort_order,created_at DESC`,
      );
      res.json(result.rows);
    } catch (error) {
      res.status(503).json({ message: "Homepage slides could not be loaded." });
    }
  });

  app.post("/api/free-downloads/admin/slides", isAuthenticated, isAdmin, async (req, res) => {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const imageUrl = safeExternalUrl(req.body?.imageUrl, true);
    const ctaUrl = String(req.body?.ctaUrl || "/downloads").trim();
    const ctaLabel = String(req.body?.ctaLabel || "Explore downloads").trim();
    if (title.length < 3 || title.length > 220 || !imageUrl || ctaLabel.length > 80 ||
        ctaUrl.length > 500 || !(ctaUrl.startsWith("/") && !ctaUrl.startsWith("//") || safeExternalUrl(ctaUrl))) {
      return res.status(400).json({ message: "Enter a title, HTTPS or uploaded image, button label, and safe button link." });
    }
    try {
      const result = await pool.query(
        `INSERT INTO free_download_slides (id,title,description,image_url,cta_label,cta_url,sort_order,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id,title,description,image_url AS "imageUrl",cta_label AS "ctaLabel",cta_url AS "ctaUrl",
           sort_order AS "sortOrder",is_active AS "isActive"`,
        [randomUUID(), title, description.slice(0, 600), imageUrl, ctaLabel, ctaUrl, Math.max(0, Number(req.body?.sortOrder) || 0), req.body?.isActive !== false],
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(503).json({ message: "Homepage slide could not be saved." });
    }
  });

  app.put("/api/free-downloads/admin/slides/:id", isAuthenticated, isAdmin, async (req, res) => {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const imageUrl = safeExternalUrl(req.body?.imageUrl, true);
    const ctaUrl = String(req.body?.ctaUrl || "/downloads").trim();
    const ctaLabel = String(req.body?.ctaLabel || "Explore downloads").trim();
    if (title.length < 3 || title.length > 220 || !imageUrl || ctaLabel.length > 80 ||
        ctaUrl.length > 500 || !(ctaUrl.startsWith("/") && !ctaUrl.startsWith("//") || safeExternalUrl(ctaUrl))) {
      return res.status(400).json({ message: "Enter a title, HTTPS or uploaded image, button label, and safe button link." });
    }
    try {
      const result = await pool.query(
        `UPDATE free_download_slides SET title=$2,description=$3,image_url=$4,cta_label=$5,cta_url=$6,
           sort_order=$7,is_active=$8,updated_at=NOW()
         WHERE id=$1 RETURNING id,title,description,image_url AS "imageUrl",cta_label AS "ctaLabel",
           cta_url AS "ctaUrl",sort_order AS "sortOrder",is_active AS "isActive"`,
        [req.params.id, title, description.slice(0, 600), imageUrl, ctaLabel, ctaUrl, Math.max(0, Number(req.body?.sortOrder) || 0), req.body?.isActive !== false],
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Homepage slide not found." });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(503).json({ message: "Homepage slide could not be updated." });
    }
  });

  app.delete("/api/free-downloads/admin/slides/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM free_download_slides WHERE id=$1 RETURNING id", [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ message: "Homepage slide not found." });
      res.json({ ok: true });
    } catch (error) {
      res.status(503).json({ message: "Homepage slide could not be deleted." });
    }
  });

  app.get("/api/free-downloads/admin/requests", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const values: any[] = [];
      const conditions: string[] = [];
      if (req.query.status && req.query.status !== "all") {
        values.push(String(req.query.status));
        conditions.push(`r.status=$${values.length}`);
      }
      if (req.query.category && req.query.category !== "all") {
        values.push(String(req.query.category));
        conditions.push(`r.category_name=$${values.length}`);
      }
      if (req.query.q) {
        values.push(`%${String(req.query.q).slice(0, 120)}%`);
        conditions.push(`(r.resource_title ILIKE $${values.length} OR r.email ILIKE $${values.length} OR r.description ILIKE $${values.length})`);
      }
      const result = await pool.query(
        `SELECT r.id,r.user_id AS "userId",r.resource_title AS "resourceTitle",r.category_name AS "categoryName",
          r.description,r.preferred_format AS "preferredFormat",r.reference_url AS "referenceUrl",
          r.email,r.additional_comments AS "additionalComments",r.status,r.internal_notes AS "internalNotes",
          r.response,r.linked_download_id AS "linkedDownloadId",d.title AS "linkedDownloadTitle",
          d.slug AS "linkedDownloadSlug",r.created_at AS "createdAt",r.updated_at AS "updatedAt",
          u.first_name AS "firstName",u.last_name AS "lastName"
         FROM free_download_requests r JOIN users u ON u.id=r.user_id
         LEFT JOIN free_download_items d ON d.id=r.linked_download_id
         ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
         ORDER BY r.created_at DESC LIMIT 500`,
        values,
      );
      res.json(result.rows);
    } catch (error) {
      console.error("[free-downloads] Admin requests failed:", error);
      res.status(503).json({ message: "Download requests could not be loaded." });
    }
  });

  app.patch("/api/free-downloads/admin/requests/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    const status = z.enum(["pending", "processing", "available", "rejected"]).safeParse(req.body?.status);
    if (!status.success) return res.status(400).json({ message: "Choose a valid request status." });
    const notes = String(req.body?.internalNotes || "").slice(0, 5000);
    const responseText = String(req.body?.response || "").slice(0, 3000);
    const linkedDownloadId = req.body?.linkedDownloadId ? String(req.body.linkedDownloadId) : null;
    try {
      if (linkedDownloadId) {
        const linked = await pool.query(
          "SELECT 1 FROM free_download_items WHERE id=$1 AND publication_status='published' LIMIT 1",
          [linkedDownloadId],
        );
        if (!linked.rowCount) return res.status(400).json({ message: "Choose a valid published download to link to this request." });
      }
      const result = await pool.query(
        `UPDATE free_download_requests SET status=$2,internal_notes=$3,response=$4,
          linked_download_id=$5,updated_at=NOW()
         WHERE id=$1
         RETURNING id,user_id AS "userId",resource_title AS "resourceTitle",status,response`,
        [req.params.id, status.data, notes, responseText, linkedDownloadId],
      );
      if (!result.rows[0]) return res.status(404).json({ message: "Request not found." });
      const request = result.rows[0];
      try {
        await storage.createNotification({
          userId: request.userId,
          type: "free_download_request",
          title: `Your download request is ${request.status}`,
          content: request.response || `The status of your request, “${request.resourceTitle}”, has changed to ${request.status}.`,
          priority: "normal",
          actionUrl: "/downloads/my-requests",
        } as any);
      } catch (notificationError) {
        console.error("[free-downloads] Request status notification failed:", notificationError);
      }
      res.json(request);
    } catch (error: any) {
      if (error?.code === "23503") return res.status(400).json({ message: "Choose a valid published download to link to this request." });
      console.error("[free-downloads] Request update failed:", error);
      res.status(503).json({ message: "The request could not be updated." });
    }
  });

  app.get("/api/free-downloads/admin/analytics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const range = String(req.query.range || "30d");
      const allowedRanges: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "365d": "365 days" };
      const interval = allowedRanges[range] || allowedRanges["30d"];
      const [events, requestStats, registered, popular, categories, daily] = await Promise.all([
        pool.query(
          `SELECT event_type AS "eventType",
              COUNT(*)::int AS total
           FROM free_download_events
           WHERE created_at >= NOW() - $1::interval GROUP BY event_type`,
          [interval],
        ),
        pool.query(
          `SELECT status,COUNT(*)::int AS total FROM free_download_requests
           WHERE created_at >= NOW() - $1::interval GROUP BY status`,
          [interval],
        ),
        pool.query("SELECT COUNT(*)::int AS total FROM users"),
        pool.query(
          `SELECT d.id,d.title,d.slug,d.download_count AS "downloadCount",c.name AS "categoryName"
           FROM free_download_items d JOIN free_download_categories c ON c.id=d.category_id
           WHERE d.publication_status='published' ORDER BY d.download_count DESC LIMIT 10`,
        ),
        pool.query(
          `SELECT c.name AS category,COUNT(e.id)::int AS downloads
           FROM free_download_categories c
           LEFT JOIN free_download_items d ON d.category_id=c.id
           LEFT JOIN free_download_events e ON e.download_id=d.id AND e.event_type='download_click'
             AND e.created_at >= NOW() - $1::interval
           GROUP BY c.id ORDER BY downloads DESC,c.name LIMIT 8`,
          [interval],
        ),
        pool.query(
          `SELECT created_at::date AS date,
             COUNT(*) FILTER (WHERE event_type='detail_view')::int AS views,
              COUNT(*) FILTER (WHERE event_type='ad_redirect')::int AS redirects,
             COUNT(*) FILTER (WHERE event_type='unlock')::int AS unlocks,
             COUNT(*) FILTER (WHERE event_type='download_click')::int AS downloads
           FROM free_download_events WHERE created_at >= NOW() - $1::interval
           GROUP BY created_at::date ORDER BY date`,
          [interval],
        ),
      ]);
      const totalBy = (type: string) => Number(events.rows.find((row) => row.eventType === type)?.total || 0);
      const requestsTotal = requestStats.rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
      const detailViews = totalBy("detail_view");
      const downloadClicks = totalBy("download_click");
      res.json({
        range,
        totalDownloads: downloadClicks,
        registeredUsers: Number(registered.rows[0]?.total || 0),
        totalRequests: requestsTotal,
        adRedirectClicks: totalBy("ad_redirect"),
        completedAdvertisingRequirements: totalBy("unlock"),
        actualDownloadClicks: downloadClicks,
        detailViews,
        conversionRate: detailViews ? Math.round(downloadClicks / detailViews * 10000) / 100 : 0,
        requestStatuses: requestStats.rows,
        popularDownloads: popular.rows,
        popularCategories: categories.rows,
        daily: daily.rows,
      });
    } catch (error) {
      console.error("[free-downloads] Analytics failed:", error);
      res.status(503).json({ message: "Download analytics are temporarily unavailable." });
    }
  });
}
