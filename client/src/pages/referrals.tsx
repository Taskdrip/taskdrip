import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Users, Trophy, Gift, ChevronRight, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

interface ReferralData {
  referralCodeCreator: string | null;
  referralCodeBrand: string | null;
  totalReferrals: number;
  referrals: Array<{
    id: number;
    referredId: string;
    status: string;
    createdAt: string;
    referred?: {
      firstName: string;
      lastName: string;
      profileImageUrl: string;
      userType: string;
    };
  }>;
}

export default function ReferralsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: referralData, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referrals/my"],
    enabled: !!isAuthenticated,
  });

  const { data: leaderboard = [] } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/referrals"],
  });

  const baseUrl = window.location.origin;

  const creatorLink = referralData?.referralCodeCreator
    ? `${baseUrl}/signup?ref=${referralData.referralCodeCreator}&type=creator`
    : null;

  const brandLink = referralData?.referralCodeBrand
    ? `${baseUrl}/signup?ref=${referralData.referralCodeBrand}&type=brand`
    : null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copied!`, description: "Share it to earn referral rewards." });
    });
  };

  const shareLink = (url: string, label: string) => {
    if (navigator.share) {
      navigator.share({ title: "Join Taskdrip", text: `Join me on Taskdrip as a ${label}!`, url });
    } else {
      copyToClipboard(url, "Referral link");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationFixed />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to access your referrals</h2>
          <Link href="/login">
            <Button>Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Referral Program</h1>
          <p className="text-gray-500 mt-1">Invite friends and earn rewards for every person who joins.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-black rounded-lg p-2">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Referred</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="text-total-referrals">
                      {referralData?.totalReferrals ?? 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-lg p-2">
                  <Gift className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Referrals</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="text-active-referrals">
                      {referralData?.referrals?.filter(r => r.status === "active").length ?? 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 rounded-lg p-2">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Leaderboard Rank</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="text-leaderboard-rank">
                      {(() => {
                        const rank = (leaderboard as any[]).findIndex(
                          (u: any) => u.id === (user as any)?.id
                        );
                        return rank >= 0 ? `#${rank + 1}` : "—";
                      })()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: referral links + referred list */}
          <div className="lg:col-span-2 space-y-6">
            {/* Referral links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Your Referral Links
                </CardTitle>
                <CardDescription>Share these links to invite new members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Creator link */}
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Invite Creators</span>
                    <Badge variant="secondary">Creator</Badge>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : creatorLink ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-600 truncate" data-testid="text-creator-referral-link">
                        {creatorLink}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(creatorLink, "Creator referral link")}
                        data-testid="button-copy-creator-link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="bg-black hover:bg-gray-800 text-white"
                        onClick={() => shareLink(creatorLink, "Creator")}
                        data-testid="button-share-creator-link"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No creator referral code assigned</p>
                  )}
                  {referralData?.referralCodeCreator && (
                    <p className="text-xs text-gray-400 mt-2">
                      Code: <span className="font-mono font-medium">{referralData.referralCodeCreator}</span>
                    </p>
                  )}
                </div>

                {/* Brand link */}
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Invite Brands</span>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Brand</Badge>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : brandLink ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-600 truncate" data-testid="text-brand-referral-link">
                        {brandLink}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(brandLink, "Brand referral link")}
                        data-testid="button-copy-brand-link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => shareLink(brandLink, "Brand")}
                        data-testid="button-share-brand-link"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No brand referral code assigned</p>
                  )}
                  {referralData?.referralCodeBrand && (
                    <p className="text-xs text-gray-400 mt-2">
                      Code: <span className="font-mono font-medium">{referralData.referralCodeBrand}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* People you've referred */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  People You've Referred
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !referralData?.referrals?.length ? (
                  <div className="text-center py-10">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No referrals yet</p>
                    <p className="text-gray-400 text-xs mt-1">Share your referral link to get started</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {referralData.referrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between py-3"
                        data-testid={`row-referral-${ref.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={ref.referred?.profileImageUrl} />
                            <AvatarFallback className="bg-gray-100 text-gray-600">
                              {ref.referred?.firstName?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {ref.referred
                                ? `${ref.referred.firstName} ${ref.referred.lastName}`
                                : "Unknown user"}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {ref.referred?.userType || "user"}
                              {" · "}
                              {new Date(ref.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={ref.status === "active" ? "default" : "secondary"}
                          className={ref.status === "active" ? "bg-green-500 hover:bg-green-500" : ""}
                          data-testid={`status-referral-${ref.id}`}
                        >
                          {ref.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: leaderboard + how it works */}
          <div className="space-y-6">
            {/* How it works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-gray-600">Share your unique referral link with friends or on social media.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-gray-600">They sign up using your link and become active members.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <p className="text-gray-600">Earn rewards and climb the referral leaderboard every month!</p>
                </div>
              </CardContent>
            </Card>

            {/* Top referrers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Top Referrers
                  </span>
                  <Link href="/leaderboard">
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500 hover:text-black">
                      Full board <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!leaderboard.length ? (
                  <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {(leaderboard as any[]).slice(0, 5).map((entry: any, idx: number) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2"
                        data-testid={`row-top-referrer-${idx}`}
                      >
                        <span className={`w-5 text-xs font-bold text-center ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : "text-gray-400"}`}>
                          #{idx + 1}
                        </span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={entry.profileImageUrl} />
                          <AvatarFallback className="text-xs">{entry.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm truncate">
                          {entry.firstName} {entry.lastName}
                        </span>
                        <span className="text-xs font-semibold text-gray-600">{entry.totalReferrals ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
