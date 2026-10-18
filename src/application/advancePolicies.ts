// Use case: one day of work on whatever Law is being drafted
// (GameState.activeLaw) and on each research area's chosen direction
// (GameState.researchFocus). Anything that finishes takes effect — see
// completeLaw / completeResearch.
import type { GameState, PolicyInProgress } from "../domain/country/types";
import { getResearchCost, getResearchNode, getResearchRates } from "../domain/research/researchRules";
import { RESEARCH_CATEGORIES } from "../domain/workforce/workforceRules";
import { completeLaw } from "./actions/enactLaw";
import { announceReopenedPaths, completeResearch } from "./actions/researchActions";

function tick(work: PolicyInProgress): PolicyInProgress {
  return { ...work, daysRemaining: work.daysRemaining - 1 };
}

export function advancePolicies(state: GameState): GameState {
  let next = state;

  if (next.activeLaw) {
    const law = tick(next.activeLaw);
    next = law.daysRemaining <= 0 ? completeLaw({ ...next, activeLaw: null }, law.nodeId) : { ...next, activeLaw: law };
  }

  // An area with no direction chosen simply idles — the panel flags it.
  const rates = getResearchRates(next);
  for (const category of RESEARCH_CATEGORIES) {
    const nodeId = next.researchFocus[category];
    const node = nodeId ? getResearchNode(nodeId) : undefined;
    if (!node) continue;
    const progress = (next.researchProgress[node.id] ?? 0) + rates[category];
    next = { ...next, researchProgress: { ...next.researchProgress, [node.id]: progress } };
    if (progress >= getResearchCost(node)) next = completeResearch(next, node.id);
  }

  return announceReopenedPaths(next);
}
