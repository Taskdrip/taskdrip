import { db } from "./db";
import { campaigns, blogPosts, shopProducts } from "@shared/schema";

export async function seedDatabase() {
  try {
    console.log("Seeding database...");

    // Seed campaigns
    const sampleCampaigns = [
      {
        title: "Nike Air Max Social Media Campaign",
        description: "Create engaging content showcasing Nike Air Max sneakers. Share your authentic experience and style tips with your audience.",
        category: "Social Media",
        platform: "Instagram",
        brandName: "Nike",
        reward: "25.00",
        totalSlots: 100,
        filledSlots: 67,
        estimatedTime: "15 min",
        requirements: ["Post on Instagram", "Use #NikeAirMax hashtag", "Tag @nike", "Minimum 1000 followers"],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        title: "Tech Product Review - Smartphone",
        description: "Write an honest review of the latest smartphone model. Include unboxing, features overview, and personal opinion.",
        category: "Content Creation",
        platform: "YouTube",
        brandName: "TechCorp",
        reward: "50.00",
        totalSlots: 50,
        filledSlots: 23,
        estimatedTime: "2 hours",
        requirements: ["Create 5+ minute video", "Include unboxing", "Honest review", "Post on YouTube"],
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      },
      {
        title: "Gaming Stream Sponsorship",
        description: "Stream gameplay while featuring our gaming headset. Discuss audio quality and comfort during live stream.",
        category: "Gaming",
        platform: "Twitch",
        brandName: "GameGear Pro",
        reward: "75.00",
        totalSlots: 30,
        filledSlots: 12,
        estimatedTime: "3 hours",
        requirements: ["Live stream minimum 2 hours", "Feature product prominently", "Engage with audience", "Minimum 500 followers"],
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
      },
      {
        title: "Fitness App Promotion",
        description: "Share your workout journey using our fitness app. Create before/after content and motivational posts.",
        category: "Health & Fitness",
        platform: "TikTok",
        brandName: "FitLife",
        reward: "30.00",
        totalSlots: 200,
        filledSlots: 134,
        estimatedTime: "30 min",
        requirements: ["Create TikTok video", "Show app in use", "Use #FitLifeChallenge", "Motivational content"],
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      },
      {
        title: "Crypto Education Content",
        description: "Create educational content explaining DeFi concepts to beginners. Focus on making complex topics accessible.",
        category: "Cryptocurrency",
        platform: "Twitter",
        brandName: "CryptoLearn",
        reward: "40.00",
        totalSlots: 75,
        filledSlots: 45,
        estimatedTime: "1 hour",
        requirements: ["Twitter thread (10+ tweets)", "Educational content", "Beginner-friendly", "Include infographics"],
        deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000) // 12 days from now
      },
      {
        title: "Online Course Testimonial",
        description: "Share your experience completing our digital marketing course. Highlight key learnings and outcomes.",
        category: "Education",
        platform: "LinkedIn",
        brandName: "EduMaster",
        reward: "35.00",
        totalSlots: 60,
        filledSlots: 28,
        estimatedTime: "45 min",
        requirements: ["LinkedIn post", "Course completion certificate", "Honest testimonial", "Professional tone"],
        deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) // 8 days from now
      }
    ];

    for (const campaign of sampleCampaigns) {
      await db.insert(campaigns).values(campaign).onConflictDoNothing();
    }

    // Seed blog posts
    const sampleBlogPosts = [
      {
        title: "The Future of Creator Economy: How Web3 is Changing Everything",
        slug: "future-creator-economy-web3",
        content: "The creator economy is experiencing a revolutionary transformation with the advent of Web3 technologies. Blockchain, NFTs, and cryptocurrency are creating new monetization opportunities...",
        excerpt: "Discover how Web3 technologies are revolutionizing the creator economy and opening new monetization opportunities.",
        category: "Industry Insights",
        tags: ["Web3", "Creator Economy", "Cryptocurrency", "NFTs"],
        isPublished: true,
        publishedAt: new Date()
      },
      {
        title: "Maximizing Your Earnings: Top Strategies for Social Media Campaigns",
        slug: "maximizing-earnings-social-media-campaigns",
        content: "Social media campaigns offer incredible earning potential for creators. In this comprehensive guide, we'll explore proven strategies...",
        excerpt: "Learn proven strategies to maximize your earnings from social media campaigns and brand collaborations.",
        category: "Creator Tips",
        tags: ["Social Media", "Earnings", "Strategy", "Campaigns"],
        isPublished: true,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Cryptocurrency Payments for Creators: A Complete Guide",
        slug: "cryptocurrency-payments-creators-guide",
        content: "Cryptocurrency payments are becoming the standard for creator compensation. This guide covers everything you need to know...",
        excerpt: "Everything creators need to know about receiving cryptocurrency payments safely and efficiently.",
        category: "Crypto Guide",
        tags: ["Cryptocurrency", "Payments", "Security", "Wallets"],
        isPublished: true,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const post of sampleBlogPosts) {
      await db.insert(blogPosts).values(post).onConflictDoNothing();
    }

    // Seed shop products
    const sampleProducts = [
      {
        title: "Complete Creator Toolkit",
        description: "Everything you need to start and grow your creator business. Includes templates, guides, and exclusive resources.",
        price: "49.99",
        originalPrice: "99.99",
        category: "Course",
        type: "digital_course",
        rating: "4.8",
        reviewCount: 156,
        tags: ["Creator Tools", "Business", "Templates", "Guides"],
        isActive: true
      },
      {
        title: "Social Media Analytics Dashboard",
        description: "Professional analytics tool to track your social media performance across all platforms. Real-time insights and reporting.",
        price: "29.99",
        category: "Software",
        type: "software",
        rating: "4.6",
        reviewCount: 89,
        tags: ["Analytics", "Social Media", "Dashboard", "Tracking"],
        isActive: true
      },
      {
        title: "Content Calendar Templates",
        description: "Professional content calendar templates for all major social platforms. Plan your content strategy effectively.",
        price: "19.99",
        originalPrice: "39.99",
        category: "Templates",
        type: "template",
        rating: "4.9",
        reviewCount: 234,
        tags: ["Templates", "Content Planning", "Social Media", "Organization"],
        isActive: true
      },
      {
        title: "Cryptocurrency for Creators",
        description: "Comprehensive course on cryptocurrency, DeFi, and Web3 for content creators. Learn to navigate the new economy.",
        price: "79.99",
        category: "Crypto Course",
        type: "course",
        rating: "4.7",
        reviewCount: 67,
        tags: ["Cryptocurrency", "Web3", "DeFi", "Education"],
        isActive: true
      },
      {
        title: "Creator's Equipment Guide",
        description: "Ultimate guide to creator equipment on any budget. Camera, lighting, audio, and editing recommendations.",
        price: "0.00",
        category: "Equipment Guide",
        type: "guide",
        rating: "4.5",
        reviewCount: 312,
        tags: ["Equipment", "Gear", "Budget", "Recommendations"],
        isActive: true,
        isFree: true
      }
    ];

    for (const product of sampleProducts) {
      await db.insert(shopProducts).values(product).onConflictDoNothing();
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}