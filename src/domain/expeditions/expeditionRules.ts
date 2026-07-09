// Generic progress rules for expeditions, mirroring domain/construction's
// constructionRules.ts exactly — advance one day, check completion.
import { EXPEDITION_COST } from "../constants";
import type { GameState } from "../country/types";
import { canAfford } from "../economy/economyRules";
import { getIslandExpeditionData } from "./expeditionData";
import type { Expedition } from "./types";

export function advanceExpedition(expedition: Expedition): Expedition {
  return { ...expedition, daysRemaining: Math.max(0, expedition.daysRemaining - 1) };
}

export function isExpeditionComplete(expedition: Expedition): boolean {
  return expedition.daysRemaining <= 0;
}

export function expeditionProgress(expedition: Expedition): number {
  if (expedition.totalDays <= 0) return 1;
  return 1 - expedition.daysRemaining / expedition.totalDays;
}

export function canSendExpedition(state: GameState, islandId: string): boolean {
  if (!getIslandExpeditionData(islandId)) return false;
  if (state.scoutedIslandIds.includes(islandId)) return false;
  if (state.expeditions.some((expedition) => expedition.islandId === islandId)) return false;
  return canAfford(state.stats, EXPEDITION_COST);
}
