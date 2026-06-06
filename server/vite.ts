import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { buildSeoHtml } from "./seo-meta";
import { injectAnalytics } from "./analytics-injector";

// process.cwd() = project root in both Docker (/app) and local dev.
const PROJECT_ROOT = process.cwd();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Dev only — all Vite imports are lazy so they never load in production.
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { default: viteConfig } = await import("../vite.config.js");
  const { nanoid } = await import("nanoid");

  const viteLogger = createLogger();

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(PROJECT_ROOT, "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(url, template);
      page = await buildSeoHtml(page, req as Request);
      page = await injectAnalytics(page);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(PROJECT_ROOT, "dist", "public");
  console.log(`[static] Serving frontend from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    const msg = `[static] Build directory not found: ${distPath}. Run 'npm run build' first.`;
    console.error(msg);
    app.use("*", (_req, res) => res.status(503).send(msg));
    return;
  }

  app.use(express.static(distPath));

  app.use("*", async (req, res) => {
    try {
      const html = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
      let page = await buildSeoHtml(html, req as Request);
      page = await injectAnalytics(page);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}
