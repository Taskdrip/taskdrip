import { useState } from "react";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import RouteSeo from "@/components/GlobalSeo";
import {
  BookOpen, Search, Users, ShoppingBag, Megaphone, Trophy, Wallet, Coins, Zap,
  Settings, Shield, MessageCircle, Briefcase, Store, GraduationCap, Image as ImageIcon,
  Star, ArrowRight, ChevronRight, Layers, BarChart3, FileText, Bot, Globe, Sparkles,
  Newspaper, Link2, Gift, Heart, CreditCard, Phone, Lock, AlertTriangle
} from "lucide-react";

const SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Zap,
    color: "from-purple-500 to-violet-700",
    items: [
      { title: "What is Taskdrip?", body: "Taskdrip is the #1 Web3 SocialFi influencer marketplace where creators turn social reach into real crypto income (USDT) through campaigns, direct hire, P2P trading, services, ads, and tipping." },
      { title: "Creating an Account", body: "Click 'Sign Up' in the top right. Choose your role: Influencer (creator), Brand (advertiser), or Buyer. Verify your email — you'll receive a welcome bonus and access to the dashboard." },
      { title: "Setting Up Your Profile", body: "From the dashboard, head to your profile to add a bio, profile picture, social handles, niche, follower counts, and payout wallet. A complete profile dramatically increases your earnings." },
      { title: "Roles & Tiers", body: "Influencers are auto-tiered (Bronze → Diamond) by total followers across linked platforms. Higher tiers get priority on campaigns, higher tipping limits, and lower platform fees." },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns",
    icon: Megaphone,
    color: "from-pink-500 to-rose-700",
    items: [
      { title: "How Campaigns Work", body: "Brands post paid promotion campaigns with a budget, target niche, and required deliverables (post, story, reel, video review, etc.). Influencers apply, brands approve, and payment is held in escrow until the work is verified." },
      { title: "Applying to a Campaign", body: "Browse /campaigns, filter by niche/budget/platform, click 'Apply'. Submit your pitch and proof. If approved, you're enrolled and can submit your deliverable for verification." },
      { title: "Micro-tasks", body: "Some campaigns include micro-tasks (likes, follows, shares) you can complete instantly for smaller rewards. Great for new creators building reputation." },
      { title: "Escrow & Payouts", body: "Campaign budgets are locked in escrow at launch. When your submission is approved, your share is released to your wallet immediately. You can request payout to USDT, bank, or PayPal." },
    ],
  },
  {
    id: "p2p",
    title: "P2P Marketplace",
    icon: Store,
    color: "from-emerald-500 to-teal-700",
    items: [
      { title: "What is the P2P Hub?", body: "Direct peer-to-peer trading of services, accounts, content, scripts, follower packages, and other digital assets — protected by Taskdrip escrow and dispute resolution." },
      { title: "Creating a Listing", body: "Go to /p2p-hub → 'Create Listing'. Choose the type, set price (USDT or $TDRIP), upload images, define addons, and publish. Verified sellers get a trust badge." },
      { title: "Buying with Escrow", body: "Click 'Buy Now'. Payment is locked in escrow. Once you confirm delivery (or 72h auto-release), funds are sent to the seller. Disputes are mediated by Taskdrip support within 24h." },
      { title: "Service Addons", body: "Sellers can offer optional addons (e.g. faster delivery, extra revisions). Buyers select addons at checkout and pay the combined total." },
    ],
  },
  {
    id: "shop",
    title: "Shop & Products",
    icon: ShoppingBag,
    color: "from-orange-500 to-amber-700",
    items: [
      { title: "Browsing the Shop", body: "The /shop has digital products, scripts, software, templates, courses, and tools curated for creators and brands. Filter by category, price, and ratings." },
      { title: "Buying a Product", body: "Open a product, review features and reviews, then 'Buy Now'. After payment you get instant access to the download URL, documentation, and updates." },
      { title: "Selling on Taskdrip", body: "Want to sell a product or course? Apply to be a vendor in your dashboard. Approved vendors can list unlimited products with custom pricing and addons." },
    ],
  },
  {
    id: "courses",
    title: "BreedSkool Academy",
    icon: GraduationCap,
    color: "from-blue-500 to-indigo-700",
    items: [
      { title: "What is BreedSkool?", body: "Taskdrip's built-in academy with courses on growth hacking, monetization, content production, Web3, and influencer business. Earn certificates and $TDRIP for completing modules." },
      { title: "Enrolling in a Course", body: "Visit /breedskool. Free courses unlock instantly; paid courses are paid in USDT or $TDRIP. Lessons include video, text, downloads, and quizzes." },
      { title: "Becoming an Instructor", body: "Apply via your dashboard. Approved instructors get a course-builder studio, revenue split, and analytics on watch time + completions." },
    ],
  },
  {
    id: "wallet",
    title: "Wallet, Payments & Payouts",
    icon: Wallet,
    color: "from-green-500 to-emerald-700",
    items: [
      { title: "Your Wallet", body: "Every account has a Taskdrip wallet that tracks USDT, $TDRIP points, escrow balance, and pending withdrawals. Top up via crypto, card, or bank transfer." },
      { title: "Deposits", body: "Supported networks: USDT (TRC20, BEP20, ERC20, Polygon), card (Stripe), and bank transfer. Crypto deposits credit instantly after 1 confirmation." },
      { title: "Withdrawals", body: "Minimum withdrawal: $10. Processing: instant for USDT, 1–3 days for fiat. Daily and lifetime limits scale with your tier and KYC level." },
      { title: "Fees", body: "Platform fee: 5% on campaign payouts and P2P sales. No fee on tips or $TDRIP transfers. Deposit fees vary by network." },
    ],
  },
  {
    id: "tdrip",
    title: "$TDRIP Token",
    icon: Coins,
    color: "from-yellow-500 to-amber-600",
    items: [
      { title: "What is $TDRIP?", body: "$TDRIP is the native loyalty + utility token of Taskdrip. Earn it for activity (posts, completions, referrals, daily check-ins) and spend it on tips, premium features, course access, and giveaways. Token launch: November 2026." },
      { title: "Earning $TDRIP", body: "Daily check-ins, completing tasks, posting in the feed, referring friends, completing courses, winning leaderboards, and engaging with campaigns all earn $TDRIP points." },
      { title: "Using $TDRIP", body: "Tip creators, unlock premium features, buy courses, enter giveaways, boost ad placements, and convert to real USDT after the public token launch." },
      { title: "Roadmap", body: "See the full roadmap and tokenomics on /roadmap." },
    ],
  },
  {
    id: "feed",
    title: "Social Feed & Tipping",
    icon: Newspaper,
    color: "from-violet-500 to-purple-700",
    items: [
      { title: "The Feed", body: "/feed is the SocialFi timeline. Influencers, brands, and the platform post updates, wins, campaign tips, and content. Like, comment, share, and tip." },
      { title: "Tipping", body: "Tip any creator from their profile or feed post — pay in USDT (instant transfer) or $TDRIP. 100% of tips go to the creator (zero platform fee on tips)." },
      { title: "Creating Posts", body: "Use the composer at the top of /feed. Add text, image (uploaded from your device), and a link. Free accounts post up to 10/day; Pro accounts unlimited." },
    ],
  },
  {
    id: "ads",
    title: "Advertising",
    icon: Megaphone,
    color: "from-red-500 to-rose-700",
    items: [
      { title: "Advertise With Us", body: "Run banner ads, sponsored slider hero, in-feed promotions, and AdSense placements. Visit /advertise to pick a slot, upload your creative, and pay in USDT or card." },
      { title: "Ad Networks", body: "Admins can plug in third-party networks (AdSense, AdMob, Media.net, PropellerAds, Taboola, MGID). Per-page placement is fully configurable." },
    ],
  },
  {
    id: "rewards",
    title: "Rewards, Giveaways & Referrals",
    icon: Gift,
    color: "from-fuchsia-500 to-pink-700",
    items: [
      { title: "Daily Check-in", body: "Visit /rewards every day for a streak bonus in $TDRIP. 7/14/30-day streaks unlock multipliers." },
      { title: "Giveaways", body: "Sponsored prize giveaways (cash, gadgets, $TDRIP). Enter via the giveaways tab and complete the entry tasks." },
      { title: "Referral Program", body: "Share your referral link from /referrals. Earn 10% lifetime commission on your referrals' deposits + $TDRIP bonuses for milestones." },
    ],
  },
  {
    id: "creator-services",
    title: "Creator Services & Direct Hire",
    icon: Briefcase,
    color: "from-cyan-500 to-blue-700",
    items: [
      { title: "Listing a Service", body: "From your dashboard, list services you offer (UGC, shoutouts, reviews, content packages). Set price, delivery time, and addons. Brands hire you directly." },
      { title: "Hiring an Influencer", body: "Browse /influencers, filter by niche/follower count/price/platform, then 'Hire' for a direct campaign or use 'Tip' to start a relationship." },
    ],
  },
  {
    id: "admin",
    title: "Admin & Moderation",
    icon: Shield,
    color: "from-slate-600 to-gray-800",
    items: [
      { title: "Admin Dashboard", body: "Full admin control panel at /admin/master: users, campaigns, P2P, payouts, content moderation, SEO, ads, leads, spotlight, and platform settings." },
      { title: "Reporting Content", body: "Every post and listing has a 'Report' button. Reports are reviewed by admins within 24h." },
      { title: "Verification & KYC", body: "Submit KYC for higher payout limits, verified badge, and access to premium campaigns. Documents are encrypted and never shared." },
    ],
  },
  {
    id: "trust",
    title: "Trust, Safety & Support",
    icon: Lock,
    color: "from-gray-600 to-slate-800",
    items: [
      { title: "Disputes", body: "Open a dispute on any escrow transaction within 7 days. Taskdrip mediation team responds within 24h with evidence-based ruling." },
      { title: "Privacy & Data", body: "We never sell your data. See /privacy for our full privacy policy and /terms for terms of use." },
      { title: "Contact Support", body: "Email support@taskdrip.online, WhatsApp from the footer, or open a ticket from your dashboard. Average response time: 2 hours." },
    ],
  },
];

export default function DocumentationPage() {
  const [search, setSearch] = useState("");

  const filtered = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter(
      (it) =>
        !search ||
        it.title.toLowerCase().includes(search.toLowerCase()) ||
        it.body.toLowerCase().includes(search.toLowerCase()) ||
        s.title.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <RouteSeo />
      <NavigationFixed />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-700 via-violet-700 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=60')] opacity-20 mix-blend-overlay bg-cover bg-center" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <Badge className="bg-white/15 text-white border-white/20">Documentation</Badge>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight" data-testid="text-docs-title">
            Everything you need to know about Taskdrip
          </h1>
          <p className="mt-4 text-lg text-purple-100 max-w-2xl">
            A complete guide to using Taskdrip — campaigns, P2P, shop, courses, wallet, $TDRIP token, ads, rewards, admin tools, and more.
          </p>

          <div className="mt-8 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation…"
              className="pl-12 h-12 bg-white text-gray-900 border-0 shadow-lg"
              data-testid="input-docs-search"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-24 self-start">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">On this page</h3>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 py-1.5 px-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
                data-testid={`docs-toc-${s.id}`}
              >
                <s.icon className="w-4 h-4 text-purple-500" />
                {s.title}
                <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
              </a>
            ))}
          </nav>
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
            <Sparkles className="w-5 h-5 mb-2" />
            <h4 className="font-bold text-sm mb-1">$TDRIP Token Launch</h4>
            <p className="text-xs text-purple-100 mb-3">November 2026 — see the full roadmap & tokenomics.</p>
            <Link href="/roadmap">
              <Button size="sm" className="w-full bg-white text-purple-700 hover:bg-purple-50" data-testid="link-docs-roadmap">View Roadmap</Button>
            </Link>
          </div>
        </aside>

        {/* Sections */}
        <main className="lg:col-span-3 space-y-12">
          {filtered.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-gray-500">No results for "{search}"</CardContent></Card>
          ) : (
            filtered.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24" data-testid={`docs-section-${s.id}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{s.title}</h2>
                </div>

                <div className="space-y-3">
                  {s.items.map((it, i) => (
                    <Card key={i} className="border-l-4 border-l-purple-500">
                      <CardHeader className="pb-2"><CardTitle className="text-base">{it.title}</CardTitle></CardHeader>
                      <CardContent className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{it.body}</CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Bottom CTA */}
          <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-0">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Still need help?</h3>
              <p className="text-purple-100 mb-4">Reach our support team — we typically respond in under 2 hours.</p>
              <div className="flex justify-center gap-2">
                <Link href="/contact"><Button className="bg-white text-purple-700 hover:bg-purple-50" data-testid="link-docs-contact">Contact Support</Button></Link>
                <a href="mailto:support@taskdrip.online"><Button variant="outline" className="bg-white/10 border-white/40 text-white hover:bg-white/20">Email Us</Button></a>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Footer />
    </div>
  );
}
