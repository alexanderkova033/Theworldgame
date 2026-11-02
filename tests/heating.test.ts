// Winter heating: need is reckoned in coal, coal burns first, and wood meets
// the rest at WOOD_PER_COAL_HEAT to one. Larger buildings hold their heat.
import { describe, expect, it } from "vitest";
import { buildTenement, buildTower } from "../src/application/actions/buildLarger";
import { getAdvisorOutlook } from "../src/application/getAdvisorOutlook";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { getForecasts } from "../src/application/getForecasts";
import { getHeatingOutlook, isWinterFuelShort } from "../src/application/getHeatingOutlook";
import { startNewGame } from "../src/application/startNewGame";
import { allChaptersOpen } from "../src/domain/chapters/chapterData";
import { getPopularityOutlook } from "../src/application/getPopularityOutlook";
import { applyDangerPause } from "../src/application/playDay";
import { simulateDay } from "../src/application/simulateDay";
import { HEAT_SHARE_HOME, HEAT_SHARE_TENEMENT, HEAT_SHARE_TOWER, HEATING_FUEL_PER_HOME, HOMES_PER_TENEMENT, HOMES_PER_TOWER, STARTING_COAL, WOOD_PER_COAL_HEAT } from "../src/domain/constants";
import type { ProjectType } from "../src/domain/construction/types";
import type { GameState } from "../src/domain/country/types";
import { getDecision } from "../src/domain/decisions/decisionRules";
import { burnHeatingFuel, getBuildingHeatDemand, getHeatingDemand, getHeatInStock, getHeatShare } from "../src/domain/housing/housingRules";
import { emptyResourceBundle } from "../src/domain/resources/resourceRules";
import { getSeason } from "../src/domain/country/calendar";
import { getNation } from "../src/domain/nations/nationRules";
import { getModifiers } from "../src/domain/policy/policyRules";
import { calmStart } from "./support/calmStart";
import { playCarefully } from "./support/carefulPlayer";
import { seedRandom } from "./support/seededRandom";

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

describe("starting coal", () => {
  it("is 200 in Astravia, 80 in Caldenreich and 140 in Veldoria", () => {
    expect(STARTING_COAL).toBe(80);
    expect(startNewGame("astravia", "astravia-harvest-union").resources.coal).toBe(200);
    expect(startNewGame("caldenreich", "caldenreich-crown-loyalists").resources.coal).toBe(80);
    expect(startNewGame("veldoria", "veldoria-ironworkers-guild").resources.coal).toBe(140);
  });
});

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

describe("a game with tenements and apartment blocks", () => {
  const LAND = getNation("astravia").provinceIds;
  const ordinaryHomes = (s: GameState): GameState => ({
    ...s,
    placedBuildings: s.placedBuildings.flatMap((b) =>
      b.type === "tenement" || b.type === "tower"
        ? Array.from({ length: b.type === "tenement" ? HOMES_PER_TENEMENT : HOMES_PER_TOWER }, (_, i) => ({ ...b, id: `${b.id}-home-${i}`, type: "housing" as const }))
        : [b],
    ),
  });
  const heatIn = (s: GameState) => getHeatInStock(s.resources);

  it("burns less for the same homes, in the stock itself, winter after winter", () => {
    seedRandom(20261015);
    const winters: GameState[] = [];
    let unlocked = false;
    const end = playCarefully("astravia", "astravia-harvest-union", {
      days: 3 * 365,
      onDay: (s) => {
        if (getSeason(s.date) === "winter") winters.push(s);
      },
      habit: (state) => {
        // The research that opens apartment blocks, and the goods they take: this is about their fuel.
        let s: GameState = { ...state, resources: { ...state.resources, wood: Math.max(state.resources.wood, 200), ore: Math.max(state.resources.ore, 200), coal: Math.max(state.resources.coal, 100) } };
        if (!unlocked) {
          unlocked = true;
          s = { ...s, enactedResearchIds: [...s.enactedResearchIds, "housing-back-to-backs"] };
        }
        if (s.stats.treasury < 5000 || s.projects.some((p) => p.type === "tenement" || p.type === "tower")) return s;
        const fewest = (type: ProjectType) => s.placedBuildings.filter((b) => b.type === type).length;
        const action = fewest("tower") < fewest("tenement") ? buildTower : buildTenement;
        for (const id of LAND) if (action.canBuild(s, id)) return action(s, id);
        return s;
      },
    });
    expect(end.isGameOver && end.outcome !== "victory").toBe(false);
    const count = (s: GameState, type: ProjectType) => s.placedBuildings.filter((b) => b.type === type && b.condition === undefined).length;
    const last = winters[winters.length - 1];
    expect(count(last, "tenement")).toBeGreaterThan(0);
    expect(count(last, "tower")).toBeGreaterThan(0);

    // Every winter day with them standing: what the country was asked to burn.
    const report: string[] = [];
    for (const year of new Set(winters.map((s) => s.date.year))) {
      const days = winters.filter((s) => s.date.year === year && (count(s, "tenement") > 0 || count(s, "tower") > 0));
      if (days.length === 0) continue;
      const burned = days.reduce((sum, s) => sum + getHeatingDemand(s, "winter"), 0);
      const asHomes = days.reduce((sum, s) => sum + getHeatingDemand(ordinaryHomes(s), "winter"), 0);
      expect(burned, `year ${year}`).toBeLessThan(asHomes);
      report.push(`year ${year}: ${Math.round(burned)} coal, against ${Math.round(asHomes)} in ordinary homes (${count(days[days.length - 1], "tenement")} tenements, ${count(days[days.length - 1], "tower")} blocks)`);
    }
    console.log(`Winter fuel in a game of tenements and blocks:\n${report.join("\n")}`);

    // And that is what leaves the stock: one more day from the same morning, each way.
    const morning: GameState = { ...last, resources: { ...last.resources, coal: 500, wood: 0 }, isPaused: false };
    const tenements = count(morning, "tenement");
    const towers = count(morning, "tower");
    const saved = tenements * HOMES_PER_TENEMENT * (1 - HEAT_SHARE_TENEMENT) + towers * HOMES_PER_TOWER * (1 - HEAT_SHARE_TOWER);
    seedRandom(5);
    const real = simulateDay(morning);
    seedRandom(5);
    const homes = simulateDay(ordinaryHomes(morning));
    const multiplier = getModifiers(morning).heatingMultiplier;
    expect(heatIn(real) - heatIn(homes)).toBeCloseTo(saved * HEATING_FUEL_PER_HOME * multiplier, 3);
  }, 60000);
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

  it("the outlook counts the real days to winter", () => {
    const on = (month: number, day: number) => getHeatingOutlook({ ...withHomes(["housing"], 0, 0), date: { year: 1, month, day } }).daysUntilWinter;
    expect(on(9, 1)).toBe(90);
    expect(on(11, 1)).toBe(30);
    expect(on(11, 30)).toBe(1);
  });

  it("warns from 1 September, and only of what the land won't make up", () => {
    const short = (month: number, day: number, coal: number, coalPerDay = 0) =>
      isWinterFuelShort(getHeatingOutlook({ ...withHomes(["housing"], coal, 0), date: { year: 1, month, day } }), coalPerDay);
    expect(short(8, 30, 1)).toBe(false);
    expect(short(9, 1, 1)).toBe(true);
    expect(short(9, 1, 10.8)).toBe(false); // 90 days at 0.12
    expect(short(9, 1, 1, 0.1)).toBe(false); // digs 18 coal by the end of winter
    expect(short(1, 10, 1)).toBe(false); // the winter alert speaks in winter
  });

  it("says coal costs more only once the market is open", () => {
    const autumn: GameState = { ...withHomes(["housing"], 1, 0), date: { year: 1, month: 9, day: 1 } };
    const detail = (s: GameState) => {
      const production = getDailyProductionSummary(s);
      return getAdvisorOutlook(s, production, getHeatingOutlook(s), getForecasts(s, production)).alerts.find((a) => a.kind === "coal")?.detail;
    };
    expect(detail(autumn)).not.toMatch(/costs more/);
    expect(detail({ ...autumn, chapters: allChaptersOpen() })).toMatch(/Coal costs more once it starts\.$/);
  });

  it("the shortage letter reads the wood at its worth", () => {
    const decision = getDecision("coal-shortage")!;
    // 15 days at one home is 1.8 coal: 9 wood.
    expect(decision.condition?.(withHomes(["housing"], 0, 8.9))).toBe(true);
    expect(decision.condition?.(withHomes(["housing"], 0, 9.1))).toBe(false);
  });
});
