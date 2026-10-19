import type { Express } from "express";
import { and, eq, isNull, or } from "drizzle-orm";
import { appSettings, blogPosts, courses, pageSeoSettings, p2pListings, pluginStudioProjects, portfolioItems, shopProducts, users } from "@shared/schema";
import { db, pool } from "./db";

const SITE_ORIGIN = "https://taskdrip.online";

const STATIC_SITEMAP_PATHS: { path: string; title: string; priority: string; changefreq: string }[] = [
  { path: "", title: "Taskdrip", priority: "1.0", changefreq: "daily" },
  { path: "/tasks", title: "Tasks and campaigns", priority: "0.9", changefreq: "daily" },
  { path: "/p2p-hub", title: "P2P marketplace", priority: "0.9", changefreq: "daily" },
  { path: "/shop", title: "Shop", priority: "0.9", changefreq: "daily" },
  { path: "/downloads", title: "Free Downloads", priority: "0.9", changefreq: "daily" },
  { path: "/influencers", title: "Creator directory", priority: "0.9", changefreq: "daily" },
  { path: "/brands", title: "Brands", priority: "0.8", changefreq: "daily" },
  { path: "/blog", title: "Blog", priority: "0.8", changefreq: "daily" },
  { path: "/feed", title: "Creator feed", priority: "0.6", changefreq: "daily" },
  { path: "/realtrainai-ai-training-guide", title: "RealTrainAI guide", priority: "0.7", changefreq: "monthly" },
  { path: "/abraham-tahbat", title: "Abraham Tahbat — Developer Portfolio", priority: "0.6", changefreq: "monthly" },
  { path: "/olajumoke-owoeye", title: "Olajumoke Owoeye — Creator Portfolio", priority: "0.6", changefreq: "monthly" },
  { path: "/breedskool", title: "BreedSkool", priority: "0.8", changefreq: "weekly" },
  { path: "/leaderboard", title: "Leaderboard", priority: "0.7", changefreq: "daily" },
  { path: "/advertise", title: "Advertise with Taskdrip", priority: "0.7", changefreq: "monthly" },
  { path: "/about", title: "About Taskdrip", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", title: "Contact Taskdrip", priority: "0.6", changefreq: "monthly" },
  { path: "/tdrip", title: "TDRIP", priority: "0.7", changefreq: "weekly" },
  { path: "/docs", title: "Documentation", priority: "0.5", changefreq: "monthly" },
  { path: "/hire-developer", title: "Hire a developer", priority: "0.6", changefreq: "monthly" },
  { path: "/get-started", title: "Get started", priority: "0.6", changefreq: "monthly" },
  { path: "/roadmap", title: "Roadmap", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", title: "Terms of service", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", title: "Privacy policy", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", title: "Cookie policy", priority: "0.3", changefreq: "yearly" },
  { path: "/disclaimer", title: "Disclaimer", priority: "0.3", changefreq: "yearly" },
];

export type PublicSeoUrl = {
  url: string;
  path: string;
  title: string;
  type: string;
  lastmod?: string;
  priority: string;
  changefreq: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
};

const textOnly = (value?: string | null) =>
  (value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();

function day(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

export async function getPublicSeoUrls(): Promise<PublicSeoUrl[]> {
  const pages: PublicSeoUrl[] = STATIC_SITEMAP_PATHS.map((page) => ({
    url: `${SITE_ORIGIN}${page.path}`,
    path: page.path || "/",
    title: page.title,
    type: "page",
    priority: page.priority,
    changefreq: page.changefreq,
  }));
  const [seoSettings, publishedPosts, products, creators, brands, publishedCourses, activeP2pListings, portfolioRows] = await Promise.all([
    db.select().from(pageSeoSettings),
    db.select({
      title: blogPosts.title,
      slug: blogPosts.slug,
      metaDescription: blogPosts.metaDescription,
      excerpt: blogPosts.excerpt,
      content: blogPosts.content,
      updatedAt: blogPosts.updatedAt,
    }).from(blogPosts).where(eq(blogPosts.isPublished, true)),
    db.select({
      id: shopProducts.id,
      title: shopProducts.title,
      description: shopProducts.shortDescription,
      fullDescription: shopProducts.description,
      updatedAt: shopProducts.updatedAt,
      pluginSlug: pluginStudioProjects.slug,
    }).from(shopProducts)
      .leftJoin(pluginStudioProjects, eq(pluginStudioProjects.shopProductId, shopProducts.id))
      .where(and(
        eq(shopProducts.isActive, true),
        or(isNull(pluginStudioProjects.id), eq(pluginStudioProjects.status, "published")),
      )),
    db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      bio: users.bio,
      seoDescription: users.seoDescription,
      updatedAt: users.updatedAt,
    })
      .from(users).where(eq(users.userType, "creator")),
    db.select({
      id: users.id,
      companyName: users.companyName,
      username: users.username,
      bio: users.bio,
      seoDescription: users.seoDescription,
      updatedAt: users.updatedAt,
    })
      .from(users).where(eq(users.userType, "brand")),
    db.select({
      id: courses.id,
      title: courses.title,
      description: courses.shortDescription,
      fullDescription: courses.description,
      updatedAt: courses.updatedAt,
    }).from(courses).where(eq(courses.isPublished, true)),
    db.select({
      id: p2pListings.id,
      title: p2pListings.title,
      description: p2pListings.description,
      listingType: p2pListings.listingType,
      updatedAt: p2pListings.updatedAt,
    }).from(p2pListings).where(eq(p2pListings.status, "approved")),
    db.select({ userId: portfolioItems.userId }).from(portfolioItems),
  ]);

  const seoBySlug = new Map(seoSettings.map((row) => [row.pageSlug, row]));
  const visiblePages = pages.filter((page) => {
    const slug = page.path === "/" ? "home" : page.path.slice(1);
    const setting = seoBySlug.get(slug);
    if (!setting) return true;
    if (setting.noIndex) return false;
    page.metaTitle = setting.metaTitle || setting.pageTitle;
    page.metaDescription = setting.metaDescription;
    if (setting.canonicalUrl) {
      try {
        const canonical = new URL(setting.canonicalUrl, SITE_ORIGIN);
        if (canonical.origin !== SITE_ORIGIN) return false;
        page.url = canonical.toString();
        page.path = canonical.pathname;
      } catch {
        return false;
      }
    }
    return true;
  });

  for (const post of publishedPosts) {
    if (!post.slug) continue;
    const path = `/blog/${encodeURIComponent(post.slug)}`;
    pages.push({
      url: `${SITE_ORIGIN}${path}`,
      path,
      title: post.title,
      type: "blog",
      lastmod: day(post.updatedAt),
      priority: "0.7",
      changefreq: "monthly",
      metaTitle: post.title,
      metaDescription: post.metaDescription || post.excerpt || textOnly(post.content),
    });
  }
  for (const product of products) {
    const path = `/shop/product/${encodeURIComponent(product.pluginSlug || product.id)}`;
    pages.push({
      url: `${SITE_ORIGIN}${path}`,
      path,
      title: product.title,
      type: "product",
      lastmod: day(product.updatedAt),
      priority: "0.6",
      changefreq: "weekly",
      metaTitle: product.title,
      metaDescription: product.description || product.fullDescription,
    });
  }
  for (const creator of creators) {
    const path = `/influencers/${encodeURIComponent(creator.id)}`;
    const title = `${`${creator.firstName || ""} ${creator.lastName || ""}`.trim() || creator.username || "Creator"} | Taskdrip`;
    pages.push({
      url: `${SITE_ORIGIN}${path}`,
      path,
      title,
      type: "creator",
      lastmod: day(creator.updatedAt),
      priority: "0.5",
      changefreq: "monthly",
      metaTitle: title,
      metaDescription: creator.seoDescription || creator.bio,
    });
  }
  for (const brand of brands) {
    const path = `/brand/${encodeURIComponent(brand.id)}`;
    const title = `${brand.companyName || brand.username || "Brand"} | Taskdrip`;
    pages.push({
      url: `${SITE_ORIGIN}${path}`,
      path,
      title,
      type: "brand",
      lastmod: day(brand.updatedAt),
      priority: "0.5",
      changefreq: "monthly",
      metaTitle: title,
      metaDescription: brand.seoDescription || brand.bio,
    });
  }
  for (const course of publishedCourses) {
    const path = `/breedskool/${encodeURIComponent(course.id)}`;
    pages.push({
      url: `${SITE_ORIGIN}${path}`,
      path,
      title: course.title,
      type: "course",
      lastmod: day(course.updatedAt),
      priority: "0.6",
      changefreq: "weekly",
      metaTitle: `${course.title} | BreedSkool`,
      metaDescription: course.description || course.fullDescription,
    });
  }
  for (const listing of activeP2pListings) {
    const path = `/p2p/${encodeURIComponent(listing.id)}`;
    pages.push({
      url: `${SITE_ORIGIN}${path}`,
      path,
      title: listing.title,
      type: "p2p-listing",
      lastmod: day(listing.updatedAt),
      priority: "0.5",
      changefreq: "weekly",
      metaTitle: listing.title,
      metaDescription: listing.description,
    });
  }
  const portfolioUserIds = new Set(portfolioRows.map((row) => row.userId));
  for (const creator of creators) {
    if (!portfolioUserIds.has(creator.id)) continue;
    const identity = creator.username || creator.id;
    const path = `/creator-portfolio/${encodeURIComponent(identity)}`;
    const name = `${`${creator.firstName || ""} ${creator.lastName || ""}`.trim() || creator.username || "Creator"} | Creator Portfolio`;
    pages.push({
      url: `${SITE_ORIGIN}${path}`,
      path,
      title: name,
      type: "portfolio",
      lastmod: day(creator.updatedAt),
      priority: "0.5",
      changefreq: "monthly",
      metaTitle: name,
      metaDescription: creator.seoDescription || creator.bio,
    });
  }
  const downloadPages: PublicSeoUrl[] = [];
  try {
    const [downloads, categories, preachers] = await Promise.all([
      pool.query(
        `SELECT title,slug,seo_title,seo_description,updated_at
         FROM free_download_items WHERE publication_status='published' ORDER BY updated_at DESC`,
      ),
      pool.query(
        `SELECT name,slug FROM free_download_categories WHERE is_active=TRUE ORDER BY sort_order,name`,
      ),
      pool.query(
        `SELECT DISTINCT p.full_name,p.slug FROM free_download_preachers p
         JOIN free_download_items d ON d.preacher_id=p.id
         WHERE d.publication_status='published'`,
      ),
    ]);
    for (const category of categories.rows) {
      const path = `/downloads/category/${encodeURIComponent(category.slug)}`;
      downloadPages.push({
        url: `${SITE_ORIGIN}${path}`,
        path,
        title: `${category.name} | Free Downloads`,
        type: "download-category",
        priority: "0.7",
        changefreq: "daily",
      });
    }
    for (const preacher of preachers.rows) {
      const path = `/downloads/preachers/${encodeURIComponent(preacher.slug)}`;
      downloadPages.push({
        url: `${SITE_ORIGIN}${path}`,
        path,
        title: `${preacher.full_name} sermons | Taskdrip`,
        type: "preacher",
        priority: "0.6",
        changefreq: "weekly",
      });
    }
    for (const download of downloads.rows) {
      const path = `/downloads/${encodeURIComponent(download.slug)}`;
      downloadPages.push({
        url: `${SITE_ORIGIN}${path}`,
        path,
        title: download.seo_title || download.title,
        type: "free-download",
        lastmod: day(download.updated_at),
        priority: "0.7",
        changefreq: "weekly",
        metaTitle: download.seo_title || download.title,
        metaDescription: download.seo_description,
      });
    }
  } catch (error) {
    // Keep the existing sitemap available before the additive feature migration is applied.
    console.warn("[SEO] Free Downloads sitemap entries unavailable:", error);
  }
  return Array.from(new Map(
    visiblePages
      .concat(pages.slice(STATIC_SITEMAP_PATHS.length))
      .concat(downloadPages)
      .map((page) => [page.url, page]),
  ).values());
}

export function registerPublicSeoRoutes(app: Express) {
  app.get("/:key.txt", async (req, res, next) => {
    const key = String(req.params.key || "");
    if (!/^[a-f0-9]{32}$/.test(key)) return next();
    try {
      const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, "seo_indexnow_key")).limit(1);
      if (setting?.value !== key) return res.sendStatus(404);
      res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(key);
    } catch {
      res.sendStatus(404);
    }
  });

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
        "Disallow: /campaigns/",
        "Disallow: /direct-hire/",
        "Disallow: /orders/",
        "Disallow: /shop/checkout",
        "Disallow: /p2p-deals",
        "Disallow: /my-",
        "Disallow: /user-profile/",
        "Disallow: /brand-dashboard",
        "",
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
        "",
      ].join("\n"));
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const urls = await getPublicSeoUrls();
      const escapeXml = (value: string) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
      const entries = urls.map((meta) => {
      const fields = [
        `<loc>${escapeXml(meta.url)}</loc>`,
        meta.lastmod ? `<lastmod>${meta.lastmod}</lastmod>` : "",
        meta.changefreq ? `<changefreq>${meta.changefreq}</changefreq>` : "",
        meta.priority ? `<priority>${meta.priority}</priority>` : "",
      ].filter(Boolean).join("");
      return `  <url>${fields}</url>`;
    });

      res
        .status(200)
        .set("Cache-Control", "public, max-age=300")
        .type("application/xml")
        .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`);
    } catch (error) {
      console.error("[SEO] Sitemap generation failed:", error);
      res.status(503).type("text/plain").send("Sitemap temporarily unavailable");
    }
  });
}
