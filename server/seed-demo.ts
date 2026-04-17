import { db } from "./db";
import { courses, shopProducts, courseLessons, posts, blogPosts, campaigns, paymentNetworks, paymentMethods } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { storage } from "./storage";

const ADMIN_ID = "demo-admin-seed-id";

const DEMO_COURSES = [
  {
    title: "Instagram Growth Masterclass",
    shortDescription: "Grow from 0 to 100K followers with proven strategies",
    description: "Master the Instagram algorithm, create scroll-stopping content, and build a loyal audience that converts. This comprehensive course covers everything from profile optimization to viral content creation, hashtag strategy, and monetization techniques used by top influencers.",
    category: "instagram_growth",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=450&fit=crop",
    price: "49.00",
    isFree: false,
    level: "beginner",
    duration: "6h 30m",
    isPublished: true,
    isFeatured: true,
    whatYouLearn: [
      "Master the Instagram algorithm to maximize reach",
      "Create a consistent brand aesthetic that attracts followers",
      "Write captions that drive engagement and followers",
      "Use Reels, Stories, and Lives to 10x your growth",
      "Monetize your account with brand deals and affiliates",
    ],
    requirements: [
      "A smartphone or computer with internet access",
      "An active Instagram account (any size)",
    ],
    lessons: [
      { title: "Welcome & Course Overview", content: "Welcome to the Instagram Growth Masterclass! In this lesson we set the stage for your transformation.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 1, isPreview: true },
      { title: "Profile Optimization Blueprint", content: "Your profile is your storefront. Learn how to optimize every element — bio, highlights, username, and profile photo — to convert visitors into followers.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 2, isPreview: true },
      { title: "Understanding the Instagram Algorithm", content: "Deep dive into how Instagram ranks content in 2024 and what you need to do to get maximum exposure.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 3, isPreview: false },
      { title: "Content Strategy That Converts", content: "Build a 30-day content calendar using the CARE framework: Content pillars, Aesthetics, Rhythm, Engagement triggers.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 4, isPreview: false },
      { title: "Reels Mastery – Go Viral", content: "Reels are the #1 growth tool on Instagram. Learn the hooks, transitions, and posting times that get millions of views.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 5, isPreview: false },
      { title: "Hashtag Strategy 2024", content: "Stop wasting time on dead hashtags. Learn our data-driven hashtag research method that increases reach by 300%.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 6, isPreview: false },
      { title: "Monetization: Land Your First Brand Deal", content: "Turn your audience into income. We cover media kits, outreach emails, rate negotiation, and platforms to find brands.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 7, isPreview: false },
    ],
  },
  {
    title: "TikTok Virality Formula",
    shortDescription: "The exact system to go viral on TikTok — every time",
    description: "Unlock the TikTok algorithm and learn how to create videos that rack up millions of views. From video hooks and trending sounds to niche positioning and influencer monetization — this course has it all. Perfect for beginners and intermediate influencers.",
    category: "tiktok_mastery",
    thumbnail: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=450&fit=crop",
    price: "0.00",
    isFree: true,
    level: "beginner",
    duration: "4h 15m",
    isPublished: true,
    isFeatured: true,
    whatYouLearn: [
      "Create a TikTok hook in the first 3 seconds",
      "Find trending audio before it peaks",
      "Build a niche that the algorithm loves",
      "Edit high-quality videos on your phone",
      "Earn from the TikTok Influencer Fund and brand deals",
    ],
    requirements: [
      "A smartphone with the TikTok app installed",
      "Willingness to appear on camera",
    ],
    lessons: [
      { title: "TikTok Success Blueprint", content: "This free course reveals the exact framework used by top TikTok influencers to hit millions of views consistently.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 1, isPreview: true },
      { title: "The 3-Second Hook Formula", content: "If viewers don't stop scrolling in 3 seconds, your video is dead. Master the art of the perfect hook.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 2, isPreview: true },
      { title: "Trending Sounds & Duets", content: "Learn how to surf trending audio waves and use duets/stitches to piggyback on viral content ethically.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 3, isPreview: false },
      { title: "Editing Like a Pro on CapCut", content: "CapCut tutorial: transitions, text animations, green screen, and the secret settings for HD exports.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 4, isPreview: false },
      { title: "TikTok Monetization Secrets", content: "Influencer Fund, TikTok Shop, LIVE Gifts, and brand deals — your complete monetization roadmap.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 5, isPreview: false },
    ],
  },
  {
    title: "YouTube Channel to $10K/Month",
    shortDescription: "Build a profitable YouTube channel from scratch",
    description: "Learn how to start, grow, and monetize a YouTube channel in any niche. From channel branding and SEO to AdSense optimization and sponsorship deals — everything you need to turn YouTube into a full-time income source.",
    category: "youtube",
    thumbnail: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=450&fit=crop",
    price: "79.00",
    isFree: false,
    level: "intermediate",
    duration: "8h 45m",
    isPublished: true,
    isFeatured: false,
    whatYouLearn: [
      "Set up a channel that stands out in any niche",
      "Write click-worthy titles and thumbnails",
      "Master YouTube SEO for long-term organic traffic",
      "Hit 1,000 subscribers and 4,000 watch hours fast",
      "Earn through AdSense, memberships, and sponsorships",
    ],
    requirements: [
      "A computer with video editing software (free options covered)",
      "A camera or smartphone",
    ],
    lessons: [
      { title: "YouTube Success in 2024: What's Changed", content: "The YouTube landscape has shifted dramatically. Here's what matters now and what to ignore.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 1, isPreview: true },
      { title: "Channel Setup & Branding", content: "Everything from choosing your niche and channel name to designing a banner that attracts subscribers.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 2, isPreview: true },
      { title: "YouTube SEO Masterclass", content: "Rank your videos on page 1 using keyword research, tags, descriptions, and the click-through rate formula.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 3, isPreview: false },
      { title: "Thumbnail Design That Drives Clicks", content: "A great thumbnail can triple your CTR. Learn the psychology behind high-converting thumbnails.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 4, isPreview: false },
      { title: "Scripting & Video Structure", content: "Keep viewers watching with proven video structures — hooks, retention loops, CTAs, and end screens.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 5, isPreview: false },
      { title: "Reaching 1K Subs & Monetization", content: "The fastest legal strategies to hit the YouTube Partner Program threshold and start earning ad revenue.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 6, isPreview: false },
      { title: "Sponsorships & Brand Deals", content: "Land your first YouTube sponsorship: outreach templates, rate cards, negotiation scripts, and affiliate programs.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 7, isPreview: false },
      { title: "Scaling to $10K/Month", content: "Advanced monetization — Memberships, merchandise, courses, and how to hire a team to scale your channel.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 8, isPreview: false },
    ],
  },
  {
    title: "Crypto Monetization for Influencers",
    shortDescription: "Get paid in USDT and TON — the new influencer economy",
    description: "The influencer economy is going Web3. Learn how to accept crypto payments, use USDT and TON wallets, launch NFTs, and earn from decentralized platforms. This course is designed for influencers who want to future-proof their income streams.",
    category: "monetization",
    thumbnail: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=450&fit=crop",
    price: "59.00",
    isFree: false,
    level: "intermediate",
    duration: "5h 20m",
    isPublished: true,
    isFeatured: true,
    whatYouLearn: [
      "Set up USDT (TRC20 & BEP20) and TON wallets",
      "Accept crypto payments from brands and fans",
      "Understand DeFi opportunities for influencers",
      "Launch a simple NFT collection to monetize your audience",
      "Use Taskdrip to earn crypto for campaigns",
    ],
    requirements: [
      "Basic understanding of social media",
      "A smartphone for wallet setup",
    ],
    lessons: [
      { title: "The Web3 Influencer Economy Explained", content: "Why crypto payments are the future of influencer monetization and how to position yourself ahead of the curve.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 1, isPreview: true },
      { title: "Setting Up Your Crypto Wallets", content: "Step-by-step wallet setup for USDT on Tron (TRC20), BNB Smart Chain (BEP20), and TON. Includes security best practices.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 2, isPreview: true },
      { title: "Getting Paid in Crypto", content: "Add your wallet to brand briefs, invoices, and platforms. We cover everything from invoicing to gas fee management.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 3, isPreview: false },
      { title: "Taskdrip Platform Masterclass", content: "Use Taskdrip to find crypto-paying brand campaigns, submit proof of work, and receive USDT directly to your wallet.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 4, isPreview: false },
      { title: "NFTs for Influencers", content: "Launch a simple NFT membership or digital collectible for your audience — no coding required.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 5, isPreview: false },
    ],
  },
];

const DEMO_PRODUCTS = [
  {
    title: "Viral Content Templates Pack",
    shortDescription: "200+ scroll-stopping social media templates",
    description: "Get 200+ professionally designed Canva templates for Instagram, TikTok, and YouTube thumbnails. Each template is fully customizable and optimized for maximum engagement. Includes Stories, Reels covers, carousels, and post templates in trending styles.",
    price: "29.00",
    originalPrice: "49.00",
    category: "templates",
    type: "template",
    featuredImage: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=450&fit=crop",
    features: [
      "200+ Canva templates for all platforms",
      "Stories, Reels, carousels & posts included",
      "4 trending color palettes & 3 font families",
      "Lifetime access + free future updates",
      "Commercial license included",
    ],
    requirements: ["Free Canva account (templates work with free plan)"],
    isActive: true,
    isFeatured: true,
    isFree: false,
    tags: ["canva", "templates", "instagram", "tiktok", "design"],
  },
  {
    title: "Influencer Media Kit Template",
    shortDescription: "Professional media kit that wins brand deals",
    description: "Stand out from the crowd with a stunning, conversion-focused media kit. This Notion + Canva combo template includes your stats, audience demographics, past collaborations, and rate card — everything brands need to say YES to working with you.",
    price: "19.00",
    originalPrice: "35.00",
    category: "templates",
    type: "template",
    featuredImage: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=450&fit=crop",
    features: [
      "Canva media kit template (10 pages)",
      "Notion rate card + brand brief template",
      "Editable in Canva free plan",
      "Brand deal email scripts included",
      "Step-by-step video guide",
    ],
    requirements: ["Free Canva account", "Optional: free Notion account"],
    isActive: true,
    isFeatured: true,
    isFree: false,
    tags: ["media kit", "brand deals", "template", "influencer"],
  },
  {
    title: "Hashtag Research Tool Pro",
    shortDescription: "Find the best hashtags for your niche instantly",
    description: "Stop guessing which hashtags to use. This Chrome extension + spreadsheet tool analyzes hashtag difficulty, reach, and engagement rates across Instagram and TikTok to give you data-backed hashtag sets that actually grow your account.",
    price: "0.00",
    originalPrice: null,
    category: "tools",
    type: "software",
    featuredImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop",
    features: [
      "Hashtag difficulty score for any keyword",
      "Platform-specific sets for Instagram & TikTok",
      "Save custom hashtag groups",
      "Competitor hashtag analysis",
      "Free forever — no credit card required",
    ],
    requirements: ["Google Chrome browser", "Free Google account for spreadsheet"],
    isActive: true,
    isFeatured: false,
    isFree: true,
    tags: ["hashtags", "instagram", "tiktok", "free", "tool"],
  },
  {
    title: "Content Influencer Toolkit",
    shortDescription: "Everything you need to produce professional content",
    description: "The ultimate all-in-one toolkit for content influencers. Includes 50 Lightroom presets for photo editing, 30 LUTs for video color grading, a 12-month content calendar template, caption swipe file with 100+ viral captions, and a complete brand deal tracker spreadsheet.",
    price: "39.00",
    originalPrice: "75.00",
    category: "tools",
    type: "software",
    featuredImage: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=450&fit=crop",
    features: [
      "50 Lightroom presets (mobile + desktop)",
      "30 cinematic LUTs for video",
      "12-month content calendar (Notion & Google Sheets)",
      "100+ viral caption templates",
      "Brand deal tracker + invoice template",
    ],
    requirements: ["Adobe Lightroom (free mobile version works)", "Any video editor for LUTs"],
    isActive: true,
    isFeatured: true,
    isFree: false,
    tags: ["lightroom", "luts", "presets", "content influencer", "toolkit"],
  },
  {
    title: "Personal Brand Strategy Guide",
    shortDescription: "Build a brand that brands want to work with",
    description: "A comprehensive 80-page PDF guide covering everything from defining your niche and visual identity to pitching to Fortune 500 companies. Includes real case studies from influencers who went from 0 to six-figure brand deals using these exact strategies.",
    price: "24.00",
    originalPrice: "40.00",
    category: "education",
    type: "ebook",
    featuredImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop",
    features: [
      "80-page actionable PDF guide",
      "Niche selection framework",
      "Visual identity workbook",
      "Brand pitch templates & scripts",
      "5 real influencer case studies",
    ],
    requirements: ["PDF reader (free)"],
    isActive: true,
    isFeatured: false,
    isFree: false,
    tags: ["branding", "strategy", "ebook", "brand deals", "personal brand"],
  },
];

const DEMO_FEED_POSTS = [
  {
    id: "demo_feed_taskdrip_launch",
    content: "Welcome to the Taskdrip influencer feed. Share campaign wins, useful influencer tips, collaboration updates, and Web3 earning lessons with the community.",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=700&fit=crop",
    likeCount: 28,
    commentCount: 4,
    viewCount: 740,
    totalTipsReceived: "35.00",
  },
  {
    id: "demo_feed_brand_tip",
    content: "Brand tip: campaigns perform best when the task brief includes a clear deliverable, deadline, content example, approval checklist, and wallet/payment expectations up front.",
    imageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=700&fit=crop",
    likeCount: 19,
    commentCount: 2,
    viewCount: 512,
    totalTipsReceived: "12.00",
  },
  {
    id: "demo_feed_creator_tip",
    content: "Influencer tip: keep your profile fresh. Updated follower counts, niche tags, platform links, and proof of past work help brands approve you faster.",
    imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&h=700&fit=crop",
    likeCount: 43,
    commentCount: 7,
    viewCount: 980,
    totalTipsReceived: "48.00",
  },
];

const DEMO_BLOG_POSTS = [
  {
    title: "How Web3 Campaign Payments Make Influencer Work Faster",
    slug: "web3-campaign-payments-influencer-work",
    content: "<p>Web3 payments help global influencers work with brands without waiting on slow cross-border banking. On Taskdrip, brands fund campaigns, influencers submit proof, and approved rewards can be tracked clearly from one dashboard.</p><p>The strongest campaigns still start with a simple brief: what to create, where to publish it, when it is due, and how success will be reviewed.</p>",
    excerpt: "A practical look at why crypto-native campaign payments help brands and influencers move faster.",
    featuredImage: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=1200&h=700&fit=crop",
    category: "payments",
    tags: ["web3", "influencer economy", "payments"],
    isPublished: true,
    publishedAt: new Date(),
    viewCount: 1260,
    likesCount: 84,
    commentsCount: 9,
    metaDescription: "Learn how Web3 campaign payments improve speed and transparency for global influencer campaigns.",
    seoKeywords: "web3 influencer payments, crypto influencer campaigns, socialfi payments",
    readingTime: 4,
  },
  {
    title: "Influencer Tiers Explained: From Rising Sparks to Global Titans",
    slug: "influencer-tiers-explained-taskdrip",
    content: "<p>Taskdrip classifies influencers by audience size so brands can discover the right partners for each campaign. Rising Sparks are perfect for authentic niche engagement, while Global Titans offer large-scale reach.</p><p>The best strategy is not always choosing the largest influencer. Brands often see stronger conversion from influencers whose audience closely matches the product niche.</p>",
    excerpt: "Understand Taskdrip influencer tiers and how brands can select the right influencer mix.",
    featuredImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=700&fit=crop",
    category: "influencers",
    tags: ["influencer tiers", "influencer marketing", "brands"],
    isPublished: true,
    publishedAt: new Date(),
    viewCount: 940,
    likesCount: 61,
    commentsCount: 6,
    metaDescription: "A guide to Taskdrip influencer tiers and how brands can choose influencers for campaign performance.",
    seoKeywords: "influencer tiers, influencer tiers, Taskdrip influencers",
    readingTime: 5,
  },
  {
    title: "What Brands Should Include in a High-Converting Campaign Brief",
    slug: "high-converting-campaign-brief",
    content: "<p>A strong campaign brief removes guesswork. Include the campaign goal, target platform, content format, required talking points, prohibited claims, deadline, proof requirements, and reward amount.</p><p>Clear briefs reduce revision cycles and help influencers publish content that feels authentic while still protecting the brand.</p>",
    excerpt: "Use this campaign brief checklist to get better influencer submissions and faster approvals.",
    featuredImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=700&fit=crop",
    category: "brands",
    tags: ["campaign brief", "brand campaigns", "influencer management"],
    isPublished: true,
    publishedAt: new Date(),
    viewCount: 810,
    likesCount: 47,
    commentsCount: 5,
    metaDescription: "A practical checklist for creating influencer campaign briefs that convert.",
    seoKeywords: "campaign brief, influencer brief, brand influencer campaign",
    readingTime: 3,
  },
];

const DEMO_BRAND_EMAIL = "demobrand@taskdrip.online";
const DEMO_BRAND_ID = "demo-brand-seed-001";
const DEMO_CREATOR_EMAIL = "democreator@taskdrip.online";
const DEMO_CREATOR_ID = "demo-influencer-seed-001";

const DEMO_CAMPAIGNS_DATA = [
  {
    id: "demo-campaign-001",
    title: "Promote Taskdrip on Instagram Stories",
    description: "We want you to share Taskdrip on your Instagram stories. Post 3 consecutive stories showing how you earn crypto on Taskdrip — include your referral code and a CTA for followers to sign up. Tag @taskdrip and use #TaskdripEarns.",
    category: "Social Media",
    reward: "25.00",
    totalSlots: 20,
    filledSlots: 7,
    status: "active",
    isActive: true,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    requirements: ["Instagram account with 1,000+ followers", "Post 3 stories in a row", "Tag @taskdrip", "Include referral link in bio or story link"],
    estimatedTime: "1-2 hours",
    featuredImage: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=450&fit=crop",
    isFeatured: true,
  },
  {
    id: "demo-campaign-002",
    title: "TikTok Review — Crypto Earning App",
    description: "Create a 60-90 second TikTok video reviewing your experience using Taskdrip to earn USDT and TON crypto. Show the sign-up process, the tasks page, and a completed task. Authentic reviews only — no scripts provided.",
    category: "Crypto & Web3",
    reward: "50.00",
    totalSlots: 10,
    filledSlots: 3,
    status: "active",
    isActive: true,
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    requirements: ["TikTok account with 2,000+ followers", "60–90 second video format", "Must show platform walkthrough", "Post public (no private account)"],
    estimatedTime: "2-3 hours",
    featuredImage: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=450&fit=crop",
    isFeatured: true,
  },
  {
    id: "demo-campaign-003",
    title: "YouTube Short — Web3 Influencer Economy",
    description: "Create a 60-second YouTube Short explaining how influencers can get paid in USDT using Taskdrip. Target audience: influencers who don't know about crypto earning. Include the link in your description.",
    category: "YouTube",
    reward: "40.00",
    totalSlots: 15,
    filledSlots: 5,
    status: "active",
    isActive: true,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    requirements: ["YouTube channel with 500+ subscribers", "60-second Short format", "Add Taskdrip link in description", "Mention USDT payment"],
    estimatedTime: "2-4 hours",
    featuredImage: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=450&fit=crop",
    isFeatured: false,
  },
  {
    id: "demo-campaign-004",
    title: "Twitter/X Thread — Earn Crypto as an Influencer",
    description: "Write a 5-tweet thread on Twitter/X about how influencers can earn crypto on Taskdrip. Include stats, your personal experience, platform screenshots, and a call to action. Thread must stay up for at least 30 days.",
    category: "Social Media",
    reward: "20.00",
    totalSlots: 30,
    filledSlots: 12,
    status: "active",
    isActive: true,
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    requirements: ["Twitter/X account with 500+ followers", "5-tweet thread minimum", "Include Taskdrip link", "Thread must remain public for 30 days"],
    estimatedTime: "1 hour",
    featuredImage: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=450&fit=crop",
    isFeatured: false,
  },
  {
    id: "demo-campaign-005",
    title: "Telegram Community Share — Crypto Opportunity",
    description: "Share the Taskdrip platform in at least 3 active Telegram crypto groups or channels. You must be a real member (not spam accounts). Provide a screenshot of each post with the group name visible.",
    category: "Crypto & Web3",
    reward: "15.00",
    totalSlots: 50,
    filledSlots: 18,
    status: "active",
    isActive: true,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    requirements: ["Active Telegram account", "Must be real member in 3+ crypto groups", "Share unique message (no copy-paste spam)", "Provide screenshots with group name visible"],
    estimatedTime: "30 minutes",
    featuredImage: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=450&fit=crop",
    isFeatured: false,
  },
  {
    id: "demo-campaign-006",
    title: "Blog Post — Getting Paid in Crypto as a Influencer",
    description: "Write a 600+ word blog post on Medium, Substack, or your personal blog about how influencers can earn USDT/TON using platforms like Taskdrip. The article must include at least 2 links to Taskdrip and be indexed by Google (provide proof after 7 days).",
    category: "Content Creation",
    reward: "60.00",
    totalSlots: 8,
    filledSlots: 2,
    status: "active",
    isActive: true,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    requirements: ["Blog on Medium, Substack, or personal site", "600+ words", "2+ links to Taskdrip", "Google-indexed proof after 7 days", "Share final URL as proof"],
    estimatedTime: "3-5 hours",
    featuredImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=450&fit=crop",
    isFeatured: true,
  },
];

const PAYMENT_NETWORKS_DATA = [
  {
    networkKey: "usdt_tron",
    name: "USDT - Tron Network",
    shortName: "TRC-20",
    network: "tron",
    currency: "USDT",
    description: "USDT on Tron blockchain (TRC-20). Fast, low fees. Minimum: 1 USDT.",
    isActive: true,
    sortOrder: 1,
  },
  {
    networkKey: "usdt_ton",
    name: "USDT - TON Network",
    shortName: "TON",
    network: "ton",
    currency: "USDT",
    description: "USDT on The Open Network (TON). Native Telegram ecosystem. Minimum: 1 USDT.",
    isActive: true,
    sortOrder: 2,
  },
  {
    networkKey: "usdt_bsc",
    name: "USDT - BSC Network",
    shortName: "BEP-20",
    network: "bsc",
    currency: "USDT",
    description: "USDT on BNB Smart Chain (BEP-20). Binance ecosystem. Minimum: 1 USDT.",
    isActive: true,
    sortOrder: 3,
  },
  {
    networkKey: "usdt_eth",
    name: "USDT - Ethereum Network",
    shortName: "ERC-20",
    network: "eth",
    currency: "USDT",
    description: "USDT on Ethereum (ERC-20). Most widely supported. Higher gas fees apply. Minimum: 10 USDT.",
    isActive: true,
    sortOrder: 4,
  },
  {
    networkKey: "pi_network",
    name: "Pi Network",
    shortName: "Pi",
    network: "pi",
    currency: "PI",
    description: "Pi cryptocurrency on the Pi Network. Use your Pi username or wallet address.",
    isActive: true,
    sortOrder: 5,
  },
];

// Default payment methods seeded into payment_methods table
const DEFAULT_PAYMENT_METHODS_DATA = [
  {
    type: "crypto",
    label: "USDT – TON Network",
    network: "TON",
    currency: "USDT",
    address: "",
    instructions: "Send USDT on the TON network to this address. Minimum 1 USDT. Low gas fees.",
    isActive: true,
    sortOrder: 1,
  },
  {
    type: "crypto",
    label: "USDT – Tron (TRC-20)",
    network: "TRC-20",
    currency: "USDT",
    address: "",
    instructions: "Send USDT on the Tron TRC-20 network. Fast and cheap transactions.",
    isActive: true,
    sortOrder: 2,
  },
  {
    type: "crypto",
    label: "USDT – BNB Smart Chain (BEP-20)",
    network: "BEP-20",
    currency: "USDT",
    address: "",
    instructions: "Send USDT on BNB Smart Chain (BEP-20). Low fees via Binance ecosystem.",
    isActive: true,
    sortOrder: 3,
  },
  {
    type: "crypto",
    label: "Pi Network",
    network: "Pi",
    currency: "PI",
    address: "",
    instructions: "Send Pi to the wallet address or username shown. Enter your Pi username or wallet in the reference field.",
    isActive: true,
    sortOrder: 4,
  },
];

export async function seedDemoData(adminUserId: string) {
  try {
    // Check if demo data already exists
    const existingCourses = await db.select({ id: courses.id }).from(courses).limit(1);
    const existingProducts = await db.select({ id: shopProducts.id }).from(shopProducts).limit(1);
    const existingPosts = await db.select({ id: posts.id }).from(posts).limit(1);
    const existingBlogPosts = await db.select({ id: blogPosts.id }).from(blogPosts).limit(1);

    if (existingCourses.length === 0) {
      console.log("[seed] Seeding demo courses...");
      for (const courseData of DEMO_COURSES) {
        const { lessons, ...courseFields } = courseData;
        const [course] = await db.insert(courses).values({
          ...courseFields,
          instructorId: adminUserId,
          lessonsCount: lessons.length,
          studentsCount: Math.floor(Math.random() * 500) + 50,
          averageRating: (3.8 + Math.random() * 1.1).toFixed(2),
          reviewsCount: Math.floor(Math.random() * 80) + 10,
          likesCount: Math.floor(Math.random() * 200) + 20,
        }).returning();

        // Insert lessons
        for (const lesson of lessons) {
          await db.insert(courseLessons).values({
            courseId: course.id,
            title: lesson.title,
            content: lesson.content,
            videoLink: lesson.videoLink,
            order: lesson.order,
            isPreview: lesson.isPreview,
            lessonFiles: [],
          });
        }
      }
      console.log(`[seed] Created ${DEMO_COURSES.length} demo courses with lessons.`);
    }

    if (existingProducts.length === 0) {
      console.log("[seed] Seeding demo products...");
      for (const product of DEMO_PRODUCTS) {
        await db.insert(shopProducts).values({
          ...product,
          originalPrice: product.originalPrice ?? undefined,
          createdBy: adminUserId,
          salesCount: Math.floor(Math.random() * 300) + 20,
          rating: (3.7 + Math.random() * 1.2).toFixed(2),
          reviewCount: Math.floor(Math.random() * 60) + 5,
          likesCount: Math.floor(Math.random() * 150) + 10,
        });
      }
      console.log(`[seed] Created ${DEMO_PRODUCTS.length} demo products.`);
    }

    if (existingPosts.length === 0) {
      console.log("[seed] Seeding demo feed posts...");
      for (const post of DEMO_FEED_POSTS) {
        await db.insert(posts).values({
          ...post,
          userId: adminUserId,
        });
      }
      console.log(`[seed] Created ${DEMO_FEED_POSTS.length} demo feed posts.`);
    }

    if (existingBlogPosts.length === 0) {
      console.log("[seed] Seeding demo blog posts...");
      for (const post of DEMO_BLOG_POSTS) {
        await db.insert(blogPosts).values({
          ...post,
          authorId: adminUserId,
        });
      }
      console.log(`[seed] Created ${DEMO_BLOG_POSTS.length} demo blog posts.`);
    }

    // ── Demo Brand Account ──────────────────────────────────────────────────
    const existingBrand = await storage.getUserByEmail(DEMO_BRAND_EMAIL);
    let demoBrandId = existingBrand?.id || DEMO_BRAND_ID;
    if (!existingBrand) {
      console.log("[seed] Creating demo brand account...");
      const hashed = await bcrypt.hash("Brand@2024", 12);
      const genCode = (prefix: string) =>
        `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      await storage.createUser({
        id: demoBrandId,
        firstName: "Taskdrip",
        lastName: "Brand",
        email: DEMO_BRAND_EMAIL,
        password: hashed,
        userType: "brand",
        companyName: "Taskdrip Official",
        bio: "The official Taskdrip demo brand account. Campaigns here are examples of how brands use the platform to connect with influencers.",
        location: "Global",
        skills: [],
        referralCodeCreator: genCode("CR"),
        referralCodeBrand: genCode("BR"),
        avatarUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200&h=200&fit=crop",
        verified: true,
      } as any);
      console.log("[seed] Demo brand created: demobrand@taskdrip.online / Brand@2024");
    }

    // ── Demo Influencer Account ────────────────────────────────────────────────
    const existingCreator = await storage.getUserByEmail(DEMO_CREATOR_EMAIL);
    if (!existingCreator) {
      console.log("[seed] Creating demo influencer account...");
      const hashed = await bcrypt.hash("Influencer@2024", 12);
      const genCode = (prefix: string) =>
        `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      await storage.createUser({
        id: DEMO_CREATOR_ID,
        firstName: "Alex",
        lastName: "Influencer",
        email: DEMO_CREATOR_EMAIL,
        password: hashed,
        userType: "influencer",
        username: "alex_creator",
        bio: "Demo influencer account for Taskdrip. I create content around crypto, tech, and social media growth. This is a showcase account.",
        location: "Lagos, Nigeria",
        niche: "Tech",
        skills: ["Content Creation", "Social Media", "Crypto"],
        instagramHandle: "@alexcreates",
        tiktokHandle: "@alexcreates",
        youtubeHandle: "@alexcreates",
        twitterHandle: "@alexcreates",
        instagramFollowers: 12500,
        tiktokFollowers: 28000,
        youtubeFollowers: 5400,
        twitterFollowers: 8900,
        totalFollowers: 54800,
        creatorTier: "growth_engines",
        isVerified: true,
        completedCampaigns: 12,
        totalEarned: "340.00",
        availableBalance: "85.00",
        referralCodeCreator: genCode("CR"),
        referralCodeBrand: genCode("BR"),
      } as any);
      console.log("[seed] Demo influencer created: democreator@taskdrip.online / Influencer@2024");
    }

    // ── Demo Campaigns ──────────────────────────────────────────────────────
    const existingCampaigns = await db.select({ id: campaigns.id }).from(campaigns).limit(1);
    if (existingCampaigns.length === 0) {
      console.log("[seed] Seeding demo campaigns...");
      for (const c of DEMO_CAMPAIGNS_DATA) {
        await db.insert(campaigns).values({
          id: c.id,
          brandId: demoBrandId,
          brandName: "Taskdrip Official",
          title: c.title,
          description: c.description,
          category: c.category,
          reward: c.reward,
          totalSlots: c.totalSlots,
          filledSlots: c.filledSlots,
          status: c.status,
          isActive: c.isActive,
          deadline: c.deadline ? new Date(c.deadline) : null,
          requirements: c.requirements as any,
          estimatedTime: c.estimatedTime,
          featureImage: c.featuredImage,
          isFeatured: c.isFeatured,
        } as any);
      }
      console.log(`[seed] Created ${DEMO_CAMPAIGNS_DATA.length} demo campaigns.`);
    } else {
      for (const c of DEMO_CAMPAIGNS_DATA) {
        await db.update(campaigns)
          .set({ featureImage: c.featuredImage } as any)
          .where(sql`${campaigns.id} = ${c.id} AND ${campaigns.featureImage} IS NULL`);
      }
    }

    // ── Payment Networks ────────────────────────────────────────────────────
    // Upsert payment networks so new entries (like Pi Network) are always added
    let networksCreated = 0;
    for (const net of PAYMENT_NETWORKS_DATA) {
      const existing = await db.select({ id: paymentNetworks.id })
        .from(paymentNetworks)
        .where(eq(paymentNetworks.networkKey, net.networkKey))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(paymentNetworks).values(net as any);
        networksCreated++;
      }
    }
    if (networksCreated > 0) {
      console.log(`[seed] Seeding payment networks... Created ${networksCreated} payment network(s).`);
    }

    // ── Default Payment Methods ─────────────────────────────────────────────
    // Seed the 4 default crypto payment methods if payment_methods table is empty
    const existingMethods = await db.select({ id: paymentMethods.id }).from(paymentMethods).limit(1);
    if (existingMethods.length === 0) {
      console.log("[seed] Seeding default payment methods...");
      for (const method of DEFAULT_PAYMENT_METHODS_DATA) {
        await db.insert(paymentMethods).values({ ...method, id: crypto.randomUUID() } as any);
      }
      console.log(`[seed] Created ${DEFAULT_PAYMENT_METHODS_DATA.length} default payment methods.`);
    }

  } catch (err) {
    console.error("[seed] Demo seed error:", err);
  }
}
