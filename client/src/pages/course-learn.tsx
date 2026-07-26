import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  PlayCircle, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft, Users,
  Lock, Send, MessageSquare, MessagesSquare, Trophy, FileText, Download,
  Sparkles, PartyPopper, Award, Loader2, File as FileIcon,
  UploadCloud, UserPlus, UserCheck, Reply, X, ClipboardList, CheckCircle,
  Clock, AlertCircle,
} from "lucide-react";

type Lesson = {
  id: string; title: string; description?: string | null;
  videoLink?: string | null; videoUrl?: string | null;
  content?: string | null; order?: number | null;
  lessonFiles?: any[]; isPreview?: boolean;
};

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

// Tiny inline confetti burst (no extra deps): random floating emojis for ~2s
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const items = Array.from({ length: 28 });
  const emojis = ["🎉", "✨", "🎊", "⭐", "🚀", "💜", "🏆"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {items.map((_, i) => {
        const left = Math.random() * 100;
        const dur = 1.4 + Math.random() * 1.6;
        const delay = Math.random() * 0.4;
        const size = 18 + Math.random() * 18;
        const e = emojis[i % emojis.length];
        return (
          <span
            key={i}
            style={{
              position: "absolute", left: `${left}%`, top: `-40px`, fontSize: size,
              animation: `confettifall ${dur}s ease-in ${delay}s forwards`,
            }}
          >{e}</span>
        );
      })}
      <style>{`@keyframes confettifall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1 }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0 }
      }`}</style>
    </div>
  );
}

export default function CourseLearn() {
  const { id, lessonId } = useParams<{ id: string; lessonId?: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("lesson");
  const [groupMessage, setGroupMessage] = useState("");
  const [tutorMessage, setTutorMessage] = useState("");
  const [confetti, setConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; message: string } | null>(null);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignFile, setAssignFile] = useState<File | null>(null);
  const [assignFiles, setAssignFiles] = useState<File[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [communityPost, setCommunityPost] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const communityRef = useRef<HTMLDivElement>(null);
  const groupChatRef = useRef<HTMLDivElement>(null);
  const tutorChatRef = useRef<HTMLDivElement>(null);

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: course } = useQuery<any>({
    queryKey: ["/api/courses", id],
    queryFn: async () => (await fetch(`/api/courses/${id}`)).json(),
    enabled: !!id,
  });

  const { data: enrollment } = useQuery<any>({
    queryKey: ["/api/courses", id, "enrollment"],
    queryFn: async () => {
      const r = await fetch(`/api/courses/${id}/enrollment`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!id && isAuthenticated,
  });

  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", id, "lessons"],
    queryFn: async () => (await fetch(`/api/courses/${id}/lessons`)).json(),
    enabled: !!id,
  });

  const { data: progress } = useQuery<any>({
    queryKey: ["/api/courses", id, "progress"],
    queryFn: async () => (await apiRequest("GET", `/api/courses/${id}/progress`)).json(),
    enabled: !!id && isAuthenticated,
  });

  const completedSet = useMemo(() => new Set<string>(progress?.completedLessonIds || []), [progress]);

  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [lessons]);

  const currentIdx = useMemo(() => {
    if (!sortedLessons.length) return -1;
    if (lessonId) {
      const idx = sortedLessons.findIndex((l) => l.id === lessonId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [sortedLessons, lessonId]);

  const current = currentIdx >= 0 ? sortedLessons[currentIdx] : null;

  const isApproved = enrollment && (enrollment.status === "active" || enrollment.isPaid || course?.isFree);

  // Auto-redirect to first lesson if URL has no lessonId
  useEffect(() => {
    if (!lessonId && sortedLessons.length && id) {
      setLocation(`/breedskool/${id}/learn/${sortedLessons[0].id}`, { replace: true });
    }
  }, [lessonId, sortedLessons, id, setLocation]);

  // ── Chat queries ───────────────────────────────────────────────────────
  const tutorId: string | null = (course?.instructorId || (course as any)?.instructor?.id) || null;
  const u = user as any;
  const myId: string | undefined = u?.id;
  const isUserTutorOrAdmin = !!u && (myId === tutorId || u.userType === "admin");

  const { data: assignments = [], refetch: refetchAssignments } = useQuery<any[]>({
    queryKey: ["/api/courses", id, "assignments"],
    queryFn: async () => (await apiRequest("GET", `/api/courses/${id}/assignments`)).json(),
    enabled: !!id && isAuthenticated && !!isApproved,
  });

  // Community: enrolled classmates
  const { data: classmates = [] } = useQuery<any[]>({
    queryKey: ["/api/courses", id, "community"],
    queryFn: async () => (await apiRequest("GET", `/api/courses/${id}/community`)).json(),
    enabled: !!id && isAuthenticated && !!isApproved,
  });

  // Community posts (dedicated threaded board)
  const { data: communityPosts = [], refetch: refetchPosts } = useQuery<any[]>({
    queryKey: ["/api/courses", id, "community", "posts"],
    queryFn: async () => (await apiRequest("GET", `/api/courses/${id}/community/posts`)).json(),
    enabled: !!id && isAuthenticated && !!isApproved,
    refetchInterval: activeTab === "community" ? 5000 : false,
  });

  const { data: groupChat = [] } = useQuery<any[]>({
    queryKey: ["/api/courses", id, "chat", "group"],
    queryFn: async () => (await apiRequest("GET", `/api/courses/${id}/chat?scope=group`)).json(),
    enabled: !!id && isAuthenticated && !!isApproved,
    refetchInterval: activeTab === "group" ? 5000 : false,
  });

  const { data: tutorChat = [] } = useQuery<any[]>({
    queryKey: ["/api/courses", id, "chat", "tutor", tutorId],
    queryFn: async () => (await apiRequest("GET", `/api/courses/${id}/chat?scope=private&with=${tutorId}`)).json(),
    enabled: !!id && isAuthenticated && !!isApproved && !!tutorId && !isUserTutorOrAdmin,
    refetchInterval: activeTab === "tutor" ? 5000 : false,
  });

  // Auto-scroll chats to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === "group" && groupChatRef.current) groupChatRef.current.scrollTop = groupChatRef.current.scrollHeight;
  }, [groupChat, activeTab]);
  useEffect(() => {
    if (activeTab === "tutor" && tutorChatRef.current) tutorChatRef.current.scrollTop = tutorChatRef.current.scrollHeight;
  }, [tutorChat, activeTab]);
  useEffect(() => {
    if (activeTab === "community" && communityRef.current) communityRef.current.scrollTop = communityRef.current.scrollHeight;
  }, [communityPosts, activeTab]);

  // ── Mutations ──────────────────────────────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: async (lid: string) => {
      const r = await apiRequest("POST", `/api/courses/${id}/lessons/${lid}/complete`);
      return r.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "progress"] });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2200);
      if (data.allDone && data.certificate) {
        setShowCelebration(true);
      } else {
        toast({ title: "Lesson completed! 🎉", description: `${data.progressPercent}% of course done.` });
        // Auto-advance to next lesson after a beat
        if (currentIdx < sortedLessons.length - 1) {
          setTimeout(() => setLocation(`/breedskool/${id}/learn/${sortedLessons[currentIdx + 1].id}`), 800);
        }
      }
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const uncompleteMutation = useMutation({
    mutationFn: async (lid: string) => {
      const r = await apiRequest("DELETE", `/api/courses/${id}/lessons/${lid}/complete`);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "progress"] });
      toast({ title: "Lesson reset", description: "Marked as not completed." });
    },
    onError: (e: any) => toast({ title: "Couldn't update lesson", description: e?.message || "Try again", variant: "destructive" }),
  });

  const submitAssignment = useMutation({
    mutationFn: async () => {
      if (!assignTitle.trim()) throw new Error("Please enter a title for your assignment");
      const fd = new FormData();
      fd.append("title", assignTitle.trim());
      if (assignDesc.trim()) fd.append("description", assignDesc.trim());
      if (current) fd.append("lessonId", current.id);
      // Support multi-file: append all selected files
      const filesToUpload = assignFiles.length > 0 ? assignFiles : (assignFile ? [assignFile] : []);
      filesToUpload.forEach(f => fd.append("files", f));
      const r = await fetch(`/api/courses/${id}/assignments`, {
        method: "POST", body: fd, credentials: "include",
      });
      if (!r.ok) throw new Error((await r.json()).message || "Upload failed");
      return r.json();
    },
    onSuccess: () => {
      setAssignTitle(""); setAssignDesc(""); setAssignFile(null); setAssignFiles([]);
      refetchAssignments();
      toast({ title: "Assignment submitted! ✅", description: "Your tutor will review it shortly." });
    },
    onError: (e: any) => toast({ title: "Submission failed", description: e?.message, variant: "destructive" }),
  });

  const followUser = useMutation({
    mutationFn: async (userId: string) => (await apiRequest("POST", `/api/users/${userId}/follow`)).json(),
    onSuccess: (_data, userId) => {
      setFollowedUsers(prev => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId); else next.add(userId);
        return next;
      });
    },
    onError: (e: any) => toast({ title: "Couldn't follow user", description: e?.message, variant: "destructive" }),
  });

  const createPost = useMutation({
    mutationFn: async ({ message, replyToId }: { message: string; replyToId?: string | null }) =>
      (await apiRequest("POST", `/api/courses/${id}/community/posts`, { message, replyToId: replyToId || null })).json(),
    onSuccess: () => {
      setCommunityPost(""); setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "community", "posts"] });
    },
    onError: (e: any) => toast({ title: "Post failed", description: e?.message, variant: "destructive" }),
  });

  const likePost = useMutation({
    mutationFn: async (postId: string) =>
      (await apiRequest("POST", `/api/courses/${id}/community/posts/${postId}/like`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "community", "posts"] }),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) =>
      (await apiRequest("DELETE", `/api/courses/${id}/community/posts/${postId}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "community", "posts"] }),
    onError: (e: any) => toast({ title: "Delete failed", description: e?.message, variant: "destructive" }),
  });

  const sendGroup = useMutation({
    mutationFn: async (msg: string) => (await apiRequest("POST", `/api/courses/${id}/chat`, { message: msg })).json(),
    onSuccess: () => {
      setGroupMessage(""); setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "chat", "group"] });
    },
    onError: (e: any) => toast({ title: "Couldn't send message", description: e?.message || "Try again", variant: "destructive" }),
  });

  const sendTutor = useMutation({
    mutationFn: async (msg: string) => {
      if (!tutorId) throw new Error("This course has no tutor assigned yet.");
      return (await apiRequest("POST", `/api/courses/${id}/chat`, { message: msg, recipientId: tutorId })).json();
    },
    onSuccess: () => {
      setTutorMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "chat", "tutor", tutorId] });
    },
    onError: (e: any) => toast({ title: "Couldn't send message", description: e?.message || "Try again", variant: "destructive" }),
  });

  // ── Guards ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="pt-32 max-w-md mx-auto text-center px-4">
          <Lock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Please sign in to start learning</h2>
          <Link href="/login"><Button className="mt-3">Sign in</Button></Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="pt-32 max-w-lg mx-auto text-center px-4">
          <Lock className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Enrollment required</h2>
          <p className="text-sm text-gray-600 mb-4">
            {enrollment ? "Your enrollment is awaiting payment confirmation." : "Enroll in this course to start learning."}
          </p>
          <Link href={`/breedskool/${id}`}><Button className="bg-violet-600 hover:bg-violet-700">Back to course page</Button></Link>
        </div>
      </div>
    );
  }

  const percent = progress?.percent ?? 0;
  const completedCount = progress?.completedCount ?? 0;
  const totalLessons = progress?.totalLessons ?? sortedLessons.length;
  const currentDone = current ? completedSet.has(current.id) : false;
  const certificate = progress?.certificate;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <ConfettiBurst active={confetti} />

      {/* Top bar with course title + progress */}
      <div className="pt-20 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/breedskool/${id}`}>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" data-testid="button-back-course">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Course
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-bold whitespace-normal break-anywhere" data-testid="text-course-title">{course.title}</h1>
                <p className="text-xs text-white/80">
                  Lesson {currentIdx + 1} of {sortedLessons.length} · {completedCount}/{totalLessons} completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:w-64">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                    data-testid="progress-bar"
                  />
                </div>
                <p className="text-xs mt-1 text-white/90">{percent}% complete</p>
              </div>
              {certificate && (
                <Link href={`/breedskool/${id}/certificate`}>
                  <Button size="sm" className="bg-white text-violet-700 hover:bg-white/90 gap-1" data-testid="button-view-certificate">
                    <Award className="h-4 w-4" /> Certificate
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[300px,minmax(0,1fr)] gap-6">
        {/* Sidebar lessons list */}
        <aside className="bg-white rounded-2xl border shadow-sm p-3 h-fit lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-hidden">
          <div className="px-2 py-2 flex items-center gap-2 border-b mb-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h3 className="font-semibold text-sm">Course Curriculum</h3>
          </div>
          <ScrollArea className="h-[60vh] lg:h-[calc(100vh-15rem)] pr-2">
            <div className="space-y-1">
              {sortedLessons.map((l, i) => {
                const isCur = current?.id === l.id;
                const done = completedSet.has(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => setLocation(`/breedskool/${id}/learn/${l.id}`)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2 transition-all ${
                      isCur
                        ? "bg-violet-50 border border-violet-200 shadow-sm"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                    data-testid={`button-lesson-${l.id}`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? "bg-green-500 text-white" : isCur ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="min-w-0 flex-1 basis-0">
                      <p className={`w-full text-sm font-medium leading-5 whitespace-normal break-anywhere ${isCur ? "text-violet-900" : done ? "text-gray-700" : "text-gray-800"}`}>
                        {l.title}
                      </p>
                      {l.videoLink && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <PlayCircle className="h-3 w-3" /> Video lesson
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {sortedLessons.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-8">No lessons yet.</div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main content: lesson + tabs */}
        <main className="space-y-4 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border w-full justify-start overflow-x-auto">
              <TabsTrigger value="lesson" data-testid="tab-lesson">
                <PlayCircle className="h-4 w-4 mr-1" /> Lesson
              </TabsTrigger>
              <TabsTrigger value="group" data-testid="tab-group-chat">
                <MessagesSquare className="h-4 w-4 mr-1" /> Group Chat
              </TabsTrigger>
              {tutorId && !isUserTutorOrAdmin && (
                <TabsTrigger value="tutor" data-testid="tab-tutor-chat">
                  <MessageSquare className="h-4 w-4 mr-1" /> Message Tutor
                </TabsTrigger>
              )}
              <TabsTrigger value="assignments" data-testid="tab-assignments">
                <ClipboardList className="h-4 w-4 mr-1" /> Assignments
              </TabsTrigger>
              <TabsTrigger value="community" data-testid="tab-community">
                <Users className="h-4 w-4 mr-1" /> Community
              </TabsTrigger>
            </TabsList>

            {/* Lesson tab */}
            <TabsContent value="lesson" className="mt-4 space-y-4">
              {!current ? (
                <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
                  No lessons in this course yet. Check back soon!
                </div>
              ) : (
                <>
                  {(current.videoLink || current.videoUrl) && (
                    <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-lg">
                      <iframe
                        src={getEmbedUrl(current.videoLink || current.videoUrl || "")}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title={current.title}
                      />
                    </div>
                  )}

                  <div className="bg-white border rounded-2xl p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <Badge className="bg-violet-100 text-violet-700 mb-2">Lesson {currentIdx + 1}</Badge>
                        <h2 className="text-2xl font-bold text-gray-900 whitespace-normal break-anywhere" data-testid="text-lesson-title">{current.title}</h2>
                        {current.description && <p className="text-gray-600 mt-1 whitespace-normal break-anywhere">{current.description}</p>}
                      </div>
                      {currentDone && (
                        <Badge className="bg-green-100 text-green-700 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </Badge>
                      )}
                    </div>

                    {current.content && (
                      <div className="prose prose-sm max-w-none mt-4 text-gray-700 whitespace-pre-wrap">
                        {current.content}
                      </div>
                    )}

                    {Array.isArray(current.lessonFiles) && current.lessonFiles.length > 0 && (
                      <div className="mt-5 border-t pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resources</p>
                        <div className="flex flex-wrap gap-2">
                          {current.lessonFiles.map((f: any, i: number) => (
                            <a key={i} href={f.url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 hover:bg-violet-50 hover:border-violet-300 transition-colors">
                              <FileIcon className="h-3.5 w-3.5 text-violet-600" /> {f.name || `File ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer nav */}
                  <div className="bg-white border rounded-2xl p-4 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      disabled={currentIdx <= 0}
                      onClick={() => current && setLocation(`/breedskool/${id}/learn/${sortedLessons[currentIdx - 1].id}`)}
                      data-testid="button-prev-lesson"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {currentDone ? (
                        <Button variant="outline" onClick={() => current && uncompleteMutation.mutate(current.id)}
                          data-testid="button-unmark-complete">
                          Unmark complete
                        </Button>
                      ) : (
                        <Button
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                          disabled={!current || completeMutation.isPending}
                          onClick={() => current && completeMutation.mutate(current.id)}
                          data-testid="button-mark-complete"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Complete
                        </Button>
                      )}
                    </div>
                    <Button
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                      disabled={currentIdx >= sortedLessons.length - 1}
                      onClick={() => current && setLocation(`/breedskool/${id}/learn/${sortedLessons[currentIdx + 1].id}`)}
                      data-testid="button-next-lesson"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Group chat */}
            <TabsContent value="group" className="mt-4">
              <ChatPanel
                title="Course Group Chat"
                subtitle="Chat with everyone enrolled in this course"
                icon={<Users className="h-5 w-5 text-cyan-600" />}
                messages={groupChat}
                myId={myId}
                inputValue={groupMessage}
                onChange={setGroupMessage}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
                onReply={(msg) => setReplyTo(msg)}
                onFollow={(uid) => uid !== myId && followUser.mutate(uid)}
                followedUsers={followedUsers}
                onSend={() => {
                  if (!groupMessage.trim()) return;
                  const fullMsg = replyTo
                    ? `↩ @${replyTo.name}: "${replyTo.message.slice(0, 40)}${replyTo.message.length > 40 ? "…" : ""}"\n${groupMessage.trim()}`
                    : groupMessage.trim();
                  sendGroup.mutate(fullMsg);
                }}
                sending={sendGroup.isPending}
                scrollRef={groupChatRef}
              />
            </TabsContent>

            {/* Tutor chat */}
            {tutorId && !isUserTutorOrAdmin && (
              <TabsContent value="tutor" className="mt-4">
                <ChatPanel
                  title="Private chat with your tutor"
                  subtitle="Only you and the tutor can see these messages"
                  icon={<MessageSquare className="h-5 w-5 text-violet-600" />}
                  messages={tutorChat}
                  myId={myId}
                  inputValue={tutorMessage}
                  onChange={setTutorMessage}
                  onSend={() => tutorMessage.trim() && sendTutor.mutate(tutorMessage.trim())}
                  sending={sendTutor.isPending}
                  scrollRef={tutorChatRef}
                />
              </TabsContent>
            )}

            {/* Assignments tab */}
            <TabsContent value="assignments" className="mt-4 space-y-4">
              {/* Submit new assignment */}
              <div className="bg-white border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-violet-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Submit Assignment</h3>
                    <p className="text-xs text-gray-500">For: {current ? `Lesson ${currentIdx + 1} — ${current.title}` : "Current lesson"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder="Assignment title (e.g. Week 1 Project)"
                    value={assignTitle}
                    onChange={e => setAssignTitle(e.target.value)}
                    data-testid="input-assignment-title"
                  />
                  <Textarea
                    placeholder="Description or notes for your tutor (optional)"
                    value={assignDesc}
                    onChange={e => setAssignDesc(e.target.value)}
                    rows={3}
                    data-testid="input-assignment-desc"
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Attach files (PDF, image, Word doc, ZIP — up to 5 files)</label>
                    <label
                      className="flex items-center gap-2 border-2 border-dashed border-violet-200 rounded-xl p-3 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
                      htmlFor="assign-file-input"
                    >
                      <UploadCloud className="h-5 w-5 text-violet-500 flex-shrink-0" />
                      <span className="text-sm text-gray-500 truncate">
                        {assignFiles.length > 0
                          ? `${assignFiles.length} file${assignFiles.length > 1 ? "s" : ""} selected`
                          : assignFile ? assignFile.name : "Click to choose files"}
                      </span>
                    </label>
                    <input
                      id="assign-file-input"
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.zip"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setAssignFiles(files);
                        setAssignFile(files[0] || null);
                      }}
                    />
                    {assignFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {assignFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                            <span className="truncate flex-1">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = assignFiles.filter((_, j) => j !== i);
                                setAssignFiles(next);
                                setAssignFile(next[0] || null);
                              }}
                              className="text-red-500 hover:text-red-700 shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
                    onClick={() => submitAssignment.mutate()}
                    disabled={submitAssignment.isPending || !assignTitle.trim()}
                    data-testid="button-submit-assignment"
                  >
                    {submitAssignment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    Submit Assignment
                  </Button>
                </div>
              </div>

              {/* Past submissions */}
              <div className="bg-white border rounded-2xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-violet-600" /> My Submissions ({assignments.length})
                </h3>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No assignments submitted yet.</p>
                    <p className="text-xs mt-1">Use the form above to submit your first assignment.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((a: any) => {
                      const isRejected = a.status === "rejected";
                      const statusIcon = a.status === "approved" ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : isRejected ? <AlertCircle className="h-4 w-4 text-red-500" />
                        : a.status === "reviewed" ? <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        : <Clock className="h-4 w-4 text-yellow-500" />;
                      const statusColor = a.status === "approved" ? "bg-green-100 text-green-700"
                        : isRejected ? "bg-red-100 text-red-700"
                        : a.status === "reviewed" ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700";
                      return (
                        <div key={a.id} className={`border rounded-xl p-4 space-y-1.5 ${isRejected ? "border-red-200 bg-red-50/30" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-900 text-sm">{a.title}</p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                              {statusIcon} {a.status}
                            </span>
                          </div>
                          {a.description && <p className="text-xs text-gray-500">{a.description}</p>}
                          {a.fileUrl && (() => {
                            let files: { url: string; name: string }[] = [];
                            try {
                              const parsed = JSON.parse(a.fileUrl);
                              if (Array.isArray(parsed)) {
                                files = parsed.map((url: string, i: number) => ({ url, name: a.fileName || `File ${i + 1}` }));
                              }
                            } catch {
                              files = [{ url: a.fileUrl, name: a.fileName || "Download file" }];
                            }
                            return (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {files.map((f, i) => (
                                  <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline">
                                    <FileIcon className="h-3.5 w-3.5" /> {f.name}
                                  </a>
                                ))}
                              </div>
                            );
                          })()}
                          {a.tutorFeedback && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
                              <span className="font-semibold">Tutor feedback:</span> {a.tutorFeedback}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-xs text-gray-400">Submitted {new Date(a.submittedAt).toLocaleDateString()}</p>
                            {isRejected && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setAssignTitle(a.title + " (revised)");
                                  setAssignDesc(a.description || "");
                                  setAssignFiles([]);
                                  setAssignFile(null);
                                  document.getElementById("assign-file-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                  document.querySelector<HTMLInputElement>('[data-testid="input-assignment-title"]')?.focus();
                                }}
                                data-testid={`button-resubmit-assignment-${a.id}`}
                              >
                                <UploadCloud className="h-3 w-3" /> Resubmit
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
            {/* Community tab */}
            <TabsContent value="community" className="mt-4">
              {/* Community Post Board — real threaded posts with persistent likes */}
              <div className="bg-white border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b bg-gradient-to-r from-cyan-50 to-violet-50 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-cyan-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Community Board</h3>
                    <p className="text-xs text-gray-500">
                      {communityPosts.filter((p: any) => !p.replyToId).length} post{communityPosts.filter((p: any) => !p.replyToId).length !== 1 ? "s" : ""} · updates every 5s
                    </p>
                  </div>
                </div>

                {/* Post feed — top-level posts with nested replies */}
                <div ref={communityRef} className="max-h-[420px] overflow-y-auto">
                  {communityPosts.filter((p: any) => !p.replyToId).length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm px-5">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-25" />
                      <p>No posts yet. Be the first to share something!</p>
                    </div>
                  ) : (
                    communityPosts.filter((p: any) => !p.replyToId).map((post: any) => {
                      const replies = communityPosts.filter((r: any) => r.replyToId === post.id);
                      const name = `${post.firstName || ""}${post.lastName ? " " + post.lastName : ""}`.trim() || "Student";
                      const initials = name.slice(0, 2).toUpperCase();
                      const ts = post.createdAt ? new Date(post.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
                      return (
                        <div key={post.id} className="border-b last:border-0">
                          {/* Top-level post */}
                          <div className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex gap-3">
                              <Avatar className="h-9 w-9 flex-shrink-0">
                                <AvatarImage src={post.profileImageUrl} />
                                <AvatarFallback className="text-xs bg-violet-100 text-violet-700">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-gray-900">{name}</span>
                                  {post.userId === myId && <span className="text-xs text-violet-500">(you)</span>}
                                  {(post.userType === "admin" || post.userId === tutorId) && (
                                    <Badge className="text-[10px] h-4 bg-violet-100 text-violet-700 px-1">Instructor</Badge>
                                  )}
                                  <span className="text-xs text-gray-400 ml-auto">{ts}</span>
                                </div>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">{post.message}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <button
                                    className={`flex items-center gap-1 text-xs transition-colors ${post.likedByMe ? "text-rose-500" : "text-gray-400 hover:text-rose-400"}`}
                                    onClick={() => likePost.mutate(post.id)}
                                    data-testid={`button-like-post-${post.id}`}
                                  >
                                    {post.likedByMe ? "♥" : "♡"} {post.likeCount || 0}
                                  </button>
                                  <button
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-500 transition-colors"
                                    onClick={() => { setReplyTo({ id: post.id, name, message: post.message }); setCommunityPost(""); document.querySelector<HTMLTextAreaElement>('[data-testid="input-community-post"]')?.focus(); }}
                                    data-testid={`button-reply-post-${post.id}`}
                                  >
                                    <Reply className="h-3 w-3" /> Reply {replies.length > 0 && `(${replies.length})`}
                                  </button>
                                  {post.userId === myId && (
                                    <button
                                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto"
                                      onClick={() => deletePost.mutate(post.id)}
                                      data-testid={`button-delete-post-${post.id}`}
                                    >
                                      <X className="h-3 w-3" /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Nested replies */}
                          {replies.map((reply: any) => {
                            const rName = `${reply.firstName || ""}${reply.lastName ? " " + reply.lastName : ""}`.trim() || "Student";
                            const rInitials = rName.slice(0, 2).toUpperCase();
                            const rTs = reply.createdAt ? new Date(reply.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
                            return (
                              <div key={reply.id} className="pl-12 pr-4 py-3 bg-gray-50 border-t border-dashed border-gray-200 hover:bg-violet-50/30 transition-colors">
                                <div className="flex gap-2.5">
                                  <Avatar className="h-7 w-7 flex-shrink-0">
                                    <AvatarImage src={reply.profileImageUrl} />
                                    <AvatarFallback className="text-[10px] bg-cyan-100 text-cyan-700">{rInitials}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                      <span className="font-semibold text-xs text-gray-800">{rName}</span>
                                      {reply.userId === myId && <span className="text-[10px] text-violet-400">(you)</span>}
                                      <span className="text-[10px] text-gray-400 ml-auto">{rTs}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{reply.message}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <button
                                        className={`flex items-center gap-1 text-xs transition-colors ${reply.likedByMe ? "text-rose-500" : "text-gray-400 hover:text-rose-400"}`}
                                        onClick={() => likePost.mutate(reply.id)}
                                      >
                                        {reply.likedByMe ? "♥" : "♡"} {reply.likeCount || 0}
                                      </button>
                                      {reply.userId === myId && (
                                        <button className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto flex items-center gap-1"
                                          onClick={() => deletePost.mutate(reply.id)}>
                                          <X className="h-3 w-3" /> Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Compose box */}
                {isApproved && (
                  <div className="p-4 border-t bg-gray-50">
                    {replyTo && (
                      <div className="mb-2 flex items-center gap-2 text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
                        <Reply className="h-3 w-3" /> Replying to <span className="font-semibold">{replyTo.name}</span>
                        <span className="text-gray-400 truncate max-w-[200px]">"{replyTo.message.slice(0, 40)}{replyTo.message.length > 40 ? "…" : ""}"</span>
                        <button className="ml-auto" onClick={() => { setReplyTo(null); setCommunityPost(""); }}>
                          <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        value={communityPost}
                        onChange={e => setCommunityPost(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey && communityPost.trim()) {
                            e.preventDefault();
                            createPost.mutate({ message: communityPost.trim(), replyToId: replyTo?.id });
                          }
                        }}
                        placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Share something with your classmates… (Enter to post)"}
                        className="flex-1 min-h-[60px] max-h-[120px] text-sm resize-none rounded-xl"
                        data-testid="input-community-post"
                      />
                      <Button
                        size="sm"
                        className="self-end h-9 px-3 bg-cyan-600 hover:bg-cyan-700"
                        disabled={!communityPost.trim() || createPost.isPending}
                        onClick={() => createPost.mutate({ message: communityPost.trim(), replyToId: replyTo?.id })}
                        data-testid="button-submit-community-post"
                      >
                        {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Classmates list */}
              <div className="bg-white border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Your Classmates</h3>
                    <p className="text-xs text-gray-500">{classmates.length} active student{classmates.length !== 1 ? "s" : ""} enrolled in this course</p>
                  </div>
                </div>
                {classmates.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No other classmates yet. Be the first to invite friends!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {classmates.map((c: any) => {
                      const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Student";
                      const initials = (c.firstName?.[0] || "S") + (c.lastName?.[0] || "");
                      const isMe = c.userId === myId;
                      const isFollowed = followedUsers.has(c.userId);
                      return (
                        <div key={c.userId} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50 hover:bg-violet-50 transition-colors">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={c.profileImageUrl} />
                            <AvatarFallback className="text-sm bg-violet-100 text-violet-700">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{name} {isMe && <span className="text-xs text-violet-600">(you)</span>}</p>
                            {c.username && <p className="text-xs text-gray-400">@{c.username}</p>}
                          </div>
                          {!isMe && (
                            <Button
                              size="sm"
                              variant={isFollowed ? "outline" : "default"}
                              className={isFollowed ? "h-8 gap-1.5 text-xs border-violet-200 text-violet-700" : "h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700"}
                              onClick={() => followUser.mutate(c.userId)}
                              disabled={followUser.isPending}
                              data-testid={`button-follow-classmate-${c.userId}`}
                            >
                              {isFollowed ? <><UserCheck className="h-3.5 w-3.5" /> Following</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Course completion celebration */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="max-w-lg overflow-hidden">
          <div className="text-center py-6 px-4 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 -mx-6 -mt-6 -mb-2 px-6 pt-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg mb-4">
              <Trophy className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Congratulations, you finished the course! 🎉
            </h2>
            <p className="text-gray-600 mb-1">
              You've completed every lesson in <span className="font-semibold text-gray-900">{course?.title}</span>.
            </p>
            <p className="text-sm text-gray-500 mb-5">Your certificate is ready — download it as a PDF, PNG, or JPG.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link href={`/breedskool/${id}/certificate`}>
                <Button className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 text-white gap-2 px-5" data-testid="button-go-to-certificate">
                  <Award className="h-4 w-4" /> View My Certificate
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowCelebration(false)}>Stay here</Button>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs text-violet-600">
              <Sparkles className="h-3 w-3" /> Share the win with your tutor and classmates in chat!
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Chat panel subcomponent ─────────────────────────────────────────────
function ChatPanel({
  title, subtitle, icon, messages, myId, inputValue, onChange, onSend, sending, scrollRef,
  replyTo, onClearReply, onReply, onFollow, followedUsers,
}: {
  title: string; subtitle: string; icon: React.ReactNode; messages: any[]; myId?: string;
  inputValue: string; onChange: (v: string) => void; onSend: () => void; sending: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  replyTo?: { id: string; name: string; message: string } | null;
  onClearReply?: () => void;
  onReply?: (msg: { id: string; name: string; message: string }) => void;
  onFollow?: (userId: string) => void;
  followedUsers?: Set<string>;
}) {
  return (
    <div className="bg-white border rounded-2xl flex flex-col h-[60vh] overflow-hidden">
      <div className="p-4 border-b flex items-center gap-3">
        {icon}
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-12">
            <PartyPopper className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No messages yet — be the first to say hi!
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderId === myId;
          const sender = m.sender || {};
          const name = `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "User";
          const initials = (sender.firstName?.[0] || "U") + (sender.lastName?.[0] || "");
          const isFollowed = followedUsers?.has(m.senderId);
          return (
            <div key={m.id} className={`flex gap-2 group ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={sender.profileImageUrl} />
                <AvatarFallback className="text-xs bg-violet-100 text-violet-700">{initials}</AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm"
                    : "bg-white border rounded-bl-sm"
                }`}>
                  {!mine && <p className="text-xs font-semibold mb-0.5 text-violet-700">{name} {sender.userType === "admin" && <Badge className="ml-1 bg-amber-100 text-amber-700 text-[10px] py-0">Admin</Badge>}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                </div>
                {!mine && (onReply || onFollow) && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onReply && (
                      <button
                        onClick={() => onReply({ id: m.id, name, message: m.message })}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-violet-600 px-1.5 py-0.5 rounded hover:bg-violet-50"
                      >
                        <Reply className="h-3 w-3" /> Reply
                      </button>
                    )}
                    {onFollow && m.senderId !== myId && (
                      <button
                        onClick={() => onFollow(m.senderId)}
                        className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                          isFollowed ? "text-green-600 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-cyan-600 hover:bg-cyan-50"
                        }`}
                      >
                        {isFollowed ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                        {isFollowed ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {m.createdAt ? new Date(m.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t">
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border-b text-xs text-violet-700">
            <Reply className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1 truncate">Replying to <strong>{replyTo.name}</strong>: "{replyTo.message.slice(0, 50)}{replyTo.message.length > 50 ? "…" : ""}"</span>
            <button onClick={onClearReply} className="hover:text-red-500 flex-shrink-0"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="p-3 flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Type a message…"}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            data-testid="input-chat-message"
          />
          <Button onClick={onSend} disabled={sending || !inputValue.trim()} className="bg-violet-600 hover:bg-violet-700 text-white" data-testid="button-send-chat">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
