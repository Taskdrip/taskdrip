import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AdsterraSettingsValue } from "@shared/schema";

type SmartlinkPosition = keyof AdsterraSettingsValue["featuredSmartlink"];
type PublicSettings = Pick<AdsterraSettingsValue, "enabled" | "featuredSmartlink">;

const POSITION_LABELS: Record<SmartlinkPosition, string> = {
  afterHeader: "after the article header",
  middleBody: "in the article body",
  footer: "in the footer",
};

export function AsiafilmSmartlinkCard() {
  const [mountNodes, setMountNodes] = useState<Array<{ node: HTMLElement; position: SmartlinkPosition }>>([]);
  const { data } = useQuery<{ href: string }>({
    queryKey: ["/api/featured-smartlink"],
    queryFn: async () => {
      const response = await fetch("/api/featured-smartlink");
      if (!response.ok) throw new Error("Featured link is unavailable.");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/adsterra/public-settings"],
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });

  useEffect(() => {
    const findMountNodes = () => {
      const nextNodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-asiafilm-smartlink-mount]"),
      ).flatMap((node) => {
        const position = node.dataset.asiafilmSmartlinkMount as SmartlinkPosition;
        return ["afterHeader", "middleBody", "footer"].includes(position) ? [{ node, position }] : [];
      });
      setMountNodes((current) => {
        const unchanged = current.length === nextNodes.length &&
          current.every((item, index) => item.node === nextNodes[index].node && item.position === nextNodes[index].position);
        return unchanged ? current : nextNodes;
      });
    };

    findMountNodes();
    const observer = new MutationObserver(findMountNodes);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const card = (position: SmartlinkPosition) => (
    <aside
      aria-label={`Sponsored link ${POSITION_LABELS[position]}`}
      data-testid={`asiafilm-smartlink-${position}`}
      className="my-5 flex justify-center px-4"
    >
      <a
        href={data?.href ?? "/s/asiafilm-featured"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-violet-700 bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-violet-800 hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
        data-testid="button-asiafilm-smartlink"
      >
        Discover the featured AsiaFilm link <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </aside>
  );

  if (!settings?.enabled) return null;
  return (
    <>
      {mountNodes.map(({ node, position }) =>
        settings.featuredSmartlink?.[position] ? createPortal(card(position), node, position) : null,
      )}
    </>
  );
}
