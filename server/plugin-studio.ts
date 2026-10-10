import type { Express } from "express";
import multer from "multer";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { db } from "./db";
import { isAuthenticated } from "./auth";
import { pluginLicenseEvents, pluginLicenses, pluginLicenseSites, pluginStudioProjects, purchases, shopProducts } from "@shared/schema";
import { createStudioAIClient, getCreatorStudioAIConfig } from "./creator-publishing";
import { buildPluginReleaseFiles, normalizeGeneratedEdition, type PluginEdition } from "./wp-plugin-release";
import { buildWordPressPluginFiles } from "./wp-plugin-template";
import { buildCourseBridgePaidEdition } from "./coursebridge-plugin";
import { registerPluginLicenseRoutes } from "./plugin-licensing";

const releaseUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const PLAN_ADDONS = (monthly: number, yearly: number) => [
  { id: "plugin-monthly", title: "Monthly license", description: "One month of premium plugin access and updates.", price: monthly },
  { id: "plugin-yearly", title: "Yearly license", description: "One year of premium plugin access and updates.", price: yearly },
];
const STARTER_MONTHLY_PRICE = 49;

function defaultLicenseApiBaseUrl(): string | null {
  const configured = process.env.TASKDRIP_PUBLIC_URL?.trim();
  const raw = configured || (process.env.NODE_ENV === "production" ? "https://taskdrip.online" : "");
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("TASKDRIP_PUBLIC_URL must be a public HTTPS origin.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("TASKDRIP_PUBLIC_URL must be a public HTTPS origin without credentials, a path, query, or fragment.");
  }
  return parsed.origin;
}

async function ensureStarterPlans(productId: string): Promise<void> {
  const [product] = await db.select({
    price: shopProducts.price,
    serviceAddons: shopProducts.serviceAddons,
  }).from(shopProducts).where(eq(shopProducts.id, productId)).limit(1);
  if (!product) return;

  const plans = Array.isArray(product.serviceAddons) ? product.serviceAddons : [];
  const monthlyPrice = Number(plans.find((plan) => plan.id === "plugin-monthly")?.price) || Number(product.price) || STARTER_MONTHLY_PRICE;
  const yearlyPrice = Number(plans.find((plan) => plan.id === "plugin-yearly")?.price) || monthlyPrice * 12;
  const hasMonthly = plans.some((plan) => plan.id === "plugin-monthly" && Number(plan.price) > 0);
  const hasYearly = plans.some((plan) => plan.id === "plugin-yearly" && Number(plan.price) > 0);
  if (hasMonthly && hasYearly) return;

  await db.update(shopProducts).set({
    serviceAddons: PLAN_ADDONS(monthlyPrice, yearlyPrice),
    updatedAt: new Date(),
  }).where(eq(shopProducts.id, productId));
}

function validateZipDirectory(data: Uint8Array): boolean {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const minimum = Math.max(0, data.length - 65_557);
  let eocd = -1;
  for (let offset = data.length - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) return false;
  const entries = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (entries > 40 || directoryOffset + directorySize > eocd) return false;
  let offset = directoryOffset;
  let expandedBytes = 0;
  for (let i = 0; i < entries; i += 1) {
    if (offset + 46 > data.length || view.getUint32(offset, true) !== 0x02014b50) return false;
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    if ((flags & 1) !== 0 || uncompressedSize === 0xffffffff || compressedSize === 0xffffffff) return false;
    expandedBytes += uncompressedSize;
    if (expandedBytes > 120_000) return false;
    offset += 46 + nameLength + extraLength + commentLength;
    if (offset > data.length) return false;
  }
  return offset <= directoryOffset + directorySize;
}

function compareVersions(a: string, b: string): number {
  const parts = (value: string) => value.split("-")[0].split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parts(a), right = parts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference) return difference > 0 ? 1 : -1;
  }
  return 0;
}

const STARTER = {
  slug: "coursebridge-learnpress-woocommerce",
  templateKey: "learnpress-woocommerce",
  name: "CourseBridge Pro for LearnPress & WooCommerce",
  version: "2.1.2",
  author: "Taskdrip",
  shortDescription: "Link WooCommerce purchases to LearnPress courses and manage searchable, time-limited student access.",
  description:
    "CourseBridge Pro connects WooCommerce products to LearnPress courses, enrolls buyers after confirmed payment, and lets administrators search WordPress users by name, username, or email before assigning courses. Admins can set an optional expiry date, review each user's course access and dates, and cancel access. Buyers and assigned students can open their courses from WooCommerce My Account and LearnPress profiles. The plugin also includes buyer and enrollment reporting, product and course filters, WordPress-role and order summaries, consent-based Resend campaigns, unsubscribe links, a license page, and plugin settings.",
  seoTitle: "CourseBridge Pro – LearnPress & WooCommerce Plugin",
  seoDescription:
    "Link WooCommerce products to LearnPress courses, enroll buyers and assigned students, and give students course start links from My Account with CourseBridge Pro.",
  seoKeywords:
    "CourseBridge Pro, LearnPress WooCommerce integration, WooCommerce course enrollment, LearnPress course sales, WordPress LMS plugin, course customer management, WooCommerce LMS",
  featuredImage: "/coursebridge-pro-featured.svg",
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
  const paidEdition = buildCourseBridgePaidEdition(STARTER);
  if (existing) {
    let shopProductId: string = existing.shopProductId || "";
    if (!shopProductId) {
      shopProductId = await db.transaction(async (tx) => {
        const [product] = await tx.insert(shopProducts).values({
          title: STARTER.name,
          description: STARTER.description,
          shortDescription: STARTER.shortDescription,
          featuredImage: STARTER.featuredImage,
          price: STARTER_MONTHLY_PRICE.toFixed(2),
          serviceAddons: PLAN_ADDONS(STARTER_MONTHLY_PRICE, STARTER_MONTHLY_PRICE * 12),
          category: "WordPress Plugins",
          type: "plugin",
          features: paidEdition.features,
          requirements: Array.from(new Set(["WordPress 6.2+", "PHP 7.4+", ...paidEdition.requirements])).slice(0, 10),
          tags: ["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment", "email marketing"],
          isActive: false,
          isFeatured: false,
          isFree: false,
          createdBy: adminId,
        }).returning();
        await tx.update(shopProducts)
          .set({ downloadUrl: `/api/plugin-studio/projects/${existing.id}/download` })
          .where(eq(shopProducts.id, product.id));
        return product.id;
      });
    } else {
      await db.update(shopProducts)
        .set({ downloadUrl: `/api/plugin-studio/projects/${existing.id}/download` })
        .where(eq(shopProducts.id, shopProductId));
    }
    await ensureStarterPlans(shopProductId);
    const refreshLegacyStarter = compareVersions(existing.version, STARTER.version) < 0 ||
      Object.keys(existing.coreFiles || {}).length > 0 ||
      !existing.premiumFiles?.[`${STARTER.slug}.php`];
    const packagesMissing = !Object.keys(existing.premiumFiles || {}).length;
    const licenseApiBaseUrl = existing.licenseApiBaseUrl || defaultLicenseApiBaseUrl();
    const projectMetadataNeedsSync =
      existing.name !== STARTER.name ||
      existing.author !== STARTER.author ||
      existing.shortDescription !== STARTER.shortDescription ||
      existing.description !== STARTER.description ||
      existing.seoTitle !== STARTER.seoTitle ||
      existing.seoDescription !== STARTER.seoDescription ||
      existing.seoKeywords !== STARTER.seoKeywords;
    if (packagesMissing || refreshLegacyStarter || existing.shopProductId !== shopProductId ||
        licenseApiBaseUrl !== existing.licenseApiBaseUrl || projectMetadataNeedsSync) {
      await db.update(pluginStudioProjects).set({
        shopProductId,
        licenseApiBaseUrl,
        version: refreshLegacyStarter ? STARTER.version : existing.version,
        name: STARTER.name,
        author: STARTER.author,
        shortDescription: STARTER.shortDescription,
        description: STARTER.description,
        seoTitle: STARTER.seoTitle,
        seoDescription: STARTER.seoDescription,
        seoKeywords: STARTER.seoKeywords,
        sourcePrompt: refreshLegacyStarter ? STARTER.description : (existing.sourcePrompt || STARTER.description),
        coreShortDescription: "",
        coreDescription: "",
        coreFiles: {},
        premiumFiles: paidEdition.files,
        updatedAt: new Date(),
      }).where(eq(pluginStudioProjects.id, existing.id));
    }
    const [existingProduct] = await db.select().from(shopProducts).where(eq(shopProducts.id, shopProductId)).limit(1);
    const productMetadataNeedsSync = existingProduct && (
      existingProduct.title !== STARTER.name ||
      existingProduct.shortDescription !== STARTER.shortDescription ||
      existingProduct.description !== STARTER.description ||
      existingProduct.featuredImage !== STARTER.featuredImage ||
      JSON.stringify(existingProduct.features || []) !== JSON.stringify(paidEdition.features) ||
      JSON.stringify(existingProduct.requirements || []) !== JSON.stringify(Array.from(new Set(["WordPress 6.2+", "PHP 7.4+", ...paidEdition.requirements])).slice(0, 10)) ||
      JSON.stringify(existingProduct.tags || []) !== JSON.stringify(["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment", "email marketing"])
    );
    if (productMetadataNeedsSync) {
      await db.update(shopProducts).set({
        title: STARTER.name,
        shortDescription: STARTER.shortDescription,
        description: STARTER.description,
        featuredImage: STARTER.featuredImage,
        features: paidEdition.features,
        requirements: Array.from(new Set(["WordPress 6.2+", "PHP 7.4+", ...paidEdition.requirements])).slice(0, 10),
        tags: ["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment", "email marketing"],
        updatedAt: new Date(),
      }).where(eq(shopProducts.id, shopProductId));
    }
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const [product] = await tx.insert(shopProducts).values({
        title: STARTER.name,
        description: STARTER.description,
        shortDescription: STARTER.shortDescription,
        featuredImage: STARTER.featuredImage,
          price: STARTER_MONTHLY_PRICE.toFixed(2),
          serviceAddons: PLAN_ADDONS(STARTER_MONTHLY_PRICE, STARTER_MONTHLY_PRICE * 12),
        category: "WordPress Plugins",
        type: "plugin",
        features: paidEdition.features,
        requirements: Array.from(new Set(["WordPress 6.2+", "PHP 7.4+", ...paidEdition.requirements])).slice(0, 10),
        tags: ["LearnPress", "WooCommerce", "WordPress plugin", "course enrollment", "email marketing"],
        isActive: false,
        isFeatured: false,
        isFree: false,
        createdBy: adminId,
      }).returning();
      const [project] = await tx.insert(pluginStudioProjects).values({
        ...STARTER,
        licenseApiBaseUrl: defaultLicenseApiBaseUrl(),
        sourcePrompt: STARTER.description,
        coreShortDescription: "",
        coreDescription: "",
        coreFiles: {},
        premiumFiles: paidEdition.files,
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
  const singlePaid = project.templateKey === STARTER.templateKey;
  if ((singlePaid && edition === "core") || (!singlePaid && edition === "paid")) return null;
  const packageEdition: PluginEdition = singlePaid ? "paid" : edition;
  const sourceFiles = packageEdition === "core" ? project.coreFiles : project.premiumFiles;
  if (sourceFiles && Object.keys(sourceFiles).length > 0) {
    const release = buildPluginReleaseFiles(project, packageEdition, sourceFiles);
    return { project, ...release };
  }
  if (packageEdition === "paid") return null;
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
      const licenseApiBaseUrl = defaultLicenseApiBaseUrl();
      if (licenseApiBaseUrl) {
        await db.update(pluginStudioProjects)
          .set({ licenseApiBaseUrl, updatedAt: new Date() })
          .where(isNull(pluginStudioProjects.licenseApiBaseUrl));
      }
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
            serviceAddons: product.serviceAddons || [],
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
      const monthlyPrice = Number(req.body?.monthlyPrice);
      const yearlyPrice = Number(req.body?.yearlyPrice);
      if (!name || sourcePrompt.length < 30 || !shortDescription || !description || !seoTitle || !seoDescription ||
          !Number.isFinite(monthlyPrice) || monthlyPrice < 0.01 || monthlyPrice > 999999 ||
          !Number.isFinite(yearlyPrice) || yearlyPrice < 0.01 || yearlyPrice > 999999) {
        return res.status(400).json({ message: "Enter plugin details, SEO copy, and valid monthly and yearly license prices." });
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
          price: monthlyPrice.toFixed(2),
          serviceAddons: PLAN_ADDONS(monthlyPrice, yearlyPrice),
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
          licenseApiBaseUrl: defaultLicenseApiBaseUrl(),
          maxActivations: 3,
          releaseNotes: "",
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
          product: { id: product.id, price: product.price, serviceAddons: product.serviceAddons, salesCount: 0, isActive: false },
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
      const updates: any = { updatedAt: new Date() };
      if (req.body?.licenseApiBaseUrl !== undefined) {
        const rawUrl = String(req.body.licenseApiBaseUrl || "").trim();
        if (rawUrl) {
          let parsed: URL;
          try { parsed = new URL(rawUrl); } catch { return res.status(400).json({ message: "Enter the public HTTPS URL for the Taskdrip license server." }); }
          if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
            return res.status(400).json({ message: "The license server must be a public HTTPS base URL without credentials, query parameters, or a fragment." });
          }
          updates.licenseApiBaseUrl = parsed.toString().replace(/\/+$/, "");
        } else {
          updates.licenseApiBaseUrl = null;
        }
      }
      if (req.body?.maxActivations !== undefined) {
        const maxActivations = Number(req.body.maxActivations);
        if (!Number.isInteger(maxActivations) || maxActivations < 1 || maxActivations > 100) {
          return res.status(400).json({ message: "The activation limit must be a whole number from 1 to 100." });
        }
        updates.maxActivations = maxActivations;
      }
      if (req.body?.monthlyPrice !== undefined || req.body?.yearlyPrice !== undefined) {
        const monthlyPrice = Number(req.body?.monthlyPrice);
        const yearlyPrice = Number(req.body?.yearlyPrice);
        if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0.01 || monthlyPrice > 999999 ||
            !Number.isFinite(yearlyPrice) || yearlyPrice < 0.01 || yearlyPrice > 999999) {
          return res.status(400).json({ message: "Monthly and yearly license prices must both be greater than zero." });
        }
        updates.monthlyPrice = monthlyPrice;
        updates.yearlyPrice = yearlyPrice;
      }
      if (req.body?.releaseNotes !== undefined) {
        updates.releaseNotes = String(req.body.releaseNotes || "").trim().slice(0, 8_000);
      }
      if (
        status === "published" &&
        project.templateKey === "ai-generated-core-premium" &&
        (!Object.keys(project.coreFiles || {}).length || !Object.keys(project.premiumFiles || {}).length)
      ) {
        return res.status(409).json({ message: "Generate both plugin editions before publishing the premium add-on." });
      }
      if (status) updates.status = status;
      const nextLicenseUrl = updates.licenseApiBaseUrl !== undefined ? updates.licenseApiBaseUrl : project.licenseApiBaseUrl;
      const nextPlans = updates.monthlyPrice !== undefined
        ? PLAN_ADDONS(updates.monthlyPrice, updates.yearlyPrice)
        : (await db.select({ serviceAddons: shopProducts.serviceAddons })
            .from(shopProducts).where(eq(shopProducts.id, project.shopProductId || "")).limit(1))[0]?.serviceAddons || [];
      if (status === "published" && (!nextLicenseUrl || !nextPlans.some((plan) => plan.id === "plugin-monthly") || !nextPlans.some((plan) => plan.id === "plugin-yearly"))) {
        return res.status(409).json({ message: "Set a public HTTPS license server URL and both monthly and yearly prices before publishing." });
      }
      await db.transaction(async (tx) => {
        const projectUpdates = { ...updates };
        delete projectUpdates.monthlyPrice;
        delete projectUpdates.yearlyPrice;
        await tx.update(pluginStudioProjects).set(projectUpdates).where(eq(pluginStudioProjects.id, project.id));
        if (projectUpdates.maxActivations !== undefined) {
          await tx.update(pluginLicenses).set({ maxActivations: projectUpdates.maxActivations, updatedAt: new Date() })
            .where(eq(pluginLicenses.projectId, project.id));
        }
        if (project.shopProductId && updates.monthlyPrice !== undefined) {
          await tx.update(shopProducts).set({
            price: Number(updates.monthlyPrice).toFixed(2),
            serviceAddons: PLAN_ADDONS(Number(updates.monthlyPrice), Number(updates.yearlyPrice)),
            updatedAt: new Date(),
          }).where(eq(shopProducts.id, project.shopProductId));
        }
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
      const edition: PluginEdition = req.query.edition === "core"
        ? "core"
        : req.query.edition === "paid" ? "paid" : "premium";
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
      const key = String(req.params.productId);
      const [project] = await db.select({
        id: pluginStudioProjects.id,
        slug: pluginStudioProjects.slug,
        name: pluginStudioProjects.name,
        version: pluginStudioProjects.version,
        seoTitle: pluginStudioProjects.seoTitle,
        seoDescription: pluginStudioProjects.seoDescription,
        seoKeywords: pluginStudioProjects.seoKeywords,
        productId: shopProducts.id,
        featuredImage: shopProducts.featuredImage,
        price: shopProducts.price,
        isActive: shopProducts.isActive,
      }).from(pluginStudioProjects)
        .innerJoin(shopProducts, eq(pluginStudioProjects.shopProductId, shopProducts.id))
        .where(and(
          or(eq(pluginStudioProjects.shopProductId, key), eq(pluginStudioProjects.slug, key)),
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
      let licenseId: string | null = null;
      if (!admin) {
        const [license] = await db.select().from(pluginLicenses).where(and(
          eq(pluginLicenses.userId, user.id),
          eq(pluginLicenses.projectId, project.id),
          eq(pluginLicenses.status, "active"),
        )).limit(1);
        if (!license || license.expiresAt <= new Date()) return res.status(403).json({ message: "An active plugin license is required before downloading this package." });
        licenseId = license.id;
      }
      const release = await getProjectFiles(project.id, "premium");
      if (!release) return res.status(404).json({ message: "Plugin package not found." });
      const archive = archiveFor(release.folderSlug, release.files);
      if (licenseId) {
        await db.insert(pluginLicenseEvents).values({
          projectId: project.id,
          licenseId,
          eventType: "shop_download",
          details: { source: "shop-download" },
        });
      }
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${release.folderSlug}-${project.version}.zip"`);
      res.setHeader("Content-Length", archive.length);
      res.send(archive);
    } catch (error: any) {
      console.error("[plugin-studio] Could not download purchased plugin:", error.message);
      res.status(500).json({ message: "Could not generate the plugin download." });
    }
  });

  app.post("/api/admin/plugin-studio/projects/:id/release", isAuthenticated, releaseUpload.single("zip"), async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const [project] = await db.select().from(pluginStudioProjects).where(eq(pluginStudioProjects.id, req.params.id)).limit(1);
      if (!project) return res.status(404).json({ message: "Plugin project not found." });
      if (!req.file?.buffer) return res.status(400).json({ message: "Choose a premium plugin ZIP to release." });
      const version = String(req.body?.version || "").trim().slice(0, 30);
      const releaseNotes = String(req.body?.releaseNotes || "").trim().slice(0, 8_000);
      if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version) || compareVersions(version, project.version) <= 0) {
        return res.status(400).json({ message: "Enter a semantic version greater than the current version." });
      }
      if (releaseNotes.length < 5) return res.status(400).json({ message: "Add release notes before publishing an update." });
      const zipBytes = new Uint8Array(req.file.buffer);
      if (!validateZipDirectory(zipBytes)) return res.status(400).json({ message: "The ZIP has an invalid or oversized file directory." });
      let filesInZip: ReturnType<typeof unzipSync>;
      try { filesInZip = unzipSync(zipBytes); }
      catch { return res.status(400).json({ message: "The premium update ZIP could not be opened." }); }
      const entries = Object.entries(filesInZip).filter(([path]) => !path.endsWith("/"));
      if (entries.length > 40) return res.status(400).json({ message: "The uploaded archive has too many files." });
      const entryPaths = entries.map(([path]) => path.replace(/\\/g, "/"));
      const hasRootFile = entryPaths.some((path) => !path.includes("/"));
      const roots = new Set(entryPaths.map((path) => path.split("/")[0]));
      const zipRoot = !hasRootFile && roots.size === 1 ? Array.from(roots)[0] : null;
      const premiumFiles: Record<string, string> = {};
      let totalBytes = 0;
      for (const [rawPath, contents] of entries) {
        const normalizedPath = rawPath.replace(/\\/g, "/");
        const segments = normalizedPath.split("/");
        if (segments.some((part) => !part || part === "." || part === "..")) continue;
        const sourcePath = zipRoot && segments[0] === zipRoot ? segments.slice(1).join("/") : normalizedPath;
        const ext = sourcePath.slice(sourcePath.lastIndexOf(".")).toLowerCase();
        if (!sourcePath || ![".php", ".js", ".css"].includes(ext)) continue;
        totalBytes += contents.byteLength;
        if (totalBytes > 120_000) return res.status(400).json({ message: "The uncompressed premium source files exceed the 120 KB limit." });
        premiumFiles[sourcePath] = strFromU8(contents);
        if (Object.keys(premiumFiles).length > 12) return res.status(400).json({ message: "A premium update may contain up to 12 PHP, JavaScript, or CSS files." });
      }
      const hasEntry = Object.entries(premiumFiles).some(([path, source]) =>
        !path.includes("/") && path.toLowerCase().endsWith(".php") && /Plugin Name\s*:/i.test(source));
      if (!hasEntry || !Object.keys(premiumFiles).length) {
        return res.status(400).json({ message: "The ZIP must contain a root-level premium plugin PHP entry file." });
      }
      await db.update(pluginStudioProjects).set({
        version,
        premiumFiles,
        releaseNotes,
        updatedAt: new Date(),
      }).where(eq(pluginStudioProjects.id, project.id));
      res.json({ success: true, version, releaseNotes });
    } catch (error: any) {
      console.error("[plugin-studio] Could not publish update:", error.message);
      res.status(400).json({ message: "Could not read that ZIP. Upload a valid WordPress premium plugin package." });
    }
  });

  registerPluginLicenseRoutes(app, {
    buildPremiumArchive: async (projectId) => {
      const release = await getProjectFiles(projectId, "premium");
      if (!release) return null;
      return {
        filename: `${release.folderSlug}-${release.project.version}.zip`,
        bytes: archiveFor(release.folderSlug, release.files),
      };
    },
  });
}
