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
import {
  Megaphone, Users, BarChart3, Globe, TrendingUp, Star, CheckCircle2,
  ArrowRight, Zap, Target, DollarSign, Play, Instagram, Twitter,
  Youtube, MessageCircle, Mail, Phone, Building2, Layers, Award,
  ChevronRight, Sparkles, Eye
} from "lucide-react";
import { SiTiktok, SiTelegram } from "react-icons/si";

const PACKAGES = [
  {
    name: "Platform Ads",
    icon: Monitor2,
    color: "from-blue-500 to-blue-700",
    badge: "Most Popular",
    badgeColor: "bg-blue-100 text-blue-700",
    price: "From $299/mo",
    description: "Display and native ads shown to our entire platform audience of 10,000+ verified creators and brands.",
    features: [
      "Homepage banner placement",
      "In-feed sponsored posts",
      "Sidebar display ads",
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
    price: "From $499/mo",
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
    name: "Creator Network",
    icon: Users,
    color: "from-amber-500 to-orange-600",
    badge: "Maximum ROI",
    badgeColor: "bg-amber-100 text-amber-700",
    price: "From $999/mo",
    description: "Connect with our network of verified Web3-native influencers to create authentic sponsored content.",
    features: [
      "Matched with 5–20 relevant creators",
      "Verified creator profiles only",
      "Multi-platform content delivery",
      "Dedicated campaign manager",
      "Performance reporting & ROI tracking",
      "Sponsored content review & approval",
    ],
    reach: "Millions of End Users",
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
  goals: "",
  message: "",
};

export default function AdvertiseWithUs() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const submitMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/advertise-applications", data),
    onSuccess: () => { setSubmitted(true); setForm(EMPTY_FORM); },
    onError: () => toast({ title: "Failed to submit. Please try again.", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.contactName || !form.email || !form.adType) {
      return toast({ title: "Please fill in all required fields", variant: "destructive" });
    }
    submitMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-950 text-white py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
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
            Partner with Taskdrip to put your brand in front of 10,000+ verified Web3 creators, entrepreneurs, and early adopters who are ready to buy, use, and share.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#apply">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg h-auto gap-2 shadow-lg shadow-purple-900/40">
                Apply to Advertise <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
            <a href="#packages">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg h-auto gap-2">
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
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Target, title: "Highly Targeted Audience", desc: "Reach verified crypto users, influencers, brand managers, and Web3 entrepreneurs. No wasted impressions.", color: "text-blue-600 bg-blue-50" },
              { icon: TrendingUp, title: "Proven Engagement", desc: "Our creators are active — campaign completion rates over 85%, and a community that actually takes action.", color: "text-purple-600 bg-purple-50" },
              { icon: BarChart3, title: "Full Transparency", desc: "Real-time dashboards showing impressions, clicks, CTR, and conversions. You know exactly what you're getting.", color: "text-green-600 bg-green-50" },
              { icon: Users, title: "Authentic Influencer Network", desc: "Access 10,000+ verified creators across TikTok, Instagram, Twitter, YouTube and more.", color: "text-amber-600 bg-amber-50" },
              { icon: Zap, title: "Crypto-Native Community", desc: "Your ad is seen by people who hold, trade, and use crypto daily. Perfect for Web3, DeFi, and NFT projects.", color: "text-orange-600 bg-orange-50" },
              { icon: Award, title: "Brand Safety", desc: "All creators are verified and KYC-approved. Your brand always appears in a trusted, professional environment.", color: "text-indigo-600 bg-indigo-50" },
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
          <p className="text-center text-gray-400 text-sm mt-8">All prices are estimates. Final pricing depends on duration, targeting, and creative requirements. Custom packages available.</p>
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
              { step: "03", title: "Campaign Setup", desc: "We configure your ads, match creators, and set up tracking.", icon: Settings2 },
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
                <form onSubmit={handleSubmit} className="space-y-6">
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
                        <SelectItem value="influencer_network">Influencer / Creator Network</SelectItem>
                        <SelectItem value="sponsored_content">Sponsored Blog / Content</SelectItem>
                        <SelectItem value="all">Full Package (all of the above)</SelectItem>
                      </SelectContent>
                    </Select>
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

                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base font-semibold gap-2"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-application"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Application"} <ArrowRight className="h-5 w-5" />
                  </Button>

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
