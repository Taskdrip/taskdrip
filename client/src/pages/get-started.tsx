import { Link } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Badge } from "@/components/ui/badge";
import { SOCIALS } from "@/config/socials";
import { SocialLinksGrid } from "@/components/ui/social-sidebar";
import { 
  UserPlus, UserCheck, Rocket, DollarSign, ArrowRight, 
  CheckCircle, Star, Zap, Trophy, TrendingUp, Shield
} from "lucide-react";
import { SiTelegram, SiWhatsapp, SiX, SiInstagram, SiYoutube } from "react-icons/si";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up as a influencer or brand in less than 2 minutes. Earn 50 $TDRIP points instantly on signup.",
    details: [
      "Choose Influencer (earn) or Brand (hire)",
      "Fill in your basic info",
      "Instant access — no waiting",
      "+50 $TDRIP points on signup",
    ],
    cta: { label: "Create Account", href: "/signup" },
    gradient: "from-violet-600 to-purple-700",
    accentBg: "bg-violet-50",
    accentText: "text-violet-700",
    badgeColor: "bg-violet-100 text-violet-800 border-violet-200",
    badge: "+50 Points",
  },
  {
    number: 2,
    icon: UserCheck,
    title: "Complete Your Profile",
    description: "A complete profile earns 100 $TDRIP points and gets 5× more brand invitations.",
    details: [
      "Upload a profile photo",
      "Write a compelling bio",
      "Add your social channels & follower counts",
      "Set your content niche",
    ],
    cta: { label: "Edit Profile", href: "/profile-edit" },
    gradient: "from-blue-600 to-cyan-600",
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    badge: "+100 Points",
  },
  {
    number: 3,
    icon: Rocket,
    title: "Join the Starter Campaign",
    description: "New users get auto-enrolled in our Welcome Campaign. Complete social tasks and earn 130 $TDRIP points.",
    details: [
      "Join Telegram Community (+20 pts)",
      "Follow us on X (+15 pts)",
      "Follow Instagram (+15 pts)",
      "Subscribe on YouTube (+20 pts)",
      "Join WhatsApp Group (+10 pts)",
    ],
    cta: { label: "Go to Dashboard", href: "/dashboard" },
    gradient: "from-orange-500 to-rose-500",
    accentBg: "bg-orange-50",
    accentText: "text-orange-700",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    badge: "+130 Points",
  },
  {
    number: 4,
    icon: DollarSign,
    title: "Start Earning Crypto",
    description: "Browse campaigns from top global brands. Complete tasks and earn USDT crypto payments directly to your wallet.",
    details: [
      "Browse active campaigns by niche",
      "Submit your application",
      "Complete the task & submit proof",
      "Get paid in USDT to your wallet",
    ],
    cta: { label: "Browse Campaigns", href: "/campaigns" },
    gradient: "from-green-500 to-emerald-600",
    accentBg: "bg-green-50",
    accentText: "text-green-700",
    badgeColor: "bg-green-100 text-green-800 border-green-200",
    badge: "Earn Crypto",
  },
];

const pointsRules = [
  { action: "Sign Up", points: "+50", color: "bg-violet-100 text-violet-700" },
  { action: "Complete Profile", points: "+100", color: "bg-blue-100 text-blue-700" },
  { action: "Join Campaign", points: "+20", color: "bg-orange-100 text-orange-700" },
  { action: "Complete Task", points: "+50", color: "bg-green-100 text-green-700" },
  { action: "Refer a Friend", points: "+100", color: "bg-pink-100 text-pink-700" },
  { action: "Daily Login", points: "+5", color: "bg-gray-100 text-gray-700" },
  { action: "Social Tasks", points: "Varies", color: "bg-yellow-100 text-yellow-800" },
];

const levels = [
  { name: "Starter", range: "0 – 500", emoji: "🌱", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { name: "Hustler", range: "500 – 2K", emoji: "⚡", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { name: "Influencer", range: "2K – 10K", emoji: "🔥", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "Authority", range: "10K – 50K", emoji: "💎", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { name: "Elite", range: "50K+", emoji: "👑", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
];

const stats = [
  { icon: Trophy, label: "Active Influencers", value: "10K+" },
  { icon: TrendingUp, label: "Campaigns Run", value: "2.5K+" },
  { icon: DollarSign, label: "Paid Out (USDT)", value: "$450K+" },
  { icon: Shield, label: "Verified Brands", value: "500+" },
];

export default function GetStarted() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero — dark wallpaper section */}
      <div
        className="relative text-white py-20 px-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="h-3.5 w-3.5" /> Earn Your First $TDRIP Points Today
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-5 leading-tight">
            Get Started with{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              Taskdrip
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Join 10,000+ influencers earning crypto through brand campaigns. Follow 4 simple steps to start earning $TDRIP points and USDT rewards.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <button className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition-colors text-base shadow-lg">
                <UserPlus className="h-4 w-4" />
                Create Free Account
              </button>
            </Link>
            <Link href="/campaigns">
              <button className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors text-base">
                <Star className="h-4 w-4" />
                Browse Campaigns
              </button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 max-w-3xl mx-auto">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <Icon className="h-5 w-5 text-purple-300 mx-auto mb-1.5" />
                  <p className="text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">4 Simple Steps to Start Earning</h2>
          <p className="text-gray-500 text-lg">Follow these steps in order to maximize your earnings from day one.</p>
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row gap-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Left accent */}
                <div className={`flex-shrink-0 sm:w-32 bg-gradient-to-br ${step.gradient} flex flex-col items-center justify-center py-6 sm:py-0 px-4`}>
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Step</span>
                  <span className="text-white text-4xl font-black leading-none">{step.number}</span>
                  <div className="mt-3 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  </div>
                  <p className="text-gray-500 mb-4">{step.description}</p>
                  <ul className="space-y-1.5 mb-5">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <Link href={step.cta.href}>
                    <button className={`inline-flex items-center gap-2 bg-gradient-to-r ${step.gradient} text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-sm`}>
                      {step.cta.label} <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points & Levels — light section */}
      <div className="bg-white border-t border-gray-100 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <Star className="h-3.5 w-3.5" /> $TDRIP Point System
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Every Action Earns Points</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Points are off-chain rewards — later convertible to $TDRIP token. Every action on Taskdrip earns you points.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Points Rules */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" /> How to Earn Points
              </h3>
              <div className="space-y-2.5">
                {pointsRules.map((rule, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white border border-gray-100">
                    <span className="text-sm text-gray-700 font-medium">{rule.action}</span>
                    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg ${rule.color}`}>
                      {rule.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Level System */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" /> Level Up as You Earn
              </h3>
              <div className="space-y-2.5">
                {levels.map((level, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white border border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{level.emoji}</span>
                      <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg border ${level.color}`}>
                        {level.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">{level.range} pts</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">
                Points stored securely for future $TDRIP token conversion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Community Section — dark wallpaper */}
      <div
        className="relative py-16 px-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a0533 0%, #2d1b69 40%, #0f2027 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute top-0 right-1/3 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-56 h-56 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Join Our Community</h2>
            <p className="text-purple-200 text-lg max-w-xl mx-auto">
              Connect with thousands of influencers, get instant support, and never miss a new campaign drop.
            </p>
          </div>

          <SocialLinksGrid dark />

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm shadow-lg">
                <SiTelegram className="h-4 w-4" /> Join Telegram
              </button>
            </a>
            <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm shadow-lg">
                <SiWhatsapp className="h-4 w-4" /> Chat on WhatsApp
              </button>
            </a>
            <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-semibold px-7 py-3 rounded-xl transition-opacity text-sm shadow-lg">
                <SiInstagram className="h-4 w-4" /> Follow Instagram
              </button>
            </a>
            <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2 bg-[#FF0000] hover:bg-[#cc0000] text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm shadow-lg">
                <SiYoutube className="h-4 w-4" /> Subscribe on YouTube
              </button>
            </a>
            <a href={SOCIALS.x} target="_blank" rel="noopener noreferrer">
              <button className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/20 transition-colors text-sm">
                <SiX className="h-4 w-4" /> Follow on X
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Final CTA — gradient wallpaper */}
      <div
        className="relative py-16 px-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 left-0 w-full h-full opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to Turn Your Influence Into Income?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Sign up free today and earn your first 50 $TDRIP points in under 2 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <button className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-9 py-4 rounded-xl hover:bg-gray-50 transition-colors text-base shadow-xl">
                <UserPlus className="h-5 w-5" />
                Create Free Account
              </button>
            </Link>
            <Link href="/tasks">
              <button className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-9 py-4 rounded-xl hover:bg-white/20 transition-colors text-base">
                Browse Tasks <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
