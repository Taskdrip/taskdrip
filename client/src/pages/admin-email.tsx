import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Send, Settings, Zap, BarChart3, Users, FileText, Plus, Trash2,
  Play, Eye, Edit, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw,
  Server, Shield, Globe, Key, TestTube, Inbox, Bot, ChevronRight,
  ArrowLeft, Copy, Info, Layers
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailSettings {
  smtpHost?: string; smtpPort?: number; smtpUser?: string; smtpPass?: string;
  smtpSsl?: boolean; smtpTls?: boolean; smtpFromEmail?: string; smtpFromName?: string;
  imapHost?: string; imapPort?: number; imapUser?: string; imapPass?: string; imapSsl?: boolean;
  siteUrl?: string; domain?: string; unsubscribeUrl?: string; logoUrl?: string;
  spfRecord?: string; dkimPublicKey?: string; dmarcRecord?: string;
  isVerified?: boolean; lastTestedAt?: string;
}

interface EmailCampaign {
  id: string; name: string; subject: string; htmlBody: string; textBody?: string;
  targetSegment: string; status: string; scheduledAt?: string; sentAt?: string;
  totalRecipients: number; sent: number; delivered: number; opened: number;
  clicked: number; bounced: number; unsubscribed: number; createdAt: string;
}

interface EmailTemplate {
  id: string; name: string; category: string; subject: string;
  htmlBody: string; textBody?: string; variables?: string[]; isActive: boolean; createdAt: string;
}

interface EmailAutoResponder {
  id: string; name: string; trigger: string; triggerDelay: number;
  subject: string; htmlBody: string; targetUserType: string;
  isActive: boolean; aiGenerated: boolean; sentCount: number; openCount: number; createdAt: string;
}

interface EmailLog {
  id: string; recipientEmail: string; recipientName?: string; subject: string;
  status: string; errorMessage?: string; sentAt: string; openedAt?: string; clickedAt?: string;
  campaignId?: string; autoResponderId?: string;
}

interface Contact {
  id: string; email: string; firstName: string; lastName: string;
  userType: string; creatorTier?: string; isVerified: boolean; totalFollowers: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENTS = [
  { value: "all", label: "All Users" },
  { value: "creators", label: "Creators Only" },
  { value: "brands", label: "Brands Only" },
  { value: "verified", label: "Verified Users" },
  { value: "unverified", label: "Unverified Users" },
  { value: "tier_rising_sparks", label: "Rising Sparks (10K–100K)" },
  { value: "tier_growth_engines", label: "Growth Engines (100K–1M)" },
  { value: "tier_power_influencers", label: "Power Influencers (1M–10M)" },
  { value: "tier_global_titans", label: "Global Titans (10M+)" },
];

const TRIGGERS = [
  { value: "signup", label: "User Signs Up" },
  { value: "campaign_join", label: "Joins a Campaign" },
  { value: "campaign_complete", label: "Completes a Campaign" },
  { value: "purchase", label: "Makes a Purchase" },
  { value: "kyc_approved", label: "KYC Approved" },
  { value: "payout_sent", label: "Payout Sent" },
  { value: "custom", label: "Custom / Manual" },
];

const TEMPLATE_CATS = ["general", "welcome", "campaign", "newsletter", "promo", "auto_responder"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-yellow-100 text-yellow-700",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    sent_log: "bg-green-100 text-green-700",
    opened: "bg-purple-100 text-purple-700",
    clicked: "bg-indigo-100 text-indigo-700",
    bounced: "bg-red-100 text-red-700",
  };
  return <Badge className={`${map[status] || "bg-gray-100 text-gray-700"} border-0 text-xs`}>{status}</Badge>;
}

function openRate(opened: number, sent: number) {
  if (!sent) return "0%";
  return `${((opened / sent) * 100).toFixed(1)}%`;
}

function clickRate(clicked: number, sent: number) {
  if (!sent) return "0%";
  return `${((clicked / sent) * 100).toFixed(1)}%`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="border border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminEmail() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // ── Settings state
  const [settings, setSettings] = useState<EmailSettings>({});
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // ── Campaign state
  const [campaignModal, setCampaignModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Partial<EmailCampaign> | null>(null);
  const [campaignPreview, setCampaignPreview] = useState<EmailCampaign | null>(null);
  const [blastConfirm, setBlastConfirm] = useState<string | null>(null);

  // ── Template state
  const [templateModal, setTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [aiTemplateKey, setAiTemplateKey] = useState("");

  // ── Auto-responder state
  const [arModal, setArModal] = useState(false);
  const [editAr, setEditAr] = useState<Partial<EmailAutoResponder> | null>(null);

  // ── Queries
  const { data: settingsData } = useQuery<EmailSettings>({ queryKey: ["/api/admin/email/settings"] });
  const { data: campaigns = [] } = useQuery<EmailCampaign[]>({ queryKey: ["/api/admin/email/campaigns"] });
  const { data: templates = [] } = useQuery<EmailTemplate[]>({ queryKey: ["/api/admin/email/templates"] });
  const { data: autoResponders = [] } = useQuery<EmailAutoResponder[]>({ queryKey: ["/api/admin/email/auto-responders"] });
  const { data: logs = [] } = useQuery<EmailLog[]>({ queryKey: ["/api/admin/email/logs"] });
  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ["/api/admin/email/contacts"] });
  const { data: aiTemplates = {} } = useQuery<Record<string, any>>({ queryKey: ["/api/admin/email/ai-templates"] });

  useEffect(() => {
    if (settingsData) setSettings(settingsData);
  }, [settingsData]);

  // ── Mutations
  const saveSettings = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/settings", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/settings"] }); toast({ title: "Settings saved" }); setSettingsDirty(false); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const createCampaign = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/campaigns", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); setCampaignModal(false); toast({ title: "Campaign created" }); },
  });

  const updateCampaign = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PATCH", `/api/admin/email/campaigns/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); setCampaignModal(false); toast({ title: "Campaign updated" }); },
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); toast({ title: "Campaign deleted" }); },
  });

  const sendCampaign = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/email/campaigns/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/campaigns"] }); setBlastConfirm(null); toast({ title: "Campaign blast started! Emails are being sent in the background." }); },
    onError: () => toast({ title: "Blast failed", variant: "destructive" }),
  });

  const createTemplate = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/templates", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/templates"] }); setTemplateModal(false); toast({ title: "Template created" }); },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PATCH", `/api/admin/email/templates/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/templates"] }); setTemplateModal(false); toast({ title: "Template updated" }); },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/templates"] }); toast({ title: "Template deleted" }); },
  });

  const createAr = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/email/auto-responders", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }); setArModal(false); toast({ title: "Auto-responder created" }); },
  });

  const updateAr = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PATCH", `/api/admin/email/auto-responders/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }); setArModal(false); toast({ title: "Auto-responder updated" }); },
  });

  const deleteAr = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/email/auto-responders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }); toast({ title: "Deleted" }); },
  });

  const toggleAr = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PATCH", `/api/admin/email/auto-responders/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/email/auto-responders"] }),
  });

  // ── Handlers
  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await apiRequest("POST", "/api/admin/email/test-smtp", settings);
      const data = await res.json();
      if (data.success) toast({ title: "✅ SMTP connection successful!" });
      else toast({ title: `SMTP failed: ${data.error}`, variant: "destructive" });
    } catch { toast({ title: "Test failed", variant: "destructive" }); }
    setTestingSmtp(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) { toast({ title: "Enter a test email", variant: "destructive" }); return; }
    setSendingTest(true);
    try {
      const res = await apiRequest("POST", "/api/admin/email/send-test", { to: testEmail, subject: "Test from Taskdrip Email CRM", html: "<h2>Hello!</h2><p>This is a test email from your Taskdrip Email Marketing CRM.</p>" });
      const data = await res.json();
      if (data.success) toast({ title: `Test email sent to ${testEmail}` });
      else toast({ title: `Failed: ${data.error}`, variant: "destructive" });
    } catch { toast({ title: "Failed to send", variant: "destructive" }); }
    setSendingTest(false);
  };

  const handleSaveCampaign = () => {
    if (!editCampaign) return;
    if (editCampaign.id) updateCampaign.mutate(editCampaign as any);
    else createCampaign.mutate(editCampaign as any);
  };

  const handleSaveTemplate = () => {
    if (!editTemplate) return;
    if (editTemplate.id) updateTemplate.mutate(editTemplate as any);
    else createTemplate.mutate(editTemplate as any);
  };

  const handleSaveAr = () => {
    if (!editAr) return;
    if (editAr.id) updateAr.mutate(editAr as any);
    else createAr.mutate(editAr as any);
  };

  const handleLoadAiTemplate = (key: string) => {
    const t = (aiTemplates as any)[key];
    if (!t) return;
    setEditCampaign(prev => ({ ...prev, subject: t.subject, htmlBody: t.body }));
    setAiTemplateKey(key);
    toast({ title: "AI template loaded" });
  };

  // Stats
  const totalSent = campaigns.reduce((s, c) => s + (c.sent || 0), 0);
  const totalOpened = campaigns.reduce((s, c) => s + (c.opened || 0), 0);
  const totalClicked = campaigns.reduce((s, c) => s + (c.clicked || 0), 0);
  const activeAutoResponders = autoResponders.filter(a => a.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Marketing CRM</h1>
            <p className="text-sm text-gray-500">Campaigns · Templates · Auto-Responders · SMTP / IMAP · Domain Management</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {settings?.isVerified ? (
              <Badge className="bg-green-100 text-green-700 border-0 gap-1"><CheckCircle className="h-3 w-3" />SMTP Verified</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 border-0 gap-1"><AlertCircle className="h-3 w-3" />SMTP Not Configured</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-gray-200 p-1 h-auto flex-wrap gap-1">
          {[
            { value: "overview", icon: BarChart3, label: "Overview" },
            { value: "campaigns", icon: Send, label: "Campaigns" },
            { value: "templates", icon: FileText, label: "Templates" },
            { value: "auto-responders", icon: Bot, label: "Auto-Responders" },
            { value: "contacts", icon: Users, label: "Contacts" },
            { value: "logs", icon: Inbox, label: "Email Logs" },
            { value: "settings", icon: Settings, label: "SMTP / IMAP / Domain" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <tab.icon className="h-4 w-4" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─────────────── OVERVIEW ─────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Sent" value={totalSent.toLocaleString()} icon={Send} color="bg-purple-600" />
            <StatCard label="Opened" value={totalOpened.toLocaleString()} icon={Eye} color="bg-blue-600" />
            <StatCard label="Clicked" value={totalClicked.toLocaleString()} icon={Zap} color="bg-green-600" />
            <StatCard label="Active Auto-Responders" value={activeAutoResponders} icon={Bot} color="bg-orange-500" />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <StatCard label="Total Campaigns" value={campaigns.length} icon={Layers} color="bg-indigo-600" />
            <StatCard label="Email Templates" value={templates.length} icon={FileText} color="bg-pink-600" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-purple-600" />Recent Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {campaigns.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.sent} sent · {openRate(c.opened, c.sent)} open rate</p>
                    </div>
                    {statusBadge(c.status)}
                  </div>
                ))}
                {campaigns.length === 0 && <p className="text-gray-400 text-sm p-6">No campaigns yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2"><Bot className="h-4 w-4 text-orange-500" />Auto-Responders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {autoResponders.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500">Trigger: {a.trigger} · {a.sentCount} sent</p>
                    </div>
                    <Switch checked={a.isActive} onCheckedChange={v => toggleAr.mutate({ id: a.id, isActive: v })} />
                  </div>
                ))}
                {autoResponders.length === 0 && <p className="text-gray-400 text-sm p-6">No auto-responders yet</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────── CAMPAIGNS ─────────────── */}
        <TabsContent value="campaigns">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Campaigns</h2>
            <Button onClick={() => { setEditCampaign({ targetSegment: "all", status: "draft", htmlBody: "" }); setCampaignModal(true); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="h-4 w-4" />New Campaign
            </Button>
          </div>
          <div className="space-y-3">
            {campaigns.map(c => (
              <Card key={c.id} className="border border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                        {statusBadge(c.status)}
                      </div>
                      <p className="text-sm text-gray-500 truncate mb-2">Subject: {c.subject}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{SEGMENTS.find(s => s.value === c.targetSegment)?.label || c.targetSegment}</span>
                        <span className="flex items-center gap-1"><Send className="h-3 w-3" />{c.sent} sent</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{openRate(c.opened, c.sent)} open</span>
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{clickRate(c.clicked, c.sent)} click</span>
                        {c.scheduledAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(c.scheduledAt).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.status === "draft" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => setBlastConfirm(c.id)}>
                          <Play className="h-3 w-3" />Send
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setCampaignPreview(c)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditCampaign({ ...c }); setCampaignModal(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteCampaign.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {campaigns.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Send className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No campaigns yet</p>
                <p className="text-sm">Create your first email blast campaign</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────────── TEMPLATES ─────────────── */}
        <TabsContent value="templates">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
            <Button onClick={() => { setEditTemplate({ category: "general", htmlBody: "", isActive: true }); setTemplateModal(true); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="h-4 w-4" />New Template
            </Button>
          </div>

          {/* AI Templates */}
          <Card className="mb-4 border-purple-100 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2"><Bot className="h-4 w-4" />AI-Generated Template Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(aiTemplates).map(([key, t]: [string, any]) => (
                  <button key={key} onClick={() => { setEditTemplate({ name: key.replace(/_/g, " "), category: "auto_responder", subject: t.subject, htmlBody: t.body, isActive: true }); setTemplateModal(true); }}
                    className="text-left p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                    <p className="text-xs font-semibold text-gray-800 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.subject}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="border border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{t.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{t.subject}</p>
                    </div>
                    <Badge className="text-xs bg-indigo-50 text-indigo-700 border-0 shrink-0 ml-2">{t.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setEditTemplate({ ...t }); setTemplateModal(true); }}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteTemplate.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No custom templates yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────────── AUTO-RESPONDERS ─────────────── */}
        <TabsContent value="auto-responders">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Auto-Responders</h2>
              <p className="text-sm text-gray-500">Automated emails triggered by user actions, powered by AI templates</p>
            </div>
            <Button onClick={() => { setEditAr({ trigger: "signup", triggerDelay: 0, targetUserType: "all", isActive: true, htmlBody: "" }); setArModal(true); }} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="h-4 w-4" />New Auto-Responder
            </Button>
          </div>

          {/* Quick setup from AI templates */}
          <Card className="mb-4 border-orange-100 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2"><Zap className="h-4 w-4" />Quick Setup — AI Auto-Responder Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { key: "welcome_creator", trigger: "signup", delay: 0, label: "Welcome Creator", userType: "creator" },
                  { key: "welcome_brand", trigger: "signup", delay: 0, label: "Welcome Brand", userType: "brand" },
                  { key: "campaign_approved", trigger: "campaign_complete", delay: 0, label: "Campaign Approved", userType: "creator" },
                  { key: "payout_sent", trigger: "payout_sent", delay: 0, label: "Payout Sent", userType: "creator" },
                  { key: "kyc_approved", trigger: "kyc_approved", delay: 0, label: "KYC Approved", userType: "creator" },
                  { key: "newsletter", trigger: "custom", delay: 0, label: "Weekly Newsletter", userType: "all" },
                ].map(item => {
                  const t = (aiTemplates as any)[item.key];
                  return (
                    <button key={item.key} onClick={() => {
                      setEditAr({
                        name: item.label, trigger: item.trigger, triggerDelay: item.delay,
                        targetUserType: item.userType, isActive: true, aiGenerated: true,
                        subject: t?.subject || "", htmlBody: t?.body || "",
                      });
                      setArModal(true);
                    }} className="text-left p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-colors">
                      <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{TRIGGERS.find(tr => tr.value === item.trigger)?.label}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {autoResponders.map(a => (
              <Card key={a.id} className="border border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${a.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                        <Bot className={`h-4 w-4 ${a.isActive ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-gray-900">{a.name}</h3>
                          {a.aiGenerated && <Badge className="bg-purple-50 text-purple-700 border-0 text-xs">AI</Badge>}
                        </div>
                        <p className="text-xs text-gray-500">
                          Trigger: {TRIGGERS.find(t => t.value === a.trigger)?.label} · Delay: {a.triggerDelay}min · {a.targetUserType} users
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.sentCount} sent · {a.openCount} opened</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={a.isActive} onCheckedChange={v => toggleAr.mutate({ id: a.id, isActive: v })} />
                      <Button size="sm" variant="outline" onClick={() => { setEditAr({ ...a }); setArModal(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteAr.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {autoResponders.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No auto-responders configured</p>
                <p className="text-sm">Use the quick setup above or create a custom one</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─────────────── CONTACTS ─────────────── */}
        <TabsContent value="contacts">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
              <p className="text-sm text-gray-500">{contacts.length} registered users</p>
            </div>
            <div className="flex gap-2">
              {SEGMENTS.map(s => (
                <Badge key={s.value} className="bg-gray-100 text-gray-700 border-0 text-xs cursor-default">
                  {s.label}: {
                    s.value === "all" ? contacts.length :
                    s.value === "creators" ? contacts.filter(c => c.userType === "creator").length :
                    s.value === "brands" ? contacts.filter(c => c.userType === "brand").length :
                    s.value === "verified" ? contacts.filter(c => c.isVerified).length :
                    s.value.startsWith("tier_") ? contacts.filter(c => c.creatorTier === s.value.replace("tier_", "")).length : 0
                  }
                </Badge>
              ))}
            </div>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Name", "Email", "Type", "Tier", "Followers", "Verified"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.firstName} {c.lastName}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs border-0 ${c.userType === "creator" ? "bg-blue-50 text-blue-700" : c.userType === "brand" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                          {c.userType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.creatorTier?.replace(/_/g, " ") || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{(c.totalFollowers || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {c.isVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contacts.length === 0 && <p className="text-gray-400 text-sm p-6 text-center">No contacts yet</p>}
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────── LOGS ─────────────── */}
        <TabsContent value="logs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Send Logs</h2>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/email/logs"] })} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Recipient", "Subject", "Status", "Type", "Sent At", "Opened"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{l.recipientName || l.recipientEmail}</p>
                        <p className="text-xs text-gray-500">{l.recipientEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{l.subject}</td>
                      <td className="px-4 py-3">{statusBadge(l.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.campaignId ? "Campaign" : l.autoResponderId ? "Auto" : "Manual"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.sentAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.openedAt ? new Date(l.openedAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <p className="text-gray-400 text-sm p-6 text-center">No email logs yet</p>}
            </div>
          </Card>
        </TabsContent>

        {/* ─────────────── SETTINGS ─────────────── */}
        <TabsContent value="settings">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* SMTP */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4 text-purple-600" />SMTP Configuration (Outgoing)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">SMTP Host</Label>
                    <Input placeholder="smtp.gmail.com" value={settings.smtpHost || ""} onChange={e => { setSettings(p => ({ ...p, smtpHost: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Port</Label>
                    <Input placeholder="587" type="number" value={settings.smtpPort || ""} onChange={e => { setSettings(p => ({ ...p, smtpPort: parseInt(e.target.value) })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Username / Email</Label>
                  <Input placeholder="you@yourdomain.com" value={settings.smtpUser || ""} onChange={e => { setSettings(p => ({ ...p, smtpUser: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Password / App Password</Label>
                  <Input type="password" placeholder="••••••••" value={settings.smtpPass || ""} onChange={e => { setSettings(p => ({ ...p, smtpPass: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">From Name</Label>
                    <Input placeholder="Taskdrip" value={settings.smtpFromName || ""} onChange={e => { setSettings(p => ({ ...p, smtpFromName: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">From Email</Label>
                    <Input placeholder="no-reply@taskdrip.online" value={settings.smtpFromEmail || ""} onChange={e => { setSettings(p => ({ ...p, smtpFromEmail: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!settings.smtpSsl} onCheckedChange={v => { setSettings(p => ({ ...p, smtpSsl: v })); setSettingsDirty(true); }} />
                    <Label className="text-xs">SSL (port 465)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={settings.smtpTls !== false} onCheckedChange={v => { setSettings(p => ({ ...p, smtpTls: v })); setSettingsDirty(true); }} />
                    <Label className="text-xs">STARTTLS (port 587)</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleTestSmtp} disabled={testingSmtp} className="gap-1 flex-1">
                    <TestTube className="h-4 w-4" />{testingSmtp ? "Testing…" : "Test Connection"}
                  </Button>
                  <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Save SMTP
                  </Button>
                </div>
                {/* Send test email */}
                <div className="border-t pt-4">
                  <Label className="text-xs font-medium">Send Test Email</Label>
                  <div className="flex gap-2 mt-1">
                    <Input placeholder="test@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                    <Button onClick={handleSendTest} disabled={sendingTest} variant="outline" className="gap-1 shrink-0">
                      <Send className="h-4 w-4" />{sendingTest ? "Sending…" : "Send"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IMAP */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Inbox className="h-4 w-4 text-blue-600" />IMAP Configuration (Incoming)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  IMAP settings are stored for reference and future inbox reading integration. Outgoing mail uses SMTP.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">IMAP Host</Label>
                    <Input placeholder="imap.gmail.com" value={settings.imapHost || ""} onChange={e => { setSettings(p => ({ ...p, imapHost: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Port</Label>
                    <Input placeholder="993" type="number" value={settings.imapPort || ""} onChange={e => { setSettings(p => ({ ...p, imapPort: parseInt(e.target.value) })); setSettingsDirty(true); }} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Username</Label>
                  <Input placeholder="you@yourdomain.com" value={settings.imapUser || ""} onChange={e => { setSettings(p => ({ ...p, imapUser: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Password</Label>
                  <Input type="password" placeholder="••••••••" value={settings.imapPass || ""} onChange={e => { setSettings(p => ({ ...p, imapPass: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!settings.imapSsl} onCheckedChange={v => { setSettings(p => ({ ...p, imapSsl: v })); setSettingsDirty(true); }} />
                  <Label className="text-xs">SSL/TLS Encryption</Label>
                </div>
                <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="w-full bg-blue-600 hover:bg-blue-700">
                  Save IMAP
                </Button>
              </CardContent>
            </Card>

            {/* Domain & Site */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-green-600" />Domain & Site URL Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Site URL</Label>
                  <Input placeholder="https://taskdrip.online" value={settings.siteUrl || ""} onChange={e => { setSettings(p => ({ ...p, siteUrl: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">Used in email links (CTA buttons, footer links)</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Domain</Label>
                  <Input placeholder="taskdrip.online" value={settings.domain || ""} onChange={e => { setSettings(p => ({ ...p, domain: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Unsubscribe URL</Label>
                  <Input placeholder="https://taskdrip.online/unsubscribe" value={settings.unsubscribeUrl || ""} onChange={e => { setSettings(p => ({ ...p, unsubscribeUrl: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Logo URL (for email header)</Label>
                  <Input placeholder="https://taskdrip.online/logo.png" value={settings.logoUrl || ""} onChange={e => { setSettings(p => ({ ...p, logoUrl: e.target.value })); setSettingsDirty(true); }} className="mt-1" />
                </div>
                <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="w-full bg-green-600 hover:bg-green-700">
                  Save Domain Settings
                </Button>
              </CardContent>
            </Card>

            {/* DNS Records */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-orange-600" />DNS Records (SPF · DKIM · DMARC)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  Add these DNS records at your domain registrar (Namecheap, Cloudflare, GoDaddy, etc.) to prevent emails going to spam.
                </div>
                <div>
                  <Label className="text-xs font-medium">SPF Record (TXT)</Label>
                  <Textarea placeholder={`v=spf1 include:_spf.${settings.domain || "yourdomain.com"} ~all`}
                    value={settings.spfRecord || ""} rows={2}
                    onChange={e => { setSettings(p => ({ ...p, spfRecord: e.target.value })); setSettingsDirty(true); }}
                    className="mt-1 font-mono text-xs" />
                  <p className="text-xs text-gray-400 mt-1">Add as TXT record on @ / root</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">DKIM Public Key (TXT)</Label>
                  <Textarea placeholder="v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"
                    value={settings.dkimPublicKey || ""} rows={3}
                    onChange={e => { setSettings(p => ({ ...p, dkimPublicKey: e.target.value })); setSettingsDirty(true); }}
                    className="mt-1 font-mono text-xs" />
                  <p className="text-xs text-gray-400 mt-1">Add as TXT record on mail._domainkey</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">DMARC Record (TXT)</Label>
                  <Textarea placeholder={`v=DMARC1; p=quarantine; rua=mailto:dmarc@${settings.domain || "yourdomain.com"}`}
                    value={settings.dmarcRecord || ""} rows={2}
                    onChange={e => { setSettings(p => ({ ...p, dmarcRecord: e.target.value })); setSettingsDirty(true); }}
                    className="mt-1 font-mono text-xs" />
                  <p className="text-xs text-gray-400 mt-1">Add as TXT record on _dmarc</p>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Recommended Free SMTP Providers</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    {[
                      { name: "Gmail SMTP", host: "smtp.gmail.com", port: "587 (TLS) / 465 (SSL)", note: "Use App Password (2FA required)" },
                      { name: "Outlook / Hotmail", host: "smtp-mail.outlook.com", port: "587", note: "Use account credentials" },
                      { name: "Zoho Mail", host: "smtp.zoho.com", port: "587 / 465", note: "Free plan: 5GB" },
                      { name: "Brevo (Sendinblue)", host: "smtp-relay.brevo.com", port: "587", note: "300 free emails/day" },
                      { name: "Mailjet", host: "in-v3.mailjet.com", port: "587", note: "200 free emails/day" },
                    ].map(p => (
                      <div key={p.name} className="flex justify-between items-start py-1.5 border-b last:border-b-0">
                        <div>
                          <span className="font-medium text-gray-800">{p.name}</span>
                          <span className="text-gray-500 ml-2">{p.host}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600">{p.port}</p>
                          <p className="text-gray-400 text-xs">{p.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => saveSettings.mutate(settings)} disabled={!settingsDirty} className="w-full bg-orange-600 hover:bg-orange-700">
                  Save DNS Records
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─────────────── CAMPAIGN MODAL ─────────────── */}
      <Dialog open={campaignModal} onOpenChange={v => { if (!v) { setCampaignModal(false); setEditCampaign(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCampaign?.id ? "Edit Campaign" : "New Email Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Campaign Name</Label>
                <Input placeholder="Monthly Newsletter — April" className="mt-1"
                  value={editCampaign?.name || ""} onChange={e => setEditCampaign(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Target Segment</Label>
                <Select value={editCampaign?.targetSegment || "all"} onValueChange={v => setEditCampaign(p => ({ ...p, targetSegment: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Email Subject</Label>
              <Input placeholder="🚀 New campaigns are live — earn crypto today!" className="mt-1"
                value={editCampaign?.subject || ""} onChange={e => setEditCampaign(p => ({ ...p, subject: e.target.value }))} />
            </div>

            {/* AI Quick-fill */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Load from AI Template</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(aiTemplates).map(key => (
                  <button key={key} onClick={() => handleLoadAiTemplate(key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${aiTemplateKey === key ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 hover:border-purple-400"}`}>
                    {key.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">HTML Body</Label>
              <p className="text-xs text-gray-400 mb-1">Available variables: {"{{first_name}}"} {"{{email}}"} {"{{username}}"} {"{{user_type}}"}</p>
              <Textarea placeholder="<h2>Hello {{first_name}}!</h2><p>Your email content here...</p>"
                rows={12} className="mt-1 font-mono text-xs"
                value={editCampaign?.htmlBody || ""} onChange={e => setEditCampaign(p => ({ ...p, htmlBody: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium">Schedule (optional)</Label>
              <Input type="datetime-local" className="mt-1"
                value={editCampaign?.scheduledAt?.slice(0, 16) || ""}
                onChange={e => setEditCampaign(p => ({ ...p, scheduledAt: e.target.value, status: e.target.value ? "scheduled" : "draft" }))} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setCampaignModal(false); setEditCampaign(null); }}>Cancel</Button>
            <Button onClick={handleSaveCampaign} disabled={createCampaign.isPending || updateCampaign.isPending} className="bg-purple-600 hover:bg-purple-700">
              {editCampaign?.id ? "Update" : "Create"} Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────── TEMPLATE MODAL ─────────────── */}
      <Dialog open={templateModal} onOpenChange={v => { if (!v) { setTemplateModal(false); setEditTemplate(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTemplate?.id ? "Edit Template" : "New Email Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Template Name</Label>
                <Input placeholder="Welcome Email — Creator" className="mt-1"
                  value={editTemplate?.name || ""} onChange={e => setEditTemplate(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Category</Label>
                <Select value={editTemplate?.category || "general"} onValueChange={v => setEditTemplate(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TEMPLATE_CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Subject</Label>
              <Input className="mt-1" value={editTemplate?.subject || ""} onChange={e => setEditTemplate(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium">HTML Body</Label>
              <Textarea rows={14} className="mt-1 font-mono text-xs"
                value={editTemplate?.htmlBody || ""} onChange={e => setEditTemplate(p => ({ ...p, htmlBody: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!editTemplate?.isActive} onCheckedChange={v => setEditTemplate(p => ({ ...p, isActive: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setTemplateModal(false); setEditTemplate(null); }}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending} className="bg-purple-600 hover:bg-purple-700">
              {editTemplate?.id ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────── AUTO-RESPONDER MODAL ─────────────── */}
      <Dialog open={arModal} onOpenChange={v => { if (!v) { setArModal(false); setEditAr(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAr?.id ? "Edit Auto-Responder" : "New Auto-Responder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Name</Label>
              <Input placeholder="Welcome Email for Creators" className="mt-1"
                value={editAr?.name || ""} onChange={e => setEditAr(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium">Trigger Event</Label>
                <Select value={editAr?.trigger || "signup"} onValueChange={v => setEditAr(p => ({ ...p, trigger: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Delay (minutes)</Label>
                <Input type="number" placeholder="0" className="mt-1"
                  value={editAr?.triggerDelay ?? 0} onChange={e => setEditAr(p => ({ ...p, triggerDelay: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">Target Users</Label>
                <Select value={editAr?.targetUserType || "all"} onValueChange={v => setEditAr(p => ({ ...p, targetUserType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="creator">Creators</SelectItem>
                    <SelectItem value="brand">Brands</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Email Subject</Label>
              <Input className="mt-1" value={editAr?.subject || ""} onChange={e => setEditAr(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-medium">HTML Body</Label>
              <p className="text-xs text-gray-400 mb-1">Variables: {"{{first_name}}"} {"{{email}}"} {"{{user_type}}"}</p>
              <Textarea rows={12} className="mt-1 font-mono text-xs"
                value={editAr?.htmlBody || ""} onChange={e => setEditAr(p => ({ ...p, htmlBody: e.target.value }))} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={!!editAr?.isActive} onCheckedChange={v => setEditAr(p => ({ ...p, isActive: v }))} />
                <Label className="text-xs">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editAr?.aiGenerated} onCheckedChange={v => setEditAr(p => ({ ...p, aiGenerated: v }))} />
                <Label className="text-xs">AI Generated</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setArModal(false); setEditAr(null); }}>Cancel</Button>
            <Button onClick={handleSaveAr} disabled={createAr.isPending || updateAr.isPending} className="bg-purple-600 hover:bg-purple-700">
              {editAr?.id ? "Update" : "Create"} Auto-Responder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────── CAMPAIGN PREVIEW ─────────────── */}
      <Dialog open={!!campaignPreview} onOpenChange={v => { if (!v) setCampaignPreview(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Preview — {campaignPreview?.name}</DialogTitle>
          </DialogHeader>
          {campaignPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Sent", val: campaignPreview.sent },
                  { label: "Open Rate", val: openRate(campaignPreview.opened, campaignPreview.sent) },
                  { label: "Click Rate", val: clickRate(campaignPreview.clicked, campaignPreview.sent) },
                  { label: "Bounced", val: campaignPreview.bounced },
                  { label: "Unsubscribed", val: campaignPreview.unsubscribed },
                  { label: "Total Recipients", val: campaignPreview.totalRecipients },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{s.val}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="border rounded-lg p-4 bg-white">
                <p className="text-xs font-medium text-gray-500 mb-1">Subject:</p>
                <p className="font-semibold text-gray-900 mb-4">{campaignPreview.subject}</p>
                <div className="border-t pt-4">
                  <iframe srcDoc={campaignPreview.htmlBody} className="w-full h-96 border-0" title="Email Preview" />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─────────────── BLAST CONFIRM ─────────────── */}
      <Dialog open={!!blastConfirm} onOpenChange={v => { if (!v) setBlastConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Campaign Blast</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">This will send the email campaign to all users in the selected segment. This action cannot be undone.</p>
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Make sure your SMTP is configured and tested before sending.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlastConfirm(null)}>Cancel</Button>
            <Button onClick={() => blastConfirm && sendCampaign.mutate(blastConfirm)} disabled={sendCampaign.isPending} className="bg-green-600 hover:bg-green-700 gap-1">
              <Send className="h-4 w-4" />{sendCampaign.isPending ? "Sending…" : "Send Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
