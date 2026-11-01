// Whole games played by a script, three game years long, in every nation.
// These guard the balance the game is tuned to: a careful player survives
// and wins the first election, an idle one does not last, and following
// any one path of the trees doesn't wreck a country on its own.
import { beforeEach, describe, expect, it } from "vitest";
import { completeLaw } from "../src/application/actions/enactLaw";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { getHeatingOutlook, isWinterFuelShort } from "../src/application/getHeatingOutlook";
import { changeBuyOrder, changeSellOrder, toggleBuyOrder, toggleSellOrder } from "../src/application/actions/marketOrderActions";
import { runMarketOrders } from "../src/application/day/marketOrders";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import { MARKET_SELL_FACTOR } from "../src/domain/constants";
import { addDays, getSeason } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import type { Difficulty } from "../src/domain/difficulty/difficultyData";
import { GOOD_SPECS, updateMarket } from "../src/domain/market/marketRules";
import type { MarketGood } from "../src/domain/market/types";
import { getElectionThreshold } from "../src/domain/parties/electionRules";
import { LAW_PATHS } from "../src/domain/laws/lawData";
import { RESEARCH_PATHS } from "../src/domain/research/researchData";
import { NATIONS, playCarefully, playIdle } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const THREE_YEARS = 3 * 365;

beforeEach(() => seedRandom(20261015));

describe("a careful player", { timeout: 30000 }, () => {
  it.each(NATIONS)("survives three years in %s and wins the first election", (nation, party) => {
    const end = playCarefully(nation, party, { days: THREE_YEARS });
    expect(end.isGameOver).toBe(false);
    expect(end.electionsWon).toBeGreaterThanOrEqual(1);
  });

  // The whole game: three elections in a row, inside five years.
  it.each(NATIONS)("wins outright in %s within five years", (nation, party) => {
    const end = playCarefully(nation, party, { days: 5 * 365 });
    expect(end.outcome).toBe("victory");
  });

  // Political power is meant to run short for a player who makes laws, so
  // each law is a choice. (One who passes none can still bank it; see TODO.md.)
  // Twelve three-year games, so it gets longer than the default to finish.
  it("runs short of political power while following a law path", { timeout: 20000 }, () => {
    const left = LAW_PATHS.map((path) => {
      seedRandom(20261015);
      const [nation, party] = NATIONS[path.key.length % NATIONS.length];
      return playCarefully(nation, party, { days: THREE_YEARS, difficulty: "normal", follow: { tree: "law", pathKey: path.key } }).stats.politicalPower;
    });
    expect(left.reduce((a, b) => a + b, 0) / left.length).toBeLessThan(350);
  });

  // Daily income should be the country's living, not market sales, or the
  // "+10% income" laws and research barely register.
  it.each(NATIONS)("lives mostly on taxes and industry in %s", (nation, party) => {
    const end = playCarefully(nation, party, { days: THREE_YEARS });
    const earned = { income: 0, trade: 0 };
    for (const report of end.monthlyReports) {
      const treasury = report.ledger?.treasury ?? {};
      earned.income += (treasury.taxes ?? 0) + (treasury.industry ?? 0);
      earned.trade += treasury.trade ?? 0;
    }
    expect(earned.income).toBeGreaterThan(earned.trade);
  });

  // Surviving isn't the whole test: if a careful player never comes near
  // losing, the game has gone soft. Support should come close to the line
  // for the next election at some point after the opening months.
  it.each(NATIONS)("has to work for it in %s", (nation, party) => {
    let closest = 100;
    let day = 0;
    playCarefully(nation, party, {
      days: THREE_YEARS,
      onDay: (s) => {
        if (++day > 60) closest = Math.min(closest, s.stats.popularity - getElectionThreshold(s));
      },
    });
    expect(closest).toBeLessThan(8);
  });
});

describe("an idle player", () => {
  it.each(NATIONS)("loses %s within two years", (nation, party) => {
    expect(playIdle(nation, party, 2 * 365).isGameOver).toBe(true);
  });
});

// Caldenreich digs its own coal: autumn's warning about winter fuel is for
// countries that don't.
describe("autumn's warning about winter fuel", () => {
  it("never reaches a careful player in Caldenreich's first three years", () => {
    let warned = 0;
    const [nation, party] = NATIONS[1];
    playCarefully(nation, party, {
      days: THREE_YEARS,
      difficulty: "normal",
      onDay: (s) => {
        if (isWinterFuelShort(getHeatingOutlook(s), getDailyProductionSummary(s).resourceProduction.coal)) warned++;
      },
    });
    expect(warned).toBe(0);
  });
});

// One nation per path keeps this quick; the scratch balance runs cover all
// three. Every path should leave a careful player standing, with numbers
// that still make sense.
describe("following one path", () => {
  const paths = [
    ...LAW_PATHS.map((p) => ["law", p.key] as const),
    ...RESEARCH_PATHS.map((p) => ["research", p.key] as const),
  ];
  it.each(paths)("%s path %s leaves the country standing", (tree, pathKey) => {
    const [nation, party] = NATIONS[pathKey.length % NATIONS.length];
    // A country can fall to bad luck on any path now: wrecked means most games.
    const ends = [20261015, 7, 99].map((seed) => {
      seedRandom(seed);
      return playCarefully(nation, party, { days: THREE_YEARS, follow: { tree, pathKey } });
    });
    expect(ends.filter((end) => !end.isGameOver).length).toBeGreaterThanOrEqual(2);
    for (const end of ends) for (const [stat, value] of Object.entries(end.stats)) expect(Number.isFinite(value), stat).toBe(true);
  });
});

// The scripted players set no orders, so these are the only games that use them.
describe("standing orders", { timeout: 30000 }, () => {
  // A shop in an empty world: nobody eats, burns or makes anything, and only the
  // market moves, so whatever it ends with is trading and nothing else. Astravia
  // has a port, the cheapest buying there is. Unsold stock counts at what selling
  // at the normal price would bring. A country's income is about 12,000 Cr a year.
  function shopProfitPerYear(good: MarketGood, buyBelow: number, sellAbove: number): number {
    const years = 5;
    let s: GameState = { ...startNewGame("astravia", "astravia-harvest-union", "easy"), chapters: allChaptersOpen() };
    s = { ...s, stats: { ...s.stats, treasury: 100000, food: 0 }, resources: { ...s.resources, [good === "food" ? "wood" : good]: 0 } };
    const base = GOOD_SPECS[good].basePrice;
    s = changeBuyOrder(toggleBuyOrder(s, good), good, { below: buyBelow * base });
    s = changeSellOrder(toggleSellOrder(s, good), good, { above: sellAbove * base, keep: 0 });
    for (let d = 0; d < years * 360; d++) {
      s = runMarketOrders(s);
      const date = addDays(s.date, 1);
      s = { ...s, date, events: [], market: updateMarket(s.market, getSeason(s.date), date.day === 1) };
    }
    const held = good === "food" ? s.stats.food : s.resources[good];
    return (s.stats.treasury - 100000 + held * base * MARKET_SELL_FACTOR) / years;
  }

  it.each(["wood", "ore", "coal", "grain", "fish", "food"] as const)("make no money from trading alone in %s", (good) => {
    for (const [buyBelow, sellAbove] of [[0.6, 1.4], [0.7, 1.4], [0.8, 1.6], [0.8, 2], [0.9, 2.4]]) {
      seedRandom(20261015);
      expect(shopProfitPerYear(good, buyBelow, sellAbove)).toBeLessThan(120);
    }
  });

  it("lay in coal ahead of winter, up to the stock asked for", () => {
    const decembers: number[] = [];
    playCarefully("astravia", "astravia-harvest-union", {
      days: 2 * 360,
      orders: (s) => changeBuyOrder(toggleBuyOrder(s, "coal"), "coal", { below: 1.15 * GOOD_SPECS.coal.basePrice, stockUnder: 150 }),
      onDay: (s) => {
        if (s.date.month === 12 && s.date.day === 1) decembers.push(s.resources.coal);
      },
    });
    expect(decembers.length).toBeGreaterThan(0);
    for (const coal of decembers) {
      expect(coal).toBeGreaterThanOrEqual(150);
      expect(coal).toBeLessThan(150 + GOOD_SPECS.coal.batch * 2);
    }
  });
});

describe("a law coming into force", () => {
  it("says what it changed, in the numbers the player watches", () => {
    const start = startNewGame("veldoria", "veldoria-ironworkers-guild");
    const after = completeLaw(start, "labor-company-towns");
    expect(after.events[0].message).toMatch(/^Company Towns comes into force: \+[\d,]+ room for people/);
  });
});

// The difficulty levels, measured: 27 five-year games each (9 seeds, every
// nation), by a sloppy player (late, never ahead of trouble) and a careful
// one. Each level should mean what its name says. Nine games were too few:
// one game either way, chance alone, could pass or fail a level (measured
// 2026-10-25, when crises and the stories reshuffled every game). Up to 54
// games a test, so they get much longer than the default to finish.
describe("difficulty", { timeout: 180000 }, () => {
  const wins = (difficulty: Difficulty, skill: "sloppy" | "careful") => {
    let won = 0;
    for (const seed of [20261015, 7, 99, 1, 2, 3, 4, 5, 6]) {
      for (const [nation, party] of NATIONS) {
        seedRandom(seed);
        if (playCarefully(nation, party, { days: 5 * 365, difficulty, skill }).outcome === "victory") won++;
      }
    }
    return won;
  };

  it("Easy: a careful player always wins, a sloppy one some of the time", () => {
    expect(wins("easy", "careful")).toBeGreaterThanOrEqual(25);
    const sloppy = wins("easy", "sloppy");
    expect(sloppy).toBeGreaterThanOrEqual(6);
    expect(sloppy).toBeLessThanOrEqual(16);
  });

  it("Normal: a careful player wins more often than not, a sloppy one hardly ever", () => {
    const careful = wins("normal", "careful");
    expect(careful).toBeGreaterThanOrEqual(12);
    expect(careful).toBeLessThanOrEqual(22);
    expect(wins("normal", "sloppy")).toBeLessThanOrEqual(3);
  });

  it("Hard: a careful player wins about a third of its games, a sloppy one never", () => {
    const careful = wins("hard", "careful");
    expect(careful).toBeGreaterThanOrEqual(5);
    expect(careful).toBeLessThanOrEqual(14);
    expect(wins("hard", "sloppy")).toBe(0);
  });

  it("Ruthless: not every country can be saved, but some can", () => {
    const careful = wins("ruthless", "careful");
    expect(careful).toBeGreaterThanOrEqual(1);
    expect(careful).toBeLessThanOrEqual(6);
  });
});
