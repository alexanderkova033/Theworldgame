import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { describePolicyImpact } from "../describePolicyImpact";
import { applyFactionEffects, getFactionWeights } from "../../domain/parties/factionRules";
import { canFocusResearch as canFocusOn, getOnlyNextStep, getPathReopenDate, getResearchNode, isPathCapstone, rollResearchOutcome, scaleOneTimeEffects } from "../../domain/research/researchRules";
import { RESEARCH_PATHS } from "../../domain/research/researchData";
import { dayNumber } from "../../domain/country/calendar";
import type { ResearchCategory } from "../../domain/research/types";
import { isFeatureOpen } from "../../domain/chapters/chapterData";

// Research must be open (see domain/chapters) as well as the step itself.
export function canFocusResearch(state: GameState, researchId: string): boolean {
  return isFeatureOpen(state, "research") && canFocusOn(state, researchId);
}

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
    // A capstone finishes its path; a year on, the area may take up another.
    researchPathsFinished: isPathCapstone(node) ? { ...state.researchPathsFinished, [node.path!]: state.date } : state.researchPathsFinished,
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
        tier: outcome.tier,
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
    message: `${node.name} is complete, ${outcome.flavor}: ${impact}. ${following ? `Work moves on to ${following.name}.` : isPathCapstone(node) ? pathFinishedNote(next, node.category, node.path!) : `Pick the next direction for ${node.category} research.`}`,
  };
  return next;
}

// What a finished path leaves its area: another path in a year, unless all
// three are done.
function pathFinishedNote(state: GameState, category: ResearchCategory, pathKey: string): string {
  const path = RESEARCH_PATHS.find((p) => p.key === pathKey)!;
  const left = RESEARCH_PATHS.filter((p) => p.category === category && !(p.key in state.researchPathsFinished));
  if (left.length === 0) return `Every ${category} path is now finished.`;
  return `The ${path.name} path is finished. A year from now, ${category} research can take up one of the paths it passed over.`;
}

// The day a finished path reopens its area: say which paths it may take up.
export function announceReopenedPaths(state: GameState): GameState {
  const today = dayNumber(state.date);
  let next = state;
  for (const key of Object.keys(state.researchPathsFinished)) {
    const reopens = getPathReopenDate(state, key);
    if (!reopens || dayNumber(reopens) !== today) continue;
    const category = RESEARCH_PATHS.find((p) => p.key === key)!.category;
    const left = RESEARCH_PATHS.filter((p) => p.category === category && !(p.key in state.researchPathsFinished));
    if (left.length === 0) continue;
    const area = category.charAt(0).toUpperCase() + category.slice(1);
    next = {
      ...next,
      events: [
        {
          id: generateId("event"),
          date: state.date,
          message: `${area} research can take up a new path: ${left.map((p) => p.name).join(" or ")}.`,
          severity: "info",
          topic: "research",
        },
        ...next.events,
      ],
    };
  }
  return next;
}
