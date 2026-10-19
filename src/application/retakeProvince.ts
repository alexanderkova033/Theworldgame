// Use case: regiments beat the rebels holding a province that broke away
// (see domain/military/battleRules.ts). It is the country's again, with the
// people who stayed there, but nothing it had built, and it remembers being
// taken by force: on strike, and aggrieved for half a year, as after an
// uprising put down.
import { UNREST_EASE_MARGIN, UNREST_RIOTS_BELOW, UPRISING_GRIEVANCE_DAYS } from "../domain/constants";
import { addDays } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { newProvinceState } from "../domain/provinces/provincePopulation";

export function retakeProvince(state: GameState, provinceId: string): GameState {
  const free = state.freeProvinces[provinceId];
  if (!free) return state;
  const { [provinceId]: _taken, ...freeProvinces } = state.freeProvinces;
  const province = {
    ...newProvinceState(free.people, UNREST_RIOTS_BELOW + UNREST_EASE_MARGIN),
    unrestStage: "strikes" as const,
    aggrievedUntil: addDays(state.date, UPRISING_GRIEVANCE_DAYS),
  };
  return {
    ...state,
    freeProvinces,
    lostProvinceIds: state.lostProvinceIds.filter((id) => id !== provinceId),
    provinces: { ...state.provinces, [provinceId]: province },
    stats: { ...state.stats, population: state.stats.population + free.people },
  };
}
