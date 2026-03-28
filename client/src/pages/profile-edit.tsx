import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Footer } from '@/components/ui/footer';
import { getTierConfig, formatFollowers, NICHES } from '@/lib/tiers';
import { Camera, Users, TrendingUp, Award } from 'lucide-react';
import { Link } from 'wouter';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  username: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  skills: z.string().optional(),
  niche: z.string().optional(),
  // Social handles
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  twitchHandle: z.string().optional(),
  telegramChannel: z.string().optional(),
  whatsappChannel: z.string().optional(),
  linkedinHandle: z.string().optional(),
  // Follower counts
  tiktokFollowers: z.coerce.number().min(0).optional(),
  youtubeFollowers: z.coerce.number().min(0).optional(),
  instagramFollowers: z.coerce.number().min(0).optional(),
  twitterFollowers: z.coerce.number().min(0).optional(),
  twitchFollowers: z.coerce.number().min(0).optional(),
  telegramFollowers: z.coerce.number().min(0).optional(),
  whatsappFollowers: z.coerce.number().min(0).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const SOCIAL_PLATFORMS = [
  { handle: 'tiktokHandle', followers: 'tiktokFollowers', label: 'TikTok', placeholder: '@username', color: 'bg-pink-50 border-pink-200' },
  { handle: 'youtubeHandle', followers: 'youtubeFollowers', label: 'YouTube', placeholder: '@channel', color: 'bg-red-50 border-red-200' },
  { handle: 'instagramHandle', followers: 'instagramFollowers', label: 'Instagram', placeholder: '@username', color: 'bg-purple-50 border-purple-200' },
  { handle: 'twitterHandle', followers: 'twitterFollowers', label: 'X (Twitter)', placeholder: '@username', color: 'bg-blue-50 border-blue-200' },
  { handle: 'twitchHandle', followers: 'twitchFollowers', label: 'Twitch', placeholder: 'username', color: 'bg-violet-50 border-violet-200' },
  { handle: 'telegramChannel', followers: 'telegramFollowers', label: 'Telegram', placeholder: '@channel', color: 'bg-sky-50 border-sky-200' },
  { handle: 'whatsappChannel', followers: 'whatsappFollowers', label: 'WhatsApp', placeholder: 'Channel link', color: 'bg-green-50 border-green-200' },
];

export default function ProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [totalFollowersPreview, setTotalFollowersPreview] = useState(0);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      tiktokFollowers: 0,
      youtubeFollowers: 0,
      instagramFollowers: 0,
      twitterFollowers: 0,
      twitchFollowers: 0,
      telegramFollowers: 0,
      whatsappFollowers: 0,
    },
  });

  const watchedFollowers = watch(['tiktokFollowers','youtubeFollowers','instagramFollowers','twitterFollowers','twitchFollowers','telegramFollowers','whatsappFollowers']);

  useEffect(() => {
    const total = watchedFollowers.reduce((sum, v) => sum + (Number(v) || 0), 0);
    setTotalFollowersPreview(total);
  }, [watchedFollowers]);

  useEffect(() => {
    if (user) {
      const u = user as any;
      setValue('firstName', u.firstName || '');
      setValue('lastName', u.lastName || '');
      setValue('username', u.username || '');
      setValue('bio', u.bio || '');
      setValue('location', u.location || '');
      setValue('phoneNumber', u.phoneNumber || '');
      setValue('website', u.website || '');
      setValue('skills', u.skills?.join(', ') || '');
      setValue('niche', u.niche || '');
      setValue('twitterHandle', u.twitterHandle || '');
      setValue('instagramHandle', u.instagramHandle || '');
      setValue('youtubeHandle', u.youtubeHandle || '');
      setValue('tiktokHandle', u.tiktokHandle || '');
      setValue('twitchHandle', u.twitchHandle || '');
      setValue('telegramChannel', u.telegramChannel || '');
      setValue('whatsappChannel', u.whatsappChannel || '');
      setValue('linkedinHandle', u.linkedinHandle || '');
      setValue('tiktokFollowers', u.tiktokFollowers || 0);
      setValue('youtubeFollowers', u.youtubeFollowers || 0);
      setValue('instagramFollowers', u.instagramFollowers || 0);
      setValue('twitterFollowers', u.twitterFollowers || 0);
      setValue('twitchFollowers', u.twitchFollowers || 0);
      setValue('telegramFollowers', u.telegramFollowers || 0);
      setValue('whatsappFollowers', u.whatsappFollowers || 0);
      setPreviewUrl(u.profileImageUrl || '');
    }
  }, [user, setValue]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/users/${(user as any)?.id}/profile`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({ title: "Profile updated!", description: "Your profile has been saved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message || "Failed to update profile", variant: "destructive" });
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    const skillsArray = data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const profileImageUrl = profileImage ? previewUrl : (user as any)?.profileImageUrl;
    await updateProfileMutation.mutateAsync({ ...data, skills: skillsArray, profileImageUrl });
  };

  const displayName = `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() || 'User';
  const initials = `${(user as any)?.firstName?.[0] || ''}${(user as any)?.lastName?.[0] || ''}` || 'U';
  const tierConfig = getTierConfig((user as any)?.creatorTier || 'rising_sparks');
  const previewTierConfig = getTierConfig(
    totalFollowersPreview >= 1_000_000 ? 'global_titans' :
    totalFollowersPreview >= 100_000 ? 'power_influencers' :
    totalFollowersPreview >= 10_000 ? 'growth_engines' : 'rising_sparks'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Edit Profile</h1>
          <p className="text-gray-500 mt-1">Update your profile, social media accounts and follower counts</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Profile Image */}
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg">Profile Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 border-2 border-gray-200">
                  <AvatarImage src={previewUrl} alt={displayName} />
                  <AvatarFallback className="text-xl bg-black text-white">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="profileImage" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium">
                      <Camera className="h-4 w-4" />
                      Change Photo
                    </div>
                  </Label>
                  <Input id="profileImage" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tier Preview */}
          {(user as any)?.userType === 'creator' && (
            <Card className={`border-2 ${previewTierConfig.border} ${previewTierConfig.bg}`}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className={`w-8 h-8 ${previewTierConfig.text}`} />
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Your Creator Tier</div>
                      <div className={`font-bold ${previewTierConfig.text} text-lg`}>
                        {previewTierConfig.icon} {previewTierConfig.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total Followers</div>
                    <div className="text-2xl font-black text-black">{formatFollowers(totalFollowersPreview)}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Tier is auto-calculated from total followers across all platforms. Updates when you save.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Basic Info */}
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" {...register('firstName')} placeholder="First name" className="mt-1" />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" {...register('lastName')} placeholder="Last name" className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" {...register('username')} placeholder="@your_username" className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">Unique public profile URL</p>
                </div>
                <div>
                  <Label htmlFor="niche">Niche / Category</Label>
                  <select {...register('niche')} className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                    <option value="">Select a niche...</option>
                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" {...register('bio')} placeholder="Tell others about yourself..." rows={3} className="mt-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" {...register('location')} placeholder="City, Country" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" {...register('phoneNumber')} placeholder="+1 555 123 4567" className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" {...register('website')} placeholder="https://yoursite.com" className="mt-1" />
                  {errors.website && <p className="text-xs text-red-500 mt-1">{errors.website.message}</p>}
                </div>
                <div>
                  <Label htmlFor="skills">Skills</Label>
                  <Input id="skills" {...register('skills')} placeholder="Content Creation, Gaming, etc." className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media + Followers */}
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Social Media Accounts
              </CardTitle>
              <CardDescription>
                Add your social handles and follower counts. We use these to calculate your creator tier automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform.handle} className={`border rounded-xl p-4 ${platform.color}`}>
                  <div className="font-medium text-sm text-gray-700 mb-3">{platform.label}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Handle / Username</Label>
                      <Input
                        {...register(platform.handle as any)}
                        placeholder={platform.placeholder}
                        className="mt-1 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Follower Count
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        {...register(platform.followers as any, { valueAsNumber: true })}
                        placeholder="0"
                        className="mt-1 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="border rounded-xl p-4 bg-gray-50">
                <div className="font-medium text-sm text-gray-700 mb-3">LinkedIn</div>
                <Input {...register('linkedinHandle')} placeholder="username" className="bg-white text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-between pt-2">
            <Link href="/dashboard">
              <Button variant="outline" type="button" className="rounded-xl">Cancel</Button>
            </Link>
            <Button
              type="submit"
              className="bg-black text-white hover:bg-gray-900 px-8 rounded-xl"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}
