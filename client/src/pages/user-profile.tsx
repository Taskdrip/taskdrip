import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Heart, Share2, Calendar, MapPin, Star, Trophy, Users, Target, Coins, Edit3, Send, Award } from "lucide-react";
import { useState } from "react";
import { getTierConfig, formatFollowers } from "@/lib/tiers";
import { Link } from "wouter";

export default function UserProfile() {
  const { user } = useAuth();
  const [newPost, setNewPost] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  const { data: userPosts = [] } = useQuery({
    queryKey: ["/api/user/posts"],
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ["/api/user/achievements"],
  });

  const mockPosts = [
    {
      id: 1,
      content: "Just completed my 50th task! Loving the diversity of campaigns on Taskdrip 🚀",
      timestamp: "2 hours ago",
      likes: 24,
      comments: 8,
      shares: 3,
      image: null
    },
    {
      id: 2,
      content: "Sharing my experience with app testing campaigns - great way to discover new tech while earning crypto! Anyone else tried the fintech apps recently?",
      timestamp: "1 day ago",
      likes: 42,
      comments: 15,
      shares: 7,
      image: null
    },
    {
      id: 3,
      content: "Local event hosting was amazing! Connected with so many people in my community. The platform's task variety keeps surprising me.",
      timestamp: "3 days ago",
      likes: 18,
      comments: 6,
      shares: 2,
      image: null
    }
  ];

  const handlePostSubmit = () => {
    if (newPost.trim()) {
      // In real app, this would submit to API
      console.log("New post:", newPost);
      setNewPost("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName} />
                  <AvatarFallback className="text-3xl bg-black text-white">
                    {(user as any)?.firstName?.charAt(0)}{(user as any)?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h1 className="text-3xl font-bold text-gray-900">
                        {(user as any)?.firstName} {(user as any)?.lastName}
                      </h1>
                      {(user as any)?.userType === 'creator' && (() => {
                        const tier = getTierConfig((user as any)?.creatorTier || 'rising_sparks');
                        return (
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${tier.badge}`}>
                            {tier.icon} {tier.name}
                          </span>
                        );
                      })()}
                      {(user as any)?.isVerified && (
                        <Badge className="bg-blue-100 text-blue-700 border-0">✓ KYC Verified</Badge>
                      )}
                    </div>
                    {(user as any)?.username && (
                      <p className="text-gray-400 text-sm mb-1">@{(user as any).username}</p>
                    )}
                    {(user as any)?.niche && (
                      <Badge variant="secondary" className="mb-2">{(user as any).niche}</Badge>
                    )}
                    <p className="text-gray-600">{(user as any)?.bio}</p>
                    {(user as any)?.location && (
                      <div className="flex items-center mt-2 text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{(user as any)?.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 mt-4 sm:mt-0">
                    <Button 
                      variant={isFollowing ? "outline" : "default"}
                      onClick={() => setIsFollowing(!isFollowing)}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                    <Button variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{formatFollowers((user as any)?.totalFollowers || 0)}</div>
                    <div className="text-xs text-gray-500 font-medium">Total Followers</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">${parseFloat((user as any)?.totalEarned || '0').toFixed(2)}</div>
                    <div className="text-xs text-gray-500 font-medium">Total Earned</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">{(user as any)?.completedCampaigns || 0}</div>
                    <div className="text-xs text-gray-500 font-medium">Tasks Done</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-500">{parseFloat((user as any)?.rating || '0').toFixed(1)}</div>
                    <div className="text-xs text-gray-500 font-medium">Rating</div>
                  </div>
                </div>

                {/* Social platform breakdown */}
                {(user as any)?.userType === 'creator' && (user as any)?.totalFollowers > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(user as any)?.tiktokFollowers > 0 && <span className="text-xs bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-medium border border-pink-100">TikTok {formatFollowers((user as any).tiktokFollowers)}</span>}
                    {(user as any)?.youtubeFollowers > 0 && <span className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-medium border border-red-100">YouTube {formatFollowers((user as any).youtubeFollowers)}</span>}
                    {(user as any)?.instagramFollowers > 0 && <span className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-medium border border-purple-100">Instagram {formatFollowers((user as any).instagramFollowers)}</span>}
                    {(user as any)?.twitterFollowers > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium border border-blue-100">X {formatFollowers((user as any).twitterFollowers)}</span>}
                    {(user as any)?.twitchFollowers > 0 && <span className="text-xs bg-violet-50 text-violet-600 px-3 py-1 rounded-full font-medium border border-violet-100">Twitch {formatFollowers((user as any).twitchFollowers)}</span>}
                    {(user as any)?.telegramFollowers > 0 && <span className="text-xs bg-sky-50 text-sky-600 px-3 py-1 rounded-full font-medium border border-sky-100">Telegram {formatFollowers((user as any).telegramFollowers)}</span>}
                  </div>
                )}

                {/* Skills */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {(user as any)?.skills?.map((skill: string) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>

                {/* Social Links */}
                <div className="mt-6 flex flex-wrap gap-4">
                  {(user as any)?.twitterHandle && (
                    <a href={`https://twitter.com/${(user as any).twitterHandle.replace('@', '')}`} 
                       className="text-blue-500 hover:underline text-sm">
                      {(user as any).twitterHandle}
                    </a>
                  )}
                  {(user as any)?.instagramHandle && (
                    <a href={`https://instagram.com/${(user as any).instagramHandle.replace('@', '')}`} 
                       className="text-pink-500 hover:underline text-sm">
                      {(user as any).instagramHandle}
                    </a>
                  )}
                  {(user as any)?.youtubeHandle && (
                    <a href={`https://youtube.com/${(user as any).youtubeHandle.replace('@', '')}`} 
                       className="text-red-500 hover:underline text-sm">
                      {(user as any).youtubeHandle}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            {/* Create Post */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName} />
                    <AvatarFallback>{(user as any)?.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share your latest achievement or thoughts..."
                      className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          📷 Photo
                        </Button>
                        <Button variant="ghost" size="sm">
                          🎥 Video
                        </Button>
                      </div>
                      <Button 
                        onClick={handlePostSubmit}
                        disabled={!newPost.trim()}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Feed */}
            {mockPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName} />
                      <AvatarFallback>{(user as any)?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{(user as any)?.firstName} {(user as any)?.lastName}</h3>
                        <span className="text-gray-500 text-sm">{post.timestamp}</span>
                      </div>
                      <p className="text-gray-700 mb-4">{post.content}</p>
                      
                      <div className="flex items-center space-x-6 text-gray-500">
                        <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                          <Heart className="h-4 w-4" />
                          <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                          <MessageCircle className="h-4 w-4" />
                          <span>{post.comments}</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-green-500 transition-colors">
                          <Share2 className="h-4 w-4" />
                          <span>{post.shares}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Task Master</h3>
                  <p className="text-sm opacity-90">Completed 50+ tasks</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <CardContent className="p-6 text-center">
                  <Star className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Top Performer</h3>
                  <p className="text-sm opacity-90">4.8+ average rating</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                <CardContent className="p-6 text-center">
                  <Coins className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">Crypto Earner</h3>
                  <p className="text-sm opacity-90">$1000+ earned</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Work</CardTitle>
                <CardDescription>Showcase of completed tasks and projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="border rounded-lg p-4">
                    <div className="bg-gray-200 h-32 rounded mb-3 flex items-center justify-center">
                      <span className="text-gray-500">App Testing Project</span>
                    </div>
                    <h4 className="font-semibold mb-1">FinTech App Beta Test</h4>
                    <p className="text-sm text-gray-600">Comprehensive testing and feedback for mobile banking app</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="bg-gray-200 h-32 rounded mb-3 flex items-center justify-center">
                      <span className="text-gray-500">Content Creation</span>
                    </div>
                    <h4 className="font-semibold mb-1">Social Media Campaign</h4>
                    <p className="text-sm text-gray-600">Created engaging content for tech startup launch</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="bg-gray-200 h-32 rounded mb-3 flex items-center justify-center">
                      <span className="text-gray-500">Event Hosting</span>
                    </div>
                    <h4 className="font-semibold mb-1">Community Meetup</h4>
                    <p className="text-sm text-gray-600">Organized local tech networking event</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {[1, 2, 3].map((review) => (
              <Card key={review}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>B{review}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">Brand Partner {review}</h4>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700">
                        Excellent work on our campaign! Very professional, delivered on time, and exceeded expectations. 
                        Would definitely work with them again.
                      </p>
                      <span className="text-sm text-gray-500 mt-2 block">2 weeks ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}