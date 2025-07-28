import { Navigation } from "@/components/ui/navigation";
import { Hero } from "@/components/ui/hero";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      
      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Why Choose Breedskool?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The most trusted platform for creators and brands to connect, collaborate, and earn together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Targeted Campaigns</h3>
              <p className="text-gray-600">
                Find campaigns that match your niche and audience for maximum engagement and earnings.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Crypto Rewards</h3>
              <p className="text-gray-600">
                Earn in multiple cryptocurrencies including BNB, SOL, AVAX, TON, TRON, and USDT.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Secure Platform</h3>
              <p className="text-gray-600">
                Your data and earnings are protected with enterprise-grade security and encryption.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="bg-accent text-white hover:bg-blue-700" asChild>
              <a href="/api/login">Get Started Now</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-2xl font-bold mb-4">Breedskool</h3>
              <p className="text-gray-300 mb-6">
                The leading SocialFi platform connecting creators with brands for task-based campaigns and crypto rewards.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Browse Campaigns</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Create Campaign</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">How It Works</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Creator Guide</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Community</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Terms of Service</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors duration-200">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-300 text-sm">&copy; 2023 Breedskool. All rights reserved.</p>
              <p className="text-gray-300 text-sm mt-2 md:mt-0">Made with ❤️ for the creator economy</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
