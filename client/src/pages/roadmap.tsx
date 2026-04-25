import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { RouteSeo } from "@/components/GlobalSeo";
import {
  Coins, Calendar, CheckCircle, Circle, Rocket, Target, Users, BarChart3,
  Sparkles, TrendingUp, ShieldCheck, Globe, Lock, Flame, Zap, Award, ArrowRight
} from "lucide-react";

const TODAY = new Date("2026-04-25");

const PHASES = [
  {
    quarter: "Q4 2025",
    title: "Foundation",
    status: "done",
    items: [
      "Platform launch — campaigns, P2P, shop, courses, feed, wallet",
      "First 5,000 verified influencers",
      "$TDRIP loyalty point system live (off-chain)",
      "Multi-network USDT payouts (TRC20, BEP20, ERC20, Polygon)",
    ],
    icon: Rocket,
    color: "from-emerald-500 to-teal-700",
  },
  {
    quarter: "Q1 2026",
    title: "Scale & Trust",
    status: "done",
    items: [
      "BreedSkool Academy launch",
      "Lead Discovery & Outreach for brands",
      "Public REST API for third-party integrations",
      "Mobile-first PWA experience",
      "15,000+ creators onboarded",
    ],
    icon: TrendingUp,
    color: "from-blue-500 to-indigo-700",
  },
  {
    quarter: "Q2 2026",
    title: "SocialFi Engine",
    status: "in-progress",
    items: [
      "Tipping, micro-tasks, and creator services scaled",
      "Spotlight & Editorial curation system across all top pages",
      "Advertising network + AdSense integration",
      "Auto-blogger + SEO engine",
      "Documentation portal & developer hub",
    ],
    icon: Zap,
    color: "from-purple-500 to-violet-700",
  },
  {
    quarter: "Q3 2026",
    title: "$TDRIP Pre-launch",
    status: "upcoming",
    items: [
      "Token contract audit (CertiK + Hacken)",
      "Whitepaper v1.0 published",
      "Community ambassador program",
      "Private sale for strategic partners",
      "$TDRIP airdrop snapshot for early users",
    ],
    icon: ShieldCheck,
    color: "from-amber-500 to-orange-700",
  },
  {
    quarter: "Nov 2026",
    title: "$TDRIP Token Launch",
    status: "upcoming",
    highlight: true,
    items: [
      "Public Token Generation Event (TGE) — Nov 11, 2026",
      "Listing on Tier-1 CEX + DEX (Uniswap, PancakeSwap)",
      "Off-chain $TDRIP points convert 1:1 to on-chain $TDRIP",
      "Staking, governance, and cross-chain bridge live",
      "Liquidity mining for early holders",
    ],
    icon: Coins,
    color: "from-yellow-400 to-amber-600",
  },
  {
    quarter: "Q1 2027",
    title: "Token Utility & Expansion",
    status: "upcoming",
    items: [
      "$TDRIP-gated premium features and ad slots",
      "On-chain campaign escrow (smart contracts)",
      "Influencer NFT badges and achievement marketplace",
      "First major brand partnerships paid in $TDRIP",
    ],
    icon: Sparkles,
    color: "from-pink-500 to-rose-700",
  },
  {
    quarter: "Q2 2027",
    title: "Global Reach",
    status: "upcoming",
    items: [
      "100,000 verified creators",
      "Mobile native apps (iOS + Android)",
      "Regional offices in EU, LATAM, SEA, MENA",
      "Multi-language platform (12 languages)",
    ],
    icon: Globe,
    color: "from-cyan-500 to-blue-700",
  },
  {
    quarter: "2028 →",
    title: "Decentralized SocialFi",
    status: "upcoming",
    items: [
      "DAO governance — $TDRIP holders vote on roadmap",
      "Decentralized creator IDs portable across web3",
      "Taskdrip Layer-2 for sub-cent micropayments",
      "1M+ creators, $1B+ creator earnings",
    ],
    icon: Lock,
    color: "from-slate-600 to-gray-800",
  },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  done: { label: "Completed", cls: "bg-emerald-500 text-white", icon: CheckCircle },
  "in-progress": { label: "In Progress", cls: "bg-amber-500 text-white", icon: Flame },
  upcoming: { label: "Upcoming", cls: "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300", icon: Circle },
};

const TOKENOMICS = [
  { name: "Community & Rewards (Creators, Tippers, Tasks, Airdrops)", percent: 40, color: "bg-purple-600", desc: "Earned by users for activity, tips, campaigns, and airdrops" },
  { name: "Liquidity & Exchange Listings", percent: 15, color: "bg-blue-600", desc: "DEX & CEX liquidity pools — locked 24 months" },
  { name: "Treasury & Ecosystem Grants", percent: 15, color: "bg-emerald-600", desc: "Funding new partnerships, integrations, and products" },
  { name: "Team & Advisors", percent: 12, color: "bg-amber-500", desc: "4-year vesting with 12-month cliff" },
  { name: "Private & Strategic Sale", percent: 8, color: "bg-pink-500", desc: "18-month linear vesting after TGE" },
  { name: "Public Sale (TGE)", percent: 5, color: "bg-rose-500", desc: "Fully unlocked at launch" },
  { name: "Marketing & Partnerships", percent: 5, color: "bg-cyan-500", desc: "Influencer campaigns, KOL deals, listings" },
];

const TOKEN_DETAILS = [
  { label: "Token Name", value: "Taskdrip" },
  { label: "Ticker", value: "$TDRIP" },
  { label: "Type", value: "Utility + Loyalty" },
  { label: "Total Supply", value: "1,000,000,000 $TDRIP" },
  { label: "Initial Circulating", value: "~12% at TGE" },
  { label: "Networks", value: "BNB Chain, Polygon, Solana (bridged)" },
  { label: "Token Standard", value: "BEP-20 / ERC-20 / SPL" },
  { label: "Initial Listing Price", value: "$0.012" },
  { label: "TGE Date", value: "November 11, 2026" },
  { label: "Audit", value: "CertiK + Hacken (Q3 2026)" },
];

export default function RoadmapPage() {
  const tgeDate = new Date("2026-11-11");
  const startDate = new Date("2025-10-01");
  const totalDays = (tgeDate.getTime() - startDate.getTime()) / 86400000;
  const elapsed = Math.max(0, (TODAY.getTime() - startDate.getTime()) / 86400000);
  const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const daysRemaining = Math.max(0, Math.ceil((tgeDate.getTime() - TODAY.getTime()) / 86400000));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <RouteSeo />
      <NavigationFixed />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1920&q=60')] opacity-15 mix-blend-overlay bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-transparent to-rose-700/40" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-xl">
              <Coins className="w-6 h-6" />
            </div>
            <Badge className="bg-white text-amber-700 border-0 font-bold">$TDRIP Token Roadmap</Badge>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-3" data-testid="text-roadmap-title">
            $TDRIP launches November 2026
          </h1>
          <p className="text-lg text-amber-50 max-w-2xl mb-8">
            Full transparency on what we've built, what we're building, and how the $TDRIP token will power the future of SocialFi.
          </p>

          <Card className="bg-white/10 backdrop-blur border-white/20 max-w-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-sm mb-2 text-white">
                <span className="font-semibold">Time to Token Launch</span>
                <span className="font-mono font-bold" data-testid="text-days-remaining">{daysRemaining} days</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
              <div className="flex justify-between text-xs text-amber-100 mt-2">
                <span>Foundation • Oct 2025</span>
                <span>TGE • Nov 11, 2026</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Roadmap timeline */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Roadmap</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Quarter-by-quarter plan from foundation to global decentralized SocialFi.</p>

        <div className="space-y-4">
          {PHASES.map((phase, idx) => {
            const Status = STATUS_CONFIG[phase.status];
            return (
              <Card
                key={idx}
                className={`relative overflow-hidden transition-all hover:shadow-xl ${phase.highlight ? "border-2 border-amber-500 shadow-lg shadow-amber-500/20" : ""}`}
                data-testid={`roadmap-phase-${idx}`}
              >
                {phase.highlight && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                    🚀 TOKEN LAUNCH
                  </div>
                )}
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                  <div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center text-white shadow-lg mb-3`}>
                      <phase.icon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{phase.quarter}</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{phase.title}</h3>
                    <Badge className={`${Status.cls} border-0`}>
                      <Status.icon className="w-3 h-3 mr-1" />
                      {Status.label}
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        {phase.status === "done" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        ) : phase.status === "in-progress" ? (
                          <Flame className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        )}
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Tokenomics */}
      <div className="bg-gray-100 dark:bg-gray-900/50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-7 h-7 text-amber-600" />
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Tokenomics</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Total supply: 1,000,000,000 $TDRIP. Allocations and vesting designed to align long-term incentives.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Token details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" /> Token Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TOKEN_DETAILS.map((d) => (
                  <div key={d.label} className="border-l-2 border-amber-500 pl-3" data-testid={`token-detail-${d.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">{d.label}</div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{d.value}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" /> Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {TOKENOMICS.map((t) => (
                  <div key={t.name} data-testid={`tokenomics-${t.name.split(' ')[0].toLowerCase()}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{t.name}</span>
                      <span className="font-bold text-amber-600">{t.percent}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
                      <div className={`h-full ${t.color}`} style={{ width: `${t.percent * 2.5}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{t.desc}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Utilities */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-600" /> Token Utilities</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Users, title: "Tipping", body: "Tip creators in $TDRIP with zero platform fee." },
                { icon: ShieldCheck, title: "Campaign Escrow", body: "Lock and release campaign budgets on-chain." },
                { icon: Award, title: "Premium Features", body: "Unlock pro tools, analytics, and ad boosts." },
                { icon: Lock, title: "Staking", body: "Stake to earn yield + voting rights in DAO." },
                { icon: Sparkles, title: "Governance", body: "Vote on roadmap, fee changes, and grants." },
                { icon: Rocket, title: "Launchpad Access", body: "Early access to new creator products and IDOs." },
              ].map((u, i) => (
                <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                  <u.icon className="w-6 h-6 text-amber-600 mb-2" />
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{u.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{u.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Card className="bg-gradient-to-br from-purple-600 via-violet-700 to-indigo-800 text-white border-0 overflow-hidden">
          <CardContent className="p-10 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-300" />
            <h3 className="text-3xl font-extrabold mb-2">Start earning $TDRIP today</h3>
            <p className="text-purple-100 mb-6 max-w-xl mx-auto">
              Every action on Taskdrip earns $TDRIP points — convertible to on-chain tokens at TGE in November 2026.
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Link href="/signup"><Button className="bg-white text-purple-700 hover:bg-purple-50 font-bold" data-testid="link-roadmap-signup">Join Taskdrip <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
              <Link href="/docs"><Button variant="outline" className="bg-white/10 border-white/40 text-white hover:bg-white/20" data-testid="link-roadmap-docs">Read the Docs</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
