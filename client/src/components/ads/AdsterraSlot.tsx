import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { AdsterraPageTarget, AdsterraPlacement, AdsterraPosition, AdsterraSettingsValue } from "@shared/schema";
import { SandboxedAdFrame } from "@/components/ads/SandboxedAdFrame";

type PublicSettings = AdsterraSettingsValue & { shortenerBaseUrl?: string };

const pageClaims = new Map<string, Set<string>>();
const MAX_VISIBLE_SLOTS_PER_PAGE = 4;

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getPageTarget(path: string): AdsterraPageTarget {
  if (path === "/blog") return "blog";
  if (path.startsWith("/blog/")) return "article";
  return "site";
}

function getAdMarkup(placement: AdsterraPlacement) {
  const width = placement.width || 300;
  const height = placement.height || 250;
  if (placement.format === "iframe") {
    const options = JSON.stringify({ key: placement.key, format: "iframe", width, height, params: {} });
    const source = placement.tagUrl || `https://www.highperformanceformat.com/${placement.key}/invoke.js`;
    return `<script>var atOptions=${options};</script><script type="text/javascript" src="${escapeAttribute(source)}"></script>`;
  }
  if (placement.format === "native") {
    if (!placement.tagUrl) return "";
    return `<div id="container-${placement.key}" style="width:100%;max-width:100%"></div><script async="async" data-cfasync="false" src="${escapeAttribute(placement.tagUrl)}"></script>`;
  }
  if (placement.format === "socialbar") {
    if (!placement.tagUrl) return "";
    return `<script data-cfasync="false" src="${escapeAttribute(placement.tagUrl)}"></script>`;
  }
  return "";
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
  const eligiblePlacements = settings?.enabled
    ? settings.placements.filter((item) =>
      item.enabled && item.format !== "popunder" && item.position === position && pageAllows(item, pageTarget),
    )
    : [];
  const placements = eligiblePlacements;
  const placementSignature = placements
    .map((item) => `${item.id}:${item.format}:${item.key}:${item.width || 0}:${item.height || 0}:${item.shortSlug || ""}`)
    .join("|");
  const [slotClaimed, setSlotClaimed] = useState(false);
  const slotId = `${location}:${position}`;

  useEffect(() => {
    if (placements.length === 0) {
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
  }, [location, placementSignature, slotId]);

  if (!slotClaimed || placements.length === 0) return null;

  return (
    <>
      {placements.map((placement) => (
        <AdsterraPlacement
          key={`${location}:${placement.id}:${placement.key}:${placement.shortSlug || ""}`}
          placement={placement}
          position={position}
          location={location}
          baseUrl={settings?.shortenerBaseUrl || "https://taskdrip.online"}
        />
      ))}
    </>
  );
}

function AdsterraPlacement({
  placement,
  position,
  location,
  baseUrl,
}: {
  placement: AdsterraPlacement;
  position: AdsterraPosition;
  location: string;
  baseUrl: string;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const impressionTracked = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  const width = placement.width || 300;
  const height = placement.height || 250;
  const isSidebar = position === "sidebar";
  const isFloating = position === "floating";
  const hideUnavailableAd = useCallback(() => setUnavailable(true), []);

  useEffect(() => {
    if (impressionTracked.current) return;

    const record = () => {
      if (impressionTracked.current) return;
      impressionTracked.current = true;
      trackImpression(placement.id, location.split("?")[0] || "/");
    };

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
  }, [location, placement.id, placement.format, placement.key]);

  if (unavailable) return null;
  if (placement.format === "popunder") return null;
  if (placement.format === "smartlink") {
    if (!placement.shortSlug) return null;
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
      <div className="max-w-full overflow-hidden" style={{ width: `min(${width}px, calc(100vw - 32px))` }}>
        <SandboxedAdFrame
          id={placement.id}
          title={`Advertisement: ${placement.name}`}
          html={getAdMarkup(placement)}
          initialHeight={placement.format === "native" ? Math.max(height, 320) : height}
          onUnavailable={hideUnavailableAd}
        />
      </div>
      <span className="sr-only">Advertisement</span>
    </section>
  );
}
