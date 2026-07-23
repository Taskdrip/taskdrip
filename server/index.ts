import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { registerRoutes, runSubscriptionExpiryCheck } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { seedDemoData, backfillCreatorTiers } from "./seed-demo";
import { seedDefaultBlogs } from "./admin-demo-routes";
import { seedCmsContent } from "./seed-cms";
import { seedLegalPages } from "./seed-legal";
import { seedBreedskoolPricing, seedBreedskoolPaymentSettings, fixVerifiedBreedskoolEnrollments } from "./seed-breedskool";
import { seedBreedskoolCourses } from "./seed-breedskool-courses";
import { seedLawcolab } from "./seed-lawcolab";
import { storage } from "./storage";
import { runStartupMigrations } from "./startup-migrations";
import bcrypt from "bcryptjs";

// ── Global crash guards — must be first so the server never silently dies ──
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

const app = express();
const isProd = process.env.NODE_ENV === "production";
let appReady = false;
let startupError: string | null = null;

app.set("trust proxy", 1);

app.get(["/api/health", "/health"], (_req, res) => {
  const body = {
    status: appReady ? "ok" : startupError ? "error" : "starting",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    error: startupError,
  };
  // Always return 200 so Railway's health check never times out and kills the deployment.
  // The body's "status" field ("ok" | "starting" | "error") carries the actual state.
  res.status(200).json(body);
});

if (isProd) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
          connectSrc: ["'self'", "wss:", "ws:", "https:"],
          mediaSrc: ["'self'", "blob:", "data:"],
          objectSrc: ["'none'"],
          frameSrc: ["'self'", "https:"],
          workerSrc: ["'self'", "blob:"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      noSniff: true,
      xssFilter: true,
      frameguard: false,
      dnsPrefetchControl: { allow: false },
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      hidePoweredBy: true,
    })
  );
} else {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      noSniff: true,
      xssFilter: true,
      frameguard: false,
      dnsPrefetchControl: { allow: false },
      hidePoweredBy: true,
    })
  );
}

const isDev = process.env.NODE_ENV !== "production";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
  skip: (req) =>
    isDev ||
    req.path.startsWith("/api/health") ||
    req.path.startsWith("/health") ||
    req.path.startsWith("/assets") ||
    req.path.startsWith("/uploads"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later." },
  skip: () => isDev,
});

const apiWriteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDev ? 10000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Request limit reached, please slow down." },
  skip: () => isDev,
});

app.use(globalLimiter);
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/forgot-password", authLimiter);
app.use("/api/reset-password", authLimiter);

app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.path.startsWith("/api")) {
    return apiWriteLimiter(req, res, next);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=()");
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

// Legacy uploads saved without extensions still need to be served. We allow
// empty extension (legacy) plus an explicit allowlist, and rely on nosniff +
// magic-byte Content-Type detection below so the browser renders them correctly.
const LEGACY_UPLOAD_MIME: Array<[Buffer, string]> = [
  [Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'],
  [Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png'],
  [Buffer.from([0x47, 0x49, 0x46, 0x38]), 'image/gif'],
  [Buffer.from([0x25, 0x50, 0x44, 0x46]), 'application/pdf'],
  [Buffer.from('RIFF'), 'image/webp'],
];
app.use('/uploads', async (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.mov', '.pdf', ''];
  if (!allowed.includes(ext)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  // Legacy files with no extension: sniff magic bytes and set a proper Content-Type.
  if (ext === '') {
    try {
      const fs = await import('fs/promises');
      const full = path.resolve('uploads', path.basename(req.path));
      const fh = await fs.open(full, 'r');
      const buf = Buffer.alloc(12);
      await fh.read(buf, 0, 12, 0);
      await fh.close();
      for (const [sig, mime] of LEGACY_UPLOAD_MIME) {
        if (buf.subarray(0, sig.length).equals(sig)) { res.setHeader('Content-Type', mime); break; }
      }
    } catch { /* fall through to static */ }
  }
  next();
}, express.static(path.resolve('uploads'), {
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function ensureAdminExists() {
  try {
    const adminEmail = "demo@taskdrip.online";
    const existing = await storage.getUserByEmail(adminEmail);
    if (!existing) {
      const hashed = await bcrypt.hash("Admin@2024", 12);
      const genCode = (prefix: string) =>
        `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      await storage.createUser({
        id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName: "Admin",
        lastName: "Taskdrip",
        email: adminEmail,
        password: hashed,
        userType: "admin",
        role: "admin",
        bio: "Platform Administrator",
        location: "",
        skills: [],
        referralCodeCreator: genCode("CR"),
        referralCodeBrand: genCode("BR"),
      } as any);
      log("Default admin account created: demo@taskdrip.online");
    }
  } catch (err) {
    console.error("Admin seed error:", err);
  }
}

const port = parseInt(process.env.PORT || '5000', 10);
const server = createServer(app);

server.listen({
  port,
  host: "0.0.0.0",
}, () => {
  log(`serving on port ${port}`);
});

(async () => {
  // ── Phase 1: DB migrations (non-fatal — a missing column must not kill the UI) ──
  try {
    await runStartupMigrations();
  } catch (err: any) {
    console.error("[startup] Migration error (non-fatal):", err);
  }

  // ── Phase 2: API routes ────────────────────────────────────────────────────────
  try {
    await registerRoutes(app, server);
  } catch (err: any) {
    startupError = err?.message || "Route registration failed";
    console.error("[startup] Routes error:", err);
  }

  // Global error handler must be registered after routes.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error("Request error:", err);
  });

  // ── Phase 3: Static frontend — ALWAYS runs so "/" never returns "Cannot GET /" ─
  try {
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  } catch (err: any) {
    console.error("[startup] Static serving setup error:", err);
  }

  if (!startupError) appReady = true;

  // ── Phase 4: Background seeds (deferred, never block readiness) ───────────────
  setImmediate(async () => {
    try {
      await ensureAdminExists();
      const adminUser = await storage.getUserByEmail("demo@taskdrip.online");
      if (adminUser) {
        await seedDemoData(adminUser.id).catch((e) => console.error("seedDemoData:", e));
        // Auto-seed default blog posts on every startup (idempotent — only
        // inserts missing slugs). This is the "auto-sync" hook: pushing new
        // entries into server/blog-seed-data.ts and redeploying Railway
        // automatically publishes them on the live site.
        await seedDefaultBlogs(adminUser.id)
          .then((r) => log(`[Seed] Default blogs: ${r.inserted} new, ${r.skipped} existing`))
          .catch((e) => console.error("seedDefaultBlogs:", e));
      }
      await seedCmsContent().catch((e) => console.error("seedCmsContent:", e));
      await seedLegalPages().catch((e) => console.error("seedLegalPages:", e));
      await backfillCreatorTiers().catch((e) => console.error("backfillCreatorTiers:", e));
      await seedBreedskoolPricing()
        .then((r) => log(`[BreedSkool] Pricing: ${r.upserted} new, ${r.skipped} updated`))
        .catch((e) => console.error("seedBreedskoolPricing:", e));
      await seedBreedskoolPaymentSettings()
        .catch((e) => console.error("seedBreedskoolPaymentSettings:", e));
      if (adminUser) {
        await seedBreedskoolCourses(adminUser.id)
          .then((r) => log(`[BreedSkool] Courses: ${r.created} created, ${r.linked} linked`))
          .catch((e) => console.error("seedBreedskoolCourses:", e));
      }
      // Retroactively activate enrollments for students whose payment was verified
      // before the course seed linked onsite/home_lesson to platform courses
      await fixVerifiedBreedskoolEnrollments()
        .then((r) => log(`[BreedSkool] Enrollment fix: ${r.fixed} activated, ${r.skipped} already active, ${r.noLink} with no course link`))
        .catch((e) => console.error("fixVerifiedBreedskoolEnrollments:", e));
      await seedLawcolab()
        .then((r) => log(`[LAWCOLAB] Shop product: ${r.inserted ? "inserted" : "already exists"}`))
        .catch((e) => console.error("seedLawcolab:", e));
    } catch (e) {
      console.error("Background seed error:", e);
    }
  });

  const runExpiryCheck = async () => {
    try {
      const result = await runSubscriptionExpiryCheck();
      if (result.expired > 0 || result.reminded > 0) {
        log(`[Subscription] Expired: ${result.expired}, Reminded: ${result.reminded}`);
      }
    } catch (e) {
      console.error("Expiry check error:", e);
    }
  };
  runExpiryCheck();
  setInterval(runExpiryCheck, 30 * 60 * 1000);
})();
