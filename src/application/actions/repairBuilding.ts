// Paying for a repair crew: the cost is charged now, and the building is
// back in service REPAIR_DAYS later (see advanceRepairs in simulateDay).
import { REPAIR_DAYS } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getRepairCost } from "../../domain/maintenance/maintenanceRules";
import { getResearchEffectsFor } from "../../domain/research/researchRules";
import { deductResource } from "../../domain/resources/resourceRules";
import { recordAction } from "./recordAction";

export function canRepairBuilding(state: GameState, buildingId: string): boolean {
  const building = state.placedBuildings.find((b) => b.id === buildingId);
  if (!building || building.condition !== "broken") return false;
  const cost = getRepairCost(building.type, getResearchEffectsFor(state).repairCostMultiplier);
  return state.stats.treasury >= cost.treasury && state.resources[cost.resourceType] >= cost.resourceAmount;
}

export function repairBuilding(state: GameState, buildingId: string): GameState {
  if (!canRepairBuilding(state, buildingId)) return state;
  const building = state.placedBuildings.find((b) => b.id === buildingId)!;
  const cost = getRepairCost(building.type, getResearchEffectsFor(state).repairCostMultiplier);
  const next: GameState = {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - cost.treasury },
    resources: deductResource(state.resources, cost.resourceType, cost.resourceAmount),
    placedBuildings: state.placedBuildings.map((b) =>
      b.id === buildingId ? { ...b, condition: "repairing" as const, repairDaysRemaining: REPAIR_DAYS } : b,
    ),
  };
  return recordAction(state, next, { treasury: "construction" });
}
