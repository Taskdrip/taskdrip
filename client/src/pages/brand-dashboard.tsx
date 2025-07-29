import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Users, DollarSign, TrendingUp, Eye, MessageCircle, CheckCircle, 
  Clock, AlertCircle, Calendar, Star, Award, BarChart3, Target, Building2 
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  reward: string;
  totalSlots: number;
  filledSlots: number;
  deadline: string;
  status: string;
  createdAt: string;
  requirements?: string;
  estimatedTime?: string;
}

interface TaskSubmission {
  id: string;
  campaignId: string;
  userId: string;
  title: string;
  description: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  campaign?: Campaign;
  user?: { firstName: string; lastName: string; email: string };
}

interface BrandStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCreators: number;
  totalSpent: number;
  pendingSubmissions: number;
  averageRating: number;
}

const campaignSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  reward: z.number().min(1, "Reward must be at least $1"),
  totalBudget: z.number().min(10, "Total budget must be at least $10"),
  budgetPerCreator: z.number().min(5, "Budget per creator must be at least $5"),
  totalSlots: z.number().min(1, "Must have at least 1 slot"),
  deadline: z.string().min(1, "Deadline is required"),
  requirements: z.string().min(10, "Requirements must be at least 10 characters"),
  estimatedTime: z.string().min(1, "Estimated time is required"),
  featureImage: z.string().optional(),
});

export default function BrandDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<"overview" | "campaigns" | "submissions" | "creators">("overview");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);

  // Fetch brand campaigns
  const { data: campaigns = [], isLoading: campaignLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/brand", (user as any)?.id],
    retry: false,
  });

  // Fetch task submissions for brand's campaigns
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<TaskSubmission[]>({
    queryKey: ["/api/brand/submissions"],
    retry: false,
  });

  // Fetch brand statistics
  const { data: stats, isLoading: statsLoading } = useQuery<BrandStats>({
    queryKey: ["/api/brand/stats"],
    retry: false,
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: z.infer<typeof campaignSchema>) => {
      console.log("Creating campaign with data:", data);
      const res = await apiRequest("POST", "/api/campaigns", data);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return res.json();
    },
    onSuccess: (response) => {
      console.log("Campaign creation response:", response);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign draft created!",
        description: "Redirecting to escrow payment to activate your campaign.",
      });
      setIsCreateCampaignOpen(false);
      form.reset();
      
      // Redirect to escrow payment page
      setLocation(`/escrow-payment?campaignId=${response.campaignId}`);
    },
    onError: (error: Error) => {
      console.error("Campaign creation error:", error);
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve/reject submission mutations
  const approveSubmissionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/task-submissions/${id}/approve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/submissions"] });
      toast({
        title: "Submission approved!",
        description: "Payment has been processed and creator notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve submission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectSubmissionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/task-submissions/${id}/reject`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/submissions"] });
      toast({
        title: "Submission rejected",
        description: "Creator has been notified with feedback.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject submission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      reward: 10,
      totalSlots: 50,
      deadline: "",
      requirements: "",
      estimatedTime: "",
    },
  });

  const onCreateCampaign = (data: z.infer<typeof campaignSchema>) => {
    console.log("Form submission data:", data);
    console.log("Form errors:", form.formState.errors);
    createCampaignMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Brand Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {(user as any)?.firstName}! Manage your campaigns and creators.</p>
            </div>
            <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new campaign to connect with creators and grow your brand
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onCreateCampaign)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campaign Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter campaign title..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
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
                                <SelectItem value="Social Media">Social Media</SelectItem>
                                <SelectItem value="Gaming">Gaming</SelectItem>
                                <SelectItem value="Health & Fitness">Health & Fitness</SelectItem>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Fashion">Fashion</SelectItem>
                                <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                                <SelectItem value="Travel">Travel</SelectItem>
                                <SelectItem value="Education">Education</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimatedTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Time</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 30 minutes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your campaign, what creators need to do, and any specific requirements..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requirements & Guidelines</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="List specific requirements, follower counts, engagement rates, or other criteria..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="reward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reward ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                placeholder="10"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="totalSlots"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Spots</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                placeholder="50"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deadline</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createCampaignMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => console.log("Create Campaign button clicked")}
                      >
                        {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalCampaigns}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                    <p className="text-3xl font-bold text-green-600">{stats.activeCampaigns}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Creators</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalCreators}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                    <p className="text-3xl font-bold text-orange-600">${parseFloat(String(stats?.totalSpent || '0')).toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b mb-8">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "campaigns", label: "My Campaigns", icon: Target },
            { id: "submissions", label: "Submissions", icon: CheckCircle },
            { id: "creators", label: "Creators", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                selectedTab === tab.id
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "submissions" && submissions.filter(s => s.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {submissions.filter(s => s.status === 'pending').length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get started with common tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button onClick={() => setIsCreateCampaignOpen(true)} className="flex items-center gap-2 h-auto p-4">
                    <Plus className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Create Campaign</div>
                      <div className="text-xs opacity-75">Start a new campaign</div>
                    </div>
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTab("submissions")} className="flex items-center gap-2 h-auto p-4">
                    <CheckCircle className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Review Submissions</div>
                      <div className="text-xs opacity-75">Approve creator work</div>
                    </div>
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTab("creators")} className="flex items-center gap-2 h-auto p-4">
                    <Users className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">View Creators</div>
                      <div className="text-xs opacity-75">Manage your network</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>Latest work from creators</CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.slice(0, 5).map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(submission.status)}
                      <div>
                        <p className="font-medium">{submission.title}</p>
                        <p className="text-sm text-gray-600">{submission.user?.firstName} {submission.user?.lastName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(submission.submittedAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No submissions yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === "campaigns" && (
          <div className="space-y-6">
            {campaignLoading ? (
              <div className="text-center py-8">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-gray-500 mb-4">Create your first campaign to start connecting with creators</p>
                <Button onClick={() => setIsCreateCampaignOpen(true)}>Create Your First Campaign</Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{campaign.title}</CardTitle>
                          <CardDescription className="mt-2">{campaign.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{campaign.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">${campaign.reward}</p>
                          <p className="text-sm text-gray-600">Reward</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{campaign.filledSlots || 0}/{campaign.totalSlots}</p>
                          <p className="text-sm text-gray-600">Filled</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{campaign.status === 'active' ? 'Active' : 'Draft'}</p>
                          <p className="text-sm text-gray-600">Status</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {campaign.deadline ? format(new Date(campaign.deadline), "MMM d") : "No deadline"}
                          </p>
                          <p className="text-sm text-gray-600">Deadline</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/campaigns/${campaign.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Messages
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === "submissions" && (
          <div className="space-y-6">
            {submissionsLoading ? (
              <div className="text-center py-8">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                <p className="text-gray-500">Submissions will appear here when creators complete your campaigns</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <Card key={submission.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(submission.status)}
                            {submission.title}
                          </CardTitle>
                          <CardDescription>
                            By {submission.user?.firstName} {submission.user?.lastName} • {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(submission.status)}>
                          {submission.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{submission.description}</p>
                      
                      {submission.status === 'pending' && (
                        <div className="flex gap-2 pt-4 border-t">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Approve Submission</DialogTitle>
                                <DialogDescription>
                                  This will approve the submission and process payment to the creator.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea placeholder="Optional approval notes..." />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline">Cancel</Button>
                                  <Button 
                                    onClick={() => approveSubmissionMutation.mutate({ id: submission.id })}
                                    disabled={approveSubmissionMutation.isPending}
                                  >
                                    {approveSubmissionMutation.isPending ? "Processing..." : "Approve & Pay"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Submission</DialogTitle>
                                <DialogDescription>
                                  Please provide feedback so the creator can improve their work.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea 
                                  placeholder="Explain what needs to be improved..." 
                                  id={`reject-notes-${submission.id}`}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline">Cancel</Button>
                                  <Button 
                                    variant="destructive"
                                    onClick={() => {
                                      const notes = (document.getElementById(`reject-notes-${submission.id}`) as HTMLTextAreaElement)?.value;
                                      if (notes) {
                                        rejectSubmissionMutation.mutate({ id: submission.id, notes });
                                      }
                                    }}
                                    disabled={rejectSubmissionMutation.isPending}
                                  >
                                    {rejectSubmissionMutation.isPending ? "Processing..." : "Reject"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}

                      {submission.reviewNotes && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">Review Notes:</h4>
                          <p className="text-gray-700">{submission.reviewNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === "creators" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Creator Network</CardTitle>
                <CardDescription>Creators who have worked with your campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Creator Management Coming Soon</h3>
                  <p className="text-gray-500">This feature will show all creators who have participated in your campaigns</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}