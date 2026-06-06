import { useState, useEffect, useCallback, useRef } from "react";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePageContent } from "@/hooks/usePageContent";
import { AdSlot } from "@/components/ui/ad-slot";
import { AdPopupZone } from "@/components/ui/ad-popup";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Users,
  DollarSign,
  CheckCircle,
  Rocket,
  Target,
  Sparkles,
  Clock,
  Briefcase,
  ShoppingBag,
  BookOpen,
  ArrowUpRight,
  Coins,
  Crown,
  Trophy,
} from "lucide-react";
import { TIER_CONFIG, TIER_ORDER, formatFollowers, type CreatorTier } from "@/lib/tiers";

interface Slide {
  id: string;
  badge?: string | null;
  headline: string;
  subheadline?: string | null;
  ctaPrimaryLabel?: string | null;
  ctaPrimaryLink?: string | null;
  ctaSecondaryLabel?: string | null;
  ctaSecondaryLink?: string | null;
  backgroundImage?: string | null;
  overlayColor?: string | null;
  accentColor?: string | null;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: "s1",
    badge: "For Influencers",
    headline: "Stop Getting Ghosted by Brands.",
    subheadline: "You create the content. Brands earn the revenue. Taskdrip lets you browse live paid campaigns, apply in one click, and get paid in USDT when your work is approved. 15,000+ influencers are already earning.",
    ctaPrimaryLabel: "Start Earning Now",
    ctaPrimaryLink: "/signup?type=creator",
    ctaSecondaryLabel: "Browse Tasks",
    ctaSecondaryLink: "/tasks",
    backgroundImage: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/50",
    accentColor: "from-orange-400 via-pink-400 to-purple-400",
  },
  {
    id: "s2",
    badge: "For Brands",
    headline: "Tired of Wasting Budget on Fake Influencers?",
    subheadline: "Reach 15,000+ verified influencers across TikTok, Instagram, YouTube, X, and Telegram. Protect campaign funds with escrow — approve every submission before a single dollar is released.",
    ctaPrimaryLabel: "Launch a Campaign",
    ctaPrimaryLink: "/signup?type=brand",
    ctaSecondaryLabel: "Browse Influencers",
    ctaSecondaryLink: "/influencers",
    backgroundImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/50",
    accentColor: "from-blue-400 via-cyan-400 to-emerald-400",
  },
  {
    id: "s3",
    badge: "Direct Hire",
    headline: "Hire an Influencer Directly. Pay After Delivery.",
    subheadline: "Bypass public campaigns and hire any verified influencer privately. Agree on terms in a private deal room, fund via USDT escrow, and release payment only when the work meets your standards.",
    ctaPrimaryLabel: "Find an Influencer",
    ctaPrimaryLink: "/influencers",
    ctaSecondaryLabel: "Create Brand Account",
    ctaSecondaryLink: "/signup?type=brand",
    backgroundImage: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/40",
    accentColor: "from-emerald-400 via-teal-400 to-cyan-400",
  },
  {
    id: "s4",
    badge: "🔗 P2P Marketplace",
    headline: "Trade Crypto, Sell Services & Digital Products.",
    subheadline: "The Taskdrip P2P Hub lets you post crypto trades, digital services, and physical/digital products — all protected by admin-controlled escrow, a private deal-room chat, and a built-in dispute resolution system.",
    ctaPrimaryLabel: "Open P2P Hub",
    ctaPrimaryLink: "/p2p-hub",
    ctaSecondaryLabel: "List Something to Sell",
    ctaSecondaryLink: "/p2p-hub",
    backgroundImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/95 via-violet-950/80 to-black/60",
    accentColor: "from-violet-400 via-fuchsia-400 to-pink-400",
  },
  {
    id: "s5",
    badge: "BreedSkool Academy",
    headline: "New to Influencing? Learn from the Best.",
    subheadline: "BreedSkool gives influencers practical courses, masterclasses, and mentorship for Instagram, TikTok, YouTube, and content monetization. Taught by top earners on the platform.",
    ctaPrimaryLabel: "Explore Courses",
    ctaPrimaryLink: "/breedskool",
    ctaSecondaryLabel: "Become an Instructor",
    ctaSecondaryLink: "/signup?type=creator",
    backgroundImage: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-indigo-900/60 to-black/50",
    accentColor: "from-indigo-400 via-blue-400 to-cyan-400",
  },
  {
    id: "s6",
    badge: "Influencer Shop",
    headline: "Tools Built for Influencers Who Mean Business.",
    subheadline: "Browse templates, dev projects, scripts, GitHub repos, and digital toolkits that help you grow faster, improve your content, and sell your own digital assets to thousands of creators.",
    ctaPrimaryLabel: "Browse the Shop",
    ctaPrimaryLink: "/shop",
    ctaSecondaryLabel: "Sell Your Products",
    ctaSecondaryLink: "/signup?type=creator",
    backgroundImage: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/70 to-black/50",
    accentColor: "from-emerald-400 via-teal-400 to-cyan-400",
  },
  {
    id: "s7",
    badge: "💰 $TDRIP Points & Referrals",
    headline: "Earn Points for Every Action. Share & Multiply.",
    subheadline: "Every login, campaign, referral, and social task earns $TDRIP points — off-chain rewards convertible to $TDRIP token at launch. Invite friends and earn 100 points per referral.",
    ctaPrimaryLabel: "See How Points Work",
    ctaPrimaryLink: "/tdrip",
    ctaSecondaryLabel: "Refer & Earn",
    ctaSecondaryLink: "/referrals",
    backgroundImage: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-yellow-950/60 to-black/50",
    accentColor: "from-yellow-400 via-amber-400 to-orange-400",
  },
];

function HeroSlider({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const preloadedRef = useRef(false);

  const goTo = useCallback((idx: number) => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, slides.length]);

  const prev = () => goTo((current - 1 + slides.length) % slides.length);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  // Preload first hero image as high-priority resource
  useEffect(() => {
    if (preloadedRef.current || slides.length === 0) return;
    const firstImage = slides[0]?.backgroundImage;
    if (!firstImage) return;
    preloadedRef.current = true;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = firstImage;
    (link as any).fetchpriority = "high";
    document.head.appendChild(link);
  }, [slides]);

  const slide = slides[current] || DEFAULT_SLIDES[0];
  const headlineParts = slide.headline.split(".");
  const accentHeadline = headlineParts[0];
  const restHeadline = headlineParts.slice(1).join(".").trim();

  return (
    <section className="relative min-h-[85vh] sm:min-h-screen flex items-center overflow-hidden bg-gray-950" data-testid="section-hero-slider">
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}>
            {s.backgroundImage && (
              <img
                src={s.backgroundImage}
                alt=""
                className="w-full h-full object-cover object-center"
                loading={i === 0 ? "eager" : "lazy"}
                decoding={i === 0 ? "sync" : "async"}
              />
            )}
            <div className={`absolute inset-0 bg-gradient-to-r ${s.overlayColor || "from-black/90 via-black/70 to-black/40"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      <div className="absolute top-1/3 right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none hidden sm:block" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-20 sm:pb-24 w-full">
        <div className={`max-w-3xl transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`} data-testid="slider-content">
          {slide.badge && (
            <div className="mb-4 sm:mb-6">
              <Badge className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/15 backdrop-blur-sm text-white border-white/25 text-xs sm:text-sm font-semibold rounded-full inline-flex items-center gap-2">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
                {slide.badge}
              </Badge>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-4 sm:mb-6">
            <span className={`bg-gradient-to-r ${slide.accentColor || "from-purple-400 via-pink-400 to-orange-400"} bg-clip-text text-transparent`}>
              {accentHeadline}{slide.headline.includes(".") ? "." : ""}
            </span>
            {restHeadline && <> {restHeadline}</>}
          </h1>

          {slide.subheadline && <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl leading-relaxed">{slide.subheadline}</p>}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
            {slide.ctaPrimaryLabel && slide.ctaPrimaryLink && (
              <Link href={slide.ctaPrimaryLink}>
                <Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 px-6 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-xl font-bold shadow-2xl hover:shadow-white/20 transition-all" data-testid="button-slide-primary">
                  {slide.ctaPrimaryLabel} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
            {slide.ctaSecondaryLabel && slide.ctaSecondaryLink && (
              <Link href={slide.ctaSecondaryLink}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-xl font-bold transition-all" data-testid="button-slide-secondary">
                  {slide.ctaSecondaryLabel}
                </Button>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { label: "Influencers", value: "15K+", icon: <Users className="w-3.5 h-3.5" /> },
              { label: "Campaigns", value: "3.5K+", icon: <Target className="w-3.5 h-3.5" /> },
              { label: "Paid Out", value: "$650K+", icon: <DollarSign className="w-3.5 h-3.5" /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-gray-300">{s.icon}</span>
                <span className="text-xl sm:text-2xl font-black text-white">{s.value}</span>
                <span className="text-gray-400 text-xs sm:text-sm font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          {/* Arrows: bottom-right corner so they never cover hero text */}
          <div className="absolute right-3 sm:right-6 bottom-3 sm:bottom-6 flex items-center gap-2 z-20">
            <button onClick={prev} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110" data-testid="button-slider-prev" aria-label="Previous slide">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button onClick={next} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110" data-testid="button-slider-next" aria-label="Next slide">
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          {/* Dots: bottom-left so they don't overlap with arrows */}
          <div className="absolute bottom-5 sm:bottom-8 left-4 sm:left-8 flex items-center gap-2 sm:gap-2.5 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} data-testid={`button-slide-dot-${i}`} className={`transition-all duration-300 rounded-full ${i === current ? "w-7 sm:w-8 h-2 sm:h-2.5 bg-white" : "w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/40 hover:bg-white/70"}`} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const GRADIENTS: Record<string, string> = {
  gaming: "from-purple-600 via-indigo-600 to-blue-700",
  beauty: "from-pink-500 via-rose-500 to-red-500",
  fitness: "from-green-500 via-emerald-500 to-teal-600",
  tech: "from-cyan-500 via-blue-500 to-indigo-600",
  travel: "from-sky-500 via-blue-500 to-cyan-600",
  food: "from-orange-500 via-amber-500 to-yellow-500",
  finance: "from-emerald-500 via-teal-500 to-green-600",
  fashion: "from-rose-500 via-pink-500 to-fuchsia-600",
  default: "from-violet-600 via-purple-600 to-indigo-700",
};

const DEMO_CAMPAIGNS = [
  { id: "d1", title: "Promote Our New Gaming App", brandName: "NovaByte Gaming", reward: "120", totalSlots: 50, filledSlots: 38, category: "gaming", featureImage: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=450&q=80&auto=format&fit=crop" },
  { id: "d2", title: "Instagram Reel for Skincare Launch", brandName: "GlowLab Beauty", reward: "85", totalSlots: 30, filledSlots: 12, category: "beauty", featureImage: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=450&q=80&auto=format&fit=crop" },
  { id: "d3", title: "7-Day Fitness Transformation", brandName: "PeakFit Pro", reward: "200", totalSlots: 100, filledSlots: 71, category: "fitness", featureImage: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=450&q=80&auto=format&fit=crop" },
];

function CampaignCard({ campaign }: { campaign: any }) {
  const gradient = GRADIENTS[(campaign.category || "").toLowerCase()] || GRADIENTS.default;
  const totalSlots = Number(campaign.totalSlots || 1);
  const filledSlots = Number(campaign.filledSlots || 0);
  const pct = Math.round((filledSlots / totalSlots) * 100);

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-white" data-testid={`card-campaign-${campaign.id}`}>
      <div className="h-40 sm:h-44 relative overflow-hidden">
        {campaign.featureImage && <img src={campaign.featureImage} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <Badge className="absolute top-3 left-3 bg-green-500 text-white text-xs border-0">Active</Badge>
        <Badge className="absolute top-3 right-3 bg-white text-gray-900 text-sm border-0 font-black px-3">${campaign.reward} USDT</Badge>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">{campaign.brandName || campaign.brand?.companyName || "Brand Partner"}</p>
        <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 text-sm leading-snug">{campaign.title}</h3>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{filledSlots}/{totalSlots} joined</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${gradient} rounded-full`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{Math.max(totalSlots - filledSlots, 0)} spots left</span>
          <Link href="/login">
            <Button size="sm" className="bg-black text-white rounded-lg text-xs hover:bg-gray-900 px-4 h-8" data-testid={`button-apply-${campaign.id}`}>Apply Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const P2P_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  crypto: { label: "Crypto", color: "bg-violet-100 text-violet-700" },
  product: { label: "Product", color: "bg-blue-100 text-blue-700" },
  service: { label: "Service", color: "bg-emerald-100 text-emerald-700" },
};

function P2PListingCard({ listing }: { listing: any }) {
  const typeMeta = P2P_TYPE_BADGE[listing.type] || { label: listing.type, color: "bg-gray-100 text-gray-700" };
  return (
    <Link href="/p2p-hub">
      <div className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-white h-full flex flex-col" data-testid={`card-p2p-${listing.id}`}>
        <div className="h-36 sm:h-40 relative overflow-hidden bg-gray-100 flex-shrink-0">
          {listing.featuredImage ? (
            <img src={listing.featuredImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
              <Coins className="w-10 h-10 text-violet-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${typeMeta.color}`}>{typeMeta.label}</span>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">{listing.title}</h3>
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{listing.description}</p>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-base font-black text-gray-900">{listing.price} <span className="text-xs font-semibold text-gray-400">USDT</span></span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Escrow
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FinalLanding() {
  const { data: dbSliders = [] } = useQuery<Slide[]>({
    queryKey: ["/api/hero-sliders", "landing"],
    queryFn: () => fetch("/api/hero-sliders?page=landing").then(r => r.json()),
  });
  const { data: apiCampaigns = [], isLoading: campaignsLoading } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const { data: p2pListings = [], isLoading: p2pLoading } = useQuery<any[]>({ queryKey: ["/api/p2p/listings"] });
  const { data: spotlightItems = [] } = useQuery<any[]>({
    queryKey: ["/api/spotlight", "landing"],
    queryFn: () => fetch("/api/spotlight?page=landing").then(r => r.json()),
  });
  const cms = usePageContent("landing");

  const slides = dbSliders.length > 0 ? dbSliders : DEFAULT_SLIDES;
  const activeCampaigns = (apiCampaigns as any[]).filter((c) => c.isActive && c.status === "active").slice(0, 3);
  const displayCampaigns = activeCampaigns.length >= 3 ? activeCampaigns : DEMO_CAMPAIGNS;
  const approvedListings = (p2pListings as any[]).filter((l) => l.status === "approved").slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <AdPopupZone page="landing" />
      <NavigationFixed />
      <AdSlot page="landing" placementType="banner_top" className="w-full" />
      <HeroSlider slides={slides} />

      {/* Platform bar */}
      <section className="py-5 sm:py-7 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-xs font-semibold mb-4 sm:mb-5 uppercase tracking-widest">{cms.get("platform_bar", "label", "Earn across all major platforms")}</p>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 opacity-50 grayscale">
            {["TikTok", "YouTube", "Instagram", "Twitch", "Telegram", "X (Twitter)", "Facebook", "WhatsApp", "LinkedIn", "Snapchat"].map((platform) => (
              <span key={platform} className="text-xs sm:text-sm font-black text-gray-600 tracking-tight">{platform}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-10 sm:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <Badge className="mb-3 bg-black text-white px-4 py-1.5 text-xs">Everything in One Place</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Built for the Influencer Economy</h2>
            <p className="text-gray-500 mt-3 text-sm sm:text-base max-w-xl mx-auto">Campaigns, direct hire, P2P trading, BreedSkool Academy, a digital shop, and a social feed — all under one roof.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                icon: <Target className="w-6 h-6 text-orange-500" />,
                title: "Campaigns",
                desc: "Apply to live brand campaigns and earn USDT on approval.",
                href: "/tasks",
                color: "bg-orange-50 border-orange-100",
              },
              {
                icon: <Briefcase className="w-6 h-6 text-blue-500" />,
                title: "Direct Hire",
                desc: "Brands hire influencers privately with escrow-protected payments.",
                href: "/influencers",
                color: "bg-blue-50 border-blue-100",
              },
              {
                icon: <Coins className="w-6 h-6 text-violet-500" />,
                title: "P2P Market",
                desc: "Trade crypto, sell services and products peer-to-peer.",
                href: "/p2p-hub",
                color: "bg-violet-50 border-violet-100",
              },
              {
                icon: <BookOpen className="w-6 h-6 text-indigo-500" />,
                title: "BreedSkool",
                desc: "Learn from top influencers — courses, masterclasses & mentorship.",
                href: "/breedskool",
                color: "bg-indigo-50 border-indigo-100",
              },
              {
                icon: <ShoppingBag className="w-6 h-6 text-emerald-500" />,
                title: "Shop",
                desc: "Buy and sell scripts, templates, dev projects & digital tools.",
                href: "/shop",
                color: "bg-emerald-50 border-emerald-100",
              },
              {
                icon: <ArrowUpRight className="w-6 h-6 text-pink-500" />,
                title: "Social Feed",
                desc: "Post content, tip creators with $TDRIP, and grow your audience.",
                href: "/feed",
                color: "bg-pink-50 border-pink-100",
              },
            ].map((feat) => (
              <Link href={feat.href} key={feat.title}>
                <div className={`rounded-2xl border ${feat.color} p-4 sm:p-5 h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group`} data-testid={`card-feature-${feat.title.toLowerCase().replace(/\s/g,"-")}`}>
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 sm:mb-4">{feat.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">{feat.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-gray-700 group-hover:gap-2 gap-1 transition-all">
                    Explore <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Inline Ad Slot */}
      <AdSlot page="landing" placementType="inline" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2" />

      {/* Admin-curated Spotlight section */}
      {spotlightItems.length > 0 && (
        <section className="py-10 sm:py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-purple-600 text-white px-4 py-1.5 text-xs">Featured</Badge>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Spotlight</h2>
              <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">Hand-picked by our team. Don't miss these.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {spotlightItems.map((item: any) => (
                <a key={item.id} href={item.customLink || "#"} target={item.customLink?.startsWith("http") ? "_blank" : "_self"} rel="noreferrer" data-testid={`spotlight-card-${item.id}`}>
                  <Card className="group h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-gray-100 overflow-hidden cursor-pointer">
                    {item.customImage && (
                      <div className="h-44 overflow-hidden bg-gray-100">
                        <img src={item.customImage} alt={item.customTitle || item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => (e.currentTarget.style.display = "none")} />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-1">
                        <p className="font-bold text-gray-900 text-sm flex-1">{item.customTitle || item.name}</p>
                        {item.badgeLabel && <Badge className="bg-yellow-400 text-yellow-900 text-[10px] shrink-0">{item.badgeLabel}</Badge>}
                      </div>
                      {item.customDescription && <p className="text-gray-500 text-xs line-clamp-2">{item.customDescription}</p>}
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-12 sm:py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 sm:gap-10 items-start">
            <div className="lg:sticky lg:top-24">
              <Badge className="mb-4 bg-black text-white px-4 py-1.5 text-xs">How It Works</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight max-w-xl">{cms.get("how_it_works", "title", "Simple. Fast. Fair.")}</h2>
              <p className="text-gray-500 mt-4 text-sm sm:text-base max-w-lg leading-relaxed">{cms.get("how_it_works", "subtitle", "Influencers earn crypto from verified campaigns. Brands launch performance-driven influencer marketing with protected escrow.")}</p>
              <div className="grid sm:grid-cols-3 lg:grid-cols-1 gap-3 mt-6 sm:mt-8">
                {[
                  { icon: <Shield className="w-4 h-4" />, label: "Escrow protected" },
                  { icon: <Zap className="w-4 h-4" />, label: "Fast USDT payouts" },
                  { icon: <CheckCircle className="w-4 h-4" />, label: "Admin verified work" },
                  { icon: <Briefcase className="w-4 h-4" />, label: "Direct hire available" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-bold text-gray-800">
                    <span className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-900">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
              {[
                {
                  title: "Influencers",
                  icon: <Sparkles className="w-5 h-5 text-orange-500" />,
                  steps: [
                    cms.get("how_it_works", "creator_step1_title", "Build Your Profile"),
                    cms.get("how_it_works", "creator_step2_title", "Apply to Campaigns or Accept Direct Hire Offers"),
                    cms.get("how_it_works", "creator_step3_title", "Submit Work & Get Paid in USDT"),
                  ],
                  href: "/signup?type=creator",
                  button: "Start Earning",
                  color: "bg-orange-500 hover:bg-orange-600",
                },
                {
                  title: "Brands",
                  icon: <Target className="w-5 h-5 text-blue-500" />,
                  steps: [
                    cms.get("how_it_works", "brand_step1_title", "Post a Campaign or Hire Directly"),
                    cms.get("how_it_works", "brand_step2_title", "Reach Thousands of Verified Influencers"),
                    cms.get("how_it_works", "brand_step3_title", "Pay Only for Approved Results"),
                  ],
                  href: "/signup?type=brand",
                  button: "Launch Campaign",
                  color: "bg-blue-600 hover:bg-blue-700",
                },
              ].map((path) => (
                <div key={path.title} className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5 sm:mb-6">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">{path.icon}</div>
                    <h3 className="font-black text-lg sm:text-xl text-gray-950">{path.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {path.steps.map((step, index) => (
                      <div key={step} className="flex items-start gap-3">
                        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-950 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{index + 1}</span>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 leading-snug">{step}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={path.href} className="mt-5 sm:mt-6 block">
                    <Button className={`w-full rounded-xl font-bold text-white text-sm ${path.color}`} data-testid={`button-${path.title.toLowerCase()}-path`}>
                      {path.button} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Revenue Model */}
      <section className="py-12 sm:py-16 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 sm:gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-white/10 text-white border-white/20 px-4 py-1.5 text-xs">Platform Revenue Model</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">Transparent fees. Clear payouts.</h2>
              <p className="text-gray-400 mt-4 leading-relaxed text-sm sm:text-base">Brands fund campaigns with a small platform fee. Influencers receive the majority of approved earnings. For Direct Hire, the same protected escrow model applies. Everyone sees the ledger clearly.</p>
              <Link href="/signup" className="mt-6 sm:mt-7 inline-block">
                <Button className="bg-white text-black hover:bg-gray-100 rounded-xl font-bold px-7 text-sm sm:text-base" data-testid="button-fee-model-signup">
                  Join Taskdrip <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { value: "Low", label: "Brand platform fee" },
                { value: "High", label: "Influencer payout" },
                { value: "USDT", label: "Crypto settlement" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 p-4 sm:p-6">
                  <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2 font-semibold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live Campaigns */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-7 sm:mb-9">
            <div>
              <Badge className="mb-2 sm:mb-3 bg-green-100 text-green-700 border-green-200 text-xs">Live Now</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900">{cms.get("campaigns_preview", "title", "Open Campaigns")}</h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">{cms.get("campaigns_preview", "subtitle", "Apply now — spots fill fast.")}</p>
            </div>
            <Link href="/campaigns">
              <Button variant="outline" className="rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1" data-testid="button-view-campaigns-top">
                View All <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {campaignsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden animate-pulse">
                    <div className="h-40 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))
              : displayCampaigns.slice(0, 3).map((campaign: any) => <CampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
          <div className="text-center mt-6 sm:mt-8">
            <Link href="/campaigns">
              <Button size="lg" variant="outline" className="rounded-xl font-semibold" data-testid="button-view-campaigns-bottom">
                See All Campaigns <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* P2P Market Section */}
      <section className="py-12 sm:py-16 bg-gray-950" data-testid="section-p2p-market">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7 sm:mb-9">
            <div>
              <Badge className="mb-2 sm:mb-3 bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">🔗 P2P Marketplace</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">Trade, Sell & Earn in Crypto</h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-lg">Crypto trades, digital products & services — all with admin-controlled escrow and private deal rooms.</p>
            </div>
            <Link href="/p2p-hub" className="flex-shrink-0">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1" data-testid="button-view-p2p">
                Open P2P Hub <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {p2pLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
                  <div className="h-40 bg-white/10" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-1/3" />
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : approvedListings.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {approvedListings.map((listing: any) => (
                <P2PListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                { id: "p1", type: "crypto", title: "Buy 1,000 USDT (TRC-20)", description: "Safe P2P USDT transfer via Tron network. Fast settlement with admin escrow protection.", price: "1,000", featuredImage: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&q=80" },
                { id: "p2", type: "service", title: "Crypto Twitter Promotion — 25K Impressions", description: "Guaranteed 25,000 Twitter/X impressions from real crypto audience. Results within 72 hours.", price: "150", featuredImage: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&q=80" },
                { id: "p3", type: "product", title: "NFT Influencer Pro Toolkit", description: "Complete NFT creation bundle: Photoshop templates, metadata generator, and launch checklist.", price: "49", featuredImage: "https://images.unsplash.com/photo-1644361566696-3d442b5b482a?w=600&q=80" },
              ].map((listing) => (
                <P2PListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* P2P feature pills */}
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            {[
              { icon: <Shield className="w-3.5 h-3.5" />, label: "Admin Escrow" },
              { icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Verified Listings" },
              { icon: <Zap className="w-3.5 h-3.5" />, label: "Private Deal Room" },
              { icon: <Users className="w-3.5 h-3.5" />, label: "Dispute Resolution" },
            ].map((feat) => (
              <div key={feat.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-semibold">
                {feat.icon} {feat.label}
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Link href="/p2p-hub">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold" data-testid="button-p2p-cta">
                Browse P2P Listings <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <TierShowcaseSection />

      {/* BreedSkool Section */}
      <section
        className="py-14 sm:py-20 relative overflow-hidden"
        style={{
          backgroundImage: "url('/breedskool-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
        data-testid="section-breedskool"
      >
        {/* Dark overlay — deep purple tint so text is crisp over the photo */}
        <div className="absolute inset-0 bg-[#0d0620]/85 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-purple-900/40 to-indigo-900/60 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-yellow-400/20 text-yellow-300 border-yellow-400/30 text-xs px-4 py-1.5">🎓 BreedSkool Tech Academy</Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Where Skills Become <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">Income</span>
              </h2>
              <p className="text-gray-300 mt-4 leading-relaxed text-sm sm:text-base max-w-lg">
                BreedSkool is where <strong className="text-white">skills become income</strong> and <strong className="text-yellow-300">individuals become Global Digital Assets</strong>. We equip tech enthusiasts with real-world Web3-era skills to build profitable online businesses and thrive in the digital economy.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: "💻", label: "Web Dev & Vibe Coding", price: "₦150K" },
                  { icon: "🧠", label: "AI Content Creation", price: "₦179K" },
                  { icon: "📱", label: "Social Media Monetization", price: "₦320K" },
                  { icon: "📈", label: "Pocket Option Trading", price: "₦279K" },
                ].map((c) => (
                  <div key={c.label} className="bg-white/10 border border-white/15 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-xl">{c.icon}</span>
                    <div>
                      <p className="text-white font-semibold text-xs leading-tight">{c.label}</p>
                      <p className="text-yellow-300 text-xs font-bold">{c.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-7">
                <Link href="/breedskool">
                  <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-black px-7 rounded-xl shadow-xl w-full sm:w-auto" data-testid="button-breedskool-enroll">
                    <BookOpen className="w-4 h-4 mr-2" /> Enroll Now
                  </Button>
                </Link>
                <a href="https://t.me/taskdrip" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-bold px-6 rounded-xl w-full sm:w-auto" data-testid="button-breedskool-community">
                    Join Community
                  </Button>
                </a>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: "🎯", title: "Goal-Oriented Programs", desc: "Each program is designed with one outcome — income. Not just a certificate on the wall." },
                { icon: "🌐", title: "Web3 & AI Focused", desc: "Master the tools shaping the future: blockchain, AI, crypto, DeFi, and digital marketing." },
                { icon: "💰", title: "Start Earning in Weeks", desc: "Our graduates start freelancing and monetizing skills within weeks of completing the program." },
                { icon: "🤝", title: "Community of Learners", desc: "Join our WhatsApp & Telegram community with tutors, mentors and fellow digital entrepreneurs." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <span className="text-2xl mt-0.5">{item.icon}</span>
                  <div>
                    <h4 className="text-white font-bold text-sm mb-0.5">{item.title}</h4>
                    <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Direct Hire CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-white/10 text-white border-white/20 text-xs px-4 py-1.5">✨ New — Direct Hire</Badge>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Want a Specific Influencer? Hire Them Directly.</h2>
              <p className="text-gray-400 mt-4 leading-relaxed text-sm sm:text-base">
                Skip the public campaign. Browse verified influencers, send a private offer with your budget, and release payment only when the work meets your standards. All backed by USDT escrow.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link href="/influencers">
                  <Button className="bg-white text-black hover:bg-gray-100 rounded-xl font-bold px-6" data-testid="button-direct-hire-find">
                    Find a Influencer <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/signup?type=brand">
                  <Button variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 rounded-xl font-bold px-6" data-testid="button-direct-hire-signup">
                    Create Brand Account
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { icon: <Shield className="w-5 h-5 text-emerald-400" />, title: "Escrow Protected", desc: "Funds held safely until work is approved" },
                { icon: <Briefcase className="w-5 h-5 text-blue-400" />, title: "Private Offer", desc: "Negotiate terms in a private deal room" },
                { icon: <CheckCircle className="w-5 h-5 text-purple-400" />, title: "Approve Work", desc: "Release payment only when satisfied" },
                { icon: <Zap className="w-5 h-5 text-yellow-400" />, title: "USDT Payout", desc: "Instant crypto settlement on approval" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="mb-2">{item.icon}</div>
                  <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 mb-4 tracking-tight">
            {cms.get("final_cta", "title", "Ready to Turn Your Influence Into Income?")}
          </h2>
          <p className="text-gray-500 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            {cms.get("final_cta", "subtitle", "Join influencers and brands using Taskdrip for verified campaigns, escrow protection, and crypto payouts.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?type=creator">
              <Button size="lg" className="w-full sm:w-auto bg-black text-white hover:bg-gray-800 active:bg-gray-900 px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5" data-testid="button-final-cta-influencer">
                {cms.get("final_cta", "creator_btn", "I'm a Influencer")} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/signup?type=brand">
              <Button size="lg" className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-900 hover:text-white active:bg-black active:text-white px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5" data-testid="button-final-cta-brand">
                {cms.get("final_cta", "brand_btn", "I'm a Brand")} <Rocket className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-6">{cms.get("final_cta", "footnote", "No credit card required. Campaigns ready the moment you sign up.")}</p>
        </div>
      </section>

      <AdSlot page="landing" placementType="banner_bottom" className="w-full" />
      <Footer />
    </div>
  );
}

// ── Creator Tier showcase ─────────────────────────────────────────────────────
// Highlights the six creator tiers on the landing page with live counts from
// /api/creators/by-tier. The endpoint is memoized server-side so this is cheap.
function TierShowcaseSection() {
  const { data: byTier = {} as Record<string, any[]> } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/creators/by-tier"],
    staleTime: 60_000,
  });

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <Badge className="mb-3 bg-purple-100 text-purple-700 border-0 text-xs px-4 py-1.5">
            <Trophy className="w-3.5 h-3.5 mr-1" /> Creator Tiers
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Every Creator Has a Place Here
          </h2>
          <p className="text-gray-500 mt-4 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            From first post to global impact — brands discover influencers across six reach tiers, each optimized for the right campaigns.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {TIER_ORDER.map((tierKey) => {
            const cfg = TIER_CONFIG[tierKey as CreatorTier];
            const count = byTier[tierKey]?.length ?? 0;
            return (
              <Link key={tierKey} href={`/influencers?tier=${tierKey}`}>
                <Card
                  className={`group cursor-pointer overflow-hidden border ${cfg.border} ${cfg.bg} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full`}
                  data-testid={`card-tier-${tierKey}`}
                >
                  <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-xl shadow-sm`}>
                        <span className="text-white">{cfg.icon}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.badge} border-0`}>
                        {cfg.rangeShort}
                      </Badge>
                    </div>
                    <h3 className={`font-black text-sm sm:text-base ${cfg.text} mb-1 leading-tight`} data-testid={`text-tier-name-${tierKey}`}>
                      {cfg.name}
                    </h3>
                    <p className="text-gray-500 text-[11px] sm:text-xs leading-relaxed line-clamp-2 mb-3">
                      {cfg.description}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                      <span className="text-[11px] text-gray-400 font-medium">Creators</span>
                      <span className={`text-sm font-black ${cfg.text}`} data-testid={`text-tier-count-${tierKey}`}>
                        {count.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link href="/influencers">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold px-8 shadow-lg" data-testid="button-browse-all-tiers">
              Browse All Creators <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
