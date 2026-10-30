// Every building a province can hold has a plot on the map, inside the
// province, and a building stays put as others go up. See
// src/presentation/mapSlots.ts.
import { describe, expect, it } from "vitest";
import {
  MAX_CANNERIES_PER_PROVINCE,
  MAX_EDUCATION_PER_PROVINCE,
  MAX_FACTORIES_PER_PROVINCE,
  MAX_FARMS_PER_PROVINCE,
  MAX_GRANARIES_PER_PROVINCE,
  MAX_HARBOURS_PER_PROVINCE,
  MAX_HOUSING_PER_PROVINCE,
} from "../src/domain/constants";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { getProvincePlots, placeBuildings, PLOTS_NEEDED, PROVINCE_LABEL_ROOM } from "../src/presentation/mapSlots";

const places = [...MAP_GEOMETRY.provinces, ...MAP_GEOMETRY.islands];

describe("plots on the map", () => {
  it("counts every kind of building a province can hold", () => {
    expect(PLOTS_NEEDED).toBe(
      MAX_HOUSING_PER_PROVINCE + MAX_FARMS_PER_PROVINCE + MAX_FACTORIES_PER_PROVINCE + MAX_EDUCATION_PER_PROVINCE + MAX_GRANARIES_PER_PROVINCE + MAX_CANNERIES_PER_PROVINCE + MAX_HARBOURS_PER_PROVINCE,
    );
  });

  it("has room for a full province everywhere, and for its crowds", () => {
    for (const place of places) {
      const plots = getProvincePlots(place.id)!;
      expect(plots.plots.length, place.name).toBeGreaterThanOrEqual(PLOTS_NEEDED);
      expect(plots.camp, place.name).not.toEqual(plots.square);
      expect(plots.plots, place.name).not.toContain(plots.camp);
      expect(plots.plots, place.name).not.toContain(plots.square);
    }
  });

  it("gives every building of a full province its own plot", () => {
    const full = [
      ...Array<"housing">(MAX_HOUSING_PER_PROVINCE).fill("housing"),
      ...Array<"farm">(MAX_FARMS_PER_PROVINCE).fill("farm"),
      ...Array<"factory">(MAX_FACTORIES_PER_PROVINCE).fill("factory"),
      ...Array<"education">(MAX_EDUCATION_PER_PROVINCE).fill("education"),
      ...Array<"granary">(MAX_GRANARIES_PER_PROVINCE).fill("granary"),
      ...Array<"cannery">(MAX_CANNERIES_PER_PROVINCE).fill("cannery"),
      ...Array<"harbour">(MAX_HARBOURS_PER_PROVINCE).fill("harbour"),
    ];
    for (const place of places) {
      const spots = placeBuildings(place.id, full);
      expect(spots.every(Boolean), place.name).toBe(true);
      expect(new Set(spots).size, place.name).toBe(full.length);
    }
  });

  it("keeps a farm where it is as homes go up round it", () => {
    const province = MAP_GEOMETRY.provinces[0].id;
    const before = placeBuildings(province, ["farm", "housing"]);
    const after = placeBuildings(province, ["farm", "housing", "housing", "housing"]);
    expect(after[0]).toEqual(before[0]);
    expect(after[1]).toEqual(before[1]);
  });

  it("is the same every time", () => {
    const province = MAP_GEOMETRY.provinces[3].id;
    expect(placeBuildings(province, ["factory", "farm"])).toEqual(placeBuildings(province, ["factory", "farm"]));
  });
});

describe("clear ground", () => {
  it("keeps a province's first buildings clear of its name and strip", () => {
    for (const place of places) {
      const { plots, clearPlots } = getProvincePlots(place.id)!;
      for (const [x, y] of plots.slice(0, clearPlots)) {
        const onName = Math.abs(x - place.labelX) < PROVINCE_LABEL_ROOM.halfWidth && y > place.labelY - PROVINCE_LABEL_ROOM.above && y < place.labelY + PROVINCE_LABEL_ROOM.below;
        expect(onName, place.name).toBe(false);
      }
    }
  });

  it("leaves most provinces clear plots for what they hold in play", () => {
    const roomy = places.filter((place) => getProvincePlots(place.id)!.clearPlots >= 4);
    expect(roomy.length).toBeGreaterThanOrEqual(places.length - 4);
  });
});
