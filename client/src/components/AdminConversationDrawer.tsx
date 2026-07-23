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
import {
  MessageSquare, Users, ExternalLink, Shield,
  AlertTriangle, Briefcase, Send, Loader2,
  FileText, DollarSign, Calendar, CheckCircle,
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
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    active: { label: "Active", className: "bg-green-100 text-green-800" },
    completed: { label: "Completed", className: "bg-blue-100 text-blue-800" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700" },
    work_submitted: { label: "Work Submitted", className: "bg-purple-100 text-purple-800" },
    payment_submitted: { label: "Payment Submitted", className: "bg-indigo-100 text-indigo-800" },
    accepted: { label: "Accepted", className: "bg-teal-100 text-teal-800" },
    approved: { label: "Approved", className: "bg-green-100 text-green-800" },
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
          <span className="text-xs font-bold text-gray-900">{msg.sender?.firstName} {msg.sender?.lastName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isSenderAdmin ? "bg-purple-100 text-purple-700" : isSenderBrand ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
            {senderLabel}
          </span>
          <span className="text-[10px] text-gray-400">{msg.createdAt ? timeAgo(msg.createdAt) : ""}</span>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    </div>
  );
}

export function AdminConversationDrawer({ open, onClose, type, id, title, isDevHire }: Props) {
  const [activeTab, setActiveTab] = useState("messages");
  const [msgText, setMsgText] = useState("");
  const [invoiceForm, setInvoiceForm] = useState({ agreedBudget: "", dueDate: "", note: "" });
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

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

  // Reset invoice success when offer changes
  useEffect(() => {
    setInvoiceSuccess(false);
    setInvoiceForm({ agreedBudget: "", dueDate: "", note: "" });
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
    },
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

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b bg-gray-50">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type === "campaign" ? "bg-violet-100" : "bg-blue-100"}`}>
              {type === "campaign" ? <Briefcase className="w-5 h-5 text-violet-600" /> : <Users className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-bold text-gray-900 truncate">
                {title || (type === "campaign" ? campaign?.title : offer?.title) || "Conversation Thread"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-2 py-0">
                  {type === "campaign" ? "Campaign Thread" : isDevHire ? "Dev Hire Thread" : "Direct Hire Thread"}
                </Badge>
                {(campaign?.status || offer?.status) && <StatusBadge status={campaign?.status || offer?.status} />}
                {offer?.invoiceNumber && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0">
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
            <TabsList className={`mx-4 mt-3 mb-0 h-8 ${isDevHire ? "grid grid-cols-3" : "grid grid-cols-2"}`}>
              <TabsTrigger value="messages" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" /> Messages ({messages.length})
              </TabsTrigger>
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
                <div className="border-t bg-white px-4 py-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Reply to client..."
                      className="flex-1 text-sm"
                      disabled={sendMsgMutation.isPending}
                    />
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={!msgText.trim() || sendMsgMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 px-3"
                    >
                      {sendMsgMutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400">Press Enter to send · Replies appear in the client's Dev Projects tab</p>
                </div>
              )}
            </TabsContent>

            {/* ── Invoice Tab (dev hire only) ── */}
            {isDevHire && (
              <TabsContent value="invoice" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full">
                  <div className="px-4 py-4 space-y-4">
                    {/* Existing invoice info */}
                    {offer?.invoiceNumber ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <p className="font-semibold text-emerald-800">Invoice Generated</p>
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
                        <p className="text-xs text-emerald-700 mt-1">The client has been notified and can view/print this invoice from their project page.</p>
                      </div>
                    ) : invoiceSuccess ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="font-semibold text-emerald-800">Invoice sent to client!</p>
                        <p className="text-xs text-emerald-700 mt-1">A notification and chat message have been sent. The client can view and print the invoice from their project page.</p>
                      </div>
                    ) : null}

                    {/* Generate / re-generate invoice form */}
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-violet-600" />
                        <p className="font-semibold text-gray-900">
                          {offer?.invoiceNumber ? "Re-generate Invoice" : "Generate Invoice"}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Generating an invoice will notify the client and post a message in the project chat. The offer status moves to "accepted" so payment gates open.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1.5">
                            <DollarSign className="w-3 h-3" /> Agreed Budget (USD)
                          </label>
                          <Input
                            type="number"
                            placeholder={`e.g. ${offer?.budget || "1500"}`}
                            value={invoiceForm.agreedBudget}
                            onChange={e => setInvoiceForm(f => ({ ...f, agreedBudget: e.target.value }))}
                            className="text-sm"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">Leave blank to use the original budget estimate</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1.5">
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
                          <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-1.5">
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
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Campaign Participants</div>
                      {participations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No participants yet</div>
                      ) : participations.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                              {initials(p.user?.firstName, p.user?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{p.user?.firstName} {p.user?.lastName}</p>
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
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {isDevHire ? "Dev Hire Parties" : "Direct Hire Parties"}
                      </div>
                      {[
                        { label: isDevHire ? "Client" : "Brand", data: offer?.brand, color: "bg-blue-100 text-blue-700" },
                        { label: isDevHire ? "Developer" : "Influencer", data: offer?.influencer, color: "bg-purple-100 text-purple-700" },
                      ].map(({ label, data, color }) => (
                        <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className={`${color} text-xs font-bold`}>
                              {initials(data?.firstName, data?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {data?.firstName} {data?.lastName}
                              {data?.companyName ? ` (${data.companyName})` : ""}
                            </p>
                            <p className="text-xs text-gray-500">{data?.email}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
                        </div>
                      ))}
                      {offer && (
                        <div className="mt-4 p-3 bg-violet-50 rounded-xl border border-violet-100 space-y-2">
                          <p className="text-xs font-semibold text-violet-700">Project Details</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div><span className="text-gray-400">Budget:</span> <strong>${parseFloat(offer.agreedBudget || offer.budget || 0).toFixed(2)}</strong></div>
                            <div><span className="text-gray-400">Status:</span> <StatusBadge status={offer.status} /></div>
                            {offer.deadline && <div><span className="text-gray-400">Deadline:</span> {new Date(offer.deadline).toLocaleDateString()}</div>}
                            {offer.invoiceNumber && <div><span className="text-gray-400">Invoice:</span> <strong className="text-emerald-700">{offer.invoiceNumber}</strong></div>}
                          </div>
                          {offer.description && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Description:</p>
                              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{offer.description}</p>
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
