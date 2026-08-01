// ─── Groq-powered Email AI Service ────────────────────────────────────────────
// All functions require GROQ_API_KEY in environment and use llama-3.3-70b-versatile.

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

const BRAND = {
  name: "Taskdrip",
  description: "A SocialFi influencer marketplace where creators earn crypto (USDT) by completing brand campaigns. Features: influencer marketplace, BreedSkool learning platform, shop, and more.",
  primaryColor: "#7c3aed",
  accentColor: "#4f46e5",
  bgDark: "#0d0d1a",
  siteUrl: "https://taskdrip.online",
};

// ─── Core fetch wrapper ────────────────────────────────────────────────────────

async function groqChat(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 2000
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured. Add it to your Replit Secrets.");

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.72,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json() as any;
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// Parse delimiter-wrapped response: ---SUBJECT--- ... ---HTML--- ... ---END---
function parseDelimitedResponse(text: string): { subject: string; html: string } | null {
  const subjectMatch = text.match(/---SUBJECT---\s*([\s\S]*?)\s*---HTML---/);
  const htmlMatch = text.match(/---HTML---\s*([\s\S]*?)\s*---END---/s);
  if (!subjectMatch?.[1] || !htmlMatch?.[1]) return null;
  return { subject: subjectMatch[1].trim(), html: htmlMatch[1].trim() };
}

const DESIGN_RULES = `
Design system (MUST follow):
- Use table-based layout for email-client compatibility (no flexbox/grid)
- Max-width 600px, centered with margin:0 auto
- Outer wrapper: background-color:#0d0d1a
- Inner card: background:#1a1a2e; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.5)
- Hero header: background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#ffffff; padding:40px 32px; text-align:center
- Body section: background:#ffffff; padding:32px
- CTA button: display:inline-block; background:#7c3aed; color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:16px
- Footer: background:#111120; color:#9ca3af; font-size:12px; padding:24px; text-align:center
- Font stack: -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif
- ALL CSS must be INLINE — absolutely no <style> tags or external CSS
- Include unsubscribe: <a href="{{unsubscribe_url}}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
`;

// ─── 1. Generate a full HTML email template from a prompt ──────────────────────

export interface GeneratedTemplate {
  subject: string;
  html: string;
}

export async function generateEmailTemplate(opts: {
  prompt: string;
  category: string;
  audience?: string;
  variables?: string[];
}): Promise<GeneratedTemplate> {
  const vars = (opts.variables ?? ["{{first_name}}", "{{email}}", "{{site_url}}"]).join(", ");
  const audience = opts.audience ?? "influencers and creators";

  const systemPrompt = `You are a world-class email designer for ${BRAND.name} (${BRAND.description}).
Generate production-ready HTML email templates.
${DESIGN_RULES}
Available template variables: ${vars}
Target audience: ${audience}
Email category: ${opts.category}

Return your response in EXACTLY this format (no extra text):
---SUBJECT---
[the email subject line]
---HTML---
[complete <!DOCTYPE html> email here]
---END---`;

  const reply = await groqChat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create a ${opts.category} email template for: ${opts.prompt}` },
    ],
    3800
  );

  const parsed = parseDelimitedResponse(reply);
  if (!parsed) {
    throw new Error("AI returned an unexpected format. Please try again with a clearer description.");
  }
  return parsed;
}

// ─── 2. Generate subject line suggestions ─────────────────────────────────────

export async function generateSubjectLines(opts: {
  content: string;
  audience: string;
  goal?: string;
  existingSubject?: string;
  count?: number;
}): Promise<string[]> {
  const count = opts.count ?? 5;
  const reply = await groqChat(
    [
      {
        role: "system",
        content: `You are an expert email marketer for ${BRAND.name}. Generate ${count} compelling, high-converting subject lines. Return ONLY a JSON array of strings — no explanation:
["Subject 1", "Subject 2", ...]`,
      },
      {
        role: "user",
        content: `Generate ${count} subject line variations.
Audience: ${opts.audience}
Goal: ${opts.goal ?? "maximize open rate and engagement"}
${opts.existingSubject ? `Existing subject to improve: ${opts.existingSubject}` : ""}
Email content snippet: ${opts.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500)}`,
      },
    ],
    600
  );

  const match = reply.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr) ? arr.slice(0, count).map(String) : [];
  } catch {
    return [];
  }
}

// ─── 3. Improve an existing template ──────────────────────────────────────────

export interface ImprovedTemplate {
  subject: string;
  html: string;
  summary: string;
}

export async function improveTemplate(opts: {
  html: string;
  subject?: string;
  feedback?: string;
  audience?: string;
}): Promise<ImprovedTemplate> {
  const audience = opts.audience ?? "platform users";
  const feedback = opts.feedback ?? "Make it more engaging, personal, and conversion-focused. Improve the visual design, copy, and call-to-action.";

  const systemPrompt = `You are a senior email designer for ${BRAND.name}. Improve the provided email template.
${DESIGN_RULES}
Return in EXACTLY this format:
---SUBJECT---
[improved subject line]
---HTML---
[improved <!DOCTYPE html> email]
---SUMMARY---
[2-3 bullet points of what was improved]
---END---`;

  const reply = await groqChat(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Improve this email template.
${opts.subject ? `Current subject: ${opts.subject}` : ""}
Target audience: ${audience}
Feedback: ${feedback}

Current HTML (first 3500 chars):
${opts.html.slice(0, 3500)}`,
      },
    ],
    3800
  );

  const subjectMatch = reply.match(/---SUBJECT---\s*([\s\S]*?)\s*---HTML---/);
  const htmlMatch = reply.match(/---HTML---\s*([\s\S]*?)\s*---SUMMARY---/s);
  const summaryMatch = reply.match(/---SUMMARY---\s*([\s\S]*?)\s*---END---/s);

  return {
    subject: subjectMatch?.[1]?.trim() ?? opts.subject ?? "",
    html: htmlMatch?.[1]?.trim() ?? opts.html,
    summary: summaryMatch?.[1]?.trim() ?? "",
  };
}

// ─── 4. Generate auto-responder email ─────────────────────────────────────────

export async function generateAutoResponder(opts: {
  trigger: string;
  triggerLabel: string;
  userType: string;
  extraContext?: string;
}): Promise<GeneratedTemplate> {
  const audience = opts.userType === "all" ? "all users" : `${opts.userType}s`;

  const systemPrompt = `You are an expert email marketer for ${BRAND.name} (${BRAND.description}).
Create a highly personalized auto-responder triggered by: "${opts.triggerLabel}".
Target audience: ${audience}.
${DESIGN_RULES}
Available variables: {{first_name}}, {{last_name}}, {{email}}, {{user_type}}, {{site_url}}

Return in EXACTLY this format:
---SUBJECT---
[subject line]
---HTML---
[complete <!DOCTYPE html> email]
---END---`;

  const reply = await groqChat(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate the auto-responder for trigger: "${opts.triggerLabel}"${opts.extraContext ? `\nContext: ${opts.extraContext}` : ""}. Make it warm, personal, and action-oriented.`,
      },
    ],
    3200
  );

  const parsed = parseDelimitedResponse(reply);
  if (!parsed) throw new Error("AI returned an unexpected format. Try again.");
  return parsed;
}

// ─── 5. Campaign performance insights ─────────────────────────────────────────

export async function analyzeCampaignInsights(opts: {
  campaigns: Array<{
    name: string; sent: number; opened: number; clicked: number; bounced: number; status: string;
  }>;
  autoResponders: Array<{ name: string; trigger: string; sentCount: number; isActive: boolean }>;
  templates: number;
  totalSent: number;
}): Promise<string> {
  if (opts.campaigns.length === 0 && opts.totalSent === 0) {
    return "🚀 No campaign data yet — send your first campaign to unlock AI performance analysis and actionable recommendations.";
  }

  const avgOpenRate = opts.campaigns.length > 0
    ? (opts.campaigns.reduce((s, c) => s + (c.sent > 0 ? c.opened / c.sent : 0), 0) / opts.campaigns.length * 100).toFixed(1)
    : "0";

  const reply = await groqChat(
    [
      {
        role: "system",
        content: `You are a data-driven email marketing analyst for ${BRAND.name}. Analyze the provided email metrics and give 4 short, actionable bullet points with emojis. Each bullet is max 25 words. Total response max 120 words. Be specific and concrete.`,
      },
      {
        role: "user",
        content: `Analyze and give 4 actionable insights:
- Total sent: ${opts.totalSent.toLocaleString()}
- Campaigns: ${opts.campaigns.length} (avg open rate: ${avgOpenRate}%)
- Active auto-responders: ${opts.autoResponders.filter((a) => a.isActive).length} / ${opts.autoResponders.length}
- Templates saved: ${opts.templates}
- Top campaigns: ${JSON.stringify(opts.campaigns.slice(0, 4).map((c) => ({ name: c.name, sent: c.sent, openRate: c.sent > 0 ? ((c.opened / c.sent) * 100).toFixed(0) + "%" : "0%", clicked: c.clicked })))}`,
      },
    ],
    350
  );

  return reply;
}

// ─── 6. Smart send-time recommendation ────────────────────────────────────────

export async function recommendSendTime(opts: {
  audience: string;
  emailType: string;
}): Promise<string> {
  const reply = await groqChat(
    [
      {
        role: "system",
        content: `You are an email marketing expert. Recommend the optimal send time in exactly 2 sentences. Be specific with day of week and time range.`,
      },
      {
        role: "user",
        content: `Best time to send a "${opts.emailType}" email to "${opts.audience}" on ${BRAND.name}?`,
      },
    ],
    120
  );
  return reply;
}
