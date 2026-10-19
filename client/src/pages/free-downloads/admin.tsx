import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Copy, Edit3, ImagePlus, Plus, Save, Settings2, Trash2, UploadCloud, X } from "lucide-react";
import {
  freeDownloadsApi, useAdminFreeDownloadAnalytics, useAdminFreeDownloadCategories, useAdminFreeDownloadPreachers,
  useAdminFreeDownloadRequests, useAdminFreeDownloadSettings, useAdminFreeDownloadSlides, useAdminFreeDownloads,
} from "@/lib/free-downloads-api";
import { ErrorBlock, FreeDownloadsShell, InlineNotice, LoadingBlock, PageHeading, useDownloadAuthRedirect } from "./shared";

type Tab = "downloads" | "categories" | "preachers" | "requests" | "slides" | "settings" | "analytics";
type FormKind = "download" | "category" | "preacher" | "slide";
type FormValues = Record<string, string>;

const initialValues: Record<FormKind, FormValues> = {
  download: { title: "", slug: "", shortDescription: "", descriptionHtml: "", categoryId: "", subcategoryId: "", tags: "", format: "", version: "", creator: "", fileSizeBytes: "", releaseDate: "", preacherId: "", isFeatured: "false", systemRequirements: "", installationInstructions: "", features: "", thumbnailUrl: "", telegramUrl: "" },
  category: { name: "", slug: "", description: "", sortOrder: "0", imageUrl: "" },
  preacher: { fullName: "", slug: "", ministryName: "", biography: "", photographUrl: "" },
  slide: { title: "", subtitle: "", imageUrl: "", linkUrl: "", sortOrder: "0", isActive: "true" },
};
const labelFor: Record<FormKind, string> = { download: "resource", category: "category", preacher: "contributor", slide: "hero slide" };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function fieldLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).replace("Url", "URL").replace("Html", "HTML");
}
function displayDate(value: any) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleDateString();
}
function TabButton({ value, active, onClick, children }: { value: Tab; active: Tab; onClick: (tab: Tab) => void; children: React.ReactNode }) {
  return <button role="tab" aria-selected={active === value} onClick={() => onClick(value)}>{children}</button>;
}

export function AdminFreeDownloadsPage() {
  const path = `${window.location.pathname}${window.location.search}`;
  const { isAuthenticated } = useDownloadAuthRedirect(path);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("downloads");
  const [range, setRange] = useState("30d");
  const [modal, setModal] = useState<{ kind: FormKind; item?: any } | null>(null);
  const [values, setValues] = useState<FormValues>({ ...initialValues.download });
  const [privateFile, setPrivateFile] = useState<File | null>(null);
  const [publicImage, setPublicImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [requestDrafts, setRequestDrafts] = useState<Record<string, FormValues>>({});
  const [settingsDraft, setSettingsDraft] = useState<FormValues>({});

  const downloads = useAdminFreeDownloads(isAuthenticated);
  const categories = useAdminFreeDownloadCategories(isAuthenticated);
  const preachers = useAdminFreeDownloadPreachers(isAuthenticated);
  const settings = useAdminFreeDownloadSettings(isAuthenticated);
  const slides = useAdminFreeDownloadSlides(isAuthenticated);
  const requestFilters = useMemo(() => ({}), []);
  const requests = useAdminFreeDownloadRequests(requestFilters, isAuthenticated);
  const analytics = useAdminFreeDownloadAnalytics(range, isAuthenticated);

  const downloadItems = Array.isArray(downloads.data) ? downloads.data as any[] : [];
  const categoryItems = Array.isArray(categories.data) ? categories.data as any[] : [];
  const preacherItems = Array.isArray(preachers.data) ? preachers.data as any[] : [];
  const slideItems = Array.isArray(slides.data) ? slides.data as any[] : [];
  const requestItems = Array.isArray(requests.data) ? requests.data as any[] : [];
  const settingsData = (settings.data || {}) as Record<string, any>;

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: ["free-downloads", "admin"] });
    await queryClient.invalidateQueries({ queryKey: ["free-downloads", "categories"] });
  }
  async function act(action: () => Promise<any>, message: string) {
    setBusy(true); setNotice(null);
    try { await action(); await refreshAll(); setNotice({ kind: "success", text: message }); return true; }
    catch (error) { setNotice({ kind: "error", text: (error as Error).message || "That change could not be saved." }); return false; }
    finally { setBusy(false); }
  }
  function openForm(kind: FormKind, item?: any) {
    const defaults = { ...initialValues[kind] };
    if (item) for (const key of Object.keys(defaults)) {
      const value = item[key];
      defaults[key] = Array.isArray(value) ? value.join(", ") : value == null ? defaults[key] : String(value);
    }
    setValues(defaults); setPrivateFile(null); setPublicImage(null); setModal({ kind, item });
  }
  function setValue(key: string, value: string) { setValues(prev => ({ ...prev, [key]: value })); }

  async function saveForm(event: FormEvent) {
    event.preventDefault();
    if (!modal) return;
    setBusy(true); setNotice(null);
    try {
      const kind = modal.kind;
      const data: Record<string, unknown> = { ...values };
      if (kind === "download") {
        data.tags = values.tags.split(",").map(x => x.trim()).filter(Boolean);
        data.features = values.features.split("\n").map(x => x.trim()).filter(Boolean);
        data.isFeatured = values.isFeatured === "true";
        data.fileSizeBytes = values.fileSizeBytes ? Number(values.fileSizeBytes) : undefined;
        if (publicImage) {
          const image = await freeDownloadsApi.uploadMedia(publicImage);
          data.thumbnailUrl = image.url;
        }
        await freeDownloadsApi.saveDownload(data, privateFile, modal.item?.id);
      } else if (kind === "category") {
        data.sortOrder = Number(values.sortOrder || 0);
        if (publicImage) data.imageUrl = (await freeDownloadsApi.uploadMedia(publicImage)).url;
        if (modal.item?.id) await freeDownloadsApi.updateCategory(String(modal.item.id), data);
        else await freeDownloadsApi.createCategory(data);
      } else if (kind === "preacher") {
        if (publicImage) data.photographUrl = (await freeDownloadsApi.uploadMedia(publicImage)).url;
        if (modal.item?.id) await freeDownloadsApi.updatePreacher(String(modal.item.id), data);
        else await freeDownloadsApi.createPreacher(data);
      } else {
        data.sortOrder = Number(values.sortOrder || 0);
        data.isActive = values.isActive === "true";
        if (publicImage) data.imageUrl = (await freeDownloadsApi.uploadMedia(publicImage)).url;
        if (modal.item?.id) await freeDownloadsApi.updateSlide(String(modal.item.id), data);
        else await freeDownloadsApi.createSlide(data);
      }
      await refreshAll();
      setNotice({ kind: "success", text: `${fieldLabel(labelFor[kind])} saved.` });
      setModal(null);
    } catch (error) { setNotice({ kind: "error", text: (error as Error).message || "The item could not be saved." }); }
    finally { setBusy(false); }
  }

  async function deleteItem(kind: "download" | "category" | "preacher" | "slide", item: any) {
    if (!window.confirm(`Delete “${item.title || item.name || item.fullName || "this item"}”? This cannot be undone.`)) return;
    await act(async () => {
      if (kind === "download") return freeDownloadsApi.deleteDownload(String(item.id));
      if (kind === "category") return freeDownloadsApi.deleteCategory(String(item.id));
      if (kind === "preacher") return freeDownloadsApi.deletePreacher(String(item.id));
      return freeDownloadsApi.deleteSlide(String(item.id));
    }, `${fieldLabel(labelFor[kind])} deleted.`);
  }

  async function duplicate(item: any) {
    await act(() => freeDownloadsApi.duplicateDownload(String(item.id)), "Resource duplicated.");
  }
  async function addSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "");
    const categoryId = String(data.get("categoryId") || "");
    await act(() => freeDownloadsApi.createSubcategory({ name, slug: slugify(name), categoryId }), "Subcategory added.");
    event.currentTarget.reset();
  }
  async function deleteSubcategory(item: any) {
    if (!window.confirm(`Delete subcategory “${item.name}”?`)) return;
    await act(() => freeDownloadsApi.deleteSubcategory(String(item.id)), "Subcategory deleted.");
  }
  function requestDraft(item: any): FormValues {
    return requestDrafts[item.id] || { status: item.status || "pending", adminNotes: item.adminNotes || "", response: item.response || "", responseUrl: item.responseUrl || "" };
  }
  function updateRequestDraft(id: string, key: string, value: string) {
    setRequestDrafts(old => ({ ...old, [id]: { ...(old[id] || {}), [key]: value } }));
  }
  async function saveRequest(item: any) {
    const draft = requestDraft(item);
    await act(() => freeDownloadsApi.updateRequest(String(item.id), draft), "Request status and response saved.");
  }
  function saveSettings(event: FormEvent) {
    event.preventDefault();
    const smartlinkUrl = String(settingsDraft.smartlinkUrl ?? settingsData.smartlinkUrl ?? "");
    const enabled = String(settingsDraft.adsEnabled ?? settingsData.adsEnabled ?? settingsData.adEnabled ?? false) === "true";
    if (enabled && !smartlinkUrl.trim()) { setNotice({ kind: "error", text: "Add a Smartlink URL before enabling partner redirects." }); return; }
    if (enabled) {
      try { if (new URL(smartlinkUrl).protocol !== "https:") throw new Error(); }
      catch { setNotice({ kind: "error", text: "Smartlink must be a valid HTTPS URL before it can be enabled." }); return; }
    }
    act(() => freeDownloadsApi.saveSettings({ ...settingsData, ...settingsDraft, smartlinkUrl, adsEnabled: enabled }), "Smartlink settings saved.");
  }

  const isLoading = [downloads, categories, preachers, settings, slides, requests, analytics].some(query => query.isLoading);
  const failures = [downloads, categories, preachers, settings, slides, requests, analytics].filter(query => query.isError);
  return <FreeDownloadsShell>
    <PageHeading eyebrow="LIBRARY CONTROL ROOM" title="Free Downloads" description="Manage published resources, taxonomy, contributor profiles, requests and partner access." />
    {notice && <InlineNotice kind={notice.kind}>{notice.text}</InlineNotice>}
    {isLoading && <LoadingBlock rows={2} />}
    {failures.length > 0 && <ErrorBlock message={(failures[0].error as Error)?.message} retry={() => { downloads.refetch(); categories.refetch(); preachers.refetch(); settings.refetch(); slides.refetch(); requests.refetch(); analytics.refetch(); }} />}
    <div className="fd-admin-layout">
      <div className="fd-admin-tabs" role="tablist" aria-label="Free Downloads administration">
        <TabButton value="downloads" active={tab} onClick={setTab}>Resources</TabButton><TabButton value="categories" active={tab} onClick={setTab}>Categories</TabButton><TabButton value="preachers" active={tab} onClick={setTab}>Contributors</TabButton><TabButton value="requests" active={tab} onClick={setTab}>Requests</TabButton><TabButton value="slides" active={tab} onClick={setTab}>Hero slides</TabButton><TabButton value="settings" active={tab} onClick={setTab}>Smartlink</TabButton><TabButton value="analytics" active={tab} onClick={setTab}>Analytics</TabButton>
      </div>

      {tab === "downloads" && <section className="fd-admin-panel">
        <div className="fd-admin-heading-row"><h2>Published resources <span className="fd-legal-note">({downloadItems.length})</span></h2><button className="fd-button" onClick={() => openForm("download")}><Plus size={14} />Add resource</button></div>
        {downloadItems.length ? <div className="fd-table-wrap"><table className="fd-table"><thead><tr><th>Resource</th><th>Category</th><th>Format</th><th>Downloads</th><th>Actions</th></tr></thead><tbody>{downloadItems.map((item, i) => <tr key={item.id || i}><td><strong>{item.title}</strong><div className="fd-legal-note">{item.slug}</div></td><td>{item.categoryName || categoryItems.find(c => c.id === item.categoryId)?.name || "—"}</td><td>{item.format || "—"}</td><td>{Number(item.downloadCount || 0).toLocaleString()}</td><td><div className="fd-admin-actions"><button className="fd-button fd-button-outline" onClick={() => openForm("download", item)} aria-label={`Edit ${item.title}`}><Edit3 size={13} />Edit</button><button className="fd-button fd-button-outline" onClick={() => duplicate(item)} aria-label={`Duplicate ${item.title}`}><Copy size={13} />Copy</button><button className="fd-button fd-button-outline" onClick={() => deleteItem("download", item)} aria-label={`Delete ${item.title}`}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : <div className="fd-state"><strong>No resources published yet</strong><p>Add a resource with a private file and a separate public preview image.</p></div>}
      </section>}

      {tab === "categories" && <section className="fd-admin-panel">
        <div className="fd-admin-heading-row"><h2>Categories & subcategories</h2><button className="fd-button" onClick={() => openForm("category")}><Plus size={14} />Add category</button></div>
        <div className="fd-admin-panel"><h2>Add a subcategory</h2><form className="fd-form-grid" onSubmit={addSubcategory}><div className="fd-field"><label htmlFor="sub-category">Parent category</label><select className="fd-select" id="sub-category" name="categoryId" required>{categoryItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="fd-field"><label htmlFor="sub-name">Subcategory name</label><input className="fd-input" id="sub-name" name="name" required placeholder="For example, Brand kits" /></div><div><button className="fd-button" disabled={busy || !categoryItems.length}><Plus size={14} />Create subcategory</button></div></form></div>
        {categoryItems.map((cat, i) => <div className="fd-admin-panel" key={cat.id || i}><div className="fd-admin-heading-row"><div><h2>{cat.name}</h2><span className="fd-legal-note">{cat.slug} · {Number(cat.downloadCount || 0).toLocaleString()} resources</span></div><div className="fd-admin-actions"><button className="fd-button fd-button-outline" onClick={() => openForm("category", cat)}><Edit3 size={13} />Edit</button><button className="fd-button fd-button-outline" onClick={() => deleteItem("category", cat)}><Trash2 size={13} />Delete</button></div></div><p className="fd-legal-note">{cat.description}</p><div className="fd-admin-actions">{(cat.subcategories || []).map((sub: any) => <span key={sub.id} className="fd-tag">{sub.name}<button onClick={() => deleteSubcategory(sub)} aria-label={`Delete ${sub.name}`} style={{ border: 0, background: "transparent", cursor: "pointer" }}><X size={11} /></button></span>)}</div></div>)}
      </section>}

      {tab === "preachers" && <section className="fd-admin-panel">
        <div className="fd-admin-heading-row"><h2>Contributor profiles</h2><button className="fd-button" onClick={() => openForm("preacher")}><Plus size={14} />Add contributor</button></div>
        {preacherItems.length ? <div className="fd-table-wrap"><table className="fd-table"><thead><tr><th>Contributor</th><th>Ministry / organisation</th><th>Profile slug</th><th>Actions</th></tr></thead><tbody>{preacherItems.map((item, i) => <tr key={item.id || i}><td><strong>{item.fullName}</strong></td><td>{item.ministryName || "—"}</td><td>{item.slug}</td><td><div className="fd-admin-actions"><button className="fd-button fd-button-outline" onClick={() => openForm("preacher", item)}><Edit3 size={13} />Edit</button><button className="fd-button fd-button-outline" onClick={() => deleteItem("preacher", item)}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : <div className="fd-state"><strong>No contributor profiles yet</strong><p>Create a profile to connect resources to their source.</p></div>}
      </section>}

      {tab === "requests" && <section className="fd-admin-panel">
        <div className="fd-admin-heading-row"><h2>Member requests <span className="fd-legal-note">({requestItems.length})</span></h2></div>
        {requestItems.length ? <div className="fd-table-wrap"><table className="fd-table"><thead><tr><th>Request</th><th>Member / date</th><th>Status</th><th>Team notes & response</th><th>Save</th></tr></thead><tbody>{requestItems.map((item, i) => { const draft = requestDraft(item); return <tr key={item.id || i}><td><strong>{item.resourceTitle || item.title}</strong><div className="fd-legal-note">{item.categoryName} · {item.description}</div></td><td>{item.user?.name || item.userName || item.email || "Member"}<div className="fd-legal-note">{displayDate(item.createdAt)}</div></td><td><select className="fd-select" aria-label={`Status for ${item.resourceTitle}`} value={draft.status} onChange={e => updateRequestDraft(String(item.id), "status", e.target.value)}><option value="pending">Pending</option><option value="reviewing">Reviewing</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="completed">Completed</option></select></td><td><input className="fd-input" aria-label="Private admin notes" placeholder="Internal notes" value={draft.adminNotes} onChange={e => updateRequestDraft(String(item.id), "adminNotes", e.target.value)} /><input className="fd-input" aria-label="Member response" placeholder="Response to member" value={draft.response} onChange={e => updateRequestDraft(String(item.id), "response", e.target.value)} /><input className="fd-input" aria-label="Response URL" placeholder="Response link (optional)" value={draft.responseUrl} onChange={e => updateRequestDraft(String(item.id), "responseUrl", e.target.value)} /></td><td><button className="fd-button" disabled={busy} onClick={() => saveRequest(item)}><Save size={13} />Save</button></td></tr>; })}</tbody></table></div> : <div className="fd-state"><strong>No open requests</strong><p>Member suggestions will appear here when submitted.</p></div>}
      </section>}

      {tab === "slides" && <section className="fd-admin-panel"><div className="fd-admin-heading-row"><h2>Homepage hero slides</h2><button className="fd-button" onClick={() => openForm("slide")}><Plus size={14} />Add slide</button></div>{slideItems.length ? <div className="fd-table-wrap"><table className="fd-table"><thead><tr><th>Slide</th><th>Order</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{slideItems.map((item, i) => <tr key={item.id || i}><td><strong>{item.title}</strong><div className="fd-legal-note">{item.subtitle}</div></td><td>{item.sortOrder ?? "—"}</td><td><span className={`fd-status ${item.isActive ? "approved" : "pending"}`}>{item.isActive ? "Visible" : "Hidden"}</span></td><td><div className="fd-admin-actions"><button className="fd-button fd-button-outline" onClick={() => openForm("slide", item)}><Edit3 size={13} />Edit</button><button className="fd-button fd-button-outline" onClick={() => deleteItem("slide", item)}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : <div className="fd-state"><strong>No hero slides configured</strong><p>Add a slide to present a current collection on the library home.</p></div>}</section>}

      {tab === "settings" && <section className="fd-admin-panel"><div className="fd-admin-heading-row"><h2><Settings2 size={18} /> Smartlink settings</h2></div><p className="fd-legal-note">Members reach the secure download only after the redirect check completes. The partner URL must use HTTPS, and an empty Smartlink can never be enabled.</p><form className="fd-form" onSubmit={saveSettings}><div className="fd-field"><label htmlFor="smartlink">HTTPS Smartlink URL</label><input className="fd-input" id="smartlink" type="url" placeholder="https://…" value={settingsDraft.smartlinkUrl ?? settingsData.smartlinkUrl ?? ""} onChange={e => setSettingsDraft(old => ({ ...old, smartlinkUrl: e.target.value }))} /></div><div className="fd-field"><label htmlFor="ad-enabled">Partner redirect requirement</label><select className="fd-select" id="ad-enabled" value={String(settingsDraft.adsEnabled ?? settingsData.adsEnabled ?? settingsData.adEnabled ?? false)} onChange={e => setSettingsDraft(old => ({ ...old, adsEnabled: e.target.value }))}><option value="false">Disabled — show secure download immediately</option><option value="true" disabled={!String(settingsDraft.smartlinkUrl ?? settingsData.smartlinkUrl ?? "").trim()}>Enabled — require partner redirect</option></select></div><div><button className="fd-button" disabled={busy}><Save size={14} />Save settings</button></div></form></section>}

      {tab === "analytics" && <section className="fd-admin-panel"><div className="fd-admin-heading-row"><h2><BarChart3 size={18} /> Library analytics</h2><label className="fd-legal-note">Date range <select className="fd-select" value={range} onChange={e => setRange(e.target.value)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="365d">Last year</option></select></label></div>{analytics.isLoading ? <LoadingBlock rows={1} /> : analytics.isError ? <ErrorBlock message={(analytics.error as Error)?.message} retry={() => analytics.refetch()} /> : <AnalyticsView data={(analytics.data || {}) as Record<string, any>} />}</section>}
    </div>

    {modal && <div className="fd-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}><div className="fd-modal" role="dialog" aria-modal="true" aria-labelledby="fd-modal-title"><div className="fd-modal-head"><h2 id="fd-modal-title">{modal.item ? "Edit" : "Add"} {labelFor[modal.kind]}</h2><button className="fd-close" aria-label="Close form" onClick={() => setModal(null)}><X size={17} /></button></div><form className="fd-form" onSubmit={saveForm}>
      {Object.entries(values).map(([key, value]) => {
        if (["descriptionHtml", "systemRequirements", "installationInstructions", "biography", "subtitle", "shortDescription", "description"].includes(key)) return <div className="fd-field" key={key}><label htmlFor={`field-${key}`}>{fieldLabel(key)}</label><textarea className="fd-textarea" id={`field-${key}`} value={value} onChange={e => setValue(key, e.target.value)} /></div>;
        if (["isFeatured", "isActive"].includes(key)) return <div className="fd-field" key={key}><label htmlFor={`field-${key}`}>{fieldLabel(key)}</label><select className="fd-select" id={`field-${key}`} value={value} onChange={e => setValue(key, e.target.value)}><option value="false">No</option><option value="true">Yes</option></select></div>;
        if (key === "categoryId") return <div className="fd-field" key={key}><label htmlFor="field-categoryId">Category</label><select className="fd-select" id="field-categoryId" value={value} onChange={e => setValue(key, e.target.value)}><option value="">Choose a category</option>{categoryItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>;
        if (key === "subcategoryId") { const subs = categoryItems.find(c => c.id === values.categoryId)?.subcategories || []; return <div className="fd-field" key={key}><label htmlFor="field-subcategoryId">Subcategory</label><select className="fd-select" id="field-subcategoryId" value={value} onChange={e => setValue(key, e.target.value)}><option value="">None</option>{subs.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>; }
        if (key === "preacherId") return <div className="fd-field" key={key}><label htmlFor="field-preacherId">Contributor</label><select className="fd-select" id="field-preacherId" value={value} onChange={e => setValue(key, e.target.value)}><option value="">None</option>{preacherItems.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></div>;
        if (key === "tags" || key === "features") return <div className="fd-field" key={key}><label htmlFor={`field-${key}`}>{fieldLabel(key)}</label><textarea className="fd-textarea" id={`field-${key}`} value={value} onChange={e => setValue(key, e.target.value)} placeholder={key === "tags" ? "Comma separated" : "One feature per line"} /></div>;
        return <div className="fd-field" key={key}><label htmlFor={`field-${key}`}>{fieldLabel(key)}</label><input className="fd-input" id={`field-${key}`} type={key === "fileSizeBytes" || key === "sortOrder" ? "number" : key.toLowerCase().includes("url") ? "url" : "text"} value={value} onChange={e => { setValue(key, e.target.value); if (key === "title" && !modal.item) setValue("slug", slugify(e.target.value)); if (key === "name" && !modal.item) setValue("slug", slugify(e.target.value)); if (key === "fullName" && !modal.item) setValue("slug", slugify(e.target.value)); }} /></div>;
      })}
      {modal.kind === "download" && <div className="fd-field"><label htmlFor="private-download">Private downloadable file {modal.item ? "(optional replacement)" : "*"}</label><input id="private-download" className="fd-input" type="file" onChange={e => setPrivateFile(e.target.files?.[0] || null)} /><small>This file is uploaded through the protected download endpoint and is not a public image URL.</small></div>}
      <div className="fd-field"><label htmlFor="public-image"><ImagePlus size={13} /> Public image {modal.item ? "(optional replacement)" : ""}</label><input id="public-image" className="fd-input" type="file" accept="image/*" onChange={e => setPublicImage(e.target.files?.[0] || null)} /><small>Public cover / profile / slide art is uploaded separately and stored as media.</small></div>
      <p className="fd-legal-note">Only publish assets you have permission to share. Use the secure file upload for the downloadable resource and the image upload for public media.</p>
      <div className="fd-admin-actions"><button className="fd-button" disabled={busy || (modal.kind === "download" && !modal.item && !privateFile)}><Save size={14} />{busy ? "Saving…" : "Save changes"}</button><button type="button" className="fd-button fd-button-outline" onClick={() => setModal(null)}>Cancel</button></div>
    </form></div></div>}
  </FreeDownloadsShell>;
}

function AnalyticsView({ data }: { data: Record<string, any> }) {
  const fields = Object.entries(data).filter(([, value]) => typeof value === "number" || typeof value === "string").slice(0, 8);
  const top = data.topDownloads || data.topResources || data.popularDownloads || [];
  return <div><div className="fd-admin-cards">{fields.length ? fields.map(([key, value]) => <div className="fd-admin-stat" key={key}><span>{fieldLabel(key)}</span><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong></div>) : <div className="fd-admin-stat"><span>Overview</span><strong>—</strong></div>}</div>{Array.isArray(top) && top.length > 0 && <div className="fd-admin-panel" style={{ marginTop: 18 }}><h2>Most requested resources</h2><div className="fd-table-wrap"><table className="fd-table"><thead><tr><th>Resource</th><th>Downloads</th></tr></thead><tbody>{top.map((item: any, i: number) => <tr key={item.id || i}><td>{item.title || item.name}</td><td>{Number(item.downloadCount || item.downloads || 0).toLocaleString()}</td></tr>)}</tbody></table></div></div>}</div>;
}
