import nodemailer from "nodemailer";
import { db } from "./db";
import { emailSettings, emailLogs, emailCampaigns, users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
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

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getEmailSettings();
    if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPass) {
      return { success: false, error: "SMTP not configured" };
    }

    const transporter = buildTransporter(settings);
    const fromEmail = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || "Taskdrip";

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
    });

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

    return { success: true };
  } catch (err: any) {
    await db.insert(emailLogs).values({
      id: crypto.randomUUID(),
      campaignId: opts.campaignId || null,
      autoResponderId: opts.autoResponderId || null,
      recipientEmail: opts.to,
      recipientName: opts.toName || null,
      subject: opts.subject,
      status: "failed",
      errorMessage: err.message,
      sentAt: new Date(),
    });
    return { success: false, error: err.message };
  }
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

  let allUsers = await db.select().from(users);

  const seg = campaign.targetSegment;
  if (seg === "creators") allUsers = allUsers.filter(u => u.userType === "creator");
  else if (seg === "brands") allUsers = allUsers.filter(u => u.userType === "brand");
  else if (seg === "verified") allUsers = allUsers.filter(u => u.isVerified);
  else if (seg === "unverified") allUsers = allUsers.filter(u => !u.isVerified);
  else if (seg?.startsWith("tier_")) {
    const tier = seg.replace("tier_", "");
    allUsers = allUsers.filter(u => u.creatorTier === tier);
  }

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
    subject: "Welcome to Taskdrip, {{first_name}}! 🚀",
    body: buildDefaultEmailHtml(`
      <h2>Welcome aboard, {{first_name}}! 🎉</h2>
      <p>You've just joined the #1 Web3 Influencer Marketplace. We're thrilled to have you as a verified creator.</p>
      <p><strong>What's next?</strong></p>
      <ul>
        <li>Complete your creator profile</li>
        <li>Browse live brand campaigns</li>
        <li>Start earning crypto for your influence</li>
      </ul>
      <a href="{{site_url}}/campaigns" class="btn">Browse Campaigns →</a>
      <p>Got questions? Reply to this email — we're here to help.</p>
      <p>The Taskdrip Team</p>
    `),
  },
  welcome_brand: {
    subject: "Welcome to Taskdrip, {{first_name}}! Let's launch your first campaign 🚀",
    body: buildDefaultEmailHtml(`
      <h2>Great to have you, {{first_name}}! 🎯</h2>
      <p>Your brand account is ready. You now have access to 10,000+ verified Web3 creators across TikTok, YouTube, Instagram, and more.</p>
      <p><strong>Launch your first campaign in 3 steps:</strong></p>
      <ol>
        <li>Set up your campaign brief</li>
        <li>Choose your target creator tier</li>
        <li>Fund the campaign and go live</li>
      </ol>
      <a href="{{site_url}}/campaigns/create" class="btn">Create a Campaign →</a>
      <p>The Taskdrip Team</p>
    `),
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
      <p>Thank you for being a valued Taskdrip creator!</p>
      <p>The Taskdrip Team</p>
    `),
  },
  newsletter: {
    subject: "What's new on Taskdrip this week 📰",
    body: buildDefaultEmailHtml(`
      <h2>Hey {{first_name}}, here's your weekly Taskdrip update!</h2>
      <p>Here's a round-up of the latest campaigns, creator opportunities, and platform news just for you.</p>
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
      <h2>You're now a verified creator, {{first_name}}! ✅</h2>
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
};
