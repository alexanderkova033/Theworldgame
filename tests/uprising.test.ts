// Uprisings: a province that riots too long rises, seizes its workplaces and
// pays no taxes, and is ended by militia, or burns out in a calm country.
// Put down by force, it rises again sooner. See domain/uprising.
import { beforeEach, describe, expect, it } from "vitest";
import { buildFarm } from "../src/application/actions/buildFarm";
import { canSendMilitia, disbandMilitia, raiseMilitia, recallMilitia, sendMilitia } from "../src/application/actions/militiaActions";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import {
  MILITIA_SEND_POLITICAL_POWER,
  UPRISING_AGGRIEVED_START_BONUS,
  UPRISING_START_STRENGTH,
} from "../src/domain/constants";
import { getDifficulty } from "../src/domain/difficulty/difficultyData";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { getWorkingCounts } from "../src/domain/maintenance/maintenanceRules";
import type { ProvinceState } from "../src/domain/provinces/types";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261018));
// Shared states below are built as the file loads, before any test runs:
// seed them too, so they don't depend on which test file ran first.
seedRandom(20261018);

// On Normal: 30 days, or 10 while it remembers being put down.
const UPRISING_RIOT_DAYS = getDifficulty("normal").uprisingRiotDays;
const UPRISING_RIOT_DAYS_AGGRIEVED = Math.ceil(UPRISING_RIOT_DAYS / 3);

const base: GameState = {
  ...startNewGame("astravia", "astravia-harvest-union"),
  chapters: allChaptersOpen(),
  stats: { ...startNewGame("astravia", "astravia-harvest-union").stats, treasury: 20000, politicalPower: 200 },
};
// The province with the most workplaces, so seizing them shows.
const target = Object.keys(base.provinces).sort(
  (a, b) =>
    base.placedBuildings.filter((x) => x.provinceId === b && x.type !== "housing").length -
    base.placedBuildings.filter((x) => x.provinceId === a && x.type !== "housing").length,
)[0];

function withProvince(state: GameState, change: Partial<ProvinceState>): GameState {
  return { ...state, provinces: { ...state.provinces, [target]: { ...state.provinces[target], ...change } } };
}

function day(state: GameState): GameState {
  return simulateDay({ ...state, isPaused: false, pendingDecisionId: null });
}

// On the brink: rioting for all but the last day it takes to rise.
const brink = withProvince(base, { unrestStage: "riots", stability: 5, riotDays: UPRISING_RIOT_DAYS - 1 });
const risen = day(brink);

describe("a province rioting too long", () => {
  it("rises, seizing its workplaces but not its homes", () => {
    expect(base.provinces[target].uprising).toBeNull();
    expect(risen.provinces[target].uprising?.strength).toBeCloseTo(UPRISING_START_STRENGTH, 0);
    const here = risen.placedBuildings.filter((b) => b.provinceId === target);
    expect(here.filter((b) => b.type !== "housing").every((b) => b.condition === "seized")).toBe(true);
    expect(here.filter((b) => b.type === "housing").some((b) => b.condition === "seized")).toBe(false);
    expect(risen.events.some((e) => e.message.includes("has risen"))).toBe(true);
  });

  it("stops counting its workplaces and paying taxes", () => {
    expect(getWorkingCounts(risen).farms + getWorkingCounts(risen).factories).toBeLessThan(getWorkingCounts(brink).farms + getWorkingCounts(brink).factories);
    const calm = getDailyProductionSummary({ ...risen, provinces: { ...risen.provinces, [target]: { ...risen.provinces[target], uprising: null } } });
    expect(getDailyProductionSummary(risen).taxIncome).toBeLessThan(calm.taxIncome);
  });

  it("can't be built in", () => {
    expect(buildFarm.canBuild(risen, target)).toBe(false);
  });

  it("doesn't rise a day early", () => {
    const early = day(withProvince(base, { unrestStage: "riots", stability: 5, riotDays: UPRISING_RIOT_DAYS - 2 }));
    expect(early.provinces[target].uprising).toBeNull();
  });
});

describe("an uprising", () => {
  it("grows while the country is unsettled", () => {
    let s = { ...risen, stats: { ...risen.stats, stability: 30 } };
    const before = s.provinces[target].uprising!.strength;
    for (let i = 0; i < 20; i++) s = day({ ...s, stats: { ...s.stats, stability: 30 } });
    expect(s.provinces[target].uprising!.strength).toBeGreaterThan(before);
  });

  it("burns out in a calm country, leaving no grievance", () => {
    let s = withProvince({ ...risen, stats: { ...risen.stats, stability: 70 } }, { uprising: { ...risen.provinces[target].uprising!, strength: 3 } });
    for (let i = 0; i < 30 && s.provinces[target].uprising; i++) s = day({ ...s, stats: { ...s.stats, stability: 70 } });
    expect(s.provinces[target].uprising).toBeNull();
    expect(s.provinces[target].aggrievedUntil).toBeNull();
    expect(s.placedBuildings.some((b) => b.condition === "seized")).toBe(false);
    expect(s.events.some((e) => e.message.includes("burns out"))).toBe(true);
  });

  it("is put down by militia within a couple of months, and remembered", () => {
    let s = raiseMilitia(raiseMilitia(risen));
    s = sendMilitia(sendMilitia(s, target), target);
    expect(s.provinces[target].uprising!.militia).toBe(2);
    for (let i = 0; i < 60 && s.provinces[target].uprising; i++) s = day({ ...s, stats: { ...s.stats, stability: 30 } });
    expect(s.provinces[target].uprising).toBeNull();
    expect(s.provinces[target].aggrievedUntil).not.toBeNull();
    expect(s.placedBuildings.some((b) => b.condition === "seized")).toBe(false);
    expect(s.events.some((e) => e.message.includes("is put down"))).toBe(true);
  });

  it("rises again sooner, and stronger, while the province remembers", () => {
    const aggrieved = withProvince(base, {
      unrestStage: "riots",
      stability: 5,
      riotDays: UPRISING_RIOT_DAYS_AGGRIEVED - 1,
      aggrievedUntil: addDays(base.date, 100),
    });
    const again = day(aggrieved).provinces[target].uprising;
    expect(again?.strength).toBeCloseTo(UPRISING_START_STRENGTH + UPRISING_AGGRIEVED_START_BONUS, 0);
  });
});

describe("the militia", () => {
  it("is sent in as an order: political power and support", () => {
    const s = raiseMilitia(risen);
    const sent = sendMilitia(s, target);
    expect(sent.stats.politicalPower).toBe(s.stats.politicalPower - MILITIA_SEND_POLITICAL_POWER);
    expect(sent.stats.popularity).toBeLessThan(s.stats.popularity);
  });

  it("can only send a company it has at home, and only to a risen province", () => {
    const s = sendMilitia(raiseMilitia(risen), target);
    expect(canSendMilitia(s, target)).toBe(false);
    const other = Object.keys(base.provinces).find((id) => id !== target)!;
    expect(canSendMilitia(raiseMilitia(risen), other)).toBe(false);
    expect(disbandMilitia(s).workforce.militia).toBe(1);
    expect(disbandMilitia(recallMilitia(s, target)).workforce.militia).toBe(0);
  });

  it("comes home when it is no longer on the payroll", () => {
    const s = sendMilitia(raiseMilitia(risen), target);
    // As if it walked off unpaid: the company sent in is called back.
    const unpaid = day({ ...s, workforce: { ...s.workforce, militia: 0 } });
    expect(unpaid.provinces[target].uprising?.militia ?? 0).toBe(0);
  });
});
