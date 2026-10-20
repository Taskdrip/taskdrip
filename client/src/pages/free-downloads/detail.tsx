import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Download, ExternalLink, ShieldCheck, Share2 } from "lucide-react";
import { AdsterraSlot } from "@/components/ads/AdsterraSlot";
import { freeDownloadsApi, useAdminFreeDownloadPreview, useFreeDownloadDetail, useFreeDownloadPreview, useFreeDownloadUnlockStatus } from "@/lib/free-downloads-api";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBlock, FreeDownloadsShell, InlineNotice, LoadingBlock, ResourceGrid } from "./shared";
import { SeoHead } from "@/components/SeoHead";
import { getFreeDownloadFeaturedImage } from "@shared/free-download-artwork";

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

function getPreviewEmbedUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname === "www.youtube-nocookie.com" && url.pathname.startsWith("/embed/")) return url.toString();
    if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (url.hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")) return url.toString();
  } catch { /* Unsupported video URLs are shown as links instead of embedded. */ }
  return null;
}

export function FreeDownloadDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdminPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  const [unlockError, setUnlockError] = useState("");
  const [working, setWorking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [downloadCountdown, setDownloadCountdown] = useState<number | null>(null);
  const preview = useFreeDownloadPreview(slug, !!slug && !isAdminPreview);
  const detail = useFreeDownloadDetail(slug, isAuthenticated && !!slug && !isAdminPreview);
  const adminPreview = useAdminFreeDownloadPreview(slug, isAuthenticated && !!slug && isAdminPreview);
  const unlockStatus = useFreeDownloadUnlockStatus(slug, isAuthenticated && !!slug && !isAdminPreview);
  const path = `${window.location.pathname}${window.location.search}`;

  useEffect(() => {
    if (!authLoading && !isAuthenticated && isAdminPreview) {
      window.location.replace(`/login?redirect=${encodeURIComponent(path)}`);
    }
  }, [authLoading, isAuthenticated, isAdminPreview, path]);
  const resource = isAdminPreview ? adminPreview.data : detail.data;
  useEffect(() => {
    setUnlocked(!isAdminPreview && Boolean(unlockStatus.data?.unlocked || resource?.isUnlocked));
    setUnlockError("");
    setDownloadCountdown(null);
  }, [slug, isAdminPreview, unlockStatus.data?.unlocked, resource?.isUnlocked]);
  useEffect(() => {
    if (downloadCountdown === null) return;
    const timer = window.setTimeout(
      () => setDownloadCountdown((remaining) => remaining === null || remaining <= 1 ? null : remaining - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [downloadCountdown]);
  const jsonLd = useMemo(() => {
    if (!resource) return undefined;
    const category = `${resource.categoryName} ${resource.format}`.toLowerCase();
    const type = category.includes("software") || category.includes("ai")
      ? "SoftwareApplication"
      : category.includes("movie") || category.includes("video")
        ? "VideoObject"
        : category.includes("music") || category.includes("podcast") || category.includes("audio")
          ? "MusicRecording"
          : "CreativeWork";
    const work = {
      "@type": type,
      name: resource.title,
      description: resource.seo.description || resource.shortDescription,
      identifier: resource.downloadCode,
      url: `${window.location.origin}${window.location.pathname}`,
      image: resource.seo.ogImage || resource.thumbnailUrl || undefined,
      datePublished: resource.publishedAt || undefined,
      ...(type === "SoftwareApplication" ? { applicationCategory: resource.categoryName, operatingSystem: resource.systemRequirements || "Web" } : {}),
    };
    return {
      "@context": "https://schema.org",
      "@graph": [
        work,
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Taskdrip", item: window.location.origin },
            { "@type": "ListItem", position: 2, name: "Free Downloads", item: `${window.location.origin}/downloads` },
            { "@type": "ListItem", position: 3, name: resource.categoryName, item: `${window.location.origin}/downloads/category/${resource.categorySlug}` },
            { "@type": "ListItem", position: 4, name: resource.title, item: `${window.location.origin}${window.location.pathname}` },
          ],
        },
      ],
    };
  }, [resource]);
  async function unlock() {
    setUnlockError("");
    if (!resource) return;
    if (!resource.adRequired) { setUnlocked(true); return; }
    if (unlockStatus.data?.unlocked) { setUnlocked(true); return; }
    // The partner tab must be created directly in this click handler. Creating it after
    // an API await is routinely blocked by browser popup protection.
    const partnerTab = window.open("about:blank", "_blank");
    if (!partnerTab) { setUnlockError("Your browser blocked the partner tab. Allow pop-ups for Taskdrip, then try again. Nothing has been unlocked."); return; }
    try {
      partnerTab.document.title = "Opening partner page";
      partnerTab.document.body.innerHTML = "<main style='font:16px sans-serif;padding:32px;color:#302b40'>Opening the partner page…</main>";
    } catch { /* A blank tab is still a valid popup. */ }
    setWorking(true);
    try {
      const started = await freeDownloadsApi.startAd(slug);
      if (started.alreadyUnlocked) {
        partnerTab.close(); setUnlocked(true); return;
      }
      if (!started.redirectId || !started.redirectUrl) throw new Error("The partner redirect is not configured yet. Please try again later.");
      const destination = new URL(started.redirectUrl, window.location.origin);
      if (destination.origin !== window.location.origin || !destination.pathname.startsWith("/api/free-downloads/")) {
        throw new Error("The partner redirect could not be verified. Please try again.");
      }
      partnerTab.location.href = destination.href;
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (partnerTab.closed) throw new Error("The partner page was closed before Taskdrip could confirm the redirect. You have not been unlocked; retry when ready.");
        const status = await freeDownloadsApi.unlockStatus(slug);
        if (status.unlocked) {
          setUnlocked(true);
          setDownloadCountdown(4);
          return;
        }
        if (partnerTab.closed) throw new Error("The partner page was closed before Taskdrip could confirm the redirect. You have not been unlocked; retry when ready.");
        await wait(500);
      }
      throw new Error("Taskdrip could not confirm that the partner redirect opened. Nothing has been unlocked; you can retry.");
    } catch (e) {
      try { if (!partnerTab.closed) partnerTab.close(); } catch { /* ignore close errors */ }
      setUnlockError((e as Error).message || "The partner redirect did not complete. Please try again.");
    } finally { setWorking(false); }
  }

  if (authLoading || (isAdminPreview && !isAuthenticated)) return <FreeDownloadsShell><div className="fd-page-heading"><div className="fd-eyebrow"><span />MEMBER RESOURCE</div><h1>Opening your resource…</h1><p>Sign in to view this private preview.</p></div><LoadingBlock rows={1} /></FreeDownloadsShell>;
  if (!isAuthenticated) {
    if (preview.isLoading) return <FreeDownloadsShell><div className="fd-page-heading"><Link className="fd-text-link" href="/downloads"><ArrowLeft size={14} /> Resource library</Link></div><LoadingBlock rows={1} /></FreeDownloadsShell>;
    if (preview.isError || !preview.data) return <FreeDownloadsShell><div className="fd-page-heading"><Link className="fd-text-link" href="/downloads"><ArrowLeft size={14} /> Resource library</Link></div><ErrorBlock message={(preview.error as Error)?.message} retry={() => preview.refetch()} /></FreeDownloadsShell>;
    const guest = preview.data;
    const guestPreview = getPreviewEmbedUrl(guest.previewVideoUrl || undefined);
    const loginUrl = `/login?redirect=${encodeURIComponent(path)}`;
    const registerUrl = `/signup?redirect=${encodeURIComponent(path)}`;
    return <FreeDownloadsShell>
      <SeoHead title={guest.seo?.title || guest.title} description={guest.seo?.description || guest.shortDescription}
        keywords={guest.seo?.focusKeyword || undefined} ogTitle={guest.seo?.ogTitle || guest.title}
        ogDescription={guest.seo?.ogDescription || guest.shortDescription}
        ogImage={guest.seo?.ogImage || guest.thumbnailUrl || undefined} canonicalUrl={guest.seo?.canonicalUrl || undefined} />
      <nav className="fd-page-heading fd-breadcrumbs" aria-label="Breadcrumb">
        <Link className="fd-text-link" href="/downloads">Free Downloads</Link><span aria-hidden="true">/</span>
        <Link className="fd-text-link" href={`/downloads/category/${guest.categorySlug}`}>{guest.categoryName}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{guest.title}</span>
      </nav>
      <div className="fd-detail-layout">
        <article className="fd-detail-main">
          <div className="fd-detail-cover"><img src={guest.thumbnailUrl || getFreeDownloadFeaturedImage(guest.title, guest.format, guest.categoryName, guest.tags)} alt={`Representative ${guest.format || "digital resource"} image for ${guest.title}`} /></div>
          <div className="fd-eyebrow"><span />{guest.categoryName}</div><h1>{guest.title}</h1>
          <p className="fd-lede">{guest.shortDescription}</p>
          {guest.downloadCode && <p className="fd-download-code">Download code: <strong>{guest.downloadCode}</strong></p>}
          <div className="fd-tag-list">{(guest.tags || []).map(tag => <span className="fd-tag" key={tag}>{tag}</span>)}</div>
          {guest.previewVideoUrl && <section className="fd-section"><h2>Preview</h2>{guestPreview
            ? <div className="fd-video-frame"><iframe src={guestPreview} title={`${guest.title} preview`} loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
            : <a className="fd-text-link" href={guest.previewVideoUrl} target="_blank" rel="noopener noreferrer">Watch the preview <ExternalLink size={14} /></a>}</section>}
          {guest.creator && <p className="fd-legal-note">Published by {guest.creator}</p>}
          <div className="fd-rich-copy" dangerouslySetInnerHTML={{ __html: guest.descriptionHtml || "" }} />
          <AdsterraSlot position="article-inline" />
          {guest.features?.length > 0 && <section className="fd-section"><h2>What you can do</h2><ul>{guest.features.map(feature => <li key={feature}>{feature}</li>)}</ul></section>}
          {guest.systemRequirements && <section className="fd-section"><h2>System requirements</h2><p className="fd-rich-copy">{guest.systemRequirements}</p></section>}
          {guest.installationInstructions && <section className="fd-section"><h2>Getting started</h2><p className="fd-rich-copy">{guest.installationInstructions}</p></section>}
          {guest.galleryUrls?.length > 0 && <section className="fd-section"><h2>Inside the resource</h2><div className="fd-resource-grid">{guest.galleryUrls.map((url, i) => <img key={`${url}-${i}`} src={url} alt={`${guest.title} preview ${i + 1}`} loading="lazy" />)}</div></section>}
        </article>
        <aside className="fd-detail-side">
          <h2>Get this resource</h2>
          <dl><div><dt>Format</dt><dd>{guest.format || "Digital resource"}</dd></div>{guest.creator && <div><dt>Publisher</dt><dd>{guest.creator}</dd></div>}{guest.version && <div><dt>Version</dt><dd>{guest.version}</dd></div>}<div><dt>Downloads</dt><dd>{Number(guest.downloadCount || 0).toLocaleString()}</dd></div></dl>
          {guest.adRequired
            ? guest.smartlinkConfigured
              ? <p className="fd-ad-explain">Sign in or create a free account to continue. Your first resource click opens the Adsterra Smartlink in a new tab; return here and click again for the official resource.</p>
              : <InlineNotice kind="error">The Adsterra Smartlink is not configured yet. Please check back later.</InlineNotice>
            : <p>Details are open to everyone. Sign in or create a free Taskdrip account to continue to the publisher’s official resource.</p>}
          {(!guest.adRequired || guest.smartlinkConfigured)
            ? <><a className="fd-button" href={loginUrl}>Log in to get the resource</a>
              <a className="fd-button fd-button-outline" style={{ width: "100%", marginTop: 8 }} href={registerUrl}>Create an account</a></>
            : <button className="fd-button" disabled>Resource unavailable</button>}
        </aside>
      </div>
      {guest.related?.length > 0 && <section className="fd-section"><div className="fd-section-title"><div><span className="fd-kicker">MORE TO EXPLORE</span><h2>Related free resources</h2><p>More resources from the {guest.categoryName} collection.</p></div></div><ResourceGrid items={guest.related} /></section>}
      <AdsterraSlot position="article-end" />
    </FreeDownloadsShell>;
  }
  const activeQuery = isAdminPreview ? adminPreview : detail;
  if (activeQuery.isLoading) return <FreeDownloadsShell><div className="fd-page-heading"><Link className="fd-text-link" href="/downloads"><ArrowLeft size={14} /> Resource library</Link></div><LoadingBlock rows={2} /></FreeDownloadsShell>;
  if (activeQuery.isError || !resource) return <FreeDownloadsShell><div className="fd-page-heading"><Link className="fd-text-link" href="/downloads"><ArrowLeft size={14} /> Resource library</Link></div><ErrorBlock message={(activeQuery.error as Error)?.message} retry={() => activeQuery.refetch()} /></FreeDownloadsShell>;

  const secureFilePath = `/api/free-downloads/${encodeURIComponent(slug)}/file`;
  const isExternalResource = Boolean(resource.externalDemoUrl);
  const formatSize = resource.fileSizeBytes ? resource.fileSizeBytes > 1_000_000_000 ? `${(resource.fileSizeBytes / 1_000_000_000).toFixed(1)} GB` : `${Math.max(1, Math.round(resource.fileSizeBytes / 1_000_000))} MB` : "Not specified";
  const previewEmbed = getPreviewEmbedUrl(resource.previewVideoUrl);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareUrl = encodeURIComponent(pageUrl);
  const shareTitle = encodeURIComponent(resource.title);
  return <FreeDownloadsShell>
    <SeoHead
      title={resource.seo.title}
      description={resource.seo.description || resource.shortDescription}
      keywords={resource.seo.focusKeyword || undefined}
      ogTitle={resource.seo.ogTitle || resource.seo.title}
      ogDescription={resource.seo.ogDescription || resource.seo.description || resource.shortDescription}
      ogImage={resource.seo.ogImage || resource.thumbnailUrl || undefined}
      canonicalUrl={resource.seo.canonicalUrl || undefined}
      jsonLd={jsonLd}
    />
    {isAdminPreview && <InlineNotice kind="info"><strong>Private admin preview:</strong> This {resource.publicationStatus || "unpublished"} resource is not visible in public listings. Downloads stay disabled until publication.</InlineNotice>}
    <nav className="fd-page-heading fd-breadcrumbs" aria-label="Breadcrumb">
      <Link className="fd-text-link" href="/downloads">Free Downloads</Link><span aria-hidden="true">/</span>
      <Link className="fd-text-link" href={`/downloads/category/${resource.categorySlug}`}>{resource.categoryName}</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{resource.title}</span>
    </nav>
    <div className="fd-detail-layout">
      <article className="fd-detail-main">
        <div className="fd-detail-cover"><img src={resource.thumbnailUrl || getFreeDownloadFeaturedImage(resource.title, resource.format, resource.categoryName, resource.tags)} alt={`Representative ${resource.format || "digital resource"} image for ${resource.title}`} /></div>
        <div className="fd-eyebrow"><span />{resource.categoryName} {resource.subcategoryName ? ` / ${resource.subcategoryName}` : ""}</div>
        <h1>{resource.title}</h1><p className="fd-lede">{resource.shortDescription}</p>
        {resource.downloadCode && <p className="fd-download-code">Download code: <strong>{resource.downloadCode}</strong></p>}
        <div className="fd-tag-list">{(resource.tags || []).map(tag => <span className="fd-tag" key={tag}>{tag}</span>)}</div>
        <div className="fd-rich-copy" dangerouslySetInnerHTML={{ __html: resource.descriptionHtml || "" }} />
        <AdsterraSlot position="article-inline" />
        {resource.previewVideoUrl && <section className="fd-section"><h2>Preview</h2>{previewEmbed
          ? <div className="fd-video-frame"><iframe src={previewEmbed} title={`${resource.title} preview`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
          : <a className="fd-text-link" href={resource.previewVideoUrl} target="_blank" rel="noopener noreferrer">Watch the preview <ExternalLink size={14} /></a>}</section>}
        {resource.features?.length > 0 && <section className="fd-section"><h2>What’s included</h2><ul>{resource.features.map(feature => <li key={feature}>{feature}</li>)}</ul></section>}
        {resource.systemRequirements && <section className="fd-section"><h2>System requirements</h2><p className="fd-rich-copy">{resource.systemRequirements}</p></section>}
        {resource.installationInstructions && <section className="fd-section"><h2>Getting started</h2><p className="fd-rich-copy">{resource.installationInstructions}</p></section>}
        {resource.galleryUrls?.length > 0 && <section className="fd-section"><h2>Inside the resource</h2><div className="fd-resource-grid">{resource.galleryUrls.map((url, i) => <img key={`${url}-${i}`} src={url} alt={`${resource.title} preview ${i + 1}`} loading="lazy" />)}</div></section>}
        {resource.preacher && <div className="fd-preacher-box">{resource.preacher.photographUrl && <img className="fd-preacher-photo" src={resource.preacher.photographUrl} alt="" />}<div><strong>{resource.preacher.fullName}</strong><p>{resource.preacher.ministryName}</p><p>{resource.preacher.biography}</p><Link className="fd-text-link" href={`/downloads/preachers/${resource.preacher.slug}`}>More shared by {resource.preacher.fullName}</Link></div></div>}
      </article>
      <aside className="fd-detail-side">
        <h2>Resource details</h2>
        <dl><div><dt>Format</dt><dd>{resource.format}</dd></div><div><dt>File size</dt><dd>{formatSize}</dd></div>{resource.version && <div><dt>Version</dt><dd>{resource.version}</dd></div>}<div><dt>Downloads</dt><dd>{Number(resource.downloadCount || 0).toLocaleString()}</dd></div><div><dt>Permission</dt><dd>Shared for use</dd></div></dl>
        {unlockError && <InlineNotice kind="error">{unlockError}</InlineNotice>}
        {!isAdminPreview && resource.adRequired && !resource.smartlinkConfigured && <InlineNotice kind="error">The partner link is not configured yet. Please contact the library team.</InlineNotice>}
        {isAdminPreview ? <p className="fd-ad-explain">Publishing is required before users can download this resource.</p>
          : unlocked ? <><InlineNotice><ShieldCheck size={14} />{downloadCountdown !== null
              ? <>Access confirmed. Your official download link will be ready in {downloadCountdown} seconds.</>
              : <>Access confirmed. {isExternalResource ? "The official resource is ready." : "Your secure download is ready."}</>}</InlineNotice>
            {downloadCountdown !== null
              ? <button className="fd-button" disabled aria-live="polite">Preparing link · {downloadCountdown}s</button>
              : <a className="fd-button" href={secureFilePath}>{isExternalResource ? <ExternalLink size={15} /> : <Download size={15} />}{isExternalResource ? "OPEN OFFICIAL RESOURCE" : "DOWNLOAD NOW"}</a>}</>
            : <button className="fd-button" onClick={unlock} disabled={working || unlockStatus.isLoading || (resource.adRequired && !resource.smartlinkConfigured)}>{working ? "Opening partner redirect…" : resource.adRequired ? "GET FREE RESOURCE" : isExternalResource ? "OPEN FREE RESOURCE" : "Get the download"}{isExternalResource ? <ExternalLink size={15} /> : <Download size={15} />}</button>}
        {!isAdminPreview && resource.adRequired && <p className="fd-ad-explain">{unlocked
            ? "The first redirect is complete. Use the button above to open the publisher’s official download page."
            : "Your first click opens the Adsterra Smartlink in a new tab. Come back to this page and click again to open the publisher’s official download page."}</p>}
        <div className="fd-share-block"><span><Share2 size={13} /> Share this resource</span><div><a href={`https://wa.me/?text=${shareTitle}%20${shareUrl}`} target="_blank" rel="noopener noreferrer">WhatsApp</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer">Facebook</a><a href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer">X</a><a href={`https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`} target="_blank" rel="noopener noreferrer">Telegram</a></div></div>
        {unlockStatus.isError && <p className="fd-ad-explain">Unlock status could not be refreshed. You can retry the partner step.</p>}
        {resource.telegramUrl && <a className="fd-text-link" style={{ marginTop: 15 }} href={resource.telegramUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> More from this community</a>}
      </aside>
    </div>
    {!isAdminPreview && resource.related?.length > 0 && <section className="fd-section"><div className="fd-section-title"><div><span className="fd-kicker">MORE TO EXPLORE</span><h2>Related free resources</h2><p>More resources from the {resource.categoryName} collection.</p></div></div><ResourceGrid items={resource.related} /></section>}
    <AdsterraSlot position="article-end" />
    {preview.isError && <div className="fd-legal-note">Public preview metadata is temporarily unavailable.</div>}
  </FreeDownloadsShell>;
}
