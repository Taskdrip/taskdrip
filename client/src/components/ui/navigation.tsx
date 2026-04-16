import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, MessageCircle, Menu, X, ChevronDown, Users } from "lucide-react";
import { SiTelegram, SiX, SiInstagram, SiFacebook, SiYoutube, SiTiktok, SiWhatsapp } from "react-icons/si";
import { SOCIALS } from "@/config/socials";
import taskedripLogo from "@assets/taskdrip_icon_logo_1775964032389.jpeg";

const communityLinks = [
  { href: SOCIALS.telegram, label: "Telegram Community", icon: SiTelegram, color: "text-[#229ED9]" },
  { href: SOCIALS.x, label: "Follow on X", icon: SiX, color: "text-gray-800" },
  { href: SOCIALS.instagram, label: "Instagram", icon: SiInstagram, color: "text-[#E1306C]" },
  { href: SOCIALS.facebook, label: "Facebook", icon: SiFacebook, color: "text-[#1877F2]" },
  { href: SOCIALS.youtube, label: "YouTube", icon: SiYoutube, color: "text-[#FF0000]" },
  { href: SOCIALS.tiktok, label: "TikTok", icon: SiTiktok, color: "text-gray-800" },
  { href: SOCIALS.whatsapp, label: "WhatsApp", icon: SiWhatsapp, color: "text-[#25D366]" },
];

export function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!isAuthenticated && !!user,
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!isAuthenticated && !!user,
    refetchInterval: 30000,
  });

  const unreadMessagesCount = Array.isArray(messages) ? messages.filter((m: any) => !m.isRead).length : 0;
  const unreadNotificationsCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/campaigns", label: "Earn Rewards" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/breedskool", label: "BreedSkool" },
    { href: "/blog", label: "Blog" },
    { href: "/shop", label: "Shop" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 group">
              <div className="flex items-center gap-2">
                <img
                  src={taskedripLogo}
                  alt="Taskdrip"
                  className="w-9 h-9 rounded-xl object-cover shadow-md group-hover:shadow-purple-300 transition-shadow duration-200"
                />
                <div>
                  <h1 className="text-xl font-extrabold leading-none bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                    Taskdrip
                  </h1>
                  <p className="text-[10px] font-medium text-purple-500 -mt-0.5 tracking-wide uppercase">Influencers Marketplace</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-baseline space-x-1 ml-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-md ${
                  isActive(item.href)
                    ? "text-black bg-gray-100"
                    : "text-gray-600 hover:text-accent hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Community Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-accent hover:bg-gray-50 rounded-md flex items-center gap-1 transition-colors duration-200">
                  <Users className="h-4 w-4" />
                  Community
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {communityLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                        <Icon className={`h-4 w-4 ${link.color}`} />
                        {link.label}
                      </a>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-accent relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-accent relative">
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(user as any)?.profileImageUrl || ""} alt={(user as any)?.firstName || ""} />
                      <AvatarFallback>
                        {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-black font-medium">
                      {(user as any)?.firstName} {(user as any)?.lastName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/security">Security</Link>
                  </DropdownMenuItem>
                  {(user as any)?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => {
                      fetch("/api/auth/logout", { method: "POST" }).then(() => {
                        window.location.href = "/";
                      });
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Button variant="outline" asChild>
                <a href="/login">Log In</a>
              </Button>
              <Button asChild className="hidden sm:flex">
                <a href="/signup">Sign Up</a>
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-accent"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-base font-medium transition-colors duration-200 rounded-md ${
                  isActive(item.href)
                    ? "text-black bg-gray-100"
                    : "text-gray-600 hover:text-accent"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Community</p>
              {communityLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-accent"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className={`h-4 w-4 ${link.color}`} />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
