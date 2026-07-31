/**
 * One-shot script: seeds BreedSkool courses into the PROD_DATABASE_URL database.
 * Run with: DATABASE_URL=$PROD_DATABASE_URL npx tsx scripts/seed-prod-courses.ts
 */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import { courses, courseLessons, breedskoolCoursePricing } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

const { Pool } = pg;

const connStr = process.env.PROD_DATABASE_URL;
if (!connStr) {
  console.error("PROD_DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connStr,
  ssl: connStr.includes("railway.app") || connStr.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 3,
});

const db = drizzle({ client: pool, schema });

// ── Find first admin user ─────────────────────────────────────────────────────
async function getAdminId(): Promise<string> {
  const result = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`
  );
  if (!result.rows.length) {
    // Fall back to any user
    const any = await pool.query(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
    if (!any.rows.length) throw new Error("No users found in production database");
    console.warn("[seed] No admin found — using first user as instructor");
    return any.rows[0].id;
  }
  return result.rows[0].id;
}

// ── Course data (copied from seed-breedskool-courses.ts) ─────────────────────
const BREEDSKOOL_PLATFORM_COURSES = [
  {
    courseKey: "webdev",
    title: "Web Development & Vibe Coding",
    description: "Build modern websites, web apps, and vibe-coded digital products from scratch. Master HTML, CSS, JavaScript, React, Node.js, and deployment in this 8-week intensive bootcamp. Collaborate with fellow students in group chat and get private support from your tutor.",
    shortDescription: "Build modern websites, web apps, and vibe-coded digital products from scratch.",
    category: "branding",
    level: "beginner",
    duration: "8 Weeks",
    price: "90.91",
    tags: ["breedskool_webdev", "web development", "javascript", "react", "breedskool"],
    whatYouLearn: ["HTML, CSS & JavaScript fundamentals", "React & Node.js", "Deployment & hosting", "Vibe coding with AI tools"],
    requirements: ["Basic computer skills", "Stable internet connection", "Laptop or desktop computer"],
    syllabus: [
      { week: "Week 1–2", topic: "HTML, CSS & Git" },
      { week: "Week 3–4", topic: "JavaScript & DOM" },
      { week: "Week 5–6", topic: "React & Component Architecture" },
      { week: "Week 7", topic: "Node.js & APIs" },
      { week: "Week 8", topic: "Deployment & Portfolio Projects" },
    ],
    lessons: [
      { title: "Welcome to Web Development & Vibe Coding", content: "Welcome to the course! In this orientation lesson you'll meet your tutor, understand the course structure, and set up your development environment (VS Code, Node.js, Git).\n\nAfter this lesson you will:\n• Have VS Code installed and configured\n• Understand what we'll build together\n• Be connected to the group chat\n\nUse the Group Chat tab to introduce yourself to your fellow students!", isPreview: true, order: 1 },
      { title: "HTML Foundations — Structure of the Web", content: "HTML is the skeleton of every webpage. In this lesson we cover:\n• Document structure (html, head, body)\n• Headings, paragraphs, links, images\n• Lists and tables\n• Semantic HTML5 elements (nav, main, section, article, footer)\n\nPractice: Build a personal bio page with your name, photo, and a short introduction.", isPreview: false, order: 2 },
      { title: "CSS Styling — Make It Look Good", content: "CSS is how we make websites beautiful. Topics:\n• Selectors, properties, and values\n• Box model (margin, padding, border)\n• Flexbox layout\n• Colors, fonts, and Google Fonts\n• Responsive design basics with media queries\n\nPractice: Style your bio page from lesson 2 to look professional.", isPreview: false, order: 3 },
      { title: "JavaScript Basics — Making Pages Interactive", content: "JavaScript brings your pages to life. We cover:\n• Variables (let, const), data types, functions\n• DOM manipulation — changing page content with JS\n• Event listeners (click, submit, keyup)\n• Fetch API — loading data from the internet\n\nPractice: Build a to-do list app that saves items in the browser.", isPreview: false, order: 4 },
      { title: "React — Modern Frontend Development", content: "React is the world's most popular frontend library. In this lesson:\n• What is a component?\n• JSX syntax\n• Props and state with useState\n• useEffect hook\n• Building a weather app with a public API\n\nBy the end you will have built a real React app!", isPreview: false, order: 5 },
      { title: "Node.js & Express — Your First Backend", content: "The backend is where your data lives. Topics:\n• What is Node.js?\n• Setting up an Express server\n• Routes (GET, POST, PUT, DELETE)\n• Connecting to a database (PostgreSQL basics)\n• Deploying your server to Railway\n\nPractice: Build a simple REST API for your portfolio.", isPreview: false, order: 6 },
    ],
  },
  {
    courseKey: "ai_content",
    title: "AI Content Creation Mastery",
    description: "Master ChatGPT, Midjourney, AI video tools, and content strategy to build a profitable online presence in this 6-week intensive. Join a community of creators and get tutor feedback on your content.",
    shortDescription: "Master AI tools to create viral content and build a profitable online presence.",
    category: "content",
    level: "beginner",
    duration: "6 Weeks",
    price: "136.36",
    tags: ["breedskool_ai_content", "ai", "content creation", "chatgpt", "midjourney", "breedskool"],
    whatYouLearn: ["ChatGPT prompting mastery", "Midjourney image generation", "AI video production", "Content monetization strategies"],
    requirements: ["Smartphone or computer", "Basic social media knowledge"],
    syllabus: [
      { week: "Week 1", topic: "ChatGPT & Prompt Engineering" },
      { week: "Week 2", topic: "Midjourney & AI Image Creation" },
      { week: "Week 3", topic: "AI Video Production" },
      { week: "Week 4", topic: "Content Strategy & Scheduling" },
      { week: "Week 5", topic: "Platform Monetization Setup" },
      { week: "Week 6", topic: "Final Projects & Launch" },
    ],
    lessons: [
      { title: "Welcome & Your AI Content Toolkit", content: "Welcome to AI Content Creation! In this orientation:\n• Meet your tutor and fellow students\n• Overview of all the AI tools you'll master\n• Setting up your accounts (ChatGPT, Midjourney, CapCut)\n• The creator economy in 2025 — income opportunities\n\nJoin the group chat and share what type of content you want to create!", isPreview: true, order: 1 },
      { title: "ChatGPT Mastery — Content & Prompting", content: "ChatGPT is your AI writing assistant. This lesson covers:\n• What makes a great prompt (context, tone, format)\n• Writing viral hooks and captions\n• Generating content calendars for 30 days\n• Repurposing one idea into 10 pieces of content\n• Using GPT-4 for research, scripts, and email sequences\n\nPractice: Create a 30-day content calendar for your niche using ChatGPT.", isPreview: false, order: 2 },
      { title: "Midjourney — AI Image Generation for Creators", content: "Create stunning visuals without design skills. Topics:\n• Setting up Midjourney on Discord\n• Prompt engineering for images\n• Creating consistent character art\n• Thumbnails that get clicks\n• Selling AI art and illustrations\n\nChallenge: Design 5 professional thumbnails for your niche.", isPreview: false, order: 3 },
      { title: "AI Video Production — Runway, CapCut & More", content: "Video is king. Learn to create with AI:\n• CapCut AI features (auto-captions, templates, effects)\n• Runway ML for AI video generation\n• HeyGen for AI avatar videos (no face required!)\n• ElevenLabs for AI voiceovers\n• Editing a viral short-form video from scratch\n\nPractice: Create a 60-second product review video using only AI tools.", isPreview: false, order: 4 },
      { title: "Content Strategy — Go Viral Consistently", content: "Posting randomly doesn't work. This lesson:\n• The algorithm explained (TikTok, Instagram, YouTube)\n• Hook → story → CTA framework\n• Best posting times and frequencies\n• Cross-platform repurposing system\n• Using analytics to double down on what works\n\nAction: Post your first AI-generated piece of content this week!", isPreview: false, order: 5 },
      { title: "Monetization — Turning Followers into Income", content: "This is what it's all about. Income streams covered:\n• Brand deals and sponsorships ($100–$10,000+ per post)\n• Digital products (ebooks, presets, templates)\n• Paid communities and memberships\n• UGC (User Generated Content) for brands\n• Affiliate marketing setup\n\nAction: Apply for your first brand deal or UGC gig this week!", isPreview: false, order: 6 },
    ],
  },
  {
    courseKey: "social_monetize",
    title: "Social Media & Web Assets Monetization",
    description: "Build and monetize Instagram, TikTok & YouTube channels, websites, and digital assets to unlock multiple income streams in this 6-week program. Share wins and get feedback from peers and your tutor.",
    shortDescription: "Monetize your social media and digital assets for multiple income streams.",
    category: "monetization",
    level: "intermediate",
    duration: "6 Weeks",
    price: "193.94",
    tags: ["breedskool_social_monetize", "social media", "monetization", "instagram", "tiktok", "breedskool"],
    whatYouLearn: ["Instagram growth strategies", "TikTok & YouTube monetization", "Website & digital asset income", "Brand deals & sponsorships"],
    requirements: ["Active social media presence", "Smartphone with good camera"],
    syllabus: [
      { week: "Week 1", topic: "Platform Selection & Strategy" },
      { week: "Week 2", topic: "Content & Growth Hacks" },
      { week: "Week 3", topic: "Monetization Setup" },
      { week: "Week 4", topic: "Website & Digital Asset Income" },
      { week: "Week 5", topic: "Brand Deals & Sponsorships" },
      { week: "Week 6", topic: "Scaling & Automation" },
    ],
    lessons: [
      { title: "Welcome — Your Multi-Income Social Strategy", content: "Welcome! In this orientation we cover:\n• The 6 income streams you'll build in this program\n• Choosing your hero platform (Instagram, TikTok, or YouTube)\n• Setting up a professional profile that converts\n• Your first week action plan\n\nIntroduce yourself in the group chat — where are you from and which platform are you starting with?", isPreview: true, order: 1 },
      { title: "Instagram Growth — From 0 to 10K Followers", content: "Instagram is still the #1 platform for brand deals and digital product sales. This lesson:\n• Profile optimisation (bio, highlights, link-in-bio)\n• Reels strategy — the fastest path to viral growth\n• Hashtag research in 2025 (what still works)\n• Story engagement techniques\n• Instagram DM automation for lead generation\n• Using Collab posts to borrow audiences\n\nChallenge: Post 3 Reels this week using the hook framework taught in this lesson.", isPreview: false, order: 2 },
      { title: "TikTok & YouTube Shorts — Short-Form Dominance", content: "Short-form video is the fastest way to grow an audience in 2025. Topics:\n• TikTok algorithm decoded — what gets pushed to FYP\n• YouTube Shorts monetization (RPM rates, eligibility)\n• Cross-posting strategy — one video, 3 platforms\n• Viral hook formulas with 50+ examples\n• Editing for retention — the 2-second rule\n• TikTok Creator Fund vs. Series vs. LIVE gifts\n\nPractice: Film and post 5 short-form videos across platforms this week.", isPreview: false, order: 3 },
      { title: "Website Income — Blogging, Affiliate & Ad Revenue", content: "A website is a 24/7 income machine. This lesson:\n• Starting a niche blog that ranks on Google\n• WordPress vs. Ghost vs. Webflow — which to choose\n• Google AdSense setup and RPM optimization\n• Affiliate marketing: Amazon, ShareASale, ClickBank, Impact\n• Building an email list from Day 1\n• Selling digital products from your site (Gumroad, Payhip, Lemon Squeezy)\n\nAction: Register your domain and set up hosting this week.", isPreview: false, order: 4 },
      { title: "Brand Deals & UGC — Earning From Your Influence", content: "You don't need 1M followers to earn from brand partnerships. Topics:\n• What brands want from micro-influencers (1K–50K followers)\n• UGC (User Generated Content) — earn $100–$500 per video\n• How to pitch brands (cold DM + email templates included)\n• Rate card template — how to price your services\n• Platforms to find brand deal opportunities (AspireIQ, Grin, Creator.co)\n• Negotiation tips — never accept the first offer\n\nAction: Send 10 brand partnership pitches this week using the templates provided.", isPreview: false, order: 5 },
      { title: "Scaling — Automation, Team & Passive Income", content: "The goal is income that grows while you sleep. This lesson:\n• Content batching — create a month of content in one day\n• Hiring a virtual assistant for $5–$10/hour\n• Automating engagement with ManyChat\n• Building a digital product that sells on autopilot\n• Paid communities (Discord, Telegram, Circle) — recurring revenue\n• Your 6-month income projection based on your current assets\n\n🎓 Final Project: Present your multi-channel income report showing revenue from at least 2 streams.", isPreview: false, order: 6 },
    ],
  },
  {
    courseKey: "saas_masterclass",
    title: "SaaS Founder Masterclass",
    description: "Go from idea to $5,000 MRR in 12 weeks. Build, launch, and scale a real SaaS product using AI agents, modern frameworks, and proven growth systems. Includes group chat, private tutor sessions, and weekly office hours.",
    shortDescription: "Build and scale a real SaaS business from idea to $5K MRR in 12 weeks.",
    category: "tech",
    level: "advanced",
    duration: "12 Weeks",
    price: "318.18",
    tags: ["breedskool_saas_masterclass", "saas", "startup", "entrepreneurship", "breedskool"],
    whatYouLearn: ["SaaS idea validation", "Full-stack development with AI agents", "Cloud deployment & DevOps", "User acquisition & monetization"],
    requirements: [
      "Basic computer skills (no prior coding experience required)",
      "Laptop or desktop with stable internet connection",
      "Willingness to build and ship real products",
      "A business idea OR willingness to validate one in Week 1",
    ],
    syllabus: [
      { week: "Week 1", topic: "SaaS Idea Validation & Market Research" },
      { week: "Week 2", topic: "Building with AI Agents — Replit, Cursor & v0" },
      { week: "Week 3", topic: "Full Stack Architecture — React + Node.js + PostgreSQL" },
      { week: "Week 4", topic: "GitHub & Version Control — Branches, PRs & CI/CD" },
      { week: "Week 5", topic: "Cloud Deployment — Railway, Vercel & VPS" },
      { week: "Week 6", topic: "In-App Marketing — Email, Push & Referrals" },
      { week: "Week 7", topic: "SEO & Google Search Console Mastery" },
      { week: "Week 8", topic: "Analytics — GA4, Mixpanel & Conversion Funnels" },
      { week: "Week 9", topic: "User Acquisition — Organic Growth Systems" },
      { week: "Week 10", topic: "Monetization — Stripe Subscriptions, Products & Services" },
      { week: "Week 11", topic: "Social Media Monetization — YouTube, TikTok, Instagram & X" },
      { week: "Week 12", topic: "Scaling MRR, Fundraising & Exit Strategy" },
    ],
    lessons: [
      { title: "Welcome to the Masterclass — Your Roadmap to $5K MRR", content: "Welcome! This is the course that turns ideas into income-generating SaaS businesses.\n\n🎯 What you'll build:\nA fully functional, deployed, monetized SaaS web application — with real paying users — by Week 12.\n\n📦 What's included:\n• 12 weeks of structured modules\n• Group community chat with founders from 30+ countries\n• Private tutor sessions\n• Access to all templates, code repositories, and tools used in lessons\n\n📌 Action for today:\n1. Introduce yourself in the Group Chat (country, idea, goal)\n2. Complete the Idea Validation Worksheet (pinned in resources)\n3. Book your Week 1 orientation call\n\nYou are now part of a global cohort of builders. Let's ship.", isPreview: true, order: 1 },
      { title: "Week 1 — SaaS Idea Validation & Niche Selection", content: "Before writing one line of code, you need to validate that people will pay for your idea.\n\n✅ This week you'll learn:\n• The $0-to-validation framework (interviews, landing page, waitlist)\n• How to identify a painful problem people pay to solve\n• Niche vs. horizontal SaaS — which to build first\n• Competitor analysis using SEMrush, Ahrefs free tools & Reddit\n• Pricing psychology — why $49/month > $1/day in SaaS\n• How to get your first 10 LOIs (Letters of Intent) before building\n\n🛠 Tools used: Notion, Typeform, Carrd, Google Trends, Reddit, Twitter/X\n\n📝 Assignment: Post your validated idea + 3 paying prospect names in the group chat by end of week.", isPreview: false, order: 2 },
      { title: "Week 2 — AI-Agent Development with Replit, Cursor & v0", content: "This module changes how you build forever. AI agents let a single founder build what previously needed a team of 5.\n\n✅ What you'll master:\n• Setting up Cursor with Claude Sonnet as your pair programmer\n• Replit AI — spin up a full stack app in 20 minutes\n• v0 by Vercel — generate production-grade React UI from prompts\n• Prompt engineering for code: specificity, context, iteration\n• GitHub Copilot for autocompletion while you build\n• When to trust AI output and when to review carefully\n• Debugging AI-generated code (the critical skill most miss)\n\n🛠 Stack: Cursor IDE, Replit, v0.dev, GitHub Copilot\n\n🏗 Build: Your SaaS MVP landing page + authentication system using AI agents.\n\n📝 Assignment: Share your Replit deployment link in the group chat.", isPreview: false, order: 3 },
    ],
  },
];

async function main() {
  const adminId = await getAdminId();
  console.log(`[seed] Using admin/instructor ID: ${adminId}`);

  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const course of BREEDSKOOL_PLATFORM_COURSES) {
    try {
      const tagToFind = `breedskool_${course.courseKey}`;

      const existing = await db.select({ id: courses.id })
        .from(courses)
        .where(sql`${courses.tags} @> ARRAY[${tagToFind}]::text[]`)
        .limit(1);

      let courseId: string;

      if (existing.length > 0) {
        courseId = existing[0].id;
        console.log(`[seed] Course "${course.title}" already exists — skipping insert`);
        skipped++;
      } else {
        const [newCourse] = await db.insert(courses).values({
          title: course.title,
          description: course.description,
          shortDescription: course.shortDescription,
          category: course.category,
          instructorId: adminId,
          price: course.price,
          isFree: false,
          level: course.level as any,
          duration: course.duration,
          status: "published",
          isPublished: true,
          isFeatured: false,
          tags: course.tags,
          whatYouLearn: course.whatYouLearn,
          requirements: course.requirements,
          syllabus: course.syllabus as any,
        } as any).returning({ id: courses.id });
        courseId = newCourse.id;
        created++;
        console.log(`[seed] ✓ Created course: ${course.title}`);
      }

      // Seed lessons (idempotent)
      const existingLessons = await db.select({ id: courseLessons.id })
        .from(courseLessons)
        .where(eq(courseLessons.courseId, courseId))
        .limit(1);

      if (existingLessons.length === 0 && course.lessons?.length) {
        for (const lesson of course.lessons) {
          await db.insert(courseLessons).values({
            courseId,
            title: lesson.title,
            content: lesson.content,
            isPreview: lesson.isPreview,
            order: lesson.order,
          } as any);
        }
        await db.execute(
          sql`UPDATE courses SET lessons_count = ${course.lessons.length} WHERE id = ${courseId}`
        );
        console.log(`[seed]   → Added ${course.lessons.length} lessons`);
      }

      // Link pricing row if it exists
      try {
        await db.update(breedskoolCoursePricing)
          .set({ linkedCourseId: courseId } as any)
          .where(eq(breedskoolCoursePricing.courseKey, course.courseKey));
        linked++;
      } catch (_) {
        // breedskoolCoursePricing table may not exist — that's OK
      }

    } catch (e: any) {
      console.error(`[seed] ✗ Error for ${course.courseKey}:`, e?.message);
    }
  }

  console.log(`\n[seed] Done — created: ${created}, skipped: ${skipped}, pricing linked: ${linked}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
