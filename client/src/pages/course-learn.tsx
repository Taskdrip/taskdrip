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
import {
  PlayCircle, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft, Users,
  Lock, Send, MessageSquare, MessagesSquare, Trophy, FileText, Download,
  Sparkles, PartyPopper, Award, Loader2, File as FileIcon,
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
  const tutorId: string | null = course?.instructorId || null;
  const u = user as any;
  const myId: string | undefined = u?.id;
  const isUserTutorOrAdmin = !!u && (myId === tutorId || u.userType === "admin");

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

  const sendGroup = useMutation({
    mutationFn: async (msg: string) => (await apiRequest("POST", `/api/courses/${id}/chat`, { message: msg })).json(),
    onSuccess: () => {
      setGroupMessage("");
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
                <h1 className="text-lg font-bold truncate" data-testid="text-course-title">{course.title}</h1>
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

      <div className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[300px,1fr] gap-6">
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
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isCur ? "text-violet-900" : done ? "text-gray-700" : "text-gray-800"}`}>
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
        <main className="space-y-4">
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
                        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-lesson-title">{current.title}</h2>
                        {current.description && <p className="text-gray-600 mt-1">{current.description}</p>}
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
                onSend={() => groupMessage.trim() && sendGroup.mutate(groupMessage.trim())}
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
}: {
  title: string; subtitle: string; icon: React.ReactNode; messages: any[]; myId?: string;
  inputValue: string; onChange: (v: string) => void; onSend: () => void; sending: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
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
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
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
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {m.createdAt ? new Date(m.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          data-testid="input-chat-message"
        />
        <Button onClick={onSend} disabled={sending || !inputValue.trim()} className="bg-violet-600 hover:bg-violet-700 text-white" data-testid="button-send-chat">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
