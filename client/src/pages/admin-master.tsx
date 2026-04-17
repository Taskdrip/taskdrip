import { useState, useEffect } from "react";
import { Link as RouterLink } from "wouter";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { PWASettingsPanel } from "@/components/PWASettingsPanel";
import { ContentEditorPanel } from "@/components/ContentEditorPanel";
import { AdminPayoutsCenter } from "@/components/AdminPayoutsCenter";
import { AdminConversationDrawer } from "@/components/AdminConversationDrawer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Shield, Users, DollarSign, MessageSquare, CheckCircle, XCircle, Clock, Plus, Edit, 
  Trash2, Eye, UserCheck, AlertTriangle, TrendingUp, Settings, BookOpen, Target,
  Download, Upload, Filter, Search, MoreHorizontal, Activity, Globe, Lock,
  Mail, Phone, MapPin, Calendar, FileText, Image, Video, ExternalLink, Send,
  Bold, Italic, Underline, List, ListOrdered, Quote, Link, AlignLeft, AlignCenter, AlignRight,
  Copy, GraduationCap, ShoppingBag, Star, Package, Code, Layers, KeyRound, UserCog, Coins,
  Wallet, Sparkles, CreditCard, Building2, Landmark, Bell, Link2, Zap, Palette,
  Smartphone, RefreshCw, CheckSquare, ToggleLeft, ToggleRight, MonitorSmartphone, Megaphone,
  Briefcase, Store, Trophy, Gift, Award
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

// Form schemas
const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  status: z.enum(["draft", "published"]),
  category: z.string().optional(),
  featuredImage: z.string().optional(),
  excerpt: z.string().optional(),
  metaDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  readingTime: z.number().optional(),
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

const courseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  shortDescription: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  thumbnail: z.string().optional(),
  price: z.string().optional(),
  isFree: z.boolean().default(false),
  level: z.string().default("beginner"),
  duration: z.string().optional(),
  lessonsCount: z.number().int().min(0).optional(),
  whatYouLearn: z.string().optional(),
  requirements: z.string().optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

const shopProductSchema = z.object({
  title: z.string().min(3, "Title required"),
  description: z.string().min(10, "Description required"),
  shortDescription: z.string().optional(),
  price: z.string().min(1, "Price required"),
  originalPrice: z.string().optional(),
  category: z.string().min(1, "Category required"),
  type: z.string().min(1, "Type required"),
  featuredImage: z.string().optional(),
  demoUrl: z.string().optional(),
  downloadUrl: z.string().optional(),
  documentationUrl: z.string().optional(),
  features: z.string().optional(),
  requirements: z.string().optional(),
  tags: z.string().optional(),
  isFree: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const adminCredentialsSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  newPassword: z.string().min(8, "Min 8 characters").optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ROLE_LABELS: Record<string, string> = {
  user: "Basic User",
  content_editor: "Content Editor",
  moderator: "Moderator / Mediator",
  store_manager: "Store Manager",
  admin: "Admin",
};

const FULL_ADMIN_TABS = [
  "overview", "users", "campaigns", "tasks", "networks", "payments", "direct-hires", "p2p",
  "feed", "blog", "courses", "shop", "social-channels", "push-notifications", "analytics",
  "settings", "pwa", "hero-sliders", "payout-center", "content-editor", "leaderboard",
];

const ROLE_TABS: Record<string, string[]> = {
  admin: FULL_ADMIN_TABS,
  content_editor: ["overview", "feed", "blog"],
  moderator: ["overview", "campaigns", "tasks", "direct-hires", "p2p", "feed"],
  store_manager: ["overview", "shop", "p2p"],
};

const COURSE_CATEGORIES = [
  { value: "instagram_growth", label: "Instagram Growth" },
  { value: "tiktok_mastery", label: "TikTok Mastery" },
  { value: "youtube", label: "YouTube Success" },
  { value: "monetization", label: "Monetization" },
  { value: "content_creation", label: "Content Creation" },
  { value: "branding", label: "Personal Branding" },
  { value: "general", label: "General Marketing" },
];

const SHOP_CATEGORIES = [
  { value: "software", label: "Software & Apps" },
  { value: "scripts", label: "Scripts & Automation" },
  { value: "templates", label: "Templates & Designs" },
  { value: "plugins", label: "Plugins & Extensions" },
  { value: "tools", label: "Tech Tools" },
  { value: "courses", label: "Digital Courses" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const SHOP_TYPES = [
  { value: "software", label: "Software" },
  { value: "script", label: "Script" },
  { value: "template", label: "Template" },
  { value: "plugin", label: "Plugin" },
  { value: "digital_course", label: "Digital Course" },
  { value: "physical_product", label: "Physical Product" },
  { value: "saas_tool", label: "SaaS Tool" },
];

function LessonManageButton({ course }: { course: any }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonFiles, setLessonFiles] = useState<any[]>([]);

  const { data: lessons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/courses", course.id, "lessons"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${course.id}/lessons`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: open,
  });

  const lessonForm = useForm({
    defaultValues: { title: "", description: "", videoLink: "", content: "", isPreview: false },
  });

  const saveLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, order: lessons.length, lessonFiles };
      const url = editingLesson ? `/api/courses/${course.id}/lessons/${editingLesson.id}` : `/api/courses/${course.id}/lessons`;
      const method = editingLesson ? "PATCH" : "POST";
      const res = await apiRequest(method, url, payload);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      toast({ title: editingLesson ? "Lesson updated!" : "Lesson added!" });
      setLessonOpen(false);
      setEditingLesson(null);
      setLessonFiles([]);
      lessonForm.reset({ title: "", description: "", videoLink: "", content: "", isPreview: false });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/courses/${course.id}/lessons/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", course.id, "lessons"] });
      toast({ title: "Lesson deleted" });
    },
  });

  const openAdd = () => { setEditingLesson(null); setLessonFiles([]); lessonForm.reset({ title: "", description: "", videoLink: "", content: "", isPreview: false }); setLessonOpen(true); };
  const openEdit = (lesson: any) => { setEditingLesson(lesson); setLessonFiles(lesson.lessonFiles || []); lessonForm.reset({ title: lesson.title, description: lesson.description || "", videoLink: lesson.videoLink || lesson.videoUrl || "", content: lesson.content || "", isPreview: lesson.isPreview }); setLessonOpen(true); };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-violet-600 border-violet-200 hover:bg-violet-50 gap-1">
        <BookOpen className="h-3 w-3" /> Lessons
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Lessons — {course.title}</span>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Lesson
              </Button>
            </DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading lessons...</div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="mb-3">No lessons yet.</p>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add First Lesson</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson: any, idx: number) => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lesson.title}</p>
                    {lesson.description && <p className="text-xs text-gray-400 truncate">{lesson.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(lesson)}><Edit className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => { if (confirm("Delete lesson?")) deleteLessonMutation.mutate(lesson.id); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={lessonOpen} onOpenChange={(v) => { setLessonOpen(v); if (!v) { setEditingLesson(null); lessonForm.reset(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add New Lesson"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={lessonForm.handleSubmit((d) => saveLessonMutation.mutate(d))} className="space-y-4">
            <div>
              <Label>Lesson Title *</Label>
              <Input {...lessonForm.register("title", { required: true })} placeholder="e.g. Understanding the Algorithm" />
            </div>
            <div>
              <Label>Short Description</Label>
              <Input {...lessonForm.register("description")} placeholder="Brief overview of this lesson" />
            </div>
            <div>
              <Label>Video Link (YouTube / Vimeo)</Label>
              <Input {...lessonForm.register("videoLink")} placeholder="https://www.youtube.com/watch?v=..." />
              <p className="text-xs text-gray-400 mt-1">Paste a YouTube or Vimeo URL — it will be embedded automatically.</p>
            </div>
            <div>
              <Label>Lesson Content</Label>
              <Textarea {...lessonForm.register("content")} rows={4} placeholder="Write the lesson text content here..." />
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
              <Switch checked={lessonForm.watch("isPreview")} onCheckedChange={(v) => lessonForm.setValue("isPreview", v)} />
              <div>
                <Label className="cursor-pointer">Free Preview Lesson</Label>
                <p className="text-xs text-gray-400">Non-enrolled users can view this lesson</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white flex-1" disabled={saveLessonMutation.isPending}>
                {saveLessonMutation.isPending ? "Saving..." : editingLesson ? "Update Lesson" : "Add Lesson"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLessonOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EnrollmentPaymentDialog({ enrollment, onApprove, approving }: { enrollment: any; onApprove: () => void; approving: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1">
        <Eye className="h-3 w-3" /> View Details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Course</p>
                <p className="font-medium text-gray-900 text-xs">{enrollment.course?.title || enrollment.courseId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="font-bold text-gray-900">${enrollment.amount} USDT</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Student</p>
                <p className="font-medium text-gray-900 text-xs">{enrollment.user?.firstName} {enrollment.user?.lastName}</p>
                <p className="text-xs text-gray-500">{enrollment.user?.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Network</p>
                <p className="font-medium text-gray-900">{enrollment.paymentMethod || "N/A"}</p>
              </div>
            </div>
            {enrollment.transactionHash && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Transaction Hash</p>
                <p className="font-mono text-xs text-gray-800 break-all">{enrollment.transactionHash}</p>
              </div>
            )}
            {enrollment.paymentProof && (
              <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                <p className="text-xs text-violet-600 font-medium mb-2">Payment Proof</p>
                {enrollment.paymentProof.startsWith("http") ? (
                  <div className="space-y-2">
                    <img src={enrollment.paymentProof} alt="Payment proof" className="w-full rounded-lg object-cover max-h-48"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <a href={enrollment.paymentProof} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline">Open original ↗</a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 break-all">{enrollment.paymentProof}</p>
                )}
              </div>
            )}
            {enrollment.submittedAt && (
              <p className="text-xs text-gray-400">Submitted: {new Date(enrollment.submittedAt).toLocaleString()}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button className="bg-green-600 hover:bg-green-700 text-white flex-1 gap-2"
                onClick={() => { onApprove(); setOpen(false); }} disabled={approving}>
                <CheckCircle className="h-4 w-4" />
                {approving ? "Approving..." : "Approve & Activate"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Hero Sliders Panel ──────────────────────────────────────────────────────
const sliderFormSchema = z.object({
  badge: z.string().optional(),
  headline: z.string().min(3, "Headline is required"),
  subheadline: z.string().optional(),
  ctaPrimaryLabel: z.string().optional(),
  ctaPrimaryLink: z.string().optional(),
  ctaSecondaryLabel: z.string().optional(),
  ctaSecondaryLink: z.string().optional(),
  backgroundImage: z.string().optional(),
  overlayColor: z.string().optional(),
  accentColor: z.string().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});
type SliderFormData = z.infer<typeof sliderFormSchema>;

function HeroSlidersPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<any>(null);

  const { data: sliders = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/hero-sliders"] });

  const form = useForm<SliderFormData>({
    resolver: zodResolver(sliderFormSchema),
    defaultValues: {
      badge: "", headline: "", subheadline: "",
      ctaPrimaryLabel: "", ctaPrimaryLink: "", ctaSecondaryLabel: "", ctaSecondaryLink: "",
      backgroundImage: "", overlayColor: "from-black/90 via-black/70 to-black/40",
      accentColor: "from-purple-400 via-pink-400 to-orange-400",
      order: 0, isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: SliderFormData) => apiRequest("POST", "/api/admin/hero-sliders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] });
      toast({ title: "Slider created" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Error", description: "Failed to create slider", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SliderFormData }) => apiRequest("PUT", `/api/admin/hero-sliders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] });
      toast({ title: "Slider updated" });
      setDialogOpen(false);
      setEditingSlider(null);
      form.reset();
    },
    onError: () => toast({ title: "Error", description: "Failed to update slider", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/hero-sliders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] });
      toast({ title: "Slider deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete slider", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PUT", `/api/admin/hero-sliders/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hero-sliders"] });
    },
  });

  function openCreate() {
    setEditingSlider(null);
    form.reset({
      badge: "", headline: "", subheadline: "",
      ctaPrimaryLabel: "", ctaPrimaryLink: "", ctaSecondaryLabel: "", ctaSecondaryLink: "",
      backgroundImage: "", overlayColor: "from-black/90 via-black/70 to-black/40",
      accentColor: "from-purple-400 via-pink-400 to-orange-400",
      order: sliders.length, isActive: true,
    });
    setDialogOpen(true);
  }

  function openEdit(slider: any) {
    setEditingSlider(slider);
    form.reset({
      badge: slider.badge || "",
      headline: slider.headline || "",
      subheadline: slider.subheadline || "",
      ctaPrimaryLabel: slider.ctaPrimaryLabel || "",
      ctaPrimaryLink: slider.ctaPrimaryLink || "",
      ctaSecondaryLabel: slider.ctaSecondaryLabel || "",
      ctaSecondaryLink: slider.ctaSecondaryLink || "",
      backgroundImage: slider.backgroundImage || "",
      overlayColor: slider.overlayColor || "from-black/90 via-black/70 to-black/40",
      accentColor: slider.accentColor || "from-purple-400 via-pink-400 to-orange-400",
      order: slider.order ?? 0,
      isActive: slider.isActive ?? true,
    });
    setDialogOpen(true);
  }

  function onSubmit(data: SliderFormData) {
    if (editingSlider) {
      updateMutation.mutate({ id: editingSlider.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const ACCENT_PRESETS = [
    { label: "Purple–Pink–Orange", value: "from-purple-400 via-pink-400 to-orange-400" },
    { label: "Blue–Cyan–Emerald", value: "from-blue-400 via-cyan-400 to-emerald-400" },
    { label: "Orange–Pink–Purple", value: "from-orange-400 via-pink-400 to-purple-400" },
    { label: "Indigo–Blue–Cyan", value: "from-indigo-400 via-blue-400 to-cyan-400" },
    { label: "Emerald–Teal–Cyan", value: "from-emerald-400 via-teal-400 to-cyan-400" },
    { label: "Yellow–Orange–Red", value: "from-yellow-400 via-orange-400 to-red-400" },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-400" />
              Hero Sliders
            </CardTitle>
            <CardDescription className="text-gray-400">Manage the auto-sliding hero section on the landing page. Changes appear live immediately.</CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-add-slider">
            <Plus className="w-4 h-4 mr-2" /> Add Slide
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading sliders…</div>
          ) : sliders.length === 0 ? (
            <div className="text-center py-12">
              <Image className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-sm mb-2">No custom sliders yet.</p>
              <p className="text-gray-600 text-xs">The landing page is currently using the default built-in slides.</p>
              <Button onClick={openCreate} variant="outline" className="mt-4 border-gray-700 text-gray-400 hover:text-white">
                Create First Slide
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sliders.map((slider: any, idx: number) => (
                <div key={slider.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 group" data-testid={`slider-card-${idx}`}>
                  {/* Preview thumbnail */}
                  <div className="w-28 h-16 rounded-lg overflow-hidden bg-gray-700 shrink-0 relative">
                    {slider.backgroundImage ? (
                      <img src={slider.backgroundImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No image</div>
                    )}
                    <div className="absolute inset-0 bg-black/40" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-xs bg-gray-700 text-gray-300 border-gray-600">#{slider.order ?? idx}</Badge>
                      {slider.badge && <Badge className="text-xs bg-purple-900/50 text-purple-300 border-purple-700/50">{slider.badge}</Badge>}
                      <Badge className={`text-xs border-0 ${slider.isActive ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-500"}`}>
                        {slider.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-white font-bold text-sm line-clamp-1">{slider.headline}</p>
                    {slider.subheadline && <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">{slider.subheadline}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      {slider.ctaPrimaryLabel && <span>🔗 {slider.ctaPrimaryLabel} → {slider.ctaPrimaryLink}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={slider.isActive}
                      onCheckedChange={(v) => toggleActiveMutation.mutate({ id: slider.id, isActive: v })}
                      data-testid={`toggle-slider-${idx}`}
                    />
                    <Button variant="ghost" size="sm" onClick={() => openEdit(slider)} className="text-gray-400 hover:text-white" data-testid={`button-edit-slider-${idx}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(slider.id)} className="text-gray-400 hover:text-red-400" data-testid={`button-delete-slider-${idx}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingSlider(null); form.reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingSlider ? "Edit Slide" : "New Slide"}</DialogTitle>
            <DialogDescription className="text-gray-400">Configure the content, background, and links for this hero slide.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="badge" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-xs">Badge Label (optional)</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. For Influencers" className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-badge" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="order" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-xs">Display Order</FormLabel>
                    <FormControl><Input {...field} type="number" onChange={(e) => field.onChange(+e.target.value)} className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-order" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="headline" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 text-xs">Headline *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Stop Getting Ghosted by Brands." className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-headline" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="subheadline" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 text-xs">Subheadline</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Supporting text below the headline…" rows={3} className="bg-gray-800 border-gray-700 text-white resize-none" data-testid="input-slider-subheadline" /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="ctaPrimaryLabel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-xs">Primary Button Label</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Start Earning Now" className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-cta-primary-label" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ctaPrimaryLink" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-xs">Primary Button Link</FormLabel>
                    <FormControl><Input {...field} placeholder="/signup?type=creator" className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-cta-primary-link" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ctaSecondaryLabel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-xs">Secondary Button Label</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Browse Campaigns" className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-cta-secondary-label" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ctaSecondaryLink" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-xs">Secondary Button Link</FormLabel>
                    <FormControl><Input {...field} placeholder="/campaigns" className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-cta-secondary-link" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="backgroundImage" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 text-xs">Background Image URL</FormLabel>
                  <FormControl><Input {...field} placeholder="https://images.unsplash.com/…" className="bg-gray-800 border-gray-700 text-white" data-testid="input-slider-bg-image" /></FormControl>
                  <p className="text-xs text-gray-500">Recommended: 1800px wide, high quality. Use Unsplash or your own hosted image.</p>
                  {field.value && (
                    <div className="mt-2 h-24 rounded-lg overflow-hidden relative">
                      <img src={field.value} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                  )}
                </FormItem>
              )} />

              <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="accentColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-xs">Headline Accent Gradient</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {ACCENT_PRESETS.map((p) => (
                        <button key={p.value} type="button" onClick={() => field.onChange(p.value)}
                          className={`px-2 py-1.5 rounded-lg text-xs border transition-all ${field.value === p.value ? "border-purple-500 bg-purple-900/30 text-purple-300" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}
                          data-testid={`preset-accent-${p.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                          <div className={`h-2 w-full rounded-full bg-gradient-to-r ${p.value} mb-1`} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <FormControl><Input {...field} placeholder="from-purple-400 via-pink-400 to-orange-400" className="bg-gray-800 border-gray-700 text-white text-xs mt-2" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="overlayColor" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 text-xs">Background Overlay (Tailwind gradient class)</FormLabel>
                  <FormControl><Input {...field} placeholder="from-black/90 via-black/70 to-black/40" className="bg-gray-800 border-gray-700 text-white text-xs" data-testid="input-slider-overlay" /></FormControl>
                  <p className="text-xs text-gray-500">Controls image darkness. Darker = more text contrast.</p>
                </FormItem>
              )} />

              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
                  <div>
                    <FormLabel className="text-gray-300 text-sm">Active</FormLabel>
                    <p className="text-xs text-gray-500">Show this slide on the landing page</p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="toggle-slider-active" /></FormControl>
                </FormItem>
              )} />

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-submit-slider">
                  {createMutation.isPending || updateMutation.isPending ? "Saving…" : editingSlider ? "Save Changes" : "Create Slide"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-700 text-gray-400 hover:text-white">
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminP2PListingsPanel() {
  const { toast } = useToast();
  const [editListing, setEditListing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: listings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/p2p-listings"],
    queryFn: () => fetch("/api/admin/p2p-listings", { credentials: "include" }).then(r => r.json()),
  });

  const seedMutation = useMutation({
    mutationFn: () => fetch("/api/admin/p2p-seed", { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: (data) => {
      toast({ title: "Demo listings seeded!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/p2p/listings"] });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: string; adminNote?: string }) =>
      fetch(`/api/admin/p2p-listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, adminNote }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Listing status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/p2p/listings"] });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: (form: any) =>
      fetch(`/api/admin/p2p-listings/${editListing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Listing updated!" });
      setEditListing(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/p2p/listings"] });
    },
    onError: () => toast({ title: "Failed to update listing", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/p2p-listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "removed" }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Listing removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/p2p-listings"] });
    },
    onError: () => toast({ title: "Failed to remove listing", variant: "destructive" }),
  });

  const openEdit = (listing: any) => {
    setEditListing(listing);
    setEditForm({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      paymentMethod: listing.paymentMethod,
      listingType: listing.listingType,
      featuredImage: listing.featuredImage || "",
      status: listing.status,
      adminNote: listing.adminNote || "",
    });
  };

  const filtered = listings.filter((l: any) =>
    (filterStatus === "all" || l.status === filterStatus) &&
    (filterType === "all" || l.listingType === filterType)
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      approved: "bg-green-500/20 text-green-300 border-green-500/30",
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      rejected: "bg-red-500/20 text-red-300 border-red-500/30",
      removed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return map[s] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
  };

  const typeBadge = (t: string) => {
    const map: Record<string, string> = {
      crypto: "bg-orange-500/20 text-orange-300",
      product: "bg-blue-500/20 text-blue-300",
      service: "bg-purple-500/20 text-purple-300",
    };
    return map[t] || "bg-gray-500/20 text-gray-300";
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              All P2P Listings
            </CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              Edit, approve, reject or remove any listing. Seed demo content below.
            </CardDescription>
          </div>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white text-sm"
            data-testid="button-seed-demo-listings"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {seedMutation.isPending ? "Seeding..." : "Seed Demo Listings"}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mt-3">
          {["all", "pending", "approved", "rejected"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterStatus === s ? "bg-purple-600 text-white border-purple-600" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="w-px bg-gray-700 mx-1" />
          {["all", "crypto", "product", "service"].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filterType === t ? "bg-blue-600 text-white border-blue-600" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
              {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No listings found. Use "Seed Demo Listings" to add demo content.</p>
          </div>
        ) : (
          filtered.map((listing: any) => (
            <div key={listing.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex gap-4 items-start hover:border-gray-600 transition-colors" data-testid={`admin-listing-${listing.id}`}>
              {/* Thumbnail */}
              <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {listing.featuredImage ? (
                  <img src={listing.featuredImage} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {listing.listingType === "crypto" ? <Coins className="w-6 h-6 text-gray-500" /> : listing.listingType === "product" ? <Package className="w-6 h-6 text-gray-500" /> : <Briefcase className="w-6 h-6 text-gray-500" />}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeBadge(listing.listingType)}`}>
                    {listing.listingType}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusBadge(listing.status)}`}>
                    {listing.status}
                  </span>
                  <span className="text-green-400 text-xs font-bold">${Number(listing.price).toFixed(2)}</span>
                </div>
                <p className="text-white text-sm font-semibold truncate">{listing.title}</p>
                <p className="text-gray-400 text-xs truncate mt-0.5">{listing.description?.slice(0, 80)}...</p>
                <p className="text-gray-500 text-xs mt-1">by {listing.seller?.username || listing.seller?.firstName || "Unknown"} · {listing.paymentMethod}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 h-7 text-xs" onClick={() => openEdit(listing)} data-testid={`button-edit-listing-${listing.id}`}>
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                {listing.status !== 'approved' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => statusMutation.mutate({ id: listing.id, status: 'approved' })} data-testid={`button-approve-listing-${listing.id}`}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                )}
                {listing.status === 'approved' && (
                  <Button size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/20 h-7 text-xs" onClick={() => statusMutation.mutate({ id: listing.id, status: 'rejected' })} data-testid={`button-reject-listing-${listing.id}`}>
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-gray-700 text-gray-500 hover:bg-gray-800 hover:text-red-400 h-7 text-xs" onClick={() => { if (confirm("Remove this listing?")) deleteMutation.mutate(listing.id); }} data-testid={`button-remove-listing-${listing.id}`}>
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editListing} onOpenChange={(open) => !open && setEditListing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="w-4 h-4 text-purple-400" /> Edit Listing
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update any field and save. Changes are immediate.
            </DialogDescription>
          </DialogHeader>

          {editListing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Listing Type</Label>
                  <select
                    value={editForm.listingType}
                    onChange={e => setEditForm((f: any) => ({ ...f, listingType: e.target.value }))}
                    className="w-full mt-1 bg-gray-800 border border-gray-600 text-white rounded-lg p-2 text-sm"
                  >
                    <option value="crypto">Crypto Trade</option>
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Status</Label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                    className="w-full mt-1 bg-gray-800 border border-gray-600 text-white rounded-lg p-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-xs">Title</Label>
                <Input
                  value={editForm.title}
                  onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                  data-testid="input-edit-listing-title"
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs">Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="mt-1 bg-gray-800 border-gray-600 text-white resize-none"
                  data-testid="input-edit-listing-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Price (USD)</Label>
                  <Input
                    type="number"
                    value={editForm.price}
                    onChange={e => setEditForm((f: any) => ({ ...f, price: e.target.value }))}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                    data-testid="input-edit-listing-price"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Payment Method</Label>
                  <Input
                    value={editForm.paymentMethod}
                    onChange={e => setEditForm((f: any) => ({ ...f, paymentMethod: e.target.value }))}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-xs">Featured Image URL</Label>
                <Input
                  value={editForm.featuredImage}
                  onChange={e => setEditForm((f: any) => ({ ...f, featuredImage: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                  data-testid="input-edit-listing-image"
                />
                {editForm.featuredImage && (
                  <img src={editForm.featuredImage} alt="preview" className="mt-2 h-24 object-cover rounded-lg w-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>

              <div>
                <Label className="text-gray-300 text-xs">Admin Note (visible to user)</Label>
                <Textarea
                  value={editForm.adminNote}
                  onChange={e => setEditForm((f: any) => ({ ...f, adminNote: e.target.value }))}
                  rows={2}
                  placeholder="e.g. Please update your description..."
                  className="mt-1 bg-gray-800 border-gray-600 text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => editMutation.mutate(editForm)}
                  disabled={editMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  data-testid="button-save-listing-edit"
                >
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setEditListing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LeaderboardManagementPanel() {
  const { toast } = useToast();
  const [rewardForm, setRewardForm] = useState({
    title: "", leaderboardType: "all", positionFrom: 1, positionTo: 1,
    prizeValue: "", currency: "USDT", prizeDescription: "", sponsorName: "", sponsorUrl: "",
    sponsorLogoUrl: "", season: "",
  });
  const [giveawayForm, setGiveawayForm] = useState({
    title: "", prize: "", totalPrizePool: "", description: "", requirements: "",
    sponsorName: "", sponsorUrl: "", sponsorLogoUrl: "", status: "upcoming",
    eligibleLeaderboards: [] as string[], winnerCount: 1, startDate: "", endDate: "",
  });
  const [editingReward, setEditingReward] = useState<any>(null);
  const [editingGiveaway, setEditingGiveaway] = useState<any>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [giveawayOpen, setGiveawayOpen] = useState(false);

  const { data: rewards = [], refetch: refetchRewards } = useQuery<any[]>({ queryKey: ["/api/leaderboard/rewards"] });
  const { data: giveaways = [], refetch: refetchGiveaways } = useQuery<any[]>({ queryKey: ["/api/leaderboard/giveaways"] });

  const createReward = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/leaderboard/rewards", data),
    onSuccess: () => { refetchRewards(); setRewardOpen(false); toast({ title: "Reward created" }); },
    onError: () => toast({ title: "Failed to create reward", variant: "destructive" }),
  });
  const updateReward = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/leaderboard/rewards/${id}`, data),
    onSuccess: () => { refetchRewards(); setRewardOpen(false); setEditingReward(null); toast({ title: "Reward updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });
  const deleteReward = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/leaderboard/rewards/${id}`),
    onSuccess: () => { refetchRewards(); toast({ title: "Reward deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const createGiveaway = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/leaderboard/giveaways", data),
    onSuccess: () => { refetchGiveaways(); setGiveawayOpen(false); toast({ title: "Giveaway created" }); },
    onError: () => toast({ title: "Failed to create giveaway", variant: "destructive" }),
  });
  const updateGiveaway = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/leaderboard/giveaways/${id}`, data),
    onSuccess: () => { refetchGiveaways(); setGiveawayOpen(false); setEditingGiveaway(null); toast({ title: "Giveaway updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });
  const deleteGiveaway = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/leaderboard/giveaways/${id}`),
    onSuccess: () => { refetchGiveaways(); toast({ title: "Giveaway deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const openEditReward = (r: any) => {
    setRewardForm({
      title: r.title || "", leaderboardType: r.leaderboardType || "all",
      positionFrom: r.positionFrom || 1, positionTo: r.positionTo || 1,
      prizeValue: r.prizeValue || "", currency: r.currency || "USDT",
      prizeDescription: r.prizeDescription || "", sponsorName: r.sponsorName || "",
      sponsorUrl: r.sponsorUrl || "", sponsorLogoUrl: r.sponsorLogoUrl || "", season: r.season || "",
    });
    setEditingReward(r);
    setRewardOpen(true);
  };

  const openEditGiveaway = (g: any) => {
    setGiveawayForm({
      title: g.title || "", prize: g.prize || "", totalPrizePool: g.totalPrizePool || "",
      description: g.description || "", requirements: g.requirements || "",
      sponsorName: g.sponsorName || "", sponsorUrl: g.sponsorUrl || "",
      sponsorLogoUrl: g.sponsorLogoUrl || "", status: g.status || "upcoming",
      eligibleLeaderboards: g.eligibleLeaderboards || [], winnerCount: g.winnerCount || 1,
      startDate: g.startDate ? g.startDate.split('T')[0] : "", endDate: g.endDate ? g.endDate.split('T')[0] : "",
    });
    setEditingGiveaway(g);
    setGiveawayOpen(true);
  };

  const handleSaveReward = () => {
    const data = { ...rewardForm, positionFrom: Number(rewardForm.positionFrom), positionTo: Number(rewardForm.positionTo), isActive: true };
    if (editingReward) updateReward.mutate({ id: editingReward.id, data });
    else createReward.mutate(data);
  };

  const handleSaveGiveaway = () => {
    const data = {
      ...giveawayForm,
      winnerCount: Number(giveawayForm.winnerCount),
      startDate: giveawayForm.startDate || null,
      endDate: giveawayForm.endDate || null,
    };
    if (editingGiveaway) updateGiveaway.mutate({ id: editingGiveaway.id, data });
    else createGiveaway.mutate(data);
  };

  const lbTypeLabel: Record<string, string> = { all: "All Boards", points: "$TDRIP Points", referrals: "Top Referrers", earnings: "Top Earners" };

  return (
    <div className="space-y-8">
      {/* ── REWARD TIERS SECTION ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" /> Leaderboard Reward Tiers
            </CardTitle>
            <CardDescription className="text-gray-400">Manage prize tiers by position range for each leaderboard</CardDescription>
          </div>
          <Dialog open={rewardOpen} onOpenChange={(v) => { setRewardOpen(v); if (!v) { setEditingReward(null); setRewardForm({ title: "", leaderboardType: "all", positionFrom: 1, positionTo: 1, prizeValue: "", currency: "USDT", prizeDescription: "", sponsorName: "", sponsorUrl: "", sponsorLogoUrl: "", season: "" }); } }}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl gap-2" data-testid="btn-add-reward">
                <Plus className="h-4 w-4" /> Add Reward Tier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingReward ? "Edit" : "Create"} Reward Tier</DialogTitle>
                <DialogDescription>Define a prize for a specific position range.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Title / Prize Name</Label>
                  <Input value={rewardForm.title} onChange={e => setRewardForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gold Winner Prize" className="mt-1" data-testid="input-reward-title" />
                </div>
                <div>
                  <Label>Applies To</Label>
                  <Select value={rewardForm.leaderboardType} onValueChange={v => setRewardForm(f => ({ ...f, leaderboardType: v }))}>
                    <SelectTrigger className="mt-1" data-testid="select-reward-leaderboard-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leaderboards</SelectItem>
                      <SelectItem value="points">$TDRIP Points</SelectItem>
                      <SelectItem value="referrals">Top Referrers</SelectItem>
                      <SelectItem value="earnings">Top Earners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Position From</Label>
                    <Input type="number" min={1} value={rewardForm.positionFrom} onChange={e => setRewardForm(f => ({ ...f, positionFrom: Number(e.target.value) }))} className="mt-1" data-testid="input-reward-position-from" />
                  </div>
                  <div>
                    <Label>Position To</Label>
                    <Input type="number" min={1} value={rewardForm.positionTo} onChange={e => setRewardForm(f => ({ ...f, positionTo: Number(e.target.value) }))} className="mt-1" data-testid="input-reward-position-to" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prize Value (USD)</Label>
                    <Input type="number" value={rewardForm.prizeValue} onChange={e => setRewardForm(f => ({ ...f, prizeValue: e.target.value }))} placeholder="500" className="mt-1" data-testid="input-reward-prize-value" />
                  </div>
                  <div>
                    <Label>Currency / Token</Label>
                    <Input value={rewardForm.currency} onChange={e => setRewardForm(f => ({ ...f, currency: e.target.value }))} placeholder="USDT" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Prize Description (optional extras)</Label>
                  <Textarea value={rewardForm.prizeDescription} onChange={e => setRewardForm(f => ({ ...f, prizeDescription: e.target.value }))} placeholder="e.g. MacBook Pro, Featured placement, Verified badge" className="mt-1 resize-none" rows={2} />
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Sponsor (optional)</p>
                  <div className="space-y-3">
                    <div><Label>Sponsor Name</Label><Input value={rewardForm.sponsorName} onChange={e => setRewardForm(f => ({ ...f, sponsorName: e.target.value }))} placeholder="Acme Corp" className="mt-1" /></div>
                    <div><Label>Sponsor Website URL</Label><Input value={rewardForm.sponsorUrl} onChange={e => setRewardForm(f => ({ ...f, sponsorUrl: e.target.value }))} placeholder="https://acme.com" className="mt-1" /></div>
                    <div><Label>Sponsor Logo URL</Label><Input value={rewardForm.sponsorLogoUrl} onChange={e => setRewardForm(f => ({ ...f, sponsorLogoUrl: e.target.value }))} placeholder="https://..." className="mt-1" /></div>
                  </div>
                </div>
                <div>
                  <Label>Season Label (optional)</Label>
                  <Input value={rewardForm.season} onChange={e => setRewardForm(f => ({ ...f, season: e.target.value }))} placeholder="e.g. Season 1 — April 2026" className="mt-1" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setRewardOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveReward} disabled={createReward.isPending || updateReward.isPending} className="bg-yellow-500 hover:bg-yellow-600 text-white" data-testid="btn-save-reward">
                    {(createReward.isPending || updateReward.isPending) ? "Saving..." : "Save Reward"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(rewards as any[]).length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Trophy className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p>No reward tiers created yet. Add one above!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Positions</TableHead>
                  <TableHead className="text-gray-400">Title</TableHead>
                  <TableHead className="text-gray-400">Board</TableHead>
                  <TableHead className="text-gray-400">Prize</TableHead>
                  <TableHead className="text-gray-400">Sponsor</TableHead>
                  <TableHead className="text-gray-400">Season</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rewards as any[]).map((r: any) => (
                  <TableRow key={r.id} className="border-gray-800">
                    <TableCell className="text-white font-mono">
                      #{r.positionFrom}{r.positionFrom !== r.positionTo ? `–#${r.positionTo}` : ''}
                    </TableCell>
                    <TableCell className="text-white font-medium">{r.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs border-gray-700 text-gray-300">{lbTypeLabel[r.leaderboardType] || r.leaderboardType}</Badge></TableCell>
                    <TableCell className="text-green-400 font-bold">${parseFloat(r.prizeValue || 0).toLocaleString()} <span className="text-gray-500 text-xs">{r.currency}</span></TableCell>
                    <TableCell className="text-gray-300 text-sm">{r.sponsorName || <span className="text-gray-600">—</span>}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{r.season || <span className="text-gray-600">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditReward(r)} className="text-gray-400 hover:text-blue-400" data-testid={`edit-reward-${r.id}`}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteReward.mutate(r.id)} className="text-gray-400 hover:text-red-400" data-testid={`delete-reward-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── GIVEAWAYS SECTION ── */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-400" /> Giveaways & Events
            </CardTitle>
            <CardDescription className="text-gray-400">Manage sponsored giveaways for leaderboard participants</CardDescription>
          </div>
          <Dialog open={giveawayOpen} onOpenChange={(v) => { setGiveawayOpen(v); if (!v) { setEditingGiveaway(null); setGiveawayForm({ title: "", prize: "", totalPrizePool: "", description: "", requirements: "", sponsorName: "", sponsorUrl: "", sponsorLogoUrl: "", status: "upcoming", eligibleLeaderboards: [], winnerCount: 1, startDate: "", endDate: "" }); } }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2" data-testid="btn-add-giveaway">
                <Plus className="h-4 w-4" /> Add Giveaway
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGiveaway ? "Edit" : "Create"} Giveaway</DialogTitle>
                <DialogDescription>Set up a sponsored giveaway for leaderboard performers.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Giveaway Title</Label><Input value={giveawayForm.title} onChange={e => setGiveawayForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. April Creator Giveaway" className="mt-1" data-testid="input-giveaway-title" /></div>
                <div><Label>Prize Description</Label><Input value={giveawayForm.prize} onChange={e => setGiveawayForm(f => ({ ...f, prize: e.target.value }))} placeholder="e.g. iPhone 16 Pro + $500 USDT" className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Total Prize Pool ($)</Label><Input type="number" value={giveawayForm.totalPrizePool} onChange={e => setGiveawayForm(f => ({ ...f, totalPrizePool: e.target.value }))} placeholder="1000" className="mt-1" /></div>
                  <div><Label>Number of Winners</Label><Input type="number" min={1} value={giveawayForm.winnerCount} onChange={e => setGiveawayForm(f => ({ ...f, winnerCount: Number(e.target.value) }))} className="mt-1" /></div>
                </div>
                <div><Label>Description</Label><Textarea value={giveawayForm.description} onChange={e => setGiveawayForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the giveaway..." className="mt-1 resize-none" rows={3} /></div>
                <div><Label>Requirements</Label><Textarea value={giveawayForm.requirements} onChange={e => setGiveawayForm(f => ({ ...f, requirements: e.target.value }))} placeholder="e.g. Must be in top 50 referrers this month" className="mt-1 resize-none" rows={2} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={giveawayForm.status} onValueChange={v => setGiveawayForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" value={giveawayForm.startDate} onChange={e => setGiveawayForm(f => ({ ...f, startDate: e.target.value }))} className="mt-1" /></div>
                  <div><Label>End Date</Label><Input type="date" value={giveawayForm.endDate} onChange={e => setGiveawayForm(f => ({ ...f, endDate: e.target.value }))} className="mt-1" /></div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Sponsor Info</p>
                  <div className="space-y-3">
                    <div><Label>Sponsor Name</Label><Input value={giveawayForm.sponsorName} onChange={e => setGiveawayForm(f => ({ ...f, sponsorName: e.target.value }))} placeholder="Brand / Sponsor name" className="mt-1" /></div>
                    <div><Label>Sponsor Website URL</Label><Input value={giveawayForm.sponsorUrl} onChange={e => setGiveawayForm(f => ({ ...f, sponsorUrl: e.target.value }))} placeholder="https://..." className="mt-1" /></div>
                    <div><Label>Sponsor Logo URL</Label><Input value={giveawayForm.sponsorLogoUrl} onChange={e => setGiveawayForm(f => ({ ...f, sponsorLogoUrl: e.target.value }))} placeholder="https://..." className="mt-1" /></div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setGiveawayOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveGiveaway} disabled={createGiveaway.isPending || updateGiveaway.isPending} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="btn-save-giveaway">
                    {(createGiveaway.isPending || updateGiveaway.isPending) ? "Saving..." : "Save Giveaway"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(giveaways as any[]).length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Gift className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p>No giveaways created yet. Add one above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(giveaways as any[]).map((g: any) => (
                <div key={g.id} className="flex items-center gap-4 p-4 bg-gray-800 rounded-2xl border border-gray-700" data-testid={`admin-giveaway-${g.id}`}>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Gift className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{g.title}</div>
                    <div className="text-gray-400 text-xs truncate">{g.prize} • {g.winnerCount} winner(s)</div>
                    {g.sponsorName && <div className="text-gray-500 text-xs">by {g.sponsorName}</div>}
                  </div>
                  <Badge className={g.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : g.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-700 text-gray-500 border-gray-600'} variant="outline">
                    {g.status}
                  </Badge>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditGiveaway(g)} className="text-gray-400 hover:text-blue-400" data-testid={`edit-giveaway-${g.id}`}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteGiveaway.mutate(g.id)} className="text-gray-400 hover:text-red-400" data-testid={`delete-giveaway-${g.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminMaster() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { walletAddresses, updateWalletAddress, copyToClipboard } = useWallets();
  const rawRole = (user as any)?.role;
  const currentRole = ((user as any)?.userType === "admin"
    ? "admin"
    : (rawRole && rawRole !== "user" ? rawRole : "user")) as string;
  const allowedTabs = ROLE_TABS[currentRole] || [];
  const isFullAdmin = currentRole === "admin" || (user as any)?.userType === "admin";
  const canManageContent = isFullAdmin || currentRole === "content_editor";
  const canModerate = isFullAdmin || currentRole === "moderator";
  const canManageStore = isFullAdmin || currentRole === "store_manager";
  const canManageP2P = isFullAdmin || currentRole === "store_manager" || currentRole === "moderator";
  const hasDashboardAccess = allowedTabs.length > 0;
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isEditCampaignDialogOpen, setIsEditCampaignDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isBlogDialogOpen, setIsBlogDialogOpen] = useState(false);
  const [isEditWalletDialogOpen, setIsEditWalletDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<{type: string, address: string} | null>(null);

  // Course management state
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  // Shop management state
  const [isShopProductDialogOpen, setIsShopProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Admin credentials state
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);

  // Tasks management state
  const [isAdminTaskDialogOpen, setIsAdminTaskDialogOpen] = useState(false);
  const [editingAdminTask, setEditingAdminTask] = useState<any>(null);
  const [taskImageFile, setTaskImageFile] = useState<File | null>(null);
  const [taskImagePreview, setTaskImagePreview] = useState<string | null>(null);
  const [submissionsViewCampaignId, setSubmissionsViewCampaignId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectingSubmissionId, setRejectingSubmissionId] = useState<string | null>(null);
  const [adminTaskForm, setAdminTaskForm] = useState({
    title: "", description: "", category: "Social Media", reward: "", totalSlots: "10",
    estimatedTime: "30 min", deadline: "", requirements: "", platform: "", brandName: "Taskdrip Official",
    instructionVideoUrl: "",
  });

  // Payment methods state
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);
  const [conversationDrawer, setConversationDrawer] = useState<{ open: boolean; type: "campaign" | "direct_hire"; id: string; title: string } | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any>(null);
  const [paymentMethodForm, setPaymentMethodForm] = useState<any>({ type: "crypto", label: "", network: "", currency: "", address: "", bankName: "", accountName: "", accountNumber: "", routingNumber: "", swiftCode: "", bankCountry: "", bankCurrency: "", paypalEmail: "", paypalClientId: "", paystackPublicKey: "", paystackSecretKey: "", stripePublicKey: "", stripeSecretKey: "", instructions: "", isActive: true, sortOrder: 0 });
  const [feedPostForm, setFeedPostForm] = useState({ content: "", imageUrl: "", videoUrl: "" });

  // Proof preview modal state
  const [proofModal, setProofModal] = useState<{open: boolean; url?: string; txHash?: string; network?: string; amount?: string; label?: string}>({ open: false });

  // Forms
  const blogForm = useForm({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      content: "",
      status: "draft" as const,
      category: "",
      featuredImage: "",
      excerpt: "",
      metaDescription: "",
      seoKeywords: "",
      readingTime: 5,
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

  const courseForm = useForm({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      isFree: false, isPublished: false, isFeatured: false, level: "beginner",
      title: "", description: "", category: "", thumbnail: "", price: "", shortDescription: "",
      duration: "", lessonsCount: 0, whatYouLearn: "", requirements: "",
    },
  });

  const shopProductForm = useForm({
    resolver: zodResolver(shopProductSchema),
    defaultValues: {
      isFree: false, isFeatured: false, isActive: true,
      title: "", description: "", category: "software", type: "software",
      price: "0.00", featuredImage: "", demoUrl: "", downloadUrl: "",
      documentationUrl: "", features: "", requirements: "", tags: "",
    },
  });

  const adminCredentialsForm = useForm({
    resolver: zodResolver(adminCredentialsSchema),
    defaultValues: { currentPassword: "", newEmail: "", newPassword: "", confirmPassword: "" },
  });

  // Data fetching with proper admin endpoints
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isFullAdmin,
    retry: false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/admin/campaigns"],
    enabled: isFullAdmin || canModerate,
    retry: false,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/admin/transactions"],
    enabled: isFullAdmin,
    retry: false,
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["/api/admin/blog"],
    enabled: canManageContent,
    retry: false,
  });

  const { data: escrowPayments = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/escrow-payments"],
    enabled: isFullAdmin || canModerate,
    retry: false,
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["/api/courses/admin/all"],
    enabled: isFullAdmin,
    retry: false,
  });

  const { data: courseEnrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/courses/admin/enrollments"],
    enabled: isFullAdmin,
    retry: false,
  });

  const { data: shopProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/shop/products"],
    enabled: canManageStore,
    retry: false,
  });

  const { data: adminFeedPosts = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/feed-posts"],
    enabled: canManageContent || canModerate,
    retry: false,
  });

  const { data: adminDirectHires = [], refetch: refetchDirectHires } = useQuery<any[]>({
    queryKey: ["/api/admin/direct-hire"],
    enabled: isFullAdmin || canModerate,
    retry: false,
  });

  const [directHireNoteMap, setDirectHireNoteMap] = useState<Record<string, string>>({});

  const activateDirectHireMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      (await apiRequest("PATCH", `/api/admin/direct-hire/${id}/activate`, { note })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/direct-hire"] });
      toast({ title: "Project Activated!", description: "Payment confirmed and project is now live." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectDirectHirePaymentMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      (await apiRequest("PATCH", `/api/admin/direct-hire/${id}/reject-payment`, { note })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/direct-hire"] });
      toast({ title: "Payment Rejected", description: "Brand has been notified to resubmit proof." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Admin mutations
  const createBlogPost = useMutation({
    mutationFn: async (data: z.infer<typeof blogPostSchema>) => {
      const postData = {
        title: data.title,
        content: data.content,
        status: data.status,
        isPublished: data.status === 'published',
        category: data.category || 'general',
        featuredImage: data.featuredImage || null,
        excerpt: data.excerpt || data.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        metaDescription: data.metaDescription || null,
        seoKeywords: data.seoKeywords || null,
        readingTime: data.readingTime || 5,
      };
      const res = await apiRequest("POST", "/api/admin/blog", postData);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      blogForm.reset();
      toast({
        title: "Success",
        description: `Blog post ${data.isPublished ? 'published' : 'saved as draft'} successfully`,
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
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      campaignForm.reset();
      setIsCampaignDialogOpen(false);
      toast({ title: "Campaign created successfully" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/campaigns/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsEditCampaignDialogOpen(false);
      setEditingCampaign(null);
      toast({ title: "Campaign updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Payment methods queries & mutations
  const { data: paymentMethodsList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/payment-methods"],
    enabled: isFullAdmin,
  });

  const createPaymentMethodMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/admin/payment-methods", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setIsPaymentMethodDialogOpen(false);
      setEditingPaymentMethod(null);
      toast({ title: "Payment method saved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => (await apiRequest("PATCH", `/api/admin/payment-methods/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setIsPaymentMethodDialogOpen(false);
      setEditingPaymentMethod(null);
      toast({ title: "Payment method updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/payment-methods/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Payment method deleted" });
    },
  });

  const createFeedPostMutation = useMutation({
    mutationFn: async (data: typeof feedPostForm) => {
      const res = await apiRequest("POST", "/api/admin/feed-posts", {
        content: data.content,
        imageUrl: data.imageUrl || null,
        videoUrl: data.videoUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setFeedPostForm({ content: "", imageUrl: "", videoUrl: "" });
      toast({ title: "Feed post published", description: "Your admin post is now featured on the Feed page." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteFeedPostMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/feed-posts/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Feed post deleted" });
    },
  });

  const seedDemoCampaignsMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/seed-demo-campaigns", {})).json(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Demo campaigns seeded!", description: data.message });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Tasks management queries ────────────────────────────────────────────────
  const { data: allSubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/all-submissions"],
    enabled: isFullAdmin || canModerate,
    retry: false,
  });

  const createAdminTask = useMutation({
    mutationFn: async (data: typeof adminTaskForm & { imageFile?: File | null }) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (k !== "imageFile" && v) fd.append(k, v as string); });
      if (data.imageFile) fd.append("featureImage", data.imageFile);
      const res = await fetch("/api/admin/campaigns", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsAdminTaskDialogOpen(false);
      setEditingAdminTask(null);
      setTaskImageFile(null);
      setTaskImagePreview(null);
      setAdminTaskForm({ title: "", description: "", category: "Social Media", reward: "", totalSlots: "10", estimatedTime: "30 min", deadline: "", requirements: "", platform: "", brandName: "Taskdrip Official", instructionVideoUrl: "" });
      toast({ title: "✅ Task created!", description: "Task is now live on the Tasks page." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateAdminTask = useMutation({
    mutationFn: async ({ id, data, imageFile }: { id: string; data: any; imageFile?: File | null }) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") fd.append(k, String(v)); });
      if (imageFile) fd.append("featureImage", imageFile);
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "PUT", credentials: "include", body: fd });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsAdminTaskDialogOpen(false);
      setEditingAdminTask(null);
      setTaskImageFile(null);
      setTaskImagePreview(null);
      toast({ title: "✅ Task updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteAdminTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/campaigns/${id}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Task deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleCampaignSpotlight = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/campaigns/${id}/spotlight`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: data.isFeatured ? "⭐ Added to Spotlight" : "Removed from Spotlight" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveTaskSubmission = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/task-submissions/${id}/approve`, { notes });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "✅ Submission Approved!", description: "Influencer has been paid." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectTaskSubmission = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/task-submissions/${id}/reject`, { notes });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-submissions"] });
      setRejectingSubmissionId(null);
      setRejectNotes("");
      toast({ title: "Submission Rejected", description: "Influencer has been notified." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveParticipationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/participations/${id}/approve`, {});
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "✅ Application Approved", description: "Influencer can now work on this task." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectParticipationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/participations/${id}/reject`, {});
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Application Rejected" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteBlogPost = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/admin/blog/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Success", description: "Blog post deleted successfully" });
    },
  });

  const approveEscrow = useMutation({
    mutationFn: async (escrowId: string) => {
      const res = await apiRequest("PUT", `/api/admin/escrow-payments/${escrowId}/approve`, {});
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/escrow-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "✅ Approved!", description: "Payment verified and campaign activated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectEscrow = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("PUT", `/api/admin/escrow-payments/${id}/reject`, { reason });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/escrow-payments"] });
      toast({ title: "Rejected", description: "Payment rejected and brand notified" });
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

  const grantRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role updated",
        description: "The user's dashboard access has been changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Role update failed",
        description: error.message,
        variant: "destructive",
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

  // Course mutations
  const saveCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        price: data.isFree ? "0.00" : (data.price || "0.00"),
        lessonsCount: data.lessonsCount || 0,
        whatYouLearn: data.whatYouLearn ? data.whatYouLearn.split("\n").filter(Boolean) : [],
        requirements: data.requirements ? data.requirements.split("\n").filter(Boolean) : [],
      };
      const method = editingCourse ? "PATCH" : "POST";
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : "/api/courses";
      const res = await apiRequest(method, url, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: editingCourse ? "Course updated!" : "Course created!" });
      setIsCourseDialogOpen(false);
      setEditingCourse(null);
      courseForm.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/courses/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/all"] });
      toast({ title: "Course deleted" });
    },
  });

  const approveEnrollmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/courses/enrollments/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses/admin/enrollments"] });
      toast({ title: "Enrollment approved!" });
    },
  });

  // Shop product mutations
  const saveProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        price: data.isFree ? "0.00" : data.price,
        originalPrice: data.originalPrice || null,
        features: data.features ? data.features.split("\n").filter(Boolean) : [],
        requirements: data.requirements ? data.requirements.split("\n").filter(Boolean) : [],
        tags: data.tags ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      };
      const method = editingProduct ? "PUT" : "POST";
      const url = editingProduct ? `/api/admin/shop/products/${editingProduct.id}` : "/api/admin/shop/products";
      const res = await apiRequest(method, url, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      toast({ title: editingProduct ? "Product updated!" : "Product created!" });
      setIsShopProductDialogOpen(false);
      setEditingProduct(null);
      shopProductForm.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/shop/products/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      toast({ title: "Product deleted" });
    },
  });

  // Admin credentials mutation
  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/admin/credentials", {
        currentPassword: data.currentPassword,
        newEmail: data.newEmail || undefined,
        newPassword: data.newPassword || undefined,
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Credentials updated", description: "Your login details have been changed successfully." });
      setIsCredentialsDialogOpen(false);
      adminCredentialsForm.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEditCourse = (course: any) => {
    setEditingCourse(course);
    courseForm.reset({
      title: course.title, description: course.description,
      shortDescription: course.shortDescription || "",
      category: course.category, thumbnail: course.thumbnail || "",
      price: course.price || "0.00", isFree: course.isFree, level: course.level,
      duration: course.duration || "", lessonsCount: course.lessonsCount || 0,
      whatYouLearn: (course.whatYouLearn || []).join("\n"),
      requirements: (course.requirements || []).join("\n"),
      isPublished: course.isPublished, isFeatured: course.isFeatured,
    });
    setIsCourseDialogOpen(true);
  };

  const openEditProduct = (product: any) => {
    setEditingProduct(product);
    shopProductForm.reset({
      title: product.title, description: product.description,
      shortDescription: product.shortDescription || "",
      price: product.price, originalPrice: product.originalPrice || "",
      category: product.category, type: product.type,
      featuredImage: product.featuredImage || "", demoUrl: product.demoUrl || "",
      downloadUrl: product.downloadUrl || "", documentationUrl: product.documentationUrl || "",
      features: (product.features || []).join("\n"),
      requirements: (product.requirements || []).join("\n"),
      tags: (product.tags || []).join(", "),
      isFree: product.isFree, isFeatured: product.isFeatured, isActive: product.isActive,
    });
    setIsShopProductDialogOpen(true);
  };

  useEffect(() => {
    if (hasDashboardAccess && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, allowedTabs, hasDashboardAccess]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!hasDashboardAccess) {
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

  // Computed stats
  const totalCreators = (users as any[]).filter((u: any) => u.userType === 'creator').length;
  const totalBrands = (users as any[]).filter((u: any) => u.userType === 'brand').length;
  const verifiedCreators = (users as any[]).filter((u: any) => u.userType === 'creator' && u.isVerified).length;
  const kycApproved = (users as any[]).filter((u: any) => u.isKycApproved).length;
  const completedCampaigns = (campaigns as any[]).filter((c: any) => c.status === 'completed').length;
  const pendingCampaigns = (campaigns as any[]).filter((c: any) => c.status === 'pending').length;
  const totalEscrow = (escrowPayments as any[]).reduce((s: number, p: any) => s + parseFloat(p.amount || '0'), 0);
  const publishedCourses = (courses as any[]).filter((c: any) => c.isPublished).length;
  const publishedPosts = (blogPosts as any[]).filter((p: any) => p.isPublished || p.status === 'published').length;
  const activeProducts = (shopProducts as any[]).filter((p: any) => p.isActive).length;

  return (
    <div className="min-h-screen bg-[#07070f] w-full overflow-x-hidden">
      <Navigation />

      {/* ── PROOF PREVIEW MODAL ── */}
      <Dialog open={proofModal.open} onOpenChange={(o) => setProofModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-2xl w-full bg-gray-900 border border-gray-700 text-white rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-700 bg-gray-900">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Payment Proof — {proofModal.label || "Submission"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {proofModal.amount && (
              <div className="flex items-center gap-3 bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-3">
                <DollarSign className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-green-400 font-medium uppercase tracking-wide">Escrow Amount</p>
                  <p className="text-lg font-bold text-green-300">${proofModal.amount} USDT</p>
                </div>
              </div>
            )}
            {proofModal.txHash && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Link className="w-3 h-3" /> Transaction Hash
                </p>
                <p className="font-mono text-sm text-blue-300 break-all leading-relaxed">{proofModal.txHash}</p>
                {proofModal.network && (
                  <p className="text-xs text-gray-400 mt-2">Network: <span className="text-gray-200 font-medium">{proofModal.network.toUpperCase()}</span></p>
                )}
              </div>
            )}
            {proofModal.url && (
              <div className="space-y-3">
                <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Image className="w-3 h-3" /> Payment Screenshot
                </p>
                {/\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(proofModal.url) || proofModal.url.startsWith("data:image") ? (
                  <div className="rounded-xl overflow-hidden border border-gray-700 bg-black">
                    <img
                      src={proofModal.url}
                      alt="Payment proof"
                      className="w-full max-h-96 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 text-center">
                    <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-300 mb-1">Non-image file submitted</p>
                    <p className="text-xs text-gray-500 break-all">{proofModal.url}</p>
                  </div>
                )}
                <a
                  href={proofModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors border border-blue-700/40 rounded-lg px-3 py-2 bg-blue-900/20 hover:bg-blue-900/40"
                >
                  <ExternalLink className="w-4 h-4" /> Open original in new tab
                </a>
              </div>
            )}
            {!proofModal.url && !proofModal.txHash && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="text-sm">No proof details available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-full px-3 sm:px-5 lg:px-8 py-6 sm:py-8 pb-20 overflow-x-hidden">

        {/* ── HERO HEADER ── */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-gray-900 via-purple-950/40 to-gray-900 border border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.18),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl flex-shrink-0">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 rounded-full">Admin Control Center</span>
                    <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      All Systems Live
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white mb-0.5">Master Admin Dashboard</h1>
                  <p className="text-gray-400 text-sm">Complete platform management — users, campaigns, payments, content</p>
                  {!isFullAdmin && (
                    <Badge className="mt-3 bg-purple-600/20 text-purple-200 border border-purple-500/30">
                      {ROLE_LABELS[currentRole] || currentRole} dashboard
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 rounded-xl shadow-lg hover:opacity-90">
                      <Plus className="h-4 w-4 mr-1.5" /> New Campaign
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Button variant="outline" size="sm" className="rounded-xl border-white/20 text-white hover:bg-white/10 bg-white/5">
                  <Download className="h-4 w-4 mr-1.5" /> Export
                </Button>
              </div>
            </div>

            {/* Top 4 hero stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
              {[
                { label: "Total Users", value: users.length, sub: `${totalCreators} influencers · ${totalBrands} brands`, icon: <Users className="w-5 h-5" />, color: "from-blue-500 to-cyan-500" },
                { label: "Platform Revenue", value: `$${totalRevenue >= 1000 ? (totalRevenue/1000).toFixed(1)+'K' : totalRevenue.toFixed(0)}`, sub: `${(transactions as any[]).filter((t:any)=>t.status==='completed').length} completed txns`, icon: <DollarSign className="w-5 h-5" />, color: "from-green-500 to-emerald-500" },
                { label: "Pending Actions", value: pendingPayments.length + unverifiedUsers.length, sub: `${pendingPayments.length} payments · ${unverifiedUsers.length} verifications`, icon: <Clock className="w-5 h-5" />, color: "from-orange-500 to-amber-500" },
                { label: "Active Campaigns", value: activeCampaigns.length, sub: `${completedCampaigns} completed · ${pendingCampaigns} pending`, icon: <Target className="w-5 h-5" />, color: "from-purple-500 to-violet-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3 shadow-lg`}>
                    {s.icon}
                  </div>
                  <div className="text-2xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search users, campaigns, transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 rounded-xl focus-visible:ring-purple-500/40"
            />
          </div>
          <Button variant="outline" size="sm" className="border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl bg-gray-900">
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>
        </div>

        {/* ── MAIN CONTENT ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-auto pb-2 mb-6">
            <TabsList className="flex w-max bg-gray-900 border border-gray-800 rounded-2xl p-1 gap-0.5 h-auto">
              {[
                { value: "overview", icon: <Shield className="h-3.5 w-3.5" />, label: "Overview" },
                { value: "users", icon: <Users className="h-3.5 w-3.5" />, label: `Users (${totalUsers})` },
                { value: "campaigns", icon: <Target className="h-3.5 w-3.5" />, label: "Campaigns" },
                { value: "tasks", icon: <CheckSquare className="h-3.5 w-3.5" />, label: "Tasks Mgmt" },
                { value: "networks", icon: <Globe className="h-3.5 w-3.5" />, label: "Networks" },
                { value: "payments", icon: <DollarSign className="h-3.5 w-3.5" />, label: "Payments" },
                { value: "direct-hires", icon: <Briefcase className="h-3.5 w-3.5" />, label: "Direct Hires" },
                { value: "p2p", icon: <Store className="h-3.5 w-3.5" />, label: "P2P Market" },
                { value: "feed", icon: <Send className="h-3.5 w-3.5" />, label: "Feed" },
                { value: "blog", icon: <BookOpen className="h-3.5 w-3.5" />, label: "Blog" },
                { value: "courses", icon: <GraduationCap className="h-3.5 w-3.5" />, label: "BreedSkool" },
                { value: "shop", icon: <ShoppingBag className="h-3.5 w-3.5" />, label: "Shop" },
                { value: "social-channels", icon: <Link2 className="h-3.5 w-3.5" />, label: "Channels" },
                { value: "push-notifications", icon: <Bell className="h-3.5 w-3.5" />, label: "Push Notify" },
                { value: "analytics", icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Analytics" },
                { value: "settings", icon: <Settings className="h-3.5 w-3.5" />, label: "Settings" },
                { value: "pwa", icon: <Smartphone className="h-3.5 w-3.5" />, label: "PWA" },
                { value: "hero-sliders", icon: <Image className="h-3.5 w-3.5" />, label: "Hero Sliders" },
                { value: "payout-center", icon: <DollarSign className="h-3.5 w-3.5" />, label: "Payouts" },
                { value: "content-editor", icon: <Edit className="h-3.5 w-3.5" />, label: "Content Editor" },
                { value: "leaderboard", icon: <Trophy className="h-3.5 w-3.5" />, label: "Leaderboard" },
              ].filter((tab) => allowedTabs.includes(tab.value)).map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap text-gray-500 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5 pb-8">

            {/* ── ROW 1: 8 secondary KPI cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: "Influencers", value: totalCreators, icon: "🎨", color: "border-orange-500/30 bg-orange-500/5" },
                { label: "Brands", value: totalBrands, icon: "🏢", color: "border-blue-500/30 bg-blue-500/5" },
                { label: "Verified", value: verifiedCreators, icon: "✅", color: "border-green-500/30 bg-green-500/5" },
                { label: "KYC Done", value: kycApproved, icon: "🛡️", color: "border-teal-500/30 bg-teal-500/5" },
                { label: "Blog Posts", value: publishedPosts, icon: "📝", color: "border-purple-500/30 bg-purple-500/5" },
                { label: "Courses", value: publishedCourses, icon: "🎓", color: "border-violet-500/30 bg-violet-500/5" },
                { label: "Products", value: activeProducts, icon: "📦", color: "border-pink-500/30 bg-pink-500/5" },
                { label: "Enrollments", value: courseEnrollments.length, icon: "📚", color: "border-cyan-500/30 bg-cyan-500/5" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border ${s.color} p-3.5 text-center`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── ROW 2: Priority Actions + Recent Activity ── */}
            <div className="grid lg:grid-cols-3 gap-5">

              {/* Priority Actions */}
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-white">Priority Actions Required</h3>
                  {(pendingPayments.length + unverifiedUsers.length) > 0 && (
                    <span className="ml-auto text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2.5 py-0.5">
                      {pendingPayments.length + unverifiedUsers.length} pending
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {pendingPayments.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-yellow-200 text-sm">{pendingPayments.length} Pending Payments</p>
                          <p className="text-xs text-yellow-500 mt-0.5">Total: ${(pendingPayments as any[]).reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0).toFixed(2)} awaiting approval</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('payments')} className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-xl text-xs">Review</Button>
                    </div>
                  )}
                  {unverifiedUsers.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-200 text-sm">{unverifiedUsers.length} Unverified Users</p>
                          <p className="text-xs text-red-500 mt-0.5">Awaiting identity verification</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('users')} className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs">Review</Button>
                    </div>
                  )}
                  {pendingCampaigns > 0 && (
                    <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Target className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-blue-200 text-sm">{pendingCampaigns} Campaigns Pending</p>
                          <p className="text-xs text-blue-500 mt-0.5">Awaiting activation or review</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('campaigns')} className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-xs">Review</Button>
                    </div>
                  )}
                  {pendingPayments.length === 0 && unverifiedUsers.length === 0 && pendingCampaigns === 0 && (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="h-7 w-7 text-green-400" />
                      </div>
                      <p className="text-white font-semibold">All Clear!</p>
                      <p className="text-sm text-gray-500 mt-1">No pending actions require attention</p>
                    </div>
                  )}
                </div>

                {/* Platform health strip */}
                <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-800">
                  <div className="text-center">
                    <div className="text-sm font-black text-green-400">Operational</div>
                    <div className="text-xs text-gray-600 mt-0.5">Platform Status</div>
                  </div>
                  <div className="text-center border-x border-gray-800">
                    <div className="text-sm font-black text-white">{totalUsers > 0 ? Math.round((verifiedCreators / Math.max(totalCreators,1)) * 100) : 0}%</div>
                    <div className="text-xs text-gray-600 mt-0.5">Verification Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-black text-white">${totalEscrow >= 1000 ? (totalEscrow/1000).toFixed(1)+'K' : totalEscrow.toFixed(0)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">In Escrow</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white">Recent Activity</h3>
                </div>
                <div className="space-y-0 flex-1 overflow-y-auto max-h-72">
                  {[
                    ...(users as any[]).slice(-6).map((u: any) => ({ type: 'user', label: `${u.email || 'New user'} joined`, sub: u.userType, dot: 'bg-blue-500' })),
                    ...(campaigns as any[]).slice(-4).map((c: any) => ({ type: 'campaign', label: c.title, sub: `Campaign · ${c.status}`, dot: 'bg-purple-500' })),
                    ...(transactions as any[]).slice(-4).map((t: any) => ({ type: 'txn', label: `$${parseFloat(t.amount || '0').toFixed(2)} ${t.type || 'payment'}`, sub: t.status, dot: t.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500' })),
                  ].slice(0, 10).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 py-2.5 border-b border-gray-800/60 last:border-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${item.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{item.label}</p>
                        <p className="text-xs text-gray-600 capitalize">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                  {(users as any[]).length === 0 && (campaigns as any[]).length === 0 && (
                    <div className="text-center py-8 text-gray-600">
                      <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No activity yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── ROW 3: Module Overview Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Users Tab", icon: <Users className="w-5 h-5" />, value: `${totalUsers} total`, color: "from-blue-600 to-blue-700", tab: "users" },
                { label: "Campaigns", icon: <Target className="w-5 h-5" />, value: `${campaigns.length} total`, color: "from-purple-600 to-violet-700", tab: "campaigns" },
                { label: "Payments", icon: <Wallet className="w-5 h-5" />, value: `${transactions.length} txns`, color: "from-green-600 to-emerald-700", tab: "payments" },
                { label: "Blog", icon: <BookOpen className="w-5 h-5" />, value: `${blogPosts.length} posts`, color: "from-pink-600 to-rose-700", tab: "blog" },
                { label: "BreedSkool", icon: <GraduationCap className="w-5 h-5" />, value: `${courses.length} courses`, color: "from-violet-600 to-purple-700", tab: "courses" },
                { label: "Shop", icon: <ShoppingBag className="w-5 h-5" />, value: `${shopProducts.length} products`, color: "from-orange-600 to-amber-700", tab: "shop" },
              ].map((m) => (
                <button
                  key={m.tab}
                  onClick={() => setActiveTab(m.tab)}
                  className={`rounded-2xl bg-gradient-to-br ${m.color} p-4 text-left hover:opacity-90 hover:scale-[1.02] transition-all group shadow-lg`}
                >
                  <div className="text-white mb-3">{m.icon}</div>
                  <div className="text-white font-black text-lg leading-none">{m.value}</div>
                  <div className="text-white/70 text-xs mt-1 font-medium">{m.label}</div>
                  <div className="text-white/40 text-xs mt-2 group-hover:text-white/60 transition-colors">Click to manage →</div>
                </button>
              ))}
            </div>

            {/* ── ROW 4: New Admin Hubs ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="/admin/payments" className="group">
                <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/30 hover:border-purple-500/60 p-5 flex items-center gap-4 transition-all hover:shadow-lg hover:shadow-purple-900/20">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">Payment Control Center</p>
                    <p className="text-xs text-gray-500 mt-0.5">Manage all payment methods, crypto wallets, Stripe, PayPal, bank transfers, and feature access toggles</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                </div>
              </a>
              <a href="/admin/ads" className="group">
                <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-blue-500/30 hover:border-blue-500/60 p-5 flex items-center gap-4 transition-all hover:shadow-lg hover:shadow-blue-900/20">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">Ads Control Center</p>
                    <p className="text-xs text-gray-500 mt-0.5">Manage sponsored ads, Google AdSense integration, placement slots, and advertising applications</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                </div>
              </a>
              <a href="/admin/email" className="group">
                <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500/30 hover:border-green-500/60 p-5 flex items-center gap-4 transition-all hover:shadow-lg hover:shadow-green-900/20">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">Email Marketing CRM</p>
                    <p className="text-xs text-gray-500 mt-0.5">Blast campaigns, AI auto-responders, SMTP/IMAP config, domain management, and email analytics</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-green-400 transition-colors flex-shrink-0" />
                </div>
              </a>
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
                          <div className="flex flex-col gap-1">
                            <Badge variant={user.userType === 'admin' ? 'default' : user.userType === 'brand' ? 'secondary' : 'outline'}>
                              {user.userType}
                            </Badge>
                            <Badge variant="outline" className="w-fit text-xs border-purple-200 text-purple-700 bg-purple-50">
                              {ROLE_LABELS[user.role || 'user'] || user.role || 'Basic User'}
                            </Badge>
                          </div>
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
                            <Select
                              value={user.role || "user"}
                              onValueChange={(role) => grantRole.mutate({ userId: user.id, role })}
                              disabled={grantRole.isPending}
                            >
                              <SelectTrigger className="h-8 w-[150px]" data-testid={`select-role-${user.id}`}>
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Basic User</SelectItem>
                                <SelectItem value="content_editor">Content Editor</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="store_manager">Store Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                                {/* Legacy toolbar - hidden now */}
                                <div className="hidden">
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
                                
                                {/* Rich Text Editor */}
                                <RichTextEditor
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  placeholder="Start writing your engaging blog post here..."
                                />
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
                      
                      {/* SEO Fields */}
                      <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/50 space-y-4">
                        <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                          🔍 SEO & Metadata
                        </p>
                        <FormField
                          control={blogForm.control}
                          name="excerpt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Post Excerpt</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="A brief summary shown in post previews and social shares (150-200 chars)..."
                                  className="min-h-[70px] resize-none text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={blogForm.control}
                          name="metaDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Meta Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="SEO meta description for search engines (150-160 chars recommended)..."
                                  className="min-h-[70px] resize-none text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={blogForm.control}
                            name="seoKeywords"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">SEO Keywords</FormLabel>
                                <FormControl>
                                  <Input placeholder="crypto, taskdrip, earn..." {...field} className="text-sm" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={blogForm.control}
                            name="readingTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Reading Time (min)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    placeholder="5"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                                    className="text-sm"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
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
              <div className="flex gap-2 flex-wrap">
                {campaigns.length === 0 && (
                  <Button variant="outline" onClick={() => seedDemoCampaignsMutation.mutate()} disabled={seedDemoCampaignsMutation.isPending} className="border-dashed border-violet-300 text-violet-700 hover:bg-violet-50">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {seedDemoCampaignsMutation.isPending ? "Seeding..." : "Load Demo Campaigns"}
                  </Button>
                )}
                <Button onClick={() => setIsCampaignDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Campaigns ({campaigns.length})</CardTitle>
                <CardDescription>Monitor, edit, and manage platform campaigns. Use the Edit button to update content shown on the homepage.</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="font-semibold">No campaigns yet</p>
                    <p className="text-sm mb-4">Load demo campaigns to get started or create your own</p>
                    <Button variant="outline" onClick={() => seedDemoCampaignsMutation.mutate()} disabled={seedDemoCampaignsMutation.isPending} className="border-violet-300 text-violet-700 hover:bg-violet-50">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {seedDemoCampaignsMutation.isPending ? "Loading..." : "Load 6 Demo Campaigns"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign: any) => (
                      <div key={campaign.id} className="border rounded-xl p-4 hover:shadow-md transition-all bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-semibold text-gray-900 truncate">{campaign.title}</p>
                              <Badge className={
                                campaign.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                                campaign.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              } variant="outline">
                                {campaign.status?.replace('_', ' ')}
                              </Badge>
                              {campaign.isActive && <Badge className="bg-green-600 text-white text-xs">LIVE</Badge>}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1 mb-2">{campaign.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>💰 ${campaign.reward}</span>
                              <span>👥 {campaign.filledSlots || 0}/{campaign.totalSlots} slots</span>
                              <span>🏷 {campaign.category}</span>
                              <span>📅 {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '—'}</span>
                              {campaign.escrowPayment && (
                                <span className={`font-medium ${campaign.escrowPayment.status === 'verified' ? 'text-green-600' : campaign.escrowPayment.status === 'submitted' ? 'text-orange-600' : 'text-gray-400'}`}>
                                  💳 Escrow: {campaign.escrowPayment.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setEditingCampaign(campaign); setIsEditCampaignDialogOpen(true); }} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button variant="outline" size="sm"
                              onClick={() => setConversationDrawer({ open: true, type: "campaign", id: campaign.id, title: campaign.title })}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                              data-testid={`btn-view-thread-${campaign.id}`}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" /> Thread
                            </Button>
                            {campaign.escrowPayment?.status === 'submitted' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveEscrow.mutate(campaign.escrowPayment.id)} disabled={approveEscrow.isPending}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TASKS MANAGEMENT TAB ─────────────────────────────────────────── */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">Tasks Management</h2>
                <p className="text-gray-500 text-sm mt-1">Create, edit, and publish tasks — review applications & submissions, and release payments.</p>
              </div>
              <Button
                onClick={() => {
                  setEditingAdminTask(null);
                  setTaskImageFile(null); setTaskImagePreview(null);
                  setAdminTaskForm({ title: "", description: "", category: "Social Media", reward: "", totalSlots: "10", estimatedTime: "30 min", deadline: "", requirements: "", platform: "", brandName: "Taskdrip Official", instructionVideoUrl: "" });
                  setIsAdminTaskDialogOpen(true);
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Create New Task
              </Button>
            </div>

            {/* Interaction Flow Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Active Tasks", value: (campaigns as any[]).filter((c: any) => c.isActive).length, color: "bg-green-500", icon: "🎯" },
                { label: "Pending Escrow", value: (escrowPayments as any[]).filter((e: any) => e.status === 'submitted').length, color: "bg-yellow-500", icon: "⏳" },
                { label: "Submissions", value: allSubmissions.length, color: "bg-blue-500", icon: "📋" },
                { label: "Pending Review", value: allSubmissions.filter((s: any) => s.status === 'submitted' || s.status === 'under_review').length, color: "bg-orange-500", icon: "🔍" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{stat.icon}</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Escrow Activation Flow */}
            {(escrowPayments as any[]).filter((e: any) => e.status === 'submitted').length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-yellow-800 flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5" /> Brand Payments Awaiting Verification ({(escrowPayments as any[]).filter((e: any) => e.status === 'submitted').length})
                  </CardTitle>
                  <p className="text-sm text-yellow-700">Verify payment to activate the campaign and allow influencers to apply.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(escrowPayments as any[]).filter((e: any) => e.status === 'submitted').map((ep: any) => (
                    <div key={ep.id} className="bg-white border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{ep.campaign?.title || "Campaign"}</p>
                        <p className="text-xs text-gray-500">Brand: {ep.brandEmail} · Amount: ${ep.amount} · Network: {ep.network || "—"}</p>
                        {ep.transactionHash && <p className="text-xs text-blue-600 font-mono mt-1 truncate">TX: {ep.transactionHash}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveEscrow.mutate(ep.id)} disabled={approveEscrow.isPending}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Verify & Activate
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => rejectEscrow.mutate({ id: ep.id, reason: "Payment could not be verified." })}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Task Submissions Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Task Submissions — Oversight & Mediation
                </CardTitle>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <p className="text-sm text-blue-700 font-medium">Admin Mediator Role</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Brands are the primary reviewers of influencer submissions. As admin, you oversee all submissions and can approve or reject as a mediator if needed — for example, to resolve disputes or when a brand is unresponsive.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {allSubmissions.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No submissions yet</p>
                    <p className="text-sm">Submissions will appear here when influencers complete tasks.</p>
                  </div>
                ) : (
                  allSubmissions.map((sub: any) => (
                    <div key={sub.id} className={`border rounded-xl p-4 ${sub.status === 'approved' ? 'bg-green-50 border-green-200' : sub.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={
                              sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                              sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              sub.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>{sub.status?.replace(/_/g,' ')}</Badge>
                            <span className="font-semibold text-gray-900 text-sm truncate">{sub.title}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            👤 {sub.influencer?.firstName} {sub.influencer?.lastName} · 📌 {sub.campaign?.title}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">{sub.description}</p>
                          {sub.proofUrls && Array.isArray(sub.proofUrls) && sub.proofUrls.length > 0 && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {sub.proofUrls.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800 flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> Proof {i+1}
                                </a>
                              ))}
                            </div>
                          )}
                          {rejectingSubmissionId === sub.id && (
                            <div className="mt-3 flex gap-2">
                              <input
                                className="flex-1 border border-red-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                placeholder="Rejection reason (required)…"
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                              />
                              <Button size="sm" variant="destructive" disabled={!rejectNotes || rejectTaskSubmission.isPending} onClick={() => rejectTaskSubmission.mutate({ id: sub.id, notes: rejectNotes })}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRejectingSubmissionId(null); setRejectNotes(""); }}>Cancel</Button>
                            </div>
                          )}
                        </div>
                        {sub.status !== 'approved' && sub.status !== 'rejected' && (
                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveTaskSubmission.mutate({ id: sub.id })} disabled={approveTaskSubmission.isPending}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve & Pay
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => setRejectingSubmissionId(sub.id)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* All Tasks List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  All Tasks ({(campaigns as any[]).length})
                </CardTitle>
                <p className="text-sm text-gray-500">Manage tasks visible on the /tasks page. Click edit to update content, images, or status.</p>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {(campaigns as any[]).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No tasks yet</p>
                    <Button className="mt-3 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setIsAdminTaskDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Create First Task
                    </Button>
                  </div>
                ) : (
                  (campaigns as any[]).map((campaign: any) => (
                    <div key={campaign.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-all">
                      <div className="flex">
                        {/* Featured image thumbnail */}
                        <div className="w-24 h-24 flex-shrink-0 hidden sm:block bg-gradient-to-br from-purple-100 to-indigo-100">
                          {campaign.featureImage ? (
                            <img src={campaign.featureImage} alt={campaign.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-purple-300">
                              <Image className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-gray-900">{campaign.title}</span>
                                <Badge className={campaign.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                  {campaign.isActive ? '● Live' : '○ Inactive'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">{campaign.category}</Badge>
                                {campaign.status && <Badge variant="outline" className="text-xs capitalize">{campaign.status.replace(/_/g,' ')}</Badge>}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1 mb-2">{campaign.description}</p>
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                <span>💰 ${campaign.reward} USDT</span>
                                <span>👥 {campaign.filledSlots || 0}/{campaign.totalSlots} slots</span>
                                <span>⏱ {campaign.estimatedTime || '—'}</span>
                                <span>🏢 {campaign.brandName}</span>
                                {campaign.deadline && <span>📅 {new Date(campaign.deadline).toLocaleDateString()}</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0 flex-wrap items-start">
                              <Button
                                variant="outline" size="sm"
                                onClick={() => {
                                  setEditingAdminTask(campaign);
                                  setTaskImagePreview(campaign.featureImage || null);
                                  setTaskImageFile(null);
                                  setAdminTaskForm({
                                    title: campaign.title || "",
                                    description: campaign.description || "",
                                    category: campaign.category || "Social Media",
                                    reward: campaign.reward || "",
                                    totalSlots: String(campaign.totalSlots || 10),
                                    estimatedTime: campaign.estimatedTime || "30 min",
                                    deadline: campaign.deadline ? new Date(campaign.deadline).toISOString().split('T')[0] : "",
                                    requirements: Array.isArray(campaign.requirements) ? campaign.requirements.join('\n') : (campaign.requirements || ""),
                                    platform: campaign.platform || "",
                                    brandName: campaign.brandName || "Taskdrip Official",
                                    instructionVideoUrl: campaign.instructionVideoUrl || "",
                                  });
                                  setIsAdminTaskDialogOpen(true);
                                }}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => {
                                  if (confirm(`Delete "${campaign.title}"?`)) deleteAdminTask.mutate(campaign.id);
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                disabled={deleteAdminTask.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => updateAdminTask.mutate({ id: campaign.id, data: { isActive: !campaign.isActive }, imageFile: null })}
                                className={campaign.isActive ? "text-orange-600 border-orange-200" : "text-green-600 border-green-200"}
                              >
                                {campaign.isActive ? <ToggleRight className="h-3.5 w-3.5 mr-1" /> : <ToggleLeft className="h-3.5 w-3.5 mr-1" />}
                                {campaign.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => toggleCampaignSpotlight.mutate(campaign.id)}
                                disabled={toggleCampaignSpotlight.isPending}
                                className={campaign.isFeatured ? "text-yellow-700 border-yellow-300 bg-yellow-50 hover:bg-yellow-100" : "text-gray-500 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700"}
                                data-testid={`btn-spotlight-toggle-${campaign.id}`}
                              >
                                <Star className={`h-3.5 w-3.5 mr-1 ${campaign.isFeatured ? "fill-yellow-500 text-yellow-500" : ""}`} />
                                {campaign.isFeatured ? "Unspotlight" : "Spotlight"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Create/Edit Task Dialog ──────────────────────────────────────────── */}
          <Dialog open={isAdminTaskDialogOpen} onOpenChange={(open) => { if (!open) { setIsAdminTaskDialogOpen(false); setEditingAdminTask(null); setTaskImageFile(null); setTaskImagePreview(null); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  {editingAdminTask ? "Edit Task" : "Create New Task"}
                </DialogTitle>
                <DialogDescription>
                  {editingAdminTask ? "Update task details. Changes appear instantly on the Tasks page." : "Tasks you create are immediately active and visible on the public Tasks page."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Featured Image Upload */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Featured Image</Label>
                  <div className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${taskImagePreview ? 'border-purple-300' : 'border-gray-300 hover:border-purple-400'}`}>
                    {taskImagePreview ? (
                      <div className="relative h-44">
                        <img src={taskImagePreview} alt="preview" className="w-full h-full object-cover" />
                        <label className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-xl bg-white/95 text-gray-800 text-sm font-semibold py-2 cursor-pointer shadow-lg hover:bg-white transition-colors">
                          <Upload className="w-4 h-4" />
                          Change featured image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            data-testid="input-change-task-image"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setTaskImageFile(file);
                                const reader = new FileReader();
                                reader.onload = () => setTaskImagePreview(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <button
                          data-testid="button-remove-task-image"
                          onClick={() => { setTaskImageFile(null); setTaskImagePreview(null); }}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80 transition-colors"
                        >✕</button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-36 cursor-pointer p-4 text-center">
                        <Image className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium text-gray-600">Click to upload featured image</span>
                        <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                        <input
                          data-testid="input-upload-task-image"
                          type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setTaskImageFile(file);
                              const reader = new FileReader();
                              reader.onload = () => setTaskImagePreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium mb-1 block">Task Title *</Label>
                    <Input
                      placeholder="e.g. Post about our crypto token on Twitter"
                      value={adminTaskForm.title}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium mb-1 block">Description *</Label>
                    <textarea
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                      rows={4}
                      placeholder="Describe what influencers need to do, what the brand is about, and any specific tone/style…"
                      value={adminTaskForm.description}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Category *</Label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      value={adminTaskForm.category}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {["Crypto / Blockchain","Web3 & DeFi","NFT & Digital Assets","Social Media","Technology","Gaming","Finance & Investment","Health & Fitness","Fashion & Beauty","Food & Beverage","Travel","Education","Entertainment","Sports","Other"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Platform</Label>
                    <Input
                      placeholder="e.g. Twitter, TikTok, Instagram…"
                      value={adminTaskForm.platform}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, platform: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Reward (USDT) *</Label>
                    <Input
                      type="number" step="0.01" min="0.01"
                      placeholder="e.g. 25.00"
                      value={adminTaskForm.reward}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, reward: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Total Slots *</Label>
                    <Input
                      type="number" min="1"
                      placeholder="e.g. 50"
                      value={adminTaskForm.totalSlots}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, totalSlots: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Estimated Time</Label>
                    <Input
                      placeholder="e.g. 30 min, 1 hour"
                      value={adminTaskForm.estimatedTime}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, estimatedTime: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Deadline</Label>
                    <Input
                      type="date"
                      value={adminTaskForm.deadline}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, deadline: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Brand Name</Label>
                    <Input
                      placeholder="e.g. Taskdrip Official"
                      value={adminTaskForm.brandName}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, brandName: e.target.value }))}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium mb-1 block">Requirements</Label>
                    <textarea
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                      rows={3}
                      placeholder="List requirements e.g. Must have 1000+ followers · Post in English · Use hashtag #Taskdrip"
                      value={adminTaskForm.requirements}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, requirements: e.target.value }))}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium mb-1 block">📹 Instruction Video (YouTube URL)</Label>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      value={adminTaskForm.instructionVideoUrl}
                      onChange={(e) => setAdminTaskForm(f => ({ ...f, instructionVideoUrl: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Add a YouTube video to guide influencers on how to complete this campaign</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    disabled={createAdminTask.isPending || updateAdminTask.isPending || !adminTaskForm.title || !adminTaskForm.reward}
                    onClick={() => {
                      if (editingAdminTask) {
                        updateAdminTask.mutate({ id: editingAdminTask.id, data: adminTaskForm, imageFile: taskImageFile });
                      } else {
                        createAdminTask.mutate({ ...adminTaskForm, imageFile: taskImageFile });
                      }
                    }}
                  >
                    {(createAdminTask.isPending || updateAdminTask.isPending) ? "Saving…" : (editingAdminTask ? "Update Task" : "Publish Task")}
                  </Button>
                  <Button variant="outline" onClick={() => { setIsAdminTaskDialogOpen(false); setEditingAdminTask(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* ════════════════════════════════════════════════════
               PAYMENT NETWORKS TAB
          ════════════════════════════════════════════════════ */}
          <TabsContent value="networks" className="space-y-6">
            <AdminPaymentNetworksPanel />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Payment Management</h2>
            </div>

            {/* Escrow Payment Reviews */}
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Campaign Payment Proofs — Requires Action ({escrowPayments.filter((e: any) => e.status === 'submitted').length} pending)
                </CardTitle>
                <CardDescription>Review payment submissions and approve to activate campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {escrowPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">No escrow payment submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {escrowPayments.map((ep: any) => (
                      <div key={ep.id} className="bg-white border rounded-xl p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-gray-900">{ep.campaign?.title || 'Unknown Campaign'}</span>
                              <Badge variant={ep.status === 'submitted' ? 'secondary' : ep.status === 'verified' ? 'default' : ep.status === 'rejected' ? 'destructive' : 'outline'}>
                                {ep.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">Brand: {ep.brandEmail} · ${ep.amount} escrow</p>
                            {ep.transactionHash && (
                              <p className="text-xs font-mono text-blue-600 mt-1 break-all">TX: {ep.transactionHash}</p>
                            )}
                            {ep.network && <p className="text-xs text-gray-400">Network: {ep.network}</p>}
                            <p className="text-xs text-gray-400">Submitted: {ep.submittedAt ? new Date(ep.submittedAt).toLocaleString() : '—'}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {(ep.paymentScreenshot || ep.transactionHash) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => setProofModal({
                                  open: true,
                                  url: ep.paymentScreenshot,
                                  txHash: ep.transactionHash,
                                  network: ep.network,
                                  amount: ep.amount,
                                  label: ep.campaign?.title || "Campaign Payment",
                                })}
                              >
                                <Eye className="h-4 w-4 mr-1" /> View Proof
                              </Button>
                            )}
                            {ep.status === 'submitted' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                  onClick={() => approveEscrow.mutate(ep.id)}
                                  disabled={approveEscrow.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approve & Activate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 flex-1"
                                  onClick={() => {
                                    const reason = prompt('Rejection reason (optional):') || 'Payment proof is invalid.';
                                    rejectEscrow.mutate({ id: ep.id, reason });
                                  }}
                                  disabled={rejectEscrow.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
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

            {/* ─── Payment Methods Manager ─── */}
            <Card className="border-violet-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-violet-600" /> Payment Methods
                    </CardTitle>
                    <CardDescription>Manage crypto wallets, bank accounts, PayPal, Paystack, and Stripe for checkout</CardDescription>
                  </div>
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={() => { setEditingPaymentMethod(null); setPaymentMethodForm({ type: "crypto", label: "", network: "", currency: "", address: "", bankName: "", accountName: "", accountNumber: "", routingNumber: "", swiftCode: "", bankCountry: "", bankCurrency: "", paypalEmail: "", paystackPublicKey: "", paystackSecretKey: "", stripePublicKey: "", stripeSecretKey: "", instructions: "", isActive: true, sortOrder: 0 }); setIsPaymentMethodDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Add Method
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentMethodsList.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Wallet className="h-10 w-10 mx-auto mb-3" />
                    <p className="font-semibold">No payment methods added yet</p>
                    <p className="text-sm mb-4">Add crypto wallets, bank accounts, or payment gateways that users can pay with</p>
                    <Button variant="outline" onClick={() => { setEditingPaymentMethod(null); setPaymentMethodForm({ type: "crypto", label: "USDT TRC-20", network: "TRC-20", currency: "USDT", address: "", bankName: "", accountName: "", accountNumber: "", routingNumber: "", swiftCode: "", bankCountry: "", bankCurrency: "", paypalEmail: "", paystackPublicKey: "", paystackSecretKey: "", stripePublicKey: "", stripeSecretKey: "", instructions: "", isActive: true, sortOrder: 0 }); setIsPaymentMethodDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Add Your First Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentMethodsList.map((method: any) => (
                      <div key={method.id} className={`border-2 rounded-xl p-4 ${method.isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold ${
                              method.type === 'crypto' ? 'bg-orange-100' :
                              method.type === 'bank' ? 'bg-blue-100' :
                              method.type === 'paypal' ? 'bg-sky-100' :
                              method.type === 'paystack' ? 'bg-green-100' :
                              'bg-purple-100'
                            }`}>
                              {method.type === 'crypto' ? '₿' : method.type === 'bank' ? '🏦' : method.type === 'paypal' ? '🅿' : method.type === 'paystack' ? '🟢' : '💳'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{method.label}</p>
                              <Badge className="text-xs capitalize bg-gray-100 text-gray-600 border-0">{method.type}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setEditingPaymentMethod(method); setPaymentMethodForm({ ...method }); setIsPaymentMethodDialogOpen(true); }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 border-red-200" onClick={() => { if (confirm("Delete this payment method?")) deletePaymentMethodMutation.mutate(method.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {method.type === 'crypto' && (
                          <div className="space-y-1 text-xs text-gray-600">
                            {method.network && <p><span className="font-medium">Network:</span> {method.network}</p>}
                            {method.currency && <p><span className="font-medium">Currency:</span> {method.currency}</p>}
                            {method.address && <p className="font-mono bg-gray-100 px-2 py-1 rounded break-all">{method.address}</p>}
                          </div>
                        )}
                        {method.type === 'bank' && (
                          <div className="space-y-1 text-xs text-gray-600">
                            {method.bankName && <p><span className="font-medium">Bank:</span> {method.bankName}</p>}
                            {method.accountName && <p><span className="font-medium">Account Name:</span> {method.accountName}</p>}
                            {method.accountNumber && <p><span className="font-medium">Account No:</span> {method.accountNumber}</p>}
                            {method.bankCountry && <p><span className="font-medium">Country:</span> {method.bankCountry}</p>}
                          </div>
                        )}
                        {method.type === 'paypal' && method.paypalEmail && (
                          <p className="text-xs text-gray-600"><span className="font-medium">Email:</span> {method.paypalEmail}</p>
                        )}
                        {method.type === 'paystack' && method.paystackPublicKey && (
                          <p className="text-xs text-gray-600 font-mono truncate">pk: {method.paystackPublicKey.slice(0, 20)}...</p>
                        )}
                        {method.type === 'stripe' && method.stripePublicKey && (
                          <p className="text-xs text-gray-600 font-mono truncate">pk: {method.stripePublicKey.slice(0, 20)}...</p>
                        )}
                        {method.instructions && <p className="text-xs text-gray-500 mt-2 italic border-t border-gray-100 pt-2">{method.instructions}</p>}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                          <span className={`text-xs font-medium flex items-center gap-1 ${method.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${method.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                            {method.isActive ? 'Active in checkout' : 'Hidden from checkout'}
                          </span>
                          <Switch checked={method.isActive} onCheckedChange={(v) => updatePaymentMethodMutation.mutate({ id: method.id, data: { isActive: v } })} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feed" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Send className="h-6 w-6 text-violet-600" /> Feed Publishing
                </h2>
                <p className="text-gray-500 text-sm mt-1">Publish official Taskdrip posts directly to the Feed page.</p>
              </div>
              <Button variant="outline" onClick={() => window.open("/feed", "_blank")} data-testid="button-open-feed">
                <ExternalLink className="h-4 w-4 mr-2" /> View Feed
              </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 border-violet-200">
                <CardHeader>
                  <CardTitle>Create Featured Feed Post</CardTitle>
                  <CardDescription>Posts published here appear in the featured admin section on the public feed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Post Content *</Label>
                    <Textarea
                      rows={7}
                      value={feedPostForm.content}
                      onChange={(e) => setFeedPostForm((p) => ({ ...p, content: e.target.value }))}
                      placeholder="Share platform updates, influencer highlights, campaigns, payout announcements..."
                      data-testid="input-feed-post-content"
                    />
                  </div>
                  <div>
                    <Label>Image URL (optional)</Label>
                    <Input
                      value={feedPostForm.imageUrl}
                      onChange={(e) => setFeedPostForm((p) => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      data-testid="input-feed-post-image"
                    />
                  </div>
                  <div>
                    <Label>Video URL (optional)</Label>
                    <Input
                      value={feedPostForm.videoUrl}
                      onChange={(e) => setFeedPostForm((p) => ({ ...p, videoUrl: e.target.value }))}
                      placeholder="https://..."
                      data-testid="input-feed-post-video"
                    />
                  </div>
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={createFeedPostMutation.isPending || feedPostForm.content.trim().length === 0}
                    onClick={() => createFeedPostMutation.mutate(feedPostForm)}
                    data-testid="button-publish-feed-post"
                  >
                    {createFeedPostMutation.isPending ? "Publishing..." : "Publish to Feed"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Feed Posts ({adminFeedPosts.length})</CardTitle>
                  <CardDescription>Official posts are labeled as featured when shown on the Feed page.</CardDescription>
                </CardHeader>
                <CardContent>
                  {adminFeedPosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3" />
                      <p className="font-semibold">No feed posts yet</p>
                      <p className="text-sm">Publish your first platform update from the form.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[650px] overflow-y-auto">
                      {adminFeedPosts.map((post: any) => (
                        <div key={post.id} className="border border-gray-100 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={post.user?.userType === "admin" || post.user?.role === "admin" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700"}>
                                  {post.user?.userType === "admin" || post.user?.role === "admin" ? "Featured by Taskdrip" : "Community"}
                                </Badge>
                                <span className="text-xs text-gray-400">{post.createdAt ? new Date(post.createdAt).toLocaleString() : "Just now"}</span>
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4" data-testid={`text-feed-post-${post.id}`}>{post.content}</p>
                              {post.imageUrl && <p className="text-xs text-blue-600 mt-2 truncate">Image: {post.imageUrl}</p>}
                              {post.videoUrl && <p className="text-xs text-blue-600 mt-1 truncate">Video: {post.videoUrl}</p>}
                              <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-3">
                                <span>{post.viewCount || 0} views</span>
                                <span>{post.likeCount || 0} likes</span>
                                <span>${post.totalTipsReceived || "0.00"} tips</span>
                              </div>
                            </div>
                            {(post.user?.id === user?.id || post.userId === user?.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-200 hover:bg-red-50"
                                disabled={deleteFeedPostMutation.isPending}
                                onClick={() => { if (confirm("Delete this feed post?")) deleteFeedPostMutation.mutate(post.id); }}
                                data-testid={`button-delete-feed-post-${post.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ BREEDSKOOL COURSES TAB ============ */}
          <TabsContent value="courses" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-violet-600" /> BreedSkool Courses
                </h2>
                <p className="text-gray-500 text-sm mt-1">Create and manage courses for the learning platform</p>
              </div>
              <Dialog open={isCourseDialogOpen} onOpenChange={(v) => { setIsCourseDialogOpen(v); if (!v) { setEditingCourse(null); courseForm.reset(); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                    <Plus className="h-4 w-4" /> Add Course
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
                    <DialogDescription>Fill in the details below to {editingCourse ? "update" : "create"} a course.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={courseForm.handleSubmit((d) => saveCourseMutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Course Title *</Label>
                        <Input {...courseForm.register("title")} placeholder="e.g. Instagram Growth Masterclass" />
                        {courseForm.formState.errors.title && <p className="text-red-500 text-xs mt-1">{String(courseForm.formState.errors.title.message)}</p>}
                      </div>
                      <div>
                        <Label>Category *</Label>
                        <Select onValueChange={(v) => courseForm.setValue("category", v)} value={courseForm.watch("category")}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {COURSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Level</Label>
                        <Select onValueChange={(v) => courseForm.setValue("level", v)} value={courseForm.watch("level")}>
                          <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                          <SelectContent>
                            {["beginner","intermediate","advanced"].map((l) => <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Short Description</Label>
                        <Input {...courseForm.register("shortDescription")} placeholder="Brief tagline for the course" />
                      </div>
                      <div className="col-span-2">
                        <Label>Full Description *</Label>
                        <Textarea {...courseForm.register("description")} rows={4} placeholder="Detailed course description..." />
                        {courseForm.formState.errors.description && <p className="text-red-500 text-xs mt-1">{String(courseForm.formState.errors.description.message)}</p>}
                      </div>
                      <div className="col-span-2">
                        <Label>Thumbnail URL</Label>
                        <Input {...courseForm.register("thumbnail")} placeholder="https://..." />
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <Input {...courseForm.register("duration")} placeholder="e.g. 4h 30m" />
                      </div>
                      <div>
                        <Label>Number of Lessons</Label>
                        <Input type="number" {...courseForm.register("lessonsCount", { valueAsNumber: true })} placeholder="0" />
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Switch checked={courseForm.watch("isFree")} onCheckedChange={(v) => courseForm.setValue("isFree", v)} />
                        <Label className="cursor-pointer">Free Course</Label>
                      </div>
                      {!courseForm.watch("isFree") && (
                        <div>
                          <Label>Price (USDT)</Label>
                          <Input {...courseForm.register("price")} placeholder="29.99" />
                        </div>
                      )}
                      <div className="col-span-2">
                        <Label>What You'll Learn (one per line)</Label>
                        <Textarea {...courseForm.register("whatYouLearn")} rows={3} placeholder="Grow from 0 to 10k followers&#10;Master the algorithm" />
                      </div>
                      <div className="col-span-2">
                        <Label>Requirements (one per line)</Label>
                        <Textarea {...courseForm.register("requirements")} rows={2} placeholder="A smartphone or computer" />
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Switch checked={courseForm.watch("isPublished")} onCheckedChange={(v) => courseForm.setValue("isPublished", v)} />
                        <Label>Published</Label>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Switch checked={courseForm.watch("isFeatured")} onCheckedChange={(v) => courseForm.setValue("isFeatured", v)} />
                        <Label>Featured</Label>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white flex-1" disabled={saveCourseMutation.isPending}>
                        {saveCourseMutation.isPending ? "Saving..." : editingCourse ? "Update Course" : "Create Course"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setIsCourseDialogOpen(false); setEditingCourse(null); courseForm.reset(); }}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Courses", value: courses.length, icon: BookOpen, color: "text-violet-600" },
                { label: "Total Students", value: courses.reduce((s: number, c: any) => s + (c.studentsCount || 0), 0), icon: Users, color: "text-blue-600" },
                { label: "Pending Approvals", value: courseEnrollments.filter((e: any) => e.status === "pending_payment").length, icon: Eye, color: "text-amber-600" },
                { label: "Revenue", value: `$${courseEnrollments.filter((e: any) => e.isPaid).reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0).toFixed(2)}`, icon: DollarSign, color: "text-green-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className={`h-8 w-8 ${s.color}`} />
                    <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pending Enrollments */}
            {courseEnrollments.filter((e: any) => e.status === "pending_payment").length > 0 && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-700 flex items-center gap-2">
                    <Eye className="h-5 w-5" /> Pending Payment Approvals ({courseEnrollments.filter((e: any) => e.status === "pending_payment").length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Payment</TableHead><TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseEnrollments.filter((e: any) => e.status === "pending_payment").map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.course?.title || e.courseId}</TableCell>
                          <TableCell>{e.user?.firstName} {e.user?.lastName}</TableCell>
                          <TableCell>${e.amount}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <p className="font-medium">{e.paymentMethod}</p>
                              {e.transactionHash && <p className="text-gray-400 font-mono truncate max-w-24">{e.transactionHash}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <EnrollmentPaymentDialog
                                enrollment={e}
                                onApprove={() => approveEnrollmentMutation.mutate(e.id)}
                                approving={approveEnrollmentMutation.isPending}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Courses Table */}
            <Card>
              <CardHeader><CardTitle>All Courses ({courses.length})</CardTitle></CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No courses yet. Create your first course!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead>
                        <TableHead>Students</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course: any) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {course.thumbnail && <img src={course.thumbnail} alt="" className="w-12 h-8 object-cover rounded" />}
                              <div>
                                <p className="font-medium text-sm">{course.title}</p>
                                <p className="text-xs text-gray-400">{course.level}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {COURSE_CATEGORIES.find(c => c.value === course.category)?.label || course.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {course.isFree ? <Badge className="bg-green-100 text-green-700">Free</Badge> : <span className="font-semibold">${course.price}</span>}
                          </TableCell>
                          <TableCell>{course.studentsCount || 0}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-col">
                              <Badge className={course.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                                {course.isPublished ? "Published" : "Draft"}
                              </Badge>
                              {course.isFeatured && <Badge className="bg-violet-100 text-violet-700">Featured</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              <LessonManageButton course={course} />
                              <Button size="sm" variant="outline" onClick={() => openEditCourse(course)} data-testid={`button-edit-course-${course.id}`}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700"
                                onClick={() => { if (confirm("Delete this course?")) deleteCourseMutation.mutate(course.id); }}
                                data-testid={`button-delete-course-${course.id}`}>
                                <Trash2 className="h-3 w-3" />
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

          {/* ============ SHOP TAB ============ */}
          <TabsContent value="shop" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-indigo-600" /> Shop Management
                </h2>
                <p className="text-gray-500 text-sm mt-1">Add software, scripts, tech tools and digital products</p>
              </div>
              <Dialog open={isShopProductDialogOpen} onOpenChange={(v) => { setIsShopProductDialogOpen(v); if (!v) { setEditingProduct(null); shopProductForm.reset(); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus className="h-4 w-4" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>Add software, scripts, tools or any digital/physical product.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={shopProductForm.handleSubmit((d) => saveProductMutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Product Title *</Label>
                        <Input {...shopProductForm.register("title")} placeholder="e.g. Instagram Automation Script Pro" />
                        {shopProductForm.formState.errors.title && <p className="text-red-500 text-xs mt-1">{String(shopProductForm.formState.errors.title.message)}</p>}
                      </div>
                      <div>
                        <Label>Category *</Label>
                        <Select onValueChange={(v) => shopProductForm.setValue("category", v)} value={shopProductForm.watch("category")}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {SHOP_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Product Type *</Label>
                        <Select onValueChange={(v) => shopProductForm.setValue("type", v)} value={shopProductForm.watch("type")}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {SHOP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Short Description</Label>
                        <Input {...shopProductForm.register("shortDescription")} placeholder="One-line product summary" />
                      </div>
                      <div className="col-span-2">
                        <Label>Full Description *</Label>
                        <Textarea {...shopProductForm.register("description")} rows={4} placeholder="Detailed product description..." />
                      </div>
                      <div className="col-span-2">
                        <Label>Featured Image URL</Label>
                        <Input {...shopProductForm.register("featuredImage")} placeholder="https://..." />
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg col-span-2">
                        <Switch checked={shopProductForm.watch("isFree")} onCheckedChange={(v) => shopProductForm.setValue("isFree", v)} />
                        <Label>Free Product</Label>
                      </div>
                      {!shopProductForm.watch("isFree") && (
                        <>
                          <div>
                            <Label>Price (USDT) *</Label>
                            <Input {...shopProductForm.register("price")} placeholder="29.99" />
                          </div>
                          <div>
                            <Label>Original Price (for discount display)</Label>
                            <Input {...shopProductForm.register("originalPrice")} placeholder="49.99" />
                          </div>
                        </>
                      )}
                      <div className="col-span-2">
                        <Label>Demo URL</Label>
                        <Input {...shopProductForm.register("demoUrl")} placeholder="https://demo.example.com" />
                      </div>
                      <div className="col-span-2">
                        <Label>Download URL (for digital products)</Label>
                        <Input {...shopProductForm.register("downloadUrl")} placeholder="https://download.example.com/product.zip" />
                      </div>
                      <div className="col-span-2">
                        <Label>Documentation URL</Label>
                        <Input {...shopProductForm.register("documentationUrl")} placeholder="https://docs.example.com" />
                      </div>
                      <div className="col-span-2">
                        <Label>Key Features (one per line)</Label>
                        <Textarea {...shopProductForm.register("features")} rows={3} placeholder="Automated posting&#10;Analytics dashboard&#10;Multi-account support" />
                      </div>
                      <div className="col-span-2">
                        <Label>Requirements (one per line)</Label>
                        <Textarea {...shopProductForm.register("requirements")} rows={2} placeholder="Windows 10 or macOS&#10;Node.js v18+" />
                      </div>
                      <div className="col-span-2">
                        <Label>Tags (comma-separated)</Label>
                        <Input {...shopProductForm.register("tags")} placeholder="automation, instagram, social media, bot" />
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Switch checked={shopProductForm.watch("isFeatured")} onCheckedChange={(v) => shopProductForm.setValue("isFeatured", v)} />
                        <Label>Featured Product</Label>
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Switch checked={shopProductForm.watch("isActive")} onCheckedChange={(v) => shopProductForm.setValue("isActive", v)} />
                        <Label>Active (Visible in shop)</Label>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1" disabled={saveProductMutation.isPending}>
                        {saveProductMutation.isPending ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setIsShopProductDialogOpen(false); setEditingProduct(null); shopProductForm.reset(); }}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Shop Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Products", value: shopProducts.length, icon: Package, color: "text-indigo-600" },
                { label: "Active Products", value: shopProducts.filter((p: any) => p.isActive).length, icon: CheckCircle, color: "text-green-600" },
                { label: "Featured", value: shopProducts.filter((p: any) => p.isFeatured).length, icon: Star, color: "text-yellow-600" },
                { label: "Free Products", value: shopProducts.filter((p: any) => p.isFree).length, icon: ShoppingBag, color: "text-blue-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className={`h-8 w-8 ${s.color}`} />
                    <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Products Table */}
            <Card>
              <CardHeader><CardTitle>All Products ({shopProducts.length})</CardTitle></CardHeader>
              <CardContent>
                {shopProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No products yet. Add your first product!</p>
                    <p className="text-sm mt-1">Add software, scripts, tech tools, templates and more.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead>
                        <TableHead>Price</TableHead><TableHead>Sales</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shopProducts.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.featuredImage ? (
                                <img src={product.featuredImage} alt="" className="w-12 h-8 object-cover rounded" />
                              ) : (
                                <div className="w-12 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded flex items-center justify-center">
                                  <Code className="h-4 w-4 text-indigo-500" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{product.title}</p>
                                <p className="text-xs text-gray-400 truncate max-w-36">{product.shortDescription}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {SHOP_CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {SHOP_TYPES.find(t => t.value === product.type)?.label || product.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.isFree ? <Badge className="bg-green-100 text-green-700">Free</Badge> : <span className="font-semibold">${product.price}</span>}
                          </TableCell>
                          <TableCell>{product.salesCount || 0}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-col">
                              <Badge className={product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                                {product.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {product.isFeatured && <Badge className="bg-yellow-100 text-yellow-700">Featured</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditProduct(product)} data-testid={`button-edit-product-${product.id}`}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700"
                                onClick={() => { if (confirm("Delete this product?")) deleteProductMutation.mutate(product.id); }}
                                data-testid={`button-delete-product-${product.id}`}>
                                <Trash2 className="h-3 w-3" />
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

          {/* ═══ SOCIAL CHANNELS TAB ═══ */}
          <TabsContent value="social-channels" className="space-y-6">
            <AdminSocialChannelsPanel />
          </TabsContent>

          {/* ═══ PUSH NOTIFICATIONS TAB ═══ */}
          <TabsContent value="push-notifications" className="space-y-6">
            <AdminPushNotificationsPanel />
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
                  <CardTitle>Influencer Balances</CardTitle>
                  <CardDescription>Outstanding payouts and withdrawal requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Influencer Balances</span>
                      <span className="font-medium">${users.filter((u: any) => u.userType === 'creator').reduce((sum: number, user: any) => sum + parseFloat(user.availableBalance || '0'), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Influencers with $10+ Balance</span>
                      <span className="font-medium">{users.filter((u: any) => u.userType === 'creator' && parseFloat(u.availableBalance || '0') >= 10).length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Influencer Balance</span>
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

            {/* Admin Account Credentials */}
            <Card className="border-2 border-violet-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-violet-600" /> Admin Login Credentials
                </CardTitle>
                <CardDescription>Update your admin email and password securely. All passwords are encrypted with bcrypt.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg">
                  <div>
                    <p className="font-medium flex items-center gap-2"><UserCog className="h-4 w-4 text-violet-600" /> Current Admin Account</p>
                    <p className="text-sm text-gray-600 mt-1">{(user as any)?.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Password is encrypted and stored securely</p>
                  </div>
                  <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
                        <Edit className="h-4 w-4" /> Change Credentials
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Update Admin Credentials</DialogTitle>
                        <DialogDescription>Enter your current password to make changes. Leave new fields blank to keep unchanged.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={adminCredentialsForm.handleSubmit((d) => updateCredentialsMutation.mutate(d))} className="space-y-4">
                        <div>
                          <Label>Current Password *</Label>
                          <Input type="password" {...adminCredentialsForm.register("currentPassword")} placeholder="••••••••" />
                          {adminCredentialsForm.formState.errors.currentPassword && <p className="text-red-500 text-xs mt-1">{String(adminCredentialsForm.formState.errors.currentPassword.message)}</p>}
                        </div>
                        <div>
                          <Label>New Email (optional)</Label>
                          <Input type="email" {...adminCredentialsForm.register("newEmail")} placeholder="new@taskdrip.online" />
                          {adminCredentialsForm.formState.errors.newEmail && <p className="text-red-500 text-xs mt-1">{String(adminCredentialsForm.formState.errors.newEmail.message)}</p>}
                        </div>
                        <div>
                          <Label>New Password (optional, min 8 chars)</Label>
                          <Input type="password" {...adminCredentialsForm.register("newPassword")} placeholder="••••••••" />
                        </div>
                        <div>
                          <Label>Confirm New Password</Label>
                          <Input type="password" {...adminCredentialsForm.register("confirmPassword")} placeholder="••••••••" />
                          {adminCredentialsForm.formState.errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{String(adminCredentialsForm.formState.errors.confirmPassword.message)}</p>}
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white flex-1" disabled={updateCredentialsMutation.isPending}>
                            {updateCredentialsMutation.isPending ? "Updating..." : "Update Credentials"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => { setIsCredentialsDialogOpen(false); adminCredentialsForm.reset(); }}>Cancel</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
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

          {/* ── PWA SETTINGS TAB ── */}
          <TabsContent value="pwa" className="space-y-6">
            <PWASettingsPanel />
          </TabsContent>

          {/* ── DIRECT HIRES TAB ── */}
          <TabsContent value="direct-hires" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" /> Direct Hire Offers
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Review and approve payment submissions from brands to activate projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adminDirectHires.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No direct hire offers yet.</p>
                ) : (
                  <div className="space-y-4">
                    {adminDirectHires.map((offer: any) => {
                      const statusColors: Record<string, string> = {
                        pending: "bg-yellow-900 text-yellow-300",
                        accepted: "bg-blue-900 text-blue-300",
                        payment_submitted: "bg-purple-900 text-purple-300",
                        active: "bg-green-900 text-green-300",
                        rejected: "bg-red-900 text-red-300",
                        completed: "bg-gray-700 text-gray-300",
                      };
                      const note = directHireNoteMap[offer.id] || "";
                      return (
                        <Card key={offer.id} className="bg-gray-800 border-gray-700">
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <p className="font-semibold text-white">{offer.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Brand: {offer.brand?.companyName || `${offer.brand?.firstName} ${offer.brand?.lastName}`} →
                                  Influencer: {offer.influencer?.firstName} {offer.influencer?.lastName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 font-bold">${Number(offer.budget).toFixed(2)}</span>
                                <Badge className={`text-xs ${statusColors[offer.status] || "bg-gray-700 text-gray-300"}`}>
                                  {offer.status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>

                            {offer.status === "payment_submitted" && (
                              <div className="space-y-3 border-t border-gray-700 pt-3">
                                {offer.transactionHash && (
                                  <div className="bg-gray-900 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                                    <p className="text-xs font-mono text-gray-200 break-all">{offer.transactionHash}</p>
                                  </div>
                                )}
                                {(offer.paymentProof || offer.transactionHash) && (
                                  <div>
                                    <p className="text-xs text-gray-400 mb-2">Payment Proof</p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-purple-600 text-purple-300 hover:bg-purple-900/40 text-xs h-8"
                                      onClick={() => setProofModal({
                                        open: true,
                                        url: offer.paymentProof,
                                        txHash: offer.transactionHash,
                                        network: offer.paymentNetwork,
                                        amount: offer.amount,
                                        label: `Direct Hire — ${offer.influencer?.username || offer.creatorId}`,
                                      })}
                                    >
                                      <Eye className="w-3 h-3 mr-1" /> View Proof
                                    </Button>
                                  </div>
                                )}
                                {offer.paymentNetwork && (
                                  <p className="text-xs text-gray-400">Network: <span className="text-gray-200">{offer.paymentNetwork.toUpperCase()}</span></p>
                                )}
                                <div>
                                  <label className="text-xs text-gray-400 block mb-1">Admin Note (optional)</label>
                                  <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                                    placeholder="Add a note for the brand..."
                                    value={note}
                                    onChange={e => setDirectHireNoteMap(m => ({ ...m, [offer.id]: e.target.value }))}
                                  />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    disabled={activateDirectHireMutation.isPending}
                                    onClick={() => activateDirectHireMutation.mutate({ id: offer.id, note })}
                                    data-testid={`btn-approve-direct-hire-${offer.id}`}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve & Activate
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-700 text-red-400 hover:bg-red-900/30"
                                    disabled={rejectDirectHirePaymentMutation.isPending}
                                    onClick={() => rejectDirectHirePaymentMutation.mutate({ id: offer.id, note })}
                                    data-testid={`btn-reject-direct-hire-${offer.id}`}
                                  >
                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Payment
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                                    onClick={() => setConversationDrawer({ open: true, type: "direct_hire", id: offer.id, title: offer.title })}
                                    data-testid={`btn-view-conversation-${offer.id}`}
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> View Conversation
                                  </Button>
                                </div>
                              </div>
                            )}

                            {offer.status !== "payment_submitted" && offer.adminNote && (
                              <p className="text-xs text-gray-400 border-t border-gray-700 pt-2">
                                Admin note: {offer.adminNote}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── P2P MARKET TAB ── */}
          <TabsContent value="p2p" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <RouterLink href="/admin/p2p-transactions" className="block">
                <Card className="bg-gray-900 border-gray-800 hover:border-purple-600 transition-colors cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                      <Store className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">P2P Transactions</p>
                      <p className="text-sm text-gray-400">Approve listings, release escrow, resolve disputes</p>
                    </div>
                  </CardContent>
                </Card>
              </RouterLink>
              <RouterLink href="/admin/p2p-fees" className="block">
                <Card className="bg-gray-900 border-gray-800 hover:border-blue-600 transition-colors cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">P2P Fee Config</p>
                      <p className="text-sm text-gray-400">Set fees per transaction type (crypto/product/service)</p>
                    </div>
                  </CardContent>
                </Card>
              </RouterLink>
              <RouterLink href="/admin/platform-fees" className="block">
                <Card className="bg-gray-900 border-gray-800 hover:border-green-600 transition-colors cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center flex-shrink-0">
                      <Settings className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Platform Fees</p>
                      <p className="text-sm text-gray-400">Manage campaign, withdrawal & listing fees</p>
                    </div>
                  </CardContent>
                </Card>
              </RouterLink>
            </div>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-400" />
                  How the P2P Marketplace Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                    <p className="font-semibold text-purple-300 mb-2">📋 Listing Flow</p>
                    <ol className="space-y-1 list-decimal list-inside text-gray-400 text-xs">
                      <li>User creates listing (crypto / product / service)</li>
                      <li>Listing is submitted for admin approval</li>
                      <li>Admin approves → listing goes live on P2P Hub</li>
                      <li>Buyer clicks Accept Offer → Deal Room created</li>
                    </ol>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                    <p className="font-semibold text-blue-300 mb-2">💰 Escrow Flow</p>
                    <ol className="space-y-1 list-decimal list-inside text-gray-400 text-xs">
                      <li>Buyer sends funds to admin escrow wallet</li>
                      <li>Buyer clicks Mark as Paid (with proof)</li>
                      <li>Admin confirms payment → Seller delivers</li>
                      <li>Buyer confirms received → Admin releases funds</li>
                    </ol>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                    <p className="font-semibold text-yellow-300 mb-2">⚠️ Dispute System</p>
                    <ol className="space-y-1 list-decimal list-inside text-gray-400 text-xs">
                      <li>Either party opens a dispute in the Deal Room</li>
                      <li>Admin reviews chat history and proof</li>
                      <li>Admin decides winner and releases or refunds funds</li>
                    </ol>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                    <p className="font-semibold text-green-300 mb-2">⚡ Admin Actions</p>
                    <ul className="space-y-1 list-disc list-inside text-gray-400 text-xs">
                      <li>Approve / reject listings</li>
                      <li>Confirm payments received</li>
                      <li>Release funds to seller</li>
                      <li>Refund buyer on disputes</li>
                      <li>Suspend users or remove listings</li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <RouterLink href="/admin/p2p-transactions">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Store className="w-4 h-4 mr-2" /> Open P2P Admin Panel
                    </Button>
                  </RouterLink>
                  <RouterLink href="/p2p-hub">
                    <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                      View P2P Hub (Public)
                    </Button>
                  </RouterLink>
                </div>
              </CardContent>
            </Card>

            {/* ── ALL LISTINGS MANAGEMENT ── */}
            <AdminP2PListingsPanel />
          </TabsContent>

          {/* ── HERO SLIDERS TAB ── */}
          <TabsContent value="hero-sliders" className="space-y-6">
            <HeroSlidersPanel />
          </TabsContent>

          {/* ── PAYOUT CENTER TAB ── */}
          <TabsContent value="payout-center" className="space-y-6 pb-8">
            <AdminPayoutsCenter />
          </TabsContent>

          {/* ── CONTENT EDITOR TAB ── */}
          <TabsContent value="content-editor" className="space-y-6 pb-8">
            <ContentEditorPanel />
          </TabsContent>

          {/* ── LEADERBOARD MANAGEMENT TAB ── */}
          <TabsContent value="leaderboard" className="space-y-6 pb-8">
            <LeaderboardManagementPanel />
          </TabsContent>

        </Tabs>

        {/* Campaign Detail Dialog */}
        {selectedCampaign && (
          <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Campaign Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* Status and basic info */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold">{selectedCampaign.title}</h3>
                  <Badge className={selectedCampaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} variant="outline">
                    {selectedCampaign.status?.replace('_', ' ')}
                  </Badge>
                  {selectedCampaign.isActive && <Badge className="bg-green-600 text-white">LIVE</Badge>}
                </div>
                <p className="text-gray-600 text-sm">{selectedCampaign.description}</p>

                {/* Campaign stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Reward', value: `$${selectedCampaign.reward}`, color: 'text-green-600' },
                    { label: 'Slots', value: `${selectedCampaign.filledSlots||0}/${selectedCampaign.totalSlots}`, color: 'text-blue-600' },
                    { label: 'Category', value: selectedCampaign.category, color: 'text-purple-600' },
                    { label: 'Deadline', value: selectedCampaign.deadline ? new Date(selectedCampaign.deadline).toLocaleDateString() : '—', color: 'text-orange-600' },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className={`font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Brand info */}
                {selectedCampaign.brandName && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Brand</p>
                    <p className="font-semibold text-blue-900">{selectedCampaign.brandName}</p>
                  </div>
                )}

                {/* Requirements */}
                {selectedCampaign.requirements && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Requirements</p>
                    {Array.isArray(selectedCampaign.requirements) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {selectedCampaign.requirements.map((r: string, i: number) => (
                          <li key={i} className="text-sm text-gray-600">{r}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">{selectedCampaign.requirements}</p>
                    )}
                  </div>
                )}

                {/* Payment Proof */}
                {selectedCampaign.escrowPayment && (
                  <div className="border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800">Payment Proof</p>
                      <Badge variant={
                        selectedCampaign.escrowPayment.status === 'verified' ? 'default' :
                        selectedCampaign.escrowPayment.status === 'submitted' ? 'secondary' : 'outline'
                      }>{selectedCampaign.escrowPayment.status}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Amount</p>
                        <p className="font-medium">${selectedCampaign.escrowPayment.amount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Network</p>
                        <p className="font-medium">{selectedCampaign.escrowPayment.network || '—'}</p>
                      </div>
                    </div>
                    {selectedCampaign.escrowPayment.transactionHash && (
                      <div>
                        <p className="text-xs text-gray-400">Transaction Hash</p>
                        <p className="font-mono text-xs text-blue-600 break-all">{selectedCampaign.escrowPayment.transactionHash}</p>
                      </div>
                    )}
                    {selectedCampaign.escrowPayment.paymentScreenshot && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Payment Screenshot</p>
                        <a href={selectedCampaign.escrowPayment.paymentScreenshot} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={selectedCampaign.escrowPayment.paymentScreenshot}
                            alt="Payment proof"
                            className="w-full max-h-64 object-contain rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      </div>
                    )}
                    {selectedCampaign.escrowPayment.status === 'submitted' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { approveEscrow.mutate(selectedCampaign.escrowPayment.id); setSelectedCampaign(null); }}
                          disabled={approveEscrow.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" /> Approve & Activate Campaign
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            const reason = prompt('Rejection reason:') || 'Invalid payment proof.';
                            rejectEscrow.mutate({ id: selectedCampaign.escrowPayment.id, reason });
                            setSelectedCampaign(null);
                          }}
                          disabled={rejectEscrow.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedCampaign(null)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Campaign Creation Dialog */}
        {isCampaignDialogOpen && (
          <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new campaign for influencers to participate in
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

        {/* Edit Campaign Dialog */}
        {isEditCampaignDialogOpen && editingCampaign && (
          <Dialog open={isEditCampaignDialogOpen} onOpenChange={(v) => { setIsEditCampaignDialogOpen(v); if (!v) setEditingCampaign(null); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Campaign</DialogTitle>
                <DialogDescription>Update campaign details. Toggle "Active on Homepage" to control landing page visibility.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Campaign Title</Label>
                  <Input defaultValue={editingCampaign.title} onChange={(e) => setEditingCampaign((p: any) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} defaultValue={editingCampaign.description} onChange={(e) => setEditingCampaign((p: any) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Reward (USDT)</Label>
                    <Input type="number" defaultValue={editingCampaign.reward} onChange={(e) => setEditingCampaign((p: any) => ({ ...p, reward: parseFloat(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>Total Slots</Label>
                    <Input type="number" defaultValue={editingCampaign.totalSlots} onChange={(e) => setEditingCampaign((p: any) => ({ ...p, totalSlots: parseInt(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <Label>Brand Name</Label>
                  <Input defaultValue={editingCampaign.brandName} onChange={(e) => setEditingCampaign((p: any) => ({ ...p, brandName: e.target.value }))} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input defaultValue={editingCampaign.category} onChange={(e) => setEditingCampaign((p: any) => ({ ...p, category: e.target.value }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select defaultValue={editingCampaign.status} onValueChange={(v) => setEditingCampaign((p: any) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50">
                  <div>
                    <p className="font-semibold text-gray-900">Show on Homepage</p>
                    <p className="text-xs text-gray-500">Active campaigns appear on the public landing page</p>
                  </div>
                  <Switch checked={editingCampaign.isActive ?? true} onCheckedChange={(v) => setEditingCampaign((p: any) => ({ ...p, isActive: v }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => updateCampaignMutation.mutate({ id: editingCampaign.id, updates: { title: editingCampaign.title, description: editingCampaign.description, reward: editingCampaign.reward, totalSlots: editingCampaign.totalSlots, brandName: editingCampaign.brandName, category: editingCampaign.category, status: editingCampaign.status, isActive: editingCampaign.isActive } })}
                    disabled={updateCampaignMutation.isPending}>
                    {updateCampaignMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => { setIsEditCampaignDialogOpen(false); setEditingCampaign(null); }}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add/Edit Payment Method Dialog */}
        {isPaymentMethodDialogOpen && (
          <Dialog open={isPaymentMethodDialogOpen} onOpenChange={(v) => { setIsPaymentMethodDialogOpen(v); if (!v) setEditingPaymentMethod(null); }}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPaymentMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
                <DialogDescription>Configure how users can pay on this platform. Accepted payment methods appear in all checkout flows.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={paymentMethodForm.type} onValueChange={(v) => setPaymentMethodForm((p: any) => ({ ...p, type: v, label: v === 'crypto' ? '' : v === 'bank' ? '' : v === 'paypal' ? 'PayPal' : v === 'paystack' ? 'Paystack' : 'Stripe' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crypto">🪙 Crypto Wallet</SelectItem>
                      <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="paypal">🅿️ PayPal</SelectItem>
                      <SelectItem value="paystack">🟢 Paystack</SelectItem>
                      <SelectItem value="stripe">💳 Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Label (shown to users)</Label>
                  <Input value={paymentMethodForm.label} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, label: e.target.value }))} placeholder={paymentMethodForm.type === 'crypto' ? 'e.g. USDT TRC-20' : paymentMethodForm.type === 'bank' ? 'e.g. GTBank Nigeria' : paymentMethodForm.type === 'paypal' ? 'PayPal' : paymentMethodForm.type === 'paystack' ? 'Paystack' : 'Stripe'} />
                </div>

                {paymentMethodForm.type === 'crypto' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Network</Label>
                        <Select value={paymentMethodForm.network} onValueChange={(v) => setPaymentMethodForm((p: any) => ({ ...p, network: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRC-20">TRC-20 (Tron)</SelectItem>
                            <SelectItem value="BEP-20">BEP-20 (BNB Chain)</SelectItem>
                            <SelectItem value="TON">TON Network</SelectItem>
                            <SelectItem value="ERC-20">ERC-20 (Ethereum)</SelectItem>
                            <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                            <SelectItem value="SOL">Solana (SOL)</SelectItem>
                            <SelectItem value="MATIC">Polygon (MATIC)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Select value={paymentMethodForm.currency} onValueChange={(v) => setPaymentMethodForm((p: any) => ({ ...p, currency: v }))}>
                          <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USDT">USDT</SelectItem>
                            <SelectItem value="TON">TON</SelectItem>
                            <SelectItem value="BTC">BTC</SelectItem>
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="BNB">BNB</SelectItem>
                            <SelectItem value="SOL">SOL</SelectItem>
                            <SelectItem value="MATIC">MATIC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Wallet Address</Label>
                      <Input value={paymentMethodForm.address} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, address: e.target.value }))} placeholder="Enter wallet address..." className="font-mono text-sm" />
                    </div>
                  </>
                )}

                {paymentMethodForm.type === 'bank' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Bank Name</Label>
                        <Input value={paymentMethodForm.bankName} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, bankName: e.target.value }))} placeholder="e.g. GTBank" />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input value={paymentMethodForm.bankCountry} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, bankCountry: e.target.value }))} placeholder="e.g. Nigeria" />
                      </div>
                    </div>
                    <div>
                      <Label>Account Name</Label>
                      <Input value={paymentMethodForm.accountName} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, accountName: e.target.value }))} placeholder="Account holder name" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Account Number</Label>
                        <Input value={paymentMethodForm.accountNumber} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, accountNumber: e.target.value }))} placeholder="Account number" />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Input value={paymentMethodForm.bankCurrency} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, bankCurrency: e.target.value }))} placeholder="e.g. NGN, USD" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Routing Number (optional)</Label>
                        <Input value={paymentMethodForm.routingNumber} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, routingNumber: e.target.value }))} placeholder="For US banks" />
                      </div>
                      <div>
                        <Label>SWIFT Code (optional)</Label>
                        <Input value={paymentMethodForm.swiftCode} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, swiftCode: e.target.value }))} placeholder="For international" />
                      </div>
                    </div>
                  </>
                )}

                {paymentMethodForm.type === 'paypal' && (
                  <div>
                    <Label>PayPal Email</Label>
                    <Input type="email" value={paymentMethodForm.paypalEmail} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, paypalEmail: e.target.value }))} placeholder="your@paypal.com" />
                  </div>
                )}

                {paymentMethodForm.type === 'paystack' && (
                  <>
                    <div>
                      <Label>Paystack Public Key</Label>
                      <Input value={paymentMethodForm.paystackPublicKey} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, paystackPublicKey: e.target.value }))} placeholder="pk_live_..." className="font-mono text-sm" />
                    </div>
                    <div>
                      <Label>Paystack Secret Key</Label>
                      <Input type="password" value={paymentMethodForm.paystackSecretKey} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, paystackSecretKey: e.target.value }))} placeholder="sk_live_..." className="font-mono text-sm" />
                    </div>
                  </>
                )}

                {paymentMethodForm.type === 'stripe' && (
                  <>
                    <div>
                      <Label>Stripe Publishable Key</Label>
                      <Input value={paymentMethodForm.stripePublicKey} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, stripePublicKey: e.target.value }))} placeholder="pk_live_..." className="font-mono text-sm" />
                    </div>
                    <div>
                      <Label>Stripe Secret Key</Label>
                      <Input type="password" value={paymentMethodForm.stripeSecretKey} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, stripeSecretKey: e.target.value }))} placeholder="sk_live_..." className="font-mono text-sm" />
                    </div>
                  </>
                )}

                <div>
                  <Label>Instructions for users (optional)</Label>
                  <Textarea rows={2} value={paymentMethodForm.instructions} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, instructions: e.target.value }))} placeholder="e.g. Send exactly the stated amount. Include your email in the memo." />
                </div>

                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={paymentMethodForm.sortOrder} onChange={(e) => setPaymentMethodForm((p: any) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} placeholder="0 = first" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl bg-green-50">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Active in checkout</p>
                    <p className="text-xs text-gray-500">Users will see this as a payment option</p>
                  </div>
                  <Switch checked={paymentMethodForm.isActive} onCheckedChange={(v) => setPaymentMethodForm((p: any) => ({ ...p, isActive: v }))} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={createPaymentMethodMutation.isPending || updatePaymentMethodMutation.isPending}
                    onClick={() => {
                      if (editingPaymentMethod) {
                        updatePaymentMethodMutation.mutate({ id: editingPaymentMethod.id, data: paymentMethodForm });
                      } else {
                        createPaymentMethodMutation.mutate(paymentMethodForm);
                      }
                    }}>
                    {(createPaymentMethodMutation.isPending || updatePaymentMethodMutation.isPending) ? "Saving..." : (editingPaymentMethod ? "Save Changes" : "Add Payment Method")}
                  </Button>
                  <Button variant="outline" onClick={() => { setIsPaymentMethodDialogOpen(false); setEditingPaymentMethod(null); }}>Cancel</Button>
                </div>
              </div>
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
                        <SelectItem value="influencer">Influencer</SelectItem>
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

// ═══════════════════════════════════════════════════
// ADMIN PAYMENT NETWORKS PANEL
// ═══════════════════════════════════════════════════
function AdminPaymentNetworksPanel() {
  const { toast } = useToast();
  const [editingNet, setEditingNet] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editOpen, setEditOpen] = useState(false);

  const { data: networks = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/payment-networks'],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-networks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payment-networks'] });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest('PUT', `/api/admin/payment-networks/${id}`, { isActive });
      return res.json();
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast({ title: vars.isActive ? 'Network activated' : 'Network deactivated' });
    },
    onError: () => toast({ title: 'Failed to update network', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PUT', `/api/admin/payment-networks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setEditOpen(false);
      toast({ title: 'Network updated' });
    },
    onError: () => toast({ title: 'Failed to update network', variant: 'destructive' }),
  });

  const networkIcons: Record<string, string> = {
    tron: '🔴',
    ton: '💎',
    bsc: '🟡',
    eth: '🔷',
  };

  const networkColors: Record<string, string> = {
    tron: 'border-red-500/30 bg-red-500/5',
    ton: 'border-blue-500/30 bg-blue-500/5',
    bsc: 'border-yellow-500/30 bg-yellow-500/5',
    eth: 'border-indigo-500/30 bg-indigo-500/5',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Payment Networks</h2>
          <p className="text-gray-400 text-sm mt-1">
            Control which crypto deposit &amp; withdrawal networks are available to users. Toggle networks active/inactive and set your receiving wallet addresses.
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-300">
            {networks.filter((n: any) => n.isActive).length} of {networks.length} networks active
          </p>
          <p className="text-xs text-green-500/70 mt-0.5">
            Only active networks appear on deposit and withdrawal forms for users.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading networks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {networks.map((net: any) => (
            <Card key={net.id} className={`border ${networkColors[net.network] || 'border-gray-700 bg-gray-800/50'} bg-gray-900/80`} data-testid={`network-card-${net.networkKey}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl">
                      {networkIcons[net.network] || '💰'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{net.name}</h3>
                      <p className="text-xs text-gray-400">{net.shortName} • {net.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={net.isActive ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}>
                      {net.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                    <Switch
                      checked={net.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: net.id, isActive: checked })}
                      disabled={toggleMutation.isPending}
                      data-testid={`toggle-network-${net.networkKey}`}
                    />
                  </div>
                </div>
                {net.description && (
                  <p className="text-xs text-gray-500 mb-3">{net.description}</p>
                )}
                {net.walletAddress ? (
                  <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Deposit Wallet Address</p>
                    <p className="font-mono text-xs text-green-400 break-all">{net.walletAddress}</p>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                    <p className="text-xs text-yellow-400">No wallet address set — users cannot deposit via this network until you add one.</p>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full"
                  onClick={() => {
                    setEditingNet(net);
                    setEditForm({ walletAddress: net.walletAddress || '', description: net.description || '' });
                    setEditOpen(true);
                  }}
                  data-testid={`edit-network-${net.networkKey}`}
                >
                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit Wallet Address
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit {editingNet?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set the deposit wallet address for this network. Users will send funds here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Deposit Wallet Address</Label>
              <Input
                value={editForm.walletAddress}
                onChange={(e) => setEditForm((p: any) => ({ ...p, walletAddress: e.target.value }))}
                placeholder="Enter wallet address..."
                className="bg-gray-800 border-gray-700 text-white font-mono"
                data-testid="input-network-wallet"
              />
              <p className="text-xs text-gray-500">This address will be shown to users when they deposit funds for campaigns or subscriptions.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Network Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((p: any) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Fast, low-fee transactions. Minimum 1 USDT."
                className="bg-gray-800 border-gray-700 text-white"
                rows={2}
                data-testid="input-network-description"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => updateMutation.mutate({ id: editingNet?.id, data: editForm })}
                disabled={updateMutation.isPending}
                data-testid="btn-save-network"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-700 text-gray-300">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ADMIN SOCIAL CHANNELS PANEL
// ═══════════════════════════════════════════════════
const PLATFORM_QUICK_PRESETS = [
  { name: 'Facebook', slug: 'facebook', emoji: '📘', bgColor: '#1877f2', urlPrefix: 'https://facebook.com/' },
  { name: 'Snapchat', slug: 'snapchat', emoji: '👻', bgColor: '#fffc00', urlPrefix: 'https://snapchat.com/add/' },
  { name: 'Pinterest', slug: 'pinterest', emoji: '📌', bgColor: '#e60023', urlPrefix: 'https://pinterest.com/' },
  { name: 'Discord', slug: 'discord', emoji: '💬', bgColor: '#5865f2', urlPrefix: 'https://discord.gg/' },
  { name: 'LinkedIn', slug: 'linkedin', emoji: '💼', bgColor: '#0a66c2', urlPrefix: 'https://linkedin.com/in/' },
  { name: 'SoundCloud', slug: 'soundcloud', emoji: '🎵', bgColor: '#ff5500', urlPrefix: 'https://soundcloud.com/' },
  { name: 'Spotify', slug: 'spotify', emoji: '🎧', bgColor: '#1db954', urlPrefix: 'https://open.spotify.com/' },
  { name: 'Threads', slug: 'threads', emoji: '🧵', bgColor: '#000000', urlPrefix: 'https://threads.net/' },
  { name: 'BeReal', slug: 'bereal', emoji: '📸', bgColor: '#1a1a1a', urlPrefix: '' },
  { name: 'Reddit', slug: 'reddit', emoji: '🤖', bgColor: '#ff4500', urlPrefix: 'https://reddit.com/u/' },
  { name: 'Patreon', slug: 'patreon', emoji: '🎁', bgColor: '#ff424d', urlPrefix: 'https://patreon.com/' },
  { name: 'Kick', slug: 'kick', emoji: '🎮', bgColor: '#53fc18', urlPrefix: 'https://kick.com/' },
];

function AdminSocialChannelsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const emptyForm = { name: '', slug: '', emoji: '🌐', urlPrefix: '', description: '', bgColor: '#6366f1', isBuiltIn: false, isActive: true };
  const [form, setForm] = useState(emptyForm);
  const [presetSearch, setPresetSearch] = useState('');

  const { data: platforms = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/social-platforms'],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/social-platforms'] });
    queryClient.invalidateQueries({ queryKey: ['/api/social-platforms'] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest('POST', '/api/admin/social-platforms', data); return res.json(); },
    onSuccess: () => { invalidate(); setDialogOpen(false); setEditItem(null); setForm(emptyForm); toast({ title: 'Channel added!' }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => { const res = await apiRequest('PUT', `/api/admin/social-platforms/${id}`, data); return res.json(); },
    onSuccess: () => { invalidate(); setDialogOpen(false); setEditItem(null); toast({ title: 'Channel updated!' }); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest('PUT', `/api/admin/social-platforms/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => { invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/admin/social-platforms/${id}`); },
    onSuccess: () => { invalidate(); toast({ title: 'Channel removed' }); },
  });

  const handleSave = () => {
    if (!form.name || !form.slug) { toast({ title: 'Name and slug are required', variant: 'destructive' }); return; }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, slug: item.slug, emoji: item.emoji || '🌐', urlPrefix: item.urlPrefix || '', description: item.description || '', bgColor: item.bgColor || '#6366f1', isBuiltIn: item.isBuiltIn || false, isActive: item.isActive !== false });
    setDialogOpen(true);
  };

  const applyPreset = (preset: typeof PLATFORM_QUICK_PRESETS[0]) => {
    setForm(p => ({ ...p, name: preset.name, slug: preset.slug, emoji: preset.emoji, bgColor: preset.bgColor, urlPrefix: preset.urlPrefix }));
    setPresetSearch('');
  };

  const filteredPresets = presetSearch
    ? PLATFORM_QUICK_PRESETS.filter(p => p.name.toLowerCase().includes(presetSearch.toLowerCase()))
    : PLATFORM_QUICK_PRESETS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Social Channels</h2>
          <p className="text-gray-400 text-sm mt-1">Add & manage social platforms influencers can link to their profiles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditItem(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 gap-2" data-testid="add-channel-btn">
              <Plus className="w-4 h-4" /> Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Social Channel' : 'Add Social Channel'}</DialogTitle>
              <DialogDescription>Configure a platform that influencers can link from their settings page</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm" style={{ backgroundColor: form.bgColor + '20', border: `2px solid ${form.bgColor}40` }}>
                  {form.emoji || '🌐'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{form.name || 'Platform Name'}</p>
                  <p className="text-xs text-gray-400">{form.urlPrefix || 'https://...'}</p>
                </div>
              </div>

              {/* Quick presets */}
              {!editItem && (
                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">Quick Presets</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredPresets.map(preset => (
                      <button key={preset.slug} onClick={() => applyPreset(preset)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-gray-700 transition-all">
                        <span>{preset.emoji}</span> {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Platform Name <span className="text-red-500">*</span></Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Facebook Pages" className="mt-1" data-testid="channel-name" />
                </div>
                <div>
                  <Label>Slug (unique ID) <span className="text-red-500">*</span></Label>
                  <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="e.g. facebook" className="mt-1" data-testid="channel-slug" />
                  <p className="text-xs text-gray-400 mt-0.5">Lowercase, no spaces</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Emoji Icon</Label>
                  <Input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} placeholder="🌐" className="mt-1 text-center text-lg" maxLength={4} />
                </div>
                <div className="col-span-2">
                  <Label>Brand Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.bgColor} onChange={e => setForm(p => ({ ...p, bgColor: e.target.value }))} className="h-9 w-14 rounded border cursor-pointer flex-shrink-0" />
                    <Input value={form.bgColor} onChange={e => setForm(p => ({ ...p, bgColor: e.target.value }))} className="flex-1 text-sm font-mono" />
                  </div>
                </div>
              </div>

              <div>
                <Label>URL Prefix</Label>
                <Input value={form.urlPrefix} onChange={e => setForm(p => ({ ...p, urlPrefix: e.target.value }))} placeholder="https://facebook.com/pages/" className="mt-1" />
                <p className="text-xs text-gray-400 mt-1">Shown as placeholder hint to influencers (optional)</p>
              </div>

              <div>
                <Label>Description <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Share your Facebook page link" className="mt-1" />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Active</p>
                  <p className="text-xs text-gray-400">Influencers can link this platform when active</p>
                </div>
                <button type="button" onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700" data-testid="save-channel-btn">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editItem ? 'Update Channel' : 'Add Channel'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Channels', value: platforms.length, color: 'text-purple-400' },
          { label: 'Active', value: platforms.filter((p: any) => p.isActive !== false).length, color: 'text-green-400' },
          { label: 'Inactive', value: platforms.filter((p: any) => p.isActive === false).length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Platform list */}
      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading channels...</div>
          ) : platforms.length === 0 ? (
            <div className="py-16 text-center">
              <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No social channels yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">Add channels influencers can link in their profiles</p>
              <Button className="bg-purple-600 hover:bg-purple-700 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Add First Channel
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {platforms.map((p: any) => (
                <div key={p.id} className={`flex items-center gap-4 p-4 hover:bg-gray-800/40 transition-colors ${p.isActive === false ? 'opacity-60' : ''}`}>
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: (p.bgColor || '#6366f1') + '25', border: `2px solid ${p.bgColor || '#6366f1'}40` }}>
                    {p.emoji || p.name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      {p.isBuiltIn && <Badge className="bg-blue-900/50 text-blue-300 text-xs border-blue-700">Built-in</Badge>}
                      <Badge className={`text-xs border-0 ${p.isActive !== false ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {p.isActive !== false ? '● Active' : '● Inactive'}
                      </Badge>
                    </div>
                    <p className="text-gray-500 text-xs font-mono mt-0.5">{p.slug}</p>
                    {p.urlPrefix && <p className="text-gray-600 text-xs mt-0.5 truncate">{p.urlPrefix}</p>}
                    {p.description && <p className="text-gray-500 text-xs mt-0.5 italic">{p.description}</p>}
                  </div>

                  {/* Color swatch */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full border border-gray-600" style={{ backgroundColor: p.bgColor || '#6366f1' }} />
                    <span className="text-gray-600 text-xs font-mono">{p.bgColor || '#6366f1'}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: p.id, isActive: !(p.isActive !== false) })}
                      disabled={toggleActiveMutation.isPending}
                      title={p.isActive !== false ? 'Deactivate (hide from users)' : 'Activate (show to users)'}
                      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${p.isActive !== false ? 'bg-green-500' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.isActive !== false ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="text-gray-400 hover:text-white h-8 w-8 p-0" data-testid={`edit-channel-${p.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!p.isBuiltIn && (
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(p.id)} className="text-gray-400 hover:text-red-400 h-8 w-8 p-0" data-testid={`delete-channel-${p.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-gray-700 bg-gray-800/50">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-purple-400" /> How Social Channels Work
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-400">
            {[
              { step: '1', text: 'Admin adds a platform (e.g. Facebook Pages) with name, emoji, color & URL prefix' },
              { step: '2', text: 'Influencers see it in Settings → Social Media Links and can add their link + follower count' },
              { step: '3', text: 'Influencers can toggle visibility on/off per platform so it shows or hides on their public profile' },
            ].map(s => (
              <div key={s.step} className="flex gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-400 font-bold text-xs flex-shrink-0 mt-0.5">{s.step}</div>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ADMIN PUSH NOTIFICATIONS PANEL
// ═══════════════════════════════════════════════════
function AdminPushNotificationsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', icon: '/icon-192.png', clickUrl: '/', targetType: 'all' });

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/push-notifications'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/push-notifications', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notifications'] });
      setDialogOpen(false);
      setForm({ title: '', body: '', icon: '/icon-192.png', clickUrl: '/', targetType: 'all' });
      toast({ title: 'Notification campaign created!' });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/push-notifications/${id}/send`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notifications'] });
      toast({ title: `Sent to ${data.sentCount} subscribers`, description: data.message });
    },
    onError: () => toast({ title: 'Send failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/admin/push-notifications/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/push-notifications'] });
      toast({ title: 'Campaign deleted' });
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge className="bg-green-900 text-green-300">Sent</Badge>;
      case 'failed': return <Badge className="bg-red-900 text-red-300">Failed</Badge>;
      default: return <Badge className="bg-gray-800 text-gray-300">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Push Notifications</h2>
          <p className="text-gray-400 text-sm mt-1">Send push notification campaigns to subscribed users</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700" data-testid="create-push-btn">
              <Bell className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Push Notification</DialogTitle>
              <DialogDescription>Compose a notification to send to your users</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="New campaign available! 🔥" className="mt-1" data-testid="push-title" />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Earn up to $500 for this week's campaigns..." rows={3} className="mt-1" data-testid="push-body" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Click URL</Label>
                  <Input value={form.clickUrl} onChange={e => setForm(p => ({ ...p, clickUrl: e.target.value }))} placeholder="/" className="mt-1" />
                </div>
                <div>
                  <Label>Target</Label>
                  <select value={form.targetType} onChange={e => setForm(p => ({ ...p, targetType: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" data-testid="push-target">
                    <option value="all">All Users</option>
                    <option value="influencers">Influencers Only</option>
                    <option value="brands">Brands Only</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={`user:${u.id}`}>
                        {u.firstName || u.email} {u.lastName || ''} ({u.userType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border">
                <p className="text-xs font-semibold text-gray-600 mb-2">Preview</p>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{form.title || 'Notification Title'}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{form.body || 'Message body will appear here...'}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.title || !form.body}
                  className="flex-1 bg-purple-600 hover:bg-purple-700" data-testid="save-push-btn">
                  {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length, color: "border-purple-500/30 bg-purple-500/5" },
          { label: "Sent", value: campaigns.filter((c: any) => c.status === 'sent').length, color: "border-green-500/30 bg-green-500/5" },
          { label: "Total Delivered", value: campaigns.reduce((sum: number, c: any) => sum + (c.sentCount || 0), 0), color: "border-blue-500/30 bg-blue-500/5" },
        ].map(s => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-4">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No notification campaigns yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first push notification campaign</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Campaign</TableHead>
                  <TableHead className="text-gray-400">Target</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Sent To</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => (
                  <TableRow key={c.id} className="border-gray-800 hover:bg-gray-800/50" data-testid={`push-campaign-${c.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-white text-sm">{c.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5 max-w-64 truncate">{c.body}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-gray-800 text-gray-300 capitalize">
                        {(c.targetType || 'all').startsWith('user:')
                          ? users.find((u: any) => `user:${u.id}` === c.targetType)?.email || 'Specific user'
                          : c.targetType || 'all'}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(c.status || 'draft')}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{c.sentCount || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.status !== 'sent' && (
                          <Button size="sm" onClick={() => sendMutation.mutate(c.id)}
                            disabled={sendMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white" data-testid={`send-push-${c.id}`}>
                            <Zap className="w-3 h-3 mr-1" /> Send
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(c.id)}
                          className="text-gray-400 hover:text-red-400" data-testid={`delete-push-${c.id}`}>
                          <Trash2 className="w-4 h-4" />
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

      {/* ── Global Conversation Viewer Drawer ── */}
      {conversationDrawer && (
        <AdminConversationDrawer
          open={conversationDrawer.open}
          onClose={() => setConversationDrawer(null)}
          type={conversationDrawer.type}
          id={conversationDrawer.id}
          title={conversationDrawer.title}
        />
      )}
    </div>
  );
}