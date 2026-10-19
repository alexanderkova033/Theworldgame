// Founding a settlement on a scouted, empty island (see domain/islands): it
// costs Crowns and wood now, and the ship lands a couple of months later.
import { MORE_SETTLERS_COST, MORE_SETTLERS_DAYS, SETTLE_COST, SETTLE_DAYS, SETTLE_WOOD } from "../../domain/constants";
import { getOwnedProvinceIds } from "../../domain/provinces/provinceRules";
import { LOCALS_DRIVE_SUPPORT, LOCALS_LAND_PRICE, RELATIONS_LOCALS_DRIVEN } from "../../domain/constants";
import { feel } from "../../domain/neighbours/relationsRules";
import { getIslandData } from "../../domain/islands/islandData";
import type { LocalsTerms } from "../../domain/islands/types";
import { applyUniformDelta, getFactionWeights } from "../../domain/parties/factionRules";
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { whyNotSettle } from "../../domain/islands/islandRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { recordAction } from "./recordAction";

// What settling costs: more where you buy land from the people there.
export function getSettleCost(terms?: LocalsTerms): number {
  return SETTLE_COST + (terms === "buy" ? LOCALS_LAND_PRICE : 0);
}

// An island with people of its own needs terms; an empty one takes none.
export function canFoundSettlement(state: GameState, islandId: string, terms?: LocalsTerms): boolean {
  const peopled = getIslandData(islandId)?.locals != null;
  return (
    isFeatureOpen(state, "ventures") &&
    whyNotSettle(state, islandId) === null &&
    peopled === (terms !== undefined) &&
    state.stats.treasury >= getSettleCost(terms) &&
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

export function foundSettlement(state: GameState, islandId: string, terms?: LocalsTerms): GameState {
  if (!canFoundSettlement(state, islandId, terms)) return state;
  const locals = getIslandData(islandId)?.locals;
  // Driving people from their homes is known at once, and held against you.
  const driven = terms === "drive" ? applyUniformDelta(state.factionApproval, getFactionWeights(state.nationId), LOCALS_DRIVE_SUPPORT) : null;
  const name = getProvinceName(islandId);
  const message =
    terms === "buy"
      ? `You buy land on ${name} from ${locals!.name}, and settlers sail. They land in about ${SETTLE_DAYS} days.`
      : terms === "share"
        ? `Settlers sail for ${name}, to live alongside ${locals!.name}. They land in about ${SETTLE_DAYS} days.`
        : terms === "drive"
          ? `Settlers sail for ${name}, and ${locals!.name} are to be driven off: support ${LOCALS_DRIVE_SUPPORT}.`
          : `Settlers sail for ${name}. They land in about ${SETTLE_DAYS} days.`;
  const neighbours = driven
    ? Object.fromEntries(Object.entries(state.neighbours).map(([id, n]) => [id, feel(n, RELATIONS_LOCALS_DRIVEN, `You drove ${locals!.name} from their homes`)]))
    : state.neighbours;
  return recordAction(state, {
    ...state,
    neighbours,
    ...(driven ? { factionApproval: driven.factionApproval } : {}),
    stats: { ...state.stats, treasury: state.stats.treasury - getSettleCost(terms), ...(driven ? { popularity: driven.popularity } : {}) },
    resources: { ...state.resources, wood: state.resources.wood - SETTLE_WOOD },
    settlements: [...state.settlements, { id: generateId("settlement"), islandId, daysRemaining: SETTLE_DAYS, totalDays: SETTLE_DAYS, terms }],
    events: [{ id: generateId("event"), date: state.date, message, severity: terms === "drive" ? "warning" : "info", topic: "venture" }, ...state.events],
  }, { treasury: "construction", support: "oneOffs" });
}
