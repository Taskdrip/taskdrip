import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { Campaign } from "@shared/schema";

interface CampaignCardProps {
  campaign: Campaign;
  onJoin: (campaignId: string) => void;
  onClick?: (campaignId: string) => void;
}

export function CampaignCard({ campaign, onJoin, onClick }: CampaignCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'social media':
        return 'bg-blue-100 text-blue-800';
      case 'content creation':
        return 'bg-pink-100 text-pink-800';
      case 'gaming':
        return 'bg-purple-100 text-purple-800';
      case 'health & fitness':
        return 'bg-green-100 text-green-800';
      case 'cryptocurrency':
        return 'bg-yellow-100 text-yellow-800';
      case 'education':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBrandColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'social media':
        return 'from-blue-500 to-blue-600';
      case 'content creation':
        return 'from-orange-500 to-pink-500';
      case 'gaming':
        return 'from-purple-500 to-indigo-600';
      case 'health & fitness':
        return 'from-green-500 to-emerald-600';
      case 'cryptocurrency':
        return 'from-yellow-500 to-orange-500';
      case 'education':
        return 'from-cyan-500 to-blue-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const progressPercentage = campaign.totalSlots > 0 ? ((campaign.filledSlots || 0) / campaign.totalSlots) * 100 : 0;
  const daysLeft = campaign.deadline ? Math.ceil((new Date(campaign.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => onClick?.(campaign.id)}
    >
      {/* Brand header */}
      <div className={`h-48 bg-gradient-to-br ${getBrandColor(campaign.category)} flex items-center justify-center`}>
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-700">
            {campaign.brandName[0]}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getCategoryColor(campaign.category)}`}>
            {campaign.category}
          </Badge>
          {daysLeft && (
            <span className="text-sm text-gray-600">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-semibold text-black mb-2">{campaign.title}</h3>
        <p className="text-gray-600 mb-4 text-sm line-clamp-3">{campaign.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-success">
            <span className="text-2xl font-bold">${campaign.reward}</span>
            <span className="text-sm text-gray-600">per task</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {campaign.filledSlots || 0}/{campaign.totalSlots} spots
            </div>
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-accent h-2 rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{campaign.estimatedTime || '5 min'} task</span>
          </div>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onJoin(campaign.id);
            }}
            className="bg-accent text-white hover:bg-blue-700"
            disabled={(campaign.filledSlots || 0) >= campaign.totalSlots}
          >
            {(campaign.filledSlots || 0) >= campaign.totalSlots ? 'Full' : 'Join Campaign'}
          </Button>
        </div>
      </div>
    </div>
  );
}
