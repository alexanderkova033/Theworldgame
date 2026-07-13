import { FOOD_EXPORT_BATCH_SIZE, FOOD_EXPORT_PRICE_PER_UNIT } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";

// `multiplier` is the player's chosen batch size (see TradePanel's 1x/5x/10x
// selector) — defaults to 1 for every existing call site.
export function getFoodExportRevenue(multiplier = 1): number {
  return FOOD_EXPORT_PRICE_PER_UNIT * FOOD_EXPORT_BATCH_SIZE * multiplier;
}

export function canExportFood(state: GameState, multiplier = 1): boolean {
  return state.stats.food >= FOOD_EXPORT_BATCH_SIZE * multiplier;
}

export function exportFood(state: GameState, multiplier = 1): GameState {
  if (!canExportFood(state, multiplier)) return state;

  const revenue = getFoodExportRevenue(multiplier);
  return {
    ...state,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury + revenue,
      food: state.stats.food - FOOD_EXPORT_BATCH_SIZE * multiplier,
    },
  };
}
