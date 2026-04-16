import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, CheckCircle, DollarSign, RefreshCcw, ShieldCheck, Store, XCircle } from "lucide-react";

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    funded: "bg-blue-100 text-blue-800",
    delivered: "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    disputed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-700",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>;
}

export default function AdminP2PTransactions() {
  const { toast } = useToast();
  const [note, setNote] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/p2p-transactions"] });
  const transactions = data?.transactions || [];
  const listings = data?.listings || [];
  const stats = data?.stats || { totalTransactions: 0, activeTrades: 0, disputes: 0, revenue: 0 };

  const adminAction = useMutation({
    mutationFn: ({ path, id }: { path: string; id: string }) => apiRequest("PATCH", path, { note: note[id] || "" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Action completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-transactions"] });
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const listingAction = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/admin/p2p-listings/${id}`, { status, adminNote: note[id] || "" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Listing updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-transactions"] });
    },
    onError: (e: Error) => toast({ title: "Listing update failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">P2P Escrow Control</h1>
            <p className="text-gray-500">View all trades, confirm payments, release funds, refund buyers, and manage listing approvals.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/p2p-fees"><Button variant="outline" data-testid="button-p2p-fees">P2P Fees</Button></Link>
            <Link href="/admin/platform-fees"><Button variant="outline" data-testid="button-platform-fees">Platform Fees</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="p-5"><ShieldCheck className="w-6 h-6 text-purple-600 mb-2" /><p className="text-sm text-gray-500">Total transactions</p><p className="text-2xl font-bold" data-testid="stat-total-transactions">{stats.totalTransactions}</p></CardContent></Card>
          <Card><CardContent className="p-5"><RefreshCcw className="w-6 h-6 text-blue-600 mb-2" /><p className="text-sm text-gray-500">Active trades</p><p className="text-2xl font-bold" data-testid="stat-active-trades">{stats.activeTrades}</p></CardContent></Card>
          <Card><CardContent className="p-5"><AlertTriangle className="w-6 h-6 text-red-600 mb-2" /><p className="text-sm text-gray-500">Disputes</p><p className="text-2xl font-bold" data-testid="stat-disputes">{stats.disputes}</p></CardContent></Card>
          <Card><CardContent className="p-5"><DollarSign className="w-6 h-6 text-green-600 mb-2" /><p className="text-sm text-gray-500">Fee revenue</p><p className="text-2xl font-bold" data-testid="stat-fee-revenue">${money(stats.revenue)}</p></CardContent></Card>
        </div>

        <Card className="mb-8">
          <CardHeader><CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" /> Listing approvals</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {listings.length === 0 && <p className="text-sm text-gray-500">No listings yet.</p>}
            {listings.map((listing: any) => (
              <div key={listing.id} className="rounded-xl border bg-white p-4" data-testid={`admin-listing-${listing.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold">{listing.title}</h3>
                    <p className="text-sm text-gray-500 capitalize">{listing.listingType} · ${money(listing.price)} · {listing.seller?.username || listing.seller?.firstName}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{listing.description}</p>
                  </div>
                  <StatusBadge status={listing.status} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 mt-3">
                  <Textarea value={note[listing.id] || ""} onChange={e => setNote(n => ({ ...n, [listing.id]: e.target.value }))} placeholder="Admin note..." rows={2} data-testid={`input-listing-note-${listing.id}`} />
                  <Button onClick={() => listingAction.mutate({ id: listing.id, status: "approved" })} disabled={listingAction.isPending || listing.status === "approved"} data-testid={`button-approve-listing-${listing.id}`}><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
                  <Button variant="destructive" onClick={() => listingAction.mutate({ id: listing.id, status: "rejected" })} disabled={listingAction.isPending || listing.status === "rejected"} data-testid={`button-reject-listing-${listing.id}`}><XCircle className="w-4 h-4 mr-2" />Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>All escrow transactions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-gray-500">Loading transactions...</p>}
            {transactions.map((tx: any) => (
              <div key={tx.id} className="rounded-xl border bg-white p-4" data-testid={`admin-p2p-transaction-${tx.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold">{tx.listing?.title || tx.id}</h3>
                    <p className="text-sm text-gray-500">Buyer: {tx.buyer?.username || tx.buyer?.firstName} · Seller: {tx.seller?.username || tx.seller?.firstName}</p>
                    <p className="text-sm font-semibold mt-1">Amount ${money(tx.amount)} · Fee ${money(tx.fee)} · Total ${money(tx.totalAmount)}</p>
                    {tx.paymentProof && <a href={tx.paymentProof} target="_blank" rel="noreferrer" className="text-xs text-purple-700 underline">View payment proof</a>}
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-2 mt-3">
                  <Textarea value={note[tx.id] || ""} onChange={e => setNote(n => ({ ...n, [tx.id]: e.target.value }))} placeholder="Admin decision note..." rows={2} data-testid={`input-tx-note-${tx.id}`} />
                  <Button variant="outline" onClick={() => adminAction.mutate({ id: tx.id, path: `/api/admin/p2p-transactions/${tx.id}/confirm-payment` })} disabled={adminAction.isPending || tx.status !== "pending"} data-testid={`button-confirm-payment-${tx.id}`}>Confirm Payment</Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => adminAction.mutate({ id: tx.id, path: `/api/admin/p2p-transactions/${tx.id}/release` })} disabled={adminAction.isPending || !["delivered", "disputed"].includes(tx.status)} data-testid={`button-release-${tx.id}`}>Release</Button>
                  <Button variant="destructive" onClick={() => adminAction.mutate({ id: tx.id, path: `/api/admin/p2p-transactions/${tx.id}/refund` })} disabled={adminAction.isPending || ["completed", "refunded", "cancelled"].includes(tx.status)} data-testid={`button-refund-${tx.id}`}>Refund</Button>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Link href={`/p2p-deals/${tx.id}`}><Button size="sm" variant="ghost" data-testid={`button-open-admin-deal-${tx.id}`}>Open deal room</Button></Link>
                  <a href={`https://wa.me/12016800266?text=P2P%20Transaction%20Alert%20${encodeURIComponent(tx.id)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" data-testid={`button-whatsapp-admin-${tx.id}`}>WhatsApp alert</Button></a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
