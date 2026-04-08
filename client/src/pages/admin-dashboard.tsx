import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  DollarSign,
  Trophy,
  Activity,
  Settings,
  Shield,
  BarChart3,
  UserCog,
  Lock,
  Key,
  ShoppingCart,
  Package,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  MessageCircle,
  ExternalLink,
  ZoomIn,
  Send,
  Wallet,
  Star,
  AlertTriangle,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    pending_payment: "bg-orange-100 text-orange-800 border-orange-200",
    active: "bg-green-100 text-green-800 border-green-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-blue-100 text-blue-800 border-blue-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    processing: "bg-purple-100 text-purple-800 border-purple-200",
    verified: "bg-teal-100 text-teal-800 border-teal-200",
    payment_window: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    <Badge className={`${map[status] || "bg-gray-100 text-gray-800"} border text-xs font-medium`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function TierBadge({ tier }: { tier?: string }) {
  const map: Record<string, string> = {
    rising_sparks: "bg-slate-100 text-slate-700",
    growth_engines: "bg-blue-100 text-blue-700",
    power_influencers: "bg-purple-100 text-purple-700",
    global_titans: "bg-amber-100 text-amber-700",
  };
  if (!tier) return null;
  return (
    <Badge className={`${map[tier] || "bg-gray-100 text-gray-600"} text-xs`}>
      {tier.replace(/_/g, " ")}
    </Badge>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const [adminProfile, setAdminProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [rejectPayoutDialog, setRejectPayoutDialog] = useState<{ open: boolean; id: string; notes: string }>({
    open: false, id: "", notes: "",
  });
  const [approvePayoutDialog, setApprovePayoutDialog] = useState<{ open: boolean; id: string; txHash: string; notes: string }>({
    open: false, id: "", txHash: "", notes: "",
  });
  const [rejectCampaignDialog, setRejectCampaignDialog] = useState<{ open: boolean; escrowId: string; reason: string }>({
    open: false, escrowId: "", reason: "",
  });
  const [screenshotZoom, setScreenshotZoom] = useState<string | null>(null);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);

  const { data: adminCampaigns = [] } = useQuery<any[]>({ queryKey: ["/api/admin/campaigns"] });
  const { data: allParticipations = [] } = useQuery<any[]>({ queryKey: ["/api/admin/participations"] });
  const { data: escrowPayments = [] } = useQuery<any[]>({ queryKey: ["/api/admin/escrow-payments"] });
  const { data: payoutRequests = [], isLoading: payoutsLoading } = useQuery<any[]>({ queryKey: ["/api/payout-requests"] });
  const { data: adminUsers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });

  const updateAdminProfileMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("PATCH", "/api/admin/profile", data),
    onSuccess: () => {
      toast({ title: "Profile Updated", description: "Admin profile updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e: any) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/admin/change-password", data),
    onSuccess: () => {
      toast({ title: "Password Changed", description: "Password updated successfully." });
      setAdminProfile(p => ({ ...p, currentPassword: "", newPassword: "", confirmPassword: "" }));
    },
    onError: (e: any) => toast({ title: "Password Change Failed", description: e.message, variant: "destructive" }),
  });

  const approveEscrowMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/admin/escrow-payments/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/escrow-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Campaign Approved! 🎉", description: "Campaign is now live and creators notified." });
    },
    onError: () => toast({ title: "Failed to approve", variant: "destructive" }),
  });

  const rejectEscrowMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("PUT", `/api/admin/escrow-payments/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/escrow-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      setRejectCampaignDialog({ open: false, escrowId: "", reason: "" });
      toast({ title: "Campaign Rejected", description: "Brand has been notified." });
    },
    onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
  });

  const approvePayoutMutation = useMutation({
    mutationFn: async ({ id, txHash, notes }: { id: string; txHash: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/payout-requests/${id}`, {
        status: "completed",
        transactionHash: txHash,
        adminNotes: notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payout-requests"] });
      setApprovePayoutDialog({ open: false, id: "", txHash: "", notes: "" });
      toast({ title: "Payout Approved! ✅", description: "Creator has been notified." });
    },
    onError: () => toast({ title: "Failed to approve payout", variant: "destructive" }),
  });

  const rejectPayoutMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/payout-requests/${id}`, {
        status: "rejected",
        adminNotes: notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payout-requests"] });
      setRejectPayoutDialog({ open: false, id: "", notes: "" });
      toast({ title: "Payout Rejected", description: "Creator notified and funds refunded to their balance." });
    },
    onError: () => toast({ title: "Failed to reject payout", variant: "destructive" }),
  });

  useEffect(() => {
    if (user) {
      setAdminProfile(p => ({ ...p, firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "" }));
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-purple-600" />
      </div>
    );
  }

  const handleChangePassword = () => {
    const { currentPassword, newPassword, confirmPassword } = adminProfile;
    if (newPassword !== confirmPassword) {
      toast({ title: "Password Mismatch", description: "New passwords don't match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password Too Short", description: "Must be 8+ characters.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const totalCampaigns = adminCampaigns?.length || 0;
  const activeCampaigns = adminCampaigns?.filter((c: any) => c.isActive).length || 0;
  const pendingCampaigns = escrowPayments?.filter((e: any) => e.status === "payment_window" || e.status === "pending").length || 0;
  const pendingPayouts = payoutRequests?.filter((r: any) => r.status === "pending").length || 0;
  const pendingParticipations = allParticipations?.filter((p: any) => p.status === "pending").length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-slate-900 to-purple-900 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Control Panel</h1>
              <p className="text-slate-300 mt-1">Taskdrip Platform Management · {user?.firstName} {user?.lastName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            {[
              { label: "Total Campaigns", value: totalCampaigns, color: "text-blue-300" },
              { label: "Active Campaigns", value: activeCampaigns, color: "text-green-300" },
              { label: "Pending Approval", value: pendingCampaigns, color: "text-amber-300" },
              { label: "Pending Payouts", value: pendingPayouts, color: "text-rose-300" },
              { label: "Open Applications", value: pendingParticipations, color: "text-purple-300" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 h-auto">
            <TabsTrigger value="campaigns" className="relative py-2 text-xs sm:text-sm">
              Campaigns
              {pendingCampaigns > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCampaigns}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payouts" className="relative py-2 text-xs sm:text-sm">
              Payouts
              {pendingPayouts > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingPayouts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overview" className="py-2 text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="users" className="py-2 text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="shop" className="py-2 text-xs sm:text-sm">Shop</TabsTrigger>
            <TabsTrigger value="profile" className="py-2 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="settings" className="py-2 text-xs sm:text-sm">Settings</TabsTrigger>
          </TabsList>

          {/* ── CAMPAIGNS TAB ── */}
          <TabsContent value="campaigns" className="space-y-6">
            {/* Pending Payment Section */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Awaiting Admin Review
                {pendingCampaigns > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200">{pendingCampaigns} pending</Badge>
                )}
              </h2>

              {escrowPayments.filter((e: any) => e.status === "payment_window" || e.status === "pending").length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400" />
                    <p className="font-medium">All caught up — no campaigns pending review</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {escrowPayments
                    .filter((e: any) => e.status === "payment_window" || e.status === "pending")
                    .map((escrow: any) => (
                      <Card key={escrow.id} className="border-amber-200 shadow-sm overflow-hidden">
                        <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="font-semibold text-amber-800">{escrow.campaign?.title || "Untitled Campaign"}</span>
                            <StatusBadge status={escrow.status} />
                          </div>
                          <span className="text-sm text-amber-600">
                            Submitted {escrow.createdAt ? formatDistanceToNow(new Date(escrow.createdAt), { addSuffix: true }) : ""}
                          </span>
                        </div>

                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Campaign Details */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Campaign Info</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Brand</span>
                                  <span className="font-medium">{escrow.brandName || escrow.brandEmail || "Unknown"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Email</span>
                                  <span className="font-medium text-xs">{escrow.brandEmail || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Amount</span>
                                  <span className="font-bold text-green-700">${parseFloat(escrow.amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Network</span>
                                  <span className="font-medium">{escrow.network || escrow.campaign?.paymentNetwork || "USDT-TRC20"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Slots</span>
                                  <span className="font-medium">{escrow.campaign?.totalSlots || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Reward/creator</span>
                                  <span className="font-medium">${escrow.campaign?.reward || "—"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Transaction Proof */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Payment Proof</h4>
                              {escrow.transactionHash ? (
                                <div className="bg-gray-50 rounded-lg p-3 border">
                                  <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                                  <p className="font-mono text-xs text-gray-800 break-all">{escrow.transactionHash}</p>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 italic">No transaction hash submitted</p>
                              )}
                              {escrow.paymentProof && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">Screenshot Proof</p>
                                  <div
                                    className="relative cursor-pointer group rounded-lg overflow-hidden border border-gray-200"
                                    onClick={() => setScreenshotZoom(escrow.paymentProof)}
                                  >
                                    <img
                                      src={escrow.paymentProof.startsWith("/") ? escrow.paymentProof : `/${escrow.paymentProof}`}
                                      alt="Payment proof"
                                      className="w-full h-32 object-cover group-hover:opacity-80 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                      <ZoomIn className="w-8 h-8 text-white" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {!escrow.transactionHash && !escrow.paymentProof && (
                                <div className="bg-gray-50 rounded-lg p-4 text-center border border-dashed">
                                  <p className="text-sm text-gray-400">No payment proof submitted yet</p>
                                </div>
                              )}
                            </div>

                            {/* Campaign Preview */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Campaign Preview</h4>
                              {escrow.campaign?.featureImage && (
                                <img
                                  src={escrow.campaign.featureImage}
                                  alt="Campaign"
                                  className="w-full h-24 object-cover rounded-lg border"
                                />
                              )}
                              <p className="text-sm text-gray-600 line-clamp-3">{escrow.campaign?.description || "No description"}</p>
                              {escrow.campaign?.id && (
                                <a
                                  href={`/campaigns/${escrow.campaign.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> View full campaign
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 mt-6 pt-5 border-t">
                            <Button
                              className="bg-green-600 hover:bg-green-700 flex-1"
                              onClick={() => approveEscrowMutation.mutate(escrow.id)}
                              disabled={approveEscrowMutation.isPending}
                              data-testid={`approve-campaign-${escrow.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {approveEscrowMutation.isPending ? "Approving..." : "Approve & Activate Campaign"}
                            </Button>
                            <Button
                              variant="destructive"
                              className="flex-1"
                              onClick={() => setRejectCampaignDialog({ open: true, escrowId: escrow.id, reason: "" })}
                              data-testid={`reject-campaign-${escrow.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject Payment
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* All Campaigns */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                All Campaigns ({totalCampaigns})
              </h2>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {adminCampaigns.map((campaign: any) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0">
                          {campaign.featureImage && (
                            <img src={campaign.featureImage} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{campaign.title}</p>
                            <p className="text-xs text-gray-500">{campaign.brandName} · ${campaign.reward}/creator · {campaign.filledSlots || 0}/{campaign.totalSlots} slots</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <StatusBadge status={campaign.status || (campaign.isActive ? "active" : "inactive")} />
                          <a href={`/campaigns/${campaign.id}`} className="text-blue-500 hover:text-blue-700">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                    {adminCampaigns.length === 0 && (
                      <p className="text-center text-gray-400 py-10">No campaigns yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── PAYOUTS TAB ── */}
          <TabsContent value="payouts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-600" />
                Payout Requests
              </h2>
              <div className="flex gap-3 text-sm">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">{pendingPayouts} Pending</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  {payoutRequests.filter(r => r.status === "completed").length} Completed
                </span>
              </div>
            </div>

            {payoutsLoading ? (
              <div className="text-center py-12 text-gray-400">Loading payout requests...</div>
            ) : payoutRequests.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No payout requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {payoutRequests
                  .sort((a, b) => {
                    const order: Record<string, number> = { pending: 0, processing: 1, completed: 2, rejected: 3 };
                    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                  })
                  .map((req: any) => {
                    const r = req.requester;
                    const isExpanded = expandedPayoutId === req.id;
                    return (
                      <Card key={req.id} className={`overflow-hidden transition-all ${req.status === "pending" ? "border-amber-200" : ""}`} data-testid={`admin-payout-${req.id}`}>
                        {/* Summary row */}
                        <div
                          className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedPayoutId(isExpanded ? null : req.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Avatar */}
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
                                {r?.profileImageUrl ? (
                                  <img src={r.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  `${r?.firstName?.[0] || "?"}${r?.lastName?.[0] || ""}`
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {r ? `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.email : "Unknown User"}
                                  </span>
                                  {r?.creatorTier && <TierBadge tier={r.creatorTier} />}
                                </div>
                                <div className="text-sm text-gray-500">{r?.email || "—"}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {req.createdAt ? formatDistanceToNow(new Date(req.createdAt), { addSuffix: true }) : ""}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">${parseFloat(req.amount || 0).toFixed(2)}</div>
                                <div className="text-xs text-gray-500">{req.network}</div>
                              </div>
                              <StatusBadge status={req.status} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t bg-gray-50">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* User Profile */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                  <Users className="w-4 h-4" /> Creator Profile
                                </h4>
                                {r ? (
                                  <div className="space-y-3">
                                    <div className="bg-white rounded-xl p-4 border space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Current Balance</span>
                                        <span className="font-bold text-green-700 text-lg">${parseFloat(r.availableBalance || "0").toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Total Earned</span>
                                        <span className="font-semibold text-gray-900">${(r.totalEarned || 0).toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Campaigns Done</span>
                                        <span className="font-semibold text-gray-900 flex items-center gap-1">
                                          <Star className="w-3 h-3 text-amber-500" /> {r.completedCampaigns || 0}
                                        </span>
                                      </div>
                                    </div>
                                    <a
                                      href={`/profile/${r.id}`}
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" /> View full profile
                                    </a>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-400">User info unavailable</p>
                                )}
                              </div>

                              {/* Wallet Details */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                  <Wallet className="w-4 h-4" /> Withdrawal Details
                                </h4>
                                <div className="bg-white rounded-xl p-4 border space-y-3">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Amount Requested</p>
                                    <p className="text-2xl font-bold text-gray-900">${parseFloat(req.amount || 0).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Network</p>
                                    <p className="font-semibold text-gray-800">{req.network}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Destination Wallet</p>
                                    <p className="font-mono text-xs text-gray-800 break-all bg-gray-50 p-2 rounded">{req.walletAddress || "—"}</p>
                                  </div>
                                  {req.notes && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Notes from Creator</p>
                                      <p className="text-sm text-gray-700 italic">"{req.notes}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Admin Actions */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Admin Actions</h4>
                                {req.status === "pending" ? (
                                  <div className="space-y-3">
                                    <Button
                                      className="w-full bg-green-600 hover:bg-green-700"
                                      onClick={() => setApprovePayoutDialog({ open: true, id: req.id, txHash: "", notes: "" })}
                                      data-testid={`approve-payout-${req.id}`}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Send Payment
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      className="w-full"
                                      onClick={() => setRejectPayoutDialog({ open: true, id: req.id, notes: "" })}
                                      data-testid={`reject-payout-${req.id}`}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" /> Reject & Refund Balance
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="bg-white rounded-xl p-4 border">
                                    <p className="text-sm font-medium text-gray-600 mb-2">Status</p>
                                    <StatusBadge status={req.status} />
                                    {req.transactionHash && (
                                      <div className="mt-3">
                                        <p className="text-xs text-gray-500 mb-1">TX Hash</p>
                                        <p className="font-mono text-xs break-all text-gray-700">{req.transactionHash}</p>
                                      </div>
                                    )}
                                    {req.adminNotes && (
                                      <div className="mt-3">
                                        <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                                        <p className="text-sm text-gray-700">{req.adminNotes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Total Campaigns", value: totalCampaigns, sub: `${activeCampaigns} active`, icon: Activity, color: "text-blue-600" },
                { label: "Total Participations", value: allParticipations.length, sub: `${allParticipations.filter((p: any) => p.status === "completed").length} completed`, icon: Users, color: "text-purple-600" },
                { label: "Pending Reviews", value: pendingParticipations, sub: "applications open", icon: Trophy, color: "text-amber-600" },
                { label: "Total Users", value: adminUsers.length, sub: `${adminUsers.filter((u: any) => u.userType === "creator").length} creators`, icon: BarChart3, color: "text-green-600" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">{stat.label}</CardTitle>
                    <stat.icon className="w-4 h-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle>Recent Platform Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allParticipations.slice(0, 10).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Campaign Participation</p>
                        <p className="text-xs text-gray-500">User: {p.userId?.substring(0, 12)}… · Campaign: {p.campaignId?.substring(0, 12)}…</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                  {allParticipations.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── USERS TAB ── */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Platform Users ({adminUsers.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {adminUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                          {u.profileImageUrl ? (
                            <img src={u.profileImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : `${u.firstName?.[0] || u.email?.[0] || "?"}`}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={u.userType === "admin" ? "bg-purple-100 text-purple-800" : u.userType === "brand" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                          {u.userType}
                        </Badge>
                        <span className="text-sm font-semibold text-gray-700">${parseFloat(u.availableBalance || "0").toFixed(2)}</span>
                        <a href={`/profile/${u.id}`}><ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-600" /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SHOP TAB ── */}
          <TabsContent value="shop" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Shop Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: Package, label: "Total Products", value: "0", color: "text-blue-600" },
                    { icon: ShoppingCart, label: "Total Sales", value: "0", color: "text-green-600" },
                    { icon: DollarSign, label: "Revenue", value: "$0", color: "text-orange-600" },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 p-4 rounded-xl border flex items-center gap-4">
                      <s.icon className={`w-8 h-8 ${s.color}`} />
                      <div>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-sm text-gray-600">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/admin/products"><Package className="w-4 h-4 mr-2" /> Manage Products</a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/shop"><ShoppingCart className="w-4 h-4 mr-2" /> View Customer Shop</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROFILE TAB ── */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> Admin Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input value={adminProfile.firstName} onChange={e => setAdminProfile(p => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={adminProfile.lastName} onChange={e => setAdminProfile(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={adminProfile.email} onChange={e => setAdminProfile(p => ({ ...p, email: e.target.value }))} />
                </div>
                <Button onClick={() => updateAdminProfileMutation.mutate({ firstName: adminProfile.firstName, lastName: adminProfile.lastName, email: adminProfile.email })} disabled={updateAdminProfileMutation.isPending}>
                  {updateAdminProfileMutation.isPending ? "Updating..." : "Update Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SETTINGS TAB ── */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Key className="w-4 h-4" /> Change Password</h3>
                {["currentPassword", "newPassword", "confirmPassword"].map((field) => (
                  <div key={field}>
                    <Label>{field === "currentPassword" ? "Current Password" : field === "newPassword" ? "New Password" : "Confirm New Password"}</Label>
                    <Input
                      type="password"
                      value={(adminProfile as any)[field]}
                      onChange={e => setAdminProfile(p => ({ ...p, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <Button onClick={handleChangePassword} variant="outline" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>

                <div className="border-t pt-6 space-y-3">
                  <h3 className="font-semibold">Platform Status</h3>
                  <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                    <span className="font-medium">Database</span>
                    <Badge className="bg-green-600 text-white">Connected</Badge>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                    <span className="font-medium">Authentication</span>
                    <Badge className="bg-blue-600 text-white">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Screenshot Zoom Dialog */}
      <Dialog open={!!screenshotZoom} onOpenChange={() => setScreenshotZoom(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Payment Proof Screenshot</DialogTitle></DialogHeader>
          {screenshotZoom && (
            <img
              src={screenshotZoom.startsWith("/") ? screenshotZoom : `/${screenshotZoom}`}
              alt="Payment proof"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Campaign Dialog */}
      <Dialog open={rejectCampaignDialog.open} onOpenChange={open => !open && setRejectCampaignDialog(p => ({ ...p, open: false }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Campaign Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">This will reject the escrow payment and notify the brand. Provide a reason so they know how to correct it.</p>
            <Textarea
              placeholder="Reason for rejection (e.g. transaction hash not found, screenshot unclear)"
              value={rejectCampaignDialog.reason}
              onChange={e => setRejectCampaignDialog(p => ({ ...p, reason: e.target.value }))}
              rows={4}
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => rejectEscrowMutation.mutate({ id: rejectCampaignDialog.escrowId, reason: rejectCampaignDialog.reason })}
                disabled={rejectEscrowMutation.isPending}
              >
                {rejectEscrowMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRejectCampaignDialog(p => ({ ...p, open: false }))}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Payout Dialog */}
      <Dialog open={approvePayoutDialog.open} onOpenChange={open => !open && setApprovePayoutDialog(p => ({ ...p, open: false }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Payout & Confirm Sent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Send the payment to the creator's wallet, then enter the transaction hash below to confirm.</p>
            <div>
              <Label>Transaction Hash (optional but recommended)</Label>
              <Input
                placeholder="e.g. TXabc123..."
                value={approvePayoutDialog.txHash}
                onChange={e => setApprovePayoutDialog(p => ({ ...p, txHash: e.target.value }))}
              />
            </div>
            <div>
              <Label>Note to Creator (optional)</Label>
              <Textarea
                placeholder="e.g. Payment sent via USDT TRC-20. Check your wallet in a few minutes."
                value={approvePayoutDialog.notes}
                onChange={e => setApprovePayoutDialog(p => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => approvePayoutMutation.mutate({ id: approvePayoutDialog.id, txHash: approvePayoutDialog.txHash, notes: approvePayoutDialog.notes })}
                disabled={approvePayoutMutation.isPending}
              >
                {approvePayoutMutation.isPending ? "Approving..." : "Confirm Payout Sent"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setApprovePayoutDialog(p => ({ ...p, open: false }))}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Payout Dialog */}
      <Dialog open={rejectPayoutDialog.open} onOpenChange={open => !open && setRejectPayoutDialog(p => ({ ...p, open: false }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payout Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              The payout will be rejected and the amount will be automatically refunded to the creator's wallet balance. Provide a reason.
            </p>
            <Textarea
              placeholder="Reason for rejection (e.g. wallet address appears invalid, insufficient verification)"
              value={rejectPayoutDialog.notes}
              onChange={e => setRejectPayoutDialog(p => ({ ...p, notes: e.target.value }))}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => rejectPayoutMutation.mutate({ id: rejectPayoutDialog.id, notes: rejectPayoutDialog.notes })}
                disabled={rejectPayoutMutation.isPending}
              >
                {rejectPayoutMutation.isPending ? "Rejecting..." : "Reject & Refund Creator"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRejectPayoutDialog(p => ({ ...p, open: false }))}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
