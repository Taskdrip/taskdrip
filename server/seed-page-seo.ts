/**
 * Auto-seeds page_seo_settings on every startup.
 * Uses ON CONFLICT DO UPDATE so changes in this file propagate on redeploy.
 */
import { db } from "./db";
import { pageSeoSettings } from "@shared/schema";

const OG = "https://taskdrip.online/taskdrip-logo.jpg";
const SITE = "https://taskdrip.online";

const PAGES = [
  {
    pageSlug: "home",
    pageTitle: "Home Page",
    metaTitle: "Taskdrip — Earn Crypto Completing Brand Tasks | Web3 Influencer Platform",
    metaDescription:
      "Taskdrip is the #1 Web3 influencer marketplace. Complete social media tasks, promote brands, and earn USDT crypto rewards. Join 15,000+ verified creators earning daily.",
    ogTitle: "Taskdrip — Earn Crypto. Promote Brands. Build Your Creator Empire.",
    ogDescription:
      "Join 15,000+ verified creators earning USDT completing brand campaigns on Taskdrip. Social media tasks, P2P trading, Web3 rewards — all in one platform.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Taskdrip — Earn Crypto Completing Brand Tasks",
    twitterDescription:
      "The #1 Web3 influencer marketplace. Complete brand tasks, earn USDT, and grow your creator income globally.",
    twitterImage: OG,
    keywords:
      "earn crypto online, web3 influencer platform, brand campaigns, earn USDT, crypto rewards, social media tasks, influencer marketing Nigeria, web3 creator economy",
    canonicalUrl: SITE,
    noIndex: false,
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Taskdrip",
      url: SITE,
      description:
        "Web3 influencer marketing platform where creators earn USDT completing brand campaigns",
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE}/tasks?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    }),
  },
  {
    pageSlug: "tasks",
    pageTitle: "Tasks / Campaigns",
    metaTitle: "Browse Brand Campaigns & Earn Crypto | Taskdrip Tasks",
    metaDescription:
      "Browse hundreds of paid brand campaigns on Taskdrip. Follow, like, share, and create content for top brands. Earn USDT and crypto rewards instantly upon approval.",
    ogTitle: "Earn Crypto Completing Brand Tasks — Taskdrip",
    ogDescription:
      "Hundreds of live brand campaigns updated daily. Like, follow, share or create content — get paid in USDT instantly when approved.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Browse & Earn — Brand Campaigns on Taskdrip",
    twitterDescription: "Get paid in USDT for social media tasks. New campaigns added daily.",
    twitterImage: OG,
    keywords:
      "paid social media tasks, brand campaigns, earn USDT tasks, crypto campaign rewards, influencer tasks, earn crypto Nigeria",
    canonicalUrl: `${SITE}/tasks`,
    noIndex: false,
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Brand Campaigns on Taskdrip",
      description: "Browse hundreds of paid brand campaigns and earn USDT crypto rewards.",
      url: `${SITE}/tasks`,
    }),
  },
  {
    pageSlug: "p2p-hub",
    pageTitle: "P2P Marketplace",
    metaTitle: "P2P Crypto Marketplace — Buy & Sell with Escrow Protection | Taskdrip",
    metaDescription:
      "Trade crypto, digital services, and products peer-to-peer with escrow protection on Taskdrip. Safe, fast P2P transactions with verified sellers and buyer protection.",
    ogTitle: "P2P Crypto Marketplace with Escrow — Taskdrip",
    ogDescription:
      "Safe peer-to-peer crypto trading with built-in escrow. Buy and sell USDT, digital goods and services with verified sellers on Taskdrip.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "P2P Crypto Marketplace — Taskdrip",
    twitterDescription: "Safe P2P crypto trading with escrow protection. Verified sellers, instant transactions.",
    twitterImage: OG,
    keywords:
      "P2P crypto marketplace, buy sell crypto, peer to peer trading, escrow crypto, P2P Nigeria, crypto P2P platform",
    canonicalUrl: `${SITE}/p2p-hub`,
    noIndex: false,
  },
  {
    pageSlug: "shop",
    pageTitle: "Creator Shop",
    metaTitle: "Digital Products & Creator Tools | Taskdrip Shop",
    metaDescription:
      "Shop premium digital products, creator tools, e-books, and resources on Taskdrip. Curated selection of high-quality digital downloads for creators, marketers, and entrepreneurs.",
    ogTitle: "Taskdrip Shop — Premium Digital Products for Creators",
    ogDescription:
      "Browse and buy creator tools, e-books, templates, and digital products. Pay with USDT, TON, or $TDRIP.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Taskdrip Shop — Creator Tools & Digital Products",
    twitterDescription: "Premium creator tools, e-books and digital products. Pay with crypto.",
    twitterImage: OG,
    keywords:
      "digital products shop, creator tools, e-books, digital downloads, online store, crypto shop",
    canonicalUrl: `${SITE}/shop`,
    noIndex: false,
  },
  {
    pageSlug: "influencers",
    pageTitle: "Influencers Directory",
    metaTitle: "Find Verified Influencers & Content Creators | Taskdrip Directory",
    metaDescription:
      "Discover thousands of verified influencers and content creators on Taskdrip. Filter by niche, following, engagement rate, and country. Find the perfect creator for your brand.",
    ogTitle: "Taskdrip Influencer Directory — Find Verified Creators",
    ogDescription:
      "Discover verified Web3 influencers across TikTok, Instagram, X, YouTube and Telegram. Filter by niche, audience and engagement rate.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Taskdrip Influencer Directory",
    twitterDescription: "Discover thousands of verified creators. Filter by niche, following, engagement.",
    twitterImage: OG,
    keywords:
      "influencer directory, find influencers, content creators, verified influencers, brand collaboration, web3 creators",
    canonicalUrl: `${SITE}/influencers`,
    noIndex: false,
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Verified Influencers on Taskdrip",
      description: "Discover thousands of verified influencers and content creators.",
      url: `${SITE}/influencers`,
    }),
  },
  {
    pageSlug: "brands",
    pageTitle: "Brands Discovery",
    metaTitle: "Discover Brands & Sponsorship Opportunities | Taskdrip",
    metaDescription:
      "Browse top brands on Taskdrip looking for content creators and influencers. Find sponsorship opportunities, brand deals, and paid collaborations with verified companies.",
    ogTitle: "Taskdrip Brands — Find Sponsorship Opportunities",
    ogDescription:
      "Connect with brands hiring influencers globally. Find sponsorship deals, brand campaigns, and paid content opportunities in crypto.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Find Brand Deals on Taskdrip",
    twitterDescription: "Connect with brands paying creators in crypto. Sponsorship opportunities for all niches.",
    twitterImage: OG,
    keywords:
      "brand deals, sponsor opportunities, brand collaborations, influencer sponsorship, web3 brands",
    canonicalUrl: `${SITE}/brands`,
    noIndex: false,
  },
  {
    pageSlug: "feed",
    pageTitle: "Creator Feed",
    metaTitle: "Creator Feed — Latest Posts from Taskdrip Influencers",
    metaDescription:
      "Browse the latest posts, updates, and content from Taskdrip's creator community. Follow top influencers, discover trending content, and engage with the Web3 creator economy.",
    ogTitle: "Taskdrip Creator Feed — Latest Posts & Drops",
    ogDescription:
      "The freshest posts from verified Taskdrip creators. Tip in $TDRIP, follow your favourites, never miss a drop.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Taskdrip Creator Feed",
    twitterDescription: "Latest posts from verified creators. Follow, tip, and discover trending content.",
    twitterImage: OG,
    keywords:
      "creator feed, influencer posts, web3 creators, taskdrip community, creator content",
    canonicalUrl: `${SITE}/feed`,
    noIndex: false,
  },
  {
    pageSlug: "blog",
    pageTitle: "Blog",
    metaTitle: "Taskdrip Blog — Crypto, Influencer Marketing & Web3 Insights",
    metaDescription:
      "Read the latest articles on crypto earnings, influencer marketing strategies, Web3 trends, and creator economy tips on the Taskdrip blog. Updated weekly with actionable guides.",
    ogTitle: "Taskdrip Blog — Web3 Marketing & Creator Economy Insights",
    ogDescription:
      "Guides, case studies and news on the Web3 creator economy, SocialFi, influencer marketing and crypto payouts. Updated weekly.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Taskdrip Blog",
    twitterDescription: "Expert guides on Web3 marketing, influencer economy, and earning crypto as a creator.",
    twitterImage: OG,
    keywords:
      "crypto blog, influencer marketing blog, web3 tips, creator economy, earn crypto guide, socialfi",
    canonicalUrl: `${SITE}/blog`,
    noIndex: false,
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Taskdrip Blog",
      url: `${SITE}/blog`,
      description:
        "Expert guides on Web3 marketing, influencer economy, and earning crypto as a creator.",
      publisher: {
        "@type": "Organization",
        name: "Taskdrip",
        logo: { "@type": "ImageObject", url: `${SITE}/icon-192.png` },
      },
    }),
  },
  {
    pageSlug: "breedskool",
    pageTitle: "BreedSkool",
    metaTitle: "BreedSkool — Learn Tech Skills & Earn | Taskdrip Training",
    metaDescription:
      "BreedSkool offers tech training in Web Development, AI Content Creation, Social Media Monetization, Trading, and more. Learn skills, get certified, and earn crypto rewards.",
    ogTitle: "BreedSkool — Web3 Creator Academy by Taskdrip",
    ogDescription:
      "Free and pro courses to grow as a Web3 influencer. Learn audience growth, monetization, brand deals and crypto payouts from expert instructors.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "BreedSkool — Learn. Create. Earn.",
    twitterDescription: "Tech training in Web Dev, AI, Social Media Monetization & Trading. Get certified and earn crypto.",
    twitterImage: OG,
    keywords:
      "tech training Nigeria, web development course, AI content creation, social media monetization, breedskool, creator academy",
    canonicalUrl: `${SITE}/breedskool`,
    noIndex: false,
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "BreedSkool",
      url: `${SITE}/breedskool`,
      description:
        "Tech training academy offering courses in Web Development, AI, Social Media Monetization and Trading.",
      parentOrganization: {
        "@type": "Organization",
        name: "Taskdrip",
        url: SITE,
      },
    }),
  },
  {
    pageSlug: "leaderboard",
    pageTitle: "Leaderboard",
    metaTitle: "Top Earners Leaderboard — Who's Earning the Most on Taskdrip?",
    metaDescription:
      "See the top-earning creators and influencers on Taskdrip's leaderboard. Compete to reach the top and earn bigger crypto rewards. Updated in real-time.",
    ogTitle: "Taskdrip Leaderboard — Top Creators & Biggest Earners",
    ogDescription:
      "See the top-earning creators, biggest brand spenders and most active influencers on Taskdrip. Updated in real-time.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Taskdrip Leaderboard",
    twitterDescription: "Who's earning the most crypto on Taskdrip? Real-time leaderboard of top creators.",
    twitterImage: OG,
    keywords:
      "top earners, leaderboard, taskdrip top creators, earn most crypto, influencer rankings",
    canonicalUrl: `${SITE}/leaderboard`,
    noIndex: false,
  },
  {
    pageSlug: "advertise",
    pageTitle: "Advertise With Us",
    metaTitle: "Advertise on Taskdrip — Reach 15,000+ Verified Influencers",
    metaDescription:
      "Launch your influencer marketing campaign on Taskdrip. Reach 15,000+ verified creators across Africa and globally. Affordable rates, guaranteed deliverables, real engagement.",
    ogTitle: "Advertise on Taskdrip — Crypto-Native Influencer Advertising",
    ogDescription:
      "Run banner ads, sponsored campaigns and creator collaborations on Taskdrip. Reach 15,000+ verified creators. Transparent pricing, real engagement.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Advertise on Taskdrip",
    twitterDescription: "Reach 15,000+ verified influencers with your brand campaign. Affordable crypto-native advertising.",
    twitterImage: OG,
    keywords:
      "advertise with influencers, influencer marketing campaign, brand promotion, social media advertising, web3 advertising",
    canonicalUrl: `${SITE}/advertise`,
    noIndex: false,
  },
  {
    pageSlug: "about",
    pageTitle: "About Us",
    metaTitle: "About Taskdrip — Our Mission to Empower Creators with Crypto",
    metaDescription:
      "Taskdrip is a Web3 influencer marketing platform built to help content creators earn crypto from brand campaigns. Learn about our story, mission, team, and values.",
    ogTitle: "About Taskdrip — The Web3 Influencer Marketplace",
    ogDescription:
      "Taskdrip connects brands and creators with on-chain payouts, verified profiles and the $TDRIP rewards economy. Learn our story.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "About Taskdrip",
    twitterDescription: "The Web3 influencer marketplace empowering 15,000+ creators to earn crypto globally.",
    twitterImage: OG,
    keywords:
      "about taskdrip, web3 influencer platform, crypto creator economy, taskdrip mission, taskdrip team",
    canonicalUrl: `${SITE}/about`,
    noIndex: false,
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Taskdrip",
      url: SITE,
      logo: `${SITE}/icon-192.png`,
      description:
        "Web3 influencer marketing platform connecting brands and creators with on-chain payouts",
      sameAs: ["https://twitter.com/taskdrip", "https://t.me/taskdrip"],
    }),
  },
  {
    pageSlug: "contact",
    pageTitle: "Contact",
    metaTitle: "Contact Taskdrip — Support, Partnerships & General Inquiries",
    metaDescription:
      "Get in touch with Taskdrip for support, brand partnerships, or general inquiries. Our team responds within 24 hours. Also reach us on WhatsApp and Telegram.",
    ogTitle: "Contact Taskdrip",
    ogDescription:
      "Support, brand partnerships, and general inquiries. The Taskdrip team responds within 24 hours.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Contact Taskdrip",
    twitterDescription: "Get support or start a brand partnership. Our team responds within 24 hours.",
    twitterImage: OG,
    keywords: "contact taskdrip, taskdrip support, brand partnership inquiry, creator support",
    canonicalUrl: `${SITE}/contact`,
    noIndex: false,
  },
  {
    pageSlug: "login",
    pageTitle: "Login",
    metaTitle: "Login to Taskdrip — Access Your Creator Dashboard",
    metaDescription:
      "Log in to your Taskdrip account to manage campaigns, check your crypto earnings, and access your creator dashboard.",
    ogTitle: "Login to Taskdrip",
    ogDescription: "Access your creator dashboard, manage campaigns and check your crypto earnings.",
    ogImage: OG,
    twitterCard: "summary",
    keywords: "taskdrip login, creator dashboard, influencer login",
    canonicalUrl: `${SITE}/login`,
    noIndex: false,
  },
  {
    pageSlug: "signup",
    pageTitle: "Sign Up",
    metaTitle: "Sign Up Free — Join Taskdrip & Start Earning Crypto Today",
    metaDescription:
      "Create your free Taskdrip account in 60 seconds. Start completing brand tasks, earning USDT crypto, and building your creator income today. No experience needed.",
    ogTitle: "Join Taskdrip — Start Earning Crypto Today",
    ogDescription:
      "Create your free account in 60 seconds. Complete brand tasks, earn USDT, and join 15,000+ creators building their income on Taskdrip.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "Sign Up Free on Taskdrip",
    twitterDescription: "Join 15,000+ creators earning crypto. Free account, instant access to brand campaigns.",
    twitterImage: OG,
    keywords:
      "join taskdrip, sign up crypto, create account, start earning crypto, influencer signup",
    canonicalUrl: `${SITE}/signup`,
    noIndex: false,
  },
  {
    pageSlug: "tdrip",
    pageTitle: "$TDRIP Token",
    metaTitle: "$TDRIP Token — Taskdrip's Reward Points & Future Crypto Token",
    metaDescription:
      "Learn about $TDRIP, Taskdrip's points and future crypto token. Earn $TDRIP completing tasks, climbing the leaderboard, and referring friends. Redeem for crypto rewards.",
    ogTitle: "$TDRIP — Taskdrip's Rewards Token",
    ogDescription:
      "Earn $TDRIP completing tasks, climbing the leaderboard, and referring friends. Redeem for USDT, TON, and exclusive platform perks.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    twitterTitle: "$TDRIP — Earn, Stake & Redeem",
    twitterDescription: "The rewards token powering Taskdrip. Earn $TDRIP and redeem for crypto rewards.",
    twitterImage: OG,
    keywords:
      "TDRIP token, taskdrip crypto token, earn TDRIP, web3 reward token, socialfi token",
    canonicalUrl: `${SITE}/tdrip`,
    noIndex: false,
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      name: "$TDRIP",
      description:
        "Taskdrip's rewards points and future crypto token. Earn by completing tasks and redeem for USDT.",
      provider: { "@type": "Organization", name: "Taskdrip", url: SITE },
    }),
  },
  {
    pageSlug: "get-started",
    pageTitle: "Get Started",
    metaTitle: "Get Started on Taskdrip — Earn or Hire in Minutes",
    metaDescription:
      "Pick your path: earn as a creator or hire verified influencers as a brand. Get up and running on Taskdrip in minutes with no setup fees.",
    ogTitle: "Get Started on Taskdrip — Creator or Brand?",
    ogDescription:
      "Join as a creator to earn crypto, or as a brand to hire verified influencers. Get set up in minutes.",
    ogImage: OG,
    twitterCard: "summary_large_image",
    keywords: "get started taskdrip, join taskdrip, creator onboarding, brand onboarding",
    canonicalUrl: `${SITE}/get-started`,
    noIndex: false,
  },
];

export async function seedPageSeo(): Promise<{ upserted: number }> {
  let upserted = 0;
  for (const page of PAGES) {
    await db
      .insert(pageSeoSettings)
      .values({ ...page, updatedAt: new Date() } as any)
      .onConflictDoUpdate({
        target: pageSeoSettings.pageSlug,
        set: { ...page, updatedAt: new Date() } as any,
      });
    upserted++;
  }
  return { upserted };
}
