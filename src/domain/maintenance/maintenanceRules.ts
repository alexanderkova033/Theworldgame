// Buildings wear out. Every working building has a small daily chance to
// break down (police deter some of it — see domain/workforce); a broken one
// produces nothing until the player pays for a repair, which then takes
// REPAIR_DAYS to finish. The aggregate counts on GameState (farmCount,
// factoryCount, ...) stay "how many exist"; getWorkingCounts below is "how
// many are actually running today", and that's what the simulation uses.
import {
  BREAKDOWN_CHANCE_PER_DAY,
  CANNERY_COST,
  CANNERY_ORE_COST,
  EDUCATION_COST,
  EDUCATION_WOOD_COST,
  FACTORY_COST,
  FACTORY_ORE_COST,
  FARM_COST,
  FARM_WOOD_COST,
  GRANARY_COST,
  GRANARY_WOOD_COST,
  HOUSING_COST,
  HOUSING_WOOD_COST,
  REPAIR_COST_SHARE,
  REPAIR_DAYS,
  ROAD_COST,
  ROAD_ORE_COST,
} from "../constants";
import type { ProjectType } from "../construction/types";
import type { GameState } from "../country/types";
import type { PlacedBuilding } from "../provinces/types";
import type { ResourceType } from "../resources/types";

const BUILD_PRICES: Record<ProjectType, { treasury: number; resourceType: ResourceType; resourceAmount: number }> = {
  farm: { treasury: FARM_COST, resourceType: "wood", resourceAmount: FARM_WOOD_COST },
  factory: { treasury: FACTORY_COST, resourceType: "ore", resourceAmount: FACTORY_ORE_COST },
  road: { treasury: ROAD_COST, resourceType: "ore", resourceAmount: ROAD_ORE_COST },
  education: { treasury: EDUCATION_COST, resourceType: "wood", resourceAmount: EDUCATION_WOOD_COST },
  granary: { treasury: GRANARY_COST, resourceType: "wood", resourceAmount: GRANARY_WOOD_COST },
  cannery: { treasury: CANNERY_COST, resourceType: "ore", resourceAmount: CANNERY_ORE_COST },
  housing: { treasury: HOUSING_COST, resourceType: "wood", resourceAmount: HOUSING_WOOD_COST },
};

export interface RepairCost {
  treasury: number;
  resourceType: ResourceType;
  resourceAmount: number;
}

// costMultiplier: cheaper with research (ResearchEffects.repairCostMultiplier).
export function getRepairCost(type: ProjectType, costMultiplier = 1): RepairCost {
  const price = BUILD_PRICES[type];
  return {
    treasury: Math.round(price.treasury * REPAIR_COST_SHARE * costMultiplier),
    resourceType: price.resourceType,
    resourceAmount: Math.ceil(price.resourceAmount * REPAIR_COST_SHARE * costMultiplier),
  };
}

export function isWorking(building: PlacedBuilding): boolean {
  return building.condition === undefined;
}

function countNotWorking(placedBuildings: PlacedBuilding[], type: ProjectType): number {
  return placedBuildings.filter((b) => b.type === type && !isWorking(b)).length;
}

export interface WorkingCounts {
  farms: number;
  factories: number;
  roads: number;
  granaries: number;
  canneries: number;
  schools: number;
  homes: number;
}

export function getWorkingCounts(state: GameState): WorkingCounts {
  const broken = (type: ProjectType) => countNotWorking(state.placedBuildings, type);
  return {
    farms: Math.max(0, state.farmCount - broken("farm")),
    factories: Math.max(0, state.factoryCount - broken("factory")),
    roads: Math.max(0, state.roadCount - broken("road")),
    granaries: Math.max(0, state.granaryCount - broken("granary")),
    canneries: Math.max(0, state.canneryCount - broken("cannery")),
    schools: Math.max(0, state.educationLevel - broken("education")),
    // Homes have no aggregate count on GameState — they're counted straight
    // from the map.
    homes: state.placedBuildings.filter((b) => b.type === "housing" && isWorking(b)).length,
  };
}

// Returns the same array when nothing broke, so the (memoized) map doesn't
// re-render on an ordinary day.
export function rollBreakdowns(
  placedBuildings: PlacedBuilding[],
  breakdownReduction: number, // 0..1, from police — see workforceRules.ts
  breakdownMultiplier = 1, // from research (ResearchEffects.breakdownMultiplier)
): { placedBuildings: PlacedBuilding[]; broken: PlacedBuilding[] } {
  const chance = BREAKDOWN_CHANCE_PER_DAY * (1 - breakdownReduction) * breakdownMultiplier;
  const broken: PlacedBuilding[] = [];
  const next = placedBuildings.map((building) => {
    if (!isWorking(building) || Math.random() >= chance) return building;
    const failed: PlacedBuilding = { ...building, condition: "broken" };
    broken.push(failed);
    return failed;
  });
  return broken.length === 0 ? { placedBuildings, broken } : { placedBuildings: next, broken };
}

// One day of work on every repair in progress. Same identity guarantee as
// rollBreakdowns when there's nothing to do.
export function advanceRepairs(placedBuildings: PlacedBuilding[]): { placedBuildings: PlacedBuilding[]; repaired: PlacedBuilding[] } {
  if (!placedBuildings.some((b) => b.condition === "repairing")) return { placedBuildings, repaired: [] };
  const repaired: PlacedBuilding[] = [];
  const next = placedBuildings.map((building) => {
    if (building.condition !== "repairing") return building;
    const daysRemaining = (building.repairDaysRemaining ?? REPAIR_DAYS) - 1;
    if (daysRemaining > 0) return { ...building, repairDaysRemaining: daysRemaining };
    const fixed: PlacedBuilding = { id: building.id, provinceId: building.provinceId, type: building.type };
    repaired.push(fixed);
    return fixed;
  });
  return { placedBuildings: next, repaired };
}
