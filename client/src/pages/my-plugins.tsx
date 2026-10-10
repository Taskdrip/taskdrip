import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, KeyRound, MessageSquare, RefreshCw, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type SupportMessage = { id: string; senderId: string; content: string; createdAt: string };
type SupportThread = {
  id: string;
  userId: string;
  requestType: string;
  subject: string;
  status: string;
  messages: SupportMessage[];
};
type PluginLicense = {
  id: string;
  status: string;
  cadence: "monthly" | "yearly";
  keyPrefix: string;
  startsAt: string;
  expiresAt: string;
  maxActivations: number;
  project: { id: string; slug: string; name: string; version: string; status: string };
  product: { id: string; title: string; serviceAddons: { id: string; title: string; price: number }[] };
  sites: { id: string; siteUrl: string; pluginVersion: string | null; lastSeenAt: string | null }[];
  usage: Record<string, number>;
  threads: SupportThread[];
};

export default function MyPluginsPage() {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [supportDrafts, setSupportDrafts] = useState<Record<string, { subject: string; content: string; requestType: string }>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const { data: licenses = [], isLoading, error } = useQuery<PluginLicense[]>({
    queryKey: ["/api/my/plugin-licenses"],
    queryFn: async () => (await apiRequest("GET", "/api/my/plugin-licenses")).json(),
    retry: false,
    refetchInterval: 15_000,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
  const selectedLicenseId = new URLSearchParams(window.location.search).get("license");
  const hasSelectedLicense = licenses.some((license) => license.id === selectedLicenseId);

  useEffect(() => {
    if (!selectedLicenseId || isLoading || !hasSelectedLicense) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`plugin-license-${selectedLicenseId}`)
        ?.querySelector<HTMLElement>("[data-plugin-support]")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [selectedLicenseId, isLoading, hasSelectedLicense]);

  const revealMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/my/plugin-licenses/${id}/reveal`, {});
      return response.json();
    },
    onSuccess: (result, id) => setRevealed((current) => ({ ...current, [id]: result.licenseKey })),
    onError: (err: Error) => toast({ title: "Could not show license key", description: err.message, variant: "destructive" }),
  });

  const supportMutation = useMutation({
    mutationFn: async ({ id, subject, content, requestType }: { id: string; subject: string; content: string; requestType: string }) => {
      const response = await apiRequest("POST", `/api/my/plugin-licenses/${id}/support`, { subject, content, requestType });
      return response.json();
    },
    onSuccess: (_result, variables) => {
      setSupportDrafts((current) => ({ ...current, [variables.id]: { subject: "", content: "", requestType: "support" } }));
      queryClient.invalidateQueries({ queryKey: ["/api/my/plugin-licenses"] });
      toast({ title: "Message sent to the developer" });
    },
    onError: (err: Error) => toast({ title: "Could not send message", description: err.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/plugin-support/${threadId}/messages`, { content });
      return response.json();
    },
    onSuccess: (_result, variables) => {
      setReplyDrafts((current) => ({ ...current, [variables.threadId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/my/plugin-licenses"] });
      toast({ title: "Reply sent" });
    },
    onError: (err: Error) => toast({ title: "Could not send reply", description: err.message, variant: "destructive" }),
  });

  const download = async (license: PluginLicense) => {
    try {
      const response = await fetch(`/api/my/plugin-licenses/${license.id}/download`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Could not download the plugin.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${license.project.slug}-premium-${license.project.version}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Plugin ZIP downloaded" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const setSupport = (id: string, key: "subject" | "content" | "requestType", value: string) => {
    setSupportDrafts((current) => {
      const previous = current[id] || { subject: "", content: "", requestType: "support" };
      return { ...current, [id]: { ...previous, [key]: value } };
    });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white">
        <div className="flex items-center gap-2 text-violet-200"><KeyRound className="h-5 w-5" /> TASKDRIP PLUGIN STUDIO</div>
        <h1 className="mt-2 text-3xl font-bold">My plugin licenses</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">View keys, tracked WordPress installs, downloads, renewals, and support conversations. Renewals are verified after payment proof is reviewed.</p>
      </header>

      {isLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading your plugin licenses…</CardContent></Card>}
      {error && <Card className="border-red-200"><CardContent className="p-6 text-sm text-red-700">Could not load your licenses. Sign in again and retry.</CardContent></Card>}
      {!isLoading && !error && licenses.length === 0 && (
        <Card><CardContent className="p-6">
          <p className="font-semibold">No plugin licenses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">After a plugin order is paid and approved, its license and download appear here.</p>
          <Button asChild className="mt-4"><a href="/shop">Browse Taskdrip Shop</a></Button>
        </CardContent></Card>
      )}

      {licenses.map((license) => {
        const isActive = license.status === "active" && new Date(license.expiresAt).getTime() > Date.now();
        const draft = supportDrafts[license.id] || { subject: "", content: "", requestType: "support" };
        return (
          <Card key={license.id} id={`plugin-license-${license.id}`} className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{license.project.name}</CardTitle>
                    <Badge variant={isActive ? "default" : "destructive"}>{isActive ? "Active" : license.status === "superseded" ? "Replaced" : "Expired"}</Badge>
                    <Badge variant="outline">{license.cadence}</Badge>
                  </div>
                  <CardDescription className="mt-1">Premium updates through v{license.project.version} · Key ending {license.keyPrefix}</CardDescription>
                </div>
                <span className="text-sm text-muted-foreground">Expires {new Date(license.expiresAt).toLocaleDateString()}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => revealed[license.id] ? navigator.clipboard.writeText(revealed[license.id]).then(() => toast({ title: "License key copied" })) : revealMutation.mutate(license.id)} disabled={revealMutation.isPending}>
                  <KeyRound className="mr-2 h-4 w-4" />{revealed[license.id] ? "Copy license key" : "Show license key"}
                </Button>
                {isActive && <Button size="sm" onClick={() => download(license)}><ArrowDownToLine className="mr-2 h-4 w-4" />Download premium ZIP</Button>}
                <Button asChild size="sm" variant="outline">
                  <a href={`/shop/product/${license.product.id}?plan=${license.cadence === "yearly" ? "plugin-yearly" : "plugin-monthly"}`}>
                    <RefreshCw className="mr-2 h-4 w-4" />Renew {license.cadence}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`/shop/product/${license.product.id}?plan=${license.cadence === "yearly" ? "plugin-monthly" : "plugin-yearly"}`}>
                    Renew {license.cadence === "yearly" ? "monthly" : "yearly"}
                  </a>
                </Button>
              </div>
              {revealed[license.id] && <div className="rounded-lg bg-slate-50 p-3 font-mono text-sm break-all">{revealed[license.id]}</div>}

              <section>
                <h3 className="mb-2 font-semibold">WordPress installations ({license.sites.length}/{license.maxActivations})</h3>
                {license.sites.length === 0 ? <p className="text-sm text-muted-foreground">No sites have activated this key yet.</p> : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {license.sites.map((site) => <div key={site.id} className="rounded-lg border p-3 text-sm">
                      <a className="font-medium text-indigo-700 underline" href={site.siteUrl} target="_blank" rel="noreferrer">{site.siteUrl}</a>
                      <p className="text-xs text-muted-foreground">Plugin {site.pluginVersion || "—"} · Last check {site.lastSeenAt ? new Date(site.lastSeenAt).toLocaleString() : "—"}</p>
                    </div>)}
                  </div>
                )}
              </section>

              <section className="space-y-2 border-t pt-4">
                <h3 className="font-semibold">Tracked usage and updates</h3>
                <p className="text-xs text-muted-foreground">Activity reported by the activated WordPress sites on this license.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    ["Activations", license.usage.activated || 0],
                    ["License checks", license.usage.heartbeat || 0],
                    ["Update checks", license.usage.update_check || 0],
                    ["Update downloads", license.usage.update_download || 0],
                    ["Plugin downloads", license.usage.shop_download || 0],
                    ["Deactivations", license.usage.deactivated || 0],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xl font-semibold">{count}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3 border-t pt-4 scroll-mt-6" data-plugin-support>
                <h3 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" />Developer support and update requests</h3>
                {license.threads.map((thread) => (
                  <div key={thread.id} className="space-y-2 rounded-xl border bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2"><p className="font-medium">{thread.subject}</p><Badge variant="outline">{thread.requestType === "update_request" ? "Update request" : thread.status}</Badge></div>
                    <div className="space-y-2">
                      {thread.messages.map((message) => <p key={message.id} className="whitespace-pre-wrap rounded-lg bg-white p-2 text-sm">{message.content}<span className="ml-2 text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</span></p>)}
                    </div>
                    <div className="flex gap-2">
                      <Input value={replyDrafts[thread.id] || ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [thread.id]: event.target.value }))} placeholder="Reply to the developer" />
                      <Button size="icon" aria-label="Send reply" onClick={() => replyMutation.mutate({ threadId: thread.id, content: replyDrafts[thread.id] || "" })} disabled={replyMutation.isPending || !(replyDrafts[thread.id] || "").trim()}><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <div className="grid gap-3 rounded-xl border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label htmlFor={`subject-${license.id}`}>Subject</Label><Input id={`subject-${license.id}`} value={draft.subject} onChange={(event) => setSupport(license.id, "subject", event.target.value)} placeholder="How can the developer help?" /></div>
                    <div className="space-y-1"><Label htmlFor={`request-type-${license.id}`}>Message type</Label><select id={`request-type-${license.id}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.requestType} onChange={(event) => setSupport(license.id, "requestType", event.target.value)}><option value="support">Support question</option><option value="update_request">Request an update</option></select></div>
                  </div>
                  <Textarea rows={3} value={draft.content} onChange={(event) => setSupport(license.id, "content", event.target.value)} placeholder="Describe the issue or update you need." />
                  <Button size="sm" className="w-fit" onClick={() => supportMutation.mutate({ id: license.id, ...draft })} disabled={supportMutation.isPending || !draft.subject.trim() || !draft.content.trim()}><Send className="mr-2 h-4 w-4" />Send to developer</Button>
                </div>
              </section>
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
