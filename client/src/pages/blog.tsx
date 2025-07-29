import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Eye, Heart, MessageCircle, ArrowRight, Smartphone, TrendingUp, Users } from "lucide-react";

export default function Blog() {
  const { data: posts = [] } = useQuery({
    queryKey: ["/api/blog"],
  });

  const featuredPost = posts[0];
  const recentPosts = posts.slice(1);

  const categories = [
    { name: "Task Strategy", count: 8, color: "bg-blue-500" },
    { name: "Crypto Payments", count: 5, color: "bg-green-500" },
    { name: "App Testing", count: 6, color: "bg-purple-500" },
    { name: "Trading Tips", count: 4, color: "bg-orange-500" },
    { name: "Local Tasks", count: 3, color: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Task Performer Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Expert guides, earning strategies, and success stories from the Breedskool community.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Featured Post */}
            {featuredPost && (
              <Card className="mb-8 overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/2 h-64 md:h-auto relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600">
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="text-white text-center p-8">
                        <Smartphone className="h-16 w-16 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Featured Guide</h2>
                        <p className="text-lg opacity-90">Latest strategies for maximizing earnings</p>
                      </div>
                    </div>
                    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 300" fill="none">
                      <circle cx="100" cy="100" r="50" fill="white" opacity="0.1"/>
                      <circle cx="300" cy="200" r="30" fill="white" opacity="0.1"/>
                      <rect x="200" y="50" width="60" height="60" fill="white" opacity="0.1" rx="8"/>
                      <path d="M50 250 Q200 150 350 250" stroke="white" strokeWidth="2" opacity="0.2"/>
                    </svg>
                  </div>
                  <div className="md:w-1/2 p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-blue-100 text-blue-800">{featuredPost.category}</Badge>
                      <Badge variant="outline">Featured</Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {featuredPost.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500 gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(featuredPost.publishedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          8 min read
                        </span>
                      </div>
                      <Button className="bg-black text-white hover:bg-gray-800">
                        Read Guide
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Posts Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {recentPosts.map((post: any, index: number) => {
                const imagePatterns = [
                  { bg: "from-purple-500 to-pink-500", icon: TrendingUp },
                  { bg: "from-green-500 to-blue-500", icon: Users },
                  { bg: "from-orange-500 to-red-500", icon: Smartphone },
                  { bg: "from-blue-500 to-purple-500", icon: Eye }
                ];
                const pattern = imagePatterns[index % imagePatterns.length];
                const IconComponent = pattern.icon;
                
                return (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`h-40 bg-gradient-to-r ${pattern.bg} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                      <IconComponent className="h-12 w-12 text-white opacity-80" />
                    </div>
                    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 300 200" fill="none">
                      <circle cx={50 + index * 20} cy={50 + index * 15} r="15" fill="white" opacity="0.3"/>
                      <circle cx={200 - index * 25} cy={120 - index * 10} r="10" fill="white" opacity="0.2"/>
                      <rect x={80 + index * 20} y={20 + index * 15} width="30" height="30" fill="white" opacity="0.1" rx="4"/>
                    </svg>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">{post.category}</Badge>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          1.2k
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-black hover:bg-gray-100">
                        Read More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Browse Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map((category) => (
                  <div key={category.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {category.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <a href="/campaigns" className="block p-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    Browse Tasks
                  </a>
                  <a href="/dashboard" className="block p-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    Your Dashboard
                  </a>
                  <a href="/profile" className="block p-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    Update Profile
                  </a>
                  <a href="/shop" className="block p-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    Creator Tools
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Newsletter */}
            <Card className="bg-gradient-to-r from-black to-gray-800 text-white">
              <CardContent className="p-6">
                <Users className="h-8 w-8 mb-3" />
                <h3 className="font-bold text-lg mb-2">Stay Updated</h3>
                <p className="text-sm opacity-90 mb-4">
                  Get weekly task opportunities and earning tips.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="w-full px-3 py-2 rounded text-gray-900 text-sm"
                  />
                  <Button variant="secondary" size="sm" className="w-full">
                    Subscribe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}