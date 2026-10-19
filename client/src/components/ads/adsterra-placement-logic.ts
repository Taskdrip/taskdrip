import type {
  AdsterraPageTarget,
  AdsterraPlacement,
  AdsterraPosition,
  AdsterraSettingsValue,
} from "@shared/schema";

function pageAllows(placement: AdsterraPlacement, pageTarget: AdsterraPageTarget) {
  return placement.pages.includes("all") || placement.pages.includes(pageTarget);
}

export function getAdsterraPlacements(
  settings: AdsterraSettingsValue | undefined,
  position: AdsterraPosition,
  pageTarget: AdsterraPageTarget,
) {
  if (!settings?.enabled) return [];

  const eligiblePlacements = settings.placements.filter(
    (placement) => placement.enabled && placement.position === position && pageAllows(placement, pageTarget),
  );

  return eligiblePlacements.filter((placement) =>
    placement.format !== "popunder" || !settings.placements.some((other) =>
      other.enabled && other.id !== placement.id && other.key === placement.key && other.format !== placement.format,
    ),
  );
}
