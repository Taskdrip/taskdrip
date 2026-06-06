import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Star, Send } from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter } from "date-fns";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag, BookOpen, ArrowLeftRight, Shield, Briefcase,
  Download, Eye, FileText, Package, Clock, CheckCircle2,
  XCircle, AlertCircle, Truck, ReceiptText, FileSpreadsheet,
  CalendarRange, Filter, TrendingUp, DollarSign,
  Megaphone, Trophy, Home, School, MonitorPlay, Baby, MapPin, GraduationCap,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type OrderType = "shop" | "course" | "p2p" | "campaign" | "direct_hire" | "ad" | "subscription";

interface UnifiedOrder {
  id: string;
  type: OrderType;
  title: string;
  description: string;
  amount: number;
  fee: number;
  totalCharged: number;
  status: string;
  date: string;
  paymentMethod?: string;
  transactionHash?: string;
  network?: string;
  paymentProof?: string;
  shipping?: {
    address?: string;
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    deliveredAt?: string;
  };
  progress?: number;
  raw: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function pct(base: number, rate = 0.1) {
  return +(base * rate).toFixed(2);
}

function typeIcon(type: OrderType) {
  const icons: Record<OrderType, JSX.Element> = {
    shop: <ShoppingBag className="h-4 w-4" />,
    course: <BookOpen className="h-4 w-4" />,
    p2p: <ArrowLeftRight className="h-4 w-4" />,
    campaign: <Shield className="h-4 w-4" />,
    direct_hire: <Briefcase className="h-4 w-4" />,
    ad: <Megaphone className="h-4 w-4" />,
    subscription: <Trophy className="h-4 w-4" />,
  };
  return icons[type];
}

function typeLabel(type: OrderType) {
  const labels: Record<OrderType, string> = {
    shop: "Shop Order",
    course: "Course",
    p2p: "P2P Trade",
    campaign: "Campaign Escrow",
    direct_hire: "Direct Hire",
    ad: "Ads Campaign",
    subscription: "Subscription",
  };
  return labels[type];
}

function typeColor(type: OrderType) {
  const colors: Record<OrderType, string> = {
    shop: "bg-orange-100 text-orange-800",
    course: "bg-purple-100 text-purple-800",
    p2p: "bg-blue-100 text-blue-800",
    campaign: "bg-green-100 text-green-800",
    direct_hire: "bg-rose-100 text-rose-800",
    ad: "bg-violet-100 text-violet-800",
    subscription: "bg-amber-100 text-amber-800",
  };
  return colors[type];
}

function statusColor(status: string) {
  if (["completed", "approved", "delivered", "active", "paid"].includes(status))
    return "bg-emerald-100 text-emerald-800";
  if (["pending", "processing", "verifying", "payment_window", "submitted", "pending_payment"].includes(status))
    return "bg-amber-100 text-amber-800";
  if (["cancelled", "failed", "refunded", "expired", "rejected"].includes(status))
    return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function statusIcon(status: string) {
  if (["completed", "approved", "delivered", "active", "paid"].includes(status))
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (["cancelled", "failed", "refunded", "expired", "rejected"].includes(status))
    return <XCircle className="h-4 w-4 text-red-600" />;
  if (["verifying", "payment_window"].includes(status))
    return <Clock className="h-4 w-4 text-amber-600" />;
  return <AlertCircle className="h-4 w-4 text-gray-400" />;
}

// ── Normalise raw API data into unified orders ────────────────────────────────
function normaliseOrders(data: any): UnifiedOrder[] {
  if (!data) return [];
  const orders: UnifiedOrder[] = [];

  // Shop orders — buyer paid exactly what's stored on the order; the 10% platform
  // fee is deducted from the SELLER's payout and never added to the buyer's bill.
  (data.shopOrders || []).forEach((o: any) => {
    const paid = +o.totalAmount || +o.amount;
    orders.push({
      id: o.id,
      type: "shop",
      title: o.product?.title || "Shop item",
      description: `Qty: ${o.quantity || 1} · ${o.product?.category || "Product"}`,
      amount: paid,
      fee: 0,
      totalCharged: paid,
      status: o.status,
      date: o.createdAt,
      paymentMethod: o.paymentMethod,
      transactionHash: o.transactionHash,
      paymentProof: o.paymentProof,
      shipping: {
        address: o.deliveryDetails?.address,
        trackingNumber: o.deliveryDetails?.trackingNumber,
        carrier: o.deliveryDetails?.carrier,
        estimatedDelivery: o.deliveryDetails?.estimatedDelivery,
        deliveredAt: o.deliveredAt,
      },
      raw: o,
    });
  });

  // Course enrollments — student paid the listed price; the 10% platform fee is
  // deducted from the INSTRUCTOR's payout, not added to the student's bill.
  (data.courseOrders || []).forEach((o: any) => {
    const paid = +o.amount;
    orders.push({
      id: o.id,
      type: "course",
      title: o.course?.title || "Course",
      description: `Progress: ${o.progress || 0}%`,
      amount: paid,
      fee: 0,
      totalCharged: paid,
      status: o.isPaid ? (o.status || "active") : "pending_payment",
      date: o.createdAt,
      paymentMethod: o.paymentMethod,
      transactionHash: o.transactionHash,
      paymentProof: o.paymentProof,
      progress: o.progress,
      raw: o,
    });
  });

  // P2P transactions — buyer paid the displayed totalAmount; the platform fee
  // is part of the SELLER's accounting, not added on top of the buyer's bill.
  (data.p2pTransactions || []).forEach((o: any) => {
    const paid = +o.totalAmount || +o.amount;
    orders.push({
      id: o.id,
      type: "p2p",
      title: o.listing?.title || "P2P Trade",
      description: `${o.transactionType} · ${o.buyerId === o.sellerId ? "Self" : "Peer"}`,
      amount: paid,
      fee: 0,
      totalCharged: paid,
      status: o.status,
      date: o.createdAt,
      paymentMethod: "crypto",
      transactionHash: undefined,
      paymentProof: o.paymentProof,
      raw: o,
    });
  });

  // Campaign escrow — brand pays the EXACT campaign budget. The 10% platform
  // fee is deducted from each influencer's payout, never added to the brand's bill.
  (data.escrowOrders || []).forEach((o: any) => {
    const paid = +o.amount;
    orders.push({
      id: o.id,
      type: "campaign",
      title: o.campaign?.title ? `Campaign: ${o.campaign.title}` : "Campaign Escrow",
      description: o.transactionHash ? `Tx: ${o.transactionHash.slice(0, 16)}…` : "Awaiting proof",
      amount: paid,
      fee: 0,
      totalCharged: paid,
      status: o.status,
      date: o.createdAt,
      paymentMethod: o.network,
      transactionHash: o.transactionHash,
      paymentProof: o.paymentScreenshot,
      raw: o,
    });
  });

  // Direct hire
  (data.directHireOrders || []).forEach((o: any) => {
    const base = +o.budget;
    const total = base; // Brands pay exact budget — no brand fee
    orders.push({
      id: o.id,
      type: "direct_hire",
      title: o.title || "Direct Hire",
      description: o.requirements ? o.requirements.slice(0, 80) + (o.requirements.length > 80 ? "…" : "") : "Direct hire offer",
      amount: base,
      fee: 0,
      totalCharged: total,
      status: o.status,
      date: o.createdAt,
      paymentMethod: o.paymentNetwork,
      transactionHash: o.transactionHash,
      paymentProof: o.paymentProof,
      raw: o,
    });
  });

  // Premium / Brand Pro subscriptions
  (data.subscriptionOrders || []).forEach((o: any) => {
    const planLabel = String(o.plan || '').includes('brand') ? 'Brand Pro' : 'Influencer Premium';
    const periodLabel = o.periodDays === 3 ? '3-day' : o.periodDays === 5 ? '5-day' : o.periodDays === 365 ? 'Yearly' : 'Monthly';
    const base = Number(o.amount || 0);
    orders.push({
      id: o.id,
      type: "subscription",
      title: `${periodLabel} ${planLabel} Subscription`,
      description: o.status === 'active' && o.expiresAt
        ? `Active until ${new Date(o.expiresAt).toLocaleDateString()}`
        : o.status === 'pending' ? 'Awaiting admin approval'
        : o.status === 'rejected' ? (o.rejectionReason || 'Payment rejected')
        : 'Subscription receipt',
      amount: base,
      fee: 0,
      totalCharged: base,
      status: o.status,
      date: o.createdAt,
      paymentMethod: o.network || 'crypto',
      transactionHash: o.transactionHash,
      paymentProof: o.paymentProof,
      raw: o,
    });
  });

  (data.adApplications || []).forEach((o: any) => {
    const payment = (data.adPaymentDeposits || []).find((p: any) => String(p.adminNotes || "").includes(`ads_application:${o.id}`)) || o.payment;
    const base = Number(o.budget || payment?.amount || 0);
    const total = Number(payment?.amount || base);
    orders.push({
      id: o.id,
      type: "ad",
      title: o.companyName ? `Ads: ${o.companyName}` : "Advertising campaign",
      description: o.message || `${o.adType || "Advertising"} campaign`,
      amount: base,
      fee: Math.max(0, total - base),
      totalCharged: total,
      status: payment?.status || o.status || "pending",
      date: payment?.createdAt || o.createdAt,
      paymentMethod: payment ? "crypto" : undefined,
      transactionHash: payment?.transactionHash,
      network: payment?.network,
      paymentProof: payment?.paymentProof,
      raw: { ...o, payment },
    });
  });

  return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ── Period filter ─────────────────────────────────────────────────────────────
function filterByPeriod(orders: UnifiedOrder[], period: string) {
  if (period === "all") return orders;
  const now = new Date();
  const cutoff =
    period === "today" ? subDays(now, 1) :
    period === "week" ? subDays(now, 7) :
    period === "month" ? subMonths(now, 1) :
    period === "year" ? subYears(now, 1) :
    new Date(0);
  return orders.filter((o) => isAfter(new Date(o.date), cutoff));
}

// ── Order Detail Dialog ───────────────────────────────────────────────────────
function OrderDetailDialog({ order, open, onClose }: { order: UnifiedOrder | null; open: boolean; onClose: () => void }) {
  if (!order) return null;

  const raw = order.raw;
  const deliveryDetails = raw.deliveryDetails;
  const isShop = order.type === "shop";
  const isCourse = order.type === "course";
  const { toast } = useToast();

  // Live order detail (for tracking timeline + seller info). Polls every 5s while dialog open.
  const { data: detail } = useQuery<any>({
    queryKey: ["/api/my-orders/shop", order.id],
    enabled: open && isShop,
    refetchInterval: open && isShop ? 5000 : false,
  });
  const seller = detail?.seller || null;
  const role: "buyer" | "seller" | undefined = detail?.role;
  const liveDelivery = detail?.deliveryDetails || deliveryDetails || {};
  const shippingUpdates: any[] = Array.isArray(liveDelivery?.shippingUpdates) ? liveDelivery.shippingUpdates : [];

  // Course seller (instructor) — pulled from raw enrollment data
  const courseSellerId: string | null = isCourse ? (raw?.sellerId || raw?.course?.instructorId || null) : (detail?.sellerId || null);
  const sellerIdToMessage = isShop ? (detail?.sellerId || null) : courseSellerId;

  // ── Mutations ──
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/my-orders/shop/${order.id}/review`, { rating: reviewRating, comment: reviewComment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review submitted", description: "Thanks for your feedback!" });
      setReviewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || "Could not submit review", variant: "destructive" }),
  });

  const [updStatus, setUpdStatus] = useState("shipped");
  const [updNote, setUpdNote] = useState("");
  const [updLocation, setUpdLocation] = useState("");
  const [updTracking, setUpdTracking] = useState("");
  const [updCarrier, setUpdCarrier] = useState("");
  const trackingMutation = useMutation({
    mutationFn: async () => {
      const body: any = { status: updStatus, note: updNote, location: updLocation };
      if (updTracking) body.trackingNumber = updTracking;
      if (updCarrier) body.carrier = updCarrier;
      const res = await apiRequest("POST", `/api/my-orders/shop/${order.id}/tracking`, body);
      return res.json();
    },
    onSuccess: () => {
      setUpdNote(""); setUpdLocation("");
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders/shop", order.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
      toast({ title: "Tracking updated", description: "Buyer will see this in real time." });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || "Could not update tracking", variant: "destructive" }),
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/my-orders/shop/${order.id}/confirm-delivery`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders/shop", order.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
      toast({ title: "Delivery confirmed", description: "Thanks! Order is now closed — share a review below." });
    },
    onError: (e: any) => toast({ title: "Couldn't confirm", description: e?.message || "Try again", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor(order.type)}`}>
              {typeIcon(order.type)} {typeLabel(order.type)}
            </span>
            <span className="text-gray-900 font-bold">{order.title}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Order ID: <span className="font-mono text-xs">{order.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            {statusIcon(order.status)}
            <div>
              <p className="text-sm font-semibold text-gray-700">Status</p>
              <Badge className={statusColor(order.status)}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm font-medium">{format(new Date(order.date), "MMM d, yyyy · h:mm a")}</p>
            </div>
          </div>

          {/* Quick item link */}
          {(() => {
            const link =
              isShop && raw?.productId ? `/shop/${raw.productId}` :
              isCourse && raw?.courseId ? `/breedskool/${raw.courseId}` :
              order.type === "p2p" && raw?.id ? `/p2p/${raw.listingId || raw.id}` :
              order.type === "campaign" && raw?.campaignId ? `/campaigns/${raw.campaignId}` :
              order.type === "direct_hire" && raw?.id ? `/direct-hire/${raw.id}` :
              order.type === "ad" && raw?.id ? `/admin/ads` : null;
            if (!link) return null;
            return (
              <Link href={link}>
                <Button variant="outline" className="w-full justify-between" data-testid={`button-view-item-${order.id}`}>
                  <span className="flex items-center gap-2">
                    {typeIcon(order.type)}
                    View {order.type === "shop" ? "product" : order.type === "course" ? "course" : order.type === "p2p" ? "P2P listing" : order.type === "campaign" ? "campaign" : order.type === "direct_hire" ? "project" : "item"}
                  </span>
                  <span className="text-xs text-gray-400">↗</span>
                </Button>
              </Link>
            );
          })()}

          {/* Charge Breakdown — show only what the user actually paid. Platform
              fees are deducted from the recipient's payout, not added to the
              payer's bill, so we don't surface them on the buyer/brand receipt. */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-gray-500" /> Payment Summary
            </h3>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {order.fee > 0 ? (
                <>
                  <div className="flex justify-between items-center px-4 py-3 bg-white">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">{money(order.amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center px-4 py-3 bg-white">
                    <span className="text-sm text-gray-600">Network / processing fee</span>
                    <span className="font-semibold text-gray-700">{money(order.fee)}</span>
                  </div>
                  <Separator />
                </>
              ) : null}
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                <span className="text-sm font-bold text-gray-900">Total paid</span>
                <span className="text-lg font-black text-gray-900" data-testid={`text-order-total-${order.id}`}>{money(order.totalCharged)}</span>
              </div>
            </div>
            {(order.type === "campaign" || order.type === "direct_hire") && (
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                Brands are never charged a platform fee. The 10% Taskdrip fee is
                deducted from each influencer's payout, not added to your bill.
              </p>
            )}
          </div>

          {/* Payment Details */}
          {(order.paymentMethod || order.transactionHash || order.network) && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" /> Payment Details
              </h3>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                {order.paymentMethod && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Payment method</span>
                    <span className="text-sm font-medium capitalize">{order.paymentMethod}</span>
                  </div>
                )}
                {order.network && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Network</span>
                    <span className="text-sm font-medium">{order.network}</span>
                  </div>
                )}
                {order.transactionHash && (
                  <div className="flex justify-between items-start px-4 py-3 gap-3">
                    <span className="text-sm text-gray-500 shrink-0">Transaction hash</span>
                    <span className="text-xs font-mono text-gray-700 break-all text-right">{order.transactionHash}</span>
                  </div>
                )}
                {order.paymentProof && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Payment proof</span>
                    <a
                      href={order.paymentProof.startsWith("http") ? order.paymentProof : `/${order.paymentProof}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 underline"
                      data-testid={`link-proof-${order.id}`}
                    >
                      View proof
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Access / Delivery granted by admin */}
          {(deliveryDetails?.downloadUrl || deliveryDetails?.accessUrl || deliveryDetails?.licenseKey || deliveryDetails?.accessNotes) && (
            <div>
              <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Access Granted
              </h3>
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 divide-y divide-emerald-100">
                {deliveryDetails.downloadUrl && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-emerald-700 font-semibold">Download</span>
                    <a href={deliveryDetails.downloadUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline font-medium" data-testid={`link-download-${order.id}`}>
                      Open file ↗
                    </a>
                  </div>
                )}
                {deliveryDetails.accessUrl && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-emerald-700 font-semibold">Access link</span>
                    <a href={deliveryDetails.accessUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline font-medium break-all text-right" data-testid={`link-access-${order.id}`}>
                      {deliveryDetails.accessUrl}
                    </a>
                  </div>
                )}
                {deliveryDetails.licenseKey && (
                  <div className="flex justify-between items-center px-4 py-3 gap-3">
                    <span className="text-sm text-emerald-700 font-semibold">License key</span>
                    <span className="text-xs font-mono bg-white border border-emerald-200 px-2 py-1 rounded text-emerald-800 select-all" data-testid={`text-license-${order.id}`}>
                      {deliveryDetails.licenseKey}
                    </span>
                  </div>
                )}
                {deliveryDetails.accessNotes && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Notes from admin</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{deliveryDetails.accessNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping / Delivery */}
          {order.type === "shop" && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-500" /> Shipping & Delivery
              </h3>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                {order.shipping?.address ? (
                  <div className="flex justify-between items-start px-4 py-3 gap-3">
                    <span className="text-sm text-gray-500 shrink-0">Shipping address</span>
                    <span className="text-sm font-medium text-right">{order.shipping.address}</span>
                  </div>
                ) : null}
                {order.shipping?.trackingNumber ? (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Tracking #</span>
                    <span className="text-sm font-mono">{order.shipping.trackingNumber}</span>
                  </div>
                ) : null}
                {order.shipping?.carrier ? (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Carrier</span>
                    <span className="text-sm font-medium">{order.shipping.carrier}</span>
                  </div>
                ) : null}
                {order.shipping?.estimatedDelivery ? (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Est. delivery</span>
                    <span className="text-sm font-medium">{order.shipping.estimatedDelivery}</span>
                  </div>
                ) : null}
                {order.shipping?.deliveredAt ? (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Delivered at</span>
                    <span className="text-sm font-medium">{format(new Date(order.shipping.deliveredAt), "MMM d, yyyy")}</span>
                  </div>
                ) : null}
                {!order.shipping?.address && !order.shipping?.trackingNumber && shippingUpdates.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">No shipping details yet</div>
                )}
              </div>

              {/* Real-time tracking timeline */}
              {shippingUpdates.length > 0 && (
                <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Live tracking timeline
                  </p>
                  <ol className="space-y-3">
                    {shippingUpdates.slice().reverse().map((u, i) => (
                      <li key={i} className="flex gap-3" data-testid={`tracking-update-${order.id}-${i}`}>
                        <div className="mt-1 h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 capitalize">{u.status?.replace(/_/g, " ")}</span>
                            <span className="text-xs text-gray-400">{u.ts ? format(new Date(u.ts), "MMM d · h:mm a") : ""}</span>
                          </div>
                          {u.location && <p className="text-xs text-gray-500">📍 {u.location}</p>}
                          {u.note && <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{u.note}</p>}
                          <p className="text-[10px] text-gray-400 mt-0.5">via {u.byRole}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Seller controls: post a new tracking update */}
              {role === "seller" && (
                <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <p className="text-xs font-bold text-purple-800 mb-3">Post a tracking update (visible to buyer in real time)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={updStatus} onValueChange={setUpdStatus}>
                        <SelectTrigger data-testid="select-tracking-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="in_transit">In transit</SelectItem>
                          <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Location</Label>
                      <Input value={updLocation} onChange={(e) => setUpdLocation(e.target.value)} placeholder="e.g. Lagos hub" data-testid="input-tracking-location" />
                    </div>
                    <div>
                      <Label className="text-xs">Tracking #</Label>
                      <Input value={updTracking} onChange={(e) => setUpdTracking(e.target.value)} placeholder="optional" data-testid="input-tracking-number" />
                    </div>
                    <div>
                      <Label className="text-xs">Carrier</Label>
                      <Input value={updCarrier} onChange={(e) => setUpdCarrier(e.target.value)} placeholder="optional" data-testid="input-tracking-carrier" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">Note for buyer</Label>
                    <Textarea value={updNote} onChange={(e) => setUpdNote(e.target.value)} rows={2} placeholder="Package picked up, ETA Friday" data-testid="textarea-tracking-note" />
                  </div>
                  <Button
                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => trackingMutation.mutate()}
                    disabled={trackingMutation.isPending}
                    data-testid="button-post-tracking"
                  >
                    <Send className="h-4 w-4 mr-1.5" /> {trackingMutation.isPending ? "Posting…" : "Post update"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Buyer actions: Message seller + leave a review */}
          {(isShop || isCourse) && role !== "seller" && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{isShop ? "Sold by" : "Taught by"}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {seller ? `${seller.firstName || ""} ${seller.lastName || ""}`.trim() || "Seller" : "Loading…"}
                  </p>
                </div>
                {sellerIdToMessage ? (
                  <Link href={`/messages?to=${sellerIdToMessage}`}>
                    <Button variant="outline" data-testid={`button-message-seller-${order.id}`}>
                      <MessageCircle className="h-4 w-4 mr-1.5" /> Message {isShop ? "seller" : "instructor"}
                    </Button>
                  </Link>
                ) : null}
              </div>

              {isShop && !["delivered", "completed", "cancelled", "refunded"].includes(order.status) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-gray-500">Got your package? Confirm delivery to close out the order and unlock your review.</p>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => confirmDeliveryMutation.mutate()}
                    disabled={confirmDeliveryMutation.isPending}
                    data-testid={`button-confirm-delivery-${order.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {confirmDeliveryMutation.isPending ? "Confirming…" : "Confirm Delivery"}
                  </Button>
                </div>
              )}

              {isShop && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500" /> Leave a review
                  </p>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className="p-0.5"
                        data-testid={`button-rating-${n}`}
                      >
                        <Star className={`h-6 w-6 ${n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience…"
                    rows={3}
                    data-testid="textarea-review"
                  />
                  <Button
                    className="mt-2 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => reviewMutation.mutate()}
                    disabled={reviewMutation.isPending || !reviewComment.trim()}
                    data-testid={`button-submit-review-${order.id}`}
                  >
                    {reviewMutation.isPending ? "Submitting…" : "Submit review"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Course Progress */}
          {order.type === "course" && order.progress !== undefined && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-500" /> Course Progress
              </h3>
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Completion</span>
                  <span className="font-bold text-gray-900">{order.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${order.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* P2P Details */}
          {order.type === "p2p" && raw && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-gray-500" /> P2P Trade Details
              </h3>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Trade type</span>
                  <span className="text-sm font-medium capitalize">{raw.transactionType}</span>
                </div>
                {raw.deliveryNote && (
                  <div className="flex justify-between items-start px-4 py-3 gap-3">
                    <span className="text-sm text-gray-500 shrink-0">Delivery note</span>
                    <span className="text-sm text-right">{raw.deliveryNote}</span>
                  </div>
                )}
                {raw.paymentNote && (
                  <div className="flex justify-between items-start px-4 py-3 gap-3">
                    <span className="text-sm text-gray-500 shrink-0">Payment note</span>
                    <span className="text-sm text-right">{raw.paymentNote}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Net amount (after fee)</span>
                  <span className="text-sm font-semibold text-emerald-700">{money(+raw.netAmount || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Escrow Details */}
          {order.type === "campaign" && raw && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" /> Campaign Details
              </h3>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                {raw.campaign && (
                  <>
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-gray-500">Campaign</span>
                      <span className="text-sm font-semibold">{raw.campaign.title}</span>
                    </div>
                    {raw.campaign.totalSlots && (
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-sm text-gray-500">Influencer slots</span>
                        <span className="text-sm font-medium">{raw.campaign.totalSlots}</span>
                      </div>
                    )}
                    {raw.campaign.reward && (
                      <div className="flex justify-between items-center px-4 py-3">
                        <span className="text-sm text-gray-500">Per-influencer reward</span>
                        <span className="text-sm font-medium">{money(+raw.campaign.reward)}</span>
                      </div>
                    )}
                  </>
                )}
                {raw.network && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Paid via</span>
                    <span className="text-sm font-medium uppercase">{raw.network}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Direct Hire Details */}
          {order.type === "direct_hire" && raw && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" /> Direct Hire Details
              </h3>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                {raw.requirements && (
                  <div className="flex justify-between items-start px-4 py-3 gap-3">
                    <span className="text-sm text-gray-500 shrink-0">Requirements</span>
                    <span className="text-sm text-right max-w-xs">{raw.requirements}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Influencer payout</span>
                  <span className="text-sm font-semibold text-emerald-700">{money(+raw.influencerPayout || 0)}</span>
                </div>
                {/* Brand platform fee: $0 — brands pay exact budget only */}
              </div>
            </div>
          )}

          {order.type === "ad" && raw && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-gray-500" /> Advertising Details
              </h3>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Company</span>
                  <span className="text-sm font-semibold">{raw.companyName}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-500">Ad type</span>
                  <span className="text-sm font-medium">{String(raw.adType || "advertising").replace(/_/g, " ")}</span>
                </div>
                {raw.platforms && (
                  <div className="flex justify-between items-start px-4 py-3 gap-3">
                    <span className="text-sm text-gray-500 shrink-0">Channels</span>
                    <span className="text-sm text-right">{raw.platforms}</span>
                  </div>
                )}
                {raw.tdripBudget && (
                  <div className="flex justify-between items-start px-4 py-3 gap-3">
                    <span className="text-sm text-gray-500 shrink-0">$TDRIP add-on</span>
                    <span className="text-sm font-medium text-violet-700 text-right">{raw.tdripBudget}</span>
                  </div>
                )}
                {raw.payment && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Payment review</span>
                    <Badge className={statusColor(raw.payment.status || "submitted")}>{String(raw.payment.status || "submitted").replace(/_/g, " ")}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin notes */}
          {raw.adminNotes && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold text-blue-800 mb-1">Admin Notes</p>
              <p className="text-sm text-blue-700">{raw.adminNotes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── BreedSkool Training Tracker ───────────────────────────────────────────────
function BreedSkoolTrainingCard() {
  const { data: regs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/my/breedskool-registrations"],
    queryFn: async () => {
      const res = await fetch("/api/my/breedskool-registrations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) return null;
  if (!regs.length) return null;

  const modeIcon: Record<string, any> = { online: MonitorPlay, onsite: School, home_lesson: Home };
  const modeLabel: Record<string, string> = { online: "Online Classes", onsite: "Onsite Training", home_lesson: "Home Lesson" };
  const modeColor: Record<string, string> = { online: "from-violet-600 to-indigo-600", onsite: "from-teal-600 to-green-500", home_lesson: "from-pink-600 to-rose-500" };
  const modeBg: Record<string, string> = { online: "bg-violet-50 border-violet-100", onsite: "bg-teal-50 border-teal-100", home_lesson: "bg-pink-50 border-pink-100" };
  const fmtNgn = (n: number) => `₦${Number(n).toLocaleString("en-NG")}`;

  return (
    <Card className="border-0 shadow-sm mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-violet-600" />
          My BreedSkool Training
        </CardTitle>
        <p className="text-xs text-gray-400 mt-0.5">{regs.length} registration{regs.length !== 1 ? "s" : ""}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {regs.map((reg: any) => {
          const mode = reg.deliveryMode || "online";
          const Icon = modeIcon[mode] || MonitorPlay;
          const statusOk = reg.paymentStatus === "confirmed";
          const statusPending = reg.paymentStatus === "pending";
          return (
            <div key={reg.id} className={`border rounded-2xl p-4 ${modeBg[mode] || "bg-gray-50 border-gray-100"}`} data-testid={`card-bs-reg-${reg.id}`}>
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${modeColor[mode] || "from-gray-600 to-gray-500"} flex items-center justify-center shrink-0 shadow`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-gray-900">{reg.selectedCourseTitle || "BreedSkool Training"}</span>
                    <Badge className={statusOk ? "bg-emerald-100 text-emerald-700 border-0 text-[10px]" : statusPending ? "bg-amber-100 text-amber-700 border-0 text-[10px]" : "bg-red-100 text-red-600 border-0 text-[10px]"}>
                      {statusOk ? "✓ Confirmed" : statusPending ? "⏳ Pending" : reg.paymentStatus}
                    </Badge>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60 text-gray-600 border border-gray-200">
                      {modeLabel[mode] || mode}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {fmtNgn(reg.amountNgn)} · {reg.paymentMethod || reg.paymentOption} · Registered {new Date(reg.createdAt).toLocaleDateString()}
                  </p>
                  {reg.location && <p className="text-xs text-gray-400 mt-0.5">📍 {reg.location}</p>}

                  {/* Home lesson child details */}
                  {mode === "home_lesson" && reg.childName && (
                    <div className="mt-3 p-3 bg-white/70 rounded-xl border border-pink-200 text-xs space-y-1">
                      <p className="font-bold text-pink-700 flex items-center gap-1"><Baby className="w-3.5 h-3.5" /> Child Details</p>
                      <p><span className="text-gray-400">Name:</span> {reg.childName}</p>
                      {reg.childAge && <p><span className="text-gray-400">Age:</span> {reg.childAge}</p>}
                      {reg.homeAddress && <p><span className="text-gray-400">Address:</span> {reg.homeAddress}</p>}
                      <p className="text-pink-600 mt-1">Our tutor will contact you to schedule sessions.</p>
                    </div>
                  )}

                  {/* Onsite detail */}
                  {mode === "onsite" && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-teal-700">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>TootoOba Estate, Ijede, Ikorodu, Lagos</span>
                    </div>
                  )}

                  {/* Status guidance */}
                  {statusPending && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                      ⏳ Payment under review. We'll confirm within 24 hours. Keep your transaction reference ready.
                    </div>
                  )}
                  {statusOk && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                      ✅ You're enrolled! {mode === "online" ? "Check your email for class access details." : mode === "home_lesson" ? "Our tutor will contact you to schedule." : "Report to the campus on your start date."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/my-orders"],
  });

  const allOrders = useMemo(() => normaliseOrders(data), [data]);

  const filteredOrders = useMemo(() => {
    let result = allOrders;
    if (typeFilter !== "all") result = result.filter((o) => o.type === typeFilter);
    result = filterByPeriod(result, periodFilter);
    return result;
  }, [allOrders, typeFilter, periodFilter]);

  const summary = useMemo(() => ({
    total: filteredOrders.length,
    totalSpent: filteredOrders.reduce((s, o) => s + o.totalCharged, 0),
    totalFees: filteredOrders.reduce((s, o) => s + o.fee, 0),
    pending: filteredOrders.filter((o) => ["pending", "pending_payment", "verifying", "payment_submitted", "payment_window", "submitted"].includes(o.status)).length,
    completed: filteredOrders.filter((o) => ["completed", "approved", "delivered", "active", "paid"].includes(o.status)).length,
  }), [filteredOrders]);

  function openDetail(order: UnifiedOrder) {
    setSelectedOrder(order);
    setDialogOpen(true);
  }

  // ── PDF Export ──────────────────────────────────────────────────────────────
  async function downloadPDF() {
    const rows = filteredOrders.map((o, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${typeLabel(o.type)}</td>
        <td>${o.title}</td>
        <td>${money(o.amount)}</td>
        <td>${money(o.fee)}</td>
        <td>${money(o.totalCharged)}</td>
        <td>${o.status.replace(/_/g, " ")}</td>
        <td>${format(new Date(o.date), "MMM d, yyyy")}</td>
      </tr>
    `).join("");
    const printable = window.open("", "_blank");
    if (!printable) return;
    printable.document.write(`
      <html>
        <head>
          <title>Taskdrip Orders</title>
          <style>
            body{font-family:Arial,sans-serif;padding:24px;color:#111827}
            h1{margin:0 0 6px;font-size:22px}
            p{color:#6b7280;margin:0 0 18px}
            table{width:100%;border-collapse:collapse;font-size:12px}
            th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
            th{background:#111827;color:white}
            tr:nth-child(even){background:#f9fafb}
          </style>
        </head>
        <body>
          <h1>My Orders & Transactions</h1>
          <p>Generated ${format(new Date(), "MMM d, yyyy h:mm a")} · Total charged ${money(summary.totalSpent)}</p>
          <table>
            <thead><tr><th>#</th><th>Type</th><th>Title</th><th>Amount</th><th>Fee</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printable.document.close();
    printable.print();
  }

  async function downloadExcel() {
    const rows = [
      ["#", "Type", "Title", "Description", "Base Amount", "Platform Fee", "Total Charged", "Status", "Payment Method", "Network", "Transaction Hash", "Date"],
      ...filteredOrders.map((o, i) => [
        i + 1,
        typeLabel(o.type),
        o.title,
        o.description,
        o.amount,
        o.fee,
        o.totalCharged,
        o.status.replace(/_/g, " "),
        o.paymentMethod || "",
        o.network || "",
        o.transactionHash || "",
        format(new Date(o.date), "yyyy-MM-dd HH:mm"),
      ]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taskdrip-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm">
            <Package className="h-4 w-4 text-blue-600" />
            All Transactions
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-950" data-testid="text-my-orders-title">
            My Orders & Transactions
          </h1>
          <p className="mt-1 text-gray-500">
            View and manage all your shop orders, courses, P2P trades, campaign payments, and direct hires.
          </p>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
            <Card className="border-0 bg-black text-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <ReceiptText className="h-4 w-4" /> Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black" data-testid="text-summary-total">{summary.total}</div>
                <p className="text-xs text-gray-400 mt-1">Matching current filters</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" /> Total Charged
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-gray-950" data-testid="text-summary-spent">{money(summary.totalSpent)}</div>
                <p className="text-xs text-gray-400 mt-1">Total charged (no brand markup)</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" /> Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-gray-950" data-testid="text-summary-pending">{summary.pending}</div>
                <p className="text-xs text-gray-400 mt-1">Awaiting action or confirmation</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-gray-950" data-testid="text-summary-completed">{summary.completed}</div>
                <p className="text-xs text-gray-400 mt-1">Successfully processed</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters + Export */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48" data-testid="select-type-filter">
                  <SelectValue placeholder="Transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="shop">Shop Orders</SelectItem>
                  <SelectItem value="course">Course Orders</SelectItem>
                  <SelectItem value="p2p">P2P Trades</SelectItem>
                  <SelectItem value="campaign">Campaign Escrow</SelectItem>
                  <SelectItem value="direct_hire">Direct Hire</SelectItem>
                  <SelectItem value="ad">Ads Campaigns</SelectItem>
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-44" data-testid="select-period-filter">
                  <CalendarRange className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Last 24 hours</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="year">Last 12 months</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadPDF}
                  disabled={filteredOrders.length === 0}
                  data-testid="button-download-pdf"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadExcel}
                  disabled={filteredOrders.length === 0}
                  data-testid="button-download-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-700" />
              Orders
            </CardTitle>
            <CardDescription>
              {filteredOrders.length} transaction{filteredOrders.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-14 text-center rounded-2xl border border-dashed border-gray-200">
                <Package className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                <p className="font-semibold text-gray-700" data-testid="text-empty-orders">No transactions found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or complete your first transaction.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div
                    key={`${order.type}-${order.id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 hover:shadow-sm transition-all"
                    data-testid={`card-order-${order.id}`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${typeColor(order.type)}`}>
                      {typeIcon(order.type)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor(order.type)}`}>
                          {typeLabel(order.type)}
                        </span>
                        <Badge className={`text-xs ${statusColor(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-900 truncate" data-testid={`text-order-title-${order.id}`}>
                        {order.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.description}</p>
                    </div>

                    {/* Amount + Date */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 shrink-0">
                      <p className="text-base font-black text-gray-900" data-testid={`text-order-amount-${order.id}`}>
                        {money(order.totalCharged)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(order.date), "MMM d, yyyy")}
                      </p>
                    </div>

                    {/* Preview Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => openDetail(order)}
                      data-testid={`button-preview-${order.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* BreedSkool Training Registrations */}
        <BreedSkoolTrainingCard />

        {/* Fee Info Footer */}
        <div className="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-700 font-medium">
            <span className="font-bold">Platform fee policy:</span> Brands pay the exact campaign or project budget — no platform fee is added for brands. A 10% fee is deducted from influencer earnings only. For shop orders, the listed price is what you pay.
          </p>
        </div>
      </main>

      <OrderDetailDialog
        order={selectedOrder}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
