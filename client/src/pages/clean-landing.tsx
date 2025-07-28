import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Users, Zap, ArrowRight, Play } from "lucide-react";

export default function CleanLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* CACHE BREAK INDICATOR */}
      <div className="bg-red-600 text-white text-center py-3 font-bold text-lg">
        🔥 FORCE REFRESH - NEW CLEAN DESIGN LOADED - {new Date().toLocaleTimeString()} 🔥
      </div>
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="bg-gray-100 text-gray-800 border-gray-300 mb-6 px-4 py-2">
              SocialFi Platform
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-black leading-tight mb-8">
              Turn Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Social Media</span>
              <br />
              Into <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Crypto Income</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Connect with brands, complete campaigns, and earn cryptocurrency. 
              Professional platform for creators and businesses.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button 
                size="lg" 
                className="bg-black text-white hover:bg-gray-800 px-8 py-4 text-lg font-medium"
                onClick={() => window.location.href = '/signup?type=creator'}
              >
                Start as Creator
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-gray-300 text-black bg-white hover:bg-gray-50 px-8 py-4 text-lg font-medium"
                onClick={() => window.location.href = '/signup?type=brand'}
              >
                For Brands
                <Play className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-gray-50 rounded-xl p-8 border border-gray-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-black">25,847</div>
                <div className="text-gray-600 text-sm">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">$2.4M</div>
                <div className="text-gray-600 text-sm">Total Payouts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">1,250</div>
                <div className="text-gray-600 text-sm">Live Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">4.9★</div>
                <div className="text-gray-600 text-sm">Creator Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Creators Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-black text-white mb-6 px-4 py-2">
              For Creators
            </Badge>
            <h2 className="text-4xl font-bold text-black mb-6">
              Start Earning <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Cryptocurrency</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Complete social media tasks and get paid in crypto. No minimum followers required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Browse campaigns from verified brands</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Complete simple social media tasks</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Get paid in BNB, SOL, USDT and more</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Instant payments to your wallet</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-black text-white hover:bg-gray-800 px-8 py-3"
                onClick={() => window.location.href = '/signup?type=creator'}
              >
                Join as Creator
              </Button>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-black">Featured Campaign</h4>
                    <Badge className="bg-black text-white">$25.00</Badge>
                  </div>
                  <p className="text-gray-600 mb-4">Create content about eco-friendly products</p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Time: 15 minutes</span>
                    <span>Spots: 8 remaining</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-black">Your Earnings</h4>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">$247.50</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-black h-2 rounded-full w-3/4"></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">$2.50 away from payout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Brands Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-black text-white mb-6 px-4 py-2">
              For Brands
            </Badge>
            <h2 className="text-4xl font-bold text-black mb-6">
              Reach Your <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Target Audience</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with authentic creators who align with your brand values and drive real engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold mb-4 text-black">Campaign Performance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-black">1,247</div>
                      <div className="text-sm text-gray-500">Total Reach</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">94%</div>
                      <div className="text-sm text-gray-500">Success Rate</div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold mb-4 text-black">Active Campaigns</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Summer Collection</span>
                      <Badge variant="outline" className="text-xs">15 creators</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Brand Awareness</span>
                      <Badge variant="outline" className="text-xs">8 creators</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Access verified creator network</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Real-time campaign analytics</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Flexible budget and timeline</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Detailed performance reports</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-black text-white hover:bg-gray-800 px-8 py-3"
                onClick={() => window.location.href = '/signup?type=brand'}
              >
                Launch Campaign
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-6">Why Choose Breedskool</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional tools and secure infrastructure for the modern creator economy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Instant Payments</h3>
              <p className="text-gray-600 leading-relaxed">
                Fast crypto payouts in BNB, SOL, AVAX, TON, TRON, and USDT with same-day processing.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-6">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Secure Platform</h3>
              <p className="text-gray-600 leading-relaxed">
                Enterprise-grade security with non-custodial wallet integration for maximum safety.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Global Network</h3>
              <p className="text-gray-600 leading-relaxed">
                Join thousands of creators and brands building the future of digital marketing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-black mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Join the platform that's transforming how creators and brands collaborate in the digital economy.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-black text-white hover:bg-gray-800 px-8 py-4 text-lg"
              onClick={() => window.location.href = '/signup?type=creator'}
            >
              Start as Creator
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-gray-300 text-black bg-white hover:bg-gray-50 px-8 py-4 text-lg"
              onClick={() => window.location.href = '/signup?type=brand'}
            >
              Launch Campaign
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold mb-4">Breedskool</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Professional SocialFi platform connecting creators with brands through crypto rewards.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Creators</h4>
              <ul className="space-y-2">
                <li><a href="/campaigns" className="text-gray-400 hover:text-white transition-colors">Browse Campaigns</a></li>
                <li><a href="/signup?type=creator" className="text-gray-400 hover:text-white transition-colors">Join as Creator</a></li>
                <li><a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">For Brands</h4>
              <ul className="space-y-2">
                <li><a href="/signup?type=brand" className="text-gray-400 hover:text-white transition-colors">Launch Campaign</a></li>
                <li><a href="/admin-dashboard" className="text-gray-400 hover:text-white transition-colors">Brand Dashboard</a></li>
                <li><a href="/shop" className="text-gray-400 hover:text-white transition-colors">Creator Network</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2025 Breedskool. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-400">Supported:</span>
                <div className="flex space-x-2">
                  <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs">BNB</span>
                  <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">SOL</span>
                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">AVAX</span>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">TON</span>
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">USDT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}