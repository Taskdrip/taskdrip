import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight mb-6">
              Connect, Create, <span className="text-accent">Earn</span> with Web3
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Join thousands of creators and brands on the leading SocialFi platform. Complete campaigns, earn crypto rewards, and build your digital reputation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-accent text-white hover:bg-blue-700">
                Start Earning Today
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-black">25,847</div>
                <div className="text-sm text-gray-600">Active Creators</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black">$2.4M</div>
                <div className="text-sm text-gray-600">Total Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black">1,250</div>
                <div className="text-sm text-gray-600">Active Campaigns</div>
              </div>
            </div>
          </div>
          
          <div className="lg:pl-12">
            {/* Modern dashboard preview */}
            <div className="bg-gray-50 rounded-2xl p-8 shadow-lg">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-black">Active Campaigns</h3>
                  <span className="text-sm text-gray-600">Updated 2 min ago</span>
                </div>
                
                {/* Campaign Cards */}
                <div className="space-y-4">
                  {/* Campaign 1 */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold">T</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-black">Nike Air Max Campaign</h4>
                        <p className="text-sm text-gray-600">Follow & Share on Twitter</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-success font-semibold">$15.00</span>
                      <Button size="sm" className="bg-accent text-white hover:bg-blue-700">
                        Join Now
                      </Button>
                    </div>
                  </div>
                  
                  {/* Campaign 2 */}
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold">I</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-black">Tech Startup Review</h4>
                        <p className="text-sm text-gray-600">Post Instagram Story</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-success font-semibold">$25.00</span>
                      <Button size="sm" className="bg-accent text-white hover:bg-blue-700">
                        Join Now
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">$127.50</div>
                    <div className="text-xs text-gray-600">This Week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-black">8</div>
                    <div className="text-xs text-gray-600">Tasks Completed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
