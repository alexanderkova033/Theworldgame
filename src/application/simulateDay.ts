// Use case: simulate a single in-game day. This is the daily tick — the one
// place allowed to call across every domain module, in order, to advance the
// whole country by one day. Never mutates the state it's given; always
// returns a new GameState.
import { calculateDailyIncome } from "../domain/economy/economyRules";
import { advanceProject, isProjectComplete } from "../domain/construction/constructionRules";
import { advanceDay, getSeason, isEveryNMonths, isFirstDayOfMonth } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { CountryStats, DailyDelta, GameEvent, GameState } from "../domain/country/types";
import { pickRandomDecision } from "../domain/decisions/decisionRules";
import { getDiplomacyIncomeMultiplier, isFriendly, rollForeignMeddling, updateForeignPolitics } from "../domain/diplomacy/diplomacyRules";
import { getIslandExpeditionData } from "../domain/expeditions/expeditionData";
import { advanceExpedition, isExpeditionComplete } from "../domain/expeditions/expeditionRules";
import { produceProcessedFood, updateFood } from "../domain/food/foodRules";
import {
  burnHeatingFuel,
  getColdStabilityPenalty,
  getHeatingDemand,
  getHomelessShare,
  getHomelessStabilityPenalty,
  getHousingCapacity,
} from "../domain/housing/housingRules";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { getLabourSituation } from "../domain/labour/labourRules";
import { getActiveLawEffects } from "../domain/laws/lawsRules";
import { accrueInterest, getDebtPopularityPenalty, getDebtStabilityPenalty, isDebtDangerous } from "../domain/loans/loanRules";
import { advanceRepairs, getWorkingCounts, rollBreakdowns } from "../domain/maintenance/maintenanceRules";
import { getNationEffects } from "../domain/nations/nationEffects";
import { getNation } from "../domain/nations/nationRules";
import { applyFactionEffects, applyUniformDelta, getFactionWeights } from "../domain/parties/factionRules";
import { getParty } from "../domain/parties/partyRules";
import { getProvinceName } from "../domain/provinces/provinceRules";
import { calculateDailyPoliticalPower, getPopularityTarget, updateFactionPopularity } from "../domain/politics/politicsRules";
import { updatePopulation } from "../domain/population/populationRules";
import { updateMarket } from "../domain/market/marketRules";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import { applyRandomEventEffect, pickRandomEvent } from "../domain/randomEvents/randomEventRules";
import { getActiveResearchEffects } from "../domain/research/researchRules";
import { addResources, calculateDailyProduction } from "../domain/resources/resourceRules";
import { calculateEfficiencyMultiplier } from "../domain/roads/roadsRules";
import { isCollapseRisk, updateStability } from "../domain/stability/stabilityRules";
import { getActiveSynergyEffects } from "../domain/synergy/synergyRules";
import { getDailySalaries, getPoliceBreakdownReduction, getPoliceStabilityBonus, layOffUntilAffordable } from "../domain/workforce/workforceRules";
import { advancePolicies } from "./advancePolicies";
import { applyExpeditionCompletion } from "./applyExpeditionCompletion";
import { applyProjectCompletion } from "./applyProjectCompletion";
import { generateMonthlyReport } from "./generateMonthlyReport";
import { pickRivalCampaignMove } from "./rivalCampaignMove";
import {
  DECISION_CHANCE_PER_MONTH,
  ELECTIONS_TO_WIN_GAME,
  ELECTION_INTERVAL_MONTHS,
  ELECTION_WIN_STABILITY_BONUS,
  ELECTION_WIN_THRESHOLD,
  MAX_EVENT_LOG_LENGTH,
  RANDOM_EVENT_INTERVAL_MONTHS,
  RIVAL_CAMPAIGN_CHANCE_PER_MONTH,
} from "../domain/constants";

const BUILDING_NAMES: Record<string, string> = {
  farm: "Farm",
  factory: "Factory",
  road: "Road",
  education: "School",
  granary: "Granary",
  cannery: "Cannery",
  housing: "Homes",
};

// The turn of the season, announced on its first day — winter especially,
// since it's when farms stop pulling their weight.
const SEASON_MESSAGES: Record<number, { message: string; severity: GameEvent["severity"] }> = {
  3: { message: "Spring thaw — the fields are workable again.", severity: "info" },
  9: { message: "Harvest season — farms yield their best of the year. Stockpile for winter.", severity: "info" },
  12: { message: "Winter sets in — farms yield little and grain fields lie fallow until spring.", severity: "warning" },
};

export function simulateDay(state: GameState): GameState {
  const efficiencyMultiplier = calculateEfficiencyMultiplier(getWorkingCounts(state).roads);
  const season = getSeason(state.date);
  const lawEffects = getActiveLawEffects(state.enactedLawIds);
  const researchEffects = getActiveResearchEffects(state.enactedResearchIds, state.researchOutcomes);
  // A Law+Research pair that's both enacted layers on an extra bonus, on top
  // of whatever each already contributes alone — see domain/synergy.
  const synergyEffects = getActiveSynergyEffects(state.enactedLawIds, state.enactedResearchIds);
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

  // 1b'. A law being drafted and a technology in the lab each move one day
  // closer to taking effect (see advancePolicies.ts). Completion logs its
  // own event onto working.events — lift those into today's log here, since
  // the final state's events come from the local array, not working.events.
  const eventCountBeforePolicies = working.events.length;
  working = advancePolicies(working);
  events.unshift(...working.events.slice(0, working.events.length - eventCountBeforePolicies));

  // 1d. Repairs in progress tick down; then any working building might
  // break (police deter some of it). Broken buildings stop producing until
  // repaired — everything below reads getWorkingCounts, not the raw counts.
  const repairs = advanceRepairs(working.placedBuildings);
  for (const building of repairs.repaired) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: `${BUILDING_NAMES[building.type]} in ${getProvinceName(building.provinceId)} is repaired and back in service.`,
      severity: "info",
    });
  }
  const breakdowns = rollBreakdowns(repairs.placedBuildings, getPoliceBreakdownReduction(working.workforce.police));
  for (const building of breakdowns.broken) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: `${BUILDING_NAMES[building.type]} in ${getProvinceName(building.provinceId)} has broken down — repair it from the Economy tab.`,
      severity: "warning",
    });
  }
  working = { ...working, placedBuildings: breakdowns.placedBuildings };
  const workingCounts = getWorkingCounts(working);
  // Staffed buildings run at the share of their jobs that can be filled —
  // food first, then schools, then factories (see labourRules.ts).
  const labour = getLabourSituation(working);

  // 2. Raw resources: every owned province produces its terrain's resource.
  const nation = getNation(working.nationId);
  const ownedTerrains = nation.provinceIds.map(
    (provinceId) => MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)!.terrain,
  );
  const producedResources = addResources(working.resources, calculateDailyProduction(ownedTerrains, season));
  const market = updateMarket(working.market, season, isFirstDayOfMonth(state.date));

  // 2b. Granaries/Canneries (research-gated — see domain/research) turn
  // today's Grain/Fish stock into Food, capped by both building count and
  // what's actually in stock. Runs after raw production lands (so a
  // province's own grain/fish that same day is available to process) but
  // before step 4 folds the result into the food stock.
  const { foodProduced: processedFood, grainConsumed, fishConsumed } = produceProcessedFood(
    workingCounts.granaries * labour.foodStaffing,
    workingCounts.canneries * labour.foodStaffing,
    producedResources,
  );
  const processedResources: typeof producedResources = {
    ...producedResources,
    grain: producedResources.grain - grainConsumed,
    fish: producedResources.fish - fishConsumed,
  };

  // 2b'. Winter heating: every working home burns coal, then firewood. Whatever can't be heated hits stability (step 7) and
  // population (step 9). Logged once when the fuel first runs out, and again
  // at the start of each winter month it's still out.
  const heating = burnHeatingFuel(processedResources, getHeatingDemand(working, season));
  const resources = heating.resources;
  const wasHeatedYesterday = working.resources.coal + working.resources.wood >= getHeatingDemand(working, season);
  if (heating.unheatedShare > 0 && (wasHeatedYesterday || isFirstDayOfMonth(state.date))) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "No coal or wood left to heat homes — people are freezing. Buy coal on the Trade tab.",
      severity: "danger",
    });
  }

  // Housing: anyone without a roof weighs on stability (step 7).
  const housingCapacity = getHousingCapacity(working);
  const homelessShare = getHomelessShare(working.stats.population, housingCapacity);

  // 2c. Debt compounds daily, whether or not it's touched — see
  // domain/loans/loanRules.ts. Crossing into "dangerous" territory (and only
  // that crossing, not every day it stays there) gets its own warning.
  const debt = accrueInterest(working.debt);
  if (!working.isGameOver && isDebtDangerous(debt) && !isDebtDangerous(working.debt)) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "Debt has grown dangerous — the interest alone is now dragging down stability and popularity.",
      severity: "warning",
    });
  }

  // 3. Economy: daily income (project installments are already drained in
  // step 1, so this is the only other thing moving the treasury on a tick),
  // with a bonus for every neighbor ruled by the party you backed — then
  // the workforce's salaries. Staff who can't be paid walk out.
  const grossIncome = calculateDailyIncome(
    working.stats,
    working.taxRate,
    efficiencyMultiplier *
      lawEffects.incomeMultiplier *
      nationEffects.incomeMultiplier *
      researchEffects.incomeMultiplier *
      synergyEffects.incomeMultiplier *
      getDiplomacyIncomeMultiplier(working.foreignPolitics),
  );
  const { workforce, laidOff } = layOffUntilAffordable(working.workforce, working.stats.treasury + grossIncome);
  if (laidOff > 0) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: `The treasury can't cover salaries — ${laidOff} unpaid staff walk off the job.`,
      severity: "warning",
    });
  }
  const income = grossIncome - getDailySalaries(workforce);
  const treasury = working.stats.treasury + income;

  // 4. Food: production (farms + processed Grain/Fish) vs consumption.
  const { newFoodStock, isShortage } = updateFood(working.stats, workingCounts.farms * labour.foodStaffing, season, processedFood);
  if (isShortage) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "Food shortage! The population is going hungry.",
      severity: "warning",
    });
  }

  // 5. Industry output (derived from factories, scaled by laws + the research tree).
  const industry =
    calculateIndustryOutput(workingCounts.factories * labour.industryStaffing) *
    lawEffects.industryMultiplier *
    nationEffects.industryMultiplier *
    researchEffects.industryMultiplier *
    synergyEffects.industryMultiplier;

  // 6. Political power accumulates, faster for a popular government.
  const politicalPower = working.stats.politicalPower + calculateDailyPoliticalPower(working.stats.popularity);

  // 7. Stability reacts to food shortages, popularity, heavy debt, people
  // without homes and homes without heat; police on the payroll steady it.
  const statsWithFood: CountryStats = { ...working.stats, food: newFoodStock };
  const stability = Math.min(
    100,
    updateStability(
      statsWithFood,
      isShortage,
      getDebtStabilityPenalty(debt) + getHomelessStabilityPenalty(homelessShare) + getColdStabilityPenalty(heating.unheatedShare),
    ) + getPoliceStabilityBonus(workforce.police),
  );
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

  // 8. Popularity drifts toward a target built from how the country is run
  // — taxes, food, homes, heat, order (see politicsRules.ts) — and takes a
  // hit if debt is heavy. Applied per-faction, then re-aggregated into the
  // single number everything else below still reads.
  const factionWeights = getFactionWeights(working.nationId);
  const popularityTarget = getPopularityTarget({
    taxRate: working.taxRate,
    isFoodShortage: isShortage,
    homelessShare,
    unheatedShare: heating.unheatedShare,
    unemploymentShare: labour.unemploymentShare,
    stability,
  });
  const { factionApproval, popularity } = updateFactionPopularity(working.factionApproval, factionWeights, popularityTarget, getDebtPopularityPenalty(debt));

  // 9. Population grows or shrinks based on food, stability, housing and heat.
  const population = updatePopulation({ ...statsWithFood, stability }, isShortage, housingCapacity, heating.unheatedShare);
  // Logged when homelessness first becomes noticeable (2%), not every day.
  if (getHomelessShare(population, housingCapacity) >= 0.02 && homelessShare < 0.02) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "The homes are full — families are sleeping rough. Build more homes.",
      severity: "warning",
    });
  }

  const updatedStats: CountryStats = {
    treasury,
    population,
    food: newFoodStock,
    industry,
    stability,
    politicalPower,
    popularity,
  };

  // 10. Record today's changes for the monthly report.
  const delta: DailyDelta = {
    date: state.date,
    income,
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
  let finalFactionApproval = factionApproval;
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

  // 12b. The rival party makes a campaign move roughly once a month — an
  // event-log-visible, mildly random popularity nudge that reacts to your
  // own enacted laws/research when the rival has a strong opinion on one of
  // them (see rivalCampaignMove.ts), so the opposition feels like it's
  // actually doing something rather than just being 100 - your popularity.
  // Runs before the election check below so a well-timed (or badly-timed)
  // campaign move can actually swing an election that lands the same month.
  if (!isGameOver && isFirstDayOfMonth(date) && Math.random() < RIVAL_CAMPAIGN_CHANCE_PER_MONTH) {
    const move = pickRivalCampaignMove(working);
    const applied = applyFactionEffects(finalFactionApproval, factionWeights, move.effects ?? {}, move.popularityDelta);
    finalFactionApproval = applied.factionApproval;
    finalStats = { ...finalStats, popularity: applied.popularity };
    events.unshift({
      id: generateId("event"),
      date,
      message: move.message,
      severity: move.popularityDelta < 0 ? "warning" : "info",
    });
  }

  // 12c. Neighbors' politics move once a month: their electorates relax
  // toward an even split, and a challenger past the threshold takes power.
  let foreignPolitics = working.foreignPolitics;
  if (!isGameOver && isFirstDayOfMonth(date)) {
    const update = updateForeignPolitics(foreignPolitics);
    foreignPolitics = update.foreignPolitics;
    for (const change of update.changes) {
      const nation = getNation(change.nationId);
      const newParty = getParty(change.newRulingPartyId);
      const friendly = isFriendly(foreignPolitics[change.nationId]);
      events.unshift({
        id: generateId("event"),
        date,
        message: `${nation.name} changes government: the ${newParty.name} takes power${friendly ? " — a friendly government, trade terms improve." : "."}`,
        severity: friendly ? "info" : "warning",
      });
    }

    // ...and they meddle back in yours.
    for (const move of rollForeignMeddling(foreignPolitics)) {
      const applied = applyUniformDelta(finalFactionApproval, factionWeights, move.supportDelta);
      finalFactionApproval = applied.factionApproval;
      finalStats = { ...finalStats, popularity: applied.popularity };
      const nation = getNation(move.nationId);
      const party = getParty(move.partyId);
      events.unshift({
        id: generateId("event"),
        date,
        message:
          move.supportDelta > 0
            ? `${nation.name}'s ${party.name} campaigns for you across the border — support +${move.supportDelta}.`
            : `${nation.name}'s ${party.name} is funding your opposition — support ${move.supportDelta}.`,
        severity: move.supportDelta > 0 ? "info" : "warning",
      });
    }
  }

  // 12d. The turn of the season.
  const seasonMessage = isFirstDayOfMonth(date) ? SEASON_MESSAGES[date.month] : undefined;
  if (!isGameOver && seasonMessage) {
    events.unshift({ id: generateId("event"), date, ...seasonMessage });
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
    market,
    factionApproval: finalFactionApproval,
    workforce,
    foreignPolitics,
    debt,
    events: events.slice(0, MAX_EVENT_LOG_LENGTH),
    history: finalHistory,
    monthlyReports,
  };
}
