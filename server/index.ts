import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { registerRoutes, runSubscriptionExpiryCheck } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { seedDemoData } from "./seed-demo";
import { seedCmsContent } from "./seed-cms";
import { seedLegalPages } from "./seed-legal";
import { storage } from "./storage";
import bcrypt from "bcrypt";

const app = express();
const isProd = process.env.NODE_ENV === "production";
let appReady = false;
let startupError: string | null = null;

app.set("trust proxy", 1);

app.get(["/api/health", "/health"], (_req, res) => {
  const body = {
    status: startupError ? "error" : appReady ? "ok" : "starting",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    error: startupError,
  };
  res.status(startupError ? 500 : 200).json(body);
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
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

app.use('/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.mov', '.pdf'];
  if (!allowed.includes(ext)) {
    return res.status(403).json({ message: "Forbidden" });
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
  reusePort: true,
}, () => {
  log(`serving on port ${port}`);
});

(async () => {
  try {
    await ensureAdminExists();

    const adminUser = await storage.getUserByEmail("demo@taskdrip.online");
    if (adminUser) {
      await seedDemoData(adminUser.id);
    }

    await seedCmsContent();
    await seedLegalPages();

    if (app.get("env") === "development") {
      // await seedDatabase(); // Temporarily disabled during schema updates
    }

    await registerRoutes(app, server);

    const runExpiryCheck = async () => {
      const result = await runSubscriptionExpiryCheck();
      if (result.expired > 0 || result.reminded > 0) {
        log(`[Subscription] Expired: ${result.expired}, Reminded: ${result.reminded}`);
      }
    };
    runExpiryCheck();
    setInterval(runExpiryCheck, 30 * 60 * 1000);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    appReady = true;
  } catch (err: any) {
    startupError = err?.message || "Startup failed";
    console.error("Startup error:", err);
  }
})();
