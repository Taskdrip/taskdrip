import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, Users, DollarSign, FileText, Settings, BarChart3, 
  MessageSquare, CheckCircle, XCircle, Clock, Plus, Edit, 
  Trash2, Eye, UserCheck, AlertTriangle, TrendingUp
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface AdminStats {
  totalUsers: number;
  activeCampaigns: number;
  pendingPayouts: number;
  totalRevenue: number;
  pendingVerifications: number;
  activeTasks: number;
}

interface User {
  id: string;
  email: string;
  username: string;
  userType: string;
  verified: boolean;
  createdAt: string;
  firstName?: string;
  lastName?: string;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  budget: number;
  createdAt: string;
  brandId: string;
  description: string;
  reward: number;
}

interface Payout {
  id: string;
  userId: string;
  amount: number;
  status: string;
  network: string;
  walletAddress: string;
  createdAt: string;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  status: 'published' | 'draft';
  createdAt: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [newBlogPost, setNewBlogPost] = useState({
    title: "",
    content: "",
    status: "draft" as const
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/campaigns"],
  });

  const { data: payouts = [] } = useQuery<Payout[]>({
    queryKey: ["/api/admin/payouts"],
  });

  const { data: blogPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
  });

  const approvePayout = useMutation({
    mutationFn: async (payoutId: string) => {
      await apiRequest("POST", `/api/admin/payouts/${payoutId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Payout Approved",
        description: "Payment has been processed successfully.",
      });
    },
  });

  const verifyUser = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Verified",
        description: "User verification status updated.",
      });
    },
  });

  const createBlogPost = useMutation({
    mutationFn: async (data: typeof newBlogPost) => {
      await apiRequest("POST", "/api/admin/blog", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setNewBlogPost({ title: "", content: "", status: "draft" });
      toast({
        title: "Blog Post Created",
        description: "Your blog post has been created successfully.",
      });
    },
  });

  const suspendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      await apiRequest("POST", `/api/admin/campaigns/${campaignId}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({
        title: "Campaign Suspended",
        description: "Campaign has been suspended pending review.",
      });
    },
  });

  if (user?.userType !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const unverifiedUsers = users.filter(u => !u.verified && u.userType !== 'admin');
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">Master Admin Dashboard</h1>
            <p className="text-gray-600">Complete platform management and oversight</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-6">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("payments")}>
            <DollarSign className="h-4 w-4 mr-2" />
            Process Payments
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("blog")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Manage Blog
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {unverifiedUsers.length} pending verification
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCampaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  {campaigns.length} total campaigns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingPayouts.length}</div>
                <p className="text-xs text-muted-foreground">
                  ${pendingPayouts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{blogPosts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {blogPosts.filter(p => p.status === 'published').length} published
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Priority Alerts */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Urgent Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending Payouts</span>
                    <Badge variant="destructive">{pendingPayouts.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Unverified Users</span>
                    <Badge variant="secondary">{unverifiedUsers.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Platform Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Creators</span>
                    <span className="font-medium">{users.filter(u => u.userType === 'creator').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Brands</span>
                    <span className="font-medium">{users.filter(u => u.userType === 'brand').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Revenue</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium text-green-600">95%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">User Management</h2>
            <Link href="/admin/users">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Advanced Management
              </Button>
            </Link>
          </div>
          
          <div className="grid gap-4">
            {users.slice(0, 10).map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || user.email}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <Badge variant={user.userType === 'admin' ? 'destructive' : user.userType === 'brand' ? 'default' : 'secondary'}>
                      {user.userType}
                    </Badge>
                    {user.verified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!user.verified && user.userType !== 'admin' && (
                      <Button
                        size="sm"
                        onClick={() => verifyUser.mutate(user.id)}
                        disabled={verifyUser.isPending}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Campaign Management</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>
          
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium">{campaign.title}</p>
                      <p className="text-sm text-gray-600">Reward: ${campaign.reward}</p>
                      <p className="text-xs text-gray-500">{campaign.description?.substring(0, 100)}...</p>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    {campaign.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => suspendCampaign.mutate(campaign.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Payment Management</h2>
            <div className="flex gap-2">
              <Button variant="outline">Export Report</Button>
              <Button>Process All Pending</Button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {pendingPayouts.map((payout) => (
              <Card key={payout.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div>
                      <p className="font-medium">${payout.amount} USDT</p>
                      <p className="text-sm text-gray-600">{payout.network} Network</p>
                      <p className="text-xs text-gray-500 font-mono">{payout.walletAddress}</p>
                    </div>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approvePayout.mutate(payout.id)}
                      disabled={approvePayout.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm">
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pendingPayouts.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">No pending payouts</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="blog" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Blog Management</h2>
            <Button onClick={() => createBlogPost.mutate(newBlogPost)} disabled={!newBlogPost.title || createBlogPost.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Publish Post
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="blogTitle">Title</Label>
                  <Input
                    id="blogTitle"
                    value={newBlogPost.title}
                    onChange={(e) => setNewBlogPost(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter blog post title"
                  />
                </div>
                <div>
                  <Label htmlFor="blogContent">Content</Label>
                  <Textarea
                    id="blogContent"
                    value={newBlogPost.content}
                    onChange={(e) => setNewBlogPost(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your blog post content..."
                    rows={8}
                  />
                </div>
                <div>
                  <Label htmlFor="blogStatus">Status</Label>
                  <Select value={newBlogPost.status} onValueChange={(value: 'published' | 'draft') => setNewBlogPost(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {blogPosts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <p className="text-sm text-gray-600">
                          {post.status === 'published' ? 'Published' : 'Draft'} • {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {blogPosts.length === 0 && (
                    <p className="text-center text-gray-600 py-4">No blog posts yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-2xl font-bold">Platform Settings</h2>
          
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Configuration</CardTitle>
                <CardDescription>Manage crypto wallet addresses and payment settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>USDT (Tron) Wallet</Label>
                    <Input value="TQn9Y2khEsLJqX8xJ..." readOnly />
                  </div>
                  <div>
                    <Label>USDT (BSC) Wallet</Label>
                    <Input value="0x742d35Cc6528..." readOnly />
                  </div>
                  <div>
                    <Label>TON Wallet</Label>
                    <Input value="EQC3dNlesgVD9YbAx..." readOnly />
                  </div>
                  <div>
                    <Label>Minimum Payout</Label>
                    <Input value="$10.00" readOnly />
                  </div>
                </div>
                <Button>Update Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Limits</CardTitle>
                <CardDescription>Configure platform-wide limits and thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Minimum Payout</span>
                    <Badge>$10 USD</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Max Task Reward</span>
                    <Badge>$500 USD</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Daily Withdrawal Limit</span>
                    <Badge>$2,000 USD</Badge>
                  </div>
                </div>
                <Button>Update Limits</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}