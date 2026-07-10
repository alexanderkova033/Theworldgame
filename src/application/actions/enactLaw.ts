import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { canEnactLaw, getEffectivePassChance, getLawNode } from "../../domain/laws/lawsRules";

export { canEnactLaw };

// A one-time gut-punch for a failed vote — not enough to be devastating, but
// enough that spamming failed votes has a real cost.
const FAILED_VOTE_POPULARITY_PENALTY = 5;

// Enacting a law is now a vote, not a guarantee (see getEffectivePassChance).
// On a "yes," it applies its one-time deltas immediately and is remembered
// forever in enactedLawIds — there is no repeal action. On a "no," nothing
// about the law takes effect and the node stays open to try again later;
// only the popularity hit for the failed attempt is permanent.
export function enactLaw(state: GameState, lawId: string): GameState {
  if (!canEnactLaw(state, lawId)) return state;
  const law = getLawNode(lawId);
  if (!law) return state;

  const passChance = getEffectivePassChance(state, law);
  const passed = Math.random() < passChance;

  if (!passed) {
    return {
      ...state,
      stats: {
        ...state.stats,
        popularity: Math.min(100, Math.max(0, state.stats.popularity - FAILED_VOTE_POPULARITY_PENALTY)),
      },
      events: [
        {
          id: generateId("event"),
          date: state.date,
          message: `${law.name} fails to pass — the vote falls short, and the opposition makes the most of it.`,
          severity: "warning",
        },
        ...state.events,
      ],
    };
  }

  const { effects } = law;
  return {
    ...state,
    enactedLawIds: [...state.enactedLawIds, lawId],
    stats: {
      ...state.stats,
      treasury: state.stats.treasury + (effects.treasuryDelta ?? 0),
      food: Math.max(0, state.stats.food + (effects.foodDelta ?? 0)),
      stability: Math.min(100, Math.max(0, state.stats.stability + (effects.stabilityDelta ?? 0))),
      population: Math.max(0, state.stats.population + (effects.populationDelta ?? 0)),
      popularity: Math.min(100, Math.max(0, state.stats.popularity + (effects.popularityDelta ?? 0))),
    },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `${law.name} passes: ${law.description}`,
        severity: "info",
      },
      ...state.events,
    ],
  };
}
