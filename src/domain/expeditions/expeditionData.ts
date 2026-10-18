import type { IslandExpeditionData } from "./types";

// Keyed by the island ids already defined in provinceData.ts's
// islands. Each island gives a different, fixed reward, so chartering
// a venture to all three is worth doing once rather than a repeatable grind.
export const ISLAND_EXPEDITIONS: IslandExpeditionData[] = [
  {
    islandId: "island-1",
    islandName: "Kestrel Isles",
    reward: {
      flavor: "The chartered company struck a fast bargain with the locals: a windfall for the treasury.",
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
  {
    islandId: "island-4",
    islandName: "Grey Holm",
    reward: {
      flavor: "The venture came back with sheep from the island's wild flocks, and a hold full of grain bought on the way.",
      resourceType: "grain",
      resourceDelta: 40,
    },
  },
  {
    islandId: "island-5",
    islandName: "Marrowind",
    reward: {
      flavor: "The foresters of Marrowind traded seasoned timber for tools.",
      resourceType: "wood",
      resourceDelta: 40,
    },
  },
  {
    islandId: "island-6",
    islandName: "Saltreach",
    reward: {
      flavor: "The salt-panners of Saltreach paid well for news of the mainland.",
      treasuryDelta: 1500,
    },
  },
];

export function getIslandExpeditionData(islandId: string): IslandExpeditionData | undefined {
  return ISLAND_EXPEDITIONS.find((entry) => entry.islandId === islandId);
}
