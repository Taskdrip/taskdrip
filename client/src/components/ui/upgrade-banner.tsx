import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Crown, X, Lock, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeBannerProps {
  feature?: string;
  description?: string;
  compact?: boolean;
}

const INFLUENCER_LOCKED = [
  "Advanced analytics dashboard",
  "Unlimited campaign applications",
  "Direct brand messaging",
  "Referral bonus multiplier (2×)",
  "Priority campaign discovery",
  "Verified influencer badge",
];

const BRAND_LOCKED = [
  "Unlimited campaign creation",
  "Priority influencer discovery",
  "Advanced campaign analytics",
  "Featured campaign placement",
  "Bulk influencer outreach",
  "Verified brand badge",
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
  const lockedItems = isBrand ? BRAND_LOCKED : INFLUENCER_LOCKED;
  const planName = isBrand ? "Brand Pro" : "Influencer Premium";
  const price = isBrand ? "$24/mo" : "$7/mo";
  const gradientFrom = isBrand ? "from-amber-500" : "from-purple-600";
  const gradientTo = isBrand ? "to-orange-500" : "to-indigo-600";
  const icon = isBrand ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />;

  if (compact) {
    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white shadow-lg`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white/20 rounded-lg">{icon}</div>
          <div>
            <p className="font-semibold text-sm">{feature || `Upgrade to ${planName}`}</p>
            {isPending ? (
              <p className="text-xs text-white/80">Payment under review — activating soon</p>
            ) : (
              <p className="text-xs text-white/80">{description || `from ${price}`}</p>
            )}
          </div>
        </div>
        {!isPending && (
          <Link href="/subscription">
            <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30 border shrink-0 gap-1">
              Upgrade <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white shadow-sm mb-6">
      {/* Gradient top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-md`}>
              {isBrand ? <Crown className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                {isPending ? "Payment Under Review" : `Unlock ${planName}`}
              </h3>
              {isPending ? (
                <p className="text-sm text-amber-600 font-medium">Your account will be activated within 24 hours.</p>
              ) : (
                <p className="text-sm text-gray-500">Starting from <strong className="text-gray-700">{price}</strong></p>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            data-testid="button-dismiss-upgrade-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isPending && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-5">
              {lockedItems.map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center flex-shrink-0`}>
                    <Zap className="w-2.5 h-2.5 text-white" />
                  </div>
                  {item}
                </div>
              ))}
            </div>

            <Link href="/subscription">
              <Button
                className={`w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white font-semibold gap-2 hover:opacity-90 transition-opacity`}
                data-testid="button-upgrade-now"
              >
                {icon} Upgrade to {planName} — {price} <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </>
        )}
      </div>
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

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200">
      <div className="text-center p-6 max-w-xs">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="font-bold text-gray-900 mb-1">{featureName} Locked</h3>
        <p className="text-sm text-gray-500 mb-5">
          {description || `This feature requires a ${isBrand ? "Brand Pro" : "Premium"} subscription.`}
        </p>
        <Link href="/subscription">
          <Button
            size="sm"
            className={`bg-gradient-to-r ${isBrand ? "from-amber-500 to-orange-500" : "from-purple-600 to-indigo-600"} text-white gap-2 w-full`}
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
