import type { Express, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { citygateLoanApplications, newsletterSubscribers } from "@shared/schema";
import { db } from "./db";
import { sendEmail } from "./email-service";

const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(24).regex(/^[+()\d\s.-]+$/),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  state: z.string().trim().min(2).max(100),
  loanType: z.enum(["payday", "payroll", "sme", "asset", "monee"]),
  employmentStatus: z.string().trim().min(2).max(80),
  businessType: z.string().trim().max(120).optional().default(""),
  productSold: z.string().trim().max(160).optional().default(""),
  sixMonthTurnover: z.coerce.number().min(0).max(100_000_000_000).optional().default(0),
  monthlyNetIncome: z.coerce.number().min(0).max(100_000_000_000).optional().default(0),
  assetAmount: z.coerce.number().min(0).max(100_000_000_000).optional().default(0),
  requestedAmount: z.coerce.number().min(0).max(100_000_000_000).optional().default(0),
  tenureMonths: z.coerce.number().int().min(1).max(6),
  consent: z.literal(true),
  marketingConsent: z.boolean().optional().default(false),
});

const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many applications from this connection. Please try again later." },
});

const loanGuideLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "The loan guide is receiving too many questions. Please try again later." },
});

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function estimateAffordability(input: z.infer<typeof applicationSchema>) {
  const usesBusinessTurnover = input.monthlyNetIncome <= 0 && input.sixMonthTurnover > 0;
  const monthlyCashFlow = usesBusinessTurnover ? input.sixMonthTurnover / 6 : input.monthlyNetIncome;
  const affordabilityCeiling = Math.floor(monthlyCashFlow * 0.3 * input.tenureMonths);
  const amount = input.requestedAmount > 0
    ? Math.min(affordabilityCeiling, input.requestedAmount)
    : affordabilityCeiling;
  const basis = usesBusinessTurnover
    ? `Illustration uses 30% of the reported average monthly business turnover (six-month turnover divided by six) over ${input.tenureMonths} month(s), before interest or fees.`
    : `Illustration uses 30% of the reported monthly net income over ${input.tenureMonths} month(s), before interest or fees.`;
  return { estimateNaira: amount, estimateBasis: basis };
}

export function registerCitygateLoanRoutes(
  app: Express,
  isAuthenticated: RequestHandler,
  requireAdmin: RequestHandler,
) {
  app.post("/api/citygate-loans/guide", loanGuideLimiter, async (req, res) => {
    const parsed = z.object({
      question: z.string().trim().min(3).max(500),
      loanType: z.enum(["payday", "payroll", "sme", "asset", "monee"]).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Enter a short question about the loan options or estimate." });
    }
    const question = parsed.data.question;
    const includesContactDetails =
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(question) ||
      /(?:\+?234|0)[\s().-]*(?:\d[\s().-]*){10,}/.test(question);
    if (includesContactDetails) {
      return res.status(400).json({ message: "Please remove email addresses and phone numbers from your question." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "The AI loan guide is unavailable right now. You can still use the calculator or contact Citygate directly." });
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are the Taskdrip loan information guide. Answer general questions about how to use the Citygate Global loan-options page and its calculator. Known facts: the listed categories are Payday, Payroll, SME working capital, Asset financing, and Monee; the on-page estimate is a deterministic illustration using the lower of the requested amount (if entered) and 30% of monthly net income times the selected 1–6 month term; if monthly net income is zero, the illustration can use six-month business turnover divided by six. It excludes interest and fees.

Do not claim or predict eligibility, approval, access to funds, repayment terms, rates, or fees. Do not invent lender requirements or official product terms. The lender alone makes decisions and confirms current terms. If asked for a personalized decision, direct the person to submit an enquiry and confirm details with Citygate Global. Never ask for personal, contact, identity, health, or financial account details. Keep the answer factual, calm, and under 100 words. Do not use emojis.`,
            },
            {
              role: "user",
              content: `Selected loan category: ${parsed.data.loanType || "not selected"}\nQuestion: ${question}`,
            },
          ],
          max_tokens: 220,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        console.error(`[citygate-loans] AI guide provider returned HTTP ${response.status}.`);
        return res.status(502).json({ message: "The AI loan guide is temporarily unavailable. Please try again or use the calculator." });
      }

      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        return res.status(502).json({ message: "The AI loan guide could not prepare an answer. Please try again." });
      }
      return res.json({ answer });
    } catch (error) {
      console.error("[citygate-loans] AI guide request failed:", error);
      return res.status(502).json({ message: "The AI loan guide is temporarily unavailable. Please try again or use the calculator." });
    }
  });

  app.post("/api/citygate-loans/applications", applicationLimiter, async (req, res) => {
    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Please check the application details and try again.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const birthDate = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== input.dateOfBirth) {
      return res.status(400).json({ message: "Enter a valid date of birth." });
    }
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const beforeBirthday =
      today.getUTCMonth() < birthDate.getUTCMonth() ||
      (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());
    if (beforeBirthday) age -= 1;
    if (age < 18 || age > 100) {
      return res.status(400).json({ message: "Applicants must be at least 18 years old." });
    }

    const estimate = estimateAffordability(input);
    const email = input.email.toLowerCase();
    const ipAddress = (req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim().slice(0, 64);

    try {
      const [application] = await db.insert(citygateLoanApplications).values({
        ...input,
        email,
        sixMonthTurnover: String(input.sixMonthTurnover),
        monthlyNetIncome: String(input.monthlyNetIncome),
        assetAmount: String(input.assetAmount),
        requestedAmount: String(input.requestedAmount),
        estimateNaira: String(estimate.estimateNaira),
        estimateBasis: estimate.estimateBasis,
        source: "/citygate-global-loans",
        segment: "citygate-global",
        status: "new",
        emailNotificationStatus: "pending",
      }).returning({ id: citygateLoanApplications.id });

      if (input.marketingConsent) {
        try {
          await db.insert(newsletterSubscribers).values({
            email,
            name: input.fullName,
            source: "loans",
            segment: "loans,citygate-global",
            ipAddress,
          }).onConflictDoUpdate({
            target: newsletterSubscribers.email,
            set: {
              name: input.fullName,
              source: "loans",
              status: "active",
              segment: sql`concat_ws(
                ',',
                nullif(trim(coalesce(${newsletterSubscribers.segment}, '')), ''),
                CASE
                  WHEN (',' || coalesce(${newsletterSubscribers.segment}, '') || ',') LIKE '%,loans,%' THEN NULL
                  ELSE 'loans'
                END,
                CASE
                  WHEN (',' || coalesce(${newsletterSubscribers.segment}, '') || ',') LIKE '%,citygate-global,%' THEN NULL
                  ELSE 'citygate-global'
                END
              )`,
            },
          });
        } catch (marketingError) {
          // The loan enquiry is the primary request. An optional newsletter
          // subscription failure must not roll it back or turn it into a 500.
          console.error("[citygate-loans] Application saved, but marketing opt-in sync failed:", marketingError);
        }
      }

      const fields: Array<[string, string]> = [
        ["Name", input.fullName],
        ["Email", email],
        ["Phone", input.phone],
        ["Date of birth", input.dateOfBirth],
        ["State", input.state],
        ["Loan type", input.loanType],
        ["Employment status", input.employmentStatus],
        ["Business type", input.businessType],
        ["Product sold", input.productSold],
        ["Six-month business turnover", input.sixMonthTurnover ? `₦${input.sixMonthTurnover.toLocaleString("en-NG")}` : ""],
        ["Monthly net income", input.monthlyNetIncome ? `₦${input.monthlyNetIncome.toLocaleString("en-NG")}` : ""],
        ["Asset value", input.assetAmount ? `₦${input.assetAmount.toLocaleString("en-NG")}` : ""],
        ["Amount requested", input.requestedAmount ? `₦${input.requestedAmount.toLocaleString("en-NG")}` : ""],
        ["Chosen period", `${input.tenureMonths} month(s)`],
        ["Illustrative cash-flow estimate", `₦${estimate.estimateNaira.toLocaleString("en-NG")}`],
        ["Estimate basis", estimate.estimateBasis],
        ["Marketing opt-in", input.marketingConsent ? "Yes" : "No"],
      ];
      const html = `<h2>New Citygate Global loan enquiry</h2><p>Application reference: ${escapeHtml(application.id)}</p><table cellpadding="8" cellspacing="0" style="border-collapse:collapse">${fields
        .filter(([, value]) => value)
        .map(([label, value]) => `<tr><th align="left" style="border:1px solid #ddd">${escapeHtml(label)}</th><td style="border:1px solid #ddd">${escapeHtml(value)}</td></tr>`)
        .join("")}</table><p>This estimate is an illustrative cash-flow calculation, not a credit decision or Citygate offer.</p>`;

      let emailSent = false;
      try {
        const notification = await sendEmail({
          to: "taskdrip@gmail.com",
          cc: ["victoria.ojo@citygate.com"],
          subject: `Citygate loan enquiry — ${input.fullName}`,
          html,
          text: fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n"),
        });
        emailSent = notification.success;
      } catch (notificationError) {
        console.error("[citygate-loans] Email notification failed:", notificationError);
      }

      try {
        await db.update(citygateLoanApplications)
          .set({ emailNotificationStatus: emailSent ? "sent" : "failed" })
          .where(eq(citygateLoanApplications.id, application.id));
      } catch (statusError) {
        console.error("[citygate-loans] Could not save email notification status:", statusError);
      }

      return res.status(201).json({
        id: application.id,
        estimateNaira: estimate.estimateNaira,
        estimateBasis: estimate.estimateBasis,
        emailSent,
      });
    } catch (error) {
      console.error("[citygate-loans] Application could not be saved or processed:", error);
      return res.status(500).json({ message: "We could not save your application. Please try again." });
    }
  });

  app.get("/api/admin/citygate-loan-applications", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 120) : "";
      const status = typeof req.query.status === "string" ? req.query.status : "";
      const filters = [];
      if (search) {
        const term = `%${search.replace(/[%_]/g, "\\$&")}%`;
        filters.push(or(
          ilike(citygateLoanApplications.fullName, term),
          ilike(citygateLoanApplications.email, term),
          ilike(citygateLoanApplications.phone, term),
        )!);
      }
      if (status && ["new", "contacted", "qualified", "closed"].includes(status)) {
        filters.push(eq(citygateLoanApplications.status, status));
      }
      const query = db.select().from(citygateLoanApplications)
        .orderBy(desc(citygateLoanApplications.createdAt))
        .limit(300);
      const rows = filters.length ? await query.where(and(...filters)) : await query;
      res.json(rows);
    } catch (error) {
      console.error("[citygate-loans] Admin list failed:", error);
      res.status(500).json({ message: "Unable to load loan applications." });
    }
  });

  app.patch("/api/admin/citygate-loan-applications/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    const status = req.body?.status;
    if (!["new", "contacted", "qualified", "closed"].includes(status)) {
      return res.status(400).json({ message: "Choose a valid application status." });
    }
    try {
      const [updated] = await db.update(citygateLoanApplications)
        .set({ status })
        .where(eq(citygateLoanApplications.id, req.params.id))
        .returning({ id: citygateLoanApplications.id });
      if (!updated) return res.status(404).json({ message: "Application not found." });
      res.json({ success: true });
    } catch (error) {
      console.error("[citygate-loans] Status update failed:", error);
      res.status(500).json({ message: "Unable to update application status." });
    }
  });
}
