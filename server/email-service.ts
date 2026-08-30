import nodemailer from "nodemailer";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db } from "./db";
import { emailSettings, emailLogs, emailCampaigns, users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

export const TASKDRIP_EMAILS = {
  info: "info@taskdrip.online",
  developer: "developer@taskdrip.online",
  support: "support@taskdrip.online",
  payments: "payments@taskdrip.online",
  admin: "taskdrip@gmail.com",
} as const;

export interface EmailOptions {
  to: string;
  cc?: string[];
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  campaignId?: string;
  autoResponderId?: string;
}

export async function getEmailSettings() {
  const rows = await db.select().from(emailSettings).limit(1);
  return rows[0] || null;
}

export function buildTransporter(settings: any) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpSsl || false,
    requireTLS: settings.smtpTls !== false,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function getEmailStatus(): Promise<{
  configured: boolean; provider: string; smtpHost?: string;
  sendgridAvailable: boolean; resendAvailable: boolean;
  preferredProvider?: string; smtpIsBrevo?: boolean; resendKeyPresent: boolean;
}> {
  let settings: any = null;
  try {
    settings = await getEmailSettings();
  } catch (e: any) {
    console.warn("[email] getEmailStatus: could not read email_settings:", e.message);
  }
  const smtpOk = !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpPass);
  const sendgridOk = !!process.env.SENDGRID_API_KEY;
  const resendOk = !!process.env.RESEND_API_KEY;
  const resendConnectionOk = !!process.env.REPLIT_CONNECTORS_HOSTNAME;
  const pref = (settings as any)?.preferredProvider || "";
  const smtpIsBrevo = !!(settings?.smtpHost && settings.smtpHost.toLowerCase().includes("brevo"));

  // Respect admin's explicit provider preference, then fall back to auto-priority
  // Special rule: if Resend key is present and pref is "smtp" with brevo host, auto-switch to Resend
  let activeProvider: string;
  if (pref === "resend" && (resendOk || resendConnectionOk)) activeProvider = "resend";
  else if (pref === "smtp" && smtpOk && !smtpIsBrevo) activeProvider = "smtp";
  else if (pref === "sendgrid" && sendgridOk) activeProvider = "sendgrid";
  else activeProvider = (resendOk || resendConnectionOk) ? "resend" : smtpOk ? "smtp" : sendgridOk ? "sendgrid" : "none";

  return {
    configured: activeProvider !== "none",
    provider: activeProvider,
    smtpHost: settings?.smtpHost ?? undefined,
    sendgridAvailable: sendgridOk,
    resendAvailable: resendOk || resendConnectionOk,
    preferredProvider: pref || undefined,
    smtpIsBrevo,
    resendKeyPresent: resendOk || resendConnectionOk,
  };
}

/** Call on startup: if RESEND_API_KEY is present and preferred provider is not already set
 *  to a non-brevo SMTP, set preferred to "resend" automatically. */
export async function activateResendIfAvailable(): Promise<void> {
  if (!process.env.RESEND_API_KEY && !process.env.REPLIT_CONNECTORS_HOSTNAME) return;
  try {
    let settings: any = null;
    try { settings = await getEmailSettings(); } catch (_) { /* column may not exist yet */ }
    const pref = settings?.preferredProvider || "";
    const smtpIsBrevo = !!(settings?.smtpHost && settings.smtpHost.toLowerCase().includes("brevo"));
    // If not set, or currently pointing to brevo SMTP, switch to resend
    if (!pref || pref === "resend" || smtpIsBrevo) {
      try {
        await db.insert(emailSettings).values({
          id: "singleton",
          preferredProvider: "resend",
          smtpHost: smtpIsBrevo ? null : (settings?.smtpHost ?? null),
          smtpUser: smtpIsBrevo ? null : (settings?.smtpUser ?? null),
          smtpPass: smtpIsBrevo ? null : (settings?.smtpPass ?? null),
        } as any).onConflictDoUpdate({
          target: (emailSettings as any).id,
          set: { preferredProvider: "resend", ...(smtpIsBrevo ? { smtpHost: null, smtpUser: null, smtpPass: null } : {}) },
        });
      } catch (dbErr: any) {
        // Column may not exist yet — startup migrations will add it; it'll self-correct on next boot
        console.warn("[email] Could not write preferred_provider (will retry after migration):", dbErr.message);
        return;
      }
      console.log("[email] RESEND_API_KEY detected — Resend set as preferred email provider.");
    }
  } catch (e: any) {
    console.warn("[email] Could not auto-activate Resend:", e.message);
  }
}

async function sendViaResend(opts: EmailOptions, fromEmail: string, fromName: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: {
        from: `${fromName} <${fromEmail}>`,
        to: [opts.toName ? `${opts.toName} <${opts.to}>` : opts.to],
        ...(opts.cc?.length ? { cc: opts.cc } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
        subject: opts.subject,
        html: opts.html,
        text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend connector returned ${response.status}: ${body || response.statusText}`);
    }
    return;
  }

  const { Resend } = await import("resend");
  const client = new Resend(process.env.RESEND_API_KEY!);

  const trySend = async (from: string) => {
    const result = await client.emails.send({
      from: `${fromName} <${from}>`,
      to: [opts.toName ? `${opts.toName} <${opts.to}>` : opts.to],
      ...(opts.cc?.length ? { cc: opts.cc } : {}),
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
    });
    if (result.error) {
      throw new Error((result.error as any).message || JSON.stringify(result.error));
    }
  };

  try {
    await trySend(fromEmail);
  } catch (err: any) {
    // If the sender domain is not verified, fall back to Resend's onboarding sender
    const msg = (err.message || "").toLowerCase();
    if (
      fromEmail !== "onboarding@resend.dev" &&
      (msg.includes("domain") || msg.includes("sender") || msg.includes("from address") ||
       msg.includes("not verified") || msg.includes("invalid") || msg.includes("not found"))
    ) {
      console.warn(`[email] Resend: sender domain not verified for ${fromEmail}, retrying with onboarding@resend.dev`);
      await trySend("onboarding@resend.dev");
    } else {
      throw err;
    }
  }
}

async function sendViaSendGrid(opts: EmailOptions, fromEmail: string, fromName: string): Promise<void> {
  const sgMail = (await import("@sendgrid/mail")).default;
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  await sgMail.send({
    to: { email: opts.to, name: opts.toName },
    ...(opts.cc?.length ? { cc: opts.cc } : {}),
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    from: { email: fromEmail, name: fromName },
    subject: opts.subject,
    html: opts.html,
    text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
  });
}

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; error?: string; provider?: string }> {
  const settings = await getEmailSettings();
  const smtpOk = !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpPass);
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const resendConnectionOk = !!process.env.REPLIT_CONNECTORS_HOSTNAME;
  const pref = (settings as any)?.preferredProvider || "";

  if (!resendKey && !resendConnectionOk && !smtpOk && !sendgridKey) {
    console.warn("[email] No email provider configured — set RESEND_API_KEY, configure SMTP, or set SENDGRID_API_KEY.");
    await db.insert(emailLogs).values({
      id: crypto.randomUUID(),
      campaignId: opts.campaignId || null,
      autoResponderId: opts.autoResponderId || null,
      recipientEmail: opts.to,
      recipientName: opts.toName || null,
      subject: opts.subject,
      status: "failed",
      errorMessage: "No email provider configured. Set RESEND_API_KEY or configure SMTP in Admin → Email → Settings.",
      sentAt: new Date(),
    });
    return { success: false, error: "No email provider configured. Add RESEND_API_KEY to your secrets or set up SMTP." };
  }

  // When using Resend: prefer RESEND_FROM_EMAIL env var (verified sender), then DB smtpFromEmail,
  // then fall back to Resend's built-in onboarding sender which works with any API key for testing.
  // Never fall back to a non-verified custom domain or Resend will reject the send.
  const fromEmail = (resendKey || resendConnectionOk
    ? (opts.fromEmail || process.env.RESEND_FROM_EMAIL || settings?.smtpFromEmail || TASKDRIP_EMAILS.info)
    : (settings?.smtpFromEmail || settings?.smtpUser || "noreply@taskdrip.online"));
  const fromName = opts.fromName || settings?.smtpFromName || "Taskdrip";

  // Build provider list respecting admin's explicit preference
  const smtpProvider = { name: "smtp", fn: async () => {
    const transporter = buildTransporter(settings);
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
      ...(opts.cc?.length ? { cc: opts.cc } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
    });
  }};
  const resendProvider = { name: "resend", fn: () => sendViaResend(opts, fromEmail, fromName) };
  const sgProvider = { name: "sendgrid", fn: () => sendViaSendGrid(opts, fromEmail, fromName) };

  // Respect admin preference, then fall back to auto-priority (Resend → SMTP → SendGrid)
  let providers: Array<{ name: string; fn: () => Promise<void> }> = [];
  if (pref === "resend" && (resendKey || resendConnectionOk)) providers = [resendProvider, ...(smtpOk ? [smtpProvider] : []), ...(sendgridKey ? [sgProvider] : [])];
  else if (pref === "smtp" && smtpOk) providers = [smtpProvider, ...((resendKey || resendConnectionOk) ? [resendProvider] : []), ...(sendgridKey ? [sgProvider] : [])];
  else if (pref === "sendgrid" && sendgridKey) providers = [sgProvider, ...((resendKey || resendConnectionOk) ? [resendProvider] : []), ...(smtpOk ? [smtpProvider] : [])];
  else {
    if (resendKey || resendConnectionOk) providers.push(resendProvider);
    if (smtpOk) providers.push(smtpProvider);
    if (sendgridKey) providers.push(sgProvider);
  }

  for (const provider of providers) {
    try {
      await provider.fn();
      await db.insert(emailLogs).values({
        id: crypto.randomUUID(),
        campaignId: opts.campaignId || null,
        autoResponderId: opts.autoResponderId || null,
        recipientEmail: opts.to,
        recipientName: opts.toName || null,
        subject: opts.subject,
        status: "sent",
        sentAt: new Date(),
      });
      return { success: true, provider: provider.name };
    } catch (err: any) {
      console.error(`[email] ${provider.name} send failed:`, err.message);
      // Try next provider
    }
  }

  // All providers failed
  const errMsg = "All email providers failed. Check RESEND_API_KEY / SMTP credentials.";
  await db.insert(emailLogs).values({
    id: crypto.randomUUID(),
    campaignId: opts.campaignId || null,
    autoResponderId: opts.autoResponderId || null,
    recipientEmail: opts.to,
    recipientName: opts.toName || null,
    subject: opts.subject,
    status: "failed",
    errorMessage: errMsg,
    sentAt: new Date(),
  });
  return { success: false, error: errMsg };
}

export async function sendWelcomeEmail(user: { email: string; firstName: string; lastName?: string; userType: string }): Promise<void> {
  try {
    const templateKey = user.userType === 'brand' ? 'welcome_brand' : 'welcome_creator';
    const template = AI_TEMPLATES[templateKey];
    if (!template) return;
    const siteUrl = "https://taskdrip.online";
    const vars: Record<string, string> = {
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      full_name: `${user.firstName} ${user.lastName || ""}`.trim(),
      email: user.email,
      site_url: siteUrl,
    };
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    const html = template.body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    await sendEmail({ to: user.email, toName: `${user.firstName} ${user.lastName || ""}`.trim(), subject, html, fromEmail: TASKDRIP_EMAILS.info });
  } catch (_) { /* non-blocking */ }
}

export async function sendOrderConfirmationEmail(opts: {
  email: string;
  firstName: string;
  productName: string;
  amount: string;
  isFree: boolean;
}): Promise<void> {
  try {
    const template = AI_TEMPLATES['order_confirmation'];
    if (!template) return;
    const siteUrl = "https://taskdrip.online";
    const status = opts.isFree ? "Approved" : "Pending Review";
    const statusMessage = opts.isFree
      ? "Your download is ready — visit the shop to access your product."
      : "Our team will verify your payment and approve your order within 24 hours.";
    const vars: Record<string, string> = {
      first_name: opts.firstName,
      product_name: opts.productName,
      amount: opts.isFree ? "Free" : opts.amount,
      status,
      status_message: statusMessage,
      site_url: siteUrl,
    };
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    const html = template.body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    await sendEmail({ to: opts.email, toName: opts.firstName, subject, html, fromEmail: TASKDRIP_EMAILS.payments });
  } catch (_) { /* non-blocking */ }
}

/**
 * Send a clean, structured notification to the Taskdrip admin inbox.
 * This intentionally uses the existing provider chain (Resend → SMTP → SendGrid)
 * so the feature remains compatible with the Admin → Email configuration.
 */
export async function sendAdminActivityEmail(opts: {
  subject: string;
  event: "shop_order" | "course_registration" | "hire_request" | "contact" | "transaction" | "payment" | "registration" | "newsletter" | "advertising";
  customer: { name?: string; email?: string; phone?: string };
  details: Array<{ label: string; value: string | number | null | undefined }>;
  recipient?: string;
  fromEmail?: string;
}): Promise<void> {
  try {
    const eventLabels = {
      shop_order: "New shop order",
      course_registration: "New course registration",
      hire_request: "New hire developer request",
      contact: "New contact enquiry",
      transaction: "New platform transaction",
      payment: "New payment activity",
      registration: "New user registration",
      newsletter: "New newsletter subscription",
      advertising: "New advertising enquiry",
    };
    const escapeHtml = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const rows = opts.details
      .filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() !== "")
      .map((item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:30%;font-weight:600">${escapeHtml(item.label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827;white-space:pre-line">${escapeHtml(String(item.value))}</td>
        </tr>`)
      .join("");
    const customerLines = [
      opts.customer.name ? `<strong>${escapeHtml(opts.customer.name)}</strong>` : "",
      opts.customer.email ? escapeHtml(opts.customer.email) : "",
      opts.customer.phone ? escapeHtml(opts.customer.phone) : "",
    ].filter(Boolean).join("<br>");
    const html = buildDefaultEmailHtml(`
      <div style="font-family:Arial,sans-serif">
        <p style="margin:0 0 6px;color:#7c3aed;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${eventLabels[opts.event]}</p>
        <h2 style="margin:0 0 18px;color:#111827">${escapeHtml(opts.subject)}</h2>
        <div style="margin-bottom:18px;padding:12px 14px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px">
          <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase">Customer</p>
          <p style="margin:0;line-height:1.55">${customerLines || "Customer details unavailable"}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">${rows}</table>
      </div>
    `, "Taskdrip Admin");
    await sendEmail({
      to: opts.recipient || TASKDRIP_EMAILS.admin,
      cc: opts.recipient && opts.recipient !== TASKDRIP_EMAILS.admin ? [TASKDRIP_EMAILS.admin] : undefined,
      subject: opts.subject,
      html,
      fromEmail: opts.fromEmail || TASKDRIP_EMAILS.info,
      text: [
        eventLabels[opts.event],
        opts.subject,
        `Customer: ${[opts.customer.name, opts.customer.email, opts.customer.phone].filter(Boolean).join(" | ")}`,
        ...opts.details.filter((item) => item.value !== null && item.value !== undefined).map((item) => `${item.label}: ${item.value}`),
      ].join("\n"),
    });
  } catch (error: any) {
    console.warn("[email] admin activity notification failed:", error?.message || error);
  }
}

export async function sendAdsApplicationEmail(opts: {
  email: string;
  firstName: string;
  companyName: string;
  adType: string;
  contactName: string;
}): Promise<void> {
  try {
    const template = AI_TEMPLATES['ads_application_received'];
    if (!template) return;
    const siteUrl = "https://taskdrip.online";
    const vars: Record<string, string> = {
      first_name: opts.firstName,
      company_name: opts.companyName,
      ad_type: (opts.adType || "advertising").replace(/_/g, " "),
      contact_name: opts.contactName,
      site_url: siteUrl,
    };
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    const html = template.body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    await sendEmail({ to: opts.email, toName: opts.firstName, subject, html, fromEmail: TASKDRIP_EMAILS.info });
  } catch (_) { /* non-blocking */ }
}

export async function testSmtpConnection(settings: any): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = buildTransporter(settings);
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export async function blastCampaign(campaignId: string): Promise<{ sent: number; failed: number; errors: string[] }> {
  const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
  if (!campaign) return { sent: 0, failed: 0, errors: ["Campaign not found"] };

  await db.update(emailCampaigns).set({ status: "sending" }).where(eq(emailCampaigns.id, campaignId));

  const seg = campaign.targetSegment;

  // For newsletter segment, query subscribers separately
  if (seg === "newsletter") {
    const { newsletterSubscribers } = await import("@shared/schema");
    const nsRows = await db.select().from(newsletterSubscribers);
    const activeSubs = nsRows.filter((s: any) => s.status === "active");
    let sent = 0, failed = 0;
    const errors: string[] = [];
    for (const sub of activeSubs) {
      const vars: Record<string, string> = { first_name: (sub as any).name || "", last_name: "", full_name: (sub as any).name || "", email: sub.email, username: sub.email, user_type: "newsletter" };
      const html = interpolate(campaign.htmlBody, vars);
      const subject = interpolate(campaign.subject, vars);
      const result = await sendEmail({ to: sub.email, toName: (sub as any).name || undefined, subject, html, campaignId, fromEmail: TASKDRIP_EMAILS.info });
      if (result.success) sent++; else { failed++; errors.push(`${sub.email}: ${result.error}`); }
    }
    await db.update(emailCampaigns).set({ status: "sent", sentAt: new Date(), totalRecipients: activeSubs.length, sent, bounced: failed }).where(eq(emailCampaigns.id, campaignId));
    return { sent, failed, errors };
  }

  let allUsers = await db.select().from(users);

  // For student/customer segments, resolve the user IDs first
  if (seg === "students") {
    const { courseEnrollments, breedskoolRegistrations } = await import("@shared/schema");
    const enrollmentRows = await db.selectDistinct({ userId: courseEnrollments.userId }).from(courseEnrollments);
    const breedskoolRows = await db.selectDistinct({ userId: breedskoolRegistrations.userId }).from(breedskoolRegistrations);
    const studentIds = new Set([
      ...enrollmentRows.map((r: any) => r.userId),
      ...breedskoolRows.map((r: any) => r.userId).filter(Boolean),
    ]);
    allUsers = allUsers.filter(u => studentIds.has(u.id));
  } else if (seg === "shop_customers") {
    const { purchases } = await import("@shared/schema");
    const purchaseRows = await db.selectDistinct({ userId: purchases.userId }).from(purchases);
    const customerIds = new Set(purchaseRows.map((r: any) => r.userId));
    allUsers = allUsers.filter(u => customerIds.has(u.id));
  } else if (seg === "influencers" || seg === "creators") {
    allUsers = allUsers.filter(u => u.userType === "creator");
  } else if (seg === "brands") {
    allUsers = allUsers.filter(u => u.userType === "brand");
  } else if (seg === "verified") {
    allUsers = allUsers.filter(u => u.isVerified);
  } else if (seg === "unverified") {
    allUsers = allUsers.filter(u => !u.isVerified);
  } else if (seg?.startsWith("tier_")) {
    const tier = seg.replace("tier_", "");
    allUsers = allUsers.filter(u => u.creatorTier === tier);
  }
  // seg === "all" uses allUsers unfiltered

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of allUsers) {
    const vars: Record<string, string> = {
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      full_name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      username: user.username || user.email,
      user_type: user.userType,
    };

    const html = interpolate(campaign.htmlBody, vars);
    const subject = interpolate(campaign.subject, vars);
    const result = await sendEmail({
      to: user.email,
      toName: `${user.firstName} ${user.lastName}`.trim(),
      subject,
      html,
      fromEmail: TASKDRIP_EMAILS.info,
      campaignId,
    });

    if (result.success) sent++;
    else { failed++; errors.push(`${user.email}: ${result.error}`); }
  }

  await db.update(emailCampaigns).set({
    status: "sent",
    sentAt: new Date(),
    totalRecipients: allUsers.length,
    sent,
    bounced: failed,
  }).where(eq(emailCampaigns.id, campaignId));

  return { sent, failed, errors };
}

export function buildDefaultEmailHtml(content: string, fromName = "Taskdrip", siteUrl = "https://taskdrip.online"): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px 40px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px; }
  .body { padding: 40px; color: #374151; line-height: 1.6; }
  .footer { background: #f3f4f6; padding: 24px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  .footer a { color: #7c3aed; text-decoration: none; }
  .btn { display: inline-block; background: #7c3aed; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${fromName}</h1>
    <p>Web3 Influencer Marketplace</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
    <p><a href="${siteUrl}">Visit Website</a> · <a href="${siteUrl}/unsubscribe?email={{email}}">Unsubscribe</a></p>
  </div>
</div>
</body>
</html>`;
}

export const AI_TEMPLATES: Record<string, { subject: string; body: string }> = {
  welcome_creator: {
    subject: "Welcome to Taskdrip, {{first_name}}! Your creator account is live 🚀",
    body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Taskdrip</title></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0d0d1a"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#1a1a2e;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

  <!-- Hero Header -->
  <tr><td bgcolor="#7c3aed" style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:40px 40px 0;text-align:center;">
        <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 18px;margin-bottom:20px;">
          <span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:1px;">⚡ TASKDRIP</span>
        </div>
      </td></tr>
      <tr><td style="padding:0 40px 40px;text-align:center;">
        <h1 style="color:#fff;font-size:30px;font-weight:800;margin:0 0 10px;line-height:1.25;">You're in, {{first_name}}! 🎉</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:16px;margin:0;line-height:1.6;">Your creator account is <strong>live</strong> on the #1 Web3 Influencer Marketplace. Brands are waiting for you right now.</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Stats Strip -->
  <tr><td bgcolor="#6d28d9" style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="padding:18px 12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">
          <div style="color:#fff;font-size:24px;font-weight:800;line-height:1;">15K+</div>
          <div style="color:rgba(255,255,255,0.65);font-size:11px;text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">Creators</div>
        </td>
        <td width="33%" style="padding:18px 12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">
          <div style="color:#fff;font-size:24px;font-weight:800;line-height:1;">3.5K+</div>
          <div style="color:rgba(255,255,255,0.65);font-size:11px;text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">Campaigns</div>
        </td>
        <td width="33%" style="padding:18px 12px;text-align:center;">
          <div style="color:#fff;font-size:24px;font-weight:800;line-height:1;">$650K+</div>
          <div style="color:rgba(255,255,255,0.65);font-size:11px;text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">Paid Out</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px;background:#1a1a2e;">
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 28px;">Hey <strong style="color:#a78bfa;">{{first_name}}</strong> 👋 — here's what to do to start earning crypto from your social media influence:</p>

    <!-- Step 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td width="36" valign="top" style="padding-top:2px;">
        <div style="background:#7c3aed;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:800;font-size:13px;">1</div>
      </td>
      <td style="padding-left:14px;background:#0f172a;border-radius:10px;padding:14px 14px 14px 14px;">
        <div style="display:flex;align-items:flex-start;">
          <div style="margin-left:0;">
            <div style="color:#f1f5f9;font-weight:700;font-size:15px;margin-bottom:4px;">🧑‍💼 Complete your creator profile</div>
            <div style="color:#94a3b8;font-size:13px;line-height:1.5;">Add your social handles, follower counts, niche, and a bio. Brands filter by these — a complete profile gets 3× more invites.</div>
          </div>
        </div>
      </td>
    </tr></table>

    <!-- Step 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td width="36" valign="top" style="padding-top:2px;">
        <div style="background:#7c3aed;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:800;font-size:13px;">2</div>
      </td>
      <td style="padding-left:14px;background:#0f172a;border-radius:10px;padding:14px;">
        <div style="color:#f1f5f9;font-weight:700;font-size:15px;margin-bottom:4px;">🔍 Browse live brand campaigns</div>
        <div style="color:#94a3b8;font-size:13px;line-height:1.5;">Hundreds of paid campaigns are live right now across TikTok, YouTube, Instagram, X, and Telegram. Apply with one click.</div>
      </td>
    </tr></table>

    <!-- Step 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td width="36" valign="top" style="padding-top:2px;">
        <div style="background:#7c3aed;color:#fff;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:800;font-size:13px;">3</div>
      </td>
      <td style="padding-left:14px;background:#0f172a;border-radius:10px;padding:14px;">
        <div style="color:#f1f5f9;font-weight:700;font-size:15px;margin-bottom:4px;">💰 Submit your work and get paid in USDT</div>
        <div style="color:#94a3b8;font-size:13px;line-height:1.5;">Post the content, upload proof, and get paid directly to your crypto wallet — no middlemen, no delays.</div>
      </td>
    </tr></table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 28px;"><tr><td align="center">
      <a href="{{site_url}}/campaigns" style="display:inline-block;background:#7c3aed;color:#fff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">Browse Campaigns Now →</a>
    </td></tr></table>

    <!-- Tip box -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#1e1b4b;border-left:4px solid #7c3aed;border-radius:8px;padding:16px 20px;">
      <p style="margin:0;color:#a78bfa;font-weight:700;font-size:13px;">💡 Pro Tip</p>
      <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;line-height:1.5;">Creators who complete KYC verification unlock <strong>premium, higher-paying campaigns</strong> and get the ✅ Verified badge on their profile. It takes less than 5 minutes.</p>
    </td></tr></table>

    <p style="color:#64748b;font-size:13px;margin:28px 0 0;line-height:1.6;">Questions? Just reply to this email — our team reads every message. 🙌</p>
    <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">The <strong style="color:#a78bfa;">Taskdrip</strong> Team</p>
  </td></tr>

  <!-- Footer -->
  <tr><td bgcolor="#0d0d1a" style="padding:24px 40px;text-align:center;">
    <p style="color:#475569;font-size:12px;margin:0 0 8px;">Follow us for campaign alerts &amp; tips</p>
    <p style="margin:0 0 16px;">
      <a href="https://t.me/taskdrip" style="color:#7c3aed;text-decoration:none;font-size:12px;margin:0 8px;">Telegram</a>
      <a href="https://x.com/taskdrip" style="color:#7c3aed;text-decoration:none;font-size:12px;margin:0 8px;">X (Twitter)</a>
      <a href="https://instagram.com/taskdrip" style="color:#7c3aed;text-decoration:none;font-size:12px;margin:0 8px;">Instagram</a>
    </p>
    <p style="color:#334155;font-size:11px;margin:0;">© ${new Date().getFullYear()} Taskdrip. All rights reserved.<br>
    <a href="{{site_url}}/unsubscribe?email={{email}}" style="color:#475569;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`,
  },

  welcome_brand: {
    subject: "Welcome to Taskdrip, {{first_name}}! Let's launch your first campaign 🎯",
    body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Taskdrip Brands</title></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0f1e"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#111827;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

  <!-- Hero Header -->
  <tr><td bgcolor="#4f46e5" style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:40px 40px 0;text-align:center;">
        <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 18px;margin-bottom:20px;">
          <span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:1px;">⚡ TASKDRIP BRANDS</span>
        </div>
      </td></tr>
      <tr><td style="padding:0 40px 40px;text-align:center;">
        <h1 style="color:#fff;font-size:28px;font-weight:800;margin:0 0 10px;line-height:1.25;">Your brand just got 15,000+ creators, {{first_name}} 🎯</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;line-height:1.6;">Your brand account is <strong>active</strong>. Launch your first influencer campaign in minutes and reach millions.</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Stats Strip -->
  <tr><td bgcolor="#4338ca" style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" style="padding:18px 12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">
          <div style="color:#fff;font-size:24px;font-weight:800;line-height:1;">15K+</div>
          <div style="color:rgba(255,255,255,0.65);font-size:11px;text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">Verified Creators</div>
        </td>
        <td width="33%" style="padding:18px 12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">
          <div style="color:#fff;font-size:24px;font-weight:800;line-height:1;">5</div>
          <div style="color:rgba(255,255,255,0.65);font-size:11px;text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">Platforms</div>
        </td>
        <td width="33%" style="padding:18px 12px;text-align:center;">
          <div style="color:#fff;font-size:24px;font-weight:800;line-height:1;">8.4%</div>
          <div style="color:rgba(255,255,255,0.65);font-size:11px;text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">Avg Engagement</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px;background:#111827;">
    <p style="color:#d1d5db;font-size:15px;line-height:1.7;margin:0 0 28px;">Hello <strong style="color:#818cf8;">{{first_name}}</strong> 👋 — you're now connected to thousands of creators across TikTok, YouTube, Instagram, X, and Telegram. Here's how to run your first campaign:</p>

    <!-- Step 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td style="background:#1f2937;border-radius:10px;padding:16px;border-left:4px solid #4f46e5;">
        <div style="color:#f9fafb;font-weight:700;font-size:15px;margin-bottom:4px;">📋 Step 1 — Create your campaign brief</div>
        <div style="color:#9ca3af;font-size:13px;line-height:1.5;">Set your budget, target platform, content requirements, and payout. Takes about 5 minutes — we'll guide you through every field.</div>
      </td>
    </tr></table>

    <!-- Step 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td style="background:#1f2937;border-radius:10px;padding:16px;border-left:4px solid #4f46e5;">
        <div style="color:#f9fafb;font-weight:700;font-size:15px;margin-bottom:4px;">🎯 Step 2 — Creators apply to your campaign</div>
        <div style="color:#9ca3af;font-size:13px;line-height:1.5;">Influencers across your chosen platform will see and apply to your campaign. You control who gets approved — filter by tier, follower count, or engagement rate.</div>
      </td>
    </tr></table>

    <!-- Step 3 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
      <td style="background:#1f2937;border-radius:10px;padding:16px;border-left:4px solid #4f46e5;">
        <div style="color:#f9fafb;font-weight:700;font-size:15px;margin-bottom:4px;">✅ Step 3 — Review, approve, and pay instantly</div>
        <div style="color:#9ca3af;font-size:13px;line-height:1.5;">Creators submit their content for your review. Approve what you love — payment is released automatically in USDT. No invoices, no wire transfers.</div>
      </td>
    </tr></table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 28px;"><tr><td align="center">
      <a href="{{site_url}}/brand-dashboard" style="display:inline-block;background:#4f46e5;color:#fff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">Launch Your First Campaign →</a>
    </td></tr></table>

    <!-- Info box -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#1e1b4b;border-left:4px solid #4f46e5;border-radius:8px;padding:16px 20px;">
      <p style="margin:0;color:#818cf8;font-weight:700;font-size:13px;">📊 What to expect</p>
      <p style="margin:6px 0 0;color:#a5b4fc;font-size:13px;line-height:1.5;">Most brands receive their first campaign applications <strong>within 24 hours</strong>. Start with a modest budget to test the platform — you can scale up once you see results.</p>
    </td></tr></table>

    <p style="color:#6b7280;font-size:13px;margin:28px 0 0;line-height:1.6;">Need help setting up? Reply to this email — our team will personally walk you through your first campaign. 🚀</p>
    <p style="color:#9ca3af;font-size:14px;margin:8px 0 0;">The <strong style="color:#818cf8;">Taskdrip</strong> Team</p>
  </td></tr>

  <!-- Footer -->
  <tr><td bgcolor="#0a0f1e" style="padding:24px 40px;text-align:center;">
    <p style="color:#374151;font-size:12px;margin:0 0 8px;">Taskdrip — The Web3 Influencer Marketplace</p>
    <p style="margin:0 0 16px;">
      <a href="https://t.me/taskdrip" style="color:#4f46e5;text-decoration:none;font-size:12px;margin:0 8px;">Telegram</a>
      <a href="https://x.com/taskdrip" style="color:#4f46e5;text-decoration:none;font-size:12px;margin:0 8px;">X (Twitter)</a>
      <a href="https://instagram.com/taskdrip" style="color:#4f46e5;text-decoration:none;font-size:12px;margin:0 8px;">Instagram</a>
    </p>
    <p style="color:#1f2937;font-size:11px;margin:0;">© ${new Date().getFullYear()} Taskdrip. All rights reserved.<br>
    <a href="{{site_url}}/unsubscribe?email={{email}}" style="color:#374151;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`,
  },
  campaign_approved: {
    subject: "Your campaign submission was approved! 💰",
    body: buildDefaultEmailHtml(`
      <h2>Congratulations, {{first_name}}! 🎊</h2>
      <p>Your submission for the campaign has been reviewed and <strong>approved</strong>.</p>
      <p>Your earnings have been added to your available balance and are ready for withdrawal.</p>
      <a href="{{site_url}}/dashboard" class="btn">View Your Balance →</a>
      <p>Keep completing campaigns to level up your tier!</p>
      <p>The Taskdrip Team</p>
    `),
  },
  payout_sent: {
    subject: "Your payout has been sent! 💸",
    body: buildDefaultEmailHtml(`
      <h2>Your payment is on the way, {{first_name}}!</h2>
      <p>We've processed your payout request. Funds are being sent to your wallet.</p>
      <p>Transactions on the blockchain may take a few minutes to confirm depending on network congestion.</p>
      <a href="{{site_url}}/dashboard" class="btn">View Dashboard →</a>
      <p>Thank you for being a valued Taskdrip influencer!</p>
      <p>The Taskdrip Team</p>
    `),
  },
  newsletter: {
    subject: "What's new on Taskdrip this week 📰",
    body: buildDefaultEmailHtml(`
      <h2>Hey {{first_name}}, here's your weekly Taskdrip update!</h2>
      <p>Here's a round-up of the latest campaigns, influencer opportunities, and platform news just for you.</p>
      <h3>🔥 Trending Campaigns</h3>
      <p>New brand campaigns are live — don't miss your chance to earn crypto for your influence.</p>
      <h3>🎓 BreedSkool Academy</h3>
      <p>New courses added this week. Level up your skills and unlock higher-tier campaigns.</p>
      <a href="{{site_url}}" class="btn">Explore Now →</a>
      <p>The Taskdrip Team</p>
    `),
  },
  kyc_approved: {
    subject: "Your KYC has been verified! ✅",
    body: buildDefaultEmailHtml(`
      <h2>You're now a verified influencer, {{first_name}}! ✅</h2>
      <p>Your identity verification (KYC) has been successfully completed. You now have access to:</p>
      <ul>
        <li>Higher-value brand campaigns</li>
        <li>Faster payout processing</li>
        <li>Verified badge on your profile</li>
      </ul>
      <a href="{{site_url}}/campaigns" class="btn">Access Premium Campaigns →</a>
      <p>The Taskdrip Team</p>
    `),
  },
  order_confirmation: {
    subject: "Order Confirmed – {{product_name}} 🛍️",
    body: buildDefaultEmailHtml(`
      <h2>Thanks for your order, {{first_name}}! 🎉</h2>
      <p>Your purchase has been received and is now being processed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#6b7280;">Product</td><td style="padding:8px 0;font-weight:600;">{{product_name}}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:600;">{{amount}}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Status</td><td style="padding:8px 0;font-weight:600;color:#7c3aed;">{{status}}</td></tr>
      </table>
      <p>{{status_message}}</p>
      <a href="{{site_url}}/shop" class="btn">View My Orders →</a>
      <p>Questions? Reply to this email and we'll help you out.</p>
      <p>The Taskdrip Team</p>
    `),
  },
  ads_application_received: {
    subject: "We received your advertising application, {{first_name}}! 📣",
    body: buildDefaultEmailHtml(`
      <h2>Application received, {{first_name}}! 📣</h2>
      <p>Thanks for reaching out to Taskdrip Ads. Your advertising application for <strong>{{company_name}}</strong> has been successfully submitted.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#6b7280;">Campaign Type</td><td style="padding:8px 0;font-weight:600;">{{ad_type}}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Contact</td><td style="padding:8px 0;font-weight:600;">{{contact_name}}</td></tr>
      </table>
      <p>Our team will review your application and get back to you within <strong>1–2 business days</strong>.</p>
      <a href="{{site_url}}/advertise" class="btn">View Advertising Options →</a>
      <p>The Taskdrip Advertising Team</p>
    `),
  },
  newsletter_welcome: {
    subject: "You're in! Welcome to the Taskdrip Inner Circle 🎉",
    body: buildDefaultEmailHtml(`
      <h2>Welcome to Taskdrip! 🚀</h2>
      <p>You've just subscribed to the Taskdrip newsletter — the #1 source for Web3 influencer marketing insights, new campaign alerts, and platform updates.</p>

      <h3 style="color:#7c3aed;margin-top:24px;">What to expect from us:</h3>
      <ul>
        <li><strong>🎯 Campaign Alerts</strong> — Be the first to know about new high-paying brand campaigns</li>
        <li><strong>💰 Earning Tips</strong> — Strategies to maximize your crypto earnings as an influencer</li>
        <li><strong>📊 Platform Updates</strong> — New features, tools, and improvements announced first to subscribers</li>
        <li><strong>🎓 BreedSkool Courses</strong> — Free educational content to help you grow your influence and income</li>
        <li><strong>🏆 Exclusive Giveaways</strong> — Subscriber-only contests and rewards in $TDRIP tokens</li>
      </ul>

      <h3 style="color:#7c3aed;margin-top:24px;">Your Next Steps:</h3>
      <ol>
        <li>Create your free Taskdrip account and set up your influencer profile</li>
        <li>Browse active campaigns and apply to earn USDT from top brands</li>
        <li>Join our Telegram community for real-time campaign alerts and tips</li>
        <li>Enroll in BreedSkool — our free academy for influencer skill-building</li>
      </ol>

      <div style="background:#f5f3ff;border-left:4px solid #7c3aed;padding:16px;margin:24px 0;border-radius:4px;">
        <p style="margin:0;font-weight:600;color:#7c3aed;">Pro Tip:</p>
        <p style="margin:8px 0 0;color:#374151;">Influencers who complete their profile and verify their social accounts earn 3x more from campaigns. It takes less than 5 minutes!</p>
      </div>

      <a href="{{site_url}}/signup" class="btn">Create Your Free Account →</a>

      <p style="margin-top:24px;color:#6b7280;font-size:13px;">You're receiving this because you subscribed at taskdrip.online. You can <a href="{{site_url}}/unsubscribe?email={{email}}" style="color:#7c3aed;">unsubscribe anytime</a>.</p>
      <p>The Taskdrip Team</p>
    `),
  },
};

export async function sendNewsletterWelcomeEmail(email: string, name?: string): Promise<void> {
  try {
    const siteUrl = "https://taskdrip.online";
    const firstName = name ? name.split(" ")[0] : "there";
    const vars: Record<string, string> = {
      first_name: firstName,
      email,
      site_url: siteUrl,
    };
    const template = AI_TEMPLATES['newsletter_welcome'];
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    const html = template.body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
    await sendEmail({ to: email, toName: name || undefined, subject, html, fromEmail: TASKDRIP_EMAILS.info });
  } catch (_) { /* non-blocking */ }
}
