import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { KDP_BOOK_TYPES, KDP_GENRES, KDP_TRIM_SIZES, downloadKdpManuscript } from "@/lib/kdp-manuscript";
import { ArrowDownToLine, ArrowLeft, Banknote, BookOpen, Check, Copy, CreditCard, ExternalLink, FileText, Loader2, LockKeyhole, Plus, Sparkles, Store, Trash2, Wallet, Wand2 } from "lucide-react";

type Chapter = { id: string; title: string; content: string };
type Book = {
  id: string;
  title: string;
  subtitle?: string | null;
  bookType?: string;
  genre?: string;
  trimSize?: string;
  idea?: string | null;
  description?: string | null;
  coverImage?: string | null;
  outline?: string[];
  chapters?: Chapter[];
  amazonUrl?: string | null;
  accessUrl?: string | null;
  kdpKeywords?: string[];
  status: string;
};
type Product = {
  id: string;
  title: string;
  description: string;
  productType: string;
  category: string;
  price: string;
  tags: string[];
  version?: string;
  license?: string | null;
  coverImage?: string | null;
  amazonUrl?: string | null;
  accessUrl?: string | null;
  originalFileName?: string | null;
  status: string;
  reviewNote?: string | null;
};
type StudioAccess = {
  hasAccess: boolean;
  monthlyPrice: number;
  currency: string;
  subscriptionStatus: "active" | "pending" | "inactive";
  subscription: { endDate?: string | null; paymentMethodLabel?: string | null } | null;
};
type StudioPaymentOptions = {
  cryptoWallets: Array<{ id: string; name: string; asset: string; network: string; address: string; instructions?: string; enabled: boolean }>;
  bankAccounts: Array<{ id: string; bankName: string; accountName: string; accountNumber: string; currency: string; instructions?: string; enabled: boolean }>;
};

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) {
    let message = "Request failed.";
    try { message = (await response.json()).message || message; } catch { /* Keep generic message. */ }
    throw new Error(message);
  }
  return response.json();
}

const statusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  editing: "bg-blue-100 text-blue-700",
  pending_review: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  published: "bg-emerald-100 text-emerald-700",
  submitted: "bg-amber-100 text-amber-800",
};

export default function CreatorStudioPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [section, setSection] = useState<"overview" | "books" | "products" | "earnings">("overview");
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookPrice, setBookPrice] = useState("9.99");
  const [bookBusy, setBookBusy] = useState(false);
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [chapterBusy, setChapterBusy] = useState<string | null>(null);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null);
  const [writingToolBusy, setWritingToolBusy] = useState("");
  const [writingToolOutput, setWritingToolOutput] = useState("");
  const [writingToolKind, setWritingToolKind] = useState("");
  const [writingToolChapterId, setWritingToolChapterId] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [subscriptionProof, setSubscriptionProof] = useState<File | null>(null);
  const [subscriptionReference, setSubscriptionReference] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [productForm, setProductForm] = useState({
    title: "", description: "", productType: "digital-download", category: "Digital Downloads",
    price: "9.99", tags: "", version: "1.0", license: "", coverImage: "",
  });

  const isStudioAdmin = (user as any)?.userType === "admin"
    || ["admin", "store_manager", "moderator", "content_editor"].includes((user as any)?.role || "");
  const planQuery = useQuery<{ monthlyPrice: number; currency: string }>({
    queryKey: ["/api/creator-studio/plan"],
    queryFn: () => requestJson("/api/creator-studio/plan"),
  });
  const accessQuery = useQuery<StudioAccess>({
    queryKey: ["/api/creator-studio/access"],
    queryFn: () => requestJson("/api/creator-studio/access"),
    enabled: !!user,
  });
  const paymentOptionsQuery = useQuery<StudioPaymentOptions>({
    queryKey: ["/api/creator-studio/payment-options"],
    queryFn: () => requestJson("/api/creator-studio/payment-options"),
    enabled: !!user && !isStudioAdmin && accessQuery.data?.hasAccess === false && accessQuery.data?.subscriptionStatus !== "pending",
  });
  const paymentMethods: any[] = [
    ...(paymentOptionsQuery.data?.cryptoWallets || []).map((wallet) => ({
      id: `crypto:${wallet.id}`,
      type: wallet.asset,
      network: wallet.network,
      label: wallet.name || `${wallet.asset} — ${wallet.network}`,
      address: wallet.address,
      instructions: wallet.instructions,
    })),
    ...(paymentOptionsQuery.data?.bankAccounts || []).map((account) => ({
      id: `bank:${account.id}`,
      type: "bank_transfer",
      network: "bank_transfer",
      label: `${account.bankName} — ${account.currency}`,
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      currency: account.currency,
      instructions: account.instructions,
    })),
  ];
  const selectedPaymentMethod: any = paymentMethods.find((method) => method.id === paymentMethodId) || paymentMethods[0];
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append("network", selectedPaymentMethod?.network || selectedPaymentMethod?.type || "manual");
      body.append("paymentMethodLabel", selectedPaymentMethod?.label || "Manual payment");
      body.append("transactionHash", subscriptionReference);
      if (subscriptionProof) body.append("paymentProof", subscriptionProof);
      return requestJson("/api/creator-studio/subscribe", { method: "POST", body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-studio/access"] });
      setSubscriptionProof(null);
      setSubscriptionReference("");
      toast({ title: "Payment submitted", description: "Creator Studio access will open after admin verification." });
    },
    onError: (error: Error) => toast({ title: "Payment submission failed", description: error.message, variant: "destructive" }),
  });

  const booksQuery = useQuery<Book[]>({
    queryKey: ["/api/creator-studio/books"],
    queryFn: () => requestJson("/api/creator-studio/books"),
    enabled: accessQuery.data?.hasAccess === true,
  });
  const productsQuery = useQuery<Product[]>({
    queryKey: ["/api/creator-studio/products"],
    queryFn: () => requestJson("/api/creator-studio/products"),
    enabled: accessQuery.data?.hasAccess === true,
  });
  const earningsQuery = useQuery<any>({
    queryKey: ["/api/creator-studio/earnings"],
    queryFn: () => requestJson("/api/creator-studio/earnings"),
    enabled: accessQuery.data?.hasAccess === true,
  });
  const books = booksQuery.data || [];
  const products = productsQuery.data || [];
  const earnings = earningsQuery.data;
  const publishedCount = products.filter((item) => item.status === "published").length;
  const pendingCount = products.filter((item) => item.status === "pending_review").length;
  const draftCount = products.filter((item) => ["draft", "editing", "rejected"].includes(item.status)).length;

  const productSave = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      Object.entries(productForm).forEach(([key, value]) => data.append(key, value));
      if (productFile) data.append("productFile", productFile);
      const url = editingProductId
        ? `/api/creator-studio/products/${editingProductId}`
        : "/api/creator-studio/products";
      return requestJson(url, { method: editingProductId ? "PATCH" : "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator-studio/products"] });
      setEditingProductId(null);
      setProductFile(null);
      setProductForm({ title: "", description: "", productType: "digital-download", category: "Digital Downloads", price: "9.99", tags: "", version: "1.0", license: "", coverImage: "" });
      toast({ title: "Product draft saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save product", description: error.message, variant: "destructive" }),
  });

  const refreshProducts = () => queryClient.invalidateQueries({ queryKey: ["/api/creator-studio/products"] });
  const refreshBooks = () => queryClient.invalidateQueries({ queryKey: ["/api/creator-studio/books"] });

  const createBook = async () => {
    try {
      const book = await requestJson("/api/creator-studio/books", { method: "POST" });
      setActiveBook(book);
      setSection("books");
      await refreshBooks();
      toast({ title: "Book draft created" });
    } catch (error: any) {
      toast({ title: "Could not create book", description: error.message, variant: "destructive" });
    }
  };

  const saveBook = async (book = activeBook) => {
    if (!book) return null;
    setBookBusy(true);
    try {
      const saved = await requestJson(`/api/creator-studio/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          subtitle: book.subtitle || "",
          bookType: book.bookType || "nonfiction",
          genre: book.genre || "General nonfiction",
          trimSize: book.trimSize || "6x9",
          idea: book.idea || "",
          description: book.description || "",
          outline: book.outline || [],
          chapters: book.chapters || [],
          kdpKeywords: book.kdpKeywords || [],
          coverImage: book.coverImage || "",
          amazonUrl: book.amazonUrl || "",
          accessUrl: book.accessUrl || "",
        }),
      });
      setActiveBook(saved);
      await refreshBooks();
      return saved as Book;
    } catch (error: any) {
      toast({ title: "Could not save book", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setBookBusy(false);
    }
  };

  const submitBook = async () => {
    if (!activeBook || (!bookFile && !activeBook.amazonUrl && !activeBook.accessUrl)) {
      toast({ title: "Upload a PDF or EPUB, or add an Amazon or reader link first", variant: "destructive" });
      return;
    }
    const saved = await saveBook();
    if (!saved) return;
    const data = new FormData();
    data.append("price", bookPrice);
    if (bookFile) data.append("productFile", bookFile);
    setBookBusy(true);
    try {
      await requestJson(`/api/creator-studio/books/${saved.id}/submit`, { method: "POST", body: data });
      setActiveBook(null);
      setBookFile(null);
      await refreshBooks();
      await refreshProducts();
      toast({ title: "Book submitted for review" });
    } catch (error: any) {
      toast({ title: "Could not submit book", description: error.message, variant: "destructive" });
    } finally {
      setBookBusy(false);
    }
  };

  const generateOutline = async () => {
    if (!activeBook?.idea?.trim()) {
      toast({ title: "Add a book concept first", variant: "destructive" });
      return;
    }
    setOutlineBusy(true);
    try {
      const result = await requestJson("/api/creator-studio/ai/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: activeBook.idea,
          bookType: activeBook.bookType || "nonfiction",
          genre: activeBook.genre || "General nonfiction",
        }),
      });
      const outline = result.outline as string[];
      setActiveBook({
        ...activeBook,
        outline,
        chapters: activeBook.chapters?.length ? activeBook.chapters : outline.map((item, index) => ({
          id: `chapter-${index + 1}`,
          title: item.split(" — ")[0],
          content: "",
        })),
      });
      toast({ title: "Outline generated", description: "Review and edit it before using it." });
    } catch (error: any) {
      toast({ title: "AI outline unavailable", description: error.message, variant: "destructive" });
    } finally {
      setOutlineBusy(false);
    }
  };

  const generateChapter = async (chapter: Chapter) => {
    if (!activeBook) return;
    setChapterBusy(chapter.id);
    try {
      const result = await requestJson("/api/creator-studio/ai/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: activeBook.id,
          chapterTitle: chapter.title,
          idea: activeBook.idea,
          bookType: activeBook.bookType || "nonfiction",
          genre: activeBook.genre || "General nonfiction",
        }),
      });
      updateChapter(chapter.id, "content", result.content);
      toast({ title: "Draft generated", description: "Review and edit the generated text before publishing." });
    } catch (error: any) {
      toast({ title: "AI chapter generation unavailable", description: error.message, variant: "destructive" });
    } finally {
      setChapterBusy(null);
    }
  };

  const generateMetadata = async () => {
    if (!activeBook) return;
    setMetadataBusy(true);
    setGeneratedMetadata(null);
    try {
      const result = await requestJson("/api/creator-studio/ai/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: activeBook.id }),
      });
      setGeneratedMetadata(result);
      toast({ title: "KDP metadata is ready", description: "Review all AI suggestions before using them." });
    } catch (error: any) {
      toast({ title: "Could not generate KDP metadata", description: error.message, variant: "destructive" });
    } finally {
      setMetadataBusy(false);
    }
  };

  const runWritingTool = async (tool: string) => {
    if (!activeBook) return;
    const chosenChapter = (activeBook.chapters || []).find((chapter) => chapter.id === writingToolChapterId)
      || activeBook.chapters?.[0];
    setWritingToolBusy(tool);
    setWritingToolOutput("");
    setWritingToolKind(tool);
    try {
      const result = await requestJson("/api/creator-studio/ai/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: activeBook.id,
          chapterId: chosenChapter?.id,
          tool,
        }),
      });
      setWritingToolOutput(result.content || "");
    } catch (error: any) {
      toast({ title: "AI writing tool failed", description: error.message, variant: "destructive" });
    } finally {
      setWritingToolBusy("");
    }
  };

  const applyGeneratedMetadata = () => {
    if (!activeBook || !generatedMetadata) return;
    setActiveBook({
      ...activeBook,
      title: generatedMetadata.title || activeBook.title,
      subtitle: generatedMetadata.subtitle || activeBook.subtitle,
      description: generatedMetadata.description || activeBook.description,
      kdpKeywords: generatedMetadata.keywords || activeBook.kdpKeywords || [],
    });
    setGeneratedMetadata(null);
    toast({ title: "KDP metadata applied", description: "Save the draft to keep these changes." });
  };

  const applyWritingToolOutput = () => {
    if (!activeBook || !writingToolOutput) return;
    const chosenChapter = (activeBook.chapters || []).find((chapter) => chapter.id === writingToolChapterId)
      || activeBook.chapters?.[0];
    if (writingToolKind === "blurb") {
      setActiveBook({ ...activeBook, description: writingToolOutput });
    } else if (writingToolKind === "keywords") {
      setActiveBook({ ...activeBook, kdpKeywords: writingToolOutput.split("\n").map((item) => item.replace(/^\s*[-*\d.)]+\s*/, "").trim()).filter(Boolean).slice(0, 7) });
    } else if (writingToolKind === "proofread" || writingToolKind === "expand") {
      if (chosenChapter) updateChapter(chosenChapter.id, "content", writingToolOutput);
    } else if (writingToolKind === "title-ideas") {
      const firstSuggestion = writingToolOutput.split("\n").map((item) => item.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim()).find(Boolean);
      if (firstSuggestion) setActiveBook({ ...activeBook, title: firstSuggestion.split(" — ")[0].slice(0, 240) });
    }
    toast({ title: "AI suggestion applied", description: "Review and save your draft to keep the changes." });
  };

  const updateChapter = (id: string, key: keyof Chapter, value: string) => {
    if (!activeBook) return;
    setActiveBook({
      ...activeBook,
      chapters: (activeBook.chapters || []).map((chapter) => chapter.id === id ? { ...chapter, [key]: value } : chapter),
    });
  };

  const submitProduct = async (product: Product) => {
    try {
      await requestJson(`/api/creator-studio/products/${product.id}/submit`, { method: "POST" });
      await refreshProducts();
      toast({ title: "Product submitted for review" });
    } catch (error: any) {
      toast({ title: "Could not submit product", description: error.message, variant: "destructive" });
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete the draft “${product.title}”?`)) return;
    try {
      await requestJson(`/api/creator-studio/products/${product.id}`, { method: "DELETE" });
      await refreshProducts();
      toast({ title: "Draft deleted" });
    } catch (error: any) {
      toast({ title: "Could not delete draft", description: error.message, variant: "destructive" });
    }
  };

  const beginProductEdit = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      title: product.title,
      description: product.description,
      productType: product.productType,
      category: product.category,
      price: String(product.price),
      tags: (product.tags || []).join(", "),
      version: product.version || "1.0",
      license: product.license || "",
      coverImage: product.coverImage || "",
    });
    setProductFile(null);
    setSection("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageTitle = useMemo(() => ({
    overview: "Creator Studio",
    books: "My Books",
    products: "Digital Products",
    earnings: "Sales & Earnings",
  }[section]), [section]);

  if (authLoading || (isAuthenticated && accessQuery.isLoading)) {
    return <div className="min-h-screen bg-slate-50"><NavigationFixed /><div className="mx-auto max-w-4xl px-4 py-24 text-center text-slate-500">Loading Creator Studio…</div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationFixed />
        <main className="mx-auto max-w-3xl px-4 py-20">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 sm:p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-violet-700" />
              <p className="mt-5 text-sm font-bold uppercase tracking-wider text-violet-700">Taskdrip Creator Publishing</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Create and publish from your Taskdrip account</h1>
              <p className="mx-auto mt-3 max-w-xl text-slate-600">Sign in or create a Taskdrip creator account to open the ebook editor, format KDP manuscripts, and submit books to the store.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/login?redirect=%2Fcreator-studio"><Button>Sign in</Button></Link>
                <Link href="/signup?type=creator&redirect=%2Fcreator-studio"><Button variant="outline">Create a creator account</Button></Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (accessQuery.isError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationFixed />
        <main className="mx-auto max-w-3xl px-4 py-20">
          <Card><CardContent className="p-8 text-center text-rose-700">
            {(accessQuery.error as Error).message}
            <Button className="ml-3" variant="outline" onClick={() => accessQuery.refetch()}>Try again</Button>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  if (accessQuery.data?.hasAccess !== true) {
    const isPending = accessQuery.data?.subscriptionStatus === "pending";
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationFixed />
        <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <Link href={isStudioAdmin ? "/admin-dashboard" : "/dashboard"}><Button variant="ghost" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Button></Link>
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-br from-violet-800 to-indigo-900 px-6 py-8 text-white sm:px-9">
                <div className="flex items-center gap-3"><LockKeyhole className="h-7 w-7" /><span className="text-sm font-bold uppercase tracking-wider">Creator Studio access</span></div>
                <h1 className="mt-4 text-3xl font-bold">Publish your next digital product on Taskdrip</h1>
                <p className="mt-2 max-w-2xl text-violet-100">Studio access includes the ebook editor, AI-assisted drafting when configured, product submissions, and your project workspace.</p>
              </div>
              <CardContent className="space-y-5 p-6 sm:p-9">
                {isPending ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <h2 className="font-semibold text-amber-900">Payment awaiting verification</h2>
                    <p className="mt-1 text-sm text-amber-800">Your Creator Studio access will be enabled after the publishing team reviews your payment. You can still track saved projects from your dashboard.</p>
                    <Button className="mt-4" variant="outline" onClick={() => accessQuery.refetch()} disabled={accessQuery.isFetching}>
                      {accessQuery.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Refresh status
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-violet-50 p-5">
                      <div><p className="text-sm font-semibold text-violet-900">Monthly Creator Studio access</p><p className="mt-1 text-sm text-violet-700">Payment is verified by Taskdrip before access begins.</p></div>
                      <p className="text-3xl font-bold text-violet-950">${Number(accessQuery.data?.monthlyPrice ?? planQuery.data?.monthlyPrice ?? 7).toFixed(2)}<span className="text-sm font-medium"> / month</span></p>
                    </div>
                    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); subscribeMutation.mutate(); }}>
                      <div>
                        <Label htmlFor="studio-payment-method">Payment method</Label>
                        <select id="studio-payment-method" className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm" value={paymentMethodId || selectedPaymentMethod?.id || ""} onChange={(event) => setPaymentMethodId(event.target.value)}>
                          {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.label || method.type}</option>)}
                        </select>
                        {selectedPaymentMethod ? (
                          <div className="mt-2 rounded-lg border bg-white p-3 text-sm text-slate-700">
                            {selectedPaymentMethod.address ? (
                              <>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedPaymentMethod.asset} receiving address · {selectedPaymentMethod.network}</p>
                                <div className="mt-1 flex items-start gap-2">
                                  <code className="min-w-0 flex-1 break-all rounded bg-slate-50 p-2 text-xs">{selectedPaymentMethod.address}</code>
                                  <Button type="button" size="icon" variant="outline" aria-label="Copy crypto address" onClick={() => navigator.clipboard.writeText(selectedPaymentMethod.address).then(() => toast({ title: "Wallet address copied" }))}><Copy className="h-4 w-4" /></Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="font-semibold">{selectedPaymentMethod.bankName}</p>
                                <p className="mt-1">Account name: <strong>{selectedPaymentMethod.accountName}</strong></p>
                                <p>Account number / IBAN: <strong className="select-all">{selectedPaymentMethod.accountNumber}</strong></p>
                                <p>Currency: {selectedPaymentMethod.currency}</p>
                              </>
                            )}
                            {selectedPaymentMethod.instructions && <p className="mt-2 text-xs text-slate-600">{selectedPaymentMethod.instructions}</p>}
                          </div>
                        ) : (
                          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            Subscription payment destinations are not configured yet. Please contact the Taskdrip team.
                          </p>
                        )}
                      </div>
                      <div><Label htmlFor="studio-payment-reference">Transaction reference</Label><Input id="studio-payment-reference" value={subscriptionReference} onChange={(event) => setSubscriptionReference(event.target.value)} maxLength={255} placeholder="Enter a transfer or payment reference" /></div>
                      <div><Label htmlFor="studio-payment-proof">Payment proof (PNG, JPG, WEBP, or PDF)</Label><Input id="studio-payment-proof" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={(event) => setSubscriptionProof(event.target.files?.[0] || null)} /><p className="mt-1 text-xs text-slate-500">Add a transaction reference or attach proof. Do not upload passwords, account credentials, or private keys.</p></div>
                      <Button type="submit" disabled={subscribeMutation.isPending || !selectedPaymentMethod || (!subscriptionReference.trim() && !subscriptionProof)}>
                        {subscribeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Submit monthly payment for review
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationFixed />
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"><Button variant="ghost" size="icon" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <div>
              <p className="text-xs uppercase tracking-wider text-violet-600 font-bold">Taskdrip Creator Publishing</p>
              <h1 className="text-xl font-bold text-slate-900">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/my-digital-library"><Button variant="outline" size="sm"><ArrowDownToLine className="h-4 w-4 mr-2" />My Library</Button></Link>
            <Button size="sm" onClick={createBook}><Plus className="h-4 w-4 mr-1" />New Book</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            ["Published", publishedCount, Store],
            ["Needs review", pendingCount, FileText],
            ["Drafts", draftCount, BookOpen],
            ["Available balance", `$${Number(earnings?.availableBalance || 0).toFixed(2)}`, Wallet],
          ].map(([label, value, Icon]: any) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0"><div className="text-xl font-bold text-slate-900 truncate">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {([
            ["overview", "Overview"],
            ["books", "My Books"],
            ["products", "Digital Products"],
            ["earnings", "Sales & Earnings"],
          ] as const).map(([value, label]) => (
            <Button key={value} size="sm" variant={section === value ? "default" : "outline"} onClick={() => setSection(value)}>{label}</Button>
          ))}
        </nav>

        {section === "overview" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader><CardTitle>Turn your knowledge into products</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                <button onClick={createBook} className="rounded-xl border p-4 text-left hover:border-violet-400 hover:bg-violet-50 transition">
                  <BookOpen className="h-6 w-6 text-violet-700 mb-3" /><div className="font-semibold">Write a book</div><p className="text-sm text-slate-500 mt-1">Draft chapters, use optional AI assistance, then submit your finished PDF or EPUB for review.</p>
                </button>
                <button onClick={() => setSection("products")} className="rounded-xl border p-4 text-left hover:border-violet-400 hover:bg-violet-50 transition">
                  <Store className="h-6 w-6 text-violet-700 mb-3" /><div className="font-semibold">Create a digital product</div><p className="text-sm text-slate-500 mt-1">Upload a template, resource, course file, or software package for admin review.</p>
                </button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Recent products</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {products.slice(0, 4).map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{product.title}</span>
                    <Badge className={statusColor[product.status] || ""}>{product.status.replace("_", " ")}</Badge>
                  </div>
                ))}
                {!products.length && <p className="text-sm text-slate-500">You have not created a product yet.</p>}
                <Button variant="link" className="px-0" onClick={() => setSection("products")}>Manage products →</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {section === "books" && (
          <div className="grid lg:grid-cols-[300px_1fr] gap-4">
            <Card className="border-0 shadow-sm h-fit">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Your books</CardTitle>
                <Button size="sm" variant="outline" onClick={createBook}><Plus className="h-4 w-4 mr-1" />New</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {books.map((book) => (
                  <button key={book.id} onClick={() => setActiveBook(book)} disabled={["published", "submitted"].includes(book.status)} className={`w-full rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-70 ${activeBook?.id === book.id ? "border-violet-500 bg-violet-50" : "hover:bg-slate-50"}`}>
                    <div className="font-medium truncate">{book.title}</div>
                    <Badge className={`mt-2 ${statusColor[book.status] || ""}`}>{book.status.replace("_", " ")}</Badge>
                  </button>
                ))}
                {!books.length && <p className="text-sm text-slate-500">Start a book draft to open the editor.</p>}
              </CardContent>
            </Card>

            {activeBook ? (
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle>Edit book draft</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Title</Label><Input value={activeBook.title} onChange={(e) => setActiveBook({ ...activeBook, title: e.target.value })} maxLength={240} /></div>
                    <div><Label>Subtitle</Label><Input value={activeBook.subtitle || ""} onChange={(e) => setActiveBook({ ...activeBook, subtitle: e.target.value })} maxLength={300} /></div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div><Label>Book type</Label><select className="mt-1 w-full h-10 rounded-md border bg-white px-3 text-sm" value={activeBook.bookType || "nonfiction"} onChange={(e) => setActiveBook({ ...activeBook, bookType: e.target.value })}>{KDP_BOOK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                    <div><Label>Reader niche</Label><select className="mt-1 w-full h-10 rounded-md border bg-white px-3 text-sm" value={activeBook.genre || "General nonfiction"} onChange={(e) => setActiveBook({ ...activeBook, genre: e.target.value })}>{KDP_GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></div>
                    <div><Label>KDP trim size</Label><select className="mt-1 w-full h-10 rounded-md border bg-white px-3 text-sm" value={activeBook.trimSize || "6x9"} onChange={(e) => setActiveBook({ ...activeBook, trimSize: e.target.value })}>{KDP_TRIM_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}</select></div>
                  </div>
                  <div><Label>Book concept</Label><Textarea rows={3} value={activeBook.idea || ""} onChange={(e) => setActiveBook({ ...activeBook, idea: e.target.value })} placeholder="Who is this for, and what will readers learn?" /></div>
                  <div><Label>Book description</Label><Textarea rows={3} value={activeBook.description || ""} onChange={(e) => setActiveBook({ ...activeBook, description: e.target.value })} placeholder="A short description for readers and the Taskdrip Shop." /></div>
                  <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                        <span className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-violet-700" />AI book launch studio</span>
                        <Button type="button" size="sm" variant="outline" onClick={generateMetadata} disabled={metadataBusy}>
                          {metadataBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Generate KDP metadata
                        </Button>
                      </CardTitle>
                      <p className="text-xs text-slate-600">Generate title, subtitle, sales description, search keywords, and category ideas for review. AI text is a draft, not a bestseller guarantee.</p>
                    </CardHeader>
                    {generatedMetadata && (
                      <CardContent className="space-y-2 border-t border-violet-100 pt-3">
                        <p className="font-semibold">{generatedMetadata.title}{generatedMetadata.subtitle ? `: ${generatedMetadata.subtitle}` : ""}</p>
                        <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-line">{generatedMetadata.description}</p>
                        <p className="text-xs text-slate-500"><strong>Keywords:</strong> {(generatedMetadata.keywords || []).join(" · ")}</p>
                        <p className="text-xs text-slate-500"><strong>Category ideas:</strong> {(generatedMetadata.categories || []).join(" · ")}</p>
                        <Button type="button" size="sm" onClick={applyGeneratedMetadata}>Apply metadata to draft</Button>
                      </CardContent>
                    )}
                    <CardContent className="space-y-3 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {[
                          ["title-ideas", "Title ideas"],
                          ["blurb", "Write sales blurb"],
                          ["keywords", "KDP keywords"],
                          ["proofread", "Proofread chapter"],
                          ["expand", "Expand chapter draft"],
                        ].map(([tool, label]) => (
                          <Button key={tool} type="button" size="sm" variant="outline" onClick={() => runWritingTool(tool)} disabled={!!writingToolBusy || (["proofread", "expand"].includes(tool) && !(activeBook.chapters || []).some((chapter) => chapter.content.trim()))}>
                            {writingToolBusy === tool ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                            {label}
                          </Button>
                        ))}
                      </div>
                      {(activeBook.chapters || []).length > 0 && (
                        <div className="max-w-sm">
                          <Label htmlFor="ai-tool-chapter" className="text-xs">Chapter for proofread / expand</Label>
                          <select id="ai-tool-chapter" className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm" value={writingToolChapterId || activeBook.chapters?.[0]?.id || ""} onChange={(e) => setWritingToolChapterId(e.target.value)}>
                            {activeBook.chapters?.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                          </select>
                        </div>
                      )}
                      {writingToolOutput && (
                        <div className="rounded-lg border bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">AI draft — review before applying</p>
                          <Textarea rows={8} value={writingToolOutput} onChange={(e) => setWritingToolOutput(e.target.value)} />
                          <Button type="button" size="sm" className="mt-2" onClick={applyWritingToolOutput}>Apply suggestion</Button>
                        </div>
                      )}
                      <p className="text-xs text-slate-500">Requires GROQ_API_KEY. Review AI-generated writing, claims, and metadata yourself before publishing.</p>
                    </CardContent>
                  </Card>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1"><Label>Chapter outline</Label><Button size="sm" variant="outline" onClick={generateOutline} disabled={outlineBusy}><Sparkles className="h-4 w-4 mr-1" />{outlineBusy ? "Generating…" : "Generate outline"}</Button></div>
                    <Textarea rows={4} value={(activeBook.outline || []).join("\n")} onChange={(e) => setActiveBook({ ...activeBook, outline: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} placeholder="Add one chapter title per line." />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><Label>Chapters</Label><Button size="sm" variant="outline" onClick={() => setActiveBook({ ...activeBook, chapters: [...(activeBook.chapters || []), { id: crypto.randomUUID(), title: `Chapter ${(activeBook.chapters || []).length + 1}`, content: "" }] })}><Plus className="h-4 w-4 mr-1" />Add chapter</Button></div>
                    {(activeBook.chapters || []).map((chapter) => (
                      <div key={chapter.id} className="rounded-xl border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input value={chapter.title} onChange={(e) => updateChapter(chapter.id, "title", e.target.value)} aria-label="Chapter title" />
                          <Button size="sm" variant="outline" onClick={() => generateChapter(chapter)} disabled={chapterBusy === chapter.id}><Sparkles className="h-4 w-4 mr-1" />{chapterBusy === chapter.id ? "…" : "Draft"}</Button>
                          <Button size="icon" variant="ghost" aria-label="Remove chapter" onClick={() => setActiveBook({ ...activeBook, chapters: (activeBook.chapters || []).filter((item) => item.id !== chapter.id) })}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <Textarea rows={8} value={chapter.content} onChange={(e) => updateChapter(chapter.id, "content", e.target.value)} placeholder="Write and edit your chapter. AI drafts are suggestions; review before publishing." />
                      </div>
                    ))}
                    {!activeBook.chapters?.length && <p className="text-sm text-slate-500">Add at least one chapter with content before book submission.</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Book cover image URL (optional)</Label><Input type="url" value={activeBook.coverImage || ""} onChange={(e) => setActiveBook({ ...activeBook, coverImage: e.target.value })} placeholder="https://…" /></div>
                    <div><Label>Taskdrip price (USD)</Label><Input type="number" min="0" step="0.01" value={bookPrice} onChange={(e) => setBookPrice(e.target.value)} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Amazon KDP purchase link (optional)</Label><Input type="url" value={activeBook.amazonUrl || ""} onChange={(e) => setActiveBook({ ...activeBook, amazonUrl: e.target.value })} placeholder="Add after the book is live on Amazon" /></div>
                    <div><Label>Reader or purchase link (optional)</Label><Input type="url" value={activeBook.accessUrl || ""} onChange={(e) => setActiveBook({ ...activeBook, accessUrl: e.target.value })} placeholder="https://…" /></div>
                  </div>
                  <div><Label>KDP search keywords (up to 7, one per line)</Label><Textarea rows={3} value={(activeBook.kdpKeywords || []).join("\n")} onChange={(e) => setActiveBook({ ...activeBook, kdpKeywords: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 7) })} placeholder="beginner home gardening&#10;small-space vegetable garden&#10;…" /></div>
                  <p className="-mt-2 text-xs text-slate-500">Amazon links appear as “Buy on Amazon.” Your reader link appears as “Access Book” on the public store page. Use a public or separately gated HTTPS page; these links are visible to all visitors.</p>
                  <div><Label>Finished PDF or EPUB file (optional when using an external link)</Label><Input type="file" accept=".pdf,.epub" onChange={(e) => setBookFile(e.target.files?.[0] || null)} /><p className="text-xs text-slate-500 mt-1">Upload the customer-ready file for Taskdrip delivery, or submit a KDP/reader link for an externally delivered book.</p></div>
                  <Card className="border-violet-200 bg-violet-50/60 shadow-none">
                    <CardHeader className="pb-2"><CardTitle className="text-base">KDP formatting & launch guide</CardTitle></CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-700">
                      <p>Choose a consistent book type, niche, trim size, and chapter structure. The manuscript export adds a title page, contents page, chapter breaks, readable type, and print page sizing.</p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>{activeBook.title.trim().length >= 2 ? "Book title is ready" : "Add a title"}.</li>
                        <li>{activeBook.description?.trim() ? "Reader description is ready" : "Write a clear reader description"}.</li>
                        <li>{activeBook.chapters?.length && activeBook.chapters.every((chapter) => chapter.content.trim()) ? "All chapters have content" : "Add content to each chapter"}.</li>
                        <li>Review the exported manuscript and preview it in Amazon Kindle Previewer before uploading to KDP.</li>
                        <li>Upload a separate KDP cover file and complete Amazon’s metadata, rights, and pricing steps.</li>
                      </ul>
                      <p className="text-xs text-slate-500">The guide supports formatting and quality checks; it does not promise bestseller rankings or publish to Amazon automatically.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => downloadKdpManuscript(activeBook, `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim())}>
                          <ArrowDownToLine className="mr-2 h-4 w-4" />Download KDP manuscript (HTML)
                        </Button>
                        <a href="https://kdp.amazon.com/" target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="outline"><ExternalLink className="mr-2 h-4 w-4" />Open Amazon KDP</Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={bookBusy} onClick={() => saveBook()}>{bookBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}Save draft</Button>
                    <Button disabled={bookBusy || (!bookFile && !activeBook.amazonUrl && !activeBook.accessUrl)} onClick={submitBook}>{bookBusy ? "Submitting…" : "Submit book for review"}</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm"><CardContent className="py-16 text-center"><BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" /><p className="font-medium">Select a book or create a new draft</p><Button className="mt-4" onClick={createBook}>Create a book</Button></CardContent></Card>
            )}
          </div>
        )}

        {section === "products" && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-start">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>{editingProductId ? "Edit product draft" : "Create a digital product"}</CardTitle></CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); productSave.mutate(); }}>
                  <div><Label>Product title</Label><Input required minLength={2} maxLength={240} value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea required rows={4} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Product type</Label><select className="w-full h-10 rounded-md border bg-white px-3 text-sm" value={productForm.productType} onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}>{["software", "template", "course", "digital-download", "bundle", "other"].map((type) => <option key={type} value={type}>{type.replace("-", " ")}</option>)}</select></div>
                    <div><Label>Category</Label><Input required value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Price (USD)</Label><Input type="number" min="0" step="0.01" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></div>
                    <div><Label>Version</Label><Input value={productForm.version} onChange={(e) => setProductForm({ ...productForm, version: e.target.value })} /></div>
                  </div>
                  <div><Label>Cover image URL</Label><Input type="url" value={productForm.coverImage} onChange={(e) => setProductForm({ ...productForm, coverImage: e.target.value })} placeholder="https://…" /></div>
                  <div><Label>Tags (comma separated)</Label><Input value={productForm.tags} onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })} /></div>
                  <div><Label>License / usage terms</Label><Textarea rows={2} value={productForm.license} onChange={(e) => setProductForm({ ...productForm, license: e.target.value })} /></div>
                  <div><Label>Product file</Label><Input type="file" accept=".pdf,.epub,.zip,.docx,.xlsx,.pptx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.mp4,.mov" onChange={(e) => setProductFile(e.target.files?.[0] || null)} /><p className="text-xs text-slate-500 mt-1">Private until approval. Maximum 100 MB; unsafe executable formats are not accepted.</p></div>
                  <div className="flex gap-2"><Button type="submit" disabled={productSave.isPending}>{productSave.isPending ? "Saving…" : editingProductId ? "Save changes" : "Save draft"}</Button>{editingProductId && <Button type="button" variant="outline" onClick={() => { setEditingProductId(null); setProductForm({ title: "", description: "", productType: "digital-download", category: "Digital Downloads", price: "9.99", tags: "", version: "1.0", license: "", coverImage: "" }); }}>Cancel edit</Button>}</div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle>Your digital products</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="font-semibold truncate">{product.title}</div><div className="text-xs text-slate-500 mt-1">{product.productType} · ${Number(product.price).toFixed(2)}{product.originalFileName ? ` · ${product.originalFileName}` : ""}</div></div>
                      <Badge className={statusColor[product.status] || ""}>{product.status.replace("_", " ")}</Badge>
                    </div>
                    {product.reviewNote && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800">Review note: {product.reviewNote}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {["draft", "rejected"].includes(product.status) && <Button size="sm" variant="outline" onClick={() => beginProductEdit(product)}>Edit</Button>}
                      {["draft", "rejected"].includes(product.status) && <Button size="sm" onClick={() => submitProduct(product)}>Submit for review</Button>}
                      {["draft", "rejected"].includes(product.status) && <Button size="sm" variant="ghost" onClick={() => deleteProduct(product)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>}
                      {product.status === "published" && <Link href="/shop"><Button size="sm" variant="outline">View shop</Button></Link>}
                    </div>
                  </div>
                ))}
                {!products.length && <p className="text-sm text-slate-500">Your product drafts and published listings will appear here.</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {section === "earnings" && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ["Gross sales", `$${Number(earnings?.gross || 0).toFixed(2)}`],
                ["Platform fees", `$${Number(earnings?.platformFees || 0).toFixed(2)}`],
                ["Net product earnings", `$${Number(earnings?.netEarnings || 0).toFixed(2)}`],
                ["Total sales", earnings?.totalSales || 0],
              ].map(([label, value]) => <Card key={label} className="border-0 shadow-sm"><CardContent className="p-4"><div className="text-xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></CardContent></Card>)}
            </div>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div><CardTitle>Sales ledger</CardTitle><p className="text-sm text-slate-500 mt-1">The current platform fee is {Number(earnings?.feePercent ?? 10)}%. Payment processing fees are not yet separately calculated.</p></div>
                <Link href="/payout-requests?sourceType=publishing"><Button variant="outline"><Wallet className="h-4 w-4 mr-2" />Request payout</Button></Link>
              </CardHeader>
              <CardContent>
                {earnings?.sales?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-2">Date</th><th>Gross</th><th>Platform fee</th><th>Referral fee</th><th>Net</th></tr></thead><tbody>{earnings.sales.map((sale: any) => <tr key={sale.id} className="border-b last:border-0"><td className="py-3">{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : "—"}</td><td>${Number(sale.grossAmount).toFixed(2)}</td><td>${Number(sale.platformFee).toFixed(2)}</td><td>${Number(sale.referralFee || 0).toFixed(2)}</td><td className="font-semibold">${Number(sale.netAmount).toFixed(2)}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-slate-500">Approved Taskdrip sales will appear here.</p>}
                <p className="mt-4 text-xs text-slate-500">Publishing payout requests use the existing Taskdrip wallet and payout process; publishing withdrawals are at least $10. Referral fees are shown separately. Existing wallet balance is shared.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
