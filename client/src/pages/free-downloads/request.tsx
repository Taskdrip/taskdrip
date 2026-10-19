import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { freeDownloadsApi, type FreeDownloadRequestInput } from "@/lib/free-downloads-api";
import { FreeDownloadsShell, InlineNotice, PageHeading, useDownloadAuthRedirect } from "./shared";

export function FreeDownloadRequestPage() {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const { isAuthenticated, isLoading } = useDownloadAuthRedirect(currentPath);
  const { user } = useAuth();
  const memberEmail = (user as any)?.email || "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<FreeDownloadRequestInput>({ resourceTitle: "", categoryName: "", description: "", preferredFormat: "", referenceUrl: "", additionalComments: "", website: "" });
  const update = (key: keyof FreeDownloadRequestInput, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!form.resourceTitle.trim() || !form.categoryName.trim() || !form.description.trim()) { setError("Add a resource name, category and short explanation before sending."); return; }
    setBusy(true);
    try {
      const response = await freeDownloadsApi.submitRequest(form);
      setSuccess(response?.message || "Your request is with the library team. You can follow its status from My requests.");
      setForm({ resourceTitle: "", categoryName: "", description: "", preferredFormat: "", referenceUrl: "", additionalComments: "", website: "" });
    } catch (e) { setError((e as Error).message || "Your request could not be sent. Please try again."); }
    finally { setBusy(false); }
  }
  return <FreeDownloadsShell>
    <PageHeading eyebrow="THE REQUEST DESK" title="What should we find next?" description="Tell us about a useful resource you would like to see. Requests are reviewed by the Taskdrip library team." />
    <div className="fd-detail-layout" style={{ paddingTop: 0 }}>
      <form className="fd-form" onSubmit={submit}>
        {error && <InlineNotice kind="error">{error}</InlineNotice>}{success && <InlineNotice>{success}</InlineNotice>}
        <div className="fd-form-grid">
          <div className="fd-field"><label htmlFor="resourceTitle">Resource name *</label><input className="fd-input" id="resourceTitle" value={form.resourceTitle} required onChange={e => update("resourceTitle", e.target.value)} placeholder="A tool, template or guide" /></div>
          <div className="fd-field"><label htmlFor="categoryName">Category *</label><input className="fd-input" id="categoryName" value={form.categoryName} required onChange={e => update("categoryName", e.target.value)} placeholder="Design, audio, AI…" /></div>
        </div>
        <div className="fd-field"><label htmlFor="description">What would it help you do? *</label><textarea className="fd-textarea" id="description" value={form.description} required onChange={e => update("description", e.target.value)} placeholder="A couple of details help us find the right thing." /></div>
        <div className="fd-form-grid">
          <div className="fd-field"><label htmlFor="preferredFormat">Preferred format</label><input className="fd-input" id="preferredFormat" value={form.preferredFormat} onChange={e => update("preferredFormat", e.target.value)} placeholder="PDF, app, audio…" /></div>
          <div className="fd-field"><label htmlFor="referenceUrl">Reference link</label><input className="fd-input" id="referenceUrl" type="url" value={form.referenceUrl} onChange={e => update("referenceUrl", e.target.value)} placeholder="https://" /></div>
        </div>
        <div className="fd-field"><label htmlFor="request-email">Account email</label><input className="fd-input" id="request-email" type="email" value={memberEmail} readOnly aria-readonly="true" /><small>We use the email on your Taskdrip account for updates.</small></div>
        <div className="fd-field"><label htmlFor="additionalComments">Anything else?</label><textarea className="fd-textarea" id="additionalComments" value={form.additionalComments} onChange={e => update("additionalComments", e.target.value)} placeholder="Optional context for the team." /></div>
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => update("website", e.target.value)} /></div>
        <div className="fd-admin-actions"><button className="fd-button" disabled={busy || isLoading || !isAuthenticated} type="submit">{busy ? "Sending…" : "Send request"}<Send size={14} /></button><Link className="fd-text-link" href="/downloads/my-requests">View my requests</Link></div>
      </form>
      <aside className="fd-detail-side"><h2>How requests work</h2><dl><div><dt>01</dt><dd>We review the resource and usage permissions.</dd></div><div><dt>02</dt><dd>The team updates the request status if we can help.</dd></div><div><dt>03</dt><dd>Find your response in My requests.</dd></div></dl><p className="fd-legal-note">Please request resources that can be shared legally. We cannot fulfil requests for pirated or unlicensed material.</p><Link className="fd-text-link" href="/downloads/my-requests"><ArrowLeft size={14} /> Request history</Link></aside>
    </div>
  </FreeDownloadsShell>;
}
