import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot, Users, Send, Search, Plus, Trash2, RefreshCw, Loader2, ExternalLink,
  Globe, Mail, MessageCircle, Phone, ChevronDown, Crown, Zap, Rocket,
  Sparkles, Leaf, HelpCircle, Filter, Download, AlertCircle, CheckCircle2,
  Instagram, Twitter, Youtube, BarChart3, Eye,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TierId = "global_titans" | "power_influencers" | "growth_engines" | "rising_sparks" | "aspiring" | "unknown";

interface TierDef {
  id: TierId;
  label: string;
  min: number;
  max: number;
  color: string;
  emoji: string;
  count?: number;
  contacted?: number;
}

interface Influencer {
  id: string;
  name: string;
  niche?: string;
  country?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  followers?: number;
  description?: string;
  aiSummary?: string;
  status?: string;
  lastContactedAt?: string;
  createdAt?: string;
  computedTier?: TierId;
  source?: string;
}

interface OutreachMessage {
  id: string;
  channel: string;
  body?: string;
  status?: string;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier colours / icons
// ─────────────────────────────────────────────────────────────────────────────
const TIER_META: Record<TierId, { bg: string; border: string; text: string; badge: string; icon: React.ReactNode }> = {
  global_titans:     { bg: "from-amber-500/15 to-yellow-600/10",   border: "border-amber-500/40",   text: "text-amber-300",   badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",  icon: <Crown className="w-4 h-4" /> },
  power_influencers: { bg: "from-purple-500/15 to-violet-700/10",  border: "border-purple-500/40",  text: "text-purple-300",  badge: "bg-purple-500/20 text-purple-300 border-purple-400/40", icon: <Zap className="w-4 h-4" /> },
  growth_engines:    { bg: "from-blue-500/15 to-blue-700/10",      border: "border-blue-500/40",    text: "text-blue-300",    badge: "bg-blue-500/20 text-blue-300 border-blue-400/40",    icon: <Rocket className="w-4 h-4" /> },
  rising_sparks:     { bg: "from-emerald-500/15 to-emerald-700/10",border: "border-emerald-500/40", text: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40", icon: <Sparkles className="w-4 h-4" /> },
  aspiring:          { bg: "from-gray-500/10 to-gray-700/10",      border: "border-gray-500/40",    text: "text-gray-300",    badge: "bg-gray-500/20 text-gray-300 border-gray-400/40",    icon: <Leaf className="w-4 h-4" /> },
  unknown:           { bg: "from-gray-600/10 to-gray-800/10",      border: "border-gray-600/40",    text: "text-gray-400",    badge: "bg-gray-700/20 text-gray-400 border-gray-500/30",    icon: <HelpCircle className="w-4 h-4" /> },
};

const STATUS_COLORS: Record<string, string> = {
  new:       "bg-blue-500/20 text-blue-300 border-blue-400/40",
  contacted: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  replied:   "bg-purple-500/20 text-purple-300 border-purple-400/40",
  converted: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  archived:  "bg-gray-600/20 text-gray-400 border-gray-500/30",
};

const NICHES = ["Crypto/Web3","Finance","Beauty","Fitness","Gaming","Fashion","Food","Travel","Tech","Lifestyle","Music","Sports","Education","Health","Parenting","Comedy","Business","Art","Cars","Pets"];
const PLATFORMS = ["youtube","instagram","tiktok","twitter","facebook","linkedin"];
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-3 h-3" />,
  instagram: <Instagram className="w-3 h-3" />,
  tiktok: <span className="text-[10px] font-bold">TT</span>,
  twitter: <Twitter className="w-3 h-3" />,
  x: <Twitter className="w-3 h-3" />,
  facebook: <Globe className="w-3 h-3" />,
  linkedin: <Globe className="w-3 h-3" />,
};

const MESSAGE_TEMPLATES = [
  {
    id: "intro",
    label: "Platform Introduction",
    subject: "You're invited to Taskdrip — the Web3 Creator Marketplace",
    body: `Hi {{name}},

I came across your {{platform}} channel and was impressed by your work in {{niche}}. With {{followers}} engaged followers, I think you'd be a great fit for Taskdrip.

Taskdrip is a Web3 SocialFi marketplace connecting verified creators with global brands. Here's what you get:
• Paid micro-campaigns that match your niche
• $TDRIP token rewards on every completed task
• Escrow-protected brand partnerships
• Access to our creator leaderboard and spotlight

It's free to join and takes under 5 minutes to set up your profile.

Would you be open to a quick call to learn more?

Best,
The Taskdrip Team
https://taskdrip.online`,
  },
  {
    id: "collab",
    label: "Collaboration Offer",
    subject: "Collaboration opportunity for {{name}}",
    body: `Hey {{name}},

We'd love to collaborate with you on Taskdrip's {{niche}} creator network.

As a recognized {{platform}} creator, you're exactly who brands on our platform are looking for. We have active campaigns ready for creators in your space.

Ready to get started? Sign up free at taskdrip.online

Warm regards,
Taskdrip Team`,
  },
  {
    id: "brand_deal",
    label: "Brand Deal Intro",
    subject: "Brand partnerships waiting for you on Taskdrip",
    body: `Hi {{name}},

Brands are looking for {{niche}} creators like you right now on Taskdrip.

Your {{followers}} followers make you a strong candidate for our Growth Engine tier campaigns, where creators earn $50–$500 per campaign depending on deliverables.

Join free → taskdrip.online/signup

Talk soon,
Taskdrip`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtFollowers(n?: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function interpolate(tmpl: string, vars: Record<string, string>) {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function getPrimaryPlatform(inf: Influencer) {
  const s = inf.socialLinks || {};
  if (s.youtube) return "YouTube";
  if (s.instagram) return "Instagram";
  if (s.tiktok) return "TikTok";
  if (s.x || s.twitter) return "X (Twitter)";
  if (inf.source === "youtube") return "YouTube";
  return "social media";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminInfluencerCRM() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";

  // View state
  const [activeTier, setActiveTier] = useState<string>("all");
  const [filters, setFilters] = useState({ search: "", niche: "", country: "", status: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialog state
  const [crawlOpen, setCrawlOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);

  // Forms
  const [crawlForm, setCrawlForm] = useState({
    niche: "",
    platforms: ["youtube"],
    targetTiers: [] as string[],
    country: "",
    maxPerQuery: 15,
    includeInternal: true,
  });
  const [addForm, setAddForm] = useState({ name: "", niche: "", email: "", website: "", followers: "", country: "", description: "" });
  const [outreachForm, setOutreachForm] = useState({ templateId: "intro", subject: "", body: "", channel: "email" });
  const [bulkForm, setBulkForm] = useState({ templateId: "intro", subject: "", body: "", tier: "all" });

  // ── Queries
  const { data: tierStats, isLoading: tiersLoading } = useQuery<TierDef[]>({
    queryKey: ["/api/admin/influencer-crm/tier-stats"],
    enabled: isAdmin,
  });

  const queryKey = useMemo(() => {
    const p = new URLSearchParams({ limit: "300" });
    if (activeTier !== "all") p.set("tier", activeTier);
    if (filters.search) p.set("search", filters.search);
    if (filters.niche) p.set("niche", filters.niche);
    if (filters.country) p.set("country", filters.country);
    if (filters.status) p.set("status", filters.status);
    return `/api/admin/influencer-crm?${p.toString()}`;
  }, [activeTier, filters]);

  const { data: infData, isLoading: listLoading } = useQuery<{ items: Influencer[]; total: number }>({
    queryKey: [queryKey],
    enabled: isAdmin,
  });
  const influencers = infData?.items || [];

  const { data: messages } = useQuery<OutreachMessage[]>({
    queryKey: [`/api/admin/influencer-crm/${selectedInfluencer?.id}/messages`],
    enabled: !!selectedInfluencer && detailOpen,
  });

  // ── Mutations
  const crawlMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/influencer-crm/crawl", crawlForm),
    onSuccess: async (r: any) => {
      const d = await r.json();
      toast({ title: "🤖 AI Crawl complete", description: `Found ${d.found} influencers · Saved ${d.saved} new · Queries: ${d.queriesUsed?.join(", ")}` });
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["/api/admin/influencer-crm/tier-stats"] });
      setCrawlOpen(false);
    },
    onError: (e: any) => toast({ title: "Crawl failed", description: e.message, variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/influencer-crm/manual", {
      ...addForm,
      followers: addForm.followers ? parseInt(addForm.followers) : undefined,
    }),
    onSuccess: () => {
      toast({ title: "Influencer added" });
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["/api/admin/influencer-crm/tier-stats"] });
      setAddOpen(false);
      setAddForm({ name: "", niche: "", email: "", website: "", followers: "", country: "", description: "" });
    },
    onError: (e: any) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });

  const outreachMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/influencer-crm/${selectedInfluencer?.id}/outreach`, {
      subject: outreachForm.subject,
      body: selectedInfluencer ? interpolate(outreachForm.body, {
        name: selectedInfluencer.name,
        niche: selectedInfluencer.niche || "your niche",
        platform: getPrimaryPlatform(selectedInfluencer),
        followers: fmtFollowers(selectedInfluencer.followers),
      }) : outreachForm.body,
      channel: outreachForm.channel,
    }),
    onSuccess: async (r: any) => {
      const d = await r.json();
      toast({ title: d.success ? "✉️ Outreach sent!" : "Message logged", description: d.error || `Sent via ${outreachForm.channel}` });
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: [`/api/admin/influencer-crm/${selectedInfluencer?.id}/messages`] });
      setOutreachOpen(false);
    },
    onError: (e: any) => toast({ title: "Outreach failed", description: e.message, variant: "destructive" }),
  });

  const bulkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/influencer-crm/bulk-outreach", {
      leadIds: selected.size > 0 ? Array.from(selected) : undefined,
      subject: bulkForm.subject,
      body: bulkForm.body,
      tier: selected.size === 0 ? bulkForm.tier : undefined,
    }),
    onSuccess: async (r: any) => {
      const d = await r.json();
      toast({ title: "📨 Bulk outreach done", description: `${d.sent} sent · ${d.failed} failed of ${d.attempted} total` });
      qc.invalidateQueries({ queryKey: [queryKey] });
      setBulkOpen(false);
      setSelected(new Set());
    },
    onError: (e: any) => toast({ title: "Bulk failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/influencer-crm/${id}`),
    onSuccess: () => {
      toast({ title: "Deleted" });
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["/api/admin/influencer-crm/tier-stats"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/influencer-crm/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  // ── Selection
  const toggleSel = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === influencers.length) setSelected(new Set());
    else setSelected(new Set(influencers.map(i => i.id)));
  };

  // ── Open outreach for an influencer
  const openOutreach = useCallback((inf: Influencer) => {
    setSelectedInfluencer(inf);
    const tmpl = MESSAGE_TEMPLATES[0];
    setOutreachForm({ templateId: tmpl.id, subject: tmpl.subject, body: tmpl.body, channel: "email" });
    setOutreachOpen(true);
  }, []);

  const openDetail = useCallback((inf: Influencer) => {
    setSelectedInfluencer(inf);
    setDetailOpen(true);
  }, []);

  // ── Export CSV
  const exportCsv = () => {
    const rows = influencers.filter(i => selected.size === 0 || selected.has(i.id));
    const cols = ["name","niche","computedTier","followers","country","email","website","status"];
    const csv = [cols.join(","), ...rows.map(r => cols.map(c => {
      const v = (r as any)[c]; return v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
    }).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `influencer-crm-${Date.now()}.csv`;
    a.click();
  };

  // ── Apply template to bulk form
  const applyBulkTemplate = (id: string) => {
    const t = MESSAGE_TEMPLATES.find(t => t.id === id);
    if (t) setBulkForm(f => ({ ...f, templateId: id, subject: t.subject, body: t.body }));
  };

  // ── Apply template to single outreach form
  const applyOutreachTemplate = (id: string) => {
    const t = MESSAGE_TEMPLATES.find(t => t.id === id);
    if (t) setOutreachForm(f => ({ ...f, templateId: id, subject: t.subject, body: t.body }));
  };

  // ── Auth guard
  if (authLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
    </div>
  );
  if (!isAuthenticated || !isAdmin) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-lg mb-4">Admin access required</p>
        <Button onClick={() => navigate("/admin-login")}>Sign in</Button>
      </div>
    </div>
  );

  const tierPreview = selectedInfluencer
    ? interpolate(outreachForm.body, {
        name: selectedInfluencer.name,
        niche: selectedInfluencer.niche || "your niche",
        platform: getPrimaryPlatform(selectedInfluencer),
        followers: fmtFollowers(selectedInfluencer.followers),
      })
    : outreachForm.body;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/10 to-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* ── Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shadow-lg shadow-purple-900/40">
                <Bot className="w-5 h-5 text-white" />
              </div>
              Influencer CRM
            </h1>
            <p className="text-sm text-gray-400 mt-1 ml-14">
              AI-powered robot · Tier-based segmentation · Direct outreach hub
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="border-gray-700 text-gray-300">
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="border-gray-700 text-gray-300">
              <Plus className="w-4 h-4 mr-2" />Add Manually
            </Button>
            {selected.size > 0 && (
              <Button size="sm" onClick={() => { setBulkForm(f => ({ ...f, body: MESSAGE_TEMPLATES[0].body, subject: MESSAGE_TEMPLATES[0].subject })); setBulkOpen(true); }} className="bg-purple-600 hover:bg-purple-700">
                <Send className="w-4 h-4 mr-2" />Blast {selected.size} Selected
              </Button>
            )}
            <Button size="sm" onClick={() => setCrawlOpen(true)} className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-900/30">
              <Bot className="w-4 h-4 mr-2" />AI Robot Crawl
            </Button>
          </div>
        </header>

        {/* ── Tier Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* All card */}
          <button
            onClick={() => setActiveTier("all")}
            className={`rounded-2xl border p-4 text-left transition-all ${
              activeTier === "all"
                ? "bg-purple-600/20 border-purple-500/60 ring-1 ring-purple-500/30"
                : "bg-gray-900/60 border-gray-800 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2 text-gray-300"><Users className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-wide">All</span></div>
            <p className="text-2xl font-black">{infData?.total ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">influencers</p>
          </button>

          {tiersLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-900/60 border border-gray-800 p-4 animate-pulse">
                  <div className="h-3 bg-gray-800 rounded w-2/3 mb-3" />
                  <div className="h-6 bg-gray-800 rounded w-1/2" />
                </div>
              ))
            : (tierStats || []).filter(t => t.id !== "unknown").map(tier => {
                const meta = TIER_META[tier.id];
                const isActive = activeTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setActiveTier(isActive ? "all" : tier.id)}
                    className={`rounded-2xl bg-gradient-to-br ${meta.bg} border ${meta.border} p-4 text-left transition-all hover:scale-[1.02] ${isActive ? "ring-2 ring-white/20" : ""}`}
                  >
                    <div className={`flex items-center gap-1.5 mb-2 ${meta.text}`}>
                      {meta.icon}
                      <span className="text-xs font-semibold uppercase tracking-wide truncate">{tier.emoji} {tier.label}</span>
                    </div>
                    <p className="text-2xl font-black">{tier.count || 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tier.contacted || 0} contacted</p>
                  </button>
                );
              })
          }
        </div>

        {/* ── Filter bar */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-300">
            <Filter className="w-4 h-4" />Filters
            {activeTier !== "all" && (
              <Badge className={TIER_META[activeTier as TierId]?.badge || ""}>
                {tierStats?.find(t => t.id === activeTier)?.emoji} {tierStats?.find(t => t.id === activeTier)?.label}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Search name, email…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="bg-gray-800 border-gray-700" />
            <Select value={filters.niche || "all"} onValueChange={v => setFilters(f => ({ ...f, niche: v === "all" ? "" : v }))}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Niche" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">Any niche</SelectItem>
                {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? "" : v }))}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Country (e.g. NG, US)" value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value }))} className="bg-gray-800 border-gray-700" />
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-gray-500">{influencers.length} shown{infData?.total ? ` of ${infData.total}` : ""}</p>
            <Button variant="ghost" size="sm" onClick={() => setFilters({ search: "", niche: "", country: "", status: "" })} className="text-gray-400 text-xs">Clear filters</Button>
          </div>
        </div>

        {/* ── Bulk action bar */}
        {selected.size > 0 && (
          <div className="rounded-xl bg-purple-600/15 border border-purple-500/30 p-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <Button size="sm" onClick={() => setBulkOpen(true)} className="bg-purple-600 hover:bg-purple-700">
              <Send className="w-3 h-3 mr-1.5" />Bulk Outreach
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} className="border-gray-600 text-gray-300">Clear</Button>
            <Button size="sm" variant="ghost" onClick={exportCsv} className="text-gray-400">
              <Download className="w-3 h-3 mr-1.5" />Export Selected
            </Button>
          </div>
        )}

        {/* ── Influencer Table */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
          {listLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading influencers…</p>
            </div>
          ) : influencers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-white font-semibold">No influencers yet</p>
              <p className="text-gray-400 text-sm">Use the <b>AI Robot Crawl</b> to discover creators, or add them manually.</p>
              <Button onClick={() => setCrawlOpen(true)} className="mt-2 bg-purple-600 hover:bg-purple-700">
                <Bot className="w-4 h-4 mr-2" />Launch AI Crawler
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/60 text-xs uppercase text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="p-3 text-left w-10"><input type="checkbox" checked={selected.size === influencers.length && influencers.length > 0} onChange={toggleAll} className="rounded" /></th>
                    <th className="p-3 text-left">Creator</th>
                    <th className="p-3 text-left">Tier</th>
                    <th className="p-3 text-left">Niche</th>
                    <th className="p-3 text-left">Followers</th>
                    <th className="p-3 text-left">Platforms</th>
                    <th className="p-3 text-left">Contact</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {influencers.map(inf => {
                    const tier = inf.computedTier || "unknown";
                    const meta = TIER_META[tier];
                    const tierDef = tierStats?.find(t => t.id === tier);
                    return (
                      <tr key={inf.id} className="hover:bg-gray-800/30 transition-colors group">
                        <td className="p-3"><input type="checkbox" checked={selected.has(inf.id)} onChange={() => toggleSel(inf.id)} /></td>
                        <td className="p-3 min-w-[180px]">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.bg} border ${meta.border} flex items-center justify-center flex-shrink-0 text-sm font-bold ${meta.text}`}>
                              {inf.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button onClick={() => openDetail(inf)} className="font-semibold text-white hover:text-purple-300 truncate block text-left max-w-[160px]">
                                {inf.name}
                              </button>
                              {inf.aiSummary && <p className="text-xs text-gray-500 line-clamp-1 max-w-[160px]">{inf.aiSummary}</p>}
                              {inf.country && <p className="text-xs text-gray-600">{inf.country}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.badge}`}>
                            {meta.icon}
                            {tierDef?.emoji} {tierDef?.label || tier}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">{inf.niche || "—"}</td>
                        <td className="p-3">
                          <span className={`font-semibold ${meta.text}`}>{fmtFollowers(inf.followers)}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {Object.entries(inf.socialLinks || {}).filter(([, v]) => v).map(([k, v]) => (
                              <a key={k} href={v as string} target="_blank" rel="noreferrer" title={k}
                                className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                {PLATFORM_ICONS[k] || <Globe className="w-3 h-3" />}
                              </a>
                            ))}
                            {inf.website && (
                              <a href={inf.website} target="_blank" rel="noreferrer" title="Website"
                                className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                <Globe className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5 text-xs">
                            {inf.email && (
                              <a href={`mailto:${inf.email}`} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 truncate max-w-[140px]">
                                <Mail className="w-3 h-3 flex-shrink-0" />{inf.email}
                              </a>
                            )}
                            {inf.phone && <a href={`tel:${inf.phone}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300"><Phone className="w-3 h-3" />{inf.phone}</a>}
                            {!inf.email && !inf.phone && <span className="text-gray-600">No contact</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <Select value={inf.status || "new"} onValueChange={v => statusMutation.mutate({ id: inf.id, status: v })}>
                            <SelectTrigger className={`h-7 text-xs px-2 border rounded-full w-[110px] ${STATUS_COLORS[inf.status || "new"] || STATUS_COLORS.new}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                              {["new","contacted","replied","converted","archived"].map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={() => openDetail(inf)} title="View profile" className="h-7 w-7 p-0 text-gray-400 hover:text-white">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openOutreach(inf)} title="Reach out" className="h-7 w-7 p-0 text-purple-400 hover:text-purple-300">
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                            {inf.whatsapp && (
                              <a href={`https://wa.me/${inf.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"><MessageCircle className="w-3.5 h-3.5" /></Button>
                              </a>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${inf.name}?`)) deleteMutation.mutate(inf.id); }} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          AI Robot Crawl Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={crawlOpen} onOpenChange={setCrawlOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              AI Robot Crawl
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Describe the creator niche and the AI will generate search queries, crawl platforms, and classify influencers by tier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-gray-300">Niche / Category *</Label>
              <Select value={crawlForm.niche || "custom"} onValueChange={v => {
                if (v !== "custom") setCrawlForm(f => ({ ...f, niche: v }));
              }}>
                <SelectTrigger className="bg-gray-800 border-gray-700 mt-1"><SelectValue placeholder="Select niche…" /></SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="bg-gray-800 border-gray-700 mt-2"
                placeholder="Or type any niche (e.g. sustainable fashion, crypto gaming)"
                value={crawlForm.niche}
                onChange={e => setCrawlForm(f => ({ ...f, niche: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Target Tiers (leave empty for all)</Label>
              <div className="grid grid-cols-2 gap-2">
                {(tierStats || []).filter(t => t.id !== "unknown").map(t => {
                  const meta = TIER_META[t.id];
                  const checked = crawlForm.targetTiers.includes(t.id);
                  return (
                    <label key={t.id} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors text-xs ${checked ? `${meta.bg} ${meta.border}` : "bg-gray-800/50 border-gray-700"}`}>
                      <input type="checkbox" checked={checked} onChange={e => {
                        setCrawlForm(f => ({
                          ...f,
                          targetTiers: e.target.checked ? [...f.targetTiers, t.id] : f.targetTiers.filter(x => x !== t.id),
                        }));
                      }} />
                      <span className={meta.text}>{t.emoji} {t.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Platforms</Label>
                <div className="space-y-1.5 mt-1">
                  {PLATFORMS.map(p => (
                    <label key={p} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input type="checkbox"
                        checked={crawlForm.platforms.includes(p)}
                        onChange={e => setCrawlForm(f => ({
                          ...f,
                          platforms: e.target.checked ? [...f.platforms, p] : f.platforms.filter(x => x !== p),
                        }))}
                      />
                      <span className="capitalize flex items-center gap-1.5">{PLATFORM_ICONS[p]}{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">Country (ISO-2)</Label>
                  <Input value={crawlForm.country} onChange={e => setCrawlForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. NG, US" className="bg-gray-800 border-gray-700 mt-1" />
                </div>
                <div>
                  <Label className="text-gray-300">Max per query</Label>
                  <Input type="number" min={5} max={25} value={crawlForm.maxPerQuery} onChange={e => setCrawlForm(f => ({ ...f, maxPerQuery: parseInt(e.target.value) || 15 }))} className="bg-gray-800 border-gray-700 mt-1" />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer mt-1">
                  <input type="checkbox" checked={crawlForm.includeInternal} onChange={e => setCrawlForm(f => ({ ...f, includeInternal: e.target.checked }))} />
                  Include internal creators
                </label>
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300">
              <Bot className="w-3.5 h-3.5 inline mr-1.5" />
              The AI will generate smart search queries for <b>{crawlForm.niche || "your niche"}</b>, crawl selected platforms, classify by tier, and deduplicate results automatically.
            </div>

            <Button
              onClick={() => crawlMutation.mutate()}
              disabled={crawlMutation.isPending || !crawlForm.niche || crawlForm.platforms.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
            >
              {crawlMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Crawling…</> : <><Bot className="w-4 h-4 mr-2" />Launch AI Crawler</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          Manual Add Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Add Influencer Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Name *</Label>
                <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="Creator name" />
              </div>
              <div>
                <Label className="text-gray-300">Niche</Label>
                <Input value={addForm.niche} onChange={e => setAddForm(f => ({ ...f, niche: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="e.g. Crypto" />
              </div>
              <div>
                <Label className="text-gray-300">Email</Label>
                <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Followers</Label>
                <Input type="number" value={addForm.followers} onChange={e => setAddForm(f => ({ ...f, followers: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="e.g. 50000" />
              </div>
              <div>
                <Label className="text-gray-300">Country</Label>
                <Input value={addForm.country} onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="NG, US…" />
              </div>
              <div>
                <Label className="text-gray-300">Website</Label>
                <Input value={addForm.website} onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="https://…" />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-gray-800 border-gray-700 mt-1" />
            </div>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !addForm.name} className="w-full bg-purple-600 hover:bg-purple-700">
              {addMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Influencer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          Single Outreach Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={outreachOpen} onOpenChange={setOutreachOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              Reach out to {selectedInfluencer?.name}
            </DialogTitle>
            {selectedInfluencer && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${TIER_META[selectedInfluencer.computedTier || "unknown"]?.badge}`}>
                  {TIER_META[selectedInfluencer.computedTier || "unknown"]?.icon}
                  {tierStats?.find(t => t.id === selectedInfluencer.computedTier)?.label || "Unclassified"}
                </span>
                {selectedInfluencer.followers && <span>{fmtFollowers(selectedInfluencer.followers)} followers</span>}
                {selectedInfluencer.niche && <span>· {selectedInfluencer.niche}</span>}
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Tabs defaultValue="compose">
              <TabsList className="bg-gray-800 border border-gray-700">
                <TabsTrigger value="compose">Compose</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="compose" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300">Template</Label>
                    <Select value={outreachForm.templateId} onValueChange={applyOutreachTemplate}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {MESSAGE_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Channel</Label>
                    <Select value={outreachForm.channel} onValueChange={v => setOutreachForm(f => ({ ...f, channel: v }))}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="email">📧 Email</SelectItem>
                        <SelectItem value="whatsapp">💬 WhatsApp (log)</SelectItem>
                        <SelectItem value="note">📝 Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Subject</Label>
                  <Input value={outreachForm.subject} onChange={e => setOutreachForm(f => ({ ...f, subject: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" />
                </div>
                <div>
                  <Label className="text-gray-300">Message <span className="text-gray-500 text-xs">(use &#123;&#123;name&#125;&#125;, &#123;&#123;niche&#125;&#125;, &#123;&#123;platform&#125;&#125;, &#123;&#123;followers&#125;&#125;)</span></Label>
                  <Textarea rows={10} value={outreachForm.body} onChange={e => setOutreachForm(f => ({ ...f, body: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1 font-mono text-xs" />
                </div>
                {!selectedInfluencer?.email && outreachForm.channel === "email" && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    No email on file — message will be logged as a note.
                  </div>
                )}
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                  <p className="text-xs text-gray-400 mb-1">Subject: <span className="text-white">{outreachForm.subject}</span></p>
                  <hr className="border-gray-700 my-2" />
                  <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">{tierPreview}</pre>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setOutreachOpen(false)} className="border-gray-700 text-gray-300">Cancel</Button>
              <Button onClick={() => outreachMutation.mutate()} disabled={outreachMutation.isPending || !outreachForm.body} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {outreachMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Outreach
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          Bulk Outreach Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              Bulk Outreach {selected.size > 0 ? `— ${selected.size} selected` : "— by Tier"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Personalized messages are sent to each influencer using their &#123;&#123;name&#125;&#125;, &#123;&#123;niche&#125;&#125;, and &#123;&#123;platform&#125;&#125;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selected.size === 0 && (
              <div>
                <Label className="text-gray-300">Target Tier</Label>
                <Select value={bulkForm.tier} onValueChange={v => setBulkForm(f => ({ ...f, tier: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="all">All influencers</SelectItem>
                    {(tierStats || []).filter(t => t.id !== "unknown").map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.emoji} {t.label} ({t.count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-gray-300">Template</Label>
              <Select value={bulkForm.templateId} onValueChange={applyBulkTemplate}>
                <SelectTrigger className="bg-gray-800 border-gray-700 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {MESSAGE_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Subject</Label>
              <Input value={bulkForm.subject} onChange={e => setBulkForm(f => ({ ...f, subject: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" />
            </div>
            <div>
              <Label className="text-gray-300">Message body <span className="text-gray-500 text-xs">(&#123;&#123;name&#125;&#125; &#123;&#123;niche&#125;&#125; &#123;&#123;platform&#125;&#125; &#123;&#123;followers&#125;&#125; auto-filled)</span></Label>
              <Textarea rows={8} value={bulkForm.body} onChange={e => setBulkForm(f => ({ ...f, body: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1 font-mono text-xs" />
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-300">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
              Emails sent to influencers who have an email on file. Others are logged as notes.
            </div>
            <Button onClick={() => bulkMutation.mutate()} disabled={bulkMutation.isPending || !bulkForm.body} className="w-full bg-purple-600 hover:bg-purple-700">
              {bulkMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Bulk Outreach
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          Influencer Detail / Profile Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedInfluencer && (() => {
            const tier = selectedInfluencer.computedTier || "unknown";
            const meta = TIER_META[tier];
            const tierDef = tierStats?.find(t => t.id === tier);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.bg} border ${meta.border} flex items-center justify-center text-2xl font-black ${meta.text}`}>
                      {selectedInfluencer.name.charAt(0)}
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedInfluencer.name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${meta.badge}`}>
                          {meta.icon}{tierDef?.emoji} {tierDef?.label || tier}
                        </span>
                        {selectedInfluencer.niche && <span className="text-xs text-gray-400">{selectedInfluencer.niche}</span>}
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className={`rounded-xl bg-gradient-to-br ${meta.bg} border ${meta.border} p-3`}>
                      <p className="text-xs text-gray-400">Followers</p>
                      <p className={`text-xl font-black ${meta.text}`}>{fmtFollowers(selectedInfluencer.followers)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-3">
                      <p className="text-xs text-gray-400">Status</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border mt-1 ${STATUS_COLORS[selectedInfluencer.status || "new"]}`}>
                        {selectedInfluencer.status || "new"}
                      </span>
                    </div>
                  </div>

                  {selectedInfluencer.description && (
                    <div className="rounded-xl bg-gray-800/30 border border-gray-700 p-3 text-xs text-gray-300">
                      {selectedInfluencer.description}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    {selectedInfluencer.email && (
                      <div className="flex items-center gap-2 text-purple-300">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <a href={`mailto:${selectedInfluencer.email}`} className="hover:underline truncate">{selectedInfluencer.email}</a>
                      </div>
                    )}
                    {selectedInfluencer.phone && (
                      <div className="flex items-center gap-2 text-blue-300">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <a href={`tel:${selectedInfluencer.phone}`}>{selectedInfluencer.phone}</a>
                      </div>
                    )}
                    {selectedInfluencer.country && (
                      <div className="flex items-center gap-2 text-gray-400"><Globe className="w-4 h-4" />{selectedInfluencer.country}</div>
                    )}
                  </div>

                  {Object.entries(selectedInfluencer.socialLinks || {}).filter(([, v]) => v).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Social Platforms</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedInfluencer.socialLinks || {}).filter(([, v]) => v).map(([k, v]) => (
                          <a key={k} href={v as string} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-gray-700 transition-colors">
                            {PLATFORM_ICONS[k] || <Globe className="w-3 h-3" />}
                            <span className="capitalize">{k}</span>
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message history */}
                  {messages && messages.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Outreach History ({messages.length})</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {messages.map(m => (
                          <div key={m.id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-2.5 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="capitalize text-gray-400">{m.channel}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${m.status === "sent" ? "bg-emerald-500/20 text-emerald-300" : m.status === "failed" ? "bg-red-500/20 text-red-300" : "bg-gray-600/30 text-gray-400"}`}>
                                {m.status}
                              </span>
                              <span className="text-gray-600 ml-auto">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}</span>
                            </div>
                            <p className="text-gray-300 line-clamp-2">{m.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => { setDetailOpen(false); openOutreach(selectedInfluencer); }} className="flex-1 bg-purple-600 hover:bg-purple-700">
                      <Send className="w-4 h-4 mr-2" />Reach Out
                    </Button>
                    {selectedInfluencer.website && (
                      <a href={selectedInfluencer.website} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="border-gray-700 text-gray-300">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
