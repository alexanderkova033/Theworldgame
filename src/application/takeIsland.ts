// Use case: an island a neighbour holds becomes yours, bought back by treaty
// (actions/treatyActions.ts) or taken in war (day/army.ts). It becomes one
// of your provinces with the homes and farm its people already have, and
// its people become yours; the neighbour loses them, and a home.
import { SETTLE_FARMS, SETTLE_HOMES, UNREST_EASE_MARGIN, UNREST_RIOTS_BELOW, UPRISING_GRIEVANCE_DAYS } from "../domain/constants";
import { addDays } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { GameState } from "../domain/country/types";
import { getIslandPeople } from "../domain/neighbours/treatyRules";
import { newProvinceState } from "../domain/provinces/provincePopulation";
import type { PlacedBuilding } from "../domain/provinces/types";

// Taken by force, its people resent it: on strike, and aggrieved for half
// a year, as a province put down after an uprising.
export function conquer(state: GameState, islandId: string): GameState {
  const p = state.provinces[islandId];
  if (!p) return state;
  return {
    ...state,
    provinces: {
      ...state.provinces,
      [islandId]: { ...p, stability: UNREST_RIOTS_BELOW + UNREST_EASE_MARGIN, unrestStage: "strikes", aggrievedUntil: addDays(state.date, UPRISING_GRIEVANCE_DAYS) },
    },
  };
}

export function takeIsland(state: GameState, islandId: string): GameState {
  const nationId = state.foreignIslands[islandId];
  const n = nationId ? state.neighbours[nationId] : undefined;
  if (!nationId) return state;
  const people = getIslandPeople(islandId);
  const built = (type: PlacedBuilding["type"], count: number): PlacedBuilding[] =>
    Array.from({ length: count }, () => ({ id: generateId("building"), provinceId: islandId, type }));
  const foreignIslands = { ...state.foreignIslands };
  delete foreignIslands[islandId];
  const foreignIslandsSince = { ...state.foreignIslandsSince };
  delete foreignIslandsSince[islandId];
  const sieges = { ...state.sieges };
  delete sieges[islandId];
  return {
    ...state,
    stats: { ...state.stats, population: state.stats.population + people },
    foreignIslands,
    foreignIslandsSince,
    sieges,
    settledIslandIds: [...state.settledIslandIds, islandId],
    scoutedIslandIds: state.scoutedIslandIds.includes(islandId) ? state.scoutedIslandIds : [...state.scoutedIslandIds, islandId],
    placedBuildings: [...state.placedBuildings, ...built("housing", SETTLE_HOMES), ...built("farm", SETTLE_FARMS)],
    farmCount: state.farmCount + SETTLE_FARMS,
    provinces: { ...state.provinces, [islandId]: newProvinceState(people, state.stats.stability) },
    neighbours: n
      ? { ...state.neighbours, [nationId]: { ...n, population: Math.max(0, n.population - people), homes: Math.max(1, n.homes - 1) } }
      : state.neighbours,
  };
}
