import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AdsterraSettingsValue } from "@shared/schema";
import projectorScene from "@assets/generated_images/asiafilm-cinema-projector.jpg";
import neonCinemaScene from "@assets/generated_images/asiafilm-neon-cinema.jpg";

type SmartlinkPosition = keyof AdsterraSettingsValue["featuredSmartlink"];
type PublicSettings = Pick<AdsterraSettingsValue, "featuredSmartlink">;

const POSITION_LABELS: Record<SmartlinkPosition, string> = {
  afterHeader: "after the article header",
  middleBody: "in the article body",
  footer: "in the footer",
};

const BACKGROUND_SCENES = [
  "/asiafilm-featured.svg",
  projectorScene,
  neonCinemaScene,
];

export function AsiafilmSmartlinkCard() {
  const [activeScene, setActiveScene] = useState(0);
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
    const hasActiveMount = settings?.featuredSmartlink &&
      mountNodes.some(({ position }) => settings.featuredSmartlink[position]);
    if (!hasActiveMount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % BACKGROUND_SCENES.length);
    }, 5_500);
    return () => window.clearInterval(interval);
  }, [mountNodes, settings?.featuredSmartlink]);

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
        aria-label="Step into the world of AsiaFilm"
        className="group relative isolate inline-flex aspect-[5/1] w-full max-w-[750px] items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/20 bg-slate-950 px-4 text-left text-xs font-semibold text-white shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:rounded-2xl sm:px-6 sm:text-sm"
        data-testid="button-asiafilm-smartlink"
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {BACKGROUND_SCENES.map((scene, index) => (
            <img
              key={scene}
              src={scene}
              alt=""
              draggable={false}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
                activeScene === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <span className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/20" />
        </span>
        <span className="relative z-10 flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="min-w-0">
            <span className="mb-0.5 block text-[8px] font-bold uppercase tracking-[0.18em] text-violet-200 sm:text-[10px]">
              Featured destination
            </span>
            <span className="block truncate text-[11px] font-bold sm:text-lg">
              Step into the world of AsiaFilm
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors group-hover:bg-violet-500 sm:inline-flex">
            Explore now
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:hidden" aria-hidden="true" />
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
