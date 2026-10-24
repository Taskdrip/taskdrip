import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AlertCircle, ArrowLeft, Building2, Check, ChevronDown, Clock3, Mail, Search, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

type CitygateApplication = {
  id: string | number;
  status?: string | null;
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  state?: string;
  loanType?: string;
  employmentStatus?: string;
  businessType?: string;
  productSold?: string;
  sixMonthTurnover?: number | string;
  monthlyNetIncome?: number | string;
  assetAmount?: number | string;
  requestedAmount?: number | string;
  tenureMonths?: number | string;
  estimateNaira?: number | string;
  estimate?: number | string;
  estimateBasis?: string;
  emailSent?: boolean;
  emailNotificationSent?: boolean;
  createdAt?: string;
  consent?: boolean;
  marketingConsent?: boolean;
};

const statusChoices = ["new", "reviewing", "contacted", "approved", "declined", "archived"];
const ngn = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const amount = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "Not provided";
  const number = Number(value);
  return Number.isFinite(number) ? ngn.format(number) : String(value);
};
const readable = (value?: string | null) => value ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not provided";

async function fetchApplications(url: string): Promise<CitygateApplication[]> {
  const response = await apiRequest("GET", url);
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  return payload?.applications ?? payload?.items ?? payload?.data ?? [];
}

export default function AdminCitygateLoans() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams({ search, status });
    return `/api/admin/citygate-loan-applications?${params.toString()}`;
  }, [search, status]);
  const applicationsQuery = useQuery<CitygateApplication[]>({
    queryKey: ["/api/admin/citygate-loan-applications", search, status],
    queryFn: () => fetchApplications(queryUrl),
    enabled: isAdmin,
    staleTime: 15_000,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string | number; nextStatus: string }) =>
      apiRequest("PATCH", `/api/admin/citygate-loan-applications/${encodeURIComponent(String(id))}/status`, { status: nextStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/citygate-loan-applications"] }),
  });

  if (authLoading) {
    return <main className="cg-admin cg-admin-state"><style>{adminStyles}</style><div className="cg-loading-panel" aria-label="Loading administrator access"><i /><i /><i /></div></main>;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="cg-admin cg-admin-state">
        <style>{adminStyles}</style>
        <section className="cg-access-panel">
          <span className="cg-access-icon"><ShieldCheck size={24} /></span>
          <p className="cg-kicker">Restricted workspace</p>
          <h1>Administrator access required</h1>
          <p>Sign in with an administrator account to manage Citygate Global enquiries.</p>
          <button className="cg-primary" type="button" onClick={() => navigate(`/admin-login?redirect=${encodeURIComponent("/admin/citygate-loans")}`)}>Sign in</button>
        </section>
      </main>
    );
  }

  const applications = applicationsQuery.data ?? [];
  const statusOptions = Array.from(new Set([...statusChoices, ...applications.map((application) => application.status).filter((value): value is string => Boolean(value))]));
  const retry = () => { void applicationsQuery.refetch(); };

  return (
    <main className="cg-admin">
      <style>{adminStyles}</style>
      <div className="cg-admin-shell">
        <header className="cg-admin-topbar">
          <Link href="/admin" className="cg-back-link"><ArrowLeft size={15} /> Admin home</Link>
          <span className="cg-private-label"><ShieldCheck size={14} /> Private application records</span>
        </header>

        <section className="cg-heading">
          <div className="cg-heading-mark"><Building2 size={23} /></div>
          <div>
            <p className="cg-kicker">Taskdrip · lender directory</p>
            <h1>Citygate applications</h1>
            <p>Review submitted enquiries, cash-flow estimates and email notification results.</p>
          </div>
          <div className="cg-count"><strong>{applicationsQuery.isLoading ? "—" : applications.length}</strong><span>shown</span></div>
        </section>

        <section className="cg-filter-panel" aria-label="Filter applications">
          <label className="cg-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search applications</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone or reference" />
          </label>
          <label className="cg-status-filter">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by application status">
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{readable(option)}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
          {(search || status) && <button className="cg-clear" type="button" onClick={() => { setSearch(""); setStatus(""); }}>Clear filters</button>}
        </section>

        {statusMutation.isError && <div className="cg-inline-error" role="alert"><AlertCircle size={16} /> Status could not be updated. Try again.</div>}

        {applicationsQuery.isLoading ? (
          <section className="cg-app-list" aria-label="Loading applications">
            {[0, 1, 2].map((row) => <div className="cg-skeleton-card" key={row}><i /><i /><i /><i /></div>)}
          </section>
        ) : applicationsQuery.isError ? (
          <section className="cg-state-card cg-error-state" role="alert">
            <span className="cg-state-icon"><AlertCircle size={22} /></span>
            <h2>Applications did not load</h2>
            <p>{applicationsQuery.error instanceof Error ? applicationsQuery.error.message : "There was a problem retrieving the application list."}</p>
            <button className="cg-primary" type="button" onClick={retry}>Retry</button>
          </section>
        ) : applications.length === 0 ? (
          <section className="cg-state-card">
            <span className="cg-state-icon"><Search size={21} /></span>
            <h2>{search || status ? "No matching applications" : "No applications yet"}</h2>
            <p>{search || status ? "Try a different search or clear the filters to see the full list." : "New Citygate enquiries will appear here after they are submitted."}</p>
            {(search || status) && <button className="cg-secondary" type="button" onClick={() => { setSearch(""); setStatus(""); }}>Clear filters</button>}
          </section>
        ) : (
          <section className="cg-app-list" aria-label="Citygate loan applications">
            {applications.map((application) => {
              const id = String(application.id);
              const currentStatus = application.status || "new";
              const estimate = application.estimateNaira ?? application.estimate;
              const emailSent = application.emailSent ?? application.emailNotificationSent;
              const isUpdating = statusMutation.isPending && String(statusMutation.variables?.id) === id;
              const choices = Array.from(new Set([...statusOptions, currentStatus]));
              return (
                <article className="cg-application" key={id}>
                  <div className="cg-app-top">
                    <div className="cg-person">
                      <span className="cg-avatar"><UserRound size={19} /></span>
                      <div><h2>{application.fullName || "Applicant name unavailable"}</h2><span className="cg-reference">Reference {id}</span></div>
                    </div>
                    <label className="cg-record-status">
                      <span className="sr-only">Update status for application {id}</span>
                      <select value={currentStatus} disabled={isUpdating} onChange={(event) => statusMutation.mutate({ id: application.id, nextStatus: event.target.value })}>
                        {choices.map((option) => <option key={option} value={option}>{readable(option)}</option>)}
                      </select>
                      {isUpdating ? <span className="cg-status-spinner" aria-label="Updating status" /> : <ChevronDown size={14} aria-hidden="true" />}
                    </label>
                  </div>

                  <div className="cg-app-content">
                    <div className="cg-detail-column">
                      <h3>Applicant</h3>
                      <dl>
                        <Detail label="Email" value={application.email} />
                        <Detail label="Phone" value={application.phone} />
                        <Detail label="Date of birth" value={application.dateOfBirth} />
                        <Detail label="State" value={application.state} />
                        <Detail label="Employment" value={readable(application.employmentStatus)} />
                      </dl>
                    </div>
                    <div className="cg-detail-column">
                      <h3>Request</h3>
                      <dl>
                        <Detail label="Product" value={readable(application.loanType)} />
                        <Detail label="Business type" value={application.businessType} />
                        <Detail label="Product or service sold" value={application.productSold} />
                        <Detail label="Six-month turnover" value={amount(application.sixMonthTurnover)} />
                        <Detail label="Monthly net income" value={amount(application.monthlyNetIncome)} />
                        <Detail label="Asset amount" value={amount(application.assetAmount)} />
                        <Detail label="Requested amount" value={amount(application.requestedAmount)} />
                        <Detail label="Illustration term" value={application.tenureMonths ? `${application.tenureMonths} months` : undefined} />
                      </dl>
                    </div>
                    <div className="cg-estimate-column">
                      <div className="cg-estimate-card">
                        <span><Wallet size={15} /> Non-binding estimate</span>
                        <strong>{amount(estimate)}</strong>
                        <p>{application.estimateBasis || "Deterministic cash-flow illustration; not a credit decision or approval."}</p>
                      </div>
                      <div className="cg-email-status">
                        <span className={emailSent === true ? "cg-email-indicator is-sent" : emailSent === false ? "cg-email-indicator is-failed" : "cg-email-indicator"}>
                          {emailSent === true ? <Check size={14} /> : emailSent === false ? <AlertCircle size={14} /> : <Mail size={14} />}
                        </span>
                        <div><strong>Email notification</strong><span>{emailSent === true ? "Sent" : emailSent === false ? "Not sent" : "Status not reported"}</span></div>
                      </div>
                      <div className="cg-submitted"><Clock3 size={14} /> Submitted {formatDate(application.createdAt)}</div>
                      <div className="cg-consent-summary">
                        <span>Application sharing: {application.consent === true ? "Consented" : application.consent === false ? "Not consented" : "Not reported"}</span>
                        <span>Product updates: {application.marketingConsent === true ? "Opted in" : application.marketingConsent === false ? "Opted out" : "Not reported"}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <div><dt>{label}</dt><dd>{value === undefined || value === null || value === "" ? "Not provided" : value}</dd></div>;
}

function formatDate(value?: string) {
  if (!value) return "date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : date.toLocaleString();
}

const adminStyles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');
.cg-admin{--cg-ink:#1d2f2b;--cg-muted:#6b7970;--cg-paper:#f4f5ee;--cg-card:#fffefa;--cg-line:#dfe5dc;--cg-green:#1b5947;--cg-deep:#103d32;min-height:100dvh;background:radial-gradient(ellipse at 100% 0%,#e3eadc 0,transparent 34%),var(--cg-paper);color:var(--cg-ink);font-family:'DM Sans',sans-serif;padding:28px 20px 64px}
.cg-admin *{box-sizing:border-box}.cg-admin h1,.cg-admin h2,.cg-admin h3{font-family:'Manrope',sans-serif;letter-spacing:-.04em}.cg-admin button,.cg-admin input,.cg-admin select{font:inherit}.cg-admin-shell{width:min(1140px,100%);margin:0 auto}.cg-admin-topbar{display:flex;justify-content:space-between;align-items:center;gap:15px;border-bottom:1px solid var(--cg-line);padding-bottom:19px}.cg-back-link{display:inline-flex;align-items:center;gap:8px;color:#58675e;font-size:12px;font-weight:700;text-decoration:none}.cg-private-label{display:flex;align-items:center;gap:7px;color:var(--cg-green);font-size:11px;font-weight:700}.cg-heading{display:flex;align-items:center;gap:17px;padding:36px 0 30px}.cg-heading-mark{width:55px;height:55px;display:grid;place-items:center;background:var(--cg-deep);color:#f3f3e8;border-radius:17px 17px 17px 5px}.cg-kicker{margin:0 0 7px;color:#758278;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.cg-heading h1{font-size:clamp(30px,4vw,42px);line-height:1.1;margin:0}.cg-heading p:not(.cg-kicker){color:var(--cg-muted);font-size:13px;margin:8px 0 0}.cg-count{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;color:var(--cg-muted);font-size:11px}.cg-count strong{font-family:'Manrope',sans-serif;font-size:25px;color:var(--cg-ink)}
.cg-filter-panel{display:flex;align-items:center;gap:12px;background:var(--cg-card);border:1px solid var(--cg-line);border-radius:9px;padding:13px;margin-bottom:21px;box-shadow:0 8px 24px #263c2d08}.cg-search{height:43px;display:flex;align-items:center;gap:10px;flex:1;min-width:180px;padding:0 13px;border:1px solid #dce3d9;border-radius:5px;color:#718078}.cg-search input{width:100%;height:100%;border:0;outline:none;background:transparent;color:var(--cg-ink);font-size:12px}.cg-search input::placeholder{color:#9aa39a}.cg-status-filter{position:relative;display:flex;align-items:center;gap:10px;min-width:185px;padding:0 11px;height:43px;border:1px solid #dce3d9;border-radius:5px;color:#64736a;font-size:11px;font-weight:700}.cg-status-filter select,.cg-record-status select{appearance:none;width:100%;height:100%;position:absolute;inset:0;padding:0 30px 0 65px;border:0;background:transparent;color:var(--cg-ink);font-size:12px;cursor:pointer;outline:none}.cg-status-filter svg{position:absolute;right:11px;pointer-events:none}.cg-clear,.cg-secondary{border:1px solid #cfd8ce;background:transparent;color:#526259;padding:11px 13px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer}.cg-clear:hover,.cg-secondary:hover{background:#edf1e9}.cg-app-list{display:grid;gap:15px}.cg-application{background:var(--cg-card);border:1px solid var(--cg-line);border-radius:9px;overflow:hidden;box-shadow:0 8px 24px #263c2d08}.cg-app-top{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:19px 22px;border-bottom:1px solid #e8ece5}.cg-person{display:flex;align-items:center;gap:12px;min-width:0}.cg-avatar{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#edf2e8;color:var(--cg-green);flex:0 0 auto}.cg-person h2{margin:0;font-size:17px;line-height:1.3}.cg-reference{font-family:monospace;font-size:10px;color:#7b887e;display:block;margin-top:3px}.cg-record-status{position:relative;height:35px;min-width:125px;border:1px solid #d4ded2;border-radius:99px;background:#f8f9f4;color:var(--cg-green);font-size:11px;font-weight:700}.cg-record-status select{padding:0 30px 0 13px;color:var(--cg-green);font-weight:700}.cg-record-status>svg,.cg-status-spinner{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none}.cg-status-spinner{width:13px;height:13px;border:2px solid #c8d7c7;border-top-color:var(--cg-green);border-radius:50%;animation:cg-spin .8s linear infinite}@keyframes cg-spin{to{transform:translateY(-50%) rotate(360deg)}}
.cg-app-content{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:27px;padding:22px}.cg-detail-column h3{margin:0 0 14px;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#758278}.cg-detail-column dl{display:grid;gap:10px;margin:0}.cg-detail-column dl>div{display:grid;grid-template-columns:minmax(105px,.8fr) 1.2fr;gap:8px;font-size:11px;line-height:1.45}.cg-detail-column dt{color:#7a867c}.cg-detail-column dd{margin:0;font-weight:600;color:#2c3d34;overflow-wrap:anywhere}.cg-estimate-card{padding:15px 16px;background:#edf2e8;border:1px solid #dbe5d8;border-radius:7px}.cg-estimate-card>span{display:flex;align-items:center;gap:7px;color:#647368;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.cg-estimate-card strong{display:block;margin:8px 0 6px;font-family:'Manrope',sans-serif;font-size:25px;letter-spacing:-.06em;color:#214b3c}.cg-estimate-card p{font-size:10px;line-height:1.55;color:#6b796f;margin:0}.cg-email-status{display:flex;align-items:center;gap:10px;padding:13px 0 11px;border-bottom:1px solid var(--cg-line)}.cg-email-indicator{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#edf0e9;color:#6e7a70}.cg-email-indicator.is-sent{background:#e3efdf;color:#2b674b}.cg-email-indicator.is-failed{background:#f9e9e3;color:#a34f34}.cg-email-status strong,.cg-email-status span:not(.cg-email-indicator){display:block}.cg-email-status strong{font-size:11px}.cg-email-status div span{font-size:10px;color:var(--cg-muted);margin-top:3px}.cg-submitted{display:flex;align-items:center;gap:6px;margin-top:11px;font-size:10px;color:#758278}.cg-consent-summary{display:grid;gap:5px;margin-top:13px;padding-top:11px;border-top:1px solid var(--cg-line);font-size:9px;line-height:1.5;color:#758278}
.cg-state-card,.cg-access-panel{margin:20px auto 0;max-width:520px;padding:40px 28px;text-align:center;background:var(--cg-card);border:1px solid var(--cg-line);border-radius:10px}.cg-state-icon,.cg-access-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:50%;margin:0 auto 15px;background:#edf2e8;color:var(--cg-green)}.cg-state-card h2,.cg-access-panel h1{margin:0 0 8px;font-size:22px}.cg-state-card p,.cg-access-panel p:not(.cg-kicker){margin:0 auto 18px;max-width:390px;color:var(--cg-muted);font-size:12px;line-height:1.7}.cg-error-state .cg-state-icon{background:#faebe5;color:#9d4a31}.cg-primary{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:5px;background:var(--cg-green);color:#fff;padding:12px 17px;font-size:12px;font-weight:700;cursor:pointer}.cg-primary:hover{background:var(--cg-deep)}.cg-inline-error{display:flex;align-items:center;gap:8px;margin:0 0 15px;padding:12px;border:1px solid #f0c8b7;background:#fff0eb;border-radius:5px;color:#943c20;font-size:11px}.cg-skeleton-card{min-height:180px;padding:22px;background:var(--cg-card);border:1px solid var(--cg-line);border-radius:9px;display:grid;grid-template-columns:1fr 1fr;gap:13px;align-content:start}.cg-skeleton-card i,.cg-loading-panel i{display:block;height:12px;border-radius:99px;background:linear-gradient(90deg,#e6eae2,#f1f3ed,#e6eae2);background-size:200% 100%;animation:cg-shimmer 1.4s ease-in-out infinite}.cg-skeleton-card i:nth-child(odd){width:70%}.cg-loading-panel{width:min(360px,80vw);padding:26px;background:var(--cg-card);border:1px solid var(--cg-line);border-radius:9px;display:grid;gap:14px}@keyframes cg-shimmer{to{background-position:-200% 0}}.cg-admin-state{display:grid;place-items:center}.cg-access-panel .cg-kicker{margin-bottom:9px}.cg-access-panel .cg-primary{margin-top:3px}.cg-admin button:focus-visible,.cg-admin input:focus-visible,.cg-admin select:focus-visible,.cg-admin a:focus-visible{outline:3px solid #e9a761;outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:820px){.cg-app-content{grid-template-columns:1fr 1fr}.cg-estimate-column{grid-column:1/-1;display:grid;grid-template-columns:1.3fr 1fr;align-items:center;column-gap:17px}.cg-estimate-card{grid-row:span 3}.cg-email-status{border:0;padding:0}.cg-submitted{margin-top:5px}.cg-consent-summary{grid-column:2;margin-top:8px}.cg-admin{padding:22px 16px 44px}}
@media(max-width:560px){.cg-admin{padding:16px 12px 36px}.cg-private-label{font-size:0}.cg-private-label svg{width:17px;height:17px}.cg-heading{align-items:flex-start;padding:26px 0 22px;gap:12px}.cg-heading-mark{width:44px;height:44px;flex:0 0 auto}.cg-heading h1{font-size:29px}.cg-heading p:not(.cg-kicker){font-size:11px;line-height:1.5}.cg-count{font-size:10px}.cg-count strong{font-size:21px}.cg-filter-panel{align-items:stretch;flex-direction:column;padding:11px}.cg-search,.cg-status-filter{width:100%}.cg-clear{align-self:flex-start}.cg-app-top{align-items:flex-start;padding:16px}.cg-person h2{font-size:15px;overflow-wrap:anywhere}.cg-record-status{min-width:112px}.cg-app-content{grid-template-columns:1fr;gap:22px;padding:17px 16px}.cg-estimate-column{grid-column:auto;display:block}.cg-estimate-card{margin-bottom:4px}.cg-email-status{padding:12px 0;border-bottom:1px solid var(--cg-line)}.cg-submitted{margin-top:10px}.cg-consent-summary{margin-top:11px}.cg-detail-column dl>div{grid-template-columns:minmax(120px,.75fr) 1.25fr}.cg-state-card,.cg-access-panel{padding:34px 20px}}
@media(prefers-reduced-motion:reduce){.cg-admin *, .cg-admin *::before,.cg-admin *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}}
`;
