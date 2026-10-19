// Treaties with the neighbours (see domain/neighbours/treatyRules.ts), signed
// from their cards on the Neighbours page. An island accord buys two years
// in which the neighbour sends no settlers anywhere. Buying back an island a
// neighbour holds makes it one of your provinces, its people with it; the
// neighbour sells, but parts with it unwillingly, and cools towards you.
import { ACCORD_COST, RELATIONS_ACCORD, RELATIONS_ISLAND_SOLD } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { feel } from "../../domain/neighbours/relationsRules";
import { getBuyBackPrice, getIslandPeople, signAccord, whyNoAccord, whyNoBuyBack } from "../../domain/neighbours/treatyRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { takeIsland } from "../takeIsland";
import { recordAction } from "./recordAction";

export function canSignAccord(state: GameState, nationId: string): boolean {
  const n = state.neighbours[nationId];
  return !!n && whyNoAccord(n, state.date, state.stats.treasury) === null;
}

export function signIslandAccord(state: GameState, nationId: string): GameState {
  if (!canSignAccord(state, nationId)) return state;
  const n = state.neighbours[nationId];
  const name = getNation(nationId).name;
  return recordAction(
    state,
    {
      ...state,
      stats: { ...state.stats, treasury: state.stats.treasury - ACCORD_COST },
      neighbours: { ...state.neighbours, [nationId]: feel(signAccord(n, state.date), RELATIONS_ACCORD, "You signed an island accord") },
      events: [
        { id: generateId("event"), date: state.date, message: `${name} signs an island accord: for two years it sends no settlers to the islands.`, severity: "info", topic: "politics" },
        ...state.events,
      ],
    },
    { treasury: "oneOffs" },
  );
}

export function canBuyBackIsland(state: GameState, islandId: string): boolean {
  const nationId = state.foreignIslands[islandId];
  const n = nationId ? state.neighbours[nationId] : undefined;
  return !!n && whyNoBuyBack(n, islandId, state.stats.treasury) === null;
}

export function buyBackIsland(state: GameState, islandId: string): GameState {
  if (!canBuyBackIsland(state, islandId)) return state;
  const nationId = state.foreignIslands[islandId];
  const price = getBuyBackPrice(islandId);
  const people = getIslandPeople(islandId);
  const island = getProvinceName(islandId);
  // The island, with the homes and farm its people already have.
  const taken = takeIsland(state, islandId);
  const n = taken.neighbours[nationId];
  return recordAction(
    state,
    {
      ...taken,
      stats: { ...taken.stats, treasury: taken.stats.treasury - price },
      neighbours: { ...taken.neighbours, [nationId]: feel({ ...n, treasury: n.treasury + price }, RELATIONS_ISLAND_SOLD, `They sold you ${island}`) },
      events: [
        { id: generateId("event"), date: state.date, message: `${getNation(nationId).name} sells you ${island} for ${price} Cr. Its ${people} people are yours.`, severity: "info", topic: "venture" },
        ...state.events,
      ],
    },
    { treasury: "colonies" },
  );
}
