// Use case: simulate a single in-game day. This is the daily tick — the one
// place allowed to call across every domain module, in order, to advance the
// whole country by one day. Never mutates the state it's given; always
// returns a new GameState.
import { calculateDailyExpenses, calculateDailyIncome } from "../domain/economy/economyRules";
import { advanceProject, isProjectComplete } from "../domain/construction/constructionRules";
import { advanceDay, isFirstDayOfMonth } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { CountryStats, DailyDelta, GameEvent, GameState } from "../domain/country/types";
import { updateFood } from "../domain/food/foodRules";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { updatePopularity } from "../domain/politics/politicsRules";
import { updatePopulation } from "../domain/population/populationRules";
import { calculateDailyResearch } from "../domain/research/researchRules";
import { calculateEfficiencyMultiplier } from "../domain/roads/roadsRules";
import { isCollapseRisk, updateStability } from "../domain/stability/stabilityRules";
import { applyProjectCompletion } from "./applyProjectCompletion";
import { generateMonthlyReport } from "./generateMonthlyReport";
import { MAX_EVENT_LOG_LENGTH } from "../domain/constants";

export function simulateDay(state: GameState): GameState {
  const efficiencyMultiplier = calculateEfficiencyMultiplier(state.roadCount);
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

  // 2. Economy: income and expenses.
  const income = calculateDailyIncome(working.stats, working.taxRate, efficiencyMultiplier);
  const expenses = calculateDailyExpenses(working.stats);
  const treasury = working.stats.treasury + income - expenses;

  // 3. Food: production vs consumption.
  const { newFoodStock, isShortage } = updateFood(working.stats, working.farmCount);
  if (isShortage) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "Food shortage! The population is going hungry.",
      severity: "warning",
    });
  }

  // 4. Industry output (derived from factories + research bonus).
  const industry = calculateIndustryOutput(working.factoryCount, working.researchLevel);

  // 5. Research points accumulate passively.
  const researchPoints = working.stats.researchPoints + calculateDailyResearch(working.educationLevel);

  // 6. Stability reacts to food shortages and popularity.
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

  // 7. Popularity drifts based on the current tax rate.
  const popularity = updatePopularity(working.stats, working.taxRate);

  // 8. Population grows or shrinks based on food and stability.
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

  // 9. Record today's changes for the monthly report.
  const delta: DailyDelta = {
    date: state.date,
    income,
    expenses,
    populationChange: population - state.stats.population,
    stabilityChange: stability - state.stats.stability,
  };
  const history = [...working.history, delta];

  // 10. Advance the calendar; generate a monthly report if a new month started.
  const date = advanceDay(state.date);
  let monthlyReports = working.monthlyReports;
  let finalHistory = history;
  if (isFirstDayOfMonth(date)) {
    monthlyReports = [generateMonthlyReport(date, history), ...monthlyReports];
    finalHistory = [];
  }

  return {
    ...working,
    date,
    stats: updatedStats,
    events: events.slice(0, MAX_EVENT_LOG_LENGTH),
    history: finalHistory,
    monthlyReports,
  };
}
