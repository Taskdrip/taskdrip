import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { 
  ShoppingCart, Star, Download, ExternalLink, ChevronLeft, 
  Package, Shield, CheckCircle, MessageCircle, Share2, Flag,
  Heart, Eye, Calendar, Tag, ArrowRight, PlayCircle,
  ThumbsUp, ThumbsDown, Briefcase, Zap, Crown, Rocket,
  BadgeCheck, Globe, Code, Sparkles, Users, Building2
} from "lucide-react";
import { ReportDialog } from "@/components/ui/report-dialog";
import { ShareButton } from "@/components/ui/share-panel";
import { shareItem } from "@/lib/share";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShopProduct, ProductReview } from "@shared/schema";

// ── Pricing tier card for products with subscription plans ──────────────────
function PricingTierCard({
  addon,
  index,
  productId,
}: {
  addon: { id: string; title: string; description: string; price: number };
  index: number;
  productId: string;
}) {
  const isFree = addon.price === 0;
  const isPopular = index === 2; // Growth plan
  const isWhiteLabel = addon.price >= 1000;

  const iconMap: Record<number, any> = {
    0: Zap,
    1: Users,
    2: Rocket,
    3: Crown,
    4: Building2,
  };
  const Icon = iconMap[index] || Zap;

  const gradients = [
    "from-slate-50 to-slate-100 border-slate-200",
    "from-blue-50 to-indigo-50 border-blue-200",
    "from-indigo-600 to-purple-700 border-indigo-500 text-white",
    "from-amber-50 to-orange-50 border-amber-200",
    "from-yellow-900 to-amber-900 border-yellow-700 text-white",
  ];

  const gradient = gradients[index] ?? gradients[0];
  const isInverted = isPopular || isWhiteLabel;

  return (
    <div
      className={`relative rounded-2xl border-2 bg-gradient-to-br ${gradient} p-6 flex flex-col gap-3 shadow-sm hover:shadow-lg transition-all duration-300 ${isPopular ? "scale-105 shadow-xl shadow-indigo-300/40" : ""}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
            ⭐ Most Popular
          </span>
        </div>
      )}
      {isWhiteLabel && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
            🏷 White-Label License
          </span>
        </div>
      )}

      <div className={`flex items-center gap-2 mb-1 ${isInverted ? "text-white/80" : "text-indigo-600"}`}>
        <Icon className="w-5 h-5" />
        <span className={`text-xs font-bold uppercase tracking-wider ${isInverted ? "text-white/70" : "text-gray-500"}`}>
          {isFree ? "Free Trial" : isWhiteLabel ? "Lifetime License" : `Plan`}
        </span>
      </div>

      <div>
        <h3 className={`text-lg font-extrabold leading-tight ${isInverted ? "text-white" : "text-gray-900"}`}>
          {addon.title.split("—")[0].trim()}
        </h3>
        <div className={`text-3xl font-black mt-1 ${isInverted ? "text-white" : "text-gray-900"}`}>
          {isFree ? (
            <span className="text-green-500">FREE</span>
          ) : (
            <>${addon.price.toLocaleString()}</>
          )}
        </div>
        {addon.title.includes("—") && (
          <p className={`text-sm font-medium mt-0.5 ${isInverted ? "text-white/70" : "text-gray-500"}`}>
            {addon.title.split("—")[1]?.trim()}
          </p>
        )}
      </div>

      <p className={`text-sm leading-relaxed flex-1 ${isInverted ? "text-white/85" : "text-gray-600"}`}>
        {addon.description}
      </p>

      <Link href={`/shop/checkout/${productId}?plan=${addon.id}`}>
        <Button
          className={`w-full mt-2 font-bold rounded-xl ${
            isPopular
              ? "bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg"
              : isWhiteLabel
              ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-lg"
              : isFree
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          }`}
        >
          {isFree ? "Start Free Trial" : isWhiteLabel ? "Get White-Label License" : "Get This Plan"}
        </Button>
      </Link>
    </div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/shop/product/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  const productId = params?.id;

  const { data: product, isLoading } = useQuery<ShopProduct>({
    queryKey: ["/api/shop/products", productId],
    enabled: !!productId,
  });

  const { data: reviews = [] } = useQuery<ProductReview[]>({
    queryKey: ["/api/shop/products", productId, "reviews"],
    enabled: !!productId,
  });

  const { data: relatedProducts = [] } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop/products/category", product?.category],
    enabled: !!product?.category,
  });

  const { data: adminContact } = useQuery<{ id: string; username: string }>({
    queryKey: ["/api/admin/contact"],
    staleTime: 5 * 60 * 1000,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: { rating: number; comment: string }) => {
      const response = await apiRequest("POST", `/api/shop/products/${productId}/reviews`, reviewData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products", productId, "reviews"] });
      setReviewText("");
      setReviewRating(5);
      toast({ title: "Review submitted successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: myReaction } = useQuery({
    queryKey: ["/api/shop/products", productId, "reaction"],
    queryFn: async () => {
      const res = await fetch(`/api/shop/products/${productId}/reaction`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!productId && !!user,
  });

  const reactMutation = useMutation({
    mutationFn: async (type: "like" | "dislike") => {
      const res = await apiRequest("POST", `/api/shop/products/${productId}/react`, { type });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products", productId] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products", productId, "reaction"] });
    },
    onError: () => toast({ title: "Please log in to react", variant: "destructive" }),
  });

  const handleSubmitReview = () => {
    if (!user) {
      toast({
        title: "Please log in to submit a review",
        variant: "destructive",
      });
      return;
    }
    
    if (reviewText.trim()) {
      createReviewMutation.mutate({
        rating: reviewRating,
        comment: reviewText.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link href="/shop">
            <Button>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Shop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = [product.featuredImage, ...(product.galleryImages || [])].filter(Boolean);
  const averageRating = parseFloat(product.rating || "0");
  const discount = product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price)
    ? Math.round(((parseFloat(product.originalPrice) - parseFloat(product.price)) / parseFloat(product.originalPrice)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-8 min-w-0">
          <Link href="/shop" className="hover:text-blue-600">Shop</Link>
          <span>/</span>
          <Link href={`/shop?category=${product.category}`} className="hover:text-blue-600">
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </Link>
          <span>/</span>
          <span className="text-gray-900 min-w-0 whitespace-normal break-anywhere">{product.title}</span>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images / Video */}
          <div className="space-y-4">
            {/* YouTube video if available */}
            {(product as any).promoVideoUrl && (() => {
              const rawUrl = (product as any).promoVideoUrl as string;
              let videoId = "";
              try {
                const url = new URL(rawUrl);
                if (url.hostname.includes("youtu.be")) {
                  videoId = url.pathname.slice(1);
                } else {
                  videoId = url.searchParams.get("v") || "";
                }
              } catch {}
              return videoId ? (
                <div className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black" style={{ paddingTop: "56.25%" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${product.title} promo video`}
                  />
                </div>
              ) : null;
            })()}

            {/* Images */}
            {images.length > 0 && (
              <div className="relative">
                <img
                  src={images[selectedImage]}
                  alt={product.title}
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                />
                {discount > 0 && (
                  <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                    {discount}% OFF
                  </Badge>
                )}
              </div>
            )}

            {!((product as any).promoVideoUrl) && images.length === 0 && (
              <div className="relative">
                <div className="w-full h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-400" />
                </div>
                {discount > 0 && (
                  <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                    {discount}% OFF
                  </Badge>
                )}
              </div>
            )}
            
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? "border-blue-500" : "border-gray-200"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                <Badge variant="outline">{product.type}</Badge>
                {product.isFeatured && (
                  <Badge className="bg-yellow-500 text-white">Featured</Badge>
                )}
              </div>
               <h1 className="text-3xl font-bold text-gray-900 mb-4 whitespace-normal break-anywhere">{product.title}</h1>
              
              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(averageRating)
                          ? "text-yellow-500 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-gray-500">({reviews.length} reviews)</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-500">{product.salesCount || 0} sales</span>
              </div>

              {/* Likes / Dislikes */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  data-testid="button-like-product"
                  onClick={() => reactMutation.mutate("like")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    myReaction?.type === "like"
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{product.likesCount || 0}</span>
                </button>
                <button
                  data-testid="button-dislike-product"
                  onClick={() => reactMutation.mutate("dislike")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    myReaction?.type === "dislike"
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-500"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>{product.dislikesCount || 0}</span>
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl font-bold text-green-600">
                {product.isFree ? "Free" : `$${product.price}`}
              </span>
              {product.originalPrice && discount > 0 && (
                <span className="text-2xl text-gray-500 line-through">
                  ${product.originalPrice}
                </span>
              )}
            </div>

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-lg text-gray-600 mb-6">{product.shortDescription}</p>
            )}

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link href={`/shop/checkout/${product.id}`} className="block w-full">
                <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {product.isFree ? "Get Free" : "Buy Now"}
                </Button>
              </Link>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1">
                  <Heart className="w-5 h-5" />
                </Button>
                <div data-testid="button-share-product" className="flex-1">
                  <ShareButton
                    title={product?.title || product?.name || 'Product on Taskdrip'}
                    description={product?.description || ''}
                    url={window.location.href}
                    image={product?.featuredImage || ''}
                    className="w-full"
                  />
                </div>
                <ReportDialog
                  contentType="product"
                  contentId={String(product?.id || '')}
                  trigger={
                    <Button variant="outline" size="lg" className="flex-1" data-testid="button-report-product">
                      <Flag className="w-5 h-5" />
                    </Button>
                  }
                />
              </div>

              {/* Demo and Download Links */}
              <div className="flex gap-2">
                {product.demoUrl && (
                  <Button variant="outline" asChild>
                    <a href={product.demoUrl} target="_blank" rel="noopener noreferrer">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Live Demo
                    </a>
                  </Button>
                )}
                {product.documentationUrl && (
                  <Button variant="outline" asChild>
                    <a href={product.documentationUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Documentation
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">
              <Shield className="w-5 h-5 text-green-500" />
              <span>Secure admin-reviewed checkout before product delivery</span>
            </div>

            {/* Chat with Admin */}
            {adminContact?.id && (
              <Link href={`/messages?to=${adminContact.id}`}>
                <Button variant="outline" className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <MessageCircle className="w-4 h-4" />
                  Chat with Admin
                </Button>
              </Link>
            )}

            {/* Hire a Developer — prominent CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg shadow-purple-200/60">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Need Custom Development?</h4>
                  <p className="text-white/80 text-xs mt-0.5">
                    Hire our expert dev team to deploy, customise, or extend this system for your organisation — white-labelling, custom integrations, and more.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: Globe, label: "White-Label Setup" },
                  { icon: Code, label: "Custom Features" },
                  { icon: Sparkles, label: "Full Deployment" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-xl bg-white/10 px-2 py-2 text-center">
                    <Icon className="w-4 h-4 mx-auto mb-1 text-white/80" />
                    <p className="text-white/90 text-[10px] font-medium leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <Link href="/hire-developer">
                <Button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl shadow-md">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Hire a Developer Now
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Pricing Tiers — shown when product has subscription plans (serviceAddons) */}
        {(product as any).serviceAddons && Array.isArray((product as any).serviceAddons) && (product as any).serviceAddons.length > 0 && (
          <div className="mb-14">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-indigo-100 text-indigo-700 border border-indigo-200">Flexible Pricing</Badge>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Simple Plans. Serious Value.</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Start free, scale as you grow. No hidden fees, no long-term lock-in.
              </p>
            </div>
            <div className={`grid gap-5 items-stretch ${(product as any).serviceAddons.length <= 3 ? "grid-cols-1 md:grid-cols-3" : (product as any).serviceAddons.length === 4 ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"}`}>
              {(product as any).serviceAddons.map((addon: any, i: number) => (
                <PricingTierCard key={addon.id} addon={addon} index={i} productId={product.id} />
              ))}
            </div>

            {/* White-Label highlight banner */}
            {(product as any).serviceAddons.some((a: any) => a.price >= 1000) && (
              <div className="mt-8 rounded-2xl bg-gradient-to-br from-yellow-900 via-amber-800 to-yellow-900 p-6 md:p-8 text-white shadow-xl shadow-amber-900/30 border border-yellow-700/40">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <Badge className="bg-yellow-400/20 text-yellow-300 border border-yellow-500/30 text-xs font-bold">WHITE-LABEL LICENSE — LIMITED</Badge>
                    </div>
                    <div className="text-4xl font-black text-yellow-300 mb-1">
                      ${(product as any).serviceAddons.find((a: any) => a.price >= 1000)?.price.toLocaleString()}.00
                    </div>
                    <p className="text-yellow-200/80 text-sm font-medium mb-1">
                      Own {product.title.split("—")[0].trim()} as Your Own SaaS Business. Forever.
                    </p>
                    <p className="text-yellow-100/70 text-sm">
                      Rebrand it. Price it. Sell it. Keep 100% of revenue.<br />
                      Includes 6 months of setup, training &amp; support.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[220px]">
                    <Link href={`/shop/checkout/${product.id}?plan=${(product as any).serviceAddons?.find((a: any) => a.price >= 1000)?.id || ''}`}>
                      <Button className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold rounded-xl shadow-lg text-base py-5">
                        <Crown className="w-4 h-4 mr-2" />
                        Get White-Label License
                      </Button>
                    </Link>
                    <Link href="/hire-developer">
                      <Button variant="outline" className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-800/40 rounded-xl">
                        <Briefcase className="w-4 h-4 mr-2" />
                        Hire Dev for Setup
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Details Tabs */}
        <div className="mb-12">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="mt-6">
              <Card>
                <CardContent className="prose max-w-none p-6">
                  <div className="whitespace-pre-wrap">{product.description}</div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="requirements" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  {product.requirements && product.requirements.length > 0 ? (
                    <ul className="space-y-2">
                      {product.requirements.map((requirement, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <span>{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No specific requirements</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              <div className="space-y-6">
                {/* Write Review */}
                {user && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Write a Review</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => setReviewRating(rating)}
                              className="p-1"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  rating <= reviewRating
                                    ? "text-yellow-500 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Your Review</label>
                        <Textarea
                          placeholder="Share your experience with this product..."
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button 
                        onClick={handleSubmitReview}
                        disabled={createReviewMutation.isPending || !reviewText.trim()}
                      >
                        {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review: ProductReview) => (
                      <Card key={review.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarFallback>
                                {review.userId.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.rating
                                          ? "text-yellow-500 fill-current"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                {review.isVerified && (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified Purchase
                                  </Badge>
                                )}
                                <span className="text-sm text-gray-500">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {review.title && (
                                <h4 className="font-medium mb-2">{review.title}</h4>
                              )}
                              <p className="text-gray-700">{review.comment}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
                        <p className="text-gray-500">Be the first to review this product</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="faq" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">How do I receive my purchase?</h4>
                      <p className="text-gray-600">After payment confirmation, you'll receive download links and access credentials via email.</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">What payment methods are accepted?</h4>
                      <p className="text-gray-600">Available payment options are controlled by the admin and verified before delivery.</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Is there a refund policy?</h4>
                      <p className="text-gray-600">Due to the digital nature of our products, refunds are handled on a case-by-case basis. Contact support for assistance.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Related Products</h2>
              <Link href={`/shop?category=${product.category}`}>
                <Button variant="outline">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((relatedProduct: ShopProduct) => (
                <Card key={relatedProduct.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader className="p-4">
                    {relatedProduct.featuredImage ? (
                      <img
                        src={relatedProduct.featuredImage}
                        alt={relatedProduct.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <CardTitle className="text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {relatedProduct.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-green-600">
                        {relatedProduct.isFree ? "Free" : `$${relatedProduct.price}`}
                      </span>
                      <Link href={`/shop/product/${relatedProduct.id}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}