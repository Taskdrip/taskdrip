import { storage } from "./storage";
import { log } from "./vite";
import {
  DEFAULT_PORTFOLIO_PROFILE,
  DEFAULT_PORTFOLIO_PROJECTS,
  PORTFOLIO_CONTENT_KEYS,
} from "./portfolio-content";

const DEFAULT_SLIDERS = [
  {
    order: 0,
    badge: "For Influencers",
    headline: "Stop Getting Ghosted by Brands.",
    subheadline: "You create the content. Brands earn the revenue. Taskdrip lets you browse live paid campaigns, apply in one click, and get paid in USDT when your work is approved. 15,000+ influencers are already earning.",
    ctaPrimaryLabel: "Start Earning Now",
    ctaPrimaryLink: "/signup?type=creator",
    ctaSecondaryLabel: "Browse Tasks",
    ctaSecondaryLink: "/tasks",
    backgroundImage: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/50",
    accentColor: "from-orange-400 via-pink-400 to-purple-400",
    isActive: true,
  },
  {
    order: 1,
    badge: "For Brands",
    headline: "Tired of Wasting Budget on Fake Influencers?",
    subheadline: "Reach 15,000+ verified influencers across TikTok, Instagram, YouTube, X, and Telegram. Protect campaign funds with escrow — approve every submission before a single dollar is released.",
    ctaPrimaryLabel: "Launch a Campaign",
    ctaPrimaryLink: "/signup?type=brand",
    ctaSecondaryLabel: "Browse Influencers",
    ctaSecondaryLink: "/influencers",
    backgroundImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/50",
    accentColor: "from-blue-400 via-cyan-400 to-emerald-400",
    isActive: true,
  },
  {
    order: 2,
    badge: "Direct Hire",
    headline: "Hire an Influencer Directly. Pay After Delivery.",
    subheadline: "Bypass public campaigns and hire any verified influencer privately. Agree on terms in a private deal room, fund via USDT escrow, and release payment only when the work meets your standards.",
    ctaPrimaryLabel: "Find an Influencer",
    ctaPrimaryLink: "/influencers",
    ctaSecondaryLabel: "Create Brand Account",
    ctaSecondaryLink: "/signup?type=brand",
    backgroundImage: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/75 to-black/40",
    accentColor: "from-emerald-400 via-teal-400 to-cyan-400",
    isActive: true,
  },
  {
    order: 3,
    badge: "🔗 P2P Marketplace",
    headline: "Trade Crypto, Sell Services & Digital Products.",
    subheadline: "The Taskdrip P2P Hub lets you post crypto trades, digital services, and physical/digital products — all protected by admin-controlled escrow, a private deal-room chat, and a built-in dispute resolution system.",
    ctaPrimaryLabel: "Open P2P Hub",
    ctaPrimaryLink: "/p2p-hub",
    ctaSecondaryLabel: "List Something to Sell",
    ctaSecondaryLink: "/p2p-hub",
    backgroundImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/95 via-violet-950/80 to-black/60",
    accentColor: "from-violet-400 via-fuchsia-400 to-pink-400",
    isActive: true,
  },
  {
    order: 4,
    badge: "BreedSkool Academy",
    headline: "New to Influencing? Learn from the Best.",
    subheadline: "BreedSkool gives influencers practical courses, masterclasses, and mentorship for Instagram, TikTok, YouTube, and content monetization. Taught by top earners on the platform.",
    ctaPrimaryLabel: "Explore Courses",
    ctaPrimaryLink: "/breedskool",
    ctaSecondaryLabel: "Become an Instructor",
    ctaSecondaryLink: "/signup?type=creator",
    backgroundImage: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-indigo-900/60 to-black/50",
    accentColor: "from-indigo-400 via-blue-400 to-cyan-400",
    isActive: true,
  },
  {
    order: 8,
    badge: "BreedSkool Impact Campaign",
    headline: "Help a Young African Build the Future.",
    subheadline: "Support practical technology training, equipment, mentorship and pathways to work for young people in communities where opportunity is hardest to find.",
    ctaPrimaryLabel: "Support the campaign",
    ctaPrimaryLink: "/breedskool/campaign",
    ctaSecondaryLabel: "Join the training",
    ctaSecondaryLink: "/breedskool",
    backgroundImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/95 via-violet-950/75 to-black/45",
    accentColor: "from-amber-300 via-orange-400 to-rose-400",
    isActive: true,
  },
  {
    order: 5,
    badge: "Influencer Shop",
    headline: "Tools Built for Influencers Who Mean Business.",
    subheadline: "Browse templates, dev projects, scripts, GitHub repos, and digital toolkits that help you grow faster, improve your content, and sell your own digital assets to thousands of creators.",
    ctaPrimaryLabel: "Browse the Shop",
    ctaPrimaryLink: "/shop",
    ctaSecondaryLabel: "Sell Your Products",
    ctaSecondaryLink: "/signup?type=creator",
    backgroundImage: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-black/70 to-black/50",
    accentColor: "from-emerald-400 via-teal-400 to-cyan-400",
    isActive: true,
  },
  {
    order: 6,
    badge: "💰 $TDRIP Points & Referrals",
    headline: "Earn Points for Every Action. Share & Multiply.",
    subheadline: "Every login, campaign, referral, and social task earns $TDRIP points — off-chain rewards convertible to $TDRIP token at launch. Invite friends and earn 100 points per referral.",
    ctaPrimaryLabel: "See How Points Work",
    ctaPrimaryLink: "/tdrip",
    ctaSecondaryLabel: "Refer & Earn",
    ctaSecondaryLink: "/referrals",
    backgroundImage: "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-yellow-950/60 to-black/50",
    accentColor: "from-yellow-400 via-amber-400 to-orange-400",
    isActive: true,
  },
  {
    order: 7,
    badge: "🏠 BreedSkool Home Lessons",
    headline: "Tech Lessons Delivered to Your Home.",
    subheadline: "Book certified tutors to teach your child coding, AI tools, and digital skills at home. Flexible scheduling, one-on-one attention, and personalised learning for ages 6–17.",
    ctaPrimaryLabel: "Book a Home Lesson",
    ctaPrimaryLink: "/breedskool",
    ctaSecondaryLabel: "View All Programs",
    ctaSecondaryLink: "/breedskool",
    backgroundImage: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1800&q=85&auto=format&fit=crop",
    overlayColor: "from-black/90 via-pink-950/70 to-black/50",
    accentColor: "from-pink-400 via-rose-400 to-orange-400",
    isActive: true,
  },
];

const DEFAULT_PAGE_CONTENT = [
  // ── Global site settings ─────────────────────────────────────
  { page: "global", section: "site", key: "name", label: "Site Name", type: "text", defaultValue: "Taskdrip", order: 0 },
  { page: "global", section: "site", key: "tagline", label: "Site Tagline", type: "text", defaultValue: "Influencers Marketplace", order: 1 },
  { page: "global", section: "site", key: "description", label: "Meta Description", type: "textarea", defaultValue: "Taskdrip connects verified influencers with brands for crypto-paid collaborations.", order: 2 },
  { page: "global", section: "site", key: "logo_url", label: "Logo URL", type: "image", defaultValue: "", order: 3 },
  { page: "global", section: "contact", key: "email", label: "Contact Email", type: "text", defaultValue: "support@taskdrip.online", order: 0 },
  { page: "global", section: "contact", key: "telegram", label: "Telegram Link", type: "url", defaultValue: "https://t.me/taskdrip", order: 1 },
  { page: "global", section: "contact", key: "twitter", label: "Twitter/X Link", type: "url", defaultValue: "https://x.com/taskdrip", order: 2 },
  { page: "global", section: "contact", key: "instagram", label: "Instagram Link", type: "url", defaultValue: "https://instagram.com/taskdrip", order: 3 },

  // ── Landing page ─────────────────────────────────────────────
  { page: "landing", section: "platform_bar", key: "label", label: "Platform Bar Label", type: "text", defaultValue: "Earn across all major platforms", order: 0 },

  { page: "landing", section: "how_it_works", key: "title", label: "Section Title", type: "text", defaultValue: "Simple. Fast. Fair.", order: 0 },
  { page: "landing", section: "how_it_works", key: "subtitle", label: "Section Subtitle", type: "textarea", defaultValue: "Get started in minutes — whether you're a creator looking to earn or a brand ready to scale.", order: 1 },
  { page: "landing", section: "how_it_works", key: "creator_step1_title", label: "Creator Step 1 Title", type: "text", defaultValue: "Build Your Profile", order: 2 },
  { page: "landing", section: "how_it_works", key: "creator_step1_desc", label: "Creator Step 1 Description", type: "textarea", defaultValue: "Link your socials. Get auto-classified into your influencer tier instantly.", order: 3 },
  { page: "landing", section: "how_it_works", key: "creator_step2_title", label: "Creator Step 2 Title", type: "text", defaultValue: "Apply to Campaigns", order: 4 },
  { page: "landing", section: "how_it_works", key: "creator_step2_desc", label: "Creator Step 2 Description", type: "textarea", defaultValue: "Browse live brand tasks. Apply with one tap — no agencies, no gatekeepers.", order: 5 },
  { page: "landing", section: "how_it_works", key: "creator_step3_title", label: "Creator Step 3 Title", type: "text", defaultValue: "Submit & Get Paid", order: 6 },
  { page: "landing", section: "how_it_works", key: "creator_step3_desc", label: "Creator Step 3 Description", type: "textarea", defaultValue: "Post, submit proof, brand approves, and USDT lands in your wallet.", order: 7 },
  { page: "landing", section: "how_it_works", key: "brand_step1_title", label: "Brand Step 1 Title", type: "text", defaultValue: "Post Your Campaign", order: 8 },
  { page: "landing", section: "how_it_works", key: "brand_step1_desc", label: "Brand Step 1 Description", type: "textarea", defaultValue: "Set budget, requirements, and target tier. Go live the same day with escrow.", order: 9 },
  { page: "landing", section: "how_it_works", key: "brand_step2_title", label: "Brand Step 2 Title", type: "text", defaultValue: "Reach Verified Creators", order: 10 },
  { page: "landing", section: "how_it_works", key: "brand_step2_desc", label: "Brand Step 2 Description", type: "textarea", defaultValue: "Filter by tier, niche, platform, location, and follower count.", order: 11 },
  { page: "landing", section: "how_it_works", key: "brand_step3_title", label: "Brand Step 3 Title", type: "text", defaultValue: "Pay Only for Results", order: 12 },
  { page: "landing", section: "how_it_works", key: "brand_step3_desc", label: "Brand Step 3 Description", type: "textarea", defaultValue: "You review every submission. Release payment only when you're satisfied.", order: 13 },

  { page: "landing", section: "tiers", key: "title", label: "Tiers Section Title", type: "text", defaultValue: "Every Creator Has a Tier", order: 0 },
  { page: "landing", section: "tiers", key: "subtitle", label: "Tiers Section Subtitle", type: "textarea", defaultValue: "Auto-classified by your total social following. Higher tier = bigger campaigns and better payouts.", order: 1 },

  { page: "landing", section: "ecosystem", key: "title", label: "Ecosystem Section Title", type: "text", defaultValue: "One Platform. Four Income Streams.", order: 0 },
  { page: "landing", section: "ecosystem", key: "subtitle", label: "Ecosystem Section Subtitle", type: "textarea", defaultValue: "Taskdrip is your full creator economy — not just campaigns.", order: 1 },
  { page: "landing", section: "ecosystem", key: "campaigns_title", label: "Campaigns Card Title", type: "text", defaultValue: "Brand Campaigns", order: 2 },
  { page: "landing", section: "ecosystem", key: "campaigns_desc", label: "Campaigns Card Description", type: "textarea", defaultValue: "Complete paid tasks on TikTok, YouTube, Instagram and more. Earn USDT for every approved post.", order: 3 },
  { page: "landing", section: "ecosystem", key: "breedskool_title", label: "BreedSkool Card Title", type: "text", defaultValue: "BreedSkool Academy", order: 4 },
  { page: "landing", section: "ecosystem", key: "breedskool_desc", label: "BreedSkool Card Description", type: "textarea", defaultValue: "Learn from thriving influencers. Master Instagram, TikTok, YouTube and monetization strategies.", order: 5 },
  { page: "landing", section: "ecosystem", key: "shop_title", label: "Shop Card Title", type: "text", defaultValue: "Creator Shop", order: 6 },
  { page: "landing", section: "ecosystem", key: "shop_desc", label: "Shop Card Description", type: "textarea", defaultValue: "Premium templates, plugins, and digital tools built for influencer success. Buy or sell.", order: 7 },
  { page: "landing", section: "ecosystem", key: "referral_title", label: "Referral Card Title", type: "text", defaultValue: "Referral Rewards", order: 8 },
  { page: "landing", section: "ecosystem", key: "referral_desc", label: "Referral Card Description", type: "textarea", defaultValue: "Invite creators and brands. Earn passive crypto income for every person who joins your link.", order: 9 },

  { page: "landing", section: "campaigns_preview", key: "title", label: "Campaigns Preview Title", type: "text", defaultValue: "Open Campaigns", order: 0 },
  { page: "landing", section: "campaigns_preview", key: "subtitle", label: "Campaigns Preview Subtitle", type: "text", defaultValue: "Apply now — spots fill fast.", order: 1 },

  { page: "landing", section: "why_taskdrip", key: "title", label: "Why Taskdrip Title", type: "text", defaultValue: "Why Creators & Brands Choose Taskdrip", order: 0 },
  { page: "landing", section: "why_taskdrip", key: "subtitle", label: "Why Taskdrip Subtitle", type: "textarea", defaultValue: "Built differently — for real results, real trust, real payouts.", order: 1 },

  { page: "landing", section: "testimonials", key: "title", label: "Testimonials Title", type: "text", defaultValue: "What Creators Are Saying", order: 0 },
  { page: "landing", section: "testimonials", key: "t1_name", label: "Testimonial 1 — Name", type: "text", defaultValue: "Sarah K.", order: 1 },
  { page: "landing", section: "testimonials", key: "t1_role", label: "Testimonial 1 — Role", type: "text", defaultValue: "Beauty Influencer · 180K followers", order: 2 },
  { page: "landing", section: "testimonials", key: "t1_text", label: "Testimonial 1 — Quote", type: "textarea", defaultValue: "Taskdrip paid me $800 in USDT within 24 hours of completing my first campaign. Zero hassle — this is the future.", order: 3 },
  { page: "landing", section: "testimonials", key: "t1_avatar", label: "Testimonial 1 — Avatar URL", type: "image", defaultValue: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80&auto=format&fit=crop", order: 4 },
  { page: "landing", section: "testimonials", key: "t2_name", label: "Testimonial 2 — Name", type: "text", defaultValue: "Marcus T.", order: 5 },
  { page: "landing", section: "testimonials", key: "t2_role", label: "Testimonial 2 — Role", type: "text", defaultValue: "Tech Creator · 420K followers", order: 6 },
  { page: "landing", section: "testimonials", key: "t2_text", label: "Testimonial 2 — Quote", type: "textarea", defaultValue: "Best platform I've used. Instant transparent payments. I've earned over $15,000 this year on Taskdrip.", order: 7 },
  { page: "landing", section: "testimonials", key: "t2_avatar", label: "Testimonial 2 — Avatar URL", type: "image", defaultValue: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop", order: 8 },
  { page: "landing", section: "testimonials", key: "t3_name", label: "Testimonial 3 — Name", type: "text", defaultValue: "Priya S.", order: 9 },
  { page: "landing", section: "testimonials", key: "t3_role", label: "Testimonial 3 — Role", type: "text", defaultValue: "Fitness Coach · 65K followers", order: 10 },
  { page: "landing", section: "testimonials", key: "t3_text", label: "Testimonial 3 — Quote", type: "textarea", defaultValue: "I earned $2,400 last month on just 3 campaigns. The tier system makes me feel valued as a creator.", order: 11 },
  { page: "landing", section: "testimonials", key: "t3_avatar", label: "Testimonial 3 — Avatar URL", type: "image", defaultValue: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80&auto=format&fit=crop", order: 12 },

  { page: "landing", section: "final_cta", key: "title", label: "Final CTA Title", type: "text", defaultValue: "Ready to Turn Your Influence Into Income?", order: 0 },
  { page: "landing", section: "final_cta", key: "subtitle", label: "Final CTA Subtitle", type: "textarea", defaultValue: "Join 10,000+ creators already earning on Taskdrip. Free to join. Campaigns available today.", order: 1 },
  { page: "landing", section: "final_cta", key: "creator_btn", label: "Creator Button Label", type: "text", defaultValue: "I'm a Creator", order: 2 },
  { page: "landing", section: "final_cta", key: "brand_btn", label: "Brand Button Label", type: "text", defaultValue: "I'm a Brand", order: 3 },
  { page: "landing", section: "final_cta", key: "footnote", label: "Footnote Text", type: "text", defaultValue: "No credit card required. Campaigns ready the moment you sign up.", order: 4 },

  // ── BreedSkool page ──────────────────────────────────────────
  { page: "breedskool", section: "hero", key: "title", label: "Hero Title", type: "text", defaultValue: "Learn from Thriving Influencers", order: 0 },
  { page: "breedskool", section: "hero", key: "subtitle", label: "Hero Subtitle", type: "textarea", defaultValue: "BreedSkool is the only platform where active creators teach real strategies that work right now.", order: 1 },
  { page: "breedskool", section: "hero", key: "background_image", label: "Hero Background Image", type: "image", defaultValue: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=1800&q=85&auto=format&fit=crop", order: 2 },
  { page: "breedskool", section: "features", key: "title", label: "Features Section Title", type: "text", defaultValue: "Everything You Need to Grow", order: 0 },
  { page: "breedskool", section: "features", key: "subtitle", label: "Features Section Subtitle", type: "textarea", defaultValue: "Courses, mentorship, and community — all in one place.", order: 1 },

  // ── BreedSkool campaign landing page ────────────────────────
  { page: "breedskool_campaign", section: "hero", key: "eyebrow", label: "Campaign Eyebrow", type: "text", defaultValue: "A practical technology education campaign for young Africans", order: 0 },
  { page: "breedskool_campaign", section: "hero", key: "title", label: "Campaign Hero Title", type: "text", defaultValue: "Give a Young African a Chance to Build the Future", order: 1 },
  { page: "breedskool_campaign", section: "hero", key: "subtitle", label: "Campaign Hero Subtitle", type: "textarea", defaultValue: "Talent is everywhere. Opportunity is not. Help us put skills, equipment, mentorship and a real pathway into the hands of young people who are ready to learn.", order: 2 },
  { page: "breedskool_campaign", section: "story", key: "title", label: "Story Section Title", type: "text", defaultValue: "The talent is there. The opportunity isn't.", order: 0 },
  { page: "breedskool_campaign", section: "story", key: "body", label: "Story Section Body", type: "textarea", defaultValue: "Imagine being a young person in a rural community with no computer, unreliable internet and no technology centre nearby. You may be intelligent, creative and determined, but the modern digital economy can feel like a world you are not allowed to enter.", order: 1 },
  { page: "breedskool_campaign", section: "cta", key: "title", label: "Campaign CTA Title", type: "text", defaultValue: "Will you help us open the door?", order: 0 },
  { page: "breedskool_campaign", section: "cta", key: "subtitle", label: "Campaign CTA Subtitle", type: "textarea", defaultValue: "Every donation matters. And if you cannot donate, sharing this campaign can still help us reach the right people.", order: 1 },
  { page: "breedskool_campaign", section: "contact", key: "sponsor_label", label: "Sponsor Contact Label", type: "text", defaultValue: "For brands, sponsors and philanthropists", order: 0 },
  { page: "breedskool_campaign", section: "contact", key: "student_label", label: "Student Contact Label", type: "text", defaultValue: "For African students joining the training", order: 1 },

  // ── Shop page ────────────────────────────────────────────────
  { page: "shop", section: "hero", key: "title", label: "Shop Hero Title", type: "text", defaultValue: "Creator Tools & Resources", order: 0 },
  { page: "shop", section: "hero", key: "subtitle", label: "Shop Hero Subtitle", type: "textarea", defaultValue: "Premium templates, scripts, plugins, and digital tools. Built for creators who mean business.", order: 1 },
  { page: "shop", section: "hero", key: "background_image", label: "Shop Hero Background", type: "image", defaultValue: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1800&q=85&auto=format&fit=crop", order: 2 },

  // ── Campaigns page ───────────────────────────────────────────
  { page: "campaigns", section: "hero", key: "title", label: "Campaigns Hero Title", type: "text", defaultValue: "Live Brand Campaigns", order: 0 },
  { page: "campaigns", section: "hero", key: "subtitle", label: "Campaigns Hero Subtitle", type: "textarea", defaultValue: "Browse verified brand campaigns. Apply, complete the task, and get paid in USDT.", order: 1 },

  // ── Blog page ────────────────────────────────────────────────
  { page: "blog", section: "hero", key: "title", label: "Blog Hero Title", type: "text", defaultValue: "Influencer Insights & Strategies", order: 0 },
  { page: "blog", section: "hero", key: "subtitle", label: "Blog Hero Subtitle", type: "textarea", defaultValue: "Tips, tutorials, and trends for creators and brands.", order: 1 },
];

export async function seedCmsContent(): Promise<void> {
  try {
    // ── Hero Sliders: idempotent sync — insert missing sliders by headline ──
    const existingSliders = await storage.getHeroSliders();
    const existingHeadlines = new Set(existingSliders.map((s: any) => s.headline));
    let slidersAdded = 0;
    for (const slider of DEFAULT_SLIDERS) {
      if (!existingHeadlines.has(slider.headline)) {
        await storage.createHeroSlider(slider as any);
        slidersAdded++;
      }
    }
    if (slidersAdded > 0) {
      log(`[CMS] Added ${slidersAdded} new hero slider(s)`);
    }

    // ── Page Content: smart sync on every startup ────────────────────────────
    // Inserts any new blocks that don't exist, updates changed metadata (label/type/default),
    // but NEVER overwrites user-edited values — so content edits made in the admin survive
    // restarts, code exports, and future code updates.
    const { inserted, updated } = await storage.syncDefaultPageContent(
      DEFAULT_PAGE_CONTENT.map((item) => ({
        ...item,
        value: null,
        description: null,
      })) as any[]
    );

    if (inserted > 0 || updated > 0) {
      log(`[CMS] Synced page content — ${inserted} new block(s) added, ${updated} block(s) updated`);
    } else {
      log(`[CMS] Page content up to date (${DEFAULT_PAGE_CONTENT.length} blocks)`);
    }

    // ── Abraham portfolio: insert defaults once, preserving admin edits ─────
    const existingSiteContent = await storage.getSiteContent();
    const portfolioDefaults = [
      {
        contentKey: PORTFOLIO_CONTENT_KEYS.profile,
        label: "Abraham Tahbat Portfolio Profile",
        contentType: "json",
        page: "portfolio",
        section: "profile",
        value: JSON.stringify(DEFAULT_PORTFOLIO_PROFILE),
        defaultValue: JSON.stringify(DEFAULT_PORTFOLIO_PROFILE),
        sortOrder: 0,
      },
      {
        contentKey: PORTFOLIO_CONTENT_KEYS.projects,
        label: "Abraham Tahbat Portfolio Projects",
        contentType: "json",
        page: "portfolio",
        section: "projects",
        value: JSON.stringify(DEFAULT_PORTFOLIO_PROJECTS),
        defaultValue: JSON.stringify(DEFAULT_PORTFOLIO_PROJECTS),
        sortOrder: 1,
      },
    ];
    let portfolioAdded = 0;
    for (const item of portfolioDefaults) {
      if (!existingSiteContent.some((content) => content.contentKey === item.contentKey)) {
        await storage.upsertSiteContent(item as any);
        portfolioAdded++;
      }
    }
    if (portfolioAdded > 0) {
      log(`[CMS] Added ${portfolioAdded} Abraham portfolio content block(s)`);
    }
  } catch (err) {
    console.error("[CMS] Seed error:", err);
  }
}
