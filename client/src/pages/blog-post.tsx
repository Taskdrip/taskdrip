import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { SharePanel, ShareButton } from "@/components/ui/share-panel";
import { SeoHead } from "@/components/SeoHead";
import { AiPilotCalculator, DeviceUpgradeCalculator } from "@/components/blog/ArticleCalculators";
import { AdsterraSlot } from "@/components/ads/AdsterraSlot";
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
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [shared, setShared] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [adMountNode, setAdMountNode] = useState<HTMLDivElement | null>(null);
  const articleBodyRef = useRef<HTMLDivElement>(null);

  const slug = params?.slug;

  const { data: post, isLoading } = useQuery<any>({
    queryKey: ["/api/blog", slug],
    queryFn: () => fetch(`/api/blog/${slug}`).then(r => r.json()),
    enabled: !!slug,
  });

  useEffect(() => {
    const body = articleBodyRef.current;
    if (!body || !post?.content) return;
    const paragraphs = Array.from(body.querySelectorAll("p"));
    const inlineAdNode = document.createElement("div");
    inlineAdNode.dataset.taskdripInlineAd = "true";
    const smartlinkNode = document.createElement("div");
    smartlinkNode.dataset.asiafilmSmartlinkMount = "middleBody";

    if (paragraphs.length > 0) {
      const inlineAdParagraph = paragraphs[Math.min(2, paragraphs.length - 1)];
      const middleParagraph = paragraphs[Math.floor((paragraphs.length - 1) / 2)];
      inlineAdParagraph.insertAdjacentElement("afterend", inlineAdNode);
      if (middleParagraph === inlineAdParagraph) {
        inlineAdNode.insertAdjacentElement("afterend", smartlinkNode);
      } else {
        middleParagraph.insertAdjacentElement("afterend", smartlinkNode);
      }
    } else {
      body.append(inlineAdNode, smartlinkNode);
    }
    setAdMountNode(inlineAdNode);
    return () => {
      setAdMountNode(null);
      inlineAdNode.remove();
      smartlinkNode.remove();
    };
  }, [post?.content]);

  const { data: relatedPosts = [] } = useQuery<any[]>({
    queryKey: ["/api/blog", slug, "related"],
    queryFn: () => fetch(`/api/blog/${slug}/related`).then(r => r.json()),
    enabled: !!slug && !!post,
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
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      apiRequest("POST", `/api/blog/${slug}/comments`, { content, parentId }),
    onSuccess: () => {
      setCommentText("");
      setReplyTarget(null);
      queryClient.invalidateQueries({ queryKey: ["/api/blog", slug, "comments"] });
      toast({ title: "Comment posted!" });
    },
    onError: (error: any) => toast({ title: "Could not post comment", description: error.message, variant: "destructive" }),
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

  const rootComments = comments.filter((comment: any) => !comment.parentId);
  const displayedComments = showAllComments ? rootComments : rootComments.slice(0, 3);
  const repliesByParent = comments.reduce((groups: Record<string, any[]>, comment: any) => {
    if (comment.parentId) (groups[comment.parentId] ||= []).push(comment);
    return groups;
  }, {});
  const renderComment = (comment: any, depth = 0): any => (
    <div key={comment.id} className={depth ? "ml-5 border-l-2 border-indigo-100 pl-4 sm:ml-8" : ""}>
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={comment.user?.profileImageUrl} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
            {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-gray-50 p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              {[comment.user?.firstName, comment.user?.lastName].filter(Boolean).join(" ") || comment.user?.username || "Taskdrip member"}
            </span>
            <time className="shrink-0 text-xs text-gray-400" dateTime={comment.createdAt}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </time>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{comment.content}</p>
          {user && depth < 3 && (
            <button
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              onClick={() => { setReplyTarget(comment); setCommentText(""); document.getElementById("comment-composer")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Reply
            </button>
          )}
        </div>
      </div>
      {(repliesByParent[comment.id] || []).length > 0 && (
        <div className="mt-4 space-y-4">
          {(repliesByParent[comment.id] || []).map((reply: any) => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );
  const confirmedTips = tips.filter((t: any) => t.status === "confirmed" || t.status === "pending");
  const totalTipped = confirmedTips.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/blog/${encodeURIComponent(post.slug)}`
    : undefined;
  const articleImage = post.featuredImage && typeof window !== "undefined"
    ? new URL(post.featuredImage, window.location.origin).toString()
    : post.featuredImage;
  const articleVideoId = typeof post.content === "string"
    ? post.content.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/)?.[1]
    : undefined;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    inLanguage: "en",
    headline: post.title,
    description: post.metaDescription || post.excerpt || undefined,
    image: articleImage ? [articleImage] : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    author: { "@type": "Organization", name: "Taskdrip" },
    publisher: { "@type": "Organization", name: "Taskdrip", url: "https://taskdrip.online" },
    mainEntityOfPage: canonicalUrl,
    articleSection: post.category || undefined,
    keywords: post.seoKeywords || undefined,
    video: articleVideoId ? {
      "@type": "VideoObject",
      name: `${post.title} — source video`,
      description: post.metaDescription || post.excerpt || post.title,
      thumbnailUrl: [`https://i.ytimg.com/vi/${articleVideoId}/hqdefault.jpg`],
      embedUrl: `https://www.youtube-nocookie.com/embed/${articleVideoId}`,
      contentUrl: `https://www.youtube.com/watch?v=${articleVideoId}`,
    } : undefined,
  };

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      <SeoHead
        title={post.title}
        description={post.metaDescription || post.excerpt || ""}
        keywords={post.seoKeywords || ""}
        ogImage={articleImage}
        ogType="article"
        canonicalUrl={canonicalUrl}
        jsonLd={articleSchema}
      />

      <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Back */}
        <button
          onClick={() => setLocation("/blog")}
          data-testid="btn-back-blog"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Blog</span>
        </button>

        <header className="relative isolate mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white shadow-xl">
          {post.featuredImage && (
            <img
              src={post.featuredImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 z-0 h-full w-full object-cover"
              onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/95 via-indigo-950/85 to-violet-900/70" />
          <div className="relative z-20 p-6 sm:p-10 lg:p-12">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {post.category && (
                <Badge
                  className="cursor-pointer border border-white/25 bg-white/15 px-3 py-1 text-white hover:bg-white/25"
                  onClick={() => setLocation(`/blog?category=${encodeURIComponent(post.category)}`)}
                >
                  {post.category}
                </Badge>
              )}
              {post.tags?.map((tag: string) => (
                <span key={tag} className="rounded-full border border-white/20 px-3 py-1 text-xs text-indigo-100">{tag}</span>
              ))}
            </div>
            <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && <p className="mt-5 max-w-3xl text-base leading-7 text-indigo-100 sm:text-lg">{post.excerpt}</p>}
            <div className="mt-8 flex flex-col gap-5 border-t border-white/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/30">
                  <AvatarFallback className="bg-white/15 font-bold text-white">TD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-white">Taskdrip Team</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-indigo-100">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Recently"}
                    </span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.readingTime || 5} min read</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-indigo-100">
                <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" />{(post.viewCount || 0).toLocaleString()} views</span>
                <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4" />{post.likesCount || 0} likes</span>
                <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4" />{comments.length} comments</span>
              </div>
            </div>
          </div>
        </header>

        <div data-asiafilm-smartlink-mount="afterHeader" />

        <AdsterraSlot position="sidebar" />

        {/* Content */}
        <div
          ref={articleBodyRef}
          data-blog-slug={post.slug}
          className="prose prose-lg prose-gray mx-auto mb-12 max-w-4xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{ lineHeight: "1.8", fontSize: "clamp(1rem, 1.05rem + 0.1vw, 1.12rem)" }}
        />
        {adMountNode && createPortal(<AdsterraSlot position="article-inline" />, adMountNode)}
        {post.slug === "why-phones-laptops-getting-more-expensive-ai-memory-chip-shortage" && (
          <DeviceUpgradeCalculator />
        )}
        {post.slug === "ai-roi-workplace-ai-spending-costs-productivity" && (
          <AiPilotCalculator />
        )}
        <AdsterraSlot position="article-end" />
        <style>{`
          .prose h1, .prose h2, .prose h3, .prose h4 { font-weight: 800; margin-top: 2.5rem; margin-bottom: 1rem; line-height: 1.25; letter-spacing: -0.02em; }
          .prose h1 { font-size: 2rem; color: #111827; }
          .prose h2 { font-size: 1.65rem; color: #1a1a2e; padding-bottom: .6rem; border-bottom: 1px solid #e5e7eb; }
          .prose h3 { font-size: 1.3rem; color: #2d2d44; }
          .prose p { margin-bottom: 1.25rem; color: #374151; }
          .prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
          .prose li { margin-bottom: 0.5rem; color: #374151; }
          .prose strong { font-weight: 700; color: #111827; }
          .prose a { color: #2563eb; text-decoration: underline; }
          .prose blockquote { border-left: 4px solid #6366f1; padding: 1rem 1.25rem; border-radius: 0 .75rem .75rem 0; background: #f5f3ff; font-style: italic; color: #4b5563; }
          .prose code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; }
          .prose img { border-radius: 12px; margin: 1.5rem 0; }
          .prose table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
          .prose th, .prose td { border: 1px solid #e5e7eb; padding: .7rem .85rem; text-align: left; }
          .prose th { background: #f8fafc; font-weight: 700; }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] { overflow-wrap: anywhere; }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] figure {
            margin: 1.75rem 0; overflow: hidden; border: 1px solid #e2e8f0;
            border-radius: 1rem; background: #f8fafc; box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] figure img {
            display: block; width: 100%; height: auto; aspect-ratio: 16 / 9;
            object-fit: cover; margin: 0; border-radius: 0;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] figcaption {
            padding: .8rem 1rem; color: #64748b; font-size: .85rem; line-height: 1.55;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-disclosure,
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-checkpoint {
            margin: 1.5rem 0; padding: 1rem 1.15rem; border-radius: 1rem;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-disclosure {
            border: 1px solid #ddd6fe; background: linear-gradient(135deg, #f5f3ff, #eef2ff);
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-checkpoint {
            border-left: 4px solid #10b981; background: #ecfdf5; color: #064e3b;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-scorecard {
            margin: 1.75rem 0; padding: 1.25rem; border: 1px solid #e2e8f0;
            border-radius: 1rem; background: linear-gradient(145deg, #fff, #f8fafc);
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-scorecard h3 {
            margin-top: 0; color: #1e1b4b;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-scorecard table {
            width: 100%; border-radius: .75rem; background: #fff; font-size: .92rem;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-referral-card {
            margin: 1.5rem 0; padding: 1.15rem; border: 1px solid #c7d2fe;
            border-radius: 1rem; background: linear-gradient(135deg, #eef2ff, #faf5ff);
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-referral-card > p:first-child {
            margin-bottom: .5rem; color: #312e81;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-referral-link {
            display: inline-flex; align-items: center; gap: .4rem; min-height: 2.75rem;
            margin: .3rem 0 .65rem; padding: .65rem 1rem; border-radius: .7rem;
            background: #4f46e5; color: #fff; font-weight: 700; text-decoration: none;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-referral-link:hover {
            background: #3730a3; text-decoration: underline;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-referral-note {
            margin: .4rem 0 0; color: #475569; font-size: .9rem; line-height: 1.6;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-disclosure p:last-child,
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-checkpoint p:last-child { margin-bottom: 0; }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap {
            margin: 1.75rem 0; padding: 1.25rem; border: 1px solid #c7d2fe;
            border-radius: 1.25rem; background: linear-gradient(135deg, #eef2ff, #faf5ff);
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap > p {
            display: flex; flex-wrap: wrap; align-items: baseline; gap: .35rem .75rem; margin-bottom: 1rem;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap > p strong { color: #312e81; }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap > p span { color: #64748b; font-size: .9rem; }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap > div {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: .6rem;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap a {
            display: block; padding: .75rem .85rem; border: 1px solid #e0e7ff;
            border-radius: .75rem; background: rgba(255, 255, 255, .85);
            color: #4338ca; font-size: .9rem; font-weight: 650; line-height: 1.4; text-decoration: none;
            transition: background .15s ease, border-color .15s ease, transform .15s ease;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap a:hover {
            transform: translateY(-1px); border-color: #a5b4fc; background: #fff; text-decoration: underline;
          }
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] h2[id],
          .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] h3[id] { scroll-margin-top: 6rem; }
          @media (max-width: 640px) {
            .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] .strategy-roadmap { padding: 1rem; }
            .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] h2 { font-size: 1.4rem; }
            .prose[data-blog-slug="the-easiest-online-money-strategy-2027-guide"] figure { margin: 1.25rem 0; }
          }
        `}</style>

        {relatedPosts.length > 0 && (
          <section aria-labelledby="related-articles-heading" className="mb-12 border-t border-gray-100 pt-8">
            <h2 id="related-articles-heading" className="text-xl font-bold text-gray-900 mb-4">Related articles</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related: any) => (
                <a
                  key={related.slug}
                  href={`/blog/${encodeURIComponent(related.slug)}`}
                  className="group rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-sm transition"
                >
                  {related.featuredImage && (
                    <img
                      src={related.featuredImage}
                      alt=""
                      loading="lazy"
                      className="w-full h-36 object-cover"
                    />
                  )}
                  <div className="p-4">
                    {related.category && <p className="text-xs text-blue-700 font-semibold mb-2">{related.category}</p>}
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 leading-snug">{related.title}</h3>
                    {related.excerpt && <p className="text-sm text-gray-500 mt-2 line-clamp-3">{related.excerpt}</p>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

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

          <div className="ml-auto" data-testid="btn-share-blog">
            <ShareButton
              title={post?.title || "Check this out on Taskdrip"}
              description={post?.excerpt || post?.metaDescription || ""}
              url={window.location.href}
              image={post?.featuredImage || ""}
            />
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

        {/* Share Panel */}
        <div className="mb-8" data-testid="share-panel-blog">
          <SharePanel
            title={post?.title || "Check this out on Taskdrip"}
            description={post?.excerpt || post?.metaDescription || ""}
            url={window.location.href}
            image={post?.featuredImage || ""}
          />
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
        <section id="comments" className="mx-auto mb-12 max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments ({comments.length})</h2>

          {user ? (
            <div id="comment-composer" className="bg-gray-50 rounded-2xl p-5 mb-8">
              <div className="flex gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={(user as any)?.profileImageUrl} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {replyTarget && (
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                      <span>Replying to {[replyTarget.user?.firstName, replyTarget.user?.lastName].filter(Boolean).join(" ") || "a comment"}</span>
                      <button onClick={() => setReplyTarget(null)} aria-label="Cancel reply" className="rounded p-1 hover:bg-indigo-100"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  <Textarea
                    data-testid="input-comment"
                    placeholder={replyTarget ? "Write a reply..." : "Share your thoughts..."}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={5000}
                    className="resize-none min-h-[80px] bg-white border-gray-200 focus:border-blue-400 rounded-xl"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">{commentText.length}/5000</p>
                  <div className="flex justify-end mt-3">
                    <Button
                      size="sm"
                      onClick={() => commentMutation.mutate({ content: commentText, parentId: replyTarget?.id })}
                      disabled={!commentText.trim() || commentMutation.isPending}
                      data-testid="btn-post-comment"
                      className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {commentMutation.isPending ? "Posting..." : replyTarget ? "Post Reply" : "Post Comment"}
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
              {displayedComments.map((comment: any) => renderComment(comment))}

              {rootComments.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full text-blue-600 hover:bg-blue-50"
                  data-testid="btn-toggle-comments"
                  onClick={() => setShowAllComments(!showAllComments)}
                >
                  {showAllComments ? (
                    <><ChevronUp className="h-4 w-4 mr-2" /> Show Less</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-2" /> Show {rootComments.length - 3} More Comments</>
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
