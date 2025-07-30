import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  DollarSign, 
  Trophy, 
  Activity, 
  Settings, 
  Shield, 
  BarChart3, 
  UserCog,
  Lock,
  Key,
  ShoppingCart,
  Package,
  Plus
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [adminProfile, setAdminProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const { data: allParticipations } = useQuery({
    queryKey: ['/api/admin/participations'],
  });

  const updateAdminProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/admin/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Admin profile has been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update admin profile.',
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Password Changed',
        description: 'Password has been successfully updated.',
      });
      setAdminProfile(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    },
    onError: (error) => {
      toast({
        title: 'Password Change Failed',
        description: error.message || 'Failed to change password.',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (user) {
      setAdminProfile(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      }));
    }
  }, [user]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
      </div>
    );
  }

  const handleUpdateProfile = () => {
    const { firstName, lastName, email } = adminProfile;
    updateAdminProfileMutation.mutate({ firstName, lastName, email });
  };

  const handleChangePassword = () => {
    const { currentPassword, newPassword, confirmPassword } = adminProfile;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirm password do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = campaigns?.filter((c: any) => c.isActive).length || 0;
  const totalParticipations = allParticipations?.length || 0;
  const approvedParticipations = allParticipations?.filter((p: any) => p.status === 'approved').length || 0;
  const pendingParticipations = allParticipations?.filter((p: any) => p.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Manage the Breedskool platform</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold break-words overflow-hidden">{totalCampaigns}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeCampaigns} active campaigns
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold break-words overflow-hidden">{totalParticipations}</div>
                  <p className="text-xs text-muted-foreground">
                    {approvedParticipations} approved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600 break-words overflow-hidden">{pendingParticipations}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 break-words overflow-hidden">
                    {totalParticipations > 0 ? Math.round((approvedParticipations / totalParticipations) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Approval rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Platform Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allParticipations && allParticipations.slice(0, 10).map((participation: any) => (
                    <div key={participation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Campaign Participation</p>
                        <p className="text-sm text-gray-600">
                          User: {participation.userId} | Campaign: {participation.campaignId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(participation.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={participation.status === 'approved' ? 'default' : 'secondary'}>
                        {participation.status}
                      </Badge>
                    </div>
                  ))}
                  {(!allParticipations || allParticipations.length === 0) && (
                    <p className="text-center text-gray-600 py-8">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns && campaigns.map((campaign: any) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{campaign.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                            {campaign.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            ${campaign.reward}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                        <span>Slots: {campaign.filledSlots || 0}/{campaign.totalSlots}</span>
                      </div>
                    </div>
                  ))}
                  {(!campaigns || campaigns.length === 0) && (
                    <p className="text-center text-gray-600 py-8">No campaigns found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allParticipations && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">User Activity Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {new Set(allParticipations.map((p: any) => p.userId)).size}
                          </div>
                          <div className="text-sm text-blue-800">Active Users</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{approvedParticipations}</div>
                          <div className="text-sm text-green-800">Approved Tasks</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">{pendingParticipations}</div>
                          <div className="text-sm text-orange-800">Pending Reviews</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shop Tab */}
          <TabsContent value="shop" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Shop Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Product Management</h3>
                      <p className="text-gray-600">Add, edit, and manage software products in the shop</p>
                    </div>
                    <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <a href="/admin/products">
                        <Plus className="w-4 h-4 mr-2" />
                        Manage Products
                      </a>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-8 h-8 text-blue-600" />
                        <div>
                          <div className="text-2xl font-bold text-blue-600">0</div>
                          <div className="text-sm text-blue-800">Total Products</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-green-600" />
                        <div>
                          <div className="text-2xl font-bold text-green-600">0</div>
                          <div className="text-sm text-green-800">Total Sales</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-orange-600" />
                        <div>
                          <div className="text-2xl font-bold text-orange-600">$0</div>
                          <div className="text-sm text-orange-800">Revenue</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-semibold mb-4">Quick Actions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="/admin/products">
                          <Package className="w-4 h-4 mr-2" />
                          View All Products
                        </a>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="/shop">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          View Customer Shop
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  Admin Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adminFirstName">First Name</Label>
                      <Input
                        id="adminFirstName"
                        value={adminProfile.firstName}
                        onChange={(e) => setAdminProfile(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminLastName">Last Name</Label>
                      <Input
                        id="adminLastName"
                        value={adminProfile.lastName}
                        onChange={(e) => setAdminProfile(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={adminProfile.email}
                      onChange={(e) => setAdminProfile(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <Button 
                    onClick={handleUpdateProfile}
                    disabled={updateAdminProfileMutation.isPending}
                  >
                    {updateAdminProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Change Password
                  </h3>

                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={adminProfile.currentPassword}
                      onChange={(e) => setAdminProfile(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={adminProfile.newPassword}
                      onChange={(e) => setAdminProfile(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={adminProfile.confirmPassword}
                      onChange={(e) => setAdminProfile(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>

                  <Button 
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    variant="outline"
                  >
                    {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Platform Settings</h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium mb-2">Database Status</p>
                      <Badge variant="default" className="bg-green-600">Connected</Badge>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium mb-2">Authentication</p>
                      <Badge variant="default" className="bg-blue-600">Replit Auth Active</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}