import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Download,
  Eye,
  Gift,
  Landmark,
  Lock,
  ReceiptText,
  Repeat2,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

const walletSchema = z.object({
  usdtTronWallet: z.string().optional(),
  usdtBscWallet: z.string().optional(),
  usdtEthWallet: z.string().optional(),
  tonWallet: z.string().optional(),
  btcWallet: z.string().optional(),
  piWallet: z.string().optional(),
});

type WalletFormData = z.infer<typeof walletSchema>;

type LedgerData = {
  user: any;
  transactions: any[];
  payoutRequests: any[];
  directHireOffers: any[];
  escrowPayments: any[];
  generatedAt: string;
};

type ActivityEntry = {
  id: string;
  source: "transaction" | "payout" | "points" | "purchase" | "escrow";
  title: string;
  description?: string;
  amount: number;
  unit: "USD" | "TDRIP";
  direction: "in" | "out" | "hold" | "neutral";
  status: string;
  date?: string;
  network?: string;
  href?: string;
};

const creditTypes = new Set(["campaign_reward", "bonus", "direct_hire_payout", "platform_revenue", "platform_tip"]);
const debitTypes = new Set(["payout", "platform_fee", "direct_hire_escrow", "direct_hire_deposit", "campaign_deposit", "tdrip_topup", "tdrip_transfer", "tdrip_tip"]);
const activeEscrowStatuses = new Set(["pending", "payment_window", "verifying", "submitted", "verified", "approved", "active", "payment_submitted", "work_submitted", "revision_requested"]);
const TDRIP_RATE = 100;

function money(value: unknown) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function labelForType(type?: string) {
  return (type || "transaction").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function shortAddress(value?: string | null) {
  if (!value) return "Not connected";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed" || status === "approved" || status === "verified"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : status === "pending" || status === "processing" || status === "submitted"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : status === "active" || status === "work_submitted" || status === "revision_requested"
          ? "bg-blue-100 text-blue-800 border-blue-200"
          : status === "rejected" || status === "failed" || status === "cancelled"
            ? "bg-red-100 text-red-800 border-red-200"
            : "bg-slate-100 text-slate-700 border-slate-200";

  return <Badge className={`${color} capitalize`} data-testid={`status-wallet-${status}`}>{String(status || "pending").replace(/_/g, " ")}</Badge>;
}

function DirectionIcon({ direction, unit }: { direction: ActivityEntry["direction"]; unit: ActivityEntry["unit"] }) {
  if (unit === "TDRIP") return <Coins className="h-4 w-4 text-violet-600" />;
  if (direction === "in") return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
  if (direction === "out") return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  if (direction === "hold") return <Clock className="h-4 w-4 text-blue-600" />;
  return <ReceiptText className="h-4 w-4 text-slate-500" />;
}

export default function WalletSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [directSupportEnabled, setDirectSupportEnabled] = useState(false);
  const [topupPoints, setTopupPoints] = useState("1000");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [checkout, setCheckout] = useState<any>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [transferType, setTransferType] = useState<"transfer" | "tip">("transfer");
  const [recipient, setRecipient] = useState("");
  const [transferPoints, setTransferPoints] = useState("100");
  const [transferNote, setTransferNote] = useState("");
  const [payoutForm, setPayoutForm] = useState({ amount: "", network: "USDT-TRC20", walletAddress: "", notes: "" });
  const [activityFilter, setActivityFilter] = useState("all");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      usdtTronWallet: "",
      usdtBscWallet: "",
      usdtEthWallet: "",
      tonWallet: "",
      btcWallet: "",
      piWallet: "",
    },
  });

  useEffect(() => {
    if (user) {
      setValue("usdtTronWallet", (user as any).usdtTronWallet || "");
      setValue("usdtBscWallet", (user as any).usdtBscWallet || "");
      setValue("usdtEthWallet", (user as any).usdtEthWallet || "");
      setValue("tonWallet", (user as any).tonWallet || "");
      setValue("btcWallet", (user as any).btcWallet || "");
      setValue("piWallet", (user as any).piWallet || "");
      setDirectSupportEnabled(!!(user as any).directSupportEnabled);
      setPayoutForm((current) => ({
        ...current,
        walletAddress: current.walletAddress || (user as any).usdtTronWallet || (user as any).usdtBscWallet || (user as any).usdtEthWallet || (user as any).tonWallet || (user as any).btcWallet || "",
      }));
    }
  }, [user, setValue]);

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery<LedgerData>({
    queryKey: ["/api/ledger"],
  });

  const { data: pointsData, isLoading: pointsLoading } = useQuery<{ total: number; points: any[]; level?: string }>({
    queryKey: ["/api/points/me"],
    retry: false,
  });

  const userId = (user as any)?.id;
  const { data: purchases = [] } = useQuery<any[]>({
    queryKey: ["/api/users", userId, "purchases"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/purchases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "tdrip"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods?feature=tdrip", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const cryptoMethods = paymentMethods.filter((method: any) => method.type === "crypto" && method.address);
  const selectedMethod = cryptoMethods.find((method: any) => method.id === selectedMethodId) || cryptoMethods[0];
  const ledgerUser = ledgerData?.user || user || {};
  const availableBalance = numberValue((ledgerUser as any).availableBalance);
  const pendingBalance = numberValue((ledgerUser as any).pendingBalance);
  const totalEarned = numberValue((ledgerUser as any).totalEarned);
  const tdripPoints = Number(pointsData?.total ?? (user as any)?.totalPoints ?? 0);
  const tdripValue = tdripPoints / TDRIP_RATE;
  const buyPoints = Math.max(0, Number(topupPoints || 0));
  const buyAmount = buyPoints / TDRIP_RATE;
  const userType = (ledgerUser as any)?.userType || "creator";

  const walletNetworks = [
    { name: "USDT TRC-20", key: "usdtTronWallet" as keyof WalletFormData, network: "Tron", currency: "USDT", color: "from-emerald-500 to-teal-600", placeholder: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t..." },
    { name: "USDT BEP-20", key: "usdtBscWallet" as keyof WalletFormData, network: "BNB Chain", currency: "USDT", color: "from-yellow-500 to-orange-500", placeholder: "0x742C4B8d7bBb3B4C6c8c89f5D3e1f4E..." },
    { name: "USDT ERC-20", key: "usdtEthWallet" as keyof WalletFormData, network: "Ethereum", currency: "USDT", color: "from-indigo-500 to-blue-600", placeholder: "0x4e83362442B8d1beC281594c..." },
    { name: "TON Wallet", key: "tonWallet" as keyof WalletFormData, network: "TON", currency: "TON / USDT", color: "from-sky-500 to-blue-600", placeholder: "EQD5p2L6r4g8J9B3K1r5n6m7c8..." },
    { name: "Bitcoin Wallet", key: "btcWallet" as keyof WalletFormData, network: "Bitcoin", currency: "BTC", color: "from-orange-500 to-amber-600", placeholder: "bc1q..." },
    { name: "Pi Network", key: "piWallet" as keyof WalletFormData, network: "Pi", currency: "PI", color: "from-purple-500 to-fuchsia-600", placeholder: "@yourPiUsername or Pi wallet address" },
  ];

  const savedWalletsCount = walletNetworks.filter((network) => Boolean((user as any)?.[network.key])).length;

  const summary = useMemo(() => {
    const transactions = ledgerData?.transactions || [];
    const payouts = ledgerData?.payoutRequests || [];
    const directHires = ledgerData?.directHireOffers || [];
    const escrows = ledgerData?.escrowPayments || [];
    const completedCredits = transactions.filter((transaction) => creditTypes.has(transaction.type) && ["completed", "approved"].includes(transaction.status)).reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
    const pendingWithdrawals = payouts.filter((request) => ["pending", "processing", "approved"].includes(request.status)).reduce((sum, request) => sum + numberValue(request.amount), 0);
    const escrowInProgress = [...directHires, ...escrows].filter((item) => activeEscrowStatuses.has(item.status)).reduce((sum, item) => sum + numberValue(item.influencerPayout || item.budget || item.amount), 0);
    const tdripEarned = (pointsData?.points || []).filter((point) => numberValue(point.points) > 0).reduce((sum, point) => sum + numberValue(point.points), 0);
    const tdripSpent = Math.abs((pointsData?.points || []).filter((point) => numberValue(point.points) < 0).reduce((sum, point) => sum + numberValue(point.points), 0));

    return {
      completedCredits,
      pendingWithdrawals,
      escrowInProgress,
      payoutCount: payouts.length,
      transactionCount: transactions.length,
      tdripEarned,
      tdripSpent,
      purchasesCount: purchases.length,
    };
  }, [ledgerData, pointsData, purchases]);

  const activityEntries = useMemo<ActivityEntry[]>(() => {
    const transactions = (ledgerData?.transactions || []).map((transaction) => {
      const type = transaction.type || "transaction";
      const direction = creditTypes.has(type) ? "in" : debitTypes.has(type) ? "out" : type.includes("escrow") ? "hold" : "neutral";
      return {
        id: `tx-${transaction.id}`,
        source: "transaction" as const,
        title: labelForType(type),
        description: transaction.description,
        amount: numberValue(transaction.amount),
        unit: "USD" as const,
        direction: direction as ActivityEntry["direction"],
        status: transaction.status || "pending",
        date: transaction.processedAt || transaction.createdAt,
        network: transaction.network,
        href: transaction.referenceType === "direct_hire" && transaction.referenceId ? `/direct-hire/${transaction.referenceId}` : transaction.campaignId ? `/campaigns/${transaction.campaignId}` : undefined,
      };
    });

    const payouts = (ledgerData?.payoutRequests || []).map((request) => ({
      id: `payout-${request.id}`,
      source: "payout" as const,
      title: "Withdrawal request",
      description: request.adminNotes || `Payout to ${request.network || "saved wallet"}`,
      amount: numberValue(request.amount),
      unit: "USD" as const,
      direction: "out" as const,
      status: request.status || "pending",
      date: request.processedAt || request.createdAt,
      network: request.network,
      href: "/payout-requests",
    }));

    const points = (pointsData?.points || []).map((point) => ({
      id: `point-${point.id}`,
      source: "points" as const,
      title: labelForType(point.actionType),
      description: point.description,
      amount: Math.abs(numberValue(point.points)),
      unit: "TDRIP" as const,
      direction: numberValue(point.points) >= 0 ? "in" as const : "out" as const,
      status: "completed",
      date: point.createdAt,
    }));

    const purchaseEntries = purchases.map((purchase) => ({
      id: `purchase-${purchase.purchase?.id || purchase.id}`,
      source: "purchase" as const,
      title: purchase.product?.title || "Shop checkout payment",
      description: `Marketplace checkout ${purchase.purchase?.status || purchase.status || "pending"}`,
      amount: numberValue(purchase.purchase?.amount || purchase.amount),
      unit: "USD" as const,
      direction: "out" as const,
      status: purchase.purchase?.status || purchase.status || "pending",
      date: purchase.purchase?.createdAt || purchase.createdAt,
      href: purchase.product?.id ? `/shop/product/${purchase.product.id}` : "/my-orders",
    }));

    const escrows = [...(ledgerData?.directHireOffers || []), ...(ledgerData?.escrowPayments || [])].filter((item) => activeEscrowStatuses.has(item.status)).map((item) => ({
      id: `escrow-${item.id}`,
      source: "escrow" as const,
      title: item.title || item.campaign?.title || "Escrow payment",
      description: item.campaign ? "Campaign funds held for creator payouts" : "Direct-hire escrow still in progress",
      amount: numberValue(item.influencerPayout || item.budget || item.amount),
      unit: "USD" as const,
      direction: "hold" as const,
      status: item.status || "pending",
      date: item.updatedAt || item.createdAt,
      network: item.paymentNetwork || item.network,
      href: item.campaignId ? `/campaigns/${item.campaignId}` : item.id ? `/direct-hire/${item.id}` : undefined,
    }));

    return [...transactions, ...payouts, ...points, ...purchaseEntries, ...escrows].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [ledgerData, pointsData, purchases]);

  const visibleEntries = activityEntries.filter((entry) => activityFilter === "all" || entry.source === activityFilter || entry.direction === activityFilter || entry.unit.toLowerCase() === activityFilter);

  const updateWalletMutation = useMutation({
    mutationFn: async (data: WalletFormData) => {
      const response = await apiRequest("PATCH", `/api/users/${(user as any)?.id}/profile`, { ...data, directSupportEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      toast({ title: "Wallets updated", description: "Your receiving wallets and direct support setting were saved." });
    },
    onError: (error: Error) => toast({ title: "Update failed", description: error.message, variant: "destructive" }),
  });

  const startTopup = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tdrip/topups", { points: buyPoints, paymentMethodId: selectedMethod?.id });
      return res.json();
    },
    onSuccess: (data) => {
      setCheckout(data);
      toast({ title: "$TDRIP checkout created", description: "Send payment to the shown wallet, then submit your reference." });
    },
    onError: (error: Error) => toast({ title: "Checkout failed", description: error.message, variant: "destructive" }),
  });

  const submitProof = useMutation({
    mutationFn: async () => {
      if (!checkout?.transaction?.id) throw new Error("Start a checkout first.");
      const formData = new FormData();
      formData.append("transactionHash", transactionHash);
      formData.append("network", checkout.checkout?.paymentMethod?.network || selectedMethod?.network || "");
      const res = await fetch(`/api/tdrip/topups/${checkout.transaction.id}/submit-proof`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to submit payment reference");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: data.credited ? "$TDRIP credited" : "Payment reference submitted",
        description: data.credited ? `${data.points} $TDRIP was added to your wallet.` : "Your top-up is waiting for admin confirmation.",
      });
      if (data.credited) {
        setCheckout(null);
        setTransactionHash("");
      }
    },
    onError: (error: Error) => toast({ title: "Submission failed", description: error.message, variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "$TDRIP sent", description: `${transferPoints} $TDRIP was sent successfully.` });
      setRecipient("");
      setTransferNote("");
    },
    onError: (error: Error) => toast({ title: "Transfer failed", description: error.message, variant: "destructive" }),
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payout-requests", payoutForm);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payout-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Withdrawal requested", description: "Your request has been sent for admin review." });
      setPayoutForm({ amount: "", network: payoutForm.network, walletAddress: payoutForm.walletAddress, notes: "" });
    },
    onError: (error: Error) => toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" }),
  });

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied", description: "Wallet address copied to clipboard." });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyCheckoutAddress = () => {
    const address = checkout?.checkout?.paymentMethod?.address || selectedMethod?.address;
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast({ title: "Payment address copied", description: "Paste this into your payment app." });
  };

  const payoutPercent = (percent: number) => {
    setPayoutForm((current) => ({ ...current, amount: ((availableBalance * percent) / 100).toFixed(2) }));
  };

  const loading = ledgerLoading || pointsLoading;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationFixed />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-violet-200/50" data-testid="section-wallet-hero">
          <div className="relative p-6 md:p-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.26),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.55),transparent_35%),linear-gradient(135deg,#020617,#111827_48%,#312e81)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Taskdrip Wallet Bank
                </div>
                <h1 className="text-4xl font-black tracking-tight md:text-6xl" data-testid="text-wallet-title">Crypto-level wallet center</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/70" data-testid="text-wallet-description">
                  Manage spendable earnings, $TDRIP points, withdrawal requests, checkout payments, saved receiving wallets, and full transaction history from one secure dashboard.
                </p>
              </div>
              <div className="grid min-w-[280px] gap-3 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Total wallet value</span>
                  <Badge className="border border-emerald-300/30 bg-emerald-400/15 text-emerald-100">Live</Badge>
                </div>
                <p className="text-4xl font-black" data-testid="text-wallet-total-value">{money(availableBalance + pendingBalance + tdripValue)}</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-white/60">
                  <span>{money(availableBalance)} liquid</span>
                  <span>{tdripPoints.toLocaleString()} pts</span>
                  <span>{savedWalletsCount} wallets</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-36 rounded-3xl" />)}
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-0 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Wallet className="h-4 w-4 text-emerald-600" />Funds wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-slate-950" data-testid="text-wallet-available-balance">{money(availableBalance)}</p>
                  <p className="mt-2 text-sm text-slate-500">Ready for checkout spending or withdrawal.</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Coins className="h-4 w-4 text-violet-600" />$TDRIP points</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-slate-950" data-testid="text-wallet-tdrip-balance">{tdripPoints.toLocaleString()}</p>
                  <p className="mt-2 text-sm text-slate-500">Estimated value {money(tdripValue)} at 100 $TDRIP = $1.</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Clock className="h-4 w-4 text-blue-600" />Escrow / pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-slate-950" data-testid="text-wallet-pending-escrow">{money(pendingBalance + summary.escrowInProgress)}</p>
                  <p className="mt-2 text-sm text-slate-500">Campaign, direct-hire, and verification holds.</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Banknote className="h-4 w-4 text-cyan-600" />Lifetime earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-slate-950" data-testid="text-wallet-total-earned">{money(totalEarned || summary.completedCredits)}</p>
                  <p className="mt-2 text-sm text-slate-500">Completed credits posted to your account.</p>
                </CardContent>
              </Card>
            </section>

            <section className="mb-8 grid gap-4 lg:grid-cols-3">
              <Card className="border-0 bg-gradient-to-br from-slate-950 to-indigo-950 text-white shadow-xl lg:col-span-2">
                <CardContent className="p-6 md:p-8">
                  <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <Badge className="mb-4 border border-cyan-300/20 bg-cyan-400/15 text-cyan-100"><Sparkles className="mr-1 h-3.5 w-3.5" />Bank-grade wallet actions</Badge>
                      <h2 className="text-2xl font-black md:text-3xl">Top up, withdraw, checkout, and audit every movement.</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">This page is now the home for $TDRIP point top-ups, withdrawal requests, checkout payment references, earnings history, and saved wallet addresses.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <a href="#topup"><Button className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300" data-testid="button-jump-topup"><Coins className="mr-2 h-4 w-4" />Top up</Button></a>
                      <a href="#withdraw"><Button className="w-full bg-white text-slate-950 hover:bg-slate-100" data-testid="button-jump-withdraw"><ArrowUpRight className="mr-2 h-4 w-4" />Withdraw</Button></a>
                      <Link href="/shop"><Button variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20" data-testid="button-wallet-shop"><ShoppingBag className="mr-2 h-4 w-4" />Shop</Button></Link>
                      <Link href="/my-orders"><Button variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20" data-testid="button-wallet-orders"><ReceiptText className="mr-2 h-4 w-4" />Orders</Button></Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" />Account posture</CardTitle>
                  <CardDescription>Operational status for this wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="text-sm text-slate-600">Saved receiving wallets</span><strong data-testid="text-wallet-saved-count">{savedWalletsCount}/{walletNetworks.length}</strong></div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="text-sm text-slate-600">Withdrawal queue</span><strong data-testid="text-wallet-payout-count">{summary.payoutCount}</strong></div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="text-sm text-slate-600">Role</span><strong className="capitalize" data-testid="text-wallet-user-type">{userType}</strong></div>
                </CardContent>
              </Card>
            </section>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid h-auto grid-cols-2 rounded-2xl bg-white p-1 shadow-sm md:grid-cols-5" data-testid="tabs-wallet-actions">
                <TabsTrigger value="overview" data-testid="tab-wallet-overview">Overview</TabsTrigger>
                <TabsTrigger value="topup" data-testid="tab-wallet-topup">Top up</TabsTrigger>
                <TabsTrigger value="withdraw" data-testid="tab-wallet-withdraw">Withdraw</TabsTrigger>
                <TabsTrigger value="checkout" data-testid="tab-wallet-checkout">Checkout</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-wallet-history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <section className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "USD earnings received", value: money(summary.completedCredits), icon: ArrowDownLeft, color: "text-emerald-600 bg-emerald-50" },
                    { label: "$TDRIP earned", value: `${summary.tdripEarned.toLocaleString()} pts`, icon: Coins, color: "text-violet-600 bg-violet-50" },
                    { label: "Marketplace checkouts", value: `${summary.purchasesCount} orders`, icon: ShoppingBag, color: "text-indigo-600 bg-indigo-50" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="border-0 bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></div>
                        <p className="text-sm text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-950" data-testid={`text-wallet-metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </section>

                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-indigo-600" />All receiving wallet types</CardTitle>
                    <CardDescription>Save the addresses you control. These are used for withdrawal routing, direct support, and P2P wallet matching.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit((data) => updateWalletMutation.mutate(data))} className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        {walletNetworks.map((network) => (
                          <div key={network.key} className="rounded-3xl border border-slate-100 bg-slate-50 p-4" data-testid={`card-wallet-network-${network.key}`}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${network.color}`} />
                                <div>
                                  <p className="font-bold text-slate-950">{network.name}</p>
                                  <p className="text-xs text-slate-500">{network.currency} · {network.network}</p>
                                </div>
                              </div>
                              {(user as any)?.[network.key] ? <Badge className="bg-emerald-100 text-emerald-800">Connected</Badge> : <Badge variant="outline">Empty</Badge>}
                            </div>
                            <Label htmlFor={network.key}>Wallet address</Label>
                            <div className="mt-2 flex gap-2">
                              <Input id={network.key} placeholder={network.placeholder} {...register(network.key)} data-testid={`input-wallet-${network.key}`} />
                              {(user as any)?.[network.key] && (
                                <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard((user as any)[network.key], network.key)} data-testid={`button-copy-wallet-${network.key}`}>
                                  {copiedField === network.key ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                            {errors[network.key] && <p className="mt-1 text-sm text-red-600">{errors[network.key]?.message}</p>}
                            <p className="mt-2 text-xs text-slate-500" data-testid={`text-wallet-address-${network.key}`}>{shortAddress((user as any)?.[network.key])}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Gift className="mt-1 h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="font-bold text-emerald-950">Direct wallet support</p>
                            <p className="text-sm text-emerald-700">Allow visitors to support you directly through saved wallet addresses.</p>
                          </div>
                        </div>
                        <Switch checked={directSupportEnabled} onCheckedChange={setDirectSupportEnabled} data-testid="switch-wallet-direct-support" />
                      </div>

                      <Button type="submit" disabled={updateWalletMutation.isPending} className="w-full rounded-2xl bg-slate-950 py-6 text-white hover:bg-slate-800" data-testid="button-save-wallet-addresses">
                        {updateWalletMutation.isPending ? "Saving wallets..." : "Save wallet settings"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="topup" id="topup" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-xl">
                    <CardContent className="p-0">
                      <div className="p-6 md:p-8 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.28),transparent_30%),linear-gradient(135deg,#020617,#111827_50%,#312e81)]">
                        <Badge className="mb-4 border border-cyan-300/20 bg-cyan-400/15 text-cyan-100"><Coins className="mr-1 h-3.5 w-3.5" />$TDRIP Top-up Desk</Badge>
                        <h2 className="text-3xl font-black">Buy $TDRIP points inside your wallet.</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Top-ups create a checkout record, show the admin payment address, and let you submit a payment reference for verification.</p>
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-xs text-white/50">Current balance</p><p className="text-xl font-black" data-testid="text-topup-current-points">{tdripPoints.toLocaleString()} pts</p></div>
                          <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-xs text-white/50">Point value</p><p className="text-xl font-black" data-testid="text-topup-current-value">{money(tdripValue)}</p></div>
                          <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-xs text-white/50">Rate</p><p className="text-xl font-black">100 pts = $1</p></div>
                        </div>
                      </div>
                      <div className="space-y-4 bg-white p-6 text-slate-950 md:p-8">
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                          <div>
                            <Label htmlFor="tdrip-topup-points">Amount to top up</Label>
                            <Input id="tdrip-topup-points" type="number" min="100" step="100" value={topupPoints} onChange={(e) => setTopupPoints(e.target.value)} data-testid="input-wallet-tdrip-topup-points" />
                          </div>
                          <div>
                            <Label>Checkout payment method</Label>
                            <Select value={selectedMethod?.id || ""} onValueChange={setSelectedMethodId}>
                              <SelectTrigger data-testid="select-wallet-tdrip-method"><SelectValue placeholder="Select method" /></SelectTrigger>
                              <SelectContent>
                                {cryptoMethods.length === 0 ? <SelectItem value="none" disabled>No payment method configured</SelectItem> : cryptoMethods.map((method: any) => <SelectItem key={method.id} value={method.id}>{method.label} {method.network ? `(${method.network})` : ""}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={() => startTopup.mutate()} disabled={startTopup.isPending || buyPoints < 100 || cryptoMethods.length === 0} className="rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400" data-testid="button-wallet-start-tdrip-checkout">
                            {startTopup.isPending ? "Starting..." : `Buy ${money(buyAmount)}`}
                          </Button>
                        </div>
                        <p className="text-sm text-slate-500" data-testid="text-wallet-topup-summary">You receive <strong>{buyPoints.toLocaleString()} $TDRIP</strong> for <strong>{money(buyAmount)}</strong>.</p>
                        {checkout && (
                          <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5" data-testid="panel-wallet-tdrip-checkout">
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div><p className="text-sm text-indigo-600">Send exactly</p><p className="text-3xl font-black text-indigo-950">{checkout.checkout.amount}</p></div>
                              <StatusBadge status="pending" />
                            </div>
                            <div className="mb-4 rounded-2xl bg-white p-4">
                              <p className="mb-1 text-xs text-slate-500">{checkout.checkout.paymentMethod.label}</p>
                              <div className="flex items-center gap-2"><code className="flex-1 break-all text-xs" data-testid="text-wallet-checkout-address">{checkout.checkout.paymentMethod.address}</code><Button size="sm" variant="outline" onClick={copyCheckoutAddress} data-testid="button-copy-wallet-checkout-address"><Copy className="h-3.5 w-3.5" /></Button></div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-[1fr_auto]"><Input value={transactionHash} onChange={(e) => setTransactionHash(e.target.value)} placeholder="Paste transaction ID or payment reference" data-testid="input-wallet-tdrip-payment-reference" /><Button onClick={() => submitProof.mutate()} disabled={submitProof.isPending || !transactionHash} className="bg-slate-950 hover:bg-slate-800" data-testid="button-wallet-submit-tdrip-proof">{submitProof.isPending ? "Submitting..." : "Submit proof"}</Button></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-violet-600" />Transfer or tip $TDRIP</CardTitle>
                      <CardDescription>Send points to another Taskdrip user by email or user ID.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                        <button onClick={() => setTransferType("transfer")} className={`rounded-xl py-2 text-sm font-bold ${transferType === "transfer" ? "bg-white text-violet-700 shadow" : "text-slate-500"}`} data-testid="button-wallet-transfer-mode">Transfer</button>
                        <button onClick={() => setTransferType("tip")} className={`rounded-xl py-2 text-sm font-bold ${transferType === "tip" ? "bg-white text-violet-700 shadow" : "text-slate-500"}`} data-testid="button-wallet-tip-mode">Tip</button>
                      </div>
                      <div><Label>Recipient email or user ID</Label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="creator@example.com" data-testid="input-wallet-tdrip-recipient" /></div>
                      <div className="grid grid-cols-2 gap-3"><div><Label>Points</Label><Input type="number" min="1" value={transferPoints} onChange={(e) => setTransferPoints(e.target.value)} data-testid="input-wallet-tdrip-transfer-points" /></div><div className="rounded-2xl border bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Value</p><p className="text-xl font-black">{money(Number(transferPoints || 0) / TDRIP_RATE)}</p></div></div>
                      <div><Label>Note</Label><Input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="Optional note" data-testid="input-wallet-tdrip-transfer-note" /></div>
                      <Button onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending || !recipient || !transferPoints} className="w-full rounded-2xl bg-violet-600 py-6 hover:bg-violet-700" data-testid="button-wallet-send-tdrip">{transferMutation.isPending ? "Sending..." : transferType === "tip" ? "Send tip" : "Transfer points"}</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="withdraw" id="withdraw" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><ArrowUpRight className="h-5 w-5 text-emerald-600" />Request withdrawal</CardTitle>
                      <CardDescription>Withdraw available earnings to a saved or custom wallet. Minimum payout is $10.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-3xl bg-emerald-50 p-5"><p className="text-sm text-emerald-700">Available to withdraw</p><p className="text-4xl font-black text-emerald-950" data-testid="text-withdraw-available">{money(availableBalance)}</p></div>
                      <div><Label>Amount</Label><Input type="number" min="10" value={payoutForm.amount} onChange={(e) => setPayoutForm((current) => ({ ...current, amount: e.target.value }))} placeholder="50.00" data-testid="input-wallet-withdraw-amount" /></div>
                      <div className="grid grid-cols-4 gap-2">{[25, 50, 75, 100].map((percent) => <Button key={percent} type="button" variant="outline" size="sm" onClick={() => payoutPercent(percent)} data-testid={`button-withdraw-percent-${percent}`}>{percent === 100 ? "All" : `${percent}%`}</Button>)}</div>
                      <div><Label>Network</Label><Select value={payoutForm.network} onValueChange={(value) => setPayoutForm((current) => ({ ...current, network: value }))}><SelectTrigger data-testid="select-wallet-withdraw-network"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USDT-TRC20">USDT TRC-20</SelectItem><SelectItem value="USDT-BEP20">USDT BEP-20</SelectItem><SelectItem value="USDT-ERC20">USDT ERC-20</SelectItem><SelectItem value="TON">TON</SelectItem><SelectItem value="BTC">Bitcoin</SelectItem><SelectItem value="PI">Pi Network</SelectItem></SelectContent></Select></div>
                      <div><Label>Receiving wallet</Label><Input value={payoutForm.walletAddress} onChange={(e) => setPayoutForm((current) => ({ ...current, walletAddress: e.target.value }))} placeholder="Paste receiving wallet address" data-testid="input-wallet-withdraw-address" /></div>
                      <div><Label>Notes</Label><Textarea value={payoutForm.notes} onChange={(e) => setPayoutForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Optional instructions for admin review" data-testid="textarea-wallet-withdraw-notes" /></div>
                      <Button onClick={() => payoutMutation.mutate()} disabled={payoutMutation.isPending || Number(payoutForm.amount) < 10 || !payoutForm.walletAddress} className="w-full rounded-2xl bg-emerald-600 py-6 hover:bg-emerald-700" data-testid="button-wallet-request-withdrawal">{payoutMutation.isPending ? "Submitting..." : "Submit withdrawal request"}</Button>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle>Withdrawal history</CardTitle>
                      <CardDescription>{summary.payoutCount} request{summary.payoutCount === 1 ? "" : "s"} connected to your wallet.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(ledgerData?.payoutRequests || []).length === 0 ? (
                        <div className="rounded-3xl border border-dashed p-10 text-center"><Download className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-950">No withdrawals yet</p><p className="text-sm text-slate-500">Your requests will show here after submission.</p></div>
                      ) : (ledgerData?.payoutRequests || []).map((request) => (
                        <div key={request.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4" data-testid={`card-wallet-payout-${request.id}`}>
                          <div className="flex items-start justify-between gap-3"><div><p className="text-xl font-black text-slate-950">{money(request.amount)}</p><p className="text-sm text-slate-500">{request.network || "Saved wallet"} · {request.createdAt ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true }) : "recently"}</p></div><StatusBadge status={request.status || "pending"} /></div>
                          <p className="mt-3 break-all rounded-2xl bg-white p-3 font-mono text-xs text-slate-500">{request.walletAddress}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="checkout" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="border-0 bg-white shadow-sm lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-indigo-600" />Checkout payment center</CardTitle>
                      <CardDescription>Review active admin payment rails and recent checkout/payment records.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {paymentMethods.length === 0 ? (
                        <div className="rounded-3xl border border-dashed p-10 text-center"><CreditCard className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-950">No payment rails configured</p><p className="text-sm text-slate-500">Admins can add payment methods from the payments dashboard.</p></div>
                      ) : paymentMethods.map((method: any) => (
                        <div key={method.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4" data-testid={`card-wallet-payment-method-${method.id}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div><p className="font-black text-slate-950">{method.label}</p><p className="text-sm capitalize text-slate-500">{method.type} {method.network ? `· ${method.network}` : ""} {method.currency ? `· ${method.currency}` : ""}</p></div>
                            <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                          </div>
                          {method.address && <p className="mt-3 break-all rounded-2xl bg-white p-3 font-mono text-xs text-slate-500">{method.address}</p>}
                          {method.instructions && <p className="mt-3 text-sm text-slate-600">{method.instructions}</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-slate-950 text-white shadow-sm">
                    <CardHeader>
                      <CardTitle>Checkout shortcuts</CardTitle>
                      <CardDescription className="text-white/55">Continue payment-related flows from the wallet.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Link href="/shop"><Button className="w-full justify-start bg-white text-slate-950 hover:bg-slate-100" data-testid="button-checkout-open-shop"><ShoppingBag className="mr-2 h-4 w-4" />Marketplace checkout</Button></Link>
                      <Link href="/my-orders"><Button variant="outline" className="w-full justify-start border-white/20 bg-white/10 text-white hover:bg-white/20" data-testid="button-checkout-open-orders"><ReceiptText className="mr-2 h-4 w-4" />My orders</Button></Link>
                      <Link href="/campaigns"><Button variant="outline" className="w-full justify-start border-white/20 bg-white/10 text-white hover:bg-white/20" data-testid="button-checkout-open-campaigns"><Zap className="mr-2 h-4 w-4" />Campaign payments</Button></Link>
                      <a href="#topup"><Button variant="outline" className="w-full justify-start border-white/20 bg-white/10 text-white hover:bg-white/20" data-testid="button-checkout-open-topup"><Coins className="mr-2 h-4 w-4" />$TDRIP checkout</Button></a>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-slate-900" />Earnings and transaction history</CardTitle>
                      <CardDescription>{visibleEntries.length} record{visibleEntries.length === 1 ? "" : "s"} shown from wallet, payout, point, escrow, and checkout activity.</CardDescription>
                    </div>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger className="w-full lg:w-56" data-testid="select-wallet-history-filter"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All wallet activity</SelectItem><SelectItem value="in">Money in</SelectItem><SelectItem value="out">Money out</SelectItem><SelectItem value="hold">Escrow holds</SelectItem><SelectItem value="transaction">Transactions</SelectItem><SelectItem value="payout">Withdrawals</SelectItem><SelectItem value="points">$TDRIP history</SelectItem><SelectItem value="purchase">Checkout payments</SelectItem></SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    {visibleEntries.length === 0 ? (
                      <div className="rounded-3xl border border-dashed p-12 text-center"><ReceiptText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-950" data-testid="text-wallet-empty-history">No wallet activity yet</p><p className="text-sm text-slate-500">Earnings, top-ups, withdrawals, checkouts, and transfers will appear here.</p></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow><TableHead>Activity</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {visibleEntries.map((entry) => (
                              <TableRow key={entry.id} data-testid={`row-wallet-history-${entry.id}`}>
                                <TableCell>
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1 rounded-full bg-slate-100 p-2"><DirectionIcon direction={entry.direction} unit={entry.unit} /></div>
                                    <div>
                                      {entry.href ? <Link href={entry.href} className="font-bold text-slate-950 hover:underline" data-testid={`link-wallet-history-${entry.id}`}>{entry.title}</Link> : <p className="font-bold text-slate-950">{entry.title}</p>}
                                      <p className="mt-1 max-w-xl text-sm text-slate-500" data-testid={`text-wallet-history-description-${entry.id}`}>{entry.description || labelForType(entry.source)}</p>
                                      {entry.network && <p className="mt-1 text-xs font-medium text-slate-400">{entry.network}</p>}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell><StatusBadge status={entry.status} /></TableCell>
                                <TableCell className="whitespace-nowrap text-sm text-slate-500">{entry.date ? format(new Date(entry.date), "MMM d, yyyy") : "—"}</TableCell>
                                <TableCell className={`whitespace-nowrap text-right font-black ${entry.direction === "in" ? "text-emerald-700" : entry.direction === "out" ? "text-red-700" : entry.unit === "TDRIP" ? "text-violet-700" : "text-slate-900"}`} data-testid={`text-wallet-history-amount-${entry.id}`}>{entry.direction === "in" ? "+" : entry.direction === "out" ? "-" : ""}{entry.unit === "TDRIP" ? `${entry.amount.toLocaleString()} pts` : money(entry.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <p className="mt-4 text-xs text-slate-400" data-testid="text-wallet-generated">Last loaded {ledgerData?.generatedAt ? formatDistanceToNow(new Date(ledgerData.generatedAt), { addSuffix: true }) : "just now"}.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
