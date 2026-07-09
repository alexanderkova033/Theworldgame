import type { IslandExpeditionData } from "./types";

// Keyed by the island ids already defined in provinceData.ts's
// otherLandmasses. Each island gives a different, fixed reward, so scouting
// all three is worth doing once rather than a repeatable grind.
export const ISLAND_EXPEDITIONS: IslandExpeditionData[] = [
  {
    islandId: "island-1",
    islandName: "Kestrel Isles",
    reward: {
      flavor: "Merchants there proved eager to trade — a windfall for the treasury.",
      treasuryDelta: 2500,
    },
  },
  {
    islandId: "island-2",
    islandName: "Solmere",
    reward: {
      flavor: "A rich ore seam, easily worked — shipped straight home.",
      resourceType: "ore",
      resourceDelta: 40,
    },
  },
  {
    islandId: "island-3",
    islandName: "Vashtel Cay",
    reward: {
      flavor: "Word of a hopeful new frontier lifts spirits back home.",
      stabilityDelta: 10,
    },
  },
];

export function getIslandExpeditionData(islandId: string): IslandExpeditionData | undefined {
  return ISLAND_EXPEDITIONS.find((entry) => entry.islandId === islandId);
}
