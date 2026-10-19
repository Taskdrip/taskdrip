import { Link } from "wouter";
import { RefreshCw } from "lucide-react";
import { useMyFreeDownloadRequests } from "@/lib/free-downloads-api";
import { EmptyBlock, ErrorBlock, FreeDownloadsShell, PageHeading, useDownloadAuthRedirect } from "./shared";

export function MyFreeDownloadRequestsPage() {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const { isAuthenticated } = useDownloadAuthRedirect(currentPath);
  const requests = useMyFreeDownloadRequests(isAuthenticated);
  const items = Array.isArray(requests.data) ? requests.data as any[] : [];
  return <FreeDownloadsShell>
    <PageHeading eyebrow="YOUR LIBRARY ACTIVITY" title="My requests" description="Keep track of resource suggestions and responses from the Taskdrip library team." />
    <div className="fd-admin-heading-row"><Link className="fd-text-link" href="/downloads">← Back to resources</Link><Link className="fd-button" href="/downloads/request">Request a resource</Link></div>
    {requests.isLoading ? <div className="fd-skeleton-grid">{[1,2,3].map(n => <div className="fd-skeleton" key={n}><div /><span /><span /></div>)}</div> : requests.isError ? <ErrorBlock message={(requests.error as Error)?.message} retry={() => requests.refetch()} /> : items.length ? <div className="fd-table-wrap"><table className="fd-table"><thead><tr><th>Resource</th><th>Category</th><th>Requested</th><th>Status</th><th>Team response</th></tr></thead><tbody>{items.map((item, index) => {
      const status = String(item.status || "pending").toLowerCase();
       return <tr key={item.id || index}><td><strong>{item.resourceTitle || item.title || "Resource request"}</strong><div className="fd-legal-note">{item.description || ""}</div></td><td>{item.categoryName || "—"}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</td><td><span className={`fd-status ${status}`}>{item.status || "Pending"}</span></td><td>{item.response || "The team has not left a response yet."}{item.linkedDownloadSlug && <div><Link className="fd-text-link" href={`/downloads/${item.linkedDownloadSlug}`}>View {item.linkedDownloadTitle || "available resource"}</Link></div>}</td></tr>;
    })}</tbody></table></div> : <EmptyBlock title="No requests yet" text="When you suggest a resource, its review status will appear here." action={<Link className="fd-button" href="/downloads/request">Send your first request</Link>} />}
    {requests.isFetching && !requests.isLoading && <p className="fd-legal-note"><RefreshCw size={12} /> Refreshing request status…</p>}
  </FreeDownloadsShell>;
}
