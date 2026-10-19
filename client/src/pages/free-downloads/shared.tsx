import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search, ArrowUpRight, Download, FileArchive, Music2, Video, Sparkles, Package, ShieldCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFreeDownloadPreview, type FreeDownloadSummary } from "@/lib/free-downloads-api";
import "./free-downloads.css";

export const basePath = "/downloads";

export function FreeDownloadsShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fd-page">
      <div className="fd-topline"><span className="fd-mark">TD</span><span>Taskdrip / Resource Library</span><span className="fd-topline-right"><ShieldCheck size={14} /> Permission-led resources</span></div>
      <div className="fd-container">{children}</div>
      <footer className="fd-footer"><span>Useful things, shared with permission.</span><Link href="/downloads/request">Suggest a resource <ArrowUpRight size={14} /></Link></footer>
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
  const { data: preview } = useFreeDownloadPreview(resource.slug);
  const item = preview || resource;
  const Icon = item.format?.toLowerCase().includes("mp3") || item.format?.toLowerCase().includes("audio") ? Music2
    : item.format?.toLowerCase().includes("video") || item.format?.toLowerCase().includes("mp4") ? Video
    : item.format?.toLowerCase().includes("ai") ? Sparkles : FileArchive;
  const size = item.fileSizeBytes ? item.fileSizeBytes > 1_000_000_000 ? `${(item.fileSizeBytes / 1_000_000_000).toFixed(1)} GB` : `${Math.max(1, Math.round(item.fileSizeBytes / 1_000_000))} MB` : "";
  return <article className={`fd-resource-card ${featured ? "fd-resource-featured" : ""}`}>
    <Link href={`${basePath}/${item.slug}`} className="fd-card-hit" aria-label={`View ${item.title}`} />
    <div className="fd-card-art">{item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" /> : <div className="fd-art-placeholder"><Icon size={27} strokeWidth={1.5} /><span>{item.format || "RESOURCE"}</span></div>}
      <span className="fd-card-format"><Icon size={12} />{item.format || "Digital"}</span>
      {item.isFeatured && <span className="fd-featured-tag">Staff pick</span>}
    </div>
    <div className="fd-card-content">
      <div className="fd-card-meta"><Link href={`${basePath}/category/${item.categorySlug}`} className="fd-category-link">{item.categoryName || "Resource"}</Link>{size && <span>{size}</span>}</div>
      <h3><Link href={`${basePath}/${item.slug}`}>{item.title}</Link></h3>
      <p>{item.shortDescription}</p>
      <div className="fd-card-foot"><span>{item.preacherSlug ? <Link href={`${basePath}/preachers/${item.preacherSlug}`}>{item.preacherName}</Link> : item.creator || "Taskdrip library"}</span><span className="fd-count"><Download size={13} />{Number(item.downloadCount || 0).toLocaleString()}</span></div>
    </div>
  </article>;
}

export function ResourceGrid({ items, featured = false }: { items: FreeDownloadSummary[]; featured?: boolean }) {
  return <div className="fd-resource-grid">{items.map(item => <ResourceCard key={item.id || item.slug} resource={item} featured={featured} />)}</div>;
}

export function SearchBox({ value, onChange, suggestions, onChoose, placeholder = "Search resources, tools and more" }: {
  value: string; onChange: (value: string) => void;
  suggestions?: { title: string; slug: string; categoryName: string }[];
  onChoose?: (slug: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(value.trim().length >= 2 && !!suggestions?.length); }, [value, suggestions]);
  return <div className="fd-search-wrap"><Search size={19} /><input aria-label="Search free downloads" value={value} onChange={e => onChange(e.target.value)} onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }} placeholder={placeholder} />
    {value && <button className="fd-search-clear" onClick={() => { onChange(""); setOpen(false); }} aria-label="Clear search">Clear</button>}
    {open && !!suggestions?.length && <div className="fd-suggestions" role="listbox">{suggestions.map(s => <button role="option" key={s.slug} onClick={() => { onChoose?.(s.slug); setOpen(false); }}><span>{s.title}</span><small>{s.categoryName}</small></button>)}</div>}
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
