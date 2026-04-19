export interface ScanResult {
  isSafe: boolean;
  threats: string[];
  warning?: string;
}

const MALICIOUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /eval\s*\(/gi,
  /document\.(cookie|write|location)/gi,
  /innerHTML\s*=/gi,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /data:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
  /fromCharCode/gi,
  /atob\s*\(/gi,
  /unescape\s*\(/gi,
];

const SQL_PATTERNS = [
  /(\b)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION|EXEC)\b.{0,50}(FROM|INTO|TABLE|WHERE|SET)/gi,
  /(['"])\s*OR\s*['"]?\d+['"]?\s*=\s*['"]?\d+/gi,
  /WAITFOR\s+DELAY/gi,
  /xp_cmdshell/gi,
];

const UNSAFE_URL_PATTERNS = [
  /^javascript:/i,
  /^vbscript:/i,
  /^data:text\/html/i,
  /\.(exe|bat|cmd|sh|ps1|msi|dll|scr|pif)(\?.*)?$/i,
];

export function scanText(text: string): ScanResult {
  const threats: string[] = [];

  for (const pattern of MALICIOUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      threats.push("Malicious script or HTML injection detected");
      break;
    }
  }

  for (const pattern of SQL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      threats.push("Potential SQL injection pattern detected");
      break;
    }
  }

  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  const urls = text.match(urlRegex) || [];
  for (const url of urls) {
    for (const p of UNSAFE_URL_PATTERNS) {
      if (p.test(url)) {
        threats.push("Unsafe or malicious URL detected");
        break;
      }
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        threats.push("Non-standard URL protocol detected");
      }
    } catch {
      // malformed — not flagging plain text
    }
  }

  return {
    isSafe: threats.length === 0,
    threats: [...new Set(threats)],
    warning: threats.length > 0
      ? "Content contains potentially harmful elements. Adding malicious content can result in a permanent account ban."
      : undefined,
  };
}

export function scanUrl(url: string): ScanResult {
  const threats: string[] = [];
  for (const p of UNSAFE_URL_PATTERNS) {
    if (p.test(url)) {
      threats.push("Unsafe or malicious URL detected");
      break;
    }
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      threats.push("Non-standard URL protocol detected");
    }
  } catch {
    threats.push("Malformed URL");
  }
  return {
    isSafe: threats.length === 0,
    threats: [...new Set(threats)],
    warning: threats.length > 0 ? "Unsafe URL detected" : undefined,
  };
}

export function scanRequestBody(body: any, depth = 0): ScanResult {
  if (depth > 5) return { isSafe: true, threats: [] };
  const threats: string[] = [];

  if (typeof body === "string") {
    const r = scanText(body);
    if (!r.isSafe) threats.push(...r.threats);
  } else if (Array.isArray(body)) {
    for (const item of body) {
      const r = scanRequestBody(item, depth + 1);
      if (!r.isSafe) threats.push(...r.threats);
    }
  } else if (body && typeof body === "object") {
    for (const val of Object.values(body)) {
      const r = scanRequestBody(val, depth + 1);
      if (!r.isSafe) threats.push(...r.threats);
    }
  }

  return {
    isSafe: threats.length === 0,
    threats: [...new Set(threats)],
    warning: threats.length > 0 ? "Content contains potentially harmful elements." : undefined,
  };
}
