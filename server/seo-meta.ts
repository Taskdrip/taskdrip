import { db } from "./db";
import { campaigns, blogPosts, shopProducts, users, courses, p2pListings, pageSeoSettings, pwaSettings, pluginStudioProjects } from "@shared/schema";
import { and, eq, or } from "drizzle-orm";
import { load } from "cheerio";

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
  articleHtml?: string;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const trimText = (s: string, max = 200) => {
  const clean = s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
};

function cleanArticleHtml(html: string): string {
  const $ = load(`<div id="article-content">${html || ""}</div>`, {}, false);
  const article = $("#article-content");
  article.find("script,style,iframe,object,embed,form,button,input,textarea,select,meta,link").remove();
  article.find("article").each((_, element) => {
    $(element).replaceWith($(element).contents());
  });
  article.find("*").each((_, element) => {
    const node = $(element);
    for (const name of Object.keys(element.attribs || {})) {
      const value = node.attr(name) || "";
      if (/^on/i.test(name) || (["href", "src", "xlink:href"].includes(name.toLowerCase()) && /^\s*javascript:/i.test(value))) {
        node.removeAttr(name);
      }
    }
  });
  article.find("h1").each((_, element) => {
    const heading = $("<h2></h2>").html($(element).html() || "");
    $(element).replaceWith(heading);
  });
  return article.html() || "";
}

function renderArticleHtml(post: typeof blogPosts.$inferSelect, origin: string, image?: string): string {
  const title = escapeHtml(post.title);
  const date = post.publishedAt ? new Date(post.publishedAt).toISOString() : "";
  const visibleDate = date ? new Date(date).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";
  const featuredImage = image
    ? `<img src="${escapeHtml(image)}" alt="${title}" width="1200" loading="eager" />`
    : "";
  const excerpt = post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : "";
  const meta = visibleDate
    ? `<p><span>Taskdrip Team</span> · <time datetime="${escapeHtml(date)}">${escapeHtml(visibleDate)}</time></p>`
    : `<p>Taskdrip Team</p>`;

  return `<main class="seo-prerendered-article"><article><header><nav aria-label="Breadcrumb"><a href="${origin}/blog">Blog</a> / ${escapeHtml(post.category || "Article")}</nav><h1>${title}</h1>${meta}${excerpt}${featuredImage}</header><div>${cleanArticleHtml(post.content)}</div></article></main>`;
}

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
    title: "Taskdrip | Brand Campaigns and Creator Collaboration",
    description: "Taskdrip connects brands with content creators for campaign work. Explore brand campaigns, creator profiles, and tools for managing collaborations and payouts.",
    keywords: "earn crypto online, web3 influencer platform, brand campaigns, earn USDT, crypto rewards",
    canonicalUrl: "https://taskdrip.online",
    type: "website",
  },
  "/tasks": {
    title: "Browse Brand Campaigns and Creator Tasks | Taskdrip",
    description: "Explore current brand campaigns and creator tasks on Taskdrip. Review campaign requirements, deliverables, eligibility, and reward details before applying.",
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
    title: "Find Influencers and Content Creators | Taskdrip",
    description: "Browse creator profiles on Taskdrip and compare available niches, audience details, engagement information, and collaboration options.",
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
  "/realtrainai-ai-training-guide": {
    title: "RealTrainAI Guide: AI Trainer Jobs, Pay & How to Apply | Taskdrip",
    description: "An independent guide to RealTrainAI: AI trainer work, application steps, pay claims, matching uncertainty, location caveats and safer ways to evaluate the opportunity.",
    keywords: "AI trainer jobs, AI training jobs, remote AI training work, AI data annotation, RealTrainAI",
    canonicalUrl: "https://taskdrip.online/realtrainai-ai-training-guide",
    type: "article",
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "RealTrainAI Guide: AI Trainer Jobs, Pay & How to Apply",
      description: "An independent, practical guide to AI training work, RealTrainAI's application process, reported pay, project matching, location limits and safety.",
      author: { "@type": "Organization", name: "Taskdrip" },
      publisher: { "@type": "Organization", name: "Taskdrip", url: "https://taskdrip.online" },
      mainEntityOfPage: "https://taskdrip.online/realtrainai-ai-training-guide",
      datePublished: "2026-10-12",
      dateModified: "2026-10-12",
    }),
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
    title: "Advertise with Creators on Taskdrip",
    description: "Learn how brands can use Taskdrip to plan creator campaigns, review deliverables, and manage collaborations with content creators.",
    keywords: "advertise with influencers, influencer marketing campaign, brand promotion",
    canonicalUrl: "https://taskdrip.online/advertise",
  },
  "/about": {
    title: "About Taskdrip | Creator and Brand Campaign Platform",
    description: "Learn about Taskdrip, a platform for connecting brands and creators through campaign listings, creator profiles, and collaboration tools.",
    keywords: "about taskdrip, web3 influencer platform, crypto creator economy",
    canonicalUrl: "https://taskdrip.online/about",
  },
  "/contact": {
    title: "Contact Taskdrip — Support, Partnerships & General Inquiries",
    description: "Get in touch with Taskdrip for support, brand partnerships, or general inquiries. Our team responds within 24 hours.",
    keywords: "contact taskdrip, taskdrip support, brand partnership inquiry",
    canonicalUrl: "https://taskdrip.online/contact",
  },
  "/privacy": {
    title: "Privacy Policy | Taskdrip",
    description: "Read how Taskdrip handles account, usage, cookie, analytics, and advertising information.",
    canonicalUrl: "https://taskdrip.online/privacy",
  },
  "/terms": {
    title: "Terms of Service | Taskdrip",
    description: "Review the terms that apply when using Taskdrip's creator and brand services.",
    canonicalUrl: "https://taskdrip.online/terms",
  },
  "/cookies": {
    title: "Cookie Policy | Taskdrip",
    description: "Learn how Taskdrip uses essential, analytics, and advertising cookies and how to manage them.",
    canonicalUrl: "https://taskdrip.online/cookies",
  },
  "/disclaimer": {
    title: "Disclaimer | Taskdrip",
    description: "Read important information about Taskdrip's services, earnings, digital assets, and third-party links.",
    canonicalUrl: "https://taskdrip.online/disclaimer",
  },
  "/docs": {
    title: "Taskdrip Documentation",
    description: "Guides to Taskdrip accounts, campaigns, creator profiles, payouts, and platform tools.",
    canonicalUrl: "https://taskdrip.online/docs",
  },
  "/documentation": {
    title: "Taskdrip Documentation",
    description: "Guides to Taskdrip accounts, campaigns, creator profiles, payouts, and platform tools.",
    canonicalUrl: "https://taskdrip.online/docs",
  },
  "/hire-developer": {
    title: "Hire a Developer | Taskdrip",
    description: "Find a developer for your project through Taskdrip. Review the hiring process and submit a project request.",
    canonicalUrl: "https://taskdrip.online/hire-developer",
  },
  "/roadmap": {
    title: "Taskdrip Roadmap",
    description: "Explore planned product updates and the development direction for Taskdrip.",
    canonicalUrl: "https://taskdrip.online/roadmap",
  },
  "/tokenomics": {
    title: "Taskdrip Roadmap",
    description: "Explore planned product updates and the development direction for Taskdrip.",
    canonicalUrl: "https://taskdrip.online/roadmap",
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
    let post: typeof blogPosts.$inferSelect | undefined;
    try {
      const [found] = await db.select().from(blogPosts).where(
        and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)),
      );
      post = found;
    } catch (error: any) {
      console.error("Blog SEO lookup failed:", error.message);
      return {
        title: "Article temporarily unavailable | Taskdrip",
        description: "This article is temporarily unavailable.",
        noIndex: true,
      };
    }
    if (post) {
      const image = absolutize(origin, post.featuredImage || ogImageFromHtml(post.content));
      const publishedAt = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
      const modifiedAt = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishedAt;
      const canonicalUrl = `${origin}/blog/${encodeURIComponent(post.slug)}`;
      const structuredData = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: trimText(post.metaDescription || post.excerpt || post.content || "", 160),
        image: image ? [image] : undefined,
        datePublished: publishedAt,
        dateModified: modifiedAt,
        author: { "@type": "Organization", name: "Taskdrip", url: `${origin}/about` },
        publisher: { "@type": "Organization", name: "Taskdrip", url: origin },
        mainEntityOfPage: canonicalUrl,
        articleSection: post.category || undefined,
        keywords: post.seoKeywords || undefined,
      });
      return {
        title: post.title,
        description: trimText(post.metaDescription || post.excerpt || post.content || "", 160),
        image,
        type: "article",
        canonicalUrl,
        structuredData,
        articleHtml: renderArticleHtml(post, origin, image),
      };
    }
    return {
      title: "Blog post not found | Taskdrip",
      description: "This Taskdrip blog post is unavailable.",
      noIndex: true,
    };
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
    pathname.match(/^\/p\/([^/?#]+)/) ||
    pathname.match(/^\/u\/([^/?#]+)/) ||
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
        canonicalUrl: user.userType === "brand"
          ? `${origin}/brand/${encodeURIComponent(user.id)}`
          : user.userType === "admin"
            ? `${origin}/profile/${encodeURIComponent(user.id)}`
            : `${origin}/influencers/${encodeURIComponent(user.id)}`,
        noIndex: user.userType === "admin",
      };
    }
  }

  // /breedskool/:id — published course
  const courseMatch = pathname.match(/^\/breedskool\/([^/?#]+)/);
  if (courseMatch && !["campaign", "onsite"].includes(courseMatch[1])) {
    const key = decodeURIComponent(courseMatch[1]);
    try {
      const [course] = await db.select().from(courses).where(
        and(eq(courses.id, key), eq(courses.isPublished, true)),
      );
      if (course) {
        return {
          title: `${course.title} | BreedSkool`,
          description: trimText(course.shortDescription || course.description || ""),
          image: absolutize(origin, course.thumbnail),
        };
      }
    } catch {}
    return {
      title: "Course not found | BreedSkool",
      description: "This BreedSkool course is unavailable.",
      noIndex: true,
    };
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
  const fullUrl = meta.canonicalUrl || `${origin}${url.split("?")[0].split("#")[0]}`;
  const image = meta.image || fallbackImage;
  const title = meta.title;
  const description = meta.description ? trimText(meta.description, 160) : undefined;
  const type = meta.type || "website";

  // Remove any existing og/twitter/description tags so the per-page values win when crawlers parse.
  let out = html
    .replace(/<meta\s+(?:name|property)=["'](?:og:title|og:description|og:image|og:image:width|og:image:height|og:url|og:type|og:site_name|og:locale|twitter:card|twitter:title|twitter:description|twitter:image|description|keywords|robots)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");

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
    `<meta property="og:site_name" content="Taskdrip" />`,
    `<meta property="og:locale" content="en_NG" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:site" content="@taskdrip" />`,
    title ? `<meta name="twitter:title" content="${escapeHtml(title)}" />` : "",
    description ? `<meta name="twitter:description" content="${escapeHtml(description)}" />` : "",
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  let result = out.replace(/<\/head>/i, `    ${tags}\n  </head>`);

  const schemas: unknown[] = [{
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${origin}/#organization`, name: "Taskdrip", url: origin, logo: `${origin}/taskdrip-logo.jpg` },
      { "@type": "WebSite", "@id": `${origin}/#website`, name: "Taskdrip", url: origin, publisher: { "@id": `${origin}/#organization` } },
    ],
  }];
  if (meta.structuredData) {
    try { schemas.push(JSON.parse(meta.structuredData)); } catch {}
  }
  schemas.forEach((schema, index) => {
    const safeStructuredData = JSON.stringify(schema)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");
    const marker = index === 0 ? `data-seo-ld="site"` : `data-seo-page-ld="true"`;
    const ldTag = `\n  <script type="application/ld+json" ${marker}>${safeStructuredData}</script>`;
    result = result.replace(/<\/head>/i, `${ldTag}\n  </head>`);
  });

  if (meta.articleHtml) {
    result = result.replace(
      /(<div\s+id=["']root["'][^>]*>)([\s\S]*?)(<\/div>)/i,
      (_match, open: string, existing: string, close: string) => `${open}${meta.articleHtml}${existing}${close}`,
    );
  }

  return result;
}

export async function buildSeoHtml(html: string, req: { protocol: string; get: (h: string) => string | undefined; originalUrl: string }): Promise<string> {
  try {
    // This project has one production canonical origin; do not let preview or
    // untrusted Host headers create alternate canonicals or sitemap URLs.
    const origin = "https://taskdrip.online";
    const pathname = (req.originalUrl || "/").split("?")[0];

    const fallbackImage = await defaultOgImage(origin);
    const meta = (await lookupRoute(origin, pathname)) || { image: fallbackImage };
    if (isPrivateRoute(pathname)) meta.noIndex = true;
    return injectMeta(html, origin, req.originalUrl || "/", meta, fallbackImage);
  } catch (err) {
    console.error("SEO meta injection failed:", err);
    return html;
  }
}

const NOINDEX_EXACT_PATHS = new Set([
  "/login", "/signup", "/admin", "/admin-login", "/admin-dashboard", "/forgot-password",
  "/dashboard", "/brand-dashboard", "/profile", "/user-profile",
  "/messages", "/chat", "/wallet", "/ledger", "/payout-requests",
  "/payment-deposit", "/escrow-payment", "/subscription", "/my-orders",
  "/my-plugins", "/my-digital-library", "/my-training", "/referrals",
  "/campaigns", "/my-campaigns", "/creator-studio", "/p2p-deals", "/profile-edit",
  "/short-links",
]);

const NOINDEX_PATH_PREFIXES = [
  "/admin/", "/dashboard/", "/brand-dashboard/",
  "/profile/", "/user-profile/", "/campaigns/",
  "/direct-hire/", "/orders/", "/shop/checkout/",
  "/my-campaigns/", "/certificates/", "/short-links/",
  "/p2p-deals/", "/payout-requests/",
];

function isPrivateRoute(pathname: string): boolean {
  return NOINDEX_EXACT_PATHS.has(pathname) ||
    NOINDEX_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    /^\/breedskool\/[^/]+\/(?:learn|certificate)(?:\/|$)/.test(pathname);
}
