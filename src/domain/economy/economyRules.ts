// Daily income and expense rules. Income comes from taxing population and
// from industrial output; expenses currently come from army upkeep.
import type { CountryStats } from "../country/types";
import { ARMY_UPKEEP_PER_STRENGTH, BASE_TAX_INCOME_PER_POP, INCOME_PER_INDUSTRY } from "../constants";

export function calculateDailyIncome(
  stats: CountryStats,
  taxRate: number,
  efficiencyMultiplier: number,
): number {
  const taxIncome = stats.population * BASE_TAX_INCOME_PER_POP * taxRate;
  const industryIncome = stats.industry * INCOME_PER_INDUSTRY;
  return (taxIncome + industryIncome) * efficiencyMultiplier;
}

export function calculateDailyExpenses(stats: CountryStats): number {
  return stats.armyStrength * ARMY_UPKEEP_PER_STRENGTH;
}

export function canAfford(stats: CountryStats, cost: number): boolean {
  return stats.treasury >= cost;
}
