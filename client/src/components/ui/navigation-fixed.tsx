import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, MessageCircle, Menu, X, LogOut, User, Settings, CreditCard, DollarSign, Briefcase, Share2, Users, Landmark } from "lucide-react";
import { SiTelegram, SiWhatsapp, SiX, SiInstagram, SiFacebook, SiYoutube, SiTiktok } from "react-icons/si";
import { SOCIALS } from "@/config/socials";
import taskedripLogo from "@assets/taskdrip_icon_logo_1775964032389.jpeg";

const socialLinks = [
  { href: SOCIALS.telegram, icon: SiTelegram, color: "#229ED9", label: "Telegram" },
  { href: SOCIALS.whatsapp, icon: SiWhatsapp, color: "#25D366", label: "WhatsApp" },
  { href: SOCIALS.x, icon: SiX, color: "#111111", label: "X" },
  { href: SOCIALS.instagram, icon: SiInstagram, color: "#E1306C", label: "Instagram" },
  { href: SOCIALS.facebook, icon: SiFacebook, color: "#1877F2", label: "Facebook" },
  { href: SOCIALS.youtube, icon: SiYoutube, color: "#FF0000", label: "YouTube" },
  { href: SOCIALS.tiktok, icon: SiTiktok, color: "#010101", label: "TikTok" },
];

export function NavigationFixed() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getNavItems = () => {
    if (isAuthenticated) {
      if ((user as any)?.userType === 'brand') {
        return [
          { href: "/", label: "Home" },
          { href: "/brand-dashboard", label: "Dashboard" },
          { href: "/creators", label: "Find Influencers" },
          { href: "/campaigns", label: "Campaigns" },
          { href: "/p2p-hub", label: "P2P Market" },
          { href: "/ledger", label: "Ledger" },
          { href: "/feed", label: "Feed" },
          { href: "/chat", label: "Messages" },
          { href: "/shop", label: "Shop" },
        ];
      } else if ((user as any)?.userType === 'admin') {
        return [
          { href: "/", label: "Home" },
          { href: "/admin-dashboard", label: "Admin" },
          { href: "/creators", label: "Creators" },
          { href: "/campaigns", label: "Campaigns" },
          { href: "/p2p-hub", label: "P2P Market" },
          { href: "/ledger", label: "Ledger" },
          { href: "/breedskool", label: "BreedSkool" },
        ];
      } else {
        return [
          { href: "/", label: "Home" },
          { href: "/tasks", label: "Tasks" },
          { href: "/breedskool", label: "BreedSkool" },
          { href: "/p2p-hub", label: "P2P Market" },
          { href: "/dashboard", label: "Dashboard" },
          { href: "/ledger", label: "Ledger" },
          { href: "/feed", label: "Feed" },
          { href: "/creators", label: "Influencers" },
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/shop", label: "Shop" },
        ];
      }
    } else {
      return [
        { href: "/", label: "Home" },
        { href: "/tasks", label: "Tasks" },
        { href: "/p2p-hub", label: "P2P Market" },
        { href: "/creators", label: "Influencers" },
        { href: "/breedskool", label: "BreedSkool" },
        { href: "/feed", label: "Feed" },
        { href: "/blog", label: "Blog" },
        { href: "/shop", label: "Shop" },
      ];
    }
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/";
    });
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 sm:h-16 gap-2">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 group">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <img
                src={taskedripLogo}
                alt="Taskdrip"
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl object-cover shadow-md group-hover:shadow-purple-300 transition-shadow duration-200"
              />
              <div>
                <h1 className="text-base sm:text-xl font-extrabold leading-none bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                  Taskdrip
                </h1>
                <p className="hidden sm:block text-[10px] font-medium text-purple-500 -mt-0.5 tracking-wide uppercase">Influencers Marketplace</p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:block flex-1 mx-4 overflow-x-hidden">
            <div className="flex items-center space-x-1 xl:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2 xl:px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                    isActive(item.href)
                      ? "text-black border-b-2 border-black"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social Icons Strip (desktop only) */}
          <div className="hidden xl:flex items-center gap-1 border-l border-gray-200 pl-3 mr-1">
            {socialLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.label}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: link.color }} />
                </a>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-black h-8 w-8 sm:h-9 sm:w-9">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Link href="/chat">
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-black h-8 w-8 sm:h-9 sm:w-9">
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName || "User"} />
                        <AvatarFallback className="bg-black text-white text-xs">
                          {(user as any)?.firstName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="px-2 py-1.5 border-b border-gray-100 mb-1">
                      <p className="text-xs font-semibold text-gray-900">{(user as any)?.firstName} {(user as any)?.lastName}</p>
                      {(user as any)?.totalPoints !== undefined && (
                        <p className="text-xs text-purple-600 font-medium">⚡ {(user as any)?.totalPoints || 0} pts · {(user as any)?.level || 'Starter'}</p>
                      )}
                    </div>
                    <DropdownMenuItem onClick={() => {
                      const userType = (user as any)?.userType;
                      if (userType === 'admin') window.location.href = '/admin-dashboard';
                      else if (userType === 'brand') window.location.href = '/brand-dashboard';
                      else window.location.href = '/dashboard';
                    }}>
                      <User className="mr-2 h-4 w-4" /><span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/chat" className="flex items-center w-full">
                        <MessageCircle className="mr-2 h-4 w-4" /><span>Messages</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/user-profile" className="flex items-center w-full">
                        <User className="mr-2 h-4 w-4" /><span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/profile-edit" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4" /><span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    {(user as any)?.userType === 'creator' && (
                      <DropdownMenuItem>
                        <Link href="/my-campaigns" className="flex items-center w-full">
                          <Briefcase className="mr-2 h-4 w-4" /><span>My Campaigns</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Link href="/ledger" className="flex items-center w-full">
                        <Landmark className="mr-2 h-4 w-4" /><span>Ledger</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/payout-requests" className="flex items-center w-full">
                        <DollarSign className="mr-2 h-4 w-4" /><span>Payout Requests</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/referrals" className="flex items-center w-full">
                        <Share2 className="mr-2 h-4 w-4" /><span>Referrals</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/leaderboard" className="flex items-center w-full">
                        <Users className="mr-2 h-4 w-4" /><span>Leaderboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/subscription" className="flex items-center w-full">
                        <CreditCard className="mr-2 h-4 w-4" /><span>Subscription</span>
                      </Link>
                    </DropdownMenuItem>
                    {(user as any)?.role === 'admin' && (
                      <DropdownMenuItem>
                        <Link href="/admin-dashboard" className="flex items-center w-full">
                          <Settings className="mr-2 h-4 w-4" /><span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Log In — visible from sm up */}
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="text-black hover:bg-gray-100 text-sm px-3">
                    Log In
                  </Button>
                </Link>
                {/* Sign Up — visible from sm up */}
                <Link href="/signup" className="hidden sm:block">
                  <Button size="sm" className="bg-black text-white hover:bg-gray-800 text-sm px-3">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile menu button — always visible on <lg */}
            <button
              data-testid="button-mobile-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    isActive(item.href)
                      ? "text-black bg-gray-100 font-bold"
                      : "text-gray-700 hover:text-black hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Auth buttons in mobile menu */}
              {!isAuthenticated && (
                <div className="pt-2 pb-1 px-2 border-t border-gray-100 mt-2 flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button variant="outline" className="w-full font-semibold" data-testid="button-mobile-login">
                      Log In
                    </Button>
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button className="w-full bg-black text-white hover:bg-gray-800 font-semibold" data-testid="button-mobile-signup">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Social Links */}
              <div className="px-2 pt-3 pb-1 border-t border-gray-100 mt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Follow Us</p>
                <div className="grid grid-cols-4 gap-2">
                  {socialLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5" style={{ color: link.color }} />
                        <span className="text-[10px] text-gray-500 font-medium">{link.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
