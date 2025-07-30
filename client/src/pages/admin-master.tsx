import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useWallets } from "@/hooks/useWallets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Shield, Users, DollarSign, MessageSquare, CheckCircle, XCircle, Clock, Plus, Edit, 
  Trash2, Eye, UserCheck, AlertTriangle, TrendingUp, Settings, BookOpen, Target,
  Download, Upload, Filter, Search, MoreHorizontal, Activity, Globe, Lock,
  Mail, Phone, MapPin, Calendar, FileText, Image, Video, ExternalLink, Send,
  Bold, Italic, Underline, List, ListOrdered, Quote, Link, AlignLeft, AlignCenter, AlignRight,
  Copy
} from "lucide-react";

// Form schemas
const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  status: z.enum(["draft", "published"]),
  category: z.string().optional(),
  featuredImage: z.string().optional(),
});

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description is required"),
  category: z.string().min(1, "Category is required"),
  reward: z.number().min(0.01, "Reward must be positive"),
  totalSlots: z.number().min(1, "Must have at least 1 slot"),
});

const settingsSchema = z.object({
  minPayout: z.number().min(1, "Minimum payout must be at least $1"),
  maxTaskReward: z.number().min(1, "Maximum task reward must be positive"),
  dailyWithdrawalLimit: z.number().min(100, "Daily limit must be at least $100"),
});

const walletSchema = z.object({
  address: z.string().min(10, "Wallet address must be at least 10 characters"),
});

export default function AdminMaster() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { walletAddresses, updateWalletAddress, copyToClipboard } = useWallets();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isBlogDialogOpen, setIsBlogDialogOpen] = useState(false);
  const [isEditWalletDialogOpen, setIsEditWalletDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<{type: string, address: string} | null>(null);

  // Forms
  const blogForm = useForm({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      content: "",
      status: "draft" as const,
      category: "",
      featuredImage: "",
    },
  });

  const campaignForm = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      reward: 0,
      totalSlots: 1,
    },
  });

  const settingsForm = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      minPayout: 10,
      maxTaskReward: 500,
      dailyWithdrawalLimit: 2000,
    },
  });

  const walletForm = useForm({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      address: "",
    },
  });

  // Data fetching with proper admin endpoints
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/admin/campaigns"],
    retry: false,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/admin/transactions"],
    retry: false,
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["/api/blog"],
    retry: false,
  });

  // Admin mutations
  const createBlogPost = useMutation({
    mutationFn: async (data: z.infer<typeof blogPostSchema>) => {
      // Generate slug from title
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const postData = {
        ...data,
        slug,
        isPublished: data.status === 'published',
        publishedAt: data.status === 'published' ? new Date().toISOString() : null,
        excerpt: data.content.substring(0, 160) + '...',
        authorId: (user as any)?.id,
      };
      
      const res = await apiRequest("POST", "/api/admin/blog", postData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      blogForm.reset();
      toast({
        title: "Success",
        description: `Blog post ${data.status === 'published' ? 'published' : 'saved as draft'} successfully`,
      });
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (data: z.infer<typeof campaignSchema>) => {
      const res = await apiRequest("POST", "/api/admin/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      campaignForm.reset();
      setIsCampaignDialogOpen(false);
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
    },
  });

  const deleteBlogPost = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/admin/blog/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({
        title: "Success",
        description: "Blog post deleted successfully",
      });
    },
  });

  const suspendUser = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User suspended successfully",
      });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: z.infer<typeof settingsSchema>) => {
      await apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      setIsSettingsDialogOpen(false);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
  });

  const updateUserVerification = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}/verification`, { verified });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User verification updated",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}/reset-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/admin/payments/${paymentId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({
        title: "Success",
        description: "Payment status updated",
      });
    },
  });

  const updateWallet = useMutation({
    mutationFn: async ({ type, address }: { type: string; address: string }) => {
      const res = await apiRequest("PUT", `/api/admin/wallets/${type}`, { address });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Update wallet address using centralized manager
      updateWalletAddress(variables.type as keyof typeof walletAddresses, variables.address);
      
      setIsEditWalletDialogOpen(false);
      setEditingWallet(null);
      walletForm.reset();
      toast({
        title: "Success",
        description: `${variables.type.toUpperCase()} wallet address updated successfully`,
      });
    },
  });

  if ((user as any)?.userType !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const pendingPayments = transactions.filter((t: any) => t.status === 'pending');
  const unverifiedUsers = users.filter((u: any) => !u.isVerified && u.userType !== 'admin');
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active');
  const totalUsers = users.length;
  const totalRevenue = transactions
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

  // Filtered data based on search
  const filteredUsers = users.filter((user: any) => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter((campaign: any) =>
    campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter((transaction: any) =>
    transaction.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      <Navigation />
      <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 pb-20 overflow-x-hidden">
        {/* Header */}
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 w-full">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Payments</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unverified Users</p>
                    <p className="text-2xl font-bold text-red-600">{unverifiedUsers.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Campaigns</p>
                    <p className="text-2xl font-bold text-green-600">{activeCampaigns.length}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile-responsive Search and Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users, campaigns, transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-80"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile-responsive linear tab navigation */}
          <div className="w-full overflow-x-auto pb-2 mb-6">
            <TabsList className="flex w-max min-w-full lg:grid lg:grid-cols-7 h-auto p-1 bg-muted rounded-lg gap-1">
              <TabsTrigger value="overview" className="flex-shrink-0 min-w-[90px] lg:min-w-0 flex items-center gap-1 lg:gap-2 px-3 py-2 whitespace-nowrap">
                <Shield className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-shrink-0 min-w-[100px] lg:min-w-0 flex items-center gap-1 lg:gap-2 px-3 py-2 whitespace-nowrap">
                <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">Users ({totalUsers})</span>
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex-shrink-0 min-w-[100px] lg:min-w-0 flex items-center gap-1 lg:gap-2 px-3 py-2 whitespace-nowrap">
                <Target className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">Campaigns</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex-shrink-0 min-w-[90px] lg:min-w-0 flex items-center gap-1 lg:gap-2 px-3 py-2 whitespace-nowrap">
                <DollarSign className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="blog" className="flex-shrink-0 min-w-[70px] lg:min-w-0 flex items-center gap-1 lg:gap-2 px-3 py-2 whitespace-nowrap">
                <BookOpen className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">Blog</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex-shrink-0 min-w-[90px] lg:min-w-0 flex items-center gap-1 lg:gap-2 px-3 py-2 whitespace-nowrap">
                <TrendingUp className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-shrink-0 min-w-[80px] lg:min-w-0 flex items-center gap-1 lg:gap-2 px-3 py-2 whitespace-nowrap">
                <Settings className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="text-xs lg:text-sm">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 pb-8">
            {/* Executive Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-xl font-bold text-green-600">${(totalRevenue / 1000000).toFixed(1)}M</p>
                      <p className="text-xs text-green-500">+12% this month</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold">{totalUsers}</p>
                      <p className="text-xs text-blue-500">+5 new today</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Approvals</p>
                      <p className="text-2xl font-bold text-orange-600">{pendingPayments.length + unverifiedUsers.length}</p>
                      <p className="text-xs text-orange-500">Needs attention</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Live Campaigns</p>
                      <p className="text-2xl font-bold text-purple-600">{activeCampaigns.length}</p>
                      <p className="text-xs text-purple-500">Currently running</p>
                    </div>
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Platform Status</p>
                      <p className="text-lg font-bold text-green-600">Operational</p>
                      <p className="text-xs text-green-500">All systems online</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Priority Actions */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Priority Actions Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingPayments.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">{pendingPayments.length} Pending Payments</p>
                          <p className="text-sm text-yellow-600">Total: ${pendingPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('payments')}>Review</Button>
                    </div>
                  )}
                  
                  {unverifiedUsers.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">{unverifiedUsers.length} Unverified Users</p>
                          <p className="text-sm text-red-600">Awaiting identity verification</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('users')}>Review</Button>
                    </div>
                  )}
                  
                  {pendingPayments.length === 0 && unverifiedUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>All tasks completed!</p>
                      <p className="text-sm">No pending actions require attention.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {users.slice(-8).map((user: any, idx: number) => (
                      <div key={`user-${idx}`} className="flex items-center gap-3 py-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">New registration: {user.email}</p>
                          <p className="text-xs text-gray-500">Just now</p>
                        </div>
                      </div>
                    ))}
                    
                    {campaigns.slice(-4).map((campaign: any, idx: number) => (
                      <div key={`campaign-${idx}`} className="flex items-center gap-3 py-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">Campaign: {campaign.title}</p>
                          <p className="text-xs text-gray-500">Recently created</p>
                        </div>
                      </div>
                    ))}
                    
                    {transactions.slice(-3).map((transaction: any, idx: number) => (
                      <div key={`transaction-${idx}`} className="flex items-center gap-3 py-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          transaction.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">${transaction.amount} {transaction.type}</p>
                          <p className="text-xs text-gray-500">{transaction.status}</p>
                        </div>
                      </div>
                    ))}
                    
                    {users.length === 0 && campaigns.length === 0 && transactions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No recent activity</p>
                        <p className="text-sm">Activity will appear here as users interact with the platform</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Management</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Users
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Users
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Users ({filteredUsers.length})</CardTitle>
                <CardDescription>Manage user accounts, verification status, and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              {user.location && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {user.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.userType === 'admin' ? 'default' : user.userType === 'brand' ? 'secondary' : 'outline'}>
                            {user.userType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={user.isVerified ? 'default' : 'destructive'} className="w-fit">
                              {user.isVerified ? 'Verified' : 'Unverified'}
                            </Badge>
                            {user.isKycApproved && (
                              <Badge variant="secondary" className="w-fit text-xs">
                                KYC Approved
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">${user.totalEarned || '0.00'}</p>
                            <p className="text-gray-500">{user.completedCampaigns || 0} campaigns</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!user.isVerified && user.userType !== 'admin' && (
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserVerification.mutate({ userId: user.id, verified: true })}
                                disabled={updateUserVerification.isPending}
                              >
                                <UserCheck className="h-3 w-3" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>User Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for {user.firstName} {user.lastName}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Email</Label>
                                    <p className="text-sm">{user.email}</p>
                                  </div>
                                  <div>
                                    <Label>Phone</Label>
                                    <p className="text-sm">{user.phoneNumber || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <Label>Bio</Label>
                                    <p className="text-sm">{user.bio || 'No bio provided'}</p>
                                  </div>
                                  <div>
                                    <Label>Skills</Label>
                                    <p className="text-sm">{user.skills?.join(', ') || 'No skills listed'}</p>
                                  </div>
                                  <div>
                                    <Label>Social Media</Label>
                                    <div className="space-y-1">
                                      {user.twitterHandle && <p className="text-sm">Twitter: @{user.twitterHandle}</p>}
                                      {user.instagramHandle && <p className="text-sm">Instagram: @{user.instagramHandle}</p>}
                                      {user.linkedinHandle && <p className="text-sm">LinkedIn: {user.linkedinHandle}</p>}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Crypto Wallets</Label>
                                    <div className="space-y-1">
                                      {user.usdtTronWallet && <p className="text-xs font-mono">USDT (Tron): {user.usdtTronWallet}</p>}
                                      {user.usdtBscWallet && <p className="text-xs font-mono">USDT (BSC): {user.usdtBscWallet}</p>}
                                      {user.tonWallet && <p className="text-xs font-mono">TON: {user.tonWallet}</p>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                  <Button variant="outline" onClick={() => suspendUser.mutate(user.id)}>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Suspend User
                                  </Button>
                                  <Button variant="outline">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Message
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsEditUserDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const newPassword = prompt("Enter new password for user:");
                                    if (newPassword) {
                                      resetPassword.mutate({ userId: user.id, newPassword });
                                    }
                                  }}
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
                                      deleteUser.mutate(user.id);
                                    }
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Payment Management</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Monitor and approve platform payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.status === 'completed' ? 'bg-green-500' : 
                          transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium">${transaction.amount}</p>
                          <p className="text-sm text-gray-600">{transaction.type}</p>
                          <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={
                          transaction.status === 'completed' ? 'default' : 
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {transaction.status}
                        </Badge>
                        {transaction.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updatePaymentStatus.mutate({ paymentId: transaction.id, status: 'completed' })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updatePaymentStatus.mutate({ paymentId: transaction.id, status: 'rejected' })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Blog Management</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Posts
                </Button>
                <Button size="sm" form="blog-form">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    WordPress-Style Editor
                  </CardTitle>
                  <CardDescription>Create engaging blog posts with rich formatting and media uploads</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...blogForm}>
                    <form 
                      id="blog-form"
                      onSubmit={blogForm.handleSubmit((data) => createBlogPost.mutate(data))}
                      className="space-y-6"
                    >
                      <FormField
                        control={blogForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Post Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter an engaging and SEO-friendly title..." 
                                className="text-lg font-medium"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={blogForm.control}
                        name="featuredImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Featured Image</FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                          field.onChange(e.target?.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden"
                                    id="featured-image-upload"
                                  />
                                  <label 
                                    htmlFor="featured-image-upload" 
                                    className="cursor-pointer flex flex-col items-center"
                                  >
                                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                                    <div className="text-lg font-medium text-gray-700">Upload Featured Image</div>
                                    <div className="text-sm text-gray-500">PNG, JPG up to 10MB</div>
                                    <Button type="button" className="mt-4">
                                      Choose File
                                    </Button>
                                  </label>
                                </div>
                                
                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                  </div>
                                  <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-gray-500">or</span>
                                  </div>
                                </div>
                                
                                <Input 
                                  placeholder="Enter image URL..." 
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                />
                                
                                {field.value && (
                                  <div className="mt-4">
                                    <img 
                                      src={field.value} 
                                      alt="Featured image preview" 
                                      className="w-full h-64 object-cover rounded-lg border shadow-sm"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={blogForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Editor</FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                {/* Rich Text Editor Toolbar */}
                                <div className="border rounded-lg p-3 bg-gray-50">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Bold"
                                        onClick={() => {
                                          const currentValue = field.value || "";
                                          field.onChange(currentValue + "**bold text**");
                                        }}
                                      >
                                        <Bold className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Italic"
                                        onClick={() => {
                                          const currentValue = field.value || "";
                                          field.onChange(currentValue + "*italic text*");
                                        }}
                                      >
                                        <Italic className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Heading"
                                        onClick={() => {
                                          const currentValue = field.value || "";
                                          field.onChange(currentValue + "\n\n## New Heading\n\n");
                                        }}
                                      >
                                        H2
                                      </Button>
                                    </div>
                                    <div className="w-px h-4 bg-gray-300"></div>
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Add Link"
                                        onClick={() => {
                                          const linkText = prompt("Enter link text:");
                                          const linkUrl = prompt("Enter link URL:");
                                          if (linkText && linkUrl) {
                                            const currentValue = field.value || "";
                                            field.onChange(currentValue + `[${linkText}](${linkUrl})`);
                                          }
                                        }}
                                      >
                                        <Link className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Add Image"
                                        onClick={() => {
                                          const imageUrl = prompt("Enter image URL or upload link:");
                                          if (imageUrl) {
                                            const altText = prompt("Enter image description (alt text):") || "Image";
                                            const currentValue = field.value || "";
                                            field.onChange(currentValue + `\n\n![${altText}](${imageUrl})\n\n`);
                                            toast({
                                              title: "Image added",
                                              description: "Image markdown has been inserted into your post",
                                            });
                                          }
                                        }}
                                      >
                                        <Image className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Add Video"
                                        onClick={() => {
                                          const videoUrl = prompt("Enter video URL (YouTube, Vimeo, etc.):");
                                          if (videoUrl) {
                                            const currentValue = field.value || "";
                                            // Handle different video platforms
                                            let embedCode = "";
                                            if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
                                              embedCode = `\n\n📺 [Watch Video](${videoUrl})\n\n`;
                                            } else if (videoUrl.includes("vimeo.com")) {
                                              embedCode = `\n\n📹 [Watch on Vimeo](${videoUrl})\n\n`;
                                            } else {
                                              embedCode = `\n\n🎥 [Watch Video](${videoUrl})\n\n`;
                                            }
                                            field.onChange(currentValue + embedCode);
                                            toast({
                                              title: "Video added",
                                              description: "Video link has been inserted into your post",
                                            });
                                          }
                                        }}
                                      >
                                        <Video className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="w-px h-4 bg-gray-300"></div>
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Add List"
                                        onClick={() => {
                                          const currentValue = field.value || "";
                                          field.onChange(currentValue + "\n\n- Item 1\n- Item 2\n- Item 3\n\n");
                                        }}
                                      >
                                        <List className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        title="Add Quote"
                                        onClick={() => {
                                          const currentValue = field.value || "";
                                          field.onChange(currentValue + "\n\n> Your quote here\n\n");
                                        }}
                                      >
                                        <Quote className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="w-px h-4 bg-gray-300"></div>
                                    <div className="text-xs text-gray-500">
                                      Rich Editor
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Content Editor */}
                                <Textarea 
                                  placeholder="Start writing your engaging blog post here...

✨ Quick Tips:
• Use the toolbar buttons above to add formatting
• **Bold** and *italic* text for emphasis
• Click the image button to add pictures
• Click the video button to embed videos
• Use ## for headings and > for quotes

What story will you tell today?"
                                  className="min-h-[450px] font-mono text-sm leading-relaxed border-0 focus:ring-0 resize-y"
                                  {...field} 
                                />
                                
                                {/* Word Count and SEO Info */}
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>{field.value?.length || 0} characters</span>
                                  <span>{field.value?.split(' ').filter(word => word.length > 0).length || 0} words</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={blogForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="announcements">📢 Announcements</SelectItem>
                                  <SelectItem value="tutorials">📚 Tutorials</SelectItem>
                                  <SelectItem value="case-studies">📊 Case Studies</SelectItem>
                                  <SelectItem value="industry-news">📰 Industry News</SelectItem>
                                  <SelectItem value="company-updates">🏢 Company Updates</SelectItem>
                                  <SelectItem value="tips-tricks">💡 Tips & Tricks</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={blogForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Publication Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">💾 Save as Draft</SelectItem>
                                  <SelectItem value="published">🚀 Publish Now</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                        <Button 
                          type="submit" 
                          disabled={createBlogPost.isPending}
                          className="flex-1 sm:flex-none sm:min-w-[140px]"
                          size="lg"
                        >
                          {createBlogPost.isPending ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              {blogForm.watch('status') === 'published' ? 'Publishing...' : 'Saving...'}
                            </>
                          ) : (
                            <>
                              {blogForm.watch('status') === 'published' ? (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Publish Post
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Save Draft
                                </>
                              )}
                            </>
                          )}
                        </Button>
                        
                        {/* Quick Publish Button */}
                        <Button 
                          type="button" 
                          variant="outline"
                          size="lg"
                          className="flex-1 sm:flex-none sm:min-w-[120px]"
                          onClick={() => {
                            blogForm.setValue('status', 'published');
                            const data = blogForm.getValues();
                            if (data.title && data.content) {
                              createBlogPost.mutate(data);
                            } else {
                              toast({
                                title: "Missing fields",
                                description: "Please fill in title and content",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={createBlogPost.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Quick Publish
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="lg"
                          className="flex-1 sm:flex-none"
                          onClick={() => {
                            blogForm.reset();
                            toast({
                              title: "Form cleared",
                              description: "All fields have been reset",
                            });
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Blog Management Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Publishing Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-medium text-blue-800">Content Guidelines</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Write engaging, valuable content that provides real value to your audience
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="w-full">
                          <Upload className="h-3 w-3 mr-1" />
                          Import
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">SEO Tips</h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>• Use descriptive, keyword-rich titles</p>
                        <p>• Include relevant images with alt text</p>
                        <p>• Write compelling meta descriptions</p>
                        <p>• Use headings to structure content</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>All Posts ({blogPosts.length})</CardTitle>
                    <CardDescription>Recent blog content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {blogPosts.slice(0, 5).map((post: any) => (
                        <div key={post.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                          {post.featuredImage && (
                            <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                              <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{post.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {post.category && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {post.category}
                                </Badge>
                              )}
                              <Badge variant={post.isPublished ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                                {post.isPublished ? 'Live' : 'Draft'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => deleteBlogPost.mutate(post.id)}
                              disabled={deleteBlogPost.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {blogPosts.length === 0 && (
                        <div className="text-center py-6 text-gray-500">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No posts yet</p>
                          <p className="text-xs">Start creating content</p>
                        </div>
                      )}
                      
                      {blogPosts.length > 5 && (
                        <div className="text-center pt-2">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View all {blogPosts.length} posts
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Campaign Oversight</h2>
              <Button onClick={() => setIsCampaignDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Campaigns ({campaigns.length})</CardTitle>
                <CardDescription>Monitor and manage platform campaigns</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No campaigns found</p>
                    <p className="text-sm">Create your first campaign to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign: any) => (
                      <div key={campaign.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{campaign.title}</p>
                            <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'destructive'} className="text-xs">
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${campaign.reward} reward
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign.filledSlots || 0}/{campaign.totalSlots} slots
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(campaign.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 sm:mt-0">
                          <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Payment Management</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Transactions ({transactions.length})</CardTitle>
                <CardDescription>Track payments, withdrawals, and platform revenue</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No transactions found</p>
                    <p className="text-sm">Payment transactions will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="font-mono text-sm">
                              {transaction.id?.slice(0, 8)}...
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {transaction.userEmail?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{transaction.userEmail}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'payment' ? 'default' : 'secondary'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              ${transaction.amount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {transaction.network || 'USDT'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              transaction.status === 'completed' ? 'default' : 
                              transaction.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {transaction.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updatePaymentStatus.mutate({ paymentId: transaction.id, status: 'completed' })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updatePaymentStatus.mutate({ paymentId: transaction.id, status: 'rejected' })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Analytics & Insights</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                <Select defaultValue="7days">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-3xl font-bold">{totalUsers}</p>
                      <p className="text-sm text-green-600">↗ +12% from last month</p>
                    </div>
                    <Users className="h-12 w-12 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                      <p className="text-3xl font-bold">{activeCampaigns.length}</p>
                      <p className="text-sm text-blue-600">↗ +8% from last week</p>
                    </div>
                    <Target className="h-12 w-12 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-2xl lg:text-3xl font-bold break-all">${(totalRevenue / 1000000).toFixed(1)}M</p>
                      <p className="text-sm text-green-600">↗ +15% from last month</p>
                    </div>
                    <DollarSign className="h-12 w-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <p className="text-3xl font-bold">94%</p>
                      <p className="text-sm text-green-600">↗ +2% from last week</p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth Trends</CardTitle>
                  <CardDescription>New user registrations over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-2" />
                      <p>Chart visualization would be implemented here</p>
                      <p className="text-sm">Showing user growth trends and patterns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Payment trends and commission tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Processed</span>
                      <span className="font-medium">${(totalRevenue / 1000000).toFixed(1)}M</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending Payments</span>
                      <span className="font-medium">${pendingPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Commission Earned</span>
                      <span className="font-medium">${((totalRevenue * 0.05) / 1000000).toFixed(1)}M</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Average Transaction</span>
                      <span className="font-medium">${transactions.length > 0 ? (totalRevenue / transactions.length).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Creator Balances</CardTitle>
                  <CardDescription>Outstanding payouts and withdrawal requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Creator Balances</span>
                      <span className="font-medium">${users.filter((u: any) => u.userType === 'creator').reduce((sum: number, user: any) => sum + parseFloat(user.availableBalance || '0'), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Creators with $10+ Balance</span>
                      <span className="font-medium">{users.filter((u: any) => u.userType === 'creator' && parseFloat(u.availableBalance || '0') >= 10).length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Creator Balance</span>
                      <span className="font-medium">${users.filter((u: any) => u.userType === 'creator').length > 0 ? (users.filter((u: any) => u.userType === 'creator').reduce((sum: number, user: any) => sum + parseFloat(user.availableBalance || '0'), 0) / users.filter((u: any) => u.userType === 'creator').length).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Payout Requests</span>
                      <span className="font-medium text-orange-600">{pendingPayments.length} pending</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Platform Settings</h2>
              <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Update Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Platform Configuration</DialogTitle>
                    <DialogDescription>
                      Modify global platform settings and limits
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...settingsForm}>
                    <form 
                      onSubmit={settingsForm.handleSubmit((data) => updateSettings.mutate(data))}
                      className="space-y-4"
                    >
                      <FormField
                        control={settingsForm.control}
                        name="minPayout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Payout ($)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="maxTaskReward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Task Reward ($)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="dailyWithdrawalLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Daily Withdrawal Limit ($)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={updateSettings.isPending}>
                          {updateSettings.isPending ? "Updating..." : "Save Settings"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsSettingsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure platform-wide parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <Label className="text-sm font-medium">Minimum Payout Amount</Label>
                      <p className="text-2xl font-bold mt-1">$10.00</p>
                      <p className="text-sm text-gray-600">Current threshold for payouts</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <Label className="text-sm font-medium">Maximum Task Reward</Label>
                      <p className="text-2xl font-bold mt-1">$500.00</p>
                      <p className="text-sm text-gray-600">Maximum reward per task</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm font-medium">Daily Withdrawal Limit</Label>
                    <p className="text-2xl font-bold mt-1">$2,000.00</p>
                    <p className="text-sm text-gray-600">Maximum daily withdrawal per user</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supported Networks</CardTitle>
                  <CardDescription>Active cryptocurrency payment networks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">USDT (Tron)</p>
                          <p className="text-sm text-gray-600">TRC-20 Network</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">USDT (BSC)</p>
                          <p className="text-sm text-gray-600">BEP-20 Network</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">USDT (TON)</p>
                          <p className="text-sm text-gray-600">USDT on The Open Network</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Admin Payment Wallets</CardTitle>
                <CardDescription>Central wallet addresses for all platform transactions (campaigns, shop, subscriptions, ads)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-1 gap-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-blue-900">USDT (Tron Network) - TRC-20</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingWallet({
                              type: 'tron',
                              address: walletAddresses.tron
                            });
                            walletForm.setValue('address', walletAddresses.tron);
                            setIsEditWalletDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={walletAddresses.tron} 
                          readOnly 
                          className="font-mono text-sm bg-white"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            const success = await copyToClipboard('tron');
                            if (success) {
                              toast({
                                title: "Copied!",
                                description: "Tron wallet address copied to clipboard",
                              });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">All USDT Tron payments go to this address</p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-yellow-900">USDT (BSC Network) - BEP-20</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingWallet({
                              type: 'bsc',
                              address: walletAddresses.bsc
                            });
                            walletForm.setValue('address', walletAddresses.bsc);
                            setIsEditWalletDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={walletAddresses.bsc} 
                          readOnly 
                          className="font-mono text-sm bg-white"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            const success = await copyToClipboard('bsc');
                            if (success) {
                              toast({
                                title: "Copied!",
                                description: "BSC wallet address copied to clipboard",
                              });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">All USDT BSC payments go to this address</p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-blue-900">USDT (TON Network)</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingWallet({
                              type: 'ton',
                              address: walletAddresses.ton
                            });
                            walletForm.setValue('address', walletAddresses.ton);
                            setIsEditWalletDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={walletAddresses.ton} 
                          readOnly 
                          className="font-mono text-sm bg-white"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            const success = await copyToClipboard('ton');
                            if (success) {
                              toast({
                                title: "Copied!",
                                description: "TON wallet address copied to clipboard",
                              });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">All USDT TON payments go to this address</p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Wallet Security Status</p>
                      <p className="text-xs text-gray-600">All wallets are cold storage addresses managed by admin</p>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Secure
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Status</CardTitle>
                <CardDescription>System health and operational metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <p className="font-medium">Database</p>
                    <p className="text-sm text-gray-600">Operational</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <p className="font-medium">Payment Gateway</p>
                    <p className="text-sm text-gray-600">Operational</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <p className="font-medium">API Services</p>
                    <p className="text-sm text-gray-600">Operational</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <p className="font-medium">Email Service</p>
                    <p className="text-sm text-gray-600">Operational</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Campaign Creation Dialog */}
        {isCampaignDialogOpen && (
          <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new campaign for creators to participate in
                </DialogDescription>
              </DialogHeader>
              <Form {...campaignForm}>
                <form 
                  onSubmit={campaignForm.handleSubmit((data) => createCampaign.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={campaignForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter campaign title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={campaignForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the campaign requirements..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={campaignForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="social-media">Social Media</SelectItem>
                            <SelectItem value="content-creation">Content Creation</SelectItem>
                            <SelectItem value="gaming">Gaming</SelectItem>
                            <SelectItem value="fitness">Health & Fitness</SelectItem>
                            <SelectItem value="technology">Technology</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={campaignForm.control}
                      name="reward"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reward ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={campaignForm.control}
                      name="totalSlots"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Slots</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createCampaign.isPending}>
                      {createCampaign.isPending ? "Creating..." : "Create Campaign"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCampaignDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit User Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col">
            <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
              <DialogTitle className="text-xl font-semibold">Edit User Profile</DialogTitle>
              <DialogDescription className="text-gray-600">
                Update user information for {selectedUser?.firstName} {selectedUser?.lastName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">First Name</Label>
                    <Input 
                      defaultValue={selectedUser?.firstName} 
                      onChange={(e) => setSelectedUser((prev: any) => ({ ...prev, firstName: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last Name</Label>
                    <Input 
                      defaultValue={selectedUser?.lastName}
                      onChange={(e) => setSelectedUser((prev: any) => ({ ...prev, lastName: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Address</Label>
                    <Input 
                      defaultValue={selectedUser?.email}
                      onChange={(e) => setSelectedUser((prev: any) => ({ ...prev, email: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <Input 
                      defaultValue={selectedUser?.phoneNumber}
                      onChange={(e) => setSelectedUser((prev: any) => ({ ...prev, phoneNumber: e.target.value }))}
                      className="h-10"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Bio Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bio</Label>
                  <Textarea 
                    defaultValue={selectedUser?.bio}
                    onChange={(e) => setSelectedUser((prev: any) => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Account Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">User Type</Label>
                    <Select 
                      defaultValue={selectedUser?.userType}
                      onValueChange={(value) => setSelectedUser((prev: any) => ({ ...prev, userType: value }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="creator">Creator</SelectItem>
                        <SelectItem value="brand">Brand</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Account Status</Label>
                    <Select 
                      defaultValue={selectedUser?.isVerified ? "verified" : "pending"}
                      onValueChange={(value) => setSelectedUser((prev: any) => ({ ...prev, isVerified: value === "verified" }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="verified">✅ Verified</SelectItem>
                        <SelectItem value="pending">⏳ Pending Verification</SelectItem>
                        <SelectItem value="suspended">❌ Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location & Wallet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location</Label>
                    <Input 
                      defaultValue={selectedUser?.location}
                      onChange={(e) => setSelectedUser((prev: any) => ({ ...prev, location: e.target.value }))}
                      className="h-10"
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Wallet Address</Label>
                    <Input 
                      defaultValue={selectedUser?.walletAddress}
                      onChange={(e) => setSelectedUser((prev: any) => ({ ...prev, walletAddress: e.target.value }))}
                      className="h-10"
                      placeholder="Enter crypto wallet address"
                    />
                  </div>
                </div>

                {/* Additional padding to ensure content is not hidden behind footer */}
                <div className="h-4"></div>
              </div>
            </div>
            
            {/* Fixed Footer */}
            <div className="flex-shrink-0 border-t bg-white p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => {
                    if (selectedUser) {
                      updateUser.mutate({ 
                        userId: selectedUser.id, 
                        updates: selectedUser 
                      });
                      setIsEditUserDialogOpen(false);
                    }
                  }}
                  disabled={updateUser.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {updateUser.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">💾</span>
                      Save Changes
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditUserDialogOpen(false)}
                  className="flex-1 border-gray-300"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Wallet Dialog */}
        <Dialog open={isEditWalletDialogOpen} onOpenChange={setIsEditWalletDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Wallet Address</DialogTitle>
              <DialogDescription>
                Update the {editingWallet?.type?.toUpperCase()} wallet address for platform payments
              </DialogDescription>
            </DialogHeader>
            <Form {...walletForm}>
              <form 
                onSubmit={walletForm.handleSubmit((data) => {
                  if (editingWallet) {
                    updateWallet.mutate({ type: editingWallet.type, address: data.address });
                  }
                })}
                className="space-y-4"
              >
                <FormField
                  control={walletForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter new wallet address" 
                          {...field} 
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-600">
                        All {editingWallet?.type?.toUpperCase()} payments will be redirected to this address
                      </p>
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={updateWallet.isPending}>
                    {updateWallet.isPending ? "Updating..." : "Update Wallet"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditWalletDialogOpen(false);
                      setEditingWallet(null);
                      walletForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}