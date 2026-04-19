import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Trophy, Users, TrendingUp, Crown, Medal, Star, DollarSign, Zap,
  Gift, ExternalLink, CalendarDays, Award, Sparkles, ChevronDown,
  ChevronUp, Target, Coins, Timer, Building2
} from "lucide-react";

function getLevelColor(level: string) {
  switch (level) {
    case "Elite":     return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Authority": return "bg-orange-100 text-orange-700 border-orange-200";
    case "Influencer":return "bg-purple-100 text-purple-700 border-purple-200";
    case "Hustler":   return "bg-blue-100 text-blue-700 border-blue-200";
    default:          return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shadow-yellow-200 flex-shrink-0">
      <Crown className="w-4 h-4 text-white" />
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-slate-400 flex items-center justify-center shadow-md flex-shrink-0">
      <Medal className="w-4 h-4 text-white" />
    </div>
  );
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-md flex-shrink-0">
      <Medal className="w-4 h-4 text-white" />
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-gray-500">#{rank}</span>
    </div>
  );
}

function getRowBg(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-50 via-amber-50 to-white border-yellow-200 shadow-sm shadow-yellow-100";
  if (rank === 2) return "bg-gradient-to-r from-gray-50 via-slate-50 to-white border-gray-200 shadow-sm";
  if (rank === 3) return "bg-gradient-to-r from-orange-50 via-amber-50 to-white border-orange-200 shadow-sm shadow-orange-100";
  if (rank <= 10) return "bg-white border-gray-100 hover:bg-blue-50/30 hover:border-blue-100";
  return "bg-white border-gray-50 hover:bg-gray-50/50";
}

const accents = [
  "from-yellow-500 to-orange-500",
  "from-blue-500 to-purple-500",
  "from-green-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-500",
  "from-amber-500 to-yellow-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-green-500",
  "from-violet-500 to-purple-500",
  "from-red-500 to-pink-500",
];

function LeaderRow({ user, rank, metric, metricLabel, badge }: {
  user: any; rank: number; metric: string | number; metricLabel: string; badge?: string;
}) {
  return (
    <Link href={user.userType === "brand" ? `/brand/${user.id}` : `/influencers/${user.id}`}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-2 cursor-pointer transition-all hover:shadow-md border ${getRowBg(rank)}`}
        data-testid={`leaderboard-row-${user.id}`}
      >
        <RankBadge rank={rank} />
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={user.profileImageUrl} />
          <AvatarFallback className={`text-white font-bold text-sm bg-gradient-to-br ${accents[(rank - 1) % accents.length]}`}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate flex items-center gap-1.5">
            {user.firstName} {user.lastName}
            {rank <= 3 && <span className="text-base">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>}
          </div>
          <div className="text-xs text-gray-400 truncate flex items-center gap-2">
            <span>@{user.username || (user.niche || "influencer")}</span>
            {badge && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLevelColor(badge)}`}>{badge}</Badge>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-gray-900 text-sm">{metric}</div>
          <div className="text-xs text-gray-400">{metricLabel}</div>
        </div>
      </div>
    </Link>
  );
}

function LeaderSkeleton() {
  return (
    <div className="space-y-2">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-gray-100">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-36 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-14" />
        </div>
      ))}
    </div>
  );
}

function Podium({ users, metric, metricFn }: { users: any[]; metric: string; metricFn: (u: any) => string }) {
  if (users.length < 1) return null;
  const [first, second, third] = users;
  return (
    <div className="flex items-end justify-center gap-3 mb-6 pt-4">
      {/* 2nd place */}
      {second && (
        <div className="flex flex-col items-center flex-1 max-w-[120px]">
          <Avatar className="h-14 w-14 border-2 border-gray-300 mb-2">
            <AvatarImage src={second.profileImageUrl} />
            <AvatarFallback className="bg-gradient-to-br from-gray-400 to-slate-500 text-white font-bold">{second.firstName?.[0]}{second.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="text-xs font-semibold text-gray-700 text-center truncate w-full px-1">{second.firstName}</div>
          <div className="text-xs font-bold text-gray-500">{metricFn(second)}</div>
          <div className="w-full bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-xl h-16 flex items-center justify-center mt-2 border border-gray-200">
            <span className="text-2xl">🥈</span>
          </div>
          <div className="w-full bg-gray-200 rounded-b-sm h-2" />
        </div>
      )}
      {/* 1st place */}
      {first && (
        <div className="flex flex-col items-center flex-1 max-w-[130px] -mb-2">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-yellow-400 mb-2 shadow-lg shadow-yellow-200">
              <AvatarImage src={first.profileImageUrl} />
              <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-lg">{first.firstName?.[0]}{first.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <Crown className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
          <div className="text-xs font-bold text-gray-900 text-center truncate w-full px-1">{first.firstName}</div>
          <div className="text-xs font-bold text-yellow-600">{metricFn(first)}</div>
          <div className="w-full bg-gradient-to-t from-yellow-200 to-yellow-50 rounded-t-xl h-24 flex items-center justify-center mt-2 border border-yellow-200 shadow-inner">
            <span className="text-3xl">🥇</span>
          </div>
          <div className="w-full bg-yellow-200 rounded-b-sm h-2" />
        </div>
      )}
      {/* 3rd place */}
      {third && (
        <div className="flex flex-col items-center flex-1 max-w-[120px]">
          <Avatar className="h-14 w-14 border-2 border-amber-600 mb-2">
            <AvatarImage src={third.profileImageUrl} />
            <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-700 text-white font-bold">{third.firstName?.[0]}{third.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="text-xs font-semibold text-gray-700 text-center truncate w-full px-1">{third.firstName}</div>
          <div className="text-xs font-bold text-amber-600">{metricFn(third)}</div>
          <div className="w-full bg-gradient-to-t from-orange-100 to-amber-50 rounded-t-xl h-12 flex items-center justify-center mt-2 border border-amber-200">
            <span className="text-2xl">🥉</span>
          </div>
          <div className="w-full bg-amber-200 rounded-b-sm h-2" />
        </div>
      )}
    </div>
  );
}

function RewardTiers({ rewards, leaderboardType }: { rewards: any[]; leaderboardType: string }) {
  const [expanded, setExpanded] = useState(false);
  const filtered = rewards.filter(r => r.leaderboardType === leaderboardType || r.leaderboardType === 'all');
  if (filtered.length === 0) return null;

  const totalPool = filtered.reduce((s: number, r: any) => s + parseFloat(r.prizeValue || 0), 0);
  const topTier = filtered[0];
  const rest = filtered.slice(1);

  const posLabel = (r: any) =>
    r.positionFrom === r.positionTo ? `#${r.positionFrom}` : `#${r.positionFrom}–#${r.positionTo}`;

  const tierColor = (r: any) => {
    if (r.positionFrom === 1) return "from-yellow-400 to-amber-500";
    if (r.positionFrom === 2) return "from-gray-300 to-slate-400";
    if (r.positionFrom === 3) return "from-amber-600 to-orange-700";
    if (r.positionTo <= 10) return "from-blue-400 to-indigo-500";
    return "from-purple-400 to-violet-500";
  };

  return (
    <div className="mb-6 rounded-3xl border border-yellow-200 overflow-hidden shadow-sm shadow-yellow-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Prize Rewards</h3>
            <p className="text-white/80 text-xs">Total pool: ${totalPool.toLocaleString()}</p>
          </div>
        </div>
        {topTier?.sponsorName && (
          <div className="flex items-center gap-2">
            {topTier.sponsorLogoUrl ? (
              <img src={topTier.sponsorLogoUrl} alt={topTier.sponsorName} className="w-7 h-7 rounded-full object-cover border border-white/50" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
            <div>
              <p className="text-white/70 text-xs">Sponsored by</p>
              {topTier.sponsorUrl ? (
                <a href={topTier.sponsorUrl} target="_blank" rel="noopener noreferrer"
                  className="text-white text-xs font-semibold hover:underline flex items-center gap-1">
                  {topTier.sponsorName} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-white text-xs font-semibold">{topTier.sponsorName}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top 3 prize cards */}
      <div className="bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {filtered.slice(0, 3).map((r: any) => (
            <div key={r.id} data-testid={`reward-tier-${r.id}`}
              className={`relative rounded-2xl p-4 text-white bg-gradient-to-br ${tierColor(r)} shadow-md overflow-hidden`}>
              <div className="absolute top-2 right-2 text-2xl opacity-20">
                {r.positionFrom === 1 ? "👑" : r.positionFrom === 2 ? "🥈" : "🥉"}
              </div>
              <div className="text-xs font-semibold text-white/80 mb-1">Position {posLabel(r)}</div>
              <div className="font-extrabold text-xl leading-tight mb-1">
                {r.prizeValue > 0 ? `$${parseFloat(r.prizeValue).toLocaleString()} ${r.currency || 'USDT'}` : '—'}
              </div>
              {r.prizeDescription && (
                <div className="text-xs text-white/90 font-medium leading-snug">+ {r.prizeDescription}</div>
              )}
              <div className="mt-2 text-xs text-white/70 font-semibold uppercase tracking-wide">{r.title}</div>
            </div>
          ))}
        </div>

        {/* Remaining tiers (4-10, 11-100) */}
        {rest.length > 3 && (
          <>
            <button
              onClick={() => setExpanded(v => !v)}
              data-testid="btn-expand-rewards"
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 py-2 border-t border-gray-100 transition-colors"
            >
              {expanded ? <><ChevronUp className="h-4 w-4" /> Hide additional prizes</> : <><ChevronDown className="h-4 w-4" /> View {rest.length - 0} more prize tiers</>}
            </button>
            {expanded && (
              <div className="mt-3 space-y-2">
                {filtered.slice(3).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tierColor(r)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Award className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900">{posLabel(r)} — {r.title}</div>
                      {r.prizeDescription && <div className="text-xs text-gray-500">{r.prizeDescription}</div>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-gray-900 text-sm">
                        {r.prizeValue > 0 ? `$${parseFloat(r.prizeValue).toLocaleString()}` : '—'}
                      </div>
                      <div className="text-xs text-gray-400">{r.currency || 'USDT'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {rest.length > 0 && rest.length <= 3 && (
          <div className="mt-3 space-y-2">
            {rest.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tierColor(r)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Award className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900">{posLabel(r)} — {r.title}</div>
                  {r.prizeDescription && <div className="text-xs text-gray-500">{r.prizeDescription}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-gray-900 text-sm">
                    {r.prizeValue > 0 ? `$${parseFloat(r.prizeValue).toLocaleString()}` : '—'}
                  </div>
                  <div className="text-xs text-gray-400">{r.currency || 'USDT'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {topTier?.season && (
        <div className="bg-amber-50 border-t border-yellow-200 px-5 py-2 flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs text-amber-700 font-medium">Season: {topTier.season}</span>
        </div>
      )}
    </div>
  );
}

function GiveawayCard({ giveaway }: { giveaway: any }) {
  const endDate = giveaway.endDate ? new Date(giveaway.endDate) : null;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : null;
  const isEnded = giveaway.status === 'ended' || (endDate && endDate < new Date());
  const isUpcoming = giveaway.status === 'upcoming' || (giveaway.startDate && new Date(giveaway.startDate) > new Date());

  const statusColor = isEnded ? 'bg-gray-100 text-gray-500' : isUpcoming ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  const statusText = isEnded ? 'Ended' : isUpcoming ? 'Upcoming' : 'Live';

  return (
    <div
      className={`rounded-3xl border overflow-hidden shadow-sm transition-all hover:shadow-lg ${isEnded ? 'opacity-75 border-gray-100' : 'border-purple-200'}`}
      data-testid={`giveaway-card-${giveaway.id}`}
    >
      {/* Header */}
      <div className={`relative p-5 ${isEnded ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-800'}`}>
        {giveaway.prizeImageUrl && (
          <img src={giveaway.prizeImageUrl} alt={giveaway.prize} className="absolute inset-0 w-full h-full object-cover opacity-15" />
        )}
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>{statusText}</span>
            {daysLeft !== null && !isEnded && (
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <Timer className="h-3 w-3" /> {daysLeft}d left
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg leading-tight">{giveaway.title}</h3>
              <p className="text-white/70 text-sm font-medium">{giveaway.prize}</p>
            </div>
          </div>
          {parseFloat(giveaway.totalPrizePool) > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20">
              <DollarSign className="h-4 w-4 text-green-300" />
              <span className="font-extrabold text-white">${parseFloat(giveaway.totalPrizePool).toLocaleString()}</span>
              <span className="text-white/60 text-xs">total pool</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="bg-white p-4 space-y-3">
        {giveaway.description && (
          <p className="text-gray-600 text-sm leading-relaxed">{giveaway.description}</p>
        )}

        {giveaway.requirements && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-0.5">Requirements</p>
              <p className="text-xs text-blue-700">{giveaway.requirements}</p>
            </div>
          </div>
        )}

        {giveaway.eligibleLeaderboards?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-400 font-medium">Eligible boards:</span>
            {giveaway.eligibleLeaderboards.map((lb: string) => (
              <Badge key={lb} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 capitalize">
                {lb}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {giveaway.winnerCount > 1 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="h-3 w-3" /> {giveaway.winnerCount} winners
              </span>
            )}
            {endDate && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <CalendarDays className="h-3 w-3" /> {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Sponsor info */}
          {giveaway.sponsorName && (
            <div className="flex items-center gap-2">
              {giveaway.sponsorLogoUrl ? (
                <img src={giveaway.sponsorLogoUrl} alt={giveaway.sponsorName} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                </div>
              )}
              <div className="text-right">
                <p className="text-xs text-gray-400">by</p>
                {giveaway.sponsorUrl ? (
                  <a href={giveaway.sponsorUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-0.5">
                    {giveaway.sponsorName} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <p className="text-xs font-semibold text-gray-700">{giveaway.sponsorName}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaderSection({
  title, subtitle, icon, gradientFrom, gradientTo,
  leaders, isLoading,
  metric, metricLabel, metricFn,
  rewards, leaderboardType,
}: {
  title: string; subtitle: string; icon: any; gradientFrom: string; gradientTo: string;
  leaders: any[]; isLoading: boolean;
  metric: (u: any) => string | number;
  metricLabel: string;
  metricFn: (u: any) => string;
  rewards: any[];
  leaderboardType: string;
}) {
  const Icon = icon;
  const [showAll, setShowAll] = useState(false);
  const top100 = leaders.slice(0, 100);
  const displayed = showAll ? top100 : top100.slice(0, 10);
  const top3 = leaders.slice(0, 3);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`rounded-xl p-2.5 bg-gradient-to-br ${gradientFrom} ${gradientTo}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      {/* Reward tiers */}
      <RewardTiers rewards={rewards} leaderboardType={leaderboardType} />

      {isLoading ? (
        <LeaderSkeleton />
      ) : leaders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to appear on this leaderboard!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Podium for top 3 */}
          {top3.length >= 2 && (
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-3xl border border-gray-100 mb-4 px-4 pt-2 pb-0 overflow-hidden">
              <Podium users={top3} metric={metricLabel} metricFn={metricFn} />
            </div>
          )}

          {/* Full list */}
          <div>
            {displayed.map((u: any, i: number) => (
              <LeaderRow
                key={u.id}
                user={u}
                rank={i + 1}
                metric={metric(u)}
                metricLabel={metricLabel}
                badge={u.level}
              />
            ))}
          </div>

          {/* Show more/less */}
          {top100.length > 10 && (
            <button
              onClick={() => setShowAll(v => !v)}
              data-testid={`btn-${leaderboardType}-show-all`}
              className="w-full mt-3 py-3 rounded-2xl border border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              {showAll ? <><ChevronUp className="h-4 w-4" /> Show Top 10</> : <><ChevronDown className="h-4 w-4" /> View Top 100 ({top100.length} total)</>}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { data: referralLeaders = [], isLoading: loadingReferrals } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/referrals"],
  });
  const { data: activityLeaders = [], isLoading: loadingActivity } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/activity"],
  });
  const { data: pointsLeaders = [], isLoading: loadingPoints } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/points"],
  });
  const { data: rewards = [] } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/rewards"],
  });
  const { data: giveaways = [] } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/giveaways"],
  });

  const formatEarned = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v || 0}`;

  const activeGiveaways = (giveaways as any[]).filter(g => g.status !== 'ended');
  const endedGiveaways = (giveaways as any[]).filter(g => g.status === 'ended');

  const totalPrizePool = (rewards as any[]).reduce((s, r) => s + parseFloat(r.prizeValue || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ── Hero Section ───────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gray-950 text-white">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-[#0f0a1f] to-gray-950" />

        {/* Radial glows - gold centre, purple + blue corners */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_0%,rgba(245,158,11,0.22)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_0%_100%,rgba(139,92,246,0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_100%_0%,rgba(59,130,246,0.12)_0%,transparent_60%)]" />

        {/* Animated gold ring */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-yellow-500/10 animate-pulse" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 w-[400px] h-[400px] rounded-full border border-yellow-500/8 animate-pulse [animation-delay:500ms]" />

        {/* Floating decorative icons */}
        <div className="absolute top-8 left-6 opacity-8 hidden md:block animate-bounce [animation-duration:4s]">
          <Trophy className="w-28 h-28 text-yellow-500 rotate-[-18deg]" />
        </div>
        <div className="absolute bottom-8 left-20 opacity-6 hidden md:block">
          <Star className="w-14 h-14 text-yellow-400 rotate-[25deg]" />
        </div>
        <div className="absolute top-10 right-8 opacity-8 hidden md:block animate-bounce [animation-duration:5s] [animation-delay:1s]">
          <Sparkles className="w-20 h-20 text-amber-400 rotate-[10deg]" />
        </div>
        <div className="absolute bottom-4 right-16 opacity-5 hidden md:block">
          <Medal className="w-16 h-16 text-yellow-300" />
        </div>

        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm mb-6">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold text-xs uppercase tracking-widest">Monthly Rankings</span>
          </div>

          {/* Trophy icon with layered glow */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 scale-150 bg-yellow-400/20 blur-3xl rounded-full" />
              <div className="absolute inset-0 scale-110 bg-amber-500/15 blur-xl rounded-full" />
              <div className="relative bg-gradient-to-br from-yellow-400/20 to-amber-600/20 p-5 rounded-2xl border border-yellow-500/20 backdrop-blur-sm shadow-2xl">
                <Trophy className="w-14 h-14 text-yellow-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
              Leaderboard
            </span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-base md:text-lg mb-10">
            Top influencers ranked by $TDRIP points, referrals, and earnings.
            <span className="block mt-1 text-gray-500 text-sm">Rankings reset every month.</span>
          </p>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-sm">
            {[
              { icon: Users, color: "text-blue-400", bg: "from-blue-500/15 to-blue-600/10 border-blue-500/20", label: `${(pointsLeaders as any[]).length} Participants` },
              { icon: Trophy, color: "text-yellow-400", bg: "from-yellow-500/15 to-amber-600/10 border-yellow-500/20", label: `$${totalPrizePool.toLocaleString()} Prize Pool` },
              { icon: Gift, color: "text-purple-400", bg: "from-purple-500/15 to-purple-600/10 border-purple-500/20", label: `${activeGiveaways.length} Active Giveaways` },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2.5 bg-gradient-to-br ${s.bg} backdrop-blur-sm border rounded-2xl px-4 py-2.5 shadow-sm`}>
                <s.icon className={`h-4 w-4 ${s.color} flex-shrink-0`} />
                <span className="text-white font-semibold">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="points" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm h-auto flex-nowrap">
            <TabsTrigger value="points" className="flex-1 min-w-fit flex items-center gap-1.5 rounded-xl py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Zap className="h-4 w-4" /> $TDRIP Points
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex-1 min-w-fit flex items-center gap-1.5 rounded-xl py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Users className="h-4 w-4" /> Top Referrers
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 min-w-fit flex items-center gap-1.5 rounded-xl py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <TrendingUp className="h-4 w-4" /> Top Earners
            </TabsTrigger>
            <TabsTrigger value="giveaways" className="flex-1 min-w-fit flex items-center gap-1.5 rounded-xl py-2.5 text-sm whitespace-nowrap data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">
              <Gift className="h-4 w-4" /> Giveaways
              {activeGiveaways.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeGiveaways.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── $TDRIP Points ── */}
          <TabsContent value="points">
            <LeaderSection
              title="$TDRIP Points Board"
              subtitle="Top 100 by total $TDRIP points balance"
              icon={Zap}
              gradientFrom="from-yellow-500"
              gradientTo="to-orange-500"
              leaders={pointsLeaders}
              isLoading={loadingPoints}
              metric={u => `${((u.totalPoints ?? 0)).toLocaleString()} pts`}
              metricLabel="$TDRIP"
              metricFn={u => `${(u.totalPoints ?? 0).toLocaleString()} pts`}
              rewards={rewards}
              leaderboardType="points"
            />
          </TabsContent>

          {/* ── Top Referrers ── */}
          <TabsContent value="referrals">
            <LeaderSection
              title="Top Referrers"
              subtitle="Top 100 by successful referrals this month"
              icon={Users}
              gradientFrom="from-purple-600"
              gradientTo="to-indigo-600"
              leaders={referralLeaders}
              isLoading={loadingReferrals}
              metric={u => u.totalReferrals ?? 0}
              metricLabel="referrals"
              metricFn={u => `${u.totalReferrals ?? 0} refs`}
              rewards={rewards}
              leaderboardType="referrals"
            />
          </TabsContent>

          {/* ── Top Earners ── */}
          <TabsContent value="performance">
            <LeaderSection
              title="Top Earners"
              subtitle="Top 100 by total campaign earnings"
              icon={TrendingUp}
              gradientFrom="from-green-600"
              gradientTo="to-teal-600"
              leaders={activityLeaders}
              isLoading={loadingActivity}
              metric={u => formatEarned(Number(u.totalEarned || 0))}
              metricLabel="earned"
              metricFn={u => formatEarned(Number(u.totalEarned || 0))}
              rewards={rewards}
              leaderboardType="earnings"
            />
          </TabsContent>

          {/* ── Giveaways ── */}
          <TabsContent value="giveaways">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="rounded-xl p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Giveaways & Events</h2>
                  <p className="text-sm text-gray-500">Sponsored giveaways for top leaderboard performers</p>
                </div>
              </div>

              {(giveaways as any[]).length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Giveaways Yet</h3>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">
                      Check back soon — sponsored giveaways will appear here for top leaderboard positions.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Active giveaways */}
                  {activeGiveaways.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Active Now</h3>
                        <span className="text-xs text-gray-400">({activeGiveaways.length})</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 mb-8">
                        {activeGiveaways.map((g: any) => <GiveawayCard key={g.id} giveaway={g} />)}
                      </div>
                    </>
                  )}

                  {/* Ended giveaways */}
                  {endedGiveaways.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Past Giveaways</h3>
                        <span className="text-xs text-gray-400">({endedGiveaways.length})</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {endedGiveaways.map((g: any) => <GiveawayCard key={g.id} giveaway={g} />)}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── How rankings work ─────────────────────────────── */}
        <Card className="mt-10 bg-gradient-to-r from-gray-900 to-black text-white border-0 overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-400" /> How Rankings & Rewards Work
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-300">
              <div className="bg-white/8 rounded-2xl p-4 border border-white/10">
                <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5"><Zap className="h-4 w-4 text-yellow-400" /> Points Rank</p>
                <p className="text-xs leading-relaxed">Based on your total $TDRIP points earned through all platform activities.</p>
              </div>
              <div className="bg-white/8 rounded-2xl p-4 border border-white/10">
                <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-blue-400" /> Monthly Reset</p>
                <p className="text-xs leading-relaxed">Rankings and scores are refreshed at the beginning of every month.</p>
              </div>
              <div className="bg-white/8 rounded-2xl p-4 border border-white/10">
                <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5"><Users className="h-4 w-4 text-purple-400" /> Referral Rank</p>
                <p className="text-xs leading-relaxed">Based on the number of new users you've successfully referred this month.</p>
              </div>
              <div className="bg-white/8 rounded-2xl p-4 border border-white/10">
                <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5"><Trophy className="h-4 w-4 text-orange-400" /> Rewards</p>
                <p className="text-xs leading-relaxed">Top ranked users receive cash prizes and physical rewards at month end.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
