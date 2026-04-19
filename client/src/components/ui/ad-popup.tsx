import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const POPUP_LS_KEY = "td_popup_ad_seen";

function canShowPopup(adId: string, frequency: string): boolean {
  try {
    const now = Date.now();
    const stored: Record<string, number> = JSON.parse(localStorage.getItem(POPUP_LS_KEY) || "{}");
    const last = stored[adId] || 0;
    if (frequency === "always") return true;
    if (frequency === "once") return !last;
    if (frequency === "session") {
      const sessionKey = sessionStorage.getItem(`td_popup_${adId}`);
      return !sessionKey;
    }
    if (frequency === "daily") return now - last > 24 * 60 * 60 * 1000;
    return true;
  } catch {
    return true;
  }
}

function markSeen(adId: string, frequency: string) {
  try {
    if (frequency === "session") {
      sessionStorage.setItem(`td_popup_${adId}`, "1");
    } else {
      const stored: Record<string, number> = JSON.parse(localStorage.getItem(POPUP_LS_KEY) || "{}");
      stored[adId] = Date.now();
      localStorage.setItem(POPUP_LS_KEY, JSON.stringify(stored));
    }
  } catch {}
}

function PopupAdRenderer({ ad }: { ad: any }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const delay = (ad.popupDelay ?? 5) * 1000;

  useEffect(() => {
    if (!canShowPopup(ad.id, ad.popupFrequency || "session")) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [ad.id, ad.popupFrequency, delay]);

  useEffect(() => {
    if (!visible || !ref.current) return;
    ref.current.innerHTML = "";
    const range = document.createRange();
    range.selectNode(ref.current);
    const fragment = range.createContextualFragment(ad.adCode);
    const scripts = Array.from(fragment.querySelectorAll("script"));
    ref.current.appendChild(fragment);
    scripts.forEach(oldScript => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      document.head.appendChild(newScript);
    });
    markSeen(ad.id, ad.popupFrequency || "session");
  }, [visible, ad]);

  const dismiss = () => setVisible(false);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      data-testid={`popup-ad-${ad.id}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Sponsored</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            onClick={dismiss}
            data-testid="button-close-popup-ad"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="p-4 overflow-auto max-h-[70vh]">
          <div ref={ref} />
        </div>
      </div>
    </div>
  );
}

export function AdPopupZone({ page }: { page: string }) {
  const { data: ads = [] } = useQuery<any[]>({
    queryKey: ["/api/ad-networks", page, "popup"],
    queryFn: () =>
      fetch(`/api/ad-networks?page=${page}&type=popup`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      {ads.map((ad: any) => (
        <PopupAdRenderer key={ad.id} ad={ad} />
      ))}
    </>
  );
}
