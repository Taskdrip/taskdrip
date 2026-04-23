import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone, MessageCircle, Mail, Globe, MapPin, ArrowLeft, Sparkles, Send, Loader2,
  Star, Users, Calendar, Building2, ExternalLink, AlertCircle,
} from "lucide-react";

export default function AdminLeadDetail() {
  const [, params] = useRoute("/admin/leads/:id");
  const id = params?.id || "";
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const { toast } = useToast();

  const [waMsg, setWaMsg] = useState("Hi {{name}} — I'm reaching out from Taskdrip, the Web3 influencer marketplace. We can help you grow with verified creators and on-chain payouts. Free to chat?");
  const [smsMsg, setSmsMsg] = useState("");
  const [smsProvider, setSmsProvider] = useState<"twilio" | "device">("device");
  const [emailBody, setEmailBody] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const { data, isLoading } = useQuery<any>({ queryKey: [`/api/admin/leads/${id}`], enabled: isAdmin && !!id });
  const { data: providers } = useQuery<any>({ queryKey: ["/api/admin/leads/providers"], enabled: isAdmin });

  const lead = data?.lead;
  const messages = data?.messages || [];

  const aiMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/leads/${id}/ai-report`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/leads/${id}`] });
      toast({ title: "AI report generated" });
    },
    onError: (e: any) => toast({ title: "AI failed", description: e.message, variant: "destructive" }),
  });

  const messageMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", `/api/admin/leads/${id}/messages`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/leads/${id}`] });
      toast({ title: "Logged" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (authLoading || isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>;
  if (!isAuthenticated || !isAdmin) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Admin access required</div>;
  if (!lead) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Lead not found</div>;

  const personalize = (s: string) => s.replace(/\{\{name\}\}/g, (lead.name || "").split(" ")[0] || "there");
  const phoneE164 = (lead.phone || lead.whatsapp || "").replace(/[^\d]/g, "");
  const waLink = phoneE164 ? `https://wa.me/${phoneE164}?text=${encodeURIComponent(personalize(waMsg))}` : "";
  const callLink = lead.phone ? `tel:${lead.phone}` : "";
  const smsLink = lead.phone ? `sms:${lead.phone}?body=${encodeURIComponent(personalize(smsMsg))}` : "";
  const mailLink = lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent("Grow with Taskdrip")}&body=${encodeURIComponent(personalize(emailBody || waMsg))}` : "";

  const social: Record<string, string> = lead.socialLinks || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <Link href="/admin/leads"><Button variant="ghost" size="sm" data-testid="link-back"><ArrowLeft className="w-4 h-4 mr-2" />Back to Leads</Button></Link>

        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-purple-900/40 to-gray-900 border border-purple-500/30 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {lead.kind === "business" ? <Building2 className="w-6 h-6 text-purple-400" /> : <Users className="w-6 h-6 text-emerald-400" />}
                <Badge variant="outline" className="capitalize">{lead.kind}</Badge>
                <Badge variant="outline" className="capitalize">{lead.status || "new"}</Badge>
                {lead.source && <Badge variant="outline" className="text-xs opacity-70">{lead.source}</Badge>}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold" data-testid="text-lead-name">{lead.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-300">
                {lead.businessType && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.businessType}</span>}
                {lead.niche && <span>· {lead.niche}</span>}
                {(lead.city || lead.country) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city || ""} {lead.country || ""}</span>}
                {lead.rating && <span className="flex items-center gap-1 text-amber-400"><Star className="w-3 h-3" />{lead.rating} ({lead.reviewCount || 0})</span>}
                {lead.followers != null && <span className="flex items-center gap-1 text-emerald-400"><Users className="w-3 h-3" />{lead.followers.toLocaleString()} followers</span>}
                {lead.yearsInBusiness && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{lead.yearsInBusiness} years</span>}
              </div>
              {lead.address && <p className="text-sm text-gray-400 mt-2">{lead.address}</p>}
            </div>
            <Button onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600" data-testid="button-ai-report">
              {aiMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {lead.aiReport ? "Regenerate AI Report" : "Generate AI Report"}
            </Button>
          </div>

          {/* Quick action bar */}
          <div className="flex flex-wrap gap-2 mt-5">
            {phoneE164 && <a href={waLink} target="_blank" rel="noreferrer" data-testid="link-wa-quick"><Button className="bg-emerald-600 hover:bg-emerald-700"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp</Button></a>}
            {callLink && <a href={callLink} data-testid="link-call-quick"><Button className="bg-blue-600 hover:bg-blue-700"><Phone className="w-4 h-4 mr-2" />Call</Button></a>}
            {smsLink && <a href={smsLink} data-testid="link-sms-quick"><Button variant="outline"><Send className="w-4 h-4 mr-2" />SMS</Button></a>}
            {mailLink && <a href={mailLink} data-testid="link-email-quick"><Button variant="outline"><Mail className="w-4 h-4 mr-2" />Email</Button></a>}
            {lead.website && <a href={lead.website} target="_blank" rel="noreferrer"><Button variant="outline"><Globe className="w-4 h-4 mr-2" />Website</Button></a>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: AI report + social */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5">
              <h2 className="font-bold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" />AI Growth Report</h2>
              {lead.aiSummary && <p className="text-purple-200 italic mb-3">{lead.aiSummary}</p>}
              {lead.aiReport ? (
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-gray-200" data-testid="text-ai-report">{lead.aiReport}</div>
              ) : (
                <p className="text-sm text-gray-500">No report yet. Click <b>Generate AI Report</b>.</p>
              )}
              {!providers?.openai && (
                <p className="text-xs text-amber-400 mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Add <code>OPENAI_API_KEY</code> for full AI reports — heuristic fallback used now.</p>
              )}
            </div>

            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5">
              <h2 className="font-bold mb-3">Profiles & Links</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(social).filter(([_, v]) => v).map(([k, v]) => (
                  <a key={k} href={String(v)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm capitalize" data-testid={`link-social-${k}`}>
                    <ExternalLink className="w-3 h-3" />{k}
                  </a>
                ))}
                {Object.values(social).filter(Boolean).length === 0 && <p className="text-sm text-gray-500 col-span-3">No social links yet.</p>}
              </div>
            </div>

            {lead.description && (
              <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5">
                <h2 className="font-bold mb-2">Description</h2>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{lead.description}</p>
              </div>
            )}
          </div>

          {/* Right: Comm hub + history */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5">
              <h2 className="font-bold mb-3">Communication Hub</h2>
              <Tabs defaultValue="whatsapp">
                <TabsList className="bg-gray-800 grid grid-cols-4">
                  <TabsTrigger value="whatsapp">WA</TabsTrigger>
                  <TabsTrigger value="sms">SMS</TabsTrigger>
                  <TabsTrigger value="email">Mail</TabsTrigger>
                  <TabsTrigger value="note">Note</TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp" className="space-y-3 pt-3">
                  <Textarea rows={4} value={waMsg} onChange={e => setWaMsg(e.target.value)} data-testid="input-wa" />
                  <p className="text-xs text-gray-500">Use <code>{"{{name}}"}</code> to insert the lead's first name.</p>
                  {phoneE164 ? (
                    <a href={waLink} target="_blank" rel="noreferrer" onClick={() => messageMutation.mutate({ channel: "whatsapp", body: personalize(waMsg) })} className="block">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700"><MessageCircle className="w-4 h-4 mr-2" />Open WhatsApp & log</Button>
                    </a>
                  ) : <p className="text-xs text-amber-400">No phone number on file.</p>}
                </TabsContent>

                <TabsContent value="sms" className="space-y-3 pt-3">
                  <Textarea rows={4} value={smsMsg} onChange={e => setSmsMsg(e.target.value)} placeholder="Quick SMS to send…" data-testid="input-sms" />
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setSmsProvider("device")} className={`px-2 py-1 rounded ${smsProvider === "device" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"}`}>Device (free)</button>
                    <button onClick={() => setSmsProvider("twilio")} className={`px-2 py-1 rounded ${smsProvider === "twilio" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"}`}>Twilio</button>
                  </div>
                  {smsProvider === "device" && lead.phone ? (
                    <a href={smsLink} onClick={() => messageMutation.mutate({ channel: "sms", body: personalize(smsMsg), provider: "manual" })} className="block">
                      <Button className="w-full"><Send className="w-4 h-4 mr-2" />Open SMS & log</Button>
                    </a>
                  ) : (
                    <Button className="w-full" disabled={messageMutation.isPending || !smsMsg || !lead.phone} onClick={() => messageMutation.mutate({ channel: "sms", body: personalize(smsMsg), provider: "twilio" })}>
                      {messageMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send via Twilio
                    </Button>
                  )}
                  {smsProvider === "twilio" && !providers?.twilio && <p className="text-xs text-amber-400">⚠ Twilio not configured.</p>}
                </TabsContent>

                <TabsContent value="email" className="space-y-3 pt-3">
                  <Textarea rows={5} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Email body…" />
                  {mailLink ? (
                    <a href={mailLink} onClick={() => messageMutation.mutate({ channel: "email", body: emailBody })} className="block">
                      <Button className="w-full"><Mail className="w-4 h-4 mr-2" />Open mail client & log</Button>
                    </a>
                  ) : <p className="text-xs text-amber-400">No email on file.</p>}
                </TabsContent>

                <TabsContent value="note" className="space-y-3 pt-3">
                  <Textarea rows={5} value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="Internal note…" />
                  <Button className="w-full" disabled={!noteBody} onClick={() => { messageMutation.mutate({ channel: "note", body: noteBody }); setNoteBody(""); }}>Save note</Button>
                </TabsContent>
              </Tabs>
            </div>

            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5">
              <h2 className="font-bold mb-3">History ({messages.length})</h2>
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500">No outreach yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((m: any) => (
                    <div key={m.id} className="rounded-lg bg-gray-800/60 border border-gray-700 p-3 text-sm">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="capitalize font-semibold text-purple-300">{m.channel}</span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      {m.body && <p className="mt-1 text-gray-200 whitespace-pre-wrap">{m.body}</p>}
                      <div className="flex gap-2 mt-2 text-xs">
                        <Badge variant="outline" className="capitalize">{m.status}</Badge>
                        {m.provider && <Badge variant="outline" className="text-xs opacity-70">{m.provider}</Badge>}
                        {m.error && <span className="text-red-400">{m.error}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
