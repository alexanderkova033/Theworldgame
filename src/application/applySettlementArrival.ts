// Use case: a settler ship lands. The first one to an island makes it one
// of the country's provinces, with the settlers' first homes and a farm, so
// they have work from the first day. A later one to an island already held
// only brings more people. Either way the settlers are taken from the
// mainland (where most are sleeping rough, or it is most crowded): they
// have only moved. People already living on the island join the country,
// unless they were driven off, and so add to its numbers.
import { LOCALS_SHARE_DAYS, SETTLE_FARMS, SETTLE_HOMES, SETTLE_PEOPLE } from "../domain/constants";
import { addDays } from "../domain/country/calendar";
import { getIslandData } from "../domain/islands/islandData";
import type { LocalsTerms } from "../domain/islands/types";
import { generateId } from "../domain/country/id";
import type { GameState } from "../domain/country/types";
import { getHousingCapacityByProvince } from "../domain/housing/housingRules";
import { pickSettlersFrom } from "../domain/islands/islandRules";
import { newProvinceState } from "../domain/provinces/provincePopulation";
import { getOwnedProvinceIds } from "../domain/provinces/provinceRules";
import type { PlacedBuilding } from "../domain/provinces/types";

export function applySettlementArrival(state: GameState, islandId: string, terms?: LocalsTerms): GameState {
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
  // People already living there join the country, unless driven off; living
  // alongside them, they keep to their own ways for a year.
  const locals = terms !== undefined && terms !== "drive" ? (getIslandData(islandId)?.locals?.people ?? 0) : 0;
  const island = newProvinceState(settlers + locals, state.stats.stability);
  return {
    ...state,
    stats: { ...state.stats, population: state.stats.population + locals },
    settledIslandIds: [...state.settledIslandIds, islandId],
    placedBuildings: [...state.placedBuildings, ...built("housing", SETTLE_HOMES), ...built("farm", SETTLE_FARMS)],
    farmCount: state.farmCount + SETTLE_FARMS,
    provinces: {
      ...provinces,
      [islandId]: terms === "share" ? { ...island, disputeUntil: addDays(state.date, LOCALS_SHARE_DAYS) } : island,
    },
  };
}
