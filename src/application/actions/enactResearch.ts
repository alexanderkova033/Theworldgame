import { FAILED_RESEARCH_VOTE_POPULARITY_PENALTY } from "../../domain/constants";
import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { applyFactionEffects, applyUniformDelta, getFactionWeights } from "../../domain/parties/factionRules";
import { deductResource } from "../../domain/resources/resourceRules";
import {
  canEnactResearch,
  getEffectivePassChance,
  getResearchDays,
  getResearchNode,
  rollResearchOutcome,
  scaleResearchEffects,
} from "../../domain/research/researchRules";

export { canEnactResearch };

// A vote, exactly like enactLaw.ts: on a "yes" the funding is paid and the
// node goes into the lab (GameState.activeResearch) — it takes effect once
// that finishes, see completeResearch below. On a "no" nothing is spent and
// the node stays open to try again, only a (smaller than a failed law vote —
// see the constant) popularity dent stays.
export function enactResearch(state: GameState, researchId: string): GameState {
  if (!canEnactResearch(state, researchId)) return state;
  const node = getResearchNode(researchId);
  if (!node) return state;

  const passChance = getEffectivePassChance(state, node);
  const passed = Math.random() < passChance;

  if (!passed) {
    const weights = getFactionWeights(state.nationId);
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

  const { enactCost } = node;
  const days = getResearchDays(node);
  return {
    ...state,
    activeResearch: { nodeId: researchId, totalDays: days, daysRemaining: days },
    resources: enactCost.resourceType ? deductResource(state.resources, enactCost.resourceType, enactCost.resourceAmount ?? 0) : state.resources,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury - enactCost.treasury,
      researchPoints: Math.max(0, state.stats.researchPoints - enactCost.researchPoints),
    },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `${node.name} is funded — results expected in ${days} days.`,
        severity: "info",
      },
      ...state.events,
    ],
  };
}

// The lab work is done. How well it actually turned out is still down to
// chance: rolled once here and stored (GameState.researchOutcomes) so the
// scaled effect is what getActiveResearchEffects uses every day after, not
// just today. Called from the daily tick (see application/advancePolicies.ts).
export function completeResearch(state: GameState, researchId: string): GameState {
  const node = getResearchNode(researchId);
  if (!node) return state;

  const outcome = rollResearchOutcome();
  const effects = scaleResearchEffects(node.effects, outcome.factor);
  const weights = getFactionWeights(state.nationId);
  const { factionApproval, popularity } = applyFactionEffects(state.factionApproval, weights, effects, effects.popularityDelta ?? 0);

  return {
    ...state,
    enactedResearchIds: [...state.enactedResearchIds, researchId],
    researchOutcomes: { ...state.researchOutcomes, [researchId]: outcome.tier },
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
        message: `${node.name} is adopted: ${outcome.flavor}.`,
        severity: "info",
      },
      ...state.events,
    ],
  };
}
