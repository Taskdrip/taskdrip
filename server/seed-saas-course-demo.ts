/**
 * Seed demo students, enrollments, and reviews for the SaaS Masterclass course.
 * Runs idempotently — safe to call on every startup.
 */
import { db } from "./db";
import { users, courseEnrollments, courseReviews, courses, breedskoolCoursePricing } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ── Demo students from around the world ────────────────────────────────────
const DEMO_STUDENTS = [
  { firstName: "Ethan",    lastName: "Williams",   email: "ethan.w.saas@demo.td",    country: "United States",   avatar: "https://i.pravatar.cc/150?img=11" },
  { firstName: "Amara",    lastName: "Okafor",     email: "amara.o.saas@demo.td",    country: "Nigeria",         avatar: "https://i.pravatar.cc/150?img=47" },
  { firstName: "Liam",     lastName: "Thompson",   email: "liam.t.saas@demo.td",     country: "United Kingdom",  avatar: "https://i.pravatar.cc/150?img=13" },
  { firstName: "Priya",    lastName: "Sharma",     email: "priya.s.saas@demo.td",    country: "India",           avatar: "https://i.pravatar.cc/150?img=49" },
  { firstName: "Carlos",   lastName: "Mendoza",    email: "carlos.m.saas@demo.td",   country: "Mexico",          avatar: "https://i.pravatar.cc/150?img=15" },
  { firstName: "Aisha",    lastName: "Rahman",     email: "aisha.r.saas@demo.td",    country: "Bangladesh",      avatar: "https://i.pravatar.cc/150?img=44" },
  { firstName: "Noah",     lastName: "Anderson",   email: "noah.a.saas@demo.td",     country: "Canada",          avatar: "https://i.pravatar.cc/150?img=17" },
  { firstName: "Fatima",   lastName: "Al-Zahra",   email: "fatima.z.saas@demo.td",   country: "UAE",             avatar: "https://i.pravatar.cc/150?img=46" },
  { firstName: "Lucas",    lastName: "Oliveira",   email: "lucas.o.saas@demo.td",    country: "Brazil",          avatar: "https://i.pravatar.cc/150?img=19" },
  { firstName: "Yuki",     lastName: "Tanaka",     email: "yuki.t.saas@demo.td",     country: "Japan",           avatar: "https://i.pravatar.cc/150?img=42" },
  { firstName: "James",    lastName: "Kofi",       email: "james.k.saas@demo.td",    country: "Ghana",           avatar: "https://i.pravatar.cc/150?img=21" },
  { firstName: "Sofia",    lastName: "Garcia",     email: "sofia.g.saas@demo.td",    country: "Spain",           avatar: "https://i.pravatar.cc/150?img=45" },
  { firstName: "Mohammed", lastName: "Al-Rashid",  email: "moh.ar.saas@demo.td",     country: "Saudi Arabia",    avatar: "https://i.pravatar.cc/150?img=23" },
  { firstName: "Chloe",    lastName: "Dupont",     email: "chloe.d.saas@demo.td",    country: "France",          avatar: "https://i.pravatar.cc/150?img=43" },
  { firstName: "David",    lastName: "Kim",        email: "david.k.saas@demo.td",    country: "South Korea",     avatar: "https://i.pravatar.cc/150?img=25" },
  { firstName: "Zara",     lastName: "Nkosi",      email: "zara.n.saas@demo.td",     country: "South Africa",    avatar: "https://i.pravatar.cc/150?img=41" },
  { firstName: "Alex",     lastName: "Petrov",     email: "alex.p.saas@demo.td",     country: "Russia",          avatar: "https://i.pravatar.cc/150?img=27" },
  { firstName: "Mei",      lastName: "Chen",       email: "mei.c.saas@demo.td",      country: "China",           avatar: "https://i.pravatar.cc/150?img=40" },
  { firstName: "Ibrahim",  lastName: "Musa",       email: "ibrahim.m.saas@demo.td",  country: "Kenya",           avatar: "https://i.pravatar.cc/150?img=29" },
  { firstName: "Emma",     lastName: "Johansson",  email: "emma.j.saas@demo.td",     country: "Sweden",          avatar: "https://i.pravatar.cc/150?img=39" },
  { firstName: "Raj",      lastName: "Patel",      email: "raj.p.saas@demo.td",      country: "India",           avatar: "https://i.pravatar.cc/150?img=31" },
  { firstName: "Layla",    lastName: "Hassan",     email: "layla.h.saas@demo.td",    country: "Egypt",           avatar: "https://i.pravatar.cc/150?img=38" },
  { firstName: "Tyler",    lastName: "Jackson",    email: "tyler.j.saas@demo.td",    country: "Australia",       avatar: "https://i.pravatar.cc/150?img=33" },
  { firstName: "Valeria",  lastName: "Rossi",      email: "valeria.r.saas@demo.td",  country: "Italy",           avatar: "https://i.pravatar.cc/150?img=37" },
  { firstName: "Kwame",    lastName: "Asante",     email: "kwame.a.saas@demo.td",    country: "Ghana",           avatar: "https://i.pravatar.cc/150?img=35" },
  { firstName: "Natalia",  lastName: "Silva",      email: "natalia.s.saas@demo.td",  country: "Colombia",        avatar: "https://i.pravatar.cc/150?img=36" },
  { firstName: "Mikael",   lastName: "Berg",       email: "mikael.b.saas@demo.td",   country: "Norway",          avatar: "https://i.pravatar.cc/150?img=52" },
  { firstName: "Adaeze",   lastName: "Eze",        email: "adaeze.e.saas@demo.td",   country: "Nigeria",         avatar: "https://i.pravatar.cc/150?img=54" },
  { firstName: "Hamid",    lastName: "Karimi",     email: "hamid.k.saas@demo.td",    country: "Iran",            avatar: "https://i.pravatar.cc/150?img=56" },
  { firstName: "Grace",    lastName: "Wanjiru",    email: "grace.w.saas@demo.td",    country: "Kenya",           avatar: "https://i.pravatar.cc/150?img=58" },
  { firstName: "Omar",     lastName: "Diallo",     email: "omar.d.saas@demo.td",     country: "Senegal",         avatar: "https://i.pravatar.cc/150?img=60" },
  { firstName: "Hannah",   lastName: "Muller",     email: "hannah.mu.saas@demo.td",  country: "Germany",         avatar: "https://i.pravatar.cc/150?img=62" },
];

// ── Reviews (realistic 4 & 5 star) ─────────────────────────────────────────
const DEMO_REVIEWS = [
  { email: "ethan.w.saas@demo.td",   rating: 5, comment: "This is hands-down the most comprehensive SaaS course I've ever taken. Within 3 weeks of finishing I had my first paying customer at $49/month. The AI-agent building module alone is worth $290." },
  { email: "amara.o.saas@demo.td",   rating: 5, comment: "As someone with zero coding background, I was nervous. But the step-by-step approach made everything click. I built and deployed my first SaaS in 10 weeks. Already made $580 in pre-sales. Worth every penny!" },
  { email: "liam.t.saas@demo.td",    rating: 5, comment: "The deployment module using Railway saved me weeks of headache. The GitHub workflow section is exactly what enterprise teams use. I got a $4,000/month freelance contract from a client who saw my portfolio." },
  { email: "priya.s.saas@demo.td",   rating: 4, comment: "Excellent content on SEO and Google Search Console. My SaaS app went from 0 to 1,200 monthly organic visitors in 8 weeks by following the strategies here. Would love more on paid ads but still 5 stars." },
  { email: "carlos.m.saas@demo.td",  rating: 5, comment: "The subscription monetization section is pure gold. I implemented Stripe exactly as shown and had my first subscriber within 48 hours of launching. This course pays for itself 10x over." },
  { email: "aisha.r.saas@demo.td",   rating: 5, comment: "The section on monetizing social media channels alongside your SaaS changed my whole strategy. My TikTok now drives 40% of my trial signups. Incredible value. Highly recommend to anyone serious about building online." },
  { email: "noah.a.saas@demo.td",    rating: 5, comment: "I've bought 12 online courses in the past 2 years. This is the only one where I actually shipped a real product. The AI-agent coding module with Cursor and Replit is unlike anything else online." },
  { email: "fatima.z.saas@demo.td",  rating: 4, comment: "Very thorough on the technical side. The in-app marketing systems module (email sequences + push notifications) helped me 3x my free-to-paid conversion rate. Instructor explains everything clearly with no fluff." },
  { email: "lucas.o.saas@demo.td",   rating: 5, comment: "From Brazil — finding a course this good in English that covers everything from idea validation to exit strategy is rare. The community support is also amazing. My SaaS made R$3,200 in its first month." },
  { email: "yuki.t.saas@demo.td",    rating: 5, comment: "The Google Analytics 4 setup walkthrough is incredibly detailed. I now track user cohorts, conversion funnels, and churn — all data I use to make product decisions. This course teaches you to think like a proper founder." },
  { email: "james.k.saas@demo.td",   rating: 5, comment: "Best investment I made this year. Launched my SaaS targeting SMEs in Ghana and West Africa. Already at $1,100 MRR in 2 months following the target audience acquisition strategies from Module 9." },
  { email: "sofia.g.saas@demo.td",   rating: 4, comment: "The version control with GitHub module finally made Git click for me after years of avoiding it. Now I deploy confidently using CI/CD. The course is dense but every module delivers real value." },
  { email: "moh.ar.saas@demo.td",    rating: 5, comment: "I was skeptical about an online course delivering this much. But the cloud deployment section (Railway + Vercel) is so well-structured that I shipped my first app in a weekend. Now I have 47 paying users." },
  { email: "chloe.d.saas@demo.td",   rating: 5, comment: "The referral system and in-app marketing modules gave me frameworks I'd normally pay a consultant thousands for. My user acquisition cost dropped by 60% after applying these techniques." },
  { email: "david.k.saas@demo.td",   rating: 5, comment: "From Korea — the AI agent development section using Replit and Cursor is legitimately next-level. I built a B2B SaaS tool in 3 weeks that I'm now selling at $99/month. This course is a cheat code." },
  { email: "zara.n.saas@demo.td",    rating: 4, comment: "Solid course. The social media monetization section is especially good for creators who want to build SaaS as a product-led business. Growing my X account alongside my app has been a game changer for organic growth." },
  { email: "alex.p.saas@demo.td",    rating: 5, comment: "The exit strategy module in Week 12 was eye-opening. I never thought about building to sell from day one. Now every decision I make is positioning the product for acquisition. Genuinely changed my mindset." },
  { email: "mei.c.saas@demo.td",     rating: 5, comment: "Module 10 on selling subscriptions, services AND products in-app is something no other course covers. I added a one-time digital product to my SaaS and made $2,300 in the first launch week." },
  { email: "ibrahim.m.saas@demo.td", rating: 5, comment: "The Search Console setup guide is so detailed — I ranked on page 1 of Google for 3 competitive keywords within 6 weeks by following the SEO module exactly. Organic traffic now converts at 8.4% to free trial." },
  { email: "emma.j.saas@demo.td",    rating: 4, comment: "The cloud server deployment section covers VPS, Railway, and Render with real comparisons. I went from shared hosting to a proper cloud setup without spending hours on YouTube. Saves so much time." },
  { email: "raj.p.saas@demo.td",     rating: 5, comment: "Top 3 best purchases I've made online. The user acquisition module shows exactly how to attract your target audience without spending on ads — content strategy, SEO, community building. My CAC is essentially $0." },
  { email: "layla.h.saas@demo.td",   rating: 5, comment: "I was building a SaaS as a side project for 8 months and going nowhere. After taking this course I restructured everything — idea validation, go-to-market, pricing — and had 15 paying customers within 5 weeks of relaunch." },
  { email: "tyler.j.saas@demo.td",   rating: 5, comment: "The in-app marketing systems (push notifications, drip email sequences, referrals) alone saved me from buying 4 separate tools. Everything is built into the app you build in the course. Incredible value." },
  { email: "valeria.r.saas@demo.td", rating: 4, comment: "Really solid course from technical setup to business strategy. The section on YouTube channel monetization alongside a SaaS product is something I wish I'd found 2 years ago. My channel now drives 25% of all new signups." },
  { email: "kwame.a.saas@demo.td",   rating: 5, comment: "Built for builders who want to actually make money. Not just theory — every module has real implementation. My SaaS is now at $3,400 MRR after 3 months. This course was the best $290 I've ever spent." },
  { email: "natalia.s.saas@demo.td", rating: 5, comment: "The Google Analytics 4 + Search Console combination module is incredible. I now see exactly where users drop off in my funnel and have improved my activation rate from 18% to 41% by fixing those exact points." },
  { email: "mikael.b.saas@demo.td",  rating: 5, comment: "Coming from a backend dev background I thought the business sections would bore me. They were the most valuable parts. The subscription pricing strategy module changed how I package and price my products completely." },
  { email: "adaeze.e.saas@demo.td",  rating: 5, comment: "As a woman in tech in Nigeria, seeing a course that covers both technical building AND monetization is refreshing. I launched my ed-tech SaaS targeting African students and have 230 subscribers at N4,999/month. The system works!" },
  { email: "hamid.k.saas@demo.td",   rating: 4, comment: "Very well structured course. The AI-agent development workflow is cutting-edge — using Cursor + GitHub Copilot together as shown here makes you 5x faster. The monetization strategies are immediately actionable." },
  { email: "grace.w.saas@demo.td",   rating: 5, comment: "I followed the exact organic user acquisition strategy in Module 9 and grew from 0 to 890 users in 60 days without spending a single dollar on ads. The content seeding system is genius." },
  { email: "omar.d.saas@demo.td",    rating: 5, comment: "The section on in-app product sales alongside subscriptions is brilliant. I sell my SaaS at $29/month but also upsell a one-time setup service for $199. Added $3,800 in revenue in the first quarter." },
  { email: "hannah.mu.saas@demo.td", rating: 5, comment: "Exceptional depth on every topic. The deployment pipeline section saved me days of DevOps research. I now ship updates to production in under 2 minutes using the GitHub Actions workflow from the course." },
];

// ── Payment dates spread across Sep 2025 – Jul 2026 ────────────────────────
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export async function seedSaasCourseDemo(): Promise<{ students: number; enrollments: number; reviews: number }> {
  let studentsCreated = 0;
  let enrollmentsCreated = 0;
  let reviewsCreated = 0;

  try {
    // Find the SaaS masterclass course via the pricing table link
    const [pricing] = await db
      .select({ linkedCourseId: breedskoolCoursePricing.linkedCourseId })
      .from(breedskoolCoursePricing)
      .where(eq(breedskoolCoursePricing.courseKey, "saas_masterclass"))
      .limit(1) as any[];

    const courseId = pricing?.linkedCourseId;
    if (!courseId) {
      console.log("[seed-saas-demo] SaaS Masterclass not linked yet — will retry next startup.");
      return { students: 0, enrollments: 0, reviews: 0 };
    }

    const passwordHash = await bcrypt.hash("DemoStudent@2024", 10);
    const purchaseStart = new Date("2025-09-01");
    const purchaseEnd   = new Date("2026-07-28");

    for (const student of DEMO_STUDENTS) {
      try {
        // Check if user exists
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, student.email))
          .limit(1);

        let userId: string;
        if (existing) {
          userId = existing.id;
        } else {
          const newId = crypto.randomUUID();
          const [newUser] = await db.insert(users).values({
            id: newId,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            password: passwordHash,
            userType: "user",
            profileImageUrl: student.avatar,
          } as any).returning({ id: users.id });
          userId = newUser.id;
          studentsCreated++;
        }

        // Check enrollment
        const [existingEnroll] = await db
          .select({ id: courseEnrollments.id })
          .from(courseEnrollments)
          .where(and(
            eq(courseEnrollments.courseId, courseId),
            eq(courseEnrollments.userId, userId),
          ))
          .limit(1);

        if (!existingEnroll) {
          const paidAt = randomDate(purchaseStart, purchaseEnd);
          await db.insert(courseEnrollments).values({
            courseId,
            userId,
            status: "active",
            isPaid: true,
            paymentMethod: "crypto_usdt",
            amount: "290.00",
            approvedAt: paidAt,
            createdAt: paidAt,
            updatedAt: paidAt,
          } as any);
          enrollmentsCreated++;
        }
      } catch (e: any) {
        console.error(`[seed-saas-demo] Error for student ${student.email}:`, e?.message);
      }
    }

    // Recalculate studentsCount
    const [countResult] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(courseEnrollments)
      .where(and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.isPaid, true),
        eq(courseEnrollments.status, "active"),
      ));
    await db.update(courses)
      .set({ studentsCount: countResult?.cnt || 0 })
      .where(eq(courses.id, courseId));

    // Seed reviews
    for (const rev of DEMO_REVIEWS) {
      try {
        const [userRow] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, rev.email))
          .limit(1);
        if (!userRow) continue;

        const [existingReview] = await db
          .select({ id: courseReviews.id })
          .from(courseReviews)
          .where(and(
            eq(courseReviews.courseId, courseId),
            eq(courseReviews.userId, userRow.id),
          ))
          .limit(1);

        if (!existingReview) {
          const reviewDate = randomDate(new Date("2025-09-15"), new Date("2026-07-28"));
          await db.insert(courseReviews).values({
            courseId,
            userId: userRow.id,
            rating: rev.rating,
            comment: rev.comment,
            createdAt: reviewDate,
          } as any);
          reviewsCreated++;
        }
      } catch (e: any) {
        console.error(`[seed-saas-demo] Error for review ${rev.email}:`, e?.message);
      }
    }

    // Recalculate averageRating & reviewsCount
    const allReviews = await db
      .select({ rating: courseReviews.rating })
      .from(courseReviews)
      .where(eq(courseReviews.courseId, courseId));
    if (allReviews.length > 0) {
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      await db.update(courses).set({
        reviewsCount: allReviews.length,
        averageRating: avg.toFixed(2),
        isFeatured: true,
      }).where(eq(courses.id, courseId));
    } else {
      await db.update(courses).set({ isFeatured: true }).where(eq(courses.id, courseId));
    }

  } catch (e: any) {
    console.error("[seed-saas-demo] Fatal error:", e?.message);
  }

  return { students: studentsCreated, enrollments: enrollmentsCreated, reviews: reviewsCreated };
}
