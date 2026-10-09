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
  status: "draft" | "published";
  createdAt: string;
  product: null | { id: string; price: string; salesCount: number | null; isActive: boolean | null };
};

const initialDraft = {
  name: "LearnPress WooCommerce Connector Plus",
  slug: "learnpress-woocommerce-connector",
  version: "1.0.0",
  author: "Taskdrip",
  shortDescription: "Connect WooCommerce product sales to LearnPress courses and manage opted-in course buyers with Resend.",
  description:
    "Connect WooCommerce products to LearnPress courses. After a payment is confirmed, CourseBridge enrolls the customer in every course linked to purchased products. Review successful orders, products, LearnPress enrollments, customer roles, and spend in the WordPress dashboard. Segment course buyers and send individual or selected-group campaigns through Resend to customers who opted in, with unsubscribe links and campaign logs.",
  seoTitle: "LearnPress WooCommerce Course Enrollment & Email Plugin",
  seoDescription:
    "Automatically enroll WooCommerce buyers into linked LearnPress courses. Track course purchases and send consent-based Resend email campaigns.",
  seoKeywords:
    "LearnPress WooCommerce integration, WooCommerce course enrollment, LearnPress course sales, WordPress LMS plugin, Resend email marketing",
  price: "49.00",
};

const featurePillars = [
  ["Safe WordPress foundation", "Namespaced file structure, activation/deactivation hooks, capability checks, nonce validation, escaping, input sanitization, translations, and opt-in uninstall cleanup."],
  ["Course commerce", "Map WooCommerce products to LearnPress courses; enroll only after paid order confirmation and prevent duplicate enrollment."],
  ["Buyer operations", "Show paid products, courses, customer roles, orders, and spend; filter a buyer audience by course, product, role, or consent."],
  ["Consent-based email", "Connect Resend from WordPress settings, send selected campaigns, record delivery results, and include working unsubscribe links."],
  ["Search and release", "Create SEO title, description, keywords, schema-ready product details, a WordPress readme, GPL headers, and repository submission notes."],
];

export default function AdminPluginStudio() {
  const { toast } = useToast();
  const [draft, setDraft] = useState(initialDraft);
  const [publishToShop, setPublishToShop] = useState(true);
  const [downloadingId, setDownloadingId] = useState("");
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/admin/plugin-studio/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/plugin-studio/projects", {
        ...draft,
        price: Number(draft.price),
        publishToShop,
      });
      return response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      toast({ title: "Plugin package created", description: `${project.name} is ready to download.` });
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

  const download = async (project: Project) => {
    setDownloadingId(project.id);
    try {
      const response = await fetch(`/api/admin/plugin-studio/projects/${project.id}/download`, { credentials: "include" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Could not generate the plugin ZIP.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.slug}-${project.version}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Plugin ZIP downloaded", description: "Upload it in WordPress under Plugins → Add New Plugin → Upload Plugin." });
    } catch (downloadError: any) {
      toast({ title: "Download failed", description: downloadError.message, variant: "destructive" });
    } finally {
      setDownloadingId("");
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
          <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">Create a WordPress-ready package, prepare its shop listing and SEO, then download the ZIP for installation or repository review.</p>
        </div>
        <div className="grid min-w-[190px] grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{projects.length}</div><div className="text-xs text-slate-300">Plugin packages</div></div>
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{publishedCount}</div><div className="text-xs text-slate-300">Listed in shop</div></div>
        </div>
      </header>

      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-indigo-700" />Included production foundations</CardTitle>
          <CardDescription>The current generator template builds the LearnPress + WooCommerce course sales and email marketing plugin.</CardDescription>
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
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Build a plugin package</CardTitle>
            <CardDescription>Each package includes the working LearnPress–WooCommerce feature set, editable product content, SEO fields, a plugin readme, and release notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="plugin-name">Plugin name</Label><Input id="plugin-name" value={draft.name} onChange={(event) => set("name", event.target.value)} required maxLength={120} /></div>
                <div className="space-y-2"><Label htmlFor="plugin-version">Version</Label><Input id="plugin-version" value={draft.version} onChange={(event) => set("version", event.target.value)} required placeholder="1.0.0" /></div>
                <div className="space-y-2"><Label htmlFor="plugin-slug">Suggested slug</Label><Input id="plugin-slug" value={draft.slug} onChange={(event) => set("slug", event.target.value)} required maxLength={80} /></div>
                <div className="space-y-2"><Label htmlFor="plugin-author">Author</Label><Input id="plugin-author" value={draft.author} onChange={(event) => set("author", event.target.value)} required maxLength={80} /></div>
                <div className="space-y-2"><Label htmlFor="plugin-price">Shop price (USD)</Label><Input id="plugin-price" type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => set("price", event.target.value)} required /></div>
                <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={publishToShop} onChange={(event) => setPublishToShop(event.target.checked)} />List in Taskdrip Shop when created</label>
              </div>
              <div className="space-y-2"><Label htmlFor="plugin-short">Shop summary</Label><Textarea id="plugin-short" value={draft.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} rows={2} maxLength={180} required /><p className="text-right text-xs text-muted-foreground">{draft.shortDescription.length}/180</p></div>
              <div className="space-y-2"><Label htmlFor="plugin-description">Product description</Label><Textarea id="plugin-description" value={draft.description} onChange={(event) => set("description", event.target.value)} rows={5} maxLength={6000} required /></div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><Search className="h-4 w-4" />Search listing and product SEO</h3>
                <div className="space-y-3">
                  <div className="space-y-1"><Label htmlFor="seo-title">SEO title</Label><Input id="seo-title" value={draft.seoTitle} onChange={(event) => set("seoTitle", event.target.value)} maxLength={70} required /><p className="text-right text-xs text-muted-foreground">{draft.seoTitle.length}/70</p></div>
                  <div className="space-y-1"><Label htmlFor="seo-description">Meta description</Label><Textarea id="seo-description" value={draft.seoDescription} onChange={(event) => set("seoDescription", event.target.value)} rows={2} maxLength={180} required /><p className="text-right text-xs text-muted-foreground">{draft.seoDescription.length}/180</p></div>
                  <div className="space-y-1"><Label htmlFor="seo-keywords">Search phrases</Label><Input id="seo-keywords" value={draft.seoKeywords} onChange={(event) => set("seoKeywords", event.target.value)} maxLength={600} /></div>
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-700 hover:bg-indigo-800" disabled={createMutation.isPending}>
                <Rocket className="mr-2 h-4 w-4" />{createMutation.isPending ? "Building package…" : "Build plugin and shop listing"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">The Taskdrip app does not store a Resend key. Plugin buyers configure their own key in WordPress after installing the ZIP.</p>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Plugin packages</h2>
            <p className="text-sm text-muted-foreground">Download any package as an installable ZIP. Only published packages appear in the public shop.</p>
          </div>
          {isLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading your plugin studio…</CardContent></Card>}
          {error && <Card className="border-red-200"><CardContent className="p-6 text-sm text-red-700">Could not load plugin projects. The admin session and database need to be available.</CardContent></Card>}
          {!isLoading && !error && projects.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">The first plugin will be provisioned here when the studio connects to the database.</CardContent></Card>}
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
                  <div className="sm:col-span-2"><span className="text-muted-foreground">SEO:</span> {project.seoTitle || "Not set"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => download(project)} disabled={downloadingId === project.id}>
                    <ArrowDownToLine className="mr-2 h-4 w-4" />{downloadingId === project.id ? "Preparing ZIP…" : "Download plugin ZIP"}
                  </Button>
                  {project.product && project.status === "published" && (
                    <Button asChild size="sm" variant="outline"><a href={`/shop/product/${project.product.id}`}><ExternalLink className="mr-2 h-4 w-4" />View shop page</a></Button>
                  )}
                  {project.status === "published" ? (
                    <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: project.id, status: "draft" })} disabled={statusMutation.isPending}>
                      <EyeOff className="mr-2 h-4 w-4" />Unlist
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: project.id, status: "published" })} disabled={statusMutation.isPending}>
                      <Eye className="mr-2 h-4 w-4" />Publish to shop
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader><CardTitle className="text-base">WordPress.org release note</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>The generated ZIP contains a repository-shaped plugin folder, WordPress readme, GPL headers, install notes, and a submission checklist. Install it directly from the ZIP to test.</p>
              <p>WordPress.org submissions require their own review and SVN release process. Paid-only packages must not be submitted as directory-hosted plugins; see the included deployment guide for the review checklist.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
