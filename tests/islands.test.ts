// The islands: every one drawn on the map has its data (trait, locals) and
// a venture reward, and lies clear of the continent and of the others.
import { describe, expect, it } from "vitest";
import { ISLAND_EXPEDITIONS } from "../src/domain/expeditions/expeditionData";
import { ISLANDS } from "../src/domain/islands/islandData";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { getOwnedProvinceIds, getPlace } from "../src/domain/provinces/provinceRules";
import { buildFarm } from "../src/application/actions/buildFarm";
import { canFoundSettlement, foundSettlement } from "../src/application/actions/settlementActions";
import { simulateDay } from "../src/application/simulateDay";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import { SETTLE_COST, SETTLE_DAYS } from "../src/domain/constants";
import type { GameState } from "../src/domain/country/types";
import { getHousingCapacityByProvince } from "../src/domain/housing/housingRules";
import { getLabourSituation } from "../src/domain/labour/labourRules";
import { planMigration } from "../src/domain/provinces/provinceMigration";
import { hydrateGameState } from "../src/presentation/hooks/gameSave";

function bounds(path: string) {
  const points = (path.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g) ?? []).map((p) => p.split(",").map(Number));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

function apart(a: ReturnType<typeof bounds>, b: ReturnType<typeof bounds>, gap: number): boolean {
  return a.right + gap < b.left || b.right + gap < a.left || a.bottom + gap < b.top || b.bottom + gap < a.top;
}

describe("the islands", () => {
  it("each have their data and a venture reward, and nothing else does", () => {
    const drawn = MAP_GEOMETRY.islands.map((i) => i.id).sort();
    expect(ISLANDS.map((i) => i.id).sort()).toEqual(drawn);
    expect(ISLAND_EXPEDITIONS.map((e) => e.islandId).sort()).toEqual(drawn);
  });

  it("are some peopled and some empty", () => {
    expect(ISLANDS.some((i) => i.locals)).toBe(true);
    expect(ISLANDS.some((i) => !i.locals)).toBe(true);
  });

  it("are places, with a name and a terrain", () => {
    for (const island of MAP_GEOMETRY.islands) {
      expect(getPlace(island.id)?.name).toBe(island.name);
      expect(["plains", "hills", "forest", "coast"]).toContain(getPlace(island.id)?.terrain);
    }
  });

  it("lie clear of the continent and of each other", () => {
    const continent = bounds(MAP_GEOMETRY.coastPath);
    const islands = MAP_GEOMETRY.islands.map((i) => ({ id: i.id, box: bounds(i.path) }));
    for (const { id, box } of islands) {
      expect(apart(box, continent, 20), `${id} and the continent`).toBe(true);
      for (const other of islands) if (other.id !== id) expect(apart(box, other.box, 20), `${id} and ${other.id}`).toBe(true);
    }
  });
});

describe("settling an island", () => {
  const start = startNewGame("astravia", "astravia-harvest-union");
  const rich: GameState = {
    ...start,
    chapters: allChaptersOpen(),
    stats: { ...start.stats, treasury: 20000 },
    resources: { ...start.resources, wood: 100 },
  };
  const empty = ISLANDS.find((i) => !i.locals)!.id;
  const peopled = ISLANDS.find((i) => i.locals)!.id;
  const scouted: GameState = { ...rich, scoutedIslandIds: [empty, peopled] };

  function sail(state: GameState): GameState {
    let s = state;
    for (let i = 0; i < SETTLE_DAYS + 1; i++) s = simulateDay({ ...s, isPaused: false, pendingDecisionId: null, pendingDemand: null });
    return s;
  }

  it("needs the island scouted, empty, and the money and wood", () => {
    expect(canFoundSettlement(rich, empty)).toBe(false); // not scouted
    expect(canFoundSettlement(scouted, empty)).toBe(true);
    expect(canFoundSettlement(scouted, peopled)).toBe(false); // people live there
    expect(canFoundSettlement({ ...scouted, resources: { ...scouted.resources, wood: 0 } }, empty)).toBe(false);
    const sent = foundSettlement(scouted, empty);
    expect(sent.stats.treasury).toBe(scouted.stats.treasury - SETTLE_COST);
    expect(canFoundSettlement(sent, empty)).toBe(false); // already on its way
  });

  const landed = sail(foundSettlement(scouted, empty));

  it("makes it a province when the settlers land, with homes and people", () => {
    expect(landed.settledIslandIds).toEqual([empty]);
    expect(getOwnedProvinceIds(landed)).toContain(empty);
    expect(landed.provinces[empty].population).toBeGreaterThan(0);
    expect(landed.placedBuildings.some((b) => b.provinceId === empty && b.type === "housing")).toBe(true);
    expect(landed.events.some((e) => e.message.includes("Settlers land"))).toBe(true);
  });

  it("moves people rather than making them", () => {
    const sum = Object.values(landed.provinces).reduce((total, p) => total + p.population, 0);
    expect(sum).toBeCloseTo(landed.stats.population, 3);
  });

  it("can be built on", () => {
    expect(buildFarm.canBuild(landed, empty)).toBe(true);
  });

  it("keeps the sea between: no commuting, no drifting across", () => {
    const labour = getLabourSituation(landed);
    expect(labour.provinces[empty].commutersOut).toBe(0);
    const plan = planMigration(landed.provinces, getHousingCapacityByProvince(landed), labour.provinces);
    expect(plan[empty] ?? 0).toBe(0);
  });

  it("is remembered by saves, and older saves have no settlements", () => {
    const { settlements: _s, settledIslandIds: _i, ...old } = rich;
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(old)));
    expect(loaded.settlements).toEqual([]);
    expect(loaded.settledIslandIds).toEqual([]);
    expect(hydrateGameState(JSON.parse(JSON.stringify(landed))).settledIslandIds).toEqual([empty]);
  });
});
