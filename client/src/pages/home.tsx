import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Users, Coins, Target, ExternalLink, Smartphone, Calendar, MapPin, Briefcase, Package, Zap, ArrowRight, Link2 } from "lucide-react";
import { Link } from "wouter";

const TYPE_GRADIENTS: Record<string, string> = {
  crypto: "from-orange-900/60 to-yellow-900/40",
  product: "from-blue-900/60 to-cyan-900/40",
  service: "from-purple-900/60 to-pink-900/40",
};
const TYPE_BADGE: Record<string, string> = {
  crypto: "bg-orange-100 text-orange-800",
  product: "bg-blue-100 text-blue-800",
  service: "bg-purple-100 text-purple-800",
};

function money(v: any) {
  return Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Home() {
  const { user } = useAuth();

  if ((user as any)?.userType === 'brand') {
    window.location.href = '/brand-dashboard';
    return null;
  }

  const { data: campaigns = [] } = useQuery({ queryKey: ["/api/campaigns"] });
  const { data: featuredListings = [] } = useQuery<any[]>({ queryKey: ["/api/p2p/listings/featured"] });

  const activeCampaigns = Array.isArray(campaigns) ? campaigns.filter((c: any) => c.filledSlots < c.totalSlots) : [];
  const stats = {
    totalEarnings: (user as any)?.totalEarned || 1250.75,
    availableBalance: (user as any)?.availableBalance || 325.50,
    activeCampaigns: activeCampaigns.length,
    completedTasks: (user as any)?.completedCampaigns || 47,
  };

  const featuredCampaigns = activeCampaigns.slice(0, 3);
  const taskCategories = [
    { name: "App Testing", count: 15, icon: Smartphone, color: "bg-blue-500" },
    { name: "Trading", count: 8, icon: TrendingUp, color: "bg-green-500" },
    { name: "Content Creation", count: 12, icon: Users, color: "bg-purple-500" },
    { name: "Event Hosting", count: 5, icon: Calendar, color: "bg-orange-500" },
    { name: "Local Errands", count: 9, icon: MapPin, color: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {(user as any)?.firstName || 'Influencer'}!</h1>
          <p className="text-gray-600">Ready to start earning? Here are today's opportunities.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Coins className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${parseFloat(stats.availableBalance || '0').toFixed(2)}</div>
              <p className="text-xs opacity-90">Ready for withdrawal</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${parseFloat(stats.totalEarnings || '0').toFixed(2)}</div>
              <p className="text-xs text-green-600">+12% this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Tasks</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
              <p className="text-xs text-muted-foreground">Ready to start</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks finished</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Browse by Category</CardTitle>
              <CardDescription>Find tasks that match your skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {taskCategories.map((category) => (
                <Link key={category.name} href="/campaigns">
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className={`${category.color} p-2 rounded-lg`}>
                      <category.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-gray-500">{category.count} available</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Featured Campaigns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Featured Opportunities</CardTitle>
                  <CardDescription>High-paying tasks available now</CardDescription>
                </div>
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {featuredCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.title}</h3>
                      <p className="text-sm text-gray-600">{campaign.brandName}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">${campaign.reward}</Badge>
                  </div>
                  <p className="text-gray-700 mb-3 line-clamp-2">{campaign.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" />{campaign.estimatedTime}</span>
                      <span className="flex items-center"><Users className="h-3 w-3 mr-1" />{campaign.totalSlots - campaign.filledSlots} spots</span>
                      <Badge variant="outline">{campaign.category}</Badge>
                    </div>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button size="sm" className="bg-black text-white hover:bg-gray-800">Apply Now</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Featured P2P Deals ── */}
        {Array.isArray(featuredListings) && featuredListings.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-violet-600" /> Featured P2P Deals
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">Hand-picked crypto trades, products &amp; services — protected by admin escrow</p>
              </div>
              <Link href="/p2p-hub">
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-view-all-p2p">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredListings.map((listing: any) => {
                const TypeIcon = listing.listingType === "crypto" ? Coins : listing.listingType === "product" ? Package : Briefcase;
                return (
                  <Link key={listing.id} href={`/p2p/${listing.id}`}>
                    <div className="group rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" data-testid={`card-featured-p2p-${listing.id}`}>
                      {/* Image */}
                      <div className="relative h-40 overflow-hidden bg-gray-100">
                        {listing.featuredImage ? (
                          <img src={listing.featuredImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className={`h-full bg-gradient-to-br ${TYPE_GRADIENTS[listing.listingType] || "from-gray-800 to-gray-900"} flex items-center justify-center`}>
                            <TypeIcon className="w-14 h-14 text-white/20" />
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <Badge className={`text-xs font-bold uppercase tracking-wide ${TYPE_BADGE[listing.listingType]}`}>{listing.listingType}</Badge>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <div className="bg-black/70 backdrop-blur-sm text-white text-sm font-black px-2.5 py-0.5 rounded-xl">${money(listing.price)}</div>
                        </div>
                        <div className="absolute bottom-2 left-2.5">
                          <Badge className="bg-yellow-400/90 text-yellow-900 text-xs font-bold">⭐ Featured</Badge>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-1 group-hover:text-violet-700 transition-colors">{listing.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{listing.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              {(listing.seller?.username || listing.seller?.firstName || "S")[0].toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-600 font-medium">
                              {listing.seller?.username || listing.seller?.firstName || "Seller"}
                            </span>
                          </div>
                          <span className="text-xs text-violet-600 font-semibold group-hover:underline">View Deal →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Find Tasks</h3>
              <p className="text-sm opacity-90 mb-4">Browse available campaigns and start earning</p>
              <Link href="/campaigns"><Button variant="secondary" size="sm">Browse Tasks</Button></Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
            <CardContent className="p-6 text-center">
              <Coins className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">P2P Market</h3>
              <p className="text-sm opacity-90 mb-4">Trade crypto, products &amp; services securely</p>
              <Link href="/p2p-hub"><Button variant="secondary" size="sm">Open Market</Button></Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500 via-sky-500 to-violet-600 text-white border-0">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_45%)] pointer-events-none" />
            <CardContent className="p-6 text-center relative">
              <Link2 className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Short Links</h3>
              <p className="text-sm opacity-90 mb-4">Branded short URLs with real-time click analytics</p>
              <Link href="/short-links"><Button variant="secondary" size="sm" data-testid="button-home-short-links">Create a Link</Button></Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Earnings</h3>
              <p className="text-sm opacity-90 mb-4">View detailed earnings and request payouts</p>
              <Link href="/dashboard"><Button variant="secondary" size="sm">View Dashboard</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
