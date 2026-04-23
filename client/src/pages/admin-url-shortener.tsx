import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Link2, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import type { ShortenerSettings } from "@shared/schema";

export default function AdminUrlShortenerPage() {
  const { toast } = useToast();
  const { data: settings } = useQuery<ShortenerSettings>({ queryKey: ["/api/admin/shortener/settings"] });
  const { data: links = [] } = useQuery<any[]>({ queryKey: ["/api/admin/shortener/links"] });
  const [draft, setDraft] = useState<Partial<ShortenerSettings>>({});

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/admin/shortener/settings", draft);
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shortener/settings"] });
    },
  });

  const toggleLinkMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/shortener/links/${id}`, { isActive });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/shortener/links"] }),
  });

  const deleteLinkMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/shortener/links/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Link deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shortener/links"] });
    },
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Link2 className="h-6 w-6" /> URL Shortener — Admin</h1>
        <p className="text-gray-600">Control who can use the shortener and manage every link on the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Access controls</CardTitle>
          <CardDescription>Enable/disable the feature globally and per user tier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Feature enabled (master switch)" checked={!!draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} testId="switch-enabled" />
          <div className="grid md:grid-cols-2 gap-4">
            <Toggle label="Allow free users" checked={!!draft.allowFreeUsers} onChange={(v) => setDraft({ ...draft, allowFreeUsers: v })} testId="switch-allow-free" />
            <Toggle label="Allow verified users" checked={!!draft.allowVerifiedUsers} onChange={(v) => setDraft({ ...draft, allowVerifiedUsers: v })} testId="switch-allow-verified" />
            <Toggle label="Allow premium users" checked={!!draft.allowPremiumUsers} onChange={(v) => setDraft({ ...draft, allowPremiumUsers: v })} testId="switch-allow-premium" />
            <Toggle label="Allow brand accounts" checked={!!draft.allowBrands} onChange={(v) => setDraft({ ...draft, allowBrands: v })} testId="switch-allow-brands" />
            <Toggle label="Allow influencer accounts" checked={!!draft.allowInfluencers} onChange={(v) => setDraft({ ...draft, allowInfluencers: v })} testId="switch-allow-influencers" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Free user link limit</Label>
              <Input type="number" min={0} value={draft.freeUserLimit ?? 0} onChange={(e) => setDraft({ ...draft, freeUserLimit: Number(e.target.value) })} data-testid="input-free-limit" />
            </div>
            <div>
              <Label>Premium / verified link limit</Label>
              <Input type="number" min={0} value={draft.premiumUserLimit ?? 0} onChange={(e) => setDraft({ ...draft, premiumUserLimit: Number(e.target.value) })} data-testid="input-premium-limit" />
            </div>
          </div>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} data-testid="button-save-settings">
            {saveMut.isPending ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All short links ({links.length})</CardTitle>
          <CardDescription>Disable abusive links or remove them entirely.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Slug</th><th>Destination</th><th>Owner</th><th>Type</th><th>Clicks</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {links.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0" data-testid={`admin-row-link-${l.id}`}>
                    <td className="py-2 font-mono text-purple-700">/s/{l.slug}</td>
                    <td className="truncate max-w-[280px]"><a href={l.originalUrl} target="_blank" rel="noreferrer" className="hover:underline">{l.originalUrl}</a></td>
                    <td>{l.user ? `${l.user.firstName || ""} ${l.user.lastName || ""}`.trim() || l.user.email : "—"}<div className="text-xs text-gray-500 capitalize">{l.user?.userType}</div></td>
                    <td>{l.isReferral ? <Badge variant="secondary">Referral</Badge> : <Badge variant="outline">Standard</Badge>}</td>
                    <td>{l.clickCount ?? 0}</td>
                    <td><Switch checked={!!l.isActive} onCheckedChange={(v) => toggleLinkMut.mutate({ id: l.id, isActive: v })} data-testid={`admin-switch-active-${l.id}`} /></td>
                    <td>
                      <Button variant="outline" size="icon" onClick={() => { if (confirm("Delete this link permanently?")) deleteLinkMut.mutate(l.id); }} data-testid={`admin-button-delete-${l.id}`}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {links.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-6">No links yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );
}
