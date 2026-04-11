import { db } from "./db";
import { courses, shopProducts, courseLessons } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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
    description: "Unlock the TikTok algorithm and learn how to create videos that rack up millions of views. From video hooks and trending sounds to niche positioning and creator monetization — this course has it all. Perfect for beginners and intermediate creators.",
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
      "Earn from the TikTok Creator Fund and brand deals",
    ],
    requirements: [
      "A smartphone with the TikTok app installed",
      "Willingness to appear on camera",
    ],
    lessons: [
      { title: "TikTok Success Blueprint", content: "This free course reveals the exact framework used by top TikTok creators to hit millions of views consistently.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 1, isPreview: true },
      { title: "The 3-Second Hook Formula", content: "If viewers don't stop scrolling in 3 seconds, your video is dead. Master the art of the perfect hook.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 2, isPreview: true },
      { title: "Trending Sounds & Duets", content: "Learn how to surf trending audio waves and use duets/stitches to piggyback on viral content ethically.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 3, isPreview: false },
      { title: "Editing Like a Pro on CapCut", content: "CapCut tutorial: transitions, text animations, green screen, and the secret settings for HD exports.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 4, isPreview: false },
      { title: "TikTok Monetization Secrets", content: "Creator Fund, TikTok Shop, LIVE Gifts, and brand deals — your complete monetization roadmap.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 5, isPreview: false },
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
    shortDescription: "Get paid in USDT and TON — the new creator economy",
    description: "The creator economy is going Web3. Learn how to accept crypto payments, use USDT and TON wallets, launch NFTs, and earn from decentralized platforms. This course is designed for influencers who want to future-proof their income streams.",
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
      { title: "The Web3 Creator Economy Explained", content: "Why crypto payments are the future of influencer monetization and how to position yourself ahead of the curve.", videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 1, isPreview: true },
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
    title: "Content Creator Toolkit",
    shortDescription: "Everything you need to produce professional content",
    description: "The ultimate all-in-one toolkit for content creators. Includes 50 Lightroom presets for photo editing, 30 LUTs for video color grading, a 12-month content calendar template, caption swipe file with 100+ viral captions, and a complete brand deal tracker spreadsheet.",
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
    tags: ["lightroom", "luts", "presets", "content creator", "toolkit"],
  },
  {
    title: "Personal Brand Strategy Guide",
    shortDescription: "Build a brand that brands want to work with",
    description: "A comprehensive 80-page PDF guide covering everything from defining your niche and visual identity to pitching to Fortune 500 companies. Includes real case studies from creators who went from 0 to six-figure brand deals using these exact strategies.",
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
      "5 real creator case studies",
    ],
    requirements: ["PDF reader (free)"],
    isActive: true,
    isFeatured: false,
    isFree: false,
    tags: ["branding", "strategy", "ebook", "brand deals", "personal brand"],
  },
];

export async function seedDemoData(adminUserId: string) {
  try {
    // Check if demo data already exists
    const existingCourses = await db.select({ id: courses.id }).from(courses).limit(1);
    const existingProducts = await db.select({ id: shopProducts.id }).from(shopProducts).limit(1);

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
  } catch (err) {
    console.error("[seed] Demo seed error:", err);
  }
}
