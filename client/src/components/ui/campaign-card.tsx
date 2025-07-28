import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, DollarSign, Users, MapPin, Calendar, Star } from "lucide-react";

interface CampaignCardProps {
  campaign: {
    id: string;
    title: string;
    description: string;
    category: string;
    reward: number;
    totalSlots: number;
    filledSlots?: number;
    difficulty: string;
    estimatedTime: string;
    isActive: boolean;
    deadline?: string;
    requirements?: string[];
    createdAt: string;
  };
  onJoin?: (campaignId: string) => void;
  showJoinButton?: boolean;
}

// Generate a consistent image based on campaign ID and category
function getCampaignImage(campaignId: string, category: string): string {
  const images = {
    'Social Media': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNjM2NkYxO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzM3MzFENDs7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjZ3JhZCkiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMDAiIHI9IjQwIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4yIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTAwIiByPSIyNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuNCIvPjx0ZXh0IHg9IjE1MCIgeT0iMTA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj7wn5ONPC90ZXh0Pjx0ZXh0IHg9IjE1MCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5Tb2NpYWwgTWVkaWE8L3RleHQ+PC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkMiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0VGNDQ0NDtzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNEQzI2MjY7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjZ3JhZDIpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTAwIiByPSI0MCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEwMCIgcj0iMjUiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz48dGV4dCB4PSIxNTAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+8J+TsTA8L3RleHQ+PHRleHQgeD0iMTUwIiB5PSIxNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPkluc3RhZ3JhbSBQb3N0PC90ZXh0Pjwvc3ZnPg=='
    ],
    'Gaming': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkMyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzA4OTFCMjtzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwNjc5ODU7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjZ3JhZDMpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTAwIiByPSI0MCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEwMCIgcj0iMjUiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz48dGV4dCB4PSIxNTAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+8J+PoTwvdGV4dD48dGV4dCB4PSIxNTAiIHk9IjE3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+R2FtaW5nPC90ZXh0Pjwvc3ZnPg=='
    ],
    'Health & Fitness': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkNCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzEwQjk4MTtzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwNTk2Njk7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjZ3JhZDQpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTAwIiByPSI0MCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEwMCIgcj0iMjUiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz48dGV4dCB4PSIxNTAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+8J+SqjwvdGV4dD48dGV4dCB4PSIxNTAiIHk9IjE3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+SGVhbHRoICZhbXA7IEZpdG5lc3M8L3RleHQ+PC9zdmc+'
    ],
    'Technology': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkNSIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzgzMzNCMztzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2QzI2Mzk7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjZ3JhZDUpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTAwIiByPSI0MCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEwMCIgcj0iMjUiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz48dGV4dCB4PSIxNTAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+8J+SuzwvdGV4dD48dGV4dCB4PSIxNTAiIHk9IjE3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+VGVjaG5vbG9neTwvdGV4dD48L3N2Zz4='
    ],
    'Fashion & Beauty': [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkNiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I0Y5N0NBRjtzdG9wLW9wYWNpdHk6MSIgLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNFRDY4QTE7c3RvcC1vcGFjaXR5OjEiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9InVybCgjZ3JhZDYpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTAwIiByPSI0MCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEwMCIgcj0iMjUiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz48dGV4dCB4PSIxNTAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+8J+SlzwvdGV4dD48dGV4dCB4PSIxNTAiIHk9IjE3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+RmFzaGlvbiAmYW1wOyBCZWF1dHk8L3RleHQ+PC9zdmc+'
    ]
  };

  const categoryImages = images[category as keyof typeof images] || images['Technology'];
  const imageIndex = parseInt(campaignId.slice(-1), 16) % categoryImages.length;
  return categoryImages[imageIndex];
}

export function CampaignCard({ campaign, onJoin, showJoinButton = true }: CampaignCardProps) {
  const filledSlots = campaign.filledSlots || 0;
  const availableSlots = campaign.totalSlots - filledSlots;
  const completionPercentage = (filledSlots / campaign.totalSlots) * 100;

  const getDifficultyColor = (difficulty: string) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Social Media': return '📱';
      case 'Gaming': return '🎮';
      case 'Health & Fitness': return '💪';
      case 'Technology': return '💻';
      case 'Fashion & Beauty': return '💄';
      default: return '📝';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
      <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        <img
          src={getCampaignImage(campaign.id, campaign.category)}
          alt={`${campaign.category} campaign`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.src = getCampaignImage(campaign.id, 'Technology');
          }}
        />
      </div>
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2 mb-2">
              {campaign.title}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {getCategoryIcon(campaign.category)} {campaign.category}
              </Badge>
              <Badge className={`text-xs px-2 py-1 ${getDifficultyColor(campaign.difficulty)}`}>
                {campaign.difficulty || 'Easy'}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 text-green-600 font-bold text-lg">
              <DollarSign className="w-4 h-4" />
              <span>${campaign.reward}</span>
            </div>
            {campaign.isActive && (
              <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">
                Active
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
          {campaign.description}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{campaign.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{availableSlots} slots left</span>
          </div>
          {campaign.deadline && (
            <div className="flex items-center gap-2 text-gray-600 col-span-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Ends: {new Date(campaign.deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{filledSlots}/{campaign.totalSlots} filled</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Requirements Preview */}
        {campaign.requirements && campaign.requirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Requirements:</h4>
            <div className="flex flex-wrap gap-1">
              {campaign.requirements.slice(0, 2).map((req, index) => (
                <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                  {req}
                </Badge>
              ))}
              {campaign.requirements.length > 2 && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  +{campaign.requirements.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {showJoinButton && campaign.isActive && availableSlots > 0 && (
          <Button 
            onClick={() => onJoin?.(campaign.id)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
          >
            Join Campaign
          </Button>
        )}

        {!campaign.isActive && (
          <Button disabled className="w-full">
            Campaign Ended
          </Button>
        )}

        {campaign.isActive && availableSlots === 0 && (
          <Button disabled className="w-full">
            Campaign Full
          </Button>
        )}
      </CardContent>
    </Card>
  );
}