import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart, MessageCircle, Share2, Eye, Clock, Calendar, ArrowLeft,
  Facebook, Twitter, Link2, Send, ChevronDown, ChevronUp,
  Coins, X, Copy, CheckCircle, Wallet, DollarSign, ArrowRight
} from "lucide-react";

const TIP_AMOUNTS = [1, 2, 5, 10, 20, 50];

function TipModal({
  post,
  user,
  onClose,
}: {
  post: any;
  user: any;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"wallet" | "confirm" | "done">("wallet");
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [amount, setAmount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [tipMessage, setTipMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: wallets = [], isLoading: walletsLoading } = useQuery<any[]>({
    queryKey: ["/api/blog/tip-wallet"],
    queryFn: () => fetch("/api/blog/tip-wallet").then(r => r.json()),
  });

  const tipMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/blog/${post.slug}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      setStep("done");
      toast({ title: "Tip submitted!", description: "Thank you for supporting this content!" });
    },
    onError: () => {
      toast({ title: "Failed to submit tip", variant: "destructive" });
    },
  });

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleCopyAddress = () => {
    if (selectedWallet?.walletAddress) {
      navigator.clipboard.writeText(selectedWallet.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Address copied!" });
    }
  };

  const handleSubmitTip = () => {
    if (!selectedWallet || !finalAmount) return;
    tipMutation.mutate({
      amount: finalAmount,
      network: selectedWallet.network,
      txHash: txHash.trim() || undefined,
      walletAddress: selectedWallet.walletAddress,
      message: tipMessage.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Tip this Article</h3>
                <p className="text-white/80 text-xs">Support great content</p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="btn-close-tip-modal"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {["wallet", "confirm", "done"].map((s, i) => (
              <div key={s} className={`flex items-center gap-2 ${i < 2 ? 'flex-1' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step === s ? 'bg-white text-orange-500 border-white' : (["wallet","confirm","done"].indexOf(step) > i ? 'bg-white/40 border-white/50 text-white' : 'bg-white/20 border-white/30 text-white/60')}`}>
                  {["wallet","confirm","done"].indexOf(step) > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${["wallet","confirm","done"].indexOf(step) > i ? 'bg-white' : 'bg-white/30'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: Select wallet & amount */}
          {step === "wallet" && (
            <div className="space-y-4">
              {walletsLoading ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : wallets.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No payment wallets configured yet.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Select Network</label>
                    <div className="grid gap-2">
                      {wallets.map((w: any) => (
                        <button
                          key={w.id}
                          data-testid={`btn-select-wallet-${w.id}`}
                          onClick={() => setSelectedWallet(w)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left ${selectedWallet?.id === w.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${selectedWallet?.id === w.id ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                              {w.currency === "USDT" ? "₮" : w.currency?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{w.currency} — {w.network?.toUpperCase()}</p>
                              <p className="text-xs text-gray-400">{w.walletName}</p>
                            </div>
                          </div>
                          {selectedWallet?.id === w.id && <CheckCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Choose Amount (USDT)</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {TIP_AMOUNTS.map(a => (
                        <button
                          key={a}
                          data-testid={`btn-tip-amount-${a}`}
                          onClick={() => { setAmount(a); setCustomAmount(""); }}
                          className={`py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${amount === a && !customAmount ? 'bg-orange-400 text-white border-orange-400' : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-orange-200'}`}
                        >
                          ${a}
                        </button>
                      ))}
                    </div>
                    <Input
                      data-testid="input-tip-custom-amount"
                      type="number"
                      placeholder="Custom amount..."
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                      className="rounded-xl border-gray-200 focus:border-orange-400"
                      min="0.5"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Message (optional)</label>
                    <Textarea
                      data-testid="input-tip-message"
                      placeholder="Leave a kind note for the author..."
                      value={tipMessage}
                      onChange={(e) => setTipMessage(e.target.value)}
                      className="resize-none rounded-xl border-gray-200 focus:border-orange-400 min-h-[70px]"
                    />
                  </div>

                  <Button
                    data-testid="btn-tip-next"
                    onClick={() => setStep("confirm")}
                    disabled={!selectedWallet || (!amount && !customAmount)}
                    className="w-full bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white rounded-xl font-bold py-3"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Send crypto & confirm */}
          {step === "confirm" && selectedWallet && (
            <div className="space-y-4">
              {/* Amount summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  <span className="text-3xl font-extrabold text-orange-600">{finalAmount}</span>
                  <span className="text-gray-500 font-medium">USDT</span>
                </div>
                <p className="text-xs text-gray-500">{selectedWallet.currency} on {selectedWallet.network?.toUpperCase()} network</p>
              </div>

              {/* Wallet address */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Send to this Address</label>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1 font-medium">{selectedWallet.network?.toUpperCase()} Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-800 break-all flex-1 font-mono leading-relaxed">
                      {selectedWallet.walletAddress}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      data-testid="btn-copy-wallet-address"
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-300 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚠️ Make sure to send on {selectedWallet.network?.toUpperCase()} network only
                </p>
              </div>

              {/* QR code placeholder */}
              {selectedWallet.qrCodePath && (
                <div className="flex justify-center">
                  <img src={selectedWallet.qrCodePath} alt="QR Code" className="w-32 h-32 rounded-xl border border-gray-200" />
                </div>
              )}

              {/* TX hash */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Transaction Hash <span className="text-gray-400 font-normal">(after sending)</span>
                </label>
                <Input
                  data-testid="input-tip-tx-hash"
                  placeholder="Paste your transaction hash here..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="rounded-xl border-gray-200 focus:border-orange-400 font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("wallet")}
                  data-testid="btn-tip-back"
                  className="flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitTip}
                  disabled={tipMutation.isPending || !txHash.trim()}
                  data-testid="btn-tip-submit"
                  className="flex-1 bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white rounded-xl font-bold"
                >
                  {tipMutation.isPending ? "Submitting..." : "Confirm Tip"}
                </Button>
              </div>
              <p className="text-center text-xs text-gray-400">
                Paste your transaction hash so we can verify your tip
              </p>
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-orange-200">
                <Coins className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Thank you!</h3>
                <p className="text-gray-500 text-sm">Your tip has been submitted and will be verified shortly. Your generosity keeps great content coming!</p>
              </div>
              <Button
                onClick={onClose}
                data-testid="btn-tip-close-done"
                className="w-full bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white rounded-xl font-bold"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [shared, setShared] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

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

  const { data: tips = [] } = useQuery<any[]>({
    queryKey: ["/api/blog", slug, "tips"],
    queryFn: () => fetch(`/api/blog/${slug}/tips`).then(r => r.json()),
    enabled: !!slug,
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
        <NavigationFixed />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-3/4" />
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-gray-200 rounded" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post || post.message) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
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
  const confirmedTips = tips.filter((t: any) => t.status === "confirmed" || t.status === "pending");
  const totalTipped = confirmedTips.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {post.metaDescription && (
        <meta name="description" content={post.metaDescription} />
      )}

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <button
          onClick={() => setLocation("/blog")}
          data-testid="btn-back-blog"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Blog</span>
        </button>

        {/* Category & Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {post.category && (
            <Badge
              className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer px-4 py-1 text-sm"
              onClick={() => setLocation(`/blog?category=${post.category}`)}
            >
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
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {(post.viewCount || 0).toLocaleString()} views</span>
            <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {post.likesCount || 0} likes</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {comments.length} comments</span>
          </div>
        </div>

        {/* Featured Image */}
        {post.featuredImage ? (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-72 sm:h-96 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ) : (
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
          style={{ lineHeight: '1.8', fontSize: '1.05rem' }}
        />
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
            data-testid="btn-like-post"
            className={`flex items-center gap-2 rounded-full px-5 transition-all ${liked?.liked ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'hover:border-red-300 hover:text-red-500'}`}
          >
            <Heart className={`h-4 w-4 ${liked?.liked ? 'fill-current' : ''}`} />
            <span>{post.likesCount || 0} {liked?.liked ? 'Liked' : 'Like'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            data-testid="btn-scroll-comments"
            className="flex items-center gap-2 rounded-full px-5 hover:border-blue-300 hover:text-blue-600"
            onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{comments.length} Comments</span>
          </Button>

          {/* Tip button */}
          <Button
            variant="outline"
            size="sm"
            data-testid="btn-tip-post"
            onClick={() => setShowTipModal(true)}
            className="flex items-center gap-2 rounded-full px-5 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 border-orange-200 text-orange-500"
          >
            <Coins className="h-4 w-4" />
            <span>Tip</span>
            {totalTipped > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                ${totalTipped.toFixed(0)}
              </span>
            )}
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleShare("twitter")}
              data-testid="btn-share-twitter">
              <Twitter className="h-4 w-4 text-sky-500" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleShare("facebook")}
              data-testid="btn-share-facebook">
              <Facebook className="h-4 w-4 text-blue-600" />
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full px-4" onClick={() => handleShare()}
              data-testid="btn-share-copy">
              <Link2 className="h-4 w-4" />
              {shared ? "Copied!" : "Share"}
            </Button>
          </div>
        </div>

        {/* Tip supporters strip */}
        {confirmedTips.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="h-5 w-5 text-orange-500" />
              <h4 className="font-bold text-gray-900">Supporters ({confirmedTips.length})</h4>
              <span className="text-xs text-orange-600 font-semibold ml-auto">${totalTipped.toFixed(2)} USDT total</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {confirmedTips.slice(0, 8).map((t: any, i: number) => (
                <div key={t.id || i} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-orange-100 shadow-sm text-sm">
                  <span className="text-orange-500 font-bold">${parseFloat(t.amount).toFixed(0)}</span>
                  <span className="text-gray-500 text-xs">{t.displayName || "Anonymous"}</span>
                </div>
              ))}
              {confirmedTips.length > 8 && (
                <div className="flex items-center px-3 py-1.5 text-xs text-gray-400">+{confirmedTips.length - 8} more</div>
              )}
            </div>
          </div>
        )}

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
                data-testid="btn-follow-category"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments ({comments.length})</h2>

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
                    data-testid="input-comment"
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
                      data-testid="btn-post-comment"
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
                <Button
                  variant="ghost"
                  className="w-full text-blue-600 hover:bg-blue-50"
                  data-testid="btn-toggle-comments"
                  onClick={() => setShowAllComments(!showAllComments)}
                >
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

      {/* Tip Modal */}
      {showTipModal && (
        <TipModal post={post} user={user} onClose={() => setShowTipModal(false)} />
      )}
      <Footer />
    </div>
  );
}
