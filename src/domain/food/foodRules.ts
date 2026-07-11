// Food production and consumption. Population eats every day; farms are the
// primary source of new food in the MVP, with Granaries/Canneries (see
// produceProcessedFood below) as a research-gated secondary source that
// turns surplus Grain/Fish into food instead. A nation short on farms can
// also import food directly from the continental market (see importFood.ts)
// — cheaper with a coastal port, same idea as raw-resource trading.
import {
  FISH_PROCESSED_PER_CANNERY,
  FOOD_IMPORT_COST_PER_UNIT,
  FOOD_IMPORT_PORT_DISCOUNT,
  FOOD_PER_FARM,
  FOOD_PER_FISH,
  FOOD_PER_GRAIN,
  FOOD_PER_POP_CONSUMPTION,
  GRAIN_PROCESSED_PER_GRANARY,
} from "../constants";
import type { CountryStats } from "../country/types";
import type { Nation } from "../nations/types";
import { nationHasPort } from "../resources/tradeRules";
import type { ResourceBundle } from "../resources/types";

export function produceFood(farmCount: number): number {
  return farmCount * FOOD_PER_FARM;
}

export function consumeFood(stats: CountryStats): number {
  return stats.population * FOOD_PER_POP_CONSUMPTION;
}

export interface FoodProcessingResult {
  foodProduced: number;
  grainConsumed: number;
  fishConsumed: number;
}

// Granaries/Canneries process a capped amount of Grain/Fish per day (more
// buildings raise the cap), but never more than the nation actually has in
// stock — a Granary sitting idle on an empty silo just doesn't run today
// rather than going into debt on grain it doesn't have.
export function produceProcessedFood(granaryCount: number, canneryCount: number, resources: ResourceBundle): FoodProcessingResult {
  const grainConsumed = Math.min(granaryCount * GRAIN_PROCESSED_PER_GRANARY, resources.grain);
  const fishConsumed = Math.min(canneryCount * FISH_PROCESSED_PER_CANNERY, resources.fish);
  return {
    foodProduced: grainConsumed * FOOD_PER_GRAIN + fishConsumed * FOOD_PER_FISH,
    grainConsumed,
    fishConsumed,
  };
}

export interface FoodUpdateResult {
  newFoodStock: number;
  isShortage: boolean;
}

export function updateFood(stats: CountryStats, farmCount: number, extraFoodProduced = 0): FoodUpdateResult {
  const produced = produceFood(farmCount) + extraFoodProduced;
  const consumed = consumeFood(stats);
  const rawStock = stats.food + produced - consumed;
  return {
    newFoodStock: Math.max(0, rawStock),
    isShortage: rawStock < 0,
  };
}

export function getFoodImportCostPerUnit(nation: Nation): number {
  return nationHasPort(nation) ? FOOD_IMPORT_COST_PER_UNIT * FOOD_IMPORT_PORT_DISCOUNT : FOOD_IMPORT_COST_PER_UNIT;
}
