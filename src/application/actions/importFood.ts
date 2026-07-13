import { FOOD_IMPORT_BATCH_SIZE } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { getFoodImportCostPerUnit } from "../../domain/food/foodRules";
import { getNation } from "../../domain/nations/nationRules";
import type { GameState } from "../../domain/country/types";

// `multiplier` is the player's chosen batch size (see TradePanel's 1x/5x/10x
// selector) — defaults to 1 for every existing call site.
export function getFoodImportCost(state: GameState, multiplier = 1): number {
  return getFoodImportCostPerUnit(getNation(state.nationId)) * FOOD_IMPORT_BATCH_SIZE * multiplier;
}

export function canImportFood(state: GameState, multiplier = 1): boolean {
  return canAfford(state.stats, getFoodImportCost(state, multiplier));
}

export function importFood(state: GameState, multiplier = 1): GameState {
  if (!canImportFood(state, multiplier)) return state;

  const cost = getFoodImportCost(state, multiplier);
  return {
    ...state,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury - cost,
      food: state.stats.food + FOOD_IMPORT_BATCH_SIZE * multiplier,
    },
  };
}
