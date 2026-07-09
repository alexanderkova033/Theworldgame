// Food production and consumption. Population eats every day; farms are the
// only source of new food in the MVP.
import type { CountryStats } from "../country/types";
import { FOOD_PER_FARM, FOOD_PER_POP_CONSUMPTION } from "../constants";

export function produceFood(farmCount: number): number {
  return farmCount * FOOD_PER_FARM;
}

export function consumeFood(stats: CountryStats): number {
  return stats.population * FOOD_PER_POP_CONSUMPTION;
}

export interface FoodUpdateResult {
  newFoodStock: number;
  isShortage: boolean;
}

export function updateFood(stats: CountryStats, farmCount: number): FoodUpdateResult {
  const produced = produceFood(farmCount);
  const consumed = consumeFood(stats);
  const rawStock = stats.food + produced - consumed;
  return {
    newFoodStock: Math.max(0, rawStock),
    isShortage: rawStock < 0,
  };
}
