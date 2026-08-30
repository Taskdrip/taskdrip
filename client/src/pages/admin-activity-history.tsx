import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, ArrowLeft, ChevronLeft, ChevronRight, Clock3, Filter,
  Mail, RefreshCw, Search, ShieldCheck, User, XCircle, CheckCircle2,
} from "lucide-react";

type ActivityItem = {
  id: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  eventType: string;
  action: string;
  description: string;
  route?: string;
  method?: string;
  status: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt?: string;
};

const EVENT_TYPES = [
  ["all", "All activity"],
  ["registration", "Registrations"],
  ["order", "Orders"],
  ["payment", "Payments"],
  ["campaign", "Campaigns"],
  ["course", "Courses"],
  ["communication", "Messages & forms"],
  ["content", "Content"],
  ["marketplace", "Marketplace"],
  ["profile", "Profile"],
  ["admin", "Admin changes"],
];

const EVENT_TONE: Record<string, string> = {
  registration: "bg-emerald-50 text-emerald-700 border-emerald-200",
  order: "bg-blue-50 text-blue-700 border-blue-200",
  payment: "bg-amber-50 text-amber-700 border-amber-200",
  campaign: "bg-violet-50 text-violet-700 border-violet-200",
  course: "bg-indigo-50 text-indigo-700 border-indigo-200",
  communication: "bg-cyan-50 text-cyan-700 border-cyan-200",
  content: "bg-pink-50 text-pink-700 border-pink-200",
  marketplace: "bg-orange-50 text-orange-700 border-orange-200",
  profile: "bg-slate-100 text-slate-700 border-slate-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
};

function formatDate(value?: string) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function prettyEvent(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataEntries(metadata?: Record<string, unknown>) {
  const request = metadata?.request;
  if (!request || typeof request !== "object") return [];
  return Object.entries(request as Record<string, unknown>);
}

export default function AdminActivityHistory() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const [eventType, setEventType] = useState("all");
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const query = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(page * limit),
      eventType,
      status,
    });
    if (search) params.set("search", search);
    return params.toString();
  }, [eventType, status, search, page]);

  const { data, isLoading, isFetching, refetch } = useQuery<{
    items: ActivityItem[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: [`/api/admin/activity?${query}`],
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const hasFilters = eventType !== "all" || status !== "all" || search !== "";

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setEventType("all");
    setStatus("all");
    setSearchInput("");
    setSearch("");
    setPage(0);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading activity history…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-violet-600 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-slate-900">Admin access required</h1>
            <p className="text-sm text-slate-500 mt-2">This audit history is only available to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationFixed />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
          <div>
            <Link href="/admin-dashboard" className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 mb-3">
              <ArrowLeft className="h-4 w-4" /> Back to admin
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Activity history</h1>
                <p className="text-sm text-slate-500">A searchable record of registrations, orders, payments, forms, and admin actions.</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Total recorded</p><p className="text-2xl font-bold text-slate-900 mt-1">{total.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Showing</p><p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Page</p><p className="text-2xl font-bold text-slate-900 mt-1">{Math.min(page + 1, pageCount)} <span className="text-sm font-normal text-slate-400">/ {pageCount}</span></p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Email routing</p><p className="text-sm font-semibold text-emerald-700 mt-2 flex items-center gap-1"><Mail className="h-4 w-4" /> Admin inbox enabled</p></CardContent></Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <form onSubmit={applySearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search people, actions, IDs, or details…" className="pl-9" />
                </div>
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Search</Button>
              </form>
              <div className="flex flex-wrap gap-2">
                <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(0); }} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                  {EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                  <option value="all">All statuses</option>
                  <option value="success">Successful</option>
                  <option value="failed">Failed</option>
                </select>
                {hasFilters && <Button type="button" variant="ghost" onClick={clearFilters} className="gap-1 text-slate-500"><XCircle className="h-4 w-4" /> Clear</Button>}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><Filter className="h-3 w-3" /> Updates automatically every 15 seconds. Sensitive fields are redacted before storage.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-600" /> Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading activity…</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No activity found</p>
                <p className="text-sm text-slate-500 mt-1">{hasFilters ? "Try clearing one or more filters." : "New activity will appear here as users interact with the app."}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const details = metadataEntries(item.metadata);
                  return (
                    <details key={item.id} className="group">
                      <summary className="list-none cursor-pointer px-4 sm:px-6 py-4 hover:bg-slate-50">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center ${item.status === "failed" ? "bg-red-50 text-red-600" : "bg-violet-50 text-violet-600"}`}>
                            {item.status === "failed" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-sm text-slate-900">{item.action}</h3>
                              <Badge variant="outline" className={`text-[11px] ${EVENT_TONE[item.eventType] || "bg-slate-50 text-slate-600"}`}>{prettyEvent(item.eventType)}</Badge>
                              <Badge variant="outline" className={item.status === "failed" ? "text-red-600 border-red-200" : "text-emerald-600 border-emerald-200"}>{item.status}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {item.actorName || "Anonymous visitor"}{item.actorEmail ? ` · ${item.actorEmail}` : ""}</span>
                              <span>{formatDate(item.createdAt)}</span>
                              {item.route && <span className="font-mono">{item.method} {item.route}</span>}
                            </div>
                          </div>
                        </div>
                      </summary>
                      <div className="mx-4 sm:mx-6 mb-4 ml-16 rounded-xl bg-slate-50 border border-slate-100 p-4">
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                          <div><span className="text-slate-400">Activity ID</span><p className="font-mono text-slate-700 break-all">{item.id}</p></div>
                          <div><span className="text-slate-400">Entity</span><p className="text-slate-700">{item.entityType || "API action"}{item.entityId ? ` · ${item.entityId}` : ""}</p></div>
                          {item.ipAddress && <div><span className="text-slate-400">IP address</span><p className="text-slate-700">{item.ipAddress}</p></div>}
                          <div><span className="text-slate-400">Recorded</span><p className="text-slate-700">{formatDate(item.createdAt)}</p></div>
                        </div>
                        {details.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-200">
                            <p className="text-xs font-semibold text-slate-500 mb-2">Submitted details</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {details.map(([key, value]) => <div key={key} className="text-xs"><span className="text-slate-400">{key}</span><p className="text-slate-700 break-words">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p></div>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-slate-500">Showing {total === 0 ? 0 : page * limit + 1}–{Math.min(page * limit + items.length, total)} of {total.toLocaleString()}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || isFetching}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1 || isFetching}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}