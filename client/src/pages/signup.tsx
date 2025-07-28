import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, Building2, Star, Users, Camera, MapPin } from 'lucide-react';

const creatorFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  location: z.string().min(2, 'Location is required'),
  skills: z.string().min(1, 'At least one skill is required'),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  linkedinHandle: z.string().optional(),
  followerCount: z.number().min(0, 'Follower count must be positive'),
  specialties: z.array(z.string()).min(1, 'Select at least one specialty'),
});

const brandFormSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  industry: z.string().min(1, 'Industry is required'),
  companySize: z.string().min(1, 'Company size is required'),
  description: z.string().min(20, 'Company description must be at least 20 characters'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  targetAudience: z.string().min(10, 'Target audience description is required'),
  campaignBudget: z.string().min(1, 'Budget range is required'),
  marketingGoals: z.array(z.string()).min(1, 'Select at least one marketing goal'),
});

type CreatorFormData = z.infer<typeof creatorFormSchema>;
type BrandFormData = z.infer<typeof brandFormSchema>;

const specialtyOptions = [
  'Content Creation', 'Social Media Marketing', 'Video Production', 'Photography',
  'Blogging', 'Gaming', 'Tech Reviews', 'Fashion', 'Fitness', 'Beauty',
  'Food & Cooking', 'Travel', 'Education', 'Entertainment'
];

const marketingGoalOptions = [
  'Brand Awareness', 'Lead Generation', 'Product Launch', 'Community Building',
  'Content Creation', 'Social Media Growth', 'Influencer Partnerships', 'Event Promotion'
];

export default function Signup() {
  const [activeTab, setActiveTab] = useState('creator');
  const { toast } = useToast();

  const creatorForm = useForm<CreatorFormData>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      bio: '',
      location: '',
      skills: '',
      twitterHandle: '',
      instagramHandle: '',
      youtubeHandle: '',
      linkedinHandle: '',
      followerCount: 0,
      specialties: [],
    },
  });

  const brandForm = useForm<BrandFormData>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      email: '',
      industry: '',
      companySize: '',
      description: '',
      website: '',
      targetAudience: '',
      campaignBudget: '',
      marketingGoals: [],
    },
  });

  const creatorMutation = useMutation({
    mutationFn: async (data: CreatorFormData) => {
      const payload = {
        ...data,
        userType: 'creator',
        specialties: data.specialties,
        skills: data.skills.split(',').map(s => s.trim()),
      };
      return await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Creator Profile Created!',
        description: 'Your profile has been created successfully. You can now start joining campaigns.',
      });
      window.location.href = '/';
    },
    onError: (error) => {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const brandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const payload = {
        ...data,
        userType: 'brand',
        marketingGoals: data.marketingGoals,
      };
      return await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Brand Profile Created!',
        description: 'Your brand profile has been created successfully. You can now create campaigns.',
      });
      window.location.href = '/';
    },
    onError: (error) => {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onCreatorSubmit = (data: CreatorFormData) => {
    creatorMutation.mutate(data);
  };

  const onBrandSubmit = (data: BrandFormData) => {
    brandMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Breedskool</h1>
          <p className="text-xl text-gray-600">Create your profile and start earning or finding talent today</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="creator" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              I'm a Creator
            </TabsTrigger>
            <TabsTrigger value="brand" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              I'm a Brand
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creator">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Creator Profile Setup
                </CardTitle>
                <CardDescription>
                  Tell us about yourself and start earning from brand campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={creatorForm.handleSubmit(onCreatorSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...creatorForm.register('firstName')}
                        placeholder="Enter your first name"
                      />
                      {creatorForm.formState.errors.firstName && (
                        <p className="text-sm text-red-600">{creatorForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        {...creatorForm.register('lastName')}
                        placeholder="Enter your last name"
                      />
                      {creatorForm.formState.errors.lastName && (
                        <p className="text-sm text-red-600">{creatorForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...creatorForm.register('email')}
                      placeholder="Enter your email address"
                    />
                    {creatorForm.formState.errors.email && (
                      <p className="text-sm text-red-600">{creatorForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      {...creatorForm.register('bio')}
                      placeholder="Tell us about yourself, your content style, and what makes you unique..."
                      rows={4}
                    />
                    {creatorForm.formState.errors.bio && (
                      <p className="text-sm text-red-600">{creatorForm.formState.errors.bio.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        {...creatorForm.register('location')}
                        placeholder="City, Country"
                      />
                      {creatorForm.formState.errors.location && (
                        <p className="text-sm text-red-600">{creatorForm.formState.errors.location.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="followerCount">Total Followers</Label>
                      <Input
                        id="followerCount"
                        type="number"
                        {...creatorForm.register('followerCount', { valueAsNumber: true })}
                        placeholder="Total across all platforms"
                      />
                      {creatorForm.formState.errors.followerCount && (
                        <p className="text-sm text-red-600">{creatorForm.formState.errors.followerCount.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills & Expertise</Label>
                    <Input
                      id="skills"
                      {...creatorForm.register('skills')}
                      placeholder="e.g., Video editing, Photography, Content writing (comma-separated)"
                    />
                    {creatorForm.formState.errors.skills && (
                      <p className="text-sm text-red-600">{creatorForm.formState.errors.skills.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Content Specialties</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {specialtyOptions.map((specialty) => (
                        <div key={specialty} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={specialty}
                            value={specialty}
                            {...creatorForm.register('specialties')}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={specialty} className="text-sm font-normal">
                            {specialty}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {creatorForm.formState.errors.specialties && (
                      <p className="text-sm text-red-600">{creatorForm.formState.errors.specialties.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Social Media Handles (Optional)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="twitterHandle">Twitter/X</Label>
                        <Input
                          id="twitterHandle"
                          {...creatorForm.register('twitterHandle')}
                          placeholder="@username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instagramHandle">Instagram</Label>
                        <Input
                          id="instagramHandle"
                          {...creatorForm.register('instagramHandle')}
                          placeholder="@username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="youtubeHandle">YouTube</Label>
                        <Input
                          id="youtubeHandle"
                          {...creatorForm.register('youtubeHandle')}
                          placeholder="@channel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedinHandle">LinkedIn</Label>
                        <Input
                          id="linkedinHandle"
                          {...creatorForm.register('linkedinHandle')}
                          placeholder="linkedin.com/in/username"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-blue-700"
                    disabled={creatorMutation.isPending}
                  >
                    {creatorMutation.isPending ? 'Creating Profile...' : 'Create Creator Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Brand Profile Setup
                </CardTitle>
                <CardDescription>
                  Set up your brand profile and start creating campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={brandForm.handleSubmit(onBrandSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        {...brandForm.register('companyName')}
                        placeholder="Enter your company name"
                      />
                      {brandForm.formState.errors.companyName && (
                        <p className="text-sm text-red-600">{brandForm.formState.errors.companyName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Person</Label>
                      <Input
                        id="contactName"
                        {...brandForm.register('contactName')}
                        placeholder="Your full name"
                      />
                      {brandForm.formState.errors.contactName && (
                        <p className="text-sm text-red-600">{brandForm.formState.errors.contactName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...brandForm.register('email')}
                      placeholder="Enter your business email"
                    />
                    {brandForm.formState.errors.email && (
                      <p className="text-sm text-red-600">{brandForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select onValueChange={(value) => brandForm.setValue('industry', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="fashion">Fashion & Beauty</SelectItem>
                          <SelectItem value="food">Food & Beverage</SelectItem>
                          <SelectItem value="travel">Travel & Tourism</SelectItem>
                          <SelectItem value="health">Health & Fitness</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {brandForm.formState.errors.industry && (
                        <p className="text-sm text-red-600">{brandForm.formState.errors.industry.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySize">Company Size</Label>
                      <Select onValueChange={(value) => brandForm.setValue('companySize', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-1000">201-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                      {brandForm.formState.errors.companySize && (
                        <p className="text-sm text-red-600">{brandForm.formState.errors.companySize.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      {...brandForm.register('description')}
                      placeholder="Tell us about your company, products, and brand values..."
                      rows={4}
                    />
                    {brandForm.formState.errors.description && (
                      <p className="text-sm text-red-600">{brandForm.formState.errors.description.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      {...brandForm.register('website')}
                      placeholder="https://yourcompany.com"
                    />
                    {brandForm.formState.errors.website && (
                      <p className="text-sm text-red-600">{brandForm.formState.errors.website.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">Target Audience</Label>
                    <Textarea
                      id="targetAudience"
                      {...brandForm.register('targetAudience')}
                      placeholder="Describe your ideal customer demographics, interests, and behaviors..."
                      rows={3}
                    />
                    {brandForm.formState.errors.targetAudience && (
                      <p className="text-sm text-red-600">{brandForm.formState.errors.targetAudience.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaignBudget">Campaign Budget Range</Label>
                    <Select onValueChange={(value) => brandForm.setValue('campaignBudget', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your typical budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-1000">Under $1,000</SelectItem>
                        <SelectItem value="1000-5000">$1,000 - $5,000</SelectItem>
                        <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                        <SelectItem value="10000-25000">$10,000 - $25,000</SelectItem>
                        <SelectItem value="25000-50000">$25,000 - $50,000</SelectItem>
                        <SelectItem value="50000+">$50,000+</SelectItem>
                      </SelectContent>
                    </Select>
                    {brandForm.formState.errors.campaignBudget && (
                      <p className="text-sm text-red-600">{brandForm.formState.errors.campaignBudget.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Marketing Goals</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {marketingGoalOptions.map((goal) => (
                        <div key={goal} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={goal}
                            value={goal}
                            {...brandForm.register('marketingGoals')}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={goal} className="text-sm font-normal">
                            {goal}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {brandForm.formState.errors.marketingGoals && (
                      <p className="text-sm text-red-600">{brandForm.formState.errors.marketingGoals.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-blue-700"
                    disabled={brandMutation.isPending}
                  >
                    {brandMutation.isPending ? 'Creating Profile...' : 'Create Brand Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}