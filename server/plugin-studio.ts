import type { Express } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { zipSync, strToU8 } from "fflate";
import { db } from "./db";
import { isAuthenticated } from "./auth";
import { pluginStudioProjects, purchases, shopProducts } from "@shared/schema";
import { buildWordPressPluginFiles } from "./wp-plugin-template";

const STARTER = {
  slug: "coursebridge-learnpress-woocommerce",
  templateKey: "learnpress-woocommerce",
  name: "CourseBridge Pro for LearnPress & WooCommerce",
  version: "1.0.0",
  author: "Taskdrip",
  shortDescription: "Automatically enroll WooCommerce customers in linked LearnPress courses, track buyers, and run consent-based Resend campaigns.",
  description:
    "Connect WooCommerce products to LearnPress courses with CourseBridge Pro. When a WooCommerce order is confirmed as paid, the customer is enrolled in each course mapped to the products in their order. Give course teams a clear view of product and course purchases, customer roles, order totals, and enrollment history. Build course-specific audiences and send individual or selected-group email campaigns through Resend, with recorded consent and unsubscribe links. Includes an installable WordPress plugin ZIP, upgrade-conscious order history, SEO-ready product copy, and a WordPress repository preparation guide.",
  seoTitle: "LearnPress WooCommerce Integration & Email Marketing Plugin",
  seoDescription:
    "Connect LearnPress courses to WooCommerce products. Auto-enroll paid buyers, track customers and course purchases, and send consent-based Resend email campaigns.",
  seoKeywords:
    "LearnPress WooCommerce integration, WooCommerce course enrollment, LearnPress course sales, WordPress LMS plugin, Resend email marketing, course customer management",
};

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function isAdmin(req: any): boolean {
  return req.user?.userType === "admin" || req.user?.role === "admin";
}

function adminOnly(req: any, res: any): boolean {
  if (!req.isAuthenticated?.() || !isAdmin(req)) {
    res.status(403).json({ message: "Administrator access required." });
    return false;
  }
  return true;
}

async function ensureStarterProject(adminId: string) {
  const [existing] = await db.select({ id: pluginStudioProjects.id })
    .from(pluginStudioProjects).where(eq(pluginStudioProjects.templateKey, STARTER.templateKey)).limit(1);
  if (existing) return;

  try {
    await db.transaction(async (tx) => {
      const [product] = await tx.insert(shopProducts).values({
        title: STARTER.name,
        description: STARTER.description,
        shortDescription: STARTER.shortDescription,
        price: "49.00",
        category: "WordPress Plugins",
        type: "plugin",
        features: [
          "Link WooCommerce products to one or more LearnPress courses",
          "Enroll customers automatically after successful WooCommerce payment",
          "Review product and course buyers, WordPress roles, and order totals",
          "Send consent-based Resend campaigns to selected customer segments",
          "Secure unsubscribe links and per-recipient send logs",
          "Downloadable plugin ZIP with WordPress installation and repository notes",
        ],
        requirements: ["WordPress 6.2+", "PHP 7.4+", "WooCommerce", "LearnPress"],
        tags: ["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment", "email marketing"],
        isActive: true,
        isFeatured: true,
        isFree: false,
        createdBy: adminId,
      }).returning();
      const [project] = await tx.insert(pluginStudioProjects).values({
        ...STARTER,
        shopProductId: product.id,
        status: "published",
        createdBy: adminId,
      }).returning();
      await tx.update(shopProducts)
        .set({ downloadUrl: `/api/plugin-studio/projects/${project.id}/download` })
        .where(eq(shopProducts.id, product.id));
    });
  } catch (error: any) {
    // Multiple admin browser tabs can race the one-time starter insert.
    const [created] = await db.select({ id: pluginStudioProjects.id })
      .from(pluginStudioProjects).where(eq(pluginStudioProjects.templateKey, STARTER.templateKey)).limit(1);
    if (!created) throw error;
  }
}

async function getProjectFiles(id: string) {
  const [project] = await db.select().from(pluginStudioProjects).where(eq(pluginStudioProjects.id, id)).limit(1);
  if (!project) return null;
  return {
    project,
    files: buildWordPressPluginFiles({
      slug: project.slug,
      name: project.name,
      version: project.version,
      author: project.author,
      shortDescription: project.shortDescription || project.name,
      description: project.description,
    }),
  };
}

function archiveFor(project: any, files: Record<string, string>): Buffer {
  const archive = zipSync(
    Object.fromEntries(Object.entries(files).map(([file, content]) => [`${project.slug}/${file}`, strToU8(content)])),
    { level: 8 },
  );
  return Buffer.from(archive);
}

export function registerPluginStudioRoutes(app: Express) {
  app.get("/api/admin/plugin-studio/projects", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      await ensureStarterProject(req.user.id);
      const rows = await db.select({ project: pluginStudioProjects, product: shopProducts })
        .from(pluginStudioProjects)
        .leftJoin(shopProducts, eq(pluginStudioProjects.shopProductId, shopProducts.id))
        .orderBy(desc(pluginStudioProjects.createdAt));
      res.json(rows.map(({ project, product }) => ({
        ...project,
        product: product ? {
          id: product.id,
          price: product.price,
          salesCount: product.salesCount,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
        } : null,
      })));
    } catch (error: any) {
      console.error("[plugin-studio] Could not load projects:", error.message);
      res.status(500).json({ message: "Could not load plugin studio projects. Check that the database is available." });
    }
  });

  app.post("/api/admin/plugin-studio/projects", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const name = String(req.body?.name || "").trim().slice(0, 120);
      const version = String(req.body?.version || "1.0.0").trim().slice(0, 30);
      const author = String(req.body?.author || "Taskdrip").trim().slice(0, 80);
      const shortDescription = String(req.body?.shortDescription || "").trim().slice(0, 180);
      const description = String(req.body?.description || "").trim().slice(0, 6000);
      const seoTitle = String(req.body?.seoTitle || "").trim().slice(0, 70);
      const seoDescription = String(req.body?.seoDescription || "").trim().slice(0, 180);
      const seoKeywords = String(req.body?.seoKeywords || "").trim().slice(0, 600);
      const price = Number(req.body?.price);
      if (!name || !shortDescription || !description || !seoTitle || !seoDescription || !Number.isFinite(price) || price < 0.01 || price > 999999) {
        return res.status(400).json({ message: "Enter a name, product description, SEO title and description, and a price above zero." });
      }
      if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) {
        return res.status(400).json({ message: "Use a semantic version such as 1.0.0." });
      }
      const baseSlug = slugify(String(req.body?.slug || name));
      if (!baseSlug) return res.status(400).json({ message: "The plugin slug must contain letters or numbers." });
      const slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);
      const publishToShop = req.body?.publishToShop === true;
      let created: any;
      await db.transaction(async (tx) => {
        const [product] = await tx.insert(shopProducts).values({
          title: name,
          description,
          shortDescription,
          price: price.toFixed(2),
          category: "WordPress Plugins",
          type: "plugin",
          features: [
            "Map WooCommerce products to LearnPress courses",
            "Automatic course enrollment after successful payment",
            "Purchase and course-enrollment reporting",
            "Consent-based Resend audience campaigns",
            "Installable ZIP and WordPress deployment guide",
          ],
          requirements: ["WordPress 6.2+", "PHP 7.4+", "WooCommerce", "LearnPress"],
          tags: ["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment"],
          isActive: publishToShop,
          isFeatured: false,
          isFree: false,
          createdBy: req.user.id,
        }).returning();
        const [project] = await tx.insert(pluginStudioProjects).values({
          slug,
          templateKey: "learnpress-woocommerce",
          name,
          version,
          author,
          shortDescription,
          description,
          seoTitle,
          seoDescription,
          seoKeywords,
          shopProductId: product.id,
          status: publishToShop ? "published" : "draft",
          createdBy: req.user.id,
        }).returning();
        await tx.update(shopProducts)
          .set({ downloadUrl: `/api/plugin-studio/projects/${project.id}/download` })
          .where(eq(shopProducts.id, product.id));
        created = { ...project, product: { id: product.id, price: product.price, salesCount: 0, isActive: publishToShop } };
      });
      res.status(201).json(created);
    } catch (error: any) {
      console.error("[plugin-studio] Could not create project:", error.message);
      res.status(500).json({ message: "Could not create the plugin project." });
    }
  });

  app.patch("/api/admin/plugin-studio/projects/:id", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const [project] = await db.select().from(pluginStudioProjects)
        .where(eq(pluginStudioProjects.id, req.params.id)).limit(1);
      if (!project) return res.status(404).json({ message: "Plugin project not found." });
      const status = req.body?.status;
      if (status !== undefined && !["draft", "published"].includes(status)) {
        return res.status(400).json({ message: "Plugin status must be draft or published." });
      }
      const updates: any = { updatedAt: new Date() };
      if (status) updates.status = status;
      await db.transaction(async (tx) => {
        await tx.update(pluginStudioProjects).set(updates).where(eq(pluginStudioProjects.id, project.id));
        if (project.shopProductId && status) {
          await tx.update(shopProducts).set({ isActive: status === "published", updatedAt: new Date() })
            .where(eq(shopProducts.id, project.shopProductId));
        }
      });
      res.json({ success: true, status: status || project.status });
    } catch (error: any) {
      console.error("[plugin-studio] Could not update project:", error.message);
      res.status(500).json({ message: "Could not update the plugin project." });
    }
  });

  app.get("/api/admin/plugin-studio/projects/:id/download", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const result = await getProjectFiles(req.params.id);
      if (!result) return res.status(404).json({ message: "Plugin project not found." });
      const archive = archiveFor(result.project, result.files);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${result.project.slug}-${result.project.version}.zip"`);
      res.setHeader("Content-Length", archive.length);
      res.send(archive);
    } catch (error: any) {
      console.error("[plugin-studio] Could not generate ZIP:", error.message);
      res.status(500).json({ message: "Could not generate the plugin ZIP." });
    }
  });

  app.get("/api/shop/plugin-seo/:productId", async (req, res) => {
    try {
      const [project] = await db.select({
        id: pluginStudioProjects.id,
        slug: pluginStudioProjects.slug,
        name: pluginStudioProjects.name,
        version: pluginStudioProjects.version,
        seoTitle: pluginStudioProjects.seoTitle,
        seoDescription: pluginStudioProjects.seoDescription,
        seoKeywords: pluginStudioProjects.seoKeywords,
        productId: shopProducts.id,
        price: shopProducts.price,
        isActive: shopProducts.isActive,
      }).from(pluginStudioProjects)
        .innerJoin(shopProducts, eq(pluginStudioProjects.shopProductId, shopProducts.id))
        .where(and(
          eq(pluginStudioProjects.shopProductId, req.params.productId),
          eq(pluginStudioProjects.status, "published"),
          eq(shopProducts.isActive, true),
        )).limit(1);
      res.json(project || null);
    } catch (error: any) {
      console.error("[plugin-studio] Could not load SEO metadata:", error.message);
      res.status(500).json({ message: "Could not load plugin SEO details." });
    }
  });

  app.get("/api/plugin-studio/projects/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const [project] = await db.select().from(pluginStudioProjects)
        .where(eq(pluginStudioProjects.id, req.params.id)).limit(1);
      if (!project || !project.shopProductId) return res.status(404).json({ message: "Plugin product not found." });
      const [product] = await db.select().from(shopProducts).where(eq(shopProducts.id, project.shopProductId)).limit(1);
      if (!product || !product.isActive || project.status !== "published") {
        return res.status(404).json({ message: "This plugin is not available for download." });
      }
      const user = req.user;
      const admin = isAdmin(user);
      if (!admin) {
        const [purchase] = await db.select({ id: purchases.id }).from(purchases).where(and(
          eq(purchases.userId, user.id),
          eq(purchases.productId, product.id),
          inArray(purchases.status, ["paid", "approved", "delivered"]),
        )).limit(1);
        if (!purchase) return res.status(403).json({ message: "A verified paid purchase is required before downloading this plugin." });
      }
      const files = buildWordPressPluginFiles({
        slug: project.slug,
        name: project.name,
        version: project.version,
        author: project.author,
        shortDescription: project.shortDescription || project.name,
        description: project.description,
      });
      const archive = archiveFor(project, files);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${project.slug}-${project.version}.zip"`);
      res.setHeader("Content-Length", archive.length);
      res.send(archive);
    } catch (error: any) {
      console.error("[plugin-studio] Could not download purchased plugin:", error.message);
      res.status(500).json({ message: "Could not generate the plugin download." });
    }
  });
}
