import { FACTORY_BUILD_DAYS, FACTORY_COST, FACTORY_ORE_COST } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import type { GameState } from "../../domain/country/types";
import type { Project } from "../../domain/construction/types";

export function buildFactory(state: GameState, provinceId: string): GameState {
  if (!canAfford(state.stats, FACTORY_COST)) return state;
  if (!canAffordResource(state.resources, "ore", FACTORY_ORE_COST)) return state;

  const project: Project = {
    id: generateId("project"),
    type: "factory",
    label: "Factory",
    totalDays: FACTORY_BUILD_DAYS,
    daysRemaining: FACTORY_BUILD_DAYS,
    provinceId,
  };

  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - FACTORY_COST },
    resources: deductResource(state.resources, "ore", FACTORY_ORE_COST),
    projects: [...state.projects, project],
  };
}
