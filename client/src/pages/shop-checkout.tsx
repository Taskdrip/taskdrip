import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Copy, CheckCircle, AlertCircle, Package,
  ArrowLeft, Lock, Zap, ChevronRight, Upload, Star,
  PartyPopper, Download, Building2, Wallet,
} from "lucide-react";
import type { ShopProduct } from "@shared/schema";

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
    return (
      <div className="bg-blue-950 rounded-2xl p-5 mt-4 space-y-2">
        <p className="text-blue-200 text-xs font-semibold mb-2">Bank Transfer Details — Send ${amount}</p>
        {method.bankName && <div className="flex justify-between text-sm"><span className="text-gray-400">Bank</span><span className="text-white font-medium">{method.bankName}</span></div>}
        {method.accountName && <div className="flex justify-between text-sm"><span className="text-gray-400">Account Name</span><span className="text-white font-medium">{method.accountName}</span></div>}
        {method.accountNumber && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Account No.</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono font-medium">{method.accountNumber}</span>
              <button onClick={() => copyText(method.accountNumber)} className="p-1 rounded bg-blue-900 text-blue-300 hover:bg-blue-800">
                {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        )}
        {method.bankCurrency && <div className="flex justify-between text-sm"><span className="text-gray-400">Currency</span><span className="text-white">{method.bankCurrency}</span></div>}
        {method.swiftCode && <div className="flex justify-between text-sm"><span className="text-gray-400">SWIFT</span><span className="text-white font-mono">{method.swiftCode}</span></div>}
        {method.routingNumber && <div className="flex justify-between text-sm"><span className="text-gray-400">Routing</span><span className="text-white font-mono">{method.routingNumber}</span></div>}
        {method.bankCountry && <div className="flex justify-between text-sm"><span className="text-gray-400">Country</span><span className="text-white">{method.bankCountry}</span></div>}
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

// Fallback payment methods if admin hasn't configured any
const FALLBACK_METHODS = [
  { id: "f1", type: "manual", label: "Manual Payment Review", currency: "USD", instructions: "Use this option when the admin has not published a live payment gateway yet." },
];

export default function ShopCheckout() {
  const [, params] = useRoute("/shop/checkout/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const productId = params?.id;
  const [step, setStep] = useState<Step>("summary");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [txHash, setTxHash] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [purchaseId, setPurchaseId] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery<ShopProduct>({
    queryKey: ["/api/shop/products", productId],
    enabled: !!productId,
  });

  const { data: paymentMethodsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "shop"],
    queryFn: () => fetch("/api/payment-methods?feature=shop", { credentials: "include" }).then(r => r.json()),
  });

  const visiblePaymentMethods = paymentMethodsRaw.filter((method: any) => {
    const text = `${method.label || ""} ${method.currency || ""} ${method.network || ""}`.toLowerCase();
    return !text.includes("usdt") && !text.includes("ton");
  });
  const paymentMethods = visiblePaymentMethods.length > 0 ? visiblePaymentMethods : FALLBACK_METHODS;
  const selectedMethod = paymentMethods.find((m: any) => m.id === selectedMethodId) || paymentMethods[0];

  if (!selectedMethodId && paymentMethods.length > 0 && !selectedMethodId) {
    // Will be set on first render via the useEffect equivalent
  }

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shop/purchase", {
        productId: product!.id,
        amount: product!.price,
        currency: selectedMethod?.currency || "USD",
        network: selectedMethod?.network || selectedMethod?.type || "manual",
        transactionHash: txHash,
        paymentProof: proofUrl || proofText,
        paymentMethod: selectedMethod?.label || "Crypto",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPurchaseId(data.id);
      setStep("success");
    },
    onError: (e: any) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const freePurchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shop/purchase", {
        productId: product!.id,
        amount: "0",
        currency: "USD",
        network: "free",
        paymentProof: "FREE_PRODUCT",
        transactionHash: "",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPurchaseId(data.id);
      setStep("success");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to purchase</h2>
          <p className="text-gray-500 text-sm mb-6">You need to be signed in to complete a purchase.</p>
          <Link href="/login"><Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">
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
            {/* Product card */}
            <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {product.featuredImage && (
                <img src={product.featuredImage} alt={product.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">{product.title}</h2>
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

            {/* Order summary */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{product.title}</span>
                    <span>{product.isFree ? "Free" : `$${product.price}`}</span>
                  </div>
                  {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${(parseFloat(product.originalPrice) - parseFloat(product.price)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-lg">{product.isFree ? "FREE" : `$${product.price}`}</span>
                  </div>
                </div>

                {product.isFree ? (
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
          </div>
        )}

        {/* Step: Payment */}
        {step === "payment" && (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Choose Payment Method</h2>
              <p className="text-gray-500 text-sm mt-1">Select how you'd like to pay <span className="font-semibold text-gray-800">${product.price}</span></p>
            </div>

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

            {selectedMethod && <MethodDetails method={selectedMethod} amount={product.price} />}

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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{product.title}</p>
                  <p className="text-2xl font-extrabold text-gray-900">${product.price}</p>
                </div>
                <div className="text-right">
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
                    'Transaction ID'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={
                    selectedMethod?.type === 'bank' ? 'Enter transfer reference...' :
                    selectedMethod?.type === 'paypal' ? 'PayPal transaction ID...' :
                    selectedMethod?.type === 'manual' ? 'Enter receipt reference or payment note...' :
                    'Enter transaction ID...'
                  }
                  className="font-mono text-sm h-12 bg-gray-50 border-gray-200"
                />
                <p className="text-xs text-gray-400 mt-1.5">Find this in your {selectedMethod?.type === 'bank' ? 'bank statement' : selectedMethod?.type === 'paypal' ? 'PayPal activity' : selectedMethod?.type === 'manual' ? 'receipt or transfer confirmation' : "payment confirmation"}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-semibold text-gray-900 mb-2 block">Payment Screenshot <span className="text-gray-400 font-normal">(recommended)</span></Label>
                <ProofUpload onUpload={(url) => setProofUrl(url)} />
                <div className="mt-2">
                  <Input
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    placeholder="Or paste proof URL / link..."
                    className="text-sm h-9 bg-gray-50 border-gray-200"
                  />
                </div>
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
        {step === "success" && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Success header */}
              <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 px-8 py-10 text-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PartyPopper className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold mb-2">Thank You!</h2>
                <p className="text-white/80 text-sm">Your order has been placed successfully</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Order details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Product</span>
                    <span className="font-medium text-gray-900">{product.title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-gray-900">{product.isFree ? "FREE" : `$${product.price}`}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Payment via</span>
                    <span className="font-medium text-gray-900">{selectedMethod?.label || "Manual review"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
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
                            <p className="text-sm font-medium text-gray-900">Access unlocked</p>
                            <p className="text-xs text-gray-500">Download link delivered to your email</p>
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

                <div className="flex gap-3">
                  <Link href="/shop" className="flex-1">
                    <Button variant="outline" className="w-full">Continue Shopping</Button>
                  </Link>
                  <Link href="/dashboard" className="flex-1">
                    <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">My Dashboard</Button>
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
        )}
      </div>
    </div>
  );
}
