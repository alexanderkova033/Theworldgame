// The islands: every one drawn on the map has its data (trait, locals) and
// a venture reward, and lies clear of the continent and of the others.
import { describe, expect, it } from "vitest";
import { ISLAND_EXPEDITIONS } from "../src/domain/expeditions/expeditionData";
import { ISLANDS } from "../src/domain/islands/islandData";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { getPlace } from "../src/domain/provinces/provinceRules";

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
