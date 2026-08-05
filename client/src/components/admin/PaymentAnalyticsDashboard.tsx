import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Crown, ShoppingBag, BookOpen, Code2, Handshake,
  Shield, ArrowDownToLine, TrendingUp, ChevronRight,
  Search, Clock, CheckCircle, AlertCircle, XCircle,
  DollarSign, X, ExternalLink,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ago(d: string | null | undefined) {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const cls =
    ["active", "paid", "approved", "completed", "verified", "released", "delivered"].includes(s)
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
    : ["pending", "submitted", "payment_pending", "payment_submitted", "funded"].includes(s)
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
    : ["cancelled", "rejected", "expired", "refunded"].includes(s)
      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  const icon =
    ["active","paid","approved","completed","verified","released","delivered"].includes(s) ? <CheckCircle className="h-3 w-3" /> :
    ["cancelled","rejected","expired","refunded"].includes(s) ? <XCircle className="h-3 w-3" /> :
    <AlertCircle className="h-3 w-3" />;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {icon}{s.replace(/_/g, " ")}
    </span>
  );
}

function UserChip({ user }: { user: any }) {
  if (!user) return <span className="text-gray-400 text-xs">—</span>;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email || "Unknown";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-300">
      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
        {(name[0] || "?").toUpperCase()}
      </span>
      <span className="truncate max-w-[120px]">{name}</span>
    </span>
  );
}

// ─── category config ─────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    key: "subscriptions",
    label: "Subscriptions",
    icon: Crown,
    gradient: "from-violet-500 to-fuchsia-600",
    border: "border-violet-500/30",
    glow: "shadow-violet-900/30",
    description: "Platform plan payments",
    txSource: "subscription",
    renderRow: (r: any) => ({
      title: (r.plan || "Subscription").replace(/_/g, " "),
      subtitle: r.network || "Manual",
      user: r.user,
      amount: r.amount,
      status: r.status,
      date: r.createdAt,
      tx: r.transactionHash,
    }),
  },
  {
    key: "shopOrders",
    label: "Shop Orders",
    icon: ShoppingBag,
    gradient: "from-blue-500 to-indigo-600",
    border: "border-blue-500/30",
    glow: "shadow-blue-900/30",
    description: "Digital product purchases",
    txSource: "purchase",
    renderRow: (r: any) => ({
      title: r.product?.title || "Product",
      subtitle: r.paymentMethod || "Manual",
      user: r.user,
      amount: r.amount,
      status: r.status,
      date: r.createdAt,
      tx: r.transactionHash,
    }),
  },
  {
    key: "courseEnrollments",
    label: "Course Enrollments",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-900/30",
    description: "BreedSkool course payments",
    txSource: "course_enrollment",
    renderRow: (r: any) => ({
      title: r.course?.title || "Course",
      subtitle: r.paymentMethod || "Manual",
      user: r.user,
      amount: r.amount,
      status: r.status,
      date: r.createdAt,
      tx: r.transactionHash,
    }),
  },
  {
    key: "hireDeveloper",
    label: "Hire Developer",
    icon: Code2,
    gradient: "from-orange-500 to-red-500",
    border: "border-orange-500/30",
    glow: "shadow-orange-900/30",
    description: "Dev project requests",
    txSource: "direct_hire",
    renderRow: (r: any) => ({
      title: r.title || "Dev Project",
      subtitle: r.invoiceNumber ? `INV #${r.invoiceNumber}` : "No invoice",
      user: r.user,
      amount: r.agreedBudget || r.amount,
      status: r.status,
      date: r.createdAt,
      tx: r.transactionHash,
    }),
  },
  {
    key: "directHires",
    label: "Direct Hires",
    icon: Handshake,
    gradient: "from-pink-500 to-rose-600",
    border: "border-pink-500/30",
    glow: "shadow-pink-900/30",
    description: "Brand → influencer hires",
    txSource: "direct_hire",
    renderRow: (r: any) => ({
      title: r.title || "Direct Hire",
      subtitle: "",
      user: r.brand,
      amount: r.amount,
      status: r.status,
      date: r.createdAt,
      tx: r.transactionHash,
    }),
  },
  {
    key: "campaignEscrow",
    label: "Campaign Escrow",
    icon: Shield,
    gradient: "from-amber-500 to-yellow-500",
    border: "border-amber-500/30",
    glow: "shadow-amber-900/30",
    description: "Campaign funding deposits",
    txSource: "escrow",
    renderRow: (r: any) => ({
      title: `Campaign ${r.campaignId?.slice(0, 8) || "—"}`,
      subtitle: r.network || "Manual",
      user: r.user,
      amount: r.amount,
      status: r.status,
      date: r.createdAt,
      tx: r.transactionHash,
    }),
  },
  {
    key: "payouts",
    label: "Payout Requests",
    icon: ArrowDownToLine,
    gradient: "from-cyan-500 to-sky-600",
    border: "border-cyan-500/30",
    glow: "shadow-cyan-900/30",
    description: "Influencer withdrawal requests",
    txSource: "__payouts__",
    renderRow: (r: any) => ({
      title: `${r.network?.toUpperCase() || "Payout"} — ${r.walletAddress?.slice(0, 10) || ""}…`,
      subtitle: r.network || "",
      user: r.user,
      amount: r.amount,
      status: r.status,
      date: r.createdAt,
      tx: r.transactionHash,
    }),
  },
] as const;

// ─── DrillDown Modal ─────────────────────────────────────────────────────────

function DrillDown({
  open,
  onClose,
  category,
  data,
  isQueryLoading,
  queryError,
  onNavigateToSource,
}: {
  open: boolean;
  onClose: () => void;
  category: (typeof CATEGORIES)[number] | null;
  data: any;
  isQueryLoading?: boolean;
  queryError?: any;
  onNavigateToSource?: (txSource: string) => void;
}) {
  const [q, setQ] = useState("");

  // Always render Dialog so Radix portal lifecycle stays intact.
  // Only gate the *content* on whether a category is selected.
  const Icon = category?.icon ?? TrendingUp;
  const cat = category ? data?.categories?.[category.key] : undefined;
  const records: any[] = cat?.records || [];
  const isLoading = isQueryLoading || (!data && !queryError);

  const filtered =
    q.trim() && !isLoading && category
      ? records.filter((r) => {
          const row = category.renderRow(r);
          const hay = [
            row.title,
            row.subtitle,
            row.user?.email,
            row.user?.firstName,
            row.user?.lastName,
            row.tx,
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q.toLowerCase());
        })
      : records;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-gray-950 border-gray-800 text-white p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                  category?.gradient ?? "from-gray-500 to-gray-600"
                } flex items-center justify-center shadow-lg flex-shrink-0`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  {category?.label ?? "Loading…"}
                </DialogTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  {cat?.count ?? 0} records · {fmt(cat?.total ?? 0)} total
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-1 rounded-lg">
                ✅ {fmt(cat?.completed ?? 0)}
              </span>
              <span className="text-xs text-amber-400 bg-amber-950/40 px-2 py-1 rounded-lg">
                ⏳ {fmt(cat?.pending ?? 0)} pending
              </span>
              {onNavigateToSource && category && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToSource(category.txSource);
                  }}
                  className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 bg-violet-900/40 hover:bg-violet-900/60 border border-violet-700/50 px-2 py-1 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View All
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, title…"
              className="pl-8 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600 h-8 text-sm"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Records list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {queryError ? (
            <div className="flex flex-col items-center justify-center py-16 text-rose-400">
              <AlertCircle className="h-10 w-10 mb-3 opacity-60" />
              <p className="text-sm font-medium">Failed to load data</p>
              <p className="text-xs text-gray-500 mt-1">Refresh the page and try again</p>
            </div>
          ) : isLoading ? (
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-900/60 border border-gray-800 rounded-xl p-3 animate-pulse"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
                <div className="h-4 bg-white/10 rounded w-16 flex-shrink-0" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <DollarSign className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">{q ? "No matches" : "No records yet"}</p>
            </div>
          ) : (
            filtered.map((r: any) => {
              if (!category) return null;
              const row = category.renderRow(r);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 bg-gray-900/60 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors"
                >
                  {/* icon */}
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center flex-shrink-0 opacity-80`}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                        {row.title}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <UserChip user={row.user} />
                      {row.subtitle && (
                        <span className="text-[11px] text-gray-500">{row.subtitle}</span>
                      )}
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ago(row.date)}
                      </span>
                    </div>
                    {row.tx && (
                      <p className="text-[10px] font-mono text-blue-400/70 truncate mt-0.5">
                        TX: {row.tx}
                      </p>
                    )}
                  </div>
                  {/* amount */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white tabular-nums">
                      {fmt(row.amount ?? 0)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export function PaymentAnalyticsDashboard({
  onNavigateToSource,
}: {
  onNavigateToSource?: (txSource: string) => void;
}) {
  const [selected, setSelected] = useState<(typeof CATEGORIES)[number] | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/admin/payments-analytics"],
    queryFn: async () =>
      (await apiRequest("GET", "/api/admin/payments-analytics")).json(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 p-5 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-900/40">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Payment Analytics
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              All revenue streams — click a card to drill down
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-8 w-28 bg-white/5 animate-pulse rounded-lg" />
          ) : data ? (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                Grand Total
              </p>
              <p className="text-xl font-extrabold text-white tabular-nums">
                {fmt(data.grandTotal ?? 0)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-400 text-sm px-4 py-3 mb-4">
          Failed to load payment data. Please refresh.
        </div>
      )}

      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const stats = data?.categories?.[cat.key];
          const loading = isLoading || (!data && !error);

          return (
            <button
              key={cat.key}
              onClick={() => setSelected(cat)}
              className={`group text-left rounded-2xl border ${cat.border} bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur transition-all duration-200 hover:scale-[1.015] hover:shadow-xl ${cat.glow} p-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/60`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                {cat.label}
              </p>
              <p className="text-[11px] text-gray-600 mb-3">{cat.description}</p>

              {loading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-white/5 animate-pulse rounded-lg w-3/4" />
                  <div className="h-4 bg-white/5 animate-pulse rounded w-1/2" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-white tabular-nums leading-none mb-2">
                    {fmt(stats?.total ?? 0)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-white/5 rounded-md px-2 py-0.5">
                      {stats?.count ?? 0} record{(stats?.count ?? 0) !== 1 ? "s" : ""}
                    </span>
                    {(stats?.completed ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 rounded-md px-2 py-0.5">
                        <CheckCircle className="h-3 w-3" />
                        {fmt(stats.completed)}
                      </span>
                    )}
                    {(stats?.pending ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/40 rounded-md px-2 py-0.5">
                        <AlertCircle className="h-3 w-3" />
                        {fmt(stats.pending)} pending
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* DrillDown — always mounted so Radix portal works correctly */}
      <DrillDown
        open={!!selected}
        onClose={() => setSelected(null)}
        category={selected}
        data={data}
        isQueryLoading={isLoading}
        queryError={error}
        onNavigateToSource={onNavigateToSource}
      />
    </div>
  );
}
