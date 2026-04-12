import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getTierFromFollowers, getTierConfig, formatFollowers } from "@/lib/tiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Bot, X, Send, ChevronDown, Sparkles, BookOpen, ShoppingBag,
  TrendingUp, CheckCircle, AlertCircle, MessageSquare, Inbox,
  Users, Star, Zap, ExternalLink
} from "lucide-react";
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

function analyzeProfile(user: any, socialLinks: any[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const totalFollowers = user?.totalFollowers || 0;
  const tier = getTierFromFollowers(totalFollowers);
  const tierConf = getTierConfig(tier);
  const completedCampaigns = user?.completedCampaigns || 0;
  const hasProfileImage = !!user?.profileImageUrl;
  const hasBio = !!(user?.bio && user.bio.length > 20);
  const hasLocation = !!user?.location;
  const hasNiche = !!user?.niche;
  const hasSocialLinks = socialLinks.length > 0 || totalFollowers > 0;

  if (tier === "newcomer" || tier === "aspiring") {
    recs.push({
      type: "action",
      icon: BookOpen,
      title: "Grow your audience with BreedSkool",
      description: `You currently have ${formatFollowers(totalFollowers)} followers. Join BreedSkool to learn proven strategies to grow your social media following and unlock influencer earning tiers (Rising Sparks requires 10K+ followers).`,
      action: { label: "Visit BreedSkool", href: "/breedskool" },
    });
  }

  if (!hasProfileImage) {
    recs.push({
      type: "warning",
      icon: AlertCircle,
      title: "Add a profile photo",
      description: "Profiles with photos get 3x more campaign invitations. Upload a clear, professional headshot to stand out to brands.",
      action: { label: "Update Profile", href: "/profile-edit" },
    });
  }

  if (!hasBio) {
    recs.push({
      type: "warning",
      icon: AlertCircle,
      title: "Complete your bio",
      description: "A compelling bio helps brands understand your niche and expertise. Aim for at least 2–3 sentences describing your content style and audience.",
      action: { label: "Edit Bio", href: "/profile-edit" },
    });
  }

  if (!hasNiche) {
    recs.push({
      type: "info",
      icon: Star,
      title: "Select your content niche",
      description: "Setting a niche helps match you with relevant brand campaigns. Influencers with a niche earn 40% more on average.",
      action: { label: "Set Niche", href: "/profile-edit" },
    });
  }

  if (!hasSocialLinks) {
    recs.push({
      type: "warning",
      icon: Users,
      title: "Connect your social channels",
      description: "Add your social media handles and follower counts so brands can see your reach. This unlocks higher-paying campaigns.",
      action: { label: "Add Channels", href: "/profile-edit" },
    });
  }

  if (completedCampaigns === 0 && totalFollowers >= 10_000) {
    recs.push({
      type: "action",
      icon: TrendingUp,
      title: "Join your first campaign",
      description: "You have enough followers to start earning! Browse active campaigns and submit your first application today.",
      action: { label: "Browse Campaigns", href: "/campaigns" },
    });
  } else if (completedCampaigns > 0) {
    recs.push({
      type: "success",
      icon: CheckCircle,
      title: `${completedCampaigns} campaign${completedCampaigns > 1 ? 's' : ''} completed`,
      description: `Great work! Keep completing campaigns to level up your profile score and unlock premium brand deals.`,
      action: { label: "Find More", href: "/campaigns" },
    });
  }

  if (totalFollowers > 0 && tierConf.breedskoolRecommend === false && completedCampaigns < 5) {
    recs.push({
      type: "info",
      icon: ShoppingBag,
      title: "Explore creator tools in the Shop",
      description: "Boost your content quality with tools, templates, and resources available in the Taskdrip shop.",
      action: { label: "Visit Shop", href: "/shop" },
    });
  }

  if (tier === "rising_sparks" || tier === "growth_engines") {
    recs.push({
      type: "info",
      icon: Zap,
      title: `You're a ${tierConf.name}!`,
      description: `Your ${formatFollowers(totalFollowers)} total followers put you in the ${tierConf.name} tier. ${tier === "rising_sparks" ? "Reach 100K followers to become a Growth Engine and unlock premium campaigns." : "Reach 1M followers to become a Power Influencer with top-tier brand deals."}`,
    });
  }

  return recs;
}

function getBotResponse(message: string, user: any, socialLinks: any[]): string {
  const lower = message.toLowerCase();
  const totalFollowers = user?.totalFollowers || 0;
  const tier = getTierFromFollowers(totalFollowers);
  const tierConf = getTierConfig(tier);

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hey ${user?.firstName || "there"}! 👋 I'm your Taskdrip Guide. I'm here to help you maximize your influence and earnings on the platform. Ask me anything — or check the Recommendations tab to see personalized tips for your profile!`;
  }

  if (lower.includes("tier") || lower.includes("rank") || lower.includes("level")) {
    return `You're currently a **${tierConf.name}** ${tierConf.icon} with ${formatFollowers(totalFollowers)} total followers. ${
      tier === "newcomer" ? "Visit BreedSkool to learn how to grow your audience and reach the Rising Sparks tier (10K+ followers)."
      : tier === "aspiring" ? `You need ${formatFollowers(10_000 - totalFollowers)} more followers to reach Rising Sparks. Keep creating content and use BreedSkool strategies!`
      : tier === "rising_sparks" ? `You need ${formatFollowers(100_000 - totalFollowers)} more followers to become a Growth Engine.`
      : tier === "growth_engines" ? `Impressive! You need ${formatFollowers(1_000_000 - totalFollowers)} more followers to become a Power Influencer.`
      : tier === "power_influencers" ? `Outstanding reach! Power Influencers have access to premium brand deals. Keep growing!`
      : `You're a Global Titan — the pinnacle of influence on Taskdrip! 👑`
    }`;
  }

  if (lower.includes("earn") || lower.includes("money") || lower.includes("campaign")) {
    if (totalFollowers < 10_000) {
      return `To start earning through campaigns, you'll need at least 10,000 followers (Rising Sparks tier). I recommend visiting **BreedSkool** to learn growth strategies! Once you hit 10K, browse campaigns and apply to ones that match your niche.`;
    }
    return `Great question! Here's how to maximize earnings:\n\n1. **Complete more campaigns** — each one builds your reputation\n2. **Negotiate rates** — update your content rate card in Profile Settings\n3. **Engage with your audience** — higher engagement = premium brand deals\n4. **Diversify platforms** — add more social channels to your profile\n\nHead to /campaigns to see what's available right now!`;
  }

  if (lower.includes("breedskool") || lower.includes("course") || lower.includes("learn")) {
    return `BreedSkool is Taskdrip's learning platform where you can take courses on growing your social media presence, content creation, and influencer marketing. ${totalFollowers < 10_000 ? "Since you're still building your audience, this is the perfect place to start! " : ""}Visit /breedskool to see all available courses. Some are free!`;
  }

  if (lower.includes("follower") || lower.includes("grow") || lower.includes("audience")) {
    return `Growing your audience takes consistency! Here are proven tips:\n\n• **Post consistently** — at least 4–5 times per week\n• **Engage with comments** — reply to every comment in the first hour\n• **Use trending hashtags** — research what's working in your niche\n• **Collaborate** — cross-promote with other creators\n• **Optimize posting times** — post when your audience is most active\n\nCheck out BreedSkool for in-depth courses on each of these strategies!`;
  }

  if (lower.includes("profile") || lower.includes("bio") || lower.includes("setup")) {
    const missing = [];
    if (!user?.profileImageUrl) missing.push("profile photo");
    if (!user?.bio || user.bio.length < 20) missing.push("detailed bio");
    if (!user?.niche) missing.push("content niche");
    if (!user?.location) missing.push("location");

    if (missing.length === 0) {
      return `Your profile looks great! You have a complete profile with photo, bio, niche, and location. This puts you at the top of brand search results. Keep it updated as you grow! 🌟`;
    }
    return `Your profile is missing: **${missing.join(", ")}**. A complete profile gets up to 5x more brand invitations. Head to /profile-edit to fill these in — it takes less than 5 minutes!`;
  }

  if (lower.includes("social") || lower.includes("channel") || lower.includes("link")) {
    return `Adding all your social channels helps brands understand your total reach. Go to **Profile Settings** → **Social Channels** tab to:\n\n• Add TikTok, Instagram, YouTube, Twitter handles\n• Enter your follower counts for each platform\n• Add custom channels (Discord, Snapchat, etc.)\n\nYour combined follower count determines your tier ranking!`;
  }

  if (lower.includes("tip") || lower.includes("donate") || lower.includes("support")) {
    return `The Tip feature lets fans and brands send you direct payments as a show of appreciation for your content. When you post to the Feed, viewers can click the gift icon to tip you through Taskdrip's checkout system. Make sure your posts are engaging and valuable to encourage tips!`;
  }

  if (lower.includes("shop") || lower.includes("product")) {
    return `The Taskdrip Shop has creator tools, templates, and resources to level up your content. Whether you need editing presets, social media templates, or marketing guides, check out /shop for available products!`;
  }

  if (lower.includes("help") || lower.includes("what can you")) {
    return `I can help you with:\n\n🎯 **Profile optimization** — "How do I improve my profile?"\n📈 **Tier progression** — "How do I level up?"\n💰 **Earnings** — "How do I earn more?"\n🎓 **Learning** — "What courses should I take?"\n👥 **Growing followers** — "How do I grow my audience?"\n📱 **Social channels** — "How do I add my channels?"\n\nJust ask me anything!`;
  }

  return `That's a great question! Based on your profile, my top recommendation is: ${
    totalFollowers < 10_000
      ? "visit BreedSkool to build your audience to 10K+ followers and unlock influencer earning tiers."
      : totalFollowers < 100_000
      ? "focus on completing campaigns and growing your followers to 100K to reach Growth Engine tier."
      : "leverage your strong following to negotiate higher rates with brands and diversify your income streams."
  } Is there something more specific I can help you with?`;
}

function ProfileScore({ user, socialLinks }: { user: any; socialLinks: any[] }) {
  const checks = [
    { label: "Profile photo", done: !!user?.profileImageUrl },
    { label: "Bio written", done: !!(user?.bio && user.bio.length > 20) },
    { label: "Niche selected", done: !!user?.niche },
    { label: "Social channels added", done: (socialLinks.length > 0 || (user?.totalFollowers || 0) > 0) },
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
        <div
          className={`h-2 rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${score}%` }}
        />
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

  const { data: socialLinks = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${(user as any)?.id}/social-links`],
    enabled: isAuthenticated && !!(user as any)?.id,
  });

  const sendToInboxMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/guide/send-to-inbox", {
        subject: "Your Taskdrip Guide Report",
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report sent to your inbox!", description: "Check Messages for your full guide." });
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
      const welcome: ChatMessage = {
        id: "welcome",
        role: "bot",
        content: `Hey ${(user as any)?.firstName || "there"}! 👋 I'm your Taskdrip Guide — powered by smart profile analysis. Check the **Recommendations** tab for personalized tips, or chat with me here for advice on growing your influence and earnings!`,
        timestamp: new Date(),
      };
      setChatMessages([welcome]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    const input = chatInput;
    setChatInput("");

    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: getBotResponse(input, user, socialLinks as any[]),
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, botResponse]);
    }, 600);
  };

  const recommendations = analyzeProfile(user, socialLinks as any[]);
  const totalFollowers = (user as any)?.totalFollowers || 0;
  const tier = getTierFromFollowers(totalFollowers);
  const tierConf = getTierConfig(tier);

  const generateInboxReport = () => {
    const score = Math.round(([
      !!(user as any)?.profileImageUrl,
      !!((user as any)?.bio && (user as any)?.bio?.length > 20),
      !!(user as any)?.niche,
      (socialLinks.length > 0 || totalFollowers > 0),
      ((user as any)?.completedCampaigns || 0) > 0,
      !!(user as any)?.location,
    ].filter(Boolean).length / 6) * 100);

    return `
Hello ${(user as any)?.firstName}!

Here is your personalized Taskdrip Guide Report:

━━━━━━━━━━━━━━━━━━━━━━
📊 PROFILE OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━
Current Tier: ${tierConf.name} ${tierConf.icon}
Total Followers: ${formatFollowers(totalFollowers)}
Campaigns Completed: ${(user as any)?.completedCampaigns || 0}
Profile Score: ${score}%

━━━━━━━━━━━━━━━━━━━━━━
💡 YOUR RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━
${recommendations.map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}${r.action ? `\n   → ${r.action.label}: taskdrip.com${r.action.href}` : ''}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━
🎯 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━
${tier === 'newcomer' || tier === 'aspiring' 
  ? '1. Visit BreedSkool to learn audience growth strategies\n2. Complete your profile (photo, bio, niche)\n3. Add all your social media channels'
  : '1. Browse and join active campaigns\n2. Update your content rate card\n3. Engage with your audience consistently'
}

Keep growing! Your Taskdrip Guide 🤖
    `.trim();
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Popup notification */}
      {showPopup && !isOpen && (
        <div className="fixed bottom-24 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 max-w-xs animate-in slide-in-from-bottom-5 duration-300">
          <button onClick={() => setShowPopup(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 mb-1">Your Guide has a tip!</p>
              <p className="text-xs text-gray-600">
                {recommendations.length > 0 
                  ? recommendations[0].description.substring(0, 80) + "..." 
                  : "Check your profile analysis for personalized growth tips!"}
              </p>
              <button
                onClick={() => { setShowPopup(false); setIsOpen(true); }}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 mt-2 block"
              >
                View recommendations →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main guide panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Taskdrip Guide</div>
                <div className="text-white/70 text-xs">AI-powered growth advisor</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tier banner */}
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
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === "recommendations" ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Recommendations
              {recommendations.length > 0 && (
                <span className="bg-purple-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{recommendations.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === "chat" ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50" : "text-gray-500 hover:text-gray-700"}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "recommendations" && (
              <div className="p-4 space-y-4">
                <ProfileScore user={user} socialLinks={socialLinks as any[]} />
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Action Items</p>
                  {recommendations.map((rec, i) => {
                    const Icon = rec.icon;
                    return (
                      <div key={i} className={`rounded-xl p-3 border ${
                        rec.type === "success" ? "bg-green-50 border-green-100"
                        : rec.type === "warning" ? "bg-amber-50 border-amber-100"
                        : rec.type === "action" ? "bg-purple-50 border-purple-100"
                        : "bg-blue-50 border-blue-100"
                      }`}>
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            rec.type === "success" ? "text-green-600"
                            : rec.type === "warning" ? "text-amber-600"
                            : rec.type === "action" ? "text-purple-600"
                            : "text-blue-600"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900">{rec.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{rec.description}</p>
                            {rec.action && (
                              <Link href={rec.action.href}>
                                <button className={`mt-2 text-xs font-semibold flex items-center gap-1 ${
                                  rec.type === "action" ? "text-purple-600 hover:text-purple-800"
                                  : rec.type === "warning" ? "text-amber-700 hover:text-amber-900"
                                  : rec.type === "success" ? "text-green-700 hover:text-green-900"
                                  : "text-blue-700 hover:text-blue-900"
                                }`}>
                                  {rec.action.label} <ExternalLink className="w-3 h-3" />
                                </button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => sendToInboxMutation.mutate(generateInboxReport())}
                  disabled={sendToInboxMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors disabled:opacity-60"
                  data-testid="button-send-guide-to-inbox"
                >
                  <Inbox className="w-4 h-4" />
                  {sendToInboxMutation.isPending ? "Sending..." : "Send full report to my inbox"}
                </button>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ minHeight: 200 }}>
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      {msg.role === "bot" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "bot"
                          ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                          : "bg-purple-600 text-white rounded-tr-sm"
                      }`}>
                        {msg.content.split('\n').map((line, i) => (
                          <span key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}{i < msg.content.split('\n').length - 1 ? <br /> : null}</span>
                        ))}
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarImage src={(user as any)?.profileImageUrl} />
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                            {(user as any)?.firstName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
                  <Input
                    placeholder="Ask me anything..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    className="text-xs rounded-xl border-gray-200 flex-1"
                    data-testid="input-guide-chat"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-3"
                    data-testid="button-send-guide-chat"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setShowPopup(false); }}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? "bg-gray-900 text-white"
            : "bg-gradient-to-br from-purple-600 to-indigo-600 text-white hover:shadow-purple-300/50"
        }`}
        data-testid="button-open-guide-bot"
        title="Open Taskdrip Guide"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        {!isOpen && recommendations.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {recommendations.length}
          </span>
        )}
      </button>
    </>
  );
}
