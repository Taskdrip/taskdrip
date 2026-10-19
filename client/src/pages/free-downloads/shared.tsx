import { KeyboardEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { Search, ArrowUpRight, Download, FileArchive, Music2, Video, Sparkles, Package, ShieldCheck, RefreshCw, ChevronDown, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFreeDownloadCategories, type FreeDownloadSummary } from "@/lib/free-downloads-api";
import "./free-downloads.css";

export const basePath = "/downloads";

export function FreeDownloadsShell({ children, categories: categoryOverride }: { children: React.ReactNode; categories?: Array<{ id: string; slug: string; name: string }> }) {
  const { isAuthenticated, user } = useAuth();
  const categories = useFreeDownloadCategories();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentUser = user as any;
  const accountName = currentUser?.firstName || currentUser?.email?.split("@")[0] || "My account";
  const categoryItems = categoryOverride || categories.data || [];
  return (
    <main className="fd-page">
      <header className="fd-site-header">
        <Link className="fd-brand" href="/" aria-label="Taskdrip home">
          <img src="/taskdrip-logo.jpg" alt="" />
          <span>Taskdrip</span>
        </Link>
        <button className="fd-mobile-menu-toggle" type="button" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
        <nav className={`fd-site-nav ${mobileMenuOpen ? "is-open" : ""}`} aria-label="Resource library navigation" onClick={event => {
          if ((event.target as HTMLElement).closest("a")) setMobileMenuOpen(false);
        }}>
          <Link href="/">Home</Link>
          <Link href="/downloads">Free Downloads</Link>
          <details className="fd-nav-categories">
            <summary>Categories <ChevronDown size={13} /></summary>
            <div className="fd-nav-category-menu">
              {categoryItems.map((category) => <Link key={category.id} href={`/downloads/category/${category.slug}`}>{category.name}</Link>)}
            </div>
          </details>
          <Link href="/downloads/request">Request a Download</Link>
          <a href="https://t.me/taskdrip" target="_blank" rel="noreferrer">Telegram Community</a>
        </nav>
        <div className="fd-header-account">
          {isAuthenticated
            ? <><Link href="/downloads/my-requests">{accountName}</Link><Link className="fd-account-secondary" href="/dashboard">Account</Link></>
            : <><Link href="/login">Log in</Link><Link className="fd-account-primary" href="/signup">Register</Link></>}
        </div>
      </header>
      <div className="fd-topline"><span className="fd-mark">TD</span><span>Taskdrip / Resource Library</span><span className="fd-topline-right"><ShieldCheck size={14} /> Permission-led resources</span></div>
      <div className="fd-container">{children}</div>
      <footer className="fd-footer">
        <div className="fd-footer-inner">
          <div className="fd-footer-brand">
            <Link className="fd-brand" href="/" aria-label="Taskdrip home">
              <img src="/taskdrip-logo.jpg" alt="" />
              <span>Taskdrip</span>
            </Link>
            <p>Useful tools and resources for the work you do. Shared with permission and linked to their official sources.</p>
          </div>
          <nav className="fd-footer-links" aria-label="Resource library links">
            <strong>Library</strong>
            <Link href="/downloads">Browse free downloads</Link>
            <Link href="/downloads/request">Request a resource</Link>
            <Link href="/downloads/my-requests">My requests</Link>
          </nav>
          <nav className="fd-footer-links" aria-label="Resource categories">
            <strong>Categories</strong>
            {categoryItems.slice(0, 5).map((category) =>
              <Link key={category.id} href={`/downloads/category/${category.slug}`}>{category.name}</Link>,
            )}
            {!categoryItems.length && <Link href="/downloads">Explore the library</Link>}
          </nav>
          <nav className="fd-footer-links" aria-label="Taskdrip links">
            <strong>Taskdrip</strong>
            <Link href="/">Home</Link>
            <a href="https://t.me/taskdrip" target="_blank" rel="noopener noreferrer">Telegram community</a>
            {isAuthenticated
              ? <Link href="/dashboard">My account</Link>
              : <><Link href="/login">Log in</Link><Link href="/signup">Create an account</Link></>}
          </nav>
          <div className="fd-footer-bottom">
            <span>© {new Date().getFullYear()} Taskdrip. Useful things, shared with permission.</span>
            <span>Downloads link to the official provider. Check each provider’s terms and system requirements.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="fd-eyebrow"><span />{children}</div>;
}

export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <header className="fd-page-heading">{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h1>{title}</h1>{description && <p>{description}</p>}</header>;
}

export function SectionTitle({ kicker, title, detail, href, linkText = "View all" }: { kicker?: string; title: string; detail?: string; href?: string; linkText?: string }) {
  return <div className="fd-section-title"><div>{kicker && <span className="fd-kicker">{kicker}</span>}<h2>{title}</h2>{detail && <p>{detail}</p>}</div>{href && <Link className="fd-text-link" href={href}>{linkText}<ArrowUpRight size={15} /></Link>}</div>;
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="fd-skeleton-grid" aria-label="Loading resources">{Array.from({ length: rows }).map((_, i) => <div className="fd-skeleton" key={i}><div /><span /><span /></div>)}</div>;
}

export function ErrorBlock({ message, retry }: { message?: string; retry: () => void }) {
  return <div className="fd-state fd-error"><div className="fd-state-icon"><RefreshCw size={19} /></div><strong>We couldn't load this part of the library.</strong><p>{message || "Please check your connection and try again."}</p><button className="fd-button fd-button-outline" onClick={retry}>Try again</button></div>;
}

export function EmptyBlock({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="fd-state"><div className="fd-state-icon"><Package size={20} /></div><strong>{title}</strong><p>{text}</p>{action}</div>;
}

export function ResourceCard({ resource, featured = false }: { resource: FreeDownloadSummary; featured?: boolean }) {
  const item = resource;
  const Icon = item.format?.toLowerCase().includes("mp3") || item.format?.toLowerCase().includes("audio") ? Music2
    : item.format?.toLowerCase().includes("video") || item.format?.toLowerCase().includes("mp4") ? Video
    : item.format?.toLowerCase().includes("ai") ? Sparkles : FileArchive;
  const size = item.fileSizeBytes ? item.fileSizeBytes > 1_000_000_000 ? `${(item.fileSizeBytes / 1_000_000_000).toFixed(1)} GB` : `${Math.max(1, Math.round(item.fileSizeBytes / 1_000_000))} MB` : "";
  return <article className={`fd-resource-card ${featured ? "fd-resource-featured" : ""}`}>
    <Link href={`${basePath}/${item.slug}`} className="fd-card-hit" aria-label={`View ${item.title}`} />
    <div className="fd-card-art">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" /> : <div className="fd-art-placeholder"><Icon size={27} strokeWidth={1.5} /><span>{item.format || "RESOURCE"}</span></div>}
      <span className="fd-card-format"><Icon size={12} />{item.format || "Digital"}</span>
      {item.isFeatured && <span className="fd-featured-tag">Staff pick</span>}
      {item.previewVideoUrl && <span className="fd-preview-tag">Preview</span>}
    </div>
    <div className="fd-card-content">
      <div className="fd-card-meta"><Link href={`${basePath}/category/${item.categorySlug}`} className="fd-category-link">{item.categoryName || "Resource"}</Link>{size && <span>{size}</span>}</div>
      <h3><Link href={`${basePath}/${item.slug}`}>{item.title}</Link></h3>
      <p>{item.shortDescription}</p>
      <div className="fd-card-foot"><span>{item.preacherSlug ? <Link href={`${basePath}/preachers/${item.preacherSlug}`}>{item.preacherName}</Link> : item.creator || "Taskdrip library"}</span><span className="fd-count"><Download size={13} />{Number(item.downloadCount || 0).toLocaleString()}</span></div>
      {item.publishedAt && <small className="fd-card-date">Added {new Date(item.publishedAt).toLocaleDateString()}</small>}
      {item.downloadCode && <span className="fd-resource-code" title="Unique download code">{item.downloadCode}</span>}
      <Link className="fd-card-detail-link" href={`${basePath}/${item.slug}`}>View details <ArrowUpRight size={13} /></Link>
    </div>
  </article>;
}

export function ResourceGrid({ items, featured = false }: { items: FreeDownloadSummary[]; featured?: boolean }) {
  return <div className="fd-resource-grid">{items.map(item => <ResourceCard key={item.id || item.slug} resource={item} featured={featured} />)}</div>;
}

export function SearchBox({ value, onChange, suggestions, onChoose, onSubmit, placeholder = "Search resources, tools and more" }: {
  value: string; onChange: (value: string) => void;
  suggestions?: { title: string; slug: string; downloadCode?: string; categoryName: string }[];
  onChoose?: (slug: string) => void; placeholder?: string;
  onSubmit?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => { setOpen(value.trim().length >= 2 && !!suggestions?.length); }, [value, suggestions]);
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown" && suggestions?.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions?.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && suggestions?.[activeIndex]) {
        onChoose?.(suggestions[activeIndex].slug);
        setOpen(false);
      } else {
        onSubmit?.(value);
      }
    }
  }
  return <div className="fd-search-wrap"><Search size={19} /><input aria-label="Search free downloads" role="combobox" aria-expanded={open && !!suggestions?.length} aria-controls="fd-search-suggestions" aria-autocomplete="list" value={value} onChange={e => { onChange(e.target.value); setActiveIndex(0); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown} placeholder={placeholder} />
    {value && <button className="fd-search-clear" onClick={() => { onChange(""); setOpen(false); }} aria-label="Clear search">Clear</button>}
    {open && !!suggestions?.length && <div className="fd-suggestions" id="fd-search-suggestions" role="listbox">{suggestions.map((s, index) => <button role="option" aria-selected={index === activeIndex} key={s.slug} onMouseEnter={() => setActiveIndex(index)} onClick={() => { onChoose?.(s.slug); setOpen(false); }}><span>{s.title}{s.downloadCode && <small className="fd-suggestion-code">{s.downloadCode}</small>}</span><small>{s.categoryName}</small></button>)}</div>}
  </div>;
}

export function useDownloadAuthRedirect(path: string) {
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.replace(`/login?redirect=${encodeURIComponent(path)}`);
  }, [isAuthenticated, isLoading, path]);
  return { isAuthenticated, isLoading };
}

export function InlineNotice({ kind = "success", children }: { kind?: "success" | "error" | "info"; children: React.ReactNode }) {
  return <div className={`fd-notice fd-notice-${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}
