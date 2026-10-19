import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AsiafilmSmartlinkCard() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
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

  useEffect(() => {
    const findMountNode = () => {
      const nextNode = document.querySelector<HTMLElement>("[data-asiafilm-smartlink-mount]");
      setMountNode((current) => (current === nextNode ? current : nextNode));
    };

    findMountNode();
    const observer = new MutationObserver(findMountNode);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const card = (
    <aside
      aria-labelledby="asiafilm-smartlink-title"
      data-testid="asiafilm-smartlink-card"
      className="mx-auto my-10 w-full max-w-7xl px-4"
    >
      <div className="grid overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-h-48 bg-slate-950 md:min-h-64">
          <img
            src="/asiafilm-featured.svg"
            alt="Abstract cinema-inspired artwork for the featured AsiaFilm link"
            className="h-full min-h-48 w-full object-cover md:min-h-64"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col items-start justify-center p-6 sm:p-8">
          <span className="mb-3 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            Sponsored link
          </span>
          <h2 id="asiafilm-smartlink-title" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Discover the featured AsiaFilm link
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Open the featured destination through Taskdrip’s tracked short link.
          </p>
          <a
            href={data?.href ?? "/s/asiafilm-featured"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
            data-testid="button-asiafilm-smartlink"
          >
            View featured link <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </aside>
  );

  return mountNode ? createPortal(card, mountNode) : card;
}
