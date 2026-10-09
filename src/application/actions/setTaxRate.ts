// Raising or lowering taxes: the most direct "good for the treasury, bad
// for the vote" lever there is (see getPopularityDrivers).
import { MAX_TAX_RATE, MIN_TAX_RATE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";

export function setTaxRate(state: GameState, rate: number): GameState {
  const clamped = Math.min(MAX_TAX_RATE, Math.max(MIN_TAX_RATE, Math.round(rate * 100) / 100));
  return clamped === state.taxRate ? state : { ...state, taxRate: clamped };
}
