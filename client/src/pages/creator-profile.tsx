import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getTierConfig, formatFollowers } from "@/lib/tiers";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  SiTiktok, SiYoutube, SiInstagram, SiX, SiTwitch, SiTelegram, SiWhatsapp, SiLinkedin
} from "react-icons/si";
import {
  MapPin, Users, Trophy, Star, Heart, MessageCircle, Send,
  CheckCircle, TrendingUp, Gift, ExternalLink, BarChart3,
  UserPlus, UserCheck, Globe, Briefcase, Zap, Flame, Crown,
  Eye, Share2, Edit3
} from "lucide-react";

function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" disabled={readOnly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readOnly && setHover(s)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}>
          <Star className={`w-5 h-5 transition-colors ${(hover || value) >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

const BUILT_IN_SOCIAL_CONFIG: Record<string, { icon: any; label: string; bg: string; legacyPrefix: string }> = {
  tiktok: { icon: SiTiktok, label: 'TikTok', bg: 'bg-black', legacyPrefix: 'https://tiktok.com/@' },
  youtube: { icon: SiYoutube, label: 'YouTube', bg: 'bg-red-600', legacyPrefix: 'https://youtube.com/@' },
  instagram: { icon: SiInstagram, label: 'Instagram', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', legacyPrefix: 'https://instagram.com/' },
  twitter: { icon: SiX, label: 'X (Twitter)', bg: 'bg-black', legacyPrefix: 'https://x.com/' },
  twitch: { icon: SiTwitch, label: 'Twitch', bg: 'bg-violet-600', legacyPrefix: 'https://twitch.tv/' },
  telegram: { icon: SiTelegram, label: 'Telegram', bg: 'bg-sky-500', legacyPrefix: 'https://t.me/' },
  whatsapp: { icon: SiWhatsapp, label: 'WhatsApp', bg: 'bg-green-500', legacyPrefix: 'https://wa.me/c/' },
  linkedin: { icon: SiLinkedin, label: 'LinkedIn', bg: 'bg-blue-700', legacyPrefix: 'https://linkedin.com/in/' },
};

function normalizeUrl(value: string, prefix: string): string {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const handle = value.startsWith('@') ? value.slice(1) : value;
  return `${prefix}${handle}`;
}

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [activeFollowTab, setActiveFollowTab] = useState<"followers" | "following" | null>(null);

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: [`/api/creators/${id}/profile`],
    enabled: !!id,
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: [`/api/users/${id}/follow`],
    enabled: !!id && isAuthenticated,
  });

  const { data: customPlatforms = [] } = useQuery<any[]>({
    queryKey: ['/api/social-platforms'],
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${id}/follow`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}/follow`] });
      queryClient.invalidateQueries({ queryKey: [`/api/creators/${id}/profile`] });
      toast({ title: data.following ? "Following! 🔥" : "Unfollowed", description: data.following ? `You're now following ${profile?.firstName}` : `You unfollowed ${profile?.firstName}` });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${id}/reviews`, { rating: reviewRating, comment: reviewComment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/creators/${id}/profile`] });
      toast({ title: "Review submitted! ⭐" });
      setReviewDialogOpen(false);
      setReviewComment("");
      setReviewRating(5);
    },
    onError: () => toast({ title: "Failed to submit review", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a]">
        <NavigationFixed />
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-purple-500/30 border-t-purple-500" />
            <div className="absolute inset-0 rounded-full blur-md bg-purple-500/20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Creator not found</h1>
          <p className="text-gray-500 mb-6">This profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/creators")}>Browse Creators</Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = (user as any)?.id === id;
  const isFollowing = followStatus?.following ?? false;

  // Build built-in social links
  const builtInLinks: { icon: any; url: string; followers: number; bg: string; label: string }[] = [];
  const fields = [
    { slug: 'tiktok', value: profile.tiktokHandle, followers: profile.tiktokFollowers },
    { slug: 'youtube', value: profile.youtubeHandle, followers: profile.youtubeFollowers },
    { slug: 'instagram', value: profile.instagramHandle, followers: profile.instagramFollowers },
    { slug: 'twitter', value: profile.twitterHandle, followers: profile.twitterFollowers },
    { slug: 'twitch', value: profile.twitchHandle, followers: profile.twitchFollowers },
    { slug: 'telegram', value: profile.telegramChannel, followers: profile.telegramFollowers },
    { slug: 'whatsapp', value: profile.whatsappChannel, followers: profile.whatsappFollowers },
    { slug: 'linkedin', value: profile.linkedinHandle, followers: 0 },
  ];
  for (const f of fields) {
    if (f.value) {
      const cfg = BUILT_IN_SOCIAL_CONFIG[f.slug];
      if (cfg) {
        builtInLinks.push({ icon: cfg.icon, url: normalizeUrl(f.value, cfg.legacyPrefix), followers: f.followers || 0, bg: cfg.bg, label: cfg.label });
      }
    }
  }

  // Build custom social links (from userSocialLinks + admin platforms)
  const customLinks = (profile.socialLinks || []).map((link: any) => {
    const platform = customPlatforms.find((p: any) => p.slug === link.platformSlug);
    return { label: platform?.name || link.platformSlug, url: link.url, followers: link.followerCount || 0, bg: platform?.bgColor || '#6366f1', iconClass: platform?.iconClass };
  });

  const allSocialLinks = [...builtInLinks, ...customLinks];
  const totalSocialFollowers = allSocialLinks.reduce((acc, s) => acc + (s.followers || 0), 0);

  const avgRating = profile.reviews?.length
    ? (profile.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / profile.reviews.length).toFixed(1)
    : "0.0";

  const rankInfo = (() => {
    switch (profile.creatorTier) {
      case "global_titans": return { label: "Global Titan", color: "bg-gradient-to-r from-purple-600 to-pink-600 text-white", emoji: "👑" };
      case "power_influencers": return { label: "Power Influencer", color: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white", emoji: "⚡" };
      case "growth_engines": return { label: "Growth Engine", color: "bg-gradient-to-r from-green-600 to-emerald-500 text-white", emoji: "🚀" };
      default: return { label: "Rising Spark", color: "bg-gradient-to-r from-amber-500 to-orange-500 text-white", emoji: "✨" };
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] via-[#0f0f1a] to-gray-50">
      <NavigationFixed />

      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {profile.bannerImageUrl ? (
          <img src={profile.bannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-[#0f0f1a]">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(59,130,246,0.2) 0%, transparent 60%)' }} />
            <div className="absolute inset-0 grid grid-cols-8 gap-4 opacity-10 p-8">
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} className="h-px bg-purple-400" style={{ transform: `rotate(${Math.random() * 60 - 30}deg)`, opacity: Math.random() }} />
              ))}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a] via-[#0f0f1a]/30 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 relative z-10 pb-16">

        {/* Profile Header Card */}
        <Card className="mb-5 overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 blur-md opacity-60 scale-110" />
                  <Avatar className="h-32 w-32 border-4 border-white shadow-xl relative ring-4 ring-purple-200">
                    <AvatarImage src={profile.profileImageUrl} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold">
                      {profile.firstName?.[0]}{profile.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {profile.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 shadow-lg">
                      <CheckCircle className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex gap-6 text-center">
                  <button onClick={() => setActiveFollowTab(activeFollowTab === "followers" ? null : "followers")}
                    className="hover:text-purple-600 transition-colors group" data-testid="followers-tab-btn">
                    <div className="font-black text-2xl text-gray-900 group-hover:text-purple-600">{formatFollowers(profile.followers || 0)}</div>
                    <div className="text-xs text-gray-400 font-medium">Followers</div>
                  </button>
                  <div className="w-px bg-gray-200" />
                  <button onClick={() => setActiveFollowTab(activeFollowTab === "following" ? null : "following")}
                    className="hover:text-purple-600 transition-colors group" data-testid="following-tab-btn">
                    <div className="font-black text-2xl text-gray-900 group-hover:text-purple-600">{profile.following || 0}</div>
                    <div className="text-xs text-gray-400 font-medium">Following</div>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    {profile.username && <p className="text-purple-600 text-sm font-medium">@{profile.username}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={`${rankInfo.color} font-semibold text-xs shadow-sm`}>
                        {rankInfo.emoji} {rankInfo.label}
                      </Badge>
                      {profile.niche && <Badge variant="outline" className="text-xs">{profile.niche}</Badge>}
                      {profile.subscriptionStatus === 'active' && <Badge className="bg-purple-100 text-purple-800 text-xs">⭐ Premium</Badge>}
                      {profile.isKycApproved && <Badge className="bg-green-100 text-green-800 text-xs">✓ KYC</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isOwnProfile && isAuthenticated && (
                      <>
                        <Button
                          onClick={() => followMutation.mutate()}
                          disabled={followMutation.isPending}
                          className={`transition-all duration-200 font-semibold ${isFollowing
                            ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30'
                          }`}
                          data-testid="follow-btn"
                        >
                          {isFollowing ? (
                            <><UserCheck className="w-4 h-4 mr-2" /> Following</>
                          ) : (
                            <><UserPlus className="w-4 h-4 mr-2" /> Follow</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/chat?to=${id}`)}
                          className="border-purple-200 text-purple-600 hover:bg-purple-50"
                          data-testid="message-btn"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" /> Message
                        </Button>
                      </>
                    )}
                    {isOwnProfile && (
                      <Link href="/profile-edit">
                        <Button variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50" data-testid="edit-profile-btn">
                          <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast({ title: "Link copied!" }); }}>
                      <Share2 className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  {profile.location && (
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-purple-500" /> {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                  <span className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg text-amber-700">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {avgRating} ({profile.reviews?.length || 0} reviews)
                  </span>
                  <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    {profile.completedCampaigns || 0} campaigns
                  </span>
                </div>

                {/* Social Channels Row */}
                {allSocialLinks.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {allSocialLinks.map(({ icon: Icon, url, followers, bg, label }) => (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:shadow-md transition-all group"
                          data-testid={`social-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            {Icon ? <Icon className="w-3.5 h-3.5 text-white" /> : <Globe className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="leading-tight">
                            <div className="text-[10px] text-gray-400 group-hover:text-purple-500">{label}</div>
                            <div className="text-sm font-bold text-gray-900">{followers > 0 ? formatFollowers(followers) : '—'}</div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-purple-400 ml-1" />
                        </a>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <span className="font-bold text-gray-900">{formatFollowers(totalSocialFollowers)}</span>
                      <span className="text-gray-400">total social reach</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Followers/Following Expanded Panel */}
        {activeFollowTab && (
          <Card className="mb-5 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg capitalize">{activeFollowTab}</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowList userId={id!} type={activeFollowTab} />
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Earned", value: `$${parseFloat(profile.totalEarned || '0').toFixed(0)}`, icon: <TrendingUp className="w-5 h-5 text-green-500" />, color: "from-green-600/10 to-emerald-600/10 border-green-200" },
            { label: "Campaigns", value: profile.completedCampaigns || 0, icon: <Trophy className="w-5 h-5 text-amber-500" />, color: "from-amber-600/10 to-yellow-600/10 border-amber-200" },
            { label: "Followers", value: formatFollowers(profile.followers || 0), icon: <Users className="w-5 h-5 text-blue-500" />, color: "from-blue-600/10 to-cyan-600/10 border-blue-200" },
            { label: "Social Reach", value: formatFollowers(totalSocialFollowers), icon: <Zap className="w-5 h-5 text-purple-500" />, color: "from-purple-600/10 to-violet-600/10 border-purple-200" },
          ].map(stat => (
            <Card key={stat.label} className={`bg-gradient-to-br ${stat.color} border shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-white/70 rounded-lg shadow-sm">{stat.icon}</div>
                <div>
                  <div className="text-xl font-black text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="mb-5 w-full justify-start overflow-x-auto bg-white shadow-sm border border-gray-100 rounded-xl p-1">
            <TabsTrigger value="posts" className="rounded-lg" data-testid="tab-posts">
              <Eye className="w-4 h-4 mr-1.5" /> Posts
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="rounded-lg" data-testid="tab-portfolio">
              <Briefcase className="w-4 h-4 mr-1.5" /> Portfolio
            </TabsTrigger>
            <TabsTrigger value="social" className="rounded-lg" data-testid="tab-social">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-lg" data-testid="tab-reviews">
              <Star className="w-4 h-4 mr-1.5" /> Reviews ({profile.reviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-lg" data-testid="tab-campaigns">
              <Flame className="w-4 h-4 mr-1.5" /> Campaigns
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts">
            {!profile.posts?.length ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">No posts yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(profile.posts || []).map((post: any) => (
                  <Card key={post.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-purple-100">
                          <AvatarImage src={profile.profileImageUrl} />
                          <AvatarFallback className="bg-purple-600 text-white text-sm">{profile.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{profile.firstName} {profile.lastName}</div>
                          <div className="text-xs text-gray-400">
                            {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap mb-3 text-sm leading-relaxed">{post.content}</p>
                      {post.imageUrl && <img src={post.imageUrl} alt="Post" className="w-full max-h-80 object-cover rounded-xl mb-3" />}
                      {post.videoUrl && (
                        <div className="aspect-video rounded-xl overflow-hidden mb-3">
                          <iframe src={`https://www.youtube.com/embed/${extractYouTubeId(post.videoUrl)}`}
                            className="w-full h-full" allowFullScreen title="Post video" />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400 pt-3 border-t border-gray-50">
                        <span className="flex items-center gap-1.5 hover:text-red-500 cursor-pointer transition-colors">
                          <Heart className="w-4 h-4" /> {post.likeCount || 0}
                        </span>
                        <span className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer transition-colors">
                          <MessageCircle className="w-4 h-4" /> {post.commentCount || 0}
                        </span>
                        {parseFloat(post.totalTipsReceived || '0') > 0 && (
                          <span className="flex items-center gap-1.5 text-purple-600 font-semibold">
                            <Gift className="w-4 h-4" /> ${parseFloat(post.totalTipsReceived).toFixed(2)} tips
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            {!profile.portfolio?.length ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">No portfolio items yet</p>
                  {isOwnProfile && (
                    <Link href="/dashboard">
                      <Button variant="outline" className="mt-4">Add Portfolio Items</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.portfolio.map((item: any) => (
                  <a key={item.id} href={item.url || '#'} target={item.url ? "_blank" : undefined} rel="noopener noreferrer"
                    className="group block">
                    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {item.imageUrl && (
                        <div className="aspect-video overflow-hidden">
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{item.title}</h3>
                            {item.category && <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>}
                            {item.description && <p className="text-gray-500 text-xs mt-2 line-clamp-2">{item.description}</p>}
                          </div>
                          {item.url && <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-purple-500 flex-shrink-0 mt-0.5 transition-colors" />}
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Social Analytics Tab */}
          <TabsContent value="social">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Social Media Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allSocialLinks.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No social media accounts linked yet.</p>
                ) : (
                  <div className="space-y-5">
                    {allSocialLinks.map(({ icon: Icon, url, followers, bg, label }) => {
                      const pct = totalSocialFollowers > 0 ? (followers / totalSocialFollowers) * 100 : 0;
                      return (
                        <div key={label} className="flex items-center gap-4">
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity shadow-md`}>
                            {Icon ? <Icon className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
                          </a>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1.5">
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                className="font-bold text-gray-900 hover:text-purple-600 flex items-center gap-1 text-sm">
                                {label} <ExternalLink className="w-3 h-3" />
                              </a>
                              <span className="font-black text-gray-700">{formatFollowers(followers)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                              <div className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
                                style={{ width: `${Math.max(pct, 2)}%` }} />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}% of total reach</div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 flex items-center gap-2"><Crown className="w-4 h-4 text-purple-500" /> Total Social Reach</span>
                        <span className="text-2xl font-black text-purple-700">{formatFollowers(totalSocialFollowers)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="space-y-4">
              {isAuthenticated && !isOwnProfile && (
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg" data-testid="write-review-btn">
                      <Star className="w-4 h-4 mr-2 fill-white" /> Write a Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Review {profile.firstName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Your Rating</label>
                        <StarRating value={reviewRating} onChange={setReviewRating} />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Your Review</label>
                        <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                          placeholder="Share your experience working with this creator..." rows={4} data-testid="review-comment" />
                      </div>
                      <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}
                        className="w-full bg-purple-600 hover:bg-purple-700" data-testid="submit-review-btn">
                        {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {!profile.reviews?.length ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-amber-300" />
                    </div>
                    <p className="text-gray-400 font-medium">No reviews yet. Be the first to review!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 shadow-sm">
                    <CardContent className="p-6 flex flex-wrap items-center gap-6">
                      <div className="text-center">
                        <div className="text-6xl font-black text-gray-900">{avgRating}</div>
                        <StarRating value={Math.round(parseFloat(avgRating))} readOnly />
                        <div className="text-sm text-gray-500 mt-1">{profile.reviews.length} reviews</div>
                      </div>
                      <div className="flex-1 min-w-48 space-y-1.5">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = profile.reviews.filter((r: any) => r.rating === star).length;
                          const pct = profile.reviews.length ? (count / profile.reviews.length) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-3 text-right text-gray-500">{star}</span>
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-6 text-gray-400">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {profile.reviews.map((review: any) => (
                    <Card key={review.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                            <AvatarImage src={review.reviewer?.profileImageUrl} />
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-bold">{review.reviewer?.firstName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-900 text-sm">
                                {review.reviewer?.firstName} {review.reviewer?.lastName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : ""}
                              </span>
                            </div>
                            <StarRating value={review.rating} readOnly />
                            {review.comment && <p className="text-gray-600 text-sm mt-2 leading-relaxed">{review.comment}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            {!profile.participations?.length ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Flame className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">No campaigns yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {profile.participations.filter((p: any) => p.status === 'completed' || p.status === 'approved').map((p: any) => (
                  <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Campaign #{p.campaignId?.slice(-6)}</div>
                        <div className="text-xs text-gray-400 capitalize mt-0.5">{p.status}</div>
                      </div>
                      <Badge className={p.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {p.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

function FollowList({ userId, type }: { userId: string; type: "followers" | "following" }) {
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${userId}/${type}`],
  });

  if (isLoading) return <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>;
  if (!users.length) return <div className="text-center py-6 text-gray-400 text-sm">No {type} yet.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {users.map((u: any) => (
        <Link key={u.id} href={u.userType === 'brand' ? `/brand/${u.id}` : `/creators/${u.id}`}>
          <div className="flex items-center gap-3 p-3 rounded-xl border hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-all">
            <Avatar className="h-10 w-10 ring-2 ring-gray-100">
              <AvatarImage src={u.profileImageUrl} />
              <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-bold">{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 text-sm truncate">{u.firstName} {u.lastName}</div>
              {u.username && <div className="text-xs text-purple-500 truncate">@{u.username}</div>}
            </div>
            {u.isVerified && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          </div>
        </Link>
      ))}
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
  return match ? match[1] : url;
}
