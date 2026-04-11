import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { storage } from "./storage";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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

(async () => {
  await ensureAdminExists();

  // Seed database in development
  if (app.get("env") === "development") {
    // await seedDatabase(); // Temporarily disabled during schema updates
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
