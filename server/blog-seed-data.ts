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
      "<p>Web3 payments help global influencers work with brands without waiting on slow cross-border banking. On Taskdrip, brands fund campaigns, influencers submit proof, and approved rewards can be tracked clearly from one dashboard.</p><p>The strongest campaigns still start with a simple brief: what to create, where to publish it, when it is due, and how success will be reviewed.</p>",
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
      "<p>Taskdrip classifies influencers by audience size so brands can discover the right partners for each campaign. Rising Sparks are perfect for authentic niche engagement, while Global Titans offer large-scale reach.</p><p>The best strategy is not always choosing the largest influencer. Brands often see stronger conversion from influencers whose audience closely matches the product niche.</p>",
    metaDescription:
      "A guide to Taskdrip influencer tiers and how brands can choose influencers for campaign performance.",
    seoKeywords: "influencer tiers, influencer tiers, Taskdrip influencers",
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
      "<p>A strong campaign brief removes guesswork. Include the campaign goal, target platform, content format, required talking points, prohibited claims, deadline, proof requirements, and reward amount.</p><p>Clear briefs reduce revision cycles and help influencers publish content that feels authentic while still protecting the brand.</p>",
    metaDescription:
      "A practical checklist for creating influencer campaign briefs that convert.",
    seoKeywords: "campaign brief, influencer brief, brand influencer campaign",
    readingTime: 3,
    viewCount: 810,
    likesCount: 47,
    commentsCount: 5,
  },
];
