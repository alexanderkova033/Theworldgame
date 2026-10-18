// Where the country's people live. Each of the player's provinces keeps its
// own population; the national figure (stats.population) is always their
// sum. Anything that changes the national figure as a whole — a decision,
// a law, an epidemic — is spread over the provinces in proportion by
// reconcileProvinces, so those rules never need to know about provinces.
import type { GameState } from "../country/types";
import { getHousingCapacityByProvince } from "../housing/housingRules";
import { getStageForStability } from "../unrest/unrestRules";
import type { ProvinceState } from "./types";
import { getOwnedProvinceIds } from "./provinceRules";

export function getProvincePopulationTotal(provinces: Record<string, ProvinceState>): number {
  return Object.values(provinces).reduce((sum, p) => sum + p.population, 0);
}

// Shares of a whole, by weight — evenly if every weight is zero.
function shares(ids: string[], weights: Record<string, number>): Record<string, number> {
  const total = ids.reduce((sum, id) => sum + Math.max(0, weights[id] ?? 0), 0);
  return Object.fromEntries(ids.map((id) => [id, total > 0 ? Math.max(0, weights[id] ?? 0) / total : 1 / ids.length]));
}

// A new game (or a save from before provinces had people): everyone lives
// where the homes are, and every province starts as orderly as the nation.
// A province as it starts out, or as it joins a country: calm as the nation
// is, never rioted, never risen.
export function newProvinceState(population: number, stability: number): ProvinceState {
  return {
    population,
    stability,
    unrestStage: getStageForStability(stability),
    riotDays: 0,
    uprising: null,
    aggrievedUntil: null,
    disputeUntil: null,
    payRiseUntil: null,
    taxReliefUntil: null,
  };
}

export function createProvinceStates(
  provinceIds: string[],
  population: number,
  capacityByProvince: Record<string, number>,
  stability: number,
): Record<string, ProvinceState> {
  const share = shares(provinceIds, capacityByProvince);
  return Object.fromEntries(
    provinceIds.map((id) => [id, newProvinceState(population * share[id], stability)]),
  );
}

// Make the provinces add up to the national population again: every owned
// province present, and any gap spread in proportion to where people
// already live (or where the homes are, if nobody does yet).
export function reconcileProvinces(
  provinces: Record<string, ProvinceState>,
  provinceIds: string[],
  nationalPopulation: number,
  capacityByProvince: Record<string, number>,
  nationalStability: number,
): Record<string, ProvinceState> {
  let next = provinces;
  const missing = provinceIds.filter((id) => !(id in next));
  if (missing.length > 0) {
    next = { ...next };
    for (const id of missing) next[id] = newProvinceState(0, nationalStability);
  }
  const total = getProvincePopulationTotal(next);
  const gap = nationalPopulation - total;
  if (Math.abs(gap) < 1e-6) return next;
  const weights = total > 0 ? Object.fromEntries(provinceIds.map((id) => [id, next[id].population])) : capacityByProvince;
  const share = shares(provinceIds, weights);
  return Object.fromEntries(provinceIds.map((id) => [id, { ...next[id], population: Math.max(0, next[id].population + gap * share[id]) }]));
}

// The whole state, with its provinces brought back in line with the
// national population (after a decision or event changed it).
export function syncProvinces(state: GameState): GameState {
  const provinces = reconcileProvinces(
    state.provinces,
    getOwnedProvinceIds(state),
    state.stats.population,
    getHousingCapacityByProvince(state),
    state.stats.stability,
  );
  return provinces === state.provinces ? state : { ...state, provinces };
}
