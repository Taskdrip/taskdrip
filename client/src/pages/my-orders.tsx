import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type OrderType = "shop" | "course" | "p2p" | "campaign" | "direct_hire";

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
  };
  return colors[type];
}

function statusColor(status: string) {
  if (["completed", "approved", "delivered", "active", "paid"].includes(status))
    return "bg-emerald-100 text-emerald-800";
  if (["pending", "processing", "verifying", "payment_window"].includes(status))
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

  // Shop orders
  (data.shopOrders || []).forEach((o: any) => {
    const base = +o.amount;
    const fee = pct(base);
    orders.push({
      id: o.id,
      type: "shop",
      title: o.product?.title || "Shop item",
      description: `Qty: ${o.quantity || 1} · ${o.product?.category || "Product"}`,
      amount: base,
      fee,
      totalCharged: +o.totalAmount || base + fee,
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

  // Course enrollments
  (data.courseOrders || []).forEach((o: any) => {
    const base = +o.amount;
    const fee = pct(base);
    orders.push({
      id: o.id,
      type: "course",
      title: o.course?.title || "Course",
      description: `Progress: ${o.progress || 0}%`,
      amount: base,
      fee,
      totalCharged: base + fee,
      status: o.isPaid ? (o.status || "active") : "pending_payment",
      date: o.createdAt,
      paymentMethod: o.paymentMethod,
      transactionHash: o.transactionHash,
      paymentProof: o.paymentProof,
      progress: o.progress,
      raw: o,
    });
  });

  // P2P transactions
  (data.p2pTransactions || []).forEach((o: any) => {
    const base = +o.amount;
    const fee = +o.fee || 0;
    orders.push({
      id: o.id,
      type: "p2p",
      title: o.listing?.title || "P2P Trade",
      description: `${o.transactionType} · ${o.buyerId === o.sellerId ? "Self" : "Peer"}`,
      amount: base,
      fee,
      totalCharged: +o.totalAmount || base + fee,
      status: o.status,
      date: o.createdAt,
      paymentMethod: "crypto",
      transactionHash: undefined,
      paymentProof: o.paymentProof,
      raw: o,
    });
  });

  // Campaign escrow
  (data.escrowOrders || []).forEach((o: any) => {
    const base = +o.amount;
    const fee = pct(base);
    orders.push({
      id: o.id,
      type: "campaign",
      title: o.campaign?.title ? `Campaign: ${o.campaign.title}` : "Campaign Escrow",
      description: o.transactionHash ? `Tx: ${o.transactionHash.slice(0, 16)}…` : "Awaiting proof",
      amount: base,
      fee,
      totalCharged: base + fee,
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
    const brandFee = +o.brandPlatformFee || pct(base);
    const total = +o.brandTotalCharge || base + brandFee;
    orders.push({
      id: o.id,
      type: "direct_hire",
      title: o.title || "Direct Hire",
      description: o.requirements ? o.requirements.slice(0, 80) + (o.requirements.length > 80 ? "…" : "") : "Direct hire offer",
      amount: base,
      fee: brandFee,
      totalCharged: total,
      status: o.status,
      date: o.createdAt,
      paymentMethod: o.paymentNetwork,
      transactionHash: o.transactionHash,
      paymentProof: o.paymentProof,
      raw: o,
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

          {/* Charge Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-gray-500" /> Charge Breakdown
            </h3>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-gray-600">Base amount</span>
                <span className="font-semibold text-gray-900">{money(order.amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center px-4 py-3 bg-white">
                <span className="text-sm text-gray-600">Platform fee (10%)</span>
                <span className="font-semibold text-orange-600">+{money(order.fee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                <span className="text-sm font-bold text-gray-900">Total charged</span>
                <span className="text-lg font-black text-gray-900">{money(order.totalCharged)}</span>
              </div>
            </div>
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
                {!order.shipping?.address && !order.shipping?.trackingNumber && (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">No shipping details yet</div>
                )}
              </div>
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
                {raw.brandPlatformFee && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-500">Brand platform fee</span>
                    <span className="text-sm font-semibold text-orange-600">+{money(+raw.brandPlatformFee)}</span>
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
    pending: filteredOrders.filter((o) => ["pending", "pending_payment", "verifying", "payment_submitted", "payment_window"].includes(o.status)).length,
    completed: filteredOrders.filter((o) => ["completed", "approved", "delivered", "active", "paid"].includes(o.status)).length,
  }), [filteredOrders]);

  function openDetail(order: UnifiedOrder) {
    setSelectedOrder(order);
    setDialogOpen(true);
  }

  // ── PDF Export ──────────────────────────────────────────────────────────────
  async function downloadPDF() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text("My Orders & Transactions", 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 14, 23);
    doc.text(`Total orders: ${summary.total} · Total charged: ${money(summary.totalSpent)}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [["#", "Type", "Title", "Amount", "Fee", "Total", "Status", "Payment", "Date"]],
      body: filteredOrders.map((o, i) => [
        i + 1,
        typeLabel(o.type),
        o.title,
        money(o.amount),
        money(o.fee),
        money(o.totalCharged),
        o.status.replace(/_/g, " "),
        o.paymentMethod || "—",
        format(new Date(o.date), "MMM d, yyyy"),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`taskdrip-orders-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  }

  // ── Excel Export ────────────────────────────────────────────────────────────
  async function downloadExcel() {
    const XLSX = await import("xlsx");
    const wsData = [
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

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 4 }, { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    // Summary sheet
    const summaryData = [
      ["Summary", ""],
      ["Total Orders", summary.total],
      ["Total Amount", summary.totalSpent],
      ["Total Fees", summary.totalFees],
      ["Pending", summary.pending],
      ["Completed", summary.completed],
      ["Generated", format(new Date(), "yyyy-MM-dd HH:mm")],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    XLSX.writeFile(wb, `taskdrip-orders-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
                <p className="text-xs text-gray-400 mt-1">Including platform fees</p>
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
                  Excel
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

        {/* Fee Info Footer */}
        <div className="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-700 font-medium">
            <span className="font-bold">Platform fee policy:</span> A 10% platform fee is applied to all transactions. For shop orders, this is added on top of the product price. For campaigns and direct hires, the brand pays 10% extra and the influencer receives their payout minus 10%.
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
