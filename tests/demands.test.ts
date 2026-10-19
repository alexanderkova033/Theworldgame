// Demands: workers asking for a pay rise even in a decent province, and
// rebels sending their terms. See domain/uprising/demandRules.ts.
import { beforeEach, describe, expect, it } from "vitest";
import { answerDemand, canAnswerDemand } from "../src/application/actions/demandActions";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import {
  AMNESTY_POLITICAL_POWER,
  DEMAND_DISPUTE_UNREST,
  DEMAND_PAY_RISE_PER_DAY,
  REBEL_TERMS_AFTER_DAYS,
  REBEL_TERMS_REFUSED_STRENGTH,
} from "../src/domain/constants";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { updateProvinceOrder } from "../src/domain/provinces/provinceOrder";
import type { ProvinceState } from "../src/domain/provinces/types";
import { pickPayRiseProvince } from "../src/domain/uprising/demandRules";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261018));
// Shared states below are built as the file loads, before any test runs:
// seed them too, so they don't depend on which test file ran first.
seedRandom(20261018);

const start = startNewGame("astravia", "astravia-harvest-union");
const base: GameState = { ...start, chapters: allChaptersOpen(), stats: { ...start.stats, treasury: 20000, politicalPower: 200 } };
const factoryTown = Object.keys(base.provinces).find((id) => base.placedBuildings.some((b) => b.provinceId === id && b.type === "factory"))!;

function withProvince(state: GameState, id: string, change: Partial<ProvinceState>): GameState {
  return { ...state, provinces: { ...state.provinces, [id]: { ...state.provinces[id], ...change } } };
}

function day(state: GameState): GameState {
  return simulateDay({ ...state, isPaused: false, pendingDecisionId: null });
}

const asked: GameState = { ...base, pendingDemand: { kind: "payRise", provinceId: factoryTown } };

describe("workers asking for a pay rise", () => {
  it("come from a decent province with factories", () => {
    expect(pickPayRiseProvince(base.provinces, base.placedBuildings, base.date)).not.toBeNull();
    const all = Object.keys(base.provinces);
    for (let i = 0; i < 20; i++) {
      const asker = pickPayRiseProvince(base.provinces, base.placedBuildings, base.date)!;
      expect(all).toContain(asker);
      expect(base.placedBuildings.some((b) => b.provinceId === asker && b.type === "factory")).toBe(true);
    }
  });

  it("arrive by letter now and then, and stop the clock", () => {
    let s = base;
    let letter: GameState | null = null;
    // Kept steady, so the country lasts long enough to hear from them.
    for (let i = 0; i < 360 * 2 && !letter; i++) {
      s = day({ ...s, pendingDemand: null, stats: { ...s.stats, stability: 60, treasury: 20000 } });
      if (s.pendingDemand?.kind === "payRise") letter = s;
    }
    expect(letter).not.toBeNull();
    expect(letter!.isPaused).toBe(true);
  });

  it("granted: wages go up for a year, and the province calms", () => {
    const granted = answerDemand(asked, "grant");
    expect(granted.pendingDemand).toBeNull();
    expect(granted.provinces[factoryTown].stability).toBeGreaterThan(asked.provinces[factoryTown].stability);
    expect(getDailyProductionSummary(granted).salaries - getDailyProductionSummary(asked).salaries).toBeCloseTo(DEMAND_PAY_RISE_PER_DAY, 5);
    const yearOn = { ...granted, date: addDays(granted.date, 360) };
    expect(getDailyProductionSummary(yearOn).salaries).toBeCloseTo(getDailyProductionSummary({ ...asked, date: yearOn.date }).salaries, 5);
  });

  it("refused: the province sits well below the nation's mood for months", () => {
    const refused = answerDemand(asked, "refuse");
    expect(refused.provinces[factoryTown].disputeUntil).not.toBeNull();
    const labour = Object.fromEntries(Object.keys(refused.provinces).map((id) => [id, { workers: 0, unemployed: 0 }]));
    const capacity = Object.fromEntries(Object.keys(refused.provinces).map((id) => [id, 1e9]));
    // Settle both for months: the disputed one ends far lower.
    let calm = asked.provinces;
    let disputed = refused.provinces;
    for (let i = 0; i < 90; i++) {
      calm = updateProvinceOrder(calm, 60, capacity, labour as never, refused.date).provinces;
      disputed = updateProvinceOrder(disputed, 60, capacity, labour as never, refused.date).provinces;
    }
    expect(calm[factoryTown].stability - disputed[factoryTown].stability).toBeGreaterThan(DEMAND_DISPUTE_UNREST * 0.8);
  });
});

describe("rebels' terms", () => {
  const risenAt = { since: base.date, strength: 50, militia: 0, lastTerms: null };
  const risen = withProvince(base, factoryTown, { unrestStage: "riots", stability: 5, uprising: risenAt });

  it("arrive two weeks after rising", () => {
    let s = risen;
    for (let i = 0; i < REBEL_TERMS_AFTER_DAYS - 1; i++) s = day({ ...s, stats: { ...s.stats, stability: 30 } });
    expect(s.pendingDemand).toBeNull();
    for (let i = 0; i < 3 && !s.pendingDemand; i++) s = day({ ...s, stats: { ...s.stats, stability: 30 } });
    expect(s.pendingDemand).toEqual({ kind: "rebelTerms", provinceId: factoryTown });
  });

  const terms: GameState = { ...risen, pendingDemand: { kind: "rebelTerms", provinceId: factoryTown } };

  it("met with an amnesty end the uprising in peace", () => {
    const pardoned = answerDemand(terms, "amnesty");
    expect(pardoned.provinces[factoryTown].uprising).toBeNull();
    expect(pardoned.provinces[factoryTown].aggrievedUntil).toBeNull();
    expect(pardoned.stats.politicalPower).toBe(terms.stats.politicalPower - AMNESTY_POLITICAL_POWER);
    expect(canAnswerDemand({ ...terms, stats: { ...terms.stats, politicalPower: 0 } }, "amnesty")).toBe(false);
  });

  it("met with a year without taxes end it too, and the province pays nothing", () => {
    const relieved = answerDemand(terms, "taxRelief");
    expect(relieved.provinces[factoryTown].uprising).toBeNull();
    const paying = { ...relieved, provinces: { ...relieved.provinces, [factoryTown]: { ...relieved.provinces[factoryTown], taxReliefUntil: null } } };
    expect(getDailyProductionSummary(relieved).taxIncome).toBeLessThan(getDailyProductionSummary(paying).taxIncome);
  });

  it("refused harden the uprising", () => {
    const refused = answerDemand(terms, "refuse");
    expect(refused.provinces[factoryTown].uprising!.strength).toBe(50 + REBEL_TERMS_REFUSED_STRENGTH);
  });
});
