import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, BookOpenCheck, Send } from "lucide-react";
import { useFreeDownloadCategories, useFreeDownloadHome, useFreeDownloadList, useFreeDownloadSuggestions } from "@/lib/free-downloads-api";
import { EmptyBlock, ErrorBlock, FreeDownloadsShell, LoadingBlock, PageHeading, ResourceGrid, SearchBox, SectionTitle } from "./shared";
import type { FreeDownloadSummary } from "@/lib/free-downloads-api";

export function FreeDownloadsHomePage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "popular" | "trending">("latest");
  const home = useFreeDownloadHome();
  const categoriesQuery = useFreeDownloadCategories();
  const filters = useMemo(() => ({ q: query.trim() || undefined, sort, page: 1, limit: 9 }), [query, sort]);
  const list = useFreeDownloadList(filters);
  const suggestionQuery = useFreeDownloadSuggestions(query);
  const homeData = (home.data || {}) as any;
  const featured: FreeDownloadSummary[] = homeData.featured || homeData.featuredDownloads || [];
  const recent: FreeDownloadSummary[] = homeData.recent || homeData.recentDownloads || [];
  const trending: FreeDownloadSummary[] = homeData.trending || homeData.trendingDownloads || [];
  const suggestions = suggestionQuery.data?.suggestions || [];

  return <FreeDownloadsShell>
    <section className="fd-hero">
      <div>
        <div className="fd-eyebrow"><span />THE TASKDRIP RESOURCE LIBRARY</div>
        <h1>Good tools.<br /><em>Shared well.</em></h1>
        <p className="fd-hero-copy">A considered collection of useful digital resources, software, AI tools and media — shared with permission, ready to put to work.</p>
        <SearchBox value={query} onChange={setQuery} suggestions={suggestions} onChoose={slug => navigate(`/downloads/${slug}`)} />
      </div>
      <aside className="fd-hero-note"><div className="fd-note-index">01 / OPEN LIBRARY</div><div className="fd-note-copy"><strong>Curated, not crowded.</strong><span>Every listing is here to be useful. Browse by format, topic or the people who shared it.</span></div></aside>
    </section>

    <nav className="fd-category-rail" aria-label="Browse resource categories">
      {(categoriesQuery.data || []).map(category => <a className="fd-category-chip" key={category.id} href={`/downloads/category/${category.slug}`}>{category.name}<span>{category.downloadCount.toLocaleString()}</span></a>)}
    </nav>
    <div className="fd-feature-band">
      <div><div className="fd-kicker">COMMUNITY-SOURCED</div><h2>Need something specific?</h2><p>Tell the library team what would make your work easier.</p></div>
      <a className="fd-text-link" href="/downloads/request">Request a resource <ArrowRight size={16} /></a>
    </div>

    {featured.length > 0 && <section className="fd-section"><SectionTitle kicker="SELECTED BY THE TEAM" title="Worth a closer look" detail="Standout finds, checked and ready to use." /><ResourceGrid items={featured.slice(0, 3)} featured /></section>}
    <section className="fd-section">
      <SectionTitle kicker={query ? "SEARCH RESULTS" : "THE LIBRARY"} title={query ? `Results for “${query}”` : "Find your next useful thing"} detail={query ? `${list.data?.total ?? 0} resources found` : "Browse the full collection, with the newest additions first."} />
      <div className="fd-toolbar">
        <label className="sr-only" htmlFor="fd-sort">Sort resources</label>
        <select id="fd-sort" className="fd-select" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="latest">Recently added</option><option value="popular">Most downloaded</option><option value="trending">Trending now</option></select>
        {query && <button className="fd-button fd-button-outline" onClick={() => setQuery("")}>Clear search</button>}
      </div>
      {list.isLoading ? <LoadingBlock /> : list.isError ? <ErrorBlock message={(list.error as Error)?.message} retry={() => list.refetch()} /> : list.data?.items.length ? <ResourceGrid items={list.data.items} /> : <EmptyBlock title="Nothing in this search yet" text="Try a broader term or browse by category." />}
      {!!list.data && list.data.pageCount > 1 && <div className="fd-pagination"><span>Page {list.data.page} of {list.data.pageCount}</span><a className="fd-button fd-button-outline" href={`/downloads?q=${encodeURIComponent(query)}`}>View all matching resources</a></div>}
    </section>
    {recent.length > 0 && <section className="fd-section"><SectionTitle kicker="FRESHLY ADDED" title="New to the library" href="/downloads?sort=latest" /><ResourceGrid items={recent.slice(0, 3)} /></section>}
    {trending.length > 0 && <section className="fd-section"><SectionTitle kicker="IN GOOD COMPANY" title="Popular this week" href="/downloads?sort=trending" /><ResourceGrid items={trending.slice(0, 3)} /></section>}
    {home.isError && <div className="fd-legal-note"><BookOpenCheck size={14} /> Featured collections are temporarily unavailable. The searchable library is still open.</div>}
    <div className="fd-feature-band"><div><div className="fd-kicker">REQUEST DESK</div><h2>Make the library better.</h2><p>Request a resource and follow its progress from your member account.</p></div><a className="fd-text-link" href="/downloads/request">Send a suggestion <Send size={15} /></a></div>
  </FreeDownloadsShell>;
}
