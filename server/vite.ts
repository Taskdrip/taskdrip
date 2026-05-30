import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { buildSeoHtml } from "./seo-meta";
import { injectAnalytics } from "./analytics-injector";

// Resolve __dirname in a way that works across Node 18/20/22 and esbuild bundles.
// process.cwd() = project root in both Docker (/app) and local dev.
// For dev, the client template is at <root>/client/index.html.
// For prod, the built frontend is at <root>/dist/public (vite outDir).
const PROJECT_ROOT = process.cwd();

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

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
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(PROJECT_ROOT, "client", "index.html");

      // always reload the index.html file from disk incase it changes
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
    // Register a fallback so every request gets a clear error instead of "Cannot GET /"
    app.use("*", (_req, res) => {
      res.status(503).send(msg);
    });
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
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
