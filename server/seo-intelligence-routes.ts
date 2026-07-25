import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  blogPosts, shopProducts, users, courses, campaigns, pageSeoSettings,
  pwaSettings, appSettings, keywordTrackers,
} from "@shared/schema";
import { eq, desc, sql, and, ilike, count } from "drizzle-orm";

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

      // Compute static pages count (matches sitemap)
      const staticPageCount = 21;
      const totalIndexed = staticPageCount +
        Number(blogCount?.n || 0) +
        Number(productCount?.n || 0) +
        Number(courseCount?.n || 0);

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
        totalConfigurablePages: 16,
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

  // ── POST /api/admin/seo-intelligence/crawl ────────────────────────────────
  app.post("/api/admin/seo-intelligence/crawl", isAuthed, isAdmin, async (req, res) => {
    try {
      const [
        [blogs], [products], [allUsers], [allCourses], [allCampaigns],
      ] = await Promise.all([
        db.select({ n: count() }).from(blogPosts).where(eq(blogPosts.isPublished, true)),
        db.select({ n: count() }).from(shopProducts),
        db.select({ n: count() }).from(users).where(eq(users.userType, "creator")),
        db.select({ n: count() }).from(courses).where(eq(courses.isPublished, true)),
        db.select({ n: count() }).from(campaigns),
      ]);

      const staticCount = 21;
      const blogC = Number(blogs?.n || 0);
      const productC = Number(products?.n || 0);
      const userC = Number(allUsers?.n || 0);
      const courseC = Number(allCourses?.n || 0);
      const campaignC = Number(allCampaigns?.n || 0);
      const totalUrls = staticCount + blogC + productC + userC + courseC;

      // Ping search engines with sitemap
      const domain = "https://taskdrip.online";
      const sitemapUrl = `${domain}/sitemap.xml`;
      const pings: { engine: string; status: string }[] = [];
      try {
        const googlePing = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { signal: AbortSignal.timeout(5000) });
        pings.push({ engine: "Google", status: googlePing.ok ? "✅ Pinged" : `⚠️ ${googlePing.status}` });
      } catch { pings.push({ engine: "Google", status: "⚠️ Timeout" }); }
      try {
        const bingPing = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { signal: AbortSignal.timeout(5000) });
        pings.push({ engine: "Bing", status: bingPing.ok ? "✅ Pinged" : `⚠️ ${bingPing.status}` });
      } catch { pings.push({ engine: "Bing", status: "⚠️ Timeout" }); }

      await setSetting("last_crawl_at", new Date().toISOString());
      await setSetting("last_crawl_total", String(totalUrls));

      res.json({
        success: true,
        totalUrls,
        breakdown: { staticPages: staticCount, blogPosts: blogC, products: productC, creators: userC, courses: courseC, campaigns: campaignC },
        pings,
        sitemapUrl,
        crawledAt: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
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
        }).from(blogPosts).where(eq(blogPosts.isPublished, true)).limit(100),
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

      // Check blog posts
      for (const post of allBlogs) {
        const path = `/blog/${post.slug}`;
        if (!post.metaDescription) issues.push({ type: "missing_meta_desc", severity: "medium", path, detail: `Blog post missing meta description` });
        if (!post.featuredImage) issues.push({ type: "missing_image", severity: "low", path, detail: `Blog post missing featured image` });
        if (!post.title) issues.push({ type: "missing_title", severity: "high", path, detail: `Blog post missing title` });
      }

      const highCount = issues.filter(i => i.severity === "high").length;
      const mediumCount = issues.filter(i => i.severity === "medium").length;
      const lowCount = issues.filter(i => i.severity === "low").length;

      res.json({
        issues,
        summary: { total: issues.length, high: highCount, medium: mediumCount, low: lowCount },
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
