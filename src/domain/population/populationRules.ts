// Population slowly grows when food and stability are healthy, and declines
// during famine (when the food stock has hit zero). Housing doesn't cap it —
// people keep arriving — but past what the homes can hold, growth slows (see
// HOMELESS_GROWTH_FACTOR), and an unheated winter costs lives.
import type { CountryStats } from "../country/types";
import {
  COLD_POPULATION_DECLINE_RATE,
  HOMELESS_GROWTH_FACTOR,
  POPULATION_FAMINE_DECLINE_RATE,
  POPULATION_GROWTH_RATE,
} from "../constants";

export function updatePopulation(stats: CountryStats, isFoodShortage: boolean, housingCapacity: number, unheatedShare = 0): number {
  let growthRate: number;

  if (isFoodShortage) {
    growthRate = -POPULATION_FAMINE_DECLINE_RATE;
  } else {
    growthRate = POPULATION_GROWTH_RATE * (stats.stability / 100);
    if (stats.population >= housingCapacity) growthRate *= HOMELESS_GROWTH_FACTOR;
  }
  growthRate -= unheatedShare * COLD_POPULATION_DECLINE_RATE;

  const change = stats.population * growthRate;
  return Math.max(0, stats.population + change);
}
