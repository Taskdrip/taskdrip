/**
 * Default blog posts bundled with the app so the same articles can be
 * seeded into any environment (Replit dev, Railway production, etc.) by
 * an admin clicking "Seed Default Blogs" in the Demo Lab.
 *
 * Seeding is idempotent — existing slugs are skipped.
 */

export type DefaultBlog = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  featuredImage: string;
  content: string;
  metaDescription: string;
  seoKeywords: string;
  readingTime: number;
  viewCount: number;
  likesCount: number;
  commentsCount: number;
};

export const DEFAULT_BLOGS: DefaultBlog[] = [
  {
    title: "How Web3 Campaign Payments Make Influencer Work Faster",
    slug: "web3-campaign-payments-influencer-work",
    excerpt:
      "A practical look at why crypto-native campaign payments help brands and influencers move faster.",
    category: "payments",
    tags: ["web3", "influencer economy", "payments"],
    featuredImage:
      "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=1200&h=700&fit=crop",
    content:
      "<p>Web3 payments help global influencers work with brands without waiting on slow cross-border banking. On Taskdrip, brands fund campaigns, influencers submit proof, and approved rewards can be tracked clearly from one dashboard.</p><p>The strongest campaigns still start with a simple brief: what to create, where to publish it, when it is due, and how success will be reviewed.</p><p>By using stablecoins, brands lock in the campaign value at the moment of funding, removing FX volatility for influencers in any country. Approval, payout, and proof all live in one place — making the working relationship calmer and the reporting cleaner.</p>",
    metaDescription:
      "Learn how Web3 campaign payments improve speed and transparency for global influencer campaigns.",
    seoKeywords:
      "web3 influencer payments, crypto influencer campaigns, socialfi payments",
    readingTime: 4,
    viewCount: 1260,
    likesCount: 84,
    commentsCount: 9,
  },
  {
    title: "Influencer Tiers Explained: From Rising Sparks to Global Titans",
    slug: "influencer-tiers-explained-taskdrip",
    excerpt:
      "Understand Taskdrip influencer tiers and how brands can select the right influencer mix.",
    category: "influencers",
    tags: ["influencer tiers", "influencer marketing", "brands"],
    featuredImage:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=700&fit=crop",
    content:
      "<p>Taskdrip classifies influencers by audience size so brands can discover the right partners for each campaign. Rising Sparks are perfect for authentic niche engagement, while Global Titans offer large-scale reach.</p><p>The best strategy is not always choosing the largest influencer. Brands often see stronger conversion from influencers whose audience closely matches the product niche.</p><p>A balanced campaign typically blends one or two larger creators for awareness with several smaller, hyper-relevant creators for conversion. Track per-tier performance for at least two campaigns before deciding the perfect mix for your brand.</p>",
    metaDescription:
      "A guide to Taskdrip influencer tiers and how brands can choose influencers for campaign performance.",
    seoKeywords: "influencer tiers, influencer mix, Taskdrip influencers",
    readingTime: 5,
    viewCount: 940,
    likesCount: 61,
    commentsCount: 6,
  },
  {
    title: "What Brands Should Include in a High-Converting Campaign Brief",
    slug: "high-converting-campaign-brief",
    excerpt:
      "Use this campaign brief checklist to get better influencer submissions and faster approvals.",
    category: "brands",
    tags: ["campaign brief", "brand campaigns", "influencer management"],
    featuredImage:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=700&fit=crop",
    content:
      "<p>A strong campaign brief removes guesswork. Include the campaign goal, target platform, content format, required talking points, prohibited claims, deadline, proof requirements, and reward amount.</p><p>Clear briefs reduce revision cycles and help influencers publish content that feels authentic while still protecting the brand.</p><p>Always include one or two example posts that match the tone you want — visual reference does more than three paragraphs of instructions ever will.</p>",
    metaDescription:
      "A practical checklist for creating influencer campaign briefs that convert.",
    seoKeywords: "campaign brief, influencer brief, brand influencer campaign",
    readingTime: 3,
    viewCount: 810,
    likesCount: 47,
    commentsCount: 5,
  },
  {
    title: "The Creator Economy in 2026: Trends Every Influencer Should Watch",
    slug: "creator-economy-2026-trends",
    excerpt:
      "Eight macro trends reshaping how creators earn, collaborate, and grow audiences this year.",
    category: "creators",
    tags: ["creator economy", "trends", "monetization"],
    featuredImage:
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&h=700&fit=crop",
    content:
      "<p>The creator economy has matured: brands now budget for always-on creator partnerships rather than one-off posts. Subscriptions, paid communities, and digital product sales are blending into a single creator stack.</p><p>Watch for AI-assisted content production, shoppable short-form video, and on-chain reputation systems — all of them lower the cost of starting and scale your trust signal across platforms.</p><p>Diversifying your income across at least three revenue streams is now table stakes for full-time creators.</p>",
    metaDescription:
      "Eight creator-economy trends shaping how influencers earn and grow in 2026.",
    seoKeywords: "creator economy 2026, influencer trends, creator monetization",
    readingTime: 6,
    viewCount: 2150,
    likesCount: 128,
    commentsCount: 14,
  },
  {
    title: "How to Price Your Sponsored Posts as a Micro-Influencer",
    slug: "price-sponsored-posts-micro-influencer",
    excerpt:
      "A simple framework for setting fair, profitable rates for your sponsored content.",
    category: "influencers",
    tags: ["pricing", "sponsorship", "micro-influencer"],
    featuredImage:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=700&fit=crop",
    content:
      "<p>The classic baseline is one cent per follower per post, but that ignores engagement, niche, and usage rights. Start there, then layer in modifiers: 2x for high-engagement niches, 1.5x if the brand needs paid usage rights, and 1.25x for tight deadlines.</p><p>Bundle three deliverables into one package — for example, one Reel + one carousel + three stories — to anchor brands to a higher number than a single post would justify.</p><p>Always quote in writing and require 50 percent up-front for campaigns with new brands.</p>",
    metaDescription:
      "A practical pricing framework for micro-influencers selling sponsored content.",
    seoKeywords: "sponsored post pricing, micro-influencer rates, influencer pricing",
    readingTime: 4,
    viewCount: 1820,
    likesCount: 142,
    commentsCount: 21,
  },
  {
    title: "P2P Crypto Trading on Taskdrip: A Beginner's Guide",
    slug: "p2p-crypto-trading-beginners-guide",
    excerpt:
      "Buy and sell digital goods with crypto safely using Taskdrip's escrow-backed P2P marketplace.",
    category: "marketplace",
    tags: ["p2p", "crypto", "marketplace", "escrow"],
    featuredImage:
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=700&fit=crop",
    content:
      "<p>Taskdrip's P2P marketplace lets verified members list digital and physical goods, accept crypto payments, and use built-in escrow so neither party can be stiffed.</p><p>Always check the seller's badge, on-platform reviews, and response time before placing an order. Funds are held until you confirm receipt — never release escrow before you have inspected the goods.</p><p>For higher-value items, use the chat to record clear delivery expectations and screenshots of the product before you pay.</p>",
    metaDescription:
      "Step-by-step beginner's guide to safe P2P crypto trading on Taskdrip's marketplace.",
    seoKeywords: "p2p crypto, taskdrip marketplace, escrow crypto trading",
    readingTime: 5,
    viewCount: 1540,
    likesCount: 96,
    commentsCount: 11,
  },
  {
    title: "Building a Personal Brand on Instagram in 90 Days",
    slug: "personal-brand-instagram-90-days",
    excerpt:
      "A focused 90-day plan to grow a recognisable, monetizable personal brand on Instagram.",
    category: "growth",
    tags: ["instagram", "personal brand", "growth"],
    featuredImage:
      "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=1200&h=700&fit=crop",
    content:
      "<p>Days 1–30: pick a single niche, refresh your bio, post one Reel and three carousels per week. Reply to every DM and comment within 24 hours.</p><p>Days 31–60: study your top three posts and double down on those formats. Collaborate with two creators in your niche per week.</p><p>Days 61–90: turn on insights, identify your top hook, batch a week of content in one sitting, and launch a small lead magnet — a free checklist or template — to start building an email list.</p>",
    metaDescription:
      "A 90-day Instagram growth plan to build a monetizable personal brand from scratch.",
    seoKeywords: "instagram growth, personal brand instagram, 90 day plan",
    readingTime: 6,
    viewCount: 2340,
    likesCount: 189,
    commentsCount: 26,
  },
  {
    title: "Why TikTok is Still the Fastest Path to a Million Views in 2026",
    slug: "tiktok-fastest-path-million-views",
    excerpt:
      "TikTok's discovery engine remains the most generous to new creators — here's how to ride it.",
    category: "growth",
    tags: ["tiktok", "viral", "short form"],
    featuredImage:
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&h=700&fit=crop",
    content:
      "<p>TikTok still serves new creators meaningfully, especially when posts hit a strong hook in the first 1.5 seconds. The platform now rewards rewatch rate more heavily than likes.</p><p>Frame every video around a single curiosity gap or visual payoff, and keep most uploads under 22 seconds. Series content (Part 1, Part 2…) can spike retention dramatically.</p><p>Treat your first 30 videos as data — review what hooked viewers, drop the formats that didn't, and repost your top three winners in slightly different cuts.</p>",
    metaDescription:
      "How to grow on TikTok in 2026 — hooks, formats, and the fastest path to a million views.",
    seoKeywords: "tiktok growth, viral tiktok, tiktok algorithm 2026",
    readingTime: 5,
    viewCount: 3050,
    likesCount: 248,
    commentsCount: 32,
  },
  {
    title: "Brand Safety: How to Vet Influencers Before You Pay Them",
    slug: "brand-safety-vet-influencers",
    excerpt:
      "A six-point checklist to protect your brand from fake followers, brand-unsafe history, and bots.",
    category: "brands",
    tags: ["brand safety", "due diligence", "influencer marketing"],
    featuredImage:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=700&fit=crop",
    content:
      "<p>Before you wire a single dollar, run this checklist: 1) sustained engagement rate above 1.5 percent, 2) audience geography that matches your market, 3) no history of brand-unsafe content in the last 12 months, 4) at least 90 days of consistent posting, 5) verifiable past campaign results, 6) clear written terms with usage rights spelled out.</p><p>For larger budgets, request a 30-day analytics screen-share — real creators are happy to share, fake ones won't.</p>",
    metaDescription:
      "A six-point checklist for vetting influencers and protecting your brand from fraud.",
    seoKeywords: "vet influencers, brand safety, fake followers detection",
    readingTime: 4,
    viewCount: 1180,
    likesCount: 79,
    commentsCount: 8,
  },
  {
    title: "Stablecoins vs Bank Transfers: Which is Better for Influencer Payouts?",
    slug: "stablecoins-vs-bank-transfers-payouts",
    excerpt:
      "A side-by-side comparison of fees, speed, and reliability for paying creators worldwide.",
    category: "payments",
    tags: ["stablecoins", "payouts", "fintech"],
    featuredImage:
      "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=1200&h=700&fit=crop",
    content:
      "<p>Bank transfers cost between 25 and 60 dollars in international wire fees, take 2–5 business days, and frequently bounce on KYC mismatches. Stablecoin payouts settle in minutes for under one dollar in network fees.</p><p>The catch: creators need a wallet and a way to off-ramp into local currency. Most major countries now have cheap, regulated off-ramps — making stablecoin payouts the dominant choice for any campaign with creators in three or more countries.</p>",
    metaDescription:
      "A comparison of stablecoin vs bank transfer payouts for influencer campaigns.",
    seoKeywords: "stablecoin payouts, influencer payments, crypto payouts",
    readingTime: 4,
    viewCount: 1390,
    likesCount: 92,
    commentsCount: 10,
  },
  {
    title: "BreedSkool: The Easiest Way to Sell What You Already Know",
    slug: "breedskool-sell-what-you-know",
    excerpt:
      "Turn your skills into a hosted course on Taskdrip's BreedSkool platform — no code required.",
    category: "education",
    tags: ["breedskool", "courses", "monetization"],
    featuredImage:
      "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=1200&h=700&fit=crop",
    content:
      "<p>BreedSkool lets any premium member publish a paid course in under an hour. Upload your videos, set lesson titles, write a sales page, pick a price, and you're live.</p><p>The platform handles checkout, student enrollment, and progress tracking. You keep the bulk of the revenue and you can promote your course directly to your Taskdrip followers.</p><p>The fastest-growing courses on BreedSkool teach a single, narrow skill — an editing technique, a content workflow, or a niche software tutorial — rather than a sprawling 'become an influencer' bundle.</p>",
    metaDescription:
      "How to launch and sell a hosted course on Taskdrip's BreedSkool platform.",
    seoKeywords: "breedskool, sell online course, creator courses",
    readingTime: 4,
    viewCount: 1670,
    likesCount: 114,
    commentsCount: 13,
  },
  {
    title: "Direct Hire vs Open Campaigns: Which Should Brands Use?",
    slug: "direct-hire-vs-open-campaigns",
    excerpt:
      "Two ways to work with creators on Taskdrip — when to use each for the best results.",
    category: "brands",
    tags: ["direct hire", "campaigns", "strategy"],
    featuredImage:
      "https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=1200&h=700&fit=crop",
    content:
      "<p>Open campaigns are best for top-of-funnel awareness: post a brief, set a reward, and let dozens of creators apply. You'll get a wide variety of interpretations, fast.</p><p>Direct hire is best for high-trust, repeat work — a face-of-the-brand creator, a long-form review, or anything where script approval and revisions matter. You set a custom rate, lock the deliverables, and track milestones one-on-one.</p><p>Most successful brands run two open campaigns per quarter for reach and one or two direct hires for depth.</p>",
    metaDescription:
      "When to use direct hire versus open campaigns for influencer marketing on Taskdrip.",
    seoKeywords: "direct hire influencer, open campaign, influencer strategy",
    readingTime: 5,
    viewCount: 1090,
    likesCount: 71,
    commentsCount: 7,
  },
];
