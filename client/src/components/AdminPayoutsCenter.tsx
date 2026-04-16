import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AdminConversationDrawer } from "./AdminConversationDrawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign, Clock, CheckCircle, XCircle, AlertTriangle,
  MessageSquare, Eye, Send, Briefcase, Users, Filter,
  Hash, Wallet, Network, Calendar, Search, RefreshCw,
  ShieldCheck, TrendingUp, ArrowRight, ExternalLink, Copy,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" /> },
};

const NETWORK_LABELS: Record<string, string> = {
  tron: "USDT-TRC20 (Tron)",
  bsc: "USDT-BEP20 (BSC)",
  ton: "USDT (TON)",
  erc20: "USDT-ERC20 (Ethereum)",
};

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

function copyToClipboard(text: string, label: string, toast: any) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: `Copied ${label}` });
  });
}

interface ProcessForm {
  status: "processing" | "completed" | "rejected";
  adminNotes: string;
  transactionHash: string;
}

export function AdminPayoutsCenter() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [processForm, setProcessForm] = useState<ProcessForm>({ status: "completed", adminNotes: "", transactionHash: "" });
  const [conversationDrawer, setConversationDrawer] = useState<{ open: boolean; type: "campaign" | "direct_hire"; id: string; title: string } | null>(null);

  const { data: payouts = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/payouts"],
    queryFn: () => fetch("/api/admin/payouts").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const processMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: ProcessForm }) =>
      apiRequest("PATCH", `/api/admin/payouts/${id}`, form).then((r) => r.json()),
    onSuccess: (data) => {
      toast({ title: "Payout updated", description: `Status changed to: ${data.status}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payout-requests"] });
      setSelectedPayout(null);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const messageMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiRequest("POST", `/api/payout-requests/${id}/messages`, { content }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
    },
  });

  const filtered = payouts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.user?.firstName?.toLowerCase().includes(q) ||
        p.user?.lastName?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q) ||
        p.walletAddress?.toLowerCase().includes(q) ||
        p.transactionHash?.toLowerCase().includes(q) ||
        p.campaign?.title?.toLowerCase().includes(q) ||
        p.directHire?.title?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    pending: payouts.filter((p) => p.status === "pending").length,
    processing: payouts.filter((p) => p.status === "processing").length,
    completed: payouts.filter((p) => p.status === "completed").length,
    rejected: payouts.filter((p) => p.status === "rejected").length,
    totalPaid: payouts.filter((p) => p.status === "completed").reduce((s, p) => s + parseFloat(p.amount || "0"), 0),
    pendingAmount: payouts.filter((p) => ["pending", "processing"].includes(p.status)).reduce((s, p) => s + parseFloat(p.amount || "0"), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
            Payout Operations Center
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Bank-level payout tracking · Full audit trail · Campaign-linked records</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Pending", value: stats.pending, icon: <Clock className="w-4 h-4" />, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
          { label: "Processing", value: stats.processing, icon: <RefreshCw className="w-4 h-4" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "Completed", value: stats.completed, icon: <CheckCircle className="w-4 h-4" />, color: "text-green-600 bg-green-50 border-green-200" },
          { label: "Rejected", value: stats.rejected, icon: <XCircle className="w-4 h-4" />, color: "text-red-600 bg-red-50 border-red-200" },
          { label: "Total Paid Out", value: `$${stats.totalPaid.toFixed(2)}`, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "Queued Amount", value: `$${stats.pendingAmount.toFixed(2)}`, icon: <DollarSign className="w-4 h-4" />, color: "text-violet-600 bg-violet-50 border-violet-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-2.5 ${s.color.split(" ").map(c => c.startsWith("bg-") || c.startsWith("border-") ? c : "").join(" ")}`}>
            <div className={`shrink-0 ${s.color.split(" ").find(c => c.startsWith("text-")) || ""}`}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-base font-black ${s.color.split(" ").find(c => c.startsWith("text-")) || "text-gray-900"}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Search by name, wallet, campaign..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {["all", "pending", "processing", "completed", "rejected"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Payout Table */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading payout records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No payout requests found</p>
          <p className="text-sm text-gray-400">Requests will appear here once influencers submit them</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payout) => {
            const cfg = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
            const hasCampaign = !!payout.campaign;
            const hasDirectHire = !!payout.directHire;
            return (
              <div key={payout.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden" data-testid={`card-payout-${payout.id}`}>
                <div className="flex items-start gap-4 p-4">
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={payout.user?.profileImageUrl} />
                    <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-sm">
                      {initials(payout.user?.firstName, payout.user?.lastName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {payout.user?.firstName} {payout.user?.lastName}
                          {payout.user?.creatorTier && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold">{payout.user.creatorTier}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{payout.user?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-lg font-black text-gray-900">${parseFloat(payout.amount || "0").toFixed(2)}</span>
                        <span className="text-xs text-gray-400">USDT</span>
                      </div>
                    </div>

                    {/* Wallet + Network */}
                    <div className="flex flex-wrap gap-3 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Wallet className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono truncate max-w-[180px]">{payout.walletAddress}</span>
                        <button onClick={() => copyToClipboard(payout.walletAddress, "wallet address", toast)} className="text-gray-400 hover:text-gray-600">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Network className="w-3 h-3 text-gray-400" />
                        {NETWORK_LABELS[payout.network] || payout.network}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {timeAgo(payout.createdAt)}
                      </div>
                    </div>

                    {/* Source linkage */}
                    {(hasCampaign || hasDirectHire) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Source:</span>
                        {hasCampaign && (
                          <button
                            onClick={() => setConversationDrawer({ open: true, type: "campaign", id: payout.campaign.id, title: payout.campaign.title })}
                            className="inline-flex items-center gap-1 text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 hover:bg-violet-100 transition-colors"
                          >
                            <Briefcase className="w-3 h-3" /> {payout.campaign.title}
                            <MessageSquare className="w-3 h-3 ml-0.5 text-violet-400" />
                          </button>
                        )}
                        {hasDirectHire && (
                          <button
                            onClick={() => setConversationDrawer({ open: true, type: "direct_hire", id: payout.directHire.id, title: payout.directHire.title })}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
                          >
                            <Users className="w-3 h-3" /> Direct Hire: {payout.directHire.title}
                            <MessageSquare className="w-3 h-3 ml-0.5 text-blue-400" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* TX hash */}
                    {payout.transactionHash && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                        <Hash className="w-3 h-3 text-green-500" />
                        <span className="font-mono truncate">{payout.transactionHash}</span>
                        <button onClick={() => copyToClipboard(payout.transactionHash, "TX hash", toast)} className="text-green-400 hover:text-green-600">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Admin notes */}
                    {payout.adminNotes && (
                      <p className="mt-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg italic">"{payout.adminNotes}"</p>
                    )}

                    {/* Processed by */}
                    {payout.processedByUser && payout.processedAt && (
                      <p className="mt-1 text-[10px] text-gray-400">
                        Processed by {payout.processedByUser.firstName} {payout.processedByUser.lastName} · {new Date(payout.processedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span>ID: <span className="font-mono">{payout.id.slice(0, 8)}…</span></span>
                    {payout.messageCount > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-500">
                        <MessageSquare className="w-3 h-3" /> {payout.messageCount} message{payout.messageCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(hasCampaign || hasDirectHire) && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50"
                        onClick={() => setConversationDrawer({ open: true, type: hasCampaign ? "campaign" : "direct_hire", id: (payout.campaign?.id || payout.directHire?.id), title: (payout.campaign?.title || payout.directHire?.title) })}>
                        <MessageSquare className="w-3 h-3" /> View Conversation
                      </Button>
                    )}
                    <Button size="sm" className="h-7 text-xs gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => { setSelectedPayout(payout); setProcessForm({ status: "completed", adminNotes: "", transactionHash: "" }); }}
                      disabled={["completed", "rejected"].includes(payout.status)}
                      data-testid={`button-process-payout-${payout.id}`}
                    >
                      <Eye className="w-3 h-3" />
                      {["completed", "rejected"].includes(payout.status) ? "Finalized" : "Process Payout"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Process Payout Dialog */}
      {selectedPayout && (
        <Dialog open={!!selectedPayout} onOpenChange={(o) => { if (!o) setSelectedPayout(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-600" />
                Process Payout Request
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Requester info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                    {initials(selectedPayout.user?.firstName, selectedPayout.user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm">{selectedPayout.user?.firstName} {selectedPayout.user?.lastName}</p>
                  <p className="text-xs text-gray-500">{selectedPayout.user?.email}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-black text-gray-900">${parseFloat(selectedPayout.amount || "0").toFixed(2)}</p>
                  <p className="text-xs text-gray-400">USDT</p>
                </div>
              </div>

              {/* Payment details */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <Wallet className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Destination Wallet</p>
                    <p className="font-mono text-xs break-all text-gray-900">{selectedPayout.walletAddress}</p>
                  </div>
                  <button onClick={() => copyToClipboard(selectedPayout.walletAddress, "wallet", toast)} className="ml-auto text-gray-400 hover:text-gray-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Network className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Network</p>
                    <p className="text-xs font-semibold text-gray-900">{NETWORK_LABELS[selectedPayout.network] || selectedPayout.network}</p>
                  </div>
                </div>
              </div>

              {/* Source */}
              {(selectedPayout.campaign || selectedPayout.directHire) && (
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 text-sm">
                  <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Payout Source
                  </p>
                  {selectedPayout.campaign && (
                    <p className="text-xs text-gray-700">Campaign: <span className="font-semibold">{selectedPayout.campaign.title}</span></p>
                  )}
                  {selectedPayout.directHire && (
                    <p className="text-xs text-gray-700">Direct Hire: <span className="font-semibold">{selectedPayout.directHire.title}</span> · Brand: {selectedPayout.directHire.brand?.companyName || selectedPayout.directHire.brand?.firstName}</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Action */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(["processing", "completed", "rejected"] as const).map((s) => (
                    <button key={s}
                      onClick={() => setProcessForm((f) => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${processForm.status === s
                        ? s === "completed" ? "bg-green-500 border-green-500 text-white"
                          : s === "rejected" ? "bg-red-500 border-red-500 text-white"
                            : "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}>
                      {s === "completed" ? "✅ Approve & Complete" : s === "rejected" ? "❌ Reject & Refund" : "⏳ Mark Processing"}
                    </button>
                  ))}
                </div>

                {processForm.status === "completed" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-green-500" />
                      Transaction Hash <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter blockchain TX hash (required for approval)"
                      value={processForm.transactionHash}
                      onChange={(e) => setProcessForm((f) => ({ ...f, transactionHash: e.target.value }))}
                      className="font-mono text-xs"
                      data-testid="input-tx-hash"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Admin Notes {processForm.status === "rejected" && <span className="text-red-500">*</span>}</label>
                  <Textarea
                    placeholder={processForm.status === "rejected" ? "Reason for rejection (required)" : "Optional notes for influencer..."}
                    value={processForm.adminNotes}
                    onChange={(e) => setProcessForm((f) => ({ ...f, adminNotes: e.target.value }))}
                    className="text-sm min-h-[80px]"
                    data-testid="input-admin-notes"
                  />
                </div>
              </div>

              {/* Thread messages preview */}
              {selectedPayout.messages && selectedPayout.messages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Payout Thread ({selectedPayout.messages.length} messages)
                  </p>
                  <ScrollArea className="h-28 border rounded-xl bg-gray-50 px-3 py-2">
                    {selectedPayout.messages.map((m: any) => (
                      <div key={m.id} className="text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">
                        <span className="font-semibold text-gray-500">{m.senderId === selectedPayout.userId ? "Influencer" : "Admin"}:</span>{" "}
                        {m.content}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedPayout(null)}>Cancel</Button>
              <Button
                onClick={() => processMutation.mutate({ id: selectedPayout.id, form: processForm })}
                disabled={processMutation.isPending || (processForm.status === "completed" && !processForm.transactionHash) || (processForm.status === "rejected" && !processForm.adminNotes)}
                className={`gap-2 ${processForm.status === "completed" ? "bg-green-600 hover:bg-green-700" : processForm.status === "rejected" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
                data-testid="button-confirm-process"
              >
                {processMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {processMutation.isPending ? "Processing..." :
                  processForm.status === "completed" ? "Confirm & Complete Payout" :
                    processForm.status === "rejected" ? "Reject & Refund Balance" : "Mark as Processing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Conversation Drawer */}
      {conversationDrawer && (
        <AdminConversationDrawer
          open={conversationDrawer.open}
          onClose={() => setConversationDrawer(null)}
          type={conversationDrawer.type}
          id={conversationDrawer.id}
          title={conversationDrawer.title}
        />
      )}
    </div>
  );
}
