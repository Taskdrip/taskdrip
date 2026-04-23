export type BrandTier = 'startup' | 'growing' | 'established' | 'enterprise' | 'global_brand';

export interface BrandTierConfig {
  id: BrandTier;
  name: string;
  icon: string;
  range: string;
  description: string;
  gradient: string;
  badge: string;
  glowColor: string;
  accentColor: string;
  minCampaigns: number;
  maxCampaigns: number | null;
}

export const BRAND_TIER_CONFIG: Record<BrandTier, BrandTierConfig> = {
  startup: {
    id: 'startup',
    name: 'Startup',
    icon: '🚀',
    range: '1–5 campaigns',
    description: 'Emerging brands making their first moves in influencer marketing',
    gradient: 'from-slate-500 to-slate-700',
    badge: 'bg-slate-100 text-slate-700',
    glowColor: 'rgba(100,116,139,0.4)',
    accentColor: '#64748b',
    minCampaigns: 0,
    maxCampaigns: 5,
  },
  growing: {
    id: 'growing',
    name: 'Growing',
    icon: '🌿',
    range: '6–20 campaigns',
    description: 'Brands scaling their creator partnerships and building momentum',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-100 text-emerald-700',
    glowColor: 'rgba(16,185,129,0.4)',
    accentColor: '#10b981',
    minCampaigns: 6,
    maxCampaigns: 20,
  },
  established: {
    id: 'established',
    name: 'Established',
    icon: '⭐',
    range: '21–50 campaigns',
    description: 'Trusted brands with a proven track record of influencer collaborations',
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'bg-blue-100 text-blue-700',
    glowColor: 'rgba(59,130,246,0.4)',
    accentColor: '#3b82f6',
    minCampaigns: 21,
    maxCampaigns: 50,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    icon: '💼',
    range: '51–200 campaigns',
    description: 'Large-scale brands running premium, high-budget influencer programs',
    gradient: 'from-violet-500 to-purple-700',
    badge: 'bg-violet-100 text-violet-700',
    glowColor: 'rgba(139,92,246,0.4)',
    accentColor: '#8b5cf6',
    minCampaigns: 51,
    maxCampaigns: 200,
  },
  global_brand: {
    id: 'global_brand',
    name: 'Global Brand',
    icon: '👑',
    range: '200+ campaigns',
    description: 'World-class brands dominating markets with massive creator ecosystems',
    gradient: 'from-amber-400 via-orange-500 to-rose-600',
    badge: 'bg-amber-100 text-amber-700',
    glowColor: 'rgba(245,158,11,0.5)',
    accentColor: '#f59e0b',
    minCampaigns: 201,
    maxCampaigns: null,
  },
};

export const BRAND_TIER_ORDER: BrandTier[] = [
  'global_brand',
  'enterprise',
  'established',
  'growing',
  'startup',
];

export function getBrandTierFromCampaigns(completedCampaigns: number): BrandTier {
  if (completedCampaigns >= 201) return 'global_brand';
  if (completedCampaigns >= 51) return 'enterprise';
  if (completedCampaigns >= 21) return 'established';
  if (completedCampaigns >= 6) return 'growing';
  return 'startup';
}

export function getBrandTierConfig(tier: string): BrandTierConfig {
  return BRAND_TIER_CONFIG[tier as BrandTier] || BRAND_TIER_CONFIG.startup;
}

export const BRAND_INDUSTRIES = [
  'All Industries',
  'Fashion & Apparel',
  'Beauty & Cosmetics',
  'Food & Beverage',
  'Health & Wellness',
  'Technology',
  'Gaming',
  'Travel & Tourism',
  'Finance & Crypto',
  'Education',
  'Automotive',
  'Home & Lifestyle',
  'Sports & Fitness',
  'Entertainment',
  'E-commerce',
  'NFT & Web3',
  'Other',
];

export function formatBudget(val: string | number | null | undefined): string {
  const n = parseFloat(String(val || '0'));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
