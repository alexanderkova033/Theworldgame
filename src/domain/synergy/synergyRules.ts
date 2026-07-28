import { SYNERGIES, type Synergy } from "./synergyData";

// A synergy pair naming this law node, if any — used by LawsPanel to show
// the potential/active bonus in the inspector.
export function getSynergiesForLaw(lawId: string): Synergy[] {
  return SYNERGIES.filter((s) => s.lawId === lawId);
}

// Same, from the Research side — used by ResearchPanel.
export function getSynergiesForResearch(researchId: string): Synergy[] {
  return SYNERGIES.filter((s) => s.researchId === researchId);
}

function getActiveSynergies(enactedLawIds: string[], enactedResearchIds: string[]): Synergy[] {
  return SYNERGIES.filter((s) => enactedLawIds.includes(s.lawId) && enactedResearchIds.includes(s.researchId));
}

// Ongoing multipliers from every currently-active synergy, composed the same
// way getActiveLawEffects/getActiveResearchEffects fold their own nodes
// together — see simulateDay.ts, which multiplies this in alongside both.
export function getActiveSynergyEffects(enactedLawIds: string[], enactedResearchIds: string[]): { incomeMultiplier: number; industryMultiplier: number } {
  let incomeMultiplier = 1;
  let industryMultiplier = 1;
  for (const synergy of getActiveSynergies(enactedLawIds, enactedResearchIds)) {
    incomeMultiplier *= synergy.effects.incomeMultiplier ?? 1;
    industryMultiplier *= synergy.effects.industryMultiplier ?? 1;
  }
  return { incomeMultiplier, industryMultiplier };
}
