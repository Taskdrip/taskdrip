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
import {
  Copy, Share2, Users, Trophy, Gift, ChevronRight, Link as LinkIcon,
  TrendingUp, MessageCircle, DollarSign, Activity, CheckCircle, Clock, ExternalLink
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getTierConfig, getTierFromFollowers, formatFollowers } from "@/lib/tiers";
import { formatDistanceToNow } from "date-fns";

interface ReferredUser {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  profileImageUrl?: string;
  userType: string;
  companyName?: string;
  totalFollowers?: number;
  creatorTier?: string;
  subscriptionStatus?: string;
  completedCampaigns?: number;
  totalEarned?: string;
  createdAt?: string;
}

interface EnrichedReferral {
  id: string;
  referredId: string;
  status: string;
  createdAt: string;
  referralType: string;
  referralCode: string;
  referredUser: ReferredUser | null;
  isFollowingReferred: boolean;
}

interface ReferralData {
  referralCodeCreator: string | null;
  referralCodeBrand: string | null;
  totalReferrals: number;
  referralBonusEarned: string;
  referrals: EnrichedReferral[];
}

function getDisplayName(u: ReferredUser | null) {
  if (!u) return 'Unknown User';
  if (u.userType === 'brand' && u.companyName) return u.companyName;
  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Unknown User';
}

function ReferredUserCard({ ref: referral }: { ref: EnrichedReferral }) {
  const [, navigate] = useLocation();
  const u = referral.referredUser;
  const displayName = getDisplayName(u);
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const tier = u?.userType !== 'brand' ? getTierConfig(getTierFromFollowers(u?.totalFollowers || 0)) : null;
  const isPremium = u?.subscriptionStatus === 'active';
  const joinedAgo = formatDistanceToNow(new Date(referral.createdAt), { addSuffix: true });

  return (
    <div className="flex items-start gap-3 py-4 border-b last:border-0" data-testid={`row-referral-${referral.id}`}>
      {/* Avatar + link to profile */}
      <Link href={u ? `/influencer/${u.id}` : '#'}>
        <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-offset-1 ring-purple-100 hover:ring-purple-400 transition-all">
          <AvatarImage src={u?.profileImageUrl || ''} />
          <AvatarFallback className="bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 font-bold text-sm">{initials}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={u ? `/influencer/${u.id}` : '#'}>
            <span className="font-semibold text-sm text-gray-900 hover:text-purple-700 cursor-pointer transition-colors">{displayName}</span>
          </Link>
          {tier && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tier.badge}`}>{tier.icon} {tier.name}</span>
          )}
          {isPremium && (
            <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100 py-0 px-1.5">Premium ⭐</Badge>
          )}
          <Badge variant={referral.status === "converted" ? "default" : "secondary"}
            className={`text-[10px] py-0 px-1.5 ${referral.status === "converted" ? "bg-green-500 hover:bg-green-500" : ""}`}
            data-testid={`status-referral-${referral.id}`}>
            {referral.status === 'converted' ? <><CheckCircle className="w-2.5 h-2.5 mr-0.5 inline" />Converted</> : <><Clock className="w-2.5 h-2.5 mr-0.5 inline" />Pending</>}
          </Badge>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Joined {joinedAgo}</span>
          {u?.userType !== 'brand' && (u?.totalFollowers || 0) > 0 && (
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {formatFollowers(u!.totalFollowers || 0)} followers</span>
          )}
          {(u?.completedCampaigns || 0) > 0 && (
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {u!.completedCampaigns} campaigns</span>
          )}
          {parseFloat(u?.totalEarned || '0') > 0 && (
            <span className="flex items-center gap-1 text-green-600 font-medium"><DollarSign className="w-3 h-3" /> ${parseFloat(u!.totalEarned!).toFixed(0)} earned</span>
          )}
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${referral.referralType === 'influencer' ? 'bg-purple-500' : 'bg-blue-500'}`} />
            {referral.referralType === 'influencer' ? 'Influencer' : 'Brand'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Link href={u ? `/influencer/${u.id}` : '#'}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-purple-600" title="View Profile">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <Link href={u ? `/chat?to=${u.id}` : '#'}>
          <Button size="sm" className="h-7 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg gap-1" title="Message">
            <MessageCircle className="w-3 h-3" /> Chat
          </Button>
        </Link>
      </div>
    </div>
  );
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
  const creatorLink = referralData?.referralCodeCreator ? `${baseUrl}/signup?ref=${referralData.referralCodeCreator}&type=creator` : null;
  const brandLink = referralData?.referralCodeBrand ? `${baseUrl}/signup?ref=${referralData.referralCodeBrand}&type=brand` : null;

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
  const bonusEarned = parseFloat(referralData?.referralBonusEarned || '0');
  const convertedCount = referralData?.referrals?.filter(r => r.status === 'converted').length || 0;

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
            Invite influencers and brands to Taskdrip. Earn <strong className="text-yellow-400">$5</strong> when they upgrade to Premium, and a bonus <strong className="text-yellow-400">$10</strong> when they earn or spend over $100.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-black rounded-lg p-2"><Users className="h-4 w-4 text-white" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total Referred</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                    <p className="text-2xl font-bold" data-testid="text-total-referrals">{referralData?.totalReferrals ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-lg p-2"><CheckCircle className="h-4 w-4 text-white" /></div>
                <div>
                  <p className="text-xs text-gray-500">Converted</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                    <p className="text-2xl font-bold" data-testid="text-successful-referrals">{convertedCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 rounded-lg p-2"><DollarSign className="h-4 w-4 text-white" /></div>
                <div>
                  <p className="text-xs text-gray-500">Bonus Earned</p>
                  {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : (
                    <p className="text-2xl font-bold text-green-600" data-testid="text-referral-bonus">${bonusEarned.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 rounded-lg p-2"><Trophy className="h-4 w-4 text-white" /></div>
                <div>
                  <p className="text-xs text-gray-500">Leaderboard</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                    <p className="text-2xl font-bold" data-testid="text-leaderboard-rank">{myRank >= 0 ? `#${myRank + 1}` : "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bonus info bar */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Gift className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">How referral bonuses work</p>
            <p className="text-xs text-amber-700 mt-0.5">Earn <strong>$5</strong> when someone you refer upgrades to a Premium plan. Earn an extra <strong>$10</strong> when they earn or spend more than $100 on the platform. Bonuses are added directly to your available balance.</p>
          </div>
          <Activity className="h-5 w-5 text-amber-500 flex-shrink-0 hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: links + referred list */}
          <div className="lg:col-span-2 space-y-6">

            {/* Referral links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Your Referral Links</CardTitle>
                <CardDescription>Share these links — one for influencers/influencers, one for brands</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Influencer link */}
                <div className="rounded-xl border-2 border-gray-200 p-4 bg-gradient-to-r from-purple-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-gray-800">🎭 Invite Influencers / Influencers</span>
                      <p className="text-xs text-gray-500 mt-0.5">Share with content influencers, influencers, and social media personalities</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Influencer</Badge>
                  </div>
                  {isLoading || ensureCodesMutation.isPending ? (
                    <Skeleton className="h-12 w-full" />
                  ) : creatorLink ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 truncate font-mono" data-testid="text-influencer-referral-link">{creatorLink}</div>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(creatorLink, "Influencer link")} data-testid="button-copy-influencer-link"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => shareLink(creatorLink, "Influencer")} data-testid="button-share-influencer-link"><Share2 className="h-4 w-4" /></Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Code: <span className="font-mono font-semibold text-gray-600">{referralData?.referralCodeCreator}</span></p>
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
                        <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 truncate font-mono" data-testid="text-brand-referral-link">{brandLink}</div>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(brandLink, "Brand link")} data-testid="button-copy-brand-link"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => shareLink(brandLink, "Brand")} data-testid="button-share-brand-link"><Share2 className="h-4 w-4" /></Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Code: <span className="font-mono font-semibold text-gray-600">{referralData?.referralCodeBrand}</span></p>
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
                <CardDescription>Click their name or avatar to view their profile, or chat with them directly</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1"><Skeleton className="h-4 w-36 mb-1.5" /><Skeleton className="h-3 w-24" /></div>
                        <Skeleton className="h-7 w-16" />
                      </div>
                    ))}
                  </div>
                ) : !referralData?.referrals?.length ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No referrals yet</p>
                    <p className="text-gray-400 text-xs mt-1">Share your links above to start growing your referral network!</p>
                  </div>
                ) : (
                  <div>
                    {referralData.referrals.map((ref) => (
                      <ReferredUserCard key={ref.id} ref={ref} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: how it works + leaderboard */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">How Rewards Work</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  { n: 1, text: "Copy your referral link (influencer or brand).", icon: <LinkIcon className="w-3.5 h-3.5" /> },
                  { n: 2, text: "Share it on social media, WhatsApp, or directly.", icon: <Share2 className="w-3.5 h-3.5" /> },
                  { n: 3, text: "When they sign up using your link, they appear in your referrals list.", icon: <Users className="w-3.5 h-3.5" /> },
                  { n: 4, text: "Earn $5 when they upgrade to Premium.", icon: <DollarSign className="w-3.5 h-3.5 text-green-600" /> },
                  { n: 5, text: "Earn $10 more when they earn or spend $100+.", icon: <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> },
                ].map(({ n, text, icon }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{n}</div>
                    <div className="flex items-start gap-1.5 text-gray-600">
                      <span className="mt-0.5 flex-shrink-0 text-gray-400">{icon}</span>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> Top Referrers</span>
                  <Link href="/leaderboard">
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-gray-500 hover:text-black">Full board <ChevronRight className="h-3 w-3 ml-1" /></Button>
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
                        <span className={`w-5 text-xs font-bold text-center ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : "text-gray-400"}`}>#{idx + 1}</span>
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
