import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, TrendingUp, Shield, Users, Zap, ArrowRight, Play } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* VISIBLE UPDATE INDICATOR */}
      <div className="bg-red-600 text-white text-center py-2 font-bold">
        🔥 UPDATED HOMEPAGE WITH CREATOR & BRAND SECTIONS - v2.0 🔥
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
              🚀 NEW UPDATED VERSION - Transform Your Content Into Crypto Earnings
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8">
              Turn Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Influence</span> Into
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Crypto Income</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
              Join thousands of creators earning cryptocurrency by completing brand campaigns. 
              No followers required. No complex setup. Just create, submit, and get paid.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => window.location.href = '/signup?type=creator'}
              >
                Start Earning Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/80 text-white bg-white/10 hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold backdrop-blur-sm"
                onClick={() => window.location.href = '/signup?type=brand'}
              >
                <Play className="mr-2 w-5 h-5" />
                For Brands
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

      {/* How It Works */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to start earning cryptocurrency with your content creation skills
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Browse & Join</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Discover campaigns from top brands that match your interests and skills. Join campaigns with just one click.
              </p>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">Nike Air Campaign</div>
                    <div className="text-xs text-gray-600">$15.00 reward</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Create & Submit</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Complete the required task - post, review, or share content. Submit proof of your work through our platform.
              </p>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="space-y-2">
                  <div className="h-3 bg-blue-200 rounded-full w-full"></div>
                  <div className="h-3 bg-blue-200 rounded-full w-3/4"></div>
                  <div className="text-xs text-green-600 font-semibold">✓ Submitted for review</div>
                </div>
              </div>
            </div>

            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-semibold text-black mb-4">Get Paid</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Once approved, earn cryptocurrency rewards directly to your wallet. Request payouts anytime with $10 minimum.
              </p>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Balance</span>
                  <span className="text-lg font-bold text-green-600">$127.50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="bg-green-100 text-green-800 mb-4">For Creators</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Turn Your Creativity Into Cryptocurrency</h2>
              <p className="text-xl text-gray-600 mb-8">
                Join thousands of creators earning real money by completing brand campaigns. No minimum followers required.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Complete simple social media tasks</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Earn $5-$100+ per campaign</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Get paid in cryptocurrency</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-gray-700">Build your portfolio and reputation</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                onClick={() => window.location.href = '/signup?type=creator'}
              >
                Join as Creator
              </Button>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8">
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Available Campaign</h4>
                    <Badge className="bg-green-600 text-white">$25.00</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Post about our new eco-friendly products on Instagram</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Estimated time: 10 min</span>
                    <span>12 spots left</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Your Earnings</h4>
                    <span className="text-2xl font-bold text-green-600">$247.50</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full w-3/4"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">$2.50 away from payout threshold</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 order-2 md:order-1">
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h4 className="font-semibold mb-4">Campaign Analytics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">1,247</div>
                      <div className="text-xs text-gray-500">Total Reach</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">94%</div>
                      <div className="text-xs text-gray-500">Completion Rate</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h4 className="font-semibold mb-4">Active Campaigns</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Summer Collection</span>
                      <Badge variant="outline">15 creators</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Back to School</span>
                      <Badge variant="outline">8 creators</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <Badge className="bg-blue-100 text-blue-800 mb-4">For Brands</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Reach Your Audience Through Authentic Creators</h2>
              <p className="text-xl text-gray-600 mb-8">
                Connect with creators who genuinely love your brand. Launch campaigns that drive real engagement and sales.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Access vetted creator network</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Track campaign performance</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Set your own budget and timeline</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-700">Get detailed analytics and reports</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                onClick={() => window.location.href = '/signup?type=brand'}
              >
                Join as Brand
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Why Choose Taskdrip</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional tools and secure infrastructure designed for the modern creator economy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Instant Payments</h3>
              <p className="text-gray-600 leading-relaxed">
                Get paid in BNB, SOL, AVAX, TON, TRON, and USDT. Fast approvals with same-day crypto payouts for completed tasks.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Bank-Level Security</h3>
              <p className="text-gray-600 leading-relaxed">
                Your data and earnings are protected with enterprise-grade encryption. Non-custodial wallet integration ensures safety.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Global Community</h3>
              <p className="text-gray-600 leading-relaxed">
                Join a thriving ecosystem of creators, brands, and entrepreneurs building the future of digital marketing.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="w-14 h-14 bg-yellow-500 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Performance Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Track your earnings, campaign performance, and growth metrics with detailed analytics and insights.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-100 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Verified Campaigns</h3>
              <p className="text-gray-600 leading-relaxed">
                All campaigns are verified by our team. Work with legitimate brands and avoid scams with our rigorous vetting process.
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-blue-100 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300">
              <div className="w-14 h-14 bg-cyan-500 rounded-xl flex items-center justify-center mb-6">
                <Star className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Premium Support</h3>
              <p className="text-gray-600 leading-relaxed">
                24/7 creator support with dedicated account managers for top performers. Get help when you need it most.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">Trusted by Top Creators</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what successful creators are saying about their experience with Breedskool
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 italic leading-relaxed">
                "I've earned over $5,000 in my first 3 months. The campaigns are high-quality and the payments are always on time. This platform changed my life!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                  AS
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-black">Alex Smith</div>
                  <div className="text-sm text-gray-600">Content Creator • $5,247 earned</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 italic leading-relaxed">
                "The variety of campaigns is amazing. From tech reviews to lifestyle posts, there's something for every niche. Highly recommend to all creators!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                  MJ
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-black">Maria Johnson</div>
                  <div className="text-sm text-gray-600">Lifestyle Influencer • $3,891 earned</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
              <div className="flex text-yellow-400 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 italic leading-relaxed">
                "Finally, a platform that treats creators fairly. Clear guidelines, fast approvals, and transparent payments. This is the future of creator monetization."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                  DK
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-black">David Kim</div>
                  <div className="text-sm text-gray-600">Tech Reviewer • $7,156 earned</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-blue-100 mb-12 leading-relaxed">
            Join thousands of creators who are already earning cryptocurrency by doing what they love. 
            No contracts, no commitments - just opportunities to earn.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
              <a href="/api/login" className="flex items-center">
                Create Free Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="border-white/80 text-white bg-white/10 hover:bg-white hover:text-purple-600 px-8 py-4 text-lg font-semibold backdrop-blur-sm">
              Learn More
            </Button>
          </div>
          <p className="text-blue-200 mt-8 text-sm">
            Free to join • No hidden fees • Secure payments • 24/7 support
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-2xl font-bold mb-4">Taskdrip</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Empowering creators worldwide with cryptocurrency earnings through authentic brand collaborations and task-based campaigns.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer">
                  <span className="text-white font-semibold">f</span>
                </div>
                <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors cursor-pointer">
                  <span className="text-white font-semibold">t</span>
                </div>
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors cursor-pointer">
                  <span className="text-white font-semibold">i</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Browse Campaigns</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Creator Dashboard</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">How It Works</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Creator Guide</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">API Documentation</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">About Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Careers</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-300 text-sm">&copy; 2024 Taskdrip. All rights reserved.</p>
              <p className="text-gray-300 text-sm mt-2 md:mt-0">Built for the creator economy 🚀</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}