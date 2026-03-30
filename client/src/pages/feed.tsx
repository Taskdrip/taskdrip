import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Heart, MessageCircle, Share2, Send, Loader2, Sparkles, TrendingUp,
  Gift, Copy, CheckCircle, Wallet
} from "lucide-react";
import { getTierConfig, formatFollowers } from "@/lib/tiers";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

// ── Tip Modal ──────────────────────────────────────────────────────────────────
function TipModal({ recipientId, recipientName, open, onClose }: {
  recipientId: string;
  recipientName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"network" | "send" | "confirm">("network");
  const [network, setNetwork] = useState("");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: wallet } = useQuery<any>({
    queryKey: [`/api/users/${recipientId}/wallet`],
    enabled: open,
  });

  const tipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${recipientId}/tip`, {
        amount, network, txHash,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Tip sent! 🎉", description: "Your tip has been submitted and will be verified by the team." });
      onClose();
      setStep("network"); setTxHash(""); setAmount("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit tip", variant: "destructive" });
    },
  });

  const NETWORKS = [
    { id: "USDT-TRC20", label: "USDT (TRC-20)", sub: "Tron Network", addr: wallet?.usdtTronWallet, color: "from-red-500 to-orange-500" },
    { id: "USDT-BEP20", label: "USDT (BEP-20)", sub: "BNB Smart Chain", addr: wallet?.usdtBscWallet, color: "from-yellow-500 to-amber-500" },
    { id: "TON", label: "TON", sub: "TON Network", addr: wallet?.tonWallet, color: "from-blue-500 to-cyan-500" },
  ].filter((n) => n.addr);

  const selectedNet = NETWORKS.find((n) => n.id === network);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            Tip {recipientName}
          </DialogTitle>
        </DialogHeader>

        {step === "network" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Choose how you'd like to send your tip:</p>
            {NETWORKS.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">This influencer hasn't set up a wallet yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {NETWORKS.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => { setNetwork(net.id); setStep("send"); }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${net.color} flex items-center justify-center text-white font-bold text-xs`}>
                      {net.id === "TON" ? "TON" : "USDT"}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{net.label}</div>
                      <div className="text-xs text-gray-500">{net.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "send" && selectedNet && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 font-medium">{selectedNet.label} Address</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gray-800 break-all flex-1 font-mono">{selectedNet.addr}</code>
                <button
                  onClick={() => copyAddress(selectedNet.addr!)}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Amount to Send</label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
              📲 Send the crypto to the address above, then enter your transaction hash below to confirm.
            </p>
            <Button
              className="w-full bg-black text-white hover:bg-gray-900 rounded-xl"
              disabled={!amount || parseFloat(amount) <= 0}
              onClick={() => setStep("confirm")}
            >
              I've Sent the Tip →
            </Button>
            <button onClick={() => setStep("network")} className="w-full text-xs text-gray-400 hover:text-gray-600">← Back</button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-800">Almost done!</p>
              <p className="text-xs text-green-600">Enter the transaction hash from your wallet</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Transaction Hash (optional)</label>
              <Input
                placeholder="0x... or TxID from your wallet"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("send")}>← Back</Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => tipMutation.mutate()}
                disabled={tipMutation.isPending}
              >
                {tipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Tip 🎉
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showTip, setShowTip] = useState(false);

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
    onError: () => toast({ title: "Error", description: "Failed to like", variant: "destructive" }),
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
      toast({ title: "Comment posted!" });
    },
    onError: () => toast({ title: "Error", description: "Failed to post comment", variant: "destructive" }),
  });

  const tier = getTierConfig((post.user?.creatorTier || "rising_sparks") as any);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({ title: "Link copied!", description: "Share Taskdrip with others" });
  };

  const isSelf = currentUserId === post.user?.id;

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
          <img src={post.imageUrl} alt="Post" className="w-full rounded-xl object-cover max-h-80" />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 border-t border-gray-50 pt-3 flex items-center gap-4">
        <button
          onClick={() => currentUserId && likeMutation.mutate()}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            liked ? "text-red-500" : "text-gray-400 hover:text-red-500"
          }`}
          disabled={!currentUserId || likeMutation.isPending}
          title={!currentUserId ? "Login to like" : ""}
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

        {/* Tip button — only show if not own post and logged in */}
        {currentUserId && !isSelf && (
          <button
            onClick={() => setShowTip(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-purple-500 transition-colors"
            title="Send a crypto tip"
          >
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Tip</span>
          </button>
        )}

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

          {currentUserId ? (
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
          ) : (
            <p className="text-xs text-gray-400 mt-3 text-center">
              <Link href="/login" className="text-blue-500 hover:underline">Log in</Link> to comment
            </p>
          )}
        </div>
      )}

      {/* Tip Modal */}
      {showTip && (
        <TipModal
          recipientId={post.user?.id}
          recipientName={`${post.user?.firstName || ""} ${post.user?.lastName || ""}`.trim()}
          open={showTip}
          onClose={() => setShowTip(false)}
        />
      )}
    </div>
  );
}

// ── Create Post ────────────────────────────────────────────────────────────────
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

// ── Feed Page ──────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: feed = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/feed"] });
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.status === "active" || c.isActive).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h1 className="text-xl font-bold text-gray-900">Influencer Feed</h1>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs ml-1">
                Like · Comment · Tip
              </Badge>
            </div>

            {isAuthenticated && <CreatePost userId={(user as any)?.id} />}

            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
                <Gift className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <p className="text-sm text-gray-600 flex-1">
                  <Link href="/login" className="text-purple-600 font-semibold hover:underline">Log in</Link> to like, comment, and tip influencers using your crypto wallet.
                </p>
              </div>
            )}

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
                <PostCard key={post.id} post={post} currentUserId={(user as any)?.id} />
              ))
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
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
                    <Button variant="outline" className="w-full border-gray-200 rounded-xl text-xs h-8">Edit Profile</Button>
                  </Link>
                  <Link href="/campaigns" className="flex-1">
                    <Button className="w-full bg-black text-white hover:bg-gray-900 rounded-xl text-xs h-8">Browse Campaigns</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Tip guide */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-5 text-white">
              <Gift className="w-6 h-6 mb-2 text-purple-200" />
              <h3 className="font-bold text-sm mb-1">Tip with Crypto</h3>
              <p className="text-white/80 text-xs mb-3">
                Support influencers directly by sending USDT or TON to their wallet. Click the 🎁 button on any post.
              </p>
              <div className="flex gap-2 text-xs">
                <span className="bg-white/15 px-2 py-1 rounded-full">USDT TRC-20</span>
                <span className="bg-white/15 px-2 py-1 rounded-full">USDT BEP-20</span>
                <span className="bg-white/15 px-2 py-1 rounded-full">TON</span>
              </div>
            </div>

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
                  <Button variant="outline" className="w-full mt-3 border-gray-200 rounded-xl text-xs h-8">
                    View All Campaigns →
                  </Button>
                </Link>
              </div>
            )}

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
