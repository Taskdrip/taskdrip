export interface ScanResult {
  isSafe: boolean;
  threats: string[];
  warning?: string;
}

const MALICIOUS_SCRIPT_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["']?[^"'>]*/gi,
  /eval\s*\(/gi,
  /document\.(cookie|write|location)/gi,
  /window\.(location|open)/gi,
  /\.src\s*=/gi,
  /innerHTML\s*=/gi,
  /outerHTML\s*=/gi,
  /\bexec\s*\(/gi,
  /fetch\s*\(['"](https?:\/\/(?!taskdrip))/gi,
  /XMLHttpRequest/gi,
  /base64_decode/gi,
  /atob\s*\(/gi,
  /fromCharCode/gi,
  /unescape\s*\(/gi,
  /<!--.*?-->/gs,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /<form[\s\S]*?action\s*=/gi,
  /data:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*["']?\s*javascript/gi,
  /@import/gi,
  /behavior\s*:/gi,
  /binding\s*:/gi,
  /-moz-binding/gi,
];

const SQL_INJECTION_PATTERNS = [
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION|EXEC|EXECUTE)\b/gi,
  /(['"])\s*OR\s*['"]?\d+['"]?\s*=\s*['"]?\d+/gi,
  /--\s*$/gm,
  /\/\*.*?\*\//gs,
  /xp_\w+/gi,
  /WAITFOR\s+DELAY/gi,
  /BENCHMARK\s*\(/gi,
];

const UNSAFE_URL_PATTERNS = [
  /^javascript:/i,
  /^vbscript:/i,
  /^data:text\/html/i,
  /^data:application/i,
  /\.(exe|bat|cmd|sh|ps1|msi|dmg|apk|dll|scr|pif|com|lnk)(\?.*)?$/i,
];

const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|adf\.ly|bc\.vc|shorte\.st/i,
  /\.tk|\.ml|\.ga|\.cf|\.gq/i,
  /(\d{1,3}\.){3}\d{1,3}/,
];

const PHISHING_KEYWORDS = [
  /\b(verify\s+your\s+account|click\s+here\s+to\s+win|you\s+have\s+been\s+selected|limited\s+time\s+offer|act\s+now|your\s+account\s+has\s+been|suspended|locked|update\s+your\s+payment)/gi,
  /\b(free\s+money|earn\s+\$\d+|make\s+money\s+fast|work\s+from\s+home|100%\s+guaranteed|no\s+risk)/gi,
];

export function scanText(text: string): ScanResult {
  const threats: string[] = [];

  for (const pattern of MALICIOUS_SCRIPT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      threats.push("Malicious script or HTML injection detected");
      break;
    }
  }

  for (const pattern of SQL_INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      threats.push("Potential SQL injection pattern detected");
      break;
    }
  }

  for (const pattern of PHISHING_KEYWORDS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      threats.push("Potential phishing or scam content detected");
      break;
    }
  }

  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  const urls = text.match(urlRegex) || [];
  for (const url of urls) {
    const urlScan = scanUrl(url);
    if (!urlScan.isSafe) {
      threats.push(...urlScan.threats);
    }
  }

  return {
    isSafe: threats.length === 0,
    threats: [...new Set(threats)],
    warning: threats.length > 0
      ? "This content contains potentially harmful elements. Adding malicious scripts or unsafe links may result in your account being permanently banned."
      : undefined,
  };
}

export function scanUrl(url: string): ScanResult {
  const threats: string[] = [];

  for (const pattern of UNSAFE_URL_PATTERNS) {
    if (pattern.test(url)) {
      threats.push("Unsafe or executable URL detected");
      break;
    }
  }

  for (const pattern of SUSPICIOUS_URL_PATTERNS) {
    if (pattern.test(url)) {
      threats.push("Suspicious or shortened URL detected — ensure this link is safe");
      break;
    }
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      threats.push("Non-standard URL protocol detected");
    }
    if (parsed.protocol === "http:" && !parsed.hostname.includes("localhost")) {
      threats.push("Insecure HTTP link (not HTTPS) — this may expose users to risk");
    }
  } catch {
    if (url.length > 0) {
      threats.push("Malformed URL detected");
    }
  }

  return {
    isSafe: threats.length === 0,
    threats: [...new Set(threats)],
    warning: threats.length > 0
      ? "This URL may be unsafe or malicious. Adding harmful links can result in your account being permanently banned."
      : undefined,
  };
}

export function scanContent(content: string): ScanResult {
  return scanText(content);
}

export function sanitizeText(text: string): string {
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/<iframe[\s\S]*?>/gi, "")
    .replace(/<object[\s\S]*?>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .trim();
}
