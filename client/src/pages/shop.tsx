import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
  ThumbsUp, ThumbsDown, Shield, Zap, Download, TrendingUp,
  Filter, SlidersHorizontal, ChevronRight, ChevronLeft, Globe, Github,
  Rocket, BadgeCheck, X
} from "lucide-react";
import type { ShopProduct } from "@shared/schema";

const CATEGORIES = [
  { value: "all", label: "All Products", icon: Package },
  { value: "software", label: "Software & Apps", icon: Cpu },
  { value: "scripts", label: "Scripts & Automation", icon: Code },
  { value: "templates", label: "Templates & Designs", icon: Layers },
  { value: "plugins", label: "Plugins & Extensions", icon: Zap },
  { value: "tools", label: "Tech Tools", icon: FileCode },
  { value: "education", label: "Guides & Courses", icon: Globe },
  { value: "replit_projects", label: "Replit Projects", icon: Rocket },
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
            <p className="text-xs text-gray-400">USD guide price</p>
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
      <div className="relative rounded-[2rem] overflow-hidden cursor-pointer group min-h-[310px] shadow-2xl shadow-indigo-200/70" onClick={() => setLocation(`/shop/product/${product.id}`)}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-950" />
        {image && (
          <img src={image} alt={product.title}
            className={`absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-all duration-500 group-hover:scale-105 ${fading ? "opacity-0" : ""}`}
            data-testid={`img-spotlight-product-${product.id}`}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_32%),linear-gradient(90deg,rgba(15,23,42,0.92),rgba(49,46,129,0.72),rgba(15,23,42,0.18))]" />

        <div className={`relative p-7 md:p-12 min-h-[310px] grid md:grid-cols-[1.1fr_0.9fr] gap-8 items-end transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
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
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1 max-w-2xl leading-tight">{product.title}</h2>
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
              <h3 className="text-xl font-bold mb-2">Now featuring Replit builds, GitHub repos, templates, tools, and creator-ready digital assets.</h3>
              <p className="text-sm text-white/70">Use the advanced filters below to find launch-ready products faster.</p>
            </div>
          </div>
        </div>

        {total > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); goTo((current - 1 + total) % total); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all"
              data-testid="btn-shop-spotlight-prev">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={e => { e.stopPropagation(); goTo((current + 1) % total); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all"
              data-testid="btn-shop-spotlight-next">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {products.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); goTo(i); }}
                  className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
                  data-testid={`btn-shop-spotlight-dot-${i}`} />
              ))}
            </div>
          </>
        )}
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
            Taskdrip{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">Launch Market</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
            Premium software, Replit projects, GitHub repos, automation tools, templates, and creator resources with admin-reviewed checkout options.
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
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Replit projects, repos, scripts, tools..."
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

        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "New: Replit Projects", body: "Launch-ready Replit builds now have their own marketplace category.", icon: Rocket },
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
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {["Manual review", "Digital delivery", "Verified products"].map((m) => (
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
