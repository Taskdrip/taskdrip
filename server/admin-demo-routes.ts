/**
 * Admin Demo Lab routes — allocate followers, funds, views, likes, students,
 * and spawn fake users for realistic demos and load testing.
 *
 * All routes require an authenticated admin user.
 */
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
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
  appSettings,
} from "../shared/schema";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import { DEFAULT_BLOGS } from "./blog-seed-data";

// ─── App settings helpers (key/value table) ─────────────────────────────────
export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}
export async function setAppSetting(key: string, value: string): Promise<void> {
  await db.insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

// ─── Seed default blogs (idempotent, safe to call from startup) ─────────────
export async function seedDefaultBlogs(authorId: string): Promise<{ inserted: number; skipped: number; total: number }> {
  const existing = await db.select({ slug: blogPosts.slug }).from(blogPosts);
  const existingSlugs = new Set(existing.map(b => b.slug));
  let inserted = 0;
  const skipped: string[] = [];
  const now = new Date();
  for (const b of DEFAULT_BLOGS) {
    if (existingSlugs.has(b.slug)) { skipped.push(b.slug); continue; }
    try {
      await db.insert(blogPosts).values({
        title: b.title, slug: b.slug, content: b.content, excerpt: b.excerpt,
        featuredImage: b.featuredImage, category: b.category, tags: b.tags,
        authorId, isPublished: true, publishedAt: now,
        viewCount: b.viewCount, likesCount: b.likesCount, commentsCount: b.commentsCount,
        metaDescription: b.metaDescription, seoKeywords: b.seoKeywords,
        readingTime: b.readingTime,
      } as any);
      inserted++;
    } catch (err: any) {
      console.error("seed blog failed", b.slug, err?.message);
    }
  }
  return { inserted, skipped: skipped.length, total: DEFAULT_BLOGS.length };
}

// ─── Master wipe of all demo data (callable from kill switch) ───────────────
export async function wipeAllDemoData(): Promise<{
  fakeUsersDeleted: number; followsDeleted: number; likesDeleted: number;
  enrollmentsDeleted: number; productReviewsDeleted: number;
  courseReviewsDeleted: number; userReviewsDeleted: number;
  balancesReset: number; followersReset: number;
}> {
  const result = {
    fakeUsersDeleted: 0, followsDeleted: 0, likesDeleted: 0,
    enrollmentsDeleted: 0, productReviewsDeleted: 0,
    courseReviewsDeleted: 0, userReviewsDeleted: 0,
    balancesReset: 0, followersReset: 0,
  };

  // 1) Delete every fake_*@taskdrip.demo user and their generated activity
  const fakes = await db.select({ id: users.id })
    .from(users)
    .where(sql`${users.email} LIKE 'fake_%@taskdrip.demo'`);
  const ids = fakes.map(f => f.id);

  if (ids.length > 0) {
    const followGroups = await db.select({
      target: userFollows.followingId,
      n: sql<number>`count(*)::int`,
    }).from(userFollows).where(inArray(userFollows.followerId, ids))
      .groupBy(userFollows.followingId);
    for (const g of followGroups) {
      await db.update(users).set({
        followers: sql`GREATEST(0, COALESCE(${users.followers}, 0) - ${g.n})`,
        totalFollowers: sql`GREATEST(0, COALESCE(${users.totalFollowers}, 0) - ${g.n})`,
      } as any).where(eq(users.id, g.target));
    }

    const likeGroups = await db.select({
      postId: postLikes.postId,
      n: sql<number>`count(*)::int`,
    }).from(postLikes).where(inArray(postLikes.userId, ids))
      .groupBy(postLikes.postId);
    for (const g of likeGroups) {
      await db.update(posts).set({
        likeCount: sql`GREATEST(0, COALESCE(${posts.likeCount}, 0) - ${g.n})`,
      } as any).where(eq(posts.id, g.postId));
    }

    const r1 = await db.delete(userFollows)
      .where(sql`${userFollows.followerId} = ANY(${ids}) OR ${userFollows.followingId} = ANY(${ids})`);
    result.followsDeleted = (r1 as any).rowCount ?? 0;
    const r2 = await db.delete(postLikes).where(inArray(postLikes.userId, ids));
    result.likesDeleted = (r2 as any).rowCount ?? 0;
    const r3 = await db.delete(courseEnrollments).where(inArray(courseEnrollments.userId, ids));
    result.enrollmentsDeleted = (r3 as any).rowCount ?? 0;
    const r4 = await db.delete(productReviews).where(inArray(productReviews.userId, ids));
    result.productReviewsDeleted = (r4 as any).rowCount ?? 0;
    const r5 = await db.delete(courseReviews).where(inArray(courseReviews.userId, ids));
    result.courseReviewsDeleted = (r5 as any).rowCount ?? 0;
    try {
      const r6 = await db.delete(userReviews)
        .where(sql`${userReviews.reviewerId} = ANY(${ids}) OR ${userReviews.revieweeId} = ANY(${ids})`);
      result.userReviewsDeleted = (r6 as any).rowCount ?? 0;
    } catch {}
    try { await db.delete(blogLikes).where(inArray(blogLikes.userId, ids)); } catch {}
    const rDel = await db.delete(users).where(inArray(users.id, ids));
    result.fakeUsersDeleted = (rDel as any).rowCount ?? ids.length;
  }

  // 2) Zero balances + total earned for ALL users
  const rb = await db.update(users).set({
    availableBalance: "0.00", totalEarned: "0.00",
  } as any);
  result.balancesReset = (rb as any).rowCount ?? 0;

  // 3) Zero follower counts + per-platform counts for ALL users
  const rf = await db.update(users).set({
    followers: 0, following: 0, totalFollowers: 0,
    instagramFollowers: 0, twitterFollowers: 0,
    tiktokFollowers: 0, youtubeFollowers: 0,
  } as any);
  result.followersReset = (rf as any).rowCount ?? 0;

  return result;
}

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
  // Always pins the current admin to the top of the list — otherwise admins
  // can't find themselves when their email doesn't match the typed query
  // (e.g. searching "admin" never matches "demo@taskdrip.online").
  app.get("/api/admin/demo/users-lookup", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const q = String(req.query.q || "").trim().toLowerCase();
    const adminId = req.user.id;
    const cols = {
      id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName,
      followers: users.followers, availableBalance: users.availableBalance, userType: users.userType,
    };
    const [meRow, others] = await Promise.all([
      db.select(cols).from(users).where(eq(users.id, adminId)).limit(1),
      db.select(cols).from(users).where(
        q ? sql`(LOWER(${users.email}) LIKE ${`%${q}%`} OR LOWER(${users.username}) LIKE ${`%${q}%`} OR LOWER(${users.firstName}) LIKE ${`%${q}%`}) AND ${users.id} <> ${adminId}` : sql`${users.id} <> ${adminId}`
      ).orderBy(desc(users.createdAt)).limit(40),
    ]);
    res.json([...meRow, ...others]);
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

  // ─── Reset a single user (zero balance + followers) ───────────────────
  app.post("/api/admin/demo/reset-user", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { userId } = req.body || {};
      if (!userId) return res.status(400).json({ message: "userId required" });
      await db.update(users).set({
        availableBalance: "0.00",
        totalEarned: "0.00",
        followers: 0,
        following: 0,
        totalFollowers: 0,
        instagramFollowers: 0,
        twitterFollowers: 0,
        tiktokFollowers: 0,
        youtubeFollowers: 0,
      } as any).where(eq(users.id, userId));
      res.json({ ok: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Master wipe (legacy multi-flag endpoint, kept for back-compat) ───
  app.post("/api/admin/demo/wipe", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { confirm } = req.body || {};
      if (confirm !== "WIPE") {
        return res.status(400).json({ message: "Confirmation phrase 'WIPE' required" });
      }
      const result = await wipeAllDemoData();
      res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Seed default blog posts (idempotent) ─────────────────────────────
  // Inserts the curated blog set. Already-existing slugs are skipped — safe
  // to call from Railway production or any fresh DB.
  app.post("/api/admin/seed-default-blogs", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const result = await seedDefaultBlogs(req.user.id);
      res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Kill switch (single button: ON = demo data live, OFF = wiped) ────
  // GET returns current state. POST { enabled: boolean } toggles it:
  //   • enabled=false → wipe ALL demo data (fake users, balances, followers)
  //   • enabled=true  → re-seed default blogs and mark demo mode active
  app.get("/api/admin/demo/kill-switch", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const v = await getAppSetting("demo_mode_enabled");
    const enabled = v === null ? true : v === "true";
    res.json({ enabled });
  });

  app.post("/api/admin/demo/kill-switch", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { enabled } = req.body || {};
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled (boolean) required" });
      }
      let wipeResult: any = null;
      let seedResult: any = null;
      if (enabled === false) {
        wipeResult = await wipeAllDemoData();
      } else {
        seedResult = await seedDefaultBlogs(req.user.id);
      }
      await setAppSetting("demo_mode_enabled", String(enabled));
      res.json({ ok: true, enabled, wipeResult, seedResult });
    } catch (e: any) {
      console.error("kill-switch:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Google Analytics / GTM code injection ────────────────────────────
  // Admin pastes raw <head> + <body> tracking snippets that get injected
  // into every server-rendered HTML response. Stored in app_settings.
  app.get("/api/admin/analytics-codes", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const [headCode, bodyCode, enabledStr] = await Promise.all([
        getAppSetting("analytics_head_code"),
        getAppSetting("analytics_body_code"),
        getAppSetting("analytics_enabled"),
      ]);
      res.json({
        headCode: headCode || "",
        bodyCode: bodyCode || "",
        enabled: enabledStr === null ? true : enabledStr !== "false",
      });
    } catch (e: any) {
      console.error("analytics-codes get:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/analytics-codes", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    try {
      const { headCode, bodyCode, enabled } = req.body || {};
      const FORBIDDEN = /<\s*\/?(html|head|body)\b[^>]*>/i;
      const hc = String(headCode || "").slice(0, 50_000);
      const bc = String(bodyCode || "").slice(0, 50_000);
      if (hc && FORBIDDEN.test(hc)) {
        return res.status(400).json({ message: "Head code must not contain <html>, <head>, or <body> tags." });
      }
      if (bc && FORBIDDEN.test(bc)) {
        return res.status(400).json({ message: "Body code must not contain <html>, <head>, or <body> tags." });
      }
      await setAppSetting("analytics_head_code", hc);
      await setAppSetting("analytics_body_code", bc);
      await setAppSetting("analytics_enabled", String(enabled !== false));
      const { invalidateAnalyticsCache } = await import("./analytics-injector");
      invalidateAnalyticsCache();
      res.json({ ok: true, headLength: hc.length, bodyLength: bc.length, enabled: enabled !== false });
    } catch (e: any) {
      console.error("analytics-codes post:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Sync default content to live (calls remote production API) ───────
  // Pushes blog posts (and runs idempotent seeders) on a remote Railway URL.
  // Body: { url: "https://taskdrip.online", token: "<admin session cookie>" }
  // For convenience we also expose a direct endpoint that simply returns the
  // current seed status — the live app's own admin can re-trigger the seed
  // by clicking "Seed Default Blogs" or toggling the kill switch.
  app.get("/api/admin/demo/sync-status", isAuthenticated, async (req: any, res) => {
    if (!(await guard(req, res))) return;
    const blogs = await db.select({ slug: blogPosts.slug }).from(blogPosts);
    const existing = new Set(blogs.map(b => b.slug));
    const seeded = DEFAULT_BLOGS.filter(b => existing.has(b.slug)).map(b => b.slug);
    const missing = DEFAULT_BLOGS.filter(b => !existing.has(b.slug)).map(b => b.slug);
    res.json({
      total: DEFAULT_BLOGS.length,
      seeded: seeded.length,
      missing: missing.length,
      missingSlugs: missing,
    });
  });
}
