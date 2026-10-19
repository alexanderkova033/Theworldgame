// The islands: every one drawn on the map has its data (trait, locals) and
// a venture reward, and lies clear of the continent and of the others.
import { describe, expect, it } from "vitest";
import { NATIONS, playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";
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
import { buildHarbour } from "../src/application/actions/buildHarbour";
import { getBuildCostIn } from "../src/application/actions/createBuildAction";
import { canSendMoreSettlers, getSettleCost } from "../src/application/actions/settlementActions";
import { applySettlementArrival } from "../src/application/applySettlementArrival";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { ANCHORAGE_HARBOUR_COST_SHARE, GRAZING_FOOD_PER_DAY, SUPPLY_FEE_PER_DAY } from "../src/domain/constants";
import { getGrazingFood, getLinkedIslands, getProducingTerrains } from "../src/domain/islands/islandRules";
import { COLONY_DISTANCE_UNREST, COLONY_DISTANCE_UNREST_LINKED } from "../src/domain/constants";
import { updateProvinceOrder } from "../src/domain/provinces/provinceOrder";
import { runTheRace } from "../src/application/day/race";
import { beginDay } from "../src/application/day/dayContext";
import { RACE_EVERY_MONTHS, RACE_FROM_MONTH, RACE_TURNED_BACK_REFUND, RACE_VOYAGE_DAYS } from "../src/domain/constants";

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

describe("the sea", () => {
  const start = startNewGame("astravia", "astravia-harvest-union");
  const rich: GameState = {
    ...start,
    chapters: allChaptersOpen(),
    stats: { ...start.stats, treasury: 20000 },
    resources: { ...start.resources, wood: 200 },
  };
  const solmere = "island-2"; // ore seam
  const vashtel = "island-3"; // anchorage
  const greyHolm = "island-4"; // grazing
  const coast = getOwnedProvinceIds(rich).find((id) => getPlace(id)?.terrain === "coast")!;
  const inland = getOwnedProvinceIds(rich).find((id) => getPlace(id)?.terrain !== "coast")!;

  // A colony on Solmere, as if its settlers had just landed.
  const colony = applySettlementArrival({ ...rich, scoutedIslandIds: [solmere] }, solmere);
  const harbour = (state: GameState, provinceId: string): GameState => ({
    ...state,
    placedBuildings: [...state.placedBuildings, { id: `harbour-${provinceId}`, provinceId, type: "harbour" }],
  });

  it("lands settlers with a farm as well as homes", () => {
    expect(colony.placedBuildings.some((b) => b.provinceId === solmere && b.type === "farm")).toBe(true);
    expect(colony.farmCount).toBe(rich.farmCount + 1);
  });

  it("puts a harbour on the coast or an island only, cheaper on an anchorage", () => {
    expect(buildHarbour.canBuild(colony, solmere)).toBe(true);
    expect(buildHarbour.canBuild(colony, coast)).toBe(true);
    expect(buildHarbour.canBuild(colony, inland)).toBe(false);
    expect(getBuildCostIn(colony, buildHarbour.config, vashtel)).toBe(getBuildCostIn(colony, buildHarbour.config, coast) * ANCHORAGE_HARBOUR_COST_SHARE);
  });

  it("charges for supply ships until a harbour on each side links the colony", () => {
    expect(getDailyProductionSummary(colony).colonyIncome).toBe(-SUPPLY_FEE_PER_DAY);
    expect(getLinkedIslands(harbour(colony, solmere)).has(solmere)).toBe(false); // only one side
    const linked = harbour(harbour(colony, solmere), coast);
    expect(getLinkedIslands(linked).has(solmere)).toBe(true);
    expect(getDailyProductionSummary(linked).colonyIncome).toBe(0);
  });

  it("lets people cross between linked harbours", () => {
    const linked = harbour(harbour(colony, solmere), coast);
    const crowded = { ...linked, provinces: { ...linked.provinces, [solmere]: { ...linked.provinces[solmere], population: 0 } } };
    const labour = getLabourSituation(crowded);
    const capacity = getHousingCapacityByProvince(crowded);
    expect(planMigration(crowded.provinces, capacity, labour.provinces, getLinkedIslands(crowded))[solmere] ?? 0).toBeGreaterThan(0);
    expect(planMigration(crowded.provinces, capacity, labour.provinces)[solmere] ?? 0).toBe(0);
  });

  it("doubles what Solmere's terrain yields, and Grey Holm's flocks feed people", () => {
    const hills = (state: GameState) => getProducingTerrains(state).filter((t) => t === "hills").length;
    expect(hills(colony) - hills(rich)).toBe(2);
    const flocks = applySettlementArrival({ ...rich, scoutedIslandIds: [greyHolm] }, greyHolm);
    expect(getGrazingFood(flocks)).toBe(GRAZING_FOOD_PER_DAY);
  });

  it("sends more settlers to a colony held, and they only add people", () => {
    expect(canSendMoreSettlers(colony, solmere)).toBe(true);
    const before = colony.provinces[solmere].population;
    const more = applySettlementArrival(colony, solmere);
    expect(more.provinces[solmere].population).toBeGreaterThan(before);
    expect(more.farmCount).toBe(colony.farmCount);
  });
});

// A careful player who settles the empty islands and links them: still
// wins, and the country ends bigger. (Measured 2026-10-19: about 4% more
// people and 3,800 Cr less after five years, ventures included; colonies
// pay back over a longer reign.)
describe("a careful player who settles", { timeout: 60000 }, () => {
  it.each(NATIONS)("still wins in %s, with more people", (nation, party) => {
    seedRandom(20261015);
    const plain = playCarefully(nation, party, { days: 5 * 365 });
    seedRandom(20261015);
    const settler = playCarefully(nation, party, { days: 5 * 365, settle: true });
    expect(settler.outcome).toBe("victory");
    expect(settler.settledIslandIds.length).toBeGreaterThan(0);
    expect(settler.stats.population).toBeGreaterThan(plain.stats.population);
  });
});

describe("settling among people already there", () => {
  const start = startNewGame("astravia", "astravia-harvest-union");
  const kestrel = "island-1";
  const locals = ISLANDS.find((i) => i.id === kestrel)!.locals!.people;
  const scouted: GameState = {
    ...start,
    chapters: allChaptersOpen(),
    stats: { ...start.stats, treasury: 20000 },
    resources: { ...start.resources, wood: 100 },
    scoutedIslandIds: [kestrel],
  };

  it("needs terms, and buying land costs more", () => {
    expect(canFoundSettlement(scouted, kestrel)).toBe(false);
    expect(canFoundSettlement(scouted, kestrel, "share")).toBe(true);
    expect(foundSettlement(scouted, kestrel, "buy").stats.treasury).toBe(scouted.stats.treasury - getSettleCost("buy"));
    expect(getSettleCost("buy")).toBeGreaterThan(getSettleCost("share"));
  });

  it("bought or shared: the locals join the country", () => {
    for (const terms of ["buy", "share"] as const) {
      const landed = applySettlementArrival(scouted, kestrel, terms);
      expect(landed.provinces[kestrel].population).toBeGreaterThan(locals);
      expect(landed.stats.population).toBe(scouted.stats.population + locals);
    }
  });

  it("shared: they keep to their own ways for a year", () => {
    expect(applySettlementArrival(scouted, kestrel, "share").provinces[kestrel].disputeUntil).not.toBeNull();
    expect(applySettlementArrival(scouted, kestrel, "buy").provinces[kestrel].disputeUntil).toBeNull();
  });

  it("driven out: support falls at once, and only settlers remain", () => {
    const ordered = foundSettlement(scouted, kestrel, "drive");
    expect(ordered.stats.popularity).toBeLessThan(scouted.stats.popularity);
    const landed = applySettlementArrival(scouted, kestrel, "drive");
    expect(landed.provinces[kestrel].population).toBeLessThan(locals);
    expect(landed.stats.population).toBe(scouted.stats.population);
  });
});

describe("a colony far from the capital", () => {
  const start = startNewGame("astravia", "astravia-harvest-union");
  const solmere = "island-2";
  const colony = applySettlementArrival({ ...start, scoutedIslandIds: [solmere] }, solmere);
  const mainland = getOwnedProvinceIds(colony).find((id) => !id.startsWith("island"))!;
  // Everyone housed and employed, so only distance moves the mood.
  const ids = Object.keys(colony.provinces);
  const capacity = Object.fromEntries(ids.map((id) => [id, 1e9]));
  const labour = Object.fromEntries(ids.map((id) => [id, { workers: 0, unemployed: 0 }]));
  const settle = (linked: ReadonlySet<string>) => {
    let provinces = colony.provinces;
    for (let i = 0; i < 200; i++) provinces = updateProvinceOrder(provinces, 60, capacity, labour as never, colony.date, linked).provinces;
    return provinces;
  };

  it("sits a little below the nation's mood, less once linked", () => {
    const apart = settle(new Set());
    const linked = settle(new Set([solmere]));
    expect(apart[mainland].stability - apart[solmere].stability).toBeCloseTo(COLONY_DISTANCE_UNREST, 0);
    expect(linked[mainland].stability - linked[solmere].stability).toBeCloseTo(COLONY_DISTANCE_UNREST_LINKED, 0);
  });
});

describe("the race for the islands", () => {
  const start = startNewGame("astravia", "astravia-harvest-union");
  const base: GameState = { ...start, chapters: allChaptersOpen(), stats: { ...start.stats, treasury: 20000 }, resources: { ...start.resources, wood: 100 } };
  const kestrel = "island-1"; // the most people of its own: the prize
  const race = (state: GameState) => runTheRace(beginDay(state), state);
  const firstOf = (month: number) => ({ year: Math.floor((month - 1) / 12) + 1, month: ((month - 1) % 12) + 1, day: 1 });

  it("doesn't start before the third year", () => {
    seedRandom(1);
    for (let m = 1; m < RACE_FROM_MONTH; m++) expect(race({ ...base, date: firstOf(m) }).foreignVoyages).toEqual([]);
  });

  it("sends a neighbour after the island with the most people, on schedule", () => {
    const sailed = race({ ...base, date: firstOf(RACE_FROM_MONTH) });
    expect(sailed.foreignVoyages).toHaveLength(1);
    expect(sailed.foreignVoyages[0].islandId).toBe(kestrel);
    expect(sailed.foreignVoyages[0].nationId).not.toBe(base.nationId);
    expect(race({ ...base, date: firstOf(RACE_FROM_MONTH + 1) }).foreignVoyages).toEqual([]);
    // The other neighbour takes the next turn.
    const next = race({ ...base, date: firstOf(RACE_FROM_MONTH + RACE_EVERY_MONTHS) });
    expect(next.foreignVoyages[0].nationId).not.toBe(sailed.foreignVoyages[0].nationId);
  });

  const landing: GameState = {
    ...base,
    scoutedIslandIds: [kestrel],
    foreignVoyages: [{ nationId: "caldenreich", islandId: kestrel, daysRemaining: 1, totalDays: RACE_VOYAGE_DAYS }],
  };

  it("lets the neighbour claim it if they land first, turning yours back with half the price", () => {
    const mine = foundSettlement(landing, kestrel, "buy");
    const claimed = race(mine);
    expect(claimed.foreignIslands[kestrel]).toBe("caldenreich");
    expect(claimed.settlements).toEqual([]);
    expect(claimed.stats.treasury).toBe(mine.stats.treasury + getSettleCost("buy") * RACE_TURNED_BACK_REFUND);
    expect(canFoundSettlement(claimed, kestrel, "buy")).toBe(false);
  });

  it("turns them back if your settlers landed first", () => {
    const yours = applySettlementArrival(landing, kestrel, "buy");
    const after = race(yours);
    expect(after.foreignIslands[kestrel]).toBeUndefined();
    expect(after.foreignVoyages).toEqual([]);
  });

  it("is remembered by saves, and older saves have no claims", () => {
    const { foreignVoyages: _v, foreignIslands: _i, ...old } = base;
    const loaded = hydrateGameState(JSON.parse(JSON.stringify(old)));
    expect(loaded.foreignVoyages).toEqual([]);
    expect(loaded.foreignIslands).toEqual({});
  });
});
