import { useState, useEffect } from "react";
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
  Plus, Users, DollarSign, TrendingUp, Eye, MessageCircle, CheckCircle, ChevronDown, ChevronUp, 
  Clock, AlertCircle, Calendar, Star, Award, BarChart3, Target, Building2, Pencil,
  Briefcase, ChevronRight, Package, Coins, Upload, Trash2, PlusCircle,
  ShieldCheck, ExternalLink, Image as ImageIcon, Link2, X, Wallet, Lock, Undo2, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useLocation, Link } from "wouter";
import { WelcomeCampaign } from "@/components/ui/welcome-campaign";
import { DashboardSpotlight } from "@/components/DashboardSpotlight";
import { InlineTdripTopup } from "@/components/InlineTdripTopup";

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
  const [selectedTab, setSelectedTab] = useState<"overview" | "campaigns" | "applications" | "submissions" | "influencers" | "direct-hires" | "task-addons" | "escrow">("overview");
  const [reviewingAddon, setReviewingAddon] = useState<any>(null);
  const [addonReviewNote, setAddonReviewNote] = useState("");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [showCampaignUpgrade, setShowCampaignUpgrade] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [microTaskDrafts, setMicroTaskDrafts] = useState<Record<string, any>>({});
  const [editingMicroTask, setEditingMicroTask] = useState<any | null>(null);
  const [editMicroTaskForm, setEditMicroTaskForm] = useState<any>({});
  const [expandedApplications, setExpandedApplications] = useState<Record<string, boolean>>({});
  type CampaignTaskDraft = {
    task: string;
    platform: string;
    actionUrl: string;
    autoApprove: boolean;
    proofRequired: boolean;
  };
  const blankCampaignTask = (): CampaignTaskDraft => ({
    task: "",
    platform: "Instagram",
    actionUrl: "",
    autoApprove: false,
    proofRequired: true,
  });
  const [campaignTasks, setCampaignTasks] = useState<CampaignTaskDraft[]>([blankCampaignTask()]);
  const addCampaignTask = () => setCampaignTasks(prev => [...prev, blankCampaignTask()]);
  const removeCampaignTask = (i: number) => setCampaignTasks(prev => prev.filter((_, idx) => idx !== i));
  const updateCampaignTask = <K extends keyof CampaignTaskDraft>(i: number, field: K, value: CampaignTaskDraft[K]) =>
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
        actionUrl: data.actionUrl || "",
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

  // Campaign editing mutation — supports JSON or FormData (for featured image upload)
  const editCampaignMutation = useMutation({
    mutationFn: async ({ id, data, file }: { id: string; data: Record<string, any>; file?: File | null }) => {
      if (file) {
        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          formData.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
        });
        formData.append("featureImage", file);
        const res = await fetch(`/api/campaigns/${id}`, { method: "PATCH", body: formData, credentials: "include" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Update failed" }));
          throw new Error(err.message || "Update failed");
        }
        return res.json();
      }
      const res = await apiRequest("PATCH", `/api/campaigns/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/brand"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign updated!", description: "Your campaign has been successfully updated." });
      setEditingCampaign(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update campaign", description: error.message, variant: "destructive" });
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
      .map(t => ({
        task: t.task.trim(),
        platform: t.platform,
        actionUrl: t.actionUrl.trim() || undefined,
        autoApprove: !!t.autoApprove,
        proofRequired: !!t.proofRequired,
        requiredProof: t.proofRequired ? "Profile link or screenshot" : undefined,
      }));
    
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
                        <div className="space-y-3">
                          {campaignTasks.map((task, i) => (
                            <div key={i} className="rounded-lg border border-purple-200 bg-white p-3 space-y-2" data-testid={`card-campaign-task-${i}`}>
                              <div className="flex gap-2">
                                <select
                                  value={task.platform}
                                  onChange={e => updateCampaignTask(i, "platform", e.target.value)}
                                  className="rounded-lg border border-purple-200 bg-white text-xs px-2 py-1.5 flex-shrink-0"
                                  data-testid={`select-campaign-task-platform-${i}`}
                                >
                                  {["Instagram", "TikTok", "YouTube", "X (Twitter)", "Facebook", "Telegram", "Discord", "Website", "Other"].map(p => (
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
                              <input
                                type="url"
                                value={task.actionUrl}
                                onChange={e => updateCampaignTask(i, "actionUrl", e.target.value)}
                                placeholder="Action link (https://...) — where the creator goes to perform this task"
                                className="rounded-lg border border-purple-200 bg-white text-sm px-3 py-1.5 w-full focus:outline-none focus:border-purple-400"
                                data-testid={`input-campaign-task-url-${i}`}
                              />
                              <div className="flex flex-wrap items-center gap-4 text-xs text-purple-900">
                                <label className="flex items-center gap-2 cursor-pointer" data-testid={`label-campaign-task-auto-approve-${i}`}>
                                  <input
                                    type="checkbox"
                                    checked={task.autoApprove}
                                    onChange={e => {
                                      const checked = e.target.checked;
                                      updateCampaignTask(i, "autoApprove", checked);
                                      if (checked) updateCampaignTask(i, "proofRequired", false);
                                    }}
                                    className="h-4 w-4 accent-purple-600"
                                    data-testid={`input-campaign-task-auto-approve-${i}`}
                                  />
                                  <span>Auto approve (no review)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer" data-testid={`label-campaign-task-proof-${i}`}>
                                  <input
                                    type="checkbox"
                                    checked={task.proofRequired}
                                    onChange={e => {
                                      const checked = e.target.checked;
                                      updateCampaignTask(i, "proofRequired", checked);
                                      if (checked) updateCampaignTask(i, "autoApprove", false);
                                    }}
                                    className="h-4 w-4 accent-purple-600"
                                    data-testid={`input-campaign-task-proof-${i}`}
                                  />
                                  <span>Require proof upload (you review)</span>
                                </label>
                              </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  data-testid="button-brand-logout"
                  onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/"; })}
                >
                  Log Out
                </Button>
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

        {/* Spotlight & Featured */}
        <div className="mb-5">
          <DashboardSpotlight page="brand_dashboard" />
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
              { id: "escrow",       label: "Bounty Escrow", icon: Wallet,      badge: 0 },
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
            {/* Welcome Mission */}
            <WelcomeCampaign variant="brand" />

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
                  <Link href="/short-links">
                    <Button variant="outline" className="flex items-center gap-2 h-auto p-4 w-full" data-testid="button-open-short-links-brand">
                      <Plus className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">URL Shortener</div>
                        <div className="text-xs opacity-75">Track promo links & clicks</div>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/security">
                    <Button variant="outline" className="flex items-center gap-2 h-auto p-4 w-full" data-testid="button-open-security-brand">
                      <CheckCircle className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Security & 2FA</div>
                        <div className="text-xs opacity-75">Protect your account</div>
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
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/campaigns/${campaign.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingCampaign(campaign)} data-testid={`button-edit-campaign-${campaign.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
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
                                <div className="rounded-lg border-2 border-violet-300 bg-white p-3 space-y-2">
                                  <div className="flex items-start gap-2">
                                    <Link2 className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <Label className="text-sm font-bold text-violet-900 block">
                                        Action URL <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5 border-violet-300 text-violet-700">RECOMMENDED</Badge>
                                      </Label>
                                      <p className="text-[11px] text-violet-700 mt-0.5">
                                        Paste the link creators must open (your tweet, channel, page, etc). When auto-approve is on, they tap the link, then confirm — and $TDRIP is awarded instantly.
                                      </p>
                                    </div>
                                  </div>
                                  <Input
                                    type="url"
                                    value={microTaskDrafts[campaign.id]?.actionUrl || ""}
                                    onChange={(e) => setMicroTaskDrafts((prev) => ({ ...prev, [campaign.id]: { ...prev[campaign.id], actionUrl: e.target.value } }))}
                                    placeholder="https://twitter.com/yourhandle/status/123…"
                                    className="border-violet-200"
                                    data-testid={`input-micro-task-action-url-${campaign.id}`}
                                  />
                                </div>
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
                                {(() => {
                                  const escrowNeeded = Number(microTaskDrafts[campaign.id]?.tdripReward || 0) * Number(microTaskDrafts[campaign.id]?.participantLimit || campaign.totalSlots || 1);
                                  const balance = Number((user as any)?.totalPoints || 0);
                                  const shortfall = Math.max(0, escrowNeeded - balance);
                                  const insufficient = escrowNeeded > 0 && shortfall > 0;
                                  return (
                                    <>
                                      <div className={`rounded-xl border p-3 text-xs ${insufficient ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-white border-violet-100 text-gray-600"}`}>
                                        <div className="flex items-center justify-between">
                                          <span>Escrow needed</span>
                                          <span className="font-bold text-violet-700" data-testid={`text-micro-task-escrow-${campaign.id}`}>
                                            {escrowNeeded.toLocaleString()} $TDRIP
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                          <span>Wallet balance</span>
                                          <span className="font-semibold">{balance.toLocaleString()} $TDRIP</span>
                                        </div>
                                        {insufficient && (
                                          <div className="mt-2 pt-2 border-t border-amber-200">
                                            <p className="font-semibold text-amber-900 mb-2">
                                              You need <b>{shortfall.toLocaleString()} more $TDRIP</b> to escrow this task.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      {insufficient && (
                                        <InlineTdripTopup
                                          suggestedPoints={shortfall}
                                          testIdPrefix={`micro-task-topup-${campaign.id}`}
                                        />
                                      )}
                                      <Button
                                        className="w-full bg-violet-600 hover:bg-violet-700"
                                        onClick={() => createMicroTaskMutation.mutate({ campaignId: campaign.id, data: microTaskDrafts[campaign.id] || {} })}
                                        disabled={createMicroTaskMutation.isPending || insufficient}
                                        data-testid={`button-create-micro-task-${campaign.id}`}
                                      >
                                        {createMicroTaskMutation.isPending
                                          ? "Adding..."
                                          : insufficient
                                            ? `Need ${shortfall.toLocaleString()} more $TDRIP`
                                            : "Add Micro Task & Escrow $TDRIP"}
                                      </Button>
                                    </>
                                  );
                                })()}
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
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-gray-900 truncate">{task.title}</p>
                                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                          {task.actionUrl && (
                                            <a href={task.actionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline mt-1 inline-flex items-center gap-1 truncate max-w-full">
                                              <Link2 className="h-3 w-3" /> {task.actionUrl}
                                            </a>
                                          )}
                                        </div>
                                        <Badge className="bg-violet-100 text-violet-700 flex-shrink-0">{task.tdripReward} $TDRIP</Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                        <span>Escrow: {Number(task.escrowedPoints || 0).toLocaleString()}</span>
                                        <span>Limit: {task.participantLimit || "Open"}</span>
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-violet-300 text-violet-700 hover:bg-violet-50"
                                          onClick={() => {
                                            setEditingMicroTask(task);
                                            setEditMicroTaskForm({
                                              title: task.title || "",
                                              description: task.description || "",
                                              actionUrl: task.actionUrl || "",
                                              tdripReward: task.tdripReward || 0,
                                              participantLimit: task.participantLimit || 1,
                                              proofRequired: task.proofRequired !== false,
                                              autoApprove: !!task.autoApprove,
                                            });
                                          }}
                                          data-testid={`button-edit-micro-task-${task.id}`}
                                        >
                                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                                        </Button>
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
                    {applications.map((application) => {
                      const participantSubs = (microTaskSubmissions || []).filter(
                        (s: any) => s.userId === application.user?.id && s.campaignId === application.campaignId
                      );
                      const isExpanded = !!expandedApplications[application.id];
                      const avatarUrl = (application.user as any)?.profileImageUrl;
                      const initials = `${application.user?.firstName?.[0] || ''}${application.user?.lastName?.[0] || ''}`;
                      return (
                      <Card key={application.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={`${application.user?.firstName || ''}`}
                                  className="h-12 w-12 rounded-full object-cover flex-shrink-0 border border-gray-200"
                                  data-testid={`img-avatar-${application.id}`}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0" data-testid={`img-avatar-${application.id}`}>
                                  {initials}
                                </div>
                              )}
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
                                data-testid={`button-message-applicant-${application.id}`}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Message
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/profile/${application.user?.id}`)}
                                className="whitespace-nowrap"
                                data-testid={`button-view-profile-${application.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Profile
                              </Button>
                            </div>
                          </div>
                          {application.adminNotes && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800 font-medium">Admin Notes:</p>
                              <p className="text-sm text-yellow-700 break-words">{application.adminNotes}</p>
                            </div>
                          )}
                          <div className="mt-4 border-t pt-3">
                            <button
                              type="button"
                              onClick={() => setExpandedApplications((prev) => ({ ...prev, [application.id]: !prev[application.id] }))}
                              className="w-full flex items-center justify-between text-left text-sm font-medium text-violet-700 hover:text-violet-900"
                              data-testid={`button-toggle-addons-${application.id}`}
                            >
                              <span className="flex items-center gap-2">
                                <Coins className="h-4 w-4" />
                                Add-on submissions
                                <Badge variant="outline" className="ml-1 text-xs" data-testid={`badge-addon-count-${application.id}`}>
                                  {participantSubs.length}
                                </Badge>
                              </span>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            {isExpanded && (
                              <div className="mt-3 space-y-2" data-testid={`section-addon-list-${application.id}`}>
                                {participantSubs.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic px-2 py-3 bg-gray-50 rounded">
                                    This influencer hasn't submitted any add-on tasks for this campaign yet.
                                  </p>
                                ) : (
                                  participantSubs.map((sub: any) => (
                                    <div key={sub.id} className="border border-violet-100 bg-violet-50/50 rounded-lg p-3 space-y-2" data-testid={`row-addon-sub-${sub.id}`}>
                                      <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-violet-900 truncate">{sub.task?.title || "Add-on task"}</p>
                                          <p className="text-xs text-violet-700">
                                            Reward: {sub.task?.tdripReward ?? "—"} $TDRIP
                                          </p>
                                        </div>
                                        <Badge className={
                                          sub.status === "approved" ? "bg-green-100 text-green-800" :
                                          sub.status === "rejected" ? "bg-red-100 text-red-800" :
                                          "bg-yellow-100 text-yellow-800"
                                        }>
                                          {sub.status}
                                        </Badge>
                                      </div>
                                      {sub.proofUrl && (
                                        <a
                                          href={sub.proofUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-xs text-blue-700 hover:underline break-all"
                                          data-testid={`link-addon-proof-${sub.id}`}
                                        >
                                          <ExternalLink className="h-3 w-3 flex-shrink-0" /> {sub.proofUrl}
                                        </a>
                                      )}
                                      {sub.proofText && (
                                        <p className="text-xs text-gray-700 break-words bg-white rounded px-2 py-1 border">{sub.proofText}</p>
                                      )}
                                      {sub.proofImageUrl && (
                                        <img src={sub.proofImageUrl} alt="proof" className="max-h-32 rounded border" data-testid={`img-addon-proof-${sub.id}`} />
                                      )}
                                      {sub.status === "pending" && (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                            onClick={() => reviewMicroTaskSubmissionMutation.mutate({ id: sub.id, action: "approved" })}
                                            disabled={reviewMicroTaskSubmissionMutation.isPending}
                                            data-testid={`button-approve-addon-${sub.id}`}
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-7"
                                            onClick={() => reviewMicroTaskSubmissionMutation.mutate({ id: sub.id, action: "rejected" })}
                                            disabled={reviewMicroTaskSubmissionMutation.isPending}
                                            data-testid={`button-reject-addon-${sub.id}`}
                                          >
                                            Reject
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
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
          <InfluencerNetworkPanel />
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

        {selectedTab === "escrow" && <BountyEscrowPanel />}

          </div>
        </div>
      </div>
      </div>
      
      <Footer />

      <EditCampaignDialog
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        isSubmitting={editCampaignMutation.isPending}
        onSubmit={(data, file) => editingCampaign && editCampaignMutation.mutate({ id: editingCampaign.id, data, file })}
      />

      {/* Edit micro-task dialog */}
      <Dialog open={!!editingMicroTask} onOpenChange={(o) => !o && setEditingMicroTask(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-micro-task">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-violet-600" /> Edit micro task</DialogTitle>
            <DialogDescription>
              Changes to reward or limit will adjust your $TDRIP escrow automatically (debiting more or refunding the difference).
            </DialogDescription>
          </DialogHeader>
          {editingMicroTask && (
            <div className="space-y-3 pt-1">
              <div>
                <Label>Title</Label>
                <Input
                  value={editMicroTaskForm.title || ""}
                  onChange={(e) => setEditMicroTaskForm((f: any) => ({ ...f, title: e.target.value }))}
                  data-testid="input-edit-micro-task-title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editMicroTaskForm.description || ""}
                  onChange={(e) => setEditMicroTaskForm((f: any) => ({ ...f, description: e.target.value }))}
                  data-testid="input-edit-micro-task-description"
                />
              </div>
              <div>
                <Label>Action URL <span className="text-xs text-gray-500 font-normal">(optional)</span></Label>
                <Input
                  type="url"
                  value={editMicroTaskForm.actionUrl || ""}
                  onChange={(e) => setEditMicroTaskForm((f: any) => ({ ...f, actionUrl: e.target.value }))}
                  placeholder="https://…"
                  data-testid="input-edit-micro-task-action-url"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Reward per creator ($TDRIP)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editMicroTaskForm.tdripReward || ""}
                    onChange={(e) => setEditMicroTaskForm((f: any) => ({ ...f, tdripReward: e.target.value }))}
                    data-testid="input-edit-micro-task-reward"
                  />
                </div>
                <div>
                  <Label>Participant limit</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editMicroTaskForm.participantLimit || ""}
                    onChange={(e) => setEditMicroTaskForm((f: any) => ({ ...f, participantLimit: e.target.value }))}
                    data-testid="input-edit-micro-task-limit"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-100 p-3">
                  <input
                    type="checkbox"
                    checked={!!editMicroTaskForm.proofRequired}
                    onChange={(e) => setEditMicroTaskForm((f: any) => ({ ...f, proofRequired: e.target.checked }))}
                    data-testid="checkbox-edit-micro-task-proof"
                  />
                  Require proof upload
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-100 p-3">
                  <input
                    type="checkbox"
                    checked={!!editMicroTaskForm.autoApprove}
                    onChange={(e) => setEditMicroTaskForm((f: any) => ({ ...f, autoApprove: e.target.checked }))}
                    data-testid="checkbox-edit-micro-task-auto"
                  />
                  Auto approve
                </label>
              </div>
              {(() => {
                const newReward = Number(editMicroTaskForm.tdripReward || 0);
                const newLimit = Number(editMicroTaskForm.participantLimit || 0);
                const newEscrow = newReward * newLimit;
                const oldEscrow = Number(editingMicroTask.escrowedPoints || (editingMicroTask.tdripReward * editingMicroTask.participantLimit) || 0);
                const delta = newEscrow - oldEscrow;
                return (
                  <div className={`rounded-xl border p-3 text-xs ${delta > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : delta < 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                    New escrow: <b>{newEscrow.toLocaleString()} $TDRIP</b>
                    {delta > 0 && <> — debit additional <b>{delta.toLocaleString()} $TDRIP</b> from your wallet on save.</>}
                    {delta < 0 && <> — refund <b>{Math.abs(delta).toLocaleString()} $TDRIP</b> back to your wallet on save.</>}
                    {delta === 0 && <> — no change to escrow.</>}
                  </div>
                );
              })()}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingMicroTask(null)}>Cancel</Button>
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  disabled={updateMicroTaskMutation.isPending}
                  onClick={() => {
                    updateMicroTaskMutation.mutate(
                      { id: editingMicroTask.id, updates: editMicroTaskForm },
                      { onSuccess: () => setEditingMicroTask(null) }
                    );
                  }}
                  data-testid="button-save-edit-micro-task"
                >
                  {updateMicroTaskMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

function BountyEscrowPanel() {
  const { toast } = useToast();
  const { data: overview, isLoading } = useQuery<{
    campaigns: any[];
    totals: { totalEscrow: number; paidOut: number; refunded: number; available: number; refundableAmount: number };
  }>({ queryKey: ["/api/brand/escrow-overview"] });

  const refundMut = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/refund-escrow`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Escrow refunded", description: `$${data.refundedNow?.toFixed(2)} returned to your wallet balance.` });
      queryClient.invalidateQueries({ queryKey: ["/api/brand/escrow-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (e: any) => toast({ title: "Refund failed", description: e.message, variant: "destructive" }),
  });

  const fmt = (n: number) => `$${(n || 0).toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
      </div>
    );
  }

  const campaigns = overview?.campaigns ?? [];
  const totals = overview?.totals ?? { totalEscrow: 0, paidOut: 0, refunded: 0, available: 0, refundableAmount: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-violet-600" /> Bounty Escrow</h2>
        <p className="text-gray-500 text-sm mt-1">Funds you've deposited per campaign. Released to creators on approval; unused balance refundable when a campaign closes.</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-testid="escrow-total-deposited">
          <div className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-1"><Lock className="w-3 h-3" /> Total Deposited</div>
          <div className="text-2xl font-black mt-1.5 text-gray-900">{fmt(totals.totalEscrow)}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm" data-testid="escrow-total-paid">
          <div className="text-xs uppercase text-emerald-700 font-bold tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid to Creators</div>
          <div className="text-2xl font-black mt-1.5 text-emerald-700">{fmt(totals.paidOut)}</div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm" data-testid="escrow-total-locked">
          <div className="text-xs uppercase text-violet-700 font-bold tracking-wider flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Currently Locked</div>
          <div className="text-2xl font-black mt-1.5 text-violet-700">{fmt(totals.available)}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm" data-testid="escrow-total-refundable">
          <div className="text-xs uppercase text-amber-700 font-bold tracking-wider flex items-center gap-1"><Undo2 className="w-3 h-3" /> Refundable Now</div>
          <div className="text-2xl font-black mt-1.5 text-amber-700">{fmt(totals.refundableAmount)}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-testid="escrow-total-refunded">
          <div className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-1"><Undo2 className="w-3 h-3" /> Already Refunded</div>
          <div className="text-2xl font-black mt-1.5 text-gray-900">{fmt(totals.refunded)}</div>
        </div>
      </div>

      {/* Per-campaign list */}
      {campaigns.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Wallet className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No campaigns with escrow yet</h3>
            <p className="text-gray-500 text-sm">Once you create and fund a campaign, escrow status will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const pct = c.totalEscrow > 0 ? Math.min(100, Math.round(((c.paidOut + c.refunded) / c.totalEscrow) * 100)) : 0;
            return (
              <Card key={c.campaignId} className={`border ${c.refundable ? "border-amber-200" : "border-gray-100"} shadow-sm`} data-testid={`escrow-row-${c.campaignId}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-bold text-gray-900 truncate" data-testid={`escrow-title-${c.campaignId}`}>{c.title}</h4>
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        {c.refundable && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">Refund available</Badge>}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                        <span><b className="text-gray-700">{c.completedCount}</b>/{c.totalSlots} paid</span>
                        <span><b className="text-gray-700">{c.pendingCount}</b> pending</span>
                        <span><b className="text-gray-700">{c.rejectedCount}</b> rejected</span>
                        <span>·  Reward: <b className="text-gray-700">{fmt(c.reward)}</b></span>
                        {c.deadline && <span>· Deadline {format(new Date(c.deadline), "MMM d")}</span>}
                      </div>
                      <div className="mt-3">
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-violet-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                          <span>{fmt(c.paidOut)} paid + {fmt(c.refunded)} refunded</span>
                          <span>of {fmt(c.totalEscrow)} deposited</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 lg:w-56">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-violet-600">Locked in escrow</div>
                        <div className="text-2xl font-black text-violet-700" data-testid={`escrow-locked-${c.campaignId}`}>{fmt(c.available)}</div>
                      </div>
                      <Button
                        size="sm"
                        disabled={!c.refundable || refundMut.isPending}
                        onClick={() => { if (confirm(`Refund ${fmt(c.available)} of unused escrow back to your wallet?`)) refundMut.mutate(c.campaignId); }}
                        className={c.refundable ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                        variant={c.refundable ? "default" : "outline"}
                        data-testid={`btn-refund-${c.campaignId}`}
                      >
                        {refundMut.isPending && refundMut.variables === c.campaignId ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Refunding...</>
                        ) : (
                          <><Undo2 className="w-3.5 h-3.5 mr-1.5" /> {c.refundable ? "Refund unused" : "Locked until close"}</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ── Edit Campaign Dialog ─────────────────────────────────────────────────────
function EditCampaignDialog({
  campaign,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onSubmit: (data: any, file?: File | null) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    requirements: "",
    estimatedTime: "",
    deadline: "",
    qualificationRules: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      setForm({
        title: campaign.title || "",
        description: campaign.description || "",
        category: campaign.category || "",
        requirements: campaign.requirements || "",
        estimatedTime: (campaign as any).estimatedTime || "",
        deadline: campaign.deadline ? new Date(campaign.deadline).toISOString().slice(0, 10) : "",
        qualificationRules: (campaign as any).qualificationRules || "",
      });
      setPreview((campaign as any).featureImage || null);
      setFile(null);
    }
  }, [campaign]);

  if (!campaign) return null;

  return (
    <Dialog open={!!campaign} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-blue-600" /> Edit Campaign</DialogTitle>
          <DialogDescription>Update campaign details and featured image. Reward and slots can only be changed by an admin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-edit-campaign-title" />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="input-edit-campaign-category" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-edit-campaign-description" />
          </div>
          <div>
            <Label>Requirements</Label>
            <Textarea rows={3} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} data-testid="input-edit-campaign-requirements" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimated Time</Label>
              <Input value={form.estimatedTime} onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })} placeholder="e.g. 30 minutes" data-testid="input-edit-campaign-time" />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} data-testid="input-edit-campaign-deadline" />
            </div>
          </div>
          <div>
            <Label>Qualification rules</Label>
            <Input value={form.qualificationRules} onChange={(e) => setForm({ ...form, qualificationRules: e.target.value })} data-testid="input-edit-campaign-qualification" />
          </div>
          <div>
            <Label>Featured Image</Label>
            <div className="flex gap-3 items-start mt-1">
              {preview && (
                <img src={preview} alt="preview" className="h-24 w-32 object-cover rounded-lg border" />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="w-full p-2 border rounded-md text-sm"
                  data-testid="input-edit-campaign-image"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f) setPreview(URL.createObjectURL(f));
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">JPG / PNG. Replaces the existing image.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-sm text-violet-900 flex items-start gap-2">
            <Coins className="h-4 w-4 text-violet-600 mt-0.5" />
            <div>
              <p className="font-semibold">Need to add micro-tasks?</p>
              <p className="text-xs mt-0.5">Close this dialog and click <span className="font-bold">$TDRIP Add-ons</span> on the campaign card to add or pause add-on tasks. Each add-on locks $TDRIP from your wallet and is auto-distributed to creators when their proof is approved.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
              onClick={() => onSubmit(form, file)}
              data-testid="button-save-edit-campaign"
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Influencer Network Panel ─────────────────────────────────────────────────
function InfluencerNetworkPanel() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "campaigns" | "earned" | "rate">("recent");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const { data: network = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/brand/influencer-network"],
  });

  const filtered = (network as any[])
    .filter((i) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const name = `${i.firstName || ""} ${i.lastName || ""} ${i.email || ""}`.toLowerCase();
      return name.includes(s);
    })
    .sort((a, b) => {
      if (sortBy === "campaigns") return b.campaignsCount - a.campaignsCount;
      if (sortBy === "earned") return parseFloat(b.cashEarned) - parseFloat(a.cashEarned);
      if (sortBy === "rate") return b.completionRate - a.completionRate;
      const t1 = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const t2 = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return t2 - t1;
    });

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // limit to 4
      return [...prev, id];
    });
  };

  const compareList = (network as any[]).filter((i) => compareIds.includes(i.userId));

  const totals = {
    influencers: (network as any[]).length,
    totalEarned: (network as any[]).reduce((s, i) => s + parseFloat(i.cashEarned || "0"), 0),
    avgRate: (network as any[]).length
      ? Math.round((network as any[]).reduce((s, i) => s + (i.completionRate || 0), 0) / (network as any[]).length)
      : 0,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-purple-600" /> Influencer Network</CardTitle>
              <CardDescription>Everyone who applied to or worked on your campaigns, with side-by-side analytics.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="text-center px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-100">
                <p className="text-[10px] uppercase font-semibold text-purple-600">Influencers</p>
                <p className="text-lg font-bold text-purple-900">{totals.influencers}</p>
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] uppercase font-semibold text-emerald-600">Paid out</p>
                <p className="text-lg font-bold text-emerald-900">${totals.totalEarned.toFixed(2)}</p>
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-[10px] uppercase font-semibold text-blue-600">Avg approval</p>
                <p className="text-lg font-bold text-blue-900">{totals.avgRate}%</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap mb-4">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
              data-testid="input-network-search"
            />
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-44" data-testid="select-network-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Sort: Most recent</SelectItem>
                <SelectItem value="campaigns">Sort: Most campaigns</SelectItem>
                <SelectItem value="earned">Sort: Highest earned</SelectItem>
                <SelectItem value="rate">Sort: Approval rate</SelectItem>
              </SelectContent>
            </Select>
            {compareIds.length >= 2 && (
              <Button onClick={() => setShowCompare(true)} className="bg-purple-600 hover:bg-purple-700" data-testid="button-open-compare">
                <BarChart3 className="h-4 w-4 mr-1.5" /> Compare ({compareIds.length})
              </Button>
            )}
            {compareIds.length > 0 && (
              <Button variant="ghost" onClick={() => setCompareIds([])} data-testid="button-clear-compare">
                Clear selection
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">{(network as any[]).length === 0 ? "No influencers yet — once creators apply or submit work to your campaigns, they'll appear here." : "No matches for your search."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Compare</th>
                    <th className="px-3 py-2 text-left">Influencer</th>
                    <th className="px-3 py-2 text-center">Campaigns</th>
                    <th className="px-3 py-2 text-center">Submissions</th>
                    <th className="px-3 py-2 text-center">Approved</th>
                    <th className="px-3 py-2 text-center">Rate</th>
                    <th className="px-3 py-2 text-center">Micro tasks</th>
                    <th className="px-3 py-2 text-right">Earned</th>
                    <th className="px-3 py-2 text-right">Last activity</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inf: any) => {
                    const checked = compareIds.includes(inf.userId);
                    return (
                      <tr key={inf.userId} className="border-t hover:bg-gray-50" data-testid={`row-influencer-${inf.userId}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCompare(inf.userId)}
                            disabled={!checked && compareIds.length >= 4}
                            data-testid={`checkbox-compare-${inf.userId}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {inf.profileImageUrl ? (
                              <img src={inf.profileImageUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-xs">
                                {(inf.firstName?.[0] || inf.email?.[0] || "?").toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{inf.firstName || inf.email?.split("@")[0]} {inf.lastName || ""}</p>
                              <p className="text-xs text-gray-500 truncate">{inf.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-semibold">{inf.campaignsCount}</td>
                        <td className="px-3 py-2 text-center">{inf.submissionsCount}</td>
                        <td className="px-3 py-2 text-center text-emerald-700 font-semibold">{inf.approvedSubmissions}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge className={inf.completionRate >= 75 ? "bg-emerald-100 text-emerald-700" : inf.completionRate >= 40 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>
                            {inf.completionRate}%
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">{inf.microTasksCompleted}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">${parseFloat(inf.cashEarned).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-xs text-gray-500">{inf.lastActivity ? format(new Date(inf.lastActivity), "MMM d, yyyy") : "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <Link href={`/profile/${inf.userId}`}>
                            <Button size="sm" variant="ghost" data-testid={`button-view-influencer-${inf.userId}`}><ChevronRight className="h-4 w-4" /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compare Dialog */}
      <Dialog open={showCompare} onOpenChange={(o) => !o && setShowCompare(false)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-purple-600" /> Compare {compareList.length} influencers</DialogTitle>
            <DialogDescription>Side-by-side analytics across all your campaigns.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 mt-2" style={{ gridTemplateColumns: `200px repeat(${compareList.length}, minmax(0,1fr))` }}>
            <div></div>
            {compareList.map((i) => (
              <div key={i.userId} className="text-center pb-2 border-b">
                {i.profileImageUrl ? (
                  <img src={i.profileImageUrl} className="h-12 w-12 rounded-full object-cover mx-auto mb-1" alt="" />
                ) : (
                  <div className="h-12 w-12 mx-auto mb-1 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    {(i.firstName?.[0] || i.email?.[0] || "?").toUpperCase()}
                  </div>
                )}
                <p className="text-sm font-bold truncate">{i.firstName || i.email?.split("@")[0]} {i.lastName || ""}</p>
                <p className="text-xs text-gray-500 truncate">{i.email}</p>
              </div>
            ))}

            {[
              { label: "Campaigns participated", key: "campaignsCount" },
              { label: "Applications", key: "applicationsCount" },
              { label: "Approved applications", key: "approvedApplications" },
              { label: "Submissions", key: "submissionsCount" },
              { label: "Approved submissions", key: "approvedSubmissions" },
              { label: "Rejected submissions", key: "rejectedSubmissions" },
              { label: "Approval rate", key: "completionRate", suffix: "%" },
              { label: "Micro tasks completed", key: "microTasksCompleted" },
              { label: "Total earned (USD)", key: "cashEarned", prefix: "$" },
              { label: "Total followers", key: "totalFollowers" },
            ].flatMap((row) => [
              <div key={row.label} className="text-sm text-gray-600 font-semibold py-2 border-b">{row.label}</div>,
              ...compareList.map((i) => {
                const v = (i as any)[row.key];
                const display = (row as any).prefix
                  ? `${(row as any).prefix}${parseFloat(v || "0").toFixed(2)}`
                  : (row as any).suffix
                    ? `${v}${(row as any).suffix}`
                    : (v ?? "—");
                return (
                  <div key={`${row.label}-${i.userId}`} className="text-center py-2 border-b font-semibold text-gray-900">{display}</div>
                );
              }),
            ])}

            <div className="text-sm text-gray-600 font-semibold pt-3">View profile</div>
            {compareList.map((i) => (
              <div key={`prof-${i.userId}`} className="pt-3 text-center">
                <Link href={`/profile/${i.userId}`}>
                  <Button size="sm" variant="outline">Open</Button>
                </Link>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
