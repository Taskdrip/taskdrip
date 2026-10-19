import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, BookOpenCheck, Send, ChevronLeft, ChevronRight, ExternalLink, SlidersHorizontal, X } from "lucide-react";
import { freeDownloadsApi, useFreeDownloadCategories, useFreeDownloadHome, useFreeDownloadList, useFreeDownloadPreacherSuggestions, useFreeDownloadSuggestions } from "@/lib/free-downloads-api";
import { EmptyBlock, ErrorBlock, FreeDownloadsShell, LoadingBlock, PageHeading, ResourceGrid, SearchBox, SectionTitle } from "./shared";
import type { FreeDownloadSummary } from "@/lib/free-downloads-api";

export function FreeDownloadsHomePage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "popular" | "trending" | "oldest" | "alphabetical">("latest");
  const [heroIndex, setHeroIndex] = useState(0);
  const [telegramPromptOpen, setTelegramPromptOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [fileType, setFileType] = useState<"" | "document" | "archive" | "audio" | "video" | "image" | "software">("");
  const [format, setFormat] = useState("");
  const [preacher, setPreacher] = useState("");
  const [preacherSlug, setPreacherSlug] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const home = useFreeDownloadHome();
  const categoriesQuery = useFreeDownloadCategories();
  const aiToolsQuery = useFreeDownloadList({ category: "ai-tools", sort: "popular", limit: 3 }, !!categoriesQuery.data);
  const softwareQuery = useFreeDownloadList({ category: "software", sort: "popular", limit: 3 }, !!categoriesQuery.data);
  const moviesQuery = useFreeDownloadList({ category: "movies", sort: "latest", limit: 3 }, !!categoriesQuery.data);
  const videosQuery = useFreeDownloadList({ category: "videos", sort: "latest", limit: 3 }, !!categoriesQuery.data);
  const sermonsQuery = useFreeDownloadList({ category: "sermons", sort: "latest", limit: 3 }, !!categoriesQuery.data);
  const mostDownloadedQuery = useFreeDownloadList({ sort: "popular", limit: 3 }, !!categoriesQuery.data);
  const filters = useMemo(() => ({
    q: query.trim() || undefined,
    category: category || undefined,
    subcategory: subcategory || undefined,
    fileType: fileType || undefined,
    format: format || undefined,
    preacher: preacherSlug || undefined,
    minSize: minSize ? Math.round(Number(minSize) * 1_000_000) : undefined,
    maxSize: maxSize ? Math.round(Number(maxSize) * 1_000_000) : undefined,
    from: from || undefined,
    to: to || undefined,
    sort,
    page,
    limit: 9,
  }), [query, category, subcategory, fileType, format, preacherSlug, minSize, maxSize, from, to, sort, page]);
  const list = useFreeDownloadList(filters);
  const suggestionQuery = useFreeDownloadSuggestions(query);
  const preacherQuery = useFreeDownloadPreacherSuggestions(preacher);
  const homeData = (home.data || {}) as any;
  const featured: FreeDownloadSummary[] = homeData.featured || homeData.featuredDownloads || [];
  const recent: FreeDownloadSummary[] = homeData.recent || homeData.recentDownloads || [];
  const trending: FreeDownloadSummary[] = homeData.trending || homeData.trendingDownloads || [];
  const suggestions = suggestionQuery.data?.suggestions || [];
  const preacherSuggestions = preacherQuery.data?.suggestions || [];
  const activeCategory = categoriesQuery.data?.find(item => item.slug === category);
  const featuredAiTools = aiToolsQuery.data?.items || [];
  const featuredSoftware = softwareQuery.data?.items || [];
  const latestMoviesAndVideos = [...(moviesQuery.data?.items || []), ...(videosQuery.data?.items || [])].slice(0, 6);
  const latestSermons = sermonsQuery.data?.items || [];
  const mostDownloaded = mostDownloadedQuery.data?.items || [];
  const slides = homeData.slides || [];
  const slide = slides[heroIndex] || {
    title: "Everything You Need, All in One Place.",
    description: "Discover free software, AI tools, entertainment, educational resources and digital downloads.",
    imageUrl: "",
    ctaLabel: "Explore downloads",
    ctaUrl: "#fd-library",
  };

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  useEffect(() => {
    try {
      if (window.localStorage.getItem("taskdrip-fd-telegram-dismissed") === "true") return;
      const timer = window.setTimeout(() => setTelegramPromptOpen(true), 14000);
      return () => window.clearTimeout(timer);
    } catch { /* The inline community CTA remains available when storage is blocked. */ }
  }, []);
  useEffect(() => {
    if (!telegramPromptOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismissTelegramPrompt(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [telegramPromptOpen]);

  async function submitSearch(value: string) {
    const search = value.trim();
    if (/^TFD\d{2,}$/i.test(search)) {
      try {
        const match = await freeDownloadsApi.byCode(search);
        navigate(`/downloads/${match.slug}`);
        return;
      } catch {
        // An unknown code still works as a normal text search below.
      }
    }
    setQuery(search);
    setPage(1);
    document.getElementById("fd-library")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearFilters() {
    setQuery(""); setCategory(""); setSubcategory(""); setFileType(""); setFormat(""); setPreacher(""); setPreacherSlug("");
    setMinSize(""); setMaxSize(""); setFrom(""); setTo(""); setSort("latest"); setPage(1);
  }

  function dismissTelegramPrompt() {
    setTelegramPromptOpen(false);
    try { window.localStorage.setItem("taskdrip-fd-telegram-dismissed", "true"); } catch { /* no-op */ }
  }

  return <FreeDownloadsShell>
    <section className="fd-hero">
      <div>
        <div className="fd-eyebrow"><span />THE TASKDRIP RESOURCE LIBRARY</div>
        <h1>{slide.title || "Everything You Need, All in One Place."}</h1>
        <p className="fd-hero-copy">{slide.description || "Discover free software, AI tools, entertainment, educational resources and digital downloads."}</p>
          <SearchBox value={query} onChange={value => { setQuery(value); setPage(1); }} suggestions={suggestions} onChoose={slug => navigate(`/downloads/${slug}`)} onSubmit={submitSearch} />
        <div className="fd-hero-actions">
          <a className="fd-button" href={slide.ctaUrl || "#fd-library"} target={slide.ctaUrl?.startsWith("http") ? "_blank" : undefined} rel={slide.ctaUrl?.startsWith("http") ? "noopener noreferrer" : undefined}>{slide.ctaLabel || "Explore downloads"}<ArrowRight size={15} /></a>
          <a className="fd-button fd-button-outline" href="#fd-categories">Browse categories</a>
        </div>
      </div>
      <aside className={`fd-hero-note ${slide.imageUrl ? "has-image" : ""}`} style={slide.imageUrl ? { backgroundImage: `linear-gradient(0deg,rgba(31,26,45,.78),rgba(31,26,45,.06)),url("${slide.imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <div className="fd-note-index">{String(heroIndex + 1).padStart(2, "0")} / OPEN LIBRARY</div>
        <div className="fd-note-copy"><strong>Curated, not crowded.</strong><span>{slide.description || "Every listing is here to be useful. Browse by format, topic or the people who shared it."}</span></div>
        {slides.length > 1 && <div className="fd-slide-controls" aria-label="Hero slide controls">
          <button type="button" aria-label="Previous slide" onClick={() => setHeroIndex((index) => (index - 1 + slides.length) % slides.length)}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Next slide" onClick={() => setHeroIndex((index) => (index + 1) % slides.length)}><ChevronRight size={16} /></button>
        </div>}
      </aside>
    </section>

    <nav id="fd-categories" className="fd-category-rail" aria-label="Browse resource categories">
      {(categoriesQuery.data || []).map(category => <a className="fd-category-chip" key={category.id} href={`/downloads/category/${category.slug}`}>{category.name}<span>{category.downloadCount.toLocaleString()}</span></a>)}
    </nav>
    <section className="fd-section fd-category-explorer">
      <SectionTitle kicker="BROWSE THE LIBRARY" title="Explore by category" detail="Find documents, tools, software, audio, video and sermons in their own collections." />
      <div className="fd-category-grid">{(categoriesQuery.data || []).map(item => <a className="fd-category-card" key={item.id} href={`/downloads/category/${item.slug}`}>
        {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div className="fd-category-card-mark">{item.name.slice(0, 1)}</div>}
        <div><strong>{item.name}</strong><span>{item.description || "Browse this collection"}</span><small>{item.downloadCount.toLocaleString()} resources</small></div><ArrowRight size={15} />
      </a>)}</div>
    </section>
    <div className="fd-feature-band">
      <div><div className="fd-kicker">COMMUNITY-SOURCED</div><h2>Need something specific?</h2><p>Tell the library team what would make your work easier.</p></div>
      <a className="fd-text-link" href="/downloads/request">Request a resource <ArrowRight size={16} /></a>
    </div>

    {featured.length > 0 && <section className="fd-section"><SectionTitle kicker="SELECTED BY THE TEAM" title="Worth a closer look" detail="Standout finds, checked and ready to use." /><ResourceGrid items={featured.slice(0, 3)} featured /></section>}
    <section className="fd-section" id="fd-library">
      <SectionTitle kicker={query ? "SEARCH RESULTS" : "THE LIBRARY"} title={query ? `Results for “${query}”` : "Find your next useful thing"} detail={query ? `${list.data?.total ?? 0} resources found` : "Browse the full collection, with the newest additions first."} />
      <div className="fd-toolbar">
        <label className="sr-only" htmlFor="fd-sort">Sort resources</label>
        <select id="fd-sort" className="fd-select" value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}><option value="latest">Recently added</option><option value="popular">Most downloaded</option><option value="trending">Trending now</option><option value="oldest">Oldest first</option><option value="alphabetical">A–Z</option></select>
        {query && <button className="fd-button fd-button-outline" onClick={() => setQuery("")}>Clear search</button>}
      </div>
      <div className="fd-mobile-filter-row">
        <button className="fd-button fd-button-outline" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={14} /> Filters
        </button>
        {Object.values({ category, subcategory, fileType, format, preacherSlug, minSize, maxSize, from, to }).some(Boolean) && <span>Filters applied</span>}
      </div>
      {filtersOpen && <button className="fd-filter-scrim" type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
      <div className={`fd-filter-panel ${filtersOpen ? "is-open" : ""}`} aria-label="Filter downloads">
        <div className="fd-filter-drawer-head"><strong>Filter downloads</strong><button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={18} /></button></div>
        <label>Category<select className="fd-select" value={category} onChange={e => { setCategory(e.target.value); setSubcategory(""); setPage(1); }}><option value="">All categories</option>{(categoriesQuery.data || []).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
        <label>Subcategory<select className="fd-select" value={subcategory} disabled={!activeCategory?.subcategories?.length} onChange={e => { setSubcategory(e.target.value); setPage(1); }}><option value="">All subcategories</option>{(activeCategory?.subcategories || []).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
        <label>File type<select className="fd-select" value={fileType} onChange={e => { setFileType(e.target.value as typeof fileType); setPage(1); }}><option value="">All file types</option><option value="document">Documents</option><option value="archive">Archives</option><option value="audio">Audio</option><option value="video">Video</option><option value="image">Images</option><option value="software">Software & apps</option></select></label>
        <label>Format<select className="fd-select" value={format} onChange={e => { setFormat(e.target.value); setPage(1); }}><option value="">All formats</option>{["PDF", "DOC", "DOCX", "TXT", "ZIP", "RAR", "MP3", "MP4", "AI", "Software", "PPTX", "XLSX", "APK", "EXE"].map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Preacher / contributor<input className="fd-input" list="fd-preacher-suggestions" value={preacher} onChange={e => { const name = e.target.value; setPreacher(name); const match = preacherSuggestions.find(item => item.fullName.toLowerCase() === name.trim().toLowerCase()); setPreacherSlug(match?.slug || ""); setPage(1); }} placeholder="Type a name" /><datalist id="fd-preacher-suggestions">{preacherSuggestions.map(item => <option key={item.id} value={item.fullName}>{item.ministryName}</option>)}</datalist></label>
        <label>Minimum size (MB)<input className="fd-input" type="number" min="0" step="1" value={minSize} onChange={e => { setMinSize(e.target.value); setPage(1); }} placeholder="No minimum" /></label>
        <label>Maximum size (MB)<input className="fd-input" type="number" min="0" step="1" value={maxSize} onChange={e => { setMaxSize(e.target.value); setPage(1); }} placeholder="No maximum" /></label>
        <label>Published from<input className="fd-input" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></label>
        <label>Published to<input className="fd-input" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></label>
        <button className="fd-button fd-button-outline fd-filter-clear" type="button" onClick={() => { clearFilters(); setFiltersOpen(false); }}>Clear filters</button>
      </div>
      {list.isLoading ? <LoadingBlock /> : list.isError ? <ErrorBlock message={(list.error as Error)?.message} retry={() => list.refetch()} /> : list.data?.items.length ? <ResourceGrid items={list.data.items} /> : <EmptyBlock title="Nothing in this search yet" text="Try a broader term or browse by category." />}
      {!!list.data && list.data.pageCount > 1 && <div className="fd-pagination"><button className="fd-button fd-button-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {list.data.page} of {list.data.pageCount} · {list.data.total} downloads</span><button className="fd-button fd-button-outline" disabled={page >= list.data.pageCount} onClick={() => setPage(value => value + 1)}>Next</button></div>}
    </section>
    {recent.length > 0 && <section className="fd-section"><SectionTitle kicker="FRESHLY ADDED" title="New to the library" href="/downloads?sort=latest" /><ResourceGrid items={recent.slice(0, 3)} /></section>}
    {mostDownloaded.length > 0 && <section className="fd-section"><SectionTitle kicker="MOST DOWNLOADED" title="Popular downloads" href="/downloads?sort=popular" /><ResourceGrid items={mostDownloaded} /></section>}
    {featuredAiTools.length > 0 && <section className="fd-section"><SectionTitle kicker="AI TOOLS" title="Featured AI tools" href="/downloads/category/ai-tools" /><ResourceGrid items={featuredAiTools} /></section>}
    {featuredSoftware.length > 0 && <section className="fd-section"><SectionTitle kicker="SOFTWARE" title="Featured software" href="/downloads/category/software" /><ResourceGrid items={featuredSoftware} /></section>}
    {latestMoviesAndVideos.length > 0 && <section className="fd-section"><SectionTitle kicker="WATCH & LEARN" title="Latest movies & videos" /><ResourceGrid items={latestMoviesAndVideos} /></section>}
    {latestSermons.length > 0 && <section className="fd-section"><SectionTitle kicker="SERMONS & MINISTRY" title="Latest sermons" href="/downloads/category/sermons" /><ResourceGrid items={latestSermons} /></section>}
    {trending.length > 0 && <section className="fd-section"><SectionTitle kicker="IN GOOD COMPANY" title="Popular this week" href="/downloads?sort=trending" /><ResourceGrid items={trending.slice(0, 3)} /></section>}
    <section className="fd-community-band">
      <div><div className="fd-kicker">TASKDRIP COMMUNITY</div><h2>Never Miss a Free Resource!</h2><p>Join the Taskdrip Telegram community to discover new uploads, free tools, software, digital resources and exclusive updates.</p></div>
      <a className="fd-button" href="https://t.me/taskdrip" target="_blank" rel="noopener noreferrer">Join Taskdrip community <ExternalLink size={14} /></a>
    </section>
    {home.isError && <div className="fd-legal-note"><BookOpenCheck size={14} /> Featured collections are temporarily unavailable. The searchable library is still open.</div>}
    <div className="fd-feature-band"><div><div className="fd-kicker">REQUEST DESK</div><h2>Make the library better.</h2><p>Request a resource and follow its progress from your member account.</p></div><a className="fd-text-link" href="/downloads/request">Send a suggestion <Send size={15} /></a></div>
    {telegramPromptOpen && <div className="fd-community-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) dismissTelegramPrompt(); }}>
      <section className="fd-community-modal" role="dialog" aria-modal="true" aria-labelledby="fd-community-modal-title">
        <button className="fd-close" aria-label="Close Telegram invitation" onClick={dismissTelegramPrompt}>×</button>
        <div className="fd-kicker">TASKDRIP COMMUNITY</div><h2 id="fd-community-modal-title">Never Miss a Free Resource!</h2>
        <p>Join the Taskdrip Telegram community to discover new uploads, free tools, software, digital resources and exclusive updates.</p>
        <a className="fd-button" href="https://t.me/taskdrip" target="_blank" rel="noopener noreferrer" onClick={dismissTelegramPrompt}>JOIN TASKDRIP COMMUNITY <ExternalLink size={14} /></a>
        <button className="fd-text-link" onClick={dismissTelegramPrompt}>Not now</button>
      </section>
    </div>}
  </FreeDownloadsShell>;
}
