import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WhatsAppConfirmDialog } from "@/components/ui/whatsapp-confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CheckCircle2, Crown, Sparkles, Zap, Clock, Upload, AlertTriangle,
  Lock, ArrowRight, Star, Shield, BarChart3, Users, Megaphone,
  MessageSquare, Target, TrendingUp, Gift, X, Check,
  Copy, Calendar, RefreshCw, Wallet
} from "lucide-react";

const INFLUENCER_PLANS = {
  free: {
    name: "Explorer",
    price: 0,
    badge: null,
    color: "from-gray-500 to-gray-600",
    borderColor: "border-gray-200",
    bgColor: "bg-gray-50",
    features: [
      { label: "Browse campaigns", included: true },
      { label: "Apply to 3 campaigns/month", included: true },
      { label: "Basic analytics", included: true },
      { label: "Community access", included: true },
      { label: "Advanced analytics", included: false },
      { label: "Unlimited campaign applications", included: false },
      { label: "Direct brand messaging", included: false },
      { label: "Referral bonus multiplier (2×)", included: false },
      { label: "Priority campaign discovery", included: false },
      { label: "Verified badge", included: false },
    ],
  },
  premium: {
    name: "Influencer Premium",
    monthly: 7,
    yearly: 71.4,
    badge: "Most Popular",
    color: "from-purple-600 to-indigo-600",
    borderColor: "border-purple-300",
    bgColor: "bg-purple-50/50",
    icon: <Sparkles className="w-5 h-5" />,
    features: [
      { label: "Everything in Explorer", included: true },
      { label: "Advanced analytics dashboard", included: true },
      { label: "Unlimited campaign applications", included: true },
      { label: "Direct brand messaging", included: true },
      { label: "Referral bonus multiplier (2×)", included: true },
      { label: "Priority campaign discovery", included: true },
      { label: "Verified influencer badge", included: true },
      { label: "Monthly payout requests", included: true },
      { label: "Early access to new features", included: true },
      { label: "Dedicated support channel", included: true },
    ],
  },
};

const BRAND_PLANS = {
  free: {
    name: "Starter",
    price: 0,
    badge: null,
    color: "from-gray-500 to-gray-600",
    borderColor: "border-gray-200",
    bgColor: "bg-gray-50",
    features: [
      { label: "Post 1 campaign/month", included: true },
      { label: "Browse influencer profiles", included: true },
      { label: "Basic campaign metrics", included: true },
      { label: "Community forum access", included: true },
      { label: "Unlimited campaign creation", included: false },
      { label: "Advanced campaign analytics", included: false },
      { label: "Featured campaign placement", included: false },
      { label: "Bulk influencer outreach", included: false },
      { label: "Priority influencer discovery", included: false },
      { label: "Verified brand badge", included: false },
    ],
  },
  pro: {
    name: "Brand Pro",
    monthly: 24,
    yearly: 244.8,
    badge: "Best Value",
    color: "from-amber-500 to-orange-500",
    borderColor: "border-amber-300",
    bgColor: "bg-amber-50/50",
    icon: <Crown className="w-5 h-5" />,
    features: [
      { label: "Everything in Starter", included: true },
      { label: "Unlimited campaign creation", included: true },
      { label: "Advanced campaign analytics", included: true },
      { label: "Featured campaign placement", included: true },
      { label: "Bulk influencer outreach", included: true },
      { label: "Priority influencer discovery", included: true },
      { label: "Verified brand badge", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Custom campaign branding", included: true },
      { label: "API access", included: true },
    ],
  },
};

const TESTIMONIALS = [
  { name: "Alex K.", role: "Lifestyle Influencer", quote: "Getting Premium tripled my campaign earnings in just two months. The priority discovery is a game changer.", avatar: "AK" },
  { name: "Sarah M.", role: "Brand Manager", quote: "Brand Pro gave us full control. The analytics alone justified the investment after our first campaign.", avatar: "SM" },
  { name: "Jordan T.", role: "Content Creator", quote: "The 2× referral multiplier is insane. I made back my subscription cost in the first week.", avatar: "JT" },
];

const PERIOD_OPTIONS = [
  { key: "3day", label: "3-Day Trial", days: 3, badge: "Short Trial", icon: <RefreshCw className="w-3.5 h-3.5" />, description: "Try premium for 3 days, renewable" },
  { key: "5day", label: "5-Day Trial", days: 5, badge: "Popular Trial", icon: <RefreshCw className="w-3.5 h-3.5" />, description: "5-day renewable access" },
  { key: "monthly", label: "Monthly", days: 30, badge: null, icon: <Calendar className="w-3.5 h-3.5" />, description: "30-day full access" },
  { key: "yearly", label: "Yearly", days: 365, badge: "Best Value", icon: <Crown className="w-3.5 h-3.5" />, description: "365-day access — save 15%" },
];

const CREATOR_PRICES: Record<string, number> = { "3day": 2, "5day": 3, "monthly": 7, "yearly": 71.4 };
const BRAND_PRICES: Record<string, number> = { "3day": 6, "5day": 9, "monthly": 24, "yearly": 244.8 };

function MethodIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { crypto: "🪙", bank: "🏦", paypal: "🅿️", paystack: "🟢", stripe: "💳", manual: "✅" };
  const colors: Record<string, string> = {
    crypto: "from-orange-400 to-amber-500", bank: "from-blue-500 to-indigo-600",
    paypal: "from-sky-400 to-blue-500", paystack: "from-green-400 to-emerald-500",
    stripe: "from-purple-500 to-violet-600", manual: "from-slate-700 to-slate-950",
  };
  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[type] || "from-gray-400 to-gray-500"} flex items-center justify-center text-lg flex-shrink-0 shadow-sm`}>
      {icons[type] || "💳"}
    </div>
  );
}

function PaymentMethodDetails({ method, amount }: { method: any; amount: number }) {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (method.type === "crypto") return (
    <div className="bg-gray-900 rounded-xl p-4 mt-3">
      <p className="text-gray-400 text-xs mb-1">Send exactly <span className="text-white font-bold">${amount.toFixed(2)}</span>{method.currency ? ` ${method.currency}` : ""} to:</p>
      {method.network && <p className="text-gray-500 text-xs mb-2">Network: <span className="text-gray-300">{method.network}</span></p>}
      {method.address && (
        <div className="flex items-center gap-2 mt-1">
          <code className="text-green-400 font-mono text-xs flex-1 break-all">{method.address}</code>
          <button onClick={() => copy(method.address)} className={`p-1.5 rounded-lg ${copied ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"} text-white`}>
            {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      )}
      {!method.address && <p className="text-yellow-400 text-xs">⚠️ Wallet address not configured. Contact support.</p>}
      {method.instructions && <p className="text-amber-300 text-xs mt-2">{method.instructions}</p>}
    </div>
  );
  if (method.type === "bank") return (
    <div className="bg-blue-950 rounded-xl p-4 mt-3 space-y-1.5">
      <p className="text-blue-200 text-xs font-semibold">Bank Transfer — Send ${amount.toFixed(2)}</p>
      {method.bankName && <div className="flex justify-between text-xs"><span className="text-gray-400">Bank</span><span className="text-white">{method.bankName}</span></div>}
      {method.accountName && <div className="flex justify-between text-xs"><span className="text-gray-400">Account Name</span><span className="text-white">{method.accountName}</span></div>}
      {method.accountNumber && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Account No.</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-mono">{method.accountNumber}</span>
            <button onClick={() => copy(method.accountNumber)} className="p-1 rounded bg-blue-900 text-blue-300"><Copy className="h-2.5 w-2.5" /></button>
          </div>
        </div>
      )}
      {method.instructions && <p className="text-amber-300 text-xs mt-1">{method.instructions}</p>}
    </div>
  );
  if (method.type === "paypal") return (
    <div className="bg-sky-900 rounded-xl p-4 mt-3">
      <p className="text-sky-200 text-xs mb-1">Send ${amount.toFixed(2)} via PayPal to:</p>
      {method.paypalEmail && (
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{method.paypalEmail}</span>
          <button onClick={() => copy(method.paypalEmail)} className="p-1 rounded bg-sky-800 text-sky-300"><Copy className="h-3 w-3" /></button>
        </div>
      )}
      <p className="text-sky-300 text-xs mt-1">Use "Friends & Family" to avoid fees.</p>
      {method.instructions && <p className="text-amber-300 text-xs mt-1">{method.instructions}</p>}
    </div>
  );
  if (method.type === "manual") return (
    <div className="bg-slate-900 rounded-xl p-4 mt-3">
      <p className="text-white text-xs font-semibold mb-1">Manual Payment Review</p>
      <p className="text-slate-300 text-xs">Submit your payment reference after sending. Admin will verify it.</p>
      {method.instructions && <p className="text-amber-300 text-xs mt-2">{method.instructions}</p>}
    </div>
  );
  return (
    <div className="bg-purple-900 rounded-xl p-4 mt-3 text-center">
      <p className="text-white font-semibold text-sm mb-1">Pay ${amount.toFixed(2)} via {method.type === "paystack" ? "Paystack" : "Stripe"}</p>
      <p className="text-purple-200 text-xs">You'll be redirected to complete payment securely.</p>
      {method.instructions && <p className="text-amber-300 text-xs mt-1">{method.instructions}</p>}
    </div>
  );
}

function PlanFeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <li className={`flex items-center gap-2.5 text-sm ${included ? "text-gray-700" : "text-gray-400"}`}>
      {included ? (
        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0">
          <X className="w-2.5 h-2.5 text-gray-300" />
        </div>
      )}
      {label}
    </li>
  );
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<"3day" | "5day" | "monthly" | "yearly">("monthly");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [txRef, setTxRef] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [waConfirm, setWaConfirm] = useState<{ open: boolean; title: string; summary: string; lines: string[] }>({
    open: false,
    title: "",
    summary: "",
    lines: [],
  });
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  const userType = (user as any)?.userType as "influencer" | "brand" | "admin";
  const isBrand = userType === "brand";

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscriptions/my"],
    enabled: !!user,
  });

  const { data: paymentMethodsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "subscriptions"],
    queryFn: () => fetch("/api/payment-methods?feature=subscriptions", { credentials: "include" }).then(r => r.json()),
    enabled: dialogOpen,
  });

  const paymentMethods = paymentMethodsRaw.length > 0 ? paymentMethodsRaw : [
    { id: "fallback", type: "manual", label: "Manual Payment Review", instructions: "Contact admin for payment details." },
  ];
  const selectedMethod = paymentMethods.find((m: any) => m.id === selectedMethodId) || paymentMethods[0];

  const prices = isBrand ? BRAND_PRICES : CREATOR_PRICES;
  const currentPrice = prices[period] || 0;

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const planKey = isBrand
        ? (period === "3day" ? "brand_3day" : period === "5day" ? "brand_5day" : period === "yearly" ? "brand_yearly" : "brand_monthly")
        : (period === "3day" ? "creator_3day" : period === "5day" ? "creator_5day" : period === "yearly" ? "creator_yearly" : "creator_monthly");
      const form = new FormData();
      form.append("plan", planKey);
      form.append("network", selectedMethod?.network || selectedMethod?.type || "manual");
      form.append("transactionHash", txRef);
      form.append("paymentMethodLabel", selectedMethod?.label || "");
      if (proofFile) form.append("paymentProof", proofFile);
      const res = await fetch("/api/subscriptions", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/my"] });
      toast({ title: "Subscription submitted!", description: "Our team will verify your payment within 24 hours." });
      setDialogOpen(false);
      const submittedTxRef = txRef;
      const submittedMethod = selectedMethod;
      const submittedAmount = currentPrice;
      const submittedPlan = isBrand ? "Brand Pro" : "Influencer Premium";
      const periodLabel = period === "yearly" ? "Yearly" : period === "monthly" ? "Monthly" : period === "5day" ? "5-day" : "3-day";
      setProofFile(null);
      setTxRef("");
      setWaConfirm({
        open: true,
        title: "Subscription payment submitted",
        summary: "Forward this confirmation so admin can fast-track verification.",
        lines: [
          `Action: Subscription payment submitted`,
          `Plan: ${submittedPlan} (${periodLabel})`,
          `Amount: $${submittedAmount}`,
          `Payment method: ${submittedMethod?.label || submittedMethod?.network || "Manual"}`,
          `Transaction reference: ${submittedTxRef || "—"}`,
          `Subscriber: ${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim(),
          `Email: ${(user as any)?.email || "—"}`,
          `User ID: ${(user as any)?.id || "—"}`,
        ],
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isActive = subscription?.status === "active";
  const isPending = subscription?.status === "pending";
  const isExpired = subscription?.status === "expired";

  const plans = isBrand ? BRAND_PLANS : INFLUENCER_PLANS;
  const paidPlan = isBrand ? plans.pro : plans.premium;
  const gradientFrom = isBrand ? "from-amber-500" : "from-purple-600";
  const gradientTo = isBrand ? "to-orange-500" : "to-indigo-600";
  const accentText = isBrand ? "text-amber-600" : "text-purple-600";
  const accentBg = isBrand ? "bg-amber-500" : "bg-purple-600";

  const monthlyPrice = (paidPlan as any).monthly;
  const yearlyPrice = (paidPlan as any).yearly;
  const savings = Math.round(monthlyPrice * 12 - yearlyPrice);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white`}
        style={{
          backgroundImage: `url("https://images.unsplash.com/${isBrand ? "photo-1556761175-b413da4baf72" : "photo-1551836022-d5d88e9218df"}?auto=format&fit=crop&w=2000&q=85")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom}/85 ${gradientTo}/80 mix-blend-multiply`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full border border-white/30 backdrop-blur-sm mb-6">
            {isBrand ? <Crown className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="text-sm font-semibold uppercase tracking-widest">Upgrade Your Account</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
            {isBrand ? "Brand Pro" : "Influencer Premium"}
          </h1>
          <p className="text-white/80 max-w-xl mx-auto text-lg mb-8">
            {isBrand
              ? "Unlock unlimited campaigns, featured placement, and advanced analytics to scale your brand's reach."
              : "Unlock unlimited campaign access, verified status, and powerful tools to grow your influence."}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              isBrand ? "Unlimited Campaigns" : "Unlimited Applications",
              "Advanced Analytics",
              "Verified Badge",
              isBrand ? "Bulk Outreach" : "2× Referral Bonus",
            ].map(f => (
              <div key={f} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-sm font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Status Banner */}
        {isActive && (
          <Card className="mb-8 border-green-300 bg-green-50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
              <div className="flex-1">
                <div className="font-bold text-green-900 text-lg">You're a Premium member!</div>
                <div className="text-sm text-green-700">
                  Plan: <strong>{(subscription?.plan || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</strong>
                  {subscription?.periodDays && <> · <strong>{subscription.periodDays}-day</strong> access</>}
                  {" "}· Expires <strong>{subscription?.endDate ? new Date(subscription.endDate).toLocaleString() : "—"}</strong>
                </div>
              </div>
              <Badge className="bg-green-200 text-green-900 text-xs">Active ✓</Badge>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <Card className="mb-8 border-amber-300 bg-amber-50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl"><Clock className="w-6 h-6 text-amber-600" /></div>
              <div>
                <div className="font-bold text-amber-900">Payment Under Review</div>
                <div className="text-sm text-amber-700">We'll activate your account within 24 hours after verification. Thank you for your patience!</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired banner */}
        {isExpired && (
          <Card className="mb-8 border-red-300 bg-red-50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
              <div>
                <div className="font-bold text-red-900 text-lg">Your subscription has expired</div>
                <div className="text-sm text-red-700">Your premium access ended. Renew below to restore all features.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period selector */}
        {!isActive && !isPending && (
          <div className="mb-10">
            <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Select Your Access Period</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key as any)}
                  data-testid={`period-${opt.key}`}
                  className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all text-center ${
                    period === opt.key
                      ? `border-current bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-lg`
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  {opt.badge && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      period === opt.key ? "bg-white/30 text-white" : "bg-green-100 text-green-700"
                    }`}>{opt.badge}</span>
                  )}
                  <div className="mt-1">{opt.icon}</div>
                  <span className="font-bold text-sm">{opt.label}</span>
                  <span className={`text-xs ${period === opt.key ? "text-white/80" : "text-gray-500"}`}>{opt.description}</span>
                  <span className={`font-black text-lg mt-1`}>${isBrand ? BRAND_PRICES[opt.key] : CREATOR_PRICES[opt.key]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan comparison */}
        {!isActive && !isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Free Plan */}
            <Card className="border-2 border-gray-200 bg-white shadow-sm">
              <CardContent className="p-7">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{plans.free.name}</span>
                  </div>
                  <div className="text-3xl font-black text-gray-900">Free</div>
                  <div className="text-sm text-gray-500 mt-1">Get started at no cost</div>
                </div>
                <ul className="space-y-2.5">
                  {plans.free.features.map(f => <PlanFeatureRow key={f.label} {...f} />)}
                </ul>
                <Button variant="outline" className="w-full mt-7 border-gray-300 text-gray-600" disabled>
                  Current Free Plan
                </Button>
              </CardContent>
            </Card>

            {/* Paid Plan */}
            <Card className={`border-2 ${(paidPlan as any).borderColor} bg-white shadow-lg relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
              {(paidPlan as any).badge && (
                <div className={`absolute top-4 right-4 px-3 py-1 bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white text-xs font-bold rounded-full`}>
                  {(paidPlan as any).badge}
                </div>
              )}
              <CardContent className="p-7">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-lg flex items-center justify-center text-white`}>
                      {(paidPlan as any).icon}
                    </div>
                    <span className={`font-bold text-lg ${accentText}`}>{(paidPlan as any).name}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-4xl font-black text-gray-900">
                      ${currentPrice.toFixed(2)}
                    </div>
                    <div className="text-gray-500 mb-1">/ {PERIOD_OPTIONS.find(p => p.key === period)?.days} days</div>
                  </div>
                  {period === "yearly" && (
                    <div className="text-sm text-gray-500 mt-1">
                      <span className="text-green-600 font-semibold">Save ${savings} vs monthly</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {(paidPlan as any).features.map((f: any) => <PlanFeatureRow key={f.label} {...f} />)}
                </ul>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className={`relative w-full mt-7 bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white font-bold py-6 text-base hover:opacity-90 gap-2 overflow-hidden ${isBrand ? "btn-glow-amber" : "btn-glow-purple"}`}
                      data-testid="subscribe-btn"
                    >
                      <span className="upgrade-shimmer absolute inset-0 pointer-events-none" />
                      <span className="relative z-10 flex items-center gap-2">
                        {(paidPlan as any).icon} Get {(paidPlan as any).name} <ArrowRight className="w-4 h-4 ml-auto" />
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {isBrand ? <Crown className="w-5 h-5 text-amber-500" /> : <Sparkles className="w-5 h-5 text-purple-500" />}
                        Complete Your Subscription
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                      {/* Price + Period summary */}
                      <div className={`p-4 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-lg">{(paidPlan as any).name}</p>
                            <p className="text-white/80 text-sm capitalize">
                              {PERIOD_OPTIONS.find(p => p.key === period)?.label} access
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-black">${currentPrice.toFixed(2)}</p>
                            <p className="text-white/80 text-xs">
                              {PERIOD_OPTIONS.find(p => p.key === period)?.days} days
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Payment method selection */}
                      <div>
                        <Label className="font-semibold mb-3 block flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Select Payment Method
                        </Label>
                        <div className="space-y-2">
                          {paymentMethods.map((m: any) => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedMethodId(m.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                (selectedMethodId === m.id || (!selectedMethodId && paymentMethods[0]?.id === m.id))
                                  ? `border-current ${accentText} bg-gray-50 shadow-sm`
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              data-testid={`payment-method-${m.id}`}
                            >
                              <MethodIcon type={m.type} />
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-gray-900">{m.label}</p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {m.type === "crypto" ? `${m.network || ""} · ${m.currency || "Crypto"}` :
                                   m.type === "bank" ? `${m.bankName || "Bank Transfer"}` :
                                   m.type === "paypal" ? "PayPal Transfer" :
                                   m.type === "manual" ? "Admin-reviewed payment" :
                                   m.type === "paystack" ? "Paystack Gateway" : "Stripe Gateway"}
                                </p>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                (selectedMethodId === m.id || (!selectedMethodId && paymentMethods[0]?.id === m.id))
                                  ? "border-current bg-current" : "border-gray-300"
                              }`} />
                            </button>
                          ))}
                        </div>

                        {/* Payment details */}
                        {selectedMethod && <PaymentMethodDetails method={selectedMethod} amount={currentPrice} />}
                      </div>

                      {/* Transaction reference */}
                      <div>
                        <Label className="font-semibold text-sm">Transaction Reference / ID</Label>
                        <Input
                          value={txRef}
                          onChange={e => setTxRef(e.target.value)}
                          placeholder="Enter transaction ID, hash, or reference..."
                          className="mt-1.5 font-mono text-sm"
                          data-testid="input-tx-ref"
                        />
                      </div>

                      {/* Proof upload */}
                      <div>
                        <Label className="font-semibold text-sm">Payment Screenshot *</Label>
                        <div
                          className="mt-1.5 border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-colors"
                          onClick={() => document.getElementById("proof-input")?.click()}
                          data-testid="upload-proof-area"
                        >
                          {proofFile ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <p className="text-sm text-green-600 font-medium">{proofFile.name}</p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                              <p className="text-sm text-gray-500">Click to upload payment proof</p>
                              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                            </>
                          )}
                          <input id="proof-input" type="file" accept="image/*" className="hidden"
                            onChange={e => setProofFile(e.target.files?.[0] || null)} />
                        </div>
                      </div>

                      <Button
                        onClick={() => subscribeMutation.mutate()}
                        disabled={!proofFile || subscribeMutation.isPending}
                        className={`w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white font-bold py-5`}
                        data-testid="confirm-subscribe-btn"
                      >
                        {subscribeMutation.isPending ? "Submitting..." : `Submit — $${currentPrice.toFixed(2)}`}
                      </Button>
                      <p className="text-center text-xs text-gray-400">Reviewed and activated within 24 hours</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Testimonials */}
        {!isActive && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">What members say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TESTIMONIALS.map(t => (
                <Card key={t.name} className="border shadow-sm bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <p className="text-sm text-gray-600 mb-4 italic">"{t.quote}"</p>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white text-xs font-bold flex items-center justify-center`}>
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-xl">Frequently Asked Questions</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {[
              { q: "How long does activation take?", a: "Our team verifies payments within 24 hours. You'll receive a notification once your account is activated." },
              { q: "Can I cancel anytime?", a: "Yes, you can cancel at any time. Your premium benefits remain active until the end of your billing period." },
              { q: "What payment methods do you accept?", a: "We accept all payment methods configured by our admin team — including crypto (USDT, Pi Network, etc.), bank transfer, PayPal, and more. All options will appear at checkout." },
              { q: "Is there a free trial?", a: "New users get access to core features for free. Upgrade to unlock all premium benefits and remove limitations." },
              { q: "Can I switch from monthly to yearly?", a: "Yes, contact support and we'll help you switch billing cycles and apply any credits." },
            ].map(({ q, a }) => (
              <div key={q} className="border-b last:border-b-0 pb-5 last:pb-0">
                <div className="font-semibold text-gray-900 mb-1.5">{q}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{a}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <WhatsAppConfirmDialog
        open={waConfirm.open}
        onOpenChange={(open) => setWaConfirm((prev) => ({ ...prev, open }))}
        title={waConfirm.title}
        summary={waConfirm.summary}
        lines={waConfirm.lines}
      />

      <Footer />
    </div>
  );
}
