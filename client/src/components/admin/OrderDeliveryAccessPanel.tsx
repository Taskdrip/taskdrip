import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, KeyRound, Link2, GraduationCap, Briefcase, ShoppingBag, CheckCircle, Send } from "lucide-react";

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

export function OrderDeliveryAccessPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState("purchases");
  const [target, setTarget] = useState<{ kind: "purchase" | "enrollment" | "hire"; id: string; label: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: purchases = [] } = useQuery<any[]>({ queryKey: ["/api/admin/purchases"] });
  const { data: enrollments = [] } = useQuery<any[]>({ queryKey: ["/api/courses/admin/enrollments"] });
  const { data: hires = [] } = useQuery<any[]>({ queryKey: ["/api/admin/direct-hire"] });

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("No order selected");
      const url =
        target.kind === "purchase" ? `/api/admin/purchases/${target.id}/deliver`
        : target.kind === "enrollment" ? `/api/admin/enrollments/${target.id}/grant`
        : `/api/admin/direct-hire/${target.id}/grant`;
      const body =
        target.kind === "purchase" ? { ...form }
        : target.kind === "enrollment" ? { accessUrl: form.accessUrl, accessNotes: form.accessNotes, status: form.status === 'delivered' ? 'active' : form.status }
        : { adminNote: form.accessNotes, workSubmissionUrl: form.accessUrl, status: form.status === 'delivered' ? 'completed' : form.status };
      return (await apiRequest("PATCH", url, body)).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/direct-hire"] });
      toast({ title: "Access granted", description: "User has been notified with their access details." });
      setTarget(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Failed to grant access", description: e.message, variant: "destructive" }),
  });

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

  const paidPurchases = (purchases as any[]).filter((p) => ["paid", "delivered", "approved"].includes(p.status));
  const paidEnrollments = (enrollments as any[]).filter((e) => e.isPaid || e.status === "active");
  const paidHires = (hires as any[]).filter((h) => ["active", "payment_submitted", "completed"].includes(h.status));

  return (
    <Card className="border-emerald-200 bg-emerald-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-800">
          <Package className="h-5 w-5" /> Order Delivery & Access Grants
        </CardTitle>
        <CardDescription>
          After confirming a payment, attach a download link, license key, or private group/access URL. The buyer is notified automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="purchases" data-testid="tab-grant-purchases">
              <ShoppingBag className="h-4 w-4 mr-1" /> Shop ({paidPurchases.length})
            </TabsTrigger>
            <TabsTrigger value="enrollments" data-testid="tab-grant-enrollments">
              <GraduationCap className="h-4 w-4 mr-1" /> Courses ({paidEnrollments.length})
            </TabsTrigger>
            <TabsTrigger value="hires" data-testid="tab-grant-hires">
              <Briefcase className="h-4 w-4 mr-1" /> Hires ({paidHires.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-3 mt-4">
            {paidPurchases.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No paid shop purchases awaiting delivery.</p>
            ) : paidPurchases.map((p) => {
              const dd = (p.deliveryDetails || {}) as any;
              const granted = !!(dd.downloadUrl || dd.accessUrl || dd.licenseKey);
              return (
                <div key={p.id} className="bg-white border rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between" data-testid={`row-purchase-${p.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.product?.title || `Product ${p.productId?.slice(0, 8)}`}</p>
                    <p className="text-xs text-gray-500">
                      Buyer: {p.user?.email || p.userId?.slice(0, 8)} · ${p.totalAmount} · {p.status}
                      {granted && <Badge className="ml-2 bg-emerald-100 text-emerald-700">Access granted</Badge>}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openGrant("purchase", p.id, p.product?.title || "Product", dd)} data-testid={`btn-grant-purchase-${p.id}`}>
                    <KeyRound className="h-4 w-4 mr-1" /> {granted ? "Update Access" : "Grant Access"}
                  </Button>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-3 mt-4">
            {paidEnrollments.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No course enrollments to grant.</p>
            ) : paidEnrollments.map((e) => (
              <div key={e.id} className="bg-white border rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between" data-testid={`row-enrollment-${e.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{e.course?.title || `Course ${e.courseId?.slice(0, 8)}`}</p>
                  <p className="text-xs text-gray-500">
                    Student: {e.user?.email || e.userId?.slice(0, 8)} · ${e.amount} · {e.status}
                    {e.approvedAt && <Badge className="ml-2 bg-emerald-100 text-emerald-700">Active</Badge>}
                  </p>
                </div>
                <Button size="sm" onClick={() => openGrant("enrollment", e.id, e.course?.title || "Course")} data-testid={`btn-grant-enrollment-${e.id}`}>
                  <Link2 className="h-4 w-4 mr-1" /> Grant / Update
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="hires" className="space-y-3 mt-4">
            {paidHires.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No active hire offers.</p>
            ) : paidHires.map((h) => (
              <div key={h.id} className="bg-white border rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between" data-testid={`row-hire-${h.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{h.title}</p>
                  <p className="text-xs text-gray-500">
                    Brand: {h.brand?.email} → Influencer: {h.influencer?.email} · ${h.budget} · {h.status}
                  </p>
                </div>
                <Button size="sm" onClick={() => openGrant("hire", h.id, h.title, { workSubmissionUrl: h.workSubmissionUrl, adminNote: h.adminNote })} data-testid={`btn-grant-hire-${h.id}`}>
                  <Send className="h-4 w-4 mr-1" /> Attach Deliverable
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Grant dialog */}
      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              Grant access — {target?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {target?.kind === "purchase" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Download URL</label>
                  <Input value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })} placeholder="https://files.example.com/your-file.zip" data-testid="input-download-url" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">License Key</label>
                  <Input value={form.licenseKey} onChange={(e) => setForm({ ...form, licenseKey: e.target.value })} placeholder="XXXX-XXXX-XXXX-XXXX" data-testid="input-license-key" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-700">
                {target?.kind === "hire" ? "Deliverable / Work URL" : "Access URL (private group, course portal, etc.)"}
              </label>
              <Input value={form.accessUrl} onChange={(e) => setForm({ ...form, accessUrl: e.target.value })} placeholder="https://t.me/+yourPrivateGroup" data-testid="input-access-url" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Notes for the user</label>
              <Textarea
                value={form.accessNotes}
                onChange={(e) => setForm({ ...form, accessNotes: e.target.value })}
                placeholder="Welcome! Use the link above to join the private group. Login with your registered email."
                rows={3}
                data-testid="input-access-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={() => grantMutation.mutate()} disabled={grantMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="btn-grant-submit">
              <CheckCircle className="h-4 w-4 mr-1" />
              {grantMutation.isPending ? "Granting…" : "Grant & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
