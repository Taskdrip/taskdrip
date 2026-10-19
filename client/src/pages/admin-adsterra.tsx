import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AdsterraPlacement, AdsterraPosition, AdsterraSettingsValue } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, BarChart3, Eye, ExternalLink, Link2, MousePointerClick, Save, ShieldCheck } from "lucide-react";

type Analytics = {
  days: number;
  totalImpressions: number;
  totalSmartlinkClicks: number;
  byPlacement: Array<{
    id: string;
    name: string;
    format: string;
    position: string;
    impressions: number;
    smartlinkClicks: number;
    byPage: Array<{ page: string; count: number }>;
  }>;
};
type AdminSettings = AdsterraSettingsValue & { shortenerBaseUrl?: string };

const POSITION_LABELS: Record<AdsterraPosition, string> = {
  body: "Body content",
  "blog-feed": "Blog feed",
  "article-inline": "Inside article",
  sidebar: "Article sidebar",
  "article-end": "After article",
  footer: "Footer",
  floating: "Floating / overlay",
};

const PAGE_TARGET_OPTIONS = [
  { value: "all", label: "All public pages" },
  { value: "site", label: "Other site pages" },
  { value: "blog", label: "Blog listing" },
  { value: "article", label: "Blog articles" },
];

function formatLabel(format: string) {
  if (format === "iframe") return "Banner";
  if (format === "native") return "Native banner";
  if (format === "smartlink") return "Smartlink";
  if (format === "popunder") return "Popunder";
  return "Social Bar";
}

function placementTarget(placement: AdsterraPlacement) {
  if (placement.pages.includes("all")) return "all";
  return placement.pages[0] || "site";
}

function placementPreviewPath(placement: AdsterraPlacement) {
  if (placement.position === "blog-feed" || placement.pages.includes("blog")) return "/blog";
  if (placement.pages.includes("article") || ["sidebar", "article-inline", "article-end"].includes(placement.position)) {
    return "/blog/ai-roi-workplace-ai-spending-costs-productivity";
  }
  return "/";
}

function findRepeatedZoneIds(placements: AdsterraPlacement[]) {
  const byZoneId = new Map<string, AdsterraPlacement[]>();
  for (const placement of placements) {
    const group = byZoneId.get(placement.key) || [];
    group.push(placement);
    byZoneId.set(placement.key, group);
  }
  return Array.from(byZoneId.entries()).filter(([, group]) => group.length > 1);
}

function updatePlacement(
  settings: AdsterraSettingsValue,
  placementId: string,
  changes: Partial<AdsterraPlacement>,
): AdsterraSettingsValue {
  return {
    ...settings,
    placements: settings.placements.map((placement) =>
      placement.id === placementId ? { ...placement, ...changes } : placement,
    ),
  };
}

export default function AdminAdsterraPage() {
  const { toast } = useToast();
  const { data: savedSettings, isLoading, isError } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/adsterra/settings"],
  });
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/api/admin/adsterra/analytics"],
  });
  const [draft, setDraft] = useState<AdsterraSettingsValue>({ enabled: false, placements: [] });

  useEffect(() => {
    if (savedSettings) setDraft(savedSettings);
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/admin/adsterra/settings", draft);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save settings.");
      return result as AdsterraSettingsValue;
    },
    onSuccess: (settings) => {
      setDraft(settings);
      toast({ title: "Adsterra settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/adsterra/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/adsterra/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/adsterra/public-settings"] });
    },
    onError: (error: Error) => toast({
      title: "Could not save Adsterra settings",
      description: error.message,
      variant: "destructive",
    }),
  });

  const baseUrl = savedSettings?.shortenerBaseUrl || "https://taskdrip.online";
  const repeatedZoneIds = findRepeatedZoneIds(draft.placements);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-slate-300 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" /> Admin dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold sm:text-3xl">Adsterra Ads Control</h1>
            <p className="mt-1 text-sm text-slate-400">Choose which ad tags run, their location, and the pages where they appear.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/short-links" className="inline-flex h-9 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white">
              <Link2 className="h-4 w-4" /> URL Shortener
            </a>
            <a href="/admin/url-shortener" className="inline-flex h-9 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white">
              <Link2 className="h-4 w-4" /> Shortener Admin
            </a>
            <Button onClick={() => saveMutation.mutate()} disabled={isLoading || saveMutation.isPending || draft.placements.length === 0}>
              <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        {isError && (
          <Card className="border-red-900 bg-red-950/40 text-red-100">
            <CardContent className="p-5">Ad settings could not be loaded. Confirm you are signed in as a Taskdrip admin.</CardContent>
          </Card>
        )}

        <Card className="border-amber-500/30 bg-amber-500/5 text-white">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Adsterra operation</CardTitle>
                <CardDescription className="mt-1 text-slate-400">This master switch removes all Taskdrip-managed Adsterra placements when saved off.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${draft.enabled ? "text-emerald-300" : "text-slate-400"}`}>
                  {draft.enabled ? "Taskdrip tags enabled" : "Taskdrip tags disabled"}
                </span>
                <Switch
                  checked={draft.enabled}
                  onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
                  aria-label="Enable or disable all Adsterra ads"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-slate-300">
            This switch only tells Taskdrip whether to inject the saved tags. It does not confirm Adsterra approval, zone status, or ad availability. Changes take effect after saving; refresh public pages that were already open.
          </CardContent>
        </Card>

        {repeatedZoneIds.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/10 text-amber-100">
            <CardContent className="space-y-2 p-5 text-sm">
              <p className="font-semibold">Check repeated Adsterra zone IDs</p>
              {repeatedZoneIds.map(([zoneId, placements]) => (
                <p key={zoneId}>
                  The same zone ID is assigned to {placements.map((placement) => `${placement.name} (${formatLabel(placement.format)})`).join(" and ")}.
                  Confirm these placements use the intended Adsterra Ad Unit codes; duplicate/conflicting tags can stop units from displaying.
                </p>
              ))}
              <p>Taskdrip skips a Popunder when another enabled format uses the same zone ID. Give each format its own Ad Unit code to run both.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Viewable ad impressions · 30 days" value={analytics?.totalImpressions ?? 0} icon={<Eye className="h-5 w-5" />} />
          <StatCard label="Smartlink clicks · 30 days" value={analytics?.totalSmartlinkClicks ?? 0} icon={<MousePointerClick className="h-5 w-5" />} />
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Ad placements</h2>
            <p className="mt-1 text-sm text-slate-400">Taskdrip loads enabled tags that match the location and page target. Tags sharing a location are stacked; a maximum of four locations can appear on one page.</p>
          </div>

          {isLoading ? (
            <Card className="border-white/10 bg-slate-900 text-slate-300"><CardContent className="p-6">Loading placements…</CardContent></Card>
          ) : draft.placements.map((placement) => {
            const stats = analytics?.byPlacement.find((item) => item.id === placement.id);
            const fixedLocation = placement.format === "popunder" || placement.format === "socialbar";
            return (
              <Card key={placement.id} className="border-white/10 bg-slate-900 text-white">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{placement.name}</CardTitle>
                        <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200">{formatLabel(placement.format)}</span>
                        {placement.width && placement.height && placement.format === "iframe" && (
                          <span className="text-xs text-slate-400">{placement.width} × {placement.height}</span>
                        )}
                      </div>
                      <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
                        <span>Placement ID: {placement.id}</span>
                        <a
                          href={placementPreviewPath(placement)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                        >
                          Preview this area <ExternalLink className="h-3 w-3" />
                        </a>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm ${placement.enabled ? "text-emerald-300" : "text-slate-400"}`}>{placement.enabled ? "Tag on" : "Tag off"}</span>
                      <Switch
                        checked={placement.enabled}
                        onCheckedChange={(enabled) => setDraft((current) => updatePlacement(current, placement.id, { enabled }))}
                        aria-label={`Enable ${placement.name}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`name-${placement.id}`} className="text-slate-300">Placement name</Label>
                    <Input
                      id={`name-${placement.id}`}
                      value={placement.name}
                      maxLength={100}
                      onChange={(event) => setDraft((current) => updatePlacement(current, placement.id, { name: event.target.value }))}
                      className="mt-1 border-white/10 bg-slate-950 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`key-${placement.id}`} className="text-slate-300">Adsterra publisher zone ID</Label>
                    <Input
                      id={`key-${placement.id}`}
                      value={placement.key}
                      maxLength={32}
                      onChange={(event) => setDraft((current) => updatePlacement(current, placement.id, { key: event.target.value.toLowerCase() }))}
                      className="mt-1 font-mono text-xs border-white/10 bg-slate-950 text-white"
                      autoComplete="off"
                    />
                    <p className="mt-1 text-xs text-slate-500">Use the 32-character placement/zone ID from the ad tag, not your Adsterra account API key.</p>
                  </div>
                  <div>
                    <Label htmlFor={`position-${placement.id}`} className="text-slate-300">Where it appears</Label>
                    <select
                      id={`position-${placement.id}`}
                      value={placement.position}
                      disabled={fixedLocation}
                      onChange={(event) => setDraft((current) => updatePlacement(current, placement.id, { position: event.target.value as AdsterraPosition }))}
                      className="mt-1 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {Object.entries(POSITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {fixedLocation && <p className="mt-1 text-xs text-slate-500">This tag runs in its network-defined floating behavior.</p>}
                  </div>
                  <div>
                    <Label htmlFor={`pages-${placement.id}`} className="text-slate-300">Which pages</Label>
                    <select
                      id={`pages-${placement.id}`}
                      value={placementTarget(placement)}
                      onChange={(event) => setDraft((current) => updatePlacement(current, placement.id, { pages: [event.target.value as any] }))}
                      className="mt-1 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white"
                    >
                      {PAGE_TARGET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  {placement.shortSlug && (
                    <div className="md:col-span-2 rounded-lg border border-white/10 bg-slate-950 p-3 text-sm">
                      <span className="text-slate-400">Tracked Taskdrip Smartlink: </span>
                      <a href={`${baseUrl}/s/${placement.shortSlug}`} target="_blank" rel="noopener" className="break-all font-mono text-cyan-300 hover:underline">
                        {baseUrl}/s/{placement.shortSlug} <ExternalLink className="inline h-3 w-3" />
                      </a>
                      <span className="ml-2 text-xs text-slate-500">Clicks are recorded in URL Shortener analytics.</span>
                    </div>
                  )}
                  <div className="md:col-span-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {stats?.impressions ?? 0} viewable impressions</span>
                    {placement.format === "smartlink" && <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" /> {stats?.smartlinkClicks ?? 0} tracked clicks</span>}
                    <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {stats?.byPage?.length ?? 0} source pages</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-white/10 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300" /> How to manage Adsterra on Taskdrip</CardTitle>
            <CardDescription className="text-slate-400">Changes are saved here and applied to public pages automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            <p><strong>1. Start safely:</strong> Enable the master switch, enable the placements you want, then save. This only activates the tags; it cannot activate a paused or unapproved website/zone in Adsterra.</p>
            <p><strong>2. Test the right page:</strong> Blog-feed ads appear on <code>/blog</code>; sidebar, inline, and article-end ads appear on <code>/blog/:slug</code>. The sidebar is hidden on mobile. On other pages, use the footer placement and scroll to the bottom. The current setup is mostly blog-focused, so the homepage will not show the article placements.</p>
            <p><strong>3. Check visibility:</strong> Taskdrip records a viewable impression only after at least half of a slot stays on screen for one second. A zero count before scrolling to an ad is expected. Taskdrip tracks views and Smartlink clicks; use Adsterra for banner clicks, CTR, CPM, and revenue.</p>
            <p><strong>4. Confirm your tags:</strong> In the <a className="text-cyan-300 underline" href="https://beta.publishers.adsterra.com/websites" target="_blank" rel="noreferrer">Adsterra publisher dashboard</a>, expand <code>taskdrip.online</code> and open each Ad Unit’s code. Copy that unit’s zone key into its matching row—not the numeric website ID or account API key. Confirm each individual Ad Unit is active, and give each format its own zone key.</p>
            <p><strong>5. Rule out browser blocking:</strong> Test in a regular Chrome window with ad blockers and Brave Shields disabled for <code>taskdrip.online</code>. Third-party ad scripts can be blocked by browser privacy tools. Never click your own ads to test.</p>
            <p><strong>6. Keep the networks separate:</strong> The screenshot showing “account wasn’t approved” is Google AdSense. AdSense ads will not serve until Google approves that account, but this does not approve or disable Adsterra; check Adsterra’s own website and zone statuses separately.</p>
            <p><strong>7. Smartlinks:</strong> The Taskdrip Smartlink uses the <code>/s/</code> shortener and its clicks appear in short-link analytics. If a banner and Smartlink share a location, both now render there.</p>
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-amber-100">If a slot stays blank in a clean browser after you confirm the site and zone are approved and the IDs are current, copy the freshly generated code from Adsterra’s Websites page and contact Adsterra support to verify the zone is serving inventory.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <Card className="border-white/10 bg-slate-900 text-white">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-sky-500/10 p-3 text-sky-300">{icon}</div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
