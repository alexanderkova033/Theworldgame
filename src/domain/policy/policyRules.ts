// The country's rules as bent by everything in force right now: finished
// technologies (scaled by how well each turned out), laws, the governing
// party's creed, the nation's own character, and law+technology pairs.
// Every rule that a modifier changes reads it from here.
import type { GameState } from "../country/types";
import { LAW_NODES } from "../laws/lawData";
import { getNationEffects } from "../nations/nationEffects";
import { getParty } from "../parties/partyRules";
import { RESEARCH_NODES } from "../research/researchData";
import { getResearchOutcomeFactor } from "../research/researchOutcomes";
import { getActiveSynergies } from "../synergy/synergyRules";
import { addModifiers, neutralModifiers, type Modifiers } from "./modifiers";
import { getDifficulty } from "../difficulty/difficultyData";
import type { BurdenId } from "../reign/reignData";
import { getBurdenEffects } from "../reign/reignRules";

export function getModifiers(
  state: Pick<GameState, "enactedLawIds" | "enactedResearchIds" | "researchOutcomes" | "partyId" | "nationId" | "difficulty"> & { burdens?: BurdenId[] },
): Modifiers {
  let mods = neutralModifiers();
  for (const node of RESEARCH_NODES) {
    if (state.enactedResearchIds.includes(node.id)) mods = addModifiers(mods, node.effects, getResearchOutcomeFactor(state.researchOutcomes[node.id]));
  }
  for (const node of LAW_NODES) {
    if (state.enactedLawIds.includes(node.id)) mods = addModifiers(mods, node.effects);
  }
  mods = addModifiers(mods, getParty(state.partyId).creed);
  mods = addModifiers(mods, getNationEffects(state.nationId));
  for (const synergy of getActiveSynergies(state.enactedLawIds, state.enactedResearchIds)) mods = addModifiers(mods, synergy.effects);
  // A Long Reign's burdens of office (domain/reign).
  if (state.burdens?.length) mods = addModifiers(mods, getBurdenEffects(state.burdens));
  // The difficulty level sets how fast political power comes (domain/difficulty).
  mods = { ...mods, politicalPowerMultiplier: mods.politicalPowerMultiplier * getDifficulty(state.difficulty).politicalPowerMultiplier };
  return mods;
}
