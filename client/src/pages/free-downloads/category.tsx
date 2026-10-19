import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useFreeDownloadCategories, useFreeDownloadList } from "@/lib/free-downloads-api";
import { EmptyBlock, ErrorBlock, FreeDownloadsShell, LoadingBlock, PageHeading, ResourceGrid } from "./shared";

export function FreeDownloadCategoryPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<"latest" | "popular" | "alphabetical" | "trending">("latest");
  const [format, setFormat] = useState("");
  const [page, setPage] = useState(1);
  const categories = useFreeDownloadCategories();
  const selected = categories.data?.find(category => category.slug === slug);
  const filters = useMemo(() => ({ category: slug, sort, format: format || undefined, page, limit: 12 }), [slug, sort, format, page]);
  const list = useFreeDownloadList(filters, !!slug);
  return <FreeDownloadsShell>
    <div className="fd-page-heading"><div className="fd-eyebrow"><span />BROWSE BY CATEGORY</div><h1>{selected?.name || "Resource category"}</h1><p>{selected?.description || "Explore the useful resources filed in this part of the library."}</p></div>
    <div className="fd-admin-heading-row"><Link className="fd-text-link" href="/downloads">← Back to the library</Link><span className="fd-count">{list.data?.total ?? 0} resources</span></div>
    <div className="fd-toolbar">
      <label className="sr-only" htmlFor="fd-category-sort">Sort resources</label><select id="fd-category-sort" className="fd-select" value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}><option value="latest">Recently added</option><option value="popular">Most downloaded</option><option value="trending">Trending</option><option value="alphabetical">A–Z</option></select>
      <label className="sr-only" htmlFor="fd-category-format">Filter by format</label><select id="fd-category-format" className="fd-select" value={format} onChange={e => { setFormat(e.target.value); setPage(1); }}><option value="">Every format</option><option value="ZIP">ZIP</option><option value="PDF">PDF</option><option value="MP3">MP3 / Audio</option><option value="MP4">MP4 / Video</option><option value="AI">AI tool</option><option value="Software">Software</option></select>
    </div>
    {list.isLoading ? <LoadingBlock /> : list.isError ? <ErrorBlock message={(list.error as Error)?.message} retry={() => list.refetch()} /> : list.data?.items.length ? <ResourceGrid items={list.data.items} /> : <EmptyBlock title="No resources here yet" text="Try another format or come back as the collection grows." action={<Link className="fd-button fd-button-outline" href="/downloads">Browse everything</Link>} />}
    {list.data && list.data.pageCount > 1 && <div className="fd-pagination"><button className="fd-button fd-button-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {list.data.page} of {list.data.pageCount}</span><button className="fd-button fd-button-outline" disabled={page >= list.data.pageCount} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    <nav className="fd-category-rail" aria-label="More categories">{(categories.data || []).filter(c => c.slug !== slug).map(c => <Link className="fd-category-chip" key={c.id} href={`/downloads/category/${c.slug}`}>{c.name}<span>{c.downloadCount}</span></Link>)}</nav>
  </FreeDownloadsShell>;
}
