export type CreatorTier = "rising_sparks" | "growth_engines" | "power_influencers" | "global_titans";

export const TIER_CONFIG = {
  rising_sparks: {
    name: "Rising Sparks",
    icon: "🔥",
    range: "10K – 100K",
    rangeShort: "10K–100K",
    min: 10_000,
    max: 100_000,
    gradient: "from-orange-400 to-amber-500",
    gradientDark: "from-orange-600 to-amber-700",
    bg: "bg-orange-50",
    bgDark: "bg-orange-950",
    border: "border-orange-200",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    description: "Emerging creators building their audience",
  },
  growth_engines: {
    name: "Growth Engines",
    icon: "⚡",
    range: "100K – 1M",
    rangeShort: "100K–1M",
    min: 100_000,
    max: 1_000_000,
    gradient: "from-blue-500 to-cyan-500",
    gradientDark: "from-blue-700 to-cyan-700",
    bg: "bg-blue-50",
    bgDark: "bg-blue-950",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    description: "Fast-growing influencers with strong engagement",
  },
  power_influencers: {
    name: "Power Influencers",
    icon: "💎",
    range: "1M – 10M",
    rangeShort: "1M–10M",
    min: 1_000_000,
    max: 10_000_000,
    gradient: "from-purple-500 to-violet-600",
    gradientDark: "from-purple-700 to-violet-800",
    bg: "bg-purple-50",
    bgDark: "bg-purple-950",
    border: "border-purple-200",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    description: "Premium influencers with massive reach",
  },
  global_titans: {
    name: "Global Titans",
    icon: "👑",
    range: "10M+",
    rangeShort: "10M+",
    min: 10_000_000,
    max: Infinity,
    gradient: "from-yellow-500 to-orange-500",
    gradientDark: "from-yellow-600 to-orange-600",
    bg: "bg-yellow-50",
    bgDark: "bg-yellow-950",
    border: "border-yellow-200",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
    description: "World-class creators with global impact",
  },
};

export const TIER_ORDER: CreatorTier[] = [
  "global_titans",
  "power_influencers",
  "growth_engines",
  "rising_sparks",
];

export function getTierFromFollowers(totalFollowers: number): CreatorTier {
  if (totalFollowers >= 10_000_000) return "global_titans";
  if (totalFollowers >= 1_000_000) return "power_influencers";
  if (totalFollowers >= 100_000) return "growth_engines";
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
