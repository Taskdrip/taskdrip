import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { User, DollarSign, Trophy, Clock, Star, Edit3, Upload, MessageCircle, Bell, Send, Mail } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    website: '',
    location: '',
    skills: '',
    phoneNumber: '',
    socialMedia: {
      instagram: '',
      twitter: '',
      youtube: '',
      tiktok: ''
    }
  });

  const { data: participations } = useQuery({
    queryKey: ['/api/users', user?.id, 'participations'],
    enabled: !!user?.id,
  });

  const { data: transactions } = useQuery({
    queryKey: ['/api/users', user?.id, 'transactions'],
    enabled: !!user?.id,
  });

  // Fetch messages for creator
  const { data: messages } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!user?.id,
  });

  // Fetch notifications 
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}/profile`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (user && !isEditing) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        website: user.website || '',
        location: user.location || '',
        skills: user.skills || '',
        phoneNumber: user.phoneNumber || '',
        socialMedia: user.socialMedia || {
          instagram: '',
          twitter: '',
          youtube: '',
          tiktok: ''
        }
      });
    }
  }, [user, isEditing]);

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

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const calculateTotalEarnings = () => {
    return transactions?.reduce((sum: number, t: any) => 
      t.type === 'credit' ? sum + t.amount : sum, 0) || 0;
  };
  
  const completedTasks = participations?.filter((p: any) => p.status === 'approved').length || 0;
  const pendingTasks = participations?.filter((p: any) => p.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback className="text-2xl">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  <Badge variant="secondary" className="text-sm">
                    {user?.userType === 'creator' ? 'Creator' : 'Brand'}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">
                      Total Earned: <span className="font-semibold text-green-600">${calculateTotalEarnings().toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm text-gray-600">
                      Completed: <span className="font-semibold">{completedTasks}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      Pending: <span className="font-semibold">{pendingTasks}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 break-words overflow-hidden">
                    ${calculateTotalEarnings().toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold break-words overflow-hidden">{completedTasks}</div>
                  <p className="text-xs text-muted-foreground">+3 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold break-words overflow-hidden">94.2%</div>
                  <p className="text-xs text-muted-foreground">Approval rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Active Campaigns with Messaging */}
            <Card>
              <CardHeader>
                <CardTitle>Active Campaigns</CardTitle>
                <p className="text-sm text-gray-600">Your approved campaigns with messaging access</p>
              </CardHeader>
              <CardContent>
                {participations && participations.length > 0 ? (
                  <div className="space-y-4">
                    {participations.slice(0, 5).map((participation: any) => (
                      <div key={participation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">Campaign Task</p>
                          <p className="text-sm text-gray-600">
                            Status: {participation.status === 'pending' ? 'Application Sent' :
                             participation.status === 'approved' ? 'Approved – Awaiting Proof' :
                             participation.status === 'submitted' ? 'Proof Submitted' :
                             participation.status === 'completed' ? 'Completed & Paid' :
                             participation.status === 'rejected' ? 'Rejected' : participation.status}
                          </p>
                          <p className="text-xs text-gray-500">Submitted: {participation.submittedAt ? new Date(participation.submittedAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            participation.status === 'completed' ? 'bg-green-600 text-white' :
                            participation.status === 'approved' ? 'bg-blue-600 text-white' :
                            participation.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                            participation.status === 'rejected' ? 'bg-red-100 text-red-800' : ''
                          } variant={participation.status === 'pending' ? 'secondary' : 'default'}>
                            {participation.status === 'pending' ? 'Application Sent' :
                             participation.status === 'approved' ? 'Approved' :
                             participation.status === 'submitted' ? 'Proof Submitted' :
                             participation.status === 'completed' ? 'Completed & Paid' :
                             participation.status === 'rejected' ? 'Rejected' : participation.status}
                          </Badge>
                          {participation.status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/messages?campaign=${participation.campaignId}`, '_blank')}
                              className="flex items-center gap-1"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Chat Brand
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No active campaigns</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Messages Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Recent Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messages && messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.slice(0, 3).map((message: any) => (
                        <div key={message.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{message.subject}</p>
                            <p className="text-xs text-gray-600 truncate">{message.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(message.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!message.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => window.location.href = '/messages'}
                      >
                        View All Messages
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No messages yet</p>
                      <p className="text-sm text-gray-500">Messages from brands will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notifications && notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.slice(0, 3).map((notification: any) => (
                        <div key={notification.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-gray-600">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No notifications</p>
                      <p className="text-sm text-gray-500">Updates will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={() => window.location.href = '/messages'}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Open Messages
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/campaigns'}
                    className="flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4" />
                    Browse Campaigns
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={profileData.website}
                          onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="City, Country"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="skills">Skills</Label>
                      <Input
                        id="skills"
                        value={profileData.skills}
                        onChange={(e) => setProfileData(prev => ({ ...prev, skills: e.target.value }))}
                        placeholder="Comma-separated skills"
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Social Media</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="instagram">Instagram</Label>
                          <Input
                            id="instagram"
                            value={profileData.socialMedia.instagram}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                            }))}
                            placeholder="@username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="twitter">Twitter</Label>
                          <Input
                            id="twitter"
                            value={profileData.socialMedia.twitter}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                            }))}
                            placeholder="@username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="youtube">YouTube</Label>
                          <Input
                            id="youtube"
                            value={profileData.socialMedia.youtube}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              socialMedia: { ...prev.socialMedia, youtube: e.target.value }
                            }))}
                            placeholder="Channel URL"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tiktok">TikTok</Label>
                          <Input
                            id="tiktok"
                            value={profileData.socialMedia.tiktok}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              socialMedia: { ...prev.socialMedia, tiktok: e.target.value }
                            }))}
                            placeholder="@username"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                        <div className="space-y-2">
                          <p><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</p>
                          <p><span className="font-medium">Email:</span> {user?.email}</p>
                          <p><span className="font-medium">Location:</span> {user?.location || 'Not specified'}</p>
                          <p><span className="font-medium">Website:</span> {user?.website || 'Not specified'}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Professional</h3>
                        <div className="space-y-2">
                          <p><span className="font-medium">Skills:</span> {user?.skills || 'Not specified'}</p>
                          <p><span className="font-medium">User Type:</span> {user?.userType}</p>
                        </div>
                      </div>
                    </div>
                    {user?.bio && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                        <p className="text-gray-600">{user.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Participations</CardTitle>
              </CardHeader>
              <CardContent>
                {participations && participations.length > 0 ? (
                  <div className="space-y-4">
                    {participations.map((participation: any) => (
                      <div key={participation.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Campaign ID: {participation.campaignId}</p>
                          <Badge className={
                            participation.status === 'completed' ? 'bg-green-600 text-white' :
                            participation.status === 'approved' ? 'bg-blue-600 text-white' :
                            participation.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                            participation.status === 'rejected' ? 'bg-red-100 text-red-800' : ''
                          } variant={participation.status === 'pending' ? 'secondary' : 'default'}>
                            {participation.status === 'pending' ? 'Application Sent' :
                             participation.status === 'approved' ? 'Approved' :
                             participation.status === 'submitted' ? 'Proof Submitted' :
                             participation.status === 'completed' ? 'Completed & Paid' :
                             participation.status === 'rejected' ? 'Rejected' : participation.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Joined: {new Date(participation.createdAt).toLocaleDateString()}
                        </p>
                        {participation.submissionText && (
                          <p className="text-sm mt-2">{participation.submissionText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-600 py-8">No campaign participations yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium capitalize">{transaction.type}</p>
                          <p className="text-sm text-gray-600">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`text-lg font-semibold ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-600 py-8">No transactions yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}