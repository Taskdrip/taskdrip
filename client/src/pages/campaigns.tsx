import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from 'wouter';
import { Navigation } from "@/components/ui/navigation";
import { CampaignCard } from "@/components/ui/campaign-card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

export default function Campaigns() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Navigate to campaign detail page instead of auto-joining
  const handleJoinCampaign = (campaignId: string) => {
    setLocation(`/campaign/${campaignId}`);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
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

  if (campaignsLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
          </div>
        </div>
      </div>
    );
  }

  const campaignList = campaigns as any[] || [];
  const activeCampaigns = campaignList.filter((campaign: any) => campaign.isActive) || [];
  
  // Filter campaigns based on search and category
  const filteredCampaigns = activeCampaigns.filter((campaign: any) => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.brandName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || campaign.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(campaignList.map((campaign: any) => campaign.category)));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse Campaigns</h1>
          <p className="text-xl text-gray-600">
            Discover opportunities to earn cryptocurrency by completing social media tasks
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search campaigns, brands, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
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

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-accent mb-2">{activeCampaigns.length}</div>
            <div className="text-gray-600">Active Campaigns</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-green-600 mb-2">
              ${activeCampaigns.reduce((sum: number, campaign: any) => sum + (parseFloat(campaign.reward) || 0), 0).toFixed(2)}
            </div>
            <div className="text-gray-600">Total Rewards</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">{categories.length}</div>
            <div className="text-gray-600">Categories</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {activeCampaigns.reduce((sum: number, campaign: any) => sum + (campaign.totalSlots || 0), 0)}
            </div>
            <div className="text-gray-600">Total Spots</div>
          </div>
        </div>

        {/* Campaign Grid */}
        {filteredCampaigns.length > 0 ? (
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
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No active campaigns available at the moment'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}