import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SeoHead } from "@/components/SeoHead";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

function setMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function ensureScript(id: string, build: () => HTMLScriptElement) {
  if (document.getElementById(id)) return;
  const s = build();
  s.id = id;
  document.head.appendChild(s);
}

function getOrCreateSessionId() {
  try {
    const KEY = "td_session_id";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/**
 * Mounts once at the root of the app. Pulls /api/pwa-settings and:
 *   - Injects GA4 (gtag.js)
 *   - Injects Google Tag Manager
 *   - Sets google-site-verification + msvalidate.01 meta
 *   - Tracks SPA page views via gtag and the internal /api/analytics/track endpoint
 */
export function GlobalSeo() {
  const [location] = useLocation();
  const trackedRef = useRef<string | null>(null);

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/pwa-settings"],
    staleTime: 5 * 60 * 1000,
  });

  // Inject scripts and verification tags once settings are loaded
  useEffect(() => {
    if (!settings) return;

    if (settings.googleSiteVerification) {
      setMetaByName("google-site-verification", settings.googleSiteVerification);
    }
    if (settings.bingVerification) {
      setMetaByName("msvalidate.01", settings.bingVerification);
    }

    if (settings.gaTrackingId && /^G-[A-Z0-9]+$/i.test(settings.gaTrackingId)) {
      ensureScript("ga4-loader", () => {
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.gaTrackingId)}`;
        return s;
      });
      ensureScript("ga4-init", () => {
        const s = document.createElement("script");
        s.text = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${settings.gaTrackingId}', { send_page_view: false });`;
        return s;
      });
    }

    if (settings.gtmId && /^GTM-[A-Z0-9]+$/i.test(settings.gtmId)) {
      ensureScript("gtm-loader", () => {
        const s = document.createElement("script");
        s.text = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${settings.gtmId}');`;
        return s;
      });
    }
  }, [settings?.gaTrackingId, settings?.gtmId, settings?.googleSiteVerification, settings?.bingVerification]);

  // Track SPA page views: GA + internal endpoint
  useEffect(() => {
    if (trackedRef.current === location) return;
    trackedRef.current = location;

    if (settings?.gaTrackingId && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location,
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    // Skip internal tracking for admin/api/dashboard
    if (
      location.startsWith("/admin") ||
      location.startsWith("/api") ||
      location.startsWith("/dashboard") ||
      location.startsWith("/brand-dashboard")
    ) return;

    const sessionId = getOrCreateSessionId();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: location,
        referrer: document.referrer || null,
        sessionId,
      }),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }, [location, settings?.gaTrackingId]);

  return null;
}

// Map URL paths → admin SEO slug + sensible defaults
const ROUTE_SEO: Record<string, { slug: string; title: string; description: string }> = {
  "/": { slug: "home", title: "Taskdrip — Web3 Influencer Marketplace | Earn USDT & TON", description: "The leading SocialFi influencer marketplace. Brands launch campaigns, creators earn USDT, TON & $TDRIP. Verified profiles, on-chain payouts, instant escrow." },
  "/tasks": { slug: "tasks", title: "Browse Tasks — Earn Crypto for Social Actions | Taskdrip", description: "Earn USDT & $TDRIP for likes, follows, retweets, and content creation. Hundreds of brand-funded tasks updated daily." },
  "/shop": { slug: "shop", title: "Creator Shop — Templates, Boosts & Digital Goods | Taskdrip", description: "Buy and sell creator tools, presets, templates, and growth boosts. Pay with USDT, TON, or $TDRIP." },
  "/influencers": { slug: "influencers", title: "Find Verified Influencers — Web3 Creator Discovery | Taskdrip", description: "Discover verified Web3 influencers across TikTok, Instagram, X, YouTube and Telegram. Filter by niche, audience and price." },
  "/brands": { slug: "brands", title: "Brands on Taskdrip — Crypto-Native Advertisers", description: "Browse brands hiring influencers. Connect with Web3, gaming, DeFi, and lifestyle brands paying in stablecoins." },
  "/feed": { slug: "feed", title: "Creator Feed — Latest Posts & Drops | Taskdrip", description: "The freshest posts from verified Taskdrip creators. Tip in $TDRIP, follow your favourites, never miss a drop." },
  "/blog": { slug: "blog", title: "Taskdrip Blog — Web3 Marketing & Creator Economy Insights", description: "Guides, case studies and news on the Web3 creator economy, SocialFi, influencer marketing and crypto payouts." },
  "/breedskool": { slug: "breedskool", title: "BreedSkool — Web3 Creator Academy | Taskdrip", description: "Free and pro courses to grow as a Web3 influencer. Learn audience growth, monetization, brand deals and crypto payouts." },
  "/leaderboard": { slug: "leaderboard", title: "Leaderboard — Top Earners & Creators | Taskdrip", description: "See the top-earning creators, biggest spenders and most active brands on Taskdrip." },
  "/advertise": { slug: "advertise", title: "Advertise on Taskdrip — Reach Crypto-Native Audiences", description: "Run banner ads, sponsored campaigns and creator collaborations on Taskdrip. Targeting tools, transparent pricing." },
  "/about": { slug: "about", title: "About Taskdrip — The Web3 Influencer Marketplace", description: "Taskdrip connects brands and creators with on-chain payouts, verified profiles and the $TDRIP rewards economy." },
  "/contact": { slug: "contact", title: "Contact Taskdrip — Support & Partnerships", description: "Talk to the Taskdrip team. Partnerships, press, support and creator onboarding." },
  "/tdrip": { slug: "tdrip", title: "$TDRIP — Taskdrip Rewards Token & Points", description: "Learn about $TDRIP, the rewards token powering Taskdrip. Earn, spend and unlock perks across the marketplace." },
  "/p2p-hub": { slug: "p2p-hub", title: "P2P Hub — Trade USDT, TON & $TDRIP Peer-to-Peer | Taskdrip", description: "Buy and sell crypto peer-to-peer with escrow protection. USDT, TON and $TDRIP — fast, low fee, on-chain." },
  "/signup": { slug: "signup", title: "Create your Taskdrip account — Free Sign Up", description: "Join Taskdrip in seconds. Earn $TDRIP, claim your welcome bonus, and start completing brand tasks today." },
  "/login": { slug: "login", title: "Log in to Taskdrip", description: "Log in to your Taskdrip account to manage tasks, campaigns, payouts and your creator profile." },
  "/get-started": { slug: "get-started", title: "Get Started on Taskdrip — Earn or Hire in Minutes", description: "Pick your path: earn as a creator or hire verified influencers as a brand. Get up and running in minutes." },
};

function matchRouteSeo(location: string) {
  if (ROUTE_SEO[location]) return ROUTE_SEO[location];
  if (location.startsWith("/blog/")) return { slug: "blog-post", title: "Taskdrip Blog", description: "Insights on the Web3 creator economy from Taskdrip." };
  if (location.startsWith("/influencers/")) return { slug: "creator-profile", title: "Creator Profile | Taskdrip", description: "Verified creator profile on Taskdrip." };
  if (location.startsWith("/brand/")) return { slug: "brand-profile", title: "Brand Profile | Taskdrip", description: "Verified brand profile on Taskdrip." };
  if (location.startsWith("/shop/product/")) return { slug: "shop-product", title: "Product | Taskdrip Shop", description: "Buy creator products with USDT, TON or $TDRIP." };
  if (location.startsWith("/breedskool/")) return { slug: "course", title: "Course | BreedSkool", description: "Web3 creator course on BreedSkool by Taskdrip." };
  if (location.startsWith("/p2p/")) return { slug: "p2p-listing", title: "P2P Listing | Taskdrip", description: "Peer-to-peer crypto trade on Taskdrip." };
  if (location.startsWith("/campaigns/")) return { slug: "campaign", title: "Campaign | Taskdrip", description: "Brand campaign on Taskdrip." };
  return null;
}

/** Route-aware SEO. Mount once; updates head whenever location changes. */
export function RouteSeo() {
  const [location] = useLocation();
  // Skip private/admin paths
  if (
    location.startsWith("/admin") ||
    location.startsWith("/dashboard") ||
    location.startsWith("/brand-dashboard") ||
    location.startsWith("/profile") ||
    location.startsWith("/user-profile")
  ) return null;
  const match = matchRouteSeo(location);
  if (!match) return null;
  return <PageSeo slug={match.slug} fallbackTitle={match.title} fallbackDescription={match.description} />;
}

interface PageSeoProps {
  slug: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

/**
 * Per-page SEO loader. Fetches /api/seo/page/:slug and applies it via SeoHead.
 * Falls back to provided defaults if no admin-configured SEO exists yet.
 */
export function PageSeo({ slug, fallbackTitle, fallbackDescription }: PageSeoProps) {
  const { data } = useQuery<any>({
    queryKey: [`/api/seo/page/${slug}`],
    staleTime: 5 * 60 * 1000,
  });
  const { data: globalSettings } = useQuery<any>({
    queryKey: ["/api/pwa-settings"],
    staleTime: 5 * 60 * 1000,
  });

  const title = data?.metaTitle || data?.pageTitle || fallbackTitle;
  const description = data?.metaDescription || fallbackDescription;
  const ogImage = data?.ogImage || data?.twitterImage || globalSettings?.defaultOgImage;
  const canonicalUrl =
    data?.canonicalUrl ||
    (typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined);
  const noIndex = !!data?.noIndex;
  let jsonLd: object | undefined;
  if (data?.structuredData) {
    try { jsonLd = JSON.parse(data.structuredData); } catch {}
  }

  return (
    <SeoHead
      title={title}
      description={description}
      keywords={data?.keywords}
      ogImage={ogImage}
      canonicalUrl={canonicalUrl}
      jsonLd={jsonLd}
      noIndex={noIndex}
    />
  );
}
