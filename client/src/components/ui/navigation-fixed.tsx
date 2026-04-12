import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bell, MessageCircle, Menu, X, LogOut, User, Settings, CreditCard, DollarSign, Briefcase, Share2 } from "lucide-react";
import taskedripLogo from "@assets/taskdrip_icon_logo_1775964032389.jpeg";

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
          { href: "/breedskool", label: "BreedSkool" },
        ];
      } else {
        return [
          { href: "/", label: "Home" },
          { href: "/campaigns", label: "Tasks" },
          { href: "/breedskool", label: "BreedSkool" },
          { href: "/dashboard", label: "Dashboard" },
          { href: "/feed", label: "Feed" },
          { href: "/creators", label: "Influencers" },
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/chat", label: "Messages" },
          { href: "/shop", label: "Shop" },
        ];
      }
    } else {
      return [
        { href: "/", label: "Home" },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-2">
          {/* Logo */}
          <div className="flex-shrink-0">
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
          <div className="hidden lg:block flex-1 mx-6 overflow-x-hidden">
            <div className="flex items-baseline space-x-1 xl:space-x-4">
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

          {/* Right side */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-auto">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="icon" className="text-gray-600 hover:text-black">
                  <Bell className="h-5 w-5" />
                </Button>
                <Link href="/chat">
                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-black">
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName || "User"} />
                        <AvatarFallback className="bg-black text-white">
                          {(user as any)?.firstName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem onClick={() => {
                      const userType = (user as any)?.userType;
                      if (userType === 'admin') {
                        window.location.href = '/admin-dashboard';
                      } else if (userType === 'brand') {
                        window.location.href = '/brand-dashboard';
                      } else {
                        window.location.href = '/dashboard';
                      }
                    }}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/chat" className="flex items-center w-full">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span>Messages</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/user-profile" className="flex items-center w-full">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/profile-edit" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    {(user as any)?.userType === 'creator' && (
                      <DropdownMenuItem>
                        <Link href="/my-campaigns" className="flex items-center w-full">
                          <Briefcase className="mr-2 h-4 w-4" />
                          <span>My Campaigns</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Link href="/payout-requests" className="flex items-center w-full">
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span>Payout Requests</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/referrals" className="flex items-center w-full">
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Referrals</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/subscription" className="flex items-center w-full">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Subscription</span>
                      </Link>
                    </DropdownMenuItem>
                    {(user as any)?.role === 'admin' && (
                      <DropdownMenuItem>
                        <Link href="/admin-dashboard" className="flex items-center w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button 
                    variant="ghost" 
                    className="text-black hover:bg-gray-100"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-black text-white hover:bg-gray-800">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium ${
                    isActive(item.href)
                      ? "text-black bg-gray-100"
                      : "text-gray-600 hover:text-black hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-3 py-2 text-base font-medium bg-black text-white hover:bg-gray-800 rounded-md mx-3"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}