import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { keywordTrackers, trackedContent, trendingTopics } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
// @ts-ignore - no types for google-trends-api
import googleTrends from "google-trends-api";
import Parser from "rss-parser";

const rssParser = new Parser({ timeout: 10000 });

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

// ─── External fetchers (no API key required) ─────────────────────────────────

async function fetchReddit(keyword: string, limit = 25) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=top&t=week&limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": "Taskdrip/1.0 KeywordAnalytics" } });
  if (!res.ok) throw new Error(`Reddit failed: ${res.status}`);
  const json: any = await res.json();
  return (json?.data?.children || []).map((c: any) => ({
    platform: "reddit",
    externalId: c.data.id,
    title: c.data.title,
    url: `https://reddit.com${c.data.permalink}`,
    thumbnail: c.data.thumbnail?.startsWith("http") ? c.data.thumbnail : null,
    author: c.data.author,
    snippet: (c.data.selftext || "").slice(0, 400),
    metric: c.data.score || 0,
    publishedAt: new Date(c.data.created_utc * 1000),
  }));
}

async function fetchHackerNews(keyword: string, limit = 25) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN failed: ${res.status}`);
  const json: any = await res.json();
  return (json?.hits || []).map((h: any) => ({
    platform: "hackernews",
    externalId: h.objectID,
    title: h.title,
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    thumbnail: null,
    author: h.author,
    snippet: (h.story_text || "").slice(0, 400),
    metric: h.points || 0,
    publishedAt: new Date(h.created_at),
  }));
}

async function fetchYouTube(keyword: string, limit = 12) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    // Fallback: search URL only (no items)
    return [];
  }
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&order=viewCount&q=${encodeURIComponent(keyword)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json: any = await res.json();
  return (json?.items || []).map((i: any) => ({
    platform: "youtube",
    externalId: i.id?.videoId,
    title: i.snippet?.title,
    url: `https://www.youtube.com/watch?v=${i.id?.videoId}`,
    thumbnail: i.snippet?.thumbnails?.high?.url || i.snippet?.thumbnails?.default?.url,
    author: i.snippet?.channelTitle,
    snippet: i.snippet?.description,
    metric: 0,
    publishedAt: i.snippet?.publishedAt ? new Date(i.snippet.publishedAt) : null,
  }));
}

async function fetchNewsRss(keyword: string, limit = 20) {
  // Google News RSS
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const feed = await rssParser.parseURL(url);
    return (feed.items || []).slice(0, limit).map((item: any) => ({
      platform: "news",
      externalId: item.guid || item.link,
      title: item.title,
      url: item.link,
      thumbnail: null,
      author: item.creator || item.author || (item.source?._ ?? null),
      snippet: (item.contentSnippet || item.content || "").slice(0, 400),
      metric: 0,
      publishedAt: item.isoDate ? new Date(item.isoDate) : null,
    }));
  } catch {
    return [];
  }
}

async function fetchGoogleTrendsRelated(keyword: string, region = "US") {
  try {
    const raw: string = await googleTrends.relatedQueries({ keyword, geo: region });
    const json = JSON.parse(raw);
    const top = json?.default?.rankedList?.[0]?.rankedKeyword || [];
    const rising = json?.default?.rankedList?.[1]?.rankedKeyword || [];
    return { top, rising };
  } catch {
    return { top: [], rising: [] };
  }
}

async function fetchGoogleDailyTrends(region = "US") {
  try {
    const raw: string = await googleTrends.dailyTrends({ geo: region });
    const json = JSON.parse(raw);
    const days = json?.default?.trendingSearchesDays || [];
    const items: any[] = [];
    for (const day of days) {
      for (const t of day.trendingSearches || []) {
        items.push({
          topic: t.title?.query,
          volume: parseInt(String(t.formattedTraffic || "0").replace(/[^0-9]/g, "")) || 0,
          articles: (t.articles || []).slice(0, 3).map((a: any) => ({ title: a.title, url: a.url, source: a.source })),
          relatedQueries: (t.relatedQueries || []).map((r: any) => r.query),
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

// Build "search this keyword" URLs for platforms that don't expose an API
function buildPlatformSearchUrls(keyword: string) {
  const q = encodeURIComponent(keyword);
  return {
    google: `https://www.google.com/search?q=${q}`,
    youtube: `https://www.youtube.com/results?search_query=${q}`,
    tiktok: `https://www.tiktok.com/search?q=${q}`,
    instagram: `https://www.instagram.com/explore/tags/${encodeURIComponent(keyword.replace(/\s+/g, ""))}/`,
    x: `https://twitter.com/search?q=${q}&src=typed_query`,
    reddit: `https://www.reddit.com/search/?q=${q}`,
    news: `https://news.google.com/search?q=${q}`,
    bing: `https://www.bing.com/search?q=${q}`,
  };
}

async function refreshTracker(trackerId: string) {
  const [tracker] = await db.select().from(keywordTrackers).where(eq(keywordTrackers.id, trackerId));
  if (!tracker) return { added: 0 };
  const platforms = (tracker.platforms || []).length ? tracker.platforms! : ["reddit", "hackernews", "news", "youtube"];
  const allItems: any[] = [];
  await Promise.all(platforms.map(async (p) => {
    try {
      let items: any[] = [];
      if (p === "reddit") items = await fetchReddit(tracker.keyword);
      else if (p === "hackernews") items = await fetchHackerNews(tracker.keyword);
      else if (p === "news") items = await fetchNewsRss(tracker.keyword);
      else if (p === "youtube") items = await fetchYouTube(tracker.keyword);
      allItems.push(...items);
    } catch (e) {
      console.error(`[keyword-analytics] ${p} fetch failed:`, (e as any)?.message);
    }
  }));

  if (allItems.length) {
    // Replace previous items for this tracker (last 30 days only kept)
    await db.delete(trackedContent).where(eq(trackedContent.trackerId, trackerId));
    await db.insert(trackedContent).values(allItems.map(i => ({
      trackerId,
      platform: i.platform,
      externalId: i.externalId || null,
      title: i.title,
      url: i.url,
      thumbnail: i.thumbnail,
      author: i.author,
      snippet: i.snippet,
      metric: i.metric || 0,
      publishedAt: i.publishedAt || null,
    })));
  }
  await db.update(keywordTrackers).set({ lastRefreshedAt: new Date() }).where(eq(keywordTrackers.id, trackerId));
  return { added: allItems.length };
}

export function registerKeywordAnalyticsRoutes(app: Express) {
  // Trackers CRUD (admin)
  app.get("/api/admin/keyword-trackers", isAuthed, isAdmin, async (req: any, res) => {
    const rows = await db.select().from(keywordTrackers).orderBy(desc(keywordTrackers.createdAt));
    res.json(rows);
  });

  app.post("/api/admin/keyword-trackers", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const { keyword, platforms, region } = req.body || {};
      if (!keyword || !String(keyword).trim()) return res.status(400).json({ message: "Keyword required" });
      const [row] = await db.insert(keywordTrackers).values({
        userId: req.user.id,
        keyword: String(keyword).trim(),
        platforms: Array.isArray(platforms) && platforms.length ? platforms : ["reddit", "hackernews", "news", "youtube"],
        region: region || "US",
      }).returning();
      // Trigger immediate refresh in background
      refreshTracker(row.id).catch(e => console.error("Initial refresh failed:", e));
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/keyword-trackers/:id", isAuthed, isAdmin, async (req: any, res) => {
    await db.delete(keywordTrackers).where(eq(keywordTrackers.id, req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/admin/keyword-trackers/:id/refresh", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const result = await refreshTracker(req.params.id);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Tracker content with platform/sort filters
  app.get("/api/admin/keyword-trackers/:id/content", isAuthed, isAdmin, async (req: any, res) => {
    const { platform, sort } = req.query;
    const conds = [eq(trackedContent.trackerId, req.params.id)];
    if (platform && platform !== "all") conds.push(eq(trackedContent.platform, String(platform)));
    let orderCol: any = desc(trackedContent.fetchedAt);
    if (sort === "metric") orderCol = desc(trackedContent.metric);
    if (sort === "recent") orderCol = desc(trackedContent.publishedAt);
    const rows = await db.select().from(trackedContent).where(and(...conds)).orderBy(orderCol).limit(300);
    // Aggregate by platform for filter chips
    const counts = await db.select({
      platform: trackedContent.platform,
      count: sql<number>`count(*)::int`,
    }).from(trackedContent).where(eq(trackedContent.trackerId, req.params.id)).groupBy(trackedContent.platform);
    res.json({ items: rows, counts });
  });

  // Search-now: ad-hoc search without saving a tracker
  app.post("/api/admin/keyword-search", isAuthed, isAdmin, async (req: any, res) => {
    try {
      const { keyword, platforms } = req.body || {};
      if (!keyword) return res.status(400).json({ message: "Keyword required" });
      const wanted: string[] = Array.isArray(platforms) && platforms.length ? platforms : ["reddit", "hackernews", "news", "youtube"];
      const results: Record<string, any[]> = {};
      await Promise.all(wanted.map(async (p) => {
        try {
          if (p === "reddit") results.reddit = await fetchReddit(keyword, 15);
          else if (p === "hackernews") results.hackernews = await fetchHackerNews(keyword, 15);
          else if (p === "news") results.news = await fetchNewsRss(keyword, 15);
          else if (p === "youtube") results.youtube = await fetchYouTube(keyword, 12);
        } catch (e: any) { results[p] = []; }
      }));
      const trends = await fetchGoogleTrendsRelated(keyword);
      res.json({
        keyword,
        results,
        trends,
        searchUrls: buildPlatformSearchUrls(keyword),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Trending now (Google Daily Trends)
  app.get("/api/admin/trending-now", isAuthed, isAdmin, async (req: any, res) => {
    const region = String(req.query.region || "US");
    const trends = await fetchGoogleDailyTrends(region);
    // Persist as snapshot
    if (trends.length) {
      await db.delete(trendingTopics).where(eq(trendingTopics.region, region));
      await db.insert(trendingTopics).values(trends.slice(0, 50).map((t: any, idx: number) => ({
        topic: t.topic || "",
        platform: "google",
        region,
        rank: idx + 1,
        volume: t.volume || 0,
      })));
    }
    res.json({ region, trends });
  });

  app.get("/api/admin/keyword-search-urls", isAuthed, isAdmin, async (req: any, res) => {
    const keyword = String(req.query.keyword || "");
    if (!keyword) return res.status(400).json({ message: "keyword required" });
    res.json(buildPlatformSearchUrls(keyword));
  });
}

export const _keywordAnalyticsHelpers = {
  fetchReddit, fetchHackerNews, fetchYouTube, fetchNewsRss, fetchGoogleDailyTrends, fetchGoogleTrendsRelated, buildPlatformSearchUrls, refreshTracker,
};
