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
import {
  CheckCircle2, Crown, Sparkles, Zap, Clock, Upload, AlertTriangle,
  Lock, ArrowRight, Star, Shield, BarChart3, Users, Megaphone,
  MessageSquare, Target, TrendingUp, Gift, X, Check
} from "lucide-react";

const INFLUENCER_PLANS = {
  free: {
    name: "Explorer",
    price: 0,
    badge: null,
    color: "from-gray-500 to-gray-600",
    borderColor: "border-gray-200",
    bgColor: "bg-gray-50",
    features: [
      { label: "Browse campaigns", included: true },
      { label: "Apply to 3 campaigns/month", included: true },
      { label: "Basic analytics", included: true },
      { label: "Community access", included: true },
      { label: "Advanced analytics", included: false },
      { label: "Unlimited campaign applications", included: false },
      { label: "Direct brand messaging", included: false },
      { label: "Referral bonus multiplier (2×)", included: false },
      { label: "Priority campaign discovery", included: false },
      { label: "Verified badge", included: false },
    ],
  },
  premium: {
    name: "Influencer Premium",
    monthly: 7,
    yearly: 71.4,
    badge: "Most Popular",
    color: "from-purple-600 to-indigo-600",
    borderColor: "border-purple-300",
    bgColor: "bg-purple-50/50",
    icon: <Sparkles className="w-5 h-5" />,
    features: [
      { label: "Everything in Explorer", included: true },
      { label: "Advanced analytics dashboard", included: true },
      { label: "Unlimited campaign applications", included: true },
      { label: "Direct brand messaging", included: true },
      { label: "Referral bonus multiplier (2×)", included: true },
      { label: "Priority campaign discovery", included: true },
      { label: "Verified influencer badge", included: true },
      { label: "Monthly payout requests", included: true },
      { label: "Early access to new features", included: true },
      { label: "Dedicated support channel", included: true },
    ],
  },
};

const BRAND_PLANS = {
  free: {
    name: "Starter",
    price: 0,
    badge: null,
    color: "from-gray-500 to-gray-600",
    borderColor: "border-gray-200",
    bgColor: "bg-gray-50",
    features: [
      { label: "Post 1 campaign/month", included: true },
      { label: "Browse influencer profiles", included: true },
      { label: "Basic campaign metrics", included: true },
      { label: "Community forum access", included: true },
      { label: "Unlimited campaign creation", included: false },
      { label: "Advanced campaign analytics", included: false },
      { label: "Featured campaign placement", included: false },
      { label: "Bulk influencer outreach", included: false },
      { label: "Priority influencer discovery", included: false },
      { label: "Verified brand badge", included: false },
    ],
  },
  pro: {
    name: "Brand Pro",
    monthly: 24,
    yearly: 244.8,
    badge: "Best Value",
    color: "from-amber-500 to-orange-500",
    borderColor: "border-amber-300",
    bgColor: "bg-amber-50/50",
    icon: <Crown className="w-5 h-5" />,
    features: [
      { label: "Everything in Starter", included: true },
      { label: "Unlimited campaign creation", included: true },
      { label: "Advanced campaign analytics", included: true },
      { label: "Featured campaign placement", included: true },
      { label: "Bulk influencer outreach", included: true },
      { label: "Priority influencer discovery", included: true },
      { label: "Verified brand badge", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Custom campaign branding", included: true },
      { label: "API access", included: true },
    ],
  },
};

const TESTIMONIALS = [
  { name: "Alex K.", role: "Lifestyle Influencer", quote: "Getting Premium tripled my campaign earnings in just two months. The priority discovery is a game changer.", avatar: "AK" },
  { name: "Sarah M.", role: "Brand Manager", quote: "Brand Pro gave us full control. The analytics alone justified the investment after our first campaign.", avatar: "SM" },
  { name: "Jordan T.", role: "Content Creator", quote: "The 2× referral multiplier is insane. I made back my subscription cost in the first week.", avatar: "JT" },
];

const WALLET_ADDRESS = "TExampleWalletAddressHere123456";

function PlanFeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <li className={`flex items-center gap-2.5 text-sm ${included ? "text-gray-700" : "text-gray-400"}`}>
      {included ? (
        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0">
          <X className="w-2.5 h-2.5 text-gray-300" />
        </div>
      )}
      {label}
    </li>
  );
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"influencer" | "brand">("influencer");

  const userType = (user as any)?.userType as "influencer" | "brand" | "admin";
  const isBrand = userType === "brand";

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/subscriptions/my"],
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("plan", selectedPlan);
      form.append("billingCycle", billing);
      if (proofFile) form.append("paymentProof", proofFile);
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/my"] });
      toast({ title: "Subscription submitted!", description: "Our team will verify your payment within 24 hours." });
      setDialogOpen(false);
      setProofFile(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isActive = subscription?.status === "active";
  const isPending = subscription?.status === "pending";

  const plans = isBrand ? BRAND_PLANS : INFLUENCER_PLANS;
  const paidPlan = isBrand ? plans.pro : plans.premium;
  const paidPlanKey = isBrand ? "pro" : "premium";
  const gradientFrom = isBrand ? "from-amber-500" : "from-purple-600";
  const gradientTo = isBrand ? "to-orange-500" : "to-indigo-600";
  const accentText = isBrand ? "text-amber-600" : "text-purple-600";
  const accentBg = isBrand ? "bg-amber-500" : "bg-purple-600";

  const monthlyPrice = (paidPlan as any).monthly;
  const yearlyPrice = (paidPlan as any).yearly;
  const yearlyPerMonth = (yearlyPrice / 12).toFixed(2);
  const savings = Math.round(monthlyPrice * 12 - yearlyPrice);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full border border-white/30 backdrop-blur-sm mb-6">
            {isBrand ? <Crown className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="text-sm font-semibold uppercase tracking-widest">Upgrade Your Account</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
            {isBrand ? "Brand Pro" : "Influencer Premium"}
          </h1>
          <p className="text-white/80 max-w-xl mx-auto text-lg mb-8">
            {isBrand
              ? "Unlock unlimited campaigns, featured placement, and advanced analytics to scale your brand's reach."
              : "Unlock unlimited campaign access, verified status, and powerful tools to grow your influence."}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              isBrand ? "Unlimited Campaigns" : "Unlimited Applications",
              "Advanced Analytics",
              "Verified Badge",
              isBrand ? "Bulk Outreach" : "2× Referral Bonus",
            ].map(f => (
              <div key={f} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-sm font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Status Banner */}
        {isActive && (
          <Card className="mb-8 border-green-300 bg-green-50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
              <div>
                <div className="font-bold text-green-900 text-lg">You're a Premium member!</div>
                <div className="text-sm text-green-700">
                  Plan: <strong>{subscription?.plan}</strong> · Expires {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <Card className="mb-8 border-amber-300 bg-amber-50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl"><Clock className="w-6 h-6 text-amber-600" /></div>
              <div>
                <div className="font-bold text-amber-900">Payment Under Review</div>
                <div className="text-sm text-amber-700">We'll activate your account within 24 hours after verification. Thank you for your patience!</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing toggle */}
        {!isActive && !isPending && (
          <div className="flex items-center justify-center gap-1 p-1 bg-white border border-gray-200 rounded-full shadow-sm w-fit mx-auto mb-10">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${billing === "monthly" ? `${accentBg} text-white shadow-md` : "text-gray-500 hover:text-gray-700"}`}
              data-testid="toggle-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-6 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 ${billing === "yearly" ? `${accentBg} text-white shadow-md` : "text-gray-500 hover:text-gray-700"}`}
              data-testid="toggle-yearly"
            >
              Yearly
              <Badge className="bg-green-100 text-green-800 text-xs font-bold border-green-200">Save ${savings}</Badge>
            </button>
          </div>
        )}

        {/* Plan comparison */}
        {!isActive && !isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Free Plan */}
            <Card className="border-2 border-gray-200 bg-white shadow-sm">
              <CardContent className="p-7">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{plans.free.name}</span>
                  </div>
                  <div className="text-3xl font-black text-gray-900">Free</div>
                  <div className="text-sm text-gray-500 mt-1">Get started at no cost</div>
                </div>
                <ul className="space-y-2.5">
                  {plans.free.features.map(f => <PlanFeatureRow key={f.label} {...f} />)}
                </ul>
                <Button variant="outline" className="w-full mt-7 border-gray-300 text-gray-600" disabled>
                  Current Free Plan
                </Button>
              </CardContent>
            </Card>

            {/* Paid Plan */}
            <Card className={`border-2 ${(paidPlan as any).borderColor} bg-white shadow-lg relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
              {(paidPlan as any).badge && (
                <div className={`absolute top-4 right-4 px-3 py-1 bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white text-xs font-bold rounded-full`}>
                  {(paidPlan as any).badge}
                </div>
              )}
              <CardContent className="p-7">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-lg flex items-center justify-center text-white`}>
                      {(paidPlan as any).icon}
                    </div>
                    <span className={`font-bold text-lg ${accentText}`}>{(paidPlan as any).name}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-4xl font-black text-gray-900">
                      ${billing === "monthly" ? monthlyPrice : yearlyPerMonth}
                    </div>
                    <div className="text-gray-500 mb-1">/month</div>
                  </div>
                  {billing === "yearly" && (
                    <div className="text-sm text-gray-500 mt-1">
                      ${yearlyPrice.toFixed(2)} billed annually · <span className="text-green-600 font-semibold">Save ${savings}/year</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {(paidPlan as any).features.map((f: any) => <PlanFeatureRow key={f.label} {...f} />)}
                </ul>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className={`w-full mt-7 bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white font-bold py-6 text-base hover:opacity-90 gap-2`}
                      onClick={() => setSelectedPlan(isBrand ? "brand" : "influencer")}
                      data-testid="subscribe-btn"
                    >
                      {(paidPlan as any).icon} Get {(paidPlan as any).name} <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {isBrand ? <Crown className="w-5 h-5 text-amber-500" /> : <Sparkles className="w-5 h-5 text-purple-500" />}
                        Complete Your Subscription
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                      {/* Price summary */}
                      <div className={`p-4 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-lg">{(paidPlan as any).name}</p>
                            <p className="text-white/80 text-sm capitalize">{billing} billing</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black">${billing === "monthly" ? monthlyPrice : yearlyPrice.toFixed(2)}</p>
                            <p className="text-white/80 text-xs">{billing === "yearly" ? "per year" : "per month"}</p>
                          </div>
                        </div>
                      </div>

                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                              <p className="font-semibold mb-1">Manual Payment via USDT</p>
                              <p>Send <strong>${billing === "monthly" ? monthlyPrice : yearlyPrice.toFixed(2)} USDT (TRC-20)</strong> to:</p>
                              <code className="block bg-white border border-blue-200 rounded-lg px-3 py-2 mt-2 text-xs break-all select-all font-mono">
                                {WALLET_ADDRESS}
                              </code>
                              <p className="mt-2 text-blue-700">Then upload your payment screenshot below.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div>
                        <Label className="font-semibold">Payment Screenshot *</Label>
                        <div
                          className="mt-2 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors"
                          onClick={() => document.getElementById("proof-input")?.click()}
                          data-testid="upload-proof-area"
                        >
                          {proofFile ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <p className="text-sm text-green-600 font-medium">{proofFile.name}</p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Click to upload proof of payment</p>
                              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                            </>
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
                        className={`w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white font-bold py-5`}
                        data-testid="confirm-subscribe-btn"
                      >
                        {subscribeMutation.isPending ? "Submitting..." : "Submit for Review"}
                      </Button>
                      <p className="text-center text-xs text-gray-400">Reviewed and activated within 24 hours</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Testimonials */}
        {!isActive && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">What members say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TESTIMONIALS.map(t => (
                <Card key={t.name} className="border shadow-sm bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <p className="text-sm text-gray-600 mb-4 italic">"{t.quote}"</p>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white text-xs font-bold flex items-center justify-center`}>
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-xl">Frequently Asked Questions</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {[
              { q: "How long does activation take?", a: "Our team verifies payments within 24 hours. You'll receive a notification once your account is activated." },
              { q: "Can I cancel anytime?", a: "Yes, you can cancel at any time. Your premium benefits remain active until the end of your billing period." },
              { q: "What payment methods do you accept?", a: "We currently accept USDT (TRC-20) cryptocurrency payments. More options coming soon." },
              { q: "Is there a free trial?", a: "New users get access to core features for free. Upgrade to unlock all premium benefits and remove limitations." },
              { q: "Can I switch from monthly to yearly?", a: "Yes, contact support and we'll help you switch billing cycles and apply any credits." },
            ].map(({ q, a }) => (
              <div key={q} className="border-b last:border-b-0 pb-5 last:pb-0">
                <div className="font-semibold text-gray-900 mb-1.5">{q}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{a}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
