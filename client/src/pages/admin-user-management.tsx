import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit2, Trash2, Key, Shield, UserCheck, UserX, Search, Filter,
  ExternalLink, CheckCircle, DollarSign, Users, TrendingUp, Star, Zap,
  ArrowUpDown, ChevronDown, ChevronUp, BarChart3, Award, SlidersHorizontal, X,
  Mail, ShieldOff, ShieldCheck
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { TIER_CONFIG, TIER_ORDER, formatFollowers, type CreatorTier } from "@/lib/tiers";

function formatEarnings(val: string | number | null | undefined): string {
  const n = parseFloat(String(val || "0"));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  userType: z.enum(["creator", "brand", "admin"], {
    required_error: "Please select a user type",
  }),
  isVerified: z.boolean().default(false),
});

const passwordResetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/* ═══════════════════════════════════════════════
   WORLD-CLASS ADMIN TIERS DASHBOARD
═══════════════════════════════════════════════ */
type SortKey = "rank" | "followers" | "earnings" | "rating" | "campaigns";

function AdminTiersDashboard({ tierData, isTierLoading }: { tierData: Record<string, any[]>; isTierLoading: boolean }) {
  const [activeTierTab, setActiveTierTab] = useState<CreatorTier | "all">("all");
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [sortKey, setSortKey] = useState<SortKey>("followers");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const allCreators = useMemo(() => {
    return TIER_ORDER.flatMap(t => (tierData[t] || []).map((c: any) => ({ ...c, _tier: t })));
  }, [tierData]);

  const tierSummary = useMemo(() => {
    return TIER_ORDER.map(tierId => {
      const creators: any[] = tierData[tierId] || [];
      const totalEarnings = creators.reduce((s: number, c: any) => s + parseFloat(c.totalEarned || "0"), 0);
      const avgFollowers = creators.length > 0
        ? Math.round(creators.reduce((s: number, c: any) => s + (c.totalFollowers || 0), 0) / creators.length)
        : 0;
      const verified = creators.filter((c: any) => c.isVerified).length;
      const topCreator = creators[0] || null;
      return { tierId, creators, totalEarnings, avgFollowers, verified, topCreator };
    });
  }, [tierData]);

  const globalStats = useMemo(() => ({
    total: allCreators.length,
    totalEarnings: allCreators.reduce((s, c) => s + parseFloat(c.totalEarned || "0"), 0),
    verified: allCreators.filter(c => c.isVerified).length,
    avgFollowers: allCreators.length > 0
      ? Math.round(allCreators.reduce((s, c) => s + (c.totalFollowers || 0), 0) / allCreators.length)
      : 0,
    totalCampaigns: allCreators.reduce((s, c) => s + (c.completedCampaigns || 0), 0),
  }), [allCreators]);

  const filteredCreators = useMemo(() => {
    const pool = activeTierTab === "all" ? allCreators : (tierData[activeTierTab] || []).map((c: any) => ({ ...c, _tier: activeTierTab }));
    return pool
      .filter((c: any) => {
        if (nicheFilter !== "all" && c.niche !== nicheFilter) return false;
        if (verifiedFilter === "verified" && !c.isVerified) return false;
        if (verifiedFilter === "unverified" && c.isVerified) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            (c.username || "").toLowerCase().includes(q) ||
            (c.niche || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a: any, b: any) => {
        let va = 0, vb = 0;
        if (sortKey === "followers") { va = a.totalFollowers || 0; vb = b.totalFollowers || 0; }
        else if (sortKey === "earnings") { va = parseFloat(a.totalEarned || "0"); vb = parseFloat(b.totalEarned || "0"); }
        else if (sortKey === "rating") { va = parseFloat(a.rating || "0"); vb = parseFloat(b.rating || "0"); }
        else if (sortKey === "campaigns") { va = a.completedCampaigns || 0; vb = b.completedCampaigns || 0; }
        return sortDir === "desc" ? vb - va : va - vb;
      });
  }, [activeTierTab, allCreators, tierData, search, nicheFilter, verifiedFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 ml-1 inline" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
      : <ChevronUp className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />;
  };

  const hasFilters = search || nicheFilter !== "all" || verifiedFilter !== "all";

  const NICHES_LIST = [
    "Gaming","Fitness","Fashion","Tech","Beauty","Food","Travel","Finance",
    "Music","Education","Sports","Lifestyle","Comedy","Art","Business","Health","Crypto","Movies"
  ];

  if (isTierLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading tier analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-600" /> Creator Tier Analytics
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Auto-updated as creators register and update their follower counts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-600 font-medium">Live</span>
        </div>
      </div>

      {/* ── Global KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { icon: <Users className="w-5 h-5" />, label: "Total Creators", value: globalStats.total.toString(), color: "text-purple-600", bg: "bg-purple-50" },
          { icon: <DollarSign className="w-5 h-5" />, label: "Total Paid Out", value: formatEarnings(globalStats.totalEarnings), color: "text-green-600", bg: "bg-green-50" },
          { icon: <CheckCircle className="w-5 h-5" />, label: "Verified", value: `${globalStats.verified} / ${globalStats.total}`, color: "text-blue-600", bg: "bg-blue-50" },
          { icon: <TrendingUp className="w-5 h-5" />, label: "Avg Followers", value: formatFollowers(globalStats.avgFollowers), color: "text-orange-600", bg: "bg-orange-50" },
          { icon: <Zap className="w-5 h-5" />, label: "Campaigns Done", value: globalStats.totalCampaigns.toString(), color: "text-yellow-600", bg: "bg-yellow-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Per-Tier Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tierSummary.map(({ tierId, creators, totalEarnings, avgFollowers, verified, topCreator }) => {
          const tier = TIER_CONFIG[tierId];
          const verifiedPct = creators.length > 0 ? Math.round((verified / creators.length) * 100) : 0;
          return (
            <div key={tierId} className={`rounded-2xl border-2 ${tier.border} overflow-hidden`}>
              <div className={`bg-gradient-to-br ${tier.gradient} px-5 py-4`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{tier.icon}</span>
                  <span className="text-3xl font-black text-white">{creators.length}</span>
                </div>
                <div className="text-white font-black text-base">{tier.name}</div>
                <div className="text-white/60 text-xs">{tier.range}</div>
              </div>
              <div className="bg-white px-5 py-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Earnings</span>
                  <span className="font-bold text-green-600">{formatEarnings(totalEarnings)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg Followers</span>
                  <span className={`font-bold ${tier.text}`}>{formatFollowers(avgFollowers)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Verified</span>
                  <span className="font-bold text-blue-600">{verifiedPct}%</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full transition-all`}
                    style={{ width: `${verifiedPct}%` }}
                  />
                </div>
                {topCreator && (
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={topCreator.profileImageUrl || ""} />
                      <AvatarFallback className={`text-xs bg-gradient-to-br ${tier.gradient} text-white`}>
                        {(topCreator.firstName?.[0] || "C").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {topCreator.firstName} {topCreator.lastName}
                    </span>
                    <span className="text-xs font-bold text-yellow-600">👑 #1</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Full Influencer Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Table header with filters */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Influencer Directory
              <Badge variant="secondary" className="text-xs">{filteredCreators.length} shown</Badge>
            </h3>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setNicheFilter("all"); setVerifiedFilter("all"); }}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Tier filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveTierTab("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeTierTab === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({allCreators.length})
            </button>
            {TIER_ORDER.map(t => {
              const tier = TIER_CONFIG[t];
              const count = (tierData[t] || []).length;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTierTab(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    activeTierTab === t
                      ? `bg-gradient-to-r ${tier.gradient} text-white shadow-md`
                      : `${tier.bg} ${tier.text} hover:opacity-80`
                  }`}
                >
                  {tier.icon} {tier.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Search & Filter row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search name, email, username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-gray-200 h-9"
              />
            </div>
            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 h-9 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="all">All Niches</option>
              {NICHES_LIST.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value as any)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 h-9 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="all">All Status</option>
              <option value="verified">✓ Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filteredCreators.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">No creators match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="w-12 text-center font-semibold text-gray-600">#</TableHead>
                  <TableHead className="font-semibold text-gray-600">Creator</TableHead>
                  <TableHead className="font-semibold text-gray-600">Tier</TableHead>
                  <TableHead className="font-semibold text-gray-600">Niche</TableHead>
                  <TableHead className="font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("followers")}>
                    Followers <SortIcon k="followers" />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-600">Platforms</TableHead>
                  <TableHead className="font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("earnings")}>
                    Earnings <SortIcon k="earnings" />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("campaigns")}>
                    Campaigns <SortIcon k="campaigns" />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-600 cursor-pointer select-none" onClick={() => toggleSort("rating")}>
                    Rating <SortIcon k="rating" />
                  </TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="font-semibold text-gray-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreators.map((creator: any, idx: number) => {
                  const tier = TIER_CONFIG[creator._tier as CreatorTier] || TIER_CONFIG.rising_sparks;
                  return (
                    <TableRow key={creator.id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Rank */}
                      <TableCell className="text-center">
                        <span className={`text-sm font-black ${idx < 3 ? tier.text : "text-gray-300"}`}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </span>
                      </TableCell>

                      {/* Creator */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={creator.profileImageUrl || ""} />
                            <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white text-sm font-bold`}>
                              {(creator.firstName?.[0] || "C").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{creator.firstName} {creator.lastName}</span>
                              {creator.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                            </div>
                            <div className="text-gray-400 text-xs truncate">{creator.email}</div>
                            {creator.username && (
                              <div className="text-gray-400 text-xs">@{creator.username}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Tier */}
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${tier.badge}`}>
                          {tier.icon} {tier.name}
                        </span>
                      </TableCell>

                      {/* Niche */}
                      <TableCell>
                        {creator.niche
                          ? <Badge variant="secondary" className="text-xs">{creator.niche}</Badge>
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </TableCell>

                      {/* Followers */}
                      <TableCell>
                        <span className={`font-black text-sm ${tier.text}`}>
                          {formatFollowers(creator.totalFollowers || 0)}
                        </span>
                      </TableCell>

                      {/* Platforms */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {creator.tiktokFollowers > 0 && <span className="text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full">TT {formatFollowers(creator.tiktokFollowers)}</span>}
                          {creator.youtubeFollowers > 0 && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">YT {formatFollowers(creator.youtubeFollowers)}</span>}
                          {creator.instagramFollowers > 0 && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">IG {formatFollowers(creator.instagramFollowers)}</span>}
                          {creator.twitterFollowers > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">X {formatFollowers(creator.twitterFollowers)}</span>}
                          {creator.twitchFollowers > 0 && <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">Tw {formatFollowers(creator.twitchFollowers)}</span>}
                          {creator.telegramFollowers > 0 && <span className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-full">TG {formatFollowers(creator.telegramFollowers)}</span>}
                          {!creator.tiktokFollowers && !creator.youtubeFollowers && !creator.instagramFollowers && !creator.twitterFollowers && !creator.twitchFollowers && !creator.telegramFollowers && (
                            <span className="text-gray-200 text-xs">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Earnings */}
                      <TableCell>
                        <span className="font-bold text-green-600 text-sm">
                          {formatEarnings(creator.totalEarned)}
                        </span>
                      </TableCell>

                      {/* Campaigns */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-sm font-semibold">{creator.completedCampaigns || 0}</span>
                        </div>
                      </TableCell>

                      {/* Rating */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{parseFloat(creator.rating || "0").toFixed(1)}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {creator.isVerified
                            ? <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full w-fit">✓ KYC</span>
                            : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full w-fit">Pending</span>
                          }
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Link href={`/profile/${creator.id}`}>
                          <Button size="sm" variant="outline" className={`text-xs h-8 px-3 rounded-xl ${tier.text} border-current group-hover:shadow-sm`}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Profile
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Table footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-400">
          <span>Showing {filteredCreators.length} of {allCreators.length} creators</span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Auto-updates on registration
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isEmailUpdateOpen, setIsEmailUpdateOpen] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");

  // Check if user is admin
  if (user?.userType !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
  });

  // Fetch creators grouped by tier
  const { data: tierData = {}, isLoading: isTierLoading } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/creators/by-tier"],
  });

  // Filter users
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = userTypeFilter === "all" || user.userType === userTypeFilter;
    return matchesSearch && matchesType;
  });

  // Forms
  const createForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      userType: "creator",
      isVerified: false,
    },
  });

  const editForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema.omit({ password: true })),
  });

  const passwordForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateModalOpen(false);
      createForm.reset();
      toast({
        title: "User Created",
        description: "New user has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/reset-password`, { password });
      return res.json();
    },
    onSuccess: () => {
      setIsPasswordResetOpen(false);
      setSelectedUser(null);
      passwordForm.reset();
      toast({
        title: "Password Reset",
        description: "User password has been reset successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle user verification
  const toggleVerificationMutation = useMutation({
    mutationFn: async ({ id, isVerified }: { id: string; isVerified: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/verification`, { isVerified });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Verification Updated",
        description: "User verification status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user email mutation (admin)
  const updateEmailMutation = useMutation({
    mutationFn: async ({ userId, newEmail }: { userId: string; newEmail: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/update-email`, { newEmail });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEmailUpdateOpen(false);
      setSelectedUser(null);
      setNewEmailInput("");
      toast({ title: "Email Updated", description: "User email has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Disable 2FA for a user (admin)
  const disable2faMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/toggle-2fa`, { enabled: false });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "2FA Disabled", description: "Two-factor authentication disabled for this user." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      isVerified: user.isVerified,
    });
    setIsEditModalOpen(true);
  };

  const handlePasswordReset = (user: any) => {
    setSelectedUser(user);
    passwordForm.reset();
    setIsPasswordResetOpen(true);
  };

  const onCreateSubmit = (data: z.infer<typeof userSchema>) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordResetSchema>) => {
    if (selectedUser) {
      resetPasswordMutation.mutate({ userId: selectedUser.id, password: data.newPassword });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage all users, their permissions, and account settings.</p>
      </div>

      {/* Demo Credentials Card */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Demo Account Credentials
          </CardTitle>
          <CardDescription className="text-blue-700">
            Pre-configured demo accounts for testing the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Admin</p>
              <p className="text-sm font-mono text-gray-700">demo@taskdrip.online</p>
              <p className="text-sm font-mono text-gray-500">Admin@2024</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Brand</p>
              <p className="text-sm font-mono text-gray-700">demobrand@taskdrip.online</p>
              <p className="text-sm font-mono text-gray-500">Brand@2024</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Creator</p>
              <p className="text-sm font-mono text-gray-700">democreator@taskdrip.online</p>
              <p className="text-sm font-mono text-gray-500">Creator@2024</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="tiers">Creator Tiers</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="creator">Creators</SelectItem>
                  <SelectItem value="brand">Brands</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the platform with specified permissions.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={createForm.control}
                      name="userType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select user type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="creator">Creator</SelectItem>
                              <SelectItem value="brand">Brand</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Manage user accounts, permissions, and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>2FA</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.userType === 'admin' ? 'destructive' :
                            user.userType === 'brand' ? 'default' : 'secondary'
                          }>
                            {user.userType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isVerified ? 'default' : 'outline'}>
                            {user.isVerified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.twoFactorEnabled
                            ? <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><ShieldCheck className="h-3 w-3 mr-1" />On</Badge>
                            : <Badge variant="outline" className="text-gray-500"><ShieldOff className="h-3 w-3 mr-1" />Off</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit user"
                              onClick={() => handleEditUser(user)}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reset password"
                              onClick={() => handlePasswordReset(user)}
                              data-testid={`button-reset-password-${user.id}`}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Update email"
                              onClick={() => { setSelectedUser(user); setNewEmailInput(user.email); setIsEmailUpdateOpen(true); }}
                              data-testid={`button-update-email-${user.id}`}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            {user.twoFactorEnabled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Disable 2FA"
                                onClick={() => disable2faMutation.mutate(user.id)}
                                className="text-orange-600 hover:text-orange-700"
                                disabled={disable2faMutation.isPending}
                                data-testid={`button-disable-2fa-${user.id}`}
                              >
                                <ShieldOff className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              title={user.isVerified ? 'Unverify' : 'Verify'}
                              onClick={() => toggleVerificationMutation.mutate({ 
                                id: user.id, 
                                isVerified: !user.isVerified 
                              })}
                            >
                              {user.isVerified ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            {user.id !== 'admin_master_001' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          <AdminTiersDashboard tierData={tierData} isTierLoading={isTierLoading} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter((u: any) => u.userType === 'creator').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Brands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter((u: any) => u.userType === 'brand').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter((u: any) => u.isVerified).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3">Creators by Tier</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TIER_ORDER.map((tierId) => {
                const tier = TIER_CONFIG[tierId];
                const count = (tierData[tierId] || []).length;
                const totalCreators = users.filter((u: any) => u.userType === 'creator').length;
                const pct = totalCreators > 0 ? Math.round((count / totalCreators) * 100) : 0;
                return (
                  <Card key={tierId} className={`border-2 ${tier.border}`}>
                    <CardHeader className={`bg-gradient-to-br ${tier.gradient} rounded-t-lg py-3 px-4`}>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{tier.icon}</span>
                        <span className="text-2xl font-black text-white">{count}</span>
                      </div>
                      <CardTitle className="text-white text-sm">{tier.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 px-4">
                      <p className={`text-xs font-medium ${tier.text}`}>{tier.range}</p>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{pct}% of all creators</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="userType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="creator">Creator</SelectItem>
                        <SelectItem value="brand">Brand</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Update Modal */}
      <Dialog open={isEmailUpdateOpen} onOpenChange={setIsEmailUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Email</DialogTitle>
            <DialogDescription>
              Change the email address for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminNewEmail">New Email Address</Label>
              <Input
                id="adminNewEmail"
                type="email"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                placeholder="new@email.com"
                data-testid="input-admin-new-email"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => selectedUser && updateEmailMutation.mutate({ userId: selectedUser.id, newEmail: newEmailInput })}
                disabled={updateEmailMutation.isPending || !newEmailInput}
                data-testid="button-admin-update-email"
              >
                {updateEmailMutation.isPending ? "Updating..." : "Update Email"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}