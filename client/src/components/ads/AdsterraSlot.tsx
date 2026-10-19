import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { AdsterraPageTarget, AdsterraPlacement, AdsterraPosition, AdsterraSettingsValue } from "@shared/schema";

type PublicSettings = AdsterraSettingsValue & { shortenerBaseUrl?: string };

const pageClaims = new Map<string, Set<string>>();
const MAX_VISIBLE_SLOTS_PER_PAGE = 4;

function getPageTarget(path: string): AdsterraPageTarget {
  if (path === "/blog") return "blog";
  if (path.startsWith("/blog/")) return "article";
  return "site";
}

function getAdScriptUrl(placement: AdsterraPlacement) {
  if (placement.format === "native" || placement.format === "popunder") {
    return `https://afders.org/1/${placement.key}`;
  }
  if (placement.format === "socialbar") {
    return `https://bicea.org/14/${placement.key}`;
  }
  return "";
}

function getIframeDocument(placement: AdsterraPlacement) {
  const width = placement.width || 300;
  const height = placement.height || 250;
  const scriptUrl = placement.format === "native" || placement.format === "socialbar"
    ? getAdScriptUrl(placement)
    : `https://bicea.org/22/${placement.key}`;
  const options = JSON.stringify({ key: placement.key, format: "iframe", width, height, params: {} });
  const optionScript = placement.format === "iframe" ? `<script>var atOptions=${options};</script>` : "";
  const cfAsync = placement.format === "native" || placement.format === "socialbar" ? ` data-cfasync="false"` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;width:100%;height:100%;display:flex;align-items:center;justify-content:center}</style></head><body>${optionScript}<script${cfAsync} src="${scriptUrl}"></script></body></html>`;
}

function pageAllows(placement: AdsterraPlacement, pageTarget: AdsterraPageTarget) {
  return placement.pages.includes("all") || placement.pages.includes(pageTarget);
}

function trackImpression(placementId: string, pagePath: string) {
  fetch("/api/adsterra/impressions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placementId, pagePath }),
    keepalive: true,
  }).catch(() => undefined);
}

export function AdsterraSlot({ position }: { position: AdsterraPosition }) {
  const [location] = useLocation();
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/adsterra/public-settings"],
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
  const pageTarget = getPageTarget(location);
  const placement = settings?.enabled
    ? settings.placements.find((item) => item.enabled && item.position === position && pageAllows(item, pageTarget))
    : undefined;
  const placementSignature = placement
    ? `${placement.id}:${placement.format}:${placement.key}:${placement.width || 0}:${placement.height || 0}`
    : "";
  const containerRef = useRef<HTMLElement | null>(null);
  const impressionTracked = useRef(false);
  const [slotClaimed, setSlotClaimed] = useState(false);
  const slotId = `${location}:${position}`;

  useEffect(() => {
    if (!placement) {
      setSlotClaimed(false);
      return;
    }
    let claims = pageClaims.get(location);
    if (!claims) {
      claims = new Set();
      pageClaims.set(location, claims);
    }
    if (!claims.has(slotId) && claims.size >= MAX_VISIBLE_SLOTS_PER_PAGE) {
      setSlotClaimed(false);
      return;
    }
    claims.add(slotId);
    setSlotClaimed(true);
    return () => {
      claims?.delete(slotId);
      if (claims?.size === 0) pageClaims.delete(location);
    };
  }, [location, placement?.id, slotId]);

  useEffect(() => {
    if (!placement || !slotClaimed || impressionTracked.current) return;

    const record = () => {
      if (impressionTracked.current) return;
      impressionTracked.current = true;
      trackImpression(placement.id, location.split("?")[0] || "/");
    };

    if (placement.format === "popunder") {
      const script = document.createElement("script");
      script.src = getAdScriptUrl(placement);
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.dataset.taskdripAdsterra = placement.id;
      document.body.appendChild(script);
      record();
      return () => {
        script.remove();
      };
    }

    const node = containerRef.current;
    if (!node) return;
    let visibilityTimer: ReturnType<typeof setTimeout> | undefined;
    if (typeof IntersectionObserver === "undefined") {
      const fallbackTimer = setTimeout(record, 1000);
      return () => clearTimeout(fallbackTimer);
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
        visibilityTimer = setTimeout(record, 1000);
      } else if (visibilityTimer) {
        clearTimeout(visibilityTimer);
      }
    }, { threshold: [0.5] });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (visibilityTimer) clearTimeout(visibilityTimer);
    };
  }, [location, placementSignature, slotClaimed]);

  if (!placement || !slotClaimed) return null;

  if (placement.format === "popunder") return null;
  if (placement.format === "smartlink") {
    if (!placement.shortSlug) return null;
    const baseUrl = settings?.shortenerBaseUrl || "https://taskdrip.online";
    return (
      <section
        ref={containerRef}
        aria-label="Sponsored link"
        data-adsterra-placement={placement.id}
        className="my-6 flex justify-center"
      >
        <a
          href={`${baseUrl}/s/${placement.shortSlug}`}
          target="_blank"
          rel="noopener"
          className="flex min-h-16 w-full max-w-xl items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-gray-800 transition hover:border-gray-300 hover:bg-gray-100"
        >
          <span>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Sponsored</span>
            <span className="font-semibold">{placement.name}</span>
          </span>
          <span className="shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">View offer</span>
        </a>
      </section>
    );
  }

  const width = placement.width || 300;
  const height = placement.height || 250;
  const isSidebar = position === "sidebar";
  const isFloating = position === "floating";
  return (
    <section
      ref={containerRef}
      aria-label="Advertisement"
      data-adsterra-placement={placement.id}
      className={[
        "relative flex max-w-full justify-center overflow-hidden",
        isSidebar ? "my-4 hidden md:flex md:justify-start md:float-right md:ml-6 md:mb-4 md:w-fit" : "my-6",
        isFloating ? "fixed bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-white/90 p-1 shadow-xl" : "",
      ].join(" ")}
      style={{ width: isSidebar ? `${width}px` : isFloating ? `min(${width}px, calc(100vw - 24px))` : "100%" }}
    >
      <div className="max-w-full overflow-hidden">
        <iframe
          title={`Advertisement: ${placement.name}`}
          srcDoc={getIframeDocument(placement)}
          width={width}
          height={height}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="max-w-full border-0"
          style={{ width: `min(${width}px, calc(100vw - 32px))`, height }}
        />
      </div>
      <span className="sr-only">Advertisement</span>
    </section>
  );
}
