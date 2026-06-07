import { db } from "./db";
import { courses, breedskoolCoursePricing } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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
  },
  {
    courseKey: "ai_content",
    title: "AI Content Creation & Video Editing",
    description: "Leverage ChatGPT, Midjourney & AI video tools to create viral content, professional videos, and earn from multiple platforms in this 6-week program. Connect with your cohort and get real-time tutor support.",
    shortDescription: "Use AI tools to create viral content and earn from multiple platforms.",
    category: "content_creation",
    level: "beginner",
    duration: "6 Weeks",
    price: "108.48",
    tags: ["breedskool_ai_content", "ai", "content creation", "video editing", "breedskool"],
    whatYouLearn: ["ChatGPT & Prompt Engineering", "Midjourney & AI image generation", "AI video tools (Runway, Sora)", "Multi-platform monetization strategies"],
    requirements: ["Basic smartphone or laptop", "Active social media account"],
    syllabus: [
      { week: "Week 1", topic: "AI Tools Overview & ChatGPT Mastery" },
      { week: "Week 2", topic: "Midjourney & AI Image Generation" },
      { week: "Week 3", topic: "AI Video Production" },
      { week: "Week 4", topic: "Content Strategy & Scheduling" },
      { week: "Week 5", topic: "Platform Monetization Setup" },
      { week: "Week 6", topic: "Final Projects & Launch" },
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
      { week: "Week 4", topic: "Brand Partnerships & Deals" },
      { week: "Week 5", topic: "Digital Assets & Passive Income" },
      { week: "Week 6", topic: "Scaling Your Income" },
    ],
  },
  {
    courseKey: "trading",
    title: "Pocket Option Trading",
    description: "Master Pocket Option binary trading, chart analysis, risk management, and consistent income strategies for financial freedom in this 8-week program. Discuss trades and strategies with your group and get private coaching from your tutor.",
    shortDescription: "Master binary trading, chart analysis, and consistent income strategies.",
    category: "general",
    level: "beginner",
    duration: "8 Weeks",
    price: "169.09",
    tags: ["breedskool_trading", "trading", "binary options", "pocket option", "breedskool"],
    whatYouLearn: ["Binary options basics on Pocket Option", "Chart reading & technical analysis", "Risk management strategies", "Building consistent trading systems"],
    requirements: ["Stable internet connection", "Practice account capital ($10 minimum)"],
    syllabus: [
      { week: "Week 1–2", topic: "Platform Setup & Trading Basics" },
      { week: "Week 3–4", topic: "Chart Analysis & Indicators" },
      { week: "Week 5–6", topic: "Strategy Development & Backtesting" },
      { week: "Week 7", topic: "Risk Management & Psychology" },
      { week: "Week 8", topic: "Live Trading Practice & Review" },
    ],
  },
  {
    courseKey: "home_lesson",
    title: "Tech Home Lessons for Kids",
    description: "One-on-one tech lessons delivered at your home by a certified tutor. Covering coding, AI tools, and digital skills for ages 6–17. This course hub connects all home lesson students with their assigned tutor for group discussion, session updates, and private tutor chat.",
    shortDescription: "One-on-one tech lessons for kids (ages 6–17) delivered at your home.",
    category: "general",
    level: "beginner",
    duration: "Per Session",
    price: "51.52",
    tags: ["breedskool_home_lesson", "kids", "home lesson", "coding for kids", "breedskool"],
    whatYouLearn: ["Scratch & block coding", "Basic Python & HTML", "AI tools for kids", "Digital skills & online safety"],
    requirements: ["Ages 6–17", "Laptop or tablet at home", "Parent/guardian available during sessions"],
    syllabus: [
      { week: "Session 1–4", topic: "Intro to Computers & Digital Safety" },
      { week: "Session 5–8", topic: "Scratch & Block Coding" },
      { week: "Session 9–12", topic: "Basic Python / HTML" },
      { week: "Session 13+", topic: "AI Tools for Kids & Personal Projects" },
    ],
  },
  {
    courseKey: "onsite_training",
    title: "Onsite Group Training — Ikorodu Lagos",
    description: "Join our hands-on classroom sessions at TootoOba Estate, Ijede, Ikorodu Lagos. Work alongside fellow students in a structured environment with daily tutor support. This course hub connects all onsite students for group discussions, announcements, and private tutor messaging.",
    shortDescription: "Hands-on classroom training at our Ikorodu Lagos campus.",
    category: "general",
    level: "beginner",
    duration: "6–8 Weeks",
    price: "78.79",
    tags: ["breedskool_onsite_training", "onsite", "classroom", "lagos", "ikorodu", "breedskool"],
    whatYouLearn: ["Hands-on practical skills with tutor guidance", "Peer collaboration & networking", "Daily structured learning environment", "Portfolio projects to show employers"],
    requirements: ["Lagos or nearby location", "Laptop optional (provided in class)", "Commitment to attend sessions"],
    syllabus: [
      { week: "Week 1–2", topic: "Foundations & Environment Setup" },
      { week: "Week 3–4", topic: "Core Skills Training" },
      { week: "Week 5–6", topic: "Projects & Peer Collaboration" },
      { week: "Week 7–8", topic: "Portfolio Building & Graduation" },
    ],
  },
];

export async function seedBreedskoolCourses(adminId: string): Promise<{ created: number; linked: number }> {
  let created = 0;
  let linked = 0;

  for (const course of BREEDSKOOL_PLATFORM_COURSES) {
    try {
      const tagToFind = `breedskool_${course.courseKey}`;

      // Check if a course with this breedskool tag already exists
      const existing = await db.select({ id: courses.id })
        .from(courses)
        .where(sql`${courses.tags} @> ARRAY[${tagToFind}]::text[]`)
        .limit(1);

      let courseId: string;

      if (existing.length > 0) {
        courseId = existing[0].id;
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
      }

      // Link the pricing entry to this course
      await db.update(breedskoolCoursePricing)
        .set({ linkedCourseId: courseId } as any)
        .where(eq(breedskoolCoursePricing.courseKey, course.courseKey));
      linked++;

    } catch (e: any) {
      console.error(`[seedBreedskoolCourses] Error for ${course.courseKey}:`, e?.message);
    }
  }

  return { created, linked };
}
