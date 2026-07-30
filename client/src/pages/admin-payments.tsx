import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigation } from "@/components/ui/navigation";
import { AdminPayoutsCenter } from "@/components/AdminPayoutsCenter";
import {
  CreditCard, Bitcoin, Building2, Wallet, Plus, Edit, Trash2, CheckCircle2,
  ShoppingCart, Target, Crown, BookOpen, Heart, ArrowDownToLine,
  AlertCircle, Lock, Eye, EyeOff, Settings, Layers, ArrowRight,
  Shield, Zap, Globe, ArrowLeft, Search, ArrowUpRight, ArrowDownLeft,
  TrendingUp, DollarSign, Users, Receipt, BarChart2, Activity, KeyRound,
  ThumbsUp, ThumbsDown, MessageSquare, X as CloseIcon
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ZoomableImage } from "@/components/ui/image-lightbox";

const FEATURES = [
  { key: "shop", label: "Shop", icon: ShoppingCart },
  { key: "campaigns", label: "Campaigns", icon: Target },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "p2p", label: "P2P", icon: Globe },
  { key: "subscriptions", label: "Upgrades", icon: Crown },
  { key: "tips", label: "Tips", icon: Heart },
  { key: "payouts", label: "Payouts", icon: ArrowDownToLine },
];

const METHOD_TYPES = [
  { value: "crypto", label: "Cryptocurrency Wallet" },
  { value: "bank", label: "Bank Transfer" },
  { value: "paypal", label: "PayPal" },
  { value: "paystack", label: "Paystack" },
  { value: "stripe", label: "Stripe" },
];

const TYPE_ICONS: Record<string, any> = {
  crypto: Bitcoin, stripe: CreditCard, paypal: Globe, paystack: Zap, bank: Building2,
};

const SOURCE_LABEL: Record<string, string> = {
  transaction: "Transaction", p2p: "P2P", purchase: "Shop",
  escrow: "Escrow", deposit: "Deposit", subscription: "Subscription",
  course_enrollment: "Course",
};

const SOURCE_TONE: Record<string, string> = {
  transaction: "bg-slate-100 text-slate-700",
  p2p: "bg-teal-50 text-teal-700",
  purchase: "bg-blue-50 text-blue-700",
  escrow: "bg-violet-50 text-violet-700",
  deposit: "bg-amber-50 text-amber-700",
  subscription: "bg-rose-50 text-rose-700",
  course_enrollment: "bg-indigo-50 text-indigo-700",
};

const STATUS_TONE: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  released: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  funded: "bg-blue-50 text-blue-700 ring-blue-600/20",
  delivered: "bg-blue-50 text-blue-700 ring-blue-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  submitted: "bg-amber-50 text-amber-700 ring-amber-600/20",
  disputed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
  refunded: "bg-slate-100 text-slate-600 ring-slate-500/20",
  expired: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const CRYPTO_NETWORKS = [
  { network: "TON", currency: "USDT", label: "USDT – TON Network" },
  { network: "TRC-20", currency: "USDT", label: "USDT – Tron (TRC-20)" },
  { network: "BEP-20", currency: "USDT", label: "USDT – BNB Smart Chain (BEP-20)" },
  { network: "Pi", currency: "PI", label: "Pi Network" },
  { network: "ERC-20", currency: "USDT", label: "USDT – Ethereum (ERC-20)" },
  { network: "BTC", currency: "BTC", label: "Bitcoin (BTC)" },
  { network: "ETH", currency: "ETH", label: "Ethereum (ETH)" },
  { network: "SOL", currency: "SOL", label: "Solana (SOL)" },
  { network: "TRX", currency: "TRX", label: "TRON (TRX)" },
  { network: "XRP", currency: "XRP", label: "XRP (Ripple)" },
  { network: "LTC", currency: "LTC", label: "Litecoin (LTC)" },
  { network: "DOGE", currency: "DOGE", label: "Dogecoin (DOGE)" },
];

const EMPTY_METHOD = {
  type: "crypto", label: "", network: "", currency: "", address: "",
  bankName: "", accountName: "", accountNumber: "", routingNumber: "",
  swiftCode: "", bankCountry: "", bankCurrency: "",
  paypalEmail: "", paypalClientId: "",
  paystackPublicKey: "", paystackSecretKey: "",
  stripePublicKey: "", stripeSecretKey: "",
  instructions: "", isActive: true, sortOrder: 0,
};

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pr-10 font-mono text-sm" />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function MethodForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-medium text-slate-600">Payment Type</Label>
          <Select value={form.type} onValueChange={v => set("type", v)}>
            <SelectTrigger data-testid="select-payment-type" className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{METHOD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600">Display Label</Label>
          <Input data-testid="input-method-label" value={form.label} onChange={e => set("label", e.target.value)} placeholder="USDT TRC-20 Wallet" className="mt-1.5" />
        </div>
      </div>

      {form.type === "crypto" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-700 flex items-center gap-2"><Bitcoin className="h-4 w-4" /> Crypto wallet</p>
          <div>
            <Label className="text-xs text-slate-600">Network preset</Label>
            <Select value={`${form.network}__${form.currency}`} onValueChange={v => { const [n, c] = v.split("__"); set("network", n); set("currency", c); }}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select network" /></SelectTrigger>
              <SelectContent>
                {CRYPTO_NETWORKS.map(n => <SelectItem key={n.network} value={`${n.network}__${n.currency}`}>{n.label}</SelectItem>)}
                <SelectItem value="custom__custom">Custom / Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.network === "custom" || !CRYPTO_NETWORKS.find(n => n.network === form.network)) && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-slate-600">Network</Label><Input value={form.network} onChange={e => set("network", e.target.value)} placeholder="ERC-20" className="mt-1.5" /></div>
              <div><Label className="text-xs text-slate-600">Currency</Label><Input value={form.currency} onChange={e => set("currency", e.target.value)} placeholder="USDT" className="mt-1.5" /></div>
            </div>
          )}
          <div>
            <Label className="text-xs text-slate-600">Wallet address</Label>
            <Input data-testid="input-wallet-address" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Enter wallet address" className="mt-1.5 font-mono text-sm" />
          </div>
        </div>
      )}

      {form.type === "paystack" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-700 flex items-center gap-2"><Zap className="h-4 w-4" /> Paystack</p>
          <div><Label className="text-xs text-slate-600">Public key</Label><Input data-testid="input-paystack-public" value={form.paystackPublicKey || ""} onChange={e => set("paystackPublicKey", e.target.value)} placeholder="pk_live_..." className="mt-1.5 font-mono text-sm" /></div>
          <div><Label className="text-xs text-slate-600">Secret key</Label><SecretInput value={form.paystackSecretKey || ""} onChange={v => set("paystackSecretKey", v)} placeholder="sk_live_..." /></div>
        </div>
      )}

      {form.type === "stripe" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-700 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Stripe</p>
          <div><Label className="text-xs text-slate-600">Publishable key</Label><Input data-testid="input-stripe-public" value={form.stripePublicKey} onChange={e => set("stripePublicKey", e.target.value)} placeholder="pk_live_..." className="mt-1.5 font-mono text-sm" /></div>
          <div><Label className="text-xs text-slate-600">Secret key</Label><SecretInput value={form.stripeSecretKey} onChange={v => set("stripeSecretKey", v)} placeholder="sk_live_..." /></div>
        </div>
      )}

      {form.type === "paypal" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-700 flex items-center gap-2"><Globe className="h-4 w-4" /> PayPal</p>
          <div><Label className="text-xs text-slate-600">PayPal email</Label><Input data-testid="input-paypal-email" value={form.paypalEmail} onChange={e => set("paypalEmail", e.target.value)} placeholder="paypal@yourdomain.com" className="mt-1.5" /></div>
          <div><Label className="text-xs text-slate-600">Client ID</Label><Input value={form.paypalClientId} onChange={e => set("paypalClientId", e.target.value)} placeholder="AXxx..." className="mt-1.5 font-mono text-sm" /></div>
        </div>
      )}

      {form.type === "bank" && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-sm font-medium text-slate-700 flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank transfer</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-600">Bank name</Label><Input value={form.bankName} onChange={e => set("bankName", e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-xs text-slate-600">Account name</Label><Input value={form.accountName} onChange={e => set("accountName", e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-xs text-slate-600">Account number</Label><Input value={form.accountNumber} onChange={e => set("accountNumber", e.target.value)} className="mt-1.5 font-mono text-sm" /></div>
            <div><Label className="text-xs text-slate-600">Routing / sort</Label><Input value={form.routingNumber} onChange={e => set("routingNumber", e.target.value)} className="mt-1.5 font-mono text-sm" /></div>
            <div><Label className="text-xs text-slate-600">SWIFT / BIC</Label><Input value={form.swiftCode} onChange={e => set("swiftCode", e.target.value)} className="mt-1.5 font-mono text-sm" /></div>
            <div><Label className="text-xs text-slate-600">Currency</Label><Input value={form.bankCurrency} onChange={e => set("bankCurrency", e.target.value)} placeholder="USD" className="mt-1.5" /></div>
            <div className="col-span-2"><Label className="text-xs text-slate-600">Country</Label><Input value={form.bankCountry} onChange={e => set("bankCountry", e.target.value)} className="mt-1.5" /></div>
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs font-medium text-slate-600">Payment instructions (shown to user)</Label>
        <Textarea value={form.instructions} onChange={e => set("instructions", e.target.value)} placeholder="Send exact amount, then upload proof of payment..." rows={3} className="mt-1.5" />
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} data-testid="switch-method-active" />
        <div>
          <p className="text-sm font-medium text-slate-700">Active</p>
          <p className="text-xs text-slate-500">Visible to users at checkout</p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function userLabel(u: any) {
  if (!u) return "—";
  if (u.userType === "brand" && u.companyName) return u.companyName;
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown";
}

function userInitials(u: any) {
  if (!u) return "?";
  const a = (u.firstName?.[0] || u.email?.[0] || "?").toUpperCase();
  const b = (u.lastName?.[0] || "").toUpperCase();
  return (a + b).slice(0, 2);
}

function UserCell({ user }: { user: any }) {
  if (!user) return <span className="text-slate-400 text-sm">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar className="h-7 w-7 ring-1 ring-slate-200">
        <AvatarImage src={user.profileImageUrl} />
        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">{userInitials(user)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate" data-testid={`text-user-${user.id}`}>{userLabel(user)}</p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
      </div>
    </div>
  );
}

function fmtMoney(n: number, cur = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n || 0);
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_METHOD);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState("");
  const [txSourceFilter, setTxSourceFilter] = useState<string>("all");
  const [txStatusFilter, setTxStatusFilter] = useState<string>("all");
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const { data: methods = [], isLoading: methodsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payment-methods"] });
  const { data: toggles = [] } = useQuery<any[]>({ queryKey: ["/api/admin/payment-feature-toggles"] });
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ items: any[]; totals: any }>({
    queryKey: ["/api/admin/payments-unified"],
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/payment-methods", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setDialogOpen(false); toast({ title: "Payment method added" }); },
    onError: () => toast({ title: "Failed to add", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/payment-methods/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setDialogOpen(false); toast({ title: "Updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/payment-methods/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setDeleteConfirm(null); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });
  const toggleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/payment-feature-toggles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/payment-feature-toggles"] }),
  });

  // Review approve / reject endpoints per source
  function endpointFor(item: any, action: "approve" | "reject"): { method: "PATCH" | "PUT" | "POST"; url: string } | null {
    if (!item?.rawId) return null;
    if (item.source === "deposit") return { method: "PATCH", url: `/api/admin/payment-deposits/${item.rawId}/${action}` };
    if (item.source === "escrow") return { method: "PUT", url: `/api/admin/escrow-payments/${item.rawId}/${action}` };
    if (item.source === "subscription") return { method: "PATCH", url: `/api/admin/subscriptions/${item.rawId}/${action}` };
    if (item.source === "course_enrollment" && action === "approve") return { method: "POST", url: `/api/courses/enrollments/${item.rawId}/approve` };
    return null;
  }

  const reviewMutation = useMutation({
    mutationFn: async ({ item, action, notes }: { item: any; action: "approve" | "reject"; notes: string }) => {
      const ep = endpointFor(item, action);
      if (!ep) throw new Error("This payment type can't be reviewed here.");
      const res = await apiRequest(ep.method, ep.url, { adminNotes: notes, notes });
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payments-unified"] });
      toast({ title: vars.action === "approve" ? "Payment approved" : "Payment rejected" });
      setReviewItem(null); setReviewNotes(""); setReviewMessage("");
    },
    onError: (e: any) => toast({ title: "Review failed", description: e?.message || "Try again", variant: "destructive" }),
  });

  const messageMutation = useMutation({
    mutationFn: async ({ userId, content }: { userId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/message`, { content });
      return res.json();
    },
    onSuccess: () => { toast({ title: "Message sent" }); setReviewMessage(""); },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const openAdd = () => { setEditingMethod(null); setForm(EMPTY_METHOD); setDialogOpen(true); };
  const openEdit = (m: any) => { setEditingMethod(m); setForm({ ...EMPTY_METHOD, ...m }); setDialogOpen(true); };
  const handleSave = () => {
    if (!form.label || !form.type) return toast({ title: "Label and type are required", variant: "destructive" });
    if (editingMethod) updateMutation.mutate({ id: editingMethod.id, data: form });
    else createMutation.mutate(form);
  };
  const getToggle = (methodId: string, feature: string) => {
    const t = toggles.find((t: any) => t.paymentMethodId === methodId && t.feature === feature);
    return t ? t.isEnabled : true;
  };
  const handleToggle = (methodId: string, feature: string, val: boolean) =>
    toggleMutation.mutate({ paymentMethodId: methodId, feature, isEnabled: val });

  // Filtered transactions
  const filteredTx = useMemo(() => {
    const items = paymentsData?.items || [];
    const q = txSearch.trim().toLowerCase();
    return items.filter((t: any) => {
      if (txSourceFilter !== "all" && t.source !== txSourceFilter) return false;
      if (txStatusFilter !== "all" && t.status !== txStatusFilter) return false;
      if (!q) return true;
      const hay = [
        t.id, t.reference, t.description, t.method, t.kind,
        userLabel(t.fromUser), userLabel(t.toUser),
        t.fromUser?.email, t.toUser?.email,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [paymentsData, txSearch, txSourceFilter, txStatusFilter]);

  const totals = paymentsData?.totals || { count: 0, gross: 0, settled: 0, pending: 0, bySource: {} };

  if ((user as any)?.userType !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 text-center"><Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" /><p className="text-lg font-semibold">Admin access required</p></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight" style={{ letterSpacing: "-0.02em" }}>Payments</h1>
              <p className="text-sm text-slate-500 mt-1.5">Every payment across the platform — methods, transactions, and feature access — in one place.</p>
            </div>
            <Button onClick={openAdd} data-testid="button-add-payment-method" className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-9 px-4 text-sm font-medium">
              <Plus className="h-4 w-4" /> New method
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-transparent p-0 h-auto border-b border-slate-200 rounded-none w-full justify-start gap-4 overflow-x-auto flex-nowrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 data-[state=active]:border-slate-900 border-b-2 border-transparent rounded-none px-0 pb-3 text-sm font-medium text-slate-500 gap-2 whitespace-nowrap">
              <BarChart2 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 data-[state=active]:border-slate-900 border-b-2 border-transparent rounded-none px-0 pb-3 text-sm font-medium text-slate-500 gap-2 whitespace-nowrap">
              <Receipt className="h-4 w-4" /> Transactions
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 data-[state=active]:border-slate-900 border-b-2 border-transparent rounded-none px-0 pb-3 text-sm font-medium text-slate-500 gap-2 whitespace-nowrap">
              <ArrowDownToLine className="h-4 w-4" /> Payout Requests
            </TabsTrigger>
            <TabsTrigger value="methods" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 data-[state=active]:border-slate-900 border-b-2 border-transparent rounded-none px-0 pb-3 text-sm font-medium text-slate-500 gap-2 whitespace-nowrap">
              <CreditCard className="h-4 w-4" /> Payment methods
            </TabsTrigger>
            <TabsTrigger value="toggles" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-slate-900 data-[state=active]:border-slate-900 border-b-2 border-transparent rounded-none px-0 pb-3 text-sm font-medium text-slate-500 gap-2 whitespace-nowrap">
              <Settings className="h-4 w-4" /> Feature access
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Volume", value: fmtMoney(totals.gross), icon: DollarSign, color: "from-violet-500 to-purple-600", sub: `${totals.count} payments` },
                { label: "Settled", value: fmtMoney(totals.settled), icon: CheckCircle2, color: "from-emerald-500 to-teal-600", sub: "Released & confirmed" },
                { label: "Pending", value: fmtMoney(totals.pending), icon: Activity, color: "from-amber-400 to-orange-500", sub: "Awaiting confirmation" },
                { label: "Active Streams", value: Object.keys(totals.bySource || {}).length, icon: Layers, color: "from-blue-500 to-indigo-600", sub: "Payment sources" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm">
                  <div className={`bg-gradient-to-br ${s.color} p-4`}>
                    <s.icon className="h-6 w-6 text-white/80 mb-2" />
                    <p className="text-2xl font-black text-white tabular-nums">{s.value}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="font-semibold text-slate-700 text-sm">{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Receipt className="h-4 w-4 text-violet-600" />Revenue by Source</p>
                {Object.entries(totals.bySource || {}).length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No transaction data yet</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(totals.bySource || {}).map(([src, val]: [string, any]) => (
                      <div key={src} className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SOURCE_TONE[src] || "bg-gray-100 text-gray-700"}`}>{SOURCE_LABEL[src] || src}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                            style={{ width: `${Math.min(100, (val / (totals.gross || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-700 tabular-nums">{fmtMoney(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />Payment Methods Active</p>
                {(methods as any[]).length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No payment methods configured</p>
                ) : (
                  <div className="space-y-2.5">
                    {(methods as any[]).map((m: any) => {
                      const Icon = TYPE_ICONS[m.type] || CreditCard;
                      return (
                        <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.label}</p>
                            <p className="text-xs text-slate-400 uppercase">{m.type}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {m.isActive ? "Live" : "Off"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── TRANSACTIONS ─────────────────────────────────────────────────── */}
          <TabsContent value="transactions" className="space-y-6 mt-6">
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Gross volume", value: fmtMoney(totals.gross), icon: DollarSign, hint: `${totals.count} payments` },
                { label: "Settled", value: fmtMoney(totals.settled), icon: CheckCircle2, hint: "Released & completed" },
                { label: "Pending", value: fmtMoney(totals.pending), icon: TrendingUp, hint: "Awaiting confirmation" },
                { label: "Sources", value: Object.keys(totals.bySource || {}).length, icon: Layers, hint: "Active streams" },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
                    <s.icon className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <p className="text-xl font-semibold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.01em" }} data-testid={`stat-${s.label}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.hint}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  placeholder="Search by user, email, reference, description…"
                  className="pl-9 h-9 text-sm border-slate-200"
                  data-testid="input-tx-search"
                />
              </div>
              <Select value={txSourceFilter} onValueChange={setTxSourceFilter}>
                <SelectTrigger className="h-9 w-[160px] text-sm" data-testid="select-tx-source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {Object.keys(SOURCE_LABEL).map(s => <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
                <SelectTrigger className="h-9 w-[160px] text-sm" data-testid="select-tx-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {["completed", "released", "active", "paid", "approved", "funded", "delivered", "pending", "submitted", "disputed", "failed", "rejected", "cancelled", "refunded", "expired"].map(s =>
                    <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Type</th>
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">From</th>
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">To</th>
                      <th className="text-right px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Amount</th>
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Method</th>
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsLoading ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td colSpan={7} className="px-5 py-4"><div className="h-8 bg-slate-100 rounded animate-pulse" /></td>
                        </tr>
                      ))
                    ) : filteredTx.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-500">No transactions match these filters</p>
                          <p className="text-xs text-slate-400 mt-1">Try clearing filters or adjusting your search.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTx.map((t: any) => (
                        <tr
                          key={t.id}
                          className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors ${t.reviewable ? "cursor-pointer" : ""}`}
                          onClick={() => t.reviewable && (setReviewItem(t), setReviewNotes(""), setReviewMessage(""))}
                          data-testid={`row-tx-${t.id}`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_TONE[t.source] || "bg-slate-100 text-slate-700"}`}>
                                {SOURCE_LABEL[t.source] || t.source}
                              </span>
                              {t.kind && t.kind !== t.source && (
                                <span className="text-xs text-slate-500">{String(t.kind).replace(/_/g, " ")}</span>
                              )}
                            </div>
                            {t.reference && (
                              <p className="text-[11px] text-slate-400 font-mono mt-1 truncate max-w-[220px]" title={t.reference}>{t.reference}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5"><UserCell user={t.fromUser} /></td>
                          <td className="px-5 py-3.5">
                            {t.toUser ? <UserCell user={t.toUser} /> : (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <ArrowUpRight className="h-3.5 w-3.5" /><span className="text-xs">Platform</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <p className="font-semibold text-slate-900 tabular-nums">{fmtMoney(Number(t.amount), t.currency)}</p>
                            {t.fee > 0 && <p className="text-[11px] text-slate-400 tabular-nums">fee {fmtMoney(Number(t.fee), t.currency)}</p>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${STATUS_TONE[t.status] || "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                              {t.status || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5"><span className="text-xs text-slate-600">{t.method || "—"}</span></td>
                          <td className="px-5 py-3.5">
                            <p className="text-xs text-slate-600 tabular-nums">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "—"}</p>
                            <p className="text-[11px] text-slate-400 tabular-nums">{t.createdAt ? format(new Date(t.createdAt), "h:mm a") : ""}</p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredTx.length > 0 && (
                <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span>{filteredTx.length} of {totals.count} payments</span>
                  <span className="tabular-nums">Total: <span className="font-semibold text-slate-900">{fmtMoney(filteredTx.reduce((s, t) => s + Number(t.amount || 0), 0))}</span></span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── PAYOUT REQUESTS ─────────────────────────────────────────────── */}
          <TabsContent value="payouts" className="mt-6">
            <AdminPayoutsCenter />
          </TabsContent>

          {/* ── METHODS ──────────────────────────────────────────────────────── */}
          <TabsContent value="methods" className="mt-6">
            {methodsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="rounded-lg border border-slate-200 h-44 animate-pulse bg-slate-50" />)}
              </div>
            ) : methods.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
                <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">No payment methods yet</p>
                <p className="text-xs text-slate-500 mb-5">Add crypto wallets, Stripe, PayPal, Paystack, or bank transfers.</p>
                <Button onClick={openAdd} variant="outline" className="gap-2 h-9 text-sm"><Plus className="h-3.5 w-3.5" /> Add first method</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {methods.map((m: any) => {
                  const Icon = TYPE_ICONS[m.type] || CreditCard;
                  return (
                    <div key={m.id} data-testid={`card-payment-method-${m.id}`} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center"><Icon className="h-4 w-4 text-slate-700" /></div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{m.label}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">{m.type}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs ${m.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                          {m.isActive ? "Live" : "Off"}
                        </span>
                      </div>

                      {m.type === "crypto" && m.address && (
                        <div className="mb-4 rounded-md bg-slate-50 px-3 py-2 border border-slate-100">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{m.network} · {m.currency}</p>
                          <p className="text-xs font-mono text-slate-700 truncate">{m.address}</p>
                        </div>
                      )}
                      {m.type === "bank" && m.bankName && (
                        <div className="mb-4 rounded-md bg-slate-50 px-3 py-2 border border-slate-100">
                          <p className="text-xs text-slate-700 font-medium">{m.bankName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{m.accountName} · ••••{m.accountNumber?.slice(-4)}</p>
                        </div>
                      )}
                      {m.type === "paypal" && m.paypalEmail && (
                        <div className="mb-4 rounded-md bg-slate-50 px-3 py-2 border border-slate-100">
                          <p className="text-xs text-slate-700">{m.paypalEmail}</p>
                        </div>
                      )}
                      {(m.type === "stripe" || m.type === "paystack") && (
                        <div className="mb-4 rounded-md bg-slate-50 px-3 py-2 border border-slate-100 flex items-center gap-2">
                          <Lock className="h-3 w-3 text-slate-400" />
                          <p className="text-xs font-mono text-slate-700 truncate">
                            {(m.type === "stripe" ? m.stripePublicKey : m.paystackPublicKey) || "Keys configured"}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={m.isActive}
                            onCheckedChange={v => updateMutation.mutate({ id: m.id, data: { isActive: v } })}
                            data-testid={`switch-active-${m.id}`}
                          />
                          <span className="text-xs text-slate-500">{m.isActive ? "Enabled" : "Disabled"}</span>
                        </div>
                        <div className="flex gap-0.5">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900" onClick={() => openEdit(m)} data-testid={`button-edit-${m.id}`}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600" onClick={() => setDeleteConfirm(m.id)} data-testid={`button-delete-${m.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── TOGGLES ──────────────────────────────────────────────────────── */}
          <TabsContent value="toggles" className="mt-6 space-y-4">
            <p className="text-sm text-slate-500">Control which payment methods are available for each platform feature. A method must also be Live to appear anywhere.</p>
            {methods.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                <Settings className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Add payment methods first to configure feature access.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide min-w-[200px]">Method</th>
                      {FEATURES.map(f => (
                        <th key={f.key} className="px-4 py-3 text-center min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <f.icon className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-[10px] uppercase tracking-wide text-slate-500">{f.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {methods.map((m: any) => {
                      const Icon = TYPE_ICONS[m.type] || CreditCard;
                      return (
                        <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-800">{m.label}</p>
                                {!m.isActive && <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 mt-0.5">Inactive</Badge>}
                              </div>
                            </div>
                          </td>
                          {FEATURES.map(f => (
                            <td key={f.key} className="px-4 py-3.5 text-center">
                              <Switch
                                checked={getToggle(m.id, f.key)}
                                onCheckedChange={v => handleToggle(m.id, f.key, v)}
                                disabled={!m.isActive}
                                data-testid={`toggle-${m.id}-${f.key}`}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex gap-3">
              <AlertCircle className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                When a method is toggled <strong className="text-slate-800">on</strong> for a feature, it appears at checkout for that feature. Toggling off hides it without deleting it.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg font-semibold tracking-tight">
              {editingMethod ? "Edit payment method" : "New payment method"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2"><MethodForm form={form} setForm={setForm} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-9 text-sm">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm"
              data-testid="button-save-method"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving…" : editingMethod ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete payment method?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">This permanently removes the method and all its feature toggles. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="h-9 text-sm">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending} className="h-9 text-sm">
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Payment Review Drawer ────────────────────────────────────────── */}
      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
          {reviewItem && (
            <>
              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SOURCE_TONE[reviewItem.source] || "bg-slate-100 text-slate-700"}`}>
                      {SOURCE_LABEL[reviewItem.source] || reviewItem.source}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${STATUS_TONE[reviewItem.status] || "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                      {reviewItem.status || "—"}
                    </span>
                  </div>
                  <DialogTitle className="text-lg font-semibold text-slate-900 mt-1.5">
                    {fmtMoney(Number(reviewItem.amount), reviewItem.currency)} payment review
                  </DialogTitle>
                  <p className="text-xs text-slate-500 mt-0.5">{reviewItem.description}</p>
                </div>
                <button onClick={() => setReviewItem(null)} className="p-1 hover:bg-slate-200 rounded" aria-label="Close">
                  <CloseIcon className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-0 max-h-[70vh] overflow-y-auto">
                {/* Left: details + proof */}
                <div className="p-6 space-y-4 border-r border-slate-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Method</p>
                      <p className="text-slate-900 font-medium">{reviewItem.method || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Date</p>
                      <p className="text-slate-900 font-medium tabular-nums">
                        {reviewItem.createdAt ? format(new Date(reviewItem.createdAt), "MMM d, yyyy h:mm a") : "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reference</p>
                      <p className="text-slate-700 font-mono text-xs break-all">{reviewItem.reference || "—"}</p>
                    </div>
                    {reviewItem.adminNotes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">User note</p>
                        <p className="text-slate-700 text-sm whitespace-pre-wrap">{reviewItem.adminNotes}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Payment proof</p>
                    {reviewItem.proofImageUrl ? (
                      <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                        <ZoomableImage
                          src={reviewItem.proofImageUrl}
                          alt="Payment proof"
                          caption="Click to zoom, pan, rotate, or download"
                          className="w-full h-auto max-h-72 object-contain bg-white"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                        <Receipt className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No image proof attached</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">Admin notes (optional)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Reason for approval / rejection (saved on the record)"
                      rows={3}
                      className="mt-1.5"
                      data-testid="input-review-notes"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {reviewItem.source === "course_enrollment" ? (
                      <Button
                        onClick={() => reviewMutation.mutate({ item: reviewItem, action: "approve", notes: reviewNotes })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                        data-testid="button-review-approve"
                      >
                        <KeyRound className="h-4 w-4 mr-1.5" />
                        {reviewMutation.isPending ? "Granting…" : "Grant Access"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => reviewMutation.mutate({ item: reviewItem, action: "approve", notes: reviewNotes })}
                          disabled={reviewMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                          data-testid="button-review-approve"
                        >
                          <ThumbsUp className="h-4 w-4 mr-1.5" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => reviewMutation.mutate({ item: reviewItem, action: "reject", notes: reviewNotes })}
                          disabled={reviewMutation.isPending}
                          variant="destructive"
                          className="flex-1 h-9"
                          data-testid="button-review-reject"
                        >
                          <ThumbsDown className="h-4 w-4 mr-1.5" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: parties + message */}
                <div className="p-6 space-y-4 bg-slate-50/30">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">From</p>
                    <UserCell user={reviewItem.fromUser} />
                  </div>
                  {reviewItem.toUser && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">To</p>
                      <UserCell user={reviewItem.toUser} />
                    </div>
                  )}
                  {reviewItem.approvedBy && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Reviewed by</p>
                      <UserCell user={reviewItem.approvedBy} />
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Message the user</p>
                    </div>
                    <Textarea
                      value={reviewMessage}
                      onChange={(e) => setReviewMessage(e.target.value)}
                      placeholder={`Send ${reviewItem.fromUser?.firstName || "the user"} a quick note about this payment…`}
                      rows={4}
                      data-testid="input-review-message"
                    />
                    <Button
                      size="sm"
                      onClick={() => reviewItem.fromUser?.id && messageMutation.mutate({ userId: reviewItem.fromUser.id, content: reviewMessage })}
                      disabled={messageMutation.isPending || !reviewMessage.trim() || !reviewItem.fromUser?.id}
                      className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white h-9"
                      data-testid="button-review-send-message"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      {messageMutation.isPending ? "Sending…" : "Send message"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
