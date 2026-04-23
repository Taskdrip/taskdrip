import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, RefreshCw, Trash2, ExternalLink, TrendingUp, BarChart3, Plus, Globe } from "lucide-react";

type Tracker = { id: string; keyword: string; platforms: string[]; region: string; lastRefreshedAt: string | null; createdAt: string };
type ContentItem = { id: string; platform: string; title: string; url: string; thumbnail: string | null; author: string | null; snippet: string | null; metric: number; publishedAt: string | null; fetchedAt: string };

const ALL_PLATFORMS = ["reddit", "hackernews", "news", "youtube"];
const PLATFORM_COLORS: Record<string, string> = {
  reddit: "bg-orange-100 text-orange-700",
  hackernews: "bg-amber-100 text-amber-700",
  news: "bg-blue-100 text-blue-700",
  youtube: "bg-red-100 text-red-700",
};

export default function AdminKeywordAnalytics() {
  const { toast } = useToast();
  const [tab, setTab] = useState("trackers");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchPlatforms, setSearchPlatforms] = useState<string[]>(ALL_PLATFORMS);
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlatforms, setNewPlatforms] = useState<string[]>(ALL_PLATFORMS);
  const [selectedTracker, setSelectedTracker] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [sortMode, setSortMode] = useState<string>("metric");
  const [region, setRegion] = useState<string>("US");

  const { data: trackers = [] } = useQuery<Tracker[]>({ queryKey: ["/api/admin/keyword-trackers"] });
  const { data: trackerData } = useQuery<{ items: ContentItem[]; counts: { platform: string; count: number }[] }>({
    queryKey: ["/api/admin/keyword-trackers", selectedTracker, "content", filterPlatform, sortMode],
    queryFn: async () => {
      if (!selectedTracker) return { items: [], counts: [] };
      const r = await fetch(`/api/admin/keyword-trackers/${selectedTracker}/content?platform=${filterPlatform}&sort=${sortMode}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!selectedTracker,
  });

  const { data: trendingData } = useQuery<{ region: string; trends: any[] }>({
    queryKey: ["/api/admin/trending-now", region],
    queryFn: async () => {
      const r = await fetch(`/api/admin/trending-now?region=${region}`, { credentials: "include" });
      return r.json();
    },
    enabled: tab === "trending",
  });

  const createTracker = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/keyword-trackers", { keyword: newKeyword, platforms: newPlatforms }),
    onSuccess: () => {
      toast({ title: "Tracker created", description: "Pulling content now…" });
      setNewKeyword("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/keyword-trackers"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const refreshTracker = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/keyword-trackers/${id}/refresh`, {}),
    onSuccess: () => {
      toast({ title: "Refreshed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/keyword-trackers"] });
    },
  });

  const deleteTracker = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/keyword-trackers/${id}`),
    onSuccess: () => {
      if (selectedTracker) setSelectedTracker(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/keyword-trackers"] });
    },
  });

  const adhocSearch = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/keyword-search", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: searchKeyword, platforms: searchPlatforms }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Search failed");
      return res.json();
    },
    onSuccess: (d) => setSearchResults(d),
    onError: (e: any) => toast({ title: "Search failed", description: e.message, variant: "destructive" }),
  });

  const togglePlat = (arr: string[], setter: (v: string[]) => void, p: string) => {
    setter(arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2"><BarChart3 className="w-8 h-8 text-violet-600" /> Keyword Analytics</h1>
            <p className="text-gray-600 mt-1">Track search demand, trending hashtags, and content across the web.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="trackers" data-testid="tab-trackers">Saved Trackers</TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-search">Search Now</TabsTrigger>
            <TabsTrigger value="trending" data-testid="tab-trending">Trending Now</TabsTrigger>
          </TabsList>

          {/* SAVED TRACKERS */}
          <TabsContent value="trackers" className="mt-6 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Add Keyword Tracker</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Input placeholder="e.g. AI agents" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} className="max-w-sm" data-testid="input-new-keyword" />
                  <div className="flex gap-1 flex-wrap">
                    {ALL_PLATFORMS.map(p => (
                      <button key={p} onClick={() => togglePlat(newPlatforms, setNewPlatforms, p)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${newPlatforms.includes(p) ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600"}`}
                        data-testid={`btn-toggle-${p}`}>{p}</button>
                    ))}
                  </div>
                  <Button disabled={!newKeyword || createTracker.isPending} onClick={() => createTracker.mutate()} data-testid="button-create-tracker">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-2">
                {trackers.length === 0 && <p className="text-sm text-gray-500">No trackers yet.</p>}
                {trackers.map(t => (
                  <Card key={t.id} className={`cursor-pointer transition ${selectedTracker === t.id ? "border-violet-500 bg-violet-50" : "hover:border-gray-300"}`} onClick={() => setSelectedTracker(t.id)} data-testid={`card-tracker-${t.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{t.keyword}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.platforms?.map(p => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); refreshTracker.mutate(t.id); }} className="p-1 hover:bg-gray-100 rounded" data-testid={`button-refresh-${t.id}`}><RefreshCw className="w-4 h-4 text-gray-500" /></button>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete tracker?")) deleteTracker.mutate(t.id); }} className="p-1 hover:bg-red-100 rounded" data-testid={`button-delete-${t.id}`}><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="lg:col-span-2">
                {!selectedTracker && <Card><CardContent className="p-10 text-center text-gray-500">Select a tracker to see content</CardContent></Card>}
                {selectedTracker && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base">Content ({trackerData?.items?.length || 0})</CardTitle>
                        <div className="flex gap-2">
                          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                            <SelectTrigger className="w-32 h-8" data-testid="select-platform-filter"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All platforms</SelectItem>
                              {(trackerData?.counts || []).map(c => <SelectItem key={c.platform} value={c.platform}>{c.platform} ({c.count})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={sortMode} onValueChange={setSortMode}>
                            <SelectTrigger className="w-32 h-8" data-testid="select-sort"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="metric">Top score</SelectItem>
                              <SelectItem value="recent">Most recent</SelectItem>
                              <SelectItem value="fetched">Fetched at</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[700px] overflow-y-auto">
                      {(trackerData?.items || []).map(item => (
                        <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block p-3 border rounded-lg hover:bg-gray-50 transition" data-testid={`item-content-${item.id}`}>
                          <div className="flex gap-3">
                            {item.thumbnail && <img src={item.thumbnail} alt="" className="w-20 h-20 object-cover rounded flex-shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={PLATFORM_COLORS[item.platform] || "bg-gray-100 text-gray-700"}>{item.platform}</Badge>
                                {item.metric > 0 && <span className="text-xs text-gray-500"><TrendingUp className="w-3 h-3 inline" /> {item.metric.toLocaleString()}</span>}
                                {item.author && <span className="text-xs text-gray-400">• {item.author}</span>}
                                <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
                              </div>
                              <p className="font-semibold text-sm mt-1">{item.title}</p>
                              {item.snippet && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.snippet}</p>}
                            </div>
                          </div>
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* AD-HOC SEARCH */}
          <TabsContent value="search" className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="Search keyword..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} className="max-w-sm" data-testid="input-search-keyword" onKeyDown={e => e.key === "Enter" && searchKeyword && adhocSearch.mutate()} />
                  <div className="flex gap-1 flex-wrap">
                    {ALL_PLATFORMS.map(p => (
                      <button key={p} onClick={() => togglePlat(searchPlatforms, setSearchPlatforms, p)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${searchPlatforms.includes(p) ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600"}`}>{p}</button>
                    ))}
                  </div>
                  <Button onClick={() => adhocSearch.mutate()} disabled={!searchKeyword || adhocSearch.isPending} data-testid="button-adhoc-search">
                    <Search className="w-4 h-4 mr-1" /> {adhocSearch.isPending ? "Searching…" : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {searchResults && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Open in platform</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {Object.entries(searchResults.searchUrls || {}).map(([k, v]) => (
                      <a key={k} href={v as string} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border rounded-lg text-sm font-semibold hover:bg-gray-50" data-testid={`link-platform-${k}`}>
                        {k} <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                    ))}
                  </CardContent>
                </Card>

                {(searchResults.trends?.top?.length > 0 || searchResults.trends?.rising?.length > 0) && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Related queries (Google Trends)</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-bold mb-2 text-gray-700">Top</p>
                        <div className="flex flex-wrap gap-1">
                          {(searchResults.trends.top || []).slice(0, 15).map((q: any, i: number) => (
                            <Badge key={i} variant="outline">{q.query} {q.value ? `(${q.value})` : ""}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-bold mb-2 text-gray-700">Rising</p>
                        <div className="flex flex-wrap gap-1">
                          {(searchResults.trends.rising || []).slice(0, 15).map((q: any, i: number) => (
                            <Badge key={i} className="bg-green-100 text-green-700">{q.query} {q.value ? `+${q.value}` : ""}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {Object.entries(searchResults.results || {}).map(([platform, items]: any) => (
                  <Card key={platform}>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Badge className={PLATFORM_COLORS[platform]}>{platform}</Badge> {items.length} results</CardTitle></CardHeader>
                    <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                      {items.length === 0 && <p className="text-sm text-gray-500">No results (API key may be required for {platform}).</p>}
                      {items.map((it: any, i: number) => (
                        <a key={i} href={it.url} target="_blank" rel="noopener noreferrer" className="block p-2 hover:bg-gray-50 rounded">
                          <p className="text-sm font-semibold">{it.title}</p>
                          {it.snippet && <p className="text-xs text-gray-500 line-clamp-1">{it.snippet}</p>}
                          <p className="text-xs text-gray-400">{it.author || ""} {it.metric ? `• ${it.metric}` : ""}</p>
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* TRENDING */}
          <TabsContent value="trending" className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Region:</p>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["US","GB","CA","AU","NG","ZA","IN","DE","FR","BR","JP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> Trending on Google ({region})</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                {(trendingData?.trends || []).map((t: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{i + 1}. {t.topic}</p>
                      {t.volume > 0 && <Badge variant="outline">{t.volume.toLocaleString()}+</Badge>}
                    </div>
                    {t.relatedQueries?.length > 0 && <p className="text-xs text-gray-500 mt-1">Related: {t.relatedQueries.slice(0, 4).join(", ")}</p>}
                    {t.articles?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {t.articles.map((a: any, j: number) => (
                          <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline truncate">→ {a.title} <span className="text-gray-400">({a.source})</span></a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
