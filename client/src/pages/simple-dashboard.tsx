import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, Trophy, Clock, User, DollarSign, Target, Sparkles, Share2, Copy, Users } from "lucide-react";
import { Link } from "wouter";

export default function SimpleDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: participations = [] } = useQuery({
    queryKey: ['/api/users', (user as any)?.id, 'participations'],
    enabled: !!(user as any)?.id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/users', (user as any)?.id, 'transactions'], 
    enabled: !!(user as any)?.id,
  });

  const { data: referralData } = useQuery<any>({
    queryKey: ['/api/referrals/my'],
    enabled: !!(user as any)?.id,
  });

  const ensureCodesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/referrals/ensure-codes").then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/referrals/my'] }),
  });

  useEffect(() => {
    if (user && referralData && (!referralData.referralCodeCreator || !referralData.referralCodeBrand)) {
      ensureCodesMutation.mutate();
    }
  }, [user, referralData]);

  const baseUrl = window.location.origin;
  const creatorLink = referralData?.referralCodeCreator
    ? `${baseUrl}/signup?ref=${referralData.referralCodeCreator}&type=creator`
    : null;
  const brandLink = referralData?.referralCodeBrand
    ? `${baseUrl}/signup?ref=${referralData.referralCodeBrand}&type=brand`
    : null;

  const copyLink = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copied!`, description: "Share it to earn referral rewards." });
    });
  };

  const stats = {
    availableBalance: parseFloat((user as any)?.availableBalance || '0'),
    totalEarnings: parseFloat((user as any)?.totalEarned || '0'),
    completedTasks: (user as any)?.completedCampaigns || 0,
    activeCampaigns: 12, // This would come from API
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {(user as any)?.firstName || 'Influencer'}! 👋
          </h1>
          <p className="text-gray-600">Here's your influencer dashboard — campaigns, earnings, and community.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.availableBalance.toFixed(2)}</div>
              <p className="text-xs opacity-90">Ready for withdrawal</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-green-600">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks finished</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Tasks</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
              <p className="text-xs text-muted-foreground">Ready to start</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/campaigns">
                <Button className="w-full justify-start bg-black text-white hover:bg-gray-900">
                  <Target className="h-4 w-4 mr-2" />
                  Browse Available Tasks
                </Button>
              </Link>
              
              <Link href="/feed">
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Influencer Feed
                </Button>
              </Link>
              
              <Link href="/wallet">
                <Button className="w-full justify-start" variant="outline">
                  <Wallet className="h-4 w-4 mr-2" />
                  Manage Crypto Wallets
                </Button>
              </Link>
              
              <Link href="/profile-edit">
                <Button className="w-full justify-start" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Update Influencer Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(participations) && participations.length > 0 ? (
                <div className="space-y-4">
                  {(participations as any[]).slice(0, 3).map((participation: any) => (
                    <div key={participation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Task Participation</p>
                        <p className="text-sm text-gray-600">Campaign ID: {participation.campaignId}</p>
                      </div>
                      <Badge variant={
                        participation.status === 'completed' ? 'default' :
                        participation.status === 'approved' ? 'default' :
                        participation.status === 'submitted' ? 'secondary' :
                        participation.status === 'pending' ? 'secondary' : 'destructive'
                      } className={
                        participation.status === 'completed' ? 'bg-green-600 text-white' :
                        participation.status === 'approved' ? 'bg-blue-600 text-white' :
                        participation.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        participation.status === 'rejected' ? 'bg-red-100 text-red-800' : ''
                      }>
                        {participation.status === 'pending' ? 'Application Sent' :
                         participation.status === 'approved' ? 'Approved – Awaiting Proof' :
                         participation.status === 'submitted' ? 'Proof Submitted' :
                         participation.status === 'completed' ? 'Completed & Paid' :
                         participation.status === 'rejected' ? 'Rejected' :
                         participation.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Start by browsing available tasks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Wallet Setup Reminder */}
        {!(user as any)?.usdtTronWallet && !(user as any)?.usdtBscWallet && !(user as any)?.tonWallet && (
          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Wallet className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Set up your crypto wallets</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Add your wallet addresses to receive payments for completed tasks
                  </p>
                </div>
                <Link href="/wallet">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Set Up Wallets
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Links Card */}
        <Card className="mt-8 border-0 bg-gradient-to-br from-black to-gray-800 text-white overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-5">
              <Share2 className="h-6 w-6 text-yellow-400" />
              <div>
                <h3 className="font-bold text-lg">Your Referral Links</h3>
                <p className="text-gray-400 text-sm">Invite friends and earn rewards</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">{referralData?.totalReferrals ?? 0} referred</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Creator link */}
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-300">🎭 Invite Creators</span>
                  <Badge className="bg-purple-500/30 text-purple-200 text-xs border-0">Creator Link</Badge>
                </div>
                {creatorLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded px-2.5 py-1.5 text-xs text-gray-300 font-mono truncate">
                      {creatorLink}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20 h-8 px-2"
                      onClick={() => copyLink(creatorLink, "Creator referral link")}
                      data-testid="button-dash-copy-creator"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Generating your links...</p>
                )}
              </div>

              {/* Brand link */}
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-300">🏢 Invite Brands</span>
                  <Badge className="bg-blue-500/30 text-blue-200 text-xs border-0">Brand Link</Badge>
                </div>
                {brandLink ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded px-2.5 py-1.5 text-xs text-gray-300 font-mono truncate">
                      {brandLink}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20 h-8 px-2"
                      onClick={() => copyLink(brandLink, "Brand referral link")}
                      data-testid="button-dash-copy-brand"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Generating your links...</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link href="/referrals" className="flex-1">
                <Button variant="outline" size="sm" className="w-full border-white/30 text-white hover:bg-white/10 hover:text-white">
                  View Full Referral Dashboard
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                  <Trophy className="h-3.5 w-3.5 mr-1.5" /> Leaderboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}