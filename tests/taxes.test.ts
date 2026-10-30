// The tax rate from handouts to riots: what it brings in, what people make of
// it, and that the two ends do what the Money window says they do.
import { describe, expect, it } from "vitest";
import { setTaxRate } from "../src/application/actions";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { MAX_TAX_RATE, MIN_TAX_RATE, TAX_HANDOUT_COST, TAX_HEAVY_RATE, TAX_RIOT_RATE } from "../src/domain/constants";
import type { GameState } from "../src/domain/country/types";
import { getCollectedTaxRate, getTaxStabilityPenalty } from "../src/domain/economy/economyRules";
import { getAcceptedTaxRate, getTaxMood } from "../src/domain/politics/politicsRules";

const newGame = (rate: number) => setTaxRate({ ...startNewGame("astravia", "astravia-harvest-union"), isPaused: false }, rate);

function play(state: GameState, days: number, until?: (s: GameState) => boolean): { state: GameState; days: number } {
  let s = state;
  for (let i = 0; i < days; i++) {
    if (s.pendingDecisionId) s = { ...s, pendingDecisionId: null };
    s = simulateDay(s);
    if (until?.(s)) return { state: s, days: i + 1 };
  }
  return { state: s, days };
}

describe("what a tax rate brings in", () => {
  it("is the rate itself up to the heavy line, and a payment below zero", () => {
    expect(getCollectedTaxRate(0.15)).toBe(0.15);
    expect(getCollectedTaxRate(TAX_HEAVY_RATE)).toBe(TAX_HEAVY_RATE);
    expect(getCollectedTaxRate(MIN_TAX_RATE)).toBe(MIN_TAX_RATE * TAX_HANDOUT_COST);
  });

  it("rises, peaks, then falls: the highest rate brings in less than a middling one", () => {
    const at = (r: number) => getCollectedTaxRate(r);
    expect(at(0.55)).toBeGreaterThan(at(TAX_HEAVY_RATE));
    expect(at(MAX_TAX_RATE)).toBeLessThan(at(TAX_HEAVY_RATE));
    expect(at(MAX_TAX_RATE)).toBeLessThan(at(0.15) * 2.5);
  });
});

describe("what people make of it", () => {
  it("runs one way, with no bumps, across the whole range", () => {
    for (let r = MIN_TAX_RATE; r < MAX_TAX_RATE; r += 0.05) expect(getTaxMood(r + 0.05)).toBeLessThan(getTaxMood(r));
    expect(getTaxMood(getAcceptedTaxRate())).toBeCloseTo(0);
  });

  it("buys little with handouts: far less per point than an ordinary tax cut", () => {
    expect(getTaxMood(-0.05) - getTaxMood(0)).toBeLessThan((getTaxMood(0.05) - getTaxMood(0.1)) / 4);
    expect(getTaxMood(MIN_TAX_RATE) - getTaxMood(0.05)).toBeLessThan(6);
  });

  it("breaks order only past the riot line, faster the higher", () => {
    expect(getTaxStabilityPenalty(TAX_RIOT_RATE)).toBe(0);
    expect(getTaxStabilityPenalty(0.15)).toBe(0);
    expect(getTaxStabilityPenalty(MAX_TAX_RATE)).toBeGreaterThan(getTaxStabilityPenalty(0.6));
  });
});

describe("the ends of the range, played", () => {
  it("clamps to the range", () => {
    expect(newGame(5).taxRate).toBe(MAX_TAX_RATE);
    expect(newGame(-5).taxRate).toBe(MIN_TAX_RATE);
  });

  it("brings riots within a year at the highest rate, far sooner than the usual one", () => {
    const riots = (s: GameState) => s.unrestStage === "riots";
    const high = play(newGame(MAX_TAX_RATE), 360, riots);
    expect(riots(high.state)).toBe(true);
    const usual = play(newGame(0.15), high.days, riots);
    expect(riots(usual.state)).toBe(false);
  });

  it("pays handouts until the treasury is dry, then stops them", () => {
    const start = { ...newGame(MIN_TAX_RATE), stats: { ...newGame(MIN_TAX_RATE).stats, treasury: 200 } };
    expect(simulateDay(start).stats.treasury).toBeLessThan(start.stats.treasury + 8 + 1);
    const { state } = play(start, 200, (s) => s.taxRate === 0);
    expect(state.taxRate).toBe(0);
    expect(state.stats.treasury).toBeGreaterThanOrEqual(0);
  });
});
