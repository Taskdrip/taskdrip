import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Save, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

async function apiJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Request failed.");
  }
  return response.json();
}

export default function AdminPublishingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [feePercent, setFeePercent] = useState("10");
  const [studioMonthlyPrice, setStudioMonthlyPrice] = useState("7");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queue = useQuery<any[]>({
    queryKey: ["/api/admin/publishing-products"],
    queryFn: () => apiJson("/api/admin/publishing-products"),
  });
  const subscriptions = useQuery<any[]>({
    queryKey: ["/api/admin/creator-studio/subscriptions"],
    queryFn: () => apiJson("/api/admin/creator-studio/subscriptions"),
  });
  const settings = useQuery<{ platformFeePercent: number; studioMonthlyPrice: number }>({
    queryKey: ["/api/admin/publishing-settings"],
    queryFn: () => apiJson("/api/admin/publishing-settings"),
  });
  useEffect(() => {
    if (settings.data) {
      setFeePercent(String(settings.data.platformFeePercent));
      setStudioMonthlyPrice(String(settings.data.studioMonthlyPrice));
    }
  }, [settings.data]);

  const saveFee = useMutation({
    mutationFn: () => apiJson("/api/admin/publishing-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformFeePercent: Number(feePercent),
        studioMonthlyPrice: Number(studioMonthlyPrice),
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/publishing-settings"] });
      toast({ title: "Publishing settings saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save fee", description: error.message, variant: "destructive" }),
  });

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) => apiJson(`/api/admin/publishing-products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote: notes[id] || "" }),
    }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/publishing-products"] });
      toast({ title: variables.action === "approve" ? "Product approved and published" : "Changes requested" });
    },
    onError: (error: Error) => toast({ title: "Review could not be saved", description: error.message, variant: "destructive" }),
  });

  const reviewSubscription = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" | "revoke" }) => apiJson(`/api/admin/creator-studio/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote: notes[id] || "" }),
    }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator-studio/subscriptions"] });
      toast({
        title: variables.action === "approve" ? "Creator Studio access approved" : variables.action === "reject" ? "Payment rejected" : "Creator Studio access revoked",
      });
    },
    onError: (error: Error) => toast({ title: "Subscription review failed", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon" aria-label="Back to admin"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div><p className="text-xs uppercase tracking-wider text-violet-600 font-bold">Admin Publishing</p><h1 className="text-xl font-bold">Publishing review queue</h1></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 space-y-5">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-700" />Publishing settings</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="w-48"><Label htmlFor="publishing-fee">Platform fee (%)</Label><Input id="publishing-fee" type="number" min="0" max="100" step="0.1" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} /></div>
            <div className="w-52"><Label htmlFor="studio-monthly-price">Creator Studio monthly fee (USD)</Label><Input id="studio-monthly-price" type="number" min="0" max="999999" step="0.01" value={studioMonthlyPrice} onChange={(e) => setStudioMonthlyPrice(e.target.value)} /></div>
            <Button onClick={() => saveFee.mutate()} disabled={saveFee.isPending}>{saveFee.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save settings</Button>
            <p className="w-full text-xs text-slate-500">The platform fee applies to future verified Taskdrip sales. Studio access starts after payment review and runs for 30 days. Payment processing fees are recorded as $0 until supplied by a provider.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Creator Studio subscriptions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {subscriptions.isLoading ? <p className="text-sm text-slate-500">Loading subscription payments…</p> : subscriptions.error ? (
              <p className="text-sm text-red-700">{(subscriptions.error as Error).message}</p>
            ) : subscriptions.data?.length ? subscriptions.data.map((subscription) => (
              <div key={subscription.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{subscription.user?.firstName} {subscription.user?.lastName}</h2>
                      <Badge variant="outline">{subscription.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{subscription.user?.email || "Creator"} · ${Number(subscription.amount).toFixed(2)} {subscription.currency} · {subscription.paymentMethodLabel || subscription.network || "Manual payment"}</p>
                    {subscription.transactionHash && <p className="mt-1 break-all text-xs text-slate-500">Reference: {subscription.transactionHash}</p>}
                    {subscription.createdAt && <p className="mt-1 text-xs text-slate-500">Submitted {new Date(subscription.createdAt).toLocaleString()}</p>}
                    {subscription.endDate && <p className="mt-1 text-xs text-slate-500">Access until {new Date(subscription.endDate).toLocaleDateString()}</p>}
                    {subscription.reviewNote && <p className="mt-2 rounded bg-rose-50 p-2 text-sm text-rose-800">{subscription.reviewNote}</p>}
                    {subscription.proofUrl && <a className="mt-2 inline-block text-sm font-medium text-violet-700 underline" href={subscription.proofUrl} target="_blank" rel="noreferrer">View private payment proof</a>}
                  </div>
                  {subscription.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewSubscription.mutate({ id: subscription.id, action: "approve" })} disabled={reviewSubscription.isPending}><CheckCircle2 className="mr-1 h-4 w-4" />Approve 30 days</Button>
                      <Button size="sm" variant="destructive" onClick={() => reviewSubscription.mutate({ id: subscription.id, action: "reject" })} disabled={reviewSubscription.isPending || !notes[subscription.id]?.trim()}><XCircle className="mr-1 h-4 w-4" />Reject</Button>
                    </div>
                  )}
                  {subscription.status === "active" && (
                    <Button size="sm" variant="destructive" onClick={() => {
                      if (window.confirm("Revoke this creator’s active Creator Studio access now?")) {
                        reviewSubscription.mutate({ id: subscription.id, action: "revoke" });
                      }
                    }} disabled={reviewSubscription.isPending}>Revoke access</Button>
                  )}
                </div>
                {subscription.status === "pending" && (
                  <div className="mt-3">
                    <Label htmlFor={`subscription-note-${subscription.id}`}>Review note (required to reject)</Label>
                    <Textarea id={`subscription-note-${subscription.id}`} rows={2} value={notes[subscription.id] || ""} onChange={(e) => setNotes({ ...notes, [subscription.id]: e.target.value })} placeholder="Explain why the payment could not be verified." />
                  </div>
                )}
              </div>
            )) : <p className="text-sm text-slate-500">No Creator Studio subscription payments have been submitted.</p>}
          </CardContent>
        </Card>

        {queue.isLoading ? <div className="text-center text-slate-500 py-12">Loading submissions…</div> : queue.error ? (
          <Card><CardContent className="py-12 text-center text-red-700">{(queue.error as Error).message}</CardContent></Card>
        ) : queue.data?.length ? (
          <div className="space-y-4">
            {queue.data.map((product) => (
              <Card key={product.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="w-full md:w-44 shrink-0 aspect-[4/3] rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                      {product.coverImage ? <img src={product.coverImage} alt={product.title} className="w-full h-full object-cover" /> : <BookOpen className="h-12 w-12 text-slate-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-lg">{product.title}</h2><Badge variant="outline">{product.productType}</Badge><Badge className="bg-amber-100 text-amber-800">Pending review</Badge></div>
                      <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{product.description}</p>
                      <div className="text-sm text-slate-500 mt-3">Category: {product.category} · Price: ${Number(product.price).toFixed(2)} · File: {product.originalFileName || "Not available"}</div>
                      <div className="text-sm text-slate-500 mt-1">Creator: {product.creator?.firstName} {product.creator?.lastName} {product.creator?.email ? `· ${product.creator.email}` : ""}</div>
                      {product.amazonUrl && <a className="text-sm text-violet-700 underline inline-block mt-2" href={product.amazonUrl} target="_blank" rel="noreferrer">Check Amazon listing</a>}
                      {product.book?.chapters?.length > 0 && (
                        <details className="mt-3 text-sm">
                          <summary className="cursor-pointer font-medium">Book manuscript preview ({product.book.chapters.length} chapters)</summary>
                          <div className="mt-2 max-h-72 overflow-y-auto space-y-3 rounded-lg bg-slate-50 p-3">
                            {product.book.chapters.map((chapter: any) => <section key={chapter.id}><h3 className="font-semibold">{chapter.title}</h3><p className="whitespace-pre-wrap text-slate-600 line-clamp-6">{chapter.content}</p></section>)}
                          </div>
                        </details>
                      )}
                      <div className="mt-4">
                        <Label htmlFor={`review-note-${product.id}`}>Review note (required when rejecting)</Label>
                        <Textarea id={`review-note-${product.id}`} rows={2} value={notes[product.id] || ""} onChange={(e) => setNotes({ ...notes, [product.id]: e.target.value })} placeholder="Explain any changes the creator should make." />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button onClick={() => review.mutate({ id: product.id, action: "approve" })} disabled={review.isPending}><CheckCircle2 className="h-4 w-4 mr-2" />Approve and publish</Button>
                        <Button variant="destructive" onClick={() => review.mutate({ id: product.id, action: "reject" })} disabled={review.isPending || !notes[product.id]?.trim()}><XCircle className="h-4 w-4 mr-2" />Request changes</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <Card><CardContent className="py-16 text-center text-slate-500">No products are waiting for review.</CardContent></Card>}
      </main>
    </div>
  );
}
