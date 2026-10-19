import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { freeDownloadsApi, useFreeDownloadDetail, useFreeDownloadPreview, useFreeDownloadUnlockStatus } from "@/lib/free-downloads-api";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBlock, FreeDownloadsShell, InlineNotice, LoadingBlock, ResourceGrid } from "./shared";

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

export function FreeDownloadDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [unlockError, setUnlockError] = useState("");
  const [working, setWorking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const preview = useFreeDownloadPreview(slug);
  const detail = useFreeDownloadDetail(slug, isAuthenticated && !!slug);
  const unlockStatus = useFreeDownloadUnlockStatus(slug, isAuthenticated && !!slug);
  const path = `${window.location.pathname}${window.location.search}`;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) window.location.replace(`/login?redirect=${encodeURIComponent(path)}`);
  }, [authLoading, isAuthenticated, path]);
  useEffect(() => { if (unlockStatus.data?.unlocked) setUnlocked(true); }, [unlockStatus.data?.unlocked]);

  const resource = detail.data;
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
      if (!started.redirectId || !started.smartlinkUrl) throw new Error("The partner redirect is not configured yet. Please try again later.");
      const destination = new URL(started.smartlinkUrl);
      if (destination.protocol !== "https:") throw new Error("The partner destination could not be verified as a secure HTTPS link.");
      partnerTab.location.href = destination.href;
      await wait(3500);
      if (partnerTab.closed) throw new Error("The partner page tab was closed before we could confirm it stayed open. You have not been unlocked; you can try again.");
      const result = await freeDownloadsApi.completeAd(slug, started.redirectId);
      if (!result.unlocked && !result.alreadyUnlocked) throw new Error("Taskdrip could not confirm the partner redirect. You have not been unlocked; please retry.");
      setUnlocked(true);
    } catch (e) {
      try { if (!partnerTab.closed) partnerTab.close(); } catch { /* ignore close errors */ }
      setUnlockError((e as Error).message || "The partner redirect did not complete. Please try again.");
    } finally { setWorking(false); }
  }

  if (authLoading || !isAuthenticated) return <FreeDownloadsShell><div className="fd-page-heading"><div className="fd-eyebrow"><span />MEMBER RESOURCE</div><h1>Opening your resource…</h1><p>Sign in to view full details and access the secure download.</p></div><LoadingBlock rows={1} /></FreeDownloadsShell>;
  if (detail.isLoading) return <FreeDownloadsShell><div className="fd-page-heading"><Link className="fd-text-link" href="/downloads"><ArrowLeft size={14} /> Resource library</Link></div><LoadingBlock rows={2} /></FreeDownloadsShell>;
  if (detail.isError || !resource) return <FreeDownloadsShell><div className="fd-page-heading"><Link className="fd-text-link" href="/downloads"><ArrowLeft size={14} /> Resource library</Link></div><ErrorBlock message={(detail.error as Error)?.message} retry={() => detail.refetch()} /></FreeDownloadsShell>;

  const secureFilePath = `/api/free-downloads/${encodeURIComponent(slug)}/file`;
  const formatSize = resource.fileSizeBytes ? resource.fileSizeBytes > 1_000_000_000 ? `${(resource.fileSizeBytes / 1_000_000_000).toFixed(1)} GB` : `${Math.max(1, Math.round(resource.fileSizeBytes / 1_000_000))} MB` : "Not specified";
  return <FreeDownloadsShell>
    <div className="fd-page-heading"><Link className="fd-text-link" href="/downloads"><ArrowLeft size={14} /> Back to library</Link></div>
    <div className="fd-detail-layout">
      <article className="fd-detail-main">
        <div className="fd-detail-cover">{resource.thumbnailUrl ? <img src={resource.thumbnailUrl} alt={`${resource.title} cover`} /> : <div className="fd-art-placeholder"><Download size={36} /><span>{resource.format || "DIGITAL RESOURCE"}</span></div>}</div>
        <div className="fd-eyebrow"><span />{resource.categoryName} {resource.subcategoryName ? ` / ${resource.subcategoryName}` : ""}</div>
        <h1>{resource.title}</h1><p className="fd-lede">{resource.shortDescription}</p>
        <div className="fd-tag-list">{(resource.tags || []).map(tag => <span className="fd-tag" key={tag}>{tag}</span>)}</div>
        <div className="fd-rich-copy" dangerouslySetInnerHTML={{ __html: resource.descriptionHtml || "" }} />
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
        {unlocked ? <><InlineNotice><ShieldCheck size={14} /> Access confirmed. Your secure download is ready.</InlineNotice><a className="fd-button" href={secureFilePath}><Download size={15} />Download securely</a></> : <button className="fd-button" onClick={unlock} disabled={working || unlockStatus.isLoading}>{working ? "Checking partner visit…" : resource.adRequired ? "Continue to unlock" : "Get the download"}<Download size={15} /></button>}
        {resource.adRequired && <p className="fd-ad-explain">A partner page opens in a new tab. Keeping that tab open briefly lets Taskdrip confirm the redirect; opening the page is not proof that an ad was viewed. If the redirect fails, retry here. Your file is only available after confirmation.</p>}
        {unlockStatus.isError && <p className="fd-ad-explain">Unlock status could not be refreshed. You can retry the partner step.</p>}
        {resource.telegramUrl && <a className="fd-text-link" style={{ marginTop: 15 }} href={resource.telegramUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> More from this community</a>}
      </aside>
    </div>
    {resource.related?.length > 0 && <section className="fd-section"><h2>Related resources</h2><ResourceGrid items={resource.related} /></section>}
    {preview.isError && <div className="fd-legal-note">Public preview metadata is temporarily unavailable.</div>}
  </FreeDownloadsShell>;
}
