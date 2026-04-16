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
import { ArrowLeft, Percent } from "lucide-react";

export default function AdminP2PFees() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const { data: configs = [] } = useQuery<any[]>({ queryKey: ["/api/admin/p2p-fees"] });

  const updateFee = useMutation({
    mutationFn: ({ type, values }: { type: string; values: any }) => apiRequest("PATCH", `/api/admin/p2p-fees/${type}`, values).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Fee updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-fees"] });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const getDraft = (config: any) => drafts[config.transactionType] || config;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/admin/p2p-transactions"><Button variant="outline" className="mb-5" data-testid="button-back-admin-p2p"><ArrowLeft className="w-4 h-4 mr-2" /> P2P Admin</Button></Link>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">P2P Fee Settings</h1>
          <p className="text-gray-500">Set separate fixed or percentage escrow fees for crypto, products, and services.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {configs.map((config: any) => {
            const draft = getDraft(config);
            return (
              <Card key={config.transactionType} data-testid={`card-p2p-fee-${config.transactionType}`}>
                <CardHeader>
                  <CardTitle className="capitalize flex items-center gap-2"><Percent className="w-5 h-5 text-purple-600" /> {config.transactionType}</CardTitle>
                  <CardDescription>Current {config.feeType}: {config.feeValue}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Fee type</Label>
                    <select value={draft.feeType} onChange={e => setDrafts(d => ({ ...d, [config.transactionType]: { ...draft, feeType: e.target.value } }))} className="w-full mt-1 border rounded-lg p-2" data-testid={`select-fee-type-${config.transactionType}`}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <Label>Fee value</Label>
                    <Input type="number" value={draft.feeValue} onChange={e => setDrafts(d => ({ ...d, [config.transactionType]: { ...draft, feeValue: e.target.value } }))} data-testid={`input-fee-value-${config.transactionType}`} />
                  </div>
                  <div>
                    <Label>Minimum fee</Label>
                    <Input type="number" value={draft.minFee || "0"} onChange={e => setDrafts(d => ({ ...d, [config.transactionType]: { ...draft, minFee: e.target.value } }))} data-testid={`input-min-fee-${config.transactionType}`} />
                  </div>
                  <div>
                    <Label>Maximum fee</Label>
                    <Input type="number" value={draft.maxFee || ""} placeholder="No cap" onChange={e => setDrafts(d => ({ ...d, [config.transactionType]: { ...draft, maxFee: e.target.value } }))} data-testid={`input-max-fee-${config.transactionType}`} />
                  </div>
                  <Button className="w-full" onClick={() => updateFee.mutate({ type: config.transactionType, values: draft })} disabled={updateFee.isPending} data-testid={`button-save-fee-${config.transactionType}`}>Save Fee</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
