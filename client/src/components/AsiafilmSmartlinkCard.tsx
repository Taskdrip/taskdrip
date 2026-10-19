import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AdsterraSettingsValue } from "@shared/schema";

type SmartlinkPosition = keyof AdsterraSettingsValue["featuredSmartlink"];
type PublicSettings = Pick<AdsterraSettingsValue, "featuredSmartlink">;

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
        className="group relative inline-flex aspect-[5/1] w-full max-w-[750px] items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/20 bg-slate-950 bg-cover bg-center px-4 text-left text-xs font-semibold text-white shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:rounded-2xl sm:px-6 sm:text-sm"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15, 23, 42, .92) 0%, rgba(15, 23, 42, .68) 48%, rgba(15, 23, 42, .18) 100%), url('/asiafilm-featured.svg')",
        }}
        data-testid="button-asiafilm-smartlink"
      >
        <span className="relative z-10 flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="truncate">Discover the featured AsiaFilm link</span>
          <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
        <span className="relative z-10 hidden shrink-0 rounded-md border border-white/35 bg-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm sm:inline-flex sm:items-center">
          Sponsored link
        </span>
      </a>
    </aside>
  );

  if (!settings?.featuredSmartlink) return null;
  return (
    <>
      {mountNodes.map(({ node, position }) =>
        settings.featuredSmartlink?.[position] ? createPortal(card(position), node, position) : null,
      )}
    </>
  );
}
