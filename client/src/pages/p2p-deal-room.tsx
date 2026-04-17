import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertTriangle, ArrowLeft, CheckCircle, Lock, MessageCircle,
  Send, ShieldCheck, Truck, Upload, Wallet, Clock, Package,
  KeyRound, Eye, EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

const DEAL_STAGES = [
  { key: "pending", label: "Awaiting Payment", icon: Clock },
  { key: "funded", label: "Funded", icon: ShieldCheck },
  { key: "delivered", label: "Delivered", icon: Truck },
  { key: "completed", label: "Complete", icon: CheckCircle },
];

function DealProgress({ status }: { status: string }) {
  const stageOrder = ["pending", "funded", "delivered", "completed"];
  const currentIdx = status === "disputed" ? stageOrder.indexOf("delivered") : stageOrder.indexOf(status);

  return (
    <div className="flex items-center justify-between w-full">
      {DEAL_STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const disputed = status === "disputed" && idx === currentIdx;
        return (
          <div key={stage.key} className="flex-1 flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 transition-all ${
              disputed ? "bg-red-500" :
              done ? "bg-green-500" :
              active ? "bg-violet-600 ring-4 ring-violet-200" :
              "bg-gray-200"
            }`}>
              <Icon className={`w-4 h-4 ${done || active || disputed ? "text-white" : "text-gray-400"}`} />
            </div>
            <p className={`text-[10px] font-semibold text-center leading-tight ${
              disputed ? "text-red-600" : done ? "text-green-600" : active ? "text-violet-700" : "text-gray-400"
            }`}>{stage.label}</p>
            {idx < DEAL_STAGES.length - 1 && (
              <div className={`absolute top-[18px] w-full h-0.5 ${done ? "bg-green-400" : "bg-gray-200"}`} style={{ left: "50%", width: "100%", zIndex: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function P2PDealRoom() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showRoomId, setShowRoomId] = useState(false);

  const listMode = !id;

  const { data: deals = [] } = useQuery<any[]>({
    queryKey: ["/api/p2p/transactions"],
    enabled: listMode,
  });

  const { data: tx, isLoading } = useQuery<any>({
    queryKey: [`/api/p2p/transactions/${id}`],
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: [`/api/p2p/transactions/${id}/messages`],
    enabled: !!id,
    refetchInterval: 10000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/p2p/transactions/${id}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/p2p/transactions/${id}/messages`] });
    queryClient.invalidateQueries({ queryKey: ["/api/p2p/transactions"] });
  };

  const sendMessage = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("content", message);
      if (attachment) fd.append("attachment", attachment);
      const res = await fetch(`/api/p2p/transactions/${id}/messages`, { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to send message");
      return res.json();
    },
    onSuccess: () => { setMessage(""); setAttachment(null); invalidate(); },
    onError: (e: Error) => toast({ title: "Message failed", description: e.message, variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("paymentNote", paymentNote);
      if (paymentProof) fd.append("paymentProof", paymentProof);
      const res = await fetch(`/api/p2p/transactions/${id}/mark-paid`, { method: "PATCH", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to mark paid");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Payment marked" }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not mark paid", description: e.message, variant: "destructive" }),
  });

  const deliver = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/p2p/transactions/${id}/deliver`, { deliveryNote }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Delivery submitted" }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not deliver", description: e.message, variant: "destructive" }),
  });

  const confirmReceived = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/p2p/transactions/${id}/confirm-received`).then(r => r.json()),
    onSuccess: () => { toast({ title: "Receipt confirmed", description: "Admin can now release escrow." }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not confirm", description: e.message, variant: "destructive" }),
  });

  const dispute = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/p2p/transactions/${id}/dispute`, { reason: disputeReason }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Dispute opened" }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not open dispute", description: e.message, variant: "destructive" }),
  });

  /* ── LIST MODE ── */
  if (listMode) {
    return (
      <div className="min-h-screen bg-gray-950">
        <NavigationFixed />
        <main className="max-w-5xl mx-auto px-4 py-10">
          {/* Private header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-900/40">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">My Private Deal Rooms</h1>
              <p className="text-gray-400 text-sm">Secure escrow trades visible only to you, your counterpart, and the admin.</p>
            </div>
          </div>

          <div className="flex justify-end mb-6">
            <Link href="/p2p-hub"><Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" data-testid="button-back-p2p-hub">P2P Market</Button></Link>
          </div>

          <div className="space-y-4">
            {deals.length === 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-16 text-center">
                <Lock className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold mb-1">No active deal rooms</p>
                <p className="text-gray-600 text-sm mb-4">Accept a listing in the P2P market to open your first private deal room.</p>
                <Link href="/p2p-hub"><Button className="bg-violet-600 hover:bg-violet-700" data-testid="button-goto-market">Browse P2P Market</Button></Link>
              </div>
            )}
            {deals.map((deal: any) => {
              const statusColors: Record<string, string> = {
                pending: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
                funded: "bg-blue-900/40 text-blue-300 border-blue-800",
                delivered: "bg-indigo-900/40 text-indigo-300 border-indigo-800",
                completed: "bg-green-900/40 text-green-300 border-green-800",
                disputed: "bg-red-900/40 text-red-300 border-red-800",
                refunded: "bg-gray-700/40 text-gray-400 border-gray-700",
              };
              return (
                <div key={deal.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex items-center justify-between gap-4 flex-wrap hover:border-violet-700/50 transition-colors" data-testid={`card-p2p-deal-${deal.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-900/50 flex items-center justify-center flex-shrink-0">
                      <KeyRound className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white">{deal.listing?.title || "P2P Deal"}</h2>
                      <p className="text-sm text-gray-400">with {deal.buyer?.username || deal.buyer?.firstName} &amp; {deal.seller?.username || deal.seller?.firstName}</p>
                      <p className="text-sm font-semibold text-violet-300 mt-0.5">${money(deal.totalAmount)} total · ${money(deal.fee)} fee</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`capitalize font-semibold ${statusColors[deal.status] || "bg-gray-800 text-gray-400 border-gray-700"}`}>{deal.status}</Badge>
                    <Link href={`/p2p-deals/${deal.id}`}><Button className="bg-violet-600 hover:bg-violet-700 text-white" data-testid={`button-open-deal-${deal.id}`}>Enter Room</Button></Link>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  /* ── LOADING ── */
  if (isLoading || !tx) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Entering secure deal room...</p>
        </div>
      </div>
    );
  }

  const isBuyer = tx.buyerId === (user as any)?.id;
  const isSeller = tx.sellerId === (user as any)?.id;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    funded: "bg-blue-900/40 text-blue-300 border-blue-700",
    delivered: "bg-indigo-900/40 text-indigo-300 border-indigo-700",
    completed: "bg-green-900/40 text-green-300 border-green-700",
    disputed: "bg-red-900/40 text-red-300 border-red-700",
    refunded: "bg-gray-800/60 text-gray-400 border-gray-700",
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <NavigationFixed />
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Private Room Header */}
        <div className="mb-6 rounded-2xl border border-violet-800/40 bg-gradient-to-r from-violet-950/60 to-gray-900/80 p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/p2p-deals">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-1.5 -ml-2" data-testid="button-back-deals">
                  <ArrowLeft className="w-4 h-4" /> My Deals
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">Secure Room Active</span>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-xl shadow-purple-900/40">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-white" data-testid="text-deal-title">
                  {tx.listing?.title || "P2P Deal"}
                </h1>
                <Badge variant="outline" className={`capitalize font-semibold ${statusColors[tx.status] || "bg-gray-800 text-gray-400 border-gray-700"}`} data-testid="status-deal">
                  {tx.status}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm capitalize">{tx.transactionType} · via {tx.listing?.paymentMethod}</p>

              {/* Room ID */}
              <div className="mt-2 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs text-gray-600 font-mono">
                  Room ID: {showRoomId ? tx.id : "••••••••••••••••"}
                </span>
                <button onClick={() => setShowRoomId(s => !s)} className="text-gray-600 hover:text-gray-400 transition-colors">
                  {showRoomId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="mt-5 relative">
            <DealProgress status={tx.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: financials + chat */}
          <div className="lg:col-span-2 space-y-5">
            {/* Financials */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-2xl font-black text-white">${money(tx.amount)}</p>
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
                <p className="text-xs text-gray-500 mb-1">Platform Fee</p>
                <p className="text-2xl font-black text-violet-400">${money(tx.fee)}</p>
              </div>
              <div className="rounded-2xl bg-gray-900 border border-violet-800/40 p-4">
                <p className="text-xs text-gray-500 mb-1">Total Due</p>
                <p className="text-2xl font-black text-green-400">${money(tx.totalAmount)}</p>
              </div>
            </div>

            {/* Chat */}
            <Card className="border-gray-800 bg-gray-900 shadow-none">
              <CardHeader className="border-b border-gray-800 pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <MessageCircle className="w-5 h-5 text-violet-400" /> Private Deal Room Chat
                </CardTitle>
                <CardDescription className="text-gray-500 text-xs">Encrypted conversation — visible only to buyer, seller, and admin</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-96 overflow-y-auto bg-gray-950 rounded-xl border border-gray-800 p-3 space-y-2">
                  {(messages as any[]).length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Lock className="w-10 h-10 text-gray-800 mb-2" />
                      <p className="text-gray-600 text-sm">No messages yet. Say hello to get started.</p>
                    </div>
                  )}
                  {(messages as any[]).map((m: any) => {
                    const mine = m.senderId === (user as any)?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-violet-600 text-white" : "bg-gray-800 border border-gray-700 text-gray-200"}`} data-testid={`message-p2p-${m.id}`}>
                          <p>{m.content}</p>
                          {m.attachmentUrl && (
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="underline text-xs block mt-1 opacity-80">View attachment</a>
                          )}
                          <p className={`text-[10px] mt-1 ${mine ? "text-violet-200" : "text-gray-500"}`}>
                            {m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type a secure message..."
                    className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 focus:border-violet-600"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (message.trim()) sendMessage.mutate(); } }}
                    data-testid="input-p2p-message"
                  />
                  <Input type="file" onChange={e => setAttachment(e.target.files?.[0] || null)} className="bg-gray-900 border-gray-700 text-gray-400 text-xs" data-testid="input-p2p-attachment" />
                  <Button
                    onClick={() => sendMessage.mutate()}
                    disabled={sendMessage.isPending || (!message.trim() && !attachment)}
                    className="bg-violet-600 hover:bg-violet-700"
                    data-testid="button-send-p2p-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Escrow actions + people */}
          <div className="space-y-5">
            {/* Escrow actions */}
            <Card className="border-gray-800 bg-gray-900 shadow-none">
              <CardHeader className="border-b border-gray-800 pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> Escrow Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {isBuyer && tx.status === "pending" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-yellow-900/20 border border-yellow-800/40 p-3">
                      <p className="text-sm text-yellow-300 font-semibold mb-1">Step 1: Send payment to escrow</p>
                      <p className="text-xs text-yellow-400/80">Send <span className="font-black">${money(tx.totalAmount)}</span> to the admin escrow wallet, then mark as paid below.</p>
                    </div>
                    <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Payment note or transaction hash..." rows={3} className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 text-sm" data-testid="input-payment-note" />
                    <Input type="file" accept="image/*" onChange={e => setPaymentProof(e.target.files?.[0] || null)} className="bg-gray-800 border-gray-700 text-gray-400 text-xs" data-testid="input-payment-proof" />
                    <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => markPaid.mutate()} disabled={markPaid.isPending} data-testid="button-mark-paid">
                      <Upload className="w-4 h-4 mr-2" /> Mark as Paid
                    </Button>
                  </div>
                )}

                {isSeller && tx.status === "funded" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-blue-900/20 border border-blue-800/40 p-3">
                      <p className="text-sm text-blue-300 font-semibold mb-1">Step 2: Deliver your offer</p>
                      <p className="text-xs text-blue-400/80">Buyer's funds are secured in escrow. Deliver your product/service, then submit delivery details.</p>
                    </div>
                    <Textarea value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Delivery details, tracking number, wallet address..." rows={4} className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 text-sm" data-testid="input-delivery-note" />
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => deliver.mutate()} disabled={deliver.isPending || !deliveryNote.trim()} data-testid="button-deliver">
                      <Truck className="w-4 h-4 mr-2" /> Confirm Delivery
                    </Button>
                  </div>
                )}

                {isBuyer && tx.status === "delivered" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-indigo-900/20 border border-indigo-800/40 p-3">
                      <p className="text-sm text-indigo-300 font-semibold mb-1">Step 3: Confirm receipt</p>
                      <p className="text-xs text-indigo-400/80">Seller has marked delivery. Confirm you've received it to allow admin to release funds.</p>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => confirmReceived.mutate()} disabled={confirmReceived.isPending} data-testid="button-confirm-received">
                      <CheckCircle className="w-4 h-4 mr-2" /> Confirm Received
                    </Button>
                  </div>
                )}

                {tx.status === "completed" && (
                  <div className="rounded-xl bg-green-900/20 border border-green-800/40 p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-green-300 font-bold">Deal Complete</p>
                    <p className="text-green-400/70 text-xs mt-1">Funds have been released. Thank you for trading on Taskdrip.</p>
                  </div>
                )}

                {tx.buyerConfirmedAt && tx.status !== "completed" && (
                  <p className="text-sm text-green-400 bg-green-900/20 border border-green-800/40 rounded-xl p-3">
                    ✓ Buyer confirmed receipt. Admin will release funds shortly.
                  </p>
                )}

                {tx.status === "disputed" && (
                  <div className="rounded-xl bg-red-900/20 border border-red-800/40 p-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mb-1" />
                    <p className="text-red-300 font-semibold text-sm">Dispute in progress</p>
                    <p className="text-red-400/70 text-xs mt-0.5">Admin is reviewing this dispute and will resolve it shortly.</p>
                  </div>
                )}

                {!["completed", "refunded", "cancelled", "disputed"].includes(tx.status) && (isBuyer || isSeller) && (
                  <div className="space-y-3 border-t border-gray-800 pt-4">
                    <p className="text-xs text-gray-500 font-semibold">— Open a Dispute —</p>
                    <Textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Explain the issue clearly..." rows={3} className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 text-sm" data-testid="input-dispute-reason" />
                    <Button variant="destructive" className="w-full" onClick={() => dispute.mutate()} disabled={!disputeReason.trim() || dispute.isPending} data-testid="button-open-dispute">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Open Dispute
                    </Button>
                  </div>
                )}

                <a href={`https://wa.me/12016800266?text=P2P%20Transaction%20Alert%20${encodeURIComponent(tx.id)}`} target="_blank" rel="noreferrer" className="block">
                  <Button variant="outline" className="w-full border-gray-700 text-gray-400 hover:bg-gray-800" data-testid="button-whatsapp-alert">WhatsApp Admin Alert</Button>
                </a>
              </CardContent>
            </Card>

            {/* People card */}
            <Card className="border-gray-800 bg-gray-900 shadow-none">
              <CardHeader className="pb-3 border-b border-gray-800">
                <CardTitle className="text-base flex items-center gap-2 text-white"><Wallet className="w-4 h-4 text-gray-400" /> Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pt-4">
                {[
                  { label: "Buyer", value: tx.buyer?.username || tx.buyer?.firstName, icon: Package },
                  { label: "Seller", value: tx.seller?.username || tx.seller?.firstName, icon: Package },
                  { label: "Admin", value: tx.admin?.username || tx.admin?.firstName || "Platform admin", icon: ShieldCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">{label}</p>
                      <p className="text-white font-semibold">{value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
