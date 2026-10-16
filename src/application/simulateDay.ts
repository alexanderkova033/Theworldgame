// Use case: simulate a single in-game day. This is the daily tick, the one
// place allowed to call across every domain module, in order, to advance
// the whole country by one day. Each step lives in its own file under
// day/, sharing the day's log and ledger (see day/dayContext.ts). Never
// mutates the state it's given; always returns a new GameState.
//
//   1 buildings   projects, ventures, laws and research, repairs, breakdowns
//   2 goods       resources, the market, processing, heating, debt interest
//   3 money       taxes and industry in, wages out
//   4 food        farms and processing against what's eaten
//   - industry and political power (here: one line each)
//   5 order       stability, unrest, collapse
//   6 support     support drifts toward its target
//   7 people      births, deaths, migration, province unrest
//   - the day is recorded and the calendar turns (here)
//   8 newMonth    world events, the rival, the neighbours, the season
//   9 election    a general election, every so often
//   - a decision may arrive (here)
//   - a chapter may open, or be completed (chapters.ts)
import { advanceDay, isFirstDayOfMonth } from "../domain/country/calendar";
import type { CountryStats, DailyDelta, GameState } from "../domain/country/types";
import { MAX_EVENT_LOG_LENGTH } from "../domain/constants";
import { getDecisionChance, pickDecision } from "../domain/decisions/decisionRules";
import { getHousingCapacityByProvince, getNationalHomelessShare } from "../domain/housing/housingRules";
import { calculateIndustryOutput } from "../domain/industry/industryRules";
import { getLabourSituation } from "../domain/labour/labourRules";
import { emptyLedger, isLedgerEmpty, mergeLedgers } from "../domain/ledger/ledgerRules";
import { getNation } from "../domain/nations/nationRules";
import { calculateDailyPoliticalPower } from "../domain/politics/politicsRules";
import { reconcileProvinces } from "../domain/provinces/provincePopulation";
import { getUnrestIndustryMultiplier } from "../domain/unrest/unrestRules";
import { advanceBuildings } from "./day/buildings";
import { beginDay } from "./day/dayContext";
import { holdElection } from "./day/election";
import { feedThePeople } from "./day/food";
import { produceGoods } from "./day/goods";
import { payTheBills } from "./day/money";
import { turnOfTheMonth } from "./day/newMonth";
import { keepOrder } from "./day/order";
import { movePeople } from "./day/people";
import { moveSupport } from "./day/support";
import { generateMonthlyReport } from "./generateMonthlyReport";
import { advanceChapters } from "./chapters";

export function simulateDay(state: GameState): GameState {
  const day = beginDay(state);
  const { mods } = day;

  let working = advanceBuildings(day);
  // Staffed buildings run at the share of their jobs that can be filled:
  // each province's own people first (food, then schools, then factories),
  // then commuters from elsewhere (see labourRules.ts).
  const labour = getLabourSituation(working);
  const goods = produceGoods(day, working, labour);
  // Anyone without a roof weighs on stability and support, counted province
  // by province, since a free home elsewhere is no use to them.
  const capacityByProvince = getHousingCapacityByProvince(working);
  const homelessShare = getNationalHomelessShare(working);
  const takings = payTheBills(day, working);
  const harvest = feedThePeople(day, working, labour, goods.processedFood);

  // Industry comes from staffed factories, scaled by laws and research, and
  // by unrest: discontent slows it, strikes stop factories.
  const industry =
    calculateIndustryOutput(labour.staffed.factories) * mods.industryMultiplier * getUnrestIndustryMultiplier(working.unrestStage, takings.workforce.police);
  // Political power builds up, faster for a popular government.
  const politicalPower = working.stats.politicalPower + calculateDailyPoliticalPower(working.stats.popularity, mods.politicalPowerMultiplier);

  const statsWithFood: CountryStats = { ...working.stats, food: harvest.food };
  const order = keepOrder(day, working, {
    statsWithFood,
    isShortage: harvest.isShortage,
    debt: goods.debt,
    homelessShare,
    unheatedShare: goods.unheatedShare,
    police: takings.workforce.police,
  });
  let isGameOver = working.isGameOver;
  let outcome = working.outcome;
  let gameOverReason = working.gameOverReason;
  if (order.collapsed) {
    isGameOver = true;
    outcome = "collapsed";
    gameOverReason = "Stability collapsed entirely. Order broke down, and the government fell.";
  }

  const support = moveSupport(day, working, {
    isShortage: harvest.isShortage,
    homelessShare,
    unheatedShare: goods.unheatedShare,
    unemploymentShare: labour.unemploymentShare,
    stability: order.stability,
    debt: goods.debt,
  });
  const people = movePeople(day, working, {
    statsWithFood,
    stability: order.stability,
    isShortage: harvest.isShortage,
    capacityByProvince,
    unheatedShare: goods.unheatedShare,
    labour,
    unrestStage: order.unrestStage,
    homelessShare,
  });
  working = { ...working, provinces: people.provinces };

  const updatedStats: CountryStats = {
    treasury: takings.treasury,
    population: people.population,
    food: harvest.food,
    industry,
    stability: order.stability,
    politicalPower,
    popularity: support.popularity,
  };

  // Record today's changes for the monthly report.
  const delta: DailyDelta = {
    date: state.date,
    income: takings.income,
    populationChange: people.population - state.stats.population,
    stabilityChange: order.stability - state.stats.stability,
    // Player actions since the last tick count toward today.
    ledger: mergeLedgers(state.pendingLedger, day.ledger),
  };
  const history = [...working.history, delta];

  // The calendar turns; a new month gets the old one's report.
  const date = advanceDay(state.date);
  let monthlyReports = working.monthlyReports;
  let finalHistory = history;
  if (isFirstDayOfMonth(date)) {
    monthlyReports = [generateMonthlyReport(date, history), ...monthlyReports];
    finalHistory = [];
  }

  const month = turnOfTheMonth(day, working, date, {
    stats: updatedStats,
    resources: goods.resources,
    factionApproval: support.factionApproval,
    foreignPolitics: working.foreignPolitics,
    isGameOver,
    factionWeights: support.factionWeights,
  });
  const election = holdElection(day, working, date, { isGameOver, supportAtDawn: updatedStats.popularity, stats: month.stats });
  if (election.ended) {
    isGameOver = true;
    outcome = election.ended.outcome;
    gameOverReason = election.ended.reason;
  }
  const finalStats = election.stats;

  // A political decision (see domain/decisions), rolled on the first day of
  // every month, more often while the country is in a trouble that has its
  // own decision (a coal shortage, a housing protest...), judged on the
  // country as it stands at the end of today. Skipped if one is already
  // pending or the game just ended. Popping up pauses the game until the
  // player picks an option.
  let pendingDecisionId = working.pendingDecisionId;
  if (!isGameOver && !pendingDecisionId && isFirstDayOfMonth(date)) {
    const today: GameState = { ...working, date, debt: goods.debt, stats: finalStats, resources: month.resources };
    if (Math.random() < getDecisionChance(today)) pendingDecisionId = pickDecision(today).id;
  }

  // The new month's own changes open its history, after the report on the
  // old one has been written.
  if (!isLedgerEmpty(day.late) || finalStats.population !== updatedStats.population) {
    finalHistory = [
      ...finalHistory,
      {
        date,
        income: 0,
        populationChange: finalStats.population - updatedStats.population,
        stabilityChange: finalStats.stability - updatedStats.stability,
        ledger: day.late,
      },
    ];
  }

  return advanceChapters({
    ...working,
    date,
    isPaused: isGameOver || pendingDecisionId ? true : working.isPaused,
    isGameOver,
    outcome,
    gameOverReason,
    electionsWon: election.electionsWon,
    pendingDecisionId,
    stats: finalStats,
    unrestStage: order.unrestStage,
    resources: month.resources,
    market: goods.market,
    factionApproval: month.factionApproval,
    workforce: takings.workforce,
    foreignPolitics: month.foreignPolitics,
    debt: goods.debt,
    events: day.events.slice(0, MAX_EVENT_LOG_LENGTH),
    history: finalHistory,
    // The provinces always add up to the national population.
    provinces: reconcileProvinces(
      working.provinces,
      getNation(working.nationId).provinceIds,
      finalStats.population,
      getHousingCapacityByProvince(working),
      finalStats.stability,
    ),
    pendingLedger: emptyLedger(),
    lastDayLedger: mergeLedgers(delta.ledger ?? emptyLedger(), day.late),
    monthlyReports,
  });
}
