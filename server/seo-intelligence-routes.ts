import type { Express, Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { db } from "./db";
import {
  blogPosts, shopProducts, users, courses, campaigns, pageSeoSettings,
  pwaSettings, appSettings, keywordTrackers,
} from "@shared/schema";
import { eq, desc, sql, and, ilike, count } from "drizzle-orm";
import { getPublicSeoUrls } from "./public-seo-routes";

const SEO_SITE_ORIGIN = "https://taskdrip.online";
const CRAWL_FREQUENCIES = ["hourly", "daily", "weekly"] as const;
type CrawlFrequency = typeof CRAWL_FREQUENCIES[number];

let activeCrawl: Promise<any> | null = null;
let seoSchedulerStarted = false;

// ─── Auth helpers ────────────────────────────────────────────────────────────
const isAuthed = (req: any, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
};
const isAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.userType !== "admin" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

// ─── Key/value helpers ───────────────────────────────────────────────────────
async function getSetting(key: string): Promise<string> {
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return rows[0]?.value || "";
  } catch { return ""; }
}
async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(appSettings).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

function nextCrawlTime(frequency: CrawlFrequency, from = new Date()): Date {
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  if (frequency === "hourly") {
    next.setUTCHours(next.getUTCHours() + 1);
  } else {
    next.setUTCHours(0, 0, 0, 0);
    if (frequency === "daily") {
      next.setUTCDate(next.getUTCDate() + 1);
    } else {
      const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7;
      next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    }
  }
  return next;
}

function plainText(value?: string | null): string {
  return (value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function makeMetaDescription(title: string, ...sources: Array<string | null | undefined>): string {
  const source = sources.map(plainText).find(Boolean) ||
    `${title} — explore practical information, resources, and updates on Taskdrip.`;
  if (source.length <= 160) return source;
  const shortened = source.slice(0, 157).replace(/\s+\S*$/, "").trim();
  return `${shortened || source.slice(0, 157).trim()}…`;
}

async function submitIndexNow(urls: string[]) {
  const [enabled, key] = await Promise.all([
    getSetting("seo_indexnow_enabled"),
    getSetting("seo_indexnow_key"),
  ]);
  if (enabled !== "true") {
    return { status: "disabled", submitted: 0, message: "IndexNow notifications are disabled." };
  }
  if (!key) {
    return { status: "not_configured", submitted: 0, message: "Generate an IndexNow key in crawler settings first." };
  }
  let submitted = 0;
  const failures: string[] = [];
  for (let i = 0; i < urls.length; i += 10000) {
    const batch = urls.slice(i, i + 10000);
    try {
      const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          host: "taskdrip.online",
          key,
          keyLocation: `${SEO_SITE_ORIGIN}/${key}.txt`,
          urlList: batch,
        }),
      });
      if (response.ok) submitted += batch.length;
      else failures.push(`IndexNow returned HTTP ${response.status}`);
    } catch (error: any) {
      failures.push(error?.message || "IndexNow request failed");
    }
  }
  return {
    status: failures.length ? (submitted ? "partial" : "failed") : "submitted",
    submitted,
    message: failures.join("; ") || `${submitted} URL${submitted === 1 ? "" : "s"} submitted to IndexNow.`,
  };
}

async function runSeoCrawl() {
  if (activeCrawl) return activeCrawl;
  activeCrawl = (async () => {
    const startedAt = Date.now();
    const publishedPosts = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      content: blogPosts.content,
      excerpt: blogPosts.excerpt,
      metaDescription: blogPosts.metaDescription,
    }).from(blogPosts).where(eq(blogPosts.isPublished, true));

    let repairedDescriptions = 0;
    for (const post of publishedPosts) {
      if (post.metaDescription?.trim()) continue;
      const description = makeMetaDescription(post.title, post.excerpt, post.content);
      await db.update(blogPosts)
        .set({ metaDescription: description, updatedAt: new Date() })
        .where(eq(blogPosts.id, post.id));
      repairedDescriptions++;
    }

    const urls = await getPublicSeoUrls();
    if (urls.length > 50000) {
      throw new Error(`The sitemap currently has ${urls.length} URLs. A sitemap index is required above 50,000 URLs.`);
    }
    const breakdown = urls.reduce<Record<string, number>>((result, page) => {
      result[page.type] = (result[page.type] || 0) + 1;
      return result;
    }, {});
    const notifications = await submitIndexNow(urls.map((page) => page.url));
    const crawledAt = new Date().toISOString();
    await Promise.all([
      setSetting("last_crawl_at", crawledAt),
      setSetting("last_crawl_total", String(urls.length)),
      setSetting("last_crawl_repaired_descriptions", String(repairedDescriptions)),
      setSetting("last_crawl_duration_ms", String(Date.now() - startedAt)),
      setSetting("last_crawl_error", ""),
    ]);
    return {
      success: true,
      totalUrls: urls.length,
      breakdown,
      repairedDescriptions,
      notifications,
      sitemapUrl: `${SEO_SITE_ORIGIN}/sitemap.xml`,
      crawledAt,
      durationMs: Date.now() - startedAt,
      issues: urls.reduce((total, page) => {
        const title = page.metaTitle || page.title;
        const description = plainText(page.metaDescription);
        return total + (!title ? 1 : 0) + (!description ? 1 : 0) +
          (title.length > 70 ? 1 : 0) + (description.length > 160 ? 1 : 0);
      }, 0),
    };
  })();
  try {
    return await activeCrawl;
  } finally {
    activeCrawl = null;
  }
}

async function scheduledSeoCrawlTick() {
  try {
    const [enabled, frequencyValue, nextValue] = await Promise.all([
      getSetting("seo_crawl_enabled"),
      getSetting("seo_crawl_frequency"),
      getSetting("seo_crawl_next_at"),
    ]);
    const frequency = CRAWL_FREQUENCIES.includes(frequencyValue as CrawlFrequency)
      ? frequencyValue as CrawlFrequency
      : "daily";
    if (enabled !== "true") return;

    const next = nextValue ? new Date(nextValue) : new Date(0);
    if (Number.isNaN(next.getTime()) || next.getTime() > Date.now()) return;
    await setSetting("seo_crawl_next_at", nextCrawlTime(frequency).toISOString());
    await runSeoCrawl();
  } catch (error: any) {
    console.error("[SEO] Scheduled crawl failed:", error);
    await setSetting("last_crawl_error", error?.message || "Scheduled crawl failed").catch(() => {});
  }
}

export function startSeoCrawlerScheduler() {
  if (seoSchedulerStarted) return;
  seoSchedulerStarted = true;
  const timer = setInterval(() => void scheduledSeoCrawlTick(), 30 * 1000);
  timer.unref?.();
  void scheduledSeoCrawlTick();
}

// ─── Gemini helper ───────────────────────────────────────────────────────────
function geminiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || null;
}
async function callGemini(prompt: string, model = "gemini-2.5-flash"): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured. Add it in Secrets.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const json: any = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export function registerSeoIntelligenceRoutes(app: Express) {

  // ── GET /api/admin/seo-intelligence/settings ─────────────────────────────
  app.get("/api/admin/seo-intelligence/settings", isAuthed, isAdmin, async (req, res) => {
    try {
      const [pwsRows] = await db.select().from(pwaSettings).limit(1);
      const clarityId = await getSetting("clarity_id");
      const gscVerification = await getSetting("gsc_verification");
      const analyticsEnabled = await getSetting("analytics_enabled");
      res.json({
        gaTrackingId: pwsRows?.gaTrackingId || "",
        gtmId: pwsRows?.gtmId || "",
        googleSiteVerification: pwsRows?.googleSiteVerification || "",
        bingVerification: pwsRows?.bingVerification || "",
        clarityId,
        gscVerification,
        analyticsEnabled: analyticsEnabled !== "false",
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── PUT /api/admin/seo-intelligence/settings ─────────────────────────────
  app.put("/api/admin/seo-intelligence/settings", isAuthed, isAdmin, async (req, res) => {
    try {
      const { gaTrackingId, gtmId, googleSiteVerification, bingVerification, clarityId, analyticsEnabled } = req.body;

      // Upsert pwa_settings
      const [existing] = await db.select().from(pwaSettings).limit(1);
      const vals: any = { updatedAt: new Date() };
      if (gaTrackingId !== undefined) vals.gaTrackingId = gaTrackingId;
      if (gtmId !== undefined) vals.gtmId = gtmId;
      if (googleSiteVerification !== undefined) vals.googleSiteVerification = googleSiteVerification;
      if (bingVerification !== undefined) vals.bingVerification = bingVerification;

      if (existing) {
        await db.update(pwaSettings).set(vals).where(eq(pwaSettings.id, existing.id));
      } else {
        await db.insert(pwaSettings).values(vals);
      }

      if (clarityId !== undefined) await setSetting("clarity_id", clarityId);
      if (analyticsEnabled !== undefined) await setSetting("analytics_enabled", analyticsEnabled ? "true" : "false");

      // Build and store GA4 head code for the analytics injector
      if (gaTrackingId) {
        const ga4Code = `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaTrackingId}');
</script>`;
        const gtmCode = gtmId ? `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->` : "";

        const clarityCode = clarityId ? `<!-- Microsoft Clarity -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityId}");
</script>` : "";

        const verifyMeta = googleSiteVerification
          ? `<meta name="google-site-verification" content="${googleSiteVerification}" />`
          : "";

        const headCode = [ga4Code, gtmCode, clarityCode, verifyMeta].filter(Boolean).join("\n");
        await setSetting("analytics_head_code", headCode);
      } else if (clarityId) {
        // Only clarity, no GA4
        const clarityCode = `<!-- Microsoft Clarity -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityId}");
</script>`;
        await setSetting("analytics_head_code", clarityCode);
      }

      res.json({ message: "Analytics settings saved" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── GET /api/admin/seo-intelligence/dashboard ────────────────────────────
  app.get("/api/admin/seo-intelligence/dashboard", isAuthed, isAdmin, async (req, res) => {
    try {
      const [
        [blogCount], [productCount], [userCount], [courseCount], [campaignCount],
        seoPages, [pwsRow],
      ] = await Promise.all([
        db.select({ n: count() }).from(blogPosts).where(eq(blogPosts.isPublished, true)),
        db.select({ n: count() }).from(shopProducts),
        db.select({ n: count() }).from(users),
        db.select({ n: count() }).from(courses).where(eq(courses.isPublished, true)),
        db.select({ n: count() }).from(campaigns),
        db.select().from(pageSeoSettings),
        db.select().from(pwaSettings).limit(1),
      ]);

      const clarityId = await getSetting("clarity_id");

      const sitemapUrls = await getPublicSeoUrls();
      const staticPageCount = sitemapUrls.filter((page) => page.type === "page").length;
      const totalIndexed = sitemapUrls.length;

      const seoConfigured = seoPages.filter(p => p.metaTitle || p.metaDescription).length;

      // Issues: pages without meta title or description
      const missingMeta = seoPages.filter(p => !p.metaTitle || !p.metaDescription).length;

      res.json({
        totalIndexed,
        staticPages: staticPageCount,
        blogPosts: Number(blogCount?.n || 0),
        products: Number(productCount?.n || 0),
        courses: Number(courseCount?.n || 0),
        campaigns: Number(campaignCount?.n || 0),
        users: Number(userCount?.n || 0),
        seoConfiguredPages: seoConfigured,
        totalConfigurablePages: staticPageCount,
        missingMeta,
        ga4Connected: !!(pwsRow?.gaTrackingId),
        clarityConnected: !!clarityId,
        ga4Id: pwsRow?.gaTrackingId || null,
        clarityId: clarityId || null,
        googleVerification: pwsRow?.googleSiteVerification || null,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Crawler schedule and IndexNow settings ────────────────────────────────
  app.get("/api/admin/seo-intelligence/crawler-settings", isAuthed, isAdmin, async (_req, res) => {
    try {
      const [enabled, frequency, indexNowEnabled, indexNowKey, nextCrawlAt, lastCrawlAt, lastCrawlTotal, lastCrawlError, repaired] = await Promise.all([
        getSetting("seo_crawl_enabled"),
        getSetting("seo_crawl_frequency"),
        getSetting("seo_indexnow_enabled"),
        getSetting("seo_indexnow_key"),
        getSetting("seo_crawl_next_at"),
        getSetting("last_crawl_at"),
        getSetting("last_crawl_total"),
        getSetting("last_crawl_error"),
        getSetting("last_crawl_repaired_descriptions"),
      ]);
      res.json({
        enabled: enabled === "true",
        frequency: CRAWL_FREQUENCIES.includes(frequency as CrawlFrequency) ? frequency : "daily",
        indexNowEnabled: indexNowEnabled === "true",
        indexNowKeyConfigured: !!indexNowKey,
        indexNowKeyLocation: indexNowKey ? `${SEO_SITE_ORIGIN}/${indexNowKey}.txt` : null,
        nextCrawlAt: nextCrawlAt || null,
        lastCrawlAt: lastCrawlAt || null,
        lastCrawlTotal: lastCrawlTotal ? Number(lastCrawlTotal) : 0,
        lastCrawlError: lastCrawlError || null,
        repairedDescriptions: repaired ? Number(repaired) : 0,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/seo-intelligence/crawler-settings", isAuthed, isAdmin, async (req, res) => {
    try {
      const { enabled, frequency, indexNowEnabled, generateIndexNowKey } = req.body || {};
      const currentFrequency = await getSetting("seo_crawl_frequency");
      const nextFrequency = (frequency ?? currentFrequency) || "daily";
      if (!CRAWL_FREQUENCIES.includes(nextFrequency)) {
        return res.status(400).json({ message: "frequency must be hourly, daily, or weekly" });
      }
      if (enabled !== undefined && typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      if (indexNowEnabled !== undefined && typeof indexNowEnabled !== "boolean") {
        return res.status(400).json({ message: "indexNowEnabled must be a boolean" });
      }

      const currentEnabled = (await getSetting("seo_crawl_enabled")) === "true";
      await Promise.all([
        setSetting("seo_crawl_frequency", nextFrequency),
        enabled !== undefined ? setSetting("seo_crawl_enabled", String(enabled)) : Promise.resolve(),
        indexNowEnabled !== undefined ? setSetting("seo_indexnow_enabled", String(indexNowEnabled)) : Promise.resolve(),
      ]);
      const currentKey = await getSetting("seo_indexnow_key");
      if (generateIndexNowKey || (indexNowEnabled === true && !currentKey)) {
        await setSetting("seo_indexnow_key", randomBytes(16).toString("hex"));
      }
      if (enabled === true && (!currentEnabled || nextFrequency !== currentFrequency)) {
        await setSetting("seo_crawl_next_at", nextCrawlTime(nextFrequency).toISOString());
      } else if (enabled === false) {
        await setSetting("seo_crawl_next_at", "");
      } else if (currentEnabled && nextFrequency !== currentFrequency) {
        await setSetting("seo_crawl_next_at", nextCrawlTime(nextFrequency).toISOString());
      }
      const [savedEnabled, savedFrequency, savedIndexNowEnabled, savedKey, nextCrawlAt] = await Promise.all([
        getSetting("seo_crawl_enabled"),
        getSetting("seo_crawl_frequency"),
        getSetting("seo_indexnow_enabled"),
        getSetting("seo_indexnow_key"),
        getSetting("seo_crawl_next_at"),
      ]);
      res.json({
        enabled: savedEnabled === "true",
        frequency: savedFrequency || "daily",
        indexNowEnabled: savedIndexNowEnabled === "true",
        indexNowKeyConfigured: !!savedKey,
        indexNowKeyLocation: savedKey ? `${SEO_SITE_ORIGIN}/${savedKey}.txt` : null,
        nextCrawlAt: nextCrawlAt || null,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/seo-intelligence/crawler-urls", isAuthed, isAdmin, async (_req, res) => {
    try {
      const urls = await getPublicSeoUrls();
      const normalized = urls.map((page) => {
        const title = (page.metaTitle || page.title || "").trim();
        const description = plainText(page.metaDescription);
        const warnings = [
          !title && "Missing title",
          title.length > 70 && "Title exceeds 70 characters",
          !description && "Missing meta description",
          description.length > 160 && "Meta description exceeds 160 characters",
        ].filter(Boolean);
        return { ...page, warnings };
      });
      res.json({ urls: normalized, totalUrls: normalized.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── Run a real database-backed crawl and refresh the live sitemap ─────────
  app.post("/api/admin/seo-intelligence/crawl", isAuthed, isAdmin, async (_req, res) => {
    try {
      const result = await runSeoCrawl();
      res.json(result);
    } catch (e: any) {
      await setSetting("last_crawl_error", e.message || "Crawl failed").catch(() => {});
      res.status(500).json({ message: e.message || "Crawl failed" });
    }
  });

  app.post("/api/admin/seo-intelligence/crawler-index", isAuthed, isAdmin, async (req, res) => {
    try {
      const requested = req.body?.urls;
      if (!Array.isArray(requested) || requested.length < 1 || requested.length > 10000 ||
        requested.some((url: unknown) => typeof url !== "string")) {
        return res.status(400).json({ message: "Provide between 1 and 10,000 URLs to submit." });
      }
      const currentUrls = new Set((await getPublicSeoUrls()).map((page) => page.url));
      const urls = Array.from(new Set(requested as string[]));
      const invalid = urls.filter((url) => !currentUrls.has(url));
      if (invalid.length) {
        return res.status(400).json({
          message: `${invalid.length} URL${invalid.length === 1 ? " is" : "s are"} not in the current public sitemap and cannot be submitted.`,
        });
      }
      res.json({ ...await submitIndexNow(urls), requested: urls.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "IndexNow submission failed" });
    }
  });

  // ── GET /api/admin/seo-intelligence/audit ────────────────────────────────
  app.get("/api/admin/seo-intelligence/audit", isAuthed, isAdmin, async (req, res) => {
    try {
      const [seoPages, allBlogs] = await Promise.all([
        db.select().from(pageSeoSettings),
        db.select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          metaDescription: blogPosts.metaDescription,
          featuredImage: blogPosts.featuredImage,
          isPublished: blogPosts.isPublished,
          content: blogPosts.content,
        }).from(blogPosts).where(eq(blogPosts.isPublished, true)),
      ]);

      const PAGES = [
        "home","tasks","p2p-hub","shop","influencers","brands","about","blog",
        "breedskool","leaderboard","advertise","contact","tdrip","signup","login","feed",
      ];

      const seoMap = new Map(seoPages.map(p => [p.pageSlug, p]));

      const issues: any[] = [];

      // Check static pages
      for (const slug of PAGES) {
        const s = seoMap.get(slug);
        const path = slug === "home" ? "/" : `/${slug}`;
        if (!s) {
          issues.push({ type: "missing_meta", severity: "high", path, detail: "No SEO settings configured" });
          continue;
        }
        if (!s.metaTitle) issues.push({ type: "missing_meta_title", severity: "high", path, detail: "Missing meta title" });
        else if (s.metaTitle.length > 60) issues.push({ type: "long_meta_title", severity: "medium", path, detail: `Meta title too long (${s.metaTitle.length} chars, max 60)` });
        if (!s.metaDescription) issues.push({ type: "missing_meta_desc", severity: "high", path, detail: "Missing meta description" });
        else if (s.metaDescription.length > 160) issues.push({ type: "long_meta_desc", severity: "medium", path, detail: `Meta description too long (${s.metaDescription.length} chars, max 160)` });
        if (!s.ogTitle && !s.ogDescription) issues.push({ type: "missing_og", severity: "medium", path, detail: "Missing Open Graph tags" });
      }

      // Check every published article for editorial and on-page SEO gaps.
      let totalWords = 0;
      let longFormTargetCount = 0;
      let postsWithImages = 0;
      let postsWithInternalLinks = 0;
      let postsWithExternalLinks = 0;
      let imagesMissingAlt = 0;
      for (const post of allBlogs) {
        const path = `/blog/${post.slug}`;
        const plainText = (post.content || "")
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;|&#160;/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        const wordCount = plainText ? plainText.split(" ").length : 0;
        totalWords += wordCount;
        if (wordCount >= 3000) longFormTargetCount++;
        if (post.metaDescription && post.metaDescription.length > 160) {
          issues.push({ type: "long_meta_desc", severity: "low", path, detail: `Meta description is ${post.metaDescription.length} characters; keep it concise and accurate.` });
        }
        if (!post.metaDescription) issues.push({ type: "missing_meta_desc", severity: "medium", path, detail: "Blog post missing meta description" });
        if (!post.featuredImage) issues.push({ type: "missing_image", severity: "low", path, detail: "Blog post missing a featured image" });
        else postsWithImages++;
        if (!post.title) issues.push({ type: "missing_title", severity: "high", path, detail: `Blog post missing title` });
        const headings = (post.content || "").match(/<h[23]\b/gi) || [];
        if (headings.length === 0) {
          issues.push({ type: "missing_section_headings", severity: "medium", path, detail: "Add descriptive section headings so readers can scan the article." });
        }
        const links = Array.from((post.content || "").matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi), match => match[1]);
        const internalLinks = links.filter(href => href.startsWith("/") || /^https?:\/\/([^/]+\.)?taskdrip\.online(?:\/|$)/i.test(href));
        const externalLinks = links.filter(href => /^https?:\/\//i.test(href) && !/^https?:\/\/([^/]+\.)?taskdrip\.online(?:\/|$)/i.test(href));
        if (internalLinks.length) postsWithInternalLinks++;
        else issues.push({ type: "no_internal_links", severity: "low", path, detail: "Add a contextual link to a genuinely related page or article on Taskdrip." });
        if (externalLinks.length) postsWithExternalLinks++;
        else issues.push({ type: "no_external_sources", severity: "low", path, detail: "Link to relevant primary or authoritative sources for factual claims; do not add unrelated links." });
        const images = Array.from((post.content || "").matchAll(/<img\b([^>]*)>/gi), match => match[1]);
        const missingAlt = images.filter(attrs => !/\balt\s*=\s*["'][^"']+["']/i.test(attrs)).length;
        imagesMissingAlt += missingAlt;
        if (missingAlt) {
          issues.push({ type: "missing_alt_text", severity: "low", path, detail: `${missingAlt} article image${missingAlt === 1 ? "" : "s"} need descriptive alt text.` });
        }
        if (wordCount < 3000) {
          issues.push({
            type: "below_requested_long_form_target",
            severity: "low",
            path,
            detail: `${wordCount.toLocaleString()} words; below your requested 3,000-word editorial target. Google does not require a fixed word count—expand only with useful, accurate material.`,
          });
        }
      }

      const highCount = issues.filter(i => i.severity === "high").length;
      const mediumCount = issues.filter(i => i.severity === "medium").length;
      const lowCount = issues.filter(i => i.severity === "low").length;

      res.json({
        issues,
        summary: { total: issues.length, high: highCount, medium: mediumCount, low: lowCount },
        contentAudit: {
          publishedArticles: allBlogs.length,
          averageWordCount: allBlogs.length ? Math.round(totalWords / allBlogs.length) : 0,
          meetingRequestedLongFormTarget: longFormTargetCount,
          withFeaturedImage: postsWithImages,
          withInternalLinks: postsWithInternalLinks,
          withExternalSources: postsWithExternalLinks,
          imagesMissingAlt,
        },
        auditedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── GET /api/admin/seo-intelligence/keywords ─────────────────────────────
  app.get("/api/admin/seo-intelligence/keywords", isAuthed, isAdmin, async (req, res) => {
    try {
      const rows = await db.select().from(keywordTrackers).orderBy(desc(keywordTrackers.createdAt)).limit(100);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── POST /api/admin/seo-intelligence/keywords ────────────────────────────
  app.post("/api/admin/seo-intelligence/keywords", isAuthed, isAdmin, async (req, res) => {
    try {
      const { keyword } = req.body;
      if (!keyword) return res.status(400).json({ message: "keyword required" });
      const [row] = await db.insert(keywordTrackers).values({
        userId: (req as any).user.id,
        keyword: keyword.trim(),
        isActive: true,
        createdAt: new Date(),
      }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── DELETE /api/admin/seo-intelligence/keywords/:id ──────────────────────
  app.delete("/api/admin/seo-intelligence/keywords/:id", isAuthed, isAdmin, async (req, res) => {
    try {
      await db.delete(keywordTrackers).where(eq(keywordTrackers.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── POST /api/admin/seo-intelligence/content-studio ─────────────────────
  app.post("/api/admin/seo-intelligence/content-studio", isAuthed, isAdmin, async (req, res) => {
    try {
      const { type, topic, keywords, url } = req.body;
      if (!topic) return res.status(400).json({ message: "topic required" });

      const kw = keywords || topic;
      let prompt = "";

      switch (type) {
        case "brief":
          prompt = `You are an expert SEO content strategist. Generate a comprehensive SEO content brief for the topic: "${topic}". Include: 1) Target keywords (primary + secondary), 2) Search intent, 3) Recommended word count, 4) Article outline with H2/H3 headings, 5) Key talking points per section, 6) Internal linking opportunities, 7) Recommended meta title and description. Format clearly with sections.`;
          break;
        case "title":
          prompt = `Generate 10 SEO-optimized title variations for an article about: "${topic}". Keywords to include: ${kw}. Make titles compelling, under 60 chars, with click-worthy power words. Format as numbered list.`;
          break;
        case "meta":
          prompt = `Generate 5 meta description variations for a page about: "${topic}". Keywords: ${kw}. Each should be 150-160 characters, include a call to action, and entice clicks from search results. Format as numbered list with character count.`;
          break;
        case "faq":
          prompt = `Generate 10 SEO-rich FAQ questions and detailed answers for the topic: "${topic}". Keywords: ${kw}. Focus on long-tail questions people actually search. Format as Q: / A: pairs ready for FAQ schema markup.`;
          break;
        case "outline":
          prompt = `Create a detailed blog article outline about: "${topic}". Keywords: ${kw}. Include: H1 title, intro hook, 5-7 H2 sections with 3-4 H3 sub-points each, conclusion with CTA. Also suggest 3 internal linking anchor texts.`;
          break;
        case "internal_links":
          prompt = `Suggest 8 internal linking opportunities for a page about: "${topic}" on a platform called Taskdrip (a web3 influencer/creator monetization platform). For each, provide: anchor text, suggested target page category, and why it's relevant. Format as numbered list.`;
          break;
        default:
          prompt = `Generate SEO content for: "${topic}". Keywords: ${kw}.`;
      }

      const result = await callGemini(prompt);
      res.json({ result, type, topic });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── GET /api/admin/seo-intelligence/competitors ──────────────────────────
  app.get("/api/admin/seo-intelligence/competitors", isAuthed, isAdmin, async (req, res) => {
    try {
      const stored = await getSetting("seo_competitors");
      const competitors = stored ? JSON.parse(stored) : [
        { name: "Fiverr", domain: "fiverr.com", category: "Freelance marketplace" },
        { name: "Influencer.co", domain: "influencer.co", category: "Influencer marketing" },
        { name: "Tribe", domain: "tribegroup.co", category: "Creator marketplace" },
        { name: "Upwork", domain: "upwork.com", category: "Freelance platform" },
      ];
      res.json(competitors);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── PUT /api/admin/seo-intelligence/competitors ───────────────────────────
  app.put("/api/admin/seo-intelligence/competitors", isAuthed, isAdmin, async (req, res) => {
    try {
      const { competitors } = req.body;
      await setSetting("seo_competitors", JSON.stringify(competitors));
      res.json({ message: "Competitors saved" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── GET /api/admin/seo-intelligence/crawl-status ─────────────────────────
  app.get("/api/admin/seo-intelligence/crawl-status", isAuthed, isAdmin, async (req, res) => {
    try {
      const lastCrawlAt = await getSetting("last_crawl_at");
      const lastCrawlTotal = await getSetting("last_crawl_total");
      res.json({
        lastCrawlAt: lastCrawlAt || null,
        lastCrawlTotal: lastCrawlTotal ? Number(lastCrawlTotal) : 0,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}
