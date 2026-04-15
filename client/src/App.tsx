import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { GuideBot } from "@/components/ui/guide-bot";
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
import Creators from "@/pages/creators";
import FeedPage from "@/pages/feed";
import CreatorProfile from "@/pages/creator-profile";
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
        ((user as any)?.userType === 'admin' ? AdminHome : Home) : 
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
      <Route path="/creators" component={Creators} />
      <Route path="/creators/:id" component={CreatorProfile} />
      <Route path="/profile/:id" component={UnifiedProfile} />
      <Route path="/brand/:id" component={BrandProfile} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/leaderboard" component={Leaderboard} />
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={() => {
            const userType = (user as any)?.userType;
            if (userType === 'admin') return <AdminDashboard />;
            if (userType === 'brand') return <BrandDashboard />;
            return <SimpleDashboard />;
          }} />
          <Route path="/brand-dashboard" component={BrandDashboard} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/campaigns/:id" component={CampaignDetail} />
          <Route path="/profile" component={() => {
            const userType = (user as any)?.userType;
            if (userType === 'admin') {
              return <AdminDashboard />;
            } else if (userType === 'brand') {
              return <BrandDashboard />;
            } else {
              return <Profile />;
            }
          }} />
          <Route path="/user-profile" component={UserProfile} />
          <Route path="/messages" component={Messages} />
          <Route path="/chat" component={Chat} />
          <Route path="/wallet" component={WalletSettings} />
          <Route path="/payment-deposit" component={PaymentDeposit} />
          <Route path="/profile-edit" component={ProfileEdit} />
          <Route path="/escrow-payment" component={EscrowPayment} />
          <Route path="/direct-hire/:id" component={DirectHirePayment} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUserManagement} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/courses" component={AdminCourses} />
          <Route path="/admin/payments" component={AdminPayments} />
          <Route path="/admin/ads" component={AdminAds} />
          <Route path="/admin/email" component={AdminEmail} />
          <Route path="/subscription" component={SubscriptionPage} />
          <Route path="/payout-requests" component={PayoutRequestsPage} />
          <Route path="/my-campaigns" component={MyCampaignsPage} />
          <Route path="/referrals" component={ReferralsPage} />
        </>
      ) : (
        <>
          <Route path="/dashboard" component={() => { window.location.href = '/login'; return null; }} />
          <Route path="/admin-dashboard" component={() => { window.location.href = '/login'; return null; }} />
          <Route path="/campaigns" component={() => { window.location.href = '/login'; return null; }} />
          <Route path="/profile" component={() => { window.location.href = '/login'; return null; }} />
          <Route path="/admin" component={() => { window.location.href = '/login'; return null; }} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <PWAInstallPrompt />
        <GuideBot />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
