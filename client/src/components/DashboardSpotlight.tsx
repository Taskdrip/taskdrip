import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight, Megaphone, Star, ShoppingBag, GraduationCap, Briefcase, Wallet, BadgeCheck } from "lucide-react";
import type { SpotlightItem, SponsoredAd } from "@shared/schema";

interface DashboardSpotlightProps {
  page: string; // "brand_dashboard" | "influencer_dashboard" | "feed" | etc
  className?: string;
  /** When true, additionally surface 2 products, 2 courses, 2 campaigns, 2 p2p deals */
  includeAutoFeatured?: boolean;
  title?: string;
  subtitle?: string;
}

const TYPE_DEFAULT_LINK: Record<string, (id: string) => string> = {
  shop_product: (id) => `/shop/product/${id}`,
  product: (id) => `/shop/product/${id}`,
  campaign: (id) => `/campaigns/${id}`,
  course: (id) => `/breedskool/${id}`,
  service: (id) => `/influencers/${id}`,
  p2p: (id) => `/p2p/${id}`,
  ad: (id) => `/ads/${id}`,
};

const TYPE_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  shop_product: { label: "Product", icon: ShoppingBag, color: "from-emerald-500 to-teal-600" },
  product:      { label: "Product", icon: ShoppingBag, color: "from-emerald-500 to-teal-600" },
  course:       { label: "Course",  icon: GraduationCap, color: "from-blue-500 to-indigo-600" },
  campaign:     { label: "Campaign",icon: Megaphone, color: "from-pink-500 to-rose-600" },
  service:      { label: "Service", icon: Briefcase, color: "from-violet-500 to-purple-600" },
  p2p:          { label: "P2P Deal",icon: Wallet, color: "from-amber-500 to-orange-600" },
  ad:           { label: "Sponsored", icon: Star, color: "from-fuchsia-500 to-pink-600" },
  custom:       { label: "Featured",icon: Sparkles, color: "from-amber-500 to-orange-600" },
};

interface SlideItem {
  id: string;
  kind: "spotlight" | "ad";
  title: string;
  description?: string | null;
  image?: string | null;
  link?: string | null;
  badge?: string | null;
  itemType: string;
  raw?: any;
}

export function DashboardSpotlight({
  page,
  className = "",
  includeAutoFeatured = true,
  title = "Spotlight & Featured",
  subtitle = "Hand-picked products, courses, campaigns, P2P deals & ads",
}: DashboardSpotlightProps) {
  const { data: spotlightItems = [] } = useQuery<SpotlightItem[]>({
    queryKey: ["/api/spotlight", { page }],
    queryFn: async () => {
      const r = await fetch(`/api/spotlight?page=${encodeURIComponent(page)}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: ads = [] } = useQuery<SponsoredAd[]>({
    queryKey: ["/api/ads/active", { placement: page }],
    queryFn: async () => {
      const r = await fetch(`/api/ads/active?placement=${encodeURIComponent(page)}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  // Auto-featured live items: 2 products, 2 courses, 2 campaigns, 2 p2p
  const { data: autoProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/shop/products/featured"],
    enabled: includeAutoFeatured,
    staleTime: 60_000,
  });
  const { data: autoCourses = [] } = useQuery<any[]>({
    queryKey: ["/api/courses"],
    enabled: includeAutoFeatured,
    staleTime: 60_000,
  });
  const { data: autoCampaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    enabled: includeAutoFeatured,
    staleTime: 60_000,
  });
  const { data: autoP2P = [] } = useQuery<any[]>({
    queryKey: ["/api/p2p/listings/featured"],
    enabled: includeAutoFeatured,
    staleTime: 60_000,
  });

  const slides: SlideItem[] = useMemo(() => {
    const sp: SlideItem[] = (spotlightItems as any[]).map((it) => {
      let link: string | null = it.customLink || null;
      if (!link && it.itemId && TYPE_DEFAULT_LINK[it.itemType]) {
        link = TYPE_DEFAULT_LINK[it.itemType](it.itemId);
      }
      return {
        id: `sp-${it.id}`,
        kind: "spotlight" as const,
        title: it.customTitle || it.name,
        description: it.customDescription,
        image: it.customImage,
        link,
        badge: it.badgeLabel,
        itemType: it.itemType,
        raw: it,
      };
    });
    const adSlides: SlideItem[] = (ads as any[]).map((ad) => ({
      id: `ad-${ad.id}`,
      kind: "ad" as const,
      title: ad.title,
      description: ad.description,
      image: ad.imageUrl,
      link: ad.linkUrl,
      badge: "AD",
      itemType: "ad",
      raw: ad,
    }));

    // Build auto-featured slides (2 of each type)
    const productSlides: SlideItem[] = (autoProducts as any[]).slice(0, 2).map((p) => ({
      id: `auto-product-${p.id}`,
      kind: "spotlight" as const,
      title: p.name || p.title || "Featured product",
      description: p.shortDescription || p.description || (p.price ? `$${p.price}` : null),
      image: p.imageUrl || p.image || (Array.isArray(p.images) ? p.images[0] : null),
      link: `/shop/${p.id}`,
      badge: "Featured",
      itemType: "shop_product",
      raw: p,
    }));
    const activeCampaigns = (autoCampaigns as any[]).filter((c) => c.status === "active" || c.status === "approved" || !c.status);
    const campaignSlides: SlideItem[] = activeCampaigns.slice(0, 2).map((c) => ({
      id: `auto-campaign-${c.id}`,
      kind: "spotlight" as const,
      title: c.title || "Featured campaign",
      description: c.description || (c.reward ? `Reward: $${c.reward}` : c.brandName || null),
      image: c.imageUrl || c.thumbnailUrl || null,
      link: `/campaigns/${c.id}`,
      badge: c.reward ? `$${c.reward}` : "Hot",
      itemType: "campaign",
      raw: c,
    }));
    const courseSlides: SlideItem[] = (autoCourses as any[]).slice(0, 2).map((c) => ({
      id: `auto-course-${c.id}`,
      kind: "spotlight" as const,
      title: c.title || c.name || "Featured course",
      description: c.shortDescription || c.description || c.tagline || null,
      image: c.thumbnailUrl || c.imageUrl || c.coverImage || null,
      link: `/breedskool/${c.id}`,
      badge: c.priceTdrip ? `${c.priceTdrip} $TDRIP` : "Learn",
      itemType: "course",
      raw: c,
    }));
    const p2pSlides: SlideItem[] = (autoP2P as any[]).slice(0, 2).map((l) => ({
      id: `auto-p2p-${l.id}`,
      kind: "spotlight" as const,
      title: l.title || `${l.type === "buy" ? "Buy" : "Sell"} ${l.asset || "$TDRIP"}`,
      description: l.description || (l.pricePerUnit ? `$${l.pricePerUnit} / unit` : null),
      image: l.imageUrl || null,
      link: `/p2p-hub/listing/${l.id}`,
      badge: l.type === "buy" ? "Buying" : "Selling",
      itemType: "p2p",
      raw: l,
    }));

    // Interleave for visual variety: admin-curated first, then auto, with ads sprinkled in
    const autoMix: SlideItem[] = [];
    const maxAuto = Math.max(productSlides.length, courseSlides.length, campaignSlides.length, p2pSlides.length);
    for (let i = 0; i < maxAuto; i++) {
      if (productSlides[i]) autoMix.push(productSlides[i]);
      if (campaignSlides[i]) autoMix.push(campaignSlides[i]);
      if (courseSlides[i]) autoMix.push(courseSlides[i]);
      if (p2pSlides[i]) autoMix.push(p2pSlides[i]);
    }

    const out: SlideItem[] = [];
    const max = Math.max(sp.length, adSlides.length);
    for (let i = 0; i < max; i++) {
      if (i < sp.length) out.push(sp[i]);
      if (i < adSlides.length) out.push(adSlides[i]);
    }
    // Append auto-featured items after admin-curated content
    out.push(...autoMix);
    return out;
  }, [spotlightItems, ads, autoProducts, autoCourses, autoCampaigns, autoP2P]);

  const [, setLocation] = useLocation();
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const pausedRef = useRef(false);
  const total = slides.length;

  const goTo = useCallback((idx: number) => {
    if (fading || total <= 1) return;
    setFading(true);
    setTimeout(() => { setActive(((idx % total) + total) % total); setFading(false); }, 220);
  }, [fading, total]);

  const next = useCallback(() => goTo((active + 1) % Math.max(total, 1)), [active, total, goTo]);
  const prev = useCallback(() => goTo((active - 1 + Math.max(total, 1)) % Math.max(total, 1)), [active, total, goTo]);

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      next();
    }, 5500);
    return () => clearInterval(t);
  }, [next, total]);

  const recordImpression = (slide: SlideItem) => {
    if (slide.kind === "ad") {
      fetch(`/api/ads/${(slide.raw as any).id}/impression`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pageUrl: window.location.pathname }),
      }).catch(() => {});
    }
  };

  const recordClick = (slide: SlideItem) => {
    if (slide.kind === "ad") {
      fetch(`/api/ads/${(slide.raw as any).id}/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pageUrl: window.location.pathname }),
      }).catch(() => {});
    }
  };

  // Track impression when active slide changes
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (slides.length === 0) return;
    const slide = slides[active];
    if (!slide) return;
    if (!seenRef.current.has(slide.id)) {
      seenRef.current.add(slide.id);
      recordImpression(slide);
    }
  }, [active, slides]);

  if (slides.length === 0) return null;

  const slide = slides[active];
  const meta = TYPE_LABEL[slide.itemType] || TYPE_LABEL.custom;
  const Icon = meta.icon;

  const handlePause = () => { pausedRef.current = true; };
  const handleResume = () => { pausedRef.current = false; };

  const handleSlideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordClick(slide);
    if (slide.link) {
      const isExternal = /^https?:\/\//.test(slide.link);
      if (isExternal) {
        window.open(slide.link, "_blank", "noopener,noreferrer");
      } else {
        setLocation(slide.link);
      }
    }
  };

  return (
    <section
      className={`relative mb-2 ${className}`}
      data-testid={`dashboard-spotlight-${page}`}
    >
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white" data-testid={`spotlight-heading-${page}`}>
            {title}
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        {total > 1 && <span className="text-xs text-gray-400">{total} featured</span>}
      </div>

      <div
        className="relative rounded-[2rem] overflow-hidden cursor-pointer group min-h-[280px] sm:min-h-[310px] shadow-2xl shadow-indigo-200/70 dark:shadow-black/40 select-none"
        onClick={handleSlideClick}
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
        onTouchCancel={handleResume}
        onPointerDown={handlePause}
        onPointerUp={handleResume}
        onPointerLeave={handleResume}
        onPointerCancel={handleResume}
        data-testid={`spotlight-slide-${slide.id}`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.color}`} />
        {slide.image && (
          <img
            src={slide.image}
            alt={slide.title}
            className={`absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-all duration-500 group-hover:scale-105 ${fading ? "opacity-0" : ""}`}
            data-testid={`img-spotlight-${slide.id}`}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_32%),linear-gradient(90deg,rgba(15,23,42,0.92),rgba(49,46,129,0.72),rgba(15,23,42,0.18))]" />

        <div className={`relative p-6 md:p-10 min-h-[280px] sm:min-h-[310px] grid md:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-8 items-end transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400 font-bold text-xs px-3 py-1">
                <Icon className="w-3 h-3 mr-1" /> {meta.label}
              </Badge>
              {slide.badge && (
                <Badge className={`${slide.kind === "ad" ? "bg-fuchsia-500 hover:bg-fuchsia-500" : "bg-red-500 hover:bg-red-500"} text-white text-xs font-bold`}>
                  {slide.badge}
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border border-white/30 text-xs hover:bg-white/20">
                {slide.kind === "ad" ? "Sponsored" : "Editor's pick"}
              </Badge>
            </div>
            <h2
              className="text-2xl md:text-3xl font-extrabold text-white mb-2 max-w-2xl leading-tight line-clamp-2"
              data-testid={`spotlight-slide-title-${slide.id}`}
            >
              {slide.title}
            </h2>
            {slide.description && (
              <p className="text-white/80 text-sm max-w-xl line-clamp-2 mb-4">{slide.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <span className="text-white/70 text-sm flex items-center gap-1">
                <BadgeCheck className="w-4 h-4" /> Hand-picked by Taskdrip
              </span>
            </div>
            {slide.link ? (
              /^https?:\/\//.test(slide.link) ? (
                <a
                  href={slide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); recordClick(slide); }}
                >
                  <Button
                    className="bg-white text-gray-900 hover:bg-yellow-50 font-bold px-6 rounded-xl shadow-lg"
                    data-testid={`spotlight-cta-${slide.id}`}
                  >
                    View {meta.label} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </a>
              ) : (
                <Link href={slide.link} onClick={(e) => { e.stopPropagation(); recordClick(slide); }}>
                  <Button
                    className="bg-white text-gray-900 hover:bg-yellow-50 font-bold px-6 rounded-xl shadow-lg"
                    data-testid={`spotlight-cta-${slide.id}`}
                  >
                    View {meta.label} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )
            ) : null}
          </div>
          <div className="hidden md:block">
            <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md p-5 text-white shadow-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-3">Spotlight</p>
              <h3 className="text-xl font-bold mb-2">Discover hand-picked drops curated by the Taskdrip team.</h3>
              <p className="text-sm text-white/70">Tap any card to dive in — autoplay pauses while you explore.</p>
            </div>
          </div>
        </div>
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all"
            data-testid={`spotlight-prev-${page}`}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-violet-600" : "w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"}`}
                data-testid={`spotlight-dot-${page}-${i}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all"
            data-testid={`spotlight-next-${page}`}
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}
