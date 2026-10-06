import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowDownToLine, ArrowLeft, BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function loadLibrary() {
  const response = await fetch("/api/my/digital-library", { credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Could not load your purchases.");
  }
  return response.json();
}

export default function DigitalLibraryPage() {
  const { data: items = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/my/digital-library"],
    queryFn: loadLibrary,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard"><Button variant="ghost" size="icon" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div><p className="text-xs uppercase tracking-wider text-violet-600 font-bold">Taskdrip Shop</p><h1 className="text-xl font-bold">My Digital Library</h1></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? <p className="text-center text-slate-500 py-16">Loading your library…</p> : error ? (
          <Card><CardContent className="py-12 text-center"><p className="text-red-700">{(error as Error).message}</p><Link href="/login"><Button className="mt-4">Sign in</Button></Link></CardContent></Card>
        ) : items.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item: any) => (
              <Card key={`${item.purchaseId}-${item.publishingProductId}`} className="overflow-hidden">
                <div className="aspect-[4/3] bg-white flex items-center justify-center">
                  {item.coverImage ? <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" /> : item.productType === "ebook" ? <BookOpen className="h-12 w-12 text-slate-300" /> : <FileText className="h-12 w-12 text-slate-300" />}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2"><CardTitle className="text-base">{item.title}</CardTitle><Badge variant="outline">{item.purchaseStatus}</Badge></div>
                  <p className="text-xs text-slate-500 truncate">{item.originalFileName || item.productType}</p>
                </CardHeader>
                <CardContent>
                  <a href={`/api/publishing/download/${item.publishingProductId}`} className={item.downloadsRemaining > 0 ? "" : "pointer-events-none"}>
                    <Button className="w-full" disabled={item.downloadsRemaining <= 0}>
                      <ArrowDownToLine className="h-4 w-4 mr-2" />
                      {item.downloadsRemaining > 0 ? `Download · ${item.downloadsRemaining} left` : "Download limit reached"}
                    </Button>
                  </a>
                  <p className="text-xs text-slate-500 mt-2">Downloads are private and limited to 10 per purchase.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="py-16 text-center"><BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" /><h2 className="text-lg font-semibold">Your library is empty</h2><p className="text-sm text-slate-500 mt-1">Approved digital purchases will appear here after payment is confirmed.</p><Link href="/shop"><Button className="mt-5">Browse the Taskdrip Shop</Button></Link></CardContent></Card>
        )}
      </main>
    </div>
  );
}
