import { generateId } from "../../domain/country/id";
import type { GameState } from "../../domain/country/types";
import { MAX_DECISION_HISTORY } from "../../domain/constants";
import { getDecision } from "../../domain/decisions/decisionRules";
import { applyFactionEffects, getFactionWeights } from "../../domain/parties/factionRules";
import { syncProvinces } from "../../domain/provinces/provincePopulation";
import { ONE_OFF, recordAction } from "./recordAction";

// Picking an option resolves the popup: applies that option's one-time
// deltas, logs it to history (for the Politics panel) and the event log,
// and clears pendingDecisionId so simulateDay can resume ticking.
export function resolveDecision(state: GameState, decisionId: string, optionId: string): GameState {
  if (state.pendingDecisionId !== decisionId) return state;
  const decision = getDecision(decisionId);
  if (!decision) return state;
  const option = decision.options.find((o) => o.id === optionId);
  if (!option) return state;

  const { effects } = option;
  const { factionApproval, popularity } = applyFactionEffects(
    state.factionApproval,
    getFactionWeights(state.nationId),
    effects,
    effects.popularityDelta ?? 0,
  );
  // A decision that moves people (an epidemic, cleared camps) moves them in every province.
  return syncProvinces(recordAction(state, {
    ...state,
    pendingDecisionId: null,
    decisionHistory: [
      { id: generateId("decision"), decisionId, optionId, date: state.date },
      ...state.decisionHistory,
    ].slice(0, MAX_DECISION_HISTORY),
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
        message: `${decision.title}: chose to "${option.label.toLowerCase()}."`,
        severity: "info",
      },
      ...state.events,
    ],
  }, ONE_OFF));
}

// Closing the popup without picking either option — the decision passes
// with no effect and no record. Used by the modal's own close (X)/Escape.
export function dismissDecision(state: GameState): GameState {
  if (!state.pendingDecisionId) return state;
  return { ...state, pendingDecisionId: null };
}
