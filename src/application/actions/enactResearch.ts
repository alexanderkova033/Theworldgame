import { FAILED_RESEARCH_VOTE_POPULARITY_PENALTY } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { applyFactionEffects, applyUniformDelta, getFactionWeights } from "../../domain/parties/factionRules";
import { deductResource } from "../../domain/resources/resourceRules";
import { canEnactResearch, getEffectivePassChance, getResearchNode, rollResearchOutcome, scaleResearchEffects } from "../../domain/research/researchRules";

export { canEnactResearch };

// A vote, exactly like enactLaw.ts: on a "yes" the node's one-time deltas
// apply immediately and it's remembered forever in enactedResearchIds; on a
// "no" nothing takes effect and the node stays open to try again, only a
// (smaller than a failed law vote — see the constant) popularity dent stays.
export function enactResearch(state: GameState, researchId: string): GameState {
  if (!canEnactResearch(state, researchId)) return state;
  const node = getResearchNode(researchId);
  if (!node) return state;

  const passChance = getEffectivePassChance(state, node);
  const passed = Math.random() < passChance;
  const weights = getFactionWeights(state.nationId);

  if (!passed) {
    const { factionApproval, popularity } = applyUniformDelta(state.factionApproval, weights, -FAILED_RESEARCH_VOTE_POPULARITY_PENALTY);
    return {
      ...state,
      factionApproval,
      stats: { ...state.stats, popularity },
      events: [
        {
          id: generateId("event"),
          date: state.date,
          message: `${node.name} fails to win backing — the trial funding lapses, for now.`,
          severity: "warning",
        },
        ...state.events,
      ],
    };
  }

  // The vote passing only means the funding and the mandate are there — how
  // well it actually turns out is still down to chance. Rolled once and
  // stored (GameState.researchOutcomes) so the scaled effect is what
  // getActiveResearchEffects uses every day after, not just today.
  const outcome = rollResearchOutcome();
  const effects = scaleResearchEffects(node.effects, outcome.factor);
  const { factionApproval, popularity } = applyFactionEffects(state.factionApproval, weights, effects, effects.popularityDelta ?? 0);
  // The funding cost is fixed regardless of how the trial turned out — only
  // the node's own effects scale with the rolled outcome (see scaleResearchEffects).
  const { enactCost } = node;
  const resources = enactCost.resourceType
    ? deductResource(state.resources, enactCost.resourceType, enactCost.resourceAmount ?? 0)
    : state.resources;

  return {
    ...state,
    enactedResearchIds: [...state.enactedResearchIds, researchId],
    researchOutcomes: { ...state.researchOutcomes, [researchId]: outcome.tier },
    factionApproval,
    resources,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury - enactCost.treasury + (effects.treasuryDelta ?? 0),
      researchPoints: Math.max(0, state.stats.researchPoints - enactCost.researchPoints),
      food: Math.max(0, state.stats.food + (effects.foodDelta ?? 0)),
      stability: Math.min(100, Math.max(0, state.stats.stability + (effects.stabilityDelta ?? 0))),
      population: Math.max(0, state.stats.population + (effects.populationDelta ?? 0)),
      popularity,
    },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `${node.name} is adopted: ${outcome.flavor}.`,
        severity: "info",
      },
      ...state.events,
    ],
  };
}
