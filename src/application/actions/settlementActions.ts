// Founding a settlement on a scouted, empty island (see domain/islands): it
// costs Crowns and wood now, and the ship lands a couple of months later.
import { SETTLE_COST, SETTLE_DAYS, SETTLE_WOOD } from "../../domain/constants";
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { whyNotSettle } from "../../domain/islands/islandRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { recordAction } from "./recordAction";

export function canFoundSettlement(state: GameState, islandId: string): boolean {
  return (
    isFeatureOpen(state, "ventures") &&
    whyNotSettle(state, islandId) === null &&
    state.stats.treasury >= SETTLE_COST &&
    state.resources.wood >= SETTLE_WOOD
  );
}

export function foundSettlement(state: GameState, islandId: string): GameState {
  if (!canFoundSettlement(state, islandId)) return state;
  return recordAction(state, {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - SETTLE_COST },
    resources: { ...state.resources, wood: state.resources.wood - SETTLE_WOOD },
    settlements: [...state.settlements, { id: generateId("settlement"), islandId, daysRemaining: SETTLE_DAYS, totalDays: SETTLE_DAYS }],
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `Settlers sail for ${getProvinceName(islandId)}. They land in about ${SETTLE_DAYS} days.`,
        severity: "info",
        topic: "venture",
      },
      ...state.events,
    ],
  }, { treasury: "construction" });
}
