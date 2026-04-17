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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, User, Building2, CheckCircle, Zap, ArrowRight } from 'lucide-react';
import { SiTelegram, SiWhatsapp, SiX, SiInstagram, SiYoutube } from 'react-icons/si';
import { SOCIALS } from '@/config/socials';

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

function SignupSuccessScreen({ firstName }: { firstName: string }) {
  const [, setLocation] = useLocation();

  const socialItems = [
    { href: SOCIALS.telegram, label: "Join Telegram Community", icon: SiTelegram, color: "bg-[#229ED9]", pts: "+20 pts" },
    { href: SOCIALS.whatsapp, label: "Chat on WhatsApp", icon: SiWhatsapp, color: "bg-[#25D366]", pts: "+10 pts" },
    { href: SOCIALS.x, label: "Follow on X", icon: SiX, color: "bg-gray-900", pts: "+15 pts" },
    { href: SOCIALS.instagram, label: "Follow Instagram", icon: SiInstagram, color: "bg-[#E1306C]", pts: "+15 pts" },
    { href: SOCIALS.youtube, label: "Subscribe YouTube", icon: SiYoutube, color: "bg-[#FF0000]", pts: "+20 pts" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Welcome, {firstName}! 🎉
          </h1>
          <p className="text-gray-300">Your account is ready. You've earned your first points!</p>
          <Badge className="mt-3 bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-sm px-3 py-1">
            <Zap className="h-3.5 w-3.5 mr-1" /> +50 $TDRIP Points Credited
          </Badge>
        </div>

        {/* Social CTA Card */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">🚀 Earn More Points — Join Our Community</CardTitle>
            <CardDescription className="text-gray-300 text-sm">
              Complete social tasks to earn up to 130 bonus $TDRIP points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {socialItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
                >
                  <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white text-sm font-medium flex-1">{item.label}</span>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                    {item.pts}
                  </Badge>
                </a>
              );
            })}
          </CardContent>
        </Card>

        {/* Note about Welcome Campaign */}
        <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-4 text-center">
          <p className="text-purple-200 text-sm">
            ✅ These tasks are waiting in your <span className="font-bold text-white">Welcome Campaign</span> on your dashboard. Complete them anytime!
          </p>
        </div>

        {/* Go to Dashboard */}
        <Button
          onClick={() => setLocation('/dashboard')}
          className="w-full bg-white text-black hover:bg-gray-100 font-bold h-12 text-base"
          data-testid="button-go-to-dashboard"
        >
          Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default function SimpleSignup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  const urlType = urlParams.get('type');
  const initialTab = urlType === 'brand' ? 'brand' : 'creator';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [successUser, setSuccessUser] = useState<{ firstName: string } | null>(null);
  const [highlightTab, setHighlightTab] = useState(!!urlType);

  useEffect(() => {
    if (urlType) {
      setActiveTab(urlType === 'brand' ? 'brand' : 'creator');
      setHighlightTab(true);
      const timer = setTimeout(() => setHighlightTab(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const creatorForm = useForm<CreatorSignupData>({
    resolver: zodResolver(creatorSignupSchema),
  });

  const brandForm = useForm<BrandSignupData>({
    resolver: zodResolver(brandSignupSchema),
  });

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        userType: activeTab,
        skills: activeTab === 'creator' ? [data.skills] : [],
        ...(refCode ? { referralCode: refCode, referralType: urlType || activeTab } : {}),
      };
      const response = await apiRequest('POST', '/api/auth/register', payload);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setSuccessUser({ firstName: data.user.firstName });
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user && !successUser) {
      setLocation('/dashboard');
    }
  }, [user, successUser, setLocation]);

  const onCreatorSubmit = (data: CreatorSignupData) => {
    signupMutation.mutate(data);
  };

  const onBrandSubmit = (data: BrandSignupData) => {
    signupMutation.mutate(data);
  };

  if (successUser) {
    return <SignupSuccessScreen firstName={successUser.firstName} />;
  }

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
          <Badge className="mt-2 bg-purple-100 text-purple-700 border-0">
            <Zap className="h-3 w-3 mr-1" /> +50 $TDRIP Points on signup
          </Badge>
        </div>

        {/* Animated arrival banner */}
        {highlightTab && (
          <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border-2 font-semibold text-sm animate-pulse ${
            activeTab === 'brand'
              ? 'bg-blue-50 border-blue-400 text-blue-800'
              : 'bg-purple-50 border-purple-400 text-purple-800'
          }`}>
            <ArrowRight className="w-4 h-4 shrink-0" />
            {activeTab === 'brand'
              ? "Great! You're signing up as a Brand — fill in your details below."
              : "Great! You're signing up as an Influencer — fill in your details below."}
          </div>
        )}

        <Card className={`transition-all duration-500 ${highlightTab ? 'ring-2 ring-offset-2 ' + (activeTab === 'brand' ? 'ring-blue-400' : 'ring-purple-400') : ''}`}>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Choose your account type and fill in your details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setHighlightTab(false); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-1">
                <TabsTrigger
                  value="creator"
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    activeTab === 'creator' && highlightTab
                      ? 'ring-2 ring-purple-500 ring-offset-1 animate-pulse'
                      : ''
                  }`}
                >
                  <User className="h-4 w-4" />
                  Influencer
                  {activeTab === 'creator' && highlightTab && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-purple-500 animate-ping inline-block" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="brand"
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    activeTab === 'brand' && highlightTab
                      ? 'ring-2 ring-blue-500 ring-offset-1 animate-pulse'
                      : ''
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  Brand
                  {activeTab === 'brand' && highlightTab && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block" />
                  )}
                </TabsTrigger>
              </TabsList>
              {highlightTab && (
                <div className="flex justify-center mb-3">
                  <div className={`flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${
                    activeTab === 'brand' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <ArrowRight className="w-3 h-3 rotate-90" />
                    {activeTab === 'brand' ? 'Brand form below' : 'Influencer form below'}
                  </div>
                </div>
              )}

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
                    data-testid="button-creator-signup"
                  >
                    {signupMutation.isPending ? 'Creating Account...' : 'Create Influencer Account'}
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
                    data-testid="button-brand-signup"
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
