// Winter heating: need is reckoned in coal, coal burns first, and wood meets
// the rest at WOOD_PER_COAL_HEAT to one. Larger buildings hold their heat.
import { describe, expect, it } from "vitest";
import { getAdvisorOutlook } from "../src/application/getAdvisorOutlook";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { getForecasts } from "../src/application/getForecasts";
import { getHeatingOutlook } from "../src/application/getHeatingOutlook";
import { getPopularityOutlook } from "../src/application/getPopularityOutlook";
import { applyDangerPause } from "../src/application/playDay";
import { simulateDay } from "../src/application/simulateDay";
import { HEAT_SHARE_HOME, HEAT_SHARE_TENEMENT, HEAT_SHARE_TOWER, HEATING_FUEL_PER_HOME, HOMES_PER_TENEMENT, HOMES_PER_TOWER, WOOD_PER_COAL_HEAT } from "../src/domain/constants";
import type { ProjectType } from "../src/domain/construction/types";
import type { GameState } from "../src/domain/country/types";
import { getDecision } from "../src/domain/decisions/decisionRules";
import { burnHeatingFuel, getBuildingHeatDemand, getHeatingDemand, getHeatInStock, getHeatShare } from "../src/domain/housing/housingRules";
import { emptyResourceBundle } from "../src/domain/resources/resourceRules";
import { calmStart } from "./support/calmStart";

const stock = (coal: number, wood: number) => ({ ...emptyResourceBundle(), coal, wood });

// A country on a winter's day with these homes and nothing else, and this fuel.
function withHomes(types: ProjectType[], coal: number, wood: number): GameState {
  const start = calmStart("astravia", "astravia-harvest-union");
  const provinceId = start.placedBuildings[0].provinceId;
  return {
    ...start,
    date: { year: 1, month: 1, day: 10 },
    placedBuildings: types.map((type, i) => ({ id: `home-${i}`, provinceId, type })),
    resources: stock(coal, wood),
  };
}

describe("burning fuel", () => {
  it("burns coal first, and no wood while the coal lasts", () => {
    const burned = burnHeatingFuel(stock(10, 50), 4);
    expect(burned.coalBurned).toBe(4);
    expect(burned.woodBurned).toBe(0);
    expect(burned.unheatedShare).toBe(0);
    expect(burned.resources).toMatchObject({ coal: 6, wood: 50 });
  });

  it("takes five wood for each coal's worth", () => {
    expect(WOOD_PER_COAL_HEAT).toBe(5);
    const burned = burnHeatingFuel(stock(0, 50), 4);
    expect(burned.woodBurned).toBe(20);
    expect(burned.unheatedShare).toBe(0);
    expect(burned.resources).toMatchObject({ coal: 0, wood: 30 });
  });

  it("meets what the coal can't with wood", () => {
    const burned = burnHeatingFuel(stock(1, 50), 4);
    expect(burned.coalBurned).toBe(1);
    expect(burned.woodBurned).toBe(15);
    expect(burned.unheatedShare).toBe(0);
    expect(burned.resources).toMatchObject({ coal: 0, wood: 35 });
  });

  it("leaves cold only the share neither fuel could heat", () => {
    const burned = burnHeatingFuel(stock(1, 5), 4); // 1 coal, and 1 coal's worth of wood
    expect(burned.coalBurned).toBe(1);
    expect(burned.woodBurned).toBe(5);
    expect(burned.unheatedShare).toBeCloseTo(0.5);
    expect(burned.resources).toMatchObject({ coal: 0, wood: 0 });
    expect(burnHeatingFuel(stock(0, 0), 4).unheatedShare).toBe(1);
  });

  it("burns nothing when nothing is asked", () => {
    const fuel = stock(3, 3);
    expect(burnHeatingFuel(fuel, 0)).toEqual({ resources: fuel, coalBurned: 0, woodBurned: 0, unheatedShare: 0 });
  });

  it("counts the stock's heat in coal", () => {
    expect(getHeatInStock(stock(2, 10))).toBe(4);
    expect(burnHeatingFuel(stock(2, 10), 4).unheatedShare).toBeCloseTo(0);
  });
});

describe("each kind of home", () => {
  it("has its share of the heat", () => {
    expect(getHeatShare("housing")).toBe(HEAT_SHARE_HOME);
    expect(getHeatShare("tenement")).toBe(HEAT_SHARE_TENEMENT);
    expect(getHeatShare("tower")).toBe(HEAT_SHARE_TOWER);
    expect(HEAT_SHARE_HOME).toBeGreaterThan(HEAT_SHARE_TENEMENT);
    expect(HEAT_SHARE_TENEMENT).toBeGreaterThan(HEAT_SHARE_TOWER);
  });

  it("burns what it is worth in homes, times its share", () => {
    expect(getBuildingHeatDemand("housing")).toBeCloseTo(HEATING_FUEL_PER_HOME);
    expect(getBuildingHeatDemand("tenement")).toBeCloseTo(HEATING_FUEL_PER_HOME * HOMES_PER_TENEMENT * HEAT_SHARE_TENEMENT);
    expect(getBuildingHeatDemand("tower")).toBeCloseTo(HEATING_FUEL_PER_HOME * HOMES_PER_TOWER * HEAT_SHARE_TOWER);
    expect(getBuildingHeatDemand("farm")).toBe(0);
  });

  it("adds up across the country, in winter only", () => {
    const state = withHomes(["housing", "tenement", "tower", "farm"], 0, 0);
    const expected = HEATING_FUEL_PER_HOME * (HEAT_SHARE_HOME + HOMES_PER_TENEMENT * HEAT_SHARE_TENEMENT + HOMES_PER_TOWER * HEAT_SHARE_TOWER);
    expect(getHeatingDemand(state, "winter")).toBeCloseTo(expected);
    expect(getHeatingDemand(state, "summer")).toBe(0);
  });

  it("burns nothing while broken", () => {
    const state = withHomes(["tenement", "tower"], 0, 0);
    const broken: GameState = { ...state, placedBuildings: [state.placedBuildings[0], { ...state.placedBuildings[1], condition: "broken" }] };
    expect(getHeatingDemand(broken, "winter")).toBeCloseTo(getBuildingHeatDemand("tenement"));
  });
});

describe("everything that reads fuel", () => {
  // One home: 0.12 coal a day, so 0.6 wood a day.
  const home = 0.12;

  it("the outlook counts wood at its worth in heat", () => {
    const outlook = getHeatingOutlook(withHomes(["housing"], 1.2, 6));
    expect(outlook.fuel).toBeCloseTo(2.4);
    expect(outlook.daysOfFuel).toBeCloseTo(20);
    expect(outlook.coalDays).toBeCloseTo(10);
    expect(outlook.woodDays).toBeCloseTo(10);
  });

  it("the day burns what the summary said it would", () => {
    const state = withHomes(["housing"], 0, 6);
    const production = getDailyProductionSummary(state);
    expect(production.heatingFuel).toBeCloseTo(home);
    expect(production.unheatedShare).toBe(0);
    const after = simulateDay({ ...state, isPaused: false });
    expect(after.resources.wood).toBeCloseTo(6 + production.resourceProduction.wood);
    const onCoal = getDailyProductionSummary(withHomes(["housing"], 5, 6));
    expect(production.resourceProduction.wood).toBeCloseTo(onCoal.resourceProduction.wood - home * WOOD_PER_COAL_HEAT);
  });

  it("support feels the cold when wood alone falls short", () => {
    const heat = (wood: number) => getPopularityOutlook(withHomes(["housing"], 0, wood)).drivers.find((d) => d.key === "heat")?.value ?? 0;
    expect(heat(home * WOOD_PER_COAL_HEAT)).toBeCloseTo(0);
    expect(heat(home)).toBeLessThan(0); // enough one for one, a fifth of it at the rate
  });

  it("the cold pauses the game once the wood is worth less than a day", () => {
    const warm = withHomes(["housing"], 0, 10);
    const pausesFor = (wood: number) => applyDangerPause(warm, { ...warm, resources: stock(0, wood) }).dangerPauses;
    expect(pausesFor(home * 2).some((key) => key.endsWith(":cold"))).toBe(true); // enough one for one
    expect(pausesFor(home * WOOD_PER_COAL_HEAT + 0.01).some((key) => key.endsWith(":cold"))).toBe(false);
  });

  it("the advisor says how long the stock lasts before winter comes", () => {
    const autumn: GameState = { ...withHomes(["housing"], 1.2, 6), date: { year: 1, month: 11, day: 1 } };
    const production = getDailyProductionSummary(autumn);
    const alert = getAdvisorOutlook(autumn, production, getHeatingOutlook(autumn), getForecasts(autumn, production)).alerts.find((a) => a.kind === "coal");
    expect(alert?.detail).toContain("Your coal and wood last 20 of its 90 days.");
  });

  it("the shortage letter reads the wood at its worth", () => {
    const decision = getDecision("coal-shortage")!;
    // 15 days at one home is 1.8 coal: 9 wood.
    expect(decision.condition?.(withHomes(["housing"], 0, 8.9))).toBe(true);
    expect(decision.condition?.(withHomes(["housing"], 0, 9.1))).toBe(false);
  });
});
