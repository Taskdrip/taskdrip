import { useEffect, Component, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { GuideBot } from "@/components/ui/guide-bot";
import { SocialTasksWelcomeModal } from "@/components/ui/social-tasks-welcome-modal";
import { useAuth } from "@/hooks/useAuth";
import { GlobalSeo, RouteSeo } from "@/components/GlobalSeo";

const FinalLanding = lazy(() => import("@/pages/final-landing"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const SimpleDashboard = lazy(() => import("@/pages/simple-dashboard"));
const AdminUserManagement = lazy(() => import("@/pages/admin-user-management"));
const AdminDashboard = lazy(() => import("@/pages/admin-master"));
const BrandDashboard = lazy(() => import("@/pages/brand-dashboard"));
const Campaigns = lazy(() => import("@/pages/campaigns"));
const Profile = lazy(() => import("@/pages/profile"));
const UserProfile = lazy(() => import("@/pages/user-profile"));
const Messages = lazy(() => import("@/pages/messages"));
const Chat = lazy(() => import("@/pages/chat"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const Shop = lazy(() => import("@/pages/shop"));
const ProductDetail = lazy(() => import("@/pages/product-detail"));
const ShopCheckout = lazy(() => import("@/pages/shop-checkout"));
const AdminProducts = lazy(() => import("@/pages/admin-products"));
const Admin = lazy(() => import("@/pages/admin"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Signup = lazy(() => import("@/pages/signup"));
const SimpleSignup = lazy(() => import("@/pages/simple-signup"));
const Login = lazy(() => import("@/pages/login"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const BreedSkool = lazy(() => import("@/pages/breedskool"));
const BreedSkoolCampaign = lazy(() => import("@/pages/breedskool-campaign"));
const BreedSkoolOnsite = lazy(() => import("@/pages/breedskool-onsite"));
const BreedSkoolCourse = lazy(() => import("@/pages/breedskool-course"));
const CourseLearn = lazy(() => import("@/pages/course-learn"));
const CourseCertificate = lazy(() => import("@/pages/course-certificate"));
const CertificateVerify = lazy(() => import("@/pages/certificate-verify"));
const AdminCourses = lazy(() => import("@/pages/admin-courses"));
const AdminCertificateTemplate = lazy(() => import("@/pages/admin-certificate-template"));
const CampaignDetail = lazy(() => import("@/pages/campaign-detail"));
const BrandProfile = lazy(() => import("@/pages/brand-profile"));
const WalletSettings = lazy(() => import("@/pages/wallet-settings"));
const PaymentDeposit = lazy(() => import("@/pages/payment-deposit"));
const ProfileEdit = lazy(() => import("@/pages/profile-edit"));
const BrandProfileEdit = lazy(() => import("@/pages/brand-profile-edit"));
const ProfileByUsername = lazy(() => import("@/pages/profile-by-username"));
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const EscrowPayment = lazy(() => import("@/pages/escrow-payment"));
const Influencers = lazy(() => import("@/pages/influencers"));
const BrandsPage = lazy(() => import("@/pages/brands"));
const FeedPage = lazy(() => import("@/pages/feed"));
const CreatorProfile = lazy(() => import("@/pages/influencer-profile"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const SubscriptionPage = lazy(() => import("@/pages/subscription"));
const PayoutRequestsPage = lazy(() => import("@/pages/payout-requests"));
const MyCampaignsPage = lazy(() => import("@/pages/my-campaigns"));
const ReferralsPage = lazy(() => import("@/pages/referrals"));
const UnifiedProfile = lazy(() => import("@/pages/unified-profile"));
const TasksPage = lazy(() => import("@/pages/tasks"));
const AdminPayments = lazy(() => import("@/pages/admin-payments"));
const AdminAds = lazy(() => import("@/pages/admin-ads"));
const AdminEmail = lazy(() => import("@/pages/admin-email"));
const AdminActivityHistory = lazy(() => import("@/pages/admin-activity-history"));
const AdvertiseWithUs = lazy(() => import("@/pages/advertise-with-us"));
const GetStarted = lazy(() => import("@/pages/get-started"));
const DirectHirePayment = lazy(() => import("@/pages/direct-hire-payment"));
const HireDeveloper = lazy(() => import("@/pages/hire-developer"));
const LedgerPage = lazy(() => import("@/pages/ledger"));
const SecuritySettings = lazy(() => import("@/pages/security-settings"));
const ShortLinksPage = lazy(() => import("@/pages/short-links"));
const ShortLinkAnalyticsPage = lazy(() => import("@/pages/short-link-analytics"));
const AdminUrlShortenerPage = lazy(() => import("@/pages/admin-url-shortener"));
const AdminKeywordAnalyticsPage = lazy(() => import("@/pages/admin-keyword-analytics"));
const AdminAutoBloggerPage = lazy(() => import("@/pages/admin-auto-blogger"));
const P2PHub = lazy(() => import("@/pages/p2p-hub"));
const P2PDealRoom = lazy(() => import("@/pages/p2p-deal-room"));
const P2PListing = lazy(() => import("@/pages/p2p-listing"));
const AdminP2PTransactions = lazy(() => import("@/pages/admin-p2p-transactions"));
const AdminP2PFees = lazy(() => import("@/pages/admin-p2p-fees"));
const AdminPlatformFees = lazy(() => import("@/pages/admin-platform-fees"));
const MyOrdersPage = lazy(() => import("@/pages/my-orders"));
const OrderDetailPage = lazy(() => import("@/pages/order-detail"));
const TDripInfoPage = lazy(() => import("@/pages/tdrip-info"));
const DocumentationPage = lazy(() => import("@/pages/documentation"));
const RoadmapPage = lazy(() => import("@/pages/roadmap"));
const AdminSpotlight = lazy(() => import("@/pages/admin-spotlight"));
const AdminCMSEditor = lazy(() => import("@/pages/admin-cms-editor"));
const AdminBreedSkoolCampaign = lazy(() => import("@/pages/admin-breedskool-campaign"));
const AdminPortfolio = lazy(() => import("@/pages/admin-portfolio"));
const AbrahamPortfolio = lazy(() => import("@/pages/abraham-portfolio"));
const OlajumokePortfolio = lazy(() => import("@/pages/olajumoke-owoeye"));
const CreatorPortfolio = lazy(() => import("@/pages/creator-portfolio"));
const AdminSEO = lazy(() => import("@/pages/admin-seo"));
const AdminSeoIntelligence = lazy(() => import("@/pages/admin-seo-intelligence"));
const AdminLeads = lazy(() => import("@/pages/admin-leads"));
const AdminLeadDetail = lazy(() => import("@/pages/admin-lead-detail"));
const AdminInfluencerCRM = lazy(() => import("@/pages/admin-influencer-crm"));
const LegalPageTemplate = lazy(() =>
  import("@/pages/legal-page").then((m) => ({ default: m.LegalPageTemplate }))
);
const MyTraining = lazy(() => import("@/pages/my-training"));
const AiMarketingBot = lazy(() => import("@/pages/ai-marketing-bot"));

const PageFallback = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
        <span className="text-white text-xl font-black">T</span>
      </div>
      <div className="w-5 h-5 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
    </div>
  </div>
);

class AdminErrorBoundary extends Component<{ children: any }, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Admin Dashboard Error</h2>
            <p className="text-gray-400 text-sm mb-4">A rendering error occurred. Please refresh the page. If the problem persists, check the browser console for details.</p>
            <pre className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-xs text-red-300 text-left overflow-auto max-h-40 mb-6 whitespace-pre-wrap break-all">{this.state.error}</pre>
            <button
              onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return (
      <Suspense fallback={<PageFallback />}>
        {this.props.children}
      </Suspense>
    );
  }
}

function hasAdminDashboardAccess(user: any) {
  return user?.userType === "admin" || ["admin", "content_editor", "moderator", "store_manager"].includes(user?.role);
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const cleanLocation = location.split("?")[0];

  if (isLoading) {
    return <PageFallback />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Switch location={cleanLocation}>
        <Route path="/" component={isAuthenticated ? (() => {
          const userType = (user as any)?.userType;
          if (hasAdminDashboardAccess(user)) return <AdminErrorBoundary><AdminDashboard /></AdminErrorBoundary>;
          if (userType === 'brand') return <BrandDashboard />;
          return <SimpleDashboard />;
        }) : FinalLanding} />
        <Route path="/signup" component={SimpleSignup} />
        <Route path="/login" component={Login} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/breedskool/campaign" component={BreedSkoolCampaign} />
        <Route path="/breedskool" component={BreedSkool} />
        <Route path="/breedskool/onsite" component={BreedSkoolOnsite} />
        <Route path="/breedskool/:id" component={BreedSkoolCourse} />
        <Route path="/certificates/:code" component={CertificateVerify} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/shop" component={Shop} />
        <Route path="/shop/product/:id" component={ProductDetail} />
        <Route path="/shop/checkout/:id" component={ShopCheckout} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/abraham-tahbat/:slug" component={AbrahamPortfolio} />
        <Route path="/abraham-tahbat" component={AbrahamPortfolio} />
        <Route path="/olajumoke-owoeye" component={OlajumokePortfolio} />
        <Route path="/creator-portfolio/:identity" component={CreatorPortfolio} />
        <Route path="/portfolio/:slug" component={AbrahamPortfolio} />
        <Route path="/portfolio" component={AbrahamPortfolio} />
        <Route path="/terms" component={() => <LegalPageTemplate slug="terms" />} />
        <Route path="/privacy" component={() => <LegalPageTemplate slug="privacy" />} />
        <Route path="/cookies" component={() => <LegalPageTemplate slug="cookies" />} />
        <Route path="/disclaimer" component={() => <LegalPageTemplate slug="disclaimer" />} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/advertise" component={AdvertiseWithUs} />
        <Route path="/get-started" component={GetStarted} />
        <Route path="/influencers" component={Influencers} />
        <Route path="/influencers/:id" component={CreatorProfile} />
        <Route path="/brands" component={BrandsPage} />
        <Route path="/profile/:id" component={UnifiedProfile} />
        <Route path="/p/:username" component={ProfileByUsername} />
        <Route path="/u/:username" component={ProfileByUsername} />
        <Route path="/brand/:id" component={BrandProfile} />
        <Route path="/feed" component={FeedPage} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/tdrip" component={TDripInfoPage} />
        <Route path="/docs" component={DocumentationPage} />
        <Route path="/documentation" component={DocumentationPage} />
        <Route path="/roadmap" component={RoadmapPage} />
        <Route path="/tokenomics" component={RoadmapPage} />
        <Route path="/admin/spotlight" component={AdminSpotlight} />
        <Route path="/p2p-hub" component={P2PHub} />
        <Route path="/p2p/:id" component={P2PListing} />
        <Route path="/hire-developer" component={HireDeveloper} />
        <Route path="/messages" component={Messages} />
        <Route path="/referrals" component={ReferralsPage} />
        {isAuthenticated ? (
          <>
            <Route path="/dashboard" component={() => {
              const userType = (user as any)?.userType;
              if (hasAdminDashboardAccess(user)) return <AdminErrorBoundary><AdminDashboard /></AdminErrorBoundary>;
              if (userType === 'brand') return <BrandDashboard />;
              return <SimpleDashboard />;
            }} />
            <Route path="/brand-dashboard" component={BrandDashboard} />
            <Route path="/admin-dashboard" component={() => <AdminErrorBoundary><AdminDashboard /></AdminErrorBoundary>} />
            <Route path="/campaigns" component={TasksPage} />
            <Route path="/campaigns/:id" component={CampaignDetail} />
            <Route path="/profile" component={() => {
              const userType = (user as any)?.userType;
              if (hasAdminDashboardAccess(user)) {
                return <AdminErrorBoundary><AdminDashboard /></AdminErrorBoundary>;
              } else if (userType === 'brand') {
                return <BrandDashboard />;
              } else {
                return <SimpleDashboard />;
              }
            }} />
            <Route path="/user-profile" component={UserProfile} />
            <Route path="/chat" component={Chat} />
            <Route path="/wallet" component={WalletSettings} />
            <Route path="/ledger" component={LedgerPage} />
            <Route path="/payment-deposit" component={PaymentDeposit} />
            <Route path="/profile-edit" component={() => {
              const userType = (user as any)?.userType;
              return userType === 'brand' ? <BrandProfileEdit /> : <ProfileEdit />;
            }} />
            <Route path="/escrow-payment" component={EscrowPayment} />
            <Route path="/direct-hire/:id" component={DirectHirePayment} />
            <Route path="/p2p-deals" component={P2PDealRoom} />
            <Route path="/p2p-deals/:id" component={P2PDealRoom} />
            <Route path="/admin" component={() => <AdminErrorBoundary><AdminDashboard /></AdminErrorBoundary>} />
            <Route path="/admin/users" component={AdminUserManagement} />
            <Route path="/admin/products" component={AdminProducts} />
            <Route path="/admin/courses" component={AdminCourses} />
            <Route path="/admin/certificate-template" component={AdminCertificateTemplate} />
            <Route path="/breedskool/:id/learn" component={CourseLearn} />
            <Route path="/breedskool/:id/learn/:lessonId" component={CourseLearn} />
            <Route path="/breedskool/:id/certificate" component={CourseCertificate} />
            <Route path="/admin/payments" component={AdminPayments} />
            <Route path="/admin-ads" component={AdminAds} />
            <Route path="/admin/ads" component={AdminAds} />
            <Route path="/admin/email" component={AdminEmail} />
            <Route path="/admin/activity-history" component={AdminActivityHistory} />
            <Route path="/admin/p2p-transactions" component={AdminP2PTransactions} />
            <Route path="/admin/p2p-fees" component={AdminP2PFees} />
            <Route path="/admin/platform-fees" component={AdminPlatformFees} />
            <Route path="/admin/cms" component={AdminCMSEditor} />
        <Route path="/admin/breedskool-campaign" component={AdminBreedSkoolCampaign} />
            <Route path="/admin/portfolio" component={AdminPortfolio} />
            <Route path="/admin/seo" component={AdminSEO} />
            <Route path="/admin/seo-intelligence" component={AdminSeoIntelligence} />
            <Route path="/subscription" component={SubscriptionPage} />
            <Route path="/payout-requests" component={PayoutRequestsPage} />
            <Route path="/my-campaigns" component={MyCampaignsPage} />
            <Route path="/my-orders" component={MyOrdersPage} />
            <Route path="/my-training" component={MyTraining} />
            <Route path="/orders/:id" component={OrderDetailPage} />
            <Route path="/security" component={SecuritySettings} />
            <Route path="/short-links" component={ShortLinksPage} />
            <Route path="/short-links/:id/analytics" component={ShortLinkAnalyticsPage} />
            <Route path="/admin/url-shortener" component={AdminUrlShortenerPage} />
            <Route path="/admin/keyword-analytics" component={AdminKeywordAnalyticsPage} />
            <Route path="/admin/auto-blogger" component={AdminAutoBloggerPage} />
            <Route path="/admin/ai-marketing-bot" component={() => <AdminErrorBoundary><AiMarketingBot /></AdminErrorBoundary>} />
            <Route path="/admin/influencer-crm" component={() => <AdminErrorBoundary><AdminInfluencerCRM /></AdminErrorBoundary>} />
            <Route path="/admin/leads" component={AdminLeads} />
            <Route path="/admin/leads/:id" component={AdminLeadDetail} />
          </>
        ) : (
          <>
            <Route path="/dashboard" component={() => { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`; return null; }} />
            <Route path="/admin-dashboard" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/admin-dashboard')}`; return null; }} />
            <Route path="/campaigns" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/campaigns')}`; return null; }} />
            <Route path="/campaigns/:id" component={CampaignDetail} />
            <Route path="/profile" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/profile')}`; return null; }} />
            <Route path="/wallet" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/wallet')}`; return null; }} />
            <Route path="/admin" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/admin')}`; return null; }} />
            <Route path="/admin-ads" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/admin-ads')}`; return null; }} />
            <Route path="/admin/ads" component={() => { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`; return null; }} />
            <Route path="/admin/influencer-crm" component={() => { window.location.href = `/admin-login?redirect=${encodeURIComponent('/admin/influencer-crm')}`; return null; }} />
            <Route path="/admin/ai-marketing-bot" component={() => { window.location.href = `/admin-login?redirect=${encodeURIComponent('/admin/ai-marketing-bot')}`; return null; }} />
            <Route path="/admin/auto-blogger" component={() => { window.location.href = `/admin-login?redirect=${encodeURIComponent('/admin/auto-blogger')}`; return null; }} />
            <Route path="/admin/leads" component={() => { window.location.href = `/admin-login?redirect=${encodeURIComponent(window.location.pathname)}`; return null; }} />
            <Route path="/admin/leads/:id" component={() => { window.location.href = `/admin-login?redirect=${encodeURIComponent(window.location.pathname)}`; return null; }} />
            <Route path="/admin/activity-history" component={() => { window.location.href = `/admin-login?redirect=${encodeURIComponent(window.location.pathname)}`; return null; }} />
            <Route path="/p2p-deals" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/p2p-deals')}`; return null; }} />
            <Route path="/p2p-deals/:id" component={() => { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; return null; }} />
            <Route path="/my-training" component={() => { window.location.href = `/login?redirect=${encodeURIComponent('/my-training')}`; return null; }} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Use two rAF passes so this fires AFTER any child-component useEffects
    // (e.g. chat boxes that scroll to their last message on mount).
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
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

function ThemeLoader() {
  useEffect(() => {
    fetch("/api/theme-config")
      .then((r) => r.ok ? r.json() : {})
      .then((theme: Record<string, string>) => {
        if (!theme || !Object.keys(theme).length) return;
        const root = document.documentElement;
        if (theme.primaryColor) root.style.setProperty("--brand-primary", theme.primaryColor);
        if (theme.secondaryColor) root.style.setProperty("--brand-secondary", theme.secondaryColor);
        if (theme.accentColor) root.style.setProperty("--brand-accent", theme.accentColor);
        if (theme.bgColor) root.style.setProperty("--brand-bg", theme.bgColor);
        if (theme.navBg) root.style.setProperty("--brand-nav-bg", theme.navBg);
        if (theme.navText) root.style.setProperty("--brand-nav-text", theme.navText);
      })
      .catch(() => {});
  }, []);
  return null;
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ThemeLoader />
        <GlobalSeo />
        <RouteSeo />
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
