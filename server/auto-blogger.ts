import type { Express, Response, NextFunction } from "express";
import { db } from "./db";
import { autoBlogSources, autoBlogJobs, autoBloggerSettings, blogPosts } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import Parser from "rss-parser";
import OpenAI from "openai";
import { createRequire } from "module";
const nodeRequire = createRequire(import.meta.url);

const rssParser = new Parser({ timeout: 12000 });

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

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
  } catch {}
  return null;
}

async function getTranscript(url: string): Promise<string> {
  const id = youtubeIdFromUrl(url);
  if (!id) return "";
  try {
    const mod: any = nodeRequire("youtube-transcript");
    const YT = mod.YoutubeTranscript || mod.default || mod;
    const items: any[] = await YT.fetchTranscript(id);
    return items.map((i: any) => i.text).join(" ").slice(0, 8000);
  } catch {
    return "";
  }
}

async function unsplashImage(query: string): Promise<string | null> {
  // Free, no-API-key Unsplash source URL
  return `https://source.unsplash.com/1200x630/?${encodeURIComponent(query)}`;
}

// ─── Source pullers ──────────────────────────────────────────────────────────

async function pullRss(url: string, limit = 5) {
  const feed = await rssParser.parseURL(url);
  return (feed.items || []).slice(0, limit).map((it: any) => ({
    title: it.title || "",
    link: it.link || "",
    snippet: (it.contentSnippet || it.content || "").slice(0, 4000),
  }));
}

async function pullReddit(subreddit: string, limit = 5) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": "Taskdrip/1.0 AutoBlogger" } });
  if (!res.ok) return [];
  const json: any = await res.json();
  return (json?.data?.children || []).map((c: any) => ({
    title: c.data.title,
    link: `https://reddit.com${c.data.permalink}`,
    snippet: (c.data.selftext || "").slice(0, 4000),
  }));
}

async function pullHackerNews(limit = 5) {
  const ids: number[] = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json").then(r => r.json());
  const top = ids.slice(0, limit);
  const items = await Promise.all(top.map(async (id) => {
    const item: any = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json());
    return { title: item?.title || "", link: item?.url || `https://news.ycombinator.com/item?id=${id}`, snippet: item?.text || "" };
  }));
  return items.filter(i => i.title);
}

// ─── AI rewriting ────────────────────────────────────────────────────────────

interface RewriteResult {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  metaDescription: string;
  seoKeywords: string;
  tags: string[];
  category: string;
  readingTime: number;
  featuredImage: string;
}

async function rewriteToBlog(opts: {
  sourceTitle: string;
  sourceContent: string;
  sourceUrl?: string;
  category?: string;
  toneStyle?: string;
  minWords?: number;
  maxWords?: number;
  model?: string;
  imageProvider?: string;
}): Promise<RewriteResult> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY not configured. Add it in Secrets to enable AI rewriting.");

  const { sourceTitle, sourceContent, sourceUrl = "", category = "Tech", toneStyle = "informative", minWords = 700, maxWords = 1400, model = "gpt-4o-mini", imageProvider = "unsplash" } = opts;

  const sys = `You are an expert SEO content writer. You rewrite source material into 100% original, plagiarism-free, human-sounding articles that rank on Google. You follow SEO best practices: a compelling H1, an engaging intro hook, scannable H2/H3 subheadings, short paragraphs (2-3 sentences), bullet lists where useful, keyword-rich but natural prose, and a clear conclusion with a CTA. Output valid JSON only.`;

  const user = `Rewrite the following into an original blog article between ${minWords} and ${maxWords} words.

CRITICAL RULES:
- Tone: ${toneStyle}.
- 100% original: do NOT copy phrases from the source. Paraphrase fully.
- Sound human and natural. Use varied sentence length, contractions, and a conversational voice.
- Use HTML formatting in "content": <h2>, <h3>, <p>, <ul>, <li>, <strong>. NO <html>, <head>, or <body>.
- Include 4-6 H2 sections.
- Add a meta description (max 160 chars), 5-10 SEO keywords, and 4-6 tags.
- Pick a category from: Tech, Crypto, AI, Marketing, Business, Lifestyle, News.
- Do not mention the original source verbatim, but you can synthesize key facts faithfully.

Source title: ${sourceTitle}
Source URL: ${sourceUrl}
Source content / context:
"""
${sourceContent.slice(0, 8000)}
"""

Return JSON with keys exactly:
{
  "title": "...",
  "excerpt": "...",        // 2-3 sentence summary
  "metaDescription": "...",
  "seoKeywords": "kw1, kw2, kw3, ...",
  "tags": ["tag1","tag2","tag3","tag4"],
  "category": "Tech|Crypto|AI|Marketing|Business|Lifestyle|News",
  "content": "<h2>...</h2><p>...</p>...",
  "imageQuery": "2-4 word search phrase for a header image"
}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    temperature: 0.85,
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  const title: string = parsed.title || sourceTitle;
  const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);
  const wordCount = (parsed.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(2, Math.round(wordCount / 200));
  const imgQuery = parsed.imageQuery || category || "abstract";
  const featuredImage = imageProvider === "none" ? "" : (await unsplashImage(imgQuery)) || "";

  return {
    title,
    slug,
    excerpt: parsed.excerpt || "",
    content: parsed.content || "",
    metaDescription: (parsed.metaDescription || "").slice(0, 160),
    seoKeywords: parsed.seoKeywords || "",
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    category: parsed.category || category,
    readingTime,
    featuredImage,
  };
}

// ─── Settings helper ─────────────────────────────────────────────────────────

async function getSettings() {
  const [s] = await db.select().from(autoBloggerSettings).where(eq(autoBloggerSettings.id, "singleton"));
  if (s) return s;
  const [created] = await db.insert(autoBloggerSettings).values({ id: "singleton" }).returning();
  return created;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerAutoBloggerRoutes(app: Express) {
  // Settings
  app.get("/api/admin/auto-blogger/settings", isAuthed, isAdmin, async (req, res) => {
    res.json(await getSettings());
  });

  app.patch("/api/admin/auto-blogger/settings", isAuthed, isAdmin, async (req: any, res) => {
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates.id;
    const [updated] = await db.update(autoBloggerSettings).set(updates).where(eq(autoBloggerSettings.id, "singleton")).returning();
    res.json(updated || (await getSettings()));
  });

  // Sources CRUD
  app.get("/api/admin/auto-blogger/sources", isAuthed, isAdmin, async (req, res) => {
    const rows = await db.select().from(autoBlogSources).orderBy(desc(autoBlogSources.createdAt));
    res.json(rows);
  });

  app.post("/api/admin/auto-blogger/sources", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const { name, type, url, category, isActive } = req.body || {};
      if (!name || !type) return res.status(400).json({ message: "name and type required" });
      const [row] = await db.insert(autoBlogSources).values({
        name: String(name).trim(),
        type: String(type),
        url: url ? String(url) : null,
        category: category || null,
        isActive: isActive !== false,
      }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/admin/auto-blogger/sources/:id", isAuthed, isAdmin, async (req: any, res) => {
    const updates = { ...req.body };
    delete updates.id;
    const [row] = await db.update(autoBlogSources).set(updates).where(eq(autoBlogSources.id, req.params.id)).returning();
    res.json(row);
  });

  app.delete("/api/admin/auto-blogger/sources/:id", isAuthed, isAdmin, async (req: any, res) => {
    await db.delete(autoBlogSources).where(eq(autoBlogSources.id, req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/admin/auto-blogger/sources/seed", isAuthed, isAdmin, async (req: any, res) => {
    const seeds = [
      { name: "TechCrunch", type: "rss", url: "https://techcrunch.com/feed/", category: "Tech" },
      { name: "The Verge", type: "rss", url: "https://www.theverge.com/rss/index.xml", category: "Tech" },
      { name: "CoinDesk", type: "rss", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "Crypto" },
      { name: "Cointelegraph", type: "rss", url: "https://cointelegraph.com/rss", category: "Crypto" },
      { name: "Hacker News (Top)", type: "hackernews", url: null, category: "Tech" },
      { name: "r/technology", type: "reddit", url: "technology", category: "Tech" },
      { name: "r/CryptoCurrency", type: "reddit", url: "CryptoCurrency", category: "Crypto" },
      { name: "r/artificial", type: "reddit", url: "artificial", category: "AI" },
    ];
    for (const s of seeds) {
      const [exists] = await db.select().from(autoBlogSources).where(eq(autoBlogSources.name, s.name));
      if (!exists) await db.insert(autoBlogSources).values(s as any);
    }
    res.json({ ok: true });
  });

  // Discover ideas from a source (returns candidate items without rewriting)
  app.post("/api/admin/auto-blogger/sources/:id/discover", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const [source] = await db.select().from(autoBlogSources).where(eq(autoBlogSources.id, req.params.id));
      if (!source) return res.status(404).json({ message: "Not found" });
      const limit = Math.min(20, Number(req.body?.limit) || 5);
      let items: any[] = [];
      if (source.type === "rss" && source.url) items = await pullRss(source.url, limit);
      else if (source.type === "reddit" && source.url) items = await pullReddit(source.url, limit);
      else if (source.type === "hackernews") items = await pullHackerNews(limit);
      else return res.status(400).json({ message: "Unsupported source type" });
      await db.update(autoBlogSources).set({ lastRunAt: new Date() }).where(eq(autoBlogSources.id, source.id));
      res.json({ source: source.name, category: source.category, items });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Generate a blog post job (rewrite via OpenAI) — accepts ad-hoc title/url/content
  app.post("/api/admin/auto-blogger/generate", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const { sourceTitle, sourceContent, sourceUrl, sourceId, category, autoPublish, includeTranscript } = req.body || {};
      if (!sourceTitle) return res.status(400).json({ message: "sourceTitle required" });
      const settings = await getSettings();
      const [job] = await db.insert(autoBlogJobs).values({
        sourceId: sourceId || null,
        sourceTitle,
        sourceUrl: sourceUrl || null,
        sourceContent: sourceContent || null,
        category: category || null,
        status: "processing",
        createdBy: req.user.id,
      }).returning();

      // Process synchronously but with try/catch so we always return a job
      try {
        let combinedContent = sourceContent || "";
        if (includeTranscript && sourceUrl) {
          const t = await getTranscript(sourceUrl);
          if (t) combinedContent = `${combinedContent}\n\n[Video transcript]\n${t}`;
        }
        const result = await rewriteToBlog({
          sourceTitle,
          sourceContent: combinedContent,
          sourceUrl: sourceUrl || "",
          category: category || "Tech",
          toneStyle: settings.toneStyle || "informative",
          minWords: settings.minWords || 700,
          maxWords: settings.maxWords || 1400,
          model: settings.model || "gpt-4o-mini",
          imageProvider: settings.imageProvider || "unsplash",
        });

        const shouldPublish = autoPublish !== undefined ? !!autoPublish : settings.autoPublish;
        const [post] = await db.insert(blogPosts).values({
          title: result.title,
          slug: result.slug,
          content: result.content,
          excerpt: result.excerpt,
          featuredImage: result.featuredImage || null,
          category: result.category,
          tags: result.tags,
          authorId: settings.defaultAuthorId || req.user.id,
          isPublished: shouldPublish,
          publishedAt: shouldPublish ? new Date() : null,
          metaDescription: result.metaDescription,
          seoKeywords: result.seoKeywords,
          readingTime: result.readingTime,
        }).returning();

        const [updatedJob] = await db.update(autoBlogJobs).set({
          status: shouldPublish ? "published" : "completed",
          blogPostId: post.id,
          completedAt: new Date(),
        }).where(eq(autoBlogJobs.id, job.id)).returning();

        return res.json({ job: updatedJob, post });
      } catch (err: any) {
        await db.update(autoBlogJobs).set({
          status: "failed",
          errorMessage: err.message?.slice(0, 500) || "Unknown error",
          completedAt: new Date(),
        }).where(eq(autoBlogJobs.id, job.id));
        return res.status(500).json({ message: err.message, jobId: job.id });
      }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Bulk-discover-and-generate from a source
  app.post("/api/admin/auto-blogger/run-source/:id", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const [source] = await db.select().from(autoBlogSources).where(eq(autoBlogSources.id, req.params.id));
      if (!source) return res.status(404).json({ message: "Not found" });
      const limit = Math.min(5, Number(req.body?.limit) || 2);
      let items: any[] = [];
      if (source.type === "rss" && source.url) items = await pullRss(source.url, limit);
      else if (source.type === "reddit" && source.url) items = await pullReddit(source.url, limit);
      else if (source.type === "hackernews") items = await pullHackerNews(limit);
      else return res.status(400).json({ message: "Unsupported source type" });

      const settings = await getSettings();
      const created: any[] = [];
      for (const item of items) {
        try {
          const result = await rewriteToBlog({
            sourceTitle: item.title,
            sourceContent: item.snippet || item.title,
            sourceUrl: item.link,
            category: source.category || "Tech",
            toneStyle: settings.toneStyle || "informative",
            minWords: settings.minWords || 700,
            maxWords: settings.maxWords || 1400,
            model: settings.model || "gpt-4o-mini",
            imageProvider: settings.imageProvider || "unsplash",
          });
          const [post] = await db.insert(blogPosts).values({
            title: result.title,
            slug: result.slug,
            content: result.content,
            excerpt: result.excerpt,
            featuredImage: result.featuredImage || null,
            category: result.category,
            tags: result.tags,
            authorId: settings.defaultAuthorId || req.user.id,
            isPublished: settings.autoPublish || false,
            publishedAt: settings.autoPublish ? new Date() : null,
            metaDescription: result.metaDescription,
            seoKeywords: result.seoKeywords,
            readingTime: result.readingTime,
          }).returning();
          await db.insert(autoBlogJobs).values({
            sourceId: source.id,
            sourceTitle: item.title,
            sourceUrl: item.link,
            sourceContent: item.snippet,
            category: source.category,
            status: settings.autoPublish ? "published" : "completed",
            blogPostId: post.id,
            createdBy: req.user.id,
            completedAt: new Date(),
          });
          created.push({ title: post.title, slug: post.slug, id: post.id });
        } catch (err: any) {
          await db.insert(autoBlogJobs).values({
            sourceId: source.id,
            sourceTitle: item.title,
            sourceUrl: item.link,
            category: source.category,
            status: "failed",
            errorMessage: err.message?.slice(0, 500),
            createdBy: req.user.id,
            completedAt: new Date(),
          });
        }
      }
      await db.update(autoBlogSources).set({ lastRunAt: new Date() }).where(eq(autoBlogSources.id, source.id));
      res.json({ source: source.name, created });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Jobs list
  app.get("/api/admin/auto-blogger/jobs", isAuthed, isAdmin, async (req, res) => {
    const rows = await db.select().from(autoBlogJobs).orderBy(desc(autoBlogJobs.createdAt)).limit(100);
    res.json(rows);
  });

  // Quick health
  app.get("/api/admin/auto-blogger/health", isAuthed, isAdmin, async (req, res) => {
    res.json({
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      youtubeApiConfigured: !!process.env.YOUTUBE_API_KEY,
    });
  });
}
