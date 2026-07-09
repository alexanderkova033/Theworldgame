import { FOOD_IMPORT_BATCH_SIZE } from "../../domain/constants";
import { canAfford } from "../../domain/economy/economyRules";
import { getFoodImportCostPerUnit } from "../../domain/food/foodRules";
import { getNation } from "../../domain/nations/nationRules";
import type { GameState } from "../../domain/country/types";

export function getFoodImportCost(state: GameState): number {
  return getFoodImportCostPerUnit(getNation(state.nationId)) * FOOD_IMPORT_BATCH_SIZE;
}

export function canImportFood(state: GameState): boolean {
  return canAfford(state.stats, getFoodImportCost(state));
}

export function importFood(state: GameState): GameState {
  if (!canImportFood(state)) return state;

  const cost = getFoodImportCost(state);
  return {
    ...state,
    stats: {
      ...state.stats,
      treasury: state.stats.treasury - cost,
      food: state.stats.food + FOOD_IMPORT_BATCH_SIZE,
    },
  };
}
