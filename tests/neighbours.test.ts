// The neighbours run their own countries (see domain/neighbours): they stay
// fed and housed, grow, build by their temper, never touch the game's
// shared dice, and are remembered by saves.
import { describe, expect, it, vi } from "vitest";
import { runNeighbours } from "../src/application/day/neighbours";
import { beginDay } from "../src/application/day/dayContext";
import { startNewGame } from "../src/application/startNewGame";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { chooseBuilding, chooseVoyage, createNeighbour, liveMonth, neighbourDice } from "../src/domain/neighbours/neighbourRules";
import { fadeFeelings } from "../src/domain/neighbours/relationsRules";
import { draftOffer } from "../src/domain/neighbours/tradeRules";
import { acceptOffer, declineOffer } from "../src/application/actions/tradeActions";
import { getBuyCost, getSellRevenue } from "../src/domain/market/marketRules";
import { pressureGovernment } from "../src/application/actions/pressureGovernment";
import { rollForeignMeddling } from "../src/domain/diplomacy/diplomacyRules";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import {
  FOREIGN_MEDDLING_SUPPORT,
  RACE_FROM_MONTH,
  RELATIONS_BACK_OPPOSITION,
  RELATIONS_BACK_RULERS,
  RELATIONS_FADE_PER_MONTH,
  RELATIONS_HOSTILE,
  RELATIONS_HOSTILE_MEDDLING,
  RELATIONS_WARM,
  RELATIONS_TRADE,
  TRADE_OFFER_CHANCE,
} from "../src/domain/constants";
import type { Neighbour } from "../src/domain/neighbours/types";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";

function tenYears(nationId: string): Neighbour[] {
  let n = createNeighbour(nationId);
  let date = { year: 1, month: 1, day: 1 };
  const years: Neighbour[] = [];
  for (let m = 1; m <= 120; m++) {
    const c = chooseBuilding(liveMonth(n, nationId, date), nationId);
    n = { ...c.neighbour, lastDeed: c.deed };
    if (m % 12 === 0) years.push(n);
    date = addDays(date, 30);
  }
  return years;
}

describe("a neighbour run by the computer", () => {
  it.each(["astravia", "caldenreich", "veldoria"])("%s stays fed and housed, and grows, over ten years", (nationId) => {
    const years = tenYears(nationId);
    for (const n of years) {
      expect(n.food).toBeGreaterThan(0);
      expect(n.population).toBeLessThanOrEqual(n.homes * 1500);
      expect(n.treasury).toBeGreaterThanOrEqual(0);
    }
    expect(years[9].population).toBeGreaterThan(years[0].population * 1.5);
    expect(years[9].farms + years[9].factories).toBeGreaterThan(5);
  });

  it("keeps its own temper: Caldenreich steadier, Veldoria's factories stronger", () => {
    expect(tenYears("caldenreich")[4].stability).toBeGreaterThan(tenYears("veldoria")[4].stability);
  });

  it("rolls its own dice: the same for the same month, and never the game's", () => {
    expect(neighbourDice("veldoria", 30, "voyage")).toBe(neighbourDice("veldoria", 30, "voyage"));
    expect(neighbourDice("veldoria", 30, "voyage")).not.toBe(neighbourDice("veldoria", 31, "voyage"));
    const state = startNewGame("astravia", "astravia-harvest-union");
    const spy = vi.spyOn(Math, "random");
    runNeighbours(beginDay(state), state, { year: 1, month: 2, day: 1 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("is every nation but yours, and is remembered by saves", () => {
    const state = startNewGame("astravia", "astravia-harvest-union");
    expect(Object.keys(state.neighbours).sort()).toEqual(["caldenreich", "veldoria"]);
    const { neighbours: _n, ...old } = state;
    expect(Object.keys(hydrateGameState(JSON.parse(JSON.stringify(old as GameState))).neighbours).sort()).toEqual(["caldenreich", "veldoria"]);
  });
});

describe("how a neighbour feels about you", () => {
  const state: GameState = { ...startNewGame("astravia", "astravia-harvest-union"), chapters: allChaptersOpen(), stats: { ...startNewGame("astravia", "astravia-harvest-union").stats, politicalPower: 200, popularity: 60 } };
  const gov = state.foreignPolitics.veldoria;
  const opposition = Object.keys(gov.support).find((p) => p !== gov.rulingPartyId)!;

  it("cools when you back its opposition, warms when you back its rulers, and remembers why", () => {
    const against = pressureGovernment(state, "veldoria", opposition);
    expect(against.neighbours.veldoria.relations).toBe(RELATIONS_BACK_OPPOSITION);
    expect(against.neighbours.veldoria.feelings[0].text).toMatch(/against their government/);
    expect(pressureGovernment(state, "veldoria", gov.rulingPartyId).neighbours.veldoria.relations).toBe(RELATIONS_BACK_RULERS);
  });

  it("fades back toward neutral, or toward warm under the party you backed", () => {
    const cold = { ...state.neighbours.veldoria, relations: -20 };
    expect(fadeFeelings(cold, false).relations).toBe(-20 + RELATIONS_FADE_PER_MONTH);
    expect(fadeFeelings({ ...cold, relations: 0 }, true).relations).toBe(RELATIONS_FADE_PER_MONTH);
    expect(fadeFeelings({ ...cold, relations: 0 }, false).relations).toBe(0);
  });

  it("campaigns for you when warm, and against you harder when hostile", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0); // every neighbour meddles this month
    const unfriendly = { veldoria: { ...gov, backedPartyId: null } };
    expect(rollForeignMeddling(unfriendly, { veldoria: 0 })[0].supportDelta).toBe(-FOREIGN_MEDDLING_SUPPORT);
    expect(rollForeignMeddling(unfriendly, { veldoria: RELATIONS_WARM })[0].supportDelta).toBe(FOREIGN_MEDDLING_SUPPORT);
    expect(rollForeignMeddling(unfriendly, { veldoria: RELATIONS_HOSTILE })[0].supportDelta).toBe(-FOREIGN_MEDDLING_SUPPORT * RELATIONS_HOSTILE_MEDDLING);
    spy.mockRestore();
  });

  it("races you harder for the islands when hostile", () => {
    const rich = { ...createNeighbour("veldoria"), treasury: 50000 };
    const months = Array.from({ length: 200 }, (_, i) => RACE_FROM_MONTH + i);
    const sails = (n: typeof rich) => months.filter((m) => chooseVoyage(n, "veldoria", m, "island-1")).length;
    expect(sails({ ...rich, relations: RELATIONS_HOSTILE })).toBeGreaterThan(sails(rich));
  });

  it("is remembered by saves, and older saves start neutral", () => {
    const old = JSON.parse(JSON.stringify(state));
    for (const n of Object.values(old.neighbours) as Array<Record<string, unknown>>) {
      delete n.relations;
      delete n.feelings;
    }
    const loaded = hydrateGameState(old);
    expect(loaded.neighbours.veldoria.relations).toBe(0);
    expect(loaded.neighbours.veldoria.feelings).toEqual([]);
  });
});

describe("trade with a neighbour", () => {
  const start = startNewGame("astravia", "astravia-harvest-union");
  const state: GameState = { ...start, chapters: allChaptersOpen(), stats: { ...start.stats, treasury: 20000 }, resources: { ...start.resources, ore: 500 } };
  // The first month from the third year in which Veldoria's dice say "write".
  const month = Array.from({ length: 240 }, (_, i) => i + 1).find((m) => neighbourDice("veldoria", m, "trade") < TRADE_OFFER_CHANCE)!;
  const veldoria = state.neighbours.veldoria;

  it("offers food from a store bigger than it needs, under the market's price", () => {
    const offer = draftOffer({ ...veldoria, food: 1e8 }, "veldoria", month, state.market, false, state.resources)!;
    expect(offer.kind).toBe("sell");
    expect(offer.price).toBeLessThan(getBuyCost(state.market, "food", offer.amount, false));
  });

  it("otherwise offers to buy what its temper wants, over what the market pays", () => {
    const offer = draftOffer({ ...veldoria, food: 0, treasury: 1e6 }, "veldoria", month, state.market, false, state.resources)!;
    expect(offer).toMatchObject({ kind: "buy", good: "ore" });
    expect(offer.price).toBeGreaterThan(getSellRevenue(state.market, "ore", offer.amount));
  });

  it("deals better the warmer it is, and not at all when hostile", () => {
    const rich = { ...veldoria, food: 1e8 };
    const cool = draftOffer(rich, "veldoria", month, state.market, false, state.resources)!;
    const warm = draftOffer({ ...rich, relations: 50 }, "veldoria", month, state.market, false, state.resources)!;
    expect(warm.price).toBeLessThan(cool.price);
    expect(draftOffer({ ...rich, relations: RELATIONS_HOSTILE }, "veldoria", month, state.market, false, state.resources)).toBeNull();
  });

  it("accepted: the goods and Crowns change hands, and they think better of you", () => {
    const offered: GameState = { ...state, pendingOffer: { nationId: "veldoria", kind: "buy", good: "ore", amount: 40, price: 900 } };
    const done = acceptOffer(offered);
    expect(done.pendingOffer).toBeNull();
    expect(done.resources.ore).toBe(state.resources.ore - 40);
    expect(done.stats.treasury).toBe(state.stats.treasury + 900);
    expect(done.neighbours.veldoria.treasury).toBe(veldoria.treasury - 900);
    expect(done.neighbours.veldoria.relations).toBe(veldoria.relations + RELATIONS_TRADE);
  });

  it("declined: nothing changes but the letter is gone", () => {
    const offered: GameState = { ...state, pendingOffer: { nationId: "veldoria", kind: "sell", good: "food", amount: 1000, price: 100 } };
    const declined = declineOffer(offered);
    expect(declined.pendingOffer).toBeNull();
    expect(declined.stats).toEqual(offered.stats);
  });
});
