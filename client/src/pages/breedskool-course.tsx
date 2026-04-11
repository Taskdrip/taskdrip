import { useState } from "react";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen, Users, Star, Clock, Play, CheckCircle2, Lock,
  Heart, MessageCircle, Send, ChevronDown, ChevronUp, Award,
  Upload, Copy, AlertCircle,
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

const WALLETS = [
  { network: "usdt_tron", label: "USDT (TRC20)", address: "TYourTronWalletAddress" },
  { network: "usdt_bsc", label: "USDT (BEP20)", address: "0xYourBSCWalletAddress" },
  { network: "ton", label: "TON", address: "YourTONWalletAddress" },
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

export default function BreedSkoolCourse() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("usdt_tron");
  const [txHash, setTxHash] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
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

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const payload = course?.isFree
        ? { paymentMethod: "free" }
        : { paymentMethod, transactionHash: txHash, paymentProof };
      const res = await apiRequest("POST", `/api/courses/${id}/enroll`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", id, "enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/my-enrollments"] });
      setShowEnrollModal(false);
      toast({ title: course?.isFree ? "Enrolled successfully!" : "Payment submitted for review!" });
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
  const syllabus = Array.isArray(course.syllabus) ? course.syllabus : [];
  const whatYouLearn = Array.isArray(course.whatYouLearn) ? course.whatYouLearn : [];
  const requirements = Array.isArray(course.requirements) ? course.requirements : [];
  const selectedWallet = WALLETS.find(w => w.network === paymentMethod);

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="flex gap-2 mb-4">
              <Badge className={LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-600"}>
                {course.level}
              </Badge>
              {course.isFree ? (
                <Badge className="bg-green-500 text-white">FREE</Badge>
              ) : (
                <Badge className="bg-white text-gray-900">${course.price} USDT</Badge>
              )}
              {course.isFeatured && <Badge className="bg-violet-600 text-white">⭐ Featured</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">{course.title}</h1>
            <p className="text-white/70 mb-6 leading-relaxed">{course.shortDescription || course.description.slice(0, 150) + "..."}</p>

            <div className="flex items-center gap-4 text-white/70 text-sm mb-6">
              <div className="flex items-center gap-1.5">
                <StarRating rating={rating} />
                <span className="font-semibold text-white">{rating.toFixed(1)}</span>
                <span>({course.reviewsCount || 0} reviews)</span>
              </div>
              <div className="flex items-center gap-1"><Users className="h-4 w-4" /> {(course.studentsCount || 0).toLocaleString()} students</div>
              {course.duration && <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration}</div>}
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

            {/* Syllabus */}
            {syllabus.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-violet-600" /> Course Content
                </h2>
                <p className="text-sm text-gray-500 mb-4">{syllabus.length} sections • {course.lessonsCount || 0} lessons • {course.duration}</p>
                <div className="space-y-2">
                  {syllabus.map((section: any, i: number) => (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">{i + 1}</div>
                          <span className="font-medium text-gray-900">{section.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          {section.duration && <span>{section.duration}</span>}
                          {expandedSection === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>
                      {expandedSection === i && section.description && (
                        <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">{section.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About This Course</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{course.description}</p>
            </div>

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
                    <div key={review.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex-shrink-0 overflow-hidden">
                        {review.user?.profileImageUrl ? (
                          <img src={review.user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                            {review.user?.firstName?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{review.user?.firstName} {review.user?.lastName}</span>
                          <StarRating rating={review.rating} />
                        </div>
                        {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
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
                    <div key={c.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex-shrink-0 overflow-hidden">
                        {c.user?.profileImageUrl ? (
                          <img src={c.user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{c.user?.firstName?.[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{c.user?.firstName} {c.user?.lastName}</span>
                          <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{c.content}</p>
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
                      <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2">
                        <Play className="h-4 w-4" /> Continue Learning
                      </Button>
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

      {/* Enrollment Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{course?.isFree ? "Confirm Enrollment" : "Complete Payment"}</DialogTitle>
          </DialogHeader>

          {course?.isFree ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-800">This course is completely free!</p>
                <p className="text-sm text-green-600 mt-1">Click below to enroll instantly.</p>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Now — It's Free!"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">{course?.title}</span>
                  <span className="text-xl font-bold text-violet-700">${course?.price} USDT</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Select Payment Network</Label>
                <div className="grid grid-cols-3 gap-2">
                  {WALLETS.map((w) => (
                    <button
                      key={w.network}
                      onClick={() => setPaymentMethod(w.network)}
                      className={`p-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        paymentMethod === w.network ? "border-violet-600 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-violet-300"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedWallet && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Send ${course?.price} USDT to:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-800 flex-1 break-all">{selectedWallet.address}</code>
                    <button onClick={() => { navigator.clipboard.writeText(selectedWallet.address); toast({ title: "Address copied!" }); }}>
                      <Copy className="h-4 w-4 text-gray-400 hover:text-violet-600" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-1 block">Transaction Hash</Label>
                <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Paste your transaction hash" />
              </div>

              <div>
                <Label className="mb-1 block">Payment Proof URL (optional)</Label>
                <Input value={paymentProof} onChange={(e) => setPaymentProof(e.target.value)} placeholder="Screenshot URL or proof link" />
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">After submitting, your enrollment will be activated within 24 hours once payment is verified by admin.</p>
              </div>

              <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending || !txHash.trim()}>
                {enrollMutation.isPending ? "Submitting..." : "Submit Payment"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
