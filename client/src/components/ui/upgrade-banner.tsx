import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles, Crown, X, Lock, ArrowRight, Zap, CheckCircle2,
  BarChart3, MessageSquare, Infinity, BadgeCheck, TrendingUp, Star,
  Users, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpgradeBannerProps {
  feature?: string;
  description?: string;
  compact?: boolean;
}

const INFLUENCER_FREE_LIMITS = [
  { label: "Apply to campaigns", free: "3 / month", premium: "Unlimited", icon: Infinity },
  { label: "Analytics", free: "Basic only", premium: "Advanced dashboard", icon: BarChart3 },
  { label: "Brand messaging", free: "Locked", premium: "Direct access", icon: MessageSquare },
  { label: "Referral bonus", free: "1× standard", premium: "2× multiplier", icon: TrendingUp },
  { label: "Campaign priority", free: "Standard", premium: "Priority listing", icon: Star },
  { label: "Verified badge", free: "Not available", premium: "✓ Verified", icon: BadgeCheck },
];

const BRAND_FREE_LIMITS = [
  { label: "Campaigns / month", free: "1 campaign", premium: "Unlimited", icon: Infinity },
  { label: "Analytics", free: "Basic only", premium: "Advanced reports", icon: BarChart3 },
  { label: "Influencer outreach", free: "Manual only", premium: "Bulk outreach", icon: Users },
  { label: "Campaign placement", free: "Standard", premium: "Featured first", icon: Star },
  { label: "Influencer discovery", free: "Standard", premium: "Priority results", icon: TrendingUp },
  { label: "Verified brand badge", free: "Not available", premium: "✓ Verified", icon: BadgeCheck },
];

const INFLUENCER_HIGHLIGHTS = [
  "Unlimited campaign applications",
  "Advanced analytics dashboard",
  "Direct brand messaging",
  "Referral bonus multiplier (2×)",
  "Priority campaign discovery",
  "Verified influencer badge ✓",
];

const BRAND_HIGHLIGHTS = [
  "Unlimited campaign creation",
  "Advanced campaign analytics",
  "Featured campaign placement",
  "Bulk influencer outreach",
  "Priority influencer discovery",
  "Verified brand badge ✓",
];

export function UpgradeBanner({ feature, description, compact = false }: UpgradeBannerProps) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;

  const userType = (user as any)?.userType as string;
  const isActive = (user as any)?.subscriptionStatus === "active";
  const isPending = (user as any)?.subscriptionStatus === "pending";

  if (isActive || userType === "admin") return null;

  const isBrand = userType === "brand";
  const planName = isBrand ? "Brand Pro" : "Influencer Premium";
  const price = isBrand ? "$24/mo" : "$7/mo";
  const gradientFrom = isBrand ? "from-amber-500" : "from-purple-600";
  const gradientTo = isBrand ? "to-orange-500" : "to-indigo-600";
  const glowClass = isBrand ? "btn-glow-amber" : "btn-glow-purple";
  const lockedItems = isBrand ? BRAND_FREE_LIMITS : INFLUENCER_FREE_LIMITS;
  const highlights = isBrand ? BRAND_HIGHLIGHTS : INFLUENCER_HIGHLIGHTS;
  const icon = isBrand ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />;
  const iconLg = isBrand ? <Crown className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />;

  if (compact) {
    return (
      <div className={`relative overflow-hidden flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white shadow-lg`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="upgrade-shimmer absolute inset-0" />
        </div>
        <div className="relative flex items-center gap-2.5">
          <div className="p-1.5 bg-white/20 rounded-lg">{icon}</div>
          <div>
            <p className="font-semibold text-sm">{feature || `Upgrade to ${planName}`}</p>
            {isPending ? (
              <p className="text-xs text-white/80">Payment under review — activating soon</p>
            ) : (
              <p className="text-xs text-white/80">{description || `from ${price} · 6 features unlocked`}</p>
            )}
          </div>
        </div>
        {!isPending && (
          <Link href="/subscription">
            <Button
              size="sm"
              className={`relative bg-white/20 hover:bg-white/30 text-white border-white/30 border shrink-0 gap-1 ${glowClass}`}
              data-testid="button-upgrade-compact"
            >
              Upgrade <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-0 bg-white shadow-xl mb-6">
      {/* Gradient accent bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />

      {/* Header */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradientFrom} ${gradientTo} px-6 py-5`}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="upgrade-shimmer absolute inset-0" />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        </div>

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
              {iconLg}
            </div>
            <div>
              {isPending ? (
                <>
                  <Badge className="bg-amber-400/30 text-amber-100 border-amber-300/40 text-xs mb-1.5">Under Review</Badge>
                  <h3 className="text-white font-bold text-lg leading-tight">Payment Submitted!</h3>
                  <p className="text-white/80 text-sm">Your account will be activated within 24 hours.</p>
                </>
              ) : (
                <>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs mb-1.5">Free Plan</Badge>
                  <h3 className="text-white font-bold text-lg leading-tight">
                    You're missing out on 6 premium features
                  </h3>
                  <p className="text-white/80 text-sm">Upgrade to {planName} and unlock your full potential</p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/70 hover:text-white flex-shrink-0"
            data-testid="button-dismiss-upgrade-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isPending && (
        <div className="px-6 py-5">
          {/* Free vs Premium comparison table */}
          <div className="mb-5">
            <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              <span>Feature</span>
              <span className="text-center text-gray-400">Free</span>
              <span className={`text-center ${isBrand ? "text-amber-600" : "text-purple-600"}`}>Premium ✦</span>
            </div>
            <div className="space-y-1.5">
              {lockedItems.map(({ label, free, premium, icon: Icon }) => (
                <div key={label} className="grid grid-cols-3 items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isBrand ? "text-amber-500" : "text-purple-500"}`} />
                    <span className="text-xs text-gray-700 font-medium">{label}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-400" /> {free}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className={`text-xs font-semibold ${isBrand ? "text-amber-600" : "text-purple-600"}`}>{premium}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof row */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
            <div className="flex -space-x-2">
              {["AK", "SM", "JT", "MR"].map((initials) => (
                <div key={initials} className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white text-[10px] font-bold flex items-center justify-center border-2 border-white`}>
                  {initials}
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Join 2,400+ Premium members</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                <span className="text-xs text-gray-500 ml-1">4.9 avg rating</span>
              </div>
            </div>
            <div className="ml-auto">
              <Badge className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white border-0 text-xs font-bold`}>
                from {price}
              </Badge>
            </div>
          </div>

          {/* CTA */}
          <Link href="/subscription">
            <Button
              className={`relative w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white font-bold py-6 text-base overflow-hidden ${glowClass}`}
              data-testid="button-upgrade-now"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {icon} Unlock {planName} — {price} <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </Button>
          </Link>
          <p className="text-center text-[11px] text-gray-400 mt-2">No commitment · Cancel anytime · Activated within 24h</p>
        </div>
      )}
    </div>
  );
}

interface FeatureLockOverlayProps {
  featureName: string;
  description?: string;
  minPlan?: "premium" | "pro";
}

export function FeatureLockOverlay({ featureName, description, minPlan = "premium" }: FeatureLockOverlayProps) {
  const { user } = useAuth();
  const userType = (user as any)?.userType as string;
  const isActive = (user as any)?.subscriptionStatus === "active";

  if (!user || isActive || userType === "admin") return null;

  const isBrand = userType === "brand";
  const gradientFrom = isBrand ? "from-amber-500" : "from-purple-600";
  const gradientTo = isBrand ? "to-orange-500" : "to-indigo-600";
  const glowClass = isBrand ? "btn-glow-amber" : "btn-glow-purple";

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/92 backdrop-blur-sm border border-gray-200">
      <div className="text-center p-6 max-w-xs">
        <div className={`w-14 h-14 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h3 className="font-bold text-gray-900 mb-1">{featureName} Locked</h3>
        <p className="text-sm text-gray-500 mb-5">
          {description || `This feature requires a ${isBrand ? "Brand Pro" : "Premium"} subscription.`}
        </p>
        <Link href="/subscription">
          <Button
            size="sm"
            className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white gap-2 w-full ${glowClass}`}
            data-testid="button-unlock-feature"
          >
            {isBrand ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            Upgrade to Unlock
          </Button>
        </Link>
      </div>
    </div>
  );
}
