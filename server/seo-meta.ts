import { db } from "./db";
import { campaigns, blogPosts, shopProducts, users, courseEnrollments, p2pListings, pageSeoSettings, pwaSettings, pluginStudioProjects } from "@shared/schema";
import { and, eq, or } from "drizzle-orm";

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

// Static fallback SEO for every known route — used when page_seo_settings has
// no DB entry yet (e.g. fresh deploy before seeding completes).
const STATIC_DEFAULTS: Record<string, Omit<Meta, "image">> = {
  "/": {
    title: "Taskdrip — Earn Crypto Completing Brand Tasks | Web3 Influencer Platform",
    description: "Taskdrip is the #1 Web3 influencer marketplace. Complete social media tasks, promote brands, and earn USDT crypto rewards. Join 15,000+ verified creators earning daily.",
    keywords: "earn crypto online, web3 influencer platform, brand campaigns, earn USDT, crypto rewards",
    canonicalUrl: "https://taskdrip.online",
    type: "website",
  },
  "/tasks": {
    title: "Browse Brand Campaigns & Earn Crypto | Taskdrip Tasks",
    description: "Browse hundreds of paid brand campaigns on Taskdrip. Follow, like, share, and create content for top brands. Earn USDT and crypto rewards instantly upon approval.",
    keywords: "paid social media tasks, brand campaigns, earn USDT tasks, crypto campaign rewards",
    canonicalUrl: "https://taskdrip.online/tasks",
  },
  "/p2p-hub": {
    title: "P2P Crypto Marketplace — Buy & Sell with Escrow Protection | Taskdrip",
    description: "Trade crypto, digital services, and products peer-to-peer with escrow protection on Taskdrip. Safe, fast P2P transactions with verified sellers and buyer protection.",
    keywords: "P2P crypto marketplace, buy sell crypto, peer to peer trading, escrow crypto",
    canonicalUrl: "https://taskdrip.online/p2p-hub",
  },
  "/shop": {
    title: "Digital Products & Creator Tools | Taskdrip Shop",
    description: "Shop premium digital products, creator tools, e-books, and resources on Taskdrip. Curated selection of high-quality digital downloads for creators and marketers.",
    keywords: "digital products shop, creator tools, e-books, digital downloads",
    canonicalUrl: "https://taskdrip.online/shop",
  },
  "/influencers": {
    title: "Find Verified Influencers & Content Creators | Taskdrip Directory",
    description: "Discover thousands of verified influencers and content creators on Taskdrip. Filter by niche, following, engagement rate, and country.",
    keywords: "influencer directory, find influencers, content creators, verified influencers",
    canonicalUrl: "https://taskdrip.online/influencers",
  },
  "/brands": {
    title: "Discover Brands & Sponsorship Opportunities | Taskdrip",
    description: "Browse top brands on Taskdrip looking for content creators and influencers. Find sponsorship opportunities, brand deals, and paid collaborations.",
    keywords: "brand deals, sponsor opportunities, brand collaborations, influencer sponsorship",
    canonicalUrl: "https://taskdrip.online/brands",
  },
  "/feed": {
    title: "Creator Feed — Latest Posts from Taskdrip Influencers",
    description: "Browse the latest posts, updates, and content from Taskdrip's creator community. Follow top influencers and discover trending content.",
    keywords: "creator feed, influencer posts, web3 creators, taskdrip community",
    canonicalUrl: "https://taskdrip.online/feed",
  },
  "/blog": {
    title: "Taskdrip Blog — Crypto, Influencer Marketing & Web3 Insights",
    description: "Read the latest articles on crypto earnings, influencer marketing strategies, Web3 trends, and creator economy tips on the Taskdrip blog.",
    keywords: "crypto blog, influencer marketing blog, web3 tips, creator economy",
    canonicalUrl: "https://taskdrip.online/blog",
    type: "website",
  },
  "/breedskool": {
    title: "BreedSkool — Learn Tech Skills & Earn | Taskdrip Training",
    description: "BreedSkool offers tech training in Web Development, AI Content Creation, Social Media Monetization, Trading, and more. Learn skills and earn crypto rewards.",
    keywords: "tech training Nigeria, web development course, AI content creation, breedskool",
    canonicalUrl: "https://taskdrip.online/breedskool",
  },
  "/leaderboard": {
    title: "Top Earners Leaderboard — Who's Earning the Most on Taskdrip?",
    description: "See the top-earning creators and influencers on Taskdrip's leaderboard. Compete to reach the top and earn bigger crypto rewards. Updated in real-time.",
    keywords: "top earners, leaderboard, taskdrip top creators, earn most crypto",
    canonicalUrl: "https://taskdrip.online/leaderboard",
  },
  "/advertise": {
    title: "Advertise on Taskdrip — Reach 15,000+ Verified Influencers",
    description: "Launch your influencer marketing campaign on Taskdrip. Reach 15,000+ verified creators across Africa and globally. Affordable rates, guaranteed deliverables.",
    keywords: "advertise with influencers, influencer marketing campaign, brand promotion",
    canonicalUrl: "https://taskdrip.online/advertise",
  },
  "/about": {
    title: "About Taskdrip — Our Mission to Empower Creators with Crypto",
    description: "Taskdrip is a Web3 influencer marketing platform built to help content creators earn crypto from brand campaigns. Learn about our story, mission, and values.",
    keywords: "about taskdrip, web3 influencer platform, crypto creator economy",
    canonicalUrl: "https://taskdrip.online/about",
  },
  "/contact": {
    title: "Contact Taskdrip — Support, Partnerships & General Inquiries",
    description: "Get in touch with Taskdrip for support, brand partnerships, or general inquiries. Our team responds within 24 hours.",
    keywords: "contact taskdrip, taskdrip support, brand partnership inquiry",
    canonicalUrl: "https://taskdrip.online/contact",
  },
  "/tdrip": {
    title: "$TDRIP Token — Taskdrip's Reward Points & Future Crypto Token",
    description: "Learn about $TDRIP, Taskdrip's points and future crypto token. Earn $TDRIP completing tasks, climbing the leaderboard, and referring friends.",
    keywords: "TDRIP token, taskdrip crypto token, earn TDRIP, web3 reward token",
    canonicalUrl: "https://taskdrip.online/tdrip",
  },
  "/signup": {
    title: "Sign Up Free — Join Taskdrip & Start Earning Crypto Today",
    description: "Create your free Taskdrip account in 60 seconds. Start completing brand tasks, earning USDT crypto, and building your creator income today.",
    keywords: "join taskdrip, sign up crypto, create account, start earning crypto",
    canonicalUrl: "https://taskdrip.online/signup",
  },
  "/login": {
    title: "Login to Taskdrip — Access Your Creator Dashboard",
    description: "Log in to your Taskdrip account to manage campaigns, check your crypto earnings, and access your creator dashboard.",
    keywords: "taskdrip login, creator dashboard",
    canonicalUrl: "https://taskdrip.online/login",
  },
  "/get-started": {
    title: "Get Started on Taskdrip — Earn or Hire in Minutes",
    description: "Pick your path: earn as a creator or hire verified influencers as a brand. Get up and running on Taskdrip in minutes.",
    keywords: "get started taskdrip, join taskdrip, creator onboarding",
    canonicalUrl: "https://taskdrip.online/get-started",
  },
};

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
    const [pluginListing] = await db.select({
      project: pluginStudioProjects,
      product: shopProducts,
    }).from(pluginStudioProjects)
      .innerJoin(shopProducts, eq(pluginStudioProjects.shopProductId, shopProducts.id))
      .where(and(
        or(eq(pluginStudioProjects.slug, key), eq(pluginStudioProjects.shopProductId, key)),
        eq(pluginStudioProjects.status, "published"),
        eq(shopProducts.isActive, true),
      )).limit(1);
    if (pluginListing) {
      const canonicalUrl = `${origin}/shop/product/${encodeURIComponent(pluginListing.project.slug)}`;
      return {
        title: pluginListing.project.seoTitle || `${pluginListing.project.name} | Taskdrip Shop`,
        description: trimText(pluginListing.project.seoDescription || pluginListing.project.shortDescription || pluginListing.product.description || ""),
        image: absolutize(origin, pluginListing.product.featuredImage),
        keywords: pluginListing.project.seoKeywords || undefined,
        url: canonicalUrl,
        canonicalUrl,
      };
    }
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

  // Last resort: static compile-time defaults so every known route always has
  // proper OG tags even before the DB seed has completed.
  const staticDefault = STATIC_DEFAULTS[pathname];
  if (staticDefault) {
    return { ...staticDefault, image: undefined };
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
