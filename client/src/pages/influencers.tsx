import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTierConfig, formatFollowers, NICHES, TIER_ORDER, TIER_CONFIG, type CreatorTier } from "@/lib/tiers";
import {
  Search, MapPin, Star, MessageSquare, Users, ExternalLink, ChevronRight,
  ArrowLeft, Trophy, TrendingUp, CheckCircle, Zap, DollarSign, BarChart3,
  Globe, LayoutGrid, List, SlidersHorizontal, X, Award, Filter, Flame, Crown,
  Bot, GitCompare, CheckSquare, Square, Sparkles, TrendingDown, BarChart2,
  Activity, Target, AlertTriangle, ChevronDown, ChevronUp, Eye, RefreshCw
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const PLATFORMS = ["All", "TikTok", "YouTube", "Instagram", "Twitter", "Twitch", "Telegram"];
const PLATFORM_ICONS: Record<string, string> = {
  TikTok: "🎵", YouTube: "▶️", Instagram: "📸", Twitter: "𝕏", Twitch: "🎮", Telegram: "✈️",
};
const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "#ff2d78", YouTube: "#ff0000", Instagram: "#e1306c", Twitter: "#1da1f2",
  Twitch: "#9146ff", Telegram: "#0088cc",
};
const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  TikTok:    { bg: "bg-pink-50",   text: "text-pink-600",   label: "TikTok" },
  YouTube:   { bg: "bg-red-50",    text: "text-red-600",    label: "YT" },
  Instagram: { bg: "bg-purple-50", text: "text-purple-600", label: "IG" },
  Twitter:   { bg: "bg-blue-50",   text: "text-blue-600",   label: "X" },
  Twitch:    { bg: "bg-violet-50", text: "text-violet-600", label: "Twitch" },
  Telegram:  { bg: "bg-sky-50",    text: "text-sky-600",    label: "TG" },
};
const TIER_LABELS: Record<string, string> = {
  global_titans: "Global Titans", power_influencers: "Power Influencers",
  growth_engines: "Growth Engines", rising_sparks: "Rising Sparks",
};

function formatEarnings(val: string | number | null | undefined): string {
  const n = parseFloat(String(val || "0"));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/* ─── Tier Hero Card ─── */
function TierHeroCard({
  tierId, count, totalEarnings, avgFollowers, topCreators, onClick,
}: {
  tierId: CreatorTier; count: number; totalEarnings: number;
  avgFollowers: number; topCreators: any[]; onClick: () => void;
}) {
  const tier = TIER_CONFIG[tierId];
  return (
    <button onClick={onClick}
      className="relative w-full text-left rounded-3xl overflow-hidden group focus:outline-none"
      style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
      <div className={`bg-gradient-to-br ${tier.gradient} relative overflow-hidden`}>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-5xl mb-2 filter drop-shadow-lg">{tier.icon}</div>
              <h3 className="text-2xl font-black text-white tracking-tight">{tier.name}</h3>
              <p className="text-white/70 text-sm font-medium mt-0.5">{tier.range} followers</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white tabular-nums">{count}</div>
              <div className="text-white/60 text-xs mt-0.5">{count === 1 ? "Influencer" : "Influencers"}</div>
            </div>
          </div>
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
          {topCreators.length > 0 && (
            <div className="mb-5">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2.5">Top Influencers</p>
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
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-2xl px-4 py-3 group-hover:bg-white/30 transition-all">
            <span className="text-white font-bold text-sm flex-1">Explore {tier.name}</span>
            <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Influencer Card (grid view) with compare select ─── */
function CreatorCard({
  influencer, rank, selected, onToggleSelect, compareMode,
}: {
  influencer: any; rank: number; selected: boolean; onToggleSelect: (id: string) => void; compareMode: boolean;
}) {
  const tier = getTierConfig(influencer.creatorTier || "rising_sparks");
  const totalFollowers = influencer.totalFollowers || 0;

  return (
    <div className={`bg-white rounded-3xl border-2 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col relative ${selected ? "border-violet-500 shadow-lg shadow-violet-100" : "border-gray-100"}`}>
      {compareMode && (
        <button onClick={() => onToggleSelect(influencer.id)}
          className={`absolute top-3 left-3 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-lg ${selected ? "bg-violet-600 text-white" : "bg-white/90 text-gray-400 hover:text-violet-600"}`}>
          {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>
      )}
      <div className={`h-24 bg-gradient-to-br ${tier.gradient} relative flex-shrink-0`}>
        {influencer.bannerImageUrl && (
          <img src={influencer.bannerImageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tier.badge} shadow-sm`}>
            {tier.icon} {tier.name}
          </span>
        </div>
        {rank <= 3 && (
          <div className={`absolute bottom-2 left-3 text-lg ${compareMode ? "left-12" : ""}`}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </div>
        )}
      </div>

      <div className="p-4 -mt-8 relative flex flex-col flex-1">
        <Avatar className="w-16 h-16 border-4 border-white shadow-lg ring-2 ring-gray-100 mb-3">
          <AvatarImage src={influencer.profileImageUrl || ""} />
          <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold text-xl`}>
            {(influencer.firstName?.[0] || "C").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="mb-2">
          <h3 className="font-black text-gray-900 text-sm leading-tight flex items-center gap-1 flex-wrap">
            {influencer.firstName} {influencer.lastName}
            {influencer.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
          </h3>
          {influencer.username && <p className="text-gray-400 text-xs">@{influencer.username}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {influencer.niche && (
            <Badge className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">{influencer.niche}</Badge>
          )}
          {influencer.location && (
            <span className="flex items-center text-gray-400 text-xs gap-0.5">
              <MapPin className="w-2.5 h-2.5" />{influencer.location}
            </span>
          )}
        </div>
        {influencer.bio && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">{influencer.bio}</p>
        )}
        <div className="grid grid-cols-3 gap-2 mb-3 flex-1">
          <div className={`rounded-xl p-2.5 text-center ${tier.bg}`}>
            <div className={`text-sm font-black ${tier.text}`}>{formatFollowers(totalFollowers)}</div>
            <div className="text-gray-500 text-xs mt-0.5">Followers</div>
          </div>
          <div className="rounded-xl p-2.5 text-center bg-green-50">
            <div className="text-sm font-black text-green-700">{formatEarnings(influencer.totalEarned)}</div>
            <div className="text-gray-500 text-xs mt-0.5">Earned</div>
          </div>
          <div className="rounded-xl p-2.5 text-center bg-yellow-50">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-black text-yellow-700">{parseFloat(influencer.rating || "0").toFixed(1)}</span>
            </div>
            <div className="text-gray-500 text-xs mt-0.5">Rating</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {(["TikTok", "YouTube", "Instagram", "Twitter", "Twitch", "Telegram"] as const).map((platform) => {
            const fm: Record<string, string> = {
              TikTok: "tiktokFollowers", YouTube: "youtubeFollowers",
              Instagram: "instagramFollowers", Twitter: "twitterFollowers",
              Twitch: "twitchFollowers", Telegram: "telegramFollowers",
            };
            const val = influencer[fm[platform]];
            if (!val || val === 0) return null;
            const style = PLATFORM_STYLES[platform];
            return (
              <span key={platform} className={`text-xs ${style.bg} ${style.text} px-1.5 py-0.5 rounded-full font-medium`}>
                {PLATFORM_ICONS[platform]} {formatFollowers(val)}
              </span>
            );
          })}
        </div>
        {influencer.completedCampaigns > 0 && (
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
            <Zap className="w-3 h-3" />
            <span>{influencer.completedCampaigns} campaigns completed</span>
          </div>
        )}
        <div className="flex gap-2 mt-auto">
          <Link href={`/profile/${influencer.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full rounded-xl border-gray-200 text-xs h-8">
              <ExternalLink className="w-3 h-3 mr-1" /> Profile
            </Button>
          </Link>
          <Link href={`/messages?to=${influencer.id}`} className="flex-1">
            <Button size="sm" className={`w-full rounded-xl text-xs h-8 bg-gradient-to-r ${tier.gradient} border-0 text-white`}>
              <MessageSquare className="w-3 h-3 mr-1" /> Message
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Influencer Row (list view) ─── */
function CreatorRow({
  influencer, rank, selected, onToggleSelect, compareMode,
}: {
  influencer: any; rank: number; selected: boolean; onToggleSelect: (id: string) => void; compareMode: boolean;
}) {
  const tier = getTierConfig(influencer.creatorTier || "rising_sparks");
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl transition-colors group ${selected ? "bg-violet-50 border border-violet-200" : "hover:bg-gray-50 border border-transparent"}`}>
      {compareMode && (
        <button onClick={() => onToggleSelect(influencer.id)}
          className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center transition-all ${selected ? "bg-violet-600 text-white" : "border border-gray-300 text-gray-400 hover:text-violet-600"}`}>
          {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </button>
      )}
      <div className={`text-sm font-black w-6 text-center flex-shrink-0 ${rank <= 3 ? tier.text : "text-gray-300"}`}>
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
      </div>
      <Avatar className="w-12 h-12 border-2 border-gray-100 flex-shrink-0">
        <AvatarImage src={influencer.profileImageUrl || ""} />
        <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold`}>
          {(influencer.firstName?.[0] || "C").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-sm truncate">{influencer.firstName} {influencer.lastName}</span>
          {influencer.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          {influencer.niche && <Badge variant="secondary" className="text-xs">{influencer.niche}</Badge>}
        </div>
        {influencer.username && <p className="text-gray-400 text-xs">@{influencer.username}</p>}
      </div>
      <div className="hidden sm:block text-right flex-shrink-0">
        <div className={`font-black text-sm ${tier.text}`}>{formatFollowers(influencer.totalFollowers || 0)}</div>
        <div className="text-gray-400 text-xs">followers</div>
      </div>
      <div className="hidden md:block text-right flex-shrink-0">
        <div className="font-bold text-sm text-green-600">{formatEarnings(influencer.totalEarned)}</div>
        <div className="text-gray-400 text-xs">earned</div>
      </div>
      <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-semibold">{parseFloat(influencer.rating || "0").toFixed(1)}</span>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Link href={`/profile/${influencer.id}`}>
          <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs px-3">
            <ExternalLink className="w-3 h-3 mr-1" /> Profile
          </Button>
        </Link>
        <Link href={`/messages?to=${influencer.id}`}>
          <Button size="sm" className={`rounded-xl h-8 text-xs px-3 bg-gradient-to-r ${tier.gradient} text-white border-0`}>
            <MessageSquare className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── AI Comparison Modal ─── */
function CompareModal({
  open, onClose, selectedIds,
}: {
  open: boolean; onClose: () => void; selectedIds: string[];
}) {
  const compareMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/ai/compare-influencers", { ids });
      return await res.json();
    },
  });

  useEffect(() => {
    if (open && selectedIds.length >= 2) {
      compareMutation.mutate(selectedIds);
    }
  }, [open, selectedIds.join(",")]);

  const data = compareMutation.data;

  const followerChartData = useMemo(() => {
    if (!data?.profiles) return [];
    return data.profiles.map((p: any) => ({
      name: p.name.split(" ")[0],
      followers: Math.round(p.totalFollowers / 1000),
    }));
  }, [data]);

  const engagementChartData = useMemo(() => {
    if (!data?.profiles) return [];
    return data.profiles.map((p: any) => ({
      name: p.name.split(" ")[0],
      engagement: p.engagementRate,
      rating: p.rating,
      campaigns: p.completedCampaigns,
    }));
  }, [data]);

  const radarData = useMemo(() => {
    if (!data?.profiles) return [];
    const metrics = ["Followers", "Engagement", "Rating", "Campaigns", "Earnings"];
    const maxFollowers = Math.max(...data.profiles.map((p: any) => p.totalFollowers), 1);
    const maxEarnings = Math.max(...data.profiles.map((p: any) => p.totalEarned), 1);
    return metrics.map((m) => {
      const entry: any = { metric: m };
      data.profiles.forEach((p: any) => {
        if (m === "Followers") entry[p.name.split(" ")[0]] = (p.totalFollowers / maxFollowers) * 100;
        else if (m === "Engagement") entry[p.name.split(" ")[0]] = (p.engagementRate / 15) * 100;
        else if (m === "Rating") entry[p.name.split(" ")[0]] = (p.rating / 5) * 100;
        else if (m === "Campaigns") entry[p.name.split(" ")[0]] = Math.min(100, p.completedCampaigns * 5);
        else if (m === "Earnings") entry[p.name.split(" ")[0]] = (p.totalEarned / maxEarnings) * 100;
      });
      return entry;
    });
  }, [data]);

  const COLORS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#6366f1"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-purple-900 px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-black text-lg">AI Influencer Analysis</h2>
                <p className="text-white/60 text-xs">Smart comparative analytics powered by real data</p>
              </div>
            </div>
            {compareMutation.isPending && (
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                <span className="text-white/80 text-xs">Analyzing profiles...</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {compareMutation.isPending && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-10 h-10 text-violet-500 animate-pulse" />
              </div>
              <p className="text-gray-500 font-medium">Crawling profiles & generating AI report...</p>
              <p className="text-gray-400 text-sm mt-1">Analyzing follower data, engagement metrics & campaign history</p>
              <div className="flex justify-center gap-2 mt-6">
                {["Fetching data", "Calculating metrics", "Building report"].map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                    <span className="text-xs text-violet-600">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Profile Snapshots */}
              <div>
                <h3 className="text-gray-900 font-bold text-base mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-600" /> Profile Overview
                </h3>
                <div className={`grid gap-4 ${data.profiles.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : data.profiles.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {data.profiles.map((p: any, i: number) => {
                    const tier = getTierConfig(p.tier || "rising_sparks");
                    return (
                      <div key={p.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10" style={{ background: COLORS[i], transform: "translate(30%, -30%)" }} />
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-12 h-12 border-2 border-white shadow">
                            <AvatarImage src={p.avatar || ""} />
                            <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold`}>
                              {p.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-gray-900 text-sm leading-tight flex items-center gap-1">
                              {p.name}
                              {p.isVerified && <CheckCircle className="w-3 h-3 text-blue-500" />}
                            </p>
                            {p.username && <p className="text-gray-400 text-xs">@{p.username}</p>}
                          </div>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tier</span>
                            <span className="font-semibold" style={{ color: COLORS[i] }}>{TIER_LABELS[p.tier] || p.tier}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Niche</span>
                            <span className="font-semibold text-gray-700">{p.niche}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Followers</span>
                            <span className="font-semibold text-gray-900">{formatFollowers(p.totalFollowers)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Engagement</span>
                            <span className="font-semibold text-green-600">{p.engagementRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Rating</span>
                            <span className="font-semibold text-yellow-600">⭐ {p.rating.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Campaigns</span>
                            <span className="font-semibold text-violet-600">{p.completedCampaigns}</span>
                          </div>
                          {p.location && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Location</span>
                              <span className="font-semibold text-gray-700">{p.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5">
                <h3 className="text-gray-900 font-bold text-base mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" /> AI Insights
                  <Badge className="bg-violet-100 text-violet-700 text-xs ml-1">Powered by real data</Badge>
                </h3>
                <div className="space-y-2.5">
                  {data.insights?.map((insight: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-white/70 rounded-xl p-3">
                      <div className="w-5 h-5 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-violet-600 text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Follower Bar Chart */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-600" /> Total Followers (K)
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={followerChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <Tooltip formatter={(v: any) => [`${v}K`, "Followers"]} />
                      <Bar dataKey="followers" radius={[6, 6, 0, 0]}>
                        {followerChartData.map((_: any, i: number) => (
                          <rect key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                      {data.profiles.map((p: any, i: number) => (
                        <Bar key={p.id} dataKey="followers" fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Engagement + Rating */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" /> Engagement Rate (%)
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={engagementChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <Tooltip />
                      <Bar dataKey="engagement" name="Engagement %" fill="#059669" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="rating" name="Rating /5" fill="#d97706" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar chart */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 lg:col-span-2">
                  <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" /> Overall Performance Radar (0–100 scale)
                  </h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <PolarRadiusAxis tick={{ fontSize: 9, fill: "#9ca3af" }} domain={[0, 100]} />
                      {data.profiles.map((p: any, i: number) => (
                        <Radar key={p.id} name={p.name.split(" ")[0]} dataKey={p.name.split(" ")[0]}
                          stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                      ))}
                      <Legend />
                      <Tooltip formatter={(v: any) => `${Math.round(v)}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recommendation */}
              {data.recommendation?.name && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-600" /> AI Recommendation
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Based on a weighted analysis of reach, engagement rate, brand rating, campaign experience, and earnings,{" "}
                    <span className="font-bold text-emerald-700">{data.recommendation.name}</span>{" "}
                    scores highest overall and is recommended as the best fit for most brand campaigns.
                    They demonstrate strong performance across all key metrics including{" "}
                    <span className="font-semibold">{formatFollowers(data.recommendation.totalFollowers)} followers</span>,{" "}
                    <span className="font-semibold">{data.recommendation.engagementRate}% engagement</span>, and{" "}
                    <span className="font-semibold">{data.recommendation.completedCampaigns} completed campaigns</span>.
                  </p>
                </div>
              )}

              {/* Side-by-side stats table */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-gray-600" /> Detailed Comparison Table
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left px-5 py-3 text-gray-400 font-medium text-xs">Metric</th>
                        {data.profiles.map((p: any, i: number) => (
                          <th key={p.id} className="px-4 py-3 text-xs font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                            {p.name.split(" ")[0]}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-gray-400 font-medium text-xs">Best</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { label: "Total Followers", key: "totalFollowers", fmt: formatFollowers, winner: data.topFollowers?.name },
                        { label: "Engagement Rate", key: "engagementRate", fmt: (v: any) => `${v}%`, winner: data.topEngagement?.name },
                        { label: "Brand Rating", key: "rating", fmt: (v: any) => `⭐ ${v?.toFixed(1)}`, winner: data.topRated?.name },
                        { label: "Campaigns Done", key: "completedCampaigns", fmt: (v: any) => `${v}`, winner: data.topCampaigns?.name },
                        { label: "Total Earned", key: "totalEarned", fmt: (v: any) => formatEarnings(v), winner: data.topEarner?.name },
                        { label: "Niche", key: "niche", fmt: (v: any) => v, winner: null },
                        { label: "Location", key: "location", fmt: (v: any) => v, winner: null },
                      ].map(({ label, key, fmt, winner }) => (
                        <tr key={label} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-500 font-medium text-xs">{label}</td>
                          {data.profiles.map((p: any, i: number) => {
                            const isWinner = winner && p.name.includes(winner.split(" ")[0]);
                            return (
                              <td key={p.id} className={`px-4 py-3 text-center text-xs font-semibold ${isWinner ? "text-emerald-600" : "text-gray-700"}`}>
                                {fmt(p[key])}
                                {isWinner && " 🏆"}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center text-xs text-gray-400">{winner?.split(" ")[0] || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {compareMutation.isError && (
            <div className="text-center py-12 bg-red-50 rounded-2xl">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 font-semibold">Comparison failed</p>
              <p className="text-red-400 text-sm mt-1">Please try again</p>
              <Button className="mt-4" onClick={() => compareMutation.mutate(selectedIds)}>Retry</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─── */
export default function Influencers() {
  const { isAuthenticated } = useAuth();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const urlTier = params.get("tier") as CreatorTier | null;

  const [activeTier, setActiveTier] = useState<CreatorTier | null>(
    urlTier && TIER_ORDER.includes(urlTier) ? urlTier : null
  );
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("followers");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced filters
  const [tierFilter, setTierFilter] = useState<CreatorTier | "all">("all");
  const [minFollowers, setMinFollowers] = useState(0);
  const [maxFollowers, setMaxFollowers] = useState(10_000_000);
  const [minRating, setMinRating] = useState(0);
  const [minEngagement, setMinEngagement] = useState(0);
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(50_000);
  const [minCampaigns, setMinCampaigns] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Near Me / location filter
  const [nearMe, setNearMe] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationRadius, setLocationRadius] = useState(500); // km
  const [locLoading, setLocLoading] = useState(false);

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const requestNearMe = () => {
    if (nearMe) { setNearMe(false); return; }
    if (userLat !== null) { setNearMe(true); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setNearMe(true); setLocLoading(false); },
      () => { setLocLoading(false); },
    );
  };

  // Compare
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    if (urlTier && TIER_ORDER.includes(urlTier)) setActiveTier(urlTier);
  }, [searchStr]);

  const { data: tierData = {}, isLoading } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/creators/by-tier"],
  });

  const allCreators = useMemo(() => {
    return TIER_ORDER.flatMap((t) => tierData[t] || []);
  }, [tierData]);

  const tierStats = useMemo(() => {
    const stats: Record<string, { count: number; totalEarnings: number; avgFollowers: number; topCreators: any[] }> = {};
    for (const t of TIER_ORDER) {
      const influencers = tierData[t] || [];
      const totalEarnings = influencers.reduce((sum: number, c: any) => sum + parseFloat(c.totalEarned || "0"), 0);
      const avgFollowers = influencers.length > 0
        ? influencers.reduce((sum: number, c: any) => sum + (c.totalFollowers || 0), 0) / influencers.length : 0;
      stats[t] = { count: influencers.length, totalEarnings, avgFollowers, topCreators: influencers.slice(0, 5) };
    }
    return stats;
  }, [tierData]);

  const totalCreators = useMemo(() => TIER_ORDER.reduce((s, t) => s + (tierStats[t]?.count || 0), 0), [tierStats]);
  const totalEarningsAll = useMemo(() => TIER_ORDER.reduce((s, t) => s + (tierStats[t]?.totalEarnings || 0), 0), [tierStats]);

  const platformFieldMap: Record<string, string> = {
    TikTok: "tiktokFollowers", YouTube: "youtubeFollowers",
    Instagram: "instagramFollowers", Twitter: "twitterFollowers",
    Twitch: "twitchFollowers", Telegram: "telegramFollowers",
  };

  const filteredCreators = useMemo((): any[] => {
    const pool = activeTier ? (tierData[activeTier] || []) : allCreators;
    return pool.filter((c: any) => {
      if (tierFilter !== "all" && c.creatorTier !== tierFilter) return false;
      if (niche !== "all" && c.niche !== niche) return false;
      if (platform !== "All") {
        const key = platformFieldMap[platform];
        if (!c[key] || c[key] === 0) return false;
      }
      if (verifiedOnly && !c.isVerified) return false;
      const followers = c.totalFollowers || 0;
      if (followers < minFollowers || followers > maxFollowers) return false;
      const rating = parseFloat(c.rating || "0");
      if (rating < minRating) return false;
      if (c.completedCampaigns < minCampaigns) return false;
      const rates = c.contentRates as any || {};
      const allRates = Object.values(rates).map((v: any) => parseFloat(v || "0")).filter((v) => v > 0);
      if (allRates.length > 0) {
        const minR = Math.min(...allRates);
        if (minR > maxRate) return false;
        const maxR = Math.max(...allRates);
        if (maxR < minRate) return false;
      }
      if (nearMe && userLat !== null && userLng !== null) {
        const cLat = parseFloat(c.latitude);
        const cLng = parseFloat(c.longitude);
        if (isNaN(cLat) || isNaN(cLng)) return false;
        if (haversine(userLat, userLng, cLat, cLng) > locationRadius) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const name = `${c.firstName} ${c.lastName}`.toLowerCase();
        return name.includes(q) || (c.username || "").toLowerCase().includes(q)
          || (c.niche || "").toLowerCase().includes(q) || (c.location || "").toLowerCase().includes(q);
      }
      return true;
    }).sort((a: any, b: any) => {
      if (sortBy === "followers") return (b.totalFollowers || 0) - (a.totalFollowers || 0);
      if (sortBy === "earnings") return parseFloat(b.totalEarned || "0") - parseFloat(a.totalEarned || "0");
      if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
      if (sortBy === "campaigns") return (b.completedCampaigns || 0) - (a.completedCampaigns || 0);
      return 0;
    });
  }, [activeTier, tierData, allCreators, niche, platform, sortBy, search, tierFilter, minFollowers, maxFollowers, minRating, minEngagement, minRate, maxRate, minCampaigns, verifiedOnly, nearMe, userLat, userLng, locationRadius]);

  const activeTierConfig = activeTier ? TIER_CONFIG[activeTier] : null;

  const resetFilters = () => {
    setSearch(""); setNiche("all"); setPlatform("All"); setTierFilter("all");
    setMinFollowers(0); setMaxFollowers(10_000_000); setMinRating(0);
    setMinEngagement(0); setMinRate(0); setMaxRate(50_000); setMinCampaigns(0); setVerifiedOnly(false); setNearMe(false);
  };

  const hasFilters = search || niche !== "all" || platform !== "All" || tierFilter !== "all"
    || minFollowers > 0 || maxFollowers < 10_000_000 || minRating > 0
    || minRate > 0 || maxRate < 50_000 || minCampaigns > 0 || verifiedOnly || nearMe;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds([]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <NavigationFixed />

      {/* ── Hero Header with Background Image ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 360 }}>
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1600&q=80&fit=crop"
            alt="Influencer marketplace"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f]/90 via-purple-950/80 to-[#0a0a0f]/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        </div>
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          {activeTier && activeTierConfig ? (
            <div>
              <button onClick={() => { setActiveTier(null); resetFilters(); }}
                className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors text-sm group">
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
              <div className="flex flex-wrap gap-4 mt-6">
                {[
                  { icon: <Users className="w-4 h-4" />, label: "Influencers", value: `${tierStats[activeTier]?.count || 0}` },
                  { icon: <DollarSign className="w-4 h-4" />, label: "Total Earned", value: formatEarnings(tierStats[activeTier]?.totalEarnings || 0) },
                  { icon: <TrendingUp className="w-4 h-4" />, label: "Avg Followers", value: formatFollowers(Math.round(tierStats[activeTier]?.avgFollowers || 0)) },
                  { icon: <BarChart3 className="w-4 h-4" />, label: "Showing", value: `${filteredCreators.length} results` },
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
              <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span className="text-purple-300 text-sm font-medium">AI-Powered Influencer Discovery</span>
              </div>
              <h1 className="text-5xl sm:text-7xl font-black text-white mb-4 leading-none">
                Find Your Perfect<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text">Influencer</span>
              </h1>
              <p className="text-white/50 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                Discover {totalCreators} verified influencers across 4 elite tiers — filter by niche, platform, reach & engagement.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {[
                  { icon: "🌍", label: "Total Influencers", value: totalCreators.toString() },
                  { icon: "💰", label: "Total Paid Out", value: formatEarnings(totalEarningsAll) },
                  { icon: "👑", label: "Tiers", value: "4" },
                  { icon: "🤖", label: "AI Compare", value: "Free" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center backdrop-blur">
                    <div className="text-white font-black text-xl">{s.icon} {s.value}</div>
                    <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Quick search bar in hero */}
              <div className="max-w-xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search influencers by name, niche, or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 backdrop-blur focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* ── Advanced Filter Panel (always visible when browsing influencers) ── */}
        <div className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-5 mb-6 -mt-6 relative z-10">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search (only when inside tier) */}
            {activeTier && (
              <div className="sm:flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input placeholder="Search name, username, niche..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none h-10" />
              </div>
            )}

            {/* Niche */}
            <select value={niche} onChange={(e) => setNiche(e.target.value)}
              className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white focus:outline-none h-10 cursor-pointer">
              <option value="all" className="bg-gray-900">🎯 All Niches</option>
              {NICHES.map((n) => <option key={n} value={n} className="bg-gray-900">{n}</option>)}
            </select>

            {/* Tier filter (when not inside a tier) */}
            {!activeTier && (
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)}
                className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white focus:outline-none h-10 cursor-pointer">
                <option value="all" className="bg-gray-900">👑 All Tiers</option>
                {TIER_ORDER.map((t) => <option key={t} value={t} className="bg-gray-900">{TIER_LABELS[t]}</option>)}
              </select>
            )}

            {/* Sort */}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white focus:outline-none h-10 cursor-pointer">
              <option value="followers" className="bg-gray-900">↓ Most Followers</option>
              <option value="earnings" className="bg-gray-900">↓ Most Earnings</option>
              <option value="rating" className="bg-gray-900">↓ Top Rated</option>
              <option value="campaigns" className="bg-gray-900">↓ Most Campaigns</option>
            </select>

            {/* Near Me button */}
            <button onClick={requestNearMe} disabled={locLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all h-10 ${nearMe ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"}`}
              data-testid="button-near-me">
              {locLoading ? <span className="animate-spin text-xs">⏳</span> : <span>📍</span>}
              Near Me
            </button>

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all h-10 ${showAdvanced ? "bg-violet-600 border-violet-500 text-white" : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"}`}>
              <Filter className="w-4 h-4" />
              Advanced
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Platform pills */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${platform === p ? "bg-white text-black font-bold" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                {p !== "All" && <span>{PLATFORM_ICONS[p]}</span>}
                {p}
              </button>
            ))}
          </div>

          {/* Advanced filters panel */}
          {showAdvanced && (
            <div className="border-t border-white/10 pt-4 mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Follower Range */}
              <div>
                <label className="text-white/60 text-xs font-semibold mb-2 block">
                  👥 Follower Range: <span className="text-white">{formatFollowers(minFollowers)} – {formatFollowers(maxFollowers)}</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>Min</span>
                    <input type="range" min={0} max={5_000_000} step={10_000} value={minFollowers}
                      onChange={(e) => setMinFollowers(Number(e.target.value))}
                      className="flex-1 accent-violet-500" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>Max</span>
                    <input type="range" min={10_000} max={10_000_000} step={50_000} value={maxFollowers}
                      onChange={(e) => setMaxFollowers(Number(e.target.value))}
                      className="flex-1 accent-violet-500" />
                  </div>
                </div>
              </div>

              {/* Engagement Rate */}
              <div>
                <label className="text-white/60 text-xs font-semibold mb-2 block">
                  📈 Min Engagement Rate: <span className="text-white">{minEngagement}%</span>
                </label>
                <input type="range" min={0} max={15} step={0.5} value={minEngagement}
                  onChange={(e) => setMinEngagement(Number(e.target.value))}
                  className="w-full accent-violet-500" />
                <div className="flex justify-between text-white/30 text-xs mt-1">
                  <span>0%</span><span>5%</span><span>10%</span><span>15%</span>
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-white/60 text-xs font-semibold mb-2 block">
                  ⭐ Min Rating: <span className="text-white">{minRating.toFixed(1)} / 5.0</span>
                </label>
                <input type="range" min={0} max={5} step={0.5} value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full accent-yellow-500" />
                <div className="flex justify-between text-white/30 text-xs mt-1">
                  {[0, 1, 2, 3, 4, 5].map((v) => <span key={v}>{v}</span>)}
                </div>
              </div>

              {/* Rate Range */}
              <div>
                <label className="text-white/60 text-xs font-semibold mb-2 block">
                  💵 Rate Range (USDT): <span className="text-white">${minRate.toLocaleString()} – ${maxRate.toLocaleString()}</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>Min</span>
                    <input type="range" min={0} max={25_000} step={100} value={minRate}
                      onChange={(e) => setMinRate(Number(e.target.value))}
                      className="flex-1 accent-green-500" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>Max</span>
                    <input type="range" min={500} max={50_000} step={500} value={maxRate}
                      onChange={(e) => setMaxRate(Number(e.target.value))}
                      className="flex-1 accent-green-500" />
                  </div>
                </div>
              </div>

              {/* Min Campaigns */}
              <div>
                <label className="text-white/60 text-xs font-semibold mb-2 block">
                  ⚡ Min Campaigns Done: <span className="text-white">{minCampaigns}</span>
                </label>
                <input type="range" min={0} max={50} step={1} value={minCampaigns}
                  onChange={(e) => setMinCampaigns(Number(e.target.value))}
                  className="w-full accent-orange-500" />
                <div className="flex justify-between text-white/30 text-xs mt-1">
                  <span>0</span><span>10</span><span>25</span><span>50+</span>
                </div>
              </div>

              {/* Verified only */}
              <div className="flex flex-col justify-between">
                <label className="text-white/60 text-xs font-semibold mb-2 block">✅ Influencer Options</label>
                <button onClick={() => setVerifiedOnly((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${verifiedOnly ? "bg-blue-600/30 border-blue-400 text-blue-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                  <CheckCircle className={`w-4 h-4 ${verifiedOnly ? "text-blue-400" : "text-white/30"}`} />
                  Verified influencers only
                </button>
              </div>

              {/* Near Me radius (visible only when nearMe is on) */}
              {nearMe && (
                <div>
                  <label className="text-white/60 text-xs font-semibold mb-2 block">
                    📍 Search Radius: <span className="text-white">{locationRadius} km</span>
                  </label>
                  <input type="range" min={50} max={5000} step={50} value={locationRadius}
                    onChange={(e) => setLocationRadius(Number(e.target.value))}
                    className="w-full accent-emerald-500" />
                  <div className="flex justify-between text-white/30 text-xs mt-1">
                    <span>50 km</span><span>500</span><span>2500</span><span>5000 km</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom row: results count + actions */}
          <div className="flex items-center justify-between flex-wrap gap-3 mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-white font-bold">{filteredCreators.length}</span>
                <span>influencer{filteredCreators.length !== 1 ? "s" : ""} found</span>
              </div>
              {hasFilters && (
                <button onClick={resetFilters} className="flex items-center gap-1 text-white/40 hover:text-white text-xs transition-colors border border-white/10 rounded-lg px-2 py-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Compare Mode Toggle */}
              <button onClick={() => { setCompareMode((v) => !v); if (compareMode) setSelectedIds([]); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${compareMode ? "bg-violet-600 border-violet-500 text-white" : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"}`}>
                <GitCompare className="w-4 h-4" />
                {compareMode ? `Select (${selectedIds.length})` : "Compare"}
              </button>
              {/* View toggle */}
              <div className="flex bg-white/10 rounded-xl p-1">
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {!activeTier && tierFilter === "all" && !hasFilters ? (
          /* ── Tier Overview Grid ── */
          <div className="relative z-10">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {TIER_ORDER.map((tierId) => (
                  <TierHeroCard key={tierId} tierId={tierId}
                    count={tierStats[tierId]?.count || 0}
                    totalEarnings={tierStats[tierId]?.totalEarnings || 0}
                    avgFollowers={tierStats[tierId]?.avgFollowers || 0}
                    topCreators={tierStats[tierId]?.topCreators || []}
                    onClick={() => setActiveTier(tierId)} />
                ))}
              </div>
            )}
            {!isAuthenticated && (
              <div className="mt-10 bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur border border-white/10 text-white rounded-3xl p-8 sm:p-12 text-center">
                <Award className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-3xl font-black mb-3">Connect with Elite Influencers</h3>
                <p className="text-white/60 mb-8 max-w-md mx-auto">Create a brand account to message influencers, launch campaigns, and track performance.</p>
                <Link href="/signup?type=brand">
                  <Button className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90 px-10 py-6 rounded-2xl font-bold text-base shadow-2xl border-0">
                    Get Started Free →
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* ── Filtered Influencers Grid/List ── */
          <div>
            {/* Tier label when filtering inside tier */}
            {activeTier && activeTierConfig && (
              <div className="flex items-center gap-2 mb-5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${activeTierConfig.gradient} text-white`}>
                  {activeTierConfig.icon} {activeTierConfig.name}
                </span>
                <span className="text-white/40 text-sm">{filteredCreators.length} influencers</span>
              </div>
            )}

            {filteredCreators.length === 0 ? (
              <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                <Users className="w-14 h-14 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white/60 mb-2">No influencers found</h3>
                <p className="text-white/30 text-sm mb-4">Try adjusting your filters</p>
                <button onClick={resetFilters} className="text-white/50 hover:text-white text-sm underline">Clear all filters</button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredCreators.map((influencer: any, i: number) => (
                  <CreatorCard key={influencer.id} influencer={influencer} rank={i + 1}
                    selected={selectedIds.includes(influencer.id)}
                    onToggleSelect={toggleSelect}
                    compareMode={compareMode} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {filteredCreators.map((influencer: any, i: number) => (
                  <CreatorRow key={influencer.id} influencer={influencer} rank={i + 1}
                    selected={selectedIds.includes(influencer.id)}
                    onToggleSelect={toggleSelect}
                    compareMode={compareMode} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating Compare Bar ── */}
      {compareMode && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3.5 shadow-2xl">
          <div className="flex -space-x-1">
            {selectedIds.slice(0, 4).map((id, i) => {
              const c = allCreators.find((x) => x.id === id);
              return (
                <Avatar key={id} className="w-8 h-8 border-2 border-gray-800" style={{ zIndex: 4 - i }}>
                  <AvatarImage src={c?.profileImageUrl || ""} />
                  <AvatarFallback className="bg-violet-700 text-white text-xs">{c?.firstName?.[0] || "?"}</AvatarFallback>
                </Avatar>
              );
            })}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{selectedIds.length} selected</p>
            <p className="text-white/40 text-xs">{selectedIds.length >= 2 ? "Ready to compare" : "Select 1 more"}</p>
          </div>
          <Button
            disabled={selectedIds.length < 2}
            onClick={() => setShowCompare(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl h-9 px-4 text-sm gap-2 shadow-lg disabled:opacity-40">
            <Bot className="w-4 h-4" /> AI Compare
          </Button>
          <button onClick={exitCompareMode} className="text-white/40 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Compare Hint when compare mode active but nothing selected ── */}
      {compareMode && selectedIds.length === 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-violet-900/90 backdrop-blur-xl border border-violet-500/30 rounded-2xl px-5 py-3 shadow-2xl">
          <CheckSquare className="w-4 h-4 text-violet-300" />
          <p className="text-white/80 text-sm">Click the checkbox on influencer cards to select them for comparison</p>
          <button onClick={exitCompareMode} className="text-white/40 hover:text-white p-1 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── AI Comparison Modal ── */}
      <CompareModal open={showCompare} onClose={() => setShowCompare(false)} selectedIds={selectedIds} />

      <Footer />
    </div>
  );
}
