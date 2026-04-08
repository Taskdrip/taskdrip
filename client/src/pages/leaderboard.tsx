import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Trophy, Users, Star, TrendingUp, Medal, Crown } from "lucide-react";
import { formatFollowers } from "@/lib/tiers";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="text-lg font-bold text-gray-400 w-6 text-center">#{rank}</span>;
}

function LeaderCard({ user, rank, metric, metricLabel }: { user: any; rank: number; metric: number | string; metricLabel: string }) {
  const bgClass = rank === 1 ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300" :
                  rank === 2 ? "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300" :
                  rank === 3 ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300" :
                  "bg-white";

  return (
    <Link href={user.userType === 'brand' ? `/brand/${user.id}` : `/creators/${user.id}`}>
      <Card className={`cursor-pointer hover:shadow-md transition-all ${bgClass} mb-3`} data-testid={`leaderboard-card-${user.id}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-shrink-0 w-8 flex justify-center">
            <RankBadge rank={rank} />
          </div>
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={user.profileImageUrl} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-gray-500 truncate">
              {user.username ? `@${user.username}` : (user.userType === 'brand' ? user.companyName : user.niche || 'Creator')}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-gray-900 text-lg">{metric}</div>
            <div className="text-xs text-gray-500">{metricLabel}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Leaderboard() {
  const { data: referralLeaders = [], isLoading: loadingReferrals } = useQuery<any[]>({
    queryKey: ['/api/leaderboard/referrals'],
  });

  const { data: activityLeaders = [], isLoading: loadingActivity } = useQuery<any[]>({
    queryKey: ['/api/leaderboard/activity'],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-700 via-blue-700 to-cyan-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Leaderboard</h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto">
            Top creators and brands shaping the platform. Rankings reset monthly.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <Tabs defaultValue="referrals">
          <TabsList className="w-full mb-8 bg-white border">
            <TabsTrigger value="referrals" className="flex-1" data-testid="tab-referrals">
              <Users className="w-4 h-4 mr-2" /> Top Referrers
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1" data-testid="tab-activity">
              <TrendingUp className="w-4 h-4 mr-2" /> Most Active
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referrals">
            <Card className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-yellow-300" />
                  <div>
                    <div className="font-bold text-lg">Referral Champions</div>
                    <div className="text-white/80 text-sm">Users who invited the most people this month</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingReferrals ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : referralLeaders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No referrals recorded yet. Start referring to appear here!
                </CardContent>
              </Card>
            ) : (
              referralLeaders.map((u, i) => (
                <LeaderCard
                  key={u.id}
                  user={u}
                  rank={i + 1}
                  metric={u.referralCount}
                  metricLabel="referrals"
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="activity">
            <Card className="mb-6 bg-gradient-to-r from-green-600 to-teal-600 text-white border-0">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-white" />
                  <div>
                    <div className="font-bold text-lg">Activity Champions</div>
                    <div className="text-white/80 text-sm">Users with the most posts, campaigns & engagement</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loadingActivity ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : activityLeaders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No activity recorded yet.
                </CardContent>
              </Card>
            ) : (
              activityLeaders.map((u, i) => (
                <LeaderCard
                  key={u.id}
                  user={u}
                  rank={i + 1}
                  metric={u.activityScore ?? `${formatFollowers(u.totalFollowers || 0)} followers`}
                  metricLabel={u.activityScore ? "activity score" : "reach"}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
