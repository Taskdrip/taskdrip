import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Trophy, Users, TrendingUp, Crown, Medal, Star, DollarSign, Zap } from "lucide-react";

function getLevelColor(level: string) {
  switch (level) {
    case "Elite": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Authority": return "bg-orange-100 text-orange-700 border-orange-200";
    case "Influencer": return "bg-purple-100 text-purple-700 border-purple-200";
    case "Hustler": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="text-base font-bold text-gray-400 w-6 text-center">#{rank}</span>;
}

function LeaderRow({
  user, rank, metric, metricLabel, accent, badge,
}: {
  user: any; rank: number; metric: string | number; metricLabel: string; accent: string; badge?: string;
}) {
  const isTop3 = rank <= 3;
  return (
    <Link href={user.userType === "brand" ? `/brand/${user.id}` : `/creators/${user.id}`}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 cursor-pointer transition-all hover:shadow-md border
          ${rank === 1 ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200" :
            rank === 2 ? "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200" :
            rank === 3 ? "bg-gradient-to-r from-orange-50 to-white border-orange-200" :
            "bg-white border-gray-100 hover:bg-gray-50"}`}
        data-testid={`leaderboard-row-${user.id}`}
      >
        <div className="w-7 flex items-center justify-center flex-shrink-0">
          <RankIcon rank={rank} />
        </div>
        <Avatar className="h-11 w-11 flex-shrink-0">
          <AvatarImage src={user.profileImageUrl} />
          <AvatarFallback className={`text-white font-bold text-sm bg-gradient-to-br ${accent}`}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">
            {user.firstName} {user.lastName}
            {isTop3 && <span className="ml-2 text-xs">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>}
          </div>
          <div className="text-xs text-gray-500 truncate flex items-center gap-2">
            <span>{user.username ? `@${user.username}` : user.niche || user.companyName || "Creator"}</span>
            {badge && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLevelColor(badge)}`}>{badge}</Badge>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-gray-900">{metric}</div>
          <div className="text-xs text-gray-500">{metricLabel}</div>
        </div>
      </div>
    </Link>
  );
}

function LeaderSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-36 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
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

  const formatEarned = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v || 0}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Trophy className="w-14 h-14 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Monthly Leaderboard</h1>
          <p className="text-gray-400 max-w-lg mx-auto text-lg">
            Top creators ranked by $TDRIP points, referrals, and platform performance. Rankings reset every month.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <Tabs defaultValue="points" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="points" className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> $TDRIP Points
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Top Referrers
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Top Earners
            </TabsTrigger>
          </TabsList>

          {/* $TDRIP Points Leaderboard */}
          <TabsContent value="points">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-yellow-500 rounded-xl p-2.5">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top $TDRIP Earners</h2>
                  <p className="text-sm text-gray-500">Monthly top 10 by points balance</p>
                </div>
              </div>

              {!loadingPoints && (pointsLeaders as any[]).length > 0 && (
                <Card className="mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-white/40">
                        <AvatarImage src={(pointsLeaders as any[])[0].profileImageUrl} />
                        <AvatarFallback className="bg-white/20 text-white font-bold text-xl">
                          {(pointsLeaders as any[])[0].firstName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Crown className="h-5 w-5 text-white" />
                          <span className="font-bold text-lg truncate">
                            {(pointsLeaders as any[])[0].firstName} {(pointsLeaders as any[])[0].lastName}
                          </span>
                        </div>
                        <Badge className="bg-white/20 text-white border-0 text-xs">
                          {(pointsLeaders as any[])[0].level || "Starter"}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{((pointsLeaders as any[])[0].totalPoints ?? 0).toLocaleString()}</div>
                        <div className="text-xs text-white/70">$TDRIP pts</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loadingPoints ? <LeaderSkeleton /> : (pointsLeaders as any[]).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Zap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No points yet</p>
                    <p className="text-sm text-gray-400 mt-1">Start earning $TDRIP points to appear here!</p>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {(pointsLeaders as any[]).map((u, i) => (
                    <LeaderRow
                      key={u.id}
                      user={u}
                      rank={i + 1}
                      metric={`${(u.totalPoints ?? 0).toLocaleString()} pts`}
                      metricLabel="$TDRIP"
                      accent={accents[i % accents.length]}
                      badge={u.level}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Referrals Leaderboard */}
          <TabsContent value="referrals">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-purple-600 rounded-xl p-2.5">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top Referrers</h2>
                  <p className="text-sm text-gray-500">Monthly top 10 by referrals</p>
                </div>
              </div>

              {!loadingReferrals && (referralLeaders as any[]).length > 0 && (
                <Card className="mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-white/40">
                        <AvatarImage src={(referralLeaders as any[])[0].profileImageUrl} />
                        <AvatarFallback className="bg-white/20 text-white font-bold text-xl">
                          {(referralLeaders as any[])[0].firstName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Crown className="h-5 w-5 text-yellow-300" />
                          <span className="font-bold text-lg truncate">
                            {(referralLeaders as any[])[0].firstName} {(referralLeaders as any[])[0].lastName}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm">{(referralLeaders as any[])[0].niche || "Top Creator"}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{(referralLeaders as any[])[0].totalReferrals ?? 0}</div>
                        <div className="text-xs text-white/70">referrals</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loadingReferrals ? <LeaderSkeleton /> : (referralLeaders as any[]).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No referrals yet</p>
                    <p className="text-sm text-gray-400 mt-1">Start referring to appear on this board!</p>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {(referralLeaders as any[]).map((u, i) => (
                    <LeaderRow
                      key={u.id}
                      user={u}
                      rank={i + 1}
                      metric={u.totalReferrals ?? 0}
                      metricLabel="referrals"
                      accent={accents[i % accents.length]}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Performance Leaderboard */}
          <TabsContent value="performance">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-green-600 rounded-xl p-2.5">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top Performers</h2>
                  <p className="text-sm text-gray-500">Monthly top 10 by earnings &amp; activity</p>
                </div>
              </div>

              {!loadingActivity && (activityLeaders as any[]).length > 0 && (
                <Card className="mb-4 bg-gradient-to-r from-green-600 to-teal-600 text-white border-0 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-white/40">
                        <AvatarImage src={(activityLeaders as any[])[0].profileImageUrl} />
                        <AvatarFallback className="bg-white/20 text-white font-bold text-xl">
                          {(activityLeaders as any[])[0].firstName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-5 w-5 text-yellow-300" />
                          <span className="font-bold text-lg truncate">
                            {(activityLeaders as any[])[0].firstName} {(activityLeaders as any[])[0].lastName}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm">{(activityLeaders as any[])[0].niche || "Top Earner"}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatEarned(Number((activityLeaders as any[])[0].totalEarned || 0))}
                        </div>
                        <div className="text-xs text-white/70">total earned</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loadingActivity ? <LeaderSkeleton /> : (activityLeaders as any[]).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium">No activity yet</p>
                    <p className="text-sm text-gray-400 mt-1">Complete campaigns to appear here!</p>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {(activityLeaders as any[]).map((u, i) => (
                    <LeaderRow
                      key={u.id}
                      user={u}
                      rank={i + 1}
                      metric={formatEarned(Number(u.totalEarned || 0))}
                      metricLabel="earned"
                      accent={accents[i % accents.length]}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* How rankings work */}
        <Card className="mt-10 bg-gradient-to-r from-gray-900 to-black text-white border-0">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-400" /> How Rankings Work
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm text-gray-300">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="font-semibold text-white mb-1">⚡ Points Rank</p>
                <p>Based on your total $TDRIP points earned through all platform activities.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="font-semibold text-white mb-1">📅 Monthly Reset</p>
                <p>Rankings and scores are refreshed at the beginning of every month.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="font-semibold text-white mb-1">🔗 Referral Rank</p>
                <p>Based on the number of new users you've successfully referred this month.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="font-semibold text-white mb-1">📈 Performance Rank</p>
                <p>Based on total campaign earnings and transaction volume on the platform.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
