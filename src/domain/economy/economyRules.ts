// Daily income rules: income comes from taxing population and from
// industrial output, both scaled by roads/laws/research (see simulateDay).
import type { CountryStats } from "../country/types";
import { BASE_TAX_INCOME_PER_POP, INCOME_PER_INDUSTRY } from "../constants";

export function calculateDailyIncome(
  stats: CountryStats,
  taxRate: number,
  efficiencyMultiplier: number,
): number {
  const taxIncome = stats.population * BASE_TAX_INCOME_PER_POP * taxRate;
  const industryIncome = stats.industry * INCOME_PER_INDUSTRY;
  return (taxIncome + industryIncome) * efficiencyMultiplier;
}

export function canAfford(stats: CountryStats, cost: number): boolean {
  return stats.treasury >= cost;
}
