import { ROAD_BUILD_DAYS, ROAD_COST } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import type { Project } from "../../domain/construction/types";

export function buildRoad(state: GameState, provinceId: string): GameState {
  if (!canAfford(state.stats, ROAD_COST)) return state;

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
    projects: [...state.projects, project],
  };
}
