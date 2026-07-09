import { lowerTaxRate, raiseTaxRate } from "../../domain/politics/politicsRules";
import type { GameState } from "../../domain/country/types";

export function raiseTaxes(state: GameState): GameState {
  return { ...state, taxRate: raiseTaxRate(state.taxRate) };
}

export function lowerTaxes(state: GameState): GameState {
  return { ...state, taxRate: lowerTaxRate(state.taxRate) };
}
