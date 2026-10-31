// The first minute: when the step in hand can't be paid for, the objectives
// say what to do instead. Uses the real start of each nation, mess and all.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { buildFarm } from "../src/application/actions/buildFarm";
import { canRepairBuilding, repairBuilding } from "../src/application/actions/repairBuilding";
import { getDaysToSave } from "../src/application/getDaysToSave";
import { getObjectiveGuidance } from "../src/application/getObjectiveGuidance";
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
    // Caldenreich grows no wood: a farm's barn leaves too little for homes, and the market is shut.
    const state = running(buildFarm(open(nation, party, "easy"), province));
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
