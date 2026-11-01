// Standing orders in the Market: one rule at a time, from a calm country.
import { beforeEach, describe, expect, it } from "vitest";
import { buyGood, sellGood } from "../src/application/actions/marketActions";
import { changeBuyOrder, changeSellOrder, toggleBuyOrder, toggleSellOrder, whyBuyOrderWaits } from "../src/application/actions/marketOrderActions";
import { runMarketOrders } from "../src/application/day/marketOrders";
import { simulateDay } from "../src/application/simulateDay";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import { MARKET_ORDER_BATCHES, MARKET_ORDER_RESERVE } from "../src/domain/constants";
import type { GameState } from "../src/domain/country/types";
import { getBatchSize, getBuyCost, getMidPrice, getSellRevenue, holdsPort } from "../src/domain/market/marketRules";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { calmStart } from "./support/calmStart";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261015));

const COAL = getBatchSize("coal", MARKET_ORDER_BATCHES);

function openMarket(changes: Partial<GameState> = {}): GameState {
  return { ...calmStart("astravia", "astravia-harvest-union"), chapters: allChaptersOpen(), ...changes };
}

function price(s: GameState, good: "coal" | "food" = "coal"): number {
  return getMidPrice(good, s.market.supply[good]);
}

function buyOrder(s: GameState, below: number, stockUnder: number | null = null): GameState {
  return changeBuyOrder(toggleBuyOrder(s, "coal"), "coal", { below, stockUnder });
}

function sellOrder(s: GameState, above: number, keep = 0): GameState {
  return changeSellOrder(toggleSellOrder(s, "coal"), "coal", { above, keep });
}

function rich(s: GameState, coal = 0): GameState {
  return { ...s, stats: { ...s.stats, treasury: 5000 }, resources: { ...s.resources, coal } };
}

describe("a buy order", () => {
  it("buys a set amount through the market when the price is below its limit", () => {
    const s = rich(openMarket());
    const after = runMarketOrders(buyOrder(s, price(s) + 1));
    const cost = getBuyCost(s.market, "coal", COAL, holdsPort(s));
    expect(after.resources.coal).toBe(COAL);
    expect(after.stats.treasury).toBeCloseTo(5000 - cost, 6);
    expect(after.market.supply.coal).toBe(s.market.supply.coal - COAL); // the price moves, as for a click
    expect(after.pendingLedger.treasury.trade).toBeCloseTo(-cost, 6);
  });

  it("does nothing at or above its limit", () => {
    const s = rich(openMarket());
    const ordered = buyOrder(s, price(s));
    expect(runMarketOrders(ordered)).toBe(ordered);
  });

  it("stops once the stock reaches its limit", () => {
    const s = rich(openMarket(), 100);
    expect(runMarketOrders(buyOrder(s, 1000, 101)).resources.coal).toBe(100 + COAL);
    const full = buyOrder(s, 1000, 100);
    expect(runMarketOrders(full)).toBe(full);
    expect(whyBuyOrderWaits(full, "coal")).toMatch(/hold enough/);
  });

  it("never spends the treasury below the reserve", () => {
    const s = rich(openMarket());
    const cost = getBuyCost(s.market, "coal", COAL, holdsPort(s));
    const enough = { ...s, stats: { ...s.stats, treasury: MARKET_ORDER_RESERVE + cost + 0.01 } };
    expect(runMarketOrders(buyOrder(enough, 1000)).resources.coal).toBe(COAL);
    const short = { ...s, stats: { ...s.stats, treasury: MARKET_ORDER_RESERVE + cost - 0.01 } };
    const ordered = buyOrder(short, 1000);
    expect(runMarketOrders(ordered)).toBe(ordered);
    expect(whyBuyOrderWaits(ordered, "coal")).toMatch(/treasury/);
  });

  it("works for wood and for food, trading its own good's amount", () => {
    let s = rich(openMarket());
    s = changeBuyOrder(toggleBuyOrder(s, "wood"), "wood", { below: 1000 });
    s = changeBuyOrder(toggleBuyOrder(s, "food"), "food", { below: 1000 });
    const after = runMarketOrders({ ...s, resources: { ...s.resources, wood: 0 } });
    expect(after.resources.wood).toBe(getBatchSize("wood", MARKET_ORDER_BATCHES));
    expect(after.stats.food).toBe(s.stats.food + getBatchSize("food", MARKET_ORDER_BATCHES));
  });
});

describe("a sell order", () => {
  it("sells a set amount when the price is above its limit", () => {
    const s = rich(openMarket(), 50);
    const after = runMarketOrders(sellOrder(s, price(s) - 1));
    expect(after.resources.coal).toBe(50 - COAL);
    expect(after.stats.treasury).toBeCloseTo(5000 + getSellRevenue(s.market, "coal", COAL), 6);
    expect(after.market.supply.coal).toBe(s.market.supply.coal + COAL);
  });

  it("does nothing at or below its limit", () => {
    const s = rich(openMarket(), 50);
    const ordered = sellOrder(s, price(s));
    expect(runMarketOrders(ordered)).toBe(ordered);
  });

  it("always keeps what it was told to keep", () => {
    const s = rich(openMarket(), 50);
    expect(runMarketOrders(sellOrder(s, 0, 50 - COAL)).resources.coal).toBe(50 - COAL);
    const ordered = sellOrder(s, 0, 50 - COAL + 1);
    expect(runMarketOrders(ordered)).toBe(ordered);
    let days = sellOrder(s, 0, 21);
    for (let i = 0; i < 20; i++) days = runMarketOrders(days);
    expect(days.resources.coal).toBeGreaterThanOrEqual(21);
    expect(days.resources.coal).toBeLessThan(21 + COAL);
  });
});

describe("standing orders", () => {
  it("never trade while the Market is shut", () => {
    const s = rich(calmStart("astravia", "astravia-harvest-union"), 50);
    expect(s.chapters.opened).not.toContain("market");
    const ordered = sellOrder(buyOrder(s, 1000), 0);
    expect(runMarketOrders(ordered)).toBe(ordered);
  });

  it("do nothing switched off, and keep their numbers", () => {
    const s = rich(openMarket(), 50);
    const off = toggleBuyOrder(buyOrder(s, 1000, 200), "coal");
    expect(off.marketOrders.coal?.buy).toEqual({ on: false, below: 1000, stockUnder: 200 });
    expect(runMarketOrders(off)).toBe(off);
    expect(toggleBuyOrder(off, "coal").marketOrders.coal?.buy?.on).toBe(true);
  });

  it("start from today's price, with a sale keeping what is held now", () => {
    const s = rich(openMarket(), 50);
    const set = toggleSellOrder(toggleBuyOrder(s, "coal"), "coal").marketOrders.coal!;
    expect(set.buy?.below).toBeGreaterThanOrEqual(price(s));
    expect(set.buy?.below).toBeLessThan(price(s) + 1);
    expect(set.sell?.above).toBeLessThanOrEqual(price(s));
    expect(set.sell?.keep).toBe(50);
  });

  it("won't buy and sell the same good when the limits cross", () => {
    const s = rich(openMarket(), 50);
    const ordered = sellOrder(buyOrder(s, 30), 30);
    expect(runMarketOrders(ordered)).toBe(ordered);
  });

  it("can't empty the market in a day", () => {
    const s = rich(openMarket());
    const after = simulateDay(buyOrder(s, 1000));
    expect(s.market.supply.coal - after.market.supply.coal).toBeLessThanOrEqual(COAL);
  });

  it("put one line a month in the log, never a pop-up, and tally the month", () => {
    let s: GameState = { ...buyOrder(rich(openMarket()), 1000), isPaused: false };
    const before = s.events.length;
    s = runMarketOrders(s);
    s = runMarketOrders(s);
    const lines = s.events.filter((e) => e.topic === "orders");
    expect(s.events.length).toBe(before + 1);
    expect(lines[0].message).toMatch(new RegExp(`^Standing orders this month: bought ${COAL * 2} coal for [\\d,]+ Cr\\.$`));
    expect(s.orderTally?.bought.coal).toBe(COAL * 2);
    expect(s.isPaused).toBe(false);
    const nextMonth = runMarketOrders({ ...s, date: { ...s.date, month: s.date.month + 1 } });
    expect(nextMonth.orderTally?.bought.coal).toBe(COAL);
    expect(nextMonth.events.filter((e) => e.topic === "orders")).toHaveLength(2);
  });

  it("book their trades in the day's ledger, as a click would", () => {
    const s = rich(openMarket());
    const after = simulateDay(buyOrder(s, 1000));
    expect(after.lastDayLedger.treasury.trade).toBeLessThan(0);
  });

  it("are the same trades as buyGood and sellGood make", () => {
    const s = rich(openMarket(), 50);
    const ordered = runMarketOrders(sellOrder(s, 0));
    expect(ordered.stats.treasury).toBe(sellGood(s, "coal", MARKET_ORDER_BATCHES).stats.treasury);
    const bought = runMarketOrders(buyOrder(s, 1000));
    expect(bought.stats.treasury).toBe(buyGood(s, "coal", MARKET_ORDER_BATCHES).stats.treasury);
  });
});

describe("saves", () => {
  it("from before standing orders load with none, and play on", () => {
    const s = openMarket();
    const old: Record<string, unknown> = JSON.parse(JSON.stringify(s));
    delete old.marketOrders;
    delete old.orderTally;
    const loaded = hydrateGameState(old as Partial<GameState>);
    expect(loaded.marketOrders).toEqual({});
    expect(loaded.orderTally).toBeNull();
    expect(simulateDay(loaded).date.day).toBe(s.date.day + 1);
  });

  it("keep the orders set", () => {
    const s = buyOrder(rich(openMarket()), 25, 150);
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(s)) as Partial<GameState>);
    expect(loaded.marketOrders.coal?.buy).toEqual({ on: true, below: 25, stockUnder: 150 });
  });
});
