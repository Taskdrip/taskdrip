import { useEffect, useMemo, useState, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowDownLeft, ArrowUpRight, BadgeCheck, Banknote, Check,
  CheckCircle2, Clock, Coins, Copy, CreditCard, Download, Eye,
  Gift, Landmark, Lock, ReceiptText, Repeat2, Send, ShieldCheck,
  ShoppingBag, Sparkles, TrendingUp, Wallet, Zap, Building2, AlertCircle,
  ExternalLink, RefreshCw, Star, ArrowRight, Rocket, Info, X, Plus
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

function pts(n: number) {
  return n.toLocaleString() + " $TDRIP";
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function labelForType(type?: string) {
  const labels: Record<string, string> = {
    campaign_reward: "Campaign Reward",
    bonus: "Bonus",
    direct_hire_payout: "Direct Hire Payout",
    payout: "Withdrawal",
    platform_fee: "Platform Fee",
    tdrip_topup: "$TDRIP Top-up",
    tdrip_transfer: "$TDRIP Transfer",
    tdrip_tip: "$TDRIP Tip Sent",
    tdrip_purchase: "$TDRIP Purchased",
    social_task: "Social Task Reward",
    micro_task_reward: "Micro-Task Reward",
    referral_bonus: "Referral Bonus",
    welcome_bonus: "Welcome Bonus",
  };
  return labels[type || ""] || (type || "transaction").split("_").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function shortAddress(value?: string | null) {
  if (!value) return "Not connected";
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "completed" || status === "approved" || status === "verified"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : status === "pending" || status === "processing" || status === "submitted"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : status === "active" || status === "work_submitted" || status === "revision_requested"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : status === "rejected" || status === "failed" || status === "cancelled"
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge className={`${color} capitalize text-xs`}>{String(status || "pending").replace(/_/g, " ")}</Badge>;
}

function DirectionIcon({ direction, unit }: { direction: ActivityEntry["direction"]; unit: ActivityEntry["unit"] }) {
  if (unit === "TDRIP") return <Coins className="h-4 w-4 text-violet-600" />;
  if (direction === "in") return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
  if (direction === "out") return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  if (direction === "hold") return <Clock className="h-4 w-4 text-blue-600" />;
  return <ReceiptText className="h-4 w-4 text-slate-500" />;
}

// ── Social Quick Tasks Panel ────────────────────────────────────────────────
function SocialTasksPanel() {
  const { toast } = useToast();
  const { data: tasks = [], refetch } = useQuery<any[]>({ queryKey: ["/api/social-quick-tasks"] });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => (await apiRequest("POST", `/api/social-quick-tasks/${taskId}/complete`, {})).json(),
    onSuccess: (data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: `+${data.pointsEarned} $TDRIP earned!`, description: "Social task completed. Points added to your $TDRIP wallet." });
    },
    onError: (e: any) => {
      if (e.message?.includes("409") || e.message?.includes("Already")) {
        toast({ title: "Already completed", description: "You've already done this task." });
      } else {
        toast({ title: "Error", description: "Could not complete task", variant: "destructive" });
      }
    },
  });

  const pending = (tasks as any[]).filter(t => !t.completed);
  const done = (tasks as any[]).filter(t => t.completed);

  if (tasks.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-violet-800">
          <Zap className="h-4 w-4 text-violet-600" />
          Quick Social Tasks · Earn $TDRIP Points
        </CardTitle>
        <CardDescription className="text-violet-600 text-xs">
          Complete these tasks to earn $TDRIP points. Points are held for future Airdrop/Token conversion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pending.map((task: any) => (
          <div key={task.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-violet-100" data-testid={`social-task-${task.id}`}>
            <span className="text-xl flex-shrink-0">{task.iconEmoji || "🔗"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{task.label}</p>
              {task.description && <p className="text-xs text-gray-500 truncate">{task.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-1 rounded-full">+{task.pointsReward} pts</span>
              <div className="flex gap-1.5">
                <a href={task.actionUrl} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => completeMutation.mutate(task.id), 3000)}>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-violet-200 text-violet-700 hover:bg-violet-50" data-testid={`btn-open-task-${task.id}`}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Open
                  </Button>
                </a>
                <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={() => completeMutation.mutate(task.id)} disabled={completeMutation.isPending} data-testid={`btn-complete-task-${task.id}`}>
                  <Check className="h-3 w-3 mr-1" /> Done
                </Button>
              </div>
            </div>
          </div>
        ))}
        {done.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">{done.length} completed task{done.length > 1 ? "s" : ""}</summary>
            <div className="mt-2 space-y-1.5">
              {done.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100 opacity-70">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-gray-600 flex-1 truncate">{task.label}</p>
                  <Badge className="bg-green-100 text-green-700 text-xs">+{task.pointsReward} pts earned</Badge>
                </div>
              ))}
            </div>
          </details>
        )}
        {pending.length === 0 && done.length > 0 && (
          <div className="text-center py-3">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-700">All tasks complete! 🎉</p>
            <p className="text-xs text-gray-500">Check back for new tasks from the admin.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Wallet Page ─────────────────────────────────────────────────────────
export default function WalletSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [directSupportEnabled, setDirectSupportEnabled] = useState(false);
  // Read URL params on initial load: ?topup=N pre-fills the buy amount, ?tab=topup auto-switches tab
  const initialUrlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialTopupParam = Number(initialUrlParams.get("topup") || 0);
  const initialTabParam = initialUrlParams.get("tab");
  const [topupPoints, setTopupPoints] = useState(initialTopupParam > 0 ? String(Math.max(100, Math.ceil(initialTopupParam / 100) * 100)) : "1000");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [checkout, setCheckout] = useState<any>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [transferType, setTransferType] = useState<"transfer" | "tip">("tip");
  const [recipient, setRecipient] = useState("");
  const [transferPoints, setTransferPoints] = useState("100");
  const [transferNote, setTransferNote] = useState("");
  const [payoutForm, setPayoutForm] = useState({ amount: "", network: "USDT-TRC20", walletAddress: "", notes: "" });
  const [activityFilter, setActivityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState(initialTabParam === "topup" || initialTopupParam > 0 ? "topup" : "overview");

  // If redirected here with ?topup=N, scroll to the buy panel after mount
  useEffect(() => {
    if (initialTopupParam > 0 && typeof window !== "undefined") {
      setTimeout(() => {
        document.getElementById("tdrip-topup")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBrand = (user as any)?.userType === "brand";
  const isAdmin = (user as any)?.userType === "admin";

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
    defaultValues: { usdtTronWallet: "", usdtBscWallet: "", usdtEthWallet: "", tonWallet: "", btcWallet: "", piWallet: "" },
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
      setPayoutForm(cur => ({
        ...cur,
        walletAddress: cur.walletAddress || (user as any).usdtTronWallet || (user as any).usdtBscWallet || "",
      }));
    }
  }, [user, setValue]);

  // Real-time polling for balance updates
  const { data: ledgerData, isLoading: ledgerLoading, refetch: refetchLedger } = useQuery<LedgerData>({
    queryKey: ["/api/ledger"],
    refetchInterval: 15000,
  });

  const { data: pointsData, isLoading: pointsLoading, refetch: refetchPoints } = useQuery<{ total: number; points: any[]; level?: string }>({
    queryKey: ["/api/points/me"],
    refetchInterval: 15000,
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

  const { data: allPaymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Brand wallet data
  const { data: brandWalletData } = useQuery<any>({
    queryKey: ["/api/brand/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/brand/wallet", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isBrand,
  });

  const cryptoMethods = (paymentMethods as any[]).filter((m: any) => m.type === "crypto" && m.address);
  const selectedMethod = cryptoMethods.find((m: any) => m.id === selectedMethodId) || cryptoMethods[0];
  const ledgerUser = ledgerData?.user || user || {};
  const availableBalance = numberValue((ledgerUser as any).availableBalance);
  const pendingBalance = numberValue((ledgerUser as any).pendingBalance);
  const totalEarned = numberValue((ledgerUser as any).totalEarned);
  const tdripPoints = Number(pointsData?.total ?? (user as any)?.totalPoints ?? 0);
  const tdripValue = tdripPoints / TDRIP_RATE;
  const buyPoints = Math.max(0, Number(topupPoints || 0));
  const buyAmount = buyPoints / TDRIP_RATE;

  const walletNetworks = [
    { name: "USDT TRC-20", key: "usdtTronWallet" as keyof WalletFormData, network: "Tron", currency: "USDT", color: "from-emerald-500 to-teal-600", placeholder: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t..." },
    { name: "USDT BEP-20", key: "usdtBscWallet" as keyof WalletFormData, network: "BNB Chain", currency: "USDT", color: "from-yellow-500 to-orange-500", placeholder: "0x742C4B8d7bBb3B4C6c8c89f5D3e1f4E..." },
    { name: "USDT ERC-20", key: "usdtEthWallet" as keyof WalletFormData, network: "Ethereum", currency: "USDT", color: "from-indigo-500 to-blue-600", placeholder: "0x4e83362442B8d1beC281594c..." },
    { name: "TON Wallet", key: "tonWallet" as keyof WalletFormData, network: "TON", currency: "TON / USDT", color: "from-sky-500 to-blue-600", placeholder: "EQD5p2L6r4g8J9B3K1r5n6m7c8..." },
    { name: "Bitcoin Wallet", key: "btcWallet" as keyof WalletFormData, network: "Bitcoin", currency: "BTC", color: "from-orange-500 to-amber-600", placeholder: "bc1q..." },
    { name: "Pi Network", key: "piWallet" as keyof WalletFormData, network: "Pi", currency: "PI", color: "from-purple-500 to-fuchsia-600", placeholder: "@yourPiUsername or Pi wallet address" },
  ];

  const savedWalletsCount = walletNetworks.filter(n => Boolean((user as any)?.[n.key])).length;

  const summary = useMemo(() => {
    const transactions = ledgerData?.transactions || [];
    const payouts = ledgerData?.payoutRequests || [];
    const directHires = ledgerData?.directHireOffers || [];
    const escrows = ledgerData?.escrowPayments || [];
    const completedCredits = transactions.filter(t => creditTypes.has(t.type) && ["completed", "approved"].includes(t.status)).reduce((s, t) => s + numberValue(t.amount), 0);
    const pendingWithdrawals = payouts.filter(r => ["pending", "processing", "approved"].includes(r.status)).reduce((s, r) => s + numberValue(r.amount), 0);
    const escrowInProgress = [...directHires, ...escrows].filter(i => activeEscrowStatuses.has(i.status)).reduce((s, i) => s + numberValue(i.influencerPayout || i.budget || i.amount), 0);
    const tdripEarned = (pointsData?.points || []).filter(p => numberValue(p.points) > 0).reduce((s, p) => s + numberValue(p.points), 0);
    const tdripSpent = Math.abs((pointsData?.points || []).filter(p => numberValue(p.points) < 0).reduce((s, p) => s + numberValue(p.points), 0));
    return { completedCredits, pendingWithdrawals, escrowInProgress, payoutCount: payouts.length, transactionCount: transactions.length, tdripEarned, tdripSpent, purchasesCount: purchases.length };
  }, [ledgerData, pointsData, purchases]);

  const activityEntries = useMemo<ActivityEntry[]>(() => {
    const txEntries = (ledgerData?.transactions || []).map(t => {
      const type = t.type || "transaction";
      const direction = creditTypes.has(type) ? "in" : debitTypes.has(type) ? "out" : type.includes("escrow") ? "hold" : "neutral";
      return { id: `tx-${t.id}`, source: "transaction" as const, title: labelForType(type), description: t.description, amount: numberValue(t.amount), unit: "USD" as const, direction: direction as any, status: t.status || "pending", date: t.processedAt || t.createdAt, network: t.network };
    });
    const payoutEntries = (ledgerData?.payoutRequests || []).map(r => ({ id: `payout-${r.id}`, source: "payout" as const, title: "Withdrawal Request", description: r.adminNotes || `Payout to ${r.network || "wallet"}`, amount: numberValue(r.amount), unit: "USD" as const, direction: "out" as const, status: r.status || "pending", date: r.processedAt || r.createdAt, network: r.network }));
    const pointEntries = (pointsData?.points || []).map(p => ({ id: `point-${p.id}`, source: "points" as const, title: labelForType(p.actionType), description: p.description, amount: Math.abs(numberValue(p.points)), unit: "TDRIP" as const, direction: (numberValue(p.points) >= 0 ? "in" : "out") as any, status: "completed", date: p.createdAt }));
    const purchaseEntries = (purchases as any[]).map(p => ({ id: `purchase-${p.purchase?.id || p.id}`, source: "purchase" as const, title: p.product?.title || "Shop Purchase", description: `Marketplace checkout`, amount: numberValue(p.purchase?.amount || p.amount), unit: "USD" as const, direction: "out" as const, status: p.purchase?.status || p.status || "pending", date: p.purchase?.createdAt || p.createdAt }));
    const escrowEntries = [...(ledgerData?.directHireOffers || []), ...(ledgerData?.escrowPayments || [])].filter(i => activeEscrowStatuses.has(i.status)).map(i => ({ id: `escrow-${i.id}`, source: "escrow" as const, title: i.title || "Escrow", description: "Funds held in escrow", amount: numberValue(i.influencerPayout || i.budget || i.amount), unit: "USD" as const, direction: "hold" as const, status: i.status || "pending", date: i.updatedAt || i.createdAt }));
    return [...txEntries, ...payoutEntries, ...pointEntries, ...purchaseEntries, ...escrowEntries].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [ledgerData, pointsData, purchases]);

  const visibleEntries = activityEntries.filter(e => activityFilter === "all" || e.source === activityFilter || e.direction === activityFilter || e.unit.toLowerCase() === activityFilter);

  const updateWalletMutation = useMutation({
    mutationFn: async (data: WalletFormData) => (await apiRequest("PATCH", `/api/users/${(user as any)?.id}/profile`, { ...data, directSupportEnabled })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Wallets saved", description: "Your receiving wallets were updated." });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const startTopup = useMutation({
    mutationFn: async () => {
      if (!selectedMethod) throw new Error("No crypto checkout method available. Please ask an admin to add a payment method.");
      if (buyPoints < 100) throw new Error("Minimum top-up is 100 $TDRIP.");
      const res = await apiRequest("POST", "/api/tdrip/topups", { points: buyPoints, paymentMethodId: selectedMethod.id });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Checkout failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCheckout(data);
      toast({ title: "Checkout created", description: "Send payment to the address shown, then submit your reference." });
    },
    onError: (e: Error) => toast({ title: "Checkout failed", description: e.message, variant: "destructive" }),
  });

  const submitProof = useMutation({
    mutationFn: async () => {
      if (!checkout?.transaction?.id) throw new Error("Start a checkout first.");
      if (!transactionHash.trim()) throw new Error("Please enter your transaction hash or reference.");
      const formData = new FormData();
      formData.append("transactionHash", transactionHash);
      formData.append("network", checkout.checkout?.paymentMethod?.network || selectedMethod?.network || "");
      const res = await fetch(`/api/tdrip/topups/${checkout.transaction.id}/submit-proof`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to submit");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: data.credited ? "🎉 $TDRIP Credited!" : "Reference Submitted", description: data.credited ? `${data.points} $TDRIP added to your points wallet.` : "Our team will verify your payment shortly." });
      if (data.credited) { setCheckout(null); setTransactionHash(""); }
    },
    onError: (e: Error) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!recipient.trim()) throw new Error("Enter a recipient username or email.");
      if (Number(transferPoints) <= 0) throw new Error("Enter a valid amount.");
      if (Number(transferPoints) > tdripPoints) throw new Error("Insufficient $TDRIP balance.");
      if (transferType === "transfer") throw new Error("$TDRIP points can only be used for Tips, not transfers. Choose 'Tip' instead.");
      const res = await apiRequest("POST", "/api/tdrip/transfer", { recipient, points: Number(transferPoints), note: transferNote, type: transferType });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Transfer failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "✅ Tip Sent!", description: `${transferPoints} $TDRIP tip sent to ${recipient}` });
      setRecipient(""); setTransferNote("");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      if (!payoutForm.amount || parseFloat(payoutForm.amount) <= 0) throw new Error("Enter a valid amount.");
      if (parseFloat(payoutForm.amount) > availableBalance) throw new Error("Insufficient funds balance.");
      if (!payoutForm.walletAddress) throw new Error("Enter your receiving wallet address.");
      const res = await apiRequest("POST", "/api/payout-requests", payoutForm);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payout-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Withdrawal Requested", description: "Your withdrawal request has been submitted for admin review." });
      setPayoutForm(cur => ({ ...cur, amount: "", notes: "" }));
    },
    onError: (e: Error) => toast({ title: "Withdrawal failed", description: e.message, variant: "destructive" }),
  });

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied!" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loading = ledgerLoading || pointsLoading;

  const refreshAll = () => {
    refetchLedger();
    refetchPoints();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    toast({ title: "Refreshing balances..." });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationFixed />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="mb-8 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl" data-testid="section-wallet-hero">
          <div className="relative p-6 md:p-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.5),transparent_35%),linear-gradient(135deg,#020617,#111827_48%,#312e81)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isBrand ? "Brand Wallet Center" : "Taskdrip Wallet Bank"}
                </div>
                <h1 className="text-3xl font-black tracking-tight md:text-5xl" data-testid="text-wallet-title">
                  {isBrand ? "Your Brand Wallet" : "Your Wallet Center"}
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
                  {isBrand
                    ? "Manage campaign budgets, escrow deposits, platform fees, and transaction history for your brand."
                    : "Manage your Funds wallet (real crypto/fiat) and $TDRIP Points separately. Points are earned from tasks and can only be used for tips."}
                </p>
                <button onClick={refreshAll} className="mt-3 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors">
                  <RefreshCw className="h-3 w-3" /> Refresh balances
                </button>
              </div>

              {/* Wallet summary cards */}
              <div className="grid gap-3 sm:grid-cols-2 min-w-[300px]">
                {/* Funds Wallet */}
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Funds Wallet</span>
                  </div>
                  <p className="text-2xl font-black text-white" data-testid="text-wallet-available-balance">{money(availableBalance)}</p>
                  <p className="text-xs text-white/50 mt-1">Available to withdraw or spend</p>
                </div>
                {/* $TDRIP Points wallet (only for non-brands) */}
                {!isBrand && (
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-4 w-4 text-violet-400" />
                      <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">$TDRIP Points</span>
                    </div>
                    <p className="text-2xl font-black text-white" data-testid="text-wallet-tdrip-balance">{tdripPoints.toLocaleString()}</p>
                    <p className="text-xs text-white/50 mt-1">Tips only · Future airdrop</p>
                  </div>
                )}
                {isBrand && (
                  <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Campaign Budget</span>
                    </div>
                    <p className="text-2xl font-black text-white">{money(brandWalletData?.balance || 0)}</p>
                    <p className="text-xs text-white/50 mt-1">Deposited for campaigns</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
          </div>
        ) : (
          <>
            {/* ── Stat Cards ─────────────────────────────────────────────── */}
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Wallet className="h-5 w-5 text-emerald-600" /></div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Funds</Badge>
                  </div>
                  <p className="text-2xl font-black text-slate-950" data-testid="text-funds-balance">{money(availableBalance)}</p>
                  <p className="text-xs text-slate-500 mt-1">Available Funds Wallet</p>
                  <p className="text-xs text-slate-400 mt-1">Withdraw · Shop · Receive tips</p>
                </CardContent>
              </Card>

              {!isBrand && (
                <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center"><Coins className="h-5 w-5 text-violet-600" /></div>
                      <Badge className="bg-violet-100 text-violet-700 text-xs">Points</Badge>
                    </div>
                    <p className="text-2xl font-black text-slate-950" data-testid="text-tdrip-balance">{tdripPoints.toLocaleString()}</p>
                    <p className="text-xs text-violet-700 font-semibold mt-1">$TDRIP Points</p>
                    <p className="text-xs text-slate-400 mt-1">Tips only · Airdrop eligible</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-600" /></div>
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>
                  </div>
                  <p className="text-2xl font-black text-slate-950">{money(pendingBalance + summary.escrowInProgress)}</p>
                  <p className="text-xs text-slate-500 mt-1">Escrow & Pending</p>
                  <p className="text-xs text-slate-400 mt-1">Campaign holds · Verification</p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-cyan-600" /></div>
                    <Badge className="bg-cyan-100 text-cyan-700 text-xs">Lifetime</Badge>
                  </div>
                  <p className="text-2xl font-black text-slate-950">{money(totalEarned || summary.completedCredits)}</p>
                  <p className="text-xs text-slate-500 mt-1">Total Earned</p>
                  <p className="text-xs text-slate-400 mt-1">All-time campaign rewards</p>
                </CardContent>
              </Card>
            </section>

            {/* ── Distinction Banner ─────────────────────────────────────── */}
            {!isBrand && (
              <section className="mb-6 grid gap-4 md:grid-cols-2">
                {/* Funds Wallet explainer */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold text-emerald-800 text-sm">Funds Wallet</h3>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-auto">Real Crypto / Fiat</Badge>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed mb-3">Your real crypto/fiat earnings from campaign approvals. Use for withdrawals to your personal wallet, shop purchases, and receiving tips from other users' funds.</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">✓ Withdraw crypto</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">✓ Shop purchases</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">✓ Receive tips</span>
                  </div>
                </div>
                {/* $TDRIP Points explainer */}
                <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-5 w-5 text-violet-600" />
                    <h3 className="font-bold text-violet-800 text-sm">$TDRIP Points</h3>
                    <Badge className="bg-violet-100 text-violet-700 text-xs ml-auto">Future Token</Badge>
                  </div>
                  <p className="text-xs text-violet-700 leading-relaxed mb-3">Earned from campaigns, tasks, referrals, and social tasks. Can only be used to tip other creators. Held for future conversion to the native $TDRIP token via airdrop.</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">✓ Tip creators</span>
                    <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">✓ Airdrop eligible</span>
                    <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">🚀 Future $TDRIP token</span>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">✗ No withdrawals</span>
                  </div>
                </div>
              </section>
            )}

            {/* ── Brand Wallet Section ───────────────────────────────────── */}
            {isBrand && (
              <section className="mb-6">
                <Card className="border-0 bg-gradient-to-br from-blue-950 to-indigo-950 text-white shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-400/20 border border-blue-400/30 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-300" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black">Brand Wallet</h2>
                        <p className="text-sm text-white/60">All brand-specific financials in one place</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: "Available Balance", value: money(availableBalance), note: "Spendable funds", icon: Wallet, color: "text-emerald-400" },
                        { label: "Campaign Escrow", value: money(summary.escrowInProgress), note: "Funds held for campaigns", icon: Lock, color: "text-amber-400" },
                        { label: "Total Spent", value: money(summary.completedCredits + summary.escrowInProgress), note: "Lifetime campaign investment", icon: TrendingUp, color: "text-blue-400" },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
                          <p className="text-xs text-white/50 mb-1">{s.label}</p>
                          <p className="text-xl font-black text-white">{s.value}</p>
                          <p className="text-xs text-white/40 mt-1">{s.note}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/campaigns/create">
                        <Button className="bg-blue-500 hover:bg-blue-400 text-white text-sm">
                          <Plus className="h-4 w-4 mr-2" /> New Campaign
                        </Button>
                      </Link>
                      <button onClick={() => setActiveTab("withdraw")} className="flex items-center gap-2 text-sm text-white/70 hover:text-white border border-white/20 rounded-xl px-4 py-2 transition-colors">
                        <ArrowUpRight className="h-4 w-4" /> Request Payout
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Social quick tasks for non-brands */}
            {!isBrand && <section className="mb-6"><SocialTasksPanel /></section>}

            {/* ── Main Tabs ─────────────────────────────────────────────── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className={`grid h-auto rounded-2xl bg-white p-1 shadow-sm ${isBrand ? "grid-cols-4" : "grid-cols-5"}`} data-testid="tabs-wallet-actions">
                <TabsTrigger value="overview" data-testid="tab-wallet-overview">Overview</TabsTrigger>
                {!isBrand && <TabsTrigger value="tdrip" data-testid="tab-wallet-tdrip">$TDRIP</TabsTrigger>}
                <TabsTrigger value="topup" data-testid="tab-wallet-topup">{isBrand ? "Deposit" : "Top up"}</TabsTrigger>
                <TabsTrigger value="withdraw" data-testid="tab-wallet-withdraw">Withdraw</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-wallet-history">History</TabsTrigger>
              </TabsList>

              {/* OVERVIEW */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Total earned (funds)", value: money(summary.completedCredits), icon: ArrowDownLeft, color: "text-emerald-600 bg-emerald-50" },
                    !isBrand ? { label: "$TDRIP earned", value: pts(summary.tdripEarned), icon: Coins, color: "text-violet-600 bg-violet-50" } : { label: "Campaigns created", value: `${summary.transactionCount}`, icon: Star, color: "text-blue-600 bg-blue-50" },
                    { label: "Purchases/Orders", value: `${summary.purchasesCount}`, icon: ShoppingBag, color: "text-indigo-600 bg-indigo-50" },
                  ].filter(Boolean).map((item: any) => (
                    <Card key={item.label} className="border-0 bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}><item.icon className="h-5 w-5" /></div>
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-5 w-5 text-indigo-600" />Receiving Wallet Addresses</CardTitle>
                    <CardDescription>Save your personal wallet addresses for withdrawals, P2P matching, and direct support.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(data => updateWalletMutation.mutate(data))} className="space-y-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        {walletNetworks.map(network => (
                          <div key={network.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4" data-testid={`card-wallet-network-${network.key}`}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${network.color}`} />
                                <div>
                                  <p className="font-semibold text-slate-900 text-sm">{network.name}</p>
                                  <p className="text-xs text-slate-500">{network.currency} · {network.network}</p>
                                </div>
                              </div>
                              {(user as any)?.[network.key] ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">Connected</Badge> : <Badge variant="outline" className="text-xs">Empty</Badge>}
                            </div>
                            <div className="flex gap-2">
                              <Input placeholder={network.placeholder} {...register(network.key)} className="text-xs" data-testid={`input-wallet-${network.key}`} />
                              {(user as any)?.[network.key] && (
                                <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard((user as any)[network.key], network.key)} data-testid={`button-copy-wallet-${network.key}`}>
                                  {copiedField === network.key ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Allow Direct Crypto Tips</p>
                          <p className="text-xs text-slate-500">Fans can send crypto directly to your saved addresses</p>
                        </div>
                        <Switch checked={directSupportEnabled} onCheckedChange={setDirectSupportEnabled} data-testid="switch-direct-support" />
                      </div>
                      <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={updateWalletMutation.isPending} data-testid="button-save-wallets">
                        {updateWalletMutation.isPending ? "Saving..." : "Save Wallet Addresses"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* $TDRIP POINTS TAB */}
              {!isBrand && (
                <TabsContent value="tdrip" className="space-y-5" id="tdrip">
                  {/* TDRIP balance hero */}
                  <div className="rounded-3xl bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-6 text-white overflow-hidden relative">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
                    <div className="absolute top-0 right-0 w-48 h-48 bg-violet-400/10 rounded-full translate-x-16 -translate-y-16" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <Coins className="h-6 w-6 text-violet-300" />
                        <span className="text-violet-300 font-semibold text-sm uppercase tracking-wider">$TDRIP Points Wallet</span>
                      </div>
                      <div className="flex items-end gap-4 mb-4">
                        <div>
                          <p className="text-5xl font-black">{tdripPoints.toLocaleString()}</p>
                          <p className="text-violet-300 text-sm mt-1">≈ {money(tdripValue)} notional value</p>
                        </div>
                        <div className="ml-auto grid gap-1 text-right text-sm">
                          <span className="text-violet-300 text-xs">Earned</span>
                          <span className="font-bold">{pts(summary.tdripEarned)}</span>
                          <span className="text-violet-300 text-xs">Used for Tips</span>
                          <span className="font-bold">{pts(summary.tdripSpent)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-white/10 px-3 py-1.5 rounded-full font-medium">✓ Use for tips only</span>
                        <span className="bg-white/10 px-3 py-1.5 rounded-full font-medium">🚀 Future airdrop eligible</span>
                        <span className="bg-white/10 px-3 py-1.5 rounded-full font-medium">🪙 Converts to native $TDRIP token</span>
                      </div>
                    </div>
                  </div>

                  {/* Tip creator */}
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base"><Gift className="h-5 w-5 text-violet-600" />Tip a Creator with $TDRIP Points</CardTitle>
                      <CardDescription>$TDRIP points can ONLY be used to tip other creators. They cannot be withdrawn or used for purchases.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">$TDRIP Points are community currency only. They earn you a position in the future $TDRIP token airdrop when the native token launches.</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-1.5 block">Recipient (username or email)</Label>
                        <Input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="@username or email@example.com" data-testid="input-tdrip-recipient" />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-1.5 block">Amount ($TDRIP points)</Label>
                        <div className="relative">
                          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
                          <Input type="number" value={transferPoints} onChange={e => setTransferPoints(e.target.value)} placeholder="100" min="1" max={tdripPoints} className="pl-10" data-testid="input-tdrip-amount" />
                        </div>
                        <div className="flex gap-2 mt-2">
                          {[50, 100, 250, 500].map(v => (
                            <button key={v} onClick={() => setTransferPoints(String(v))} className="text-xs px-2 py-1 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 font-medium" data-testid={`btn-tdrip-preset-${v}`}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-1.5 block">Optional note</Label>
                        <Input value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Great content! Keep it up..." data-testid="input-tdrip-note" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-violet-50 rounded-xl border border-violet-100">
                        <span className="text-sm text-violet-700">Your balance after tip</span>
                        <span className="font-bold text-violet-900">{Math.max(0, tdripPoints - Number(transferPoints)).toLocaleString()} $TDRIP</span>
                      </div>
                      <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={() => { setTransferType("tip"); transferMutation.mutate(); }} disabled={transferMutation.isPending || !recipient || Number(transferPoints) <= 0 || Number(transferPoints) > tdripPoints} data-testid="button-send-tdrip-tip">
                        {transferMutation.isPending ? "Sending..." : `Send ${Number(transferPoints).toLocaleString()} $TDRIP Tip`}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Airdrop info */}
                  <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 flex gap-4">
                    <Rocket className="h-8 w-8 text-violet-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-violet-900 mb-1">Future $TDRIP Token Airdrop</h3>
                      <p className="text-xs text-violet-700 leading-relaxed">All $TDRIP points you earn are recorded on-chain and will be eligible for conversion to the native $TDRIP token during the platform's Token Generation Event (TGE). The more points you accumulate, the larger your airdrop allocation.</p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-3 border border-violet-100">
                          <p className="text-xs text-slate-500">Your current points</p>
                          <p className="text-lg font-black text-violet-700">{tdripPoints.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-violet-100">
                          <p className="text-xs text-slate-500">Total earned</p>
                          <p className="text-lg font-black text-violet-700">{summary.tdripEarned.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* TOP UP / DEPOSIT */}
              <TabsContent value="topup" className="space-y-5" id="topup">
                {isBrand ? (
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-blue-600" />Deposit Campaign Funds</CardTitle>
                      <CardDescription>Deposit crypto to fund your campaigns. Funds will be held in escrow until campaigns are approved.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                        <p className="text-sm text-blue-700">To deposit funds, create a campaign and our admin team will provide payment details. Your balance will be updated after verification.</p>
                      </div>
                      <Link href="/campaigns/create">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">Create Campaign to Deposit</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-5">
                    {/* $TDRIP Topup */}
                    <Card className="border-0 bg-white shadow-sm" id="tdrip-topup">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><Coins className="h-5 w-5 text-violet-600" />Buy $TDRIP Points</CardTitle>
                        <CardDescription>Top up your $TDRIP balance by sending crypto to a Taskdrip checkout wallet. Points will be credited after verification.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {!checkout ? (
                          <>
                            <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
                              <p className="text-sm font-semibold text-violet-800 mb-1">How it works</p>
                              <ol className="text-xs text-violet-700 space-y-1 list-decimal ml-4">
                                <li>Choose how many $TDRIP points you want</li>
                                <li>We'll show you a Taskdrip crypto address</li>
                                <li>Send payment from your wallet</li>
                                <li>Submit your transaction hash</li>
                                <li>Points are credited automatically (or after manual review)</li>
                              </ol>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold mb-1.5 block">Points to buy</Label>
                              <div className="relative">
                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
                                <Input type="number" value={topupPoints} onChange={e => setTopupPoints(e.target.value)} min="100" step="100" className="pl-10 text-lg font-semibold h-12" data-testid="input-topup-points" />
                              </div>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {[500, 1000, 2500, 5000, 10000].map(v => (
                                  <button key={v} onClick={() => setTopupPoints(String(v))} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${topupPoints === String(v) ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700 hover:bg-violet-200"}`} data-testid={`btn-topup-preset-${v}`}>{v.toLocaleString()}</button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <p className="text-slate-500 text-xs mb-1">You'll receive</p>
                                <p className="font-black text-lg text-violet-700">{buyPoints.toLocaleString()} $TDRIP</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <p className="text-slate-500 text-xs mb-1">Cost (USDT)</p>
                                <p className="font-black text-lg">{buyAmount.toFixed(2)} USDT</p>
                                <p className="text-xs text-slate-400">Rate: 100 pts = $1</p>
                              </div>
                            </div>
                            {cryptoMethods.length > 1 && (
                              <div>
                                <Label className="text-sm font-semibold mb-1.5 block">Payment network</Label>
                                <Select value={selectedMethodId || cryptoMethods[0]?.id} onValueChange={setSelectedMethodId}>
                                  <SelectTrigger data-testid="select-topup-method"><SelectValue placeholder="Select network" /></SelectTrigger>
                                  <SelectContent>
                                    {cryptoMethods.map((m: any) => (
                                      <SelectItem key={m.id} value={m.id}>{m.label} · {m.network}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {cryptoMethods.length === 0 && (
                              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                <p className="text-sm text-amber-700">No checkout wallets have been set up yet. Please contact admin to enable $TDRIP top-ups.</p>
                              </div>
                            )}
                            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 text-sm font-semibold" onClick={() => startTopup.mutate()} disabled={startTopup.isPending || buyPoints < 100 || cryptoMethods.length === 0} data-testid="button-start-topup">
                              {startTopup.isPending ? "Creating checkout..." : `Buy ${buyPoints.toLocaleString()} $TDRIP for ${buyAmount.toFixed(2)} USDT`}
                            </Button>
                          </>
                        ) : (
                          <div className="space-y-4">
                            <div className="rounded-2xl bg-violet-900 text-white p-5">
                              <p className="text-xs text-violet-300 mb-2 font-semibold uppercase tracking-wider">Send exactly</p>
                              <p className="text-3xl font-black mb-1">{checkout.checkout?.amount || buyAmount.toFixed(2)} USDT</p>
                              <p className="text-violet-300 text-sm">to the address below via {checkout.checkout?.paymentMethod?.network || selectedMethod?.network}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold mb-1.5 block">Payment address</Label>
                              <div className="flex gap-2">
                                <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs break-all">{checkout.checkout?.paymentMethod?.address || selectedMethod?.address}</div>
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(checkout.checkout?.paymentMethod?.address || selectedMethod?.address, "checkout")} data-testid="button-copy-checkout-address">
                                  {copiedField === "checkout" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold mb-1.5 block">Your transaction hash / reference</Label>
                              <Input value={transactionHash} onChange={e => setTransactionHash(e.target.value)} placeholder="Paste your transaction hash here after sending..." data-testid="input-topup-txhash" />
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1" onClick={() => { setCheckout(null); setTransactionHash(""); }} data-testid="button-cancel-topup">Cancel</Button>
                              <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => submitProof.mutate()} disabled={submitProof.isPending || !transactionHash.trim()} data-testid="button-submit-topup-proof">
                                {submitProof.isPending ? "Submitting..." : "Submit Payment Reference"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* WITHDRAW */}
              <TabsContent value="withdraw" className="space-y-5" id="withdraw">
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><ArrowUpRight className="h-5 w-5 text-red-600" />Withdraw Funds</CardTitle>
                    <CardDescription>Request a withdrawal from your Funds wallet. Your request will be processed by our admin team within 24-72 hours.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-emerald-700 font-medium">Available Funds Balance</p>
                        <p className="text-2xl font-black text-emerald-800" data-testid="text-withdraw-balance">{money(availableBalance)}</p>
                      </div>
                      <Wallet className="h-8 w-8 text-emerald-400" />
                    </div>

                    {availableBalance <= 0 && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700">Your funds balance is $0.00. Complete campaigns to earn and then request a withdrawal.</p>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold mb-1.5 block">Amount (USD)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                          <Input type="number" value={payoutForm.amount} onChange={e => setPayoutForm(f => ({ ...f, amount: e.target.value }))} placeholder="10.00" min="1" step="0.01" max={availableBalance} className="pl-8 h-11" data-testid="input-withdraw-amount" />
                        </div>
                        <div className="flex gap-2 mt-2">
                          {[25, 50, 75, 100].map(pct => (
                            <button key={pct} onClick={() => setPayoutForm(f => ({ ...f, amount: ((availableBalance * pct) / 100).toFixed(2) }))} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium" data-testid={`btn-withdraw-pct-${pct}`}>{pct}%</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-1.5 block">Network</Label>
                        <Select value={payoutForm.network} onValueChange={v => setPayoutForm(f => ({ ...f, network: v }))}>
                          <SelectTrigger data-testid="select-withdraw-network"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["USDT-TRC20", "USDT-BEP20", "USDT-ERC20", "TON", "BTC", "PI"].map(n => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Your receiving wallet address</Label>
                      <Input value={payoutForm.walletAddress} onChange={e => setPayoutForm(f => ({ ...f, walletAddress: e.target.value }))} placeholder="Your personal wallet address to receive funds" data-testid="input-withdraw-address" />
                      {savedWalletsCount > 0 && (
                        <p className="text-xs text-slate-500 mt-1">You can use your saved wallet addresses from the Overview tab.</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Notes (optional)</Label>
                      <Textarea value={payoutForm.notes} onChange={e => setPayoutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes for the admin team..." rows={2} data-testid="input-withdraw-notes" />
                    </div>

                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 font-semibold" onClick={() => payoutMutation.mutate()} disabled={payoutMutation.isPending || !payoutForm.amount || parseFloat(payoutForm.amount || "0") <= 0 || parseFloat(payoutForm.amount || "0") > availableBalance || !payoutForm.walletAddress} data-testid="button-submit-withdrawal">
                      {payoutMutation.isPending ? "Submitting..." : `Request ${payoutForm.amount ? money(parseFloat(payoutForm.amount)) : ""} Withdrawal`}
                    </Button>

                    {/* Previous payout requests */}
                    {(ledgerData?.payoutRequests || []).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Withdrawal Requests</h4>
                        <div className="space-y-2">
                          {(ledgerData?.payoutRequests || []).slice(0, 5).map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{money(r.amount)}</p>
                                <p className="text-xs text-slate-500">{r.network} · {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ""}</p>
                              </div>
                              <StatusBadge status={r.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* HISTORY */}
              <TabsContent value="history">
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2"><ReceiptText className="h-5 w-5 text-indigo-600" />Transaction History</CardTitle>
                        <CardDescription>All funds and $TDRIP activity</CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {["all", "in", "out", "tdrip", "points", "payout"].map(f => (
                          <button key={f} onClick={() => setActivityFilter(f)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${activityFilter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} data-testid={`btn-history-filter-${f}`}>{f}</button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visibleEntries.length === 0 ? (
                      <div className="text-center py-12">
                        <ReceiptText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {visibleEntries.map(entry => (
                          <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-slate-200 transition-all" data-testid={`tx-entry-${entry.id}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${entry.unit === "TDRIP" ? "bg-violet-100" : entry.direction === "in" ? "bg-emerald-100" : entry.direction === "out" ? "bg-red-100" : "bg-blue-100"}`}>
                              <DirectionIcon direction={entry.direction} unit={entry.unit} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{entry.title}</p>
                              {entry.description && <p className="text-xs text-slate-500 truncate">{entry.description}</p>}
                              <p className="text-xs text-slate-400">{entry.date ? formatDistanceToNow(new Date(entry.date), { addSuffix: true }) : ""}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-black ${entry.direction === "in" ? "text-emerald-600" : entry.direction === "out" ? "text-red-600" : "text-blue-600"}`}>
                                {entry.direction === "in" ? "+" : entry.direction === "out" ? "-" : ""}
                                {entry.unit === "TDRIP" ? `${entry.amount.toLocaleString()} pts` : money(entry.amount)}
                              </p>
                              <StatusBadge status={entry.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
