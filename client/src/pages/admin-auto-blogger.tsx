import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Plus, Trash2, RefreshCw, Wand2, ExternalLink, CheckCircle2, AlertCircle, FileText } from "lucide-react";

type Source = { id: string; name: string; type: string; url: string | null; category: string | null; isActive: boolean; lastRunAt: string | null };
type Job = { id: string; sourceTitle: string; sourceUrl: string | null; status: string; blogPostId: string | null; errorMessage: string | null; category: string | null; createdAt: string; completedAt: string | null };
type Settings = { id: string; enabled: boolean; autoPublish: boolean; aiProvider: string; model: string; toneStyle: string; minWords: number; maxWords: number; imageProvider: string; includeTranscripts: boolean; embedYoutube: boolean; autopilotEnabled: boolean; autopilotIntervalMinutes: number; autopilotPerSource: number; lastAutopilotRunAt: string | null; humanizationPasses: number; humanizationStrength: string };
type Health = { geminiConfigured: boolean; openaiConfigured: boolean; youtubeApiConfigured: boolean };

export default function AdminAutoBlogger() {
  const { toast } = useToast();
  const [tab, setTab] = useState("generate");
  const [discoverItems, setDiscoverItems] = useState<{ source: string; category?: string; items: any[] } | null>(null);
  const [genTitle, setGenTitle] = useState("");
  const [genUrl, setGenUrl] = useState("");
  const [genContent, setGenContent] = useState("");
  const [genCategory, setGenCategory] = useState("Tech");
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [autoPublishOne, setAutoPublishOne] = useState(false);

  const [newSource, setNewSource] = useState({ name: "", type: "rss", url: "", category: "Tech" });

  const { data: health } = useQuery<Health>({ queryKey: ["/api/admin/auto-blogger/health"] });
  const { data: sources = [] } = useQuery<Source[]>({ queryKey: ["/api/admin/auto-blogger/sources"] });
  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ["/api/admin/auto-blogger/jobs"] });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/admin/auto-blogger/settings"] });
  const { data: posts = [] } = useQuery<any[]>({ queryKey: ["/api/admin/blog"] });

  const togglePublish = useMutation({
    mutationFn: async ({ id, post }: { id: string; post: any }) => apiRequest("PUT", `/api/admin/blog/${id}`, {
      title: post.title, content: post.content, isPublished: !post.isPublished, category: post.category,
      featuredImage: post.featuredImage, excerpt: post.excerpt, tags: post.tags,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] }); queryClient.invalidateQueries({ queryKey: ["/api/blog"] }); toast({ title: "Updated" }); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/blog/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] }); toast({ title: "Deleted" }); },
  });

  const seedSources = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/auto-blogger/sources/seed", {}),
    onSuccess: () => { toast({ title: "Seeded popular sources" }); queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-blogger/sources"] }); },
  });

  const addSource = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/auto-blogger/sources", newSource),
    onSuccess: () => {
      toast({ title: "Source added" });
      setNewSource({ name: "", type: "rss", url: "", category: "Tech" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-blogger/sources"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/auto-blogger/sources/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-blogger/sources"] }),
  });

  const discover = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/auto-blogger/sources/${id}/discover`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 8 }) });
      if (!r.ok) throw new Error((await r.json()).message || "Discover failed");
      return r.json();
    },
    onSuccess: (d) => { setDiscoverItems(d); toast({ title: `Found ${d.items.length} items from ${d.source}` }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const generateOne = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/admin/auto-blogger/generate", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).message || "Generation failed");
      return r.json();
    },
    onSuccess: (d) => {
      toast({ title: "Article created", description: d.post?.title });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-blogger/jobs"] });
      setGenTitle(""); setGenUrl(""); setGenContent("");
    },
    onError: (e: any) => toast({ title: "Generation failed", description: e.message, variant: "destructive" }),
  });

  const runSource = useMutation({
    mutationFn: async ({ id, limit }: { id: string; limit: number }) => {
      const r = await fetch(`/api/admin/auto-blogger/run-source/${id}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit }) });
      if (!r.ok) throw new Error((await r.json()).message || "Run failed");
      return r.json();
    },
    onSuccess: (d) => { toast({ title: `Created ${d.created.length} articles from ${d.source}` }); queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-blogger/jobs"] }); },
    onError: (e: any) => toast({ title: "Run failed", description: e.message, variant: "destructive" }),
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<Settings>) => apiRequest("PATCH", "/api/admin/auto-blogger/settings", patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-blogger/settings"] }),
  });

  const aiReady = !!health?.geminiConfigured || !!health?.openaiConfigured;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-600 p-[1px] mb-6 shadow-xl shadow-violet-200/40">
          <div className="rounded-3xl bg-white px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent">
                <Sparkles className="w-7 h-7 text-fuchsia-600" /> Auto Blogger
              </h1>
              <p className="text-gray-600 mt-1 text-sm">Free AI (Gemini) writes original, SEO-optimized articles with images & video — pulls feeds, transcripts, and runs on autopilot.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {health?.geminiConfigured ? <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="w-3 h-3" /> Gemini ready</Badge> : <Badge className="bg-amber-100 text-amber-700 gap-1"><AlertCircle className="w-3 h-3" /> Add GEMINI_API_KEY</Badge>}
              {health?.openaiConfigured && <Badge className="bg-blue-100 text-blue-700 gap-1"><CheckCircle2 className="w-3 h-3" /> OpenAI fallback</Badge>}
              {settings?.autopilotEnabled && <Badge className="bg-violet-100 text-violet-700 gap-1"><Wand2 className="w-3 h-3" /> Autopilot ON</Badge>}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="generate" data-testid="tab-generate">Generate</TabsTrigger>
            <TabsTrigger value="sources" data-testid="tab-sources">Sources</TabsTrigger>
            <TabsTrigger value="articles" data-testid="tab-articles">Articles</TabsTrigger>
            <TabsTrigger value="jobs" data-testid="tab-jobs">Jobs</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          {/* GENERATE */}
          <TabsContent value="generate" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Manual generate</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Source title *</Label>
                    <Input value={genTitle} onChange={e => setGenTitle(e.target.value)} placeholder="e.g. Why AI agents will replace SaaS" data-testid="input-gen-title" />
                  </div>
                  <div>
                    <Label className="text-xs">Source URL (YouTube ok)</Label>
                    <Input value={genUrl} onChange={e => setGenUrl(e.target.value)} placeholder="https://..." data-testid="input-gen-url" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Source content / context</Label>
                  <Textarea value={genContent} onChange={e => setGenContent(e.target.value)} rows={6} placeholder="Paste article body, key points, or just a brief — AI will expand and rewrite." data-testid="input-gen-content" />
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={genCategory} onValueChange={setGenCategory}>
                      <SelectTrigger className="w-40" data-testid="select-gen-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Tech","Crypto","AI","Marketing","Business","Lifestyle","News"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={includeTranscript} onCheckedChange={setIncludeTranscript} id="trans" data-testid="switch-transcript" />
                    <Label htmlFor="trans" className="text-xs">Pull YouTube transcript (if URL is a video)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={autoPublishOne} onCheckedChange={setAutoPublishOne} id="pub" data-testid="switch-publish" />
                    <Label htmlFor="pub" className="text-xs">Publish immediately</Label>
                  </div>
                  <Button disabled={!genTitle || generateOne.isPending || !aiReady} onClick={() => generateOne.mutate({ sourceTitle: genTitle, sourceUrl: genUrl, sourceContent: genContent, category: genCategory, includeTranscript, autoPublish: autoPublishOne })} data-testid="button-generate" className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 text-white">
                    <Wand2 className="w-4 h-4 mr-1" /> {generateOne.isPending ? "Writing…" : "Generate Article"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {discoverItems && (
              <Card>
                <CardHeader><CardTitle className="text-base">Discovered from {discoverItems.source}</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                  {discoverItems.items.map((it, i) => (
                    <div key={i} className="flex gap-2 items-start p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{it.title}</p>
                        {it.snippet && <p className="text-xs text-gray-500 line-clamp-2">{it.snippet}</p>}
                        {it.link && <a href={it.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">{it.link.slice(0, 70)}…</a>}
                      </div>
                      <Button size="sm" variant="outline" disabled={!health?.openaiConfigured} onClick={() => generateOne.mutate({ sourceTitle: it.title, sourceUrl: it.link, sourceContent: it.snippet, category: discoverItems.category || "Tech" })}>
                        <Wand2 className="w-3 h-3 mr-1" /> Write
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SOURCES */}
          <TabsContent value="sources" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Add Source</CardTitle>
                <Button size="sm" variant="outline" onClick={() => seedSources.mutate()}>Seed popular feeds</Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-2">
                  <Input placeholder="Name" value={newSource.name} onChange={e => setNewSource({ ...newSource, name: e.target.value })} data-testid="input-source-name" />
                  <Select value={newSource.type} onValueChange={(v) => setNewSource({ ...newSource, type: v })}>
                    <SelectTrigger data-testid="select-source-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rss">RSS feed</SelectItem>
                      <SelectItem value="reddit">Subreddit</SelectItem>
                      <SelectItem value="hackernews">HackerNews top</SelectItem>
                      <SelectItem value="youtube">YouTube channel/playlist</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder={newSource.type === "rss" ? "https://...feed" : newSource.type === "reddit" ? "subreddit name" : ""} value={newSource.url} onChange={e => setNewSource({ ...newSource, url: e.target.value })} data-testid="input-source-url" />
                  <Input placeholder="Category" value={newSource.category} onChange={e => setNewSource({ ...newSource, category: e.target.value })} />
                  <Button onClick={() => addSource.mutate()} disabled={!newSource.name || addSource.isPending}><Plus className="w-4 h-4 mr-1" /> Add</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-3">
              {sources.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{s.name}</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                        {s.category && <Badge variant="outline" className="text-[10px]">{s.category}</Badge>}
                        {s.lastRunAt && <span className="text-[10px] text-gray-400">last: {new Date(s.lastRunAt).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => discover.mutate(s.id)} disabled={discover.isPending}><RefreshCw className="w-3 h-3 mr-1" /> Discover</Button>
                      <Button size="sm" disabled={runSource.isPending || !health?.openaiConfigured} onClick={() => runSource.mutate({ id: s.id, limit: 2 })}><Wand2 className="w-3 h-3 mr-1" /> Run x2</Button>
                      <button onClick={() => { if (confirm("Delete?")) deleteSource.mutate(s.id); }} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ARTICLES */}
          <TabsContent value="articles" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Generated Articles ({posts.length})</CardTitle>
                <a href="/blog" target="_blank" className="text-xs text-violet-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View public blog</a>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {posts.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-8">No articles yet. Generate one above or turn on Autopilot.</p>}
                {posts.map((p: any) => (
                  <div key={p.id} className="group rounded-2xl overflow-hidden border border-gray-200 bg-white hover:border-violet-300 hover:shadow-lg transition-all flex flex-col" data-testid={`article-card-${p.id}`}>
                    {p.featuredImage && (
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img src={p.featuredImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    )}
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{p.category || "General"}</Badge>
                        <Badge className={`text-[10px] ${p.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.isPublished ? "Published" : "Draft"}</Badge>
                      </div>
                      <p className="font-bold text-sm leading-tight line-clamp-2">{p.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 flex-1">{p.excerpt}</p>
                      <div className="flex items-center justify-between gap-1 mt-3">
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline flex items-center gap-1" data-testid={`button-view-${p.id}`}>
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant={p.isPublished ? "outline" : "default"} className={`h-7 text-[11px] px-2 ${p.isPublished ? "" : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white"}`} disabled={togglePublish.isPending} onClick={() => togglePublish.mutate({ id: p.id, post: p })} data-testid={`button-toggle-${p.id}`}>
                            {p.isPublished ? "Unpublish" : "Publish"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { if (confirm(`Delete "${p.title}"?`)) deletePost.mutate(p.id); }} data-testid={`button-delete-${p.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* JOBS */}
          <TabsContent value="jobs" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs">
                    <tr>
                      <th className="text-left p-3">Source title</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Category</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-left p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} className="border-t">
                        <td className="p-3 max-w-md">
                          <p className="font-semibold truncate">{j.sourceTitle}</p>
                          {j.errorMessage && <p className="text-xs text-red-500 truncate">{j.errorMessage}</p>}
                        </td>
                        <td className="p-3">
                          <Badge className={j.status === "published" ? "bg-green-100 text-green-700" : j.status === "failed" ? "bg-red-100 text-red-700" : j.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}>
                            {j.status === "published" || j.status === "completed" ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : j.status === "failed" ? <AlertCircle className="w-3 h-3 mr-1 inline" /> : null}
                            {j.status}
                          </Badge>
                        </td>
                        <td className="p-3">{j.category || "—"}</td>
                        <td className="p-3 text-xs text-gray-500">{new Date(j.createdAt).toLocaleString()}</td>
                        <td className="p-3">
                          {j.blogPostId && <a href={`/blog/${j.blogPostId}`} target="_blank" className="text-blue-600 text-xs flex items-center gap-1"><FileText className="w-3 h-3" /> View</a>}
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">No jobs yet</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-6">
            {settings && (
              <Card>
                <CardContent className="p-4 space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <Label>Auto-publish generated articles</Label>
                    <Switch checked={settings.autoPublish} onCheckedChange={(v) => updateSettings.mutate({ autoPublish: v })} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">AI Provider</Label>
                      <Select value={settings.aiProvider || "gemini"} onValueChange={(v) => updateSettings.mutate({ aiProvider: v, model: v === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini" })}>
                        <SelectTrigger data-testid="select-ai-provider"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Google Gemini (free)</SelectItem>
                          <SelectItem value="openai">OpenAI (paid)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">AI Model</Label>
                      <Select value={settings.model} onValueChange={(v) => updateSettings.mutate({ model: v })}>
                        <SelectTrigger data-testid="select-ai-model"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(settings.aiProvider || "gemini") === "gemini" ? (
                            <>
                              <SelectItem value="gemini-2.5-flash">gemini-2.5-flash (fast, free)</SelectItem>
                              <SelectItem value="gemini-2.5-pro">gemini-2.5-pro (best quality)</SelectItem>
                              <SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                              <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                              <SelectItem value="gpt-4.1-mini">gpt-4.1-mini</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tone</Label>
                      <Select value={settings.toneStyle} onValueChange={(v) => updateSettings.mutate({ toneStyle: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="informative">Informative</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                          <SelectItem value="storytelling">Storytelling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Featured image</Label>
                      <Select value={settings.imageProvider} onValueChange={(v) => updateSettings.mutate({ imageProvider: v })}>
                        <SelectTrigger data-testid="select-image-provider"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pollinations">Pollinations AI (free, no key)</SelectItem>
                          <SelectItem value="gemini">Google Imagen via Gemini (key required)</SelectItem>
                          <SelectItem value="unsplash">Unsplash photo</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Min words</Label>
                      <Input type="number" defaultValue={settings.minWords} onBlur={(e) => updateSettings.mutate({ minWords: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Max words</Label>
                      <Input type="number" defaultValue={settings.maxWords} onBlur={(e) => updateSettings.mutate({ maxWords: Number(e.target.value) })} />
                    </div>
                  </div>

                  {/* Humanization (multi-pass) */}
                  <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Label className="text-sm font-semibold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">AI Humanization (multi-pass)</Label>
                        <p className="text-xs text-gray-500 mt-1">Run extra Gemini passes to rewrite drafts in a natural human voice and remove AI tells (delve, tapestry, ever-evolving…). Each pass adds ~5-15s per article.</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Passes</Label>
                        <Select value={String(settings.humanizationPasses ?? 0)} onValueChange={(v) => updateSettings.mutate({ humanizationPasses: Number(v) })}>
                          <SelectTrigger data-testid="select-humanization-passes"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Off — single-pass draft</SelectItem>
                            <SelectItem value="1">1 — Humanize pass</SelectItem>
                            <SelectItem value="2">2 — Humanize + Polish (best)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Rewrite strength</Label>
                        <Select value={settings.humanizationStrength || "medium"} onValueChange={(v) => updateSettings.mutate({ humanizationStrength: v })}>
                          <SelectTrigger data-testid="select-humanization-strength"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light — smooth tells only</SelectItem>
                            <SelectItem value="medium">Medium — natural voice</SelectItem>
                            <SelectItem value="heavy">Heavy — opinionated rewrite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label>Pull YouTube transcripts</Label>
                        <p className="text-xs text-gray-500">Use video transcripts as source context.</p>
                      </div>
                      <Switch checked={!!settings.includeTranscripts} onCheckedChange={(v) => updateSettings.mutate({ includeTranscripts: v })} data-testid="switch-transcripts" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label>Embed source video</Label>
                        <p className="text-xs text-gray-500">If source is YouTube, embed it inline.</p>
                      </div>
                      <Switch checked={!!settings.embedYoutube} onCheckedChange={(v) => updateSettings.mutate({ embedYoutube: v })} data-testid="switch-embed-yt" />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-gradient-to-br from-violet-50 to-cyan-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Smart Autopilot Agent</Label>
                        <p className="text-xs text-gray-600">Pulls feeds + YouTube on a timer, writes articles, adds free images, and publishes for you.</p>
                      </div>
                      <Switch checked={!!settings.autopilotEnabled} onCheckedChange={(v) => updateSettings.mutate({ autopilotEnabled: v })} data-testid="switch-autopilot" />
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Run every (minutes)</Label>
                        <Input type="number" min={15} defaultValue={settings.autopilotIntervalMinutes || 180} onBlur={(e) => updateSettings.mutate({ autopilotIntervalMinutes: Math.max(15, Number(e.target.value) || 180) })} data-testid="input-autopilot-interval" />
                      </div>
                      <div>
                        <Label className="text-xs">Articles per source / run</Label>
                        <Input type="number" min={1} max={5} defaultValue={settings.autopilotPerSource || 1} onBlur={(e) => updateSettings.mutate({ autopilotPerSource: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} data-testid="input-autopilot-per-source" />
                      </div>
                      <div className="flex items-end">
                        <Button
                          className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white"
                          onClick={async () => {
                            const r = await fetch("/api/admin/auto-blogger/autopilot/run-now", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
                            const d = await r.json();
                            if (!r.ok) toast({ title: "Autopilot failed", description: d.message, variant: "destructive" });
                            else { toast({ title: "Autopilot run finished", description: (d.totals || []).map((t: any) => `${t.source}: ${t.created}`).join(" • ") || "No items" }); queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-blogger/jobs"] }); }
                          }}
                          data-testid="button-autopilot-run-now"
                        >
                          <Wand2 className="w-4 h-4 mr-1" /> Run autopilot now
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Last autopilot run: {settings.lastAutopilotRunAt ? new Date(settings.lastAutopilotRunAt).toLocaleString() : "never"}</p>
                  </div>

                  <p className="text-xs text-gray-500 pt-2">
                    Gemini API: {health?.geminiConfigured ? "✓ configured" : "✗ add GEMINI_API_KEY (free at aistudio.google.com)"} •
                    OpenAI API: {health?.openaiConfigured ? "✓ configured" : "optional"} •
                    YouTube API: {health?.youtubeApiConfigured ? "✓ configured" : "optional"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
