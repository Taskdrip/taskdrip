import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getTierFromFollowers, getTierConfig, formatFollowers } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot, X, Send, Sparkles, BookOpen, ShoppingBag,
  TrendingUp, CheckCircle, AlertCircle, MessageSquare, Inbox,
  Users, Star, Zap, Building2, Target, BarChart3, Award, Mic,
  HelpCircle, DollarSign, Briefcase, HeadphonesIcon, Play,
  Shield, UserCheck, Clock, Activity
} from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";
import { SOCIALS } from "@/config/socials";
import { Link } from "wouter";

interface Recommendation {
  type: "success" | "warning" | "info" | "action";
  icon: any;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: Date;
}

// ── Brand profile analysis ────────────────────────────────────────────────
function analyzeBrandProfile(user: any): Recommendation[] {
  const recs: Recommendation[] = [];
  const hasLogo = !!user?.profileImageUrl;
  const hasBio = !!(user?.bio && user.bio.length > 20);
  const hasWebsite = !!user?.website;
  const hasIndustry = !!user?.industry;
  const hasCompanyName = !!user?.companyName;
  const isPremium = user?.subscriptionStatus === 'active';
  const brandRank = user?.brandRank || 'bronze';
  const totalVolume = parseFloat(user?.totalTransactionVolume || '0');

  if (!hasCompanyName) {
    recs.push({ type: "warning", icon: Building2, title: "Add your company name", description: "Influencers want to know who they're working with. Add your company name so your brand stands out in campaign listings.", action: { label: "Edit Profile", href: "/profile-edit" } });
  }
  if (!hasLogo) {
    recs.push({ type: "warning", icon: AlertCircle, title: "Upload your brand logo", description: "Brands with logos get 3× more influencer applications. Upload your logo to build trust with top influencers.", action: { label: "Update Profile", href: "/profile-edit" } });
  }
  if (!hasBio) {
    recs.push({ type: "warning", icon: AlertCircle, title: "Write your brand description", description: "A clear brand bio helps influencers understand your values, target audience, and campaign style — leading to better-fit applications.", action: { label: "Add Description", href: "/profile-edit" } });
  }
  if (!hasWebsite) {
    recs.push({ type: "info", icon: Star, title: "Add your website URL", description: "Adding your website increases influencer confidence in your legitimacy and boosts your brand credibility score.", action: { label: "Add Website", href: "/profile-edit" } });
  }
  if (!hasIndustry) {
    recs.push({ type: "info", icon: Target, title: "Set your industry", description: "Setting your industry helps us match your brand with influencers in the right niche — driving better campaign results.", action: { label: "Set Industry", href: "/profile-edit" } });
  }
  if (!isPremium) {
    recs.push({ type: "action", icon: Zap, title: "Upgrade to Brand Premium", description: "Premium brands unlock verified badges, priority influencer matching, unlimited campaigns, and advanced analytics. Stand out from free accounts.", action: { label: "View Plans", href: "/subscription" } });
  }
  recs.push({ type: "action", icon: TrendingUp, title: "Launch your first campaign", description: "Connect with the right influencers for your brand. Set your budget, define requirements, and start receiving applications within minutes.", action: { label: "Create Campaign", href: "/campaigns/create" } });
  if (totalVolume > 0) {
    recs.push({ type: "success", icon: CheckCircle, title: `$${totalVolume.toFixed(0)} in campaign spend`, description: `Your investment in influencer marketing is building brand awareness. Keep running campaigns to track ROI and discover your best-performing influencers.`, action: { label: "View Campaigns", href: "/campaigns" } });
  }
  if (brandRank === 'gold') {
    recs.push({ type: "success", icon: Award, title: "🥇 Gold Brand Status", description: "You've reached the highest brand tier. Your campaigns are featured first to top-tier influencers. Keep spending to maintain your elite status.", action: { label: "Manage Campaigns", href: "/campaigns" } });
  }
  return recs;
}

// ── Influencer profile analysis ──────────────────────────────────────────────
function analyzeCreatorProfile(user: any, socialLinks: any[]): Recommendation[] {
  const recs: Recommendation[] = [];
  // Built-in platform followers saved on the user record (or recalculate from fields if not yet saved)
  const platformSum = ['tiktokFollowers', 'youtubeFollowers', 'instagramFollowers', 'twitterFollowers', 'twitchFollowers', 'telegramFollowers', 'whatsappFollowers']
    .reduce((sum, f) => sum + (parseInt(user?.[f]) || 0), 0);
  const builtInFollowers = (user?.totalFollowers && user.totalFollowers > 0) ? user.totalFollowers : platformSum;
  // Custom social channels (user_social_links table) — field is followerCount
  const customLinksSum = socialLinks.reduce((sum: number, sl: any) => sum + (parseInt(sl.followerCount) || 0), 0);
  // True total = built-in platforms + custom channel followers
  const totalFollowers = builtInFollowers + customLinksSum;
  const tier = getTierFromFollowers(totalFollowers);
  const tierConf = getTierConfig(tier);
  const completedCampaigns = user?.completedCampaigns || 0;
  const hasProfileImage = !!user?.profileImageUrl;
  const hasBio = !!(user?.bio && user.bio.length > 20);
  const hasLocation = !!user?.location;
  const hasNiche = !!user?.niche;
  const hasSocialLinks = socialLinks.length > 0 || totalFollowers > 0;
  const niche = user?.niche || 'your niche';

  if (tier === "newcomer" || tier === "aspiring") {
    recs.push({
      type: "action", icon: BookOpen,
      title: "Build your audience with BreedSkool",
      description: `You have ${formatFollowers(totalFollowers)} followers so far. BreedSkool has free and paid courses on growing your ${niche} audience, viral content creation, and unlocking your first brand deals (Rising Sparks requires 10K+ followers).`,
      action: { label: "Visit BreedSkool", href: "/breedskool" },
    });
  }
  if (!hasProfileImage) {
    recs.push({ type: "warning", icon: AlertCircle, title: "Add a profile photo", description: "Profiles with photos get 3× more campaign invitations. Upload a clear, professional photo to stand out to brands.", action: { label: "Update Profile", href: "/profile-edit" } });
  }
  if (!hasBio) {
    recs.push({ type: "warning", icon: AlertCircle, title: "Write your influencer bio", description: "A compelling bio tells brands what you create, who your audience is, and why they should work with you. Aim for 2–3 engaging sentences.", action: { label: "Edit Bio", href: "/profile-edit" } });
  }
  if (!hasNiche) {
    recs.push({ type: "info", icon: Star, title: "Select your content niche", description: "Influencers with a defined niche earn 40% more on average because brands target them for relevant campaigns. Set yours in Profile Settings.", action: { label: "Set Niche", href: "/profile-edit" } });
  }
  if (!hasSocialLinks) {
    recs.push({ type: "warning", icon: Users, title: "Connect your social channels", description: "Add your social media handles and follower counts so brands see your full reach. More platforms = higher-value campaigns.", action: { label: "Add Channels", href: "/profile-edit" } });
  }
  if (completedCampaigns === 0 && totalFollowers >= 10_000) {
    recs.push({ type: "action", icon: TrendingUp, title: "Join your first campaign", description: "You have enough followers to start earning! Browse active campaigns matching your niche and submit your first application today.", action: { label: "Browse Campaigns", href: "/campaigns" } });
  } else if (completedCampaigns > 0 && completedCampaigns < 5) {
    recs.push({ type: "success", icon: CheckCircle, title: `${completedCampaigns} campaign${completedCampaigns > 1 ? 's' : ''} completed — keep going!`, description: "Complete 5+ campaigns to earn a Verified Influencer badge and unlock premium brand partnerships.", action: { label: "Find More", href: "/campaigns" } });
  } else if (completedCampaigns >= 5) {
    recs.push({ type: "success", icon: CheckCircle, title: "Verified influencer — great work!", description: `${completedCampaigns} campaigns completed. Brands love your track record. Keep your rates updated and explore exclusive high-budget deals.`, action: { label: "Manage Campaigns", href: "/campaigns" } });
  }
  if (tier === "power_influencers" || tier === "global_titans") {
    recs.push({ type: "action", icon: Mic, title: "Share your expertise — create a course", description: `As a ${tierConf.name} with ${formatFollowers(totalFollowers)} followers, newer influencers look up to you! Create a BreedSkool course and earn passive income teaching ${niche} growth strategies.`, action: { label: "Create a Course", href: "/breedskool" } });
  }
  if (tier === "rising_sparks" || tier === "growth_engines") {
    recs.push({ type: "info", icon: Zap, title: `You're a ${tierConf.name} ${tierConf.icon}`, description: `${formatFollowers(totalFollowers)} followers puts you in an active tier. ${tier === "rising_sparks" ? "Reach 100K followers to become a Growth Engine and unlock premium campaigns." : "Reach 1M followers to join Power Influencers — the top 1% of influencers."}` });
  }
  if (totalFollowers > 0 && (tier !== "newcomer" && tier !== "aspiring") && completedCampaigns < 5) {
    recs.push({ type: "info", icon: ShoppingBag, title: "Explore influencer tools in the Shop", description: "Boost your content with templates, editing presets, and marketing guides from the Taskdrip Shop.", action: { label: "Visit Shop", href: "/shop" } });
  }
  if (!hasLocation) {
    recs.push({ type: "info", icon: Star, title: "Add your location", description: "Some brands specifically target influencers in certain regions. Adding your location improves campaign matching.", action: { label: "Edit Profile", href: "/profile-edit" } });
  }
  return recs;
}

// ── Admin platform analysis ──────────────────────────────────────────────
function analyzeAdminPlatform(users: any[], transactions: any[], campaigns: any[], adApplications: any[] = []): Recommendation[] {
  const recs: Recommendation[] = [];
  const pendingPayouts = transactions.filter((t: any) => t.status === 'pending');
  const unverifiedUsers = users.filter((u: any) => !u.isVerified && u.userType !== 'admin');
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active');
  const creators = users.filter((u: any) => u.userType === 'creator');
  const brands = users.filter((u: any) => u.userType === 'brand');
  const completedTx = transactions.filter((t: any) => t.status === 'completed');
  const totalRevenue = completedTx.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
  const verifiedCreators = creators.filter((u: any) => u.isVerified).length;
  const pendingAdApps = adApplications.filter((a: any) => a.status === 'pending');

  // Highest priority: pending ad applications (revenue opportunity)
  if (pendingAdApps.length > 0) {
    const latest = pendingAdApps[0];
    recs.push({
      type: "warning", icon: Briefcase,
      title: `🔔 ${pendingAdApps.length} new ad application${pendingAdApps.length !== 1 ? 's' : ''} pending`,
      description: `${latest.companyName ? `"${latest.companyName}"` : 'A brand'} applied for a ${(latest.adType || 'advertising').replace(/_/g, ' ')} campaign. Review and reply to convert this lead.`,
      action: { label: "Review Applications →", href: "/admin/ads?tab=applications" },
    });
  }

  if (pendingPayouts.length > 0) {
    recs.push({
      type: "warning", icon: DollarSign,
      title: `${pendingPayouts.length} pending payout request${pendingPayouts.length !== 1 ? 's' : ''}`,
      description: `Creators are waiting to receive their earnings. Review and process these payouts promptly to maintain trust on the platform.`,
      action: { label: "Process Payouts", href: "/admin-dashboard" },
    });
  }

  if (unverifiedUsers.length > 0) {
    recs.push({
      type: "warning", icon: UserCheck,
      title: `${unverifiedUsers.length} user${unverifiedUsers.length !== 1 ? 's' : ''} awaiting verification`,
      description: `Verified creators unlock premium campaigns and higher-budget brand deals. Review and verify qualified influencers to grow platform activity.`,
      action: { label: "Review Users", href: "/admin-dashboard" },
    });
  }

  if (activeCampaigns.length > 0) {
    recs.push({
      type: "success", icon: Target,
      title: `${activeCampaigns.length} active campaign${activeCampaigns.length !== 1 ? 's' : ''} running`,
      description: `Monitor active campaigns for completed submissions. Approve verified proof to release creator payments promptly.`,
      action: { label: "View Campaigns", href: "/admin-dashboard" },
    });
  } else {
    recs.push({
      type: "action", icon: TrendingUp,
      title: "No active campaigns right now",
      description: "Encourage brands to create campaigns or reach out to existing brand accounts to launch new influencer partnerships.",
      action: { label: "Manage Campaigns", href: "/admin-dashboard" },
    });
  }

  recs.push({
    type: "info", icon: Users,
    title: `${users.length} registered users on the platform`,
    description: `${creators.length} creators (${verifiedCreators} verified, ${creators.length - verifiedCreators} pending) · ${brands.length} brand accounts. ${unverifiedUsers.length > 0 ? `${unverifiedUsers.length} need verification.` : 'All creators are verified.'}`,
    action: { label: "Manage Users", href: "/admin-dashboard" },
  });

  if (totalRevenue > 0) {
    recs.push({
      type: "success", icon: BarChart3,
      title: `$${totalRevenue.toFixed(2)} total platform volume`,
      description: `${completedTx.length} completed transaction${completedTx.length !== 1 ? 's' : ''} processed. Keep brands active and running campaigns to grow platform revenue.`,
    });
  } else {
    recs.push({
      type: "action", icon: Activity,
      title: "No completed transactions yet",
      description: "Revenue starts when campaigns are fully processed. Encourage brands to fund campaigns and creators to submit proof.",
    });
  }

  if (pendingPayouts.length === 0 && unverifiedUsers.length === 0) {
    recs.push({
      type: "success", icon: CheckCircle,
      title: "Platform is fully up to date",
      description: "No pending payouts or verification requests. Great work keeping the platform running smoothly!",
    });
  }

  return recs;
}

// ── Admin chat responses ──────────────────────────────────────────────────
function getAdminBotResponse(message: string, data: { users: any[], transactions: any[], campaigns: any[], adApplications?: any[] }): string {
  const lower = message.toLowerCase();
  const { users, transactions, campaigns } = data;
  const pendingPayouts = transactions.filter((t: any) => t.status === 'pending');
  const unverifiedUsers = users.filter((u: any) => !u.isVerified && u.userType !== 'admin');
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active');
  const completedTx = transactions.filter((t: any) => t.status === 'completed');
  const totalRevenue = completedTx.reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);
  const creators = users.filter((u: any) => u.userType === 'creator');
  const brands = users.filter((u: any) => u.userType === 'brand');

  const pendingAdApps = data.adApplications ? data.adApplications.filter((a: any) => a.status === 'pending') : [];

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hello, Admin! 👋 Here's your platform snapshot:\n\n${pendingAdApps.length > 0 ? `🔔 **${pendingAdApps.length}** ad application${pendingAdApps.length !== 1 ? 's' : ''} awaiting review\n` : ''}⏳ **${pendingPayouts.length}** pending payouts\n👤 **${unverifiedUsers.length}** users awaiting verification\n🎯 **${activeCampaigns.length}** active campaigns\n💰 **$${totalRevenue.toFixed(2)}** total volume\n\nWhat would you like to review?`;
  }
  if (lower.includes("ad application") || lower.includes("ads application") || lower.includes("advertise") || lower.includes("advertising application")) {
    const allApps = data.adApplications || [];
    return `Advertising Applications:\n\n🔔 **Pending**: ${pendingAdApps.length} need your response\n✅ **Contacted**: ${allApps.filter((a: any) => a.status === 'contacted').length}\n👍 **Approved**: ${allApps.filter((a: any) => a.status === 'approved').length}\n❌ **Rejected**: ${allApps.filter((a: any) => a.status === 'rejected').length}\n\n${pendingAdApps.length > 0 ? `Latest: "${pendingAdApps[0]?.companyName}" applied for ${(pendingAdApps[0]?.adType || '').replace(/_/g, ' ')}.` : 'No pending applications.'}\n\nGo to **[Admin Ads → Applications tab](/admin/ads?tab=applications)** to view and reply.`;
  }
  if (lower.includes("payout") || lower.includes("withdrawal") || lower.includes("payment")) {
    return `Payout overview:\n\n⏳ **Pending**: ${pendingPayouts.length} requests awaiting processing\n✅ **Completed**: ${completedTx.length} transactions\n💰 **Total volume**: $${totalRevenue.toFixed(2)}\n\nTo process payouts, go to Admin Dashboard → Transactions tab. Always verify wallet addresses before approving — crypto transfers are irreversible!`;
  }
  if (lower.includes("user") || lower.includes("creator") || lower.includes("verify") || lower.includes("verification")) {
    return `User overview:\n\n👥 **Total**: ${users.length} registered users\n🎨 **Creators**: ${creators.length} (${creators.filter((u: any) => u.isVerified).length} verified)\n🏢 **Brands**: ${brands.length}\n⏳ **Awaiting verification**: ${unverifiedUsers.length}\n\nTo verify creators, go to Users tab in the Admin Dashboard and set their verification status.`;
  }
  if (lower.includes("campaign")) {
    const totalCampaigns = campaigns.length;
    const suspendedCampaigns = campaigns.filter((c: any) => c.status === 'suspended').length;
    return `Campaign overview:\n\n🎯 **Active**: ${activeCampaigns.length} campaigns running\n📋 **Total**: ${totalCampaigns} campaigns\n⛔ **Suspended**: ${suspendedCampaigns}\n\nManage all campaigns in Admin Dashboard → Campaigns tab. You can suspend, approve, or edit campaigns there.`;
  }
  if (lower.includes("revenue") || lower.includes("stats") || lower.includes("analytics") || lower.includes("overview")) {
    return `Platform analytics:\n\n💹 **Total volume**: $${totalRevenue.toFixed(2)}\n✅ **Completed transactions**: ${completedTx.length}\n⏳ **Pending payouts**: ${pendingPayouts.length}\n👥 **Total users**: ${users.length}\n🎯 **Active campaigns**: ${activeCampaigns.length}\n🏢 **Brands**: ${brands.length} · 🎨 **Creators**: ${creators.length}`;
  }
  if (lower.includes("help") || lower.includes("what can")) {
    return `As your Admin Assistant, I can help with:\n\n💰 **Payouts** — "How many pending payouts are there?"\n👤 **Users** — "How many users need verification?"\n🎯 **Campaigns** — "What campaigns are active?"\n📊 **Analytics** — "Show me platform stats"\n🔧 **Platform health** — "Is everything running OK?"\n\nJust ask!`;
  }
  const alerts = [
    pendingPayouts.length > 0 ? `• **${pendingPayouts.length} pending payout${pendingPayouts.length !== 1 ? 's'  : ''}** — process in Transactions tab` : null,
    unverifiedUsers.length > 0 ? `• **${unverifiedUsers.length} user${unverifiedUsers.length !== 1 ? 's' : ''} to verify** — review in Users tab` : null,
    activeCampaigns.length === 0 ? `• **No active campaigns** — encourage brands to create campaigns` : null,
  ].filter(Boolean);
  if (alerts.length > 0) {
    return `Current action items:\n\n${alerts.join('\n')}\n\nAsk me about payouts, users, campaigns, or revenue for more detail.`;
  }
  return `Everything looks good! No immediate action required.\n\n✅ No pending payouts · ✅ All users verified · 🎯 ${activeCampaigns.length} active campaigns\n\nAsk me about specific topics like payouts, users, campaigns, or revenue.`;
}

// ── Brand chat responses ──────────────────────────────────────────────────
function getBrandBotResponse(message: string, user: any): string {
  const lower = message.toLowerCase();
  const company = user?.companyName || user?.firstName || 'there';
  const rank = user?.brandRank || 'bronze';
  const volume = parseFloat(user?.totalTransactionVolume || '0');

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hey ${company}! 👋 I'm your Taskdrip Brand Advisor. I'm here to help you find the right influencers, launch effective campaigns, and maximize your influencer marketing ROI. What can I help you with today?`;
  }
  if (lower.includes("get started") || lower.includes("how to start") || lower.includes("started on taskdrip")) {
    return `Welcome to Taskdrip! Here's how to get started as a brand:\n\n1️⃣ **Complete your brand profile** — Add your logo, company name, bio, and industry at /profile-edit\n2️⃣ **Fund your account** — Deposit USDT via Tron, BSC, or TON to your brand wallet\n3️⃣ **Create your first campaign** — Go to /campaigns/create and define your task, reward, and requirements\n4️⃣ **Review applications** — Influencers apply; you review and approve the best fits\n5️⃣ **Pay approved influencers** — After task completion and proof submission, release payment\n\nNeed help? Visit /get-started for a detailed guide.`;
  }
  if (lower.includes("withdraw") || lower.includes("payout")) {
    return `Withdrawals for brands are handled differently — your funds stay in escrow and are distributed to influencers when you approve completed tasks.\n\nFor unused campaign funds:\n💰 Contact support via /contact to request a fund withdrawal\n📋 Submit your request with your transaction hash and wallet address\n⏱️ Processing typically takes 2–5 business days\n\nNeed assistance? Message us on WhatsApp: ${SOCIALS.whatsappNumber || "+1 (201) 680-0266"}`;
  }
  if (lower.includes("support") || lower.includes("contact") || lower.includes("help")) {
    return `Need support? Here's how to reach us:\n\n💬 **WhatsApp**: ${SOCIALS.whatsappNumber || "+1 (201) 680-0266"} — fastest response\n📱 **Telegram**: t.me/taskdrip — community + support\n📧 **Contact form**: Visit /contact for formal inquiries\n⏰ **Support hours**: Mon–Fri, 9am–6pm WAT\n\nFor urgent issues, WhatsApp is your best bet for a quick response!`;
  }
  if (lower.includes("influencer") || lower.includes("influencer") || lower.includes("find")) {
    return `Finding the right influencer is key! Here's how:\n\n🔍 **Browse Influencers** — Visit /influencers to filter by niche, follower count, and tier\n🎯 **Post a Campaign** — Active influencers apply directly to your campaign\n⭐ **Influencer Tiers** — Rising Sparks (10K–100K), Growth Engines (100K–1M), Power Influencers (1M–10M), Global Titans (10M+)\n\nFor best results, match your campaign budget to the influencer's tier. Want me to explain the tier system in more detail?`;
  }
  if (lower.includes("campaign") || lower.includes("launch") || lower.includes("create")) {
    return `Launching a campaign is straightforward:\n\n1️⃣ Go to /campaigns/create\n2️⃣ Set your title, description, and platform target\n3️⃣ Define influencer requirements (minimum followers, niche, etc.)\n4️⃣ Set your reward per influencer and total slots\n5️⃣ Fund the campaign (crypto payment) to go live\n\nCreators in your target niche will start applying! You review applications and approve the best fits.`;
  }
  if (lower.includes("roi") || lower.includes("return") || lower.includes("result") || lower.includes("analytics")) {
    return `Tracking ROI from influencer campaigns:\n\n📊 **Track completions** — Monitor how many influencers completed your campaign\n💰 **Compare spend vs. reach** — Review total follower reach vs. campaign spend\n🔗 **Use trackable links** — Add UTM parameters to your campaign links\n📈 **Repeat top performers** — Message high-performing influencers for follow-up deals\n\nBrands that run 3+ campaigns typically see 2–4× better ROI as they refine their influencer selection.`;
  }
  if (lower.includes("budget") || lower.includes("cost") || lower.includes("price") || lower.includes("pay")) {
    return `Campaign budgets by tier:\n\n🌱 **Rising Sparks** (10K–100K followers): $50–$200 per influencer\n⚡ **Growth Engines** (100K–1M): $200–$1,000 per influencer\n🔥 **Power Influencers** (1M–10M): $1,000–$5,000 per influencer\n👑 **Global Titans** (10M+): $5,000+ negotiated\n\nFor new brands, we recommend starting with Rising Sparks influencers — great engagement at accessible budgets. Want tips on negotiating with influencers?`;
  }
  if (lower.includes("premium") || lower.includes("upgrade") || lower.includes("plan")) {
    return `Premium Brand benefits include:\n\n✅ **Verified Brand badge** — Influencers trust you immediately\n🚀 **Priority listing** — Your campaigns appear first to top influencers\n📊 **Advanced analytics** — Detailed influencer performance data\n🎯 **Unlimited campaigns** — No slot restrictions\n💬 **Priority support** — Dedicated account manager\n\nYour current rank: **${rank.charAt(0).toUpperCase() + rank.slice(1)}**. Upgrade at /subscription to unlock these advantages.`;
  }
  if (lower.includes("niche") || lower.includes("category") || lower.includes("industry")) {
    return `Matching your brand with the right niche is critical for conversions:\n\n🎮 **Gaming** — Best for tech products, energy drinks, gaming peripherals\n💄 **Beauty/Fashion** — Skincare, cosmetics, clothing brands\n💪 **Fitness** — Supplements, sportswear, wellness products\n📱 **Tech** — Apps, gadgets, software tools\n✈️ **Travel** — Hotels, luggage, travel apps\n\nSet your industry in Profile Settings so influencers know you're a great match for their audience.`;
  }
  if (lower.includes("help") || lower.includes("what can")) {
    return `As your Brand Advisor, I can help with:\n\n🏢 **Profile setup** — "How do I set up my brand profile?"\n🎯 **Finding influencers** — "How do I find the right influencers?"\n📣 **Campaign creation** — "How do I launch a campaign?"\n💰 **Budget guidance** — "How much should I pay influencers?"\n📊 **ROI tracking** — "How do I measure campaign success?"\n⬆️ **Upgrading** — "What does brand premium include?"\n\nJust ask!`;
  }
  return `Great question! As a ${rank} brand with ${volume > 0 ? `$${volume.toFixed(0)} in campaign history` : 'no campaigns yet'}, my top suggestion is: ${volume === 0 ? 'launch your first campaign to start connecting with influencers who are ready to promote your brand.' : 'review your best-performing influencers and invite them to your next campaign for even better results.'} Is there anything specific I can help you with?`;
}

// ── Influencer chat responses ────────────────────────────────────────────────
function getCreatorBotResponse(message: string, user: any, socialLinks: any[]): string {
  const lower = message.toLowerCase();
  const totalFollowers = user?.totalFollowers || 0;
  const tier = getTierFromFollowers(totalFollowers);
  const tierConf = getTierConfig(tier);
  const niche = user?.niche || 'your niche';
  const firstName = user?.firstName || 'there';

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    const isPowerUser = tier === 'power_influencers' || tier === 'global_titans';
    return isPowerUser
      ? `Welcome back, ${firstName}! 🌟 As a ${tierConf.name}, you're among the elite. I can help you find premium brand deals, mentor new influencers, or even launch your own course. What's on your mind?`
      : `Hey ${firstName}! 👋 I'm your Taskdrip Guide. I analyze your profile to give you personalized tips for growing your influence and earnings. Check the Recommendations tab, or ask me anything!`;
  }
  if (lower.includes("get started") || lower.includes("how to start") || lower.includes("started on taskdrip")) {
    return `Welcome to Taskdrip, ${firstName}! Here's how to start:\n\n1️⃣ **Complete your profile** — Add photo, bio, niche, and social channels at /profile-edit (+100 pts)\n2️⃣ **Join the Welcome Campaign** — On your dashboard, complete social tasks to earn 130 $TDRIP points\n3️⃣ **Set up your crypto wallet** — Go to /wallet to add your USDT or TON wallet for payouts\n4️⃣ **Browse campaigns** — Visit /tasks or /campaigns to find brand tasks that match your niche\n5️⃣ **Submit proof** — Complete the task, submit screenshots, and get paid!\n\nVisit /get-started for the full guide.`;
  }
  if (lower.includes("withdraw") || lower.includes("payout") || lower.includes("how do i withdraw")) {
    return `Here's how to withdraw your earnings on Taskdrip:\n\n💳 **Step 1**: Go to /wallet and add your crypto wallet address (USDT on Tron, BSC, or TON)\n📤 **Step 2**: Go to /payout-requests and submit a withdrawal request\n✅ **Step 3**: Admin reviews and approves within 24–72 hours\n🚀 **Step 4**: Funds are sent directly to your crypto wallet\n\n⚠️ **Minimum withdrawal**: $5 USDT\n💡 **Tip**: Make sure your wallet address is correct before requesting — crypto transfers are irreversible!\n\nQuestions? Chat us on WhatsApp: +1 (201) 680-0266`;
  }
  if (lower.includes("get campaigns") || lower.includes("how do i get campaigns") || lower.includes("find campaigns")) {
    return `Here's how to get brand campaigns on Taskdrip:\n\n🔍 **Browse Tasks** — Go to /tasks to see all available campaigns by category and niche\n📝 **Apply** — Click "Apply" on any campaign that matches your audience\n✅ **Get Approved** — Brands review your profile and approve the best fit influencers\n📸 **Complete & Submit Proof** — Do the task, submit screenshots/links as proof\n💰 **Get Paid** — Approved submissions receive crypto payment to your wallet\n\n💡 **Pro Tip**: A complete profile with follower counts gets 5× more approvals. Update yours at /profile-edit!`;
  }
  if (lower.includes("support") || lower.includes("contact") || lower.includes("how do i contact")) {
    return `Need help? Here's how to reach our support team:\n\n💬 **WhatsApp**: +1 (201) 680-0266 — fastest response (under 1 hour)\n📱 **Telegram**: t.me/taskdrip — join the community for peer support\n📧 **Contact form**: Visit /contact for formal support tickets\n📨 **Messages**: Use /chat to send a direct message to the team\n⏰ **Hours**: Mon–Fri, 9am–6pm WAT\n\nFor account issues, payments, or disputes, WhatsApp is the fastest way to get help!`;
  }
  if (lower.includes("tier") || lower.includes("rank") || lower.includes("level")) {
    const needed = tier === 'newcomer' ? 10_000 - totalFollowers : tier === 'aspiring' ? 10_000 - totalFollowers : tier === 'rising_sparks' ? 100_000 - totalFollowers : tier === 'growth_engines' ? 1_000_000 - totalFollowers : tier === 'power_influencers' ? 10_000_000 - totalFollowers : 0;
    return `You're currently **${tierConf.name}** ${tierConf.icon} with ${formatFollowers(totalFollowers)} followers. ${
      tier === 'newcomer' || tier === 'aspiring' ? `You need ${formatFollowers(needed)} more followers to reach Rising Sparks and unlock campaign earnings. BreedSkool has proven strategies for your ${niche} niche!`
      : tier === 'rising_sparks' ? `You need ${formatFollowers(needed)} more followers to become a Growth Engine. Focus on consistency and engagement in your ${niche} content.`
      : tier === 'growth_engines' ? `${formatFollowers(needed)} more followers to become a Power Influencer — that's top 2% globally. Premium brands are watching!`
      : tier === 'power_influencers' ? `${formatFollowers(needed)} more followers to become a Global Titan. You're already attracting premium brand deals. Consider launching a course!`
      : `You're a Global Titan 👑 — the pinnacle of influence. Your profile is visible to the world's top brands. Time to share your knowledge by creating a BreedSkool course!`
    }`;
  }
  if (lower.includes("earn") || lower.includes("money") || lower.includes("campaign") || lower.includes("paid")) {
    if (totalFollowers < 10_000) {
      return `To earn through campaigns, you'll need at least 10,000 followers (Rising Sparks tier). Focus on growing your ${niche} audience first — BreedSkool has targeted courses for this. Once you hit 10K, you'll unlock campaign applications!`;
    }
    if (tier === 'power_influencers' || tier === 'global_titans') {
      return `At your level, you can maximize earnings in multiple ways:\n\n🎯 **Premium campaigns** — Your tier unlocks $1,000–$5,000+ per campaign\n📚 **Create a course** — Teach ${niche} strategies on BreedSkool and earn passive income\n💰 **Update your rate card** — Make sure your content rates reflect your massive reach\n🤝 **Brand partnerships** — Negotiate long-term deals, not just one-off campaigns\n\nYou're a top influencer — brands will pay a premium for authenticity.`;
    }
    return `Here's how to maximize your earnings as a ${tierConf.name}:\n\n1️⃣ **Complete campaigns** — Each builds your reputation and review score\n2️⃣ **Set competitive rates** — Update your content rate card in Profile Settings\n3️⃣ **Engage consistently** — Higher engagement = better campaign invitations\n4️⃣ **Diversify platforms** — More channels = higher total followers = better tier\n\nHead to /campaigns to see ${niche} opportunities right now!`;
  }
  if (lower.includes("breedskool") || lower.includes("course") || lower.includes("learn")) {
    if (tier === 'power_influencers' || tier === 'global_titans') {
      return `BreedSkool is where emerging influencers learn — and where you can teach! 🎓 With your ${formatFollowers(totalFollowers)} following, you have real-world experience that beginners are dying to learn from. Creating a course earns you passive income and builds your personal brand further. Visit /breedskool to set up your instructor profile.`;
    }
    return `BreedSkool is Taskdrip's learning hub! ${totalFollowers < 10_000 ? `Since you're building your ${niche} audience, it's the perfect starting point. ` : ''}You'll find courses on content strategy, audience growth, brand deals, and more. ${totalFollowers < 10_000 ? 'Several courses are specifically for beginners — ' : ''}Visit /breedskool to explore!`;
  }
  if (lower.includes("follower") || lower.includes("grow") || lower.includes("audience")) {
    return `Growing your ${niche} audience — proven tactics:\n\n📅 **Post consistently** — 4–5 times per week minimum\n💬 **Engage every comment** — Reply in the first hour for algorithm boost\n🔥 **Use trending formats** — Reels, TikTok, YouTube Shorts get 5× reach\n🤝 **Collaborate** — Cross-promotions with influencers in adjacent niches\n⏰ **Post at peak times** — Analyze when your audience is most active\n\n${(tier === 'newcomer' || tier === 'aspiring') ? 'Check out BreedSkool for in-depth courses on each of these strategies!' : 'Your experience in these areas is valuable — consider sharing it as a BreedSkool course!'}`;
  }
  if (lower.includes("course") || lower.includes("teach") || lower.includes("instructor")) {
    if (tier === 'power_influencers' || tier === 'global_titans') {
      return `Yes! As a ${tierConf.name}, you're in a prime position to create courses. Here's how:\n\n📚 Visit /breedskool → "Create Course"\n🎯 Choose your topic (${niche} growth, content strategy, monetization)\n🎬 Record your lessons (video, text, or both)\n💰 Set your price or make it free for exposure\n📣 Promote to your ${formatFollowers(totalFollowers)} followers — they already trust you!\n\nMany top influencers earn $2,000–$20,000/month from their courses.`;
    }
    return `BreedSkool courses are currently available for Power Influencers (1M+ followers) and above to create. You're on your way! Once you reach that milestone, you'll be able to create courses and earn passive income sharing your ${niche} expertise.`;
  }
  if (lower.includes("profile") || lower.includes("bio") || lower.includes("setup")) {
    const missing = [];
    if (!user?.profileImageUrl) missing.push("profile photo");
    if (!user?.bio || user.bio.length < 20) missing.push("detailed bio");
    if (!user?.niche) missing.push("content niche");
    if (!user?.location) missing.push("location");
    if (missing.length === 0) return `Your profile looks great, ${firstName}! ✨ Complete profile with photo, bio, niche, and location — you're top of brand search results. Keep it updated as you grow!`;
    return `Hi ${firstName}, your profile is missing: **${missing.join(", ")}**. A complete profile gets up to 5× more brand invitations. Head to /profile-edit — it takes less than 5 minutes!`;
  }
  if (lower.includes("help") || lower.includes("what can you")) {
    return `I can help you with:\n\n📈 **Growing followers** — "How do I grow my ${niche} audience?"\n🎯 **Tier progression** — "How do I reach the next tier?"\n💰 **Earnings** — "How do I earn more?"\n🎓 **BreedSkool** — "Should I take a course?"\n${(tier === 'power_influencers' || tier === 'global_titans') ? '📚 **Teaching** — "How do I create a course?"\n' : ''}👤 **Profile** — "How do I improve my profile?"\n📱 **Social channels** — "How do I add my channels?"\n\nJust ask!`;
  }
  return `Good question! Based on your profile as a ${tierConf.name} in the **${niche}** space: ${
    totalFollowers < 10_000 ? `visit BreedSkool to build your audience to 10K+ and unlock campaign earnings.`
    : totalFollowers < 100_000 ? `focus on completing campaigns and growing to 100K followers to reach Growth Engine tier.`
    : totalFollowers < 1_000_000 ? `leverage your strong following to negotiate better rates and diversify your income.`
    : `consider creating a BreedSkool course to share your expertise and earn passive income — your audience trusts your insights!`
  } Anything specific I can help with?`;
}

// ── Profile Score ─────────────────────────────────────────────────────────
function ProfileScore({ user, socialLinks }: { user: any; socialLinks: any[] }) {
  const isBrand = user?.userType === 'brand';
  const totalFollowers = user?.totalFollowers || 0;

  const checks = isBrand ? [
    { label: "Company name", done: !!user?.companyName },
    { label: "Brand logo", done: !!user?.profileImageUrl },
    { label: "Description", done: !!(user?.bio && user.bio.length > 20) },
    { label: "Website added", done: !!user?.website },
    { label: "Industry set", done: !!user?.industry },
    { label: "Campaign launched", done: (parseFloat(user?.totalTransactionVolume || '0') > 0) },
  ] : [
    { label: "Profile photo", done: !!user?.profileImageUrl },
    { label: "Bio written", done: !!(user?.bio && user.bio.length > 20) },
    { label: "Niche selected", done: !!user?.niche },
    { label: "Social channels", done: (socialLinks.length > 0 || totalFollowers > 0) },
    { label: "Campaign completed", done: (user?.completedCampaigns || 0) > 0 },
    { label: "Location set", done: !!user?.location },
  ];
  const score = Math.round((checks.filter(c => c.done).length / checks.length) * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Profile Score</span>
        <span className={`text-lg font-black ${score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500"}`}>{score}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${c.done ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}>
            <CheckCircle className={`w-3 h-3 flex-shrink-0 ${c.done ? "text-green-500" : "text-gray-300"}`} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inbox report generator ────────────────────────────────────────────────
function generateInboxReport(user: any, socialLinks: any[], recommendations: Recommendation[]): string {
  const isBrand = user?.userType === 'brand';
  const firstName = user?.firstName || '';
  const displayName = isBrand ? (user?.companyName || firstName) : firstName;
  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (isBrand) {
    const brandRank = (user?.brandRank || 'bronze');
    const rankLabel = brandRank.charAt(0).toUpperCase() + brandRank.slice(1);
    const volume = parseFloat(user?.totalTransactionVolume || '0');
    const isPremium = user?.subscriptionStatus === 'active';

    const score = Math.round([
      !!user?.companyName,
      !!user?.profileImageUrl,
      !!(user?.bio && user?.bio?.length > 20),
      !!user?.website,
      !!user?.industry,
      volume > 0,
    ].filter(Boolean).length / 6 * 100);

    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢  TASKDRIP BRAND REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prepared for: ${displayName}
Date: ${now}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊  BRAND OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Brand Rank       : ${rankLabel} ${brandRank === 'gold' ? '🥇' : brandRank === 'silver' ? '🥈' : '🥉'}
  Account Status   : ${isPremium ? 'Premium ✅' : 'Free Plan'}
  Total Spend      : $${volume.toFixed(2)}
  Profile Score    : ${score}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡  YOUR RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recommendations.slice(0, 5).map((r, i) => `${i + 1}.  ${r.title}
    ${r.description}${r.action ? `\n    → Action: ${r.action.label} (taskdrip.com${r.action.href})` : ''}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯  QUICK WINS FOR YOUR BRAND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Complete your brand profile for maximum influencer trust
  • Launch your first (or next) campaign at /campaigns/create
  • Explore influencers by niche at /influencers
  ${!isPremium ? '• Upgrade to Brand Premium to unlock verified status and priority matching\n' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Your Taskdrip Brand Advisor 🤖
  Generated: ${now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
  }

  // Influencer report
  const totalFollowers = user?.totalFollowers || 0;
  const tier = getTierFromFollowers(totalFollowers);
  const tierConf = getTierConfig(tier);
  const completedCampaigns = user?.completedCampaigns || 0;
  const niche = user?.niche || 'Not set';
  const earned = parseFloat(user?.totalEarned || '0');
  const score = Math.round([
    !!user?.profileImageUrl,
    !!(user?.bio && user?.bio?.length > 20),
    !!user?.niche,
    (socialLinks.length > 0 || totalFollowers > 0),
    completedCampaigns > 0,
    !!user?.location,
  ].filter(Boolean).length / 6 * 100);

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨  TASKDRIP CREATOR REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prepared for: ${displayName}
Date: ${now}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊  CREATOR OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Influencer Tier     : ${tierConf.name} ${tierConf.icon}
  Total Followers  : ${formatFollowers(totalFollowers)}
  Content Niche    : ${niche}
  Campaigns Done   : ${completedCampaigns}
  Total Earned     : $${earned.toFixed(2)}
  Profile Score    : ${score}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡  PERSONALIZED RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${recommendations.slice(0, 5).map((r, i) => `${i + 1}.  ${r.title}
    ${r.description}${r.action ? `\n    → Action: ${r.action.label} (taskdrip.com${r.action.href})` : ''}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  YOUR NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${tier === 'newcomer' || tier === 'aspiring'
  ? `  1. Visit BreedSkool and enroll in a growth course (taskdrip.com/breedskool)
  2. Complete your profile — photo, bio, niche, and location
  3. Connect all your social media channels
  4. Target 10,000 followers to unlock campaign earnings`
  : tier === 'rising_sparks' || tier === 'growth_engines'
  ? `  1. Browse and apply to active campaigns (taskdrip.com/campaigns)
  2. Update your content rate card to reflect your current reach
  3. Engage your audience consistently — quality over quantity
  4. Target the next tier: ${tier === 'rising_sparks' ? '100K followers → Growth Engine' : '1M followers → Power Influencer'}`
  : `  1. Explore premium brand deal invitations in your campaign inbox
  2. Update your rates — you deserve top-tier compensation
  3. Consider creating a BreedSkool course to earn passive income
  4. Mentor newcomers in your ${niche} niche — it builds your personal brand`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Your Taskdrip Guide 🤖
  Generated: ${now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
}

// ── Main GuideBot Component ───────────────────────────────────────────────
export function GuideBot() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommendations" | "chat">("recommendations");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [popupShown, setPopupShown] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = (user as any)?.userType === 'admin' || ['admin', 'content_editor', 'moderator', 'store_manager'].includes((user as any)?.role);
  const isBrand = !isAdmin && (user as any)?.userType === 'brand';
  const isCreator = !isAdmin && !isBrand;

  const { data: socialLinks = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${(user as any)?.id}/social-links`],
    enabled: isAuthenticated && !!(user as any)?.id && isCreator,
  });

  const { data: adminUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: adminTransactions = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: adminCampaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/campaigns"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: adminAdApplications = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/advertise-applications"],
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 60000,
  });

  const sendToInboxMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/guide/send-to-inbox", {
        subject: isAdmin ? "Taskdrip Admin Platform Report" : isBrand ? "Your Taskdrip Brand Report" : "Your Taskdrip Influencer Report",
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report sent to your inbox!", description: "Check Messages for your full personalised guide." });
    },
    onError: () => {
      toast({ title: "Couldn't send report", description: "Please try again later.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (isAuthenticated && !popupShown) {
      const timer = setTimeout(() => {
        setShowPopup(true);
        setPopupShown(true);
      }, 45000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, popupShown]);

  useEffect(() => {
    if (isOpen && chatMessages.length === 0) {
      const firstName = (user as any)?.firstName || 'Admin';
      const company = (user as any)?.companyName || firstName;
      const pendingCount = (adminTransactions as any[]).filter((t: any) => t.status === 'pending').length;
      const unverifiedCount = (adminUsers as any[]).filter((u: any) => !u.isVerified && u.userType !== 'admin').length;
      const pendingAppsCount = (adminAdApplications as any[]).filter((a: any) => a.status === 'pending').length;
      const latestApp = (adminAdApplications as any[]).find((a: any) => a.status === 'pending');
      const welcome: ChatMessage = {
        id: "welcome",
        role: "bot",
        content: isAdmin
          ? `Hello, ${firstName}! 🛡️ I'm your Admin Assistant — monitoring the platform in real time.\n\n${pendingAppsCount > 0 ? `🔔 **${pendingAppsCount}** new ad application${pendingAppsCount !== 1 ? 's' : ''} pending review${latestApp ? ` — "${latestApp.companyName}" just applied!` : ''}. [Review now →](/admin/ads?tab=applications)\n` : ''}${pendingCount > 0 ? `⚠️ **${pendingCount}** pending payout${pendingCount !== 1 ? 's' : ''} need attention.\n` : ''}${unverifiedCount > 0 ? `👤 **${unverifiedCount}** user${unverifiedCount !== 1 ? 's' : ''} awaiting verification.\n` : ''}${pendingAppsCount === 0 && pendingCount === 0 && unverifiedCount === 0 ? '✅ All caught up — no urgent actions required.\n' : ''}\nCheck the **Alerts** tab for a full platform overview, or ask me anything.`
          : isBrand
          ? `Welcome, ${company}! 👋 I'm your Taskdrip Brand Advisor. I help brands find the right influencers, launch campaigns, and get the most out of influencer marketing. Check the **Recommendations** tab for personalised tips, or ask me anything!`
          : `Hey ${firstName}! 👋 I'm your Taskdrip Guide — powered by real profile analysis. Check the **Recommendations** tab for personalised growth tips, or chat with me for advice on your ${(user as any)?.niche || 'content'} niche and earnings!`,
        timestamp: new Date(),
      };
      setChatMessages([welcome]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const [isAiTyping, setIsAiTyping] = useState(false);

  const handleSendChat = async () => {
    if (!chatInput.trim() || isAiTyping) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    const input = chatInput;
    setChatInput("");
    setIsAiTyping(true);
    try {
      const history = chatMessages.filter(m => m.id !== "welcome").map(m => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content,
      }));
      const userContext = {
        name: (user as any)?.firstName || (user as any)?.companyName,
        userType: (user as any)?.userType || "influencer",
        niche: (user as any)?.niche,
        tier: getTierFromFollowers((user as any)?.totalFollowers || 0),
        totalFollowers: (user as any)?.totalFollowers || 0,
        completedCampaigns: (user as any)?.completedCampaigns || 0,
        totalEarned: (user as any)?.totalEarned || "0",
        location: (user as any)?.location,
        socialChannels: (socialLinks as any[]).map(l => l.platform),
      };
      const res = await apiRequest("POST", "/api/guide/chat", {
        messages: [...history, { role: "user", content: input }],
        userContext,
      });
      const data = await res.json();
      const botResponse: ChatMessage = { id: (Date.now() + 1).toString(), role: "bot", content: data.reply || "I'm here to help!", timestamp: new Date() };
      setChatMessages(prev => [...prev, botResponse]);
    } catch (err: any) {
      const fallback = isAdmin
        ? getAdminBotResponse(input, { users: adminUsers as any[], transactions: adminTransactions as any[], campaigns: adminCampaigns as any[], adApplications: adminAdApplications as any[] })
        : isBrand
        ? getBrandBotResponse(input, user)
        : getCreatorBotResponse(input, user, socialLinks as any[]);
      const botResponse: ChatMessage = { id: (Date.now() + 1).toString(), role: "bot", content: fallback, timestamp: new Date() };
      setChatMessages(prev => [...prev, botResponse]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const recommendations = isAdmin
    ? analyzeAdminPlatform(adminUsers as any[], adminTransactions as any[], adminCampaigns as any[], adminAdApplications as any[])
    : isBrand
    ? analyzeBrandProfile(user)
    : analyzeCreatorProfile(user, socialLinks as any[]);

  const totalFollowers = (user as any)?.totalFollowers || 0;
  const tier = getTierFromFollowers(totalFollowers);
  const tierConf = getTierConfig(tier);
  const brandRank = (user as any)?.brandRank || 'bronze';
  const pendingAlerts = isAdmin ? recommendations.filter(r => r.type === 'warning').length : 0;

  if (!isAuthenticated) return null;

  const popupTip = recommendations.length > 0
    ? recommendations[0].description.substring(0, 85) + "..."
    : isAdmin ? "Check platform health — view pending payouts and user verifications."
    : isBrand ? "Set up your brand profile to attract top influencers!" : "Check your profile score and get personalised growth tips!";

  return (
    <>
      {/* Popup notification */}
      {showPopup && !isOpen && (
        <div className={`fixed bottom-24 right-4 z-50 bg-white rounded-2xl shadow-2xl p-4 max-w-xs animate-in slide-in-from-bottom-5 duration-300 ${isAdmin ? "border border-amber-200" : "border border-purple-100"}`}>
          <button onClick={() => setShowPopup(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isAdmin ? "bg-gradient-to-br from-slate-700 to-slate-900" : "bg-gradient-to-br from-purple-600 to-indigo-600"}`}>
              {isAdmin ? <Shield className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 mb-1">{isAdmin ? "Admin alert!" : isBrand ? "Brand Advisor tip!" : "Your Guide has a tip!"}</p>
              <p className="text-xs text-gray-600">{popupTip}</p>
              <button onClick={() => { setShowPopup(false); setIsOpen(true); }} className={`text-xs font-semibold mt-2 block ${isAdmin ? "text-slate-700 hover:text-slate-900" : "text-purple-600 hover:text-purple-800"}`}>
                {isAdmin ? "View platform alerts →" : "View recommendations →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {/* Header */}
          <div className={`p-4 flex items-center justify-between flex-shrink-0 ${isAdmin ? "bg-gradient-to-r from-slate-800 to-slate-900" : isBrand ? "bg-gradient-to-r from-blue-600 to-cyan-600" : "bg-gradient-to-r from-purple-600 to-indigo-600"}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                {isAdmin ? <Shield className="w-5 h-5 text-white" /> : isBrand ? <Building2 className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{isAdmin ? "Admin Assistant" : isBrand ? "Brand Advisor" : "Taskdrip Guide"}</div>
                <div className="text-white/70 text-xs">{isAdmin ? `${(user as any)?.firstName || 'Admin'} · Platform Operations` : isBrand ? `${(user as any)?.companyName || 'Your brand'} · ${brandRank.charAt(0).toUpperCase() + brandRank.slice(1)} Rank` : "AI-powered influencer advisor"}</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
          </div>

          {/* Tier / Rank / Admin banner */}
          {isAdmin ? (
            <div className="px-4 py-2 flex items-center gap-2 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              <Activity className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700">Platform Health Monitor</span>
              {pendingAlerts > 0 && (
                <Badge className="text-xs bg-red-500 text-white ml-auto">{pendingAlerts} alert{pendingAlerts !== 1 ? 's' : ''}</Badge>
              )}
              {pendingAlerts === 0 && (
                <Badge className="text-xs bg-green-500 text-white ml-auto">All clear</Badge>
              )}
            </div>
          ) : isCreator ? (
            <div className={`px-4 py-2 flex items-center gap-2 ${tierConf.bg} border-b ${tierConf.border} flex-shrink-0`}>
              <span className="text-base">{tierConf.icon}</span>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold ${tierConf.text}`}>{tierConf.name}</span>
                <span className="text-xs text-gray-500 ml-1">· {formatFollowers(totalFollowers)} followers</span>
              </div>
              {(tier === "newcomer" || tier === "aspiring") && (
                <Link href="/breedskool">
                  <Badge className="text-xs bg-purple-600 text-white hover:bg-purple-700 cursor-pointer">
                    <BookOpen className="w-3 h-3 mr-1" />BreedSkool
                  </Badge>
                </Link>
              )}
              {(tier === "power_influencers" || tier === "global_titans") && (
                <Link href="/breedskool">
                  <Badge className="text-xs bg-amber-500 text-white hover:bg-amber-600 cursor-pointer">
                    <Mic className="w-3 h-3 mr-1" />Teach
                  </Badge>
                </Link>
              )}
            </div>
          ) : (
            <div className="px-4 py-2 flex items-center gap-2 bg-blue-50 border-b border-blue-100 flex-shrink-0">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">{brandRank.charAt(0).toUpperCase() + brandRank.slice(1)} Brand</span>
              {(user as any)?.subscriptionStatus === 'active' && (
                <Badge className="text-xs bg-blue-600 text-white hover:bg-blue-600">Premium ✓</Badge>
              )}
              <Link href="/campaigns/create" className="ml-auto">
                <Badge className="text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
                  <Target className="w-3 h-3 mr-1" />New Campaign
                </Badge>
              </Link>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            <button onClick={() => setActiveTab("recommendations")} className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === "recommendations" ? (isAdmin ? "text-slate-800 border-b-2 border-slate-800 bg-slate-50" : "text-purple-600 border-b-2 border-purple-600 bg-purple-50") : "text-gray-500 hover:text-gray-700"}`}>
              {isAdmin ? <Activity className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isAdmin ? "Alerts" : "Recommendations"}
              {recommendations.length > 0 && (<span className={`text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center ${isAdmin && pendingAlerts > 0 ? "bg-red-500" : isAdmin ? "bg-slate-700" : "bg-purple-600"}`}>{recommendations.length}</span>)}
            </button>
            <button onClick={() => setActiveTab("chat")} className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === "chat" ? (isAdmin ? "text-slate-800 border-b-2 border-slate-800 bg-slate-50" : "text-purple-600 border-b-2 border-purple-600 bg-purple-50") : "text-gray-500 hover:text-gray-700"}`}>
              <MessageSquare className="w-3.5 h-3.5" />
              {isAdmin ? "Ask Admin Bot" : "Chat"}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "recommendations" && (
              <div className="p-4 space-y-4">
                {!isAdmin && <ProfileScore user={user} socialLinks={socialLinks as any[]} />}
                {isAdmin && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 text-center">
                      <div className="text-lg font-bold text-slate-800">{(adminUsers as any[]).filter((u: any) => u.userType !== 'admin').length}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Users</div>
                    </div>
                    <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 text-center">
                      <div className="text-lg font-bold text-amber-700">{(adminTransactions as any[]).filter((t: any) => t.status === 'pending').length}</div>
                      <div className="text-[10px] text-amber-600 mt-0.5">Pending</div>
                    </div>
                    <div className="rounded-xl p-3 bg-blue-50 border border-blue-200 text-center">
                      <div className="text-lg font-bold text-blue-700">{(adminCampaigns as any[]).filter((c: any) => c.status === 'active').length}</div>
                      <div className="text-[10px] text-blue-600 mt-0.5">Active</div>
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{isAdmin ? "Platform Alerts" : "Action Items"}</p>
                  {recommendations.map((rec, i) => {
                    const Icon = rec.icon;
                    return (
                      <div key={i} className={`rounded-xl p-3 border ${rec.type === "success" ? "bg-green-50 border-green-100" : rec.type === "warning" ? "bg-amber-50 border-amber-100" : rec.type === "action" ? (isAdmin ? "bg-slate-50 border-slate-200" : "bg-purple-50 border-purple-100") : "bg-blue-50 border-blue-100"}`}>
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${rec.type === "success" ? "text-green-600" : rec.type === "warning" ? "text-amber-600" : rec.type === "action" ? (isAdmin ? "text-slate-700" : "text-purple-600") : "text-blue-600"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900">{rec.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{rec.description}</p>
                            {rec.action && (
                              <Link href={rec.action.href}>
                                <button className="text-xs font-semibold text-purple-600 hover:text-purple-800 mt-1.5 flex items-center gap-1">
                                  {rec.action.label} →
                                </button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {recommendations.length === 0 && (
                    <div className="text-center py-6">
                      <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">All looking great!</p>
                      <p className="text-xs text-gray-400 mt-1">{isBrand ? "Your brand profile is well set up." : "Your influencer profile is complete and optimised!"}</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => sendToInboxMutation.mutate(generateInboxReport(user, socialLinks as any[], recommendations))}
                    disabled={sendToInboxMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                    data-testid="button-send-guide-to-inbox"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    {sendToInboxMutation.isPending ? "Sending..." : "Send full report to Inbox"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-full" style={{ minHeight: "300px" }}>
                {/* Quick-reply flow buttons */}
                <div className="px-3 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick Help</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(isAdmin ? [
                      { label: "Pending Payouts", icon: Clock, msg: "Show me all pending payout transactions." },
                      { label: "Unverified Users", icon: UserCheck, msg: "How many users are unverified?" },
                      { label: "Active Campaigns", icon: Briefcase, msg: "How many active campaigns are running?" },
                      { label: "Platform Revenue", icon: DollarSign, msg: "What is the platform revenue summary?" },
                      { label: "Contact Support", icon: HeadphonesIcon, msg: "How do I escalate a support issue?" },
                    ] : [
                      { label: "How to Start", icon: Play, msg: "How do I get started on Taskdrip?" },
                      { label: "How to Earn", icon: DollarSign, msg: "How do I earn money on Taskdrip?" },
                      { label: "How to Withdraw", icon: Zap, msg: "How do I withdraw my earnings?" },
                      { label: "Get Campaigns", icon: Briefcase, msg: "How do I get campaigns?" },
                      { label: "Contact Support", icon: HeadphonesIcon, msg: "How do I contact support?" },
                    ]).map((flow) => {
                      const Icon = flow.icon;
                      return (
                        <button
                          key={flow.label}
                          onClick={() => {
                            const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: flow.msg, timestamp: new Date() };
                            setChatMessages(prev => [...prev, userMsg]);
                            setIsAiTyping(true);
                            setTimeout(() => {
                              const response = isAdmin
                                ? getAdminBotResponse(flow.msg, { users: adminUsers as any[], transactions: adminTransactions as any[], campaigns: adminCampaigns as any[], adApplications: adminAdApplications as any[] })
                                : isBrand
                                ? getBrandBotResponse(flow.msg, user)
                                : getCreatorBotResponse(flow.msg, user, socialLinks as any[]);
                              const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "bot", content: response, timestamp: new Date() };
                              setChatMessages(prev => [...prev, botMsg]);
                              setIsAiTyping(false);
                            }, 700);
                          }}
                          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors border ${isAdmin ? "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200" : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"}`}
                        >
                          <Icon className="w-3 h-3" /> {flow.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "bot" && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 ${isAdmin ? "bg-slate-800" : isBrand ? "bg-blue-600" : "bg-purple-600"}`}>
                          {isAdmin ? <Shield className="w-3 h-3 text-white" /> : isBrand ? <Building2 className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="flex justify-start">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 ${isAdmin ? "bg-slate-800" : isBrand ? "bg-blue-600" : "bg-purple-600"}`}>
                        {isAdmin ? <Shield className="w-3 h-3 text-white" /> : isBrand ? <Building2 className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
                      </div>
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                {/* Social quick links */}
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Quick Links</p>
                  <div className="flex gap-2">
                    <a
                      href={SOCIALS.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 border border-[#229ED9]/20 transition-colors"
                    >
                      <SiTelegram className="w-3 h-3" /> Telegram
                    </a>
                    <a
                      href={SOCIALS.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-colors"
                    >
                      <SiWhatsapp className="w-3 h-3" /> WhatsApp
                    </a>
                    <Link href="/contact" className="flex-1">
                      <span className="flex items-center justify-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors w-full">
                        <HeadphonesIcon className="w-3 h-3" /> Support
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="p-3 border-t border-gray-100 flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                      placeholder={isAdmin ? "Ask about users, payouts, campaigns..." : isBrand ? "Ask about campaigns, influencers..." : "Ask me anything..."}
                      className="rounded-xl text-xs border-gray-200 h-9"
                      data-testid="input-guide-chat"
                      disabled={isAiTyping}
                    />
                    <Button size="sm" onClick={handleSendChat} disabled={!chatInput.trim() || isAiTyping} className={`rounded-xl h-9 px-3 ${isAdmin ? "bg-slate-800 hover:bg-slate-900" : isBrand ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"} text-white`} data-testid="button-guide-send">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setShowPopup(false); }}
        className={`fixed bottom-6 right-4 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all hover:scale-110 ${isAdmin ? "bg-gradient-to-br from-slate-800 to-slate-900" : isBrand ? "bg-gradient-to-br from-blue-600 to-cyan-600" : "bg-gradient-to-br from-purple-600 to-indigo-600"}`}
        data-testid="button-guide-bot-toggle"
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : isAdmin ? <Shield className="w-6 h-6 text-white" /> : isBrand ? <Building2 className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
        {!isOpen && recommendations.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{recommendations.length}</span>
        )}
      </button>
    </>
  );
}
