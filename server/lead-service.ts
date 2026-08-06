import { db } from "./db";
import { leads, leadMessages, type InsertLead, type Lead } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER || "";

// ────────────────────────────────────────────────────────────
// Built-in fallback generators (no API keys needed)
// ────────────────────────────────────────────────────────────
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const BUSINESS_POOL = [
  { name: "Luminara Skincare Studio", type: "beauty_salon", country: "US", city: "New York", phone: "+12125550181", website: "https://luminaraskin.com", rating: "4.7", reviewCount: 312, description: "Premium skincare studio specialising in glow-up facials and custom routines." },
  { name: "CryptoHub Coworking", type: "coworking_space", country: "NG", city: "Lagos", phone: "+23491234567", website: "https://cryptohubng.io", rating: "4.5", reviewCount: 88, description: "Web3-native coworking hub for builders, founders, and blockchain developers." },
  { name: "Brew & Bean Coffee", type: "cafe", country: "GB", city: "London", phone: "+442071234567", website: "https://brewandbean.co.uk", rating: "4.8", reviewCount: 529, description: "Specialty coffee bar with single-origin pour-overs and artisan pastries." },
  { name: "FitLife Gym & Studio", type: "gym", country: "CA", city: "Toronto", phone: "+14165550193", website: "https://fitlifestudio.ca", rating: "4.6", reviewCount: 201, description: "Boutique fitness studio offering HIIT, yoga, and personal training programs." },
  { name: "TechVenture Accelerator", type: "business_center", country: "US", city: "San Francisco", phone: "+14155550102", website: "https://techventure.io", rating: "4.4", reviewCount: 67, description: "Seed-stage accelerator for tech startups with mentorship and investor access." },
  { name: "Nourish Bowl Co.", type: "restaurant", country: "AU", city: "Sydney", phone: "+61291234567", website: "https://nourishbowl.com.au", rating: "4.9", reviewCount: 415, description: "Health-focused restaurant serving acai bowls, grain bowls, and cold-pressed juices." },
  { name: "Palette Beauty Supply", type: "beauty_supply_store", country: "NG", city: "Abuja", phone: "+23480987654", website: "https://palettebeauty.ng", rating: "4.3", reviewCount: 154, description: "Wholesale and retail cosmetics supplier stocking global and local beauty brands." },
  { name: "Momentum Digital Agency", type: "advertising_agency", country: "ZA", city: "Cape Town", phone: "+27211234567", website: "https://momentumdigital.co.za", rating: "4.6", reviewCount: 92, description: "Full-service digital marketing agency focused on African e-commerce brands." },
  { name: "Crunch Finance Academy", type: "education", country: "IN", city: "Mumbai", phone: "+912212345678", website: "https://crunchfinance.in", rating: "4.5", reviewCount: 278, description: "Online and in-person courses on personal finance, crypto, and investing." },
  { name: "Verde Organic Market", type: "grocery_store", country: "DE", city: "Berlin", phone: "+493012345678", website: "https://verde-organic.de", rating: "4.7", reviewCount: 188, description: "Organic food market with local produce, vegan products, and zero-waste packaging." },
  { name: "Apex Web3 Studio", type: "software_company", country: "US", city: "Miami", phone: "+13055550144", website: "https://apexweb3.dev", rating: "4.8", reviewCount: 43, description: "Blockchain development studio building DeFi protocols and NFT marketplaces." },
  { name: "GlowSkin Aesthetics", type: "medical_spa", country: "AE", city: "Dubai", phone: "+97141234567", website: "https://glowskin.ae", rating: "4.9", reviewCount: 621, description: "Luxury medical spa offering laser treatments, HydraFacials, and anti-aging solutions." },
  { name: "The Pitch Kitchen", type: "restaurant", country: "KE", city: "Nairobi", phone: "+25471234567", website: "https://pitchkitchen.co.ke", rating: "4.6", reviewCount: 334, description: "Modern fusion restaurant popular among entrepreneurs and the startup community." },
  { name: "InfluMax PR Agency", type: "public_relations_firm", country: "FR", city: "Paris", phone: "+33112345678", website: "https://influmax.fr", rating: "4.4", reviewCount: 56, description: "Influencer-led PR agency connecting European brands with verified creators." },
  { name: "ShopDirect Fulfilment", type: "warehouse", country: "GB", city: "Manchester", phone: "+441612345678", website: "https://shopdirect.uk", rating: "4.2", reviewCount: 77, description: "E-commerce fulfilment and warehousing service for UK and EU online retailers." },
  { name: "Solana Startup House", type: "startup_hub", country: "SG", city: "Singapore", phone: "+6562345678", website: "https://solanastartup.sg", rating: "4.7", reviewCount: 129, description: "Community hub for Solana ecosystem builders with hackathons and demo days." },
  { name: "Roots & Routes Travel", type: "travel_agency", country: "GH", city: "Accra", phone: "+23320123456", website: "https://rootsandroutes.com.gh", rating: "4.5", reviewCount: 203, description: "Afrocentric travel experiences connecting the diaspora with West African heritage tours." },
  { name: "Precision Fitness Lab", type: "gym", country: "US", city: "Los Angeles", phone: "+13105550177", website: "https://precisionfitlab.com", rating: "4.8", reviewCount: 387, description: "Science-based personal training studio with body composition analysis and nutrition coaching." },
  { name: "Kode Academy Lagos", type: "education", country: "NG", city: "Lagos", phone: "+23481234567", website: "https://kodeacademy.ng", rating: "4.6", reviewCount: 449, description: "Coding bootcamp training the next generation of African software engineers." },
  { name: "Urban Threads Boutique", type: "clothing_store", country: "US", city: "Atlanta", phone: "+14045550122", website: "https://urbanthreads.com", rating: "4.4", reviewCount: 267, description: "Streetwear boutique curating limited drops from emerging Black-owned designers." },
];

export function generateBusinessesBuiltin(opts: {
  query: string;
  location?: string;
  country?: string;
  maxResults?: number;
}): Partial<InsertLead>[] {
  // Filter pool by actual country; fall back to full pool when too few matches
  const countryPool = opts.country
    ? BUSINESS_POOL.filter(b => b.country === opts.country)
    : BUSINESS_POOL;
  const pool = countryPool.length >= 3 ? countryPool : BUSINESS_POOL;
  const count = Math.min(opts.maxResults || 15, pool.length);
  const seed = strHash(opts.query + (opts.country || ""));
  const results: Partial<InsertLead>[] = [];
  const seen = new Set<number>();
  for (let i = 0; results.length < count && i < pool.length * 2; i++) {
    const idx = (seed + i * 7) % pool.length;
    if (seen.has(idx)) continue;
    seen.add(idx);
    const t = pool[idx];
    results.push({
      kind: "business",
      // "demo_sample" marks this as synthetic — UI must not allow outreach
      source: "demo_sample",
      externalId: `demo_biz_${strHash(t.name + opts.query)}_${idx}`,
      name: t.name,
      businessType: t.type,
      country: t.country,   // use sample's actual country — do not mislead
      city: t.city,
      // No phone / whatsapp — demo records must not be contactable
      website: t.website,
      rating: t.rating,
      reviewCount: t.reviewCount,
      niche: opts.query,
      description: t.description,
    });
  }
  return results;
}

const INFLUENCER_POOL = [
  { name: "Alex Morgan", platform: "instagram", handle: "alexmorgancreates", followers: 284000, niche: "Fashion", country: "US", description: "Fashion & lifestyle creator blending street style with sustainable brands." },
  { name: "Tobi Adeyemi", platform: "youtube", handle: "TobiTechNG", followers: 1200000, niche: "Tech", country: "NG", description: "Nigeria's top tech reviewer covering smartphones, laptops, and startup culture." },
  { name: "Luna Vasquez", platform: "tiktok", handle: "lunabeautyvibes", followers: 3400000, niche: "Beauty", country: "MX", description: "Makeup artist and beauty educator with viral tutorial content." },
  { name: "Kwame Asante", platform: "twitter", handle: "kwame_crypto", followers: 92000, niche: "Crypto/Web3", country: "GH", description: "Crypto analyst and DeFi educator for the African blockchain community." },
  { name: "Sophie Chen", platform: "instagram", handle: "sophiefitlife", followers: 760000, niche: "Fitness", country: "SG", description: "Certified personal trainer and nutrition coach empowering women in Asia." },
  { name: "Marcus Webb", platform: "youtube", handle: "MarcusWebFinance", followers: 540000, niche: "Finance", country: "GB", description: "UK-based financial educator covering investing, budgeting, and FIRE movement." },
  { name: "Amara Diallo", platform: "instagram", handle: "amarafoodie", followers: 188000, niche: "Food", country: "SN", description: "West African food creator celebrating Senegalese cuisine and plant-based cooking." },
  { name: "Dev Patel", platform: "tiktok", handle: "devgamingworld", followers: 2100000, niche: "Gaming", country: "IN", description: "Mobile gaming creator and esports commentator with a massive South Asian audience." },
  { name: "Chloe Dubois", platform: "instagram", handle: "chloe.travels", followers: 430000, niche: "Travel", country: "FR", description: "Adventure travel vlogger exploring off-the-beaten-path destinations worldwide." },
  { name: "Jide Afolabi", platform: "youtube", handle: "JideMotivates", followers: 890000, niche: "Business", country: "NG", description: "Entrepreneurship educator helping African founders build scalable businesses." },
  { name: "Aisha Kamara", platform: "instagram", handle: "aisha.wellness", followers: 124000, niche: "Health", country: "SL", description: "Holistic wellness coach focused on mental health and African healing traditions." },
  { name: "Carlos Rivera", platform: "youtube", handle: "CarloCryptoES", followers: 670000, niche: "Crypto/Web3", country: "ES", description: "Spanish-language blockchain educator and NFT collector." },
  { name: "Nadia Osei", platform: "tiktok", handle: "nadiamakeovergh", followers: 1500000, niche: "Beauty", country: "GH", description: "Ghanaian beauty creator known for transformative makeup tutorials and skincare reviews." },
  { name: "Ryan Park", platform: "youtube", handle: "RyanParkGaming", followers: 4200000, niche: "Gaming", country: "KR", description: "Korean gaming legend covering RPGs, strategy, and game analysis deep-dives." },
  { name: "Fatima Al-Hassan", platform: "instagram", handle: "fatimastyleae", followers: 315000, niche: "Fashion", country: "AE", description: "Dubai-based modest fashion influencer partnering with luxury and mid-range brands." },
  { name: "Liam O'Brien", platform: "twitter", handle: "liamobrientech", followers: 78000, niche: "Tech", country: "IE", description: "SaaS founder turned tech creator covering product, growth, and developer tools." },
  { name: "Priya Menon", platform: "instagram", handle: "priyafitindia", followers: 560000, niche: "Fitness", country: "IN", description: "Yoga and functional fitness trainer with a strong community of South Asian women." },
  { name: "Emmanuel Eze", platform: "youtube", handle: "EmmaFinanceNG", followers: 220000, niche: "Finance", country: "NG", description: "Nigerian personal finance creator teaching savings, investment, and side hustles." },
  { name: "Mei Lin", platform: "tiktok", handle: "meilinfoodies", followers: 890000, niche: "Food", country: "CN", description: "Asian fusion food creator bridging Chinese street food culture with global audiences." },
  { name: "Jordan Blake", platform: "instagram", handle: "jordanblakelifestyle", followers: 1800000, niche: "Lifestyle", country: "US", description: "LA-based lifestyle creator living at the intersection of luxury, travel, and wellness." },
  { name: "Yemi Adeyinka", platform: "youtube", handle: "YemiMusicNG", followers: 340000, niche: "Music", country: "NG", description: "Afrobeats producer and music educator sharing beats, tutorials, and studio vlogs." },
  { name: "Sarah Mitchell", platform: "instagram", handle: "sarahmitchellcoach", followers: 95000, niche: "Business", country: "AU", description: "Business coach helping female founders scale from 6 to 7 figures online." },
  { name: "Omar Benali", platform: "tiktok", handle: "omarsportsma", followers: 730000, niche: "Sports", country: "MA", description: "Moroccan sports analyst covering football, basketball, and the African games scene." },
  { name: "Isabella Costa", platform: "youtube", handle: "IsabellaBeautyBR", followers: 2700000, niche: "Beauty", country: "BR", description: "Brazil's go-to beauty influencer for drugstore dupes and affordable glam routines." },
  { name: "Tunde Balogun", platform: "twitter", handle: "tundecryptobalogun", followers: 145000, niche: "Crypto/Web3", country: "NG", description: "Web3 OG and on-chain analyst covering DeFi, NFTs, and blockchain policy in Africa." },
];

export function generateInfluencersBuiltin(opts: {
  query: string;
  country?: string;
  maxResults?: number;
}): Partial<InsertLead>[] {
  // Build best-fit pool: prefer niche+country match → niche match → country match → all
  const nicheMatch = INFLUENCER_POOL.filter(p =>
    p.niche.toLowerCase().includes(opts.query.toLowerCase()) ||
    opts.query.toLowerCase().includes(p.niche.toLowerCase())
  );
  const countryNicheMatch = opts.country
    ? nicheMatch.filter(p => p.country === opts.country)
    : nicheMatch;
  const countryPool = opts.country
    ? INFLUENCER_POOL.filter(p => p.country === opts.country)
    : INFLUENCER_POOL;
  const pool =
    countryNicheMatch.length >= 3 ? countryNicheMatch :
    nicheMatch.length >= 3 ? nicheMatch :
    countryPool.length >= 3 ? countryPool :
    INFLUENCER_POOL;

  const count = Math.min(opts.maxResults || 15, pool.length);
  const seed = strHash(opts.query + (opts.country || ""));
  const results: Partial<InsertLead>[] = [];
  const seen = new Set<number>();
  for (let i = 0; results.length < count && i < pool.length * 2; i++) {
    const idx = (seed + i * 11) % pool.length;
    if (seen.has(idx)) continue;
    seen.add(idx);
    const p = pool[idx];
    const handle = p.handle;
    const platform = p.platform;
    const profileUrl = platform === "twitter"
      ? `https://x.com/${handle}`
      : platform === "youtube"
      ? `https://youtube.com/@${handle}`
      : `https://${platform}.com/${handle}`;
    results.push({
      kind: "influencer",
      // "demo_sample" marks this as synthetic — UI must not allow outreach
      source: "demo_sample",
      externalId: `demo_inf_${strHash(p.name + opts.query)}_${idx}`,
      name: p.name,
      niche: p.niche,
      country: p.country,   // use sample's actual country — do not mislead
      followers: p.followers,
      description: p.description,
      website: profileUrl,
      socialLinks: { [platform]: profileUrl },
      // No email / phone — demo records must not be contactable
      tags: [],
    });
  }
  return results;
}

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
  if (!GOOGLE_PLACES_KEY) return generateBusinessesBuiltin(opts);
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
  if (!YOUTUBE_KEY) return generateInfluencersBuiltin(opts);
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
