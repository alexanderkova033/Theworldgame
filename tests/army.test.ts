// Regiments on the map (see domain/military): raised and paid by you, drilled
// and marched a day at a time, raised by the neighbours by temper, and
// remembered by saves.
import { describe, expect, it } from "vitest";
import { canRaiseRegiment, disbandRegiment, getMarchRoute, marchRegiments, raiseRegiment } from "../src/application/actions/armyActions";
import { drillTheArmy } from "../src/application/day/army";
import { beginDay } from "../src/application/day/dayContext";
import { runNeighbours } from "../src/application/day/neighbours";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import {
  GARRISON_ORDER,
  GARRISON_ORDER_CAP,
  POPULATION_PER_REGIMENT,
  REGIMENT_MARCH_DAYS,
  REGIMENT_RAISE_COST,
  REGIMENT_SAIL_DAYS,
  REGIMENT_SALARY,
  REGIMENT_TRAINING_DAYS,
} from "../src/domain/constants";
import type { GameState } from "../src/domain/country/types";
import { isHarbourSite, isIsland } from "../src/domain/islands/islandRules";
import { advanceRegiment, findRoute, getGarrisonOrder, getGarrisons, getRegimentCap, isReady, newRegiment, routeDays, startMarch } from "../src/domain/military/militaryRules";
import { getNation } from "../src/domain/nations/nationRules";
import { getNeighbours } from "../src/domain/provinces/provinceNeighbours";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { loseProvince } from "../src/application/loseProvince";
import { forecastFight } from "../src/domain/military/battleRules";

const start = startNewGame("astravia", "astravia-harvest-union");
const base: GameState = { ...start, chapters: allChaptersOpen(), stats: { ...start.stats, treasury: 20000 }, isPaused: false };
const capital = getNation("astravia").capitalProvinceId;
const astravia = getNation("astravia").provinceIds;
const solmere = "island-2";
const drilled = (s: GameState): GameState => ({ ...s, regiments: s.regiments.map((r) => ({ ...r, trainingDays: 0 })) });

describe("the way a regiment marches", () => {
  const anywhere = () => true;

  it("goes by land from one province to the next, a few days a leg", () => {
    const far = astravia.find((id) => id !== capital && !getNeighbours(capital).includes(id))!;
    const route = findRoute(capital, far, anywhere)!;
    expect(route[route.length - 1].provinceId).toBe(far);
    let at = capital;
    for (const leg of route) {
      expect(getNeighbours(at)).toContain(leg.provinceId);
      expect(leg.days).toBe(REGIMENT_MARCH_DAYS);
      at = leg.provinceId;
    }
  });

  it("sails to an island from a coast, and only through places it may enter", () => {
    const route = findRoute(capital, solmere, anywhere)!;
    const sail = route[route.length - 1];
    expect(sail).toEqual({ provinceId: solmere, days: REGIMENT_SAIL_DAYS });
    expect(isHarbourSite(route[route.length - 2].provinceId)).toBe(true);
    expect(isIsland(route[route.length - 2].provinceId)).toBe(false);
    // Kept to your own land, it can't reach a neighbour's capital.
    expect(findRoute(capital, getNation("veldoria").capitalProvinceId, (id) => astravia.includes(id))).toBeNull();
  });

  it("arrives after the days its way takes, a leg at a time", () => {
    const route = findRoute(capital, solmere, anywhere)!;
    let r = startMarch({ ...newRegiment("astravia", capital), trainingDays: 0 }, route);
    let days = 0;
    while (r.march) {
      r = advanceRegiment(r, new Set());
      days++;
    }
    expect(r.provinceId).toBe(solmere);
    expect(days).toBe(routeDays(route));
  });
});

describe("your regiments", () => {
  it("are raised in the capital for a fee, up to one for every so many people", () => {
    const raised = raiseRegiment(base);
    expect(raised.stats.treasury).toBe(base.stats.treasury - REGIMENT_RAISE_COST);
    expect(raised.regiments).toHaveLength(1);
    expect(raised.regiments[0]).toMatchObject({ nationId: "astravia", provinceId: capital, trainingDays: REGIMENT_TRAINING_DAYS });
    const cap = getRegimentCap(base.stats.population);
    expect(cap).toBe(Math.floor(base.stats.population / POPULATION_PER_REGIMENT));
    let full = base;
    for (let i = 0; i < cap; i++) full = raiseRegiment(full);
    expect(canRaiseRegiment(full)).toBe(false);
    expect(canRaiseRegiment(start)).toBe(false); // not before the army opens
  });

  it("drill a month, then march where they're sent, and get there", () => {
    let s = raiseRegiment(base);
    for (let d = 0; d < REGIMENT_TRAINING_DAYS; d++) s = simulateDay(s);
    expect(isReady(s.regiments[0])).toBe(true);
    const to = astravia.find((id) => getNeighbours(capital).includes(id))!;
    s = marchRegiments(s, capital, to);
    expect(s.regiments[0].march).not.toBeNull();
    for (let d = 0; d < REGIMENT_MARCH_DAYS; d++) s = simulateDay(s);
    expect(s.regiments[0]).toMatchObject({ provinceId: to, march: null });
  });

  it("march only within your own land for now", () => {
    const s = drilled(raiseRegiment(base));
    expect(getMarchRoute(s, capital, getNation("veldoria").capitalProvinceId)).toBeNull();
    expect(marchRegiments(s, capital, getNation("veldoria").capitalProvinceId)).toBe(s);
    expect(getMarchRoute(s, capital, solmere)).toBeNull(); // not yours until settled
  });

  it("are paid every day, and one goes home when the treasury is empty", () => {
    const s = raiseRegiment(raiseRegiment(base));
    const day = beginDay(s);
    expect(drillTheArmy(day, s, -1).regiments).toHaveLength(1);
    expect(day.events.some((e) => e.message.includes("goes home unpaid"))).toBe(true);
    const next = simulateDay(s);
    // The fees for raising them land with the first day's pay.
    expect(next.lastDayLedger.treasury.army).toBeCloseTo(-2 * (REGIMENT_RAISE_COST + REGIMENT_SALARY));
    expect(simulateDay(next).lastDayLedger.treasury.army).toBeCloseTo(-2 * REGIMENT_SALARY);
  });

  it("can be stood down", () => {
    const s = raiseRegiment(base);
    expect(disbandRegiment(s, s.regiments[0].id).regiments).toHaveLength(0);
  });
});

describe("the neighbours' armies", () => {
  const firstOf = (month: number) => ({ year: Math.floor((month - 1) / 12) + 1, month: ((month - 1) % 12) + 1, day: 1 });
  let s = base;
  for (let m = 2; m <= 36; m++) s = { ...s, ...runNeighbours(beginDay({ ...s, date: firstOf(m) }), s, firstOf(m)) };
  const count = (nationId: string) => s.regiments.filter((r) => r.nationId === nationId).length;

  it("are raised by temper: Caldenreich keeps more than it needs to, spread along its land", () => {
    expect(count("caldenreich")).toBeGreaterThan(0);
    expect(count("veldoria")).toBeGreaterThan(0);
    const where = new Set(s.regiments.filter((r) => r.nationId === "caldenreich").map((r) => r.provinceId));
    expect(where.size).toBe(Math.min(count("caldenreich"), getNation("caldenreich").provinceIds.length));
    expect(s.regiments.every((r) => r.nationId !== base.nationId)).toBe(true);
  });

  it("are remembered by saves, and older saves have none", () => {
    const old = JSON.parse(JSON.stringify(s));
    expect(hydrateGameState(old).regiments).toEqual(s.regiments);
    delete old.regiments;
    expect(hydrateGameState(old).regiments).toEqual([]);
  });
});

describe("a garrison", () => {
  const province = astravia.find((id) => id !== capital)!;
  const standing = (s: GameState, provinceId: string, march = false): GameState => ({
    ...s,
    regiments: [{ ...newRegiment(s.nationId, provinceId), trainingDays: 0, march: march ? { route: [capital], legDays: 5, daysLeft: 3 } : null }],
  });
  const withProvince = (s: GameState, change: Partial<GameState["provinces"][string]>): GameState => ({
    ...s,
    provinces: { ...s.provinces, [province]: { ...s.provinces[province], ...change } },
  });
  const day = (s: GameState) => simulateDay({ ...s, isPaused: false, pendingDecisionId: null });

  it("counts only regiments drilled and standing still", () => {
    expect(getGarrisons(standing(base, province).regiments, base.nationId)).toEqual({ [province]: 1 });
    expect(getGarrisons(standing(base, province, true).regiments, base.nationId)).toEqual({});
    expect(getGarrisons([newRegiment(base.nationId, province)], base.nationId)).toEqual({}); // still at drill
    expect(getGarrisonOrder(1)).toBe(GARRISON_ORDER);
    expect(getGarrisonOrder(5)).toBe(GARRISON_ORDER * GARRISON_ORDER_CAP);
  });

  it("steadies the province it stands in", () => {
    const shaky = withProvince(base, { stability: 20 });
    const without = day(shaky).provinces[province].stability;
    const withGarrison = day(standing(shaky, province)).provinces[province].stability;
    expect(withGarrison).toBeGreaterThan(without);
  });

  it("keeps rioting from counting toward an uprising", () => {
    const rioting = withProvince(base, { unrestStage: "riots", stability: 5, riotDays: 10 });
    expect(day(rioting).provinces[province].riotDays).toBe(11);
    expect(day(standing(rioting, province)).provinces[province].riotDays).toBe(0);
  });

  it("wears a risen province down, and ending it that way leaves a grievance", () => {
    const risen = withProvince(base, {
      unrestStage: "riots",
      stability: 5,
      uprising: { since: base.date, strength: 1, militia: 0, lastTerms: base.date, fullSince: null },
    });
    const left = day(risen).provinces[province];
    const held = day(standing(risen, province)).provinces[province];
    expect(left.uprising).not.toBeNull();
    expect(held.uprising).toBeNull();
    expect(held.aggrievedUntil).not.toBeNull();
  });
});

describe("taking back a province that broke away", () => {
  const lostId = astravia.find((id) => id !== capital && getNeighbours(capital).includes(id))!;
  const lost = loseProvince(base, lostId);
  const people = base.provinces[lostId].population;
  const at = (s: GameState, provinceId: string, n: number, strength = 100): GameState => ({
    ...s,
    regiments: Array.from({ length: n }, () => ({ ...newRegiment(s.nationId, provinceId), trainingDays: 0, strength })),
  });
  const day = (s: GameState) => simulateDay({ ...s, isPaused: false, pendingDecisionId: null });
  const run = (s: GameState, days: number) => {
    for (let d = 0; d < days && s.lostProvinceIds.includes(lostId); d++) s = day(s);
    return s;
  };

  it("remembers who lived there, held by rebels at full strength", () => {
    expect(lost.freeProvinces[lostId]).toEqual({ people, strength: 100 });
  });

  it("can be marched into from next door", () => {
    expect(getMarchRoute(at(lost, capital, 1), capital, lostId)).toEqual([{ provinceId: lostId, days: REGIMENT_MARCH_DAYS }]);
  });

  it("is fought for day by day: one regiment just wins, two win sooner and keep more men", () => {
    const one = forecastFight([100], 100);
    const two = forecastFight([100, 100], 100);
    expect(one.won).toBe(true);
    expect(two.won).toBe(true);
    expect(two.days).toBeLessThan(one.days);
    expect(two.left / 2).toBeGreaterThan(one.left);
    expect(forecastFight([40], 100).won).toBe(false);
  });

  it("comes back with its people when its rebels are beaten, aggrieved, and the regiments worn", () => {
    const won = run(at(lost, lostId, 2), 200);
    expect(won.lostProvinceIds).not.toContain(lostId);
    expect(won.freeProvinces[lostId]).toBeUndefined();
    expect(won.provinces[lostId].population).toBeGreaterThan(0);
    expect(won.provinces[lostId].aggrievedUntil).not.toBeNull();
    expect(won.regiments.every((r) => r.strength < 100)).toBe(true);
    expect(won.events.some((e) => e.message.includes("is taken back"))).toBe(true);
  });

  it("costs regiments worn to nothing, and rebels left alone regrow", () => {
    const beaten = run(at(lost, lostId, 1, 10), 60);
    expect(beaten.regiments).toHaveLength(0);
    expect(beaten.lostProvinceIds).toContain(lostId);
    const weakened = { ...lost, freeProvinces: { [lostId]: { people, strength: 50 } } };
    expect(day(weakened).freeProvinces[lostId].strength).toBeGreaterThan(50);
  });

  it("lets worn regiments get their men back at home", () => {
    expect(day(at(base, capital, 1, 50)).regiments[0].strength).toBeGreaterThan(50);
  });

  it("is remembered by saves; older saves hold their lost provinces with nobody in them", () => {
    const old = JSON.parse(JSON.stringify(lost));
    delete old.freeProvinces;
    expect(hydrateGameState(old).freeProvinces).toEqual({ [lostId]: { people: 0, strength: 100 } });
  });
});
