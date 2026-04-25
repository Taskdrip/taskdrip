import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/Spotlight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BRAND_TIER_CONFIG, BRAND_TIER_ORDER, BRAND_INDUSTRIES, getBrandTierConfig,
  formatBudget, type BrandTier
} from "@/lib/brandTiers";
import {
  Search, MapPin, Star, CheckCircle, Globe, Building2,
  ChevronRight, LayoutGrid, List, SlidersHorizontal, X, Users,
  TrendingUp, DollarSign, Award, Zap, Crown, Briefcase,
  Target, Filter, ChevronDown, Tag, BarChart2, ArrowLeft, Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

function formatNum(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── Tier Hero Card ─── */
function TierHeroCard({
  tierId, count, totalBudget, topBrands, onClick,
}: {
  tierId: BrandTier; count: number; totalBudget: number; topBrands: any[]; onClick: () => void;
}) {
  const tier = BRAND_TIER_CONFIG[tierId];
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-3xl overflow-hidden group focus:outline-none"
      style={{ boxShadow: `0 8px 48px ${tier.glowColor}` }}
    >
      <div className={`bg-gradient-to-br ${tier.gradient} relative overflow-hidden min-h-[240px]`}>
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-5xl mb-2 filter drop-shadow-lg">{tier.icon}</div>
              <h3 className="text-2xl font-black text-white tracking-tight">{tier.name}</h3>
              <p className="text-white/70 text-sm font-medium mt-0.5">{tier.range}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white tabular-nums">{count}</div>
              <div className="text-white/60 text-xs mt-0.5">{count === 1 ? "Brand" : "Brands"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-black/20 backdrop-blur rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white/60 text-xs">Total Spend</span>
              </div>
              <div className="text-white font-black text-lg">{formatBudget(totalBudget)}</div>
            </div>
            <div className="bg-black/20 backdrop-blur rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white/60 text-xs">Campaigns</span>
              </div>
              <div className="text-white font-black text-lg">
                {topBrands.reduce((s, b) => s + (b.completedCampaigns || 0), 0)}
              </div>
            </div>
          </div>
          {topBrands.length > 0 && (
            <div className="mb-5">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2.5">Featured Brands</p>
              <div className="flex -space-x-2">
                {topBrands.slice(0, 5).map((b, i) => (
                  <Avatar key={b.id} className="w-9 h-9 border-2 border-white/40 shadow-lg" style={{ zIndex: 5 - i }}>
                    <AvatarImage src={b.profileImageUrl || ""} />
                    <AvatarFallback className="bg-black/30 text-white text-xs font-bold">
                      {(b.companyName || b.firstName || "B")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {count > 5 && (
                  <div className="w-9 h-9 rounded-full border-2 border-white/40 bg-black/30 flex items-center justify-center text-white text-xs font-bold">
                    +{count - 5}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-2xl px-4 py-3 group-hover:bg-white/30 transition-all">
            <span className="text-white font-bold text-sm flex-1">Explore {tier.name} Brands</span>
            <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Brand Card ─── */
function BrandCard({ brand, rank, distanceMi }: { brand: any; rank: number; distanceMi?: number }) {
  const tier = getBrandTierConfig(brand.brandTierComputed || "startup");
  const name = brand.companyName || `${brand.firstName} ${brand.lastName}`;

  return (
    <Link href={`/brand/${brand.id}`}>
      <div
        className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col relative cursor-pointer"
        style={{ boxShadow: `0 4px 24px ${tier.glowColor}20` }}
      >
        {/* Banner */}
        <div className={`h-28 bg-gradient-to-br ${tier.gradient} relative flex-shrink-0`}>
          {brand.bannerImageUrl && (
            <img src={brand.bannerImageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tier.badge} shadow-sm`}>
              {tier.icon} {tier.name}
            </span>
          </div>
          {rank <= 3 && (
            <div className="absolute bottom-2 left-3 text-xl">
              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 -mt-8 relative flex flex-col flex-1">
          <div className="flex items-end gap-3 mb-3">
            <Avatar className="w-16 h-16 border-4 border-white shadow-lg ring-2 ring-gray-100">
              <AvatarImage src={brand.profileImageUrl || ""} />
              <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold text-xl`}>
                {name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {brand.isVerified && (
              <div className="mb-1 flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-semibold">
                <CheckCircle className="w-3 h-3" /> Verified
              </div>
            )}
          </div>
          <h3 className="font-black text-gray-900 text-sm leading-tight mb-1 truncate">{name}</h3>
          {brand.username && <p className="text-gray-400 text-xs mb-2">@{brand.username}</p>}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {brand.industry && (
              <Badge className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0">
                <Briefcase className="w-2.5 h-2.5 mr-1" />{brand.industry}
              </Badge>
            )}
            {brand.niche && (
              <Badge className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 border-0">
                <Tag className="w-2.5 h-2.5 mr-1" />{brand.niche}
              </Badge>
            )}
            {(brand.city || brand.state || brand.location) && (
              <Badge className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0">
                <MapPin className="w-2.5 h-2.5 mr-1" />
                {brand.city || brand.state || brand.location}
              </Badge>
            )}
          </div>
          {brand.bio && (
            <p className="text-gray-500 text-xs line-clamp-2 mb-3 flex-1">{brand.bio}</p>
          )}
          <div className="grid grid-cols-3 gap-2 mt-auto">
            <div className="text-center bg-gray-50 rounded-xl py-2">
              <div className="text-sm font-black text-gray-900">{brand.completedCampaigns || 0}</div>
              <div className="text-gray-400 text-[10px]">Campaigns</div>
            </div>
            <div className="text-center bg-gray-50 rounded-xl py-2">
              <div className="text-sm font-black text-gray-900">
                ⭐ {parseFloat(brand.rating || "0").toFixed(1)}
              </div>
              <div className="text-gray-400 text-[10px]">Rating</div>
            </div>
            <div className="text-center bg-gray-50 rounded-xl py-2">
              <div className="text-sm font-black text-gray-900">
                {formatBudget(brand.totalTransactionVolume)}
              </div>
              <div className="text-gray-400 text-[10px]">Spent</div>
            </div>
          </div>
          {distanceMi !== undefined && (
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <MapPin className="w-3 h-3" /> {distanceMi < 1 ? "< 1 mi" : `${Math.round(distanceMi)} mi away`}
            </div>
          )}
          <div className="mt-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold py-2.5 rounded-xl text-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-1 group-hover:translate-y-0">
            View Brand Profile →
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Main Page ─── */
export default function BrandsPage() {
  const { user } = useAuth();
  const [activeTier, setActiveTier] = useState<BrandTier | null>(null);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All Industries");
  const [tierFilter, setTierFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const [nearMeRadius, setNearMeRadius] = useState(100);
  const [sortBy, setSortBy] = useState("campaigns");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const { data: tierData = {}, isLoading } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/brands/by-tier"],
  });

  const allBrands = useMemo(() => BRAND_TIER_ORDER.flatMap((t) => tierData[t] || []), [tierData]);

  const tierStats = useMemo(() => {
    const stats: Record<string, { count: number; totalBudget: number; topBrands: any[] }> = {};
    for (const t of BRAND_TIER_ORDER) {
      const brands = tierData[t] || [];
      const totalBudget = brands.reduce((s, b) => s + parseFloat(b.totalTransactionVolume || "0"), 0);
      stats[t] = { count: brands.length, totalBudget, topBrands: brands.slice(0, 5) };
    }
    return stats;
  }, [tierData]);

  const totalBrands = useMemo(() => BRAND_TIER_ORDER.reduce((s, t) => s + (tierStats[t]?.count || 0), 0), [tierStats]);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setNearMeOnly(true);
        setLocationLoading(false);
        if ((user as any)?.id) {
          fetch("/api/user/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          });
        }
      },
      () => setLocationLoading(false)
    );
  };

  const filteredBrands = useMemo((): any[] => {
    const pool = activeTier ? (tierData[activeTier] || []) : allBrands;
    return pool
      .filter((b) => {
        if (tierFilter !== "all" && b.brandTierComputed !== tierFilter) return false;
        if (industry !== "All Industries" && b.industry !== industry) return false;
        if (verifiedOnly && !b.isVerified) return false;
        if (nearMeOnly && userLocation && b.latitude && b.longitude) {
          const d = calcDistance(userLocation.lat, userLocation.lon, parseFloat(b.latitude), parseFloat(b.longitude));
          if (d > nearMeRadius) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          const name = (b.companyName || `${b.firstName} ${b.lastName}`).toLowerCase();
          return name.includes(q) || (b.username || "").toLowerCase().includes(q)
            || (b.industry || "").toLowerCase().includes(q) || (b.niche || "").toLowerCase().includes(q)
            || (b.location || "").toLowerCase().includes(q) || (b.city || "").toLowerCase().includes(q)
            || (b.state || "").toLowerCase().includes(q) || (b.bio || "").toLowerCase().includes(q);
        }
        return true;
      })
      .map((b) => {
        const distanceMi = (nearMeOnly && userLocation && b.latitude && b.longitude)
          ? calcDistance(userLocation.lat, userLocation.lon, parseFloat(b.latitude), parseFloat(b.longitude))
          : undefined;
        return { ...b, _distance: distanceMi };
      })
      .sort((a, b) => {
        if (nearMeOnly && a._distance !== undefined && b._distance !== undefined) {
          return a._distance - b._distance;
        }
        if (sortBy === "campaigns") return (b.completedCampaigns || 0) - (a.completedCampaigns || 0);
        if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
        if (sortBy === "spend") return parseFloat(b.totalTransactionVolume || "0") - parseFloat(a.totalTransactionVolume || "0");
        return 0;
      });
  }, [activeTier, tierData, allBrands, industry, tierFilter, verifiedOnly, nearMeOnly, userLocation, nearMeRadius, search, sortBy]);

  const hasFilters = search || industry !== "All Industries" || tierFilter !== "all" || verifiedOnly || nearMeOnly;

  const resetFilters = () => {
    setSearch(""); setIndustry("All Industries"); setTierFilter("all");
    setVerifiedOnly(false); setNearMeOnly(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #080818 100%)" }}>
      <NavigationFixed />

      {/* Hero */}
      <div className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute top-10 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 mb-6">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-white/80 text-sm font-medium">Brand Discovery Hub</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 leading-tight">
            Find <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Premium Brands</span>
            <br />in Your Niche
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Connect with {totalBrands} verified brands actively looking for creators like you — filter by industry, location, tier, and campaign budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search brands by name, industry, niche, location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 backdrop-blur border border-white/20 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-indigo-400 transition-colors"
                data-testid="input-brand-search"
              />
            </div>
            <Button
              onClick={requestLocation}
              disabled={locationLoading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 rounded-2xl px-6 font-bold"
              data-testid="button-near-me"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {locationLoading ? "Locating…" : nearMeOnly ? "Near Me ✓" : "Near Me"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: "Total Brands", value: formatNum(totalBrands), color: "from-indigo-500 to-blue-600" },
            { icon: Target, label: "Campaigns Run", value: formatNum(allBrands.reduce((s, b) => s + (b.completedCampaigns || 0), 0)), color: "from-violet-500 to-purple-600" },
            { icon: DollarSign, label: "Total Spend", value: formatBudget(allBrands.reduce((s, b) => s + parseFloat(b.totalTransactionVolume || "0"), 0)), color: "from-emerald-500 to-teal-600" },
            { icon: CheckCircle, label: "Verified Brands", value: formatNum(allBrands.filter(b => b.isVerified).length), color: "from-amber-400 to-orange-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
              <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="text-white/50 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Cards */}
      {!activeTier && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-black text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Brand Tiers
            </h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {BRAND_TIER_ORDER.map((t) => (
                <div key={t} className="h-60 bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {BRAND_TIER_ORDER.map((tierId) => {
                const stats = tierStats[tierId];
                return (
                  <TierHeroCard
                    key={tierId}
                    tierId={tierId}
                    count={stats?.count || 0}
                    totalBudget={stats?.totalBudget || 0}
                    topBrands={stats?.topBrands || []}
                    onClick={() => setActiveTier(tierId)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active tier header */}
      {activeTier && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
          <button
            onClick={() => setActiveTier(null)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> All Tiers
          </button>
          <div className={`bg-gradient-to-br ${BRAND_TIER_CONFIG[activeTier].gradient} rounded-3xl p-6 relative overflow-hidden`}>
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-4xl mb-1">{BRAND_TIER_CONFIG[activeTier].icon}</div>
                <h2 className="text-3xl font-black text-white">{BRAND_TIER_CONFIG[activeTier].name} Brands</h2>
                <p className="text-white/70 text-sm">{BRAND_TIER_CONFIG[activeTier].description}</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-black/20 backdrop-blur rounded-xl px-4 py-3 text-center">
                  <div className="text-2xl font-black text-white">{tierStats[activeTier]?.count || 0}</div>
                  <div className="text-white/60 text-xs">Brands</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showFilters ? "bg-indigo-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"}`}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {hasFilters && <span className="w-2 h-2 bg-amber-400 rounded-full" />}
          </button>

          {/* Industry filter */}
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            data-testid="select-industry"
          >
            {BRAND_INDUSTRIES.map((i) => <option key={i} value={i} className="text-gray-900">{i}</option>)}
          </select>

          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            data-testid="select-tier"
          >
            <option value="all" className="text-gray-900">All Tiers</option>
            {BRAND_TIER_ORDER.map((t) => (
              <option key={t} value={t} className="text-gray-900">{BRAND_TIER_CONFIG[t].name}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            data-testid="select-sort"
          >
            <option value="campaigns" className="text-gray-900">Most Active</option>
            <option value="rating" className="text-gray-900">Top Rated</option>
            <option value="spend" className="text-gray-900">Highest Budget</option>
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${verifiedOnly ? "bg-blue-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
              data-testid="button-verified-filter"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Verified
            </button>
            {hasFilters && (
              <button onClick={resetFilters} className="text-white/40 hover:text-white/80 text-xs flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <div className="flex gap-1 border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                data-testid="button-grid-view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                data-testid="button-list-view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <label className="text-white/60 text-sm">Near Me Radius</label>
              <input
                type="range" min={10} max={500} step={10} value={nearMeRadius}
                onChange={(e) => setNearMeRadius(Number(e.target.value))}
                className="w-28"
                data-testid="input-radius"
              />
              <span className="text-white text-sm font-bold">{nearMeRadius} mi</span>
              {!userLocation && (
                <button onClick={requestLocation} className="text-emerald-400 text-xs font-semibold hover:text-emerald-300">
                  Enable location
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Brand Grid / List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 bg-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-24">
            <Building2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">No brands found</h3>
            <p className="text-white/40 text-sm mb-6">Try adjusting your filters or search terms</p>
            <button onClick={resetFilters} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/50 text-sm">
                <span className="text-white font-bold">{filteredBrands.length}</span> {filteredBrands.length === 1 ? "brand" : "brands"} found
                {nearMeOnly && userLocation && " • sorted by distance"}
              </p>
            </div>
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              : "flex flex-col gap-4"
            }>
              {filteredBrands.map((brand, i) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  rank={i + 1}
                  distanceMi={nearMeOnly ? brand._distance : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Spotlight page="products" title="Trending on Taskdrip" subtitle="Products, services & more curated by our team" variant="row" />
      </div>

      <Footer />
    </div>
  );
}
