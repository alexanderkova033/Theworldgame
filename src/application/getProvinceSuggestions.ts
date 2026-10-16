// Use case: what a province most needs built or mended, for its card on
// the map (see ProvinceCard), so the common fixes need no trip to the
// Build window. At most three, most urgent first. Each says why in a few
// words, and how it can be done: straight away, by buying the material
// first (see buyAndBuild), or not yet, and why not.
import { CURRENCY_SYMBOL } from "../domain/constants";
import type { ProjectType } from "../domain/construction/types";
import type { GameState } from "../domain/country/types";
import { buildFactory } from "./actions/buildFactory";
import { buildFarm } from "./actions/buildFarm";
import { buildHousing } from "./actions/buildHousing";
import { planBuyAndBuild, type BuyAndBuildPlan } from "./actions/buyAndBuild";
import { countBuildingsInProvince, getBuildCost, upfrontCost, type BuildAction } from "./actions/createBuildAction";
import { canRepairBuilding } from "./actions/repairBuilding";
import { getProvinceStatus, type ProvinceOverview } from "./getProvinceOverview";

export const MAX_SUGGESTIONS = 3;

export type Suggestion =
  | {
      kind: "build";
      key: string;
      action: BuildAction;
      why: string;
      cost: number; // full price in Crowns, after laws
      how: "build" | "buy" | "blocked";
      plan: BuyAndBuildPlan | null; // when how is "buy"
      blockedBy?: string; // when how is "blocked"
    }
  | { kind: "repair"; key: string; buildingId: string; type: ProjectType; why: string; can: boolean };

function buildSuggestion(state: GameState, provinceId: string, action: BuildAction, why: string): Suggestion | null {
  if (countBuildingsInProvince(state, action.config.type, provinceId) >= action.maxPerProvince) return null;
  const cost = getBuildCost(state, action.config.cost);
  const base = { kind: "build" as const, key: action.config.type, action, why, cost };
  if (action.canBuild(state, provinceId)) return { ...base, how: "build", plan: null };
  const plan = planBuyAndBuild(state, action, provinceId);
  if (plan) return { ...base, how: "buy", plan };
  const moneyShort = Math.ceil(upfrontCost(cost) - state.stats.treasury);
  const blockedBy =
    moneyShort > 0
      ? `Needs ${moneyShort.toLocaleString()} more ${CURRENCY_SYMBOL} to start`
      : `Needs more ${action.config.resourceType}, and the money to buy it`;
  return { ...base, how: "blocked", plan: null, blockedBy };
}

export function getProvinceSuggestions(state: GameState, overview: ProvinceOverview): Suggestion[] {
  const status = getProvinceStatus(overview);
  const id = overview.id;
  const found: Array<Suggestion | null> = [];

  if (status.homes === "over") found.push(buildSuggestion(state, id, buildHousing, `Roofs for ${Math.round(overview.homeless).toLocaleString()} people`));
  if (status.jobs === "jobless") {
    // Factories employ the most; farms when the factories are full.
    found.push(
      buildSuggestion(state, id, buildFactory, `Work for ${Math.round(overview.unemployed).toLocaleString()} people`) ??
        buildSuggestion(state, id, buildFarm, `Work for ${Math.round(overview.unemployed).toLocaleString()} people`),
    );
  }
  const broken = state.placedBuildings.find((b) => b.provinceId === id && b.condition === "broken");
  if (broken) found.push({ kind: "repair", key: `repair-${broken.id}`, buildingId: broken.id, type: broken.type, why: "Back at work once mended", can: canRepairBuilding(state, broken.id) });
  if (status.homes === "full") found.push(buildSuggestion(state, id, buildHousing, "Room for more people"));
  if (status.jobs === "short" && status.homes !== "over" && status.homes !== "full") found.push(buildSuggestion(state, id, buildHousing, "Brings workers for the open jobs"));

  return found.filter((s): s is Suggestion => s !== null).slice(0, MAX_SUGGESTIONS);
}
