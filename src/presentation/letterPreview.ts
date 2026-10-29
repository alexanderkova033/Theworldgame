// What the answer under the pointer would do to the top bar's numbers: the
// letter (DecisionModal) sets it while an answer is pointed at or focused,
// and the ticker (ResourceTicker) marks each number it would move.
import { useSyncExternalStore } from "react";
import type { GameState } from "../domain/country/types";
import type { DecisionOption } from "../domain/decisions/types";
import { getFactionWeights } from "../domain/parties/factionData";
import { getWeightedPopularity } from "../domain/parties/factionRules";
import type { Ideology } from "../domain/parties/types";

export type PreviewMetric = "treasury" | "food" | "stability" | "population" | "support";
export type LetterPreview = Partial<Record<PreviewMetric, number>>;

let current: LetterPreview | null = null;
const listeners = new Set<() => void>();

export function setLetterPreview(preview: LetterPreview | null): void {
  current = preview;
  for (const listener of listeners) listener();
}

export function useLetterPreview(): LetterPreview | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

// An answer's change to each number: its own, and support through the
// groups it moves (as application/storyOutcome.ts applies them).
export function previewOf(state: GameState, option: DecisionOption): LetterPreview {
  const { effects, outcome } = option;
  let support = effects.popularityDelta ?? 0;
  if (outcome?.groups) {
    const weights = getFactionWeights(state.nationId);
    const after = { ...state.factionApproval };
    for (const [group, change] of Object.entries(outcome.groups) as Array<[Ideology, number]>) after[group] = Math.max(0, Math.min(100, after[group] + change));
    support += getWeightedPopularity(after, weights) - getWeightedPopularity(state.factionApproval, weights);
  }
  const preview: LetterPreview = {};
  if (effects.treasuryDelta) preview.treasury = effects.treasuryDelta;
  if (effects.foodDelta) preview.food = effects.foodDelta;
  if (effects.stabilityDelta) preview.stability = effects.stabilityDelta;
  if (effects.populationDelta) preview.population = effects.populationDelta;
  if (Math.abs(support) >= 0.05) preview.support = support;
  return preview;
}
