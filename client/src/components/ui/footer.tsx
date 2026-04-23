import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  ShoppingBag,
  BookOpen,
  Newspaper,
  Trophy,
  Store,
  ExternalLink,
  CheckCircle,
  Loader2,
  Link2,
} from "lucide-react";
import { SiTelegram, SiX, SiInstagram, SiFacebook, SiYoutube, SiTiktok, SiWhatsapp, SiDiscord, SiLinkedin } from "react-icons/si";
import { SOCIALS, OFFICES } from "@/config/socials";

const PLATFORM_ICON_MAP: Record<string, React.ReactNode> = {
  twitter: <SiX className="h-4 w-4 text-white" />,
  instagram: <SiInstagram className="h-4 w-4 text-[#E1306C]" />,
  telegram: <SiTelegram className="h-4 w-4 text-[#229ED9]" />,
  youtube: <SiYoutube className="h-4 w-4 text-[#FF0000]" />,
  tiktok: <SiTiktok className="h-4 w-4 text-white" />,
  discord: <SiDiscord className="h-4 w-4 text-[#5865F2]" />,
  facebook: <SiFacebook className="h-4 w-4 text-[#1877F2]" />,
  linkedin: <SiLinkedin className="h-4 w-4 text-[#0A66C2]" />,
  whatsapp: <SiWhatsapp className="h-4 w-4 text-[#25D366]" />,
};

const PLATFORM_BG_MAP: Record<string, string> = {
  twitter: "bg-white/10 hover:bg-white/20",
  instagram: "bg-[#E1306C]/20 hover:bg-[#E1306C]/40",
  telegram: "bg-[#229ED9]/20 hover:bg-[#229ED9]/40",
  youtube: "bg-[#FF0000]/20 hover:bg-[#FF0000]/40",
  tiktok: "bg-white/10 hover:bg-white/20",
  discord: "bg-[#5865F2]/20 hover:bg-[#5865F2]/40",
  facebook: "bg-[#1877F2]/20 hover:bg-[#1877F2]/40",
  linkedin: "bg-[#0A66C2]/20 hover:bg-[#0A66C2]/40",
  whatsapp: "bg-[#25D366]/20 hover:bg-[#25D366]/40",
};

export function Footer() {
  const { toast } = useToast();
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: (email: string) => apiRequest("POST", "/api/subscribe", { email, source: "footer" }),
    onSuccess: async (res) => {
      const data = await res.json();
      setSubscribed(true);
      setSubscribeEmail("");
      toast({ title: "Subscribed!", description: data.message || "Welcome to the Taskdrip newsletter." });
    },
    onError: () => {
      toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
    },
  });

  const handleSubscribe = () => {
    if (!subscribeEmail.trim()) return;
    subscribeMutation.mutate(subscribeEmail.trim());
  };

  const { data: siteLinks = [] } = useQuery<any[]>({
    queryKey: ["/api/site-social-links"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: cmsColumns = [] } = useQuery<any[]>({
    queryKey: ["/api/footer-columns"],
    staleTime: 5 * 60 * 1000,
  });

  const activeColumns = (cmsColumns as any[]).filter((c: any) => c.isActive !== false);

  const footerLinks = (siteLinks as any[]).filter(
    (l: any) => l.isActive && (l.placement === "footer" || l.placement === "both")
  );

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-12 mb-12 ${activeColumns.length > 0 ? `md:grid-cols-${Math.min(activeColumns.length + 1, 5)}` : "md:grid-cols-4"}`}>
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-2xl font-bold">Taskdrip</h3>
            </div>
            <p className="text-gray-400 mb-4 leading-relaxed text-sm">
              The #1 Web3 influencer marketplace — where influencers turn their reach into real crypto income. Join 15,000+ influencers earning USDT from top global brands through campaigns, direct hire, P2P trading, and more.
            </p>

            {/* Social Icons — DB-driven if available, else static fallback */}
            <div className="flex flex-wrap gap-2 mb-5">
              {footerLinks.length > 0 ? (
                footerLinks.map((link: any) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.label}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${PLATFORM_BG_MAP[link.platform] || "bg-white/10 hover:bg-white/20"}`}
                    data-testid={`footer-social-${link.platform}`}
                  >
                    {PLATFORM_ICON_MAP[link.platform] || <span className="text-xs">{link.iconEmoji || "🔗"}</span>}
                  </a>
                ))
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* CTA Buttons — use DB links if set, else static */}
            <div className="flex flex-col gap-2">
              {footerLinks.length > 0 ? (
                footerLinks.slice(0, 3).map((link: any) => (
                  <a
                    key={`cta-${link.id}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors font-medium ${PLATFORM_BG_MAP[link.platform] || "bg-white/10 hover:bg-white/20"} text-white`}
                    data-testid={`footer-cta-${link.platform}`}
                  >
                    {PLATFORM_ICON_MAP[link.platform] || <span>{link.iconEmoji}</span>}
                    {link.label}
                  </a>
                ))
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Dynamic CMS columns OR hardcoded fallback */}
          {activeColumns.length > 0 ? (
            activeColumns.map((col: any) => (
              <div key={col.id} data-testid={`footer-cms-col-${col.id}`}>
                <h4 className="font-semibold mb-6 text-lg">{col.title}</h4>
                <ul className="space-y-3">
                  {Array.isArray(col.links) && col.links.map((link: any, idx: number) => (
                    <li key={idx}>
                      {link.isExternal ? (
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"
                          data-testid={`link-footer-${col.id}-${idx}`}>
                          <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                          {link.label}
                          <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                        </a>
                      ) : (
                        <Link href={link.url}
                          className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"
                          data-testid={`link-footer-${col.id}-${idx}`}>
                          <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <>
              {/* For Influencers — fallback */}
              <div>
                <h4 className="font-semibold mb-6 text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  For Influencers
                </h4>
                <ul className="space-y-3">
                  <li><Link href="/shop" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-shop"><ShoppingBag className="h-4 w-4 mr-2 flex-shrink-0" />Shop</Link></li>
                  <li><Link href="/tasks" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-tasks"><ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />Browse Tasks</Link></li>
                  <li><Link href="/signup?type=creator" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"><ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />Join as Influencer</Link></li>
                  <li><Link href="/breedskool" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-breedskool"><BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />BreedSkool Academy</Link></li>
                  <li><Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-leaderboard"><Trophy className="h-4 w-4 mr-2 flex-shrink-0" />Leaderboard</Link></li>
                  <li><Link href="/wallet" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"><DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />Wallet & Payouts</Link></li>
                  <li><Link href="/referrals" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"><Users className="h-4 w-4 mr-2 flex-shrink-0" />Referral Program</Link></li>
                  <li><Link href="/feed" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"><Newspaper className="h-4 w-4 mr-2 flex-shrink-0" />Social Feed</Link></li>
                  <li><Link href="/short-links" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-short-links"><Link2 className="h-4 w-4 mr-2 flex-shrink-0" />URL Shortener</Link></li>
                </ul>
              </div>

              {/* For Brands — fallback */}
              <div>
                <h4 className="font-semibold mb-6 text-lg flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  For Brands
                </h4>
                <ul className="space-y-3">
                  <li><Link href="/signup?type=brand" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"><ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />Launch Campaign</Link></li>
                  <li><Link href="/influencers" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-influencers"><Users className="h-4 w-4 mr-2 flex-shrink-0" />Find Influencers</Link></li>
                  <li><Link href="/p2p-hub" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-p2p-market"><Store className="h-4 w-4 mr-2 flex-shrink-0" />P2P Market</Link></li>
                  <li><Link href="/feed" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-feed"><Newspaper className="h-4 w-4 mr-2 flex-shrink-0" />Social Feed</Link></li>
                  <li><Link href="/advertise" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm font-medium text-purple-300 hover:text-purple-200" data-testid="link-footer-advertise"><Megaphone className="h-4 w-4 mr-2 flex-shrink-0" />Advertise With Us</Link></li>
                </ul>
              </div>

              {/* Support & Contact — fallback */}
              <div>
                <h4 className="font-semibold mb-6 text-lg flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Support & Contact
                </h4>
                <ul className="space-y-3 mb-6">
                  <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-about"><ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />About Us</Link></li>
                  <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-contact"><ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />Contact Support</Link></li>
                  <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm" data-testid="link-footer-blog"><ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />Blog & Updates</Link></li>
                  <li><a href="mailto:support@taskdrip.online" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"><Mail className="h-4 w-4 mr-2 flex-shrink-0" />support@taskdrip.online</a></li>
                  <li><a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors flex items-center text-sm"><Phone className="h-4 w-4 mr-2 flex-shrink-0" />{SOCIALS.whatsappNumber}</a></li>
                </ul>
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
            </>
          )}
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            <div>
              <h4 className="font-semibold text-lg mb-2">Stay Updated</h4>
              <p className="text-gray-400 text-sm">Get campaign alerts, earning tips, and platform updates — straight to your inbox.</p>
            </div>
            {subscribed ? (
              <div className="flex items-center gap-2 text-green-400 font-medium" data-testid="status-subscribed">
                <CheckCircle className="h-5 w-5" />
                <span>You're subscribed! Check your inbox.</span>
              </div>
            ) : (
              <div className="flex space-x-3 w-full lg:w-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={subscribeEmail}
                  onChange={e => setSubscribeEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubscribe()}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 w-full lg:w-80"
                  data-testid="input-subscribe-email"
                  disabled={subscribeMutation.isPending}
                />
                <Button
                  onClick={handleSubscribe}
                  disabled={subscribeMutation.isPending || !subscribeEmail.trim()}
                  className="bg-white text-black hover:bg-gray-100 px-8 shrink-0"
                  data-testid="btn-subscribe"
                >
                  {subscribeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <p className="text-gray-400 text-center lg:text-left text-sm">
              © 2026 Taskdrip LLC. All rights reserved. Points = Off-chain rewards, convertible to $TDRIP token.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors text-sm">
                Cookie Policy
              </Link>
              <Link href="/disclaimer" className="text-gray-400 hover:text-white transition-colors text-sm">
                Disclaimer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
