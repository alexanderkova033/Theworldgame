// Use case: preview what today's numbers actually are, without advancing
// the day. Deliberately mirrors simulateDay.ts's steps 2-6 (raw resources,
// economy, food, industry, research) using the same pure domain functions —
// this is a read-only projection of "if a day happened right now," not a
// second copy of the simulation rules.
import { BASE_TAX_INCOME_PER_POP, INCOME_PER_INDUSTRY } from "../domain/constants";
import { getSeason, type Season } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { getDiplomacyIncomeMultiplier } from "../domain/diplomacy/diplomacyRules";
import { consumeFood, produceFood, produceProcessedFood } from "../domain/food/foodRules";
import { getActiveLawEffects } from "../domain/laws/lawsRules";
import { getWorkingCounts } from "../domain/maintenance/maintenanceRules";
import { getNationEffects } from "../domain/nations/nationEffects";
import { getNation } from "../domain/nations/nationRules";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import { getActiveResearchEffects, getResearchRates } from "../domain/research/researchRules";
import type { ResearchCategory } from "../domain/research/types";
import { calculateDailyProduction } from "../domain/resources/resourceRules";
import type { ResourceBundle } from "../domain/resources/types";
import { calculateEfficiencyMultiplier } from "../domain/roads/roadsRules";
import { getActiveSynergyEffects } from "../domain/synergy/synergyRules";
import { getDailySalaries } from "../domain/workforce/workforceRules";

export interface DailyProductionSummary {
  taxIncome: number;
  industryIncome: number;
  salaries: number; // paid out daily to scientists and police
  totalIncome: number; // net of salaries
  season: Season;
  farmFood: number;
  processedFood: number;
  foodProduced: number;
  foodConsumed: number;
  netFood: number;
  resourceProduction: ResourceBundle;
  researchRates: Record<ResearchCategory, number>;
  researchPerDay: number; // all three areas together
}

export function getDailyProductionSummary(state: GameState): DailyProductionSummary {
  const working = getWorkingCounts(state);
  const season = getSeason(state.date);
  const efficiencyMultiplier = calculateEfficiencyMultiplier(working.roads);
  const lawEffects = getActiveLawEffects(state.enactedLawIds);
  const researchEffects = getActiveResearchEffects(state.enactedResearchIds, state.researchOutcomes);
  const synergyEffects = getActiveSynergyEffects(state.enactedLawIds, state.enactedResearchIds);
  const nationEffects = getNationEffects(state.nationId);
  const incomeMultiplier =
    efficiencyMultiplier *
    lawEffects.incomeMultiplier *
    nationEffects.incomeMultiplier *
    researchEffects.incomeMultiplier *
    synergyEffects.incomeMultiplier *
    getDiplomacyIncomeMultiplier(state.foreignPolitics);

  const taxIncome = state.stats.population * BASE_TAX_INCOME_PER_POP * state.taxRate * incomeMultiplier;
  const industryIncome = state.stats.industry * INCOME_PER_INDUSTRY * incomeMultiplier;
  const salaries = getDailySalaries(state.workforce);

  const { foodProduced: processedFood } = produceProcessedFood(working.granaries, working.canneries, state.resources);
  const farmFood = produceFood(working.farms, season);
  const foodProduced = farmFood + processedFood;
  const foodConsumed = consumeFood(state.stats);

  const nation = getNation(state.nationId);
  const ownedTerrains = nation.provinceIds.map(
    (provinceId) => MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)!.terrain,
  );
  const resourceProduction = calculateDailyProduction(ownedTerrains, season);

  const researchRates = getResearchRates(state);

  return {
    taxIncome,
    industryIncome,
    salaries,
    totalIncome: taxIncome + industryIncome - salaries,
    season,
    farmFood,
    processedFood,
    foodProduced,
    foodConsumed,
    netFood: foodProduced - foodConsumed,
    resourceProduction,
    researchRates,
    researchPerDay: researchRates.industry + researchRates.agriculture + researchRates.administration,
  };
}
