import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SandboxedAdFrame } from "@/components/ads/SandboxedAdFrame";

interface AdSlotProps {
  page: string;
  placementType: "inline" | "sidebar" | "banner_top" | "banner_bottom";
  className?: string;
}

function AdSlotRenderer({ adCode, id }: { adCode: string; id: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const hideUnavailableAd = useCallback(() => setUnavailable(true), []);
  if (unavailable) return null;

  return (
    <div data-testid={`ad-slot-${id}`}>
      <SandboxedAdFrame
        id={`site-ad-${id}`}
        title="Sponsored advertisement"
        html={adCode}
        initialHeight={280}
        onUnavailable={hideUnavailableAd}
      />
    </div>
  );
}

export function AdSlot({ page, placementType, className = "" }: AdSlotProps) {
  const { data: ads = [] } = useQuery<any[]>({
    queryKey: ["/api/ad-networks", page, placementType],
    queryFn: () =>
      fetch(`/api/ad-networks?page=${page}&type=${placementType}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  if (!ads.length) return null;

  return (
    <div className={`ad-slot ad-slot--${placementType} ${className}`} data-testid={`ad-zone-${placementType}`}>
      {ads.map((ad: any) => (
        <AdSlotRenderer key={ad.id} adCode={ad.adCode} id={ad.id} />
      ))}
    </div>
  );
}
