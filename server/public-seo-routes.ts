import type { Express } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
import { blogPosts, pluginStudioProjects, shopProducts, users } from "@shared/schema";
import { db } from "./db";

const SITE_ORIGIN = "https://taskdrip.online";

const STATIC_SITEMAP_PATHS: { path: string; priority: string; changefreq: string }[] = [
  { path: "", priority: "1.0", changefreq: "daily" },
  { path: "/tasks", priority: "0.9", changefreq: "daily" },
  { path: "/p2p-hub", priority: "0.9", changefreq: "daily" },
  { path: "/shop", priority: "0.9", changefreq: "daily" },
  { path: "/influencers", priority: "0.9", changefreq: "daily" },
  { path: "/brands", priority: "0.9", changefreq: "daily" },
  { path: "/blog", priority: "0.8", changefreq: "daily" },
  { path: "/realtrainai-ai-training-guide", priority: "0.7", changefreq: "monthly" },
  { path: "/breedskool", priority: "0.8", changefreq: "weekly" },
  { path: "/leaderboard", priority: "0.7", changefreq: "daily" },
  { path: "/advertise", priority: "0.7", changefreq: "monthly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/tdrip", priority: "0.7", changefreq: "weekly" },
  { path: "/docs", priority: "0.5", changefreq: "monthly" },
  { path: "/hire-developer", priority: "0.6", changefreq: "monthly" },
  { path: "/roadmap", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", priority: "0.3", changefreq: "yearly" },
  { path: "/disclaimer", priority: "0.3", changefreq: "yearly" },
];

export function registerPublicSeoRoutes(app: Express) {
  app.get("/robots.txt", (_req, res) => {
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send([
        "# Taskdrip robots.txt",
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /api/",
        "Disallow: /dashboard",
        "Disallow: /profile/",
        "Disallow: /user-profile/",
        "Disallow: /brand-dashboard",
        "",
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
        "",
      ].join("\n"));
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const urls = new Map<string, { lastmod?: string; priority?: string; changefreq?: string }>();

    for (const page of STATIC_SITEMAP_PATHS) {
      urls.set(`${SITE_ORIGIN}${page.path}`, {
        lastmod: today,
        priority: page.priority,
        changefreq: page.changefreq,
      });
    }

    const addUrl = (url: string, lastmod?: string) => {
      urls.set(url, { lastmod, changefreq: "weekly", priority: "0.6" });
    };

    try {
      const publishedPosts = await db.select({
        slug: blogPosts.slug,
        updatedAt: blogPosts.updatedAt,
      }).from(blogPosts).where(eq(blogPosts.isPublished, true)).limit(50000);
      for (const post of publishedPosts) {
        if (post.slug) {
          const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString().slice(0, 10) : today;
          addUrl(`${SITE_ORIGIN}/blog/${encodeURIComponent(post.slug)}`, lastmod);
        }
      }
    } catch {}

    try {
      const products = await db.select({
        id: shopProducts.id,
        pluginSlug: pluginStudioProjects.slug,
      }).from(shopProducts)
        .leftJoin(pluginStudioProjects, eq(pluginStudioProjects.shopProductId, shopProducts.id))
        .where(and(
          eq(shopProducts.isActive, true),
          or(isNull(pluginStudioProjects.id), eq(pluginStudioProjects.status, "published")),
        ))
        .limit(500);
      for (const product of products) {
        addUrl(`${SITE_ORIGIN}/shop/product/${encodeURIComponent(product.pluginSlug || product.id)}`);
      }
    } catch {}

    for (const userType of ["influencer", "brand"] as const) {
      try {
        const profiles = await db.select({ id: users.id }).from(users)
          .where(eq(users.userType, userType)).limit(500);
        const path = userType === "brand" ? "brand" : "influencers";
        for (const profile of profiles) {
          addUrl(`${SITE_ORIGIN}/${path}/${encodeURIComponent(profile.id)}`);
        }
      } catch {}
    }

    const escapeXml = (value: string) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
    const entries = Array.from(urls.entries()).map(([url, meta]) => {
      const fields = [
        `<loc>${escapeXml(url)}</loc>`,
        meta.lastmod ? `<lastmod>${meta.lastmod}</lastmod>` : "",
        meta.changefreq ? `<changefreq>${meta.changefreq}</changefreq>` : "",
        meta.priority ? `<priority>${meta.priority}</priority>` : "",
      ].filter(Boolean).join("");
      return `  <url>${fields}</url>`;
    });

    res
      .status(200)
      .set("Cache-Control", "public, max-age=3600")
      .type("application/xml")
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`);
  });
}
