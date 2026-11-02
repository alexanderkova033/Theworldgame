// The first minute: when the step in hand can't be paid for, the objectives
// say what to do instead. Uses the real start of each nation, mess and all.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { buildFarm } from "../src/application/actions/buildFarm";
import { canRepairBuilding, repairBuilding } from "../src/application/actions/repairBuilding";
import { getDaysToSave } from "../src/application/getDaysToSave";
import { STORY_RULES } from "../src/application/chapters";
import { getCurrentObjective, getObjectiveGuidance, getObjectiveUnderway, MARROW_PROVINCES, THORNWICK_PROVINCES } from "../src/application/getObjectiveGuidance";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { upfrontCost } from "../src/application/actions/createBuildAction";
import { allChaptersOpen, type ChapterId } from "../src/domain/chapters/chapterData";
import { EDUCATION_COST, FARM_COST, HARBOUR_COST, REPAIR_DAYS } from "../src/domain/constants";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import type { Difficulty } from "../src/domain/difficulty/difficultyData";
import type { GameState } from "../src/domain/country/types";
import { getNation } from "../src/domain/nations/nationRules";
import { Objectives } from "../src/presentation/components/Objectives";
import { NATIONS } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const REPAIR = 0;
const FARM = 1;
const HOMES = 2;

beforeEach(() => seedRandom(1));

const open = (nation: string, party: string, level: Difficulty): GameState => {
  const state = startNewGame(nation, party, level);
  return { ...state, chapters: { ...state.chapters, unread: [] } };
};
const day = (state: GameState): GameState => simulateDay({ ...state, isPaused: false });
const words = (state: GameState) => renderToStaticMarkup(createElement(Objectives, { state, onOpenPanel: () => {} }));
const repairAll = (state: GameState) => state.placedBuildings.filter((b) => b.condition === "broken").reduce((s, b) => repairBuilding(s, b.id), state);

describe.each(NATIONS)("the first minute in %s", (nation, party) => {
  it("on Normal, paused at the start with no money, says to start the clock and names the control", () => {
    const state = open(nation, party, "normal");
    expect(getObjectiveGuidance(state, "first-winter", REPAIR)).toEqual({ kind: "startClock" });
    expect(words(state)).toContain("Start the clock: Space or Resume.");
    expect(words(state)).not.toContain("Go ›");
  });

  it("on Normal, with the clock running and the money short, gives the cost and the wait", () => {
    const state = day(open(nation, party, "normal"));
    const days = getDaysToSave(state, 325 - state.stats.treasury);
    expect(days).toBeGreaterThan(1);
    expect(getObjectiveGuidance(state, "first-winter", REPAIR)).toEqual({ kind: "saving", cost: 325, days });
    expect(words(state)).toContain(`325 Cr to start. Enough in ${days} days.`);
    expect(words(state)).not.toContain("Go ›");
  });

  it("on Normal, once the money is there, goes back to Go", () => {
    let state = open(nation, party, "normal");
    while (!state.placedBuildings.some((b) => canRepairBuilding(state, b.id))) state = day(state);
    expect(getObjectiveGuidance(state, "first-winter", REPAIR)).toBeNull();
    expect(words(state)).toContain("Go ›");
    expect(words(state)).not.toContain("objectives__guidance");
  });

  it("on Normal, the first repair is in reach within 30 days", () => {
    let state = open(nation, party, "normal");
    let days = 0;
    while (!state.placedBuildings.some((b) => canRepairBuilding(state, b.id))) {
      state = day(state);
      days++;
    }
    expect(days).toBeLessThanOrEqual(30);
  });

  it("on Easy, with money in hand, shows Go and no guidance", () => {
    const state = open(nation, party, "easy");
    expect(getObjectiveGuidance(state, "first-winter", REPAIR)).toBeNull();
    expect(words(state)).toContain("Go ›");
    expect(words(state)).not.toContain("objectives__guidance");
  });

  it("on Easy, once the repair is paid for, the farm can still be paid for", () => {
    const repaired = repairAll(open(nation, party, "easy"));
    expect(getObjectiveGuidance(repaired, "first-winter", FARM)).toBeNull();
  });
});

describe("guidance on the later steps", () => {
  const [nation, party] = NATIONS[1];
  const province = getNation(nation).capitalProvinceId;
  const noMoney = (state: GameState): GameState => ({ ...state, stats: { ...state.stats, treasury: 10 } });
  const running = (state: GameState): GameState => ({ ...state, date: { year: 1, month: 1, day: 5 }, isPaused: false });

  it("prices a building at what it takes to start", () => {
    const state = running(noMoney(open(nation, party, "normal")));
    expect(getObjectiveGuidance(state, "first-winter", FARM)).toMatchObject({ kind: "saving", cost: 390 });
    expect(getObjectiveGuidance(state, "first-winter", HOMES)).toMatchObject({ kind: "saving", cost: 210 });
  });

  it("names the goods when money isn't what's missing", () => {
    // Caldenreich grows no wood: with its stock spent on other works, 6 is one short of homes, and the market is shut.
    const farmed = running(buildFarm(open(nation, party, "easy"), province));
    const state = { ...farmed, resources: { ...farmed.resources, wood: 6 } };
    expect(getObjectiveGuidance(state, "first-winter", HOMES)).toEqual({ kind: "goods", good: "wood", short: 1 });
    const mended = { ...state, placedBuildings: state.placedBuildings.map((b) => ({ ...b, condition: undefined })) };
    expect(words(mended)).toContain("Needs 1 more wood to start.");
    expect(words(mended)).not.toContain("Go ›");
  });

  it("carries the guidance to the Also line when a newer chapter takes the card", () => {
    const state = running(noMoney(open(nation, party, "normal")));
    const later = { ...state, chapters: { ...state.chapters, opened: [...state.chapters.opened, "exchange" as const] } };
    expect(words(later)).toMatch(/325 Cr to start\. Enough in \d+ days\./);
  });

  it("says tomorrow when a day's income will do", () => {
    const state = running(open(nation, party, "normal"));
    const nearly = { ...state, stats: { ...state.stats, treasury: 320 } };
    expect(words(nearly)).toContain("325 Cr to start. Enough tomorrow.");
  });

  it("doesn't say to start the clock once the clock has run", () => {
    const state = { ...running(open(nation, party, "normal")), isPaused: true };
    expect(getObjectiveGuidance(state, "first-winter", REPAIR)).toMatchObject({ kind: "saving" });
  });

  it("says when the treasury isn't rising, rather than promising a day", () => {
    const base = running(open(nation, party, "normal"));
    // Instalments on a project bigger than the day's income.
    const dear = buildFarm({ ...base, stats: { ...base.stats, treasury: 5000 } }, province);
    const state: GameState = { ...dear, stats: { ...dear.stats, treasury: 0 }, projects: dear.projects.map((p) => ({ ...p, treasuryCostPerDay: 1000 })) };
    expect(getObjectiveGuidance(state, "first-winter", REPAIR)).toEqual({ kind: "saving", cost: 325, days: null });
    expect(words(state)).toContain("325 Cr to start. The treasury is not rising.");
  });

  it("has nothing to say for repairs already in hand, or a step with no price", () => {
    const base = open(nation, party, "normal");
    const rich = { ...base, stats: { ...base.stats, treasury: 5000 } };
    const inHand = noMoney(repairAll(rich));
    expect(getObjectiveGuidance(inHand, "first-winter", REPAIR)).toBeNull();
    expect(getObjectiveGuidance(noMoney(rich), "first-winter", 3)).toBeNull();
    expect(getObjectiveGuidance(noMoney(rich), "exchange", 0)).toBeNull();
  });
});

describe("repairs under way", () => {
  const [nation, party] = NATIONS[1];
  const province = getNation(nation).capitalProvinceId;
  const paid = (state: GameState) => {
    const rich = { ...state, stats: { ...state.stats, treasury: 5000 } };
    return repairAll(rich);
  };

  it("are paid for: the step says so, and the farm step takes over the Go", () => {
    const state = paid(open(nation, party, "normal"));
    expect(getObjectiveUnderway(state, "first-winter", REPAIR)).toBe(REPAIR_DAYS);
    expect(getCurrentObjective(state, "first-winter", [false, false, false, false])).toBe(FARM);
    const html = words(state);
    expect(html).toContain(`Under way. Back in service in ${REPAIR_DAYS} days.`);
    expect(html.indexOf("Go ›")).toBeGreaterThan(html.indexOf("Build a farm"));
    expect(html.match(/is-current/g)).toHaveLength(1);
  });

  it("let the farm step's guidance show when there is no money for it", () => {
    const state = { ...paid(open(nation, party, "normal")), date: { year: 1, month: 1, day: 5 }, isPaused: false };
    const broke = { ...state, stats: { ...state.stats, treasury: 10 } };
    expect(words(broke)).toContain("Under way.");
    expect(words(broke)).toMatch(/390 Cr to start\. Enough in \d+ days\./);
  });

  it("count down, singular at the last", () => {
    const state = paid(open(nation, party, "normal"));
    const nearly = { ...state, placedBuildings: state.placedBuildings.map((b) => (b.condition === "repairing" ? { ...b, repairDaysRemaining: 1 } : b)) };
    expect(words(nearly)).toContain("Back in service in 1 day.");
  });

  it("don't count until all of them are paid", () => {
    const state = { ...open(nation, party, "normal"), stats: { ...open(nation, party, "normal").stats, treasury: 5000 } };
    const [first] = state.placedBuildings.filter((b) => b.condition === "broken");
    const one = repairBuilding(state, first.id);
    expect(getObjectiveUnderway(one, "first-winter", REPAIR)).toBeNull();
    expect(getCurrentObjective(one, "first-winter", [false, false, false, false])).toBe(REPAIR);
    expect(words(one)).not.toContain("Under way.");
  });

  it("are done once they are done: the step is ticked and says no more", () => {
    let state = { ...paid(open(nation, party, "normal")), isPaused: false };
    for (let i = 0; i < REPAIR_DAYS + 1; i++) state = day(state);
    expect(state.placedBuildings.some((b) => b.condition === "repairing")).toBe(false);
    expect(words(state)).not.toContain("Under way.");
    expect(province).toBeTruthy();
  });
});

describe("the first day's wait", () => {
  it.each(NATIONS)("in %s counts down from the first day, and matches the day it is reached", (nation, party) => {
    let state = open(nation, party, "normal");
    const cost = 325;
    const first = getDaysToSave(state, cost - state.stats.treasury)!;
    state = { ...state, isPaused: false };
    let days = 0;
    while (state.stats.treasury < cost) {
      const said = getDaysToSave(state, cost - state.stats.treasury);
      expect(said, `on day ${days}`).toBe(first - days);
      state = day(state);
      days++;
    }
    expect(days).toBe(first);
  });

  it("does not change what the first day pays", () => {
    const state = open(...NATIONS[1], "normal");
    const before = state.stats.treasury;
    const income = getDailyProductionSummary(state);
    const after = day(state);
    expect(after.stats.treasury - before).toBeCloseTo(income.netTreasury, 6);
    expect(income.netTreasuryFromTomorrow).toBeCloseTo(getDailyProductionSummary(after).netTreasury, 1);
  });
});

describe("guidance on the school, Thornwick and harbour steps", () => {
  const [nation, party] = NATIONS.find(([id]) => id === "astravia")!;
  const SCHOOL = 1;
  const running = (state: GameState, treasury: number): GameState => ({ ...state, date: { year: 2, month: 6, day: 5 }, isPaused: false, chapters: allChaptersOpen(), stats: { ...state.stats, treasury } });
  const base = open(nation, party, "normal");
  const opened = (id: ChapterId, state: GameState): GameState => ({ ...state, chapters: { ...state.chapters, opened: [id], done: [], deeds: [...state.chapters.deeds, "astravia-petition:grant", "astravia-charter:grant"] } });

  it("prices a school at what it takes to start, in the style of the others", () => {
    const state = running(base, 10);
    expect(getObjectiveGuidance(state, "society", SCHOOL)).toMatchObject({ kind: "saving", cost: upfrontCost(EDUCATION_COST) });
    expect(words(opened("society", { ...state, researchFocus: { ...state.researchFocus, industry: "chosen" } }))).toMatch(/\d+ Cr to start\. Enough in \d+ days\./);
  });

  it("has nothing to say about a school once it can be paid for, or for the research step", () => {
    expect(getObjectiveGuidance(running(base, 5000), "society", SCHOOL)).toBeNull();
    expect(getObjectiveGuidance(running(base, 10), "society", 0)).toBeNull();
  });

  it("prices the farm in Thornwick, and only looks there", () => {
    const state = running(base, 10);
    expect(getObjectiveGuidance(state, "astravia:promise", 1)).toMatchObject({ kind: "saving", cost: upfrontCost(FARM_COST) });
    expect(getObjectiveGuidance(running(base, 5000), "astravia:promise", 1)).toBeNull();
    const lost = { ...state, provinces: Object.fromEntries(Object.entries(state.provinces).filter(([id]) => !id.startsWith("province-8"))) };
    expect(getObjectiveGuidance(lost, "astravia:promise", 1)).toBeNull();
  });

  it("names the goods when the money is there but Thornwick's farm wants wood", () => {
    const rich = running(base, 5000);
    const noWood = { ...rich, resources: { ...rich.resources, wood: 0 }, market: { ...rich.market, supply: { ...rich.market.supply, wood: 0 } } };
    expect(getObjectiveGuidance(noWood, "astravia:promise", 1)).toMatchObject({ kind: "goods", good: "wood" });
  });

  it.each([
    ["astravia:promise", "farm", THORNWICK_PROVINCES],
    ["astravia:coast", "harbour", MARROW_PROVINCES],
  ] as const)("looks in the same provinces as the story's own check on %s", (chapter, type, provinces) => {
    const check = STORY_RULES[chapter].checks[1];
    const withProject = (provinceId: string): GameState => ({ ...base, projects: [{ id: "p", type, label: type, totalDays: 1, daysRemaining: 1, provinceId, treasuryCostPerDay: 0, resourceType: "wood", resourceCostPerDay: 0, isStalled: false }] });
    for (const id of Object.keys(base.provinces)) expect(check(withProject(id)), id).toBe(provinces.includes(id));
  });

  it("prices the harbour on the Marrow Coast", () => {
    const state = running(base, 10);
    expect(getObjectiveGuidance(state, "astravia:coast", 1)).toMatchObject({ kind: "saving", cost: upfrontCost(HARBOUR_COST) });
    expect(getObjectiveGuidance(running(base, 50000), "astravia:coast", 1)).toBeNull();
  });

  it("stays quiet about a harbour while ventures are shut", () => {
    const shut = { ...running(base, 10), chapters: base.chapters };
    expect(getObjectiveGuidance(shut, "astravia:coast", 1)).toBeNull();
  });
});
