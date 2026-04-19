import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Users, DollarSign, TrendingUp, Eye, MessageCircle, CheckCircle, 
  Clock, AlertCircle, Calendar, Star, Award, BarChart3, Target, Building2, Pencil,
  Briefcase, ChevronRight, Package, Coins, Upload, Trash2, PlusCircle,
  ShieldCheck, ExternalLink, Image as ImageIcon, Link2, X
} from "lucide-react";
import { format } from "date-fns";
import { useLocation, Link } from "wouter";

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
  totalAllocated: number;
  pendingSubmissions: number;
  averageRating: number;
}

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  reward: z.number().min(1, "Reward must be at least $1"),
  totalSlots: z.number().min(1, "Must have at least 1 slot"),
  deadline: z.string().min(1, "Deadline is required"),
  requirements: z.string().min(1, "Requirements are required"),
  preQualificationTask: z.string().optional(),
  qualificationRules: z.string().optional(),
  tdripPointsPerParticipant: z.number().min(0).optional(),
  tdripParticipantLimit: z.number().min(0).optional(),
  estimatedTime: z.string().min(1, "Estimated time is required"),
});

export default function BrandDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<"overview" | "campaigns" | "applications" | "submissions" | "influencers" | "direct-hires" | "task-addons">("overview");
  const [reviewingAddon, setReviewingAddon] = useState<any>(null);
  const [addonReviewNote, setAddonReviewNote] = useState("");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [showCampaignUpgrade, setShowCampaignUpgrade] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [microTaskDrafts, setMicroTaskDrafts] = useState<Record<string, any>>({});
  const [campaignTasks, setCampaignTasks] = useState<{ task: string; platform: string }[]>([{ task: "", platform: "Instagram" }]);
  const addCampaignTask = () => setCampaignTasks(prev => [...prev, { task: "", platform: "Instagram" }]);
  const removeCampaignTask = (i: number) => setCampaignTasks(prev => prev.filter((_, idx) => idx !== i));
  const updateCampaignTask = (i: number, field: "task" | "platform", value: string) =>
    setCampaignTasks(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  // Fetch brand campaigns
  const { data: campaigns = [], isLoading: campaignLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/brand", (user as any)?.id],
    retry: false,
  });

  const { data: microTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/brand/micro-tasks"],
    retry: false,
  });

  const { data: microTaskSubmissions = [], isLoading: microTaskSubmissionsLoading } = useQuery<any[]>({
    queryKey: ["/api/brand/micro-task-submissions"],
    retry: false,
  });

  // Fetch task submissions for brand's campaigns
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<TaskSubmission[]>({
    queryKey: ["/api/brand/submissions"],
    retry: false,
  });

  // Fetch campaign applications for brand's campaigns
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<any[]>({
    queryKey: ["/api/brand/applications"],
    retry: false,
  });

  // Fetch brand statistics
  const { data: stats, isLoading: statsLoading } = useQuery<BrandStats>({
    queryKey: ["/api/brand/stats"],
    retry: false,
  });

  const { data: taskAddonSubmissions = [], isLoading: addonSubsLoading } = useQuery<any[]>({
    queryKey: ["/api/seller/task-addon-submissions"],
    retry: false,
  });

  const reviewAddonMutation = useMutation({
    mutationFn: ({ id, action, reviewNote }: { id: string; action: string; reviewNote: string }) =>
      apiRequest("PATCH", `/api/task-addon-submissions/${id}/review`, { action, reviewNote }).then(r => r.json()),
    onSuccess: (_, vars) => {
      toast({ title: vars.action === "approve" ? "Task approved!" : "Task rejected", description: vars.action === "approve" ? "Points will be awarded to the user." : "User will be notified." });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/task-addon-submissions"] });
      setReviewingAddon(null);
      setAddonReviewNote("");
    },
    onError: (e: Error) => toast({ title: "Review failed", description: e.message, variant: "destructive" }),
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  // Fetch direct hire offers sent by this brand
  const { data: directHires = [], isLoading: directHiresLoading } = useQuery<any[]>({
    queryKey: ["/api/direct-hire/sent"],
    retry: false,
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: z.infer<typeof campaignSchema> & { file?: File }) => {
      console.log("Creating campaign with data:", data);
      
      if (data.file) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'file' && value !== undefined) {
            formData.append(key, typeof value === "object" ? JSON.stringify(value) : value.toString());
          }
        });
        formData.append('featureImage', data.file);
        const res = await fetch('/api/campaigns', { method: 'POST', body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: "Failed" }));
          throw Object.assign(new Error(errData.message || "Failed to create campaign"), { status: res.status, upgradeRequired: errData.upgradeRequired });
        }
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/campaigns", data);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: "Failed" }));
          throw Object.assign(new Error(errData.message || "Failed to create campaign"), { status: (res as any).status, upgradeRequired: errData.upgradeRequired });
        }
        return res.json();
      }
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
    onError: (error: any) => {
      console.error("Campaign creation error:", error);
      if (error.upgradeRequired) {
        setIsCreateCampaignOpen(false);
        setShowCampaignUpgrade(true);
      } else {
        toast({ title: "Failed to create campaign", description: error.message, variant: "destructive" });
      }
    },
  });

  const createMicroTaskMutation = useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: string; data: any }) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/micro-tasks`, {
        title: data.title,
        description: data.description,
        tdripReward: Number(data.tdripReward || 0),
        participantLimit: Number(data.participantLimit || 0),
        proofRequired: data.proofRequired !== false,
        autoApprove: !!data.autoApprove,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/micro-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setMicroTaskDrafts((prev) => ({ ...prev, [variables.campaignId]: {} }));
      toast({ title: "Micro task added", description: "$TDRIP points were escrowed from your Points Wallet." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not add micro task", description: error.message, variant: "destructive" });
    },
  });

  const updateMicroTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/micro-tasks/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/micro-tasks"] });
      toast({ title: "Micro task updated" });
    },
    onError: (error: Error) => toast({ title: "Update failed", description: error.message, variant: "destructive" }),
  });

  const reviewMicroTaskSubmissionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approved" | "rejected" }) => {
      const res = await apiRequest("PATCH", `/api/micro-task-submissions/${id}/review`, { action });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/micro-task-submissions"] });
      toast({ title: "Micro task reviewed", description: "The creator has been updated." });
    },
    onError: (error: Error) => toast({ title: "Review failed", description: error.message, variant: "destructive" }),
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
        description: "Payment has been processed and influencer notified.",
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
        description: "Influencer has been notified with feedback.",
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

  // Application approval/rejection mutations
  const approveApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/participations/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brand/stats"] });
      toast({
        title: "Application approved",
        description: "Influencer has been notified and can start working.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve application",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/participations/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/applications"] });
      toast({
        title: "Application rejected",
        description: "Influencer has been notified of the decision.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject application",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Campaign editing mutation
  const editCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof campaignSchema>> }) => {
      const res = await apiRequest("PATCH", `/api/campaigns/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign updated!",
        description: "Your campaign has been successfully updated.",
      });
      setEditingCampaign(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update campaign",
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
      preQualificationTask: "",
      qualificationRules: "First 100 qualified creators with 5,000+ followers can be accepted.",
      tdripPointsPerParticipant: 0,
      tdripParticipantLimit: 0,
    },
  });

  const watchedTdripPoints = form.watch("tdripPointsPerParticipant") || 0;
  const watchedTdripLimit = form.watch("tdripParticipantLimit") || 0;
  const tdripEscrowUsd = (watchedTdripPoints * watchedTdripLimit) / 100;
  const cashEscrowUsd = (form.watch("reward") || 0) * (form.watch("totalSlots") || 0);

  const onCreateCampaign = (data: z.infer<typeof campaignSchema>) => {
    console.log("Form submission triggered with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form valid:", form.formState.isValid);
    
    // Ensure all required fields are filled
    if (!data.title || !data.description || !data.category || !data.requirements) {
      console.error("Missing required fields");
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Get the uploaded file
    const fileInput = document.getElementById('campaign-image') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    const preQualificationTasks = campaignTasks
      .filter(t => t.task.trim())
      .map(t => ({ task: t.task.trim(), platform: t.platform, requiredProof: "Profile link or screenshot" }));
    
    createCampaignMutation.mutate({ ...data, preQualificationTasks, file } as any);
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

  const pendingApplicationsCount = (applications as any[]).filter((a: any) => a.status === "pending" || a.status === "submitted").length;
  const pendingSubmissionsCount = (submissions as any[]).filter((s: any) => s.status === "pending").length;
  const urgentCount = pendingApplicationsCount + pendingSubmissionsCount;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Brand Profile Banner ─────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden mb-6 shadow-sm border border-gray-100">
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700" />
          <div className="bg-white px-6 pb-5">
            <div className="flex items-end gap-4 -mt-10 flex-wrap">
              <div className="h-20 w-20 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-9 w-9 text-white" />
              </div>
              <div className="flex-1 min-w-0 mt-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {(user as any)?.companyName || `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim() || "Brand"}
                  </h1>
                  {(user as any)?.isVerified && <span className="text-blue-500 text-sm">✓</span>}
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs">🏢 Brand</Badge>
                  {(user as any)?.industry && <Badge variant="outline" className="text-xs">{(user as any).industry}</Badge>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {(user as any)?.website ? (user as any).website : (user as any)?.email}
                </p>
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap">
                <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-sm" data-testid="button-create-campaign">
                      <Plus className="h-4 w-4 mr-1.5" />Create Campaign
                    </Button>
                  </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Set up a new campaign to connect with influencers and grow your brand
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
                                <SelectItem value="Crypto / Blockchain">🔗 Crypto / Blockchain</SelectItem>
                                <SelectItem value="Web3 & DeFi">⛓️ Web3 & DeFi</SelectItem>
                                <SelectItem value="NFT & Digital Assets">🖼️ NFT & Digital Assets</SelectItem>
                                <SelectItem value="Social Media">📱 Social Media</SelectItem>
                                <SelectItem value="Technology">💻 Technology</SelectItem>
                                <SelectItem value="Gaming">🎮 Gaming</SelectItem>
                                <SelectItem value="Finance & Investment">💰 Finance & Investment</SelectItem>
                                <SelectItem value="Health & Fitness">💪 Health & Fitness</SelectItem>
                                <SelectItem value="Fashion & Beauty">💄 Fashion & Beauty</SelectItem>
                                <SelectItem value="Food & Beverage">🍕 Food & Beverage</SelectItem>
                                <SelectItem value="Travel">✈️ Travel</SelectItem>
                                <SelectItem value="Education">🎓 Education</SelectItem>
                                <SelectItem value="Entertainment">🎬 Entertainment</SelectItem>
                                <SelectItem value="Sports">⚽ Sports</SelectItem>
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
                              placeholder="Describe your campaign, what influencers need to do, and any specific requirements..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <label className="block text-sm font-medium mb-2">Campaign Image</label>
                      <input
                        id="campaign-image"
                        type="file"
                        accept="image/*"
                        className="w-full p-2 border rounded-md"
                      />
                      <p className="text-sm text-gray-500 mt-1">Upload an attractive image for your campaign (optional)</p>
                    </div>

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

                    <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-4 space-y-4">
                      <div>
                        <h3 className="font-semibold text-purple-950 flex items-center gap-2">
                          <Award className="h-4 w-4 text-purple-600" />
                          Pre-qualification tasks & $TDRIP add-on
                        </h3>
                        <p className="text-sm text-purple-700 mt-1">
                          Ask creators to complete a simple task before approval, then optionally reward accepted participants with $TDRIP points. 100 $TDRIP = $1.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Pre-qualification tasks</Label>
                        <div className="space-y-2">
                          {campaignTasks.map((task, i) => (
                            <div key={i} className="flex gap-2">
                              <select
                                value={task.platform}
                                onChange={e => updateCampaignTask(i, "platform", e.target.value)}
                                className="rounded-lg border border-purple-200 bg-white text-xs px-2 py-1.5 flex-shrink-0"
                              >
                                {["Instagram", "TikTok", "YouTube", "X (Twitter)", "Facebook", "Telegram", "Discord", "Other"].map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                              <input
                                value={task.task}
                                onChange={e => updateCampaignTask(i, "task", e.target.value)}
                                placeholder={`Task ${i + 1}: e.g., Follow our page and comment...`}
                                className="rounded-lg border border-purple-200 bg-white text-sm px-3 py-1.5 flex-1 min-w-0 focus:outline-none focus:border-purple-400"
                                data-testid={`input-campaign-task-${i}`}
                              />
                              {campaignTasks.length > 1 && (
                                <button type="button" onClick={() => removeCampaignTask(i)} className="text-red-400 hover:text-red-600 px-1 flex-shrink-0" title="Remove">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={addCampaignTask} className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-semibold transition-colors" data-testid="button-add-campaign-task">
                            <PlusCircle className="w-4 h-4" /> Add another task
                          </button>
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name="qualificationRules"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qualification rules</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First 100 creators with 5,000+ followers can be accepted"
                                className="bg-white"
                                data-testid="input-campaign-qualification-rules"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="tdripPointsPerParticipant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>$TDRIP per accepted participant</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="100"
                                  className="bg-white"
                                  data-testid="input-campaign-tdrip-points"
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
                          name="tdripParticipantLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>$TDRIP participant limit</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="100"
                                  className="bg-white"
                                  data-testid="input-campaign-tdrip-limit"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="rounded-lg bg-white border border-purple-100 p-3 text-sm text-purple-900 flex items-center justify-between gap-4" data-testid="text-campaign-tdrip-summary">
                        <span>$TDRIP escrow: <strong>{watchedTdripPoints * watchedTdripLimit} $TDRIP</strong> (${tdripEscrowUsd.toFixed(2)} USDT). Total: <strong>${(cashEscrowUsd + tdripEscrowUsd).toFixed(2)} USDT</strong>.</span>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-purple-500">Your balance</p>
                          <p className="font-black text-purple-900">{((user as any)?.totalPoints || 0).toLocaleString()} $TDRIP</p>
                          {((user as any)?.totalPoints || 0) < (watchedTdripPoints * watchedTdripLimit) && (
                            <Link href="/wallet" className="text-xs text-purple-600 hover:underline font-semibold">+ Top Up Wallet</Link>
                          )}
                        </div>
                      </div>
                    </div>

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
                        onClick={(e) => {
                          console.log("Create Campaign button clicked");
                          console.log("Form state:", form.formState);
                          console.log("Form values:", form.getValues());
                          
                          // Manually trigger form validation and submission
                          e.preventDefault();
                          form.handleSubmit(onCreateCampaign)();
                        }}
                      >
                        {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
                <Link href="/profile-edit">
                  <Button variant="outline" size="sm" className="text-sm" data-testid="button-brand-edit-profile">Edit Profile</Button>
                </Link>
              </div>
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Total Campaigns",  value: stats?.totalCampaigns   ?? "—", color: "text-blue-600" },
                { label: "Active Now",        value: stats?.activeCampaigns  ?? "—", color: "text-green-600" },
                { label: "Influencers Hired", value: stats?.totalCreators    ?? "—", color: "text-purple-600" },
                { label: "Total Paid Out",    value: `$${parseFloat(String(stats?.totalSpent || "0")).toFixed(2)}`, color: "text-orange-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className={`font-bold text-sm ${color}`}>{value}</p>
                  <p className="text-[10px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {urgentCount > 0 && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
            <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <p className="text-sm text-orange-800 flex-1 font-medium">
              You have <strong>{urgentCount}</strong> item{urgentCount > 1 ? "s" : ""} needing your attention
              {pendingApplicationsCount > 0 && ` (${pendingApplicationsCount} application${pendingApplicationsCount > 1 ? "s" : ""})`}
              {pendingSubmissionsCount > 0 && ` (${pendingSubmissionsCount} submission${pendingSubmissionsCount > 1 ? "s" : ""})`}.
            </p>
            <div className="flex gap-2">
              {pendingApplicationsCount > 0 && <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-xs" onClick={() => setSelectedTab("applications")}>Review</Button>}
              {pendingSubmissionsCount > 0 && <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-700" onClick={() => setSelectedTab("submissions")}>Submissions</Button>}
            </div>
          </div>
        )}

        <div className="pb-8">
        {/* Stats Cards */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Campaigns</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCampaigns}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Campaigns</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.activeCampaigns}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Influencers</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.totalCreators}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Paid Out</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">${parseFloat(String(stats?.totalSpent || '0')).toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">of ${parseFloat(String(stats?.totalAllocated || '0')).toFixed(2)} allocated</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Budget Remaining</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">
                      ${Math.max(0, parseFloat(String(stats?.totalAllocated || '0')) - parseFloat(String(stats?.totalSpent || '0'))).toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">unspent allocation</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="flex overflow-x-auto border-b border-gray-100 px-2">
            {[
              { id: "overview",     label: "Overview",      icon: BarChart3,   badge: 0 },
              { id: "campaigns",    label: "My Campaigns",  icon: Target,      badge: 0 },
              { id: "applications", label: "Applications",  icon: Users,       badge: pendingApplicationsCount },
              { id: "submissions",  label: "Submissions",   icon: CheckCircle, badge: pendingSubmissionsCount },
              { id: "task-addons",  label: "Task Addons",   icon: ShieldCheck, badge: (taskAddonSubmissions as any[]).filter((s: any) => s.status === "pending").length },
              { id: "influencers",  label: "Influencers",   icon: Users,       badge: 0 },
              { id: "direct-hires", label: "Direct Hires",  icon: Briefcase,   badge: 0 },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTab(t.id as any)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedTab === t.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                data-testid={`brand-tab-${t.id}`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.badge > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-[10px] border-0 px-1.5 h-4">{t.badge}</Badge>
                )}
              </button>
            ))}
          </div>
          <div className="p-5">

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
                      <div className="text-xs opacity-75">Approve influencer work</div>
                    </div>
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTab("influencers")} className="flex items-center gap-2 h-auto p-4">
                    <Users className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">View Influencers</div>
                      <div className="text-xs opacity-75">Manage your network</div>
                    </div>
                  </Button>
                  <Link href="/my-orders">
                    <Button variant="outline" className="flex items-center gap-2 h-auto p-4 w-full" data-testid="button-open-my-orders-brand">
                      <Package className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">My Orders</div>
                        <div className="text-xs opacity-75">View all transactions</div>
                      </div>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>Latest work from influencers</CardDescription>
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
                <p className="text-gray-500 mb-4">Create your first campaign to start connecting with influencers</p>
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" data-testid={`button-manage-micro-tasks-${campaign.id}`}>
                              <Coins className="h-4 w-4 mr-2" />
                              $TDRIP Add-ons
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Micro add-on tasks for {campaign.title}</DialogTitle>
                              <DialogDescription>
                                Escrow points from your $TDRIP Points Wallet and reward creators when they complete extra proof-based actions.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid md:grid-cols-[1fr_0.9fr] gap-5 pt-2">
                              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-bold text-violet-950">Create add-on task</p>
                                    <p className="text-xs text-violet-700">100 $TDRIP = $1. Deducted when created.</p>
                                  </div>
                                  <Badge className="bg-white text-violet-700 border border-violet-200" data-testid={`text-brand-tdrip-balance-${campaign.id}`}>
                                    {Number((user as any)?.totalPoints || 0).toLocaleString()} $TDRIP
                                  </Badge>
                                </div>
                                <Input
                                  value={microTaskDrafts[campaign.id]?.title || ""}
                                  onChange={(e) => setMicroTaskDrafts((prev) => ({ ...prev, [campaign.id]: { ...prev[campaign.id], title: e.target.value } }))}
                                  placeholder="Task title, e.g. Repost launch tweet"
                                  data-testid={`input-micro-task-title-${campaign.id}`}
                                />
                                <Textarea
                                  value={microTaskDrafts[campaign.id]?.description || ""}
                                  onChange={(e) => setMicroTaskDrafts((prev) => ({ ...prev, [campaign.id]: { ...prev[campaign.id], description: e.target.value } }))}
                                  placeholder="Briefly explain what the creator must do and what proof is required."
                                  rows={4}
                                  data-testid={`input-micro-task-description-${campaign.id}`}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Reward per creator</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={microTaskDrafts[campaign.id]?.tdripReward || ""}
                                      onChange={(e) => setMicroTaskDrafts((prev) => ({ ...prev, [campaign.id]: { ...prev[campaign.id], tdripReward: e.target.value } }))}
                                      placeholder="$TDRIP"
                                      data-testid={`input-micro-task-reward-${campaign.id}`}
                                    />
                                  </div>
                                  <div>
                                    <Label>Participant limit</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={microTaskDrafts[campaign.id]?.participantLimit || campaign.totalSlots || 1}
                                      onChange={(e) => setMicroTaskDrafts((prev) => ({ ...prev, [campaign.id]: { ...prev[campaign.id], participantLimit: e.target.value } }))}
                                      data-testid={`input-micro-task-limit-${campaign.id}`}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <label className="flex items-center gap-2 rounded-xl bg-white border border-violet-100 p-3">
                                    <input
                                      type="checkbox"
                                      checked={microTaskDrafts[campaign.id]?.proofRequired !== false}
                                      onChange={(e) => setMicroTaskDrafts((prev) => ({ ...prev, [campaign.id]: { ...prev[campaign.id], proofRequired: e.target.checked } }))}
                                      data-testid={`checkbox-micro-task-proof-${campaign.id}`}
                                    />
                                    Require proof upload
                                  </label>
                                  <label className="flex items-center gap-2 rounded-xl bg-white border border-violet-100 p-3">
                                    <input
                                      type="checkbox"
                                      checked={!!microTaskDrafts[campaign.id]?.autoApprove}
                                      onChange={(e) => setMicroTaskDrafts((prev) => ({ ...prev, [campaign.id]: { ...prev[campaign.id], autoApprove: e.target.checked } }))}
                                      data-testid={`checkbox-micro-task-auto-${campaign.id}`}
                                    />
                                    Auto approve
                                  </label>
                                </div>
                                <div className="rounded-xl bg-white border border-violet-100 p-3 text-xs text-gray-600">
                                  Escrow needed: <span className="font-bold text-violet-700" data-testid={`text-micro-task-escrow-${campaign.id}`}>
                                    {(Number(microTaskDrafts[campaign.id]?.tdripReward || 0) * Number(microTaskDrafts[campaign.id]?.participantLimit || campaign.totalSlots || 1)).toLocaleString()} $TDRIP
                                  </span>
                                </div>
                                <Button
                                  className="w-full bg-violet-600 hover:bg-violet-700"
                                  onClick={() => createMicroTaskMutation.mutate({ campaignId: campaign.id, data: microTaskDrafts[campaign.id] || {} })}
                                  disabled={createMicroTaskMutation.isPending}
                                  data-testid={`button-create-micro-task-${campaign.id}`}
                                >
                                  {createMicroTaskMutation.isPending ? "Adding..." : "Add Micro Task & Escrow $TDRIP"}
                                </Button>
                              </div>
                              <div className="space-y-3">
                                <p className="text-sm font-bold text-gray-900">Existing add-ons</p>
                                {microTasks.filter((task: any) => task.campaignId === campaign.id).length === 0 ? (
                                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-gray-500">
                                    No micro tasks yet.
                                  </div>
                                ) : (
                                  microTasks.filter((task: any) => task.campaignId === campaign.id).map((task: any) => (
                                    <div key={task.id} className="rounded-2xl border bg-white p-4 space-y-3" data-testid={`card-micro-task-${task.id}`}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-bold text-gray-900">{task.title}</p>
                                          <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                                        </div>
                                        <Badge className="bg-violet-100 text-violet-700">{task.tdripReward} $TDRIP</Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                        <span>Escrow: {Number(task.escrowedPoints || 0).toLocaleString()}</span>
                                        <span>Limit: {task.participantLimit || "Open"}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={task.autoApprove ? "default" : "outline"}
                                          className={task.autoApprove ? "bg-green-600 hover:bg-green-700" : ""}
                                          onClick={() => updateMicroTaskMutation.mutate({ id: task.id, updates: { autoApprove: !task.autoApprove } })}
                                          data-testid={`button-toggle-micro-task-auto-${task.id}`}
                                        >
                                          {task.autoApprove ? "Auto approve on" : "Manual review"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={task.isActive ? "outline" : "secondary"}
                                          onClick={() => updateMicroTaskMutation.mutate({ id: task.id, updates: { isActive: !task.isActive } })}
                                          data-testid={`button-toggle-micro-task-active-${task.id}`}
                                        >
                                          {task.isActive ? "Active" : "Paused"}
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === "applications" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Applications</CardTitle>
                <CardDescription>Manage influencer applications for your campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading applications...</p>
                    </div>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                    <p className="text-gray-500">Applications will appear here when influencers apply to your campaigns</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {applications.map((application) => (
                      <Card key={application.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                                {application.user?.firstName?.[0]}{application.user?.lastName?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Link href={`/profile/${application.user?.id}`} className="font-semibold text-lg truncate hover:text-blue-600 hover:underline transition-colors">
                                    {application.user?.firstName} {application.user?.lastName}
                                  </Link>
                                  <Badge className={`${
                                    application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    application.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                    application.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    application.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                                    'bg-red-100 text-red-800'
                                  } flex-shrink-0`}>
                                    {application.status === 'submitted' ? 'WORK SUBMITTED' :
                                     application.status === 'completed' ? 'COMPLETED & PAID' :
                                     application.status.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 mb-1 text-sm truncate">{application.user?.email}</p>
                                <p className="text-sm font-medium text-blue-600 mb-2 truncate">Campaign: {application.campaign?.title}</p>
                                <p className="text-sm text-green-600 font-medium">Reward: ${application.campaign?.reward}</p>
                                {/* Show submitted work details */}
                                {(application.submissionText || application.submissionUrl) && (
                                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Submitted Work</p>
                                    {application.submissionUrl && (
                                      <a 
                                        href={application.submissionUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all"
                                      >
                                        🔗 {application.submissionUrl}
                                      </a>
                                    )}
                                    {application.submissionText && (
                                      <p className="text-sm text-gray-700 break-words">{application.submissionText}</p>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                                  <span className="flex-shrink-0">Applied: {format(new Date(application.createdAt), 'MMM d, yyyy')}</span>
                                  {application.reviewedAt && (
                                    <span className="flex-shrink-0">Reviewed: {format(new Date(application.reviewedAt), 'MMM d, yyyy')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                              {(application.status === 'pending' || application.status === 'submitted') && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => approveApplicationMutation.mutate(application.id)}
                                    disabled={approveApplicationMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {application.status === 'submitted' ? 'Approve & Pay' : 'Approve'}
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 whitespace-nowrap">
                                        <AlertCircle className="h-4 w-4 mr-1" />
                                        Reject
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>{application.status === 'submitted' ? 'Reject Submission' : 'Reject Application'}</DialogTitle>
                                        <DialogDescription>
                                          {application.status === 'submitted'
                                            ? 'Please provide a reason for rejecting this submission. The influencer will be notified.'
                                            : 'Please provide a reason for rejecting this application'}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <Textarea 
                                          placeholder="Reason for rejection..."
                                          id={`reject-reason-${application.id}`}
                                        />
                                        <div className="flex justify-end gap-2">
                                          <DialogTrigger asChild>
                                            <Button variant="outline">Cancel</Button>
                                          </DialogTrigger>
                                          <Button
                                            onClick={() => {
                                              const textarea = document.getElementById(`reject-reason-${application.id}`) as HTMLTextAreaElement;
                                              const reason = textarea?.value || 'No reason provided';
                                              rejectApplicationMutation.mutate({ id: application.id, reason });
                                            }}
                                            disabled={rejectApplicationMutation.isPending}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            {application.status === 'submitted' ? 'Reject Submission' : 'Reject Application'}
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/messages?userId=${application.user?.id}&campaignId=${application.campaignId}`)}
                                className="whitespace-nowrap"
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Message
                              </Button>
                            </div>
                          </div>
                          {application.adminNotes && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800 font-medium">Admin Notes:</p>
                              <p className="text-sm text-yellow-700 break-words">{application.adminNotes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === "submissions" && (
          <div className="space-y-6">
            {/* Role clarity banner */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-800 text-sm">You are the primary reviewer</p>
                <p className="text-blue-600 text-xs mt-0.5">
                  Review each influencer's submitted work and approve or reject it. Approved submissions trigger automatic USDT payment to the influencer's wallet.
                  The Taskdrip admin team oversees all submissions and can mediate any disputes.
                </p>
              </div>
            </div>
            <Card className="border-violet-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-violet-600" />
                  $TDRIP Micro Task Submissions
                </CardTitle>
                <CardDescription>Approve add-on proofs manually, or turn auto-approve on from each campaign's add-on manager.</CardDescription>
              </CardHeader>
              <CardContent>
                {microTaskSubmissionsLoading ? (
                  <div className="text-center py-6 text-gray-500">Loading micro task submissions...</div>
                ) : microTaskSubmissions.length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 border border-dashed p-8 text-center">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900">No $TDRIP add-on submissions yet</p>
                    <p className="text-sm text-gray-500 mt-1">Creator proof uploads will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {microTaskSubmissions.map((submission: any) => (
                      <div key={submission.id} className="rounded-2xl border bg-white p-4" data-testid={`card-micro-task-submission-${submission.id}`}>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900">{submission.task?.title || "Micro task"}</p>
                              <Badge className={submission.status === "approved" ? "bg-green-100 text-green-700" : submission.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>
                                {submission.status?.toUpperCase()}
                              </Badge>
                              <Badge className="bg-violet-100 text-violet-700">{submission.task?.tdripReward || 0} $TDRIP</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Campaign: {submission.campaign?.title}</p>
                            <p className="text-sm text-gray-500">Creator: {submission.user?.firstName} {submission.user?.lastName} • {submission.user?.email}</p>
                            {submission.proofText && <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{submission.proofText}</p>}
                            <div className="flex gap-3 mt-2 text-sm">
                              {submission.proofUrl && <a href={submission.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View proof link</a>}
                              {submission.proofFile && <a href={submission.proofFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View uploaded proof</a>}
                            </div>
                          </div>
                          {submission.status === "pending" && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => reviewMicroTaskSubmissionMutation.mutate({ id: submission.id, action: "approved" })}
                                disabled={reviewMicroTaskSubmissionMutation.isPending}
                                data-testid={`button-approve-micro-task-submission-${submission.id}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200"
                                onClick={() => reviewMicroTaskSubmissionMutation.mutate({ id: submission.id, action: "rejected" })}
                                disabled={reviewMicroTaskSubmissionMutation.isPending}
                                data-testid={`button-reject-micro-task-submission-${submission.id}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {submissionsLoading ? (
              <div className="text-center py-8">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                <p className="text-gray-500">Submissions will appear here when influencers complete your campaigns</p>
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
                                  This will approve the submission and process payment to the influencer.
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
                                  Please provide feedback so the influencer can improve their work.
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

        {selectedTab === "influencers" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Influencer Network</CardTitle>
                <CardDescription>Influencers who have worked with your campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Influencer Management Coming Soon</h3>
                  <p className="text-gray-500">This feature will show all influencers who have participated in your campaigns</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === "direct-hires" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Direct Hire Offers</h2>
                <p className="text-gray-500 text-sm mt-1">Offers you've sent directly to influencers</p>
              </div>
              <Link href="/influencers">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Briefcase className="w-4 h-4 mr-2" /> Hire an Influencer
                </Button>
              </Link>
            </div>

            {directHiresLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : directHires.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Direct Hires Yet</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Browse influencers and send a direct hire offer to get started.</p>
                  <Link href="/influencers">
                    <Button variant="outline">Browse Influencers</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {directHires.map((hire: any) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-100 text-yellow-800",
                    accepted: "bg-blue-100 text-blue-800",
                    rejected: "bg-red-100 text-red-800",
                    payment_submitted: "bg-purple-100 text-purple-800",
                    active: "bg-green-100 text-green-800",
                    completed: "bg-gray-100 text-gray-700",
                    cancelled: "bg-gray-100 text-gray-500",
                  };
                  const statusLabels: Record<string, string> = {
                    pending: "Pending",
                    accepted: "Accepted — Pay Now",
                    rejected: "Declined",
                    payment_submitted: "Under Review",
                    active: "Active 🚀",
                    completed: "Completed ✅",
                    cancelled: "Cancelled",
                  };
                  return (
                    <Card key={hire.id} className="hover:shadow-md transition-shadow" data-testid={`card-direct-hire-${hire.id}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 truncate">{hire.title}</h3>
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColors[hire.status] || "bg-gray-100 text-gray-600"}`}>
                                {statusLabels[hire.status] || hire.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              To: {hire.influencer?.firstName} {hire.influencer?.lastName}
                              {hire.influencer?.username && <span className="text-gray-400"> @{hire.influencer.username}</span>}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="font-semibold text-green-700 text-sm">${Number(hire.budget).toFixed(2)} USDT</span>
                              {hire.deadline && <span>Due {format(new Date(hire.deadline), "MMM d, yyyy")}</span>}
                              <span>{format(new Date(hire.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                          <Link href={`/direct-hire/${hire.id}`}>
                            <Button size="sm" variant={hire.status === 'accepted' ? 'default' : 'outline'} className={hire.status === 'accepted' ? 'bg-green-600 hover:bg-green-700' : ''} data-testid={`button-view-hire-${hire.id}`}>
                              {hire.status === 'accepted' ? 'Pay Now' : 'View'}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === "task-addons" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" /> Task Addon Submissions</h2>
                <p className="text-gray-500 text-sm mt-1">Review proof submitted by users for task addons on your P2P listings</p>
              </div>
            </div>

            {addonSubsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}</div>
            ) : (taskAddonSubmissions as any[]).length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <ShieldCheck className="h-14 w-14 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No task addon submissions yet</h3>
                  <p className="text-gray-500 text-sm">When users complete tasks on your P2P listings, their proof will appear here for review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(taskAddonSubmissions as any[]).map((sub: any) => (
                  <Card key={sub.id} className={`border shadow-sm ${sub.status === "pending" ? "border-blue-200 bg-blue-50/30" : sub.status === "approved" ? "border-green-200 bg-green-50/20" : "border-red-200 bg-red-50/20"}`} data-testid={`card-addon-sub-${sub.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge className={sub.status === "pending" ? "bg-yellow-100 text-yellow-800" : sub.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {sub.status}
                            </Badge>
                            {sub.listingTitle && <span className="text-xs text-gray-500 font-medium">Listing: {sub.listingTitle}</span>}
                            <span className="text-xs text-gray-400">Task #{(sub.taskIndex || 0) + 1}</span>
                          </div>
                          {sub.taskDescription && <p className="text-sm text-gray-700 mb-2 font-medium">{sub.taskDescription}</p>}
                          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                            {sub.proofUrl && (
                              <a href={sub.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline font-semibold">
                                <Link2 className="w-3.5 h-3.5" /> View Proof Link
                              </a>
                            )}
                            {sub.proofScreenshot && (
                              <a href={sub.proofScreenshot} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline font-semibold">
                                <ImageIcon className="w-3.5 h-3.5" /> View Screenshot
                              </a>
                            )}
                          </div>
                          {sub.proofNote && <p className="text-xs text-gray-600 mt-1.5 bg-white rounded-lg px-2 py-1 border border-gray-100">{sub.proofNote}</p>}
                          {sub.reviewNote && <p className="text-xs text-gray-500 mt-1 italic">Review note: {sub.reviewNote}</p>}
                        </div>
                        {sub.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-8" onClick={() => setReviewingAddon(sub)} data-testid={`button-review-addon-${sub.id}`}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Review
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

          </div>
        </div>
      </div>
      </div>
      
      <Footer />

      {reviewingAddon && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" data-testid="modal-review-addon">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Review Task Submission</h3>
              <button onClick={() => setReviewingAddon(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-700 font-medium">{reviewingAddon.taskDescription}</p>
              {reviewingAddon.proofUrl && (
                <a href={reviewingAddon.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <ExternalLink className="w-4 h-4" /> Open Proof Link
                </a>
              )}
              {reviewingAddon.proofScreenshot && (
                <img src={reviewingAddon.proofScreenshot} alt="Proof screenshot" className="w-full rounded-xl border border-gray-200 max-h-48 object-cover" />
              )}
              {reviewingAddon.proofNote && <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border">{reviewingAddon.proofNote}</p>}
            </div>
            <div className="mb-4">
              <Label className="text-sm font-semibold mb-1.5 block">Review Note (optional)</Label>
              <textarea
                value={addonReviewNote}
                onChange={e => setAddonReviewNote(e.target.value)}
                rows={2}
                placeholder="Add a note for the user..."
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                data-testid="input-addon-review-note"
              />
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 font-bold" onClick={() => reviewAddonMutation.mutate({ id: reviewingAddon.id, action: "approve", reviewNote: addonReviewNote })} disabled={reviewAddonMutation.isPending} data-testid="button-approve-addon">
                <CheckCircle className="w-4 h-4 mr-1.5" /> {reviewAddonMutation.isPending ? "..." : "Approve & Award Points"}
              </Button>
              <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 font-bold" onClick={() => reviewAddonMutation.mutate({ id: reviewingAddon.id, action: "reject", reviewNote: addonReviewNote })} disabled={reviewAddonMutation.isPending} data-testid="button-reject-addon">
                <X className="w-4 h-4 mr-1.5" /> {reviewAddonMutation.isPending ? "..." : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Upgrade Gate Dialog */}
      <Dialog open={showCampaignUpgrade} onOpenChange={setShowCampaignUpgrade}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              🚀 Campaign Limit Reached
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-gray-600 text-sm leading-relaxed">
              Free brand accounts can post up to <strong>3 campaigns</strong>. Upgrade to Premium to post unlimited campaigns and unlock direct influencer hiring.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between bg-gray-50 rounded-xl px-4 py-2"><span className="text-gray-500">Free Brand</span><span className="font-bold text-gray-700">3 campaigns, no direct hire</span></div>
              <div className="flex justify-between bg-purple-50 rounded-xl px-4 py-2 border border-purple-200"><span className="text-purple-700 font-semibold">Monthly Brand Premium</span><span className="font-bold text-purple-800">Unlimited + Direct Hire</span></div>
              <div className="flex justify-between bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl px-4 py-2 border border-yellow-200"><span className="text-yellow-700 font-semibold">Yearly Brand Premium</span><span className="font-bold text-yellow-800">Best value · All features</span></div>
            </div>
            <Link href="/subscription">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl py-3" data-testid="button-brand-upgrade">
                Upgrade Brand Account
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}