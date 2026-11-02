// Use case: what to say when an objective can't be paid for yet, so the
// player can see what to do next: start the clock, or wait for the money or
// the goods. Null when it can be paid for, or when it asks nothing that money
// answers, and the objective's own way there is all that's needed.
import { isFeatureOpen, type ChapterId } from "../domain/chapters/chapterData";
import { REPAIR_DAYS } from "../domain/constants";
import { dayNumber } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { getRepairCost } from "../domain/maintenance/maintenanceRules";
import { getModifiers } from "../domain/policy/policyRules";
import type { ResourceType } from "../domain/resources/types";
import { buildEducation } from "./actions/buildEducation";
import { buildFarm } from "./actions/buildFarm";
import { buildHarbour } from "./actions/buildHarbour";
import { buildHousing } from "./actions/buildHousing";
import { planBuyAndBuild } from "./actions/buyAndBuild";
import { countBuildingsInProvince, getBuildCostIn, upfrontCost, type BuildAction } from "./actions/createBuildAction";
import { canRepairBuilding } from "./actions/repairBuilding";
import { getDaysToSave } from "./getDaysToSave";
import { STARTING_DATE } from "./startNewGame";

// Where Astravia's story asks for a farm and a harbour: the same provinces its
// own checks look in (stories/astravia.ts). tests/objectiveGuidance.test.ts holds the two together.
export const THORNWICK_PROVINCES = ["province-8-north", "province-8-south"];
export const MARROW_PROVINCES = ["province-2-west", "province-2-east"];

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

// A building (in one of these provinces, if the step names some), unless it can
// be started somewhere today, directly or by buying its material first. With no
// room left anywhere, or the building still shut, money isn't what's missing.
function buildPrice(action: BuildAction, within?: string[]) {
  return (state: GameState): Price | null => {
    const { config } = action;
    if (config.feature && !isFeatureOpen(state, config.feature)) return null;
    const open = Object.keys(state.provinces).filter(
      (id) => (!within || within.includes(id)) && (!config.allowedIn || config.allowedIn.test(id)) && !state.provinces[id].uprising && countBuildingsInProvince(state, config.type, id) < action.maxPerProvince,
    );
    if (open.length === 0 || open.some((id) => action.canBuild(state, id) || planBuyAndBuild(state, action, id))) return null;
    return { cost: Math.min(...open.map((id) => upfrontCost(getBuildCostIn(state, config, id)))), good: config.resourceType, goods: upfrontCost(config.resourceCost) };
  };
}

// The objectives with a price, in the order the chapter lists them.
const STEP_PRICES: Partial<Record<ChapterId, Array<((state: GameState) => Price | null) | null>>> = {
  "first-winter": [repairPrice, buildPrice(buildFarm), buildPrice(buildHousing)],
  society: [null, buildPrice(buildEducation)],
  "astravia:promise": [null, buildPrice(buildFarm, THORNWICK_PROVINCES)],
  "astravia:coast": [null, buildPrice(buildHarbour, MARROW_PROVINCES)],
};

const STEP_REPAIRS = 0; // of the first winter

// The days until a step already paid for is done, or null when it isn't one:
// the first winter's repairs, once every one of them is paid.
export function getObjectiveUnderway(state: GameState, id: ChapterId, step: number): number | null {
  if (id !== "first-winter" || step !== STEP_REPAIRS) return null;
  const unfinished = state.placedBuildings.filter((b) => b.id.startsWith("starting-") && b.condition);
  if (unfinished.length === 0 || unfinished.some((b) => b.condition !== "repairing")) return null;
  return Math.max(...unfinished.map((b) => b.repairDaysRemaining ?? REPAIR_DAYS));
}

// The step in hand: the first still to do that isn't already under way. -1 if none.
export function getCurrentObjective(state: GameState, id: ChapterId, met: boolean[]): number {
  return met.findIndex((done, step) => !done && getObjectiveUnderway(state, id, step) === null);
}

export function getObjectiveGuidance(state: GameState, id: ChapterId, step: number): ObjectiveGuidance | null {
  const price = STEP_PRICES[id]?.[step]?.(state);
  if (!price) return null;
  if (state.isPaused && dayNumber(state.date) === dayNumber(STARTING_DATE)) return { kind: "startClock" };
  const moneyShort = price.cost - state.stats.treasury;
  if (moneyShort > 0) return { kind: "saving", cost: price.cost, days: getDaysToSave(state, moneyShort) };
  return { kind: "goods", good: price.good, short: Math.ceil(price.goods - state.resources[price.good]) };
}
