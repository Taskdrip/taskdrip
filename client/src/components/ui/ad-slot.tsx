import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface AdSlotProps {
  page: string;
  placementType: "inline" | "sidebar" | "banner_top" | "banner_bottom";
  className?: string;
}

function AdSlotRenderer({ adCode, id }: { adCode: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const range = document.createRange();
    range.selectNode(ref.current);
    const fragment = range.createContextualFragment(adCode);
    const scripts = Array.from(fragment.querySelectorAll("script"));
    ref.current.appendChild(fragment);
    scripts.forEach(oldScript => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      document.head.appendChild(newScript);
    });
  }, [adCode, id]);

  return <div ref={ref} data-testid={`ad-slot-${id}`} />;
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
