import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowRight,
  Home,
  Users,
  DollarSign,
  Shield,
  MessageCircle,
  Phone,
  Megaphone,
  Mail,
  MapPin,
} from "lucide-react";
import { SiTelegram, SiX, SiInstagram, SiFacebook, SiYoutube, SiTiktok, SiWhatsapp } from "react-icons/si";
import { SOCIALS, OFFICES } from "@/config/socials";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-2xl font-bold">Taskdrip</h3>
            </div>
            <p className="text-gray-400 mb-4 leading-relaxed text-sm">
              The #1 Web3 influencer marketplace — where creators turn their reach into real crypto income. Join thousands of influencers earning USDT from top global brands, one task at a time.
            </p>

            {/* Social Icons */}
            <div className="flex flex-wrap gap-2 mb-5">
              <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#229ED9]/20 hover:bg-[#229ED9]/40 flex items-center justify-center transition-colors" title="Telegram">
                <SiTelegram className="h-4 w-4 text-[#229ED9]" />
              </a>
              <a href={SOCIALS.x} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="X (Twitter)">
                <SiX className="h-4 w-4 text-white" />
              </a>
              <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#E1306C]/20 hover:bg-[#E1306C]/40 flex items-center justify-center transition-colors" title="Instagram">
                <SiInstagram className="h-4 w-4 text-[#E1306C]" />
              </a>
              <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/40 flex items-center justify-center transition-colors" title="Facebook">
                <SiFacebook className="h-4 w-4 text-[#1877F2]" />
              </a>
              <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#FF0000]/20 hover:bg-[#FF0000]/40 flex items-center justify-center transition-colors" title="YouTube">
                <SiYoutube className="h-4 w-4 text-[#FF0000]" />
              </a>
              <a href={SOCIALS.tiktok} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="TikTok">
                <SiTiktok className="h-4 w-4 text-white" />
              </a>
              <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/40 flex items-center justify-center transition-colors" title="WhatsApp">
                <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2">
              <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-[#229ED9] px-3 py-2 rounded-lg transition-colors font-medium">
                <SiTelegram className="h-3.5 w-3.5" /> Join Telegram Community
              </a>
              <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] px-3 py-2 rounded-lg transition-colors font-medium">
                <SiWhatsapp className="h-3.5 w-3.5" /> Chat on WhatsApp
              </a>
              <a href={SOCIALS.x} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors font-medium">
                <SiX className="h-3.5 w-3.5" /> Follow on X
              </a>
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
                <Link href="/tasks" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Browse Tasks
                </Link>
              </li>
              <li>
                <Link href="/signup?type=creator" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Join as Influencer
                </Link>
              </li>
              <li>
                <Link href="/get-started" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Get Started Guide
                </Link>
              </li>
              <li>
                <Link href="/breedskool" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  BreedSkool Academy
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
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
                <Link href="/signup?type=brand" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Launch Campaign
                </Link>
              </li>
              <li>
                <Link href="/creators" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Find Influencers
                </Link>
              </li>
              <li>
                <Link href="/brand-dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Brand Dashboard
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  Messages
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm font-medium text-purple-300 hover:text-purple-200">
                  <Megaphone className="h-4 w-4 mr-2 flex-shrink-0" />
                  Advertise With Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div>
            <h4 className="font-semibold mb-6 text-lg flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Support & Contact
            </h4>
            <ul className="space-y-3 mb-6">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                  Blog & Updates
                </Link>
              </li>
              <li>
                <a href="mailto:support@taskdrip.online" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  support@taskdrip.online
                </a>
              </li>
              <li>
                <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                  {SOCIALS.whatsappNumber}
                </a>
              </li>
            </ul>

            {/* Office Addresses */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-semibold">{OFFICES.usa.name}</p>
                  <p className="text-gray-500 text-xs">{OFFICES.usa.address}</p>
                  <p className="text-gray-500 text-xs">{OFFICES.usa.city}, {OFFICES.usa.country}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-semibold">{OFFICES.nigeria.name}</p>
                  <p className="text-gray-500 text-xs">{OFFICES.nigeria.address}</p>
                  <p className="text-gray-500 text-xs">{OFFICES.nigeria.city}, {OFFICES.nigeria.country}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <div>
              <h4 className="font-semibold text-lg mb-2">Stay Updated</h4>
              <p className="text-gray-400 text-sm">Get the latest updates on new campaigns and platform features.</p>
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
            <p className="text-gray-400 text-center lg:text-left text-sm">
              © 2026 Taskdrip LLC. All rights reserved. Points = Off-chain rewards, convertible to $TDRIP token.
            </p>
            <div className="flex space-x-6">
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors text-sm">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
