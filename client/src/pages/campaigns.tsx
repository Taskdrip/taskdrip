import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from 'wouter';
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { CampaignCard } from "@/components/ui/campaign-card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Filter, Sparkles, TrendingUp, Coins, Layers, ArrowRight, X,
  SlidersHorizontal, ChevronDown, ChevronUp, Flame, Zap, Star,
} from "lucide-react";
import { AdSlot } from "@/components/ui/ad-slot";
import { AdPopupZone } from "@/components/ui/ad-popup";
import { Spotlight } from "@/components/Spotlight";
import campaignsHero from "@assets/campaigns_hero.png";

type SortKey = "newest" | "reward_high" | "reward_low" | "spots_high" | "ending_soon";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "reward_high", label: "Highest reward" },
  { value: "reward_low", label: "Lowest reward" },
  { value: "spots_high", label: "Most open spots" },
  { value: "ending_soon", label: "Ending soon" },
];

const REWARD_RANGES = [
  { value: "all", label: "Any reward", min: 0, max: Infinity },
  { value: "0-10", label: "$0 – $10", min: 0, max: 10 },
  { value: "10-50", label: "$10 – $50", min: 10, max: 50 },
  { value: "50-200", label: "$50 – $200", min: 50, max: 200 },
  { value: "200-plus", label: "$200+", min: 200, max: Infinity },
];

const STATUS_FILTERS = [
  { value: "all", label: "All", icon: Layers },
  { value: "open", label: "Open", icon: Zap },
  { value: "almost_full", label: "Almost full", icon: Flame },
  { value: "spotlight", label: "Spotlight", icon: Star },
];

export default function Campaigns() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [rewardRange, setRewardRange] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const handleJoinCampaign = (campaignId: string) => {
    setLocation(`/campaigns/${campaignId}`);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const campaignList = (campaigns as any[]) || [];
  const activeCampaigns = useMemo(
    () => campaignList.filter((c: any) => c.isActive),
    [campaignList],
  );

  const categories = useMemo(
    () => Array.from(new Set(campaignList.map((c: any) => c.category).filter(Boolean))),
    [campaignList],
  );

  const filteredCampaigns = useMemo(() => {
    const range = REWARD_RANGES.find((r) => r.value === rewardRange) || REWARD_RANGES[0];
    let list = activeCampaigns.filter((c: any) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        c.title?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.brandName?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term);
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(c.category);
      const reward = parseFloat(c.reward) || 0;
      const matchesReward = reward >= range.min && reward <= range.max;

      let matchesStatus = true;
      if (statusFilter === "open") {
        matchesStatus = (c.filledSlots || 0) < (c.totalSlots || 0);
      } else if (statusFilter === "almost_full") {
        const filled = c.filledSlots || 0;
        const total = c.totalSlots || 0;
        matchesStatus = total > 0 && filled / total >= 0.7 && filled < total;
      } else if (statusFilter === "spotlight") {
        matchesStatus = !!(c.isFeatured || c.isSpotlight);
      }

      return matchesSearch && matchesCategory && matchesReward && matchesStatus;
    });

    list = [...list].sort((a: any, b: any) => {
      const ar = parseFloat(a.reward) || 0;
      const br = parseFloat(b.reward) || 0;
      const aSlots = (a.totalSlots || 0) - (a.filledSlots || 0);
      const bSlots = (b.totalSlots || 0) - (b.filledSlots || 0);
      switch (sortKey) {
        case "reward_high":
          return br - ar;
        case "reward_low":
          return ar - br;
        case "spots_high":
          return bSlots - aSlots;
        case "ending_soon": {
          const ad = a.endDate ? new Date(a.endDate).getTime() : Infinity;
          const bd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
          return ad - bd;
        }
        case "newest":
        default: {
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bd - ad;
        }
      }
    });

    return list;
  }, [activeCampaigns, searchTerm, selectedCategories, rewardRange, statusFilter, sortKey]);

  const totalRewards = activeCampaigns.reduce(
    (sum: number, c: any) => sum + (parseFloat(c.reward) || 0),
    0,
  );
  const totalSpots = activeCampaigns.reduce(
    (sum: number, c: any) => sum + (c.totalSlots || 0),
    0,
  );

  const activeFiltersCount =
    (searchTerm.trim() ? 1 : 0) +
    selectedCategories.length +
    (rewardRange !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setRewardRange("all");
    setStatusFilter("all");
    setSortKey("newest");
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-violet-950/30">
      <AdPopupZone page="campaigns" />
      <NavigationFixed />
      <AdSlot page="campaigns" placementType="banner_top" className="w-full" />

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${campaignsHero})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-violet-950/75 to-slate-950/85" aria-hidden />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-3xl animate-pulse" aria-hidden />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} aria-hidden />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-white/90 mb-4 sm:mb-5" data-testid="badge-hero-tag">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {activeCampaigns.length} live campaigns • Updated in real time
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white mb-3 sm:mb-4 tracking-tight leading-[1.05]">
              Earn{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                crypto
              </span>{" "}
              for the social work you already do.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mb-6 sm:mb-8">
              Browse vetted Web3 campaigns from real brands. Apply, complete the task, get paid in cash and $TDRIP — instantly.
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-white/90 shadow-lg shadow-black/30 font-bold"
                onClick={() => document.getElementById("campaign-grid")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-hero-browse"
              >
                Browse Campaigns
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur"
                onClick={() => document.getElementById("spotlight-section")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-hero-spotlight"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                See Spotlight
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-8 sm:mt-10 max-w-3xl">
              <StatPill icon={<Layers className="w-4 h-4" />} label="Active" value={activeCampaigns.length.toString()} testid="stat-active" />
              <StatPill icon={<Coins className="w-4 h-4" />} label="Rewards" value={`$${totalRewards.toFixed(0)}`} testid="stat-rewards" />
              <StatPill icon={<TrendingUp className="w-4 h-4" />} label="Categories" value={categories.length.toString()} testid="stat-categories" />
              <StatPill icon={<Sparkles className="w-4 h-4" />} label="Open spots" value={totalSpots.toString()} testid="stat-spots" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Spotlight ────────────────────────────────────────────────────── */}
      <section id="spotlight-section" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 -mt-6 md:-mt-10 relative z-10">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-2xl shadow-xl shadow-black/5 border border-violet-100 dark:border-violet-900/40 p-4 sm:p-5 md:p-7">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Spotlight Opportunities</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">Hand-picked by Taskdrip — premium payouts, fast approvals.</p>
              </div>
            </div>
          </div>
          <Spotlight page="campaigns" title="" subtitle="" variant="row" />
        </div>
      </section>

      {/* ─── Advanced Filter Toolbar ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-8 sm:mt-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 overflow-hidden">
          {/* Top row: search + sort + advanced toggle */}
          <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
              <Input
                placeholder="Search campaigns, brands, or categories…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm"
                data-testid="input-search-campaigns"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800"
                  data-testid="btn-clear-search"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="h-10 sm:h-11 text-sm flex-1 sm:flex-none sm:w-[180px]" data-testid="select-sort">
                  <div className="flex items-center gap-2 min-w-0">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setShowAdvanced((s) => !s)}
                className="h-10 sm:h-11 px-3 gap-1.5 relative"
                data-testid="btn-toggle-advanced"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-violet-600 hover:bg-violet-600 text-white text-[10px] h-5 px-1.5 ml-0.5">
                    {activeFiltersCount}
                  </Badge>
                )}
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Status pill row (always visible) */}
          <div className="px-3 sm:px-4 pb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === s.value
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                    : "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700"
                }`}
                data-testid={`btn-status-${s.value}`}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Advanced panel */}
          {showAdvanced && (
            <div className="border-t border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/30 p-3 sm:p-4 space-y-4">
              {/* Categories */}
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider mb-2">
                  Categories {selectedCategories.length > 0 && <span className="text-violet-600 normal-case font-semibold">({selectedCategories.length} selected)</span>}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.length === 0 ? (
                    <p className="text-xs text-slate-400">No categories available</p>
                  ) : (
                    categories.map((cat) => {
                      const isOn = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            isOn
                              ? "bg-violet-600 text-white shadow-sm"
                              : "bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:border-violet-300 hover:text-violet-700"
                          }`}
                          data-testid={`btn-category-${cat}`}
                        >
                          {cat}
                          {isOn && <X className="inline w-3 h-3 ml-1" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Reward range */}
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider mb-2">Reward range</p>
                <div className="flex flex-wrap gap-1.5">
                  {REWARD_RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRewardRange(r.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        rewardRange === r.value
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                      data-testid={`btn-reward-${r.value}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-slate-500 hover:text-rose-600 h-8"
                    data-testid="btn-clear-filters"
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Campaign Grid ─────────────────────────────────────────────── */}
      <div id="campaign-grid" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-6 sm:mt-8 pb-16">
        <div className="flex items-end justify-between mb-4 sm:mb-5 gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">All Campaigns</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
              {filteredCampaigns.length} {filteredCampaigns.length === 1 ? "campaign" : "campaigns"}
              {activeFiltersCount > 0 && ` · ${activeFiltersCount} ${activeFiltersCount === 1 ? "filter" : "filters"} applied`}
            </p>
          </div>
        </div>
        {campaignsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800 animate-pulse" />
            ))}
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCampaigns.map((campaign: any) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onJoin={handleJoinCampaign}
                showJoinButton={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 px-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">No campaigns match your filters</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
              Try widening your search, removing a filter, or clearing all filters.
            </p>
            {activeFiltersCount > 0 && (
              <Button onClick={clearFilters} variant="outline" data-testid="btn-clear-filters-empty">
                <X className="w-4 h-4 mr-1.5" /> Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      <AdSlot page="campaigns" placementType="banner_bottom" className="w-full" />
      <Footer />
    </div>
  );
}

function StatPill({
  icon, label, value, testid,
}: { icon: React.ReactNode; label: string; value: string; testid: string }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 px-3 sm:px-4 py-2.5 sm:py-3" data-testid={testid}>
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/15 flex items-center justify-center text-white flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/60 font-semibold truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-white leading-none mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}
