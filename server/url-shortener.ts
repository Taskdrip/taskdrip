import type { Express, Request, Response } from "express";
import { db } from "./db";
import { sql, eq, desc, and, count } from "drizzle-orm";
import {
  shortLinks,
  shortLinkClicks,
  shortenerSettings,
  users,
  type ShortenerSettings,
} from "@shared/schema";

// ── User-Agent parsing ────────────────────────────────────────
function parseUserAgent(ua: string) {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "desktop" };
  const lower = ua.toLowerCase();
  let browser = "Unknown";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/") && !lower.includes("chromium")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("opera") || lower.includes("opr/")) browser = "Opera";

  let os = "Unknown";
  if (lower.includes("windows nt")) os = "Windows";
  else if (lower.includes("mac os x") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("linux")) os = "Linux";

  let device: "desktop" | "mobile" | "tablet" = "desktop";
  if (lower.includes("ipad") || (lower.includes("tablet") && !lower.includes("mobile"))) device = "tablet";
  else if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) device = "mobile";

  return { browser, os, device };
}

// ── IP geolocation (best-effort, free, no API key) ────────────
const geoCache = new Map<string, { country: string; countryCode: string; region: string; city: string }>();

async function lookupGeo(ip: string) {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: "Local", countryCode: "LO", region: "", city: "" };
  }
  if (geoCache.has(ip)) return geoCache.get(ip)!;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city`, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(String(res.status));
    const data: any = await res.json();
    if (data.status !== "success") throw new Error("lookup failed");
    const out = {
      country: data.country || "Unknown",
      countryCode: data.countryCode || "",
      region: data.regionName || "",
      city: data.city || "",
    };
    geoCache.set(ip, out);
    return out;
  } catch {
    const fallback = { country: "Unknown", countryCode: "", region: "", city: "" };
    return fallback;
  }
}

function getClientIp(req: Request): string {
  const cf = (req.headers["cf-connecting-ip"] as string) || "";
  if (cf) return cf;
  const xff = (req.headers["x-forwarded-for"] as string) || "";
  if (xff) return xff.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "";
}

// ── Settings helpers ──────────────────────────────────────────
async function getSettings(): Promise<ShortenerSettings> {
  const [existing] = await db.select().from(shortenerSettings).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(shortenerSettings).values({ id: "singleton" }).returning();
  return created;
}

function classifyUser(user: any): { isPremium: boolean; isVerified: boolean; isBrand: boolean; isInfluencer: boolean } {
  const isPremium = !!user?.subscriptionPlan && (user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing");
  const isVerified = !!user?.isVerified;
  const isBrand = user?.userType === "brand";
  const isInfluencer = user?.userType === "creator";
  return { isPremium, isVerified, isBrand, isInfluencer };
}

async function userCanShorten(user: any, settings: ShortenerSettings): Promise<{ ok: boolean; reason?: string; limit: number }> {
  if (!settings.enabled) return { ok: false, reason: "URL shortener is currently disabled by the administrator.", limit: 0 };
  const c = classifyUser(user);
  if (c.isBrand && !settings.allowBrands) return { ok: false, reason: "Brand accounts are not allowed to use the shortener right now.", limit: 0 };
  if (c.isInfluencer && !settings.allowInfluencers) return { ok: false, reason: "Influencer accounts are not allowed to use the shortener right now.", limit: 0 };
  if (c.isPremium) {
    if (!settings.allowPremiumUsers) return { ok: false, reason: "Premium tier access is currently disabled.", limit: 0 };
    return { ok: true, limit: settings.premiumUserLimit ?? 500 };
  }
  if (c.isVerified) {
    if (!settings.allowVerifiedUsers) return { ok: false, reason: "Verified user access is currently disabled.", limit: 0 };
    return { ok: true, limit: settings.premiumUserLimit ?? 500 };
  }
  if (!settings.allowFreeUsers) return { ok: false, reason: "Free accounts cannot use the shortener. Upgrade to unlock this feature.", limit: 0 };
  return { ok: true, limit: settings.freeUserLimit ?? 5 };
}

// ── Slug generation ───────────────────────────────────────────
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
function randomSlug(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
function isValidUrl(u: string) {
  try { const parsed = new URL(u); return ["http:", "https:"].includes(parsed.protocol); } catch { return false; }
}
function isValidCustomSlug(s: string) {
  return /^[a-zA-Z0-9_-]{3,40}$/.test(s);
}

// ── Auth middleware (passport-based) ──────────────────────────
function requireAuth(req: any, res: Response, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.userId = req.user.id;
  next();
}
function requireAdmin(req: any, res: Response, next: any) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user.userType !== "admin" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  req.userId = req.user.id;
  next();
}

// ── Routes ────────────────────────────────────────────────────
export function registerShortenerRoutes(app: Express) {
  // Public redirect — must be registered AFTER static handlers won't catch /s/
  app.get("/s/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const [link] = await db.select().from(shortLinks).where(eq(shortLinks.slug, slug));
      if (!link || !link.isActive) {
        return res.status(404).send("<!doctype html><meta charset='utf-8'><title>Link not found</title><div style='font-family:system-ui;padding:48px;text-align:center'><h1>Link not found</h1><p>This short link doesn't exist or has been disabled.</p></div>");
      }
      // Track asynchronously — never block the redirect
      const ua = (req.headers["user-agent"] as string) || "";
      const referer = (req.headers["referer"] as string) || "";
      const ip = getClientIp(req);
      const parsed = parseUserAgent(ua);
      res.redirect(302, link.originalUrl);
      setImmediate(async () => {
        try {
          const geo = await lookupGeo(ip);
          await db.insert(shortLinkClicks).values({
            linkId: link.id,
            ipAddress: ip,
            country: geo.country,
            countryCode: geo.countryCode,
            region: geo.region,
            city: geo.city,
            userAgent: ua,
            browser: parsed.browser,
            os: parsed.os,
            device: parsed.device,
            referer,
          });
          await db.update(shortLinks).set({ clickCount: sql`${shortLinks.clickCount} + 1` }).where(eq(shortLinks.id, link.id));
        } catch (e) { console.error("[shortener] track error", e); }
      });
    } catch (e) {
      console.error("[shortener] redirect error", e);
      if (!res.headersSent) res.status(500).send("Server error");
    }
  });

  // Get current user's eligibility + settings snapshot
  app.get("/api/short-links/eligibility", requireAuth, async (req, res) => {
    const [u] = await db.select().from(users).where(eq(users.id, (req as any).userId));
    const settings = await getSettings();
    const elig = await userCanShorten(u, settings);
    const [{ value: usedRaw }] = await db.select({ value: count() }).from(shortLinks).where(eq(shortLinks.userId, (req as any).userId));
    const used = Number(usedRaw) || 0;
    res.json({ ...elig, used, enabled: settings.enabled });
  });

  // List user's links
  app.get("/api/short-links", requireAuth, async (req, res) => {
    const links = await db.select().from(shortLinks).where(eq(shortLinks.userId, (req as any).userId)).orderBy(desc(shortLinks.createdAt));
    res.json(links);
  });

  // Create a new short link
  app.post("/api/short-links", requireAuth, async (req, res) => {
    try {
      const { originalUrl, title, customSlug, isReferral } = req.body || {};
      if (!originalUrl || !isValidUrl(originalUrl)) return res.status(400).json({ message: "Please provide a valid http(s) URL." });
      const [u] = await db.select().from(users).where(eq(users.id, (req as any).userId));
      const settings = await getSettings();
      const elig = await userCanShorten(u, settings);
      if (!elig.ok) return res.status(403).json({ message: elig.reason });

      const [{ value: usedRaw }] = await db.select({ value: count() }).from(shortLinks).where(eq(shortLinks.userId, (req as any).userId));
      if (Number(usedRaw) >= elig.limit) {
        return res.status(403).json({ message: `You've reached your ${elig.limit}-link limit. Upgrade your account to shorten more links.` });
      }

      let slug = customSlug ? String(customSlug).trim() : randomSlug();
      if (customSlug && !isValidCustomSlug(slug)) {
        return res.status(400).json({ message: "Custom slug must be 3–40 characters: letters, numbers, hyphens, underscores." });
      }
      // Ensure uniqueness
      for (let i = 0; i < 5; i++) {
        const [exists] = await db.select().from(shortLinks).where(eq(shortLinks.slug, slug));
        if (!exists) break;
        if (customSlug) return res.status(409).json({ message: "That custom slug is already taken." });
        slug = randomSlug();
      }
      const [created] = await db.insert(shortLinks).values({
        userId: (req as any).userId,
        slug,
        originalUrl,
        title: title || null,
        isReferral: !!isReferral,
      }).returning();
      res.status(201).json(created);
    } catch (e: any) {
      console.error("[shortener] create error", e);
      res.status(500).json({ message: "Failed to create short link" });
    }
  });

  // Toggle active / delete
  app.patch("/api/short-links/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const [link] = await db.select().from(shortLinks).where(and(eq(shortLinks.id, id), eq(shortLinks.userId, (req as any).userId)));
    if (!link) return res.status(404).json({ message: "Not found" });
    const updates: any = {};
    if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;
    if (typeof req.body?.title === "string") updates.title = req.body.title;
    const [updated] = await db.update(shortLinks).set(updates).where(eq(shortLinks.id, id)).returning();
    res.json(updated);
  });

  app.delete("/api/short-links/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const [link] = await db.select().from(shortLinks).where(and(eq(shortLinks.id, id), eq(shortLinks.userId, (req as any).userId)));
    if (!link) return res.status(404).json({ message: "Not found" });
    await db.delete(shortLinks).where(eq(shortLinks.id, id));
    res.json({ ok: true });
  });

  // Analytics for one link
  app.get("/api/short-links/:id/analytics", requireAuth, async (req, res) => {
    const { id } = req.params;
    const [link] = await db.select().from(shortLinks).where(and(eq(shortLinks.id, id), eq(shortLinks.userId, (req as any).userId)));
    if (!link) return res.status(404).json({ message: "Not found" });
    const clicks = await db.select().from(shortLinkClicks).where(eq(shortLinkClicks.linkId, id)).orderBy(desc(shortLinkClicks.clickedAt)).limit(2000);

    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};
    const byOs: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    const byReferer: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const c of clicks) {
      const co = c.country || "Unknown"; byCountry[co] = (byCountry[co] || 0) + 1;
      const dv = c.device || "Unknown"; byDevice[dv] = (byDevice[dv] || 0) + 1;
      const br = c.browser || "Unknown"; byBrowser[br] = (byBrowser[br] || 0) + 1;
      const os = c.os || "Unknown"; byOs[os] = (byOs[os] || 0) + 1;
      const ci = (c.city && c.city.trim()) ? `${c.city}, ${c.country || ""}` : "Unknown"; byCity[ci] = (byCity[ci] || 0) + 1;
      let ref = "Direct";
      if (c.referer) { try { ref = new URL(c.referer).hostname; } catch { ref = c.referer.slice(0, 60); } }
      byReferer[ref] = (byReferer[ref] || 0) + 1;
      const day = c.clickedAt ? new Date(c.clickedAt).toISOString().slice(0, 10) : "unknown";
      byDay[day] = (byDay[day] || 0) + 1;
    }

    const toSorted = (m: Record<string, number>) => Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const days = Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      link,
      totalClicks: clicks.length,
      uniqueCountries: Object.keys(byCountry).length,
      timeline: days,
      byCountry: toSorted(byCountry),
      byDevice: toSorted(byDevice),
      byBrowser: toSorted(byBrowser),
      byOs: toSorted(byOs),
      byCity: toSorted(byCity).slice(0, 25),
      byReferer: toSorted(byReferer).slice(0, 25),
      recent: clicks.slice(0, 50),
    });
  });

  // ── Admin endpoints ─────────────────────────────────────────
  app.get("/api/admin/shortener/settings", requireAdmin, async (_req, res) => {
    const settings = await getSettings();
    res.json(settings);
  });

  app.patch("/api/admin/shortener/settings", requireAdmin, async (req, res) => {
    await getSettings(); // ensure row exists
    const allowed: (keyof ShortenerSettings)[] = ["enabled", "allowFreeUsers", "allowVerifiedUsers", "allowPremiumUsers", "allowBrands", "allowInfluencers", "freeUserLimit", "premiumUserLimit"];
    const updates: any = { updatedAt: new Date() };
    for (const k of allowed) if (k in req.body) updates[k] = (req.body as any)[k];
    const [updated] = await db.update(shortenerSettings).set(updates).where(eq(shortenerSettings.id, "singleton")).returning();
    res.json(updated);
  });

  app.get("/api/admin/shortener/links", requireAdmin, async (_req, res) => {
    const rows = await db
      .select({
        link: shortLinks,
        user: { id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, userType: users.userType },
      })
      .from(shortLinks)
      .leftJoin(users, eq(shortLinks.userId, users.id))
      .orderBy(desc(shortLinks.createdAt))
      .limit(500);
    res.json(rows.map(r => ({ ...r.link, user: r.user })));
  });

  app.patch("/api/admin/shortener/links/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const updates: any = {};
    if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;
    const [updated] = await db.update(shortLinks).set(updates).where(eq(shortLinks.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/shortener/links/:id", requireAdmin, async (req, res) => {
    await db.delete(shortLinks).where(eq(shortLinks.id, req.params.id));
    res.json({ ok: true });
  });
}
