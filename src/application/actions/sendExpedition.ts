import { EXPEDITION_COST, EXPEDITION_DAYS } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { canSendExpedition as canSendTo } from "../../domain/expeditions/expeditionRules";
import type { Expedition } from "../../domain/expeditions/types";
import { recordAction } from "./recordAction";
import { isFeatureOpen } from "../../domain/chapters/chapterData";

// Ventures must be open (see domain/chapters) as well as the island free.
export function canSendExpedition(state: GameState, islandId: string): boolean {
  return isFeatureOpen(state, "ventures") && canSendTo(state, islandId);
}

export function sendExpedition(state: GameState, islandId: string): GameState {
  if (!canSendExpedition(state, islandId)) return state;

  const expedition: Expedition = {
    id: generateId("expedition"),
    islandId,
    daysRemaining: EXPEDITION_DAYS,
    totalDays: EXPEDITION_DAYS,
  };

  return recordAction(state, {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - EXPEDITION_COST },
    expeditions: [...state.expeditions, expedition],
  }, { treasury: "oneOffs" });
}
