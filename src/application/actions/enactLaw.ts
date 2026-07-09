import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { canEnactLaw, getLawDefinition } from "../../domain/laws/lawsRules";

export { canEnactLaw };

// Enacting a law is permanent: it applies its one-time deltas immediately and
// is remembered forever in enactedLawIds — there is no repeal action.
export function enactLaw(state: GameState, lawId: string): GameState {
  if (!canEnactLaw(state, lawId)) return state;
  const law = getLawDefinition(lawId);
  if (!law) return state;

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
    },
    events: [
      {
        id: generateId("event"),
        date: state.date,
        message: `${law.name} enacted: ${law.description}`,
        severity: "warning",
      },
      ...state.events,
    ],
  };
}
