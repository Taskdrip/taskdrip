import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BookOpen, Users, Star, Clock, Play, CheckCircle2, Lock,
  Heart, MessageCircle, Send, ChevronDown, ChevronUp, Award,
  Upload, Copy, AlertCircle, File, Video, MessageSquare, ChevronRight,
  PartyPopper, Zap,
} from "lucide-react";

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-red-100 text-red-700",
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  instagram_growth: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=400&fit=crop",
  tiktok_mastery: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=400&fit=crop",
  youtube: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=400&fit=crop",
  monetization: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop",
  content_creation: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=400&fit=crop",
  branding: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop",
  general: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop",
};

const FALLBACK_PAYMENT_METHODS = [
  { id: "f1", type: "crypto", label: "USDT – TON Network", network: "TON", currency: "USDT", address: "" },
  { id: "f2", type: "crypto", label: "USDT – Tron (TRC-20)", network: "TRC-20", currency: "USDT", address: "" },
  { id: "f3", type: "crypto", label: "USDT – BNB Smart Chain (BEP-20)", network: "BEP-20", currency: "USDT", address: "" },
  { id: "f4", type: "crypto", label: "Pi Network", network: "Pi", currency: "PI", address: "" },
];

function StarRating({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${interactive ? "cursor-pointer" : ""} ${
            s <= (interactive ? hovered || rating : Math.round(rating))
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          } ${interactive ? "h-6 w-6" : "h-4 w-4"}`}
          onMouseEnter={() => interactive && setHovered(s)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate && onRate(s)}
        />
      ))}
    </div>
  );
}

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

function VideoPlayer({ url, title }: { url: string; title?: string }) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="rounded-xl overflow-hidden aspect-video bg-black shadow-lg">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title={title || "Lesson video"}
      />
    </div>
  );
}

function CourseChatSection({ courseId, isEnrolled, isInstructor }: { courseId: string; isEnrolled: boolean; isInstructor: boolean }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const canChat = isAuthenticated && (isEnrolled || isInstructor);

  const { data: messages = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "chat"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/chat`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: isAuthenticated,
    refetchInterval: canChat ? 5000 : false,
  });

  // Scroll only INSIDE the chat box — never the whole page.
  // Skip the very first load so the page opens at the top.
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/courses/${courseId}/chat`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "chat"] });
      setMessage("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
        <MessageSquare className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold text-gray-900">Course Chat</h2>
        <Badge className="bg-violet-100 text-violet-700 text-xs ml-1">{messages.length} messages</Badge>
        {isInstructor && <Badge className="bg-amber-100 text-amber-700 text-xs">Instructor</Badge>}
      </div>

      {!isAuthenticated ? (
        <div className="p-8 text-center text-gray-400">
          <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sign in to access course chat</p>
        </div>
      ) : !canChat ? (
        <div className="p-8 text-center text-gray-400">
          <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Enroll in this course to join the chat</p>
        </div>
      ) : (
        <>
          <div ref={chatContainerRef} className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isMe = msg.senderId === (user as any)?.id;
                const isAdmin = msg.sender?.userType === "admin" || msg.sender?.role === "admin";
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex-shrink-0 overflow-hidden">
                      {msg.sender?.profileImageUrl ? (
                        <img src={msg.sender.profileImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                          {msg.sender?.firstName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className={`max-w-xs ${isMe ? "items-end" : ""} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">
                          {isMe ? "You" : `${msg.sender?.firstName} ${msg.sender?.lastName}`}
                        </span>
                        {isAdmin && <Badge className="bg-violet-100 text-violet-700 text-xs py-0">Instructor</Badge>}
                      </div>
                      <div className={`rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-violet-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"}`}>
                        {msg.message}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a question or share a thought..."
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="flex-1"
              />
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white flex-shrink-0"
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LessonsSection({ courseId, isEnrolled, isInstructor }: { courseId: string; isEnrolled: boolean; isInstructor: boolean }) {
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const { data: lessons = [] } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "lessons"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/lessons`);
      return res.ok ? res.json() : [];
    },
  });

  if (lessons.length === 0) return null;

  const canView = (lesson: any) => lesson.isPreview || isEnrolled || isInstructor;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-violet-600" /> Course Lessons
      </h2>
      <p className="text-sm text-gray-500 mb-4">{lessons.length} lessons</p>

      {selectedLesson && (
        <div className="mb-6 bg-gray-900 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">{selectedLesson.title}</p>
              {selectedLesson.isPreview && <Badge className="bg-green-500 text-white text-xs mt-1">Free Preview</Badge>}
            </div>
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setSelectedLesson(null)}>
              ✕
            </Button>
          </div>
          {(selectedLesson.videoLink || selectedLesson.videoUrl) ? (
            <div className="aspect-video">
              <iframe
                src={getEmbedUrl(selectedLesson.videoLink || selectedLesson.videoUrl)}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={selectedLesson.title}
              />
            </div>
          ) : (
            <div className="p-6 text-gray-400 text-center">
              <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No video for this lesson</p>
            </div>
          )}
          {selectedLesson.content && (
            <div className="p-4 border-t border-gray-700">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{selectedLesson.content}</p>
            </div>
          )}
          {Array.isArray(selectedLesson.lessonFiles) && selectedLesson.lessonFiles.length > 0 && (
            <div className="p-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 font-medium mb-2">Lesson Files:</p>
              <div className="space-y-1">
                {selectedLesson.lessonFiles.map((f: any, i: number) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    <File className="h-3 w-3" /> {f.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {lessons.map((lesson: any, idx: number) => {
          const accessible = canView(lesson);
          const isSelected = selectedLesson?.id === lesson.id;
          const isExpanded = expandedLesson === lesson.id;

          return (
            <div key={lesson.id} className={`border rounded-xl overflow-hidden transition-colors ${isSelected ? "border-violet-300 bg-violet-50" : "border-gray-100 hover:border-gray-200"}`}>
              <button
                className="w-full flex items-center gap-3 p-4 text-left"
                onClick={() => {
                  if (accessible) {
                    setSelectedLesson(selectedLesson?.id === lesson.id ? null : lesson);
                  } else {
                    setExpandedLesson(isExpanded ? null : lesson.id);
                  }
                }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isSelected ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700"
                }`}>
                  {accessible ? <Play className={`h-3 w-3 ${isSelected ? "fill-white" : "fill-violet-700"}`} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm truncate ${isSelected ? "text-violet-700" : "text-gray-900"}`}>
                      {lesson.title}
                    </span>
                    {lesson.isPreview && <Badge className="bg-green-100 text-green-700 text-xs">Free Preview</Badge>}
                    {lesson.videoLink && <Badge className="bg-blue-100 text-blue-700 text-xs">Video</Badge>}
                  </div>
                  {lesson.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.description}</p>
                  )}
                </div>
                {!accessible && <Lock className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                {accessible && <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isSelected ? "rotate-90 text-violet-500" : ""}`} />}
              </button>
              {!accessible && isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-100 pt-2 bg-gray-50">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Enroll in this course to unlock this lesson.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BreedSkoolCourse() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState<"choose" | "pay" | "confirm" | "done">("choose");
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofFileInputRef = useRef<HTMLInputElement>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: course, isLoading } = useQuery<any>({
    queryKey: ["/api/courses", id],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}`);
      if (!res.ok) throw new Error("Course not found");
      return res.json();
    },
  });

  const { data: enrollment } = useQuery<any>({
    queryKey: ["/api/courses", id, "enrollment"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/enrollment`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ["/api/courses", id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/comments`);
      return res.ok ? res.json() : [];
    },
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/courses", id, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/reviews`);
      return res.ok ? res.json() : [];
    },
  });

  const { data: liked } = useQuery<boolean>({
    queryKey: ["/api/courses", id, "liked"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}/liked`);
      return res.ok ? res.json() : false;
    },
    enabled: isAuthenticated,
  });

  const { data: paymentMethodsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods", "courses"],
    queryFn: () => fetch("/api/payment-methods?feature=courses", { credentials: "include" }).then(r => r.json()),
  });

  const paymentMethods = (paymentMethodsRaw.length > 0 ? paymentMethodsRaw : FALLBACK_PAYMENT_METHODS) as any[];
  const selectedMethod = paymentMethods.find((m: any) => m.id === paymentMethodId) || paymentMethods[0];

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (course?.isFree) {
        const res = await apiRequest("POST", `/api/courses/${id}/enroll`, { paymentMethod: "free" });
        return res.json();
      }
      const fd = new FormData();
      fd.append("paymentMethod", selectedMethod?.label || paymentMethodId);
      fd.append("transactionHash", txHash);
      if (proofFile) {
        fd.append("paymentProof", proofFile);
      } else if (proofUrl || paymentProof) {
        fd.append("paymentProofUrl", proofUrl || paymentProof);
      }
      const res = await fetch(`/api/courses/${id}/enroll`, { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Enrollment failed" }));
        throw new Error(err.message || "Enrollment failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/my-enrollments"] });
      setEnrollStep("done");
      setRedirectCountdown(3);
      if (course?.isFree || data?.status === "active") {
        let count = 3;
        const timer = setInterval(() => {
          count -= 1;
          setRedirectCountdown(count);
          if (count <= 0) {
            clearInterval(timer);
            setShowEnrollModal(false);
            setEnrollStep("choose");
            setLocation(`/breedskool/${id}/learn`);
          }
        }, 1000);
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/courses/${id}/comments`, { content: comment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "comments"] });
      setComment("");
      toast({ title: "Comment posted!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/courses/${id}/reviews`, { rating: reviewRating, comment: reviewComment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id] });
      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      toast({ title: "Review submitted!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/courses/${id}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "liked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-400">Course not found</h2>
          <Button className="mt-4" onClick={() => setLocation("/breedskool")}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  const fallbackImg = CATEGORY_FALLBACK_IMAGES[course.category] || CATEGORY_FALLBACK_IMAGES.general;
  const rating = parseFloat(course.averageRating || "0");
  const isEnrolled = enrollment?.status === "active" || enrollment?.status === "completed";
  const isPending = enrollment?.status === "pending_payment";
  const isInstructor = (user as any)?.id === course.instructorId || (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const whatYouLearn = Array.isArray(course.whatYouLearn) ? course.whatYouLearn : [];
  const requirements = Array.isArray(course.requirements) ? course.requirements : [];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <NavigationFixed />

      {/* Hero Banner */}
      <div className="relative bg-gray-900 overflow-hidden">
        <img
          src={course.thumbnail || fallbackImg}
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <div className="flex gap-2 mb-4 flex-wrap">
              <Badge className={LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-600"}>{course.level}</Badge>
              {course.isFree ? (
                <Badge className="bg-green-500 text-white">FREE</Badge>
              ) : (
                <Badge className="bg-white text-gray-900">${course.price} USDT</Badge>
              )}
              {course.isFeatured && <Badge className="bg-violet-600 text-white">⭐ Featured</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">{course.title}</h1>
            <p className="text-white/70 mb-6 leading-relaxed">{course.shortDescription || course.description.slice(0, 150) + "..."}</p>

            <div className="flex items-center gap-4 text-white/70 text-sm mb-6 flex-wrap">
              <div className="flex items-center gap-1.5">
                <StarRating rating={rating} />
                <span className="font-semibold text-white">{rating.toFixed(1)}</span>
                <span>({course.reviewsCount || 0} reviews)</span>
              </div>
              <div className="flex items-center gap-1"><Users className="h-4 w-4" /> {(course.studentsCount || 0).toLocaleString()} students</div>
              {course.duration && <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration}</div>}
              <div className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {course.lessonsCount || 0} lessons</div>
            </div>

            {course.instructor && (
              <div className="flex items-center gap-3 text-white/70">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 overflow-hidden flex-shrink-0">
                  {course.instructor.profileImageUrl ? (
                    <img src={course.instructor.profileImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                      {course.instructor.firstName?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-white font-medium">{course.instructor.firstName} {course.instructor.lastName}</span>
                  {course.instructor.isVerified && <span className="ml-1 text-blue-400">✓</span>}
                  {course.instructor.niche && <p className="text-xs text-white/50">{course.instructor.niche}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Course Details */}
          <div className="lg:col-span-2 space-y-8">

            {/* What You'll Learn */}
            {whatYouLearn.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-violet-600" /> What You'll Learn
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {whatYouLearn.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lessons */}
            {id && <LessonsSection courseId={id} isEnrolled={isEnrolled} isInstructor={isInstructor} />}

            {/* Requirements */}
            {requirements.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-violet-500 mt-0.5">•</span> {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* About */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About This Course</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{course.description}</p>
            </div>

            {/* Course Chat */}
            {id && (
              <CourseChatSection
                courseId={id}
                isEnrolled={isEnrolled}
                isInstructor={isInstructor}
              />
            )}

            {/* Reviews */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  Reviews ({course.reviewsCount || 0})
                </h2>
                {isEnrolled && !showReviewForm && (
                  <Button size="sm" variant="outline" onClick={() => setShowReviewForm(true)}>Write a Review</Button>
                )}
              </div>

              {showReviewForm && (
                <div className="mb-6 p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Review</h3>
                  <div className="mb-3">
                    <Label className="text-sm mb-1 block">Rating</Label>
                    <StarRating rating={reviewRating} interactive onRate={setReviewRating} />
                  </div>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience with this course..."
                    rows={3}
                    className="mb-3"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                      {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-4">
                  {(reviews as any[]).map((review: any) => (
                    <div key={review.id} className="flex gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex-shrink-0 overflow-hidden">
                        {review.user?.profileImageUrl ? (
                          <img src={review.user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                            {review.user?.firstName?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{review.user?.firstName} {review.user?.lastName}</span>
                          <StarRating rating={review.rating} />
                        </div>
                        {review.comment && <p className="text-sm text-gray-600 break-words">{review.comment}</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Discussion */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-violet-600" />
                Discussion ({comments.length})
              </h2>

              {isAuthenticated && (
                <div className="flex gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {(user as any)?.profileImageUrl ? (
                      <img src={(user as any).profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user as any)?.firstName?.[0]
                    )}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share a thought or ask a question..."
                      onKeyDown={(e) => { if (e.key === "Enter" && comment.trim()) commentMutation.mutate(); }}
                    />
                    <Button size="icon" className="bg-violet-600 hover:bg-violet-700 text-white flex-shrink-0"
                      onClick={() => comment.trim() && commentMutation.mutate()} disabled={!comment.trim() || commentMutation.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No comments yet. Start the discussion!</p>
              ) : (
                <div className="space-y-4">
                  {(comments as any[]).map((c: any) => (
                    <div key={c.id} className="flex gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex-shrink-0 overflow-hidden">
                        {c.user?.profileImageUrl ? (
                          <img src={c.user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{c.user?.firstName?.[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-50 rounded-xl px-4 py-3 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm">{c.user?.firstName} {c.user?.lastName}</span>
                          <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 break-words">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Enrollment Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="relative">
                  <img
                    src={course.thumbnail || fallbackImg}
                    alt=""
                    className="w-full h-44 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 text-violet-600 fill-violet-600 ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 text-white/80 text-xs bg-black/50 rounded px-2 py-1">Preview</div>
                </div>
                <div className="p-6">
                  <div className="text-center mb-5">
                    {course.isFree ? (
                      <p className="text-4xl font-extrabold text-green-600">FREE</p>
                    ) : (
                      <p className="text-4xl font-extrabold text-gray-900">${course.price} <span className="text-xl font-normal text-gray-400">USDT</span></p>
                    )}
                  </div>

                  {isEnrolled ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-green-800 text-sm">You're enrolled!</p>
                          <p className="text-xs text-green-600">Progress: {enrollment?.progress || 0}%</p>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white gap-2 shadow-lg shadow-violet-200"
                        onClick={() => setLocation(`/breedskool/${course.id}/learn`)}
                        data-testid="button-start-learning"
                      >
                        <Play className="h-4 w-4" />
                        {(enrollment?.progress || 0) > 0 ? "Continue Learning" : "Start Learning"}
                      </Button>
                      {(enrollment?.progress || 0) >= 100 && (
                        <Button
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2"
                          onClick={() => setLocation(`/breedskool/${course.id}/certificate`)}
                          data-testid="button-view-certificate-from-course"
                        >
                          🏆 View Certificate
                        </Button>
                      )}
                    </div>
                  ) : isPending ? (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-800 text-sm">Payment Pending</p>
                        <p className="text-xs text-amber-600">Awaiting admin approval</p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 shadow-lg shadow-violet-200"
                      onClick={() => isAuthenticated ? setShowEnrollModal(true) : setLocation("/login")}
                    >
                      {isAuthenticated ? (course.isFree ? "Enroll for Free" : "Enroll Now") : (
                        <span className="flex items-center gap-2"><Lock className="h-4 w-4" />Sign In to Enroll</span>
                      )}
                    </Button>
                  )}

                  {/* Course meta */}
                  <div className="mt-5 space-y-2 text-sm text-gray-600">
                    {[
                      { icon: BookOpen, label: `${course.lessonsCount || 0} lessons` },
                      { icon: Clock, label: course.duration || "Self-paced" },
                      { icon: Users, label: `${(course.studentsCount || 0).toLocaleString()} students enrolled` },
                      { icon: Star, label: `${rating.toFixed(1)} average rating` },
                      { icon: Award, label: `Certificate upon completion` },
                      { icon: MessageSquare, label: `Course chat included` },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Like button */}
                  <div className="mt-5 flex items-center gap-3 pt-5 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`gap-2 flex-1 ${liked ? "border-red-300 text-red-500 hover:bg-red-50" : ""}`}
                      onClick={() => isAuthenticated && likeMutation.mutate()}
                      disabled={!isAuthenticated}
                    >
                      <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                      {course.likesCount || 0} Likes
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 flex-1">
                      <MessageCircle className="h-4 w-4" /> {comments.length}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Modal — Stripe-like */}
      <Dialog open={showEnrollModal} onOpenChange={(v) => {
        setShowEnrollModal(v);
        if (!v) { setEnrollStep("choose"); setTxHash(""); setPaymentProof(""); setProofUrl(""); }
      }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {enrollStep !== "done" && (
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5">
              <h2 className="text-white font-bold text-lg">{course?.isFree ? "Enroll for Free" : "Complete Enrollment"}</h2>
              <p className="text-white/70 text-sm mt-0.5">{course?.title}</p>
              {!course?.isFree && (
                <div className="flex gap-4 mt-3">
                  {["choose", "pay", "confirm"].map((s, i) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        enrollStep === s ? "bg-white text-violet-700" :
                        ["choose","pay","confirm"].indexOf(enrollStep) > i ? "bg-white/40 text-white" : "bg-white/20 text-white/50"
                      }`}>{["choose","pay","confirm"].indexOf(enrollStep) > i ? "✓" : i + 1}</div>
                      <span className={`text-xs ${enrollStep === s ? "text-white font-semibold" : "text-white/50"}`}>
                        {s === "choose" ? "Choose" : s === "pay" ? "Pay" : "Confirm"}
                      </span>
                      {i < 2 && <div className="w-4 h-px bg-white/20 mx-1" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-6">
            {/* Free course */}
            {course?.isFree && enrollStep !== "done" && (
              <div className="space-y-5">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="font-bold text-green-800 text-lg mb-1">Completely Free!</p>
                  <p className="text-sm text-green-700">No payment required. Start learning immediately.</p>
                </div>
                <div className="space-y-2 text-sm">
                  {["Instant access to all lessons", "Course chat & community", "Certificate upon completion", "Lifetime access"].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow-lg shadow-green-200"
                  onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
                  {enrollMutation.isPending ? <><div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2" />Enrolling...</> : "Enroll Now — It's Free!"}
                </Button>
              </div>
            )}

            {/* Step: Choose payment method */}
            {!course?.isFree && enrollStep === "choose" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">Select payment method for <span className="font-bold text-gray-900">${course?.price} USDT</span></p>
                {paymentMethods.map((m: any) => {
                  const typeIcons: Record<string, string> = { crypto: "🪙", bank: "🏦", paypal: "🅿️", paystack: "🟢", stripe: "💳" };
                  const typeColors: Record<string, string> = { crypto: "bg-orange-100", bank: "bg-blue-100", paypal: "bg-sky-100", paystack: "bg-green-100", stripe: "bg-purple-100" };
                  const isSelected = paymentMethodId === m.id || (!paymentMethodId && paymentMethods[0]?.id === m.id);
                  return (
                    <button key={m.id} onClick={() => setPaymentMethodId(m.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isSelected ? "border-violet-500 bg-violet-50 shadow-md" : "border-gray-100 bg-gray-50 hover:border-violet-200"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${typeColors[m.type] || "bg-gray-100"}`}>
                        {typeIcons[m.type] || "💳"}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {m.type === 'crypto' ? `${m.network || ''} · ${m.currency || ''}` :
                           m.type === 'bank' ? `${m.bankName || 'Bank Transfer'} · ${m.bankCountry || ''}` :
                           m.type === 'paypal' ? `${m.paypalEmail || 'PayPal'}` :
                           m.type === 'paystack' ? 'Paystack Gateway' : 'Stripe Gateway'}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-violet-600 bg-violet-600" : "border-gray-300"}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
                <Button className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white mt-2"
                  onClick={() => setEnrollStep("pay")}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <button
                  className="w-full text-sm text-gray-500 hover:text-violet-600 underline underline-offset-2 py-1 transition-colors"
                  onClick={() => {
                    const fd = new FormData();
                    fd.append("payLater", "true");
                    fd.append("paymentMethod", selectedMethod?.label || "Pay Later");
                    fetch(`/api/courses/${id}/enroll`, { method: "POST", body: fd, credentials: "include" })
                      .then(r => r.json())
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "enrollment"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/courses/my-enrollments"] });
                        setEnrollStep("done");
                        toast({ title: "Enrolled (Pay Later)", description: "You now have access. Complete payment to unlock all features." });
                      })
                      .catch(() => toast({ title: "Error", variant: "destructive" }));
                  }}
                  data-testid="button-enroll-pay-later"
                >
                  Pay Later — Get access now, pay within 48 hours
                </button>
              </div>
            )}

            {/* Step: Payment details */}
            {!course?.isFree && enrollStep === "pay" && (
              <div className="space-y-4">
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-violet-600">Amount to send</p>
                    <p className="text-2xl font-extrabold text-gray-900">${course?.price} <span className="text-sm text-gray-500">{selectedMethod?.currency || "USDT"}</span></p>
                  </div>
                  <Badge className="bg-violet-100 text-violet-700">{selectedMethod?.label}</Badge>
                </div>

                {selectedMethod?.type === 'crypto' && (
                  <div className="bg-gray-900 rounded-2xl p-4">
                    <p className="text-gray-400 text-xs mb-1">Send to this address:</p>
                    {selectedMethod.network && <p className="text-gray-500 text-xs mb-2">Network: <span className="text-gray-300">{selectedMethod.network}</span></p>}
                    {selectedMethod.address ? (
                      <>
                        <code className="text-green-400 font-mono text-sm break-all leading-relaxed block mb-3">{selectedMethod.address}</code>
                        <button onClick={() => { navigator.clipboard.writeText(selectedMethod.address); setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); toast({ title: "Copied!" }); }}
                          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors ${copiedAddr ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                          {copiedAddr ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedAddr ? "Copied!" : "Copy address"}
                        </button>
                      </>
                    ) : (
                      <p className="text-yellow-400 text-xs">⚠️ Wallet address not configured. Contact admin.</p>
                    )}
                  </div>
                )}

                {selectedMethod?.type === 'bank' && (
                  <div className="bg-blue-950 rounded-2xl p-4 space-y-2">
                    <p className="text-blue-200 text-xs font-semibold mb-2">Bank Transfer Details</p>
                    {selectedMethod.bankName && <div className="flex justify-between text-sm"><span className="text-gray-400">Bank</span><span className="text-white">{selectedMethod.bankName}</span></div>}
                    {selectedMethod.accountName && <div className="flex justify-between text-sm"><span className="text-gray-400">Name</span><span className="text-white">{selectedMethod.accountName}</span></div>}
                    {selectedMethod.accountNumber && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Account</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono">{selectedMethod.accountNumber}</span>
                          <button onClick={() => { navigator.clipboard.writeText(selectedMethod.accountNumber); setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); toast({ title: "Copied!" }); }} className="p-1 rounded bg-blue-900 text-blue-300">
                            {copiedAddr ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedMethod.bankCountry && <div className="flex justify-between text-sm"><span className="text-gray-400">Country</span><span className="text-white">{selectedMethod.bankCountry}</span></div>}
                    {selectedMethod.swiftCode && <div className="flex justify-between text-sm"><span className="text-gray-400">SWIFT</span><span className="text-white font-mono">{selectedMethod.swiftCode}</span></div>}
                  </div>
                )}

                {selectedMethod?.type === 'paypal' && (
                  <div className="bg-sky-900 rounded-2xl p-4">
                    <p className="text-sky-200 text-xs mb-2">Send ${course?.price} via PayPal to:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{selectedMethod.paypalEmail}</span>
                      <button onClick={() => { navigator.clipboard.writeText(selectedMethod.paypalEmail); toast({ title: "Copied!" }); }} className="p-1 rounded bg-sky-800 text-sky-300">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sky-300 text-xs mt-2">Use "Friends & Family". Include your email in the note.</p>
                  </div>
                )}

                {(selectedMethod?.type === 'paystack' || selectedMethod?.type === 'stripe') && (
                  <div className="bg-purple-900 rounded-2xl p-4 text-center">
                    <p className="text-white font-semibold mb-1">Pay via {selectedMethod.type === 'paystack' ? 'Paystack' : 'Stripe'}</p>
                    <p className="text-purple-200 text-xs">You'll be redirected to complete payment securely.</p>
                  </div>
                )}

                {selectedMethod?.instructions && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{selectedMethod.instructions}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEnrollStep("choose")}>← Back</Button>
                  <Button className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                    onClick={() => setEnrollStep("confirm")}>I've Sent It →</Button>
                </div>
              </div>
            )}

            {/* Step: Confirm */}
            {!course?.isFree && enrollStep === "confirm" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Provide your payment reference to verify your enrollment</p>
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">
                    {selectedMethod?.type === 'bank' ? 'Transfer Reference' : selectedMethod?.type === 'paypal' ? 'PayPal Transaction ID' : 'Transaction Hash'} <span className="text-red-500">*</span>
                  </Label>
                  <Input value={txHash} onChange={(e) => setTxHash(e.target.value)}
                    placeholder={selectedMethod?.type === 'bank' ? 'Enter reference number...' : '0x... or TXid...'} className="font-mono text-sm h-11 bg-gray-50" />
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Payment Screenshot <span className="text-gray-400 font-normal text-xs">(optional, helps speed up review)</span></Label>
                  <input
                    ref={proofFileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="hidden"
                    data-testid="input-payment-proof-file"
                  />
                  <button
                    type="button"
                    onClick={() => proofFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-600 hover:border-violet-400 hover:bg-violet-50 transition-colors"
                    data-testid="button-upload-payment-proof"
                  >
                    <Upload className="h-4 w-4" />
                    {proofFile ? proofFile.name : "Upload screenshot or PDF"}
                  </button>
                  {proofFile && (
                    <button
                      type="button"
                      onClick={() => { setProofFile(null); if (proofFileInputRef.current) proofFileInputRef.current.value = ""; }}
                      className="mt-1 text-xs text-red-500 hover:underline"
                    >
                      Remove file
                    </button>
                  )}
                </div>
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">Your enrollment will be activated within 24 hours of payment verification.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEnrollStep("pay")}>← Back</Button>
                  <Button className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                    onClick={() => enrollMutation.mutate()} disabled={!txHash.trim() || enrollMutation.isPending}>
                    {enrollMutation.isPending ? <><div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2 inline-block" />Submitting...</> : "Submit Payment"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Done / Thank you */}
            {enrollStep === "done" && (
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PartyPopper className="h-10 w-10 text-violet-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                  {course?.isFree ? "You're In! 🎉" : "Payment Submitted! 🎉"}
                </h3>
                <p className="text-gray-600 text-sm mb-1 leading-relaxed font-medium">
                  Welcome{(user as any)?.firstName ? `, ${(user as any).firstName}` : ""}! 👋
                </p>
                <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                  {course?.isFree
                    ? "You now have full access to all lessons, course chat, and materials."
                    : "Our team will verify your payment within 24 hours and activate your access."}
                </p>

                {/* Telegram community invite */}
                <a
                  href="https://t.me/taskdrip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full bg-[#229ED9]/10 border border-[#229ED9]/30 rounded-xl px-4 py-3 mb-4 hover:bg-[#229ED9]/20 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-[#229ED9] flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-[#229ED9] transition-colors">Join our Telegram Community</p>
                    <p className="text-xs text-gray-500">Connect with fellow learners, get support & updates</p>
                  </div>
                  <svg className="h-4 w-4 text-gray-400 group-hover:text-[#229ED9] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </a>

                <div className="space-y-2 mb-5">
                  {(course?.isFree
                    ? ["Instant access to all lessons", "Join the course chat", "Download materials", "Earn a certificate"]
                    : ["Payment received & queued", "Verification in < 24 hours", "Email notification on approval", "Full access unlocked"]
                  ).map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> {step}
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-12 font-semibold"
                  data-testid="button-start-learning"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollStep("choose");
                    if (course?.isFree) {
                      setLocation(`/breedskool/${id}/learn`);
                    } else {
                      setLocation("/my-training");
                    }
                  }}
                >
                  {course?.isFree
                    ? `Taking you to your training in ${redirectCountdown}s…`
                    : "Go to My Training →"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
