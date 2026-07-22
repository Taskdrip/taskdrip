import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Package, KeyRound, Link2, GraduationCap, Briefcase, ShoppingBag,
  CheckCircle, Send, XCircle, Trash2, Eye, ExternalLink, Clock,
  RefreshCw, ReceiptText, ShieldCheck, ShieldX, MessageSquare,
  ChevronDown, ChevronUp, Copy, Hash, CreditCard, Tag, Info,
  AlertCircle, FileText, DollarSign,
} from "lucide-react";

type FormState = {
  downloadUrl: string;
  accessUrl: string;
  licenseKey: string;
  accessNotes: string;
  status: string;
};

const emptyForm: FormState = {
  downloadUrl: "",
  accessUrl: "",
  licenseKey: "",
  accessNotes: "",
  status: "delivered",
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 border-amber-200",
  paid:      "bg-blue-100 text-blue-700 border-blue-200",
  approved:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  delivered: "bg-purple-100 text-purple-700 border-purple-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  refunded:  "bg-gray-100 text-gray-600 border-gray-200",
  active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-purple-100 text-purple-700 border-purple-200",
  payment_submitted: "bg-blue-100 text-blue-700 border-blue-200",
  accepted:  "bg-cyan-100 text-cyan-700 border-cyan-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {status === "pending" && <Clock className="h-3 w-3" />}
      {status === "paid" && <ReceiptText className="h-3 w-3" />}
      {(status === "approved" || status === "delivered" || status === "active" || status === "completed") && <CheckCircle className="h-3 w-3" />}
      {status === "cancelled" && <XCircle className="h-3 w-3" />}
      {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
}

function CopyText({ value }: { value: string }) {
  const { toast } = useToast();
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copied!" }); }}
      className="ml-1 inline-flex items-center text-slate-400 hover:text-slate-200 transition-colors"
      title="Copy"
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

function chatUrl(userId?: string) {
  if (!userId) return "/messages";
  return `/messages?to=${userId}`;
}

export function OrderDeliveryAccessPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState("purchases");
  const [target, setTarget] = useState<{ kind: "purchase" | "enrollment" | "hire"; id: string; label: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Invoice state
  const [invoiceTarget, setInvoiceTarget] = useState<any | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ agreedBudget: "", invoiceDueDate: "", invoiceNote: "" });

  const { data: purchases = [], refetch: refetchPurchases, isError: purchasesError } = useQuery<any[]>({
    queryKey: ["/api/admin/purchases"],
    refetchInterval: 30_000,
  });
  const { data: enrollments = [], refetch: refetchEnrollments } = useQuery<any[]>({
    queryKey: ["/api/courses/admin/enrollments"],
    refetchInterval: 30_000,
  });
  const { data: hires = [], refetch: refetchHires, isError: hiresError } = useQuery<any[]>({
    queryKey: ["/api/admin/direct-hire"],
    refetchInterval: 30_000,
  });

  // Grant / deliver access
  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("No order selected");
      const url =
        target.kind === "purchase"   ? `/api/admin/purchases/${target.id}/deliver`
        : target.kind === "enrollment" ? `/api/admin/enrollments/${target.id}/grant`
        : `/api/admin/direct-hire/${target.id}/grant`;
      const body =
        target.kind === "purchase"   ? { ...form }
        : target.kind === "enrollment" ? { accessUrl: form.accessUrl, accessNotes: form.accessNotes, status: form.status === "delivered" ? "active" : form.status }
        : { adminNote: form.accessNotes, workSubmissionUrl: form.accessUrl, status: form.status === "delivered" ? "completed" : form.status };
      return (await apiRequest("PATCH", url, body)).json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "✅ Access granted", description: "Buyer has been notified with their access details." });
      setTarget(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Failed to grant access", description: e.message, variant: "destructive" }),
  });

  // Approve a purchase (mark as paid/approved)
  const approveMutation = useMutation({
    mutationFn: async (id: string) =>
      (await apiRequest("PATCH", `/api/admin/purchases/${id}/approve`)).json(),
    onSuccess: () => { invalidateAll(); toast({ title: "✅ Order approved", description: "Purchase has been approved." }); },
    onError: (e: any) => toast({ title: "Approval failed", description: e.message, variant: "destructive" }),
  });

  // Disapprove / cancel a purchase
  const disapproveMutation = useMutation({
    mutationFn: async (id: string) =>
      (await apiRequest("PATCH", `/api/admin/purchases/${id}/disapprove`)).json(),
    onSuccess: () => { invalidateAll(); toast({ title: "Order cancelled", description: "Purchase has been cancelled." }); },
    onError: (e: any) => toast({ title: "Disapproval failed", description: e.message, variant: "destructive" }),
  });

  // Delete a purchase
  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) =>
      (await apiRequest("DELETE", `/api/admin/purchases/${id}`)).json(),
    onSuccess: () => { invalidateAll(); toast({ title: "🗑️ Order deleted" }); },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  // Invoice generation mutation
  const invoiceMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceTarget) throw new Error("No hire selected");
      return (await apiRequest("POST", `/api/admin/direct-hire/${invoiceTarget.id}/generate-invoice`, {
        agreedBudget: invoiceForm.agreedBudget || invoiceTarget.budget,
        invoiceDueDate: invoiceForm.invoiceDueDate || null,
        invoiceNote: invoiceForm.invoiceNote || null,
      })).json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "✅ Invoice generated", description: "Client has been notified with invoice details." });
      setInvoiceTarget(null);
      setInvoiceForm({ agreedBudget: "", invoiceDueDate: "", invoiceNote: "" });
    },
    onError: (e: any) => toast({ title: "Invoice failed", description: e.message, variant: "destructive" }),
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/purchases"] });
    queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/direct-hire"] });
  }

  function openGrant(kind: "purchase" | "enrollment" | "hire", id: string, label: string, existing?: any) {
    setTarget({ kind, id, label });
    setForm({
      downloadUrl: existing?.downloadUrl || "",
      accessUrl: existing?.accessUrl || existing?.workSubmissionUrl || "",
      licenseKey: existing?.licenseKey || "",
      accessNotes: existing?.accessNotes || existing?.adminNote || "",
      status: kind === "hire" ? "completed" : kind === "enrollment" ? "active" : "delivered",
    });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Show ALL purchases and hires (no status filter — admin reviews everything)
  const allPurchases = purchases as any[];
  const allEnrollments = (enrollments as any[]).filter((e) => e.isPaid || e.status === "active");
  const allHires = hires as any[]; // Show ALL hires regardless of status

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-xl border border-white/10"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f2027 100%)",
      }}
    >
      {/* Decorative background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, #10b981 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, #6366f1 0%, transparent 40%)`,
        }}
      />

      {/* Header */}
      <div className="relative px-6 pt-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Package className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Order Delivery & Access Grants</h2>
          </div>
          <p className="text-sm text-slate-400 ml-14">
            Review shop orders and developer hires. Approve payments, grant download links, license keys, or private access URLs. Buyers are notified automatically.
          </p>
        </div>
        <button
          onClick={() => { refetchPurchases(); refetchEnrollments(); refetchHires(); }}
          className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Info banner about access grant flow */}
      <div className="relative mx-6 mb-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 flex gap-3 items-start">
        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300 leading-relaxed">
          <span className="font-semibold text-blue-200">How it works:</span> When a customer purchases a software, script, or hires a developer, their order appears here as <span className="font-semibold">Pending</span>.
          After confirming payment, click <span className="font-semibold">Approve</span> → complete setup/development → then use <span className="font-semibold">Grant Access</span> to deliver the download link, license key, or private access URL to the buyer.
          The buyer is notified automatically via their dashboard and notification inbox.
        </p>
      </div>

      {/* Stats bar */}
      <div className="relative mx-6 mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Shop Orders", count: allPurchases.length, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", error: purchasesError },
          { label: "Courses",     count: allEnrollments.length, icon: GraduationCap, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", error: false },
          { label: "Hires",       count: allHires.length, icon: Briefcase, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", error: hiresError },
        ].map(({ label, count, icon: Icon, color, bg, error }) => (
          <div key={label} className={`rounded-xl border p-3 flex items-center gap-3 ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <p className={`text-xl font-bold ${error ? "text-red-400" : color}`}>{error ? "!" : count}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="relative px-6 pb-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/10 border border-white/10 p-1 rounded-xl mb-4">
            <TabsTrigger value="purchases" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300 rounded-lg px-4">
              <ShoppingBag className="h-4 w-4 mr-1.5" /> Shop ({allPurchases.length})
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300 rounded-lg px-4">
              <GraduationCap className="h-4 w-4 mr-1.5" /> Courses ({allEnrollments.length})
            </TabsTrigger>
            <TabsTrigger value="hires" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300 rounded-lg px-4">
              <Briefcase className="h-4 w-4 mr-1.5" /> Hires ({allHires.length})
            </TabsTrigger>
          </TabsList>

          {/* ── SHOP PURCHASES ── */}
          <TabsContent value="purchases" className="space-y-3 mt-0">
            {purchasesError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Failed to load shop orders. Check server logs or database connection.
              </div>
            )}
            {!purchasesError && allPurchases.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No shop orders yet.</p>
                <p className="text-xs mt-1 text-slate-500">Orders from the shop will appear here when customers make a purchase.</p>
              </div>
            ) : allPurchases.map((p) => {
              const dd = (p.deliveryDetails || {}) as any;
              const granted = !!(dd.downloadUrl || dd.accessUrl || dd.licenseKey);
              const buyer = p.buyer || p.user || {};
              const buyerId = buyer.id || p.userId;
              const isOpen = expanded[p.id];
              const addons = (p.selectedAddons as any[]) || [];
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors"
                  data-testid={`row-purchase-${p.id}`}
                >
                  {/* Main row */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white text-sm truncate">
                            {p.product?.title || `Product ${String(p.productId || "").slice(0, 8)}`}
                          </p>
                          <StatusBadge status={p.status} />
                          {p.product?.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-700/60 text-slate-300 border border-white/10">
                              <Tag className="h-2.5 w-2.5" /> {p.product.category}
                            </span>
                          )}
                          {granted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="h-3 w-3" /> Access granted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <p className="text-xs text-slate-400">
                            Buyer: <span className="text-slate-300">{buyer.email || buyer.username || String(p.userId || "").slice(0, 8)}</span>
                          </p>
                          <span className="text-slate-600">·</span>
                          <p className="text-xs text-emerald-400 font-semibold">${p.totalAmount ?? p.amount}</p>
                          {p.paymentMethod && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <CreditCard className="h-3 w-3" /> {p.paymentMethod.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </>
                          )}
                          <span className="text-slate-600">·</span>
                          <p className="text-xs text-slate-500">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(p.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                        title={isOpen ? "Collapse details" : "View full details"}
                      >
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Expanded full details */}
                    {isOpen && (
                      <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-xs">
                        <p className="text-slate-200 font-semibold text-xs mb-1">📋 Full Order Details</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <div>
                            <span className="text-slate-500">Order ID</span>
                            <p className="text-slate-300 font-mono flex items-center gap-1 truncate">
                              {p.id} <CopyText value={p.id} />
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Product Type</span>
                            <p className="text-slate-300 capitalize">{p.product?.type || "—"}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Buyer Username</span>
                            <p className="text-slate-300">{buyer.username || "—"}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Buyer Email</span>
                            <p className="text-slate-300">{buyer.email || "—"}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Quantity</span>
                            <p className="text-slate-300">{p.quantity ?? 1}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Base Amount</span>
                            <p className="text-slate-300">${p.amount}</p>
                          </div>
                          {p.addonsTotal && parseFloat(p.addonsTotal) > 0 && (
                            <>
                              <div>
                                <span className="text-slate-500">Add-ons Total</span>
                                <p className="text-slate-300">${p.addonsTotal}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Total (with add-ons)</span>
                                <p className="text-emerald-400 font-semibold">${p.totalAmount}</p>
                              </div>
                            </>
                          )}
                          {p.transactionHash && (
                            <div className="col-span-2">
                              <span className="text-slate-500 flex items-center gap-1"><Hash className="h-3 w-3" /> TX Hash</span>
                              <p className="text-slate-300 font-mono break-all flex items-center gap-1">
                                {p.transactionHash} <CopyText value={p.transactionHash} />
                              </p>
                            </div>
                          )}
                          {p.paidAt && (
                            <div>
                              <span className="text-slate-500">Paid At</span>
                              <p className="text-slate-300">{new Date(p.paidAt).toLocaleString()}</p>
                            </div>
                          )}
                          {p.deliveredAt && (
                            <div>
                              <span className="text-slate-500">Delivered At</span>
                              <p className="text-slate-300">{new Date(p.deliveredAt).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        {addons.length > 0 && (
                          <div>
                            <span className="text-slate-500">Selected Add-ons</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {addons.map((a: any, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs">
                                  {a.title} (+${a.price})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {p.adminNotes && (
                          <div>
                            <span className="text-slate-500">Admin Notes</span>
                            <p className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 mt-0.5">{p.adminNotes}</p>
                          </div>
                        )}
                        {/* Current access details if already granted */}
                        {granted && (
                          <div className="border-t border-white/10 pt-2 mt-2">
                            <p className="text-emerald-400 font-semibold mb-1">✅ Access Already Granted</p>
                            {dd.downloadUrl && <p className="text-slate-300">Download: <a href={dd.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{dd.downloadUrl}</a></p>}
                            {dd.accessUrl && <p className="text-slate-300">Access URL: <a href={dd.accessUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{dd.accessUrl}</a></p>}
                            {dd.licenseKey && <p className="text-slate-300">License Key: <span className="font-mono text-amber-300">{dd.licenseKey}</span> <CopyText value={dd.licenseKey} /></p>}
                            {dd.accessNotes && <p className="text-slate-400 italic mt-1">{dd.accessNotes}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment proof */}
                    {p.paymentProof && (
                      <div className="mb-3">
                        <button
                          onClick={() => setProofModal(p.paymentProof)}
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Payment Proof
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {/* Approve */}
                      {(p.status === "pending" || p.status === "paid") && (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(p.id)}
                          disabled={approveMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs px-3"
                          data-testid={`btn-approve-purchase-${p.id}`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      )}
                      {/* Disapprove / Cancel — available for any non-cancelled, non-refunded order */}
                      {!["cancelled", "refunded"].includes(p.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => disapproveMutation.mutate(p.id)}
                          disabled={disapproveMutation.isPending}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs px-3"
                          data-testid={`btn-disapprove-purchase-${p.id}`}
                        >
                          <ShieldX className="h-3.5 w-3.5 mr-1" /> {p.status === "pending" ? "Reject" : "Cancel"}
                        </Button>
                      )}
                      {/* Grant / Update access — available once approved */}
                      {["paid", "approved", "delivered"].includes(p.status) && (
                        <Button
                          size="sm"
                          onClick={() => openGrant("purchase", p.id, p.product?.title || "Product", dd)}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white h-8 text-xs px-3"
                          data-testid={`btn-grant-purchase-${p.id}`}
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" /> {granted ? "Update Access" : "Grant Access"}
                        </Button>
                      )}
                      {/* Chat with customer */}
                      {buyerId && (
                        <a
                          href={chatUrl(buyerId)}
                          className="inline-flex items-center gap-1.5 h-8 text-xs px-3 rounded-md border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-colors"
                          title="Open chat with this customer"
                          data-testid={`btn-chat-purchase-${p.id}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Chat with Customer
                        </a>
                      )}
                      {/* Delete */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Permanently delete this order record?")) deletePurchaseMutation.mutate(p.id);
                        }}
                        disabled={deletePurchaseMutation.isPending}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 h-8 text-xs px-3 ml-auto"
                        data-testid={`btn-delete-purchase-${p.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ── COURSE ENROLLMENTS ── */}
          <TabsContent value="enrollments" className="space-y-3 mt-0">
            {allEnrollments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No course enrollments to grant.</p>
              </div>
            ) : allEnrollments.map((e) => (
              <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors p-4" data-testid={`row-enrollment-${e.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {e.course?.title || `Course ${String(e.courseId || "").slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Student: <span className="text-slate-300">{e.user?.email || e.user?.username || String(e.userId || "").slice(0, 8)}</span>
                      {" · "}
                      <span className="text-emerald-400 font-semibold">${e.amount}</span>
                      {" · "}
                      <StatusBadge status={e.status || "pending"} />
                      {e.approvedAt && <span className="ml-2 text-emerald-400">✓ Active</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(e.user?.id || e.userId) && (
                      <a
                        href={chatUrl(e.user?.id || e.userId)}
                        className="inline-flex items-center gap-1.5 h-8 text-xs px-3 rounded-md border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title="Chat with student"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button size="sm" onClick={() => openGrant("enrollment", e.id, e.course?.title || "Course")} className="bg-indigo-500 hover:bg-indigo-600 text-white h-8 text-xs" data-testid={`btn-grant-enrollment-${e.id}`}>
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Grant / Update
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── DIRECT HIRES ── */}
          <TabsContent value="hires" className="space-y-3 mt-0">
            {hiresError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Failed to load hires. Check server logs.
              </div>
            )}
            {!hiresError && allHires.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No developer hires yet.</p>
                <p className="text-xs mt-1 text-slate-500">Hire requests and developer engagements will appear here.</p>
              </div>
            ) : allHires.map((h) => {
              const brandName = h.brand
                ? (h.brand.companyName || `${h.brand.firstName || ""} ${h.brand.lastName || ""}`.trim() || h.brand.email || h.brand.username || h.brandId?.slice(0, 8))
                : h.brandId?.slice(0, 8);
              const influencerName = h.influencer
                ? (`${h.influencer.firstName || ""} ${h.influencer.lastName || ""}`.trim() || h.influencer.email || h.influencer.username || h.influencerId?.slice(0, 8))
                : h.influencerId?.slice(0, 8);
              const isOpen = expanded[`hire-${h.id}`];
              return (
                <div key={h.id} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors" data-testid={`row-hire-${h.id}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white text-sm truncate">{h.title}</p>
                          <StatusBadge status={h.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Client: <span className="text-slate-300">{brandName}</span>
                          {influencerName && (
                            <> → Developer: <span className="text-slate-300">{influencerName}</span></>
                          )}
                          {" · "}
                          <span className="text-emerald-400 font-semibold">${h.budget}</span>
                        </p>
                        {h.brand?.email && (
                          <p className="text-xs text-slate-500 mt-0.5">Client email: {h.brand.email}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpand(`hire-${h.id}`)}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                      >
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Expanded hire details */}
                    {isOpen && (
                      <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-xs">
                        <p className="text-slate-200 font-semibold mb-1">📋 Hire Details</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <div>
                            <span className="text-slate-500">Hire ID</span>
                            <p className="text-slate-300 font-mono truncate flex items-center gap-1">{h.id} <CopyText value={h.id} /></p>
                          </div>
                          <div>
                            <span className="text-slate-500">Budget</span>
                            <p className="text-emerald-400 font-semibold">${h.budget}</p>
                          </div>
                          {h.description && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Description</span>
                              <p className="text-slate-300 mt-0.5">{h.description}</p>
                            </div>
                          )}
                          {h.deadline && (
                            <div>
                              <span className="text-slate-500">Deadline</span>
                              <p className="text-slate-300">{new Date(h.deadline).toLocaleDateString()}</p>
                            </div>
                          )}
                          {h.workSubmissionUrl && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Work Submission URL</span>
                              <a href={h.workSubmissionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{h.workSubmissionUrl}</a>
                            </div>
                          )}
                          {h.adminNote && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Admin Note</span>
                              <p className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 mt-0.5">{h.adminNote}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => openGrant("hire", h.id, h.title, { workSubmissionUrl: h.workSubmissionUrl, adminNote: h.adminNote })}
                        className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs"
                        data-testid={`btn-grant-hire-${h.id}`}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> {h.workSubmissionUrl ? "Update Deliverable" : "Set Deliverable"}
                      </Button>
                      {/* Chat with client — links to project page which has the in-project chat */}
                      <a
                        href={`/direct-hire/${h.id}`}
                        className="inline-flex items-center gap-1.5 h-8 text-xs px-3 rounded-md border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title="Open project chat with client"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Chat with Client
                      </a>
                      {/* Generate Invoice button */}
                      <button
                        onClick={() => {
                          setInvoiceTarget(h);
                          setInvoiceForm({ agreedBudget: String(h.agreedBudget || h.budget || ""), invoiceDueDate: "", invoiceNote: h.invoiceNote || "" });
                        }}
                        className="inline-flex items-center gap-1.5 h-8 text-xs px-3 rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="Generate invoice for client"
                      >
                        <FileText className="h-3.5 w-3.5" /> {h.invoiceNumber ? "Re-issue Invoice" : "Generate Invoice"}
                      </button>
                      {h.invoiceNumber && (
                        <span className="inline-flex items-center gap-1 h-8 text-xs px-2 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" title={`Invoice ${h.invoiceNumber}`}>
                          <CheckCircle className="h-3 w-3" /> {h.invoiceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Payment proof modal ── */}
      <Dialog open={!!proofModal} onOpenChange={(o) => { if (!o) setProofModal(null); }}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-blue-400" /> Payment Receipt / Proof
            </DialogTitle>
          </DialogHeader>
          {proofModal && (
            <div className="space-y-3">
              {proofModal.startsWith("http") || proofModal.startsWith("/") ? (
                <img src={proofModal} alt="Payment proof" className="w-full rounded-lg border border-slate-700 max-h-[60vh] object-contain" />
              ) : (
                <div className="bg-slate-800 rounded-lg p-4 text-slate-200 text-sm break-all">{proofModal}</div>
              )}
              {proofModal.startsWith("http") && (
                <a href={proofModal} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm">
                  <ExternalLink className="h-4 w-4" /> Open in new tab
                </a>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProofModal(null)} className="border-slate-600 text-slate-300">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Grant access modal ── */}
      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <KeyRound className="h-5 w-5 text-emerald-400" />
              Grant Access — {target?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
              <p className="font-semibold mb-1">📦 Delivery Instructions</p>
              {target?.kind === "purchase" && <p>Provide the download link, license key, and/or private access URL for this software or script. The buyer will be notified automatically via their dashboard.</p>}
              {target?.kind === "enrollment" && <p>Provide the access URL for the private course group, portal, or resources. The student will be notified immediately.</p>}
              {target?.kind === "hire" && <p>Submit the deliverable URL and any notes for the client. Status will be updated to Completed.</p>}
            </div>
            {target?.kind === "purchase" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Download URL</label>
                  <Input value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })} placeholder="https://files.example.com/your-file.zip" className="bg-slate-800 border-slate-600 text-white mt-1" data-testid="input-download-url" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">License Key <span className="text-slate-500">(if applicable)</span></label>
                  <Input value={form.licenseKey} onChange={(e) => setForm({ ...form, licenseKey: e.target.value })} placeholder="XXXX-XXXX-XXXX-XXXX" className="bg-slate-800 border-slate-600 text-white mt-1" data-testid="input-license-key" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-300">
                {target?.kind === "hire" ? "Deliverable / Work URL" : "Private Access URL"}
              </label>
              <Input value={form.accessUrl} onChange={(e) => setForm({ ...form, accessUrl: e.target.value })} placeholder="https://t.me/+yourPrivateGroup" className="bg-slate-800 border-slate-600 text-white mt-1" data-testid="input-access-url" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Message / Notes for the buyer</label>
              <Textarea
                value={form.accessNotes}
                onChange={(e) => setForm({ ...form, accessNotes: e.target.value })}
                placeholder="Welcome! Use the link above to access your purchase. Contact support if you need help."
                rows={3}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                data-testid="input-access-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} className="text-slate-400">Cancel</Button>
            <Button onClick={() => grantMutation.mutate()} disabled={grantMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="btn-grant-submit">
              <CheckCircle className="h-4 w-4 mr-1" />
              {grantMutation.isPending ? "Granting…" : "Grant & Notify Buyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Generate Invoice modal ── */}
      <Dialog open={!!invoiceTarget} onOpenChange={(o) => { if (!o) { setInvoiceTarget(null); setInvoiceForm({ agreedBudget: "", invoiceDueDate: "", invoiceNote: "" }); } }}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-emerald-400" />
              Generate Invoice — {invoiceTarget?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300">
              <p className="font-semibold mb-1">🧾 Invoice Details</p>
              <p>A unique invoice number will be assigned and the client will be notified via their dashboard and project chat.</p>
            </div>

            {/* Show existing invoice if already generated */}
            {invoiceTarget?.invoiceNumber && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
                <p className="font-semibold">Existing Invoice: {invoiceTarget.invoiceNumber}</p>
                <p className="mt-0.5 text-emerald-400">Re-issuing will create a new invoice number.</p>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-300">Agreed Budget / Invoice Amount (USD)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  value={invoiceForm.agreedBudget}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, agreedBudget: e.target.value })}
                  placeholder={`${invoiceTarget?.budget || "0.00"}`}
                  className="bg-slate-800 border-slate-600 text-white pl-7"
                  type="number"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Leave blank to use the original budget (${invoiceTarget?.budget})</p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Payment Due Date</Label>
              <Input
                value={invoiceForm.invoiceDueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDueDate: e.target.value })}
                type="date"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Invoice Note / Terms</Label>
              <Textarea
                value={invoiceForm.invoiceNote}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNote: e.target.value })}
                placeholder="Payment terms, bank details, or project scope summary..."
                rows={3}
                className="bg-slate-800 border-slate-600 text-white mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInvoiceTarget(null)} className="text-slate-400">Cancel</Button>
            <Button
              onClick={() => invoiceMutation.mutate()}
              disabled={invoiceMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileText className="h-4 w-4 mr-1" />
              {invoiceMutation.isPending ? "Generating…" : "Generate & Send Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
