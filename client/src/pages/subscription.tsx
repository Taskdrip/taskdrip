import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, Crown, Sparkles, Zap, Clock, Upload, AlertTriangle } from "lucide-react";

const PLANS = {
  creator: {
    name: "Creator Premium",
    monthly: 7,
    yearly: 7 * 12 * 0.85,
    icon: <Sparkles className="w-8 h-8 text-purple-500" />,
    color: "from-purple-500 to-blue-500",
    features: [
      "Verified creator badge",
      "Priority campaign discovery",
      "Unlimited post uploads",
      "Advanced analytics dashboard",
      "Direct brand messaging",
      "Monthly payout requests",
      "Referral bonus multiplier",
    ],
  },
  brand: {
    name: "Brand Pro",
    monthly: 24,
    yearly: 24 * 12 * 0.85,
    icon: <Crown className="w-8 h-8 text-amber-500" />,
    color: "from-amber-500 to-orange-500",
    features: [
      "Verified brand badge",
      "Unlimited campaign creation",
      "Priority creator discovery",
      "Advanced campaign analytics",
      "Featured campaign placement",
      "Bulk creator outreach",
      "Dedicated account support",
    ],
  },
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"creator" | "brand">("creator");

  const userType = (user as any)?.userType as "creator" | "brand" | "admin";

  const { data: subscription } = useQuery<any>({
    queryKey: ['/api/subscriptions/my'],
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("plan", selectedPlan);
      form.append("billingCycle", billing);
      if (proofFile) form.append("paymentProof", proofFile);
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/my'] });
      toast({ title: "Subscription submitted! 🎉", description: "Our team will verify your payment within 24 hours." });
      setDialogOpen(false);
      setProofFile(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activePlan = PLANS[userType as "creator" | "brand"] ?? PLANS.creator;
  const price = billing === "monthly" ? activePlan.monthly : activePlan.yearly / 12;
  const savings = Math.round(activePlan.monthly * 12 - activePlan.yearly);

  const isActive = subscription?.status === 'active';
  const isPending = subscription?.status === 'pending';

  const WALLET_ADDRESS = "TExampleWalletAddressHere123456"; // Replace with real wallet

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className={`bg-gradient-to-br ${userType === 'brand' ? 'from-amber-600 to-orange-600' : 'from-purple-600 to-blue-600'} text-white py-16 px-4`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">{activePlan.icon}</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Upgrade to Premium</h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto">
            Unlock powerful tools to grow your influence and revenue.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Status Banner */}
        {isActive && (
          <Card className="mb-8 border-green-300 bg-green-50">
            <CardContent className="p-5 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900">You're a Premium member! 🎉</div>
                <div className="text-sm text-green-700">
                  Plan: {subscription?.plan} · Expires {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <Card className="mb-8 border-yellow-300 bg-yellow-50">
            <CardContent className="p-5 flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-yellow-900">Payment under review</div>
                <div className="text-sm text-yellow-700">We'll activate your account within 24 hours after payment verification.</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full font-medium transition-all ${billing === "monthly" ? "bg-purple-600 text-white shadow" : "text-gray-500 hover:text-gray-700"}`}
            data-testid="toggle-monthly"
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${billing === "yearly" ? "bg-purple-600 text-white shadow" : "text-gray-500 hover:text-gray-700"}`}
            data-testid="toggle-yearly"
          >
            Yearly
            <Badge className="bg-green-100 text-green-800 text-xs">Save ${savings}</Badge>
          </button>
        </div>

        {/* Pricing Card */}
        <Card className={`mb-8 bg-gradient-to-br ${activePlan.color} text-white border-0 shadow-xl`}>
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-3xl font-bold">
                  ${billing === "monthly" ? activePlan.monthly : (activePlan.yearly / 12).toFixed(2)}
                  <span className="text-lg font-normal opacity-80">/month</span>
                </div>
                {billing === "yearly" && (
                  <div className="text-white/80 text-sm">
                    ${activePlan.yearly.toFixed(2)} billed annually · Save ${savings}/year
                  </div>
                )}
              </div>
              <Badge className="bg-white/20 text-white border-white/30">{activePlan.name}</Badge>
            </div>

            <ul className="space-y-3 mb-8">
              {activePlan.features.map(f => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {!isActive && !isPending && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-white text-purple-700 hover:bg-purple-50 font-bold py-6 text-lg"
                    onClick={() => setSelectedPlan(userType === 'brand' ? 'brand' : 'creator')}
                    data-testid="subscribe-btn"
                  >
                    Get {activePlan.name} →
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Complete Your Subscription</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">Manual Payment Required</p>
                            <p>Send <strong>${billing === "monthly" ? activePlan.monthly : activePlan.yearly.toFixed(2)} USDT (TRC-20)</strong> to:</p>
                            <code className="block bg-white border border-blue-200 rounded px-3 py-2 mt-2 text-xs break-all select-all font-mono">
                              {WALLET_ADDRESS}
                            </code>
                            <p className="mt-2">Then upload your payment screenshot below.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div>
                      <Label htmlFor="proof" className="font-medium">Payment Screenshot *</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                           onClick={() => document.getElementById('proof-input')?.click()}>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        {proofFile ? (
                          <p className="text-sm text-green-600 font-medium">{proofFile.name}</p>
                        ) : (
                          <p className="text-sm text-gray-500">Click to upload proof of payment</p>
                        )}
                        <input
                          id="proof-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => setProofFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => subscribeMutation.mutate()}
                      disabled={!proofFile || subscribeMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      data-testid="confirm-subscribe-btn"
                    >
                      {subscribeMutation.isPending ? "Submitting..." : "Submit for Review"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Frequently Asked Questions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { q: "How long does activation take?", a: "Our team verifies payments within 24 hours. You'll be notified once activated." },
              { q: "Can I cancel anytime?", a: "Yes, you can cancel at any time. Your premium benefits remain active until the end of your billing period." },
              { q: "What payment methods do you accept?", a: "We accept USDT (TRC-20) cryptocurrency payments for all subscriptions." },
              { q: "Is there a free trial?", a: "New users enjoy a 7-day free access to most features. Subscribe to unlock all premium benefits." },
            ].map(({ q, a }) => (
              <div key={q} className="border-b last:border-b-0 pb-4 last:pb-0">
                <div className="font-semibold text-gray-900 mb-1">{q}</div>
                <div className="text-sm text-gray-600">{a}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
