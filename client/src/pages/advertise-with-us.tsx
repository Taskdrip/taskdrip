import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Megaphone, Users, BarChart3, Globe, TrendingUp, Star, CheckCircle2,
  ArrowRight, Zap, Target, DollarSign, Play, Instagram, Twitter,
  Youtube, MessageCircle, Mail, Phone, Building2, Layers, Award,
  ChevronRight, Sparkles, Eye, Gift, Trophy, Coins, CreditCard, X,
  ShieldCheck
} from "lucide-react";
import { SiTiktok, SiTelegram } from "react-icons/si";

const PACKAGES = [
  {
    name: "Platform Ads",
    icon: Monitor2,
    color: "from-blue-500 to-blue-700",
    badge: "Most Popular",
    badgeColor: "bg-blue-100 text-blue-700",
    price: "From $49",
    description: "Affordable sponsored and featured placements for new brands that want visibility before committing to a large budget.",
    features: [
      "Featured post placement",
      "In-feed sponsored posts",
      "Homepage or sidebar display ads",
      "Campaigns page promotion",
      "Shop & BreedSkool placements",
      "Real-time impression & click analytics",
    ],
    reach: "10K+ Platform Users",
  },
  {
    name: "Social Media Blast",
    icon: Megaphone,
    color: "from-purple-500 to-purple-700",
    badge: "High Engagement",
    badgeColor: "bg-purple-100 text-purple-700",
    price: "From $99",
    description: "Your brand promoted across Taskdrip's official social media channels with authentic, engaging content.",
    features: [
      "Instagram story & post promotions",
      "TikTok branded content",
      "Twitter/X thread features",
      "Telegram channel announcements",
      "YouTube mention in relevant content",
      "Cross-platform campaign strategy",
    ],
    reach: "500K+ Social Followers",
  },
  {
    name: "Influencer Network",
    icon: Users,
    color: "from-amber-500 to-orange-600",
    badge: "Maximum ROI",
    badgeColor: "bg-amber-100 text-amber-700",
    price: "From $250",
    description: "Connect with our network of verified Web3-native influencers to create authentic sponsored content.",
    features: [
      "Matched with 5–20 relevant influencers",
      "Verified influencer profiles only",
      "Multi-platform content delivery",
      "Dedicated campaign manager",
      "Performance reporting & ROI tracking",
      "Sponsored content review & approval",
    ],
    reach: "Millions of End Users",
  },
  {
    name: "Giveaway Campaigns",
    icon: Gift,
    color: "from-emerald-500 to-teal-700",
    badge: "Fast Growth",
    badgeColor: "bg-emerald-100 text-emerald-700",
    price: "From $75 + rewards",
    description: "Run follow, comment, join-community, or app-signup giveaways with $TDRIP points and clear task requirements.",
    features: [
      "Follow, comment, repost, join Telegram/Discord tasks",
      "Follower-count or location pre-qualification",
      "First X qualified participants accepted",
      "$TDRIP point rewards per participant",
      "Winner proof and participant export",
      "Optional influencer amplification",
    ],
    reach: "Task-driven Growth",
  },
];

function Monitor2(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const STATS = [
  { value: "10K+", label: "Verified Influencers", icon: Users },
  { value: "2.5K+", label: "Active Campaigns", icon: Target },
  { value: "500K+", label: "Social Reach", icon: Globe },
  { value: "4", label: "Crypto Networks", icon: Zap },
];

const SOCIALS = [
  { name: "Instagram", icon: Instagram, followers: "125K", color: "bg-gradient-to-br from-pink-500 to-orange-400 text-white" },
  { name: "TikTok", icon: SiTiktok, followers: "220K", color: "bg-black text-white" },
  { name: "Twitter / X", icon: Twitter, followers: "85K", color: "bg-sky-500 text-white" },
  { name: "YouTube", icon: Youtube, followers: "45K", color: "bg-red-600 text-white" },
  { name: "Telegram", icon: SiTelegram, followers: "30K", color: "bg-blue-500 text-white" },
];

const EMPTY_FORM = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  adType: "",
  budget: "",
  platforms: "",
  giveawayType: "",
  tdripBudget: "",
  goals: "",
  message: "",
};

const BASE_PRICES: Record<string, { min: number; label: string }> = {
  platform_ads: { min: 49, label: "Platform Ads" },
  social_media: { min: 99, label: "Social Media Promotion" },
  influencer_network: { min: 250, label: "Influencer Network" },
  sponsored_content: { min: 149, label: "Sponsored Content" },
  featured_post: { min: 79, label: "Featured Post" },
  giveaway_campaign: { min: 75, label: "Giveaway Campaign" },
  all: { min: 499, label: "Full Package" },
};

const TDRIP_PER_USD = 100;

export default function AdvertiseWithUs() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [tdripParticipants, setTdripParticipants] = useState(0);
  const [tdripPointsEach, setTdripPointsEach] = useState(0);
  const [checkoutSummary, setCheckoutSummary] = useState(false);
  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const isGiveaway = form.adType === "giveaway_campaign";
  const basePrice = BASE_PRICES[form.adType]?.min || 0;
  const tdripTotal = tdripParticipants * tdripPointsEach;
  const tdripCostUsd = tdripTotal / TDRIP_PER_USD;
  const totalCost = basePrice + tdripCostUsd;

  const submitMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/advertise-applications", data),
    onSuccess: () => { setSubmitted(true); setForm(EMPTY_FORM); setCheckoutSummary(false); },
    onError: () => toast({ title: "Failed to submit. Please try again.", variant: "destructive" }),
  });

  const validate = () => {
    if (!form.companyName || !form.contactName || !form.email || !form.adType) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSpeakToAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const tdripSummary = isGiveaway && tdripTotal > 0
      ? `${tdripTotal.toLocaleString()} $TDRIP for ${tdripParticipants} participants (${tdripPointsEach} pts each) = $${tdripCostUsd.toFixed(2)}`
      : "";
    submitMutation.mutate({ ...form, tdripBudget: tdripSummary || form.tdripBudget, message: form.message || "Applicant chose: Speak to an agent" });
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setCheckoutSummary(true);
  };

  const confirmCheckout = () => {
    const tdripSummary = isGiveaway && tdripTotal > 0
      ? `${tdripTotal.toLocaleString()} $TDRIP for ${tdripParticipants} participants (${tdripPointsEach} pts each) = $${tdripCostUsd.toFixed(2)}`
      : "";
    submitMutation.mutate({ ...form, tdripBudget: tdripSummary || form.tdripBudget, message: `[CHECKOUT INITIATED] Total: $${totalCost.toFixed(2)}. ${form.message || ""}` });
  };

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* Hero */}
      <section
        className="relative bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 text-white py-28 overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(rgba(5, 5, 15, 0.82), rgba(15, 5, 35, 0.9)), url('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1800&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-6 text-sm px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" /> Advertising Opportunities
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Reach the World's Most<br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">Engaged Web3 Audience</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Launch sponsored posts, featured placements, social media pushes, influencer campaigns, and giveaway tasks with pricing built for new brands.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#apply">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg h-auto gap-2 shadow-lg shadow-purple-900/40">
                Apply to Advertise <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
            <a href="#packages">
              <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white px-8 py-4 text-lg h-auto gap-2">
                View Packages <ChevronRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-950 text-white py-12 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="flex justify-center mb-2"><div className="p-2 bg-purple-900/40 rounded-lg"><s.icon className="h-5 w-5 text-purple-400" /></div></div>
                <p className="text-3xl font-extrabold text-white">{s.value}</p>
                <p className="text-sm text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Advertise With Us */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Brands Choose Taskdrip</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Our audience isn't just scrolling — they're building, earning, and investing in the future of Web3.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Target, title: "Highly Targeted Audience", desc: "Reach verified crypto users, influencers, brand managers, and Web3 entrepreneurs. No wasted impressions.", color: "text-blue-600 bg-blue-50" },
              { icon: TrendingUp, title: "Proven Engagement", desc: "Our influencers are active — campaign completion rates over 85%, and a community that actually takes action.", color: "text-purple-600 bg-purple-50" },
              { icon: BarChart3, title: "Full Transparency", desc: "Real-time dashboards showing impressions, clicks, CTR, and conversions. You know exactly what you're getting.", color: "text-green-600 bg-green-50" },
              { icon: Users, title: "Authentic Influencer Network", desc: "Access 10,000+ verified influencers across TikTok, Instagram, Twitter, YouTube and more.", color: "text-amber-600 bg-amber-50" },
              { icon: Zap, title: "Crypto-Native Community", desc: "Your ad is seen by people who hold, trade, and use crypto daily. Perfect for Web3, DeFi, and NFT projects.", color: "text-orange-600 bg-orange-50" },
              { icon: Award, title: "Brand Safety", desc: "All influencers are verified and KYC-approved. Your brand always appears in a trusted, professional environment.", color: "text-indigo-600 bg-indigo-50" },
            ].map(item => (
              <div key={item.title} className="flex gap-4">
                <div className={`p-3 rounded-xl h-fit flex-shrink-0 ${item.color}`}><item.icon className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Channels */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Our Social Media Channels</h2>
            <p className="text-gray-500">Amplify your brand across all the platforms that matter to your audience.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {SOCIALS.map(s => (
              <Card key={s.name} className="border-0 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5 text-center">
                  <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center mx-auto mb-3`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <p className="font-bold text-xl text-gray-900">{s.followers}</p>
                  <p className="text-sm text-gray-500">{s.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Advertising Packages</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Choose the package that best matches your marketing goals. Custom solutions available.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PACKAGES.map((pkg, i) => (
              <Card key={pkg.name} className={`border-0 shadow-lg overflow-hidden relative ${i === 2 ? "md:-mt-4 md:mb-4" : ""}`}>
                {pkg.badge && (
                  <div className="absolute top-4 right-4">
                    <Badge className={`${pkg.badgeColor} text-xs font-semibold`}>{pkg.badge}</Badge>
                  </div>
                )}
                <div className={`bg-gradient-to-br ${pkg.color} p-6 text-white`}>
                  <div className="p-2.5 bg-white/20 rounded-xl w-fit mb-4"><pkg.icon className="h-6 w-6" /></div>
                  <h3 className="text-xl font-bold mb-1">{pkg.name}</h3>
                  <p className="text-white/80 text-sm mb-3">{pkg.reach}</p>
                  <p className="text-2xl font-extrabold">{pkg.price}</p>
                </div>
                <CardContent className="p-6">
                  <p className="text-gray-600 text-sm mb-5 leading-relaxed">{pkg.description}</p>
                  <ul className="space-y-2.5">
                    {pkg.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#apply">
                    <Button className="w-full mt-6 gap-2" variant="outline">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mt-8">Fair starter pricing: begin small, prove results, then scale. Giveaway rewards and $TDRIP point budgets are paid upfront so participants can be rewarded reliably.</p>
        </div>
      </section>

      {/* Giveaway + TDRIP */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white">
                <Gift className="h-10 w-10 mb-4" />
                <h2 className="text-3xl font-bold mb-3">Giveaways with real tasks</h2>
                <p className="text-emerald-50">Brands can require users to follow, comment, repost, join a community, submit a wallet, or complete an app action before qualifying.</p>
              </div>
              <CardContent className="p-8 space-y-4">
                {[
                  "Pre-qualify creators by follower count, channel, country, or first-come limits.",
                  "Example: First 100 users with 5,000+ followers who follow X and comment are accepted.",
                  "Use screenshots, profile links, or post URLs as proof.",
                  "Add $TDRIP points per accepted participant to drive faster completion.",
                ].map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-violet-600 to-fuchsia-700 p-8 text-white">
                <Coins className="h-10 w-10 mb-4" />
                <h2 className="text-3xl font-bold mb-3">$TDRIP point add-ons</h2>
                <p className="text-violet-50">100 $TDRIP = $1 USDT. Brands and sellers can fund points upfront for task participants.</p>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl bg-violet-50 p-4">
                    <p className="text-sm text-violet-700">Example add-on</p>
                    <p className="text-2xl font-bold text-violet-950">100 $TDRIP</p>
                    <p className="text-xs text-violet-600">per participant</p>
                  </div>
                  <div className="rounded-xl bg-fuchsia-50 p-4">
                    <p className="text-sm text-fuchsia-700">100 users</p>
                    <p className="text-2xl font-bold text-fuchsia-950">$100</p>
                    <p className="text-xs text-fuchsia-600">paid upfront</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Users can buy more $TDRIP in Taskdrip, and the points will be swappable when Taskdrip's native token launches.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-gradient-to-br from-purple-950 to-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-gray-400">From application to live campaign in as little as 48 hours.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Apply", desc: "Fill out the form below with your brand details and goals.", icon: Megaphone },
              { step: "02", title: "Strategy Call", desc: "Our team reviews your application and schedules a strategy call within 24h.", icon: Phone },
              { step: "03", title: "Campaign Setup", desc: "We configure your ads, match influencers, and set up tracking.", icon: Settings2 },
              { step: "04", title: "Go Live", desc: "Your campaign launches. Monitor results in real-time.", icon: Play },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-800/50 border border-purple-700/50 flex items-center justify-center mx-auto">
                    <s.icon className="h-6 w-6 text-purple-300" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center">{s.step.slice(1)}</span>
                </div>
                <h3 className="font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Apply to Advertise</h2>
            <p className="text-gray-500 text-lg">Tell us about your brand and goals. We'll get back to you within 24 hours.</p>
          </div>

          {submitted ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Application Received!</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">Thank you for your interest. Our advertising team will review your application and reach out within 24 hours.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={() => setSubmitted(false)}>Submit Another</Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => window.location.href = "/"}>Back to Home</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-lg">
              <CardContent className="p-8">
                <form onSubmit={e => e.preventDefault()} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Company / Brand Name *</Label>
                      <Input data-testid="input-company-name" value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Acme Inc." required />
                    </div>
                    <div>
                      <Label>Contact Name *</Label>
                      <Input data-testid="input-contact-name" value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Jane Smith" required />
                    </div>
                    <div>
                      <Label>Email Address *</Label>
                      <Input data-testid="input-email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@company.com" required />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input data-testid="input-phone" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input data-testid="input-website" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://yourcompany.com" />
                    </div>
                    <div>
                      <Label>Industry</Label>
                      <Select value={form.industry} onValueChange={v => set("industry", v)}>
                        <SelectTrigger data-testid="select-industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="crypto_web3">Crypto / Web3</SelectItem>
                          <SelectItem value="defi">DeFi / Finance</SelectItem>
                          <SelectItem value="nft">NFT / Gaming</SelectItem>
                          <SelectItem value="ecommerce">E-Commerce</SelectItem>
                          <SelectItem value="saas">SaaS / Software</SelectItem>
                          <SelectItem value="fashion_beauty">Fashion / Beauty</SelectItem>
                          <SelectItem value="health_fitness">Health / Fitness</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>I'm interested in * </Label>
                    <Select value={form.adType} onValueChange={v => set("adType", v)}>
                      <SelectTrigger data-testid="select-ad-type">
                        <SelectValue placeholder="Select advertising type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform_ads">Platform Ads (display / native)</SelectItem>
                        <SelectItem value="social_media">Social Media Promotion</SelectItem>
                        <SelectItem value="influencer_network">Influencer / Influencer Network</SelectItem>
                        <SelectItem value="sponsored_content">Sponsored Blog / Content</SelectItem>
                        <SelectItem value="featured_post">Featured / Sponsored Post</SelectItem>
                        <SelectItem value="giveaway_campaign">Giveaway Campaign</SelectItem>
                        <SelectItem value="all">Full Package (all of the above)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preferred Channels</Label>
                      <Input data-testid="input-platforms" value={form.platforms} onChange={e => set("platforms", e.target.value)} placeholder="X, Instagram, TikTok, Telegram..." />
                    </div>
                    <div>
                      <Label>$TDRIP Budget</Label>
                      <Input data-testid="input-tdrip-budget" value={form.tdripBudget} onChange={e => set("tdripBudget", e.target.value)} placeholder="Example: 10,000 $TDRIP for 100 users" />
                    </div>
                  </div>

                  <div>
                    <Label>Giveaway or Task Requirements</Label>
                    <Textarea
                      data-testid="input-giveaway-type"
                      value={form.giveawayType}
                      onChange={e => set("giveawayType", e.target.value)}
                      placeholder="Example: Follow our X, comment on pinned post, first 100 users with 5k+ followers qualify."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Monthly Advertising Budget</Label>
                    <Select value={form.budget} onValueChange={v => set("budget", v)}>
                      <SelectTrigger data-testid="select-budget">
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_500">Under $500/mo</SelectItem>
                        <SelectItem value="500_2000">$500 – $2,000/mo</SelectItem>
                        <SelectItem value="2000_10000">$2,000 – $10,000/mo</SelectItem>
                        <SelectItem value="over_10000">$10,000+/mo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* $TDRIP Topup Calculator */}
                  <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-violet-600 rounded-lg">
                        <Coins className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-violet-900 text-sm">$TDRIP Points Topup</p>
                        <p className="text-xs text-violet-600">100 $TDRIP = $1 USDT — reward participants directly</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label className="text-xs text-violet-700 mb-1 block">Number of Participants</Label>
                        <Input
                          type="number"
                          min={0}
                          value={tdripParticipants || ""}
                          onChange={e => setTdripParticipants(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="e.g. 100"
                          className="bg-white border-violet-200"
                          data-testid="input-tdrip-participants"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-violet-700 mb-1 block">$TDRIP Points Per Person</Label>
                        <Input
                          type="number"
                          min={0}
                          value={tdripPointsEach || ""}
                          onChange={e => setTdripPointsEach(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="e.g. 100"
                          className="bg-white border-violet-200"
                          data-testid="input-tdrip-points-each"
                        />
                      </div>
                    </div>
                    {tdripTotal > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-1">
                        <div className="bg-white rounded-xl p-3 text-center border border-violet-100">
                          <p className="text-lg font-bold text-violet-900">{tdripTotal.toLocaleString()}</p>
                          <p className="text-[10px] text-violet-500">Total $TDRIP</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center border border-violet-100">
                          <p className="text-lg font-bold text-fuchsia-700">${tdripCostUsd.toFixed(2)}</p>
                          <p className="text-[10px] text-fuchsia-500">TDRIP Cost (USD)</p>
                        </div>
                        <div className="bg-violet-600 rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-white">{tdripParticipants.toLocaleString()}</p>
                          <p className="text-[10px] text-violet-200">Participants</p>
                        </div>
                      </div>
                    )}
                    {tdripTotal === 0 && (
                      <p className="text-xs text-violet-400 text-center py-2">Enter participants and points per person to calculate your $TDRIP budget</p>
                    )}
                  </div>

                  <div>
                    <Label>Campaign Goals</Label>
                    <Textarea
                      data-testid="input-goals"
                      value={form.goals}
                      onChange={e => set("goals", e.target.value)}
                      placeholder="E.g. Increase brand awareness among crypto users, drive sign-ups for our app launch..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Additional Message</Label>
                    <Textarea
                      data-testid="input-message"
                      value={form.message}
                      onChange={e => set("message", e.target.value)}
                      placeholder="Anything else we should know about your brand or campaign?"
                      rows={3}
                    />
                  </div>

                  {/* Cost Summary */}
                  {form.adType && (
                    <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estimated Campaign Cost</p>
                      <div className="space-y-2">
                        {basePrice > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{BASE_PRICES[form.adType]?.label} (base)</span>
                            <span className="font-semibold text-gray-900">From ${basePrice}</span>
                          </div>
                        )}
                        {tdripTotal > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{tdripTotal.toLocaleString()} $TDRIP rewards</span>
                            <span className="font-semibold text-violet-700">+${tdripCostUsd.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 flex justify-between">
                          <span className="font-bold text-gray-900">Estimated Total</span>
                          <span className="font-extrabold text-gray-900 text-lg">${totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Final pricing confirmed by our team — custom packages available.</p>
                    </div>
                  )}

                  {/* Submit options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 flex-col gap-0.5 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                      disabled={submitMutation.isPending}
                      onClick={handleSpeakToAgent}
                      data-testid="button-speak-to-agent"
                    >
                      <span className="font-bold text-gray-900">Speak to an Agent</span>
                      <span className="text-xs text-gray-500">Submit & our team contacts you in 24h</span>
                    </Button>
                    <Button
                      type="button"
                      className="h-14 flex-col gap-0.5 bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={submitMutation.isPending}
                      onClick={handleCheckout}
                      data-testid="button-checkout"
                    >
                      <span className="font-bold">Checkout Now →</span>
                      <span className="text-xs text-purple-200">Pay & start your campaign faster</span>
                    </Button>
                  </div>

                  <p className="text-xs text-gray-400 text-center">By submitting, you agree to be contacted by the Taskdrip advertising team. We'll never share your info with third parties.</p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Contact Strip */}
      <section className="py-12 bg-gray-50 border-t">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Have questions before applying?</h3>
              <p className="text-gray-500">Our advertising team is here to help you find the right package.</p>
            </div>
            <div className="flex gap-3">
              <a href="mailto:ads@taskdrip.online">
                <Button variant="outline" className="gap-2"><Mail className="h-4 w-4" />ads@taskdrip.online</Button>
              </a>
              <a href="/contact">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2"><MessageCircle className="h-4 w-4" />Live Chat</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Checkout Summary Dialog */}
      <Dialog open={checkoutSummary} onOpenChange={setCheckoutSummary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <CreditCard className="h-5 w-5 text-purple-600" /> Campaign Checkout Summary
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Company</span>
                <span className="font-semibold text-gray-900">{form.companyName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ad Type</span>
                <span className="font-semibold text-gray-900">{BASE_PRICES[form.adType]?.label || form.adType}</span>
              </div>
              {basePrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Campaign Cost</span>
                  <span className="font-semibold text-gray-900">From ${basePrice}</span>
                </div>
              )}
              {tdripTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{tdripTotal.toLocaleString()} $TDRIP ({tdripParticipants} × {tdripPointsEach})</span>
                  <span className="font-semibold text-violet-700">+${tdripCostUsd.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Estimated Total</span>
                <span className="text-xl font-extrabold text-purple-700">${totalCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" /> How to pay
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>1. Submit your application below</p>
                <p>2. Our team sends you a payment link within 2 hours</p>
                <p>3. After payment, your campaign goes live within 24h</p>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1.5 pt-1 border-t border-gray-200">
                <Mail className="h-3.5 w-3.5" /> Payment link sent to: <span className="font-medium">{form.email}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCheckoutSummary(false)}>Back to Form</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 flex-1"
              onClick={confirmCheckout}
              disabled={submitMutation.isPending}
              data-testid="button-confirm-checkout"
            >
              {submitMutation.isPending ? "Submitting..." : <><CheckCircle2 className="h-4 w-4" /> Confirm & Submit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Settings2(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
