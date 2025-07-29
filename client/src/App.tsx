import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import FinalLanding from "@/pages/final-landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import SimpleDashboard from "@/pages/simple-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import BrandDashboard from "@/pages/brand-dashboard";
import Campaigns from "@/pages/campaigns";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Messages from "@/pages/messages";
import Blog from "@/pages/blog";
import Shop from "@/pages/shop";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import Signup from "@/pages/signup";
import SimpleSignup from "@/pages/simple-signup";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import CampaignDetail from "@/pages/campaign-detail";
import WalletSettings from "@/pages/wallet-settings";
import ProfileEdit from "@/pages/profile-edit";
import About from "@/pages/about";
import Contact from "@/pages/contact";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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
      <Route path="/" component={isAuthenticated ? Home : FinalLanding} />
      <Route path="/signup" component={SimpleSignup} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/blog" component={Blog} />
      <Route path="/shop" component={Shop} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={SimpleDashboard} />
          <Route path="/brand-dashboard" component={BrandDashboard} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/campaigns/:id" component={CampaignDetail} />
          <Route path="/profile" component={Profile} />
          <Route path="/user-profile" component={UserProfile} />
          <Route path="/messages" component={Messages} />
          <Route path="/wallet" component={WalletSettings} />
          <Route path="/profile-edit" component={ProfileEdit} />
          <Route path="/admin" component={Admin} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
