import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Search, Globe, Edit, CheckCircle, AlertCircle,
  BarChart3, Settings, ExternalLink, RefreshCw, FileText,
  Lock, Image as ImageIcon, Tag, MapPin, Eye, EyeOff,
  Twitter, ChevronDown, ChevronUp, Save, Zap
} from "lucide-react";

const PAGES_LIST = [
  { slug: "home", title: "Home Page", path: "/" },
  { slug: "tasks", title: "Tasks / Campaigns", path: "/tasks" },
  { slug: "p2p-hub", title: "P2P Marketplace", path: "/p2p-hub" },
  { slug: "shop", title: "Shop", path: "/shop" },
  { slug: "influencers", title: "Influencers Directory", path: "/influencers" },
  { slug: "about", title: "About Us", path: "/about" },
  { slug: "blog", title: "Blog", path: "/blog" },
  { slug: "breedskool", title: "BreedSkool", path: "/breedskool" },
  { slug: "leaderboard", title: "Leaderboard", path: "/leaderboard" },
  { slug: "advertise", title: "Advertise With Us", path: "/advertise" },
  { slug: "contact", title: "Contact", path: "/contact" },
  { slug: "tdrip", title: "$TDRIP Token", path: "/tdrip" },
  { slug: "signup", title: "Sign Up", path: "/signup" },
  { slug: "login", title: "Login", path: "/login" },
  { slug: "feed", title: "Creator Feed", path: "/feed" },
];

function SeoPageEditor({ slug, pageTitle }: { slug: string; pageTitle: string }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data: seoData, isLoading } = useQuery<any>({
    queryKey: [`/api/seo/page/${slug}`],
    onSuccess: (d) => {
      if (!form) setForm(d || { pageSlug: slug, pageTitle });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/admin/seo/page/${slug}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/seo/page/${slug}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/seo/pages"] });
      toast({ title: "SEO saved", description: `${pageTitle} SEO settings updated.` });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const currentData = form || seoData;
  const hasData = seoData && (seoData.metaTitle || seoData.metaDescription);
  const f = (field: string) => currentData?.[field] || "";
  const set = (field: string, val: any) => setForm((prev: any) => ({ ...(prev || seoData || { pageSlug: slug, pageTitle }), [field]: val }));

  const handleSave = () => {
    if (!form) return;
    saveMutation.mutate({ ...form, pageTitle });
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${hasData ? "border-green-200" : "border-gray-200"}`} data-testid={`card-seo-page-${slug}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        data-testid={`button-expand-seo-${slug}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${hasData ? "bg-green-500" : "bg-yellow-400"}`} />
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">{pageTitle}</p>
            <p className="text-xs text-gray-400">/{slug === "home" ? "" : slug}</p>
          </div>
          {seoData?.noIndex && <Badge className="bg-red-100 text-red-700 text-xs">No Index</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {hasData
            ? <span className="text-xs text-green-600 font-medium">SEO Configured</span>
            : <span className="text-xs text-yellow-600 font-medium">Needs Setup</span>
          }
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-5">
          {isLoading ? (
            <div className="text-center py-4"><div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Meta Title <span className="text-gray-400 font-normal">(50–60 chars)</span></Label>
                  <Input value={f("metaTitle")} onChange={e => set("metaTitle", e.target.value)} placeholder="Page title for Google..." className="text-sm h-9" data-testid={`input-meta-title-${slug}`} />
                  <p className="text-xs text-gray-400 mt-1">{f("metaTitle").length}/60 chars</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Canonical URL <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input value={f("canonicalUrl")} onChange={e => set("canonicalUrl", e.target.value)} placeholder="https://taskdrip.online/..." className="text-sm h-9" data-testid={`input-canonical-${slug}`} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Meta Description <span className="text-gray-400 font-normal">(150–160 chars)</span></Label>
                <textarea value={f("metaDescription")} onChange={e => set("metaDescription", e.target.value)} rows={2} placeholder="Page description for search engines..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" data-testid={`input-meta-desc-${slug}`} />
                <p className="text-xs text-gray-400 mt-1">{f("metaDescription").length}/160 chars</p>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Keywords <span className="text-gray-400 font-normal">(comma separated)</span></Label>
                <Input value={f("keywords")} onChange={e => set("keywords", e.target.value)} placeholder="web3 influencer, earn crypto, brand campaigns..." className="text-sm h-9" data-testid={`input-keywords-${slug}`} />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Open Graph (Social Share)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">OG Title</Label>
                    <Input value={f("ogTitle")} onChange={e => set("ogTitle", e.target.value)} placeholder="Title when shared on social..." className="text-sm h-9" data-testid={`input-og-title-${slug}`} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">OG Image URL</Label>
                    <Input value={f("ogImage")} onChange={e => set("ogImage", e.target.value)} placeholder="https://... (1200×630)" className="text-sm h-9" data-testid={`input-og-image-${slug}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs font-semibold mb-1.5 block">OG Description</Label>
                  <textarea value={f("ogDescription")} onChange={e => set("ogDescription", e.target.value)} rows={2} placeholder="Description when shared on Facebook, WhatsApp, etc..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" data-testid={`input-og-desc-${slug}`} />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Twitter Card</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Card Type</Label>
                    <select value={f("twitterCard") || "summary_large_image"} onChange={e => set("twitterCard", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-9" data-testid={`select-twitter-card-${slug}`}>
                      <option value="summary_large_image">Summary Large Image</option>
                      <option value="summary">Summary</option>
                      <option value="app">App</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold mb-1.5 block">Twitter Image URL</Label>
                    <Input value={f("twitterImage")} onChange={e => set("twitterImage", e.target.value)} placeholder="https://..." className="text-sm h-9" data-testid={`input-twitter-image-${slug}`} />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={f("noIndex") === true} onChange={e => set("noIndex", e.target.checked)} className="rounded" data-testid={`check-noindex-${slug}`} />
                    <span className="text-xs font-medium text-gray-700">No Index</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={f("noFollow") === true} onChange={e => set("noFollow", e.target.checked)} className="rounded" data-testid={`check-nofollow-${slug}`} />
                    <span className="text-xs font-medium text-gray-700">No Follow</span>
                  </label>
                </div>
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white h-9 text-sm" data-testid={`button-save-seo-${slug}`}>
                  {saveMutation.isPending ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />Saving...</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save SEO</>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<any>({ queryKey: ["/api/pwa-settings"] });
  const [form, setForm] = useState<any>(null);

  const currentForm = form || settings || {};
  const set = (k: string, v: string) => setForm((p: any) => ({ ...(p || settings || {}), [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/pwa-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pwa-settings"] });
      toast({ title: "Analytics settings saved!" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-800">Google Analytics 4 (GA4)</p>
            <p className="text-sm text-blue-600 mt-1">Enter your GA4 Measurement ID to enable tracking across all pages. The tracking script will be automatically injected.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Label className="text-sm font-semibold mb-2 block">GA4 Measurement ID</Label>
          <Input value={currentForm.gaTrackingId || ""} onChange={e => set("gaTrackingId", e.target.value)} placeholder="G-XXXXXXXXXX" className="font-mono" data-testid="input-ga-tracking-id" />
          <p className="text-xs text-gray-500 mt-1.5">Found in: GA Admin → Data Streams → Measurement ID</p>
        </div>
        <div>
          <Label className="text-sm font-semibold mb-2 block">Google Tag Manager ID</Label>
          <Input value={currentForm.gtmId || ""} onChange={e => set("gtmId", e.target.value)} placeholder="GTM-XXXXXXX" className="font-mono" data-testid="input-gtm-id" />
          <p className="text-xs text-gray-500 mt-1.5">Optional: Use GTM for advanced tracking setup</p>
        </div>
        <div>
          <Label className="text-sm font-semibold mb-2 block">Google Site Verification</Label>
          <Input value={currentForm.googleSiteVerification || ""} onChange={e => set("googleSiteVerification", e.target.value)} placeholder="XXXXXXXXXXXXXXXXXXXXXXXXX" className="font-mono" data-testid="input-google-verify" />
          <p className="text-xs text-gray-500 mt-1.5">From Google Search Console → Verify Ownership</p>
        </div>
        <div>
          <Label className="text-sm font-semibold mb-2 block">Bing Site Verification</Label>
          <Input value={currentForm.bingVerification || ""} onChange={e => set("bingVerification", e.target.value)} placeholder="XXXXXXXXXXXXXXXXXXXXXXXXX" className="font-mono" data-testid="input-bing-verify" />
          <p className="text-xs text-gray-500 mt-1.5">From Bing Webmaster Tools → Verify Ownership</p>
        </div>
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold mb-2 block">Default OG Image URL</Label>
          <Input value={currentForm.defaultOgImage || ""} onChange={e => set("defaultOgImage", e.target.value)} placeholder="https://taskdrip.online/og-image.jpg (1200×630)" data-testid="input-default-og-image" />
          <p className="text-xs text-gray-500 mt-1.5">Fallback image used when a page has no specific OG image set</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5">
        <p className="font-semibold text-gray-800 mb-3">Quick Links</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Google Search Console", url: "https://search.google.com/search-console" },
            { label: "GA4 Dashboard", url: "https://analytics.google.com" },
            { label: "Bing Webmaster", url: "https://www.bing.com/webmasters" },
            { label: "GTM Setup", url: "https://tagmanager.google.com" },
          ].map(({ label, url }) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-colors bg-white">
              <ExternalLink className="w-3.5 h-3.5" />{label}
            </a>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate({ ...settings, ...form })} disabled={saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700" data-testid="button-save-analytics">
          {saveMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Analytics Settings</>}
        </Button>
      </div>
    </div>
  );
}

export default function AdminSEO() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pages" | "analytics" | "technical">("pages");
  const [searchQ, setSearchQ] = useState("");

  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";

  const { data: allSeoPages = [] } = useQuery<any[]>({ queryKey: ["/api/seo/pages"] });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/seo/seed-defaults", {}),
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo/pages"] });
      toast({ title: "Defaults seeded!", description: d.message });
    },
    onError: (e: any) => toast({ title: "Seed failed", description: e.message, variant: "destructive" }),
  });

  if (authLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated || !isAdmin) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center"><Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" /><p className="text-white font-bold text-lg">Admin Access Required</p></div>
    </div>
  );

  const filteredPages = PAGES_LIST.filter(p => p.title.toLowerCase().includes(searchQ.toLowerCase()) || p.slug.includes(searchQ.toLowerCase()));
  const configuredCount = allSeoPages.length;

  const TABS = [
    { id: "pages" as const, label: "Per-Page SEO", icon: FileText },
    { id: "analytics" as const, label: "Google Analytics", icon: BarChart3 },
    { id: "technical" as const, label: "Technical SEO", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/admin-dashboard")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm" data-testid="button-seo-back">
            <ArrowLeft className="w-4 h-4" /> Back to Admin
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">SEO & Analytics Manager</p>
              <p className="text-xs text-gray-500">{configuredCount}/{PAGES_LIST.length} pages configured</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1"><ExternalLink className="w-3 h-3" />robots.txt</a>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 ml-2"><ExternalLink className="w-3 h-3" />sitemap.xml</a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              data-testid={`tab-seo-${id}`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {activeTab === "pages" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search pages..." className="pl-9 h-9 text-sm" />
              </div>
              <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} variant="outline" size="sm" data-testid="button-seed-seo">
                <Zap className="w-3.5 h-3.5 mr-2" />{seedMutation.isPending ? "Seeding..." : "Auto-seed Defaults"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                <p className="text-2xl font-black text-gray-900">{PAGES_LIST.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total Pages</p>
              </div>
              <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center">
                <p className="text-2xl font-black text-green-700">{configuredCount}</p>
                <p className="text-xs text-green-600 mt-1">SEO Configured</p>
              </div>
              <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-4 text-center">
                <p className="text-2xl font-black text-yellow-700">{PAGES_LIST.length - configuredCount}</p>
                <p className="text-xs text-yellow-600 mt-1">Needs Setup</p>
              </div>
            </div>

            <div className="space-y-2">
              {filteredPages.map(page => (
                <SeoPageEditor key={page.slug} slug={page.slug} pageTitle={page.title} />
              ))}
            </div>

            <div className="mt-8 rounded-xl bg-white border border-gray-200 p-5">
              <p className="font-bold text-gray-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-600" />Blog Post SEO</p>
              <p className="text-sm text-gray-600 mb-3">Blog posts have individual SEO fields. Edit them from the Blog Manager in the Admin Dashboard.</p>
              <Button onClick={() => navigate("/admin-dashboard")} variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-2" />Go to Blog Manager
              </Button>
            </div>
          </div>
        )}

        {activeTab === "analytics" && <AnalyticsTab />}

        {activeTab === "technical" && (
          <div className="space-y-6">
            <div className="rounded-xl bg-white border border-gray-200 p-6">
              <p className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-purple-600" />Technical SEO Files</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "robots.txt", url: "/robots.txt", desc: "Auto-generated. Controls crawling rules for all search engines.", status: "auto" },
                  { title: "sitemap.xml", url: "/sitemap.xml", desc: "Auto-generated. Includes all static pages and published blog posts.", status: "auto" },
                ].map(({ title, url, desc, status }) => (
                  <div key={title} className="rounded-xl border border-gray-200 p-4 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 flex items-center gap-2">
                        {title} <Badge className="bg-green-100 text-green-700 text-xs">Auto</Badge>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{desc}</p>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="ml-3 flex-shrink-0">
                      <Button variant="outline" size="sm" className="h-8 text-xs"><ExternalLink className="w-3 h-3 mr-1.5" />View</Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white border border-gray-200 p-6">
              <p className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />SEO Best Practices Checklist</p>
              <div className="space-y-2">
                {[
                  { label: "robots.txt served", done: true },
                  { label: "sitemap.xml served", done: true },
                  { label: "Meta title on all pages", done: configuredCount >= PAGES_LIST.length },
                  { label: "Meta description on all pages", done: configuredCount >= PAGES_LIST.length },
                  { label: "Open Graph tags", done: false },
                  { label: "Twitter Card tags", done: false },
                  { label: "Structured Data (JSON-LD)", done: false },
                  { label: "Google Analytics tracking", done: false },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    {done ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-yellow-400" />}
                    <span className={`text-sm ${done ? "text-gray-800" : "text-gray-500"}`}>{label}</span>
                    {done && <Badge className="ml-auto bg-green-100 text-green-700 text-xs">Done</Badge>}
                    {!done && <Badge className="ml-auto bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
