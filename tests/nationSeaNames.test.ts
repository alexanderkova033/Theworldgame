// Nations' names lie out at sea: where they go, whatever land is held.
import { describe, expect, it } from "vitest";
import { NATIONS } from "../src/domain/nations/nationData";
import { PARTIES } from "../src/domain/parties/partyData";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { contrast, homeView, inkOnWater } from "../src/presentation/components/mapCommon";
import { distanceToSegment, edges, parsePolygon, type Point } from "../src/presentation/nationFrontiers";
import { SEA_NAME_LOWEST_TOP, SEA_NAME_RISE, SEA_PARTY_DROP, seaNames, type SeaName } from "../src/presentation/nationSeaNames";

const shore = edges(parsePolygon(MAP_GEOMETRY.coastPath));

function inside([x, y]: Point, polygon: Point[]): boolean {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) within = !within;
  }
  return within;
}

const continent = parsePolygon(MAP_GEOMETRY.coastPath);
const islands = MAP_GEOMETRY.islands.map((island) => parsePolygon(island.path));
const provincesOf = (nationId: string) => NATIONS.find((n) => n.id === nationId)!.provinceIds;
// A province with no shore of its own.
const isInland = (provinceId: string) => {
  const outline = parsePolygon(MAP_GEOMETRY.provinces.find((p) => p.id === provinceId)!.path);
  return !edges(outline).some(([a, b]) => shore.some((edge) => distanceToSegment([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], edge) <= 3));
};

function expectAtSea(names: SeaName[]) {
  for (const name of names) {
    for (const point of name.points) {
      expect(inside(point, continent), `${name.nationId} on the continent at ${point}`).toBe(false);
      expect(islands.some((island) => inside(point, island)), `${name.nationId} on an island at ${point}`).toBe(false);
      expect(Math.min(...shore.map((edge) => distanceToSegment(point, edge))), `${name.nationId} at ${point}`).toBeGreaterThanOrEqual(19);
    }
    const [first, last] = [name.points[0], name.points[name.points.length - 1]];
    expect(last[0], `${name.nationId} reads left to right`).toBeGreaterThan(first[0]);
  }
  for (const a of names) {
    for (const b of names) {
      if (a === b) continue;
      const gap = Math.min(...a.points.flatMap((p) => b.points.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))));
      expect(gap, `${a.nationId} and ${b.nationId}`).toBeGreaterThanOrEqual(40);
    }
  }
}

describe("nations' names at sea", () => {
  it("gives each nation one, on the water, apart from the others", () => {
    const names = seaNames([]);
    expect(names.map((n) => n.nationId).sort()).toEqual(NATIONS.map((n) => n.id).sort());
    expectAtSea(names);
  });

  it("keeps a whole country's name legible and off the top of the opening view", () => {
    for (const name of seaNames([])) {
      const [first, last] = [name.points[0], name.points[name.points.length - 1]];
      const tilt = (Math.abs(Math.atan2(last[1] - first[1], last[0] - first[0])) * 180) / Math.PI;
      expect(tilt, name.nationId).toBeLessThanOrEqual(35);
      expect(Math.min(...name.points.map((p) => p[1])) - SEA_NAME_RISE, name.nationId).toBeGreaterThanOrEqual(SEA_NAME_LOWEST_TOP);
    }
  });

  // The map panel at a 1440x900 and a 1000x760 window, as measured in a browser.
  it.each([[1440, 746], [1000, 572]])("shows every name and all your own land in the opening view of a %ix%i panel", (stageWidth, stageHeight) => {
    for (const nation of NATIONS) {
      const view = homeView(nation);
      const scale = Math.min(stageWidth / view.width, stageHeight / view.height);
      const [cx, cy] = [view.x + view.width / 2, view.y + view.height / 2];
      const [halfWidth, halfHeight] = [stageWidth / 2 / scale, stageHeight / 2 / scale];
      const within = ([x, y]: Point, up: number, down: number) => x >= cx - halfWidth && x <= cx + halfWidth && y - up >= cy - halfHeight && y + down <= cy + halfHeight;
      for (const name of seaNames([])) {
        const below = name.nationId === nation.id ? 0 : SEA_PARTY_DROP + 2; // only a neighbour shows a party line
        for (const point of name.points) expect(within(point, SEA_NAME_RISE, below), `${name.nationId}'s name playing ${nation.id} at ${point}`).toBe(true);
      }
      const land = MAP_GEOMETRY.provinces.filter((p) => nation.provinceIds.includes(p.id)).flatMap((p) => parsePolygon(p.path));
      for (const point of land) expect(within(point, 0, 0), `${nation.id}'s own land at ${point}`).toBe(true);
    }
  });

  it("runs along the nation's own shore while it holds one", () => {
    for (const name of seaNames([])) {
      const own = MAP_GEOMETRY.provinces.filter((p) => provincesOf(name.nationId).includes(p.id)).flatMap((p) => edges(parsePolygon(p.path)));
      const middle = name.points[Math.floor(name.points.length / 2)];
      expect(Math.min(...own.map((edge) => distanceToSegment(middle, edge))), name.nationId).toBeLessThan(90);
    }
  });

  it("moves with the shore when a province breaks away, and comes back", () => {
    const before = seaNames([]);
    const coast = provincesOf("astravia").find((id) => !isInland(id))!;
    const after = seaNames([coast]);
    expect(after.find((n) => n.nationId === "astravia")!.path).not.toBeUndefined();
    expectAtSea(after);
    expect(seaNames([])).toEqual(before);
  });

  it("still names a nation left with no shore, without touching its land", () => {
    for (const nation of NATIONS) {
      const inland = nation.provinceIds.filter(isInland);
      for (const kept of inland) {
        const lost = nation.provinceIds.filter((id) => id !== kept);
        const names = seaNames(lost);
        expect(names.map((n) => n.nationId), `${nation.id} keeping only ${kept}`).toContain(nation.id);
        expectAtSea(names);
      }
    }
  });

  it("has an inland province to test that with", () => {
    expect(NATIONS.flatMap((n) => n.provinceIds).filter(isInland).length).toBeGreaterThan(0);
  });

  it("gives no name to a nation with nothing left", () => {
    const names = seaNames(provincesOf("astravia"));
    expect(names.map((n) => n.nationId)).not.toContain("astravia");
    expectAtSea(names);
  });

  it("writes every party's line dark enough to read on the water, in any season", () => {
    // The sea with each season's wash over it (MapSeasons.css).
    const waters = [[0x9f, 0xb0, 0x96], [0xa6, 0xb7, 0x9e], [0xa2, 0xb5, 0x9e], [0xa5, 0xad, 0x91], [0x98, 0xaa, 0x9a]];
    for (const party of PARTIES) {
      const rgb = inkOnWater(party.color).match(/\d+/g)!.map(Number);
      for (const water of waters) expect(contrast(rgb, water), party.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
