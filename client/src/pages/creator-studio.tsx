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
import { ArrowDownToLine, ArrowLeft, BookOpen, Check, FileText, Loader2, Plus, Sparkles, Store, Trash2, Wallet } from "lucide-react";

type Chapter = { id: string; title: string; content: string };
type Book = {
  id: string;
  title: string;
  subtitle?: string | null;
  idea?: string | null;
  description?: string | null;
  outline?: string[];
  chapters?: Chapter[];
  amazonUrl?: string | null;
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
  originalFileName?: string | null;
  status: string;
  reviewNote?: string | null;
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
  const [section, setSection] = useState<"overview" | "books" | "products" | "earnings">("overview");
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookPrice, setBookPrice] = useState("9.99");
  const [bookBusy, setBookBusy] = useState(false);
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [chapterBusy, setChapterBusy] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productForm, setProductForm] = useState({
    title: "", description: "", productType: "digital-download", category: "Digital Downloads",
    price: "9.99", tags: "", version: "1.0", license: "", coverImage: "",
  });

  const booksQuery = useQuery<Book[]>({
    queryKey: ["/api/creator-studio/books"],
    queryFn: () => requestJson("/api/creator-studio/books"),
  });
  const productsQuery = useQuery<Product[]>({
    queryKey: ["/api/creator-studio/products"],
    queryFn: () => requestJson("/api/creator-studio/products"),
  });
  const earningsQuery = useQuery<any>({
    queryKey: ["/api/creator-studio/earnings"],
    queryFn: () => requestJson("/api/creator-studio/earnings"),
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
          idea: book.idea || "",
          description: book.description || "",
          outline: book.outline || [],
          chapters: book.chapters || [],
          amazonUrl: book.amazonUrl || "",
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
    if (!activeBook || !bookFile) {
      toast({ title: "Add the finished PDF or EPUB file first", variant: "destructive" });
      return;
    }
    const saved = await saveBook();
    if (!saved) return;
    const data = new FormData();
    data.append("price", bookPrice);
    data.append("productFile", bookFile);
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
        body: JSON.stringify({ idea: activeBook.idea }),
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
        body: JSON.stringify({ bookId: activeBook.id, chapterTitle: chapter.title, idea: activeBook.idea }),
      });
      updateChapter(chapter.id, "content", result.content);
      toast({ title: "Draft generated", description: "Review and edit the generated text before publishing." });
    } catch (error: any) {
      toast({ title: "AI chapter generation unavailable", description: error.message, variant: "destructive" });
    } finally {
      setChapterBusy(null);
    }
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

  return (
    <div className="min-h-screen bg-slate-50">
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
                  <div><Label>Book concept</Label><Textarea rows={3} value={activeBook.idea || ""} onChange={(e) => setActiveBook({ ...activeBook, idea: e.target.value })} placeholder="Who is this for, and what will readers learn?" /></div>
                  <div><Label>Book description</Label><Textarea rows={3} value={activeBook.description || ""} onChange={(e) => setActiveBook({ ...activeBook, description: e.target.value })} placeholder="A short description for readers and the Taskdrip Shop." /></div>
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
                    <div><Label>Amazon link (optional)</Label><Input type="url" value={activeBook.amazonUrl || ""} onChange={(e) => setActiveBook({ ...activeBook, amazonUrl: e.target.value })} placeholder="https://www.amazon.com/dp/…" /></div>
                    <div><Label>Taskdrip price (USD)</Label><Input type="number" min="0" step="0.01" value={bookPrice} onChange={(e) => setBookPrice(e.target.value)} /></div>
                  </div>
                  <div><Label>Finished PDF or EPUB file</Label><Input type="file" accept=".pdf,.epub" onChange={(e) => setBookFile(e.target.files?.[0] || null)} /><p className="text-xs text-slate-500 mt-1">The manuscript editor saves drafts. Upload the final customer-ready file before review.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={bookBusy} onClick={() => saveBook()}>{bookBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}Save draft</Button>
                    <Button disabled={bookBusy || !bookFile} onClick={submitBook}>{bookBusy ? "Submitting…" : "Submit finished book for review"}</Button>
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
