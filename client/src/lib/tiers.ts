export type CreatorTier = "newcomer" | "aspiring" | "rising_sparks" | "growth_engines" | "power_influencers" | "global_titans";

export const TIER_CONFIG = {
  newcomer: {
    name: "Explorer",
    icon: "🌱",
    range: "0 followers",
    rangeShort: "0",
    min: 0,
    max: 0,
    gradient: "from-gray-400 to-slate-500",
    gradientDark: "from-gray-600 to-slate-700",
    bg: "bg-gray-50",
    bgDark: "bg-gray-950",
    border: "border-gray-200",
    text: "text-gray-600",
    badge: "bg-gray-100 text-gray-600",
    description: "Just getting started — visit BreedSkool to grow your audience",
    breedskoolRecommend: true,
  },
  aspiring: {
    name: "Aspiring Creator",
    icon: "✨",
    range: "1 – 10K",
    rangeShort: "1–10K",
    min: 1,
    max: 10_000,
    gradient: "from-pink-400 to-rose-500",
    gradientDark: "from-pink-600 to-rose-700",
    bg: "bg-pink-50",
    bgDark: "bg-pink-950",
    border: "border-pink-200",
    text: "text-pink-700",
    badge: "bg-pink-100 text-pink-700",
    description: "Building your audience — keep growing!",
    breedskoolRecommend: true,
  },
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
    breedskoolRecommend: false,
  },
  growth_engines: {
    name: "Growth Engine",
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
    breedskoolRecommend: false,
  },
  power_influencers: {
    name: "Power Influencer",
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
    breedskoolRecommend: false,
  },
  global_titans: {
    name: "Global Titan",
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
    breedskoolRecommend: false,
  },
};

export const TIER_ORDER: CreatorTier[] = [
  "global_titans",
  "power_influencers",
  "growth_engines",
  "rising_sparks",
  "aspiring",
  "newcomer",
];

export function getTierFromFollowers(totalFollowers: number): CreatorTier {
  if (totalFollowers >= 10_000_000) return "global_titans";
  if (totalFollowers >= 1_000_000) return "power_influencers";
  if (totalFollowers >= 100_000) return "growth_engines";
  if (totalFollowers >= 10_000) return "rising_sparks";
  if (totalFollowers >= 1) return "aspiring";
  return "newcomer";
}

export function getTierConfig(tier: string) {
  return TIER_CONFIG[tier as CreatorTier] || TIER_CONFIG.newcomer;
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
