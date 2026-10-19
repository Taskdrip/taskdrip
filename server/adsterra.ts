import type { Express, Request, Response } from "express";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  adsterraEvents,
  adsterraSettings,
  shortLinkClicks,
  shortLinks,
  type AdsterraFormat,
  type AdsterraPageTarget,
  type AdsterraPlacement,
  type AdsterraPosition,
  type AdsterraSettingsValue,
} from "@shared/schema";
import { db } from "./db";

const DEFAULT_PLACEMENTS: AdsterraPlacement[] = [
  { id: "iframe-160x300", name: "160 × 300 banner", format: "iframe", key: "d7698385134eb4874a8b03c75ec73d8e", width: 160, height: 300, enabled: true, position: "sidebar", pages: ["article"] },
  { id: "iframe-160x600", name: "160 × 600 skyscraper", format: "iframe", key: "1c8e455c08da2acaaf8ad13a9a904ed5", width: 160, height: 600, enabled: false, position: "sidebar", pages: ["article"] },
  { id: "iframe-300x250", name: "300 × 250 rectangle", format: "iframe", key: "d8908142688a819f84bcd7c2fec56af6", width: 300, height: 250, enabled: true, position: "article-inline", pages: ["article"] },
  { id: "iframe-320x50", name: "320 × 50 mobile banner", format: "iframe", key: "17a65f77fa3438b3fefdcb676ee98dee", width: 320, height: 50, enabled: true, position: "footer", pages: ["all"] },
  { id: "iframe-468x60", name: "468 × 60 banner", format: "iframe", key: "853091c54a9b97261a0c491b694fec3d", width: 468, height: 60, enabled: false, position: "footer", pages: ["all"] },
  { id: "iframe-728x90", name: "728 × 90 leaderboard", format: "iframe", key: "154db1845b00e0f67c9191df7bfaae41", width: 728, height: 90, enabled: true, position: "article-end", pages: ["article"] },
  { id: "native-banner", name: "Native banner", format: "native", key: "5f2b3b9889056ddaef435c83d66cfe70", width: 640, height: 180, enabled: true, position: "blog-feed", pages: ["blog"] },
  { id: "popunder", name: "Popunder", format: "popunder", key: "5f2b3b9889056ddaef435c83d66cfe70", width: 1, height: 1, enabled: false, position: "floating", pages: ["all"] },
  { id: "smartlink", name: "Smartlink", format: "smartlink", key: "8c495b91cd0cddb28d0dc18b095eb0d1", enabled: false, position: "article-end", pages: ["article"] },
  { id: "socialbar", name: "Social Bar", format: "socialbar", key: "74a8f64f8fe3f8d27ae89ac6b9528098", width: 360, height: 100, enabled: false, position: "floating", pages: ["all"] },
];

const DEFAULT_SETTINGS: AdsterraSettingsValue = { enabled: false, placements: DEFAULT_PLACEMENTS };
const FORMATS = new Set<AdsterraFormat>(["iframe", "native", "popunder", "smartlink", "socialbar"]);
const POSITIONS = new Set<AdsterraPosition>(["body", "blog-feed", "article-inline", "sidebar", "article-end", "footer", "floating"]);
const PAGE_TARGETS = new Set<AdsterraPageTarget>(["all", "site", "blog", "article"]);
const ZONE_KEY = /^[a-f0-9]{32}$/i;

function appBaseUrl() {
  return (process.env.PUBLIC_APP_URL || "https://taskdrip.online").trim().replace(/\/+$/, "");
}

function requireAdmin(req: any, res: Response, next: (error?: any) => void) {
  if (!req.isAuthenticated?.() || !req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.userType !== "admin" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

async function getSettings(): Promise<AdsterraSettingsValue> {
  const [existing] = await db.select().from(adsterraSettings).where(eq(adsterraSettings.id, "singleton")).limit(1);
  if (existing?.settings?.placements?.length) return existing.settings;
  if (existing) {
    await db.update(adsterraSettings)
      .set({ settings: DEFAULT_SETTINGS, updatedAt: new Date() })
      .where(eq(adsterraSettings.id, "singleton"));
    return DEFAULT_SETTINGS;
  }
  await db.insert(adsterraSettings).values({ id: "singleton", settings: DEFAULT_SETTINGS }).onConflictDoNothing();
  const [created] = await db.select().from(adsterraSettings).where(eq(adsterraSettings.id, "singleton")).limit(1);
  return created?.settings || DEFAULT_SETTINGS;
}

function getShortDestination(key: string) {
  return `https://arwf.org/4/${key}`;
}

function makeShortSlug(id: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ad-${id}-${suffix}`.slice(0, 40);
}

async function ensureSmartlink(placement: AdsterraPlacement, adminId: string, oldSlug?: string) {
  const originalUrl = getShortDestination(placement.key);
  const title = `Adsterra Smartlink — ${placement.name}`;
  if (oldSlug) {
    const [existing] = await db.select().from(shortLinks).where(eq(shortLinks.slug, oldSlug)).limit(1);
    if (existing) {
      await db.update(shortLinks).set({ originalUrl, title }).where(eq(shortLinks.id, existing.id));
      return oldSlug;
    }
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = makeShortSlug(placement.id);
    const [existing] = await db.select({ id: shortLinks.id }).from(shortLinks).where(eq(shortLinks.slug, slug)).limit(1);
    if (existing) continue;
    await db.insert(shortLinks).values({
      userId: adminId,
      slug,
      originalUrl,
      title,
      isReferral: false,
    });
    return slug;
  }
  throw new Error("Could not allocate a Taskdrip short link for the Smartlink placement.");
}

function validateSettings(input: any, previous: AdsterraSettingsValue): { settings?: AdsterraSettingsValue; error?: string } {
  if (!input || typeof input.enabled !== "boolean" || !Array.isArray(input.placements) || input.placements.length > 20) {
    return { error: "Settings must include a global switch and no more than 20 placements." };
  }
  const ids = new Set<string>();
  const placements: AdsterraPlacement[] = [];
  for (const candidate of input.placements) {
    if (!candidate || typeof candidate.id !== "string" || !/^[a-z0-9][a-z0-9_-]{1,39}$/i.test(candidate.id)) {
      return { error: "Each placement needs a valid ID." };
    }
    if (ids.has(candidate.id)) return { error: `Duplicate placement ID: ${candidate.id}` };
    ids.add(candidate.id);
    if (typeof candidate.name !== "string" || !candidate.name.trim() || candidate.name.length > 100) {
      return { error: `Placement ${candidate.id} needs a name of 1–100 characters.` };
    }
    if (!FORMATS.has(candidate.format) || !POSITIONS.has(candidate.position)) {
      return { error: `Placement ${candidate.id} has an unsupported ad format or location.` };
    }
    if (typeof candidate.enabled !== "boolean" || !ZONE_KEY.test(candidate.key || "")) {
      return { error: `Placement ${candidate.id} needs a 32-character Adsterra zone ID and enabled state.` };
    }
    if (!Array.isArray(candidate.pages) || candidate.pages.length === 0 ||
      candidate.pages.some((page: string) => !PAGE_TARGETS.has(page as AdsterraPageTarget))) {
      return { error: `Placement ${candidate.id} needs at least one valid page target.` };
    }
    const width = Number(candidate.width);
    const height = Number(candidate.height);
    if (candidate.format !== "smartlink" && (!Number.isInteger(width) || width < 1 || width > 1200 ||
      !Number.isInteger(height) || height < 1 || height > 1200)) {
      return { error: `Placement ${candidate.id} has invalid dimensions.` };
    }
    const oldPlacement = previous.placements.find((item) => item.id === candidate.id);
    placements.push({
      id: candidate.id,
      name: candidate.name.trim(),
      format: candidate.format,
      key: candidate.key.toLowerCase(),
      width: candidate.format === "smartlink" ? undefined : width,
      height: candidate.format === "smartlink" ? undefined : height,
      enabled: candidate.enabled,
      position: candidate.position,
      pages: Array.from(new Set(candidate.pages)) as AdsterraPageTarget[],
      shortSlug: candidate.format === "smartlink" ? oldPlacement?.shortSlug : undefined,
    });
  }
  return { settings: { enabled: input.enabled, placements } };
}

function pagePath(value: unknown) {
  const path = typeof value === "string" ? value : "/";
  return path.startsWith("/") ? path.slice(0, 512) : "/";
}

export function registerAdsterraRoutes(app: Express) {
  app.get("/api/adsterra/public-settings", async (_req, res) => {
    try {
      const settings = await getSettings();
      res.set("Cache-Control", "no-store");
      res.json({ ...settings, shortenerBaseUrl: appBaseUrl() });
    } catch (error) {
      console.error("[adsterra] public settings error", error);
      res.status(503).json({ enabled: false, placements: [], shortenerBaseUrl: appBaseUrl() });
    }
  });

  app.post("/api/adsterra/impressions", async (req, res) => {
    try {
      const { placementId } = req.body || {};
      if (typeof placementId !== "string" || !/^[a-z0-9][a-z0-9_-]{1,39}$/i.test(placementId)) {
        return res.status(400).json({ message: "Invalid placement." });
      }
      const settings = await getSettings();
      const placement = settings.placements.find((item) => item.id === placementId);
      if (!settings.enabled || !placement?.enabled || placement.format === "smartlink") {
        return res.status(204).end();
      }
      await db.insert(adsterraEvents).values({
        placementId,
        eventType: "impression",
        pagePath: pagePath(req.body?.pagePath),
      });
      res.status(204).end();
    } catch (error) {
      console.error("[adsterra] impression tracking error", error);
      res.status(204).end();
    }
  });

  app.get("/api/admin/adsterra/settings", requireAdmin, async (_req, res) => {
    try {
      res.json({ ...(await getSettings()), shortenerBaseUrl: appBaseUrl() });
    } catch (error) {
      console.error("[adsterra] admin settings error", error);
      res.status(500).json({ message: "Unable to load Adsterra settings." });
    }
  });

  app.put("/api/admin/adsterra/settings", requireAdmin, async (req: any, res) => {
    try {
      const previous = await getSettings();
      const validation = validateSettings(req.body, previous);
      if (!validation.settings) return res.status(400).json({ message: validation.error });

      for (const placement of validation.settings.placements) {
        if (placement.format === "smartlink") {
          placement.shortSlug = await ensureSmartlink(
            placement,
            req.user.id,
            previous.placements.find((old) => old.id === placement.id)?.shortSlug,
          );
        }
      }
      await db.insert(adsterraSettings)
        .values({ id: "singleton", settings: validation.settings, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: adsterraSettings.id,
          set: { settings: validation.settings, updatedAt: new Date() },
        });
      res.json({ ...validation.settings, shortenerBaseUrl: appBaseUrl() });
    } catch (error: any) {
      console.error("[adsterra] save settings error", error);
      res.status(500).json({ message: error?.message || "Unable to save Adsterra settings." });
    }
  });

  app.get("/api/admin/adsterra/analytics", requireAdmin, async (req, res) => {
    try {
      const days = Math.max(1, Math.min(90, Number.parseInt(String(req.query.days || "30"), 10) || 30));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const settings = await getSettings();
      const [events, smartlinkRows] = await Promise.all([
        db.select().from(adsterraEvents)
          .where(and(eq(adsterraEvents.eventType, "impression"), gte(adsterraEvents.createdAt, since)))
          .orderBy(desc(adsterraEvents.createdAt))
          .limit(20000),
        settings.placements.some((placement) => placement.shortSlug)
          ? db.select({ linkId: shortLinks.id, slug: shortLinks.slug })
              .from(shortLinks)
              .where(inArray(shortLinks.slug, settings.placements.filter((placement) => placement.shortSlug).map((placement) => placement.shortSlug!)))
          : Promise.resolve([] as { linkId: string; slug: string }[]),
      ]);
      const clicks = smartlinkRows.length
        ? await db.select().from(shortLinkClicks)
            .where(and(inArray(shortLinkClicks.linkId, smartlinkRows.map((row) => row.linkId)), gte(shortLinkClicks.clickedAt, since)))
            .orderBy(desc(shortLinkClicks.clickedAt))
            .limit(20000)
        : [];

      const stats = new Map<string, { impressions: number; clicks: number; pages: Map<string, number> }>();
      for (const placement of settings.placements) {
        stats.set(placement.id, { impressions: 0, clicks: 0, pages: new Map() });
      }
      for (const event of events) {
        const item = stats.get(event.placementId);
        if (!item) continue;
        item.impressions += 1;
        item.pages.set(event.pagePath, (item.pages.get(event.pagePath) || 0) + 1);
      }
      const slugToPlacement = new Map(
        settings.placements.filter((placement) => placement.shortSlug).map((placement) => [placement.shortSlug!, placement.id]),
      );
      const linkToPlacement = new Map(smartlinkRows.map((row) => [row.linkId, slugToPlacement.get(row.slug)!]));
      const linkIds = new Set(smartlinkRows.map((row) => row.linkId));
      for (const click of clicks) {
        if (!linkIds.has(click.linkId)) continue;
        const placementId = linkToPlacement.get(click.linkId);
        const item = placementId ? stats.get(placementId) : undefined;
        if (!item) continue;
        item.clicks += 1;
        let sourcePage = "Direct";
        if (click.referer) {
          try {
            const referer = new URL(click.referer);
            sourcePage = referer.pathname || "/";
          } catch {
            sourcePage = click.referer.slice(0, 150);
          }
        }
        item.pages.set(sourcePage, (item.pages.get(sourcePage) || 0) + 1);
      }
      const byPlacement = settings.placements.map((placement) => {
        const item = stats.get(placement.id)!;
        return {
          id: placement.id,
          name: placement.name,
          format: placement.format,
          position: placement.position,
          impressions: item.impressions,
          smartlinkClicks: item.clicks,
          byPage: Array.from(item.pages.entries()).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count),
        };
      });
      res.json({
        days,
        totalImpressions: byPlacement.reduce((sum, item) => sum + item.impressions, 0),
        totalSmartlinkClicks: byPlacement.reduce((sum, item) => sum + item.smartlinkClicks, 0),
        byPlacement,
      });
    } catch (error) {
      console.error("[adsterra] analytics error", error);
      res.status(500).json({ message: "Unable to load Adsterra analytics." });
    }
  });
}
