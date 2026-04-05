import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar, Clock, Eye, Heart, MessageCircle, ArrowRight,
  TrendingUp, Users, Search, Bell, BellOff, BookOpen, Sparkles
} from "lucide-react";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "task-strategy": { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  "crypto-payments": { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  "app-testing": { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  "trading-tips": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  "local-tasks": { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  "social-media": { bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
  "gaming": { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  "news": { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  "general": { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
};

const GRADIENT_PATTERNS = [
  "from-blue-500 via-blue-600 to-purple-600",
  "from-green-500 via-teal-500 to-blue-500",
  "from-orange-500 via-red-500 to-pink-500",
  "from-purple-500 via-purple-600 to-pink-500",
  "from-yellow-400 via-orange-500 to-red-500",
  "from-teal-500 via-cyan-500 to-blue-500",
];

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category?.toLowerCase()] || CATEGORY_COLORS["general"];
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
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 rounded-2xl" onClick={onClick}>
      {/* Image */}
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
        {/* Category badge overlay */}
        <div className="absolute top-3 left-3">
          {post.category && <CategoryBadge category={post.category} />}
        </div>
        {/* Stats overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="flex items-center gap-1 text-white text-xs">
            <Eye className="h-3 w-3" /> {(post.viewCount || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-white text-xs">
            <Heart className="h-3 w-3" /> {post.likesCount || 0}
          </span>
          <span className="flex items-center gap-1 text-white text-xs">
            <MessageCircle className="h-3 w-3" /> {post.commentsCount || 0}
          </span>
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

export default function Blog() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/blog", activeCategory],
    queryFn: () => fetch(`/api/blog${activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : ''}`).then(r => r.json()),
  });

  // Derive unique categories from posts
  const allCategories = Array.from(new Set(posts.map((p: any) => p.category).filter(Boolean)));

  // Filter posts by search
  const filteredPosts = posts.filter((p: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
  });

  const featuredPost = filteredPosts[0];
  const restPosts = filteredPosts.slice(1);

  const followMutation = useMutation({
    mutationFn: (category: string) =>
      fetch(`/api/blog/category/${category}/follow`, { method: 'POST' }).then(r => r.json()),
    onSuccess: (_, category) => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/category", category, "follow"] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              <span className="text-yellow-400 font-semibold text-sm uppercase tracking-widest">Taskdrip Blog</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              Insights for Influencers & Brands
            </h1>
            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
              Expert guides, earning strategies, platform updates, and success stories from the Taskdrip community.
            </p>
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-full bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-4 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${!activeCategory ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                All Posts
              </button>
              {allCategories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                    <div className="h-52 bg-gray-200"></div>
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-24">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No posts found</h3>
                <p className="text-gray-500">
                  {searchTerm ? `No results for "${searchTerm}"` : "No posts in this category yet."}
                </p>
                {searchTerm && (
                  <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>Clear Search</Button>
                )}
              </div>
            ) : (
              <>
                {/* Featured post */}
                {featuredPost && (
                  <div
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer mb-8"
                    onClick={() => setLocation(`/blog/${featuredPost.slug}`)}
                  >
                    <div className="md:flex">
                      <div className="md:w-2/5 relative h-64 md:h-auto overflow-hidden">
                        {featuredPost.featuredImage ? (
                          <img
                            src={featuredPost.featuredImage}
                            alt={featuredPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center">
                            <TrendingUp className="h-16 w-16 text-white opacity-60" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            ⭐ Featured
                          </span>
                        </div>
                      </div>
                      <div className="md:w-3/5 p-8 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-3">
                          {featuredPost.category && <CategoryBadge category={featuredPost.category} />}
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {featuredPost.readingTime || 5} min read
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors leading-snug">
                          {featuredPost.title}
                        </h2>
                        <p className="text-gray-600 mb-5 line-clamp-3 leading-relaxed">
                          {featuredPost.excerpt || featuredPost.content?.replace(/<[^>]*>/g, '').substring(0, 160)}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {(featuredPost.viewCount || 0).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {featuredPost.likesCount || 0}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {featuredPost.commentsCount || 0}</span>
                          </div>
                          <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl text-sm">
                            Read Article <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid of posts */}
                {restPosts.length > 0 && (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {restPosts.map((post: any, i: number) => (
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
                  const colors = CATEGORY_COLORS[cat?.toLowerCase()] || CATEGORY_COLORS["general"];
                  return (
                    <div key={cat} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <button
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} flex-shrink-0`}></div>
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
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
