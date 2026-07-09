import type { GameState } from "../country/types";
import { LAW_DEFINITIONS } from "./lawData";
import type { LawDefinition } from "./types";

export function getLawDefinition(lawId: string): LawDefinition | undefined {
  return LAW_DEFINITIONS.find((law) => law.id === lawId);
}

// Ongoing multipliers from every enacted law, composed together the same way
// road efficiency and the research bonus already are in simulateDay.
export function getActiveLawEffects(enactedLawIds: string[]): { incomeMultiplier: number; industryMultiplier: number } {
  let incomeMultiplier = 1;
  let industryMultiplier = 1;
  for (const lawId of enactedLawIds) {
    const law = getLawDefinition(lawId);
    if (!law) continue;
    incomeMultiplier *= law.effects.incomeMultiplier ?? 1;
    industryMultiplier *= law.effects.industryMultiplier ?? 1;
  }
  return { incomeMultiplier, industryMultiplier };
}

export function canEnactLaw(state: GameState, lawId: string): boolean {
  const law = getLawDefinition(lawId);
  if (!law) return false;
  return !state.enactedLawIds.some((enactedId) => getLawDefinition(enactedId)?.category === law.category);
}
