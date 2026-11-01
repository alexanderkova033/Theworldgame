// Each country starts with its own people, in a comparable mess, and those
// with no forest hold enough wood for the first winter's works.
import { describe, expect, it } from "vitest";
import { buildFarm } from "../src/application/actions/buildFarm";
import { buildHousing } from "../src/application/actions/buildHousing";
import { repairBuilding } from "../src/application/actions/repairBuilding";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { FARM_WOOD_COST, FOOD_PER_FARM, HOUSING_WOOD_COST, JOBS_PER_BUILDING, LABOUR_SHARE, PEOPLE_PER_HOME, STARTING_RESOURCE_STOCK } from "../src/domain/constants";
import type { GameState } from "../src/domain/country/types";
import { DIFFICULTIES } from "../src/domain/difficulty/difficultyData";
import { isFeatureOpen } from "../src/domain/chapters/chapterData";
import { getNation } from "../src/domain/nations/nationRules";
import { createNeighbour } from "../src/domain/neighbours/neighbourRules";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { NATIONS } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

const homesOf = (state: GameState) => state.placedBuildings.filter((b) => b.type === "housing").length;
const rich = (state: GameState): GameState => ({ ...state, isPaused: false, stats: { ...state.stats, treasury: 10000 } });

describe("three countries, three populations", () => {
  it("Astravia has the most people and Veldoria the fewest", () => {
    const people = NATIONS.map(([nation, party]) => startNewGame(nation, party).stats.population);
    expect(people).toEqual([12000, 10000, 8000]);
    expect(new Set(people).size).toBe(3);
  });

  it.each(NATIONS)("%s lives where its homes are, every person counted", (nation, party) => {
    const state = startNewGame(nation, party);
    expect(Object.values(state.provinces).reduce((sum, p) => sum + p.population, 0)).toBeCloseTo(state.stats.population);
  });

  it("every country holds the same food a person", () => {
    for (const level of DIFFICULTIES) {
      const perPerson = NATIONS.map(([nation, party]) => {
        const { stats } = startNewGame(nation, party, level);
        return stats.food / stats.population;
      });
      expect(new Set(perPerson).size).toBe(1);
    }
  });

  it.each(NATIONS)("%s starts short of homes on Normal, and with enough on Easy", (nation, party) => {
    const short = startNewGame(nation, party, "normal");
    const share = (homesOf(short) * PEOPLE_PER_HOME) / short.stats.population;
    expect(share).toBeGreaterThan(0.85);
    expect(share).toBeLessThan(1);
    const easy = startNewGame(nation, party, "easy");
    expect((homesOf(easy) * PEOPLE_PER_HOME) / easy.stats.population).toBeGreaterThanOrEqual(1);
  });

  it.each(NATIONS)("%s has farms near what its people eat and jobs for them all", (nation, party) => {
    const state = startNewGame(nation, party);
    const grown = (state.farmCount * FOOD_PER_FARM) / state.stats.population;
    expect(grown).toBeGreaterThanOrEqual(0.95);
    expect(grown).toBeLessThan(1.15);
    const jobs = state.farmCount * JOBS_PER_BUILDING.farm + state.factoryCount * JOBS_PER_BUILDING.factory;
    expect(jobs).toBeGreaterThan(state.stats.population * LABOUR_SHARE);
    expect(jobs).toBeLessThan(state.stats.population * LABOUR_SHARE * 1.3);
  });

  it.each(NATIONS)("%s is the same country as a neighbour", (nation, party) => {
    const played = startNewGame(nation, party, "easy");
    const neighbour = createNeighbour(nation);
    expect(neighbour.population).toBe(played.stats.population);
    expect(neighbour.farms).toBe(played.farmCount);
    expect(neighbour.food).toBe(played.stats.food);
    expect(neighbour.stability).toBe(played.stats.stability);
  });

  it("leaves an old save's people as they were", () => {
    const state = startNewGame("veldoria", "veldoria-ironworkers-guild");
    const saved = { ...state, stats: { ...state.stats, population: 10000 } };
    expect(hydrateGameState(JSON.parse(JSON.stringify(saved))).stats.population).toBe(10000);
  });
});

describe.each(["caldenreich", "veldoria"])("wood in %s, which grows none", (nation) => {
  const party = NATIONS.find(([id]) => id === nation)![1];
  const province = getNation(nation).capitalProvinceId;

  it.each(["easy", "normal", "hard", "ruthless"] as const)("on %s, homes can start after a farm with the market shut", (level) => {
    const start = rich(startNewGame(nation, party, level));
    expect(isFeatureOpen(start, "market")).toBe(false);
    const farmed = buildFarm(start, province);
    expect(farmed.farmCount + farmed.projects.length).toBeGreaterThan(start.farmCount);
    const housed = buildHousing(farmed, province);
    expect(housed.projects.length).toBe(farmed.projects.length + 1);
  });

  it("finishes the farm and the homes on its own wood, after the repairs, which take none", () => {
    for (const level of DIFFICULTIES) {
      seedRandom(1);
      const start = rich(startNewGame(nation, party, level));
      const repaired = start.placedBuildings.filter((b) => b.condition === "broken").reduce((s, b) => repairBuilding(s, b.id), start);
      expect(repaired.resources.wood).toBe(FARM_WOOD_COST + HOUSING_WOOD_COST);
      const ordered = buildHousing(buildFarm(repaired, province), province);
      let state = ordered;
      for (let day = 0; day < 60; day++) state = simulateDay({ ...state, isPaused: false });
      expect(state.projects.filter((p) => p.type === "farm" || p.type === "housing")).toEqual([]);
      expect(state.resources.wood).toBeLessThan(1);
    }
  });
});

it("a country with forests keeps the usual stock of wood", () => {
  expect(startNewGame("astravia", "astravia-harvest-union").resources.wood).toBe(STARTING_RESOURCE_STOCK);
});
