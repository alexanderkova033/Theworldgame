// Hiring and letting go of salaried staff. Hiring costs a one-off fee and
// commits you to a daily salary (paid in simulateDay); letting someone go
// is free and immediate.
import { POLICE_HIRE_COST, SCIENTIST_HIRE_COST } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import type { ResearchCategory } from "../../domain/research/types";
import { getPoliceCap, getScientistCap, getTotalScientists } from "../../domain/workforce/workforceRules";
import { recordAction } from "./recordAction";

export function canHireScientist(state: GameState): boolean {
  return state.stats.treasury >= SCIENTIST_HIRE_COST && getTotalScientists(state.workforce) < getScientistCap(state.educationLevel);
}

export function hireScientist(state: GameState, category: ResearchCategory): GameState {
  if (!canHireScientist(state)) return state;
  return recordAction(state, {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - SCIENTIST_HIRE_COST },
    workforce: { ...state.workforce, scientists: { ...state.workforce.scientists, [category]: state.workforce.scientists[category] + 1 } },
  }, { treasury: "salaries" });
}

export function dismissScientist(state: GameState, category: ResearchCategory): GameState {
  if (state.workforce.scientists[category] <= 0) return state;
  return {
    ...state,
    workforce: { ...state.workforce, scientists: { ...state.workforce.scientists, [category]: state.workforce.scientists[category] - 1 } },
  };
}

export function canHirePolice(state: GameState): boolean {
  return state.stats.treasury >= POLICE_HIRE_COST && state.workforce.police < getPoliceCap(state.stats.population);
}

export function hirePolice(state: GameState): GameState {
  if (!canHirePolice(state)) return state;
  return recordAction(state, {
    ...state,
    stats: { ...state.stats, treasury: state.stats.treasury - POLICE_HIRE_COST },
    workforce: { ...state.workforce, police: state.workforce.police + 1 },
  }, { treasury: "salaries" });
}

export function dismissPolice(state: GameState): GameState {
  if (state.workforce.police <= 0) return state;
  return { ...state, workforce: { ...state.workforce, police: state.workforce.police - 1 } };
}
