import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart, MessageCircle, Share2, Send, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { getTierConfig, formatFollowers } from "@/lib/tiers";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

function PostCard({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);

  const { data: comments = [], refetch: refetchComments } = useQuery<any[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/posts/${post.id}/like`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      setLiked(data.liked);
      setLikeCount((prev: number) => data.liked ? prev + 1 : prev - 1);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/posts/${post.id}/comments`, { content });
      return await res.json();
    },
    onSuccess: () => {
      setNewComment("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    },
  });

  const tier = getTierConfig((post.user?.creatorTier || "rising_sparks") as any);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({ title: "Link copied!", description: "Share Taskdrip with others" });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Post Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Link href={`/creators/${post.user?.id}`}>
            <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-gray-100">
              <AvatarImage src={post.user?.profileImageUrl} alt={post.user?.firstName} />
              <AvatarFallback className="bg-black text-white font-semibold">
                {post.user?.firstName?.charAt(0)}{post.user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/creators/${post.user?.id}`}>
                <span className="font-bold text-gray-900 hover:underline cursor-pointer text-sm">
                  {post.user?.firstName} {post.user?.lastName}
                </span>
              </Link>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.badge}`}>
                {tier.icon} {tier.name}
              </span>
              {post.user?.isVerified && (
                <span className="text-xs text-blue-500 font-medium">✓</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {post.user?.username && (
                <span className="text-xs text-gray-400">@{post.user.username}</span>
              )}
              {post.user?.niche && (
                <Badge variant="secondary" className="text-xs py-0 px-2">{post.user.niche}</Badge>
              )}
              <span className="text-xs text-gray-400">
                {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}
              </span>
            </div>
            {post.user?.totalFollowers > 0 && (
              <div className="text-xs text-gray-400 mt-0.5">
                {formatFollowers(post.user.totalFollowers)} followers
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        <p className="mt-3 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Post Image */}
      {post.imageUrl && (
        <div className="px-4 pb-3">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full rounded-xl object-cover max-h-80"
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 border-t border-gray-50 pt-3 flex items-center gap-4">
        <button
          onClick={() => currentUserId && likeMutation.mutate()}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            liked ? "text-red-500" : "text-gray-400 hover:text-red-500"
          }`}
          disabled={!currentUserId}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount || 0}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-green-500 transition-colors ml-auto"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-50">
          {comments.length > 0 && (
            <div className="mt-3 space-y-3">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={comment.user?.profileImageUrl} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {comment.user?.firstName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                    <div className="text-xs font-semibold text-gray-700">
                      {comment.user?.firstName} {comment.user?.lastName}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{comment.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentUserId && (
            <div className="flex gap-2 mt-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none text-xs rounded-xl border-gray-200 min-h-[36px] max-h-24 py-2"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                    e.preventDefault();
                    commentMutation.mutate(newComment);
                  }
                }}
              />
              <Button
                size="sm"
                className="bg-black text-white rounded-xl px-3 self-end"
                onClick={() => newComment.trim() && commentMutation.mutate(newComment)}
                disabled={commentMutation.isPending || !newComment.trim()}
              >
                {commentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreatePost({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/posts", { content });
      return await res.json();
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Posted!", description: "Your update is now live" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={(user as any)?.profileImageUrl} />
          <AvatarFallback className="bg-black text-white text-sm">
            {(user as any)?.firstName?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Share a campaign win, tip, or update with the community..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none border-gray-200 rounded-xl text-sm focus:border-black transition-colors min-h-[80px]"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{content.length}/500</span>
            <Button
              className="bg-black text-white hover:bg-gray-900 rounded-xl px-5 text-sm"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !content.trim() || content.length > 500}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: feed = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/feed"],
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
  });

  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.status === "active").slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h1 className="text-xl font-bold text-gray-900">Influencer Feed</h1>
            </div>

            {/* Create post box */}
            {isAuthenticated && <CreatePost userId={(user as any)?.id} />}

            {/* Feed */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-11 h-11 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-200 rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feed.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 text-sm">Be the first to share something with the community!</p>
              </div>
            ) : (
              feed.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={(user as any)?.id}
                />
              ))
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* User quick info */}
            {isAuthenticated && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={(user as any)?.profileImageUrl} />
                    <AvatarFallback className="bg-black text-white font-semibold">
                      {(user as any)?.firstName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-gray-900">{(user as any)?.firstName} {(user as any)?.lastName}</div>
                    {(user as any)?.creatorTier && (() => {
                      const tier = getTierConfig((user as any)?.creatorTier);
                      return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.badge}`}>{tier.icon} {tier.name}</span>;
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-lg font-bold text-gray-900">{formatFollowers((user as any)?.totalFollowers || 0)}</div>
                    <div className="text-xs text-gray-500">Followers</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-lg font-bold text-green-600">${parseFloat((user as any)?.totalEarned || '0').toFixed(0)}</div>
                    <div className="text-xs text-gray-500">Earned</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href="/profile-edit" className="flex-1">
                    <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs h-8">Edit Profile</Button>
                  </Link>
                  <Link href="/campaigns" className="flex-1">
                    <Button className="w-full bg-black text-white hover:bg-gray-900 rounded-xl text-xs h-8">Browse Campaigns</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Active Campaigns */}
            {activeCampaigns.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <h3 className="font-bold text-gray-900 text-sm">Hot Campaigns</h3>
                </div>
                <div className="space-y-3">
                  {activeCampaigns.map((c: any) => (
                    <Link href={`/campaigns/${c.id}`} key={c.id}>
                      <div className="group p-3 bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900 group-hover:text-white truncate">{c.title}</div>
                            <div className="text-xs text-gray-500 group-hover:text-white/70">{c.brandName}</div>
                          </div>
                          <div className="text-xs font-bold text-green-600 group-hover:text-green-400 whitespace-nowrap">${c.reward}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/campaigns">
                  <Button variant="outline" className="w-full mt-3 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs h-8">
                    View All Campaigns →
                  </Button>
                </Link>
              </div>
            )}

            {/* Not logged in CTA */}
            {!isAuthenticated && (
              <div className="bg-black rounded-2xl p-5 text-white text-center">
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="font-bold mb-2">Join Taskdrip</h3>
                <p className="text-white/70 text-xs mb-4">Earn crypto by completing brand campaigns as an influencer</p>
                <Link href="/signup">
                  <Button className="w-full bg-white text-black hover:bg-gray-100 rounded-xl text-sm font-semibold">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
