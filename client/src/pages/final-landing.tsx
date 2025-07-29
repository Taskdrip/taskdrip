import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Users, Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function FinalLanding() {
  const currentTime = new Date().toLocaleString();
  
  return (
    <div className="min-h-screen bg-white">

      <NavigationFixed />
      
      {/* Hero Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="bg-gray-100 text-gray-800 border-gray-300 mb-8 px-6 py-3 text-lg">
              Professional SocialFi Platform
            </Badge>
            <h1 className="text-6xl md:text-7xl font-bold text-black leading-tight mb-8">
              Complete <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tasks</span>
              <br />
              Earn <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Crypto Rewards</span>
            </h1>
            <p className="text-2xl text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed">
              From app testing to event hosting, trading to content creation - earn cryptocurrency 
              through diverse brand campaigns and real-world tasks.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="bg-black text-white hover:bg-gray-800 px-12 py-6 text-xl font-semibold"
                >
                  Start as Creator
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-gray-400 text-black bg-white hover:bg-gray-50 px-12 py-6 text-xl font-semibold"
                >
                  Launch Brand Campaign
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-gray-50 rounded-2xl p-10 border border-gray-200">
              <div className="text-center">
                <div className="text-4xl font-bold text-black">25,847</div>
                <div className="text-gray-600">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-black">$2.4M</div>
                <div className="text-gray-600">Total Payouts</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-black">1,250</div>
                <div className="text-gray-600">Live Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-black">4.9★</div>
                <div className="text-gray-600">Creator Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Creators Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="bg-black text-white mb-8 px-6 py-3 text-lg font-semibold">
              FOR CREATORS
            </Badge>
            <h2 className="text-5xl font-bold text-black mb-8">
              Start Earning <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Cryptocurrency</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Complete diverse tasks from app testing to event hosting. Multiple earning opportunities across various skills and locations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-8 mb-12">
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Test apps, trade, create content & more</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Host events and run local errands</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Get paid in BNB, SOL, USDT and more</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Instant payments to your wallet</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-black text-white hover:bg-gray-800 px-10 py-4 text-lg font-semibold"
                onClick={() => window.location.href = '/signup?type=creator'}
              >
                Join as Creator
              </Button>
            </div>
            
            <div className="bg-white rounded-2xl p-10 shadow-lg border border-gray-200">
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-semibold text-black text-lg">Featured Campaign</h4>
                    <Badge className="bg-black text-white px-4 py-2 text-lg">$50.00</Badge>
                  </div>
                  <p className="text-gray-600 mb-6 text-lg">Test new trading app & provide feedback</p>
                  <div className="flex justify-between text-gray-500">
                    <span>Time: 30 minutes</span>
                    <span>Spots: 12 remaining</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-semibold text-black text-lg">Your Earnings</h4>
                    <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">$247.50</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-black h-3 rounded-full w-3/4"></div>
                  </div>
                  <p className="text-gray-500 mt-3">$2.50 away from payout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Brands Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="bg-black text-white mb-8 px-6 py-3 text-lg font-semibold">
              FOR BRANDS
            </Badge>
            <h2 className="text-5xl font-bold text-black mb-8">
              Reach Your <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Target Audience</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with authentic creators who align with your brand values and drive real engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="bg-white rounded-2xl p-10 shadow-lg border border-gray-200">
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-xl p-8">
                  <h4 className="font-semibold mb-6 text-black text-lg">Campaign Performance</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-black">1,247</div>
                      <div className="text-gray-500">Total Reach</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">94%</div>
                      <div className="text-gray-500">Success Rate</div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-8">
                  <h4 className="font-semibold mb-6 text-black text-lg">Active Campaigns</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Summer Collection</span>
                      <Badge variant="outline">15 creators</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Brand Awareness</span>
                      <Badge variant="outline">8 creators</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-8 mb-12">
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Access verified creator network</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Real-time campaign analytics</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Flexible budget and timeline</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-700">Detailed performance reports</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-black text-white hover:bg-gray-800 px-10 py-4 text-lg font-semibold"
                onClick={() => window.location.href = '/signup?type=brand'}
              >
                Launch Campaign
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-black mb-8">Why Choose Breedskool</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional tools and secure infrastructure for the modern creator economy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="bg-white rounded-2xl p-10 text-center shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-8">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-black mb-6">Instant Payments</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Fast crypto payouts across multiple networks with same-day processing for all completed tasks.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-10 text-center shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-8">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-black mb-6">Secure Platform</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Enterprise-grade security with non-custodial wallet integration for maximum safety.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-10 text-center shadow-lg border border-gray-200">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-8">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-black mb-6">Global Network</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                Join thousands of task performers and brands across diverse industries and locations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-black mb-8">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
            Join the platform connecting task performers with brands across digital and real-world opportunities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              className="bg-black text-white hover:bg-gray-800 px-12 py-6 text-xl font-semibold"
              onClick={() => window.location.href = '/signup?type=creator'}
            >
              Start as Creator
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-gray-400 text-black bg-white hover:bg-gray-50 px-12 py-6 text-xl font-semibold"
              onClick={() => window.location.href = '/signup?type=brand'}
            >
              Launch Campaign
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <h3 className="text-2xl font-bold mb-6">Breedskool</h3>
              <p className="text-gray-400 mb-8 leading-relaxed text-lg">
                Professional task-based platform connecting performers with brands through crypto rewards.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">For Creators</h4>
              <ul className="space-y-3">
                <li><a href="/campaigns" className="text-gray-400 hover:text-white transition-colors">Browse Campaigns</a></li>
                <li><a href="/signup?type=creator" className="text-gray-400 hover:text-white transition-colors">Join as Creator</a></li>
                <li><a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">For Brands</h4>
              <ul className="space-y-3">
                <li><a href="/signup?type=brand" className="text-gray-400 hover:text-white transition-colors">Launch Campaign</a></li>
                <li><a href="/admin-dashboard" className="text-gray-400 hover:text-white transition-colors">Brand Dashboard</a></li>
                <li><a href="/shop" className="text-gray-400 hover:text-white transition-colors">Creator Network</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">Support</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-10">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
              <p className="text-gray-400 text-center lg:text-left">
                © 2025 Breedskool. All rights reserved.
              </p>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <span className="text-gray-400 text-center">Supported Networks:</span>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="bg-yellow-600 text-black px-3 py-1 rounded font-semibold text-sm">BNB</span>
                  <span className="bg-purple-600 text-white px-3 py-1 rounded font-semibold text-sm">SOL</span>
                  <span className="bg-red-600 text-white px-3 py-1 rounded font-semibold text-sm">AVAX</span>
                  <span className="bg-blue-600 text-white px-3 py-1 rounded font-semibold text-sm">TON</span>
                  <span className="bg-green-600 text-white px-3 py-1 rounded font-semibold text-sm">USDT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}