import type { Express, Response, NextFunction } from "express";
import { db } from "./db";
import { autoBlogSources, autoBlogJobs, autoBloggerSettings, blogPosts } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
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

function geminiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || null;
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
    return items.map((i: any) => i.text).join(" ").slice(0, 12000);
  } catch {
    return "";
  }
}

function youtubeEmbedHtml(url: string): string {
  const id = youtubeIdFromUrl(url);
  if (!id) return "";
  return `<div class="video-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:1.5rem 0;"><iframe src="https://www.youtube.com/embed/${id}" title="YouTube video" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>`;
}

// ─── Image providers (free) ──────────────────────────────────────────────────

async function generateImage(query: string, provider: string): Promise<string> {
  const q = encodeURIComponent(query.slice(0, 180) || "abstract");
  if (provider === "none") return "";
  if (provider === "unsplash") return `https://source.unsplash.com/1200x630/?${q}`;
  if (provider === "gemini") {
    const img = await geminiImage(query);
    if (img) return img;
    // fallback to pollinations if gemini key missing/quota
    return `https://image.pollinations.ai/prompt/${q}?width=1200&height=630&nologo=true`;
  }
  // default: pollinations (free, no key)
  return `https://image.pollinations.ai/prompt/${q}?width=1200&height=630&nologo=true`;
}

async function geminiImage(prompt: string): Promise<string | null> {
  const key = geminiKey();
  if (!key) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;
    const body = {
      contents: [{ parts: [{ text: `High quality 1200x630 cinematic blog header image. Subject: ${prompt}` }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    };
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return null;
    const j: any = await r.json();
    const parts = j?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      const data = p?.inlineData?.data;
      const mime = p?.inlineData?.mimeType || "image/png";
      if (data) return `data:${mime};base64,${data}`;
    }
  } catch {}
  return null;
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

async function pullYoutube(channelOrPlaylistUrl: string, limit = 5) {
  // Use YouTube RSS feed (no API key required) for channels and playlists
  let feedUrl = "";
  try {
    const u = new URL(channelOrPlaylistUrl);
    if (u.searchParams.get("channel_id")) feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${u.searchParams.get("channel_id")}`;
    else if (u.pathname.includes("/channel/")) feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${u.pathname.split("/channel/")[1].split("/")[0]}`;
    else if (u.pathname.includes("/playlist")) feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${u.searchParams.get("list")}`;
    else feedUrl = channelOrPlaylistUrl; // assume already a feed
  } catch {
    feedUrl = channelOrPlaylistUrl;
  }
  const feed = await rssParser.parseURL(feedUrl);
  return (feed.items || []).slice(0, limit).map((it: any) => ({
    title: it.title || "",
    link: it.link || "",
    snippet: (it.contentSnippet || it.content || it["media:group"]?.["media:description"] || "").slice(0, 4000),
  }));
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

function buildPrompt(opts: { sourceTitle: string; sourceContent: string; sourceUrl: string; category: string; toneStyle: string; minWords: number; maxWords: number; }) {
  const { sourceTitle, sourceContent, sourceUrl, category, toneStyle, minWords, maxWords } = opts;
  const sys = `You are an expert SEO content writer. You rewrite source material into 100% original, plagiarism-free, human-sounding articles that rank on Google. You follow SEO best practices: a compelling H1, an engaging intro hook, scannable H2/H3 subheadings, short paragraphs (2-3 sentences), bullet lists where useful, keyword-rich but natural prose, and a clear conclusion with a CTA. Output valid JSON only, no markdown fences.`;
  const user = `Rewrite the following into an original blog article between ${minWords} and ${maxWords} words.

CRITICAL RULES:
- Tone: ${toneStyle}.
- 100% original: do NOT copy phrases from the source. Paraphrase fully.
- Sound human and natural. Use varied sentence length, contractions, and a conversational voice.
- Use HTML formatting in "content": <h2>, <h3>, <p>, <ul>, <li>, <strong>, <blockquote>. NO <html>, <head>, or <body>.
- Include 4-6 H2 sections plus a conclusion.
- Add a meta description (max 160 chars), 5-10 SEO keywords, and 4-6 tags.
- Pick a category from: Tech, Crypto, AI, Marketing, Business, Lifestyle, News.
- Suggest TWO supporting in-body images by giving short search phrases.
- Preferred default category: ${category}.

Source title: ${sourceTitle}
Source URL: ${sourceUrl}
Source content / context:
"""
${sourceContent.slice(0, 10000)}
"""

Return JSON with exactly these keys:
{
  "title": "...",
  "excerpt": "...",
  "metaDescription": "...",
  "seoKeywords": "kw1, kw2, kw3, ...",
  "tags": ["tag1","tag2","tag3","tag4"],
  "category": "Tech|Crypto|AI|Marketing|Business|Lifestyle|News",
  "content": "<h2>...</h2><p>...</p>...",
  "imageQuery": "2-4 word search phrase for the header image",
  "inlineImageQueries": ["phrase 1","phrase 2"]
}`;
  return { sys, user };
}

function tryParseJson(raw: string): any {
  if (!raw) return {};
  let txt = raw.trim();
  // strip code fences
  txt = txt.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(txt); } catch {}
  // try to find first { ... } block
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return {};
}

async function callGemini(model: string, sys: string, user: string): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured. Add it in Secrets to enable Gemini AI rewriting (free at aistudio.google.com).");
  const m = model && model.startsWith("gemini") ? model : "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: sys }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature: 0.85, responseMimeType: "application/json" },
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Gemini error ${r.status}: ${txt.slice(0, 400)}`);
  }
  const j: any = await r.json();
  const parts = j?.candidates?.[0]?.content?.parts || [];
  return parts.map((p: any) => p?.text || "").join("");
}

async function callOpenAI(model: string, sys: string, user: string): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY not configured.");
  const completion = await openai.chat.completions.create({
    model: model || "gpt-4o-mini",
    messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    temperature: 0.85,
  });
  return completion.choices[0]?.message?.content || "{}";
}

// ─── Multi-pass humanization (Gemini-powered) ────────────────────────────────

const AI_TELLS = [
  "delve into", "in conclusion", "in summary", "tapestry", "moreover", "furthermore",
  "navigate the", "in today's fast-paced", "in the realm of", "it's worth noting",
  "ever-evolving", "game-changer", "leverage", "robust", "seamless", "myriad",
  "synergy", "paradigm", "cutting-edge", "unleash the power", "harness the power",
];

function humanizationGuidance(strength: string) {
  const base = `Rewrite the HTML article so it reads like a real person wrote it for a smart blog audience.

HARD RULES (apply silently — do not mention them in output):
1. Vary sentence length aggressively. Mix 4-word punches with 25-word flowing sentences.
2. Use natural contractions (it's, don't, you'll, that's). Avoid stiff academic phrasing.
3. Open at least one section with a short rhetorical or direct question.
4. Drop in a couple of casual asides in parentheses (one or two — not more).
5. Replace clichés and AI tells. NEVER use any of these: ${AI_TELLS.join(", ")}.
6. Replace overused em-dash patterns with commas, periods, or parentheses where natural.
7. Avoid bullet-list overload — convert at most one bullet list to flowing prose if it feels listy.
8. Keep ALL existing HTML tags (<h2>, <p>, <figure>, <iframe>, <img>, <ul>, etc) and image/video embeds intact.
9. Keep the same overall structure, headings, and length (within 10%).
10. Output the rewritten article as raw HTML only — no JSON, no commentary, no code fences.`;
  if (strength === "light") return base + "\n\nUse a LIGHT touch — preserve most original phrasing, only smooth the AI tells.";
  if (strength === "heavy") return base + "\n\nUse a HEAVY rewrite — significantly restructure sentences and word choice; aim for an opinionated, lived-in human voice.";
  return base + "\n\nUse a MEDIUM rewrite — natural and conversational without losing the original information.";
}

function polishGuidance() {
  return `You are a senior editor. Polish the HTML article for a final publish:
1. Tighten any flabby sentences without losing meaning.
2. Make the opening paragraph hookier — start with a concrete observation, question, or contrarian beat (max 2 sentences).
3. Ensure a single clear takeaway in the closing paragraph (without using the words "in conclusion" or "in summary").
4. Naturally weave the focus topic into 2-3 places without keyword stuffing.
5. Fix any broken HTML, awkward duplicates, or repeated phrases.
6. Preserve ALL <img>, <iframe>, <figure> and structural tags exactly.
7. Output the final article as raw HTML only — no JSON, no commentary, no code fences.`;
}

async function callGeminiText(model: string, sys: string, user: string): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const m = model && model.startsWith("gemini") ? model : "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: sys }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature: 0.95, topP: 0.95 },
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini text error ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j: any = await r.json();
  return (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("");
}

async function callOpenAIText(model: string, sys: string, user: string): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY not configured");
  const completion = await openai.chat.completions.create({
    model: model || "gpt-4o-mini",
    messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    temperature: 0.95,
  });
  return completion.choices[0]?.message?.content || "";
}

function stripCodeFences(s: string) {
  return s.replace(/^```(?:html)?/i, "").replace(/```$/i, "").trim();
}

async function humanizeHtml(html: string, opts: { strength: string; model: string; aiProvider: string; topic: string }): Promise<string> {
  const sys = humanizationGuidance(opts.strength);
  const user = `Topic: ${opts.topic}\n\n--- ARTICLE HTML ---\n${html}\n--- END ---\n\nReturn only the rewritten HTML.`;
  try {
    const out = opts.aiProvider === "openai"
      ? await callOpenAIText(opts.model, sys, user)
      : await callGeminiText(opts.model, sys, user);
    const cleaned = stripCodeFences(out);
    return cleaned.length > 200 ? cleaned : html;
  } catch (e) {
    console.warn("[humanize] pass failed, keeping previous draft:", (e as any)?.message);
    return html;
  }
}

async function polishHtml(html: string, opts: { model: string; aiProvider: string; topic: string }): Promise<string> {
  const sys = polishGuidance();
  const user = `Topic: ${opts.topic}\n\n--- ARTICLE HTML ---\n${html}\n--- END ---\n\nReturn only the polished HTML.`;
  try {
    const out = opts.aiProvider === "openai"
      ? await callOpenAIText(opts.model, sys, user)
      : await callGeminiText(opts.model, sys, user);
    const cleaned = stripCodeFences(out);
    return cleaned.length > 200 ? cleaned : html;
  } catch (e) {
    console.warn("[polish] pass failed, keeping previous draft:", (e as any)?.message);
    return html;
  }
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
  aiProvider?: string;
  embedYoutube?: boolean;
  humanizationPasses?: number;
  humanizationStrength?: string;
}): Promise<RewriteResult> {
  const {
    sourceTitle, sourceContent, sourceUrl = "", category = "Tech", toneStyle = "informative",
    minWords = 700, maxWords = 1400, model = "gemini-2.5-flash",
    imageProvider = "pollinations", aiProvider = "gemini", embedYoutube = true,
    humanizationPasses = 0, humanizationStrength = "medium",
  } = opts;

  const { sys, user } = buildPrompt({ sourceTitle, sourceContent, sourceUrl, category, toneStyle, minWords, maxWords });

  let raw = "";
  try {
    raw = aiProvider === "openai" ? await callOpenAI(model, sys, user) : await callGemini(model, sys, user);
  } catch (e: any) {
    // graceful fallback to the other provider if available
    if (aiProvider === "gemini" && process.env.OPENAI_API_KEY) raw = await callOpenAI("gpt-4o-mini", sys, user);
    else if (aiProvider === "openai" && geminiKey()) raw = await callGemini("gemini-2.5-flash", sys, user);
    else throw e;
  }
  const parsed = tryParseJson(raw);

  const title: string = parsed.title || sourceTitle;
  const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 7);
  let content: string = parsed.content || "";

  // Insert two inline images (free) into the content between paragraphs
  const inline: string[] = Array.isArray(parsed.inlineImageQueries) ? parsed.inlineImageQueries.slice(0, 2) : [];
  if (inline.length && imageProvider !== "none") {
    const imgs = await Promise.all(inline.map((q) => generateImage(q, imageProvider)));
    const splits = content.split(/(<\/h2>)/i);
    let injected = "";
    let imgIdx = 0;
    for (let i = 0; i < splits.length; i++) {
      injected += splits[i];
      if (splits[i].toLowerCase() === "</h2>" && imgIdx < imgs.length) {
        injected += `<figure style="margin:1.25rem 0;"><img src="${imgs[imgIdx]}" alt="${(inline[imgIdx] || title).replace(/"/g, "&quot;")}" loading="lazy" style="width:100%;border-radius:12px;" /><figcaption style="font-size:0.85rem;color:#64748b;text-align:center;margin-top:0.5rem;">${inline[imgIdx]}</figcaption></figure>`;
        imgIdx++;
      }
    }
    content = injected;
  }

  // Embed source YouTube video at the top of the article
  if (embedYoutube && sourceUrl && youtubeIdFromUrl(sourceUrl)) {
    content = youtubeEmbedHtml(sourceUrl) + content;
  }

  // ─── Multi-pass humanization (optional) ────────────────────────────────────
  if (humanizationPasses >= 1) {
    console.log(`[auto-blogger] Humanization pass 1 (${humanizationStrength})...`);
    content = await humanizeHtml(content, { strength: humanizationStrength, model, aiProvider, topic: title });
  }
  if (humanizationPasses >= 2) {
    console.log(`[auto-blogger] Polish pass 2...`);
    content = await polishHtml(content, { model, aiProvider, topic: title });
  }

  const wordCount = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(2, Math.round(wordCount / 200));
  const imgQuery = parsed.imageQuery || category || "abstract";
  const featuredImage = await generateImage(imgQuery, imageProvider);

  return {
    title,
    slug,
    excerpt: parsed.excerpt || "",
    content,
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

// ─── Core run-source logic (shared by manual and autopilot) ──────────────────

async function runSource(sourceId: string, perSource: number, createdBy: string | null) {
  const [source] = await db.select().from(autoBlogSources).where(eq(autoBlogSources.id, sourceId));
  if (!source || !source.isActive) return [];
  const limit = Math.max(1, Math.min(5, perSource));
  let items: any[] = [];
  if (source.type === "rss" && source.url) items = await pullRss(source.url, limit);
  else if (source.type === "reddit" && source.url) items = await pullReddit(source.url, limit);
  else if (source.type === "hackernews") items = await pullHackerNews(limit);
  else if (source.type === "youtube" && source.url) items = await pullYoutube(source.url, limit);
  else return [];

  const settings = await getSettings();
  const created: any[] = [];
  for (const item of items) {
    try {
      let content = item.snippet || item.title;
      if (settings.includeTranscripts && item.link) {
        const t = await getTranscript(item.link);
        if (t) content += `\n\n[Video transcript]\n${t}`;
      }
      const result = await rewriteToBlog({
        sourceTitle: item.title,
        sourceContent: content,
        sourceUrl: item.link,
        category: source.category || "Tech",
        toneStyle: settings.toneStyle || "informative",
        minWords: settings.minWords || 700,
        maxWords: settings.maxWords || 1400,
        model: settings.model || "gemini-2.5-flash",
        imageProvider: settings.imageProvider || "pollinations",
        aiProvider: settings.aiProvider || "gemini",
        embedYoutube: settings.embedYoutube !== false,
        humanizationPasses: settings.humanizationPasses ?? 0,
        humanizationStrength: settings.humanizationStrength || "medium",
      });
      const [post] = await db.insert(blogPosts).values({
        title: result.title,
        slug: result.slug,
        content: result.content,
        excerpt: result.excerpt,
        featuredImage: result.featuredImage || null,
        category: result.category,
        tags: result.tags,
        authorId: settings.defaultAuthorId || createdBy || "system",
        isPublished: !!settings.autoPublish,
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
        createdBy: createdBy || "autopilot",
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
        createdBy: createdBy || "autopilot",
        completedAt: new Date(),
      });
    }
  }
  await db.update(autoBlogSources).set({ lastRunAt: new Date() }).where(eq(autoBlogSources.id, source.id));
  return created;
}

// ─── Autopilot scheduler ─────────────────────────────────────────────────────

let autopilotTimer: NodeJS.Timeout | null = null;
let autopilotRunning = false;

async function autopilotTick() {
  if (autopilotRunning) return;
  autopilotRunning = true;
  try {
    const settings = await getSettings();
    if (!settings.autopilotEnabled) return;
    const last = settings.lastAutopilotRunAt ? new Date(settings.lastAutopilotRunAt).getTime() : 0;
    const intervalMs = Math.max(15, settings.autopilotIntervalMinutes || 180) * 60 * 1000;
    if (Date.now() - last < intervalMs) return;
    const sources = await db.select().from(autoBlogSources).where(eq(autoBlogSources.isActive, true));
    for (const s of sources) {
      try { await runSource(s.id, settings.autopilotPerSource || 1, null); } catch {}
    }
    await db.update(autoBloggerSettings).set({ lastAutopilotRunAt: new Date() }).where(eq(autoBloggerSettings.id, "singleton"));
  } catch (e) {
    console.error("[autopilot] tick error", e);
  } finally {
    autopilotRunning = false;
  }
}

export function startAutoBloggerAutopilot() {
  if (autopilotTimer) return;
  // Tick every 5 minutes; the tick itself respects the per-settings interval
  autopilotTimer = setInterval(autopilotTick, 5 * 60 * 1000);
  setTimeout(autopilotTick, 30 * 1000); // first run shortly after boot
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
      { name: "YouTube — Marques Brownlee", type: "youtube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ", category: "Tech" },
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
      else if (source.type === "youtube" && source.url) items = await pullYoutube(source.url, limit);
      else return res.status(400).json({ message: "Unsupported source type" });
      await db.update(autoBlogSources).set({ lastRunAt: new Date() }).where(eq(autoBlogSources.id, source.id));
      res.json({ source: source.name, category: source.category, items });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Generate a blog post job — accepts ad-hoc title/url/content
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

      try {
        let combinedContent = sourceContent || "";
        const wantTranscript = includeTranscript !== undefined ? !!includeTranscript : !!settings.includeTranscripts;
        if (wantTranscript && sourceUrl) {
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
          model: settings.model || "gemini-2.5-flash",
          imageProvider: settings.imageProvider || "pollinations",
          aiProvider: settings.aiProvider || "gemini",
          embedYoutube: settings.embedYoutube !== false,
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
      const limit = Math.min(5, Number(req.body?.limit) || 2);
      const created = await runSource(req.params.id, limit, req.user.id);
      res.json({ created });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Run autopilot once now (manual trigger across all active sources)
  app.post("/api/admin/auto-blogger/autopilot/run-now", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const settings = await getSettings();
      const sources = await db.select().from(autoBlogSources).where(eq(autoBlogSources.isActive, true));
      const totals: any[] = [];
      for (const s of sources) {
        const created = await runSource(s.id, settings.autopilotPerSource || 1, req.user.id);
        totals.push({ source: s.name, created: created.length });
      }
      await db.update(autoBloggerSettings).set({ lastAutopilotRunAt: new Date() }).where(eq(autoBloggerSettings.id, "singleton"));
      res.json({ totals });
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
      geminiConfigured: !!geminiKey(),
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      youtubeApiConfigured: !!process.env.YOUTUBE_API_KEY,
      imageProviders: ["pollinations", "gemini", "unsplash", "none"],
      aiProviders: ["gemini", "openai"],
    });
  });
}
