import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { Briefcase, Coins, Package, Plus, ShieldCheck, Star, Store, Users } from "lucide-react";

const tabs = [
  { key: "crypto", label: "Crypto Trades", icon: Coins },
  { key: "product", label: "Products", icon: Package },
  { key: "service", label: "Services", icon: Briefcase },
];

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

export default function P2PHub() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeType, setActiveType] = useState("crypto");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", listingType: "crypto", description: "", price: "", paymentMethod: "USDT", featuredImage: null as File | null });

  const { data: listings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/p2p/listings", activeType],
    queryFn: async () => {
      const res = await fetch(`/api/p2p/listings?type=${activeType}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load listings");
      return res.json();
    },
  });

  const createListing = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("listingType", form.listingType);
      fd.append("description", form.description);
      fd.append("price", form.price);
      fd.append("paymentMethod", form.paymentMethod);
      if (form.featuredImage) fd.append("featuredImage", form.featuredImage);
      const res = await fetch("/api/p2p/listings", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create listing");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Listing submitted", description: "Admin will review it before it goes live." });
      setDialogOpen(false);
      setForm({ title: "", listingType: activeType, description: "", price: "", paymentMethod: "USDT", featuredImage: null });
      queryClient.invalidateQueries({ queryKey: ["/api/p2p/listings", activeType] });
    },
    onError: (e: Error) => toast({ title: "Could not submit listing", description: e.message, variant: "destructive" }),
  });

  const acceptOffer = useMutation({
    mutationFn: async (listingId: string) => {
      const res = await fetch(`/api/p2p/listings/${listingId}/accept`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to accept offer");
      return res.json();
    },
    onSuccess: (tx: any) => {
      toast({ title: "Deal room created", description: "Send funds to admin escrow and mark as paid." });
      setLocation(`/p2p-deals/${tx.id}`);
    },
    onError: (e: Error) => toast({ title: "Could not accept offer", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950 to-black text-white p-8 mb-8 overflow-hidden relative">
          <div className="absolute right-0 top-0 w-72 h-72 bg-purple-500/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <Badge className="bg-white/10 text-white border-white/20 mb-4">Admin-controlled escrow marketplace</Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">Taskdrip P2P Hub</h1>
            <p className="text-purple-100 mt-3 text-lg">Trade crypto, sell products, or offer services with admin escrow, dynamic fees, deal-room chat, and dispute protection.</p>
            <div className="flex gap-3 mt-6 flex-wrap">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-gray-100" data-testid="button-create-listing" disabled={!isAuthenticated}>
                    <Plus className="w-4 h-4 mr-2" /> Create Listing
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create P2P Listing</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Listing type</Label>
                      <select value={form.listingType} onChange={e => setForm(f => ({ ...f, listingType: e.target.value }))} className="w-full mt-1 border rounded-lg p-2" data-testid="select-listing-type">
                        <option value="crypto">Crypto</option>
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                      </select>
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="input-listing-title" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} data-testid="input-listing-description" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Price / rate</Label>
                        <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} data-testid="input-listing-price" />
                      </div>
                      <div>
                        <Label>Payment method</Label>
                        <Input value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} data-testid="input-listing-payment-method" />
                      </div>
                    </div>
                    <div>
                      <Label>Featured image</Label>
                      <Input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, featuredImage: e.target.files?.[0] || null }))} data-testid="input-listing-image" />
                    </div>
                    <Button className="w-full" onClick={() => createListing.mutate()} disabled={createListing.isPending || !form.title || !form.description || !form.price} data-testid="button-submit-listing">
                      {createListing.isPending ? "Submitting..." : "Submit for Admin Approval"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Link href="/p2p-deals">
                <Button variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20" data-testid="button-my-p2p-deals">My Deals</Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card><CardContent className="p-5 flex items-center gap-3"><ShieldCheck className="w-8 h-8 text-green-600" /><div><p className="font-bold">Admin escrow</p><p className="text-sm text-gray-500">Funds released only by admin</p></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><Users className="w-8 h-8 text-purple-600" /><div><p className="font-bold">Private deal rooms</p><p className="text-sm text-gray-500">Buyer, seller, and admin chat</p></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-3"><Store className="w-8 h-8 text-blue-600" /><div><p className="font-bold">Verified listings</p><p className="text-sm text-gray-500">Only approved offers go live</p></div></CardContent></Card>
        </div>

        <div className="flex gap-2 overflow-x-auto mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveType(tab.key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold whitespace-nowrap ${activeType === tab.key ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"}`} data-testid={`tab-${tab.key}`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Loading listings...</div>
        ) : listings.length === 0 ? (
          <Card><CardContent className="py-16 text-center"><Store className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="font-semibold text-gray-700">No approved listings yet</p><p className="text-sm text-gray-500">Create the first listing for this category.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing: any) => (
              <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-p2p-listing-${listing.id}`}>
                {listing.featuredImage ? <img src={listing.featuredImage} alt={listing.title} className="h-44 w-full object-cover" data-testid={`img-listing-${listing.id}`} /> : <div className="h-44 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center"><Store className="w-12 h-12 text-purple-300" /></div>}
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-listing-title-${listing.id}`}>{listing.title}</CardTitle>
                      <CardDescription className="capitalize">{listing.listingType} · {listing.paymentMethod}</CardDescription>
                    </div>
                    <Badge>${money(listing.price)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3" data-testid={`text-listing-description-${listing.id}`}>{listing.description}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-semibold">{listing.seller?.username || `${listing.seller?.firstName || "Seller"} ${listing.seller?.lastName || ""}`}</p>
                      <p className="text-xs text-yellow-600 flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-500" /> {money(listing.seller?.rating || 0)}</p>
                    </div>
                    <Button onClick={() => acceptOffer.mutate(listing.id)} disabled={!isAuthenticated || acceptOffer.isPending || listing.sellerId === (user as any)?.id} data-testid={`button-accept-offer-${listing.id}`}>
                      Accept Offer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
