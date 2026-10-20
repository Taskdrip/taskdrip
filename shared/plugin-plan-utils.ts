export const PLUGIN_LICENSE_PLAN_OPTIONS = [
  {
    cadence: "monthly",
    id: "plugin-monthly",
    title: "Monthly license",
    description: "30 days of premium plugin access and updates.",
  },
  {
    cadence: "yearly",
    id: "plugin-yearly",
    title: "Yearly license",
    description: "12 months of premium plugin access and updates.",
  },
  {
    cadence: "lifetime",
    id: "plugin-lifetime",
    title: "Lifetime license",
    description: "Lifetime premium plugin access and updates.",
  },
] as const;

export type PluginLicenseCadence = typeof PLUGIN_LICENSE_PLAN_OPTIONS[number]["cadence"];
export type PluginLicensePlanPrices = Partial<Record<PluginLicenseCadence, number>>;
export type PluginLicensePlan = {
  id: string;
  title: string;
  description: string;
  price: number;
};

const VALID_CADENCES = new Set<string>(PLUGIN_LICENSE_PLAN_OPTIONS.map(({ cadence }) => cadence));

export function parsePluginLicenseCadences(value: unknown): PluginLicenseCadence[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.some((cadence) => typeof cadence !== "string" || !VALID_CADENCES.has(cadence))) {
    return null;
  }
  const selected = new Set(value as string[]);
  if (selected.size !== value.length) return null;
  return PLUGIN_LICENSE_PLAN_OPTIONS
    .filter(({ cadence }) => selected.has(cadence))
    .map(({ cadence }) => cadence);
}

export function pluginLicenseCadenceForPlanId(value: unknown): PluginLicenseCadence | null {
  if (typeof value !== "string") return null;
  return PLUGIN_LICENSE_PLAN_OPTIONS.find((plan) => plan.id === value)?.cadence || null;
}

export function pluginLicensePlanId(cadence: PluginLicenseCadence): string {
  return PLUGIN_LICENSE_PLAN_OPTIONS.find((plan) => plan.cadence === cadence)!.id;
}

export function buildPluginLicensePlans(
  enabledCadences: readonly PluginLicenseCadence[],
  prices: PluginLicensePlanPrices,
): PluginLicensePlan[] {
  const enabled = new Set(enabledCadences);
  return PLUGIN_LICENSE_PLAN_OPTIONS
    .filter(({ cadence }) => enabled.has(cadence))
    .map(({ cadence, id, title, description }) => ({
      id,
      title,
      description,
      price: Number(prices[cadence]),
    }));
}

export function getPluginLicenseCadences(plans: unknown): PluginLicenseCadence[] {
  if (!Array.isArray(plans)) return [];
  const planIds = new Set(plans.map((plan) => (plan && typeof plan === "object" ? (plan as { id?: unknown }).id : null)));
  return PLUGIN_LICENSE_PLAN_OPTIONS
    .filter(({ id }) => planIds.has(id))
    .map(({ cadence }) => cadence);
}
