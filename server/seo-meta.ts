import { db } from "./db";
import { campaigns, blogPosts, shopProducts, users, courseEnrollments, p2pListings, pageSeoSettings, pwaSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

type Meta = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  structuredData?: string | null;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const trimText = (s: string, max = 200) => {
  const clean = s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
};

const absolutize = (origin: string, src?: string | null) => {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${origin}${src}`;
  return `${origin}/${src}`;
};

const ogImageFromHtml = (html?: string | null): string | undefined => {
  if (!html) return undefined;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : undefined;
};

async function defaultOgImage(origin: string): Promise<string> {
  try {
    const [pwa] = await db.select().from(pwaSettings).limit(1);
    const fromPwa = (pwa as any)?.defaultOgImage;
    if (fromPwa) return absolutize(origin, fromPwa) as string;
  } catch {}
  return `${origin}/taskdrip-logo.jpg`;
}

async function lookupRoute(origin: string, pathname: string): Promise<Meta | null> {
  // /blog/:slug
  const blogMatch = pathname.match(/^\/blog\/([^/?#]+)/);
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1]);
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    if (post) {
      const image = (post as any).featuredImage || ogImageFromHtml((post as any).content);
      return {
        title: post.title,
        description: trimText((post as any).metaDescription || (post as any).excerpt || (post as any).content || ""),
        image: absolutize(origin, image),
        type: "article",
      };
    }
  }

  // /campaigns/:id
  const campaignMatch = pathname.match(/^\/campaigns\/([^/?#]+)/);
  if (campaignMatch) {
    const id = decodeURIComponent(campaignMatch[1]);
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (c) {
      return {
        title: `${c.title} | Taskdrip`,
        description: trimText(c.description || ""),
        image: absolutize(origin, (c as any).featureImage),
      };
    }
  }

  // /shop/product/:slug or /shop/product/:id
  const shopMatch = pathname.match(/^\/shop\/product\/([^/?#]+)/);
  if (shopMatch) {
    const key = decodeURIComponent(shopMatch[1]);
    const [p] =
      (await db.select().from(shopProducts).where(eq(shopProducts.id, key))) ||
      [];
    let product = p;
    if (!product) {
      try {
        const [bySlug] = await db.select().from(shopProducts).where(eq((shopProducts as any).slug, key));
        product = bySlug;
      } catch {}
    }
    if (product) {
      return {
        title: `${(product as any).title || (product as any).name} | Taskdrip Shop`,
        description: trimText((product as any).description || ""),
        image: absolutize(origin, (product as any).featuredImage),
      };
    }
  }

  // /influencers/:username or /brand/:id or /user-profile/:id
  const profileMatch =
    pathname.match(/^\/influencers\/([^/?#]+)/) ||
    pathname.match(/^\/brand\/([^/?#]+)/) ||
    pathname.match(/^\/user-profile\/([^/?#]+)/);
  if (profileMatch) {
    const key = decodeURIComponent(profileMatch[1]);
    let user: any = null;
    try {
      const [byId] = await db.select().from(users).where(eq(users.id, key));
      user = byId || null;
    } catch {}
    if (!user) {
      try {
        const [byUsername] = await db.select().from(users).where(eq((users as any).username, key));
        user = byUsername || null;
      } catch {}
    }
    if (user) {
      const name =
        (user as any).companyName ||
        `${(user as any).firstName || ""} ${(user as any).lastName || ""}`.trim() ||
        (user as any).username ||
        "Profile";
      return {
        title: `${name} | Taskdrip`,
        description: trimText((user as any).seoDescription || (user as any).bio || `${name}'s profile on Taskdrip.`),
        image: absolutize(
          origin,
          (user as any).seoOgImage || (user as any).profileImageUrl || (user as any).profileImage,
        ),
        type: "profile",
      };
    }
  }

  // /breedskool/:slug — course
  const courseMatch = pathname.match(/^\/breedskool\/([^/?#]+)/);
  if (courseMatch) {
    const key = decodeURIComponent(courseMatch[1]);
    try {
      const [course] = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, key));
      if (course) {
        return {
          title: `${(course as any).title || "Course"} | BreedSkool`,
          description: trimText((course as any).description || (course as any).summary || ""),
          image: absolutize(origin, (course as any).coverImage || (course as any).thumbnail),
        };
      }
    } catch {}
  }

  // /p2p/:id
  const p2pMatch = pathname.match(/^\/p2p\/([^/?#]+)/);
  if (p2pMatch) {
    const id = decodeURIComponent(p2pMatch[1]);
    try {
      const [listing] = await db.select().from(p2pListings).where(eq(p2pListings.id, id));
      if (listing) {
        return {
          title: `${(listing as any).title || "P2P listing"} | Taskdrip`,
          description: trimText((listing as any).description || ""),
          image: absolutize(origin, (listing as any).featuredImage),
        };
      }
    } catch {}
  }

  // Fallback: page_seo_settings by direct slug match (e.g. /home → home)
  const slug = pathname === "/" ? "home" : pathname.replace(/^\//, "").split("/")[0];
  if (slug) {
    try {
      const [page] = await db.select().from(pageSeoSettings).where(eq(pageSeoSettings.pageSlug, slug));
      if (page) {
        return {
          title: (page as any).metaTitle || (page as any).pageTitle,
          description: (page as any).metaDescription,
          image: absolutize(origin, (page as any).ogImage || (page as any).twitterImage),
          keywords: (page as any).keywords || undefined,
          canonicalUrl: (page as any).canonicalUrl || undefined,
          noIndex: !!(page as any).noIndex,
          structuredData: (page as any).structuredData || null,
        };
      }
    } catch {}
  }

  return null;
}

function injectMeta(html: string, origin: string, url: string, meta: Meta, fallbackImage: string): string {
  const fullUrl = meta.canonicalUrl || `${origin}${url}`;
  const image = meta.image || fallbackImage;
  const title = meta.title;
  const description = meta.description;
  const type = meta.type || "website";

  // Remove any existing og/twitter/description tags so the per-page values win when crawlers parse.
  let out = html
    .replace(/<meta\s+(?:name|property)=["'](?:og:title|og:description|og:image|og:image:width|og:image:height|og:url|og:type|og:site_name|twitter:card|twitter:title|twitter:description|twitter:image|description|keywords|robots)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

  if (title) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  }

  const tags = [
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : "",
    meta.keywords ? `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />` : "",
    meta.noIndex ? `<meta name="robots" content="noindex, nofollow" />` : `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${escapeHtml(fullUrl)}" />`,
    title ? `<meta property="og:title" content="${escapeHtml(title)}" />` : "",
    description ? `<meta property="og:description" content="${escapeHtml(description)}" />` : "",
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta property="og:url" content="${escapeHtml(fullUrl)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    image ? `<meta property="og:image:width" content="1200" />` : "",
    image ? `<meta property="og:image:height" content="630" />` : "",
    `<meta property="og:site_name" content="Taskdrip" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:site" content="@taskdrip" />`,
    title ? `<meta name="twitter:title" content="${escapeHtml(title)}" />` : "",
    description ? `<meta name="twitter:description" content="${escapeHtml(description)}" />` : "",
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  let result = out.replace(/<\/head>/i, `    ${tags}\n  </head>`);

  // Inject JSON-LD structured data
  if (meta.structuredData) {
    try {
      // Validate it's valid JSON
      JSON.parse(meta.structuredData);
      const ldTag = `\n  <script type="application/ld+json">${meta.structuredData}</script>`;
      result = result.replace(/<\/head>/i, `${ldTag}\n  </head>`);
    } catch {}
  }

  return result;
}

export async function buildSeoHtml(html: string, req: { protocol: string; get: (h: string) => string | undefined; originalUrl: string }): Promise<string> {
  try {
    const host = req.get("host") || "localhost";
    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    const origin = `${proto}://${host}`;
    const pathname = (req.originalUrl || "/").split("?")[0];

    const fallbackImage = await defaultOgImage(origin);
    const meta = (await lookupRoute(origin, pathname)) || { image: fallbackImage };
    return injectMeta(html, origin, req.originalUrl || "/", meta, fallbackImage);
  } catch (err) {
    console.error("SEO meta injection failed:", err);
    return html;
  }
}
