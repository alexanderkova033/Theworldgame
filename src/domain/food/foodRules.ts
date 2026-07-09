// Food production and consumption. Population eats every day; farms are the
// only source of new food in the MVP. A nation short on farms can also import
// food directly from the continental market (see importFood.ts) — cheaper
// with a coastal port, same idea as raw-resource trading.
import type { CountryStats } from "../country/types";
import type { Nation } from "../nations/types";
import { FOOD_IMPORT_COST_PER_UNIT, FOOD_IMPORT_PORT_DISCOUNT, FOOD_PER_FARM, FOOD_PER_POP_CONSUMPTION } from "../constants";
import { nationHasPort } from "../resources/tradeRules";

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

export function getFoodImportCostPerUnit(nation: Nation): number {
  return nationHasPort(nation) ? FOOD_IMPORT_COST_PER_UNIT * FOOD_IMPORT_PORT_DISCOUNT : FOOD_IMPORT_COST_PER_UNIT;
}
