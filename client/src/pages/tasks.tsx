import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Zap, Users, DollarSign, Clock, Calendar, ChevronRight,
  Flame, Star, TrendingUp, Shield, CheckCircle, ArrowRight, Filter,
  Target, Award, Sparkles, Globe, Instagram, Youtube, Twitter, Twitch,
  Bot, X, HelpCircle
} from "lucide-react";

const CATEGORIES = ["All", "Social Media", "Gaming", "Technology", "Health & Fitness", "Fashion & Beauty", "Crypto & Web3", "Education", "Other"];

const PLATFORM_ICONS: Record<string, any> = {
  Instagram: { icon: Instagram, color: "text-pink-500" },
  YouTube: { icon: Youtube, color: "text-red-500" },
  Twitter: { icon: Twitter, color: "text-sky-500" },
  TikTok: { icon: Globe, color: "text-black" },
  Twitch: { icon: Twitch, color: "text-purple-500" },
};

function getCategoryGradient(category: string): string {
  const gradients: Record<string, string> = {
    "Social Media": "from-violet-600 via-purple-600 to-indigo-700",
    "Gaming": "from-cyan-600 via-blue-600 to-indigo-700",
    "Technology": "from-slate-700 via-gray-700 to-zinc-800",
    "Health & Fitness": "from-emerald-500 via-green-600 to-teal-700",
    "Fashion & Beauty": "from-rose-500 via-pink-600 to-fuchsia-700",
    "Crypto & Web3": "from-amber-500 via-orange-600 to-yellow-700",
    "Education": "from-blue-600 via-indigo-600 to-violet-700",
    "Other": "from-gray-600 via-slate-700 to-zinc-800",
  };
  return gradients[category] || "from-violet-600 via-purple-600 to-indigo-700";
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    "Social Media": "📱", "Gaming": "🎮", "Technology": "💻",
    "Health & Fitness": "💪", "Fashion & Beauty": "✨",
    "Crypto & Web3": "🪙", "Education": "🎓", "Other": "📝",
  };
  return emojis[category] || "📝";
}

function TaskCard({ campaign }: { campaign: any }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const filled = campaign.filledSlots || 0;
  const total = campaign.totalSlots || 1;
  const pct = Math.min((filled / total) * 100, 100);
  const daysLeft = campaign.deadline
    ? Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86400000))
    : null;
  const isUrgent = daysLeft !== null && daysLeft <= 3;
  const isFull = filled >= total;

  const handleClick = () => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    setLocation(`/campaigns/${campaign.id}`);
  };

  const gradient = getCategoryGradient(campaign.category);

  return (
    <div
      data-testid={`task-card-${campaign.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl border border-gray-100 hover:border-purple-200 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
      onClick={handleClick}
    >
      {/* Featured Image */}
      <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${gradient}`}>
        {campaign.featureImage ? (
          <img
            src={campaign.featureImage}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-6xl opacity-70">{getCategoryEmoji(campaign.category)}</span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <Badge className="bg-white/90 text-gray-900 text-xs font-semibold backdrop-blur-sm">
            {getCategoryEmoji(campaign.category)} {campaign.category}
          </Badge>
          {isUrgent && !isFull && (
            <Badge className="bg-red-500 text-white text-xs font-semibold animate-pulse">
              🔥 Urgent
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-bold text-green-700 text-lg">{parseFloat(campaign.reward).toFixed(0)}</span>
            <span className="text-gray-500 text-xs font-medium">USDT</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-2">
          {campaign.brandLogo ? (
            <img src={campaign.brandLogo} className="w-5 h-5 rounded-full object-cover" alt={campaign.brandName} />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {campaign.brandName?.charAt(0) || "B"}
            </div>
          )}
          <span className="text-xs text-gray-500 font-medium">{campaign.brandName}</span>
          {campaign.isActive && <CheckCircle className="w-3 h-3 text-green-500 ml-auto flex-shrink-0" />}
        </div>

        <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-2 group-hover:text-purple-700 transition-colors">
          {campaign.title}
        </h3>
        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed flex-1">
          {campaign.description}
        </p>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>{campaign.estimatedTime || "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{total - filled} left</span>
          </div>
          {daysLeft !== null && (
            <div className={`flex items-center gap-1 ${isUrgent ? "text-red-500 font-semibold" : ""}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{daysLeft}d left</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{filled}/{total} filled</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${
                isFull ? "bg-red-400" : "bg-gradient-to-r from-purple-500 to-indigo-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleClick}
          disabled={isFull}
          data-testid={`btn-apply-${campaign.id}`}
          className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            isFull
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-purple-300/50"
          }`}
        >
          {isFull ? "Slots Full" : (
            <>View & Apply <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

function FeaturedTaskCard({ campaign }: { campaign: any }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const filled = campaign.filledSlots || 0;
  const total = campaign.totalSlots || 1;
  const pct = Math.min((filled / total) * 100, 100);

  return (
    <div
      className="relative rounded-3xl overflow-hidden cursor-pointer group"
      onClick={() => setLocation(isAuthenticated ? `/campaigns/${campaign.id}` : "/login")}
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(campaign.category)}`} />
      {campaign.featureImage && (
        <img
          src={campaign.featureImage}
          alt={campaign.title}
          className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

      <div className="relative p-8 md:p-12 min-h-[280px] flex flex-col justify-end">
        <div className="flex items-center gap-2 mb-3">
          <Badge className="bg-yellow-400 text-yellow-900 font-bold text-xs px-3 py-1">
            ⭐ Featured Task
          </Badge>
          <Badge className="bg-white/20 text-white border border-white/30 backdrop-blur-sm text-xs">
            {getCategoryEmoji(campaign.category)} {campaign.category}
          </Badge>
        </div>

        <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-2 max-w-2xl leading-tight">
          {campaign.title}
        </h2>
        <p className="text-white/80 text-sm md:text-base max-w-xl line-clamp-2 mb-6">
          {campaign.description}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-300" />
              <span className="text-3xl font-extrabold text-white">{parseFloat(campaign.reward).toFixed(0)}</span>
              <span className="text-white/70 text-sm font-medium">USDT</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Users className="w-4 h-4" />
            <span>{total - filled} of {total} slots available</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Clock className="w-4 h-4" />
            <span>{campaign.estimatedTime || "Flexible"}</span>
          </div>
          <Button className="ml-auto bg-white text-gray-900 hover:bg-yellow-50 font-bold px-6 rounded-xl shadow-lg group/btn">
            Apply Now
            <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* progress */}
        <div className="mt-4 max-w-sm">
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideBot({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState("Pick a task that matches your audience, check the reward and slots, then open it to apply.");
  const tips = [
    { label: "How do I apply?", text: isAuthenticated ? "Click View & Apply on any task, review the brief, then submit your application from the campaign page." : "Create a free creator account first, then return here and click View & Apply on any campaign." },
    { label: "How do payouts work?", text: "After your proof is approved, the reward is released to your crypto wallet through the supported USDT or TON payment options." },
    { label: "Find best tasks", text: "Use category filters, search by brand or topic, and sort by Highest Reward when you want the biggest payouts first." },
    { label: "What should I submit?", text: "Follow the campaign requirements exactly and submit clear proof links or screenshots so review can happen quickly." },
  ];

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div data-testid="panel-guide-bot" className="w-[calc(100vw-2rem)] max-w-sm bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Taskdrip Guide Bot</h3>
                  <p className="text-xs text-white/75">Campaign help is active</p>
                </div>
              </div>
              <button data-testid="button-close-guide-bot" onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-sm text-gray-700 leading-relaxed" data-testid="text-guide-bot-tip">
              {tip}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {tips.map((item) => (
                <button
                  key={item.label}
                  data-testid={`button-guide-tip-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  onClick={() => setTip(item.text)}
                  className="text-left text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-purple-50 hover:text-purple-700 border border-gray-100 hover:border-purple-200 rounded-xl p-3 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={isAuthenticated ? "/profile" : "/signup"}>
                <Button data-testid="button-guide-primary-action" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs">
                  {isAuthenticated ? "Open Profile" : "Create Account"}
                </Button>
              </Link>
              <Button data-testid="button-guide-view-tasks" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => setTip("Scroll the live task grid, compare reward, available slots, deadline, and requirements before applying.")}>
                Browse Tips
              </Button>
            </div>
          </div>
        </div>
      )}
      <button
        data-testid="button-open-guide-bot"
        onClick={() => setOpen((value) => !value)}
        className="group rounded-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-2xl shadow-purple-500/30 px-4 py-3 flex items-center gap-2 hover:scale-105 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
        <span className="font-bold text-sm">Guide Bot</span>
      </button>
    </div>
  );
}

export default function TasksPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"reward" | "newest" | "slots">("newest");

  const { data: rawCampaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
  });

  const campaigns = (rawCampaigns as any[]).filter((c: any) => c.isActive && c.status === "active");

  const filtered = campaigns
    .filter((c: any) => {
      const matchCat = activeCategory === "All" || c.category === activeCategory;
      const matchSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.brandName?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "reward") return parseFloat(b.reward) - parseFloat(a.reward);
      if (sortBy === "slots") return (b.totalSlots - (b.filledSlots || 0)) - (a.totalSlots - (a.filledSlots || 0));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const featured = campaigns.find((c: any) => c.featureImage) || campaigns[0];
  const totalRewards = campaigns.reduce((s: number, c: any) => s + parseFloat(c.reward || 0), 0);
  const totalSlots = campaigns.reduce((s: number, c: any) => s + (c.totalSlots || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-gray-950 via-violet-950 to-indigo-950 overflow-hidden">
        {/* animated blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-700/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white/80 text-sm font-medium mb-6">
              <Zap className="w-4 h-4 text-yellow-400" />
              Live Tasks — Earn Crypto Today
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight tracking-tight">
              Complete Tasks,{" "}
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Earn Crypto
              </span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Join the #1 Web3 influencer marketplace. Complete brand campaigns and get paid in USDT & TON — instantly.
            </p>

            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <Button
                  onClick={() => setLocation("/signup")}
                  data-testid="btn-get-started"
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-bold px-8 py-3 text-base rounded-xl shadow-lg shadow-yellow-500/30"
                >
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={() => setLocation("/login")}
                  data-testid="btn-login"
                  className="bg-white/15 border border-white/40 text-white hover:bg-white/25 px-8 py-3 text-base rounded-xl backdrop-blur-sm"
                >
                  Log In
                </Button>
              </div>
            )}
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Target className="w-5 h-5 text-purple-400" />, value: campaigns.length, label: "Active Tasks", suffix: "" },
              { icon: <DollarSign className="w-5 h-5 text-green-400" />, value: totalRewards.toFixed(0), label: "Total Rewards", suffix: " USDT" },
              { icon: <Users className="w-5 h-5 text-blue-400" />, value: totalSlots, label: "Open Slots", suffix: "" },
              { icon: <Award className="w-5 h-5 text-yellow-400" />, value: "10K+", label: "Active Influencers", suffix: "" },
            ].map((stat, i) => (
              <div key={i} data-testid={`stat-tasks-${stat.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-center">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <div className="text-2xl font-extrabold text-white">{stat.value}{stat.suffix}</div>
                <div className="text-white/60 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Featured Task Spotlight */}
        {featured && !isLoading && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-900">Spotlight Task</h2>
            </div>
            <FeaturedTaskCard campaign={featured} />
          </section>
        )}

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              data-testid="input-search-tasks"
              placeholder="Search tasks, brands, or categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-gray-200 rounded-xl h-11"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              data-testid="select-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="newest">Newest First</option>
              <option value="reward">Highest Reward</option>
              <option value="slots">Most Slots</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              data-testid={`filter-cat-${cat}`}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-300/30"
                  : "bg-white text-gray-600 hover:text-purple-600 hover:border-purple-300 border border-gray-200"
              }`}
            >
              {cat === "All" ? "🌐 All" : `${getCategoryEmoji(cat)} ${cat}`}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 text-sm">
            Showing <span className="font-semibold text-gray-900">{filtered.length}</span> tasks
            {activeCategory !== "All" && <> in <span className="text-purple-600 font-semibold">{activeCategory}</span></>}
          </p>
          {!isAuthenticated && (
            <Link href="/signup">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs">
                Join to Apply <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-500 mb-6">
              {search || activeCategory !== "All"
                ? "Try adjusting your search or category filter"
                : "No active tasks at the moment. Check back soon!"}
            </p>
            <Button
              onClick={() => { setSearch(""); setActiveCategory("All"); }}
              variant="outline"
              className="rounded-xl"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Task Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {filtered.map((campaign: any) => (
              <TaskCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        {/* Trust section for non-logged users */}
        {!isAuthenticated && !isLoading && (
          <section className="mt-16 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-600/20 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex justify-center gap-3 mb-5">
                <Shield className="w-8 h-8 text-green-400" />
                <TrendingUp className="w-8 h-8 text-yellow-400" />
                <Flame className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
                Ready to Earn Crypto?
              </h2>
              <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
                Join 10,000+ creators already earning USDT & TON by completing brand campaigns. Free to join, instant payouts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setLocation("/signup")}
                  data-testid="btn-join-now"
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 font-bold px-8 py-3 rounded-xl text-base shadow-lg shadow-yellow-500/30 hover:from-yellow-500 hover:to-orange-500"
                >
                  Join as Creator — It's Free
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/signup?type=brand")}
                  data-testid="btn-join-brand"
                  className="border-white/30 text-white hover:bg-white/10 px-8 py-3 rounded-xl text-base"
                >
                  Post a Task as Brand
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/60 text-sm">
                {["✅ Admin-Verified Payouts", "🔒 Escrow Protection", "⚡ Instant Notifications", "🌍 Global Creators"].map((feat, i) => (
                  <span key={i}>{feat}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How it Works — escrow flow */}
        <section className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">How Taskdrip Works</h2>
            <p className="text-gray-500">A safe, admin-mediated flow for brands and creators</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: "🏢",
                title: "Brand Posts Task",
                desc: "Brand creates a campaign and deposits reward into admin-held escrow — funds are locked & safe.",
                color: "from-blue-500 to-indigo-600",
              },
              {
                step: "02",
                icon: "✅",
                title: "Admin Activates",
                desc: "Admin verifies payment and activates the task so creators can discover and apply.",
                color: "from-purple-500 to-violet-600",
              },
              {
                step: "03",
                icon: "🎯",
                title: "Creator Completes",
                desc: "Approved creators complete the task and submit proof (links, screenshots) for review.",
                color: "from-pink-500 to-rose-600",
              },
              {
                step: "04",
                icon: "💰",
                title: "Admin Releases Pay",
                desc: "Admin reviews proof and releases USDT/TON reward directly to the creator's wallet.",
                color: "from-green-500 to-emerald-600",
              },
            ].map((step) => (
              <div key={step.step} className="relative">
                <div className={`bg-gradient-to-br ${step.color} rounded-2xl p-6 text-white h-full`}>
                  <div className="text-xs font-bold opacity-60 mb-2">STEP {step.step}</div>
                  <div className="text-3xl mb-3">{step.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <GuideBot isAuthenticated={isAuthenticated} />
      <Footer />
    </div>
  );
}
