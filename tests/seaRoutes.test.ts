// A march at sea is drawn round the land, not over it: from just off one
// shore to just off the other, never crossing the continent or an island.
// See src/presentation/seaRoutes.ts.
import { describe, expect, it } from "vitest";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { seaWay, type Point } from "../src/presentation/seaRoutes";

const outline = (path: string): Point[] => [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
const land = [outline(MAP_GEOMETRY.coastPath), ...MAP_GEOMETRY.islands.map((i) => outline(i.path))];

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const [d1, d2, d3, d4] = [cross(c, d, a), cross(c, d, b), cross(a, b, c), cross(a, b, d)];
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function inside(p: Point, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i], poly[j]];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
// Whether any step of a way crosses a coast, or any point of it is on land.
function overLand(way: Point[]): boolean {
  for (let i = 0; i + 1 < way.length; i++) {
    for (const poly of land) {
      if (poly.some((c, k) => crosses(way[i], way[i + 1], c, poly[(k + 1) % poly.length]))) return true;
    }
  }
  return way.some((p) => land.some((poly) => inside(p, poly)));
}

const coasts = MAP_GEOMETRY.provinces.filter((p) => p.terrain === "coast").map((p) => p.id);
const islandIds = MAP_GEOMETRY.islands.map((i) => i.id);
const pairs: Array<[string, string]> = [
  ...coasts.flatMap((c) => islandIds.flatMap((i): Array<[string, string]> => [[c, i], [i, c]])),
  ...islandIds.flatMap((a) => islandIds.filter((b) => b !== a).map((b): [string, string] => [a, b])),
];

describe("a way across the sea", () => {
  it("is found from every coast to every island, and between islands", () => {
    for (const [from, to] of pairs) expect(seaWay(from, to), `${from} to ${to}`).not.toBeNull();
  });

  it("never crosses land", () => {
    for (const [from, to] of pairs) expect(overLand(seaWay(from, to)!), `${from} to ${to}`).toBe(false);
  });

  it("is only for steps that touch an island", () => {
    expect(seaWay(coasts[0], coasts[1])).toBeNull();
  });
});
