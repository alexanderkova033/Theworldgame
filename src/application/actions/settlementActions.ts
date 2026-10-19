// Founding a settlement on a scouted, empty island (see domain/islands): it
// costs Crowns and wood now, and the ship lands a couple of months later.
import { MORE_SETTLERS_COST, MORE_SETTLERS_DAYS, SETTLE_COST, SETTLE_DAYS, SETTLE_WOOD } from "../../domain/constants";
import { getOwnedProvinceIds } from "../../domain/provinces/provinceRules";
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

// Another shipload of settlers to a colony already held: a way to grow
// one before (or without) a harbour link.
export function canSendMoreSettlers(state: GameState, islandId: string): boolean {
  return (
    isFeatureOpen(state, "ventures") &&
    state.settledIslandIds.includes(islandId) &&
    getOwnedProvinceIds(state).includes(islandId) &&
    !state.settlements.some((s) => s.islandId === islandId) &&
    state.stats.treasury >= MORE_SETTLERS_COST
  );
}

export function sendMoreSettlers(state: GameState, islandId: string): GameState {
  if (!canSendMoreSettlers(state, islandId)) return state;
  return recordAction(state, {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - MORE_SETTLERS_COST },
    settlements: [...state.settlements, { id: generateId("settlement"), islandId, daysRemaining: MORE_SETTLERS_DAYS, totalDays: MORE_SETTLERS_DAYS }],
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `More settlers sail for ${getProvinceName(islandId)}. They land in about ${MORE_SETTLERS_DAYS} days.`,
        severity: "info",
        topic: "venture",
      },
      ...state.events,
    ],
  }, { treasury: "construction" });
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
