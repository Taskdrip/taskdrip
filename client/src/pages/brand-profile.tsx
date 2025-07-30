import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, Star, Heart, Share2, MessageSquare, Award, 
  MapPin, Calendar, Users, DollarSign, Building2, 
  User, ExternalLink, TrendingUp, Target
} from 'lucide-react';

export default function BrandProfile() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const brandId = params.id;

  // Fetch brand profile
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['/api/users', brandId],
    enabled: !!brandId,
  });

  // Fetch brand campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/campaigns/brand', brandId],
    enabled: !!brandId,
  });

  // Fetch brand reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['/api/brand/reviews', brandId],
    enabled: !!brandId,
  });

  // Follow brand mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/users/${brandId}/follow`);
      return res.json();
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? 'Unfollowed' : 'Following',
        description: `You ${isFollowing ? 'unfollowed' : 'are now following'} ${brand?.companyName || brand?.firstName}`,
      });
    },
  });

  // Like brand mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/users/${brandId}/like`);
      return res.json();
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      toast({
        title: isLiked ? 'Unliked' : 'Liked',
        description: `You ${isLiked ? 'removed your like from' : 'liked'} ${brand?.companyName || brand?.firstName}`,
      });
    },
  });

  // Submit review mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/brand/reviews`, {
        brandId,
        rating: reviewRating,
        comment: reviewText,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand/reviews', brandId] });
      toast({
        title: 'Review submitted',
        description: 'Thank you for your feedback!',
      });
      setIsReviewDialogOpen(false);
      setReviewText('');
      setReviewRating(5);
    },
  });

  const shareProfile = () => {
    navigator.share({
      title: `${brand?.companyName || brand?.firstName} - Brand Profile`,
      text: `Check out ${brand?.companyName || brand?.firstName} on Taskdrip`,
      url: window.location.href,
    }).catch(() => {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Profile link copied to clipboard',
      });
    });
  };

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Brand Not Found</h1>
          <p className="text-gray-600 mb-6">The brand profile you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/campaigns')} className="bg-accent hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={shareProfile}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Brand Hero Section */}
        <Card className="mb-8">
          <CardContent className="p-0">
            {/* Brand Banner */}
            <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                {brand.profileImageUrl ? (
                  <img src={brand.profileImageUrl} alt={brand.companyName || brand.firstName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-gray-700">
                    {(brand.companyName || brand.firstName)?.[0]}
                  </span>
                )}
              </div>
            </div>
            
            {/* Brand Info */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {brand.companyName || `${brand.firstName} ${brand.lastName}`}
                  </h1>
                  <div className="flex items-center gap-4 text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">{averageRating.toFixed(1)}</span>
                      <span>({reviews.length} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{brand.followers || 0} followers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span>{campaigns.length} campaigns</span>
                    </div>
                  </div>
                  {brand.bio && (
                    <p className="text-gray-700 mb-4">{brand.bio}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {brand.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{brand.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {new Date(brand.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {user?.id !== brandId && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => followMutation.mutate()}
                        className={isFollowing ? "bg-gray-500 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => likeMutation.mutate()}
                        className={isLiked ? "border-red-500 text-red-500" : ""}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500' : ''}`} />
                        {isLiked ? 'Liked' : 'Like'}
                      </Button>
                    </div>
                    <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Leave Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Leave a Review</DialogTitle>
                          <DialogDescription>
                            Share your experience working with {brand.companyName || brand.firstName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Rating</label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setReviewRating(star)}
                                  className={`text-2xl ${star <= reviewRating ? 'text-yellow-500' : 'text-gray-300'}`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Comment</label>
                            <Textarea
                              value={reviewText}
                              onChange={(e) => setReviewText(e.target.value)}
                              placeholder="Tell others about your experience..."
                              rows={4}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={() => reviewMutation.mutate()}>
                              Submit Review
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Active Campaigns</CardTitle>
                <CardDescription>{campaigns.length} campaigns available</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active campaigns</p>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign: any) => (
                      <div key={campaign.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{campaign.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{campaign.description}</p>
                            <Badge variant="outline">{campaign.category}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">${campaign.reward}</div>
                            <div className="text-sm text-gray-500">per task</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            {campaign.filledSlots || 0}/{campaign.totalSlots} spots filled
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => setLocation(`/campaigns/${campaign.id}`)}
                          >
                            View Campaign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews & Ratings</CardTitle>
                <CardDescription>{reviews.length} reviews from creators</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No reviews yet</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{review.user?.firstName} {review.user?.lastName}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Campaigns</span>
                  <span className="font-semibold">{campaigns.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Average Rating</span>
                  <span className="font-semibold">{averageRating.toFixed(1)}/5.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Reviews</span>
                  <span className="font-semibold">{reviews.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Followers</span>
                  <span className="font-semibold">{brand.followers || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            {(brand.email || brand.website || brand.socialHandles) && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brand.email && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{brand.email}</span>
                    </div>
                  )}
                  {brand.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                      <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        {brand.website}
                      </a>
                    </div>
                  )}
                  {brand.socialHandles && (
                    <div className="space-y-2">
                      {brand.socialHandles.twitter && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Twitter: @{brand.socialHandles.twitter}</span>
                        </div>
                      )}
                      {brand.socialHandles.instagram && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Instagram: @{brand.socialHandles.instagram}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}