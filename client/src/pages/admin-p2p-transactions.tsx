import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertTriangle, CheckCircle, Database, DollarSign, Edit3,
  ExternalLink, RefreshCcw, ShieldCheck, Star, Store, XCircle, Clock, Zap,
  Trash2,
} from "lucide-react";

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    funded: "bg-blue-100 text-blue-800 border-blue-200",
    delivered: "bg-indigo-100 text-indigo-800 border-indigo-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    disputed: "bg-red-100 text-red-800 border-red-200",
    refunded: "bg-gray-100 text-gray-700 border-gray-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    removed: "bg-gray-100 text-gray-700 border-gray-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
    expired: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return <Badge variant="outline" className={`capitalize font-semibold ${map[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>{status}</Badge>;
}

function EditListingDialog({ listing, onSave }: { listing: any; onSave: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: listing.title || "",
    description: listing.description || "",
    price: listing.price || "",
    paymentMethod: listing.paymentMethod || "",
    featuredImage: listing.featuredImage || "",
    listingType: listing.listingType || "crypto",
    status: listing.status || "pending",
    adminNote: listing.adminNote || "",
    isFeatured: listing.isFeatured || false,
  });

  const editMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/admin/p2p-listings/${listing.id}`, form).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Listing saved", description: "Changes applied successfully." });
      setOpen(false);
      onSave();
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" data-testid={`button-edit-listing-${listing.id}`}>
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Edit Listing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Type</Label>
              <select value={form.listingType} onChange={e => setForm(f => ({ ...f, listingType: e.target.value }))} className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="crypto">Crypto</option>
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Status</Label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Price (USD)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Payment method</Label>
              <Input value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Featured image URL</Label>
            <Input value={form.featuredImage} onChange={e => setForm(f => ({ ...f, featuredImage: e.target.value }))} placeholder="https://..." className="text-sm" />
            {form.featuredImage && (
              <img src={form.featuredImage} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg border" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFeatured"
              checked={form.isFeatured}
              onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 accent-purple-600"
            />
            <label htmlFor="isFeatured" className="text-sm font-semibold cursor-pointer">⭐ Feature on Homepage</label>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Admin note</Label>
            <Textarea value={form.adminNote} onChange={e => setForm(f => ({ ...f, adminNote: e.target.value }))} rows={2} className="text-sm resize-none" placeholder="Internal note..." />
          </div>
          <Button className="w-full font-bold rounded-xl" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
            {editMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminP2PTransactions() {
  const { toast } = useToast();
  const [note, setNote] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/admin/p2p-transactions"] });
  const transactions = data?.transactions || [];
  const listings = data?.listings || [];
  const stats = data?.stats || { totalTransactions: 0, activeTrades: 0, disputes: 0, revenue: 0 };

  const adminAction = useMutation({
    mutationFn: ({ path, id }: { path: string; id: string }) =>
      apiRequest("PATCH", path, { note: note[id] || "" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Action completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-transactions"] });
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const listingAction = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, any> }) =>
      apiRequest("PATCH", `/api/admin/p2p-listings/${id}`, { ...updates, adminNote: note[id] || "" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Listing updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-transactions"] });
    },
    onError: (e: Error) => toast({ title: "Listing update failed", description: e.message, variant: "destructive" }),
  });

  const removeListing = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/p2p-listings/${id}`).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Listing removed", description: "The listing was permanently removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/p2p/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/p2p/listings/featured"] });
    },
    onError: (e: Error) => toast({ title: "Remove failed", description: e.message, variant: "destructive" }),
  });

  const seedDemos = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/p2p-seed", {}).then(r => r.json()),
    onSuccess: (data: any) => {
      toast({ title: data.message || "Demo listings seeded!", description: data.listings ? `${data.listings.length} demo listing(s) added and approved.` : undefined });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-transactions"] });
    },
    onError: (e: Error) => toast({ title: "Seed failed", description: e.message, variant: "destructive" }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-transactions"] });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">P2P Escrow Control</h1>
            <p className="text-gray-500 text-sm mt-1">Manage listings, feature on homepage, expire, reactivate, confirm payments, and resolve disputes.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={() => seedDemos.mutate()}
              disabled={seedDemos.isPending}
              data-testid="button-seed-demos"
            >
              <Database className="w-4 h-4" />
              {seedDemos.isPending ? "Seeding..." : "Seed Demo Listings"}
            </Button>
            <Link href="/admin/p2p-fees"><Button variant="outline" data-testid="button-p2p-fees">P2P Fees</Button></Link>
            <Link href="/admin/platform-fees"><Button variant="outline" data-testid="button-platform-fees">Platform Fees</Button></Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <ShieldCheck className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-xs text-gray-500 mb-0.5">Total transactions</p>
              <p className="text-2xl font-bold" data-testid="stat-total-transactions">{stats.totalTransactions}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <RefreshCcw className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-xs text-gray-500 mb-0.5">Active trades</p>
              <p className="text-2xl font-bold" data-testid="stat-active-trades">{stats.activeTrades}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
              <p className="text-xs text-gray-500 mb-0.5">Disputes</p>
              <p className="text-2xl font-bold" data-testid="stat-disputes">{stats.disputes}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <DollarSign className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-xs text-gray-500 mb-0.5">Fee revenue</p>
              <p className="text-2xl font-bold" data-testid="stat-fee-revenue">${money(stats.revenue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Listing management */}
        <Card className="mb-8 border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="w-5 h-5 text-purple-600" /> Listing Management
              <Badge className="ml-auto text-xs" variant="secondary">{listings.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {isLoading && <p className="text-sm text-gray-400 py-4 text-center">Loading listings...</p>}
            {!isLoading && listings.length === 0 && (
              <div className="text-center py-10">
                <Store className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">No listings yet. Click "Seed Demo Listings" to add demo data.</p>
                <Button size="sm" variant="outline" onClick={() => seedDemos.mutate()} disabled={seedDemos.isPending} className="gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Seed Demo Listings
                </Button>
              </div>
            )}
            {listings.map((listing: any) => (
              <div key={listing.id} className="rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow" data-testid={`admin-listing-${listing.id}`}>
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  {listing.featuredImage ? (
                    <img src={listing.featuredImage} alt={listing.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Store className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 leading-tight">{listing.title}</h3>
                          {listing.isFeatured && <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs gap-1"><Star className="w-3 h-3" />Featured</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">
                          {listing.listingType} · ${money(listing.price)} · {listing.paymentMethod}
                          {listing.seller && <> · by <span className="font-medium text-gray-700">{listing.seller.username || listing.seller.firstName}</span></>}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{listing.description}</p>
                        {listing.adminNote && <p className="text-xs text-purple-600 mt-1 italic">Note: {listing.adminNote}</p>}
                      </div>
                      <StatusBadge status={listing.status} />
                    </div>
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <EditListingDialog listing={listing} onSave={invalidate} />

                      {/* Approve */}
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => listingAction.mutate({ id: listing.id, updates: { status: "approved" } })}
                        disabled={listingAction.isPending || listing.status === "approved"}
                        data-testid={`button-approve-listing-${listing.id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>

                      {/* Expire */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={() => listingAction.mutate({ id: listing.id, updates: { status: "expired" } })}
                        disabled={listingAction.isPending || listing.status === "expired"}
                        data-testid={`button-expire-listing-${listing.id}`}
                      >
                        <Clock className="w-3.5 h-3.5" /> Expire
                      </Button>

                      {/* Reactivate */}
                      {listing.status === "expired" && (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={() => listingAction.mutate({ id: listing.id, updates: { status: "approved" } })}
                          disabled={listingAction.isPending}
                          data-testid={`button-reactivate-listing-${listing.id}`}
                        >
                          <Zap className="w-3.5 h-3.5" /> Reactivate
                        </Button>
                      )}

                      {/* Feature toggle */}
                      <Button
                        size="sm"
                        variant={listing.isFeatured ? "default" : "outline"}
                        className={`gap-1.5 ${listing.isFeatured ? "bg-yellow-500 hover:bg-yellow-600 text-white border-0" : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"}`}
                        onClick={() => listingAction.mutate({ id: listing.id, updates: { isFeatured: !listing.isFeatured } })}
                        disabled={listingAction.isPending}
                        data-testid={`button-feature-listing-${listing.id}`}
                      >
                        <Star className="w-3.5 h-3.5" /> {listing.isFeatured ? "Unfeature" : "Feature"}
                      </Button>

                      {/* Reject */}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => listingAction.mutate({ id: listing.id, updates: { status: "rejected" } })}
                        disabled={listingAction.isPending || listing.status === "rejected"}
                        data-testid={`button-reject-listing-${listing.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Remove "${listing.title}" permanently? This cannot be undone.`)) {
                            removeListing.mutate(listing.id);
                          }
                        }}
                        disabled={removeListing.isPending}
                        data-testid={`button-remove-listing-${listing.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </Button>

                      <div className="flex-1">
                        <Input
                          value={note[listing.id] || ""}
                          onChange={e => setNote(n => ({ ...n, [listing.id]: e.target.value }))}
                          placeholder="Admin note..."
                          className="text-xs h-8"
                          data-testid={`input-listing-note-${listing.id}`}
                        />
                      </div>
                    </div>

                    {/* View on site */}
                    <div className="mt-2">
                      <Link href={`/p2p/${listing.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-purple-700 hover:text-purple-900" data-testid={`button-view-listing-${listing.id}`}>
                          <ExternalLink className="w-3 h-3" /> View public page
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Escrow Transactions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-purple-600" /> Escrow Transactions
              <Badge className="ml-auto text-xs" variant="secondary">{transactions.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isLoading && <p className="text-sm text-gray-400 py-4 text-center">Loading transactions...</p>}
            {!isLoading && transactions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
            )}
            {transactions.map((tx: any) => (
              <div key={tx.id} className="rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow" data-testid={`admin-p2p-transaction-${tx.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 leading-tight">{tx.listing?.title || `Transaction ${tx.id}`}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Buyer: <span className="font-medium text-gray-700">{tx.buyer?.username || tx.buyer?.firstName || "—"}</span>
                      {" · "}Seller: <span className="font-medium text-gray-700">{tx.seller?.username || tx.seller?.firstName || "—"}</span>
                    </p>
                    <p className="text-sm font-bold mt-1.5 text-gray-800">
                      ${money(tx.amount)} <span className="text-gray-400 font-normal text-xs">+ ${money(tx.fee)} fee</span>
                      {" "}= <span className="text-purple-700">${money(tx.totalAmount)}</span>
                    </p>
                    {tx.paymentProof && (
                      <a href={tx.paymentProof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-700 underline mt-1">
                        <ExternalLink className="w-3 h-3" /> View payment proof
                      </a>
                    )}
                    {tx.adminNote && <p className="text-xs text-gray-500 italic mt-1">Note: {tx.adminNote}</p>}
                  </div>
                  <StatusBadge status={tx.status} />
                </div>

                <div className="flex flex-wrap gap-2 mt-3 items-center">
                  <Textarea
                    value={note[tx.id] || ""}
                    onChange={e => setNote(n => ({ ...n, [tx.id]: e.target.value }))}
                    placeholder="Decision note..."
                    rows={1}
                    className="flex-1 min-w-[180px] text-xs resize-none"
                    data-testid={`input-tx-note-${tx.id}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adminAction.mutate({ id: tx.id, path: `/api/admin/p2p-transactions/${tx.id}/confirm-payment` })}
                    disabled={adminAction.isPending || tx.status !== "pending"}
                    data-testid={`button-confirm-payment-${tx.id}`}
                  >
                    Confirm Payment
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => adminAction.mutate({ id: tx.id, path: `/api/admin/p2p-transactions/${tx.id}/release` })}
                    disabled={adminAction.isPending || !["delivered", "disputed"].includes(tx.status)}
                    data-testid={`button-release-${tx.id}`}
                  >
                    Release
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => adminAction.mutate({ id: tx.id, path: `/api/admin/p2p-transactions/${tx.id}/refund` })}
                    disabled={adminAction.isPending || ["completed", "refunded", "cancelled"].includes(tx.status)}
                    data-testid={`button-refund-${tx.id}`}
                  >
                    Refund
                  </Button>
                </div>

                <div className="mt-2 flex gap-2 flex-wrap">
                  <Link href={`/p2p-deals/${tx.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" data-testid={`button-open-admin-deal-${tx.id}`}>
                      Open deal room
                    </Button>
                  </Link>
                  <a href={`https://wa.me/12016800266?text=P2P%20Transaction%20Alert%20${encodeURIComponent(tx.id)}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" data-testid={`button-whatsapp-admin-${tx.id}`}>
                      WhatsApp alert
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
