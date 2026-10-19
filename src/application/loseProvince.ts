// Use case: a province is no longer the country's. It breaks away after an
// uprising (see domain/uprising), and its rebels hold it; or, an island, it
// falls to a neighbour in war (see domain/military), and joins its country.
// Either way its people leave the national count, its buildings and any
// building work there are gone, and every list of "your provinces" passes
// it by.
import type { ProjectType } from "../domain/construction/types";
import type { GameState } from "../domain/country/types";
import { newFreeProvince } from "../domain/military/battleRules";

// The province and everything in it, gone from the country.
function dropProvince(state: GameState, provinceId: string): { state: GameState; people: number } {
  const gone = state.placedBuildings.filter((b) => b.provinceId === provinceId);
  const count = (type: ProjectType) => gone.filter((b) => b.type === type).length;
  const { [provinceId]: lost, ...provinces } = state.provinces;
  const people = lost?.population ?? 0;
  return {
    people,
    state: {
      ...state,
      provinces,
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
      stats: { ...state.stats, population: Math.max(0, state.stats.population - people) },
    },
  };
}

export function loseProvince(state: GameState, provinceId: string): GameState {
  const { state: dropped, people } = dropProvince(state, provinceId);
  return {
    ...dropped,
    lostProvinceIds: [...state.lostProvinceIds, provinceId],
    // Its rebels hold it, at full strength, until regiments take it back.
    freeProvinces: { ...state.freeProvinces, [provinceId]: newFreeProvince(people) },
  };
}

// An island of yours taken in war: the neighbour holds it, and its people
// join that country.
export function loseIsland(state: GameState, islandId: string, nationId: string): GameState {
  const { state: dropped, people } = dropProvince(state, islandId);
  const n = dropped.neighbours[nationId];
  const sieges = { ...dropped.sieges };
  delete sieges[islandId];
  return {
    ...dropped,
    sieges,
    settledIslandIds: dropped.settledIslandIds.filter((id) => id !== islandId),
    foreignIslands: { ...dropped.foreignIslands, [islandId]: nationId },
    neighbours: n ? { ...dropped.neighbours, [nationId]: { ...n, population: n.population + people, homes: n.homes + 1 } } : dropped.neighbours,
  };
}
