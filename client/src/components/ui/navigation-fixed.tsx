import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, MessageCircle, Menu, X, LogOut, User, Settings, CreditCard, DollarSign, Briefcase, Share2, Users, Landmark, Package, Wallet, CheckCheck, Megaphone, UserCheck, Target, Star, Sparkles, Crown, GraduationCap, Code2, Gift } from "lucide-react";
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

const publicMainItems = [
  { href: "/", label: "Home" },
  { href: "/tasks", label: "Tasks" },
  { href: "/shop", label: "Shop" },
  { href: "/influencers", label: "Influencers" },
  { href: "/brands", label: "Brands" },
  { href: "/breedskool", label: "BreedSkool" },
];

const secondaryMainItems = [
  { href: "/feed", label: "Feed" },
  { href: "/blog", label: "Blog" },
  { href: "/hire-developer", label: "Hire a Developer" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/tdrip", label: "$TDrip" },
  { href: "/advertise", label: "Advertise" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const NOTIF_ICONS: Record<string, any> = {
  ads_application: Megaphone,
  new_application: Briefcase,
  task_approved: CheckCheck,
  payout: DollarSign,
  verification: UserCheck,
  campaign: Target,
  message: MessageCircle,
  default: Star,
};

function NotificationPanel({ notifications, onClose, onMarkRead, onMarkAllRead }: {
  notifications: any[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const [, navigate] = useLocation();
  const unread = notifications.filter((n: any) => !n.isRead);

  const handleClick = (n: any) => {
    if (!n.isRead) onMarkRead(n.id);
    if (n.actionUrl) {
      onClose();
      navigate(n.actionUrl);
    }
  };

  return (
    <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-full mt-0 sm:mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col sm:w-96" style={{ maxHeight: "calc(100svh - 80px)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="font-bold text-sm text-gray-900">Notifications</span>
          {unread.length > 0 && <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">{unread.length}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button data-testid="button-mark-all-notifications-read" onClick={onMarkAllRead} className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> All read
            </button>
          )}
          <button data-testid="button-close-notifications" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">Important updates will appear here.</p>
          </div>
        ) : (
          notifications.map((n: any) => {
            const Icon = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                data-testid={`notification-item-${n.id}`}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors ${!n.isRead ? "bg-purple-50/60" : ""}`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${n.priority === "high" ? "bg-red-100" : "bg-purple-100"}`}>
                  <Icon className={`h-3.5 w-3.5 ${n.priority === "high" ? "text-red-600" : "text-purple-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold leading-snug ${!n.isRead ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                    {!n.isRead && <span className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-1" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.content}</p>
                  {n.createdAt && <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function NavigationFixed() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!isAuthenticated && !!user,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n: any) => !n.isRead);
      await Promise.all(unread.map((n: any) => apiRequest("PATCH", `/api/notifications/${n.id}/read`, {})));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unreadNotificationsCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  // Returns { primary: [], grouped: { GroupName: [items] } }
  // primary = always visible (top 5-6); grouped = goes into the smart "More" dropdown.
  const getNavStructure = () => {
    if (!isAuthenticated) {
      return {
        primary: publicMainItems, // all 6 items including BreedSkool
        grouped: {
          "Marketplace": [
            { href: "/p2p-hub", label: "P2P Market" },
          ],
          "Earn": [
            { href: "/referrals", label: "Referral Program" },
          ],
          "Resources": secondaryMainItems,
        },
      };
    }
    const utype = (user as any)?.userType;
    if (utype === 'brand') {
      return {
        primary: [
          { href: "/", label: "Home" },
          { href: "/brand-dashboard", label: "Dashboard" },
          { href: "/influencers", label: "Influencers" },
          { href: "/campaigns", label: "Campaigns" },
          { href: "/referrals", label: "Referrals 💰" },
        ],
        grouped: {
          "Marketplace": [
            { href: "/shop", label: "Shop" },
            { href: "/breedskool", label: "BreedSkool" },
            { href: "/p2p-hub", label: "P2P Market" },
            { href: "/feed", label: "Feed" },
            { href: "/chat", label: "Messages" },
          ],
          "Earn & Tools": [
            { href: "/wallet", label: "Wallet" },
            { href: "/short-links", label: "Short Links" },
            { href: "/leaderboard", label: "Leaderboard" },
            { href: "/tdrip", label: "$TDrip" },
          ],
          "More": secondaryMainItems,
        },
      };
    }
    if (utype === 'admin') {
      return {
        primary: [
          { href: "/", label: "Home" },
          { href: "/admin-dashboard", label: "Admin" },
          { href: "/influencers", label: "Influencers" },
          { href: "/brands", label: "Brands" },
          { href: "/campaigns", label: "Campaigns" },
          { href: "/referrals", label: "Referrals 💰" },
        ],
        grouped: {
          "Marketplace": [
            { href: "/shop", label: "Shop" },
            { href: "/p2p-hub", label: "P2P Market" },
            { href: "/feed", label: "Feed" },
            { href: "/wallet", label: "Wallet" },
          ],
          "Admin Tools": [
            { href: "/short-links", label: "Short Links" },
            { href: "/admin/url-shortener", label: "Shortener Admin" },
            { href: "/admin/keyword-analytics", label: "Keyword Analytics" },
            { href: "/admin/auto-blogger", label: "Auto Blogger" },
            { href: "/admin/cms", label: "CMS Editor" },
            { href: "/admin/seo", label: "SEO" },
            { href: "/admin/email", label: "Email" },
          ],
          "More": secondaryMainItems,
        },
      };
    }
    return {
      primary: [
        { href: "/", label: "Home" },
        { href: "/tasks", label: "Tasks" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/brands", label: "Brands" },
        { href: "/breedskool", label: "BreedSkool" },
        { href: "/referrals", label: "Referrals 💰" },
      ],
      grouped: {
        "Marketplace": [
          { href: "/shop", label: "Shop" },
          { href: "/p2p-hub", label: "P2P Market" },
          { href: "/influencers", label: "Influencers" },
          { href: "/feed", label: "Feed" },
        ],
        "Earn & Tools": [
          { href: "/wallet", label: "Wallet" },
          { href: "/leaderboard", label: "Leaderboard" },
          { href: "/short-links", label: "Short Links" },
          { href: "/tdrip", label: "$TDrip" },
        ],
        "More": secondaryMainItems.filter((s) => !["/leaderboard", "/tdrip"].includes(s.href)),
      },
    };
  };

  const { primary: navItems, grouped: moreGroups } = getNavStructure();
  const moreItems = Object.values(moreGroups).flat();

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
    <>
    <AnnouncementBanner />
    <nav className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-50 shadow-sm before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-violet-400/40 before:to-transparent">
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
          <div className="hidden lg:block flex-1 mx-3 overflow-visible">
            <div className="flex items-center gap-1 xl:gap-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`link-header-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className={`px-3 py-1.5 text-xs xl:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-300 ${
                    isActive(item.href)
                      ? "text-violet-700 bg-violet-50 shadow-[0_0_18px_rgba(139,92,246,0.45)]"
                      : "text-gray-700 hover:text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_18px_rgba(139,92,246,0.55)] hover:-translate-y-0.5"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {moreItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-testid="button-header-more"
                      className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs xl:text-sm font-semibold text-gray-700 hover:text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_18px_rgba(139,92,246,0.55)] hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
                    >
                      More
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 p-2 max-h-[70vh] overflow-y-auto">
                    {Object.entries(moreGroups).map(([groupName, items], gIdx) => (
                      items.length > 0 && (
                        <div key={groupName}>
                          {gIdx > 0 && <DropdownMenuSeparator className="my-1" />}
                          <p className="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-violet-600 uppercase">{groupName}</p>
                          <div className="grid grid-cols-2 gap-1">
                            {items.map((item) => (
                              <DropdownMenuItem key={item.href} asChild className="rounded-md">
                                <Link
                                  href={item.href}
                                  data-testid={`link-header-more-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                                  className="w-full text-xs font-medium"
                                >
                                  {item.label}
                                </Link>
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
            {/* Hire a Developer — always visible on desktop */}
            <Link href="/hire-developer" className="hidden sm:block">
              <button
                data-testid="button-hire-developer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm transition-all whitespace-nowrap"
              >
                <Code2 className="h-3.5 w-3.5" />
                Hire Dev
              </button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Animated upgrade button — only for free non-admin users */}
                {(user as any)?.subscriptionStatus !== "active" && (user as any)?.userType !== "admin" && (
                  <Link href="/subscription" className="hidden sm:block">
                    <button
                      data-testid="button-go-premium"
                      className={`
                        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold
                        ${(user as any)?.userType === "brand"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 btn-glow-amber"
                          : "bg-gradient-to-r from-purple-600 to-indigo-600 btn-glow-purple"}
                        overflow-hidden
                      `}
                    >
                      <span className="upgrade-shimmer absolute inset-0 pointer-events-none" />
                      {(user as any)?.userType === "brand"
                        ? <Crown className="w-3.5 h-3.5 relative z-10" />
                        : <Sparkles className="w-3.5 h-3.5 relative z-10" />}
                      <span className="relative z-10">Go Premium</span>
                    </button>
                  </Link>
                )}

                <div className="relative" ref={notifRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="button-notifications"
                    className="text-gray-600 hover:text-black h-8 w-8 sm:h-9 sm:w-9 relative"
                    onClick={() => setShowNotifPanel(v => !v)}
                  >
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                    {unreadNotificationsCount > 0 && (
                      <span data-testid="status-unread-notifications" className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold">
                        {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                      </span>
                    )}
                  </Button>
                  {showNotifPanel && (
                    <NotificationPanel
                      notifications={notifications}
                      onClose={() => setShowNotifPanel(false)}
                      onMarkRead={(id) => markReadMutation.mutate(id)}
                      onMarkAllRead={() => markAllReadMutation.mutate()}
                    />
                  )}
                </div>
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
                      <Link href="/wallet" className="flex items-center w-full">
                        <Wallet className="mr-2 h-4 w-4" /><span>Wallet Bank</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/ledger" className="flex items-center w-full">
                        <Landmark className="mr-2 h-4 w-4" /><span>Ledger</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/my-training" className="flex items-center w-full">
                        <GraduationCap className="mr-2 h-4 w-4" /><span>My Training</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/my-orders" className="flex items-center w-full">
                        <Package className="mr-2 h-4 w-4" /><span>My Orders</span>
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
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 font-medium cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4 text-red-600" /><span>Log Out</span>
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
                  data-testid={`link-mobile-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
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
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`link-mobile-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
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

              {/* Hire Developer CTA — mobile */}
              <Link
                href="/hire-developer"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 mx-2 mt-1 mb-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-violet-400 font-bold text-sm"
                data-testid="link-mobile-hire-developer"
              >
                <Code2 className="h-4 w-4" />
                Hire a Developer
              </Link>

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
    </>
  );
}
