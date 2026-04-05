import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart, MessageCircle, Share2, Eye, Clock, Calendar, ArrowLeft,
  Facebook, Twitter, Link2, Bookmark, Send, ChevronDown, ChevronUp
} from "lucide-react";

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [shared, setShared] = useState(false);

  const slug = params?.slug;

  const { data: post, isLoading } = useQuery<any>({
    queryKey: ["/api/blog", slug],
    queryFn: () => fetch(`/api/blog/${slug}`).then(r => r.json()),
    enabled: !!slug,
  });

  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });

  const { data: liked } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/blog", slug, "like"],
    queryFn: () => fetch(`/api/blog/${slug}/like`).then(r => r.json()),
    enabled: !!slug && !!user,
  });

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ["/api/blog", slug, "comments"],
    queryFn: () => fetch(`/api/blog/${slug}/comments`).then(r => r.json()),
    enabled: !!slug,
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: ["/api/blog/category", post?.category, "follow"],
    queryFn: () => fetch(`/api/blog/category/${post?.category}/follow`).then(r => r.json()),
    enabled: !!post?.category && !!user,
  });

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/blog/${slug}/like`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog", slug, "like"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog", slug] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/blog/${slug}/comments`, { content }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/blog", slug, "comments"] });
      toast({ title: "Comment posted!" });
    },
  });

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/blog/category/${post?.category}/follow`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/category", post?.category, "follow"] });
      toast({ title: followStatus?.following ? "Unfollowed category" : "Following category!" });
    },
  });

  const handleShare = (platform?: string) => {
    const url = window.location.href;
    const title = post?.title || "Check this out";
    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank");
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    } else {
      navigator.clipboard.writeText(url);
      setShared(true);
      toast({ title: "Link copied!", description: "Share link copied to clipboard" });
      setTimeout(() => setShared(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-3/4"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-gray-200 rounded"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post || post.message) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h2>
          <Button onClick={() => setLocation("/blog")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* SEO Meta */}
      {post.metaDescription && (
        <meta name="description" content={post.metaDescription} />
      )}

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <button onClick={() => setLocation("/blog")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Blog</span>
        </button>

        {/* Category & Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {post.category && (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer px-4 py-1 text-sm"
              onClick={() => setLocation(`/blog?category=${post.category}`)}>
              {post.category}
            </Badge>
          )}
          {post.tags?.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs text-gray-500">{tag}</Badge>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
          {post.title}
        </h1>

        {/* Author & Stats bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                TD
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Taskdrip Team</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readingTime || 5} min read
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> {(post.viewCount || 0).toLocaleString()} views
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" /> {post.likesCount || 0} likes
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> {comments.length} comments
            </span>
          </div>
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-72 sm:h-96 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        {!post.featuredImage && (
          <div className="mb-8 rounded-2xl overflow-hidden h-64 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-6xl mb-2">📝</div>
              <p className="text-lg font-medium opacity-80">{post.category || 'Article'}</p>
            </div>
          </div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-5 mb-8">
            <p className="text-blue-900 text-lg leading-relaxed italic">{post.excerpt}</p>
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg prose-gray max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{
            lineHeight: '1.8',
            fontSize: '1.05rem',
          }}
        />

        {/* Inline style for prose */}
        <style>{`
          .prose h1, .prose h2, .prose h3 { font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
          .prose h2 { font-size: 1.5rem; color: #1a1a2e; }
          .prose h3 { font-size: 1.25rem; color: #2d2d44; }
          .prose p { margin-bottom: 1.25rem; color: #374151; }
          .prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
          .prose li { margin-bottom: 0.5rem; color: #374151; }
          .prose strong { font-weight: 700; color: #111827; }
          .prose a { color: #2563eb; text-decoration: underline; }
          .prose blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; font-style: italic; color: #4b5563; }
          .prose code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; }
          .prose img { border-radius: 12px; margin: 1.5rem 0; }
        `}</style>

        {/* Tags */}
        {post.seoKeywords && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.seoKeywords.split(',').map((kw: string) => (
              <span key={kw.trim()} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-gray-200 cursor-pointer">
                #{kw.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Engagement Bar */}
        <div className="flex flex-wrap items-center gap-3 py-6 border-t border-b border-gray-100 mb-8">
          <Button
            variant={liked?.liked ? "default" : "outline"}
            size="sm"
            onClick={() => user ? likeMutation.mutate() : setLocation('/login')}
            disabled={likeMutation.isPending}
            className={`flex items-center gap-2 rounded-full px-5 transition-all ${liked?.liked ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'hover:border-red-300 hover:text-red-500'}`}
          >
            <Heart className={`h-4 w-4 ${liked?.liked ? 'fill-current' : ''}`} />
            <span>{post.likesCount || 0} {liked?.liked ? 'Liked' : 'Like'}</span>
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full px-5 hover:border-blue-300 hover:text-blue-600"
            onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}>
            <MessageCircle className="h-4 w-4" />
            <span>{comments.length} Comments</span>
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleShare("twitter")}>
              <Twitter className="h-4 w-4 text-sky-500" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleShare("facebook")}>
              <Facebook className="h-4 w-4 text-blue-600" />
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full px-4" onClick={() => handleShare()}>
              <Link2 className="h-4 w-4" />
              {shared ? "Copied!" : "Share"}
            </Button>
          </div>
        </div>

        {/* Category Follow CTA */}
        {post.category && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900">Follow <span className="text-blue-600">#{post.category}</span></h3>
              <p className="text-sm text-gray-600 mt-1">Get notified when new articles are published in this category</p>
            </div>
            {user ? (
              <Button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                variant={followStatus?.following ? "outline" : "default"}
                className={followStatus?.following ? "border-blue-300 text-blue-600" : "bg-blue-600 hover:bg-blue-700"}
              >
                {followStatus?.following ? "✓ Following" : "Follow Category"}
              </Button>
            ) : (
              <Button onClick={() => setLocation('/login')} className="bg-blue-600 hover:bg-blue-700">
                Sign in to Follow
              </Button>
            )}
          </div>
        )}

        {/* Comments Section */}
        <section id="comments" className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Comments ({comments.length})
          </h2>

          {/* Write comment */}
          {user ? (
            <div className="bg-gray-50 rounded-2xl p-5 mb-8">
              <div className="flex gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={(user as any)?.profileImageUrl} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="resize-none min-h-[80px] bg-white border-gray-200 focus:border-blue-400 rounded-xl"
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      size="sm"
                      onClick={() => commentMutation.mutate(commentText)}
                      disabled={!commentText.trim() || commentMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {commentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-6 text-center mb-8">
              <p className="text-gray-600 mb-3">Sign in to join the conversation</p>
              <Button onClick={() => setLocation('/login')} className="bg-blue-600 hover:bg-blue-700">
                Sign In to Comment
              </Button>
            </div>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {displayedComments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={comment.user?.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                      {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {comment.user?.firstName} {comment.user?.lastName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}

              {comments.length > 3 && (
                <Button variant="ghost" className="w-full text-blue-600 hover:bg-blue-50"
                  onClick={() => setShowAllComments(!showAllComments)}>
                  {showAllComments ? (
                    <><ChevronUp className="h-4 w-4 mr-2" /> Show Less</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-2" /> Show {comments.length - 3} More Comments</>
                  )}
                </Button>
              )}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
