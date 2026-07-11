// Use case: simulate a single in-game day. This is the daily tick — the one
// place allowed to call across every domain module, in order, to advance the
// whole country by one day. Never mutates the state it's given; always
// returns a new GameState.
import { calculateDailyExpenses, calculateDailyIncome } from "../domain/economy/economyRules";
import { advanceProject, isProjectComplete } from "../domain/construction/constructionRules";
import { advanceDay, isEveryNMonths, isFirstDayOfMonth } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { CountryStats, DailyDelta, GameEvent, GameState } from "../domain/country/types";
import { pickRandomDecision } from "../domain/decisions/decisionRules";
import { getIslandExpeditionData } from "../domain/expeditions/expeditionData";
import { advanceExpedition, isExpeditionComplete } from "../domain/expeditions/expeditionRules";
import { updateFood } from "../domain/food/foodRules";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { getActiveLawEffects } from "../domain/laws/lawsRules";
import { getNationEffects } from "../domain/nations/nationEffects";
import { getNation } from "../domain/nations/nationRules";
import { getParty } from "../domain/parties/partyRules";
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
import {
  DECISION_CHANCE_PER_MONTH,
  ELECTIONS_TO_WIN_GAME,
  ELECTION_INTERVAL_MONTHS,
  ELECTION_WIN_STABILITY_BONUS,
  ELECTION_WIN_THRESHOLD,
  MAX_EVENT_LOG_LENGTH,
  RANDOM_EVENT_INTERVAL_MONTHS,
} from "../domain/constants";

export function simulateDay(state: GameState): GameState {
  const efficiencyMultiplier = calculateEfficiencyMultiplier(state.roadCount);
  const lawEffects = getActiveLawEffects(state.enactedLawIds);
  const nationEffects = getNationEffects(state.nationId);
  const events: GameEvent[] = [...state.events];

  // 1. Advance every active project. Each one pays its daily installment if
  // the treasury/stockpile can cover it (checked against a running balance,
  // so earlier-started projects get first claim on a tight budget); if it
  // can't, the project doesn't just wait — it stalls and slips slightly
  // backward (see constructionRules.ts) until funding recovers enough to
  // pay for another day's work. A stall/resume only logs once, on the day
  // it actually changes, not every day it stays that way.
  let runningTreasury = state.stats.treasury;
  let runningResources = state.resources;
  const advancedProjects = state.projects.map((project) => {
    const canAffordTreasury = runningTreasury >= project.treasuryCostPerDay;
    const canAffordResource = !project.resourceType || runningResources[project.resourceType] >= project.resourceCostPerDay;
    const canAffordToday = canAffordTreasury && canAffordResource;

    if (canAffordToday) {
      runningTreasury -= project.treasuryCostPerDay;
      if (project.resourceType) {
        runningResources = { ...runningResources, [project.resourceType]: runningResources[project.resourceType] - project.resourceCostPerDay };
      }
    }

    const advanced = advanceProject(project, efficiencyMultiplier, canAffordToday);
    if (advanced.isStalled && !project.isStalled) {
      events.unshift({
        id: generateId("event"),
        date: state.date,
        message: `${project.label} construction has stalled — not enough to pay for it.`,
        severity: "warning",
      });
    } else if (!advanced.isStalled && project.isStalled) {
      events.unshift({
        id: generateId("event"),
        date: state.date,
        message: `${project.label} construction resumes.`,
        severity: "info",
      });
    }
    return advanced;
  });

  const completedProjects = advancedProjects.filter(isProjectComplete);
  const remainingProjects = advancedProjects.filter((p) => !isProjectComplete(p));

  let working: GameState = {
    ...state,
    projects: remainingProjects,
    stats: { ...state.stats, treasury: runningTreasury },
    resources: runningResources,
  };
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
  const income = calculateDailyIncome(
    working.stats,
    working.taxRate,
    efficiencyMultiplier * lawEffects.incomeMultiplier * nationEffects.incomeMultiplier,
  );
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
  const industry =
    calculateIndustryOutput(working.factoryCount, working.researchLevel) * lawEffects.industryMultiplier * nationEffects.industryMultiplier;

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

  // 7b. Stability bottoming out at zero is a hard loss, not just a risk
  // warning — the "collapse risk" event above can repeat every day while
  // things are merely bad; this only fires once, when they've fully failed.
  let isGameOver = working.isGameOver;
  let outcome = working.outcome;
  let gameOverReason = working.gameOverReason;
  if (!isGameOver && stability <= 0) {
    isGameOver = true;
    outcome = "collapsed";
    gameOverReason = "Stability collapsed entirely. Order broke down, and the government fell.";
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "The government has collapsed. Your reign ends here.",
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

  // 13. A general election, roughly every ELECTION_INTERVAL_MONTHS — the
  // actual win/lose condition of the game. Below the threshold, the rival
  // party takes power and the game ends; at or above it, the player's party
  // keeps governing (with a small mandate bump), and enough wins in a row
  // is outright victory. Skipped once the game has already ended some other
  // way (e.g. a stability collapse on the very same day).
  let electionsWon = working.electionsWon;
  if (!isGameOver && isEveryNMonths(date, ELECTION_INTERVAL_MONTHS)) {
    const party = getParty(working.partyId);
    const popularity = finalStats.popularity;
    if (popularity >= ELECTION_WIN_THRESHOLD) {
      electionsWon += 1;
      finalStats = { ...finalStats, stability: Math.min(100, finalStats.stability + ELECTION_WIN_STABILITY_BONUS) };
      if (electionsWon >= ELECTIONS_TO_WIN_GAME) {
        isGameOver = true;
        outcome = "victory";
        gameOverReason = `${party.name} has won the people's trust for good — a mandate no rival can challenge.`;
        events.unshift({
          id: generateId("event"),
          date,
          message: `${party.name} wins the general election outright — ${electionsWon} elections running. Victory!`,
          severity: "info",
        });
      } else {
        events.unshift({
          id: generateId("event"),
          date,
          message: `${party.name} wins the general election with ${Math.round(popularity)}% support (${electionsWon}/${ELECTIONS_TO_WIN_GAME} for outright victory).`,
          severity: "info",
        });
      }
    } else {
      isGameOver = true;
      outcome = "voted-out";
      gameOverReason = `${party.name} lost the general election with only ${Math.round(popularity)}% support. The opposition takes power.`;
      events.unshift({
        id: generateId("event"),
        date,
        message: `${party.name} loses the general election. You are voted out of office.`,
        severity: "danger",
      });
    }
  }

  // 14. A political decision, unpredictably — see domain/decisions. Rolled
  // on the first day of every month; skipped if one is already pending or
  // the game just ended some other way. Popping up pauses the game (see the
  // isPaused line below) until the player picks an option.
  let pendingDecisionId = working.pendingDecisionId;
  if (!isGameOver && !pendingDecisionId && isFirstDayOfMonth(date) && Math.random() < DECISION_CHANCE_PER_MONTH) {
    pendingDecisionId = pickRandomDecision().id;
  }

  return {
    ...working,
    date,
    isPaused: isGameOver || pendingDecisionId ? true : working.isPaused,
    isGameOver,
    outcome,
    gameOverReason,
    electionsWon,
    pendingDecisionId,
    stats: finalStats,
    resources: finalResources,
    events: events.slice(0, MAX_EVENT_LOG_LENGTH),
    history: finalHistory,
    monthlyReports,
  };
}
