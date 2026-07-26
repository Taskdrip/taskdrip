import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, Copy, CheckCircle, AlertCircle, Package,
  ArrowLeft, Lock, Zap, ChevronRight, Upload, Star,
  PartyPopper, Download, Building2, Wallet,
  Eye, EyeOff, LogIn, UserPlus, ShoppingBag, MessageCircle, Receipt,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { SOCIALS } from "@/config/socials";
import type { ShopProduct } from "@shared/schema";

type ServiceAddon = { id: string; title: string; description: string; price: number };

function getYouTubeEmbed(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

type Step = "summary" | "payment" | "confirm" | "success";

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { key: "summary", label: "Review" },
    { key: "payment", label: "Payment" },
    { key: "confirm", label: "Confirm" },
    { key: "success", label: "Done" },
  ];
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex items-center gap-2 ${i <= idx ? "text-violet-700" : "text-gray-400"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < idx ? "bg-violet-600 text-white" :
              i === idx ? "bg-violet-600 text-white ring-4 ring-violet-100" :
              "bg-gray-100 text-gray-400"
            }`}>
              {i < idx ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i <= idx ? "text-violet-700" : "text-gray-400"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 sm:w-16 h-0.5 mx-1 transition-all ${i < idx ? "bg-violet-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ProofUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpload(data.url);
      setUploaded(true);
      toast({ title: "Screenshot uploaded!" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${uploaded ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-violet-400 hover:bg-violet-50"}`}
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
    >
      {uploaded ? (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Screenshot uploaded!</span>
        </div>
      ) : (
        <>
          <Upload className="h-5 w-5 mx-auto mb-1 text-gray-300" />
          <p className="text-sm text-gray-500">{uploading ? "Uploading..." : "Upload payment screenshot"}</p>
          <p className="text-xs text-gray-400 mt-0.5">Click or drag image here</p>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

function MethodIcon({ method }: { method: any }) {
  const typeIcons: Record<string, string> = {
    crypto: "🪙", bank: "🏦", paypal: "🅿️", paystack: "🟢", stripe: "💳", manual: "✅",
  };
  const typeColors: Record<string, string> = {
    crypto: "from-orange-400 to-amber-500",
    bank: "from-blue-500 to-indigo-600",
    paypal: "from-sky-400 to-blue-500",
    paystack: "from-green-400 to-emerald-500",
    stripe: "from-purple-500 to-violet-600",
    manual: "from-slate-700 to-slate-950",
  };
  return (
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeColors[method.type] || "from-gray-400 to-gray-500"} flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
      {typeIcons[method.type] || "💳"}
    </div>
  );
}

function MethodDetails({ method, amount }: { method: any; amount: string }) {
  const [copied, setCopied] = useState(false);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (method.type === 'manual') {
    return (
      <div className="bg-slate-950 rounded-2xl p-5 mt-4">
        <p className="text-white font-semibold mb-1">Manual payment review</p>
        <p className="text-slate-300 text-xs">Submit your payment reference, receipt, or transfer note below. The admin will verify it before delivery.</p>
        {method.instructions && <p className="text-amber-300 text-xs mt-3">{method.instructions}</p>}
      </div>
    );
  }

  if (method.type === 'crypto') {
    return (
      <div className="bg-gray-900 rounded-2xl p-5 mt-4">
        <p className="text-gray-400 text-xs mb-1">
          Send exactly <span className="text-white font-bold">${amount}</span>{method.currency ? ` ${method.currency}` : ""} to:
        </p>
        {method.network && (
          <p className="text-gray-500 text-xs mb-2">Network: <span className="text-gray-300">{method.network}</span></p>
        )}
        {method.address && (
          <div className="flex items-center gap-3 mt-2">
            <code className="text-green-400 font-mono text-sm flex-1 break-all leading-relaxed">{method.address}</code>
            <button
              onClick={() => copyText(method.address)}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${copied ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}
        {method.instructions && (
          <div className="mt-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs">{method.instructions}</p>
          </div>
        )}
        {!method.address && (
          <p className="text-yellow-400 text-xs mt-2">⚠️ Admin wallet address not configured yet. Contact support.</p>
        )}
      </div>
    );
  }

  if (method.type === 'bank') {
    const BankRow = ({ label, value, mono = false, copyable = false }: { label: string; value: string; mono?: boolean; copyable?: boolean }) => (
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-0.5 xs:gap-2 text-sm py-1">
        <span className="text-gray-400 flex-shrink-0">{label}</span>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-white ${mono ? "font-mono" : "font-medium"} break-all`}>{value}</span>
          {copyable && (
            <button onClick={() => copyText(value)} className="flex-shrink-0 p-1 rounded bg-blue-900 text-blue-300 hover:bg-blue-800">
              {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    );
    return (
      <div className="bg-blue-950 rounded-2xl p-5 mt-4 space-y-1">
        <p className="text-blue-200 text-xs font-semibold mb-3">Bank Transfer Details — Send ${amount}</p>
        {method.bankName && <BankRow label="Bank" value={method.bankName} />}
        {method.accountName && <BankRow label="Account Name" value={method.accountName} />}
        {method.accountNumber && <BankRow label="Account No." value={method.accountNumber} mono copyable />}
        {method.bankCurrency && <BankRow label="Currency" value={method.bankCurrency} />}
        {method.swiftCode && <BankRow label="SWIFT" value={method.swiftCode} mono />}
        {method.routingNumber && <BankRow label="Routing" value={method.routingNumber} mono />}
        {method.bankCountry && <BankRow label="Country" value={method.bankCountry} />}
        {method.instructions && <p className="text-amber-300 text-xs mt-2 pt-2 border-t border-blue-900">{method.instructions}</p>}
      </div>
    );
  }

  if (method.type === 'paypal') {
    return (
      <div className="bg-sky-900 rounded-2xl p-5 mt-4">
        <p className="text-sky-200 text-xs mb-2">Send ${amount} via PayPal to:</p>
        {method.paypalEmail && (
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">{method.paypalEmail}</span>
            <button onClick={() => copyText(method.paypalEmail)} className="p-1 rounded bg-sky-800 text-sky-300 hover:bg-sky-700">
              {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        )}
        <p className="text-sky-300 text-xs mt-2">Use "Friends & Family" to avoid fees. Include your email in the note.</p>
        {method.instructions && <p className="text-amber-300 text-xs mt-2">{method.instructions}</p>}
      </div>
    );
  }

  if (method.type === 'paystack' || method.type === 'stripe') {
    return (
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-5 mt-4 text-center">
        <div className="text-4xl mb-2">{method.type === 'paystack' ? '🟢' : '💳'}</div>
        <p className="text-white font-semibold mb-1">Pay ${amount} via {method.type === 'paystack' ? 'Paystack' : 'Stripe'}</p>
        <p className="text-purple-200 text-xs">You'll be redirected to complete your payment securely.</p>
        {method.instructions && <p className="text-amber-300 text-xs mt-2">{method.instructions}</p>}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-300">
          <Shield className="h-3 w-3" /> Secured & encrypted payment
        </div>
      </div>
    );
  }

  return null;
}

function ShopCheckoutAuth({ product, onAuthSuccess }: { product: ShopProduct | undefined; onAuthSuccess: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [authTab, setAuthTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regType, setRegType] = useState<"brand" | "creator">("creator");
  const [showRegPw, setShowRegPw] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({ title: "Welcome back!", description: `Logged in as ${data.user.firstName}. Continuing to checkout…` });
      // Delay invalidation to avoid race condition that briefly clears user and shows auth screen again
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/user"] }), 1000);
    },
    onError: (err: any) => {
      toast({ title: "Login failed", description: err.message || "Invalid credentials.", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({ title: `Welcome aboard, ${data.user.firstName}! 🎉`, description: "Account created! Continuing your purchase…" });
      // Delay invalidation to avoid race condition that briefly clears user and shows auth screen again
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/user"] }), 1000);
    },
    onError: (err: any) => {
      toast({ title: "Registration failed", description: err.message || "Could not create account.", variant: "destructive" });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return toast({ title: "Please enter your email and password", variant: "destructive" });
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName || !regLastName || !regEmail || !regPassword) return toast({ title: "Please fill in all fields", variant: "destructive" });
    if (regPassword.length < 6) return toast({ title: "Password must be at least 6 characters", variant: "destructive" });
    registerMutation.mutate({
      firstName: regFirstName,
      lastName: regLastName,
      email: regEmail,
      password: regPassword,
      userType: regType,
      companyName: regType === "brand" ? regFirstName : undefined,
      bio: regType === "brand" ? `Brand account` : `Influencer account`,
      industry: regType === "brand" ? "E-commerce" : undefined,
      skills: regType === "creator" ? ["Content Creation"] : [],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Back */}
        <button onClick={() => setLocation("/shop")} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Shop
        </button>

        {/* Product preview */}
        {product && (
          <Card className="border-violet-200 bg-violet-50/60">
            <CardContent className="flex items-center gap-4 p-4">
              {product.featuredImage
                ? <img src={product.featuredImage} alt={product.title} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                : <div className="w-16 h-16 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0"><ShoppingBag className="h-7 w-7 text-violet-500" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 whitespace-normal break-anywhere">{product.title}</p>
                <p className="text-sm text-gray-500 whitespace-normal break-anywhere">{product.category}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-violet-700">${Number(product.price).toFixed(2)}</p>
                <p className="text-xs text-gray-400">{product.currency || "USD"}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auth Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3 bg-gradient-to-r from-violet-700 to-violet-900 text-white rounded-t-xl">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-semibold opacity-80">Secure Checkout</span>
            </div>
            <CardTitle className="text-xl text-white">
              {authTab === "login" ? "Sign in to complete purchase" : "Create account to purchase"}
            </CardTitle>
            <p className="text-violet-200 text-sm">
              {authTab === "login"
                ? "Sign in to your Taskdrip account and complete your purchase."
                : "Quick signup — takes less than 30 seconds. Your cart is saved."}
            </p>
          </CardHeader>

          <CardContent className="pt-5">
            <Tabs value={authTab} onValueChange={setAuthTab}>
              <TabsList className="grid grid-cols-2 w-full mb-5">
                <TabsTrigger value="login" className="gap-1.5">
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Create Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Email</Label>
                    <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Password</Label>
                    <div className="relative mt-1">
                      <Input type={showLoginPw ? "text" : "password"} value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)} placeholder="Your password"
                        autoComplete="current-password" className="pr-10" />
                      <button type="button" onClick={() => setShowLoginPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loginMutation.isPending}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-12 gap-2">
                    {loginMutation.isPending ? <span className="animate-pulse">Signing in…</span>
                      : <><LogIn className="h-4 w-4" /> Sign In & Continue</>}
                  </Button>
                  <p className="text-xs text-center text-gray-400">
                    No account?{" "}
                    <button type="button" onClick={() => setAuthTab("register")}
                      className="text-violet-600 hover:underline font-medium">Create one free</button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold">First Name</Label>
                      <Input value={regFirstName} onChange={e => setRegFirstName(e.target.value)}
                        placeholder="Jane" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Last Name</Label>
                      <Input value={regLastName} onChange={e => setRegLastName(e.target.value)}
                        placeholder="Doe" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Email</Label>
                    <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Account Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button type="button" onClick={() => setRegType("creator")}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${regType === "creator" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-gray-200 text-gray-600 hover:border-violet-200"}`}>
                        <UserPlus className="h-4 w-4 flex-shrink-0" /> Influencer
                      </button>
                      <button type="button" onClick={() => setRegType("brand")}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${regType === "brand" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-gray-200 text-gray-600 hover:border-violet-200"}`}>
                        <Building2 className="h-4 w-4 flex-shrink-0" /> Brand
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Password</Label>
                    <div className="relative mt-1">
                      <Input type={showRegPw ? "text" : "password"} value={regPassword}
                        onChange={e => setRegPassword(e.target.value)} placeholder="Min. 6 characters"
                        autoComplete="new-password" className="pr-10" />
                      <button type="button" onClick={() => setShowRegPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={registerMutation.isPending}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-12 gap-2">
                    {registerMutation.isPending ? <span className="animate-pulse">Creating account…</span>
                      : <><UserPlus className="h-4 w-4" /> Create Account & Purchase</>}
                  </Button>
                  <p className="text-xs text-center text-gray-400">
                    Already have an account?{" "}
                    <button type="button" onClick={() => setAuthTab("login")}
                      className="text-violet-600 hover:underline font-medium">Sign in</button>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-gray-400">
          <Shield className="h-3.5 w-3.5 inline mr-1 text-green-500" />
          Your data is secure. We never share your information.
        </p>
      </div>
    </div>
  );
}

// Fallback payment methods if admin hasn't configured any
const FALLBACK_METHODS = [
  { id: "f1", type: "manual", label: "Manual Payment Review", currency: "USD", instructions: "Use this option when the admin has not published a live payment gateway yet." },
];

export default function ShopCheckout() {
  const [, params] = useRoute("/shop/checkout/:id");
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const productId = params?.id;

  // Read ?plan=addonId from query string — enables tier-based pricing mode
  const urlPlanId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("plan") || ""
    : "";

  const [step, setStep] = useState<Step>("summary");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [txHash, setTxHash] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const { data: product, isLoading } = useQuery<ShopProduct>({
    queryKey: ["/api/shop/products", productId],
    enabled: !!productId,
  });

  const { data: paymentMethodsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "shop"],
    queryFn: () => fetch("/api/payment-methods?feature=shop", { credentials: "include" }).then(r => r.json()),
  });

  const paymentMethods = paymentMethodsRaw.length > 0 ? paymentMethodsRaw : FALLBACK_METHODS;
  const selectedMethod = paymentMethods.find((m: any) => m.id === selectedMethodId) || paymentMethods[0];

  const productAddons: ServiceAddon[] = ((product as any)?.serviceAddons || []) as ServiceAddon[];

  // ── Plan mode: ?plan=addonId makes tier selection mutually exclusive ─────────
  // When a tier is pre-selected via URL, the chosen plan's price IS the total.
  // Addons are not stacked additively — one plan at a time.
  const isPlanMode = !!urlPlanId && productAddons.some((a) => a.id === urlPlanId);
  const selectedPlan = isPlanMode ? productAddons.find((a) => a.id === urlPlanId) : null;
  const [activePlanId, setActivePlanId] = useState<string>(urlPlanId);

  const activePlan = productAddons.find((a) => a.id === activePlanId) ?? selectedPlan;

  // In plan mode: total = chosen plan price. In addon mode: total = base + addons.
  const chosenAddons = isPlanMode ? [] : productAddons.filter((a) => selectedAddonIds.includes(a.id));
  const addonsTotal = chosenAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const basePrice = product ? parseFloat(product.price) : 0;
  const grandTotal = isPlanMode
    ? (activePlan ? Number(activePlan.price) : basePrice)
    : basePrice + addonsTotal;
  const introVideoEmbed = getYouTubeEmbed((product as any)?.introVideoUrl || "");

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      // Use the uploaded screenshot URL first, then any free-text proof,
      // then the transaction hash itself as the minimum required proof.
      const effectiveProof = proofUrl || proofText || txHash.trim();
      const res = await apiRequest("POST", "/api/shop/purchase", {
        productId: product!.id,
        amount: grandTotal.toFixed(2),
        currency: selectedMethod?.currency || "USD",
        network: selectedMethod?.network || selectedMethod?.type || "manual",
        transactionHash: txHash,
        paymentProof: effectiveProof,
        paymentMethod: selectedMethod?.label || "Crypto",
        selectedAddons: chosenAddons.map((a) => ({ id: a.id, title: a.title, price: a.price })),
        ...(isPlanMode && activePlanId ? { planId: activePlanId } : {}),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPurchaseId(data.id);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/purchases"] });
    },
    onError: (e: any) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const freePurchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shop/purchase", {
        productId: product!.id,
        amount: addonsTotal.toFixed(2),
        currency: "USD",
        network: addonsTotal > 0 ? "manual" : "free",
        paymentProof: addonsTotal > 0 ? (proofUrl || proofText || "FREE_WITH_ADDONS") : "FREE_PRODUCT",
        transactionHash: "",
        selectedAddons: chosenAddons.map((a) => ({ id: a.id, title: a.title, price: a.price })),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPurchaseId(data.id);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/purchases"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isAuthenticated) {
    return <ShopCheckoutAuth product={product} onAuthSuccess={() => {}} />;
  }

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => step === "summary" ? setLocation(`/shop/product/${productId}`) : setStep(step === "confirm" ? "payment" : "summary")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            {step === "summary" ? "Back to product" : "Back"}
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Secure checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {step !== "success" && <StepIndicator current={step} />}

        {/* Step: Summary */}
        {step === "summary" && (
          <div className="grid md:grid-cols-5 gap-6">
            {/* Order summary — shown first on mobile */}
            <div className="md:col-span-2 md:order-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 overflow-hidden">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  {isPlanMode && activePlan ? (
                    // ── Plan mode: show selected tier clearly ────────────────
                    <>
                      <div className="flex items-start gap-2 text-gray-600 min-w-0">
                        <span className="min-w-0 flex-1 text-sm whitespace-normal break-anywhere">{product.title}</span>
                      </div>
                      <div className="rounded-xl bg-violet-50 border border-violet-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-violet-800 text-xs uppercase tracking-wide mb-0.5">Selected Plan</p>
                            <p className="font-bold text-gray-900">{activePlan.title.split("—")[0].trim()}</p>
                            {activePlan.title.includes("—") && (
                              <p className="text-xs text-gray-500">{activePlan.title.split("—")[1]?.trim()}</p>
                            )}
                          </div>
                          <span className="font-extrabold text-violet-700 text-lg flex-shrink-0">
                            {activePlan.price === 0 ? "FREE" : `$${Number(activePlan.price).toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                      {/* Let user switch to a different tier */}
                      {productAddons.length > 1 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Switch plan:</p>
                          <div className="space-y-1.5">
                            {productAddons.map((a) => (
                              <button
                                key={a.id}
                                onClick={() => setActivePlanId(a.id)}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                                  activePlanId === a.id
                                    ? "border-violet-500 bg-violet-50 text-violet-900 font-semibold"
                                    : "border-gray-200 text-gray-600 hover:border-violet-300"
                                }`}
                              >
                                <span className="truncate min-w-0 flex-1">{a.title.split("—")[0].trim()}</span>
                                <span className="font-bold flex-shrink-0">{a.price === 0 ? "Free" : `$${Number(a.price)}`}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                        <span>Total</span>
                        <span className="text-lg text-violet-700">
                          {activePlan.price === 0 ? "FREE" : `$${Number(activePlan.price).toFixed(2)}`}
                        </span>
                      </div>
                    </>
                  ) : (
                    // ── Standard mode ────────────────────────────────────────
                    <>
                      <div className="flex items-start justify-between gap-2 text-gray-600">
                        <span className="min-w-0 flex-1 whitespace-normal break-anywhere">{product.title}</span>
                        <span className="flex-shrink-0">{product.isFree ? "Free" : `$${product.price}`}</span>
                      </div>
                      {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-${(parseFloat(product.originalPrice) - parseFloat(product.price)).toFixed(2)}</span>
                        </div>
                      )}
                      {chosenAddons.length > 0 && (
                        <div className="flex justify-between text-violet-600">
                          <span>Add-ons ({chosenAddons.length})</span>
                          <span>+${addonsTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                        <span>Total</span>
                        <span className="text-lg">{product.isFree && addonsTotal === 0 ? "FREE" : `$${grandTotal.toFixed(2)}`}</span>
                      </div>
                    </>
                  )}
                </div>

                {(product.isFree && !isPlanMode) || (isPlanMode && activePlan?.price === 0) ? (
                  <Button
                    className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white gap-2 h-12"
                    onClick={() => freePurchaseMutation.mutate()}
                    disabled={freePurchaseMutation.isPending}
                  >
                    <Zap className="h-4 w-4" />
                    {freePurchaseMutation.isPending ? "Processing..." : "Get It Free"}
                  </Button>
                ) : (
                  <Button
                    className="w-full mt-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 h-12 shadow-lg shadow-violet-200"
                    onClick={() => setStep("payment")}
                  >
                    Proceed to Payment <ChevronRight className="h-4 w-4" />
                  </Button>
                )}

                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure</div>
                  <div className="flex items-center gap-1"><Lock className="h-3 w-3" /> Encrypted</div>
                  <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Verified</div>
                </div>
              </div>

              {product.rating && parseFloat(product.rating) > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(parseFloat(product.rating!)) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{product.rating} rating</p>
                  <p className="text-xs text-gray-400">{product.reviewCount || 0} reviews</p>
                </div>
              )}
            </div>

            {/* Product card */}
            <div className="md:col-span-3 md:order-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {product.featuredImage && (
                <img src={product.featuredImage} alt={product.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                   <div className="min-w-0">
                     <h2 className="font-bold text-gray-900 text-lg whitespace-normal break-anywhere">{product.title}</h2>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                      <Badge variant="outline" className="text-xs">{product.type}</Badge>
                    </div>
                  </div>
                  {!product.featuredImage && <Package className="h-8 w-8 text-violet-400 flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{product.shortDescription || product.description?.slice(0, 150)}...</p>
                {product.features && (product.features as string[]).length > 0 && (
                  <div className="space-y-1.5">
                    {(product.features as string[]).slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Step: Payment */}
        {step === "payment" && (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Choose Payment Method</h2>
              <p className="text-gray-500 text-sm mt-1">Select how you'd like to pay <span className="font-semibold text-gray-800">${grandTotal.toFixed(2)}</span></p>
            </div>

            {/* Plan recap (plan mode) — read-only, no checkboxes */}
            {isPlanMode && activePlan && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-violet-600 fill-violet-600" />
                  Your Selected Plan
                </h3>
                <div className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-violet-200">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{activePlan.title.split("—")[0].trim()}</p>
                    {activePlan.title.includes("—") && (
                      <p className="text-xs text-gray-500 truncate">{activePlan.title.split("—")[1]?.trim()}</p>
                    )}
                  </div>
                  <span className="font-extrabold text-violet-700 text-lg flex-shrink-0">
                    {activePlan.price === 0 ? "FREE" : `$${Number(activePlan.price).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-violet-200 text-sm font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-violet-700">{activePlan.price === 0 ? "FREE" : `$${Number(activePlan.price).toFixed(2)}`}</span>
                </div>
              </div>
            )}

            {/* Service Add-ons (Upsells) — only shown in non-plan mode */}
            {productAddons.length > 0 && !isPlanMode && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 space-y-4" data-testid="addons-picker">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Star className="h-4 w-4 text-violet-600 fill-violet-600" />
                    Boost your order with add-ons
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">Optional extras to get even more value.</p>
                </div>

                {introVideoEmbed && (
                  <div className="rounded-xl overflow-hidden bg-black aspect-video">
                    <iframe
                      src={introVideoEmbed}
                      title="Service add-ons intro"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      data-testid="iframe-intro-video"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {productAddons.map((addon) => {
                    const checked = selectedAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          checked ? "border-violet-500 bg-white shadow-sm" : "border-gray-200 bg-white/60 hover:border-violet-300"
                        }`}
                        data-testid={`addon-option-${addon.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedAddonIds((prev) =>
                              e.target.checked ? [...prev, addon.id] : prev.filter((id) => id !== addon.id)
                            );
                          }}
                          className="mt-1 h-4 w-4 accent-violet-600"
                          data-testid={`checkbox-addon-${addon.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-sm truncate min-w-0 flex-1">{addon.title}</p>
                            <span className="font-bold text-violet-700 flex-shrink-0">+${Number(addon.price).toFixed(2)}</span>
                          </div>
                          {addon.description && (
                            <p className="text-xs text-gray-600 mt-0.5">{addon.description}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-violet-200">
                  <span className="text-sm text-gray-700">Subtotal</span>
                  <div className="text-right text-sm">
                    <div className="text-gray-600">Product: ${basePrice.toFixed(2)}</div>
                    <div className="text-gray-600">Add-ons: ${addonsTotal.toFixed(2)}</div>
                    <div className="font-bold text-gray-900 text-base">Total: ${grandTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {paymentMethods.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Wallet className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p>No payment methods configured yet.</p>
                <p className="text-sm">Please contact the admin to set up payment options.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethodId(m.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      (selectedMethodId === m.id || (!selectedMethodId && paymentMethods[0]?.id === m.id))
                        ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-100"
                        : "border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm"
                    }`}
                  >
                    <MethodIcon method={m} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{m.label}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {m.type === 'manual' ? 'Admin-reviewed receipt or payment reference' :
                         m.type === 'crypto' ? `${m.network || ''} · ${m.currency || 'Crypto'}` :
                         m.type === 'bank' ? `${m.bankName || 'Bank Transfer'} · ${m.bankCurrency || m.bankCountry || ''}` :
                         m.type === 'paypal' ? `PayPal · ${m.paypalEmail || ''}` :
                         m.type === 'paystack' ? 'Paystack Payment Gateway' :
                         'Stripe Payment Gateway'}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${(selectedMethodId === m.id || (!selectedMethodId && paymentMethods[0]?.id === m.id)) ? "border-violet-600 bg-violet-600" : "border-gray-300"}`}>
                      {(selectedMethodId === m.id || (!selectedMethodId && paymentMethods[0]?.id === m.id)) && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedMethod && <MethodDetails method={selectedMethod} amount={grandTotal.toFixed(2)} />}

            <Button
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 shadow-lg shadow-violet-200"
              onClick={() => setStep("confirm")}
              disabled={paymentMethods.length === 0}
            >
              I've Sent the Payment <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Confirm Your Payment</h2>
              <p className="text-gray-500 text-sm mt-1">Provide your transaction details so we can verify quickly</p>
            </div>

            {/* Payment recap */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-600 whitespace-normal break-anywhere">{product.title}</p>
                  <p className="text-2xl font-extrabold text-gray-900">${grandTotal.toFixed(2)}</p>
                  {chosenAddons.length > 0 && (
                    <p className="text-xs text-violet-700 mt-1">
                      Includes {chosenAddons.length} add-on{chosenAddons.length > 1 ? "s" : ""} (+${addonsTotal.toFixed(2)})
                    </p>
                  )}
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">Payment via</p>
                  <Badge className="bg-violet-100 text-violet-700">{selectedMethod?.label || "Manual review"}</Badge>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-900 mb-2 block">
                  {selectedMethod?.type === 'bank' ? 'Reference / Transfer Code' :
                   selectedMethod?.type === 'paypal' ? 'PayPal Transaction ID' :
                    selectedMethod?.type === 'manual' ? 'Payment Reference / Note' :
                    'Transaction Hash'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={
                    selectedMethod?.type === 'bank' ? 'Enter transfer reference...' :
                    selectedMethod?.type === 'paypal' ? 'PayPal transaction ID...' :
                    selectedMethod?.type === 'manual' ? 'Enter receipt reference or payment note...' :
                    'Enter transaction hash (e.g. 0xabc123...)'
                  }
                  className="font-mono text-sm h-12 bg-gray-50 border-gray-200"
                />
                <p className="text-xs text-gray-400 mt-1.5">Find this in your {selectedMethod?.type === 'bank' ? 'bank statement' : selectedMethod?.type === 'paypal' ? 'PayPal activity' : selectedMethod?.type === 'manual' ? 'receipt or transfer confirmation' : 'crypto wallet or blockchain explorer (the tx hash after sending)'}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-semibold text-gray-900 mb-2 block">Payment Screenshot <span className="text-gray-400 font-normal">(recommended — speeds up review)</span></Label>
                <ProofUpload onUpload={(url) => setProofUrl(url)} />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold mb-0.5">Verification usually takes under 24 hours</p>
                <p>Once verified, you'll get instant access. You'll be notified when approved.</p>
              </div>
            </div>

            <Button
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 shadow-lg shadow-violet-200"
              onClick={() => purchaseMutation.mutate()}
              disabled={!txHash.trim() || purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Processing...</>
              ) : (
                <>Submit Payment <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (() => {
          const buyerName = (user as any)?.firstName || (user as any)?.username || "there";
          const orderRef = purchaseId ? purchaseId.slice(0, 8).toUpperCase() : "PENDING";
          const addonSummary = chosenAddons.length > 0
            ? `\n• Add-ons: ${chosenAddons.map((a) => `${a.title} ($${Number(a.price).toFixed(2)})`).join(", ")}`
            : "";
          const productTypeMsg: Record<string, string> = {
            service: "a service",
            template: "a template/design pack",
            course: "a course or training guide",
            software: "software",
            scripts: "an automation script",
            plugins: "a plugin or extension",
            tools: "a digital tool",
            education: "a training guide",
            physical: "a physical product",
          };
          const typeLabel = productTypeMsg[(product as any).type as string] ?? "a product";
          const txHashLine = txHash.trim() ? `\n🔗 Payment Hash: ${txHash.trim()}` : "";
          const totalLabel = product.isFree && addonsTotal === 0 ? "FREE" : `$${grandTotal.toFixed(2)}`;
          const whatsappMsg = encodeURIComponent(
            `Hi Taskdrip! 👋\n\n` +
            `I just purchased ${typeLabel} from the Taskdrip marketplace:\n\n` +
            `📦 Order ID: #${orderRef}\n` +
            `🛒 Item: ${product.title}${addonSummary}\n` +
            `💰 Total: ${totalLabel}\n` +
            `💳 Payment: ${selectedMethod?.label || "Manual review"}${txHashLine}\n\n` +
            `Please confirm once payment is verified. Thanks! 🙏`
          );
          const whatsappUrl = `${SOCIALS.whatsapp}?text=${whatsappMsg}`;

          return (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Success header */}
              <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 px-8 py-10 text-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PartyPopper className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold mb-2" data-testid="text-thank-you">Thank You, {buyerName}! 🎉</h2>
                <p className="text-white/80 text-sm">Your order has been placed successfully</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Personalized processing message */}
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-4" data-testid="text-processing-message">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">Hey {buyerName}, we're on it! ⚡</p>
                      <p className="text-xs text-gray-700 mt-1">
                        Your order for <span className="font-semibold break-anywhere">{product.title}</span> is now being processed by our team.
                        {product.isFree
                          ? " You'll get instant access shortly."
                          : " We'll verify your payment within 24 hours and unlock your access right away."}
                        {chosenAddons.length > 0 && ` We'll also start working on your ${chosenAddons.length} add-on${chosenAddons.length > 1 ? "s" : ""} immediately.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-500 flex-shrink-0">Order ID</span>
                    <span className="font-mono font-medium text-gray-900 text-right break-anywhere" data-testid="text-order-ref">#{orderRef}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-500 flex-shrink-0">Product</span>
                    <span className="min-w-0 max-w-[75%] font-medium text-gray-900 text-right whitespace-normal break-anywhere">{product.title}</span>
                  </div>
                  {chosenAddons.length > 0 && (
                  <div className="flex justify-between gap-3 text-sm items-start">
                    <span className="text-gray-500 flex-shrink-0">Add-ons</span>
                    <span className="min-w-0 max-w-[75%] font-medium text-gray-900 text-right whitespace-normal break-anywhere">
                        {chosenAddons.map((a) => (
                          <div key={a.id}>{a.title} <span className="text-gray-500">+${Number(a.price).toFixed(2)}</span></div>
                        ))}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-500 flex-shrink-0">Amount</span>
                    <span className="font-bold text-gray-900 text-right">{product.isFree && addonsTotal === 0 ? "FREE" : `$${grandTotal.toFixed(2)}`}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-500 flex-shrink-0">Payment via</span>
                    <span className="min-w-0 max-w-[75%] font-medium text-gray-900 text-right whitespace-normal break-anywhere">{selectedMethod?.label || "Manual review"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-500 flex-shrink-0">Status</span>
                    {product.isFree ? (
                      <Badge className="bg-green-100 text-green-700">Confirmed</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">Pending Verification</Badge>
                    )}
                  </div>
                </div>

                {/* What happens next */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                  <div className="space-y-3">
                    {product.isFree ? (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><CheckCircle className="h-3 w-3 text-green-600" /></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Access granted instantly</p>
                            <p className="text-xs text-gray-500">Your free product is ready to download</p>
                          </div>
                        </div>
                        {product.downloadUrl && (
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><Download className="h-3 w-3 text-blue-600" /></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Download your product</p>
                              <a href={product.downloadUrl} className="text-xs text-violet-600 hover:underline">Click here to download →</a>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-700">1</div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Payment verification</p>
                            <p className="text-xs text-gray-500">Our team reviews your transaction (within 24hrs)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-700">2</div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Access unlocked in your dashboard</p>
                            <p className="text-xs text-gray-500">Download link and full product details appear directly in your order page</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-700">3</div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Enjoy your product</p>
                            <p className="text-xs text-gray-500">Use it, grow, and leave a review!</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Primary CTA: View order on dashboard */}
                {purchaseId && (
                  <Link href={`/orders/${purchaseId}`}>
                    <Button className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 shadow-lg shadow-violet-200" data-testid="button-view-order">
                      <Receipt className="h-4 w-4" />
                      View My Order on Dashboard
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}

                {/* WhatsApp follow-up — pre-filled with order details */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  data-testid="link-whatsapp-followup"
                >
                  <Button className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white gap-2 shadow-lg shadow-green-100">
                    <SiWhatsapp className="h-4 w-4" />
                    Message Us on WhatsApp
                  </Button>
                </a>
                <p className="text-xs text-center text-gray-500 -mt-3">
                  💡 Save our number <span className="font-semibold text-gray-700">{SOCIALS.whatsappNumber}</span> as <span className="font-semibold text-violet-700">"taskdrip"</span> so you never miss an update.
                </p>

                <div className="flex gap-3">
                  <Link href="/shop" className="flex-1">
                    <Button variant="outline" className="w-full" data-testid="button-continue-shopping">Continue Shopping</Button>
                  </Link>
                  <Link href="/my-orders" className="flex-1">
                    <Button variant="outline" className="w-full" data-testid="button-all-orders">All My Orders</Button>
                  </Link>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3 text-green-500" />
                    Your purchase is protected by Taskdrip's buyer guarantee
                  </p>
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
