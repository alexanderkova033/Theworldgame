import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { describePolicyImpact } from "../describePolicyImpact";
import { applyFactionEffects, getFactionWeights } from "../../domain/parties/factionRules";
import { canFocusResearch, getOnlyNextStep, getResearchNode, rollResearchOutcome, scaleOneTimeEffects } from "../../domain/research/researchRules";
import type { ResearchCategory } from "../../domain/research/types";

export { canFocusResearch };

// Point a research area at a node. That's the whole decision — the area's
// buildings and scientists do the rest (see advancePolicies.ts). Switching
// to a different node keeps any progress already made on the old one.
export function focusResearch(state: GameState, researchId: string): GameState {
  if (!canFocusResearch(state, researchId)) return state;
  const node = getResearchNode(researchId);
  if (!node) return state;
  return { ...state, researchFocus: { ...state.researchFocus, [node.category]: researchId } };
}

export function clearResearchFocus(state: GameState, category: ResearchCategory): GameState {
  return { ...state, researchFocus: { ...state.researchFocus, [category]: null } };
}

// The work is done. How well it actually turned out is still down to
// chance: rolled once here and stored (GameState.researchOutcomes) so the
// scaled effect is what the shared modifiers use every day after, not
// just today. Called from the daily tick, never by the player.
export function completeResearch(state: GameState, researchId: string): GameState {
  const node = getResearchNode(researchId);
  if (!node) return state;

  const outcome = rollResearchOutcome();
  // The ongoing effects are scaled where they're read (domain/policy); the
  // one-time ones are scaled here, the day it's finished.
  const effects = { ...node.effects, ...scaleOneTimeEffects(node.effects, outcome.factor) };
  const weights = getFactionWeights(state.nationId);
  const { factionApproval, popularity } = applyFactionEffects(state.factionApproval, weights, effects, effects.popularityDelta ?? 0);

  const next: GameState = {
    ...state,
    enactedResearchIds: [...state.enactedResearchIds, researchId],
    researchOutcomes: { ...state.researchOutcomes, [researchId]: outcome.tier },
    researchFocus: { ...state.researchFocus, [node.category]: null },
    factionApproval,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury + (effects.treasuryDelta ?? 0),
      food: Math.max(0, state.stats.food + (effects.foodDelta ?? 0)),
      stability: Math.min(100, Math.max(0, state.stats.stability + (effects.stabilityDelta ?? 0))),
      population: Math.max(0, state.stats.population + (effects.populationDelta ?? 0)),
      popularity,
    },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: "",
        severity: "info",
        topic: "research",
      },
      ...state.events,
    ],
  };
  // What it changed, measured now that it's done (and scaled by the roll).
  const impact = describePolicyImpact(state, next, node.effects);
  // With only one way on, the area carries on by itself; a real choice
  // (three paths, or a fork) waits for the player.
  const following = getOnlyNextStep(next, researchId);
  if (following) next.researchFocus = { ...next.researchFocus, [node.category]: following.id };
  next.events[0] = {
    ...next.events[0],
    message: `${node.name} is complete, ${outcome.flavor}: ${impact}. ${following ? `Work moves on to ${following.name}.` : `Pick the next direction for ${node.category} research.`}`,
  };
  return next;
}
