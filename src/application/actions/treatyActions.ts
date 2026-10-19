// Treaties with the neighbours (see domain/neighbours/treatyRules.ts), signed
// from their cards on the Neighbours page. An island accord buys two years
// in which the neighbour sends no settlers anywhere. Buying back an island a
// neighbour holds makes it one of your provinces, its people with it; the
// neighbour sells, but parts with it unwillingly, and cools towards you.
import { ACCORD_COST, RELATIONS_ACCORD, RELATIONS_ISLAND_SOLD, SETTLE_FARMS, SETTLE_HOMES } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { feel } from "../../domain/neighbours/relationsRules";
import { getBuyBackPrice, getIslandPeople, signAccord, whyNoAccord, whyNoBuyBack } from "../../domain/neighbours/treatyRules";
import { newProvinceState } from "../../domain/provinces/provincePopulation";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import type { PlacedBuilding } from "../../domain/provinces/types";
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
  const n = state.neighbours[nationId];
  const price = getBuyBackPrice(islandId);
  const people = getIslandPeople(islandId);
  const island = getProvinceName(islandId);
  const built = (type: PlacedBuilding["type"], count: number): PlacedBuilding[] =>
    Array.from({ length: count }, () => ({ id: generateId("building"), provinceId: islandId, type }));
  const foreignIslands = { ...state.foreignIslands };
  delete foreignIslands[islandId];
  return recordAction(
    state,
    {
      ...state,
      // The island, with the homes and farm its people already have.
      stats: { ...state.stats, treasury: state.stats.treasury - price, population: state.stats.population + people },
      foreignIslands,
      settledIslandIds: [...state.settledIslandIds, islandId],
      scoutedIslandIds: state.scoutedIslandIds.includes(islandId) ? state.scoutedIslandIds : [...state.scoutedIslandIds, islandId],
      placedBuildings: [...state.placedBuildings, ...built("housing", SETTLE_HOMES), ...built("farm", SETTLE_FARMS)],
      farmCount: state.farmCount + SETTLE_FARMS,
      provinces: { ...state.provinces, [islandId]: newProvinceState(people, state.stats.stability) },
      neighbours: {
        ...state.neighbours,
        [nationId]: feel(
          {
            ...n,
            treasury: n.treasury + price,
            population: Math.max(0, n.population - people),
            homes: Math.max(1, n.homes - 1),
          },
          RELATIONS_ISLAND_SOLD,
          `They sold you ${island}`,
        ),
      },
      events: [
        { id: generateId("event"), date: state.date, message: `${getNation(nationId).name} sells you ${island} for ${price} Cr. Its ${people} people are yours.`, severity: "info", topic: "venture" },
        ...state.events,
      ],
    },
    { treasury: "colonies" },
  );
}
