import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { WelcomeCampaign } from "@/components/ui/welcome-campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, TrendingUp, Trophy, Clock, User, DollarSign, Target, Share2, Copy,
  Users, ShoppingBag, Package, CheckCircle, AlertCircle, Truck, Zap, Star, Crown, Medal,
  Briefcase, ChevronRight, Sparkles
} from "lucide-react";
import { Link } from "wouter";

function getLevelConfig(level: string) {
  switch (level) {
    case "Elite":      return { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "👑", next: null, min: 50000 };
    case "Authority":  return { color: "bg-orange-100 text-orange-700 border-orange-300", icon: "🔥", next: "Elite", min: 10000, max: 50000 };
    case "Influencer": return { color: "bg-purple-100 text-purple-700 border-purple-300", icon: "⚡", next: "Authority", min: 2000, max: 10000 };
    case "Hustler":    return { color: "bg-blue-100 text-blue-700 border-blue-300", icon: "💪", next: "Influencer", min: 500, max: 2000 };
    default:           return { color: "bg-gray-100 text-gray-700 border-gray-300", icon: "🌱", next: "Hustler", min: 0, max: 500 };
  }
}

function PointsWidget({ user }: { user: any }) {
  const points = user?.totalPoints || 0;
  const level = user?.level || "Starter";
  const cfg = getLevelConfig(level);

  const progressToNext = cfg.next && cfg.max
    ? Math.min(100, Math.round(((points - cfg.min) / (cfg.max - cfg.min)) * 100))
    : 100;
  const ptsToNext = cfg.next && cfg.max ? Math.max(0, cfg.max - points) : 0;

  return (
    <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 20%, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-purple-100">$TDRIP Points</CardTitle>
          <Zap className="h-4 w-4 text-yellow-300" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-extrabold mb-1">{points.toLocaleString()}</div>
        <div className="flex items-center gap-2 mb-3">
          <Badge className={`${cfg.color} border text-xs font-bold px-2 py-0.5`}>
            {cfg.icon} {level}
          </Badge>
          {cfg.next && (
            <span className="text-xs text-purple-200">{ptsToNext.toLocaleString()} pts to {cfg.next}</span>
          )}
        </div>
        {cfg.next && (
          <div className="space-y-1">
            <Progress value={progressToNext} className="h-1.5 bg-purple-800" />
          </div>
        )}
        {!cfg.next && (
          <p className="text-xs text-yellow-300 font-semibold">🏆 Maximum Level Reached!</p>
        )}
      </CardContent>
    </Card>
  );
}

function LeaderboardRankWidget({ userId }: { userId: string }) {
  const { data: leaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/points"],
    enabled: !!userId,
  });

  const rank = (leaderboard as any[]).findIndex((u: any) => u.id === userId) + 1;
  const total = (leaderboard as any[]).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Leaderboard Rank</CardTitle>
        <Trophy className="h-4 w-4 text-yellow-500" />
      </CardHeader>
      <CardContent>
        {rank > 0 ? (
          <>
            <div className="flex items-center gap-2">
              {rank === 1 && <Crown className="h-5 w-5 text-yellow-400" />}
              {rank === 2 && <Medal className="h-5 w-5 text-gray-400" />}
              {rank === 3 && <Medal className="h-5 w-5 text-amber-600" />}
              <div className="text-2xl font-bold">#{rank}</div>
            </div>
            <p className="text-xs text-muted-foreground">of {total} users</p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-400">–</div>
            <p className="text-xs text-muted-foreground">Earn points to rank</p>
          </>
        )}
        <Link href="/leaderboard">
          <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs text-purple-600 hover:text-purple-700 px-0">
            View leaderboard →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

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

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/users', (user as any)?.id, 'purchases'],
    enabled: !!(user as any)?.id,
  });

  const { data: activeCampaigns = [] } = useQuery<any[]>({
    queryKey: ['/api/campaigns'],
    select: (data: any[]) => data.filter((c: any) => c.status === 'active'),
  });

  const { data: hireOffers = [] } = useQuery<any[]>({
    queryKey: ['/api/direct-hire/received'],
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
    pendingBalance: parseFloat((user as any)?.pendingBalance || '0'),
    totalEarnings: parseFloat((user as any)?.totalEarned || '0'),
    completedTasks: (user as any)?.completedCampaigns || 0,
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

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Points & Level */}
          <PointsWidget user={user} />

          {/* Available Balance */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.availableBalance.toFixed(2)}</div>
              <p className="text-xs opacity-90">Ready for withdrawal</p>
              <Link href="/payout-requests">
                <Button size="sm" variant="secondary" className="mt-3 h-8 text-xs" data-testid="button-request-withdrawal">
                  Request withdrawal
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          {/* Total Earnings */}
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

          {/* Leaderboard Rank */}
          <LeaderboardRankWidget userId={(user as any)?.id} />
        </div>

        <Card className="mb-6 border-purple-100 bg-white">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-purple-600" /> Wallet ledger</h2>
              <p className="text-sm text-gray-500">Available balance is withdrawable. Pending balance is escrowed work waiting for approval.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="rounded-xl bg-green-50 px-4 py-2">
                <p className="text-xs text-green-700">Available</p>
                <p className="font-bold text-green-800" data-testid="text-available-balance">${stats.availableBalance.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-yellow-50 px-4 py-2">
                <p className="text-xs text-yellow-700">Pending</p>
                <p className="font-bold text-yellow-800" data-testid="text-pending-balance">${stats.pendingBalance.toFixed(2)}</p>
              </div>
              <Link href="/payout-requests">
                <Button variant="outline" data-testid="button-open-payouts">Withdraw</Button>
              </Link>
              <Link href="/ledger">
                <Button className="bg-black text-white hover:bg-gray-800" data-testid="button-open-ledger">View ledger</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Second Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(activeCampaigns as any[]).length}</div>
              <p className="text-xs text-muted-foreground">Available to join</p>
              <Link href="/campaigns">
                <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs text-purple-600 hover:text-purple-700 px-0">
                  Browse all →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">Earn More Points</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Daily Login</span>
                  <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px]">+5 pts</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Join Campaign</span>
                  <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px]">+20 pts</Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Complete Task</span>
                  <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">+50 pts</Badge>
                </div>
              </div>
              <Link href="/get-started">
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs text-yellow-700 hover:text-yellow-800 px-0">
                  See all ways to earn →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Direct Hire Offers */}
        {hireOffers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">Hire Offers</h2>
                {hireOffers.filter((h: any) => h.status === 'pending').length > 0 && (
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    {hireOffers.filter((h: any) => h.status === 'pending').length} new
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {hireOffers.slice(0, 5).map((hire: any) => {
                const statusColors: Record<string, string> = {
                  pending:           "bg-yellow-100 text-yellow-800",
                  accepted:          "bg-blue-100 text-blue-800",
                  rejected:          "bg-gray-100 text-gray-500",
                  payment_submitted: "bg-purple-100 text-purple-800",
                  active:            "bg-green-100 text-green-800",
                  work_submitted:    "bg-indigo-100 text-indigo-800",
                  revision_requested:"bg-orange-100 text-orange-800",
                  completed:         "bg-gray-100 text-gray-700",
                };
                const statusLabels: Record<string, string> = {
                  pending:           "Respond Now",
                  accepted:          "Accepted",
                  rejected:          "Declined",
                  payment_submitted: "Payment Pending",
                  active:            "Active",
                  work_submitted:    "Review Work",
                  revision_requested:"Revision",
                  completed:         "Completed",
                };
                const isPending = hire.status === 'pending';
                return (
                  <Card key={hire.id} className={`hover:shadow-md transition-shadow ${isPending ? 'border-2 border-green-200 bg-green-50/30' : ''}`} data-testid={`card-hire-offer-${hire.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isPending && <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0" />}
                            <h3 className="font-semibold text-gray-900 truncate text-sm">{hire.title}</h3>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[hire.status] || "bg-gray-100 text-gray-600"}`}>
                              {statusLabels[hire.status] || hire.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            From {hire.brand?.companyName || `${hire.brand?.firstName} ${hire.brand?.lastName}`}
                            <span className="font-semibold text-green-700 ml-2">${Number(hire.budget).toFixed(2)} USDT</span>
                          </p>
                        </div>
                        <Link href={`/direct-hire/${hire.id}`}>
                          <Button size="sm" className={isPending ? 'bg-green-600 hover:bg-green-700' : ''} variant={isPending ? 'default' : 'outline'} data-testid={`button-view-offer-${hire.id}`}>
                            {isPending ? 'Respond' : 'View'}
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Welcome / Starter Campaign */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-900">🚀 Starter Campaign</h2>
            <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Earn 130 pts</Badge>
          </div>
          <WelcomeCampaign />
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

              <Link href="/leaderboard">
                <Button className="w-full justify-start" variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  View Leaderboard
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

        {/* My Orders */}
        {orders.length > 0 && (
          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
                <CardTitle>My Orders</CardTitle>
              </div>
              <Link href="/shop">
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                  Browse Shop
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(orders as any[]).map((order: any) => {
                  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
                    pending:   { icon: Clock,         color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Pending Payment' },
                    paid:      { icon: CheckCircle,   color: 'text-blue-600 bg-blue-50 border-blue-200',       label: 'Payment Confirmed' },
                    delivered: { icon: Truck,         color: 'text-green-600 bg-green-50 border-green-200',    label: 'Delivered' },
                    cancelled: { icon: AlertCircle,   color: 'text-red-600 bg-red-50 border-red-200',          label: 'Cancelled' },
                    refunded:  { icon: AlertCircle,   color: 'text-gray-600 bg-gray-50 border-gray-200',       label: 'Refunded' },
                  };
                  const cfg = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={order.id} className="flex items-center gap-4 p-4 rounded-xl border bg-gray-50/50 hover:bg-gray-50 transition-colors" data-testid={`order-row-${order.id}`}>
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{order.product?.title || `Order #${order.id.slice(0, 8)}`}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          {' · '}{order.paymentMethod || 'Crypto'}
                        </p>
                        {order.deliveryDetails?.downloadUrl && (
                          <a href={order.deliveryDetails.downloadUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:underline mt-0.5 inline-block">
                            Download ↗
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="font-bold text-gray-900">${parseFloat(order.totalAmount || order.amount || 0).toFixed(2)}</span>
                        <Badge className={`text-xs border ${cfg.color} flex items-center gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                <p className="text-gray-400 text-sm">Invite friends — earn +100 pts per referral</p>
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
