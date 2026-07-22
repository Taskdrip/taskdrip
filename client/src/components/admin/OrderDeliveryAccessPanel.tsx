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
import {
  Package, KeyRound, Link2, GraduationCap, Briefcase, ShoppingBag,
  CheckCircle, Send, XCircle, Trash2, Eye, ExternalLink, Clock,
  RefreshCw, ReceiptText, ShieldCheck, ShieldX,
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
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {status === "pending" && <Clock className="h-3 w-3" />}
      {status === "paid" && <ReceiptText className="h-3 w-3" />}
      {(status === "approved" || status === "delivered") && <CheckCircle className="h-3 w-3" />}
      {status === "cancelled" && <XCircle className="h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function OrderDeliveryAccessPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState("purchases");
  const [target, setTarget] = useState<{ kind: "purchase" | "enrollment" | "hire"; id: string; label: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [proofModal, setProofModal] = useState<string | null>(null);

  const { data: purchases = [], refetch: refetchPurchases } = useQuery<any[]>({
    queryKey: ["/api/admin/purchases"],
    refetchInterval: 30_000,
  });
  const { data: enrollments = [], refetch: refetchEnrollments } = useQuery<any[]>({
    queryKey: ["/api/courses/admin/enrollments"],
    refetchInterval: 30_000,
  });
  const { data: hires = [], refetch: refetchHires } = useQuery<any[]>({
    queryKey: ["/api/admin/direct-hire"],
    refetchInterval: 30_000,
  });

  // Grant / deliver access
  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("No order selected");
      const url =
        target.kind === "purchase"  ? `/api/admin/purchases/${target.id}/deliver`
        : target.kind === "enrollment" ? `/api/admin/enrollments/${target.id}/grant`
        : `/api/admin/direct-hire/${target.id}/grant`;
      const body =
        target.kind === "purchase" ? { ...form }
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

  // Show ALL purchases so admin can approve/review/manage
  const allPurchases = purchases as any[];
  const allEnrollments = (enrollments as any[]).filter((e) => e.isPaid || e.status === "active");
  const allHires = (hires as any[]).filter((h) => ["active", "payment_submitted", "completed"].includes(h.status));

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-xl border border-white/10"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f2027 100%)",
      }}
    >
      {/* Decorative background pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, #10b981 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, #6366f1 0%, transparent 40%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
            Review orders, approve payments, grant download links, license keys, or private access URLs. Buyers are notified automatically.
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

      {/* Stats bar */}
      <div className="relative mx-6 mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Shop Orders", count: allPurchases.length, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Courses", count: allEnrollments.length, icon: GraduationCap, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          { label: "Hires", count: allHires.length, icon: Briefcase, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 flex items-center gap-3 ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{count}</p>
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
            {allPurchases.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No shop orders yet.</p>
              </div>
            ) : allPurchases.map((p) => {
              const dd = (p.deliveryDetails || {}) as any;
              const granted = !!(dd.downloadUrl || dd.accessUrl || dd.licenseKey);
              const buyer = p.buyer || p.user || {};
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors p-4"
                  data-testid={`row-purchase-${p.id}`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white text-sm truncate">
                          {p.product?.title || `Product ${String(p.productId || "").slice(0, 8)}`}
                        </p>
                        <StatusBadge status={p.status} />
                        {granted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="h-3 w-3" /> Access granted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Buyer: <span className="text-slate-300">{buyer.email || buyer.username || String(p.userId || "").slice(0, 8)}</span>
                        {" · "}
                        <span className="text-emerald-400 font-semibold">${p.totalAmount}</span>
                        {" · "}
                        {p.paymentMethod || "—"}
                        {" · "}
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>

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

                  {/* Admin notes */}
                  {p.adminNotes && (
                    <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 mb-3">
                      📝 {p.adminNotes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {p.status === "pending" && (
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
                    {(p.status === "pending" || p.status === "paid") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => disapproveMutation.mutate(p.id)}
                        disabled={disapproveMutation.isPending}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs px-3"
                        data-testid={`btn-disapprove-purchase-${p.id}`}
                      >
                        <ShieldX className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    )}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Delete this order permanently?")) deletePurchaseMutation.mutate(p.id);
                      }}
                      disabled={deletePurchaseMutation.isPending}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 h-8 text-xs px-3 ml-auto"
                      data-testid={`btn-delete-purchase-${p.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
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
              <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors p-4" data-testid={`row-enrollment-${e.id}`}>
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
                  <Button size="sm" onClick={() => openGrant("enrollment", e.id, e.course?.title || "Course")} className="bg-indigo-500 hover:bg-indigo-600 text-white h-8 text-xs" data-testid={`btn-grant-enrollment-${e.id}`}>
                    <Link2 className="h-3.5 w-3.5 mr-1" /> Grant / Update
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── DIRECT HIRES ── */}
          <TabsContent value="hires" className="space-y-3 mt-0">
            {allHires.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active hire offers.</p>
              </div>
            ) : allHires.map((h) => (
              <div key={h.id} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors p-4" data-testid={`row-hire-${h.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{h.title}</p>
                      <StatusBadge status={h.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Brand: <span className="text-slate-300">{h.brand?.email}</span>
                      {" → "}
                      Influencer: <span className="text-slate-300">{h.influencer?.email}</span>
                      {" · "}
                      <span className="text-emerald-400 font-semibold">${h.budget}</span>
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openGrant("hire", h.id, h.title, { workSubmissionUrl: h.workSubmissionUrl, adminNote: h.adminNote })} className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs" data-testid={`btn-grant-hire-${h.id}`}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Deliverable
                  </Button>
                </div>
              </div>
            ))}
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
              Grant access — {target?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {target?.kind === "purchase" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-300">Download URL</label>
                  <Input value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })} placeholder="https://files.example.com/your-file.zip" className="bg-slate-800 border-slate-600 text-white mt-1" data-testid="input-download-url" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300">License Key</label>
                  <Input value={form.licenseKey} onChange={(e) => setForm({ ...form, licenseKey: e.target.value })} placeholder="XXXX-XXXX-XXXX-XXXX" className="bg-slate-800 border-slate-600 text-white mt-1" data-testid="input-license-key" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-300">
                {target?.kind === "hire" ? "Deliverable / Work URL" : "Access URL (private group, portal, etc.)"}
              </label>
              <Input value={form.accessUrl} onChange={(e) => setForm({ ...form, accessUrl: e.target.value })} placeholder="https://t.me/+yourPrivateGroup" className="bg-slate-800 border-slate-600 text-white mt-1" data-testid="input-access-url" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Notes for the buyer</label>
              <Textarea
                value={form.accessNotes}
                onChange={(e) => setForm({ ...form, accessNotes: e.target.value })}
                placeholder="Welcome! Use the link above to join the private group. Login with your registered email."
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
              {grantMutation.isPending ? "Granting…" : "Grant & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
