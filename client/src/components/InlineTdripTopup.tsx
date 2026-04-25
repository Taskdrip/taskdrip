import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Coins, Copy, Check, Loader2, Wallet, Sparkles } from "lucide-react";

interface InlineTdripTopupProps {
  suggestedPoints?: number;
  onCredited?: () => void;
  testIdPrefix?: string;
}

export function InlineTdripTopup({ suggestedPoints, onCredited, testIdPrefix = "inline-topup" }: InlineTdripTopupProps) {
  const { toast } = useToast();
  const presets = [1000, 5000, 10000, 50000];
  const initial = suggestedPoints && suggestedPoints > 0
    ? Math.max(100, Math.ceil(suggestedPoints / 100) * 100)
    : 1000;
  const [points, setPoints] = useState<string>(String(initial));
  const [methodId, setMethodId] = useState<string>("");
  const [checkout, setCheckout] = useState<any | null>(null);
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (suggestedPoints && suggestedPoints > 0) {
      setPoints(String(Math.max(100, Math.ceil(suggestedPoints / 100) * 100)));
    }
  }, [suggestedPoints]);

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "tdrip"],
    queryFn: async () => {
      const r = await fetch("/api/payment-methods?feature=tdrip", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const cryptoMethods = useMemo(
    () => (paymentMethods as any[]).filter((m) => m.type === "crypto" && m.address),
    [paymentMethods]
  );

  useEffect(() => {
    if (cryptoMethods.length > 0 && !methodId) {
      setMethodId(cryptoMethods[0].id);
    }
  }, [cryptoMethods, methodId]);

  const buyPoints = Math.max(0, Number(points || 0));
  const usdAmount = (buyPoints / 100).toFixed(2);
  const selectedMethod = cryptoMethods.find((m) => m.id === methodId);

  const startTopup = useMutation({
    mutationFn: async () => {
      if (!selectedMethod) throw new Error("Select a payment network");
      if (buyPoints < 100) throw new Error("Minimum top-up is 100 $TDRIP");
      const res = await apiRequest("POST", "/api/tdrip/topups", { points: buyPoints, paymentMethodId: selectedMethod.id });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Checkout failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCheckout(data);
      toast({ title: "Checkout created", description: "Send payment, then submit your transaction reference." });
    },
    onError: (e: Error) => toast({ title: "Checkout failed", description: e.message, variant: "destructive" }),
  });

  const submitProof = useMutation({
    mutationFn: async () => {
      if (!checkout?.transaction?.id) throw new Error("Start a checkout first");
      if (!txHash.trim()) throw new Error("Enter your transaction hash");
      const formData = new FormData();
      formData.append("transactionHash", txHash);
      formData.append("network", checkout.checkout?.paymentMethod?.network || selectedMethod?.network || "");
      const res = await fetch(`/api/tdrip/topups/${checkout.transaction.id}/submit-proof`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to submit");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      toast({
        title: data.credited ? "🎉 $TDRIP credited!" : "Reference submitted",
        description: data.credited
          ? `${data.points} $TDRIP added to your wallet.`
          : "Our team will verify your payment shortly.",
      });
      if (data.credited) {
        setCheckout(null);
        setTxHash("");
        onCredited?.();
      }
    },
    onError: (e: Error) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const copyAddress = (val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (cryptoMethods.length === 0) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
        <p className="font-semibold flex items-center gap-1.5"><Wallet className="h-4 w-4" /> No crypto payment methods configured</p>
        <p className="text-xs mt-1">Ask the platform admin to add a $TDRIP payment method to enable top-ups.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 p-4 space-y-3" data-testid={`${testIdPrefix}-panel`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-violet-950">Top up $TDRIP — right here</p>
            <p className="text-[11px] text-violet-700">100 $TDRIP = $1 USDT. No redirect needed.</p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-violet-500" />
      </div>

      {!checkout ? (
        <>
          <div>
            <Label className="text-xs font-semibold text-violet-900">Amount in $TDRIP</Label>
            <div className="relative mt-1">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min="100"
                step="100"
                className="pl-9 font-semibold"
                data-testid={`${testIdPrefix}-input-points`}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presets.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPoints(String(v))}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                    points === String(v) ? "bg-violet-600 text-white" : "bg-white text-violet-700 hover:bg-violet-100 border border-violet-200"
                  }`}
                  data-testid={`${testIdPrefix}-preset-${v}`}
                >
                  {v.toLocaleString()}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-violet-700 mt-2">
              You'll pay <strong>${usdAmount} USDT</strong> for <strong>{buyPoints.toLocaleString()} $TDRIP</strong>.
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-violet-900">Payment network</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="mt-1" data-testid={`${testIdPrefix}-method`}>
                <SelectValue placeholder="Choose network" />
              </SelectTrigger>
              <SelectContent>
                {cryptoMethods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} {m.network ? `· ${m.network.toUpperCase()}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            onClick={() => startTopup.mutate()}
            disabled={startTopup.isPending || buyPoints < 100 || !methodId}
            data-testid={`${testIdPrefix}-start`}
          >
            {startTopup.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating checkout...</>
            ) : (
              <>Continue · ${usdAmount} USDT</>
            )}
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-white border border-violet-200 p-3">
            <p className="text-[11px] text-violet-700 mb-1">Send exactly</p>
            <p className="text-lg font-extrabold text-violet-900">${usdAmount} USDT</p>
            <p className="text-[11px] text-violet-700 mt-2">to this {checkout.checkout?.paymentMethod?.network?.toUpperCase() || "crypto"} address:</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-[11px] bg-gray-100 rounded px-2 py-1.5 break-all font-mono" data-testid={`${testIdPrefix}-address`}>
                {checkout.checkout?.paymentMethod?.address || "—"}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => copyAddress(checkout.checkout?.paymentMethod?.address || "")}
                data-testid={`${testIdPrefix}-copy`}
              >
                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-violet-900">Transaction hash / reference</Label>
            <Input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Paste your transaction hash..."
              className="mt-1 text-xs"
              data-testid={`${testIdPrefix}-txhash`}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setCheckout(null); setTxHash(""); }}
              data-testid={`${testIdPrefix}-cancel`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => submitProof.mutate()}
              disabled={submitProof.isPending || !txHash.trim()}
              data-testid={`${testIdPrefix}-submit`}
            >
              {submitProof.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit & credit"}
            </Button>
          </div>

          <Badge className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] block text-center py-1">
            Don't close this. Your $TDRIP will appear after admin verifies the transaction.
          </Badge>
        </div>
      )}
    </div>
  );
}
