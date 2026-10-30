// Buildings on the map never touch: each has its own plot, inside its
// province, and stays put as others go up. See src/presentation/mapSlots.ts.
import { describe, expect, it } from "vitest";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { BUILDING_ROOM, getProvincePlots, placeBuildings, placeCrowds, separatePlates } from "../src/presentation/mapSlots";

const places = [...MAP_GEOMETRY.provinces, ...MAP_GEOMETRY.islands];

describe("plots on the map", () => {
  it("leaves no two pictures touching, anywhere", () => {
    for (const place of places) {
      const { plots } = getProvincePlots(place.id)!;
      plots.forEach(([ax, ay], i) => {
        plots.slice(i + 1).forEach(([bx, by]) => {
          const clear = Math.abs(ax - bx) >= BUILDING_ROOM.width || Math.abs(ay - by) >= BUILDING_ROOM.height;
          expect(clear, place.name).toBe(true);
        });
      });
    }
  });

  it("gives crowds two separate grounds, clear of a province's first buildings", () => {
    for (const place of places) {
      const standing = placeBuildings(place.id, ["housing", "farm"]).filter((p) => p !== null);
      const crowds = placeCrowds(place.id, standing)!;
      expect(crowds.camp, place.name).not.toEqual(crowds.square);
    }
    // A roomy province: nothing touches.
    const roomy = MAP_GEOMETRY.islands.find((p) => p.name === "Solmere")!.id;
    const standing = placeBuildings(roomy, ["housing", "farm", "factory"]).filter((p) => p !== null);
    const { camp, square } = placeCrowds(roomy, standing)!;
    for (const ground of [camp, square]) {
      for (const [x, y] of standing) {
        const clear = Math.abs(x - ground[0]) >= 28 + BUILDING_ROOM.width / 2 || y - ground[1] >= 14 + BUILDING_ROOM.height / 2 || ground[1] - y >= 36 + BUILDING_ROOM.height / 2;
        expect(clear).toBe(true);
      }
    }
  });

  it("has room for the buildings most provinces hold in play", () => {
    // A home, a farm and a factory: what a province usually has in play.
    for (const place of places) expect(getProvincePlots(place.id)!.plots.length, place.name).toBeGreaterThanOrEqual(3);
  });

  it("gives nothing a plot once they run out, rather than stacking", () => {
    const place = places[0].id;
    const count = getProvincePlots(place)!.plots.length;
    const spots = placeBuildings(place, Array<"housing">(count + 2).fill("housing"));
    expect(spots.filter(Boolean).length).toBe(count);
    expect(new Set(spots.filter(Boolean)).size).toBe(count);
    expect(spots[count]).toBeNull();
  });

  it("keeps what stands where it is as more go up", () => {
    const province = MAP_GEOMETRY.provinces[9].id;
    const before = placeBuildings(province, ["farm", "housing"]);
    const after = placeBuildings(province, ["farm", "housing", "housing", "factory"]);
    expect(after[0]).toEqual(before[0]);
    expect(after[1]).toEqual(before[1]);
  });
});

describe("slot plates", () => {
  it("pushes overlapping plates apart until none touch", () => {
    const plates = separatePlates([
      { x: 0, y: 0, width: 80, height: 50 },
      { x: 20, y: 10, width: 80, height: 50 },
      { x: 30, y: 30, width: 80, height: 50 },
      { x: 400, y: 400, width: 80, height: 50 },
    ]);
    plates.forEach((a, i) => {
      plates.slice(i + 1).forEach((b) => {
        const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlaps).toBe(false);
      });
    });
    expect(plates[3]).toEqual({ x: 400, y: 400, width: 80, height: 50 });
  });
});
