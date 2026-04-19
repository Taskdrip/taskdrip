import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap, Star, Trophy, Target, Users, BookOpen, ShoppingBag,
  Wallet, ArrowRight, TrendingUp, Shield, Globe, Gift,
  Coins, BarChart3, Lock, Sparkles, ChevronDown, ChevronUp,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";

const EARN_ACTIVITIES = [
  { icon: "👋", action: "Sign-up Welcome Bonus", pts: 50, category: "Onboarding" },
  { icon: "✅", action: "Complete Your Profile", pts: 100, category: "Onboarding" },
  { icon: "🌅", action: "Daily Login", pts: 5, category: "Engagement" },
  { icon: "✍️", action: "Post Your First Feed Update", pts: 25, category: "Engagement" },
  { icon: "📝", action: "Feed Post (each)", pts: 5, category: "Engagement" },
  { icon: "👥", action: "Follow a Creator", pts: 5, category: "Engagement" },
  { icon: "📣", action: "Apply to a Campaign", pts: 10, category: "Campaigns" },
  { icon: "🎯", action: "Campaign Approved", pts: 25, category: "Campaigns" },
  { icon: "✔️", action: "Campaign Task Completed", pts: 50, category: "Campaigns" },
  { icon: "🎓", action: "Enroll in Free Course", pts: 20, category: "Learning" },
  { icon: "📚", action: "Enroll in Paid Course", pts: 50, category: "Learning" },
  { icon: "🔗", action: "Refer a Friend (who joins)", pts: 100, category: "Referrals" },
  { icon: "💸", action: "Complete a Social Quick Task", pts: "10–50", category: "Tasks" },
  { icon: "⚡", action: "Purchase $TDRIP directly", pts: "Variable", category: "Purchase" },
];

const CURRENT_USES = [
  {
    icon: <Coins className="h-6 w-6 text-yellow-500" />,
    title: "Tip & Support Creators",
    desc: "Send $TDRIP tips directly to creators whose work you love. Build a reputation as a patron of the creator economy.",
  },
  {
    icon: <Trophy className="h-6 w-6 text-purple-500" />,
    title: "Leaderboard Ranking",
    desc: "Your $TDRIP balance determines your spot on the Taskdrip leaderboard. Top holders earn exclusive recognition and visibility.",
  },
  {
    icon: <Target className="h-6 w-6 text-blue-500" />,
    title: "Level Up Your Profile",
    desc: "From Starter to Elite — your level is powered by your $TDRIP points. Higher levels unlock trust signals and more campaign access.",
  },
  {
    icon: <Zap className="h-6 w-6 text-orange-500" />,
    title: "Quick Task Rewards",
    desc: "Complete social tasks and micro-quests to earn $TDRIP instantly. The more you engage, the more you stack.",
  },
  {
    icon: <Users className="h-6 w-6 text-green-500" />,
    title: "P2P Transfers",
    desc: "Transfer $TDRIP to any user on the platform for services, collaborations, or payments between creators.",
  },
];

const FUTURE_UTILITY = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Governance & Voting",
    desc: "Hold $TDRIP, shape the platform. Top holders will vote on campaigns, feature releases, and platform direction.",
    tag: "Q3 2025",
    color: "from-purple-500 to-indigo-600",
  },
  {
    icon: <ShoppingBag className="h-6 w-6" />,
    title: "Marketplace Discounts",
    desc: "Spend $TDRIP to unlock discounts on Shop products, BreedSkool courses, and premium subscriptions.",
    tag: "Q4 2025",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: "Priority Campaign Access",
    desc: "High $TDRIP stakers get first look at exclusive brand campaigns before they open to the general creator pool.",
    tag: "Q1 2026",
    color: "from-orange-500 to-yellow-500",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "NFT & Digital Collectibles",
    desc: "Mint exclusive Taskdrip creator badges, achievement NFTs, and limited-edition brand collaboration tokens.",
    tag: "Q2 2026",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Staking Rewards",
    desc: "Lock up your $TDRIP for set periods to earn passive staking rewards. Long-term holders are rewarded best.",
    tag: "Q3 2026",
    color: "from-green-500 to-emerald-600",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "IRL & Virtual Event Access",
    desc: "Use $TDRIP to enter Taskdrip-hosted summits, creator meetups, and exclusive brand partner events.",
    tag: "2026+",
    color: "from-violet-500 to-purple-700",
  },
];

const LEVELS = [
  { name: "Starter", min: 0, max: 499, color: "bg-gray-200 text-gray-700", emoji: "🌱" },
  { name: "Hustler", min: 500, max: 1999, color: "bg-blue-100 text-blue-700", emoji: "⚡" },
  { name: "Influencer", min: 2000, max: 9999, color: "bg-purple-100 text-purple-700", emoji: "🔥" },
  { name: "Authority", min: 10000, max: 49999, color: "bg-orange-100 text-orange-700", emoji: "👑" },
  { name: "Elite", min: 50000, max: null, color: "bg-yellow-100 text-yellow-700", emoji: "💎" },
];

const FAQ = [
  {
    q: "Are $TDRIP points a cryptocurrency?",
    a: "$TDRIP points are currently platform-based loyalty points, not a blockchain cryptocurrency. They represent your engagement and reputation on Taskdrip. Our roadmap includes exploring on-chain utility as the platform grows.",
  },
  {
    q: "Can I withdraw $TDRIP points as cash?",
    a: "Not directly right now. $TDRIP points are used within the Taskdrip ecosystem — for tipping, unlocking features, and platform activities. Campaign earnings are paid in USDT to your registered wallet.",
  },
  {
    q: "Do $TDRIP points expire?",
    a: "No! Your $TDRIP points never expire. They accumulate indefinitely and your level only goes up as you engage more with the platform.",
  },
  {
    q: "How do I level up faster?",
    a: "The fastest way to level up is to: complete your profile, refer friends, apply to campaigns, enroll in BreedSkool courses, and complete social quick tasks. Consistency pays off — log in daily for bonus points!",
  },
  {
    q: "Can brands earn $TDRIP too?",
    a: "Yes! Brands earn $TDRIP through platform engagement, verified campaigns, successful collaborations, and by purchasing points directly to fund campaign incentives and creator tips.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
        data-testid="faq-toggle"
      >
        <span className="font-semibold text-white">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-purple-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-purple-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-gray-300 text-sm leading-relaxed border-t border-white/10 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function TDripInfoPage() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"earn" | "use" | "future">("earn");

  const { data: pointsData } = useQuery({
    queryKey: ["/api/points/me"],
    enabled: isAuthenticated,
  });

  const totalPoints = (pointsData as any)?.total ?? (user as any)?.totalPoints ?? 0;
  const level = (pointsData as any)?.level ?? (user as any)?.level ?? "Starter";
  const currentLevel = LEVELS.find(l => l.name === level) ?? LEVELS[0];

  const categoryColors: Record<string, string> = {
    Onboarding: "bg-green-500/20 text-green-300",
    Engagement: "bg-blue-500/20 text-blue-300",
    Campaigns: "bg-purple-500/20 text-purple-300",
    Learning: "bg-orange-500/20 text-orange-300",
    Referrals: "bg-pink-500/20 text-pink-300",
    Tasks: "bg-yellow-500/20 text-yellow-300",
    Purchase: "bg-cyan-500/20 text-cyan-300",
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">
      <NavigationFixed />

      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/15 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-[40%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-violet-500/10 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10">

        {/* ═══════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════ */}
        <section className="pt-20 pb-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">

            {/* Token coin animation */}
            <div className="flex justify-center mb-10">
              <div className="relative">
                {/* Outer glow rings */}
                <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl scale-125 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-yellow-400/10 blur-2xl scale-150 animate-pulse" style={{ animationDelay: "0.5s" }} />

                {/* Coin */}
                <div className="relative w-36 h-36 rounded-full flex items-center justify-center"
                  style={{
                    background: "conic-gradient(from 180deg, #7c3aed, #4f46e5, #7c3aed, #a855f7, #f59e0b, #7c3aed)",
                    boxShadow: "0 0 60px rgba(124,58,237,0.6), 0 0 30px rgba(168,85,247,0.4), inset 0 2px 8px rgba(255,255,255,0.2)",
                  }}>
                  <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
                    style={{
                      background: "radial-gradient(circle at 30% 30%, #1a0a2e, #0d0720)",
                      boxShadow: "inset 0 2px 10px rgba(255,255,255,0.1)",
                    }}>
                    <span className="text-2xl font-black text-yellow-300 tracking-tight leading-none">$TDrip</span>
                    <div className="flex gap-0.5 mt-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400" style={{ opacity: 0.6 + i * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Orbiting dots */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <div key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                      background: i % 2 === 0 ? "#a855f7" : "#f59e0b",
                      top: `${50 - 52 * Math.sin((deg * Math.PI) / 180)}%`,
                      left: `${50 + 52 * Math.cos((deg * Math.PI) / 180)}%`,
                      transform: "translate(-50%, -50%)",
                      boxShadow: i % 2 === 0 ? "0 0 8px #a855f7" : "0 0 8px #f59e0b",
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 mb-6 text-sm text-purple-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>The Currency of the Creator Economy</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Stack{" "}
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-yellow-300 bg-clip-text text-transparent">
                $TDRIP
              </span>
              .
              <br />
              <span className="text-3xl md:text-5xl text-gray-300">Own the Creator Economy.</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              $TDRIP is more than a points system — it's your reputation, your influence,
              and your stake in the future of SocialFi. Every action you take on Taskdrip
              grows your $TDRIP balance and unlocks a bigger slice of the ecosystem.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Link href="/wallet">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-8 rounded-xl shadow-lg shadow-purple-500/30" data-testid="button-go-to-wallet">
                  <Wallet className="mr-2 h-5 w-5" />
                  My Wallet
                </Button>
              </Link>
              <Link href="/tasks">
                <Button size="lg" variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10 rounded-xl" data-testid="button-start-earning">
                  <Zap className="mr-2 h-5 w-5" />
                  Start Earning
                </Button>
              </Link>
            </div>

            {/* User's current balance (if logged in) */}
            {isAuthenticated && (
              <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-8 py-4 backdrop-blur-md">
                <div className="text-left">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Your Balance</p>
                  <p className="text-3xl font-black text-yellow-300">{totalPoints.toLocaleString()}</p>
                  <p className="text-xs text-purple-400">$TDRIP</p>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div className="text-left">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Level</p>
                  <p className="text-xl font-bold text-white">{currentLevel.emoji} {level}</p>
                  <p className="text-xs text-gray-500">
                    {currentLevel.max ? `Up to ${currentLevel.max.toLocaleString()} pts` : "Maximum Level"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            QUICK STATS BAR
        ═══════════════════════════════════════════ */}
        <section className="py-8 px-4 border-y border-white/5 bg-white/2">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: "Ways to Earn", value: "14+", icon: <Zap className="h-5 w-5 text-yellow-400" /> },
              { label: "Max Points/Day", value: "140+", icon: <TrendingUp className="h-5 w-5 text-green-400" /> },
              { label: "Creator Levels", value: "5", icon: <Trophy className="h-5 w-5 text-purple-400" /> },
              { label: "Planned Utilities", value: "6+", icon: <Star className="h-5 w-5 text-blue-400" /> },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2">
                {stat.icon}
                <p className="text-3xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            LEVEL SYSTEM
        ═══════════════════════════════════════════ */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black mb-3">
                Your <span className="text-purple-400">Level</span> = Your Power
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Every $TDRIP point you earn pushes you toward a higher tier. Higher tiers mean better visibility, more campaign access, and exclusive features.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {LEVELS.map((lvl, i) => {
                const isCurrentLevel = lvl.name === level;
                return (
                  <div key={lvl.name}
                    className={`relative rounded-2xl p-5 text-center border transition-all ${isCurrentLevel
                      ? "border-purple-500 bg-purple-500/20 scale-105 shadow-lg shadow-purple-500/20"
                      : "border-white/10 bg-white/5"
                    }`}
                    data-testid={`level-card-${lvl.name.toLowerCase()}`}>
                    {isCurrentLevel && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">YOU</span>
                      </div>
                    )}
                    <div className="text-3xl mb-2">{lvl.emoji}</div>
                    <div className="font-bold text-white mb-1">{lvl.name}</div>
                    <div className="text-xs text-gray-400">
                      {lvl.min.toLocaleString()}
                      {lvl.max ? `–${lvl.max.toLocaleString()}` : "+"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">pts</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            EARN / USE / FUTURE TABS
        ═══════════════════════════════════════════ */}
        <section className="py-4 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Tab nav */}
            <div className="flex justify-center gap-2 mb-10 flex-wrap">
              {[
                { key: "earn", label: "How to Earn", icon: <Zap className="h-4 w-4" /> },
                { key: "use", label: "Current Utility", icon: <CheckCircle2 className="h-4 w-4" /> },
                { key: "future", label: "Roadmap", icon: <Star className="h-4 w-4" /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  data-testid={`tab-${tab.key}`}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === tab.key
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
                  }`}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* HOW TO EARN */}
            {activeTab === "earn" && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-black mb-3">
                    Every Action <span className="text-yellow-300">Pays</span>
                  </h2>
                  <p className="text-gray-400">Here's every way you can stack $TDRIP on Taskdrip.</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left py-4 px-6 text-xs uppercase tracking-wider text-gray-400">Activity</th>
                        <th className="text-left py-4 px-4 text-xs uppercase tracking-wider text-gray-400 hidden sm:table-cell">Category</th>
                        <th className="text-right py-4 px-6 text-xs uppercase tracking-wider text-gray-400">$TDRIP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EARN_ACTIVITIES.map((a, i) => (
                        <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/2" : ""}`} data-testid={`earn-row-${i}`}>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{a.icon}</span>
                              <span className="text-sm text-white font-medium">{a.action}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 hidden sm:table-cell">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[a.category] || "bg-gray-500/20 text-gray-300"}`}>
                              {a.category}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-yellow-300 font-black text-sm">
                              {typeof a.pts === "number" ? `+${a.pts}` : a.pts}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-center">
                  <Link href="/tasks">
                    <Button className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl px-8" data-testid="button-go-to-tasks">
                      <Zap className="mr-2 h-4 w-4" />
                      Start Earning Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* CURRENT UTILITY */}
            {activeTab === "use" && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-black mb-3">
                    $TDRIP <span className="text-purple-400">Works for You</span>
                  </h2>
                  <p className="text-gray-400">Here's what your $TDRIP can do on Taskdrip today.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {CURRENT_USES.map((u, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/40 hover:bg-white/8 transition-all" data-testid={`utility-card-${i}`}>
                      <div className="mb-4 p-3 bg-white/5 rounded-xl w-fit">{u.icon}</div>
                      <h3 className="font-bold text-white mb-2 text-lg">{u.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{u.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FUTURE UTILITY / ROADMAP */}
            {activeTab === "future" && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-black mb-3">
                    The <span className="text-green-400">Future</span> is Bigger
                  </h2>
                  <p className="text-gray-400 max-w-xl mx-auto">
                    $TDRIP is built for expansion. Stack now, benefit later as the ecosystem grows.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {FUTURE_UTILITY.map((f, i) => (
                    <div key={i} className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all overflow-hidden" data-testid={`roadmap-card-${i}`}>
                      {/* gradient top bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${f.color}`} />
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${f.color} bg-opacity-20 text-white`}>
                          {f.icon}
                        </div>
                        <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full font-medium">{f.tag}</span>
                      </div>
                      <h3 className="font-bold text-white mb-2 text-lg">{f.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            MINI WHITEPAPER
        ═══════════════════════════════════════════ */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-4 text-sm">
                📄 Mini White Paper
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Why $TDRIP <span className="text-purple-400">Matters</span>
              </h2>
            </div>

            <div className="space-y-8 text-gray-300 leading-relaxed">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-xl">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">The Problem</h3>
                </div>
                <p className="text-gray-400">
                  The creator economy is broken. Creators generate billions in brand value but receive only a
                  fraction of returns. Platform algorithms decide who wins, middlemen take massive cuts, and
                  creators have no ownership or governance over the platforms they power. Trust is low, payment
                  is slow, and loyalty goes unrewarded.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-xl">
                    <Sparkles className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">The Solution: $TDRIP</h3>
                </div>
                <p className="text-gray-400">
                  Taskdrip introduces $TDRIP as the native engagement and reputation currency of the platform.
                  Every action — from posting content and following creators to completing campaigns and learning
                  new skills — earns $TDRIP points. This creates a transparent, merit-based system where
                  creators are rewarded for real contributions to the ecosystem, not just follower counts.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Globe className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">The Vision: SocialFi for All</h3>
                </div>
                <p className="text-gray-400 mb-4">
                  Taskdrip is building a SocialFi platform where participation = ownership. $TDRIP will evolve
                  from a platform loyalty token into a governance instrument, a marketplace currency, and
                  eventually a bridge to on-chain Web3 utility. Early adopters who stack $TDRIP today position
                  themselves at the front of this transition.
                </p>
                <p className="text-gray-400">
                  The platform's revenue is designed to flow back to creators through campaign payments,
                  referral rewards, task incentives, and future staking programs. $TDRIP holders will shape
                  the platform's direction, curate top talent, and participate in a growing economy that values
                  real creative output over algorithmic luck.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/20 rounded-xl">
                    <Lock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Tokenomics Summary</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Distribution", value: "Activity-Based", note: "Earned through actions" },
                    { label: "Supply Control", value: "Platform-Managed", note: "Admin awards & purchases" },
                    { label: "Future Chain", value: "TBD", note: "On-chain bridge in roadmap" },
                  ].map((t) => (
                    <div key={t.label} className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t.label}</p>
                      <p className="font-bold text-white text-lg">{t.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            WHY STACK
        ═══════════════════════════════════════════ */}
        <section className="py-16 px-4 bg-gradient-to-b from-transparent to-purple-900/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Why Stack <span className="text-yellow-300">$TDRIP</span> Now?
            </h2>
            <p className="text-gray-400 mb-10 max-w-xl mx-auto">
              The best time to accumulate is early. Here's why now is the time to build your $TDRIP stack.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
              {[
                { icon: "🚀", title: "Early Mover Advantage", desc: "The platform is growing fast. Early $TDRIP holders will have the highest balances when governance and staking launch — giving them the most influence." },
                { icon: "📈", title: "Compounding Reputation", desc: "Higher $TDRIP = higher level = better campaign access = more earnings = more $TDRIP. It's a virtuous cycle that rewards early action." },
                { icon: "🎁", title: "Future Airdrop Eligibility", desc: "Active $TDRIP holders will be prioritized for future platform distributions, NFT drops, and partner brand rewards as the ecosystem expands." },
                { icon: "🏆", title: "Leaderboard Dominance", desc: "The leaderboard is live now. Stack $TDRIP to claim a top position and become one of the most recognized creators on the platform." },
              ].map((w, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 transition-all" data-testid={`why-card-${i}`}>
                  <div className="text-3xl mb-3">{w.icon}</div>
                  <h3 className="font-bold text-white mb-2 text-lg">{w.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FAQ
        ═══════════════════════════════════════════ */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Frequently Asked <span className="text-purple-400">Questions</span>
              </h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <FAQItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BOTTOM CTA
        ═══════════════════════════════════════════ */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-5xl mb-6">💎</div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Ready to <span className="text-purple-400">Stack</span>?
            </h2>
            <p className="text-gray-400 mb-10 text-lg">
              Every point you earn today is a stake in tomorrow's creator economy.
              Your $TDRIP journey starts now.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/tasks">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-10 rounded-xl shadow-xl shadow-purple-500/30" data-testid="button-earn-now">
                      <Zap className="mr-2 h-5 w-5" />
                      Earn $TDRIP Now
                    </Button>
                  </Link>
                  <Link href="/wallet">
                    <Button size="lg" variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10 rounded-xl" data-testid="button-check-wallet">
                      <Wallet className="mr-2 h-5 w-5" />
                      My Wallet
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-10 rounded-xl shadow-xl shadow-purple-500/30" data-testid="button-signup">
                      <Gift className="mr-2 h-5 w-5" />
                      Join & Get 50 Free $TDRIP
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/5 rounded-xl" data-testid="button-login">
                      Already have an account?
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
