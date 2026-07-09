import { ROAD_BUILD_DAYS, ROAD_COST, ROAD_ORE_COST } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import type { GameState } from "../../domain/country/types";
import type { Project } from "../../domain/construction/types";

export function buildRoad(state: GameState, provinceId: string): GameState {
  if (!canAfford(state.stats, ROAD_COST)) return state;
  if (!canAffordResource(state.resources, "ore", ROAD_ORE_COST)) return state;

  const project: Project = {
    id: generateId("project"),
    type: "road",
    label: "Road",
    totalDays: ROAD_BUILD_DAYS,
    daysRemaining: ROAD_BUILD_DAYS,
    provinceId,
  };

  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - ROAD_COST },
    resources: deductResource(state.resources, "ore", ROAD_ORE_COST),
    projects: [...state.projects, project],
  };
}
