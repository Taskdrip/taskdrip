import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Check, Upload, Loader2, Wallet, ArrowRight, Shield, CheckCircle } from "lucide-react";

interface CryptoCheckoutProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  purpose: string;
  description?: string;
  campaignId?: string;
  productId?: string;
  feature?: string;
  onSuccess?: () => void;
}

const NETWORK_META: Record<string, { label: string; icon: string; color: string; selectedColor: string; badge: string; fee: string; time: string }> = {
  ton: { label: "USDT (TON)", icon: "🔵", color: "border-blue-200 bg-blue-50", selectedColor: "border-blue-500 bg-blue-50 ring-2 ring-blue-400", badge: "bg-blue-100 text-blue-700", fee: "~$0.01", time: "30 sec" },
  "ton-usdt": { label: "USDT (TON)", icon: "🔵", color: "border-blue-200 bg-blue-50", selectedColor: "border-blue-500 bg-blue-50 ring-2 ring-blue-400", badge: "bg-blue-100 text-blue-700", fee: "~$0.01", time: "30 sec" },
  tron: { label: "USDT (TRC-20)", icon: "🔴", color: "border-red-200 bg-red-50", selectedColor: "border-red-500 bg-red-50 ring-2 ring-red-400", badge: "bg-red-100 text-red-700", fee: "~$1", time: "1-3 min" },
  "trc-20": { label: "USDT (TRC-20)", icon: "🔴", color: "border-red-200 bg-red-50", selectedColor: "border-red-500 bg-red-50 ring-2 ring-red-400", badge: "bg-red-100 text-red-700", fee: "~$1", time: "1-3 min" },
  bsc: { label: "USDT (BEP-20)", icon: "🟡", color: "border-yellow-200 bg-yellow-50", selectedColor: "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-400", badge: "bg-yellow-100 text-yellow-700", fee: "~$0.2", time: "3-5 min" },
  "bep-20": { label: "USDT (BEP-20)", icon: "🟡", color: "border-yellow-200 bg-yellow-50", selectedColor: "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-400", badge: "bg-yellow-100 text-yellow-700", fee: "~$0.2", time: "3-5 min" },
  pi: { label: "Pi Network", icon: "🟣", color: "border-purple-200 bg-purple-50", selectedColor: "border-purple-500 bg-purple-50 ring-2 ring-purple-400", badge: "bg-purple-100 text-purple-700", fee: "Near zero", time: "Instant" },
  "pi-network": { label: "Pi Network", icon: "🟣", color: "border-purple-200 bg-purple-50", selectedColor: "border-purple-500 bg-purple-50 ring-2 ring-purple-400", badge: "bg-purple-100 text-purple-700", fee: "Near zero", time: "Instant" },
};

function getNetworkMeta(method: any) {
  const key = (method.network || "").toLowerCase().replace(/\s/g, "-");
  return NETWORK_META[key] || {
    label: method.label || method.currency || "Crypto",
    icon: "🪙",
    color: "border-gray-200 bg-gray-50",
    selectedColor: "border-gray-500 bg-gray-50 ring-2 ring-gray-400",
    badge: "bg-gray-100 text-gray-700",
    fee: "Varies",
    time: "Varies",
  };
}

type Step = "select" | "pay" | "confirm" | "done";

export function CryptoCheckoutModal({
  open,
  onClose,
  amount,
  purpose,
  description,
  campaignId,
  productId,
  feature = "campaigns",
  onSuccess,
}: CryptoCheckoutProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: allMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", feature],
    queryFn: () => fetch(`/api/payment-methods?feature=${feature}`, { credentials: "include" }).then(r => r.json()),
  });

  // Only show crypto methods in this modal
  const methods = allMethods.filter((m: any) => m.type === "crypto" && m.isActive !== false);

  const selectedMethod = methods.find((m: any) => m.id === selectedMethodId) || methods[0];
  const networkMeta = selectedMethod ? getNetworkMeta(selectedMethod) : null;

  const copyAddress = () => {
    if (selectedMethod?.address) {
      navigator.clipboard.writeText(selectedMethod.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const submitPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/payment-deposits", data);
      return await res.json();
    },
    onSuccess: () => {
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Payment submission failed", variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmitPayment = async () => {
    if (!txHash && !proofFile) {
      toast({ title: "Required", description: "Please provide a transaction hash or screenshot proof", variant: "destructive" });
      return;
    }
    setUploading(true);
    let proofUrl = "";
    if (proofFile) {
      const formData = new FormData();
      formData.append("file", proofFile);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        proofUrl = data.url || "";
      } catch (_) {}
    }
    setUploading(false);
    submitPaymentMutation.mutate({
      amount: amount.toFixed(2),
      network: selectedMethod?.network || "",
      walletAddress: selectedMethod?.address || "",
      transactionHash: txHash || undefined,
      paymentProof: proofUrl || undefined,
      campaignId: campaignId || undefined,
      status: "submitted",
    });
  };

  const handleClose = () => {
    setStep("select");
    setSelectedMethodId("");
    setTxHash("");
    setProofFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-black text-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold">Crypto Payment</DialogTitle>
              <p className="text-white/70 text-xs">{purpose}</p>
            </div>
          </div>
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-white/70 text-sm">Amount Due</span>
            <div className="text-right">
              <div className="text-2xl font-black text-white">${amount.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Step: Select Network */}
          {step === "select" && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Choose payment network:</p>
              {methods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No crypto payment methods configured.</p>
                  <p className="text-xs text-gray-400 mt-1">Please contact the admin.</p>
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {methods.map((method: any) => {
                    const meta = getNetworkMeta(method);
                    const isSelected = (selectedMethodId === method.id) || (!selectedMethodId && methods[0]?.id === method.id);
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethodId(method.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? meta.selectedColor : meta.color + " hover:border-gray-300"}`}
                        data-testid={`select-network-${method.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{meta.icon}</span>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{method.label}</div>
                              <div className="text-xs text-gray-500">
                                {method.network && <span className="mr-2">{method.network}</span>}
                                Fee {meta.fee} · {meta.time}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {method.address ? (
                              <Badge className={`text-xs border-0 ${meta.badge}`}>Available</Badge>
                            ) : (
                              <Badge className="text-xs border-0 bg-gray-100 text-gray-400">No wallet</Badge>
                            )}
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {description && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600">
                  <span className="font-semibold">Note: </span>{description}
                </div>
              )}

              <Button
                className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-12 font-semibold"
                onClick={() => setStep("pay")}
                disabled={methods.length === 0 || !selectedMethod?.address}
                data-testid="button-continue-payment"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step: Pay */}
          {step === "pay" && networkMeta && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep("select")} className="text-gray-400 hover:text-black text-sm">← Back</button>
                <span className="text-sm text-gray-500">Send payment to:</span>
              </div>

              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${networkMeta.badge}`}>
                {networkMeta.icon} {selectedMethod?.label}
              </div>

              {selectedMethod?.address ? (
                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-medium mb-1 block">
                    {selectedMethod.network === "Pi" || selectedMethod.network === "pi" ? "Pi Wallet / Username" : "Wallet Address"}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-xs text-gray-800 break-all select-all">
                      {selectedMethod.address}
                    </div>
                    <button
                      onClick={copyAddress}
                      className="px-3 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                      data-testid="button-copy-address"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copied && <p className="text-xs text-green-600 mt-1">✓ Copied to clipboard</p>}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-sm text-yellow-700">
                  No wallet configured for this network. Please choose another.
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex gap-2">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Send exactly <strong>${amount.toFixed(2)} {selectedMethod?.currency || "USDT"}</strong> to the address above. After sending, click below to confirm.
                </p>
              </div>

              {selectedMethod?.instructions && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-700">
                  {selectedMethod.instructions}
                </div>
              )}

              <Button
                className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-12 font-semibold"
                onClick={() => setStep("confirm")}
                data-testid="button-ive-sent-payment"
              >
                I've Sent the Payment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep("pay")} className="text-gray-400 hover:text-black text-sm">← Back</button>
                <span className="text-sm text-gray-600 font-medium">Submit payment proof</span>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Transaction Hash / Reference (optional)</label>
                  <Input
                    placeholder="0x... or txid or Pi transaction ref..."
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="font-mono text-xs rounded-xl border-gray-200"
                    data-testid="input-tx-hash"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Payment Screenshot (optional)</label>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">{proofFile ? proofFile.name : "Click to upload screenshot"}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} data-testid="input-proof-file" />
                  </label>
                </div>
              </div>

              <Button
                className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-12 font-semibold"
                onClick={handleSubmitPayment}
                disabled={submitPaymentMutation.isPending || uploading}
                data-testid="button-submit-proof"
              >
                {(submitPaymentMutation.isPending || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Payment for Verification
              </Button>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Submitted!</h3>
              <p className="text-gray-500 text-sm mb-6">
                Your payment is under review. Our team will verify it within 1–24 hours and update your account.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Network</span>
                  <span className="font-semibold">{selectedMethod?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Pending Verification</Badge>
                </div>
              </div>
              <Button
                className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-12 font-semibold"
                onClick={handleClose}
                data-testid="button-done"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
