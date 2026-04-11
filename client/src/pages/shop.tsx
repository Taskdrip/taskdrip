import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Star, ShoppingCart, Eye, Package, Code, Layers, Cpu, FileCode,
  ThumbsUp, ThumbsDown, Shield, Zap, Download, ArrowRight, TrendingUp,
  Filter, SlidersHorizontal, ChevronRight, Globe
} from "lucide-react";
import type { ShopProduct } from "@shared/schema";

const CATEGORIES = [
  { value: "all", label: "All Products", icon: Package },
  { value: "software", label: "Software & Apps", icon: Cpu },
  { value: "scripts", label: "Scripts & Automation", icon: Code },
  { value: "templates", label: "Templates & Designs", icon: Layers },
  { value: "plugins", label: "Plugins & Extensions", icon: Zap },
  { value: "tools", label: "Tech Tools", icon: FileCode },
  { value: "courses", label: "Digital Courses", icon: Globe },
  { value: "equipment", label: "Equipment", icon: Package },
];

const TYPE_COLORS: Record<string, string> = {
  software: "bg-blue-100 text-blue-700",
  script: "bg-green-100 text-green-700",
  template: "bg-purple-100 text-purple-700",
  plugin: "bg-orange-100 text-orange-700",
  digital_course: "bg-indigo-100 text-indigo-700",
  physical_product: "bg-gray-100 text-gray-700",
  saas_tool: "bg-cyan-100 text-cyan-700",
};

const TYPE_ICONS: Record<string, any> = {
  software: Cpu,
  script: Code,
  template: Layers,
  plugin: Zap,
  digital_course: Globe,
  physical_product: Package,
  saas_tool: TrendingUp,
};

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
          {product.featuredImage ? (
            <img src={product.featuredImage} alt={product.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
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
          {product.isFeatured && <Badge className="bg-yellow-500 text-white text-xs font-bold shadow">⭐ Featured</Badge>}
        </div>
        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shadow ${TYPE_COLORS[product.type] || "bg-gray-100 text-gray-700"}`}>
            {product.type?.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2">
          <Badge variant="outline" className="text-xs text-gray-500 mb-2">{product.category}</Badge>
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
        <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3">
          <div>
            {product.isFree ? (
              <span className="text-xl font-extrabold text-green-600">Free</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-gray-900">${product.price}</span>
                {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                  <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400">USDT</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/shop/product/${product.id}`}>
              <Button size="sm" variant="outline" className="h-9 w-9 p-0" data-testid={`button-view-${product.id}`}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/shop/checkout/${product.id}`}>
              <Button size="sm" className="h-9 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4" data-testid={`button-buy-${product.id}`}>
                {product.isFree ? <><Download className="h-3.5 w-3.5 mr-1" />Get</> : <><ShoppingCart className="h-3.5 w-3.5 mr-1" />Buy</>}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: products = [], isLoading } = useQuery<(ShopProduct & { likesCount?: number; dislikesCount?: number })[]>({
    queryKey: ["/api/shop/products"],
  });

  const { data: featuredProducts = [] } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop/products/featured"],
  });

  const filtered = products.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchSearch && matchCat;
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
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=600&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/90 via-indigo-950/85 to-purple-900/90" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-5 shadow-lg">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-white text-sm font-semibold">Verified Digital Marketplace</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-xl">
            Web3 Digital{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">Marketplace</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
            Premium software, scripts, automation tools & templates. Pay with USDT or TON crypto.
          </p>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-8 mb-8 flex-wrap">
            {[
              { val: `${products.length}+`, label: "Products" },
              { val: `${products.filter(p => p.isFree).length}+`, label: "Free Items" },
              { val: "USDT / TON", label: "Payment" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-white">{s.val}</p>
                <p className="text-white/50 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search software, scripts, tools..."
              className="pl-14 pr-4 h-14 text-base bg-white/95 backdrop-blur rounded-2xl border-0 shadow-2xl text-gray-900 placeholder-gray-400"
              data-testid="input-shop-search"
            />
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

        {/* Featured */}
        {featuredProducts.length > 0 && selectedCategory === "all" && !searchTerm && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <span className="text-yellow-500">⭐</span> Featured Products
              </h2>
              <button className="text-sm text-indigo-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                View all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 3).map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Sort & Filter Bar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">
              {sorted.length} product{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="select-sort-by"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="likes">Most Liked</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
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
              <Button onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }} variant="outline" className="rounded-xl">
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Trust Banner */}
        <div className="mt-16 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-8 text-white text-center">
          <h3 className="text-2xl font-extrabold mb-2">🔐 Secure Crypto Payments</h3>
          <p className="text-white/80 max-w-lg mx-auto mb-6">
            All purchases are processed securely with USDT (Tron/BSC) or TON cryptocurrency. 
            Payment proofs verified by admin before delivery.
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {["USDT (Tron)", "USDT (BSC)", "TON"].map((m) => (
              <div key={m} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
