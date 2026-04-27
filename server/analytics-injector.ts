import { db } from "./db";
import { appSettings } from "@shared/schema";
import { inArray } from "drizzle-orm";

const HEAD_KEY = "analytics_head_code";
const BODY_KEY = "analytics_body_code";
const ENABLED_KEY = "analytics_enabled";

const CACHE_MS = 30_000;
let cache: { headCode: string; bodyCode: string; enabled: boolean; ts: number } = {
  headCode: "",
  bodyCode: "",
  enabled: false,
  ts: 0,
};

export async function getAnalyticsCodes(): Promise<{ headCode: string; bodyCode: string; enabled: boolean }> {
  const now = Date.now();
  if (now - cache.ts < CACHE_MS) {
    return { headCode: cache.headCode, bodyCode: cache.bodyCode, enabled: cache.enabled };
  }
  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(inArray(appSettings.key, [HEAD_KEY, BODY_KEY, ENABLED_KEY]));
    const map = new Map(rows.map((r) => [r.key, r.value || ""]));
    cache = {
      headCode: map.get(HEAD_KEY) || "",
      bodyCode: map.get(BODY_KEY) || "",
      enabled: (map.get(ENABLED_KEY) || "true") !== "false",
      ts: now,
    };
  } catch {
    cache = { headCode: "", bodyCode: "", enabled: false, ts: now };
  }
  return { headCode: cache.headCode, bodyCode: cache.bodyCode, enabled: cache.enabled };
}

export function invalidateAnalyticsCache() {
  cache.ts = 0;
}

const FORBIDDEN = /<\s*\/?(html|head|body)\b[^>]*>/i;

function sanitize(snippet: string): string {
  if (!snippet) return "";
  if (FORBIDDEN.test(snippet)) return "";
  return snippet;
}

export async function injectAnalytics(html: string): Promise<string> {
  try {
    const { headCode, bodyCode, enabled } = await getAnalyticsCodes();
    if (!enabled) return html;
    const safeHead = sanitize(headCode);
    const safeBody = sanitize(bodyCode);
    let out = html;
    if (safeHead) {
      const headBlock = `\n<!-- analytics:head:start -->\n${safeHead}\n<!-- analytics:head:end -->\n`;
      if (/<\/head>/i.test(out)) {
        out = out.replace(/<\/head>/i, `${headBlock}</head>`);
      }
    }
    if (safeBody) {
      const bodyBlock = `\n<!-- analytics:body:start -->\n${safeBody}\n<!-- analytics:body:end -->\n`;
      if (/<body[^>]*>/i.test(out)) {
        out = out.replace(/(<body[^>]*>)/i, `$1${bodyBlock}`);
      }
    }
    return out;
  } catch {
    return html;
  }
}
