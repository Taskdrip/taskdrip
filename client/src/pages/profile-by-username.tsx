import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { NavigationFixed } from '@/components/ui/navigation-fixed';
import { Button } from '@/components/ui/button';

/**
 * Resolves a username from the URL (`/p/:username` or `/u/:username`) to a real
 * user, then forwards to the canonical brand or influencer profile route by id.
 *
 * Keeps shareable URLs human-readable while letting the existing id-based
 * profile pages do the heavy lifting (no rendering duplication).
 */
export default function ProfileByUsername() {
  const { username } = useParams<{ username: string }>();
  const [, navigate] = useLocation();

  const { data: user, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/users/by-username', username],
    queryFn: async () => {
      const res = await fetch(`/api/users/by-username/${encodeURIComponent(username || '')}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!username,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user) return;
    if (user.userType === 'brand') {
      navigate(`/brand/${user.id}`, { replace: true });
    } else if (user.userType === 'admin') {
      navigate(`/profile/${user.id}`, { replace: true });
    } else {
      navigate(`/influencers/${user.id}`, { replace: true });
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-200 border-t-purple-600" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-500 mb-4">No account exists for <strong>@{username}</strong>.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return null;
}
