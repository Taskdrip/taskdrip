import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Twitter, 
  Linkedin, 
  Github, 
  Mail, 
  ArrowRight,
  Home,
  Users,
  DollarSign,
  Shield,
  MessageCircle,
  Phone
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <h3 className="text-2xl font-bold">Taskdrip</h3>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              The #1 Web3 influencer marketplace — connecting verified creators with global brands. Earn USDT & TON crypto for every completed task.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Linkedin className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Github className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* For Creators */}
          <div>
            <h4 className="font-semibold mb-6 text-lg flex items-center">
              <Users className="h-5 w-5 mr-2" />
              For Creators
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/tasks" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Browse Tasks
                </Link>
              </li>
              <li>
                <Link href="/signup?type=creator" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Join as Influencer
                </Link>
              </li>
              <li>
                <Link href="/breedskool" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  BreedSkool Academy
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Wallet & Payouts
                </Link>
              </li>
            </ul>
          </div>

          {/* For Brands */}
          <div>
            <h4 className="font-semibold mb-6 text-lg flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              For Brands
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/signup?type=brand" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Launch Campaign
                </Link>
              </li>
              <li>
                <Link href="/creators" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Find Influencers
                </Link>
              </li>
              <li>
                <Link href="/brand-dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Brand Dashboard
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-6 text-lg flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Blog & Updates
                </Link>
              </li>
              <li>
                <a href="mailto:support@taskdrip.online" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <div>
              <h4 className="font-semibold text-lg mb-2">Stay Updated</h4>
              <p className="text-gray-400">Get the latest updates on new campaigns and platform features.</p>
            </div>
            <div className="flex space-x-4 w-full lg:w-auto">
              <Input 
                placeholder="Enter your email" 
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 w-full lg:w-80"
              />
              <Button className="bg-white text-black hover:bg-gray-100 px-8">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <p className="text-gray-400 text-center lg:text-left">
              © 2026 Taskdrip. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}