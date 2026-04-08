import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, User, Building2 } from 'lucide-react';

const creatorSignupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  location: z.string().min(2, 'Location is required'),
  skills: z.string().min(1, 'Skills are required'),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
});

const brandSignupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  bio: z.string().min(20, 'Company description must be at least 20 characters'),
  website: z.string().optional(),
  industry: z.string().min(2, 'Industry is required'),
});

type CreatorSignupData = z.infer<typeof creatorSignupSchema>;
type BrandSignupData = z.infer<typeof brandSignupSchema>;

export default function SimpleSignup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('creator');

  const creatorForm = useForm<CreatorSignupData>({
    resolver: zodResolver(creatorSignupSchema),
  });

  const brandForm = useForm<BrandSignupData>({
    resolver: zodResolver(brandSignupSchema),
  });

  // Capture referral code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  const refType = urlParams.get('type');

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        userType: activeTab,
        skills: activeTab === 'creator' ? [data.skills] : [],
        ...(refCode ? { referralCode: refCode, referralType: refType || activeTab } : {}),
      };
      const response = await apiRequest('POST', '/api/auth/register', payload);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Account created successfully!",
        description: `Welcome to Taskdrip, ${data.user.firstName}!`,
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const onCreatorSubmit = (data: CreatorSignupData) => {
    signupMutation.mutate(data);
  };

  const onBrandSubmit = (data: BrandSignupData) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Join Taskdrip</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and start earning crypto rewards
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Choose your account type and fill in your details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="creator" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Creator
                </TabsTrigger>
                <TabsTrigger value="brand" className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Brand
                </TabsTrigger>
              </TabsList>

              <TabsContent value="creator" className="space-y-4">
                <form onSubmit={creatorForm.handleSubmit(onCreatorSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="creator-firstName">First Name</Label>
                      <Input
                        id="creator-firstName"
                        {...creatorForm.register('firstName')}
                      />
                      {creatorForm.formState.errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">
                          {creatorForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="creator-lastName">Last Name</Label>
                      <Input
                        id="creator-lastName"
                        {...creatorForm.register('lastName')}
                      />
                      {creatorForm.formState.errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">
                          {creatorForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="creator-email">Email</Label>
                    <Input
                      id="creator-email"
                      type="email"
                      {...creatorForm.register('email')}
                    />
                    {creatorForm.formState.errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {creatorForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="creator-password">Password</Label>
                    <Input
                      id="creator-password"
                      type="password"
                      {...creatorForm.register('password')}
                    />
                    {creatorForm.formState.errors.password && (
                      <p className="text-red-500 text-sm mt-1">
                        {creatorForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="creator-bio">Bio</Label>
                    <Textarea
                      id="creator-bio"
                      placeholder="Tell us about yourself..."
                      {...creatorForm.register('bio')}
                    />
                    {creatorForm.formState.errors.bio && (
                      <p className="text-red-500 text-sm mt-1">
                        {creatorForm.formState.errors.bio.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="creator-location">Location</Label>
                    <Input
                      id="creator-location"
                      placeholder="City, Country"
                      {...creatorForm.register('location')}
                    />
                    {creatorForm.formState.errors.location && (
                      <p className="text-red-500 text-sm mt-1">
                        {creatorForm.formState.errors.location.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="creator-skills">Skills</Label>
                    <Input
                      id="creator-skills"
                      placeholder="e.g., Content Creation, Social Media, Video Editing"
                      {...creatorForm.register('skills')}
                    />
                    {creatorForm.formState.errors.skills && (
                      <p className="text-red-500 text-sm mt-1">
                        {creatorForm.formState.errors.skills.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="creator-twitter">Twitter Handle (Optional)</Label>
                    <Input
                      id="creator-twitter"
                      placeholder="@username"
                      {...creatorForm.register('twitterHandle')}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-gray-800"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? 'Creating Account...' : 'Create Creator Account'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="brand" className="space-y-4">
                <form onSubmit={brandForm.handleSubmit(onBrandSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brand-firstName">First Name</Label>
                      <Input
                        id="brand-firstName"
                        {...brandForm.register('firstName')}
                      />
                      {brandForm.formState.errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">
                          {brandForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="brand-lastName">Last Name</Label>
                      <Input
                        id="brand-lastName"
                        {...brandForm.register('lastName')}
                      />
                      {brandForm.formState.errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">
                          {brandForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="brand-email">Email</Label>
                    <Input
                      id="brand-email"
                      type="email"
                      {...brandForm.register('email')}
                    />
                    {brandForm.formState.errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {brandForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="brand-password">Password</Label>
                    <Input
                      id="brand-password"
                      type="password"
                      {...brandForm.register('password')}
                    />
                    {brandForm.formState.errors.password && (
                      <p className="text-red-500 text-sm mt-1">
                        {brandForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="brand-company">Company Name</Label>
                    <Input
                      id="brand-company"
                      {...brandForm.register('companyName')}
                    />
                    {brandForm.formState.errors.companyName && (
                      <p className="text-red-500 text-sm mt-1">
                        {brandForm.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="brand-bio">Company Description</Label>
                    <Textarea
                      id="brand-bio"
                      placeholder="Tell us about your company..."
                      {...brandForm.register('bio')}
                    />
                    {brandForm.formState.errors.bio && (
                      <p className="text-red-500 text-sm mt-1">
                        {brandForm.formState.errors.bio.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="brand-industry">Industry</Label>
                    <Input
                      id="brand-industry"
                      placeholder="e.g., Technology, Fashion, Food"
                      {...brandForm.register('industry')}
                    />
                    {brandForm.formState.errors.industry && (
                      <p className="text-red-500 text-sm mt-1">
                        {brandForm.formState.errors.industry.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="brand-website">Website (Optional)</Label>
                    <Input
                      id="brand-website"
                      placeholder="https://yourcompany.com"
                      {...brandForm.register('website')}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-gray-800"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? 'Creating Account...' : 'Create Brand Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Sign in to your account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}