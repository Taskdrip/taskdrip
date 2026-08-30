import type { NextFunction, Request, Response } from "express";
import { activityLogs } from "@shared/schema";
import { db } from "./db";
import { sendAdminActivityEmail, TASKDRIP_EMAILS } from "./email-service";

type ActivityStatus = "success" | "failed";

export interface ActivityInput {
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  eventType: string;
  action: string;
  description: string;
  route?: string | null;
  method?: string | null;
  status?: ActivityStatus;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const IGNORED_PATHS = [
  "/api/health",
  "/api/notifications/",
  "/api/page-views",
  "/api/online/ping",
  "/api/typing",
  "/api/ads/",
];

// These flows already have carefully formatted admin email notifications in their
// route handlers. The audit middleware still records them, but does not duplicate mail.
const ROUTES_WITH_EXISTING_ADMIN_EMAIL = [
  "/api/auth/register",
  "/api/purchases",
  "/api/advertise-applications",
  "/api/contact",
  "/api/hire-developer",
  "/api/transactions",
  "/api/subscriptions",
  "/api/escrow-payment/submit-proof",
  "/api/courses/",
  "/api/admin/email/",
];

const EVENT_LABELS: Record<string, string> = {
  registration: "New user registration",
  order: "New order activity",
  payment: "Payment activity",
  campaign: "Campaign activity",
  course: "Course activity",
  profile: "Profile activity",
  communication: "Communication activity",
  content: "Content activity",
  marketplace: "Marketplace activity",
  admin: "Admin activity",
  activity: "Platform activity",
};

function compact(value: unknown, max = 500): string | undefined {
  if (value === null || value === undefined) return undefined;
  const result = typeof value === "string" ? value : JSON.stringify(value);
  if (!result) return undefined;
  return result.length > max ? `${result.slice(0, max)}…` : result;
}

function sanitize(value: unknown, key = ""): unknown {
  const lowerKey = key.toLowerCase();
  if (/(password|pass|secret|token|authorization|cookie|paymentproof|paymentscreenshot|prooffile|attachment)/i.test(lowerKey)) {
    return "[redacted]";
  }
  if (typeof value === "string") return compact(value, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey)])
    );
  }
  return value;
}

function classify(path: string): string {
  if (path.includes("/register")) return "registration";
  if (path.includes("/purchase") || path.includes("/orders")) return "order";
  if (path.includes("payment") || path.includes("subscription") || path.includes("topup") || path.includes("transaction")) return "payment";
  if (path.includes("campaign")) return "campaign";
  if (path.includes("course") || path.includes("breedskool")) return "course";
  if (path.includes("profile") || path.includes("become-creator") || path.includes("message-privacy")) return "profile";
  if (path.includes("message") || path.includes("contact") || path.includes("hire")) return "communication";
  if (path.includes("post") || path.includes("blog") || path.includes("review") || path.includes("report")) return "content";
  if (path.includes("p2p") || path.includes("listing") || path.includes("payout")) return "marketplace";
  if (path.includes("/admin/")) return "admin";
  return "activity";
}

function shouldIgnore(path: string) {
  return IGNORED_PATHS.some((prefix) => path === prefix || path.startsWith(prefix));
}

function hasExistingEmail(path: string) {
  if (path.startsWith("/api/courses/")) return !path.endsWith("/enroll");
  return ROUTES_WITH_EXISTING_ADMIN_EMAIL.some((prefix) => path === prefix || path.startsWith(prefix));
}

function routeTitle(method: string, path: string) {
  const clean = path.replace(/^\/api\/?/, "").replace(/\/+/g, " ").replace(/[-_]/g, " ");
  return `${method} ${clean || "API action"}`.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function recordActivity(input: ActivityInput): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      actorId: input.actorId || null,
      actorName: input.actorName || null,
      actorEmail: input.actorEmail || null,
      eventType: input.eventType,
      action: input.action,
      description: input.description,
      route: input.route || null,
      method: input.method || null,
      status: input.status || "success",
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      metadata: input.metadata || {},
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    });
  } catch (error: any) {
    // Auditing must never break the customer-facing action.
    console.error("[activity] Could not record activity:", error?.message || error);
  }
}

function requestActor(req: Request) {
  const user = (req as any).user;
  const body = (req as any).body || {};
  const name = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : String(body.name || body.contactName || body.firstName || "").trim();
  const email = user?.email || body.email || body.contactEmail || undefined;
  return { id: user?.id || null, name: name || null, email: email || null };
}

export function activityAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const path = req.path;
  if (!isWrite || !path.startsWith("/api") || shouldIgnore(path)) return next();
  const startedAt = Date.now();

  res.on("finish", () => {
    const actor = requestActor(req);
    const status: ActivityStatus = res.statusCode >= 400 ? "failed" : "success";
    const body = sanitize((req as any).body || {}) as Record<string, unknown>;
    const eventType = classify(path);
    const title = routeTitle(req.method, path);
    const entityId = path.split("/").filter(Boolean).pop() || null;
    const details = Object.entries(body)
      .filter(([key]) => !["password", "smtpPass", "imapPass"].includes(key))
      .slice(0, 12)
      .map(([key, value]) => `${key}: ${compact(value, 180)}`)
      .join(" | ");

    void recordActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      eventType,
      action: title,
      description: `${status === "success" ? "Completed" : "Failed"} ${title}${details ? ` — ${details}` : ""}`,
      route: path,
      method: req.method,
      status,
      entityId: entityId && !entityId.startsWith("api") ? entityId : null,
      metadata: {
        request: body,
        responseStatus: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    // Send email only for successful user-facing actions not already covered by
    // a route-specific notification. Admin changes are recorded but do not email
    // the same administrator who made them.
    if (status === "success" && !hasExistingEmail(path) && (actor.id || actor.email) && (req as any).user?.userType !== "admin") {
      const label = EVENT_LABELS[eventType] || EVENT_LABELS.activity;
      void sendAdminActivityEmail({
        event: "activity",
        subject: `${label}: ${title}`,
        recipient: TASKDRIP_EMAILS.admin,
        fromEmail: TASKDRIP_EMAILS.info,
        customer: { name: actor.name || undefined, email: actor.email || undefined },
        details: [
          { label: "Action", value: title },
          { label: "Route", value: path },
          { label: "Status", value: `${res.statusCode} ${status}` },
          { label: "Details", value: details || "No form fields supplied" },
        ],
      });
    }
  });

  next();
}