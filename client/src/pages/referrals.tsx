import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, Share2, Users, Trophy, Gift, ChevronRight, Link as LinkIcon, Zap, TrendingUp } from "lucide-react";
import { Link } from "wouter";

interface ReferralData {
  referralCodeCreator: string | null;
  referralCodeBrand: string | null;
  totalReferrals: number;
  referrals: Array<{
    id: string;
    referredId: string;
    status: string;
    createdAt: string;
    referralType: string;
  }>;
}

export default function ReferralsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: referralData, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referrals/my"],
    enabled: !!isAuthenticated,
  });

  const { data: referralLeaders = [] } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/referrals"],
  });

  // Auto-generate referral codes for existing users who don't have them
  const ensureCodesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/referrals/ensure-codes").then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/referrals/my"] }),
  });

  useEffect(() => {
    if (isAuthenticated && referralData && (!referralData.referralCodeCreator || !referralData.referralCodeBrand)) {
      ensureCodesMutation.mutate();
    }
  }, [isAuthenticated, referralData]);

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
          <Link href="/login"><Button>Log In</Button></Link>
        </div>
      </div>
    );
  }

  const myRank = (referralLeaders as any[]).findIndex((u: any) => u.id === (user as any)?.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* Hero */}
      <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Share2 className="h-8 w-8 text-yellow-400" />
            <h1 className="text-3xl font-bold">Referral Program</h1>
          </div>
          <p className="text-gray-300 max-w-xl">
            Share your unique links, invite creators and brands, and earn rewards for every successful referral. Climb the monthly leaderboard!
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-black rounded-lg p-2"><Users className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-sm text-gray-500">Total Referred</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                    <p className="text-2xl font-bold" data-testid="text-total-referrals">{referralData?.totalReferrals ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-lg p-2"><Gift className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-sm text-gray-500">Successful Referrals</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                    <p className="text-2xl font-bold" data-testid="text-successful-referrals">
                      {referralData?.referrals?.length ?? 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 rounded-lg p-2"><Trophy className="h-5 w-5 text-white" /></div>
                <div>
                  <p className="text-sm text-gray-500">Leaderboard Rank</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                    <p className="text-2xl font-bold" data-testid="text-leaderboard-rank">
                      {myRank >= 0 ? `#${myRank + 1}` : "—"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: links + referred list */}
          <div className="lg:col-span-2 space-y-6">

            {/* Referral links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" /> Your Referral Links
                </CardTitle>
                <CardDescription>Share these two links — one to invite influencers/creators and one to invite brands</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Creator link */}
                <div className="rounded-xl border-2 border-gray-200 p-4 bg-gradient-to-r from-purple-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-gray-800">🎭 Invite Creators / Influencers</span>
                      <p className="text-xs text-gray-500 mt-0.5">Share with content creators, influencers, and social media personalities</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Creator</Badge>
                  </div>
                  {isLoading || ensureCodesMutation.isPending ? (
                    <Skeleton className="h-12 w-full" />
                  ) : creatorLink ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 truncate font-mono" data-testid="text-creator-referral-link">
                          {creatorLink}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(creatorLink, "Creator link")} data-testid="button-copy-creator-link">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => shareLink(creatorLink, "Creator")} data-testid="button-share-creator-link">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Code: <span className="font-mono font-semibold text-gray-600">{referralData?.referralCodeCreator}</span>
                      </p>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => ensureCodesMutation.mutate()}>Generate My Referral Links</Button>
                  )}
                </div>

                {/* Brand link */}
                <div className="rounded-xl border-2 border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-gray-800">🏢 Invite Brands</span>
                      <p className="text-xs text-gray-500 mt-0.5">Share with businesses and brands who want to run influencer campaigns</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Brand</Badge>
                  </div>
                  {isLoading || ensureCodesMutation.isPending ? (
                    <Skeleton className="h-12 w-full" />
                  ) : brandLink ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 truncate font-mono" data-testid="text-brand-referral-link">
                          {brandLink}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(brandLink, "Brand link")} data-testid="button-copy-brand-link">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => shareLink(brandLink, "Brand")} data-testid="button-share-brand-link">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Code: <span className="font-mono font-semibold text-gray-600">{referralData?.referralCodeBrand}</span>
                      </p>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => ensureCodesMutation.mutate()}>Generate My Referral Links</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* People referred */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> People You've Referred</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-20" /></div>
                      </div>
                    ))}
                  </div>
                ) : !referralData?.referrals?.length ? (
                  <div className="text-center py-10">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No referrals yet — share your links to get started!</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {referralData.referrals.map((ref) => (
                      <div key={ref.id} className="flex items-center justify-between py-3" data-testid={`row-referral-${ref.id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">?</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">Referred {ref.referralType}</p>
                            <p className="text-xs text-gray-400">{new Date(ref.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant={ref.status === "converted" ? "default" : "secondary"}
                          className={ref.status === "converted" ? "bg-green-500 hover:bg-green-500" : ""}
                          data-testid={`status-referral-${ref.id}`}>
                          {ref.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: how it works + top referrers */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">How It Works</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  { n: 1, text: "Copy your unique referral link (creator or brand link)." },
                  { n: 2, text: "Share it on social media, WhatsApp, Telegram, or directly." },
                  { n: 3, text: "When they sign up using your link, it's recorded automatically." },
                  { n: 4, text: "Earn rewards and climb the monthly leaderboard!" },
                ].map(({ n, text }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{n}</div>
                    <p className="text-gray-600">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> Top Referrers</span>
                  <Link href="/leaderboard">
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500 hover:text-black">
                      Full board <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!(referralLeaders as any[]).length ? (
                  <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {(referralLeaders as any[]).slice(0, 5).map((entry: any, idx: number) => (
                      <div key={entry.id} className="flex items-center gap-2" data-testid={`row-top-referrer-${idx}`}>
                        <span className={`w-5 text-xs font-bold text-center ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : "text-gray-400"}`}>
                          #{idx + 1}
                        </span>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={entry.profileImageUrl} />
                          <AvatarFallback className="text-xs">{entry.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm truncate">{entry.firstName} {entry.lastName}</span>
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
