// Paying to service a worn building: charged now, a crew goes in, and the wear
// is gone when they finish. The building never leaves service, and its wear
// clock stops while they work. A crew new to the trade is slower and dearer.
import { SERVICE_DAYS_TRAINED, SERVICE_DAYS_UNTRAINED } from "../../domain/constants";
import type { ProjectType } from "../../domain/construction/types";
import { dayNumber } from "../../domain/country/calendar";
import type { GameState } from "../../domain/country/types";
import { hasTrainedCrew } from "../../domain/labour/labourRules";
import { getServiceCost, needsService, type RepairCost } from "../../domain/maintenance/maintenanceRules";
import { getModifiers } from "../../domain/policy/policyRules";
import { deductResource } from "../../domain/resources/resourceRules";
import { recordAction } from "./recordAction";

export interface ServiceOrder {
  trainedCrew: boolean;
  days: number;
  cost: RepairCost;
}

// What a service on this kind of building would take, ordered today.
export function getServiceOrder(state: GameState, type: ProjectType): ServiceOrder {
  const trainedCrew = hasTrainedCrew(state, type);
  return {
    trainedCrew,
    days: trainedCrew ? SERVICE_DAYS_TRAINED : SERVICE_DAYS_UNTRAINED,
    cost: getServiceCost(type, getModifiers(state).repairCostMultiplier, trainedCrew),
  };
}

export function canServiceBuilding(state: GameState, buildingId: string): boolean {
  const building = state.placedBuildings.find((b) => b.id === buildingId);
  if (!building || !needsService(building)) return false;
  const { cost } = getServiceOrder(state, building.type);
  return state.stats.treasury >= cost.treasury && state.resources[cost.resourceType] >= cost.resourceAmount;
}

export function serviceBuilding(state: GameState, buildingId: string): GameState {
  if (!canServiceBuilding(state, buildingId)) return state;
  const building = state.placedBuildings.find((b) => b.id === buildingId)!;
  const { cost, days } = getServiceOrder(state, building.type);
  const next: GameState = {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - cost.treasury },
    resources: deductResource(state.resources, cost.resourceType, cost.resourceAmount),
    placedBuildings: state.placedBuildings.map((b) => (b.id === buildingId ? { ...b, serviceUntilDay: dayNumber(state.date) + days, serviceDays: days } : b)),
  };
  return recordAction(state, next, { treasury: "construction" });
}
