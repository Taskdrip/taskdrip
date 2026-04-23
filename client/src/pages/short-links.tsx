import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Link2, BarChart3, Copy, Trash2, ExternalLink, Plus, AlertCircle, Sparkles, Globe2
} from "lucide-react";
import type { ShortLink } from "@shared/schema";

type Eligibility = { ok: boolean; reason?: string; limit: number; used: number; enabled: boolean };

export default function ShortLinksPage() {
  const { toast } = useToast();
  const [originalUrl, setOriginalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [isReferral, setIsReferral] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      {/* Decorative web3 grid + glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Hero */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 mb-3">
                <Sparkles className="h-3.5 w-3.5" /> Web3 Link Layer
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent flex items-center gap-3" data-testid="text-shortener-title">
                <Link2 className="h-7 w-7 sm:h-9 sm:w-9 text-cyan-300" /> URL Shortener
              </h1>
              <p className="text-sm sm:text-base text-white/70 mt-2 max-w-2xl">
                Forge branded short links for your profile, campaigns and referrals — with on-chain-grade tracking: clicks, countries, devices and traffic sources.
              </p>
            </div>
            <Badge variant="outline" className="text-sm border-cyan-400/40 text-cyan-200 bg-cyan-500/10 self-start sm:self-auto" data-testid="badge-link-quota">
              {eligibility ? `${eligibility.used} / ${eligibility.limit} links used` : "—"}
            </Badge>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-3 sm:gap-4 mt-6">
            {[
              { n: 1, title: "Paste any link", desc: "Profile, campaign, referral or external page." },
              { n: 2, title: "Get a short link", desc: "Use it in bios, posts, ads or anywhere." },
              { n: 3, title: "Track everything", desc: "Clicks, geos, devices and sources in real time." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-white flex items-center justify-center font-bold shrink-0">{s.n}</div>
                <div className="text-sm text-white/80"><b className="text-white">{s.title}.</b> <span className="text-white/60">{s.desc}</span></div>
              </div>
            ))}
          </div>
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
                <span className="text-sm text-white/50 truncate">{baseUrl}/s/</span>
                <Input data-testid="input-custom-slug" placeholder="my-link" value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-cyan-400/50" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isReferral" checked={isReferral} onCheckedChange={(v) => setIsReferral(!!v)} data-testid="checkbox-is-referral" className="border-white/40 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500" />
            <Label htmlFor="isReferral" className="cursor-pointer text-white/80">This is a referral link (track signups generated from it)</Label>
          </div>
          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !originalUrl}
            data-testid="button-create-short-link"
            className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-600 hover:to-violet-700 text-white border-0 shadow-lg shadow-cyan-500/20"
          >
            {createMut.isPending ? "Creating..." : "Create short link"}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Links list */}
      <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Your short links</CardTitle>
          <CardDescription className="text-white/60">Click "Analytics" on any link to see clicks, countries, devices and traffic sources.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-white/60">Loading...</p> : links.length === 0 ? (
            <p className="text-sm text-white/60 text-center py-8">No short links yet. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {links.map((l) => (
                <div key={l.id} className="border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4" data-testid={`row-short-link-${l.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-cyan-300 font-semibold truncate" data-testid={`text-slug-${l.id}`}>{baseUrl}/s/{l.slug}</span>
                      {l.isReferral && <Badge variant="secondary" className="text-xs bg-violet-500/20 text-violet-200 border-violet-400/30">Referral</Badge>}
                      {!l.isActive && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                    </div>
                    {l.title && <div className="text-sm text-white/80 mt-1">{l.title}</div>}
                    <div className="text-xs text-white/50 truncate flex items-center gap-1 mt-1">
                      <Globe2 className="h-3 w-3" /> {l.originalUrl}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-sm border-cyan-400/40 text-cyan-200 bg-cyan-500/10" data-testid={`badge-clicks-${l.id}`}>{l.clickCount ?? 0} clicks</Badge>
                    <Switch checked={!!l.isActive} onCheckedChange={(v) => toggleMut.mutate({ id: l.id, isActive: v })} data-testid={`switch-active-${l.id}`} />
                    <Button variant="outline" size="icon" onClick={() => copy(l.slug)} data-testid={`button-copy-${l.id}`} className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Copy className="h-4 w-4" /></Button>
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
    </div>
  );
}
