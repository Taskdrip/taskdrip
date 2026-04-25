import { SOCIALS } from "@/config/socials";

const WA_NUMBER_DIGITS = SOCIALS.whatsapp.replace(/[^0-9]/g, "");

export function buildWhatsAppUrl(lines: string[]): string {
  const body = lines.filter(Boolean).join("\n");
  return `https://wa.me/${WA_NUMBER_DIGITS}?text=${encodeURIComponent(body)}`;
}

export function openWhatsAppOrder(lines: string[]): void {
  const url = buildWhatsAppUrl(lines);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function whatsappHeader(title: string): string[] {
  return [`*Taskdrip — ${title}*`, ""];
}
