import { EDUCATION_BUILD_DAYS, EDUCATION_COST } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import type { Project } from "../../domain/construction/types";

export function investEducation(state: GameState): GameState {
  if (!canAfford(state.stats, EDUCATION_COST)) return state;

  const project: Project = {
    id: generateId("project"),
    type: "education",
    label: "Education Investment",
    totalDays: EDUCATION_BUILD_DAYS,
    daysRemaining: EDUCATION_BUILD_DAYS,
  };

  return {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - EDUCATION_COST },
    projects: [...state.projects, project],
  };
}
