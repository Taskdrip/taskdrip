import { db } from "./db";
import { leads, leadMessages, type InsertLead, type Lead } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER || "";

export const providerStatus = () => ({
  googlePlaces: !!GOOGLE_PLACES_KEY,
  youtube: !!YOUTUBE_KEY,
  openai: !!OPENAI_KEY,
  twilio: !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM),
});

// ────────────────────────────────────────────────────────────
// Google Places (New) — business discovery
// ────────────────────────────────────────────────────────────
export async function searchBusinessesGoogle(opts: {
  query: string;          // e.g. "coffee shop", "skincare brand"
  location?: string;      // free-text e.g. "Lagos, Nigeria"
  country?: string;       // ISO-2
  maxResults?: number;
}): Promise<Partial<InsertLead>[]> {
  if (!GOOGLE_PLACES_KEY) throw new Error("GOOGLE_PLACES_API_KEY not configured");
  const q = `${opts.query}${opts.location ? " in " + opts.location : ""}${opts.country ? " " + opts.country : ""}`.trim();
  const max = Math.min(20, Math.max(1, opts.maxResults || 20));

  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.primaryType,places.editorialSummary,places.businessStatus,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: max, regionCode: opts.country || undefined }),
  });
  if (!r.ok) throw new Error(`Places API error ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  const places: any[] = j.places || [];

  return places.map((p) => {
    const phone = p.internationalPhoneNumber || p.nationalPhoneNumber || null;
    return {
      kind: "business",
      source: "google_places",
      externalId: p.id,
      name: p.displayName?.text || "Unnamed",
      businessType: p.primaryType || (Array.isArray(p.types) ? p.types[0] : null),
      address: p.formattedAddress || null,
      latitude: p.location?.latitude != null ? String(p.location.latitude) : null,
      longitude: p.location?.longitude != null ? String(p.location.longitude) : null,
      country: opts.country || null,
      city: opts.location || null,
      phone,
      whatsapp: phone ? phone.replace(/[^\d+]/g, "") : null,
      website: p.websiteUri || null,
      rating: p.rating != null ? String(p.rating) : null,
      reviewCount: p.userRatingCount || null,
      description: p.editorialSummary?.text || null,
      raw: p,
    } as Partial<InsertLead>;
  });
}

// ────────────────────────────────────────────────────────────
// YouTube — influencer discovery
// ────────────────────────────────────────────────────────────
export async function searchInfluencersYouTube(opts: {
  query: string;
  country?: string;
  maxResults?: number;
}): Promise<Partial<InsertLead>[]> {
  if (!YOUTUBE_KEY) throw new Error("YOUTUBE_API_KEY not configured");
  const max = Math.min(25, Math.max(1, opts.maxResults || 15));
  const sParams = new URLSearchParams({
    key: YOUTUBE_KEY,
    part: "snippet",
    type: "channel",
    q: opts.query,
    maxResults: String(max),
  });
  if (opts.country) sParams.set("regionCode", opts.country);
  const sr = await fetch(`https://www.googleapis.com/youtube/v3/search?${sParams}`);
  if (!sr.ok) throw new Error(`YouTube search error ${sr.status}`);
  const sj: any = await sr.json();
  const ids: string[] = (sj.items || []).map((i: any) => i.snippet?.channelId).filter(Boolean);
  if (!ids.length) return [];

  const cParams = new URLSearchParams({ key: YOUTUBE_KEY, part: "snippet,statistics,brandingSettings", id: ids.join(",") });
  const cr = await fetch(`https://www.googleapis.com/youtube/v3/channels?${cParams}`);
  if (!cr.ok) throw new Error(`YouTube channel error ${cr.status}`);
  const cj: any = await cr.json();
  return (cj.items || []).map((c: any) => ({
    kind: "influencer",
    source: "youtube",
    externalId: c.id,
    name: c.snippet?.title || "Unknown",
    niche: opts.query,
    country: c.snippet?.country || opts.country || null,
    description: c.snippet?.description || null,
    website: `https://www.youtube.com/channel/${c.id}`,
    socialLinks: { youtube: `https://www.youtube.com/channel/${c.id}` },
    followers: parseInt(c.statistics?.subscriberCount || "0", 10) || null,
    raw: c,
  } as Partial<InsertLead>));
}

// ────────────────────────────────────────────────────────────
// Persist discovered leads (dedupe on externalId+source)
// ────────────────────────────────────────────────────────────
export async function persistLeads(items: Partial<InsertLead>[]) {
  if (!items.length) return [];
  const saved: Lead[] = [];
  for (const it of items) {
    if (!it.name) continue;
    if (it.externalId && it.source) {
      const existing = await db.select().from(leads).where(eq(leads.externalId, it.externalId)).limit(1);
      if (existing.length) { saved.push(existing[0]); continue; }
    }
    const [row] = await db.insert(leads).values(it as InsertLead).returning();
    saved.push(row);
  }
  return saved;
}

// ────────────────────────────────────────────────────────────
// AI growth report
// ────────────────────────────────────────────────────────────
export async function generateAiReport(lead: Lead): Promise<{ summary: string; report: string }> {
  if (!OPENAI_KEY) {
    // Heuristic fallback that still gives the admin something useful
    const lines: string[] = [];
    lines.push(`**${lead.name}** is a ${lead.kind === "business" ? (lead.businessType || "business") : "creator"}` +
      `${lead.country ? " based in " + (lead.city || "") + " " + lead.country : ""}.`);
    if (lead.kind === "influencer" && lead.followers) lines.push(`Audience: ~${lead.followers.toLocaleString()} followers.`);
    if (lead.rating && lead.reviewCount) lines.push(`Reputation: ${lead.rating}★ from ${lead.reviewCount} reviews.`);
    lines.push("");
    lines.push("### Growth opportunities on Taskdrip");
    lines.push("- Run targeted micro-campaigns to verified creators in their niche.");
    lines.push("- Use $TDRIP boosts to amplify launches and convert engaged users.");
    lines.push("- Set up an escrow-protected ambassador programme to scale UGC volume.");
    lines.push("- List products in the Taskdrip Shop with USDT/TON checkout to capture crypto-native buyers.");
    lines.push("");
    lines.push("### Suggested first outreach");
    lines.push(`Hi ${lead.name.split(" ")[0]}, we'd love to help you reach a wider crypto-native audience through Taskdrip's verified influencer marketplace. Open to a 15-min chat?`);
    const report = lines.join("\n");
    return { summary: lines[0], report };
  }
  const sys = "You are a senior growth strategist at Taskdrip, a Web3 SocialFi influencer marketplace. Produce concise, action-oriented growth reports for a prospect.";
  const usr = `Prospect (${lead.kind}): ${JSON.stringify({
    name: lead.name, niche: lead.niche, type: lead.businessType, country: lead.country, city: lead.city,
    website: lead.website, followers: lead.followers, rating: lead.rating, reviewCount: lead.reviewCount,
    description: lead.description, social: lead.socialLinks,
  })}\n\nWrite:\n1. A 1-sentence summary.\n2. A markdown growth report covering: current positioning, 3 growth opportunities via Taskdrip's marketplace (campaigns, $TDRIP, P2P, shop, ambassador programmes), risks to address, and a personalized 3-line outreach message.\nReturn JSON: {"summary":"...","report":"...markdown..."}`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
      temperature: 0.6,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI error ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  const content = j.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    return { summary: parsed.summary || "", report: parsed.report || content };
  } catch {
    return { summary: "", report: content };
  }
}

// ────────────────────────────────────────────────────────────
// SMS via Twilio (graceful degradation)
// ────────────────────────────────────────────────────────────
export async function sendSmsTwilio(to: string, body: string): Promise<{ sid?: string; error?: string }> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return { error: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM." };
  }
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) return { error: j.message || `Twilio HTTP ${r.status}` };
  return { sid: j.sid };
}

// ────────────────────────────────────────────────────────────
// Bulk dispatch — returns per-recipient result, logs each
// ────────────────────────────────────────────────────────────
export async function bulkSms(opts: {
  leadIds: string[];
  body: string;
  sentBy?: string;
  campaignId?: string;
}) {
  if (!opts.leadIds.length) return [];
  const all = await db.select().from(leads).where(inArray(leads.id, opts.leadIds));
  const results: any[] = [];
  for (const lead of all) {
    const phone = lead.phone || lead.whatsapp;
    if (!phone) {
      await db.insert(leadMessages).values({ leadId: lead.id, channel: "sms", direction: "outbound", body: opts.body, status: "failed", provider: "twilio", error: "No phone", sentBy: opts.sentBy, campaignId: opts.campaignId });
      results.push({ leadId: lead.id, status: "failed", error: "No phone" });
      continue;
    }
    const out = await sendSmsTwilio(phone, opts.body);
    await db.insert(leadMessages).values({
      leadId: lead.id,
      channel: "sms",
      direction: "outbound",
      body: opts.body,
      status: out.error ? "failed" : "sent",
      provider: "twilio",
      providerId: out.sid || null,
      error: out.error || null,
      sentBy: opts.sentBy,
      campaignId: opts.campaignId,
    });
    if (!out.error) await db.update(leads).set({ status: "contacted", lastContactedAt: new Date() }).where(eq(leads.id, lead.id));
    results.push({ leadId: lead.id, ...out });
  }
  return results;
}
