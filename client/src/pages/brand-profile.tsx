import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Footer } from '@/components/ui/footer';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { formatFollowers } from '@/lib/tiers';
import {
  ArrowLeft, Star, Share2, MessageCircle, Building2,
  MapPin, Calendar, Users, DollarSign, Target, Briefcase,
  TrendingUp, CheckCircle, Globe, ExternalLink, Award,
  UserPlus, UserCheck, Edit3
} from 'lucide-react';

function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" disabled={readOnly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readOnly && setHover(s)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star className={`w-5 h-5 ${(hover || value) >= s ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

function FollowListModal({ userId, type, open, onClose }: { userId: string; type: "followers" | "following"; open: boolean; onClose: () => void }) {
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${userId}/${type}`],
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            {type === 'followers' ? 'Followers' : 'Following'}
            {!isLoading && <Badge variant="outline" className="ml-2">{users.length}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No {type} yet</p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {users.map((u: any) => (
              <Link key={u.id} href={u.userType === 'brand' ? `/brand/${u.id}` : `/creators/${u.id}`}>
                <div onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer transition-all group">
                  <Avatar className="h-11 w-11 ring-2 ring-gray-100 group-hover:ring-emerald-200 flex-shrink-0">
                    <AvatarImage src={u.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm group-hover:text-emerald-700 truncate">{u.firstName} {u.lastName}</div>
                    {u.username && <div className="text-xs text-emerald-500 truncate">@{u.username}</div>}
                    {u.companyName && <div className="text-xs text-gray-400 truncate">{u.companyName}</div>}
                  </div>
                  {u.isVerified && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BrandProfile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<"followers" | "following" | null>(null);

  const brandId = params.id;

  const { data: brand, isLoading: brandLoading } = useQuery<any>({
    queryKey: [`/api/users/${brandId}/profile`],
    enabled: !!brandId,
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: [`/api/campaigns/brand/${brandId}`],
    enabled: !!brandId,
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${brandId}/reviews`],
    enabled: !!brandId,
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: [`/api/users/${brandId}/follow`],
    enabled: !!brandId && !!(user as any)?.id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/users/${brandId}/follow`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${brandId}/follow`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${brandId}/profile`] });
      toast({ title: data.following ? 'Following!' : 'Unfollowed', description: data.following ? `You're now following ${brand?.companyName || brand?.firstName}` : 'Unfollowed successfully.' });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/users/${brandId}/reviews`, { rating: reviewRating, comment: reviewText });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${brandId}/reviews`] });
      toast({ title: 'Review submitted!' });
      setIsReviewDialogOpen(false);
      setReviewText(''); setReviewRating(5);
    },
    onError: () => toast({ title: 'Failed to submit review', variant: 'destructive' }),
  });

  const shareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Profile link copied!' });
  };

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <NavigationFixed />
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-emerald-500/30 border-t-emerald-500" />
            <div className="absolute inset-0 rounded-full blur-md bg-emerald-500/20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <NavigationFixed />
        <div className="text-center">
          <Building2 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Brand Not Found</h1>
          <p className="text-slate-400 mb-6">This brand profile doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation('/campaigns')} className="bg-emerald-500 hover:bg-emerald-600">
            <ArrowLeft className="w-4 h-4 mr-2" />Browse Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = (user as any)?.id === brandId;
  const isFollowing = followStatus?.following ?? false;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length)
    : 0;
  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.isActive || c.status === 'active');
  const companyName = brand.companyName || `${brand.firstName} ${brand.lastName}`;
  const initials = (brand.companyName || brand.firstName || 'B')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-gray-50">
      <NavigationFixed />

      <FollowListModal userId={brandId!} type="followers" open={followModalType === 'followers'} onClose={() => setFollowModalType(null)} />
      <FollowListModal userId={brandId!} type="following" open={followModalType === 'following'} onClose={() => setFollowModalType(null)} />

      {/* Hero Banner */}
      <div className="relative h-56 md:h-72 overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900">
        {brand.bannerImageUrl && (
          <img src={brand.bannerImageUrl} alt="Banner" className="w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(52,211,153,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        <button onClick={() => setLocation(-1 as any)}
          className="absolute top-4 left-4 flex items-center gap-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={shareProfile} className="p-2 bg-black/30 hover:bg-black/50 rounded-lg text-white/80 hover:text-white transition-all" data-testid="share-brand-btn">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-16">

        {/* Main Profile Card */}
        <Card className="mb-6 overflow-hidden border-0 shadow-2xl bg-slate-800/95 backdrop-blur-sm border border-slate-700/50">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">

              {/* Logo + Followers/Following */}
              <div className="flex-shrink-0 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl border-4 border-slate-700 overflow-hidden">
                    {brand.profileImageUrl ? (
                      <img src={brand.profileImageUrl} alt={companyName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white">{initials}</span>
                    )}
                  </div>
                  {brand.isVerified && (
                    <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 rounded-full p-1.5 border-2 border-slate-800">
                      <CheckCircle className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Followers / Following counters */}
                <div className="flex gap-5">
                  <button onClick={() => setFollowModalType('followers')}
                    className="text-center hover:text-emerald-400 transition-colors group" data-testid="brand-followers-btn">
                    <div className="font-black text-2xl text-white group-hover:text-emerald-400 leading-tight">{formatFollowers(brand.followers || 0)}</div>
                    <div className="text-xs text-slate-400 font-medium">Followers</div>
                  </button>
                  <div className="w-px bg-slate-700" />
                  <button onClick={() => setFollowModalType('following')}
                    className="text-center hover:text-emerald-400 transition-colors group" data-testid="brand-following-btn">
                    <div className="font-black text-2xl text-white group-hover:text-emerald-400 leading-tight">{brand.following || 0}</div>
                    <div className="text-xs text-slate-400 font-medium">Following</div>
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-white">{companyName}</h1>
                      {brand.isVerified && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Verified Brand</Badge>}
                    </div>
                    {brand.industry && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium mb-3">
                        <Briefcase className="w-3.5 h-3.5" /><span>{brand.industry}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-slate-400 text-sm mb-3">
                      {brand.location && (
                        <span className="flex items-center gap-1.5 bg-slate-700/50 border border-slate-600 px-2.5 py-1 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {brand.location}
                        </span>
                      )}
                      {brand.website && (
                        <a href={brand.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          <Globe className="w-3.5 h-3.5" /> Website <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="flex items-center gap-1.5 bg-slate-700/50 border border-slate-600 px-2.5 py-1 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Since {new Date(brand.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {brand.bio && <p className="text-slate-300 text-sm leading-relaxed max-w-xl">{brand.bio}</p>}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    {!isOwnProfile && (user as any)?.id && (
                      <>
                        <Button
                          onClick={() => followMutation.mutate()}
                          disabled={followMutation.isPending}
                          className={`gap-2 font-semibold ${isFollowing
                            ? 'bg-slate-700 text-slate-300 hover:bg-red-900/30 hover:text-red-400 border border-slate-600'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'}`}
                          data-testid="brand-follow-btn">
                          {isFollowing ? <><UserCheck className="w-4 h-4" />Following</> : <><UserPlus className="w-4 h-4" />Follow</>}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setLocation(`/chat?to=${brandId}`)}
                          className="gap-2 border-slate-600 text-slate-300 bg-slate-700 hover:bg-slate-600"
                          data-testid="brand-message-btn">
                          <MessageCircle className="w-4 h-4" /> Message
                        </Button>
                        <Button variant="ghost" size="icon" onClick={shareProfile} className="text-slate-400 hover:text-white hover:bg-slate-700">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {isOwnProfile && (
                      <Link href="/profile-edit">
                        <Button variant="outline" className="gap-2 border-slate-600 text-slate-300 bg-slate-700 hover:bg-slate-600" data-testid="edit-brand-btn">
                          <Edit3 className="w-4 h-4" /> Edit Profile
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700">
              {[
                { value: campaigns.length, label: 'Total Campaigns', color: 'text-emerald-400' },
                { value: activeCampaigns.length, label: 'Active Now', color: 'text-emerald-400', dot: true },
                { value: `${avgRating.toFixed(1)} ★`, label: `${reviews.length} Reviews`, color: 'text-amber-400' },
                { value: formatFollowers(brand.followers || 0), label: 'Followers', color: 'text-emerald-400', clickable: () => setFollowModalType('followers') },
              ].map((stat, i) => (
                <button
                  key={i}
                  onClick={stat.clickable}
                  className={`text-center ${stat.clickable ? 'hover:opacity-80 cursor-pointer transition-opacity' : 'cursor-default'}`}
                  data-testid={`brand-stat-${i}`}
                >
                  <div className={`text-2xl font-bold ${stat.color} flex items-center justify-center gap-1`}>
                    {stat.dot && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block mr-1" />}
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Campaigns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" /> Active Campaigns
                </h2>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{activeCampaigns.length} live</Badge>
              </div>
              <div className="p-6">
                {activeCampaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No active campaigns right now</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCampaigns.map((campaign: any) => (
                      <button
                        key={campaign.id}
                        onClick={() => setLocation(`/campaigns/${campaign.id}`)}
                        className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-emerald-500/30 rounded-xl transition-all group"
                        data-testid={`campaign-card-${campaign.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
                                {campaign.title}
                              </span>
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0 animate-pulse" />
                            </div>
                            <p className="text-slate-400 text-xs line-clamp-1">{campaign.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{campaign.filledSlots || 0}/{campaign.totalSlots} slots</span>
                              {campaign.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Ends {new Date(campaign.deadline).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-emerald-400 font-bold text-sm">${parseFloat(campaign.reward || 0).toFixed(2)}</div>
                            <div className="text-slate-500 text-xs">reward</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Past Campaigns */}
            {campaigns.length > activeCampaigns.length && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-slate-400" /> Past Campaigns
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {campaigns.filter((c: any) => !c.isActive && c.status !== 'active').map((campaign: any) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg text-sm">
                        <span className="text-slate-300 line-clamp-1">{campaign.title}</span>
                        <span className="text-slate-500 flex-shrink-0 ml-2">${parseFloat(campaign.reward || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reviews */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> Creator Reviews
                </h2>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <span className="font-bold">{avgRating.toFixed(1)}</span>
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                )}
              </div>
              <div className="p-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-6">
                    <Star className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No reviews yet</p>
                    {!isOwnProfile && (user as any)?.id && (
                      <Button variant="ghost" size="sm" className="mt-3 text-emerald-400 hover:text-emerald-300"
                        onClick={() => setIsReviewDialogOpen(true)}>
                        Be the first to review
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review: any) => (
                      <div key={review.id} className="border-b border-slate-700/50 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <StarRating value={review.rating} readOnly />
                          <span className="text-slate-500 text-xs">
                            {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        {review.comment && <p className="text-slate-300 text-sm leading-relaxed">{review.comment}</p>}
                        {review.reviewer && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={review.reviewer.profileImageUrl} />
                              <AvatarFallback className="bg-emerald-800 text-emerald-200 text-xs">{review.reviewer.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <p className="text-slate-500 text-xs">{review.reviewer.firstName} {review.reviewer.lastName}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!isOwnProfile && (user as any)?.id && reviews.length > 0 && (
                  <Button variant="ghost" size="sm" className="w-full mt-4 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => setIsReviewDialogOpen(true)} data-testid="leave-review-btn">
                    Leave a Review
                  </Button>
                )}
              </div>
            </div>

            {/* Review Dialog */}
            <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Review {companyName}</DialogTitle>
                  <DialogDescription>Share your experience working with this brand</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <p className="text-sm font-medium mb-2">Rating</p>
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Your experience</p>
                    <Textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                      placeholder="Describe your experience working with this brand..." rows={4}
                      data-testid="brand-review-comment" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600" data-testid="submit-brand-review">
                      {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* About */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-400" /> About
                </h2>
              </div>
              <div className="p-6 space-y-3 text-sm">
                {brand.companyName && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>{brand.companyName}</span>
                  </div>
                )}
                {brand.industry && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Briefcase className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>{brand.industry}</span>
                  </div>
                )}
                {brand.location && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>{brand.location}</span>
                  </div>
                )}
                {brand.website && (
                  <a href={brand.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors group">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">Visit Website</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                  </a>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <DollarSign className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>Member since {new Date(brand.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
