// What the game says should be true: counted words, a requirement not yet met,
// why a project stalled and where to mend it, the food forecast against the day,
// and what a coal order will come to.
import { createElement } from "react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { changeBuyOrder, setOrderReserve, toggleBuyOrder, whyBuyOrderWaits } from "../src/application/actions/marketOrderActions";
import { getAdvisorOutlook } from "../src/application/getAdvisorOutlook";
import { getCoalOrderOutlook } from "../src/application/getCoalOrderOutlook";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { getForecasts } from "../src/application/getForecasts";
import { getHeatingOutlook } from "../src/application/getHeatingOutlook";
import { getProjectShortages } from "../src/application/getProjectAffordability";
import { simulateDay } from "../src/application/simulateDay";
import { allChaptersOpen, type ChapterProgress } from "../src/domain/chapters/chapterData";
import { GRAZING_FOOD_PER_DAY, MARKET_ORDER_RESERVE } from "../src/domain/constants";
import type { Project } from "../src/domain/construction/types";
import { addDays, getSeason } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { GOOD_SPECS } from "../src/domain/market/marketRules";
import { counted } from "../src/domain/plural";
import { MarketPanel } from "../src/presentation/components/MarketPanel";
import { ProjectRings } from "../src/presentation/components/ProjectsPanel";
import { getEventKind } from "../src/presentation/eventKinds";
import { formatRequirement } from "../src/presentation/formatNumber";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { alertDestination, BUDGET, BUILDINGS, MARKET } from "../src/presentation/navigation";
import { calmStart } from "./support/calmStart";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261102));

const opened = (nation = "astravia", party = "astravia-harvest-union"): GameState => ({ ...calmStart(nation, party), chapters: allChaptersOpen(), isPaused: false, events: [] });

describe("counted words", () => {
  it("gives one its singular", () => {
    expect([counted(1, "day"), counted(0, "day"), counted(3, "day"), counted(1, "factory", "factories"), counted(2, "factory", "factories")]).toEqual(["1 day", "0 days", "3 days", "1 factory", "2 factories"]);
    expect(counted(12000, "day", "days", "12k")).toBe("12k days");
  });

  // Task 13 is working in these. Their counted days and months are listed in plans/tasks/12's Results.
  const LEFT_FOR_TASK_13 = ["PeoplePanel.tsx", "RepairsPanel.tsx", "MapArmies.tsx"];

  it("leaves no count of days or months to be written by hand", () => {
    const files = (path: string): string[] => (statSync(path).isFile() ? [path] : readdirSync(path).flatMap((name) => files(join(path, name))));
    // A number we can't vouch for: anything but a fixed constant in capitals.
    const byHand = /\{(?![A-Z_]+\})[^{}]*\} (days|months)\b/;
    // A line that has already taken the singular out, as a letter's "a month" does.
    const singularHandled = /=== \d+ \? "a /;
    const offenders = files("src")
      .filter((file) => /\.tsx?$/.test(file) && !LEFT_FOR_TASK_13.some((left) => file.endsWith(left)))
      .flatMap((file) => readFileSync(file, "utf8").split(/\r?\n/).filter((line) => byHand.test(line) && !singularHandled.test(line)).map((line) => `${file}: ${line.trim()}`));
    expect(offenders).toEqual([]);
  });
});

describe("a requirement not yet met", () => {
  it("doesn't read as met when rounding would make it so", () => {
    expect(formatRequirement(11960, 12000)).toEqual(["11,960", "12,000"]);
    expect(formatRequirement(11999.6, 12000)).toEqual(["11,999", "12,000"]);
    expect(formatRequirement(9999.6, 10000)).toEqual(["9,999", "10,000"]);
    expect(formatRequirement(49.6, 50)).toEqual(["49", "50"]);
  });

  it("stays in the usual format otherwise", () => {
    expect(formatRequirement(11400, 12000)).toEqual(["11.4k", "12k"]);
    expect(formatRequirement(12000, 12000)).toEqual(["12k", "12k"]);
    expect(formatRequirement(12400, 12000)).toEqual(["12.4k", "12k"]);
  });
});

describe("a stalled project", () => {
  const project: Project = {
    id: "p1",
    type: "housing",
    label: "Homes",
    totalDays: 10,
    daysRemaining: 5,
    provinceId: "province-1-west",
    treasuryCostPerDay: 5,
    resourceType: "wood",
    resourceCostPerDay: 0.3,
    isStalled: false,
  };
  const withProjects = (projects: Project[], treasury: number, wood: number, chapters?: ChapterProgress): GameState => {
    const base = opened();
    return { ...base, chapters: chapters ?? base.chapters, projects, stats: { ...base.stats, treasury }, resources: { ...base.resources, wood } };
  };
  const stall = (state: GameState) => simulateDay(state).events.find((e) => e.topic === "stall")!;

  it("carries its cause, and the button goes where that is mended", () => {
    const wood = stall(withProjects([project], 20000, 0));
    expect(wood.stalledFor).toBe("wood");
    expect(getEventKind(wood).action).toMatchObject({ label: "Buy wood", ...MARKET });

    const money = stall(withProjects([project], 1, 50));
    expect(money.stalledFor).toBe("money");
    expect(getEventKind(money).action).toMatchObject({ label: "Budget", ...BUDGET });
  });

  it("names money first when it is short of both, as money would buy the good", () => {
    expect(stall(withProjects([project], 1, 0)).stalledFor).toBe("money");
  });

  it("has nowhere to buy a good while the Market is shut, so stays with Build", () => {
    const shut = { ...allChaptersOpen(), opened: allChaptersOpen().opened.filter((id) => id !== "exchange") };
    const event = stall(withProjects([project], 20000, 0, shut));
    expect(event.stalledFor).toBeUndefined();
    expect(getEventKind(event).action).toMatchObject({ label: "Build", ...BUILDINGS });
  });

  it("goes to Build on an old save's event, and when it resumes", () => {
    expect(getEventKind({ id: "e", date: { year: 1, month: 1, day: 1 }, message: "x", severity: "warning", topic: "stall" }).action).toMatchObject(BUILDINGS);
  });

  it("sends the advisor's chip to the cause too", () => {
    const destination = (state: GameState) => {
      const production = getDailyProductionSummary(state);
      const alert = getAdvisorOutlook(state, production, getHeatingOutlook(state), getForecasts(state, production)).alerts.find((a) => a.kind === "stalled")!;
      return { detail: alert.detail, to: alertDestination(alert, state) };
    };
    const stalled = { ...project, isStalled: true };
    const wood = destination({ ...withProjects([stalled], 20000, 0) });
    expect(wood.to).toEqual(MARKET);
    expect(wood.detail).toContain("for lack of wood");
    const money = destination(withProjects([stalled], 1, 50));
    expect(money.to).toEqual(BUDGET);
    expect(money.detail).toContain("for lack of money");
  });

  describe("when an earlier project took the last of a good", () => {
    const earlier = { ...project, id: "p0" };
    const later = { ...project, id: "p1", isStalled: true };
    // 0.5 wood: enough for one project's day, and more than the later one needs on its own.
    const state = withProjects([earlier, later], 20000, 0.5);
    const tip = () => renderToStaticMarkup(createElement(ProjectRings, { state, dailyCost: 10 }));

    it("the preview says so", () => {
      expect(getProjectShortages(state).get("p0")).toBeUndefined();
      expect(getProjectShortages(state).get("p1")).toEqual({ money: false, good: "wood", takenByEarlier: true });
    });

    it("agrees with the day", () => {
      const after = simulateDay({ ...state, projects: [earlier, { ...later, isStalled: false }] });
      expect(after.projects.find((p) => p.id === "p1")?.isStalled).toBe(true);
      expect(after.projects.find((p) => p.id === "p0")?.isStalled).toBe(false);
    });

    it("the tip blames the wood, not the money", () => {
      expect(tip()).toContain("stalled for want of wood, as earlier projects are paid first.");
      expect(tip()).not.toContain("want of money");
      expect(tip()).toContain("no wood");
    });
  });

  it("the tip blames money when money is what's short", () => {
    const html = renderToStaticMarkup(createElement(ProjectRings, { state: withProjects([{ ...project, isStalled: true }], 1, 50), dailyCost: 5 }));
    expect(html).toContain("stalled for want of money.");
  });

  it("the tip says so when it can pay again tomorrow", () => {
    const html = renderToStaticMarkup(createElement(ProjectRings, { state: withProjects([{ ...project, isStalled: true }], 20000, 50), dailyCost: 5 }));
    expect(html).toContain("it can pay again tomorrow");
    expect(html).not.toContain("want of");
  });
});

describe("the food forecast with a grazing island", () => {
  const FLOCKS = "island-4";
  const graze = (state: GameState): GameState => ({
    ...state,
    settledIslandIds: [FLOCKS],
    provinces: { ...state.provinces, [FLOCKS]: { ...state.provinces[Object.keys(state.provinces)[0]], population: 0, uprising: null, unrestStage: "calm" } },
  });
  // Eating far more than the farms grow, so the stock runs down over a few weeks.
  const hungry = (state: GameState, food: number): GameState => ({ ...state, stats: { ...state.stats, food }, placedBuildings: state.placedBuildings.filter((b) => b.type !== "farm") });

  // The first day the real game's stock falls short, played out.
  function firstShortDay(state: GameState): number {
    let s = state;
    for (let day = 1; day <= 400; day++) {
      const before = s.stats.food;
      const net = getDailyProductionSummary(s).netFood;
      s = { ...simulateDay({ ...s, isPaused: false, pendingDecisionId: null, pendingDemand: null, pendingCrisis: null, chapters: { ...s.chapters, unread: [] } }), events: [] };
      if (before + net < 0) return day;
    }
    return Infinity;
  }

  it("counts the flocks as the day does", () => {
    const state = graze(opened());
    const without = opened();
    expect(getDailyProductionSummary(state).farmFood - getDailyProductionSummary(without).farmFood).toBe(GRAZING_FOOD_PER_DAY);
    const food = getDailyProductionSummary(state).foodConsumed * 40;
    const flocks = getForecasts(hungry(state, food), getDailyProductionSummary(hungry(state, food))).food!;
    const none = getForecasts(hungry(without, food), getDailyProductionSummary(hungry(without, food))).food!;
    expect(flocks.days).toBeGreaterThan(none.days);
  });

  it("names the day the food really runs out, within a day or so as people change", () => {
    const state = graze(opened());
    const hungerDay = (food: number) => {
      const s = hungry(state, food);
      const forecast = getForecasts(s, getDailyProductionSummary(s)).food!;
      return { forecast: forecast.days, actual: firstShortDay(s) };
    };
    const consumed = getDailyProductionSummary(hungry(state, 0)).foodConsumed;
    for (const days of [3, 10, 25]) {
      const { forecast, actual } = hungerDay((consumed - GRAZING_FOOD_PER_DAY) * days);
      expect(Math.abs(forecast - actual), `about ${days} days of food`).toBeLessThanOrEqual(1);
    }
  });

  it("counts the day just starting at its own season's harvest", () => {
    // The last day of autumn: the harvest today is autumn's, tomorrow's winter's.
    const lastOfAutumn = { ...opened(), date: { year: 1, month: 11, day: 30 } };
    expect(getSeason(lastOfAutumn.date)).toBe("autumn");
    expect(getSeason(addDays(lastOfAutumn.date, 1))).toBe("winter");
    const production = getDailyProductionSummary(lastOfAutumn);
    // Eating a little over autumn's harvest, which a winter harvest falls far short of.
    const eating = { ...production, foodConsumed: production.farmFood + production.processedFood + 1000 };
    const s = { ...lastOfAutumn, stats: { ...lastOfAutumn.stats, food: 1500 } };
    expect(getForecasts(s, eating).food?.days).toBe(2);
  });
});

describe("a coal order's outlook", () => {
  const coalOrder = (state: GameState, below: number, stockUnder: number | null = 150): GameState => changeBuyOrder(toggleBuyOrder(state, "coal"), "coal", { below, stockUnder });
  const inAutumn = (state: GameState): GameState => ({ ...state, date: { year: 1, month: 3, day: 1 } });
  const BASE = GOOD_SPECS.coal.basePrice;

  it("has nothing to say with no order on, or the Market shut", () => {
    const state = opened();
    expect(getCoalOrderOutlook(state)).toBeNull();
    expect(getCoalOrderOutlook(toggleBuyOrder(coalOrder(state, BASE), "coal"))).toBeNull();
    const shut = { ...state, chapters: { ...allChaptersOpen(), opened: allChaptersOpen().opened.filter((id) => id !== "exchange") } };
    expect(getCoalOrderOutlook(coalOrder(shut, BASE))).toBeNull();
  });

  it("rolls no dice and changes nothing", () => {
    const state = coalOrder(inAutumn(opened()), BASE * 1.5);
    const before = JSON.stringify(state);
    const random = Math.random;
    Math.random = () => {
      throw new Error("rolled");
    };
    try {
      getCoalOrderOutlook(state);
    } finally {
      Math.random = random;
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it("costs more the more it may buy, and nothing when the limit is under every price", () => {
    const state = { ...inAutumn(opened()), resources: { ...opened().resources, coal: 0 } };
    const dear = getCoalOrderOutlook(coalOrder(state, BASE * 1.5))!;
    const cheap = getCoalOrderOutlook(coalOrder(state, BASE * 0.9))!;
    const never = getCoalOrderOutlook(coalOrder(state, 1))!;
    expect(dear.yearlyCost).toBeGreaterThan(cheap.yearlyCost);
    expect(never.yearlyCost).toBe(0);
  });

  it("warns of a low price limit and points to it, and not of a high one", () => {
    const state = { ...inAutumn(opened()), resources: { ...opened().resources, coal: 0, wood: 0 } };
    const low = getCoalOrderOutlook(coalOrder(state, BASE * 0.9))!;
    expect(low.shortDays).toBeGreaterThan(0);
    expect(low.coldDays).toBeGreaterThan(0);
    expect(low.heldBackBy).toBe("price");
    const high = getCoalOrderOutlook(coalOrder(state, BASE * 3))!;
    expect(high.shortDays).toBe(0);
    expect(high.coalAtWinter).toBeGreaterThanOrEqual(150);
  });

  it("points to a low stock limit when that is what holds it back", () => {
    const state = { ...inAutumn(opened()), resources: { ...opened().resources, coal: 0, wood: 0 } };
    expect(getCoalOrderOutlook(coalOrder(state, BASE * 3, 10))).toMatchObject({ heldBackBy: "stock" });
  });

  it("points to the treasury when the reserve stops it", () => {
    const state = { ...inAutumn(opened()), resources: { ...opened().resources, coal: 0, wood: 0 } };
    const poor = setOrderReserve({ ...state, stats: { ...state.stats, treasury: 0 } }, 10_000_000);
    expect(getCoalOrderOutlook(coalOrder(poor, BASE * 3))).toMatchObject({ heldBackBy: "money", yearlyCost: 0 });
  });

  it("agrees with a real year's buying, in a country that doesn't change", () => {
    let state = coalOrder({ ...inAutumn(opened()), resources: { ...opened().resources, coal: 0 } }, BASE * 1.3);
    const outlook = getCoalOrderOutlook(state)!;
    let spent = 0;
    for (let day = 0; day < 360; day++) {
      // Only the coal order runs, with all that moves the market's outlook held still.
      const tally = state.orderTally;
      const held = { ...state.market.outlook };
      state = { ...simulateDay({ ...state, isPaused: false, pendingDecisionId: null, pendingDemand: null, pendingCrisis: null }), events: [] };
      state = { ...state, market: { ...state.market, outlook: held } };
      if (state.orderTally && state.orderTally !== tally) {
        const before = tally && tally.month === state.orderTally.month ? tally.spent : 0;
        spent += state.orderTally.spent - before;
      }
    }
    expect(outlook.yearlyCost).toBeGreaterThan(0);
    expect(spent / outlook.yearlyCost).toBeGreaterThan(0.6);
    expect(spent / outlook.yearlyCost).toBeLessThan(1.4);
  });

  describe("on the order", () => {
    const market = (state: GameState) => renderToStaticMarkup(createElement(MarketPanel, { state, production: getDailyProductionSummary(state), dispatch: () => {} }));
    const state = { ...inAutumn(opened()), resources: { ...opened().resources, coal: 0, wood: 0 } };

    it("shows the yearly cost in the order's tip", () => {
      expect(market(coalOrder(state, BASE * 1.5))).toMatch(/Over the next year it should cost about [\d,]+ Cr/);
    });

    it("warns in plain words when it will fall short", () => {
      const html = market(coalOrder(state, BASE * 0.9));
      expect(html).toContain("market-order-warning");
      expect(html).toMatch(/This order reaches about [\d,]+ coal by winter, which burns [\d,]+\. Raise the price limit\./);
      expect(html).toContain("Homes would go cold");
    });

    it("says nothing when it won't, or for any other good's order", () => {
      expect(market(coalOrder(state, BASE * 3))).not.toContain("market-order-warning");
      const wood = changeBuyOrder(toggleBuyOrder(state, "wood"), "wood", { below: 1 });
      expect(market(wood)).not.toContain("market-order-warning");
      expect(market(wood)).not.toContain("Over the next year");
    });
  });
});

describe("the reserve on market orders", () => {
  const COAL_PRICE = 1000;
  const ordered = (state: GameState): GameState => changeBuyOrder(toggleBuyOrder(state, "coal"), "coal", { below: COAL_PRICE, stockUnder: null });

  it("starts at the old figure, and old saves load with it", () => {
    expect(opened().marketOrderReserve).toBe(MARKET_ORDER_RESERVE);
    const old = { ...opened() } as Partial<GameState>;
    delete old.marketOrderReserve;
    expect(hydrateGameState(old as GameState).marketOrderReserve).toBe(MARKET_ORDER_RESERVE);
  });

  it("can be set, not below nothing, and an order respects it", () => {
    const state = ordered({ ...opened(), stats: { ...opened().stats, treasury: 1000 } });
    expect(whyBuyOrderWaits(state, "coal")).toBeNull();
    const high = setOrderReserve(state, 950);
    expect(whyBuyOrderWaits(high, "coal")).toBe("Waiting: orders leave 950 Cr in the treasury.");
    expect(setOrderReserve(state, -50).marketOrderReserve).toBe(0);
  });

  it("is shown with step buttons, in the line over the board", () => {
    const state = ordered(opened());
    const html = renderToStaticMarkup(createElement(MarketPanel, { state, production: getDailyProductionSummary(state), dispatch: () => {} }));
    expect(html).toContain('aria-label="Raise: What orders leave in the treasury"');
    expect(html).toContain('aria-label="Lower: What orders leave in the treasury"');
    expect(html).toContain('value="500"');
  });

  it("changes nothing for a country with no orders", () => {
    seedRandom(7);
    const a = simulateDay({ ...opened(), isPaused: false });
    seedRandom(7);
    const b = simulateDay(setOrderReserve({ ...opened(), isPaused: false }, 9000));
    expect(a.stats.treasury).toBe(b.stats.treasury);
    expect(a.market).toEqual(b.market);
  });
});
