import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Link2, BarChart3, Copy, Trash2, ExternalLink, Plus, AlertCircle, Sparkles, Globe2,
  Search, QrCode, MousePointerClick, TrendingUp, Zap, Crown, Download, Layers
} from "lucide-react";
import type { ShortLink } from "@shared/schema";
import QRCode from "qrcode";

type Eligibility = { ok: boolean; reason?: string; limit: number; used: number; enabled: boolean };

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

export default function ShortLinksPage() {
  const { toast } = useToast();
  const [originalUrl, setOriginalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [isReferral, setIsReferral] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "clicks" | "alpha">("newest");
  const [qrLink, setQrLink] = useState<ShortLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const { data: eligibility } = useQuery<Eligibility>({ queryKey: ["/api/short-links/eligibility"] });
  const { data: links = [], isLoading } = useQuery<ShortLink[]>({ queryKey: ["/api/short-links"] });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/short-links", { originalUrl, title, customSlug: customSlug || undefined, isReferral });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Short link created", description: "Your link is ready to share." });
      setOriginalUrl(""); setTitle(""); setCustomSlug(""); setIsReferral(false);
      queryClient.invalidateQueries({ queryKey: ["/api/short-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/short-links/eligibility"] });
    },
    onError: (e: any) => toast({ title: "Could not create link", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/short-links/${id}`, { isActive });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/short-links"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/short-links/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Link deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/short-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/short-links/eligibility"] });
    },
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const copy = (slug: string) => {
    navigator.clipboard.writeText(`${baseUrl}/s/${slug}`);
    toast({ title: "Copied to clipboard" });
  };

  const previewSlug = customSlug.trim() ? slugify(customSlug) : (title.trim() ? slugify(title) : "abc123");

  // Stats overview
  const stats = useMemo(() => {
    const totalClicks = links.reduce((sum, l) => sum + (l.clickCount ?? 0), 0);
    const active = links.filter(l => l.isActive).length;
    const top = [...links].sort((a, b) => (b.clickCount ?? 0) - (a.clickCount ?? 0))[0];
    const avg = links.length > 0 ? Math.round(totalClicks / links.length) : 0;
    return { total: links.length, active, totalClicks, avg, top };
  }, [links]);

  const filteredLinks = useMemo(() => {
    let arr = links.filter(l =>
      !search ||
      l.slug.toLowerCase().includes(search.toLowerCase()) ||
      (l.title || "").toLowerCase().includes(search.toLowerCase()) ||
      l.originalUrl.toLowerCase().includes(search.toLowerCase())
    );
    switch (sort) {
      case "newest": arr.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()); break;
      case "oldest": arr.sort((a, b) => new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime()); break;
      case "clicks": arr.sort((a, b) => (b.clickCount ?? 0) - (a.clickCount ?? 0)); break;
      case "alpha": arr.sort((a, b) => a.slug.localeCompare(b.slug)); break;
    }
    return arr;
  }, [links, search, sort]);

  // Generate QR when modal opens
  useEffect(() => {
    if (!qrLink) { setQrDataUrl(""); return; }
    const url = `${baseUrl}/s/${qrLink.slug}`;
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [qrLink, baseUrl]);

  const downloadQr = () => {
    if (!qrDataUrl || !qrLink) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${qrLink.slug}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white relative overflow-x-hidden">
      {/* Decorative web3 grid + glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] overflow-hidden">
        <div className="absolute -top-40 left-1/3 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-r from-cyan-500/25 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />
        <div className="absolute -top-20 right-0 w-[500px] h-[400px] rounded-full bg-gradient-to-l from-violet-500/20 to-transparent blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Hero */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 mb-3">
                <Sparkles className="h-3.5 w-3.5" /> Web3 Link Layer
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent flex items-center gap-3" data-testid="text-shortener-title">
                <Link2 className="h-7 w-7 sm:h-9 sm:w-9 text-cyan-300" /> URL Shortener
              </h1>
              <p className="text-sm sm:text-base text-white/70 mt-2 max-w-2xl">
                Forge branded short links for your profile, campaigns and referrals — track clicks, countries, devices and traffic sources in real time.
              </p>
            </div>
            <Badge variant="outline" className="text-sm border-cyan-400/40 text-cyan-200 bg-cyan-500/10 self-start sm:self-auto" data-testid="badge-link-quota">
              {eligibility ? `${eligibility.used} / ${eligibility.limit} links used` : "—"}
            </Badge>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile icon={<Layers className="h-4 w-4" />} label="Total Links" value={stats.total} accent="cyan" testId="stat-total-links" />
          <StatTile icon={<MousePointerClick className="h-4 w-4" />} label="Total Clicks" value={stats.totalClicks} accent="violet" testId="stat-total-clicks" />
          <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Avg Clicks / Link" value={stats.avg} accent="fuchsia" testId="stat-avg-clicks" />
          <StatTile
            icon={<Crown className="h-4 w-4" />}
            label="Top Performer"
            value={stats.top ? `${stats.top.clickCount ?? 0}` : "—"}
            sub={stats.top?.slug ? `/${stats.top.slug}` : ""}
            accent="amber"
            testId="stat-top-performer"
          />
        </div>

        {eligibility && !eligibility.enabled && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="p-4 flex items-start gap-3 text-yellow-900">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>The URL shortener is currently disabled by the administrator. Please check back later.</div>
            </CardContent>
          </Card>
        )}

        {eligibility && eligibility.enabled && !eligibility.ok && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="p-4 flex items-start gap-3 text-orange-900">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <div className="font-semibold">Access restricted</div>
                <div className="text-sm">{eligibility.reason}</div>
                <Link href="/subscription"><Button size="sm" className="mt-2" data-testid="button-upgrade-shortener">Upgrade to unlock</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create form */}
        {eligibility?.ok && (
          <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl text-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Plus className="h-5 w-5 text-cyan-300" /> Create a short link</CardTitle>
              <CardDescription className="text-white/60">Paste any URL. Optionally give it a memorable slug and label.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white/80">Destination URL</Label>
                <Input
                  data-testid="input-original-url"
                  placeholder="https://example.com/my-long-page"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-cyan-400/50"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80">Title (optional)</Label>
                  <Input data-testid="input-link-title" placeholder="e.g. Spring Campaign" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-cyan-400/50" />
                </div>
                <div>
                  <Label className="text-white/80">Custom slug (optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/50 truncate hidden sm:inline">{baseUrl}/s/</span>
                    <Input data-testid="input-custom-slug" placeholder="my-link" value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-cyan-400/50" />
                  </div>
                </div>
              </div>

              {/* Live preview */}
              {(originalUrl || title || customSlug) && (
                <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-fuchsia-500/10 p-4 flex items-center gap-3 backdrop-blur-sm" data-testid="link-preview">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-cyan-300/80">Your short link will look like</div>
                    <div className="font-mono text-sm font-bold text-white truncate">{baseUrl}/s/{previewSlug}</div>
                    {originalUrl && <div className="text-xs text-white/50 truncate mt-0.5">→ {originalUrl}</div>}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox id="isReferral" checked={isReferral} onCheckedChange={(v) => setIsReferral(!!v)} data-testid="checkbox-is-referral" className="border-white/40 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500" />
                <Label htmlFor="isReferral" className="cursor-pointer text-white/80">This is a referral link (track signups generated from it)</Label>
              </div>
              <Button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !originalUrl}
                data-testid="button-create-short-link"
                className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-600 hover:to-violet-700 text-white border-0 shadow-lg shadow-cyan-500/30 hover:shadow-violet-500/40 transition-all"
              >
                {createMut.isPending ? "Creating..." : "Create short link"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Links list */}
        <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl text-white shadow-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-white">Your short links</CardTitle>
              <CardDescription className="text-white/60">Click "Analytics" on any link to see clicks, countries, devices and sources.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search slug or URL..."
                  className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 text-sm h-9"
                  data-testid="input-search-links"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="w-32 sm:w-36 bg-white/[0.06] border-white/10 text-white text-sm h-9" data-testid="select-sort-links">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="clicks">Most clicks</SelectItem>
                  <SelectItem value="alpha">A → Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-white/60">Loading...</p>
            ) : links.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-cyan-300" />
                </div>
                <p className="text-sm text-white/70 font-semibold">No short links yet</p>
                <p className="text-xs text-white/50 mt-1">Create your first one above to get started.</p>
              </div>
            ) : filteredLinks.length === 0 ? (
              <p className="text-sm text-white/60 text-center py-8">No links match your search.</p>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map((l) => (
                  <div
                    key={l.id}
                    className="border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-cyan-400/30 hover:shadow-[0_0_18px_rgba(34,211,238,0.18)] transition-all rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 group"
                    data-testid={`row-short-link-${l.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-cyan-300 font-semibold truncate" data-testid={`text-slug-${l.id}`}>{baseUrl}/s/{l.slug}</span>
                        {l.isReferral && <Badge variant="secondary" className="text-xs bg-violet-500/20 text-violet-200 border-violet-400/30">Referral</Badge>}
                        {!l.isActive && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                      </div>
                      {l.title && <div className="text-sm text-white/80 mt-1 truncate">{l.title}</div>}
                      <div className="text-xs text-white/50 truncate flex items-center gap-1 mt-1">
                        <Globe2 className="h-3 w-3 flex-shrink-0" /> {l.originalUrl}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-sm border-cyan-400/40 text-cyan-200 bg-cyan-500/10" data-testid={`badge-clicks-${l.id}`}>
                        <MousePointerClick className="h-3 w-3 mr-1" /> {l.clickCount ?? 0}
                      </Badge>
                      <Switch checked={!!l.isActive} onCheckedChange={(v) => toggleMut.mutate({ id: l.id, isActive: v })} data-testid={`switch-active-${l.id}`} />
                      <Button variant="outline" size="icon" onClick={() => copy(l.slug)} data-testid={`button-copy-${l.id}`} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Copy className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => setQrLink(l)} data-testid={`button-qr-${l.id}`} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><QrCode className="h-4 w-4" /></Button>
                      <a href={`${baseUrl}/s/${l.slug}`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="icon" data-testid={`button-open-${l.id}`} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><ExternalLink className="h-4 w-4" /></Button>
                      </a>
                      <Link href={`/short-links/${l.id}/analytics`}>
                        <Button variant="outline" size="sm" data-testid={`button-analytics-${l.id}`} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</Button>
                      </Link>
                      <Button variant="outline" size="icon" onClick={() => { if (confirm("Delete this short link and all of its analytics?")) deleteMut.mutate(l.id); }} data-testid={`button-delete-${l.id}`} className="border-white/20 bg-white/5 hover:bg-red-500/20">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Modal */}
      <Dialog open={!!qrLink} onOpenChange={(open) => { if (!open) setQrLink(null); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-qr">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-violet-600" /> QR Code</DialogTitle>
            <DialogDescription className="break-all font-mono text-xs">{qrLink ? `${baseUrl}/s/${qrLink.slug}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-xl border border-gray-200 shadow-lg" data-testid="img-qr-code" />
            ) : (
              <div className="w-64 h-64 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm">Generating...</div>
            )}
            <div className="flex gap-2 w-full">
              <Button onClick={downloadQr} className="flex-1" disabled={!qrDataUrl} data-testid="button-download-qr">
                <Download className="h-4 w-4 mr-2" /> Download PNG
              </Button>
              <Button variant="outline" onClick={() => qrLink && copy(qrLink.slug)} data-testid="button-copy-qr-link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ icon, label, value, sub, accent, testId }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  accent: "cyan" | "violet" | "fuchsia" | "amber"; testId?: string;
}) {
  const accentMap = {
    cyan: "from-cyan-500/20 to-cyan-400/5 border-cyan-400/30 text-cyan-300",
    violet: "from-violet-500/20 to-violet-400/5 border-violet-400/30 text-violet-300",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-400/5 border-fuchsia-400/30 text-fuchsia-300",
    amber: "from-amber-500/20 to-amber-400/5 border-amber-400/30 text-amber-300",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${accentMap[accent]} p-4 backdrop-blur-xl shadow-lg`} data-testid={testId}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-black text-white truncate">{value}</div>
      {sub && <div className="text-[11px] text-white/60 font-mono truncate mt-0.5">{sub}</div>}
    </div>
  );
}
