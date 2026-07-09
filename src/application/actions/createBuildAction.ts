// Every build action (buildFarm, buildFactory, buildRoad, ...) shares the
// same shape: spend treasury, spend a matching resource, queue a project.
// This factory captures that shape once so each action file is just its
// numbers, not a repeated implementation.
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import { canAffordResource, deductResource } from "../../domain/resources/resourceRules";
import type { GameState } from "../../domain/country/types";
import type { Project, ProjectType } from "../../domain/construction/types";
import type { ResourceType } from "../../domain/resources/types";

interface BuildActionConfig {
  type: ProjectType;
  label: string;
  cost: number;
  buildDays: number;
  resourceType: ResourceType;
  resourceCost: number;
}

export function createBuildAction(config: BuildActionConfig) {
  return function build(state: GameState, provinceId: string): GameState {
    if (!canAfford(state.stats, config.cost)) return state;
    if (!canAffordResource(state.resources, config.resourceType, config.resourceCost)) return state;

    const project: Project = {
      id: generateId("project"),
      type: config.type,
      label: config.label,
      totalDays: config.buildDays,
      daysRemaining: config.buildDays,
      provinceId,
    };

    return {
      ...state,
      stats: { ...state.stats, treasury: state.stats.treasury - config.cost },
      resources: deductResource(state.resources, config.resourceType, config.resourceCost),
      projects: [...state.projects, project],
    };
  };
}
