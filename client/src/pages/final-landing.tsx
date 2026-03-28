import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight, Star, Zap, Globe, Shield, TrendingUp, Users, DollarSign,
  CheckCircle, Rocket, Target, Flame, Crown
} from "lucide-react";

const TIERS = [
  {
    name: "Rising Sparks",
    range: "1K – 10K",
    gradient: "from-orange-400 to-amber-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    icon: "🔥",
    desc: "Emerging creators building their audience"
  },
  {
    name: "Growth Engines",
    range: "10K – 100K",
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "⚡",
    desc: "Established creators with engaged communities"
  },
  {
    name: "Power Influencers",
    range: "100K – 1M",
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    icon: "💎",
    desc: "Top-tier creators with massive reach"
  },
  {
    name: "Global Titans",
    range: "1M+",
    gradient: "from-yellow-500 to-orange-500",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: "👑",
    desc: "Elite global creators and celebrities"
  }
];

const CREATOR_STEPS = [
  { num: "01", title: "Create Your Profile", desc: "Sign up, add your social handles and follower counts to get auto-classified into your creator tier." },
  { num: "02", title: "Browse & Join Campaigns", desc: "Discover brand campaigns matching your niche and audience. Apply with one click." },
  { num: "03", title: "Complete & Submit Proof", desc: "Complete the task, submit your screenshot or link, and await brand approval." },
  { num: "04", title: "Get Paid in Crypto", desc: "Approved tasks credit your wallet. Withdraw to USDT or TON anytime." },
];

const BRAND_STEPS = [
  { num: "01", title: "Post Your Campaign", desc: "Set your budget, task requirements, and target creator tier in minutes." },
  { num: "02", title: "Discover Creators", desc: "Filter our creator database by tier, niche, platform, location, and follower count." },
  { num: "03", title: "Review Submissions", desc: "Approve or reject each submission. Pay only for results you're satisfied with." },
  { num: "04", title: "Scale Your Results", desc: "Run multiple campaigns simultaneously. Reach thousands of creators worldwide." },
];

const NICHES = ["Gaming", "Fitness", "Fashion", "Tech", "Beauty", "Food", "Travel", "Finance", "Music", "Education", "Sports", "Lifestyle"];

const WHY_FEATURES = [
  { icon: <Shield className="w-7 h-7" />, title: "Non-Custodial Payments", desc: "We never hold your funds. All crypto goes directly to your wallet — full ownership, always.", color: "bg-green-100 text-green-600" },
  { icon: <Star className="w-7 h-7" />, title: "Verified Creators", desc: "Every creator goes through KYC. Brands get access to real, active influencers — no bots.", color: "bg-purple-100 text-purple-600" },
  { icon: <Zap className="w-7 h-7" />, title: "Performance-Based", desc: "Pay only for approved work. Brands review each submission before releasing payment.", color: "bg-blue-100 text-blue-600" },
  { icon: <Globe className="w-7 h-7" />, title: "Global Reach", desc: "Access creators from 150+ countries across TikTok, YouTube, Instagram, Twitch, Telegram, and more.", color: "bg-orange-100 text-orange-600" },
  { icon: <TrendingUp className="w-7 h-7" />, title: "Smart Tier System", desc: "Auto-classifies creators by total social followers. Find the perfect fit for every campaign.", color: "bg-cyan-100 text-cyan-600" },
  { icon: <Crown className="w-7 h-7" />, title: "Multiple Income Streams", desc: "Campaigns, tips, referrals, and shop purchases — your influence, fully monetized.", color: "bg-yellow-100 text-yellow-600" },
];

export default function FinalLanding() {
  const { data: campaigns = [] } = useQuery({ queryKey: ["/api/campaigns"] });
  const campaignList = Array.isArray(campaigns) ? campaigns : [];
  const activeCampaigns = campaignList.filter((c: any) => c.isActive).slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white pt-24 pb-28">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-purple-100 to-blue-100 rounded-full blur-3xl opacity-70" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full blur-3xl opacity-70" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 px-5 py-2 bg-black text-white text-sm font-semibold rounded-full inline-flex items-center gap-2">
            <Rocket className="w-4 h-4" /> Web3 SocialFi Platform
          </Badge>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-black leading-[1.05] tracking-tight mb-6">
            Connect with the{" "}
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Right Creators.
            </span>
            <br />
            Launch{" "}
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              Powerful Campaigns.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Taskdrip connects global brands with vetted creators across every platform.
            Complete tasks, earn crypto, scale your brand — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/signup?type=brand">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 px-10 py-6 text-lg rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                Find Creators <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/signup?type=creator">
              <Button size="lg" variant="outline" className="border-2 border-black text-black hover:bg-black hover:text-white px-10 py-6 text-lg rounded-xl font-bold transition-all">
                Start Campaign <Rocket className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
            {[
              { label: "Creators", value: "10K+", icon: <Users className="w-5 h-5" /> },
              { label: "Campaigns", value: "2.5K+", icon: <Target className="w-5 h-5" /> },
              { label: "Paid Out", value: "$450K+", icon: <DollarSign className="w-5 h-5" /> },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                <div className="text-gray-400 flex justify-center mb-2">{s.icon}</div>
                <div className="text-2xl font-black text-black">{s.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREATOR TIERS ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200 px-4 py-1.5">Creator Tiers</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">Every Creator Has a Place</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our intelligent system auto-classifies creators based on total followers across all connected platforms.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier) => (
              <div key={tier.name} className={`rounded-2xl border-2 ${tier.border} ${tier.bg} p-6 text-center hover:shadow-lg transition-all group relative overflow-hidden`}>
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${tier.gradient} flex items-center justify-center text-3xl mx-auto mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  {tier.icon}
                </div>
                <h3 className={`font-bold ${tier.text} mb-1`}>{tier.name}</h3>
                <div className="text-2xl font-black text-black mb-2">{tier.range}</div>
                <p className="text-sm text-gray-600">{tier.desc}</p>
                <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${tier.gradient} text-white opacity-80`}>
                  followers
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* For Creators */}
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700 border-green-200 px-4 py-1.5">For Creators</Badge>
              <h2 className="text-3xl font-bold text-black mb-3">Earn Crypto Doing What You Love</h2>
              <p className="text-gray-600 mb-8">Complete brand campaigns that match your niche. Get paid in USDT or TON.</p>
              <div className="space-y-5">
                {CREATOR_STEPS.map((step) => (
                  <div key={step.num} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center font-bold text-sm">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="font-bold text-black mb-1">{step.title}</h3>
                      <p className="text-gray-600 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup?type=creator">
                <Button className="mt-8 bg-green-600 hover:bg-green-700 text-white px-7 py-5 rounded-xl font-semibold">
                  Start Earning Today <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* For Brands */}
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200 px-4 py-1.5">For Brands</Badge>
              <h2 className="text-3xl font-bold text-black mb-3">Scale Your Brand with Creator Marketing</h2>
              <p className="text-gray-600 mb-8">Access thousands of vetted creators. Pay only for approved results.</p>
              <div className="space-y-5">
                {BRAND_STEPS.map((step) => (
                  <div key={step.num} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="font-bold text-black mb-1">{step.title}</h3>
                      <p className="text-gray-600 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup?type=brand">
                <Button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-7 py-5 rounded-xl font-semibold">
                  Launch a Campaign <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── NICHES (DARK) ── */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Creators Across Every Niche</h2>
          <p className="text-gray-400 mb-10">From gaming to fitness, beauty to tech — find creators in your space.</p>
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {NICHES.map((niche) => (
              <Link key={niche} href="/creators">
                <span className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium cursor-pointer transition-all border border-white/10 hover:border-white/30">
                  {niche}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/creators">
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-5 rounded-xl text-base font-semibold">
              Browse All Creators <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
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
                <div key={campaign.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <div className="h-36 bg-gradient-to-br from-blue-500 to-purple-600 relative flex items-center justify-center">
                    {campaign.featureImage ? (
                      <img src={campaign.featureImage} alt={campaign.title} className="w-full h-full object-cover absolute inset-0" />
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
      <section className="py-20 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: "10,000+", label: "Registered Creators" },
              { value: "500+", label: "Brand Partners" },
              { value: "$450K+", label: "Total Payouts" },
              { value: "2,500+", label: "Campaigns Launched" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-4xl font-black mb-2">{s.value}</div>
                <div className="text-blue-100 text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY TASKDRIP ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-black mb-4">Why Taskdrip?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Built for the Web3 era. Performance-driven. Fully transparent.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {WHY_FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all">
                <div className={`w-14 h-14 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
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
      <section className="py-24 bg-black">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-black text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-400 mb-10">
            Join thousands of creators and brands already on Taskdrip.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?type=creator">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 px-10 py-6 text-lg rounded-xl font-bold">
                Join as Creator
              </Button>
            </Link>
            <Link href="/signup?type=brand">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black px-10 py-6 text-lg rounded-xl font-bold">
                Join as Brand
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
