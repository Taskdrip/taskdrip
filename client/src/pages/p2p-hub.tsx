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
import {
  ArrowRight, Briefcase, CheckCircle, Coins, Lock, MessageSquare,
  Package, Plus, ShieldCheck, Sparkles, Star, Store, Users, Zap,
} from "lucide-react";

const tabs = [
  { key: "crypto", label: "Crypto Trades", icon: Coins, color: "from-orange-500 to-yellow-500" },
  { key: "product", label: "Products", icon: Package, color: "from-blue-500 to-cyan-500" },
  { key: "service", label: "Services", icon: Briefcase, color: "from-purple-500 to-pink-500" },
];

const TYPE_GRADIENTS: Record<string, string> = {
  crypto: "from-orange-900/60 to-yellow-900/40",
  product: "from-blue-900/60 to-cyan-900/40",
  service: "from-purple-900/60 to-pink-900/40",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  crypto: "bg-orange-100 text-orange-800",
  product: "bg-blue-100 text-blue-800",
  service: "bg-purple-100 text-purple-800",
};

function money(value: any) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function P2PHub() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeType, setActiveType] = useState("crypto");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", listingType: "crypto", description: "", price: "",
    paymentMethod: "USDT", featuredImage: null as File | null,
  });

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
      toast({ title: "Listing submitted!", description: "Admin will review it before it goes live." });
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
      toast({ title: "Deal Room created!", description: "Send funds to admin escrow and mark as paid." });
      setLocation(`/p2p-deals/${tx.id}`);
    },
    onError: (e: Error) => toast({ title: "Could not accept offer", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1800&q=85&auto=format&fit=crop"
            alt="Crypto P2P trading marketplace"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/85 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        </div>

        {/* Decorative blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5">
              <Badge className="bg-violet-500/20 text-violet-200 border border-violet-400/30 backdrop-blur-sm px-3 py-1 text-sm font-semibold">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-300" />
                P2P Marketplace — Now Live
              </Badge>
            </div>

            <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight tracking-tight mb-4">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Trade, Sell &
              </span>
              <br />
              <span className="text-white">Earn in Crypto</span>
            </h1>

            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Buy &amp; sell crypto, digital products, and services — all protected by admin-controlled escrow, private deal-room chat, and a dispute resolution system.
            </p>

            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-bold px-8 rounded-xl shadow-xl" data-testid="button-create-listing">
                      <Plus className="w-5 h-5 mr-2" /> Create Listing
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Create P2P Listing</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label className="text-sm font-semibold mb-1 block">Listing type</Label>
                        <select value={form.listingType} onChange={e => setForm(f => ({ ...f, listingType: e.target.value }))} className="w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" data-testid="select-listing-type">
                          <option value="crypto">🔗 Crypto Trade</option>
                          <option value="product">📦 Digital Product</option>
                          <option value="service">💼 Service</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-1 block">Title</Label>
                        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Sell 500 USDT fast, or SEO article pack" className="rounded-xl" data-testid="input-listing-title" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-1 block">Description</Label>
                        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Describe what you're offering, delivery time, requirements..." className="rounded-xl" data-testid="input-listing-description" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-semibold mb-1 block">Price (USD)</Label>
                          <Input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" className="rounded-xl" data-testid="input-listing-price" />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-1 block">Payment method</Label>
                          <Input value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} placeholder="USDT, BTC, ETH..." className="rounded-xl" data-testid="input-listing-payment-method" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-1 block">Featured image (optional)</Label>
                        <Input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, featuredImage: e.target.files?.[0] || null }))} className="rounded-xl" data-testid="input-listing-image" />
                      </div>
                      <Button className="w-full rounded-xl font-bold py-3" onClick={() => createListing.mutate()} disabled={createListing.isPending || !form.title || !form.description || !form.price} data-testid="button-submit-listing">
                        {createListing.isPending ? "Submitting..." : "Submit for Admin Approval →"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Link href="/login">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-bold px-8 rounded-xl shadow-xl">
                    <Plus className="w-5 h-5 mr-2" /> Create Listing
                  </Button>
                </Link>
              )}

              {isAuthenticated && (
                <Link href="/p2p-deals">
                  <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm font-bold px-8 rounded-xl" data-testid="button-my-p2p-deals">
                    My Deals <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: ShieldCheck, label: "Admin Escrow" },
                { icon: Lock, label: "Dispute Protection" },
                { icon: MessageSquare, label: "Private Deal Room" },
                { icon: CheckCircle, label: "Verified Listings" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-gray-300 text-sm">
                  <Icon className="w-4 h-4 text-violet-400" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ROW ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: ShieldCheck, label: "Admin escrow", sub: "Funds released only by admin", color: "text-green-600" },
              { icon: Users, label: "Private deal rooms", sub: "Buyer, seller & admin chat", color: "text-purple-600" },
              { icon: Zap, label: "Verified listings", sub: "Only approved offers go live", color: "text-blue-600" },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon className={`w-7 h-7 ${color}`} />
                <p className="font-bold text-gray-900 text-sm sm:text-base">{label}</p>
                <p className="text-xs text-gray-500 hidden sm:block">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LISTINGS ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto mb-7 pb-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeType === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold whitespace-nowrap text-sm transition-all ${active ? "bg-gray-900 text-white border-gray-900 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                data-testid={`tab-${tab.key}`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Listing grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <Store className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-700 text-lg mb-1">No listings yet</p>
            <p className="text-sm text-gray-400 mb-6">Be the first to post in this category.</p>
            {isAuthenticated && (
              <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Create first listing
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing: any) => (
              <Card key={listing.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group" data-testid={`card-p2p-listing-${listing.id}`}>
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  {listing.featuredImage ? (
                    <img src={listing.featuredImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-testid={`img-listing-${listing.id}`} />
                  ) : (
                    <div className={`h-full bg-gradient-to-br ${TYPE_GRADIENTS[listing.listingType] || "from-gray-800 to-gray-900"} flex items-center justify-center`}>
                      {listing.listingType === "crypto" ? <Coins className="w-16 h-16 text-white/30" /> : listing.listingType === "product" ? <Package className="w-16 h-16 text-white/30" /> : <Briefcase className="w-16 h-16 text-white/30" />}
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className={`text-xs font-bold uppercase tracking-wide ${TYPE_BADGE_COLORS[listing.listingType] || "bg-gray-100 text-gray-800"}`}>
                      {listing.listingType}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className="bg-black/70 backdrop-blur-sm text-white text-sm font-black px-3 py-1 rounded-xl">
                      ${money(listing.price)}
                    </div>
                  </div>
                </div>

                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-bold leading-snug line-clamp-2" data-testid={`text-listing-title-${listing.id}`}>
                    {listing.title}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                    <span className="font-medium text-gray-500">{listing.paymentMethod}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 pb-4 space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2" data-testid={`text-listing-description-${listing.id}`}>
                    {listing.description}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(listing.seller?.username || listing.seller?.firstName || "S")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {listing.seller?.username || `${listing.seller?.firstName || "Seller"} ${listing.seller?.lastName || ""}`.trim()}
                        </p>
                        <p className="text-xs text-yellow-600 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-500" />
                          {money(listing.seller?.rating || 4.8)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-bold px-4 flex-shrink-0"
                      onClick={() => acceptOffer.mutate(listing.id)}
                      disabled={!isAuthenticated || acceptOffer.isPending || listing.sellerId === (user as any)?.id}
                      data-testid={`button-accept-offer-${listing.id}`}
                    >
                      {!isAuthenticated ? "Login" : "Accept Offer"}
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
