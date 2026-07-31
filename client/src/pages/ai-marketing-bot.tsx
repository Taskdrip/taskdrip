import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Bot, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  MessageSquare, Flame, Clock, Star, Eye, CheckCircle2,
  XCircle, Filter, Globe, Zap, TrendingUp, Target, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────
interface SocialLead {
  id: string;
  platform: "reddit" | "hackernews";
  sourceId: string;
  title: string;
  body?: string;
  url: string;
  author?: string;
  subreddit?: string;
  platformScore: number;
  commentsCount: number;
  relevanceScore: number;
  aiSummary?: string;
  suggestedReply?: string;
  category: string;
  urgency: "high" | "medium" | "low";
  status: "new" | "viewed" | "replied" | "dismissed";
  keywordsMatched?: string[];
  postedAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  newToday: number;
  highPriority: number;
  platforms: { reddit: number; hackernews: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PLATFORM_META = {
  reddit: { label: "Reddit", color: "bg-orange-500", icon: "🔴" },
  hackernews: { label: "Hacker News", color: "bg-amber-500", icon: "🟡" },
};

const URGENCY_META = {
  high: { label: "Hot Lead", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <Flame className="w-3 h-3" /> },
  medium: { label: "Warm", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Zap className="w-3 h-3" /> },
  low: { label: "Potential", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Target className="w-3 h-3" /> },
};

function RelevanceBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-400 w-7 text-right">{score}</span>
    </div>
  );
}

function LeadCard({ lead, onStatusChange }: { lead: SocialLead; onStatusChange: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const platform = PLATFORM_META[lead.platform] || PLATFORM_META.reddit;
  const urgency = URGENCY_META[lead.urgency] || URGENCY_META.medium;

  const copyReply = () => {
    if (lead.suggestedReply) {
      navigator.clipboard.writeText(lead.suggestedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const postedAgo = lead.postedAt
    ? formatDistanceToNow(new Date(lead.postedAt), { addSuffix: true })
    : formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true });

  return (
    <Card className={`bg-gray-900 border transition-all ${lead.status === "dismissed" ? "opacity-40 border-gray-800" : lead.status === "replied" ? "border-emerald-500/30" : "border-gray-700 hover:border-violet-500/40"}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className="text-xl">{platform.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge className={`${platform.color} text-white text-[10px] px-1.5 py-0.5`}>
                {platform.label}
              </Badge>
              {lead.subreddit && (
                <span className="text-[10px] text-gray-500">r/{lead.subreddit}</span>
              )}
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 border ${urgency.color} flex items-center gap-1`}>
                {urgency.icon}
                {urgency.label}
              </Badge>
              {lead.status === "replied" && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0.5">
                  ✓ Replied
                </Badge>
              )}
            </div>
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-white hover:text-violet-400 transition-colors line-clamp-2 leading-snug"
              onClick={() => lead.status === "new" && onStatusChange(lead.id, "viewed")}
            >
              {lead.title}
            </a>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-[10px] text-gray-500 flex items-center gap-1 justify-end mb-1">
              <Clock className="w-3 h-3" />
              {postedAgo}
            </div>
          </div>
        </div>

        {/* Relevance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">AI Relevance Score</span>
          </div>
          <RelevanceBar score={lead.relevanceScore} />
        </div>

        {/* AI Summary */}
        {lead.aiSummary && (
          <p className="text-xs text-gray-400 leading-relaxed bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50">
            {lead.aiSummary}
          </p>
        )}

        {/* Keywords */}
        {lead.keywordsMatched && lead.keywordsMatched.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lead.keywordsMatched.slice(0, 4).map((kw, i) => (
              <span key={i} className="text-[10px] bg-violet-900/30 text-violet-400 border border-violet-500/20 rounded-full px-2 py-0.5">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><Star className="w-3 h-3" />{lead.platformScore}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{lead.commentsCount} comments</span>
          {lead.author && <span>by u/{lead.author}</span>}
        </div>

        {/* Suggested reply (collapsible) */}
        {lead.suggestedReply && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Hide" : "Show"} AI-crafted reply
            </button>
            {expanded && (
              <div className="mt-2 relative">
                <div className="bg-gray-800 border border-violet-500/20 rounded-lg p-3 pr-20">
                  <p className="text-xs text-gray-300 leading-relaxed">{lead.suggestedReply}</p>
                </div>
                <button
                  onClick={copyReply}
                  className="absolute top-2 right-2 text-[10px] bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded-md transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => lead.status === "new" && onStatusChange(lead.id, "viewed")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Join Conversation
          </a>
          {lead.status !== "replied" && (
            <button
              onClick={() => onStatusChange(lead.id, "replied")}
              title="Mark as replied"
              className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {lead.status !== "dismissed" ? (
            <button
              onClick={() => onStatusChange(lead.id, "dismissed")}
              title="Dismiss"
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onStatusChange(lead.id, "new")}
              title="Restore"
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AiMarketingBot() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [platform, setPlatform] = useState<"all" | "reddit" | "hackernews">("all");
  const [urgency, setUrgency] = useState<"all" | "high" | "medium" | "low">("all");
  const [status, setStatus] = useState<"all" | "new" | "viewed" | "replied" | "dismissed">("all");
  const [isCrawling, setIsCrawling] = useState(false);
  const [lastCrawl, setLastCrawl] = useState<string | null>(null);

  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) navigate("/");
  }, [isAuthenticated, isAdmin]);

  // Build query params
  const params = new URLSearchParams();
  if (platform !== "all") params.set("platform", platform);
  if (urgency !== "all") params.set("urgency", urgency);
  if (status !== "all") params.set("status", status);

  const { data: leads = [], isLoading } = useQuery<SocialLead[]>({
    queryKey: ["/api/social-leads", platform, urgency, status],
    queryFn: () => fetch(`/api/social-leads?${params}`).then((r) => r.json()),
    refetchInterval: 2 * 60 * 1000, // auto-refresh every 2 min
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/social-leads/stats"],
    queryFn: () => fetch("/api/social-leads/stats").then((r) => r.json()),
    refetchInterval: 2 * 60 * 1000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/social-leads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-leads/stats"] });
    },
  });

  const handleStatusChange = useCallback((id: string, newStatus: string) => {
    updateStatus.mutate({ id, status: newStatus });
  }, [updateStatus]);

  const handleCrawl = async () => {
    setIsCrawling(true);
    try {
      await fetch("/api/social-leads/crawl", { method: "POST" });
      setLastCrawl(new Date().toLocaleTimeString());
      queryClient.invalidateQueries({ queryKey: ["/api/social-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-leads/stats"] });
    } finally {
      setIsCrawling(false);
    }
  };

  const displayedLeads = leads;
  const newCount = leads.filter((l) => l.status === "new").length;

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Hero Banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-gray-900 to-gray-950 border-b border-violet-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.15),_transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  AI Marketing Robot
                </h1>
                <p className="text-sm text-violet-300 mt-0.5">
                  Scans Reddit & Hacker News in real-time for web dev opportunities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastCrawl && (
                <span className="text-xs text-gray-500 hidden sm:block">Last crawl: {lastCrawl}</span>
              )}
              <Button
                onClick={handleCrawl}
                disabled={isCrawling}
                className="bg-violet-600 hover:bg-violet-500 text-white gap-2 font-bold"
              >
                <RefreshCw className={`w-4 h-4 ${isCrawling ? "animate-spin" : ""}`} />
                {isCrawling ? "Crawling…" : "Crawl Now"}
              </Button>
            </div>
          </div>

          {/* ── Stats ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { label: "Total Leads", value: stats?.total ?? leads.length, icon: <Globe className="w-4 h-4" />, color: "text-violet-400" },
              { label: "New Today", value: stats?.newToday ?? newCount, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-400" },
              { label: "Hot Leads", value: stats?.highPriority ?? leads.filter((l) => l.urgency === "high").length, icon: <Flame className="w-4 h-4" />, color: "text-red-400" },
              { label: "Sources Active", value: 2, icon: <Zap className="w-4 h-4" />, color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm">
                <div className={`flex items-center gap-2 mb-1 ${s.color}`}>
                  {s.icon}
                  <span className="text-xs font-medium text-gray-400">{s.label}</span>
                </div>
                <div className="text-2xl font-black text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />

            {/* Platform */}
            <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
              {(["all", "reddit", "hackernews"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 font-medium transition-colors ${platform === p ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  {p === "all" ? "All Platforms" : p === "reddit" ? "🔴 Reddit" : "🟡 HN"}
                </button>
              ))}
            </div>

            {/* Urgency */}
            <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
              {(["all", "high", "medium", "low"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`px-3 py-1.5 font-medium transition-colors capitalize ${urgency === u ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  {u === "high" ? "🔥 Hot" : u === "medium" ? "⚡ Warm" : u === "low" ? "🎯 Potential" : "All Urgency"}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
              {(["all", "new", "viewed", "replied", "dismissed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 font-medium transition-colors capitalize ${status === s ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-gray-500">{displayedLeads.length} leads</span>
          </div>
        </div>
      </div>

      {/* ── Lead Feed ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {isCrawling ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-violet-400 animate-pulse" />
            </div>
            <p className="text-gray-400 font-medium">AI Robot is scanning social media…</p>
            <p className="text-xs text-gray-600">This takes 30–90 seconds. New leads will appear automatically.</p>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : displayedLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-400 font-medium">No leads found yet</p>
              <p className="text-xs text-gray-600 mt-1">Click "Crawl Now" to start scanning social media for web dev requests.</p>
            </div>
            <Button onClick={handleCrawl} className="bg-violet-600 hover:bg-violet-500 gap-2 mt-2">
              <Bot className="w-4 h-4" />
              Start First Crawl
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayedLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Info Footer ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pb-10 sm:px-6">
        <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-400" />
            How the AI Marketing Robot Works
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-gray-500">
            <div className="flex gap-2">
              <span className="text-violet-400 font-bold mt-0.5">1.</span>
              <p><span className="text-gray-300 font-medium">Crawls</span> Reddit (r/forhire, r/webdev, r/entrepreneur, r/smallbusiness + more) and Hacker News every hour for new posts matching web development keywords.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-violet-400 font-bold mt-0.5">2.</span>
              <p><span className="text-gray-300 font-medium">AI scores</span> each post 0–100 for relevance using Groq LLaMA. High scores = genuine client looking for a developer. Urgency is flagged automatically.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-violet-400 font-bold mt-0.5">3.</span>
              <p><span className="text-gray-300 font-medium">Join the conversation</span> using the AI-crafted reply suggestion — copy it and post it directly in the thread to attract clients to Taskdrip.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
