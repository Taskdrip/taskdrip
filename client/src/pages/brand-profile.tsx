import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Footer } from '@/components/ui/footer';
import {
  ArrowLeft, Star, Heart, Share2, MessageCircle, Building2,
  MapPin, Calendar, Users, DollarSign, Target, Briefcase,
  TrendingUp, CheckCircle, Globe, ExternalLink, Award
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

export default function BrandProfile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400" />
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
  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.isActive);
  const companyName = brand.companyName || `${brand.firstName} ${brand.lastName}`;
  const initials = (brand.companyName || brand.firstName || 'B')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-slate-900">
      <NavigationFixed />

      {/* Hero Banner */}
      <div className="relative h-56 md:h-72 overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900">
        {brand.bannerImageUrl && (
          <img src={brand.bannerImageUrl} alt="Banner" className="w-full h-full object-cover opacity-40" />
        )}
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(52,211,153,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        <button onClick={() => setLocation(-1 as any)}
          className="absolute top-4 left-4 flex items-center gap-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={shareProfile} className="p-2 bg-black/30 hover:bg-black/50 rounded-lg text-white/80 hover:text-white transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-16">
        {/* Main Profile Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl border-4 border-slate-700 overflow-hidden">
                    {brand.profileImageUrl ? (
                      <img src={brand.profileImageUrl} alt={companyName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-white">{initials}</span>
                    )}
                  </div>
                  {brand.isVerified && (
                    <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 rounded-full p-1 border-2 border-slate-800">
                      <CheckCircle className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-white">{companyName}</h1>
                      {brand.isVerified && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Verified Brand</Badge>}
                    </div>
                    {brand.industry && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium mb-3">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{brand.industry}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm mb-3">
                      {brand.location && (
                        <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><span>{brand.location}</span></div>
                      )}
                      {brand.website && (
                        <a href={brand.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                          <Globe className="w-3.5 h-3.5" /><span>Website</span><ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Since {new Date(brand.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    {brand.bio && <p className="text-slate-300 text-sm leading-relaxed max-w-xl">{brand.bio}</p>}
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && (
                    <div className="flex flex-col gap-2 flex-shrink-0 min-w-[160px]">
                      <Button
                        onClick={() => setLocation(`/messages?campaign=`)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                      >
                        <MessageCircle className="w-4 h-4" /> Message
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => followMutation.mutate()}
                        disabled={followMutation.isPending}
                        className={`gap-2 border-slate-600 ${isFollowing ? 'text-slate-300 bg-slate-700' : 'text-white bg-slate-700 hover:bg-slate-600'}`}
                      >
                        <Users className="w-4 h-4" />
                        {isFollowing ? 'Following' : 'Follow Brand'}
                      </Button>
                      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" className="gap-2 text-slate-400 hover:text-white hover:bg-slate-700">
                            <Star className="w-4 h-4" /> Leave Review
                          </Button>
                        </DialogTrigger>
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
                                placeholder="Describe your experience working with this brand..." rows={4} />
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
                              <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                                {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{campaigns.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">Total Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{activeCampaigns.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">Active Now</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-amber-400">{avgRating.toFixed(1)}</span>
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{reviews.length} Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{brand.followers || 0}</div>
                <div className="text-xs text-slate-400 mt-0.5">Followers</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Campaigns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Active Campaigns
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
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
                                {campaign.title}
                              </span>
                              {campaign.isActive && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0 animate-pulse" />}
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
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-slate-400" /> Past Campaigns
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {campaigns.filter((c: any) => !c.isActive).map((campaign: any) => (
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
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />Creator Reviews
                </h2>
                <span className="text-slate-400 text-sm">{reviews.length}</span>
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
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && <p className="text-slate-300 text-sm leading-relaxed">{review.comment}</p>}
                        {review.reviewer && (
                          <p className="text-slate-500 text-xs mt-1">— {review.reviewer.firstName} {review.reviewer.lastName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* About / Contact */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-400" />About
                </h2>
              </div>
              <div className="p-6 space-y-3 text-sm">
                {brand.companyName && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{brand.companyName}</span>
                  </div>
                )}
                {brand.location && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{brand.location}</span>
                  </div>
                )}
                {brand.website && (
                  <a href={brand.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                    <Globe className="w-4 h-4" /><span className="truncate">{brand.website}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                )}
                <div className="flex items-center gap-2 text-slate-300">
                  <DollarSign className="w-4 h-4 text-slate-500" />
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
