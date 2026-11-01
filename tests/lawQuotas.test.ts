// A law's population requirement scales with each country's starting size, and
// everything that reads the requirement agrees on the scaled figure.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { startNewGame } from "../src/application/startNewGame";
import type { GameState } from "../src/domain/country/types";
import { LAW_NODES } from "../src/domain/laws/lawData";
import { canEnactLaw, getLawNodeStatus, getQuotaProgress, getQuotaThreshold } from "../src/domain/laws/lawsRules";
import type { LawCategory, LawNode } from "../src/domain/laws/types";
import { LawsPanel } from "../src/presentation/components/LawsPanel";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { NATIONS } from "./support/carefulPlayer";

const lawAt = (category: LawCategory, tier: number): LawNode => LAW_NODES.find((n) => n.category === category && n.tier === tier && !n.ideology)!;
const firstLabour = lawAt("labor", 1); // listed at 10,000
const partyOf = (nation: string) => NATIONS.find(([id]) => id === nation)![1];
const start = (nation: string) => startNewGame(nation, partyOf(nation));
const withPeople = (state: GameState, population: number): GameState => ({ ...state, stats: { ...state.stats, population } });

describe("a law's population requirement", () => {
  // Listed: labour 10,000 and 10,500; food 11,800 to 14,000; order 11,500.
  it.each([
    ["astravia", [12000, 12600, 14160, 14760, 15600, 16800, 13800]],
    ["caldenreich", [10000, 10500, 11800, 12300, 13000, 14000, 11500]],
    ["veldoria", [8000, 8400, 9440, 9840, 10400, 11200, 9200]],
  ])("in %s is the listed row times its people over 10,000", (nation, expected) => {
    const state = start(nation);
    const rows = [lawAt("labor", 1), lawAt("labor", 2), lawAt("sustenance", 4), lawAt("sustenance", 5), lawAt("sustenance", 6), lawAt("sustenance", 7), lawAt("order", 3)];
    expect(rows.map((law) => getQuotaThreshold(state, law))).toEqual(expected);
  });

  it("leaves every other kind of requirement as listed, in every nation", () => {
    for (const [nation] of NATIONS) {
      const state = start(nation);
      for (const law of LAW_NODES.filter((n) => n.quota.stat !== "population")) expect(getQuotaThreshold(state, law), law.id).toBe(law.quota.threshold);
    }
  });

  it("comes from the nation, not from how many people are left", () => {
    const state = start("astravia");
    expect(getQuotaThreshold(withPeople(state, 5000), firstLabour)).toBe(12000);
  });
});

describe("what reads the requirement", () => {
  it.each(NATIONS)("%s: the first Labour law opens at exactly its own figure", (nation) => {
    const state = start(nation);
    const needed = getQuotaThreshold(state, firstLabour);
    expect(getLawNodeStatus(withPeople(state, needed - 1), firstLabour)).toBe("locked-quota");
    expect(getLawNodeStatus(withPeople(state, needed), firstLabour)).toBe("available");
  });

  it("Astravia is no longer past it at a figure Veldoria has long passed", () => {
    expect(getLawNodeStatus(withPeople(start("astravia"), 9000), firstLabour)).toBe("locked-quota");
    expect(getLawNodeStatus(withPeople(start("veldoria"), 9000), firstLabour)).toBe("available");
  });

  it("the vote itself goes by the scaled figure", () => {
    const rich = (state: GameState): GameState => ({ ...state, stats: { ...state.stats, treasury: 5000, politicalPower: 500 } });
    expect(canEnactLaw(rich(withPeople(start("veldoria"), 8000)), firstLabour.id)).toBe(true);
    expect(canEnactLaw(rich(withPeople(start("veldoria"), 7999)), firstLabour.id)).toBe(false);
    expect(canEnactLaw(rich(withPeople(start("astravia"), 11999)), firstLabour.id)).toBe(false);
  });

  it("progress counts toward the scaled figure", () => {
    expect(getQuotaProgress(withPeople(start("veldoria"), 6000), firstLabour)).toEqual({ current: 6000, threshold: 8000, ratio: 0.75 });
    expect(getQuotaProgress(withPeople(start("astravia"), 6000), firstLabour)).toEqual({ current: 6000, threshold: 12000, ratio: 0.5 });
  });

  it("the Laws window gives the player the scaled figure, on the tree and in the details", () => {
    const words = (state: GameState) => renderToStaticMarkup(createElement(LawsPanel, { state, alerts: [], dispatch: () => {} }));
    const veldoria = words(withPeople(start("veldoria"), 7500));
    expect(veldoria).toContain("Needs population 8,000");
    expect(veldoria).toContain("Unlocks when population reaches 8,000.");
    expect(veldoria).toMatch(/Population (<!-- -->)?7,500(<!-- -->)? \/ (<!-- -->)?8,000/);
    const astravia = words(withPeople(start("astravia"), 9000));
    expect(astravia).toContain("Needs population 12k");
    expect(astravia).toContain("Unlocks when population reaches 12k.");
    expect(astravia).not.toContain("10k");
  });
});

describe("an old save", () => {
  const roundTrip = (state: GameState) => hydrateGameState(JSON.parse(JSON.stringify(state)));

  it("uses its own nation's figure, whatever its population", () => {
    // Before countries differed, every one of them started at 10,000 people.
    const veldoria = roundTrip(withPeople(start("veldoria"), 10000));
    expect(getQuotaThreshold(veldoria, firstLabour)).toBe(8000);
    expect(getLawNodeStatus(veldoria, firstLabour)).toBe("available");
    const astravia = roundTrip(withPeople(start("astravia"), 10000));
    expect(getQuotaThreshold(astravia, firstLabour)).toBe(12000);
    expect(getLawNodeStatus(astravia, firstLabour)).toBe("locked-quota");
  });

  it("from the oldest shape, just a nation, a party and the numbers, does the same", () => {
    const { nationId, partyId, stats, date } = withPeople(start("veldoria"), 7000);
    const loaded = hydrateGameState({ nationId, partyId, stats, date });
    expect(getQuotaProgress(loaded, firstLabour)).toEqual({ current: 7000, threshold: 8000, ratio: 0.875 });
  });

  it("keeps a law it has already passed, even with the bar now higher", () => {
    const passed = { ...withPeople(start("astravia"), 10000), enactedLawIds: [firstLabour.id] };
    expect(getLawNodeStatus(roundTrip(passed), firstLabour)).toBe("enacted");
  });
});
