import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Heart, MessageCircle, Share2, Loader2, Sparkles, TrendingUp,
  Gift, Copy, CheckCircle, Wallet, Eye, CreditCard, Landmark, Trash2,
  Search, Filter, ChevronLeft, ChevronRight, Megaphone, Flame, Clock,
  Image as ImageIcon, Play, Star, Users, Zap, X, SlidersHorizontal,
  BookOpen, Hash, Camera
} from "lucide-react";
import { getTierConfig, getTierFromFollowers, formatFollowers } from "@/lib/tiers";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

const TDRIP_POINTS_PER_USD = 100;

// ── Tip Modal ──────────────────────────────────────────────────────────────────
function TipModal({ recipientId, recipientName, postId, open, onClose }: {
  recipientId: string; recipientName: string; postId?: string; open: boolean; onClose: () => void;
}) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<"" | "funds" | "tdrip">("");
  const [amount, setAmount] = useState("");
  const [tdripPoints, setTdripPoints] = useState("");

  const { data: meData } = useQuery<any>({ queryKey: ["/api/user"], enabled: open });
  const { data: pointsData } = useQuery<any>({ queryKey: ["/api/points/me"], enabled: open });

  const fundsBalance = parseFloat(meData?.availableBalance || "0");
  const tdripBalance = pointsData?.total ?? meData?.totalPoints ?? 0;
  const tdripUsdValue = (tdripBalance / TDRIP_POINTS_PER_USD).toFixed(2);

  const tipAmt = parseFloat(amount || "0");
  const tipPoints = parseInt(tdripPoints || "0");
  const insufficientFunds = channel === "funds" && tipAmt > 0 && fundsBalance < tipAmt;
  const insufficientTdrip = channel === "tdrip" && tipPoints > 0 && tdripBalance < tipPoints;

  const walletTipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${recipientId}/tip/wallet`, { amount, postId });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send tip");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: `$${tipAmt.toFixed(2)} tip sent!`, description: `${recipientName} has been credited instantly.` });
      handleClose();
    },
    onError: (err: any) => toast({ title: "Tip failed", description: err.message, variant: "destructive" }),
  });

  const tdripTipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tdrip/transfer", {
        recipient: recipientId, points: tipPoints, type: "tip", note: `Tip for post`,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send $TDRIP tip");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: `${tipPoints} $TDRIP sent!`, description: `${recipientName} has been tipped instantly.` });
      handleClose();
    },
    onError: (err: any) => toast({ title: "Tip failed", description: err.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setChannel(""); setAmount(""); setTdripPoints("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" /> Tip {recipientName}
          </DialogTitle>
        </DialogHeader>

        {/* Channel selector */}
        {!channel && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">Choose how you'd like to tip</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setChannel("funds")}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                data-testid="button-tip-channel-funds"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-sm">Funds Wallet</p>
                  <p className="text-xs text-gray-500 mt-0.5">Balance: <span className="font-semibold text-blue-600">${fundsBalance.toFixed(2)}</span></p>
                </div>
              </button>
              <button
                onClick={() => setChannel("tdrip")}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                data-testid="button-tip-channel-tdrip"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-sm">$TDRIP Points</p>
                  <p className="text-xs text-gray-500 mt-0.5">Balance: <span className="font-semibold text-purple-600">{tdripBalance.toLocaleString()} pts</span></p>
                  <p className="text-xs text-gray-400">≈ ${tdripUsdValue}</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Funds wallet tip */}
        {channel === "funds" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setChannel("")} className="text-gray-400 hover:text-gray-600 text-xs">← Back</button>
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-blue-500" /> Tip from Funds Wallet</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700">Available Balance</span>
              <span className="font-bold text-blue-800">${fundsBalance.toFixed(2)}</span>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Tip Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                <Input type="number" placeholder="5.00" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01" className="pl-8 h-12 rounded-xl text-lg font-semibold" data-testid="input-tip-funds-amount" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(p => (
                <button key={p} onClick={() => setAmount(p)} className={`rounded-xl border py-2 text-sm font-semibold transition-all ${amount === p ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-blue-300"}`} data-testid={`button-tip-funds-preset-${p}`}>${p}</button>
              ))}
            </div>
            {insufficientFunds && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                Insufficient funds. <Link href="/payment-deposit" className="font-bold underline text-red-800 hover:text-red-900" data-testid="link-tip-topup-funds">Top up your wallet →</Link>
              </div>
            )}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold"
              disabled={!amount || tipAmt <= 0 || insufficientFunds || walletTipMutation.isPending}
              onClick={() => walletTipMutation.mutate()}
              data-testid="button-confirm-funds-tip"
            >
              {walletTipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
              Send ${tipAmt > 0 ? tipAmt.toFixed(2) : "0.00"} Tip Instantly
            </Button>
          </div>
        )}

        {/* $TDRIP tip */}
        {channel === "tdrip" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setChannel("")} className="text-gray-400 hover:text-gray-600 text-xs">← Back</button>
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Zap className="w-4 h-4 text-purple-500" /> Tip with $TDRIP Points</span>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-purple-700">Your $TDRIP Balance</span>
              <div className="text-right">
                <p className="font-bold text-purple-800">{tdripBalance.toLocaleString()} pts</p>
                <p className="text-xs text-purple-500">≈ ${(tdripBalance / TDRIP_POINTS_PER_USD).toFixed(2)}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">$TDRIP Points to Send</label>
              <Input type="number" placeholder="100" value={tdripPoints} onChange={e => setTdripPoints(e.target.value)} min="1" step="1" className="h-12 rounded-xl text-lg font-semibold" data-testid="input-tip-tdrip-amount" />
              {tipPoints > 0 && <p className="text-xs text-purple-500 mt-1">≈ ${(tipPoints / TDRIP_POINTS_PER_USD).toFixed(2)} USD value</p>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["50", "100", "250", "500"].map(p => (
                <button key={p} onClick={() => setTdripPoints(p)} className={`rounded-xl border py-2 text-sm font-semibold transition-all ${tdripPoints === p ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 hover:border-purple-300"}`} data-testid={`button-tip-tdrip-preset-${p}`}>{p}</button>
              ))}
            </div>
            {insufficientTdrip && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                Insufficient $TDRIP. <Link href="/tasks" className="font-bold underline text-red-800 hover:text-red-900" data-testid="link-tip-earn-tdrip">Earn more $TDRIP →</Link>
              </div>
            )}
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white rounded-xl h-11 font-bold"
              disabled={!tdripPoints || tipPoints <= 0 || insufficientTdrip || tdripTipMutation.isPending}
              onClick={() => tdripTipMutation.mutate()}
              data-testid="button-confirm-tdrip-tip"
            >
              {tdripTipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Send {tipPoints > 0 ? tipPoints.toLocaleString() : "0"} $TDRIP Instantly
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function extractYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
  return match ? match[1] : "";
}

// ── Spotlight Carousel ─────────────────────────────────────────────────────────
function SpotlightCarousel({ posts }: { posts: any[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (posts.length <= 1) return;
    if (!paused) {
      intervalRef.current = setInterval(() => setActive(i => (i + 1) % posts.length), 5500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [posts.length, paused]);

  if (posts.length === 0) return null;
  const post = posts[active];
  const tier = getTierConfig(getTierFromFollowers(post.user?.totalFollowers || 0));

  const prev = () => setActive(i => (i - 1 + posts.length) % posts.length);
  const next = () => setActive(i => (i + 1) % posts.length);

  return (
    <div className="relative rounded-3xl overflow-hidden mb-6 shadow-xl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Background layer */}
      {post.imageUrl ? (
        <div className="absolute inset-0">
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(139,92,246,0.4),transparent_60%)]" />
        </div>
      )}

      {/* Content */}
      <div className="relative min-h-[280px] sm:min-h-[320px] flex flex-col justify-end p-6">
        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
            <Sparkles className="w-3 h-3" /> Spotlight
          </span>
          {post.isSponsored && (
            <span className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              <Megaphone className="w-3 h-3" /> Sponsored
            </span>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 border-2 border-white/30">
            <AvatarImage src={post.user?.profileImageUrl} />
            <AvatarFallback className="bg-purple-600 text-white font-bold text-sm">
              {post.user?.firstName?.[0]}{post.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">{post.user?.firstName} {post.user?.lastName}</span>
              {post.user?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-400" />}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.badge}`}>{tier.icon} {tier.name}</span>
            </div>
            <div className="text-white/60 text-xs">
              {post.user?.niche && `${post.user.niche} · `}
              {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}
            </div>
          </div>
        </div>

        {/* Post content */}
        <p className="text-white text-sm sm:text-base font-medium leading-relaxed line-clamp-3 mb-4 max-w-2xl">
          {post.content}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-white/60 text-xs">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.viewCount || 0}</span>
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.likeCount || 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.commentCount || 0}</span>
        </div>
      </div>

      {/* Navigation arrows */}
      {posts.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/15 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all" data-testid="btn-spotlight-prev">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/15 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all" data-testid="btn-spotlight-next">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            {posts.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} data-testid={`btn-spotlight-dot-${i}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId, isAdmin }: { post: any; currentUserId?: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showTip, setShowTip] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editImageUrl, setEditImageUrl] = useState(post.imageUrl || "");
  const [editVideoUrl, setEditVideoUrl] = useState(post.videoUrl || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: comments = [], refetch: refetchComments } = useQuery<any[]>({
    queryKey: [`/api/posts/${post.id}/comments`],
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/posts/${post.id}/like`, {}); return await res.json(); },
    onSuccess: (data) => { setLiked(data.liked); setLikeCount((p: number) => data.liked ? p + 1 : p - 1); },
    onError: () => toast({ title: "Error", description: "Failed to like", variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => { const res = await apiRequest("POST", `/api/posts/${post.id}/comments`, { content }); return await res.json(); },
    onSuccess: () => { setNewComment(""); refetchComments(); queryClient.invalidateQueries({ queryKey: ["/api/feed"] }); toast({ title: "Comment posted!" }); },
    onError: () => toast({ title: "Error", description: "Failed to post comment", variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/posts/${post.id}`, {
        content: editContent,
        imageUrl: editImageUrl.trim() || null,
        videoUrl: editVideoUrl.trim() || null,
      });
      return await res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/feed"] }); toast({ title: "Post updated!" }); setShowEditDialog(false); },
    onError: () => toast({ title: "Error", description: "Failed to update post", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("DELETE", `/api/posts/${post.id}`, {}); return res; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/feed"] }); toast({ title: "Post deleted" }); setShowDeleteConfirm(false); },
    onError: () => toast({ title: "Error", description: "Failed to delete post", variant: "destructive" }),
  });

  const tier = getTierConfig(getTierFromFollowers(post.user?.totalFollowers || 0));
  const isSelf = currentUserId === post.user?.id;
  const tipTotal = parseFloat(post.totalTipsReceived || "0");
  const isSponsored = post.isSponsored;
  const isSpotlight = post.isSpotlight;
  const youtubeId = post.videoUrl ? extractYouTubeId(post.videoUrl) : "";

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + "/feed");
    toast({ title: "Link copied!", description: "Share Taskdrip with others" });
  };

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
        isSpotlight ? "border-yellow-200 ring-1 ring-yellow-200 shadow-yellow-50" :
        isSponsored ? "border-orange-200 ring-1 ring-orange-100" :
        "border-gray-100"
      }`}
      data-testid={`post-card-${post.id}`}
    >
      {/* Sponsored / Spotlight strip */}
      {(isSponsored || isSpotlight) && (
        <div className={`px-4 py-1.5 flex items-center gap-2 text-xs font-semibold ${
          isSponsored ? "bg-orange-50 text-orange-700 border-b border-orange-100" :
          "bg-yellow-50 text-yellow-700 border-b border-yellow-100"
        }`}>
          {isSponsored ? <><Megaphone className="w-3 h-3" /> Sponsored Post</> : <><Sparkles className="w-3 h-3" /> Featured by Taskdrip</>}
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Link href={`/influencers/${post.user?.id}`}>
            <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-gray-100 hover:ring-purple-300 transition-all flex-shrink-0">
              <AvatarImage src={post.user?.profileImageUrl} alt={post.user?.firstName} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold">
                {post.user?.firstName?.charAt(0)}{post.user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/influencers/${post.user?.id}`}>
                <span className="font-bold text-gray-900 hover:text-purple-700 cursor-pointer text-sm transition-colors">
                  {post.user?.firstName} {post.user?.lastName}
                </span>
              </Link>
              {post.user?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.badge}`}>{tier.icon} {tier.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {post.user?.username && (
                <Link href={`/influencers/${post.user.id}`}>
                  <span className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">@{post.user.username}</span>
                </Link>
              )}
              {post.user?.niche && <Badge variant="secondary" className="text-xs py-0 px-2 bg-purple-50 text-purple-600 border-purple-100">{post.user.niche}</Badge>}
              <span className="text-xs text-gray-400">{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {post.user?.totalFollowers > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {formatFollowers(post.user.totalFollowers)} followers
                </span>
              )}
              {(post.user?.totalPoints ?? 0) > 0 && (
                <span className="text-xs flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-semibold" title="$TDRIP Points balance">
                  <Zap className="w-3 h-3 text-purple-500" />
                  {(post.user?.totalPoints ?? 0).toLocaleString()} pts
                  <span className="text-purple-400 font-normal">≈ ${((post.user?.totalPoints ?? 0) / TDRIP_POINTS_PER_USD).toFixed(2)}</span>
                  {post.user?.level && <span className="ml-0.5 text-purple-500">{post.user.level}</span>}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Image */}
      {post.imageUrl && !post.isSpotlight && (
        <div className="px-4 pb-3">
          <img src={post.imageUrl} alt="Post" className="w-full rounded-xl object-cover max-h-80 bg-gray-100" />
        </div>
      )}

      {/* YouTube */}
      {youtubeId && (
        <div className="px-4 pb-3">
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe src={`https://www.youtube.com/embed/${youtubeId}`} className="w-full h-full" allowFullScreen title="Post video" />
          </div>
        </div>
      )}

      {/* Tips banner */}
      {tipTotal > 0 && (
        <div className="mx-4 mb-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2">
          <Gift className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span className="text-sm text-purple-700 font-medium">${tipTotal.toFixed(2)} in tips received</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 border-t border-gray-50 pt-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400" data-testid={`text-post-views-${post.id}`}>
          <Eye className="w-4 h-4" /><span>{post.viewCount || 0}</span>
        </div>
        <button onClick={() => currentUserId && likeMutation.mutate()} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${liked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`} disabled={!currentUserId || likeMutation.isPending} data-testid={`button-like-post-${post.id}`}>
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} /><span>{likeCount}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors" data-testid={`button-comments-post-${post.id}`}>
          <MessageCircle className="w-4 h-4" /><span>{post.commentCount || 0}</span>
        </button>
        {currentUserId && !isSelf && (
          <button onClick={() => setShowTip(true)} className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-purple-500 transition-colors" data-testid={`button-tip-post-${post.id}`}>
            <Gift className="w-4 h-4" /><span className="hidden sm:inline">Tip</span>
          </button>
        )}
        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-green-500 transition-colors ml-auto" data-testid={`button-share-post-${post.id}`}>
          <Share2 className="w-4 h-4" />
        </button>
        {(isSelf || isAdmin) && (
          <div className="flex items-center gap-1">
            {isSelf && (
              <button onClick={() => { setEditContent(post.content || ""); setEditImageUrl(post.imageUrl || ""); setEditVideoUrl(post.videoUrl || ""); setShowEditDialog(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" data-testid={`edit-post-${post.id}`} title="Edit post">✏️</button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" data-testid={`delete-post-${post.id}`} title="Delete post">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-50">
          {(comments as any[]).length > 0 && (
            <div className="mt-3 space-y-3">
              {(comments as any[]).map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={c.user?.profileImageUrl} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">{c.user?.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                    <span className="text-xs font-semibold text-gray-800">{c.user?.firstName} {c.user?.lastName}</span>
                    <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {currentUserId && (
            <div className="flex gap-2 mt-3">
              <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." className="flex-1 text-sm rounded-xl border-gray-200 h-9" onKeyDown={e => e.key === "Enter" && newComment.trim() && commentMutation.mutate(newComment)} data-testid={`input-comment-${post.id}`} />
              <Button size="sm" className="bg-black text-white hover:bg-gray-900 rounded-xl h-9 px-3" onClick={() => commentMutation.mutate(newComment)} disabled={!newComment.trim() || commentMutation.isPending} data-testid={`button-submit-comment-${post.id}`}>
                {commentMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Post"}
              </Button>
            </div>
          )}
        </div>
      )}

      {showTip && <TipModal recipientId={post.user?.id} recipientName={`${post.user?.firstName || ""} ${post.user?.lastName || ""}`.trim()} postId={post.id} open={showTip} onClose={() => setShowTip(false)} />}

      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Post Content</label>
                <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} className="resize-none" data-testid="edit-post-content" placeholder="What's on your mind?" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Image URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="text-sm" data-testid="edit-post-image-url" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" /> YouTube URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="text-sm" data-testid="edit-post-video-url" />
                {editVideoUrl && extractYouTubeId(editVideoUrl) && <p className="text-xs text-green-600 mt-1">✓ Valid YouTube URL</p>}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editContent.trim()} className="bg-black hover:bg-gray-900 text-white" data-testid="save-post-edit">
                  {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" /> Delete Post</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600">Are you sure you want to delete this post? This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white" data-testid={`confirm-delete-post-${post.id}`}>
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Create Post ────────────────────────────────────────────────────────────────
function CreatePost({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data: postUsage } = useQuery<{ count: number; limit: number | null; tier: string }>({
    queryKey: ["/api/posts/my-usage"],
    enabled: !!userId,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("content", content);
      if (imageFile) formData.append("image", imageFile);
      if (videoUrl.trim()) formData.append("videoUrl", videoUrl.trim());
      const res = await fetch("/api/posts", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Failed to create post" }));
        if (res.status === 429 && data.upgradeRequired) {
          throw Object.assign(new Error(data.message), { upgradeRequired: true });
        }
        throw new Error(data.message || "Failed to create post");
      }
      return res.json();
    },
    onSuccess: () => {
      setContent(""); setImageFile(null); setImagePreview(null); setVideoUrl(""); setShowVideoInput(false);
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/my-usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      toast({ title: "Posted!", description: "Your update is now live" });
    },
    onError: (e: any) => {
      if (e.upgradeRequired) {
        setShowUpgradeDialog(true);
      } else {
        toast({ title: "Error", description: e.message || "Failed to create post", variant: "destructive" });
      }
    },
  });

  const atLimit = postUsage?.limit !== null && postUsage?.limit !== undefined && (postUsage?.count ?? 0) >= postUsage.limit;
  const tierLabel = postUsage?.tier === 'free' ? 'Free (3/mo)' : postUsage?.tier === 'monthly' ? 'Monthly (12/mo)' : 'Yearly (∞)';
  const tdripPoints = (user as any)?.totalPoints || 0;

  return (
    <>
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${atLimit ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100'}`}>
      {/* Post limit bar */}
      {postUsage && (
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-gray-400 font-medium">{tierLabel} plan</span>
          {postUsage.limit !== null ? (
            <span className={`font-bold ${atLimit ? 'text-red-500' : postUsage.count >= postUsage.limit - 1 ? 'text-amber-500' : 'text-gray-500'}`}>
              {postUsage.count}/{postUsage.limit} posts this month
              {atLimit && <Link href="/subscription" className="ml-2 text-purple-600 hover:underline">Upgrade ↑</Link>}
            </span>
          ) : (
            <span className="text-green-500 font-bold">{postUsage.count} posts · Unlimited ∞</span>
          )}
        </div>
      )}

      {atLimit ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-amber-800 font-semibold text-sm">You've reached your {postUsage?.limit}-post monthly limit.</p>
          <p className="text-amber-600 text-xs mt-1">Upgrade to Monthly (12 posts) or Yearly (unlimited) to keep posting.</p>
          <Link href="/subscription">
            <Button size="sm" className="mt-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold" data-testid="button-upgrade-feed">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Upgrade Plan
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={(user as any)?.profileImageUrl} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm font-semibold">
              {(user as any)?.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Share a campaign win, tip, or update with the community..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="resize-none border-gray-200 rounded-xl text-sm focus:border-purple-400 transition-colors min-h-[80px]"
              rows={3}
              data-testid="create-post-content"
            />
            {imagePreview && (
              <div className="relative mt-2">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black">✕</button>
              </div>
            )}
            {showVideoInput && (
              <div className="mt-2 flex gap-2">
                <Input placeholder="Paste YouTube URL..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="rounded-xl text-sm border-gray-200 flex-1" data-testid="create-post-video-url" />
                {videoUrl && extractYouTubeId(videoUrl) && <span className="text-green-500 text-xs self-center whitespace-nowrap">✓ Valid</span>}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-purple-50" data-testid="upload-image-btn">
                  <Camera className="w-4 h-4" /><span className="hidden sm:inline">Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                <button onClick={() => setShowVideoInput(!showVideoInput)} className={`flex items-center gap-1 text-xs transition-colors px-2 py-1.5 rounded-lg ${showVideoInput ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}`} data-testid="add-video-btn">
                  <Play className="w-4 h-4" /><span className="hidden sm:inline">YouTube</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                  <Wallet className="w-3 h-3" /> {tdripPoints.toLocaleString()} $TDRIP
                  {tdripPoints < 100 && <Link href="/wallet" className="text-purple-700 font-bold hover:underline ml-1">Top Up</Link>}
                </div>
                <span className="text-xs text-gray-400">{content.length}/500</span>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 rounded-xl px-5 text-sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !content.trim() || content.length > 500} data-testid="create-post-submit">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Upgrade Dialog */}
    <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-purple-600" /> Post Limit Reached</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-gray-600 text-sm leading-relaxed">You've used all your monthly posts. Upgrade to keep sharing with your audience.</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-gray-50 rounded-xl px-4 py-2"><span className="text-gray-500">Free</span><span className="font-bold text-gray-700">3 posts/month</span></div>
            <div className="flex justify-between bg-purple-50 rounded-xl px-4 py-2 border border-purple-200"><span className="text-purple-700 font-semibold">Monthly Premium</span><span className="font-bold text-purple-800">12 posts/month</span></div>
            <div className="flex justify-between bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl px-4 py-2 border border-yellow-200"><span className="text-yellow-700 font-semibold">Yearly Premium</span><span className="font-bold text-yellow-800">Unlimited ∞</span></div>
          </div>
          <Link href="/subscription">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl" data-testid="button-upgrade-limit">
              <Zap className="w-4 h-4 mr-2" /> Upgrade Now
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ── NICHES ─────────────────────────────────────────────────────────────────────
const NICHES = ["All", "Fashion", "Gaming", "Fitness", "Beauty", "Tech", "Travel", "Food", "Crypto", "Lifestyle", "Music", "Sports"];
const SORTS = [
  { key: "newest", label: "Newest", icon: Clock },
  { key: "popular", label: "Popular", icon: Flame },
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "tipped", label: "Most Tipped", icon: Gift },
];
const MEDIA_FILTERS = [
  { key: "all", label: "All", icon: Hash },
  { key: "photo", label: "Photos", icon: Camera },
  { key: "video", label: "Videos", icon: Play },
  { key: "text", label: "Text Only", icon: BookOpen },
];

// ── Feed Page ──────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = (user as any)?.userType === 'admin';

  const { data: feed = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/feed"] });
  const { data: spotlightPosts = [] } = useQuery<any[]>({ queryKey: ["/api/feed/spotlight"] });
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.status === "active" || c.isActive).slice(0, 3);

  // Derived: featured (admin), rest
  const featuredPosts = (feed as any[]).filter((p: any) => p.user?.userType === "admin" || p.user?.role === "admin");
  const communityPosts = (feed as any[]).filter((p: any) => !(p.user?.userType === "admin" || p.user?.role === "admin"));

  const filteredPosts = useMemo(() => {
    let posts = communityPosts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter((p: any) =>
        p.content?.toLowerCase().includes(q) ||
        p.user?.firstName?.toLowerCase().includes(q) ||
        p.user?.lastName?.toLowerCase().includes(q) ||
        p.user?.niche?.toLowerCase().includes(q)
      );
    }
    if (selectedNiche !== "All") {
      posts = posts.filter((p: any) => p.user?.niche?.toLowerCase() === selectedNiche.toLowerCase());
    }
    if (mediaFilter === "photo") posts = posts.filter((p: any) => !!p.imageUrl);
    else if (mediaFilter === "video") posts = posts.filter((p: any) => !!p.videoUrl);
    else if (mediaFilter === "text") posts = posts.filter((p: any) => !p.imageUrl && !p.videoUrl);

    if (sortBy === "popular") posts = [...posts].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    else if (sortBy === "trending") posts = [...posts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    else if (sortBy === "tipped") posts = [...posts].sort((a, b) => parseFloat(b.totalTipsReceived || 0) - parseFloat(a.totalTipsReceived || 0));
    else posts = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return posts;
  }, [communityPosts, searchQuery, selectedNiche, sortBy, mediaFilter]);

  const totalViews = (feed as any[]).reduce((s: number, p: any) => s + (p.viewCount || 0), 0);
  const activeFilters = [selectedNiche !== "All", sortBy !== "newest", mediaFilter !== "all", searchQuery.trim() !== ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Multi-layer hero background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-purple-950 to-indigo-950" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(139,92,246,0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(59,130,246,0.2),transparent_55%)]" />

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-purple-300 text-sm font-semibold uppercase tracking-widest">SocialFi Community</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
                Influencer Feed
              </h1>
              <p className="text-gray-400 text-base max-w-md leading-relaxed">
                Follow official updates, influencer wins, campaign tips, and supporter tips in one clean stream.
              </p>
            </div>

            {/* Hero stats */}
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              {[
                { label: "Posts", value: (feed as any[]).length, icon: "📝", color: "from-purple-500/20 to-purple-600/20 border-purple-500/20" },
                { label: "Total Views", value: totalViews > 999 ? `${(totalViews/1000).toFixed(1)}k` : totalViews, icon: "👁", color: "from-blue-500/20 to-blue-600/20 border-blue-500/20" },
                { label: "Creators", value: new Set((feed as any[]).map((p: any) => p.user?.id)).size, icon: "🎨", color: "from-green-500/20 to-green-600/20 border-green-500/20" },
              ].map(s => (
                <div key={s.label} className={`bg-gradient-to-br ${s.color} border backdrop-blur-sm rounded-2xl p-4 text-center min-w-[90px]`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-black text-white" data-testid={`hero-stat-${s.label.toLowerCase().replace(' ', '-')}`}>{s.value}</div>
                  <div className="text-xs text-gray-400 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Main Feed ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Create post */}
            {isAuthenticated && <CreatePost userId={(user as any)?.id} />}
            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <p className="text-sm text-gray-600 flex-1">
                  <Link href="/login" className="text-purple-600 font-semibold hover:underline">Log in</Link> to like, comment, and support influencers with crypto tips.
                </p>
              </div>
            )}

            {/* ── Spotlight Carousel ── */}
            {(spotlightPosts as any[]).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-yellow-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Spotlight Posts</h2>
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Admin Featured</Badge>
                </div>
                <SpotlightCarousel posts={spotlightPosts as any[]} />
              </div>
            )}

            {/* ── Advanced Filters ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Search bar */}
              <div className="p-3 border-b border-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search posts, creators, niches..."
                    className="pl-9 pr-10 h-9 rounded-xl border-gray-200 text-sm"
                    data-testid="feed-search-input"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter toggle row */}
              <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2 overflow-x-auto flex-1 pr-2 hide-scrollbar">
                  {SORTS.map(s => {
                    const Icon = s.icon;
                    return (
                      <button key={s.key} onClick={() => setSortBy(s.key)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all ${sortBy === s.key ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} data-testid={`sort-btn-${s.key}`}>
                        <Icon className="w-3 h-3" />{s.label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all ${showFilters || activeFilters > 0 ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} data-testid="btn-toggle-filters">
                  <SlidersHorizontal className="w-3 h-3" />
                  Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
                </button>
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="p-3 space-y-3 border-b border-gray-50 bg-gray-50/50">
                  {/* Niche filter */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Filter by Niche</p>
                    <div className="flex flex-wrap gap-1.5">
                      {NICHES.map(n => (
                        <button key={n} onClick={() => setSelectedNiche(n)} className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${selectedNiche === n ? "bg-purple-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600"}`} data-testid={`niche-filter-${n.toLowerCase()}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Media filter */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Content Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MEDIA_FILTERS.map(f => {
                        const Icon = f.icon;
                        return (
                          <button key={f.key} onClick={() => setMediaFilter(f.key)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${mediaFilter === f.key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"}`} data-testid={`media-filter-${f.key}`}>
                            <Icon className="w-3 h-3" />{f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Clear filters */}
                  {activeFilters > 0 && (
                    <button onClick={() => { setSelectedNiche("All"); setSortBy("newest"); setMediaFilter("all"); setSearchQuery(""); }} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1" data-testid="btn-clear-filters">
                      <X className="w-3 h-3" /> Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Active filter chips */}
              {activeFilters > 0 && (
                <div className="px-3 py-2 flex flex-wrap gap-1.5">
                  {selectedNiche !== "All" && <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium"><Hash className="w-3 h-3" />{selectedNiche}<button onClick={() => setSelectedNiche("All")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                  {sortBy !== "newest" && <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{sortBy}<button onClick={() => setSortBy("newest")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                  {mediaFilter !== "all" && <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">{mediaFilter}<button onClick={() => setMediaFilter("all")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                  {searchQuery && <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">"{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"<button onClick={() => setSearchQuery("")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                </div>
              )}
            </div>

            {/* ── Post Lists ── */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex gap-3 mb-3">
                      <Skeleton className="w-11 h-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Featured admin posts */}
                {featuredPosts.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <h2 className="text-sm font-bold text-gray-900">Featured by Taskdrip</h2>
                      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Official</Badge>
                    </div>
                    <div className="space-y-3">
                      {featuredPosts.map((p: any) => <PostCard key={p.id} post={p} currentUserId={(user as any)?.id} isAdmin={isAdmin} />)}
                    </div>
                  </section>
                )}

                {/* Filtered community posts */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <h2 className="text-sm font-bold text-gray-900">
                      {searchQuery ? `Results for "${searchQuery}"` : selectedNiche !== "All" ? `${selectedNiche} Posts` : "Community Posts"}
                    </h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredPosts.length}</span>
                  </div>
                  {filteredPosts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                      <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-gray-700 mb-2">No posts found</h3>
                      <p className="text-gray-400 text-sm mb-4">Try adjusting your filters or search query.</p>
                      <button onClick={() => { setSelectedNiche("All"); setSortBy("newest"); setMediaFilter("all"); setSearchQuery(""); }} className="text-sm text-purple-600 font-semibold hover:underline">Clear filters</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPosts.map((p: any) => <PostCard key={p.id} post={p} currentUserId={(user as any)?.id} isAdmin={isAdmin} />)}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="space-y-4">
            {/* User card */}
            {isAuthenticated && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-purple-600 to-blue-600" />
                <div className="px-5 pb-5 -mt-8">
                  <Avatar className="h-16 w-16 border-4 border-white shadow-md mb-3">
                    <AvatarImage src={(user as any)?.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold text-xl">
                      {(user as any)?.firstName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-bold text-gray-900 text-base">{(user as any)?.firstName} {(user as any)?.lastName}</div>
                  {(() => {
                    const tier = getTierConfig(getTierFromFollowers((user as any)?.totalFollowers || 0));
                    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.badge}`}>{tier.icon} {tier.name}</span>;
                  })()}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <div className="text-base font-bold text-gray-900">{formatFollowers((user as any)?.totalFollowers || 0)}</div>
                      <div className="text-xs text-gray-500">Followers</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <div className="text-base font-bold text-green-600">${parseFloat((user as any)?.totalEarned || '0').toFixed(0)}</div>
                      <div className="text-xs text-gray-500">Earned</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href="/profile-edit" className="flex-1">
                      <Button variant="outline" className="w-full border-gray-200 rounded-xl text-xs h-8">Edit Profile</Button>
                    </Link>
                    <Link href="/campaigns" className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 rounded-xl text-xs h-8">Browse Tasks</Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tip CTA */}
            <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 rounded-2xl p-5 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full translate-x-8 -translate-y-8" />
              <Gift className="w-7 h-7 mb-3 text-purple-200" />
              <h3 className="font-bold text-base mb-1.5">Tip with crypto or card</h3>
              <p className="text-white/75 text-xs mb-3 leading-relaxed">Support influencers using Taskdrip-managed checkout. Click the gift icon on any post.</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">💳 Card</span>
                <span className="bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">₿ Crypto</span>
                <span className="bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">🏦 Bank</span>
              </div>
            </div>

            {/* Active campaigns */}
            {activeCampaigns.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Hot Campaigns</h3>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-auto" />
                </div>
                <div className="space-y-2">
                  {activeCampaigns.map((c: any) => (
                    <Link href={`/campaigns/${c.id}`} key={c.id}>
                      <div className="group p-3 bg-gray-50 rounded-xl hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900 group-hover:text-white truncate">{c.title}</div>
                            <div className="text-xs text-gray-500 group-hover:text-white/70 truncate">{c.brandName}</div>
                          </div>
                          <div className="text-xs font-bold text-green-600 group-hover:text-green-300 whitespace-nowrap">${c.reward}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/campaigns">
                  <Button variant="outline" className="w-full mt-3 border-gray-200 rounded-xl text-xs h-8 hover:border-purple-300 hover:text-purple-600">View All Campaigns →</Button>
                </Link>
              </div>
            )}

            {/* Niche quick filter sidebar widget */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-purple-500" />
                <h3 className="font-bold text-gray-900 text-sm">Browse by Niche</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NICHES.slice(1).map(n => (
                  <button key={n} onClick={() => setSelectedNiche(selectedNiche === n ? "All" : n)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${selectedNiche === n ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700"}`} data-testid={`sidebar-niche-${n.toLowerCase()}`}>
                    #{n}
                  </button>
                ))}
              </div>
            </div>

            {/* Join CTA for non-auth */}
            {!isAuthenticated && (
              <div className="bg-black rounded-2xl p-5 text-white text-center overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.3),transparent_70%)]" />
                <div className="relative">
                  <div className="text-3xl mb-2">🚀</div>
                  <h3 className="font-bold text-base mb-2">Join Taskdrip</h3>
                  <p className="text-white/60 text-xs mb-4 leading-relaxed">Earn crypto by completing brand campaigns as an influencer</p>
                  <Link href="/signup">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-sm font-semibold">
                      Get Started Free →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
