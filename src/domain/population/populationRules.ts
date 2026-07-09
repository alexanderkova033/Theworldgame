// Population slowly grows when food and stability are healthy, and declines
// during famine (when the food stock has hit zero).
import type { CountryStats } from "../country/types";
import { POPULATION_FAMINE_DECLINE_RATE, POPULATION_GROWTH_RATE } from "../constants";

export function updatePopulation(stats: CountryStats, isFoodShortage: boolean): number {
  let growthRate: number;

  if (isFoodShortage) {
    growthRate = -POPULATION_FAMINE_DECLINE_RATE;
  } else {
    growthRate = POPULATION_GROWTH_RATE * (stats.stability / 100);
  }

  const change = stats.population * growthRate;
  return Math.max(0, stats.population + change);
}
