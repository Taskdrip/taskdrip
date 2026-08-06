import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft, Package, CheckCircle, Clock, Truck, XCircle, Download,
  MessageCircle, Star, ExternalLink, Copy, ShoppingBag, CreditCard,
  MapPin, Hash, Shield, User, AlertCircle, Zap, RefreshCw,
  FileText, Receipt, ChevronRight, Info, Printer
} from "lucide-react";

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  icon: any; step: number; gradient: string;
}> = {
  pending:   { label: "Pending",   color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  icon: Clock,       step: 1, gradient: "from-amber-400 to-orange-500" },
  paid:      { label: "Confirmed", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   icon: CheckCircle, step: 2, gradient: "from-blue-400 to-indigo-500" },
  shipped:   { label: "Shipped",   color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: Truck,       step: 3, gradient: "from-violet-400 to-purple-500" },
  delivered: { label: "Delivered", color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  icon: CheckCircle, step: 4, gradient: "from-green-400 to-emerald-500" },
  cancelled: { label: "Cancelled", color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    icon: XCircle,     step: 0, gradient: "from-red-400 to-rose-500" },
};

const TIMELINE_STEPS = [
  { key: "placed",    label: "Order Placed",  icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed",     icon: CheckCircle },
  { key: "shipped",   label: "Shipped",       icon: Truck },
  { key: "delivered", label: "Delivered",     icon: Package },
];

function StatusTimeline({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const currentStep = cfg.step;

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-700">Order Cancelled</p>
          <p className="text-xs text-red-500">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-2">
        {TIMELINE_STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const isPending = stepNum > currentStep;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2 z-0 ${isCompleted ? `bg-gradient-to-r ${cfg.gradient}` : 'bg-gray-200'}`}
                  style={{ width: 'calc(100% - 1rem)', left: 'calc(50% + 1rem)' }} />
              )}
              {/* Circle */}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                isCompleted ? `bg-gradient-to-br ${cfg.gradient} text-white shadow-md` :
                isActive    ? `bg-gradient-to-br ${cfg.gradient} text-white shadow-lg ring-4 ring-white` :
                              'bg-gray-100 text-gray-300'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className={`mt-2 text-[10px] font-semibold text-center leading-tight ${isActive ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-300'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
        >
          <Star className={`w-6 h-6 transition-colors ${(hover || value) >= s ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReview, setShowReview] = useState(false);

  const { data: order, isLoading, error } = useQuery<any>({
    queryKey: ["/api/my-orders/shop", id],
    enabled: !!id,
    refetchInterval: 8000,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/my-orders/shop/${id}/review`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setShowReview(false);
      setReviewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders/shop", id] });
    },
    onError: () => toast({ title: "Failed to submit review", variant: "destructive" }),
  });

  function copyToClipboard(text: string, label = "Copied") {
    navigator.clipboard.writeText(text).then(() => toast({ title: label }));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-3xl mx-auto px-4 pt-28 pb-16">
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-xl mx-auto px-4 pt-28 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-6">This order doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate("/dashboard")} className="bg-purple-600 hover:bg-purple-700">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const product = order.product || {};
  const seller = order.seller;
  const delivery = order.deliveryDetails || {};
  const shippingUpdates: any[] = Array.isArray(delivery.shippingUpdates) ? delivery.shippingUpdates : [];
  const status = order.status || "pending";
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const isCancelled = status === "cancelled";
  const isDelivered = status === "delivered";
  const isCrypto = (order.paymentMethod || "").toLowerCase() === "crypto";
  const totalAmount = parseFloat(order.totalAmount || order.amount || 0);

  const productCategory = product.category || product.productType || "Digital Product";
  const hasDownload = !!delivery.downloadUrl;
  const hasTracking = !!(delivery.trackingNumber);
  // Physical products (tangible goods) show shipping/tracking info; digital products use access grant flow
  const isPhysical = (product.type || "").toLowerCase() === "physical";

  // ── Print receipt ─────────────────────────────────────────────────────────
  function printReceipt() {
    const win = window.open("", "_blank");
    if (!win) return;
    const receiptNum = (id || "").slice(0, 8).toUpperCase();
    win.document.write(`<html><head><title>Receipt #${receiptNum}</title><style>
      body{font-family:sans-serif;padding:40px;max-width:480px;margin:auto}
      h1{font-size:22px;font-weight:900;color:#7c3aed;margin:0}
      .sub{font-size:12px;color:#6b7280;margin-bottom:24px}
      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
      .label{color:#6b7280}.val{font-weight:600;color:#111827;text-align:right;max-width:60%}
      .total{display:flex;justify-content:space-between;padding:12px 0;font-size:16px;font-weight:900;margin-top:8px}
      .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px}
    </style></head><body>
      <h1>Taskdrip</h1><p class="sub">Official Payment Receipt — #${receiptNum}</p>
      <div class="row"><span class="label">Product</span><span class="val">${product.title || `Order #${receiptNum}`}</span></div>
      <div class="row"><span class="label">Date</span><span class="val">${order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</span></div>
      <div class="row"><span class="label">Category</span><span class="val">${productCategory}</span></div>
      ${order.paymentMethod ? `<div class="row"><span class="label">Payment Method</span><span class="val">${order.paymentMethod}</span></div>` : ""}
      ${order.transactionId ? `<div class="row"><span class="label">Reference</span><span class="val" style="font-family:monospace;font-size:11px">${order.transactionId}</span></div>` : ""}
      <div class="row"><span class="label">Status</span><span class="val">${cfg.label}</span></div>
      <div class="total"><span>Total Paid</span><span style="color:#7c3aed">$${totalAmount.toFixed(2)}</span></div>
      <p class="footer">Thank you for your purchase on Taskdrip.<br/>Keep this receipt for your records.</p>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <NavigationFixed />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-20">

        {/* Back nav */}
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-6 transition-colors group"
          data-testid="btn-back-order"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Orders
        </button>

        {/* ── Hero Card ─────────────────────────────────────── */}
        <div className={`relative overflow-hidden rounded-2xl mb-6 shadow-lg bg-gradient-to-br ${cfg.gradient}`}>
          {/* Product image as blurred background */}
          {product.imageUrl && (
            <div className="absolute inset-0 opacity-20">
              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex items-start gap-4">
              {/* Product thumbnail */}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex-shrink-0 overflow-hidden border border-white/30 shadow-lg">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-white/60" />
                  </div>
                )}
              </div>

              {/* Title & meta */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge className="bg-white/20 text-white border-white/30 text-xs font-semibold backdrop-blur-sm">
                    {productCategory}
                  </Badge>
                  <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-xs font-bold`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-white leading-tight mb-1" data-testid="order-product-title">
                  {product.title || `Order #${(id || "").slice(0, 8)}`}
                </h1>
                {order.createdAt && (
                  <p className="text-white/70 text-xs">
                    Ordered on {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-black text-white">${totalAmount.toFixed(2)}</div>
                <div className="text-white/70 text-xs mt-0.5">{isCrypto ? "Paid via Crypto" : order.paymentMethod || "Crypto"}</div>
              </div>
            </div>

            {/* Order ID row */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
              <Hash className="w-3.5 h-3.5 text-white/50" />
              <span className="text-white/60 text-xs font-medium">Order ID</span>
              <span className="font-mono text-white/90 text-xs" data-testid="order-id">{id}</span>
              <button onClick={() => copyToClipboard(id!, "Order ID copied")} className="ml-1 p-1 rounded hover:bg-white/10 transition-colors">
                <Copy className="w-3 h-3 text-white/50" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Status Timeline ─────────────────────────────── */}
        {!isCancelled && (
          <Card className="mb-5 shadow-sm border-0 bg-white">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Order Progress
              </h3>
              <StatusTimeline status={status} />
            </CardContent>
          </Card>
        )}

        {/* ── Main Content Grid ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

          {/* Payment Summary */}
          <Card className="shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-green-600" /> Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Order summary reflects only what the buyer actually paid.
                  Platform fees are deducted from the SELLER's payout — they
                  are never added on top of the buyer's bill. */}
              <div className="border-t-0 pt-0 flex justify-between">
                <span className="font-bold text-gray-900">Total Paid</span>
                <span className="font-black text-lg text-gray-900" data-testid="text-total-paid">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Method</span>
                  <span className="font-medium text-gray-700">{order.paymentMethod || "Crypto"}</span>
                </div>
                {order.transactionId && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Tx ID</span>
                    <button
                      onClick={() => copyToClipboard(order.transactionId, "Transaction ID copied")}
                      className="font-mono text-gray-700 hover:text-purple-600 flex items-center gap-1 transition-colors"
                      data-testid="btn-copy-txid"
                    >
                      {order.transactionId.slice(0, 16)}… <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Status</span>
                  <Badge className={`text-[10px] ${cfg.bg} ${cfg.color} ${cfg.border} border`}>{cfg.label}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card className="shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {product.description && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{product.description}</p>
              )}
              <div className="space-y-2 text-xs text-gray-500">
                {productCategory && (
                  <div className="flex items-center justify-between">
                    <span>Category</span>
                    <Badge variant="secondary" className="text-[10px]">{productCategory}</Badge>
                  </div>
                )}
                {product.fileType && (
                  <div className="flex items-center justify-between">
                    <span>File Type</span>
                    <span className="font-medium text-gray-700 uppercase">{product.fileType}</span>
                  </div>
                )}
                {product.language && (
                  <div className="flex items-center justify-between">
                    <span>Language</span>
                    <span className="font-medium text-gray-700">{product.language}</span>
                  </div>
                )}
              </div>
              {product.id && (
                <Link href={`/shop/product/${product.id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs gap-2 mt-2" data-testid="btn-view-product">
                    <ExternalLink className="w-3 h-3" /> View Product Page
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Delivery / Download ────────────────────────── */}
        {(hasDownload || hasTracking || delivery.address) && (
          <Card className="mb-5 shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Truck className="w-4 h-4 text-violet-500" /> Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {hasDownload && (
                <a
                  href={delivery.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl hover:shadow-md transition-all group"
                  data-testid="btn-download-product"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-purple-700 text-sm">Download Your Product</p>
                    <p className="text-xs text-purple-500 truncate">{delivery.downloadUrl}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0" />
                </a>
              )}

              {hasTracking && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Tracking Number</p>
                    <p className="font-mono font-bold text-gray-900 text-sm">{delivery.trackingNumber}</p>
                    {delivery.carrier && <p className="text-xs text-gray-400 mt-0.5">via {delivery.carrier}</p>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => copyToClipboard(delivery.trackingNumber, "Tracking number copied")}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                </div>
              )}

              {delivery.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Delivery Address</p>
                    <p className="text-sm text-gray-700">{delivery.address}</p>
                    {delivery.estimatedDelivery && (
                      <p className="text-xs text-gray-400 mt-1">Est. delivery: {delivery.estimatedDelivery}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Shipping Timeline ──────────────────────────── */}
        {shippingUpdates.length > 0 && (
          <Card className="mb-5 shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-500" /> Shipping Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative">
                {[...shippingUpdates].reverse().map((upd: any, i) => (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${i === 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {i < shippingUpdates.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize">{upd.status}</Badge>
                        {upd.location && <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{upd.location}</span>}
                      </div>
                      {upd.note && <p className="text-sm text-gray-700 mt-0.5">{upd.note}</p>}
                      {upd.ts && <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(upd.ts), "MMM d, yyyy 'at' h:mm a")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Seller Info ────────────────────────────────── */}
        {seller && (
          <Card className="mb-5 shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" /> Seller
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-purple-100">
                  <AvatarImage src={seller.profileImageUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold">
                    {seller.firstName?.[0] || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{seller.firstName} {seller.lastName}</p>
                  <p className="text-xs text-gray-500 capitalize">{seller.userType || 'Seller'}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href={`/chat?to=${seller.id}`}>
                    <Button size="sm" variant="outline" className="gap-2 text-xs" data-testid="btn-message-seller">
                      <MessageCircle className="w-3.5 h-3.5" /> Message
                    </Button>
                  </Link>
                  <Link href={seller.userType === 'brand' ? `/brand/${seller.id}` : `/influencers/${seller.id}`}>
                    <Button size="sm" variant="ghost" className="gap-2 text-xs" data-testid="btn-view-seller">
                      <ExternalLink className="w-3.5 h-3.5" /> Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Actions Row ────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-5">
          {hasDownload && (
            <a href={delivery.downloadUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25" data-testid="btn-download-main">
                <Download className="w-4 h-4" /> Download Product
              </Button>
            </a>
          )}
          {isDelivered && !showReview && (
            <Button
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => setShowReview(true)}
              data-testid="btn-leave-review"
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Leave a Review
            </Button>
          )}
          <Link href="/shop">
            <Button variant="outline" className="gap-2" data-testid="btn-browse-shop">
              <ShoppingBag className="w-4 h-4" /> Browse Shop
            </Button>
          </Link>
          <Link href="/my-orders">
            <Button variant="ghost" className="gap-2 text-gray-500" data-testid="btn-all-orders">
              All Orders <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* ── Leave a Review ────────────────────────────── */}
        {showReview && (
          <Card className="mb-5 shadow-sm border border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Rate this Product
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <StarRatingInput value={reviewRating} onChange={setReviewRating} />
              <Textarea
                placeholder="Share your experience with this product…"
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={3}
                className="bg-white border-amber-200 resize-none text-sm"
                data-testid="input-review-comment"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                  data-testid="btn-submit-review"
                >
                  <Star className="w-4 h-4" />
                  {reviewMutation.isPending ? "Submitting…" : "Submit Review"}
                </Button>
                <Button variant="ghost" onClick={() => setShowReview(false)} className="text-gray-500">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Info Footer ────────────────────────────────── */}
        <div className="flex items-start gap-2 p-4 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <p>
            If you have any issues with your order, please message the seller directly or contact{' '}
            <a href="mailto:support@taskdrip.com" className="text-purple-600 hover:underline">support@taskdrip.com</a>.
            Order records are retained for 12 months.
          </p>
        </div>

      </div>
    </div>
  );
}
