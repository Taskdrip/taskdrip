import { SOCIALS } from "@/config/socials";

const WA_NUMBER_DIGITS = SOCIALS.whatsapp.replace(/[^0-9]/g, "");

export function buildWhatsAppUrl(lines: string[], phoneOrUrl = WA_NUMBER_DIGITS): string {
  const body = lines.filter(Boolean).join("\n");
  const phoneDigits = phoneOrUrl.replace(/[^0-9]/g, "");
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(body)}`;
}

export function openWhatsAppOrder(lines: string[], phoneOrUrl?: string): void {
  const url = buildWhatsAppUrl(lines, phoneOrUrl);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function whatsappHeader(title: string): string[] {
  return [`*Taskdrip — ${title}*`, ""];
}
