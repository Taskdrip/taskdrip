import type { Express } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { zipSync, strToU8 } from "fflate";
import { db } from "./db";
import { isAuthenticated } from "./auth";
import { pluginStudioProjects, purchases, shopProducts } from "@shared/schema";
import { createStudioAIClient, getCreatorStudioAIConfig } from "./creator-publishing";
import { buildPluginReleaseFiles, normalizeGeneratedEdition, type PluginEdition } from "./wp-plugin-release";
import { buildWordPressPluginFiles } from "./wp-plugin-template";
import { buildCourseBridgePluginEditions } from "./coursebridge-plugin";

const STARTER = {
  slug: "coursebridge-learnpress-woocommerce",
  templateKey: "learnpress-woocommerce",
  name: "CourseBridge Pro for LearnPress & WooCommerce",
  version: "1.0.0",
  author: "Taskdrip",
  shortDescription: "Automatically enroll WooCommerce customers in linked LearnPress courses, track buyers, and run consent-based Resend campaigns.",
  description:
    "CourseBridge Core links WooCommerce products to LearnPress courses and enrolls customers after confirmed payment. The separate paid Premium add-on gives administrators a dashboard for successful product and course purchases, WordPress roles, order totals, and enrollment history. Build course-specific audiences and send individual or selected-group Resend campaigns only to opted-in users, with unsubscribe links and send logs.",
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
  const [existing] = await db.select().from(pluginStudioProjects)
    .where(eq(pluginStudioProjects.templateKey, STARTER.templateKey)).limit(1);
  const editions = buildCourseBridgePluginEditions(STARTER);
  if (existing) {
    let shopProductId = existing.shopProductId;
    if (!shopProductId) {
      await db.transaction(async (tx) => {
        const [product] = await tx.insert(shopProducts).values({
          title: `${STARTER.name} Premium`,
          description: STARTER.description,
          shortDescription: STARTER.shortDescription,
          price: "49.00",
          category: "WordPress Plugins",
          type: "plugin",
          features: editions.premium.features,
          requirements: Array.from(new Set(["WordPress 6.2+", "PHP 7.4+", ...editions.premium.requirements])).slice(0, 10),
          tags: ["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment", "email marketing"],
          isActive: false,
          isFeatured: false,
          isFree: false,
          createdBy: adminId,
        }).returning();
        shopProductId = product.id;
        await tx.update(shopProducts)
          .set({ downloadUrl: `/api/plugin-studio/projects/${existing.id}/download` })
          .where(eq(shopProducts.id, product.id));
      });
    } else {
      await db.update(shopProducts)
        .set({ downloadUrl: `/api/plugin-studio/projects/${existing.id}/download` })
        .where(eq(shopProducts.id, shopProductId));
    }
    const packagesMissing =
      !Object.keys(existing.coreFiles || {}).length ||
      !Object.keys(existing.premiumFiles || {}).length;
    if (packagesMissing || existing.shopProductId !== shopProductId) {
      await db.update(pluginStudioProjects).set({
        shopProductId,
        sourcePrompt: existing.sourcePrompt || STARTER.description,
        coreShortDescription: editions.core.shortDescription,
        coreDescription: editions.core.description,
        coreFiles: editions.core.files,
        premiumFiles: editions.premium.files,
        updatedAt: new Date(),
      }).where(eq(pluginStudioProjects.id, existing.id));
    }
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const [product] = await tx.insert(shopProducts).values({
        title: `${STARTER.name} Premium`,
        description: STARTER.description,
        shortDescription: STARTER.shortDescription,
        price: "49.00",
        category: "WordPress Plugins",
        type: "plugin",
        features: editions.premium.features,
        requirements: Array.from(new Set(["WordPress 6.2+", "PHP 7.4+", ...editions.premium.requirements])).slice(0, 10),
        tags: ["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment", "email marketing"],
        isActive: false,
        isFeatured: false,
        isFree: false,
        createdBy: adminId,
      }).returning();
      const [project] = await tx.insert(pluginStudioProjects).values({
        ...STARTER,
        sourcePrompt: STARTER.description,
        coreShortDescription: editions.core.shortDescription,
        coreDescription: editions.core.description,
        coreFiles: editions.core.files,
        premiumFiles: editions.premium.files,
        shopProductId: product.id,
        status: "draft",
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

function parseGeneratedPair(content: string): any {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("The AI provider returned an invalid plugin package. Try again with a shorter specification.");
  }
}

async function getProjectFiles(id: string, edition: PluginEdition) {
  const [project] = await db.select().from(pluginStudioProjects).where(eq(pluginStudioProjects.id, id)).limit(1);
  if (!project) return null;
  const sourceFiles = edition === "core" ? project.coreFiles : project.premiumFiles;
  if (sourceFiles && Object.keys(sourceFiles).length > 0) {
    const release = buildPluginReleaseFiles(project, edition, sourceFiles);
    return { project, ...release };
  }
  return {
    project,
    folderSlug: project.slug,
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

function archiveFor(folderSlug: string, files: Record<string, string>): Buffer {
  const archive = zipSync(
    Object.fromEntries(Object.entries(files).map(([file, content]) => [`${folderSlug}/${file}`, strToU8(content)])),
    { level: 8 },
  );
  return Buffer.from(archive);
}

export function registerPluginStudioRoutes(app: Express) {
  app.get("/api/admin/plugin-studio/ai-status", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const config = await getCreatorStudioAIConfig();
      res.json({
        aiAvailable: config.aiAvailable,
        provider: config.provider,
        model: config.model,
        settingsUrl: "/admin/publishing",
      });
    } catch (error: any) {
      console.error("[plugin-studio] Could not load AI status:", error.message);
      res.status(500).json({ message: "Could not check the plugin-generation AI settings." });
    }
  });

  app.get("/api/admin/plugin-studio/projects", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      await ensureStarterProject(String(req.user.id));
      const rows = await db.select({ project: pluginStudioProjects, product: shopProducts })
        .from(pluginStudioProjects)
        .leftJoin(shopProducts, eq(pluginStudioProjects.shopProductId, shopProducts.id))
        .orderBy(desc(pluginStudioProjects.createdAt));
      res.json(rows.map(({ project, product }) => {
        const {
          sourcePrompt,
          coreShortDescription,
          coreDescription,
          coreFiles,
          premiumFiles,
          ...metadata
        } = project;
        return {
          ...metadata,
          coreFileCount: Object.keys(coreFiles || {}).length,
          premiumFileCount: Object.keys(premiumFiles || {}).length,
          product: product ? {
            id: product.id,
            price: product.price,
            salesCount: product.salesCount,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
          } : null,
        };
      }));
    } catch (error: any) {
      console.error("[plugin-studio] Could not load projects:", error.message);
      res.status(500).json({ message: "Could not load plugin studio projects. Check that the database is available." });
    }
  });

  app.post("/api/admin/plugin-studio/projects", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const name = String(req.body?.name || "").trim().slice(0, 120);
      const sourcePrompt = String(req.body?.sourcePrompt || "").trim().slice(0, 6000);
      const version = String(req.body?.version || "1.0.0").trim().slice(0, 30);
      const author = String(req.body?.author || "Taskdrip").trim().slice(0, 80);
      const shortDescription = String(req.body?.shortDescription || "").trim().slice(0, 180);
      const description = String(req.body?.description || "").trim().slice(0, 6000);
      const seoTitle = String(req.body?.seoTitle || "").trim().slice(0, 70);
      const seoDescription = String(req.body?.seoDescription || "").trim().slice(0, 180);
      const seoKeywords = String(req.body?.seoKeywords || "").trim().slice(0, 600);
      const price = Number(req.body?.price);
      if (!name || sourcePrompt.length < 30 || !shortDescription || !description || !seoTitle || !seoDescription || !Number.isFinite(price) || price < 0.01 || price > 999999) {
        return res.status(400).json({ message: "Enter a plugin name, a functional brief of at least 30 characters, product copy, SEO details, and a price above zero." });
      }
      if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) {
        return res.status(400).json({ message: "Use a semantic version such as 1.0.0." });
      }
      const slug = slugify(String(req.body?.slug || name)).slice(0, 55);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2) {
        return res.status(400).json({ message: "Use a WordPress-compatible slug containing lowercase letters, numbers, and hyphens." });
      }
      const [existingProject] = await db.select({ id: pluginStudioProjects.id })
        .from(pluginStudioProjects).where(eq(pluginStudioProjects.slug, slug)).limit(1);
      if (existingProject) return res.status(409).json({ message: "That plugin slug is already in use. Choose a different slug." });

      const config = await getCreatorStudioAIConfig();
      const ai = config.aiAvailable
        ? createStudioAIClient(config.model, config.provider, config.endpointUrl)
        : null;
      if (!ai) {
        return res.status(503).json({
          message: "Plugin generation needs an AI provider. Configure it in Admin → Creator Publishing → AI Settings, then try again.",
          settingsUrl: "/admin/publishing",
        });
      }
      const premiumSlug = `${slug}-premium`;
      const result = await ai.client.chat.completions.create({
        model: ai.model,
        temperature: 0.2,
        max_tokens: 9000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a senior WordPress plugin engineer. Generate two distinct, complete, installable plugin packages from the user's specification and return JSON only.
Required JSON: {"core":{"mainFile":"main.php","shortDescription":"...","description":"...","features":["..."],"requirements":["..."],"files":{"main.php":"<?php...","includes/module.php":"...","assets/admin.css":"..."}},"premium":{"mainFile":"main.php","shortDescription":"...","description":"...","features":["..."],"requirements":["..."],"files":{"main.php":"<?php...","includes/module.php":"..."}}}
Core directory slug: ${slug}
Premium add-on slug: ${premiumSlug}
Build rules:
- The free core must provide useful, complete functionality on its own. The premium add-on must add substantive features through the core's documented PHP hooks or API; do not make the core trialware, disable core features, or hide a paywall in it.
- The premium entry file must declare the WordPress plugin dependency on the core slug "${slug}" and show a clear admin notice if that core is inactive. Use the stable public hooks/functions defined by the core; do not duplicate core implementation.
- The core must define this stable version contract constant: TASKDRIP_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_CORE_VERSION. The premium add-on should use it to check that the core is loaded. The server will add a guarded core definition and a missing-core admin notice.
- Both main files must begin with PHP and contain a standard WordPress plugin header comment including Plugin Name, Description, Version 1.0.0, Author ${author}, GPL-2.0-or-later License, and text domain. The server will normalize these headers.
- Use PHP 7.4-compatible, namespaced or uniquely prefixed code, WordPress APIs, capability checks, nonce verification for state-changing actions, input validation/sanitization, escaped output, prepared database queries, and safe activation/uninstall behavior.
- No secrets, telemetry, hidden admin users, backdoors, remote executable code, licensing locks in the free core, or unrequested third-party dependencies. Do not claim tests, approvals, or compatibility that were not performed.
- Return complete source code, not pseudocode. Keep each package to at most 12 PHP/CSS/JS source files and return no binary or image files. Do not include README or documentation files; the server creates release documentation.
- Include 3–6 short, specific features per edition, and list accurate WordPress/PHP/plugin requirements. Each edition needs a useful description and a root-level main PHP file.`,
          },
          {
            role: "user",
            content: `Plugin name: ${name}
Core slug: ${slug}
Premium slug: ${premiumSlug}
Version: ${version}
Author: ${author}
Required behavior:
${sourcePrompt}

Premium Taskdrip product summary:
${shortDescription}

Product description:
${description}`,
          },
        ],
      });
      const responseText = result.choices[0]?.message?.content;
      if (!responseText) return res.status(502).json({ message: "The AI provider returned an empty plugin package. Try again." });
      if (responseText.length > 500_000) {
        return res.status(502).json({ message: "The generated plugin package is too large. Reduce the requested scope and try again." });
      }
      let generated: any;
      try {
        generated = parseGeneratedPair(responseText);
      } catch (error: any) {
        return res.status(502).json({ message: error.message });
      }
      let core: ReturnType<typeof normalizeGeneratedEdition>;
      let premium: ReturnType<typeof normalizeGeneratedEdition>;
      try {
        core = normalizeGeneratedEdition(generated.core, { slug, name, version, author }, "core");
        premium = normalizeGeneratedEdition(generated.premium, { slug, name, version, author }, "premium");
      } catch (error: any) {
        return res.status(502).json({ message: error.message });
      }
      let created: any;
      await db.transaction(async (tx) => {
        const [product] = await tx.insert(shopProducts).values({
          title: `${name} Premium Add-on`,
          description,
          shortDescription,
          price: price.toFixed(2),
          category: "WordPress Plugins",
          type: "plugin",
          features: [...premium.features, `Requires the free ${name} Core plugin`],
          requirements: Array.from(new Set(["WordPress 6.2+", "PHP 7.4+", ...premium.requirements, `Free core plugin: ${slug}`])).slice(0, 10),
          tags: seoKeywords.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
          isActive: false,
          isFeatured: false,
          isFree: false,
          createdBy: req.user.id,
        }).returning();
        const [project] = await tx.insert(pluginStudioProjects).values({
          slug,
          templateKey: "ai-generated-core-premium",
          sourcePrompt,
          name,
          version,
          author,
          shortDescription,
          description,
          coreShortDescription: core.shortDescription || `${name} free core edition`,
          coreDescription: core.description || `The free core edition of ${name}.`,
          coreFiles: core.files,
          premiumFiles: premium.files,
          seoTitle,
          seoDescription,
          seoKeywords,
          shopProductId: product.id,
          status: "draft",
          createdBy: req.user.id,
        }).returning();
        await tx.update(shopProducts)
          .set({ downloadUrl: `/api/plugin-studio/projects/${project.id}/download` })
          .where(eq(shopProducts.id, product.id));
        created = {
          id: project.id,
          slug: project.slug,
          name: project.name,
          version: project.version,
          status: project.status,
          product: { id: product.id, price: product.price, salesCount: 0, isActive: false },
          coreFileCount: Object.keys(core.files).length,
          premiumFileCount: Object.keys(premium.files).length,
        };
      });
      res.status(201).json(created);
    } catch (error: any) {
      console.error("[plugin-studio] Could not create project:", error.message);
      if (error?.status === 503) return res.status(503).json({ message: error.message });
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
      if (
        status === "published" &&
        project.templateKey === "ai-generated-core-premium" &&
        (!Object.keys(project.coreFiles || {}).length || !Object.keys(project.premiumFiles || {}).length)
      ) {
        return res.status(409).json({ message: "Generate both plugin editions before publishing the premium add-on." });
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
      const edition: PluginEdition = req.query.edition === "core" ? "core" : "premium";
      const result = await getProjectFiles(req.params.id, edition);
      if (!result) return res.status(404).json({ message: "Plugin project not found." });
      const archive = archiveFor(result.folderSlug, result.files);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${result.folderSlug}-${result.project.version}.zip"`);
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
      const release = await getProjectFiles(project.id, "premium");
      if (!release) return res.status(404).json({ message: "Plugin package not found." });
      const archive = archiveFor(release.folderSlug, release.files);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${release.folderSlug}-${project.version}.zip"`);
      res.setHeader("Content-Length", archive.length);
      res.send(archive);
    } catch (error: any) {
      console.error("[plugin-studio] Could not download purchased plugin:", error.message);
      res.status(500).json({ message: "Could not generate the plugin download." });
    }
  });
}
