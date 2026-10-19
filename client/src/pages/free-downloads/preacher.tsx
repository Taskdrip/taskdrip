import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useFreeDownloadList, useFreeDownloadPreacher } from "@/lib/free-downloads-api";
import { EmptyBlock, ErrorBlock, FreeDownloadsShell, LoadingBlock, ResourceGrid } from "./shared";

export function FreeDownloadPreacherPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const profile = useFreeDownloadPreacher(slug, !!slug);
  const filters = useMemo(() => ({ preacher: slug, sort: "latest" as const, page, limit: 12 }), [slug, page]);
  const list = useFreeDownloadList(filters, !!slug);
  const preacher = profile.data?.preacher;
  const first = list.data?.items.find(item => item.preacherSlug === slug) || list.data?.items[0];
  const name = preacher?.fullName || first?.preacherName || slug.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  return <FreeDownloadsShell>
    <div className="fd-page-heading"><div className="fd-eyebrow"><span />CONTRIBUTOR COLLECTION</div><h1>{name}</h1><p>{preacher?.ministryName || "Preacher / minister"} · Resources shared with permission for the Taskdrip community.</p></div>
    <div className="fd-preacher-box">
      {preacher?.photographUrl ? <img className="fd-preacher-photo" src={preacher.photographUrl} alt={preacher.fullName} /> : <div className="fd-preacher-photo fd-art-placeholder" aria-hidden="true">TD</div>}
      <div><strong>{preacher?.fullName || name}</strong><p>{preacher?.ministryName || "Ministry details not provided."}</p>
        {preacher?.biography && <p>{preacher.biography}</p>}
        <small className="fd-legal-note">Please review the creator's terms before use.</small>
      </div>
    </div>
    <div className="fd-admin-heading-row"><Link className="fd-text-link" href="/downloads">← Resource library</Link><span className="fd-count">{list.data?.total ?? 0} resources</span></div>
    {profile.isLoading && !preacher ? <LoadingBlock rows={1} /> : profile.isError && !list.data?.items.length ? <ErrorBlock message={(profile.error as Error)?.message} retry={() => profile.refetch()} /> : list.isLoading ? <LoadingBlock /> : list.isError ? <ErrorBlock message={(list.error as Error)?.message} retry={() => list.refetch()} /> : list.data?.items.length ? <ResourceGrid items={list.data.items} /> : <EmptyBlock title="No shared resources yet" text="This contributor's collection is being built. Browse the rest of the library in the meantime." action={<Link className="fd-button fd-button-outline" href="/downloads">Browse the library</Link>} />}
    {list.data && list.data.pageCount > 1 && <div className="fd-pagination"><button className="fd-button fd-button-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {list.data.page} of {list.data.pageCount}</span><button className="fd-button fd-button-outline" disabled={page >= list.data.pageCount} onClick={() => setPage(p => p + 1)}>Next</button></div>}
  </FreeDownloadsShell>;
}
