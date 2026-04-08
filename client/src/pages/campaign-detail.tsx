import { useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
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
  Target, TrendingUp, Award, MessageSquare, Clipboard, FileText, Trash2,
  MessageCircle, Upload, Send, Hourglass, PartyPopper, XCircle, Link2
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
  featuredImage: z.string().optional(),
});

type EditCampaignData = z.infer<typeof editCampaignSchema>;

export default function CampaignDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitText, setSubmitText] = useState('');

  const campaignId = params.id;

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['/api/campaigns', campaignId],
    enabled: !!campaignId,
  });

  // Define user type variables first
  const isBrand = (user as any)?.userType === 'brand';
  
  // Check if user has joined this campaign
  const { data: participations = [] } = useQuery({
    queryKey: ['/api/participations'],
    enabled: !!user && !isBrand,
  });

  const myParticipation = (participations as any[]).find((p: any) => p.campaignId === campaignId);
  const hasJoined = !!myParticipation;
  const participationStatus = myParticipation?.status || null;

  // Handle image upload for edit form
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Edit form submit handler
  const onEditSubmit = (data: EditCampaignData) => {
    editCampaignMutation.mutate(data);
  };

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Campaign Deleted',
        description: 'Your campaign has been successfully deleted.',
      });
      setLocation('/brand-dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete campaign. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const editForm = useForm<EditCampaignData>({
    resolver: zodResolver(editCampaignSchema),
    defaultValues: {
      title: (campaign as any)?.title || '',
      description: (campaign as any)?.description || '',
      category: (campaign as any)?.category || '',
      reward: (campaign as any)?.reward || 0,
      totalSlots: (campaign as any)?.totalSlots || 1,
      deadline: (campaign as any)?.deadline ? new Date((campaign as any).deadline).toISOString().split('T')[0] : '',
      requirements: (campaign as any)?.requirements || '',
      estimatedTime: (campaign as any)?.estimatedTime || '',
      featuredImage: (campaign as any)?.featuredImage || '',
    },
  });

  // Update form when campaign data is loaded
  if (campaign && editForm.getValues().title !== (campaign as any).title) {
    editForm.reset({
      title: (campaign as any).title,
      description: (campaign as any).description,
      category: (campaign as any).category,
      reward: (campaign as any).reward,
      totalSlots: (campaign as any).totalSlots,
      deadline: (campaign as any).deadline ? new Date((campaign as any).deadline).toISOString().split('T')[0] : '',
      requirements: (campaign as any).requirements,
      estimatedTime: (campaign as any).estimatedTime,
      featuredImage: (campaign as any).featuredImage || '',
    });
    setEditImagePreview((campaign as any).featuredImage || null);
  }

  const joinCampaignMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/campaigns/${campaignId}/join`);
    },
    onSuccess: () => {
      toast({
        title: 'Application Sent!',
        description: 'Your application has been sent. Once the brand approves you, you can begin the task.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['/api/participations'] });
    },
    onError: (error) => {
      toast({
        title: 'Application Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const submitWorkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/participations/${myParticipation?.id}/submit-work`, {
        submissionUrl: submitUrl,
        submissionText: submitText,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Work Submitted! 🎉',
        description: 'Your work has been sent to the brand for review. You\'ll be notified when they respond.',
      });
      setIsSubmitDialogOpen(false);
      setSubmitUrl('');
      setSubmitText('');
      queryClient.invalidateQueries({ queryKey: ['/api/participations'] });
    },
    onError: (error) => {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const editCampaignMutation = useMutation({
    mutationFn: async (data: EditCampaignData) => {
      const formData = new FormData();
      
      // Add all campaign data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Add image file if present
      if (editImageFile) {
        formData.append('featuredImage', editImageFile);
      }
      
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
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

  const progressPercentage = (campaign as any)?.totalSlots > 0 ? (((campaign as any)?.filledSlots || 0) / (campaign as any)?.totalSlots) * 100 : 0;
  const daysLeft = (campaign as any)?.deadline ? Math.ceil((new Date((campaign as any).deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOwnerOrAdmin = (user as any)?.id === (campaign as any)?.brandId || (user as any)?.role === 'admin';
  const canJoin = !isOwnerOrAdmin && !isBrand && !hasJoined && ((campaign as any)?.filledSlots || 0) < (campaign as any)?.totalSlots;
  const campaignImage = (campaign as any)?.featureImage || (campaign as any)?.featuredImage || null;

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
                <div className="h-48 md:h-64 relative overflow-hidden">
                  {campaignImage ? (
                    <img 
                      src={campaignImage}
                      alt={(campaign as any).title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallbackDiv = e.currentTarget.parentElement?.querySelector('.fallback-brand');
                        if (fallbackDiv) fallbackDiv.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getBrandColor((campaign as any)?.category)} flex items-center justify-center`}>
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-bold text-gray-700">{(campaign as any)?.brandName?.[0] || 'B'}</span>
                      </div>
                    </div>
                  )}
                  <div className={`fallback-brand hidden absolute inset-0 bg-gradient-to-br ${getBrandColor((campaign as any)?.category)} flex items-center justify-center`}>
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-gray-700">
                        {(campaign as any)?.brandName?.[0]}
                      </span>
                    </div>
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

                            {/* Featured Image Upload */}
                            <div className="space-y-2">
                              <Label htmlFor="featuredImage">Featured Image</Label>
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Input
                                    id="featuredImage"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditImageChange}
                                    className="cursor-pointer"
                                  />
                                </div>
                                {editImagePreview && (
                                  <div className="w-20 h-20 border border-gray-300 rounded-lg overflow-hidden">
                                    <img
                                      src={editImagePreview}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                Upload a new image to replace the current featured image (optional)
                              </p>
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
                    <Badge className={`text-xs font-medium px-3 py-1 rounded-full ${getCategoryColor((campaign as any)?.category)}`}>
                      {(campaign as any)?.category}
                    </Badge>
                    {daysLeft && (
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{(campaign as any)?.title}</h1>
                  <p className="text-gray-700 text-lg mb-6">{(campaign as any)?.description}</p>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-gray-500" />
                        <Link href={`/brand/${(campaign as any)?.brandId}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors">
                          {(campaign as any)?.brandName}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">4.8 rating</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-success">${(campaign as any)?.reward}</div>
                      <div className="text-sm text-gray-600">per task</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Campaign Progress</span>
                      <span className="text-sm text-gray-600">
                        {(campaign as any)?.filledSlots || 0} / {(campaign as any)?.totalSlots} spots filled
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
                  {(campaign as any)?.requirements ? (
                    <div className="text-amber-800 whitespace-pre-wrap">{(campaign as any).requirements}</div>
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
                        <span>Get your ${parseFloat((campaign as any)?.reward || 0).toFixed(2)} reward in crypto</span>
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
                          <li><span className="font-medium">Reward:</span> ${parseFloat((campaign as any)?.reward || 0).toFixed(2)} per task</li>
                          <li><span className="font-medium">Payment:</span> Cryptocurrency (USDT/TON)</li>
                          <li><span className="font-medium">Timeline:</span> {(campaign as any)?.estimatedTime || "30 minutes"}</li>
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
                  <div className="text-2xl font-bold text-gray-900">{(campaign as any)?.estimatedTime || '30 min'}</div>
                  <div className="text-sm text-gray-600">Estimated Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{(campaign as any)?.totalSlots}</div>
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
                  {participationStatus === 'completed' ? 'Completed — payment released' :
                   participationStatus === 'submitted' ? 'Work submitted — awaiting brand review' :
                   participationStatus === 'approved' ? 'Approved — submit your work' :
                   participationStatus === 'pending' ? 'Application under review' :
                   participationStatus === 'rejected' ? 'Application not approved' :
                   'Review requirements and apply to join'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl md:text-3xl font-bold text-success mb-1">${parseFloat((campaign as any)?.reward || 0).toFixed(2)}</div>
                  <div className="text-sm text-gray-600">per task</div>
                </div>

                {/* Brand view */}
                {isBrand ? (
                  <div className="space-y-3">
                    <div className="text-center text-gray-600">
                      <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">You're viewing as a brand</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation(`/messages?campaign=${(campaign as any)?.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message Creators
                    </Button>
                    {isOwnerOrAdmin && (
                      <Button 
                        className="w-full bg-accent hover:bg-blue-700"
                        onClick={() => setLocation('/brand-dashboard')}
                      >
                        Manage Applications
                      </Button>
                    )}
                  </div>

                /* === STEP 1: Not yet applied === */
                ) : canJoin ? (
                  <Button 
                    onClick={() => joinCampaignMutation.mutate()}
                    className="w-full bg-accent hover:bg-blue-700"
                    disabled={joinCampaignMutation.isPending}
                    data-testid="button-apply-campaign"
                  >
                    {joinCampaignMutation.isPending ? 'Applying...' : 'Apply to Join'}
                  </Button>

                /* === STEP 2: Applied — pending brand review === */
                ) : participationStatus === 'pending' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Hourglass className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-800 text-sm">Application Sent – Awaiting Brand Approval</p>
                        <p className="text-yellow-700 text-xs mt-0.5">Your application is pending review. No proof needed until the brand approves you.</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation(`/messages?campaign=${(campaign as any)?.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message Brand
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setLocation('/dashboard')}>
                      View in Dashboard
                    </Button>
                  </div>

                /* === STEP 3: Application approved — submit work === */
                ) : participationStatus === 'approved' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800 text-sm">Application Approved!</p>
                        <p className="text-green-700 text-xs mt-0.5">Complete the task and submit your work for payment.</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setIsSubmitDialogOpen(true)}
                      data-testid="button-submit-work"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Your Work
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation(`/messages?campaign=${(campaign as any)?.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message Brand
                    </Button>
                  </div>

                /* === STEP 4: Work submitted — awaiting approval === */
                ) : participationStatus === 'submitted' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Send className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-800 text-sm">Work Submitted</p>
                        <p className="text-blue-700 text-xs mt-0.5">The brand is reviewing your submission. You'll be notified on approval.</p>
                      </div>
                    </div>
                    {myParticipation?.submissionUrl && (
                      <a 
                        href={myParticipation.submissionUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Link2 className="h-4 w-4" />
                        View submitted link
                      </a>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation(`/messages?campaign=${(campaign as any)?.id}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message Brand
                    </Button>
                  </div>

                /* === STEP 5: Completed and paid === */
                ) : participationStatus === 'completed' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <PartyPopper className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-purple-800 text-sm">Completed & Paid! 🎉</p>
                        <p className="text-purple-700 text-xs mt-0.5">${parseFloat((campaign as any)?.reward || 0).toFixed(2)} has been added to your wallet balance.</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setLocation('/wallet')}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      View Wallet Balance
                    </Button>
                  </div>

                /* === Rejected === */
                ) : participationStatus === 'rejected' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800 text-sm">Application Not Approved</p>
                        {myParticipation?.adminNotes && (
                          <p className="text-red-700 text-xs mt-0.5">Reason: {myParticipation.adminNotes}</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation('/campaigns')}
                    >
                      Browse Other Campaigns
                    </Button>
                  </div>

                /* === Campaign full or cannot join === */
                ) : (
                  <Button disabled className="w-full">
                    {((campaign as any)?.filledSlots || 0) >= (campaign as any)?.totalSlots ? 'Campaign Full' : 'Cannot Join Campaign'}
                  </Button>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Spots Available:</span>
                    <span className="font-medium">
                      {(campaign as any)?.totalSlots - ((campaign as any)?.filledSlots || 0)} / {(campaign as any)?.totalSlots}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time Commitment:</span>
                    <span className="font-medium">{(campaign as any)?.estimatedTime || '30 min'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Deadline:</span>
                    <span className="font-medium">
                      {(campaign as any)?.deadline ? new Date((campaign as any).deadline).toLocaleDateString() : 'No deadline'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Work Dialog */}
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Submit Your Work</DialogTitle>
                  <DialogDescription>
                    Provide the link to your completed work and a brief description for the brand to review.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="submission-url">Work Link (URL)</Label>
                    <Input
                      id="submission-url"
                      placeholder="https://instagram.com/p/your-post or https://youtube.com/..."
                      value={submitUrl}
                      onChange={(e) => setSubmitUrl(e.target.value)}
                      data-testid="input-submission-url"
                    />
                    <p className="text-xs text-gray-500">Link to your post, video, reel, or any deliverable URL.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submission-text">Description</Label>
                    <Textarea
                      id="submission-text"
                      placeholder="Describe what you completed, any relevant stats, reach, etc..."
                      value={submitText}
                      onChange={(e) => setSubmitText(e.target.value)}
                      rows={4}
                      data-testid="input-submission-text"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsSubmitDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => submitWorkMutation.mutate()}
                      disabled={submitWorkMutation.isPending || (!submitUrl.trim() && !submitText.trim())}
                      data-testid="button-confirm-submit-work"
                    >
                      {submitWorkMutation.isPending ? 'Submitting...' : 'Submit Work'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Brand Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  About {(campaign as any)?.brandName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{(campaign as any)?.brandName?.[0]}</span>
                  </div>
                  <div>
                    <Link href={`/brand/${(campaign as any)?.brandId}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors">
                      {(campaign as any)?.brandName}
                    </Link>
                    <div className="text-sm text-gray-600">{(campaign as any)?.category}</div>
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

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation(`/brand/${(campaign as any)?.brandId}`)}
                >
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