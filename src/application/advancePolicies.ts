// Use case: one day of work on whatever Law is being drafted and whatever
// Research is in the lab (GameState.activeLaw / activeResearch). When either
// runs out of days it takes effect — see completeLaw / completeResearch.
import type { GameState, PolicyInProgress } from "../domain/country/types";
import { completeLaw } from "./actions/enactLaw";
import { completeResearch } from "./actions/enactResearch";

function tick(work: PolicyInProgress): PolicyInProgress {
  return { ...work, daysRemaining: work.daysRemaining - 1 };
}

export function advancePolicies(state: GameState): GameState {
  let next = state;

  if (next.activeLaw) {
    const law = tick(next.activeLaw);
    next = law.daysRemaining <= 0 ? completeLaw({ ...next, activeLaw: null }, law.nodeId) : { ...next, activeLaw: law };
  }

  if (next.activeResearch) {
    const research = tick(next.activeResearch);
    next = research.daysRemaining <= 0 ? completeResearch({ ...next, activeResearch: null }, research.nodeId) : { ...next, activeResearch: research };
  }

  return next;
}
