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
  Gift, Copy, CheckCircle, Wallet, Eye, CreditCard, Landmark, Trash2
} from "lucide-react";
import { getTierConfig, getTierFromFollowers, formatFollowers } from "@/lib/tiers";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

// ── Tip Modal ──────────────────────────────────────────────────────────────────
function TipModal({ recipientId, recipientName, postId, open, onClose }: {
  recipientId: string;
  recipientName: string;
  postId?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"amount" | "method" | "details" | "confirm">("amount");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
    enabled: open,
  });

  const tipMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${recipientId}/tip`, {
        amount,
        network: selectedMethod?.network || selectedMethod?.label,
        txHash,
        postId,
        paymentMethodId: selectedMethod?.id,
        paymentMethodType: selectedMethod?.type,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Tip submitted", description: "Your tip has been recorded and will be verified by the team." });
      onClose();
      setStep("amount"); setTxHash(""); setAmount(""); setSelectedMethodId("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit tip", variant: "destructive" });
    },
  });

  const checkoutMethods = (paymentMethods as any[]).map((method) => ({ ...method, source: "Taskdrip secure checkout" }));
  const selectedMethod = checkoutMethods.find((method) => method.id === selectedMethodId);
  const readyToConfirm = selectedMethod?.type === "stripe" || selectedMethod?.type === "paystack" || txHash.trim().length > 0;

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

        <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-center">
          {["Amount", "Method", "Details", "Confirm"].map((label, idx) => {
            const steps = ["amount", "method", "details", "confirm"];
            const active = steps.indexOf(step) >= idx;
            return (
              <div key={label} className={`rounded-full py-1.5 ${active ? "bg-black text-white" : "bg-gray-100 text-gray-400"}`}>
                {label}
              </div>
            );
          })}
        </div>

        {step === "amount" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-gray-950 to-purple-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">Influencer support</p>
              <h3 className="text-2xl font-black">Send a tip in seconds</h3>
              <p className="text-white/70 text-sm mt-2">Choose an amount, pay through a Taskdrip-managed method, and submit confirmation for review.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Tip Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                <Input
                  type="number"
                  placeholder="10.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="pl-8 h-12 rounded-xl text-lg font-semibold"
                  data-testid="input-tip-amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["5", "10", "25"].map((preset) => (
                <button key={preset} onClick={() => setAmount(preset)} className="rounded-xl border border-gray-200 py-2 text-sm font-semibold hover:border-black" data-testid={`button-tip-preset-${preset}`}>
                  ${preset}
                </button>
              ))}
            </div>
            <Button
              className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-11"
              disabled={!amount || parseFloat(amount) <= 0}
              onClick={() => setStep("method")}
              data-testid="button-tip-continue-method"
            >
              Continue to payment
            </Button>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Choose a payment method for your ${parseFloat(amount || "0").toFixed(2)} tip.</p>
            {checkoutMethods.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No payment methods are available yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkoutMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => { setSelectedMethodId(method.id); setStep("details"); }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all text-left"
                    data-testid={`button-tip-method-${method.id}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-950 to-purple-700 flex items-center justify-center text-white">
                      {method.type === "bank" ? <Landmark className="w-4 h-4" /> : method.type === "stripe" || method.type === "paystack" ? <CreditCard className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{method.label}</div>
                      <div className="text-xs text-gray-500">{method.source} · {method.type}{method.currency ? ` · ${method.currency}` : ""}</div>
                    </div>
                    <span className="text-gray-300">→</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setStep("amount")} className="w-full text-xs text-gray-400 hover:text-gray-600" data-testid="button-tip-back-amount">← Back</button>
          </div>
        )}

        {step === "details" && selectedMethod && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">{selectedMethod.label}</p>
                <Badge variant="secondary" className="capitalize">{selectedMethod.type}</Badge>
              </div>
              {selectedMethod.address && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Wallet address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-800 break-all flex-1 font-mono">{selectedMethod.address}</code>
                    <button onClick={() => copyAddress(selectedMethod.address)} className="flex-shrink-0 p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100" data-testid="button-copy-tip-address">
                      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>
              )}
              {selectedMethod.bankName && <p className="text-xs text-gray-700"><span className="font-semibold">Bank:</span> {selectedMethod.bankName}</p>}
              {selectedMethod.accountName && <p className="text-xs text-gray-700"><span className="font-semibold">Account name:</span> {selectedMethod.accountName}</p>}
              {selectedMethod.accountNumber && <p className="text-xs text-gray-700"><span className="font-semibold">Account number:</span> {selectedMethod.accountNumber}</p>}
              {selectedMethod.paypalEmail && <p className="text-xs text-gray-700"><span className="font-semibold">PayPal:</span> {selectedMethod.paypalEmail}</p>}
              {selectedMethod.type === "stripe" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                  Stripe is configured as a platform payment method. Submit the card/payment reference after payment.
                </div>
              )}
              {selectedMethod.instructions && <p className="text-xs text-gray-500">{selectedMethod.instructions}</p>}
            </div>
            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
              Send ${parseFloat(amount || "0").toFixed(2)} to Taskdrip using the method above. The team will verify and credit the tip.
            </p>
            <Button
              className="w-full bg-black text-white hover:bg-gray-900 rounded-xl"
              onClick={() => setStep("confirm")}
              data-testid="button-tip-details-continue"
            >
              Continue to confirmation →
            </Button>
            <button onClick={() => setStep("method")} className="w-full text-xs text-gray-400 hover:text-gray-600" data-testid="button-tip-back-method">← Back</button>
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
              <label className="text-xs font-medium text-gray-700 mb-1 block">Transaction ID / Receipt Reference</label>
              <Input
                placeholder="0x..., TxID, receipt number, or card reference"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                data-testid="input-tip-reference"
              />
              {selectedMethod?.type !== "stripe" && selectedMethod?.type !== "paystack" && (
                <p className="text-xs text-gray-400 mt-1">Required for manual verification.</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("details")} data-testid="button-tip-back-details">← Back</Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => tipMutation.mutate()}
                disabled={tipMutation.isPending || !readyToConfirm}
                data-testid="button-confirm-tip"
              >
                {tipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Tip
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
  return match ? match[1] : url;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const editMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/posts/${post.id}`, { content: editContent });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Post updated!" });
      setShowEditDialog(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to update post", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/posts/${post.id}`, {});
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Post deleted" });
      setShowDeleteConfirm(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete post", variant: "destructive" }),
  });

  const tier = getTierConfig(getTierFromFollowers(post.user?.totalFollowers || 0));

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({ title: "Link copied!", description: "Share Taskdrip with others" });
  };

  const isSelf = currentUserId === post.user?.id;
  const tipTotal = parseFloat(post.totalTipsReceived || "0");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Post Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Link href={`/influencers/${post.user?.id}`}>
            <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-gray-100">
              <AvatarImage src={post.user?.profileImageUrl} alt={post.user?.firstName} />
              <AvatarFallback className="bg-black text-white font-semibold">
                {post.user?.firstName?.charAt(0)}{post.user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/influencers/${post.user?.id}`}>
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

      {/* YouTube Embed */}
      {post.videoUrl && extractYouTubeId(post.videoUrl) && (
        <div className="px-4 pb-3">
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${extractYouTubeId(post.videoUrl)}`}
              className="w-full h-full"
              allowFullScreen
              title="Post video"
            />
          </div>
        </div>
      )}

      {/* Tips received banner */}
      {tipTotal > 0 && (
        <div className="mx-4 mb-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2">
          <Gift className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span className="text-sm text-purple-700 font-medium">${tipTotal.toFixed(2)} in tips received</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 border-t border-gray-50 pt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400" data-testid={`text-post-views-${post.id}`}>
          <Eye className="w-4 h-4" />
          <span>{post.viewCount || 0}</span>
        </div>

        <button
          onClick={() => currentUserId && likeMutation.mutate()}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            liked ? "text-red-500" : "text-gray-400 hover:text-red-500"
          }`}
          disabled={!currentUserId || likeMutation.isPending}
          title={!currentUserId ? "Login to like" : ""}
          data-testid={`button-like-post-${post.id}`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors"
          data-testid={`button-comments-post-${post.id}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount || 0}</span>
        </button>

        {/* Tip button — only show if not own post and logged in */}
        {currentUserId && !isSelf && (
          <button
            onClick={() => setShowTip(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-purple-500 transition-colors"
            title="Send a tip"
            data-testid={`button-tip-post-${post.id}`}
          >
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Tip</span>
          </button>
        )}

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-green-500 transition-colors ml-auto"
          data-testid={`button-share-post-${post.id}`}
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Edit/Delete for own post or admin */}
        {(isSelf || isAdmin) && (
          <div className="flex items-center gap-1 ml-auto">
            {isSelf && (
              <button
                onClick={() => { setEditContent(post.content); setShowEditDialog(true); }}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-lg hover:bg-blue-50"
                data-testid={`edit-post-${post.id}`}
                title="Edit post"
              >
                ✏️
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
              data-testid={`delete-post-${post.id}`}
              title="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
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
          postId={post.id}
          open={showTip}
          onClose={() => setShowTip(false)}
        />
      )}

      {/* Edit Post Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={5}
                className="resize-none"
                data-testid="edit-post-content"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button
                  onClick={() => editMutation.mutate()}
                  disabled={editMutation.isPending || !editContent.trim()}
                  className="bg-black hover:bg-gray-900 text-white"
                  data-testid="save-post-edit"
                >
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" /> Delete Post
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">Are you sure you want to delete this post? This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid={`confirm-delete-post-${post.id}`}
              >
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("content", content);
      if (imageFile) formData.append("image", imageFile);
      if (videoUrl.trim()) formData.append("videoUrl", videoUrl.trim());

      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setVideoUrl("");
      setShowVideoInput(false);
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
            data-testid="create-post-content"
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black"
              >✕</button>
            </div>
          )}

          {/* YouTube URL Input */}
          {showVideoInput && (
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Paste YouTube URL (https://youtube.com/...)"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="rounded-xl text-sm border-gray-200"
                data-testid="create-post-video-url"
              />
              {videoUrl && extractYouTubeId(videoUrl) && (
                <span className="text-green-500 text-xs self-center whitespace-nowrap">✓ Valid</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {/* Image Upload */}
              <label className="cursor-pointer flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2 py-1 rounded-lg hover:bg-purple-50" data-testid="upload-image-btn">
                📷
                <span className="hidden sm:inline">Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>

              {/* YouTube Link Toggle */}
              <button
                onClick={() => setShowVideoInput(!showVideoInput)}
                className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-lg ${showVideoInput ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}`}
                data-testid="add-video-btn"
              >
                ▶️ <span className="hidden sm:inline">YouTube</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{content.length}/500</span>
              <Button
                className="bg-black text-white hover:bg-gray-900 rounded-xl px-5 text-sm"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !content.trim() || content.length > 500}
                data-testid="create-post-submit"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feed Page ──────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = (user as any)?.userType === 'admin';
  const { data: feed = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/feed"] });
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["/api/campaigns"] });
  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.status === "active" || c.isActive).slice(0, 3);
  const featuredPosts = (feed as any[]).filter((post: any) => post.user?.userType === "admin" || post.user?.role === "admin").slice(0, 3);
  const recentPosts = (feed as any[]).filter((post: any) => !(post.user?.userType === "admin" || post.user?.role === "admin"));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <Badge className="bg-black text-white border-black text-xs mb-3">
                    SocialFi Community
                  </Badge>
                  <h1 className="text-3xl font-black text-gray-950">Influencer Feed</h1>
                  <p className="text-sm text-gray-500 mt-2">Follow official updates, influencer wins, campaign tips, comments, views, and supporter tips in one clean stream.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center min-w-[210px]">
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <div className="font-black text-gray-950" data-testid="text-feed-post-count">{feed.length}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">Posts</div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <div className="font-black text-gray-950" data-testid="text-featured-post-count">{featuredPosts.length}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">Featured</div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <div className="font-black text-gray-950" data-testid="text-feed-view-count">{feed.reduce((sum: number, post: any) => sum + (post.viewCount || 0), 0)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">Views</div>
                  </div>
                </div>
              </div>
            </div>

            {isAuthenticated && <CreatePost userId={(user as any)?.id} />}

            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
                <Gift className="w-5 h-5 text-purple-500 flex-shrink-0" />
                <p className="text-sm text-gray-600 flex-1">
                  <Link href="/login" className="text-purple-600 font-semibold hover:underline">Log in</Link> to like, comment, and support influencers with the available checkout methods.
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
              <>
                {featuredPosts.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <h2 className="text-lg font-black text-gray-950">Featured by Taskdrip</h2>
                      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Official</Badge>
                    </div>
                    {featuredPosts.map((post: any) => (
                      <PostCard key={post.id} post={post} currentUserId={(user as any)?.id} isAdmin={isAdmin} />
                    ))}
                  </section>
                )}

                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1 pt-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    <h2 className="text-lg font-black text-gray-950">Recent Posts</h2>
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Like · Comment · Tip</Badge>
                  </div>
                  {recentPosts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                      <p className="text-gray-500 text-sm">Influencer posts will appear here after the community starts sharing.</p>
                    </div>
                  ) : (
                    recentPosts.map((post: any) => (
                      <PostCard key={post.id} post={post} currentUserId={(user as any)?.id} isAdmin={isAdmin} />
                    ))
                  )}
                </section>
              </>
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
                    {(() => {
                      const tier = getTierConfig(getTierFromFollowers((user as any)?.totalFollowers || 0));
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
              <h3 className="font-bold text-sm mb-1">Tip with checkout options</h3>
              <p className="text-white/80 text-xs mb-3">
                Support influencers using the available admin-managed methods or direct influencer wallets. Click the gift button on any post.
              </p>
              <div className="flex gap-2 text-xs">
                <span className="bg-white/15 px-2 py-1 rounded-full">Card-ready</span>
                <span className="bg-white/15 px-2 py-1 rounded-full">Crypto</span>
                <span className="bg-white/15 px-2 py-1 rounded-full">Bank</span>
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
