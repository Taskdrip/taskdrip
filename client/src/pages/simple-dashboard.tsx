import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Trophy, Clock, User, DollarSign, Target } from "lucide-react";
import { Link } from "wouter";

export default function SimpleDashboard() {
  const { user } = useAuth();

  const { data: participations = [] } = useQuery({
    queryKey: ['/api/users', user?.id, 'participations'],
    enabled: !!user?.id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/users', user?.id, 'transactions'], 
    enabled: !!user?.id,
  });

  const stats = {
    availableBalance: parseFloat(user?.availableBalance || '0'),
    totalEarnings: parseFloat(user?.totalEarned || '0'),
    completedTasks: user?.completedCampaigns || 0,
    activeCampaigns: 12, // This would come from API
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName || 'Creator'}!
          </h1>
          <p className="text-gray-600">Here's your account overview and recent activity.</p>
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
                <Button className="w-full justify-start" variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  Browse Available Tasks
                </Button>
              </Link>
              
              <Link href="/wallet">
                <Button className="w-full justify-start" variant="outline">
                  <Wallet className="h-4 w-4 mr-2" />
                  Manage Crypto Wallets
                </Button>
              </Link>
              
              <Link href="/profile">
                <Button className="w-full justify-start" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Update Profile
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
              {participations.length > 0 ? (
                <div className="space-y-4">
                  {participations.slice(0, 3).map((participation: any) => (
                    <div key={participation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Task Participation</p>
                        <p className="text-sm text-gray-600">Campaign ID: {participation.campaignId}</p>
                      </div>
                      <Badge variant={
                        participation.status === 'approved' ? 'default' :
                        participation.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {participation.status}
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
        {!user?.usdtTronWallet && !user?.usdtBscWallet && !user?.tonWallet && (
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
      </div>
    </div>
  );
}