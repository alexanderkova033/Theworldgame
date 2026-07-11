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

export function updateStability(stats: CountryStats, isFoodShortage: boolean, debtPenalty = 0): number {
  let change = 0;

  if (isFoodShortage) {
    change -= STABILITY_FOOD_SHORTAGE_PENALTY;
  }
  if (stats.popularity < STABILITY_LOW_POPULARITY_THRESHOLD) {
    change -= STABILITY_LOW_POPULARITY_PENALTY;
  }
  if (!isFoodShortage && stats.popularity >= STABILITY_GOOD_POPULARITY_THRESHOLD) {
    change += STABILITY_RECOVERY_RATE;
  }
  change -= debtPenalty;

  return Math.min(100, Math.max(0, stats.stability + change));
}

export function isCollapseRisk(stats: CountryStats): boolean {
  return stats.stability <= STABILITY_COLLAPSE_THRESHOLD;
}
