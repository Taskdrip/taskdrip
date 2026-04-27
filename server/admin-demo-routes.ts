/**
 * Admin Demo Lab routes — allocate followers, funds, views, likes, students,
 * and spawn fake users for realistic demos and load testing.
 *
 * All routes require an authenticated admin user.
 */
import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "./db";
import { storage } from "./storage";
import {
  users,
  posts,
  postLikes,
  blogPosts,
  blogLikes,
  shopProducts,
  productReviews,
  courseEnrollments,
  courseReviews,
  courses,
  userFollows,
  userReviews,
  transactions,
} from "../shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";

const MAX_FOLLOWERS = 10_000_000;
const MAX_VIEWS = 50_000_000;
const MAX_FUNDS = 1_000_000;

const guard = async (req: any, res: Response): Promise<boolean> => {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }
  const u = await storage.getUser(req.user.id);
  if (u?.userType !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }
  return true;
};

const clamp = (n: any, max: number) => {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return Math.min(v, max);
};

const REVIEW_BLURBS = [
  "Absolutely game-changing — paid for itself in days.",
  "Honestly worth 3x the price. Setup took me 10 minutes.",
  "Best purchase I've made this year. Highly recommend.",
  "Slick UI, instant delivery, real value. 10/10.",
  "Already seeing results. Will be coming back for more.",
  "Saved me weeks of work. Wish I'd found this sooner.",
  "Premium quality. Customer support is unmatched.",
  "Clean, professional, and effective. Big fan.",
  "Finally a product that actually delivers. Love it.",
  "Underpriced for what you get. Snap it up.",
];

const FAKE_FIRST = ["Alex","Jordan","Taylor","Riley","Sam","Casey","Morgan","Avery","Quinn","Drew","Skyler","Cameron","Reese","Hayden","Phoenix","River","Sage","Rowan","Ellis","Finley"];
const FAKE_LAST = ["Carter","Reed","Brooks","Lane","Hayes","Cole","Knox","West","Stone","Vale","Frost","Quinn","Bishop","Hart","Wood","Cross","Park","Fox","Ash","Ray"];

export function registerAdminDemoRoutes(app: Express, isAuthenticated: any) {
  // ─── Stats ────────────────────────────────────────────────────────────
  app.get("/api/admin/demo/stats", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const [u, p, b, sp, c] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(users),
      db.select({ c: sql<number>`count(*)::int` }).from(posts),
      db.select({ c: sql<number>`count(*)::int` }).from(blogPosts),
      db.select({ c: sql<number>`count(*)::int` }).from(shopProducts),
      db.select({ c: sql<number>`count(*)::int` }).from(courses),
    ]);
    res.json({
      users: u[0]?.c ?? 0,
      posts: p[0]?.c ?? 0,
      blogPosts: b[0]?.c ?? 0,
      products: sp[0]?.c ?? 0,
      courses: c[0]?.c ?? 0,
    });
  });

  // ─── Allocate followers / following ───────────────────────────────────
  app.post("/api/admin/demo/allocate-followers", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { userId, followers, following } = req.body || {};
      if (!userId) return res.status(400).json({ message: "userId required" });
      const f = clamp(followers, MAX_FOLLOWERS);
      const fg = clamp(following, MAX_FOLLOWERS);
      const ig = Math.round(f * 0.45);
      const tw = Math.round(f * 0.25);
      const tk = Math.round(f * 0.20);
      const yt = Math.round(f * 0.10);
      await db.update(users).set({
        followers: f,
        following: fg,
        totalFollowers: f,
        instagramFollowers: ig,
        twitterFollowers: tw,
        tiktokFollowers: tk,
        youtubeFollowers: yt,
      } as any).where(eq(users.id, userId));
      res.json({ ok: true, followers: f, following: fg });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Allocate funds (USD balance) ─────────────────────────────────────
  app.post("/api/admin/demo/allocate-funds", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { userId, amount, mode } = req.body || {};
      if (!userId) return res.status(400).json({ message: "userId required" });
      const amt = Math.min(MAX_FUNDS, Math.max(0, Number(amount) || 0));
      const m = mode === "set" ? "set" : "add";
      if (m === "set") {
        await db.update(users).set({
          availableBalance: amt.toFixed(2),
          totalEarned: amt.toFixed(2),
        } as any).where(eq(users.id, userId));
      } else {
        await db.update(users).set({
          availableBalance: sql`COALESCE(${users.availableBalance}, 0) + ${amt}`,
          totalEarned: sql`COALESCE(${users.totalEarned}, 0) + ${amt}`,
        } as any).where(eq(users.id, userId));
      }
      res.json({ ok: true, amount: amt, mode: m });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Allocate post views & likes ──────────────────────────────────────
  app.post("/api/admin/demo/allocate-post-stats", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { postId, views, likes, comments } = req.body || {};
      if (!postId) return res.status(400).json({ message: "postId required" });
      const updates: any = {};
      if (views !== undefined) updates.viewCount = clamp(views, MAX_VIEWS);
      if (likes !== undefined) updates.likeCount = clamp(likes, MAX_VIEWS);
      if (comments !== undefined) updates.commentCount = clamp(comments, MAX_VIEWS);
      if (Object.keys(updates).length === 0) return res.status(400).json({ message: "Nothing to update" });
      await db.update(posts).set(updates).where(eq(posts.id, postId));
      res.json({ ok: true, ...updates });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Allocate blog views & likes ──────────────────────────────────────
  app.post("/api/admin/demo/allocate-blog-stats", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { blogId, views, likes, comments } = req.body || {};
      if (!blogId) return res.status(400).json({ message: "blogId required" });
      const updates: any = {};
      if (views !== undefined) updates.viewCount = clamp(views, MAX_VIEWS);
      if (likes !== undefined) updates.likesCount = clamp(likes, MAX_VIEWS);
      if (comments !== undefined) updates.commentsCount = clamp(comments, MAX_VIEWS);
      if (Object.keys(updates).length === 0) return res.status(400).json({ message: "Nothing to update" });
      await db.update(blogPosts).set({ ...updates, updatedAt: new Date() }).where(eq(blogPosts.id, blogId));
      res.json({ ok: true, ...updates });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Allocate product stats (sales / reviews / rating) ───────────────
  app.post("/api/admin/demo/allocate-product-stats", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { productId, sales, reviews, rating, likes, generateReviews } = req.body || {};
      if (!productId) return res.status(400).json({ message: "productId required" });
      const updates: any = {};
      if (sales !== undefined) updates.salesCount = clamp(sales, MAX_VIEWS);
      if (reviews !== undefined) updates.reviewCount = clamp(reviews, MAX_VIEWS);
      if (rating !== undefined) updates.rating = String(Math.max(0, Math.min(5, Number(rating) || 0)).toFixed(1));
      if (likes !== undefined) updates.likesCount = clamp(likes, MAX_VIEWS);
      if (Object.keys(updates).length > 0) {
        await db.update(shopProducts).set({ ...updates, updatedAt: new Date() }).where(eq(shopProducts.id, productId));
      }
      // Optionally seed real review rows so the product detail page shows them.
      let reviewsCreated = 0;
      if (generateReviews) {
        const n = clamp(generateReviews, 100);
        const fakeUsers = await db.select({ id: users.id }).from(users).where(sql`${users.email} LIKE 'fake_%@taskdrip.demo'`).limit(Math.max(n, 10));
        const pool = fakeUsers.length > 0 ? fakeUsers.map(u => u.id) : [req.user.id];
        for (let i = 0; i < n; i++) {
          const blurb = REVIEW_BLURBS[i % REVIEW_BLURBS.length];
          const r = 4 + Math.floor(Math.random() * 2); // 4 or 5 stars
          await db.insert(productReviews).values({
            productId,
            userId: pool[i % pool.length],
            rating: r,
            comment: blurb,
            isVerified: true,
            helpfulCount: Math.floor(Math.random() * 20),
          } as any).onConflictDoNothing?.() ?? db.insert(productReviews).values({
            productId,
            userId: pool[i % pool.length],
            rating: r,
            comment: blurb,
            isVerified: true,
          } as any);
          reviewsCreated++;
        }
      }
      res.json({ ok: true, ...updates, reviewsCreated });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Enroll fake students into a course ───────────────────────────────
  app.post("/api/admin/demo/enroll-students", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { courseId, count, addReviews } = req.body || {};
      if (!courseId) return res.status(400).json({ message: "courseId required" });
      const n = clamp(count, 5000);
      const fakeUsers = await db.select({ id: users.id }).from(users).where(sql`${users.email} LIKE 'fake_%@taskdrip.demo'`).limit(Math.max(n, 50));
      if (fakeUsers.length === 0) {
        return res.status(400).json({ message: "No fake users available — generate fake users first." });
      }
      let enrolled = 0, reviewed = 0;
      for (let i = 0; i < n; i++) {
        const uid = fakeUsers[i % fakeUsers.length].id;
        try {
          await db.insert(courseEnrollments).values({
            courseId,
            userId: uid,
            status: "active",
            progress: Math.floor(Math.random() * 100),
            isPaid: true,
            approvedBy: req.user.id,
            approvedAt: new Date(),
          } as any);
          enrolled++;
        } catch {}
        if (addReviews && i < Math.min(n, 50)) {
          try {
            await db.insert(courseReviews).values({
              courseId,
              userId: uid,
              rating: 4 + Math.floor(Math.random() * 2),
              comment: REVIEW_BLURBS[i % REVIEW_BLURBS.length],
            } as any);
            reviewed++;
          } catch {}
        }
      }
      res.json({ ok: true, enrolled, reviewed });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Spawn fake users (for realistic demo activity) ───────────────────
  app.post("/api/admin/demo/spawn-fake-users", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { count } = req.body || {};
      const n = clamp(count, 500);
      if (n === 0) return res.status(400).json({ message: "count must be > 0" });
      const passwordHash = await bcrypt.hash("fake_demo_pass_2026", 10);
      let created = 0;
      for (let i = 0; i < n; i++) {
        const first = FAKE_FIRST[Math.floor(Math.random() * FAKE_FIRST.length)];
        const last = FAKE_LAST[Math.floor(Math.random() * FAKE_LAST.length)];
        const id = `fake_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const email = `fake_${id}@taskdrip.demo`;
        const username = `${first.toLowerCase()}.${last.toLowerCase()}.${Math.floor(Math.random() * 9999)}`;
        const followers = Math.floor(Math.random() * 50000);
        try {
          await db.insert(users).values({
            id,
            email,
            password: passwordHash,
            firstName: first,
            lastName: last,
            username,
            userType: "creator",
            followers,
            following: Math.floor(Math.random() * 200),
            totalFollowers: followers,
            availableBalance: "0.00",
            isVerified: false,
            niche: ["Crypto", "Education", "Lifestyle", "Gaming", "AI"][Math.floor(Math.random() * 5)],
          } as any);
          created++;
        } catch (err: any) {
          // duplicate id (extremely unlikely) — skip
        }
      }
      res.json({ ok: true, created });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Make fake users follow a target user ─────────────────────────────
  app.post("/api/admin/demo/fake-follows", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { targetUserId, count } = req.body || {};
      if (!targetUserId) return res.status(400).json({ message: "targetUserId required" });
      const n = clamp(count, 5000);
      const fakeUsers = await db.select({ id: users.id }).from(users).where(sql`${users.email} LIKE 'fake_%@taskdrip.demo'`).limit(n);
      let made = 0;
      for (const fu of fakeUsers) {
        try {
          await db.insert(userFollows).values({
            followerId: fu.id,
            followingId: targetUserId,
          } as any);
          made++;
        } catch {}
      }
      // Bump the visible count too
      await db.update(users).set({
        followers: sql`COALESCE(${users.followers}, 0) + ${made}`,
        totalFollowers: sql`COALESCE(${users.totalFollowers}, 0) + ${made}`,
      } as any).where(eq(users.id, targetUserId));
      res.json({ ok: true, follows: made, fakeUsersAvailable: fakeUsers.length });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Make fake users like a post ──────────────────────────────────────
  app.post("/api/admin/demo/fake-post-likes", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { postId, count } = req.body || {};
      if (!postId) return res.status(400).json({ message: "postId required" });
      const n = clamp(count, 5000);
      const fakeUsers = await db.select({ id: users.id }).from(users).where(sql`${users.email} LIKE 'fake_%@taskdrip.demo'`).limit(n);
      let liked = 0;
      for (const fu of fakeUsers) {
        try {
          await db.insert(postLikes).values({ postId, userId: fu.id } as any);
          liked++;
        } catch {}
      }
      await db.update(posts).set({
        likeCount: sql`COALESCE(${posts.likeCount}, 0) + ${liked}`,
      } as any).where(eq(posts.id, postId));
      res.json({ ok: true, liked, fakeUsersAvailable: fakeUsers.length });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Lookups for the UI ───────────────────────────────────────────────
  app.get("/api/admin/demo/users-lookup", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const q = String(req.query.q || "").trim().toLowerCase();
    const rows = await db.select({
      id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName,
      followers: users.followers, availableBalance: users.availableBalance, userType: users.userType,
    }).from(users).where(
      q ? sql`(LOWER(${users.email}) LIKE ${`%${q}%`} OR LOWER(${users.username}) LIKE ${`%${q}%`} OR LOWER(${users.firstName}) LIKE ${`%${q}%`})` : sql`TRUE`
    ).orderBy(desc(users.createdAt)).limit(40);
    res.json(rows);
  });

  app.get("/api/admin/demo/posts-lookup", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const rows = await db.select({
      id: posts.id, content: posts.content, likeCount: posts.likeCount, viewCount: posts.viewCount,
    }).from(posts).orderBy(desc(posts.createdAt)).limit(40);
    res.json(rows);
  });

  app.get("/api/admin/demo/blogs-lookup", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const rows = await db.select({
      id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
      viewCount: blogPosts.viewCount, likesCount: blogPosts.likesCount,
    }).from(blogPosts).orderBy(desc(blogPosts.createdAt)).limit(60);
    res.json(rows);
  });

  app.get("/api/admin/demo/products-lookup", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const rows = await db.select({
      id: shopProducts.id, title: shopProducts.title, salesCount: shopProducts.salesCount,
      reviewCount: shopProducts.reviewCount, rating: shopProducts.rating,
    }).from(shopProducts).orderBy(desc(shopProducts.createdAt)).limit(60);
    res.json(rows);
  });

  app.get("/api/admin/demo/courses-lookup", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const rows = await db.select({
      id: courses.id, title: courses.title,
    }).from(courses).orderBy(desc(courses.createdAt)).limit(60);
    res.json(rows);
  });
}
