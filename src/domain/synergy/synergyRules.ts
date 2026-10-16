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

// Every pair whose law and technology are both in force; their effects are
// folded in with everything else in domain/policy/policyRules.ts.
export function getActiveSynergies(enactedLawIds: string[], enactedResearchIds: string[]): Synergy[] {
  return SYNERGIES.filter((s) => enactedLawIds.includes(s.lawId) && enactedResearchIds.includes(s.researchId));
}

// How much of a pair is in force: 0, 1 or 2 halves, like the pieces of a
// set. Shown on both trees, so the missing half is easy to spot.
export function getPairHeld(synergy: Synergy, enactedLawIds: string[], enactedResearchIds: string[]): number {
  return Number(enactedLawIds.includes(synergy.lawId)) + Number(enactedResearchIds.includes(synergy.researchId));
}
