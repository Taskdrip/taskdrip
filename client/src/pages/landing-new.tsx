import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Users, Zap, ArrowRight, Play } from "lucide-react";

export default function LandingNew() {
  return (
    <div className="min-h-screen bg-white">
      {/* FORCE CACHE REFRESH INDICATOR */}
      <div className="bg-green-600 text-white text-center py-3 font-bold text-lg">
        ✅ COMPLETELY NEW HOMEPAGE - CACHE CLEARED - CREATOR & BRAND SECTIONS ACTIVE ✅
      </div>
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-10 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge className="bg-white/20 text-white border-white/30 mb-6 px-4 py-2">
              🚀 FRESH NEW VERSION - Transform Your Content Into Crypto Earnings
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8">
              Turn Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Social Media</span> Into
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Crypto Rewards</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
              Join thousands of creators earning cryptocurrency by completing brand campaigns. 
              No followers required. No complex setup. Just create, submit, and get paid in crypto.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 px-12 py-6 text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => window.location.href = '/signup?type=creator'}
              >
                🎯 START EARNING AS CREATOR
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/80 text-white bg-white/10 hover:bg-white hover:text-blue-600 px-12 py-6 text-xl font-bold backdrop-blur-sm"
                onClick={() => window.location.href = '/signup?type=brand'}
              >
                <Play className="mr-3 w-6 h-6" />
                🏢 LAUNCH BRAND CAMPAIGN
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">25,847</div>
                <div className="text-blue-200">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">$2.4M</div>
                <div className="text-blue-200">Total Payouts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">1,250</div>
                <div className="text-blue-200">Live Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">4.9★</div>
                <div className="text-blue-200">Creator Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOR CREATORS SECTION - HIGHLY VISIBLE */}
      <section className="py-24 bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-green-600 text-white mb-6 px-6 py-3 text-lg font-bold">
              🎨 FOR CREATORS & INFLUENCERS
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Start Earning Crypto Today</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Complete social media tasks, get paid in cryptocurrency. No minimum followers required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Browse campaigns from top brands</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Complete simple social media tasks</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Get paid in BNB, SOL, USDT & more</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Withdraw earnings anytime</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-lg font-bold"
                onClick={() => window.location.href = '/signup?type=creator'}
              >
                🚀 JOIN AS CREATOR NOW
              </Button>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="space-y-6">
                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Available Campaign</h4>
                    <Badge className="bg-green-600 text-white px-3 py-1 text-lg">$25.00</Badge>
                  </div>
                  <p className="text-gray-600 mb-4">Post about our new eco-friendly products on Instagram</p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>⏱️ Estimated time: 10 min</span>
                    <span>📊 12 spots left</span>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Your Potential Earnings</h4>
                    <span className="text-3xl font-bold text-green-600">$247.50</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-600 h-3 rounded-full w-3/4"></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">💰 $2.50 away from payout threshold</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOR BRANDS SECTION - HIGHLY VISIBLE */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-blue-600 text-white mb-6 px-6 py-3 text-lg font-bold">
              🏢 FOR BRANDS & BUSINESSES
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Reach Your Audience Through Authentic Creators</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with creators who genuinely love your brand. Launch campaigns that drive real engagement and sales.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="font-semibold mb-4 text-lg">Campaign Analytics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">1,247</div>
                      <div className="text-sm text-gray-500">Total Reach</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">94%</div>
                      <div className="text-sm text-gray-500">Completion Rate</div>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="font-semibold mb-4 text-lg">Active Campaigns</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Summer Collection Launch</span>
                      <Badge variant="outline" className="bg-blue-100">15 creators</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Back to School Campaign</span>
                      <Badge variant="outline" className="bg-blue-100">8 creators</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Access vetted creator network</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Track campaign performance in real-time</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Set your own budget and timeline</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Get detailed analytics and reports</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg font-bold"
                onClick={() => window.location.href = '/signup?type=brand'}
              >
                🎯 LAUNCH BRAND CAMPAIGN
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-2xl font-bold mb-4">Taskdrip</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                The future of creator monetization. Connect with brands, complete campaigns, and earn cryptocurrency.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 cursor-pointer transition-colors">
                  <span className="text-sm font-semibold">T</span>
                </div>
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center hover:bg-purple-700 cursor-pointer transition-colors">
                  <span className="text-sm font-semibold">D</span>
                </div>
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center hover:bg-pink-700 cursor-pointer transition-colors">
                  <span className="text-sm font-semibold">I</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6">For Creators</h4>
              <ul className="space-y-3">
                <li><a href="/campaigns" className="text-gray-400 hover:text-white transition-colors">Browse Campaigns</a></li>
                <li><a href="/signup?type=creator" className="text-gray-400 hover:text-white transition-colors">Join as Creator</a></li>
                <li><a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Creator Dashboard</a></li>
                <li><a href="/profile" className="text-gray-400 hover:text-white transition-colors">Profile Settings</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6">For Brands</h4>
              <ul className="space-y-3">
                <li><a href="/signup?type=brand" className="text-gray-400 hover:text-white transition-colors">Launch Campaign</a></li>
                <li><a href="/admin-dashboard" className="text-gray-400 hover:text-white transition-colors">Brand Dashboard</a></li>
                <li><a href="/shop" className="text-gray-400 hover:text-white transition-colors">Creator Network</a></li>
                <li><a href="/blog" className="text-gray-400 hover:text-white transition-colors">Success Stories</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6">Support</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2025 Taskdrip. All rights reserved.
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <span className="text-gray-400">Supported Networks:</span>
                <div className="flex space-x-3">
                  <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-semibold">BNB</span>
                  <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">SOL</span>
                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">AVAX</span>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">TON</span>
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">USDT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}