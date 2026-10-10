import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft, Package, CheckCircle, Clock, Truck, XCircle, Download,
  MessageCircle, Star, ExternalLink, Copy, ShoppingBag, CreditCard,
  MapPin, Hash, Shield, User, AlertCircle, Zap, RefreshCw,
  FileText, Receipt, ChevronRight, Info, Printer, Eye, KeyRound, CalendarDays,
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

const TIMELINE_STEPS_PHYSICAL = [
  { key: "placed",    label: "Order Placed",  icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed",     icon: CheckCircle },
  { key: "shipped",   label: "Shipped",       icon: Truck },
  { key: "delivered", label: "Delivered",     icon: Package },
];

const TIMELINE_STEPS_DIGITAL = [
  { key: "placed",    label: "Order Placed",  icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed",     icon: CheckCircle },
  { key: "delivered", label: "Access Granted", icon: Zap },
];

// Map status → digital step index (1-based)
const DIGITAL_STATUS_STEP: Record<string, number> = {
  pending:   1,
  paid:      2,
  delivered: 3,
  cancelled: 0,
};

function StatusTimeline({ status, isPhysical }: { status: string; isPhysical: boolean }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const steps = isPhysical ? TIMELINE_STEPS_PHYSICAL : TIMELINE_STEPS_DIGITAL;
  const currentStep = isPhysical ? cfg.step : (DIGITAL_STATUS_STEP[status] ?? 1);

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
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
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
  const { user, isLoading: authLoading } = useAuth();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [revealedPluginKeys, setRevealedPluginKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user && id) {
      navigate(`/login?redirect=${encodeURIComponent(`/orders/${id}`)}`);
    }
  }, [authLoading, user, id, navigate]);

  const { data: order, isLoading, error } = useQuery<any>({
    queryKey: ["/api/my-orders/shop", id],
    enabled: !!id && !!user,
    refetchInterval: 8000,
  });

  const revealPluginKeyMutation = useMutation({
    mutationFn: async (licenseId: string) => {
      const response = await apiRequest("POST", `/api/my/plugin-licenses/${licenseId}/reveal`, {});
      return response.json();
    },
    onSuccess: (result, licenseId) => {
      setRevealedPluginKeys((current) => ({ ...current, [licenseId]: result.licenseKey }));
    },
    onError: (err: Error) => toast({ title: "Could not show license key", description: err.message, variant: "destructive" }),
  });

  const downloadPluginMutation = useMutation({
    mutationFn: async (license: { id: string; project: { slug: string; version: string } }) => {
      const response = await fetch(`/api/my/plugin-licenses/${license.id}/download`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Could not download the plugin.");
      }
      return {
        blob: await response.blob(),
        filename: `${license.project.slug}-premium-${license.project.version}.zip`,
      };
    },
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: "Plugin ZIP downloaded" });
    },
    onError: (err: Error) => toast({ title: "Download failed", description: err.message, variant: "destructive" }),
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

  if (authLoading || !user || isLoading) {
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
  const pluginLicense = order.pluginLicense || null;
  const pluginPlan = Array.isArray(order.selectedAddons)
    ? order.selectedAddons.find((addon: any) => addon.id === "plugin-monthly" || addon.id === "plugin-yearly")
    : null;
  const hasPluginLicensePlan = !!pluginPlan;
  const revealedPluginKey = pluginLicense ? revealedPluginKeys[pluginLicense.id] : null;
  const pluginExpiresAt = pluginLicense?.expiresAt ? new Date(pluginLicense.expiresAt) : null;
  const pluginDaysRemaining = pluginExpiresAt
    ? Math.max(0, Math.ceil((pluginExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const pluginLicenseActive = pluginLicense?.status === "active" && !!pluginExpiresAt && pluginExpiresAt.getTime() > Date.now();
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
    <>
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
              <StatusTimeline status={status} isPhysical={isPhysical} />
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
                {order.transactionHash && !order.transactionId && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Reference</span>
                    <button
                      onClick={() => copyToClipboard(order.transactionHash, "Reference copied")}
                      className="font-mono text-gray-700 hover:text-purple-600 flex items-center gap-1 transition-colors"
                    >
                      {(order.transactionHash as string).slice(0, 16)}… <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Status</span>
                  <Badge className={`text-[10px] ${cfg.bg} ${cfg.color} ${cfg.border} border`}>{cfg.label}</Badge>
                </div>
              </div>

              {/* Payment proof screenshot — visible to buyer, seller, admin */}
              {order.paymentProof && (order.paymentProof as string).startsWith("http") && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Payment Proof</p>
                  <a
                    href={order.paymentProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-gray-200 hover:border-purple-300 transition-colors group"
                  >
                    <img
                      src={order.paymentProof}
                      alt="Payment proof"
                      className="w-full h-28 object-cover group-hover:opacity-90 transition-opacity"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-xs text-purple-600 font-medium">
                      <Eye className="w-3 h-3" /> View full screenshot
                    </div>
                  </a>
                </div>
              )}

              {/* Receipt button */}
              <button
                onClick={() => setShowReceipt(true)}
                className="w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-gray-600 hover:text-purple-700 transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> View / Print Receipt
              </button>
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

        {/* ── Plugin License ─────────────────────────────── */}
        {(pluginLicense || hasPluginLicensePlan) && (
          <Card className="mb-5 overflow-hidden border-indigo-100 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 text-white">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-violet-200" />
                Plugin license &amp; WordPress access
              </CardTitle>
              <p className="text-sm text-indigo-100">
                {pluginLicense
                  ? `${pluginLicense.project?.name || product.title} · ${pluginLicense.cadence} plan`
                  : `${product.title} · ${pluginPlan?.title || "Plugin license"}`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {pluginLicense ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">License status</p>
                      <Badge className={`mt-1 ${pluginLicenseActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}`}>
                        {pluginLicenseActive ? "Active" : pluginLicense.status}
                      </Badge>
                    </div>
                    <div className="rounded-xl border bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Valid through</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        <CalendarDays className="h-4 w-4 text-indigo-600" />
                        {pluginExpiresAt ? format(pluginExpiresAt, "MMMM d, yyyy") : "Not available"}
                      </p>
                      {pluginLicenseActive && <p className="mt-1 text-xs text-gray-500">{pluginDaysRemaining} day{pluginDaysRemaining === 1 ? "" : "s"} remaining</p>}
                    </div>
                    <div className="rounded-xl border bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">WordPress sites</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">Up to {pluginLicense.maxActivations} sites</p>
                      <p className="mt-1 text-xs text-gray-500">Plan: {pluginLicense.cadence}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-semibold text-indigo-950">Your Taskdrip license key</p>
                        <p className="mt-1 text-xs text-indigo-700">Key ending {pluginLicense.keyPrefix}</p>
                      </div>
                      {revealedPluginKey ? (
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(revealedPluginKey, "License key copied")}>
                          <Copy className="mr-2 h-4 w-4" />Copy key
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => revealPluginKeyMutation.mutate(pluginLicense.id)} disabled={revealPluginKeyMutation.isPending}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          {revealPluginKeyMutation.isPending ? "Loading key…" : "Show license key"}
                        </Button>
                      )}
                    </div>
                    {revealedPluginKey && (
                      <p className="mt-3 break-all rounded-lg border border-indigo-100 bg-white p-3 font-mono text-sm text-gray-900" data-testid="text-plugin-license-key">
                        {revealedPluginKey}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => downloadPluginMutation.mutate(pluginLicense)} disabled={!pluginLicenseActive || downloadPluginMutation.isPending} className="bg-indigo-700 hover:bg-indigo-800">
                      <Download className="mr-2 h-4 w-4" />
                      {downloadPluginMutation.isPending ? "Preparing download…" : "Download premium ZIP"}
                    </Button>
                    {product.id && (
                      <Button asChild variant="outline">
                        <a href={`/shop/product/${pluginLicense.project?.slug || product.id}?plan=${pluginLicense.cadence === "yearly" ? "plugin-yearly" : "plugin-monthly"}`}>
                          <RefreshCw className="mr-2 h-4 w-4" />Renew {pluginLicense.cadence} plan
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="outline">
                      <a href={`/my-plugins?license=${encodeURIComponent(pluginLicense.id)}#support`}>
                        <MessageCircle className="mr-2 h-4 w-4" />Developer chat
                      </a>
                    </Button>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                    Install the free Core plugin first, then the Premium ZIP. In WordPress, open <strong>Settings → Plugin License</strong>, paste the key, and choose <strong>Activate license</strong>. This plan does not renew automatically; renew before the valid-through date.
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900">License is being prepared</p>
                    <p className="mt-1 text-sm text-amber-800">
                      {status === "paid"
                        ? "Your payment is approved. The license key and premium download will appear here as soon as issuance completes."
                        : "After your payment is approved, the license key, validity date, and premium download will appear here."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Delivery / Download ────────────────────────── */}
        {(hasDownload || (isPhysical && (hasTracking || delivery.address))) && (
          <Card className="mb-5 shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                {isPhysical
                  ? <><Truck className="w-4 h-4 text-violet-500" /> Shipping & Delivery</>
                  : <><Zap className="w-4 h-4 text-violet-500" /> Access & Download</>
                }
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
                    <p className="font-bold text-purple-700 text-sm">Download / Access Your Product</p>
                    <p className="text-xs text-purple-500 truncate">{delivery.downloadUrl}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0" />
                </a>
              )}

              {/* Physical-only: tracking & address */}
              {isPhysical && hasTracking && (
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

              {isPhysical && delivery.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Shipping Address</p>
                    <p className="text-sm text-gray-700">{delivery.address}</p>
                    {delivery.estimatedDelivery && (
                      <p className="text-xs text-gray-400 mt-1">Est. delivery: {delivery.estimatedDelivery}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Digital: pending-access note */}
              {!isPhysical && !hasDownload && status === "paid" && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Access being prepared</p>
                    <p className="text-xs text-amber-600 mt-0.5">Your payment is confirmed. The seller will grant access shortly — usually within 24 hours.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Shipping Timeline — physical products only ─── */}
        {isPhysical && shippingUpdates.length > 0 && (
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
          <Button
            variant="outline"
            className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            onClick={() => setShowReceipt(true)}
            data-testid="btn-print-receipt"
          >
            <Receipt className="w-4 h-4" /> View Receipt
          </Button>
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

    {/* ── Receipt Dialog ──────────────────────────────── */}
    <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-violet-600" /> Payment Receipt
          </DialogTitle>
          <DialogDescription>Receipt #{(id || "").slice(0, 8).toUpperCase()}</DialogDescription>
        </DialogHeader>

        <div id="receipt-printable-detail" className="space-y-3">
          {/* Header */}
          <div className="text-center border-b border-violet-100 pb-4">
            <p className="text-2xl font-black text-violet-700">Taskdrip</p>
            <p className="text-xs text-gray-500">Official Payment Receipt</p>
            <p className="text-xs text-gray-400 mt-1">Receipt #{(id || "").slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Details */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Item</span>
              <span className="font-semibold text-gray-900 text-right max-w-[60%] leading-snug">{product.title || `Order #${(id || "").slice(0, 8)}`}</span>
            </div>
            {order.createdAt && (
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">{format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Category</span>
              <span className="font-medium text-gray-900">{productCategory}</span>
            </div>
            {order.paymentMethod && (
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium text-gray-900 capitalize">{order.paymentMethod}</span>
              </div>
            )}
            {(order.transactionHash || order.transactionId) && (
              <div className="flex justify-between items-start py-1.5 border-b border-gray-50 gap-2">
                <span className="text-gray-500 shrink-0">Reference</span>
                <span className="font-mono text-xs text-gray-700 break-all text-right">{order.transactionHash || order.transactionId}</span>
              </div>
            )}
            {order.paymentProof && (order.paymentProof as string).startsWith("http") && (
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Payment Proof</span>
                <a href={order.paymentProof} target="_blank" rel="noreferrer" className="text-violet-600 underline text-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" /> View screenshot
                </a>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Order Status</span>
              <span className={`font-bold text-xs ${["paid","delivered"].includes(status) ? "text-emerald-600" : "text-amber-600"}`}>
                {["paid","delivered"].includes(status) ? "✓ Payment Confirmed" : "⏳ Pending Verification"}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-1">
              <span className="text-base font-bold text-gray-900">Total Paid</span>
              <span className="text-xl font-black text-violet-700">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 pt-2 border-t">
            Thank you for your purchase on Taskdrip.<br />
            Keep this receipt for your records.
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={printReceipt}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
          <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
