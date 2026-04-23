const SCRIPT_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /<\/?\s*(script|iframe|object|embed|form|meta|link|style|base)\b[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on(?:load|click|error|mouse\w*|focus|blur|change|submit|key\w*|drag\w*|drop|touch\w*|animation\w*|transition\w*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
  /expression\s*\(/gi,
  /srcdoc\s*=/gi,
];

const DANGEROUS_URL_PATTERNS = [
  /\bhttps?:\/\/\S+\.(?:exe|bat|cmd|sh|ps1|scr|vbs|jar|msi|com|dll)(?:\?\S*)?/gi,
  /\bfile:\/\//gi,
];

export function containsMaliciousContent(text: string | null | undefined): boolean {
  if (!text) return false;
  const s = String(text);
  return SCRIPT_PATTERNS.some(p => { p.lastIndex = 0; return p.test(s); })
    || DANGEROUS_URL_PATTERNS.some(p => { p.lastIndex = 0; return p.test(s); });
}

/**
 * Strip dangerous HTML/script fragments, inline event handlers, javascript:/data: URLs,
 * and links to executable binaries. Safe plain text and normal URLs pass through.
 */
export function sanitizeUserText(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  let s = String(text);
  for (const p of SCRIPT_PATTERNS) { p.lastIndex = 0; s = s.replace(p, ''); }
  for (const p of DANGEROUS_URL_PATTERNS) { p.lastIndex = 0; s = s.replace(p, '[blocked link]'); }
  return s;
}

/**
 * Express middleware that sanitizes common text-bearing body fields in place.
 * Applied to chat/message/comment/post-like routes.
 */
const DEFAULT_FIELDS = ['content', 'message', 'comment', 'description', 'subject', 'title', 'bio'];
export function sanitizeBodyFields(fields: string[] = DEFAULT_FIELDS) {
  return (req: any, _res: any, next: any) => {
    if (req.body && typeof req.body === 'object') {
      for (const f of fields) {
        if (typeof req.body[f] === 'string') req.body[f] = sanitizeUserText(req.body[f]);
      }
    }
    next();
  };
}
