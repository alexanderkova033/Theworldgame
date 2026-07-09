import type { IslandExpeditionData } from "./types";

// Keyed by the island ids already defined in provinceData.ts's
// otherLandmasses. Each island gives a different, fixed reward, so chartering
// a venture to all three is worth doing once rather than a repeatable grind.
export const ISLAND_EXPEDITIONS: IslandExpeditionData[] = [
  {
    islandId: "island-1",
    islandName: "Kestrel Isles",
    reward: {
      flavor: "The chartered company struck a fast bargain with the locals — a windfall for the treasury.",
      treasuryDelta: 2500,
    },
  },
  {
    islandId: "island-2",
    islandName: "Solmere",
    reward: {
      flavor: "The venture's surveyors found a rich ore seam and shipped a load of it home.",
      resourceType: "ore",
      resourceDelta: 40,
    },
  },
  {
    islandId: "island-3",
    islandName: "Vashtel Cay",
    reward: {
      flavor: "News of the venture's safe return lifts spirits back home.",
      stabilityDelta: 10,
    },
  },
];

export function getIslandExpeditionData(islandId: string): IslandExpeditionData | undefined {
  return ISLAND_EXPEDITIONS.find((entry) => entry.islandId === islandId);
}
