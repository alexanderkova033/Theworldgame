// A warning says what is true: food gone is gone, one event makes one notice,
// and a stalled project names what it is short of.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdvisorOutlook } from "../src/application/getAdvisorOutlook";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { getForecasts } from "../src/application/getForecasts";
import { getHeatingOutlook } from "../src/application/getHeatingOutlook";
import { playDay } from "../src/application/playDay";
import { simulateDay } from "../src/application/simulateDay";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import type { Project } from "../src/domain/construction/types";
import type { GameState } from "../src/domain/country/types";
import { calmStart } from "./support/calmStart";

const start = calmStart("astravia", "astravia-harvest-union");
const base: GameState = { ...start, chapters: allChaptersOpen(), stats: { ...start.stats, treasury: 20000 }, isPaused: false, events: [] };
const noFarms: GameState = { ...base, placedBuildings: base.placedBuildings.filter((b) => b.type !== "farm") };

// No chance events: a demand or a letter arriving the same day pauses the game
// first, and then the pause has no notice of its own.
beforeEach(() => void vi.spyOn(Math, "random").mockReturnValue(0.99));
afterEach(() => void vi.restoreAllMocks());

function withFood(state: GameState, food: number): GameState {
  return { ...state, stats: { ...state.stats, food } };
}

function foodAlert(state: GameState) {
  const production = getDailyProductionSummary(state);
  return getAdvisorOutlook(state, production, getHeatingOutlook(state), getForecasts(state, production)).alerts.find((a) => a.kind === "food");
}

describe("food gone", () => {
  it("says so while the store is empty and still falling, and gives no future date", () => {
    const state = withFood(noFarms, 0);
    expect(getDailyProductionSummary(state).netFood).toBeLessThan(0);
    const alert = foodAlert(state)!;
    expect(alert.text).toBe("Food exhausted");
    expect(alert.detail).toBe("The food is gone and the people are going hungry. Build farms, or buy food.");
    expect(alert.critical).toBe(true);
    expect(getForecasts(state, getDailyProductionSummary(state)).food).toEqual({ days: 0, date: state.date });
  });

  it("still counts the days while any food is left", () => {
    const state = withFood(noFarms, 1);
    expect(foodAlert(state)!.text).toBe("Food: 1 day");
    expect(foodAlert(state)!.detail).toContain("runs out around");
  });

  it("is not called gone when an empty store is filling up again", () => {
    const state = withFood(base, 0);
    const production = { ...getDailyProductionSummary(state), netFood: 100 };
    expect(getForecasts(state, production).food?.days).not.toBe(0);
  });
});

describe("one notice when the food runs out", () => {
  const nearlyOut = withFood(noFarms, 1);
  const hungerNotices = (state: GameState) => state.events.filter((e) => e.topic === "hunger" || e.about === "hunger");

  it("is the pause, which still stops the clock and offers the way to food", () => {
    const after = playDay({ ...nearlyOut, speed: 2 });
    expect(after.stats.food).toBe(0);
    expect(after.isPaused).toBe(true);
    expect(after.events.some((e) => e.message.startsWith("Food shortage"))).toBe(false);
    expect(hungerNotices(after).map((e) => e.message)).toEqual(["Paused: the food has run out. Resume when you're ready (Space)."]);
  });

  it("is the shortage notice at 1x, where nothing pauses", () => {
    const after = playDay({ ...nearlyOut, speed: 1 });
    expect(after.isPaused).toBe(false);
    expect(hungerNotices(after).map((e) => e.message)).toEqual(["Food shortage! The population is going hungry."]);
  });

  it("is the shortage notice when this season's pause has already been used", () => {
    const paused = playDay({ ...nearlyOut, speed: 2 });
    const refilled = { ...withFood(paused, 1), isPaused: false, events: [] };
    const after = playDay(refilled);
    expect(after.isPaused).toBe(false);
    expect(hungerNotices(after).map((e) => e.message)).toEqual(["Food shortage! The population is going hungry."]);
  });

  it("leaves the following days' shortage notices alone", () => {
    const paused = playDay({ ...nearlyOut, speed: 2 });
    const after = playDay({ ...paused, isPaused: false });
    expect(hungerNotices(after).map((e) => e.message)).toEqual(["Food shortage! The population is going hungry.", "Paused: the food has run out. Resume when you're ready (Space)."]);
  });
});

describe("a stalled project's notice", () => {
  const project: Project = {
    id: "project-test",
    type: "housing",
    label: "Homes",
    totalDays: 40,
    daysRemaining: 20,
    provinceId: base.placedBuildings[0].provinceId,
    treasuryCostPerDay: 5.4,
    resourceType: "wood",
    resourceCostPerDay: 0.3,
    isStalled: false,
  };

  function stallNotice(treasury: number, wood: number, stalled = project): string | undefined {
    const state: GameState = { ...base, projects: [stalled], stats: { ...base.stats, treasury }, resources: { ...base.resources, wood } };
    return simulateDay(state).events.find((e) => e.topic === "stall")?.message;
  }

  it("names the money, when money ran out", () => {
    expect(stallNotice(1, 50)).toBe("Homes construction has stalled: short of money. It needs 6 Cr a day to resume.");
  });

  it("names the good, with money in hand", () => {
    expect(stallNotice(20000, 0)).toBe("Homes construction has stalled: short of wood. It needs 0.3 wood a day to resume.");
  });

  it("names both, when both ran out", () => {
    expect(stallNotice(1, 0)).toBe("Homes construction has stalled: short of money and wood. It needs 6 Cr and 0.3 wood a day to resume.");
  });

  it("names the money for a project that takes no good", () => {
    expect(stallNotice(1, 50, { ...project, resourceType: null, resourceCostPerDay: 0 })).toBe("Homes construction has stalled: short of money. It needs 6 Cr a day to resume.");
  });

  it("stays silent when the project can pay", () => {
    expect(stallNotice(20000, 50)).toBeUndefined();
  });
});
