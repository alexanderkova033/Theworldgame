// Tax policy and government popularity. Taxes above a "comfortable" rate
// pull popularity down over time; popularity drifts toward that target daily.
import { COMFORTABLE_TAX_RATE, POLITICAL_POWER_BASE_RATE, POLITICAL_POWER_PER_POPULARITY, POPULARITY_DRIFT_RATE } from "../constants";
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

// Political power is the currency Laws spend (LawEnactCost.politicalPower).
// A popular government has more capital to spend: at 50% popularity this is
// 0.8/day, a tier-1 law roughly every month of saving.
export function calculateDailyPoliticalPower(popularity: number): number {
  return POLITICAL_POWER_BASE_RATE + Math.max(0, popularity) * POLITICAL_POWER_PER_POPULARITY;
}
