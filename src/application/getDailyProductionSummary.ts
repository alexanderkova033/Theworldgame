// Use case: preview what today's numbers actually are, without advancing
// the day. Deliberately mirrors simulateDay.ts's steps 2-6 (raw resources,
// economy, food, industry, research) using the same pure domain functions —
// this is a read-only projection of "if a day happened right now," not a
// second copy of the simulation rules.
import { BASE_TAX_INCOME_PER_POP, INCOME_PER_INDUSTRY } from "../domain/constants";
import { getActiveLawEffects } from "../domain/laws/lawsRules";
import { getNationEffects } from "../domain/nations/nationEffects";
import { getNation } from "../domain/nations/nationRules";
import { calculateDailyIncome, calculateDailyExpenses } from "../domain/economy/economyRules";
import type { GameState } from "../domain/country/types";
import { consumeFood, produceFood } from "../domain/food/foodRules";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import { getActiveResearchEffects, calculateDailyResearch } from "../domain/research/researchRules";
import { calculateDailyProduction } from "../domain/resources/resourceRules";
import type { ResourceBundle } from "../domain/resources/types";
import { calculateEfficiencyMultiplier } from "../domain/roads/roadsRules";

export interface DailyProductionSummary {
  taxIncome: number;
  industryIncome: number;
  totalIncome: number;
  expenses: number;
  netTreasury: number;
  foodProduced: number;
  foodConsumed: number;
  netFood: number;
  resourceProduction: ResourceBundle;
  researchPointsPerDay: number;
}

export function getDailyProductionSummary(state: GameState): DailyProductionSummary {
  const efficiencyMultiplier = calculateEfficiencyMultiplier(state.roadCount);
  const lawEffects = getActiveLawEffects(state.enactedLawIds);
  const researchEffects = getActiveResearchEffects(state.enactedResearchIds);
  const nationEffects = getNationEffects(state.nationId);
  const incomeMultiplier = efficiencyMultiplier * lawEffects.incomeMultiplier * nationEffects.incomeMultiplier * researchEffects.incomeMultiplier;

  const taxIncome = state.stats.population * BASE_TAX_INCOME_PER_POP * state.taxRate * incomeMultiplier;
  const industryIncome = state.stats.industry * INCOME_PER_INDUSTRY * incomeMultiplier;
  const totalIncome = calculateDailyIncome(state.stats, state.taxRate, incomeMultiplier);
  const expenses = calculateDailyExpenses(state.stats);

  const foodProduced = produceFood(state.farmCount);
  const foodConsumed = consumeFood(state.stats);

  const nation = getNation(state.nationId);
  const ownedTerrains = nation.provinceIds.map(
    (provinceId) => MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)!.terrain,
  );
  const resourceProduction = calculateDailyProduction(ownedTerrains);

  const researchPointsPerDay = calculateDailyResearch(state.educationLevel);

  return {
    taxIncome,
    industryIncome,
    totalIncome,
    expenses,
    netTreasury: totalIncome - expenses,
    foodProduced,
    foodConsumed,
    netFood: foodProduced - foodConsumed,
    resourceProduction,
    researchPointsPerDay,
  };
}
