import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Percent, Users, ShoppingBag, Briefcase, Info } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  crypto:  { icon: Percent,     color: "text-orange-500", bg: "bg-orange-500/10", label: "Crypto" },
  product: { icon: ShoppingBag, color: "text-blue-500",   bg: "bg-blue-500/10",   label: "Physical / Digital Products" },
  service: { icon: Briefcase,   color: "text-purple-500", bg: "bg-purple-500/10", label: "Services" },
};

function FeeSection({
  title, feeTypeKey, feeValueKey, minFeeKey, maxFeeKey, draft, onChange, testPrefix, description,
}: {
  title: string; feeTypeKey: string; feeValueKey: string; minFeeKey: string; maxFeeKey: string;
  draft: any; onChange: (k: string, v: any) => void; testPrefix: string; description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 space-y-3 bg-gray-50">
      <p className="font-bold text-sm text-gray-700 flex items-center gap-1.5">
        <Users className="w-4 h-4" />{title}
        <span className="text-xs font-normal text-gray-400 ml-1">— {description}</span>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500">Fee type</Label>
          <select
            value={draft[feeTypeKey] || "percentage"}
            onChange={e => onChange(feeTypeKey, e.target.value)}
            className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            data-testid={`${testPrefix}-type`}
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Value {draft[feeTypeKey] === "fixed" ? "(fixed)" : "(%)"}</Label>
          <Input
            type="number" step="0.01" min="0"
            value={draft[feeValueKey] ?? "0"}
            onChange={e => onChange(feeValueKey, e.target.value)}
            className="mt-1 text-sm"
            data-testid={`${testPrefix}-value`}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Min fee</Label>
          <Input
            type="number" step="0.01" min="0"
            value={draft[minFeeKey] ?? "0"}
            onChange={e => onChange(minFeeKey, e.target.value)}
            className="mt-1 text-sm"
            data-testid={`${testPrefix}-min`}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Max fee (blank = no cap)</Label>
          <Input
            type="number" step="0.01" min="0"
            value={draft[maxFeeKey] ?? ""}
            placeholder="No cap"
            onChange={e => onChange(maxFeeKey, e.target.value)}
            className="mt-1 text-sm"
            data-testid={`${testPrefix}-max`}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminP2PFees() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const { data: configs = [] } = useQuery<any[]>({ queryKey: ["/api/admin/p2p-fees"] });

  const updateFee = useMutation({
    mutationFn: ({ type, values }: { type: string; values: any }) =>
      apiRequest("PATCH", `/api/admin/p2p-fees/${type}`, values).then(r => r.json()),
    onSuccess: (_, vars) => {
      toast({ title: "Fee updated!", description: `${vars.type} fees have been saved.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-fees"] });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const getDraft = (config: any) => drafts[config.transactionType] || { ...config };
  const setDraft = (type: string, key: string, val: any) =>
    setDrafts(d => ({ ...d, [type]: { ...(d[type] || {}), [key]: val } }));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/admin/p2p-transactions">
          <Button variant="outline" className="mb-5" data-testid="button-back-admin-p2p">
            <ArrowLeft className="w-4 h-4 mr-2" /> P2P Admin
          </Button>
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">P2P Fee Configuration</h1>
          <p className="text-gray-500 mt-1">Set unique fees for each trade type — choose who pays what: buyer, seller, or both. All fees are applied at deal creation.</p>
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3 mb-6">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Buyer fee</strong> is added on top of the listing price — the buyer pays amount + buyer fee.</p>
            <p><strong>Seller fee</strong> is deducted from the seller's payout — the seller receives amount − seller fee.</p>
            <p>Set either or both. Setting both to 0 means no fees for that trade type.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {(configs as any[]).map((config: any) => {
            const draft = getDraft(config);
            const meta = TYPE_ICONS[config.transactionType] || TYPE_ICONS.service;
            const TypeIcon = meta.icon;
            const buyerVal = Number(draft.buyerFeeValue || 0).toFixed(2);
            const sellerVal = Number(draft.sellerFeeValue || 0).toFixed(2);

            return (
              <Card key={config.transactionType} className="border-gray-200 shadow-sm" data-testid={`card-p2p-fee-${config.transactionType}`}>
                <CardHeader className="border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                      <TypeIcon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg capitalize">{meta.label}</CardTitle>
                      <CardDescription>
                        Current: Buyer {config.buyerFeeType === "fixed" ? "" : ""}{buyerVal}{config.buyerFeeType === "percentage" ? "%" : " (fixed)"} &nbsp;·&nbsp;
                        Seller {sellerVal}{config.sellerFeeType === "percentage" ? "%" : " (fixed)"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FeeSection
                      title="Buyer Fee"
                      description="added to the buyer's total"
                      feeTypeKey="buyerFeeType"
                      feeValueKey="buyerFeeValue"
                      minFeeKey="buyerMinFee"
                      maxFeeKey="buyerMaxFee"
                      draft={draft}
                      onChange={(k, v) => setDraft(config.transactionType, k, v)}
                      testPrefix={`buyer-${config.transactionType}`}
                    />
                    <FeeSection
                      title="Seller Fee"
                      description="deducted from seller's payout"
                      feeTypeKey="sellerFeeType"
                      feeValueKey="sellerFeeValue"
                      minFeeKey="sellerMinFee"
                      maxFeeKey="sellerMaxFee"
                      draft={draft}
                      onChange={(k, v) => setDraft(config.transactionType, k, v)}
                      testPrefix={`seller-${config.transactionType}`}
                    />
                  </div>

                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    onClick={() => updateFee.mutate({ type: config.transactionType, values: draft })}
                    disabled={updateFee.isPending}
                    data-testid={`button-save-fee-${config.transactionType}`}
                  >
                    Save {meta.label} Fees
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
