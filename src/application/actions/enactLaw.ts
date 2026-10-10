import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { canEnactLaw, getEffectivePassChance, getLawDays, getLawNode } from "../../domain/laws/lawsRules";
import { applyFactionEffects, applyUniformDelta, getFactionWeights } from "../../domain/parties/factionRules";
import { deductResource } from "../../domain/resources/resourceRules";
import { ONE_OFF, recordAction } from "./recordAction";

export { canEnactLaw };

// A one-time gut-punch for a failed vote — not enough to be devastating, but
// enough that spamming failed votes has a real cost.
const FAILED_VOTE_POPULARITY_PENALTY = 5;

// Proposing a law is a vote, not a guarantee (see getEffectivePassChance).
// On a "yes," its treasury/political power/resource cost is paid right away
// and it goes into drafting (GameState.activeLaw) — it only takes effect
// once that finishes, see completeLaw below. On a "no," nothing is spent and
// the node stays open to try again later; only the popularity hit for the
// failed attempt is permanent.
export function enactLaw(state: GameState, lawId: string): GameState {
  if (!canEnactLaw(state, lawId)) return state;
  const law = getLawNode(lawId);
  if (!law) return state;

  const passChance = getEffectivePassChance(state, law);
  const passed = Math.random() < passChance;

  if (!passed) {
    const weights = getFactionWeights(state.nationId);
    const { factionApproval, popularity } = applyUniformDelta(state.factionApproval, weights, -FAILED_VOTE_POPULARITY_PENALTY);
    return recordAction(state, {
      ...state,
      factionApproval,
      stats: { ...state.stats, popularity },
      events: [
        {
          id: generateId("event"),
          date: state.date,
          message: `${law.name} fails to pass — the vote falls short, and the opposition makes the most of it.`,
          severity: "warning",
        },
        ...state.events,
      ],
    }, ONE_OFF);
  }

  const { enactCost } = law;
  const days = getLawDays(law);
  return recordAction(state, {
    ...state,
    activeLaw: { nodeId: lawId, totalDays: days, daysRemaining: days },
    resources: enactCost.resourceType ? deductResource(state.resources, enactCost.resourceType, enactCost.resourceAmount ?? 0) : state.resources,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury - enactCost.treasury,
      politicalPower: state.stats.politicalPower - enactCost.politicalPower,
    },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `${law.name} passes the vote — it comes into force in ${days} days.`,
        severity: "info",
      },
      ...state.events,
    ],
  }, ONE_OFF);
}

// Drafting finished: the law's one-time deltas apply now and it's remembered
// forever in enactedLawIds — there is no repeal action. Called from the
// daily tick (see application/advancePolicies.ts), never by the player.
export function completeLaw(state: GameState, lawId: string): GameState {
  const law = getLawNode(lawId);
  if (!law) return state;

  const { effects } = law;
  const weights = getFactionWeights(state.nationId);
  const { factionApproval, popularity } = applyFactionEffects(state.factionApproval, weights, effects, effects.popularityDelta ?? 0);
  return {
    ...state,
    enactedLawIds: [...state.enactedLawIds, lawId],
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
        message: `${law.name} comes into force: ${law.description}`,
        severity: "info",
      },
      ...state.events,
    ],
  };
}
