// Use case: a province breaks away after an uprising (see domain/uprising).
// It is no longer the country's: its people leave the national count, its
// buildings and any building work there are gone, and it joins
// lostProvinceIds, so every list of "your provinces" passes it by.
import type { ProjectType } from "../domain/construction/types";
import type { GameState } from "../domain/country/types";

export function loseProvince(state: GameState, provinceId: string): GameState {
  const gone = state.placedBuildings.filter((b) => b.provinceId === provinceId);
  const count = (type: ProjectType) => gone.filter((b) => b.type === type).length;
  const { [provinceId]: lost, ...provinces } = state.provinces;
  return {
    ...state,
    provinces,
    lostProvinceIds: [...state.lostProvinceIds, provinceId],
    placedBuildings: state.placedBuildings.filter((b) => b.provinceId !== provinceId),
    projects: state.projects.filter((p) => p.provinceId !== provinceId),
    // The country's tallies of each kind of building (homes are counted
    // from the map instead).
    farmCount: state.farmCount - count("farm"),
    factoryCount: state.factoryCount - count("factory"),
    roadCount: state.roadCount - count("road"),
    granaryCount: state.granaryCount - count("granary"),
    canneryCount: state.canneryCount - count("cannery"),
    educationLevel: state.educationLevel - count("education"),
    stats: { ...state.stats, population: Math.max(0, state.stats.population - (lost?.population ?? 0)) },
  };
}
