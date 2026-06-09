import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BookOpen, Award, FileText, GraduationCap, Play, CheckCircle2, Clock, Star,
  TrendingUp, Zap, ArrowRight, Download, Eye, Sparkles, Users,
  ChevronRight, ShieldCheck, Plus, LayoutGrid, List, Heart, MessageCircle,
  Send, UserPlus, UserCheck, Reply, MoreHorizontal, Globe, Loader2,
  MessageSquare, Share2, X, BookMarked, Hash, Pin, Bookmark, Filter,
  ExternalLink, MessagesSquare, PenLine, AtSign, Bell, BookCheck, Flame,
} from "lucide-react";

interface Enrollment {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  isPaid: boolean;
  createdAt: string;
  course: {
    id: string;
    title: string;
    description: string;
    featuredImage?: string;
    thumbnail?: string;
    instructor?: { firstName: string; lastName: string; id?: string };
    isFree: boolean;
    price?: string;
    category?: string;
    lessonsCount?: number;
    duration?: string;
  };
}

interface Assignment {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  status: string;
  tutorFeedback?: string;
  submittedAt: string;
}

interface Certificate {
  id: string;
  certCode: string;
  courseTitle: string;
  studentName: string;
  instructorName?: string;
  issuedAt: string;
}

interface CommunityPost {
  id: string;
  courseId: string;
  userId: string;
  message: string;
  replyToId?: string | null;
  topic?: string | null;
  likeCount: number;
  liked: boolean;
  createdAt: string;
  authorFirstName?: string;
  authorLastName?: string;
  authorAvatar?: string;
  authorType?: string;
}

interface Classmate {
  userId: string;
  courseId: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  userType?: string;
  creatorTier?: string;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  instagram_growth: "from-pink-500 to-purple-600",
  tiktok_mastery: "from-gray-900 to-gray-700",
  youtube: "from-red-500 to-red-700",
  monetization: "from-yellow-500 to-orange-500",
  content_creation: "from-blue-500 to-cyan-500",
  branding: "from-violet-500 to-indigo-600",
  general: "from-teal-500 to-green-600",
};
const FALLBACK_IMG: Record<string, string> = {
  instagram_growth: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=220&fit=crop",
  tiktok_mastery: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&h=220&fit=crop",
  youtube: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=220&fit=crop",
  monetization: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=220&fit=crop",
  content_creation: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=220&fit=crop",
  branding: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=220&fit=crop",
  general: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=220&fit=crop",
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  pending_payment: { label: "Pending Payment", color: "bg-amber-100 text-amber-700" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  reviewed: { label: "Reviewed", color: "bg-violet-100 text-violet-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Needs Revision", color: "bg-red-100 text-red-700" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(first?: string, last?: string) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

export default function MyTraining() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [postText, setPostText] = useState("");
  const [postCourseId, setPostCourseId] = useState<string>("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; message: string } | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement>(null);
  // Community forum state
  const [commView, setCommView] = useState<"forum" | "tutors">("forum");
  const [activeTopic, setActiveTopic] = useState<string>("All");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadTopic, setNewThreadTopic] = useState("General");
  const [newThreadMessage, setNewThreadMessage] = useState("");
  const u = user as any;

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: ["/api/courses/my-enrollments"],
    enabled: isAuthenticated,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/my/assignments"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/my/assignments");
      return r.json();
    },
    enabled: isAuthenticated,
  });

  const { data: certificates = [], isLoading: certsLoading } = useQuery<Certificate[]>({
    queryKey: ["/api/my-certificates"],
    enabled: isAuthenticated,
  });

  const { data: breedskoolRegs = [] } = useQuery<any[]>({
    queryKey: ["/api/my/breedskool-registrations"],
    enabled: isAuthenticated,
  });

  const { data: communityPosts = [], refetch: refetchPosts, isLoading: postsLoading } = useQuery<CommunityPost[]>({
    queryKey: ["/api/my/training/community"],
    enabled: isAuthenticated && enrollments.length > 0,
    refetchInterval: 15000,
  });

  const { data: classmates = [] } = useQuery<Classmate[]>({
    queryKey: ["/api/my/training/classmates"],
    enabled: isAuthenticated && enrollments.length > 0,
  });

  // Set default post course when enrollments load
  useEffect(() => {
    if (enrollments.length && !postCourseId) {
      const active = enrollments.find(e => e.status === "active") || enrollments[0];
      if (active) setPostCourseId(active.courseId);
    }
  }, [enrollments, postCourseId]);

  const becomeCreator = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PATCH", "/api/user/become-creator");
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowUpgradeDialog(false);
      toast({ title: "🎉 You're now a Creator!", description: "Start applying for brand campaigns and earning!" });
      setTimeout(() => setLocation("/dashboard?tab=campaigns"), 1500);
    },
    onError: (e: any) => toast({ title: "Upgrade failed", description: e.message, variant: "destructive" }),
  });

  const createPost = useMutation({
    mutationFn: async ({ message, replyToId, topic }: { message: string; replyToId?: string | null; topic?: string }) => {
      if (!postCourseId) throw new Error("Select a course to post in.");
      const r = await apiRequest("POST", `/api/courses/${postCourseId}/community/posts`, { message, replyToId: replyToId || null, topic: topic || "General" });
      return r.json();
    },
    onSuccess: () => {
      setPostText(""); setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/my/training/community"] });
      toast({ title: "Posted! ✅" });
    },
    onError: (e: any) => toast({ title: "Post failed", description: e.message, variant: "destructive" }),
  });

  const likePost = useMutation({
    mutationFn: async ({ courseId, postId }: { courseId: string; postId: string }) =>
      (await apiRequest("POST", `/api/courses/${courseId}/community/posts/${postId}/like`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/my/training/community"] }),
  });

  const followUser = useMutation({
    mutationFn: async (userId: string) => (await apiRequest("POST", `/api/users/${userId}/follow`)).json(),
    onSuccess: (_data, userId) => {
      setFollowedUsers(prev => {
        const next = new Set(prev);
        next.has(userId) ? next.delete(userId) : next.add(userId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e: any) => toast({ title: "Couldn't follow", description: e?.message, variant: "destructive" }),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-xl">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Your Training Dashboard</h2>
          <p className="text-gray-500">Log in to access your courses, certificates, and progress.</p>
          <Button onClick={() => setLocation("/login?redirect=/my-training")} className="bg-violet-600 hover:bg-violet-700 text-white px-8">
            Log In to Continue
          </Button>
        </div>
      </div>
    );
  }

  const activeEnrollments = enrollments.filter(e => e.status === "active");
  const isCreator = u?.userType === "creator" || u?.userType === "admin";
  const lastActive = [...enrollments].filter(e => e.status === "active").sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  const filteredEnrollments = selectedCourseId ? enrollments.filter(e => e.courseId === selectedCourseId) : enrollments;

  // Group posts: top-level vs replies
  const topPosts = communityPosts.filter(p => !p.replyToId);
  const repliesMap: Record<string, CommunityPost[]> = {};
  communityPosts.filter(p => p.replyToId).forEach(p => {
    if (p.replyToId) {
      repliesMap[p.replyToId] = repliesMap[p.replyToId] || [];
      repliesMap[p.replyToId].push(p);
    }
  });

  const courseMap: Record<string, string> = {};
  enrollments.forEach(e => { courseMap[e.courseId] = e.course.title; });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ── Hero with background image ── */}
      <div className="relative overflow-hidden pt-16">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&h=600&fit=crop&q=85')" }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/90 via-indigo-900/85 to-purple-900/90" />
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
                  <BookMarked className="h-3.5 w-3.5 text-violet-200" />
                  <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">BreedSkool</span>
                </div>
                {activeEnrollments.length > 0 && (
                  <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full text-emerald-300 text-xs font-semibold">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    {activeEnrollments.length} Active
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 leading-tight">
                Welcome back, {u?.firstName || "Student"} 👋
              </h1>
              <p className="text-white/70 max-w-lg text-base">
                {activeEnrollments.length > 0
                  ? `You have ${activeEnrollments.length} active course${activeEnrollments.length > 1 ? "s" : ""}. Keep the momentum going!`
                  : "Enroll in a course to start your learning journey."}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/breedskool">
                <Button className="bg-white text-violet-700 hover:bg-violet-50 font-bold gap-2 shadow-lg" data-testid="btn-browse-more-courses">
                  <Plus className="h-4 w-4" /> Enroll in Course
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2 backdrop-blur" data-testid="btn-messages">
                  <MessageSquare className="h-4 w-4" /> Messages
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-6">
            {[
              { label: "Enrolled", value: enrollments.length, icon: BookOpen, color: "bg-blue-400/20 text-blue-200", border: "border-blue-400/20" },
              { label: "Active", value: activeEnrollments.length, icon: Play, color: "bg-emerald-400/20 text-emerald-200", border: "border-emerald-400/20" },
              { label: "Assignments", value: assignments.length, icon: FileText, color: "bg-violet-400/20 text-violet-200", border: "border-violet-400/20" },
              { label: "Certificates", value: certificates.length, icon: Award, color: "bg-amber-400/20 text-amber-200", border: "border-amber-400/20" },
            ].map(s => (
              <div key={s.label} className={`bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center gap-3 border ${s.border} hover:bg-white/15 transition-colors`}>
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-white/60">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Continue Where You Left Off ── */}
      {lastActive && (
        <div className="max-w-7xl mx-auto px-4 -mt-4 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-0 md:gap-6">
              <div className="relative w-full md:w-52 h-36 md:h-full shrink-0">
                <img
                  src={lastActive.course.thumbnail || FALLBACK_IMG[lastActive.course.category || "general"] || FALLBACK_IMG.general}
                  alt={lastActive.course.title}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${CATEGORY_GRADIENTS[lastActive.course.category || "general"] || CATEGORY_GRADIENTS.general} opacity-40`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="flex-1 p-5 md:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">Continue Learning</span>
                </div>
                <h3 className="font-black text-gray-900 text-lg mb-1 leading-snug">{lastActive.course.title}</h3>
                {lastActive.course.instructor && (
                  <p className="text-sm text-gray-500 mb-3">by {lastActive.course.instructor.firstName} {lastActive.course.instructor.lastName}</p>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <Progress value={lastActive.progress || 0} className="h-2 flex-1 max-w-xs" />
                  <span className="text-sm font-bold text-violet-600">{lastActive.progress || 0}%</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link href={`/breedskool/${lastActive.courseId}/learn`}>
                    <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold gap-2 shadow-md" data-testid="btn-continue-learning">
                      <Play className="h-4 w-4" /> Resume Course
                    </Button>
                  </Link>
                  <Link href={`/breedskool/${lastActive.courseId}`}>
                    <Button variant="outline" className="gap-2 text-gray-600" data-testid="btn-view-course-detail">
                      <Eye className="h-4 w-4" /> Details
                    </Button>
                  </Link>
                  {lastActive.course.instructor?.id && (
                    <Link href={`/messages?to=${lastActive.course.instructor.id}`}>
                      <Button variant="outline" className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50" data-testid="btn-chat-tutor">
                        <MessageSquare className="h-4 w-4" /> Chat Tutor
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Become Creator CTA */}
        {!isCreator && enrollments.some(e => (e.progress || 0) >= 50) && (
          <div className="mb-6 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4 shadow-lg">
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-yellow-300" />
                <span className="font-bold text-lg">Ready to monetize your skills?</span>
              </div>
              <p className="text-white/80 text-sm">Upgrade your account to apply for brand campaigns and earn real crypto rewards.</p>
            </div>
            <Button onClick={() => setShowUpgradeDialog(true)} className="bg-white text-violet-700 hover:bg-violet-50 font-bold shrink-0" data-testid="btn-become-creator">
              <TrendingUp className="h-4 w-4 mr-2" /> Become a Creator
            </Button>
          </div>
        )}

        <Tabs defaultValue="courses">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <TabsList className="bg-white border shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="courses" data-testid="tab-my-courses" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> My Courses
                {enrollments.length > 0 && <Badge className="bg-violet-100 text-violet-700 text-xs px-1.5">{enrollments.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="community" data-testid="tab-community" className="gap-1.5">
                <Users className="h-4 w-4" /> Community
                {communityPosts.length > 0 && <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5">{communityPosts.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="assignments" data-testid="tab-my-assignments" className="gap-1.5">
                <FileText className="h-4 w-4" /> Assignments
                {assignments.filter(a => a.status === "submitted").length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5">{assignments.filter(a => a.status === "submitted").length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="certificates" data-testid="tab-my-certs" className="gap-1.5">
                <Award className="h-4 w-4" /> Certificates
              </TabsTrigger>
              <TabsTrigger value="registrations" data-testid="tab-my-regs" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Registrations
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Courses Tab ── */}
          <TabsContent value="courses">
            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden mb-6 h-36">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&h=320&fit=crop&q=80')" }} />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-900/95 to-indigo-800/80" />
              <div className="relative z-10 flex items-center h-full px-8 gap-6">
                <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">My Courses</h2>
                  <p className="text-white/60 text-sm">{activeEnrollments.length} active · {enrollments.length} total enrolled</p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-3">
                  {[
                    { label: "Active", val: activeEnrollments.length, color: "text-emerald-300" },
                    { label: "Completed", val: enrollments.filter(e => (e.progress || 0) >= 100).length, color: "text-amber-300" },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-white/10 backdrop-blur rounded-2xl px-4 py-2">
                      <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
                      <div className="text-white/50 text-[10px]">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {enrollments.length > 1 && (
              <div className="mb-5 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500 mr-1">Filter:</span>
                <button
                  onClick={() => setSelectedCourseId(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!selectedCourseId ? "bg-violet-600 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  data-testid="btn-filter-all-courses"
                >
                  All ({enrollments.length})
                </button>
                {enrollments.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedCourseId(selectedCourseId === e.courseId ? null : e.courseId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all max-w-[180px] truncate ${selectedCourseId === e.courseId ? "bg-violet-600 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    data-testid={`btn-filter-course-${e.courseId}`}
                    title={e.course.title}
                  >
                    {e.course.title.length > 22 ? e.course.title.slice(0, 22) + "…" : e.course.title}
                  </button>
                ))}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg border ${viewMode === "grid" ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-white border-gray-200 text-gray-400"}`} data-testid="btn-view-grid"><LayoutGrid className="h-4 w-4" /></button>
                  <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg border ${viewMode === "list" ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-white border-gray-200 text-gray-400"}`} data-testid="btn-view-list"><List className="h-4 w-4" /></button>
                </div>
              </div>
            )}

            {enrollmentsLoading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-3"}>
                {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border" />)}
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-10 w-10 text-violet-300" />
                </div>
                <h3 className="font-bold text-gray-700 text-lg mb-2">No courses enrolled yet</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Browse our catalog and enroll in a course to start building income-ready skills.</p>
                <Link href="/breedskool">
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold gap-2 px-6" data-testid="btn-browse-courses-empty">
                    <Plus className="h-4 w-4" /> Browse Courses
                  </Button>
                </Link>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEnrollments.map(e => <CourseCard key={e.id} enrollment={e} />)}
                <Link href="/breedskool">
                  <div className="group bg-white rounded-2xl border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[260px] gap-3 p-6" data-testid="card-add-course">
                    <div className="w-14 h-14 bg-violet-100 group-hover:bg-violet-200 rounded-2xl flex items-center justify-center transition-colors">
                      <Plus className="h-7 w-7 text-violet-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-violet-600 text-sm">Add Another Course</p>
                      <p className="text-xs text-gray-400 mt-1">Browse our full course catalog</p>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEnrollments.map(e => <CourseListItem key={e.id} enrollment={e} />)}
                <Link href="/breedskool">
                  <div className="bg-white rounded-xl border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50 transition-all p-4 flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 bg-violet-100 group-hover:bg-violet-200 rounded-xl flex items-center justify-center transition-colors">
                      <Plus className="h-5 w-5 text-violet-500" />
                    </div>
                    <span className="font-semibold text-violet-600 text-sm">Enroll in another course →</span>
                  </div>
                </Link>
              </div>
            )}
          </TabsContent>

          {/* ── Community Tab ── */}
          <TabsContent value="community">
            {/* Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden mb-6 h-44">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&h=400&fit=crop&q=85')" }} />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 via-indigo-900/90 to-violet-900/80" />
              <div className="relative z-10 flex items-center justify-between h-full px-8 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessagesSquare className="h-5 w-5 text-blue-300" />
                    <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Learning Community</span>
                  </div>
                  <h2 className="text-2xl font-black text-white leading-tight">Connect · Discuss · Grow</h2>
                  <p className="text-white/60 text-sm mt-1">A space for students and tutors to collaborate</p>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-4 py-3">
                    <div className="text-xl font-black text-white">{communityPosts.filter(p => !p.replyToId).length}</div>
                    <div className="text-white/60 text-[10px]">Threads</div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur rounded-2xl px-4 py-3">
                    <div className="text-xl font-black text-white">{classmates.length}</div>
                    <div className="text-white/60 text-[10px]">Students</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tab switcher */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div className="flex bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
                <button
                  onClick={() => setCommView("forum")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${commView === "forum" ? "bg-indigo-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`}
                  data-testid="btn-comm-forum"
                >
                  <Hash className="h-4 w-4" /> Discussion Board
                </button>
                <button
                  onClick={() => setCommView("tutors")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${commView === "tutors" ? "bg-indigo-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"}`}
                  data-testid="btn-comm-tutors"
                >
                  <MessageSquare className="h-4 w-4" /> Private Chat
                </button>
              </div>
              {commView === "forum" && enrollments.some(e => e.status === "active") && (
                <Button
                  onClick={() => setShowNewThread(true)}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white gap-2 ml-auto rounded-xl shadow"
                  data-testid="btn-new-thread"
                >
                  <PenLine className="h-4 w-4" /> New Thread
                </Button>
              )}
            </div>

            {commView === "forum" ? (
              <div className="grid lg:grid-cols-[220px,1fr] gap-6">
                {/* Topic Sidebar */}
                <aside className="space-y-2">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 mb-3">Topics</p>
                  {[
                    { key: "All", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
                    { key: "General", icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-50" },
                    { key: "Questions", icon: AtSign, color: "text-violet-500", bg: "bg-violet-50" },
                    { key: "Resources", icon: BookMarked, color: "text-emerald-500", bg: "bg-emerald-50" },
                    { key: "Projects", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
                    { key: "Announcements", icon: Bell, color: "text-red-500", bg: "bg-red-50" },
                    { key: "Study Tips", icon: BookCheck, color: "text-teal-500", bg: "bg-teal-50" },
                  ].map(({ key, icon: Icon, color, bg }) => {
                    const count = key === "All"
                      ? topPosts.length
                      : topPosts.filter(p => (p.topic || "General") === key).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTopic(key)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTopic === key ? "bg-indigo-600 text-white shadow" : "text-gray-700 hover:bg-gray-100"}`}
                        data-testid={`btn-topic-${key}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTopic === key ? "bg-white/20" : bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${activeTopic === key ? "text-white" : color}`} />
                        </div>
                        <span className="flex-1 text-left">{key}</span>
                        {count > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTopic === key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </aside>

                {/* Thread Feed */}
                <div className="space-y-4 min-w-0" ref={feedRef}>
                  {postsLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border" />)}</div>
                  ) : (() => {
                    const filtered = topPosts.filter(p => activeTopic === "All" || (p.topic || "General") === activeTopic);
                    if (filtered.length === 0) return (
                      <div className="bg-white rounded-3xl border border-dashed text-center py-16 px-6">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Hash className="h-8 w-8 text-indigo-300" />
                        </div>
                        <h3 className="font-bold text-gray-700 mb-1">No threads in {activeTopic} yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Be the first to start a conversation!</p>
                        <Button onClick={() => setShowNewThread(true)} className="bg-indigo-600 text-white gap-2 rounded-xl" size="sm">
                          <PenLine className="h-3.5 w-3.5" /> Start First Thread
                        </Button>
                      </div>
                    );
                    return filtered.map(post => (
                      <ForumThreadCard
                        key={post.id}
                        post={post}
                        replies={repliesMap[post.id] || []}
                        courseLabel={courseMap[post.courseId]}
                        currentUserId={u?.id}
                        followedUsers={followedUsers}
                        onLike={() => likePost.mutate({ courseId: post.courseId, postId: post.id })}
                        onReply={() => { setReplyTo({ id: post.id, name: `${post.authorFirstName} ${post.authorLastName}`, message: post.message }); setShowNewThread(true); setNewThreadTopic(post.topic || "General"); setNewThreadMessage(""); }}
                        onFollow={(uid) => followUser.mutate(uid)}
                        onLikeReply={(reply) => likePost.mutate({ courseId: reply.courseId, postId: reply.id })}
                      />
                    ));
                  })()}
                </div>
              </div>
            ) : (
              /* Private Chat with Tutors view */
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-3xl p-6 text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Private Tutor Chat</h3>
                  <p className="text-gray-500 text-sm">Send a direct message to your course instructor. They'll respond as soon as possible.</p>
                </div>
                {enrollments.filter(e => e.status === "active" && e.course.instructor?.id).length === 0 ? (
                  <div className="bg-white border rounded-3xl text-center py-12">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No instructors available yet. Enroll in a course to unlock tutor chat.</p>
                  </div>
                ) : (
                  enrollments.filter(e => e.status === "active" && e.course.instructor?.id).map(e => (
                    <div key={e.id} className="bg-white border border-gray-200 rounded-3xl p-6 flex items-center gap-5 hover:shadow-lg hover:border-indigo-200 transition-all group">
                      <div className="relative shrink-0">
                        <Avatar className="h-16 w-16 ring-4 ring-indigo-100 group-hover:ring-indigo-300 transition-all">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg font-black">
                            {initials(e.course.instructor?.firstName, e.course.instructor?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-gray-900 text-lg">{e.course.instructor?.firstName} {e.course.instructor?.lastName}</h4>
                        <p className="text-indigo-600 font-semibold text-sm">Instructor · {e.course.title}</p>
                        <p className="text-gray-500 text-xs mt-1">Tap "Message" to open a private conversation</p>
                      </div>
                      <Link href={`/messages?to=${e.course.instructor?.id}`}>
                        <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white gap-2 rounded-2xl shadow-lg hover:shadow-indigo-500/30 transition-all" data-testid={`btn-msg-tutor-${e.courseId}`}>
                          <MessageSquare className="h-4 w-4" /> Message
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
                {/* Classmates panel below */}
                {classmates.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-3xl p-6 mt-4">
                    <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-violet-500" /> Your Classmates
                      <Badge className="bg-violet-100 text-violet-700 ml-auto">{classmates.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {classmates.slice(0, 12).map(c => (
                        <div key={c.userId} className="flex items-center gap-2.5 p-3 rounded-2xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-all">
                          <Link href={`/profile/${c.userId}`}>
                            <Avatar className="h-8 w-8 shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-300 transition-all">
                              <AvatarImage src={c.profileImageUrl || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-indigo-500 text-white text-xs font-bold">{initials(c.firstName, c.lastName)}</AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                            {c.userId !== u?.id && (
                              <button onClick={() => followUser.mutate(c.userId)} className={`text-[10px] font-semibold transition-colors ${followedUsers.has(c.userId) ? "text-gray-400" : "text-violet-600"}`} data-testid={`btn-follow-${c.userId}`}>
                                {followedUsers.has(c.userId) ? "Following" : "Follow"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* New Thread Dialog */}
            <Dialog open={showNewThread} onOpenChange={(v) => { setShowNewThread(v); if (!v) { setReplyTo(null); setNewThreadMessage(""); }}}>
              <DialogContent className="max-w-lg" aria-describedby="new-thread-desc">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PenLine className="h-5 w-5 text-indigo-600" />
                    {replyTo ? `Reply to ${replyTo.name}` : "Start a New Thread"}
                  </DialogTitle>
                  <DialogDescription id="new-thread-desc">
                    {replyTo ? "Add your reply to this discussion." : "Share a question, insight, or resource with your classmates."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {!replyTo && (
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-2 block">Topic Category</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["General", "Questions", "Resources", "Projects", "Announcements", "Study Tips"].map(t => (
                          <button
                            key={t}
                            onClick={() => setNewThreadTopic(t)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${newThreadTopic === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}
                            data-testid={`btn-thread-topic-${t}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {replyTo && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-gray-600">
                      <span className="font-bold text-indigo-700">Replying to:</span> {replyTo.message.slice(0, 120)}{replyTo.message.length > 120 ? "…" : ""}
                    </div>
                  )}
                  {enrollments.length > 1 && (
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Course</label>
                      <select value={postCourseId} onChange={e => setPostCourseId(e.target.value)} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-white" data-testid="select-thread-course">
                        {enrollments.filter(e => e.status === "active").map(e => (
                          <option key={e.courseId} value={e.courseId}>{e.course.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">{replyTo ? "Your Reply" : "Message"}</label>
                    <Textarea
                      placeholder={replyTo ? "Write your reply..." : "Share your thoughts, questions, or resources…"}
                      value={replyTo ? postText : newThreadMessage}
                      onChange={e => replyTo ? setPostText(e.target.value) : setNewThreadMessage(e.target.value)}
                      className="min-h-[120px] resize-none border-gray-200 focus:border-indigo-300 rounded-xl"
                      data-testid="input-new-thread-message"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setShowNewThread(false); setReplyTo(null); setNewThreadMessage(""); }} className="flex-1 rounded-xl">Cancel</Button>
                    <Button
                      onClick={() => {
                        const msg = replyTo ? postText : newThreadMessage;
                        if (!msg.trim()) return;
                        createPost.mutate({ message: msg.trim(), replyToId: replyTo?.id, topic: replyTo ? (replyTo as any).topic : newThreadTopic });
                        setShowNewThread(false);
                        setReplyTo(null);
                        setNewThreadMessage("");
                        setPostText("");
                      }}
                      disabled={createPost.isPending || !(replyTo ? postText : newThreadMessage).trim()}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl gap-2"
                      data-testid="btn-submit-thread"
                    >
                      {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {replyTo ? "Post Reply" : "Start Thread"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── Assignments Tab ── */}
          <TabsContent value="assignments">
            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden mb-6 h-36">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1400&h=320&fit=crop&q=80')" }} />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-900/95 to-orange-700/80" />
              <div className="relative z-10 flex items-center h-full px-8 gap-6">
                <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Assignments</h2>
                  <p className="text-white/60 text-sm">{assignments.length} total · {assignments.filter(a => a.status === "submitted").length} awaiting review</p>
                </div>
              </div>
            </div>
            {assignmentsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl p-5 h-24 animate-pulse border" />)}</div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">No assignments yet</h3>
                <p className="text-gray-500 text-sm">Submit assignments from your course lessons.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(a => {
                  const statusInfo = STATUS_BADGE[a.status] || { label: a.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={a.id} data-testid={`card-assignment-${a.id}`} className="bg-white rounded-xl border shadow-sm p-5 flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FileText className="h-4 w-4 text-violet-500" />
                          <span className="font-semibold text-gray-900">{a.title}</span>
                          <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        {a.description && <p className="text-sm text-gray-500 mb-2">{a.description}</p>}
                        {a.tutorFeedback && (
                          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mt-2">
                            <p className="text-xs font-semibold text-violet-700 mb-1">Tutor Feedback:</p>
                            <p className="text-sm text-violet-800">{a.tutorFeedback}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">Submitted {new Date(a.submittedAt).toLocaleDateString()}</p>
                      </div>
                      {a.fileUrl && (
                        <div className="shrink-0">
                          <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" data-testid={`btn-download-assignment-${a.id}`}>
                              <Download className="h-4 w-4 mr-1" /> {a.fileName || "Download"}
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Certificates Tab ── */}
          <TabsContent value="certificates">
            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden mb-6 h-36">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1400&h=320&fit=crop&q=80')" }} />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-900/95 to-yellow-700/80" />
              <div className="relative z-10 flex items-center h-full px-8 gap-6">
                <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                  <Award className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">My Certificates</h2>
                  <p className="text-white/60 text-sm">{certificates.length} certificate{certificates.length !== 1 ? "s" : ""} earned · Complete courses to unlock more</p>
                </div>
              </div>
            </div>
            {certsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2].map(i => <div key={i} className="bg-white rounded-2xl p-6 h-40 animate-pulse border" />)}</div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">No certificates yet</h3>
                <p className="text-gray-500 text-sm">Complete a course to earn your first certificate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map(c => (
                  <div key={c.id} data-testid={`card-cert-${c.id}`} className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Award className="h-6 w-6 text-amber-600" />
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-0">Verified</Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.courseTitle}</h3>
                      <p className="text-sm text-gray-600">{c.studentName}</p>
                      {c.instructorName && <p className="text-xs text-gray-500">Instructor: {c.instructorName}</p>}
                      <p className="text-xs text-gray-400 mt-1">Issued {new Date(c.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Link href={`/certificates/${c.certCode}`}>
                        <Button size="sm" variant="outline" className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" data-testid={`btn-view-cert-${c.id}`}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="gap-1 border-gray-300" data-testid={`btn-share-cert-${c.id}`}
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/certificates/${c.certCode}`); toast({ title: "Link copied!" }); }}>
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Registrations Tab ── */}
          <TabsContent value="registrations">
            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden mb-6 h-36">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1400&h=320&fit=crop&q=80')" }} />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/95 to-teal-700/80" />
              <div className="relative z-10 flex items-center h-full px-8 gap-6">
                <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">BreedSkool Registrations</h2>
                  <p className="text-white/60 text-sm">{breedskoolRegs.length} registration{breedskoolRegs.length !== 1 ? "s" : ""} · Track your enrollment journey</p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-3">
                  {[
                    { label: "Verified", val: breedskoolRegs.filter((r: any) => r.paymentStatus === "verified").length, color: "text-emerald-300" },
                    { label: "Pending", val: breedskoolRegs.filter((r: any) => r.paymentStatus === "pending" || !r.paymentStatus).length, color: "text-amber-300" },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-white/10 backdrop-blur rounded-2xl px-4 py-2">
                      <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
                      <div className="text-white/50 text-[10px]">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {breedskoolRegs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-10 w-10 text-violet-300" />
                </div>
                <h3 className="font-bold text-gray-700 text-lg mb-2">No registrations yet</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Register for a BreedSkool course — online, onsite, or home lesson — to see your full enrollment details here.</p>
                <Link href="/breedskool">
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold gap-2 px-8" data-testid="btn-browse-breedskool-empty">
                    <Plus className="h-4 w-4" /> Browse Programs
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {breedskoolRegs.map((reg: any) => <RegistrationDetailCard key={reg.id} reg={reg} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md" aria-describedby="upgrade-desc">
          <DialogHeader>
            <DialogTitle>Become a Creator</DialogTitle>
            <DialogDescription id="upgrade-desc">Upgrade your account to start earning from brand campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-5 space-y-3">
              {[
                "Apply to paid brand campaigns",
                "Earn USDT directly to your wallet",
                "Access the full influencer marketplace",
                "Build your verified creator profile",
              ].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-gray-700">{f}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => becomeCreator.mutate()} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold" disabled={becomeCreator.isPending}>
              {becomeCreator.isPending ? "Upgrading…" : "Upgrade to Creator"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Forum Thread Card ─────────────────────────────────────────────────────────
const TOPIC_STYLES: Record<string, { color: string; bg: string; icon: any }> = {
  General:       { color: "text-blue-700",    bg: "bg-blue-50",    icon: MessageCircle },
  Questions:     { color: "text-violet-700",  bg: "bg-violet-50",  icon: AtSign },
  Resources:     { color: "text-emerald-700", bg: "bg-emerald-50", icon: BookMarked },
  Projects:      { color: "text-amber-700",   bg: "bg-amber-50",   icon: Zap },
  Announcements: { color: "text-red-700",     bg: "bg-red-50",     icon: Bell },
  "Study Tips":  { color: "text-teal-700",    bg: "bg-teal-50",    icon: BookCheck },
};

function ForumThreadCard({
  post, replies, courseLabel, currentUserId, followedUsers,
  onLike, onReply, onFollow, onLikeReply,
}: {
  post: CommunityPost;
  replies: CommunityPost[];
  courseLabel?: string;
  currentUserId?: string;
  followedUsers: Set<string>;
  onLike: () => void;
  onReply: () => void;
  onFollow: (uid: string) => void;
  onLikeReply: (reply: CommunityPost) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const isOwn = post.userId === currentUserId;
  const authorName = `${post.authorFirstName || ""} ${post.authorLastName || ""}`.trim() || "Student";
  const topicKey = post.topic || "General";
  const topicStyle = TOPIC_STYLES[topicKey] || { color: "text-gray-700", bg: "bg-gray-100", icon: MessageCircle };
  const TopicIcon = topicStyle.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all" data-testid={`thread-${post.id}`}>
      {/* Thread header stripe */}
      <div className={`h-1 w-full ${topicStyle.bg.replace("50", "400")} opacity-60`} />
      <div className="p-5">
        {/* Topic + Meta row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${topicStyle.bg} ${topicStyle.color}`}>
            <TopicIcon className="h-3 w-3" /> {topicKey}
          </span>
          {courseLabel && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{courseLabel}</span>}
          <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(post.createdAt)}</span>
        </div>

        {/* Author */}
        <div className="flex items-start gap-3 mb-3">
          <Link href={`/profile/${post.userId}`}>
            <Avatar className="h-9 w-9 shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all">
              <AvatarImage src={post.authorAvatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-violet-500 text-white font-bold text-xs">
                {initials(post.authorFirstName, post.authorLastName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${post.userId}`}>
                <span className="font-bold text-gray-900 text-sm hover:text-indigo-600 cursor-pointer">{authorName}</span>
              </Link>
              {(post.authorType === "admin" || post.authorType === "instructor") && (
                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 border-0">Tutor</Badge>
              )}
            </div>
            {/* Message */}
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mt-1">{post.message}</p>
          </div>
          {!isOwn && (
            <button
              onClick={() => onFollow(post.userId)}
              className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all ${
                followedUsers.has(post.userId) ? "bg-gray-100 text-gray-500" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
              }`}
              data-testid={`btn-follow-thread-${post.userId}`}
            >
              {followedUsers.has(post.userId) ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              {followedUsers.has(post.userId) ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
          <button onClick={onLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${post.liked ? "text-red-500 bg-red-50" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} data-testid={`btn-like-thread-${post.id}`}>
            <Heart className={`h-4 w-4 ${post.liked ? "fill-red-500" : ""}`} />
            {post.likeCount > 0 && <span>{post.likeCount}</span>}
          </button>
          <button onClick={onReply} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" data-testid={`btn-reply-thread-${post.id}`}>
            <Reply className="h-4 w-4" /> Reply
          </button>
          {replies.length > 0 && (
            <button onClick={() => setShowReplies(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all ml-auto" data-testid={`btn-toggle-replies-${post.id}`}>
              <MessageCircle className="h-4 w-4" />
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showReplies ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="bg-indigo-50/40 border-t border-indigo-100 px-5 py-4 space-y-3">
          {replies.map(reply => {
            const replyName = `${reply.authorFirstName || ""} ${reply.authorLastName || ""}`.trim() || "Student";
            return (
              <div key={reply.id} className="flex items-start gap-2.5" data-testid={`reply-${reply.id}`}>
                <Link href={`/profile/${reply.userId}`}>
                  <Avatar className="h-7 w-7 shrink-0 cursor-pointer">
                    <AvatarImage src={reply.authorAvatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-[10px] font-bold">{initials(reply.authorFirstName, reply.authorLastName)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Link href={`/profile/${reply.userId}`}>
                      <span className="text-xs font-bold text-gray-900 hover:text-indigo-600 cursor-pointer">{replyName}</span>
                    </Link>
                    {(reply.authorType === "admin" || reply.authorType === "instructor") && (
                      <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1 border-0">Tutor</Badge>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                  <button onClick={() => onLikeReply(reply)} className={`mt-1.5 flex items-center gap-1 text-[10px] font-medium transition-all ${reply.liked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`} data-testid={`btn-like-reply-${reply.id}`}>
                    <Heart className={`h-3 w-3 ${reply.liked ? "fill-red-500" : ""}`} />
                    {reply.likeCount > 0 && reply.likeCount}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Post Card Component ────────────────────────────────────────────────────────
function PostCard({
  post, replies, courseLabel, currentUserId, followedUsers,
  onLike, onReply, onFollow, onLikeReply,
}: {
  post: CommunityPost;
  replies: CommunityPost[];
  courseLabel?: string;
  currentUserId?: string;
  followedUsers: Set<string>;
  onLike: () => void;
  onReply: () => void;
  onFollow: (uid: string) => void;
  onLikeReply: (reply: CommunityPost) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const isOwn = post.userId === currentUserId;
  const authorName = `${post.authorFirstName || ""} ${post.authorLastName || ""}`.trim() || "Student";

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" data-testid={`post-${post.id}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Link href={`/profile/${post.userId}`}>
            <Avatar className="h-10 w-10 shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-300 transition-all">
              <AvatarImage src={post.authorAvatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold text-sm">
                {initials(post.authorFirstName, post.authorLastName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${post.userId}`}>
                <span className="font-bold text-gray-900 text-sm hover:text-violet-600 cursor-pointer transition-colors">{authorName}</span>
              </Link>
              {post.authorType === "admin" && (
                <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1.5 border-0">Tutor</Badge>
              )}
              {courseLabel && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{courseLabel}</span>
              )}
            </div>
            <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
          </div>
          {!isOwn && (
            <button
              onClick={() => onFollow(post.userId)}
              className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                followedUsers.has(post.userId)
                  ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500"
                  : "bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200"
              }`}
              data-testid={`btn-follow-post-${post.userId}`}
            >
              {followedUsers.has(post.userId) ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              {followedUsers.has(post.userId) ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-4">{post.message}</p>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-red-50 ${post.liked ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
            data-testid={`btn-like-post-${post.id}`}
          >
            <Heart className={`h-4 w-4 ${post.liked ? "fill-red-500 text-red-500" : ""}`} />
            {post.likeCount > 0 && post.likeCount}
          </button>
          <button
            onClick={onReply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-all"
            data-testid={`btn-reply-post-${post.id}`}
          >
            <Reply className="h-4 w-4" />
            Reply
          </button>
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all ml-auto"
              data-testid={`btn-show-replies-${post.id}`}
            >
              <MessageCircle className="h-4 w-4" />
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="bg-gray-50 border-t px-5 py-3 space-y-3">
          {replies.map(reply => {
            const replyName = `${reply.authorFirstName || ""} ${reply.authorLastName || ""}`.trim() || "Student";
            return (
              <div key={reply.id} className="flex gap-2.5" data-testid={`reply-${reply.id}`}>
                <Link href={`/profile/${reply.userId}`}>
                  <Avatar className="h-7 w-7 shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-300 transition-all">
                    <AvatarImage src={reply.authorAvatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold text-[10px]">
                      {initials(reply.authorFirstName, reply.authorLastName)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-gray-100">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link href={`/profile/${reply.userId}`}>
                      <span className="text-xs font-bold text-gray-900 hover:text-violet-600 cursor-pointer">{replyName}</span>
                    </Link>
                    <span className="text-[10px] text-gray-400">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                  <button
                    onClick={() => onLikeReply(reply)}
                    className={`mt-1.5 flex items-center gap-1 text-[10px] font-medium transition-all ${reply.liked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
                    data-testid={`btn-like-reply-${reply.id}`}
                  >
                    <Heart className={`h-3 w-3 ${reply.liked ? "fill-red-500" : ""}`} />
                    {reply.likeCount > 0 && reply.likeCount}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Registration Detail Card ──────────────────────────────────────────────────
const REG_STATUS_META: Record<string, { label: string; color: string; bg: string; step: number }> = {
  registered: { label: "Registered",       color: "text-violet-700", bg: "bg-violet-100",  step: 1 },
  pending:    { label: "Pending Review",    color: "text-amber-700",  bg: "bg-amber-100",   step: 2 },
  verified:   { label: "Payment Verified",  color: "text-emerald-700",bg: "bg-emerald-100", step: 3 },
  paid:       { label: "Payment Verified",  color: "text-emerald-700",bg: "bg-emerald-100", step: 3 },
  confirmed:  { label: "Confirmed",         color: "text-blue-700",   bg: "bg-blue-100",    step: 3 },
  rejected:   { label: "Payment Rejected",  color: "text-red-700",    bg: "bg-red-100",     step: -1 },
};

const TIMELINE_STEPS = [
  { key: "registered", label: "Registration\nReceived",    icon: ShieldCheck },
  { key: "pending",    label: "Payment\nUnder Review",     icon: Clock },
  { key: "verified",   label: "Payment\nVerified",         icon: CheckCircle2 },
  { key: "access",     label: "Full Course\nAccess",       icon: GraduationCap },
];

const DELIVERY_LABELS: Record<string, string> = {
  online: "Online",
  onsite: "Onsite Group",
  home_lesson: "Home Lesson",
};
const DELIVERY_COLORS: Record<string, string> = {
  online:       "bg-blue-100 text-blue-700",
  onsite:       "bg-teal-100 text-teal-700",
  home_lesson:  "bg-pink-100 text-pink-700",
};
const PAYMENT_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  usdt_tron:     "USDT (Tron)",
  usdt_ton:      "USDT (TON)",
  usdt_bnb:      "USDT (BNB)",
};

function RegistrationDetailCard({ reg }: { reg: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusKey: string = reg.paymentStatus || "registered";
  const meta = REG_STATUS_META[statusKey] || { label: statusKey, color: "text-gray-700", bg: "bg-gray-100", step: 0 };
  const currentStep = meta.step;
  const isRejected = statusKey === "rejected";
  const isVerified = ["verified", "paid", "confirmed"].includes(statusKey);
  const deliveryMode = reg.deliveryMode || "online";

  return (
    <div data-testid={`card-reg-${reg.id}`} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Header banner ── */}
      <div className={`relative overflow-hidden px-6 pt-5 pb-4 ${isRejected ? "bg-gradient-to-r from-red-50 to-pink-50" : isVerified ? "bg-gradient-to-r from-emerald-50 to-teal-50" : "bg-gradient-to-r from-violet-50 to-indigo-50"}`}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={`text-xs font-bold border-0 ${DELIVERY_COLORS[deliveryMode] || "bg-gray-100 text-gray-700"}`}>
                {DELIVERY_LABELS[deliveryMode] || deliveryMode}
              </Badge>
              <Badge className={`text-xs font-bold border-0 ${meta.bg} ${meta.color}`}>{meta.label}</Badge>
            </div>
            <h3 className="font-black text-gray-900 text-lg leading-tight">{reg.selectedCourseTitle || "BreedSkool Program"}</h3>
            <p className="text-sm text-gray-500 mt-1">{reg.fullName} · Registered {new Date(reg.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          {reg.amountNgn > 0 && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-black text-gray-900">₦{Number(reg.amountNgn).toLocaleString("en-NG")}</div>
              {reg.paymentOption === "pay_now" && <div className="text-xs text-gray-500">Pay Now</div>}
              {reg.paymentOption === "pay_later" && <div className="text-xs text-gray-500">Pay Later</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── Progress Timeline ── */}
      {!isRejected && (
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Enrollment Journey</p>
          <div className="flex items-start gap-0">
            {TIMELINE_STEPS.map((ts, idx) => {
              const isActive = currentStep > idx;
              const isCurrent = currentStep === idx + 1;
              const Icon = ts.icon;
              return (
                <div key={ts.key} className="flex-1 flex flex-col items-center">
                  {/* connector line before */}
                  <div className="w-full flex items-center">
                    {idx > 0 && (
                      <div className={`flex-1 h-0.5 ${currentStep > idx ? "bg-violet-500" : "bg-gray-200"}`} />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive ? "bg-violet-600 border-violet-600" :
                      isCurrent ? "bg-white border-violet-500 ring-2 ring-violet-200" :
                      "bg-white border-gray-300"
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : isCurrent ? "text-violet-600" : "text-gray-400"}`} />
                    </div>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 ${currentStep > idx + 1 ? "bg-violet-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <p className={`text-center mt-2 whitespace-pre-line text-[10px] font-semibold leading-tight ${
                    isActive ? "text-violet-700" : isCurrent ? "text-violet-600" : "text-gray-400"
                  }`}>{ts.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Rejected state ── */}
      {isRejected && (
        <div className="mx-6 mt-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700 mb-1">⚠️ Payment Not Confirmed</p>
          <p className="text-xs text-red-600">{reg.notes || "Your payment could not be verified. Please contact support or re-submit your proof."}</p>
        </div>
      )}

      {/* ── Admin note (if any) ── */}
      {reg.notes && !isRejected && (
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
          <MessageCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">{reg.notes}</p>
        </div>
      )}

      {/* ── Details grid ── */}
      <div className="px-6 py-4">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 mb-3"
          data-testid={`btn-expand-reg-${reg.id}`}
        >
          {expanded ? <ChevronRight className="h-3.5 w-3.5 rotate-90" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {expanded ? "Hide Details" : "View Full Details"}
        </button>

        {expanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              { label: "Full Name",       value: reg.fullName },
              { label: "Email",           value: reg.email },
              { label: "Phone",           value: reg.phone },
              { label: "Location",        value: reg.location },
              { label: "Payment Method",  value: PAYMENT_LABELS[reg.paymentMethod] || reg.paymentMethod },
              { label: "Transaction Ref", value: reg.transactionRef, mono: true },
              { label: "Registration ID", value: reg.id, mono: true },
              { label: "Registered On",   value: new Date(reg.createdAt).toLocaleString("en-US", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
              ...(reg.childName ? [{ label: "Student Name", value: reg.childName }] : []),
              ...(reg.parentName ? [{ label: "Parent Name",  value: reg.parentName }] : []),
              ...(reg.homeAddress ? [{ label: "Home Address", value: reg.homeAddress }] : []),
            ].filter(d => d.value).map(d => (
              <div key={d.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{d.label}</p>
                <p className={`text-sm text-gray-800 font-medium break-all ${d.mono ? "font-mono text-xs" : ""}`}>{d.value}</p>
              </div>
            ))}
            {reg.paymentProof && (
              <a href={reg.paymentProof} target="_blank" rel="noopener noreferrer" className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 hover:bg-emerald-100 transition-colors">
                <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm text-emerald-700 font-semibold">View Payment Proof</span>
              </a>
            )}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-2 flex-wrap">
          {isVerified && reg.linkedCourseId && (
            <Link href={`/breedskool/${reg.linkedCourseId}/learn`}>
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold gap-1.5 shadow-md" data-testid={`btn-go-course-${reg.id}`}>
                <Play className="h-3.5 w-3.5" /> Start Training
              </Button>
            </Link>
          )}
          {reg.linkedCourseId && (
            <Link href={`/breedskool/${reg.linkedCourseId}`}>
              <Button size="sm" variant="outline" className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50" data-testid={`btn-view-course-${reg.id}`}>
                <BookOpen className="h-3.5 w-3.5" /> Course Details
              </Button>
            </Link>
          )}
          {!isVerified && !isRejected && (
            <a href={`https://wa.me/12016800266?text=${encodeURIComponent(`Hi! I registered for ${reg.selectedCourseTitle || "BreedSkool"}. Name: ${reg.fullName}. Ref: ${reg.transactionRef || reg.id}. Please confirm my payment.`)}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50" data-testid={`btn-whatsapp-reg-${reg.id}`}>
                <MessageCircle className="h-3.5 w-3.5" /> Confirm via WhatsApp
              </Button>
            </a>
          )}
          {isVerified && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Payment Verified · Full Access Granted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Course Grid Card ──────────────────────────────────────────────────────────
function CourseCard({ enrollment: e }: { enrollment: Enrollment }) {
  const statusInfo = STATUS_BADGE[e.status] || { label: e.status, color: "bg-gray-100 text-gray-600" };
  const imgSrc = e.course.thumbnail || FALLBACK_IMG[e.course.category || "general"] || FALLBACK_IMG.general;
  const gradient = CATEGORY_GRADIENTS[e.course.category || "general"] || CATEGORY_GRADIENTS.general;

  return (
    <div data-testid={`card-course-enrollment-${e.id}`} className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group">
      <div className="relative h-40 overflow-hidden">
        <img src={imgSrc} alt={e.course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(ev) => { (ev.target as HTMLImageElement).src = FALLBACK_IMG.general; }} />
        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-30`} />
        <div className="absolute top-3 left-3">
          <Badge className={`text-[10px] ${statusInfo.color} border-0`}>{statusInfo.label}</Badge>
        </div>
        {e.status === "active" && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 rounded-full p-3">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-violet-600 transition-colors">{e.course.title}</h3>
        {e.course.instructor && (
          <p className="text-xs text-gray-400 mb-3">by {e.course.instructor.firstName} {e.course.instructor.lastName}</p>
        )}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-bold text-violet-600">{e.progress || 0}%</span>
          </div>
          <Progress value={e.progress || 0} className="h-1.5 mb-4" />
          <div className="flex gap-2">
            {e.status === "active" ? (
              <Link href={`/breedskool/${e.courseId}/learn`} className="flex-1">
                <Button size="sm" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs gap-1" data-testid={`btn-continue-${e.id}`}>
                  <Play className="h-3 w-3" /> Continue
                </Button>
              </Link>
            ) : e.status === "pending_payment" ? (
              <div className="flex items-center gap-1 text-amber-600 text-xs flex-1">
                <Clock className="h-3.5 w-3.5" /> Awaiting payment
              </div>
            ) : null}
            <Link href={`/breedskool/${e.courseId}`}>
              <Button size="sm" variant="outline" className="text-gray-500 px-2.5" data-testid={`btn-view-${e.id}`}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Course List Item ──────────────────────────────────────────────────────────
function CourseListItem({ enrollment: e }: { enrollment: Enrollment }) {
  const statusInfo = STATUS_BADGE[e.status] || { label: e.status, color: "bg-gray-100 text-gray-600" };
  const imgSrc = e.course.thumbnail || FALLBACK_IMG[e.course.category || "general"] || FALLBACK_IMG.general;

  return (
    <div data-testid={`list-course-enrollment-${e.id}`} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0">
        <img src={imgSrc} alt={e.course.title} className="w-full h-full object-cover" onError={(ev) => { (ev.target as HTMLImageElement).src = FALLBACK_IMG.general; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <h3 className="font-bold text-gray-900 text-sm truncate">{e.course.title}</h3>
          <Badge className={`text-[10px] shrink-0 ${statusInfo.color} border-0`}>{statusInfo.label}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <Progress value={e.progress || 0} className="h-1.5 w-28" />
          <span className="text-xs text-violet-600 font-bold">{e.progress || 0}%</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {e.status === "active" && (
          <Link href={`/breedskool/${e.courseId}/learn`}>
            <Button size="sm" className="bg-violet-600 text-white text-xs gap-1" data-testid={`btn-list-continue-${e.id}`}>
              <Play className="h-3 w-3" /> Resume
            </Button>
          </Link>
        )}
        <Link href={`/breedskool/${e.courseId}`}>
          <Button size="sm" variant="outline" className="text-gray-500 px-2.5" data-testid={`btn-list-view-${e.id}`}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
