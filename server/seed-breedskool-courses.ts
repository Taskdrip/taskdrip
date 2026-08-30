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

  // ── FREE COMMUNITY FOUNDATIONS ─────────────────────────────────────────────
  {
    courseKey: "free_foundations",
    title: "BreedSkool Foundations — Learn, Build & Earn",
    description: "A practical, beginner-friendly digital opportunity course covering AI, web development, content, social media, marketing, blockchain safety, entrepreneurship, freelancing, remote work, and emerging technology. Every module ends with a small project learners can practise with a phone or computer and share with the BreedSkool community.",
    shortDescription: "A free, practical foundation across the digital skills young Africans need to learn, build and earn.",
    category: "general",
    level: "beginner",
    duration: "Self-paced",
    price: "0.00",
    tags: ["breedskool_free_foundations", "free", "foundations", "digital skills", "breedskool"],
    whatYouLearn: ["Digital skills, online safety and productive workflows", "AI tools, prompting and responsible use", "Web development and no-code project basics", "Content creation, social media management and digital marketing", "Blockchain, crypto and airdrop safety", "Entrepreneurship, freelancing and remote work", "Emerging technologies, portfolio building and next steps"],
    requirements: ["A smartphone or laptop", "A willingness to practise", "No previous experience required"],
    syllabus: [
      { week: "Module 1", topic: "Digital confidence, devices and online safety" },
      { week: "Module 2", topic: "AI tools, prompting and responsible use" },
      { week: "Module 3", topic: "Web development and digital product basics" },
      { week: "Module 4", topic: "Content creation and social media management" },
      { week: "Module 5", topic: "Digital marketing and audience growth" },
      { week: "Module 6", topic: "Blockchain, crypto and airdrop safety" },
      { week: "Module 7", topic: "Entrepreneurship, freelancing and remote work" },
      { week: "Module 8", topic: "Portfolio, emerging tech and a 30-day launch plan" },
    ],
    lessons: [
      { title: "Welcome to BreedSkool — Start Here", content: "Welcome to BreedSkool Foundations, a free starting point for learning, building and finding opportunity.\n\nWHAT YOU WILL DO\n• Choose one digital direction to explore\n• Build small proof-of-work projects\n• Learn how to ask for feedback and improve\n• Meet other learners in the in-app community\n\nSETUP CHECKLIST\n1. Create a folder called BreedSkool and subfolders for Notes, Projects and Portfolio.\n2. Save your login details safely; never share a password in the community.\n3. Introduce yourself in the community with your name, location, current device and one thing you hope to build.\n\nPractice: write a one-sentence learning goal using this format: “In the next 30 days I will learn ___ and build ___ for ___.”", isPreview: true, order: 1 },
      { title: "Digital Skills, Productivity & Online Safety", content: "Digital confidence starts with everyday habits. Learn how to search effectively, download and name files, use cloud storage, communicate clearly, and keep your accounts safe.\n\nKEY IDEAS\n• Use a unique passphrase and two-step verification where available.\n• Check the sender, domain and urgency of unexpected messages.\n• Never send an OTP, recovery code, wallet seed phrase or password to anyone.\n• Keep personal and public information separate.\n• Back up important work in two places.\n\nPractice: make a “safe or suspicious?” checklist for three messages you receive, then organise your BreedSkool folder and create a backup.", isPreview: false, order: 2 },
      { title: "AI Tools & Better Prompts", content: "AI can help you research, learn, plan, write and prototype, but you remain responsible for the result.\n\nPROMPT FORMULA\nRole + task + context + constraints + output format. Example: “Act as a patient web tutor. Explain HTML forms to a beginner using a market-stall analogy, then give me three practice questions.”\n\nWORKFLOW\n1. Ask for a first draft.\n2. Check facts, bias, copyright and private information.\n3. Improve the prompt with your feedback.\n4. Add your own judgement and voice.\n\nPractice: ask an AI tool for three local problems that technology could help solve. Choose one, verify the idea with a person you know, and write a five-line solution brief.", isPreview: false, order: 3 },
      { title: "Web Development & Digital Product Basics", content: "Web development turns an idea into something people can use. Learn the roles of HTML (structure), CSS (presentation) and JavaScript (behaviour), plus how no-code and AI-assisted tools can help you prototype faster.\n\nBUILDING BLOCKS\n• A page needs a clear audience, purpose and call to action.\n• Good layouts work on phones first.\n• Forms should ask only for information they genuinely need.\n• Test links, spelling, contrast and loading on a real phone.\n\nPractice: create a one-page profile or community noticeboard using HTML/CSS, a no-code builder or an AI coding tool. Include a heading, short bio, one image, three useful links and a contact action.", isPreview: false, order: 4 },
      { title: "Content Creation: Ideas, Storytelling & Editing", content: "Content creation is the skill of turning an idea into a useful, watchable or shareable story.\n\nCONTENT LOOP\nAudience problem → strong hook → one clear message → proof/example → call to action.\n\nExplore short video, graphics, writing, audio and mobile editing. Use your own photos, licensed assets or clearly credited sources. Plan a shot list before recording and remove unnecessary pauses when editing.\n\nPractice: create a 30–60 second educational video or a five-slide carousel teaching one useful skill. Write the caption, add accessible text, and ask one community member for feedback.", isPreview: false, order: 5 },
      { title: "Social Media Management & Community", content: "Managing social channels means serving an audience consistently, not simply posting frequently.\n\nLEARN TO\n• Choose one audience and one primary platform.\n• Build three content pillars: teach, show the process, and invite conversation.\n• Use a simple weekly calendar with post goal, format, caption and status.\n• Reply respectfully, escalate safety issues and never buy fake engagement.\n• Read saves, replies, watch time and profile visits instead of chasing vanity numbers.\n\nPractice: plan seven posts for a local business, creator or cause. Include two educational posts, two proof posts, one story, one community question and one offer.", isPreview: false, order: 6 },
      { title: "Digital Marketing & Finding an Audience", content: "Digital marketing connects a useful offer with the people who need it. Learn the customer journey: awareness, interest, trust, action and retention.\n\nTOOLS\n• Define a specific audience and problem.\n• Write a simple value proposition: “I help ___ achieve ___ without ___.”\n• Use search-friendly words in titles and descriptions.\n• Build a basic landing page or WhatsApp enquiry flow.\n• Test one change at a time and track enquiries, not just likes.\n\nPractice: create a one-page campaign for a real or imaginary local service. Write the audience, promise, three content ideas, call to action and two measures of success.", isPreview: false, order: 7 },
      { title: "Blockchain, Crypto & Airdrop Safety", content: "Blockchain is a shared record system used for digital assets and applications. Crypto can be useful, but it is also volatile and full of scams. This lesson is education, not financial advice.\n\nUNDERSTAND\n• Wallet addresses are public; seed phrases and private keys are secret.\n• A token’s price, utility and legitimacy are different questions.\n• Airdrops may reward genuine participation, but fake links often ask for approvals or wallet access.\n• No legitimate support person needs your seed phrase or asks you to send funds to “unlock” a reward.\n• Use official project channels, verify domains character by character, and test with a small amount only when you understand the risk.\n\nPractice: write a scam-check procedure with five checks. Do not connect a wallet or send money for this exercise.", isPreview: false, order: 8 },
      { title: "Entrepreneurship: From Problem to Small Venture", content: "Entrepreneurship begins with a problem worth solving, not a logo. Learn to observe a need, talk to potential users, define a small offer and test demand before spending heavily.\n\nONE-PAGE PLAN\nProblem → audience → promise → solution → delivery method → price or funding → next experiment.\n\nConsider local services, digital products, creator businesses and technology-enabled community solutions. Start narrow, deliver well and document what you learn.\n\nPractice: interview two people about a problem they face. Turn the answers into a one-page venture brief and identify the cheapest experiment you can run this week.", isPreview: false, order: 9 },
      { title: "Freelancing & Remote Work Fundamentals", content: "Freelancing is a professional service, not a shortcut. Learn how to choose a service, show evidence, write a clear proposal, set boundaries, communicate across time zones and deliver on time.\n\nA GOOD PROFILE SHOWS\n• Who you help and what outcome you create.\n• Three proof items, even if they are practice projects.\n• Your process, timeline, inclusions and revision policy.\n• A safe payment and communication process; avoid jobs that demand fees, credentials or unpaid sensitive work.\n\nPractice: create a freelancer profile for one service, write a proposal for a fictional brief, and make a delivery checklist with milestones.", isPreview: false, order: 10 },
      { title: "Remote Collaboration, Client Care & Digital Workflows", content: "Reliable remote workers make progress visible. Practise writing concise updates, recording decisions, naming files, using task boards and requesting feedback early.\n\nCLIENT UPDATE TEMPLATE\nDone: ___\nNext: ___\nBlocked by: ___\nDecision needed by: ___\n\nLearn the difference between urgent and important work, how to estimate a task, and why a short written brief prevents rework. Protect client data and ask permission before sharing work publicly.\n\nPractice: take your project from lesson 4, create a three-step task board, write a client brief and send a sample progress update.", isPreview: false, order: 11 },
      { title: "Emerging Technologies & Choosing Your Direction", content: "Technology changes quickly. Explore responsible uses of cloud tools, automation, data, cybersecurity, extended reality, robotics and AI agents without feeling pressure to master everything at once.\n\nA SMART LEARNING CHOICE\n• Pick one direction that matches your curiosity and the problems around you.\n• Learn the fundamentals before chasing trends.\n• Follow trusted documentation and communities.\n• Build a small project every time you learn a concept.\n• Consider access, privacy, inclusion and environmental impact.\n\nPractice: compare two emerging technologies in a one-page “what it is / who it helps / risks / first project” note, then choose one to explore next.", isPreview: false, order: 12 },
      { title: "Personal Brand, Portfolio & Proof of Work", content: "Your portfolio helps another person understand what you can do. It can be a simple web page, document or organised folder.\n\nEACH CASE STUDY SHOULD INCLUDE\nContext: what was the challenge?\nRole: what did you do?\nProcess: what decisions did you make?\nResult: what changed or what did you learn?\nNext: what would you improve?\n\nUse a clear bio, professional contact method and consistent name. Never claim a client result you cannot prove.\n\nPractice: turn one course project into a case study with an image, a short explanation and a link or sample. Share it in the in-app community for feedback.", isPreview: false, order: 13 },
      { title: "Your 30-Day Build, Share & Opportunity Plan", content: "Bring the course together with a realistic 30-day plan.\n\nWEEK 1: Choose one direction, finish your safety setup and study three times.\nWEEK 2: Build version one of a small project and ask for feedback.\nWEEK 3: Improve the project, publish your case study and practise your offer.\nWEEK 4: Contact three safe opportunities, mentors or collaborators and review your results.\n\nTRACK: hours practised, project milestones, feedback received, applications or conversations, and the next skill to learn. Join the in-app community and Telegram for accountability, but keep your personal and wallet information private.\n\nFinal practice: post your 30-day plan, project link or screenshots, and one specific question. Celebrate finishing — then choose a next BreedSkool course or a real-world project.", isPreview: false, order: 14 },
    ],
  },

  // ── FLAGSHIP BESTSELLER ────────────────────────────────────────────────────
  {
    courseKey: "saas_masterclass",
    title: "Full Stack SaaS Web App Development & Monetization Masterclass",
    description: "The most complete course on building, launching, and monetizing full stack SaaS web applications. Master AI-agent development, GitHub version control, cloud deployment, in-app marketing systems, SEO, Google Analytics, paid growth, subscription & product monetization, and social media channel monetization — from zero to paying customers in 12 weeks. Taught by founders who've built products generating real revenue. This is not theory — every module ships a real feature or revenue stream.",
    shortDescription: "Build, launch, and monetize a full stack SaaS app from scratch — AI agents, GitHub, cloud deployment, SEO, growth, and $0-to-MRR in 12 weeks.",
    category: "development",
    level: "intermediate",
    duration: "12 Weeks",
    price: "290.00",
    tags: ["breedskool_saas_masterclass", "saas", "full stack", "monetization", "ai agents", "github", "deployment", "seo", "analytics", "breedskool", "bestseller"],
    whatYouLearn: [
      "Build a production-ready SaaS app with React, Node.js & PostgreSQL using AI agents",
      "Master GitHub & CI/CD workflows used by professional engineering teams",
      "Deploy to cloud servers (Railway, Vercel, VPS) with zero downtime",
      "Build in-app email sequences, push notifications & referral systems",
      "Set up Google Search Console & rank on page 1 for target keywords",
      "Configure Google Analytics 4 — funnels, cohorts & churn tracking",
      "Attract your ideal target audience with organic growth systems",
      "Implement Stripe subscriptions, one-time products & service upsells",
      "Monetize YouTube, TikTok, Instagram & X alongside your SaaS",
      "Build a personal brand that drives 40%+ of your SaaS signups",
      "Launch with pre-orders and get paying customers before you finish building",
      "Scale MRR to $5,000+ and understand your exit strategy",
    ],
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
      {
        title: "Welcome to the Masterclass — Your Roadmap to $5K MRR",
        content: "Welcome! This is the course that turns ideas into income-generating SaaS businesses.\n\n🎯 What you'll build:\nA fully functional, deployed, monetized SaaS web application — with real paying users — by Week 12.\n\n📦 What's included:\n• 12 weeks of structured modules\n• Group community chat with founders from 30+ countries\n• Private tutor sessions\n• Access to all templates, code repositories, and tools used in lessons\n\n🔐 Important: Course content unlocks progressively after payment is confirmed and access is granted by your instructor.\n\n📌 Action for today:\n1. Introduce yourself in the Group Chat (country, idea, goal)\n2. Complete the Idea Validation Worksheet (pinned in resources)\n3. Book your Week 1 orientation call\n\nYou are now part of a global cohort of builders. Let's ship.",
        isPreview: true,
        order: 1,
      },
      {
        title: "Week 1 — SaaS Idea Validation & Niche Selection",
        content: "Before writing one line of code, you need to validate that people will pay for your idea.\n\n✅ This week you'll learn:\n• The $0-to-validation framework (interviews, landing page, waitlist)\n• How to identify a painful problem people pay to solve\n• Niche vs. horizontal SaaS — which to build first\n• Competitor analysis using SEMrush, Ahrefs free tools & Reddit\n• Pricing psychology — why $49/month > $1/day in SaaS\n• How to get your first 10 LOIs (Letters of Intent) before building\n\n🛠 Tools used: Notion, Typeform, Carrd, Google Trends, Reddit, Twitter/X\n\n📝 Assignment: Post your validated idea + 3 paying prospect names in the group chat by end of week.",
        isPreview: false,
        order: 2,
      },
      {
        title: "Week 2 — AI-Agent Development with Replit, Cursor & v0",
        content: "This module changes how you build forever. AI agents let a single founder build what previously needed a team of 5.\n\n✅ What you'll master:\n• Setting up Cursor with Claude Sonnet as your pair programmer\n• Replit AI — spin up a full stack app in 20 minutes\n• v0 by Vercel — generate production-grade React UI from prompts\n• Prompt engineering for code: specificity, context, iteration\n• GitHub Copilot for autocompletion while you build\n• When to trust AI output and when to review carefully\n• Debugging AI-generated code (the critical skill most miss)\n\n🛠 Stack: Cursor IDE, Replit, v0.dev, GitHub Copilot\n\n🏗 Build: Your SaaS MVP landing page + authentication system using AI agents.\n\n📝 Assignment: Share your Replit deployment link in the group chat.",
        isPreview: false,
        order: 3,
      },
      {
        title: "Week 3 — Full Stack Architecture (React + Node.js + PostgreSQL)",
        content: "Now we build the core of your SaaS — the stack that scales from 10 to 10,000 users without rewriting.\n\n✅ Architecture deep-dive:\n• React 18 + TypeScript — component architecture, hooks, state\n• Node.js + Express — REST API design, authentication middleware\n• PostgreSQL + Drizzle ORM — schema design for SaaS (users, subscriptions, billing)\n• File uploads, image storage, and CDN integration\n• API rate limiting, input validation, and security basics\n• Environment variables and secrets management\n• Error handling — never let your SaaS fail silently\n\n🗄 Database patterns covered:\n• Multi-tenant schema design\n• Soft deletes & audit trails\n• Indexing for performance\n\n📝 Assignment: Deploy your first API endpoint with authentication to production.",
        isPreview: false,
        order: 4,
      },
      {
        title: "Week 4 — GitHub & Version Control for SaaS Founders",
        content: "Professional version control is what separates hobbyist projects from real products.\n\n✅ GitHub mastery:\n• Git fundamentals — commit, branch, merge, rebase\n• Feature branch workflow — how teams ship without breaking production\n• Pull Requests & code review best practices\n• GitHub Actions — automate tests & deployment on every push\n• Protecting main branch — no more accidental deployments\n• Semantic versioning (v1.0.0, v1.1.0) for SaaS products\n• Open source your marketing: use GitHub as social proof\n• Monorepo vs. multi-repo — which is right for your SaaS\n\n🤖 CI/CD Pipeline you'll build:\nPush to GitHub → run tests → deploy to Railway in under 3 minutes.\n\n📝 Assignment: Set up your GitHub Actions workflow and show it deploying successfully.",
        isPreview: false,
        order: 5,
      },
      {
        title: "Week 5 — Cloud Deployment (Railway, Vercel, VPS)",
        content: "Your app isn't a business until it's deployed on a domain you own.\n\n✅ Deployment options compared:\n• Vercel — best for frontend-heavy SaaS (free tier, CDN, analytics)\n• Railway — best for full stack Node.js apps with databases\n• Render — budget-friendly with free PostgreSQL\n• DigitalOcean / Hetzner VPS — when you need full control\n• Coolify — self-hosted Heroku replacement\n\n✅ What you'll implement:\n• Custom domain setup with SSL (HTTPS) on all platforms\n• Environment-specific configs (dev, staging, production)\n• Database migrations in production (zero downtime)\n• Server monitoring — uptime alerts, error tracking with Sentry\n• Scaling: when to upgrade, how to handle traffic spikes\n• Backup strategy — never lose your user data\n\n📝 Assignment: Your SaaS live on a custom domain with SSL and automated deployments.",
        isPreview: false,
        order: 6,
      },
      {
        title: "Week 6 — In-App Marketing Systems (Email, Push & Referrals)",
        content: "The best SaaS products have marketing systems built into the product itself — not bolted on after.\n\n✅ What you'll build:\n• Transactional email sequences (onboarding, activation, win-back)\n• Automated drip campaigns — 7-day, 14-day, 30-day\n• In-app push notification system (web push via VAPID)\n• Referral program — viral loop that grows your user base for free\n• In-app announcements & feature release banners\n• NPS surveys at the right moment in the user journey\n• Intercom-style live chat (free with Crisp or Tawk.to)\n\n🛠 Tools: SendGrid / Resend, web-push, custom referral logic\n\n📊 The numbers:\nStudents who implement the referral loop average 2.3 new users per existing user — a viral coefficient > 1 is free growth forever.\n\n📝 Assignment: Send your first automated email sequence to 5 test accounts.",
        isPreview: false,
        order: 7,
      },
      {
        title: "Week 7 — SEO & Google Search Console Mastery",
        content: "SEO is the highest-ROI marketing channel for SaaS. Most competitors do it wrong — you won't.\n\n✅ Complete SEO playbook:\n• Technical SEO: sitemap, robots.txt, canonical tags, Core Web Vitals\n• Google Search Console setup — verified in 10 minutes\n• Keyword research: finding the 'buying intent' keywords competitors miss\n• On-page SEO: title tags, meta descriptions, H1–H6 structure\n• Content-led SEO: blog strategy that ranks and converts\n• Internal linking architecture for SaaS landing pages\n• Schema markup — FAQ, Article, SoftwareApplication\n• Backlink strategy: guest posts, directories, HARO\n• Local SEO if your SaaS targets a specific geography\n\n📈 Real outcome:\nStudents in this cohort have ranked on page 1 of Google for competitive keywords within 6–8 weeks by following this exact framework.\n\n📝 Assignment: Submit your first 3 optimized blog posts and show Google indexing them.",
        isPreview: false,
        order: 8,
      },
      {
        title: "Week 8 — Analytics: GA4, Mixpanel & Conversion Funnels",
        content: "If you can't measure it, you can't improve it. This week you learn to make data-driven decisions like a growth team.\n\n✅ Analytics stack you'll set up:\n• Google Analytics 4 — events, conversions, audiences\n• GA4 Funnel Exploration — see exactly where users drop off\n• Cohort analysis — retention curves, D1/D7/D30 retention\n• Google Tag Manager — deploy tracking without touching code\n• Mixpanel (free tier) — event tracking for SaaS product metrics\n• Hotjar — heatmaps and session recordings\n• Custom dashboard: 5 KPIs every SaaS founder must track daily\n\n📊 The 5 metrics that predict SaaS success:\n1. Activation rate (goal: >40%)\n2. D7 retention (goal: >25%)\n3. MRR growth rate (goal: >15%/month)\n4. CAC payback period (goal: <6 months)\n5. NPS score (goal: >40)\n\n📝 Assignment: Share your GA4 funnel screenshot showing your signup-to-activation flow.",
        isPreview: false,
        order: 9,
      },
      {
        title: "Week 9 — User Acquisition: Organic Growth Systems",
        content: "This module covers how to attract your ideal target audience without spending money on ads.\n\n✅ Organic acquisition channels:\n• Content seeding — one piece of content → 8 platforms in 30 minutes\n• Reddit & niche communities — authentic presence that converts\n• Product Hunt launch strategy (week-by-week preparation guide)\n• Hacker News 'Show HN' — when and how to post for maximum impact\n• LinkedIn thought leadership for B2B SaaS\n• YouTube tutorial strategy — help content that attracts buyers\n• Discord & Slack community building around your product\n• Cold email for B2B outbound (templates that get replies)\n\n📌 The Content Flywheel:\n1 long-form article → 3 LinkedIn posts → 5 tweets → 2 YouTube Shorts → 1 newsletter issue\n\n📊 Real outcome from cohort data:\nStudents who implement the content flywheel average 890 new monthly visitors within 60 days — with $0 in ad spend.\n\n📝 Assignment: Launch your first content flywheel and report traffic results end of week.",
        isPreview: false,
        order: 10,
      },
      {
        title: "Week 10 — Monetization: Stripe Subscriptions, Products & Services",
        content: "This is where your SaaS becomes a business. We cover every revenue model you can implement.\n\n✅ Monetization stack:\n• Stripe setup — live mode, webhooks, testing\n• Subscription tiers — how to price Starter / Pro / Enterprise\n• Free trial vs. freemium — data on which converts better for your niche\n• One-time products in-app — templates, exports, data packs\n• Service upsells — 'Done for You' premium tier\n• Annual plan discounts — how to increase cash flow and LTV\n• Coupons & promotional codes — conversion triggers that work\n• Failed payment recovery — dunning sequences that save 30% of churned revenue\n• Revenue recognition & accounting basics for SaaS founders\n\n💳 Stripe integrations built in this module:\n• Checkout (hosted + embedded)\n• Customer Portal (self-serve billing)\n• Billing webhooks (subscription created/updated/canceled)\n\n📝 Assignment: First live Stripe payment from a real customer or test account.",
        isPreview: false,
        order: 11,
      },
      {
        title: "Week 11 — Social Media Monetization (YouTube, TikTok, Instagram & X)",
        content: "Your SaaS and your personal brand grow each other. This module shows you how to monetize every channel.\n\n✅ Channel-by-channel strategy:\n\n🎥 YouTube:\n• Tutorial content strategy for SaaS (show the product solving problems)\n• YouTube AdSense + channel memberships + Super Thanks\n• Merch shelf + digital product integration\n• SEO for YouTube — ranking how-to videos for your niche\n\n📱 TikTok:\n• TikTok Creator Fund + Series (paid gated content)\n• TikTok Shop for digital products\n• Viral hooks that showcase your SaaS in 15 seconds\n\n📸 Instagram:\n• Broadcast Channels for product updates & exclusive content\n• Instagram Subscriptions — $4.99/month from your followers\n• Reels + Story funnels that drive trial signups\n\n𝕏 Twitter/X:\n• X Premium subscription — convert followers to paid subscribers\n• Pinned link strategy for SaaS trial signups\n• Thread strategy that builds authority and drives organic signups\n\n📊 Cross-channel monetization target: 20–30% of MRR from social channels by Month 6.\n\n📝 Assignment: Post your first channel-native piece of content and track sign-up attribution.",
        isPreview: false,
        order: 12,
      },
      {
        title: "Week 12 — Scaling MRR, Fundraising & Exit Strategy",
        content: "Congratulations — you've built a real product with real users and real revenue. Now we think bigger.\n\n✅ Scaling systems:\n• Hiring your first contractor vs. employee (when and who)\n• Customer success at scale — automating support with AI\n• Affiliate program — let others sell your SaaS for commission\n• API & integrations marketplace — expanding your product's value\n• White-label & reseller programs for B2B\n\n💰 Fundraising (if you choose to raise):\n• Bootstrapping vs. VC — pros, cons, and the right choice for you\n• Pre-seed fundraising — what investors look for at $0 to $100K MRR\n• Revenue-based financing for SaaS (Clearco, Capchase)\n• Pitch deck for SaaS: 10 slides, what to include on each\n\n🏁 Exit strategy:\n• MicroAcquire / Acquire.com — sell your SaaS for 3–5x ARR\n• Strategic acquisition — how to position for a buyer from Day 1\n• Building enterprise value vs. lifestyle income — both are valid\n\n🎓 Graduation & Certificate:\nSubmit your final project (deployed SaaS with at least 1 paying customer) to receive your Masterclass certificate.\n\n📌 You're not just a student anymore. You're a founder.",
        isPreview: false,
        order: 13,
      },
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
        if (course.courseKey === "free_foundations") {
          await db.update(courses)
            .set({
              title: course.title,
              description: course.description,
              shortDescription: course.shortDescription,
              isFree: true,
              isPublished: true,
              status: "published",
              duration: course.duration,
              whatYouLearn: course.whatYouLearn,
              requirements: course.requirements,
              syllabus: course.syllabus as any,
            } as any)
            .where(eq(courses.id, courseId));
        }
      } else {
        const [newCourse] = await db.insert(courses).values({
          title: course.title,
          description: course.description,
          shortDescription: course.shortDescription,
          category: course.category,
          instructorId: adminId,
          price: course.price,
          isFree: course.courseKey === "free_foundations",
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
      const existingLessons = await db.select({ id: courseLessons.id, order: courseLessons.order })
        .from(courseLessons)
        .where(eq(courseLessons.courseId, courseId))
        .orderBy(courseLessons.order);

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
      } else if (course.courseKey === "free_foundations" && course.lessons?.length) {
        // The free foundations course is part of the public campaign promise.
        // Keep its seeded curriculum in sync while leaving admin-authored
        // lessons for every other BreedSkool course untouched.
        for (const lesson of course.lessons) {
          const existingLesson = existingLessons.find((item) => item.order === lesson.order);
          if (existingLesson) {
            await db.update(courseLessons)
              .set({
                title: lesson.title,
                content: lesson.content,
                isPreview: lesson.isPreview,
                order: lesson.order,
              } as any)
              .where(eq(courseLessons.id, existingLesson.id));
          } else {
            await db.insert(courseLessons).values({
              courseId,
              title: lesson.title,
              content: lesson.content,
              isPreview: lesson.isPreview,
              order: lesson.order,
            } as any);
          }
        }
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
