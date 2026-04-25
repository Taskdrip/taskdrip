import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight, Megaphone, Star, ShoppingBag, GraduationCap, Briefcase, Wallet } from "lucide-react";
import type { SpotlightItem, SponsoredAd } from "@shared/schema";

interface DashboardSpotlightProps {
  page: "brand_dashboard" | "influencer_dashboard";
  className?: string;
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

export function DashboardSpotlight({ page, className = "" }: DashboardSpotlightProps) {
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
    // Interleave: spotlight then ad then spotlight
    const out: SlideItem[] = [];
    const max = Math.max(sp.length, adSlides.length);
    for (let i = 0; i < max; i++) {
      if (i < sp.length) out.push(sp[i]);
      if (i < adSlides.length) out.push(adSlides[i]);
    }
    return out;
  }, [spotlightItems, ads]);

  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setActive((cur) => (cur + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[active] as HTMLElement | undefined;
    if (child) {
      track.scrollTo({ left: child.offsetLeft - 8, behavior: "smooth" });
    }
  }, [active]);

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

  const next = () => setActive((c) => (c + 1) % slides.length);
  const prev = () => setActive((c) => (c - 1 + slides.length) % slides.length);

  return (
    <section
      className={`relative ${className}`}
      data-testid={`dashboard-spotlight-${page}`}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white" data-testid={`spotlight-heading-${page}`}>
              Spotlight & Featured
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Hand-picked products, services, courses, P2P deals & ads</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={prev} data-testid={`spotlight-prev-${page}`}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={next} data-testid={`spotlight-next-${page}`}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {slides.map((slide, i) => {
          const meta = TYPE_LABEL[slide.itemType] || TYPE_LABEL.custom;
          const Icon = meta.icon;
          const isActive = i === active;

          const card = (
            <div
              className={`relative shrink-0 snap-start w-[88%] sm:w-[58%] md:w-[44%] lg:w-[32%] rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer group ${
                isActive
                  ? "border-amber-400 shadow-2xl shadow-amber-500/20 scale-100"
                  : "border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              }`}
              data-testid={`spotlight-slide-${slide.id}`}
              onClick={() => { recordClick(slide); }}
            >
              {/* Image / hero */}
              <div className={`relative aspect-[16/9] bg-gradient-to-br ${meta.color}`}>
                {slide.image ? (
                  <img src={slide.image} alt={slide.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-16 h-16 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <Badge className="bg-white/90 text-gray-900 hover:bg-white text-[10px] font-bold uppercase tracking-wide shadow">
                    <Icon className="w-3 h-3 mr-1" /> {meta.label}
                  </Badge>
                  {slide.badge && (
                    <Badge className={`${slide.kind === "ad" ? "bg-fuchsia-500" : "bg-red-500"} text-white border-0 text-[10px] font-bold shadow`}>
                      {slide.badge}
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white text-base sm:text-lg font-extrabold line-clamp-1 drop-shadow" data-testid={`spotlight-slide-title-${slide.id}`}>
                    {slide.title}
                  </h3>
                  {slide.description && (
                    <p className="text-white/80 text-xs line-clamp-1 mt-0.5">{slide.description}</p>
                  )}
                </div>
              </div>

              {/* CTA strip */}
              <div className="bg-white dark:bg-gray-900 px-4 py-2.5 flex items-center justify-between">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {slide.kind === "ad" ? "Sponsored" : "Editor's pick"}
                </div>
                <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 px-3" data-testid={`spotlight-cta-${slide.id}`}>
                  View
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          );

          if (slide.link) {
            const isExternal = /^https?:\/\//.test(slide.link);
            if (isExternal) {
              return (
                <a key={slide.id} href={slide.link} target="_blank" rel="noopener noreferrer" className="contents" onClick={() => recordClick(slide)}>
                  {card}
                </a>
              );
            }
            return (
              <Link key={slide.id} href={slide.link} className="contents" onClick={() => recordClick(slide)}>
                {card}
              </Link>
            );
          }
          return <div key={slide.id} className="contents">{card}</div>;
        })}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-amber-500" : "w-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"}`}
            data-testid={`spotlight-dot-${page}-${i}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
