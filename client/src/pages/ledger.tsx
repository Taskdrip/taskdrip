import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownLeft, ArrowUpRight, Banknote, BriefcaseBusiness, Clock, CreditCard, Landmark, ReceiptText, ShieldCheck, Wallet } from "lucide-react";

type LedgerData = {
  user: any;
  transactions: any[];
  payoutRequests: any[];
  directHireOffers: any[];
  generatedAt: string;
};

type LedgerEntry = {
  id: string;
  source: "transaction" | "payout" | "direct_hire";
  type: string;
  title: string;
  amount: number;
  direction: "in" | "out" | "hold" | "neutral";
  status: string;
  date?: string;
  description?: string;
  href?: string;
  network?: string;
};

const creditTypes = new Set(["campaign_reward", "bonus", "direct_hire_payout", "platform_revenue", "platform_tip"]);
const debitTypes = new Set(["payout", "platform_fee", "direct_hire_escrow", "direct_hire_deposit", "campaign_deposit"]);
const activeDirectHireStatuses = new Set(["payment_submitted", "active", "work_submitted", "revision_requested"]);

function money(value: unknown) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function labelForType(type: string) {
  return type.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed" || status === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : status === "pending" || status === "payment_submitted" || status === "processing"
        ? "bg-amber-100 text-amber-800"
        : status === "active" || status === "work_submitted" || status === "revision_requested"
          ? "bg-blue-100 text-blue-800"
          : status === "rejected" || status === "failed" || status === "cancelled"
            ? "bg-red-100 text-red-800"
            : "bg-gray-100 text-gray-800";

  return <Badge className={color} data-testid={`status-ledger-${status}`}>{status.replace(/_/g, " ")}</Badge>;
}

function DirectionIcon({ direction }: { direction: LedgerEntry["direction"] }) {
  if (direction === "in") return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
  if (direction === "out") return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  if (direction === "hold") return <Clock className="h-4 w-4 text-blue-600" />;
  return <ReceiptText className="h-4 w-4 text-gray-500" />;
}

export default function LedgerPage() {
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery<LedgerData>({
    queryKey: ["/api/ledger"],
  });

  const user = data?.user || {};
  const userType = user.userType || "creator";

  const entries = useMemo<LedgerEntry[]>(() => {
    if (!data) return [];

    const transactionEntries = data.transactions.map((transaction) => {
      const type = transaction.type || "transaction";
      const direction = creditTypes.has(type) ? "in" : debitTypes.has(type) ? "out" : "neutral";
      return {
        id: `tx-${transaction.id}`,
        source: "transaction" as const,
        type,
        title: labelForType(type),
        amount: numberValue(transaction.amount),
        direction,
        status: transaction.status || "pending",
        date: transaction.processedAt || transaction.createdAt,
        description: transaction.description,
        href: transaction.referenceType === "direct_hire" && transaction.referenceId ? `/direct-hire/${transaction.referenceId}` : transaction.campaignId ? `/campaigns/${transaction.campaignId}` : undefined,
        network: transaction.network,
      };
    });

    const payoutEntries = data.payoutRequests.map((request) => ({
      id: `payout-${request.id}`,
      source: "payout" as const,
      type: "payout_request",
      title: "Withdrawal request",
      amount: numberValue(request.amount),
      direction: "out" as const,
      status: request.status || "pending",
      date: request.processedAt || request.createdAt,
      description: request.adminNotes || `Payout to ${request.network || "saved wallet"}`,
      href: "/payout-requests",
      network: request.network,
    }));

    const directHireEntries = data.directHireOffers
      .filter((offer) => activeDirectHireStatuses.has(offer.status))
      .map((offer) => {
        const isCreator = offer.influencerId === user.id;
        const isAdmin = userType === "admin";
        const amount = isCreator ? numberValue(offer.influencerPayout || numberValue(offer.budget) * 0.9) : numberValue(offer.brandTotalCharge || numberValue(offer.budget) * 1.1);
        return {
          id: `direct-${offer.id}`,
          source: "direct_hire" as const,
          type: "direct_hire_escrow",
          title: isCreator ? `Pending direct hire earnings: ${offer.title}` : isAdmin ? `Direct hire escrow watch: ${offer.title}` : `Direct hire escrow: ${offer.title}`,
          amount,
          direction: isCreator ? "hold" as const : isAdmin ? "neutral" as const : "out" as const,
          status: offer.status,
          date: offer.updatedAt || offer.createdAt,
          description: isCreator ? "Held in escrow until the brand approves submitted work" : "Escrow funds are tracked until the project is completed",
          href: `/direct-hire/${offer.id}`,
          network: offer.paymentNetwork,
        };
      });

    return [...transactionEntries, ...payoutEntries, ...directHireEntries].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [data, user.id, userType]);

  const visibleEntries = entries.filter((entry) => filter === "all" || entry.direction === filter || entry.source === filter);

  const summary = useMemo(() => {
    const transactions = data?.transactions || [];
    const payouts = data?.payoutRequests || [];
    const directHires = data?.directHireOffers || [];
    const completedCredits = transactions
      .filter((transaction) => creditTypes.has(transaction.type) && ["completed", "approved"].includes(transaction.status))
      .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
    const completedFees = transactions
      .filter((transaction) => transaction.type === "platform_fee" && ["completed", "approved"].includes(transaction.status))
      .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
    const pendingWithdrawals = payouts
      .filter((request) => ["pending", "processing"].includes(request.status))
      .reduce((sum, request) => sum + numberValue(request.amount), 0);
    const escrowInProgress = directHires
      .filter((offer) => activeDirectHireStatuses.has(offer.status))
      .reduce((sum, offer) => {
        const isCreator = offer.influencerId === user.id;
        return sum + (isCreator ? numberValue(offer.influencerPayout || numberValue(offer.budget) * 0.9) : numberValue(offer.brandTotalCharge || numberValue(offer.budget) * 1.1));
      }, 0);

    return {
      availableBalance: numberValue(user.availableBalance),
      pendingBalance: numberValue(user.pendingBalance),
      totalEarned: numberValue(user.totalEarned) || completedCredits,
      completedCredits,
      completedFees,
      pendingWithdrawals,
      escrowInProgress,
      payoutCount: payouts.length,
    };
  }, [data, user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm" data-testid="text-ledger-role">
              <Landmark className="mr-2 h-4 w-4 text-purple-600" />
              {userType === "admin" ? "Admin banking ledger" : userType === "brand" ? "Brand escrow ledger" : "Creator earnings ledger"}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-950" data-testid="text-ledger-title">Escrow & Banking Ledger</h1>
            <p className="mt-2 max-w-2xl text-gray-600" data-testid="text-ledger-description">
              One place to track available balance, pending escrow, platform fees, campaign rewards, direct-hire payouts, and withdrawal requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/payout-requests">
              <Button variant="outline" data-testid="button-open-payout-requests">
                <CreditCard className="mr-2 h-4 w-4" />
                Payout requests
              </Button>
            </Link>
            <Link href="/wallet">
              <Button className="bg-black text-white hover:bg-gray-800" data-testid="button-open-wallet-settings">
                <Wallet className="mr-2 h-4 w-4" />
                Wallet settings
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-0 bg-black text-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-sm font-medium text-gray-200">
                    <Wallet className="mr-2 h-4 w-4" />
                    Available balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black" data-testid="text-available-balance">{money(summary.availableBalance)}</div>
                  <p className="mt-2 text-sm text-gray-300">Ready for withdrawal when minimum payout is met.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                    <Clock className="mr-2 h-4 w-4 text-blue-600" />
                    Pending / escrow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-gray-950" data-testid="text-pending-escrow">{money(summary.pendingBalance + summary.escrowInProgress)}</div>
                  <p className="mt-2 text-sm text-gray-500">Active direct-hire and campaign funds still in progress.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                    <Banknote className="mr-2 h-4 w-4 text-emerald-600" />
                    {userType === "admin" ? "Platform revenue" : "Total earned"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-gray-950" data-testid="text-total-earned">{money(summary.totalEarned)}</div>
                  <p className="mt-2 text-sm text-gray-500">Completed credits posted to this account ledger.</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                    <ReceiptText className="mr-2 h-4 w-4 text-purple-600" />
                    Withdrawal queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-gray-950" data-testid="text-pending-withdrawals">{money(summary.pendingWithdrawals)}</div>
                  <p className="mt-2 text-sm text-gray-500">{summary.payoutCount} payout request{summary.payoutCount === 1 ? "" : "s"} linked to this ledger.</p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Fee and escrow policy
                  </CardTitle>
                  <CardDescription>Taskdrip records the full fee split so every party can audit what happened.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-4" data-testid="text-brand-fee-policy">
                    <p className="text-sm font-semibold text-gray-900">Brand platform fee</p>
                    <p className="mt-1 text-2xl font-black text-gray-950">10%</p>
                    <p className="mt-1 text-xs text-gray-500">Added on top of campaign or direct-hire budget.</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4" data-testid="text-creator-fee-policy">
                    <p className="text-sm font-semibold text-gray-900">Creator fee</p>
                    <p className="mt-1 text-2xl font-black text-gray-950">10%</p>
                    <p className="mt-1 text-xs text-gray-500">Deducted from creator earnings before release.</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4" data-testid="text-fees-paid">
                    <p className="text-sm font-semibold text-gray-900">Fees posted here</p>
                    <p className="mt-1 text-2xl font-black text-gray-950">{money(summary.completedFees)}</p>
                    <p className="mt-1 text-xs text-gray-500">Completed platform-fee ledger deductions.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Ledger filters</CardTitle>
                  <CardDescription>No live polling is used; data refreshes when the page loads.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger data-testid="select-ledger-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All activity</SelectItem>
                      <SelectItem value="in">Money in</SelectItem>
                      <SelectItem value="out">Money out</SelectItem>
                      <SelectItem value="hold">Escrow holds</SelectItem>
                      <SelectItem value="payout">Payout requests</SelectItem>
                      <SelectItem value="direct_hire">Direct hire escrow</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-4 text-sm text-gray-500" data-testid="text-ledger-generated">
                    Last loaded {data?.generatedAt ? formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true }) : "just now"}.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-gray-900" />
                  Ledger activity
                </CardTitle>
                <CardDescription>{visibleEntries.length} record{visibleEntries.length === 1 ? "" : "s"} shown from escrow, transactions, and payouts.</CardDescription>
              </CardHeader>
              <CardContent>
                {visibleEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                    <Landmark className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-3 font-semibold text-gray-900" data-testid="text-empty-ledger">No ledger activity yet</p>
                    <p className="mt-1 text-sm text-gray-500">Completed campaigns, direct hires, fees, and payout requests will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleEntries.map((entry) => (
                          <TableRow key={entry.id} data-testid={`row-ledger-${entry.id}`}>
                            <TableCell>
                              <div className="flex items-start gap-3">
                                <div className="mt-1 rounded-full bg-gray-100 p-2">
                                  <DirectionIcon direction={entry.direction} />
                                </div>
                                <div>
                                  {entry.href ? (
                                    <Link href={entry.href} className="font-semibold text-gray-950 hover:underline" data-testid={`link-ledger-${entry.id}`}>
                                      {entry.title}
                                    </Link>
                                  ) : (
                                    <p className="font-semibold text-gray-950" data-testid={`text-ledger-title-${entry.id}`}>{entry.title}</p>
                                  )}
                                  <p className="mt-1 max-w-xl text-sm text-gray-500" data-testid={`text-ledger-description-${entry.id}`}>{entry.description || labelForType(entry.type)}</p>
                                  {entry.network && <p className="mt-1 text-xs font-medium text-gray-400" data-testid={`text-ledger-network-${entry.id}`}>{entry.network}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><StatusBadge status={entry.status} /></TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-gray-500">
                              {entry.date ? format(new Date(entry.date), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell className={`whitespace-nowrap text-right font-bold ${entry.direction === "in" ? "text-emerald-700" : entry.direction === "out" ? "text-red-700" : "text-gray-900"}`} data-testid={`text-ledger-amount-${entry.id}`}>
                              {entry.direction === "in" ? "+" : entry.direction === "out" ? "-" : ""}{money(entry.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}