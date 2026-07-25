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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Copy, Share2, Users, Trophy, Gift, ChevronRight, Link as LinkIcon,
  TrendingUp, MessageCircle, DollarSign, Activity, CheckCircle, Clock,
  ExternalLink, Star, ChevronDown, ChevronUp, Zap, BookOpen, ShoppingBag,
  MousePointerClick, BarChart3, Wallet, ArrowRight, Globe, Sparkles,
  Target, Shield, BadgeCheck, AlertCircle, UserPlus, UserCheck,
  Send, Network, Calendar, MapPin, Search, Flame, Crown, TrendingDown,
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
interface NetworkMember {
  referralId: string;
  joinedAt: string;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username?: string;
    profileImageUrl?: string;
    userType?: string;
    creatorTier?: string;
    country?: string;
    totalPoints?: number;
    followers?: number;
  };
  isFollowing: boolean;
  stats: {
    totalEarned: string;
    pendingEarned: string;
    commissionsCount: number;
    isActive: boolean;
  };
}
interface NetworkData {
  members: NetworkMember[];
  clanStats: {
    totalMembers: number;
    activeMembers: number;
    totalClanEarnings: string;
  };
  timeline: { date: string; clicks: number }[];
  totalClicks: number;
}

/* ─── Demo Reviews ──────────────────────────────────────────────────── */
const DEMO_REVIEWS = [
  {
    name: "Amara Diallo", country: "🇬🇭 Ghana",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&q=80",
    rating: 5, earnings: "$340", type: "Influencer",
    text: "I started sharing my referral link on TikTok and made over $340 in commissions in my first month. The course referral rate at 10% is incredible — I promoted BreedSkool and three people enrolled the same week!",
  },
  {
    name: "Carlos Mendoza", country: "🇲🇽 Mexico",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80",
    rating: 5, earnings: "$510", type: "Content Creator",
    text: "The product referral at 15% is the best commission rate I've seen on any platform. I wrote a blog post comparing influencer marketing tools and linked my referral code — passive income every month since.",
  },
  {
    name: "Priya Sharma", country: "🇮🇳 India",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
    rating: 5, earnings: "$280", type: "YouTuber",
    text: "My YouTube channel has 45K subscribers interested in digital marketing. I made a dedicated video about Taskdrip and my referral link in the description has brought in 12 paid users so far. This really works!",
  },
  {
    name: "Mohammed Al-Rashid", country: "🇦🇪 UAE",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
    rating: 5, earnings: "$620", type: "Community Manager",
    text: "I manage a Telegram group for digital entrepreneurs in the Gulf region. Every time a member buys a product or course through my link, I earn automatically. No extra work needed once the setup is done.",
  },
  {
    name: "Sofia Rossi", country: "🇮🇹 Italy",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80",
    rating: 5, earnings: "$890", type: "Brand Consultant",
    text: "Running a fashion and lifestyle brand consultancy, I recommended Taskdrip to 3 client brands. Each brand spent on campaigns and I earned 5% of every transaction. Best passive income stream I've found.",
  },
  {
    name: "Kwame Asante", country: "🇳🇬 Nigeria",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80",
    rating: 5, earnings: "$195", type: "Social Media Manager",
    text: "I was skeptical at first but tried anyway. Posted my referral link in three WhatsApp groups and 8 people signed up within 48 hours. Two enrolled in BreedSkool courses — earned ₦85,000 equivalent in commissions!",
  },
];

const FAQS = [
  { q: "How do I earn referral commissions?", a: "You earn automatically when someone signs up using your referral link and makes a purchase. 5% for user transactions, 10% when they buy a course, and 15% when they buy a product from the shop. All commissions are tracked in real-time." },
  { q: "When are commissions paid out?", a: "Commissions accumulate in your referral earnings balance and can be requested at any time via the 'Request Payout' button. Admin processes payouts within 3-5 business days to your preferred payment method." },
  { q: "What is my unique referral link?", a: "Your primary referral link uses your username (e.g., taskdrip.com/signup?ref=yourname). This is the easiest to remember and share. You can also generate specific product and course links from the catalog tab." },
  { q: "Is there a limit on how much I can earn?", a: "No limits. The more users you refer and the more products/courses they buy, the more you earn. Top referrers on our platform have earned over $2,000/month in passive commissions alone." },
  { q: "How do I share most effectively?", a: "Create content that genuinely helps your audience — tutorials, reviews, comparison articles, YouTube videos. Embedded referral links in helpful content convert at 3–7x higher rates than bare link shares." },
  { q: "Can I follow and message my referrals?", a: "Yes! From the 'My Network' tab you can see all users who signed up through your link, follow them, and send them a direct message. Build a community from your referrals — support them and earn together." },
  { q: "What happens if someone clears their cookies before purchasing?", a: "We track referrals by account — when a user signs up through your link, they're linked to your referral code permanently. Any purchase they make on the platform within 90 days earns you the commission." },
  { q: "Are there any products or courses I cannot earn commission on?", a: "Commission is available on all active products and courses. Some promotional or deeply discounted items may have reduced rates — this is indicated on the item listing." },
];

const STRATEGIES = [
  { icon: <BookOpen className="w-5 h-5" />, color: "from-blue-500 to-indigo-600", title: "Write In-Depth Reviews", desc: "Blog posts comparing influencer platforms consistently rank on Google. A single review article can generate passive clicks for years. Include your referral link in the CTA." },
  { icon: <Globe className="w-5 h-5" />, color: "from-purple-500 to-pink-600", title: "Share on Crypto & Web3 Platforms", desc: "Post on X (Twitter), Reddit crypto communities, and Telegram groups. TDRIP points and Web3 features resonate with the crypto community." },
  { icon: <Users className="w-5 h-5" />, color: "from-emerald-500 to-teal-600", title: "Build a WhatsApp / Telegram Community", desc: "Create a group for digital entrepreneurs, influencers, or brand managers in your niche. Share Taskdrip resources regularly and include your referral link in the group description." },
  { icon: <TrendingUp className="w-5 h-5" />, color: "from-orange-500 to-amber-600", title: "YouTube Tutorials & How-To Videos", desc: "Record tutorials showing how to use Taskdrip features. Put your referral link in the description. YouTube videos about earning platforms get high intent traffic." },
  { icon: <Zap className="w-5 h-5" />, color: "from-yellow-500 to-orange-600", title: "Email Newsletters", desc: "If you have an email list, a single dedicated send about Taskdrip can bring in dozens of signups. Personalize the email — explain why you use it and what you've earned." },
  { icon: <Target className="w-5 h-5" />, color: "from-rose-500 to-pink-600", title: "Refer Brands Directly", desc: "Brands that run campaigns spend real money. One brand referral that spends $5,000 on campaigns earns you $250 (5%). Focus on agency owners, marketing managers, and startup founders." },
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button className="w-full flex items-center justify-between py-4 text-left text-sm font-semibold text-gray-800 hover:text-purple-700 transition-colors gap-4" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-purple-500" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />}
      </button>
      {open && <p className="text-sm text-gray-600 pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

/* ─── Click Timeline Mini-Chart ─────────────────────────────────────── */
function ClickTimeline({ timeline }: { timeline: { date: string; clicks: number }[] }) {
  const last14 = timeline.slice(-14);
  const maxClicks = Math.max(...last14.map(d => d.clicks), 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-16">
        {last14.map((d) => {
          const pct = Math.max((d.clicks / maxClicks) * 100, d.clicks > 0 ? 8 : 2);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {d.clicks} click{d.clicks !== 1 ? 's' : ''}<br />{d.date.slice(5)}
              </div>
              <div
                className={`w-full rounded-t-sm transition-all ${d.clicks > 0 ? 'bg-purple-500 group-hover:bg-purple-600' : 'bg-gray-100'}`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>{last14[0]?.date.slice(5)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/* ─── Network Member Card ────────────────────────────────────────────── */
function NetworkMemberCard({
  member,
  onFollow,
  onMessage,
  followLoading,
}: {
  member: NetworkMember;
  onFollow: (id: string, isFollowing: boolean) => void;
  onMessage: (member: NetworkMember) => void;
  followLoading: string | null;
}) {
  const [, navigate] = useLocation();
  const u = member.user;
  const profilePath = u.username ? `/influencers/${u.username}` : `/user-profile?id=${u.id}`;
  const displayName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Anonymous';
  const initials = (u.firstName?.[0] || '') + (u.lastName?.[0] || '') || '?';

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all group">
      {/* Avatar */}
      <button onClick={() => navigate(profilePath)} className="flex-shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-purple-300 transition-all">
          <AvatarImage src={u.profileImageUrl} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button onClick={() => navigate(profilePath)} className="text-sm font-bold text-gray-900 hover:text-purple-700 transition-colors truncate block text-left">
              {displayName}
            </button>
            {u.username && (
              <p className="text-xs text-purple-600 font-medium">@{u.username}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Activity badge */}
            {member.stats.isActive ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] gap-1">
                <Flame className="w-2.5 h-2.5" /> Active
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-[10px]">New</Badge>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {u.userType && (
            <span className="capitalize">{u.userType}</span>
          )}
        </div>

        {/* Earnings from this member */}
        {member.stats.commissionsCount > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1">
              <DollarSign className="w-3 h-3 text-green-600" />
              <span className="text-xs font-bold text-green-700">${member.stats.totalEarned} earned</span>
              <span className="text-[10px] text-green-500">({member.stats.commissionsCount} commission{member.stats.commissionsCount !== 1 ? 's' : ''})</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant={member.isFollowing ? "outline" : "default"}
            className={`h-7 text-xs gap-1.5 rounded-full flex-1 max-w-[120px] ${member.isFollowing
              ? "border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600"
              : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
            disabled={followLoading === u.id}
            onClick={() => onFollow(u.id, member.isFollowing)}
          >
            {followLoading === u.id ? (
              <span className="animate-pulse">...</span>
            ) : member.isFollowing ? (
              <><UserCheck className="w-3 h-3" /> Following</>
            ) : (
              <><UserPlus className="w-3 h-3" /> Follow</>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 rounded-full border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
            onClick={() => onMessage(member)}
          >
            <MessageCircle className="w-3 h-3" /> Message
          </Button>
          <a
            href={profilePath}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 w-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-600 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function ReferralsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const u = user as any;

  const [activeTab, setActiveTab] = useState("overview");
  const [catalogTab, setCatalogTab] = useState("products");
  const [productSearch, setProductSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [networkSearch, setNetworkSearch] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [messagingMember, setMessagingMember] = useState<NetworkMember | null>(null);
  const [messageText, setMessageText] = useState("");
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  /* ─── Queries ─────────────────────────────────────────────────────── */
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

  const { data: networkData, isLoading: networkLoading, refetch: refetchNetwork } = useQuery<NetworkData>({
    queryKey: ["/api/referrals/network"],
    enabled: !!isAuthenticated,
    staleTime: 30000,
  });

  /* ─── Mutations ──────────────────────────────────────────────────── */
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
      setPayoutAmount(""); setPayoutNote("");
      qc.invalidateQueries({ queryKey: ["/api/referrals/analytics"] });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("{") ? JSON.parse(e.message)?.message : e.message;
      toast({ title: "Request Failed", description: msg || "Could not submit payout request.", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { receiverId: string; content: string; subject: string }) =>
      apiRequest("POST", "/api/messages", data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Message Sent!", description: "Your message has been sent. View it in Messages." });
      setMessagingMember(null);
      setMessageText("");
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Could not send message. Try again.", variant: "destructive" });
    },
  });

  const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    setFollowLoading(targetUserId);
    try {
      await apiRequest("POST", `/api/users/${targetUserId}/follow`);
      toast({
        title: isCurrentlyFollowing ? "Unfollowed" : "Now Following!",
        description: isCurrentlyFollowing ? "You unfollowed this user." : "You're now following this user.",
      });
      refetchNetwork();
    } catch (err) {
      toast({ title: "Error", description: "Could not update follow status.", variant: "destructive" });
    } finally {
      setFollowLoading(null);
    }
  };

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

  /* ─── Computed ────────────────────────────────────────────────────── */
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://taskdrip.com";
  const primaryCode = analytics?.primaryCode || u?.username || "";
  const userLink = primaryCode ? `${baseUrl}/signup?ref=${primaryCode}` : null;
  const totalEarnings = parseFloat(analytics?.totalCommissions || "0") + parseFloat(analytics?.legacyBonusEarned || "0");
  const pendingEarnings = parseFloat(analytics?.pendingCommissions || "0");
  const myRank = (referralLeaders as any[]).findIndex((l: any) => l.id === u?.id);

  const getProductLink = (id: string) => primaryCode ? `${baseUrl}/shop/product/${id}?ref=${primaryCode}` : `${baseUrl}/shop/product/${id}`;
  const getCourseLink = (id: string) => primaryCode ? `${baseUrl}/breedskool/${id}?ref=${primaryCode}` : `${baseUrl}/breedskool/${id}`;

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()));

  const filteredMembers = (networkData?.members || []).filter(m => {
    const q = networkSearch.toLowerCase();
    if (!q) return true;
    const name = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
    const username = (m.user.username || '').toLowerCase();
    return name.includes(q) || username.includes(q);
  });

  const timeline = networkData?.timeline || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden min-h-[420px] sm:min-h-[480px] flex items-center">
        <img
          src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=1800&q=85&auto=format&fit=crop"
          alt="" className="absolute inset-0 w-full h-full object-cover object-center" loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-purple-950/80 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
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
              Build your clan. Grow together. No cap. No expiry.
            </p>

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

      {/* ═══ CONTENT ════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <MousePointerClick className="h-5 w-5 text-white" />, bg: "bg-blue-600", label: "Total Clicks", value: analyticsLoading ? null : analytics?.totalClicks ?? 0, color: "text-gray-900" },
            { icon: <Users className="h-5 w-5 text-white" />, bg: "bg-purple-600", label: "Signups", value: analyticsLoading ? null : analytics?.totalSignups ?? 0, color: "text-gray-900" },
            { icon: <CheckCircle className="h-5 w-5 text-white" />, bg: "bg-emerald-600", label: "Conversions", value: analyticsLoading ? null : analytics?.conversions ?? 0, color: "text-gray-900" },
            { icon: <DollarSign className="h-5 w-5 text-white" />, bg: "bg-amber-500", label: "Total Earned", value: analyticsLoading ? null : `$${totalEarnings.toFixed(2)}`, color: "text-green-600" },
          ].map(({ icon, bg, label, value, color }) => (
            <Card key={label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`${bg} rounded-xl p-2.5 flex-shrink-0`}>{icon}</div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    {value === null ? <Skeleton className="h-7 w-14 mt-1" /> : <p className={`text-2xl font-black ${color}`}>{value}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-gray-200 rounded-2xl p-1 shadow-sm mb-6 gap-0.5 flex-wrap h-auto">
            {[
              { v: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
              { v: "network", label: "My Network", icon: <Network className="w-4 h-4" />, badge: networkData?.clanStats.totalMembers },
              { v: "links", label: "My Links", icon: <LinkIcon className="w-4 h-4" /> },
              { v: "catalog", label: "Catalog", icon: <ShoppingBag className="w-4 h-4" /> },
              { v: "earnings", label: "Earnings", icon: <Wallet className="w-4 h-4" /> },
              { v: "strategies", label: "Strategies", icon: <Target className="w-4 h-4" /> },
            ].map(({ v, label, icon, badge }) => (
              <TabsTrigger key={v} value={v} className="rounded-xl text-xs sm:text-sm gap-1.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white relative">
                {icon} {label}
                {badge !== undefined && badge > 0 && (
                  <span className="ml-1 bg-purple-100 text-purple-700 data-[state=active]:bg-white/20 data-[state=active]:text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══ OVERVIEW TAB ════════════════════════════════════════ */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">

                {/* Click Timeline */}
                {timeline.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <MousePointerClick className="h-4 w-4 text-purple-500" /> Link Clicks (Last 14 Days)
                        </CardTitle>
                        <span className="text-xs text-gray-500">{networkData?.totalClicks ?? 0} total</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ClickTimeline timeline={timeline} />
                    </CardContent>
                  </Card>
                )}

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

                {/* Recent commissions */}
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

              {/* Right col */}
              <div className="space-y-6">
                {/* Clan snapshot */}
                {networkData && (
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-5 py-5 text-white">
                      <p className="text-purple-200 text-xs font-semibold uppercase tracking-wide mb-2">Your Clan</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-2xl font-black">{networkData.clanStats.totalMembers}</p>
                          <p className="text-[10px] text-purple-200">Members</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black">{networkData.clanStats.activeMembers}</p>
                          <p className="text-[10px] text-purple-200">Active</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black">${networkData.clanStats.totalClanEarnings}</p>
                          <p className="text-[10px] text-purple-200">Earned</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 rounded-xl"
                        onClick={() => setActiveTab("network")}
                      >
                        <Network className="w-3.5 h-3.5" /> View My Network
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Commission rates */}
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

          {/* ═══ MY NETWORK TAB ══════════════════════════════════════ */}
          <TabsContent value="network">
            <div className="space-y-6">

              {/* Clan header */}
              <div className="bg-gradient-to-r from-purple-600 via-indigo-700 to-violet-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-10 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-purple-200 text-sm font-semibold">Your Referral Clan</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black mb-4">
                    {u?.firstName}'s Network
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 mb-4">
                    {[
                      { label: "Total Members", value: networkData?.clanStats.totalMembers ?? 0, icon: <Users className="w-4 h-4" /> },
                      { label: "Active Members", value: networkData?.clanStats.activeMembers ?? 0, icon: <Flame className="w-4 h-4" /> },
                      { label: "Earned from Clan", value: `$${networkData?.clanStats.totalClanEarnings ?? '0.00'}`, icon: <DollarSign className="w-4 h-4" /> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 text-center">
                        <div className="flex items-center justify-center mb-1 text-purple-200">{icon}</div>
                        <p className="text-xl sm:text-2xl font-black">{value}</p>
                        <p className="text-[10px] sm:text-xs text-purple-200 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-purple-200 text-sm">
                    Follow your referrals, send them messages, and grow your clan. Every active member in your network brings you closer to passive income.
                  </p>
                </div>
              </div>

              {/* Link performance strip */}
              {timeline.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-500" /> Link Views & Clicks — Last 14 Days
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{networkData?.totalClicks ?? 0} total clicks</span>
                        <span>·</span>
                        <span>{analytics?.totalSignups ?? 0} signups</span>
                        <span>·</span>
                        <span>{analytics?.conversions ?? 0} conversions</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ClickTimeline timeline={timeline} />
                    {/* Conversion funnel pills */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {[
                        { label: "Clicks", value: networkData?.totalClicks ?? 0, color: "bg-blue-100 text-blue-700" },
                        { label: "→ Signups", value: analytics?.totalSignups ?? 0, color: "bg-purple-100 text-purple-700" },
                        { label: "→ Paid", value: analytics?.conversions ?? 0, color: "bg-green-100 text-green-700" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${color}`}>
                          {label}: <strong>{value}</strong>
                          {label !== "Clicks" && (networkData?.totalClicks ?? 0) > 0 && (
                            <span className="opacity-60">({Math.round((value / (networkData?.totalClicks ?? 1)) * 100)}%)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Member list */}
              <div>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">All Members</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Users who joined Taskdrip through your referral link</p>
                  </div>
                  {(networkData?.members.length ?? 0) > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search members..."
                        value={networkSearch}
                        onChange={e => setNetworkSearch(e.target.value)}
                        className="pl-9 w-56 rounded-xl h-9 text-sm"
                      />
                    </div>
                  )}
                </div>

                {networkLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-16 text-center">
                      <Network className="h-14 w-14 text-gray-200 mx-auto mb-4" />
                      {networkSearch ? (
                        <>
                          <p className="text-gray-600 font-semibold">No results for "{networkSearch}"</p>
                          <p className="text-gray-400 text-sm mt-1">Try a different name or username</p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 font-bold text-lg mb-2">Your clan is empty</p>
                          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
                            Share your referral link with your audience and every person who signs up will appear here.
                            You can follow them, message them, and watch your network grow.
                          </p>
                          {userLink && (
                            <Button
                              onClick={() => copyText(userLink, "Referral link", toast)}
                              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                            >
                              <Copy className="w-4 h-4" /> Copy My Referral Link
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMembers.map((member) => (
                      <NetworkMemberCard
                        key={member.referralId}
                        member={member}
                        onFollow={handleFollow}
                        onMessage={setMessagingMember}
                        followLoading={followLoading}
                      />
                    ))}
                  </div>
                )}

                {/* Follow all CTA */}
                {(filteredMembers.filter(m => !m.isFollowing).length > 1) && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-100 text-sm text-purple-700 flex items-center gap-3">
                    <UserPlus className="w-4 h-4 flex-shrink-0" />
                    <span><strong>{filteredMembers.filter(m => !m.isFollowing).length} members</strong> you haven't followed yet. Follow them to stay connected and appear in their followers list.</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══ LINKS TAB ═══════════════════════════════════════════ */}
          <TabsContent value="links">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-5">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Your Primary Referral Link</h3>
                  <p className="text-purple-200 text-sm mt-1">Your username-based link — the easiest to remember and share anywhere</p>
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
                  ) : <Skeleton className="h-16 w-full" />}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">How Referrals Work</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { n: 1, text: "Copy your unique referral link above", icon: <Copy className="w-3.5 h-3.5" /> },
                    { n: 2, text: "Share it on social media, in articles, or via direct message", icon: <Share2 className="w-3.5 h-3.5" /> },
                    { n: 3, text: "When someone signs up through your link, they join your Network permanently", icon: <Network className="w-3.5 h-3.5" /> },
                    { n: 4, text: "Follow your referrals, message them, and build your clan from the My Network tab", icon: <Users className="w-3.5 h-3.5 text-purple-600" /> },
                    { n: 5, text: "Earn 5% on their transactions, 10% on courses, 15% on products — automatically", icon: <DollarSign className="w-3.5 h-3.5 text-green-600" /> },
                    { n: 6, text: "Request payout anytime from the Earnings tab", icon: <Wallet className="w-3.5 h-3.5 text-amber-600" /> },
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

          {/* ═══ CATALOG TAB ═════════════════════════════════════════ */}
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
                  <TabsContent value="products">
                    <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="mb-4 rounded-xl" />
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
                              <button onClick={() => copyText(link, `${p.title} referral link`, toast)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-all flex-shrink-0">
                                <Copy className="w-3 h-3" /> Copy Link
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="courses">
                    <Input placeholder="Search courses..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)} className="mb-4 rounded-xl" />
                    {coursesLoading ? (
                      <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">No courses found</div>
                    ) : (
                      <div className="space-y-3">
                        {filteredCourses.map((c) => {
                          const link = getCourseLink(c.id);
                          return (
                            <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-purple-50 transition-colors">
                              {c.thumbnail ? (
                                <img src={c.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0"><BookOpen className="w-5 h-5 text-purple-500" /></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                                <p className="text-xs text-gray-500">${parseFloat(c.price as string || "0").toFixed(2)} — <span className="text-purple-600 font-semibold">earn ${(parseFloat(c.price as string || "0") * 0.10).toFixed(2)} (10%)</span></p>
                              </div>
                              <button onClick={() => copyText(link, `${c.title} referral link`, toast)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all flex-shrink-0">
                                <Copy className="w-3 h-3" /> Copy Link
                              </button>
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

          {/* ═══ EARNINGS TAB ════════════════════════════════════════ */}
          <TabsContent value="earnings">
            <div className="max-w-2xl mx-auto space-y-6">
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
                      <Button onClick={() => setShowPayoutForm(true)} disabled={pendingEarnings < 10} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1">
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
                        <Input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder={`Max: $${pendingEarnings.toFixed(2)}`} max={pendingEarnings} min={10} className="rounded-xl" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Payment details / note</label>
                        <Textarea value={payoutNote} onChange={e => setPayoutNote(e.target.value)} placeholder="e.g. USDT TRC20: THxxx... or your bank account details" className="rounded-xl" rows={3} />
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

          {/* ═══ STRATEGIES TAB ══════════════════════════════════════ */}
          <TabsContent value="strategies">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Proven Strategies to Maximize Your Earnings</h2>
                <p className="text-gray-500 text-sm mb-6">Top earners use a mix of these strategies. Start with 2-3 that fit your platform.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {STRATEGIES.map((s) => (
                    <Card key={s.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-5">
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-3 shadow-sm`}>{s.icon}</div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1.5">{s.title}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">🎯 Content Ideas That Convert</CardTitle>
                  <CardDescription>Use these angles for blog posts, videos, and social content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      '"How I earned $X in a month with influencer marketing" — authenticity converts',
                      '"Best platforms for influencers in [your country] in 2025" — SEO gold',
                      '"Taskdrip vs [Competitor]: Honest review after 3 months" — high buyer intent',
                      '"How brands find influencers: Inside Taskdrip\'s campaign system" — brand-facing',
                      '"How to make money as a micro-influencer (under 10K followers)" — high search volume',
                      '"BreedSkool course review: Did I actually learn anything?" — course referral plays',
                      '"5 ways to earn passive income as a content creator in 2025" — broad reach',
                      '"How to build an income stream from your social media following" — aspirational',
                    ].map((idea, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 bg-purple-50 rounded-xl">
                        <span className="text-purple-500 font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <p className="text-xs text-gray-700 leading-relaxed">{idea}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Frequently Asked Questions</CardTitle></CardHeader>
                <CardContent>{FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}</CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Reviews */}
        <div className="mt-16 mb-8">
          <div className="text-center mb-8">
            <Badge className="mb-3 px-4 py-1.5 bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold rounded-full">Real Results</Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">What Our Top Referrers Say</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Creators and marketers from 50+ countries are earning passive income through the Taskdrip affiliate program</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEMO_REVIEWS.map((review) => (
              <Card key={review.name} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" />)}
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

        {/* Bottom CTA */}
        <div className="mt-8 mb-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 px-6 sm:px-10 py-10 sm:py-12 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-white text-xl sm:text-2xl font-black mb-2">Ready to grow your clan?</h3>
                <p className="text-gray-300 text-sm">Share your link, watch members join, follow them, and earn from every purchase they make.</p>
              </div>
              {userLink && (
                <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Button onClick={() => copyText(userLink, "Referral link", toast)} className="bg-white text-black hover:bg-gray-100 gap-2 font-bold">
                    <Copy className="w-4 h-4" /> Copy My Link
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("network")} className="border-white/30 text-white hover:bg-white/10 gap-2">
                    <Network className="w-4 h-4" /> View My Network
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Message Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!messagingMember} onOpenChange={(open) => { if (!open) { setMessagingMember(null); setMessageText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {messagingMember && (
                <>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={messagingMember.user.profileImageUrl} />
                    <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-bold">
                      {(messagingMember.user.firstName?.[0] || '') + (messagingMember.user.lastName?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">{messagingMember.user.firstName} {messagingMember.user.lastName}</p>
                    {messagingMember.user.username && <p className="text-xs text-gray-500 font-normal">@{messagingMember.user.username}</p>}
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription>Send a direct message to your referral</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder={`Hey ${messagingMember?.user.firstName}, welcome to Taskdrip! I referred you here and I'd love to help you get started...`}
              rows={5}
              className="rounded-xl resize-none"
            />
            <div className="flex gap-3">
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white flex-1 gap-2"
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                onClick={() => {
                  if (!messagingMember || !messageText.trim()) return;
                  sendMessageMutation.mutate({
                    receiverId: messagingMember.user.id,
                    content: messageText.trim(),
                    subject: `Message from ${u?.firstName}`,
                  });
                }}
              >
                {sendMessageMutation.isPending ? (
                  <span className="animate-pulse">Sending...</span>
                ) : (
                  <><Send className="w-4 h-4" /> Send Message</>
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/chat")} className="gap-2">
                <MessageCircle className="w-4 h-4" /> Open Chat
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center">Message will appear in their Messages inbox</p>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
