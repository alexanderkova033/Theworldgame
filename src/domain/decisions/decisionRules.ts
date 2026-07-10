import { DECISIONS } from "./decisionData";
import type { DecisionDefinition } from "./types";

export function pickRandomDecision(): DecisionDefinition {
  const index = Math.floor(Math.random() * DECISIONS.length);
  return DECISIONS[index];
}

export function getDecision(id: string): DecisionDefinition | undefined {
  return DECISIONS.find((d) => d.id === id);
}
