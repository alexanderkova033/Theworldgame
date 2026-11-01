// Paying to service a worn building: charged now, the wear is gone at once,
// and the building never leaves service.
import type { GameState } from "../../domain/country/types";
import { getServiceCost, isWorn } from "../../domain/maintenance/maintenanceRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { deductResource } from "../../domain/resources/resourceRules";
import { recordAction } from "./recordAction";

export function canServiceBuilding(state: GameState, buildingId: string): boolean {
  const building = state.placedBuildings.find((b) => b.id === buildingId);
  if (!building || !isWorn(building)) return false;
  const cost = getServiceCost(building.type, getModifiers(state).repairCostMultiplier);
  return state.stats.treasury >= cost.treasury && state.resources[cost.resourceType] >= cost.resourceAmount;
}

export function serviceBuilding(state: GameState, buildingId: string): GameState {
  if (!canServiceBuilding(state, buildingId)) return state;
  const building = state.placedBuildings.find((b) => b.id === buildingId)!;
  const cost = getServiceCost(building.type, getModifiers(state).repairCostMultiplier);
  const next: GameState = {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - cost.treasury },
    resources: deductResource(state.resources, cost.resourceType, cost.resourceAmount),
    placedBuildings: state.placedBuildings.map((b) => (b.id === buildingId ? { ...b, wornUntilDay: undefined } : b)),
  };
  return recordAction(state, next, { treasury: "construction" });
}
