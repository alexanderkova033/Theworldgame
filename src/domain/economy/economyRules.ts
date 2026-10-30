// Daily income rules: income comes from taxing population and from
// industrial output, both scaled by roads/laws/research (see simulateDay).
import type { CountryStats } from "../country/types";
import { BASE_TAX_INCOME_PER_POP, INCOME_PER_INDUSTRY, MAX_TAX_RATE, TAX_EVASION_AT_MAX, TAX_HANDOUT_COST, TAX_HEAVY_RATE, TAX_RIOT_RATE, TAX_STABILITY_PER_POINT } from "../constants";

// What actually comes in at a tax rate. Up to TAX_HEAVY_RATE, the rate itself;
// past it people hide what they earn, so a higher rate soon brings in less
// (revenue peaks at about 50%). Below zero it is what the state pays out, at
// more than a tax would have raised.
export function getCollectedTaxRate(taxRate: number): number {
  if (taxRate < 0) return taxRate * TAX_HANDOUT_COST;
  if (taxRate <= TAX_HEAVY_RATE) return taxRate;
  return taxRate * (1 - ((taxRate - TAX_HEAVY_RATE) / (MAX_TAX_RATE - TAX_HEAVY_RATE)) * TAX_EVASION_AT_MAX);
}

// Stability lost each day to taxes past what people will bear at all.
export function getTaxStabilityPenalty(taxRate: number): number {
  return Math.max(0, taxRate - TAX_RIOT_RATE) * 100 * TAX_STABILITY_PER_POINT;
}

export function getDailyIncomeParts(
  stats: CountryStats,
  taxRate: number,
  efficiencyMultiplier: number,
): { taxIncome: number; industryIncome: number } {
  return {
    taxIncome: stats.population * BASE_TAX_INCOME_PER_POP * getCollectedTaxRate(taxRate) * efficiencyMultiplier,
    industryIncome: stats.industry * INCOME_PER_INDUSTRY * efficiencyMultiplier,
  };
}

export function calculateDailyIncome(
  stats: CountryStats,
  taxRate: number,
  efficiencyMultiplier: number,
): number {
  const { taxIncome, industryIncome } = getDailyIncomeParts(stats, taxRate, efficiencyMultiplier);
  return taxIncome + industryIncome;
}

export function canAfford(stats: CountryStats, cost: number): boolean {
  return stats.treasury >= cost;
}
