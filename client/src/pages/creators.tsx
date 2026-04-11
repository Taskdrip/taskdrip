import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTierConfig, formatFollowers, NICHES, TIER_ORDER, TIER_CONFIG, type CreatorTier } from "@/lib/tiers";
import {
  Search, MapPin, Star, MessageSquare, Users, ExternalLink, ChevronRight,
  ArrowLeft, Trophy, TrendingUp, CheckCircle, Zap, DollarSign, BarChart3,
  Globe, LayoutGrid, List, SlidersHorizontal, X, Award
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const PLATFORMS = ["All", "TikTok", "YouTube", "Instagram", "Twitter", "Twitch", "Telegram"];
const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  TikTok:    { bg: "bg-pink-50",   text: "text-pink-600",   label: "TikTok" },
  YouTube:   { bg: "bg-red-50",    text: "text-red-600",    label: "YT" },
  Instagram: { bg: "bg-purple-50", text: "text-purple-600", label: "IG" },
  Twitter:   { bg: "bg-blue-50",   text: "text-blue-600",   label: "X" },
  Twitch:    { bg: "bg-violet-50", text: "text-violet-600", label: "Twitch" },
  Telegram:  { bg: "bg-sky-50",    text: "text-sky-600",    label: "TG" },
};

function formatEarnings(val: string | number | null | undefined): string {
  const n = parseFloat(String(val || "0"));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/* ─── Tier Overview Card ─── */
function TierHeroCard({
  tierId, count, totalEarnings, avgFollowers, topCreators, onClick,
}: {
  tierId: CreatorTier; count: number; totalEarnings: number;
  avgFollowers: number; topCreators: any[]; onClick: () => void;
}) {
  const tier = TIER_CONFIG[tierId];

  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-3xl overflow-hidden group focus:outline-none"
      style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
    >
      {/* Gradient background */}
      <div className={`bg-gradient-to-br ${tier.gradient} relative overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-5xl mb-2 filter drop-shadow-lg">{tier.icon}</div>
              <h3 className="text-2xl font-black text-white tracking-tight">{tier.name}</h3>
              <p className="text-white/70 text-sm font-medium mt-0.5">{tier.range} followers</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white tabular-nums">{count}</div>
              <div className="text-white/60 text-xs mt-0.5">{count === 1 ? "Creator" : "Creators"}</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-black/20 backdrop-blur rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white/60 text-xs">Total Earned</span>
              </div>
              <div className="text-white font-black text-lg">{formatEarnings(totalEarnings)}</div>
            </div>
            <div className="bg-black/20 backdrop-blur rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white/60 text-xs">Avg Followers</span>
              </div>
              <div className="text-white font-black text-lg">{formatFollowers(Math.round(avgFollowers))}</div>
            </div>
          </div>

          {/* Top creators preview */}
          {topCreators.length > 0 && (
            <div className="mb-5">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2.5">Top Creators</p>
              <div className="flex -space-x-2">
                {topCreators.slice(0, 5).map((c, i) => (
                  <Avatar key={c.id} className="w-9 h-9 border-2 border-white/40 shadow-lg" style={{ zIndex: 5 - i }}>
                    <AvatarImage src={c.profileImageUrl || ""} />
                    <AvatarFallback className="bg-black/30 text-white text-xs font-bold">
                      {(c.firstName?.[0] || "C").toUpperCase()}
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

          {/* CTA */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-2xl px-4 py-3 group-hover:bg-white/30 transition-all">
            <span className="text-white font-bold text-sm flex-1">Explore {tier.name}</span>
            <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Creator Row (list view) ─── */
function CreatorRow({ creator, rank }: { creator: any; rank: number }) {
  const tier = getTierConfig(creator.creatorTier || "rising_sparks");
  const totalFollowers = creator.totalFollowers || 0;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors group">
      <div className={`text-sm font-black w-6 text-center flex-shrink-0 ${rank <= 3 ? tier.text : "text-gray-300"}`}>
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
      </div>
      <Avatar className="w-12 h-12 border-2 border-gray-100 flex-shrink-0">
        <AvatarImage src={creator.profileImageUrl || ""} />
        <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold`}>
          {(creator.firstName?.[0] || "C").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-sm truncate">
            {creator.firstName} {creator.lastName}
          </span>
          {creator.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          {creator.niche && (
            <Badge variant="secondary" className="text-xs">{creator.niche}</Badge>
          )}
        </div>
        {creator.username && (
          <p className="text-gray-400 text-xs">@{creator.username}</p>
        )}
      </div>
      <div className="hidden sm:block text-right flex-shrink-0">
        <div className={`font-black text-sm ${tier.text}`}>{formatFollowers(totalFollowers)}</div>
        <div className="text-gray-400 text-xs">followers</div>
      </div>
      <div className="hidden md:block text-right flex-shrink-0">
        <div className="font-bold text-sm text-green-600">{formatEarnings(creator.totalEarned)}</div>
        <div className="text-gray-400 text-xs">earned</div>
      </div>
      <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-semibold">{parseFloat(creator.rating || "0").toFixed(1)}</span>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Link href={`/profile/${creator.id}`}>
          <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs px-3">
            <ExternalLink className="w-3 h-3 mr-1" /> Profile
          </Button>
        </Link>
        <Link href={`/messages?to=${creator.id}`}>
          <Button size="sm" className={`rounded-xl h-8 text-xs px-3 bg-gradient-to-r ${tier.gradient} text-white border-0`}>
            <MessageSquare className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── Creator Card (grid view) ─── */
function CreatorCard({ creator, rank }: { creator: any; rank: number }) {
  const tier = getTierConfig(creator.creatorTier || "rising_sparks");
  const totalFollowers = creator.totalFollowers || 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
      {/* Banner */}
      <div className={`h-24 bg-gradient-to-br ${tier.gradient} relative flex-shrink-0`}>
        {creator.bannerImageUrl && (
          <img src={creator.bannerImageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Rank badge */}
        <div className="absolute top-3 left-3">
          {rank <= 3 && (
            <span className="text-lg">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tier.badge} shadow-sm`}>
            {tier.icon} {tier.name}
          </span>
        </div>
      </div>

      <div className="p-4 -mt-8 relative flex flex-col flex-1">
        {/* Avatar */}
        <Avatar className="w-16 h-16 border-4 border-white shadow-lg ring-2 ring-gray-100 mb-3">
          <AvatarImage src={creator.profileImageUrl || ""} />
          <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold text-xl`}>
            {(creator.firstName?.[0] || "C").toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="mb-2">
          <h3 className="font-black text-gray-900 text-sm leading-tight flex items-center gap-1 flex-wrap">
            {creator.firstName} {creator.lastName}
            {creator.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
          </h3>
          {creator.username && <p className="text-gray-400 text-xs">@{creator.username}</p>}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {creator.niche && (
            <Badge className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">{creator.niche}</Badge>
          )}
          {creator.location && (
            <span className="flex items-center text-gray-400 text-xs gap-0.5">
              <MapPin className="w-2.5 h-2.5" />{creator.location}
            </span>
          )}
        </div>

        {creator.bio && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">{creator.bio}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 flex-1">
          <div className={`rounded-xl p-2.5 text-center ${tier.bg}`}>
            <div className={`text-sm font-black ${tier.text}`}>{formatFollowers(totalFollowers)}</div>
            <div className="text-gray-500 text-xs mt-0.5">Followers</div>
          </div>
          <div className="rounded-xl p-2.5 text-center bg-green-50">
            <div className="text-sm font-black text-green-700">{formatEarnings(creator.totalEarned)}</div>
            <div className="text-gray-500 text-xs mt-0.5">Earned</div>
          </div>
          <div className="rounded-xl p-2.5 text-center bg-yellow-50">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-black text-yellow-700">{parseFloat(creator.rating || "0").toFixed(1)}</span>
            </div>
            <div className="text-gray-500 text-xs mt-0.5">Rating</div>
          </div>
        </div>

        {/* Platform pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {(["TikTok", "YouTube", "Instagram", "Twitter", "Twitch", "Telegram"] as const).map((platform) => {
            const fieldMap: Record<string, string> = {
              TikTok: "tiktokFollowers", YouTube: "youtubeFollowers",
              Instagram: "instagramFollowers", Twitter: "twitterFollowers",
              Twitch: "twitchFollowers", Telegram: "telegramFollowers",
            };
            const val = creator[fieldMap[platform]];
            if (!val || val === 0) return null;
            const style = PLATFORM_STYLES[platform];
            return (
              <span key={platform} className={`text-xs ${style.bg} ${style.text} px-1.5 py-0.5 rounded-full font-medium`}>
                {style.label} {formatFollowers(val)}
              </span>
            );
          })}
        </div>

        {/* Campaign count */}
        {creator.completedCampaigns > 0 && (
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
            <Zap className="w-3 h-3" />
            <span>{creator.completedCampaigns} campaigns completed</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <Link href={`/profile/${creator.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full rounded-xl border-gray-200 text-xs h-8">
              <ExternalLink className="w-3 h-3 mr-1" /> Profile
            </Button>
          </Link>
          <Link href={`/messages?to=${creator.id}`} className="flex-1">
            <Button size="sm" className={`w-full rounded-xl text-xs h-8 bg-gradient-to-r ${tier.gradient} border-0 text-white`}>
              <MessageSquare className="w-3 h-3 mr-1" /> Message
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Creators() {
  const { isAuthenticated } = useAuth();
  const [activeTier, setActiveTier] = useState<CreatorTier | null>(null);
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("followers");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: tierData = {}, isLoading } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/creators/by-tier"],
  });

  const tierStats = useMemo(() => {
    const stats: Record<string, { count: number; totalEarnings: number; avgFollowers: number; topCreators: any[] }> = {};
    for (const t of TIER_ORDER) {
      const creators = tierData[t] || [];
      const totalEarnings = creators.reduce((sum: number, c: any) => sum + parseFloat(c.totalEarned || "0"), 0);
      const avgFollowers = creators.length > 0
        ? creators.reduce((sum: number, c: any) => sum + (c.totalFollowers || 0), 0) / creators.length
        : 0;
      stats[t] = { count: creators.length, totalEarnings, avgFollowers, topCreators: creators.slice(0, 5) };
    }
    return stats;
  }, [tierData]);

  const totalCreators = useMemo(() => TIER_ORDER.reduce((s, t) => s + (tierStats[t]?.count || 0), 0), [tierStats]);
  const totalEarningsAll = useMemo(() => TIER_ORDER.reduce((s, t) => s + (tierStats[t]?.totalEarnings || 0), 0), [tierStats]);

  const currentTierCreators = useMemo((): any[] => {
    if (!activeTier) return [];
    return (tierData[activeTier] || [])
      .filter((c: any) => {
        if (niche !== "all" && c.niche !== niche) return false;
        if (platform !== "All") {
          const platformFieldMap: Record<string, string> = {
            TikTok: "tiktokFollowers", YouTube: "youtubeFollowers",
            Instagram: "instagramFollowers", Twitter: "twitterFollowers",
            Twitch: "twitchFollowers", Telegram: "telegramFollowers",
          };
          const key = platformFieldMap[platform];
          if (!c[key] || c[key] === 0) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          const name = `${c.firstName} ${c.lastName}`.toLowerCase();
          return name.includes(q) || (c.username || "").toLowerCase().includes(q)
            || (c.niche || "").toLowerCase().includes(q) || (c.location || "").toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "followers") return (b.totalFollowers || 0) - (a.totalFollowers || 0);
        if (sortBy === "earnings") return parseFloat(b.totalEarned || "0") - parseFloat(a.totalEarned || "0");
        if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
        if (sortBy === "campaigns") return (b.completedCampaigns || 0) - (a.completedCampaigns || 0);
        return 0;
      });
  }, [activeTier, tierData, niche, platform, search, sortBy]);

  const activeTierConfig = activeTier ? TIER_CONFIG[activeTier] : null;

  const resetFilters = () => { setSearch(""); setNiche("all"); setPlatform("All"); };
  const hasFilters = search || niche !== "all" || platform !== "All";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <NavigationFixed />

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-blue-900/30" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {activeTier && activeTierConfig ? (
            <div>
              <button
                onClick={() => { setActiveTier(null); resetFilters(); }}
                className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors text-sm group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to All Tiers
              </button>
              <div className="flex flex-wrap items-center gap-5 mb-4">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${activeTierConfig.gradient} flex items-center justify-center text-4xl shadow-2xl`}>
                  {activeTierConfig.icon}
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white">{activeTierConfig.name}</h1>
                  <p className="text-white/50 mt-1 text-lg">{activeTierConfig.range} followers</p>
                </div>
              </div>
              {/* Tier quick stats */}
              <div className="flex flex-wrap gap-4 mt-6">
                {[
                  { icon: <Users className="w-4 h-4" />, label: "Creators", value: `${tierStats[activeTier]?.count || 0}` },
                  { icon: <DollarSign className="w-4 h-4" />, label: "Total Earned", value: formatEarnings(tierStats[activeTier]?.totalEarnings || 0) },
                  { icon: <TrendingUp className="w-4 h-4" />, label: "Avg Followers", value: formatFollowers(Math.round(tierStats[activeTier]?.avgFollowers || 0)) },
                  { icon: <BarChart3 className="w-4 h-4" />, label: "Showing", value: `${currentTierCreators.length} results` },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-2.5">
                    <span className="text-white/50">{s.icon}</span>
                    <div>
                      <div className="text-white font-bold text-sm">{s.value}</div>
                      <div className="text-white/40 text-xs">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-14 h-14 bg-purple-500/20 border border-purple-400/30 rounded-2xl flex items-center justify-center">
                  <Globe className="w-7 h-7 text-purple-400" />
                </div>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-white mb-4 leading-none">
                Influencer <span className="bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text">Tiers</span>
              </h1>
              <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
                Discover {totalCreators} verified creators across 4 elite tiers — from rising stars to global icons.
              </p>
              {/* Global stats */}
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { icon: "🌍", label: "Total Creators", value: totalCreators.toString() },
                  { icon: "💰", label: "Total Paid Out", value: formatEarnings(totalEarningsAll) },
                  { icon: "👑", label: "Tiers", value: "4" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center backdrop-blur">
                    <div className="text-white font-black text-xl">{s.icon} {s.value}</div>
                    <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {!activeTier ? (
          /* ── Tier Overview Grid ── */
          <div className="-mt-6 relative z-10">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {TIER_ORDER.map((tierId) => (
                  <TierHeroCard
                    key={tierId}
                    tierId={tierId}
                    count={tierStats[tierId]?.count || 0}
                    totalEarnings={tierStats[tierId]?.totalEarnings || 0}
                    avgFollowers={tierStats[tierId]?.avgFollowers || 0}
                    topCreators={tierStats[tierId]?.topCreators || []}
                    onClick={() => setActiveTier(tierId)}
                  />
                ))}
              </div>
            )}

            {!isAuthenticated && (
              <div className="mt-10 bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur border border-white/10 text-white rounded-3xl p-8 sm:p-12 text-center">
                <Award className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-3xl font-black mb-3">Connect with Elite Influencers</h3>
                <p className="text-white/60 mb-8 max-w-md mx-auto">Create a brand account to message creators, launch campaigns, and track performance.</p>
                <Link href="/signup?type=brand">
                  <Button className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90 px-10 py-6 rounded-2xl font-bold text-base shadow-2xl border-0">
                    Get Started Free →
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* ── Tier Detail View ── */
          <div className="pt-6">
            {/* Filter bar */}
            <div className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-5 mb-6">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Search */}
                  <div className="sm:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      placeholder="Search name, username, niche, location..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/20 h-10"
                    />
                  </div>
                  {/* Niche */}
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="rounded-2xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white focus:outline-none h-10"
                  >
                    <option value="all" className="bg-gray-900">All Niches</option>
                    {NICHES.map((n) => <option key={n} value={n} className="bg-gray-900">{n}</option>)}
                  </select>
                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-2xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white focus:outline-none h-10"
                  >
                    <option value="followers" className="bg-gray-900">Most Followers</option>
                    <option value="earnings" className="bg-gray-900">Most Earnings</option>
                    <option value="rating" className="bg-gray-900">Top Rated</option>
                    <option value="campaigns" className="bg-gray-900">Most Campaigns</option>
                  </select>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Platform pills */}
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlatform(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          platform === p
                            ? "bg-white text-black font-bold"
                            : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Clear filters */}
                    {hasFilters && (
                      <button onClick={resetFilters} className="flex items-center gap-1 text-white/40 hover:text-white text-xs transition-colors">
                        <X className="w-3.5 h-3.5" /> Clear
                      </button>
                    )}
                    {/* View toggle */}
                    <div className="flex bg-white/10 rounded-xl p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center gap-2 mb-5 text-white/50 text-sm">
              <SlidersHorizontal className="w-4 h-4" />
              <span>{currentTierCreators.length} influencer{currentTierCreators.length !== 1 ? "s" : ""}</span>
              {activeTierConfig && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${activeTierConfig.gradient} text-white ml-1`}>
                  {activeTierConfig.icon} {activeTierConfig.name}
                </span>
              )}
            </div>

            {currentTierCreators.length === 0 ? (
              <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                <Users className="w-14 h-14 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white/60 mb-2">No influencers found</h3>
                <p className="text-white/30 text-sm mb-4">Try adjusting your filters</p>
                <button onClick={resetFilters} className="text-white/50 hover:text-white text-sm underline">Clear all filters</button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {currentTierCreators.map((creator: any, i: number) => (
                  <CreatorCard key={creator.id} creator={creator} rank={i + 1} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {currentTierCreators.map((creator: any, i: number) => (
                  <CreatorRow key={creator.id} creator={creator} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
