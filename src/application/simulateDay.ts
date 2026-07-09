// Use case: simulate a single in-game day. This is the daily tick — the one
// place allowed to call across every domain module, in order, to advance the
// whole country by one day. Never mutates the state it's given; always
// returns a new GameState.
import { calculateDailyExpenses, calculateDailyIncome } from "../domain/economy/economyRules";
import { advanceProject, isProjectComplete } from "../domain/construction/constructionRules";
import { advanceDay, isEveryNMonths, isFirstDayOfMonth } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { CountryStats, DailyDelta, GameEvent, GameState } from "../domain/country/types";
import { getIslandExpeditionData } from "../domain/expeditions/expeditionData";
import { advanceExpedition, isExpeditionComplete } from "../domain/expeditions/expeditionRules";
import { updateFood } from "../domain/food/foodRules";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { getActiveLawEffects } from "../domain/laws/lawsRules";
import { getNation } from "../domain/nations/nationRules";
import { updatePopularity } from "../domain/politics/politicsRules";
import { updatePopulation } from "../domain/population/populationRules";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import { applyRandomEventEffect, pickRandomEvent } from "../domain/randomEvents/randomEventRules";
import { calculateDailyResearch } from "../domain/research/researchRules";
import { addResources, calculateDailyProduction } from "../domain/resources/resourceRules";
import { calculateEfficiencyMultiplier } from "../domain/roads/roadsRules";
import { isCollapseRisk, updateStability } from "../domain/stability/stabilityRules";
import { applyExpeditionCompletion } from "./applyExpeditionCompletion";
import { applyProjectCompletion } from "./applyProjectCompletion";
import { generateMonthlyReport } from "./generateMonthlyReport";
import { MAX_EVENT_LOG_LENGTH, RANDOM_EVENT_INTERVAL_MONTHS } from "../domain/constants";

export function simulateDay(state: GameState): GameState {
  const efficiencyMultiplier = calculateEfficiencyMultiplier(state.roadCount);
  const lawEffects = getActiveLawEffects(state.enactedLawIds);
  const events: GameEvent[] = [...state.events];

  // 1. Advance every active project; apply completed ones.
  const advancedProjects = state.projects.map((p) => advanceProject(p, efficiencyMultiplier));
  const completedProjects = advancedProjects.filter(isProjectComplete);
  const remainingProjects = advancedProjects.filter((p) => !isProjectComplete(p));

  let working: GameState = { ...state, projects: remainingProjects };
  for (const project of completedProjects) {
    working = applyProjectCompletion(working, project);
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: `${project.label} construction complete.`,
      severity: "info",
    });
  }

  // 1b. Advance every active expedition; apply completed ones the same way.
  const advancedExpeditions = working.expeditions.map(advanceExpedition);
  const completedExpeditions = advancedExpeditions.filter(isExpeditionComplete);
  const remainingExpeditions = advancedExpeditions.filter((e) => !isExpeditionComplete(e));

  working = { ...working, expeditions: remainingExpeditions };
  for (const expedition of completedExpeditions) {
    working = applyExpeditionCompletion(working, expedition);
    const islandName = getIslandExpeditionData(expedition.islandId)?.islandName ?? "The venture";
    const flavor = getIslandExpeditionData(expedition.islandId)?.reward.flavor ?? "";
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: `Venture to ${islandName} complete. ${flavor}`,
      severity: "info",
    });
  }

  // 2. Raw resources: every owned province produces its terrain's resource.
  const nation = getNation(working.nationId);
  const ownedTerrains = nation.provinceIds.map(
    (provinceId) => MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)!.terrain,
  );
  const resources = addResources(working.resources, calculateDailyProduction(ownedTerrains));

  // 3. Economy: income and expenses.
  const income = calculateDailyIncome(working.stats, working.taxRate, efficiencyMultiplier * lawEffects.incomeMultiplier);
  const expenses = calculateDailyExpenses(working.stats);
  const treasury = working.stats.treasury + income - expenses;

  // 4. Food: production vs consumption.
  const { newFoodStock, isShortage } = updateFood(working.stats, working.farmCount);
  if (isShortage) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "Food shortage! The population is going hungry.",
      severity: "warning",
    });
  }

  // 5. Industry output (derived from factories + research bonus + laws).
  const industry = calculateIndustryOutput(working.factoryCount, working.researchLevel) * lawEffects.industryMultiplier;

  // 6. Research points accumulate passively.
  const researchPoints = working.stats.researchPoints + calculateDailyResearch(working.educationLevel);

  // 7. Stability reacts to food shortages and popularity.
  const statsWithFood: CountryStats = { ...working.stats, food: newFoodStock };
  const stability = updateStability(statsWithFood, isShortage);
  if (isCollapseRisk({ ...statsWithFood, stability })) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "Stability is critically low — the government risks collapse!",
      severity: "danger",
    });
  }

  // 8. Popularity drifts based on the current tax rate.
  const popularity = updatePopularity(working.stats, working.taxRate);

  // 9. Population grows or shrinks based on food and stability.
  const population = updatePopulation({ ...statsWithFood, stability }, isShortage);

  const updatedStats: CountryStats = {
    treasury,
    population,
    food: newFoodStock,
    industry,
    stability,
    armyStrength: working.stats.armyStrength,
    researchPoints,
    popularity,
  };

  // 10. Record today's changes for the monthly report.
  const delta: DailyDelta = {
    date: state.date,
    income,
    expenses,
    populationChange: population - state.stats.population,
    stabilityChange: stability - state.stats.stability,
  };
  const history = [...working.history, delta];

  // 11. Advance the calendar; generate a monthly report if a new month started.
  const date = advanceDay(state.date);
  let monthlyReports = working.monthlyReports;
  let finalHistory = history;
  if (isFirstDayOfMonth(date)) {
    monthlyReports = [generateMonthlyReport(date, history), ...monthlyReports];
    finalHistory = [];
  }

  // 12. A random world event, roughly every RANDOM_EVENT_INTERVAL_MONTHS.
  let finalStats = updatedStats;
  let finalResources = resources;
  if (isEveryNMonths(date, RANDOM_EVENT_INTERVAL_MONTHS)) {
    const randomEvent = pickRandomEvent();
    const applied = applyRandomEventEffect(finalStats, finalResources, randomEvent.effect);
    finalStats = applied.stats;
    finalResources = applied.resources;
    events.unshift({
      id: generateId("event"),
      date,
      message: `${randomEvent.name}: ${randomEvent.message}`,
      severity: randomEvent.severity,
    });
  }

  return {
    ...working,
    date,
    stats: finalStats,
    resources: finalResources,
    events: events.slice(0, MAX_EVENT_LOG_LENGTH),
    history: finalHistory,
    monthlyReports,
  };
}
