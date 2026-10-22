// Province crises (see domain/crises): trouble that strikes one province,
// lasts a while, and is answered by letter.
import { beforeEach, describe, expect, it } from "vitest";
import { answerCrisis, canAnswerCrisis, getCrisisAnswers } from "../src/application/actions/crisisActions";
import { runCrises, strikeCrisis } from "../src/application/day/crises";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import {
  FELLING_DAYS,
  FELLING_REPLANT_DAYS,
  FEVER_FIRST_DEATHS,
  FLOOD_DIKE_COST,
  FLOOD_DIKE_DAYS,
  FLOOD_LEFT_DAYS,
  FLOOD_REBUILD_DAYS,
  SEAM_SHAFT_DAYS,
  SEAM_SHAFT_YIELD,
} from "../src/domain/constants";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { crisesFor, getLandProduction } from "../src/domain/crises/crisisRules";
import { getNation } from "../src/domain/nations/nationRules";
import { getPlace } from "../src/domain/provinces/provinceRules";
import { getNeighbours } from "../src/domain/provinces/provinceNeighbours";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261022));

const rich = (s: GameState): GameState => ({ ...s, chapters: allChaptersOpen(), stats: { ...s.stats, treasury: 20000 }, resources: { ...s.resources, wood: 200 } });
const astravia = rich(startNewGame("astravia", "astravia-harvest-union"));
const caldenreich = rich(startNewGame("caldenreich", "caldenreich-crown-loyalists"));
const provinceOf = (s: GameState, terrain: string) => getNation(s.nationId).provinceIds.find((id) => getPlace(id)?.terrain === terrain)!;
const coast = provinceOf(astravia, "coast");
const forest = provinceOf(astravia, "forest");
const hills = provinceOf(caldenreich, "hills");
const homesIn = (s: GameState, id: string) => s.placedBuildings.filter((b) => b.provinceId === id && b.type === "housing").length;
const farmsIn = (s: GameState, id: string) => s.placedBuildings.filter((b) => b.provinceId === id && b.type === "farm");
// Run the end-of-day crisis step on a given day.
const on = (s: GameState, date: GameState["date"]) => runCrises({ ...s, date });

describe("which crises a province is open to", () => {
  it("follows its land and the season", () => {
    const p = astravia.provinces[coast];
    expect(crisesFor(p, "coast", 1e6, "spring")).toEqual(expect.arrayContaining(["flood", "fishing"]));
    expect(crisesFor(p, "coast", 1e6, "summer")).not.toContain("flood");
    expect(crisesFor(p, "hills", 1e6, "summer")).toContain("seam");
    expect(crisesFor(p, "forest", 1e6, "summer")).toContain("felling");
    expect(crisesFor({ ...p, diked: true }, "coast", 1e6, "spring")).not.toContain("flood");
    expect(crisesFor({ ...p, seamYield: 0.5 }, "hills", 1e6, "spring")).not.toContain("seam");
  });

  it("brings fever only to a crowded province, and nothing to one already in trouble", () => {
    const p = astravia.provinces[coast];
    expect(crisesFor(p, "plains", p.population, "summer")).not.toContain("fever");
    expect(crisesFor(p, "plains", p.population * 0.9, "summer")).toContain("fever");
    const struck = strikeCrisis(astravia, coast, "fishing").provinces[coast];
    expect(crisesFor(struck, "coast", 1e6, "spring")).toEqual([]);
  });
});

describe("a flood", () => {
  const flooded = strikeCrisis(astravia, coast, "flood");

  it("ruins its farms, washes away half its homes, spoils food, and waits for an answer", () => {
    expect(farmsIn(flooded, coast).every((b) => b.condition === "ruined")).toBe(true);
    expect(homesIn(flooded, coast)).toBe(homesIn(astravia, coast) - Math.floor(homesIn(astravia, coast) / 2));
    expect(flooded.stats.food).toBeLessThan(astravia.stats.food);
    expect(flooded.pendingCrisis).toBe(coast);
    expect(flooded.isPaused).toBe(true);
    expect(getCrisisAnswers(flooded)).toEqual(["dike", "rebuild", "leave"]);
  });

  it("dammed: it costs, and once the dike stands the farms and homes are back and it floods no more", () => {
    const dike = answerCrisis(flooded, "dike");
    expect(dike.stats.treasury).toBe(flooded.stats.treasury - FLOOD_DIKE_COST);
    expect(dike.pendingCrisis).toBeNull();
    const done = on(dike, addDays(astravia.date, FLOOD_DIKE_DAYS));
    expect(done.provinces[coast].crisis).toBeNull();
    expect(done.provinces[coast].diked).toBe(true);
    expect(farmsIn(done, coast).every((b) => b.condition === undefined)).toBe(true);
    expect(homesIn(done, coast)).toBe(homesIn(astravia, coast));
  });

  it("rebuilt, it comes back sooner; left alone, the farms come back but the homes never do", () => {
    const rebuilt = on(answerCrisis(flooded, "rebuild"), addDays(astravia.date, FLOOD_REBUILD_DAYS));
    expect(rebuilt.provinces[coast].crisis).toBeNull();
    expect(rebuilt.provinces[coast].diked).toBe(false);
    expect(homesIn(rebuilt, coast)).toBe(homesIn(astravia, coast));
    const left = answerCrisis(flooded, "leave");
    expect(on(left, addDays(astravia.date, FLOOD_LEFT_DAYS - 1)).provinces[coast].crisis).not.toBeNull();
    const after = on(left, addDays(astravia.date, FLOOD_LEFT_DAYS));
    expect(farmsIn(after, coast).every((b) => b.condition === undefined)).toBe(true);
    expect(homesIn(after, coast)).toBe(homesIn(flooded, coast));
  });

  it("can't be answered with what you don't have, but always has a free way out", () => {
    const poor = { ...flooded, stats: { ...flooded.stats, treasury: 0 } };
    expect(canAnswerCrisis(poor, "dike")).toBe(false);
    expect(canAnswerCrisis(poor, "leave")).toBe(true);
  });
});

describe("a worked-out seam", () => {
  const worked = strikeCrisis(caldenreich, hills, "seam");
  const season = "summer" as const;

  it("stops the province's ore and coal", () => {
    expect(getLandProduction(worked, season).ore).toBeLessThan(getLandProduction(caldenreich, season).ore);
    expect(getLandProduction(worked, season).coal).toBeLessThan(getLandProduction(caldenreich, season).coal);
  });

  it("a deeper shaft brings half back once sunk", () => {
    const sunk = on(answerCrisis(worked, "shaft"), addDays(caldenreich.date, SEAM_SHAFT_DAYS));
    expect(sunk.provinces[hills].crisis).toBeNull();
    expect(sunk.provinces[hills].seamYield).toBe(SEAM_SHAFT_YIELD);
    const full = getLandProduction(caldenreich, season).ore;
    expect(getLandProduction(sunk, season).ore).toBeGreaterThan(getLandProduction(worked, season).ore);
    expect(getLandProduction(sunk, season).ore).toBeLessThan(full);
  });

  it("closing the pits shuts a works there; retooling keeps it", () => {
    const withWorks: GameState = { ...worked, placedBuildings: [...worked.placedBuildings, { id: "works", provinceId: hills, type: "factory" }], factoryCount: worked.factoryCount + 1 };
    const closed = answerCrisis(withWorks, "close");
    expect(closed.placedBuildings.some((b) => b.id === "works")).toBe(false);
    expect(closed.factoryCount).toBe(withWorks.factoryCount - 1);
    expect(closed.provinces[hills].seamYield).toBe(0);
    const retooled = answerCrisis(withWorks, "retool");
    expect(retooled.placedBuildings.some((b) => b.id === "works")).toBe(true);
    expect(retooled.provinces[hills].crisis).toBeNull();
  });
});

describe("a felled forest and failed fishing", () => {
  it("replanting brings the wood back a year sooner", () => {
    const felled = strikeCrisis(astravia, forest, "felling");
    expect(getLandProduction(felled, "summer").wood).toBeLessThan(getLandProduction(astravia, "summer").wood);
    const replanted = answerCrisis(felled, "replant");
    const regrown = answerCrisis(felled, "regrow");
    expect(replanted.provinces[forest].crisis!.until).toEqual(addDays(astravia.date, FELLING_REPLANT_DAYS));
    expect(regrown.provinces[forest].crisis!.until).toEqual(addDays(astravia.date, FELLING_DAYS));
  });

  it("boats sent further out bring half the catch", () => {
    const failed = strikeCrisis(astravia, coast, "fishing");
    const none = getLandProduction(answerCrisis(failed, "wait"), "summer").fish;
    const half = getLandProduction(answerCrisis(failed, "boats"), "summer").fish;
    expect(half).toBeGreaterThan(none);
    expect(half).toBeLessThan(getLandProduction(astravia, "summer").fish);
  });
});

describe("a fever", () => {
  it("kills some as it strikes, and left alone, spreads next door", () => {
    const sick = strikeCrisis(astravia, coast, "fever");
    expect(sick.provinces[coast].population).toBeCloseTo(astravia.provinces[coast].population * (1 - FEVER_FIRST_DEATHS));
    expect(sick.stats.population).toBeLessThan(astravia.stats.population);
    const left = answerCrisis(sick, "neglect");
    const spread = on(left, addDays(astravia.date, 31));
    const next = getNeighbours(coast).find((id) => spread.provinces[id]?.crisis?.kind === "fever");
    expect(next).toBeDefined();
    expect(spread.pendingCrisis).toBe(next);
    // Doctors keep it in place.
    expect(on(answerCrisis(sick, "doctors"), addDays(astravia.date, 20)).pendingCrisis).toBeNull();
  });
});

describe("crises in a played country", () => {
  it("strike now and then, and never before the first summer", () => {
    let s: GameState = { ...astravia, isPaused: false };
    let struck = 0;
    let first = -1;
    for (let day = 0; day < 3 * 360; day++) {
      s = simulateDay({ ...s, isPaused: false, pendingDecisionId: null, pendingDemand: null, pendingOffer: null });
      if (s.pendingCrisis) {
        struck += 1;
        if (first < 0) first = day;
        const answers = getCrisisAnswers(s);
        s = answerCrisis(s, answers[answers.length - 1]);
      }
    }
    expect(struck).toBeGreaterThan(0);
    expect(first).toBeGreaterThan(150);
  });

  it("are remembered by saves, and older saves have none", () => {
    const struck = strikeCrisis(astravia, coast, "flood");
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(struck)));
    expect(loaded.pendingCrisis).toBe(coast);
    expect(loaded.provinces[coast].crisis?.kind).toBe("flood");
    const old = JSON.parse(JSON.stringify(astravia));
    delete old.pendingCrisis;
    for (const p of Object.values(old.provinces) as Array<Record<string, unknown>>) {
      delete p.crisis;
      delete p.diked;
      delete p.seamYield;
    }
    const hydrated = hydrateGameState(old);
    expect(hydrated.pendingCrisis).toBeNull();
    expect(hydrated.provinces[coast]).toMatchObject({ crisis: null, diked: false, seamYield: 1 });
  });
});
