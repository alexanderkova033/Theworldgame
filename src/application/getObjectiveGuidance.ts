// Use case: what to say when an objective can't be paid for yet, so the
// player can see what to do next: start the clock, or wait for the money or
// the goods. Null when it can be paid for, or when it asks nothing that money
// answers, and the objective's own way there is all that's needed.
import type { ChapterId } from "../domain/chapters/chapterData";
import { dayNumber } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { getRepairCost } from "../domain/maintenance/maintenanceRules";
import { getModifiers } from "../domain/policy/policyRules";
import type { ResourceType } from "../domain/resources/types";
import { buildFarm } from "./actions/buildFarm";
import { buildHousing } from "./actions/buildHousing";
import { planBuyAndBuild } from "./actions/buyAndBuild";
import { countBuildingsInProvince, getBuildCost, upfrontCost, type BuildAction } from "./actions/createBuildAction";
import { canRepairBuilding } from "./actions/repairBuilding";
import { getDaysToSave } from "./getDaysToSave";
import { STARTING_DATE } from "./startNewGame";

export type ObjectiveGuidance =
  | { kind: "startClock" }
  | { kind: "saving"; cost: number; days: number | null } // days is null when the treasury isn't rising
  | { kind: "goods"; good: ResourceType; short: number };

// What the next thing the objective asks costs to start.
interface Price {
  cost: number;
  good: ResourceType;
  goods: number;
}

// The cheapest of the works the first winter asks to mend, unless one of them
// can be paid for today. Repairs in hand and works a crisis holds cost nothing.
function repairPrice(state: GameState): Price | null {
  const broken = state.placedBuildings.filter((b) => b.id.startsWith("starting-") && b.condition === "broken");
  if (broken.some((b) => canRepairBuilding(state, b.id))) return null;
  const multiplier = getModifiers(state).repairCostMultiplier;
  const prices = broken.map((b) => getRepairCost(b.type, multiplier)).sort((a, b) => a.treasury - b.treasury);
  return prices.length > 0 ? { cost: prices[0].treasury, good: prices[0].resourceType, goods: prices[0].resourceAmount } : null;
}

// A building, unless it can be started somewhere today, directly or by buying
// its material first. With no room left anywhere, money isn't what's missing.
function buildPrice(action: BuildAction) {
  return (state: GameState): Price | null => {
    const { type, cost, resourceType, resourceCost } = action.config;
    const open = Object.keys(state.provinces).filter((id) => !state.provinces[id].uprising && countBuildingsInProvince(state, type, id) < action.maxPerProvince);
    if (open.length === 0 || open.some((id) => action.canBuild(state, id) || planBuyAndBuild(state, action, id))) return null;
    return { cost: upfrontCost(getBuildCost(state, cost)), good: resourceType, goods: upfrontCost(resourceCost) };
  };
}

// The objectives with a price, in the order the chapter lists them.
const STEP_PRICES: Partial<Record<ChapterId, Array<(state: GameState) => Price | null>>> = {
  "first-winter": [repairPrice, buildPrice(buildFarm), buildPrice(buildHousing)],
};

export function getObjectiveGuidance(state: GameState, id: ChapterId, step: number): ObjectiveGuidance | null {
  const price = STEP_PRICES[id]?.[step]?.(state);
  if (!price) return null;
  if (state.isPaused && dayNumber(state.date) === dayNumber(STARTING_DATE)) return { kind: "startClock" };
  const moneyShort = price.cost - state.stats.treasury;
  if (moneyShort > 0) return { kind: "saving", cost: price.cost, days: getDaysToSave(state, moneyShort) };
  return { kind: "goods", good: price.good, short: Math.ceil(price.goods - state.resources[price.good]) };
}
