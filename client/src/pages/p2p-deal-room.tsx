import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, ArrowLeft, CheckCircle, MessageCircle, Send, ShieldCheck, Truck, Upload, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    funded: "bg-blue-100 text-blue-800",
    delivered: "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    disputed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
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
    onSuccess: () => {
      setMessage("");
      setAttachment(null);
      invalidate();
    },
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

  if (listMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">My P2P Deals</h1>
              <p className="text-gray-500">Track escrow trades, deliveries, and disputes.</p>
            </div>
            <Link href="/p2p-hub"><Button data-testid="button-back-p2p-hub">P2P Hub</Button></Link>
          </div>
          <div className="space-y-4">
            {deals.length === 0 && <Card><CardContent className="py-16 text-center text-gray-500">No P2P deals yet.</CardContent></Card>}
            {deals.map((deal: any) => (
              <Card key={deal.id} data-testid={`card-p2p-deal-${deal.id}`}>
                <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-bold">{deal.listing?.title || "P2P Deal"}</h2>
                    <p className="text-sm text-gray-500">Buyer: {deal.buyer?.username || deal.buyer?.firstName} · Seller: {deal.seller?.username || deal.seller?.firstName}</p>
                    <p className="text-sm font-semibold mt-1">Total ${money(deal.totalAmount)} · Fee ${money(deal.fee)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColor(deal.status)}>{deal.status}</Badge>
                    <Link href={`/p2p-deals/${deal.id}`}><Button variant="outline" data-testid={`button-open-deal-${deal.id}`}>Open</Button></Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading || !tx) {
    return <div className="min-h-screen bg-gray-50"><NavigationFixed /><div className="p-10 text-center text-gray-500">Loading deal room...</div></div>;
  }

  const isBuyer = tx.buyerId === (user as any)?.id;
  const isSeller = tx.sellerId === (user as any)?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/p2p-deals"><Button variant="outline" className="mb-5" data-testid="button-back-deals"><ArrowLeft className="w-4 h-4 mr-2" /> My Deals</Button></Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-2xl" data-testid="text-deal-title">{tx.listing?.title || "P2P Deal"}</CardTitle>
                    <CardDescription>{tx.transactionType} · {tx.listing?.paymentMethod}</CardDescription>
                  </div>
                  <Badge className={statusColor(tx.status)} data-testid="status-deal">{tx.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-white border p-4"><p className="text-xs text-gray-500">Amount</p><p className="text-xl font-bold">${money(tx.amount)}</p></div>
                <div className="rounded-xl bg-white border p-4"><p className="text-xs text-gray-500">Fee</p><p className="text-xl font-bold text-purple-700">${money(tx.fee)}</p></div>
                <div className="rounded-xl bg-white border p-4"><p className="text-xs text-gray-500">Total due</p><p className="text-xl font-bold text-green-700">${money(tx.totalAmount)}</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-purple-600" /> Deal room chat</CardTitle>
                <CardDescription>Buyer, seller, and admin can review proof here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-y-auto bg-gray-50 rounded-xl border p-3 space-y-2">
                  {messages.map((m: any) => {
                    const mine = m.senderId === (user as any)?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-black text-white" : "bg-white border text-gray-900"}`} data-testid={`message-p2p-${m.id}`}>
                          <p>{m.content}</p>
                          {m.attachmentUrl && <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="underline text-xs block mt-1">View attachment</a>}
                          <p className={`text-[10px] mt-1 ${mine ? "text-gray-300" : "text-gray-400"}`}>{m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                  <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message..." data-testid="input-p2p-message" />
                  <Input type="file" onChange={e => setAttachment(e.target.files?.[0] || null)} data-testid="input-p2p-attachment" />
                  <Button onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || (!message.trim() && !attachment)} data-testid="button-send-p2p-message"><Send className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600" /> Escrow actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isBuyer && tx.status === "pending" && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Send ${money(tx.totalAmount)} to the admin escrow wallet, then mark as paid.</p>
                    <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Payment note or transaction hash..." rows={3} data-testid="input-payment-note" />
                    <Input type="file" accept="image/*" onChange={e => setPaymentProof(e.target.files?.[0] || null)} data-testid="input-payment-proof" />
                    <Button className="w-full" onClick={() => markPaid.mutate()} disabled={markPaid.isPending} data-testid="button-mark-paid"><Upload className="w-4 h-4 mr-2" /> Mark as Paid</Button>
                  </div>
                )}
                {isSeller && tx.status === "funded" && (
                  <div className="space-y-3">
                    <Textarea value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Delivery details, tracking, wallet transfer note..." rows={4} data-testid="input-delivery-note" />
                    <Button className="w-full" onClick={() => deliver.mutate()} disabled={deliver.isPending || !deliveryNote.trim()} data-testid="button-deliver"><Truck className="w-4 h-4 mr-2" /> Confirm Delivery</Button>
                  </div>
                )}
                {isBuyer && tx.status === "delivered" && (
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => confirmReceived.mutate()} disabled={confirmReceived.isPending} data-testid="button-confirm-received"><CheckCircle className="w-4 h-4 mr-2" /> Confirm Received</Button>
                )}
                {tx.buyerConfirmedAt && <p className="text-sm text-green-700 bg-green-50 rounded-xl p-3">Buyer confirmed receipt. Admin can release funds.</p>}
                {!["completed", "refunded", "cancelled", "disputed"].includes(tx.status) && (isBuyer || isSeller) && (
                  <div className="space-y-3 border-t pt-4">
                    <Textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Explain the issue..." rows={3} data-testid="input-dispute-reason" />
                    <Button variant="destructive" className="w-full" onClick={() => dispute.mutate()} disabled={!disputeReason.trim() || dispute.isPending} data-testid="button-open-dispute"><AlertTriangle className="w-4 h-4 mr-2" /> Open Dispute</Button>
                  </div>
                )}
                <a href={`https://wa.me/12016800266?text=P2P%20Transaction%20Alert%20${encodeURIComponent(tx.id)}`} target="_blank" rel="noreferrer" className="block">
                  <Button variant="outline" className="w-full" data-testid="button-whatsapp-alert">WhatsApp Admin Alert</Button>
                </a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" /> People</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="text-gray-500">Buyer:</span> {tx.buyer?.username || tx.buyer?.firstName}</p>
                <p><span className="text-gray-500">Seller:</span> {tx.seller?.username || tx.seller?.firstName}</p>
                <p><span className="text-gray-500">Admin:</span> {tx.admin?.username || tx.admin?.firstName || "Pending assignment"}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
