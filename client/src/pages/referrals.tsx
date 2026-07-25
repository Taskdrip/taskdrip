import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Copy, Share2, Users, Trophy, Gift, ChevronRight, Link as LinkIcon,
  TrendingUp, MessageCircle, DollarSign, Activity, CheckCircle, Clock,
  ExternalLink, Star, ChevronDown, ChevronUp, Zap, BookOpen, ShoppingBag,
  MousePointerClick, BarChart3, Wallet, ArrowRight, Globe, Sparkles,
  Target, Shield, BadgeCheck, AlertCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";

/* ─── Types ────────────────────────────────────────────────────────── */
interface Analytics {
  totalClicks: number;
  productClicks: number;
  courseClicks: number;
  userClicks: number;
  totalSignups: number;
  conversions: number;
  totalCommissions: string;
  pendingCommissions: string;
  paidCommissions: string;
  productEarnings: string;
  courseEarnings: string;
  inviteEarnings: string;
  legacyBonusEarned: string;
  primaryCode: string;
  baseUrl: string;
}
interface Commission {
  id: string;
  itemType: string;
  itemTitle: string | null;
  saleAmount: string;
  commissionRate: string;
  commissionAmount: string;
  status: string;
  createdAt: string;
}
interface CatalogItem {
  id: string;
  title: string;
  price: string | number;
  featuredImage?: string;
  thumbnail?: string;
  category?: string;
}

/* ─── Demo Reviews ──────────────────────────────────────────────────── */
const DEMO_REVIEWS = [
  {
    name: "Amara Diallo",
    country: "🇬🇭 Ghana",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&q=80",
    rating: 5,
    text: "I started sharing my referral link on TikTok and made over $340 in commissions in my first month. The course referral rate at 10% is incredible — I promoted BreedSkool and three people enrolled the same week!",
    earnings: "$340",
    type: "Influencer",
  },
  {
    name: "Carlos Mendoza",
    country: "🇲🇽 Mexico",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80",
    rating: 5,
    text: "The product referral at 15% is the best commission rate I've seen on any platform. I wrote a blog post comparing influencer marketing tools and linked my referral code — passive income every month since.",
    earnings: "$510",
    type: "Content Creator",
  },
  {
    name: "Priya Sharma",
    country: "🇮🇳 India",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
    rating: 5,
    text: "My YouTube channel has 45K subscribers interested in digital marketing. I made a dedicated video about Taskdrip and my referral link in the description has brought in 12 paid users so far. This really works!",
    earnings: "$280",
    type: "YouTuber",
  },
  {
    name: "Mohammed Al-Rashid",
    country: "🇦🇪 UAE",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
    rating: 5,
    text: "I manage a Telegram group for digital entrepreneurs in the Gulf region. Every time a member buys a product or course through my link, I earn automatically. No extra work needed once the setup is done.",
    earnings: "$620",
    type: "Community Manager",
  },
  {
    name: "Sofia Rossi",
    country: "🇮🇹 Italy",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80",
    rating: 5,
    text: "Running a fashion and lifestyle brand consultancy, I recommended Taskdrip to 3 client brands. Each brand spent on campaigns and I earned 5% of every transaction. This is the best passive income stream I've found.",
    earnings: "$890",
    type: "Brand Consultant",
  },
  {
    name: "Kwame Asante",
    country: "🇳🇬 Nigeria",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80",
    rating: 5,
    text: "I was skeptical at first but tried anyway. Posted my referral link in three WhatsApp groups and 8 people signed up within 48 hours. Two enrolled in BreedSkool courses — earned ₦85,000 equivalent in commissions already!",
    earnings: "$195",
    type: "Social Media Manager",
  },
];

/* ─── FAQ Items ─────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "How do I earn referral commissions?",
    a: "You earn automatically when someone signs up using your referral link and makes a purchase. 5% for user transactions (when they earn/spend), 10% when they buy a course, and 15% when they buy a product from the shop. All commissions are tracked in real-time.",
  },
  {
    q: "When are commissions paid out?",
    a: "Commissions accumulate in your referral earnings balance and can be requested at any time via the 'Request Payout' button. Admin processes payouts within 3-5 business days to your preferred payment method.",
  },
  {
    q: "What is my unique referral link?",
    a: "Your primary referral link uses your username (e.g., taskdrip.com/signup?ref=yourname). This is the easiest to remember and share. You can also generate specific product and course links directly from the catalog below.",
  },
  {
    q: "Is there a limit on how much I can earn?",
    a: "No limits. The more users you refer and the more products/courses they buy, the more you earn. Top referrers on our platform have earned over $2,000/month in passive commissions alone.",
  },
  {
    q: "How do I share most effectively?",
    a: "Create content that genuinely helps your audience — tutorials, reviews, comparison articles, YouTube videos. Embedded referral links in helpful content convert at 3–7x higher rates than bare link shares. Focus on the value Taskdrip provides.",
  },
  {
    q: "Can I generate specific product or course referral links?",
    a: "Yes! Use the 'Products' and 'Courses' tabs below to browse the full catalog. Each item has a 'Copy Link' button that generates a tracking link specifically for that item.",
  },
  {
    q: "What happens if someone clears their cookies before purchasing?",
    a: "We track referrals by account — when a user signs up through your link, they're linked to your referral code permanently. Any purchase they make on the platform within 90 days earns you the commission.",
  },
  {
    q: "Are there any products or courses I cannot earn commission on?",
    a: "Commission is available on all active products and courses. Some promotional or deeply discounted items may have reduced rates — this is indicated on the item listing.",
  },
];

/* ─── Strategy Tips ─────────────────────────────────────────────────── */
const STRATEGIES = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    color: "from-blue-500 to-indigo-600",
    title: "Write In-Depth Reviews",
    desc: "Blog posts comparing influencer platforms consistently rank on Google. A single review article can generate passive clicks for years. Include your referral link in the CTA.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    color: "from-purple-500 to-pink-600",
    title: "Share on Crypto & Web3 Platforms",
    desc: "Post on X (Twitter), Reddit crypto communities, and Telegram groups. TDRIP points and Web3 features resonate with the crypto community. Your link spreads fast in these circles.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    color: "from-emerald-500 to-teal-600",
    title: "Build a WhatsApp / Telegram Community",
    desc: "Create a group for digital entrepreneurs, influencers, or brand managers in your city or niche. Share Taskdrip resources regularly and include your referral link in the group description.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    color: "from-orange-500 to-amber-600",
    title: "YouTube Tutorials & How-To Videos",
    desc: "Record tutorials showing how to use Taskdrip features. Put your referral link in the description. YouTube videos about earning platforms get high intent traffic — viewers who watch convert.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    color: "from-yellow-500 to-orange-600",
    title: "Email Newsletters",
    desc: "If you have an email list, a single dedicated send about Taskdrip can bring in dozens of signups. Personalize the email — explain why you use it and what you've earned.",
  },
  {
    icon: <Target className="w-5 h-5" />,
    color: "from-rose-500 to-pink-600",
    title: "Refer Brands Directly",
    desc: "Brands that run campaigns spend real money. One brand referral that spends $5,000 on campaigns earns you $250 (5%). Focus on agency owners, marketing managers, and startup founders.",
  },
];

/* ─── Helpers ───────────────────────────────────────────────────────── */
function copyText(text: string, label: string, toast: any) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: `${label} copied!`, description: "Ready to share." });
  });
}

function CommissionBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">✓ Paid</Badge>;
  if (status === "approved") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">Approved</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">Pending</Badge>;
}

/* ─── FAQ Accordion Item ─────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left text-sm font-semibold text-gray-800 hover:text-purple-700 transition-colors gap-4"
        onClick={() => setOpen(o => !o)}
      >
        <span>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-purple-500" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />}
      </button>
      {open && <p className="text-sm text-gray-600 pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function ReferralsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const u = user as any;

  const [activeTab, setActiveTab] = useState("overview");
  const [catalogTab, setCatalogTab] = useState("products");
  const [productSearch, setProductSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/referrals/analytics"],
    enabled: !!isAuthenticated,
  });

  const { data: commissions = [], isLoading: commissionsLoading } = useQuery<Commission[]>({
    queryKey: ["/api/referrals/commissions"],
    enabled: !!isAuthenticated,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/referrals/products"],
    enabled: !!isAuthenticated,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/referrals/courses"],
    enabled: !!isAuthenticated,
  });

  const { data: referralLeaders = [] } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/referrals"],
  });

  // ─── Mutations ────────────────────────────────────────────────────────
  const ensureCodesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/referrals/ensure-codes").then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/referrals/analytics"] }),
  });

  const payoutMutation = useMutation({
    mutationFn: (data: { amount: string; note: string }) =>
      apiRequest("POST", "/api/referrals/payout-request", data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Payout Requested!", description: "Admin will process your request within 3-5 business days." });
      setShowPayoutForm(false);
      setPayoutAmount("");
      setPayoutNote("");
      qc.invalidateQueries({ queryKey: ["/api/referrals/analytics"] });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("{") ? JSON.parse(e.message)?.message : e.message;
      toast({ title: "Request Failed", description: msg || "Could not submit payout request.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (isAuthenticated && analytics && !analytics.primaryCode) {
      ensureCodesMutation.mutate();
    }
  }, [isAuthenticated, analytics]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <Gift className="h-14 w-14 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Sign in to access your referral program</h2>
          <p className="text-gray-500 mb-6">Earn passive income by sharing Taskdrip with your audience.</p>
          <Link href="/login"><Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">Log In to Earn</Button></Link>
        </div>
      </div>
    );
  }

  // ─── Computed values ──────────────────────────────────────────────────
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://taskdrip.com";
  const primaryCode = analytics?.primaryCode || u?.username || "";
  const userLink = primaryCode ? `${baseUrl}/signup?ref=${primaryCode}` : null;
  const totalEarnings = parseFloat(analytics?.totalCommissions || "0") + parseFloat(analytics?.legacyBonusEarned || "0");
  const pendingEarnings = parseFloat(analytics?.pendingCommissions || "0");
  const myRank = (referralLeaders as any[]).findIndex((l: any) => l.id === u?.id);

  const getProductLink = (id: string) =>
    primaryCode ? `${baseUrl}/shop/product/${id}?ref=${primaryCode}` : `${baseUrl}/shop/product/${id}`;
  const getCourseLink = (id: string) =>
    primaryCode ? `${baseUrl}/breedskool/${id}?ref=${primaryCode}` : `${baseUrl}/breedskool/${id}`;

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden min-h-[420px] sm:min-h-[480px] flex items-center">
        <img
          src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=1800&q=85&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-purple-950/80 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Decorative blobs */}
        <div className="absolute top-10 right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 w-full">
          <div className="max-w-3xl">
            <Badge className="mb-4 px-4 py-1.5 bg-white/15 backdrop-blur-sm text-white border-white/25 text-xs font-semibold rounded-full gap-2">
              <Sparkles className="w-3 h-3 text-yellow-400" /> Referral & Affiliate Program
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                Turn Your Network
              </span>{" "}
              Into Passive Income.
            </h1>
            <p className="text-gray-200 text-lg sm:text-xl max-w-2xl mb-8 leading-relaxed">
              Earn commissions for every user you invite, every course they enroll in, and every product they buy.
              No cap. No expiry. Real money, every time.
            </p>

            {/* Commission rate pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              {[
                { label: "5%", desc: "Per User Transaction", color: "bg-blue-500/20 border-blue-400/30 text-blue-200", icon: <Users className="w-3.5 h-3.5" /> },
                { label: "10%", desc: "Per Course Enrollment", color: "bg-purple-500/20 border-purple-400/30 text-purple-200", icon: <BookOpen className="w-3.5 h-3.5" /> },
                { label: "15%", desc: "Per Product Sale", color: "bg-amber-500/20 border-amber-400/30 text-amber-200", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
              ].map(({ label, desc, color, icon }) => (
                <div key={label} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-sm ${color}`}>
                  {icon}
                  <span className="text-2xl font-black text-white">{label}</span>
                  <span className="text-xs font-medium opacity-80">{desc}</span>
                </div>
              ))}
            </div>

            {/* Your link pill */}
            {userLink && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 max-w-xl">
                <LinkIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-white/80 text-sm font-mono truncate flex-1">{userLink}</span>
                <button
                  onClick={() => copyText(userLink, "Your referral link", toast)}
                  className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── STATS ROW ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: <MousePointerClick className="h-5 w-5 text-white" />,
              bg: "bg-blue-600",
              label: "Total Clicks",
              value: analyticsLoading ? null : analytics?.totalClicks ?? 0,
              color: "text-gray-900",
            },
            {
              icon: <Users className="h-5 w-5 text-white" />,
              bg: "bg-purple-600",
              label: "Signups",
              value: analyticsLoading ? null : analytics?.totalSignups ?? 0,
              color: "text-gray-900",
            },
            {
              icon: <CheckCircle className="h-5 w-5 text-white" />,
              bg: "bg-emerald-600",
              label: "Conversions",
              value: analyticsLoading ? null : analytics?.conversions ?? 0,
              color: "text-gray-900",
            },
            {
              icon: <DollarSign className="h-5 w-5 text-white" />,
              bg: "bg-amber-500",
              label: "Total Earned",
              value: analyticsLoading ? null : `$${totalEarnings.toFixed(2)}`,
              color: "text-green-600",
            },
          ].map(({ icon, bg, label, value, color }) => (
            <Card key={label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`${bg} rounded-xl p-2.5 flex-shrink-0`}>{icon}</div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    {value === null ? (
                      <Skeleton className="h-7 w-14 mt-1" />
                    ) : (
                      <p className={`text-2xl font-black ${color}`}>{value}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── MAIN TABS ─────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-gray-200 rounded-2xl p-1 shadow-sm mb-6 gap-1 flex-wrap h-auto">
            {[
              { v: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
              { v: "links", label: "My Links", icon: <LinkIcon className="w-4 h-4" /> },
              { v: "catalog", label: "Product & Course Links", icon: <ShoppingBag className="w-4 h-4" /> },
              { v: "earnings", label: "Earnings & Payout", icon: <Wallet className="w-4 h-4" /> },
              { v: "strategies", label: "Strategies", icon: <Target className="w-4 h-4" /> },
            ].map(({ v, label, icon }) => (
              <TabsTrigger key={v} value={v} className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                {icon} {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══ OVERVIEW TAB ══════════════════════════════════════════ */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">

                {/* Commission breakdown */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-purple-500" /> Earnings Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "User Invites (5%)", amount: analytics?.inviteEarnings || "0.00", color: "bg-blue-500", clicks: analytics?.userClicks },
                      { label: "Course Enrollments (10%)", amount: analytics?.courseEarnings || "0.00", color: "bg-purple-500", clicks: analytics?.courseClicks },
                      { label: "Product Sales (15%)", amount: analytics?.productEarnings || "0.00", color: "bg-amber-500", clicks: analytics?.productClicks },
                    ].map(({ label, amount, color, clicks }) => {
                      const total = parseFloat(analytics?.totalCommissions || "1") || 1;
                      const pct = Math.round((parseFloat(amount) / total) * 100);
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{clicks ?? 0} clicks</span>
                              <span className="text-sm font-bold text-gray-900">${parseFloat(amount).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct || 2}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Legacy Bonuses</span>
                      <span className="text-sm font-bold text-gray-900">${parseFloat(analytics?.legacyBonusEarned || "0").toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Commission history */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-purple-500" /> Recent Commissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {commissionsLoading ? (
                      <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : commissions.length === 0 ? (
                      <div className="text-center py-10">
                        <DollarSign className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No commissions yet</p>
                        <p className="text-gray-400 text-xs mt-1">Share your referral links to start earning</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {commissions.slice(0, 8).map((c) => (
                          <div key={c.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.itemType === "product" ? "bg-amber-100" : c.itemType === "course" ? "bg-purple-100" : "bg-blue-100"}`}>
                              {c.itemType === "product" ? <ShoppingBag className="w-4 h-4 text-amber-600" /> : c.itemType === "course" ? <BookOpen className="w-4 h-4 text-purple-600" /> : <Users className="w-4 h-4 text-blue-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{c.itemTitle || `${c.itemType} commission`}</p>
                              <p className="text-xs text-gray-400">Sale: ${parseFloat(c.saleAmount).toFixed(2)} × {(parseFloat(c.commissionRate) * 100).toFixed(0)}%</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-green-600">+${parseFloat(c.commissionAmount).toFixed(2)}</p>
                              <CommissionBadge status={c.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* How it works */}
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-amber-500" /> Commission Rates</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { rate: "5%", label: "User Invites", desc: "When invited users complete paid transactions", icon: <Users className="w-4 h-4" />, bg: "bg-blue-100", color: "text-blue-700" },
                      { rate: "10%", label: "Course Sales", desc: "When your referral buys any course", icon: <BookOpen className="w-4 h-4" />, bg: "bg-purple-100", color: "text-purple-700" },
                      { rate: "15%", label: "Product Sales", desc: "When your referral buys from the shop", icon: <ShoppingBag className="w-4 h-4" />, bg: "bg-amber-100", color: "text-amber-700" },
                    ].map(({ rate, label, desc, icon, bg, color }) => (
                      <div key={rate} className={`flex items-start gap-3 p-3 rounded-xl ${bg}`}>
                        <div className={`${color} mt-0.5`}>{icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-black ${color}`}>{rate}</span>
                            <span className="text-sm font-semibold text-gray-800">{label}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Leaderboard */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> Top Referrers</span>
                      <Link href="/leaderboard"><Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500">Full board <ChevronRight className="h-3 w-3 ml-1" /></Button></Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!(referralLeaders as any[]).length ? (
                      <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
                    ) : (
                      <div className="space-y-2.5">
                        {(referralLeaders as any[]).slice(0, 5).map((entry: any, idx: number) => (
                          <div key={entry.id} className={`flex items-center gap-2.5 p-2 rounded-xl ${idx < 3 ? "bg-amber-50" : ""}`}>
                            <span className={`w-6 text-xs font-black text-center ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : "text-gray-400"}`}>#{idx + 1}</span>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={entry.profileImageUrl} />
                              <AvatarFallback className="text-xs">{entry.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-sm font-medium truncate">{entry.firstName} {entry.lastName}</span>
                            <span className="text-xs font-bold text-gray-600">{entry.totalReferrals ?? 0} refs</span>
                          </div>
                        ))}
                        {myRank >= 0 && (
                          <div className="pt-2 border-t border-gray-100 text-center text-xs text-gray-500">
                            Your rank: <strong className="text-purple-700">#{myRank + 1}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══ LINKS TAB ═════════════════════════════════════════════ */}
          <TabsContent value="links">
            <div className="max-w-2xl mx-auto space-y-6">

              {/* Primary link */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-5">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Your Primary Referral Link</h3>
                  <p className="text-purple-200 text-sm mt-1">This is your username-based link — the easiest to remember and share anywhere</p>
                </div>
                <CardContent className="pt-5">
                  {userLink ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono text-gray-700 truncate">{userLink}</div>
                        <Button onClick={() => copyText(userLink, "Referral link", toast)} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 flex-shrink-0">
                          <Copy className="w-4 h-4" /> Copy
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Your referral code: <span className="font-mono font-bold text-purple-700">{primaryCode}</span></p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {[
                          { label: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(`Join me on Taskdrip and start earning! ${userLink}`)}`, color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
                          { label: "Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(userLink)}&text=${encodeURIComponent("Join Taskdrip and earn with your influence!")}`, color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" },
                          { label: "X / Twitter", url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(userLink)}&text=${encodeURIComponent("Making real money on Taskdrip 🚀 Join me!")}`, color: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100" },
                          { label: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(userLink)}`, color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
                        ].map(({ label, url, color }) => (
                          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${color}`}>
                            {label} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => ensureCodesMutation.mutate()} disabled={ensureCodesMutation.isPending}>
                      {ensureCodesMutation.isPending ? "Generating..." : "Generate My Referral Link"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Referral code card */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-emerald-500" /> Your Referral Code</CardTitle>
                  <CardDescription>Share just the code if the full link is too long</CardDescription>
                </CardHeader>
                <CardContent>
                  {primaryCode ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
                        <span className="text-2xl font-black tracking-wider text-purple-800">{primaryCode}</span>
                      </div>
                      <Button variant="outline" onClick={() => copyText(primaryCode, "Referral code", toast)} className="gap-2">
                        <Copy className="w-4 h-4" /> Copy Code
                      </Button>
                    </div>
                  ) : (
                    <Skeleton className="h-16 w-full" />
                  )}
                </CardContent>
              </Card>

              {/* How it works steps */}
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">How Referrals Work</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { n: 1, text: "Copy your unique referral link above", icon: <Copy className="w-3.5 h-3.5" /> },
                    { n: 2, text: "Share it on social media, in articles, or via direct message", icon: <Share2 className="w-3.5 h-3.5" /> },
                    { n: 3, text: "When someone signs up through your link, they're tied to your code permanently", icon: <Users className="w-3.5 h-3.5" /> },
                    { n: 4, text: "Earn 5% on their transactions, 10% on courses, 15% on products — automatically", icon: <DollarSign className="w-3.5 h-3.5 text-green-600" /> },
                    { n: 5, text: "Request payout anytime from the Earnings tab", icon: <Wallet className="w-3.5 h-3.5 text-amber-600" /> },
                  ].map(({ n, text, icon }) => (
                    <div key={n} className="flex items-start gap-3">
                      <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{n}</div>
                      <div className="flex items-start gap-1.5 text-gray-600 text-sm">
                        <span className="mt-0.5 flex-shrink-0 text-gray-400">{icon}</span>
                        <p>{text}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ CATALOG TAB ═══════════════════════════════════════════ */}
          <TabsContent value="catalog">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-amber-500" /> Product & Course Referral Links</CardTitle>
                <CardDescription>Generate specific links for each product or course — earn 15% on products, 10% on courses</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={catalogTab} onValueChange={setCatalogTab}>
                  <TabsList className="mb-5 bg-gray-100 rounded-xl p-1">
                    <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                      <ShoppingBag className="w-3.5 h-3.5" /> Products <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">15%</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="courses" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                      <BookOpen className="w-3.5 h-3.5" /> Courses <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[10px]">10%</Badge>
                    </TabsTrigger>
                  </TabsList>

                  {/* Products */}
                  <TabsContent value="products">
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="mb-4 rounded-xl"
                    />
                    {productsLoading ? (
                      <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">No products found</div>
                    ) : (
                      <div className="space-y-3">
                        {filteredProducts.map((p) => {
                          const link = getProductLink(p.id);
                          return (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-amber-50 transition-colors group">
                              {p.featuredImage ? (
                                <img src={p.featuredImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-5 h-5 text-amber-500" /></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                                <p className="text-xs text-gray-500">${parseFloat(p.price as string).toFixed(2)} — <span className="text-amber-600 font-semibold">earn ${(parseFloat(p.price as string) * 0.15).toFixed(2)} (15%)</span></p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => copyText(link, `${p.title} referral link`, toast)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-all"
                                >
                                  <Copy className="w-3 h-3" /> Copy Link
                                </button>
                                <a href={`/shop/product/${p.id}`} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                              <button
                                onClick={() => copyText(link, `${p.title} referral link`, toast)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-all sm:hidden"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Courses */}
                  <TabsContent value="courses">
                    <Input
                      placeholder="Search courses..."
                      value={courseSearch}
                      onChange={e => setCourseSearch(e.target.value)}
                      className="mb-4 rounded-xl"
                    />
                    {coursesLoading ? (
                      <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">No courses found</div>
                    ) : (
                      <div className="space-y-3">
                        {filteredCourses.map((c) => {
                          const link = getCourseLink(c.id);
                          return (
                            <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-purple-50 transition-colors group">
                              {c.thumbnail ? (
                                <img src={c.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0"><BookOpen className="w-5 h-5 text-purple-500" /></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                                <p className="text-xs text-gray-500">${parseFloat(c.price as string || "0").toFixed(2)} — <span className="text-purple-600 font-semibold">earn ${(parseFloat(c.price as string || "0") * 0.10).toFixed(2)} (10%)</span></p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => copyText(link, `${c.title} referral link`, toast)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all"
                                >
                                  <Copy className="w-3 h-3" /> Copy Link
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ EARNINGS TAB ══════════════════════════════════════════ */}
          <TabsContent value="earnings">
            <div className="max-w-2xl mx-auto space-y-6">

              {/* Balance card */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-8 text-white">
                  <p className="text-emerald-100 text-sm font-medium mb-2">Total Referral Earnings</p>
                  <p className="text-5xl font-black mb-1">${totalEarnings.toFixed(2)}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl">
                      <Clock className="w-3.5 h-3.5" /> Pending: <strong>${pendingEarnings.toFixed(2)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl">
                      <CheckCircle className="w-3.5 h-3.5" /> Paid: <strong>${parseFloat(analytics?.paidCommissions || "0").toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
                <CardContent className="pt-5">
                  {!showPayoutForm ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => setShowPayoutForm(true)}
                        disabled={pendingEarnings < 10}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1"
                      >
                        <Wallet className="w-4 h-4" /> Request Payout
                      </Button>
                      {pendingEarnings < 10 && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Minimum payout: $10
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Amount to withdraw ($)</label>
                        <Input
                          type="number"
                          value={payoutAmount}
                          onChange={e => setPayoutAmount(e.target.value)}
                          placeholder={`Max: $${pendingEarnings.toFixed(2)}`}
                          max={pendingEarnings}
                          min={10}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Payment details / note</label>
                        <Textarea
                          value={payoutNote}
                          onChange={e => setPayoutNote(e.target.value)}
                          placeholder="e.g. USDT TRC20: THxxx... or your bank account details"
                          className="rounded-xl"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => payoutMutation.mutate({ amount: payoutAmount, note: payoutNote })}
                          disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) < 10 || parseFloat(payoutAmount) > pendingEarnings}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                        >
                          {payoutMutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowPayoutForm(false)} className="flex-1">Cancel</Button>
                      </div>
                      <p className="text-xs text-gray-500 flex items-start gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        Admin will review and process your request within 3-5 business days
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Commission history */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" /> All Commissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {commissionsLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : commissions.length === 0 ? (
                    <div className="text-center py-10">
                      <DollarSign className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No commissions yet — start sharing your links!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {commissions.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.itemType === "product" ? "bg-amber-100" : c.itemType === "course" ? "bg-purple-100" : "bg-blue-100"}`}>
                            {c.itemType === "product" ? <ShoppingBag className="w-3.5 h-3.5 text-amber-600" /> : c.itemType === "course" ? <BookOpen className="w-3.5 h-3.5 text-purple-600" /> : <Users className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{c.itemTitle || `${c.itemType} commission`}</p>
                            <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-green-600">+${parseFloat(c.commissionAmount).toFixed(2)}</p>
                            <CommissionBadge status={c.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ STRATEGIES TAB ════════════════════════════════════════ */}
          <TabsContent value="strategies">
            <div className="space-y-8">
              {/* Strategy cards */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Proven Strategies to Maximize Your Earnings</h2>
                <p className="text-gray-500 text-sm mb-6">Top earners use a mix of these strategies. Start with 2-3 that fit your platform.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {STRATEGIES.map((s) => (
                    <Card key={s.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-5">
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-3 shadow-sm`}>
                          {s.icon}
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1.5">{s.title}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Content ideas */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">🎯 Content Ideas That Convert</CardTitle>
                  <CardDescription>Use these angle for blog posts, videos, and social content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "\"How I earned $X in a month with influencer marketing\" — authenticity converts",
                      "\"Best platforms for influencers in [your country] in 2025\" — SEO gold",
                      "\"Taskdrip vs [Competitor]: Honest review after 3 months\" — high buyer intent",
                      "\"How brands find influencers: Inside Taskdrip's campaign system\" — brand-facing content",
                      "\"How to make money as a micro-influencer (under 10K followers)\" — high search volume",
                      "\"BreedSkool course review: Did I actually learn anything?\" — course referral plays",
                      "\"5 ways to earn passive income as a content creator in 2025\" — broad reach",
                      "\"How to build an income stream from your social media following\" — aspirational content",
                    ].map((idea, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 bg-purple-50 rounded-xl">
                        <span className="text-purple-500 font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <p className="text-xs text-gray-700 leading-relaxed">{idea}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* FAQ */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  {FAQS.map((faq) => (
                    <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ═══ SOCIAL PROOF — REVIEWS ══════════════════════════════════ */}
        <div className="mt-16 mb-8">
          <div className="text-center mb-8">
            <Badge className="mb-3 px-4 py-1.5 bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold rounded-full">
              Real Results
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">What Our Top Referrers Say</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Creators and marketers from 50+ countries are earning passive income through the Taskdrip affiliate program</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEMO_REVIEWS.map((review) => (
              <Card key={review.name} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      ))}
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] font-bold">Earned {review.earnings}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={review.avatar} />
                      <AvatarFallback>{review.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{review.name}</p>
                      <p className="text-xs text-gray-500">{review.type} · {review.country}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ BOTTOM CTA ═══════════════════════════════════════════════ */}
        <div className="mt-8 mb-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 px-6 sm:px-10 py-10 sm:py-12 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-white text-xl sm:text-2xl font-black mb-2">Ready to start earning?</h3>
                <p className="text-gray-300 text-sm">Copy your link, share it with your audience, and watch commissions roll in.</p>
              </div>
              {userLink && (
                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Button
                    onClick={() => copyText(userLink, "Referral link", toast)}
                    className="bg-white text-black hover:bg-gray-100 gap-2 font-bold"
                  >
                    <Copy className="w-4 h-4" /> Copy My Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("catalog")}
                    className="border-white/30 text-white hover:bg-white/10 gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> Browse Catalog
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
