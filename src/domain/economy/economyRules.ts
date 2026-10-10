// Daily income rules: income comes from taxing population and from
// industrial output, both scaled by roads/laws/research (see simulateDay).
import type { CountryStats } from "../country/types";
import { BASE_TAX_INCOME_PER_POP, INCOME_PER_INDUSTRY } from "../constants";

export function getDailyIncomeParts(
  stats: CountryStats,
  taxRate: number,
  efficiencyMultiplier: number,
): { taxIncome: number; industryIncome: number } {
  return {
    taxIncome: stats.population * BASE_TAX_INCOME_PER_POP * taxRate * efficiencyMultiplier,
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
