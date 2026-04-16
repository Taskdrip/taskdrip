import { useState, useEffect, useCallback } from "react";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePageContent } from "@/hooks/usePageContent";
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
} from "lucide-react";

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
    subheadline: "You create the content. Brands earn the revenue. Taskdrip lets you browse live paid campaigns, apply in one click, and get paid in USDT when your work is approved.",
    ctaPrimaryLabel: "Start Earning Now",
    ctaPrimaryLink: "/signup?type=creator",
    ctaSecondaryLabel: "Browse Campaigns",
    ctaSecondaryLink: "/campaigns",
    backgroundImage: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/50",
    accentColor: "from-orange-400 via-pink-400 to-purple-400",
  },
  {
    id: "s2",
    badge: "For Brands",
    headline: "Tired of Wasting Budget on Fake Influencers?",
    subheadline: "Reach verified creators, protect campaign funds with escrow, and approve every submission before payouts are released.",
    ctaPrimaryLabel: "Launch a Campaign",
    ctaPrimaryLink: "/signup?type=brand",
    ctaSecondaryLabel: "View Live Campaigns",
    ctaSecondaryLink: "/campaigns",
    backgroundImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/50",
    accentColor: "from-blue-400 via-cyan-400 to-emerald-400",
  },
  {
    id: "s3",
    badge: "Our Solution",
    headline: "The Marketplace Where Influence Meets Opportunity.",
    subheadline: "Taskdrip connects verified creators with brands ready to pay. Escrow-backed campaigns, crypto payouts, real-time tracking, and no middlemen.",
    ctaPrimaryLabel: "Join Free Today",
    ctaPrimaryLink: "/signup",
    ctaSecondaryLabel: "View Live Campaigns",
    ctaSecondaryLink: "/campaigns",
    backgroundImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/70 to-black/40",
    accentColor: "from-purple-400 via-pink-400 to-orange-400",
  },
  {
    id: "s4",
    badge: "BreedSkool Academy",
    headline: "New to Influencing? Learn from the Best.",
    subheadline: "BreedSkool gives creators practical courses, masterclasses, and mentorship for Instagram, TikTok, YouTube, and monetization.",
    ctaPrimaryLabel: "Explore Courses",
    ctaPrimaryLink: "/breedskool",
    ctaSecondaryLabel: "Become a Mentor",
    ctaSecondaryLink: "/signup?type=creator",
    backgroundImage: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-indigo-900/60 to-black/50",
    accentColor: "from-indigo-400 via-blue-400 to-cyan-400",
  },
  {
    id: "s5",
    badge: "Creator Shop",
    headline: "Tools Built for Creators Who Mean Business.",
    subheadline: "Find templates, plugins, scripts, and digital tools that help creators improve content, sell assets, and grow faster.",
    ctaPrimaryLabel: "Browse the Shop",
    ctaPrimaryLink: "/shop",
    ctaSecondaryLabel: "Sell Your Products",
    ctaSecondaryLink: "/signup?type=creator",
    backgroundImage: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/70 to-black/50",
    accentColor: "from-emerald-400 via-teal-400 to-cyan-400",
  },
  {
    id: "s6",
    badge: "🔗 P2P Marketplace — Now Live",
    headline: "Trade Crypto, Sell Services & Products.",
    subheadline: "The Taskdrip P2P Hub lets you post crypto trades, digital services, and products — all protected by admin-controlled escrow, a private deal-room chat, and a dispute resolution system.",
    ctaPrimaryLabel: "Open P2P Hub",
    ctaPrimaryLink: "/p2p-hub",
    ctaSecondaryLabel: "List Something to Sell",
    ctaSecondaryLink: "/p2p-hub",
    backgroundImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/95 via-violet-950/80 to-black/60",
    accentColor: "from-violet-400 via-fuchsia-400 to-pink-400",
  },
];

function HeroSlider({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const slide = slides[current] || DEFAULT_SLIDES[0];
  const headlineParts = slide.headline.split(".");
  const accentHeadline = headlineParts[0];
  const restHeadline = headlineParts.slice(1).join(".").trim();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" data-testid="section-hero-slider">
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}>
            {s.backgroundImage && <img src={s.backgroundImage} alt="" className="w-full h-full object-cover object-center" />}
            <div className={`absolute inset-0 bg-gradient-to-r ${s.overlayColor || "from-black/90 via-black/70 to-black/40"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      <div className="absolute top-1/3 right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 w-full">
        <div className={`max-w-3xl transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`} data-testid="slider-content">
          {slide.badge && (
            <div className="mb-6">
              <Badge className="px-4 py-2 bg-white/15 backdrop-blur-sm text-white border-white/25 text-sm font-semibold rounded-full inline-flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                {slide.badge}
              </Badge>
            </div>
          )}

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            <span className={`bg-gradient-to-r ${slide.accentColor || "from-purple-400 via-pink-400 to-orange-400"} bg-clip-text text-transparent`}>
              {accentHeadline}{slide.headline.includes(".") ? "." : ""}
            </span>
            {restHeadline && <> {restHeadline}</>}
          </h1>

          {slide.subheadline && <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl leading-relaxed">{slide.subheadline}</p>}

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            {slide.ctaPrimaryLabel && slide.ctaPrimaryLink && (
              <Link href={slide.ctaPrimaryLink}>
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 px-10 py-6 text-lg rounded-xl font-bold shadow-2xl hover:shadow-white/20 transition-all" data-testid="button-slide-primary">
                  {slide.ctaPrimaryLabel} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
            {slide.ctaSecondaryLabel && slide.ctaSecondaryLink && (
              <Link href={slide.ctaSecondaryLink}>
                <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-10 py-6 text-lg rounded-xl font-bold transition-all" data-testid="button-slide-secondary">
                  {slide.ctaSecondaryLabel}
                </Button>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { label: "Creators", value: "10K+", icon: <Users className="w-4 h-4" /> },
              { label: "Campaigns", value: "2.5K+", icon: <Target className="w-4 h-4" /> },
              { label: "Paid Out", value: "$450K+", icon: <DollarSign className="w-4 h-4" /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-gray-300">{s.icon}</span>
                <span className="text-2xl font-black text-white">{s.value}</span>
                <span className="text-gray-400 text-sm font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute right-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-20" data-testid="button-slider-prev" aria-label="Previous slide">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-20" data-testid="button-slider-next" aria-label="Next slide">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} data-testid={`button-slide-dot-${i}`} className={`transition-all duration-300 rounded-full ${i === current ? "w-8 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"}`} aria-label={`Go to slide ${i + 1}`} />
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
      <div className="h-44 relative overflow-hidden">
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

export default function FinalLanding() {
  const { data: dbSliders = [] } = useQuery<Slide[]>({ queryKey: ["/api/hero-sliders"] });
  const { data: apiCampaigns = [] } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const cms = usePageContent("landing");

  const slides = dbSliders.length > 0 ? dbSliders : DEFAULT_SLIDES;
  const activeCampaigns = (apiCampaigns as any[]).filter((c) => c.isActive && c.status === "active").slice(0, 3);
  const displayCampaigns = activeCampaigns.length >= 3 ? activeCampaigns : DEMO_CAMPAIGNS;

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />
      <HeroSlider slides={slides} />

      <section className="py-7 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-xs font-semibold mb-5 uppercase tracking-widest">{cms.get("platform_bar", "label", "Earn across all major platforms")}</p>
          <div className="flex flex-wrap items-center justify-center gap-7 opacity-50 grayscale">
            {["TikTok", "YouTube", "Instagram", "Twitch", "Telegram", "X (Twitter)", "Facebook"].map((platform) => (
              <span key={platform} className="text-sm font-black text-gray-600 tracking-tight">{platform}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div className="lg:sticky lg:top-24">
              <Badge className="mb-4 bg-black text-white px-4 py-1.5 text-xs">How It Works</Badge>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight max-w-xl">{cms.get("how_it_works", "title", "Simple. Fast. Fair.")}</h2>
              <p className="text-gray-500 mt-4 text-base max-w-lg leading-relaxed">{cms.get("how_it_works", "subtitle", "Creators earn crypto from verified campaigns. Brands launch performance-driven creator marketing with protected escrow.")}</p>
              <div className="grid sm:grid-cols-3 lg:grid-cols-1 gap-3 mt-8">
                {[
                  { icon: <Shield className="w-4 h-4" />, label: "Escrow protected" },
                  { icon: <Zap className="w-4 h-4" />, label: "Fast crypto payouts" },
                  { icon: <CheckCircle className="w-4 h-4" />, label: "Admin verified work" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800">
                    <span className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-900">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  title: "Creators",
                  icon: <Sparkles className="w-5 h-5 text-orange-500" />,
                  steps: [
                    cms.get("how_it_works", "creator_step1_title", "Build Your Profile"),
                    cms.get("how_it_works", "creator_step2_title", "Apply to Campaigns"),
                    cms.get("how_it_works", "creator_step3_title", "Submit & Get Paid"),
                  ],
                  href: "/signup?type=creator",
                  button: "Start Earning",
                  color: "bg-orange-500 hover:bg-orange-600",
                },
                {
                  title: "Brands",
                  icon: <Target className="w-5 h-5 text-blue-500" />,
                  steps: [
                    cms.get("how_it_works", "brand_step1_title", "Post Your Campaign"),
                    cms.get("how_it_works", "brand_step2_title", "Reach Verified Creators"),
                    cms.get("how_it_works", "brand_step3_title", "Pay Only for Results"),
                  ],
                  href: "/signup?type=brand",
                  button: "Launch Campaign",
                  color: "bg-blue-600 hover:bg-blue-700",
                },
              ].map((path) => (
                <div key={path.title} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">{path.icon}</div>
                    <h3 className="font-black text-xl text-gray-950">{path.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {path.steps.map((step, index) => (
                      <div key={step} className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-gray-950 text-white text-xs font-black flex items-center justify-center">{index + 1}</span>
                        <span className="text-sm font-bold text-gray-800">{step}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={path.href} className="mt-6 block">
                    <Button className={`w-full rounded-xl font-bold text-white ${path.color}`} data-testid={`button-${path.title.toLowerCase()}-path`}>
                      {path.button} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-white/10 text-white border-white/20 px-4 py-1.5 text-xs">Platform Revenue Model</Badge>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Transparent fees. Clear payouts.</h2>
              <p className="text-gray-400 mt-4 leading-relaxed">Brands fund campaigns with a 10% platform fee. Creators receive 90% of approved earnings after the creator-side platform fee. Everyone sees the ledger clearly.</p>
              <Link href="/signup" className="mt-7 inline-block">
                <Button className="bg-white text-black hover:bg-gray-100 rounded-xl font-bold px-7" data-testid="button-fee-model-signup">
                  Join Taskdrip <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { value: "10%", label: "Brand platform fee" },
                { value: "90%", label: "Creator payout" },
                { value: "USDT", label: "Crypto settlement" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-3xl bg-white/5 border border-white/10 p-6">
                  <p className="text-4xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text text-transparent">{stat.value}</p>
                  <p className="text-sm text-gray-400 mt-2 font-semibold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-5 mb-9">
            <div>
              <Badge className="mb-3 bg-green-100 text-green-700 border-green-200 text-xs">Live Now</Badge>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">{cms.get("campaigns_preview", "title", "Open Campaigns")}</h2>
              <p className="text-gray-500 text-sm mt-1">{cms.get("campaigns_preview", "subtitle", "Apply now — spots fill fast.")}</p>
            </div>
            <Link href="/campaigns">
              <Button variant="outline" className="rounded-xl text-sm font-semibold hidden sm:flex" data-testid="button-view-campaigns-top">
                View All <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayCampaigns.slice(0, 3).map((campaign: any) => <CampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-gray-950 mb-4 tracking-tight">
            {cms.get("final_cta", "title", "Ready to Turn Your Influence Into Income?")}
          </h2>
          <p className="text-gray-500 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            {cms.get("final_cta", "subtitle", "Join creators and brands using Taskdrip for verified campaigns, escrow protection, and crypto payouts.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?type=creator">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 px-10 py-6 text-lg rounded-xl font-bold" data-testid="button-final-cta-creator">
                {cms.get("final_cta", "creator_btn", "I'm a Creator")} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/signup?type=brand">
              <Button size="lg" variant="outline" className="border-gray-300 text-gray-950 hover:bg-white px-10 py-6 text-lg rounded-xl font-bold" data-testid="button-final-cta-brand">
                {cms.get("final_cta", "brand_btn", "I'm a Brand")} <Rocket className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-6">{cms.get("final_cta", "footnote", "No credit card required. Campaigns ready the moment you sign up.")}</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
