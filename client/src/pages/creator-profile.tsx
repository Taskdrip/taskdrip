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
  SiTiktok, SiYoutube, SiInstagram, SiX, SiTwitch, SiTelegram, SiWhatsapp
} from "react-icons/si";
import {
  MapPin, Users, Trophy, Star, Heart, MessageCircle, Send,
  CheckCircle, TrendingUp, Gift, ExternalLink, BarChart3,
  UserPlus, UserCheck, Globe
} from "lucide-react";

function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readOnly && setHover(s)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`text-2xl transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            className={`w-6 h-6 ${(hover || value) >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [tipDialogOpen, setTipDialogOpen] = useState(false);
  const [activeFollowTab, setActiveFollowTab] = useState<"followers" | "following" | null>(null);

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: [`/api/creators/${id}/profile`],
    enabled: !!id,
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: [`/api/users/${id}/follow`],
    enabled: !!id && isAuthenticated,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${id}/follow`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}/follow`] });
      queryClient.invalidateQueries({ queryKey: [`/api/creators/${id}/profile`] });
      toast({ title: data.following ? "Following!" : "Unfollowed", description: data.following ? `You're now following ${profile?.firstName}` : `You unfollowed ${profile?.firstName}` });
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
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
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

  const tier = getTierConfig(profile.creatorTier || "rising_sparks");
  const isOwnProfile = (user as any)?.id === id;
  const isFollowing = followStatus?.following ?? false;

  const socialLinks = [
    { icon: SiTiktok, handle: profile.tiktokHandle, followers: profile.tiktokFollowers, color: "text-black", bg: "bg-black", label: "TikTok", url: (h: string) => `https://tiktok.com/@${h}` },
    { icon: SiYoutube, handle: profile.youtubeHandle, followers: profile.youtubeFollowers, color: "text-red-600", bg: "bg-red-600", label: "YouTube", url: (h: string) => `https://youtube.com/@${h}` },
    { icon: SiInstagram, handle: profile.instagramHandle, followers: profile.instagramFollowers, color: "text-pink-600", bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", label: "Instagram", url: (h: string) => `https://instagram.com/${h}` },
    { icon: SiX, handle: profile.twitterHandle, followers: profile.twitterFollowers, color: "text-gray-900", bg: "bg-black", label: "X (Twitter)", url: (h: string) => `https://twitter.com/${h}` },
    { icon: SiTwitch, handle: profile.twitchHandle, followers: profile.twitchFollowers, color: "text-purple-600", bg: "bg-purple-600", label: "Twitch", url: (h: string) => `https://twitch.tv/${h}` },
    { icon: SiTelegram, handle: profile.telegramChannel, followers: profile.telegramFollowers, color: "text-blue-500", bg: "bg-blue-500", label: "Telegram", url: (h: string) => `https://t.me/${h}` },
    { icon: SiWhatsapp, handle: profile.whatsappChannel, followers: profile.whatsappFollowers, color: "text-green-500", bg: "bg-green-500", label: "WhatsApp", url: (h: string) => `https://wa.me/${h}` },
  ].filter(s => s.handle);

  const totalSocialFollowers = socialLinks.reduce((acc, s) => acc + (s.followers || 0), 0);

  const avgRating = profile.reviews?.length
    ? (profile.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / profile.reviews.length).toFixed(1)
    : "0.0";

  const getRankLabel = (tier: string) => {
    switch (tier) {
      case "global_titans": return { label: "Global Titan", color: "bg-purple-100 text-purple-800", emoji: "👑" };
      case "power_influencers": return { label: "Power Influencer", color: "bg-blue-100 text-blue-800", emoji: "⚡" };
      case "growth_engines": return { label: "Growth Engine", color: "bg-green-100 text-green-800", emoji: "🚀" };
      default: return { label: "Rising Spark", color: "bg-yellow-100 text-yellow-800", emoji: "✨" };
    }
  };
  const rankInfo = getRankLabel(profile.creatorTier || "rising_sparks");

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Banner */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 overflow-hidden">
        {profile.bannerImageUrl && (
          <img src={profile.bannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-12">
        {/* Profile Header Card */}
        <Card className="mb-6 overflow-hidden shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-3">
                <div className="relative">
                  <Avatar className="h-28 w-28 border-4 border-white shadow-lg ring-4 ring-purple-200">
                    <AvatarImage src={profile.profileImageUrl} />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold">
                      {profile.firstName?.[0]}{profile.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {profile.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Platform Follow Stats */}
                <div className="flex gap-6 text-center">
                  <button
                    onClick={() => setActiveFollowTab(activeFollowTab === "followers" ? null : "followers")}
                    className="hover:text-purple-600 transition-colors"
                    data-testid="followers-tab-btn"
                  >
                    <div className="font-bold text-lg text-gray-900">{profile.followers || 0}</div>
                    <div className="text-xs text-gray-500">Followers</div>
                  </button>
                  <button
                    onClick={() => setActiveFollowTab(activeFollowTab === "following" ? null : "following")}
                    className="hover:text-purple-600 transition-colors"
                    data-testid="following-tab-btn"
                  >
                    <div className="font-bold text-lg text-gray-900">{profile.following || 0}</div>
                    <div className="text-xs text-gray-500">Following</div>
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    {profile.username && (
                      <p className="text-gray-500 text-sm">@{profile.username}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className={`${rankInfo.color} font-medium`}>
                        {rankInfo.emoji} {rankInfo.label}
                      </Badge>
                      {profile.niche && (
                        <Badge variant="outline">{profile.niche}</Badge>
                      )}
                      {profile.subscriptionStatus === 'active' && (
                        <Badge className="bg-purple-100 text-purple-800">⭐ Premium</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isOwnProfile && isAuthenticated && (
                      <>
                        <Button
                          onClick={() => followMutation.mutate()}
                          disabled={followMutation.isPending}
                          variant={isFollowing ? "outline" : "default"}
                          className={isFollowing ? "" : "bg-purple-600 hover:bg-purple-700"}
                          data-testid="follow-btn"
                        >
                          {isFollowing ? <UserCheck className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                        <Button variant="outline" onClick={() => navigate(`/chat?to=${id}`)} data-testid="message-btn">
                          <MessageCircle className="w-4 h-4 mr-2" /> Message
                        </Button>
                      </>
                    )}
                    {isOwnProfile && (
                      <Link href="/profile-edit">
                        <Button variant="outline" data-testid="edit-profile-btn">Edit Profile</Button>
                      </Link>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  {profile.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.location}</span>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                      <Globe className="w-4 h-4" /> Website
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    {avgRating} ({profile.reviews?.length || 0} reviews)
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    {profile.completedCampaigns || 0} campaigns
                  </span>
                </div>

                {/* Social Media Icons Row */}
                {socialLinks.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex flex-wrap gap-3 mb-3">
                      {socialLinks.map(({ icon: Icon, handle, followers, bg, label, url }) => (
                        <a
                          key={label}
                          href={url(handle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                          data-testid={`social-${label.toLowerCase()}`}
                        >
                          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="leading-tight">
                            <div className="text-xs text-gray-500 group-hover:text-purple-600">{label}</div>
                            <div className="text-sm font-semibold text-gray-900">{formatFollowers(followers)}</div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-purple-500" />
                        </a>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <span className="font-semibold text-gray-900">{formatFollowers(totalSocialFollowers)}</span> total social followers
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Followers/Following Expanded Panel */}
        {activeFollowTab && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg capitalize">{activeFollowTab}</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowList userId={id!} type={activeFollowTab} />
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Earned", value: `$${parseFloat(profile.totalEarned || '0').toFixed(2)}`, icon: <TrendingUp className="w-5 h-5 text-green-500" />, color: "from-green-50 to-emerald-50" },
            { label: "Campaigns Done", value: profile.completedCampaigns || 0, icon: <Trophy className="w-5 h-5 text-amber-500" />, color: "from-amber-50 to-yellow-50" },
            { label: "Platform Followers", value: profile.followers || 0, icon: <Users className="w-5 h-5 text-blue-500" />, color: "from-blue-50 to-cyan-50" },
            { label: "Rating", value: `${avgRating} ⭐`, icon: <Star className="w-5 h-5 text-yellow-500" />, color: "from-yellow-50 to-orange-50" },
          ].map(stat => (
            <Card key={stat.label} className={`bg-gradient-to-br ${stat.color} border-0 shadow-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                {stat.icon}
                <div>
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto">
            <TabsTrigger value="posts" data-testid="tab-posts">Posts</TabsTrigger>
            <TabsTrigger value="social" data-testid="tab-social">Social Analytics</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              Reviews ({profile.reviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts">
            {profile.posts?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No posts yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(profile.posts || []).map((post: any) => (
                  <Card key={post.id} className="overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={profile.profileImageUrl} />
                          <AvatarFallback>{profile.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-900">{profile.firstName} {profile.lastName}</div>
                          <div className="text-xs text-gray-400">
                            {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>
                      {post.imageUrl && (
                        <img src={post.imageUrl} alt="Post" className="w-full max-h-80 object-cover rounded-xl mb-3" />
                      )}
                      {post.videoUrl && (
                        <div className="aspect-video rounded-xl overflow-hidden mb-3">
                          <iframe
                            src={`https://www.youtube.com/embed/${extractYouTubeId(post.videoUrl)}`}
                            className="w-full h-full"
                            allowFullScreen
                            title="Post video"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likeCount || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.commentCount || 0}</span>
                        {parseFloat(post.totalTipsReceived || '0') > 0 && (
                          <span className="flex items-center gap-1 text-purple-600 font-medium">
                            <Gift className="w-4 h-4" /> ${parseFloat(post.totalTipsReceived).toFixed(2)} in tips
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Social Analytics Tab */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Social Media Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {socialLinks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No social media accounts linked yet.</p>
                ) : (
                  <div className="space-y-4">
                    {socialLinks.map(({ icon: Icon, handle, followers, bg, label, url }) => {
                      const pct = totalSocialFollowers > 0 ? (followers / totalSocialFollowers) * 100 : 0;
                      return (
                        <div key={label} className="flex items-center gap-4">
                          <a href={url(handle)} target="_blank" rel="noopener noreferrer"
                             className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity`}>
                            <Icon className="w-5 h-5 text-white" />
                          </a>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <a href={url(handle)} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-purple-600 flex items-center gap-1">
                                {label} <ExternalLink className="w-3 h-3" />
                              </a>
                              <span className="font-semibold text-gray-700">{formatFollowers(followers)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">@{handle} · {pct.toFixed(1)}% of total reach</div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Total Social Reach</span>
                        <span className="text-2xl font-bold text-purple-700">{formatFollowers(totalSocialFollowers)}</span>
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
              {/* Submit Review */}
              {isAuthenticated && !isOwnProfile && (
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-purple-600 hover:bg-purple-700" data-testid="write-review-btn">
                      <Star className="w-4 h-4 mr-2" /> Write a Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Review {profile.firstName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Your Rating</label>
                        <StarRating value={reviewRating} onChange={setReviewRating} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Your Review</label>
                        <Textarea
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          placeholder="Share your experience working with this creator..."
                          rows={4}
                          data-testid="review-comment"
                        />
                      </div>
                      <Button
                        onClick={() => reviewMutation.mutate()}
                        disabled={reviewMutation.isPending}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        data-testid="submit-review-btn"
                      >
                        {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Reviews List */}
              {!profile.reviews?.length ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No reviews yet. Be the first to review!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Average Rating Header */}
                  <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                    <CardContent className="p-6 flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-gray-900">{avgRating}</div>
                        <StarRating value={Math.round(parseFloat(avgRating))} readOnly />
                        <div className="text-sm text-gray-500">{profile.reviews.length} reviews</div>
                      </div>
                    </CardContent>
                  </Card>

                  {profile.reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.reviewer?.profileImageUrl} />
                            <AvatarFallback>{review.reviewer?.firstName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900">
                                {review.reviewer?.firstName} {review.reviewer?.lastName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : ""}
                              </span>
                            </div>
                            <StarRating value={review.rating} readOnly />
                            {review.comment && (
                              <p className="text-gray-600 text-sm mt-2">{review.comment}</p>
                            )}
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
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No campaigns yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {profile.participations.filter((p: any) => p.status === 'completed' || p.status === 'approved').map((p: any) => (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Campaign #{p.campaignId?.slice(-6)}</div>
                        <div className="text-sm text-gray-500 capitalize">{p.status}</div>
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

  if (isLoading) return <div className="text-center py-4 text-gray-500">Loading...</div>;
  if (!users.length) return <div className="text-center py-4 text-gray-500">No {type} yet.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {users.map((u: any) => (
        <Link key={u.id} href={u.userType === 'brand' ? `/brand/${u.id}` : `/creators/${u.id}`}>
          <div className="flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-50 cursor-pointer transition-colors">
            <Avatar className="h-10 w-10">
              <AvatarImage src={u.profileImageUrl} />
              <AvatarFallback>{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</div>
              {u.username && <div className="text-xs text-gray-500 truncate">@{u.username}</div>}
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
