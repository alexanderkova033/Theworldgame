// Use case: a settler ship lands. The island becomes one of the country's
// provinces: the settlers are taken from the mainland (where most are
// sleeping rough, or it is most crowded), and their first homes stand.
// The national population doesn't change: they have only moved.
import { SETTLE_HOMES, SETTLE_PEOPLE } from "../domain/constants";
import { generateId } from "../domain/country/id";
import type { GameState } from "../domain/country/types";
import { getHousingCapacityByProvince } from "../domain/housing/housingRules";
import { pickSettlersFrom } from "../domain/islands/islandRules";
import { newProvinceState } from "../domain/provinces/provincePopulation";
import { getOwnedProvinceIds } from "../domain/provinces/provinceRules";

export function applySettlementArrival(state: GameState, islandId: string): GameState {
  const from = pickSettlersFrom(state, getHousingCapacityByProvince(state), getOwnedProvinceIds(state));
  const settlers = from ? Math.min(SETTLE_PEOPLE, state.provinces[from].population) : 0;
  const homes = Array.from({ length: SETTLE_HOMES }, () => ({ id: generateId("building"), provinceId: islandId, type: "housing" as const }));
  return {
    ...state,
    settledIslandIds: [...state.settledIslandIds, islandId],
    placedBuildings: [...state.placedBuildings, ...homes],
    provinces: {
      ...state.provinces,
      ...(from ? { [from]: { ...state.provinces[from], population: state.provinces[from].population - settlers } } : {}),
      [islandId]: newProvinceState(settlers, state.stats.stability),
    },
  };
}
