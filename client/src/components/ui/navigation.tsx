import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, MessageCircle, Menu, X, ChevronDown, Users, CheckCheck, Megaphone, DollarSign, UserCheck, Target, Star, AlertCircle } from "lucide-react";
import { SiTelegram, SiX, SiInstagram, SiFacebook, SiYoutube, SiTiktok, SiWhatsapp } from "react-icons/si";
import { SOCIALS } from "@/config/socials";
import taskedripLogo from "@assets/taskdrip_icon_logo_1775964032389.jpeg";

const NOTIF_ICONS: Record<string, any> = {
  ads_application: Megaphone,
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
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden" style={{ maxHeight: "480px", display: "flex", flexDirection: "column" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-600" />
          <span className="font-bold text-sm text-gray-900">Notifications</span>
          {unread.length > 0 && (
            <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">{unread.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button onClick={onMarkAllRead} className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> All read
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">We'll notify you of important updates here</p>
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
                <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${n.priority === 'high' ? "bg-red-100" : "bg-purple-100"}`}>
                  <Icon className={`h-3.5 w-3.5 ${n.priority === 'high' ? "text-red-600" : "text-purple-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold leading-snug ${!n.isRead ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                    {!n.isRead && <span className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-1" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.content}</p>
                  {n.createdAt && (
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex-shrink-0">
          <Link href="/dashboard" onClick={onClose}>
            <button className="w-full text-xs text-center text-purple-600 hover:text-purple-800 font-semibold">View all in Dashboard →</button>
          </Link>
        </div>
      )}
    </div>
  );
}

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

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = (notifications as any[]).filter((n: any) => !n.isRead);
      await Promise.all(unread.map((n: any) => apiRequest("PATCH", `/api/notifications/${n.id}/read`, {})));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const unreadMessagesCount = Array.isArray(messages) ? messages.filter((m: any) => !m.isRead).length : 0;
  const unreadNotificationsCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/campaigns", label: "Earn Rewards" },
    { href: "/p2p-hub", label: "P2P Market" },
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
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-notifications"
                  className="text-gray-600 hover:text-accent relative"
                  onClick={() => setShowNotifPanel(v => !v)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </Button>
                {showNotifPanel && (
                  <NotificationPanel
                    notifications={notifications as any[]}
                    onClose={() => setShowNotifPanel(false)}
                    onMarkRead={(id) => markReadMutation.mutate(id)}
                    onMarkAllRead={() => markAllReadMutation.mutate()}
                  />
                )}
              </div>
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
