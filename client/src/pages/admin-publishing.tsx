import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Banknote, BookOpen, CheckCircle2, Loader2, Plus, Save, ShieldCheck, Trash2, Wallet, XCircle } from "lucide-react";
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
  const [paymentOptions, setPaymentOptions] = useState<{ cryptoWallets: any[]; bankAccounts: any[] }>({ cryptoWallets: [], bankAccounts: [] });
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState("30");
  const [passwordSubscriber, setPasswordSubscriber] = useState<any>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
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
  const paymentOptionsQuery = useQuery<{ cryptoWallets: any[]; bankAccounts: any[] }>({
    queryKey: ["/api/admin/creator-studio/payment-options"],
    queryFn: () => apiJson("/api/admin/creator-studio/payment-options"),
  });
  useEffect(() => {
    if (settings.data) {
      setFeePercent(String(settings.data.platformFeePercent));
      setStudioMonthlyPrice(String(settings.data.studioMonthlyPrice));
    }
  }, [settings.data]);
  useEffect(() => {
    if (paymentOptionsQuery.data) setPaymentOptions(paymentOptionsQuery.data);
  }, [paymentOptionsQuery.data]);

  const savePaymentOptions = useMutation({
    mutationFn: () => apiJson("/api/admin/creator-studio/payment-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentOptions),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator-studio/payment-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creator-studio/payment-options"] });
      toast({ title: "Subscription payment instructions saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save payment instructions", description: error.message, variant: "destructive" }),
  });

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
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" | "revoke" | "extend" }) => apiJson(`/api/admin/creator-studio/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote: notes[id] || "" }),
    }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator-studio/subscriptions"] });
      toast({
        title: variables.action === "approve"
          ? "Creator Studio access approved"
          : variables.action === "extend"
            ? "Creator Studio access extended"
            : variables.action === "reject" ? "Payment rejected" : "Creator Studio access revoked",
      });
    },
    onError: (error: Error) => toast({ title: "Subscription review failed", description: error.message, variant: "destructive" }),
  });

  const grantAccess = useMutation({
    mutationFn: () => apiJson("/api/admin/creator-studio/subscriptions/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail, periodDays: Number(grantDays) }),
    }),
    onSuccess: () => {
      setGrantEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creator-studio/subscriptions"] });
      toast({ title: "Creator Studio access granted" });
    },
    onError: (error: Error) => toast({ title: "Could not grant access", description: error.message, variant: "destructive" }),
  });

  const resetSubscriberPassword = useMutation({
    mutationFn: () => apiJson(`/api/admin/creator-studio/subscribers/${passwordSubscriber.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: temporaryPassword }),
    }),
    onSuccess: () => {
      setPasswordSubscriber(null);
      setTemporaryPassword("");
      toast({ title: "Subscriber password reset", description: "Share the temporary password with the creator through a secure channel." });
    },
    onError: (error: Error) => toast({ title: "Password reset failed", description: error.message, variant: "destructive" }),
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-violet-700" />Creator Studio subscription payment methods</CardTitle>
            <p className="text-sm text-slate-500">Enabled destinations are shown to creators at checkout. They are public payment instructions, not wallet keys.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" />Crypto wallets</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => setPaymentOptions((current) => ({
                  ...current,
                  cryptoWallets: [...current.cryptoWallets, { id: crypto.randomUUID(), name: "", asset: "USDT", network: "", address: "", instructions: "", enabled: true }],
                }))}><Plus className="mr-1 h-4 w-4" />Add wallet</Button>
              </div>
              {paymentOptions.cryptoWallets.map((wallet, index) => (
                <div key={wallet.id || index} className="rounded-xl border bg-slate-50 p-4 space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div><Label>Label</Label><Input value={wallet.name} placeholder="USDT (TRC-20)" onChange={(e) => setPaymentOptions((current) => ({ ...current, cryptoWallets: current.cryptoWallets.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} /></div>
                    <div><Label>Asset</Label><Input value={wallet.asset} placeholder="USDT" onChange={(e) => setPaymentOptions((current) => ({ ...current, cryptoWallets: current.cryptoWallets.map((item, i) => i === index ? { ...item, asset: e.target.value } : item) }))} /></div>
                    <div><Label>Network</Label><Input value={wallet.network} placeholder="Tron (TRC-20)" onChange={(e) => setPaymentOptions((current) => ({ ...current, cryptoWallets: current.cryptoWallets.map((item, i) => i === index ? { ...item, network: e.target.value } : item) }))} /></div>
                  </div>
                  <div><Label>Public receiving address</Label><Input value={wallet.address} placeholder="Wallet address for subscription payments" onChange={(e) => setPaymentOptions((current) => ({ ...current, cryptoWallets: current.cryptoWallets.map((item, i) => i === index ? { ...item, address: e.target.value } : item) }))} /></div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[220px]"><Label>Payment instructions (optional)</Label><Input value={wallet.instructions || ""} placeholder="Include the transaction hash with your payment proof." onChange={(e) => setPaymentOptions((current) => ({ ...current, cryptoWallets: current.cryptoWallets.map((item, i) => i === index ? { ...item, instructions: e.target.value } : item) }))} /></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wallet.enabled !== false} onChange={(e) => setPaymentOptions((current) => ({ ...current, cryptoWallets: current.cryptoWallets.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item) }))} />Visible to creators</label>
                    <Button type="button" size="icon" variant="ghost" aria-label="Remove wallet" onClick={() => setPaymentOptions((current) => ({ ...current, cryptoWallets: current.cryptoWallets.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              ))}
              {!paymentOptions.cryptoWallets.length && <p className="text-sm text-slate-500">No crypto wallets configured.</p>}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold flex items-center gap-2"><Banknote className="h-4 w-4" />Bank transfer accounts</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => setPaymentOptions((current) => ({
                  ...current,
                  bankAccounts: [...current.bankAccounts, { id: crypto.randomUUID(), bankName: "", accountName: "", accountNumber: "", currency: "USD", instructions: "", enabled: true }],
                }))}><Plus className="mr-1 h-4 w-4" />Add bank account</Button>
              </div>
              {paymentOptions.bankAccounts.map((account, index) => (
                <div key={account.id || index} className="rounded-xl border bg-slate-50 p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><Label>Bank name</Label><Input value={account.bankName} onChange={(e) => setPaymentOptions((current) => ({ ...current, bankAccounts: current.bankAccounts.map((item, i) => i === index ? { ...item, bankName: e.target.value } : item) }))} /></div>
                    <div><Label>Account name</Label><Input value={account.accountName} onChange={(e) => setPaymentOptions((current) => ({ ...current, bankAccounts: current.bankAccounts.map((item, i) => i === index ? { ...item, accountName: e.target.value } : item) }))} /></div>
                    <div><Label>Account number / IBAN</Label><Input value={account.accountNumber} onChange={(e) => setPaymentOptions((current) => ({ ...current, bankAccounts: current.bankAccounts.map((item, i) => i === index ? { ...item, accountNumber: e.target.value } : item) }))} /></div>
                    <div><Label>Currency</Label><Input value={account.currency} placeholder="USD" onChange={(e) => setPaymentOptions((current) => ({ ...current, bankAccounts: current.bankAccounts.map((item, i) => i === index ? { ...item, currency: e.target.value } : item) }))} /></div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[220px]"><Label>Transfer instructions (optional)</Label><Input value={account.instructions || ""} onChange={(e) => setPaymentOptions((current) => ({ ...current, bankAccounts: current.bankAccounts.map((item, i) => i === index ? { ...item, instructions: e.target.value } : item) }))} /></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={account.enabled !== false} onChange={(e) => setPaymentOptions((current) => ({ ...current, bankAccounts: current.bankAccounts.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item) }))} />Visible to creators</label>
                    <Button type="button" size="icon" variant="ghost" aria-label="Remove bank account" onClick={() => setPaymentOptions((current) => ({ ...current, bankAccounts: current.bankAccounts.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              ))}
              {!paymentOptions.bankAccounts.length && <p className="text-sm text-slate-500">No bank accounts configured.</p>}
            </section>
            <Button onClick={() => savePaymentOptions.mutate()} disabled={savePaymentOptions.isPending}>
              {savePaymentOptions.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save payment destinations
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Creator Studio subscriptions & subscribers</CardTitle>
            <div className="mt-3 grid sm:grid-cols-[1fr_130px_auto] gap-2">
              <Input type="email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="Creator email to grant access" />
              <Input type="number" min="1" max="365" value={grantDays} onChange={(e) => setGrantDays(e.target.value)} aria-label="Access days" />
              <Button onClick={() => grantAccess.mutate()} disabled={grantAccess.isPending || !grantEmail.trim()}>
                {grantAccess.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Grant access
              </Button>
            </div>
            <p className="text-xs text-slate-500">Manual access grants are recorded as $0 admin grants. Automatic renewal reminders are sent by in-app notification and email when a subscriber is within 3 days of expiry.</p>
          </CardHeader>
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
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => reviewSubscription.mutate({ id: subscription.id, action: "extend" })} disabled={reviewSubscription.isPending}>Extend {subscription.periodDays || 30} days</Button>
                      <Button size="sm" variant="outline" onClick={() => { setPasswordSubscriber(subscription.user); setTemporaryPassword(""); }}>Reset password</Button>
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (window.confirm("Revoke this creator’s active Creator Studio access now?")) {
                          reviewSubscription.mutate({ id: subscription.id, action: "revoke" });
                        }
                      }} disabled={reviewSubscription.isPending}>Revoke access</Button>
                    </div>
                  )}
                  {subscription.status !== "active" && subscription.user?.id && (
                    <Button size="sm" variant="outline" onClick={() => { setPasswordSubscriber(subscription.user); setTemporaryPassword(""); }}>Reset password</Button>
                  )}
                </div>
                {passwordSubscriber?.id === subscription.user?.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex-1 min-w-[220px]">
                      <Label htmlFor={`temporary-password-${subscription.id}`}>Temporary password (at least 12 characters)</Label>
                      <Input id={`temporary-password-${subscription.id}`} type="password" autoComplete="new-password" value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} />
                    </div>
                    <Button size="sm" onClick={() => resetSubscriberPassword.mutate()} disabled={resetSubscriberPassword.isPending || temporaryPassword.length < 12}>
                      {resetSubscriberPassword.isPending ? "Resetting…" : "Set password"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPasswordSubscriber(null); setTemporaryPassword(""); }}>Cancel</Button>
                    <p className="w-full text-xs text-amber-800">The password is not sent or shown again after saving. Share it with the creator through a secure channel.</p>
                  </div>
                )}
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
