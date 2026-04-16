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
import { ArrowLeft, Settings } from "lucide-react";

export default function AdminPlatformFees() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const { data: fees = [] } = useQuery<any[]>({ queryKey: ["/api/admin/platform-fees"] });

  const updateFee = useMutation({
    mutationFn: ({ name, values }: { name: string; values: any }) => apiRequest("PATCH", `/api/admin/platform-fees/${name}`, values).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Platform fee updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-fees"] });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const labels: Record<string, string> = {
    campaign_fee: "Campaign fee",
    withdrawal_fee: "Withdrawal fee",
    listing_fee: "Listing fee",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/admin/p2p-transactions"><Button variant="outline" className="mb-5" data-testid="button-back-admin-p2p"><ArrowLeft className="w-4 h-4 mr-2" /> P2P Admin</Button></Link>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Platform Fee Settings</h1>
          <p className="text-gray-500">Adjust general platform fees without changing code.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {fees.map((fee: any) => {
            const draft = drafts[fee.name] || fee;
            return (
              <Card key={fee.name} data-testid={`card-platform-fee-${fee.name}`}>
                <CardHeader>
                  <CardTitle className="capitalize flex items-center gap-2"><Settings className="w-5 h-5 text-purple-600" /> {labels[fee.name] || fee.name.replace(/_/g, " ")}</CardTitle>
                  <CardDescription>Current {fee.feeType}: {fee.value}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Fee type</Label>
                    <select value={draft.feeType} onChange={e => setDrafts(d => ({ ...d, [fee.name]: { ...draft, feeType: e.target.value } }))} className="w-full mt-1 border rounded-lg p-2" data-testid={`select-platform-fee-type-${fee.name}`}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input type="number" value={draft.value} onChange={e => setDrafts(d => ({ ...d, [fee.name]: { ...draft, value: e.target.value } }))} data-testid={`input-platform-fee-value-${fee.name}`} />
                  </div>
                  <Button className="w-full" onClick={() => updateFee.mutate({ name: fee.name, values: draft })} disabled={updateFee.isPending} data-testid={`button-save-platform-fee-${fee.name}`}>Save</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
