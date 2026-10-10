import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownToLine, ExternalLink, Eye, EyeOff, PackageCheck, Plus, Rocket, Search, WandSparkles, Save, Upload, MessageSquare, KeyRound, RefreshCw, Copy } from "lucide-react";
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
  licenseApiBaseUrl?: string | null;
  maxActivations?: number;
  releaseNotes?: string | null;
  createdAt: string;
  product: null | {
    id: string;
    price: string;
    salesCount: number | null;
    isActive: boolean | null;
    serviceAddons?: { id: string; title: string; price: number }[];
  };
};

type StudioMetrics = {
  totals: { licenses: number; activeLicenses: number; activeInstalls: number; trackedEvents: number; pluginSales: number; revenueUsd: number };
  projects: { id: string; name: string; salesCount: number; revenueUsd: number; activeLicenses: number; installs: number; usage: Record<string, number> }[];
  licenses: { id: string; projectName: string; buyerEmail: string; status: string; cadence: string; keyPrefix: string; expiresAt: string; activeInstalls: number; maxActivations: number }[];
};

type SupportThread = {
  id: string;
  projectName: string;
  buyerEmail: string;
  requestType: string;
  subject: string;
  status: string;
  messages: { id: string; senderId: string; content: string; createdAt: string }[];
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
  monthlyPrice: "",
  yearlyPrice: "",
};

const featurePillars = [
  ["CourseBridge starter", "The free core maps products to LearnPress courses and lets site admins assign courses directly to users; no AI provider is needed."],
  ["Describe another plugin", "Turn a feature brief into separate core and premium source packages using the configured Creator Studio AI model."],
  ["Test the free core", "Download the useful, GPL-compatible core ZIP for review and WordPress.org submission preparation."],
  ["Sell the add-on", "Download and test the separate premium add-on, then publish its product through the existing Taskdrip Shop."],
  ["Review before release", "New products stay in draft until an admin reviews both packages and tests them on a staging WordPress site."],
];

function projectLoadErrorDetails(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const status = Number(message.match(/(?:^|\D)(\d{3})(?=[:\s])/)?.[1] || 0);
  if (status === 401) {
    return {
      title: "Your admin session has expired",
      message: "Sign in again to reload Plugin Studio. Your projects and license data remain protected until an administrator is authenticated.",
      signIn: true,
    };
  }
  if (status === 403) {
    return {
      title: "Administrator access is required",
      message: "This account is signed in but does not have permission to manage Plugin Studio.",
      signIn: false,
    };
  }
  if (status >= 500) {
    return {
      title: "Plugin Studio could not read its data",
      message: "The server returned an error while loading the project records. Safe startup setup now creates the required plugin, license, usage, and support tables. Retry after the server finishes restarting; if this continues, check the Taskdrip server logs and database connection.",
      signIn: false,
    };
  }
  return {
    title: "Plugin Studio could not connect",
    message: "Check your connection and retry. If the problem continues, check the Taskdrip server logs.",
    signIn: false,
  };
}

function nextPatchVersion(version: string): string {
  const [base = "1.0.0"] = version.split("-");
  const parts = base.split(".");
  const patch = Number.parseInt(parts[2] || "0", 10);
  return `${parts[0] || "1"}.${parts[1] || "0"}.${(Number.isFinite(patch) ? patch : 0) + 1}`;
}

export default function AdminPluginStudio() {
  const { toast } = useToast();
  const [draft, setDraft] = useState(initialDraft);
  const [downloadingKey, setDownloadingKey] = useState("");
  const [projectSettings, setProjectSettings] = useState<Record<string, { monthlyPrice: string; yearlyPrice: string; licenseApiBaseUrl: string; maxActivations: string }>>({});
  const [releaseForms, setReleaseForms] = useState<Record<string, { version: string; releaseNotes: string; file: File | null }>>({});
  const [supportReplies, setSupportReplies] = useState<Record<string, string>>({});
  const [licenseDraft, setLicenseDraft] = useState<{ projectId: string; email: string; cadence: "monthly" | "yearly" }>({
    projectId: "",
    email: "",
    cadence: "yearly",
  });
  const [adminLicenseKeys, setAdminLicenseKeys] = useState<Record<string, string>>({});
  const {
    data: projects = [],
    isLoading,
    error,
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = useQuery<Project[]>({
    queryKey: ["/api/admin/plugin-studio/projects"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/plugin-studio/projects")).json(),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data: metrics, error: metricsError, isFetching: metricsFetching, refetch: refetchMetrics } = useQuery<StudioMetrics>({
    queryKey: ["/api/admin/plugin-studio/licensing"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/plugin-studio/licensing")).json(),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data: supportThreads = [], error: supportError, isFetching: supportFetching, refetch: refetchSupport } = useQuery<SupportThread[]>({
    queryKey: ["/api/admin/plugin-studio/support"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/plugin-studio/support")).json(),
    retry: false,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const { data: aiStatus } = useQuery<{ aiAvailable: boolean; provider: string; model: string; settingsUrl: string }>({
    queryKey: ["/api/admin/plugin-studio/ai-status"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/plugin-studio/ai-status")).json(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/plugin-studio/projects", {
        ...draft,
        monthlyPrice: Number(draft.monthlyPrice),
        yearlyPrice: Number(draft.yearlyPrice),
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

  const settingsMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: { monthlyPrice: number; yearlyPrice: number; licenseApiBaseUrl: string; maxActivations: number } }) => {
      const response = await apiRequest("PATCH", `/api/admin/plugin-studio/projects/${id}`, values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      toast({ title: "Plugin license settings saved" });
    },
    onError: (mutationError: Error) => toast({ title: "Could not save settings", description: mutationError.message, variant: "destructive" }),
  });

  const releaseMutation = useMutation({
    mutationFn: async ({ project, form }: { project: Project; form: { version: string; releaseNotes: string; file: File | null } }) => {
      if (!form.file) throw new Error("Choose the updated premium plugin ZIP.");
      const body = new FormData();
      body.set("version", form.version);
      body.set("releaseNotes", form.releaseNotes);
      body.set("zip", form.file);
      const response = await fetch(`/api/admin/plugin-studio/projects/${project.id}/release`, { method: "POST", credentials: "include", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not publish this update.");
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/licensing"] });
      setReleaseForms((current) => ({ ...current, [variables.project.id]: { version: result.version, releaseNotes: "", file: null } }));
      toast({ title: `Version ${result.version} released`, description: "Licensed WordPress installs can now receive the update automatically." });
    },
    onError: (mutationError: Error) => toast({ title: "Could not publish update", description: mutationError.message, variant: "destructive" }),
  });

  const supportReplyMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/plugin-support/${threadId}/messages`, { content });
      return response.json();
    },
    onSuccess: (_message, variables) => {
      setSupportReplies((current) => ({ ...current, [variables.threadId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/support"] });
      toast({ title: "Reply sent" });
    },
    onError: (mutationError: Error) => toast({ title: "Could not send reply", description: mutationError.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/admin/plugin-studio/licenses/${id}/revoke`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/licensing"] });
      toast({ title: "License revoked" });
    },
    onError: (mutationError: Error) => toast({ title: "Could not revoke license", description: mutationError.message, variant: "destructive" }),
  });

  const issueLicenseMutation = useMutation({
    mutationFn: async (values: typeof licenseDraft) => {
      const response = await apiRequest("POST", "/api/admin/plugin-studio/licenses", values);
      return response.json();
    },
    onSuccess: (license) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plugin-studio/licensing"] });
      setAdminLicenseKeys((current) => ({ ...current, [license.id]: license.licenseKey }));
      setLicenseDraft((current) => ({ ...current, email: "" }));
      toast({ title: "Plugin license generated", description: `${license.projectName} is active through ${new Date(license.expiresAt).toLocaleDateString()}.` });
    },
    onError: (mutationError: Error) => toast({ title: "Could not generate license", description: mutationError.message, variant: "destructive" }),
  });

  const revealAdminLicenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/plugin-studio/licenses/${id}/reveal`, {});
      return response.json();
    },
    onSuccess: (result, id) => setAdminLicenseKeys((current) => ({ ...current, [id]: result.licenseKey })),
    onError: (mutationError: Error) => toast({ title: "Could not reveal license key", description: mutationError.message, variant: "destructive" }),
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
  const settingsFor = (project: Project) => projectSettings[project.id] || {
    monthlyPrice: String(project.product?.serviceAddons?.find((plan) => plan.id === "plugin-monthly")?.price ?? ""),
    yearlyPrice: String(project.product?.serviceAddons?.find((plan) => plan.id === "plugin-yearly")?.price ?? ""),
    licenseApiBaseUrl: project.licenseApiBaseUrl || "",
    maxActivations: String(project.maxActivations || 3),
  };
  const releaseFor = (project: Project) => releaseForms[project.id] || {
    version: nextPatchVersion(project.version),
    releaseNotes: "",
    file: null,
  };
  const setSettings = (id: string, key: "monthlyPrice" | "yearlyPrice" | "licenseApiBaseUrl" | "maxActivations", value: string) => {
    const project = projects.find((item) => item.id === id);
    if (project) setProjectSettings((current) => ({ ...current, [id]: { ...settingsFor(project), [key]: value } }));
  };
  const setReleaseField = (id: string, key: "version" | "releaseNotes" | "file", value: string | File | null) => {
    const project = projects.find((item) => item.id === id);
    if (project) setReleaseForms((current) => ({ ...current, [id]: { ...releaseFor(project), [key]: value } as { version: string; releaseNotes: string; file: File | null } }));
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading Plugin Studio projects and admin session…</CardContent></Card>
      </main>
    );
  }
  if (error) {
    const details = projectLoadErrorDetails(error);
    return (
      <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-8">
        <header className="rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white">
          <p className="text-sm font-semibold tracking-wide text-violet-200">TASKDRIP PLUGIN STUDIO</p>
          <h1 className="mt-2 text-2xl font-bold">Build and manage paid plugins</h1>
        </header>
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />{details.title}</CardTitle>
            <CardDescription>{details.message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {details.signIn && <Button asChild><a href="/login?redirect=%2Fadmin%2Fplugin-studio">Sign in as an administrator</a></Button>}
            <Button variant="outline" onClick={() => { void refetchProjects(); }} disabled={projectsFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${projectsFetching ? "animate-spin" : ""}`} />
              {projectsFetching ? "Retrying…" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-7 p-4 md:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-7 text-white md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2 text-violet-200"><WandSparkles className="h-5 w-5" /> TASKDRIP PLUGIN STUDIO</div>
          <h1 className="text-3xl font-bold md:text-4xl">Build and sell WordPress plugins</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">Create free WordPress cores and premium add-ons with monthly/yearly licenses, tracked installs, renewals, support, and automatic updates.</p>
        </div>
        <div className="grid min-w-[250px] grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{projects.length}</div><div className="text-xs text-slate-300">Plugin packages</div></div>
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{publishedCount}</div><div className="text-xs text-slate-300">Listed in shop</div></div>
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{metrics?.totals.pluginSales ?? 0}</div><div className="text-xs text-slate-300">Paid plugin sales</div></div>
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">${(metrics?.totals.revenueUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="text-xs text-slate-300">Sales revenue (USD)</div></div>
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{metrics?.totals.activeLicenses ?? 0}</div><div className="text-xs text-slate-300">Active licenses</div></div>
          <div className="rounded-xl bg-white/10 p-4"><div className="text-2xl font-bold">{metrics?.totals.activeInstalls ?? 0}</div><div className="text-xs text-slate-300">Tracked installs</div></div>
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

      {(metricsError || supportError) && (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-amber-950">Some license or support data could not load</p>
              <p className="text-sm text-amber-900">Project packages are available, but check the database migration logs and retry these dashboard records.</p>
            </div>
            <Button variant="outline" onClick={() => { void Promise.all([refetchMetrics(), refetchSupport()]); }} disabled={metricsFetching || supportFetching}>Retry license and support data</Button>
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

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { void Promise.all([refetchProjects(), refetchMetrics(), refetchSupport()]); }} disabled={projectsFetching || metricsFetching || supportFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${projectsFetching || metricsFetching || supportFetching ? "animate-spin" : ""}`} />
          {projectsFetching || metricsFetching || supportFetching ? "Refreshing…" : "Refresh dashboard"}
        </Button>
      </div>

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
                  <div className="space-y-2"><Label htmlFor="plugin-monthly-price">Monthly license (USD)</Label><Input id="plugin-monthly-price" type="number" min="0.01" step="0.01" value={draft.monthlyPrice} onChange={(event) => set("monthlyPrice", event.target.value)} required placeholder="Set monthly price" /></div>
                  <div className="space-y-2"><Label htmlFor="plugin-yearly-price">Yearly license (USD)</Label><Input id="plugin-yearly-price" type="number" min="0.01" step="0.01" value={draft.yearlyPrice} onChange={(event) => set("yearlyPrice", event.target.value)} required placeholder="Set yearly price" /></div>
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
              <p className="text-xs leading-5 text-muted-foreground">Generated code is an unreviewed draft. Taskdrip currently verifies payment proof and admin approval; renewals are not automatically charged. Test both ZIPs before release.</p>
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
          {projects.map((project) => {
            const settings = settingsFor(project);
            const release = releaseFor(project);
            const projectMetrics = metrics?.projects.find((item) => item.id === project.id);
            return (
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
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{project.product ? settings.monthlyPrice ? `$${Number(settings.monthlyPrice).toFixed(2)} / month` : "Pricing not configured" : "No shop item"}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Version:</span> {project.version}</div>
                  <div><span className="text-muted-foreground">Paid plugin sales:</span> {projectMetrics?.salesCount ?? 0}</div>
                  <div><span className="text-muted-foreground">Sales revenue (USD):</span> ${(projectMetrics?.revenueUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div><span className="text-muted-foreground">Active licenses:</span> {projectMetrics?.activeLicenses ?? 0}</div>
                  <div><span className="text-muted-foreground">Active installs:</span> {projectMetrics?.installs ?? 0}</div>
                  <div><span className="text-muted-foreground">Downloads:</span> {(projectMetrics?.usage.shop_download || 0) + (projectMetrics?.usage.update_download || 0)}</div>
                  <div><span className="text-muted-foreground">Free core files:</span> {project.coreFileCount || "Legacy template"}</div>
                  <div><span className="text-muted-foreground">Premium files:</span> {project.premiumFileCount || "Legacy template"}</div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Shop SEO:</span> {project.seoTitle || "Not set"}</div>
                </div>
                <div className="space-y-3 rounded-xl border p-4">
                  <h3 className="font-semibold">Plans, licensing, and activation controls</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label htmlFor={`month-${project.id}`}>Monthly price (USD)</Label><Input id={`month-${project.id}`} type="number" min="0.01" step="0.01" value={settings.monthlyPrice} onChange={(event) => setSettings(project.id, "monthlyPrice", event.target.value)} /></div>
                    <div className="space-y-1"><Label htmlFor={`year-${project.id}`}>Yearly price (USD)</Label><Input id={`year-${project.id}`} type="number" min="0.01" step="0.01" value={settings.yearlyPrice} onChange={(event) => setSettings(project.id, "yearlyPrice", event.target.value)} /></div>
                    <div className="space-y-1 sm:col-span-2"><Label htmlFor={`license-url-${project.id}`}>Taskdrip license server URL</Label><Input id={`license-url-${project.id}`} type="url" placeholder="https://taskdrip.online" value={settings.licenseApiBaseUrl} onChange={(event) => setSettings(project.id, "licenseApiBaseUrl", event.target.value)} /><p className="text-xs text-muted-foreground">Production projects default to Taskdrip’s HTTPS site automatically. Change this only when using a different public Taskdrip deployment.</p></div>
                    <div className="space-y-1"><Label htmlFor={`max-sites-${project.id}`}>Sites per license</Label><Input id={`max-sites-${project.id}`} type="number" min="1" max="100" step="1" value={settings.maxActivations} onChange={(event) => setSettings(project.id, "maxActivations", event.target.value)} /></div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => settingsMutation.mutate({
                    id: project.id,
                    values: {
                      monthlyPrice: Number(settings.monthlyPrice),
                      yearlyPrice: Number(settings.yearlyPrice),
                      licenseApiBaseUrl: settings.licenseApiBaseUrl,
                      maxActivations: Number(settings.maxActivations),
                    },
                  })} disabled={settingsMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />Save license settings
                  </Button>
                </div>
                <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                  <div><h3 className="font-semibold">Publish a premium update</h3><p className="text-xs text-muted-foreground">Upload the updated installable premium ZIP. Active licensed WordPress sites will receive the release through WordPress automatic updates.</p></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label htmlFor={`release-version-${project.id}`}>New version</Label><Input id={`release-version-${project.id}`} value={release.version} onChange={(event) => setReleaseField(project.id, "version", event.target.value)} placeholder="1.0.1" /></div>
                    <div className="space-y-1"><Label htmlFor={`release-file-${project.id}`}>Premium plugin ZIP</Label><Input id={`release-file-${project.id}`} type="file" accept=".zip,application/zip" onChange={(event) => setReleaseField(project.id, "file", event.target.files?.[0] || null)} /></div>
                    <div className="space-y-1 sm:col-span-2"><Label htmlFor={`release-notes-${project.id}`}>Release notes</Label><Textarea id={`release-notes-${project.id}`} rows={2} value={release.releaseNotes} onChange={(event) => setReleaseField(project.id, "releaseNotes", event.target.value)} placeholder="Describe fixes and improvements in this version." /></div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => releaseMutation.mutate({ project, form: release })} disabled={releaseMutation.isPending || !release.file || !release.releaseNotes.trim()}>
                    <Upload className="mr-2 h-4 w-4" />{releaseMutation.isPending ? "Publishing update…" : "Publish update"}
                  </Button>
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
                    <Button asChild size="sm" variant="outline"><a href={`/shop/product/${project.status === "published" ? project.slug : project.product.id}`}><ExternalLink className="mr-2 h-4 w-4" />View shop page</a></Button>
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
          );})}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" />License sales and activations</CardTitle>
              <CardDescription>Buyer email, plan, expiry, site count, and administrator revocation control.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-[1.2fr_1.2fr_0.8fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  issueLicenseMutation.mutate(licenseDraft);
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="manual-license-project">Plugin</Label>
                  <select
                    id="manual-license-project"
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                    value={licenseDraft.projectId}
                    onChange={(event) => setLicenseDraft((current) => ({ ...current, projectId: event.target.value }))}
                    required
                  >
                    <option value="">Choose a plugin</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-license-email">Customer Taskdrip email</Label>
                  <Input
                    id="manual-license-email"
                    type="email"
                    autoComplete="email"
                    value={licenseDraft.email}
                    onChange={(event) => setLicenseDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-license-cadence">License term</Label>
                  <select
                    id="manual-license-cadence"
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                    value={licenseDraft.cadence}
                    onChange={(event) => setLicenseDraft((current) => ({ ...current, cadence: event.target.value as "monthly" | "yearly" }))}
                  >
                    <option value="monthly">Monthly · 30 days</option>
                    <option value="yearly">Yearly · 12 months</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full sm:w-auto" disabled={issueLicenseMutation.isPending || !projects.length}>
                    <KeyRound className="mr-2 h-4 w-4" />{issueLicenseMutation.isPending ? "Generating…" : "Generate license"}
                  </Button>
                </div>
              </form>
              <p className="text-xs text-muted-foreground">Issue a valid WordPress activation key for any Plugin Studio project. The customer must have a Taskdrip account with this email; the license will also appear under My Plugins.</p>
              {issueLicenseMutation.data?.licenseKey && (
                <div className="flex flex-col gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor="new-plugin-license-key">Generated WordPress license key</Label>
                    <Input id="new-plugin-license-key" value={issueLicenseMutation.data.licenseKey} readOnly className="bg-white font-mono" onFocus={(event) => event.currentTarget.select()} />
                    <p className="text-xs text-emerald-900">Copy this key into the plugin’s License screen in WordPress. The key is also recoverable from this admin list.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(issueLicenseMutation.data.licenseKey).then(() => toast({ title: "License key copied" })).catch(() => toast({ title: "Select and copy the key manually", variant: "destructive" }))}>
                    <Copy className="mr-2 h-4 w-4" />Copy key
                  </Button>
                </div>
              )}
              {!metrics?.licenses.length && <p className="text-sm text-muted-foreground">No plugin licenses issued yet. You can generate an admin license above or approve a paid monthly or yearly order.</p>}
              {metrics?.licenses.map((license) => (
                <div key={license.id} className="flex flex-col justify-between gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{license.projectName}</span><Badge variant={license.status === "active" ? "default" : "secondary"}>{license.status}</Badge><Badge variant="outline">{license.cadence}</Badge></div>
                    <p className="mt-1 text-sm">{license.buyerEmail} · {license.keyPrefix} · {license.activeInstalls}/{license.maxActivations} sites</p>
                    <p className="text-xs text-muted-foreground">Expires {new Date(license.expiresAt).toLocaleDateString()}</p>
                    {adminLicenseKeys[license.id] && <p className="mt-2 break-all rounded bg-slate-50 p-2 font-mono text-xs select-all">{adminLicenseKeys[license.id]}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      const key = adminLicenseKeys[license.id];
                      if (key) {
                        void navigator.clipboard.writeText(key).then(() => toast({ title: "License key copied" })).catch(() => toast({ title: "Select and copy the key manually", variant: "destructive" }));
                      } else {
                        revealAdminLicenseMutation.mutate(license.id);
                      }
                    }} disabled={revealAdminLicenseMutation.isPending}>
                      <Copy className="mr-2 h-4 w-4" />{adminLicenseKeys[license.id] ? "Copy key" : "Show key"}
                    </Button>
                    {license.status === "active" && <Button size="sm" variant="destructive" onClick={() => {
                      if (window.confirm(`Revoke the ${license.projectName} license for ${license.buyerEmail}? Their premium plugin features and updates will be disabled after WordPress next verifies the key.`)) revokeMutation.mutate(license.id);
                    }} disabled={revokeMutation.isPending}>Revoke</Button>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-sky-200 bg-sky-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" />Buyer support and update requests</CardTitle>
              <CardDescription>Reply to licensed plugin customers from Plugin Studio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportThreads.length === 0 && <p className="text-sm text-muted-foreground">No support conversations yet.</p>}
              {supportThreads.map((thread) => (
                <div key={thread.id} className="space-y-3 rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-semibold">{thread.subject}</p><p className="text-xs text-muted-foreground">{thread.projectName} · {thread.buyerEmail} · {thread.requestType === "update_request" ? "Update request" : "Support"}</p></div>
                    <Badge variant={thread.status === "open" ? "secondary" : "outline"}>{thread.status}</Badge>
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
                    {thread.messages.map((message) => <p key={message.id} className="whitespace-pre-wrap text-sm">{message.content}<span className="ml-2 text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</span></p>)}
                  </div>
                  <div className="space-y-2">
                    <Textarea rows={2} value={supportReplies[thread.id] || ""} onChange={(event) => setSupportReplies((current) => ({ ...current, [thread.id]: event.target.value }))} placeholder="Write a reply to this customer." />
                    <Button size="sm" onClick={() => supportReplyMutation.mutate({ threadId: thread.id, content: supportReplies[thread.id] || "" })} disabled={supportReplyMutation.isPending || !(supportReplies[thread.id] || "").trim()}>
                      <MessageSquare className="mr-2 h-4 w-4" />Send reply
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
