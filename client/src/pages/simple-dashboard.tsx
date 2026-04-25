import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { WelcomeCampaign } from "@/components/ui/welcome-campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, TrendingUp, Trophy, Clock, User, DollarSign, Target, Share2, Copy,
  Users, ShoppingBag, Package, CheckCircle, AlertCircle, Truck, Zap, Star, Crown, Medal,
  Briefcase, ChevronRight, Sparkles, LayoutDashboard, MessageSquare, Settings,
  Store, ArrowUpRight, Globe, BookOpen, Shield, Coins, Send, Bell, LogOut,
  RefreshCw, FileText, ChevronDown, ChevronUp, ExternalLink, Layers, Activity, Search, Link2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { DashboardSpotlight } from "@/components/DashboardSpotlight";

// ── Level helpers ──────────────────────────────────────────────────────────────
function getLevelConfig(level: string) {
  switch (level) {
    case "Elite":      return { color: "from-yellow-400 to-orange-500", badge: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "👑", next: null,       min: 50000 };
    case "Authority":  return { color: "from-orange-400 to-red-500",    badge: "bg-orange-100 text-orange-700 border-orange-300",  icon: "🔥", next: "Elite",     min: 10000, max: 50000 };
    case "Influencer": return { color: "from-purple-500 to-indigo-600", badge: "bg-purple-100 text-purple-700 border-purple-300",  icon: "⚡", next: "Authority", min: 2000,  max: 10000 };
    case "Hustler":    return { color: "from-blue-500 to-cyan-500",     badge: "bg-blue-100 text-blue-700 border-blue-300",        icon: "💪", next: "Influencer",min: 500,   max: 2000 };
    default:           return { color: "from-gray-400 to-gray-600",     badge: "bg-gray-100 text-gray-700 border-gray-300",        icon: "🌱", next: "Hustler",   min: 0,     max: 500 };
  }
}

function fmt(v: any) { return parseFloat(v || 0).toFixed(2); }

// ── Status helpers ─────────────────────────────────────────────────────────────
const participationColors: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved:  "bg-blue-100 text-blue-800 border-blue-200",
  submitted: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  rejected:  "bg-red-100 text-red-800 border-red-200",
};
const participationLabels: Record<string, string> = {
  pending: "Applied", approved: "Approved", submitted: "Proof Sent",
  completed: "Paid ✓", rejected: "Rejected",
};
const hireStatusColors: Record<string, string> = {
  pending: "bg-green-100 text-green-800", accepted: "bg-blue-100 text-blue-800",
  rejected: "bg-gray-100 text-gray-500", active: "bg-emerald-100 text-emerald-800",
  work_submitted: "bg-indigo-100 text-indigo-800", completed: "bg-gray-100 text-gray-700",
};

// ── SEO Settings Card ──────────────────────────────────────────────────────────
function SeoSettingsCard({ user }: { user: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    seoTitle: user?.seoTitle || "",
    seoDescription: user?.seoDescription || "",
    seoKeywords: user?.seoKeywords || "",
    seoOgImage: user?.seoOgImage || "",
  });

  const seoMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("PATCH", "/api/user/seo", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SEO settings saved!" });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => toast({ title: "Failed to save SEO settings", variant: "destructive" }),
  });

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-purple-600" />
          <h3 className="font-bold text-gray-900">SEO & Discoverability</h3>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      <p className="text-xs text-gray-400 mt-1">Control how your profile appears in search engines and social shares.</p>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs text-gray-600 font-semibold">Meta Title</Label>
            <Input
              value={form.seoTitle}
              onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))}
              placeholder="e.g. John Doe — Fashion & Lifestyle Creator"
              className="mt-1 text-sm"
              data-testid="input-seo-title"
              maxLength={70}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">{form.seoTitle.length}/70 characters</p>
          </div>

          <div>
            <Label className="text-xs text-gray-600 font-semibold">Meta Description</Label>
            <Textarea
              value={form.seoDescription}
              onChange={e => setForm(f => ({ ...f, seoDescription: e.target.value }))}
              placeholder="A brief description of your profile for search engines…"
              className="mt-1 text-sm resize-none"
              rows={3}
              data-testid="input-seo-description"
              maxLength={160}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">{form.seoDescription.length}/160 characters</p>
          </div>

          <div>
            <Label className="text-xs text-gray-600 font-semibold">Keywords (comma-separated)</Label>
            <Input
              value={form.seoKeywords}
              onChange={e => setForm(f => ({ ...f, seoKeywords: e.target.value }))}
              placeholder="influencer, fashion, lifestyle, content creator"
              className="mt-1 text-sm"
              data-testid="input-seo-keywords"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600 font-semibold">Social Share Image URL (OG Image)</Label>
            <Input
              value={form.seoOgImage}
              onChange={e => setForm(f => ({ ...f, seoOgImage: e.target.value }))}
              placeholder="https://example.com/your-og-image.jpg"
              className="mt-1 text-sm"
              data-testid="input-seo-og-image"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Recommended: 1200×630 px image for best social sharing</p>
          </div>

          <Button
            onClick={() => seoMutation.mutate(form)}
            disabled={seoMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-9"
            data-testid="button-save-seo"
          >
            {seoMutation.isPending ? "Saving…" : "Save SEO Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Tab definition ─────────────────────────────────────────────────────────────
type Tab = "overview" | "campaigns" | "p2p" | "wallet" | "shop" | "profile";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview",   label: "Overview",        icon: LayoutDashboard },
  { id: "campaigns",  label: "Campaigns",        icon: Target },
  { id: "p2p",        label: "P2P & Escrow",     icon: Shield },
  { id: "wallet",     label: "Wallet & Payouts", icon: Wallet },
  { id: "shop",       label: "Shop & Orders",    icon: Store },
  { id: "profile",    label: "Profile",          icon: User },
];

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function SimpleDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const uid = (user as any)?.id;

  const { data: participations = [] } = useQuery<any[]>({
    queryKey: ["/api/users", uid, "participations"],
    enabled: !!uid,
  });
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/users", uid, "purchases"],
    enabled: !!uid,
  });
  const { data: activeCampaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
    select: (d: any[]) => d.filter((c: any) => c.status === "active"),
  });
  const { data: hireOffers = [] } = useQuery<any[]>({
    queryKey: ["/api/direct-hire/received"],
    enabled: !!uid,
  });
  const { data: referralData } = useQuery<any>({
    queryKey: ["/api/referrals/my"],
    enabled: !!uid,
  });
  const { data: p2pDeals = [] } = useQuery<any[]>({
    queryKey: ["/api/p2p/my-deals"],
    enabled: !!uid,
  });
  const { data: leaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/points"],
    enabled: !!uid,
  });

  const ensureCodesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/referrals/ensure-codes").then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/referrals/my"] }),
  });

  useEffect(() => {
    if (user && referralData && (!referralData.referralCodeCreator || !referralData.referralCodeBrand)) {
      ensureCodesMutation.mutate();
    }
  }, [user, referralData]);

  const rank = (leaderboard as any[]).findIndex((u: any) => u.id === uid) + 1;
  const rankTotal = (leaderboard as any[]).length;
  const points = (user as any)?.totalPoints || 0;
  const level = (user as any)?.level || "Starter";
  const cfg = getLevelConfig(level);
  const progressToNext = cfg.next && cfg.max ? Math.min(100, Math.round(((points - cfg.min) / (cfg.max - cfg.min)) * 100)) : 100;
  const availBal = parseFloat((user as any)?.availableBalance || "0");
  const pendBal  = parseFloat((user as any)?.pendingBalance  || "0");
  const totalEarned = parseFloat((user as any)?.totalEarned  || "0");
  const completedTasks = (user as any)?.completedCampaigns || 0;
  const pendingOffers = (hireOffers as any[]).filter((h: any) => h.status === "pending").length;

  const baseUrl = window.location.origin;
  const creatorLink = referralData?.referralCodeCreator ? `${baseUrl}/signup?ref=${referralData.referralCodeCreator}&type=creator` : null;
  const brandLink   = referralData?.referralCodeBrand   ? `${baseUrl}/signup?ref=${referralData.referralCodeBrand}&type=brand`    : null;
  const copyLink    = (text: string, label: string) => navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));

  const hasWallet = (user as any)?.usdtTronWallet || (user as any)?.usdtBscWallet || (user as any)?.tonWallet || (user as any)?.piWallet;

  // ── Profile banner ────────────────────────────────────────────────────────────
  const initials = `${(user as any)?.firstName?.[0] || ""}${(user as any)?.lastName?.[0] || ""}`.toUpperCase() || "U";
  const displayName = `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim() || (user as any)?.username || "Influencer";
  const tierLabel = (user as any)?.creatorTier || level;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Profile Header ───────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden mb-6 shadow-sm border border-gray-100">
          <div className={`h-24 bg-gradient-to-r ${cfg.color}`} />
          <div className="bg-white px-6 pb-5">
            <div className="flex items-end gap-4 -mt-10 flex-wrap">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg flex-shrink-0">
                <AvatarImage src={(user as any)?.profileImageUrl} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 mt-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{displayName}</h1>
                  {(user as any)?.isVerified && <span className="text-blue-500 text-sm">✓</span>}
                  <Badge className={`${cfg.badge} border text-xs`}>{cfg.icon} {tierLabel}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {(user as any)?.username ? `@${(user as any).username}` : (user as any)?.email}
                  {(user as any)?.niche ? ` · ${(user as any).niche}` : ""}
                </p>
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap items-center">
                <Link href="/profile-edit">
                  <Button variant="outline" size="sm" className="text-xs" data-testid="button-edit-profile">Edit Profile</Button>
                </Link>
                <Link href={`/profile/${uid}`}>
                  <Button variant="outline" size="sm" className="text-xs" data-testid="button-view-profile">
                    <ExternalLink className="h-3 w-3 mr-1" />View Public Profile
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  data-testid="button-logout"
                  onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/"; })}
                >
                  <LogOut className="h-3 w-3 mr-1" />Log Out
                </Button>
              </div>
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Followers",      value: ((user as any)?.totalFollowers || 0).toLocaleString(), icon: Users,    color: "text-blue-600" },
                { label: "Completed Tasks",value: completedTasks,                                         icon: CheckCircle, color: "text-green-600" },
                { label: "Rating",         value: `⭐ ${Number((user as any)?.rating || 0).toFixed(1)}`, icon: Star,     color: "text-yellow-600" },
                { label: "Total Earned",   value: `$${fmt(totalEarned)}`,                                 icon: DollarSign,  color: "text-purple-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <Icon className={`h-4 w-4 ${color} mx-auto mb-0.5`} />
                  <p className="font-bold text-gray-900 text-sm">{value}</p>
                  <p className="text-[10px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Spotlight & Featured ────────────────────────────────────────── */}
        <div className="mb-5">
          <DashboardSpotlight page="influencer_dashboard" />
        </div>

        {/* ── Alerts / Urgent Actions ──────────────────────────────────────── */}
        {(pendingOffers > 0 || !hasWallet) && (
          <div className="space-y-2 mb-5">
            {pendingOffers > 0 && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 flex-1 font-medium">You have <strong>{pendingOffers}</strong> new hire offer{pendingOffers > 1 ? "s" : ""} waiting for your response.</p>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => setTab("campaigns")}>View Offers</Button>
              </div>
            )}
            {!hasWallet && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <Wallet className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800 flex-1">Set up your crypto wallet to receive payments when tasks are approved.</p>
                <Link href="/wallet"><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs">Set Up Now</Button></Link>
              </div>
            )}
          </div>
        )}

        {/* ── Tab navigation ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Mobile tab selector */}
          <button
            className="sm:hidden w-full flex items-center justify-between px-4 py-3 border-b border-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="flex items-center gap-2">
              {(() => { const t = TABS.find(t => t.id === tab)!; return <><t.icon className="h-4 w-4 text-purple-600" /><span className="font-semibold text-sm">{t.label}</span></>; })()}
            </div>
            {mobileMenuOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {mobileMenuOpen && (
            <div className="sm:hidden border-b border-gray-100">
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setMobileMenuOpen(false); if (t.id === "shop") { setLocation("/my-orders"); } else { setTab(t.id); } }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${tab === t.id ? "bg-purple-50 text-purple-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                  <t.icon className="h-4 w-4" />{t.label}
                  {t.id === "campaigns" && pendingOffers > 0 && <Badge className="ml-auto bg-green-500 text-white text-[10px] border-0 h-4">{pendingOffers}</Badge>}
                </button>
              ))}
            </div>
          )}
          {/* Desktop tabs */}
          <div className="hidden sm:flex overflow-x-auto border-b border-gray-100 px-2">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { if (t.id === "shop") { setLocation("/my-orders"); } else { setTab(t.id); } }}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                data-testid={`tab-${t.id}`}
              >
                <t.icon className="h-4 w-4" />{t.label}
                {t.id === "campaigns" && pendingOffers > 0 && <Badge className="ml-1 bg-green-500 text-white text-[10px] border-0 px-1.5 h-4">{pendingOffers}</Badge>}
              </button>
            ))}
          </div>

          {/* ── Tab content ────────────────────────────────────────────────── */}
          <div className="p-5">

            {/* ============ OVERVIEW ============ */}
            {tab === "overview" && (
              <div className="space-y-6">
                {/* 4-stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Balance */}
                  <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-md">
                    <CardContent className="p-4">
                      <DollarSign className="h-5 w-5 mb-1 opacity-80" />
                      <p className="text-2xl font-extrabold">${fmt(availBal)}</p>
                      <p className="text-xs opacity-80 mt-0.5">Available Balance</p>
                      {pendBal > 0 && <p className="text-xs opacity-70 mt-0.5">${fmt(pendBal)} pending</p>}
                      <Link href="/payout-requests">
                        <Button size="sm" variant="secondary" className="mt-2 h-7 text-xs w-full" data-testid="button-request-withdrawal">Withdraw</Button>
                      </Link>
                    </CardContent>
                  </Card>

                  {/* Points */}
                  <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-0 shadow-md overflow-hidden relative">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
                    <CardContent className="p-4 relative">
                      <Zap className="h-5 w-5 mb-1 text-yellow-300" />
                      <p className="text-2xl font-extrabold">{points.toLocaleString()}</p>
                      <p className="text-xs opacity-80">$TDRIP · {level}</p>
                      {cfg.next && (
                        <div className="mt-2">
                          <Progress value={progressToNext} className="h-1.5 bg-purple-800" />
                          <p className="text-[10px] opacity-70 mt-0.5">{(cfg as any).max - points > 0 ? ((cfg as any).max - points).toLocaleString() : 0} pts to {cfg.next}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Leaderboard */}
                  <Card className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <Trophy className="h-5 w-5 text-yellow-500 mb-1" />
                      {rank > 0 ? (
                        <>
                          <div className="flex items-center gap-1">
                            {rank === 1 && <Crown className="h-4 w-4 text-yellow-400" />}
                            <p className="text-2xl font-extrabold">#{rank}</p>
                          </div>
                          <p className="text-xs text-gray-500">of {rankTotal} users</p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-extrabold text-gray-400">–</p>
                          <p className="text-xs text-gray-400">Earn points to rank</p>
                        </>
                      )}
                      <Link href="/leaderboard">
                        <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs text-purple-600 px-0">View rankings →</Button>
                      </Link>
                    </CardContent>
                  </Card>

                  {/* Active campaigns */}
                  <Card className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <Target className="h-5 w-5 text-blue-500 mb-1" />
                      <p className="text-2xl font-extrabold">{(activeCampaigns as any[]).length}</p>
                      <p className="text-xs text-gray-500">Open Campaigns</p>
                      <p className="text-xs text-gray-400 mt-0.5">{completedTasks} completed by you</p>
                      <Link href="/campaigns">
                        <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs text-purple-600 px-0">Browse all →</Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>

                {/* Hire Offers */}
                {(hireOffers as any[]).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-bold text-gray-900 flex items-center gap-2"><Briefcase className="h-4 w-4 text-green-600" />Direct Hire Offers
                        {pendingOffers > 0 && <Badge className="bg-green-100 text-green-700 text-xs">{pendingOffers} new</Badge>}
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {(hireOffers as any[]).slice(0, 3).map((hire: any) => (
                        <div key={hire.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${hire.status === "pending" ? "border-green-200 bg-green-50/40" : "border-gray-100 bg-gray-50/50"}`} data-testid={`card-hire-offer-${hire.id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{hire.title}</p>
                            <p className="text-xs text-gray-500">
                              {hire.brand?.companyName || `${hire.brand?.firstName} ${hire.brand?.lastName}`}
                              <span className="font-semibold text-green-700 ml-2">${Number(hire.budget).toFixed(2)} USDT</span>
                            </p>
                          </div>
                          <Badge className={`text-xs ${hireStatusColors[hire.status] || "bg-gray-100 text-gray-500"}`}>{hire.status === "pending" ? "Respond" : hire.status}</Badge>
                          <Link href={`/direct-hire/${hire.id}`}>
                            <Button size="sm" variant={hire.status === "pending" ? "default" : "outline"} className={hire.status === "pending" ? "bg-green-600 hover:bg-green-700 text-xs" : "text-xs"} data-testid={`button-view-offer-${hire.id}`}>
                              {hire.status === "pending" ? "Respond" : "View"} <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                      {(hireOffers as any[]).length > 3 && (
                        <button onClick={() => setTab("campaigns")} className="text-xs text-purple-600 hover:underline">
                          See all {(hireOffers as any[]).length} offers →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick actions + Recent activity grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Quick Actions */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Target,    label: "Browse Campaigns",  href: "/campaigns",    color: "bg-purple-600 hover:bg-purple-700 text-white" },
                        { icon: Globe,     label: "P2P Market",        href: "/p2p-hub",      color: "bg-blue-600 hover:bg-blue-700 text-white" },
                        { icon: BookOpen,  label: "BreedSkool",        href: "/breedskool",   color: "bg-orange-500 hover:bg-orange-600 text-white" },
                        { icon: Store,     label: "Shop",              href: "/shop",         color: "bg-pink-600 hover:bg-pink-700 text-white" },
                        { icon: Link2,     label: "Short Links",       href: "/short-links",  color: "bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-600 hover:to-violet-700 text-white" },
                        { icon: TrendingUp,label: "Feed",              href: "/feed",         color: "bg-gray-800 hover:bg-gray-900 text-white" },
                        { icon: Trophy,    label: "Leaderboard",       href: "/leaderboard",  color: "bg-yellow-500 hover:bg-yellow-600 text-black font-bold" },
                        { icon: Wallet,    label: "Wallets",           href: "/wallet",       color: "bg-green-600 hover:bg-green-700 text-white" },
                        { icon: Settings,  label: "Edit Profile",      href: "/profile-edit", color: "bg-white hover:bg-gray-50 border border-gray-200 text-gray-700" },
                      ].map(({ icon: Icon, label, href, color }) => (
                        <Link key={href} href={href}>
                          <Button className={`w-full justify-start text-xs h-9 ${color}`} data-testid={`button-quick-${label.toLowerCase().replace(/\s/g,"-")}`}>
                            <Icon className="h-3.5 w-3.5 mr-2 flex-shrink-0" />{label}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-bold text-gray-900">Recent Activity</h2>
                      <button onClick={() => setTab("campaigns")} className="text-xs text-purple-600 hover:underline">See all →</button>
                    </div>
                    {(participations as any[]).length > 0 ? (
                      <div className="space-y-2">
                        {(participations as any[]).slice(0, 5).map((p: any) => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Activity className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.campaign?.title || "Campaign Task"}</p>
                              <p className="text-xs text-gray-500">{p.campaign?.category || "Task"}</p>
                            </div>
                            <Badge className={`text-xs border ${participationColors[p.status] || "bg-gray-100 text-gray-600"}`}>
                              {participationLabels[p.status] || p.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No activity yet</p>
                        <Link href="/campaigns"><Button variant="ghost" size="sm" className="text-xs mt-1 text-purple-600">Join a campaign →</Button></Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Points earning guide */}
                <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <h3 className="font-bold text-yellow-900 text-sm">Ways to Earn $TDRIP Points</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Daily Login",     pts: "+5" },
                      { label: "Join Campaign",   pts: "+20" },
                      { label: "Complete Task",   pts: "+50" },
                      { label: "Refer a Friend",  pts: "+100" },
                    ].map(({ label, pts }) => (
                      <div key={label} className="bg-white rounded-lg px-3 py-2 flex justify-between items-center border border-yellow-100">
                        <span className="text-xs text-gray-600">{label}</span>
                        <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px] font-bold">{pts}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Starter Campaign */}
                <div>
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    🚀 Starter Campaign <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Earn 130 pts</Badge>
                  </h2>
                  <WelcomeCampaign />
                </div>
              </div>
            )}

            {/* ============ CAMPAIGNS ============ */}
            {tab === "campaigns" && (
              <div className="space-y-6">
                {/* Hire Offers */}
                <div>
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-green-600" />Direct Hire Offers
                    {pendingOffers > 0 && <Badge className="bg-green-500 text-white text-xs">{pendingOffers} new</Badge>}
                  </h2>
                  {(hireOffers as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(hireOffers as any[]).map((hire: any) => (
                        <div key={hire.id} className={`flex items-center gap-4 p-4 rounded-xl border ${hire.status === "pending" ? "border-green-200 bg-green-50/40" : "border-gray-100 bg-gray-50"}`} data-testid={`card-hire-${hire.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900">{hire.title}</p>
                              <Badge className={`text-xs ${hireStatusColors[hire.status] || "bg-gray-100"}`}>{hire.status}</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              From {hire.brand?.companyName || `${hire.brand?.firstName} ${hire.brand?.lastName}`}
                              <span className="font-bold text-green-700 ml-2">${Number(hire.budget).toFixed(2)} USDT</span>
                            </p>
                            {hire.requirements && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{hire.requirements}</p>}
                          </div>
                          <Link href={`/direct-hire/${hire.id}`}>
                            <Button size="sm" className={hire.status === "pending" ? "bg-green-600 hover:bg-green-700" : ""} variant={hire.status === "pending" ? "default" : "outline"}>
                              {hire.status === "pending" ? "Respond Now" : "View Details"}
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No direct offers yet</p>
                      <p className="text-xs mt-1">Brands can find you on the <Link href="/influencers" className="text-purple-600 hover:underline">Influencers page</Link></p>
                    </div>
                  )}
                </div>

                {/* My participations */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><Activity className="h-4 w-4 text-purple-600" />My Task Participations</h2>
                    <Link href="/campaigns"><Button variant="outline" size="sm" className="text-xs">Browse Campaigns</Button></Link>
                  </div>
                  {(participations as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(participations as any[]).map((p: any) => (
                        <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Target className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{p.campaign?.title || "Campaign Task"}</p>
                            <p className="text-xs text-gray-500">{p.campaign?.category || "—"} · Reward: ${parseFloat(p.campaign?.reward || 0).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-xs border ${participationColors[p.status] || "bg-gray-100"}`}>
                              {participationLabels[p.status] || p.status}
                            </Badge>
                            {(p.status === "approved" || p.status === "submitted") && (
                              <Link href={`/campaigns/${p.campaignId}`}>
                                <Button size="sm" variant="outline" className="text-xs">Submit Proof</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Target className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">You haven't joined any campaigns yet</p>
                      <Link href="/campaigns"><Button className="mt-3 bg-purple-600 hover:bg-purple-700 text-xs">Browse Available Campaigns</Button></Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ P2P ============ */}
            {tab === "p2p" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2"><Shield className="h-4 w-4 text-blue-600" />P2P & Escrow Deals</h2>
                  <Link href="/p2p-hub"><Button className="bg-blue-600 hover:bg-blue-700 text-xs" size="sm">Go to P2P Market</Button></Link>
                </div>

                {(p2pDeals as any[]).length > 0 ? (
                  <div className="space-y-2">
                    {(p2pDeals as any[]).map((deal: any) => {
                      const statusColor: Record<string, string> = {
                        pending: "bg-yellow-100 text-yellow-800", funded: "bg-blue-100 text-blue-800",
                        completed: "bg-green-100 text-green-800", disputed: "bg-red-100 text-red-800",
                        cancelled: "bg-gray-100 text-gray-600",
                      };
                      return (
                        <div key={deal.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Shield className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{deal.listing?.title || "P2P Deal"}</p>
                            <p className="text-xs text-gray-500">
                              {deal.buyerId === uid ? "You're buying" : "You're selling"}
                              {" · "}${parseFloat(deal.totalAmount || 0).toFixed(2)}
                            </p>
                          </div>
                          <Badge className={`text-xs ${statusColor[deal.status] || "bg-gray-100 text-gray-600"}`}>{deal.status}</Badge>
                          <Link href={`/p2p-deals/${deal.id}`}>
                            <Button size="sm" variant="outline" className="text-xs">Enter Room</Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Shield className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No P2P deals yet</p>
                    <p className="text-xs text-gray-400 mt-1">Buy, sell, and trade with escrow protection</p>
                    <Link href="/p2p-hub"><Button className="mt-3 bg-blue-600 hover:bg-blue-700 text-xs">Browse P2P Listings</Button></Link>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Shield, title: "Escrow Protected", desc: "Every trade backed by admin-controlled escrow", color: "text-blue-600" },
                    { icon: Globe,  title: "Global Trading",   desc: "Trade with anyone in 50+ countries",          color: "text-green-600" },
                    { icon: Coins,  title: "Multi-Currency",   desc: "USDT, TON, Pi Network, BTC and more",         color: "text-purple-600" },
                  ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="bg-white rounded-xl border border-gray-100 p-4">
                      <Icon className={`h-5 w-5 ${color} mb-2`} />
                      <p className="font-semibold text-sm text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============ WALLET ============ */}
            {tab === "wallet" && (
              <div className="space-y-5">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><Wallet className="h-4 w-4 text-green-600" />Wallet & Payouts</h2>

                {/* Balance cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-xs font-medium text-green-700 mb-1">Available Balance</p>
                    <p className="text-3xl font-extrabold text-green-800" data-testid="text-available-balance">${fmt(availBal)}</p>
                    <p className="text-xs text-green-600 mt-1">Ready to withdraw</p>
                    <Link href="/payout-requests">
                      <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700 text-xs w-full" data-testid="button-open-payouts">Request Payout</Button>
                    </Link>
                  </div>
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                    <p className="text-xs font-medium text-yellow-700 mb-1">Pending Balance</p>
                    <p className="text-3xl font-extrabold text-yellow-800" data-testid="text-pending-balance">${fmt(pendBal)}</p>
                    <p className="text-xs text-yellow-600 mt-1">Escrowed — awaiting approval</p>
                  </div>
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                    <p className="text-xs font-medium text-purple-700 mb-1">Total Earned (All Time)</p>
                    <p className="text-3xl font-extrabold text-purple-800">${fmt(totalEarned)}</p>
                    <Link href="/ledger">
                      <Button size="sm" variant="outline" className="mt-3 text-xs w-full border-purple-300 text-purple-700" data-testid="button-open-ledger">View Ledger</Button>
                    </Link>
                  </div>
                </div>

                {/* Wallet addresses */}
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm">Crypto Wallet Addresses</h3>
                    <Link href="/wallet"><Button variant="outline" size="sm" className="text-xs">Manage Wallets</Button></Link>
                  </div>
                  {[
                    { label: "USDT TRC-20 (Tron)", key: "usdtTronWallet", color: "bg-red-100 text-red-700" },
                    { label: "USDT BEP-20 (BSC)",  key: "usdtBscWallet",  color: "bg-yellow-100 text-yellow-700" },
                    { label: "USDT TON",            key: "tonWallet",      color: "bg-blue-100 text-blue-700" },
                    { label: "Pi Network",          key: "piWallet",       color: "bg-purple-100 text-purple-700" },
                  ].map(({ label, key, color }) => (
                    <div key={key} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <Badge className={`text-xs ${color} border-0 flex-shrink-0 w-28 justify-center`}>{label}</Badge>
                      {(user as any)?.[key] ? (
                        <span className="font-mono text-xs text-gray-600 truncate flex-1">{(user as any)[key]}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic flex-1">Not set</span>
                      )}
                    </div>
                  ))}
                  {!hasWallet && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">Add wallet addresses to receive payments from completed tasks.</p>
                      <Link href="/wallet"><Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700 text-xs">Set Up Wallets</Button></Link>
                    </div>
                  )}
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link href="/payout-requests"><Button variant="outline" className="w-full justify-start text-sm" data-testid="button-wallet-open-payouts"><Send className="h-4 w-4 mr-2 text-green-600" />Payout Requests</Button></Link>
                  <Link href="/ledger"><Button variant="outline" className="w-full justify-start text-sm" data-testid="button-wallet-open-ledger"><FileText className="h-4 w-4 mr-2 text-purple-600" />Earnings Ledger</Button></Link>
                  <Link href="/wallet"><Button variant="outline" className="w-full justify-start text-sm"><Wallet className="h-4 w-4 mr-2 text-blue-600" />Wallet Settings</Button></Link>
                </div>
              </div>
            )}

            {/* ============ SHOP ============ */}
            {tab === "shop" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2"><Store className="h-4 w-4 text-pink-600" />Shop & My Orders</h2>
                  <div className="flex items-center gap-2">
                    <Link href="/my-orders"><Button variant="outline" size="sm" className="text-xs border-gray-200">All Orders</Button></Link>
                    <Link href="/shop"><Button className="bg-pink-600 hover:bg-pink-700 text-xs" size="sm">Browse Shop</Button></Link>
                  </div>
                </div>

                {(orders as any[]).length > 0 ? (
                  <div className="space-y-2">
                    {(orders as any[]).map((order: any) => {
                      const statusCfg: Record<string, { color: string; dot: string; label: string }> = {
                        pending:   { color: "text-amber-700 bg-amber-50 border-amber-200",   dot: "bg-amber-400",  label: "Pending" },
                        paid:      { color: "text-blue-700 bg-blue-50 border-blue-200",      dot: "bg-blue-400",   label: "Confirmed" },
                        shipped:   { color: "text-violet-700 bg-violet-50 border-violet-200",dot: "bg-violet-400", label: "Shipped" },
                        delivered: { color: "text-green-700 bg-green-50 border-green-200",   dot: "bg-green-400",  label: "Delivered" },
                        cancelled: { color: "text-red-700 bg-red-50 border-red-200",         dot: "bg-red-400",    label: "Cancelled" },
                      };
                      const cfg2 = statusCfg[order.status] || statusCfg.pending;
                      const hasDownload = !!order.deliveryDetails?.downloadUrl;
                      return (
                        <Link key={order.id} href={`/orders/${order.id}`}>
                          <div
                            className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-pink-200 hover:shadow-md hover:bg-pink-50/30 transition-all cursor-pointer group"
                            data-testid={`order-row-${order.id}`}
                          >
                            {/* Product image or fallback */}
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 flex-shrink-0 border border-gray-100">
                              {order.product?.imageUrl ? (
                                <img src={order.product.imageUrl} alt={order.product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-5 w-5 text-pink-400" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate group-hover:text-pink-700 transition-colors">
                                {order.product?.title || `Order #${order.id.slice(0, 8)}`}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-gray-400">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                </span>
                                <span className="text-gray-300 text-xs">·</span>
                                <span className="text-xs text-gray-400">{order.paymentMethod || "Crypto"}</span>
                                {hasDownload && (
                                  <>
                                    <span className="text-gray-300 text-xs">·</span>
                                    <span className="text-xs text-purple-600 flex items-center gap-0.5 font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                                      Ready to Download
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <p className="font-bold text-gray-900 text-sm">${parseFloat(order.totalAmount || order.amount || 0).toFixed(2)}</p>
                              <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg2.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg2.dot}`} />
                                {cfg2.label}
                              </div>
                            </div>

                            {/* Arrow indicator */}
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-pink-400 transition-colors flex-shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No orders yet</p>
                    <Link href="/shop"><Button className="mt-3 bg-pink-600 hover:bg-pink-700 text-xs">Browse the Shop</Button></Link>
                  </div>
                )}
              </div>
            )}

            {/* ============ PROFILE ============ */}
            {tab === "profile" && (
              <div className="space-y-5">
                <h2 className="font-bold text-gray-900 flex items-center gap-2"><User className="h-4 w-4 text-purple-600" />Profile & Settings</h2>

                {/* Profile completeness */}
                <div className="rounded-xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Profile Completeness</h3>
                    <Link href="/profile-edit"><Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs">Edit Profile</Button></Link>
                  </div>
                  {(() => {
                    const fields = [
                      { label: "Profile Photo",   done: !!(user as any)?.profileImageUrl },
                      { label: "Bio",              done: !!(user as any)?.bio },
                      { label: "Location",         done: !!(user as any)?.location },
                      { label: "Niche",            done: !!(user as any)?.niche },
                      { label: "Crypto Wallet",    done: !!hasWallet },
                      { label: "Social Links",     done: !!(user as any)?.instagramHandle || !!(user as any)?.tiktokHandle },
                    ];
                    const done = fields.filter(f => f.done).length;
                    const pct = Math.round((done / fields.length) * 100);
                    return (
                      <>
                        <div className="flex items-center gap-3 mb-3">
                          <Progress value={pct} className="flex-1 h-2" />
                          <span className="text-sm font-bold text-gray-700">{pct}%</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {fields.map(f => (
                            <div key={f.label} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${f.done ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                              {f.done ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <AlertCircle className="h-3.5 w-3.5 text-gray-400" />}
                              {f.label}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Social stats summary */}
                <div className="rounded-xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Social Media</h3>
                    <Link href="/profile-edit"><Button variant="outline" size="sm" className="text-xs">Manage</Button></Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Instagram", key: "instagramHandle", followers: "instagramFollowers", color: "bg-pink-50 text-pink-700" },
                      { label: "TikTok",    key: "tiktokHandle",    followers: "tiktokFollowers",    color: "bg-gray-50 text-gray-700" },
                      { label: "Twitter/X", key: "twitterHandle",   followers: "twitterFollowers",   color: "bg-sky-50 text-sky-700" },
                      { label: "YouTube",   key: "youtubeHandle",   followers: "youtubeSubscribers", color: "bg-red-50 text-red-700" },
                    ].map(({ label, key, followers, color }) => (
                      <div key={key} className={`rounded-lg p-3 ${color}`}>
                        <p className="font-semibold text-xs">{label}</p>
                        {(user as any)?.[key] ? (
                          <>
                            <p className="font-mono text-[11px] truncate">@{(user as any)[key]}</p>
                            <p className="text-[10px] opacity-70">{((user as any)?.[followers] || 0).toLocaleString()} followers</p>
                          </>
                        ) : (
                          <p className="text-[11px] opacity-60 italic">Not connected</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referral links */}
                <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-black text-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-5 w-5 text-yellow-400" />
                    <div>
                      <h3 className="font-bold">Referral Links</h3>
                      <p className="text-xs text-gray-400">{referralData?.totalReferrals ?? 0} people referred · +100 pts each</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Invite Influencers", link: creatorLink, color: "text-purple-300", badge: "Influencer Link" },
                      { label: "Invite Brands",       link: brandLink,   color: "text-blue-300",   badge: "Brand Link" },
                    ].map(({ label, link, color, badge }) => (
                      <div key={badge} className="bg-white/10 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${color}`}>{label}</span>
                          <Badge className="bg-white/10 text-gray-200 text-xs border-0">{badge}</Badge>
                        </div>
                        {link ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/10 rounded px-2.5 py-1.5 text-xs text-gray-300 font-mono truncate">{link}</div>
                            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 px-2" onClick={() => copyLink(link, badge)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Generating...</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href="/referrals" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white text-xs">Full Referral Dashboard</Button>
                    </Link>
                    <Link href="/leaderboard">
                      <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs">
                        <Trophy className="h-3.5 w-3.5 mr-1" />Top Charts
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* SEO Settings */}
                <SeoSettingsCard user={user} />

                {/* Account settings links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { icon: Settings,   label: "Edit Profile & Bio",     href: "/profile-edit" },
                    { icon: Wallet,     label: "Crypto Wallet Settings", href: "/wallet" },
                    { icon: Globe,      label: "P2P Trading Profile",    href: "/p2p-hub" },
                    { icon: BookOpen,   label: "My BreedSkool Courses",  href: "/breedskool" },
                    { icon: FileText,   label: "Earnings Ledger",        href: "/ledger" },
                    { icon: Send,       label: "Payout Requests",        href: "/payout-requests" },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link key={href} href={href}>
                      <Button variant="outline" className="w-full justify-start text-sm h-10">
                        <Icon className="h-4 w-4 mr-2 text-purple-600 flex-shrink-0" />{label}
                        <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-400" />
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
