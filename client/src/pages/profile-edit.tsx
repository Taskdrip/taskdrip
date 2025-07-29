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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/ui/navigation';
import { Upload, Camera, User, MapPin, Globe, Briefcase, Star } from 'lucide-react';
import { Link } from 'wouter';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  bio: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  skills: z.string().optional(),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  youtubeHandle: z.string().optional(),
  linkedinHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Set initial values from user data
  useEffect(() => {
    if (user) {
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
      setValue('bio', user.bio || '');
      setValue('location', user.location || '');
      setValue('phoneNumber', user.phoneNumber || '');
      setValue('website', user.website || '');
      setValue('skills', user.skills?.join(', ') || '');
      setValue('twitterHandle', user.twitterHandle || '');
      setValue('instagramHandle', user.instagramHandle || '');
      setValue('youtubeHandle', user.youtubeHandle || '');
      setValue('linkedinHandle', user.linkedinHandle || '');
      setValue('tiktokHandle', user.tiktokHandle || '');
      setPreviewUrl(user.profileImageUrl || '');
    }
  }, [user, setValue]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData & { profileImageUrl?: string }) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}/profile`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      let profileImageUrl = user?.profileImageUrl;
      
      // Handle image upload if new image selected
      if (profileImage) {
        // For now, we'll just show a placeholder URL
        // In production, you'd upload to a cloud service
        profileImageUrl = previewUrl;
      }

      // Convert skills string to array
      const skillsArray = data.skills ? data.skills.split(',').map(s => s.trim()).filter(s => s) : [];
      
      await updateProfileMutation.mutateAsync({
        ...data,
        skills: skillsArray,
        profileImageUrl,
      });
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <User className="h-8 w-8 mr-3" />
            Edit Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Update your profile information and social media handles
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Profile Image Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload a profile picture to help others recognize you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={previewUrl} alt={displayName} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="profileImage" className="cursor-pointer">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                      <Camera className="h-4 w-4" />
                      <span>Change Photo</span>
                    </div>
                  </Label>
                  <Input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  placeholder="Tell others about yourself..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    {...register('phoneNumber')}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://your-website.com"
                />
                {errors.website && (
                  <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="skills">Skills</Label>
                <Input
                  id="skills"
                  {...register('skills')}
                  placeholder="Content Creation, App Testing, Trading, etc. (comma separated)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Handles</CardTitle>
              <CardDescription>Connect your social media accounts to increase your earning potential</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="twitterHandle">Twitter</Label>
                  <Input
                    id="twitterHandle"
                    {...register('twitterHandle')}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="instagramHandle">Instagram</Label>
                  <Input
                    id="instagramHandle"
                    {...register('instagramHandle')}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="youtubeHandle">YouTube</Label>
                  <Input
                    id="youtubeHandle"
                    {...register('youtubeHandle')}
                    placeholder="@channel"
                  />
                </div>
                <div>
                  <Label htmlFor="tiktokHandle">TikTok</Label>
                  <Input
                    id="tiktokHandle"
                    {...register('tiktokHandle')}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedinHandle">LinkedIn</Label>
                  <Input
                    id="linkedinHandle"
                    {...register('linkedinHandle')}
                    placeholder="username"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Link href="/profile">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              className="bg-black text-white hover:bg-gray-800"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}