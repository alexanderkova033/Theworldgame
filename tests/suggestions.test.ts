// What a province's card offers to build or mend, and in what order.
import { describe, expect, it } from "vitest";
import { takeLoan } from "../src/application/actions/loanActions";
import { getProvinceOverview } from "../src/application/getProvinceOverview";
import { getProvinceSuggestions, MAX_SUGGESTIONS } from "../src/application/getProvinceSuggestions";
import { getTroubledProvinces } from "../src/application/getTroubledProvinces";
import { startNewGame } from "../src/application/startNewGame";

const state = takeLoan(startNewGame("astravia", "astravia-harvest-union"));
const calm = { ...getProvinceOverview(state)[0], homeless: 0, unemployed: 0, openJobs: 0, unrestStage: "calm" as const };

describe("province suggestions", () => {
  it("offers homes first to a province with people sleeping rough", () => {
    const [first] = getProvinceSuggestions(state, { ...calm, homeless: calm.population * 0.2 });
    expect(first.kind === "build" && first.action.config.type).toBe("housing");
  });

  it("offers work to a province with many jobless", () => {
    const fixes = getProvinceSuggestions(state, { ...calm, unemployed: calm.workers * 0.5 });
    expect(fixes.some((s) => s.kind === "build" && (s.action.config.type === "factory" || s.action.config.type === "farm"))).toBe(true);
  });

  it("offers to mend a broken building", () => {
    const building = state.placedBuildings.find((b) => b.provinceId === calm.id)!;
    const broken = { ...state, placedBuildings: state.placedBuildings.map((b) => (b.id === building.id ? { ...b, condition: "broken" as const } : b)) };
    expect(getProvinceSuggestions(broken, calm).some((s) => s.kind === "repair" && s.buildingId === building.id)).toBe(true);
  });

  it("offers nothing when all is well, and never more than three", () => {
    expect(getProvinceSuggestions(state, { ...calm, capacity: calm.population * 2 })).toEqual([]);
    const troubled = { ...calm, homeless: calm.population * 0.2, unemployed: calm.workers * 0.5 };
    expect(getProvinceSuggestions(state, troubled).length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it("says why a fix can't be done yet", () => {
    const broke = { ...state, stats: { ...state.stats, treasury: 0 } };
    const [first] = getProvinceSuggestions(broke, { ...calm, homeless: calm.population * 0.2 });
    expect(first.kind === "build" && first.how).toBe("blocked");
    expect(first.kind === "build" && first.blockedBy).toMatch(/more Cr to start/);
  });
});

describe("provinces that need you", () => {
  const all = getProvinceOverview(state).map((o) => ({ ...o, homeless: 0, unemployed: 0, unrestStage: "calm" as const }));
  const [a, b, c] = all;

  it("lists nobody when all is well", () => {
    expect(getTroubledProvinces(state, all)).toEqual([]);
  });

  it("puts riots before the homeless, and the homeless before the jobless", () => {
    const troubled = all.map((o) =>
      o.id === a.id ? { ...o, unemployed: o.workers * 0.5 } : o.id === b.id ? { ...o, homeless: o.population * 0.2 } : o.id === c.id ? { ...o, unrestStage: "riots" as const } : o,
    );
    expect(getTroubledProvinces(state, troubled)).toEqual([c.id, b.id, a.id]);
  });
});
