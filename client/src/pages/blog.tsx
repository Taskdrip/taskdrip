import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar, Clock, Eye, Heart, MessageCircle, ArrowRight,
  TrendingUp, Users, Search, Bell, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, SlidersHorizontal, X,
  ArrowUpDown, Timer, Tag, CalendarDays
} from "lucide-react";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string; hero: string }> = {
  "task-strategy":  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   hero: "from-blue-700 via-blue-900 to-indigo-900" },
  "crypto-payments":{ bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  hero: "from-emerald-700 via-green-900 to-teal-900" },
  "app-testing":    { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", hero: "from-purple-700 via-purple-900 to-indigo-900" },
  "trading-tips":   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", hero: "from-orange-600 via-red-800 to-rose-900" },
  "local-tasks":    { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    hero: "from-red-700 via-rose-900 to-pink-900" },
  "social-media":   { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500",   hero: "from-pink-700 via-fuchsia-900 to-purple-900" },
  "gaming":         { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", hero: "from-indigo-700 via-blue-900 to-cyan-900" },
  "news":           { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", hero: "from-amber-600 via-yellow-800 to-orange-900" },
  "general":        { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-500",   hero: "from-gray-700 via-slate-800 to-gray-900" },
};

const GRADIENT_PATTERNS = [
  "from-blue-500 via-blue-600 to-purple-600",
  "from-green-500 via-teal-500 to-blue-500",
  "from-orange-500 via-red-500 to-pink-500",
  "from-purple-500 via-purple-600 to-pink-500",
  "from-yellow-400 via-orange-500 to-red-500",
  "from-teal-500 via-cyan-500 to-blue-500",
];

const SORT_OPTIONS = [
  { value: "newest",   label: "Newest First",    icon: "🕐" },
  { value: "oldest",   label: "Oldest First",    icon: "📅" },
  { value: "popular",  label: "Most Viewed",      icon: "👁️" },
  { value: "liked",    label: "Most Liked",       icon: "❤️" },
  { value: "comments", label: "Most Discussed",   icon: "💬" },
];

const READ_TIME_FILTERS = [
  { value: "all",    label: "Any Length" },
  { value: "quick",  label: "Quick (<3 min)" },
  { value: "medium", label: "Medium (3–7 min)" },
  { value: "long",   label: "Long (7+ min)" },
];

const DATE_FILTERS = [
  { value: "all",   label: "All Time" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category?.toLowerCase()] || CATEGORY_COLORS["general"];
}

function CategoryBadge({ category }: { category: string }) {
  const colors = getCategoryColors(category);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {category}
    </span>
  );
}

function PostCard({ post, index, onClick }: { post: any; index: number; onClick: () => void }) {
  const gradient = GRADIENT_PATTERNS[index % GRADIENT_PATTERNS.length];
  const hasImage = !!post.featuredImage;

  return (
    <Card
      className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 rounded-2xl hover:-translate-y-1"
      onClick={onClick}
      data-testid={`card-blog-${post.id}`}
    >
      <div className="relative h-52 overflow-hidden">
        {hasImage ? (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.style.background = `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`;
            }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <BookOpen className="h-12 w-12 text-white opacity-60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3">
          {post.category && <CategoryBadge category={post.category} />}
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="flex items-center gap-1 text-white text-xs"><Eye className="h-3 w-3" /> {(post.viewCount || 0).toLocaleString()}</span>
          <span className="flex items-center gap-1 text-white text-xs"><Heart className="h-3 w-3" /> {post.likesCount || 0}</span>
        </div>
      </div>
      <CardContent className="p-5">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {post.title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3">
          {post.excerpt || post.content?.replace(/<[^>]*>/g, '').substring(0, 120)}...
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTime || 5} min
            </span>
          </div>
          <span className="text-blue-600 text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Read <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SpotlightSlide({ post, onClick }: { post: any; onClick: () => void }) {
  const catColors = getCategoryColors(post.category);

  return (
    <div
      className="relative rounded-3xl overflow-hidden cursor-pointer group min-h-[300px] md:min-h-[360px] flex flex-col justify-end"
      onClick={onClick}
      data-testid={`card-spotlight-${post.id}`}
    >
      {/* BG image or gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${catColors.hero}`} />
      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.title}
          className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-50 transition-opacity duration-500 group-hover:scale-105 transition-transform"
        />
      )}
      {/* Noise texture overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />

      <div className="relative p-7 md:p-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            ⭐ Featured
          </span>
          {post.category && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-sm`}>
              {post.category}
            </span>
          )}
        </div>

        <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-3 max-w-2xl">
          {post.title}
        </h2>
        <p className="text-white/75 text-sm md:text-base max-w-xl line-clamp-2 mb-6">
          {post.excerpt || post.content?.replace(/<[^>]*>/g, '').substring(0, 160)}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-2.5 border border-white/20">
            <span className="flex items-center gap-1.5 text-white/80 text-sm">
              <Eye className="h-4 w-4" /> {(post.viewCount || 0).toLocaleString()} views
            </span>
            <span className="flex items-center gap-1.5 text-white/80 text-sm">
              <Heart className="h-4 w-4" /> {post.likesCount || 0} likes
            </span>
            <span className="flex items-center gap-1.5 text-white/80 text-sm">
              <Clock className="h-4 w-4" /> {post.readingTime || 5} min read
            </span>
          </div>
          <Button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            data-testid={`btn-spotlight-read-${post.id}`}
            className="ml-auto bg-white text-gray-900 hover:bg-yellow-50 font-bold px-6 rounded-xl shadow-lg group/btn"
          >
            Read Article <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function BlogSpotlightCarousel({ posts, onNavigate }: { posts: any[]; onNavigate: (slug: string) => void }) {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const total = posts.length;

  const goTo = useCallback((idx: number) => {
    if (isAnimating || total <= 1) return;
    setIsAnimating(true);
    setTimeout(() => { setCurrent(idx); setIsAnimating(false); }, 220);
  }, [isAnimating, total]);

  const prev = () => goTo((current - 1 + total) % total);
  const next = useCallback(() => goTo((current + 1) % total), [current, total, goTo]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, total]);

  if (posts.length === 0) return null;
  const post = posts[current];

  return (
    <div className="relative mb-10">
      <div className={`transition-opacity duration-300 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
        <SpotlightSlide post={post} onClick={() => onNavigate(post.slug)} />
      </div>

      {total > 1 && (
        <>
          <button
            onClick={prev}
            data-testid="btn-blog-spotlight-prev"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            data-testid="btn-blog-spotlight-next"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 border border-white/30 backdrop-blur-sm text-white flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {posts.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                data-testid={`btn-blog-dot-${i}`}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-7 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdvancedFilters({
  sortBy, setSortBy,
  readTime, setReadTime,
  dateRange, setDateRange,
  onClose,
}: {
  sortBy: string; setSortBy: (v: string) => void;
  readTime: string; setReadTime: (v: string) => void;
  dateRange: string; setDateRange: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 mb-6 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-600" /> Advanced Filters
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Sort */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <ArrowUpDown className="h-3 w-3" /> Sort By
          </label>
          <div className="flex flex-col gap-1.5">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                data-testid={`filter-sort-${opt.value}`}
                onClick={() => setSortBy(opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${sortBy === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
              >
                <span>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reading Time */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Timer className="h-3 w-3" /> Reading Time
          </label>
          <div className="flex flex-col gap-1.5">
            {READ_TIME_FILTERS.map(opt => (
              <button
                key={opt.value}
                data-testid={`filter-readtime-${opt.value}`}
                onClick={() => setReadTime(opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${readTime === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <CalendarDays className="h-3 w-3" /> Date Range
          </label>
          <div className="flex flex-col gap-1.5">
            {DATE_FILTERS.map(opt => (
              <button
                key={opt.value}
                data-testid={`filter-date-${opt.value}`}
                onClick={() => setDateRange(opt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${dateRange === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <button
          data-testid="btn-filter-reset"
          onClick={() => { setSortBy("newest"); setReadTime("all"); setDateRange("all"); }}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
        >
          Reset all filters
        </button>
      </div>
    </div>
  );
}

function applySort(posts: any[], sortBy: string): any[] {
  const arr = [...posts];
  switch (sortBy) {
    case "oldest":   return arr.sort((a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime());
    case "popular":  return arr.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    case "liked":    return arr.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    case "comments": return arr.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    default:         return arr.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  }
}

function applyReadTimeFilter(posts: any[], readTime: string): any[] {
  if (readTime === "all") return posts;
  return posts.filter(p => {
    const rt = p.readingTime || 5;
    if (readTime === "quick")  return rt < 3;
    if (readTime === "medium") return rt >= 3 && rt <= 7;
    if (readTime === "long")   return rt > 7;
    return true;
  });
}

function applyDateFilter(posts: any[], dateRange: string): any[] {
  if (dateRange === "all") return posts;
  const now = Date.now();
  const cutoff: Record<string, number> = {
    week:  7 * 86400000,
    month: 30 * 86400000,
    year:  365 * 86400000,
  };
  const ms = cutoff[dateRange] || 0;
  return posts.filter(p => {
    const pub = p.publishedAt ? new Date(p.publishedAt).getTime() : 0;
    return now - pub <= ms;
  });
}

function getActiveFilterCount(sortBy: string, readTime: string, dateRange: string): number {
  let n = 0;
  if (sortBy !== "newest") n++;
  if (readTime !== "all")  n++;
  if (dateRange !== "all") n++;
  return n;
}

export default function Blog() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [readTime, setReadTime] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/blog", activeCategory],
    queryFn: () => fetch(`/api/blog${activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : ''}`).then(r => r.json()),
  });

  const allCategories = Array.from(new Set(posts.map((p: any) => p.category).filter(Boolean)));

  const searchFiltered = posts.filter((p: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
  });

  const filteredPosts = applySort(
    applyDateFilter(
      applyReadTimeFilter(searchFiltered, readTime),
      dateRange
    ),
    sortBy
  );

  const spotlightPosts = filteredPosts.filter((p: any) => p.isFeatured || p.featuredImage).slice(0, 5);
  const nonSpotlight = filteredPosts.filter((p: any) => !spotlightPosts.includes(p));

  const followMutation = useMutation({
    mutationFn: (category: string) =>
      fetch(`/api/blog/category/${category}/follow`, { method: 'POST' }).then(r => r.json()),
    onSuccess: (_, category) => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/category", category, "follow"] });
    },
  });

  const activeFilterCount = getActiveFilterCount(sortBy, readTime, dateRange);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero Section with background image texture */}
      <div className="relative bg-gray-900 text-white overflow-hidden">
        {/* Multi-layer background for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-gray-900" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Radial light effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.25)_0%,transparent_70%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              <span className="text-yellow-400 font-semibold text-sm uppercase tracking-widest">Taskdrip Blog</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-5 leading-tight bg-gradient-to-r from-white via-blue-200 to-indigo-200 bg-clip-text text-transparent">
              Insights for Influencers & Brands
            </h1>
            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Expert guides, earning strategies, platform updates, and success stories from the Taskdrip community.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                data-testid="input-blog-search"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-full bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40 h-12"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {posts.length} Articles</span>
              <span className="flex items-center gap-1.5"><Tag className="h-4 w-4" /> {allCategories.length} Categories</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Community-driven</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-4 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-3">

            {/* Spotlight Carousel */}
            {!isLoading && spotlightPosts.length > 0 && (
              <BlogSpotlightCarousel
                posts={spotlightPosts}
                onNavigate={(slug) => setLocation(`/blog/${slug}`)}
              />
            )}

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 flex-1">
                <button
                  data-testid="filter-cat-all"
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeCategory ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                >
                  All Posts
                </button>
                {allCategories.map((cat: string) => (
                  <button
                    key={cat}
                    data-testid={`filter-cat-${cat}`}
                    onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Advanced filter toggle */}
              <button
                data-testid="btn-toggle-filters"
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${showFilters || activeFilterCount > 0 ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200'}`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Advanced filters panel */}
            {showFilters && (
              <AdvancedFilters
                sortBy={sortBy} setSortBy={setSortBy}
                readTime={readTime} setReadTime={setReadTime}
                dateRange={dateRange} setDateRange={setDateRange}
                onClose={() => setShowFilters(false)}
              />
            )}

            {/* Active filter summary */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                <span className="text-gray-500 text-xs font-medium">Active:</span>
                {sortBy !== "newest" && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                    <button onClick={() => setSortBy("newest")} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {readTime !== "all" && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {READ_TIME_FILTERS.find(o => o.value === readTime)?.label}
                    <button onClick={() => setReadTime("all")} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {dateRange !== "all" && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {DATE_FILTERS.find(o => o.value === dateRange)?.label}
                    <button onClick={() => setDateRange("all")} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                )}
                <span className="text-gray-400 text-xs">{filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                    <div className="h-52 bg-gray-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-24">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No posts found</h3>
                <p className="text-gray-500">
                  {searchTerm ? `No results for "${searchTerm}"` : "No posts match your current filters."}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => { setSearchTerm(""); setSortBy("newest"); setReadTime("all"); setDateRange("all"); setActiveCategory(null); }}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Grid of non-spotlight posts */}
                {nonSpotlight.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900">
                        {activeCategory ? activeCategory : "All Articles"}
                        <span className="ml-2 text-sm font-normal text-gray-400">({nonSpotlight.length})</span>
                      </h2>
                    </div>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {nonSpotlight.map((post: any, i: number) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          index={i}
                          onClick={() => setLocation(`/blog/${post.slug}`)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* If all posts are spotlight, show them in grid below */}
                {nonSpotlight.length === 0 && spotlightPosts.length > 0 && (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-2">
                    {spotlightPosts.map((post: any, i: number) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        index={i}
                        onClick={() => setLocation(`/blog/${post.slug}`)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories Forum */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Categories
                </h3>
                <p className="text-blue-200 text-xs mt-0.5">Follow topics you love</p>
              </div>
              <div className="divide-y divide-gray-50">
                {allCategories.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">No categories yet</div>
                ) : allCategories.map((cat: string) => {
                  const count = posts.filter((p: any) => p.category === cat).length;
                  const colors = getCategoryColors(cat);
                  return (
                    <div key={cat} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <button
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} flex-shrink-0`} />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{cat}</p>
                          <p className="text-xs text-gray-400">{count} {count === 1 ? 'article' : 'articles'}</p>
                        </div>
                      </button>
                      {user && (
                        <button
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                          onClick={() => followMutation.mutate(cat)}
                          title="Follow category"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trending Posts */}
            {posts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-orange-500" /> Trending
                </h3>
                <div className="space-y-4">
                  {[...posts].sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5).map((post: any, i: number) => (
                    <div
                      key={post.id}
                      className="flex gap-3 cursor-pointer group"
                      onClick={() => setLocation(`/blog/${post.slug}`)}
                      data-testid={`trending-post-${post.id}`}
                    >
                      <div className="text-2xl font-black text-gray-100 w-6 flex-shrink-0 leading-none mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                          {post.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <Eye className="h-3 w-3" /> {(post.viewCount || 0).toLocaleString()} views
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Join CTA */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-6">
              <Users className="h-8 w-8 mb-3 opacity-80" />
              <h3 className="font-bold text-lg mb-2">Join Taskdrip</h3>
              <p className="text-sm text-blue-200 mb-4">Earn crypto by completing campaigns for global brands</p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                onClick={() => setLocation('/register')}
                data-testid="btn-join-taskdrip"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
