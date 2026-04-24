import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Users, BarChart3, Globe, Coins, MessageCircle, Heart, Wallet } from "lucide-react";

function AdminProfileView({ admin }: { admin: any }) {
  const [, setLocation] = useLocation();
  const { data: posts = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${admin.id}/posts`],
    enabled: !!admin.id,
  });
  return (
    <div className="min-h-screen bg-slate-950">
      <NavigationFixed />

      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black">
        {admin.bannerImageUrl ? (
          <img src={admin.bannerImageUrl} alt="Admin banner" className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-900 to-black" />
        )}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(167,139,250,0.8) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        <button onClick={() => setLocation(-1 as any)}
          className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white bg-black/30 hover:bg-black/50 px-3 py-2 rounded-lg text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-16">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-4 border-slate-800 shadow-xl overflow-hidden">
                    {admin.profileImageUrl ? (
                      <img src={admin.profileImageUrl} alt="Admin" className="w-full h-full object-cover" />
                    ) : (
                      <ShieldCheck className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 bg-violet-600 rounded-full p-1.5 border-2 border-slate-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">{admin.firstName} {admin.lastName}</h1>
                  <Badge className="bg-violet-600/20 text-violet-400 border-violet-500/30">Platform Admin</Badge>
                </div>
                <p className="text-slate-400 text-sm mb-4">Taskdrip Platform Administrator</p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                    <span>Full platform access</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>Global oversight</span>
                  </div>
                  <div className="flex items-center gap-2 text-violet-300 text-sm font-semibold" data-testid="text-admin-tdrip-points">
                    <Coins className="w-4 h-4 text-violet-400" />
                    <span>{(admin.totalPoints || 0).toLocaleString()} $TDrip</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm" data-testid="status-admin-direct-support">
                    <Wallet className="w-4 h-4 text-slate-500" />
                    <span>Support {admin.directSupportEnabled ? 'On' : 'Off'}</span>
                  </div>
                </div>
                {admin.bio && <p className="text-slate-300 text-sm mt-4 leading-relaxed">{admin.bio}</p>}
              </div>
            </div>

            {/* Admin Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                <div className="text-slate-300 text-sm font-medium">Platform Security</div>
                <div className="text-xs text-slate-500 mt-0.5">Active monitoring</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="text-slate-300 text-sm font-medium">User Management</div>
                <div className="text-xs text-slate-500 mt-0.5">All user types</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <div className="text-slate-300 text-sm font-medium">Analytics</div>
                <div className="text-xs text-slate-500 mt-0.5">Full visibility</div>
              </div>
              <div className="text-center p-4 bg-violet-950/30 border border-violet-900/40 rounded-xl">
                <Coins className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                <div className="text-violet-200 text-sm font-medium">{(admin.totalPoints || 0).toLocaleString()}</div>
                <div className="text-xs text-violet-400/70 mt-0.5">$TDrip points</div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin notice */}
        <div className="bg-violet-950/30 border border-violet-800/30 rounded-2xl p-6 text-center">
          <ShieldCheck className="w-8 h-8 text-violet-400 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">Platform Administrator</h3>
          <p className="text-slate-400 text-sm">
            This account has administrative access to the Taskdrip platform. Use the Messages section to contact admin support.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-violet-400" /> Posts
            </h2>
            <span className="text-xs text-slate-500">{posts.length}</span>
          </div>
          <div className="p-6 space-y-3">
            {posts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No posts yet.</p>
            ) : (
              posts.slice(0, 5).map((post: any) => (
                <div key={post.id} className="bg-slate-800/70 border border-slate-700 rounded-xl p-4" data-testid={`card-admin-post-${post.id}`}>
                  <p className="text-slate-200 text-sm whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && <img src={post.imageUrl} alt="Post" className="mt-3 rounded-xl max-h-64 w-full object-cover" />}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.likeCount || 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.commentCount || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function UnifiedProfile() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: user, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/users/${id}/profile`],
    enabled: !!id,
    retry: false,
  });

  // Synchronously redirect non-admin profiles to their canonical pages so we
  // don't render a black intermediate screen while a useEffect waits for paint.
  useEffect(() => {
    if (!user) return;
    if (user.userType === 'brand') {
      navigate(`/brand/${id}`, { replace: true });
    } else if (user.userType !== 'admin') {
      // creators (and anything that isn't admin/brand) get the creator profile page
      navigate(`/influencers/${id}`, { replace: true });
    }
  }, [user?.userType, id, navigate]);

  // While we're loading or about to redirect, render a light placeholder (never black)
  if (isLoading || (user && user.userType !== 'admin')) {
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
          <p className="text-gray-500 mb-4">This profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (user.userType === 'admin') {
    return <AdminProfileView admin={user} />;
  }

  return null;
}
