import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight, Star, Zap, Globe, Shield, TrendingUp, Users, DollarSign,
  CheckCircle, Rocket, Target, Flame, Crown, Play, ChevronRight,
  GraduationCap, ShoppingBag, Gift, Wallet, BarChart3, Lock, Sparkles,
  Trophy, BookOpen, Package, MessageCircle,
} from "lucide-react";

const TIERS = [
  {
    key: "rising_sparks",
    name: "Rising Sparks",
    range: "10K – 100K",
    gradient: "from-orange-500 to-amber-400",
    glow: "shadow-orange-500/30",
    accent: "text-orange-400",
    border: "border-orange-500/30",
    pill: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    icon: "🔥",
    desc: "Emerging creators building loyal, engaged audiences from the ground up.",
    stat: "10K+ creators",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80&auto=format&fit=crop"
  },
  {
    key: "growth_engines",
    name: "Growth Engines",
    range: "100K – 1M",
    gradient: "from-cyan-500 to-blue-500",
    glow: "shadow-cyan-500/30",
    accent: "text-cyan-400",
    border: "border-cyan-500/30",
    pill: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    icon: "⚡",
    desc: "Fast-rising influencers with high engagement rates and growing brand deals.",
    stat: "Strong ROI",
    img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80&auto=format&fit=crop"
  },
  {
    key: "power_influencers",
    name: "Power Influencers",
    range: "1M – 10M",
    gradient: "from-violet-600 to-purple-500",
    glow: "shadow-purple-500/30",
    accent: "text-purple-400",
    border: "border-purple-500/30",
    pill: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "💎",
    desc: "Premium creators with massive reach and proven campaign performance.",
    stat: "Top earners",
    img: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=600&q=80&auto=format&fit=crop"
  },
  {
    key: "global_titans",
    name: "Global Titans",
    range: "10M+",
    gradient: "from-yellow-400 to-orange-500",
    glow: "shadow-yellow-500/30",
    accent: "text-yellow-400",
    border: "border-yellow-500/30",
    pill: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    icon: "👑",
    desc: "World-class celebrities and icons with global cultural influence.",
    stat: "Elite access",
    img: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80&auto=format&fit=crop"
  }
];

const CREATOR_STEPS = [
  { num: "01", title: "Build Your Influencer Profile", desc: "Sign up, link your social channels and follower counts. Auto-classified into your tier instantly — no gatekeepers." },
  { num: "02", title: "Join Brand Campaigns", desc: "Browse campaigns matching your niche. Apply with one tap — no agencies, no middlemen, no commissions." },
  { num: "03", title: "Complete Tasks & Submit Proof", desc: "Post content, submit your link or screenshot. Brand reviews and approves within 48 hours." },
  { num: "04", title: "Earn Crypto Instantly", desc: "Approved tasks pay directly to your wallet in USDT (TRC-20/BEP-20) or TON — anytime, anywhere." },
];

const BRAND_STEPS = [
  { num: "01", title: "Post Your Campaign", desc: "Set your budget, task requirements, and target influencer tier in minutes. Go live same day." },
  { num: "02", title: "Reach Verified Influencers", desc: "Filter our 10K+ creator database by tier, niche, platform, location, and follower count." },
  { num: "03", title: "Review Submissions", desc: "Approve or reject each submission with full transparency. Pay only for results you're satisfied with." },
  { num: "04", title: "Scale Your Reach", desc: "Run multiple campaigns simultaneously. Reach thousands of authentic influencers worldwide." },
];

const NICHES = [
  { name: "Gaming", img: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&q=70&auto=format&fit=crop", color: "from-purple-600 to-indigo-700" },
  { name: "Fitness", img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&q=70&auto=format&fit=crop", color: "from-green-500 to-emerald-600" },
  { name: "Fashion", img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300&q=70&auto=format&fit=crop", color: "from-pink-500 to-rose-600" },
  { name: "Tech", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=70&auto=format&fit=crop", color: "from-blue-500 to-cyan-600" },
  { name: "Beauty", img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&q=70&auto=format&fit=crop", color: "from-rose-400 to-pink-600" },
  { name: "Travel", img: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=300&q=70&auto=format&fit=crop", color: "from-sky-500 to-blue-600" },
  { name: "Food", img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&q=70&auto=format&fit=crop", color: "from-orange-500 to-amber-600" },
  { name: "Finance", img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&q=70&auto=format&fit=crop", color: "from-emerald-600 to-teal-700" },
];

const CATEGORY_GRADIENTS: Record<string, string> = {
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

const CATEGORY_EMOJIS: Record<string, string> = {
  gaming: "🎮", beauty: "💄", fitness: "💪", tech: "📱", travel: "✈️",
  food: "🍜", finance: "💰", fashion: "👗", default: "🚀",
};

const DEMO_CAMPAIGNS = [
  { id: "d1", title: "Promote Our New Gaming App — TikTok/YouTube Review", brandName: "NovaByte Gaming", reward: "120", totalSlots: 50, filledSlots: 38, category: "gaming", tag: "Gaming · TikTok" },
  { id: "d2", title: "Instagram Reel for Premium Skincare Launch", brandName: "GlowLab Beauty", reward: "85", totalSlots: 30, filledSlots: 12, category: "beauty", tag: "Beauty · Instagram" },
  { id: "d3", title: "Fitness Challenge — 7-Day Transformation Campaign", brandName: "PeakFit Pro", reward: "200", totalSlots: 100, filledSlots: 71, category: "fitness", tag: "Fitness · YouTube" },
  { id: "d4", title: "Tech Unboxing — Latest Wireless Earbuds Review", brandName: "SoundWave Tech", reward: "150", totalSlots: 40, filledSlots: 22, category: "tech", tag: "Tech · YouTube" },
  { id: "d5", title: "Travel Vlog Feature — Luxury Resort Partnership", brandName: "Horizon Escapes", reward: "350", totalSlots: 15, filledSlots: 4, category: "travel", tag: "Travel · YouTube" },
  { id: "d6", title: "Food Reel Campaign — Healthy Meal Delivery App", brandName: "FreshDrop", reward: "75", totalSlots: 80, filledSlots: 53, category: "food", tag: "Food · Instagram" },
];

const WHY_FEATURES = [
  { icon: <Shield className="w-7 h-7" />, title: "Non-Custodial Payments", desc: "We never hold your funds. All crypto goes directly to your wallet — full ownership, always.", color: "bg-green-100 text-green-600" },
  { icon: <Star className="w-7 h-7" />, title: "Verified Creators Only", desc: "Every creator goes through KYC. Brands get access to real, active influencers — zero bots.", color: "bg-purple-100 text-purple-600" },
  { icon: <Zap className="w-7 h-7" />, title: "Performance-Based Model", desc: "Pay only for approved work. Brands review each submission before releasing payment.", color: "bg-blue-100 text-blue-600" },
  { icon: <Globe className="w-7 h-7" />, title: "Global Creator Network", desc: "Access creators from 150+ countries across TikTok, YouTube, Instagram, Twitch, Telegram, and X.", color: "bg-orange-100 text-orange-600" },
  { icon: <TrendingUp className="w-7 h-7" />, title: "Smart Influencer Tiers", desc: "Auto-classifies creators by total social followers. Find the perfect fit for every campaign.", color: "bg-cyan-100 text-cyan-600" },
  { icon: <Crown className="w-7 h-7" />, title: "Multiple Income Streams", desc: "Campaigns, BreedSkool courses, referrals, and shop — your influence, fully monetized.", color: "bg-yellow-100 text-yellow-600" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "Beauty Influencer · 180K followers", text: "Taskdrip paid me $800 in USDT within 24 hours of completing my first campaign. Zero hassle — this is the future.", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80&auto=format&fit=crop&facepad=2" },
  { name: "Marcus T.", role: "Tech Creator · 420K followers", text: "Best influencer platform I've used. The crypto payment is instant and transparent. I've earned over $15,000 this year.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop&facepad=2" },
  { name: "Priya S.", role: "Fitness Coach · 65K followers", text: "I earned $2,400 last month running just 3 campaigns. The tier system makes me feel valued as a creator.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80&auto=format&fit=crop&facepad=2" },
];

const ECOSYSTEM_FEATURES = [
  {
    icon: <Target className="w-8 h-8" />,
    title: "Brand Campaigns",
    desc: "Complete brand-sponsored tasks on TikTok, YouTube, Instagram and more. Earn USDT crypto for every approved post.",
    badge: "Earn per task",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    icon: <GraduationCap className="w-8 h-8" />,
    title: "BreedSkool Academy",
    desc: "Learn from top creators with our exclusive influencer education platform. Master Instagram, TikTok, YouTube and monetization.",
    badge: "Learn & grow",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: <ShoppingBag className="w-8 h-8" />,
    title: "Creator Shop",
    desc: "Buy and sell premium digital tools, templates, plugins, and scripts designed for influencer success.",
    badge: "Tools & assets",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    icon: <Gift className="w-8 h-8" />,
    title: "Referral Rewards",
    desc: "Invite creators and brands. Earn passive crypto income for every person who joins through your referral code.",
    badge: "Passive income",
    color: "from-orange-500 to-amber-600",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
];

const PAYMENT_TOKENS = [
  { name: "USDT TRC-20", network: "Tron Network", icon: "⚡", color: "from-red-500 to-orange-500" },
  { name: "USDT BEP-20", network: "BNB Chain", icon: "🔶", color: "from-yellow-500 to-amber-500" },
  { name: "TON", network: "TON Network", icon: "💎", color: "from-blue-500 to-cyan-500" },
];

function CampaignCard({ campaign }: { campaign: any }) {
  const cat = (campaign.category || "").toLowerCase();
  const gradient = CATEGORY_GRADIENTS[cat] || CATEGORY_GRADIENTS.default;
  const emoji = CATEGORY_EMOJIS[cat] || CATEGORY_EMOJIS.default;
  const reward = campaign.reward || "0";
  const totalSlots = campaign.totalSlots || 1;
  const filledSlots = campaign.filledSlots || 0;
  const pct = Math.round((filledSlots / totalSlots) * 100);
  const tag = campaign.tag || `${campaign.category || "General"} · ${campaign.platform || "Multi-platform"}`;
  const brandName = campaign.brandName || "Brand Partner";

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all group cursor-pointer">
      <div className={`h-44 bg-gradient-to-br ${gradient} relative flex items-center justify-center overflow-hidden`}>
        {campaign.featureImage ? (
          <img src={campaign.featureImage} alt={campaign.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
        ) : (
          <>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </>
        )}
        <div className="relative z-10 text-center">
          <div className="text-6xl mb-2 group-hover:scale-110 transition-transform duration-300">{emoji}</div>
        </div>
        <div className="absolute top-3 left-3">
          <Badge className="bg-green-500 text-white text-xs border-0 shadow-sm">🟢 Active</Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className="bg-black/70 backdrop-blur-sm text-white text-sm border-0 font-bold px-2 py-1">${reward}</Badge>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full border border-white/20">{tag}</span>
        </div>
      </div>
      <div className="p-5 bg-white">
        <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">{brandName}</p>
        <h3 className="font-bold text-black mb-3 line-clamp-2 text-sm leading-snug">{campaign.title}</h3>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{filledSlots}/{totalSlots} influencers joined</span>
            <span className="font-semibold text-gray-700">{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{totalSlots - filledSlots} spots left</span>
          <Link href="/login">
            <Button size="sm" className="bg-black text-white rounded-lg text-xs hover:bg-gray-900 px-4">Apply Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FinalLanding() {
  const { data: apiCampaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
  });

  const activeCampaigns = apiCampaigns.filter((c: any) => c.isActive && c.status === "active").slice(0, 6);
  const displayCampaigns = activeCampaigns.length >= 3 ? activeCampaigns : DEMO_CAMPAIGNS;

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1800&q=85&auto=format&fit=crop"
            alt="Influencers collaborating"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-blue-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-7 flex-wrap">
              <Badge className="px-4 py-2 bg-white/15 backdrop-blur-sm text-white border-white/20 text-sm font-semibold rounded-full inline-flex items-center gap-2">
                <Rocket className="w-4 h-4 text-yellow-400" /> #1 Web3 Influencer Marketplace
              </Badge>
              <Badge className="px-3 py-2 bg-green-500/20 backdrop-blur-sm text-green-300 border-green-400/30 text-xs rounded-full">
                🟢 Live Now
              </Badge>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Turn Your{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Influence
              </span>
              <br />
              Into{" "}
              <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                Crypto Income.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl leading-relaxed">
              Taskdrip is the leading Web3 influencer marketplace — connecting global brands with verified creators.
              Complete campaigns, enroll in BreedSkool Academy, and earn{" "}
              <strong className="text-white">USDT & TON crypto</strong> — all in one ecosystem.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <Link href="/signup?type=creator">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 px-10 py-6 text-lg rounded-xl font-bold shadow-2xl hover:shadow-white/20 transition-all">
                  Join as Influencer <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/signup?type=brand">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 px-10 py-6 text-lg rounded-xl font-bold shadow-xl transition-all border-0">
                  Hire Influencers <Rocket className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

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

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-3 bg-white rounded-full" />
          </div>
        </div>
      </section>

      {/* ── PLATFORM LOGOS ── */}
      <section className="py-10 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-sm font-medium mb-7 uppercase tracking-widest">Earn across all major platforms</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-50 grayscale">
            {["TikTok", "YouTube", "Instagram", "Twitch", "Telegram", "X (Twitter)", "Facebook"].map((brand) => (
              <span key={brand} className="text-lg font-black text-gray-600 tracking-tight">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREATOR TIERS ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,40,200,0.06),transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Influencer Tiers
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight tracking-tight">
              Every Creator Has a{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-transparent bg-clip-text">Tier</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Our smart system auto-classifies creators by total followers across TikTok, YouTube, Instagram, Twitch, and more.{" "}
              <span className="text-white font-semibold">Higher tier = bigger campaigns.</span>
            </p>
          </div>

          {/* Tier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TIERS.map((tier) => (
              <Link key={tier.key} href={`/creators?tier=${tier.key}`}>
                <div className={`group relative rounded-3xl border ${tier.border} bg-gray-900/60 backdrop-blur overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-2xl ${tier.glow} transition-all duration-300`}>
                  {/* Top image with gradient overlay */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={tier.img}
                      alt={tier.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent`} />
                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />
                    {/* Icon badge */}
                    <div className="absolute top-4 left-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center text-2xl shadow-xl`}>
                        {tier.icon}
                      </div>
                    </div>
                    {/* Range pill */}
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full border text-xs font-bold ${tier.pill}`}>
                      {tier.range}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <h3 className={`text-lg font-black text-white mb-1.5 group-hover:${tier.accent} transition-colors`}>{tier.name}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">{tier.desc}</p>

                    {/* Divider */}
                    <div className={`h-px bg-gradient-to-r ${tier.gradient} opacity-20 mb-4`} />

                    {/* CTA Button */}
                    <div className={`flex items-center justify-between`}>
                      <span className={`text-xs font-semibold ${tier.accent} uppercase tracking-wider`}>{tier.stat}</span>
                      <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r ${tier.gradient} text-white text-xs font-bold shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all`}>
                        Browse
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-14 text-center">
            <p className="text-gray-500 text-sm mb-4">Not sure which tier fits you?</p>
            <Link href="/creators">
              <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl px-8 py-5 text-sm font-bold backdrop-blur transition-all hover:scale-105">
                Browse All Influencers →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM FEATURES ── */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/10 text-white border-white/20 px-4 py-1.5 inline-flex items-center gap-1 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-yellow-400" /> Complete Ecosystem
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">One Platform. Infinite Income.</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Taskdrip is more than campaigns — it's a full creator economy platform with four powerful income streams.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ECOSYSTEM_FEATURES.map((f) => (
              <div key={f.title} className={`${f.bg} ${f.border} border rounded-2xl p-6 hover:shadow-lg transition-all group`}>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <Badge className="mb-3 text-xs bg-white text-gray-700 border-gray-200">{f.badge}</Badge>
                <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 px-10 py-6 text-base rounded-xl font-bold shadow-2xl">
                Start Earning For Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-black text-white px-4 py-1.5">How It Works</Badge>
            <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight">
              From brief to{" "}
              <span className="bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-500 bg-clip-text text-transparent">
                crypto payout
              </span>
            </h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              Taskdrip keeps creator discovery, campaign execution, proof review, and payments in one clean workflow for both sides of the marketplace.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 top-20 hidden lg:block h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <div className="grid md:grid-cols-4 gap-5 mb-16">
              {[
                { icon: <Target className="w-6 h-6" />, title: "Match", desc: "Brands define a campaign and creators match by niche, tier, and platform.", tone: "from-violet-600 to-indigo-600" },
                { icon: <Play className="w-6 h-6" />, title: "Create", desc: "Creators publish the task content and submit links, screenshots, or proof.", tone: "from-blue-600 to-cyan-600" },
                { icon: <CheckCircle className="w-6 h-6" />, title: "Approve", desc: "Brands review real work before campaign funds are released.", tone: "from-emerald-600 to-teal-600" },
                { icon: <Wallet className="w-6 h-6" />, title: "Pay", desc: "Approved creators receive tracked Web3 payouts with transparent records.", tone: "from-gray-950 to-violet-700" },
              ].map((item, i) => (
                <div key={item.title} className="relative bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.tone} text-white flex items-center justify-center mb-5 shadow-lg`}>
                    {item.icon}
                  </div>
                  <div className="text-xs font-black text-gray-300 mb-2">STEP {String(i + 1).padStart(2, "0")}</div>
                  <h3 className="text-xl font-black text-black mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-[2rem] border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <Badge className="mb-1 bg-emerald-50 text-emerald-700 border-emerald-100">For Creators</Badge>
                  <h3 className="text-2xl font-black text-black">Earn from your influence</h3>
                </div>
              </div>
              <div className="space-y-4">
                {CREATOR_STEPS.map((step) => (
                  <div key={step.num} className="flex gap-4 items-start p-4 rounded-2xl bg-white border border-gray-100">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-black text-sm">{step.num}</div>
                    <div>
                      <h4 className="font-bold text-black mb-1">{step.title}</h4>
                      <p className="text-gray-600 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup?type=creator">
                <Button className="w-full mt-6 bg-black hover:bg-gray-900 text-white py-5 rounded-xl font-semibold text-base">
                  Start Earning Today <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="rounded-[2rem] border border-gray-100 bg-black p-8 shadow-xl text-white overflow-hidden relative">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-500/30 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <Badge className="mb-1 bg-white/10 text-white border-white/20">For Brands</Badge>
                    <h3 className="text-2xl font-black text-white">Launch campaigns with control</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  {BRAND_STEPS.map((step) => (
                    <div key={step.num} className="flex gap-4 items-start p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                      <div className="flex-shrink-0 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-black text-sm">{step.num}</div>
                      <div>
                        <h4 className="font-bold text-white mb-1">{step.title}</h4>
                        <p className="text-white/70 text-sm">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/signup?type=brand">
                  <Button className="w-full mt-6 bg-white hover:bg-gray-100 text-black py-5 rounded-xl font-semibold text-base">
                    Launch a Campaign <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BREEDSKOOL ACADEMY ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200 px-4 py-1.5 inline-flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> BreedSkool Academy
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
                Learn How to{" "}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  10x Your Influence
                </span>
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Unlock exclusive courses taught by top-earning creators. Master the skills that turn followers into income — Instagram growth, TikTok virality, YouTube monetization, and crypto earnings.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: <BookOpen className="w-5 h-5 text-violet-600" />, text: "Expert-taught courses on Instagram, TikTok & YouTube growth" },
                  { icon: <Trophy className="w-5 h-5 text-violet-600" />, text: "Earn platform badges and credentials to stand out to brands" },
                  { icon: <DollarSign className="w-5 h-5 text-violet-600" />, text: "Monetization masterclasses — brand deals, affiliate, and crypto" },
                  { icon: <Users className="w-5 h-5 text-violet-600" />, text: "Community access and live Q&A sessions with top influencers" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                    <p className="text-gray-700 text-sm font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
              <Link href="/breedskool">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-5 rounded-xl font-semibold text-base">
                  Explore BreedSkool <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 rounded-3xl p-8 text-white">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Active Courses", value: "50+", icon: "📚" },
                    { label: "Students Enrolled", value: "2.1K+", icon: "🎓" },
                    { label: "Avg Rating", value: "4.9★", icon: "⭐" },
                    { label: "Expert Instructors", value: "30+", icon: "👨‍🏫" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-xl font-black">{s.value}</div>
                      <div className="text-white/70 text-xs">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    "Instagram Growth Masterclass",
                    "TikTok Algorithm Decoded",
                    "YouTube Monetization Blueprint",
                    "Crypto Earning for Creators",
                  ].map((course) => (
                    <div key={course} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                      <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" />
                      <span className="text-sm font-medium">{course}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NICHES ── */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Creators Across Every Niche</h2>
            <p className="text-gray-400 text-lg">From gaming to fitness, beauty to tech — find verified creators in your space.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {NICHES.map((niche) => (
              <Link key={niche.name} href="/creators">
                <div className="relative rounded-2xl overflow-hidden cursor-pointer group h-36">
                  <img src={niche.img} alt={niche.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${niche.color} opacity-60 group-hover:opacity-70 transition-opacity`} />
                  <div className="absolute inset-0 flex items-end p-4">
                    <span className="text-white font-bold text-lg">{niche.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link href="/creators">
              <Button className="bg-white text-black hover:bg-gray-100 px-8 py-5 rounded-xl text-base font-semibold shadow-lg">
                Browse All Creators <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── LIVE CAMPAIGNS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <Badge className="mb-3 bg-orange-100 text-orange-700 border-orange-200 px-4 py-1.5 inline-flex items-center gap-1">
                <Flame className="w-3 h-3" /> Trending Now
              </Badge>
              <h2 className="text-4xl font-bold text-black">Live Campaigns</h2>
              <p className="text-gray-500 mt-2">Join these active campaigns and start earning today</p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="border-2 border-black rounded-xl font-semibold hidden sm:flex">
                View All <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCampaigns.map((campaign: any) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/login">
              <Button variant="outline" className="border-2 border-black rounded-xl font-semibold px-8 py-5">
                View All Campaigns <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CRYPTO PAYMENTS ── */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-white/10 text-white border-white/20 px-4 py-1.5 inline-flex items-center gap-2 backdrop-blur-sm">
                <Wallet className="w-4 h-4 text-yellow-400" /> Crypto-Native Payments
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Get Paid in{" "}
                <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                  Crypto. Instantly.
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                No banks. No delays. No middlemen. Taskdrip sends your earnings directly to your crypto wallet the moment a brand approves your work. True financial freedom for creators worldwide.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { title: "Instant settlement", desc: "Payments release the moment your submission is approved — no waiting periods." },
                  { title: "Non-custodial", desc: "We never hold your funds. Your money goes directly to your wallet address." },
                  { title: "Multi-network support", desc: "Choose from USDT TRC-20, USDT BEP-20, or TON based on your preference." },
                  { title: "No withdrawal fees", desc: "Keep 100% of what you earn. No hidden fees or platform cuts." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-semibold text-sm">{item.title}</span>
                      <span className="text-gray-400 text-sm"> — {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {PAYMENT_TOKENS.map((token) => (
                <div key={token.name} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/10 transition-all">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${token.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {token.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{token.name}</p>
                    <p className="text-gray-400 text-sm">{token.network}</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Supported</Badge>
                </div>
              ))}
              <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Lock className="w-5 h-5 text-violet-400" />
                  <span className="text-white font-semibold">Escrow-Protected Campaigns</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Brand funds are held in escrow until work is approved — guaranteeing creators always get paid for completed tasks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BANNER ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=80&auto=format&fit=crop"
            alt="Stats background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/95 via-blue-900/90 to-cyan-900/85" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-white mb-3">The Numbers Speak for Themselves</h2>
            <p className="text-blue-200">Taskdrip is the fastest-growing influencer marketplace in Web3</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: "10,000+", label: "Registered Influencers", icon: "👥" },
              { value: "500+", label: "Brand Partners", icon: "🏢" },
              { value: "$450K+", label: "Total Payouts", icon: "💰" },
              { value: "2,500+", label: "Campaigns Launched", icon: "🚀" },
            ].map((s) => (
              <div key={s.label} className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all">
                <div className="text-4xl mb-3">{s.icon}</div>
                <div className="text-4xl font-black mb-2">{s.value}</div>
                <div className="text-blue-200 text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-yellow-100 text-yellow-700 border-yellow-200 px-4 py-1.5 inline-flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> Creator Success Stories
            </Badge>
            <h2 className="text-4xl font-bold text-black">Real Creators. Real Crypto Earnings.</h2>
            <p className="text-gray-600 mt-3">See what influencers are achieving on Taskdrip every day.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover border-2 border-purple-200" />
                  <div>
                    <div className="font-bold text-black text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY TASKDRIP ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-gray-100 text-gray-700 border-gray-200 px-4 py-1.5">Platform Features</Badge>
            <h2 className="text-4xl font-bold text-black mb-4">Why Taskdrip?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Built for the Web3 era. Performance-driven. Fully transparent. Creator-first.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {WHY_FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all group">
                <div className={`w-14 h-14 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-black mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&q=80&auto=format&fit=crop"
            alt="CTA background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/85" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-purple-500/25 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-5 bg-white/10 text-white border-white/20 px-4 py-1.5 text-sm backdrop-blur-sm">Join Free — No Credit Card Required</Badge>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Your Influence Is{" "}
            <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
              Your Income.
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 10,000+ influencers and 500+ brands already on Taskdrip. Earn crypto. Grow faster. Learn with BreedSkool. No middlemen. No limits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?type=creator">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 px-12 py-7 text-lg rounded-xl font-black shadow-2xl hover:shadow-white/10 transition-all">
                Join as Influencer 🚀
              </Button>
            </Link>
            <Link href="/signup?type=brand">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 px-12 py-7 text-lg rounded-xl font-black shadow-xl transition-all border-0">
                Hire Influencers →
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-gray-500 text-sm flex-wrap">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Free to join</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Instant crypto payouts</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> 150+ countries</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> BreedSkool included</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
