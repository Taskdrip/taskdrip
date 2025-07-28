import { Navigation } from "@/components/ui/navigation";
import { Hero } from "@/components/ui/hero";
import { useQuery } from "@tanstack/react-query";
import { CampaignCard } from "@/components/ui/campaign-card";
import { TaskModal } from "@/components/ui/task-modal";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Campaign } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const handleJoinCampaign = (campaignId: string) => {
    const campaign = campaigns.find((c: Campaign) => c.id === campaignId);
    if (campaign) {
      setSelectedCampaign(campaign);
      setIsTaskModalOpen(true);
    }
  };

  const handleTaskSubmit = async (formData: FormData) => {
    if (!selectedCampaign) return;

    try {
      await apiRequest('POST', `/api/campaigns/${selectedCampaign.id}/submit`, formData);
      toast({
        title: "Task Submitted",
        description: "Your task has been submitted for review. You'll be notified once it's approved.",
      });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
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
      toast({
        title: "Error",
        description: "Failed to submit task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      
      {/* Trending Campaigns Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Trending Campaigns</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover high-paying campaigns from top brands. Join tasks that match your skills and start earning crypto rewards.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <button className="bg-accent text-white px-6 py-2 rounded-full font-medium">All Campaigns</button>
            <button className="bg-white text-gray-600 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors duration-200">Social Media</button>
            <button className="bg-white text-gray-600 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors duration-200">Content Creation</button>
            <button className="bg-white text-gray-600 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors duration-200">Gaming</button>
          </div>

          {/* Campaign Grid */}
          {isLoading ? (
            <div className="text-center">
              <p className="text-gray-600">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-600">No campaigns available at the moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.slice(0, 6).map((campaign: Campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onJoin={handleJoinCampaign}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        campaign={selectedCampaign}
        onSubmit={handleTaskSubmit}
      />
    </div>
  );
}
