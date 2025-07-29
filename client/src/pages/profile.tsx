import { useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { 
  Star, 
  MapPin, 
  Calendar, 
  Trophy, 
  Medal, 
  CheckCircle,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Wallet,
  Clock,
  Plus,
  Minus,
  Edit3
} from "lucide-react";

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "transactions"],
    enabled: !!user?.id,
  });

  const { data: participations = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "participations"],
    enabled: !!user?.id,
  });

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

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'U';

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-accent to-blue-600 rounded-xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={user.profileImageUrl || ""} alt={displayName} />
              <AvatarFallback className="text-2xl bg-white text-accent">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {user.isVerified && (
                  <CheckCircle className="w-6 h-6 text-blue-200" title="Verified Creator" />
                )}
              </div>
              <p className="text-blue-100 mb-2">
                {user.bio || "Digital Creator | Content Creator | Crypto Enthusiast"}
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-4 text-sm">
                {user.location && (
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {user.location}
                  </span>
                )}
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold">{user.rating || "0.0"}</div>
              <div className="text-blue-200 text-sm">Rating</div>
              <div className="flex text-yellow-300 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>
            
            <Link href="/profile-edit">
              <Button 
                variant="outline" 
                size="sm"
                className="ml-4 bg-white text-black border-white hover:bg-gray-100"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Stats & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Card */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-black mb-4">Profile Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Followers</span>
                  <span className="font-semibold text-black">{user.followers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Following</span>
                  <span className="font-semibold text-black">{user.following || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Campaigns Completed</span>
                  <span className="font-semibold text-black">{user.completedCampaigns || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Earned</span>
                  <span className="font-semibold text-success">${user.totalEarned || "0.00"}</span>
                </div>
              </div>
            </div>

            {/* Skills & Badges */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-black mb-4">Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {user.skills && user.skills.length > 0 ? (
                  user.skills.map((skill, index) => (
                    <Badge key={index} className="bg-accent text-white">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <>
                    <Badge className="bg-accent text-white">Social Media</Badge>
                    <Badge className="bg-accent text-white">Content Writing</Badge>
                    <Badge className="bg-accent text-white">Marketing</Badge>
                  </>
                )}
              </div>
              
              <h4 className="font-semibold text-black mb-3">Achievements</h4>
              <div className="flex flex-wrap gap-2">
                {user.isVerified && (
                  <Badge className="bg-green-100 text-green-800 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified Creator
                  </Badge>
                )}
                {(user.completedCampaigns || 0) >= 100 && (
                  <Badge className="bg-blue-100 text-blue-800 flex items-center">
                    <Medal className="w-3 h-3 mr-1" />
                    100+ Campaigns
                  </Badge>
                )}
                {(user.completedCampaigns || 0) >= 10 && (
                  <Badge className="bg-yellow-100 text-yellow-800 flex items-center">
                    <Trophy className="w-3 h-3 mr-1" />
                    Top Performer
                  </Badge>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-black mb-4">Social Profiles</h3>
              <div className="space-y-3">
                {user.twitterHandle && (
                  <a href={`https://twitter.com/${user.twitterHandle}`} className="flex items-center space-x-3 text-gray-600 hover:text-accent transition-colors duration-200">
                    <Twitter className="w-5 h-5" />
                    <span>@{user.twitterHandle}</span>
                  </a>
                )}
                {user.instagramHandle && (
                  <a href={`https://instagram.com/${user.instagramHandle}`} className="flex items-center space-x-3 text-gray-600 hover:text-accent transition-colors duration-200">
                    <Instagram className="w-5 h-5" />
                    <span>@{user.instagramHandle}</span>
                  </a>
                )}
                {user.linkedinHandle && (
                  <a href={`https://linkedin.com/in/${user.linkedinHandle}`} className="flex items-center space-x-3 text-gray-600 hover:text-accent transition-colors duration-200">
                    <Linkedin className="w-5 h-5" />
                    <span>{user.linkedinHandle}</span>
                  </a>
                )}
                {user.youtubeHandle && (
                  <a href={`https://youtube.com/@${user.youtubeHandle}`} className="flex items-center space-x-3 text-gray-600 hover:text-accent transition-colors duration-200">
                    <Youtube className="w-5 h-5" />
                    <span>{user.youtubeHandle}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet & Earnings */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-black">Wallet & Earnings</h3>
                <Button className="bg-accent text-white hover:bg-blue-700">
                  Request Payout
                </Button>
              </div>
              
              {/* Balance Cards */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Available Balance</p>
                      <p className="text-2xl font-bold text-success">${user.availableBalance || "0.00"}</p>
                    </div>
                    <Wallet className="w-8 h-8 text-success" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Approval</p>
                      <p className="text-2xl font-bold text-warning">${user.pendingBalance || "0.00"}</p>
                    </div>
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <h4 className="font-semibold text-black mb-4">Recent Transactions</h4>
              <div className="space-y-3">
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((transaction: any) => (
                    <div key={transaction.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'campaign_reward' ? 'bg-green-100' :
                            transaction.type === 'payout' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {transaction.type === 'campaign_reward' ? (
                              <Plus className="w-5 h-5 text-green-600" />
                            ) : transaction.type === 'payout' ? (
                              <Minus className="w-5 h-5 text-red-600" />
                            ) : (
                              <Wallet className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-black">{transaction.description}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            transaction.type === 'payout' ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {transaction.type === 'payout' ? '-' : '+'}${transaction.amount}
                          </p>
                          <p className={`text-sm ${
                            transaction.status === 'completed' ? 'text-green-600' :
                            transaction.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                          }`}>
                            {transaction.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-center py-4">No transactions yet</p>
                )}
              </div>
            </div>

            {/* Active Campaigns */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-black mb-6">Active Campaigns</h3>
              <div className="space-y-4">
                {participations.filter((p: any) => p.status === 'pending' || p.status === 'approved').length > 0 ? (
                  participations
                    .filter((p: any) => p.status === 'pending' || p.status === 'approved')
                    .slice(0, 3)
                    .map((participation: any) => (
                      <div key={participation.id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                              <span className="text-white font-semibold">C</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-black">Campaign Task</h4>
                              <p className="text-sm text-gray-600">
                                Status: {participation.status} • Submitted: {new Date(participation.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={
                            participation.status === 'approved' ? 'bg-green-100 text-green-800' :
                            participation.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {participation.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-600 text-center py-4">No active campaigns</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
