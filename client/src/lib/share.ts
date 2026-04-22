import { toast } from "@/hooks/use-toast";

export interface ShareItem {
  title: string;
  text?: string;
  url?: string;
}

export async function shareItem({ title, text, url }: ShareItem) {
  const fullUrl = url ? (url.startsWith("http") ? url : `${window.location.origin}${url}`) : window.location.href;
  const payload = { title, text: text || title, url: fullUrl };
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share(payload);
      return true;
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return false;
  }
  try {
    await navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copied", description: "Share link copied to clipboard." });
    return true;
  } catch {
    toast({ title: "Couldn't share", description: fullUrl, variant: "destructive" });
    return false;
  }
}
