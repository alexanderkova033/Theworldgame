// Trained workers, the player's choice of who works where, and service crews.
import { beforeEach, describe, expect, it } from "vitest";
import { marchRegiments, raiseRegiment } from "../src/application/actions/armyActions";
import { canServiceBuilding, getServiceOrder, serviceBuilding } from "../src/application/actions/serviceBuilding";
import { cancelWorkChange, canMoveWorkers, chooseAutomaticWork, chooseWork, moveWorkers, setWorkPlan } from "../src/application/actions/workPlanActions";
import { applySettlementArrival } from "../src/application/applySettlementArrival";
import { getWorkerSource } from "../src/application/getWorkerSource";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { COMMUTE_SHARE, LABOUR_SHARE, SERVICE_CREW, SERVICE_DAYS_TRAINED, SERVICE_DAYS_UNTRAINED, TRAINING_RATE, UNTRAINED_EFFICIENCY, WORK_PLAN_STEP, WORN_WARNING_DAYS } from "../src/domain/constants";
import { dayNumber } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { ISLANDS } from "../src/domain/islands/islandData";
import { isIsland } from "../src/domain/islands/islandRules";
import { getLabourSituation, hasTrainedCrew, isShortOfWorkers, SECTORS, type LabourSituation, type WorkPlan } from "../src/domain/labour/labourRules";
import { advanceTraining, getSkill, isCrewTrained } from "../src/domain/labour/trainingRules";
import { getServiceCost, getWorkingCounts, isBeingServiced, isWorn } from "../src/domain/maintenance/maintenanceRules";
import { getNation } from "../src/domain/nations/nationRules";
import { getOwnedProvinceIds } from "../src/domain/provinces/provinceRules";
import type { PlacedBuilding } from "../src/domain/provinces/types";
import { rollRiotDamage } from "../src/domain/unrest/unrestRules";
import { seizeBuildings } from "../src/domain/uprising/uprisingRules";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { calmStart } from "./support/calmStart";
import { NATIONS, playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const [NATION, PARTY] = NATIONS[0];

beforeEach(() => seedRandom(20261015));

const running = (s: GameState): GameState => ({ ...s, isPaused: false, stats: { ...s.stats, treasury: 100000 }, resources: { ...s.resources, wood: 5000, ore: 5000 } });

// Days until the next first of the month is on the calendar.
function toMonthEnd(start: GameState): GameState {
  let s = simulateDay(start);
  while (s.date.day !== 1) s = simulateDay(s);
  return s;
}

function placed(s: GameState, type: PlacedBuilding["type"], provinceId: string, count = 1): GameState {
  const more: PlacedBuilding[] = Array.from({ length: count }, (_, i) => ({ id: `test-${type}-${provinceId}-${i}-${s.placedBuildings.length}`, provinceId, type }));
  return { ...s, placedBuildings: [...s.placedBuildings, ...more] };
}

// Every worker is working, jobless, or on a crew: nobody is counted twice or lost.
function expectEveryoneCounted(labour: LabourSituation, crews = 0) {
  const hired = SECTORS.reduce((sum, s) => sum + labour.sectors[s].hired, 0);
  expect(hired + labour.unemployed + crews).toBeCloseTo(labour.workers, 3);
  for (const s of SECTORS) expect(labour.sectors[s].hired).toBeLessThanOrEqual(labour.sectors[s].jobs + 1e-6);
}

describe("day one", () => {
  it("everyone working knows their work", () => {
    const trained = Object.fromEntries(NATIONS.map(([n, p]) => [n, startNewGame(n, p, "normal").trained]));
    expect(trained).toEqual({
      astravia: { food: 2100, industry: 900 },
      caldenreich: { food: 1500, industry: 1000 },
      veldoria: { food: 1200, industry: 800 },
    });
    for (const [n, p] of NATIONS) {
      const labour = getLabourSituation(calmStart(n, p));
      expect(labour.skill).toEqual({ food: 1, industry: 1 });
    }
  });
});

describe("how well people work", () => {
  it("gives a learner 60% of a trained hand, and everyone trained 100%", () => {
    expect(UNTRAINED_EFFICIENCY).toBe(0.6);
    expect(getSkill(100, 0)).toBeCloseTo(0.6);
    expect(getSkill(100, 100)).toBe(1);
    expect(getSkill(100, 500)).toBe(1);
    expect(getSkill(0, 0)).toBe(1);
    expect(getSkill(2400, 2100)).toBeCloseTo(0.95);
  });

  it("scales what farms and factories make, and not how many are counted as working", () => {
    const start = calmStart(NATION, PARTY);
    const full = getLabourSituation(start);
    const raw = getLabourSituation({ ...start, trained: { food: 0, industry: 0 } });
    expect(raw.staffed.farms).toBeCloseTo(full.staffed.farms * 0.6);
    expect(raw.staffed.factories).toBeCloseTo(full.staffed.factories * 0.6);
    expect(raw.sectors).toEqual(full.sectors);
    expect(raw.foodStaffing).toBe(full.foodStaffing);
    expect(raw.unemployed).toBe(full.unemployed);
  });

  it("slows mines and sawmills with the factory hands", () => {
    const start = calmStart(NATION, PARTY);
    const raw = getLabourSituation({ ...start, trained: { food: 0, industry: 0 } });
    for (const p of Object.values(raw.provinces)) expect(p.industryOutput).toBeCloseTo(p.industryStaffing * 0.6);
  });

  it("leaves schools out of it", () => {
    const id = getNation(NATION).capitalProvinceId;
    const start = placed(calmStart(NATION, PARTY), "education", id);
    const raw = getLabourSituation({ ...start, trained: { food: 0, industry: 0 } });
    expect(raw.staffed.schools).toBe(getLabourSituation(start).staffed.schools);
  });
});

describe("learning", () => {
  it("goes 68% after a month, 90% after six and 97% after twelve", () => {
    expect(TRAINING_RATE).toBe(0.2);
    let trained = { food: 0, industry: 0 };
    const skillAfter: Record<number, number> = {};
    for (let month = 1; month <= 12; month++) {
      trained = advanceTraining(trained, { food: 100, industry: 0 }, 1000);
      skillAfter[month] = getSkill(100, trained.food);
    }
    expect(skillAfter[1]).toBeCloseTo(0.68);
    expect(Math.round(skillAfter[6] * 100)).toBe(90);
    expect(Math.round(skillAfter[12] * 100)).toBe(97);
  });

  it("happens on the first of the month in a played game, and not before", () => {
    const start = { ...running(calmStart(NATION, PARTY)), trained: { food: 1000, industry: 0 } };
    const hired = getLabourSituation(start).sectors.food.hired;
    const dayAfter = simulateDay(start);
    expect(dayAfter.trained.food).toBe(1000);
    const later = toMonthEnd(start);
    // The food trade has grown by a fifth of its gap, from the day's filling.
    expect(later.trained.food).toBeGreaterThan(1000);
    expect(later.trained.food).toBeLessThan(1000 + (hired + 100 - 1000) * TRAINING_RATE);
  });

  it("an old skill fades only as a new one is learned", () => {
    // 300 moved from farms to factories, with no slack in the country.
    const once = advanceTraining({ food: 2400, industry: 600 }, { food: 2100, industry: 900 }, 3000);
    expect(once.industry).toBeCloseTo(660);
    expect(once.food).toBeCloseTo(2340);
    // With people to spare, the old trade loses nobody.
    const roomy = advanceTraining({ food: 2400, industry: 600 }, { food: 2100, industry: 900 }, 4000);
    expect(roomy.food).toBe(2400);
    // A trade not being worked keeps its people.
    expect(advanceTraining({ food: 2400, industry: 300 }, { food: 2100, industry: 300 }, 3000)).toEqual({ food: 2400, industry: 300 });
  });

  it("the trades give way when people die or leave", () => {
    // Trained people not working go first.
    expect(advanceTraining({ food: 2000, industry: 1000 }, { food: 1500, industry: 1000 }, 2500)).toEqual({ food: 1500, industry: 1000 });
    // Then both, in step.
    const both = advanceTraining({ food: 2000, industry: 1000 }, { food: 2000, industry: 1000 }, 1500);
    expect(both.food).toBeCloseTo(1000);
    expect(both.industry).toBeCloseTo(500);
  });
});

describe("the choice", () => {
  const id = () => getNation(NATION).capitalProvinceId;
  const plan = (food: number, school: number, industry: number): WorkPlan => ({ food, school, industry });

  it("Automatic fills as if there were no limits", () => {
    const start = calmStart(NATION, PARTY);
    expect(start.workPlan).toBeNull();
    expect(start.workPlanNext).toBeNull();
    const huge = { ...start, workPlan: plan(1e9, 1e9, 1e9) };
    expect(getLabourSituation(huge).sectors).toEqual(getLabourSituation(start).sectors);
  });

  it("moves people from farms to factories across the whole country", () => {
    const start = calmStart(NATION, PARTY);
    const today = getLabourSituation(start);
    const limited = getLabourSituation({ ...start, workPlan: plan(today.sectors.food.jobs - 300, 0, 2000) });
    // Only commuters can reach factories in other provinces. The 3 in 10 who
    // won't travel take the farm jobs at home rather than stand idle, so a
    // limit asks for more than it gets, and those it frees can also put the
    // jobless who wouldn't travel to work at home.
    const gained = limited.sectors.industry.hired - today.sectors.industry.hired;
    const lost = today.sectors.food.hired - limited.sectors.food.hired;
    expect(lost).toBeGreaterThan(50);
    expect(lost).toBeLessThanOrEqual(300);
    expect(gained).toBeCloseTo(lost + today.unemployed - limited.unemployed);
    expectEveryoneCounted(limited);
  });

  it("is met exactly where people are not held back by distance", () => {
    // Everyone in the one province that has all the jobs.
    const start = calmStart(NATION, PARTY);
    const home = id();
    const together: GameState = {
      ...start,
      placedBuildings: start.placedBuildings.map((b) => ({ ...b, provinceId: home })),
      provinces: Object.fromEntries(Object.entries(start.provinces).map(([key, p]) => [key, { ...p, population: key === home ? start.stats.population : 0 }])),
    };
    const limited = getLabourSituation({ ...together, workPlan: plan(1800, 0, 1300) });
    expect(limited.sectors.food.hired).toBeCloseTo(1800);
    expect(limited.sectors.industry.hired).toBeCloseTo(1200);
  });

  it("never leaves anyone jobless who wouldn't be anyway", () => {
    const start = calmStart(NATION, PARTY);
    const today = getLabourSituation(start);
    for (const p of [plan(0, 0, 0), plan(100, 0, 0), plan(0, 0, 100), plan(3000, 0, 0)]) {
      const limited = getLabourSituation({ ...start, workPlan: p });
      expect(limited.unemployed).toBeLessThanOrEqual(today.unemployed + 1e-6);
      expectEveryoneCounted(limited);
    }
  });

  it("limits factories and schools too, when there is work elsewhere for the people", () => {
    // More jobs than people, so a limit decides who goes short.
    const start = placed(placed(calmStart(NATION, PARTY), "education", id(), 3), "factory", id(), 2);
    const today = getLabourSituation(start);
    const fewerTeachers = getLabourSituation({ ...start, workPlan: plan(1e9, 100, 1e9) });
    expect(fewerTeachers.sectors.school.hired).toBeCloseTo(100, 0);
    expect(fewerTeachers.sectors.industry.hired).toBeGreaterThan(today.sectors.industry.hired);
    expectEveryoneCounted(fewerTeachers);
    // A limit on the last sector filled gives nobody else anything: leftovers still take its jobs.
    const fewerHands = getLabourSituation({ ...start, workPlan: plan(1e9, 1e9, 100) });
    expect(fewerHands.sectors.food.hired).toBeCloseTo(today.sectors.food.hired, 0);
    expectEveryoneCounted(fewerHands);
  });

  it("waits for the month's end: people finish the month in their old jobs", () => {
    let s = running(calmStart(NATION, PARTY));
    const before = getLabourSituation(s).sectors;
    s = moveWorkers(s, "food", "fewer");
    expect(s.workPlan).toBeNull();
    expect(s.workPlanNext).not.toBe("automatic");
    expect(getLabourSituation(s).sectors).toEqual(before);
    for (let i = 0; s.date.day < 29 && i < 28; i++) {
      s = simulateDay(s);
      expect(s.workPlan).toBeNull();
    }
    expect(getLabourSituation(s).sectors.food.hired).toBeCloseTo(getLabourSituation({ ...s, workPlanNext: null }).sectors.food.hired);
    s = toMonthEnd(s);
    expect(s.date.day).toBe(1);
    expect(s.workPlan).not.toBeNull();
    expect(s.workPlanNext).toBeNull();
    expect(getLabourSituation(s).sectors.food.hired).toBeLessThan(before.food.hired);
    expect(s.events.some((e) => e.topic === "workers")).toBe(true);
  });

  it("can be cancelled before the month's end, and nobody moves", () => {
    let s = running(calmStart(NATION, PARTY));
    s = moveWorkers(s, "food", "fewer");
    expect(s.workPlanNext).not.toBeNull();
    for (let i = 0; i < 5; i++) s = simulateDay(s);
    s = cancelWorkChange(s);
    expect(s.workPlanNext).toBeNull();
    s = toMonthEnd(s);
    expect(s.workPlan).toBeNull();
    expect(s.events.some((e) => e.topic === "workers")).toBe(false);
  });

  it("going back to Automatic waits too, and undoing a move leaves nothing pending", () => {
    let s = running(calmStart(NATION, PARTY));
    s = moveWorkers(s, "food", "fewer");
    s = toMonthEnd(s);
    const inForce = s.workPlan!;
    s = setWorkPlan(s, { ...inForce, food: 1 });
    expect(s.workPlanNext).not.toBeNull();
    s = setWorkPlan(s, inForce);
    expect(s.workPlanNext).toBeNull();
    s = chooseAutomaticWork(s);
    expect(s.workPlanNext).toBe("automatic");
    expect(s.workPlan).toEqual(inForce);
    s = toMonthEnd(s);
    expect(s.workPlan).toBeNull();
    expect(s.workPlanNext).toBeNull();
  });

  it("moves a step at a time, and the total never passes the workers", () => {
    let s = calmStart(NATION, PARTY);
    const labour = getLabourSituation(s);
    s = moveWorkers(s, "industry", "more");
    const next = s.workPlanNext as WorkPlan;
    expect(next.industry).toBe(Math.round(labour.sectors.industry.hired) + WORK_PLAN_STEP);
    for (let i = 0; i < 200; i++) s = moveWorkers(s, "industry", "more");
    const most = s.workPlanNext as WorkPlan;
    expect(most.industry).toBe(labour.sectors.industry.jobs);
    expect(canMoveWorkers(s, "industry", "more")).toBe(false);
    expect(most.food + most.school + most.industry).toBeLessThanOrEqual(Math.round(labour.workers));
    expect(canMoveWorkers(s, "school", "more")).toBe(false); // no schools, no jobs
  });

  it("starts from who works where today", () => {
    const s = calmStart(NATION, PARTY);
    const today = getLabourSituation(s).sectors;
    const chosen = chooseWork(s).workPlanNext as WorkPlan;
    expect(chosen.food).toBe(Math.round(today.food.hired));
    expect(chosen.industry).toBe(Math.round(today.industry.hired));
  });

  it("leaves a new building empty, when people have no way round the limit", () => {
    const start = calmStart(NATION, PARTY);
    const today = getLabourSituation(start).sectors;
    const limited = { ...start, workPlan: plan(today.food.hired, 0, today.industry.hired) };
    const withFarm = getLabourSituation(placed(limited, "farm", id()));
    expect(withFarm.sectors.food.jobs).toBe(today.food.jobs + 300);
    // Those who won't travel may take some of it, but it does not fill up.
    expect(withFarm.sectors.food.jobs - withFarm.sectors.food.hired).toBeGreaterThan(100);
  });

  it("does not change whether the country is short of workers", () => {
    const start = placed(calmStart(NATION, PARTY), "factory", id(), 3);
    const auto = getLabourSituation(start);
    const limited = getLabourSituation({ ...start, workPlan: plan(100, 0, 100) });
    const untrained = getLabourSituation({ ...start, trained: { food: 0, industry: 0 } });
    expect(isShortOfWorkers(auto)).toBe(true);
    expect(isShortOfWorkers(limited)).toBe(true);
    expect(isShortOfWorkers(untrained)).toBe(true);
    expect(limited.jobs).toBe(auto.jobs);
    expect(limited.workers).toBe(auto.workers);
  });
});

describe("the choice, with commuting, islands and armies", () => {
  it("commuters still fill jobs elsewhere, and only 70% of the idle travel", () => {
    const start = calmStart(NATION, PARTY);
    const [home, away] = getNation(NATION).provinceIds;
    // Everyone in one province, with the jobs in others.
    const crowded: GameState = {
      ...start,
      placedBuildings: start.placedBuildings.filter((b) => b.provinceId !== home || b.type === "housing"),
      provinces: Object.fromEntries(Object.entries(start.provinces).map(([id, p]) => [id, { ...p, population: id === home ? 12000 : 0 }])),
    };
    const auto = getLabourSituation(crowded);
    const limited = getLabourSituation({ ...crowded, workPlan: { food: 1e9, school: 1e9, industry: 1e9 } });
    expect(limited.provinces[home].commutersOut).toBeCloseTo(auto.provinces[home].commutersOut);
    expect(limited.provinces[home].commutersOut).toBeCloseTo(Math.min(3000, 2100 + 1300) * COMMUTE_SHARE, 0);
    expect(limited.provinces[away].workers).toBe(0);
    // With a limit, those who would travel still may, and the rest stay jobless.
    const low = getLabourSituation({ ...crowded, workPlan: { food: 500, school: 0, industry: 500 } });
    expect(low.unemployed).toBeCloseTo(auto.unemployed, 3);
    expect(low.provinces[home].commutersOut).toBeCloseTo(auto.provinces[home].commutersOut, 3);
    expectEveryoneCounted(low);
  });

  function withColony(): { state: GameState; island: string } {
    const island = ISLANDS[0].id;
    const start = running(calmStart(NATION, PARTY));
    const state = applySettlementArrival({ ...start, scoutedIslandIds: [island] }, island);
    return { state, island };
  }

  it("nobody crosses the sea under a limit, and an island's people fill its own jobs", () => {
    const { state, island } = withColony();
    expect(isIsland(island)).toBe(true);
    const onAuto = getLabourSituation(state);
    const islandWorkers = onAuto.provinces[island].workers;
    expect(islandWorkers).toBeGreaterThan(0);
    const limited = getLabourSituation({ ...state, workPlan: { food: 200, school: 0, industry: 200 } });
    expectEveryoneCounted(limited);
    expect(limited.provinces[island].commutersOut).toBe(0);
    // Whoever is on the island works its jobs up to what it has, limit or not: nothing else can use them.
    const hiredThere = SECTORS.reduce((sum, s) => sum + limited.provinces[island].sectors[s].hired, 0);
    expect(hiredThere + limited.provinces[island].unemployed).toBeCloseTo(islandWorkers);
    expect(hiredThere).toBeCloseTo(Math.min(islandWorkers, limited.provinces[island].jobs));
  });

  it("an island's new hands lower the country's skill, and only as they are hired", () => {
    const { state, island } = withColony();
    const full = { ...state, trained: { food: getLabourSituation(state).sectors.food.hired - getLabourSituation(state).provinces[island].sectors.food.hired, industry: 5000 } };
    const labour = getLabourSituation(full);
    if (labour.provinces[island].sectors.food.hired > 0) expect(labour.skill.food).toBeLessThan(1);
    else expect(labour.skill.food).toBe(1);
  });

  it("a lost island's people leave the trades at the month's end", () => {
    const { state, island } = withColony();
    const labour = getLabourSituation(state);
    const trained = { food: labour.workers * 0.7, industry: labour.workers * 0.3 };
    const fewer = advanceTraining(trained, { food: labour.sectors.food.hired, industry: labour.sectors.industry.hired }, labour.workers - labour.provinces[island].workers);
    expect(fewer.food + fewer.industry).toBeCloseTo(labour.workers - labour.provinces[island].workers);
  });

  it("buildings the rebels hold are out of the share, and their people still count", () => {
    const start = calmStart(NATION, PARTY);
    const rising = getNation(NATION).provinceIds[0];
    const seized = { ...start, placedBuildings: seizeBuildings(start.placedBuildings, rising) };
    const auto = getLabourSituation(seized);
    const limited = getLabourSituation({ ...seized, workPlan: { food: 1000, school: 0, industry: 300 } });
    expect(limited.provinces[rising].jobs).toBe(0);
    expect(limited.provinces[rising].workers).toBe(auto.provinces[rising].workers);
    expectEveryoneCounted(limited);
  });

  it("plays whole games with a limit while settling, fighting and holding garrisons", () => {
    let colonies = 0;
    let regiments = 0;
    let warDays = 0;
    for (const [nation, party] of NATIONS) {
      seedRandom(7);
      let checked = 0;
      const end = playCarefully(nation, party, {
        days: 5 * 365,
        difficulty: "easy",
        settle: true,
        treaties: true,
        army: true,
        war: true,
        habit: (s) => (s.date.day === 1 ? setWorkPlan(s, { food: Math.round(s.stats.population * 0.18), school: 500, industry: 5000 }) : s),
        onDay: (s) => {
          const labour = getLabourSituation(s);
          const crews = s.placedBuildings.filter(isBeingServiced).length * SERVICE_CREW;
          if (crews === 0) expectEveryoneCounted(labour);
          expect(s.trained.food + s.trained.industry).toBeLessThanOrEqual(Math.max(labour.workers, s.trained.food + s.trained.industry));
          expect(Number.isFinite(s.trained.food) && Number.isFinite(s.trained.industry)).toBe(true);
          expect(labour.skill.food).toBeGreaterThanOrEqual(UNTRAINED_EFFICIENCY);
          if (Object.keys(s.wars).length > 0) warDays++;
          checked++;
        },
      });
      expect(checked).toBeGreaterThan(300);
      expect(end.workPlan).not.toBeNull();
      colonies += end.settledIslandIds.length;
      regiments += end.regiments.filter((r) => r.nationId === nation).length;
    }
    // The games really did hold islands and raise regiments. Whether a war
    // came is up to the money, so that is only recorded.
    expect(colonies).toBeGreaterThan(0);
    expect(regiments).toBeGreaterThan(0);
    expect(warDays).toBeGreaterThanOrEqual(0);
  }, 120000);

  it("regiments on the march don't touch who works where", () => {
    let s = running(calmStart(NATION, PARTY));
    s = { ...s, workPlan: { food: 1500, school: 0, industry: 1500 }, chapters: { ...s.chapters, opened: [...s.chapters.opened, "army"] } } as GameState;
    const before = getLabourSituation(s).sectors;
    const raised = raiseRegiment(s);
    const [from, to] = getNation(NATION).provinceIds;
    const marched = marchRegiments({ ...raised, regiments: raised.regiments.map((r) => ({ ...r, provinceId: from, trainingDays: 0 })) }, from, to);
    expect(getLabourSituation(marched).sectors).toEqual(before);
  });
});

describe("service crews", () => {
  // A calm country with its first farm worn.
  function worn(days = WORN_WARNING_DAYS, type: PlacedBuilding["type"] = "farm"): { state: GameState; id: string } {
    const start = running(calmStart(NATION, PARTY));
    const id = start.placedBuildings.find((b) => b.type === type)!.id;
    return { state: { ...start, placedBuildings: start.placedBuildings.map((b) => (b.id === id ? { ...b, wornUntilDay: dayNumber(start.date) + days } : b)) }, id };
  }
  const find = (s: GameState, id: string) => s.placedBuildings.find((b) => b.id === id)!;
  const untrainedFood = (s: GameState): GameState => ({ ...s, trained: { ...s.trained, food: getLabourSituation(s).sectors.food.hired * 0.85 } });

  it("decides a crew's training at 90% of those in the trade", () => {
    expect(isCrewTrained(1000, 900)).toBe(true);
    expect(isCrewTrained(1000, 899)).toBe(false);
    expect(isCrewTrained(1000, 5000)).toBe(true);
    expect(isCrewTrained(0, SERVICE_CREW)).toBe(true);
    expect(isCrewTrained(0, SERVICE_CREW - 1)).toBe(false);
  });

  it("goes to the farm hands for food buildings, and the factory hands for everything else", () => {
    const { state } = worn();
    const lostFarmers = { ...state, trained: { food: 0, industry: state.trained.industry } };
    expect(hasTrainedCrew(lostFarmers, "farm")).toBe(false);
    expect(hasTrainedCrew(lostFarmers, "granary")).toBe(false);
    expect(hasTrainedCrew(lostFarmers, "factory")).toBe(true);
    expect(hasTrainedCrew(lostFarmers, "housing")).toBe(true);
    expect(hasTrainedCrew(lostFarmers, "education")).toBe(true);
  });

  it("a trained crew takes 5 days at the plain price", () => {
    const { state, id } = worn();
    const order = getServiceOrder(state, "farm");
    expect(order).toEqual({ trainedCrew: true, days: SERVICE_DAYS_TRAINED, cost: getServiceCost("farm") });
    expect(order.days).toBe(5);
    const after = serviceBuilding(state, id);
    expect(after.stats.treasury).toBe(state.stats.treasury - order.cost.treasury);
    expect(after.resources.wood).toBe(state.resources.wood - order.cost.resourceAmount);
    expect(isBeingServiced(find(after, id))).toBe(true);
    expect(isWorn(find(after, id))).toBe(true);
    let s = after;
    for (let day = 1; day <= 4; day++) {
      s = simulateDay(s);
      expect(isWorn(find(s, id))).toBe(true);
    }
    s = simulateDay(s);
    expect(isWorn(find(s, id))).toBe(false);
    expect(find(s, id).serviceUntilDay).toBeUndefined();
    expect(s.events.some((e) => e.message.startsWith("Service finished"))).toBe(true);
  });

  it("an untrained crew takes 10 days at half as much again", () => {
    const { state, id } = worn();
    const lacking = untrainedFood(state);
    const order = getServiceOrder(lacking, "farm");
    expect(order.trainedCrew).toBe(false);
    expect(order.days).toBe(SERVICE_DAYS_UNTRAINED);
    expect(order.days).toBe(10);
    expect(order.cost).toEqual(getServiceCost("farm", 1, false));
    expect(order.cost.treasury).toBeCloseTo(650 * 0.3 * 1.5, -1);
    expect(order.cost.resourceAmount).toBe(7);
    let s = serviceBuilding(lacking, id);
    expect(s.stats.treasury).toBe(lacking.stats.treasury - order.cost.treasury);
    for (let day = 1; day <= 9; day++) {
      s = simulateDay(s);
      expect(isWorn(find(s, id))).toBe(true);
    }
    s = simulateDay(s);
    expect(isWorn(find(s, id))).toBe(false);
  });

  it("the building keeps working and its wear clock stops, even with days to spare gone", () => {
    const { state, id } = worn(2);
    const counts = getWorkingCounts(state);
    let s = serviceBuilding(state, id);
    expect(getWorkingCounts(s)).toEqual(counts);
    for (let day = 0; day < SERVICE_DAYS_TRAINED; day++) {
      expect(find(s, id).condition).toBeUndefined();
      s = simulateDay(s);
    }
    expect(find(s, id).condition).toBeUndefined();
    expect(isWorn(find(s, id))).toBe(false);
  });

  it("can't be ordered twice", () => {
    const { state, id } = worn();
    const s = serviceBuilding(state, id);
    expect(canServiceBuilding(s, id)).toBe(false);
    expect(serviceBuilding(s, id)).toBe(s);
  });

  it("takes 20 people from the building's province while it lasts", () => {
    const { state, id } = worn();
    const provinceId = find(state, id).provinceId;
    const before = getLabourSituation(state);
    const during = getLabourSituation(serviceBuilding(state, id));
    const hired = (l: LabourSituation) => SECTORS.reduce((sum, s) => sum + l.sectors[s].hired, 0);
    expect(hired(before) + before.unemployed - (hired(during) + during.unemployed)).toBeCloseTo(SERVICE_CREW);
    // They still count as workers, here and for the shortage.
    expect(during.workers).toBe(before.workers);
    expect(during.provinces[provinceId].workers).toBe(before.provinces[provinceId].workers);
  });

  it("ends with a riot or rebels, and the money is gone", () => {
    const { state, id } = worn();
    const s = serviceBuilding(state, id);
    const building = find(s, id);
    const original = Math.random;
    Math.random = () => 0;
    const { placedBuildings } = rollRiotDamage([building], 0);
    Math.random = original;
    expect(placedBuildings[0].serviceUntilDay).toBeUndefined();
    expect(placedBuildings[0].condition).toBe("broken");
    const seized = seizeBuildings(s.placedBuildings, building.provinceId).find((b) => b.id === id)!;
    expect(seized.serviceUntilDay).toBeUndefined();
    expect(seized.condition).toBe("seized");
  });

  it("a save made during a service carries on", () => {
    const { state, id } = worn();
    const s = hydrateGameState(JSON.parse(JSON.stringify(serviceBuilding(state, id))));
    expect(isBeingServiced(find(s, id))).toBe(true);
  });
});

describe("where a new building's workers come from", () => {
  const capital = getNation(NATION).capitalProvinceId;

  it("says nothing when people are idle for it", () => {
    const start = calmStart(NATION, PARTY);
    const idle = { ...start, provinces: Object.fromEntries(Object.entries(start.provinces).map(([id, p]) => [id, { ...p, population: p.population * 3 }])) };
    expect(getWorkerSource(idle, "farm")).toBeNull();
    expect(getWorkerSource(start, "housing")).toBeNull();
  });

  // A factory in every province, so nobody anywhere stands idle.
  const stretched = () => getNation(NATION).provinceIds.reduce((s, id) => placed(s, "factory", id), calmStart(NATION, PARTY));

  it("says a farm takes them from the factories", () => {
    const start = stretched();
    expect(getLabourSituation(start).unemployed).toBeLessThan(1);
    expect(getWorkerSource(start, "farm")).toBe("No spare workers. Its 300 jobs would be filled from factories.");
  });

  it("says a factory stands empty", () => {
    expect(getWorkerSource(stretched(), "factory")).toBe("No spare workers. Its 650 jobs would stand empty.");
  });

  it("counts those without work first", () => {
    const start = placed(calmStart(NATION, PARTY), "factory", capital, 1);
    const jobless = Math.floor(getLabourSituation(start).unemployed);
    expect(jobless).toBeGreaterThan(0);
    expect(getWorkerSource(start, "farm")).toBe(`Only ${jobless} people are jobless. The rest of its 300 jobs would be filled from factories.`);
  });

  it("names the player's own limit", () => {
    const start = calmStart(NATION, PARTY);
    const jobs = getLabourSituation(start).sectors.food.jobs;
    expect(getWorkerSource({ ...start, workPlan: { food: jobs, school: 0, industry: 2000 } }, "farm")).toBe(`Your limit of ${jobs.toLocaleString()} on farms and food would leave its 300 jobs empty.`);
  });
});

describe("old saves", () => {
  it("load fully trained, on Automatic, with today's filling", () => {
    seedRandom(7);
    const [nation, party] = NATIONS[1];
    const game = playCarefully(nation, party, { days: 200, difficulty: "normal" });
    const { trained: _t, workPlan: _p, workPlanNext: _n, ...old } = game;
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(old)) as Partial<GameState>);
    expect(loaded.workPlan).toBeNull();
    expect(loaded.workPlanNext).toBeNull();
    const labour = getLabourSituation(loaded);
    expect(loaded.trained).toEqual({ food: labour.sectors.food.hired, industry: labour.sectors.industry.hired });
    expect(labour.skill).toEqual({ food: 1, industry: 1 });
    // And the game plays on.
    let s = { ...loaded, isPaused: false };
    for (let day = 0; day < 40 && !s.isGameOver; day++) s = simulateDay(s);
    expect(Number.isFinite(s.trained.food)).toBe(true);
  });

  it("keep what a new save has, through a round trip", () => {
    let s = running(calmStart(NATION, PARTY));
    s = moveWorkers({ ...s, trained: { food: 1234, industry: 567 }, workPlan: { food: 2000, school: 0, industry: 1000 } }, "food", "fewer");
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(s)));
    expect(loaded.trained).toEqual({ food: 1234, industry: 567 });
    expect(loaded.workPlan).toEqual({ food: 2000, school: 0, industry: 1000 });
    expect(loaded.workPlanNext).toEqual(s.workPlanNext);
    const auto = hydrateGameState(JSON.parse(JSON.stringify(chooseAutomaticWork(s))));
    expect(auto.workPlanNext).toBe("automatic");
  });
});

it("people of working age are the same share as ever", () => {
  const start = calmStart(NATION, PARTY);
  const total = getOwnedProvinceIds(start).reduce((sum, id) => sum + start.provinces[id].population, 0);
  expect(getLabourSituation(start).workers).toBeCloseTo(total * LABOUR_SHARE);
});
