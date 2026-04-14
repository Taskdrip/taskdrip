import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Footer } from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import {
  Users, Globe, DollarSign, Shield, Zap, Target, Award,
  TrendingUp, CheckCircle, Star, Rocket, Crown, Flame,
  MessageCircle, BookOpen, ShoppingBag, Briefcase, Bell,
  Lock, Heart, Sparkles, ChevronRight
} from 'lucide-react';
import {
  SiTiktok, SiYoutube, SiInstagram, SiX, SiTwitch,
  SiTelegram, SiWhatsapp
} from 'react-icons/si';

const CREATOR_TIERS = [
  {
    name: 'Rising Sparks',
    emoji: '🔥',
    range: '10K – 100K followers',
    description: 'New creators just getting started. Access entry-level campaigns and build your first verified portfolio.',
    color: 'from-amber-400 to-orange-500',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
  },
  {
    name: 'Growth Engines',
    emoji: '⚡',
    range: '100K – 1M followers',
    description: 'Established creators with a fast-growing audience. Unlock mid-tier campaigns with higher payouts and brand deals.',
    color: 'from-cyan-400 to-blue-500',
    border: 'border-cyan-200',
    bg: 'bg-cyan-50',
  },
  {
    name: 'Power Influencers',
    emoji: '💎',
    range: '1M – 10M followers',
    description: 'High-reach creators. Premium campaigns, priority placement, and dedicated brand relationships.',
    color: 'from-violet-500 to-purple-600',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
  },
  {
    name: 'Global Titans',
    emoji: '👑',
    range: '10M+ followers',
    description: 'Elite influencers with global cultural reach. Exclusive enterprise campaigns, custom deal structures, and maximum payouts.',
    color: 'from-yellow-400 to-orange-500',
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
  },
];

const PLATFORMS = [
  { icon: SiTiktok, name: 'TikTok', bg: 'bg-black' },
  { icon: SiYoutube, name: 'YouTube', bg: 'bg-red-600' },
  { icon: SiInstagram, name: 'Instagram', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
  { icon: SiX, name: 'X / Twitter', bg: 'bg-black' },
  { icon: SiTwitch, name: 'Twitch', bg: 'bg-violet-600' },
  { icon: SiTelegram, name: 'Telegram', bg: 'bg-sky-500' },
  { icon: SiWhatsapp, name: 'WhatsApp', bg: 'bg-green-500' },
];

const FEATURES = [
  {
    icon: Target,
    title: 'Campaign Engine',
    description: 'Brands create detailed campaigns with budgets, requirements, and deadlines. Creators apply, get approved, and submit proof — all in one streamlined workflow.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Award,
    title: '4-Tier Creator System',
    description: 'Auto-calculated tiers from Rising Sparks to Global Titans based on total social reach. Higher tiers unlock more lucrative campaigns and better exposure.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: DollarSign,
    title: 'Crypto Payments',
    description: 'Earn in USDT TRC-20 (Tron), USDT BEP-20 (BNB Chain), or USDT ERC-20 (Ethereum). Payouts go directly to your wallet with transparent platform fees — no agency cuts, no delays.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Shield,
    title: 'KYC & Verification',
    description: 'Identity verification keeps the platform safe and builds trust between brands and creators. Verified creators get priority access to premium campaigns.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Briefcase,
    title: 'Creator Portfolio',
    description: 'Showcase your best campaigns, collaborations, and content in a public portfolio linked from your profile — your own influencer CV.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: BookOpen,
    title: 'BreedSkool Academy',
    description: 'Level up with courses on content creation, social media strategy, brand deals, and crypto basics — taught by industry professionals.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    icon: MessageCircle,
    title: 'Seamless DM Chat',
    description: 'Built-in direct messaging between creators and brands. Real-time conversations, file sharing, and campaign coordination — all without leaving the platform.',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    icon: ShoppingBag,
    title: 'Creator Shop',
    description: 'Sell digital products, presets, templates, and branded merchandise directly to your audience through the integrated Taskdrip Shop.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Bell,
    title: 'Push Notifications & PWA',
    description: 'Install Taskdrip as a native-feeling app on any device. Receive real-time push notifications for new campaigns, messages, and approvals.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
];

const CAMPAIGN_CATEGORIES = [
  { name: 'Social Media', icon: '📱', desc: 'Posts, reels, stories, and shorts across all platforms' },
  { name: 'Gaming & Esports', icon: '🎮', desc: 'Game reviews, livestreams, and tournament coverage' },
  { name: 'Health & Fitness', icon: '💪', desc: 'Wellness products, workout routines, and lifestyle content' },
  { name: 'Fashion & Beauty', icon: '💄', desc: 'Product reviews, tutorials, and brand lookbooks' },
  { name: 'Tech & Crypto', icon: '⛓️', desc: 'App reviews, blockchain projects, and DeFi awareness' },
  { name: 'Food & Travel', icon: '🌍', desc: 'Restaurant features, destination content, and reviews' },
  { name: 'Education', icon: '🎓', desc: 'Course promotions, webinars, and skill-based content' },
  { name: 'Entertainment', icon: '🎬', desc: 'Music, movies, events, and pop culture campaigns' },
];

const STATS = [
  { number: '10K+', label: 'Verified Creators', icon: Users },
  { number: '2,500+', label: 'Campaigns Launched', icon: Rocket },
  { number: '$450K+', label: 'Paid Out in Crypto', icon: DollarSign },
  { number: '60+', label: 'Countries Represented', icon: Globe },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f1a] via-purple-950 to-[#0f0f1a]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.35) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.2) 0%, transparent 60%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <Badge className="mb-6 bg-purple-600/20 text-purple-300 border border-purple-500/30 px-4 py-1.5 text-sm font-medium">
            🌐 Web3 SocialFi Influencer Marketplace
          </Badge>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            The Future of
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> Influencer Marketing</span>
            <br />is On-Chain
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Taskdrip connects global brands with verified social media creators through transparent campaigns,
            tier-based discovery, and direct crypto payments — no third-party agencies, no hidden gatekeepers.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-xl shadow-purple-500/30 px-8 font-semibold">
                Join as Creator <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" className="bg-white/10 border border-white/30 text-white hover:bg-white/20 px-8 font-semibold backdrop-blur-sm">
                Partner with Us
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="bg-white border-b border-gray-100 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ number, label, icon: Icon }) => (
              <div key={label} className="text-center group">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-100 transition-colors">
                  <Icon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-4xl font-black text-gray-900 mb-1">{number}</div>
                <div className="text-gray-500 text-sm font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mission ── */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-purple-100 text-purple-700 border-0">Our Mission</Badge>
              <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight">
                Turning Influence Into
                <span className="text-purple-600"> Real Income</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                We built Taskdrip because creators deserve better. Traditional influencer marketing
                is opaque, slow, and dominated by agencies that take huge cuts. Taskdrip puts creators
                and brands in direct contact, with verifiable reach metrics, transparent campaign terms,
                and instant crypto payouts.
              </p>
              <div className="space-y-3">
                {[
                  'No agency fees — direct brand-to-creator deals',
                  'Verified social reach across 7+ platforms',
                  'Crypto payments: USDT TRC-20 (Tron), BEP-20 (BNB Chain), ERC-20 (Ethereum)',
                  'Auto-tiered discovery so the right brands find you',
                  'Portfolio & review system to build lasting reputation',
                  'Community learning through BreedSkool Academy',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl rotate-3 opacity-10" />
              <div className="relative bg-gradient-to-br from-purple-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/30">
                <Sparkles className="w-12 h-12 mb-5 text-purple-200" />
                <h3 className="text-2xl font-bold mb-4">Why Taskdrip?</h3>
                <p className="text-purple-100 text-sm leading-relaxed mb-6">
                  We're not just a marketplace — we're an ecosystem. From campaign management and crypto payments
                  to education, community feed, and a creator shop, everything a modern influencer needs lives in one place.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Transparent', icon: '🔍' },
                    { label: 'Borderless', icon: '🌍' },
                    { label: 'Crypto-native', icon: '⛓️' },
                    { label: 'Creator-first', icon: '❤️' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                      <span>{item.icon}</span>
                      <span className="text-sm font-semibold text-white">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Supported Platforms ── */}
      <div className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-blue-50 text-blue-700 border-0">Multi-Platform</Badge>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Verify Reach Across Every Platform</h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">Connect all your social media accounts. Your combined follower count determines your tier and unlocks higher-paying campaigns.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {PLATFORMS.map(({ icon: Icon, name, bg }) => (
              <div key={name} className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-sm text-gray-700 group-hover:text-purple-700">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Creator Tiers ── */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-amber-50 text-amber-700 border-0">Creator Tiers</Badge>
            <h2 className="text-4xl font-black text-gray-900 mb-3">Your Reach = Your Rank</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Tiers are automatically calculated from your total followers across all linked platforms. As you grow, so do your opportunities.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CREATOR_TIERS.map((tier) => (
              <div key={tier.name} className={`${tier.bg} ${tier.border} border-2 rounded-2xl p-6 hover:shadow-lg transition-shadow`}>
                <div className={`text-3xl mb-3`}>{tier.emoji}</div>
                <h3 className="font-black text-gray-900 text-lg mb-1">{tier.name}</h3>
                <div className={`text-xs font-bold bg-gradient-to-r ${tier.color} bg-clip-text text-transparent mb-3`}>{tier.range}</div>
                <p className="text-gray-600 text-sm leading-relaxed">{tier.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Platform Features ── */}
      <div className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-purple-50 text-purple-700 border-0">Full Ecosystem</Badge>
            <h2 className="text-4xl font-black text-gray-900 mb-3">Everything Built In</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Taskdrip is not just a marketplace. It's a complete ecosystem designed to support creators at every stage of their journey.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ── Campaign Categories ── */}
      <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-green-50 text-green-700 border-0">Campaign Categories</Badge>
            <h2 className="text-4xl font-black text-gray-900 mb-3">Campaigns for Every Niche</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Brands from every industry run campaigns on Taskdrip. Find campaigns that align with your content and audience.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CAMPAIGN_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:border-purple-200 hover:shadow-md transition-all group">
                <div className="text-2xl flex-shrink-0">{cat.icon}</div>
                <div>
                  <div className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors">{cat.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">{cat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-0">How It Works</Badge>
            <h2 className="text-4xl font-black text-gray-900 mb-3">Simple. Transparent. Rewarding.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Creators */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-black">C</div>
                <h3 className="text-xl font-black text-gray-900">For Creators</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Sign up & connect socials', desc: 'Create your profile and link all your social media accounts.' },
                  { step: '2', title: 'Get auto-tiered', desc: 'Your tier is calculated instantly from your combined follower count.' },
                  { step: '3', title: 'Browse & apply to campaigns', desc: 'Filter by category, budget, and requirements. Apply with one click.' },
                  { step: '4', title: 'Complete & submit proof', desc: 'Do the campaign work and upload your proof of completion.' },
                  { step: '5', title: 'Get paid in crypto', desc: 'Once approved, funds go directly to your wallet in USDT (TRC-20, BEP-20, or ERC-20) within 24–72 hours.' },
                ].map(s => (
                  <div key={s.step} className="flex gap-4 items-start">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{s.title}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Brands */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black">B</div>
                <h3 className="text-xl font-black text-gray-900">For Brands</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Create a brand account', desc: 'Set up your company profile and verify your business.' },
                  { step: '2', title: 'Launch a campaign', desc: 'Define goals, budget, content requirements, and deadline. Fund escrow to go live.' },
                  { step: '3', title: 'Review creator applications', desc: 'Browse applicants filtered by tier, niche, and reach. Admin approves accepted creators.' },
                  { step: '4', title: 'Review creator submissions', desc: 'You are the primary reviewer — approve or reject each proof submission with notes.' },
                  { step: '5', title: 'Release payment', desc: 'Approved submissions trigger automatic USDT crypto payouts to creator wallets. Admin mediates any disputes.' },
                ].map(s => (
                  <div key={s.step} className="flex gap-4 items-start">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{s.title}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trust & Security ── */}
      <div className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Built on Trust & Security</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm">Every layer of Taskdrip is designed to protect creators and brands alike.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'KYC Verification', desc: 'Optional identity verification for creators and brands unlocks higher campaign limits and builds mutual trust.', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Lock, title: 'Direct Crypto Payouts', desc: 'We never hold your earnings. Once approved, USDT goes straight to your wallet via TRC-20 (Tron), BEP-20 (BNB Chain), or ERC-20 (Ethereum) — within 24–72 hours.', color: 'text-green-600', bg: 'bg-green-50' },
              { icon: Star, title: 'Review System', desc: 'Every completed campaign can be reviewed by both parties. Reputation scores are public and build over time.', color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f1a] via-purple-950 to-[#0f0f1a]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.4) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Flame className="w-14 h-14 text-purple-400 mx-auto mb-5" />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-5">
            Ready to Turn Your Influence<br />Into Crypto Income?
          </h2>
          <p className="text-gray-300 text-lg mb-10 leading-relaxed">
            Join thousands of verified creators and hundreds of brands already building the future of influencer marketing on Taskdrip.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-2xl shadow-purple-500/40 px-10 font-bold text-base">
                Create Your Account <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button size="lg" className="bg-white/10 border border-white/30 text-white hover:bg-white/20 px-10 font-bold text-base backdrop-blur-sm">
                Browse Live Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
