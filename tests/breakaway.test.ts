// Left alone, an uprising spreads to the provinces next door, and one held
// at full strength for a month breaks away: its people, homes and works are
// lost, and losing the capital brings the government down. See
// domain/uprising and application/loseProvince.ts.
import { beforeEach, describe, expect, it } from "vitest";
import { buildFarm } from "../src/application/actions/buildFarm";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import { UPRISING_BREAKAWAY_DAYS, UPRISING_SPREAD_UNREST } from "../src/domain/constants";
import { addDays } from "../src/domain/country/calendar";
import type { GameState } from "../src/domain/country/types";
import { getWorkingCounts } from "../src/domain/maintenance/maintenanceRules";
import { getNation } from "../src/domain/nations/nationRules";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { getNeighbours } from "../src/domain/provinces/provinceNeighbours";
import { getOwnedProvinceIds } from "../src/domain/provinces/provinceRules";
import type { ProvinceState } from "../src/domain/provinces/types";
import { getSpreadUnrest } from "../src/domain/uprising/uprisingRules";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";
import { seedRandom } from "./support/seededRandom";

beforeEach(() => seedRandom(20261019));

describe("the map's neighbours", () => {
  it("go both ways, and every province has one", () => {
    for (const p of MAP_GEOMETRY.provinces) {
      expect(getNeighbours(p.id).length, p.name).toBeGreaterThan(0);
      for (const other of getNeighbours(p.id)) expect(getNeighbours(other), `${other} back to ${p.id}`).toContain(p.id);
    }
  });
});

const start = startNewGame("astravia", "astravia-harvest-union");
const base: GameState = { ...start, chapters: allChaptersOpen(), stats: { ...start.stats, treasury: 20000, politicalPower: 200 } };
const capital = getNation("astravia").capitalProvinceId;
const owned = getOwnedProvinceIds(base);
// A province that is not the capital, with a neighbour of its own.
const rebel = owned.find((id) => id !== capital && getNeighbours(id).some((n) => owned.includes(n)))!;
const nextDoor = getNeighbours(rebel).find((n) => owned.includes(n))!;

function risen(state: GameState, id: string, change: Partial<NonNullable<ProvinceState["uprising"]>> = {}): GameState {
  const uprising = { since: state.date, strength: 50, militia: 0, lastTerms: state.date, fullSince: null, ...change };
  return { ...state, provinces: { ...state.provinces, [id]: { ...state.provinces[id], unrestStage: "riots", stability: 5, uprising } } };
}

function day(state: GameState): GameState {
  // Kept unsettled, so the uprising holds; no letters in the way.
  return simulateDay({ ...state, isPaused: false, pendingDecisionId: null, pendingDemand: null, stats: { ...state.stats, stability: 30 } });
}

describe("a strong uprising", () => {
  it("stirs up the provinces next door, but a weak one doesn't", () => {
    expect(getSpreadUnrest(risen(base, rebel, { strength: 50 }).provinces, nextDoor)).toBe(0);
    expect(getSpreadUnrest(risen(base, rebel, { strength: 80 }).provinces, nextDoor)).toBe(UPRISING_SPREAD_UNREST);
  });

  it("starts the clock at full strength, and stops it below", () => {
    const full = day(risen(base, rebel, { strength: 100 }));
    expect(full.provinces[rebel].uprising!.fullSince).toEqual(base.date);
    const fallen = day(risen(full, rebel, { strength: 50, fullSince: base.date }));
    expect(fallen.provinces[rebel].uprising!.fullSince).toBeNull();
  });
});

describe("a province that breaks away", () => {
  const eve = risen(base, rebel, { strength: 100, fullSince: addDays(base.date, -UPRISING_BREAKAWAY_DAYS) });
  const gone = day(eve);

  it("goes after a month at full strength, and not a day sooner", () => {
    const early = day(risen(base, rebel, { strength: 100, fullSince: addDays(base.date, -(UPRISING_BREAKAWAY_DAYS - 1)) }));
    expect(early.lostProvinceIds).toEqual([]);
    expect(gone.lostProvinceIds).toEqual([rebel]);
    expect(gone.events.some((e) => e.message.includes("has broken away"))).toBe(true);
  });

  it("takes its people, homes and works with it", () => {
    expect(gone.provinces[rebel]).toBeUndefined();
    expect(getOwnedProvinceIds(gone)).not.toContain(rebel);
    expect(gone.placedBuildings.some((b) => b.provinceId === rebel)).toBe(false);
    expect(gone.stats.population).toBeLessThan(eve.stats.population - eve.provinces[rebel].population * 0.9);
    // The tallies agree with the map: nothing lost is still counted.
    const farmsOnMap = gone.placedBuildings.filter((b) => b.type === "farm").length;
    expect(gone.farmCount).toBe(farmsOnMap);
    expect(getWorkingCounts(gone).farms).toBeLessThanOrEqual(farmsOnMap);
  });

  it("can't be built in, and stays gone", () => {
    expect(buildFarm.canBuild(gone, rebel)).toBe(false);
    let s = gone;
    for (let i = 0; i < 5; i++) s = day(s);
    expect(s.provinces[rebel]).toBeUndefined();
    expect(Object.values(s.provinces).reduce((sum, p) => sum + p.population, 0)).toBeCloseTo(s.stats.population, 3);
  });

  it("brings the government down if it is the capital", () => {
    const fallen = day(risen(base, capital, { strength: 100, fullSince: addDays(base.date, -UPRISING_BREAKAWAY_DAYS) }));
    expect(fallen.isGameOver).toBe(true);
    expect(fallen.outcome).toBe("collapsed");
    expect(fallen.gameOverReason).toMatch(/capital/i);
  });

  it("is remembered by saves, and older saves lose nothing", () => {
    expect(hydrateGameState(JSON.parse(JSON.stringify(gone))).lostProvinceIds).toEqual([rebel]);
    const { lostProvinceIds: _lost, ...old } = base;
    expect(hydrateGameState(JSON.parse(JSON.stringify(old))).lostProvinceIds).toEqual([]);
  });
});
