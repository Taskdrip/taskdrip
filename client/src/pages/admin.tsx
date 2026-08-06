import { useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import {
  Users,
  Megaphone,
  Clock,
  TrendingUp,
  UserCheck,
  CheckSquare,
  Wallet,
  Flag,
  Plus,
  UserPlus,
  DollarSign,
  ShoppingBag,
  BookOpen,
  RefreshCw,
} from "lucide-react";

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
    refetchInterval: 30000,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
    refetchInterval: 30000,
  });

  // Real platform stats — polled every 30 s for live data
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    retry: false,
    refetchInterval: 30000,
  });

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
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Real stats from API; fall back to 0 while loading
  const totalUsers = stats?.totalUsers ?? allUsers.length ?? 0;
  const activeCampaigns = stats?.activeCampaigns ?? campaigns.filter((c: any) => c.isActive).length ?? 0;
  const pendingPayments = stats?.pendingPayments ?? 0;
  const totalRevenue = stats?.totalRevenue ? parseFloat(stats.totalRevenue) : 0;

  const formatRevenue = (amount: number) => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const shopOrders = stats?.totalShopOrders ?? 0;
  const paidShopOrders = stats?.paidShopOrders ?? 0;
  const courseRevenue = stats?.courseRevenue ? parseFloat(stats.courseRevenue) : 0;
  const shopRevenue = stats?.shopRevenue ? parseFloat(stats.shopRevenue) : 0;
  const escrowRevenue = stats?.escrowRevenue ? parseFloat(stats.escrowRevenue) : 0;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Admin Header */}
          <div className="bg-gray-900 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Admin Dashboard</h3>
                <p className="text-gray-300 flex items-center gap-2">
                  Welcome back, Administrator
                  {statsLoading && <RefreshCw className="w-3 h-3 animate-spin opacity-60" />}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/admin-master">
                  <Button className="bg-accent text-white hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Campaign
                  </Button>
                </Link>
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || ""} />
                      <AvatarFallback>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">Admin User</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-blue-900">{totalUsers.toLocaleString()}</p>
                    <p className="text-sm text-blue-600">
                      {stats ? `${stats.totalCreators ?? 0} creators · ${stats.totalBrands ?? 0} brands` : "Loading…"}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Active Campaigns</p>
                    <p className="text-2xl font-bold text-green-900">{activeCampaigns.toLocaleString()}</p>
                    <p className="text-sm text-green-600">
                      {stats ? `${stats.totalCampaigns ?? 0} total campaigns` : "Loading…"}
                    </p>
                  </div>
                  <Megaphone className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Pending Payments</p>
                    <p className="text-2xl font-bold text-yellow-900">{pendingPayments}</p>
                    <p className="text-sm text-yellow-600">
                      {stats ? `${stats.verifiedPayments ?? 0} verified` : "Awaiting verification"}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Platform Revenue</p>
                    <p className="text-2xl font-bold text-purple-900">{formatRevenue(totalRevenue)}</p>
                    <p className="text-sm text-purple-600">All sources combined</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Revenue Breakdown */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex items-center gap-4">
                  <ShoppingBag className="w-8 h-8 text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Shop Revenue</p>
                    <p className="text-xl font-bold text-orange-900">{formatRevenue(shopRevenue)}</p>
                    <p className="text-xs text-orange-500">{paidShopOrders} / {shopOrders} orders paid</p>
                  </div>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 flex items-center gap-4">
                  <BookOpen className="w-8 h-8 text-violet-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Course Revenue</p>
                    <p className="text-xl font-bold text-violet-900">{formatRevenue(courseRevenue)}</p>
                    <p className="text-xs text-violet-500">Active enrollments</p>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-center gap-4">
                  <DollarSign className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Escrow Revenue</p>
                    <p className="text-xl font-bold text-emerald-900">{formatRevenue(escrowRevenue)}</p>
                    <p className="text-xs text-emerald-500">
                      {stats?.verifiedPayments ?? 0} verified escrow payments
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions & Recent Campaigns */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-black mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  <Link href="/admin-master">
                    <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                      <UserCheck className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-black">Full Admin Control</p>
                        <p className="text-sm text-gray-600">Users, campaigns, payments, orders</p>
                      </div>
                    </button>
                  </Link>

                  <Link href="/admin-master#payments">
                    <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                      <CheckSquare className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-black">Verify Payments</p>
                        <p className="text-sm text-gray-600">
                          {pendingPayments > 0 ? `${pendingPayments} pending` : "No pending payments"}
                        </p>
                      </div>
                    </button>
                  </Link>

                  <Link href="/admin-master#shop">
                    <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                      <Wallet className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="font-medium text-black">Shop Orders</p>
                        <p className="text-sm text-gray-600">
                          {shopOrders > 0 ? `${shopOrders} orders · ${paidShopOrders} paid` : "No orders yet"}
                        </p>
                      </div>
                    </button>
                  </Link>

                  <Link href="/admin-master#users">
                    <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                      <Flag className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium text-black">Manage Users</p>
                        <p className="text-sm text-gray-600">{totalUsers} registered users</p>
                      </div>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Recent Campaigns */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-black mb-4">Recent Campaigns</h4>
                <div className="space-y-3">
                  {campaigns.slice(0, 4).map((campaign: any) => (
                    <div key={campaign.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">{campaign.brandName?.[0] || 'C'}</span>
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-black text-sm truncate">{campaign.title}</h5>
                            <p className="text-xs text-gray-500 truncate">
                              ${campaign.reward}/task · {campaign.filledSlots || 0}/{campaign.totalSlots} slots
                            </p>
                          </div>
                        </div>
                        <Badge className={`flex-shrink-0 text-xs ${campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {campaign.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {campaigns.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-gray-500 text-sm">No campaigns yet</p>
                      <Link href="/admin-master">
                        <Button className="mt-3 bg-accent text-white hover:bg-blue-700 text-sm">
                          Create Campaign
                        </Button>
                      </Link>
                    </div>
                  )}

                  {campaigns.length > 0 && (
                    <Link href="/admin-master">
                      <Button variant="outline" size="sm" className="w-full mt-1 text-xs">
                        View All Campaigns →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
