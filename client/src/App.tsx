import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { GuideBot } from "@/components/ui/guide-bot";
import { SocialTasksWelcomeModal } from "@/components/ui/social-tasks-welcome-modal";
import { useAuth } from "@/hooks/useAuth";
import FinalLanding from "@/pages/final-landing";
import Home from "@/pages/home";
import AdminHome from "@/pages/admin-home";
import Dashboard from "@/pages/dashboard";
import SimpleDashboard from "@/pages/simple-dashboard";
import AdminUserManagement from "@/pages/admin-user-management";
import AdminDashboard from "@/pages/admin-master";
import BrandDashboard from "@/pages/brand-dashboard";
import Campaigns from "@/pages/campaigns";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Messages from "@/pages/messages";
import Chat from "@/pages/chat";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import Shop from "@/pages/shop";
import ProductDetail from "@/pages/product-detail";
import ShopCheckout from "@/pages/shop-checkout";
import AdminProducts from "@/pages/admin-products";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import Signup from "@/pages/signup";
import SimpleSignup from "@/pages/simple-signup";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import ForgotPassword from "@/pages/forgot-password";
import BreedSkool from "@/pages/breedskool";
import BreedSkoolCourse from "@/pages/breedskool-course";
import AdminCourses from "@/pages/admin-courses";
import CampaignDetail from "@/pages/campaign-detail";
import BrandProfile from "@/pages/brand-profile";
import WalletSettings from "@/pages/wallet-settings";
import PaymentDeposit from "@/pages/payment-deposit";
import ProfileEdit from "@/pages/profile-edit";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import EscrowPayment from "@/pages/escrow-payment";
import Influencers from "@/pages/influencers";
import FeedPage from "@/pages/feed";
import CreatorProfile from "@/pages/influencer-profile";
import Leaderboard from "@/pages/leaderboard";
import SubscriptionPage from "@/pages/subscription";
import PayoutRequestsPage from "@/pages/payout-requests";
import MyCampaignsPage from "@/pages/my-campaigns";
import ReferralsPage from "@/pages/referrals";
import UnifiedProfile from "@/pages/unified-profile";
import TasksPage from "@/pages/tasks";
import AdminPayments from "@/pages/admin-payments";
import AdminAds from "@/pages/admin-ads";
import AdminEmail from "@/pages/admin-email";
import AdvertiseWithUs from "@/pages/advertise-with-us";
import GetStarted from "@/pages/get-started";
import DirectHirePayment from "@/pages/direct-hire-payment";
import LedgerPage from "@/pages/ledger";
import SecuritySettings from "@/pages/security-settings";
import P2PHub from "@/pages/p2p-hub";
import P2PDealRoom from "@/pages/p2p-deal-room";
import P2PListing from "@/pages/p2p-listing";
import AdminP2PTransactions from "@/pages/admin-p2p-transactions";
import AdminP2PFees from "@/pages/admin-p2p-fees";
import AdminPlatformFees from "@/pages/admin-platform-fees";
import MyOrdersPage from "@/pages/my-orders";
import TDripInfoPage from "@/pages/tdrip-info";

function hasAdminDashboardAccess(user: any) {
  return user?.userType === "admin" || ["admin", "content_editor", "moderator", "store_manager"].includes(user?.role);
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? 
        (hasAdminDashboardAccess(user) ? AdminHome : Home) : 
        FinalLanding} />
      <Route path="/signup" component={SimpleSignup} />
      <Route path="/login" component={Login} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/breedskool" component={BreedSkool} />
      <Route path="/breedskool/:id" component={BreedSkoolCourse} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/product/:id" component={ProductDetail} />
      <Route path="/shop/checkout/:id" component={ShopCheckout} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/advertise" component={AdvertiseWithUs} />
      <Route path="/get-started" component={GetStarted} />
      <Route path="/influencers" component={Influencers} />
      <Route path="/influencers/:id" component={CreatorProfile} />
      <Route path="/profile/:id" component={UnifiedProfile} />
      <Route path="/brand/:id" component={BrandProfile} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/tdrip" component={TDripInfoPage} />
      <Route path="/p2p-hub" component={P2PHub} />
      <Route path="/p2p/:id" component={P2PListing} />
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={() => {
            const userType = (user as any)?.userType;
            if (hasAdminDashboardAccess(user)) return <AdminDashboard />;
            if (userType === 'brand') return <BrandDashboard />;
            return <SimpleDashboard />;
          }} />
          <Route path="/brand-dashboard" component={BrandDashboard} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/campaigns/:id" component={CampaignDetail} />
          <Route path="/profile" component={() => {
            const userType = (user as any)?.userType;
            if (hasAdminDashboardAccess(user)) {
              return <AdminDashboard />;
            } else if (userType === 'brand') {
              return <BrandDashboard />;
            } else {
              return <SimpleDashboard />;
            }
          }} />
          <Route path="/user-profile" component={UserProfile} />
          <Route path="/messages" component={Messages} />
          <Route path="/chat" component={Chat} />
          <Route path="/wallet" component={WalletSettings} />
          <Route path="/ledger" component={LedgerPage} />
          <Route path="/payment-deposit" component={PaymentDeposit} />
          <Route path="/profile-edit" component={ProfileEdit} />
          <Route path="/escrow-payment" component={EscrowPayment} />
          <Route path="/direct-hire/:id" component={DirectHirePayment} />
          <Route path="/p2p-deals" component={P2PDealRoom} />
          <Route path="/p2p-deals/:id" component={P2PDealRoom} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUserManagement} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/courses" component={AdminCourses} />
          <Route path="/admin/payments" component={AdminPayments} />
          <Route path="/admin/ads" component={AdminAds} />
          <Route path="/admin/email" component={AdminEmail} />
          <Route path="/admin/p2p-transactions" component={AdminP2PTransactions} />
          <Route path="/admin/p2p-fees" component={AdminP2PFees} />
          <Route path="/admin/platform-fees" component={AdminPlatformFees} />
          <Route path="/subscription" component={SubscriptionPage} />
          <Route path="/payout-requests" component={PayoutRequestsPage} />
          <Route path="/my-campaigns" component={MyCampaignsPage} />
          <Route path="/my-orders" component={MyOrdersPage} />
          <Route path="/referrals" component={ReferralsPage} />
          <Route path="/security" component={SecuritySettings} />
        </>
      ) : (
        <>
          <Route path="/dashboard" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/dashboard')}`; return null; }} />
          <Route path="/admin-dashboard" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/admin-dashboard')}`; return null; }} />
          <Route path="/campaigns" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/campaigns')}`; return null; }} />
          <Route path="/campaigns/:id" component={CampaignDetail} />
          <Route path="/profile" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/profile')}`; return null; }} />
          <Route path="/wallet" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/wallet')}`; return null; }} />
          <Route path="/admin" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/admin')}`; return null; }} />
          <Route path="/p2p-deals" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/p2p-deals')}`; return null; }} />
          <Route path="/p2p-deals/:id" component={() => { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; return null; }} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [location]);

  return null;
}

function DailyLoginBonus() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `tdrip_daily_login_${today}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch("/api/points/daily-login", { method: "POST", credentials: "include" }).catch(() => {});
  }, [isAuthenticated]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ScrollToTop />
        <DailyLoginBonus />
        <Router />
        <PWAInstallPrompt />
        <GuideBot />
        <SocialTasksWelcomeModal />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
