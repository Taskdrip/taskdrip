import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Link } from "wouter";

interface AnnouncementConfig {
  enabled: boolean;
  message: string;
  color: string;
  link: string;
  emoji: string;
}

const COLOR_CLASSES: Record<string, string> = {
  purple: "bg-purple-600 text-white",
  blue: "bg-blue-600 text-white",
  green: "bg-emerald-600 text-white",
  orange: "bg-orange-500 text-white",
  red: "bg-red-600 text-white",
  dark: "bg-gray-900 text-white border-b border-gray-800",
};

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: config } = useQuery<AnnouncementConfig>({
    queryKey: ["/api/announcement"],
    staleTime: 60 * 1000,
  });

  if (dismissed || !config?.enabled || !config?.message) return null;

  const colorClass = COLOR_CLASSES[config.color] || COLOR_CLASSES.purple;
  const isExternal = config.link?.startsWith("http");

  return (
    <div className={`relative w-full py-2 px-4 text-center text-sm font-medium ${colorClass}`} role="banner" data-testid="announcement-banner">
      <div className="flex items-center justify-center gap-2 max-w-5xl mx-auto">
        {config.emoji && <span className="text-base">{config.emoji}</span>}
        <span>{config.message}</span>
        {config.link && (
          isExternal ? (
            <a href={config.link} target="_blank" rel="noreferrer" className="underline opacity-80 hover:opacity-100 text-xs ml-1" data-testid="announcement-link">
              Learn more →
            </a>
          ) : (
            <Link href={config.link} className="underline opacity-80 hover:opacity-100 text-xs ml-1" data-testid="announcement-link">
              Learn more →
            </Link>
          )
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss announcement"
        data-testid="button-announcement-dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
