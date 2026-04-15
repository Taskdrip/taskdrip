import { useState, useEffect, useCallback } from "react";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight, ChevronLeft, ChevronRight, Zap, Globe, Shield, TrendingUp,
  Users, DollarSign, CheckCircle, Rocket, Target, Crown, Sparkles,
  GraduationCap, ShoppingBag, Gift, Clock, Star,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Fallback slides (shown when DB has no sliders yet) ──────────────────────
const DEFAULT_SLIDES: Slide[] = [
  {
    id: "s1",
    badge: "For Influencers",
    headline: "Stop Getting Ghosted by Brands.",
    subheadline: "You create the content. Brands earn the revenue. Yet you're still waiting on email replies. Taskdrip changes that — browse live paid campaigns, apply in one click, and get paid in USDT the moment your work is approved.",
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
    subheadline: "Bots, inflated follower counts, zero engagement — traditional influencer marketing is broken. Taskdrip gives you access to verified creators, escrow-protected payments, and brand-first approval on every submission.",
    ctaPrimaryLabel: "Launch a Campaign",
    ctaPrimaryLink: "/signup?type=brand",
    ctaSecondaryLabel: "See How It Works",
    ctaSecondaryLink: "/how-it-works",
    backgroundImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/50",
    accentColor: "from-blue-400 via-cyan-400 to-emerald-400",
  },
  {
    id: "s3",
    badge: "Our Solution",
    headline: "The Marketplace Where Influence Meets Opportunity.",
    subheadline: "Taskdrip connects 10,000+ verified creators with brands ready to pay. Escrow-backed campaigns. Crypto payouts. Real-time tracking. No middlemen. No drama.",
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
    subheadline: "BreedSkool is our exclusive mentorship platform where thriving influencers teach the next generation. Access video courses, masterclasses, and live sessions on Instagram, TikTok, YouTube, and monetization — all in one place.",
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
    subheadline: "Our Shop is stocked with premium templates, plugins, scripts, and digital tools handpicked for influencer success. Buy, sell, or download — everything you need to level up your content game.",
    ctaPrimaryLabel: "Browse the Shop",
    ctaPrimaryLink: "/shop",
    ctaSecondaryLabel: "Sell Your Products",
    ctaSecondaryLink: "/signup?type=creator",
    backgroundImage: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/70 to-black/50",
    accentColor: "from-emerald-400 via-teal-400 to-cyan-400",
  },
];

// ─── Hero Slider ──────────────────────────────────────────────────────────────
function HeroSlider({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning]);

  const prev = () => goTo((current - 1 + slides.length) % slides.length);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" data-testid="section-hero-slider">
      {/* Background Images */}
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
          >
            {s.backgroundImage && (
              <img
                src={s.backgroundImage}
                alt=""
                className="w-full h-full object-cover object-center"
              />
            )}
            <div className={`absolute inset-0 bg-gradient-to-r ${s.overlayColor || "from-black/90 via-black/70 to-black/40"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {/* Decorative glow */}
      <div className="absolute top-1/3 right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 w-full">
        <div
          className={`max-w-3xl transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
          data-testid="slider-content"
        >
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
              {slide.headline.split(".")[0]}.
            </span>
            {slide.headline.includes(".") && slide.headline.split(".").slice(1).join(".").trim() && (
              <> {slide.headline.split(".").slice(1).join(".").trim()}</>
            )}
          </h1>

          {slide.subheadline && (
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl leading-relaxed">
              {slide.subheadline}
            </p>
          )}

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

          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Influencers", value: "10K+", icon: <Users className="w-4 h-4" /> },
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

      {/* Arrow Navigation */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-20"
        data-testid="button-slider-prev"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-20"
        data-testid="button-slider-next"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            data-testid={`button-slide-dot-${i}`}
            className={`transition-all duration-300 rounded-full ${
              i === current
                ? "w-8 h-2.5 bg-white"
                : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────
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
  { id: "d1", title: "Promote Our New Gaming App", brandName: "NovaByte Gaming", reward: "120", totalSlots: 50, filledSlots: 38, category: "gaming", tag: "Gaming · TikTok", featureImage: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=450&q=80&auto=format&fit=crop" },
  { id: "d2", title: "Instagram Reel for Skincare Launch", brandName: "GlowLab Beauty", reward: "85", totalSlots: 30, filledSlots: 12, category: "beauty", tag: "Beauty · Instagram", featureImage: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=450&q=80&auto=format&fit=crop" },
  { id: "d3", title: "7-Day Fitness Transformation", brandName: "PeakFit Pro", reward: "200", totalSlots: 100, filledSlots: 71, category: "fitness", tag: "Fitness · YouTube", featureImage: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=450&q=80&auto=format&fit=crop" },
  { id: "d4", title: "Tech Unboxing — Wireless Earbuds Review", brandName: "SoundWave Tech", reward: "150", totalSlots: 40, filledSlots: 22, category: "tech", tag: "Tech · YouTube", featureImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&q=80&auto=format&fit=crop" },
  { id: "d5", title: "Luxury Resort Travel Vlog", brandName: "Horizon Escapes", reward: "350", totalSlots: 15, filledSlots: 4, category: "travel", tag: "Travel · YouTube", featureImage: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=450&q=80&auto=format&fit=crop" },
  { id: "d6", title: "Healthy Meal Delivery Reel", brandName: "FreshDrop", reward: "75", totalSlots: 80, filledSlots: 53, category: "food", tag: "Food · Instagram", featureImage: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=450&q=80&auto=format&fit=crop" },
];

function CampaignCard({ campaign }: { campaign: any }) {
  const gradient = GRADIENTS[(campaign.category || "").toLowerCase()] || GRADIENTS.default;
  const pct = Math.round(((campaign.filledSlots || 0) / (campaign.totalSlots || 1)) * 100);

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-white" data-testid={`card-campaign-${campaign.id}`}>
      <div className="h-44 relative overflow-hidden">
        {campaign.featureImage && (
          <img src={campaign.featureImage} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <Badge className="absolute top-3 left-3 bg-green-500 text-white text-xs border-0">🟢 Active</Badge>
        <Badge className="absolute top-3 right-3 bg-white text-gray-900 text-sm border-0 font-black px-3">${campaign.reward} USDT</Badge>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">{campaign.brandName || "Brand Partner"}</p>
        <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 text-sm leading-snug">{campaign.title}</h3>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{campaign.filledSlots}/{campaign.totalSlots} joined</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${gradient} rounded-full`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{(campaign.totalSlots - campaign.filledSlots)} spots left</span>
          <Link href="/login">
            <Button size="sm" className="bg-black text-white rounded-lg text-xs hover:bg-gray-900 px-4 h-8" data-testid={`button-apply-${campaign.id}`}>Apply Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinalLanding() {
  const { data: dbSliders = [] } = useQuery<Slide[]>({ queryKey: ["/api/hero-sliders"] });
  const { data: apiCampaigns = [] } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });

  const slides = dbSliders.length > 0 ? dbSliders : DEFAULT_SLIDES;
  const activeCampaigns = (apiCampaigns as any[]).filter((c) => c.isActive && c.status === "active").slice(0, 6);
  const displayCampaigns = activeCampaigns.length >= 3 ? activeCampaigns : DEMO_CAMPAIGNS;

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* ── HERO SLIDER ── */}
      <HeroSlider slides={slides} />

      {/* ── PLATFORM BAR ── */}
      <section className="py-8 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-xs font-semibold mb-5 uppercase tracking-widest">Earn across all major platforms</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale">
            {["TikTok", "YouTube", "Instagram", "Twitch", "Telegram", "X (Twitter)", "Facebook"].map((b) => (
              <span key={b} className="text-sm font-black text-gray-600 tracking-tight">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-black text-white px-4 py-1.5 text-xs">How It Works</Badge>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Simple. Fast. Fair.</h2>
            <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto">Get started in minutes — whether you're a creator looking to earn or a brand ready to scale.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {/* For Creators */}
            <div className="rounded-2xl bg-gray-950 p-8 text-white">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                </div>
                <span className="font-bold text-lg">For Influencers</span>
              </div>
              <div className="space-y-4">
                {[
                  { n: "01", t: "Build Your Profile", d: "Link your socials. Get auto-classified into your influencer tier instantly." },
                  { n: "02", t: "Apply to Campaigns", d: "Browse live brand tasks. Apply with one tap — no agencies, no gatekeepers." },
                  { n: "03", t: "Submit & Get Paid", d: "Post, submit proof, brand approves, and USDT lands in your wallet." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="text-xs font-black text-gray-600 mt-0.5 w-6 shrink-0">{s.n}</span>
                    <div>
                      <p className="font-bold text-sm text-white">{s.t}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup?type=creator" className="mt-6 block">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold" data-testid="button-creator-cta">
                  Start Earning <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* For Brands */}
            <div className="rounded-2xl bg-gray-950 p-8 text-white">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <span className="font-bold text-lg">For Brands</span>
              </div>
              <div className="space-y-4">
                {[
                  { n: "01", t: "Post Your Campaign", d: "Set budget, requirements, and target tier. Go live the same day with escrow." },
                  { n: "02", t: "Reach Verified Creators", d: "Filter by tier, niche, platform, location, and follower count." },
                  { n: "03", t: "Pay Only for Results", d: "You review every submission. Release payment only when you're satisfied." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="text-xs font-black text-gray-600 mt-0.5 w-6 shrink-0">{s.n}</span>
                    <div>
                      <p className="font-bold text-sm text-white">{s.t}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup?type=brand" className="mt-6 block">
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold" data-testid="button-brand-cta">
                  Launch Campaign <Rocket className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CREATOR TIERS ── */}
      <section className="py-20 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,40,200,0.07),transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Influencer Tiers
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Every Creator Has a{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-transparent bg-clip-text">Tier</span>
            </h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto">Auto-classified by your total social following. Higher tier = bigger campaigns and better payouts.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🔥", name: "Rising Sparks", range: "10K–100K", desc: "Entry-level campaigns. Build your verified portfolio.", gradient: "from-orange-500 to-amber-400", border: "border-orange-500/25" },
              { icon: "⚡", name: "Growth Engines", range: "100K–1M", desc: "High-engagement tier. Mid-tier campaigns, higher payouts.", gradient: "from-cyan-500 to-blue-500", border: "border-cyan-500/25" },
              { icon: "💎", name: "Power Influencers", range: "1M–10M", desc: "Premium creators. Priority placement and brand deals.", gradient: "from-violet-600 to-purple-500", border: "border-purple-500/25" },
              { icon: "👑", name: "Global Titans", range: "10M+", desc: "Elite access. Enterprise campaigns, maximum payouts.", gradient: "from-yellow-400 to-orange-500", border: "border-yellow-500/25" },
            ].map((t) => (
              <div key={t.name} className={`rounded-2xl border ${t.border} bg-gray-900/60 backdrop-blur p-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group`} data-testid={`card-tier-${t.name.toLowerCase().replace(" ", "-")}`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-2xl mb-4 shadow-lg`}>{t.icon}</div>
                <p className={`text-xs font-bold text-gray-500 mb-1`}>{t.range} followers</p>
                <h3 className="text-white font-black text-base mb-2">{t.name}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/creators">
              <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl px-8 py-3 text-sm font-bold backdrop-blur">
                Browse All Creators →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gray-100 text-gray-700 border-gray-200 px-4 py-1.5 text-xs">
              <Sparkles className="w-3 h-3 mr-1 inline text-yellow-500" /> Complete Ecosystem
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">One Platform. Four Income Streams.</h2>
            <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto">Taskdrip is your full creator economy — not just campaigns.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <Target className="w-6 h-6" />, title: "Brand Campaigns", desc: "Complete paid tasks on TikTok, YouTube, Instagram and more. Earn USDT for every approved post.", badge: "Earn per task", link: "/campaigns", color: "from-violet-500 to-purple-600", bg: "bg-violet-50", border: "border-violet-100" },
              { icon: <GraduationCap className="w-6 h-6" />, title: "BreedSkool Academy", desc: "Learn from thriving influencers. Master Instagram, TikTok, YouTube and monetization strategies.", badge: "Learn & grow", link: "/breedskool", color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", border: "border-blue-100" },
              { icon: <ShoppingBag className="w-6 h-6" />, title: "Creator Shop", desc: "Premium templates, plugins, and digital tools built for influencer success. Buy or sell.", badge: "Tools & assets", link: "/shop", color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              { icon: <Gift className="w-6 h-6" />, title: "Referral Rewards", desc: "Invite creators and brands. Earn passive crypto income for every person who joins your link.", badge: "Passive income", link: "/signup", color: "from-orange-500 to-amber-600", bg: "bg-orange-50", border: "border-orange-100" },
            ].map((f) => (
              <Link key={f.title} href={f.link}>
                <div className={`${f.bg} ${f.border} border rounded-2xl p-6 hover:shadow-lg transition-all group h-full cursor-pointer`} data-testid={`card-ecosystem-${f.title.toLowerCase().replace(" ", "-")}`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                    {f.icon}
                  </div>
                  <Badge className="mb-3 text-xs bg-white text-gray-600 border-gray-200 font-semibold">{f.badge}</Badge>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE CAMPAIGNS ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Badge className="mb-3 bg-green-100 text-green-700 border-green-200 text-xs">🟢 Live Now</Badge>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Open Campaigns</h2>
              <p className="text-gray-500 text-sm mt-1">Apply now — spots fill fast.</p>
            </div>
            <Link href="/campaigns">
              <Button variant="outline" className="rounded-xl text-sm font-semibold hidden sm:flex">
                View All <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayCampaigns.slice(0, 6).map((c: any) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
          <div className="text-center mt-8">
            <Link href="/campaigns">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 px-10 py-5 rounded-xl font-bold" data-testid="button-view-all-campaigns">
                View All Campaigns <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHY TASKDRIP ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-3">Why Creators & Brands Choose Taskdrip</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">Built differently — for real results, real trust, real payouts.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: <Shield className="w-5 h-5" />, title: "Non-Custodial Payments", desc: "Funds go directly to your wallet — USDT TRC-20, BEP-20, ERC-20, or TON. We never hold your money.", color: "bg-green-100 text-green-600" },
              { icon: <CheckCircle className="w-5 h-5" />, title: "Verified Creators Only", desc: "Every creator goes through KYC. Brands get access to real, active influencers — zero bots.", color: "bg-purple-100 text-purple-600" },
              { icon: <Zap className="w-5 h-5" />, title: "Brand-First Approval", desc: "Brands review every submission. Pay only for results you're genuinely satisfied with.", color: "bg-blue-100 text-blue-600" },
              { icon: <Globe className="w-5 h-5" />, title: "Global Creator Network", desc: "Access creators from 150+ countries across all major platforms.", color: "bg-orange-100 text-orange-600" },
              { icon: <TrendingUp className="w-5 h-5" />, title: "Smart Influencer Tiers", desc: "Auto-classifies creators by total social followers into 4 tiers — from Rising Sparks to Global Titans.", color: "bg-cyan-100 text-cyan-600" },
              { icon: <Crown className="w-5 h-5" />, title: "Multiple Income Streams", desc: "Campaigns, BreedSkool courses, referrals, and shop — your influence, fully monetized.", color: "bg-yellow-100 text-yellow-600" },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>{f.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-3">What Creators Are Saying</h2>
            <p className="text-gray-500 text-sm">Real results from real influencers.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Sarah K.", role: "Beauty Influencer · 180K followers", text: "Taskdrip paid me $800 in USDT within 24 hours of completing my first campaign. Zero hassle — this is the future.", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80&auto=format&fit=crop" },
              { name: "Marcus T.", role: "Tech Creator · 420K followers", text: "Best platform I've used. Instant transparent payments. I've earned over $15,000 this year on Taskdrip.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop" },
              { name: "Priya S.", role: "Fitness Coach · 65K followers", text: "I earned $2,400 last month on just 3 campaigns. The tier system makes me feel valued as a creator.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80&auto=format&fit=crop" },
            ].map((t) => (
              <div key={t.name} className="bg-gray-900 rounded-2xl p-6 border border-white/5" data-testid={`card-testimonial-${t.name.toLowerCase().replace(" ", "-")}`}>
                <div className="flex gap-1 mb-4">
                  {Array(5).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-white font-bold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Ready to Turn Your Influence Into Income?
          </h2>
          <p className="text-purple-200 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Join 10,000+ creators already earning on Taskdrip. Free to join. Campaigns available today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?type=creator">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 px-10 py-6 text-lg rounded-xl font-bold shadow-2xl" data-testid="button-final-cta-creator">
                I'm a Creator <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/signup?type=brand">
              <Button size="lg" className="bg-white/15 text-white hover:bg-white/25 backdrop-blur border border-white/25 px-10 py-6 text-lg rounded-xl font-bold transition-all" data-testid="button-final-cta-brand">
                I'm a Brand <Rocket className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="text-purple-300/60 text-sm mt-6">No credit card required. Campaigns ready the moment you sign up.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
