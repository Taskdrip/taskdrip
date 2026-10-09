import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ExternalLink, Eye, EyeOff, PackageCheck, Plus, Rocket, Search, WandSparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Project = {
  id: string;
  slug: string;
  name: string;
  version: string;
  author: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  coreFileCount: number;
  premiumFileCount: number;
  status: "draft" | "published";
  createdAt: string;
  product: null | { id: string; price: string; salesCount: number | null; isActive: boolean | null };
};

const initialDraft = {
  name: "",
  slug: "",
  version: "1.0.0",
  author: "Taskdrip",
  sourcePrompt: "",
  shortDescription: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  price: "49.00",
};

const featurePillars = [
  ["CourseBridge starter", "A built-in LearnPress + WooCommerce package is generated from reviewed source templates; no AI provider is needed to download it."],
  ["Describe another plugin", "Turn a feature brief into separate core and premium source packages using the configured Creator Studio AI model."],
  ["Test the free core", "Download the useful, GPL-compatible core ZIP for review and WordPress.org submission preparation."],
  ["Sell the add-on", "Download and test the separate premium add-on, then publish its product through the existing Taskdrip Shop."],
  ["Review before release", "New products stay in draft until an admin reviews both packages and tests them on a staging WordPress site."],
];

export default function AdminPluginStudio() {
  const { toast } = useToast();
  const [draft, setDraft] = useState(initialDraft);
  const [downloadingKey, setDownloadingKey] = useState("");
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/admin/plugin-studio/projects"],
  });
  const { data: aiStatus } = useQuery<{ aiAvailable: boolean; provider: string; model: string; settingsUrl: string }>({
    queryKey: ["/api/admin/plugin-studio/ai-status"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/plugin-studio/projects", {
        ...draft,
        price: Number(draft.price),
      });
      return response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      toast({ title: "Plugin packages generated", description: `${project.name} has a core build and a premium add-on. Review and test them before publishing.` });
      setDraft(initialDraft);
    },
    onError: (mutationError: Error) => toast({ title: "Could not create plugin", description: mutationError.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      const response = await apiRequest("PATCH", `/api/admin/plugin-studio/projects/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      toast({ title: "Shop listing updated" });
    },
    onError: (mutationError: Error) => toast({ title: "Could not update listing", description: mutationError.message, variant: "destructive" }),
  });

  const download = async (project: Project, edition: "core" | "premium") => {
    const key = `${project.id}:${edition}`;
    setDownloadingKey(key);
    try {
      const response = await fetch(`/api/admin/plugin-studio/projects/${project.id}/download?edition=${edition}`, { credentials: "include" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Could not generate the plugin ZIP.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.slug}-${edition === "core" ? "core" : "premium"}-${project.version}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({ title: `${edition === "core" ? "Core" : "Premium add-on"} ZIP downloaded`, description: "Install both editions on a staging WordPress site and test them before publishing." });
    } catch (downloadError: any) {
      toast({ title: "Download failed", description: downloadError.message, variant: "destructive" });
    } finally {
      setDownloadingKey("");
    }
  };

  const set = (key: keyof typeof initialDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const publishedCount = projects.filter((project) => project.status === "published").length;

  return (
    <main className="mx-auto max-w-7xl space-y-7 p-4 md:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-7 text-white md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2 text-violet-200"><WandSparkles className="h-5 w-5" /> TASKDRIP PLUGIN STUDIO</div>
          <h1 className="text-3xl font-bold md:text-4xl">Build and sell WordPress plugins</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">Generate a useful GPL-compatible free core for WordPress.org and a separate premium add-on to sell through Taskdrip Shop.</p>
        </div>
        <div className="grid min-w-[190px] grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{projects.length}</div><div className="text-xs text-slate-300">Plugin packages</div></div>
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{publishedCount}</div><div className="text-xs text-slate-300">Listed in shop</div></div>
        </div>
      </header>

      {aiStatus && !aiStatus.aiAvailable && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-amber-950">Custom plugin generation needs an AI provider</p>
              <p className="text-sm text-amber-900">The built-in CourseBridge Core and Premium packages remain available to download without AI. Set up the Creator Studio provider only to generate additional plugins.</p>
            </div>
            <Button asChild variant="outline"><a href={aiStatus.settingsUrl}>Open AI settings</a></Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-indigo-700" />Independent plugin engine</CardTitle>
          <CardDescription>
            {aiStatus?.aiAvailable
              ? `Source generation is connected to ${aiStatus.provider} (${aiStatus.model}).`
              : "Creates separate WordPress plugin source packages from each functional brief."}
            {" "}New builds remain drafts until an admin reviews and tests them.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featurePillars.map(([title, description]) => (
            <div key={title} className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Generate a new plugin</CardTitle>
            <CardDescription>One brief creates a free directory core and a separate premium Taskdrip add-on. Both are packaged as installable ZIPs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="plugin-name">Plugin name</Label><Input id="plugin-name" value={draft.name} onChange={(event) => set("name", event.target.value)} required maxLength={120} /></div>
                <div className="space-y-2"><Label htmlFor="plugin-version">Version</Label><Input id="plugin-version" value={draft.version} onChange={(event) => set("version", event.target.value)} required placeholder="1.0.0" /></div>
                <div className="space-y-2"><Label htmlFor="plugin-slug">Suggested slug</Label><Input id="plugin-slug" value={draft.slug} onChange={(event) => set("slug", event.target.value)} required maxLength={80} /></div>
                <div className="space-y-2"><Label htmlFor="plugin-author">Author</Label><Input id="plugin-author" value={draft.author} onChange={(event) => set("author", event.target.value)} required maxLength={80} /></div>
                <div className="space-y-2"><Label htmlFor="plugin-price">Shop price (USD)</Label><Input id="plugin-price" type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => set("price", event.target.value)} required /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plugin-prompt">What should the plugin do?</Label>
                <Textarea id="plugin-prompt" value={draft.sourcePrompt} onChange={(event) => set("sourcePrompt", event.target.value)} rows={7} maxLength={6000} minLength={30} required placeholder="Describe the users, workflow, screens, settings, data to store, permissions, and the useful free features versus paid add-on features." />
                <p className="text-xs text-muted-foreground">Be specific about behavior and how the premium add-on should extend the free core. Generation uses the configured Creator Studio AI provider.</p>
              </div>
              <div className="space-y-2"><Label htmlFor="plugin-short">Premium shop summary</Label><Textarea id="plugin-short" value={draft.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} rows={2} maxLength={180} required /><p className="text-right text-xs text-muted-foreground">{draft.shortDescription.length}/180</p></div>
              <div className="space-y-2"><Label htmlFor="plugin-description">Premium product description</Label><Textarea id="plugin-description" value={draft.description} onChange={(event) => set("description", event.target.value)} rows={5} maxLength={6000} required /></div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><Search className="h-4 w-4" />Search listing and product SEO</h3>
                <div className="space-y-3">
                  <div className="space-y-1"><Label htmlFor="seo-title">SEO title</Label><Input id="seo-title" value={draft.seoTitle} onChange={(event) => set("seoTitle", event.target.value)} maxLength={70} required /><p className="text-right text-xs text-muted-foreground">{draft.seoTitle.length}/70</p></div>
                  <div className="space-y-1"><Label htmlFor="seo-description">Meta description</Label><Textarea id="seo-description" value={draft.seoDescription} onChange={(event) => set("seoDescription", event.target.value)} rows={2} maxLength={180} required /><p className="text-right text-xs text-muted-foreground">{draft.seoDescription.length}/180</p></div>
                  <div className="space-y-1"><Label htmlFor="seo-keywords">Search phrases</Label><Input id="seo-keywords" value={draft.seoKeywords} onChange={(event) => set("seoKeywords", event.target.value)} maxLength={600} /></div>
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-700 hover:bg-indigo-800" disabled={createMutation.isPending || aiStatus?.aiAvailable === false}>
                <Rocket className="mr-2 h-4 w-4" />{createMutation.isPending ? "Generating both plugin editions…" : "Generate core + premium add-on"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">Generated code is an unreviewed draft. Check the source, test both ZIPs on a staging site, and confirm licensing/security before selling or submitting the core.</p>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Plugin packages</h2>
            <p className="text-sm text-muted-foreground">Download and test each edition. Only reviewed, published premium add-ons appear in Taskdrip Shop.</p>
          </div>
          {isLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading your plugin studio…</CardContent></Card>}
          {error && <Card className="border-red-200"><CardContent className="p-6 text-sm text-red-700">Could not load plugin projects. The admin session and database need to be available.</CardContent></Card>}
          {!isLoading && !error && projects.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No plugins yet. Describe a plugin on the left to generate its free core and premium add-on.</CardContent></Card>}
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge variant={project.status === "published" ? "default" : "secondary"}>{project.status}</Badge>
                    </div>
                    <CardDescription>{project.shortDescription}</CardDescription>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{project.product ? `$${Number(project.product.price).toFixed(2)}` : "No shop item"}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Version:</span> {project.version}</div>
                  <div><span className="text-muted-foreground">Shop sales:</span> {project.product?.salesCount ?? 0}</div>
                  <div><span className="text-muted-foreground">Free core files:</span> {project.coreFileCount || "Legacy template"}</div>
                  <div><span className="text-muted-foreground">Premium files:</span> {project.premiumFileCount || "Legacy template"}</div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Shop SEO:</span> {project.seoTitle || "Not set"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.coreFileCount > 0 ? (
                    <Button size="sm" variant="outline" onClick={() => download(project, "core")} disabled={Boolean(downloadingKey)}>
                      <ArrowDownToLine className="mr-2 h-4 w-4" />{downloadingKey === `${project.id}:core` ? "Preparing core ZIP…" : "Download free core ZIP"}
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => download(project, "premium")} disabled={Boolean(downloadingKey)}>
                    <ArrowDownToLine className="mr-2 h-4 w-4" />{downloadingKey === `${project.id}:premium` ? "Preparing add-on ZIP…" : project.coreFileCount > 0 ? "Download premium add-on ZIP" : "Download legacy plugin ZIP"}
                  </Button>
                  {project.product && project.status === "published" && (
                    <Button asChild size="sm" variant="outline"><a href={`/shop/product/${project.product.id}`}><ExternalLink className="mr-2 h-4 w-4" />View shop page</a></Button>
                  )}
                  {project.status === "published" ? (
                    <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: project.id, status: "draft" })} disabled={statusMutation.isPending}>
                      <EyeOff className="mr-2 h-4 w-4" />Unlist
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => {
                      if (window.confirm("Confirm you reviewed both plugin packages and tested them on a staging WordPress site. Publish the premium add-on to Taskdrip Shop?")) {
                        statusMutation.mutate({ id: project.id, status: "published" });
                      }
                    }} disabled={statusMutation.isPending}>
                      <Eye className="mr-2 h-4 w-4" />Publish add-on to shop
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader><CardTitle className="text-base">Test, list, and sell</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Install the free core ZIP on a staging WordPress site, then install the premium add-on and verify both work together. The generated core archive contains its own readme, GPL license notice, and WordPress.org preparation checklist.</p>
              <p>The core must be useful on its own and pass human review before submission. WordPress.org decides whether to accept it and manages its SVN release; the paid add-on stays separate and is delivered to verified Taskdrip buyers after shop publication.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
