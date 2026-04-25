import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import type { SpotlightItem } from "@shared/schema";

interface SpotlightProps {
  page: string; // 'feed' | 'shop' | 'products' | 'services' | 'campaigns' | 'courses' | 'ads' | 'p2p' | 'landing'
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "grid" | "row";
}

const TYPE_DEFAULT_LINK: Record<string, (id: string) => string> = {
  shop_product: (id) => `/shop/${id}`,
  product: (id) => `/shop/${id}`,
  campaign: (id) => `/campaigns/${id}`,
  course: (id) => `/breedskool/course/${id}`,
  service: (id) => `/services/${id}`,
  p2p: (id) => `/p2p-hub/listing/${id}`,
  ad: (id) => `/ads/${id}`,
};

export function Spotlight({ page, title = "Spotlight", subtitle = "Curated by Taskdrip", className = "", variant = "grid" }: SpotlightProps) {
  const { data: items = [], isLoading } = useQuery<SpotlightItem[]>({
    queryKey: ["/api/spotlight", { page }],
    queryFn: async () => {
      const r = await fetch(`/api/spotlight?page=${encodeURIComponent(page)}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  if (isLoading || items.length === 0) return null;

  return (
    <section className={`relative ${className}`} data-testid={`spotlight-section-${page}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white" data-testid={`spotlight-title-${page}`}>{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hidden sm:inline-flex">Editor's Picks</Badge>
      </div>

      <div className={variant === "row"
        ? "flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
        {items.map((it: any) => {
          const cardTitle: string = it.customTitle || it.name;
          const cardDesc: string | null = it.customDescription;
          const cardImage: string | null = it.customImage;
          const cardBadge: string | null = it.badgeLabel;
          let cardLink: string | null = it.customLink;
          if (!cardLink && it.itemId && TYPE_DEFAULT_LINK[it.itemType]) {
            cardLink = TYPE_DEFAULT_LINK[it.itemType](it.itemId);
          }

          const card = (
            <Card
              className={`group overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer h-full ${variant === "row" ? "min-w-[280px] snap-start" : ""}`}
              data-testid={`spotlight-card-${it.id}`}
            >
              {cardImage && (
                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <img src={cardImage} alt={cardTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {cardBadge && (
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 shadow">{cardBadge}</Badge>
                  )}
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 mb-1" data-testid={`spotlight-card-title-${it.id}`}>{cardTitle}</h3>
                {cardDesc && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{cardDesc}</p>
                )}
                <Button size="sm" variant="outline" className="w-full gap-1 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-colors" data-testid={`spotlight-card-cta-${it.id}`}>
                  View
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          );

          if (cardLink) {
            const isExternal = /^https?:\/\//.test(cardLink);
            if (isExternal) {
              return <a key={it.id} href={cardLink} target="_blank" rel="noopener noreferrer">{card}</a>;
            }
            return <Link key={it.id} href={cardLink}>{card}</Link>;
          }
          return <div key={it.id}>{card}</div>;
        })}
      </div>
    </section>
  );
}
