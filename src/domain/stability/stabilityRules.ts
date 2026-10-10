// Stability reflects how well-ordered the country is. It suffers from food
// shortages and low popularity, and slowly recovers when things are going well.
import type { CountryStats } from "../country/types";
import {
  STABILITY_COLLAPSE_THRESHOLD,
  STABILITY_FOOD_SHORTAGE_PENALTY,
  STABILITY_GOOD_POPULARITY_THRESHOLD,
  STABILITY_LOW_POPULARITY_PENALTY,
  STABILITY_LOW_POPULARITY_THRESHOLD,
  STABILITY_RECOVERY_RATE,
} from "../constants";

// Today's push from hunger and from how popular the government is, kept
// apart so the monthly report can say which one it was.
export function getStabilityPressures(stats: CountryStats, isFoodShortage: boolean): { food: number; support: number } {
  let support = 0;
  if (stats.popularity < STABILITY_LOW_POPULARITY_THRESHOLD) support -= STABILITY_LOW_POPULARITY_PENALTY;
  if (!isFoodShortage && stats.popularity >= STABILITY_GOOD_POPULARITY_THRESHOLD) support += STABILITY_RECOVERY_RATE;
  return { food: isFoodShortage ? -STABILITY_FOOD_SHORTAGE_PENALTY : 0, support };
}

export function updateStability(stats: CountryStats, isFoodShortage: boolean, debtPenalty = 0): number {
  const { food, support } = getStabilityPressures(stats, isFoodShortage);
  const change = food + support - debtPenalty;
  return Math.min(100, Math.max(0, stats.stability + change));
}

export function isCollapseRisk(stats: CountryStats): boolean {
  return stats.stability <= STABILITY_COLLAPSE_THRESHOLD;
}
