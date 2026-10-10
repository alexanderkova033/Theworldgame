// Use case: simulate a single in-game day. This is the daily tick — the one
// place allowed to call across every domain module, in order, to advance the
// whole country by one day. Never mutates the state it's given; always
// returns a new GameState.
import { getDailyIncomeParts } from "../domain/economy/economyRules";
import { advanceProject, isProjectComplete } from "../domain/construction/constructionRules";
import { advanceDay, getSeason, isEveryNMonths, isFirstDayOfMonth } from "../domain/country/calendar";
import { generateId } from "../domain/country/id";
import type { CountryStats, DailyDelta, GameEvent, GameState } from "../domain/country/types";
import { getDecisionChance, pickDecision } from "../domain/decisions/decisionRules";
import { getDiplomacyIncomeMultiplier, isFriendly, rollForeignMeddling, updateForeignPolitics } from "../domain/diplomacy/diplomacyRules";
import { getIslandExpeditionData } from "../domain/expeditions/expeditionData";
import { advanceExpedition, isExpeditionComplete } from "../domain/expeditions/expeditionRules";
import { produceFood, produceProcessedFood, updateFood } from "../domain/food/foodRules";
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
import { emptyLedger, fitCauses, isLedgerEmpty, ledgerFromStatsChange, mergeLedgers } from "../domain/ledger/ledgerRules";
import type { Ledger, LedgerCauses } from "../domain/ledger/types";
import { accrueInterest, getDebtPopularityPenalty, getDebtStabilityPenalty, isDebtDangerous } from "../domain/loans/loanRules";
import { advanceRepairs, getWorkingCounts, rollBreakdowns } from "../domain/maintenance/maintenanceRules";
import { getNationEffects } from "../domain/nations/nationEffects";
import { getNation } from "../domain/nations/nationRules";
import { applyFactionEffects, applyUniformDelta, getFactionWeights } from "../domain/parties/factionRules";
import { getParty } from "../domain/parties/partyRules";
import { getProvinceName } from "../domain/provinces/provinceRules";
import {
  calculateDailyPoliticalPower,
  getPopularityDrivers,
  getPopularityTarget,
  updateFactionPopularity,
  type PopularityConditions,
} from "../domain/politics/politicsRules";
import { updatePopulation } from "../domain/population/populationRules";
import { updateMarket } from "../domain/market/marketRules";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import { applyRandomEventEffect, pickRandomEvent } from "../domain/randomEvents/randomEventRules";
import { getActiveResearchEffects } from "../domain/research/researchRules";
import { addResources, calculateDailyProduction } from "../domain/resources/resourceRules";
import { calculateEfficiencyMultiplier } from "../domain/roads/roadsRules";
import { getStabilityPressures, updateStability } from "../domain/stability/stabilityRules";
import { getActiveSynergyEffects } from "../domain/synergy/synergyRules";
import type { UnrestStage } from "../domain/unrest/types";
import { getUnrestIndustryMultiplier, isWorseStage, rollRiotDamage, updateUnrestStage } from "../domain/unrest/unrestRules";
import { getDailySalaries, getPoliceBreakdownReduction, getPoliceStabilityBonus, layOffUntilAffordable } from "../domain/workforce/workforceRules";
import { ONE_OFF } from "./actions/recordAction";
import { advancePolicies } from "./advancePolicies";
import { applyExpeditionCompletion } from "./applyExpeditionCompletion";
import { applyProjectCompletion } from "./applyProjectCompletion";
import { generateMonthlyReport } from "./generateMonthlyReport";
import { pickRivalCampaignMove } from "./rivalCampaignMove";
import {
  ELECTIONS_TO_WIN_GAME,
  ELECTION_INTERVAL_MONTHS,
  ELECTION_WIN_STABILITY_BONUS,
  ELECTION_WIN_THRESHOLD,
  MAX_EVENT_LOG_LENGTH,
  POPULARITY_BASE_TARGET,
  POPULARITY_DRIFT_RATE,
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

// Unrest moving a stage either way — see domain/unrest.
const UNREST_WORSENS: Record<UnrestStage, string> = {
  calm: "",
  discontent: "Discontent is spreading — stability is under 40 and industry slows.",
  strikes: "Strikes! Stability is under 25 and factories are stopping. Police keep more of them open; a crackdown calms things a stage.",
  riots: "Riots! Stability is under 12 and mobs are wrecking buildings. Crack down before the government falls.",
};
const UNREST_EASES: Record<UnrestStage, string> = {
  calm: "The country is calm again.",
  discontent: "The strikes end — discontent lingers.",
  strikes: "The riots die down — strikes go on.",
  riots: "",
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

  // Why today's numbers moved, cause by cause, for the monthly report (see
  // domain/ledger). `late` holds what happens after the calendar turns —
  // the monthly rival/foreign/event/election rolls — which belongs to the
  // new month, not the one being reported on.
  let ledger: Ledger = emptyLedger();
  let lateLedger: Ledger = emptyLedger();
  const book = (into: Ledger, metric: keyof Ledger, causes: Record<string, number>): Ledger => mergeLedgers(into, { ...emptyLedger(), [metric]: causes });
  const bookChange = (into: Ledger, before: CountryStats, after: CountryStats, causes: LedgerCauses): Ledger =>
    mergeLedgers(into, ledgerFromStatsChange(before, after, causes));

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
  ledger = book(ledger, "treasury", { construction: runningTreasury - state.stats.treasury });

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
  const statsBeforeVentures = working.stats;
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
  ledger = bookChange(ledger, statsBeforeVentures, working.stats, { treasury: "events", stability: "events" });
  const eventCountBeforePolicies = working.events.length;
  const statsBeforePolicies = working.stats;
  working = advancePolicies(working);
  events.unshift(...working.events.slice(0, working.events.length - eventCountBeforePolicies));
  ledger = bookChange(ledger, statsBeforePolicies, working.stats, ONE_OFF);

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
  // Rioting mobs wreck buildings too, through the same repair system.
  if (working.unrestStage === "riots") {
    const riot = rollRiotDamage(working.placedBuildings, working.workforce.police);
    if (riot.wrecked) {
      working = { ...working, placedBuildings: riot.placedBuildings };
      events.unshift({
        id: generateId("event"),
        date: state.date,
        message: `Rioters in ${getProvinceName(riot.wrecked.provinceId)}: a ${BUILDING_NAMES[riot.wrecked.type]} has broken down — repair it from the Economy tab.`,
        severity: "danger",
      });
    }
  }
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
  const { taxIncome, industryIncome } = getDailyIncomeParts(
    working.stats,
    working.taxRate,
    efficiencyMultiplier *
      lawEffects.incomeMultiplier *
      nationEffects.incomeMultiplier *
      researchEffects.incomeMultiplier *
      synergyEffects.incomeMultiplier *
      getDiplomacyIncomeMultiplier(working.foreignPolitics),
  );
  const grossIncome = taxIncome + industryIncome;
  const { workforce, laidOff } = layOffUntilAffordable(working.workforce, working.stats.treasury + grossIncome);
  if (laidOff > 0) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: `The treasury can't cover salaries — ${laidOff} unpaid staff walk off the job.`,
      severity: "warning",
    });
  }
  const salaries = getDailySalaries(workforce);
  const income = grossIncome - salaries;
  const treasury = working.stats.treasury + income;
  ledger = book(ledger, "treasury", { taxes: taxIncome, industry: industryIncome, salaries: -salaries });

  // 4. Food: production (farms + processed Grain/Fish) vs consumption.
  const { newFoodStock, isShortage } = updateFood(working.stats, workingCounts.farms * labour.foodStaffing, season, processedFood);
  const farmFood = produceFood(workingCounts.farms * labour.foodStaffing, season);
  // What was actually eaten — in a shortage, less than people needed.
  const eaten = working.stats.food + farmFood + processedFood - newFoodStock;
  ledger = book(ledger, "food", { farms: farmFood, processing: processedFood, eating: -eaten });
  if (isShortage) {
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: "Food shortage! The population is going hungry.",
      severity: "warning",
    });
  }

  // 5. Industry output (derived from factories, scaled by laws + the research
  // tree) — and by unrest: discontent slows it, strikes stop factories.
  const industry =
    calculateIndustryOutput(workingCounts.factories * labour.industryStaffing) *
    lawEffects.industryMultiplier *
    nationEffects.industryMultiplier *
    researchEffects.industryMultiplier *
    synergyEffects.industryMultiplier *
    getUnrestIndustryMultiplier(working.unrestStage, workforce.police);

  // 6. Political power accumulates, faster for a popular government.
  const politicalPower = working.stats.politicalPower + calculateDailyPoliticalPower(working.stats.popularity);

  // 7. Stability reacts to food shortages, popularity, heavy debt, people
  // without homes and homes without heat; police on the payroll steady it.
  const statsWithFood: CountryStats = { ...working.stats, food: newFoodStock };
  const debtStabilityPenalty = getDebtStabilityPenalty(debt);
  const homelessStabilityPenalty = getHomelessStabilityPenalty(homelessShare);
  const coldStabilityPenalty = getColdStabilityPenalty(heating.unheatedShare);
  const policeStabilityBonus = getPoliceStabilityBonus(workforce.police);
  const stability = Math.min(
    100,
    updateStability(statsWithFood, isShortage, debtStabilityPenalty + homelessStabilityPenalty + coldStabilityPenalty) + policeStabilityBonus,
  );
  const stabilityPressures = getStabilityPressures(statsWithFood, isShortage);
  ledger = book(
    ledger,
    "stability",
    fitCauses(
      {
        food: stabilityPressures.food,
        support: stabilityPressures.support,
        debt: -debtStabilityPenalty,
        homes: -homelessStabilityPenalty,
        cold: -coldStabilityPenalty,
        police: policeStabilityBonus,
      },
      stability - working.stats.stability,
    ),
  );
  // 7a. Unrest escalates (or eases) with stability — announced once per
  // change of stage, not every day it lasts (see domain/unrest).
  const unrestStage = updateUnrestStage(working.unrestStage, stability);
  if (unrestStage !== working.unrestStage) {
    const worse = isWorseStage(unrestStage, working.unrestStage);
    events.unshift({
      id: generateId("event"),
      date: state.date,
      message: worse ? UNREST_WORSENS[unrestStage] : UNREST_EASES[unrestStage],
      severity: !worse ? "info" : unrestStage === "discontent" ? "warning" : "danger",
    });
  }

  // 7b. Stability bottoming out at zero is a hard loss, the last stage
  // after riots; this only fires once, when things have fully failed.
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
  const popularityConditions: PopularityConditions = {
    taxRate: working.taxRate,
    isFoodShortage: isShortage,
    homelessShare,
    unheatedShare: heating.unheatedShare,
    unemploymentShare: labour.unemploymentShare,
    stability,
  };
  const popularityTarget = getPopularityTarget(popularityConditions);
  const debtPopularityPenalty = getDebtPopularityPenalty(debt);
  const { factionApproval, popularity } = updateFactionPopularity(working.factionApproval, factionWeights, popularityTarget, debtPopularityPenalty);
  // Opinion moves a share of the way to its target each day, so each driver
  // moves it by that share of what it adds to the target (scaled down if the
  // target was capped). What's left is opinion easing back toward neutral.
  const drivers = getPopularityDrivers(popularityConditions);
  const rawPush = drivers.reduce((sum, d) => sum + d.value, 0);
  const pushScale = rawPush !== 0 ? (popularityTarget - POPULARITY_BASE_TARGET) / rawPush : 0;
  ledger = book(
    ledger,
    "support",
    fitCauses(
      {
        ...Object.fromEntries(drivers.map((d) => [d.key, d.value * pushScale * POPULARITY_DRIFT_RATE])),
        settling: (POPULARITY_BASE_TARGET - working.stats.popularity) * POPULARITY_DRIFT_RATE,
        debt: -debtPopularityPenalty,
      },
      popularity - working.stats.popularity,
    ),
  );

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
    // Player actions since the last tick count toward today.
    ledger: mergeLedgers(state.pendingLedger, ledger),
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
    lateLedger = bookChange(lateLedger, finalStats, applied.stats, { treasury: "events", food: "events", stability: "events" });
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
    lateLedger = book(lateLedger, "support", { rival: applied.popularity - finalStats.popularity });
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
      lateLedger = book(lateLedger, "support", { foreign: applied.popularity - finalStats.popularity });
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
      const mandate = Math.min(100, finalStats.stability + ELECTION_WIN_STABILITY_BONUS);
      lateLedger = book(lateLedger, "stability", { election: mandate - finalStats.stability });
      finalStats = { ...finalStats, stability: mandate };
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

  // 14. A political decision — see domain/decisions. Rolled on the first
  // day of every month, more often while the country is in a trouble that
  // has its own decision (a coal shortage, a housing protest...), judged on
  // the country as it stands at the end of today. Skipped if one is already
  // pending or the game just ended some other way. Popping up pauses the
  // game (see the isPaused line below) until the player picks an option.
  let pendingDecisionId = working.pendingDecisionId;
  if (!isGameOver && !pendingDecisionId && isFirstDayOfMonth(date)) {
    const today: GameState = { ...working, date, debt, stats: finalStats, resources: finalResources };
    if (Math.random() < getDecisionChance(today)) pendingDecisionId = pickDecision(today).id;
  }

  // The new month's own changes open its history, after the report on the
  // old one has been written.
  if (!isLedgerEmpty(lateLedger) || finalStats.population !== updatedStats.population) {
    finalHistory = [
      ...finalHistory,
      {
        date,
        income: 0,
        populationChange: finalStats.population - updatedStats.population,
        stabilityChange: finalStats.stability - updatedStats.stability,
        ledger: lateLedger,
      },
    ];
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
    unrestStage,
    resources: finalResources,
    market,
    factionApproval: finalFactionApproval,
    workforce,
    foreignPolitics,
    debt,
    events: events.slice(0, MAX_EVENT_LOG_LENGTH),
    history: finalHistory,
    pendingLedger: emptyLedger(),
    monthlyReports,
  };
}
