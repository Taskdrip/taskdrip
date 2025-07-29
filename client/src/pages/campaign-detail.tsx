import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, Calendar, Clock, DollarSign, Users, MapPin, 
  Edit, Share2, Flag, Star, CheckCircle, User, Building2,
  Target, TrendingUp, Award, MessageSquare, Clipboard, FileText, Trash2
} from 'lucide-react';

const editCampaignSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.string().min(1, 'Category is required'),
  reward: z.number().min(1, 'Reward must be at least $1'),
  totalSlots: z.number().min(1, 'Must have at least 1 slot'),
  deadline: z.string().min(1, 'Deadline is required'),
  requirements: z.string().min(10, 'Requirements must be at least 10 characters'),
  estimatedTime: z.string().min(1, 'Estimated time is required'),
});

type EditCampaignData = z.infer<typeof editCampaignSchema>;

export default function CampaignDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const campaignId = params.id;

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['/api/campaigns', campaignId],
    enabled: !!campaignId,
  });

  const editForm = useForm<EditCampaignData>({
    resolver: zodResolver(editCampaignSchema),
    defaultValues: {
      title: campaign?.title || '',
      description: campaign?.description || '',
      category: campaign?.category || '',
      reward: campaign?.reward || 0,
      totalSlots: campaign?.totalSlots || 1,
      deadline: campaign?.deadline ? new Date(campaign.deadline).toISOString().split('T')[0] : '',
      requirements: campaign?.requirements || '',
      estimatedTime: campaign?.estimatedTime || '',
    },
  });

  // Update form when campaign data is loaded
  if (campaign && editForm.getValues().title !== campaign.title) {
    editForm.reset({
      title: campaign.title,
      description: campaign.description,
      category: campaign.category,
      reward: campaign.reward,
      totalSlots: campaign.totalSlots,
      deadline: campaign.deadline ? new Date(campaign.deadline).toISOString().split('T')[0] : '',
      requirements: campaign.requirements,
      estimatedTime: campaign.estimatedTime,
    });
  }

  const joinCampaignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/campaigns/${campaignId}/join`);
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted!',
        description: 'Your application has been submitted for review.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
    },
    onError: (error) => {
      toast({
        title: 'Application Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const editCampaignMutation = useMutation({
    mutationFn: async (data: EditCampaignData) => {
      return await apiRequest(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Campaign Updated',
        description: 'Your campaign has been successfully updated.',
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update campaign. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Campaign Deleted',
        description: 'Your campaign has been successfully deleted.',
      });
      setLocation('/campaigns');
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete campaign. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation('/campaigns')} className="bg-accent hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'social media':
        return 'bg-blue-100 text-blue-800';
      case 'content creation':
        return 'bg-orange-100 text-orange-800';
      case 'gaming':
        return 'bg-purple-100 text-purple-800';
      case 'health & fitness':
        return 'bg-green-100 text-green-800';
      case 'cryptocurrency':
        return 'bg-yellow-100 text-yellow-800';
      case 'education':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBrandColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'social media':
        return 'from-blue-500 to-blue-600';
      case 'content creation':
        return 'from-orange-500 to-pink-500';
      case 'gaming':
        return 'from-purple-500 to-indigo-600';
      case 'health & fitness':
        return 'from-green-500 to-emerald-600';
      case 'cryptocurrency':
        return 'from-yellow-500 to-orange-500';
      case 'education':
        return 'from-cyan-500 to-blue-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const progressPercentage = campaign.totalSlots > 0 ? ((campaign.filledSlots || 0) / campaign.totalSlots) * 100 : 0;
  const daysLeft = campaign.deadline ? Math.ceil((new Date(campaign.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOwnerOrAdmin = user?.id === campaign.createdBy || user?.role === 'admin';
  const canJoin = !isOwnerOrAdmin && (campaign.filledSlots || 0) < campaign.totalSlots;

  const onEditSubmit = (data: EditCampaignData) => {
    editCampaignMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation('/campaigns')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Campaigns
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Flag className="w-4 h-4 mr-2" />
                Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Header */}
            <Card>
              <CardContent className="p-0">
                {/* Brand Banner */}
                <div className={`h-48 bg-gradient-to-br ${getBrandColor(campaign.category)} flex items-center justify-center relative`}>
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-gray-700">
                      {campaign.brandName[0]}
                    </span>
                  </div>
                  {isOwnerOrAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Campaign</DialogTitle>
                            <DialogDescription>
                              Update your campaign details and requirements.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Campaign Title</Label>
                              <Input
                                id="title"
                                {...editForm.register('title')}
                                placeholder="Enter campaign title"
                              />
                              {editForm.formState.errors.title && (
                                <p className="text-sm text-red-600">{editForm.formState.errors.title.message}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                {...editForm.register('description')}
                                placeholder="Describe your campaign"
                                rows={4}
                              />
                              {editForm.formState.errors.description && (
                                <p className="text-sm text-red-600">{editForm.formState.errors.description.message}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select onValueChange={(value) => editForm.setValue('category', value)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="social media">Social Media</SelectItem>
                                    <SelectItem value="content creation">Content Creation</SelectItem>
                                    <SelectItem value="gaming">Gaming</SelectItem>
                                    <SelectItem value="health & fitness">Health & Fitness</SelectItem>
                                    <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                                    <SelectItem value="education">Education</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="reward">Reward ($)</Label>
                                <Input
                                  id="reward"
                                  type="number"
                                  {...editForm.register('reward', { valueAsNumber: true })}
                                  placeholder="50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="totalSlots">Total Slots</Label>
                                <Input
                                  id="totalSlots"
                                  type="number"
                                  {...editForm.register('totalSlots', { valueAsNumber: true })}
                                  placeholder="10"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="deadline">Deadline</Label>
                                <Input
                                  id="deadline"
                                  type="date"
                                  {...editForm.register('deadline')}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="requirements">Requirements</Label>
                              <Textarea
                                id="requirements"
                                {...editForm.register('requirements')}
                                placeholder="What creators need to do..."
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="estimatedTime">Estimated Time</Label>
                              <Input
                                id="estimatedTime"
                                {...editForm.register('estimatedTime')}
                                placeholder="e.g., 30 minutes, 2 hours"
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                className="bg-accent hover:bg-blue-700"
                                disabled={editCampaignMutation.isPending}
                              >
                                {editCampaignMutation.isPending ? 'Updating...' : 'Update Campaign'}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteCampaignMutation.mutate()}
                                disabled={deleteCampaignMutation.isPending}
                              >
                                {deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete Campaign'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`text-xs font-medium px-3 py-1 rounded-full ${getCategoryColor(campaign.category)}`}>
                      {campaign.category}
                    </Badge>
                    {daysLeft && (
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{campaign.title}</h1>
                  <p className="text-gray-700 text-lg mb-6">{campaign.description}</p>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-gray-500" />
                        <span className="font-medium text-gray-900">{campaign.brandName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">4.8 rating</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-success">${campaign.reward}</div>
                      <div className="text-sm text-gray-600">per task</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Campaign Progress</span>
                      <span className="text-sm text-gray-600">
                        {campaign.filledSlots || 0} / {campaign.totalSlots} spots filled
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-accent h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-sm font-medium text-gray-700">
                        {Math.round(progressPercentage)}% complete
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Requirements and Application Process */}
            <div className="space-y-6">
              {/* Eligibility Requirements */}
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Eligibility Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {campaign.requirements ? (
                    <div className="text-amber-800 whitespace-pre-wrap">{campaign.requirements}</div>
                  ) : (
                    <div className="text-amber-800">
                      <ul className="space-y-2 list-disc list-inside">
                        <li>Active social media account</li>
                        <li>Ability to create original content</li>
                        <li>Willingness to follow brand guidelines</li>
                        <li>Submit proof within the deadline</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Application Process */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                    <Clipboard className="w-5 h-5" />
                    How to Apply & Complete Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-blue-800">
                    <p className="font-medium mb-3">Step-by-step process:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Apply:</span>
                        <span>Click "Apply to Join" to submit your application</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Wait for Approval:</span>
                        <span>Campaign admin will review your profile and application</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Complete Tasks:</span>
                        <span>Once approved, complete the required social media tasks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Submit Proof:</span>
                        <span>Provide screenshots, links, and descriptions of completed work</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Get Verified:</span>
                        <span>Admin reviews your submission for approval</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">Receive Payment:</span>
                        <span>Get your ${parseFloat(campaign.reward).toFixed(2)} reward in crypto</span>
                      </li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* Proof Submission Guidelines */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Proof Submission Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-green-800 space-y-3">
                    <p className="font-medium">You must provide the following:</p>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium mb-2">Required Files:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Screenshots of completed posts</li>
                          <li>Links to your published content</li>
                          <li>Analytics screenshots (if requested)</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-2">Documentation:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Clear description of work completed</li>
                          <li>Any additional verification requested</li>
                          <li>Confirmation of brand guidelines followed</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg mt-3">
                      <p className="text-sm font-medium">💡 Pro Tip: Clear, detailed submissions get approved faster!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Payment & Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-purple-800 space-y-3 text-sm">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium mb-2">Payment Details:</p>
                        <ul className="space-y-1">
                          <li><span className="font-medium">Reward:</span> ${parseFloat(campaign.reward).toFixed(2)} per task</li>
                          <li><span className="font-medium">Payment:</span> Cryptocurrency (USDT/TON)</li>
                          <li><span className="font-medium">Timeline:</span> {campaign.estimatedTime || "30 minutes"}</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-2">Important Notes:</p>
                        <ul className="space-y-1">
                          <li>Payment processed after approval</li>
                          <li>Minimum payout: $10.00</li>
                          <li>Review time: 24-48 hours</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{campaign.estimatedTime || '30 min'}</div>
                  <div className="text-sm text-gray-600">Estimated Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{campaign.totalSlots}</div>
                  <div className="text-sm text-gray-600">Total Spots</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">4.8</div>
                  <div className="text-sm text-gray-600">Brand Rating</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Campaign Application Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Campaign Application</CardTitle>
                <CardDescription>
                  Review requirements and apply to join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-success mb-1">${parseFloat(campaign.reward).toFixed(2)}</div>
                  <div className="text-sm text-gray-600">reward per task</div>
                </div>

                {canJoin ? (
                  <Button 
                    onClick={() => joinCampaignMutation.mutate()}
                    className="w-full bg-accent hover:bg-blue-700"
                    disabled={joinCampaignMutation.isPending}
                  >
                    {joinCampaignMutation.isPending ? 'Applying...' : 'Apply to Join'}
                  </Button>
                ) : (
                  <Button 
                    disabled
                    className="w-full"
                  >
                    {(campaign.filledSlots || 0) >= campaign.totalSlots ? 'Campaign Full' : 'You Own This Campaign'}
                  </Button>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Spots Available:</span>
                    <span className="font-medium">
                      {campaign.totalSlots - (campaign.filledSlots || 0)} / {campaign.totalSlots}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time Commitment:</span>
                    <span className="font-medium">{campaign.estimatedTime || '30 min'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Deadline:</span>
                    <span className="font-medium">
                      {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'No deadline'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  About {campaign.brandName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{campaign.brandName[0]}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{campaign.brandName}</div>
                    <div className="text-sm text-gray-600">{campaign.category}</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Rating:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-medium">4.8 (127 reviews)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Campaigns Created:</span>
                    <span className="font-medium">23</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Paid:</span>
                    <span className="font-medium text-green-600">$15,420</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Brand Profile
                </Button>
              </CardContent>
            </Card>

            {/* Similar Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Similar Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">B</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        Social Media Content Campaign
                      </div>
                      <div className="text-xs text-gray-600">$45 • 5 spots left</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}