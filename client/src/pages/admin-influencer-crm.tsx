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
  Instagram, Twitter, Youtube, BarChart3, Eye, StickyNote, CalendarDays,
  MapPin, Clock3, MessageSquareText, ArrowUpRight, UserRound, Save, X,
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
  direction?: string;
  sentBy?: string;
  createdAt?: string;
}

interface CrawlResult {
  id: string;
  name: string;
  niche?: string;
  country?: string;
  followers?: number;
  source?: string;
  socialLinks?: Record<string, string>;
  email?: string;
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
  const [addForm, setAddForm] = useState({
    name: "", niche: "", email: "", website: "", followers: "", country: "", description: "",
    phone: "", whatsapp: "",
    instagram: "", tiktok: "", youtube: "", twitter: "", facebook: "",
  });
  const [outreachForm, setOutreachForm] = useState({ templateId: "intro", subject: "", body: "", channel: "email" });
  const [bulkForm, setBulkForm] = useState({ templateId: "intro", subject: "", body: "", tier: "all" });
  const [noteBody, setNoteBody] = useState("");
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [crawlSources, setCrawlSources] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", niche: "", country: "", email: "", phone: "", whatsapp: "",
    website: "", followers: "", description: "", status: "new",
    socialLinks: {} as Record<string, string>,
  });
  const [newSocialPlatform, setNewSocialPlatform] = useState("instagram");
  const [newSocialUrl, setNewSocialUrl] = useState("");

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
      const sourceLabel = (d.sourcesUsed || []).map((s: string) =>
        s === "youtube_api" ? "YouTube API" : s === "groq_ai" ? "Groq AI" : s === "internal" ? "Internal" : s
      ).join(" + ") || "AI";
      toast({
        title: "🤖 AI Crawl complete",
        description: `Found ${d.found} · Saved ${d.saved} new · Source: ${sourceLabel}`,
      });
      setCrawlResults(Array.isArray(d.items) ? d.items : []);
      setCrawlSources(Array.isArray(d.sourcesUsed) ? d.sourcesUsed : []);
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["/api/admin/influencer-crm/tier-stats"] });
    },
    onError: (e: any) => toast({ title: "Crawl failed", description: e.message, variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: () => {
      const { instagram, tiktok, youtube: yt, twitter, facebook, ...rest } = addForm;
      const socialLinks: Record<string, string> = {};
      if (instagram) socialLinks.instagram = instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`;
      if (tiktok) socialLinks.tiktok = tiktok.startsWith("http") ? tiktok : `https://tiktok.com/@${tiktok.replace(/^@/, "")}`;
      if (yt) socialLinks.youtube = yt.startsWith("http") ? yt : `https://youtube.com/@${yt.replace(/^@/, "")}`;
      if (twitter) socialLinks.x = twitter.startsWith("http") ? twitter : `https://x.com/${twitter.replace(/^@/, "")}`;
      if (facebook) socialLinks.facebook = facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook.replace(/^@/, "")}`;
      return apiRequest("POST", "/api/admin/influencer-crm/manual", {
        ...rest,
        followers: rest.followers ? parseInt(rest.followers) : undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "✅ Influencer added" });
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["/api/admin/influencer-crm/tier-stats"] });
      setAddOpen(false);
      setAddForm({ name: "", niche: "", email: "", website: "", followers: "", country: "", description: "", phone: "", whatsapp: "", instagram: "", tiktok: "", youtube: "", twitter: "", facebook: "" });
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

  const noteMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/influencer-crm/${selectedInfluencer?.id}/messages`, { body: noteBody }),
    onSuccess: () => {
      toast({ title: "Note saved", description: "The internal note was added to this influencer's CRM timeline." });
      setNoteBody("");
      qc.invalidateQueries({ queryKey: [`/api/admin/influencer-crm/${selectedInfluencer?.id}/messages`] });
    },
    onError: (e: any) => toast({ title: "Could not save note", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/admin/influencer-crm/${selectedInfluencer?.id}`, {
      ...editForm,
      followers: editForm.followers ? parseInt(editForm.followers, 10) : null,
    }),
    onSuccess: async (r: any) => {
      const updated = await r.json();
      setSelectedInfluencer(current => current ? {
        ...current,
        ...updated,
        computedTier: current.computedTier,
      } : current);
      setEditMode(false);
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["/api/admin/influencer-crm/tier-stats"] });
      toast({ title: "Profile updated", description: "Influencer details and social channels were saved." });
    },
    onError: (e: any) => toast({ title: "Could not update profile", description: e.message, variant: "destructive" }),
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
    setNoteBody("");
    setEditMode(false);
    setEditForm({
      name: inf.name || "",
      niche: inf.niche || "",
      country: inf.country || "",
      email: inf.email || "",
      phone: inf.phone || "",
      whatsapp: inf.whatsapp || "",
      website: inf.website || "",
      followers: inf.followers ? String(inf.followers) : "",
      description: inf.description || "",
      status: inf.status || "new",
      socialLinks: { ...(inf.socialLinks || {}) },
    });
    setNewSocialUrl("");
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
    <div className="min-h-screen text-white relative" style={{
      backgroundColor: "#040610",
      backgroundImage: [
        "radial-gradient(ellipse 90% 60% at 10% 5%, rgba(130,40,220,0.50) 0%, transparent 55%)",
        "radial-gradient(ellipse 70% 55% at 90% 90%, rgba(60,20,190,0.40) 0%, transparent 55%)",
        "radial-gradient(ellipse 55% 45% at 85% 10%, rgba(100,20,200,0.30) 0%, transparent 45%)",
        "radial-gradient(ellipse 60% 55% at 15% 90%, rgba(70,10,160,0.25) 0%, transparent 50%)",
        "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(80,30,180,0.12) 0%, transparent 60%)",
      ].join(", "),
    }}>

      {/* Dot grid overlay — creates the dark "image background" texture */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: "radial-gradient(rgba(180,150,255,0.16) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      {/* Subtle line grid on top */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* ── Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Glowing robot icon */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-purple-600 blur-xl opacity-40" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shadow-xl shadow-purple-900/60 border border-purple-400/30">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-gray-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                Influencer CRM
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300">🤖 Groq AI</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300">Tier Segmentation</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300">Direct Outreach</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white backdrop-blur-sm">
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white backdrop-blur-sm">
              <Plus className="w-4 h-4 mr-2" />Add Manually
            </Button>
            {selected.size > 0 && (
              <Button size="sm" onClick={() => { setBulkForm(f => ({ ...f, body: MESSAGE_TEMPLATES[0].body, subject: MESSAGE_TEMPLATES[0].subject })); setBulkOpen(true); }} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/40">
                <Send className="w-4 h-4 mr-2" />Blast {selected.size} Selected
              </Button>
            )}
            <Button size="sm" onClick={() => setCrawlOpen(true)} className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-900/50 border border-purple-400/30">
              <Bot className="w-4 h-4 mr-2" />AI Robot Crawl
            </Button>
          </div>
        </header>

        {/* ── Tier Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* All card */}
          <button
            onClick={() => setActiveTier("all")}
            className={`rounded-2xl border p-4 text-left transition-all backdrop-blur-sm ${
              activeTier === "all"
                ? "bg-purple-600/25 border-purple-400/60 ring-1 ring-purple-400/40 shadow-lg shadow-purple-900/30"
                : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2.5 text-purple-300"><Users className="w-4 h-4" /><span className="text-[11px] font-bold uppercase tracking-widest">All</span></div>
            <p className="text-3xl font-black text-white">{infData?.total ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">influencers</p>
          </button>

          {tiersLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 animate-pulse backdrop-blur-sm">
                  <div className="h-3 bg-white/10 rounded w-2/3 mb-3" />
                  <div className="h-7 bg-white/10 rounded w-1/2" />
                </div>
              ))
            : (tierStats || []).filter(t => t.id !== "unknown").map(tier => {
                const meta = TIER_META[tier.id];
                const isActive = activeTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => setActiveTier(isActive ? "all" : tier.id)}
                    className={`rounded-2xl bg-gradient-to-br ${meta.bg} border ${meta.border} p-4 text-left transition-all hover:scale-[1.02] backdrop-blur-sm ${isActive ? "ring-2 ring-white/30 shadow-lg" : ""}`}
                  >
                    <div className={`flex items-center gap-1.5 mb-2.5 ${meta.text}`}>
                      {meta.icon}
                      <span className="text-[11px] font-bold uppercase tracking-widest truncate">{tier.emoji} {tier.label}</span>
                    </div>
                    <p className="text-3xl font-black text-white">{tier.count || 0}</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">{tier.contacted || 0} contacted</p>
                  </button>
                );
              })
          }
        </div>

        {/* ── Filter bar */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-bold text-white">
            <Filter className="w-4 h-4 text-purple-400" />Filters
            {activeTier !== "all" && (
              <Badge className={TIER_META[activeTier as TierId]?.badge || ""}>
                {tierStats?.find(t => t.id === activeTier)?.emoji} {tierStats?.find(t => t.id === activeTier)?.label}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Search name, email…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="bg-black/30 border-white/15 text-white placeholder:text-gray-500 focus:border-purple-500/60" />
            <Select value={filters.niche || "all"} onValueChange={v => setFilters(f => ({ ...f, niche: v === "all" ? "" : v }))}>
              <SelectTrigger className="bg-black/30 border-white/15 text-white"><SelectValue placeholder="Any niche" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">Any niche</SelectItem>
                {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? "" : v }))}>
              <SelectTrigger className="bg-black/30 border-white/15 text-white"><SelectValue placeholder="Any status" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Country (e.g. NG, US)" value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value }))} className="bg-black/30 border-white/15 text-white placeholder:text-gray-500 focus:border-purple-500/60" />
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-gray-400 font-medium">{influencers.length} shown{infData?.total ? ` of ${infData.total}` : ""}</p>
            <Button variant="ghost" size="sm" onClick={() => setFilters({ search: "", niche: "", country: "", status: "" })} className="text-gray-400 hover:text-white text-xs">Clear filters</Button>
          </div>
        </div>

        {/* ── Bulk action bar */}
        {selected.size > 0 && (
          <div className="rounded-xl bg-purple-600/20 border border-purple-400/40 backdrop-blur-sm p-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-white">{selected.size} selected</span>
            <Button size="sm" onClick={() => setBulkOpen(true)} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/40">
              <Send className="w-3 h-3 mr-1.5" />Bulk Outreach
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} className="border-white/20 text-gray-200 hover:bg-white/10">Clear</Button>
            <Button size="sm" variant="ghost" onClick={exportCsv} className="text-gray-300 hover:text-white">
              <Download className="w-3 h-3 mr-1.5" />Export Selected
            </Button>
          </div>
        )}

        {/* ── Influencer Table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden">
          {listLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">Loading influencers…</p>
            </div>
          ) : influencers.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-purple-600 blur-xl opacity-30" />
                <div className="relative w-20 h-20 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <Bot className="w-10 h-10 text-purple-400" />
                </div>
              </div>
              <p className="text-white text-xl font-black">No influencers yet</p>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">Use the <span className="text-purple-400 font-semibold">AI Robot Crawl</span> to auto-discover creators by niche, or add them manually.</p>
              <Button onClick={() => setCrawlOpen(true)} className="mt-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-900/40 border border-purple-400/30">
                <Bot className="w-4 h-4 mr-2" />Launch AI Crawler
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-950/40 text-[11px] uppercase tracking-widest text-gray-300 border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-3.5 text-left w-10"><input type="checkbox" checked={selected.size === influencers.length && influencers.length > 0} onChange={toggleAll} className="rounded accent-purple-500" /></th>
                    <th className="p-3.5 text-left">Creator</th>
                    <th className="p-3.5 text-left">Tier</th>
                    <th className="p-3.5 text-left">Niche</th>
                    <th className="p-3.5 text-left">Followers</th>
                    <th className="p-3.5 text-left">Platforms</th>
                    <th className="p-3.5 text-left">Contact</th>
                    <th className="p-3.5 text-left">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {influencers.map(inf => {
                    const tier = inf.computedTier || "unknown";
                    const meta = TIER_META[tier];
                    const tierDef = tierStats?.find(t => t.id === tier);
                    return (
                      <tr
                        key={inf.id}
                        onClick={() => openDetail(inf)}
                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                        title={`Open ${inf.name}'s profile, notes and conversation`}
                      >
                        <td className="p-3.5" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(inf.id)} onChange={() => toggleSel(inf.id)} className="accent-purple-500" /></td>
                        <td className="p-3.5 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.bg} border ${meta.border} flex items-center justify-center flex-shrink-0 text-base font-black ${meta.text}`}>
                              {inf.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button onClick={e => { e.stopPropagation(); openDetail(inf); }} className="font-bold text-white hover:text-purple-300 truncate block text-left max-w-[160px] text-[13px] underline-offset-2 hover:underline">
                                {inf.name}
                              </button>
                              {inf.aiSummary && <p className="text-xs text-gray-400 line-clamp-1 max-w-[160px] mt-0.5">{inf.aiSummary}</p>}
                              {inf.country && <p className="text-xs text-gray-500 mt-0.5">{inf.country}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badge}`}>
                            {meta.icon}
                            {tierDef?.emoji} {tierDef?.label || tier}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-200 font-medium">{inf.niche || "—"}</td>
                        <td className="p-3.5">
                          <span className={`font-black text-base ${meta.text}`}>{fmtFollowers(inf.followers)}</span>
                        </td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
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
                        <td className="p-3.5" onClick={e => e.stopPropagation()}>
                          <div className="space-y-1 text-xs">
                            {inf.email && (
                              <a href={`mailto:${inf.email}`} className="flex items-center gap-1.5 text-purple-300 hover:text-purple-200 truncate max-w-[150px] font-medium">
                                <Mail className="w-3 h-3 flex-shrink-0" />{inf.email}
                              </a>
                            )}
                            {inf.phone && <a href={`tel:${inf.phone}`} className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200 font-medium"><Phone className="w-3 h-3" />{inf.phone}</a>}
                            {!inf.email && !inf.phone && <span className="text-gray-600 italic">No contact</span>}
                          </div>
                        </td>
                        <td className="p-3.5" onClick={e => e.stopPropagation()}>
                          <Select value={inf.status || "new"} onValueChange={v => statusMutation.mutate({ id: inf.id, status: v })}>
                            <SelectTrigger className={`h-7 text-xs px-2.5 border rounded-full w-[115px] font-semibold ${STATUS_COLORS[inf.status || "new"] || STATUS_COLORS.new}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                              {["new","contacted","replied","converted","archived"].map(s => (
                                <SelectItem key={s} value={s} className="capitalize font-medium">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={() => openDetail(inf)} title="View profile" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openOutreach(inf)} title="Reach out" className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg">
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                            {inf.whatsapp && (
                              <a href={`https://wa.me/${inf.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"><MessageCircle className="w-3.5 h-3.5" /></Button>
                              </a>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${inf.name}?`)) deleteMutation.mutate(inf.id); }} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg">
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
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              AI Robot Crawl
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose one or more social platforms. The robot will discover creators, save them to the CRM, and let you start customized outreach immediately.
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
                <Label className="text-gray-300">Search platforms *</Label>
                <div className="space-y-1.5 mt-1 rounded-xl border border-gray-700 bg-black/20 p-3">
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

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300 space-y-1.5">
              <p><Bot className="w-3.5 h-3.5 inline mr-1.5" />The AI robot will discover creators in <b>{crawlForm.niche || "your niche"}</b> on the selected platforms, save them to the CRM, classify them by tier, and deduplicate automatically.</p>
              <p className="text-purple-400/80">
                {crawlForm.platforms.includes("youtube")
                  ? "📡 YouTube: live channel search (requires YouTube API key)"
                  : null}
              </p>
              <p className="text-purple-400/80">
                {crawlForm.platforms.filter(p => p !== "youtube").length > 0 || !crawlForm.platforms.includes("youtube")
                  ? `🤖 ${crawlForm.platforms.filter(p => p !== "youtube").join(", ") || crawlForm.platforms.join(", ")}: Groq AI generates realistic creator profiles for outreach (requires GROQ_API_KEY)`
                  : null}
              </p>
            </div>

            {crawlResults.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-emerald-200">Saved to CRM — start a conversation</p>
                    <p className="text-[11px] text-emerald-300/70">
                      {crawlResults.length} creator{crawlResults.length === 1 ? "" : "s"} added
                      {crawlSources.length ? ` via ${crawlSources.map(s => s === "youtube_api" ? "YouTube" : s === "groq_ai" ? "AI" : s).join(" + ")}` : ""}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {crawlResults.slice(0, 12).map(result => (
                    <div key={result.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{result.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {result.niche || crawlForm.niche}
                          {result.followers ? ` · ${fmtFollowers(result.followers)} followers` : ""}
                          {result.socialLinks ? ` · ${Object.keys(result.socialLinks).join(", ")}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setCrawlOpen(false);
                          openOutreach(result as Influencer);
                        }}
                        className="flex-shrink-0 bg-purple-600 hover:bg-purple-700"
                      >
                        <MessageSquareText className="w-3.5 h-3.5 mr-1.5" />Customize message
                      </Button>
                    </div>
                  ))}
                </div>
                {crawlResults.length > 12 && <p className="text-[11px] text-gray-400">Showing the first 12. All results are available in the CRM table after closing this window.</p>}
              </div>
            )}

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
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Add Influencer Manually</DialogTitle>
            <DialogDescription className="text-gray-400">Fill in what you know — at minimum a name. Tier is auto-computed from followers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Core info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Name *</Label>
                <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="Creator name" />
              </div>
              <div>
                <Label className="text-gray-300">Niche</Label>
                <Select value={addForm.niche || "custom"} onValueChange={v => { if (v !== "custom") setAddForm(f => ({ ...f, niche: v })); }}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 mt-1"><SelectValue placeholder="Select niche…" /></SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    <SelectItem value="custom">Custom…</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={addForm.niche} onChange={e => setAddForm(f => ({ ...f, niche: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="Or type custom niche" />
              </div>
              <div>
                <Label className="text-gray-300">Followers</Label>
                <Input type="number" value={addForm.followers} onChange={e => setAddForm(f => ({ ...f, followers: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="e.g. 50000" />
                {addForm.followers && (
                  <p className="text-xs mt-1" style={{ color: addForm.followers ? (() => {
                    const n = parseInt(addForm.followers);
                    if (n >= 10_000_000) return "#f59e0b";
                    if (n >= 1_000_000) return "#a855f7";
                    if (n >= 100_000) return "#3b82f6";
                    if (n >= 10_000) return "#10b981";
                    return "#6b7280";
                  })() : "#6b7280" }}>
                    {(() => {
                      const n = parseInt(addForm.followers);
                      if (n >= 10_000_000) return "👑 Global Titan";
                      if (n >= 1_000_000) return "⚡ Power Influencer";
                      if (n >= 100_000) return "🚀 Growth Engine";
                      if (n >= 10_000) return "✨ Rising Spark";
                      if (n >= 1) return "🌱 Aspiring Influencer";
                      return "";
                    })()}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-gray-300">Country (ISO-2)</Label>
                <Input value={addForm.country} onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="NG, US, GB…" />
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact Info</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300"><Mail className="w-3 h-3 inline mr-1" />Email</Label>
                  <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="contact@example.com" />
                </div>
                <div>
                  <Label className="text-gray-300"><Phone className="w-3 h-3 inline mr-1" />Phone</Label>
                  <Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="+234…" />
                </div>
                <div>
                  <Label className="text-gray-300"><MessageCircle className="w-3 h-3 inline mr-1" />WhatsApp</Label>
                  <Input value={addForm.whatsapp} onChange={e => setAddForm(f => ({ ...f, whatsapp: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="+234…" />
                </div>
                <div>
                  <Label className="text-gray-300"><Globe className="w-3 h-3 inline mr-1" />Website</Label>
                  <Input value={addForm.website} onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="https://…" />
                </div>
              </div>
            </div>

            {/* Social handles */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Social Handles <span className="text-gray-600 normal-case">(username or full URL)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300"><Instagram className="w-3 h-3 inline mr-1" />Instagram</Label>
                  <Input value={addForm.instagram} onChange={e => setAddForm(f => ({ ...f, instagram: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="@username" />
                </div>
                <div>
                  <Label className="text-gray-300"><span className="text-[10px] font-bold mr-1">TT</span>TikTok</Label>
                  <Input value={addForm.tiktok} onChange={e => setAddForm(f => ({ ...f, tiktok: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="@username" />
                </div>
                <div>
                  <Label className="text-gray-300"><Youtube className="w-3 h-3 inline mr-1" />YouTube</Label>
                  <Input value={addForm.youtube} onChange={e => setAddForm(f => ({ ...f, youtube: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="@channel or URL" />
                </div>
                <div>
                  <Label className="text-gray-300"><Twitter className="w-3 h-3 inline mr-1" />X / Twitter</Label>
                  <Input value={addForm.twitter} onChange={e => setAddForm(f => ({ ...f, twitter: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="@username" />
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-300"><Globe className="w-3 h-3 inline mr-1" />Facebook</Label>
                  <Input value={addForm.facebook} onChange={e => setAddForm(f => ({ ...f, facebook: e.target.value }))} className="bg-gray-800 border-gray-700 mt-1" placeholder="page-name or URL" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Bio / Description</Label>
              <Textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} rows={2} className="bg-gray-800 border-gray-700 mt-1" placeholder="Short bio or notes about this creator" />
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
        <DialogContent className="bg-gray-950 border-purple-500/20 text-white max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          {selectedInfluencer && (() => {
            const tier = selectedInfluencer.computedTier || "unknown";
            const meta = TIER_META[tier];
            const tierDef = tierStats?.find(t => t.id === tier);
            const orderedMessages = messages ? [...messages].reverse() : [];
            return (
              <>
                <DialogHeader className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-purple-950/50 to-gray-950">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.bg} border ${meta.border} flex items-center justify-center text-2xl font-black ${meta.text} flex-shrink-0`}>
                        {selectedInfluencer.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <DialogTitle className="text-xl truncate">{selectedInfluencer.name}</DialogTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${meta.badge}`}>
                            {meta.icon}{tierDef?.emoji} {tierDef?.label || tier}
                          </span>
                          {selectedInfluencer.niche && <span className="text-xs text-gray-400">{selectedInfluencer.niche}</span>}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[selectedInfluencer.status || "new"]}`}>
                            {selectedInfluencer.status || "new"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MessageSquareText className="w-4 h-4 text-purple-400" />
                        {messages?.length || 0} timeline {messages?.length === 1 ? "entry" : "entries"}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditMode(mode => !mode)}
                        className="border-purple-400/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20"
                      >
                        {editMode ? <X className="w-3.5 h-3.5 mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                        {editMode ? "Close editor" : "Edit profile"}
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] min-h-[560px]">
                  {/* Profile sidebar */}
                  <aside className="border-b lg:border-b-0 lg:border-r border-white/10 p-5 space-y-4 bg-black/10">
                    {editMode && (
                      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 space-y-3">
                        <div>
                          <p className="text-sm font-bold text-white">Edit influencer profile</p>
                          <p className="text-[11px] text-purple-200/70 mt-1">Update contact details and social channels, then save.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input aria-label="Influencer name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="bg-black/30 border-gray-700 text-white text-xs" />
                          <Input aria-label="Niche" value={editForm.niche} onChange={e => setEditForm(f => ({ ...f, niche: e.target.value }))} placeholder="Niche" className="bg-black/30 border-gray-700 text-white text-xs" />
                          <Input aria-label="Country" value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} placeholder="Country" className="bg-black/30 border-gray-700 text-white text-xs" />
                          <Input aria-label="Followers" type="number" value={editForm.followers} onChange={e => setEditForm(f => ({ ...f, followers: e.target.value }))} placeholder="Followers" className="bg-black/30 border-gray-700 text-white text-xs" />
                        </div>
                        <Input aria-label="Email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="bg-black/30 border-gray-700 text-white text-xs" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input aria-label="Phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="bg-black/30 border-gray-700 text-white text-xs" />
                          <Input aria-label="WhatsApp" value={editForm.whatsapp} onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="WhatsApp" className="bg-black/30 border-gray-700 text-white text-xs" />
                        </div>
                        <Input aria-label="Website" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} placeholder="Website URL" className="bg-black/30 border-gray-700 text-white text-xs" />
                        <Textarea aria-label="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Bio / description" className="bg-black/30 border-gray-700 text-white text-xs resize-none" />

                        <div className="pt-1">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-purple-200 mb-2">Social channels</p>
                          <div className="space-y-2">
                            {Object.entries(editForm.socialLinks).filter(([, value]) => value).map(([platform, url]) => (
                              <div key={platform} className="flex items-center gap-2">
                                <span className="w-16 text-[11px] text-gray-300 capitalize truncate">{platform}</span>
                                <Input value={url} onChange={e => setEditForm(f => ({ ...f, socialLinks: { ...f.socialLinks, [platform]: e.target.value } }))} className="bg-black/30 border-gray-700 text-white text-xs h-8" />
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditForm(f => {
                                  const next = { ...f.socialLinks };
                                  delete next[platform];
                                  return { ...f, socialLinks: next };
                                })} className="h-8 w-8 p-0 text-red-300 hover:bg-red-500/10"><X className="w-3.5 h-3.5" /></Button>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
                              <SelectTrigger className="w-24 h-8 bg-black/30 border-gray-700 text-white text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700">
                                {PLATFORMS.map(platform => <SelectItem key={platform} value={platform} className="capitalize text-xs">{platform}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input value={newSocialUrl} onChange={e => setNewSocialUrl(e.target.value)} placeholder="Profile URL" className="bg-black/30 border-gray-700 text-white text-xs h-8" />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!newSocialUrl.trim()}
                              onClick={() => {
                                setEditForm(f => ({ ...f, socialLinks: { ...f.socialLinks, [newSocialPlatform]: newSocialUrl.trim() } }));
                                setNewSocialUrl("");
                              }}
                              className="h-8 bg-purple-600 hover:bg-purple-700"
                            >Add</Button>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button type="button" onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.name.trim()} className="flex-1 bg-purple-600 hover:bg-purple-700">
                            {editMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                            Save changes
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="border-gray-700 text-gray-300">Cancel</Button>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`rounded-xl bg-gradient-to-br ${meta.bg} border ${meta.border} p-3`}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Followers</p>
                        <p className={`text-xl font-black ${meta.text}`}>{fmtFollowers(selectedInfluencer.followers)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Added</p>
                        <p className="text-sm font-bold text-white mt-1">{selectedInfluencer.createdAt ? new Date(selectedInfluencer.createdAt).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Contact details</p>
                      {selectedInfluencer.email && (
                        <a href={`mailto:${selectedInfluencer.email}`} className="flex items-center gap-2 text-purple-300 hover:text-purple-200 truncate">
                          <Mail className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{selectedInfluencer.email}</span>
                        </a>
                      )}
                      {selectedInfluencer.phone && (
                        <a href={`tel:${selectedInfluencer.phone}`} className="flex items-center gap-2 text-blue-300 hover:text-blue-200">
                          <Phone className="w-4 h-4 flex-shrink-0" /> {selectedInfluencer.phone}
                        </a>
                      )}
                      {selectedInfluencer.country && (
                        <div className="flex items-center gap-2 text-gray-400"><MapPin className="w-4 h-4" />{selectedInfluencer.country}</div>
                      )}
                      {selectedInfluencer.lastContactedAt && (
                        <div className="flex items-center gap-2 text-gray-400"><Clock3 className="w-4 h-4" />Last contacted {new Date(selectedInfluencer.lastContactedAt).toLocaleDateString()}</div>
                      )}
                      {!selectedInfluencer.email && !selectedInfluencer.phone && !selectedInfluencer.country && <p className="text-xs text-gray-600 italic">No contact details yet</p>}
                    </div>

                    {selectedInfluencer.description && (
                      <div className="rounded-xl bg-gray-800/30 border border-gray-700 p-3 text-xs text-gray-300 leading-relaxed">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">About</p>
                        {selectedInfluencer.description}
                      </div>
                    )}

                    {Object.entries(selectedInfluencer.socialLinks || {}).filter(([, v]) => v).length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Social platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedInfluencer.socialLinks || {}).filter(([, v]) => v).map(([k, v]) => (
                            <a key={k} href={v as string} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 border border-gray-700 transition-colors">
                              {PLATFORM_ICONS[k] || <Globe className="w-3 h-3" />}<span className="capitalize">{k}</span><ArrowUpRight className="w-3 h-3 opacity-50" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => { setDetailOpen(false); openOutreach(selectedInfluencer); }} className="flex-1 bg-purple-600 hover:bg-purple-700">
                        <Send className="w-4 h-4 mr-2" />Reach out
                      </Button>
                      {selectedInfluencer.website && (
                        <a href={selectedInfluencer.website} target="_blank" rel="noreferrer">
                          <Button variant="outline" className="border-gray-700 text-gray-300"><ExternalLink className="w-4 h-4" /></Button>
                        </a>
                      )}
                    </div>
                  </aside>

                  {/* Conversation and notes */}
                  <section className="p-5 sm:p-6 flex flex-col min-w-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-purple-400" />Conversation & notes</h3>
                        <p className="text-xs text-gray-500 mt-1">Outreach, replies, and private admin notes in one timeline.</p>
                      </div>
                      {messages && messages.length > 0 && <span className="text-xs text-gray-500">{messages.length} total</span>}
                    </div>

                    <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto pr-1 space-y-3">
                      {!messages && <div className="h-full flex items-center justify-center text-sm text-gray-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading timeline…</div>}
                      {messages && messages.length === 0 && (
                        <div className="h-full min-h-[180px] rounded-2xl border border-dashed border-gray-700 flex flex-col items-center justify-center text-center px-6">
                          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3"><MessageSquareText className="w-5 h-5 text-purple-400" /></div>
                          <p className="text-sm font-semibold text-gray-300">No conversation yet</p>
                          <p className="text-xs text-gray-500 mt-1">Send outreach or add an internal note to start the timeline.</p>
                        </div>
                      )}
                      {orderedMessages.map(m => {
                        const isNote = m.channel === "note";
                        const isInbound = m.direction === "inbound";
                        return (
                          <div key={m.id} className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
                            <div className={`max-w-[92%] rounded-2xl border p-3 ${isNote ? "bg-amber-500/10 border-amber-500/25" : isInbound ? "bg-blue-500/10 border-blue-500/20" : "bg-purple-500/10 border-purple-500/20"}`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                {isNote ? <StickyNote className="w-3.5 h-3.5 text-amber-300" /> : isInbound ? <UserRound className="w-3.5 h-3.5 text-blue-300" /> : <Send className="w-3.5 h-3.5 text-purple-300" />}
                                <span className={`text-[11px] font-bold ${isNote ? "text-amber-300" : isInbound ? "text-blue-300" : "text-purple-300"}`}>
                                  {isNote ? "Internal admin note" : isInbound ? "Influencer reply" : `${m.channel || "outreach"} · outbound`}
                                </span>
                                <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-1 whitespace-nowrap">
                                  <CalendarDays className="w-3 h-3" />{m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{m.body || "No message content"}</p>
                              {!isNote && m.status && <p className="text-[10px] text-gray-500 mt-2 capitalize">Status: {m.status}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10">
                      <Label className="text-gray-300 flex items-center gap-2 mb-2"><StickyNote className="w-4 h-4 text-amber-300" />Add private admin note</Label>
                      <Textarea
                        value={noteBody}
                        onChange={e => setNoteBody(e.target.value)}
                        rows={3}
                        placeholder="Record a follow-up, preference, objection, or next step…"
                        className="bg-black/30 border-gray-700 text-white placeholder:text-gray-600 resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <Button onClick={() => noteMutation.mutate()} disabled={noteMutation.isPending || !noteBody.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">
                          {noteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <StickyNote className="w-4 h-4 mr-2" />}
                          Save note
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
