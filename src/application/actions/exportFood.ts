import { FOOD_EXPORT_BATCH_SIZE, FOOD_EXPORT_PRICE_PER_UNIT } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";

export function getFoodExportRevenue(): number {
  return FOOD_EXPORT_PRICE_PER_UNIT * FOOD_EXPORT_BATCH_SIZE;
}

export function canExportFood(state: GameState): boolean {
  return state.stats.food >= FOOD_EXPORT_BATCH_SIZE;
}

export function exportFood(state: GameState): GameState {
  if (!canExportFood(state)) return state;

  const revenue = getFoodExportRevenue();
  return {
    ...state,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury + revenue,
      food: state.stats.food - FOOD_EXPORT_BATCH_SIZE,
    },
  };
}
