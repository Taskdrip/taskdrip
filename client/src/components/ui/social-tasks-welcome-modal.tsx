import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Rocket, Target, DollarSign, Users, Zap, X, ArrowRight,
  BookOpen, ShoppingBag, TrendingUp, Star
} from "lucide-react";

const STORAGE_KEY = "taskdrip_show_social_tasks_modal";

const brandHighlights = [
  {
    icon: <Target className="h-5 w-5 text-violet-500" />,
    title: "Launch a Campaign",
    desc: "Reach thousands of authentic creators ready to amplify your brand.",
    href: "/campaigns",
  },
  {
    icon: <Users className="h-5 w-5 text-blue-500" />,
    title: "Find Your Perfect Creators",
    desc: "Browse our marketplace of verified influencers across every niche.",
    href: "/influencers",
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-green-500" />,
    title: "Track Real Results",
    desc: "Monitor your campaign performance and ROI in real time.",
    href: "/dashboard",
  },
];

const creatorHighlights = [
  {
    icon: <DollarSign className="h-5 w-5 text-green-500" />,
    title: "Earn from Your Influence",
    desc: "Get paid in USDT for completing brand campaigns — no middlemen.",
    href: "/campaigns",
  },
  {
    icon: <Zap className="h-5 w-5 text-yellow-500" />,
    title: "Stack $TDRIP Points",
    desc: "Every action earns points that unlock exclusive perks and rewards.",
    href: "/tdrip",
  },
  {
    icon: <BookOpen className="h-5 w-5 text-violet-500" />,
    title: "Level Up with BreedSkool",
    desc: "Take courses to grow your brand and expand your skills.",
    href: "/breedskool",
  },
  {
    icon: <ShoppingBag className="h-5 w-5 text-blue-500" />,
    title: "Shop the Marketplace",
    desc: "Discover exclusive products and deals curated for creators.",
    href: "/shop",
  },
];

const CHECKOUT_PATHS = ["/shop/checkout", "/advertise"];

export function SocialTasksWelcomeModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    if (!user) return;
    const flag = localStorage.getItem(STORAGE_KEY);
    if (flag === "1") {
      localStorage.removeItem(STORAGE_KEY);
      const alreadyShown = sessionStorage.getItem("taskdrip_welcome_shown");
      if (!alreadyShown) {
        sessionStorage.setItem("taskdrip_welcome_shown", "1");
        const onCheckoutPage = CHECKOUT_PATHS.some(p => location.startsWith(p));
        const delay = onCheckoutPage ? 2500 : 600;
        setTimeout(() => setOpen(true), delay);
      }
    }
  }, [user, location]);

  if (!user) return null;

  const isBrand = (user as any)?.userType === "brand";
  const firstName = (user as any)?.firstName || "there";
  const highlights = isBrand ? brandHighlights : creatorHighlights;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className={`relative px-5 pt-5 pb-4 sm:px-6 sm:pt-6 text-white shrink-0 ${isBrand ? "bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700" : "bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-700"}`}>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            data-testid="close-welcome-modal"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-3 pr-8">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl sm:text-2xl shrink-0">
              {isBrand ? "🚀" : "⚡"}
            </div>
            <div className="min-w-0">
              <p className="text-white/80 text-xs sm:text-sm">Welcome to Taskdrip</p>
              <h2 className="text-lg sm:text-xl font-black truncate">Hey {firstName}! 👋</h2>
            </div>
          </div>
          <p className="text-white/90 text-[13px] sm:text-sm leading-relaxed break-words">
            {isBrand
              ? "Your brand deserves real reach. Taskdrip connects you with authentic creators who turn influence into measurable results."
              : "Your influence is your superpower. Taskdrip helps you turn it into real income, skills, and a thriving community."}
          </p>
          {!isBrand && (
            <div className="mt-3 inline-flex items-start gap-2 bg-white/20 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold max-w-full">
              <Star className="h-3.5 w-3.5 text-yellow-300 shrink-0 mt-0.5" />
              <span className="break-words">50 welcome $TDRIP points credited to your account!</span>
            </div>
          )}
        </div>

        {/* Highlights — scrollable */}
        <div className="px-3 sm:px-4 py-3 space-y-2 bg-white overflow-y-auto flex-1 min-h-0">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {isBrand ? "What you can do" : "Start your journey"}
          </p>
          {highlights.map((item, i) => (
            <Link key={i} href={item.href} onClick={() => setOpen(false)}>
              <div
                className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-all cursor-pointer group"
                data-testid={`welcome-highlight-${i}`}
              >
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-[13px] sm:text-sm truncate">{item.title}</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-violet-500 transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-white shrink-0">
          <Button
            className="w-full bg-black text-white hover:bg-gray-800 rounded-xl h-10 font-semibold text-sm"
            onClick={() => setOpen(false)}
            data-testid="button-welcome-explore"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Let's Explore Taskdrip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function triggerSocialTasksModal() {
  localStorage.setItem(STORAGE_KEY, "1");
}
