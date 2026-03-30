import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight, Star, Zap, Globe, Shield, TrendingUp, Users, DollarSign,
  CheckCircle, Rocket, Target, Flame, Crown, Play, ChevronRight
} from "lucide-react";

const TIERS = [
  {
    name: "Rising Sparks",
    range: "1K – 10K",
    gradient: "from-orange-400 to-amber-500",
    bg: "from-orange-50 to-amber-50",
    border: "border-orange-200",
    text: "text-orange-700",
    icon: "🔥",
    desc: "Emerging creators building their audience",
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&q=80&auto=format&fit=crop"
  },
  {
    name: "Growth Engines",
    range: "10K – 100K",
    gradient: "from-blue-500 to-cyan-500",
    bg: "from-blue-50 to-cyan-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "⚡",
    desc: "Established creators with engaged communities",
    img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80&auto=format&fit=crop"
  },
  {
    name: "Power Influencers",
    range: "100K – 1M",
    gradient: "from-purple-500 to-violet-600",
    bg: "from-purple-50 to-violet-50",
    border: "border-purple-200",
    text: "text-purple-700",
    icon: "💎",
    desc: "Top-tier creators with massive reach",
    img: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=400&q=80&auto=format&fit=crop"
  },
  {
    name: "Global Titans",
    range: "1M+",
    gradient: "from-yellow-500 to-orange-500",
    bg: "from-yellow-50 to-orange-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: "👑",
    desc: "Elite global creators and celebrities",
    img: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&q=80&auto=format&fit=crop"
  }
];

const CREATOR_STEPS = [
  { num: "01", title: "Create Your Influencer Profile", desc: "Sign up, add your social handles and follower counts. Get auto-classified into your influencer tier instantly." },
  { num: "02", title: "Browse & Join Campaigns", desc: "Discover brand campaigns matching your niche. Apply with one click — no agencies, no middlemen." },
  { num: "03", title: "Complete & Submit Proof", desc: "Complete the task, submit your content link or screenshot, and await brand approval." },
  { num: "04", title: "Get Paid in Crypto", desc: "Approved tasks credit your wallet instantly. Withdraw to USDT (TRC-20/BEP-20) or TON anytime." },
];

const BRAND_STEPS = [
  { num: "01", title: "Post Your Campaign", desc: "Set your budget, task requirements, and target influencer tier in minutes." },
  { num: "02", title: "Discover Influencers", desc: "Filter our influencer database by tier, niche, platform, location, and follower count." },
  { num: "03", title: "Review Submissions", desc: "Approve or reject each submission. Pay only for results you're satisfied with." },
  { num: "04", title: "Scale Your Results", desc: "Run multiple campaigns simultaneously. Reach thousands of influencers worldwide." },
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

const WHY_FEATURES = [
  { icon: <Shield className="w-7 h-7" />, title: "Non-Custodial Payments", desc: "We never hold your funds. All crypto goes directly to your wallet — full ownership, always.", color: "bg-green-100 text-green-600", accent: "bg-green-600" },
  { icon: <Star className="w-7 h-7" />, title: "Verified Creators", desc: "Every creator goes through KYC. Brands get access to real, active influencers — no bots.", color: "bg-purple-100 text-purple-600", accent: "bg-purple-600" },
  { icon: <Zap className="w-7 h-7" />, title: "Performance-Based", desc: "Pay only for approved work. Brands review each submission before releasing payment.", color: "bg-blue-100 text-blue-600", accent: "bg-blue-600" },
  { icon: <Globe className="w-7 h-7" />, title: "Global Reach", desc: "Access creators from 150+ countries across TikTok, YouTube, Instagram, Twitch, Telegram, and more.", color: "bg-orange-100 text-orange-600", accent: "bg-orange-600" },
  { icon: <TrendingUp className="w-7 h-7" />, title: "Smart Tier System", desc: "Auto-classifies creators by total social followers. Find the perfect fit for every campaign.", color: "bg-cyan-100 text-cyan-600", accent: "bg-cyan-600" },
  { icon: <Crown className="w-7 h-7" />, title: "Multiple Income Streams", desc: "Campaigns, tips, referrals, and shop purchases — your influence, fully monetized.", color: "bg-yellow-100 text-yellow-600", accent: "bg-yellow-600" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "Beauty Influencer · 180K followers", text: "Taskdrip paid me $800 in USDT within 24 hours of completing my first campaign. Zero hassle.", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80&auto=format&fit=crop&facepad=2" },
  { name: "Marcus T.", role: "Tech Creator · 420K followers", text: "Best influencer platform I've used. The crypto payment is instant and transparent. Highly recommend.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop&facepad=2" },
  { name: "Priya S.", role: "Fitness Coach · 65K followers", text: "I earned $2,400 last month running just 3 campaigns. The tier system makes me feel valued.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80&auto=format&fit=crop&facepad=2" },
];

export default function FinalLanding() {
  const { data: campaigns = [] } = useQuery({ queryKey: ["/api/campaigns"] });
  const campaignList = Array.isArray(campaigns) ? campaigns : [];
  const activeCampaigns = campaignList.filter((c: any) => c.isActive).slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1800&q=85&auto=format&fit=crop"
            alt="Influencers collaborating"
            className="w-full h-full object-cover object-center"
          />
          {/* Multi-layer overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Floating accent orbs */}
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-blue-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-7">
              <Badge className="px-4 py-2 bg-white/15 backdrop-blur-sm text-white border-white/20 text-sm font-semibold rounded-full inline-flex items-center gap-2">
                <Rocket className="w-4 h-4 text-yellow-400" /> #1 Web3 Influencer Platform
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
              Taskdrip connects global brands with verified influencers. Complete brand campaigns,
              earn <strong className="text-white">USDT & TON crypto</strong>, and scale your reach — all in one platform.
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

            {/* Stats pills */}
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

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-3 bg-white rounded-full" />
          </div>
        </div>
      </section>

      {/* ── BRAND LOGOS STRIP ── */}
      <section className="py-10 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400 text-sm font-medium mb-7 uppercase tracking-widest">Trusted by brands worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale">
            {["TikTok", "YouTube", "Instagram", "Twitch", "Telegram", "X (Twitter)"].map((brand) => (
              <span key={brand} className="text-lg font-black text-gray-600 tracking-tight">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREATOR TIERS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200 px-4 py-1.5">Influencer Tiers</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">Every Influencer Has a Tier</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our smart system auto-classifies influencers by total followers across TikTok, YouTube, Instagram, Twitch, and more.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier) => (
              <div key={tier.name} className={`rounded-2xl border-2 ${tier.border} bg-gradient-to-br ${tier.bg} overflow-hidden hover:shadow-xl transition-all group`}>
                <div className="relative h-36 overflow-hidden">
                  <img src={tier.img} alt={tier.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-50`} />
                  <div className="absolute top-3 left-3 text-3xl">{tier.icon}</div>
                  <div className={`absolute bottom-3 right-3 text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${tier.gradient} text-white shadow-lg`}>
                    {tier.range}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className={`font-bold ${tier.text} text-base mb-1`}>{tier.name}</h3>
                  <p className="text-sm text-gray-600">{tier.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-black text-white px-4 py-1.5">How It Works</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-black">Simple. Fast. Rewarding.</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            {/* For Influencers */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1598550473359-433baf8e8fd0?w=700&q=85&auto=format&fit=crop"
                alt="Influencer creating content"
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <Badge className="mb-3 bg-green-500 text-white border-0 px-3 py-1">For Influencers</Badge>
                <h3 className="text-2xl font-black text-white">Monetize Your Influence</h3>
                <p className="text-gray-300 text-sm mt-1">Join brand campaigns that match your niche. Get paid instantly in USDT or TON.</p>
              </div>
            </div>
            <div className="space-y-5">
              {CREATOR_STEPS.map((step) => (
                <div key={step.num} className="flex gap-4 items-start p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex-shrink-0 w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-bold text-black mb-1">{step.title}</h3>
                    <p className="text-gray-600 text-sm">{step.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                </div>
              ))}
              <Link href="/signup?type=creator">
                <Button className="w-full mt-4 bg-black hover:bg-gray-900 text-white py-5 rounded-xl font-semibold text-base">
                  Start Earning Today <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5 order-2 lg:order-1">
              {BRAND_STEPS.map((step) => (
                <div key={step.num} className="flex gap-4 items-start p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex-shrink-0 w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-bold text-black mb-1">{step.title}</h3>
                    <p className="text-gray-600 text-sm">{step.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                </div>
              ))}
              <Link href="/signup?type=brand">
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-xl font-semibold text-base">
                  Launch a Campaign <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            {/* For Brands */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl order-1 lg:order-2">
              <img
                src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=700&q=85&auto=format&fit=crop"
                alt="Brand marketing team"
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <Badge className="mb-3 bg-blue-500 text-white border-0 px-3 py-1">For Brands</Badge>
                <h3 className="text-2xl font-black text-white">Scale with Influencer Marketing</h3>
                <p className="text-gray-300 text-sm mt-1">Access 10,000+ verified influencers. Pay only for approved results.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NICHES ── */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Influencers Across Every Niche</h2>
            <p className="text-gray-400 text-lg">From gaming to fitness, beauty to tech — find verified influencers in your space.</p>
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
                Browse All Influencers <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRENDING CAMPAIGNS ── */}
      {activeCampaigns.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <Badge className="mb-3 bg-orange-100 text-orange-700 border-orange-200 px-4 py-1.5 inline-flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Trending
                </Badge>
                <h2 className="text-4xl font-bold text-black">Live Campaigns</h2>
              </div>
              <Link href="/login">
                <Button variant="outline" className="border-2 border-black rounded-xl font-semibold">View All</Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {activeCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all group">
                  <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 relative flex items-center justify-center overflow-hidden">
                    {campaign.featureImage ? (
                      <img src={campaign.featureImage} alt={campaign.title} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform" />
                    ) : (
                      <Target className="w-10 h-10 text-white/50" />
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-green-500 text-white text-xs border-0">Active</Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-black/80 text-white text-xs border-0">${campaign.reward}</Badge>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-gray-400 mb-1">{campaign.brandName}</p>
                    <h3 className="font-bold text-black mb-3 line-clamp-2">{campaign.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{campaign.filledSlots}/{campaign.totalSlots} joined</span>
                      <Link href="/login">
                        <Button size="sm" className="bg-black text-white rounded-lg text-xs">Join Now</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
            <h2 className="text-4xl font-black text-white mb-3">Growing Every Day</h2>
            <p className="text-blue-200">Taskdrip is the fastest-growing influencer platform in Web3</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: "10,000+", label: "Registered Influencers", icon: "👥" },
              { value: "500+", label: "Brand Partners", icon: "🏢" },
              { value: "$450K+", label: "Total Payouts", icon: "💰" },
              { value: "2,500+", label: "Campaigns Launched", icon: "🚀" },
            ].map((s) => (
              <div key={s.label} className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
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
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> Success Stories
            </Badge>
            <h2 className="text-4xl font-bold text-black">Influencers Love Taskdrip</h2>
            <p className="text-gray-600 mt-3">Real results from real influencers on the platform.</p>
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
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Built for the Web3 era. Performance-driven. Fully transparent.</p>
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

        {/* Glowing accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-purple-500/25 blur-3xl rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-5 bg-white/10 text-white border-white/20 px-4 py-1.5 text-sm backdrop-blur-sm">Start Today — It's Free</Badge>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Your Influence Is{" "}
            <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
              Your Income.
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 10,000+ influencers and 500+ brands already on Taskdrip. Earn crypto. Grow faster. No middlemen.
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

          {/* Trust badge */}
          <div className="mt-10 flex items-center justify-center gap-6 text-gray-500 text-sm">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Free to join</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Instant crypto payouts</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> 150+ countries</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
