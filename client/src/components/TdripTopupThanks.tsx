import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Phone, MessageCircle, ExternalLink, Copy, Check,
  Upload, ImageIcon, X, Loader2, RotateCcw,
} from "lucide-react";
import { SOCIALS } from "@/config/socials";

export interface TdripTopupReceipt {
  topupId: string;
  points: number;
  usd: string;
  network: string;
  address: string;
  txHash: string;
  credited: boolean;
}

interface Props {
  receipt: TdripTopupReceipt;
  contextLabel?: string;
  onReset: () => void;
  testIdPrefix?: string;
}

export function TdripTopupThanks({ receipt, contextLabel, onReset, testIdPrefix = "tdrip-thanks" }: Props) {
  const { toast } = useToast();
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!screenshot) throw new Error("Choose a screenshot first");
      const fd = new FormData();
      fd.append("transactionHash", receipt.txHash);
      fd.append("network", receipt.network);
      fd.append("paymentProof", screenshot);
      const res = await fetch(`/api/tdrip/topups/${receipt.topupId}/submit-proof`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Screenshot uploaded", description: "Our team can verify your payment faster now." });
      setScreenshot(null);
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const copy = (val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const buildWhatsapp = () => {
    const lines = [
      "Hi Taskdrip! 👋",
      "",
      "I just topped up my $TDRIP wallet — please confirm:",
      "",
      `💎 Amount: ${receipt.points.toLocaleString()} $TDRIP ($${receipt.usd} USDT)`,
      `💳 Network: ${(receipt.network || "crypto").toUpperCase()}`,
      `🔗 Tx Hash: ${receipt.txHash}`,
      `📌 Top-up ID: ${(receipt.topupId || "").slice(0, 8).toUpperCase()}`,
    ];
    if (contextLabel) lines.push(`📝 Purpose: ${contextLabel}`);
    lines.push("", "Thanks! 🙏");
    return `${SOCIALS.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return (
    <div
      className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 p-5 space-y-4"
      data-testid={`${testIdPrefix}-panel`}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${
            receipt.credited ? "bg-emerald-500" : "bg-amber-500"
          }`}
        >
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-extrabold text-gray-900">
          {receipt.credited ? "🎉 You're all set!" : "Thanks — almost there!"}
        </h3>
        <p className="text-sm text-gray-600 mt-1 max-w-md">
          {receipt.credited
            ? `${receipt.points.toLocaleString()} $TDRIP has been credited to your wallet.`
            : `We've received your reference for ${receipt.points.toLocaleString()} $TDRIP. Verification typically takes a few minutes.`}
        </p>
      </div>

      <div className="rounded-xl bg-white border border-gray-200 p-3 text-xs space-y-1.5" data-testid={`${testIdPrefix}-receipt`}>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Top-up ID</span>
          <span className="font-mono font-semibold text-gray-900">{(receipt.topupId || "").slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Amount</span>
          <span className="font-semibold text-gray-900">${receipt.usd} USDT · {receipt.points.toLocaleString()} $TDRIP</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Network</span>
          <span className="font-semibold text-gray-900">{(receipt.network || "—").toUpperCase()}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">Tx Hash</span>
          <button
            onClick={() => copy(receipt.txHash)}
            className="text-right font-mono text-[10px] break-all text-violet-700 hover:underline"
            data-testid={`${testIdPrefix}-copy-tx`}
          >
            {receipt.txHash}
            {copied ? (
              <Check className="inline w-3 h-3 ml-1 text-emerald-600" />
            ) : (
              <Copy className="inline w-3 h-3 ml-1 opacity-50" />
            )}
          </button>
        </div>
        <Badge
          className={`mt-1 w-full justify-center ${
            receipt.credited
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
              : "bg-amber-100 text-amber-800 border border-amber-200"
          }`}
        >
          {receipt.credited ? "Credited" : "Pending verification"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={buildWhatsapp()}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-2.5 transition font-semibold text-sm"
          data-testid={`${testIdPrefix}-whatsapp`}
        >
          <Phone className="h-5 w-5 flex-shrink-0" />
          <div className="leading-tight">
            <div className="text-[10px] opacity-80">Notify us on WhatsApp</div>
            <div>{SOCIALS.whatsappNumber}</div>
          </div>
          <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-70" />
        </a>
        <a
          href="/messages"
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2.5 transition font-semibold text-sm"
          data-testid={`${testIdPrefix}-chat`}
        >
          <MessageCircle className="h-5 w-5 flex-shrink-0" />
          <div className="leading-tight">
            <div className="text-[10px] opacity-80">In-app support chat</div>
            <div>Message Admin</div>
          </div>
        </a>
      </div>

      <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-3">
        <p className="text-xs font-semibold text-violet-900 flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4" /> Upload payment screenshot {receipt.credited ? "(optional)" : "(speeds up verification)"}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
          data-testid={`${testIdPrefix}-file`}
        />
        {screenshot ? (
          <div className="mt-2 flex items-center gap-2">
            <Badge className="bg-white border border-violet-200 text-violet-800 truncate max-w-[180px]">
              {screenshot.name}
            </Badge>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-500" onClick={() => setScreenshot(null)}>
              <X className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="ml-auto bg-violet-600 hover:bg-violet-700 text-white h-8"
              onClick={() => upload.mutate()}
              disabled={upload.isPending}
              data-testid={`${testIdPrefix}-upload`}
            >
              {upload.isPending ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading</>
              ) : (
                <><Upload className="w-3 h-3 mr-1" /> Upload</>
              )}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 w-full border-violet-300 text-violet-700 hover:bg-violet-100"
            onClick={() => fileRef.current?.click()}
            data-testid={`${testIdPrefix}-pick`}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Choose screenshot
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onReset}
          data-testid={`${testIdPrefix}-topup-more`}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Top up more
        </Button>
        <Button
          type="button"
          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
          onClick={onReset}
          data-testid={`${testIdPrefix}-done`}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
