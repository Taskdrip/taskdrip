import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Footer } from '@/components/ui/footer';
import { getTierConfig, getTierFromFollowers, formatFollowers, NICHES } from '@/lib/tiers';
import {
  Camera, TrendingUp, Award, Link2, Plus, Trash2,
  Globe, ExternalLink, DollarSign, ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { Link } from 'wouter';
import {
  SiTiktok, SiYoutube, SiInstagram, SiX, SiTwitch,
  SiTelegram, SiWhatsapp, SiLinkedin
} from 'react-icons/si';

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
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  twitchHandle: z.string().optional(),
  telegramChannel: z.string().optional(),
  whatsappChannel: z.string().optional(),
  linkedinHandle: z.string().optional(),
  tiktokFollowers: z.coerce.number().min(0).optional(),
  youtubeFollowers: z.coerce.number().min(0).optional(),
  instagramFollowers: z.coerce.number().min(0).optional(),
  twitterFollowers: z.coerce.number().min(0).optional(),
  twitchFollowers: z.coerce.number().min(0).optional(),
  telegramFollowers: z.coerce.number().min(0).optional(),
  whatsappFollowers: z.coerce.number().min(0).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const BUILT_IN_PLATFORMS = [
  { handle: 'tiktokHandle' as const, followers: 'tiktokFollowers' as const, label: 'TikTok', icon: SiTiktok, color: 'bg-pink-50 border-pink-200', iconBg: 'bg-black', placeholder: 'https://tiktok.com/@yourusername' },
  { handle: 'youtubeHandle' as const, followers: 'youtubeFollowers' as const, label: 'YouTube', icon: SiYoutube, color: 'bg-red-50 border-red-200', iconBg: 'bg-red-600', placeholder: 'https://youtube.com/@yourchannel' },
  { handle: 'instagramHandle' as const, followers: 'instagramFollowers' as const, label: 'Instagram', icon: SiInstagram, color: 'bg-purple-50 border-purple-200', iconBg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', placeholder: 'https://instagram.com/yourusername' },
  { handle: 'twitterHandle' as const, followers: 'twitterFollowers' as const, label: 'X (Twitter)', icon: SiX, color: 'bg-blue-50 border-blue-200', iconBg: 'bg-black', placeholder: 'https://x.com/yourusername' },
  { handle: 'twitchHandle' as const, followers: 'twitchFollowers' as const, label: 'Twitch', icon: SiTwitch, color: 'bg-violet-50 border-violet-200', iconBg: 'bg-violet-600', placeholder: 'https://twitch.tv/yourusername' },
  { handle: 'telegramChannel' as const, followers: 'telegramFollowers' as const, label: 'Telegram', icon: SiTelegram, color: 'bg-sky-50 border-sky-200', iconBg: 'bg-sky-500', placeholder: 'https://t.me/yourchannel' },
  { handle: 'whatsappChannel' as const, followers: 'whatsappFollowers' as const, label: 'WhatsApp', icon: SiWhatsapp, color: 'bg-green-50 border-green-200', iconBg: 'bg-green-500', placeholder: 'https://wa.me/c/yourchannel' },
];

const POPULAR_CUSTOM_PLATFORMS = [
  { name: 'SoundCloud', emoji: '🎵', color: '#ff5500' },
  { name: 'Pinterest', emoji: '📌', color: '#e60023' },
  { name: 'Discord', emoji: '💬', color: '#5865f2' },
  { name: 'Snapchat', emoji: '👻', color: '#fffc00' },
  { name: 'Clubhouse', emoji: '🎙️', color: '#f1f0e9' },
  { name: 'Spotify', emoji: '🎧', color: '#1db954' },
  { name: 'BeReal', emoji: '📸', color: '#1a1a1a' },
  { name: 'Threads', emoji: '🧵', color: '#000000' },
  { name: 'Tumblr', emoji: '📝', color: '#35465c' },
  { name: 'Reddit', emoji: '🤖', color: '#ff4500' },
  { name: 'Patreon', emoji: '🎁', color: '#ff424d' },
  { name: 'OnlyFans', emoji: '🔒', color: '#00aff0' },
  { name: 'Kick', emoji: '🎮', color: '#53fc18' },
  { name: 'Rumble', emoji: '📺', color: '#85c742' },
];

const RATE_TYPES = [
  { key: 'instagramPost', label: 'Instagram Post', emoji: '📸' },
  { key: 'instagramStory', label: 'Instagram Story', emoji: '⏱️' },
  { key: 'instagramReel', label: 'Instagram Reel', emoji: '🎞️' },
  { key: 'tiktokVideo', label: 'TikTok Video', emoji: '🎵' },
  { key: 'youtubeVideo', label: 'YouTube Video', emoji: '▶️' },
  { key: 'youtubeShorts', label: 'YouTube Shorts', emoji: '📱' },
  { key: 'tweet', label: 'X (Twitter) Post', emoji: '🐦' },
  { key: 'twitchStream', label: 'Twitch Live Stream', emoji: '🎮' },
  { key: 'podcastMention', label: 'Podcast Mention', emoji: '🎙️' },
  { key: 'blogPost', label: 'Blog / Article', emoji: '📝' },
  { key: 'other', label: 'Custom / Other', emoji: '✨' },
];

interface CustomChannel {
  id: string;
  platformSlug: string;
  platformName: string;
  platformColor: string;
  platformEmoji: string;
  url: string;
  followerCount: number;
  displayOnProfile: boolean;
  isUserDefined: boolean;
}

export default function ProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [totalFollowersPreview, setTotalFollowersPreview] = useState(0);

  // Admin custom platforms (from social_platforms table)
  const [adminCustomLinks, setAdminCustomLinks] = useState<Record<string, { url: string; followerCount: number; displayOnProfile: boolean }>>({});

  // User-defined custom channels
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ platformName: '', platformColor: '#6366f1', platformEmoji: '🌐', url: '', followerCount: 0, displayOnProfile: true });

  // Content rates
  const [rates, setRates] = useState<Record<string, string>>({});
  const [showRates, setShowRates] = useState(false);

  // Privacy settings
  const [messagePrivacy, setMessagePrivacy] = useState<'everyone' | 'followers' | 'nobody'>('everyone');
  const [directSupportEnabled, setDirectSupportEnabled] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { tiktokFollowers: 0, youtubeFollowers: 0, instagramFollowers: 0, twitterFollowers: 0, twitchFollowers: 0, telegramFollowers: 0, whatsappFollowers: 0 },
  });

  const { data: adminPlatforms = [] } = useQuery<any[]>({ queryKey: ['/api/social-platforms'] });
  const { data: existingLinks = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${(user as any)?.id}/social-links`],
    enabled: !!(user as any)?.id,
  });

  const watchedFollowers = watch(['tiktokFollowers', 'youtubeFollowers', 'instagramFollowers', 'twitterFollowers', 'twitchFollowers', 'telegramFollowers', 'whatsappFollowers']);

  useEffect(() => {
    const builtInTotal = watchedFollowers.reduce((sum, v) => sum + (Number(v) || 0), 0);
    const adminTotal = Object.values(adminCustomLinks).reduce((sum, l) => sum + (l.followerCount || 0), 0);
    const userDefTotal = customChannels.reduce((sum, c) => sum + (c.followerCount || 0), 0);
    setTotalFollowersPreview(builtInTotal + adminTotal + userDefTotal);
  }, [watchedFollowers, adminCustomLinks, customChannels]);

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
      // Load message privacy setting
      if (u.messagePrivacy) setMessagePrivacy(u.messagePrivacy as 'everyone' | 'followers' | 'nobody');
      setDirectSupportEnabled(!!u.directSupportEnabled);
      // Load saved rates
      if (u.contentRates) {
        const savedRates: Record<string, string> = {};
        for (const [k, v] of Object.entries(u.contentRates as any)) {
          savedRates[k] = String(v || '');
        }
        setRates(savedRates);
      }
    }
  }, [user, setValue]);

  useEffect(() => {
    if (existingLinks.length > 0) {
      const adminMap: Record<string, { url: string; followerCount: number }> = {};
      const userDefined: CustomChannel[] = [];
      for (const link of existingLinks) {
        if (link.isUserDefined) {
          userDefined.push({
            id: link.id || String(Math.random()),
            platformSlug: link.platformSlug,
            platformName: link.platformName || link.platformSlug,
            platformColor: link.platformColor || '#6366f1',
            platformEmoji: link.platformEmoji || '🌐',
            url: link.url,
            followerCount: link.followerCount || 0,
            displayOnProfile: link.displayOnProfile !== false,
            isUserDefined: true,
          });
        } else {
          adminMap[link.platformSlug] = { url: link.url, followerCount: link.followerCount || 0 };
        }
      }
      setAdminCustomLinks(adminMap);
      setCustomChannels(userDefined);
    }
  }, [existingLinks]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/users/${(user as any)?.id}/profile`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  const saveRatesMutation = useMutation({
    mutationFn: async () => {
      const ratesObj: Record<string, number> = {};
      for (const [k, v] of Object.entries(rates)) {
        const n = parseFloat(v);
        if (!isNaN(n) && n > 0) ratesObj[k] = n;
      }
      const response = await apiRequest('PATCH', `/api/users/${(user as any)?.id}/rates`, ratesObj);
      return await response.json();
    },
  });

  const saveLinksMutation = useMutation({
    mutationFn: async () => {
      const adminLinks = Object.entries(adminCustomLinks)
        .filter(([, v]) => v.url)
        .map(([platformSlug, v]) => ({ platformSlug, url: v.url, followerCount: v.followerCount || 0, isUserDefined: false, displayOnProfile: true }));
      const userLinks = customChannels
        .filter(c => c.url)
        .map(c => ({
          platformSlug: c.platformSlug || `custom_${c.platformName.toLowerCase().replace(/\s+/g, '_')}`,
          url: c.url,
          followerCount: c.followerCount || 0,
          platformName: c.platformName,
          platformColor: c.platformColor,
          platformEmoji: c.platformEmoji,
          isUserDefined: true,
          displayOnProfile: c.displayOnProfile,
        }));
      const response = await apiRequest('PUT', `/api/users/${(user as any)?.id}/social-links`, { links: [...adminLinks, ...userLinks] });
      return await response.json();
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

  const addCustomChannel = () => {
    if (!newChannel.platformName || !newChannel.url) {
      toast({ title: "Name and URL are required", variant: "destructive" });
      return;
    }
    const slug = `custom_${newChannel.platformName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    setCustomChannels(prev => [...prev, { ...newChannel, id: String(Date.now()), platformSlug: slug, isUserDefined: true }]);
    setNewChannel({ platformName: '', platformColor: '#6366f1', platformEmoji: '🌐', url: '', followerCount: 0, displayOnProfile: true });
    setShowAddChannel(false);
  };

  const removeCustomChannel = (id: string) => {
    setCustomChannels(prev => prev.filter(c => c.id !== id));
  };

  const updateCustomChannel = (id: string, field: keyof CustomChannel, value: any) => {
    setCustomChannels(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const onSubmit = async (data: ProfileFormData) => {
    const skillsArray = data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const profileImageUrl = profileImage ? previewUrl : (user as any)?.profileImageUrl;
    try {
      await updateProfileMutation.mutateAsync({ ...data, skills: skillsArray, profileImageUrl, directSupportEnabled });
      await Promise.all([
        saveLinksMutation.mutateAsync(),
        saveRatesMutation.mutateAsync(),
        apiRequest('PATCH', `/api/users/${(user as any)?.id}/message-privacy`, { messagePrivacy }),
      ]);
      const userId = (user as any)?.id;
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/social-links`] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/creators/${userId}/profile`] });
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/points/me'] });
      toast({ title: "Profile saved! 🎉", description: "Your profile has been updated successfully." });
    } catch (error: any) {
      let description = "Failed to save profile. Please try again.";
      try {
        const errText = error?.message || '';
        const jsonStart = errText.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(errText.slice(jsonStart));
          if (parsed?.message) description = parsed.message;
        }
      } catch {}
      toast({ title: "Save failed", description, variant: "destructive" });
    }
  };

  const displayName = `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() || 'User';
  const initials = `${(user as any)?.firstName?.[0] || ''}${(user as any)?.lastName?.[0] || ''}` || 'U';
  const tier = getTierFromFollowers(totalFollowersPreview);
  const previewTierConfig = getTierConfig(tier);
  const isPending = updateProfileMutation.isPending || saveLinksMutation.isPending || saveRatesMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Edit Profile</h1>
          <p className="text-gray-500 mt-1">Update your profile, social channels, and content rates</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Image */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle className="text-lg">Profile Photo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20 border-2 border-gray-200">
                  <AvatarImage src={previewUrl} alt={displayName} />
                  <AvatarFallback className="text-xl bg-purple-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="profileImage" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium">
                      <Camera className="h-4 w-4" /> Change Photo
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
                      <div className="text-xs text-gray-500 font-medium">Your Influencer Tier</div>
                      <div className={`font-bold ${previewTierConfig.text} text-lg`}>{previewTierConfig.icon} {previewTierConfig.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total Followers</div>
                    <div className="text-2xl font-black text-black">{formatFollowers(totalFollowersPreview)}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Tier auto-calculated from all connected platform followers. Updates on save.</p>
              </CardContent>
            </Card>
          )}

          {/* Basic Info */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" {...register('firstName')} placeholder="First name" className="mt-1" data-testid="input-firstName" />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" {...register('lastName')} placeholder="Last name" className="mt-1" data-testid="input-lastName" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" {...register('username')} placeholder="@your_username" className="mt-1" data-testid="input-username" />
                  <p className="text-xs text-gray-400 mt-1">Unique public profile URL</p>
                </div>
                <div>
                  <Label htmlFor="niche">Niche / Category</Label>
                  <select {...register('niche')} className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" data-testid="select-niche">
                    <option value="">Select a niche...</option>
                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" {...register('bio')} placeholder="Tell others about yourself..." rows={3} className="mt-1" data-testid="input-bio" />
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

          {/* Built-in Social Media */}
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-600" /> Social Media Links
              </CardTitle>
              <CardDescription>Enter full profile URLs. Follower counts are used to calculate your influencer tier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {BUILT_IN_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <div key={platform.handle} className={`border rounded-xl p-4 ${platform.color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-7 h-7 rounded-lg ${platform.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-sm text-gray-800">{platform.label}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Profile URL</Label>
                        <Input {...register(platform.handle)} placeholder={platform.placeholder} className="mt-1 bg-white text-sm" data-testid={`input-${platform.handle}`} />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Followers</Label>
                        <Input type="number" min="0" {...register(platform.followers, { valueAsNumber: true })} placeholder="0" className="mt-1 bg-white text-sm" data-testid={`input-${platform.followers}`} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* LinkedIn */}
              <div className="border rounded-xl p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center">
                    <SiLinkedin className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm text-gray-800">LinkedIn</span>
                </div>
                <Input {...register('linkedinHandle')} placeholder="https://linkedin.com/in/yourprofile" className="bg-white text-sm" data-testid="input-linkedinHandle" />
              </div>

              {/* Admin-defined Additional Platforms */}
              {adminPlatforms.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Additional Platforms</p>
                  <div className="space-y-3">
                    {adminPlatforms.map((platform: any) => (
                      <div key={platform.slug} className="border rounded-xl p-4 bg-gray-50 border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: platform.bgColor || '#6366f1' }}>
                            {platform.name[0]}
                          </div>
                          <span className="font-semibold text-sm text-gray-800">{platform.name}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-500">Profile Link</Label>
                            <Input
                              value={adminCustomLinks[platform.slug]?.url || ''}
                              onChange={(e) => setAdminCustomLinks(prev => ({ ...prev, [platform.slug]: { ...prev[platform.slug], url: e.target.value, followerCount: prev[platform.slug]?.followerCount || 0 } }))}
                              placeholder={platform.urlPrefix ? `${platform.urlPrefix}yourhandle` : 'https://...'}
                              className="mt-1 bg-white text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Followers</Label>
                            <Input
                              type="number" min="0"
                              value={adminCustomLinks[platform.slug]?.followerCount || 0}
                              onChange={(e) => setAdminCustomLinks(prev => ({ ...prev, [platform.slug]: { ...prev[platform.slug], url: prev[platform.slug]?.url || '', followerCount: parseInt(e.target.value) || 0 } }))}
                              className="mt-1 bg-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Channels (User-defined) */}
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" /> Custom Social Channels
              </CardTitle>
              <CardDescription>Add any social media platform not listed above — SoundCloud, Pinterest, Discord, Spotify, and more.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing custom channels */}
              {customChannels.map((ch) => (
                <div key={ch.id} className="border rounded-xl p-4 bg-indigo-50 border-indigo-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: ch.platformColor + '20', border: `1px solid ${ch.platformColor}40` }}>
                        {ch.platformEmoji}
                      </div>
                      <span className="font-semibold text-sm text-gray-800">{ch.platformName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateCustomChannel(ch.id, 'displayOnProfile', !ch.displayOnProfile)}
                        className="text-gray-400 hover:text-indigo-600 transition-colors" title={ch.displayOnProfile ? 'Hide from profile' : 'Show on profile'}>
                        {ch.displayOnProfile ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button type="button" onClick={() => removeCustomChannel(ch.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Profile URL</Label>
                      <Input
                        value={ch.url}
                        onChange={(e) => updateCustomChannel(ch.id, 'url', e.target.value)}
                        placeholder="https://..."
                        className="mt-1 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Followers</Label>
                      <Input
                        type="number" min="0"
                        value={ch.followerCount}
                        onChange={(e) => updateCustomChannel(ch.id, 'followerCount', parseInt(e.target.value) || 0)}
                        className="mt-1 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Popular platform quick-add */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Quick add popular platforms:</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_CUSTOM_PLATFORMS.map(p => (
                    <button key={p.name} type="button"
                      onClick={() => {
                        const exists = customChannels.find(c => c.platformName === p.name);
                        if (!exists) {
                          const slug = `custom_${p.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
                          setCustomChannels(prev => [...prev, { id: String(Date.now()), platformSlug: slug, platformName: p.name, platformColor: p.color, platformEmoji: p.emoji, url: '', followerCount: 0, displayOnProfile: true, isUserDefined: true }]);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all text-xs font-medium text-gray-700"
                    >
                      <span>{p.emoji}</span> {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add custom channel form */}
              {showAddChannel ? (
                <div className="border-2 border-dashed border-indigo-200 rounded-xl p-4 bg-indigo-50/50">
                  <p className="text-sm font-semibold text-gray-700 mb-3">New Custom Channel</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-gray-500">Platform Name *</Label>
                      <Input
                        value={newChannel.platformName}
                        onChange={e => setNewChannel(p => ({ ...p, platformName: e.target.value }))}
                        placeholder="e.g. SoundCloud"
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Emoji Icon</Label>
                      <Input
                        value={newChannel.platformEmoji}
                        onChange={e => setNewChannel(p => ({ ...p, platformEmoji: e.target.value }))}
                        placeholder="🎵"
                        className="mt-1 text-sm"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={newChannel.platformColor} onChange={e => setNewChannel(p => ({ ...p, platformColor: e.target.value }))} className="w-10 h-9 rounded cursor-pointer border border-gray-200" />
                        <Input value={newChannel.platformColor} onChange={e => setNewChannel(p => ({ ...p, platformColor: e.target.value }))} className="flex-1 text-xs" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Followers</Label>
                      <Input
                        type="number" min="0"
                        value={newChannel.followerCount}
                        onChange={e => setNewChannel(p => ({ ...p, followerCount: parseInt(e.target.value) || 0 }))}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs text-gray-500">Profile URL *</Label>
                    <Input
                      value={newChannel.url}
                      onChange={e => setNewChannel(p => ({ ...p, url: e.target.value }))}
                      placeholder="https://soundcloud.com/yourprofile"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={addCustomChannel} className="bg-indigo-600 hover:bg-indigo-700 text-white">Add Channel</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowAddChannel(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50" onClick={() => setShowAddChannel(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Custom Channel
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Content Rates */}
          <Card className="border-gray-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" /> Content Rates
                  </CardTitle>
                  <CardDescription>Set your rates for brands. These will be displayed on your public profile.</CardDescription>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowRates(!showRates)} className="text-gray-500">
                  {showRates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showRates ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </CardHeader>
            {showRates && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RATE_TYPES.map(rt => (
                    <div key={rt.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">{rt.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-xs font-semibold text-gray-600 block mb-1 truncate">{rt.label}</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
                          <Input
                            type="number" min="0" step="0.01"
                            value={rates[rt.key] || ''}
                            onChange={e => setRates(prev => ({ ...prev, [rt.key]: e.target.value }))}
                            placeholder="0.00"
                            className="pl-6 bg-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Leave blank if you prefer to quote on request. All rates are in USD.</p>
              </CardContent>
            )}
          </Card>

          {/* Privacy & Messaging */}
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" /> Privacy &amp; Messaging
              </CardTitle>
              <CardDescription>Control who can send you direct messages on Taskdrip.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {([
                  { value: 'everyone', label: 'Everyone', desc: 'Anyone on Taskdrip can send you a message.', emoji: '🌍' },
                  { value: 'followers', label: 'People I follow', desc: 'Only people you follow can send you direct messages.', emoji: '👥' },
                  { value: 'nobody', label: 'No one', desc: 'Turn off direct messages completely.', emoji: '🔒' },
                ] as const).map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${messagePrivacy === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-gray-300'}`} data-testid={`radio-message-privacy-${opt.value}`}>
                    <input type="radio" name="messagePrivacy" value={opt.value} checked={messagePrivacy === opt.value} onChange={() => setMessagePrivacy(opt.value)} className="mt-1 accent-purple-600 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-sm text-gray-900">{opt.emoji} {opt.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-between pt-2">
            <Link href="/dashboard">
              <Button variant="outline" type="button" className="rounded-xl">Cancel</Button>
            </Link>
            <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700 px-8 rounded-xl" disabled={isPending} data-testid="button-save-profile">
              {isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
