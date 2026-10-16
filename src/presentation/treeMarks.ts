// What the law and research trees draw on a node beyond its status (see
// TechTree.tsx): a breakthrough, and how much of its pair is in force.
import type { Synergy } from "../domain/synergy/synergyData";
import { getPairHeld } from "../domain/synergy/synergyRules";

export interface NodeMarks {
  breakthrough?: boolean;
  pair?: { held: number; title: string }; // held: 0, 1 or 2 halves (see domain/synergy)
}

// A node's pair, if it has one, as a mark: how many halves are in force.
export function pairMarks(state: { enactedLawIds: string[]; enactedResearchIds: string[] }, synergies: Synergy[]): NodeMarks {
  const synergy = synergies[0];
  if (!synergy) return {};
  const held = getPairHeld(synergy, state.enactedLawIds, state.enactedResearchIds);
  return { pair: { held, title: held === 2 ? `${synergy.name}: active` : `${synergy.name}: ${held} of 2` } };
}
