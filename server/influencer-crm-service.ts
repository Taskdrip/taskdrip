/**
 * Influencer CRM Service
 * AI-powered robot that crawls platforms, classifies by tier, and enables outreach.
 */
import { db } from "./db";
import { leads, leadMessages, type InsertLead, type Lead } from "@shared/schema";
import { eq, inArray, and, sql, desc } from "drizzle-orm";
import { sendEmail, buildDefaultEmailHtml } from "./email-service";
import { persistLeads, generateInfluencersBuiltin } from "./lead-service";

const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

// ─────────────────────────────────────────────────────────────────────────────
// Tier definitions
// ─────────────────────────────────────────────────────────────────────────────
export const TIERS = [
  { id: "global_titans",      label: "Global Titans",      min: 10_000_000,  max: Infinity,     color: "amber",   emoji: "👑" },
  { id: "power_influencers",  label: "Power Influencers",  min: 1_000_000,   max: 9_999_999,    color: "purple",  emoji: "⚡" },
  { id: "growth_engines",     label: "Growth Engines",     min: 100_000,     max: 999_999,      color: "blue",    emoji: "🚀" },
  { id: "rising_sparks",      label: "Rising Sparks",      min: 10_000,      max: 99_999,       color: "emerald", emoji: "✨" },
  { id: "aspiring",           label: "Aspiring Influencer",min: 1,           max: 9_999,        color: "gray",    emoji: "🌱" },
  { id: "unknown",            label: "Unclassified",       min: 0,           max: 0,            color: "gray",    emoji: "❓" },
] as const;

export type TierId = typeof TIERS[number]["id"];

export function classifyTier(followers: number | null | undefined): TierId {
  if (!followers || followers <= 0) return "unknown";
  for (const t of TIERS) {
    if (t.id === "unknown") continue;
    if (followers >= t.min && followers <= t.max) return t.id;
  }
  return "unknown";
}

export function getTierInfo(tierId: string) {
  return TIERS.find(t => t.id === tierId) || TIERS[TIERS.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq — generate smart search queries based on niche/category
// ─────────────────────────────────────────────────────────────────────────────
async function generateSearchQueries(niche: string, platforms: string[]): Promise<string[]> {
  if (!GROQ_KEY) return [niche];
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are an influencer marketing expert. Generate 4 concise YouTube search queries to find creators in a given niche. Return JSON array only: [\"query1\",\"query2\",\"query3\",\"query4\"]",
          },
          {
            role: "user",
            content: `Niche: "${niche}". Platforms: ${platforms.join(", ")}. Goal: find real creators for outreach. Return 4 search queries as JSON array.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });
    if (!r.ok) return [niche];
    const j: any = await r.json();
    const content = j.choices?.[0]?.message?.content || "[]";
    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [niche];
  } catch {
    return [niche];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube search (adapted from lead-service.ts, with tier filtering)
// ─────────────────────────────────────────────────────────────────────────────
async function searchYouTubeCreators(opts: {
  query: string;
  country?: string;
  maxResults?: number;
  targetTiers?: string[];
}): Promise<Partial<InsertLead>[]> {
  if (!YOUTUBE_KEY) return [];
  const max = Math.min(25, Math.max(1, opts.maxResults || 15));
  const sParams = new URLSearchParams({
    key: YOUTUBE_KEY, part: "snippet", type: "channel",
    q: opts.query, maxResults: String(max),
  });
  if (opts.country) sParams.set("regionCode", opts.country);
  const sr = await fetch(`https://www.googleapis.com/youtube/v3/search?${sParams}`);
  if (!sr.ok) return [];
  const sj: any = await sr.json();
  const ids: string[] = (sj.items || []).map((i: any) => i.snippet?.channelId).filter(Boolean);
  if (!ids.length) return [];
  const cParams = new URLSearchParams({ key: YOUTUBE_KEY, part: "snippet,statistics,brandingSettings", id: ids.join(",") });
  const cr = await fetch(`https://www.googleapis.com/youtube/v3/channels?${cParams}`);
  if (!cr.ok) return [];
  const cj: any = await cr.json();
  return (cj.items || []).map((c: any) => {
    const followers = parseInt(c.statistics?.subscriberCount || "0", 10) || 0;
    const tier = classifyTier(followers);
    if (opts.targetTiers?.length && !opts.targetTiers.includes(tier)) return null;
    return {
      kind: "influencer",
      source: "youtube",
      externalId: c.id,
      name: c.snippet?.title || "Unknown",
      niche: opts.query,
      country: c.snippet?.country || opts.country || null,
      description: c.snippet?.description?.slice(0, 300) || null,
      website: `https://www.youtube.com/channel/${c.id}`,
      socialLinks: { youtube: `https://www.youtube.com/channel/${c.id}` },
      followers,
      tags: [tier],
      raw: c,
    } as Partial<InsertLead>;
  }).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq — AI-generated influencer profiles (fallback / non-YouTube platforms)
// ─────────────────────────────────────────────────────────────────────────────
async function generateInfluencersViaGroq(opts: {
  niche: string;
  platforms: string[];
  targetTiers?: string[];
  country?: string;
  count?: number;
}): Promise<Partial<InsertLead>[]> {
  if (!GROQ_KEY) return [];

  const tierContext = opts.targetTiers?.length
    ? `Focus on creators with: ${opts.targetTiers.map(t => {
        const tier = TIERS.find(x => x.id === t);
        return tier ? `${tier.label} (${tier.min.toLocaleString()}–${tier.max === Infinity ? "10M+" : tier.max.toLocaleString()} followers)` : t;
      }).join(", ")}`
    : "Mix of micro to mega creators across all follower tiers";

  const platformList = opts.platforms.filter(p => p !== "youtube").join(", ") || opts.platforms.join(", ");

  const prompt = `Generate ${opts.count || 12} realistic social media influencer profiles for the "${opts.niche}" niche on ${platformList}.
${tierContext}.
${opts.country ? `Prefer creators from or relevant to ${opts.country}.` : "Include a global mix."}

Return ONLY a valid JSON array — no markdown, no explanation:
[{
  "name": "Full creator name",
  "platform": "instagram|tiktok|twitter|youtube|facebook|linkedin",
  "handle": "@username",
  "followers": 125000,
  "niche": "${opts.niche}",
  "country": "NG",
  "email": "email@domain.com or null",
  "phone": null,
  "description": "Short bio under 120 chars",
  "website": "https://... or null"
}]

Rules: vary follower counts realistically, use plausible real-sounding names, most emails should be null (real influencers rarely list emails), some may have websites.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a data generator. Return only valid JSON arrays, no markdown, no extra text." },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 2500,
      }),
    });
    if (!r.ok) return [];
    const j: any = await r.json();
    const content = j.choices?.[0]?.message?.content || "[]";
    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    const items: Partial<InsertLead>[] = [];
    for (const p of parsed) {
      const followers = parseInt(String(p.followers || 0), 10) || 0;
      const tier = classifyTier(followers);
      if (opts.targetTiers?.length && !opts.targetTiers.includes(tier)) continue;
      const requestedPlatforms = opts.platforms.map(platform => platform === "x" ? "twitter" : platform);
      const requestedPlatform = String(p.platform || "").toLowerCase();
      const platform = requestedPlatforms.includes(requestedPlatform)
        ? requestedPlatform
        : requestedPlatforms[0] || "instagram";
      const handle = String(p.handle || "").replace(/^@/, "");
      const profileUrl = handle
        ? platform === "twitter" ? `https://x.com/${handle}`
        : platform === "youtube" ? `https://youtube.com/@${handle}`
        : `https://${platform}.com/${handle}`
        : null;
      items.push({
        kind: "influencer",
        source: "ai_generated",
        externalId: `ai_${platform}_${handle || Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: String(p.name || "Unknown Creator"),
        niche: String(p.niche || opts.niche),
        country: p.country || opts.country || null,
        email: p.email || null,
        phone: p.phone || null,
        description: p.description ? String(p.description).slice(0, 300) : null,
        website: p.website || profileUrl,
        followers,
        tags: [tier],
        socialLinks: profileUrl ? { [platform]: profileUrl } : {},
      } as Partial<InsertLead>);
    }
    return items;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AI Robot Crawl
// ─────────────────────────────────────────────────────────────────────────────
export async function crawlInfluencersAI(opts: {
  niche: string;
  platforms: string[];      // ['youtube','instagram','tiktok','twitter']
  targetTiers?: string[];   // ['global_titans','power_influencers', …]
  country?: string;
  maxPerQuery?: number;
  includeInternal?: boolean;
}) {
  const { niche, platforms, targetTiers, country, maxPerQuery = 15, includeInternal = false } = opts;

  // Step 1: AI generates smart queries
  const queries = await generateSearchQueries(niche, platforms);

  const allItems: Partial<InsertLead>[] = [];
  const sourcesUsed: string[] = [];

  // Step 2a: YouTube crawl (live API — requires YOUTUBE_API_KEY)
  if (platforms.includes("youtube") && YOUTUBE_KEY) {
    sourcesUsed.push("youtube_api");
    for (const q of queries) {
      try {
        const results = await searchYouTubeCreators({ query: q, country, maxResults: maxPerQuery, targetTiers });
        allItems.push(...results);
      } catch { /* skip failed queries */ }
    }
  }

  // Step 2b: Groq AI generation for non-YouTube platforms (or all if no YouTube key)
  const nonYoutubePlatforms = platforms.filter(p => p !== "youtube");
  const needsGroqFallback = nonYoutubePlatforms.length > 0 || (platforms.includes("youtube") && !YOUTUBE_KEY);

  if (needsGroqFallback && GROQ_KEY) {
    const groqPlatforms = nonYoutubePlatforms.length > 0 ? nonYoutubePlatforms : platforms;
    sourcesUsed.push("groq_ai");
    try {
      const groqResults = await generateInfluencersViaGroq({
        niche,
        platforms: groqPlatforms,
        targetTiers,
        country,
        count: Math.min(maxPerQuery * Math.max(1, groqPlatforms.length), 30),
      });
      allItems.push(...groqResults);
    } catch { /* skip */ }
  }

  // Step 2c: Built-in fallback — works with zero API keys
  if (allItems.length === 0) {
    sourcesUsed.push("builtin");
    const builtinResults = generateInfluencersBuiltin({
      query: niche,
      country,
      maxResults: maxPerQuery,
      platforms,
    });
    // Apply tier filtering if requested
    const filtered = targetTiers?.length
      ? builtinResults.filter(r => {
          const tier = classifyTier(r.followers);
          return targetTiers.includes(tier);
        })
      : builtinResults;
    allItems.push(...filtered);
  }

  // Step 3: Include internal Taskdrip creators
  if (includeInternal) {
    const { users } = await import("@shared/schema");
    const internal = await db.select().from(users).where(eq(users.userType, "influencer")).limit(100);
    if (internal.length > 0) sourcesUsed.push("internal");
    for (const u of internal) {
      const followers = (u as any).totalFollowers || 0;
      const tier = classifyTier(followers);
      if (targetTiers?.length && !targetTiers.includes(tier)) continue;
      allItems.push({
        kind: "influencer",
        source: "internal",
        externalId: `internal_${u.id}`,
        name: (u as any).displayName || u.username || (u as any).firstName || "Creator",
        niche: (u as any).primaryNiche || niche || null,
        country: (u as any).country || country || null,
        email: (u as any).email || null,
        followers,
        tags: [tier],
        socialLinks: {
          instagram: (u as any).instagramHandle ? `https://instagram.com/${(u as any).instagramHandle}` : null,
          tiktok: (u as any).tiktokHandle ? `https://tiktok.com/@${(u as any).tiktokHandle}` : null,
          youtube: (u as any).youtubeHandle ? `https://youtube.com/@${(u as any).youtubeHandle}` : null,
          x: (u as any).twitterHandle ? `https://x.com/${(u as any).twitterHandle}` : null,
        },
      });
    }
  }

  // Step 4: Dedupe by externalId + persist
  const unique = dedupeByExternalId(allItems);
  const saved = await persistLeads(unique);

  return {
    queriesUsed: queries,
    sourcesUsed,
    found: unique.length,
    saved: saved.length,
    items: saved,
  };
}

function dedupeByExternalId(items: Partial<InsertLead>[]): Partial<InsertLead>[] {
  const seen = new Set<string>();
  return items.filter(i => {
    const key = i.externalId ? `${i.source}:${i.externalId}` : `${i.name}:${i.niche}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier stats
// ─────────────────────────────────────────────────────────────────────────────
export async function getInfluencerTierStats() {
  const rows = await db.select().from(leads).where(eq(leads.kind, "influencer"));
  const tierCounts: Record<string, number> = {};
  const tierContacted: Record<string, number> = {};
  for (const r of rows) {
    const tier = classifyTier(r.followers);
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    if (r.status === "contacted" || r.status === "replied" || r.status === "converted") {
      tierContacted[tier] = (tierContacted[tier] || 0) + 1;
    }
  }
  return TIERS.map(t => ({
    ...t,
    count: tierCounts[t.id] || 0,
    contacted: tierContacted[t.id] || 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Email outreach (via existing email-service)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendInfluencerOutreach(opts: {
  lead: Lead;
  subject: string;
  body: string;
  sentBy?: string;
}): Promise<{ success: boolean; channel: string; error?: string }> {
  const { lead, subject, body, sentBy } = opts;

  // Interpolate template variables
  const personalized = interpolate(body, {
    name: lead.name,
    niche: lead.niche || "your niche",
    platform: getPrimaryPlatform(lead),
    followers: lead.followers?.toLocaleString() || "your audience",
  });

  let status = "logged";
  let provider = "manual";
  let error: string | undefined;

  if (lead.email) {
    const html = buildDefaultEmailHtml(personalized.replace(/\n/g, "<br>"), "Taskdrip");
    const result = await sendEmail({ to: lead.email, subject, html });
    status = result.success ? "sent" : "failed";
    provider = result.provider || "email";
    error = result.error;
  } else {
    status = "logged";
    provider = "manual";
    error = "No email on file — message logged as note";
  }

  await db.insert(leadMessages).values({
    leadId: lead.id,
    channel: "email",
    direction: "outbound",
    body: personalized,
    status,
    provider,
    error: error || null,
    sentBy: sentBy || null,
  });

  if (status === "sent" || status === "logged") {
    await db.update(leads).set({ status: "contacted", lastContactedAt: new Date() }).where(eq(leads.id, lead.id));
  }

  return { success: status !== "failed", channel: "email", error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk email outreach
// ─────────────────────────────────────────────────────────────────────────────
export async function bulkInfluencerOutreach(opts: {
  leadIds: string[];
  subject: string;
  body: string;
  sentBy?: string;
}) {
  const all = await db.select().from(leads).where(inArray(leads.id, opts.leadIds));
  const results: any[] = [];
  for (const lead of all) {
    const r = await sendInfluencerOutreach({ lead, subject: opts.subject, body: opts.body, sentBy: opts.sentBy });
    results.push({ leadId: lead.id, name: lead.name, ...r });
  }
  const sent = results.filter(r => r.success).length;
  return { attempted: results.length, sent, failed: results.length - sent, results };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function getPrimaryPlatform(lead: Lead): string {
  const links: any = lead.socialLinks || {};
  if (links.youtube) return "YouTube";
  if (links.instagram) return "Instagram";
  if (links.tiktok) return "TikTok";
  if (links.x) return "X (Twitter)";
  if (lead.source === "youtube") return "YouTube";
  return "social media";
}
