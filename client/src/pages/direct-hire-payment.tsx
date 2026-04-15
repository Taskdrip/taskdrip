import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft, Copy, CheckCircle, Upload, User, DollarSign,
  Briefcase, Calendar, Clock, AlertTriangle, Send, MessageCircle, Phone,
  ShieldCheck, Sparkles, ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface PaymentNetwork {
  id: string;
  networkKey: string;
  name: string;
  shortName: string;
  network: string;
  walletAddress?: string;
  description?: string;
  isActive: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  pending:           { label: "Pending Response",     color: "bg-yellow-100 text-yellow-800",  description: "Waiting for the influencer to respond." },
  accepted:          { label: "Accepted — Pay Now",   color: "bg-blue-100 text-blue-800",      description: "The influencer accepted! Complete payment to start the project." },
  rejected:          { label: "Declined",             color: "bg-red-100 text-red-800",        description: "The influencer declined this offer." },
  payment_submitted: { label: "Payment Under Review", color: "bg-purple-100 text-purple-800",  description: "Your payment proof is being reviewed by our team." },
  active:            { label: "Project Active",       color: "bg-green-100 text-green-800",    description: "Payment confirmed. Your project is live!" },
  work_submitted:    { label: "Work Submitted",       color: "bg-indigo-100 text-indigo-800",  description: "The brand is reviewing the submitted work." },
  revision_requested:{ label: "Revision Requested",   color: "bg-orange-100 text-orange-800",  description: "The brand asked for changes before approval." },
  completed:         { label: "Completed",            color: "bg-gray-100 text-gray-800",      description: "This project has been completed." },
  cancelled:         { label: "Cancelled",            color: "bg-gray-100 text-gray-500",      description: "This offer was cancelled." },
};

const money = (value: any) => Number(value || 0).toFixed(2);

export default function DirectHirePayment() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedNetwork, setSelectedNetwork] = useState("tron");
  const [txHash, setTxHash] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [adminMsgOpen, setAdminMsgOpen] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [proofOpen, setProofOpen] = useState(false);

  const { data: offer, isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/direct-hire/${id}`],
    enabled: !!id,
    refetchInterval: 20000,
  });

  const { data: networks = [] } = useQuery<PaymentNetwork[]>({
    queryKey: ["/api/payment-networks"],
  });
  const activeNetworks = networks.filter((n) => n.isActive);

  const { data: verification } = useQuery<any>({
    queryKey: [`/api/direct-hire/${id}/blockchain-verification`],
    enabled: !!id && !!offer?.transactionHash,
    refetchInterval: offer?.status === 'payment_submitted' ? 15000 : false,
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("transactionHash", txHash);
      fd.append("paymentNetwork", selectedNetwork);
      if (screenshotFile) fd.append("paymentScreenshot", screenshotFile);
      const res = await fetch(`/api/direct-hire/${id}/submit-payment`, {
        method: "POST", body: fd, credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payment proof submitted!", description: "Our team will verify and activate your project within 2–6 hours." });
      setPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/direct-hire/${id}`] });
      refetch();
    },
    onError: (e: Error) => toast({ title: "Failed to submit", description: e.message, variant: "destructive" }),
  });

  const sendAdminMsgMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/messages/to-admin", {
        subject: "Direct Hire Payment Verification",
        content: adminMsg || `I've submitted payment proof for direct hire offer ID: ${id}. Please verify my payment.`,
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Message sent!", description: "Admin will respond shortly." });
      setAdminMsgOpen(false);
      setAdminMsg("");
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const isBrand = user?.id === offer?.brandId;
  const isInfluencer = user?.id === offer?.influencerId;
  const statusCfg = offer ? (STATUS_CONFIG[offer.status] || { label: offer.status, color: "bg-gray-100 text-gray-700", description: "" }) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="container mx-auto p-8 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-48 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="container mx-auto p-8 max-w-xl text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Offer Not Found</h1>
          <p className="text-gray-500 mb-6">This hire offer could not be found or you don't have access.</p>
          <Button onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <div className="container mx-auto px-4 py-8 max-w-3xl">

        {/* Back button */}
        <Button variant="outline" className="mb-6" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{offer.title}</h1>
              <p className="text-gray-500 mt-1">
                {isBrand ? `Offer sent to ${offer.influencer?.firstName} ${offer.influencer?.lastName}` :
                  `Offer from ${offer.brand?.companyName || `${offer.brand?.firstName} ${offer.brand?.lastName}`}`}
              </p>
            </div>
            {statusCfg && (
              <Badge className={`${statusCfg.color} text-sm font-semibold px-3 py-1.5`}>
                {statusCfg.label}
              </Badge>
            )}
          </div>
          {statusCfg?.description && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mt-3">
              {statusCfg.description}
            </p>
          )}
        </div>

        {/* Offer Details */}
        <Card className="mb-5 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" /> Offer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Project Budget</p>
                <p className="text-2xl font-bold text-green-700">${money(offer.budget)}</p>
              </div>
              {offer.deadline && (
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Deadline</p>
                  <p className="text-lg font-bold text-blue-700">{format(new Date(offer.deadline), "MMM d, yyyy")}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs text-gray-500">Brand pays</p>
                <p className="font-bold text-gray-900" data-testid="text-brand-total">${money(offer.brandTotalCharge || Number(offer.budget) * 1.1)}</p>
                <p className="text-[11px] text-gray-500">Budget + 10% platform fee</p>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs text-gray-500">Creator receives</p>
                <p className="font-bold text-green-700" data-testid="text-influencer-payout">${money(offer.influencerPayout || Number(offer.budget) * 0.9)}</p>
                <p className="text-[11px] text-gray-500">After creator 10% fee</p>
              </div>
              <div className="rounded-xl border bg-white p-3">
                <p className="text-xs text-gray-500">Platform fees</p>
                <p className="font-bold text-purple-700" data-testid="text-platform-fees">${money(Number(offer.brandPlatformFee || Number(offer.budget) * 0.1) + Number(offer.platformFeeAmount || Number(offer.budget) * 0.1))}</p>
                <p className="text-[11px] text-gray-500">Shown in wallet ledger</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Description</Label>
              <p className="text-gray-800 mt-1 text-sm leading-relaxed">{offer.description}</p>
            </div>
            {offer.deliverables && (
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Deliverables</Label>
                <p className="text-gray-800 mt-1 text-sm leading-relaxed whitespace-pre-line">{offer.deliverables}</p>
              </div>
            )}
            {offer.adminNote && offer.status === 'accepted' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                <strong>Admin note:</strong> {offer.adminNote}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── INFLUENCER VIEW ── */}
        {isInfluencer && offer.status === 'pending' && (
          <InfluencerAcceptPanel offerId={offer.id} offerTitle={offer.title} onDone={refetch} />
        )}

        {isInfluencer && ['active', 'revision_requested'].includes(offer.status) && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-green-800">{offer.status === 'revision_requested' ? 'Revision requested' : 'Your project is live'}</h3>
              {offer.revisionNote && <p className="text-orange-700 text-sm mt-1 bg-orange-50 border border-orange-100 rounded-lg p-3">{offer.revisionNote}</p>}
            </CardContent>
          </Card>
        )}

        {/* ── BRAND VIEW: Payment flow ── */}
        {isBrand && offer.status === 'accepted' && (
          <Card className="border-0 shadow-sm border-2 border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <ShieldCheck className="w-5 h-5" /> Complete Payment to Admin Escrow
              </CardTitle>
              <CardDescription className="text-blue-700">
                Send ${money(offer.brandTotalCharge || Number(offer.budget) * 1.1)} USDT to the admin escrow wallet. This includes the project budget plus the 10% brand platform fee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Step guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { n: "1", label: "Choose network", icon: "🌐" },
                  { n: "2", label: "Send exact amount", icon: "💸" },
                  { n: "3", label: "Submit proof", icon: "📄" },
                ].map(s => (
                  <div key={s.n} className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{s.n}</div>
                    <span className="text-sm font-medium text-blue-900">{s.icon} {s.label}</span>
                  </div>
                ))}
              </div>

              {/* Network selection */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Select Payment Network</Label>
                {activeNetworks.length === 0 ? (
                  <p className="text-sm text-orange-600 bg-orange-50 rounded-xl p-3">No payment networks are active. Contact support.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeNetworks.map(net => {
                      const emoji: Record<string, string> = { tron: "🔴", ton: "💎", bsc: "🟡", eth: "🔷" };
                      return (
                        <button
                          key={net.networkKey}
                          onClick={() => setSelectedNetwork(net.network)}
                          data-testid={`network-${net.networkKey}`}
                          className={`p-3 border-2 rounded-xl text-center transition-all ${selectedNetwork === net.network ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
                        >
                          <div className="text-2xl mb-1">{emoji[net.network] || "💰"}</div>
                          <div className="font-semibold text-xs">{net.shortName}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Wallet address */}
              {(() => {
                const sel = activeNetworks.find(n => n.network === selectedNetwork);
                const addr = sel?.walletAddress || "";
                return (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <Label className="text-sm font-semibold">{sel?.name || "USDT"} Escrow Wallet Address</Label>
                    {sel?.description && <p className="text-xs text-gray-500">{sel.description}</p>}
                    <div className="flex items-center gap-2">
                      <Input value={addr || "Address not configured — contact support"} readOnly className="font-mono text-xs" data-testid="input-escrow-wallet" />
                      {addr && (
                        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(addr); toast({ title: "Copied!" }); }}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      Send exactly <strong className="mx-1">${money(offer.brandTotalCharge || Number(offer.budget) * 1.1)} USDT</strong> to this address only.
                    </div>
                  </div>
                );
              })()}

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                size="lg"
                onClick={() => setPaymentDialogOpen(true)}
                data-testid="button-submit-payment-proof"
              >
                <Upload className="w-4 h-4 mr-2" /> I've Sent Payment — Submit Proof
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment submitted / review */}
        {isBrand && offer.status === 'payment_submitted' && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardContent className="p-8 text-center">
              <div className="relative inline-block mb-5">
                <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-40 animate-pulse" />
                <div className="relative bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full p-5 inline-flex">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Proof Submitted!</h2>
              <p className="text-gray-600 mb-1">Our admin team is verifying your payment.</p>
              <p className="text-sm text-gray-500">Typically takes <strong>2–6 hours</strong>. Your project activates once confirmed.</p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                {[
                  { done: true,  label: "Payment Submitted",    desc: "Proof received by admin team" },
                  { done: false, label: "Verification",         desc: "Admin confirms payment" },
                  { done: false, label: "Project Activated",    desc: "Work begins!" },
                ].map((s, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${s.done ? "bg-green-50" : "bg-white border"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${s.done ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {s.done ? "✓" : i + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${s.done ? "text-green-700" : "text-gray-700"}`}>{s.label}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <PaymentProofAndVerification offer={offer} verification={verification} onOpenProof={() => setProofOpen(true)} />

              <div className="mt-6 flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => setAdminMsgOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
                  data-testid="button-message-admin"
                >
                  <MessageCircle className="w-4 h-4" /> Message Admin
                </button>
                <a href="https://wa.me/12016800266" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium">
                  <Phone className="w-4 h-4" /> WhatsApp Support
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active project */}
        {isBrand && offer.status === 'active' && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Project Active</h2>
              <p className="text-green-700">Payment confirmed. {offer.influencer?.firstName} is ready to start working!</p>
              {offer.activatedAt && (
                <p className="text-xs text-gray-500 mt-2">Activated {format(new Date(offer.activatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {['active', 'work_submitted', 'revision_requested', 'completed'].includes(offer.status) && (
          <ProjectWorkspace offer={offer} isBrand={isBrand} isInfluencer={isInfluencer} currentUserId={user?.id} onDone={refetch} />
        )}

        {/* Rejected offer */}
        {offer.status === 'rejected' && (
          <Card className="border-red-200 border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold text-red-700 mb-1">Offer Declined</h3>
              {offer.rejectionReason && <p className="text-sm text-gray-500">{offer.rejectionReason}</p>}
              {isBrand && (
                <Button className="mt-4" onClick={() => setLocation("/creators")}>
                  Browse Other Influencers
                </Button>
              )}
            </CardContent>
          </Card>
        )}

      </div>

      {/* Payment proof dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Payment Proof</DialogTitle>
            <DialogDescription>Provide your transaction hash and/or screenshot to confirm payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Transaction Hash *</Label>
              <Input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Paste your transaction hash here..." className="mt-1 font-mono text-sm" data-testid="input-tx-hash" />
            </div>
            <div>
              <Label>Payment Network</Label>
              <select value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)} className="w-full mt-1 border rounded-lg p-2 text-sm">
                <option value="tron">USDT (Tron/TRC-20)</option>
                <option value="bsc">USDT (BSC/BEP-20)</option>
                <option value="ton">USDT (TON)</option>
                <option value="eth">USDT (Ethereum)</option>
              </select>
            </div>
            <div>
              <Label>Screenshot (optional)</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => document.getElementById("dh-screenshot-input")?.click()}
                data-testid="dropzone-screenshot"
              >
                {screenshotPreview ? (
                  <img src={screenshotPreview} alt="proof" className="mx-auto max-h-32 object-contain rounded" />
                ) : (
                  <div className="text-gray-400 text-sm">Click to upload a screenshot</div>
                )}
                <input id="dh-screenshot-input" type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setScreenshotFile(f);
                    const reader = new FileReader();
                    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
                    reader.readAsDataURL(f);
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={submitPaymentMutation.isPending || !txHash.trim()}
                onClick={() => submitPaymentMutation.mutate()}
                data-testid="button-confirm-submit-payment"
              >
                {submitPaymentMutation.isPending ? "Submitting..." : "Submit Proof"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment proof</DialogTitle>
            <DialogDescription>Use your browser zoom controls if you need to inspect small text.</DialogDescription>
          </DialogHeader>
          {offer.paymentProof && (
            <img src={offer.paymentProof} alt="Payment proof" className="max-h-[75vh] w-full object-contain rounded-xl bg-black" data-testid="img-payment-proof-full" />
          )}
        </DialogContent>
      </Dialog>

      {/* Admin message dialog */}
      <Dialog open={adminMsgOpen} onOpenChange={setAdminMsgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-600" /> Message Admin</DialogTitle>
            <DialogDescription>Send a note to our team about your payment verification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              rows={5}
              placeholder={`Hi, I submitted payment for direct hire offer "${offer.title}". Please verify. Transaction: ...`}
              value={adminMsg}
              onChange={e => setAdminMsg(e.target.value)}
              data-testid="input-admin-message"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAdminMsgOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={sendAdminMsgMutation.isPending || !adminMsg.trim()}
                onClick={() => sendAdminMsgMutation.mutate()}
                data-testid="button-send-admin-msg"
              >
                {sendAdminMsgMutation.isPending ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function PaymentProofAndVerification({ offer, verification, onOpenProof }: { offer: any; verification: any; onOpenProof: () => void }) {
  if (!offer.paymentProof && !offer.transactionHash) return null;
  const statusClass: Record<string, string> = {
    verified: "bg-green-50 text-green-800 border-green-200",
    pending: "bg-yellow-50 text-yellow-800 border-yellow-200",
    failed: "bg-red-50 text-red-800 border-red-200",
    manual_review: "bg-blue-50 text-blue-800 border-blue-200",
    unavailable: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 text-left">
      {offer.paymentProof && (
        <button onClick={onOpenProof} className="rounded-xl border bg-white p-3 text-left hover:bg-gray-50" data-testid="button-open-proof">
          <p className="text-sm font-semibold text-gray-900">Payment screenshot</p>
          <img src={offer.paymentProof} alt="Payment proof thumbnail" className="mt-2 max-h-40 w-full object-contain rounded-lg bg-gray-100" data-testid="img-payment-proof-thumb" />
          <p className="mt-2 text-xs text-purple-700">Click to view full screen</p>
        </button>
      )}
      {verification && (
        <div className={`rounded-xl border p-4 ${statusClass[verification.status] || statusClass.unavailable}`} data-testid="card-blockchain-verification">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold">AI blockchain verification</p>
              <p className="text-xs mt-1">{verification.message}</p>
            </div>
            <Badge className="bg-white/70 text-current border-0">{verification.status?.replace("_", " ")}</Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div><span className="font-semibold">Network:</span> {verification.network || offer.paymentNetwork}</div>
            <div><span className="font-semibold">Expected:</span> ${money(verification.expectedAmount)}</div>
            <div><span className="font-semibold">Detected:</span> {verification.amount ? `$${money(verification.amount)}` : "Needs explorer check"}</div>
          </div>
          {verification.explorerUrl && (
            <a href={verification.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold underline" data-testid="link-explorer">
              Open blockchain explorer
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectWorkspace({ offer, isBrand, isInfluencer, currentUserId, onDone }: { offer: any; isBrand: boolean; isInfluencer: boolean; currentUserId?: string; onDone: () => void }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [workUrl, setWorkUrl] = useState(offer.workSubmissionUrl || "");
  const [workNote, setWorkNote] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: messagesData = [] } = useQuery<any[]>({
    queryKey: [`/api/direct-hire/${offer.id}/messages`],
    refetchInterval: offer.status === 'completed' ? false : 15000,
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: [`/api/direct-hire/${offer.id}/reviews`],
    enabled: offer.status === 'completed',
  });

  const sendMessage = useMutation({
    mutationFn: () => apiRequest("POST", `/api/direct-hire/${offer.id}/messages`, { content: message }).then(r => r.json()),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/direct-hire/${offer.id}/messages`] });
    },
    onError: (e: Error) => toast({ title: "Message failed", description: e.message, variant: "destructive" }),
  });

  const submitWork = useMutation({
    mutationFn: () => apiRequest("POST", `/api/direct-hire/${offer.id}/submit-work`, { workSubmissionUrl: workUrl, workSubmissionNote: workNote }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Work submitted", description: "The brand can now approve it or request changes." });
      queryClient.invalidateQueries({ queryKey: [`/api/direct-hire/${offer.id}`] });
      onDone();
    },
    onError: (e: Error) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const requestRevision = useMutation({
    mutationFn: () => apiRequest("POST", `/api/direct-hire/${offer.id}/request-revision`, { revisionNote }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Revision requested" });
      queryClient.invalidateQueries({ queryKey: [`/api/direct-hire/${offer.id}`] });
      onDone();
    },
    onError: (e: Error) => toast({ title: "Could not request revision", description: e.message, variant: "destructive" }),
  });

  const approveWork = useMutation({
    mutationFn: () => apiRequest("POST", `/api/direct-hire/${offer.id}/approve-work`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Project completed", description: "Creator earnings have moved to available balance." });
      queryClient.invalidateQueries({ queryKey: [`/api/direct-hire/${offer.id}`] });
      onDone();
    },
    onError: (e: Error) => toast({ title: "Approval failed", description: e.message, variant: "destructive" }),
  });

  const submitReview = useMutation({
    mutationFn: () => apiRequest("POST", `/api/direct-hire/${offer.id}/reviews`, { rating: reviewRating, comment: reviewComment }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Review posted" });
      setReviewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/direct-hire/${offer.id}/reviews`] });
    },
    onError: (e: Error) => toast({ title: "Review failed", description: e.message, variant: "destructive" }),
  });

  const alreadyReviewed = reviews.some((r: any) => r.reviewerId === currentUserId);

  return (
    <div className="mt-5 space-y-5">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="w-4 h-4 text-purple-600" /> Project chat</CardTitle>
          <CardDescription>Messages stay attached to this hire after activation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 overflow-y-auto rounded-xl border bg-gray-50 p-3 space-y-2">
            {messagesData.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No project messages yet.</p>}
            {messagesData.map((m: any) => {
              const mine = m.senderId === currentUserId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-purple-600 text-white" : "bg-white border text-gray-800"}`} data-testid={`message-${m.id}`}>
                    <p>{m.content}</p>
                    <p className={`text-[10px] mt-1 ${mine ? "text-purple-100" : "text-gray-400"}`}>{m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Write a project message..." data-testid="input-project-message" />
            <Button onClick={() => sendMessage.mutate()} disabled={!message.trim() || sendMessage.isPending} data-testid="button-send-project-message">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isInfluencer && ['active', 'revision_requested'].includes(offer.status) && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Submit work</CardTitle>
            <CardDescription>Send the final post, content link, or notes for brand approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={workUrl} onChange={e => setWorkUrl(e.target.value)} placeholder="Work URL, post link, file link..." data-testid="input-work-url" />
            <Textarea value={workNote} onChange={e => setWorkNote(e.target.value)} placeholder="Add a short delivery note..." rows={4} data-testid="input-work-note" />
            <Button onClick={() => submitWork.mutate()} disabled={submitWork.isPending || (!workUrl.trim() && !workNote.trim())} className="bg-green-600 hover:bg-green-700" data-testid="button-submit-work">
              {submitWork.isPending ? "Submitting..." : "Submit Work"}
            </Button>
          </CardContent>
        </Card>
      )}

      {offer.status === 'work_submitted' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Submitted work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {offer.workSubmissionUrl && <a href={offer.workSubmissionUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-purple-700 underline break-all" data-testid="link-submitted-work">{offer.workSubmissionUrl}</a>}
            {offer.workSubmissionNote && <p className="text-sm text-gray-700 whitespace-pre-line" data-testid="text-submitted-work-note">{offer.workSubmissionNote}</p>}
            {offer.workSubmittedAt && <p className="text-xs text-gray-500">Submitted {format(new Date(offer.workSubmittedAt), "MMM d, yyyy 'at' h:mm a")}</p>}
            {isBrand && (
              <div className="space-y-3 pt-2">
                <Textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)} placeholder="Revision note if changes are needed..." rows={3} data-testid="input-revision-note" />
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={() => approveWork.mutate()} disabled={approveWork.isPending} className="bg-green-600 hover:bg-green-700" data-testid="button-approve-work">
                    Approve and Release Payment
                  </Button>
                  <Button variant="outline" onClick={() => requestRevision.mutate()} disabled={!revisionNote.trim() || requestRevision.isPending} data-testid="button-request-revision">
                    Request Revision
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {offer.status === 'completed' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Mutual reviews</CardTitle>
            <CardDescription>Reviews from this project appear on user profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
            {reviews.map((r: any) => (
              <div key={r.id} className="rounded-xl border bg-white p-3" data-testid={`review-${r.id}`}>
                <p className="font-semibold text-yellow-600">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                {r.comment && <p className="text-sm text-gray-700 mt-1">{r.comment}</p>}
              </div>
            ))}
            {!alreadyReviewed && (
              <div className="rounded-xl border bg-gray-50 p-3 space-y-3">
                <Label>Leave a review</Label>
                <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="w-full rounded-lg border p-2 text-sm" data-testid="select-review-rating">
                  {[5, 4, 3, 2, 1].map(v => <option key={v} value={v}>{v} star{v === 1 ? "" : "s"}</option>)}
                </select>
                <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience..." rows={3} data-testid="input-review-comment" />
                <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} data-testid="button-submit-review">Post Review</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfluencerAcceptPanel({ offerId, offerTitle, onDone }: { offerId: string; offerTitle: string; onDone: () => void }) {
  const { toast } = useToast();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/direct-hire/${offerId}/accept`).then(r => r.json()),
    onSuccess: () => { toast({ title: "Offer accepted! 🎉", description: "The brand will be notified to make payment." }); onDone(); },
    onError: (e: Error) => toast({ title: "Failed to accept", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/direct-hire/${offerId}/reject`, { reason: rejectReason }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Offer declined" }); setRejectOpen(false); onDone(); },
    onError: (e: Error) => toast({ title: "Failed to decline", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="border-0 shadow-sm border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardContent className="p-6">
        <h3 className="font-bold text-purple-900 text-lg mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> You've received a hire offer!
        </h3>
        <p className="text-sm text-purple-700 mb-5">Review the details above and decide whether to accept or decline this offer.</p>
        <div className="flex gap-3 flex-wrap">
          <Button
            className="bg-green-600 hover:bg-green-700 flex-1"
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
            data-testid="button-accept-offer"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {acceptMutation.isPending ? "Accepting..." : "Accept Offer"}
          </Button>
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 flex-1" onClick={() => setRejectOpen(true)} data-testid="button-decline-offer">
            Decline
          </Button>
        </div>
      </CardContent>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline this offer?</DialogTitle>
            <DialogDescription>Optionally let the brand know why.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (optional)..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? "Declining..." : "Yes, Decline"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
