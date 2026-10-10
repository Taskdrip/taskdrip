import type { Express } from "express";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual, hkdfSync } from "node:crypto";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import {
  pluginLicenseEvents,
  pluginLicenses,
  pluginLicenseSites,
  pluginStudioProjects,
  pluginSupportMessages,
  pluginSupportThreads,
  purchases,
  shopProducts,
  users,
} from "@shared/schema";
import { db } from "./db";
import { isAuthenticated } from "./auth";
import { sendEmail } from "./email-service";

const DAY = 24 * 60 * 60 * 1000;
const MAX_SUPPORT_MESSAGE = 8_000;

function isAdmin(user: any): boolean {
  return user?.role === "admin" || user?.userType === "admin";
}

function secretKey(purpose: string): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for Taskdrip plugin licensing.");
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(secret),
    Buffer.from("taskdrip-plugin-licensing-v1"),
    Buffer.from(purpose),
    32,
  ));
}

function hashLicenseKey(value: string): string {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

function encryptLicenseKey(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey("license-key-encryption"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptLicenseKey(value: string): string {
  const [version, ivPart, tagPart, encryptedPart] = value.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !encryptedPart) throw new Error("Stored license key cannot be decrypted.");
  const decipher = createDecipheriv("aes-256-gcm", secretKey("license-key-encryption"), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
}

function makeLicenseKey(slug: string): string {
  const prefix = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8) || "PLUGIN";
  return `TD-${prefix}-${randomBytes(18).toString("hex").toUpperCase()}`;
}

function addPeriod(from: Date, cadence: "monthly" | "yearly"): Date {
  const result = new Date(from);
  const dayOfMonth = result.getUTCDate();
  result.setUTCDate(1);
  if (cadence === "monthly") result.setUTCMonth(result.getUTCMonth() + 1);
  else result.setUTCFullYear(result.getUTCFullYear() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(dayOfMonth, lastDay));
  return result;
}

function validCadence(value: unknown): value is "monthly" | "yearly" {
  return value === "monthly" || value === "yearly";
}

function cleanSiteUrl(value: unknown): string | null {
  try {
    const parsed = new URL(String(value || ""));
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

function bumpEvent(projectId: string, eventType: string, licenseId?: string | null, installationId?: string | null, details: Record<string, unknown> = {}) {
  return db.insert(pluginLicenseEvents).values({
    projectId,
    licenseId: licenseId || null,
    installationId: installationId || null,
    eventType,
    details,
  });
}

function signDownloadToken(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secretKey("update-download-token")).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readDownloadToken(token: string): Record<string, any> | null {
  try {
    const [encoded, suppliedSignature] = token.split(".");
    if (!encoded || !suppliedSignature) return null;
    const expected = createHmac("sha256", secretKey("update-download-token")).update(encoded).digest();
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const parse = (value: string) => value.split("-")[0].split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference) return difference > 0 ? 1 : -1;
  }
  return 0;
}

function publicAppUrl(): string {
  const configuredUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://taskdrip.online";
  try {
    const parsed = new URL(configuredUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.origin;
  } catch {
    // Use the Taskdrip canonical URL when an invalid public URL is configured.
  }
  return "https://taskdrip.online";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string);
}

export async function activatePluginLicenseForPurchase(purchaseId: string): Promise<{ issued: boolean; licenseId?: string }> {
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
  if (!purchase || !["paid", "approved", "delivered"].includes(purchase.status)) return { issued: false };

  const [existingLicense] = await db.select({ id: pluginLicenses.id })
    .from(pluginLicenses).where(eq(pluginLicenses.purchaseId, purchase.id)).limit(1);
  if (existingLicense) return { issued: false, licenseId: existingLicense.id };

  const [project] = await db.select().from(pluginStudioProjects)
    .where(eq(pluginStudioProjects.shopProductId, purchase.productId)).limit(1);
  if (!project) return { issued: false };

  const [product] = await db.select().from(shopProducts).where(eq(shopProducts.id, purchase.productId)).limit(1);
  const selectedPlan = purchase.selectedAddons?.[0];
  const cadence = selectedPlan?.id === "plugin-monthly" ? "monthly"
    : selectedPlan?.id === "plugin-yearly" ? "yearly" : null;
  if (!product || !cadence) return { issued: false };

  const key = makeLicenseKey(project.slug);
  const now = new Date();
  const activeLicenses = await db.select().from(pluginLicenses).where(and(
    eq(pluginLicenses.userId, purchase.userId),
    eq(pluginLicenses.projectId, project.id),
    eq(pluginLicenses.status, "active"),
  ));
  const existingExpiry = activeLicenses.reduce<Date | null>((latest, license) =>
    license.expiresAt > now && (!latest || license.expiresAt > latest) ? license.expiresAt : latest, null);
  const startsAt = existingExpiry || now;
  const expiresAt = addPeriod(startsAt, cadence);

  let created: typeof pluginLicenses.$inferSelect;
  try {
    created = await db.transaction(async (tx) => {
      if (activeLicenses.length) {
        await tx.update(pluginLicenses).set({ status: "superseded", updatedAt: now }).where(and(
          eq(pluginLicenses.userId, purchase.userId),
          eq(pluginLicenses.projectId, project.id),
          eq(pluginLicenses.status, "active"),
        ));
      }
      const [license] = await tx.insert(pluginLicenses).values({
        userId: purchase.userId,
        projectId: project.id,
        productId: product.id,
        purchaseId: purchase.id,
        keyHash: hashLicenseKey(key),
        keyEncrypted: encryptLicenseKey(key),
        keyPrefix: key.slice(0, 12),
        cadence,
        status: "active",
        startsAt,
        expiresAt,
        maxActivations: project.maxActivations || 3,
      }).returning();
      await tx.insert(pluginLicenseEvents).values({
        licenseId: license.id,
        projectId: project.id,
        eventType: "license_issued",
        details: { cadence, expiresAt: expiresAt.toISOString() },
      });
      return license;
    });
  } catch (error: any) {
    const [raced] = await db.select({ id: pluginLicenses.id })
      .from(pluginLicenses).where(eq(pluginLicenses.purchaseId, purchase.id)).limit(1);
    if (raced) return { issued: false, licenseId: raced.id };
    throw error;
  }

  const [buyer] = await db.select({ email: users.email, firstName: users.firstName })
    .from(users).where(eq(users.id, purchase.userId)).limit(1);
  if (buyer?.email) {
    const appUrl = publicAppUrl();
    const orderUrl = `${appUrl}/orders/${encodeURIComponent(purchase.id)}`;
    const pluginsUrl = `${appUrl}/my-plugins?license=${encodeURIComponent(created.id)}#support`;
    const safeName = escapeHtml(project.name);
    const safeBuyerName = escapeHtml(buyer.firstName || "there");
    const safeCadence = escapeHtml(cadence);
    const safeKey = escapeHtml(key);
    const safeExpiry = escapeHtml(expiresAt.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }));
    const safeOrderUrl = escapeHtml(orderUrl);
    const safePluginsUrl = escapeHtml(pluginsUrl);
    await sendEmail({
      to: buyer.email,
      toName: buyer.firstName || undefined,
      subject: `${project.name}: your license is approved and ready`,
      text: [
        `Hi ${buyer.firstName || "there"},`,
        `Your ${cadence} license for ${project.name} has been approved.`,
        `License key: ${key}`,
        `Valid until: ${safeExpiry}`,
        `View your order, download the premium plugin, and manage renewal: ${orderUrl}`,
        `Open developer support: ${pluginsUrl}`,
        `In WordPress, install the free core plugin and the premium ZIP, then open Settings → Plugin License to activate this key.`,
        "Taskdrip Support: support@taskdrip.online",
      ].join("\n\n"),
      html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f4f8;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f8;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7e9f1;">
          <tr>
            <td style="padding:24px 30px;background:#17152f;background-image:linear-gradient(120deg,#17152f,#39247b);">
              <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;color:#ffffff;">Taskdrip<span style="color:#b9a5ff;">™</span></div>
              <div style="margin-top:5px;font-size:12px;letter-spacing:1.3px;color:#d6d0f3;">CREATOR TOOLS · PLUGIN STUDIO</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px 20px;">
              <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e9f8ef;color:#187443;font-size:11px;font-weight:700;letter-spacing:.5px;">PAYMENT APPROVED</div>
              <h1 style="margin:18px 0 8px;font-size:25px;line-height:1.25;color:#17152f;">Your plugin license is ready, ${safeBuyerName}</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#586174;">Your <strong>${safeCadence}</strong> license for <strong>${safeName}</strong> is active. Keep this email for your license key and use the button below to manage your purchase.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f6fc;border:1px solid #e5e0f5;border-radius:12px;">
                <tr><td style="padding:16px 18px 8px;font-size:12px;font-weight:700;color:#62578d;text-transform:uppercase;letter-spacing:.6px;">Your WordPress license key</td></tr>
                <tr><td style="padding:0 18px 16px;">
                  <div style="padding:13px 14px;border-radius:8px;background:#211d3c;color:#ffffff;font-family:Consolas,'Courier New',monospace;font-size:14px;line-height:1.55;word-break:break-all;">${safeKey}</div>
                  <p style="margin:10px 0 0;font-size:13px;color:#5d6475;"><strong>Valid through:</strong> ${safeExpiry} · ${safeCadence} plan</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 12px;">
              <a href="${safeOrderUrl}" style="display:block;padding:14px 18px;border-radius:10px;background:#6c45d9;color:#ffffff;text-align:center;text-decoration:none;font-size:15px;font-weight:700;">View order, downloads &amp; renewal</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 30px 24px;font-size:13px;line-height:1.7;color:#596174;">
              <p style="margin:0 0 10px;"><strong>Activate in WordPress:</strong> install the free Core plugin first, then install the Premium ZIP. In your WordPress dashboard, open <strong>Settings → Plugin License</strong>, paste the key above, and select <strong>Activate license</strong>.</p>
              <p style="margin:0;">Need help or want to message the developer? <a href="${safePluginsUrl}" style="color:#6242c7;font-weight:700;">Open your developer support chat</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 30px;background:#f8f8fb;border-top:1px solid #ececf2;font-size:11px;line-height:1.65;color:#858b9b;">
              This license does not renew automatically. Renew it before the validity date from your order page to avoid interruption.<br>
              Questions? <a href="mailto:support@taskdrip.online" style="color:#6242c7;">support@taskdrip.online</a> · <a href="${safePluginsUrl}" style="color:#6242c7;">My Plugins</a>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-size:11px;color:#9298a8;">Taskdrip · Creator tools and digital products</p>
      </td></tr>
    </table>
  </body>
</html>`,
    }).catch((error) => console.warn("[plugin-license] License email could not be sent; key remains in My Plugins:", error?.message || error));
  }
  return { issued: true, licenseId: created.id };
}

export async function getPluginLicenseSummaryForPurchase(purchaseId: string, userId: string) {
  const [row] = await db.select({
    license: pluginLicenses,
    projectName: pluginStudioProjects.name,
    projectSlug: pluginStudioProjects.slug,
    projectVersion: pluginStudioProjects.version,
  }).from(pluginLicenses)
    .innerJoin(pluginStudioProjects, eq(pluginLicenses.projectId, pluginStudioProjects.id))
    .where(and(
      eq(pluginLicenses.purchaseId, purchaseId),
      eq(pluginLicenses.userId, userId),
    ))
    .limit(1);

  if (!row) return null;
  const status = row.license.status === "active" && row.license.expiresAt <= new Date()
    ? "expired"
    : row.license.status;
  return {
    id: row.license.id,
    status,
    cadence: row.license.cadence,
    startsAt: row.license.startsAt,
    expiresAt: row.license.expiresAt,
    maxActivations: row.license.maxActivations,
    keyPrefix: row.license.keyPrefix,
    project: {
      name: row.projectName,
      slug: row.projectSlug,
      version: row.projectVersion,
    },
  };
}

async function sendExpiryReminders(): Promise<void> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * DAY);
  const rows = await db.select({
    license: pluginLicenses,
    projectName: pluginStudioProjects.name,
    email: users.email,
    firstName: users.firstName,
  }).from(pluginLicenses)
    .innerJoin(pluginStudioProjects, eq(pluginLicenses.projectId, pluginStudioProjects.id))
    .innerJoin(users, eq(pluginLicenses.userId, users.id))
    .where(and(inArray(pluginLicenses.status, ["active", "expired"]), lte(pluginLicenses.expiresAt, horizon)));

  for (const row of rows) {
    const daysLeft = Math.ceil((row.license.expiresAt.getTime() - now.getTime()) / DAY);
    const stage = daysLeft <= 0 ? "expired" : daysLeft <= 1 ? "1day" : "7day";
    if (row.license.reminderStage === stage || (stage === "7day" && row.license.reminderStage)) continue;
    if (daysLeft <= 0) {
      await db.update(pluginLicenses).set({ status: "expired", updatedAt: now }).where(eq(pluginLicenses.id, row.license.id));
    }
    const result = await sendEmail({
      to: row.email,
      toName: row.firstName || undefined,
      subject: stage === "expired"
        ? `${row.projectName}: your plugin license has expired`
        : `${row.projectName}: your plugin license expires ${daysLeft === 1 ? "tomorrow" : "in 7 days"}`,
      text: stage === "expired"
        ? `Your ${row.projectName} license has expired and premium plugin features are locked. Sign in to Taskdrip, open My Plugins, and renew the license.`
        : `Your ${row.projectName} license expires in ${daysLeft} day(s). Renew it from My Plugins to avoid interruption.`,
      html: stage === "expired"
        ? `<p>Your <strong>${row.projectName}</strong> license has expired and premium plugin features are locked.</p><p>Sign in to Taskdrip, open My Plugins, and renew the license.</p>`
        : `<p>Your <strong>${row.projectName}</strong> license expires in ${daysLeft} day(s).</p><p>Renew it from My Plugins to avoid interruption.</p>`,
    });
    if (result.success) {
      await db.update(pluginLicenses).set({ reminderStage: stage, updatedAt: now }).where(eq(pluginLicenses.id, row.license.id));
    }
  }
}

let reminderWorkerStarted = false;
export function registerPluginLicenseRoutes(
  app: Express,
  options: {
    buildPremiumArchive: (projectId: string) => Promise<{ filename: string; bytes: Uint8Array } | null>;
  },
): void {
  app.get("/api/my/plugin-licenses", isAuthenticated, async (req: any, res) => {
    try {
      const rows = await db.select({
        license: pluginLicenses,
        project: pluginStudioProjects,
        product: shopProducts,
      }).from(pluginLicenses)
        .innerJoin(pluginStudioProjects, eq(pluginLicenses.projectId, pluginStudioProjects.id))
        .innerJoin(shopProducts, eq(pluginLicenses.productId, shopProducts.id))
        .where(eq(pluginLicenses.userId, req.user.id))
        .orderBy(desc(pluginLicenses.createdAt));
      const licenseIds = rows.map((row) => row.license.id);
      const sites = licenseIds.length
        ? await db.select().from(pluginLicenseSites).where(inArray(pluginLicenseSites.licenseId, licenseIds))
        : [];
      const events = licenseIds.length
        ? await db.select({
            licenseId: pluginLicenseEvents.licenseId,
            eventType: pluginLicenseEvents.eventType,
            total: sql<number>`count(*)::int`,
          }).from(pluginLicenseEvents)
            .where(inArray(pluginLicenseEvents.licenseId, licenseIds))
            .groupBy(pluginLicenseEvents.licenseId, pluginLicenseEvents.eventType)
        : [];
      const threads = licenseIds.length
        ? await db.select().from(pluginSupportThreads)
          .where(and(eq(pluginSupportThreads.userId, req.user.id), inArray(pluginSupportThreads.licenseId, licenseIds)))
          .orderBy(desc(pluginSupportThreads.updatedAt))
        : [];
      const threadIds = threads.map((thread) => thread.id);
      const messages = threadIds.length
        ? await db.select().from(pluginSupportMessages).where(inArray(pluginSupportMessages.threadId, threadIds))
          .orderBy(pluginSupportMessages.createdAt)
        : [];
      const messageGroups = new Map<string, typeof messages>();
      messages.forEach((message) => messageGroups.set(message.threadId, [...(messageGroups.get(message.threadId) || []), message]));
      const siteGroups = new Map<string, typeof sites>();
      sites.forEach((site) => siteGroups.set(site.licenseId, [...(siteGroups.get(site.licenseId) || []), site]));
      const usageByLicense = new Map<string, Record<string, number>>();
      events.forEach((event) => {
        if (!event.licenseId) return;
        usageByLicense.set(event.licenseId, {
          ...(usageByLicense.get(event.licenseId) || {}),
          [event.eventType]: Number(event.total),
        });
      });
      res.json(rows.map(({ license, project, product }) => ({
        id: license.id,
        status: license.expiresAt <= new Date() && license.status === "active" ? "expired" : license.status,
        cadence: license.cadence,
        keyPrefix: license.keyPrefix,
        startsAt: license.startsAt,
        expiresAt: license.expiresAt,
        maxActivations: license.maxActivations,
        project: { id: project.id, slug: project.slug, name: project.name, version: project.version, status: project.status },
        product: { id: product.id, title: product.title, serviceAddons: product.serviceAddons },
        sites: (siteGroups.get(license.id) || []).filter((site) => site.status === "active"),
        usage: usageByLicense.get(license.id) || {},
        threads: threads.filter((thread) => thread.licenseId === license.id)
          .map((thread) => ({ ...thread, messages: messageGroups.get(thread.id) || [] })),
      })));
    } catch (error: any) {
      console.error("[plugin-license] Could not load customer licenses:", error.message);
      res.status(500).json({ message: "Could not load your plugin licenses." });
    }
  });

  app.post("/api/my/plugin-licenses/:id/reveal", isAuthenticated, async (req: any, res) => {
    try {
      const [license] = await db.select().from(pluginLicenses).where(and(
        eq(pluginLicenses.id, req.params.id),
        eq(pluginLicenses.userId, req.user.id),
      )).limit(1);
      if (!license) return res.status(404).json({ message: "License not found." });
      res.json({ licenseKey: decryptLicenseKey(license.keyEncrypted) });
    } catch (error: any) {
      console.error("[plugin-license] Could not reveal license:", error.message);
      res.status(500).json({ message: "Could not retrieve the license key. Contact Taskdrip support." });
    }
  });

  app.post("/api/my/plugin-licenses/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const [license] = await db.select().from(pluginLicenses).where(and(
        eq(pluginLicenses.id, req.params.id),
        eq(pluginLicenses.userId, req.user.id),
        eq(pluginLicenses.status, "active"),
      )).limit(1);
      if (!license || license.expiresAt <= new Date()) {
        return res.status(403).json({ message: "An active plugin license is required to download this package." });
      }
      const archive = await options.buildPremiumArchive(license.projectId);
      if (!archive) return res.status(404).json({ message: "Plugin package not found." });
      await bumpEvent(license.projectId, "shop_download", license.id);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${archive.filename}"`);
      res.setHeader("Content-Length", archive.bytes.length);
      res.send(Buffer.from(archive.bytes));
    } catch (error: any) {
      console.error("[plugin-license] Could not download plugin:", error.message);
      res.status(500).json({ message: "Could not download the plugin package." });
    }
  });

  app.post("/api/my/plugin-licenses/:id/support", isAuthenticated, async (req: any, res) => {
    try {
      const [license] = await db.select().from(pluginLicenses).where(and(
        eq(pluginLicenses.id, req.params.id),
        eq(pluginLicenses.userId, req.user.id),
      )).limit(1);
      if (!license) return res.status(404).json({ message: "License not found." });
      const content = String(req.body?.content || "").trim().slice(0, MAX_SUPPORT_MESSAGE);
      const subject = String(req.body?.subject || "").trim().slice(0, 180);
      const requestType = req.body?.requestType === "update_request" ? "update_request" : "support";
      if (content.length < 2 || !subject) return res.status(400).json({ message: "Add a subject and message." });
      const [project] = await db.select().from(pluginStudioProjects).where(eq(pluginStudioProjects.id, license.projectId)).limit(1);
      const [thread] = await db.insert(pluginSupportThreads).values({
        licenseId: license.id,
        projectId: license.projectId,
        userId: req.user.id,
        developerId: project?.createdBy || null,
        requestType,
        subject,
      }).returning();
      const [message] = await db.insert(pluginSupportMessages).values({
        threadId: thread.id,
        senderId: req.user.id,
        content,
      }).returning();
      res.status(201).json({ ...thread, messages: [message] });
    } catch (error: any) {
      console.error("[plugin-license] Could not start support conversation:", error.message);
      res.status(500).json({ message: "Could not start the support conversation." });
    }
  });

  app.get("/api/admin/plugin-studio/licensing", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ message: "Admin access required." });
    try {
      const projects = await db.select({
        project: pluginStudioProjects,
        product: shopProducts,
      }).from(pluginStudioProjects)
        .leftJoin(shopProducts, eq(pluginStudioProjects.shopProductId, shopProducts.id))
        .orderBy(desc(pluginStudioProjects.createdAt));
      const licenses = await db.select({
        license: pluginLicenses,
        buyerEmail: users.email,
        projectName: pluginStudioProjects.name,
      }).from(pluginLicenses)
        .innerJoin(users, eq(pluginLicenses.userId, users.id))
        .innerJoin(pluginStudioProjects, eq(pluginLicenses.projectId, pluginStudioProjects.id))
        .orderBy(desc(pluginLicenses.createdAt));
      const sites = await db.select().from(pluginLicenseSites);
      const events = await db.select({
        projectId: pluginLicenseEvents.projectId,
        eventType: pluginLicenseEvents.eventType,
        total: sql<number>`count(*)::int`,
      }).from(pluginLicenseEvents).groupBy(pluginLicenseEvents.projectId, pluginLicenseEvents.eventType);
      const productIds = projects.flatMap(({ product }) => product?.id ? [product.id] : []);
      const paidPurchases = productIds.length
        ? await db.select({
            productId: purchases.productId,
            amount: purchases.amount,
            selectedAddons: purchases.selectedAddons,
          }).from(purchases).where(and(
            inArray(purchases.productId, productIds),
            inArray(purchases.status, ["paid", "approved", "delivered"]),
          ))
        : [];
      const projectByProduct = new Map(
        projects.flatMap(({ project, product }) => product?.id ? [[product.id, project.id] as const] : []),
      );
      const salesByProject = new Map<string, { salesCount: number; revenueUsd: number }>();
      for (const purchase of paidPurchases) {
        if (!purchase.selectedAddons?.some((plan) => plan.id === "plugin-monthly" || plan.id === "plugin-yearly")) continue;
        const projectId = projectByProduct.get(purchase.productId);
        if (!projectId) continue;
        const current = salesByProject.get(projectId) || { salesCount: 0, revenueUsd: 0 };
        current.salesCount += 1;
        current.revenueUsd += Number(purchase.amount) || 0;
        salesByProject.set(projectId, current);
      }
      const siteCount = new Map<string, number>();
      sites.filter((site) => site.status === "active").forEach((site) => siteCount.set(site.licenseId, (siteCount.get(site.licenseId) || 0) + 1));
      const eventCount = new Map<string, Record<string, number>>();
      events.forEach((event) => eventCount.set(event.projectId, {
        ...(eventCount.get(event.projectId) || {}),
        [event.eventType]: Number(event.total),
      }));
      res.json({
        totals: {
          licenses: licenses.length,
          activeLicenses: licenses.filter((row) => row.license.status === "active" && row.license.expiresAt > new Date()).length,
          activeInstalls: sites.filter((site) => site.status === "active").length,
          trackedEvents: events.reduce((sum, event) => sum + Number(event.total), 0),
          pluginSales: Array.from(salesByProject.values()).reduce((sum, sales) => sum + sales.salesCount, 0),
          revenueUsd: Math.round(Array.from(salesByProject.values()).reduce((sum, sales) => sum + sales.revenueUsd, 0) * 100) / 100,
        },
        projects: projects.map(({ project }) => ({
          id: project.id,
          name: project.name,
          slug: project.slug,
          version: project.version,
          status: project.status,
          salesCount: salesByProject.get(project.id)?.salesCount || 0,
          revenueUsd: Math.round((salesByProject.get(project.id)?.revenueUsd || 0) * 100) / 100,
          activeLicenses: licenses.filter((row) => row.license.projectId === project.id && row.license.status === "active" && row.license.expiresAt > new Date()).length,
          installs: sites.filter((site) => site.status === "active" && licenses.some((row) => row.license.id === site.licenseId && row.license.projectId === project.id)).length,
          usage: eventCount.get(project.id) || {},
        })),
        licenses: licenses.map(({ license, buyerEmail, projectName }) => ({
          id: license.id,
          projectName,
          buyerEmail,
          status: license.expiresAt <= new Date() && license.status === "active" ? "expired" : license.status,
          cadence: license.cadence,
          keyPrefix: license.keyPrefix,
          expiresAt: license.expiresAt,
          activeInstalls: siteCount.get(license.id) || 0,
          maxActivations: license.maxActivations,
        })),
      });
    } catch (error: any) {
      console.error("[plugin-license] Could not load admin metrics:", error.message);
      res.status(500).json({ message: "Could not load plugin license metrics." });
    }
  });

  app.get("/api/admin/plugin-studio/support", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ message: "Admin access required." });
    try {
      const threads = await db.select({
        thread: pluginSupportThreads,
        projectName: pluginStudioProjects.name,
        buyerEmail: users.email,
      }).from(pluginSupportThreads)
        .innerJoin(pluginStudioProjects, eq(pluginSupportThreads.projectId, pluginStudioProjects.id))
        .innerJoin(users, eq(pluginSupportThreads.userId, users.id))
        .orderBy(desc(pluginSupportThreads.updatedAt));
      const threadIds = threads.map((row) => row.thread.id);
      const messages = threadIds.length
        ? await db.select().from(pluginSupportMessages).where(inArray(pluginSupportMessages.threadId, threadIds))
          .orderBy(pluginSupportMessages.createdAt)
        : [];
      res.json(threads.map(({ thread, projectName, buyerEmail }) => ({
        ...thread,
        projectName,
        buyerEmail,
        messages: messages.filter((message) => message.threadId === thread.id),
      })));
    } catch (error: any) {
      console.error("[plugin-license] Could not load support inbox:", error.message);
      res.status(500).json({ message: "Could not load the plugin support inbox." });
    }
  });

  app.patch("/api/admin/plugin-studio/licenses/:id/revoke", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ message: "Admin access required." });
    try {
      const [license] = await db.select().from(pluginLicenses).where(eq(pluginLicenses.id, req.params.id)).limit(1);
      if (!license) return res.status(404).json({ message: "License not found." });
      if (license.status !== "active") return res.status(409).json({ message: "Only active licenses can be revoked." });
      await db.update(pluginLicenses).set({ status: "revoked", updatedAt: new Date() }).where(eq(pluginLicenses.id, license.id));
      await bumpEvent(license.projectId, "license_revoked", license.id);
      res.json({ success: true, status: "revoked" });
    } catch (error: any) {
      console.error("[plugin-license] Could not revoke license:", error.message);
      res.status(500).json({ message: "Could not revoke this license." });
    }
  });

  app.post("/api/plugin-support/:threadId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const [thread] = await db.select().from(pluginSupportThreads).where(eq(pluginSupportThreads.id, req.params.threadId)).limit(1);
      if (!thread || (!isAdmin(req.user) && thread.userId !== req.user.id)) {
        return res.status(404).json({ message: "Support conversation not found." });
      }
      const content = String(req.body?.content || "").trim().slice(0, MAX_SUPPORT_MESSAGE);
      if (content.length < 2) return res.status(400).json({ message: "Enter a message." });
      const [message] = await db.insert(pluginSupportMessages).values({
        threadId: thread.id,
        senderId: req.user.id,
        content,
      }).returning();
      await db.update(pluginSupportThreads).set({ updatedAt: new Date() }).where(eq(pluginSupportThreads.id, thread.id));
      res.status(201).json(message);
    } catch (error: any) {
      console.error("[plugin-license] Could not send support message:", error.message);
      res.status(500).json({ message: "Could not send the support message." });
    }
  });

  app.post("/api/plugin-license/:slug/:action", async (req, res) => {
    const action = String(req.params.action);
    if (!["activate", "verify", "deactivate", "check-update"].includes(action)) {
      return res.status(404).json({ message: "Unknown license action." });
    }
    try {
      const slug = String(req.params.slug).slice(0, 80);
      const [project] = await db.select().from(pluginStudioProjects).where(eq(pluginStudioProjects.slug, slug)).limit(1);
      if (!project) return res.status(404).json({ valid: false, status: "plugin_not_found" });
      const key = String(req.body?.licenseKey || "").trim().toUpperCase().slice(0, 160);
      const installationId = String(req.body?.installationId || "").trim().slice(0, 120);
      if (!key || !/^[A-Za-z0-9_-]{12,120}$/.test(installationId)) {
        return res.status(400).json({ valid: false, status: "invalid_request" });
      }
      const [license] = await db.select().from(pluginLicenses).where(and(
        eq(pluginLicenses.keyHash, hashLicenseKey(key)),
        eq(pluginLicenses.projectId, project.id),
      )).limit(1);
      const now = new Date();
      if (!license) return res.status(200).json({ valid: false, status: "invalid_key" });
      const [site] = await db.select().from(pluginLicenseSites).where(and(
        eq(pluginLicenseSites.licenseId, license.id),
        eq(pluginLicenseSites.installationId, installationId),
      )).limit(1);
      if (action === "deactivate") {
        if (site) await db.update(pluginLicenseSites).set({ status: "inactive", updatedAt: now, lastSeenAt: now }).where(eq(pluginLicenseSites.id, site.id));
        await bumpEvent(project.id, "deactivated", license.id, installationId);
        return res.json({ valid: false, status: "deactivated" });
      }
      if (license.status !== "active") return res.status(200).json({ valid: false, status: license.status });
      if (license.expiresAt <= now) {
        await db.update(pluginLicenses).set({ status: "expired", updatedAt: now }).where(eq(pluginLicenses.id, license.id));
        return res.status(200).json({ valid: false, status: "expired", expiresAt: license.expiresAt });
      }
      const siteUrl = cleanSiteUrl(req.body?.siteUrl);
      if (!siteUrl) return res.status(400).json({ valid: false, status: "invalid_site_url" });
      if ((action === "verify" || action === "check-update") && (!site || site.status !== "active")) {
        return res.status(200).json({ valid: false, status: "not_activated" });
      }
      if (action === "activate" && (!site || site.status !== "active")) {
        const activeSites = await db.select({ id: pluginLicenseSites.id }).from(pluginLicenseSites).where(and(
          eq(pluginLicenseSites.licenseId, license.id),
          eq(pluginLicenseSites.status, "active"),
        ));
        if (activeSites.length >= license.maxActivations) {
          return res.status(200).json({ valid: false, status: "activation_limit", activeSites: activeSites.length, maxActivations: license.maxActivations });
        }
      }
      const values = {
        siteUrl,
        pluginVersion: String(req.body?.pluginVersion || "").slice(0, 30) || null,
        wordpressVersion: String(req.body?.wordpressVersion || "").slice(0, 30) || null,
        status: "active",
        lastSeenAt: now,
        updatedAt: now,
      };
      if (site) {
        await db.update(pluginLicenseSites).set(values).where(eq(pluginLicenseSites.id, site.id));
      } else {
        await db.insert(pluginLicenseSites).values({ licenseId: license.id, installationId, ...values });
      }
      const eventType = action === "activate" ? "activated" : action === "check-update" ? "update_check" : "heartbeat";
      await bumpEvent(project.id, eventType, license.id, installationId, {
        pluginVersion: values.pluginVersion || "",
        wordpressVersion: values.wordpressVersion || "",
      });

      const response: Record<string, any> = {
        valid: true,
        status: "active",
        expiresAt: license.expiresAt.toISOString(),
        maxActivations: license.maxActivations,
        activeSites: (await db.select({ id: pluginLicenseSites.id }).from(pluginLicenseSites).where(and(
          eq(pluginLicenseSites.licenseId, license.id),
          eq(pluginLicenseSites.status, "active"),
        ))).length,
      };
      if (action === "check-update") {
        if (compareVersions(project.version, values.pluginVersion || "0.0.0") > 0) {
          if (!project.licenseApiBaseUrl) return res.status(503).json({ valid: true, status: "server_url_unconfigured" });
          const token = signDownloadToken({
            licenseId: license.id,
            projectId: project.id,
            installationId,
            exp: Date.now() + 5 * 60 * 1000,
          });
          const apiBase = project.licenseApiBaseUrl.replace(/\/+$/, "");
          response.update = {
            version: project.version,
            changelog: project.releaseNotes || "",
            package: `${apiBase}/api/plugin-license/download/${token}`,
          };
        }
      }
      return res.json(response);
    } catch (error: any) {
      console.error("[plugin-license] Public license request failed:", error.message);
      return res.status(500).json({ valid: false, status: "server_error" });
    }
  });

  app.get("/api/plugin-license/download/:token", async (req, res) => {
    try {
      const payload = readDownloadToken(String(req.params.token || ""));
      if (!payload?.licenseId || !payload?.projectId || !payload?.installationId) {
        return res.status(403).json({ message: "This update link has expired. Check for updates again in WordPress." });
      }
      const [license] = await db.select().from(pluginLicenses).where(and(
        eq(pluginLicenses.id, String(payload.licenseId)),
        eq(pluginLicenses.projectId, String(payload.projectId)),
        eq(pluginLicenses.status, "active"),
      )).limit(1);
      if (!license || license.expiresAt <= new Date()) {
        return res.status(403).json({ message: "An active plugin license is required for this update." });
      }
      const [site] = await db.select().from(pluginLicenseSites).where(and(
        eq(pluginLicenseSites.licenseId, license.id),
        eq(pluginLicenseSites.installationId, String(payload.installationId)),
        eq(pluginLicenseSites.status, "active"),
      )).limit(1);
      if (!site) return res.status(403).json({ message: "This WordPress installation is no longer activated." });
      const archive = await options.buildPremiumArchive(license.projectId);
      if (!archive) return res.status(404).json({ message: "Plugin update package not found." });
      await bumpEvent(license.projectId, "update_download", license.id, site.installationId);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${archive.filename}"`);
      res.setHeader("Content-Length", archive.bytes.length);
      res.send(Buffer.from(archive.bytes));
    } catch (error: any) {
      console.error("[plugin-license] Could not deliver update package:", error.message);
      res.status(500).json({ message: "Could not deliver the plugin update." });
    }
  });

  if (!reminderWorkerStarted) {
    reminderWorkerStarted = true;
    const run = () => sendExpiryReminders().catch((error) =>
      console.error("[plugin-license] Renewal reminder sweep failed:", error?.message || error));
    setTimeout(run, 30_000).unref?.();
    setInterval(run, 6 * 60 * 60 * 1000).unref?.();
  }
}

export async function getPluginLicenseKeyForOwner(licenseId: string, userId: string): Promise<string | null> {
  const [license] = await db.select().from(pluginLicenses).where(and(
    eq(pluginLicenses.id, licenseId),
    eq(pluginLicenses.userId, userId),
  )).limit(1);
  return license ? decryptLicenseKey(license.keyEncrypted) : null;
}

export async function findPluginProjectByProduct(productId: string) {
  const [project] = await db.select().from(pluginStudioProjects)
    .where(eq(pluginStudioProjects.shopProductId, productId)).limit(1);
  return project || null;
}
