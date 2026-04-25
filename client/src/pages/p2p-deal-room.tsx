import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertTriangle, ArrowLeft, CheckCircle, Lock, MessageCircle,
  Send, ShieldCheck, Truck, Upload, Wallet, Clock, Package,
  KeyRound, Eye, EyeOff, Copy, Check, Info, Zap, Star,
  AlertCircle, CreditCard, ArrowRight, Bitcoin, Coins, MapPin, Globe,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD:"$", EUR:"€", GBP:"£", NGN:"₦", GHS:"₵", KES:"KSh", ZAR:"R",
  EGP:"E£", CAD:"C$", AUD:"A$", INR:"₹", PKR:"₨", PHP:"₱",
  BRL:"R$", AED:"د.إ", TRY:"₺", UAH:"₴",
};

function getCurrSym(code?: string) {
  return CURRENCY_SYMBOLS[code || "USD"] || "$";
}

function money(value: any, currency?: string) {
  const sym = getCurrSym(currency);
  return sym + Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

const DEAL_STAGES = [
  { key: "pending",   label: "Payment",   icon: CreditCard },
  { key: "funded",    label: "Funded",    icon: ShieldCheck },
  { key: "delivered", label: "Delivered", icon: Truck },
  { key: "completed", label: "Complete",  icon: CheckCircle },
];

function DealProgress({ status, paymentMarkedAt }: { status: string; paymentMarkedAt?: string | null }) {
  const stageOrder = ["pending", "funded", "delivered", "completed"];
  const currentIdx = status === "disputed" ? stageOrder.indexOf("delivered") : stageOrder.indexOf(status);
  const isPaymentSubmitted = status === "pending" && !!paymentMarkedAt;

  return (
    <div className="relative flex items-start justify-between w-full pt-1">
      {/* connector lines */}
      <div className="absolute top-[18px] left-0 right-0 flex">
        {DEAL_STAGES.slice(0, -1).map((_, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <div className={`h-0.5 w-full mx-8 ${i < currentIdx ? "bg-green-500" : "bg-gray-700"}`} />
          </div>
        ))}
      </div>
      {DEAL_STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const disputed = status === "disputed" && idx === currentIdx;
        const paymentPending = active && idx === 0 && isPaymentSubmitted;
        return (
          <div key={stage.key} className="flex-1 flex flex-col items-center z-10">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 transition-all ${
              disputed        ? "bg-red-500 ring-4 ring-red-900/40" :
              done            ? "bg-green-500" :
              paymentPending  ? "bg-amber-500 ring-4 ring-amber-900/40 animate-pulse" :
              active          ? "bg-violet-600 ring-4 ring-violet-900/40" :
              "bg-gray-800 border border-gray-700"
            }`}>
              <Icon className={`w-4 h-4 ${done || active || disputed ? "text-white" : "text-gray-600"}`} />
            </div>
            <p className={`text-[10px] font-semibold text-center leading-tight ${
              disputed       ? "text-red-400" :
              done           ? "text-green-400" :
              paymentPending ? "text-amber-400" :
              active         ? "text-violet-400" :
              "text-gray-600"
            }`}>{stage.label}</p>
            {paymentPending && <p className="text-[9px] text-amber-500 mt-0.5">Under Review</p>}
          </div>
        );
      })}
    </div>
  );
}

type AITone = "info" | "warning" | "success" | "alert";
interface AIGuide { tone: AITone; heading: string; body: string; }

function getAIGuidance(tx: any, isBuyer: boolean, isSeller: boolean): AIGuide | null {
  const type = tx.transactionType as string;
  const isPhysical = tx.listing?.productSubtype === "physical";
  const typeLabel = type === "crypto" ? "crypto" : type === "product" ? (isPhysical ? "physical product" : "digital product") : "service";

  if (tx.status === "pending" && !tx.paymentMarkedAt) {
    if (isBuyer) return {
      tone: "info",
      heading: "Step 1 — Send funds to escrow",
      body: `Copy the escrow wallet address below and send exactly ${money(tx.totalAmount, tx.currency)}. Once sent, upload your payment proof and click "Submit Payment". Your funds are held safely until ${typeLabel} is delivered.`,
    };
    if (isSeller) return {
      tone: "info",
      heading: "Waiting for buyer payment",
      body: "Your listing has been accepted. The buyer will now send funds to the admin escrow wallet. You'll get a notification when payment is confirmed and you can begin delivery.",
    };
  }

  if (tx.status === "pending" && tx.paymentMarkedAt) {
    if (isBuyer) return {
      tone: "info",
      heading: "Payment submitted — admin is reviewing",
      body: "Your payment proof has been received. Our admin team verifies all payments within a few hours. You'll be notified as soon as funds are confirmed in escrow. No action needed right now.",
    };
    if (isSeller) return {
      tone: "info",
      heading: "Buyer has submitted payment proof",
      body: "The buyer has uploaded payment proof and is awaiting admin confirmation. Once confirmed, you'll be notified to begin delivery. Please be ready!",
    };
  }

  if (tx.status === "funded") {
    if (isBuyer) return {
      tone: "success",
      heading: "Funds confirmed in escrow",
      body: `${money(tx.totalAmount, tx.currency)} is now secured in the admin escrow wallet. The seller has been notified and will deliver your ${typeLabel} shortly. You'll receive a notification when delivery is submitted.`,
    };
    if (isSeller) return {
      tone: "success",
      heading: "Payment confirmed — deliver now",
      body: type === "crypto"
        ? `Buyer's funds are locked in escrow. Send the ${typeLabel} to the buyer's wallet address (visible in chat) and enter the transaction details below.`
        : type === "product"
        ? "Buyer's payment is secured. Ship the product and provide tracking information below so the buyer can confirm receipt."
        : "Buyer's payment is secured. Complete and deliver the service, then provide delivery proof or access details below.",
    };
  }

  if (tx.status === "delivered") {
    if (isBuyer) return {
      tone: "warning",
      heading: "⚠️ Only confirm receipt AFTER you have received the item",
      body: type === "crypto"
        ? "Check your wallet — confirm the crypto has arrived and the amount is correct BEFORE clicking confirm. Once you confirm, admin will release funds to the seller. You cannot reverse this."
        : type === "product"
        ? "Inspect the product first. Only confirm receipt after you have physically received and checked the item. Confirming releases funds to the seller permanently."
        : "Only confirm after the service has been fully completed to your satisfaction. Confirming releases funds to the seller permanently.",
    };
    if (isSeller) return {
      tone: "info",
      heading: "Delivery submitted — waiting for buyer",
      body: "You've confirmed delivery. The buyer is reviewing. Once they confirm receipt, admin will release your funds. If there's an issue, they may open a dispute.",
    };
  }

  if (tx.status === "completed") return {
    tone: "success",
    heading: "Deal successfully completed!",
    body: `This ${typeLabel} trade has been completed and funds released. Thank you for trading on Taskdrip P2P. Your trade history is preserved for future reference.`,
  };

  if (tx.status === "disputed") {
    if (isBuyer) return {
      tone: "alert",
      heading: "Dispute opened — admin reviewing",
      body: "A dispute has been filed. Our admin team is reviewing the transaction details, chat history, and payment proof. Please provide any additional evidence in the chat. Resolution typically takes 24–48 hours.",
    };
    if (isSeller) return {
      tone: "alert",
      heading: "Dispute opened — respond in chat",
      body: "A dispute has been raised. Please respond in the chat with your delivery proof and any relevant evidence. Admin will review everything and make a fair decision.",
    };
  }

  if (tx.status === "refunded") return {
    tone: "alert",
    heading: "Transaction refunded",
    body: "Admin has issued a refund for this transaction. The buyer's funds have been returned. If you have questions, contact admin via WhatsApp.",
  };

  return null;
}

const toneStyles: Record<AITone, { bg: string; border: string; icon: string; iconComp: any }> = {
  info:    { bg: "bg-blue-950/50",    border: "border-blue-800/50",  icon: "text-blue-400",    iconComp: Info },
  warning: { bg: "bg-amber-950/50",   border: "border-amber-700/60", icon: "text-amber-400",   iconComp: AlertTriangle },
  success: { bg: "bg-green-950/50",   border: "border-green-800/50", icon: "text-green-400",   iconComp: CheckCircle },
  alert:   { bg: "bg-red-950/50",     border: "border-red-800/50",   icon: "text-red-400",     iconComp: AlertCircle },
};

function AIGuidanceBanner({ guidance }: { guidance: AIGuide }) {
  const s = toneStyles[guidance.tone];
  const IconComp = s.iconComp;
  return (
    <div className={`rounded-2xl border ${s.bg} ${s.border} p-4 flex gap-3`} data-testid="ai-guidance-banner">
      <div className={`mt-0.5 flex-shrink-0 ${s.icon}`}>
        <IconComp className="w-5 h-5" />
      </div>
      <div>
        <p className={`font-bold text-sm mb-1 ${s.icon}`}>{guidance.heading}</p>
        <p className="text-gray-300 text-sm leading-relaxed">{guidance.body}</p>
      </div>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy(value);
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <div className="flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5">
        <span className="flex-1 font-mono text-sm text-gray-200 break-all">{value}</span>
        <button onClick={copy} className="flex-shrink-0 text-gray-500 hover:text-white transition-colors" data-testid={`copy-${label.toLowerCase().replace(/\s/g,"-")}`}>
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ConfirmReceiptModal({ onConfirm, onCancel, isPending, type }: { onConfirm: () => void; onCancel: () => void; isPending: boolean; type: string }) {
  const [checked, setChecked] = useState(false);
  const warnings: Record<string, string> = {
    crypto: "I confirm that the cryptocurrency has arrived in my wallet and the amount matches exactly.",
    product: "I confirm that I have physically received and inspected the product and it is as described.",
    service: "I confirm that the service has been fully completed and delivered to my satisfaction.",
  };
  const warning = warnings[type] || warnings.product;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" data-testid="modal-confirm-receipt">
      <div className="bg-gray-900 border border-red-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-black text-lg">Confirm Receipt</h3>
            <p className="text-red-400 text-sm">This action cannot be undone</p>
          </div>
        </div>

        <div className="rounded-xl bg-red-950/40 border border-red-800/40 p-4 mb-5">
          <p className="text-red-300 text-sm font-semibold mb-2">⚠️ Warning — read carefully</p>
          <p className="text-gray-300 text-sm leading-relaxed">
            Once you confirm receipt, the admin will <strong>permanently release funds to the seller</strong>. 
            This cannot be reversed. If you have not received your {type}, click Cancel and open a dispute instead.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer mb-5 group">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-green-500"
            data-testid="checkbox-receipt-confirm"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
            {warning}
          </span>
        </label>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800" onClick={onCancel} data-testid="button-cancel-receipt">
            Cancel — Not Yet
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
            disabled={!checked || isPending}
            onClick={onConfirm}
            data-testid="button-confirm-receipt-final"
          >
            {isPending ? "Confirming..." : "Yes, I Received It"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckoutPanel({ tx, onSubmit, isPending }: { tx: any; onSubmit: (note: string, proof: File | null) => void; isPending: boolean }) {
  const [step, setStep] = useState(1);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "p2p"],
    queryFn: () => fetch("/api/payment-methods?feature=p2p", { credentials: "include" }).then(r => r.json()),
  });
  const cryptoMethods = (paymentMethods as any[]).filter((m: any) => m.type === "crypto");
  const currencyCode = tx.currency || "USD";
  const amountStr = money(tx.totalAmount, currencyCode);

  const payMethod = (tx.listing?.paymentMethod || "").toLowerCase();

  // Match admin escrow wallet by payment method keywords
  const matchedNet = cryptoMethods.find((m: any) => {
    const net = (m.network || "").toLowerCase();
    const lbl = (m.label || "").toLowerCase();
    if ((payMethod.includes("trc20") || payMethod.includes("tron")) && (net.includes("trc") || net.includes("tron"))) return true;
    if ((payMethod.includes("bep20") || payMethod.includes("bsc")) && (net.includes("bep") || net.includes("bsc"))) return true;
    if ((payMethod.includes("ton") || payMethod.includes("telegram")) && net.includes("ton")) return true;
    if (payMethod.includes("pi") && (net.includes("pi") || lbl.includes("pi"))) return true;
    return false;
  });
  // Use admin's escrow wallet address (admin collects funds, pays seller after confirmation)
  const walletAddress = matchedNet?.address || "";

  const { copied: copiedWallet, copy: copyWallet } = useCopy(walletAddress);
  const { copied: copiedAmt, copy: copyAmt } = useCopy(amountStr);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden" data-testid="checkout-panel">
      {/* Step tabs */}
      <div className="flex border-b border-gray-800">
        {["Review", "Send Funds", "Submit Proof"].map((label, i) => (
          <button
            key={i}
            onClick={() => i < step && setStep(i + 1)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              step === i + 1
                ? "text-white border-b-2 border-violet-500 bg-violet-950/30"
                : i + 1 < step
                ? "text-green-400"
                : "text-gray-600"
            }`}
            data-testid={`checkout-step-${i+1}`}
          >
            {i + 1 < step ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" />{label}</span> : `${i + 1}. ${label}`}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* STEP 1: Review */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400 text-sm">Listing</span>
                <span className="text-white font-semibold text-sm text-right max-w-[60%]">{tx.listing?.title}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400 text-sm">Offer amount</span>
                <span className="text-white font-semibold">{money(tx.amount, currencyCode)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400 text-sm">Buyer fee</span>
                <span className="text-violet-400 font-semibold">{money(tx.buyerFee ?? tx.fee, currencyCode)}</span>
              </div>
              {Number(tx.sellerFee || 0) > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">Seller fee (deducted at release)</span>
                  <span className="text-orange-400 font-semibold">{money(tx.sellerFee, currencyCode)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300 font-bold">Total to send</span>
                <span className="text-2xl font-black text-white">{money(tx.totalAmount, currencyCode)}</span>
              </div>
            </div>

            <div className="rounded-xl bg-violet-950/30 border border-violet-800/30 p-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-violet-300 leading-relaxed">
                Funds are held in our admin-controlled escrow. You stay protected — money is only released after you confirm receipt.
              </p>
            </div>

            <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => setStep(2)} data-testid="checkout-next-step2">
              Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: Send Funds */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-950/30 border border-amber-800/40 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Send <strong>exactly {amountStr}</strong> to the escrow wallet below. Include no extra or less — mismatched amounts delay confirmation.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Payment method</p>
                <div className="rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5">
                  <p className="text-white font-semibold text-sm">{tx.listing?.paymentMethod || "Contact admin"}</p>
                  {matchedNet && <p className="text-xs text-gray-500 mt-0.5">{matchedNet.label}</p>}
                </div>
              </div>

              {walletAddress ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Escrow wallet address</p>
                  <div className="flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5">
                    <span className="flex-1 font-mono text-sm text-green-300 break-all">{walletAddress}</span>
                    <button onClick={copyWallet} className="flex-shrink-0 text-gray-500 hover:text-white transition-colors" data-testid="copy-wallet-address">
                      {copiedWallet ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-800 border border-gray-700 p-3">
                  <p className="text-xs text-gray-400">Wallet address not configured for this payment method. Contact admin for escrow wallet details.</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1.5">Exact amount to send</p>
                <div className="flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5">
                  <span className="flex-1 font-mono text-lg font-black text-white">{amountStr}</span>
                  <button onClick={copyAmt} className="flex-shrink-0 text-gray-500 hover:text-white transition-colors" data-testid="copy-amount">
                    {copiedAmt ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="border-gray-700 text-gray-400 hover:bg-gray-800" onClick={() => setStep(1)} data-testid="checkout-back-step1">Back</Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={() => setStep(3)} data-testid="checkout-next-step3">
                I've sent the funds <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Submit Proof */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-950/30 border border-green-800/40 p-3 flex items-start gap-2">
              <Upload className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-300 leading-relaxed">
                Upload a screenshot of your payment or paste the transaction hash. Admin will verify and confirm your funds in escrow.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Transaction hash / reference ID</label>
              <Input
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                placeholder="e.g. 0x4a3b2c1d... or TXN-ABC123..."
                className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 text-sm font-mono"
                data-testid="input-payment-note"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Payment screenshot (required)</label>
              <div className="rounded-xl bg-gray-800 border-2 border-dashed border-gray-700 p-4 text-center cursor-pointer hover:border-violet-700 transition-colors" onClick={() => document.getElementById("proof-upload")?.click()}>
                {paymentProof ? (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-semibold">{paymentProof.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Click to upload screenshot</p>
                    <p className="text-gray-700 text-xs mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
              <input id="proof-upload" type="file" accept="image/*" className="hidden" onChange={e => setPaymentProof(e.target.files?.[0] || null)} data-testid="input-payment-proof" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="border-gray-700 text-gray-400 hover:bg-gray-800" onClick={() => setStep(2)} data-testid="checkout-back-step2">Back</Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                disabled={isPending || (!paymentNote.trim() && !paymentProof)}
                onClick={() => onSubmit(paymentNote, paymentProof)}
                data-testid="button-submit-payment"
              >
                {isPending ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />Submitting...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" />Submit Payment Proof</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentUnderReview({ tx }: { tx: any }) {
  return (
    <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-5 space-y-4" data-testid="panel-payment-review">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-900/50 flex items-center justify-center flex-shrink-0">
          <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Payment submitted</h3>
          <p className="text-amber-400 text-sm">Admin is verifying your payment</p>
        </div>
      </div>

      {tx.paymentMarkedAt && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-3">
            <p className="text-xs text-gray-500 mb-1">Submitted</p>
            <p className="text-white text-sm font-semibold">{format(new Date(tx.paymentMarkedAt), "dd MMM, HH:mm")}</p>
          </div>
          <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-3">
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="text-white text-sm font-bold">{money(tx.totalAmount, tx.currency)}</p>
          </div>
        </div>
      )}

      {tx.paymentNote && (
        <div className="rounded-xl bg-gray-800 border border-gray-700 p-3">
          <p className="text-xs text-gray-500 mb-1">Transaction reference</p>
          <p className="font-mono text-sm text-gray-300 break-all">{tx.paymentNote}</p>
        </div>
      )}

      {tx.paymentProof && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Payment proof</p>
          <a href={tx.paymentProof} target="_blank" rel="noreferrer" className="block">
            <img src={tx.paymentProof} alt="Payment proof" className="rounded-xl border border-gray-700 max-h-40 object-cover w-full hover:opacity-90 transition-opacity" />
          </a>
        </div>
      )}

      <div className="rounded-xl bg-blue-950/30 border border-blue-800/30 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-300 leading-relaxed">
          Once admin confirms your payment, the status will change to <strong>"Funded"</strong> and the seller will be notified to deliver. Typical review time: a few hours.
        </p>
      </div>
    </div>
  );
}

function EscrowFundedBanner({ tx }: { tx: any }) {
  return (
    <div className="rounded-2xl border border-green-800/40 bg-green-950/20 p-5" data-testid="panel-funded">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-green-900/50 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Funds secured in escrow</h3>
          <p className="text-green-400 text-sm">Admin confirmed your payment</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-3">
          <p className="text-xs text-gray-500 mb-1">Confirmed</p>
          <p className="text-white text-sm font-semibold">{tx.fundedAt ? format(new Date(tx.fundedAt), "dd MMM, HH:mm") : "—"}</p>
        </div>
        <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-3">
          <p className="text-xs text-gray-500 mb-1">Held in escrow</p>
          <p className="text-2xl font-black text-green-400">{money(tx.totalAmount, tx.currency)}</p>
        </div>
      </div>
    </div>
  );
}

export default function P2PDealRoom() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showRoomId, setShowRoomId] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const listMode = !id;

  const { data: deals = [] } = useQuery<any[]>({ queryKey: ["/api/p2p/transactions"], enabled: listMode });

  const { data: tx, isLoading } = useQuery<any>({
    queryKey: [`/api/p2p/transactions/${id}`],
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: [`/api/p2p/transactions/${id}/messages`],
    enabled: !!id,
    refetchInterval: 10000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/p2p/transactions/${id}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/p2p/transactions/${id}/messages`] });
    queryClient.invalidateQueries({ queryKey: ["/api/p2p/transactions"] });
  };

  const sendMessage = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("content", message);
      if (attachment) fd.append("attachment", attachment);
      const res = await fetch(`/api/p2p/transactions/${id}/messages`, { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to send");
      return res.json();
    },
    onSuccess: () => { setMessage(""); setAttachment(null); invalidate(); },
    onError: (e: Error) => toast({ title: "Message failed", description: e.message, variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: async ({ note, proof }: { note: string; proof: File | null }) => {
      const fd = new FormData();
      fd.append("paymentNote", note);
      if (proof) fd.append("paymentProof", proof);
      const res = await fetch(`/api/p2p/transactions/${id}/mark-paid`, { method: "PATCH", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to submit payment");
      return res.json();
    },
    onSuccess: () => { toast({ title: "Payment submitted!", description: "Admin will verify and confirm shortly." }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not submit payment", description: e.message, variant: "destructive" }),
  });

  const deliver = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/p2p/transactions/${id}/deliver`, { deliveryNote }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Delivery submitted", description: "Buyer will now confirm receipt." }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not confirm delivery", description: e.message, variant: "destructive" }),
  });

  const confirmReceived = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/p2p/transactions/${id}/confirm-received`).then(r => r.json()),
    onSuccess: () => { setShowConfirmModal(false); toast({ title: "Receipt confirmed!", description: "Admin will now release funds to the seller." }); invalidate(); },
    onError: (e: Error) => { setShowConfirmModal(false); toast({ title: "Could not confirm", description: e.message, variant: "destructive" }); },
  });

  const dispute = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/p2p/transactions/${id}/dispute`, { reason: disputeReason }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Dispute opened", description: "Admin will review and respond shortly." }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not open dispute", description: e.message, variant: "destructive" }),
  });

  /* ── LIST MODE ── */
  if (listMode) {
    const statusColors: Record<string, string> = {
      pending:   "bg-yellow-900/40 text-yellow-300 border-yellow-800",
      funded:    "bg-blue-900/40 text-blue-300 border-blue-800",
      delivered: "bg-indigo-900/40 text-indigo-300 border-indigo-800",
      completed: "bg-green-900/40 text-green-300 border-green-800",
      disputed:  "bg-red-900/40 text-red-300 border-red-800",
      refunded:  "bg-gray-700/40 text-gray-400 border-gray-700",
    };
    return (
      <div className="min-h-screen bg-gray-950">
        <NavigationFixed />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-900/40">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">My Private Deal Rooms</h1>
              <p className="text-gray-400 text-sm">Secure escrow trades — visible only to you, your counterpart, and admin.</p>
            </div>
          </div>

          <div className="flex justify-end mb-6">
            <Link href="/p2p-hub">
              <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" data-testid="button-back-p2p-hub">P2P Market</Button>
            </Link>
          </div>

          <div className="space-y-4">
            {(deals as any[]).length === 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-16 text-center">
                <Lock className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold mb-1">No active deal rooms</p>
                <p className="text-gray-600 text-sm mb-4">Accept a listing in the P2P market to open your first private deal room.</p>
                <Link href="/p2p-hub"><Button className="bg-violet-600 hover:bg-violet-700" data-testid="button-goto-market">Browse P2P Market</Button></Link>
              </div>
            )}
            {(deals as any[]).map((deal: any) => (
              <div key={deal.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex items-center justify-between gap-4 flex-wrap hover:border-violet-700/50 transition-colors" data-testid={`card-p2p-deal-${deal.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-900/50 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">{deal.listing?.title || "P2P Deal"}</h2>
                    <p className="text-sm text-gray-400">
                      Buyer:{" "}
                      <Link href={`/profile/${deal.buyer?.id}`} className="hover:underline text-violet-300">{deal.buyer?.username || deal.buyer?.firstName}</Link>
                      {" "}· Seller:{" "}
                      <Link href={`/profile/${deal.seller?.id}`} className="hover:underline text-violet-300">{deal.seller?.username || deal.seller?.firstName}</Link>
                    </p>
                    <p className="text-sm font-semibold text-violet-300 mt-0.5">{money(deal.totalAmount, deal.currency)} total · {money(deal.fee, deal.currency)} fee</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`capitalize font-semibold ${statusColors[deal.status] || "bg-gray-800 text-gray-400 border-gray-700"}`}>
                    {deal.status === "pending" && deal.paymentMarkedAt ? "Under Review" : deal.status}
                  </Badge>
                  <Link href={`/p2p-deals/${deal.id}`}>
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white" data-testid={`button-open-deal-${deal.id}`}>Enter Room</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  /* ── LOADING ── */
  if (isLoading || !tx) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Entering secure deal room...</p>
        </div>
      </div>
    );
  }

  const isBuyer  = tx.buyerId  === (user as any)?.id;
  const isSeller = tx.sellerId === (user as any)?.id;
  const guidance = getAIGuidance(tx, isBuyer, isSeller);

  const statusLabel: Record<string, string> = {
    pending:   tx.paymentMarkedAt ? "Under Review" : "Awaiting Payment",
    funded:    "Funds in Escrow",
    delivered: "Delivered",
    completed: "Completed",
    disputed:  "Disputed",
    refunded:  "Refunded",
  };
  const statusColors: Record<string, string> = {
    pending:   tx.paymentMarkedAt ? "bg-amber-900/40 text-amber-300 border-amber-700" : "bg-yellow-900/40 text-yellow-300 border-yellow-700",
    funded:    "bg-blue-900/40 text-blue-300 border-blue-700",
    delivered: "bg-indigo-900/40 text-indigo-300 border-indigo-700",
    completed: "bg-green-900/40 text-green-300 border-green-700",
    disputed:  "bg-red-900/40 text-red-300 border-red-700",
    refunded:  "bg-gray-800/60 text-gray-400 border-gray-700",
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <NavigationFixed />
      {showConfirmModal && (
        <ConfirmReceiptModal
          type={tx.transactionType}
          isPending={confirmReceived.isPending}
          onConfirm={() => confirmReceived.mutate()}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Deal Header */}
        <div className="mb-6 rounded-2xl border border-violet-800/40 bg-gradient-to-r from-violet-950/60 to-gray-900/80 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <Link href="/p2p-deals">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-1.5 -ml-2" data-testid="button-back-deals">
                <ArrowLeft className="w-4 h-4" /> My Deals
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">Secure Room Active</span>
            </div>
          </div>

          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-xl shadow-purple-900/40">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-black text-white" data-testid="text-deal-title">
                  {tx.listing?.title || "P2P Deal"}
                </h1>
                <Badge variant="outline" className={`capitalize font-semibold ${statusColors[tx.status] || "bg-gray-800 text-gray-400"}`} data-testid="status-deal">
                  {statusLabel[tx.status] || tx.status}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm capitalize">
                {tx.transactionType} trade · via {tx.listing?.paymentMethod}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-xs text-gray-600 font-mono">
                  Room ID: {showRoomId ? tx.id : "••••••••••••••••"}
                </span>
                <button onClick={() => setShowRoomId(s => !s)} className="text-gray-600 hover:text-gray-400 transition-colors">
                  {showRoomId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <DealProgress status={tx.status} paymentMarkedAt={tx.paymentMarkedAt} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT column: AI guidance + main action + chat */}
          <div className="lg:col-span-2 space-y-5">

            {/* AI Guidance Banner */}
            {guidance && <AIGuidanceBanner guidance={guidance} />}

            {/* ── BUYER PENDING: Checkout or Under Review ── */}
            {isBuyer && tx.status === "pending" && !tx.paymentMarkedAt && (
              <CheckoutPanel tx={tx} isPending={markPaid.isPending} onSubmit={(note, proof) => markPaid.mutate({ note, proof })} />
            )}
            {isBuyer && tx.status === "pending" && tx.paymentMarkedAt && (
              <PaymentUnderReview tx={tx} />
            )}

            {/* ── SELLER PENDING: waiting ── */}
            {isSeller && tx.status === "pending" && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 text-center" data-testid="panel-seller-waiting">
                <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold">Waiting for buyer payment</p>
                <p className="text-gray-600 text-sm mt-1">
                  {tx.paymentMarkedAt
                    ? "Buyer submitted payment proof. Admin is confirming. You'll be notified when ready."
                    : "Buyer has not yet sent payment to escrow. You'll be notified when confirmed."}
                </p>
              </div>
            )}

            {/* ── FUNDED ── */}
            {tx.status === "funded" && (
              <>
                {isBuyer && <EscrowFundedBanner tx={tx} />}
                {isSeller && (
                  <div className="rounded-2xl border border-blue-800/40 bg-blue-950/20 p-5 space-y-4" data-testid="panel-deliver">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-2xl bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">Deliver your offer</h3>
                        <p className="text-blue-400 text-sm">Funds are secured — deliver now</p>
                      </div>
                    </div>

                    {/* Shipping address for physical products */}
                    {tx.listing?.productSubtype === "physical" && tx.shippingAddress && (
                      <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/40 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <p className="text-emerald-300 text-sm font-bold">Buyer's Shipping Address</p>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{tx.shippingAddress}</p>
                      </div>
                    )}

                    {/* Buyer's wallet for crypto delivery */}
                    {tx.transactionType === "crypto" && tx.buyerCryptoWallet && (
                      <div className="rounded-xl bg-gray-800 border border-gray-700 p-3">
                        <p className="text-xs text-gray-500 mb-1.5">Buyer's wallet (send crypto here)</p>
                        <p className="font-mono text-xs text-green-300 break-all">{tx.buyerCryptoWallet}</p>
                      </div>
                    )}

                    <Textarea
                      value={deliveryNote}
                      onChange={e => setDeliveryNote(e.target.value)}
                      placeholder={
                        tx.transactionType === "crypto"
                          ? "Enter the transaction hash and wallet address you sent to..."
                          : tx.listing?.productSubtype === "physical"
                          ? "Enter tracking number, courier name, and expected delivery date..."
                          : tx.transactionType === "product"
                          ? "Enter download link, license key, or access details..."
                          : "Describe the completed work, access details, or file links..."
                      }
                      rows={4}
                      className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 text-sm"
                      data-testid="input-delivery-note"
                    />
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      onClick={() => deliver.mutate()}
                      disabled={deliver.isPending || !deliveryNote.trim()}
                      data-testid="button-deliver"
                    >
                      {deliver.isPending ? "Submitting..." : <><Truck className="w-4 h-4 mr-2" />Confirm Delivery</>}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* ── DELIVERED ── */}
            {tx.status === "delivered" && (
              <div className="rounded-2xl border border-indigo-800/40 bg-indigo-950/20 p-5 space-y-4" data-testid="panel-delivered">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Seller submitted delivery</h3>
                    <p className="text-indigo-400 text-sm">{tx.deliveredAt ? format(new Date(tx.deliveredAt), "dd MMM yyyy, HH:mm") : ""}</p>
                  </div>
                </div>
                {tx.deliveryNote && (
                  <div className="rounded-xl bg-gray-800 border border-gray-700 p-3">
                    <p className="text-xs text-gray-500 mb-1">Delivery details from seller</p>
                    <p className="text-gray-200 text-sm leading-relaxed">{tx.deliveryNote}</p>
                  </div>
                )}
                {isBuyer && !tx.buyerConfirmedAt && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setShowConfirmModal(true)}
                    data-testid="button-confirm-received"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Confirm I Received This
                  </Button>
                )}
                {isBuyer && tx.buyerConfirmedAt && (
                  <div className="rounded-xl bg-green-900/20 border border-green-800/40 p-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <p className="text-green-300 text-sm font-semibold">You confirmed receipt — admin will release funds shortly.</p>
                  </div>
                )}
                {isSeller && (
                  <div className="rounded-xl bg-gray-800 border border-gray-700 p-3 text-center">
                    <p className="text-gray-400 text-sm">
                      {tx.buyerConfirmedAt
                        ? "✓ Buyer confirmed receipt. Admin releasing funds..."
                        : "Waiting for buyer to confirm receipt..."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── COMPLETED ── */}
            {tx.status === "completed" && (
              <div className="rounded-2xl border border-green-800/40 bg-green-950/20 p-8 text-center" data-testid="panel-completed">
                <div className="w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-white font-black text-xl mb-1">Deal Complete!</h3>
                <p className="text-green-400 text-sm mb-4">Funds have been released. Thank you for trading on Taskdrip.</p>
                {tx.releasedAt && <p className="text-gray-600 text-xs">Completed {format(new Date(tx.releasedAt), "dd MMM yyyy, HH:mm")}</p>}
              </div>
            )}

            {/* ── REFUNDED ── */}
            {tx.status === "refunded" && (
              <div className="rounded-2xl border border-gray-700 bg-gray-800/40 p-6 text-center" data-testid="panel-refunded">
                <p className="text-gray-300 font-bold text-lg mb-1">Transaction Refunded</p>
                <p className="text-gray-500 text-sm">Admin issued a refund for this transaction.</p>
                {tx.adminNote && <p className="text-gray-400 text-sm mt-2 italic">"{tx.adminNote}"</p>}
                {isBuyer && tx.buyerCryptoWallet && (
                  <div className="mt-4 rounded-xl bg-gray-800 border border-gray-700 p-3 text-left">
                    <p className="text-xs text-gray-500 mb-1">Refund sent to your wallet</p>
                    <p className="font-mono text-xs text-green-300 break-all">{tx.buyerCryptoWallet}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── DISPUTED ── */}
            {tx.status === "disputed" && (
              <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-5" data-testid="panel-disputed">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <div>
                    <p className="text-red-300 font-bold">Dispute in progress</p>
                    <p className="text-red-400/70 text-sm">Admin is reviewing — use chat to provide evidence.</p>
                  </div>
                </div>
                {tx.disputeReason && (
                  <div className="rounded-xl bg-red-900/20 border border-red-800/30 p-3">
                    <p className="text-xs text-red-500 mb-1">Dispute reason</p>
                    <p className="text-red-300 text-sm">{tx.disputeReason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Private Chat */}
            <Card className="border-gray-800 bg-gray-900 shadow-none">
              <CardHeader className="border-b border-gray-800 pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <MessageCircle className="w-5 h-5 text-violet-400" /> Private Deal Room Chat
                </CardTitle>
                <CardDescription className="text-gray-500 text-xs">Only visible to buyer, seller, and admin</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-80 overflow-y-auto bg-gray-950 rounded-xl border border-gray-800 p-3 space-y-2">
                  {(messages as any[]).length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Lock className="w-10 h-10 text-gray-800 mb-2" />
                      <p className="text-gray-600 text-sm">No messages yet.</p>
                    </div>
                  )}
                  {(messages as any[]).map((m: any) => {
                    const mine = m.senderId === (user as any)?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-violet-600 text-white" : "bg-gray-800 border border-gray-700 text-gray-200"}`} data-testid={`message-p2p-${m.id}`}>
                          <p>{m.content}</p>
                          {m.attachmentUrl && (
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="underline text-xs block mt-1 opacity-80">View attachment</a>
                          )}
                          <p className={`text-[10px] mt-1 ${mine ? "text-violet-200" : "text-gray-500"}`}>
                            {m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type a secure message..."
                    className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 focus:border-violet-600"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (message.trim()) sendMessage.mutate(); } }}
                    data-testid="input-p2p-message"
                  />
                  <Input type="file" onChange={e => setAttachment(e.target.files?.[0] || null)} className="bg-gray-900 border-gray-700 text-gray-400 text-xs" data-testid="input-p2p-attachment" />
                  <Button onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || (!message.trim() && !attachment)} className="bg-violet-600 hover:bg-violet-700" data-testid="button-send-p2p-message">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT column: financials + dispute + participants */}
          <div className="space-y-5">

            {/* Financial summary */}
            <Card className="border-gray-800 bg-gray-900 shadow-none">
              <CardHeader className="border-b border-gray-800 pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Wallet className="w-4 h-4 text-violet-400" /> Deal Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {[
                  { label: "Offer Amount", val: money(tx.amount, tx.currency), color: "text-white" },
                  { label: "Buyer Fee", val: money(tx.buyerFee ?? tx.fee, tx.currency), color: "text-violet-400" },
                  Number(tx.sellerFee || 0) > 0 ? { label: "Seller Fee", val: money(tx.sellerFee, tx.currency), color: "text-orange-400" } : null,
                  { label: "Total to Send", val: money(tx.totalAmount, tx.currency), color: "text-green-400" },
                  { label: "Seller Receives", val: money(tx.netAmount, tx.currency), color: "text-blue-400" },
                ].filter(Boolean).map((item: any) => (
                  <div key={item.label} className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{item.label}</span>
                    <span className={`font-bold ${item.color}`}>{item.val}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-sm border-t border-gray-800 pt-3">
                  <span className="text-gray-500">Currency</span>
                  <span className="font-bold text-yellow-400 flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{tx.currency || "USD"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Wallet info card */}
            {(tx.sellerCryptoWallet || tx.buyerCryptoWallet || tx.shippingAddress) && (
              <Card className="border-gray-800 bg-gray-900 shadow-none">
                <CardHeader className="border-b border-gray-800 pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-white">
                    <Coins className="w-4 h-4 text-yellow-400" /> Trade Wallets & Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {tx.sellerCryptoWallet && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Seller's Receiving Wallet</p>
                      <p className="font-mono text-xs text-green-300 break-all">{tx.sellerCryptoWallet}</p>
                    </div>
                  )}
                  {isSeller && tx.buyerCryptoWallet && (
                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-xs text-gray-500 mb-1">Buyer's Refund Wallet</p>
                      <p className="font-mono text-xs text-blue-300 break-all">{tx.buyerCryptoWallet}</p>
                    </div>
                  )}
                  {tx.shippingAddress && (
                    <div className="border-t border-gray-800 pt-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <p className="text-xs text-gray-500">Shipping Address</p>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{tx.shippingAddress}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dispute section */}
            {!["completed", "refunded", "cancelled", "disputed"].includes(tx.status) && (isBuyer || isSeller) && (
              <Card className="border-gray-800 bg-gray-900 shadow-none">
                <CardHeader className="border-b border-gray-800 pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-gray-400">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Problem with this deal?
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <Textarea
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={3}
                    className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 text-sm"
                    data-testid="input-dispute-reason"
                  />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => dispute.mutate()}
                    disabled={!disputeReason.trim() || dispute.isPending}
                    data-testid="button-open-dispute"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Open Dispute
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <Card className="border-gray-800 bg-gray-900 shadow-none">
              <CardHeader className="pb-3 border-b border-gray-800">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Package className="w-4 h-4 text-gray-400" /> Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pt-4">
                {[
                  { label: "Buyer",  value: tx.buyer?.username  || tx.buyer?.firstName  || "—", id: tx.buyer?.id,  tag: isBuyer  ? "you" : "" },
                  { label: "Seller", value: tx.seller?.username || tx.seller?.firstName || "—", id: tx.seller?.id, tag: isSeller ? "you" : "" },
                  { label: "Admin",  value: tx.admin?.username  || tx.admin?.firstName  || "Platform admin", id: null, tag: "" },
                ].map(({ label, value, id, tag }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">{label}{tag ? ` (${tag})` : ""}</p>
                      {id ? (
                        <Link href={`/profile/${id}`}>
                          <p className="text-white font-semibold hover:underline cursor-pointer">{value}</p>
                        </Link>
                      ) : (
                        <p className="text-white font-semibold">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* WhatsApp admin alert */}
            <a href={`https://wa.me/12016800266?text=P2P%20Transaction%20Alert%20${encodeURIComponent(tx.id)}`} target="_blank" rel="noreferrer">
              <Button variant="outline" className="w-full border-gray-700 text-gray-400 hover:bg-gray-800" data-testid="button-whatsapp-alert">
                WhatsApp Admin Alert
              </Button>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
