// Province crises: trouble that strikes one province, chosen by its land
// and its state, about once a year. Each arrives as a letter naming the
// province, leaves a lasting condition there, and has a few ways out, most
// often one that ends it for good:
//   - the river floods (plains and coast, in spring or autumn): its farms ruined and
//     half its homes washed away. A dike (it floods no more), rebuilt as it
//     was (sooner, cheaper), or left to its people (the farms come back by
//     themselves, the homes don't, and its mood sinks meanwhile).
//   - the seam runs out (hills): its ore and coal stop. A deeper shaft
//     brings half back in a season; retooling keeps its works open; closing
//     the pits shuts one, and its workers go looking for work.
//   - the forest is felled bare (forest): no wood for two years, or one
//     replanted.
//   - fever in the town (a crowded province): some die as it strikes.
//     Quarantine (its mood sinks), doctors (money), or nothing: then more
//     die each month, and it reaches a province next door.
//   - the fishing grounds fail (coast): no fish for a year, or half sent
//     further out.
// While a crisis lasts the province's mood sits a little below the
// nation's. Rolled and run in application/day/crises.ts; answered in
// application/actions/crisisActions.ts.
import {
  CRISIS_UNREST,
  CROWDED_SHARE,
  FELLING_REPLANT_COST,
  FEVER_DOCTORS_COST,
  FEVER_QUARANTINE_UNREST,
  FISHING_BOATS_COST,
  FLOOD_DIKE_COST,
  FLOOD_DIKE_WOOD,
  FLOOD_LEFT_UNREST,
  FLOOD_REBUILD_COST,
  SEAM_RETOOL_COST,
  SEAM_SHAFT_COST,
} from "../constants";
import type { Season } from "../country/calendar";
import type { GameState } from "../country/types";
import { getProducingTerrains } from "../islands/islandRules";
import { getOwnedProvinceIds, getPlace } from "../provinces/provinceRules";
import type { Terrain } from "../provinces/types";
import type { ProvinceState } from "../provinces/types";
import { addResources, calculateDailyProduction, emptyResourceBundle } from "../resources/resourceRules";
import { getWorkingCounts, isWorking } from "../maintenance/maintenanceRules";
import { getRoadProductionMultiplier } from "../roads/roadsRules";
import { COAL_PER_MINE, ORE_PER_MINE, RESOURCE_PER_PROVINCE, WOOD_PER_SAWMILL } from "../constants";
import type { ResourceBundle } from "../resources/types";
import type { CrisisAnswer, CrisisKind } from "./types";

export const CRISIS_ANSWERS: Record<CrisisKind, CrisisAnswer[]> = {
  flood: ["dike", "rebuild", "leave"],
  seam: ["shaft", "retool", "close"],
  felling: ["replant", "regrow"],
  fever: ["doctors", "quarantine", "neglect"],
  fishing: ["boats", "wait"],
};

// What an answer costs, there and then.
export function getAnswerCost(answer: CrisisAnswer): { treasury: number; wood: number } {
  switch (answer) {
    case "dike":
      return { treasury: FLOOD_DIKE_COST, wood: FLOOD_DIKE_WOOD };
    case "rebuild":
      return { treasury: FLOOD_REBUILD_COST, wood: 0 };
    case "shaft":
      return { treasury: SEAM_SHAFT_COST, wood: 0 };
    case "retool":
      return { treasury: SEAM_RETOOL_COST, wood: 0 };
    case "replant":
      return { treasury: FELLING_REPLANT_COST, wood: 0 };
    case "doctors":
      return { treasury: FEVER_DOCTORS_COST, wood: 0 };
    case "boats":
      return { treasury: FISHING_BOATS_COST, wood: 0 };
    default:
      return { treasury: 0, wood: 0 };
  }
}

// The crises a province's land and state lay it open to, in a season.
export function crisesFor(p: ProvinceState, terrain: Terrain, capacity: number, season: Season): CrisisKind[] {
  if (p.crisis || p.uprising) return [];
  const kinds: CrisisKind[] = [];
  if ((terrain === "plains" || terrain === "coast") && (season === "spring" || season === "autumn") && !p.diked) kinds.push("flood");
  if (terrain === "hills" && p.seamYield >= 1) kinds.push("seam");
  if (terrain === "forest") kinds.push("felling");
  if (terrain === "coast") kinds.push("fishing");
  if (p.population > 0 && (p.population - capacity) / p.population >= CROWDED_SHARE) kinds.push("fever");
  return kinds;
}

// One crisis at a time: while one is under way anywhere in the country, no
// other strikes at random (a fever left alone still spreads: it is the same
// one; a story's crisis comes when the story calls for it).
export function isCrisisUnderWay(provinces: Record<string, ProvinceState>): boolean {
  return Object.values(provinces).some((p) => p.crisis);
}

// How far below the nation's a province's mood sits for its crisis.
export function getCrisisUnrest(p: ProvinceState): number {
  const c = p.crisis;
  if (!c) return 0;
  if (c.answer === "leave") return CRISIS_UNREST + FLOOD_LEFT_UNREST;
  if (c.answer === "quarantine") return CRISIS_UNREST + FEVER_QUARANTINE_UNREST;
  return CRISIS_UNREST;
}

// The share of each good a province's land still gives, crisis and all.
function shares(p: ProvinceState): Partial<Record<keyof ResourceBundle, number>> {
  const c = p.crisis;
  const during = (kind: CrisisKind) => (c?.kind === kind ? c.yieldShare : 1);
  const mined = p.seamYield * during("seam");
  return { ore: mined, coal: mined, wood: during("felling"), fish: during("fishing") };
}

// A province's day of goods from its land, less what its crisis takes.
export function getProvinceYield(p: ProvinceState | undefined, terrain: Terrain, season: Season): ResourceBundle {
  const made = calculateDailyProduction([terrain], season);
  if (!p) return made;
  for (const [good, share] of Object.entries(shares(p)) as Array<[keyof ResourceBundle, number]>) made[good] *= share;
  return made;
}

// What mines and sawmills add today: each as far as it's staffed, and a mine
// no more than its seam and any crisis there allow.
function getWorksProduction(state: GameState, season: Season, industryStaffing: (provinceId: string) => number): ResourceBundle {
  const made = emptyResourceBundle();
  for (const building of state.placedBuildings) {
    if ((building.type !== "mine" && building.type !== "sawmill") || !isWorking(building)) continue;
    const p = state.provinces[building.provinceId];
    if (!p) continue;
    const staffed = industryStaffing(building.provinceId);
    const left = getProvinceYield(p, building.type === "mine" ? "hills" : "forest", season);
    if (building.type === "mine") {
      const share = left.ore / RESOURCE_PER_PROVINCE;
      made.ore += ORE_PER_MINE * staffed * share;
      made.coal += COAL_PER_MINE * staffed * share;
    } else {
      made.wood += WOOD_PER_SAWMILL * staffed * (left.wood / RESOURCE_PER_PROVINCE);
    }
  }
  return made;
}

// All of today's goods: the land, its works, and what roads add to them.
export function getGoodsProduction(state: GameState, season: Season, industryStaffing: (provinceId: string) => number): ResourceBundle {
  const total = addResources(getLandProduction(state, season), getWorksProduction(state, season, industryStaffing));
  const carried = getRoadProductionMultiplier(getWorkingCounts(state).roads);
  return Object.fromEntries(Object.entries(total).map(([good, amount]) => [good, amount * carried])) as unknown as ResourceBundle;
}

// The country's day of goods from its land: every province it holds, less
// what crises take.
export function getLandProduction(state: GameState, season: Season): ResourceBundle {
  const made = calculateDailyProduction(getProducingTerrains(state), season);
  for (const id of getOwnedProvinceIds(state)) {
    const p = state.provinces[id];
    const terrain = getPlace(id)?.terrain;
    if (!p || !terrain) continue;
    const full = calculateDailyProduction([terrain], season);
    const left = getProvinceYield(p, terrain, season);
    for (const good of Object.keys(made) as Array<keyof ResourceBundle>) made[good] = Math.max(0, made[good] - (full[good] - left[good]));
  }
  return made;
}
