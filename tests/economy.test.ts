// The economy's shape: the land gives little alone, mines and sawmills add to
// it, larger buildings trade money for hands and room, roads carry goods and
// people more than they bring in money, and each party is a different friend.
import { describe, expect, it } from "vitest";
import { buildFoundry, buildMine, buildSawmill, buildSteelworks, buildTower } from "../src/application/actions";
import { getDailyProductionSummary } from "../src/application/getDailyProductionSummary";
import { startNewGame } from "../src/application/startNewGame";
import {
  COAL_PER_MINE,
  ESTATE_COST,
  FACTORIES_PER_FOUNDRY,
  FACTORIES_PER_STEELWORKS,
  FACTORY_COST,
  FARM_COST,
  FARMS_PER_ESTATE,
  FOUNDRY_COST,
  HOMES_PER_TENEMENT,
  HOUSING_COST,
  INCOME_PER_INDUSTRY,
  INDUSTRY_PER_FACTORY,
  JOBS_PER_BUILDING,
  MARKET_SELL_FACTOR,
  MINE_COST,
  ORE_PER_MINE,
  PEOPLE_PER_HOME,
  STEELWORKS_COST,
  TENEMENT_COST,
} from "../src/domain/constants";
import type { GameState } from "../src/domain/country/types";
import { FRIEND_EFFECTS } from "../src/domain/diplomacy/diplomacyRules";
import { getHousingCapacity } from "../src/domain/housing/housingRules";
import { getLabourSituation } from "../src/domain/labour/labourRules";
import { GOOD_SPECS } from "../src/domain/market/marketRules";
import { getNation } from "../src/domain/nations/nationRules";
import { getModifiers } from "../src/domain/policy/policyRules";
import { MAP_GEOMETRY } from "../src/domain/provinces/provinceData";
import { calculateEfficiencyMultiplier, getRoadMarketMultiplier, getRoadMigrationMultiplier, getRoadProductionMultiplier } from "../src/domain/roads/roadsRules";

const game = () => startNewGame("caldenreich", "caldenreich-crown-loyalists");
const onTerrain = (state: GameState, terrain: string) => getNation(state.nationId).provinceIds.find((id) => MAP_GEOMETRY.provinces.find((p) => p.id === id)?.terrain === terrain);
const place = (state: GameState, type: GameState["placedBuildings"][number]["type"], provinceId: string): GameState => ({
  ...state,
  placedBuildings: [...state.placedBuildings, { id: `test-${state.placedBuildings.length}`, type, provinceId }],
});
const rich = (state: GameState): GameState => ({ ...state, stats: { ...state.stats, treasury: 99999 }, resources: { ...state.resources, wood: 500, ore: 500 } });

describe("the land and its works", () => {
  it("adds goods with a staffed mine, and only lets it go in the hills", () => {
    const state = game();
    const hills = onTerrain(state, "hills")!;
    const forest = onTerrain(state, "forest");
    const before = getDailyProductionSummary(state).resourceProduction;
    const after = getDailyProductionSummary(place(state, "mine", hills)).resourceProduction;
    expect(after.ore).toBeGreaterThan(before.ore);
    expect(buildMine.canBuild(rich(state), hills)).toBe(true);
    expect(buildSawmill.canBuild(rich(state), hills)).toBe(false);
    if (forest) {
      expect(buildMine.canBuild(rich(state), forest)).toBe(false);
      expect(buildSawmill.canBuild(rich(state), forest)).toBe(true);
    }
  });

  it("doesn't let a mine out-earn a factory just by selling what it digs", () => {
    const dayOfSales = (ORE_PER_MINE * GOOD_SPECS.ore.basePrice + COAL_PER_MINE * GOOD_SPECS.coal.basePrice) * MARKET_SELL_FACTOR;
    const factoryDay = INDUSTRY_PER_FACTORY * INCOME_PER_INDUSTRY;
    expect(MINE_COST / dayOfSales).toBeGreaterThan(FACTORY_COST / factoryDay);
  });

  it("makes raw grain and fish worth little next to mined goods", () => {
    expect(GOOD_SPECS.grain.basePrice).toBeLessThan(GOOD_SPECS.wood.basePrice / 2);
    expect(GOOD_SPECS.fish.basePrice).toBeLessThan(GOOD_SPECS.ore.basePrice / 2);
  });
});

describe("the larger buildings", () => {
  it("cost more for what they make, and take far fewer hands", () => {
    expect(FOUNDRY_COST / FACTORIES_PER_FOUNDRY).toBeGreaterThan(FACTORY_COST);
    expect(STEELWORKS_COST / FACTORIES_PER_STEELWORKS).toBeGreaterThan(FACTORY_COST);
    expect(ESTATE_COST / FARMS_PER_ESTATE).toBeGreaterThan(FARM_COST);
    expect(TENEMENT_COST / HOMES_PER_TENEMENT).toBeGreaterThan(HOUSING_COST);
    expect(JOBS_PER_BUILDING.foundry / FACTORIES_PER_FOUNDRY).toBeLessThan(JOBS_PER_BUILDING.factory * 0.6);
    expect(JOBS_PER_BUILDING.steelworks / FACTORIES_PER_STEELWORKS).toBeLessThan(JOBS_PER_BUILDING.foundry / FACTORIES_PER_FOUNDRY);
    expect(JOBS_PER_BUILDING.estate / FARMS_PER_ESTATE).toBeLessThan(JOBS_PER_BUILDING.farm * 0.7);
  });

  it("do the work: more shelter, food and industry, once staffed", () => {
    const state = game();
    const id = getNation(state.nationId).capitalProvinceId;
    expect(getHousingCapacity(place(state, "tenement", id))).toBe(getHousingCapacity(state) + HOMES_PER_TENEMENT * PEOPLE_PER_HOME);
    const crowded = { ...state, provinces: { ...state.provinces, [id]: { ...state.provinces[id], population: 60000 } } };
    const staffed = getLabourSituation(crowded).staffed;
    expect(getLabourSituation(place(crowded, "estate", id)).staffed.farms).toBeCloseTo(staffed.farms + FARMS_PER_ESTATE);
    expect(getLabourSituation(place(crowded, "foundry", id)).staffed.factories).toBeCloseTo(staffed.factories + FACTORIES_PER_FOUNDRY);
  });

  it("opens the first step at once, and keeps the second behind research", () => {
    const state = rich(game());
    const id = getNation(state.nationId).capitalProvinceId;
    expect(buildFoundry.canBuild(state, id)).toBe(true);
    expect(buildSteelworks.canBuild(state, id)).toBe(false);
    expect(buildTower.canBuild(state, id)).toBe(false);
    const researched = { ...state, enactedResearchIds: [...state.enactedResearchIds, "industry-automated-foundries", "housing-back-to-backs"] };
    expect(buildSteelworks.canBuild(researched, id)).toBe(true);
    expect(buildTower.canBuild(researched, id)).toBe(true);
  });
});

describe("roads", () => {
  it("bring in little money, and carry goods, people and trade", () => {
    expect(calculateEfficiencyMultiplier(10)).toBeCloseTo(1.2);
    expect(getRoadProductionMultiplier(10)).toBeCloseTo(1.4);
    expect(getRoadMigrationMultiplier(10)).toBeCloseTo(1.8);
    expect(getRoadMarketMultiplier(10)).toBeCloseTo(0.9);
    expect(calculateEfficiencyMultiplier(20) - calculateEfficiencyMultiplier(10)).toBeLessThan(calculateEfficiencyMultiplier(10) - calculateEfficiencyMultiplier(0));
    const state = game();
    expect(getModifiers({ ...state, roadCount: 10 }).buyPriceMultiplier).toBeCloseTo(getModifiers(state).buyPriceMultiplier * 0.9);
  });
});

describe("the neighbours", () => {
  it("gives every kind of party something different", () => {
    const seen = new Set(Object.values(FRIEND_EFFECTS).map((effects) => Object.keys(effects).join()));
    expect(seen.size).toBe(Object.keys(FRIEND_EFFECTS).length);
  });

  it("applies what the party you put in power brings, and not its rival's", () => {
    const state = game();
    const [nationId, gov] = Object.entries(state.foreignPolitics)[0];
    const [left, right] = Object.keys(gov.support);
    const ruledBy = (ruler: string, backed: string | null): GameState => ({ ...state, foreignPolitics: { ...state.foreignPolitics, [nationId]: { ...gov, rulingPartyId: ruler, backedPartyId: backed } } });
    const plain = getModifiers(ruledBy(left, null));
    expect(getModifiers(ruledBy(left, right))).toEqual(plain);
    expect(getModifiers(ruledBy(left, left))).not.toEqual(plain);
  });
});
