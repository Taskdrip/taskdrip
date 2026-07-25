import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, BarChart3, Globe, Search, Zap, Bot, FileText,
  AlertCircle, CheckCircle, Shield, Target, Brain, Users,
  TrendingUp, Eye, Lock, Play, RefreshCw, Plus, Trash2,
  ExternalLink, Save, Settings, ChevronDown, ChevronUp,
  Monitor, Smartphone, Tablet, Award, Link, Image as ImageIcon,
  Activity, Loader2, Copy, Download, Tag, Scan, Database,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardData {
  totalIndexed: number;
  staticPages: number;
  blogPosts: number;
  products: number;
  courses: number;
  campaigns: number;
  users: number;
  seoConfiguredPages: number;
  totalConfigurablePages: number;
  missingMeta: number;
  ga4Connected: boolean;
  clarityConnected: boolean;
  ga4Id: string | null;
  clarityId: string | null;
  googleVerification: string | null;
}

interface AuditIssue {
  type: string;
  severity: "high" | "medium" | "low";
  path: string;
  detail: string;
}

interface AuditData {
  issues: AuditIssue[];
  summary: { total: number; high: number; medium: number; low: number };
  auditedAt: string;
}

interface Keyword {
  id: string;
  keyword: string;
  targetUrl?: string;
  notes?: string;
  createdAt: string;
}

interface Competitor {
  name: string;
  domain: string;
  category: string;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "purple", icon: Icon }: {
  label: string; value: string | number; sub?: string;
  color?: "purple" | "emerald" | "blue" | "amber" | "rose" | "teal";
  icon: any;
}) {
  const colors = {
    purple: "from-purple-600 to-indigo-600",
    emerald: "from-emerald-500 to-teal-600",
    blue: "from-blue-500 to-cyan-600",
    amber: "from-amber-400 to-orange-500",
    rose: "from-rose-500 to-pink-600",
    teal: "from-teal-500 to-green-600",
  };
  const bgs = {
    purple: "bg-purple-50 border-purple-100",
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100",
    rose: "bg-rose-50 border-rose-100",
    teal: "bg-teal-50 border-teal-100",
  };
  const texts = {
    purple: "text-purple-700",
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
    teal: "text-teal-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${bgs[color]}`}>
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-4.5 h-4.5 text-white w-5 h-5" />
      </div>
      <p className={`text-2xl font-black ${texts[color]}`}>{value}</p>
      <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: dash, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/admin/seo-intelligence/dashboard"],
  });
  const { data: crawlStatus } = useQuery<{ lastCrawlAt: string | null; lastCrawlTotal: number }>({
    queryKey: ["/api/admin/seo-intelligence/crawl-status"],
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  const d = dash!;

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${d?.ga4Connected ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d?.ga4Connected ? "bg-emerald-500" : "bg-gray-300"}`}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">Google Analytics 4</p>
            {d?.ga4Connected
              ? <p className="text-xs text-emerald-600 font-medium">✅ Connected · {d.ga4Id}</p>
              : <p className="text-xs text-gray-500">Not connected → Settings tab</p>}
          </div>
        </div>
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${d?.clarityConnected ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d?.clarityConnected ? "bg-blue-500" : "bg-gray-300"}`}>
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">Microsoft Clarity</p>
            {d?.clarityConnected
              ? <p className="text-xs text-blue-600 font-medium">✅ Connected · {d.clarityId}</p>
              : <p className="text-xs text-gray-500">Not connected → Settings tab</p>}
          </div>
        </div>
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${d?.googleVerification ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d?.googleVerification ? "bg-violet-500" : "bg-gray-300"}`}>
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">Search Console</p>
            {d?.googleVerification
              ? <p className="text-xs text-violet-600 font-medium">✅ Verified · taskdrip.online</p>
              : <p className="text-xs text-gray-500">Verified ✅ (already done)</p>}
          </div>
        </div>
      </div>

      {/* Indexed Pages */}
      <div>
        <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-600" />Content Indexed in Sitemap
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total URLs" value={d?.totalIndexed || 0} icon={Globe} color="purple" />
          <StatCard label="Static Pages" value={d?.staticPages || 0} icon={FileText} color="blue" />
          <StatCard label="Blog Posts" value={d?.blogPosts || 0} icon={FileText} color="emerald" />
          <StatCard label="Products" value={d?.products || 0} icon={Tag} color="amber" />
          <StatCard label="Courses" value={d?.courses || 0} icon={Award} color="teal" />
          <StatCard label="Campaigns" value={d?.campaigns || 0} icon={Target} color="rose" />
        </div>
      </div>

      {/* SEO Configuration Health */}
      <div>
        <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />SEO Configuration Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-700 text-sm">Pages Configured</p>
              <Badge className="bg-emerald-100 text-emerald-700">{d?.seoConfiguredPages}/{d?.totalConfigurablePages}</Badge>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.round(((d?.seoConfiguredPages || 0) / (d?.totalConfigurablePages || 16)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">{Math.round(((d?.seoConfiguredPages || 0) / (d?.totalConfigurablePages || 16)) * 100)}% complete</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            <p className="font-semibold text-gray-700 text-sm mb-3">Last Crawl</p>
            {crawlStatus?.lastCrawlAt ? (
              <>
                <p className="text-lg font-black text-gray-900">{crawlStatus.lastCrawlTotal} URLs</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(crawlStatus.lastCrawlAt).toLocaleString()}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Never crawled — run the crawler in the Crawler tab</p>
            )}
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            <p className="font-semibold text-gray-700 text-sm mb-3">Quick Actions</p>
            <div className="space-y-2">
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-purple-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />View sitemap.xml
              </a>
              <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-purple-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />View robots.txt
              </a>
              <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />Google Search Console
              </a>
              <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-orange-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />GA4 Dashboard
              </a>
              <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />Microsoft Clarity
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* GSC Info */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-blue-900 text-base">Google Search Console — Verified ✅</h3>
            <p className="text-sm text-blue-700 mt-1">
              taskdrip.online is verified in Google Search Console. View clicks, impressions, CTR, and position data directly in the console.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="https://search.google.com/search-console/performance/search-analytics" target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Performance Report
                </Button>
              </a>
              <a href="https://search.google.com/search-console/coverage" target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                  <Globe className="w-3.5 h-3.5 mr-1.5" />Coverage & Indexing
                </Button>
              </a>
              <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />Submit Sitemap
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Clicks", icon: "👆", desc: "Check in GSC Performance" },
            { label: "Impressions", icon: "👁️", desc: "Check in GSC Performance" },
            { label: "Avg CTR", icon: "📊", desc: "Check in GSC Performance" },
            { label: "Avg Position", icon: "📍", desc: "Check in GSC Performance" },
          ].map(({ label, icon, desc }) => (
            <div key={label} className="rounded-xl bg-white/70 border border-blue-200 p-3 text-center">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="font-bold text-sm text-blue-800">{label}</p>
              <p className="text-xs text-blue-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<any>({ queryKey: ["/api/admin/seo-intelligence/settings"] });
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings]);

  const cur = form || settings || {};
  const set = (k: string, v: string) => setForm((p: any) => ({ ...(p || settings || {}), [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/seo-intelligence/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/dashboard"] });
      toast({ title: "Settings saved!", description: "Analytics codes injected into all pages." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8">
      {/* GA4 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">Google Analytics 4</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your Measurement ID to auto-inject GA4 tracking across all pages.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-sm font-semibold mb-2 block">GA4 Measurement ID</Label>
            <Input value={cur.gaTrackingId || ""} onChange={e => set("gaTrackingId", e.target.value)} placeholder="G-XXXXXXXXXX" className="font-mono" />
            <p className="text-xs text-gray-400 mt-1.5">GA Admin → Data Streams → Measurement ID</p>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 block">Google Tag Manager ID <span className="font-normal text-gray-400">(optional)</span></Label>
            <Input value={cur.gtmId || ""} onChange={e => set("gtmId", e.target.value)} placeholder="GTM-XXXXXXX" className="font-mono" />
            <p className="text-xs text-gray-400 mt-1.5">If using GTM for advanced event tracking</p>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
          <p className="text-xs text-orange-700 font-semibold mb-1">How to get your GA4 Measurement ID</p>
          <ol className="text-xs text-orange-600 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener" className="underline">analytics.google.com</a> → Admin</li>
            <li>Data Streams → Web stream for taskdrip.online</li>
            <li>Copy the Measurement ID (starts with G-)</li>
          </ol>
        </div>
      </div>

      {/* Microsoft Clarity */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">Microsoft Clarity</h2>
            <p className="text-gray-500 text-sm mt-1">Session recordings, heatmaps, and click maps — free with no limits. See exactly how users interact with taskdrip.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Clarity Project ID</Label>
            <Input value={cur.clarityId || ""} onChange={e => set("clarityId", e.target.value)} placeholder="xxxxxxxxxx" className="font-mono" />
            <p className="text-xs text-gray-400 mt-1.5">Found in Clarity → Settings → Setup</p>
          </div>
          <div className="flex flex-col justify-center">
            <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open Microsoft Clarity
              </Button>
            </a>
            <p className="text-xs text-gray-400 mt-2 text-center">Free — unlimited sessions & recordings</p>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-700 font-semibold mb-1">Clarity gives you:</p>
          <div className="grid grid-cols-2 gap-1">
            {["Session recordings", "Heatmaps", "Click maps", "Dead click detection", "Rage click alerts", "JavaScript error tracking"].map(f => (
              <p key={f} className="text-xs text-blue-600">✓ {f}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Search Console Verification */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">Search Engine Verification</h2>
            <p className="text-gray-500 text-sm mt-1">Verify ownership with Google and Bing to unlock full Search Console features.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Google Site Verification</Label>
            <Input value={cur.googleSiteVerification || ""} onChange={e => set("googleSiteVerification", e.target.value)} placeholder="google-site-verification code..." className="font-mono text-xs" />
            <p className="text-xs text-gray-400 mt-1.5">Already verified via Search Console → will inject meta tag</p>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 block">Bing Site Verification</Label>
            <Input value={cur.bingVerification || ""} onChange={e => set("bingVerification", e.target.value)} placeholder="Bing verification code..." className="font-mono text-xs" />
            <p className="text-xs text-gray-400 mt-1.5">From Bing Webmaster Tools → Verify Ownership</p>
          </div>
        </div>
      </div>

      {/* Analytics Toggle */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">Analytics Injection</p>
            <p className="text-sm text-gray-500 mt-1">When enabled, GA4 + Clarity scripts are auto-injected into every page's &lt;head&gt;</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={cur.analyticsEnabled !== false}
              onChange={e => set("analyticsEnabled", e.target.checked ? "true" : "false")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(cur)}
          disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8"
        >
          {saveMutation.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            : <><Save className="w-4 h-4 mr-2" />Save & Inject Analytics</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Crawler Tab ──────────────────────────────────────────────────────────────
function CrawlerTab() {
  const { toast } = useToast();
  const [crawlLog, setCrawlLog] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const crawlMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/seo-intelligence/crawl", {}),
    onSuccess: async (data: any) => {
      const b = data.breakdown;
      const logs = [
        `🔍 Scanning static pages...`,
        `✅ ${b.staticPages} static pages indexed`,
        `🔍 Scanning blog posts...`,
        `✅ ${b.blogPosts} published blog posts added`,
        `🔍 Scanning shop products...`,
        `✅ ${b.products} products indexed`,
        `🔍 Scanning published courses...`,
        `✅ ${b.courses} courses indexed`,
        `🔍 Scanning creator profiles...`,
        `✅ ${b.creators} creator profiles processed`,
        `📤 Pinging Google with sitemap...`,
        data.pings.find((p: any) => p.engine === "Google")?.status === "✅ Pinged"
          ? `✅ Google sitemap ping successful`
          : `⚠️ Google ping: ${data.pings.find((p: any) => p.engine === "Google")?.status}`,
        `📤 Pinging Bing with sitemap...`,
        data.pings.find((p: any) => p.engine === "Bing")?.status === "✅ Pinged"
          ? `✅ Bing sitemap ping successful`
          : `⚠️ Bing ping: ${data.pings.find((p: any) => p.engine === "Bing")?.status}`,
        `✅ Crawl complete! ${data.totalUrls} URLs in sitemap`,
        `📍 Sitemap URL: ${data.sitemapUrl}`,
      ];

      for (let i = 0; i < logs.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        setCrawlLog(prev => [...prev, logs[i]]);
      }
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/crawl-status"] });
      toast({ title: "Crawl complete!", description: `${data.totalUrls} URLs in sitemap, search engines pinged.` });
    },
    onError: (e: any) => toast({ title: "Crawl failed", description: e.message, variant: "destructive" }),
  });

  const handleCrawl = () => {
    setCrawlLog([]);
    setResult(null);
    crawlMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">Automatic Content Crawler</h2>
            <p className="text-gray-500 text-sm mt-1">
              Crawls all content in the DB, rebuilds the sitemap, and pings Google & Bing to re-index immediately.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: FileText, label: "Blog Posts", color: "from-blue-500 to-indigo-600", desc: "Published posts" },
            { icon: Tag, label: "Shop Products", color: "from-emerald-500 to-teal-600", desc: "Active products" },
            { icon: Users, label: "Creator Profiles", color: "from-violet-500 to-purple-600", desc: "Public profiles" },
            { icon: Award, label: "Courses", color: "from-amber-400 to-orange-500", desc: "Published courses" },
          ].map(({ icon: Icon, label, color, desc }) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white`}>
              <Icon className="w-6 h-6 mb-2 text-white/80" />
              <p className="font-bold text-sm">{label}</p>
              <p className="text-white/60 text-xs">{desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCrawl}
            disabled={crawlMutation.isPending}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
          >
            {crawlMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Crawling…</>
              : <><Play className="w-4 h-4 mr-2" />Run Crawler Now</>}
          </Button>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
            <Button variant="outline"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />View Sitemap</Button>
          </a>
          <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer">
            <Button variant="outline"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Submit to Google</Button>
          </a>
        </div>
      </div>

      {crawlLog.length > 0 && (
        <div className="rounded-2xl bg-gray-950 border border-gray-800 p-5">
          <p className="font-bold text-green-400 text-sm mb-3 flex items-center gap-2">
            <Scan className="w-4 h-4" />Crawler Output
          </p>
          <div className="font-mono text-xs text-green-300 space-y-1 max-h-64 overflow-y-auto">
            {crawlLog.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-500 select-none">{String(i + 1).padStart(2, "0")}</span>
                <span>{line}</span>
              </div>
            ))}
            {crawlMutation.isPending && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Processing…
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
          <p className="font-bold text-emerald-800 mb-3">✅ Crawl Results</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(result.breakdown).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white border border-emerald-200 p-3 text-center">
                <p className="text-xl font-black text-emerald-700">{String(v)}</p>
                <p className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Engine Submission */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-600" />Submit to Search Engines
        </h3>
        <div className="space-y-3">
          {[
            { name: "Google Search Console", url: "https://search.google.com/search-console/sitemaps", icon: "🔍", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700" },
            { name: "Bing Webmaster Tools", url: "https://www.bing.com/webmasters", icon: "🔵", color: "border-sky-200 bg-sky-50", textColor: "text-sky-700" },
            { name: "IndexNow (Instant indexing)", url: "https://www.indexnow.org", icon: "⚡", color: "border-yellow-200 bg-yellow-50", textColor: "text-yellow-700" },
            { name: "Yandex Webmaster", url: "https://webmaster.yandex.com", icon: "🟠", color: "border-orange-200 bg-orange-50", textColor: "text-orange-700" },
          ].map(({ name, url, icon, color, textColor }) => (
            <a key={name} href={url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center justify-between p-4 rounded-xl border ${color} hover:brightness-95 transition-all`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className={`font-semibold text-sm ${textColor}`}>{name}</p>
                  <p className="text-xs text-gray-500">Sitemap: https://taskdrip.online/sitemap.xml</p>
                </div>
              </div>
              <ExternalLink className={`w-4 h-4 ${textColor}`} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Keyword Monitor Tab ──────────────────────────────────────────────────────
function KeywordMonitorTab() {
  const { toast } = useToast();
  const [newKw, setNewKw] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const { data: keywords = [], isLoading } = useQuery<Keyword[]>({
    queryKey: ["/api/admin/seo-intelligence/keywords"],
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/seo-intelligence/keywords", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/keywords"] });
      setNewKw("");
      setNewUrl("");
      toast({ title: "Keyword added!" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/seo-intelligence/keywords/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/keywords"] }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <h2 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />Add Keywords to Track
        </h2>
        <div className="flex gap-3">
          <Input
            value={newKw}
            onChange={e => setNewKw(e.target.value)}
            placeholder="e.g. earn crypto tasks, web3 influencer marketing..."
            className="flex-1"
            onKeyDown={e => e.key === "Enter" && newKw.trim() && addMutation.mutate({ keyword: newKw, targetUrl: newUrl })}
          />
          <Input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="Target URL (optional)"
            className="w-64"
          />
          <Button
            onClick={() => newKw.trim() && addMutation.mutate({ keyword: newKw, targetUrl: newUrl })}
            disabled={addMutation.isPending || !newKw.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5" />Add Keyword
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />Tracked Keywords
            <Badge className="bg-purple-100 text-purple-700">{keywords.length}</Badge>
          </h3>
          <div className="flex gap-2">
            <a href="https://search.google.com/search-console/performance/search-analytics" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />View in GSC
              </Button>
            </a>
            <a href="https://trends.google.com" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />Google Trends
              </Button>
            </a>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" /></div>
        ) : keywords.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No keywords tracked yet. Add your first keyword above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-12 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
              <div className="col-span-5">Keyword</div>
              <div className="col-span-4">Target URL</div>
              <div className="col-span-2">Added</div>
              <div className="col-span-1" />
            </div>
            {keywords.map(kw => (
              <div key={kw.id} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-gray-50 text-sm group">
                <div className="col-span-5 font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  {kw.keyword}
                </div>
                <div className="col-span-4 text-gray-500 text-xs truncate">
                  {kw.targetUrl
                    ? <a href={kw.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{kw.targetUrl}</a>
                    : "—"}
                </div>
                <div className="col-span-2 text-gray-400 text-xs">
                  {new Date(kw.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => deleteMutation.mutate(kw.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Search Console live data hint */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-5">
        <p className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <Search className="w-4 h-4" />Get Live Keyword Data from Google Search Console
        </p>
        <p className="text-sm text-blue-700 mb-3">
          Since taskdrip.online is verified in GSC, you can see real keyword positions, clicks, and impressions there.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="https://search.google.com/search-console/performance/search-analytics" target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              <ExternalLink className="w-3 h-3 mr-1.5" />Open Performance Report
            </Button>
          </a>
          <a href="https://ahrefs.com/keyword-generator" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 text-xs">
              <ExternalLink className="w-3 h-3 mr-1.5" />Ahrefs Keyword Tool (free)
            </Button>
          </a>
          <a href="https://trends.google.com/trends/explore" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 text-xs">
              <ExternalLink className="w-3 h-3 mr-1.5" />Google Trends
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Content Studio Tab ───────────────────────────────────────────────────────
function ContentStudioTab() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [type, setType] = useState("brief");
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/seo-intelligence/content-studio", data),
    onSuccess: (data: any) => {
      setResult(data.result || "");
      setIsGenerating(false);
    },
    onError: (e: any) => {
      setIsGenerating(false);
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) return toast({ title: "Enter a topic first", variant: "destructive" });
    setResult("");
    setIsGenerating(true);
    generateMutation.mutate({ type, topic, keywords });
  };

  const contentTypes = [
    { value: "brief", label: "SEO Brief", icon: FileText, desc: "Full content strategy brief with outline" },
    { value: "outline", label: "Blog Outline", icon: FileText, desc: "Structured article outline with headings" },
    { value: "title", label: "Title Ideas", icon: Tag, desc: "10 click-worthy title variations" },
    { value: "meta", label: "Meta Descriptions", icon: Globe, desc: "5 optimized meta descriptions" },
    { value: "faq", label: "FAQ Section", icon: Brain, desc: "10 Q&A pairs for FAQ schema" },
    { value: "internal_links", label: "Internal Links", icon: Link, desc: "Internal linking suggestions" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">AI Content Studio</h2>
            <p className="text-gray-500 text-sm mt-1">Generate SEO briefs, blog outlines, titles, meta descriptions, FAQs, and internal link suggestions using Gemini AI.</p>
          </div>
        </div>

        {/* Content Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {contentTypes.map(ct => (
            <button
              key={ct.value}
              onClick={() => setType(ct.value)}
              className={`p-3 rounded-xl border text-left transition-all ${type === ct.value ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ct.icon className={`w-4 h-4 ${type === ct.value ? "text-purple-600" : "text-gray-400"}`} />
                <span className={`text-sm font-bold ${type === ct.value ? "text-purple-700" : "text-gray-700"}`}>{ct.label}</span>
              </div>
              <p className="text-xs text-gray-400">{ct.desc}</p>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Topic / Subject *</Label>
            <Input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. How to earn money as a social media influencer in Nigeria..."
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 block">Target Keywords <span className="font-normal text-gray-400">(optional)</span></Label>
            <Input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="earn online, crypto rewards, influencer marketing Nigeria..."
              className="text-sm"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating with Gemini AI…</>
              : <><Zap className="w-4 h-4 mr-2" />Generate</>}
          </Button>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <p className="font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              {contentTypes.find(t => t.value === type)?.label} — Generated
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(result); toast({ title: "Copied to clipboard!" }); }}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />Copy
            </Button>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Site Audit Tab ───────────────────────────────────────────────────────────
function SiteAuditTab() {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const { data: audit, isLoading, refetch, isFetching } = useQuery<AuditData>({
    queryKey: ["/api/admin/seo-intelligence/audit"],
    enabled: false,
  });

  const runAudit = () => {
    refetch();
  };

  const severityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const typeIcons: Record<string, any> = {
    missing_meta: AlertCircle,
    missing_meta_title: AlertCircle,
    missing_meta_desc: AlertCircle,
    long_meta_title: AlertCircle,
    long_meta_desc: AlertCircle,
    missing_og: Globe,
    missing_image: ImageIcon,
    missing_title: AlertCircle,
  };

  const filteredIssues = (audit?.issues || []).filter(i =>
    severityFilter === "all" || i.severity === severityFilter
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Scan className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">Site Audit</h2>
            <p className="text-gray-500 text-sm mt-1">
              Automatically detects SEO issues: missing meta tags, duplicate titles, broken images, missing alt text, and more.
            </p>
          </div>
        </div>
        <Button
          onClick={runAudit}
          disabled={isFetching}
          className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
        >
          {isFetching
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Audit…</>
            : <><Play className="w-4 h-4 mr-2" />Run Site Audit</>}
        </Button>
      </div>

      {audit && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-center">
              <p className="text-2xl font-black text-gray-900">{audit.summary.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total Issues</p>
            </div>
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center">
              <p className="text-2xl font-black text-red-700">{audit.summary.high}</p>
              <p className="text-xs text-red-600 mt-1">High Priority</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-2xl font-black text-amber-700">{audit.summary.medium}</p>
              <p className="text-xs text-amber-600 mt-1">Medium Priority</p>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-center">
              <p className="text-2xl font-black text-blue-700">{audit.summary.low}</p>
              <p className="text-xs text-blue-600 mt-1">Low Priority</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "high", "medium", "low"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                  severityFilter === s ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                }`}
              >
                {s} {s !== "all" && `(${audit.summary[s as keyof typeof audit.summary]})`}
              </button>
            ))}
          </div>

          {/* Issues List */}
          {filteredIssues.length === 0 ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-emerald-800">No {severityFilter !== "all" ? severityFilter : ""} issues found!</p>
              <p className="text-sm text-emerald-600 mt-1">Your SEO configuration is in great shape.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <div className="col-span-2">Severity</div>
                <div className="col-span-4">Page/URL</div>
                <div className="col-span-6">Issue</div>
              </div>
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {filteredIssues.map((issue, i) => {
                  const Icon = typeIcons[issue.type] || AlertCircle;
                  return (
                    <div key={i} className="grid grid-cols-12 px-5 py-3 items-center text-sm hover:bg-gray-50">
                      <div className="col-span-2">
                        <Badge className={`text-xs border ${severityColors[issue.severity]}`}>
                          {issue.severity}
                        </Badge>
                      </div>
                      <div className="col-span-4 text-xs font-mono text-gray-600 truncate">{issue.path}</div>
                      <div className="col-span-6 flex items-start gap-2 text-gray-700">
                        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                        {issue.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Audited at {new Date(audit.auditedAt).toLocaleString()}</span>
            <Button size="sm" variant="outline" onClick={runAudit} disabled={isFetching}>
              <RefreshCw className="w-3 h-3 mr-1.5" />Re-run Audit
            </Button>
          </div>
        </>
      )}

      {!audit && !isFetching && (
        <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-300 p-12 text-center">
          <Scan className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">Click "Run Site Audit" to scan for SEO issues</p>
          <p className="text-gray-400 text-sm mt-1">Checks all pages for missing meta tags, missing OG data, duplicate titles, and more</p>
        </div>
      )}
    </div>
  );
}

// ─── Competitor Tracker Tab ───────────────────────────────────────────────────
function CompetitorTrackerTab() {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Competitor[]>([]);

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["/api/admin/seo-intelligence/competitors"],
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/seo-intelligence/competitors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/competitors"] });
      setEditing(false);
      toast({ title: "Competitors saved!" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const startEdit = () => {
    setEditData([...competitors]);
    setEditing(true);
  };

  const addCompetitor = () => setEditData(p => [...p, { name: "", domain: "", category: "" }]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-lg">Competitor Tracker</h2>
              <p className="text-gray-500 text-sm mt-1">Track competitors and get direct links to compare rankings, backlinks, and content gaps.</p>
            </div>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Settings className="w-3.5 h-3.5 mr-1.5" />Manage Competitors
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            {editData.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-center">
                <Input
                  value={c.name}
                  onChange={e => setEditData(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Competitor name"
                  className="text-sm"
                />
                <Input
                  value={c.domain}
                  onChange={e => setEditData(prev => prev.map((x, j) => j === i ? { ...x, domain: e.target.value } : x))}
                  placeholder="domain.com"
                  className="text-sm font-mono"
                />
                <div className="flex gap-2">
                  <Input
                    value={c.category}
                    onChange={e => setEditData(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}
                    placeholder="Category"
                    className="text-sm"
                  />
                  <button onClick={() => setEditData(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button size="sm" variant="outline" onClick={addCompetitor}><Plus className="w-3.5 h-3.5 mr-1.5" />Add</Button>
              <Button size="sm" onClick={() => saveMutation.mutate({ competitors: editData })} disabled={saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Save className="w-3.5 h-3.5 mr-1.5" />Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map(c => (
              <div key={c.domain} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <span className="text-lg font-black text-gray-600">{c.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.domain} · {c.category}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`https://ahrefs.com/website-traffic/?url=https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <TrendingUp className="w-3 h-3" />Traffic (Ahrefs)
                  </a>
                  <a href={`https://www.semrush.com/analytics/overview/?q=${c.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-purple-600 hover:underline p-2 rounded-lg bg-purple-50 border border-purple-100">
                    <Search className="w-3 h-3" />Keywords (SEMrush)
                  </a>
                  <a href={`https://ahrefs.com/backlink-checker/?url=https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <Link className="w-3 h-3" />Backlinks (Ahrefs)
                  </a>
                  <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-gray-600 hover:underline p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <ExternalLink className="w-3 h-3" />Visit Site
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Tools */}
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-600" />Free SEO Analysis Tools
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "Ahrefs Free Tools", url: "https://ahrefs.com/free-seo-tools", desc: "Keyword generator, backlink checker, site audit", color: "text-orange-700 bg-orange-50 border-orange-200" },
            { name: "SEMrush Free", url: "https://www.semrush.com", desc: "Competitor analysis, keyword research", color: "text-blue-700 bg-blue-50 border-blue-200" },
            { name: "Moz Link Explorer", url: "https://moz.com/link-explorer", desc: "Backlink opportunities, domain authority", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
            { name: "SimilarWeb", url: "https://www.similarweb.com", desc: "Traffic estimates, top pages, country breakdown", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            { name: "Ubersuggest", url: "https://neilpatel.com/ubersuggest", desc: "Keyword ideas, content gaps, SERP analysis", color: "text-violet-700 bg-violet-50 border-violet-200" },
            { name: "SpyFu", url: "https://www.spyfu.com", desc: "Competitor keywords, ad history, content gaps", color: "text-rose-700 bg-rose-50 border-rose-200" },
          ].map(({ name, url, desc, color }) => (
            <a key={name} href={url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center justify-between p-4 rounded-xl border ${color} hover:brightness-95 transition-all`}>
              <div>
                <p className="font-semibold text-sm">{name}</p>
                <p className="text-xs opacity-70 mt-0.5">{desc}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSeoIntelligence() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings" | "crawler" | "keywords" | "studio" | "audit" | "competitors">("dashboard");

  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );
  if (!isAuthenticated || !isAdmin) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center"><Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" /><p className="text-white font-bold text-lg">Admin Access Required</p></div>
    </div>
  );

  const TABS = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "settings" as const, label: "GA4 & Clarity", icon: Settings },
    { id: "crawler" as const, label: "Auto Crawler", icon: Bot },
    { id: "keywords" as const, label: "Keywords", icon: Target },
    { id: "studio" as const, label: "Content Studio", icon: Brain },
    { id: "audit" as const, label: "Site Audit", icon: Scan },
    { id: "competitors" as const, label: "Competitors", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />Back to Admin
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm">🧠 SEO Intelligence</p>
              <p className="text-xs text-gray-500">GA4 · Microsoft Clarity · Sitemap · Audit · Content AI</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />sitemap.xml
            </a>
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />Search Console
            </a>
            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-orange-600 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />GA4
            </a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? "border-emerald-500 text-emerald-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "crawler" && <CrawlerTab />}
        {activeTab === "keywords" && <KeywordMonitorTab />}
        {activeTab === "studio" && <ContentStudioTab />}
        {activeTab === "audit" && <SiteAuditTab />}
        {activeTab === "competitors" && <CompetitorTrackerTab />}
      </div>
    </div>
  );
}
