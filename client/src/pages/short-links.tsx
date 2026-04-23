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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Link2 className="h-7 w-7 text-purple-600" /> URL Shortener
          </h1>
          <p className="text-gray-600 mt-1">Create branded short links for your profile, campaigns, and referrals — with full click analytics.</p>
        </div>
        <Badge variant="outline" className="text-sm" data-testid="badge-link-quota">
          {eligibility ? `${eligibility.used} / ${eligibility.limit} links used` : "—"}
        </Badge>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="h-5 w-5" /> How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div className="flex gap-3"><div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">1</div><div><b>Paste any link.</b> Your profile, a campaign, a referral URL, or any external page.</div></div>
          <div className="flex gap-3"><div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">2</div><div><b>Get a short link.</b> Use it in bios, posts, ads, or anywhere you want to track engagement.</div></div>
          <div className="flex gap-3"><div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">3</div><div><b>Track everything.</b> Clicks, countries, cities, devices, browsers and traffic sources in real time.</div></div>
        </CardContent>
      </Card>

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Create a short link</CardTitle>
          <CardDescription>Paste any URL. Optionally give it a memorable slug and label.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Destination URL</Label>
            <Input
              data-testid="input-original-url"
              placeholder="https://example.com/my-long-page"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Title (optional)</Label>
              <Input data-testid="input-link-title" placeholder="e.g. Spring Campaign" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Custom slug (optional)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 truncate">{baseUrl}/s/</span>
                <Input data-testid="input-custom-slug" placeholder="my-link" value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isReferral" checked={isReferral} onCheckedChange={(v) => setIsReferral(!!v)} data-testid="checkbox-is-referral" />
            <Label htmlFor="isReferral" className="cursor-pointer">This is a referral link (track signups generated from it)</Label>
          </div>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !originalUrl} data-testid="button-create-short-link">
            {createMut.isPending ? "Creating..." : "Create short link"}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Links list */}
      <Card>
        <CardHeader>
          <CardTitle>Your short links</CardTitle>
          <CardDescription>Click "Analytics" on any link to see clicks, countries, devices and traffic sources.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : links.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No short links yet. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {links.map((l) => (
                <div key={l.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4" data-testid={`row-short-link-${l.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-purple-700 font-semibold truncate" data-testid={`text-slug-${l.id}`}>{baseUrl}/s/{l.slug}</span>
                      {l.isReferral && <Badge variant="secondary" className="text-xs">Referral</Badge>}
                      {!l.isActive && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                    </div>
                    {l.title && <div className="text-sm text-gray-700 mt-1">{l.title}</div>}
                    <div className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                      <Globe2 className="h-3 w-3" /> {l.originalUrl}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm" data-testid={`badge-clicks-${l.id}`}>{l.clickCount ?? 0} clicks</Badge>
                    <Switch checked={!!l.isActive} onCheckedChange={(v) => toggleMut.mutate({ id: l.id, isActive: v })} data-testid={`switch-active-${l.id}`} />
                    <Button variant="outline" size="icon" onClick={() => copy(l.slug)} data-testid={`button-copy-${l.id}`}><Copy className="h-4 w-4" /></Button>
                    <a href={`${baseUrl}/s/${l.slug}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="icon" data-testid={`button-open-${l.id}`}><ExternalLink className="h-4 w-4" /></Button>
                    </a>
                    <Link href={`/short-links/${l.id}/analytics`}>
                      <Button variant="outline" size="sm" data-testid={`button-analytics-${l.id}`}><BarChart3 className="h-4 w-4 mr-1" /> Analytics</Button>
                    </Link>
                    <Button variant="outline" size="icon" onClick={() => { if (confirm("Delete this short link and all of its analytics?")) deleteMut.mutate(l.id); }} data-testid={`button-delete-${l.id}`}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
