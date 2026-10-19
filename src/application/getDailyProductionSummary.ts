// Use case: preview what today's numbers actually are, without advancing
// the day. Deliberately mirrors simulateDay.ts's steps 2-6 (raw resources,
// economy, food, industry, research) using the same pure domain functions —
// this is a read-only projection of "if a day happened right now," not a
// second copy of the simulation rules.
import { BASE_TAX_INCOME_PER_POP, INCOME_PER_INDUSTRY } from "../domain/constants";
import { getTaxedPopulation } from "../domain/uprising/uprisingRules";
import { getPayRiseBill } from "../domain/uprising/demandRules";
import { getSeason, type Season } from "../domain/country/calendar";
import type { GameState } from "../domain/country/types";
import { getDiplomacyIncomeMultiplier } from "../domain/diplomacy/diplomacyRules";
import { consumeFood, produceFood, produceProcessedFood } from "../domain/food/foodRules";
import { burnHeatingFuel, getHeatingDemand, getHomelessTotal, getHousingCapacity } from "../domain/housing/housingRules";
import { getLabourSituation } from "../domain/labour/labourRules";
import { getWorkingCounts } from "../domain/maintenance/maintenanceRules";
import { getModifiers } from "../domain/policy/policyRules";
import { calculateDailyPoliticalPower } from "../domain/politics/politicsRules";
import { getResearchRates } from "../domain/research/researchRules";
import type { ResearchCategory } from "../domain/research/types";
import { calculateDailyProduction } from "../domain/resources/resourceRules";
import type { ResourceBundle } from "../domain/resources/types";
import { calculateEfficiencyMultiplier } from "../domain/roads/roadsRules";
import { getDailySalaries } from "../domain/workforce/workforceRules";
import { getArmyPay } from "../domain/military/militaryRules";
import { getColonyAccounts, getGrazingFood, getProducingTerrains } from "../domain/islands/islandRules";

export interface DailyProductionSummary {
  taxIncome: number;
  industryIncome: number;
  salaries: number; // paid out daily to scientists, police and militia, and pay rises granted
  colonyIncome: number; // the islands: the salt trade, less supply fees for colonies not linked by harbours
  armyPay: number; // your regiments' pay (see domain/military)
  totalIncome: number; // net of salaries
  buildingInstalments: number; // the daily share of every project still being paid off (see createBuildAction)
  netTreasury: number; // what the treasury actually moves by in a day: income, less wages, less instalments
  season: Season;
  farmFood: number;
  processedFood: number;
  foodProduced: number;
  foodConsumed: number;
  netFood: number;
  resourceProduction: ResourceBundle;
  researchRates: Record<ResearchCategory, number>;
  researchPerDay: number; // all areas together
  housingCapacity: number; // people the working homes can hold
  homeless: number; // people without a home, summed over the provinces (a free home elsewhere doesn't help)
  heatingFuel: number; // fuel the homes burn per day (winter only)
  unheatedShare: number; // 0..1 of homes that can't be heated from current stock
  politicalPowerPerDay: number;
}

export function getDailyProductionSummary(state: GameState): DailyProductionSummary {
  const working = getWorkingCounts(state);
  const { staffed } = getLabourSituation(state);
  const season = getSeason(state.date);
  const efficiencyMultiplier = calculateEfficiencyMultiplier(working.roads);
  const mods = getModifiers(state);
  const incomeMultiplier = efficiencyMultiplier * mods.incomeMultiplier * getDiplomacyIncomeMultiplier(state.foreignPolitics);

  const taxIncome = getTaxedPopulation(state.provinces, state.stats.population, state.date) * BASE_TAX_INCOME_PER_POP * state.taxRate * incomeMultiplier;
  const industryIncome = state.stats.industry * INCOME_PER_INDUSTRY * incomeMultiplier;
  const salaries = getDailySalaries(state.workforce, mods.wageMultiplier) + getPayRiseBill(state.provinces, state.date);
  const buildingInstalments = state.projects.reduce((sum, project) => sum + project.treasuryCostPerDay, 0);

  const { foodProduced: processedFood } = produceProcessedFood(staffed.granaries, staffed.canneries, state.resources);
  const farmFood = produceFood(staffed.farms, season, mods) + getGrazingFood(state);
  const foodProduced = farmFood + processedFood;
  const foodConsumed = consumeFood(state.stats, mods);

  const rawProduction = calculateDailyProduction(getProducingTerrains(state), season);
  const colonies = getColonyAccounts(state);
  const colonyIncome = colonies.supply + colonies.salt;
  const armyPay = getArmyPay(state.regiments, state.nationId);
  // Today's net, after winter heating is burned (coal first, then wood).
  const heatingFuel = getHeatingDemand(state, season);
  const heating = burnHeatingFuel(
    { ...state.resources, coal: state.resources.coal + rawProduction.coal, wood: state.resources.wood + rawProduction.wood },
    heatingFuel,
  );
  const resourceProduction = { ...rawProduction, coal: rawProduction.coal - heating.coalBurned, wood: rawProduction.wood - heating.woodBurned };

  const researchRates = getResearchRates(state);

  return {
    taxIncome,
    industryIncome,
    salaries,
    colonyIncome,
    armyPay,
    totalIncome: taxIncome + industryIncome + colonyIncome - salaries - armyPay,
    buildingInstalments,
    netTreasury: taxIncome + industryIncome + colonyIncome - salaries - armyPay - buildingInstalments,
    season,
    farmFood,
    processedFood,
    foodProduced,
    foodConsumed,
    netFood: foodProduced - foodConsumed,
    resourceProduction,
    researchRates,
    researchPerDay: researchRates.industry + researchRates.agriculture + researchRates.administration + researchRates.housing,
    housingCapacity: getHousingCapacity(state),
    homeless: getHomelessTotal(state),
    heatingFuel,
    unheatedShare: heating.unheatedShare,
    politicalPowerPerDay: calculateDailyPoliticalPower(state.stats.popularity, mods.politicalPowerMultiplier),
  };
}
