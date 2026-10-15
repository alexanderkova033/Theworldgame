// Food production and consumption. Population eats every day; farms are the
// primary source of new food in the MVP, with Granaries/Canneries (see
// produceProcessedFood below) as a research-gated secondary source that
// turns surplus Grain/Fish into food instead. A nation short on farms can
// also buy food on the continental market (see domain/market).
import {
  FISH_PROCESSED_PER_CANNERY,
  FARM_SEASON_MULTIPLIER,
  FOOD_PER_FARM,
  FOOD_PER_FISH,
  FOOD_PER_GRAIN,
  FOOD_PER_POP_CONSUMPTION,
  GRAIN_PROCESSED_PER_GRANARY,
} from "../constants";
import type { Season } from "../country/calendar";
import type { CountryStats } from "../country/types";
import type { Modifiers } from "../policy/modifiers";
import type { ResourceBundle } from "../resources/types";

// What laws, research and the party in power do to farming and eating
// (see domain/policy). Leave it out and nothing is changed.
export type FoodModifiers = Pick<Modifiers, "farmYieldMultiplier" | "winterFarmMultiplier" | "foodConsumptionMultiplier">;

const PLAIN: FoodModifiers = { farmYieldMultiplier: 1, winterFarmMultiplier: 1, foodConsumptionMultiplier: 1 };

// Farms follow the seasons: a bumper autumn harvest, a lean winter (see
// FARM_SEASON_MULTIPLIER), less lean with the right research. Granaries
// and canneries below don't follow the seasons: they work from whatever
// grain or fish is already in stock.
export function produceFood(farmCount: number, season: Season, mods: FoodModifiers = PLAIN): number {
  return farmCount * FOOD_PER_FARM * FARM_SEASON_MULTIPLIER[season] * mods.farmYieldMultiplier * (season === "winter" ? mods.winterFarmMultiplier : 1);
}

export function consumeFood(stats: CountryStats, mods: FoodModifiers = PLAIN): number {
  return stats.population * FOOD_PER_POP_CONSUMPTION * mods.foodConsumptionMultiplier;
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

export function updateFood(stats: CountryStats, farmCount: number, season: Season, extraFoodProduced = 0, mods: FoodModifiers = PLAIN): FoodUpdateResult {
  const produced = produceFood(farmCount, season, mods) + extraFoodProduced;
  const consumed = consumeFood(stats, mods);
  const rawStock = stats.food + produced - consumed;
  return {
    newFoodStock: Math.max(0, rawStock),
    isShortage: rawStock < 0,
  };
}
