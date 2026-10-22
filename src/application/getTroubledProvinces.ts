// Use case: the provinces that need the player, worst first, for the map's
// "Next problem" button (and its N key). Riots, then a crisis (domain/crises),
// then strikes, then people without a roof, then the jobless, then a broken
// building; within each, the one with the most people affected first. Homes nearly full or jobs
// going unfilled aren't problems yet, so they're left out.
import type { GameState } from "../domain/country/types";
import { getProvinceStatus, type ProvinceOverview } from "./getProvinceOverview";

function trouble(state: GameState, o: ProvinceOverview): [severity: number, size: number] {
  const status = getProvinceStatus(o);
  if (status.stage === "riots") return [6, o.population];
  if (status.crisis) return [5, o.population];
  if (status.stage === "strikes") return [4, o.population];
  if (status.homes === "over") return [3, o.homeless];
  if (status.jobs === "jobless") return [2, o.unemployed];
  if (state.placedBuildings.some((b) => b.provinceId === o.id && b.condition === "broken")) return [1, 0];
  return [0, 0];
}

export function getTroubledProvinces(state: GameState, overviews: ProvinceOverview[]): string[] {
  return overviews
    .map((o) => ({ id: o.id, rank: trouble(state, o) }))
    .filter(({ rank }) => rank[0] > 0)
    .sort((a, b) => b.rank[0] - a.rank[0] || b.rank[1] - a.rank[1])
    .map(({ id }) => id);
}
