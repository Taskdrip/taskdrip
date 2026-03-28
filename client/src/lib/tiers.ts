export type CreatorTier = "rising_sparks" | "growth_engines" | "power_influencers" | "global_titans";

export const TIER_CONFIG = {
  rising_sparks: {
    name: "Rising Sparks",
    icon: "🔥",
    range: "1K – 10K",
    min: 1000,
    max: 10000,
    gradient: "from-orange-400 to-amber-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
  },
  growth_engines: {
    name: "Growth Engines",
    icon: "⚡",
    range: "10K – 100K",
    min: 10000,
    max: 100000,
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  power_influencers: {
    name: "Power Influencers",
    icon: "💎",
    range: "100K – 1M",
    min: 100000,
    max: 1000000,
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
  },
  global_titans: {
    name: "Global Titans",
    icon: "👑",
    range: "1M+",
    min: 1000000,
    max: Infinity,
    gradient: "from-yellow-500 to-orange-500",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
  },
};

export function getTierFromFollowers(totalFollowers: number): CreatorTier {
  if (totalFollowers >= 1_000_000) return "global_titans";
  if (totalFollowers >= 100_000) return "power_influencers";
  if (totalFollowers >= 10_000) return "growth_engines";
  return "rising_sparks";
}

export function getTierConfig(tier: string) {
  return TIER_CONFIG[tier as CreatorTier] || TIER_CONFIG.rising_sparks;
}

export function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export const NICHES = [
  "Gaming", "Fitness", "Fashion", "Tech", "Beauty", "Food",
  "Travel", "Finance", "Music", "Education", "Sports", "Lifestyle",
  "Comedy", "Art", "Business", "Health", "Crypto", "Movies"
];
