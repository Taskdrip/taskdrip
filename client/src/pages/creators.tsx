import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTierConfig, formatFollowers, NICHES } from "@/lib/tiers";
import { Search, MapPin, Star, MessageSquare, Users, Filter, Flame, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const PLATFORMS = ["All", "TikTok", "YouTube", "Instagram", "Twitter", "Twitch", "Telegram"];
const TIERS = [
  { value: "all", label: "All Tiers" },
  { value: "rising_sparks", label: "🔥 Rising Sparks" },
  { value: "growth_engines", label: "⚡ Growth Engines" },
  { value: "power_influencers", label: "💎 Power Influencers" },
  { value: "global_titans", label: "👑 Global Titans" },
];

function CreatorCard({ creator }: { creator: any }) {
  const tier = getTierConfig(creator.creatorTier || "rising_sparks");
  const totalFollowers = creator.totalFollowers || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
      {/* Banner */}
      <div className={`h-24 bg-gradient-to-br ${tier.gradient} relative`}>
        {creator.bannerImageUrl && (
          <img src={creator.bannerImageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="p-5 -mt-8 relative">
        <div className="flex justify-between items-start mb-3">
          <Avatar className="w-16 h-16 border-4 border-white shadow-md ring-2 ring-gray-100">
            <AvatarImage src={creator.profileImageUrl || ""} />
            <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold text-xl`}>
              {(creator.firstName?.[0] || "C").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="mt-10">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tier.badge}`}>
              {tier.icon} {tier.name}
            </span>
          </div>
        </div>

        <h3 className="font-bold text-black text-base">
          {creator.firstName} {creator.lastName}
        </h3>
        {creator.username && (
          <p className="text-gray-400 text-xs mb-1">@{creator.username}</p>
        )}
        {creator.niche && (
          <Badge variant="secondary" className="text-xs mb-2">{creator.niche}</Badge>
        )}
        {creator.bio && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3">{creator.bio}</p>
        )}

        {creator.location && (
          <div className="flex items-center text-gray-400 text-xs mb-3 gap-1">
            <MapPin className="w-3 h-3" />
            {creator.location}
          </div>
        )}

        {/* Follower Count */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Total Followers</span>
            <span className={`text-sm font-black ${tier.text}`}>{formatFollowers(totalFollowers)}</span>
          </div>
          {/* Platform breakdown */}
          <div className="flex flex-wrap gap-1 mt-2">
            {creator.tiktokFollowers > 0 && (
              <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                TikTok {formatFollowers(creator.tiktokFollowers)}
              </span>
            )}
            {creator.youtubeFollowers > 0 && (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                YT {formatFollowers(creator.youtubeFollowers)}
              </span>
            )}
            {creator.instagramFollowers > 0 && (
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                IG {formatFollowers(creator.instagramFollowers)}
              </span>
            )}
            {creator.twitterFollowers > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                X {formatFollowers(creator.twitterFollowers)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-3.5 h-3.5 fill-yellow-500" />
            <span className="text-sm font-semibold text-black">{parseFloat(creator.rating || "0").toFixed(1)}</span>
            {creator.isVerified && (
              <Badge className="ml-1 text-xs bg-blue-100 text-blue-700 border-0 px-1.5 py-0">✓ KYC</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/messages?to=${creator.id}`}>
              <Button size="sm" variant="outline" className="rounded-lg border-gray-200 text-xs h-8 px-3">
                <MessageSquare className="w-3 h-3 mr-1" /> Message
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Creators() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("followers");

  const { data: creators = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/creators"],
  });

  const filtered = (creators as any[]).filter((c: any) => {
    if (tier !== "all" && c.creatorTier !== tier) return false;
    if (niche !== "all" && c.niche !== niche) return false;
    if (platform !== "All") {
      const platformMap: Record<string, string> = {
        TikTok: "tiktokFollowers",
        YouTube: "youtubeFollowers",
        Instagram: "instagramFollowers",
        Twitter: "twitterFollowers",
        Twitch: "twitchFollowers",
        Telegram: "telegramFollowers",
      };
      const key = platformMap[platform];
      if (!c[key] || c[key] === 0) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(q) || (c.username || "").toLowerCase().includes(q) || (c.niche || "").toLowerCase().includes(q) || (c.location || "").toLowerCase().includes(q);
    }
    return true;
  }).sort((a: any, b: any) => {
    if (sortBy === "followers") return (b.totalFollowers || 0) - (a.totalFollowers || 0);
    if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
    if (sortBy === "completed") return (b.completedCampaigns || 0) - (a.completedCampaigns || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Header */}
      <div className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl font-black">Influencer Discovery</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl">
            Browse verified influencers by tier, niche, platform, and location. Find the perfect fit for your campaign.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
            <Filter className="w-4 h-4" />
            <span>Filter & Search</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, username, niche..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-gray-200"
              />
            </div>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="All Niches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Niches</SelectItem>
                {NICHES.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="followers">Most Followers</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="completed">Most Campaigns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Platform filter pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  platform === p
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Banner */}
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <span className="font-semibold text-gray-700">{filtered.length} influencers found</span>
          {tier !== "all" && (
            <Badge className={`${getTierConfig(tier).badge} ml-2`}>
              {getTierConfig(tier).icon} {getTierConfig(tier).name}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">No influencers found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((creator: any) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}

        {!isAuthenticated && (
          <div className="mt-10 bg-black text-white rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Sign Up to Connect with Influencers</h3>
            <p className="text-gray-400 mb-6">Create a brand account to message influencers and launch targeted campaigns.</p>
            <Link href="/signup?type=brand">
              <Button className="bg-white text-black hover:bg-gray-100 px-8 py-5 rounded-xl font-bold text-base">
                Get Started Free
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
