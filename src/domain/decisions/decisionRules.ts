import {
  DECISION_CHANCE_PER_MONTH,
  DECISION_REPEAT_COOLDOWN,
  SITUATIONAL_DECISION_CHANCE_PER_MONTH,
  SITUATIONAL_DECISION_SHARE,
} from "../constants";
import { isFeatureOpen } from "../chapters/chapterData";
import type { GameState } from "../country/types";
import { DECISIONS } from "./decisionData";
import type { DecisionDefinition } from "./types";

// Letters about a system not yet open are held back (see DecisionDefinition.needs).
function isOpen(state: GameState, decision: DecisionDefinition): boolean {
  return !decision.needs || isFeatureOpen(state, decision.needs);
}

function recentlyAnswered(state: GameState): string[] {
  return state.decisionHistory.slice(0, DECISION_REPEAT_COOLDOWN).map((entry) => entry.decisionId);
}

// The situational decisions whose trouble the country is in right now.
export function getApplicableSituationalDecisions(state: GameState): DecisionDefinition[] {
  const recent = recentlyAnswered(state);
  return DECISIONS.filter((d) => d.condition !== undefined && isOpen(state, d) && !recent.includes(d.id) && d.condition(state));
}

// Trouble at home makes a decision likelier this month.
export function getDecisionChance(state: GameState): number {
  return getApplicableSituationalDecisions(state).length > 0 ? SITUATIONAL_DECISION_CHANCE_PER_MONTH : DECISION_CHANCE_PER_MONTH;
}

// Situational decisions that apply win most picks; otherwise (or the rest
// of the time) any of the generic ones.
export function pickDecision(state: GameState): DecisionDefinition {
  const situational = getApplicableSituationalDecisions(state);
  if (situational.length > 0 && Math.random() < SITUATIONAL_DECISION_SHARE) {
    return situational[Math.floor(Math.random() * situational.length)];
  }
  const recent = recentlyAnswered(state);
  const generic = DECISIONS.filter((d) => d.condition === undefined && isOpen(state, d) && !recent.includes(d.id));
  return generic[Math.floor(Math.random() * generic.length)];
}

export function getDecision(id: string): DecisionDefinition | undefined {
  return DECISIONS.find((d) => d.id === id);
}
