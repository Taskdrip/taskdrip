import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { AdSlot } from "@/components/ui/ad-slot";
import { AdPopupZone } from "@/components/ui/ad-popup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Star, ShoppingCart, Eye, Package, Code, Layers, Cpu, FileCode,
  ThumbsUp, ThumbsDown, Shield, Zap, Download, TrendingUp,
  Filter, SlidersHorizontal, ChevronRight, ChevronLeft, Globe, Github,
  Rocket, BadgeCheck, X, Wallet, Coins, Send, Gift, Copy, CheckCircle2,
  Lock, Repeat2, ArrowUpRight, MessageCircle, Briefcase
} from "lucide-react";
import type { ShopProduct } from "@shared/schema";
import { Spotlight } from "@/components/Spotlight";

const CATEGORIES = [
  { value: "all", label: "All Products", icon: Package },
  { value: "software", label: "Software & Apps", icon: Cpu },
  { value: "scripts", label: "Scripts & Automation", icon: Code },
  { value: "templates", label: "Templates & Designs", icon: Layers },
  { value: "plugins", label: "Plugins & Extensions", icon: Zap },
  { value: "tools", label: "Tech Tools", icon: FileCode },
  { value: "education", label: "Guides & Courses", icon: Globe },
  { value: "replit_projects", label: "Dev Projects", icon: Rocket },
  { value: "github_repos", label: "GitHub Repos", icon: Github },
  { value: "equipment", label: "Equipment", icon: Package },
];

const TYPE_COLORS: Record<string, string> = {
  software: "bg-blue-100 text-blue-700",
  script: "bg-green-100 text-green-700",
  template: "bg-purple-100 text-purple-700",
  plugin: "bg-orange-100 text-orange-700",
  digital_course: "bg-indigo-100 text-indigo-700",
  ebook: "bg-pink-100 text-pink-700",
  physical_product: "bg-gray-100 text-gray-700",
  saas_tool: "bg-cyan-100 text-cyan-700",
  replit_project: "bg-orange-100 text-orange-700",
  github_repo: "bg-slate-100 text-slate-700",
};

const TYPE_ICONS: Record<string, any> = {
  software: Cpu,
  script: Code,
  template: Layers,
  plugin: Zap,
  digital_course: Globe,
  ebook: FileCode,
  physical_product: Package,
  saas_tool: TrendingUp,
  replit_project: Rocket,
  github_repo: Github,
};

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const getProductImage = (product: ShopProduct | any) =>
  product.featuredImage || product.imageUrl || product.thumbnail || product.galleryImages?.[0] || "";

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${sz} ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: ShopProduct & { likesCount?: number; dislikesCount?: number } }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const TypeIcon = TYPE_ICONS[product.type] || Package;
  const image = getProductImage(product);
  const rating = parseFloat(product.rating || "0");
  const discount = product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price)
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)
    : null;

  const { data: myReaction } = useQuery({
    queryKey: ["/api/shop/products", product.id, "reaction"],
    queryFn: async () => {
      const res = await fetch(`/api/shop/products/${product.id}/reaction`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const reactMutation = useMutation({
    mutationFn: async (type: "like" | "dislike") => {
      const res = await apiRequest("POST", `/api/shop/products/${product.id}/react`, { type });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products", product.id, "reaction"] });
    },
    onError: () => toast({ title: "Please log in to react", variant: "destructive" }),
  });

  const handleReact = (type: "like" | "dislike") => {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please log in to react to products." });
      return;
    }
    reactMutation.mutate(type);
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden">
        <Link href={`/shop/product/${product.id}`}>
          {image ? (
            <img src={image} alt={product.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" data-testid={`img-product-${product.id}`} />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100 flex items-center justify-center">
              <TypeIcon className="w-16 h-16 text-indigo-300" />
            </div>
          )}
        </Link>
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFree && <Badge className="bg-green-500 text-white text-xs font-bold shadow">FREE</Badge>}
          {discount && <Badge className="bg-red-500 text-white text-xs font-bold shadow">-{discount}%</Badge>}
            {product.isFeatured && <Badge className="bg-yellow-500 text-white text-xs font-bold shadow">Spotlight</Badge>}
        </div>
        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shadow ${TYPE_COLORS[product.type] || "bg-gray-100 text-gray-700"}`}>
            {formatLabel(product.type)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2">
          <Badge variant="outline" className="text-xs text-gray-500 mb-2">{formatLabel(product.category)}</Badge>
          <Link href={`/shop/product/${product.id}`}>
            <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug text-[15px]">
              {product.title}
            </h3>
          </Link>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{product.shortDescription || product.description}</p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={rating} />
          <span className="text-xs text-gray-500">{rating.toFixed(1)} ({product.reviewCount || 0} reviews)</span>
          {(product.salesCount || 0) > 0 && (
            <span className="text-xs text-gray-400 ml-auto">{product.salesCount} sales</span>
          )}
        </div>

        {/* Likes/Dislikes */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => handleReact("like")}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all ${
              myReaction?.type === "like"
                ? "bg-green-100 text-green-700 font-semibold"
                : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600"
            }`}
            data-testid={`button-like-${product.id}`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{product.likesCount || 0}</span>
          </button>
          <button
            onClick={() => handleReact("dislike")}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all ${
              myReaction?.type === "dislike"
                ? "bg-red-100 text-red-700 font-semibold"
                : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
            }`}
            data-testid={`button-dislike-${product.id}`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span>{product.dislikesCount || 0}</span>
          </button>
        </div>

        {/* Price & Actions */}
        <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            {product.isFree ? (
              <span className="text-xl font-extrabold text-green-600">Free</span>
            ) : (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xl font-extrabold text-gray-900">${product.price}</span>
                {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                  <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400">USD guide price</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/shop/product/${product.id}`}>
              <Button size="sm" variant="outline" className="h-9 w-9 p-0" data-testid={`button-view-${product.id}`}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/shop/checkout/${product.id}`}>
              <Button size="sm" className="h-9 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 sm:px-4" data-testid={`button-buy-${product.id}`}>
                {product.isFree ? <><Download className="h-3.5 w-3.5 mr-1" />Get</> : <><ShoppingCart className="h-3.5 w-3.5 mr-1" />Buy</>}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductSpotlightCarousel({ products }: { products: any[] }) {
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const total = products.length;

  const goTo = useCallback((idx: number) => {
    if (fading || total <= 1) return;
    setFading(true);
    setTimeout(() => { setCurrent(idx); setFading(false); }, 220);
  }, [fading, total]);

  const next = useCallback(() => goTo((current + 1) % total), [current, total, goTo]);

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next, total]);

  if (products.length === 0) return null;
  const product = products[current];
  const image = getProductImage(product);
  const rating = parseFloat(product.rating || product.averageRating || "0");
  const sales = product.salesCount || product.totalSales || 0;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Spotlight Products</h2>
        {total > 1 && <span className="text-xs text-gray-400 ml-1">{total} featured</span>}
      </div>
      <div className="relative rounded-2xl sm:rounded-[2rem] overflow-hidden cursor-pointer group min-h-[260px] sm:min-h-[310px] shadow-2xl shadow-indigo-200/70" onClick={() => setLocation(`/shop/product/${product.id}`)}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-950" />
        {image && (
          <img src={image} alt={product.title}
            className={`absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-all duration-500 group-hover:scale-105 ${fading ? "opacity-0" : ""}`}
            data-testid={`img-spotlight-product-${product.id}`}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_32%),linear-gradient(90deg,rgba(15,23,42,0.92),rgba(49,46,129,0.72),rgba(15,23,42,0.18))]" />

        <div className={`relative p-5 sm:p-7 md:p-12 min-h-[260px] sm:min-h-[310px] grid md:grid-cols-[1.1fr_0.9fr] gap-6 md:gap-8 items-end transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
          <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge className="bg-yellow-400 text-yellow-950 font-bold text-xs px-3 py-1">Spotlight Product</Badge>
            {product.isFree ? (
              <Badge className="bg-green-500 text-white text-xs font-bold">FREE</Badge>
            ) : (
              <Badge className="bg-white/20 text-white border border-white/30 text-xs">${product.price}</Badge>
            )}
            <Badge className="bg-white/20 text-white border border-white/30 text-xs">{formatLabel(product.category)}</Badge>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mb-1 max-w-2xl leading-tight">{product.title}</h2>
          {product.shortDescription && (
            <p className="text-white/80 text-sm max-w-xl line-clamp-2 mb-4">{product.shortDescription}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mb-5">
            {rating > 0 && (
              <span className="text-white/70 text-sm flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{rating.toFixed(1)}
              </span>
            )}
            {sales > 0 && (
              <span className="text-white/70 text-sm flex items-center gap-1">
                <Download className="w-4 h-4" />{sales} sold
              </span>
            )}
            <span className="text-white/70 text-sm flex items-center gap-1">
              <BadgeCheck className="w-4 h-4" /> Admin reviewed
            </span>
          </div>
            <Button
              onClick={e => { e.stopPropagation(); setLocation(`/shop/product/${product.id}`); }}
              className="bg-white text-gray-900 hover:bg-yellow-50 font-bold px-6 rounded-xl shadow-lg"
              data-testid={`btn-spotlight-product-${product.id}`}
            >
              View Product <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="hidden md:block">
            <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md p-5 text-white shadow-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-3">Marketplace update</p>
              <h3 className="text-xl font-bold mb-2">Now featuring dev projects, GitHub repos, templates, tools, and creator-ready digital assets.</h3>
              <p className="text-sm text-white/70">Use the advanced filters below to find launch-ready products faster.</p>
            </div>
          </div>
        </div>

      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={e => { e.stopPropagation(); goTo((current - 1 + total) % total); }}
            className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all"
            data-testid="btn-shop-spotlight-prev">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {products.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); goTo(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-violet-600" : "w-2 bg-gray-300 hover:bg-gray-400"}`}
                data-testid={`btn-shop-spotlight-dot-${i}`} />
            ))}
          </div>
          <button onClick={e => { e.stopPropagation(); goTo((current + 1) % total); }}
            className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all"
            data-testid="btn-shop-spotlight-next">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}

function TdripExchangeSection() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [topupPoints, setTopupPoints] = useState("1000");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [checkout, setCheckout] = useState<any>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [transferType, setTransferType] = useState<"transfer" | "tip">("transfer");
  const [recipient, setRecipient] = useState("");
  const [transferPoints, setTransferPoints] = useState("100");
  const [transferNote, setTransferNote] = useState("");

  const { data: pointsData } = useQuery<{ total: number; points: any[] }>({
    queryKey: ["/api/points/me"],
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "tdrip"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods?feature=tdrip");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const cryptoMethods = paymentMethods.filter((method: any) => method.type === "crypto" && method.address);
  const selectedMethod = cryptoMethods.find((method: any) => method.id === selectedMethodId) || cryptoMethods[0];
  const currentPoints = Number(pointsData?.total ?? (user as any)?.totalPoints ?? 0);
  const currentValue = currentPoints / 100;
  const buyPoints = Math.max(0, Number(topupPoints || 0));
  const buyAmount = buyPoints / 100;

  const startTopup = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) throw new Error("Please log in to buy $TDRIP points.");
      const res = await apiRequest("POST", "/api/tdrip/topups", {
        points: buyPoints,
        paymentMethodId: selectedMethod?.id,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCheckout(data);
      toast({ title: "$TDRIP checkout created", description: "Send crypto to the wallet shown, then submit your transaction hash." });
    },
    onError: (error: Error) => toast({ title: "Checkout failed", description: error.message, variant: "destructive" }),
  });

  const submitProof = useMutation({
    mutationFn: async () => {
      if (!checkout?.transaction?.id) throw new Error("Start a checkout first.");
      const formData = new FormData();
      formData.append("transactionHash", transactionHash);
      formData.append("network", checkout.checkout?.paymentMethod?.network || selectedMethod?.network || "");
      const res = await fetch(`/api/tdrip/topups/${checkout.transaction.id}/submit-proof`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to submit proof");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: data.credited ? "$TDRIP credited" : "Proof submitted",
        description: data.credited ? `${data.points} $TDRIP was added to your wallet.` : "Your top-up is waiting for admin confirmation.",
      });
      if (data.credited) {
        setCheckout(null);
        setTransactionHash("");
      }
    },
    onError: (error: Error) => toast({ title: "Proof failed", description: error.message, variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) throw new Error("Please log in to use your $TDRIP wallet.");
      const res = await apiRequest("POST", "/api/tdrip/transfer", {
        recipient,
        points: Number(transferPoints),
        note: transferNote,
        type: transferType,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "$TDRIP sent", description: `${transferPoints} $TDRIP was sent successfully.` });
      setRecipient("");
      setTransferNote("");
    },
    onError: (error: Error) => toast({ title: "Transfer failed", description: error.message, variant: "destructive" }),
  });

  const copyAddress = () => {
    const address = checkout?.checkout?.paymentMethod?.address || selectedMethod?.address;
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast({ title: "Wallet copied", description: "Crypto checkout address copied." });
  };

  return (
    <section className="-mt-6 mb-10 relative z-10" data-testid="section-tdrip-exchange">
      <div className="rounded-[2rem] overflow-hidden bg-slate-950 shadow-2xl shadow-indigo-200 border border-slate-800">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8 text-white bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.45),transparent_35%),linear-gradient(135deg,#020617,#111827_45%,#312e81)]">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-cyan-400/15 text-cyan-200 border border-cyan-300/20">
                <Coins className="h-3.5 w-3.5 mr-1" /> Taskdrip BlueChip Points Desk
              </Badge>
              <Badge className="bg-white/10 text-white border border-white/15">100 $TDRIP = $1</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3">
              Buy, hold, tip, transfer and top up your $TDRIP wallet.
            </h2>
            <p className="text-white/70 max-w-2xl mb-6">
              Use crypto checkout to buy $TDRIP Points, hold them in your Taskdrip wallet, tip creators, transfer to other users, or use earned points to host micro tasks on the Task page.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "Wallet balance", value: `${currentPoints.toLocaleString()} $TDRIP`, icon: Wallet },
                { label: "USDT value", value: `$${currentValue.toFixed(2)}`, icon: TrendingUp },
                { label: "Swap readiness", value: "Launch-ready", icon: Repeat2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur">
                  <Icon className="h-5 w-5 text-cyan-300 mb-2" />
                  <p className="text-xs text-white/50">{label}</p>
                  <p className="font-extrabold text-lg" data-testid={`text-tdrip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-black/25 border border-white/10 p-4">
              <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <label>
                  <span className="text-xs font-semibold text-white/60">Amount to buy</span>
                  <Input
                    type="number"
                    min="100"
                    step="100"
                    value={topupPoints}
                    onChange={(e) => setTopupPoints(e.target.value)}
                    className="mt-1 bg-white/95 text-slate-950 border-0 rounded-xl"
                    data-testid="input-tdrip-buy-points"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold text-white/60">Crypto checkout network</span>
                  <select
                    value={selectedMethod?.id || ""}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="mt-1 w-full h-10 rounded-xl bg-white text-slate-950 px-3 text-sm font-medium"
                    data-testid="select-tdrip-payment-method"
                  >
                    {cryptoMethods.length === 0 ? (
                      <option value="">No crypto wallet configured</option>
                    ) : (
                      cryptoMethods.map((method: any) => (
                        <option key={method.id} value={method.id}>{method.label} {method.network ? `(${method.network})` : ""}</option>
                      ))
                    )}
                  </select>
                </label>
                <Button
                  onClick={() => startTopup.mutate()}
                  disabled={startTopup.isPending || buyPoints < 100 || cryptoMethods.length === 0}
                  className="h-10 rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-bold"
                  data-testid="button-start-tdrip-checkout"
                >
                  {startTopup.isPending ? "Starting..." : `Buy $${buyAmount.toFixed(2)}`}
                </Button>
              </div>
              <p className="text-xs text-white/50 mt-3" data-testid="text-tdrip-buy-summary">
                You receive <strong className="text-white">{buyPoints.toLocaleString()} $TDRIP</strong> for <strong className="text-white">${buyAmount.toFixed(2)} USDT</strong>.
              </p>
            </div>

            {checkout && (
              <div className="mt-4 rounded-2xl bg-white text-slate-950 p-4 shadow-xl" data-testid="panel-tdrip-checkout">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-500">Send exactly</p>
                    <p className="text-2xl font-black">{checkout.checkout.amount} USDT</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">Awaiting payment proof</Badge>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 mb-3">
                  <p className="text-xs text-slate-500 mb-1">{checkout.checkout.paymentMethod.label}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs break-all flex-1" data-testid="text-tdrip-checkout-address">{checkout.checkout.paymentMethod.address}</code>
                    <Button size="sm" variant="outline" onClick={copyAddress} data-testid="button-copy-tdrip-address">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid md:grid-cols-[1fr_auto] gap-2">
                  <Input value={transactionHash} onChange={(e) => setTransactionHash(e.target.value)} placeholder="Paste transaction hash after payment" data-testid="input-tdrip-transaction-hash" />
                  <Button onClick={() => submitProof.mutate()} disabled={submitProof.isPending || !transactionHash} className="bg-slate-950 hover:bg-slate-800" data-testid="button-submit-tdrip-proof">
                    {submitProof.isPending ? "Checking..." : "Submit Proof"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">Wallet actions</h3>
                <p className="text-sm text-slate-500">Exchange-grade controls for your $TDRIP points.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Buy", icon: ArrowUpRight, body: "Top up by crypto" },
                { label: "Transfer", icon: Send, body: "Send user-to-user" },
                { label: "Tip", icon: Gift, body: "Reward creators" },
                { label: "Hold", icon: Lock, body: "Swap later for USDT" },
              ].map(({ label, icon: Icon, body }) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <Icon className="h-5 w-5 text-indigo-600 mb-2" />
                  <p className="font-bold text-slate-950">{label}</p>
                  <p className="text-xs text-slate-500">{body}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-indigo-100 p-4 mb-5">
              <div className="flex rounded-xl bg-slate-100 p-1 mb-3">
                <button onClick={() => setTransferType("transfer")} className={`flex-1 rounded-lg py-2 text-sm font-bold ${transferType === "transfer" ? "bg-white shadow text-indigo-700" : "text-slate-500"}`} data-testid="button-tdrip-mode-transfer">Transfer</button>
                <button onClick={() => setTransferType("tip")} className={`flex-1 rounded-lg py-2 text-sm font-bold ${transferType === "tip" ? "bg-white shadow text-indigo-700" : "text-slate-500"}`} data-testid="button-tdrip-mode-tip">Tip</button>
              </div>
              <div className="space-y-3">
                <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient email or user ID" data-testid="input-tdrip-recipient" />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" min="1" value={transferPoints} onChange={(e) => setTransferPoints(e.target.value)} placeholder="Points" data-testid="input-tdrip-transfer-points" />
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                    <p className="text-xs text-slate-500">USDT value</p>
                    <p className="font-bold text-slate-950">${(Number(transferPoints || 0) / 100).toFixed(2)}</p>
                  </div>
                </div>
                <Input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="Optional note" data-testid="input-tdrip-transfer-note" />
                <Button onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending || !recipient || !transferPoints} className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl" data-testid="button-send-tdrip">
                  {transferMutation.isPending ? "Sending..." : transferType === "tip" ? "Send Tip" : "Transfer $TDRIP"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">Use earned points to host micro tasks</h4>
                  <p className="text-sm text-emerald-700 mt-1">Convert wallet balance into task rewards for follow, comment, repost, signup, and giveaway tasks.</p>
                  <Link href="/tasks">
                    <Button variant="outline" size="sm" className="mt-3 border-emerald-200 text-emerald-700 hover:bg-emerald-100" data-testid="button-use-tdrip-for-tasks">
                      Go to Task Page <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Shop() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: products = [], isLoading } = useQuery<(ShopProduct & { likesCount?: number; dislikesCount?: number })[]>({
    queryKey: ["/api/shop/products"],
  });

  const { data: featuredProducts = [] } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop/products/featured"],
  });

  const { data: adminContact } = useQuery<{ id: string; username: string; profileImage?: string }>({
    queryKey: ["/api/admin/contact"],
    staleTime: 5 * 60 * 1000,
  });

  const tags = Array.from(new Set(products.flatMap((p) => p.tags || []))).slice(0, 18);
  const types = Array.from(new Set(products.map((p) => p.type).filter(Boolean)));
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedType("all");
    setPriceFilter("all");
    setSelectedTag("all");
    setSortBy("newest");
  };
  const hasFilters = !!searchTerm || selectedCategory !== "all" || selectedType !== "all" || priceFilter !== "all" || selectedTag !== "all";

  const filtered = products.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.shortDescription || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchType = selectedType === "all" || p.type === selectedType;
    const price = parseFloat(p.price || "0");
    const matchPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && p.isFree) ||
      (priceFilter === "under25" && !p.isFree && price < 25) ||
      (priceFilter === "25to75" && price >= 25 && price <= 75) ||
      (priceFilter === "over75" && price > 75);
    const matchTag = selectedTag === "all" || (p.tags || []).includes(selectedTag);
    return matchSearch && matchCat && matchType && matchPrice && matchTag;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "price-low": return parseFloat(a.price) - parseFloat(b.price);
      case "price-high": return parseFloat(b.price) - parseFloat(a.price);
      case "rating": return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
      case "popular": return (b.salesCount || 0) - (a.salesCount || 0);
      case "likes": return (b.likesCount || 0) - (a.likesCount || 0);
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <AdPopupZone page="shop" />
      <NavigationFixed />
      <AdSlot page="shop" placementType="banner_top" className="w-full" />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=600&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/90 via-indigo-950/85 to-purple-900/90" />
        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-5 shadow-lg">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-white text-sm font-semibold">Verified Digital Marketplace</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-xl">
            Taskdrip{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">Launch Market</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
            Premium software, dev projects, GitHub repos, automation tools, templates, and creator resources with admin-reviewed checkout options.
          </p>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-8 mb-8 flex-wrap">
            {[
              { val: `${products.length}+`, label: "Products" },
              { val: `${products.filter(p => p.isFree).length}+`, label: "Free Items" },
              { val: "Flexible", label: "Payment" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-white">{s.val}</p>
                <p className="text-white/50 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search dev projects, repos, scripts, tools..."
              className="pl-14 pr-4 h-14 text-base bg-white/95 backdrop-blur rounded-2xl border-0 shadow-2xl text-gray-900 placeholder-gray-400"
              data-testid="input-shop-search"
            />
          </div>

          {/* Hire Developer CTA */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 shadow-xl">
            <div className="text-left">
              <p className="text-white font-bold text-sm">Need a custom solution?</p>
              <p className="text-white/60 text-xs">Get a full-stack project built for you by our developer</p>
            </div>
            <Link href="/hire-developer">
              <button className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-violet-900/40 transition-all whitespace-nowrap">
                <Briefcase className="h-4 w-4" />
                Hire a Developer
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Category Pills */}
        <div className="flex gap-3 overflow-x-auto pb-3 mb-8 scrollbar-hide">
          {CATEGORIES.map(({ value, label, icon: Icon }) => {
            const count = value === "all" ? products.length : products.filter(p => p.category === value).length;
            return (
              <button
                key={value}
                onClick={() => setSelectedCategory(value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 border ${
                  selectedCategory === value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
                data-testid={`button-category-${value}`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === value ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "New: Dev Projects", body: "Launch-ready full-stack builds now have their own marketplace category.", icon: Rocket },
            { title: "New: GitHub Repo Kits", body: "Repository templates, docs packs, and developer assets are easier to find.", icon: Github },
            { title: "Better discovery", body: "Advanced filters now sort by type, price, topic tags, popularity, rating, and likes.", icon: Filter },
          ].map(({ title, body, icon: Icon }) => (
            <div key={title} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm" data-testid={`card-shop-update-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>

        {/* Spotlight Carousel */}
        {featuredProducts.length > 0 && selectedCategory === "all" && !searchTerm && (
          <ProductSpotlightCarousel products={featuredProducts} />
        )}

        {/* Advanced Filter Bar */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-800" data-testid="text-shop-results-count">
                {sorted.length} product{sorted.length !== 1 ? "s" : ""} found
              </span>
            </div>
            {hasFilters && (
              <Button onClick={clearFilters} variant="outline" size="sm" className="rounded-xl" data-testid="button-clear-shop-filters">
                <X className="h-3.5 w-3.5 mr-1" /> Clear filters
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Product type</span>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="select-product-type">
                <option value="all">All types</option>
                {types.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Price range</span>
              <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="select-price-filter">
                <option value="all">Any price</option>
                <option value="free">Free only</option>
                <option value="under25">Under $25</option>
                <option value="25to75">$25 - $75</option>
                <option value="over75">Over $75</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Topic tag</span>
              <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="select-tag-filter">
                <option value="all">All tags</option>
                {tags.map((tag) => <option key={tag} value={tag}>{formatLabel(tag)}</option>)}
              </select>
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-semibold text-gray-500">Sort results</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="select-sort-by">
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="likes">Most Liked</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </label>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sorted.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCategory !== "all"
                ? "Try adjusting your search or filters"
                : "Products will appear here once added by the admin"}
            </p>
            {(searchTerm || selectedCategory !== "all") && (
              <Button onClick={clearFilters} variant="outline" className="rounded-xl">
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Trust Banner */}
        <div className="mt-16 bg-gradient-to-r from-slate-950 via-indigo-900 to-purple-800 rounded-3xl p-8 text-white text-center shadow-2xl shadow-indigo-200">
          <h3 className="text-2xl font-extrabold mb-2">Secure Admin-Reviewed Checkout</h3>
          <p className="text-white/80 max-w-lg mx-auto mb-6">
            Shop purchases can use admin-configured payment options. Payment proofs are reviewed before delivery so buyers and sellers stay protected.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
            {["Manual review", "Digital delivery", "Verified products"].map((m) => (
              <div key={m} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold">{m}</span>
              </div>
            ))}
          </div>
          {/* Help CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {adminContact?.id && (
              <Link href={`/messages?to=${adminContact.id}`}>
                <button className="flex items-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-all shadow-lg">
                  <MessageCircle className="h-5 w-5 text-indigo-600" />
                  Chat with Admin
                </button>
              </Link>
            )}
            <Link href="/hire-developer">
              <button className="flex items-center gap-2 bg-indigo-500/30 hover:bg-indigo-500/50 border border-white/30 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg">
                <Briefcase className="h-5 w-5 text-cyan-300" />
                Hire a Developer
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Spotlight page="shop" title="Featured on Taskdrip" subtitle="Handpicked by our team" variant="row" />
      </div>

      <Footer />
    </div>
  );
}
