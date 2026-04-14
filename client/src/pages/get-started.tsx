import { Link } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SOCIALS } from "@/config/socials";
import { 
  UserPlus, UserCheck, Rocket, DollarSign, ArrowRight, 
  CheckCircle, Play, Star, Zap
} from "lucide-react";
import { SiTelegram, SiWhatsapp, SiX } from "react-icons/si";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up as a creator or brand in less than 2 minutes. Earn 50 $TDRIP points instantly on signup.",
    details: [
      "Choose Creator (earn) or Brand (hire)",
      "Fill in your basic info",
      "Instant access — no waiting",
      "+50 $TDRIP points on signup",
    ],
    cta: { label: "Create Account", href: "/signup" },
    color: "from-purple-600 to-indigo-600",
    badge: "+50 Points",
  },
  {
    number: 2,
    icon: UserCheck,
    title: "Complete Your Profile",
    description: "A complete profile earns you 100 $TDRIP points and gets 5× more brand invitations.",
    details: [
      "Upload a profile photo",
      "Write a compelling bio",
      "Add your social channels & follower counts",
      "Set your content niche",
    ],
    cta: { label: "Edit Profile", href: "/profile-edit" },
    color: "from-blue-600 to-cyan-600",
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
    color: "from-orange-500 to-pink-500",
    badge: "+130 Points",
  },
  {
    number: 4,
    icon: DollarSign,
    title: "Start Earning",
    description: "Browse and join campaigns from top brands. Complete tasks and earn USDT crypto payments directly to your wallet.",
    details: [
      "Browse active campaigns by niche",
      "Submit your application",
      "Complete the task & submit proof",
      "Get paid in USDT / TON to your wallet",
    ],
    cta: { label: "Browse Campaigns", href: "/campaigns" },
    color: "from-green-500 to-emerald-500",
    badge: "Earn Crypto",
  },
];

const pointsRules = [
  { action: "Sign Up", points: "+50", color: "bg-purple-100 text-purple-700" },
  { action: "Complete Profile", points: "+100", color: "bg-blue-100 text-blue-700" },
  { action: "Join Campaign", points: "+20", color: "bg-orange-100 text-orange-700" },
  { action: "Complete Task", points: "+50", color: "bg-green-100 text-green-700" },
  { action: "Refer a Friend", points: "+100", color: "bg-pink-100 text-pink-700" },
  { action: "Daily Login", points: "+5", color: "bg-gray-100 text-gray-700" },
  { action: "Social Tasks", points: "Varies", color: "bg-yellow-100 text-yellow-700" },
];

const levels = [
  { name: "Starter", range: "0–500", color: "bg-gray-200 text-gray-700" },
  { name: "Hustler", range: "500–2K", color: "bg-blue-100 text-blue-700" },
  { name: "Influencer", range: "2K–10K", color: "bg-purple-100 text-purple-700" },
  { name: "Authority", range: "10K–50K", color: "bg-orange-100 text-orange-700" },
  { name: "Elite", range: "50K+", color: "bg-yellow-100 text-yellow-800" },
];

export default function GetStarted() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className="bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-4">
            <Zap className="h-3 w-3 mr-1" /> Earn Your First $TDRIP Points Today
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Get Started with Taskdrip
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
            Join 10,000+ creators earning crypto through brand campaigns. Follow 4 simple steps to start earning $TDRIP points and USDT rewards.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-black hover:bg-gray-100">
              <Link href="/signup">
                <UserPlus className="h-4 w-4 mr-2" />
                Create Free Account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link href="/campaigns">
                <Play className="h-4 w-4 mr-2" />
                Browse Campaigns
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">4 Simple Steps to Start Earning</h2>
        <p className="text-gray-500 text-center mb-12">Follow these steps in order to maximize your earnings from day one.</p>

        <div className="space-y-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex flex-col md:flex-row gap-6 items-start">
                {/* Step number + line */}
                <div className="flex flex-col items-center md:mt-2">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-200 mt-2 hidden md:block" />
                  )}
                </div>

                <Card className="flex-1 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {step.number}</span>
                      <Badge className="text-xs bg-green-100 text-green-700 border-0">{step.badge}</Badge>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    <ul className="space-y-1.5 mb-5">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                    <Button asChild>
                      <Link href={step.cta.href}>
                        {step.cta.label} <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* $TDRIP Points System */}
      <div className="bg-white py-16 px-4 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="bg-yellow-100 text-yellow-800 border-0 mb-3">
              <Star className="h-3 w-3 mr-1" /> $TDRIP Point System
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Every Action Earns Points</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Points are off-chain rewards — later convertible to $TDRIP token. Every action on Taskdrip earns you points.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Points Rules */}
            <div>
              <h3 className="font-bold text-gray-800 mb-4">How to Earn Points</h3>
              <div className="space-y-2">
                {pointsRules.map((rule, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <span className="text-sm text-gray-700 font-medium">{rule.action}</span>
                    <Badge className={`${rule.color} border-0 font-bold`}>{rule.points}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Level System */}
            <div>
              <h3 className="font-bold text-gray-800 mb-4">Level Up as You Earn</h3>
              <div className="space-y-2">
                {levels.map((level, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge className={`${level.color} border-0`}>{level.name}</Badge>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">{level.range} points</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 italic">
                Points stored securely for future $TDRIP token conversion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Community CTAs */}
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Join Our Community</h2>
          <p className="text-purple-200 mb-8">Connect with thousands of creators, get support, and never miss new campaigns.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-[#229ED9] hover:bg-[#1a8bbf] text-white">
                <SiTelegram className="h-4 w-4 mr-2" /> Join Telegram Community
              </Button>
            </a>
            <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-[#25D366] hover:bg-[#1da851] text-white">
                <SiWhatsapp className="h-4 w-4 mr-2" /> Chat on WhatsApp
              </Button>
            </a>
            <a href={SOCIALS.x} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <SiX className="h-4 w-4 mr-2" /> Follow on X
              </Button>
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
