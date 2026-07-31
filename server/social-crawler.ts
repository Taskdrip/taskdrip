/**
 * AI Marketing Robot — Social Media Crawler
 * Scans Reddit and Hacker News for web development request conversations
 * and uses Groq AI to score relevance, extract urgency, and suggest replies.
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

// ── Keywords that indicate a genuine web dev request ──────────────────────────
const TRIGGER_KEYWORDS = [
  "need a web developer", "looking for a developer", "need a website",
  "hire a developer", "hire developer", "web developer needed", "website help",
  "need someone to build", "need a site built", "build my website",
  "web development help", "website problem", "website not working",
  "website crashed", "need a programmer", "freelance developer",
  "web app help", "website redesign", "need a web app",
  "ecommerce website", "wordpress help", "react developer needed",
  "need a coder", "software developer needed", "site is broken",
  "need tech help", "build an app", "mobile app developer",
  "web development project", "dev needed", "developer for hire",
];

// ── Reddit subreddits to monitor for new posts ────────────────────────────────
const SUBREDDITS = [
  "forhire", "webdev", "entrepreneur", "smallbusiness",
  "startups", "learnprogramming", "webdevelopment",
];

// ── Reddit search queries ─────────────────────────────────────────────────────
const REDDIT_QUERIES = [
  "need web developer",
  "looking for developer",
  "website help needed",
  "hire freelance developer",
  "web development project",
];

// ── HN Algolia search queries ─────────────────────────────────────────────────
const HN_QUERIES = [
  "web developer needed",
  "need someone to build website",
  "looking for developer",
];

interface RawPost {
  platform: "reddit" | "hackernews";
  sourceId: string;
  title: string;
  body: string;
  url: string;
  author: string;
  subreddit?: string;
  platformScore: number;
  commentsCount: number;
  postedAt: Date;
}

// ── Reddit fetch helpers ──────────────────────────────────────────────────────
async function fetchReddit(endpoint: string): Promise<RawPost[]> {
  try {
    const res = await fetch(`https://www.reddit.com${endpoint}`, {
      headers: {
        "User-Agent": "TaskdripMarketingBot/1.0 (contact: admin@taskdrip.online)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = await res.json() as any;
    const children = json?.data?.children ?? [];
    return children
      .filter((c: any) => c.kind === "t3")
      .map((c: any) => {
        const d = c.data;
        return {
          platform: "reddit" as const,
          sourceId: d.id,
          title: d.title || "",
          body: (d.selftext || "").slice(0, 1000),
          url: d.url?.startsWith("http") ? d.url : `https://reddit.com${d.permalink}`,
          author: d.author || "",
          subreddit: d.subreddit || "",
          platformScore: d.score ?? 0,
          commentsCount: d.num_comments ?? 0,
          postedAt: new Date((d.created_utc ?? Date.now() / 1000) * 1000),
        };
      });
  } catch {
    return [];
  }
}

async function crawlReddit(): Promise<RawPost[]> {
  const results: RawPost[] = [];

  // Fetch new posts from target subreddits
  for (const sub of SUBREDDITS) {
    const posts = await fetchReddit(`/r/${sub}/new.json?limit=25&raw_json=1`);
    results.push(...posts);
    await sleep(1200); // rate limit: max ~1 req/sec
  }

  // Keyword searches across all of Reddit
  for (const query of REDDIT_QUERIES) {
    const encoded = encodeURIComponent(query);
    const posts = await fetchReddit(
      `/search.json?q=${encoded}&sort=new&limit=20&t=week&raw_json=1`
    );
    results.push(...posts);
    await sleep(1200);
  }

  return dedup(results, "sourceId");
}

// ── Hacker News (Algolia) fetch ───────────────────────────────────────────────
async function crawlHackerNews(): Promise<RawPost[]> {
  const results: RawPost[] = [];
  const since = Math.floor(Date.now() / 1000) - 7 * 24 * 3600; // last 7 days

  for (const query of HN_QUERIES) {
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encoded}&tags=(story,comment)&numericFilters=created_at_i>${since}&hitsPerPage=20`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) continue;
      const json = await res.json() as any;
      for (const hit of json.hits ?? []) {
        const id = hit.objectID ?? hit.story_id;
        if (!id) continue;
        results.push({
          platform: "hackernews",
          sourceId: String(id),
          title: hit.title || hit.story_title || hit.comment_text?.slice(0, 120) || "HN Post",
          body: (hit.story_text || hit.comment_text || "").slice(0, 1000),
          url: hit.url || `https://news.ycombinator.com/item?id=${id}`,
          author: hit.author || "",
          subreddit: undefined,
          platformScore: hit.points ?? 0,
          commentsCount: hit.num_comments ?? 0,
          postedAt: new Date(hit.created_at || Date.now()),
        });
      }
      await sleep(500);
    } catch {
      continue;
    }
  }

  return dedup(results, "sourceId");
}

// ── Keyword pre-filter ────────────────────────────────────────────────────────
function passesKeywordFilter(post: RawPost): boolean {
  const text = `${post.title} ${post.body}`.toLowerCase();
  return TRIGGER_KEYWORDS.some((kw) => text.includes(kw));
}

// ── AI scoring with Groq ──────────────────────────────────────────────────────
interface ScoredPost extends RawPost {
  relevanceScore: number;
  urgency: "high" | "medium" | "low";
  aiSummary: string;
  suggestedReply: string;
  category: string;
  keywordsMatched: string[];
}

async function scoreWithAI(posts: RawPost[]): Promise<ScoredPost[]> {
  if (!posts.length) return [];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Fallback: score by keyword density
    return posts.map((p) => {
      const text = `${p.title} ${p.body}`.toLowerCase();
      const matched = TRIGGER_KEYWORDS.filter((kw) => text.includes(kw));
      return {
        ...p,
        relevanceScore: Math.min(100, matched.length * 15),
        urgency: matched.length >= 3 ? "high" : matched.length >= 1 ? "medium" : "low",
        aiSummary: p.title,
        suggestedReply: "Hi! I noticed you're looking for web development help. Taskdrip has a pool of vetted developers — check us out at taskdrip.online",
        category: "web_development",
        keywordsMatched: matched,
      };
    });
  }

  // Batch up to 8 posts at a time
  const results: ScoredPost[] = [];
  for (let i = 0; i < posts.length; i += 8) {
    const batch = posts.slice(i, i + 8);
    try {
      const batchInput = batch.map((p, idx) =>
        `[${idx}] PLATFORM: ${p.platform} | SUBREDDIT: ${p.subreddit || "n/a"}
TITLE: ${p.title}
BODY: ${p.body?.slice(0, 400) || "(no body)"}`
      ).join("\n---\n");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a marketing AI for Taskdrip, a platform connecting web developers with clients. 
Analyze social media posts and identify web development business opportunities.
Respond ONLY with a JSON array. Each element must match this shape exactly:
{
  "relevanceScore": 0-100,
  "urgency": "high"|"medium"|"low",
  "category": "web_development"|"mobile_app"|"ecommerce"|"bug_fix"|"design"|"other",
  "aiSummary": "1-sentence summary of what they need",
  "suggestedReply": "A friendly, helpful 2-3 sentence reply that introduces Taskdrip as a solution (mention taskdrip.online)",
  "keywordsMatched": ["array", "of", "matched", "intent", "keywords"]
}
Score 80-100 if they're clearly looking to hire a developer or have an urgent website problem.
Score 50-79 if they might need development help.
Score 0-49 if it's just a discussion or not a real client opportunity.`,
            },
            {
              role: "user",
              content: `Analyze these ${batch.length} posts and return a JSON array of ${batch.length} scored objects:\n\n${batchInput}`,
            },
          ],
          max_tokens: 1200,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok) throw new Error(`Groq error: ${response.status}`);
      const data = await response.json() as any;
      const raw = data.choices?.[0]?.message?.content || "[]";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array in response");
      const scored = JSON.parse(jsonMatch[0]) as any[];

      batch.forEach((post, idx) => {
        const s = scored[idx] || {};
        const text = `${post.title} ${post.body}`.toLowerCase();
        const matched = TRIGGER_KEYWORDS.filter((kw) => text.includes(kw));
        results.push({
          ...post,
          relevanceScore: Number(s.relevanceScore ?? 50),
          urgency: (["high", "medium", "low"].includes(s.urgency) ? s.urgency : "medium") as any,
          aiSummary: s.aiSummary || post.title,
          suggestedReply: s.suggestedReply || "Hey! I saw your post — Taskdrip might be able to help. Check us out at taskdrip.online",
          category: s.category || "web_development",
          keywordsMatched: s.keywordsMatched?.length ? s.keywordsMatched : matched,
        });
      });
    } catch (err: any) {
      console.error("[social-crawler] AI scoring error:", err?.message);
      // Fallback for this batch
      batch.forEach((post) => {
        const text = `${post.title} ${post.body}`.toLowerCase();
        const matched = TRIGGER_KEYWORDS.filter((kw) => text.includes(kw));
        results.push({
          ...post,
          relevanceScore: Math.min(100, matched.length * 15),
          urgency: matched.length >= 3 ? "high" : "medium",
          aiSummary: post.title,
          suggestedReply: "Hi! Taskdrip connects clients with vetted web developers. Visit taskdrip.online to learn more!",
          category: "web_development",
          keywordsMatched: matched,
        });
      });
    }

    await sleep(1000); // brief pause between AI batch calls
  }

  return results;
}

// ── Persist to DB ─────────────────────────────────────────────────────────────
async function savePosts(posts: ScoredPost[]): Promise<number> {
  let saved = 0;
  for (const post of posts) {
    try {
      // Upsert: skip if already stored
      const result = await db.execute(sql`
        INSERT INTO social_leads (
          platform, source_id, title, body, url, author, subreddit,
          platform_score, comments_count, relevance_score, ai_summary,
          suggested_reply, category, urgency, keywords_matched, posted_at
        ) VALUES (
          ${post.platform}, ${post.sourceId}, ${post.title},
          ${post.body || null}, ${post.url}, ${post.author || null},
          ${post.subreddit || null}, ${post.platformScore}, ${post.commentsCount},
          ${post.relevanceScore}, ${post.aiSummary || null},
          ${post.suggestedReply || null}, ${post.category}, ${post.urgency},
          ${post.keywordsMatched as any}, ${post.postedAt}
        )
        ON CONFLICT (platform, source_id) DO NOTHING
      `);
      // rowCount > 0 means it was inserted (not skipped)
      if ((result as any)?.rowCount > 0) saved++;
    } catch (err: any) {
      if (!err?.message?.includes("unique") && !err?.message?.includes("duplicate")) {
        console.error("[social-crawler] DB save error:", err?.message);
      }
    }
  }
  return saved;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function runSocialCrawler(): Promise<{ found: number; saved: number; error?: string }> {
  try {
    console.log("[social-crawler] Starting crawl…");

    const [redditPosts, hnPosts] = await Promise.all([
      crawlReddit(),
      crawlHackerNews(),
    ]);

    const allPosts = [...redditPosts, ...hnPosts];
    console.log(`[social-crawler] Fetched ${allPosts.length} raw posts`);

    // Pre-filter by keywords before spending AI tokens
    const filtered = allPosts.filter(passesKeywordFilter);
    console.log(`[social-crawler] ${filtered.length} passed keyword filter`);

    if (!filtered.length) return { found: 0, saved: 0 };

    const scored = await scoreWithAI(filtered);

    // Only save posts with relevance >= 30
    const qualified = scored.filter((p) => p.relevanceScore >= 30);
    console.log(`[social-crawler] ${qualified.length} qualified for saving`);

    const saved = await savePosts(qualified);
    console.log(`[social-crawler] Saved ${saved} new leads`);

    return { found: filtered.length, saved };
  } catch (err: any) {
    console.error("[social-crawler] Fatal error:", err?.message);
    return { found: 0, saved: 0, error: err?.message };
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function dedup<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}
