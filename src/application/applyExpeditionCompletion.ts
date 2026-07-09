// Use case: apply the permanent effect of a finished expedition — mirrors
// applyProjectCompletion.ts, but the "completion" is a one-time reward and a
// scouted-island flag instead of a placed building.
import type { GameState } from "../domain/country/types";
import { getIslandExpeditionData } from "../domain/expeditions/expeditionData";
import type { Expedition } from "../domain/expeditions/types";

export function applyExpeditionCompletion(state: GameState, expedition: Expedition): GameState {
  const data = getIslandExpeditionData(expedition.islandId);
  const scoutedIslandIds = [...state.scoutedIslandIds, expedition.islandId];
  if (!data) return { ...state, scoutedIslandIds };

  const { reward } = data;
  return {
    ...state,
    scoutedIslandIds,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury + (reward.treasuryDelta ?? 0),
      stability: Math.min(100, Math.max(0, state.stats.stability + (reward.stabilityDelta ?? 0))),
    },
    resources:
      reward.resourceType && reward.resourceDelta
        ? { ...state.resources, [reward.resourceType]: state.resources[reward.resourceType] + reward.resourceDelta }
        : state.resources,
  };
}
