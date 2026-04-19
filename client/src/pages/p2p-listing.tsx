import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SecurityWarning } from "@/components/ui/security-warning";
import {
  ArrowLeft, Briefcase, CheckCircle, Coins, ExternalLink,
  Image as ImageIcon, Link2, Lock, Package, ShieldCheck,
  Star, Store, Upload, User, Zap, MessageSquare, X,
} from "lucide-react";
import { Link } from "wouter";

const TYPE_GRADIENTS: Record<string, string> = {
  crypto: "from-orange-900/70 to-yellow-900/50",
  product: "from-blue-900/70 to-cyan-900/50",
  service: "from-purple-900/70 to-pink-900/50",
};

const TYPE_BADGE: Record<string, string> = {
  crypto: "bg-orange-100 text-orange-800",
  product: "bg-blue-100 text-blue-800",
  service: "bg-purple-100 text-purple-800",
};

const TYPE_ICON: Record<string, any> = {
  crypto: Coins,
  product: Package,
  service: Briefcase,
};

function money(v: any) {
  return Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TaskAddonSubmitModal({
  listingId,
  taskIndex,
  taskDescription,
  onClose,
}: {
  listingId: string;
  taskIndex: number;
  taskDescription: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [proofType, setProofType] = useState<"link" | "screenshot" | "both">("link");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const submitProof = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("taskIndex", String(taskIndex));
      fd.append("proofType", proofType);
      fd.append("taskDescription", taskDescription);
      if (proofUrl.trim()) fd.append("proofUrl", proofUrl.trim());
      if (proofNote.trim()) fd.append("proofNote", proofNote.trim());
      if (proofFile) fd.append("proofScreenshot", proofFile);
      const res = await fetch(`/api/p2p/listings/${listingId}/task-addon-submissions`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.securityViolation) throw new Error("Security violation: " + err.message);
        throw new Error(err.message || "Failed to submit proof");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Proof submitted!", description: "The seller will review your submission." });
      queryClient.invalidateQueries({ queryKey: ["/api/my/task-addon-submissions"] });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const canSubmit = proofUrl.trim() || proofFile;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" data-testid="modal-task-proof">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Submit Task Proof</h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{taskDescription}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" data-testid="close-proof-modal"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Proof type</Label>
            <div className="flex gap-2">
              {(["link", "screenshot", "both"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setProofType(t)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold capitalize transition-colors ${proofType === t ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  data-testid={`btn-proof-type-${t}`}
                >
                  {t === "link" ? "🔗 Link" : t === "screenshot" ? "🖼 Screenshot" : "Both"}
                </button>
              ))}
            </div>
          </div>

          {(proofType === "link" || proofType === "both") && (
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Proof URL</Label>
              <input
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                placeholder="https://instagram.com/p/... or post link"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                data-testid="input-proof-url"
              />
              <SecurityWarning value={proofUrl} />
            </div>
          )}

          {(proofType === "screenshot" || proofType === "both") && (
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Screenshot</Label>
              <div
                className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center cursor-pointer hover:border-violet-400 transition-colors"
                onClick={() => document.getElementById("proof-file-upload")?.click()}
                data-testid="upload-proof-screenshot"
              >
                {proofFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">{proofFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Click to upload screenshot</span>
                    <span className="text-xs">JPG, PNG, GIF accepted</span>
                  </div>
                )}
              </div>
              <input id="proof-file-upload" type="file" accept="image/*" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
            </div>
          )}

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Additional note (optional)</Label>
            <textarea
              value={proofNote}
              onChange={e => setProofNote(e.target.value)}
              rows={2}
              placeholder="Any details about how you completed the task..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              data-testid="input-proof-note"
            />
            <SecurityWarning value={proofNote} />
          </div>

          <Button
            className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700"
            onClick={() => submitProof.mutate()}
            disabled={submitProof.isPending || !canSubmit}
            data-testid="button-submit-proof"
          >
            {submitProof.isPending ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />Submitting...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" />Submit Proof</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function P2PListing() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [submittingTaskIndex, setSubmittingTaskIndex] = useState<number | null>(null);

  const { data: listing, isLoading } = useQuery<any>({
    queryKey: [`/api/p2p/listings/${id}`],
  });

  const { data: mySubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/my/task-addon-submissions"],
    enabled: isAuthenticated,
  });

  const acceptOffer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/p2p/listings/${id}/accept`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to accept offer");
      return res.json();
    },
    onSuccess: (tx: any) => {
      toast({ title: "Private Deal Room created!", description: "You've entered a secure escrow deal." });
      setLocation(`/p2p-deals/${tx.id}`);
    },
    onError: (e: Error) => toast({ title: "Could not accept offer", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading listing...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Store className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Listing not found</h2>
          <p className="text-gray-500 mb-6">This listing may have been removed or expired.</p>
          <Link href="/p2p-hub"><Button>Browse P2P Market</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const TypeIcon = TYPE_ICON[listing.listingType] || Store;
  const isOwner = (user as any)?.id === listing.sellerId;
  const isExpired = listing.status === "expired";
  const isAvailable = listing.status === "approved";
  const taskAddons: any[] = Array.isArray(listing.taskAddons) ? listing.taskAddons : [];
  const hasTaskAddons = taskAddons.length > 0 && listing.tdripPointsPerParticipant > 0;

  const getTaskSubmission = (index: number) =>
    (mySubmissions as any[]).find((s: any) => s.listingId === id && s.taskIndex === index);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <section className="relative h-72 overflow-hidden">
        {listing.featuredImage ? (
          <img src={listing.featuredImage} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`h-full bg-gradient-to-br ${TYPE_GRADIENTS[listing.listingType] || "from-gray-800 to-gray-900"} flex items-center justify-center`}>
            <TypeIcon className="w-24 h-24 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-4xl mx-auto">
          <Link href="/p2p-hub">
            <Button variant="outline" size="sm" className="mb-3 border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Market
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`text-xs font-bold uppercase tracking-wide ${TYPE_BADGE[listing.listingType] || "bg-gray-100 text-gray-800"}`}>
              {listing.listingType}
            </Badge>
            {listing.isFeatured && <Badge className="bg-yellow-400/90 text-yellow-900 text-xs font-bold">⭐ Featured</Badge>}
            {isExpired && <Badge className="bg-red-100 text-red-700 text-xs font-bold">Expired</Badge>}
          </div>
          <h1 className="text-3xl font-black text-white mt-2 leading-tight" data-testid="text-listing-title">{listing.title}</h1>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">About this listing</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line" data-testid="text-listing-description">{listing.description}</p>
              </CardContent>
            </Card>

            {hasTaskAddons && (
              <Card className="border-2 border-violet-100 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-violet-600" /> $TDRIP Task Addons
                    </h3>
                    <Badge className="bg-violet-600 text-white font-bold">
                      +{listing.tdripPointsPerParticipant} $TDRIP each
                    </Badge>
                  </div>
                  <p className="text-sm text-violet-700 mb-4">Complete these tasks to earn $TDRIP points. Submit proof after completing each task.</p>
                  <div className="space-y-3">
                    {taskAddons.map((addon: any, i: number) => {
                      const sub = getTaskSubmission(i);
                      const isDone = sub?.status === "approved";
                      const isPending = sub?.status === "pending";
                      return (
                        <div
                          key={i}
                          className={`rounded-xl border-2 p-4 transition-all ${isDone ? "border-green-200 bg-green-50/60" : isPending ? "border-yellow-200 bg-yellow-50/60" : "border-violet-200 bg-white"}`}
                          data-testid={`card-task-addon-${i}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-sm ${isDone ? "bg-green-600 text-white" : isPending ? "bg-yellow-500 text-white" : "bg-violet-600 text-white"}`}>
                              {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              {addon.platform && (
                                <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full mr-2">{addon.platform}</span>
                              )}
                              <p className="text-sm font-semibold text-gray-800 mt-1">{addon.task}</p>
                              {isPending && <p className="text-xs text-yellow-700 font-medium mt-1">⏳ Proof submitted — awaiting review</p>}
                              {isDone && <p className="text-xs text-green-700 font-medium mt-1">✅ Approved — points awarded!</p>}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {addon.actionLink && (
                                  <a
                                    href={addon.actionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors"
                                    data-testid={`button-task-action-link-${i}`}
                                  >
                                    <ExternalLink className="w-3 h-3" /> Do This Task
                                  </a>
                                )}
                                {isAuthenticated && !isOwner && !isDone && !isPending && isAvailable && (
                                  <button
                                    onClick={() => setSubmittingTaskIndex(i)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold border-2 border-violet-400 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
                                    data-testid={`button-submit-task-proof-${i}`}
                                  >
                                    <Upload className="w-3 h-3" /> Submit Proof
                                  </button>
                                )}
                                {!isAuthenticated && (
                                  <Link href="/login">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:underline cursor-pointer">
                                      <Lock className="w-3 h-3" /> Login to earn $TDRIP
                                    </span>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {listing.tdripParticipantLimit > 0 && (
                    <p className="text-xs text-violet-600 mt-3 text-center">
                      Limited to {listing.tdripParticipantLimit} participants · 100 $TDRIP = $1 USDT
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" /> How this trade is protected
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Lock, title: "Escrow Protection", desc: "Funds held by admin until delivery confirmed" },
                    { icon: MessageSquare, title: "Private Deal Room", desc: "Secure chat visible only to buyer, seller & admin" },
                    { icon: CheckCircle, title: "Dispute Resolution", desc: "Admin mediates any disputes fairly" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex flex-col items-center text-center gap-2">
                      <Icon className="w-8 h-8 text-purple-500" />
                      <p className="font-semibold text-sm text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Seller</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                    {(listing.seller?.username || listing.seller?.firstName || "S")[0].toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/profile/${listing.seller?.id}`}>
                      <p className="font-bold text-gray-900 text-lg hover:underline cursor-pointer">
                        {listing.seller?.username || `${listing.seller?.firstName || "Seller"} ${listing.seller?.lastName || ""}`.trim()}
                      </p>
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-yellow-700">{Number(listing.seller?.rating || 4.8).toFixed(1)}</span>
                      <span className="text-sm text-gray-400 ml-1">· Verified seller</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="border-0 shadow-md sticky top-24">
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Price</p>
                  <p className="text-4xl font-black text-gray-900" data-testid="text-listing-price">${money(listing.price)}</p>
                  <p className="text-sm text-gray-500 mt-0.5">via {listing.paymentMethod}</p>
                </div>

                {isExpired ? (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                    <p className="text-red-700 font-semibold text-sm">This listing has expired</p>
                    <p className="text-red-500 text-xs mt-1">The seller or admin can reactivate it.</p>
                  </div>
                ) : !isAvailable ? (
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-center">
                    <p className="text-yellow-700 font-semibold text-sm">Listing pending approval</p>
                    <p className="text-yellow-500 text-xs mt-1">This listing is awaiting admin review.</p>
                  </div>
                ) : isOwner ? (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
                    <p className="text-blue-700 font-semibold text-sm">This is your listing</p>
                    <p className="text-blue-500 text-xs mt-1">You cannot accept your own offer.</p>
                  </div>
                ) : !isAuthenticated ? (
                  <Link href="/login">
                    <Button className="w-full rounded-xl font-bold py-6 text-base bg-gray-900 hover:bg-gray-700" data-testid="button-login-to-deal">
                      <Lock className="w-4 h-4 mr-2" /> Login to Start Deal
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full rounded-xl font-bold py-6 text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
                    onClick={() => acceptOffer.mutate()}
                    disabled={acceptOffer.isPending}
                    data-testid="button-accept-offer"
                  >
                    {acceptOffer.isPending ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />Creating Deal Room...</>
                    ) : (
                      <><Zap className="w-5 h-5 mr-2" />Accept & Enter Deal Room</>
                    )}
                  </Button>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {[
                    { icon: ShieldCheck, text: "Admin-controlled escrow" },
                    { icon: Lock, text: "Private deal room chat" },
                    { icon: CheckCircle, text: "Dispute protection" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
                      <Icon className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>

                {hasTaskAddons && (
                  <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                    <p className="text-xs font-bold text-violet-800 mb-1">🎯 Task Add-ons Available</p>
                    <p className="text-xs text-violet-600">Complete {taskAddons.length} task{taskAddons.length > 1 ? "s" : ""} and earn <strong>{listing.tdripPointsPerParticipant} $TDRIP</strong> per task.</p>
                  </div>
                )}

                <Link href="/p2p-hub">
                  <Button variant="outline" className="w-full rounded-xl" data-testid="button-browse-more">
                    Browse More Listings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {submittingTaskIndex !== null && (
        <TaskAddonSubmitModal
          listingId={id!}
          taskIndex={submittingTaskIndex}
          taskDescription={taskAddons[submittingTaskIndex]?.task || ""}
          onClose={() => setSubmittingTaskIndex(null)}
        />
      )}
    </div>
  );
}
