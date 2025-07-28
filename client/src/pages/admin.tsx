import { useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DollarSign
} from "lucide-react";

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
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

  // Calculate stats from available data
  const totalUsers = allUsers.length || 25847;
  const activeCampaigns = campaigns.filter((c: any) => c.isActive).length || 1250;
  const pendingApprovals = 89; // This would come from actual pending submissions
  const platformRevenue = "2.4M"; // This would come from actual revenue calculations

  const recentActivities = [
    {
      id: 1,
      type: "approval",
      icon: CheckSquare,
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
      title: "Task approved for Alex Chen",
      description: "Nike Air Max Campaign • $15.00 • 2 min ago"
    },
    {
      id: 2,
      type: "user",
      icon: UserPlus,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      title: "New user registration",
      description: "Sarah Martinez joined • 5 min ago"
    },
    {
      id: 3,
      type: "campaign",
      icon: Megaphone,
      iconColor: "text-yellow-600",
      bgColor: "bg-yellow-100",
      title: "New campaign created",
      description: "TechCorp Product Launch • 12 min ago"
    },
    {
      id: 4,
      type: "payout",
      icon: DollarSign,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-100",
      title: "Payout processed",
      description: "$100.00 to Maria Garcia • 18 min ago"
    }
  ];

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
                <p className="text-gray-300">Welcome back, Administrator</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button className="bg-accent text-white hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
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
                    <p className="text-sm text-blue-600">↗ +12% from last month</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Active Campaigns</p>
                    <p className="text-2xl font-bold text-green-900">{activeCampaigns.toLocaleString()}</p>
                    <p className="text-sm text-green-600">↗ +8% from last month</p>
                  </div>
                  <Megaphone className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Pending Approvals</p>
                    <p className="text-2xl font-bold text-yellow-900">{pendingApprovals}</p>
                    <p className="text-sm text-yellow-600">KYC & Task Reviews</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Platform Revenue</p>
                    <p className="text-2xl font-bold text-purple-900">${platformRevenue}</p>
                    <p className="text-sm text-purple-600">↗ +24% from last month</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-black mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-black">Review KYC Applications</p>
                      <p className="text-sm text-gray-600">15 pending approvals</p>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                    <CheckSquare className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-black">Approve Task Submissions</p>
                      <p className="text-sm text-gray-600">42 submissions waiting</p>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                    <Wallet className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-black">Process Payouts</p>
                      <p className="text-sm text-gray-600">$15,750 in pending payouts</p>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center space-x-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left">
                    <Flag className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-black">Review Reports</p>
                      <p className="text-sm text-gray-600">8 user reports to review</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-black mb-4">Recent Activity</h4>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-8 h-8 ${activity.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <activity.icon className={`w-4 h-4 ${activity.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-black font-medium">{activity.title}</p>
                        <p className="text-xs text-gray-600">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaign Management Section */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-black">Recent Campaigns</h4>
                <Button variant="outline">View All Campaigns</Button>
              </div>
              
              <div className="space-y-4">
                {campaigns.slice(0, 5).map((campaign: any) => (
                  <div key={campaign.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                          <span className="text-white font-semibold">{campaign.brandName?.[0] || 'C'}</span>
                        </div>
                        <div>
                          <h5 className="font-semibold text-black">{campaign.title}</h5>
                          <p className="text-sm text-gray-600">
                            {campaign.brandName} • ${campaign.reward} per task • {campaign.filledSlots}/{campaign.totalSlots} slots
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {campaign.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {campaigns.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No campaigns found</p>
                    <Button className="mt-4 bg-accent text-white hover:bg-blue-700">
                      Create First Campaign
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
