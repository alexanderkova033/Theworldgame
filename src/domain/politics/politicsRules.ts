// Tax policy and government popularity. Taxes above a "comfortable" rate
// pull popularity down over time; popularity drifts toward that target daily.
import { COMFORTABLE_TAX_RATE, POPULARITY_DRIFT_RATE } from "../constants";
import { FACTIONS } from "../parties/factionData";
import type { Ideology } from "../parties/types";
import type { FactionUpdateResult } from "../parties/factionRules";
import { getWeightedPopularity } from "../parties/factionRules";

// Daily drift toward a tax-derived target, same formula as before but
// applied per-faction — every faction drifts toward the same shared target
// (tax comfort isn't ideology-specific, at least not yet), so this doesn't
// widen or narrow the coalition on its own, only laws/research/decisions
// and campaign moves do that (see factionRules.ts).
export function updateFactionPopularity(
  factionApproval: Record<Ideology, number>,
  weights: Record<Ideology, number>,
  taxRate: number,
  debtPenalty = 0,
): FactionUpdateResult {
  const excessTax = Math.max(0, taxRate - COMFORTABLE_TAX_RATE);
  const targetPopularity = 70 - excessTax * 100;

  const nextApproval = {} as Record<Ideology, number>;
  for (const faction of FACTIONS) {
    const drift = (targetPopularity - factionApproval[faction]) * POPULARITY_DRIFT_RATE;
    nextApproval[faction] = Math.min(100, Math.max(0, factionApproval[faction] + drift - debtPenalty));
  }
  return { factionApproval: nextApproval, popularity: getWeightedPopularity(nextApproval, weights) };
}
