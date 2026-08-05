import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Users, ExternalLink, Shield,
  AlertTriangle, Briefcase, Send, Loader2,
  FileText, DollarSign, Calendar, CheckCircle,
  Mail, Phone, MessageCircle, Zap, Copy, Check,
  ChevronDown, ChevronUp,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "campaign" | "direct_hire";
  id: string | null;
  title?: string;
  isDevHire?: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(first?: string, last?: string) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
    active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    completed: { label: "Completed", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700" },
    work_submitted: { label: "Work Submitted", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
    payment_submitted: { label: "Payment Submitted", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
    accepted: { label: "Accepted", className: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
    approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  };
  const s = map[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

function MessageBubble({ msg }: { msg: any }) {
  const isSenderAdmin = msg.sender?.userType === "admin";
  const isSenderBrand = msg.sender?.userType === "brand";
  const senderLabel = isSenderAdmin ? "Admin/Dev" : isSenderBrand ? "Brand" : "User";

  return (
    <div className="flex gap-3 group py-2">
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className={`text-xs font-bold ${isSenderAdmin ? "bg-purple-100 text-purple-700" : isSenderBrand ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
          {initials(msg.sender?.firstName, msg.sender?.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{msg.sender?.firstName} {msg.sender?.lastName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isSenderAdmin ? "bg-purple-100 text-purple-700" : isSenderBrand ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
            {senderLabel}
          </span>
          <span className="text-[10px] text-gray-400">{msg.createdAt ? timeAgo(msg.createdAt) : ""}</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// ── Quick email templates ──────────────────────────────────────────────────────
const EMAIL_TEMPLATES = [
  {
    label: "📋 Project Received",
    subject: "Your project request has been received — Taskdrip Dev Team",
    body: `Hi {name},

Thank you for submitting your project request through Taskdrip! We've reviewed your requirements and our dev team is on it.

We'll get back to you within 24 hours with a detailed quote and timeline. In the meantime, feel free to reply to this email or message us in-app if you have questions.

Best,
Taskdrip Dev Team`,
  },
  {
    label: "💰 Invoice Ready",
    subject: "Your Invoice is Ready — {title}",
    body: `Hi {name},

Your invoice for "{title}" has been generated and is ready for review.

You can view, download, and print the invoice directly from your project page. Once you've reviewed it, please proceed with the payment as outlined.

Need help? Reply here or chat with us in-app anytime.

Best,
Taskdrip Dev Team`,
  },
  {
    label: "🚀 Project Started",
    subject: "Development has started on your project!",
    body: `Hi {name},

Great news — your payment has been confirmed and development on "{title}" has officially started!

We'll keep you updated on progress through the project chat. Feel free to drop questions or feedback there anytime.

Estimated timeline: as discussed in our quote.

Best,
Taskdrip Dev Team`,
  },
  {
    label: "🔄 Update Needed",
    subject: "We need more info about your project",
    body: `Hi {name},

We're making progress on "{title}" and have a few questions to keep things moving.

Could you please clarify:
- [Add your question here]

You can reply directly to this email or message us in the project chat.

Best,
Taskdrip Dev Team`,
  },
  {
    label: "✅ Project Delivered",
    subject: "Your project is ready for review!",
    body: `Hi {name},

We're excited to let you know that "{title}" is complete and ready for your review!

Please check the delivered work on your project page and let us know if anything needs adjustment. Once you're happy, you can mark it as complete.

It's been a pleasure working with you!

Best,
Taskdrip Dev Team`,
  },
];

function applyTemplate(template: typeof EMAIL_TEMPLATES[number], offer: any, brand: any) {
  const name = [brand?.firstName, brand?.lastName].filter(Boolean).join(" ") || "there";
  const title = offer?.title || "your project";
  return {
    subject: template.subject.replace(/{name}/g, name).replace(/{title}/g, title),
    body: template.body.replace(/{name}/g, name).replace(/{title}/g, title),
  };
}

// ── Reach-Out Tab ─────────────────────────────────────────────────────────────
function ReachOutTab({
  id, offer, isDevHire,
}: {
  id: string;
  offer: any;
  isDevHire: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const brand = offer?.brand;
  const phone = brand?.whatsapp || brand?.phone;
  const email = brand?.contactEmail || brand?.email;
  const telegram = brand?.telegram;
  const preferredContact = brand?.preferredContact;

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [alsoPostInChat, setAlsoPostInChat] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const sendEmailMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/direct-hire/${id}/send-email`, {
        subject: emailSubject,
        body: emailBody,
        alsoPostInChat,
      }).then(r => r.json()),
    onSuccess: (data) => {
      toast({ title: "Email sent ✅", description: `Delivered to ${data.to} via ${data.provider}` });
      setEmailSubject("");
      setEmailBody("");
      if (alsoPostInChat) qc.invalidateQueries({ queryKey: ["/api/admin/direct-hire", id, "thread"] });
    },
    onError: (e: any) => toast({ title: "Email failed", description: e.message, variant: "destructive" }),
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const waLink = phone
    ? `https://wa.me/${phone.replace(/[^\d+]/g, "").replace(/^\+/, "")}`
    : null;

  const telegramLink = telegram
    ? `https://t.me/${telegram.replace(/^@/, "")}`
    : null;

  return (
    <ScrollArea className="h-full">
      <div className="px-4 py-4 space-y-5">

        {/* ── Contact Quick Actions ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Client Contact
          </p>
          {preferredContact && (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-1.5">
              ⭐ Preferred: {preferredContact}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            {/* Email */}
            {email && (
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <Mail className="w-4 h-4 text-violet-500 shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{email}</span>
                <button
                  onClick={() => copyToClipboard(email, "email")}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {copied === "email" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`mailto:${email}`}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                  target="_blank" rel="noopener noreferrer"
                >
                  Open
                </a>
              </div>
            )}
            {/* WhatsApp */}
            {phone && (
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{phone}</span>
                <button
                  onClick={() => copyToClipboard(phone, "phone")}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {copied === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </a>
                )}
              </div>
            )}
            {/* Telegram */}
            {telegram && (
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <Send className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">@{telegram.replace(/^@/, "")}</span>
                {telegramLink && (
                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                  >
                    Open
                  </a>
                )}
              </div>
            )}
            {!email && !phone && !telegram && (
              <div className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                No contact details on record.
                <br />Check the description tab for info submitted in the form.
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ── Email Composer ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-violet-500" /> Send Email via Resend
            </p>
            <button
              onClick={() => setTemplateOpen(o => !o)}
              className="inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
            >
              <Zap className="w-3 h-3" /> Templates
              {templateOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Template picker */}
          {templateOpen && (
            <div className="space-y-1.5 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50 rounded-xl p-3">
              <p className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold mb-2">Click to load template</p>
              {EMAIL_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    const applied = applyTemplate(t, offer, brand);
                    setEmailSubject(applied.subject);
                    setEmailBody(applied.body);
                    setTemplateOpen(false);
                  }}
                  className="w-full text-left text-xs bg-white dark:bg-gray-800 border border-violet-100 dark:border-violet-800/50 rounded-lg px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 transition-all font-medium text-gray-700 dark:text-gray-300"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {email && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-1.5">
                To: <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
                {brand?.firstName && <span className="ml-1">({[brand.firstName, brand.lastName].filter(Boolean).join(" ")})</span>}
              </div>
            )}
            <Input
              placeholder="Subject"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Write your message here…"
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              rows={7}
              className="text-sm resize-none font-mono"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="also-post-in-chat"
              checked={alsoPostInChat}
              onCheckedChange={setAlsoPostInChat}
            />
            <Label htmlFor="also-post-in-chat" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              Also post in project chat
            </Label>
          </div>

          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            onClick={() => sendEmailMutation.mutate()}
            disabled={!emailSubject.trim() || !emailBody.trim() || sendEmailMutation.isPending || !email}
          >
            {sendEmailMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              : <><Mail className="w-4 h-4 mr-2" /> Send Email</>}
          </Button>
          {!email && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
              ⚠️ No email address on file for this client.
            </p>
          )}
          {sendEmailMutation.isError && (
            <p className="text-xs text-red-600 text-center">Failed to send. Try again or use a manual method.</p>
          )}
          {sendEmailMutation.isSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center flex items-center justify-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Email sent successfully!
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AdminConversationDrawer({ open, onClose, type, id, title, isDevHire }: Props) {
  const [activeTab, setActiveTab] = useState("messages");
  const [msgText, setMsgText] = useState("");
  const [invoiceForm, setInvoiceForm] = useState({ agreedBudget: "", dueDate: "", note: "" });
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: campaignThread, isLoading: loadingCampaign } = useQuery<any>({
    queryKey: ["/api/admin/campaigns", id, "thread"],
    queryFn: () => fetch(`/api/admin/campaigns/${id}/thread`).then((r) => r.json()),
    enabled: open && type === "campaign" && !!id,
  });

  const { data: dhThread, isLoading: loadingDH, refetch: refetchDH } = useQuery<any>({
    queryKey: ["/api/admin/direct-hire", id, "thread"],
    queryFn: () => fetch(`/api/admin/direct-hire/${id}/thread`).then((r) => r.json()),
    enabled: open && type === "direct_hire" && !!id,
    refetchInterval: open && type === "direct_hire" ? 8000 : false,
  });

  const isLoading = type === "campaign" ? loadingCampaign : loadingDH;
  const thread = type === "campaign" ? campaignThread : dhThread;

  const messages = (thread?.messages || []).sort((a: any, b: any) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const participations = thread?.participations || [];
  const campaign = thread?.campaign;
  const offer = thread?.offer;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages.length]);

  // Reset invoice success and form when offer changes
  useEffect(() => {
    setInvoiceSuccess(false);
    setInvoiceForm({ agreedBudget: "", dueDate: "", note: "" });
    setActiveTab("messages");
  }, [id]);

  // Send message mutation
  const sendMsgMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/direct-hire/${id}/messages`, { content: msgText }).then(r => r.json()),
    onSuccess: () => {
      setMsgText("");
      refetchDH();
      qc.invalidateQueries({ queryKey: ["/api/admin/direct-hire"] });
    },
    onError: (e: any) => toast({ title: "Failed to send message", description: e.message, variant: "destructive" }),
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/direct-hire/${id}/generate-invoice`, {
        agreedBudget: invoiceForm.agreedBudget || undefined,
        invoiceDueDate: invoiceForm.dueDate || undefined,
        invoiceNote: invoiceForm.note || undefined,
      }).then(r => r.json()),
    onSuccess: () => {
      setInvoiceSuccess(true);
      refetchDH();
      qc.invalidateQueries({ queryKey: ["/api/admin/direct-hire"] });
      qc.invalidateQueries({ queryKey: ["/api/hire-developer/my-requests"] });
      toast({ title: "Invoice sent ✅", description: "Client has been notified." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSend = () => {
    const txt = msgText.trim();
    if (!txt || sendMsgMutation.isPending) return;
    sendMsgMutation.mutate();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Tab count for display
  const tabCount = isDevHire ? 4 : 2;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b bg-gray-50 dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type === "campaign" ? "bg-violet-100 dark:bg-violet-900/40" : "bg-blue-100 dark:bg-blue-900/40"}`}>
              {type === "campaign" ? <Briefcase className="w-5 h-5 text-violet-600" /> : <Users className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {title || (type === "campaign" ? campaign?.title : offer?.title) || "Conversation Thread"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-2 py-0">
                  {type === "campaign" ? "Campaign Thread" : isDevHire ? "Dev Hire Thread" : "Direct Hire Thread"}
                </Badge>
                {(campaign?.status || offer?.status) && <StatusBadge status={campaign?.status || offer?.status} />}
                {offer?.invoiceNumber && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] px-2 py-0">
                    🧾 {offer.invoiceNumber}
                  </Badge>
                )}
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-400" /> Admin View
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading thread...</p>
            </div>
          </div>
        ) : !thread ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No thread data found</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className={`mx-4 mt-3 mb-0 h-8 grid grid-cols-${tabCount}`}>
              <TabsTrigger value="messages" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" /> Chat ({messages.length})
              </TabsTrigger>
              {isDevHire && (
                <TabsTrigger value="reach-out" className="text-xs">
                  <Mail className="w-3 h-3 mr-1" /> Reach Out
                </TabsTrigger>
              )}
              {isDevHire && (
                <TabsTrigger value="invoice" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" /> Invoice
                  {offer?.invoiceNumber && <span className="ml-1 text-emerald-600">✓</span>}
                </TabsTrigger>
              )}
              <TabsTrigger value="participants" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {type === "campaign" ? `Participants (${participations.length})` : "Details"}
              </TabsTrigger>
            </TabsList>

            {/* ── Messages Tab ── */}
            <TabsContent value="messages" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1">
                <div className="px-4 py-3 space-y-1">
                  {messages.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-400">
                      <MessageSquare className="w-10 h-10 opacity-30" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs text-gray-400">Start the conversation below</p>
                    </div>
                  ) : (
                    messages.map((msg: any, i: number) => {
                      const prevMsg = messages[i - 1];
                      const showDateDivider = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
                      return (
                        <div key={msg.id}>
                          {showDateDivider && (
                            <div className="flex items-center gap-3 my-3">
                              <Separator className="flex-1" />
                              <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <Separator className="flex-1" />
                            </div>
                          )}
                          <MessageBubble msg={msg} />
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Message input — only for direct hire threads */}
              {type === "direct_hire" && (
                <div className="border-t bg-white dark:bg-gray-900 px-4 py-3 space-y-2">
                  <div className="flex gap-2">
                    <Textarea
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Reply to client… (Enter to send, Shift+Enter for newline)"
                      className="flex-1 text-sm min-h-[60px] max-h-[120px] resize-none"
                      disabled={sendMsgMutation.isPending}
                    />
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={!msgText.trim() || sendMsgMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 px-3 self-end"
                    >
                      {sendMsgMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">Replies appear in client's Dev Projects tab</p>
                    {isDevHire && (
                      <button
                        onClick={() => setActiveTab("reach-out")}
                        className="text-[10px] text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 font-medium flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" /> Send email or WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Reach Out Tab (dev hire only) ── */}
            {isDevHire && id && (
              <TabsContent value="reach-out" className="flex-1 overflow-hidden mt-0">
                <ReachOutTab id={id} offer={offer} isDevHire={!!isDevHire} />
              </TabsContent>
            )}

            {/* ── Invoice Tab (dev hire only) ── */}
            {isDevHire && (
              <TabsContent value="invoice" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full">
                  <div className="px-4 py-4 space-y-4">
                    {/* Existing invoice info */}
                    {offer?.invoiceNumber ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <p className="font-semibold text-emerald-800 dark:text-emerald-300">Invoice Generated</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Number:</span> <strong>{offer.invoiceNumber}</strong></div>
                          <div><span className="text-gray-500">Amount:</span> <strong>${parseFloat(offer.agreedBudget || offer.budget || 0).toFixed(2)}</strong></div>
                          {offer.invoiceDueDate && (
                            <div><span className="text-gray-500">Due:</span> {new Date(offer.invoiceDueDate).toLocaleDateString()}</div>
                          )}
                          {offer.invoiceNote && (
                            <div className="col-span-2"><span className="text-gray-500">Note:</span> {offer.invoiceNote}</div>
                          )}
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Client has been notified and can view/print from their project page.</p>
                      </div>
                    ) : invoiceSuccess ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300">Invoice sent to client!</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Notification and chat message sent. Client can view and print from project page.</p>
                      </div>
                    ) : null}

                    {/* Generate / re-generate invoice form */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-violet-600" />
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {offer?.invoiceNumber ? "Re-generate Invoice" : "Generate Invoice"}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Generating sends a notification + chat message to the client and moves status to "accepted" so payment gates open.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1.5">
                            <DollarSign className="w-3 h-3" /> Agreed Budget (USD)
                          </label>
                          <Input
                            type="number"
                            placeholder={`e.g. ${offer?.budget || "1500"}`}
                            value={invoiceForm.agreedBudget}
                            onChange={e => setInvoiceForm(f => ({ ...f, agreedBudget: e.target.value }))}
                            className="text-sm"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">Leave blank to use original budget estimate</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1.5">
                            <Calendar className="w-3 h-3" /> Invoice Due Date
                          </label>
                          <Input
                            type="date"
                            value={invoiceForm.dueDate}
                            onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1.5">
                            <MessageSquare className="w-3 h-3" /> Invoice Note (optional)
                          </label>
                          <Textarea
                            placeholder="e.g. Payment via USDT TRC-20. Contact us after transfer."
                            value={invoiceForm.note}
                            onChange={e => setInvoiceForm(f => ({ ...f, note: e.target.value }))}
                            rows={3}
                            className="text-sm resize-none"
                          />
                        </div>

                        <Button
                          className="w-full bg-violet-600 hover:bg-violet-700"
                          onClick={() => generateInvoiceMutation.mutate()}
                          disabled={generateInvoiceMutation.isPending}
                        >
                          {generateInvoiceMutation.isPending
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                            : <><FileText className="w-4 h-4 mr-2" /> {offer?.invoiceNumber ? "Re-generate Invoice" : "Generate & Send Invoice"}</>}
                        </Button>
                        {generateInvoiceMutation.isError && (
                          <p className="text-xs text-red-600 text-center">Failed to generate invoice. Try again.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            {/* ── Participants / Details Tab ── */}
            <TabsContent value="participants" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="px-4 py-3 space-y-3">
                  {type === "campaign" ? (
                    <>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Campaign Participants</div>
                      {participations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No participants yet</div>
                      ) : participations.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                              {initials(p.user?.firstName, p.user?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.user?.firstName} {p.user?.lastName}</p>
                            <p className="text-xs text-gray-500">{p.user?.email}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={p.status} />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        {isDevHire ? "Dev Hire Parties" : "Direct Hire Parties"}
                      </div>
                      {[
                        { label: isDevHire ? "Client" : "Brand", data: offer?.brand, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
                        { label: isDevHire ? "Developer" : "Influencer", data: offer?.influencer, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
                      ].map(({ label, data, color }) => (
                        <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className={`${color} text-xs font-bold`}>
                              {initials(data?.firstName, data?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {data?.firstName} {data?.lastName}
                              {data?.companyName ? ` (${data.companyName})` : ""}
                            </p>
                            <p className="text-xs text-gray-500">{data?.email}</p>
                            {label === (isDevHire ? "Client" : "Brand") && data?.phone && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">{data.phone}</p>
                            )}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
                        </div>
                      ))}
                      {offer && (
                        <div className="mt-4 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-800/50 space-y-2">
                          <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Project Details</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <div><span className="text-gray-400">Budget:</span> <strong className="text-gray-800 dark:text-gray-200">${parseFloat(offer.agreedBudget || offer.budget || 0).toFixed(2)}</strong></div>
                            <div><span className="text-gray-400">Status:</span> <StatusBadge status={offer.status} /></div>
                            {offer.deadline && <div><span className="text-gray-400">Deadline:</span> {new Date(offer.deadline).toLocaleDateString()}</div>}
                            {offer.invoiceNumber && <div><span className="text-gray-400">Invoice:</span> <strong className="text-emerald-700 dark:text-emerald-400">{offer.invoiceNumber}</strong></div>}
                          </div>
                          {offer.description && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Description:</p>
                              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{offer.description}</p>
                            </div>
                          )}
                          {offer.workSubmissionUrl && (
                            <a href={offer.workSubmissionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> View Submitted Work
                            </a>
                          )}
                          <a href={`/direct-hire/${offer.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline ml-4">
                            <ExternalLink className="w-3 h-3" /> Open Project Page
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
