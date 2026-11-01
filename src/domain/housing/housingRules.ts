// Housing: every working home shelters PEOPLE_PER_HOME people (more with
// housing research). Population doesn't stop at that number — it keeps
// growing, more slowly — and the share of people without a roof drags on
// stability every day. In winter every working home also burns coal, then
// firewood once the coal is gone, at WOOD_PER_COAL_HEAT wood for each coal's
// worth; whatever can't be heated is a second, harsher penalty (people
// freezing). Larger buildings hold their heat better (getHeatShare).
import {
  HEAT_SHARE_HOME,
  HEAT_SHARE_TENEMENT,
  HEAT_SHARE_TOWER,
  HEATING_FUEL_PER_HOME,
  HOMELESS_PENALTY_CAP,
  HOMELESS_STABILITY_PENALTY,
  COLD_STABILITY_PENALTY,
  PEOPLE_PER_HOME,
  WOOD_PER_COAL_HEAT,
} from "../constants";
import type { ProjectType } from "../construction/types";
import type { Season } from "../country/calendar";
import type { GameState } from "../country/types";
import { getHomeWeight, getWorkingCounts, isWorking } from "../maintenance/maintenanceRules";
import { getNation } from "../nations/nationRules";
import type { PlacedBuilding } from "../provinces/types";
import { getModifiers } from "../policy/policyRules";
import type { ResourceBundle } from "../resources/types";
import { getOwnedProvinceIds } from "../provinces/provinceRules";

export function getPeoplePerHome(state: GameState): number {
  return PEOPLE_PER_HOME * getModifiers(state).housingCapacityMultiplier;
}

export function getHousingCapacity(state: GameState): number {
  return getWorkingCounts(state).homes * getPeoplePerHome(state);
}

// The same homes, province by province (every owned province listed, even
// one with none). Sums to getHousingCapacity.
export function getHousingCapacityByProvince(state: GameState): Record<string, number> {
  const perHome = getPeoplePerHome(state);
  const capacity: Record<string, number> = Object.fromEntries(getOwnedProvinceIds(state).map((id) => [id, 0]));
  for (const building of state.placedBuildings) {
    if (isWorking(building) && building.provinceId in capacity) capacity[building.provinceId] += perHome * getHomeWeight(building.type);
  }
  return capacity;
}

// 0..1 — the share of the population without a home.
export function getHomelessShare(population: number, capacity: number): number {
  if (population <= 0) return 0;
  return Math.max(0, population - capacity) / population;
}

// People without a home, province by province: a free home in one province
// doesn't house a family sleeping rough in another.
export function getHomelessByProvince(state: GameState): Record<string, number> {
  const capacity = getHousingCapacityByProvince(state);
  return Object.fromEntries(Object.entries(state.provinces).map(([id, p]) => [id, Math.max(0, p.population - (capacity[id] ?? 0))]));
}

export function getHomelessTotal(state: GameState): number {
  return Object.values(getHomelessByProvince(state)).reduce((sum, n) => sum + n, 0);
}

// The national share without a home — the sum over provinces.
export function getNationalHomelessShare(state: GameState): number {
  return state.stats.population > 0 ? getHomelessTotal(state) / state.stats.population : 0;
}

export function getHomelessStabilityPenalty(homelessShare: number): number {
  return Math.min(HOMELESS_PENALTY_CAP, homelessShare * HOMELESS_STABILITY_PENALTY);
}

// What each home's worth of a building burns, against an ordinary home.
export function getHeatShare(type: ProjectType): number {
  return type === "tenement" ? HEAT_SHARE_TENEMENT : type === "tower" ? HEAT_SHARE_TOWER : HEAT_SHARE_HOME;
}

// Coal one building burns on a winter day, before laws and research.
export function getBuildingHeatDemand(type: ProjectType): number {
  return getHomeWeight(type) * getHeatShare(type) * HEATING_FUEL_PER_HOME;
}

// Coal the working homes need today (nothing outside winter). Once the coal
// is gone, wood meets the rest (burnHeatingFuel).
export function getHeatingDemand(state: GameState, season: Season): number {
  if (season !== "winter") return 0;
  const multiplier = getModifiers(state).heatingMultiplier;
  return state.placedBuildings.reduce((sum, b) => sum + (isWorking(b) ? getBuildingHeatDemand(b.type) : 0), 0) * multiplier;
}

// The heat in store, in coal: what to hold against a demand.
export function getHeatInStock(resources: ResourceBundle): number {
  return resources.coal + resources.wood / WOOD_PER_COAL_HEAT;
}

export interface HeatingResult {
  resources: ResourceBundle;
  coalBurned: number;
  woodBurned: number;
  unheatedShare: number; // 0..1 of the demand that couldn't be met
}

// Coal first; firewood once the coal is gone. Demand is in coal.
export function burnHeatingFuel(resources: ResourceBundle, demand: number): HeatingResult {
  if (demand <= 0) return { resources, coalBurned: 0, woodBurned: 0, unheatedShare: 0 };
  const coalBurned = Math.min(resources.coal, demand);
  const woodNeeded = (demand - coalBurned) * WOOD_PER_COAL_HEAT;
  const woodBurned = Math.min(resources.wood, woodNeeded);
  const shortfall = (woodNeeded - woodBurned) / WOOD_PER_COAL_HEAT;
  return {
    resources: { ...resources, coal: resources.coal - coalBurned, wood: resources.wood - woodBurned },
    coalBurned,
    woodBurned,
    unheatedShare: shortfall / demand,
  };
}

export function getColdStabilityPenalty(unheatedShare: number): number {
  return unheatedShare * COLD_STABILITY_PENALTY;
}

// The homes a nation starts with: just enough for its founding population
// plus a little slack, spread round-robin over its provinces.
export function buildStartingHomes(nationId: string, population: number): PlacedBuilding[] {
  const nation = getNation(nationId);
  const count = Math.round((population * 1.05) / PEOPLE_PER_HOME);
  return Array.from({ length: count }, (_, i) => ({
    id: `starting-home-${i + 1}`,
    provinceId: nation.provinceIds[i % nation.provinceIds.length],
    type: "housing" as const,
  }));
}
