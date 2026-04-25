import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from 'wouter';
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { CampaignCard } from "@/components/ui/campaign-card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Sparkles, TrendingUp, Coins, Layers, ArrowRight } from "lucide-react";
import { AdSlot } from "@/components/ui/ad-slot";
import { AdPopupZone } from "@/components/ui/ad-popup";
import { Spotlight } from "@/components/Spotlight";
import campaignsHero from "@assets/campaigns_hero.png";

export default function Campaigns() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const handleJoinCampaign = (campaignId: string) => {
    setLocation(`/campaigns/${campaignId}`);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
      </div>
    );
  }

  const campaignList = (campaigns as any[]) || [];
  const activeCampaigns = campaignList.filter((c: any) => c.isActive) || [];

  const filteredCampaigns = activeCampaigns.filter((c: any) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.brandName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(campaignList.map((c: any) => c.category)));
  const totalRewards = activeCampaigns.reduce((sum: number, c: any) => sum + (parseFloat(c.reward) || 0), 0);
  const totalSpots = activeCampaigns.reduce((sum: number, c: any) => sum + (c.totalSlots || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/40">
      <AdPopupZone page="campaigns" />
      <NavigationFixed />
      <AdSlot page="campaigns" placementType="banner_top" className="w-full" />

      {/* ─── Sleek Hero with background image + glassmorphism ─────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${campaignsHero})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-violet-950/75 to-slate-950/85" aria-hidden />
        {/* Animated mesh blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-3xl animate-pulse" aria-hidden />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} aria-hidden />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold text-white/90 mb-5" data-testid="badge-hero-tag">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {activeCampaigns.length} live campaigns • Updated in real time
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight leading-[1.05]">
              Earn <span className="bg-gradient-to-r from-fuchsia-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">crypto</span> for the social work you already do.
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mb-8">
              Browse vetted Web3 campaigns from real brands. Apply, complete the task, get paid in cash and $TDRIP — instantly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-white/90 shadow-lg shadow-black/30 font-bold"
                onClick={() => document.getElementById('campaign-grid')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-hero-browse"
              >
                Browse Campaigns
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur"
                onClick={() => document.getElementById('spotlight-section')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-hero-spotlight"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                See Spotlight
              </Button>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 max-w-3xl">
              <StatPill icon={<Layers className="w-4 h-4" />} label="Active" value={activeCampaigns.length.toString()} testid="stat-active" />
              <StatPill icon={<Coins className="w-4 h-4" />} label="Rewards" value={`$${totalRewards.toFixed(0)}`} testid="stat-rewards" />
              <StatPill icon={<TrendingUp className="w-4 h-4" />} label="Categories" value={categories.length.toString()} testid="stat-categories" />
              <StatPill icon={<Sparkles className="w-4 h-4" />} label="Open spots" value={totalSpots.toString()} testid="stat-spots" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Spotlight (curated, above the grid) ──────────────────────── */}
      <section id="spotlight-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 md:-mt-10 relative z-10">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl shadow-black/5 border border-violet-100 p-5 md:p-7">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Spotlight Opportunities</h2>
                <p className="text-xs text-slate-500">Hand-picked by Taskdrip — premium payouts, fast approvals.</p>
              </div>
            </div>
          </div>
          <Spotlight page="campaigns" title="" subtitle="" variant="row" />
        </div>
      </section>

      {/* ─── Search & Filter ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search campaigns, brands, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
                data-testid="input-search-campaigns"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 h-11" data-testid="select-category">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Campaign Grid ───────────────────────────────────────────── */}
      <div id="campaign-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-16">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">All Campaigns</h2>
            <p className="text-sm text-slate-500">{filteredCampaigns.length} matching your filters</p>
          </div>
        </div>
        {campaignsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign: any) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onJoin={handleJoinCampaign}
                showJoinButton={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="text-slate-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No campaigns found</h3>
            <p className="text-slate-600">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No active campaigns available at the moment'}
            </p>
          </div>
        )}
      </div>

      <AdSlot page="campaigns" placementType="banner_bottom" className="w-full" />
      <Footer />
    </div>
  );
}

function StatPill({ icon, label, value, testid }: { icon: React.ReactNode; label: string; value: string; testid: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 px-4 py-3" data-testid={testid}>
      <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">{label}</p>
        <p className="text-lg font-bold text-white leading-none mt-0.5">{value}</p>
      </div>
    </div>
  );
}
