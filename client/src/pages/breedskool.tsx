import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Users, Star, Clock, Play, Search, TrendingUp, Zap,
  Instagram, Youtube, DollarSign, Award, ChevronRight, Lock, CheckCircle2,
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Courses", icon: BookOpen },
  { value: "instagram_growth", label: "Instagram", icon: Instagram },
  { value: "tiktok_mastery", label: "TikTok", icon: Zap },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "monetization", label: "Monetize", icon: DollarSign },
  { value: "content_creation", label: "Content", icon: Play },
  { value: "branding", label: "Branding", icon: Award },
];

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-red-100 text-red-700",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  instagram_growth: "from-pink-500 to-purple-600",
  tiktok_mastery: "from-gray-900 to-gray-700",
  youtube: "from-red-500 to-red-700",
  monetization: "from-yellow-500 to-orange-500",
  content_creation: "from-blue-500 to-cyan-500",
  branding: "from-violet-500 to-indigo-600",
  general: "from-teal-500 to-green-600",
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  instagram_growth: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=220&fit=crop",
  tiktok_mastery: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&h=220&fit=crop",
  youtube: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=220&fit=crop",
  monetization: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=220&fit=crop",
  content_creation: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=220&fit=crop",
  branding: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=220&fit=crop",
  general: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=220&fit=crop",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

function CourseCard({ course, enrolled }: { course: any; enrolled: boolean }) {
  const gradient = CATEGORY_GRADIENTS[course.category] || "from-violet-500 to-indigo-600";
  const fallbackImg = CATEGORY_FALLBACK_IMAGES[course.category] || CATEGORY_FALLBACK_IMAGES.general;
  const rating = parseFloat(course.averageRating || "0");

  return (
    <Link href={`/breedskool/${course.id}`}>
      <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer h-full flex flex-col">
        <div className="relative overflow-hidden">
          <img
            src={course.thumbnail || fallbackImg}
            alt={course.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-20`} />
          <div className="absolute top-3 left-3 flex gap-2">
            {course.isFree ? (
              <Badge className="bg-green-500 text-white text-xs font-bold shadow-lg">FREE</Badge>
            ) : (
              <Badge className="bg-white text-gray-900 text-xs font-bold shadow-lg">${course.price}</Badge>
            )}
            {course.isFeatured && (
              <Badge className="bg-violet-600 text-white text-xs font-bold shadow-lg">⭐ Featured</Badge>
            )}
          </div>
          {enrolled && (
            <div className="absolute top-3 right-3">
              <div className="bg-green-500 rounded-full p-1">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
          <div className="absolute bottom-3 right-3">
            <div className="bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="h-4 w-4 text-violet-600 fill-violet-600" />
            </div>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`text-[10px] px-2 py-0.5 ${LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-600"}`}>
              {course.level}
            </Badge>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              {CATEGORIES.find(c => c.value === course.category)?.label || course.category}
            </span>
          </div>

          <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 group-hover:text-violet-600 transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
            {course.shortDescription || course.description}
          </p>

          <div className="flex items-center gap-1 mb-3">
            <StarRating rating={rating} />
            <span className="text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({course.reviewsCount || 0})</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{(course.studentsCount || 0).toLocaleString()} students</span>
            </div>
            {course.duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{course.duration}</span>
              </div>
            )}
            {course.lessonsCount > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{course.lessonsCount} lessons</span>
              </div>
            )}
          </div>

          {course.instructor && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                {course.instructor.profileImageUrl ? (
                  <img src={course.instructor.profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (course.instructor.firstName?.[0] || "?")
                )}
              </div>
              <span className="text-[11px] text-gray-500">
                {course.instructor.firstName} {course.instructor.lastName}
                {course.instructor.isVerified && <span className="ml-1 text-blue-500">✓</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function BreedSkool() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const { data: myEnrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/courses/my-enrollments"],
    enabled: isAuthenticated,
  });

  const enrolledCourseIds = new Set((myEnrollments as any[]).map((e: any) => e.courseId));

  const filtered = courses.filter((c: any) => {
    if (activeCategory !== "all" && c.category !== activeCategory) return false;
    if (levelFilter !== "all" && c.level !== levelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const featured = courses.filter((c: any) => c.isFeatured);
  const freeCourses = courses.filter((c: any) => c.isFree);
  const totalStudents = courses.reduce((sum: number, c: any) => sum + (c.studentsCount || 0), 0);

  const isPremium = (user as any)?.subscriptionStatus === "active";
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const canTeach = isAdmin || (isPremium && (user as any)?.isVerified);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-violet-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <span className="text-2xl">🎓</span>
            <span className="text-white text-sm font-medium">BreedSkool – Influencer Academy</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
            Learn, Grow &{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Earn More
            </span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
            Master Instagram, TikTok, YouTube and beyond. Get certified by top influencers and
            start monetizing your audience today.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mb-10">
            {[
              { value: `${courses.length}+`, label: "Courses" },
              { value: `${totalStudents.toLocaleString()}+`, label: "Students" },
              { value: `${freeCourses.length}+`, label: "Free Courses" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-white/60 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="pl-12 pr-4 py-4 text-base bg-white rounded-2xl border-0 shadow-2xl text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Teach on BreedSkool CTA */}
        {isAuthenticated && canTeach && (
          <div className="mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between text-white shadow-lg">
            <div>
              <h3 className="text-lg font-bold">🎤 Teach on BreedSkool</h3>
              <p className="text-white/80 text-sm mt-1">Share your expertise and earn revenue from your courses</p>
            </div>
            <Button className="bg-white text-violet-700 hover:bg-gray-100 font-semibold" onClick={() => setLocation("/admin/courses")}>
              Create a Course
            </Button>
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-semibold text-gray-900">Sign in to enroll in courses</p>
                <p className="text-sm text-gray-500">Join thousands of influencers learning on BreedSkool</p>
              </div>
            </div>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setLocation("/login")}>
              Sign In
            </Button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat.value
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" /> {cat.label}
              </button>
            );
          })}
          <div className="ml-auto flex gap-2">
            {["all", "beginner", "intermediate", "advanced"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  levelFilter === lvl ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {lvl === "all" ? "All Levels" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Courses */}
        {featured.length > 0 && activeCategory === "all" && !searchQuery && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-violet-600" /> Featured Courses
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((course: any) => (
                <CourseCard key={course.id} course={course} enrolled={enrolledCourseIds.has(course.id)} />
              ))}
            </div>
          </section>
        )}

        {/* All / Filtered Courses */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              {searchQuery ? `Results for "${searchQuery}"` : activeCategory === "all" ? "All Courses" : CATEGORIES.find(c => c.value === activeCategory)?.label}
              <span className="text-sm font-normal text-gray-400 ml-2">({filtered.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400">No courses found</h3>
              <p className="text-gray-400 mt-2">Try a different category or search term</p>
              {searchQuery && (
                <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>Clear Search</Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((course: any) => (
                <CourseCard key={course.id} course={course} enrolled={enrolledCourseIds.has(course.id)} />
              ))}
            </div>
          )}
        </section>

        {/* Teach Section */}
        {!canTeach && isAuthenticated && (
          <section className="mt-16 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-10 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Want to Teach on BreedSkool?</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Upgrade to a Premium plan and become a verified influencer to start creating and selling your own courses.
            </p>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={() => setLocation("/subscription")}>
              Upgrade to Premium <ChevronRight className="h-4 w-4" />
            </Button>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}
