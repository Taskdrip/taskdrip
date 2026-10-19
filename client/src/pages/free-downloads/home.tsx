import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { freeDownloadsApi, useFreeDownloadCategories, useFreeDownloadHome, useFreeDownloadList, useFreeDownloadPreacherSuggestions, useFreeDownloadSuggestions } from "@/lib/free-downloads-api";
import { EmptyBlock, ErrorBlock, FreeDownloadsShell, LoadingBlock, ResourceGrid, SearchBox, SectionTitle } from "./shared";
import type { FreeDownloadSummary } from "@/lib/free-downloads-api";
import creatorHeroImage from "@/assets/free-downloads/creator.jpg";
import toolsHeroImage from "@/assets/free-downloads/tools.jpg";
import learningHeroImage from "@/assets/free-downloads/learning.jpg";

const defaultHeroSlides = [
  {
    id: "library-creators",
    title: "Useful resources for the work you do.",
    description: "Find practical tools, templates and creative resources, curated for your next project.",
    imageUrl: creatorHeroImage,
    ctaLabel: "Explore downloads",
    ctaUrl: "#fd-library",
  },
  {
    id: "library-tools",
    title: "Discover tools worth adding to your workflow.",
    description: "Browse software, AI tools and digital resources without losing time to endless searching.",
    imageUrl: toolsHeroImage,
    ctaLabel: "Browse the library",
    ctaUrl: "#fd-library",
  },
  {
    id: "library-learning",
    title: "Learn, create and keep moving forward.",
    description: "Explore guides, media and learning materials selected for creators and small teams.",
    imageUrl: learningHeroImage,
    ctaLabel: "Find a resource",
    ctaUrl: "#fd-categories",
  },
];

export function FreeDownloadsHomePage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "popular" | "trending" | "oldest" | "alphabetical">("latest");
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
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
  const categoryItems = categoriesQuery.data?.length
    ? categoriesQuery.data
    : Array.isArray(homeData.categories) ? homeData.categories : [];
  const featured: FreeDownloadSummary[] = homeData.featured || homeData.featuredDownloads || [];
  const suggestions = suggestionQuery.data?.suggestions || [];
  const preacherSuggestions = preacherQuery.data?.suggestions || [];
  const activeCategory = categoryItems.find((item: any) => item.slug === category);
  const storedSlides = Array.isArray(homeData.slides) ? homeData.slides : [];
  const hasAdminSlides = storedSlides.some((item: any) => item.id !== "free-downloads-default-slide");
  const slides = hasAdminSlides
    ? storedSlides.map((item: any, index: number) => ({
        ...item,
        imageUrl: item.imageUrl || defaultHeroSlides[index % defaultHeroSlides.length].imageUrl,
      }))
    : defaultHeroSlides;
  const slide = slides[heroIndex] || slides[0];
  const totalResources = categoryItems.reduce((total: number, item: any) => total + Number(item.downloadCount || 0), 0);

  useEffect(() => {
    if (slides.length < 2 || heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, heroPaused]);
  useEffect(() => {
    setHeroIndex((index) => slides.length ? index % slides.length : 0);
  }, [slides.length]);

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

  return <FreeDownloadsShell categories={categoryItems}>
    <section
      className="fd-hero"
      onMouseEnter={() => setHeroPaused(true)}
      onMouseLeave={() => setHeroPaused(false)}
      onFocusCapture={() => setHeroPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroPaused(false);
      }}
      aria-label="Featured resource collections"
    >
      <div key={slide.id || heroIndex} className="fd-hero-image" style={{ backgroundImage: `url("${slide.imageUrl}")` }} aria-hidden="true" />
      <div className="fd-hero-overlay" aria-hidden="true" />
      <div className="fd-hero-inner">
        <div className="fd-eyebrow"><span />THE TASKDRIP RESOURCE LIBRARY</div>
        <h1>{slide.title || "Find useful resources for your next project."}</h1>
        <p className="fd-hero-copy">{slide.description || "Browse practical tools, templates and digital resources in one place."}</p>
        <SearchBox value={query} onChange={value => { setQuery(value); setPage(1); }} suggestions={suggestions} onChoose={slug => navigate(`/downloads/${slug}`)} onSubmit={submitSearch} />
        <div className="fd-hero-actions">
          <a className="fd-button" href={slide.ctaUrl || "#fd-library"} target={slide.ctaUrl?.startsWith("http") ? "_blank" : undefined} rel={slide.ctaUrl?.startsWith("http") ? "noopener noreferrer" : undefined}>{slide.ctaLabel || "Explore downloads"}<ArrowRight size={15} /></a>
          <a className="fd-button fd-button-outline" href="#fd-categories">Browse categories</a>
        </div>
        <div className="fd-hero-facts" aria-live="polite">
          <span><strong>{categoryItems.length.toLocaleString()}</strong> active categories</span>
          <span><strong>{totalResources.toLocaleString()}</strong> listed resources</span>
        </div>
      </div>
      {slides.length > 1 && <div className="fd-slide-controls" aria-label="Hero slide controls">
          <button type="button" aria-label="Previous slide" onClick={() => setHeroIndex((index) => (index - 1 + slides.length) % slides.length)}><ChevronLeft size={16} /></button>
          <div className="fd-slide-dots" aria-label="Choose featured slide">
            {slides.map((item: any, index: number) => <button key={item.id || index} type="button" className={index === heroIndex ? "is-active" : ""} aria-label={`Show slide ${index + 1}`} aria-pressed={index === heroIndex} onClick={() => setHeroIndex(index)} />)}
          </div>
          <button type="button" aria-label="Next slide" onClick={() => setHeroIndex((index) => (index + 1) % slides.length)}><ChevronRight size={16} /></button>
        </div>}
    </section>

    <nav id="fd-categories" className="fd-category-rail" aria-label="Browse resource categories">
      {categoryItems.map((item: any) => <button type="button" className={`fd-category-chip ${category === item.slug ? "is-active" : ""}`} aria-pressed={category === item.slug} key={item.id} onClick={() => {
        setCategory(current => current === item.slug ? "" : item.slug);
        setSubcategory("");
        setPage(1);
        document.getElementById("fd-library")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}>{item.name}<span>{Number(item.downloadCount || 0).toLocaleString()}</span></button>)}
    </nav>
    <section className="fd-section fd-category-explorer">
      <SectionTitle kicker="BROWSE THE LIBRARY" title="Explore by category" detail="Find documents, tools, software, audio, video and sermons in their own collections." />
      {categoryItems.length ? <div className="fd-category-grid">{categoryItems.map((item: any, index: number) => <Link className="fd-category-card" key={item.id} href={`/downloads/category/${item.slug}`}>
        <img src={item.imageUrl || [creatorHeroImage, toolsHeroImage, learningHeroImage][index % 3]} alt="" loading="lazy" />
        <div><strong>{item.name}</strong><span>{item.description || "Browse this collection"}</span><small>{Number(item.downloadCount || 0).toLocaleString()} resources</small></div><ArrowRight size={15} />
      </Link>)}</div> : categoriesQuery.isLoading || home.isLoading ? <LoadingBlock rows={4} /> : <EmptyBlock title="Categories are being refreshed" text="Please try again in a moment or search the library directly." />}
    </section>
    <div className="fd-feature-band">
      <div><div className="fd-kicker">COMMUNITY-SOURCED</div><h2>Need something specific?</h2><p>Tell the library team what would make your work easier.</p></div>
      <a className="fd-text-link" href="/downloads/request">Request a resource <ArrowRight size={16} /></a>
    </div>

    {featured.length > 0 && <section className="fd-section"><SectionTitle kicker="SELECTED BY THE TEAM" title="Worth a closer look" detail="Standout finds, checked and ready to use." /><ResourceGrid items={featured.slice(0, 3)} featured /></section>}
    <section className="fd-section" id="fd-library">
      <SectionTitle kicker={query ? "SEARCH RESULTS" : "THE LIBRARY"} title={query ? `Results for “${query}”` : activeCategory ? activeCategory.name : "Find your next useful thing"} detail={query ? `${list.data?.total ?? 0} resources found` : activeCategory ? "Browse the resources in this category, or adjust the filters below." : "Browse the full collection, with the newest additions first."} />
      <div className="fd-toolbar">
        <label className="sr-only" htmlFor="fd-sort">Sort resources</label>
        <select id="fd-sort" className="fd-select" value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}><option value="latest">Recently added</option><option value="popular">Most downloaded</option><option value="trending">Trending now</option><option value="oldest">Oldest first</option><option value="alphabetical">A–Z</option></select>
        {(query || category) && <button className="fd-button fd-button-outline" onClick={() => { setQuery(""); setCategory(""); setSubcategory(""); setPage(1); }}>Clear search & category</button>}
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
        <label>Category<select className="fd-select" value={category} onChange={e => { setCategory(e.target.value); setSubcategory(""); setPage(1); }}><option value="">All categories</option>{categoryItems.map((item: any) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
        <label>Subcategory<select className="fd-select" value={subcategory} disabled={!activeCategory?.subcategories?.length} onChange={e => { setSubcategory(e.target.value); setPage(1); }}><option value="">All subcategories</option>{(activeCategory?.subcategories || []).map((item: any) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
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
    {home.isError && <p className="fd-legal-note" role="status">Featured collections are temporarily unavailable. The searchable library is still open.</p>}
    <div className="fd-feature-band"><div><div className="fd-kicker">REQUEST DESK</div><h2>Make the library better.</h2><p>Request a resource and follow its progress from your member account.</p></div><Link className="fd-text-link" href="/downloads/request">Send a suggestion <ArrowRight size={15} /></Link></div>
  </FreeDownloadsShell>;
}
