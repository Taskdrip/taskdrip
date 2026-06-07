import { db } from "./db";
import { courses, courseLessons, breedskoolCoursePricing } from "@shared/schema";
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
    lessons: [
      { title: "Welcome to Web Development & Vibe Coding", content: "Welcome to the course! In this orientation lesson you'll meet your tutor, understand the course structure, and set up your development environment (VS Code, Node.js, Git).\n\nAfter this lesson you will:\n• Have VS Code installed and configured\n• Understand what we'll build together\n• Be connected to the group chat\n\nUse the Group Chat tab to introduce yourself to your fellow students!", isPreview: true, order: 1 },
      { title: "HTML Foundations — Structure of the Web", content: "HTML is the skeleton of every webpage. In this lesson we cover:\n• Document structure (html, head, body)\n• Headings, paragraphs, links, images\n• Lists and tables\n• Semantic HTML5 elements (nav, main, section, article, footer)\n\nPractice: Build a personal bio page with your name, photo, and a short introduction.", isPreview: false, order: 2 },
      { title: "CSS Styling — Make It Look Good", content: "CSS is how we make websites beautiful. Topics:\n• Selectors, properties, and values\n• Box model (margin, padding, border)\n• Flexbox layout\n• Colors, fonts, and Google Fonts\n• Responsive design basics with media queries\n\nPractice: Style your bio page from lesson 2 to look professional.", isPreview: false, order: 3 },
      { title: "JavaScript Basics — Making Pages Interactive", content: "JavaScript brings your pages to life. We cover:\n• Variables (let, const), data types, functions\n• DOM manipulation — changing page content with JS\n• Event listeners (click, submit, keyup)\n• Fetch API — loading data from the internet\n\nPractice: Build a to-do list app that saves items in the browser.", isPreview: false, order: 4 },
      { title: "React — Modern Frontend Development", content: "React is the world's most popular frontend library. In this lesson:\n• What is a component?\n• JSX syntax\n• Props and state with useState\n• useEffect hook\n• Building a weather app with a public API\n\nBy the end you will have built a real React app!", isPreview: false, order: 5 },
      { title: "Node.js & Express — Your First Backend", content: "The backend is where your data lives. Topics:\n• What is Node.js?\n• Setting up an Express server\n• Routes (GET, POST, PUT, DELETE)\n• Connecting to a database (PostgreSQL basics)\n• Deploying your server to Railway\n\nPractice: Build a simple REST API for your portfolio.", isPreview: false, order: 6 },
      { title: "Vibe Coding with AI Tools", content: "Modern developers use AI to move 10x faster. This lesson covers:\n• Using ChatGPT & GitHub Copilot for coding\n• Debugging with AI assistance\n• Building an entire app with Cursor / Replit AI\n• When to use AI and when to code manually\n\nChallenge: Build a mini SaaS product idea using AI tools in 2 hours!", isPreview: false, order: 7 },
      { title: "Deployment & Portfolio Building", content: "Congratulations — you're almost done! In this final lesson:\n• Deploying frontend apps to Vercel / Netlify\n• Deploying backend to Railway\n• Custom domain setup\n• Building your developer portfolio website\n• How to get your first freelance client\n\nSubmit your portfolio link in the group chat for feedback from your tutor!", isPreview: false, order: 8 },
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
      { week: "Week 4", topic: "Brand Partnerships & Deals" },
      { week: "Week 5", topic: "Digital Assets & Passive Income" },
      { week: "Week 6", topic: "Scaling Your Income" },
    ],
    lessons: [
      { title: "Welcome — Your Social Monetization Blueprint", content: "Welcome! This course is for people ready to turn their online presence into real income. In this orientation:\n• Your tutor's income story (proof this works)\n• Platform selection: which is right for you?\n• Your monetization goal — set your 6-week income target\n• Join the group chat and post your goal!\n\nHomework: Write down your niche, your target audience, and your income goal.", isPreview: true, order: 1 },
      { title: "Instagram Growth — 0 to 10K Strategy", content: "Instagram still pays massive dividends in 2025. Topics:\n• Niche selection and profile optimization\n• Content pillars (educational, entertainment, personal)\n• Reels vs. carousels vs. stories — what works when\n• Hashtag strategy and SEO in captions\n• How to grow 1,000 followers in 30 days organically\n\nAction: Optimize your Instagram profile using the checklist provided.", isPreview: false, order: 2 },
      { title: "TikTok & YouTube Shorts — Viral Short-Form", content: "Short-form video is the fastest path to growth. This lesson:\n• TikTok algorithm secrets for 2025\n• YouTube Shorts monetization requirements\n• The 3-second hook formula\n• Trending audio and effect strategies\n• Turning viral videos into paying customers\n\nChallenge: Post 3 short-form videos this week and report back in the group chat.", isPreview: false, order: 3 },
      { title: "Turning Followers into Cash — Monetization Basics", content: "A big following means nothing without monetization. Learn:\n• The 1,000 True Fans model\n• Setting up your first digital product (Gumroad/Selar)\n• Affiliate marketing accounts to join (Amazon, ShareASale, Impact)\n• Instagram Shopping and link-in-bio tools\n• How to pitch to brands even with 1,000 followers\n\nAction: Set up your first affiliate link or digital product today.", isPreview: false, order: 4 },
      { title: "Brand Deals — How to Get Sponsored", content: "Brand deals are where the big money is. Topics covered:\n• How to write a media kit (template provided)\n• Finding and reaching out to brands (email script included)\n• Negotiating rates — what to charge at each follower level\n• UGC (User Generated Content) — earn without a big following\n• Platforms: AspireIQ, Creator.co, Collabs, Taskdrip\n\nAction: Send 5 brand partnership pitches this week!", isPreview: false, order: 5 },
      { title: "Web Assets & Passive Income — Scale to $5K/month", content: "Build assets that earn while you sleep:\n• Niche websites and Google AdSense income\n• Newsletter monetization (Substack, Beehiiv)\n• Digital product funnels\n• Paid communities (Telegram, Discord, WhatsApp)\n• YouTube AdSense (monetization requirements & strategy)\n\nFinal Project: Present your multi-stream income plan in the group chat for feedback!", isPreview: false, order: 6 },
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
    lessons: [
      { title: "Welcome to Pocket Option Trading", content: "Welcome, future trader! Before we start risking any money, let's build a solid foundation:\n• What is binary options trading and how does Pocket Option work?\n• Creating your Pocket Option demo account (free — trade with $10,000 virtual money)\n• Understanding the trading interface\n• Why most traders fail (and how to be in the 5% who succeed)\n• Course rules: NO live trading until Week 5!\n\nJoin the group chat and introduce yourself — share your trading experience level.", isPreview: true, order: 1 },
      { title: "How Binary Options Work — The Mechanics", content: "Understanding exactly what you're trading is critical. This lesson:\n• Call vs. Put options — how you profit\n• Expiry times (1 min, 5 min, 15 min, 1 hour)\n• Payout percentages and what they mean\n• Asset types: currencies, stocks, commodities, indices\n• How the broker makes money (and why it matters)\n\nPractice: Place 20 demo trades and record the results in your trading journal.", isPreview: false, order: 2 },
      { title: "Reading Candlestick Charts — The Language of Markets", content: "Every chart tells a story. Learn to read it:\n• What a candlestick shows (open, high, low, close)\n• Key candlestick patterns: Doji, Engulfing, Hammer, Shooting Star\n• Support and resistance levels\n• Trend lines and how to draw them\n• The 4 phases of a market: accumulation, markup, distribution, decline\n\nPractice: Identify 5 key patterns on historical charts (screenshots shared in group chat).", isPreview: false, order: 3 },
      { title: "Technical Indicators — RSI, MACD, Bollinger Bands", content: "Indicators confirm what the chart is telling you:\n• RSI (Relative Strength Index) — overbought and oversold\n• MACD — trend direction and momentum\n• Bollinger Bands — volatility and breakouts\n• Moving Averages (SMA & EMA)\n• How to combine 2 indicators for a high-probability signal\n\nPractice: Demo trade ONLY when you see 2 indicators align. Record 30 trades.", isPreview: false, order: 4 },
      { title: "Your Trading Strategy — Build It & Backtest It", content: "A strategy with no edge is just gambling. This lesson:\n• The components of a profitable strategy\n• Our BreedSkool base strategy (taught live)\n• How to backtest on historical data\n• Win rate calculation and expected value\n• When to trade and when to walk away\n\nHomework: Backtest your strategy on 100 historical trades and share your results.", isPreview: false, order: 5 },
      { title: "Risk Management — Protect Your Capital", content: "The difference between a trader and a gambler is risk management:\n• The 1–2% rule (never risk more than 2% per trade)\n• Martingale strategy — why it destroys accounts\n• Daily loss limits — mandatory stop for the day\n• Profit target rules — when to stop after a win\n• Emotional trading and how to stop it\n\nThis is the most important lesson in the course. Reread it twice.", isPreview: false, order: 6 },
      { title: "Live Trading — Going Live Safely", content: "It's time to trade with real money (minimum $10). Rules:\n• Start with your minimum deposit only\n• Maximum trade size: $1 per trade (until you hit 60% win rate consistently)\n• Use the same strategy you backtested — no improvising\n• Keep your trading journal updated daily\n• Post your daily P&L in the group chat for accountability\n\nPost your first live trade result in the group chat!", isPreview: false, order: 7 },
      { title: "Scaling Up & Long-Term Trading Career", content: "Congratulations on completing the course! Next steps:\n• When and how to increase your trade size\n• Withdrawing profits regularly\n• Reinvesting in your trading account\n• Advanced strategies to explore next (Forex, Crypto)\n• Building a trading routine (morning analysis, session timing)\n\nFinal action: Share your 8-week trading journey summary in the group chat!", isPreview: false, order: 8 },
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
    lessons: [
      { title: "Welcome — Getting Started with Your Tutor", content: "Welcome to BreedSkool Home Lessons! This is your student hub where:\n• Your tutor will post session updates and homework\n• You can message your tutor privately (use 'Message Tutor' tab)\n• You can connect with other home lesson students\n\n📅 Your tutor will contact you within 24 hours to schedule your first session.\n\nParents: Use the group chat to ask questions about the program. Your tutor will respond here!", isPreview: true, order: 1 },
      { title: "Session 1–2: Computers, the Internet & Digital Safety", content: "What we cover in the first sessions:\n• What is a computer and how does it work?\n• Understanding files, folders, and the desktop\n• Safe internet use — what to share and what to keep private\n• Creating strong passwords\n• Fun keyboard shortcuts to work faster\n\n🎮 Fun activity: Type a short story about your favourite animal using the keyboard!", isPreview: false, order: 2 },
      { title: "Session 3–4: Introduction to Scratch — Block Coding", content: "Scratch (scratch.mit.edu) is where most programmers start!\n• Creating a free Scratch account\n• Understanding sprites, costumes, and backgrounds\n• Moving characters with blocks\n• Using 'if' blocks to make decisions\n• Loops — making things repeat\n\n🎮 Project: Build a simple game where a cat chases a ball!", isPreview: false, order: 3 },
      { title: "Session 5–8: Python Basics for Kids", content: "Python is the #1 beginner programming language in the world!\n• Installing Python and IDLE\n• print() and input() commands\n• Variables — storing information\n• if / else — making decisions\n• Loops — for and while\n• Drawing shapes with the turtle module\n\n🐍 Project: Build a quiz game that asks 5 questions and gives a score!", isPreview: false, order: 4 },
      { title: "Session 9+: AI Tools for Kids & Personal Projects", content: "AI is the future — let's learn it early!\n• What is Artificial Intelligence? (Kid-friendly explanation)\n• Using ChatGPT to help with homework and creative writing\n• Canva AI for making posters and art\n• Building your own simple chatbot with Python\n• Planning and building a personal project of your choice\n\n🚀 Graduation project: Build something YOU are proud of and present it to the group!", isPreview: false, order: 5 },
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
    lessons: [
      { title: "Welcome to Onsite Training — Your Student Hub", content: "Welcome to BreedSkool Onsite Training! 🎉\n\nThis is your online hub for the physical classroom program at:\n📍 TootoOba Estate, Ijede, Ikorodu, Lagos\n\nHow to use this hub:\n• Check here daily for class announcements, schedule updates, and homework\n• Use the Group Chat to connect with your classmates between sessions\n• Use 'Message Tutor' privately if you have personal questions\n• Resources and materials from class will be posted here after each session\n\n📅 Your first class is on the date your tutor will confirm via WhatsApp. Please arrive 10 minutes early!", isPreview: true, order: 1 },
      { title: "Week 1 — Environment Setup & Foundations", content: "In your first week at the campus, we cover:\n• Setting up your laptop (or using the lab computers)\n• Installing VS Code, Node.js, Git, and Chrome DevTools\n• Introduction to the command line / terminal\n• Your first HTML page\n• Git basics — saving your work online (GitHub setup)\n\n📝 Homework: Complete the HTML bio page exercise from class and push it to GitHub.", isPreview: false, order: 2 },
      { title: "Week 2–3 — Core Skills Intensive", content: "Classroom sessions this week focus on:\n• CSS layouts with Flexbox and Grid\n• JavaScript fundamentals\n• Debugging techniques\n• Peer code reviews — learn from each other\n• Mini hackathon: build a landing page in 2 hours!\n\n📝 Weekly project: Submit your mini landing page to the group chat for feedback from the tutor.", isPreview: false, order: 3 },
      { title: "Week 4–5 — Group Projects & Collaboration", content: "You'll be assigned to project teams this week!\n• Teams of 2–3 students build a real web application together\n• Daily standups in class (just like a real tech company)\n• Tutor mentorship sessions (30 mins per team)\n• Version control workflow (branches, pull requests, reviews)\n\n🤝 Use the group chat to coordinate with your teammates outside class hours!", isPreview: false, order: 4 },
      { title: "Week 6–8 — Portfolio Building & Graduation", content: "Final stretch — get job/client ready:\n• Build your personal portfolio website\n• Write your developer bio and case studies\n• LinkedIn and GitHub profile optimization\n• Job search / freelancing strategies for Nigerian developers\n• Graduation ceremony — present your project to the class!\n\n🎓 After graduation you receive your BreedSkool certificate and lifelong access to this course hub and the alumni group chat.", isPreview: false, order: 5 },
    ],
  },
];

export async function seedBreedskoolCourses(adminId: string): Promise<{ created: number; linked: number }> {
  let created = 0;
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

      // Seed lessons for this course (idempotent — skip if already exist)
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
        // Update the denormalized lessons_count on the course record
        await db.execute(
          sql`UPDATE courses SET lessons_count = ${course.lessons.length} WHERE id = ${courseId}`
        );
      }

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
