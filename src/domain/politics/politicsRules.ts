// Popularity: where public opinion is heading, and how fast it gets there.
// The target is built from things the government actually controls — tax
// levels, whether people are fed, housed and warm, how orderly the country
// is — so support is earned (or lost) by how you govern, not handed out.
// The drift toward it is slow, so a popular law or a bruising decision is
// still felt months later rather than washing out within weeks.
import {
  COLD_POPULARITY_PENALTY,
  COMFORTABLE_TAX_RATE,
  FOOD_SHORTAGE_POPULARITY_PENALTY,
  HOMELESS_POPULARITY_PENALTY,
  POLITICAL_POWER_BASE_RATE,
  POLITICAL_POWER_PER_POPULARITY,
  POPULARITY_BASE_TARGET,
  POPULARITY_DRIFT_RATE,
  STABILITY_POPULARITY_WEIGHT,
  TAX_POPULARITY_PER_POINT,
  UNEMPLOYMENT_POPULARITY_PENALTY,
} from "../constants";
import { FACTIONS } from "../parties/factionData";
import type { Ideology } from "../parties/types";
import type { FactionUpdateResult } from "../parties/factionRules";
import { getWeightedPopularity } from "../parties/factionRules";

export interface PopularityConditions {
  taxRate: number;
  isFoodShortage: boolean;
  homelessShare: number; // 0..1
  unheatedShare: number; // 0..1
  unemploymentShare: number; // 0..1
  stability: number; // 0..100
}

export interface PopularityDriver {
  key: "taxes" | "food" | "homes" | "heat" | "jobs" | "order";
  label: string;
  value: number; // points added to (or taken off) where opinion is heading
}

// Each thing pulling opinion up or down, so the Politics tab can show why.
export function getPopularityDrivers(c: PopularityConditions): PopularityDriver[] {
  return [
    { key: "taxes", label: "Taxes", value: (COMFORTABLE_TAX_RATE - c.taxRate) * 100 * TAX_POPULARITY_PER_POINT },
    { key: "food", label: "Food", value: c.isFoodShortage ? -FOOD_SHORTAGE_POPULARITY_PENALTY : 0 },
    { key: "homes", label: "Homes", value: -c.homelessShare * HOMELESS_POPULARITY_PENALTY },
    { key: "heat", label: "Heating", value: -c.unheatedShare * COLD_POPULARITY_PENALTY },
    { key: "jobs", label: "Jobs", value: -c.unemploymentShare * UNEMPLOYMENT_POPULARITY_PENALTY },
    { key: "order", label: "Order", value: (c.stability - 50) * STABILITY_POPULARITY_WEIGHT },
  ];
}

export function getPopularityTarget(c: PopularityConditions): number {
  const total = getPopularityDrivers(c).reduce((sum, d) => sum + d.value, POPULARITY_BASE_TARGET);
  return Math.min(95, Math.max(5, total));
}

// Daily drift toward the target, applied per-faction — every faction drifts
// toward the same shared target, so this doesn't widen or narrow the
// coalition on its own; only laws/research/decisions and campaign moves do
// that (see factionRules.ts).
export function updateFactionPopularity(
  factionApproval: Record<Ideology, number>,
  weights: Record<Ideology, number>,
  targetPopularity: number,
  penalty = 0,
): FactionUpdateResult {
  const nextApproval = {} as Record<Ideology, number>;
  for (const faction of FACTIONS) {
    const drift = (targetPopularity - factionApproval[faction]) * POPULARITY_DRIFT_RATE;
    nextApproval[faction] = Math.min(100, Math.max(0, factionApproval[faction] + drift - penalty));
  }
  return { factionApproval: nextApproval, popularity: getWeightedPopularity(nextApproval, weights) };
}

// Political power is the currency Laws spend (LawEnactCost.politicalPower).
// A popular government has more capital to spend: at 50% popularity this is
// 0.8/day, a tier-1 law roughly every month of saving.
export function calculateDailyPoliticalPower(popularity: number): number {
  return POLITICAL_POWER_BASE_RATE + Math.max(0, popularity) * POLITICAL_POWER_PER_POPULARITY;
}
