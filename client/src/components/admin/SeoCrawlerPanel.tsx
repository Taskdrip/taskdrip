import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, Clock3, ExternalLink, FileSearch, Loader2, Play, RefreshCw, Search, Send, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SeoUrl = {
  url: string;
  path: string;
  title: string;
  type: string;
  warnings: string[];
};

type CrawlerSettings = {
  enabled: boolean;
  frequency: "hourly" | "daily" | "weekly";
  indexNowEnabled: boolean;
  indexNowKeyConfigured: boolean;
  indexNowKeyLocation: string | null;
  nextCrawlAt: string | null;
  lastCrawlAt: string | null;
  lastCrawlTotal: number;
  lastCrawlError: string | null;
};

const humanFrequency: Record<CrawlerSettings["frequency"], string> = {
  hourly: "Every hour",
  daily: "Daily",
  weekly: "Weekly",
};

function formatTime(value?: string | null) {
  if (!value) return "Not scheduled yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled yet" : date.toLocaleString();
}

export default function SeoCrawlerPanel() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);

  const settingsQuery = useQuery<CrawlerSettings>({
    queryKey: ["/api/admin/seo-intelligence/crawler-settings"],
  });
  const urlsQuery = useQuery<{ urls: SeoUrl[]; totalUrls: number }>({
    queryKey: ["/api/admin/seo-intelligence/crawler-urls"],
  });
  const settings = settingsQuery.data;
  const urls = urlsQuery.data?.urls || [];
  const visibleUrls = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return urls;
    return urls.filter((page) =>
      page.title.toLowerCase().includes(term) ||
      page.path.toLowerCase().includes(term) ||
      page.type.toLowerCase().includes(term)
    );
  }, [search, urls]);

  const refreshCrawlerData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/crawler-settings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/crawler-urls"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/crawl-status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-intelligence/dashboard"] });
  };

  const saveSettings = useMutation({
    mutationFn: async (data: Partial<CrawlerSettings> & { generateIndexNowKey?: boolean }) => {
      const response = await apiRequest("PUT", "/api/admin/seo-intelligence/crawler-settings", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/admin/seo-intelligence/crawler-settings"], data);
      toast({ title: "Crawler settings saved" });
    },
    onError: (error: any) => toast({ title: "Could not save settings", description: error.message, variant: "destructive" }),
  });

  const crawl = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/seo-intelligence/crawl", {});
      return response.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      setSelected([]);
      refreshCrawlerData();
      const notified = data.notifications?.submitted || 0;
      toast({
        title: "Crawl complete",
        description: `${data.totalUrls} public URLs scanned. ${notified} submitted via IndexNow.`,
      });
    },
    onError: (error: any) => toast({ title: "Crawl failed", description: error.message, variant: "destructive" }),
  });

  const indexSelected = useMutation({
    mutationFn: async (urlsToSubmit: string[]) => {
      const response = await apiRequest("POST", "/api/admin/seo-intelligence/crawler-index", { urls: urlsToSubmit });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.status === "submitted" ? "URLs submitted" : "Submission not completed",
        description: data.message,
        variant: data.status === "failed" || data.status === "not_configured" ? "destructive" : "default",
      });
      if (data.status === "submitted" || data.status === "partial") setSelected([]);
    },
    onError: (error: any) => toast({ title: "IndexNow submission failed", description: error.message, variant: "destructive" }),
  });

  const togglePage = (url: string) => setSelected((current) =>
    current.includes(url) ? current.filter((item) => item !== url) : [...current, url]
  );
  const selectVisible = () => setSelected((current) => {
    const visible = visibleUrls.map((page) => page.url);
    const allSelected = visible.length > 0 && visible.every((url) => current.includes(url));
    return allSelected
      ? current.filter((url) => !visible.includes(url))
      : Array.from(new Set([...current, ...visible])).slice(0, 10000);
  });
  const allVisibleSelected = visibleUrls.length > 0 && visibleUrls.every((page) => selected.includes(page.url));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Public page crawler</h2>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Scans indexable pages, published blog posts, active products, creator and brand profiles, and published courses.
                It refreshes the sitemap and fills missing descriptions on published posts without overwriting existing copy.
              </p>
            </div>
          </div>
          <Button onClick={() => crawl.mutate()} disabled={crawl.isPending || settingsQuery.isLoading || urlsQuery.isLoading}>
            {crawl.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {crawl.isPending ? "Crawling…" : "Run crawl now"}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Public URLs in sitemap</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{urlsQuery.data?.totalUrls ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Last crawl</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatTime(settings?.lastCrawlAt)}</p>
            <p className="mt-1 text-xs text-gray-500">{settings?.lastCrawlTotal ?? 0} URLs scanned</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next automatic crawl</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {settings?.enabled ? formatTime(settings.nextCrawlAt) : "Automatic crawling is off"}
            </p>
            {settings?.enabled && <p className="mt-1 text-xs text-gray-500">{humanFrequency[settings.frequency]}</p>}
          </div>
        </div>

        {settings?.lastCrawlError && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{settings.lastCrawlError}
          </p>
        )}
        {lastResult && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" />Crawl finished in {(lastResult.durationMs / 1000).toFixed(1)} seconds</p>
            <p className="mt-1">
              {lastResult.totalUrls} URLs in the sitemap · {lastResult.repairedDescriptions} missing post descriptions filled · {lastResult.issues} metadata warnings
            </p>
            <p className="mt-1">{lastResult.notifications?.message}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />View sitemap</Button>
          </a>
          <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Submit sitemap in Google Search Console</Button>
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Google discovers URLs from the sitemap, but indexing is decided by Google. Direct Google URL submission requires a connected Search Console account; this app does not claim to force Google indexing.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold text-gray-900"><Clock3 className="h-4 w-4" />Automatic crawling</h3>
        <p className="mt-1 text-sm text-gray-500">Choose how often the server refreshes the public URL inventory and sitemap.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex min-w-52 flex-col gap-1.5 text-sm font-medium text-gray-700">
            Crawl frequency (UTC)
            <select
              value={settings?.frequency || "daily"}
              disabled={!settings || saveSettings.isPending}
              onChange={(event) => saveSettings.mutate({ frequency: event.target.value as CrawlerSettings["frequency"] })}
              className="h-10 rounded-md border border-gray-300 bg-white px-3"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={settings?.enabled || false}
              disabled={!settings || saveSettings.isPending}
              onChange={(event) => saveSettings.mutate({ enabled: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 accent-violet-600"
            />
            Enable automatic crawling
          </label>
          {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-gray-900"><Send className="h-4 w-4" />IndexNow URL notifications</h3>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Sends changed URLs to IndexNow-participating search engines such as Bing. It is a discovery notification, not a guarantee of indexing.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={settings?.indexNowEnabled || false}
              disabled={!settings || saveSettings.isPending}
              onChange={(event) => saveSettings.mutate({ indexNowEnabled: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 accent-violet-600"
            />
            Enable IndexNow
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveSettings.mutate({ generateIndexNowKey: true })}
            disabled={!settings || saveSettings.isPending}
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            {settings?.indexNowKeyConfigured ? "Regenerate verification key" : "Generate verification key"}
          </Button>
          {settings?.indexNowKeyLocation && (
            <a className="break-all text-xs text-violet-700 underline" href={settings.indexNowKeyLocation} target="_blank" rel="noopener noreferrer">
              Verify key file: {settings.indexNowKeyLocation}
            </a>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h3 className="font-bold text-gray-900">Indexable URL inventory</h3>
            <p className="mt-1 text-sm text-gray-500">Select public URLs and send them to IndexNow. Private and noindex routes are excluded.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectVisible} disabled={!visibleUrls.length}>
              {allVisibleSelected ? "Deselect visible" : "Select visible"}
            </Button>
            <Button
              size="sm"
              onClick={() => indexSelected.mutate(selected)}
              disabled={!selected.length || indexSelected.isPending || !settings?.indexNowEnabled || !settings?.indexNowKeyConfigured}
            >
              {indexSelected.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
              Submit {selected.length || ""} selected
            </Button>
          </div>
        </div>
        <div className="border-b border-gray-100 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by page title, path, or type"
              className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {urlsQuery.isLoading ? "Loading public URLs…" : `${visibleUrls.length} of ${urls.length} URLs shown · ${selected.length} selected`}
            {!settings?.indexNowEnabled || !settings?.indexNowKeyConfigured ? " · Enable IndexNow and generate a key to submit URLs." : ""}
          </p>
        </div>
        <div className="max-h-[520px] divide-y divide-gray-100 overflow-y-auto">
          {visibleUrls.map((page) => (
            <label key={page.url} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50 sm:px-5">
              <input
                type="checkbox"
                checked={selected.includes(page.url)}
                onChange={() => togglePage(page.url)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-violet-600"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                  {page.title}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600">{page.type}</span>
                  {!!page.warnings.length && <span className="text-xs font-normal text-amber-700">{page.warnings.join(" · ")}</span>}
                </span>
                <span className="mt-1 block break-all text-xs text-gray-500">{page.url}</span>
              </span>
              <a
                href={`https://search.google.com/search-console/inspect?resource_id=sc-domain%3Ataskdrip.online&url=${encodeURIComponent(page.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Inspect ${page.path} in Google Search Console`}
                onClick={(event) => event.stopPropagation()}
                className="shrink-0 p-1 text-gray-400 hover:text-violet-700"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </label>
          ))}
          {!urlsQuery.isLoading && !visibleUrls.length && (
            <div className="p-8 text-center text-sm text-gray-500">
              {urlsQuery.isError ? "Could not load the sitemap inventory. Refresh to try again." : "No matching public URLs."}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <RefreshCw className="h-3.5 w-3.5" />The sitemap is generated dynamically from published/public content and updates when content changes.
        </div>
      </section>
    </div>
  );
}
