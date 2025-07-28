import { db } from "./db";
import { campaigns, blogPosts, shopProducts } from "@shared/schema";

export async function seedDatabase() {
  try {
    console.log("Seeding database...");

    // Seed campaigns with diverse task categories
    const sampleCampaigns = [
      {
        title: "Mobile Trading App Beta Testing",
        description: "Test our new cryptocurrency trading app. Provide detailed feedback on usability, features, and bugs.",
        category: "App Testing",
        platform: "Mobile App",
        brandName: "CryptoTrade Pro",
        reward: "75.00",
        totalSlots: 50,
        filledSlots: 23,
        estimatedTime: "2 hours",
        requirements: ["Android/iOS device", "Basic crypto knowledge", "Complete testing report"],
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Event Host - Tech Meetup NYC",
        description: "Host a tech meetup in NYC. Present our product to attendees and facilitate networking.",
        category: "Event Hosting",
        platform: "In-Person",
        brandName: "TechFlow",
        reward: "200.00",
        totalSlots: 3,
        filledSlots: 1,
        estimatedTime: "4 hours",
        requirements: ["NYC location", "Event hosting experience", "Tech industry knowledge"],
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
      },
      {
        title: "DeFi Trading Challenge",
        description: "Execute specific trading strategies on our DeFi platform. Document results and provide feedback.",
        category: "Trading",
        platform: "DeFi Platform",
        brandName: "DeFiMax",
        reward: "100.00",
        totalSlots: 25,
        filledSlots: 12,
        estimatedTime: "3 hours",
        requirements: ["DeFi experience", "$500+ portfolio", "Risk management knowledge"],
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Brand Ambassador - Local Store Visits",
        description: "Visit 5 retail stores in your city to check product placement and take photos.",
        category: "Local Errands",
        platform: "In-Person",
        brandName: "GlobalBrands Inc",
        reward: "80.00",
        totalSlots: 100,
        filledSlots: 45,
        estimatedTime: "3 hours",
        requirements: ["Major city location", "Smartphone with camera", "Reliable transportation"],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Content Creation - Product Video",
        description: "Create professional unboxing and review video of our latest gadget.",
        category: "Content Creation",
        platform: "YouTube",
        brandName: "TechGadgets Pro",
        reward: "125.00",
        totalSlots: 20,
        filledSlots: 8,
        estimatedTime: "4 hours",
        requirements: ["Video editing skills", "YouTube channel", "Professional camera setup"],
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Social Media Campaign - Fitness",
        description: "Create Instagram posts showcasing our fitness equipment in real workout scenarios.",
        category: "Social Media",
        platform: "Instagram",
        brandName: "FitPro Equipment",
        reward: "50.00",
        totalSlots: 75,
        filledSlots: 34,
        estimatedTime: "1 hour",
        requirements: ["Fitness enthusiast", "1000+ Instagram followers", "High-quality photos"],
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Product Launch Event - Miami",
        description: "Attend and live-tweet our product launch event in Miami. Engage with attendees and capture highlights.",
        category: "Event Attendance",
        platform: "Twitter + In-Person",
        brandName: "Innovation Labs",
        reward: "150.00",
        totalSlots: 10,
        filledSlots: 6,
        estimatedTime: "6 hours",
        requirements: ["Miami location", "Twitter account", "Professional attire", "Event photography"],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        title: "App Install & Review Campaign",
        description: "Install our productivity app, use for 7 days, and write detailed app store review.",
        category: "App Testing",
        platform: "App Store",
        brandName: "ProductivityMax",
        reward: "25.00",
        totalSlots: 200,
        filledSlots: 156,
        estimatedTime: "30 min",
        requirements: ["iOS/Android device", "App store account", "Honest detailed review"],
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Delivery Service - Sample Distribution",
        description: "Distribute product samples to 20 local businesses in your area.",
        category: "Local Errands",
        platform: "In-Person",
        brandName: "SampleCorp",
        reward: "60.00",
        totalSlots: 50,
        filledSlots: 23,
        estimatedTime: "4 hours",
        requirements: ["Reliable vehicle", "Business district access", "Professional presentation"],
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Crypto Portfolio Analysis",
        description: "Analyze and provide detailed report on DeFi yield farming strategies using our platform.",
        category: "Trading",
        platform: "DeFi Platform",
        brandName: "YieldMax Protocol",
        reward: "90.00",
        totalSlots: 15,
        filledSlots: 7,
        estimatedTime: "3 hours",
        requirements: ["Advanced DeFi knowledge", "Portfolio analysis experience", "Written report"],
        deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
      }
    ];

    // Clear existing campaigns and insert new ones
    await db.delete(campaigns);
    await db.insert(campaigns).values(sampleCampaigns);

    // Seed blog posts
    const sampleBlogPosts = [
      {
        title: "How to Maximize Your Earnings: Task Selection Strategies",
        slug: "maximize-earnings-task-strategies",
        content: `Choosing the right tasks can significantly impact your earnings on Breedskool. Here are proven strategies for maximizing your income:

**1. Diversify Your Task Portfolio**
Don't limit yourself to one category. Mix app testing, content creation, and local errands to maintain steady income.

**2. Focus on High-Value Tasks**
Tasks like event hosting and trading analysis typically offer higher rewards. Build skills in these areas for better opportunities.

**3. Location Advantage**
If you're in a major city, prioritize local errands and event-based tasks that often pay premium rates.

**4. Build Your Reputation**
Complete smaller tasks perfectly to build ratings, then qualify for exclusive high-paying campaigns.

**5. Time Management**
Plan tasks around your schedule. App testing can be done flexibly, while events have fixed timeframes.`,
        excerpt: "Learn proven strategies to maximize your earnings through strategic task selection and portfolio diversification.",
        category: "Creator Tips",
        tags: ["earnings", "strategy", "tasks", "guide"],
        isPublished: true,
        publishedAt: new Date()
      },
      {
        title: "The Future of Task-Based Work: Beyond Social Media",
        slug: "future-task-based-work",
        content: `The gig economy is evolving beyond traditional social media influencing. Breedskool represents the next generation of task-based work:

**Diverse Opportunities**
From app testing to event hosting, the platform offers opportunities for various skill sets and interests.

**Real-World Impact**
Tasks like local errands and business visits create tangible value for brands while providing meaningful work.

**Skill Development**
Users can develop new skills in trading, content creation, and event management through our campaigns.

**Global Reach, Local Action**
While the platform is global, many tasks focus on local market needs and community engagement.

**Crypto Rewards**
Instant cryptocurrency payments provide financial flexibility and access to the growing digital economy.`,
        excerpt: "Discover how task-based work is revolutionizing the gig economy beyond traditional social media.",
        category: "Industry Insights",
        tags: ["future", "gig-economy", "innovation", "crypto"],
        isPublished: true,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];

    await db.insert(blogPosts).values(sampleBlogPosts);

    // Seed shop products
    const sampleProducts = [
      {
        title: "Professional Content Creator Kit",
        description: "Complete kit for high-quality content creation including ring light, tripod, and microphone.",
        price: "150.00",
        originalPrice: "200.00",
        category: "Equipment",
        type: "physical_product",
        rating: "4.7",
        reviewCount: 89,
        tags: ["content", "equipment", "video"],
        isActive: true
      },
      {
        title: "Crypto Trading Course Access",
        description: "6-month access to advanced cryptocurrency trading course with live sessions and community.",
        price: "299.00",
        originalPrice: "399.00",
        category: "Education",
        type: "digital_course",
        rating: "4.9",
        reviewCount: 156,
        tags: ["crypto", "trading", "education"],
        isActive: true
      },
      {
        title: "Event Hosting Masterclass",
        description: "Learn professional event hosting skills from industry experts. Includes templates and guides.",
        price: "99.00",
        originalPrice: "149.00",
        category: "Education",
        type: "digital_course",
        rating: "4.6",
        reviewCount: 67,
        tags: ["events", "hosting", "skills"],
        isActive: true
      }
    ];

    await db.insert(shopProducts).values(sampleProducts);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}