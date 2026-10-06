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
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queue = useQuery<any[]>({
    queryKey: ["/api/admin/publishing-products"],
    queryFn: () => apiJson("/api/admin/publishing-products"),
  });
  const settings = useQuery<{ platformFeePercent: number }>({
    queryKey: ["/api/admin/publishing-settings"],
    queryFn: () => apiJson("/api/admin/publishing-settings"),
  });
  useEffect(() => {
    if (settings.data) setFeePercent(String(settings.data.platformFeePercent));
  }, [settings.data]);

  const saveFee = useMutation({
    mutationFn: () => apiJson("/api/admin/publishing-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformFeePercent: Number(feePercent) }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/publishing-settings"] });
      toast({ title: "Publishing fee saved" });
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
            <Button onClick={() => saveFee.mutate()} disabled={saveFee.isPending}>{saveFee.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save fee</Button>
            <p className="text-xs text-slate-500">Applied to future verified Taskdrip sales. Payment fees are currently recorded as $0 until the payment provider supplies a fee amount.</p>
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
