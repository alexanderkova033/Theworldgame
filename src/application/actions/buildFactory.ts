import { FACTORY_BUILD_DAYS, FACTORY_COST } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import type { Project } from "../../domain/construction/types";

export function buildFactory(state: GameState): GameState {
  if (!canAfford(state.stats, FACTORY_COST)) return state;

  const project: Project = {
    id: generateId("project"),
    type: "factory",
    label: "Factory",
    totalDays: FACTORY_BUILD_DAYS,
    daysRemaining: FACTORY_BUILD_DAYS,
  };

  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - FACTORY_COST },
    projects: [...state.projects, project],
  };
}
