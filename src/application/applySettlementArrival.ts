// Use case: a settler ship lands. The first one to an island makes it one
// of the country's provinces, with the settlers' first homes and a farm, so
// they have work from the first day. A later one to an island already held
// only brings more people. Either way the settlers are taken from the
// mainland (where most are sleeping rough, or it is most crowded): the
// national population doesn't change, they have only moved.
import { SETTLE_FARMS, SETTLE_HOMES, SETTLE_PEOPLE } from "../domain/constants";
import { generateId } from "../domain/country/id";
import type { GameState } from "../domain/country/types";
import { getHousingCapacityByProvince } from "../domain/housing/housingRules";
import { pickSettlersFrom } from "../domain/islands/islandRules";
import { newProvinceState } from "../domain/provinces/provincePopulation";
import { getOwnedProvinceIds } from "../domain/provinces/provinceRules";
import type { PlacedBuilding } from "../domain/provinces/types";

export function applySettlementArrival(state: GameState, islandId: string): GameState {
  const from = pickSettlersFrom(state, getHousingCapacityByProvince(state), getOwnedProvinceIds(state));
  const settlers = from ? Math.min(SETTLE_PEOPLE, state.provinces[from].population) : 0;
  const provinces = from ? { ...state.provinces, [from]: { ...state.provinces[from], population: state.provinces[from].population - settlers } } : state.provinces;
  const existing = state.provinces[islandId];

  if (existing) {
    // More settlers for a colony already held.
    return { ...state, provinces: { ...provinces, [islandId]: { ...existing, population: existing.population + settlers } } };
  }
  const built = (type: PlacedBuilding["type"], count: number): PlacedBuilding[] =>
    Array.from({ length: count }, () => ({ id: generateId("building"), provinceId: islandId, type }));
  return {
    ...state,
    settledIslandIds: [...state.settledIslandIds, islandId],
    placedBuildings: [...state.placedBuildings, ...built("housing", SETTLE_HOMES), ...built("farm", SETTLE_FARMS)],
    farmCount: state.farmCount + SETTLE_FARMS,
    provinces: { ...provinces, [islandId]: newProvinceState(settlers, state.stats.stability) },
  };
}
