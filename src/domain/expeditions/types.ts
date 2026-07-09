import type { ResourceType } from "../resources/types";

// A scouting expedition: a timed trip to one of the unclaimed islands. Not a
// building — it has no province, and its "completion" is a one-time reward
// plus marking the island scouted, not a placed building — so it gets its own
// small parallel type rather than overloading Project/ProjectType.
export interface Expedition {
  id: string;
  islandId: string;
  daysRemaining: number;
  totalDays: number;
}

export interface ExpeditionReward {
  flavor: string; // one-line description of what the expedition found
  treasuryDelta?: number;
  resourceType?: ResourceType;
  resourceDelta?: number;
  stabilityDelta?: number;
}

export interface IslandExpeditionData {
  islandId: string;
  islandName: string;
  reward: ExpeditionReward;
}
