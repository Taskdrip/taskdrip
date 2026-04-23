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

  if (authLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>;
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg">Admin access required</p>
          <Button className="mt-4" onClick={() => navigate("/admin-login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-purple-400" />
              Lead Discovery & Outreach
            </h1>
            <p className="text-sm text-gray-400 mt-1">Find businesses & influencers globally · AI-powered growth reports · WhatsApp / Call / SMS hub</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv} data-testid="button-export-csv"><FileDown className="w-4 h-4 mr-2" />Export CSV</Button>
            <Button onClick={() => setDiscoverOpen(true)} className="bg-purple-600 hover:bg-purple-700" data-testid="button-discover-open">
              <Search className="w-4 h-4 mr-2" />Discover {tab === "business" ? "Businesses" : "Influencers"}
            </Button>
          </div>
        </header>

        {/* Provider status */}
        {providers && (
          <div className="flex flex-wrap gap-2 text-xs">
            <ProviderChip ok={providers.googlePlaces} label="Google Places" />
            <ProviderChip ok={providers.youtube} label="YouTube API" />
            <ProviderChip ok={providers.openai} label="OpenAI (AI Reports)" />
            <ProviderChip ok={providers.twilio} label="Twilio (Bulk SMS)" />
            {!providers.googlePlaces && !providers.youtube && (
              <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Live discovery disabled — add API keys to unlock.</span>
            )}
          </div>
        )}

        {/* Stats dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total leads" value={stats.total} accent="purple" />
            <StatCard label="Businesses" value={stats.byKind?.find((b: any) => b.kind === "business")?.c || 0} accent="blue" />
            <StatCard label="Influencers" value={stats.byKind?.find((b: any) => b.kind === "influencer")?.c || 0} accent="emerald" />
            <StatCard label="Contacted" value={stats.byStatus?.find((b: any) => b.status === "contacted")?.c || 0} accent="amber" />
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setSelected(new Set()); }}>
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="business" data-testid="tab-business"><Building2 className="w-4 h-4 mr-2" />Businesses</TabsTrigger>
            <TabsTrigger value="influencer" data-testid="tab-influencer"><Users className="w-4 h-4 mr-2" />Influencers</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {/* Filters */}
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-300"><Filter className="w-4 h-4" />Filters</div>
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
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
              {isLoading ? (
                <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <p className="font-semibold">No {tab}s yet</p>
                  <p className="text-sm mt-1">Click <b>Discover {tab === "business" ? "Businesses" : "Influencers"}</b> to import.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/60 text-xs uppercase text-gray-400">
                      <tr>
                        <th className="p-3 text-left"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} /></th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">{tab === "business" ? "Type / Niche" : "Niche / Followers"}</th>
                        <th className="p-3 text-left">Location</th>
                        <th className="p-3 text-left">Contact</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {items.map(l => (
                        <tr key={l.id} className="hover:bg-gray-800/40" data-testid={`row-lead-${l.id}`}>
                          <td className="p-3"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} /></td>
                          <td className="p-3">
                            <Link href={`/admin/leads/${l.id}`} className="font-semibold text-white hover:text-purple-300" data-testid={`link-lead-${l.id}`}>{l.name}</Link>
                            {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="ml-2 text-purple-400 inline-flex items-center"><ExternalLink className="w-3 h-3" /></a>}
                            {l.aiSummary && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{l.aiSummary}</p>}
                          </td>
                          <td className="p-3 text-gray-300">
                            {tab === "business" ? (
                              <>
                                <div>{l.businessType || "—"}</div>
                                {l.niche && <div className="text-xs text-gray-500">{l.niche}</div>}
                                {l.rating && <div className="text-xs text-amber-400">{l.rating}★ ({l.reviewCount || 0})</div>}
                              </>
                            ) : (
                              <>
                                <div>{l.niche || "—"}</div>
                                {l.followers != null && <div className="text-xs text-emerald-400">{l.followers.toLocaleString()} followers</div>}
                              </>
                            )}
                          </td>
                          <td className="p-3 text-gray-300">
                            <div className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3" />{l.city || ""} {l.country || ""}</div>
                            {l.address && <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">{l.address}</div>}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1 text-xs">
                              {l.phone && <a href={`tel:${l.phone}`} className="text-blue-400 hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{l.phone}</a>}
                              {l.email && <a href={`mailto:${l.email}`} className="text-purple-400 hover:underline flex items-center gap-1"><Mail className="w-3 h-3" />{l.email}</a>}
                              {l.website && <a href={l.website} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1"><Globe className="w-3 h-3" />Site</a>}
                            </div>
                          </td>
                          <td className="p-3"><Badge variant="outline" className="capitalize">{l.status || "new"}</Badge></td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {l.whatsapp && (
                                <a href={`https://wa.me/${l.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" title="WhatsApp" data-testid={`link-wa-${l.id}`}>
                                  <Button size="sm" variant="ghost" className="text-emerald-400"><MessageCircle className="w-4 h-4" /></Button>
                                </a>
                              )}
                              {l.phone && (
                                <a href={`tel:${l.phone}`} title="Call" data-testid={`link-call-${l.id}`}>
                                  <Button size="sm" variant="ghost" className="text-blue-400"><Phone className="w-4 h-4" /></Button>
                                </a>
                              )}
                              <Link href={`/admin/leads/${l.id}`}><Button size="sm" variant="ghost"><Sparkles className="w-4 h-4 text-purple-400" /></Button></Link>
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(l.id); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
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
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle>Discover {tab === "business" ? "Businesses" : "Influencers"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Query</Label>
              <Input placeholder={tab === "business" ? "e.g. skincare brand, coffee shop" : "e.g. crypto creator, beauty vlogger"} value={discoverForm.query} onChange={e => setDiscoverForm({ ...discoverForm, query: e.target.value })} data-testid="input-discover-query" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tab === "business" && (
                <div>
                  <Label>Location</Label>
                  <Input placeholder="Lagos, Nigeria" value={discoverForm.location} onChange={e => setDiscoverForm({ ...discoverForm, location: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Country (ISO-2)</Label>
                <Select value={discoverForm.country || "any"} onValueChange={v => setDiscoverForm({ ...discoverForm, country: v === "any" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max results</Label>
                <Input type="number" min={1} max={25} value={discoverForm.maxResults} onChange={e => setDiscoverForm({ ...discoverForm, maxResults: parseInt(e.target.value) || 20 })} />
              </div>
            </div>
            {tab === "influencer" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={discoverForm.includeInternal} onChange={e => setDiscoverForm({ ...discoverForm, includeInternal: e.target.checked })} />
                Include internal Taskdrip creators
              </label>
            )}
            <Button onClick={() => discoverMutation.mutate()} disabled={discoverMutation.isPending || !discoverForm.query} className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-discover-run">
              {discoverMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Run discovery
            </Button>
            {tab === "business" && !providers?.googlePlaces && (
              <p className="text-xs text-amber-400">⚠ Add <code>GOOGLE_PLACES_API_KEY</code> to enable live business discovery.</p>
            )}
            {tab === "influencer" && !providers?.youtube && (
              <p className="text-xs text-amber-400">⚠ Add <code>YOUTUBE_API_KEY</code> to enable YouTube creator discovery.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk SMS dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle>Bulk SMS — {selected.size} recipients</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea rows={5} placeholder="Hi {{name}}, we'd love to introduce Taskdrip…" value={bulkBody} onChange={e => setBulkBody(e.target.value)} data-testid="input-bulk-body" />
            <p className="text-xs text-gray-400">Sent via Twilio. {providers?.twilio ? "✓ Twilio configured." : "⚠ Twilio not configured — messages will be logged as failed."}</p>
            <Button disabled={bulkSmsMutation.isPending || !bulkBody} onClick={() => bulkSmsMutation.mutate()} className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-bulk-send">
              {bulkSmsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Blast {selected.size} SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  const cls: Record<string, string> = {
    purple: "from-purple-500/20 to-purple-700/20 border-purple-500/30 text-purple-200",
    blue: "from-blue-500/20 to-blue-700/20 border-blue-500/30 text-blue-200",
    emerald: "from-emerald-500/20 to-emerald-700/20 border-emerald-500/30 text-emerald-200",
    amber: "from-amber-500/20 to-amber-700/20 border-amber-500/30 text-amber-200",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${cls[accent]} border p-4`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{Number(value).toLocaleString()}</p>
    </div>
  );
}

function ProviderChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-2 py-1 rounded-full font-mono ${ok ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-gray-700/50 text-gray-400 border border-gray-600/40"}`}>
      {ok ? "●" : "○"} {label}
    </span>
  );
}
