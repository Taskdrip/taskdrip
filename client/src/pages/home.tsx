import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Users, Coins, Target, ExternalLink, Smartphone, Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();
  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const activeCampaigns = campaigns?.filter((c: any) => c.filledSlots < c.totalSlots) || [];
  const stats = {
    totalEarnings: user?.totalEarned || 1250.75,
    availableBalance: user?.availableBalance || 325.50,
    activeCampaigns: activeCampaigns.length,
    completedTasks: user?.completedCampaigns || 47,
    followers: user?.followers || 12500
  };

  const featuredCampaigns = activeCampaigns.slice(0, 3);
  const taskCategories = [
    { name: "App Testing", count: 15, icon: Smartphone, color: "bg-blue-500" },
    { name: "Trading", count: 8, icon: TrendingUp, color: "bg-green-500" },
    { name: "Content Creation", count: 12, icon: Users, color: "bg-purple-500" },
    { name: "Event Hosting", count: 5, icon: Calendar, color: "bg-orange-500" },
    { name: "Local Errands", count: 9, icon: MapPin, color: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName || 'Creator'}!</h1>
          <p className="text-gray-600">Ready to start earning? Here are today's opportunities.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Coins className="h-4 w-4" />
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
              <p className="text-xs text-green-600">+12% this month</p>
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
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks finished</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Browse by Category</CardTitle>
              <CardDescription>Find tasks that match your skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {taskCategories.map((category) => (
                <Link key={category.name} href="/campaigns">
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className={`${category.color} p-2 rounded-lg`}>
                      <category.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-gray-500">{category.count} available</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Featured Campaigns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Featured Opportunities</CardTitle>
                  <CardDescription>High-paying tasks available now</CardDescription>
                </div>
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {featuredCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.title}</h3>
                      <p className="text-sm text-gray-600">{campaign.brandName}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
                      ${campaign.reward}
                    </Badge>
                  </div>
                  <p className="text-gray-700 mb-3 line-clamp-2">{campaign.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {campaign.estimatedTime}
                      </span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {campaign.totalSlots - campaign.filledSlots} spots
                      </span>
                      <Badge variant="outline">{campaign.category}</Badge>
                    </div>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Find Tasks</h3>
              <p className="text-sm opacity-90 mb-4">Browse available campaigns and start earning</p>
              <Link href="/campaigns">
                <Button variant="secondary" size="sm">Browse Tasks</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Your Profile</h3>
              <p className="text-sm opacity-90 mb-4">Update skills and track your progress</p>
              <Link href="/profile">
                <Button variant="secondary" size="sm">View Profile</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6 text-center">
              <Coins className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Earnings</h3>
              <p className="text-sm opacity-90 mb-4">View detailed earnings and request payouts</p>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">View Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}