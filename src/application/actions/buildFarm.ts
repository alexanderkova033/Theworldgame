import { FARM_BUILD_DAYS, FARM_COST, FARM_WOOD_COST } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import type { GameState } from "../../domain/country/types";
import type { Project } from "../../domain/construction/types";

export function buildFarm(state: GameState, provinceId: string): GameState {
  if (!canAfford(state.stats, FARM_COST)) return state;
  if (!canAffordResource(state.resources, "wood", FARM_WOOD_COST)) return state;

  const project: Project = {
    id: generateId("project"),
    type: "farm",
    label: "Farm",
    totalDays: FARM_BUILD_DAYS,
    daysRemaining: FARM_BUILD_DAYS,
    provinceId,
  };

  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - FARM_COST },
    resources: deductResource(state.resources, "wood", FARM_WOOD_COST),
    projects: [...state.projects, project],
  };
}
