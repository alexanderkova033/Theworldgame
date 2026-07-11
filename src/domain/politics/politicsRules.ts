// Tax policy and government popularity. Taxes above a "comfortable" rate
// pull popularity down over time; popularity drifts toward that target daily.
import type { CountryStats } from "../country/types";
import {
  COMFORTABLE_TAX_RATE,
  MAX_TAX_RATE,
  MIN_TAX_RATE,
  POPULARITY_DRIFT_RATE,
  TAX_RATE_STEP,
} from "../constants";

export function clampTaxRate(rate: number): number {
  return Math.min(MAX_TAX_RATE, Math.max(MIN_TAX_RATE, rate));
}

export function raiseTaxRate(currentRate: number): number {
  return clampTaxRate(currentRate + TAX_RATE_STEP);
}

export function lowerTaxRate(currentRate: number): number {
  return clampTaxRate(currentRate - TAX_RATE_STEP);
}

export function updatePopularity(stats: CountryStats, taxRate: number, debtPenalty = 0): number {
  const excessTax = Math.max(0, taxRate - COMFORTABLE_TAX_RATE);
  const targetPopularity = 70 - excessTax * 100;
  const drift = (targetPopularity - stats.popularity) * POPULARITY_DRIFT_RATE;
  return Math.min(100, Math.max(0, stats.popularity + drift - debtPenalty));
}
