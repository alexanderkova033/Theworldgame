import { RESEARCH_POINTS_REQUIRED, RESEARCH_PROJECT_COST, RESEARCH_PROJECT_DAYS } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import type { Project } from "../../domain/construction/types";

// Starting a research project requires both enough accumulated research
// points (institutional capacity) and enough treasury (funding). Research
// points themselves are not spent — they represent an ongoing capability.
export function canStartResearch(state: GameState): boolean {
  return (
    canAfford(state.stats, RESEARCH_PROJECT_COST) &&
    state.stats.researchPoints >= RESEARCH_POINTS_REQUIRED
  );
}

export function startResearch(state: GameState, provinceId: string): GameState {
  if (!canStartResearch(state)) return state;

  const project: Project = {
    id: generateId("project"),
    type: "research",
    label: "Research Initiative",
    totalDays: RESEARCH_PROJECT_DAYS,
    daysRemaining: RESEARCH_PROJECT_DAYS,
    provinceId,
    treasuryCostPerDay: 0,
    resourceType: null,
    resourceCostPerDay: 0,
  };

  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - RESEARCH_PROJECT_COST },
    projects: [...state.projects, project],
  };
}
