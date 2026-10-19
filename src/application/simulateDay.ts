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
//   7b uprisings  provinces rising, rebel strength, uprisings ending
//   - the day is recorded and the calendar turns (here)
//   8 newMonth    world events, the rival, the neighbours, the season
//   7c army      every country's regiments drill or march
//   8b neighbours the computer-run neighbours live a month, build, and recruit
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
import { tendUprisings } from "./day/uprisings";
import { runNeighbours } from "./day/neighbours";
import { drillTheArmy, enforceUltimatum } from "./day/army";
import { loseIsland } from "./loseProvince";
import { makePeace } from "./actions/warActions";
import { retakeProvince } from "./retakeProvince";
import { conquer, takeIsland } from "./takeIsland";
import { getIslandPeople } from "../domain/neighbours/treatyRules";
import { feel } from "../domain/neighbours/relationsRules";
import { getProvinceName } from "../domain/provinces/provinceRules";
import { RELATIONS_ISLAND_TAKEN } from "../domain/constants";
import { loseProvince } from "./loseProvince";
import { getNation } from "../domain/nations/nationRules";
import { moveSupport } from "./day/support";
import { generateMonthlyReport } from "./generateMonthlyReport";
import { advanceChapters } from "./chapters";
import { getOwnedProvinceIds } from "../domain/provinces/provinceRules";

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
  const uprisings = tendUprisings(day, working, { stability: order.stability, unrestStage: order.unrestStage, capacityByProvince, workforce: takings.workforce });
  working = { ...working, provinces: uprisings.provinces, placedBuildings: uprisings.placedBuildings, pendingDemand: uprisings.pendingDemand };
  // A province that broke away is let go, with its people; losing the
  // capital brings the government down with it.
  let population = people.population;
  for (const id of uprisings.lost) {
    population -= people.provinces[id]?.population ?? 0;
    working = loseProvince(working, id);
  }
  if (!isGameOver && uprisings.lost.includes(getNation(working.nationId).capitalProvinceId)) {
    isGameOver = true;
    outcome = "collapsed";
    gameOverReason = "The capital rose against the government and broke away, and the government fell with it.";
  }

  const updatedStats: CountryStats = {
    treasury: takings.treasury,
    population,
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
    populationChange: population - state.stats.population,
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

  // The neighbours' month (and any trade offer they write) comes before
  // the clock decides whether to stop for a letter.
  // Every regiment drills, marches or fights a day (see day/army.ts); a
  // province whose rebels are beaten comes back, with its people.
  // A neighbour's ultimatum may run out into war first (see day/army.ts).
  working = { ...working, ...enforceUltimatum(day, working) };
  const army = drillTheArmy(day, working, takings.treasury);
  const retakenPeople = army.retaken.reduce((sum, id) => sum + (working.freeProvinces[id]?.people ?? 0), 0);
  working = army.retaken.reduce((s, id) => retakeProvince(s, id), { ...working, regiments: army.regiments });
  working = { ...working, freeProvinces: army.freeProvinces, sieges: army.sieges };
  // Islands taken in war, by you or from you.
  let islandPeople = 0;
  for (const { islandId: id, by } of army.captured) {
    if (by === working.nationId) {
      // Theirs no longer, and they won't forget it.
      const holder = working.foreignIslands[id];
      islandPeople += getIslandPeople(id);
      working = conquer(takeIsland(working, id), id);
      working = { ...working, neighbours: { ...working.neighbours, [holder]: feel(working.neighbours[holder], RELATIONS_ISLAND_TAKEN, `You took ${getProvinceName(id)} from them`) } };
    } else {
      islandPeople -= working.provinces[id]?.population ?? 0;
      working = loseIsland(working, id, by);
      // It has what it came for, and makes peace.
      if (working.wars[by]?.byThem === id) working = makePeace(working, by);
    }
  }
  const endStats: CountryStats = { ...finalStats, population: Math.max(0, finalStats.population + retakenPeople + islandPeople) };
  const neighbourMonth = runNeighbours(day, working, date);

  return advanceChapters({
    ...working,
    date,
    // A choice of burdens stops the clock until one is taken.
    isPaused:
      isGameOver || pendingDecisionId || working.pendingDemand || neighbourMonth.pendingOffer || (neighbourMonth.ultimatum && !neighbourMonth.ultimatum.answered) || election.burdenOffer
        ? true
        : working.isPaused,
    isGameOver,
    outcome,
    gameOverReason,
    electionsWon: election.electionsWon,
    burdens: election.burdens,
    burdenOffer: election.burdenOffer,
    pendingDecisionId,
    stats: endStats,
    unrestStage: order.unrestStage,
    resources: month.resources,
    market: goods.market,
    factionApproval: month.factionApproval,
    workforce: takings.workforce,
    foreignPolitics: month.foreignPolitics,
    ...neighbourMonth,
    debt: goods.debt,
    events: day.events.slice(0, MAX_EVENT_LOG_LENGTH),
    history: finalHistory,
    // The provinces always add up to the national population.
    provinces: reconcileProvinces(
      working.provinces,
      getOwnedProvinceIds(working),
      endStats.population,
      getHousingCapacityByProvince(working),
      endStats.stability,
    ),
    pendingLedger: emptyLedger(),
    lastDayLedger: mergeLedgers(delta.ledger ?? emptyLedger(), day.late),
    monthlyReports,
  });
}
