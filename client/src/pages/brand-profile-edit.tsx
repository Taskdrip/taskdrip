import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Footer } from '@/components/ui/footer';
import { ImageUpload } from '@/components/ImageUpload';
import {
  Building2, Globe, MapPin, Phone, Sparkles, ShieldCheck,
  Eye, Link2, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import {
  SiTiktok, SiYoutube, SiInstagram, SiX,
} from 'react-icons/si';
import { FaLinkedin as SiLinkedin } from 'react-icons/fa';

const INDUSTRIES = [
  'Technology', 'E-commerce', 'Fashion & Apparel', 'Beauty & Cosmetics', 'Food & Beverage',
  'Health & Wellness', 'Fitness & Sports', 'Gaming', 'Crypto & Web3', 'Finance & Fintech',
  'Travel & Hospitality', 'Education', 'Entertainment & Media', 'Automotive', 'Real Estate',
  'B2B SaaS', 'Non-profit', 'Other',
];

const brandSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100),
  firstName: z.string().min(1, 'Contact first name is required'),
  lastName: z.string().min(1, 'Contact last name is required'),
  username: z.string().optional(),
  industry: z.string().optional(),
  bio: z.string().max(800, 'Keep your brand description under 800 characters').optional(),
  website: z.string().url('Enter a valid URL (https://...)').optional().or(z.literal('')),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  // Brand social presence (handles only — not follower counts; brands are not tier-ranked by reach)
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  linkedinHandle: z.string().optional(),
  // SEO
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(180).optional(),
  seoKeywords: z.string().max(200).optional(),
});

type BrandFormData = z.infer<typeof brandSchema>;

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let t: any;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

export default function BrandProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [messagePrivacy, setMessagePrivacy] = useState<'everyone' | 'followers' | 'nobody'>('everyone');
  const [directSupportEnabled, setDirectSupportEnabled] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<{ checking: boolean; available: boolean | null; reason?: string; normalized?: string }>({ checking: false, available: null });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {},
  });

  const watchedUsername = watch('username');

  useEffect(() => {
    if (!user) return;
    const u = user as any;
    setValue('companyName', u.companyName || '');
    setValue('firstName', u.firstName || '');
    setValue('lastName', u.lastName || '');
    setValue('username', u.username || '');
    setValue('industry', u.industry || '');
    setValue('bio', u.bio || '');
    setValue('website', u.website || '');
    setValue('location', u.location || '');
    setValue('phoneNumber', u.phoneNumber || '');
    setValue('country', u.country || '');
    setValue('state', u.state || '');
    setValue('city', u.city || '');
    setValue('twitterHandle', u.twitterHandle || '');
    setValue('instagramHandle', u.instagramHandle || '');
    setValue('youtubeHandle', u.youtubeHandle || '');
    setValue('tiktokHandle', u.tiktokHandle || '');
    setValue('linkedinHandle', u.linkedinHandle || '');
    setValue('seoTitle', u.seoTitle || '');
    setValue('seoDescription', u.seoDescription || '');
    setValue('seoKeywords', u.seoKeywords || '');
    setProfileImageUrl(u.profileImageUrl || '');
    setBannerImageUrl(u.bannerImageUrl || '');
    setDirectSupportEnabled(!!u.directSupportEnabled);
    if (u.messagePrivacy) setMessagePrivacy(u.messagePrivacy);
  }, [user, setValue]);

  // Live username availability check (debounced)
  useEffect(() => {
    const original = (user as any)?.username || '';
    const candidate = (watchedUsername || '').trim();
    if (!candidate || candidate.toLowerCase() === original.toLowerCase()) {
      setUsernameStatus({ checking: false, available: null });
      return;
    }
    setUsernameStatus({ checking: true, available: null });
    const run = debounce(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(candidate)}`, { credentials: 'include' });
        const data = await res.json();
        setUsernameStatus({ checking: false, available: !!data.available, reason: data.reason, normalized: data.normalized });
      } catch {
        setUsernameStatus({ checking: false, available: null });
      }
    }, 350);
    run();
  }, [watchedUsername, user]);

  const updateMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const payload = {
        ...data,
        profileImageUrl: profileImageUrl || null,
        bannerImageUrl: bannerImageUrl || null,
        directSupportEnabled,
      };
      const res = await apiRequest('PATCH', `/api/users/${(user as any)?.id}/profile`, payload);
      return res.json();
    },
  });

  const onSubmit = async (data: BrandFormData) => {
    try {
      const updated = await updateMutation.mutateAsync(data);
      // Save messaging-privacy in parallel (non-blocking for redirect)
      try {
        await apiRequest('PATCH', `/api/users/${(user as any)?.id}/message-privacy`, { messagePrivacy });
      } catch { /* non-fatal */ }

      const userId = (user as any)?.id;
      // Invalidate every cache that holds this user's data so the public profile reflects updates instantly
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/profile`] });
      queryClient.invalidateQueries({ queryKey: ['/api/brands/by-tier'] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/brand/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });

      toast({ title: "Brand profile saved!", description: "Your changes are live." });

      // Redirect to the public profile (use username-based clean URL when present)
      const targetUsername = (updated?.username || data.username || '').trim();
      const target = targetUsername
        ? `/p/${targetUsername}`
        : `/brand/${userId}`;
      navigate(target);
    } catch (error: any) {
      let description = "Failed to save brand profile. Please try again.";
      try {
        const errText = error?.message || '';
        const jsonStart = errText.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(errText.slice(jsonStart));
          if (parsed?.message) description = parsed.message;
        }
      } catch { /* ignore */ }
      toast({ title: "Save failed", description, variant: "destructive" });
    }
  };

  const u = (user as any) || {};
  const initials = (u.companyName?.[0] || u.firstName?.[0] || 'B').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationFixed />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-emerald-600" /> Brand Settings
            </h1>
            <p className="text-slate-500 mt-1">Update your brand identity, contact info, and public listing.</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Brand account</Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo & Banner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-600" /> Brand Assets</CardTitle>
              <CardDescription>Your logo and banner are displayed on your public brand profile and in campaign listings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Brand Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-slate-200">
                    <AvatarImage src={profileImageUrl} alt="logo preview" />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xl font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <ImageUpload
                      value={profileImageUrl}
                      onChange={setProfileImageUrl}
                      variant="logo"
                      testId="brand-logo-upload"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Banner Image</Label>
                <ImageUpload
                  value={bannerImageUrl}
                  onChange={setBannerImageUrl}
                  variant="banner"
                  testId="brand-banner-upload"
                />
              </div>
            </CardContent>
          </Card>

          {/* Brand Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" /> Brand Identity</CardTitle>
              <CardDescription>Your public-facing brand name, industry, and description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company / Brand Name *</Label>
                <Input id="companyName" {...register('companyName')} placeholder="e.g. Acme Coffee Co." className="mt-1" data-testid="input-companyName" />
                {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    {...register('industry')}
                    className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    data-testid="select-industry"
                  >
                    <option value="">Select an industry...</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="username">Public Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                    <Input
                      id="username"
                      {...register('username')}
                      placeholder="acmecoffee"
                      className="mt-1 pl-7 pr-9"
                      data-testid="input-username"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus.checking && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                      {!usernameStatus.checking && usernameStatus.available === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {!usernameStatus.checking && usernameStatus.available === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                    </span>
                  </div>
                  {usernameStatus.available === true && (
                    <p className="text-xs text-emerald-600 mt-1" data-testid="username-status">
                      ✓ Available — your profile will be at <strong>/p/{usernameStatus.normalized}</strong>
                    </p>
                  )}
                  {usernameStatus.available === false && (
                    <p className="text-xs text-red-500 mt-1" data-testid="username-status">
                      {usernameStatus.reason === 'taken' && 'That username is already taken.'}
                      {usernameStatus.reason === 'reserved' && 'That username is reserved.'}
                      {usernameStatus.reason === 'length' && 'Use 3–30 letters, numbers, or underscore.'}
                      {(!usernameStatus.reason || usernameStatus.reason === 'empty') && 'Pick another username.'}
                    </p>
                  )}
                  {usernameStatus.available === null && (
                    <p className="text-xs text-slate-400 mt-1">Used in your public profile URL: /p/your-username</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Brand Description</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  {...register('bio')}
                  placeholder="What does your brand do? Who is your audience? What kind of campaigns are you looking to run?"
                  className="mt-1"
                  data-testid="input-bio"
                />
                {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-emerald-600" /> Contact & Location</CardTitle>
              <CardDescription>Where your brand is based and how influencers can reach you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Contact First Name *</Label>
                  <Input id="firstName" {...register('firstName')} className="mt-1" data-testid="input-firstName" />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Contact Last Name *</Label>
                  <Input id="lastName" {...register('lastName')} className="mt-1" data-testid="input-lastName" />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" {...register('website')} placeholder="https://yourbrand.com" className="mt-1" data-testid="input-website" />
                  {errors.website && <p className="text-xs text-red-500 mt-1">{errors.website.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" {...register('phoneNumber')} placeholder="+1 555 123 4567" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" {...register('country')} placeholder="United States" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="state">State / Region</Label>
                  <Input id="state" {...register('state')} placeholder="California" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} placeholder="San Francisco" className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Display Location (shown on profile)</Label>
                <Input id="location" {...register('location')} placeholder="San Francisco, CA — USA" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Brand Social Channels — handles only, no follower-count tier ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Link2 className="w-5 h-5 text-emerald-600" /> Brand Social Channels</CardTitle>
              <CardDescription>Link your official brand pages. These are shown on your profile so creators can verify and follow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'instagramHandle', label: 'Instagram', Icon: SiInstagram, placeholder: 'https://instagram.com/yourbrand' },
                { key: 'tiktokHandle', label: 'TikTok', Icon: SiTiktok, placeholder: 'https://tiktok.com/@yourbrand' },
                { key: 'twitterHandle', label: 'X (Twitter)', Icon: SiX, placeholder: 'https://x.com/yourbrand' },
                { key: 'youtubeHandle', label: 'YouTube', Icon: SiYoutube, placeholder: 'https://youtube.com/@yourbrand' },
                { key: 'linkedinHandle', label: 'LinkedIn', Icon: SiLinkedin, placeholder: 'https://linkedin.com/company/yourbrand' },
              ].map(({ key, label, Icon, placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">{label}</Label>
                    <Input {...register(key as keyof BrandFormData)} placeholder={placeholder} className="mt-0.5 text-sm" data-testid={`input-${key}`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Eye className="w-5 h-5 text-emerald-600" /> Search & Discovery (SEO)</CardTitle>
              <CardDescription>How your brand appears in Google and when shared on social media.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">Page Title (SEO)</Label>
                <Input id="seoTitle" {...register('seoTitle')} placeholder="Acme Coffee — Premium Beans for Modern Cafes" className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">Recommended 50–60 characters.</p>
              </div>
              <div>
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea id="seoDescription" rows={2} {...register('seoDescription')} placeholder="Premium specialty coffee for discerning brands & cafes." className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">Recommended 120–160 characters.</p>
              </div>
              <div>
                <Label htmlFor="seoKeywords">Keywords</Label>
                <Input id="seoKeywords" {...register('seoKeywords')} placeholder="coffee, specialty beans, café supply" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Direct Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Privacy & Messaging</CardTitle>
              <CardDescription>Control how creators can reach your brand and whether you accept direct support.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {([
                  { value: 'everyone', label: 'Everyone', desc: 'Any creator on Taskdrip can message you.' },
                  { value: 'followers', label: 'Followers only', desc: 'Only creators you follow can message you.' },
                  { value: 'nobody', label: 'No one', desc: 'Turn off direct messages entirely.' },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${messagePrivacy === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-300'}`}
                    data-testid={`radio-message-privacy-${opt.value}`}
                  >
                    <input type="radio" name="messagePrivacy" value={opt.value} checked={messagePrivacy === opt.value} onChange={() => setMessagePrivacy(opt.value)} className="mt-1 accent-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-sm text-slate-900">{opt.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex items-start justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                <div>
                  <Label className="text-sm font-semibold">Accept direct community support</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Allow community members to send tips and contributions to your brand.</p>
                </div>
                <Switch checked={directSupportEnabled} onCheckedChange={setDirectSupportEnabled} data-testid="switch-direct-support" />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-between pt-2">
            <Link href={(user as any)?.id ? `/brand/${(user as any).id}` : '/dashboard'}>
              <Button variant="outline" type="button" className="rounded-xl">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={updateMutation.isPending || usernameStatus.available === false}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 rounded-xl"
              data-testid="button-save-brand-profile"
            >
              {updateMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : 'Save Brand Profile'}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
