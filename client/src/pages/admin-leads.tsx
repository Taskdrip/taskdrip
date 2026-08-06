import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Search, Building2, Users, Globe, Phone, MessageCircle, Mail, Sparkles,
  RefreshCw, Trash2, Send, Loader2, ExternalLink, MapPin, Filter, FileDown, AlertCircle,
} from "lucide-react";

type Lead = {
  id: string;
  kind: "business" | "influencer";
  source?: string;
  name: string;
  niche?: string;
  businessType?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  socialLinks?: any;
  followers?: number;
  rating?: string;
  reviewCount?: number;
  yearsInBusiness?: number;
  description?: string;
  aiSummary?: string;
  status?: string;
  lastContactedAt?: string;
  createdAt?: string;
};

const COUNTRIES = ["US","GB","NG","KE","ZA","CA","AU","IN","DE","FR","BR","AE","SG","JP","CN","MX","ES","IT","NL","SA","EG","GH","TR","ID","PH","VN"];

export default function AdminLeads() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";

  const [tab, setTab] = useState<"business" | "influencer">("business");
  const [filters, setFilters] = useState<any>({ search: "", niche: "", country: "", city: "", status: "", hasPhone: false, hasWebsite: false, hasEmail: false, minFollowers: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBody, setBulkBody] = useState("");
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverForm, setDiscoverForm] = useState({ query: "", location: "", country: "", maxResults: 20, includeInternal: true });

  const { data: providers } = useQuery<any>({ queryKey: ["/api/admin/leads/providers"], enabled: isAdmin });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/leads/stats"], enabled: isAdmin });

  const queryParams = useMemo(() => {
    const p = new URLSearchParams({ kind: tab, limit: "200" });
    Object.entries(filters).forEach(([k, v]) => {
      if (v === "" || v === false || v == null) return;
      p.set(k, String(v));
    });
    return p.toString();
  }, [tab, filters]);

  const { data: leadsData, isLoading } = useQuery<{ items: Lead[]; total: number }>({
    queryKey: [`/api/admin/leads?${queryParams}`],
    enabled: isAdmin,
  });
  const items = leadsData?.items || [];

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const url = tab === "business" ? "/api/admin/leads/discover/businesses" : "/api/admin/leads/discover/influencers";
      return apiRequest("POST", url, discoverForm);
    },
    onSuccess: async (r: any) => {
      const d = await r.json();
      toast({ title: "Discovery complete", description: `Saved ${d.saved} of ${d.found} found` });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/leads?${queryParams}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads/stats"] });
      setDiscoverOpen(false);
    },
    onError: (e: any) => toast({ title: "Discovery failed", description: e.message, variant: "destructive" }),
  });

  const bulkSmsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/leads/bulk-sms", { leadIds: Array.from(selected), body: bulkBody }),
    onSuccess: async (r: any) => {
      const d = await r.json();
      toast({ title: "Bulk SMS dispatched", description: `${d.sent} sent · ${d.failed} failed` });
      setBulkOpen(false); setBulkBody(""); setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: [`/api/admin/leads?${queryParams}`] });
    },
    onError: (e: any) => toast({ title: "Bulk SMS failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/leads?${queryParams}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads/stats"] });
      toast({ title: "Lead deleted" });
    },
  });

  const toggleSel = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const exportCsv = () => {
    const rows = items.filter(i => selected.has(i.id) || selected.size === 0);
    const cols = ["name","kind","niche","businessType","country","city","phone","whatsapp","email","website","followers","rating","status"];
    const csv = [cols.join(",")].concat(rows.map(r => cols.map(c => {
      const v = (r as any)[c]; return v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
    }).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taskdrip-leads-${tab}-${Date.now()}.csv`;
    a.click();
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#040610" }}>
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  );
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#040610" }}>
        <div className="text-center">
          <p className="text-white text-lg">Admin access required</p>
          <Button className="mt-4" onClick={() => navigate("/admin-login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative" style={{
      backgroundColor: "#040610",
      backgroundImage: [
        "radial-gradient(ellipse 80% 60% at 5% 5%, rgba(120,40,210,0.45) 0%, transparent 55%)",
        "radial-gradient(ellipse 65% 55% at 95% 90%, rgba(60,30,180,0.35) 0%, transparent 55%)",
        "radial-gradient(ellipse 50% 40% at 75% 10%, rgba(90,20,190,0.28) 0%, transparent 40%)",
        "radial-gradient(ellipse 60% 50% at 20% 90%, rgba(70,10,150,0.22) 0%, transparent 45%)",
      ].join(", "),
    }}>
      {/* Dot grid overlay */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: "radial-gradient(rgba(180,150,255,0.14) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-purple-600 blur-xl opacity-50" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shadow-xl border border-purple-400/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                Lead Discovery & Outreach
              </h1>
              <p className="text-sm text-purple-200/70 mt-1">Find businesses & influencers globally · AI-powered growth reports · WhatsApp / Call / SMS hub</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportCsv} data-testid="button-export-csv" className="border-white/15 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white backdrop-blur-sm">
              <FileDown className="w-4 h-4 mr-2" />Export CSV
            </Button>
            <Button onClick={() => setDiscoverOpen(true)} className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-900/50 border border-purple-400/30" data-testid="button-discover-open">
              <Search className="w-4 h-4 mr-2" />Discover {tab === "business" ? "Businesses" : "Influencers"}
            </Button>
          </div>
        </header>

        {/* Provider status */}
        {providers && (
          <div className="flex flex-wrap gap-2 text-xs items-center">
            <ProviderChip ok={providers.googlePlaces} label="Google Places" />
            <ProviderChip ok={providers.youtube} label="YouTube API" />
            <ProviderChip ok={providers.openai} label="OpenAI (AI Reports)" />
            <ProviderChip ok={providers.twilio} label="Twilio (Bulk SMS)" />
            {!providers.googlePlaces && !providers.youtube && (
              <span className="text-amber-300 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="w-3 h-3" />
                Using built-in AI discovery · add API keys to enable live data
              </span>
            )}
          </div>
        )}

        {/* Stats dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Leads" value={stats.total} accent="purple" />
            <StatCard label="Businesses" value={stats.byKind?.find((b: any) => b.kind === "business")?.c || 0} accent="blue" />
            <StatCard label="Influencers" value={stats.byKind?.find((b: any) => b.kind === "influencer")?.c || 0} accent="emerald" />
            <StatCard label="Contacted" value={stats.byStatus?.find((b: any) => b.status === "contacted")?.c || 0} accent="amber" />
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setSelected(new Set()); }}>
          <TabsList className="bg-black/30 border border-white/15 backdrop-blur-sm">
            <TabsTrigger value="business" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-gray-400" data-testid="tab-business"><Building2 className="w-4 h-4 mr-2" />Businesses</TabsTrigger>
            <TabsTrigger value="influencer" className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-gray-400" data-testid="tab-influencer"><Users className="w-4 h-4 mr-2" />Influencers</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {/* Filters */}
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-bold text-white"><Filter className="w-4 h-4 text-purple-400" />Filters</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input placeholder="Search name, address, phone, site…" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} data-testid="input-search" />
                <Input placeholder="Niche (e.g. skincare)" value={filters.niche} onChange={e => setFilters({ ...filters, niche: e.target.value })} data-testid="input-niche" />
                <Select value={filters.country || "any"} onValueChange={v => setFilters({ ...filters, country: v === "any" ? "" : v })}>
                  <SelectTrigger data-testid="select-country"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any country</SelectItem>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="City" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} data-testid="input-city" />
                <Select value={filters.status || "any"} onValueChange={v => setFilters({ ...filters, status: v === "any" ? "" : v })}>
                  <SelectTrigger data-testid="select-status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                {tab === "influencer" && (
                  <Input type="number" placeholder="Min followers" value={filters.minFollowers} onChange={e => setFilters({ ...filters, minFollowers: e.target.value })} data-testid="input-min-followers" />
                )}
                <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={filters.hasPhone} onChange={e => setFilters({ ...filters, hasPhone: e.target.checked })} />Has phone</label>
                <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={filters.hasWebsite} onChange={e => setFilters({ ...filters, hasWebsite: e.target.checked })} />Has website</label>
                <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={filters.hasEmail} onChange={e => setFilters({ ...filters, hasEmail: e.target.checked })} />Has email</label>
                <Button variant="outline" size="sm" onClick={() => setFilters({ search: "", niche: "", country: "", city: "", status: "", hasPhone: false, hasWebsite: false, hasEmail: false, minFollowers: "" })}>Clear</Button>
              </div>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="rounded-xl bg-purple-600/20 border border-purple-500/40 p-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">{selected.size} selected</span>
                <Button size="sm" onClick={() => setBulkOpen(true)} data-testid="button-bulk-sms"><Send className="w-3 h-3 mr-1" />Bulk SMS</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            )}

            {/* Table */}
            <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-3" />
                  <p className="text-gray-400 text-sm">Discovering leads…</p>
                </div>
              ) : items.length === 0 ? (
                <div className="p-14 text-center space-y-3">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-2xl bg-purple-600 blur-xl opacity-30" />
                    <div className="relative w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                      {tab === "business" ? <Building2 className="w-8 h-8 text-purple-400" /> : <Users className="w-8 h-8 text-purple-400" />}
                    </div>
                  </div>
                  <p className="text-white font-bold text-lg">No {tab}s yet</p>
                  <p className="text-gray-400 text-sm">Click <span className="text-purple-300 font-semibold">Discover {tab === "business" ? "Businesses" : "Influencers"}</span> to start importing leads.</p>
                  <Button onClick={() => setDiscoverOpen(true)} className="mt-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 border border-purple-400/30 shadow-lg shadow-purple-900/40">
                    <Search className="w-4 h-4 mr-2" />Discover {tab === "business" ? "Businesses" : "Influencers"}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-950/50 text-[11px] uppercase tracking-widest text-gray-300 border-b border-white/10 font-bold">
                      <tr>
                        <th className="p-3.5 text-left w-10"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} className="accent-purple-500" /></th>
                        <th className="p-3.5 text-left">Name</th>
                        <th className="p-3.5 text-left">{tab === "business" ? "Type / Niche" : "Niche / Followers"}</th>
                        <th className="p-3.5 text-left">Location</th>
                        <th className="p-3.5 text-left">Contact</th>
                        <th className="p-3.5 text-left">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map(l => (
                        <tr key={l.id} className="hover:bg-white/5 transition-colors group" data-testid={`row-lead-${l.id}`}>
                          <td className="p-3.5"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} className="accent-purple-500" /></td>
                          <td className="p-3.5 min-w-[180px]">
                            <Link href={`/admin/leads/${l.id}`} className="font-bold text-white hover:text-purple-300 block" data-testid={`link-lead-${l.id}`}>{l.name}</Link>
                            {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-0.5"><ExternalLink className="w-3 h-3" />website</a>}
                            {l.aiSummary && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{l.aiSummary}</p>}
                          </td>
                          <td className="p-3.5">
                            {tab === "business" ? (
                              <div className="space-y-0.5">
                                <div className="text-white font-medium">{l.businessType || "—"}</div>
                                {l.niche && <div className="text-xs text-purple-300">{l.niche}</div>}
                                {l.rating && <div className="text-xs text-amber-400 font-semibold">{l.rating}★ <span className="text-gray-500 font-normal">({l.reviewCount || 0})</span></div>}
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="text-white font-medium">{l.niche || "—"}</div>
                                {l.followers != null && <div className="text-xs text-emerald-400 font-bold">{l.followers.toLocaleString()} followers</div>}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1 text-sm text-gray-200"><MapPin className="w-3 h-3 text-purple-400 flex-shrink-0" />{[l.city, l.country].filter(Boolean).join(", ") || "—"}</div>
                            {l.address && <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px] mt-0.5">{l.address}</div>}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1 text-xs">
                              {l.phone && <a href={`tel:${l.phone}`} className="text-blue-300 hover:text-blue-200 flex items-center gap-1 font-medium"><Phone className="w-3 h-3" />{l.phone}</a>}
                              {l.email && <a href={`mailto:${l.email}`} className="text-purple-300 hover:text-purple-200 flex items-center gap-1 font-medium"><Mail className="w-3 h-3" />{l.email}</a>}
                              {l.website && !l.phone && !l.email && <a href={l.website} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1"><Globe className="w-3 h-3" />Site</a>}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <Badge variant="outline" className="capitalize text-white border-white/20 bg-white/5">{l.status || "new"}</Badge>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {l.whatsapp && (
                                <a href={`https://wa.me/${l.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" title="WhatsApp" data-testid={`link-wa-${l.id}`}>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"><MessageCircle className="w-4 h-4" /></Button>
                                </a>
                              )}
                              {l.phone && (
                                <a href={`tel:${l.phone}`} title="Call" data-testid={`link-call-${l.id}`}>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg"><Phone className="w-4 h-4" /></Button>
                                </a>
                              )}
                              <Link href={`/admin/leads/${l.id}`}><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg"><Sparkles className="w-4 h-4" /></Button></Link>
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(l.id); }} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Discover dialog */}
      <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
        <DialogContent className="bg-gray-950 border-white/10 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-black">
              <Search className="w-5 h-5 text-purple-400" />
              Discover {tab === "business" ? "Businesses" : "Influencers"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300 font-semibold">Query *</Label>
              <Input
                placeholder={tab === "business" ? "e.g. skincare brand, coffee shop" : "e.g. crypto creator, beauty vlogger"}
                value={discoverForm.query}
                onChange={e => setDiscoverForm({ ...discoverForm, query: e.target.value })}
                className="bg-black/30 border-white/15 text-white placeholder:text-gray-500 mt-1"
                data-testid="input-discover-query"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tab === "business" && (
                <div>
                  <Label className="text-gray-300">Location</Label>
                  <Input placeholder="Lagos, Nigeria" value={discoverForm.location} onChange={e => setDiscoverForm({ ...discoverForm, location: e.target.value })} className="bg-black/30 border-white/15 text-white placeholder:text-gray-500 mt-1" />
                </div>
              )}
              <div>
                <Label className="text-gray-300">Country (ISO-2)</Label>
                <Select value={discoverForm.country || "any"} onValueChange={v => setDiscoverForm({ ...discoverForm, country: v === "any" ? "" : v })}>
                  <SelectTrigger className="bg-black/30 border-white/15 text-white mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="any">Any</SelectItem>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Max results</Label>
                <Input type="number" min={1} max={25} value={discoverForm.maxResults} onChange={e => setDiscoverForm({ ...discoverForm, maxResults: parseInt(e.target.value) || 20 })} className="bg-black/30 border-white/15 text-white mt-1" />
              </div>
            </div>
            {tab === "influencer" && (
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={discoverForm.includeInternal} onChange={e => setDiscoverForm({ ...discoverForm, includeInternal: e.target.checked })} className="accent-purple-500" />
                Include internal Taskdrip creators
              </label>
            )}
            {/* Info banner */}
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-3 text-xs text-purple-300">
              {tab === "business" && !providers?.googlePlaces
                ? "🤖 Using built-in AI discovery. Add GOOGLE_PLACES_API_KEY for live Google Places data."
                : tab === "influencer" && !providers?.youtube
                ? "🤖 Using built-in AI discovery. Add YOUTUBE_API_KEY for live YouTube channel data."
                : "🌐 Live discovery enabled via API."}
            </div>
            <Button onClick={() => discoverMutation.mutate()} disabled={discoverMutation.isPending || !discoverForm.query} className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-900/40 border border-purple-400/30" data-testid="button-discover-run">
              {discoverMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Discovering…</> : <><RefreshCw className="w-4 h-4 mr-2" />Run Discovery</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk SMS dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-gray-950 border-white/10 text-white backdrop-blur-xl">
          <DialogHeader><DialogTitle className="text-white font-black">Bulk SMS — {selected.size} recipients</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea rows={5} placeholder="Hi {{name}}, we'd love to introduce Taskdrip…" value={bulkBody} onChange={e => setBulkBody(e.target.value)} className="bg-black/30 border-white/15 text-white placeholder:text-gray-500" data-testid="input-bulk-body" />
            <p className="text-xs text-gray-400">{providers?.twilio ? "✅ Twilio configured — messages will be sent." : "⚠ Twilio not configured — messages will be logged."}</p>
            <Button disabled={bulkSmsMutation.isPending || !bulkBody} onClick={() => bulkSmsMutation.mutate()} className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700" data-testid="button-bulk-send">
              {bulkSmsMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : <><Send className="w-4 h-4 mr-2" />Blast {selected.size} SMS</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  const styles: Record<string, { bg: string; border: string; glow: string; label: string; num: string }> = {
    purple: { bg: "from-purple-600/20 to-purple-900/20", border: "border-purple-500/40", glow: "shadow-purple-900/30", label: "text-purple-300", num: "text-white" },
    blue:   { bg: "from-blue-600/20 to-blue-900/20",   border: "border-blue-500/40",   glow: "shadow-blue-900/30",   label: "text-blue-300",   num: "text-white" },
    emerald:{ bg: "from-emerald-600/20 to-emerald-900/20", border: "border-emerald-500/40", glow: "shadow-emerald-900/30", label: "text-emerald-300", num: "text-white" },
    amber:  { bg: "from-amber-600/20 to-amber-900/20", border: "border-amber-500/40", glow: "shadow-amber-900/30", label: "text-amber-300", num: "text-white" },
  };
  const s = styles[accent] || styles.purple;
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${s.bg} border ${s.border} p-5 shadow-lg ${s.glow} backdrop-blur-sm`}>
      <p className={`text-xs uppercase tracking-widest font-bold ${s.label}`}>{label}</p>
      <p className={`text-3xl font-black mt-2 ${s.num}`}>{Number(value).toLocaleString()}</p>
    </div>
  );
}

function ProviderChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
      ok
        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        : "bg-white/5 text-gray-400 border border-white/10"
    }`}>
      <span className={`mr-1.5 ${ok ? "text-emerald-400" : "text-gray-600"}`}>{ok ? "●" : "○"}</span>
      {label}
    </span>
  );
}
