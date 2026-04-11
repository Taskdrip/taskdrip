import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTierConfig, formatFollowers, NICHES, TIER_ORDER, TIER_CONFIG, type CreatorTier } from "@/lib/tiers";
import { Search, MapPin, Star, MessageSquare, Users, ExternalLink, ChevronRight, ArrowLeft, Trophy, TrendingUp, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const PLATFORMS = ["All", "TikTok", "YouTube", "Instagram", "Twitter", "Twitch", "Telegram"];

function TierHeroCard({
  tierId,
  count,
  topCreator,
  onClick,
}: {
  tierId: CreatorTier;
  count: number;
  topCreator?: any;
  onClick: () => void;
}) {
  const tier = TIER_CONFIG[tierId];
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-2xl overflow-hidden border-2 ${tier.border} group hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl focus:outline-none`}
    >
      <div className={`bg-gradient-to-br ${tier.gradient} p-6 sm:p-8`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-4xl sm:text-5xl block mb-2">{tier.icon}</span>
            <h3 className="text-xl sm:text-2xl font-black text-white">{tier.name}</h3>
            <p className="text-white/80 text-sm font-medium mt-1">{tier.range} followers</p>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-black text-white">{count}</div>
            <div className="text-white/70 text-xs">{count === 1 ? "Creator" : "Creators"}</div>
          </div>
        </div>
        <p className="text-white/75 text-sm mb-4">{tier.description}</p>
        {topCreator && (
          <div className="flex items-center gap-2 bg-black/20 rounded-xl p-2.5 mb-4">
            <Avatar className="w-8 h-8 border-2 border-white/30">
              <AvatarImage src={topCreator.profileImageUrl || ""} />
              <AvatarFallback className="text-xs font-bold text-white bg-black/30">
                {(topCreator.firstName?.[0] || "C").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {topCreator.firstName} {topCreator.lastName}
              </p>
              <p className="text-white/60 text-xs">{formatFollowers(topCreator.totalFollowers || 0)} followers</p>
            </div>
            <Trophy className="w-4 h-4 text-yellow-300 flex-shrink-0" />
          </div>
        )}
        <div className="flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-3 transition-all">
          <span>View All {tier.name}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}

function CreatorCard({ creator }: { creator: any }) {
  const tier = getTierConfig(creator.creatorTier || "rising_sparks");
  const totalFollowers = creator.totalFollowers || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
      <div className={`h-20 bg-gradient-to-br ${tier.gradient} relative`}>
        {creator.bannerImageUrl && (
          <img src={creator.bannerImageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="p-4 -mt-8 relative">
        <div className="flex justify-between items-start mb-3">
          <Avatar className="w-14 h-14 border-4 border-white shadow-md ring-2 ring-gray-100">
            <AvatarImage src={creator.profileImageUrl || ""} />
            <AvatarFallback className={`bg-gradient-to-br ${tier.gradient} text-white font-bold text-lg`}>
              {(creator.firstName?.[0] || "C").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="mt-9">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${tier.badge}`}>
              {tier.icon} {tier.name}
            </span>
          </div>
        </div>

        <h3 className="font-bold text-black text-sm leading-tight">
          {creator.firstName} {creator.lastName}
          {creator.isVerified && (
            <CheckCircle className="w-3.5 h-3.5 text-blue-500 inline-block ml-1 mb-0.5" />
          )}
        </h3>
        {creator.username && (
          <p className="text-gray-400 text-xs mb-1">@{creator.username}</p>
        )}

        {creator.niche && (
          <Badge variant="secondary" className="text-xs mb-2">{creator.niche}</Badge>
        )}

        {creator.location && (
          <div className="flex items-center text-gray-400 text-xs mb-2 gap-1">
            <MapPin className="w-3 h-3" />
            {creator.location}
          </div>
        )}

        {creator.bio && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3">{creator.bio}</p>
        )}

        <div className="bg-gray-50 rounded-xl p-2.5 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 font-medium">Total Followers</span>
            <span className={`text-sm font-black ${tier.text}`}>{formatFollowers(totalFollowers)}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {creator.tiktokFollowers > 0 && (
              <span className="text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full font-medium">
                TikTok {formatFollowers(creator.tiktokFollowers)}
              </span>
            )}
            {creator.youtubeFollowers > 0 && (
              <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                YT {formatFollowers(creator.youtubeFollowers)}
              </span>
            )}
            {creator.instagramFollowers > 0 && (
              <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">
                IG {formatFollowers(creator.instagramFollowers)}
              </span>
            )}
            {creator.twitterFollowers > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                X {formatFollowers(creator.twitterFollowers)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-3.5 h-3.5 fill-yellow-500" />
            <span className="text-xs font-semibold text-black">{parseFloat(creator.rating || "0").toFixed(1)}</span>
          </div>
          <div className="flex gap-1.5">
            <Link href={`/profile/${creator.id}`}>
              <Button size="sm" variant="outline" className="rounded-lg border-gray-200 text-xs h-7 px-2.5">
                <ExternalLink className="w-3 h-3 mr-1" /> Profile
              </Button>
            </Link>
            <Link href={`/messages?to=${creator.id}`}>
              <Button size="sm" className={`rounded-lg text-xs h-7 px-2.5 bg-gradient-to-r ${tier.gradient} border-0 text-white`}>
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
  const [activeTier, setActiveTier] = useState<CreatorTier | null>(null);
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("followers");

  const { data: tierData = {}, isLoading } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/creators/by-tier"],
  });

  const tierCounts: Record<string, number> = {};
  for (const t of TIER_ORDER) {
    tierCounts[t] = (tierData[t] || []).length;
  }

  const totalCreators = Object.values(tierCounts).reduce((a, b) => a + b, 0);

  const currentTierCreators: any[] = activeTier
    ? (tierData[activeTier] || [])
        .filter((c: any) => {
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
            return name.includes(q) || (c.username || "").toLowerCase().includes(q) || (c.niche || "").toLowerCase().includes(q);
          }
          return true;
        })
        .sort((a: any, b: any) => {
          if (sortBy === "followers") return (b.totalFollowers || 0) - (a.totalFollowers || 0);
          if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
          if (sortBy === "completed") return (b.completedCampaigns || 0) - (a.completedCampaigns || 0);
          return 0;
        })
    : [];

  const activeTierConfig = activeTier ? TIER_CONFIG[activeTier] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Header */}
      <div className="bg-black text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {activeTier && activeTierConfig ? (
            <div>
              <button
                onClick={() => { setActiveTier(null); setSearch(""); setNiche("all"); setPlatform("All"); }}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to All Tiers
              </button>
              <div className="flex items-center gap-4">
                <span className="text-5xl">{activeTierConfig.icon}</span>
                <div>
                  <h1 className="text-4xl font-black">{activeTierConfig.name}</h1>
                  <p className="text-gray-400 mt-1">{activeTierConfig.range} followers · {tierCounts[activeTier]} creators</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-8 h-8 text-purple-400" />
                <h1 className="text-4xl font-black">Influencer Tiers</h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl">
                {totalCreators} verified creators across 4 tiers — browse by audience size, niche, and platform.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {!activeTier ? (
          /* ── Tier Overview ── */
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-52 rounded-2xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {TIER_ORDER.map((tierId) => {
                  const creators = tierData[tierId] || [];
                  return (
                    <TierHeroCard
                      key={tierId}
                      tierId={tierId}
                      count={creators.length}
                      topCreator={creators[0]}
                      onClick={() => setActiveTier(tierId)}
                    />
                  );
                })}
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
          </>
        ) : (
          /* ── Tier Detail View ── */
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="sm:col-span-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-gray-200"
                  />
                </div>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="all">All Niches</option>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="followers">Most Followers</option>
                  <option value="rating">Top Rated</option>
                  <option value="completed">Most Campaigns</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      platform === p ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-gray-700 text-sm">{currentTierCreators.length} influencers found</span>
            </div>

            {currentTierCreators.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">No influencers found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {currentTierCreators.map((creator: any) => (
                  <CreatorCard key={creator.id} creator={creator} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
